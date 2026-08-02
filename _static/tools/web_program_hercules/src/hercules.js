const VENDOR_ID_HERCULES = 0x90;

const HERCULES_SUBCMD_GET_INFO = 0x0;
const HERCULES_SUBCMD_TAKEOVER_TXD_RXD = 0x2;
const HERCULES_SUBCMD_RELEASE_TXD_RXD  = 0x3;
const HERCULES_SUBCMD_GET_STATUS       = 0x4;
const HERCULES_SUBCMD_OUTPUT_TXD_SRST  = 0x5;
const HERCULES_SUBCMD_PROBE_CHIP = 0x10;
const HERCULES_SUBCMD_CHIP_WRITE = 0x20;
const HERCULES_SUBCMD_FLASH_WRITE = 0x30;
const HERCULES_SUBCMD_FLASH_READ = 0x31;
const HERCULES_SUBCMD_FLASH_VERIFY = 0x32;

const HERCULES_TARGET_TYPE_M5 = 0;
const HERCULES_TARGET_TYPE_M7 = 1;
const HERCULES_TARGET_TYPE_HR02 = 2;
const HERCULES_TARGET_TYPE_HR03 = 3;
const HERCULES_TARGET_TYPE_H1D03 = 4;
const HERCULES_TARGET_TYPE_H1C02 = 5;
const HERCULES_TARGET_TYPE_P1 = 6;
const HERCULES_TARGET_TYPE_H3 = 7;
const HERCULES_TARGET_TYPE_P0 = 8;
const HERCULES_TARGET_TYPE_UNKNOWN = 9;

const HERCULES_OP_READ = 0x1;
const HERCULES_OP_ERASE = 0x2;
const HERCULES_OP_WRITE = 0x4;
const HERCULES_OP_VERIFY = 0x8;
const HERCULES_OP_WRITEQUICK = 0x10;
const HERCULES_OP_DUMP = 0x20;
const HERCULES_OP_AUTORESET = 0x40;

const HERCULES_SUBCMD_RESP_OK = 0;
const HERCULES_SUBCMD_RESP_NOT_SUPPORT = 1;
const HERCULES_SUBCMD_RESP_INVALID_COMMON = 2;
const HERCULES_SUBCMD_RESP_INVALID_HEAD = 3;
const HERCULES_SUBCMD_RESP_VERIFY_FAIL = 4;
const HERCULES_SUBCMD_RESP_FAIL = 5;

function hercules_cmd_get_info() {
    var array = new Uint8Array(2);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_GET_INFO;
    return array;
}

function hercules_cmd_probe_chip() {
    var array = new Uint8Array(2);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_PROBE_CHIP;
    return array;
}

function hercules_cmd_takeover_txd_rxd() {
    var array = new Uint8Array(2);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_TAKEOVER_TXD_RXD;
    return array;
}

function hercules_cmd_release_txd_rxd() {
    var array = new Uint8Array(2);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_RELEASE_TXD_RXD;
    return array;
}

function hercules_cmd_get_status() {
    var array = new Uint8Array(2);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_GET_STATUS;
    return array;
}

function hercules_cmd_output_txd_srst(txd_level, srst_level) {
    var array = new Uint8Array(4);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_OUTPUT_TXD_SRST;
    array[2] = txd_level ? 1 : 0;
    array[3] = srst_level ? 1 : 0;
    return array;
}

/* ============ ACF 注释头裁剪 (量产文件加载用) ============ */
function getFlashWriteStartPos(fileData, type, target_type, cutAcf) {
    var startPos = 0;
    // 仅当文件表勾选 Cut ACF 且文件为 .acf 时才裁剪注释头部
    if (cutAcf && type == 'acf') {
        var view = new DataView(fileData);
        while (view.getUint16(startPos, true) == 0x2f2f) {
            startPos += 2;
            while (view.getUint8(startPos) != 0x0a) {
                startPos += 1;
            }
            startPos += 1;
        }
    }
    return startPos;
}

function hercules_cmd_chip_write(common, target_bin, op_mask, full_length, data_pos, data_len) {
    var array = new Uint8Array(2 + 12 + 16 + data_len);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_CHIP_WRITE;

    array.set(new Uint8Array(common), 2);

    var cmd = new Uint32Array(4);
    cmd[0] = op_mask;
    cmd[1] = full_length;
    cmd[2] = data_pos;
    cmd[3] = data_len;
    array.set(new Uint8Array(cmd.buffer), 2 + 12);

    var data = target_bin.slice(data_pos, data_pos + data_len);
    array.set(new Uint8Array(data), 2 + 12 + 16);

    return array;
}

// slice_pos: 数据切片起始(文件内偏移). 多文件虚拟文件时命令 data_pos 为相对头部地址偏移(含文件地址),
// 与文件内偏移不同, 必须单独传入; 未传则向后兼容使用 data_pos (单文件场景两者相等)
function hercules_cmd_flash_write(common, target_bin, op_mask, full_length, addr, data_pos, data_len, slice_pos) {
    var array = new Uint8Array(2 + 12 + 20 + data_len);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_FLASH_WRITE;

    array.set(new Uint8Array(common), 2);

    var cmd = new Uint32Array(5);
    cmd[0] = op_mask;
    cmd[1] = full_length;
    cmd[2] = addr;
    cmd[3] = data_pos;
    cmd[4] = data_len;
    array.set(new Uint8Array(cmd.buffer), 2 + 12);

    var start = (slice_pos === undefined) ? data_pos : slice_pos;
    var data = target_bin.slice(start, start + data_len);
    array.set(new Uint8Array(data), 2 + 12 + 20);

    return array;
}

function hercules_cmd_flash_read(common, op_mask, full_length, addr, data_pos, data_len) {
    var array = new Uint8Array(2 + 12 + 20);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_FLASH_READ;

    array.set(new Uint8Array(common), 2);

    var cmd = new Uint32Array(5);
    cmd[0] = op_mask;
    cmd[1] = full_length;
    cmd[2] = addr;
    cmd[3] = data_pos;
    cmd[4] = data_len;
    array.set(new Uint8Array(cmd.buffer), 2 + 12);

    return array;
}

function hercules_cmd_flash_verify(common, target_bin, op_mask, full_length, addr, data_pos, data_len) {
    var array = new Uint8Array(2 + 12 + 20 + data_len);
    array[0] = VENDOR_ID_HERCULES;
    array[1] = HERCULES_SUBCMD_FLASH_VERIFY;

    array.set(new Uint8Array(common), 2);

    var cmd = new Uint32Array(5);
    cmd[0] = op_mask;
    cmd[1] = full_length;
    cmd[2] = addr;
    cmd[3] = data_pos;
    cmd[4] = data_len;
    array.set(new Uint8Array(cmd.buffer), 2 + 12);

    var data = target_bin.slice(data_pos, data_pos + data_len);
    array.set(new Uint8Array(data), 2 + 12 + 20);

    return array;
}

