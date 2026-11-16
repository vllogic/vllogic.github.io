/*
 * USB Sniffer 2 网页 OTA 控制器。
 * 协议 / 包校验 / WebUSB 传输在 iap.js，本文件只负责页面状态与交互。
 */

import {
  IAP,
  formatBytes,
  formatFirmware,
  inspectPackage,
  openIapDevice,
  runIapUpdate,
} from './iap.js';

const usb = 'usb' in navigator ? navigator.usb : null;

const BUILTIN_IDS = ['stable', 'free', 'swd'];
const BUILTIN_KINDS = { stable: 'standard', free: 'free', swd: 'swd' };

// 由 release/firmware.json 提供（update_iap.py 生成）。
let BUILTIN = {};
let manifestLoaded = false;
const CURRENT_KIND_BY_CRC = {};

const PROBLEM_TEXT = {
  size: '文件大小异常（必须为 256 字节的整数倍）。',
  blocks: '固件包内容不完整。',
  decrypt: '无法解密：不是有效的 .iap 固件包。',
  'magic-logic20': '这是 Logic20 的固件包，不能刷到 USB Sniffer 2。',
  'magic-unknown': '固件包无效：不是 USB Sniffer 2 固件。',
  'hw-mask': '固件包与这台设备的硬件版本不匹配。',
  'info-crc': '固件信息 CRC 校验失败。',
  layout: '固件包长度与 info 记录不一致。',
  capacity: '固件包超出设备容量。',
  'data-type': '固件包的数据类型字段无效。',
  'code-crc': '代码 CRC 校验失败，固件包可能已损坏。',
  'data-crc': 'FPGA 数据 CRC 校验失败，固件包可能已损坏。',
  'manifest-mismatch': '内置文件与页面记录的 SHA-256 / 大小不一致。',
};

const WARN_STEPS = [
  '警告 1/3：即将刷入 SWD 使能固件。一旦通过 SWD 擦除固件，将永久失去分析仪能力。',
  '警告 2/3：即将刷入 SWD 使能固件。刷入后，DP、DN 脚将在启动前约 60 秒恢复 SWD 功能。',
  '警告 3/3：刷入 SWD 使能固件，只能多等一段时间，还是可以 OTA 正常固件恢复功能的，但一旦 SWD 擦除，本硬件会不可逆的退化为开发板，且小封装 CH32H417 有坑，错误固件会导致芯片变砖。',
];

const WARN_HINTS = [
  '请确认你确实需要通过 SWD 擦除芯片；否则请取消并选择标准固件。按钮 3 秒后才可用。',
  '设备重新枚举前，DP / DN 会在约 60 秒内作为 SWD 使用。按钮 3 秒后才可用。',
  '这是最后一次确认。点击“确认并刷入”后立即开始写入，中途请勿关闭页面。',
];

const $ = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing #${id}`);
  return element;
};

const messageOf = (error) => (error instanceof Error ? error.message : String(error));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let device = null;       // { usb, transport, product, serial, info }
let pkg = null;          // { name, source, builtin, kind, bytes, check }
let checkingId = null;
let packageLoad = 0;
let phase = 'idle';      // idle | connecting | connected | checking | ready | writing | resetting | verifying | done | failed
let busy = false;
let result = null;       // { ok, title, body, action }
let deviceError = '';
let packageError = '';
let progress = { done: 0, total: 0 };
const logs = [];

let warnIndex = 0;
let warnTimer = null;
let warnDeadline = 0;

/* ------------------------------ 基础 UI ------------------------------ */

function log(message) {
  const time = new Date().toLocaleTimeString([], { hour12: false });
  logs.push(`[${time}] ${message}`);
  if (logs.length > 400) logs.splice(0, logs.length - 400);
  const box = $('log-box');
  box.hidden = false;
  $('log').textContent = logs.join('\n');
  $('log').scrollTop = $('log').scrollHeight;
}

function showBanner(title, body) {
  $('banner').hidden = false;
  $('banner-title').textContent = title;
  $('banner-body').textContent = body;
}

function renderBanner() {
  $('banner').hidden = true;
  if (!window.isSecureContext) {
    showBanner('请通过 HTTPS 打开此页面', '浏览器只允许安全页面（https:// 或 http://localhost）访问 USB。');
  } else if (!usb) {
    showBanner('此浏览器无法访问 USB 设备', '固件升级使用 WebUSB，仅 Chrome / Edge 等 Chromium 浏览器支持。请改用桌面版 Chromium 浏览器。');
  }
}

