# 京微齐力（Hercules）离线编程使用说明
* *支持硬件：`Vllink 2X`*
* *支持硬件：`Vllink Basic2`*

## 一、主命令
* `hercules_prog`：离线编程命令
  
## 二、子命令综述
| 子命令 | 功能 | 状态 |
| :---: | :---: | :---: |
| `auto` | 自动化执行离线编程功能 | 开发中 |

### 2.1 子命令-`auto`
* 命令格式：`hercules_prog auto [target_type] [trig_type] <lz4> <autoreset> <boost> <flash [data_select] [addr] [size]> <chip [data_select] [size]>`
* `target_type`：芯片类型，必填
  | `target_type` | 芯片类型 |
  | :---: | :--- |
  | `M5` | M5系列 |
  | `M7` | M7系列 |
  | `HR02` | HR02系列 |
  | `H1D03` | H1D03系列 |
  | `P1` | M5系列 |
  | `H3` | M5系列 |
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
  2. `size`：目标Flash的编程长度，建议使用所载入文件的长度，且必须是以`0x`开头的十六进制
* 补充说明：`chip`与`flash`互斥，不能同时使用；`chip`也不要与`autoreset`同时使用
* 例1：TODO
  1. 
  2. 
* 例2：TODO
  1. 
  2. 
* 例3：TODO
  1. 
  2. 