# Hercules Program CLI（Python 移植版）

网页版 `web_program_hercules` 的本地命令行版本。**配置 100% 兼容网页版导出的 `config.json`**，
在 512MB Linux ARM 设备上一条命令即可自动量产烧录（内存占用 < 30MB，无浏览器依赖）。

## 与网页版的关系

| 网页文件 | 本工具 |
|---|---|
| `src/dapv2.js`（WebUSB 传输） | `Vllink` 类（pyusb / libusb bulk 传输） |
| `src/hercules.js`（命令构建） | `cmd_*()` 函数（协议字节完全一致） |
| `src/engine.js`（量产引擎） | `MassProduceEngine` 类（触发/重试/状态输出逐项移植） |
| 「💾 导出配置」的 `config.json` | 直接读取，固件按文件名从同目录加载 |

## 安装（Linux ARM）

```bash
# 1. 依赖
apt install -y python3 python3-pip libusb-1.0-0
pip3 install pyusb

# 2. udev 规则（非 root 使用 Vllink 必须，然后重插 USB）
cat > /etc/udev/rules.d/99-vllink.rules <<'EOF'
SUBSYSTEM=="usb", ATTR{idVendor}=="1209", ATTR{idProduct}=="6666", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="0d28", ATTR{idProduct}=="0204", MODE="0666", GROUP="plugdev"
EOF
udevadm control --reload-rules && udevadm trigger
```

## 使用

```bash
# 查看设备是否识别
python3 hercules_program.py --list

# 一行命令量产：读取网页版导出的 config.json
python3 hercules_program.py config.json

# 只烧 1 片 / 烧 100 片后自动退出（适合 --count 限量或 CI）
python3 hercules_program.py -c config.json --once
python3 hercules_program.py -c config.json --count 100

# 覆盖触发方式 / 间隔 / 重试
python3 hercules_program.py -c config.json --trigger auto-timer --interval 2 --retry 3

# 禁用状态输出 / 输出 CSV 报表
python3 hercules_program.py -c config.json --no-status --csv report.csv
```

## 触发方式（与网页版一致）

| mode | 说明 |
|---|---|
| `vref-rising` | VREF 掉电再上电（严格 0→1） |
| `key-rising` | 下载器模式键按下 |
| `rxd-rising` / `rxd-falling` | RXD 脚电平跳变 |
| `manual` | 命令行下按回车触发（`--once`/`--count` 时自动放行） |
| `auto-timer` | 烧完一片按间隔自动下一片（首次立即） |

## config.json 结构（网页版导出，无需手写）

```json
{
  "schema": 4,
  "product": "",
  "options": { "autoRun": true, "retryCount": 2, "cmdTimeoutMs": 3000, "speedKHz": 48000 },
  "trigger": { "mode": "vref-rising", "autoInterval": 2 },
  "statusOut": { "enable": true, "passAction": "pass_txd_rise", "failAction": "fail_srst_rise" },
  "files": [ { "name": "firmware.bin", "addr": 0, "cutAcf": false } ]
}
```

固件文件（`.bin` / `.acf`）放在 `config.json` **同目录**，工具按 `name` 自动加载；`.acf` + `cutAcf=true` 自动裁剪注释头。

## 退出码

- `0`：量产完成，失败数为 0
- `1`：连接/配置错误
- `2`：量产完成但有失败片

## 注意事项

- 量产强制 `ERASE + VERIFY`，与网页版一致；`autoRun` 烧完自动复位。
- `--count N` 按"烧录尝试次数"计（成功+失败都算）。
- 中断：`Ctrl+C` 立即停止等待/触发，当前片烧完或失败后退出，并自动 `RELEASE` 释放 TAKEOVER。
