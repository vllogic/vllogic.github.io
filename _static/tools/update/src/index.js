/* ============================================================
 * Vllink Update - 固件升级核心逻辑
 *
 * 支持两类设备的 OTA, 流程与页面外观保持一致:
 *   1. Vllink 调试器  -> WebHID, bootloader 报告协议
 *                        (PING/RESET/GET_VERSION/DOWNLOAD_512)
 *   2. USB Sniffer 2  -> WebUSB, vendor request 控制传输
 *                        0xE0 InfoGet / 0xE1 FwWrite / 0xE2 Reset
 *
 * 连接入口: 主按钮 = Vllink (WebHID); 按钮右侧 ▾ 箭头可选 USB Sniffer 2 (WebUSB)。
 * ============================================================ */

let buttonConnectDevice = document.getElementById("connect-device");
let buttonConnectMenuBtn = document.getElementById("connectMenuBtn");
let connectMenuList = document.getElementById("connectMenuList");
let transportLabel = document.getElementById("transportLabel");
let connectionStatus = document.getElementById("connectionStatus");
let hwLabel = document.getElementById("hwLabel");
let swLabel = document.getElementById("swLabel");
let snifferInfo = document.getElementById("snifferInfo");

let inputHwVersion = document.getElementById("hwVersionShow");
let inputSwVersion = document.getElementById("swVersionShow");
let inputBuildDate = document.getElementById("buildDateShow");
let inputCodeLength = document.getElementById("codeLengthShow");
let inputDataLength = document.getElementById("dataLengthShow");

let buttonSelectFile = document.getElementById("select-file");
let inputAutoReset = document.getElementById("auto-reset");
let buttonDownload = document.getElementById("download");
let processDownload = document.getElementById("download-process");

/* ---------------- Vllink bootloader 命令 (WebHID) ---------------- */
const BOOTLOADER_CMD_NOT_SUPPORT = 0x0000;
const BOOTLOADER_CMD_PING = 0x0001;
const BOOTLOADER_CMD_RESET = 0x0002;
const BOOTLOADER_CMD_DOWNLOAD_512 = 0x0100;
const BOOTLOADER_CMD_UPLOAD_512 = 0x0201;
const BOOTLOADER_CMD_SET_CONFIG = 0x0300;
const BOOTLOADER_CMD_GET_CONFIG = 0x0301;

/* ---------------- USB Sniffer 2 IAP 协议 (WebUSB) ---------------- */
const SNIFFER_VID = 0x1209;
const SNIFFER_PID = 0x6688;
const IAP_REQ_INFO_GET = 0xE0;   // IN , index=0, 返回 256B 固件信息
const IAP_REQ_FW_WRITE = 0xE1;   // OUT, index=块号, 每块 256B 加密包
const IAP_REQ_RESET = 0xE2;      // OUT, value=延迟ms, 复位设备
const IAP_INFO_SIZE = 256;
const IAP_BLOCK_SIZE = 256;
const IAP_CONST_CHARACTER = 0x20260705;
const IAP_RESET_DELAY_MS = 500;

const HID_FILTERS = [
  // Vllink Basic
  { vendorId: 0x1209, productId: 0x2301, usage: 0x01, usagePage: 0x0002 },
  // Vllink Basic2
  { vendorId: 0x1209, productId: 0x2312, usage: 0x01, usagePage: 0x0002 },
  // Vllink 2X
  { vendorId: 0x1209, productId: 0x2512, usage: 0x01, usagePage: 0xff00 },
  // Vllink HME
  { vendorId: 0x1209, productId: 0x2303, usage: 0x01, usagePage: 0x0002 },
  // Vllink FPGA
  { vendorId: 0x1209, productId: 0x2308, usage: 0x01, usagePage: 0x0002 },
  // Vllink Box
  { vendorId: 0x1209, productId: 0x2501, usage: 0x01, usagePage: 0x0002 },
  // Vllink Module
  { vendorId: 0x1209, productId: 0x2504, usage: 0x01, usagePage: 0x0002 },
];

