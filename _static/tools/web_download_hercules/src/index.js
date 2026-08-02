/* ============ 三模态主题管理器 (移植自 vllink2026_console) ============ */
const ThemeManager = {
    btns: document.querySelectorAll('[data-theme]'),
    slider: document.getElementById('themeSlider'),
    init() {
        const saved = localStorage.getItem('hercules-theme-preference') || 'auto';
        this.apply(saved);
        this.btns.forEach(btn => btn.addEventListener('click', () => this.apply(btn.dataset.theme)));
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (localStorage.getItem('hercules-theme-preference') === 'auto') this.apply('auto');
        });
    },
    apply(mode) {
        localStorage.setItem('hercules-theme-preference', mode);
        const isDark = mode === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : mode === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        const activeIdx = Array.from(this.btns).findIndex(b => b.dataset.theme === mode);
        if (this.slider) this.slider.style.left = `calc(${activeIdx * 33.33}% + 4px)`;
        this.btns.forEach(btn => {
            const isActive = btn.dataset.theme === mode;
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('text-slate-500', !isActive);
        });
    }
};

let buttonConnectDevice = document.getElementById("connect-device");
let inputVersionShow = document.getElementById("versionShow");
let connectionStatus = document.getElementById("connectionStatus");

let inputStatusOut = document.getElementById("statusOut");

let inputChipName = document.getElementById("chip-name");
let inputFlashCapacity = document.getElementById("flash-capacity");
let inputAutoProbe = document.getElementById("auto-probe");
let buttonChipProbe = document.getElementById("chip-probe");
//let processChipProbe = document.getElementById("chip-probe-process");

let inputAutoErase = document.getElementById("auto-erase");
let inputAutoVerify = document.getElementById("auto-verify");
let inputAutoReset = document.getElementById("auto-reset");
let inputAutoAcfFlash = document.getElementById("auto-acf-flash");
let inputAutoAcfChip = document.getElementById("auto-acf-chip");
let buttonSelectFileFlash = document.getElementById("select-file-flash");
let buttonDownloadFlash = document.getElementById("download-flash");
let processDownloadFlash = document.getElementById("download-flash-process");

let buttonReadFlash = document.getElementById("read-flash");
let processReadFlash = document.getElementById("read-flash-process");

let buttonSelectFileChip = document.getElementById("select-file-chip");
let buttonDownloadChip = document.getElementById("download-chip");
let processDownloadChip = document.getElementById("download-chip-process");


let vllinkDevice = null;
let selectFileFlashWrite = null;
let selectFileChipWrite = null;


var dapPort = null;
var timeFun = null;
var dapTaskType = 0;
var dapTaskTypePending = 0;
var dapTaskPosTx = 0;
var dapTaskPosRx = 0;
var dapVersion = 0;
var dapChipSupportedNum = 0;
var dapLastChipAttachMs = 0;
var dapHerculesCommonBuf = new Uint8Array(12);
var dapHerculesCommon = new DataView(dapHerculesCommonBuf.buffer);
var dapHerculesChipValid = false;
var dapHerculesFlashCapacity = 0;
var dapHerculesFlashReadBuf = null;

let lastDeviceCache = null; // 最近一次成功连接设备的特征 (用于拔插自动重连)

// 原生监听: 拔插自动拉起重连
if (navigator.usb) {
  navigator.usb.addEventListener('connect', async (event) => {
    const dev = event.device;
    if (!dapPort && lastDeviceCache &&
        dev.vendorId === lastDeviceCache.vid &&
        dev.productId === lastDeviceCache.pid &&
        dev.serialNumber === lastDeviceCache.sn) {
      try {
        setConnectedUI('connecting');
        await performConnection(dev);
      } catch (e) {
        setConnectedUI('disconnected');
      }
    }
  });
  navigator.usb.addEventListener('disconnect', (event) => {
    if (dapPort && event.device === dapPort.device_) {
      performDisconnect();
    }
  });
}

(async () => {
  initButton();
  ThemeManager.init();
  autoConnectOnLoad();
})();

function uiStatusOut(str) {
  inputStatusOut.value = str;
}

function checkCommonChipValid() {
  return dapHerculesChipValid;
}

function checkCommonFlashValid() {
  return dapHerculesFlashCapacity ? true : false;
}