function idlePhase() {
  return pkg ? 'ready' : (device ? 'connected' : 'idle');
}

function dataTypeName(type) {
  if (type === IAP.dataRaw) return 'H7P20 raw';
  if (type === IAP.dataLr4) return 'H7P20 LR4 8K';
  return '无';
}

function isSnifferInfo(info) {
  return info && info.magic === IAP.magic && info.infoCrcOk;
}

// 当前三个包的 code CRC 来自 firmware.json；旧构建的签名仍保留识别，
// 方便页面提示现场旧设备，也用于本地包的归类。
const OLD_KIND_BY_HASH = {
  '813abeec': 'free',
  'e6dd021d': 'swd',
};
const OLD_KIND_BY_CRC = {
  0xefeb922b: 'standard',
  0x519e5509: 'free',
  0x23022faf: 'swd',
  0x422bcc3d: 'swd',
};

function kindOfInfo(info) {
  if (!info) return null;
  const hash = (info.codeHash || '').toLowerCase();
  if (OLD_KIND_BY_HASH[hash]) return OLD_KIND_BY_HASH[hash];
  if (CURRENT_KIND_BY_CRC[info.codeCrc32]) return CURRENT_KIND_BY_CRC[info.codeCrc32];
  if (OLD_KIND_BY_CRC[info.codeCrc32]) return OLD_KIND_BY_CRC[info.codeCrc32];
  if (info.dataLength > 0) return 'standard';
  return null;
}

function kindLabel(kind) {
  if (kind === 'swd') return 'SWD 使能固件';
  if (kind === 'free') return 'FPGA 自由开发固件';
  if (kind === 'standard') return '标准固件';
  if (kind === 'codeonly') return '仅 CH32 代码固件';
  return '自定义固件';
}

/* ----------------------------- 设备渲染 ------------------------------ */

function renderDevice() {
  const connected = device !== null;
  $('device-empty').hidden = connected;
  $('device-info').hidden = !connected;
  $('device-pill').hidden = !connected;
  $('connect').toggleAttribute('disabled', !usb || busy || connected);
  $('device-error').hidden = !deviceError;
  $('device-error').textContent = deviceError;

  if (!device) return;
  const info = device.info;
  $('device-name').textContent = device.product;
  $('device-serial').textContent = device.serial ? `S/N ${device.serial}` : '';

  const fields = ['device-version', 'device-date', 'device-code', 'device-data', 'device-code-hash', 'device-data-hash', 'device-hw'];
  const notes = [];

  if (info && info.magic === IAP.logic20Magic) {
    for (const id of fields) $(id).textContent = '—';
    notes.push('这是 Logic20，不是 USB Sniffer 2。请使用 Logic20 对应的升级页面。');
  } else if (!isSnifferInfo(info)) {
    for (const id of fields) $(id).textContent = '—';
    notes.push('未读取到有效的固件信息，仍可重新刷入固件。');
  } else {
    $('device-version').textContent = formatFirmware(info.firmwareVersion);
    $('device-date').textContent = info.buildDate || '—';
    $('device-code').textContent = `${formatBytes(info.codeLength)} (${info.codeLength.toLocaleString()} B)`;
    $('device-data').textContent = info.dataLength
      ? `${formatBytes(info.dataLength)} (${info.dataLength.toLocaleString()} B) · ${dataTypeName(info.dataType)}`
      : '无（不载入 FPGA）';
    $('device-code-hash').textContent = info.codeHash || '未记录';
    $('device-data-hash').textContent = info.dataLength ? (info.dataHash || '未记录') : '不适用';
    $('device-hw').textContent = `0x${info.hardwareVersionMask.toString(16).padStart(8, '0')}`;

    const kind = kindOfInfo(info);
    if (kind === 'swd') {
      notes.push('当前运行 SWD 使能固件：上电后、正常启动前约 60 秒内 DP / DN 为 SWD。');
    } else if (kind === 'free') {
      notes.push('当前运行 FPGA 自由开发固件：FPGA 未加载，相关 IO 为输入。');
    } else if (info.dataLength === 0) {
      notes.push('当前固件不含 FPGA 数据。');
    }
  }

  $('device-note').hidden = notes.length === 0;
  $('device-note').textContent = notes.join(' ');
}

/* ----------------------------- 固件渲染 ------------------------------ */

function fillText(id, value) {
  $(id).textContent = value;
}

