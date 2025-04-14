# Linux下非root用户授权

**`版权声明：转载需注明来自于 vllogic.com `**

## 一、未授权时
#### 1. 访问CMSIS-DAP接口
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
#### 2. 访问串口
```
$ stty -F /dev/ttyACM0
stty: /dev/ttyACM0: Permission denied
```

## 二、授权步骤
#### 1. 导入rules文件
`sudo curl -o /etc/udev/rules.d/99-vllogic.rules https://vllogic.com/_downloads/b2561fe9dace99376b4ef5416880abc4/99-vllogic.rules`
#### 2. 查看其中规则
```
$ cat /etc/udev/rules.d/99-vllogic.rules
#
#   Step 1: copy to /etc/udev/rules.d/99-vlloigc.rules
#   Step 2: "sudo udevadm control --reload-rules"
#   Step 3: "sudo udevadm trigger"
#   Step 4: unplug your device and plug it back in
#

ACTION!="add", SUBSYSTEM!="usb_device", GOTO="vllogic_rules_end"

SUBSYSTEM=="usb", ATTR{idVendor}=="1209", ATTR{idProduct}=="6666", MODE="666"
SUBSYSTEM=="usb", ATTR{idVendor}=="0d28", ATTR{idProduct}=="0204", MODE="666"

KERNEL=="ttyACM[0-9]*", MODE="666"

LABEL="vllogic_rules_end"
```
#### 3. 重载规则
* `sudo udevadm control --reload-rules`
* `sudo udevadm trigger`
#### 4. 如果调试器已接入系统，需重插拔一次
#### 上述操作中用到的文件
* [99-vllogic.rules](../_static/docs/99-vllogic.rules)

## 三、授权后
#### 1. 访问CMSIS-DAP接口
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
Info : Using CMSIS-DAPv2 interface with VID:PID=0x1209:0x6666, serial=Vllink.Basic2.B585361C76
Info : CMSIS-DAP: SWD supported
Info : CMSIS-DAP: JTAG supported
Info : CMSIS-DAP: SWO-UART supported
Info : CMSIS-DAP: Atomic commands supported
Info : CMSIS-DAP: Test domain timer supported
Info : CMSIS-DAP: FW Version = 0254
Info : CMSIS-DAP: Serial# = Vllink.Basic2.B585361C76
Info : CMSIS-DAP: Interface Initialised (JTAG)
Info : SWCLK/TCK = 0 SWDIO/TMS = 0 TDI = 0 TDO = 0 nTRST = 1 nRESET = 1
Info : CMSIS-DAP: Interface ready
Info : clock speed 100 kHz
Error: session transport was not selected. Use 'transport select <transport>'
Error: Transports available:
Error: swd
Error: jtag
```
#### 2. 访问串口
```
$ stty -F /dev/ttyACM0
speed 9600 baud; line = 0;
-brkint -imaxbel
```
