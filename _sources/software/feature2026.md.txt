# Vllink Basic2 2026年新特性

* 前言：这次新特性开发非常顺利，但由于代码变动较大，交互机制也有改动，目前是以独立教程的形式发布，待稳定后再合并至主站。
* 固件：[V00.40-202603211557](../_static/firmware/vllink_basic2.SVCommon0040202603211557.zip)

## 一、综述
1. 优化Wifi及TCP机制，通讯管理更为合理，无线速率提升12%左右
2. 支持一对多，单AP最多可同时连接八个STA，最多可控制**九个目标板**（含AP所连目标板）
3. 完善`WebUSB`接口，开放 [通讯协议](../software/webusb_protocol) ，提供开源上位机网页工具
4. 在STA模式下增加`TCP-UART`功能，可独立作为无线TCP串口工具使用，对接任意标准TCP客户端
5. 在STA模式下增加`TCP-DAP`功能，可独立作为无线调试工具使用，对接最新版本OpenOCD

## 二、灯光机制
1. 红灯：指示是否启用USB功能
    * 常灭：关闭USB
    * 常亮：启用USB
2. 蓝灯：指示是否启用无线AP功能及无线状态
    * 常灭：关闭无线AP
    * 闪烁：启用无线AP，且未接入STA
    * 常亮：启用无线AP，且已接入STA
3. 绿灯：指示是否启用无线STA功能及无线状态
    * 常灭：关闭无线STA
    * 闪烁：启用无线STA，且未连接AP
    * 常亮：启用无线STA，且已连接AP
4. 黄灯：
    * 常灭：DC3接口未被选定
    * 闪烁：DC3接口已被选定，且VRef电压低
    * 常亮：DC3接口已被选定，且VRef电压正常
5. 蓝绿灯：
    * 注意：仅在AP模式且`Mode2_STA`被启用时出现
    * 同步闪烁：未连接AP
    * 同步常亮：已连接AP

## 三、按键机制
1. 双击：循环切换模式，有线模式 -> 无线AP模式（接电脑） -> 无线STA模式（接芯片）-> 有线模式 -> ...
2. 长按10秒：重置所有配置，但`VOut`以及`Vref_Voltage_mV`除外，避免误改动输出电压

## 四、一对多
* 配置工具：[Vllink 2026 Console](https://vllogic.com/_static/tools/vllink2026_console/)
#### 4.1 直连一对多
* TODO
#### 4.2 局域网/广域网一对多
* TODO

## 五、`WebUSB`接口
* TODO

## 六、`TCP-UART`
简述：配置`Wireless_Device_SSID=路由器SSID`、`Wireless_Device_SSID=路由器密码`以及`Mode3_TCP_UART=enable`，切换到模式3，在STA连上路由器后，查看STA的IP。即可通过TCP客户端连接：STA_IPv4:20010。串口参数可通过`Mode3_TCP_UART_PARAM`修改。

## 七、`TCP-DAP`
* 简述：配置`Wireless_Device_SSID=路由器SSID`、`Wireless_Device_SSID=路由器密码`，切换到模式3，在STA连上路由器后，查看STA的IP。即可通过最新版OpenOCD连接。
* [最新版OpenOCD，Windows](https://github.com/vllogic/openocd_cmsis-dap_v2/releases/tag/20260322)
* 命令：`./openocd.exe -f interface/cmsis-dap.cfg -f target/stm32f4x.cfg -c "cmsis-dap backend tcp; cmsis-dap tcp host 192.168.1.183; cmsis-dap tcp port 4441; transport select swd; adapter speed 8000"` 注意：执行命令前修改IP。
* 测试：
    ```
    > adapter speed 30000
    adapter speed: 30000 kHz
    > dump_image ram.bin 0x20000000 0x10000
    dumped 65536 bytes in 0.168065s (380.805 KiB/s)
    > load_image ram.bin 0x20000000        
    65536 bytes written at address 0x20000000
    downloaded 65536 bytes in 0.134932s (474.313 KiB/s)
    ```

## 八、后续
计划增加 **旁路总线访问** 特性。简单来讲就是网页直接读取或者写入任意地址，且不影响正在进行的调试功能。这个特性是**高性能旁路RTT**的基础。