function renderPackage() {
  for (const element of $('fw-grid').querySelectorAll('[data-fw]')) {
    const key = element.dataset.fw;
    element.classList.toggle('selected', pkg?.builtin === key || checkingId === key);
    element.disabled = busy || !BUILTIN[key];
  }

  $('drop').hidden = pkg !== null || phase === 'checking';
  $('package-status').hidden = phase !== 'checking';
  $('package-status').textContent = phase === 'checking' ? '正在解密并校验固件包…' : '';
  $('package-error').hidden = !packageError;
  $('package-error').textContent = packageError;
  $('package-box').hidden = pkg === null;
  if (!pkg) return;

  const info = pkg.check.info;
  const valid = isSnifferInfo(info);
  fillText('file-name', pkg.name);
  $('file-source').hidden = false;
  $('file-source').className = `pill${pkg.kind === 'swd' ? ' bad' : ''}`;
  $('file-source').textContent = pkg.source === 'local'
    ? '本地文件'
    : `内置 · ${kindLabel(pkg.kind)}`;
  fillText('file-version', valid ? formatFirmware(info.firmwareVersion) : '—');
  fillText('file-date', valid ? (info.buildDate || '—') : '—');
  fillText('file-size', `${formatBytes(pkg.bytes.length)} (${pkg.bytes.length.toLocaleString()} B)`);
  fillText('file-code', valid
    ? `${formatBytes(info.codeLength)} (${info.codeLength.toLocaleString()} B)`
    : '—');
  fillText('file-data', valid
    ? (info.dataLength
      ? `${formatBytes(info.dataLength)} (${info.dataLength.toLocaleString()} B) · ${dataTypeName(info.dataType)}`
      : '无（不载入 FPGA）')
    : '—');
  fillText('file-code-hash', valid ? (info.codeHash || '未记录') : '—');
  fillText('file-data-hash', valid
    ? (info.dataLength ? (info.dataHash || '未记录') : '不适用')
    : '—');
  fillText('file-sha', pkg.check.sha256);

  const box = $('precheck');
  box.className = 'precheck';
  box.replaceChildren();
  box.hidden = false;
  if (pkg.check.ok) {
    box.classList.add('ok');
    box.textContent = '校验通过：USB Sniffer 2 固件包，CRC 与 SHA-256 已确认。';
  } else {
    box.classList.add('bad');
    const title = document.createElement('p');
    title.textContent = '固件包未通过校验，不会发送任何数据。';
    const list = document.createElement('ul');
    for (const problem of [...new Set(pkg.check.problems)]) {
      const item = document.createElement('li');
      item.textContent = PROBLEM_TEXT[problem] || problem;
      list.append(item);
    }
    box.append(title, list);
  }

  const note = $('package-note');
  note.className = 'notice';
  if (!pkg.check.ok) {
    note.hidden = true;
  } else if (pkg.kind === 'swd') {
    note.hidden = false;
    note.classList.add('bad');
    note.textContent = '危险：刷入后 DP / DN 在上电后、正常启动前约 60 秒内为 SWD。一旦通过 SWD 擦除固件，分析仪功能将永久失效，硬件不可逆退化为开发板。刷入前需要连续确认三次警告。';
  } else if (pkg.kind === 'free') {
    note.hidden = false;
    note.classList.add('info');
    note.textContent = '刷入后 CH32H417 不载入或复位 FPGA，FPGA 相关 IO 释放为输入；PB0 保留 25 MHz 时钟输出、PE14 保持高电平。可用外部 JTAG 自由开发，随时可以 OTA 刷回标准固件恢复功能。';
  } else if (pkg.kind === 'codeonly') {
    note.hidden = false;
    note.classList.add('warn');
    note.textContent = '此包只包含 CH32H417 代码、不含 FPGA 数据。若它是 SWD 使能固件，请改用内置 SWD 条目，以免绕过三次警告。';
  } else {
    note.hidden = true;
  }

  $('file-change').toggleAttribute('disabled', busy);
}

/* ----------------------------- 进度/结果 ----------------------------- */

function setPhaseText(text) {
  $('phase-text').textContent = text;
}

function paintProgress() {
  const visible = progress.total > 0
    && ['writing', 'resetting', 'verifying', 'done', 'failed'].includes(phase);
  $('progress').hidden = !visible;
  if (!visible) return;

  const total = progress.total || 1;
  let percent;
  if (phase === 'writing') percent = 1 + Math.min(1, progress.done / total) * 97;
  else if (phase === 'done') percent = 100;
  else percent = 99;

  $('bar-fill').style.width = `${percent.toFixed(1)}%`;
  $('progress').setAttribute('aria-valuenow', String(Math.round(percent)));
}