function uiClearHerculesCommon() {
  dapHerculesCommonBuf.set(new Uint8Array(12), 0);
  dapLastChipAttachMs = 0;

  dapHerculesChipValid = false;
  dapHerculesFlashCapacity = 0;

  inputChipName.value = "";
  inputFlashCapacity.value = "";
  
  inputAutoErase.disabled = true;
  inputAutoVerify.disabled = true;
  inputAutoReset.disabled = true;
  inputAutoAcfFlash.disabled = true;
  inputAutoAcfChip.disabled = true;
  buttonDownloadFlash.disabled = true;

  buttonReadFlash.disabled = true;
  
  buttonDownloadChip.disabled = true;
}

function uiUpdateHerculesCommon() {
  const chip_attach_ms = dapHerculesCommon.getUint32(0, true);
  const khz = dapHerculesCommon.getUint16(4, true);
  const target_type = dapHerculesCommon.getUint8(6);
  //const dev_num = dapHerculesCommon.getUint8(7);
  const capacity = dapHerculesCommon.getUint32(8, true);

  if (chip_attach_ms != dapLastChipAttachMs) {
    if (chip_attach_ms) {
      console.log('  New Chip Attach, at ' + chip_attach_ms + 'ms');
      console.log('  Speed: ' + khz + 'kHz');
      console.log('  Target Type: ' + target_type);

      uiStatusOut('New Chip Attach');

      if (khz && (target_type < dapChipSupportedNum)) {
        dapHerculesChipValid = true;
        dapHerculesFlashCapacity = capacity;
  
        if (target_type == HERCULES_TARGET_TYPE_M5) {
          inputChipName.value = "M5";
        } else if (target_type == HERCULES_TARGET_TYPE_M7) {
          inputChipName.value = "M7";
        } else if (target_type == HERCULES_TARGET_TYPE_HR02) {
          inputChipName.value = "HR02";
        } else if (target_type == HERCULES_TARGET_TYPE_HR03) {
          inputChipName.value = "HR03";
        } else if (target_type == HERCULES_TARGET_TYPE_H1D03) {
          inputChipName.value = "H1D03";
        } else if (target_type == HERCULES_TARGET_TYPE_H1C02) {
          inputChipName.value = "H1C02";
        } else if (target_type == HERCULES_TARGET_TYPE_P1) {
          inputChipName.value = "P1";
        } else if (target_type == HERCULES_TARGET_TYPE_H3) {
          inputChipName.value = "H3";
        } else if (target_type == HERCULES_TARGET_TYPE_P0) {
          inputChipName.value = "P0";
        } else {
          inputChipName.value = "Unknown";
        }
        inputFlashCapacity.value = (capacity / 1024).toString(10);
  
        inputAutoErase.disabled = false;
        inputAutoVerify.disabled = false;
        inputAutoReset.disabled = false;
        inputAutoAcfFlash.disabled = false;
        inputAutoAcfChip.disabled = false;
        if (selectFileFlashWrite && checkCommonFlashValid()) {
          buttonDownloadFlash.disabled = false;
        }
  
        if (checkCommonFlashValid()) {
          buttonReadFlash.disabled = false;
        }
        
        if (selectFileChipWrite) {
          buttonDownloadChip.disabled = false;
        }
      } else {
        console.log('  Not Support');
        uiStatusOut('Unknown Device');

        dapHerculesChipValid = false;
        dapHerculesFlashCapacity = 0;
  
        inputChipName.value = "";
        inputFlashCapacity.value = "";

        inputAutoErase.disabled = true;
        inputAutoVerify.disabled = true;
        inputAutoReset.disabled = true;
        inputAutoAcfFlash.disabled = true;
        inputAutoAcfChip.disabled = true;
        buttonDownloadFlash.disabled = true;
  
        buttonReadFlash.disabled = true;
        
        buttonDownloadChip.disabled = true;
      }
    } else {
      console.log('  Chip Deattach');
      uiStatusOut('Chip Deattach');

      dapHerculesChipValid = false;
      dapHerculesFlashCapacity = 0;

      inputChipName.value = "";
      inputFlashCapacity.value = "";
      
      inputAutoErase.disabled = true;
      inputAutoVerify.disabled = true;
      inputAutoReset.disabled = true;
      inputAutoAcfFlash.disabled = true;
      inputAutoAcfChip.disabled = true;
      buttonDownloadFlash.disabled = true;

      buttonReadFlash.disabled = true;
      
      buttonDownloadChip.disabled = true;
    }

    dapLastChipAttachMs = chip_attach_ms;
  }
}


