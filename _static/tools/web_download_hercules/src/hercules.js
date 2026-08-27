const VENDOR_ID_HERCULES = 0x90;

const HERCULES_SUBCMD_GET_INFO = 0x0;
const HERCULES_SUBCMD_PROBE_CHIP = 0x10;
const HERCULES_SUBCMD_CHIP_WRITE = 0x20;
const HERCULES_SUBCMD_FLASH_WRITE = 0x30;
const HERCULES_SUBCMD_FLASH_READ = 0x31;
const HERCULES_SUBCMD_FLASH_VERIFY = 0x32;

const HERCULES_TARGET_TYPE_M5 = 0;
const HERCULES_TARGET_TYPE_M7 = 1;
const HERCULES_TARGET_TYPE_HR02 = 2;
const HERCULES_TARGET_TYPE_HR03 = 3;
const HERCULES_TARGET_TYPE_P1 = 4;
const HERCULES_TARGET_TYPE_H1D03 = 5;
const HERCULES_TARGET_TYPE_H1C02 = 6;
const HERCULES_TARGET_TYPE_H3 = 7;
const HERCULES_TARGET_TYPE_P0 = 8;
const HERCULES_TARGET_TYPE_P2 = 9;
const HERCULES_TARGET_TYPE_P3 = 10;
const HERCULES_TARGET_TYPE_H3P = 11;
const HERCULES_TARGET_TYPE_EX1 = 12;
const HERCULES_TARGET_TYPE_UNKNOWN = 255;

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

function hercules_cmd_flash_write(common, target_bin, op_mask, full_length, addr, data_pos, data_len) {
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

    var data = target_bin.slice(data_pos, data_pos + data_len);
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

