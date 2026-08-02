#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hercules Program CLI —— 量产自动化烧录工具 (Python 移植版)
=========================================================
完全兼容网页版 (web_program_hercules) 导出的 config.json，
一条命令完成: 连接 Vllink → 触发检测 → 自动烧录/校验 → 状态输出 → 统计报表。
逻辑为 src/engine.js + src/hercules.js + src/dapv2.js 的忠实移植。

用法:
    python3 hercules_program.py                    # 使用当前目录 config.json
    python3 hercules_program.py -c cfg.json        # 指定配置文件
    python3 hercules_program.py --list             # 列出 USB 上的 Vllink 设备
    python3 hercules_program.py -c cfg.json --once         # 烧录 1 片后退出
    python3 hercules_program.py -c cfg.json --count 100    # 烧录 100 片后退出
    python3 hercules_program.py -c cfg.json --trigger auto-timer --interval 2
    python3 hercules_program.py -c cfg.json --csv report.csv   # 输出 CSV 报表

依赖: pip install pyusb    (Linux: apt install libusb-1.0-0)
udev 规则 (Linux 非 root 使用 Vllink 必须):
    SUBSYSTEM=="usb", ATTR{idVendor}=="1209", ATTR{idProduct}=="6666", MODE="0666", GROUP="plugdev"
    SUBSYSTEM=="usb", ATTR{idVendor}=="0d28", ATTR{idProduct}=="0204", MODE="0666", GROUP="plugdev"