let hidDevice = null;
let usbDevice = null;
let transport = null;   // 'hid' | 'usb'
let selectFile = null;
var timeFun = null;
var hidHwVersion = null;
var hidSwVersion = null;
var taskType = 0;
var taskTypePending = 0;
var taskPosTx = 0;
var taskPosRx = 0;
var waitReset = 0;
var pkt_length = 1023;
let updating = false;

(async () => {
  initButton();
})();

/* ============================================================
 * 通用: 连接状态 / 设备信息 / 按钮状态
 * ============================================================ */

function isConnected() {
  return transport === "usb" ? (usbDevice !== null) : (hidDevice !== null);
}

function setStatus(connected) {
  if (!connectionStatus) return;
  connectionStatus.textContent = connected ? "Connected" : "Disconnected";
  connectionStatus.classList.toggle("text-primary", connected);
}

function setTransportUi(mode) {
  const isUsb = mode === "usb";
  if (transportLabel) {
    transportLabel.textContent = isUsb ? "WebUSB IAP · 0x1209:0x6688" : "WebHID Bootloader";
  }
  if (hwLabel) hwLabel.textContent = isUsb ? "Hardware Version Mask" : "Hardware Info";
  if (swLabel) swLabel.textContent = isUsb ? "Firmware Version" : "Software Version";
  if (snifferInfo) snifferInfo.classList.toggle("hidden", !isUsb);
}

function setInputsUnconnected() {
  inputHwVersion.value = "Unconnected";
  inputSwVersion.value = "Unconnected";
  if (inputBuildDate) inputBuildDate.value = "Unconnected";
  if (inputCodeLength) inputCodeLength.value = "Unconnected";
  if (inputDataLength) inputDataLength.value = "Unconnected";
}

function refreshDownloadButton() {
  buttonDownload.disabled = !(isConnected() && selectFile != null && !updating);
}

/* 断开 / 复位当前会话 (切换设备类型或设备拔出时调用) */
function closeCurrent() {
  if (timeFun != null) {
    clearInterval(timeFun);
    timeFun = null;
  }
  if (hidDevice) {
    // HID 设备无需显式 close; 仅摘除回调, 避免重连同设备时的 close/open 竞态
    try { hidDevice.oninputreport = null; } catch (_) {}
    hidDevice = null;
  }
  if (usbDevice) {
    try { usbDevice.close(); } catch (_) {}
    usbDevice = null;
  }
  transport = null;
  hidHwVersion = null;
  hidSwVersion = null;
  waitReset = 0;
  taskType = 0;
  taskTypePending = 0;
}

/* ============================================================
 * Vllink (WebHID) 核心逻辑
 * ============================================================ */

function taskPingDo(dev)
{
  const bootloader_cmd_ping = [0x00, 0x00, 0x01, 0x00, 0x00, 0x00];
  var array = new Uint8Array(pkt_length);
  array.set(bootloader_cmd_ping, 0);
  dev.sendReport(0, array);
}

function taskResetDo(dev)
{
  const bootloader_cmd_reset = [0x00, 0x00, 0x02, 0x00, 0x00, 0x00];
  var array = new Uint8Array(pkt_length);
  array.set(bootloader_cmd_reset, 0);
  dev.sendReport(0, array);
}

function taskGetHwVersionDo(dev)
{
  const bootloader_cmd_get_hw_version = [0x00, 0x00, 0x01, 0x02, 0x08, 0x00, 0x01, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00];
  var array = new Uint8Array(pkt_length);
  array.set(bootloader_cmd_get_hw_version, 0);
  dev.sendReport(0, array);
}

function taskGetSwVersionDo(dev)
{
  const bootloader_cmd_get_sw_version = [0x00, 0x00, 0x01, 0x02, 0x08, 0x00, 0x02, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00];
  var array = new Uint8Array(pkt_length);
  array.set(bootloader_cmd_get_sw_version, 0);
  dev.sendReport(0, array);
}

