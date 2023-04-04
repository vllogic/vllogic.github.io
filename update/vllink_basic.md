# Vllink Basic 固件更新

## 更新方法
1. 解压压缩包
2. 按住按键连接Win10电脑，再使用Chrome浏览器打开更新页面 [WebDFU@Github](https://devanlai.github.io/webdfu/dfu-util/)或[WebDFU@Gitee](https://talpachen.gitee.io/webdfu/dfu-util/)
3. 点击`Connect`，找到`Vllink Basic DFU Bootloader`并双击
4. 在`Firmware Download`栏目中选中解压得到.bin文件
5. 点击`Download`，等待一段时间后，完成更新。

## 固件列表
### CMSIS-DAP V2、CDC、MSC接口固件 
* [V00.25-202303301453](../_static/firmware/vllink_basic.SVCommon0025202303301453.zip)
  1. 修复：对要求低速调试的设备支持，比如PY32F0xx系列
  2. 修复：JTAG IR命令中的一个逻辑BUG
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

### 其他接口固件 
* [V00.26-202304042319](../_static/firmware/vllink_basic.SVCommon0026202304042319.zip)
  1. 变更：基于`V00.25-202303301453`，移除MSC磁盘
  2. 变更：基于`V00.25-202303301453`，增加CMSIS-DAP V1接口
* [V00.16-202207161200](../_static/firmware/vllink_basic.SVCommon0016202207161200.zip)
  1. 修复：修复CDC串口notify短点持续halt造成CDC功能不稳定的问题
  2. 优化：STA将自动记录第一次连接的AP信息，并在下次启动时，自动连接此AP，以加快连接速度
  3. 优化：将内核供电改为DCDC模式，大约能降低8mA@5V的工作电流
  4. 优化：修复配置文件字符串判定对'\r\n'依赖的兼容性问题
