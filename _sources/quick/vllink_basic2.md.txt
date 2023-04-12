# Vllink Basic2 快速上手

## 调试接口定义
![](../_static/picture/common_interface_desc_small2.png)
| 接口 | 介绍 |
| :---- | :---- |
| TDI  | JTAG数据口 |
| TMS / SWDIO  | JTAG模式口、SWD数据口 |
| TCK / SWCLK  | JTAG时钟口、SWD时钟口 |
| SRST / SWRST  | 芯片复位口 |
| TDO  | JTAG数据口 |
| 5V  | 双向电源口<sup>1</sup> |
| GND  | 共地口 |
| TRST  | JTAG复位口 |
| TXD  | 串口输出 |
| RXD  | 串口输入 |

  [1] 在USB供电时，此脚可对外输出5V；亦可通过此脚对调试器供电；

## 模式介绍及切换
### 模式切换
* 可通过双击按键切换运行模式
* 基本模式有三种，分别是有线模式、无线主机模式以及无线设备模式

### 有线模式
* 板上黄灯亮起
* USB设备启用，可与USB主机通信
* 调试口可连接目标板

### 无线主机模式
* 板上黄灯、蓝灯亮起，板上蓝灯作为连接指示状态灯，未连接时闪烁、已连接后常亮
* USB设备启用，可与USB主机通信
* 注意：若在蓝灯闪烁时，启动调试、CDC串口功能，将会启用板上调试口，而非远端调试口。

### 无线设备模式
* 板上黄灯、绿灯亮起，板上绿灯作为连接指示状态灯，未连接时闪烁、已连接后常亮
* USB设备关闭，不可与USB主机通信

### 有线模式连接示例
施工中

### 无线模式连接示例
施工中

## 开发工具使用说明
* [Windows7 驱动安装](../software/windows7_driver.md)
* [IAR 使用说明](../software/iar.md)
* [Keil MDK 使用说明](../software/keil_mdk.md)
* [Probe RS 使用说明](../software/probe_rs.md)
* [OpenOCD 使用说明](../software/openocd.md)
* [PyOCD 使用说明](../software/pyocd.md)
* [FreeMASTER 使用说明](../software/freemaster.md)
