# Hercules 命令详解

## @20230405 以下所有内容作废，待更新

## 注意
* 本章节所使用的命令可通过`Init_CMD=`自动执行，或通过`CDC_Shell`手动执行
* Hercules 系列命令尚处于开发后期，部分命令可能有所变动

## `help` 子命令
* 示例
   ```
   Hercules Programmer
   -- Powered By Vllogic
   help:
         Display help.
   test:
         Auto probe and test connected chip, Include Efuse and Flash.
   test probe:
         Auto probe connected chip.
   test flash:
         Auto probe and test connected chip, Inculde Flash.
   test efuse:
         Auto probe and test connected chip, Inculde Efuse.
   chip [<chip name>] [write] [quick] <file path> <size>:
         Chip OP.
   flash [<chip name>] [erase] [write] [compare] [dump] [autoreset] [<file path>] <addr> <size>:
         Flash OP.
   efuse <chip name[.<idx>]> write <compare hex> <write hex>:
         Efuse Write
   efuse <chip name[.<idx>]> compare <hex>:
         Efuse Compare
   vddq <mV>:
         Set VDDQ voltage
   efuseclk <Hz>:
         Set Efuse Clk output frequency
   ```

## `test` 子命令
* 示例1
   ```
   >>>hercules test
   Test: Find Device M7
   Test (1/3): Signal Check
   Max Speed 20000kHz
   Flash capacity 2048KB
   Test (2/3): Efuse Check
   0:  1000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   0:  1000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   1:  2000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   1:  2000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   2:  4000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   2:  4000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   3:  8000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   3:  8000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   4: 12000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   4: 12000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   5: 15000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   5: 15000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   6: 20000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   6: 20000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   Test (2/3): Efuse Check Finished
   Test (3/3): Flash Check
   Test (3/3): Flash Capcity 2048KB
   0:  1000kHz Check Size   64KB: Erase  654KB/Sec, Write   94KB/Sec, Read  114KB/Sec
   1:  2000kHz Check Size   64KB: Erase  423KB/Sec, Write  170KB/Sec, Read  228KB/Sec
   2:  4000kHz Check Size  128KB: Erase  515KB/Sec, Write  282KB/Sec, Read  444KB/Sec
   3:  8000kHz Check Size  256KB: Erase  469KB/Sec, Write  298KB/Sec, Read  916KB/Sec
   4: 12000kHz Check Size  384KB: Erase  408KB/Sec, Write  323KB/Sec, Read 1229KB/Sec
   5: 15000kHz Check Size  512KB: Erase  407KB/Sec, Write  350KB/Sec, Read 1502KB/Sec
   6: 20000kHz Check Size  640KB: Erase  403KB/Sec, Write  364KB/Sec, Read 1865KB/Sec
   Test All Finished, Exit
   ```
* 示例2
   ```
   >>>hercules test probe
   Test: Find Device M7
   Test (1/3): Signal Check
   Max Speed 20000kHz
   Test (2/3): Efuse Check
   Test (2/3): Efuse Check Skip
   Test (2/3): Efuse Check Finished
   Test (3/3): Flash Check
   Test (3/3): Flash Check Skip
   Test All Finished, Exit
   ```
* 示例3
   ```
   >>>hercules test flash
   Test: Find Device M7
   Test (1/3): Signal Check
   Max Speed 20000kHz
   Flash capacity 2048KB
   Test (2/3): Efuse Check
   Test (2/3): Efuse Check Skip
   Test (2/3): Efuse Check Finished
   Test (3/3): Flash Check
   Test (3/3): Flash Capcity 2048KB
   0:  1000kHz Check Size   64KB: Erase  415KB/Sec, Write   94KB/Sec, Read  114KB/Sec
   1:  2000kHz Check Size   64KB: Erase  395KB/Sec, Write  170KB/Sec, Read  228KB/Sec
   2:  4000kHz Check Size  128KB: Erase  405KB/Sec, Write  281KB/Sec, Read  444KB/Sec
   3:  8000kHz Check Size  256KB: Erase  401KB/Sec, Write  298KB/Sec, Read  919KB/Sec
   4: 12000kHz Check Size  384KB: Erase  397KB/Sec, Write  322KB/Sec, Read 1232KB/Sec
   5: 15000kHz Check Size  512KB: Erase  394KB/Sec, Write  350KB/Sec, Read 1501KB/Sec
   6: 20000kHz Check Size  640KB: Erase  394KB/Sec, Write  366KB/Sec, Read 1861KB/Sec
   Test All Finished, Exit
   ```
* 示例4
   ```
   >>>hercules test efuse
   Test: Find Device M7
   Test (1/3): Signal Check
   Max Speed 20000kHz
   Test (2/3): Efuse Check
   0:  1000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   0:  1000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   1:  2000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   1:  2000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   2:  4000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   2:  4000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   3:  8000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   3:  8000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   4: 12000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   4: 12000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   5: 15000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   5: 15000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   6: 20000kHz Efuse0 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   6: 20000kHz Efuse1 Compare All-Zero Result e1, Conpare 0xFFFFFFFF Result e1, Unexpect
   Test (2/3): Efuse Check Finished
   Test (3/3): Flash Check
   Test (3/3): Flash Check Skip
   Test All Finished, Exit
   ```

## `chip` 子命令
* `hercules chip M7 write /data/top_bin.acf.bin 0x248C`：将文件`/data/top_bin.acf.bin`中前0x248C字节写入M7芯片

## `flash` 子命令
* `hercules flash M7 erase write compare autoreset /data/top_bin.acf.bin 0x10000`：将文件`/data/top_bin.acf.bin`中前0x10000字节写入M7芯片Flash，写入完成后进行读取比较，并自动重启芯片

## `auto` 子命令
* `hercules auto M7 trig_vref flash autoreset /data/top_bin.acf.bin 0x0 0x80000`：在检测到Vref电平后，将文件`/data/top_bin.acf.bin`中前0x80000字节写入M7芯片Flash，并自动重启芯片

## `efuse` 子命令
暂略

## `vddq` 子命令
* `hercules vddq 0`：VDDQ输出0V
* `hercules vddq 1800`：VDDQ输出1.8V
* `hercules vddq 2500`：VDDQ输出2.5V
* `hercules vddq 3300`：VDDQ输出3.3V
* `hercules vddq 4000`：VDDQ输出4.0V

## `efuseclk` 子命令
* `hercules efuseclk 16000000`：输出16M时钟
