# USB Sniffer 2 二次开发说明

## 注意事项
* 本PCBA是针对USB协议分析仪产品开发，兼顾实现开源硬件二次开发。故H7P20默认处于PS模式，其码流在上电时由CH32H417载入。
* 为了实现载入工作，部分UHSIF引脚对接了H7P20的PS码流相关引脚。
* 当需要二次开发时，一般建议将H7P20切换到AS模式，补焊1.8V SPI FLASH。
* 在AS模式下，需要严格注意在不同阶段，相关复用脚的输入输出特性，避免冲突，涉及脚如下：`UHSIF_AF_MOSI`、`UHSIF_RDNE_SCK`以及`UHSIF_WRNF_CSN`

## 准备：调整到AS模式
1. 短接JP2，移除JP101与JP102上的电阻
2. 补焊1.8V SPI FLASH，推荐`P25Q80L-SSH-IT`，如果需要开发ARM程序也可以用更大的FLASH

## AS模式注意点
1. H7P20的`IO19_MISO1_1`、`IO18_PCCLK_1`以及`IO12_CSN_1`三个脚必须在启动后切换到输入模式
2. H7P20需要通过一个IO显示告知CH32H417自身码流已完成载入，推荐使用`UHSIF_SEL1_PC2`。
3. CH32H417启动后将PC2置为下拉输入，在检测到PC2变成高电平后，再启用UHSIF接口
