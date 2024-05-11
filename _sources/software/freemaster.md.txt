# FreeMASTER 使用说明
## 截止20230405，此软件仅支持CMSIS-DAP V1接口。需要使用带有CMSIS-DAP V1接口的固件：
### Vllink Basic
  * [下载页面](../update/vllink_basic.md)
  * 可仅升级主机端硬件（即连接电脑的那个）
### Vllink Basic2
  * 若固件版本小于V0.08，直接支持
  * 若固件版本为V0.08，请升级至更高版本固件
  * 若固件版本不小于V0.09，需配置`AS_ARM_MBED=enable`并重新上电，[配置工具](https://vllogic.com/_static/tools/web_config_basic2/)

## 配置方式
![](../_static/picture/freemaster_config.png)
