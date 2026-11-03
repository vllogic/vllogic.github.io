# Agent-Skills

* 安装方法1：将本网页连接发给Agent，让其自己完成Skill的载入，Agent应当就skill是否全局应用询问用户
* 安装方法2：下载压缩包，解压到对应文件夹内

## 一、Vllink系列
### 1.1 目标电源掉电-恢复控制
* 使用Vllink调试器给目标板供电，让Agent能够控制供电的关闭和恢复
* 压缩包下载：[vllink-target-power.zip](../_static/tools/vllink-target-power.zip)
* 文件结构：
  ```
  vllink-target-power/
  ├── src/
  └── SKILL.md
  ```
* `SKILL.md`
  ```` markdown:SKILL.md
  ---
  name: VLLINK 目标电源跌落与恢复
  description: 通过 VLLINK/CMSIS-DAP 调试器，用 WebUSB 发送 DAP_PowerCycle (0x0F) 让目标板的 VREF / VOUT 5V 跌落再恢复，实现无人值守的硬复位。当目标无响应、调试口被锁死、nRESET 无法恢复，或自动化测试需要强制重新上电时使用。
  ---

  # 用 VLLINK 给目标板重新上电（DAP_PowerCycle）

  强制把目标板的电源拉低再恢复，让死机或调试口锁死的目标在无人干预的情况下恢复。

  本技能**只走 WebUSB**（接口 1，vendor request `0x10`/`0x11`）。不要用 HID，也不要用 bulk 接口 0。

  ## 何时使用

  - 目标固件跑飞、SWD/JTAG 被锁，`DAP_ResetTarget` 和 nRESET 都无效；
  - CI / 自动化流程需要无人值守的硬复位；
  - 需要确认目标**真的掉过电**（而不只是被按在复位里）。

  **不要**用它做普通软复位。优先尝试 `DAP_ResetTarget`(0x0A) 或 `DAP_SWJ_Pins`(0x10 的 nRESET)。

  ## 核心模型（动手前必读）

  每个通道有两层独立状态：

  | 层 | 含义 | 谁改变它 |
  | --- | --- | --- |
  | `ConfigState` | 通道**是否被配置为启用** | 设备配置（`Vout=enable`、`Vref_Voltage_mV`）或板载 UI |
  | 强制跌落（`down`） | 通道被临时拉低 | `DAP_PowerCycle` 的 **Off** / **On** |
  | `PowerState` | 实际在输出的通道 | `ConfigState & ~down` |

  由此必须遵守：

  1. `On` **只释放**被强制跌落的通道，**绝不会**给未配置的通道上电。因此命令可能返回成功
    （`Status=0x00`）但实际什么都没打开。
  2. `ConfigState=0x00` 表示命令是**空操作**。此时应先修配置，不要重试命令。
  3. `ConfigState ^ PowerState` = 当前被强制跌落的通道。
  4. 固件**不会自动恢复**。如果只发了 **Off** 没发 **On**，目标会一直断电。
    必须成对使用，并在所有错误路径上补发 **On**。

  ## 协议

  命令 `0x0F`，请求 3 字节，响应 4 字节：

  ```
  请求: [0x0F, Channel, Action]
  响应: [0x0F, Status, ConfigState, PowerState]
  ```

  `Channel`（位掩码）：

  | 值 | 含义 |
  | --- | --- |
  | `0x00` | 无动作，仅查询状态（`Action` 被忽略） |
  | `0x01` | VREF 输出 |
  | `0x02` | VOUT 5V 输出 |
  | `0x03` | 两者 |
  | `0xFF` | 广播到所有已实现通道 |

  `Action`：`0x00` = Off（跌落），`0x01` = On（释放）。其它值被忽略。

  `Status`：`0x00` = DAP_OK，`0xFF` = 错误。

  未实现的通道位会被忽略（不报错）。该命令**不要求** `DAP_Connect`，调试端口断开时也能用。

  ## 步骤 0 — 校验能力（每个会话一次）

  读 `DAP_Info` 的 ID `0xF0`，检查 **Info1 的 bit7**：

  ```
  请求: [0x00, 0xF0]
  响应: [0x00, Len, Info0, Info1, ...]
  ```

  `Len >= 2` 且 `(Info1 & 0x80) != 0` 表示支持 `DAP_PowerCycle`。
  若该位为 0，立即停止，并报告该调试器不支持此功能。

  然后用 `[0x0F, 0x00, 0x01]` 查询状态，检查 `ConfigState`：

  - `ConfigState == 0` → 目标电源未配置。停止，并告知用户去设备配置里启用
    （`Vout=enable`、`Vref_Voltage_mV=3300`）。
  - 否则记录初始的 `PowerState`，以便结束后恢复到原状态。

  ## 步骤 1 — 执行电源循环（默认配方）

  ```
  1. DAP_Disconnect                    # [0x03] 结束调试会话
  2. DAP_PowerCycle(0x03, Off)         # [0x0F, 0x03, 0x00] 拉低 VREF + VOUT
  3. 等待 >= 200 ms                    # 放电 / 电压跌落
  4. DAP_PowerCycle(0x03, On)          # [0x0F, 0x03, 0x01] 释放
  5. 等待 >= 200 ms                    # 电源稳定、上电复位释放
  6. DAP_Connect(SWD 或 JTAG)          # [0x02, 0x01] / [0x02, 0x02]
  ```

  注意事项：

  - 如果传输层支持，优先用 `DAP_ExecuteCommands`(0x7F) 把整段打包成一次事务，
    避免时序受主机/USB 往返延迟影响。
  - `DAP_Delay`(0x09) 的参数是 **16 位微秒**，单次最大约 65.5 ms。
    需要更久就发多条，或在主机侧等待。
  - 只跌落单路时用 `Channel=0x01`（VREF）或 `0x02`（VOUT）。
    不要假设关掉一路会连带关掉另一路。
  - **Off 和 On 要用相同的通道掩码**。只有当所有已实现通道都已配置时，
    Off 用 `0x03`、On 用 `0xFF` 才安全；否则可能释放了从未跌落的通道。

  ## 步骤 2 — 验证结果

  **Off** 之后查询，要求对应位已从 `PowerState` 消失。
  **On** 之后查询，要求对应位已恢复：

  ```
  cfg = response[2]; pwr = response[3]
  down = cfg & ~pwr                    # 当前被跌落的通道
  ```

  以下情况一律视为失败并上报，不要静默继续：

  - `Status != 0x00`
  - Off 之后：`(pwr & mask) != 0`（电源仍在上）
  - On 之后：`(pwr & mask) != (cfg & mask)`（电源没恢复）
  - 循环过程中 `ConfigState` 发生变化（配置被修改或被复位）

  ## 失败处理

  除非用户明确要求保持断电，否则任何情况下都要让目标恢复供电：

  ```
  try   { Off; 等待; On; 等待; }
  catch { On; }        # 尽力补发恢复，然后重新抛出异常
  ```

  如果 `On` 失败，重试一次；仍失败则报告"仍处于跌落的通道掩码"和原始响应字节。
  **绝不**无限循环 Off/On。

  ## 传输层（WebUSB，接口 1）

  与 console 的 `dapExecute()` 保持一致：

  1. `controlTransferOut({ requestType:'vendor', recipient:'interface',
    request:0x10, value:0, index:iface }, payload)`
  2. 轮询 `controlTransferIn({ ..., request:0x11 }, 2)`，直到读到的小端 int16 `> 0`
    （预算约 200 ms，步进 2 ms）
  3. `controlTransferIn({ ..., request:0x10 }, 512)` 取回响应

  设备有多个接口。要认领 `interfaceClass == 0xFF` 且 `interfaceSubClass == 0x03`
  的那个（WebUSB CMSIS-DAP），通常是接口 1。不要打开 HID（接口 4）或 bulk 接口 0。

  Linux 主机用 pyusb 时，等价写法：

  ```python
  dev.ctrl_transfer(0x41, 0x10, 0, iface, bytes(payload))
  # 轮询 (0xC1, 0x11, 0, iface, 2) 直到 int16 > 0
  resp = bytes(dev.ctrl_transfer(0xC1, 0x10, 0, iface, 512))
  ```

  `set_configuration()` 通常会因 CDC/HID 已被内核驱动占用而报 `Resource busy`；
  跳过它，直接在已配置的设备上操作即可。

  ## 硬性规则

  - 没有配对的 **On**，绝不单独发 **Off**（除非用户明确要求保持断电）。
  - 绝不假设 `On` 已经生效，必须回读 `PowerState`。
  - 绝不把 `Status=0x00` 单独当作成功。
  - 若 `ConfigState == 0`，立即停止：这是"未配置"，不是"坏了"。
  - 任何异常都要回报原始 4 字节响应。
  ````

