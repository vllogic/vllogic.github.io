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



## 20260515
* 平台：`Keil 5.36`, `IAR 8.40.2`, `Openocd 0.12.0+dev-gc15fd98`
* 调试器：`Vllink 2X`, 固件版本：`V00.52-202605141203`
* 对象：`STM32F407VGT6`, `AT32F407A`

### Keil 5.36 测试
* 接口：`CMSIS-DAP V2`
* 计时：基于USB通信起止时间戳
* | 模式 | 目标芯片 | 固件大小 | 全片擦除、编程、<br>校验总耗时(S) | 编程耗时(S) | 编程速度<br>(KB/S) |
  | :----: | :----: | :----: | :----: | :----: | :----: |
  | 有线 | AT32F407A | 1024KB | 15.5 | 4.4 | 230.7 |
  | 无线直连<sup>1</sup> | AT32F407A | 1024KB | 31.6 | 26.3 | 38.8 |
  | 无线网络<sup>2</sup> | AT32F407A | 1024KB | 44.2 | 39.1 | 26.2 |
  | 有线 | STM32F407 | 1024KB | 19.8 | 7.6 | 133.3 |
  | 无线直连<sup>1</sup> | STM32F407 | 1024KB | 35.7 | 22.4 | 45.6 |
  | 无线网络<sup>2</sup> | STM32F407 | 1024KB | 53.4 | 39.4 | 25.9 |
  | 对比：某Link V9<br>@V7.86a | STM32F407 | 1024KB | 24.5 | 12.9 | 79.7 |
  | 对比：某Link V11<br>@V7.86a | STM32F407 | 1024KB | 32.8 | 20.9 | 48.8 |

  [1] 无线直连：一个调试器作为`AP`，连接电脑；一个或多个调试器作为`STA`，连接目标板。`AP`与`STA`直接建立无线连接

  [2] 无线网络：`AP`调试器与`STA`调试器连接同一局域网的不同无线接入点

### OpenOCD测试
* 版本：`Open On-Chip Debugger 0.12.0+dev-gc15fd98 (2026-03-22-03:24)`
* 启动命令：`./openocd.exe -s ../scripts -f interface/cmsis-dap.cfg -f target/stm32f4x.cfg -c "adapter speed 8000; transport select swd; init; reset halt"`
* 测试命令：`flash write_image erase 00_1024KB.bin 0x08000000 bin`
* 计时：基于命令行反馈数据
* | 模式 | 目标芯片 | 固件大小 | 全片擦除、<br>编程总耗时(S) | 编程耗时(S) | 编程速度<br>(KB/S) |
  | :----: | :----: | :----: | :----: | :----: | :----: |
  | 有线 | STM32F407 | 1024KB | 15.4  | 8.9  | 114.1  |
  | 无线直连 | STM32F407 | 1024KB | 15.9  | 9.4  | 108.5  |
  | 无线网络 | STM32F407 | 1024KB | 16.7  | 10.3  | 98.9  |