function taskFirmwareUpdateDo(dev, data, posTx, posRx)
{
  if (data.byteLength <= posRx) {
    processDownload.value = 100;
    taskType = 0;

    if (inputAutoReset.checked == true) {
      waitReset = 1;
    } else {
      waitReset = 0;
    }
  } else {
    processDownload.value = posRx * 100 / data.byteLength;

    if (data.byteLength > posTx) {
      var data_len = data.byteLength - posTx;
      if (data_len > 512) {
        data_len = 512;
      }
      console.log('  Try Download: ' + posTx + '@' + data.byteLength + ' : ' + data_len);

      var array = new Uint8Array(pkt_length);

      const const_head = [0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00];
      array.set(new Uint8Array(const_head), 0);

      var head_size = new Uint16Array(1);
      head_size[0] = data_len;
      array.set(new Uint8Array(head_size.buffer), 8);

      var head_pos = new Uint32Array(1);
      head_pos[0] = posTx;
      array.set(new Uint8Array(head_pos.buffer), 8 + 2);

      array.set(new Uint8Array(data.slice(posTx, posTx + data_len)), 8 + 2 + 4);

      dev.sendReport(0, array);
      return data_len;
    }
  }
  return 0;
}

function taskPing(dev)
{
  if (taskType) {
    if (!taskTypePending) {
      taskTypePending = 1;
    }
    return;
  }
  taskType = 1;
  taskPingDo(dev);
}

function taskReset(dev)
{
  if (taskType) {
    if (!taskTypePending) {
      taskTypePending = 2;
    }
    return;
  }
  taskType = 2;
  taskResetDo(dev);
}

function taskGetHwVersion(dev)
{
  if (taskType) {
    if (!taskTypePending) {
      taskTypePending = 3;
    }
    return;
  }
  taskType = 3;
  taskGetHwVersionDo(dev);
}

function taskGetSwVersion(dev)
{
  if (taskType) {
    if (!taskTypePending) {
      taskTypePending = 4;
    }
    return;
  }
  taskType = 4;
  taskGetSwVersionDo(dev);
}

function taskFirmwareUpdate(dev, data)
{
  if (taskType) {
    if (!taskTypePending) {
      taskTypePending = 5;
    }
    return;
  }

  hidSwVersion = null;
  inputSwVersion.value = "Wait...";

  taskType = 5;
  taskPosTx = 0;
  taskPosRx = 0;
  taskPosTx += taskFirmwareUpdateDo(dev, data, taskPosTx, taskPosRx);
}

function parseHwVersion(data)
{
  console.log("parseHwVersion");
  console.log(data);
  var view = new DataView(data);
  if (view.getUint32(0, true) == 0xffffffff) {
    hidHwVersion = "Invalid Hardware Info";
    inputHwVersion.value = "Invalid Hardware Info";
  } else {
    hidHwVersion = String.fromCharCode.apply(null, new Uint8Array(data));
    inputHwVersion.value = String.fromCharCode.apply(null, new Uint8Array(data));
  }
}

function parseSwVersion(data)
{
  console.log("parseSwVersion");
  console.log(data);
  var view = new DataView(data);
  var productCode = view.getUint32(0, true);

  if ((productCode == 0x00000000) || (productCode == 0xffffffff)) {
    hidSwVersion = "Invalid Software Version";
    inputSwVersion.value = "Invalid Software Version";
  } else {
    hidSwVersion = String.fromCharCode.apply(null, new Uint8Array(data.slice(32, 32 + 24)));
    inputSwVersion.value = String.fromCharCode.apply(null, new Uint8Array(data.slice(32, 32 + 24)));
  }
}

