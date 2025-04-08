# 速度测试

## 测试条件
* 平台：`IAR 8.40.2`，`Keil 5.36`，`OpenOCD (0.12.0+dev-gfe3aa0a)`
* 硬件：NUCLEO-F411RE
* 数值单位：KB/Sec（千字节每秒）
* IAR Flash写入测试启用了`--x32 --skip_erase`参数

## Vllink Basic2
* 固件版本：`V00.18-202504040905`
#### Vllink Basic2 有线
| IDE and Interface | Flash Read | Ram Write | Flash Write |
| :----: | :----: | :----: | :----: |
| OpenOCD V2-SWD 30M | 730KB/S | 777KB/S | 117KB/S |
| OpenOCD V2-JTAG 15M | 128KB/S | 128KB/S | 101KB/S |
| IAR-DAP V2-SWD 20M | 515KB/S | 525KB/S | 118KB/S |
| IAR-DAP V2-JTAG 12M | 317KB/S | 323KB/S | 103KB/S |

#### Vllink Basic2 无线
| IDE and Interface | Flash Read | Ram Write | Flash Write |
| :----: | :----: | :----: | :----: |
| OpenOCD V2-SWD 30M | 331KB/S | 386KB/S | 108KB/S |
| OpenOCD V2-JTAG 15M | 22KB/S | 23KB/S | 14KB/S |
| IAR-DAP V2-SWD 20M | 118KB/S | 110KB/S | 51KB/S |
| IAR-DAP V2-JTAG 12M | 102KB/S | 102KB/S | 46KB/S |

## Vllink Box
* 固件版本：`V00.01-202504071855`
#### Vllink Box 有线
| IDE and Interface | Flash Read | Ram Write | Flash Write |
| :----: | :----: | :----: | :----: |
| OpenOCD V2-SWD 20M | 674KB/S | 711KB/S | 118KB/S |
| OpenOCD V2-JTAG 15M | 182KB/S | 185KB/S | 114KB/S |
| IAR-DAP V2-SWD 20M | 518KB/S | 578KB/S | 122KB/S |
| IAR-DAP V2-JTAG 12M | 341KB/S | 353KB/S | 105KB/S |

#### Vllink Box 无线
| IDE and Interface | Flash Read | Ram Write | Flash Write |
| :----: | :----: | :----: | :----: |
| OpenOCD V2-SWD 20M | 376KB/S | 427KB/S | 113KB/S |
| OpenOCD V2-JTAG 15M | 26KB/S | 27KB/S | 16KB/S |
| IAR-DAP V2-SWD 20M | 136KB/S | 135KB/S | 56KB/S |
| IAR-DAP V2-JTAG 12M | 122KB/S | 118KB/S | 52KB/S |