function dapTaskUpdateInfo(port) {
  if (dapTaskType) {
    return;
  }

  dapTaskType = 1;
  console.log('dapTaskUpdateInfo');

  var array = hercules_cmd_get_info();
  port.send(array);
}

function dapParseRespUpdateInfo(port, data, respSubSts) {
  /*
  struct hercules_dap_vendor_info_t {
      uint32_t protocol_version;          // HERCULES_DAP_VENDOR_PROTOCOL_VERSION
      uint32_t chip_supported_num;        // HERCULES_TARGET_TYPE_NUM
      uint16_t speed_supported_khz[16];   // jtag_clock_list -> speed_supported_khz
  } PACKED;
  */
  if (respSubSts == 0) {
    dapVersion = data.getUint32(4, true);
    inputVersionShow.value = dapVersion.toString(16);
    dapChipSupportedNum = data.getUint32(8, true);
    inputAutoProbe.disabled = false;
    buttonChipProbe.disabled = false;

    console.log('  dapVersion: ' + inputVersionShow.value);
    console.log('  dapChipSupportedNum: ' + dapChipSupportedNum);
  }

  dapTaskType = 0;
}

function dapTaskProbeChip(port) {
  if (dapTaskType) {
    return;
  }

  dapTaskType = 2;
  console.log('dapTaskProbeChip');
  
  var array = hercules_cmd_probe_chip();
  port.send(array);
}

function dapParseRespProbeChip(port, data, respSubSts) {
  /*
  struct hercules_dap_vendor_common_t {
      uint32_t chip_attach_ms;
      uint16_t khz;
      uint8_t target_type;
      uint8_t dev_num;
      int32_t capacity;
  } PACKED;
  */
  if (respSubSts == 0) {
    dapHerculesCommonBuf.set(new Uint8Array(data.buffer, 4, 12), 0);
    uiUpdateHerculesCommon();
  }
  
  dapTaskType = 0;
}

function dapTryChipWrite(port, fileData, posTx, posRx) {
  if (fileData.byteLength <= posRx) {
    uiStatusOut('Chip Write Finish.' + posRx + ' bytes has been written.');

    processDownloadChip.style.width = '100%';
    dapTaskType = 0;

    uiClearHerculesCommon();
  } else {
    processDownloadChip.style.width = (posRx * 100 / fileData.byteLength) + '%';

    if (fileData.byteLength > posTx) {
      const op_mask = HERCULES_OP_WRITE | HERCULES_OP_WRITEQUICK;
      var data_len = fileData.byteLength - posTx;
      if (data_len > 256) {
        data_len = 256;
      }
      //console.log('  Try Chip Write: ' + posTx + '@' + fileData.byteLength + ' : ' + data_len);

      var array = hercules_cmd_chip_write(dapHerculesCommon.buffer, fileData, op_mask, fileData.byteLength, posTx, data_len);
      port.send(array);
      return data_len;
    }
  }
  return 0;
}

function dapTaskChipWrite(port, fileData) {
  if (dapTaskType) {
    return;
  }

  inputAutoProbe.checked = false;

  dapTaskType = 3;
  dapTaskPosTx = 0;
  dapTaskPosRx = dapTaskPosTx;
  processDownloadChip.style.width = '0%';

  dapTaskPosTx += dapTryChipWrite(port, fileData, dapTaskPosTx, dapTaskPosRx);
  dapTaskPosTx += dapTryChipWrite(port, fileData, dapTaskPosTx, dapTaskPosRx);
}

