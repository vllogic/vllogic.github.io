# Vllink Basic 快速上手

## 调试接口定义
![](../_static/common_interface_desc_small.png)
| 接口 | 介绍 |
| :----: | :---- |
| TDI  | JTAG数据口 |
| TMS / SWDIO  | JTAG模式口、SWD数据口 |
| TCK / SWCLK  | JTAG时钟口、SWD时钟口 |
| SRST / SWRST  | 芯片复位口 |
| TDO  | JTAG数据口 |
| Vout  | 双向电源口<sup>1</sup> |
| GND  | 共地口 |
| TRST  | JTAG复位口 |
| TXD  | 串口输出 |
| RXD  | 串口输入 |

  [1] [Vout口使用说明](../hardware/vllink_basic_vout.md)

## 模式介绍及切换
### 模式切换
* 可通过双击按键切换运行模式
* 基本模式有三种，分别是有线模式、无线接收模式（AP）以及无线发送模式（STA）

### 有线模式
* 板上红灯、黄灯亮起
* USB设备启用，可与USB主机通信
* 调试口可连接目标板

### 无线接收模式（AP）
* 板上红灯、黄灯亮起，板上蓝灯作为连接指示状态灯，未连接时闪烁、已连接后常亮
* USB设备启用，可与USB主机通信
* 注意：若在蓝灯闪烁时，启动调试、CDC串口功能，将会启用板上调试口，而非远端调试口。

### 无线发送模式（STA）
* 板上黄灯亮起，板上绿灯作为连接指示状态灯，未连接时闪烁、已连接后常亮
* USB设备关闭，不可与USB主机通信

### 有线模式连接示例
![](../_static/vllink_basic_wired.png)
* 图中调试器为有线模式，硬件为5V版本，且配置文件中`Vout=enable`，故调试器可为目标板提供5V电源

### 无线模式连接示例
#### 1. STA为目标板供电
![](../_static/vllink_basic_wireless1.png)
* 图中调试器一个为AP模式，不接目标板；另一个为STA模式，USB接电源、调试口接目标板
* STA端硬件为5V版本，且配置文件中`Vout=enable`，故STA端可目标板提供5V电源
* 注意：3.3V版本的调试器仅能提供3.3V电源，且目标板电流不应超过100mA

#### 2. 目标板为STA供电
![](../_static/vllink_basic_wireless2.png)
* 图中调试器一个为AP模式，不接目标板；另一个为STA模式，调试口接目标板
* STA端硬件为5V版本，目标板可通过Vout口为STA端供电
* 因为调试器是通过PMOS管控制Vout，即使`Vout=disable`，未开启的PMOS也仅等效一个二极管，并不影响STA端的启动，所以此方式不不要求修改配置文件
* 注意：3.3V版本的调试器不支持此种用法

## 开发工具使用说明
* [IAR 使用说明](../software/iar.md)
* [Keil MDK 使用说明](../software/keil_mdk.md)
* [Probe RS 使用说明](../software/probe_rs.md)
* [OpenOCD 使用说明](../software/openocd.md)
* [PyOCD 使用说明](../software/pyocd.md)
* [CDC 使用说明](../software/cdc.md)
