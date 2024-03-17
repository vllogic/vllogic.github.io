# Segger Embedded Studio 使用说明
## Jlink兼容方式
* 注意：此软件禁止在`商业用途`中使用CMSIS-DAP调试器，故此方式仅针对`教育及非商业用途`。
### 截止20230415，此软件仅支持CMSIS-DAP V1接口。需要使用带有CMSIS-DAP V1接口的固件：
*注：Basic2出厂固件自带V1接口，无需切换固件*
* [下载页面](../update/vllink_basic.md)
* 可仅升级主机端硬件（即连接电脑的那个）
### 配置方式
1. 打开`Project`的`Options`窗口
2. 在`Debug`的`Debugger`子页中，将`Target Connection`改成`J-Link`

## GDB方式
* 此方式无使用限制
* 参考上文，将`Target Connection`改成`GDB Server`
* GDB Server可通过OpenOCD等开源软件实现