### 1.2 京微齐力码流下载
* 使用Vllink调试器京微齐力下载码流，不依赖Fuxi
* 压缩包下载：[vllink-hercules-download.zip](../_static/tools/vllink-hercules-download.zip)
* 文件结构：
  ```
  vllink-hercules-download/
  ├── scripts/
  │   └── hercules_dl.py
  └── SKILL.md
  ```

* `hercules_dl.py`
  ``` python:hercules_dl.py
    #!/usr/bin/env python3
    """
    VLLINK Hercules 下载器

    python3 hercules_dl.py info
    python3 hercules_dl.py chip  <file>
    python3 hercules_dl.py flash <file> [--autorun] [--no-verify]

    flash: erase 必开, verify 默认开, autorun 默认关
    auto cut acf: 仅对 .acf 生效, 跳过开头 "//" 注释行

    适用硬件: VLLINK Basic2 / VLLINK 2X / VLLINK HME
    前提条件:
    - 必须已接好 FPGA 目标板
    - 不得通过 VLLINK 给 FPGA 供电 (当前固件限制), 目标板需独立供电
    """
    import argparse, struct, sys, time
    import usb.core, usb.util

    VID, PID = 0x1209, 0x6666
    SUB_INFO, SUB_PROBE, SUB_CHIP_WRITE, SUB_FLASH_WRITE = 0x00, 0x10, 0x20, 0x30
    OP_ERASE, OP_WRITE, OP_VERIFY, OP_WRITEQUICK, OP_AUTORESET = 0x2, 0x4, 0x8, 0x10, 0x40
    CHUNK = 256                     # 固件要求 data_len 为 4 的倍数且 <= 256
    MIN_RESP = {SUB_INFO: 12, SUB_PROBE: 16, SUB_CHIP_WRITE: 8, SUB_FLASH_WRITE: 8}

    TARGETS = {0: "M5", 1: "M7", 2: "HR02", 3: "HR03", 4: "P1", 5: "H1D03",
            6: "H1C02", 7: "H3", 8: "P0", 9: "P2", 10: "P3", 11: "H3P", 12: "EX1"}
    CHIP_SKIP = {4: 8, 5: 8, 6: 72, 7: 72, 8: 72, 9: 72, 10: 72, 11: 72, 12: 72}


    def cut_acf(data):
        pos = 0
        while pos + 1 < len(data) and data[pos:pos + 2] == b"//":
            nl = data.find(b"\n", pos)
            if nl < 0:
                return len(data)
            pos = nl + 1
        return pos


    class Hercules:
        def __init__(self):
            dev = usb.core.find(idVendor=VID, idProduct=PID)
            if dev is None:
                sys.exit("未找到 VLLINK 设备")
            self.dev = dev
            self.common = b"\x00" * 12
            try:
                usb.util.claim_interface(dev, 0)
            except usb.core.USBError as e:
                sys.exit("错误: USB 接口被占用 (%s)；请关闭浏览器调试页或调试器软件" % e)
            for _ in range(8):
                try:
                    dev.read(0x81, 512, timeout=30)
                except Exception:
                    break

        def xfer(self, pkt, timeout=30000):
            self.dev.write(0x01, bytes(pkt), timeout=3000)
            r = bytes(self.dev.read(0x81, 512, timeout=timeout))
            if len(r) < MIN_RESP.get(pkt[1], 4) or r[0] != 0x90 or r[1] != pkt[1]:
                raise RuntimeError("响应异常: %s" % r[:16].hex())
            return r

        def info(self):
            return struct.unpack_from("<II", self.xfer([0x90, SUB_INFO]), 4)

        def probe(self, supported):
            r = self.xfer([0x90, SUB_PROBE])
            attach, khz, ttype, devnum, cap = struct.unpack_from("<IHBBI", r, 4)
            if r[3] != 0 or not khz or ttype >= supported:
                raise RuntimeError("目标未 attach 或不受支持 "
                                "(type=%d, khz=%d, sts=%d)" % (ttype, khz, r[3]))
            self.common = bytes(r[4:16])
            return dict(attach=attach, khz=khz, ttype=ttype,
                        devnum=devnum, capacity=cap)

        def write(self, sub, data, op, addr=None, window=4):
            total, pos = len(data), 0
            t0 = tprint = time.time()
            window = max(1, window)
            while pos < total:
                batch = []
                while len(batch) < window and pos < total:
                    ln = min(CHUNK, total - pos)
                    batch.append((pos, ln))
                    pos += ln
                for p, ln in batch:
                    hdr = (struct.pack("<IIII", op, total, p, ln) if addr is None else
                        struct.pack("<IIIII", op, total, addr, p, ln))
                    self.dev.write(0x01, bytes([0x90, sub]) + self.common + hdr +
                                data[p:p + ln], timeout=3000)
                for p, ln in batch:
                    r = bytes(self.dev.read(0x81, 512, timeout=30000))
                    if len(r) < MIN_RESP.get(sub, 8) or r[0] != 0x90 or r[1] != sub:
                        raise RuntimeError("响应异常: %s" % r[:16].hex())
                    if r[3] != 0:
                        raise RuntimeError("写入失败 @%d, subSts=%d" % (p, r[3]))
                    got = struct.unpack_from("<I", r, 4)[0]
                    if not 0 < got <= ln:
                        raise RuntimeError("响应长度异常 @%d: %d" % (p, got))
                now = time.time()
                if pos >= total or now - tprint >= 1.0:
                    print("  %6d / %6d  %3d%%  %.1fs" %
                        (pos, total, pos * 100 // total, now - t0), flush=True)
                    tprint = now

        def close(self):
            try:
                usb.util.release_interface(self.dev, 0)
                usb.util.dispose_resources(self.dev)
            except Exception:
                pass


    def main():
        ap = argparse.ArgumentParser(description="VLLINK Hercules download tool")
        sub = ap.add_subparsers(dest="cmd", required=True)
        sub.add_parser("info", help="只读探测 (不擦除不写入)")
        p_chip = sub.add_parser("chip", help="Chip Download")
        p_chip.add_argument("file")
        p_chip.add_argument("--window", type=int, default=4, help="批量提交窗口 (默认 4, 1=同步)")
        p_flash = sub.add_parser("flash", help="Flash Download")
        p_flash.add_argument("file")
        p_flash.add_argument("--autorun", action="store_true", help="写完后让目标运行 (默认关)")
        p_flash.add_argument("--no-verify", action="store_true", help="关闭边写边校验 (默认开)")
        p_flash.add_argument("--window", type=int, default=4, help="批量提交窗口 (默认 4, 1=同步)")
        a = ap.parse_args()
        t_start = time.time()

        if a.cmd == "info":
            raw, cut = b"", 0
        else:
            try:
                raw = open(a.file, "rb").read()
            except OSError as e:
                sys.exit("错误: %s" % e)
            if not raw:
                sys.exit("错误: 镜像为空 (%s)" % a.file)
            cut = cut_acf(raw) if a.file.lower().endswith(".acf") else 0
            if a.cmd == "flash":
                n = len(raw) - cut
                if not n:
                    sys.exit("错误: 裁剪后无数据可写")
                if n % 4:
                    sys.exit("错误: 长度 %d 不是 4 的倍数, 固件会拒绝最后一块" % n)

        dap = Hercules()
        try:
            version, supported = dap.info()
            print("DAP 版本: %s  支持器件数: %d" % (hex(version), supported))

            info = dap.probe(supported)
            print("目标: %s  JTAG 时钟: %d kHz  Flash: %d KB  类型号: %d  器件数: %d" %
                (TARGETS.get(info["ttype"], "Unknown"), info["khz"],
                info["capacity"] // 1024, info["ttype"], info["devnum"]))
            if a.cmd == "info":
                print("耗时: %.2fs" % (time.time() - t_start))
                return

            start = cut if a.cmd == "flash" else cut + CHIP_SKIP.get(info["ttype"], 0)
            data = raw[start:]
            if not data:
                sys.exit("错误: 裁剪后无数据可写")
            if len(data) % 4:
                sys.exit("错误: 长度 %d 不是 4 的倍数, 固件会拒绝最后一块" % len(data))
            if info["capacity"] and len(data) > info["capacity"]:
                sys.exit("错误: 镜像 %d B 超过 Flash 容量 %d B" %
                        (len(data), info["capacity"]))

            if a.cmd == "chip":
                op = OP_WRITE | OP_WRITEQUICK
                print("Chip Download: %d -> %d bytes (跳过 %d), op=0x%x" %
                    (len(raw), len(data), start, op))
                dap.write(SUB_CHIP_WRITE, data, op, window=a.window)
                print("Chip Download 完成, %d bytes, 耗时 %.2fs" %
                    (len(data), time.time() - t_start))
            else:
                op = OP_WRITE | OP_ERASE
                if not a.no_verify:
                    op |= OP_VERIFY
                if a.autorun:
                    op |= OP_AUTORESET
                print("Flash Download: %d -> %d bytes (跳过 %d), op=0x%x "
                    "[erase=on verify=%s autorun=%s]" %
                    (len(raw), len(data), start, op,
                    "off" if a.no_verify else "on", "on" if a.autorun else "off"))
                dap.write(SUB_FLASH_WRITE, data, op, addr=0, window=a.window)
                print("Flash Download 完成, %d bytes, 耗时 %.2fs" %
                    (len(data), time.time() - t_start))
        except (RuntimeError, usb.core.USBError, OSError) as e:
            print("错误: %s" % e)
            sys.exit(1)
        finally:
            dap.close()


    if __name__ == "__main__":
        main()
  ```