function dapParseRespChipWrite(port, data, respSubSts) {
  if (respSubSts == HERCULES_SUBCMD_RESP_INVALID_COMMON) {
    uiStatusOut('Failed!!!  Chip Write Resp: HERCULES_SUBCMD_RESP_INVALID_COMMON');

    dapTaskType = 0;
  } else if (respSubSts == HERCULES_SUBCMD_RESP_OK) {
    const data_len = data.getUint32(4, true);
    dapTaskPosRx += data_len;
    uiStatusOut('Chip Write Resp OK. ' + dapTaskPosRx + ' bytes has been written.');

    dapTaskPosTx += dapTryChipWrite(port, selectFileChipWrite, dapTaskPosTx, dapTaskPosRx);
  } else {
    uiStatusOut('Failed!!!  Chip Flash Write Resp: Unknown ' + respSubSts);

    dapTaskType = 0;
  }
}

function dapTryFlashWrite(port, fileData, addr, posTx, posRx) {
  if (fileData.byteLength <= posRx) {
    uiStatusOut('Flash Write Finish.' + posRx + ' bytes has been written.');

    processDownloadFlash.style.width = '100%';
    dapTaskType = 0;

    if (inputAutoReset.checked) {
      uiClearHerculesCommon();
    }
  } else {
    processDownloadFlash.style.width = (posRx * 100 / fileData.byteLength) + '%';

    if (fileData.byteLength > posTx) {
      var op_mask = HERCULES_OP_WRITE;
      if (inputAutoErase.checked) {
        op_mask |= HERCULES_OP_ERASE;
      }
      if (inputAutoVerify.checked) {
        op_mask |= HERCULES_OP_VERIFY;
      }
      if (inputAutoReset.checked) {
        op_mask |= HERCULES_OP_AUTORESET;
      }
      var data_len = fileData.byteLength - posTx;
      if (data_len > 256) {
        data_len = 256;
      }
      console.log('  Try Flash Write: ' + posTx + '@' + fileData.byteLength + ' : ' + data_len);
  
      var array = hercules_cmd_flash_write(dapHerculesCommon.buffer, fileData, op_mask, fileData.byteLength, addr, posTx, data_len);
      port.send(array);
      return data_len;
    }
  }
  return 0;
}

function dapTaskFlashWrite(port, fileData) {
  if (dapTaskType) {
    return;
  }

  if (inputAutoReset.checked) {
    inputAutoProbe.checked = false;
  }

  console.log('dapTaskFlashWrite');
  console.log('  file length: ' + fileData.byteLength);
  dapTaskType = 4;
  dapTaskPosTx = 0;
  dapTaskPosRx = dapTaskPosTx;
  processDownloadFlash.style.width = '0%';

  dapTaskPosTx += dapTryFlashWrite(port, fileData, 0, dapTaskPosTx, dapTaskPosRx);
  dapTaskPosTx += dapTryFlashWrite(port, fileData, 0, dapTaskPosTx, dapTaskPosRx);
}

function dapParseRespFlashWrite(port, data, respSubSts) {
  if (respSubSts == HERCULES_SUBCMD_RESP_INVALID_COMMON) {
    uiStatusOut('Failed!!!  Flash Write Resp: HERCULES_SUBCMD_RESP_INVALID_COMMON');

    dapTaskType = 0;
  } else if (respSubSts == HERCULES_SUBCMD_RESP_OK) {
    const data_len = data.getUint32(4, true);
    dapTaskPosRx += data_len;
    uiStatusOut('Flash Write Resp OK. ' + dapTaskPosRx + ' bytes has been written.');

    dapTaskPosTx += dapTryFlashWrite(port, selectFileFlashWrite, 0, dapTaskPosTx, dapTaskPosRx);
  } else {
    uiStatusOut('Failed!!!  Flash Write Resp: Unknown ' + respSubSts);
    dapTaskType = 0;
  }
}

function dapTryFlashRead(port, fileData, addr, posTx, posRx) {
  if (fileData.byteLength <= posRx) {
    uiStatusOut('Flash Read Finish.' + posRx + ' bytes has been read.');

    processReadFlash.style.width = '100%';
    dapTaskType = 0;
    return 0;
  } else {
    processReadFlash.style.width = (posRx * 100 / fileData.byteLength) + '%';

    if (fileData.byteLength > posTx) {
      var op_mask = HERCULES_OP_READ;
      var data_len = fileData.byteLength - posTx;
      if (data_len > 256) {
        data_len = 256;
      }

      var array = hercules_cmd_flash_read(dapHerculesCommon.buffer, op_mask, fileData.byteLength, addr, posTx, data_len);
      port.send(array);
      return data_len;
    }
  }
}