function parseReportHandler(data, device, reportId) {
  const req_command = data.getUint16(2, true);

  switch (req_command) {
    case 0x0000: // BOOTLOADER_CMD_NOT_SUPPORT
      break;
    case 0x0001: // BOOTLOADER_CMD_PING
      if (taskType == 1) {
        taskType = 0;
      }
      break;
    case 0x0002: // BOOTLOADER_CMD_RESET
      if (taskType == 2) {
        taskType = 0;
      }
      break;
    case 0x0100: // BOOTLOADER_CMD_DOWNLOAD_512
      if (taskType == 5) {
        taskPosRx += data.getUint16(8, true);
        taskPosTx += taskFirmwareUpdateDo(hidDevice, selectFile, taskPosTx, taskPosRx);
      }
      break;
    case 0x0201: // BOOTLOADER_CMD_UPLOAD_512
      if (taskType == 3) {
        parseHwVersion(data.buffer.slice(14, 14 + 512));
        taskType = 0;
      } else if (taskType == 4) {
        parseSwVersion(data.buffer.slice(14, 14 + 512));
        taskType = 0;
      }
      break;
    case 0x0300: // BOOTLOADER_CMD_SET_CONFIG
      break;
    case 0x0301: // BOOTLOADER_CMD_GET_CONFIG
      break;
    default:
      break;
  }
}

async function inputReportHandler(event) {
  const { data, device, reportId } = event;
  parseReportHandler(data, device, reportId);

  if (!taskType & taskTypePending) {
    var newTaskType = taskTypePending;
    taskTypePending = 0;

    switch (newTaskType) {
      case 1:
        taskPing(hidDevice);
        break;
      case 2:
        taskReset(hidDevice);
        break;
      case 3:
        taskGetHwVersion(hidDevice);
        break;
      case 4:
        taskGetSwVersion(hidDevice);
        break;
      case 5:
        taskFirmwareUpdate(hidDevice);
        break;
    }
  }
}

async function connectHid() {
  if (!navigator.hid) {
    alert("当前环境不支持 WebHID。请使用 Chrome / Edge，并通过 HTTPS 或 localhost 访问。");
    return;
  }

  let devices;
  try {
    devices = await navigator.hid.requestDevice({ filters: HID_FILTERS });
  } catch (e) {
    console.log("HID requestDevice canceled/error: " + e);
    return;
  }

  const dev = devices[0];
  if (!dev) {
    inputHwVersion.value = "Unconnected";
    inputSwVersion.value = "Unconnected";
    return;
  }

  closeCurrent();
  hidDevice = dev;
  transport = "hid";
  hidHwVersion = null;
  hidSwVersion = null;

  inputHwVersion.value = "";
  inputSwVersion.value = "";

  taskType = 0;
  taskPosTx = 0;
  taskPosRx = 0;

  if (!hidDevice.opened) {
    hidDevice.open();
  }
  pkt_length = 1023;
  if ((hidDevice.vendorId == 0x1209) && (hidDevice.productId >= 0x2512)) {
    pkt_length = 1024;
  }
  console.log("pkt_length: " + pkt_length);
  hidDevice.oninputreport = (event) => inputReportHandler(event);

  console.log(hidDevice);

  inputAutoReset.disabled = false;
  setTransportUi("hid");
  setStatus(true);
  refreshDownloadButton();

  if (timeFun != null) {
    clearInterval(timeFun);
    timeFun = null;
  }
  timeFun = setInterval(function () {
    if ((hidDevice != null) && (taskType == 0)) {
      if (hidHwVersion == null) {
        taskGetHwVersion(hidDevice);
      } else if (hidSwVersion == null) {
        taskGetSwVersion(hidDevice);
      } else if (waitReset) {
        waitReset = 0;
        taskReset(hidDevice);
      }
    }
  }, 100);
}

/* ============================================================
 * USB Sniffer 2 (WebUSB / vendor request) 核心逻辑
 * ============================================================ */

function bytesToStr(view, start, end) {
  const bytes = [];
  for (let i = start; i < end; i++) bytes.push(view.getUint8(i));
  return String.fromCharCode.apply(null, bytes).replace(/\0+$/g, "");
}

