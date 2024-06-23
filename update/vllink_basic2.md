# Vllink Basic2 固件更新

## 更新方法
1. 解压压缩包
2. 按住按键连接Win10电脑，再使用Chrome浏览器打开更新页面 [Vllink HID Update](https://vllogic.com/_static/tools/update/)
3. 点击`Connect Vllink Device`，在对话框中选中`Vllink Basic2 Update`再点击`连接`
4. 在`Firmware Update`栏目中选中解压得到.bin文件
5. 点击`Update`，等待一段时间后，完成更新。

## 固件列表
* [V00.12-202406211323](../_static/firmware/vllink_basic2.SVCommon0012202406211323.zip)
  1. 调整：默认不启用`MFP特性`，如需启用，要配置：`Wireless_ATTR=[wifi][mfp]`并重新上电
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