function dapTaskFlashRead(port, length) {
  if (dapTaskType) {
    return;
  }
  
  dapTaskType = 5;
  dapTaskPosTx = 0;
  dapTaskPosRx = dapTaskPosTx;
  processReadFlash.style.width = '0%';

  dapHerculesFlashReadBuf = new Uint8Array(length);

  dapTaskPosTx += dapTryFlashRead(port, dapHerculesFlashReadBuf, 0, dapTaskPosTx, dapTaskPosRx);
  dapTaskPosTx += dapTryFlashRead(port, dapHerculesFlashReadBuf, 0, dapTaskPosTx, dapTaskPosRx);
}

function dapParseRespFlashRead(port, data, respSubSts) {
  if (respSubSts == HERCULES_SUBCMD_RESP_INVALID_COMMON) {
    uiStatusOut('Failed!!!  Flash read Resp: HERCULES_SUBCMD_RESP_INVALID_COMMON');

    dapTaskType = 0;
  } else if (respSubSts == HERCULES_SUBCMD_RESP_OK) {
    const len = data.getUint32(4, true);
    if (len) {
      dapHerculesFlashReadBuf.set(new Uint8Array(data.buffer.slice(8)), dapTaskPosRx);
      dapTaskPosRx += len;
      uiStatusOut('Flash Read Resp OK. ' + dapTaskPosRx + '@' + dapHerculesFlashReadBuf.byteLength);
      var ret = dapTryFlashRead(port, dapHerculesFlashReadBuf, 0, dapTaskPosTx, dapTaskPosRx);
      if (ret == 0) {
        var a = document.createElement("a");
        a.href = window.URL.createObjectURL(new Blob([dapHerculesFlashReadBuf]));
        a.download = inputChipName.value + '.flash.bin';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        dapTaskPosTx += ret;
      }
    }
  } else {
    uiStatusOut('Failed!!!  Flash Read Resp: Unknown ' + respSubSts);
    dapTaskType = 0;
  }
}

function dapTryFlashVerfiy(port, fileData, dapTaskPosTx) {
  if (fileData.byteLength <= dapTaskPosTx) {
    dapTaskType = 0;
  } else {
    const op_mask = HERCULES_OP_VERIFY;
    var data_len = fileData.byteLength - dapTaskPosTx;
    if (data_len > 256) {
      data_len = 256;
    }
    var array = hercules_cmd_flash_verify(dapHerculesCommon.buffer, fileData, op_mask, fileData.byteLength, dapTaskPosTx, data_len);
    port.send(array);
  }
}

function dapTaskFlashVerfiy(port, file) {
  if (dapTaskType) {
    return;
  }
  
  console.log('dapTaskFlashVerfiy Start');
  dapTaskType = 6;
  dapTaskPosTx = 0;
  dapTryFlashVerfiy(port, fileData, dapTaskPosTx);
}

function dapParseRespFlashVerfiy(port, data, respSubSts) {
  if (respSubSts == HERCULES_SUBCMD_RESP_INVALID_COMMON) {
    // TODO exit
    dapTaskType = 0;
  } else if (respSubSts == HERCULES_SUBCMD_RESP_OK) {
    const data_len = data.getUint32(4, true);
    dapTaskPosTx += data_len;
    dapTryFlashVerfiy(port, fileData, dapTaskPosTx);
  } else {
    // TODO
    dapTaskType = 0;
  }
}

