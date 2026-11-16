/*
 * USB Sniffer 2 IAP —— 纯静态实现（无构建、无依赖）
 *
 *   0xE0 IN   InfoGet   读取 256 字节 union iap_firmware_info
 *   0xE1 OUT  FwWrite   index = 256 字节块号
 *   0xE2 OUT  Reset     value = 复位延迟 ms
 *
 * .iap 包 = AES-128-CBC( info[256] + code(0xFF 对齐) + data(0xFF 对齐) )
 * CRC32 = 反射多项式 0xEDB88320，init/final 0xFFFFFFFF（等价 zlib.crc32）。
 *
 * 页面在发送前本地解密并校验整包：块 0 校验失败时设备会静默跳过所有写入，
 * 因此“每个控制传输都返回 OK”并不能证明固件真的写进去了。
 */

export const IAP = {
  vid: 0x1209,
  pid: 0x6688,
  product: 'USB Sniffer 2',
  magic: 0x20260705,
  logic20Magic: 0x20260820,
  hwMask: 0x1,
  infoSize: 256,
  blockSize: 256,
  infoAddr: 0x0800a000,
  codeAddr: 0x0800a100,
  capEnd: 0x080f0000,
  reqInfo: 0xe0,
  reqWrite: 0xe1,
  reqReset: 0xe2,
  dataInvalid: 0,
  dataRaw: 1,
  dataLr4: 2,
};

export const IAP_MAX_CODE_DATA = IAP.capEnd - IAP.codeAddr; // 0xE5F00
export const IAP_MAX_IMAGE = IAP.capEnd - IAP.infoAddr;       // 0xE6000

// 与固件 iap.c / tools/encrypt_firmware.py 保持一致；公开常量仅用于本地预检。
const AES_KEY = hexBytes('2abc65d7e4726e72364cf9272a061aaf');
const AES_IV = hexBytes('08050726253e5fab2fc3c726964a6d5d');

function hexBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export const align256 = (n) => (n + 255) & ~255;

export function formatBytes(value) {
  if (value >= 1048576) return `${(value / 1048576).toFixed(2)} MiB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${value} B`;
}

/** 0x00000100 -> "1.0.0"；与 Logic20Web iap/version.ts 一致。 */
export function formatFirmware(value) {
  const low = value & 0xffffff;
  return `${((low >>> 16) & 0xff).toString(16)}.${((low >>> 8) & 0xff).toString(16)}.${(low & 0xff).toString(16)}`;
}

/* ------------------------------- CRC-32 ------------------------------- */

let crcTable = null;

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
}

export function crc32(data) {
  const table = crcTable ?? (crcTable = makeCrcTable());
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

/* ------------------------------ AES-128 ------------------------------ */

const SBOX = Uint8Array.from([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]);

const RSBOX = Uint8Array.from([
  0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
  0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
  0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
  0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
  0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
  0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
  0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
  0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
  0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
  0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
  0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
  0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
  0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
  0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
  0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
  0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d,
]);

const RCON = Uint8Array.from([0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]);
const NB = 4;
const NK = 4;
const NR = 10;

function expandKey(key) {
  if (key.length !== 16) throw new Error('AES-128 key must be 16 bytes');
  const roundKey = new Uint8Array(16 * (NR + 1));
  roundKey.set(key, 0);
  for (let i = NK; i < NB * (NR + 1); i++) {
    const temp = roundKey.slice((i - 1) * 4, i * 4);
    if (i % NK === 0) {
      const first = temp[0];
      temp[0] = temp[1];
      temp[1] = temp[2];
      temp[2] = temp[3];
      temp[3] = first;
      for (let j = 0; j < 4; j++) temp[j] = SBOX[temp[j]];
      temp[0] ^= RCON[i / NK];
    }
    for (let j = 0; j < 4; j++) roundKey[i * 4 + j] = roundKey[(i - NK) * 4 + j] ^ temp[j];
  }
  return roundKey;
}

function addRoundKey(state, roundKey, round) {
  const offset = round * 16;
  for (let i = 0; i < 16; i++) state[i] ^= roundKey[offset + i];
}

function invShiftRows(state) {
  const copy = state.slice();
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) state[row + 4 * col] = copy[row + 4 * ((col - row + 4) % 4)];
  }
}

