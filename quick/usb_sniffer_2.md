# USB Sniffer 2 快速上手

## 注意：施工中

## 一、简介
|铝合金外壳|PCBA|
|:--:|:--:|
|![](../_static/picture/usb_sniffer_45.png)|![](../_static/picture/usb_sniffer_2.pcba_text.800x595.png)|

&emsp;&emsp;本产品为第二代USB协议分析工具，可配合 [Wireshark](https://www.wireshark.org/) 进行实时协议解析，支持`USB低速`、`USB全速`及`USB高速`。

&emsp;&emsp;在上一代基础上，本版本将主控由`CY7C68013A`升级为支持`USB3.0`的`CH32H417`，数据上报带宽可超过 400 MB/s；同时移除了对高速 USB 信号有影响的比较器，并优化 FPGA 算法，基于 PHY 层数据智能识别链路状态与传输速率。此外，预留`40Pin FFC`接口，内含 10 对 LVDS 差分信号（兼容 MIPI D-PHY），具备很强的扩展能力。

&emsp;&emsp;产品硬件及上位机开源，支持二次开发。资料如下：
&emsp;&emsp;&emsp;* [原理图](https://todo)
&emsp;&emsp;&emsp;* [上位机源码](https://todo)
 
## 二、快速上手
### 2.1 资源整合包
* [下载源一：百度网盘](https://todo)
* [下载源二：Github Release](https://todo)
### 2.2 软件安装
* **方法一：解包即用**
    1. 解压整合包中的`WiresharkPortable64_4.4.9.paf.zip`
    2. 文件夹`WiresharkPortable64_4.4.9.paf`下的`WiresharkPortable64.exe`即为捕获软件
* **方法二：逐步安装**
    1. 安装整合包中的`Wireshark-4.4.9-x64.exe`，或从 [Wireshark官网](https://www.wireshark.org/) 下载最新版安装
    2. 启动`Wireshark`，点击`帮助`-`关于Wireshark`-`文件夹`，打开`Global Extcap path`文件夹，将整合包中的`usb_sniffer_win.exe`拷贝至此文件夹中，该插件亦可通过 [源码](https://github.com/vllogic/ataradov.usb-sniffer/tree/main/software) 自行构建
    3. 重启`Wireshark`，确保插件被载入
### 2.3 Wireshark捕获
|接线示例，图中黑线接`Wireshark`主机，白线接`采集对象母口`，蓝牙狗为`采集对象设备`|
|:--:|
|![](../_static/picture/usb_sniffer_example.png)|
1. 使用附件中的较长的编织线连接`Wireshark`主机`推荐主板上的USB3.0母口`与`分析仪带灯一侧TYPE-C口`
2. 使用附件中较短的屏蔽线连接`采集对象母口`与`分析仪无灯一侧TYPE-C口`
3. 启动`Wireshark`，在`捕获`中会出现一个`USB Sniffer`，点击其齿轮，根据目标设备速度选择`采集速度`，推荐勾选`Fold empty frames(折叠空帧)`，点击开始
4. 连接`采集对象设备`与`A母`。正常情况下，USB通讯立即开始，Wireshark中会显示捕获到的数据
### 2.4 Wireshark分析示例
1. `高速`U盘
    * [sniffer_hs_USBFlashDisk.pcapng](../_static/docs/sniffer_hs_USBFlashDisk.zip)
2. `高速`Vllink Basic2调试器
    * [sniffer_hs_VllinkBasic2.pcapng](../_static/docs/sniffer_hs_VllinkBasic2.zip)
3. `全速`CSR 4.0 蓝牙狗
    * [sniffer_fs_csr4.0.pcapng](../_static/docs/sniffer_fs_csr4.0.pcapng.zip)
4. `全速`游戏手柄
    * [sniffer_fs_gamepad.pcapng](../_static/docs/sniffer_fs_gamepad.zip)
### 2.5 Wireshark分析-以`高速`U盘为例
* 默认会显示从底层到高层所有数据
* 在`应用显示过滤器...`或快捷键`Ctrl-/`中，输入如下表规则，可以更直观的观察所需数据
* `Wireshark`支持非常多的高层次协议解析，如`usbhid`、`bluetooth`等，在某些场景极具优势

|过滤规则`syslog`|过滤规则`usbll`|过滤规则`usb`|过滤规则`usbms`|
|:--:|:--:|:--:|:--:|
|![](../_static/picture/sniffer_hs_USBFlashDisk_f_syslog.png)|![](../_static/picture/sniffer_hs_USBFlashDisk_f_usbll.png)|![](../_static/picture/sniffer_hs_USBFlashDisk_f_usb.png)|![](../_static/picture/sniffer_hs_USBFlashDisk_f_usbms.png)|

## 三、常见问题
1. * 问：捕获时能否自动识别速度，无需提前选定速度模式
   * 答：第二代已支持，如果自动模式未正确切换，可以手动选定速度模式
2. * 问：能否支持[USB PACKET VIEW](https://www.usbpacketviewer.com/download/)
   * 答：不支持实时捕获，但可以导入分析，详见此网站第九章[hellofpga.com_usb-sniffer](http://www.hellofpga.com/index.php/2025/04/03/usb-sniffer/)
3. * ~~问：捕获时，`Time`栏时间戳比现实时间慢，或者在使用过滤器后，不能实时观察到期望数据~~
   * ~~答：这是因为Wireshark显示层无法实时显示大量数据，提供几种方案~~
      1. ~~勾选`Fold empty frames`，折叠空帧，推荐~~
      2. ~~在`Wireshark`菜单栏中，取消`视图`->`着色分组列表`，这个功能对网络分析有用，但对大部分USB分析无意义~~
      3. ~~勾选`Exclude Line State`，排除线路状态报文~~

## 四、二次开发
&emsp;&emsp;**`重要提示：`** **二次开发不提供技术支持，且开发过程中的焊接、烧录等行为会使得产品无法享受质保服务。**
### 4.1 CH32417部分
* TODO

### 4.2 H7P20部分
* TODO

## 五、交流群
* QQ群：635683631
