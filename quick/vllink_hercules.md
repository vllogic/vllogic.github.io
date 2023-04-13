# Vllink Hercules 快速上手

Vllink Hercules是为[京微齐力](http://www.hercules-micro.com/)定制的编程、调试工具

## 一、调试接口定义
![](../_static/picture/hme_interface_desc_small.png)
| 接口 | 介绍 |
| :---- | :---- |
| TCK  | JTAG时钟口 |
| TDO  | JTAG数据口 |
| TMS  | JTAG模式口 |
| NC | 未连接 |
| TDI  | JTAG数据口 |
| GND  | 共地口 |
| VRef  | 参考电压输入口 |
| EFUSE_VDDQ  | EFuse编程电压输出口 |
| EFUSE_CLK  | EFuse编程时钟输出口 |
| GND  | 共地口 |

## 二、功能简述
### 2.1 Hercules标准下载
* [开发中]此接口协议兼容旧款`68013方案`下载器，可对接原厂`Fuxi`开发工具使用
### 2.2 快速在线下载
* 此接口用于实现下载提速，支持Flash读写、Chip写等功能
* [在线下载](https://vllogic.com/_static/tools/web_download_hercules/)，注意，此网页工具需要使用支持`WebUSB`的浏览器打开，如`Edge`
### 2.3 离线编程器
* 此调试器可用于对Hercules芯片离线编程，包括Flash及Efuse
* 离线编程通过[通用配置](https://vllogic.com/_static/tools/web_config/)进行配置
* 支持手动烧录、自动烧录、数量限制、配置数据保护等特性

## 三、固件升级及恢复默认设置
### 3.1 固件升级
* 请访问[Vllink Hercules 固件更新](../update/vllink_hercules.md)
### 3.2 恢复默认设置
在调试器出现异常情况时，可通过以下操作恢复正常功能
1. 参考`3.1`确认已升级至最新固件
2. 打开[通用配置](https://vllogic.com/_static/tools/web_config/)
3. 点击`Connect Vllink`，在对话框中选中设备并点击`连接`
4. 将以下文本覆盖到`文本->常规设置`栏下
    ```
    MODE=
    Mode_Quick_Switch=
    Vout=
    Vout_Key_Reset=
    Vout_Voltage_mV=
    CDC_Shell=
    Dap_Resp_Overtime_Discard=
    Srst_Clear_Attach_Write=
    Mac_Addr=
    Wireless_ATTR=
    Wireless_Host_Channel=
    Wireless_Host_SSID=
    Wireless_Host_Password=
    ```
5. 将以下文本覆盖到`文本->自定义设置`栏下
    ```
    Customize_Wireless_Host=
    Customize_Wireless_Device=
    Customize_DATA_AREA_SIZE=
    Customize_DATA_FILE1_NAME=
    Customize_DATA_FILE1_ATTR=
    Customize_DATA_FILE1_SIZE=0
    Customize_DATA_FILE2_NAME=
    Customize_DATA_FILE2_ATTR=
    Customize_DATA_FILE2_SIZE=0
    Customize_DATA_FILE3_NAME=
    Customize_DATA_FILE3_ATTR=
    Customize_DATA_FILE3_SIZE=0
    Customize_DATA_FILE4_NAME=
    Customize_DATA_FILE4_ATTR=
    Customize_DATA_FILE4_SIZE=0
    Customize_DATA_FILE5_NAME=
    Customize_DATA_FILE5_ATTR=
    Customize_DATA_FILE5_SIZE=0
    Customize_DATA_FILE6_NAME=
    Customize_DATA_FILE6_ATTR=
    Customize_DATA_FILE6_SIZE=0
    Customize_DATA_FILE7_NAME=
    Customize_DATA_FILE7_ATTR=
    Customize_DATA_FILE7_SIZE=0
    Customize_DATA_FILE8_NAME=
    Customize_DATA_FILE8_ATTR=
    Customize_DATA_FILE8_SIZE=0
    Customize_DATA_FILE9_NAME=
    Customize_DATA_FILE9_ATTR=
    Customize_DATA_FILE9_SIZE=0
    Customize_CMD_INIT=
    Customize_CMD_POLL=
    ```
6. 点击`同步设置`
7. 对调试器重新上电，恢复默认设置完成

## 四、快速在线下载使用说明
### 4.1 说明
### 4.2 示例 HME-M5
### 4.3 示例 HME-M7
### 4.4 示例 HME-H1C02
### 4.5 示例 HME-HR2
### 4.6 示例 HME-H3
### 4.7 示例 HME-H3

## 五、离线编程器配置说明
### 5.1 说明
### 5.2 示例 HME-M5
### 5.3 示例 HME-M7
### 5.4 示例 HME-H1C02
### 5.5 示例 HME-HR2
### 5.6 示例 HME-H3
### 5.7 示例 HME-H3

## 离线编程功能
### 简易演示
1. 将编程器连接电脑，等待出现`Vllink CFG`磁盘，若无磁盘出现，则需双击按键进入模式1
2. 修改磁盘中的`basic_config.txt`文件，如下：
    ```
    ### Vllink Basic Config ###

    # Mode=1: USBD + IF; Mode=2: USBD + AP; Mode=3: STA + IF; Mode=4: User Define;
    MODE=4

    # END
    ```
3. 修改磁盘中的`mode4_config.txt`文件，如下：
    ```
    ### Vllink Basic Mode4 Config ###

    # Mode4=disable; Mode4=enable;
    Mode4=enable

    # USBD=disable; USBD=enable;
    USBD=enable

    # CDC_Shell=disable; CDC_Shell=enable;
    CDC_Shell=enable

    # Init_CMD=<cmd>: 128bytes max;
    Init_CMD=hercules auto M7 trig_vref flash autoreset /data/top_bin.acf.bin 0x0 0x80000

    # Data1_Name=<name>: Path: /data/<name>, 32bytes max
    Data1_Name=top_bin.acf.bin

    # Data1_Size
    Data1_Size=512

    # END
    ```
4. 保存文件后，重新上电一次
5. 将M7芯片的bin固件改名为`top_bin.acf.bin`，覆盖到`/data`路径下
### 配置文件说明
#### `basic_config.txt`
* `MODE=4`：选定了模式4
#### `mode4_config.txt`
* `Mode4=enable`：启用模式4
* `USBD=enable`：启用模式4下的USB Device
* `CDC_Shell=enable`：启用模式4下的USB CDC Shell
* `Init_CMD=...`：配置模式4的上电启动命令
* `Data1_Name=top_bin.acf.bin`：在`/data`路径下生成一个bin文件，用于存储固件
* `Data1_Size=512`：指定上述bin文件的长度，此处为512KB

## 进阶资料