function invSubBytes(state) {
  for (let i = 0; i < 16; i++) state[i] = RSBOX[state[i]];
}

function mul(a, b) {
  let product = 0;
  let left = a;
  let right = b;
  while (right) {
    if (right & 1) product ^= left;
    left = (left & 0x80) ? ((left << 1) ^ 0x1b) & 0xff : (left << 1) & 0xff;
    right >>= 1;
  }
  return product & 0xff;
}

function invMixColumns(state) {
  for (let col = 0; col < 4; col++) {
    const i = 4 * col;
    const a = state[i];
    const b = state[i + 1];
    const c = state[i + 2];
    const d = state[i + 3];
    state[i] = mul(a, 0x0e) ^ mul(b, 0x0b) ^ mul(c, 0x0d) ^ mul(d, 0x09);
    state[i + 1] = mul(a, 0x09) ^ mul(b, 0x0e) ^ mul(c, 0x0b) ^ mul(d, 0x0d);
    state[i + 2] = mul(a, 0x0d) ^ mul(b, 0x09) ^ mul(c, 0x0e) ^ mul(d, 0x0b);
    state[i + 3] = mul(a, 0x0b) ^ mul(b, 0x0d) ^ mul(c, 0x09) ^ mul(d, 0x0e);
  }
}

function decryptBlock(block, roundKey) {
  const state = block.slice();
  addRoundKey(state, roundKey, NR);
  for (let round = NR - 1; round >= 0; round--) {
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, roundKey, round);
    if (round !== 0) invMixColumns(state);
  }
  return state;
}

export function aes128CbcDecrypt(ciphertext, key = AES_KEY, iv = AES_IV) {
  if (ciphertext.length % 16 !== 0) throw new Error('ciphertext is not a multiple of 16 bytes');
  const roundKey = expandKey(key);
  const plain = new Uint8Array(ciphertext.length);
  let previous = iv;
  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    const block = ciphertext.subarray(offset, offset + 16);
    const decrypted = decryptBlock(block, roundKey);
    for (let i = 0; i < 16; i++) plain[offset + i] = decrypted[i] ^ previous[i];
    previous = block;
  }
  return plain;
}

/* ----------------------------- info block ----------------------------- */

function text(bytes, start, end) {
  let out = '';
  for (let i = start; i < end; i++) {
    const c = bytes[i];
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out.trim();
}

export function parseIapInfo(block) {
  if (block.length < IAP.infoSize) {
    throw new Error(`IAP info block is ${block.length} bytes, expected ${IAP.infoSize}`);
  }
  const view = new DataView(block.buffer, block.byteOffset, IAP.infoSize);
  const u32 = (offset) => view.getUint32(offset, true);
  const infoCrc32 = u32(252);
  return {
    magic: u32(0),
    infoValidLength: u32(4),
    hardwareVersionMask: u32(8),
    firmwareVersion: u32(12),
    buildDate: text(block, 16, 28),
    codeLength: u32(28),
    dataLength: u32(32),
    dataType: u32(36),
    codeCrc32: u32(40),
    dataCrc32: u32(44),
    codeHash: text(block, 48, 56),
    dataHash: text(block, 56, 64),
    infoCrc32,
    infoCrcOk: crc32(block.subarray(0, 252)) === infoCrc32,
  };
}

/* ---------------------------- package check --------------------------- */

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  let out = '';
  for (const byte of new Uint8Array(digest)) out += byte.toString(16).padStart(2, '0');
  return out;
}

/**
 * 本地解密并校验整包，任何输入都不会抛异常（除 SHA-256 不可用）。
 * expected = { sha256, size } 用于核对内置文件未被替换。
 */