function renderResult() {
  const box = $('result');
  box.hidden = result === null;
  if (!result) return;
  box.className = `result ${result.ok ? 'ok' : 'fail'}`;
  $('result-title').textContent = result.title;
  $('result-body').textContent = result.body;
  const button = $('result-btn');
  button.hidden = result.action === 'none';
  if (result.action !== 'none') {
    button.textContent = result.action === 'retry' ? '重试' : '重新连接';
  }
}

function sameImage() {
  if (!isSnifferInfo(device?.info) || !pkg?.check.ok || !pkg.check.info) return false;
  const a = device.info;
  const b = pkg.check.info;
  return a.magic === IAP.magic
    && a.firmwareVersion === b.firmwareVersion
    && a.codeLength === b.codeLength
    && a.dataLength === b.dataLength
    && a.dataType === b.dataType
    && a.codeCrc32 === b.codeCrc32
    && a.dataCrc32 === b.dataCrc32;
}

function renderUpdate() {
  let ready = '';
  let canStart = false;

  if (!device) {
    ready = '请先连接 USB Sniffer 2。';
  } else if (phase === 'checking') {
    ready = '正在校验固件包…';
  } else if (!pkg) {
    ready = manifestLoaded
      ? '请选择固件。'
      : '内置固件清单不可用，请运行 update_iap.py，或选择本地 .iap。';
  } else if (!pkg.check.ok) {
    ready = '固件包未通过校验，不会发送任何数据。';
  } else if (pkg.kind === 'swd') {
    ready = '准备刷入 SWD 使能固件。点击开始后会连续出现三次警告，每次需要等待 3 秒。';
    canStart = true;
  } else if (sameImage()) {
    ready = '设备当前运行的固件与所选包一致（CRC 相同），可以重新刷入。';
    canStart = true;
  } else {
    ready = `准备把「${pkg.source === 'local' ? pkg.name : kindLabel(pkg.kind)}」刷入 ${device.product}。`;
    canStart = true;
  }

  $('ready').textContent = ready;
  $('ready').hidden = busy || result !== null;

  const showStart = !busy && (result === null || result.ok);
  const start = $('start');
  start.hidden = !showStart;
  start.toggleAttribute('disabled', !(showStart && canStart));
  start.classList.toggle('danger', pkg?.kind === 'swd');
  start.textContent = pkg?.kind === 'swd'
    ? '开始刷入（三次确认）'
    : sameImage() ? '重新刷入' : '开始升级';

  paintProgress();
  renderResult();
}

function render() {
  renderBanner();
  renderDevice();
  renderPackage();
  renderUpdate();
  $('log-box').hidden = logs.length === 0;
}

/* ----------------------------- 设备连接 ------------------------------ */

async function adoptDevice(candidate) {
  if (busy) return;
  result = null;
  phase = 'connecting';
  deviceError = '';
  packageError = '';
  render();

  if (/logic20/i.test(candidate.productName || '')) {
    deviceError = '这是 Logic20，不是 USB Sniffer 2。请使用 Logic20 对应的升级页面。';
    phase = idlePhase();
    render();
    return;
  }

  if (device && device.usb !== candidate) {
    const previous = device;
    device = null;
    await previous.transport.close();
  }

  try {
    const transport = await openIapDevice(candidate);
    let info = null;
    try {
      info = await transport.info();
    } catch (e) {
      log(`读取设备信息失败：${messageOf(e)}`);
    }

    if (info?.magic === IAP.logic20Magic) {
      await transport.close();
      deviceError = '这是 Logic20，不是 USB Sniffer 2。请使用 Logic20 对应的升级页面。';
      phase = idlePhase();
      render();
      return;
    }

    device = {
      usb: candidate,
      transport,
      product: candidate.productName?.trim() || IAP.product,
      serial: candidate.serialNumber || '',
      info,
    };
    phase = idlePhase();
    log(`已连接 ${device.product}${device.serial ? `，${device.serial}` : ''}`);
    if (isSnifferInfo(info)) {
      log(`InfoGet：固件 ${formatFirmware(info.firmwareVersion)}，代码 ${info.codeLength} B，FPGA ${info.dataLength} B`);
    } else {
      log('InfoGet：没有有效的固件信息（仍可升级）');
    }
  } catch (e) {
    deviceError = messageOf(e);
    phase = idlePhase();
    log(deviceError);
  }
  render();
}

