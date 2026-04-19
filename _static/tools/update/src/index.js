let buttonConnectDevice = document.getElementById("connect-device");
let inputHwVersion = document.getElementById("hwVersionShow");
let inputSwVersion = document.getElementById("swVersionShow");

let buttonSelectFile = document.getElementById("select-file");
let inputAutoReset = document.getElementById("auto-reset");
let buttonDownload = document.getElementById("download");
let processDownload = document.getElementById("download-process");

const BOOTLOADER_CMD_NOT_SUPPORT = 0x0000;
const BOOTLOADER_CMD_PING = 0x0001;
const BOOTLOADER_CMD_RESET = 0x0002;
const BOOTLOADER_CMD_DOWNLOAD_512 = 0x0100;
const BOOTLOADER_CMD_UPLOAD_512 = 0x0201;
const BOOTLOADER_CMD_SET_CONFIG = 0x0300;
const BOOTLOADER_CMD_GET_CONFIG = 0x0301;

let hidDevice = null;
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

(async () => {
  initButton();
})();

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

      //var array = new Uint8Array(8 + 2 + 4 + data_len);
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
      taskTypePending =2;
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

function initButton() {
  buttonConnectDevice.addEventListener("click", async () => {
    let devices;
    try {
      devices = await navigator.hid.requestDevice({
        filters: [
          // Vllink Basic
          {
            vendorId: 0x1209,
            productId: 0x2301,
            usage: 0x01,
            usagePage: 0x0002
          },
          // Vllink Basic2
          {
            vendorId: 0x1209,
            productId: 0x2312,
            usage: 0x01,
            usagePage: 0x0002
          },
          // Vllink 2X
          {
            vendorId: 0x1209,
            productId: 0x2512,
            usage: 0x01,
            usagePage: 0xff00
          },
          // Vllink HME
          {
            vendorId: 0x1209,
            productId: 0x2303,
            usage: 0x01,
            usagePage: 0x0002
          },
          // Vllink FPGA
          {
            vendorId: 0x1209,
            productId: 0x2308,
            usage: 0x01,
            usagePage: 0x0002
          },
          // Vllink Box
          {
            vendorId: 0x1209,
            productId: 0x2501,
            usage: 0x01,
            usagePage: 0x0002
          },
          // Vllink Module
          {
            vendorId: 0x1209,
            productId: 0x2504,
            usage: 0x01,
            usagePage: 0x0002
          },
        ]
      });

      hidDevice = devices[0];

      hidHwVersion = null;
      hidSwVersion = null;

      if (hidDevice) {
        inputHwVersion.value = "";
        inputSwVersion.value = "";

        taskType = 0;
        taskPosTx = 0;
        taskPosRx = 0;

        if (!hidDevice.opened) {
          hidDevice.open();
        }
        if ((hidDevice.vendorId == 0x1209) && (hidDevice.productId >= 0x2512)) {
          pkt_length = 1024;
        }
        console.log("pkt_length: " + pkt_length);
        hidDevice.oninputreport = (event) => inputReportHandler(event);
      } else {
        inputHwVersion.value = "Unconnected";
        inputSwVersion.value = "Unconnected";
      }

      console.log(hidDevice);

      inputAutoReset.disabled = false;
      if (hidDevice != null && selectFile != null) {
        buttonDownload.disabled = false;
      } else {
        buttonDownload.disabled = true;
      }

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
    } catch (e) {
      console.log("buttonConnectDevice onClick error" + e);
    }
  });

  buttonSelectFile.addEventListener("change", async () => {
    selectFile = null;
    buttonDownload.disabled = true;

    if (buttonSelectFile.files.length > 0) {
      let file = buttonSelectFile.files[0];
      let reader = new FileReader();
      reader.onload = function () {
        selectFile = reader.result.slice(0);
        buttonDownload.disabled = false;
      };
      reader.readAsArrayBuffer(file);
    }
  });

  buttonDownload.addEventListener("click", async () => {
    taskFirmwareUpdate(hidDevice, selectFile);
  });
}
