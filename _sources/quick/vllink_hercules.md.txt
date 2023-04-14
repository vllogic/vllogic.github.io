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
### 4.1 准备工作
1. 使用支持`WebUSB`的浏览器打开[在线下载](https://vllogic.com/_static/tools/web_download_hercules/)
2. 调试器连接电脑，调试器通过牛角排线连接开发板
3. 开发板上电
### 4.2 说明
* 在线下载界面如下：
  ![](../_static/picture/web_download_hercules.png)
* 连接调试器：点击`Connect Vllink Hercules`，在对话框中选中设备并点击`连接`
* 连接后，`Chip Info`区域会显示当前开发板芯片类型，Flash容量
* `Chip Info`区域中的`Auto Probe`默认勾选，此选项会使调试器持续与开发板通讯，检测开发板状态
* `Flash Download`区域用于Flash下载，支持`bin`及`acf`格式的文件
* `Flash Read`区域用于Flash全片读取
* `Chip Download`区域用于Chip下载，下载完成后会自动运行，一般用于开发阶段快速运行码流，重新上电后此码流丢弃
### 4.3 示例 HME-H3
1. 根据`4.1`完成准备工作，参考`4.2`完成连接，`Chip Info`区域出现H3芯片信息
2. `Flash Download`：选择需要烧录的固件，再点击Update，进度条跑完后即完成下载
3. `Flash Download`->`Auto Run`：勾选此项将在下载完成后，自动运行所下载的固件
4. `Flash Read`：点击`Save`，会将芯片中的Flash数据下载出来
5. `Chip Download`：
6. 由于调试器连接目标芯片会导致芯片暂停，故在使能`Auto Run`的下载完成或`Chip Download`完成之后，调试器将停止自动探测开发板。如需再次执行操作，请勾选`Auto Probe`，或手动点击`Probe`按钮
### 4.4 示例 HME-H1C02
1. 根据`4.1`完成准备工作，参考`4.2`完成连接，`Chip Info`区域出现H1C02芯片信息
2. `Flash Download`：选择需要烧录的固件，再点击Update，进度条跑完后即完成下载
3. `Flash Download`->`Auto Run`：勾选此项将在下载完成后，自动运行所下载的固件
4. `Flash Read`：点击`Save`，会将芯片中的Flash数据下载出来
5. `Chip Download`：
6. 由于调试器连接目标芯片会导致芯片暂停，故在使能`Auto Run`的下载完成或`Chip Download`完成之后，调试器将停止自动探测开发板。如需再次执行操作，请勾选`Auto Probe`，或手动点击`Probe`按钮
### 4.5 示例 HME-HR02
1. 根据`4.1`完成准备工作，参考`4.2`完成连接，`Chip Info`区域出现HR02芯片信息
2. `Flash Download`：选择需要烧录的固件，再点击Update，进度条跑完后即完成下载
3. `Flash Download`->`Auto Run`：勾选此项将在下载完成后，自动运行所下载的固件
4. `Flash Read`：点击`Save`，会将芯片中的Flash数据下载出来
5. `Chip Download`：
6. 由于调试器连接目标芯片会导致芯片暂停，故在使能`Auto Run`的下载完成或`Chip Download`完成之后，调试器将停止自动探测开发板。如需再次执行操作，请勾选`Auto Probe`，或手动点击`Probe`按钮
### 4.6 示例 HME-M5
1. 根据`4.1`完成准备工作，参考`4.2`完成连接，`Chip Info`区域出现M5芯片信息
2. `Flash Download`：选择需要烧录的固件，再点击Update，进度条跑完后即完成下载
3. `Flash Download`->`Auto Run`：勾选此项将在下载完成后，自动运行所下载的固件
4. `Flash Read`：点击`Save`，会将芯片中的Flash数据下载出来
5. `Chip Download`：
6. 由于调试器连接目标芯片会导致芯片暂停，故在使能`Auto Run`的下载完成或`Chip Download`完成之后，调试器将停止自动探测开发板。如需再次执行操作，请勾选`Auto Probe`，或手动点击`Probe`按钮
### 4.7 示例 HME-M7
1. 根据`4.1`完成准备工作，参考`4.2`完成连接，`Chip Info`区域出现M7芯片信息
2. `Flash Download`：选择需要烧录的固件，再点击Update，进度条跑完后即完成下载
3. `Flash Download`->`Auto Run`：勾选此项将在下载完成后，自动运行所下载的固件
4. `Flash Read`：点击`Save`，会将芯片中的Flash数据下载出来
5. `Chip Download`：
6. 由于调试器连接目标芯片会导致芯片暂停，故在使能`Auto Run`的下载完成或`Chip Download`完成之后，调试器将停止自动探测开发板。如需再次执行操作，请勾选`Auto Probe`，或手动点击`Probe`按钮

## 五、离线编程器配置说明
### 5.1 准备工作
### 5.2 说明
* 配置网页界面如下：
  ![](../_static/picture/web_config.png)
* 更多命令细节，请访问[Hercules 命令说明](../software/hercuels_command.md)
### 5.3 示例 HME-H3
### 5.4 示例 HME-H1C02
### 5.5 示例 HME-HR2
### 5.6 示例 HME-M5
### 5.7 示例 HME-M7