async function connectDevice() {
  if (!usb || busy) return;
  try {
    const chosen = await usb.requestDevice({ filters: [{ vendorId: IAP.vid, productId: IAP.pid }] });
    await adoptDevice(chosen);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return;
    deviceError = `选择设备失败：${messageOf(e)}`;
    render();
  }
}

async function disconnectDevice() {
  if (busy) return;
  const current = device;
  device = null;
  result = null;
  deviceError = '';
  phase = idlePhase();
  if (current) await current.transport.close();
  render();
}

async function readAgain() {
  if (!device || busy) return;
  try {
    device.info = await device.transport.info();
    deviceError = '';
    log(isSnifferInfo(device.info)
      ? `InfoGet：固件 ${formatFirmware(device.info.firmwareVersion)}`
      : 'InfoGet：没有有效的固件信息');
  } catch (e) {
    deviceError = messageOf(e);
    log(deviceError);
  }
  render();
}

/**
 * 复位后等待设备重新枚举。SWD 使能固件会在约 60 秒后才回到 USB，
 * 因此调用方给它的超时时间要长得多。
 */
async function rediscover(serial, timeoutMs, onTick) {
  const deadline = Date.now() + timeoutMs;
  const started = Date.now();
  let lastTick = -1;

  while (Date.now() < deadline) {
    let devices = [];
    try { devices = await usb.getDevices(); } catch { devices = []; }

    for (const candidate of devices) {
      if (candidate.vendorId !== IAP.vid || candidate.productId !== IAP.pid) continue;
      if (serial && candidate.serialNumber && candidate.serialNumber !== serial) continue;
      let transport = null;
      try {
        transport = await openIapDevice(candidate);
        const info = await transport.info();
        if (info?.magic === IAP.magic) return transport;
      } catch {
        /* 还在枚举中 */
      }
      try { await transport?.close(); } catch { /* 已拔出 */ }
    }

    const tick = Math.floor((Date.now() - started) / 1000);
    if (tick !== lastTick) {
      lastTick = tick;
      onTick?.(tick);
      if (tick > 0 && tick % 10 === 0) log(`等待设备重新枚举… ${tick} 秒`);
    }
    await sleep(400);
  }
  return null;
}

/* ----------------------------- 固件载入 ------------------------------ */

function classify(check, name, builtinId) {
  if (builtinId) return BUILTIN[builtinId].kind;
  if (/swd/i.test(name)) return 'swd';
  if (/free[_-]?fpga/i.test(name)) return 'free';
  const byInfo = kindOfInfo(check.info);
  if (byInfo === 'swd' || byInfo === 'free' || byInfo === 'standard') return byInfo;
  return 'codeonly';
}

function validManifest(manifest) {
  if (!manifest || manifest.schema !== 1 || manifest.product !== 'USB Sniffer 2') return false;
  const images = manifest.images;
  if (!images || typeof images !== 'object') return false;
  const filePattern = /^[A-Za-z0-9._-]+\.iap$/;
  const crcs = new Set();
  for (const id of BUILTIN_IDS) {
    const image = images[id];
    if (!image || image.kind !== BUILTIN_KINDS[id]) return false;
    if (typeof image.file !== 'string' || !filePattern.test(image.file)) return false;
    if (!Number.isFinite(image.size) || image.size <= 0) return false;
    if (typeof image.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(image.sha256)) return false;
    if (!Number.isInteger(image.codeCrc32) || image.codeCrc32 < 0 || image.codeCrc32 > 0xffffffff) return false;
    if (typeof image.version !== 'string' || typeof image.date !== 'string') return false;
    if (crcs.has(image.codeCrc32)) return false;
    crcs.add(image.codeCrc32);
  }
  return true;
}

function applyManifest(manifest) {
  BUILTIN = manifest.images;
  for (const key of Object.keys(CURRENT_KIND_BY_CRC)) delete CURRENT_KIND_BY_CRC[key];
  for (const id of BUILTIN_IDS) {
    const image = BUILTIN[id];
    CURRENT_KIND_BY_CRC[image.codeCrc32] = image.kind;
    const meta = document.querySelector(`[data-meta="${id}"]`);
    if (meta) meta.textContent = `${image.version} · ${image.date} · ${formatBytes(image.size)}`;
  }
}