export async function inspectPackage(bytes, expected = null) {
  const problems = [];
  const sha256 = await sha256Hex(bytes);
  const blocks = Math.floor(bytes.length / IAP.blockSize);

  if (bytes.length === 0 || bytes.length % IAP.blockSize !== 0) problems.push('size');
  if (blocks < 2) problems.push('blocks');

  let plain;
  try {
    plain = aes128CbcDecrypt(bytes);
  } catch {
    return { ok: false, kind: 'unknown', sha256, bytes: bytes.length, blocks, problems: [...problems, 'decrypt'] };
  }

  let info;
  try {
    info = parseIapInfo(plain.subarray(0, IAP.infoSize));
  } catch {
    return { ok: false, kind: 'unknown', sha256, bytes: bytes.length, blocks, problems: [...problems, 'layout'] };
  }

  let kind = 'unknown';
  if (info.magic === IAP.magic) kind = 'sniffer2';
  else if (info.magic === IAP.logic20Magic) {
    kind = 'logic20';
    problems.push('magic-logic20');
  } else {
    problems.push('magic-unknown');
  }

  if ((info.hardwareVersionMask & IAP.hwMask) === 0) problems.push('hw-mask');
  if (!info.infoCrcOk) problems.push('info-crc');

  const codeStart = IAP.infoSize;
  const dataStart = codeStart + align256(info.codeLength);
  const expectedBytes = dataStart + align256(info.dataLength);
  if (info.codeLength <= 0 || expectedBytes !== bytes.length) problems.push('layout');
  if (info.codeLength + info.dataLength > IAP_MAX_CODE_DATA
    || IAP.infoSize + align256(info.codeLength) + align256(info.dataLength) > IAP_MAX_IMAGE) {
    problems.push('capacity');
  }

  const typeKnown = info.dataType === IAP.dataInvalid
    || info.dataType === IAP.dataRaw
    || info.dataType === IAP.dataLr4;
  if (!typeKnown
    || (info.dataLength > 0 && info.dataType === IAP.dataInvalid)
    || (info.dataLength === 0 && info.dataType !== IAP.dataInvalid)) {
    problems.push('data-type');
  }

  if (info.codeLength > 0 && codeStart + info.codeLength <= plain.length) {
    if (crc32(plain.subarray(codeStart, codeStart + info.codeLength)) !== info.codeCrc32) problems.push('code-crc');
  } else if (!problems.includes('layout')) {
    problems.push('layout');
  }
  if (info.dataLength > 0 && dataStart + info.dataLength <= plain.length) {
    if (crc32(plain.subarray(dataStart, dataStart + info.dataLength)) !== info.dataCrc32) problems.push('data-crc');
  } else if (info.dataLength < 0 || dataStart + info.dataLength > plain.length) {
    if (!problems.includes('layout')) problems.push('layout');
  }

  if (expected) {
    if ((expected.sha256 && expected.sha256 !== sha256) || (expected.size && expected.size !== bytes.length)) {
      problems.push('manifest-mismatch');
    }
  }

  return { ok: problems.length === 0, kind, sha256, bytes: bytes.length, blocks, info, problems };
}

/* ------------------------------ WebUSB -------------------------------- */

const messageOf = (error) => (error instanceof Error ? error.message : String(error));