async function loadInfoUsb(device) {
  const res = await device.controlTransferIn(
    { requestType: "vendor", recipient: "device", request: IAP_REQ_INFO_GET, value: 0, index: 0 },
    IAP_INFO_SIZE
  );
  if (!res.data || res.data.byteLength < IAP_INFO_SIZE) {
    throw new Error("InfoGet 返回数据长度异常");
  }
  const dv = res.data;
  if (dv.getUint32(0, true) !== IAP_CONST_CHARACTER) {
    throw new Error("固件信息签名无效（设备尚无有效 IAP 信息）");
  }

  const hwMask = dv.getUint32(8, true);
  const fwVer = dv.getUint32(12, true);
  const codeLen = dv.getUint32(28, true);
  const dataLen = dv.getUint32(32, true);

  inputHwVersion.value = "0x" + hwMask.toString(16).padStart(8, "0");
  inputSwVersion.value = "0x" + fwVer.toString(16).padStart(8, "0");
  if (inputBuildDate) inputBuildDate.value = bytesToStr(dv, 16, 28) || "(empty)";
  if (inputCodeLength) inputCodeLength.value = codeLen + " B (0x" + codeLen.toString(16) + ")";
  if (inputDataLength) inputDataLength.value = dataLen + " B (0x" + dataLen.toString(16) + ")";

  console.log("InfoGet: hw=0x" + hwMask.toString(16) + " fw=0x" + fwVer.toString(16)
    + " code=" + codeLen + " data=" + dataLen);
}

async function connectUsb() {
  if (!navigator.usb) {
    alert("当前环境不支持 WebUSB。请使用 Chrome / Edge，并通过 HTTPS 或 localhost 访问。");
    return;
  }

  let device;
  try {
    device = await navigator.usb.requestDevice({
      filters: [{ vendorId: SNIFFER_VID, productId: SNIFFER_PID }]
    });
  } catch (e) {
    console.log("USB requestDevice canceled/error: " + e);
    return;
  }
  if (!device) return;

  closeCurrent();

  try {
    await device.open();
    // F1a: 已配置则跳过 SET_CONFIGURATION, 避免重复配置破坏 EP1
    // (见 usb_sniffer2 docs/tasks/set_configuration_ep1_wedge.md)
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    // 仅 EP0 控制传输即可完成 IAP, 接口占用失败不阻断
    try {
      await device.claimInterface(0);
    } catch (e) {
      console.log("claimInterface(0) 跳过: " + e.message);
    }

    usbDevice = device;
    transport = "usb";

    setTransportUi("usb");
    setStatus(true);
    inputAutoReset.disabled = false;
    inputHwVersion.value = "";
    inputSwVersion.value = "";
    if (inputBuildDate) inputBuildDate.value = "";
    if (inputCodeLength) inputCodeLength.value = "";
    if (inputDataLength) inputDataLength.value = "";
    refreshDownloadButton();

    try {
      await loadInfoUsb(device);
    } catch (e) {
      console.warn("InfoGet failed:", e);
      setInputsUnconnected();
      console.log("InfoGet 无效: 设备尚无有效 IAP 信息, 可直接选择 .iap 包 Update");
    }
  } catch (e) {
    console.error(e);
    if (usbDevice) {
      try { usbDevice.close(); } catch (_) {}
    }
    usbDevice = null;
    transport = null;
    setInputsUnconnected();
    setTransportUi(null);
    setStatus(false);
    refreshDownloadButton();
    alert("连接失败: " + e.message);
  }
}