function dapReceiveHandler(port, data) {
  //console.log('dapReceiveHandler, dapTaskType: ' + dapTaskType);
  
  const respCmd = data.getUint8(0);
  if (respCmd == VENDOR_ID_HERCULES) {
    const respSub = data.getUint8(1);
    const respCmdSts = data.getUint8(2);
    const respSubSts = data.getUint8(3);
    if ((dapTaskType == 1) && (respSub == HERCULES_SUBCMD_GET_INFO) && (respCmdSts == 0)) { // dapTaskUpdateInfo
      dapParseRespUpdateInfo(port, data, respSubSts);
    } else if ((dapTaskType == 2) && (respSub == HERCULES_SUBCMD_PROBE_CHIP) && (respCmdSts == 0)) { // dapTaskProbeChip
      dapParseRespProbeChip(port, data, respSubSts);
    } else if ((dapTaskType == 3) && (respSub == HERCULES_SUBCMD_CHIP_WRITE) && (respCmdSts == 0)) { // dapTaskChipWrite
      dapParseRespChipWrite(port, data, respSubSts);
    } else if ((dapTaskType == 4) && (respSub == HERCULES_SUBCMD_FLASH_WRITE) && (respCmdSts == 0)) { // dapTaskFlashWrite
      dapParseRespFlashWrite(port, data, respSubSts);
    } else if ((dapTaskType == 5) && (respSub == HERCULES_SUBCMD_FLASH_READ) && (respCmdSts == 0)) { // dapTaskFlashRead
      dapParseRespFlashRead(port, data, respSubSts);
    } else if ((dapTaskType == 6) && (respSub == HERCULES_SUBCMD_FLASH_VERIFY) && (respCmdSts == 0)) { // dapTaskFlashVerfiy
      dapParseRespFlashVerfiy(port, data, respSubSts);
    } else {
      console.log(' invalid resp');
      console.log(' respSub: '+ respSub);
      console.log(' respCmdSts: '+ respCmdSts);
      console.log(' respSubSts: '+ respSubSts);
    }
  }
}

function setConnectedUI(state) {
  const connDot = document.getElementById('connDot');
  const connText = document.getElementById('connText');
  if (state === 'connected') {
    buttonConnectDevice.textContent = 'Disconnect Vllink Hercules';
    connectionStatus.innerText = 'ONLINE';
    if (connDot) connDot.className = 'w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#00d4ff]';
    if (connText) connText.innerText = '已连接';
  } else if (state === 'connecting') {
    buttonConnectDevice.textContent = 'Connecting...';
    connectionStatus.innerText = 'CONNECTING...';
    if (connDot) connDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]';
    if (connText) connText.innerText = '连接中...';
  } else {
    buttonConnectDevice.textContent = 'Connect Vllink Hercules';
    connectionStatus.innerText = 'Disconnected';
    if (connDot) connDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400 shadow-[0_0_10px_rgba(100,116,139,0.6)]';
    if (connText) connText.innerText = '未连接';
  }
}

async function performConnection(existingDevice = null) {
  if (existingDevice) {
    // 自动重连: 复用已授权设备, 不弹窗
    dapPort = new dapv2.Port(existingDevice);
  } else {
    setConnectedUI('connecting');
    dapPort = await dapv2.requestPort();
  }

  console.log('Connecting to ' + dapPort.device_.productName + '...');
  await dapPort.connect();
  console.log('Connected.');

  // 记忆上次成功连接的设备序列号, 供下次页面刷新/拔插时静默重连
  if (dapPort.device_.serialNumber) {
    localStorage.setItem('hercules-last-sn', dapPort.device_.serialNumber);
  }
  lastDeviceCache = {
    vid: dapPort.device_.vendorId,
    pid: dapPort.device_.productId,
    sn: dapPort.device_.serialNumber
  };

  setConnectedUI('connected');

  if (timeFun != null) {
    clearInterval(timeFun);
    timeFun = null;
  }
  dapTaskType = 0;
  timeFun = setInterval(function () {
    if ((dapPort != null) && (dapTaskType == 0)) {
      if (dapVersion == 0) {
        dapTaskUpdateInfo(dapPort);
      } else {
        if (inputAutoProbe.checked) {
          dapTaskProbeChip(dapPort);
        }
      }
    }
  }, 200);

  dapPort.onReceive = data => {
    dapReceiveHandler(dapPort, data);
  };
  dapPort.onReceiveError = error => {
    console.log('Receive error: ' + error);
  };
}

function performDisconnect() {
  if (timeFun != null) {
    clearInterval(timeFun);
    timeFun = null;
  }
  if (dapPort) {
    try { dapPort.disconnect(); } catch (e) { console.warn('Disconnect warning:', e); }
    dapPort = null;
  }
  dapVersion = 0;
  dapChipSupportedNum = 0;
  uiClearHerculesCommon();
  inputVersionShow.value = 'Unconnected';
  uiStatusOut('');
  setConnectedUI('disconnected');
}

