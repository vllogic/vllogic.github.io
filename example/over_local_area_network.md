# 局域网使用
* 本文所述功能适用于`Vllink Basic2`，固件版本不应小于`V00.20`

## 一、准备工作
* 准备一个或两个路由器作为调试器的接入点，推荐将其5GWifi配置成`Wifi6`、`20MHz`、`165信道`模式
* 验证接入点接入的两个无线设备可获得局域网IP，并可建立TCP连接

## 二、配置AP端
* 将AP端接上电脑
* 打开[配置页](https://vllogic.com/_static/tools/web_config_basic2/)，在网页中连接
* 作如下设置，无关项未列出：
    ```
    Mode=wirelesshost
    Mode2_STA=enable
    Wireless_Device_SSID=接入点1_SSID
    Wireless_Device_Password=接入点1_密码
    ```
* 点击同步设置
* 重新上电，等待连上接入点，连接完成后，蓝灯双闪
* 从局域网DHCP路由获取AP端的局域网IP，例如`192.168.6.123`

## 三、配置STA端
* 将STA端接上电脑并切换到有线模式
* 打开[配置页](https://vllogic.com/_static/tools/web_config_basic2/)，在网页中连接
* 作如下设置，无关项未列出：
    ```
    Mode=wirelessdevice
    Mode3_SERVER_IPV4=192.168.6.123
    Wireless_Device_SSID=接入点2_SSID
    Wireless_Device_Password=接入点2_密码
    ```
* 点击同步设置
* 重新上电，等待连上接入点，连接完成后，绿灯双闪
* 正常情况下，AP端蓝灯常亮、STA端绿灯常亮

## 四、速度测试
### 4.1 单接入点
| IDE and Interface | Ram Write | Flash Write |
| :----: | :----: | :----: |
| OpenOCD V2-SWD 20M | 292KB/S | 50KB/S |
| IAR-DAP V2-SWD 20M| 78KB/S | 37KB/S |
### 4.2 双接入点
| IDE and Interface | Ram Write | Flash Write |
| :----: | :----: | :----: |
| OpenOCD V2-SWD 20M | 255KB/S | 50KB/S |
| IAR-DAP V2-SWD 20M | 68KB/S | 34KB/S |
