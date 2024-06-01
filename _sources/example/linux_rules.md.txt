# Linux下非root用户授权

## 未授权时
### 1. 访问CMSIS-DAP接口
```
$ openocd -f interface/cmsis-dap.cfg
Open On-Chip Debugger 0.12.0
Licensed under GNU GPL v2
For bug reports, read
        http://openocd.org/doc/doxygen/bugs.html
Info : Listening on port 6666 for tcl connections
Info : Listening on port 4444 for telnet connections
Warn : An adapter speed is not selected in the init scripts. OpenOCD will try to run the adapter at the low speed (100 kHz)
Warn : To remove this warnings and achieve reasonable communication speed with the target, set "adapter speed" or "jtag_rclk" in the init scripts.
Error: unable to open CMSIS-DAP device 0x1209:0x6666
Error: unable to find a matching CMSIS-DAP device
```
### 2. 访问串口
```
$ stty -F /dev/ttyACM0
stty: /dev/ttyACM0: Permission denied
```

## 授权步骤

### 用到的文件
* [99-vllogic.rules](../_static/docs/99-vllogic.rules)

## 授权后
