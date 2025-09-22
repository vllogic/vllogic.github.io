# Vllink Basic2 快速上手

## 一、调试接口定义
![](../_static/picture/basic2_interface_desc_small.png)
| 接口 | 介绍 |
| :---- | :---- |
| TDI  | JTAG数据口 |
| TMS / SWDIO  | JTAG模式口、SWD数据口 |
| TCK / SWCLK  | JTAG时钟口、SWD时钟口 |
| SRST / SWRST  | 芯片复位口 |
| TDO  | JTAG数据口 |
| 5V  | 双向5V电源口<sup>1</sup> |
| GND  | 共地口 |
| VRef  | 参考电平及简易可调电压源<sup>2</sup> |
| TXD  | 串口输出 |
| RXD  | 串口输入 |

  [1] `5V`脚与`USB5V`直通，可对目标板供电，也可以从目标板取电；取电时，推荐电压范围`3.7V-5.5V`，若只有更低电压如3.3V时，需保证电源输出能力及连接线的质量

  [2] [VRef口详细说明](../hardware/vllink_basic2_vref.md)

## 二、模式介绍及切换
### 2.1 恢复出厂及重新配对
* 通电后，长按按键10秒至灯光熄灭，松开后即完成恢复出厂，为了防止电平变化，恢复出厂操作不会改变`VRef`模式
* 恢复出厂后，将两个硬件分别切换到`AP`与`STA`模式，即可进行重新配对

### 2.2 模式切换
* 可通过双击按键切换运行模式
* 基本模式有三种，分别是有线模式、无线接入点模式（AP）以及无线设备模式（STA）

### 2.3 有线模式
* 通电时，所有LED闪烁一次
* 板上黄灯作为`VRef`脚电平指示：常亮表示存在电压；闪烁表示无电压
* USB设备启用，可与计算机通信
* 调试口可连接目标板

### 2.4 无线接入点模式（AP）
* 通电时，所有LED闪烁两次
* 板上黄灯作为`VRef`脚电平指示：常亮表示存在电压；闪烁表示无电压；熄灭表示已连接远端
* 板上蓝灯作为连接指示状态灯，未连接时闪烁、已连接后常亮
* USB设备启用，可与计算机通信
* 注意：若在蓝灯闪烁时，启动调试、CDC串口功能，将会使用板上调试口，而非远端调试口

### 2.5 无线设备模式（STA）
* 通电时，所有LED闪烁三次
* 板上黄灯作为`VRef`脚电平指示：常亮表示存在电压；闪烁表示无电压
* 板上绿灯作为连接指示状态灯，未连接时闪烁、已连接后常亮
* USB设备关闭，不可与计算机通信

### 2.6 有线模式连接示例
![](../_static/picture/vllink_basic2_wired.png)
* 图中调试器为有线模式，USB接计算机，调试口接目标板

### 2.7 无线模式连接示例
#### 2.7.1 STA为目标板供电
![](../_static/picture/vllink_basic2_wireless1.png)
* 图中调试器一个为AP模式，不接目标板；另一个为STA模式，USB接电源、调试口接目标板

#### 2.7.2 目标板为STA供电
![](../_static/picture/vllink_basic2_wireless2.png)
* 图中调试器一个为AP模式，不接目标板；另一个为STA模式，调试口接目标板

## 三、配置工具
  * 链接：[基础配置](https://vllogic.com/_static/tools/web_config_basic2/)
  * 使用说明：
    ```
    1. 使用Chrome内核浏览器打开上述链接
    2. 连接调试器
    3. 点击“Connect Vllink”
    4. 在小弹窗中选中DAP，点击连接
    5. 连接后，上面的常规设置文本即可修改，修改后需要点击“同步设置”保存，注意无效的配置将在同步时被清除
    ```
  * 注意：当电脑端所连的调试器为AP模式，且已连接远端STA，则此工具将读写远端STA的配置。
## 四、注意事项
1. 调试口逻辑电平由`VRef`决定，建议由开发板提供；若将`VRef`改为输出模式，应与目标板逻辑电平一致
2. 升级程序需要使用支持WebUSB的操作系统及浏览器，如Windows10及Chrome内核浏览器
3. Windows7系统用户请参考下方链接安装驱动

## 五、常见问题
1. * 问：能识别`CMSIS-DAP V1`，但`CMSIS-DAP V2`接口消失
   * 答：下载修复工具：[UsbDriverTool](../_static/tools/UsbDriverTool-2.1.zip)，解压运行`UsbDriverTool.exe`，参照下图修复
   ![](../_static/picture/UsbDriverTool_fix.png)
2. * 问：设备管理器内能发现`CMSIS-DAP V2`设备，但是软件却无法访问
   * 答：在设备管理器内，右击`CMSIS-DAP V2`设备，卸载设备，然后重新连接一次
3. * 问：Keil内`Reset and Run`功能无效，即按`F8`下载程序后，程序未自动运行
   * 答：在`Debug`-`CMSIS-DAP - JTAG/SW Adapter`中，选定`CMSIS-DAP v2`即可

## 六、开发工具使用说明
* [Windows7 驱动安装](../software/windows7_driver.md)
* [IAR 使用说明](../software/iar.md)
* [Keil MDK 使用说明](../software/keil_mdk.md)
* [Probe RS 使用说明](../software/probe_rs.md)
* [OpenOCD 使用说明](../software/openocd.md)
* [PyOCD 使用说明](../software/pyocd.md)
* [FreeMASTER 使用说明](../software/freemaster.md)

## 七、进阶使用
### FPGA下载器
* [转接板资料](../hardware/vllink_basic2_to_fpga.md)
### MIPI-10及JTAG-20P转接板
* [转接板资料](../hardware/vllink_basic2_to_mipi10p_jtag20p.md)

## 八、其他
* [A4上手指南](../_static/docs/vllink_basic2.A4上手指南.pdf)
