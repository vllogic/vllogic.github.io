# Vllink Basic 固件更新

## 更新方法
1. 解压压缩包
2. 按住按键连接Win10电脑，再使用Chrome浏览器打开更新页面 [WebDFU@Github](https://devanlai.github.io/webdfu/dfu-util/)或[WebDFU@Gitee](https://talpachen.gitee.io/webdfu/dfu-util/)
3. 点击`Connect`，找到`Vllink Basic DFU Bootloader`并双击
4. 在`Firmware Download`栏目中选中解压得到.bin文件
5. 点击`Download`，等待一段时间后，完成更新。

## 固件列表
### CMSIS-DAP V2、CDC、MSC接口固件 
* [V01.04-202404141228](../_static/firmware/vllink_basic.SVCommon0104202404141228.zip)
  1. 优化：增强在临界距离时的稳定性
* [V01.00-202403310902](../_static/firmware/vllink_basic.SVCommon0100202403310902.zip)
  1. 修复：在系统重启后，未掉电的调试器串口异常问题
  2. 优化：优化CDC Notify端点的处理
* [V00.34-202308051430](../_static/firmware/vllink_basic.SVCommon0034202308051430.zip)
  1. 修复：在STA断开时，清理所有未完成的DAP请求
* [V00.30-202305102053](../_static/firmware/vllink_basic.SVCommon0030202305102053.zip)
  1. 修复：在`V00.27`-`V00.29`引入的SWD时序BUG，导致部分芯片SWD通讯失败，如`AT32F403`
* [V00.27-202304081616](../_static/firmware/vllink_basic.SVCommon0027202304081616.zip)
  1. 修复：对要求低速调试的设备支持，比如PY32F0xx系列
  2. 修复：V0.25及V0.26固件中一个JTAG错误
* [V00.24-202302152043](../_static/firmware/vllink_basic.SVCommon0024202302152043.zip)
  1. 修复：STA端不识别IDE类型，进而导致自动复位功能失效
* [V00.22-202208242002](../_static/firmware/vllink_basic.SVCommon0022202208242002.zip)
  1. 优化：尝试识别IDE类型，对于Keil开发环境，自动使用优化参数
  2. 新功能：AP模式支持作为STA连接路由器；STA模式支持指定服务器IPv4
  3. 优化：AP模式下，根据远端串口的连接状态，自动切换本地串口与远端串口
  4. 优化：减少重连耗时
  5. 修复：修复无线串口在未连接时接收数据会导致溢出的问题
  6. 修复：SWO功能异常
  7. 修复：CMSIS-DAP V2协议下对Keil的主动识别异常
* [V00.5B-202208141927](../_static/firmware/vllink_basic.SVCommon005b202208141927.zip)

### CMSIS-DAP V1接口固件 
* [V01.05-202404141233](../_static/firmware/vllink_basic.SVCommon0105202404141233.zip)
  1. 变更：基于`V01.00-202403310902`，移除MSC磁盘
  2. 变更：基于`V01.00-202403310902`，增加CMSIS-DAP V1接口
  3. 修复：Keil下，V1接口的`Reset and Run`功能无效
* [V01.01-202403310903](../_static/firmware/vllink_basic.SVCommon0101202403310903.zip)
  1. 变更：基于`V01.00-202403310902`，移除MSC磁盘
  2. 变更：基于`V01.00-202403310902`，增加CMSIS-DAP V1接口
* [V00.35-202308051434](../_static/firmware/vllink_basic.SVCommon0035202308051434.zip)
  1. 变更：基于`V00.34-202308051430`，移除MSC磁盘
  2. 变更：基于`V00.34-202308051430`，增加CMSIS-DAP V1接口
* [V00.33-202305261128](../_static/firmware/vllink_basic.SVCommon0033202305261128.zip)
  1. 修复：在`V00.27`-`V00.29`引入的SWD时序BUG，导致部分芯片SWD通讯失败，如`AT32F403`
  2. 变更：基于`V00.30-202305102053`，移除MSC磁盘
  3. 变更：基于`V00.30-202305102053`，增加CMSIS-DAP V1接口
  4. 修复：支持`Segger`部分软件，如`J-Flash 7.22B`及`Segger Embedded Studio`
* [V00.29-202304081617](../_static/firmware/vllink_basic.SVCommon0029202305041045.zip)
  1. 变更：基于`V00.28-202304081617`，修改VID、PID，支持`MCUXpressoIDE`
* [V00.28-202304081617](../_static/firmware/vllink_basic.SVCommon0028202304081617.zip)
  1. 变更：基于`V00.27-202304081616`，移除MSC磁盘
  2. 变更：基于`V00.27-202304081616`，增加CMSIS-DAP V1接口
* [V00.16-202207161200](../_static/firmware/vllink_basic.SVCommon0016202207161200.zip)
  1. 修复：修复CDC串口notify短点持续halt造成CDC功能不稳定的问题
  2. 优化：STA将自动记录第一次连接的AP信息，并在下次启动时，自动连接此AP，以加快连接速度
  3. 优化：将内核供电改为DCDC模式，大约能降低8mA@5V的工作电流
  4. 优化：修复配置文件字符串判定对'\r\n'依赖的兼容性问题

### 其他接口固件
* [V00.3A-202308051344](../_static/firmware/vllink_basic.SVCommon003a202308051344.zip)
  1. 变更：移除DAP接口
  2. 变更：在原有串口基础上增加了第二个串口，使用了TRST（TX），SRST（RX）
  3. 说明：无法使用调试功能，但具有有线、无线双串口