async function loadManifest() {
  try {
    const response = await fetch(new URL('firmware.json', location.href), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    if (!validManifest(manifest)) throw new Error('清单格式或固件类型不正确');
    applyManifest(manifest);
    manifestLoaded = true;
    packageError = '';
    log(`内置固件清单已载入：${BUILTIN_IDS.map((id) => BUILTIN[id].file).join('，')}`);
    render();
    if (!pkg && phase !== 'checking' && BUILTIN.stable) void selectBuiltin('stable');
  } catch (e) {
    manifestLoaded = false;
    BUILTIN = {};
    for (const key of Object.keys(CURRENT_KIND_BY_CRC)) delete CURRENT_KIND_BY_CRC[key];
    packageError = `内置固件清单不可用：${messageOf(e)}。请运行 update_iap.py 生成，或选择本地 .iap。`;
    log(packageError);
    render();
  }
}

async function selectBuiltin(id) {
  if (busy) return;
  const builtin = BUILTIN[id];
  if (!builtin) {
    packageError = '内置固件清单不可用，请先运行 update_iap.py，或选择本地 .iap。';
    render();
    return;
  }

  const seq = ++packageLoad;
  checkingId = id;
  pkg = null;
  packageError = '';
  result = null;
  phase = 'checking';
  render();

  try {
    const response = await fetch(new URL(`firmware/${builtin.file}`, location.href), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (seq !== packageLoad) return;

    log(`读取内置固件 ${builtin.file}：${bytes.length} B`);
    const check = await inspectPackage(bytes, { sha256: builtin.sha256, size: builtin.size });
    if (seq !== packageLoad) return;

    pkg = {
      name: builtin.file,
      source: 'bundled',
      builtin: id,
      kind: classify(check, builtin.file, id),
      bytes,
      check,
    };
    phase = 'ready';
    log(`固件包 SHA-256：${check.sha256}`);
    for (const problem of check.problems) log(`固件包问题：${problem}`);
  } catch (e) {
    if (seq !== packageLoad) return;
    pkg = null;
    packageError = `下载或校验内置固件失败：${messageOf(e)}`;
    phase = idlePhase();
    log(packageError);
  } finally {
    if (seq === packageLoad) {
      checkingId = null;
      if (phase === 'checking') phase = idlePhase();
      render();
    }
  }
}

async function loadLocalFile(file) {
  if (busy) return;
  if (file.size > 4 * 1024 * 1024) {
    packageError = '文件过大：USB Sniffer 2 的 .iap 包不应超过 4 MiB。';
    render();
    return;
  }

  const seq = ++packageLoad;
  checkingId = null;
  pkg = null;
  packageError = '';
  result = null;
  phase = 'checking';
  render();

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (seq !== packageLoad) return;
    log(`读取本地文件 ${file.name}：${bytes.length} B`);
    const check = await inspectPackage(bytes);
    if (seq !== packageLoad) return;

    pkg = {
      name: file.name,
      source: 'local',
      builtin: null,
      kind: classify(check, file.name, null),
      bytes,
      check,
    };
    phase = 'ready';
    log(`固件包 SHA-256：${check.sha256}`);
    for (const problem of check.problems) log(`固件包问题：${problem}`);
  } catch (e) {
    if (seq !== packageLoad) return;
    pkg = null;
    packageError = `读取固件包失败：${messageOf(e)}`;
    phase = idlePhase();
    log(packageError);
  } finally {
    if (seq === packageLoad) {
      if (phase === 'checking') phase = idlePhase();
      render();
    }
  }
}

/* ------------------------------ SWD 警告 ------------------------------ */

function closeWarnings() {
  if (warnTimer !== null) {
    clearInterval(warnTimer);
    warnTimer = null;
  }
  $('warn').hidden = true;
  warnIndex = 0;
}

function enterWarnStep(index) {
  warnIndex = index;
  const steps = $('warn-steps').querySelectorAll('li');
  steps.forEach((element, i) => {
    element.classList.toggle('active', i === index);
    element.classList.toggle('done', i < index);
  });

  $('warn-body').textContent = WARN_STEPS[index];
  $('warn-hint').textContent = WARN_HINTS[index];
  const button = $('warn-next');
  button.disabled = true;
  button.textContent = `${index === WARN_STEPS.length - 1 ? '确认并刷入' : '下一步'}（3）`;

  if (warnTimer !== null) clearInterval(warnTimer);
  warnDeadline = performance.now() + 3000;
  warnTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((warnDeadline - performance.now()) / 1000));
    if (remaining > 0) {
      button.disabled = true;
      button.textContent = `${index === WARN_STEPS.length - 1 ? '确认并刷入' : '下一步'}（${remaining}）`;
      return;
    }
    clearInterval(warnTimer);
    warnTimer = null;
    button.disabled = false;
    button.textContent = index === WARN_STEPS.length - 1 ? '确认并刷入' : '下一步';
  }, 100);
}