* `SKILL.md`
  ```` markdown:SKILL.md
  ---
  name: VLLINK Hercules Flash 下载
  description: 用 VLLINK Basic2 / 2X / HME 调试器通过 Hercules vendor 协议（0x90 子命令）直接给 HME/Hercules 系列 FPGA 下载 Flash 或 Chip，支持 erase/verify/autorun 与 .acf 注释裁剪。当需要给 H1C02、H1D03、H3、P1、P0/P2/P3、M5/M7、EX1 目标板烧录 .bin/.acf、做只读探测、或排查下载失败（probe 失败、subSts 异常）时使用。目标板必须独立供电，不得由 VLLINK 供电。
  ---

  # VLLINK Hercules Flash 下载

  PC 侧不构建 JTAG 序列：上位机只发语义命令（子命令 + 12 字节器件头 + 参数 + 数据块，参数 flash 20 字节 / chip 16 字节），调试器固件自行展开时序。

  ## 何时使用

  - 给 HME/Hercules 目标板烧录 Flash 镜像（`.bin` / `.acf`）
  - 只读确认目标型号、时钟、容量，不写入
  - 需要批量、可脚本化的烧录或烧录自检
  - 下载报错需要定位（probe 失败、`subSts` 非 0、设备被占用）

  不适用：通用 JTAG 调试、读寄存器、断点追踪（走标准 CMSIS-DAP 通道）。

  ## 前置条件

  - 硬件：**VLLINK Basic2 / VLLINK 2X / VLLINK HME**（USB `1209:6666`）
  - 必须已接好 FPGA 目标板
  - **不得通过 VLLINK 给 FPGA 供电**（当前固件限制：检测到 FPGA 类负载会切断输出），目标板必须独立供电，VREF 需接好
  - 主机需要 `pyusb`，并且当前用户有该 USB 设备的访问权限

  ```bash
  python3 -c "import usb.core; print(usb.core.find(idVendor=0x1209, idProduct=0x6666))"
  ```

  权限不足时添加 udev 规则（示例）：

  ```text
  SUBSYSTEM=="usb", ATTR{idVendor}=="1209", ATTR{idProduct}=="6666", MODE="0666", GROUP="plugdev"
  ```

  同一时刻只能有一个进程占用设备；浏览器页面或调试器软件打开时会报占用。

  ## 用法

  以下命令需在 skill 目录执行，或把 `scripts/hercules_dl.py` 换成绝对路径：

  ```bash
  cd ~/.config/opencode/skills/vllink-hercules-download
  python3 scripts/hercules_dl.py info
  python3 scripts/hercules_dl.py chip  <file>
  python3 scripts/hercules_dl.py flash <file> [--autorun] [--no-verify]
  ```

  | 参数 | 说明 |
  | --- | --- |
  | `info` | 只读探测：DAP 版本、目标型号、时钟、容量、类型号；不擦除不写入 |
  | `chip` | Chip Download，`op_mask = WRITE\|WRITEQUICK` |
  | `flash` | Flash Download，`erase` 固定开启 |
  | `--autorun` | 写入完成后让目标运行（`AUTORESET`），默认关 |
  | `--no-verify` | 关闭边写边校验（`VERIFY`），默认开 |
  | `--window` | 批量提交窗口，默认 4（连续发 4 包再收 4 个响应）；`1` 为同步逐包；实测 8 以上会退化，16 超时 |

  `.acf` 文件会自动跳过开头的 `//` 注释行；`chip` 还会按目标类型跳过固定头部（H1D03/P1 跳 8，H1C02/H3/P0/P2/P3/H3P/EX1 跳 72）。

  进度每秒输出一行，100% 必定输出。

  三条命令都会打印 **JTAG 时钟**；`info` 和写入命令结束时打印 **总耗时**（含连接与 probe）。进度行里的秒数是写入阶段耗时，完成行的是总耗时，用于估算等待时间：

  | 场景 | 参考耗时（随机数据） |
  | --- | --- |
  | `info` | 约 0.1–0.3s |
  | ≤1KB flash（含连接与 probe） | 约 0.5s |
  | 64KB flash | 约 0.9s |
  | 512KB flash（`--window 4`，默认 verify） | 约 4.5s |
  | 512KB flash（`--window 1`） | 约 5.5s |

  窗口 4 相比逐包同步约快 20%；全 0xFF 镜像会因跳过实际编程而明显偏快，不能作为性能基线。

  退出码：`0` 成功，`1` 运行失败（文件、设备或校验错误），`2` 参数错误。

  ## 协议要点

  - 请求：`[0x90, 子命令, common(12B), 参数, 数据]`，参数 flash 为 20 字节（op/length/addr/pos/len），chip 为 16 字节（无 addr）
  - 子命令：`0x00` GET_INFO、`0x10` PROBE、`0x20` CHIP_WRITE、`0x30` FLASH_WRITE
  - `common` 来自 PROBE 响应，包含时间戳、时钟、器件类型、容量；**每条命令前必须先 probe，probe 成功才允许下载**
  - 响应：`[0x90, 子命令, cmdSts, subSts, payload...]`，写入成功时 payload 前 4 字节是本次已处理的字节数
  - `op_mask`：`0x01` READ、`0x02` ERASE、`0x04` WRITE、`0x08` VERIFY、`0x10` WRITEQUICK、`0x40` AUTORESET

  ## 固件限制

  - 单次 `data_len` 必须是 **4 的倍数且不超过 256**
  - 非 4 倍数 → `subSts=5`（FAIL）；超过 256 → `subSts=4`（VERIFY_FAIL）
  - 因此镜像长度必须是 4 的倍数；否则最后一块失败，且此前已擦除并部分写入
  - 脚本在连接设备前检查空文件和 4 字节对齐，probe 后检查容量，不满足直接退出且不擦除
  - `probe` 会暂停器件；不带 `AUTORESET` 下载后器件可能停在暂停态，需要重新上电或改用 `--autorun`

  ## 错误排查

  | 现象 | 原因 |
  | --- | --- |
  | `subSts=2` | common 头不匹配（时间戳过期），重新执行 `info` 后再试 |
  | `subSts=3` | 头部非法 / 目标类型不受支持 |
  | `subSts=4` | 校验失败（长度超限或数据不一致） |
  | `subSts=5` | 写入失败（常见：长度不是 4 的倍数） |
  | `目标未 attach 或不受支持 (type=255, khz=1000, sts=0)` | 器件未识别：检查目标是否独立供电、VREF、JTAG 接线 |
  | `错误: USB 接口被占用 (...)；请关闭浏览器调试页或调试器软件` | 设备被其他进程占用 |
  | `错误: 镜像为空` | 文件 0 字节，未接触硬件 |
  | `错误: 长度 N 不是 4 的倍数` | 补齐到 4 字节边界，未擦除 |
  | `错误: 镜像 N B 超过 Flash 容量 M B` | 换小镜像，未擦除 |
  | `响应异常: ff` | 调试器通道异常，拔插 USB 恢复 |

  ## 烧录结果判断

  `flash` 默认带 `OP_VERIFY`，命令返回 `subSts=0` 且进度到 100% 即表示写入并校验通过。脚本不提供读回功能；需要逐字节复核时，另行用 `0x90/0x31` 读命令。

  ## 安全提示

  - `flash` 会擦除目标 Flash，执行前确认文件、目标和供电状态
  - 不要对未知目标类型发送下载命令
  - 烧录过程中不要拔线；失败后先用 `info` 确认目标仍在线，再重试
  ````