"""

import argparse
import json
import os
import signal
import struct
import sys
import time

try:
    import usb.core
    import usb.util
    from usb.core import USBTimeoutError
except ImportError:
    print("缺少 pyusb 依赖: pip install pyusb  (Linux 还需: apt install libusb-1.0-0)",
          file=sys.stderr)
    sys.exit(1)

# ============================================================
# 协议常量 (移植自 hercules.js)
# ============================================================
VENDOR_ID_HERCULES = 0x90

HERCULES_SUBCMD_GET_INFO       = 0x0
HERCULES_SUBCMD_TAKEOVER_TXD_RXD = 0x2
HERCULES_SUBCMD_RELEASE_TXD_RXD = 0x3
HERCULES_SUBCMD_GET_STATUS     = 0x4
HERCULES_SUBCMD_OUTPUT_TXD_SRST = 0x5
HERCULES_SUBCMD_PROBE_CHIP     = 0x10
HERCULES_SUBCMD_CHIP_WRITE     = 0x20
HERCULES_SUBCMD_FLASH_WRITE    = 0x30
HERCULES_SUBCMD_FLASH_READ     = 0x31
HERCULES_SUBCMD_FLASH_VERIFY   = 0x32

HERCULES_OP_READ        = 0x1
HERCULES_OP_ERASE       = 0x2
HERCULES_OP_WRITE       = 0x4
HERCULES_OP_VERIFY      = 0x8
HERCULES_OP_WRITEQUICK  = 0x10
HERCULES_OP_DUMP        = 0x20
HERCULES_OP_AUTORESET   = 0x40

HERCULES_SUBCMD_RESP_OK             = 0
HERCULES_SUBCMD_RESP_NOT_SUPPORT    = 1
HERCULES_SUBCMD_RESP_INVALID_COMMON = 2
HERCULES_SUBCMD_RESP_INVALID_HEAD   = 3
HERCULES_SUBCMD_RESP_VERIFY_FAIL    = 4
HERCULES_SUBCMD_RESP_FAIL           = 5

# Vllink / CMSIS-DAP 设备 VID:PID
DEVICE_FILTERS = [(0x1209, 0x6666), (0x0d28, 0x0204)]

# CMSIS-DAP v2 bulk 端点
EP_OUT = 0x01
EP_IN  = 0x81

FLASH_BLOCK = 256          # 每块烧写字节数
TRIGGER_POLL_MS = 100      # 触发轮询周期
STABLE_FRAMES = 3          # 边沿触发稳定基线帧数


class HerculesError(Exception):
    """协议/设备错误"""


# ============================================================
# 命令构建 (移植自 hercules.js)
# ============================================================
def _u32(n):
    return struct.pack('<I', n & 0xFFFFFFFF)


def _u32_from(buf, off):
    return struct.unpack_from('<I', buf, off)[0]


def _i32_from(buf, off):
    return struct.unpack_from('<i', buf, off)[0]


def cmd_get_info():
    return bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_GET_INFO])


def cmd_probe_chip():
    return bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_PROBE_CHIP])


def cmd_takeover_txd_rxd():
    return bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_TAKEOVER_TXD_RXD])


def cmd_release_txd_rxd():
    return bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_RELEASE_TXD_RXD])


def cmd_get_status():
    return bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_GET_STATUS])


def cmd_output_txd_srst(txd, srst):
    return bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_OUTPUT_TXD_SRST,
                  1 if txd else 0, 1 if srst else 0])


def cmd_flash_write(common, data, op_mask, full_length, addr, data_pos, data_len, slice_pos):
    """multi-file 虚拟文件: addr=绝对地址, data_pos=相对头部偏移, slice_pos=文件内切片偏移"""
    start = data_pos if slice_pos is None else slice_pos
    payload = data[start:start + data_len]
    return (bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_FLASH_WRITE])
            + common
            + _u32(op_mask) + _u32(full_length) + _u32(addr)
            + _u32(data_pos) + _u32(data_len)
            + payload)


def cmd_flash_read(common, op_mask, full_length, addr, data_pos, data_len):
    return (bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_FLASH_READ])
            + common
            + _u32(op_mask) + _u32(full_length) + _u32(addr)
            + _u32(data_pos) + _u32(data_len))


def cmd_flash_verify(common, data, op_mask, full_length, addr, data_pos, data_len):
    payload = data[data_pos:data_pos + data_len]
    return (bytes([VENDOR_ID_HERCULES, HERCULES_SUBCMD_FLASH_VERIFY])
            + common
            + _u32(op_mask) + _u32(full_length) + _u32(addr)
            + _u32(data_pos) + _u32(data_len)
            + payload)


def resp_ok(resp):
    """响应头: [0]=0x90 [1]=subcmd [2]=cmdSts [3]=subSts; subSts==0 为 OK"""
    return resp is not None and len(resp) >= 4 and resp[3] == HERCULES_SUBCMD_RESP_OK


# ============================================================
# Vllink 传输层 (移植自 dapv2.js)
# ============================================================
class Vllink:
    def __init__(self, cmd_timeout_ms=3000):
        self.dev = None
        self.cmd_timeout_ms = cmd_timeout_ms
        # 芯片/设备信息
        self.version = 0
        self.chip_supported_num = 0
        self.common = None          # 12 字节 probe 公共头 (bytes)
        self.capacity = 0

    # ---- 设备查找 / 连接 ----
    @staticmethod
    def find_device():
        for vid, pid in DEVICE_FILTERS:
            dev = usb.core.find(idVendor=vid, idProduct=pid)
            if dev is not None:
                return dev
        return None

    @classmethod
    def list_devices(cls):
        out = []
        for vid, pid in DEVICE_FILTERS:
            for dev in usb.core.find(find_all=True, idVendor=vid, idProduct=pid):
                name = getattr(dev, 'product', None) or 'unknown'
                out.append((vid, pid, name, dev.bus, dev.address))
        return out

    def connect(self):
        self.dev = self.find_device()
        if self.dev is None:
            raise HerculesError(
                "未找到 Vllink 设备 (VID 0x1209:0x6666 / 0x0d28:0x0204)。\n"
                "  请检查: ① USB 已连接 ② 已配置 udev 规则并重插 ③ 浏览器/其他程序未占用")
        try:
            if self.dev.is_kernel_driver_active(0):
                self.dev.detach_kernel_driver(0)
        except (usb.core.USBError, NotImplementedError):
            pass
        try:
            self.dev.set_configuration()
        except usb.core.USBError:
            pass  # 配置已设置
        usb.util.claim_interface(self.dev, 0)
        try:
            self.dev.set_interface_altsetting(0, 0)
        except usb.core.USBError:
            pass

    def close(self):
        if self.dev is not None:
            try:
                usb.util.dispose_resources(self.dev)
            except Exception:
                pass
            self.dev = None

    # ---- 请求层 (命令级超时) ----
    def send(self, data):
        try:
            self.dev.write(EP_OUT, data, timeout=self.cmd_timeout_ms)
        except usb.core.USBError as e:
            raise HerculesError("发送失败 (USB 错误: %s)" % e)

    def read(self, length=512):
        try:
            return self.dev.read(EP_IN, length, timeout=self.cmd_timeout_ms).tobytes()
        except USBTimeoutError:
            raise HerculesError("命令超时 (%dms)" % self.cmd_timeout_ms)
        except usb.core.USBError as e:
            raise HerculesError("读取失败 (USB 错误: %s)" % e)

    def request(self, cmd):
        self.send(cmd)
        return self.read()

    # ---- 基础命令 ----
    def get_info(self):
        resp = self.request(cmd_get_info())
        if not resp_ok(resp):
            raise HerculesError('GET_INFO failed')
        self.version = _u32_from(resp, 4)
        self.chip_supported_num = _u32_from(resp, 8)
        return self.version

    def get_status(self):
        resp = self.request(cmd_get_status())
        if not resp_ok(resp):
            raise HerculesError('GET_STATUS failed')
        return {
            'vref_mv':    _i32_from(resp, 4),
            'vref_valid': resp[8] != 0,
            'rxd_logic':  resp[9] != 0,
            'key_mode':   resp[10] != 0,
        }

    def takeover(self):
        resp = self.request(cmd_takeover_txd_rxd())
        if not resp_ok(resp):
            raise HerculesError('TAKEOVER failed')

    def release(self):
        if self.dev is None:
            return
        try:
            resp = self.request(cmd_release_txd_rxd())
            if not resp_ok(resp):
                log('RELEASE 响应异常')
        except Exception as e:
            log('RELEASE: %s' % e)

    def probe_chip(self):
        resp = self.request(cmd_probe_chip())
        if not resp_ok(resp):
            raise HerculesError('Probe resp: %d' % (resp[3] if resp and len(resp) > 3 else 'timeout'))
        if len(resp) < 16:
            raise HerculesError('Probe resp 长度不足')
        self.common = resp[4:16]                       # 12 字节公共头
        attach_ms = _u32_from(resp, 4)
        khz = struct.unpack_from('<H', resp, 8)[0]
        target_type = resp[10]
        self.capacity = _u32_from(resp, 12)
        if not attach_ms or not khz or target_type >= self.chip_supported_num:
            raise HerculesError('Chip not supported (type=%d)' % target_type)
        log('探测: 芯片容量 %dB, %dkHz' % (self.capacity, khz))


# ============================================================
# 文件 / 配置处理 (移植自 app.js collectCfg/prepareFiles 对应逻辑)
# ============================================================
def get_flash_write_start_pos(file_data, cut_acf, is_acf):
    """ACF 注释头裁剪: 返回数据起始偏移"""
    if not cut_acf or not is_acf:
        return 0
    start = 0
    n = len(file_data)
    while start + 2 <= n and struct.unpack_from('<H', file_data, start)[0] == 0x2f2f:
        start += 2
        while start < n and file_data[start] != 0x0a:
            start += 1
        start += 1
    return start


def load_config(path):
    """读取网页版导出的 config.json, 按文件名从同目录加载固件, 应用 ACF 裁剪"""
    with open(path, 'r', encoding='utf-8-sig') as fh:
        cfg = json.load(fh)
    cfg_dir = os.path.dirname(os.path.abspath(path))

    opts = cfg.setdefault('options', {})
    opts.setdefault('autoErase', True)
    opts.setdefault('autoVerify', True)
    opts.setdefault('autoRun', False)
    opts.setdefault('retryCount', 2)
    opts.setdefault('cmdTimeoutMs', 3000)
    opts.setdefault('speedKHz', 48000)

    trig = cfg.setdefault('trigger', {})
    trig.setdefault('mode', 'vref-rising')
    trig.setdefault('autoInterval', 2)

    sout = cfg.setdefault('statusOut', {})
    sout.setdefault('enable', False)
    sout.setdefault('passAction', 'none')
    sout.setdefault('failAction', 'none')

    files = []
    for f in cfg.get('files', []):
        name = f.get('name') or ''
        addr = int(f.get('addr') or 0)
        cut = f.get('cutAcf', True)
        fpath = os.path.join(cfg_dir, name)
        if not os.path.isfile(fpath):
            raise HerculesError('固件文件未找到: %s (配置目录: %s)' % (name, cfg_dir))
        with open(fpath, 'rb') as fh:
            raw = fh.read()
        start = get_flash_write_start_pos(raw, cut, name.lower().endswith('.acf'))
        data = raw[start:]
        files.append({'name': name, 'addr': addr, 'cutAcf': cut, 'data': data})
    cfg['files'] = files
    return cfg


def validate_files(files):
    """地址 0x100 对齐 + 占用区间重叠检测 (移植 app.js findOverlaps)"""
    if not files:
        raise HerculesError('文件表为空, 无可烧录固件')
    for f in files:
        if f['addr'] % 0x100 != 0:
            raise HerculesError('「%s」烧录地址 0x%x 未按 0x100 对齐' % (f['name'], f['addr']))
        if not f['data']:
            raise HerculesError('「%s」固件数据为空' % f['name'])
    ranges = []
    for f in files:
        is_acf = f['name'].lower().endswith('.acf')
        start = get_flash_write_start_pos(f['data'], f['cutAcf'] and is_acf, is_acf)
        # 注意: data 已裁剪, 实际占用端 = addr + len(data)
        ranges.append((f['name'], f['addr'], f['addr'] + len(f['data'])))
    for i in range(len(ranges)):
        for j in range(i + 1, len(ranges)):
            a, b = ranges[i], ranges[j]
            if a[1] < b[2] and b[1] < a[2]:
                raise HerculesError('文件「%s」与「%s」占用空间重叠' % (a[0], b[0]))


# ============================================================
# 量产引擎 (移植自 engine.js MassProduceEngine)
# ============================================================
class MassProduceEngine:
    def __init__(self, cfg, count=None, interval=None):
        self.cfg = cfg
        self.vl = Vllink(cfg['options'].get('cmdTimeoutMs', 3000))
        self.running = False
        self.stats = {'burn': 0, 'pass': 0, 'fail': 0, 'retryFail': 0}
        self.chip_records = []
        self._trigger_prev = None
        self._auto_first = True
        self._manual_go = False
        self._auto_manual = count is not None      # --once/--count 时手动触发自动放行
        self._count = count                        # 目标烧录片数 (None=不限)
        self._out_txd = 0
        self._out_srst = 0
        self._base_addr = 0
        self._full_length = 0

    # ---- 状态输出电平 (移植 engine.js _signalBusyLevels 等) ----
    def output_txd_srst(self, t, s):
        if t is None:
            t = self._out_txd
        if s is None:
            s = self._out_srst
        self._out_txd = 1 if t else 0
        self._out_srst = 1 if s else 0
        resp = self.vl.request(cmd_output_txd_srst(self._out_txd, self._out_srst))
        if not resp_ok(resp):
            raise HerculesError('OUTPUT_TXD_SRST failed')

    def _signal_busy_levels(self):
        p = self.cfg['statusOut'].get('passAction')
        f = self.cfg['statusOut'].get('failAction')
        t = s = None
        if p == 'pass_txd_rise':
            t = 0
        elif p == 'pass_txd_fall':
            t = 1
        if f == 'fail_srst_rise':
            s = 0
        elif f == 'fail_srst_fall':
            s = 1
        if t is None and s is None:
            return
        self.output_txd_srst(t, s)

    def signal_ready(self):
        if self.cfg['statusOut'].get('enable'):
            self._signal_busy_levels()

    def signal_busy(self):
        if self.cfg['statusOut'].get('enable'):
            self._signal_busy_levels()

    def signal_pass(self):
        if not self.cfg['statusOut'].get('enable'):
            return
        a = self.cfg['statusOut'].get('passAction')
        t = 1 if a == 'pass_txd_rise' else 0 if a == 'pass_txd_fall' else None
        if t is None:
            return
        self.output_txd_srst(t, None)

    def signal_fail(self):
        if not self.cfg['statusOut'].get('enable'):
            return
        a = self.cfg['statusOut'].get('failAction')
        s = 1 if a == 'fail_srst_rise' else 0 if a == 'fail_srst_fall' else None
        if s is None:
            return
        self.output_txd_srst(None, s)

    # ---- 烧写 (移植 engine.js sendFlashWriteBlock / burnFile) ----
    def send_flash_write_block(self, f, data, pos):
        data_len = min(FLASH_BLOCK, len(data) - pos)
        op_mask = HERCULES_OP_WRITE | HERCULES_OP_ERASE | HERCULES_OP_VERIFY  # 量产强制
        if self.cfg['options'].get('autoRun'):
            op_mask |= HERCULES_OP_AUTORESET
        cmd = cmd_flash_write(self.vl.common, data, op_mask,
                              self._full_length, self._base_addr,
                              f['addr'] + pos - self._base_addr, data_len, pos)
        resp = self.vl.request(cmd)
        if not resp_ok(resp):
            code = resp[3]
            detail = ('INVALID_COMMON(common不匹配, 需重新探测)'
                      if code == HERCULES_SUBCMD_RESP_INVALID_COMMON
                      else 'VERIFY_FAIL' if code == HERCULES_SUBCMD_RESP_VERIFY_FAIL
                      else 'FAIL' if code == HERCULES_SUBCMD_RESP_FAIL
                      else 'code=%d' % code)
            raise HerculesError('块失败 @0x%x %s' % (pos, detail))
        done = _u32_from(resp, 4)
        return done if done > 0 else data_len

    def burn_file(self, f, data, base_bytes):
        retry_count = self.cfg['options'].get('retryCount', 2)
        file_retry = 0
        while True:
            ok = True
            pos = 0
            block_retry = 0
            while pos < len(data):
                try:
                    pos += self.send_flash_write_block(f, data, pos)
                    block_retry = 0
                    self._progress = base_bytes + pos
                except HerculesError as e:
                    block_retry += 1
                    self.stats['retryFail'] += 1
                    log('  [%s] 块重试 #%d @0x%x: %s' % (f['name'], block_retry, pos, e))
                    if block_retry > retry_count:
                        ok = False
                        break
            if ok:
                log('  [%s] 写入完成 %dB' % (f['name'], len(data)))
                return
            file_retry += 1
            self.stats['retryFail'] += 1
            log('  [%s] 整文件回退 #%d' % (f['name'], file_retry))
            if file_retry > retry_count:
                raise HerculesError('文件 %s 重试耗尽' % f['name'])
            self.vl.probe_chip()   # 回退前重新探测

    # ---- 触发检测 (移植 engine.js waitTrigger, 5 种模式) ----
    def _sleep_steps(self, ms):
        steps = max(1, int(ms / TRIGGER_POLL_MS))
        for _ in range(steps):
            if not self.running:
                return
            time.sleep(TRIGGER_POLL_MS / 1000.0)

    def wait_trigger(self):
        mode = self.cfg['trigger'].get('mode')
        if mode == 'manual':
            if self._auto_manual:
                self._manual_go = True
                return
            try:
                input('按回车烧录下一片 (Ctrl+C 退出)...')
            except (EOFError, KeyboardInterrupt):
                self.running = False
            return
        if mode == 'auto-timer':
            if self._auto_first:
                self._auto_first = False
                return
            ms = float(self.cfg['trigger'].get('autoInterval', 2)) * 1000
            log('⏳ 间隔触发: %.2fs 后自动烧录下一片' % (ms / 1000))
            self._sleep_steps(ms)
            return
        # 边沿检测: 先建立稳定基线 (连续 3 帧一致)
        prev = None
        stable = 0
        while self.running:
            try:
                s = self.vl.get_status()
            except Exception:
                time.sleep(TRIGGER_POLL_MS / 1000.0)
                continue
            cur = (s['key_mode'], s['rxd_logic'], s['vref_valid'])
            if prev is None:
                prev = cur
                stable = 1
            elif prev == cur:
                stable += 1
                if stable >= STABLE_FRAMES:
                    break
            else:
                prev = cur
                stable = 1
            time.sleep(TRIGGER_POLL_MS / 1000.0)
        if not self.running:
            return
        # 边沿检测
        while self.running:
            try:
                s = self.vl.get_status()
            except Exception as e:
                log('GET_STATUS 轮询失败(重试): %s' % e)
                time.sleep(TRIGGER_POLL_MS / 1000.0)
                continue
            if mode == 'vref-rising':
                if prev[2] is False and s['vref_valid'] is True:
                    return
            elif mode == 'key-rising':
                if prev[0] is False and s['key_mode'] is True:
                    return
            elif mode == 'rxd-rising':
                if prev[1] is False and s['rxd_logic'] is True:
                    return
            elif mode == 'rxd-falling':
                if prev[1] is True and s['rxd_logic'] is False:
                    return
            prev = (s['key_mode'], s['rxd_logic'], s['vref_valid'])
            time.sleep(TRIGGER_POLL_MS / 1000.0)

    # ---- 量产主循环 (移植 engine.js run) ----
    def run(self):
        self.running = True
        self.stats = {'burn': 0, 'pass': 0, 'fail': 0, 'retryFail': 0}
        self.chip_records = []
        self._trigger_prev = None
        self._auto_first = True
        self._progress = 0
        total_bytes = sum(len(f['data']) for f in self.cfg['files'])
        try:
            if self.cfg['statusOut'].get('enable'):
                self.vl.takeover()
            self.signal_ready()
            files = sorted(self.cfg['files'], key=lambda f: f['addr'])
            self._base_addr = files[0]['addr']
            max_offset = max(f['addr'] + len(f['data']) for f in files)
            self._full_length = max_offset - self._base_addr
            log('虚拟文件: 基地址 0x%x full_length=0x%x (最大偏移 0x%x), 共 %d 个数据块区' %
                (self._base_addr, self._full_length, max_offset, len(files)))
            while self.running:
                if self._count is not None and self.stats['burn'] >= self._count:
                    log('已达目标片数 %d, 停止' % self._count)
                    break
                self.wait_trigger()
                if not self.running:
                    break
                self.signal_busy()
                self.stats['burn'] += 1
                log('==== 开始烧写第 %d 片 ====' % self.stats['burn'])
                try:
                    self.vl.probe_chip()
                    self._check_capacity(files)
                    self._progress = 0
                    base = 0
                    for f in files:
                        self.burn_file(f, f['data'], base)
                        base += len(f['data'])
                    self.stats['pass'] += 1
                    self.signal_pass()
                    log('✅ 第 %d 片成功' % self.stats['burn'])
                    self._record(True, '第 %d 片成功' % self.stats['burn'])
                except Exception as e:
                    self.stats['fail'] += 1
                    try:
                        self.signal_fail()
                    except Exception:
                        pass
                    log('❌ 第 %d 片失败: %s' % (self.stats['burn'], e))
                    self._record(False, '第 %d 片失败: %s' % (self.stats['burn'], e))
        except KeyboardInterrupt:
            log('收到中断, 停止量产')
        except Exception as e:
            log('量产异常终止: %s' % e)
        finally:
            if self.cfg['statusOut'].get('enable'):
                try:
                    self.vl.release()
                except Exception:
                    pass
            self.running = False
            self.vl.close()

    def _check_capacity(self, files):
        max_end = max(f['addr'] + len(f['data']) for f in files)
        if max_end > self.vl.capacity:
            raise HerculesError('容量不足: 需要 %dB, 芯片仅 %dB' % (max_end, self.vl.capacity))

    def _record(self, ok, msg):
        rec = {'t': time.strftime('%Y-%m-%d %H:%M:%S'), 'ok': ok, 'msg': msg}
        self.chip_records.append(rec)
        if len(self.chip_records) > 100000:
            del self.chip_records[:len(self.chip_records) - 100000]


# ============================================================
# 日志 / 报表
# ============================================================
def log(msg):
    print('[%s] %s' % (time.strftime('%H:%M:%S'), msg), flush=True)


def write_csv(path, stats, records):
    import csv
    with open(path, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh)
        w.writerow(['生产报表', 'hercules_program (python)'])
        w.writerow(['导出时间', time.strftime('%Y-%m-%d %H:%M:%S')])
        w.writerow(['总烧录(不含重试)', stats['burn']])
        w.writerow(['成功(不含重试)', stats['pass']])
        w.writerow(['失败(不含重试)', stats['fail']])
        w.writerow(['含重试失败次数', stats['retryFail']])
        w.writerow([])
        w.writerow(['=== 逐片明细 ==='])
        w.writerow(['序号', '时间', '结果', '详情'])
        for i, r in enumerate(records):
            w.writerow([i + 1, r['t'], 'PASS' if r['ok'] else 'FAIL', r['msg']])
    log('CSV 报表已写入: %s' % path)


# ============================================================
# 命令行入口
# ============================================================
def parse_args():
    p = argparse.ArgumentParser(
        description='Hercules Program 量产烧录 CLI (兼容网页版 config.json)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='触发方式 (config.json trigger.mode): manual / auto-timer / key-rising / '
               'rxd-rising / rxd-falling / vref-rising')
    p.add_argument('config', nargs='?', default='config.json', help='网页版导出的配置文件 (默认 config.json)')
    p.add_argument('-c', '--config-file', dest='config_file', help='配置文件 (等同位置参数)')
    p.add_argument('--list', action='store_true', help='列出 USB 上的 Vllink 设备后退出')
    p.add_argument('--once', action='store_true', help='只烧录 1 片后退出')
    p.add_argument('--count', type=int, metavar='N', help='烧录 N 片后退出')
    p.add_argument('--trigger', choices=['manual', 'auto-timer', 'key-rising',
                                         'rxd-rising', 'rxd-falling', 'vref-rising'],
                   help='覆盖触发方式')
    p.add_argument('--interval', type=float, metavar='S', help='覆盖间隔触发秒数')
    p.add_argument('--retry', type=int, metavar='N', help='覆盖重试次数')
    p.add_argument('--no-status', action='store_true', help='禁用状态输出 (TXD/SRST)')
    p.add_argument('--csv', metavar='FILE', help='量产结束后输出 CSV 报表')
    return p.parse_args()


def main():
    args = parse_args()
    if args.list:
        devs = Vllink.list_devices()
        if not devs:
            print('未找到 Vllink 设备')
            return 1
        for vid, pid, name, bus, addr in devs:
            print('VID=%04x PID=%04x  %s  (bus %d, addr %d)' % (vid, pid, name, bus, addr))
        return 0

    cfg_path = args.config_file or args.config
    if not os.path.isfile(cfg_path):
        print('配置文件不存在: %s' % cfg_path, file=sys.stderr)
        print('请在网页版点「💾 导出配置」生成 config.json 后, 放到本工具同目录。', file=sys.stderr)
        return 1

    cfg = load_config(cfg_path)
    validate_files(cfg['files'])

    if args.trigger:
        cfg['trigger']['mode'] = args.trigger
    if args.interval is not None:
        cfg['trigger']['autoInterval'] = args.interval
    if args.retry is not None:
        cfg['options']['retryCount'] = args.retry
    if args.no_status:
        cfg['statusOut']['enable'] = False

    count = 1 if args.once else args.count

    trig = cfg['trigger']['mode']
    log('======== 量产开始 ======== (触发=%s 成功=%s 失败=%s 间隔=%ss)' % (
        trig, cfg['statusOut'].get('passAction'), cfg['statusOut'].get('failAction'),
        cfg['trigger'].get('autoInterval')))
    log('固件: ' + ', '.join('%s@0x%x (%dB)' % (f['name'], f['addr'], len(f['data']))
                             for f in cfg['files']))
    if count is not None:
        log('目标片数: %d' % count)

    eng = MassProduceEngine(cfg, count=count)

    def on_sigint(sig, frame):
        eng.running = False
    signal.signal(signal.SIGINT, on_sigint)

    try:
        log('连接 Vllink ...')
        eng.vl.connect()
        try:
            ver = eng.vl.get_info()
            log('GET_INFO OK, version=0x%x' % ver)
        except HerculesError as e:
            log('GET_INFO 失败: %s' % e)
        eng.run()
    except HerculesError as e:
        log('连接异常: %s' % e)
        try:
            eng.vl.close()
        except Exception:
            pass
        return 1

    print()
    log('====== 量产结束 ====== 总烧录=%d 成功=%d 失败=%d 含重试失败=%d' % (
        eng.stats['burn'], eng.stats['pass'], eng.stats['fail'], eng.stats['retryFail']))
    if args.csv:
        write_csv(args.csv, eng.stats, eng.chip_records)
    return 0 if eng.stats['fail'] == 0 else 2


if __name__ == '__main__':
    sys.exit(main())