function openWarnings() {
  if (busy || !device || !pkg?.check.ok) return;
  warnIndex = 0;
  $('warn').hidden = false;
  enterWarnStep(0);
}

/* ------------------------------- 写入 -------------------------------- */

function updateFailureText(outcome, current) {
  if (outcome.failure === 'reset-unseen') {
    return current.kind === 'swd'
      ? '设备在 90 秒内没有重新出现。SWD 使能固件上电后约 60 秒才会回到 USB；请再等待一会儿，然后点击“重新连接”。如果你已经通过 SWD 擦除了固件，设备不会再恢复为分析仪。'
      : '复位后设备没有重新出现。请拔插一次；若仍不出现，按下方恢复指引操作。';
  }
  if (outcome.failure === 'unconfirmed') {
    return '设备已重启，但回报的版本或 CRC 与固件包不一致，可能仍在运行旧固件。请重试。';
  }
  return '写入中断。请重新连接后从头再刷。';
}

function successBody(flashed, kind) {
  const version = formatFirmware(flashed.firmwareVersion);
  const date = flashed.buildDate || '—';
  if (kind === 'swd') {
    return `设备已确认 ${version} / ${date}，代码 CRC 一致。设备可能在约 60 秒后才重新枚举；可通过 OTA 刷回标准固件恢复分析仪功能。切勿通过 SWD 擦除固件。`;
  }
  if (kind === 'free') {
    return `设备已确认 ${version} / ${date}，代码 CRC 一致。FPGA 未加载，相关 IO 已释放；随时可以 OTA 刷回标准固件。`;
  }
  if (kind === 'codeonly') {
    return `设备已确认 ${version} / ${date}，代码 CRC 一致。FPGA 未加载；若需要完整分析仪功能，请刷回标准固件。`;
  }
  return flashed.dataLength > 0
    ? `设备回报 ${version} / ${date}，版本、代码 CRC 与 FPGA 数据 CRC 均与固件包一致。`
    : `设备回报 ${version} / ${date}，版本与代码 CRC 与固件包一致。`;
}

async function flash() {
  if (busy || !device || !pkg?.check.ok || !pkg.check.info) return;
  const active = device;
  const current = pkg;

  busy = true;
  result = null;
  phase = 'writing';
  progress = { done: 0, total: current.check.blocks };
  setPhaseText(`正在写入 0/${progress.total} 块…`);
  log(`开始升级：${current.name}，${current.bytes.length} B，${progress.total} 块`);
  render();

  try {
    const outcome = await runIapUpdate({
      transport: active.transport,
      expected: current.check.info,
      resetDelayMs: 300,
      rediscover: () => rediscover(
        active.serial,
        current.kind === 'swd' ? 90000 : 15000,
        (seconds) => {
          setPhaseText(current.kind === 'swd'
            ? `等待设备重新枚举（SWD 固件约需 60 秒，已等待 ${seconds} 秒）…`
            : `等待设备重新枚举（已等待 ${seconds} 秒）…`);
        },
      ),
    }, current.bytes, {
      onPhase: (next) => {
        if (next === 'writing') phase = 'writing';
        else if (next === 'resetting') phase = 'resetting';
        else phase = 'verifying';
        if (next === 'resetting') setPhaseText('写入完成，正在复位设备…');
        if (next === 'verifying') {
          setPhaseText(current.kind === 'swd'
            ? '等待设备重新枚举（SWD 固件约需 60 秒）…'
            : '等待设备重新枚举…');
        }
        paintProgress();
      },
      onProgress: (done, total) => {
        progress = { done, total };
        setPhaseText(`正在写入 ${done}/${total} 块…`);
        paintProgress();
      },
      onLog: log,
    });

    if (outcome.next) {
      device = {
        usb: outcome.next.device,
        transport: outcome.next,
        product: outcome.next.device.productName?.trim() || active.product,
        serial: outcome.next.device.serialNumber || active.serial,
        info: outcome.current ?? null,
      };
    } else if (outcome.failure === 'reset-unseen') {
      device = null;
    }

    if (outcome.ok && outcome.current) {
      phase = 'done';
      progress = { done: progress.total, total: progress.total };
      result = {
        ok: true,
        title: '升级完成并已确认',
        body: successBody(outcome.current, current.kind),
        action: 'none',
      };
      log('设备已确认新固件：版本与 CRC 一致');
    } else {
      phase = 'failed';
      const failure = outcome.failure || 'transfer';
      result = {
        ok: false,
        title: '升级未完成',
        body: updateFailureText(outcome, current),
        action: failure === 'reset-unseen' || !device ? 'reconnect' : 'retry',
      };
      log(`升级失败：${failure}${outcome.message ? `（${outcome.message}）` : ''}`);
    }
  } catch (e) {
    phase = 'failed';
    result = {
      ok: false,
      title: '升级未完成',
      body: `写入中断：${messageOf(e)}。请重新连接后从头再刷。`,
      action: device ? 'retry' : 'reconnect',
    };
    log(`升级失败：${messageOf(e)}`);
  } finally {
    busy = false;
    setPhaseText('');
    render();
  }
}

