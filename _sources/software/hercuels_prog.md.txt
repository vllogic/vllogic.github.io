# 京微齐力（Hercules）离线编程
* *支持硬件：`Vllink 2X`*
* *支持硬件：`Vllink Basic2`*

## 一、准备工作
### 1.1 接口准备
* `Vllink 2X`与`Vllink Basic2`的接口不兼容京微齐力标准接口，必须通过转接板转接！！！
* 目前有两种转接板，分别是 [通用型转接板](../hardware/vllink_basic2_to_fpga.md) 与 [专用型转接板](../hardware/convbrd.md)
### 1.2 固件准备
* 在`Fuxi`中生成`.acf`格式的固件
* 依次点击菜单栏中的`Tools`->`Command-Line Windows...`，打开`Fuxi Design Console`
* 执行：`acftobin.exe ./outputs/your_project_name.acf`，就会在`./outputs`目录下生成`your_project_name.acf.bin`
* 记录`your_project_name.acf.bin`的文件长度，当前尚未支持固件压缩，所以长度不得超过1MB
  ```
  $ ls -al ./outputs/*.bin
  -rwxrwx---+ 1 xxx xxx 555020 May  1 14:02 ./outputs/your_project_name.acf.bin
  ```
* 十进制`555020`换算成十六进制，即：`0x8780C`，用例中会用到
### 1.3 离线编程器准备
* 将离线编程器固件升级到 [V00.51-202605011439](../_static/firmware/vllink_basic2.SVCommon0051202605011439.zip) 或更高
* 通过 [Vllink 2026 Console](https://vllogic.com/_static/tools/vllink2026_console/) 将`your_project_name.acf.bin`载入`Data Block 0`
* 修改运行模式`Mode=customize`，此模式会强制配置`Vref_Voltage_mV=0`与`Vout=disable`
* 根据需要修改`Customize_CMD`，修改方法见下文

## 二、命令
* `hercules_prog`：京微齐力编程命令
### 2.1 子命令综述
| 子命令 | 功能 | 状态 |
| :---: | :---: | :---: |
| `auto` | 自动化执行离线编程功能 | 开发中 |
### 2.2 子命令说明-`auto`
* 命令格式：`hercules_prog auto [target_type] [trig_type] <lz4> <autoreset> <boost> <flash [data_select] [addr] [size]> <chip [data_select] [size]>`
* `target_type`：芯片类型，必填
  | `target_type` | 芯片类型 |
  | :---: | :--- |
  | `M5` | M5系列 |
  | `M7` | M7系列 |
  | `HR02` | HR02系列 |
  | `H1D03` | H1D03系列 |
  | `P1` | P1系列 |
  | `H3` | H3系列 |
  | `P0` | P0系列 |
  | `H7` | H7系列 |
* `trig_type`：触发方式，必填
  | `trig_type` | 触发方式 |
  | :---: | :--- |
  | `trig_vref` | VRef脚电平上升沿触发 |
  | `trig_button` | 按键按下事件触发 |
  | `trig_once` | 触发一次后退出 |
* 【暂未支持】~~`lz4`：声明载入编程器的数据文件是lz4压缩格式，选填~~
* `autoreset`：操作完毕后复位芯片，选填
* `boost`：以最高可探测档位时钟与目标芯片通讯，可获得最快编程速度，但不建议启用，选填
* `flash [data_select] [addr] [size]`：对Flash编程
  1. `data_select`：当前仅支持`data0`，使用 [Vllink 2026 Console](https://vllogic.com/_static/tools/vllink2026_console/) 载入
  2. `addr`：目标Flash的编程起始地址，一般填入`0x0`，必须是以`0x`开头的十六进制
  3. `size`：目标Flash的编程长度，建议使用所载入文件的长度，且必须是以`0x`开头的十六进制
* `chip [data_select] [size]`：对Chip编程
  1. `data_select`：当前仅支持`data0`，使用 [Vllink 2026 Console](https://vllogic.com/_static/tools/vllink2026_console/) 载入
  2. `size`：目标Chip（SRAM）的编程长度，建议使用所载入文件的长度，且必须是以`0x`开头的十六进制
* 补充说明：`chip`与`flash`互斥，不能同时使用；`chip`也不要与`autoreset`同时使用
### 2.3 子命令用例-`auto`
* 例1：`Customize_CMD=hercules_prog auto H7 trig_vref autoreset flash data0 0x0 0x8780C`
  1. 目标芯片是HME-H7；通过VRef脚探测目标板的IO电平触发编程；烧录完成后自动复位芯片
  2. 烧录对象是Flash，对象Flash的烧录起始地址是0，长度是0x8780C
* 例2：`Customize_CMD=hercules_prog auto H7 trig_button boost chip data0 0x8780C`
  1. 目标芯片是HME-H7；通过烧录器的按键按下事件触发编程；使用最高可用档位时钟通讯
  2. 烧录对象是Chip，长度是0x8780C