// ============ 自动重连 (移植自 vllink2026_console) ============
async function autoConnectOnLoad() {
  if (!navigator.usb) return;
  try {
    const ports = await dapv2.getPorts();
    if (ports.length > 0) {
      const lastSn = localStorage.getItem('hercules-last-sn');
      let target = ports.find(p => p.device_.serialNumber && p.device_.serialNumber === lastSn);
      if (!target) target = ports[0];
      setConnectedUI('connecting');
      await performConnection(target.device_);
    }
  } catch (e) {
    console.warn('Auto connect on load failed:', e);
    setConnectedUI('disconnected');
  }
}

function getFlashWriteStartPos(fileData, type, target_type, cutAcf) {
  var startPos = 0;

  // 仅当勾选 Auto Cut ACF 且文件为 .acf 时才裁剪注释头部
  if (cutAcf && type == 'acf') {
    var view = new DataView(fileData);
    while (view.getUint16(startPos, true) == 0x2f2f) {
      startPos += 2;
      while (view.getUint8(startPos) != 0x0a) {
        startPos += 1;
      }
      startPos += 1;
    }
    console.log(startPos);
  }

  return startPos;
}

function getChipWriteStartPos(fileData, type, target_type, cutAcf) {
  var startPos = getFlashWriteStartPos(fileData, type, target_type, cutAcf);

  if (target_type == HERCULES_TARGET_TYPE_H1D03) {
    startPos += 8;
  } else if (target_type == HERCULES_TARGET_TYPE_P1) {
    startPos += 8;
  } else if (target_type == HERCULES_TARGET_TYPE_H1C02) {
    startPos += 8 + 64;
  } else if (target_type == HERCULES_TARGET_TYPE_H3) {
    startPos += 8 + 64;
  } else if (target_type == HERCULES_TARGET_TYPE_P0) {
    startPos += 8 + 64;
  } else {
    startPos += 0;
  }

  return startPos;
}

function initButton() {
  buttonConnectDevice.addEventListener("click", async () => {
    if (dapPort) {
      performDisconnect();
    } else {
      try {
        await performConnection();
      } catch (error) {
        console.log("Connection error: " + error);
        setConnectedUI('disconnected');
      }
    }
  });

  buttonChipProbe.addEventListener("click", async () => {
    dapTaskProbeChip(dapPort);
  });

  buttonSelectFileFlash.addEventListener("change", async () => {
    selectFileFlashWrite = null;
    buttonDownloadFlash.disabled = true;

    if (buttonSelectFileFlash.files.length > 0) {
      let file = buttonSelectFileFlash.files[0];
      let reader = new FileReader();
      reader.onload = function () {
        if (reader.result) {
          var startPos = getFlashWriteStartPos(reader.result, file.name.split('.').pop().toLowerCase(), dapHerculesCommon.getUint8(6), inputAutoAcfFlash.checked);
          selectFileFlashWrite = reader.result.slice(startPos);
          console.log('Load new flash write file');
          if (checkCommonFlashValid()) {
            buttonDownloadFlash.disabled = false;
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  });
  
  buttonDownloadFlash.addEventListener("click", async () => {
    dapTaskFlashWrite(dapPort, selectFileFlashWrite);
  });
  
  buttonReadFlash.addEventListener("click", async () => {
    let capacity = parseInt(inputFlashCapacity.value);
    if ((isNaN(parseInt(capacity)) == false) && (capacity != 0)) {
      dapTaskFlashRead(dapPort, capacity * 1024);
    }
  });

  buttonSelectFileChip.addEventListener("change", async () => {
    selectFileChipWrite = null;
    buttonDownloadChip.disabled = true;

    if (buttonSelectFileChip.files.length > 0) {
      let file = buttonSelectFileChip.files[0];
      let reader = new FileReader();
      reader.onload = function () {
        if (reader.result) {
          var startPos = getChipWriteStartPos(reader.result, file.name.split('.').pop().toLowerCase(), dapHerculesCommon.getUint8(6), inputAutoAcfChip.checked);
          selectFileChipWrite = reader.result.slice(startPos);
          console.log(reader.result);
          console.log(selectFileChipWrite);
          console.log('Load new chip write file');
          if (checkCommonChipValid()) {
            buttonDownloadChip.disabled = false;
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  });

  buttonDownloadChip.addEventListener("click", async () => {
    dapTaskChipWrite(dapPort, selectFileChipWrite);
  });
}