function start() {
  if (busy || !device || !pkg?.check.ok || !pkg.check.info) return;
  if (pkg.kind === 'swd') openWarnings();
  else void flash();
}

/* ------------------------------ 事件绑定 ----------------------------- */

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const old = button.textContent || '';
    button.textContent = '已复制';
    setTimeout(() => { button.textContent = old; }, 1200);
  } catch {
    log('复制失败');
  }
}

function wire() {
  $('connect').addEventListener('click', () => { void connectDevice(); });
  $('disconnect').addEventListener('click', () => { void disconnectDevice(); });
  $('read-again').addEventListener('click', () => { void readAgain(); });

  for (const element of $('fw-grid').querySelectorAll('[data-fw]')) {
    element.addEventListener('click', () => { void selectBuiltin(element.dataset.fw); });
  }

  $('file-change').addEventListener('click', () => {
    $('file').value = '';
    $('file').click();
  });
  $('file').addEventListener('change', () => {
    const file = $('file').files?.[0];
    if (file) void loadLocalFile(file);
  });

  const dropInto = (element) => {
    element.addEventListener('dragover', (event) => {
      event.preventDefault();
      $('card-file').classList.add('over');
    });
    element.addEventListener('dragleave', () => $('card-file').classList.remove('over'));
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      $('card-file').classList.remove('over');
      const file = event.dataTransfer?.files?.[0];
      if (file) void loadLocalFile(file);
    });
  };
  dropInto($('drop'));
  dropInto($('package-box'));

  $('start').addEventListener('click', start);

  $('result-btn').addEventListener('click', () => {
    if (!result) return;
    const action = result.action;
    result = null;
    render();
    if (action === 'retry') void flash();
    else if (action === 'reconnect') void connectDevice();
  });

  $('theme').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme
      ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('sniffer2-ota-theme', next); } catch { /* 存储不可用 */ }
  });

  $('copy-sha').addEventListener('click', () => {
    if (pkg) void copyText(pkg.check.sha256, $('copy-sha'));
  });
  $('copy-log').addEventListener('click', (event) => {
    event.preventDefault();
    void copyText(logs.join('\n'), $('copy-log'));
  });

  $('warn-next').addEventListener('click', () => {
    if ($('warn-next').disabled) return;
    if (warnIndex < WARN_STEPS.length - 1) {
      enterWarnStep(warnIndex + 1);
    } else {
      closeWarnings();
      void flash();
    }
  });
  $('warn-cancel').addEventListener('click', closeWarnings);
  $('warn-close').addEventListener('click', closeWarnings);
  $('warn').addEventListener('click', (event) => {
    if (event.target === $('warn')) closeWarnings();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('warn').hidden) closeWarnings();
  });

  window.addEventListener('beforeunload', (event) => {
    if (!busy) return;
    event.preventDefault();
    event.returnValue = '升级正在进行。离开页面会中断写入，且只能从头重刷。';
  });

  usb?.addEventListener('disconnect', (event) => {
    if (!device || event.device !== device.usb) return;
    if (busy) {
      log('升级过程中设备断开（复位阶段的正常现象）');
      device = null;
      return;
    }
    device = null;
    deviceError = '设备已断开。';
    result = null;
    phase = idlePhase();
    if (!$('warn').hidden) closeWarnings();
    render();
  });

  usb?.addEventListener('connect', (event) => {
    const added = event.device;
    if (!added || busy || device) return;
    if (added.vendorId !== IAP.vid || added.productId !== IAP.pid) return;
    void adoptDevice(added);
  });
}

async function autoAdopt() {
  if (!usb) return;
  try {
    const known = await usb.getDevices();
    const candidate = known.find((item) => item.vendorId === IAP.vid && item.productId === IAP.pid);
    if (candidate) await adoptDevice(candidate);
  } catch {
    /* 可选 */
  }
}

function init() {
  wire();
  render();
  void loadManifest();
  void autoAdopt();
}

init();
