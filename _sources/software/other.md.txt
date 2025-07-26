# For ARM
接口协议：SWD，20M
说明：VisualHere在`ARM -有线- 路由 -Wifi6- PC`网络状态下测得
| 测试对象 | Ram Write | Ram Read |
| :----: | :----: | :----: |
| IAR Basic2 USB | 485KB/S | 467KB/S |
| IAR Basic2 Wireless | 118KB/S | 119KB/S |
| IAR Basic2 VisualHere | 59KB/S | 65KB/S |
| OpenOCD Basic2 VisualHere | 不稳定 | 不稳定 |
| IAR Jlink USB | 223KB/S | 157KB/S |
| IAR Jlink Server | 180KB/S | 134KB/S |
| IAR Jlink VisualHere | 180KB/S | 145KB/S |

# For FPGA

* 下载器：FTDI2232
* 速率：30M
* 二进制文件：16MB
* 操作：Vivado下`Program Device`

| 测试场景 | 耗时 | 速度 |
| :---- | :----: | :----: |
| USB直连 | 7.25秒 | 2.21MB/S |
| VisualHere ARM板有线，PC有线 | 8.49秒 | 1.88MB/S |
| VisualHere ARM板有线，PC Wifi6 | 21.75秒 | 0.736MB/S |