async function doUpdateUsb() {
  if (updating || !usbDevice || !selectFile) return;

  const len = selectFile.byteLength;
  if (len === 0 || len % IAP_BLOCK_SIZE !== 0) {
    alert("升级包大小异常，请确认选择了正确的 .iap 固件包。");
    return;
  }

  updating = true;
  buttonDownload.disabled = true;
  buttonConnectDevice.disabled = true;
  processDownload.value = 0;

  const blocks = len / IAP_BLOCK_SIZE;
  const buf = new Uint8Array(selectFile);

  try {
    console.log("Uploading " + blocks + " blocks (" + len + " B) ...");
    for (let i = 0; i < blocks; i++) {
      const chunk = buf.subarray(i * IAP_BLOCK_SIZE, (i + 1) * IAP_BLOCK_SIZE);
      await usbDevice.controlTransferOut(
        { requestType: "vendor", recipient: "device", request: IAP_REQ_FW_WRITE, value: 0, index: i },
        chunk
      );
      processDownload.value = (i + 1) * 100 / blocks;
    }
    processDownload.value = 100;
    console.log("固件写入完成, 固件侧 CRC 校验通过");

    if (inputAutoReset.checked) {
      await usbDevice.controlTransferOut(
        { requestType: "vendor", recipient: "device", request: IAP_REQ_RESET, value: IAP_RESET_DELAY_MS, index: 0 }
      );
      console.log("已发送复位 (延迟 " + IAP_RESET_DELAY_MS + " ms)");
    } else {
      console.log("未启用 Auto Reset, 请手动复位设备");
    }
  } catch (e) {
    console.error(e);
    alert("写入失败，请确认选择了正确的 .iap 固件包。\n" + e.message);
  } finally {
    updating = false;
    buttonConnectDevice.disabled = false;
    refreshDownloadButton();
  }
}

/* ============================================================
 * 事件绑定
 * ============================================================ */

function initButton() {
  // 主按钮: Vllink (WebHID)
  buttonConnectDevice.addEventListener("click", connectHid);

  // 设备类型菜单
  if (buttonConnectMenuBtn && connectMenuList) {
    buttonConnectMenuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      connectMenuList.classList.toggle("hidden");
    });
    connectMenuList.querySelectorAll("[data-connect]").forEach(function (el) {
      el.addEventListener("click", function () {
        connectMenuList.classList.add("hidden");
        if (el.dataset.connect === "usb") {
          connectUsb();
        } else {
          connectHid();
        }
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#connectMenu")) connectMenuList.classList.add("hidden");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") connectMenuList.classList.add("hidden");
    });
  }

  buttonSelectFile.addEventListener("change", async () => {
    selectFile = null;
    refreshDownloadButton();

    if (buttonSelectFile.files.length > 0) {
      let file = buttonSelectFile.files[0];
      let reader = new FileReader();
      reader.onload = function () {
        selectFile = reader.result.slice(0);
        refreshDownloadButton();
      };
      reader.readAsArrayBuffer(file);
    }
  });

  buttonDownload.addEventListener("click", async () => {
    if (transport === "usb") {
      await doUpdateUsb();
    } else {
      taskFirmwareUpdate(hidDevice, selectFile);
    }
  });

  // 断开事件: 仅重置当前逻辑持有的设备
  if (navigator.hid) {
    navigator.hid.addEventListener("disconnect", (event) => {
      if (hidDevice && event.device === hidDevice) {
        closeCurrent();
        setTransportUi(null);
        setInputsUnconnected();
        setStatus(false);
        refreshDownloadButton();
      }
    });
  }
  if (navigator.usb) {
    navigator.usb.addEventListener("disconnect", (event) => {
      if (usbDevice && event.device === usbDevice) {
        closeCurrent();
        setTransportUi(null);
        setInputsUnconnected();
        setStatus(false);
        refreshDownloadButton();
      }
    });
  }

  // 初始连接状态 (已授权设备的装饰显示)
  (async function syncStatus() {
    let connected = false;
    try {
      if (navigator.hid) {
        const hidDevices = await navigator.hid.getDevices();
        connected = connected || hidDevices.length > 0;
      }
    } catch (_) {}
    try {
      if (navigator.usb) {
        const usbDevices = await navigator.usb.getDevices();
        connected = connected || usbDevices.some((d) => d.opened);
      }
    } catch (_) {}
    setStatus(connected);
  })();
}
