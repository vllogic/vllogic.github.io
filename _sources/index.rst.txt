Vllogic 产品使用指南
===================================

相关链接
----------------------------
淘宝：https://vllogic.taobao.com/

Github：https://github.com/vllogic

Discussions：https://github.com/vllogic/vllogic.github.io/discussions

客户支持QQ群（调试器方向）：791104674

客户支持QQ群（FPGA、逻辑分析方向）：635683631

支持的开发平台
----------------------------
* OpenOCD
* PyOCD
* Probe RS
* IAR，任意版本，CMSIS-DAP V1接口
* IAR，版本>=7.40.2，CMSIS-DAP V2接口
* Keil，任意版本，CMSIS-DAP V1接口
* Keil，版本>=5.36，CMSIS-DAP V2接口
* Segger J-Flash，版本限V7.22B，CMSIS-DAP V1接口，Basic2需配置“AS_ARM_MBED=enable”，擦写需License
* Segger Ozone，版本限V3.24 32Bit，CMSIS-DAP V1接口，Basic2需配置“AS_ARM_MBED=enable”
* FreeMASTER，版本>=3.2.2
* STM32CubeIDE，ST-LINK(OpenOCD)模式

快速上手
----------------------------

======================  ======================
|Vllink Basic2|_         |Vllink USB Sniffer|_
----------------------  ----------------------
`Vllink Basic2`_         `Vllink USB Sniffer`_
======================  ======================

.. |Vllink Basic2| image:: _static/picture/vllink_basic2_top_45.png
.. _Vllink Basic2: quick/vllink_basic2.html

.. |Vllink USB Sniffer| image:: _static/picture/usb_sniffer_45_small.png
.. _Vllink USB Sniffer: quick/usb_sniffer_h7p20.html

.. toctree::
   :caption: 快速上手
   :hidden:

   quick/vllink_basic.md
   quick/vllink_basic2.md
   quick/vllink_box.md
   quick/vllink_box2.md
   quick/usb_sniffer_h7p20.md

.. toctree::
   :maxdepth: 1
   :caption: 硬件资料

   hardware/vllink_basic_vout.md
   hardware/vllink_basic2_5v.md
   hardware/vllink_basic2_vref.md
   hardware/vllink_basic2_to_fpga.md
   hardware/vllink_basic2_to_mipi10p_jtag20p.md
   hardware/vllink_battboard.md
   hardware/vllink_uart.md

.. toctree::
   :maxdepth: 1
   :caption: 固件更新

   update/vllink_basic.md
   update/vllink_basic2.md
   update/vllink_box.md

.. toctree::
   :maxdepth: 1
   :caption: 开发工具使用说明

   software/windows7_driver.md
   software/iar.md
   software/keil_mdk.md
   software/probe_rs.md
   software/openocd.md
   software/pyocd.md
   software/freemaster.md
   software/hercuels_command.md
   software/speedtest.md
   software/tools.md

.. toctree::
   :maxdepth: 1
   :caption: 应用实例
   
   example/wireless_icp.md
   example/vscode_cortex_debug.md
   example/linux_rules.md
   example/over_local_area_network.md
   example/over_internet.md

===================================

.. toctree::
   :maxdepth: 1
   :caption: 其他
   :hidden:
   
   readme.md

