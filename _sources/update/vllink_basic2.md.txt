# Vllink Basic2 固件更新

## 更新方法
1. 解压压缩包
2. 按住按键连接Win10电脑，再使用Chrome浏览器打开更新页面 [Vllink HID Update](https://vllogic.com/_static/tools/update/)
3. 点击`Connect Vllink Device`，在对话框中选中`Vllink Basic2 Update`再点击`连接`
4. 在`Firmware Update`栏目中选中解压得到.bin文件
5. 点击`Update`，等待一段时间后，完成更新。

## 固件列表
* [V00.26-202506082312](../_static/firmware/vllink_basic2.SVCommon0026202506082312.zip)
  1. 修复：`V00.18`-`V00.25`无法支持`Ozone V3.24 32Bit`的问题
* [V00.25-202505192331](../_static/firmware/vllink_basic2.SVCommon0025202505192331.zip)
  1. 优化：提升配对速度
  2. 修复：修复无线串口在几种特定操作下耗尽TCP缓冲的问题
* [V00.21-202504132000](../_static/firmware/vllink_basic2.SVCommon0021202504132000.zip)
  1. 新增：AP模式支持作为STA连接路由器；STA模式支持指定服务器IPv4。用法见[局域网使用](../example/over_local_area_network)及[互联网使用](../example/over_internet)
  2. 修复：修复一个TCP粘包BUG
  3. 新增：支持配置DAP和UART使用的TCP端口，默认为：`TCP_PORT_DAP=20000`，`TCP_PORT_UART=20010`
* [V00.18-202503281003](../_static/firmware/vllink_basic2.SVCommon0018202504040905.zip)
  1. 优化：针对`OpenOCD`下`JTAG`接口进行优化，有线速度大致提升`67%`，无线速度几乎无变化
  2. 建议：强烈建议使用`OpenOCD`下`SWD`接口的用户升级`OpenOCD nightly`版本，有线速度可超`600KB`，无线速度可超`300KB`
* [V00.17-202503281003](../_static/firmware/vllink_basic2.SVCommon0017202503281003.zip)
  1. 优化：UART换用DMA收发机制；波特率上下限扩展到`1200`-`6500000`
  2. 新增：增加无线TTL串口桥接功能，配合产品特性可实现`同、异电平`、`同、异波特率`的`全双工`无线对接。详见[TTL串口使用说明](../hardware/vllink_uart)
* [V00.16-202408182040](../_static/firmware/vllink_basic2.SVCommon0016202408182040.zip)
  1. 修复：ID_DAP_SWD_Sequence命令报错问题，见于通过OpenOCD连接RP2040
* [V00.15-202407052236](../_static/firmware/vllink_basic2.SVCommon0015202407052236.zip)
  1. 调整：`I/F`指示灯工作方式变动，常灭表示接口已关闭，闪烁表示`VRef`无电压，常亮表示接口及`VRef`正常
  2. 调整：`VRef`出厂模式调整为`输出3.3V`模式，升级此固件不会导致`VRef`模式变动
  3. 调整：长按按键10秒，除了`VRef`模式外，所有配置将被清除
* [V00.12-202406211323](../_static/firmware/vllink_basic2.SVCommon0012202406211323.zip)
  1. 优化：提升长时间连接稳定性（48小时+）
  2. 调整：默认不启用`MFP特性`，如需启用，要配置：`Wireless_ATTR=[wifi][mfp]`并重新上电
* [V00.11-202405251256](../_static/firmware/vllink_basic2.SVCommon0011202405251256.zip)
  1. 优化：提升STA重连可靠性
  2. 调整：移除"36, 40, 44, 48, 149, 153, 157, 161, 165"之外的无效信道
* [V00.09-202405111212](../_static/firmware/vllink_basic2.SVCommon0009202405111212.zip)
  1. 优化：串口缓冲深度从1.5KB提高到8.5KB
  2. 新增：长按按键5秒，将强制切换至有线模式，此功能用于恢复配置能力
  3. 调整：默认不再作为`ARM MBED`设备，如需支持`FreeMASTER`，要配置`AS_ARM_MBED=enable`并重新上电
* [V00.07-202404141115](../_static/firmware/vllink_basic2.SVCommon0007202404141115.zip)
  1. 优化：增加MFP特性
  2. 优化：增强在临界距离时的稳定性
* [V00.02-202404101533](../_static/firmware/vllink_basic2.SVCommon0002202404101533.zip)
  1. 修复：Keil下，V1接口的`Reset and Run`功能无效
  2. 新增：京微齐力开发环境支持，需转接板以及目前尚未发布的内部版开发环境
* [V00.01-202403261341](../_static/firmware/vllink_basic2.SVCommon0001202403261341.zip)
