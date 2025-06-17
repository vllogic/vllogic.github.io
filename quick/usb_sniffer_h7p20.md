# USB Sniffer H7P20 快速上手

## 一、简介
&emsp;&emsp;本硬件基于 [ataradov.usb-sniffer](https://github.com/ataradov/usb-sniffer) 复刻，并继续以`BSD-3-Clause license`协议开源。核心变动是将其`Lattice LCMXO2`替换为`HME H7P20`。

* [PCB图纸](https://github.com/vllogic/dalishen_pi_h7p20/tree/main/hardware/usb_sniffer_h7p20)
* [FPGA代码](https://github.com/vllogic/dalishen_pi_h7p20/tree/main/examples/usb_sniffer_h7p20.ataradov.usb_sniffer)

## 二、快速上手
1. 从 [Wireshark官网](https://www.wireshark.org/) 下载Wireshark并安装
2. 下载 [驱动及插件](../_static/driver/vllogic.usb_sniffer.zip) 并解压，此插件亦可通过 [源码](https://github.com/vllogic/ataradov.usb-sniffer/tree/main/software) 自行构建
3. 将硬件的`单TYPE-C口`接入电脑，在设备管理中找到设备并更新文件夹中驱动
4. 启动`Wireshark`，点击`帮助`-`关于Wireshark`-`文件夹`，打开`Global Extcap path`文件夹，将`usb_sniffer_win.exe`拷贝至此路径中
5. 重启`Wireshark`，在`捕获`中会出现一个`USB Sniffer`，点击其齿轮，根据目标设备速度选择`采集速度`，推荐勾选`Fold empty frames(折叠空帧)`，点击开始
6. 硬件的另一端，`TYPE-C口`用于连接USB主机，`A母`用于连接USB设备，当然也可以反过来
7. 在目标USB通讯开始后，Wireshark中会显示通讯数据

## 三、二次开发
### 3.1 CY7A68013A部分
* [源码](https://github.com/vllogic/ataradov.usb-sniffer/tree/main/firmware)
* 如何进入Boot：短接PCB上CY7A68013A芯片旁的`Boot`与`VCC`，再连接电脑，即可进行二次编程

### 3.2 H7P20部分
* [源码](https://github.com/vllogic/dalishen_pi_h7p20/tree/main/examples/usb_sniffer_h7p20.ataradov.usb_sniffer)
* 更多开发资料请参考 [大力神派](./dalishen_pi_h7p20.md)

## 四、交流群
* QQ群：635683631
