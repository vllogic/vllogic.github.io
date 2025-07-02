# OpenOCD 使用说明
## 0.11及以上版本支持CMSIS-DAP V2
## 推荐使用最新latest版本，无线速度相比`v0.12`提升12倍
  * [合并一些国产支持的版本](https://github.com/vllogic/openocd_cmsis-dap_v2/releases/tag/20250629)
  * [官方latest源码](https://github.com/openocd-org/openocd/releases/tag/latest)
## 测试例程
* 下载xxx.tar.gz解压后，进入bin目录，启动powershell：
  1. 测试对象AIC8800M，测试命令：`./openocd -s ../scripts -f interface/cmsis-dap.cfg -f target/aic8800.cfg -c "adapter speed 15000; transport select swd; init; halt; dump_image flash_128KB.bin 0x8000000 0x20000; program flash_128KB.bin verify exit 0x08020000"`
  2. 测试对象AT32F405，测试命令：`./openocd -s ../scripts -f interface/cmsis-dap.cfg -f target/at32f405xx.cfg -c "adapter speed 15000; transport select swd; init; halt; dump_image flash_128KB.bin 0x8000000 0x20000; program flash_128KB.bin verify exit 0x08020000"`
* ​例程功能：复位、将flash前128KB复制到其第二个128KB空间内