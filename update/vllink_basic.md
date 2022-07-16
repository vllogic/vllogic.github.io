# Vllink Basic 固件更新

## 更新方法
1. 解压压缩包
2. 按住按键连接Win10电脑，再使用Chrome浏览器打开更新页面 [WebDFU@Github](https://devanlai.github.io/webdfu/dfu-util/)或[WebDFU@Gitee](https://talpachen.gitee.io/webdfu/dfu-util/)
3. 点击`Connect`，找到`Vllink Basic DFU Bootloader`并双击
4. 在`Firmware Download`栏目中选中解压得到.bin文件
5. 点击`Download`，等待一段时间后，完成更新。

## 固件列表
### CMSIS-DAP V2、CDC、MSC接口固件 
* [V00.16-202207161200](../_static/firmware/vllink-basicsvcommon0016202207161200.zip)
  1. 修复：修复CDC串口notify断点持续halt造成CDC功能不稳定的问题
  2. 优化：STA将自动记录第一次连接的AP信息，并在下次启动时，自动连接此AP，以加快连接速度
  3. 优化：将内核供电改为DCDC模式，大约能降低8mA@5V的工作电流
  4. 优化：修复配置文件字符串判定对'\r\n'依赖的兼容性问题