export async function openIapDevice(device) {
  try {
    if (!device.opened) await device.open();
    // 已配置时不要再发 SET_CONFIGURATION：CH32 固件在 EP1 使用后重复配置会卡死。
    if (!device.configuration) await device.selectConfiguration(1);
    try { await device.claimInterface(0); } catch { /* EP0 不需要 */ }
  } catch (e) {
    throw new Error(`打开设备失败：${messageOf(e)}`);
  }

  return {
    device,

    async info() {
      let result;
      try {
        result = await device.controlTransferIn({
          requestType: 'vendor',
          recipient: 'device',
          request: IAP.reqInfo,
          value: 0,
          index: 0,
        }, IAP.infoSize);
      } catch (e) {
        throw new Error(`读取固件信息失败：${messageOf(e)}`);
      }
      if (result.status !== 'ok' || !result.data || result.data.byteLength < IAP.infoSize) return null;
      const bytes = new Uint8Array(result.data.buffer, result.data.byteOffset, IAP.infoSize).slice();
      if (new DataView(bytes.buffer).getUint32(0, true) === 0) return null;
      return parseIapInfo(bytes);
    },

    async writeBlock(index, block) {
      if (block.length !== IAP.blockSize) throw new Error(`block is ${block.length} bytes, expected ${IAP.blockSize}`);
      const result = await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: IAP.reqWrite,
        value: 0,
        index,
      }, block.slice());
      if (result.status !== 'ok') throw new Error(`USB ${result.status}`);
    },

    async reset(delayMs) {
      try {
        await device.controlTransferOut({
          requestType: 'vendor',
          recipient: 'device',
          request: IAP.reqReset,
          value: delayMs,
          index: 0,
        });
      } catch {
        // 设备会在状态阶段完成前复位，这是预期行为。
      }
    },

    async close() {
      try { await device.releaseInterface(0); } catch { /* 未 claim / 已拔出 */ }
      try { await device.close(); } catch { /* 已拔出 */ }
    },
  };
}

/* ------------------------------- update ------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRIES = 2;
const RETRY_DELAY_MS = 250;

function sameImage(a, b) {
  return a.magic === IAP.magic
    && a.firmwareVersion === b.firmwareVersion
    && a.codeLength === b.codeLength
    && a.dataLength === b.dataLength
    && a.dataType === b.dataType
    && a.codeCrc32 === b.codeCrc32
    && a.dataCrc32 === b.dataCrc32;
}

/**
 * 写入全部块 → 0xE2 复位 → 等设备重新枚举 → 用 InfoGet 核对版本与 CRC。
 * 返回 { ok, failure, message, current, next }，不抛异常（rediscover 自身的异常除外）。
 */
export async function runIapUpdate({ transport, expected, rediscover, resetDelayMs = 300 }, bytes, hooks = {}) {
  if (bytes.length === 0 || bytes.length % IAP.blockSize !== 0) {
    return { ok: false, failure: 'transfer', message: 'package length is not a multiple of 256 bytes' };
  }
  const total = bytes.length / IAP.blockSize;
  hooks.onPhase?.('writing');
  hooks.onProgress?.(0, total);

  for (let i = 0; i < total; i++) {
    const block = bytes.subarray(i * IAP.blockSize, (i + 1) * IAP.blockSize);
    let lastError = '';
    let sent = false;
    for (let attempt = 0; attempt <= RETRIES && !sent; attempt++) {
      try {
        await transport.writeBlock(i, block);
        sent = true;
      } catch (e) {
        lastError = messageOf(e);
        if (attempt < RETRIES) {
          hooks.onLog?.(`第 ${i + 1}/${total} 块写入失败（${lastError}），重试…`);
          await sleep(RETRY_DELAY_MS);
        }
      }
    }
    if (!sent) return { ok: false, failure: 'transfer', message: lastError || 'write failed' };
    hooks.onProgress?.(i + 1, total);
    if ((i + 1) % 64 === 0 || i + 1 === total) {
      hooks.onLog?.(`已写入 ${Math.round(((i + 1) / total) * 100)}%`);
    }
  }

  hooks.onPhase?.('resetting');
  await transport.reset(resetDelayMs);
  await transport.close();

  hooks.onPhase?.('verifying');
  const next = await rediscover();
  if (!next) {
    return { ok: false, failure: 'reset-unseen', message: 'the device did not re-enumerate in time' };
  }

  let current;
  try {
    current = await next.info();
  } catch (e) {
    return { ok: false, failure: 'unconfirmed', message: messageOf(e), next };
  }
  if (!current) {
    return { ok: false, failure: 'unconfirmed', message: 'no valid firmware info after reset', next };
  }
  if (!current.infoCrcOk || !sameImage(current, expected)) {
    return { ok: false, failure: 'unconfirmed', message: 'version or CRC differs from the package', current, next };
  }
  return { ok: true, current, next };
}
