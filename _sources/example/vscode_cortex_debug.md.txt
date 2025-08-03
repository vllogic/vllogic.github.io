# 使用VSCode的Cortex Debug调试任意固件

**`版权声明：转载需注明来自于 vllogic.com `**

> 前言：除了常见调试外，这个方法还适用于多个软件通过单个`Vllink`同时访问`SOC`上的多个JTAG设备

## 标准配置方法 `可跳过`
1. 安装`VSCode`
2. 在`VSCode`中安装`Cortex-Debug`插件，安装完成后关闭`VSCode`
3. 安装[gcc-arm-none-eabi-10.3-2021.10](https://developer.arm.com/downloads/-/gnu-rm)
4. 下载并解包[OpenOCD](https://github.com/vllogic/openocd_cmsis-dap_v2/releases/tag/20250629)
5. 在系统`PATH`中增加：
    * `{GCC的绝对路径}\gcc-arm-none-eabi_10-2021-10\bin`
    * `{OpenOCD的绝对路径}\openocd\bin`
6. 进入需要调试的工程目录，执行构建，生成`.out`或`.axf`可调试文件
7. 新建`vscode_cortex_debug`文件夹
8. 进入`vscode_cortex_debug`文件夹，新建`.vscode`文件夹
9. 新建`vscode_cortex_debug.code-workspace`文本，填入以下内容
    ```
    {
        "folders": [{"path": "."}],
        "settings": {"cortex-debug.variableUseNaturalFormat":false}
    }
    ```
10. 进入`.vscode`文件夹，新建`launch.json`文本，此处提供几个模板，合理修改后保存
    * 模板一：雅特力 AT32F405
    ```
    {
        "version": "0.2.0",
        "configurations": [
            {
                "name": "Cortex Debug",
                "cwd": "${workspaceFolder}",
                "executable": "../objects/flash_write_read.axf",
                "request": "launch",
                "type": "cortex-debug",
                "runToEntryPoint": "main",
                //"gdbPath": "../vscode_cortex_debug.tools/arm-none-eabi-gdb.exe",
                "servertype": "openocd",
                //"serverpath": "../vscode_cortex_debug.tools/openocd/bin/openocd.exe",
                "device": "AT32F405",
                "configFiles": [
                    "interface/cmsis-dap.cfg",
                    "target/at32f405xx.cfg"
                ]
            }
        ]
    }
    ```
    * 模板二：爱科微 AIC8800M
    ```
    {
        "version": "0.2.0",
        "configurations": [
            {
                "name": "Cortex Debug",
                "cwd": "${workspaceFolder}",
                "executable": "../project/Exe/project.out",
                "request": "launch",
                "type": "cortex-debug",
                "runToEntryPoint": "main",
                //"gdbPath": "../vscode_cortex_debug.tools/arm-none-eabi-gdb.exe",
                "servertype": "openocd",
                //"serverpath": "../vscode_cortex_debug.tools/openocd/bin/openocd.exe",
                "device": "AIC8800M",
                "configFiles": [
                    "interface/cmsis-dap.cfg",
                    "target/aic8800.cfg"
                ]
            }
        ]
    }
    ```
11. 双击`vscode_cortex_debug.code-workspace`打开工程，按`F5`即启动调试

## 解包即用版本
1. 安装`VSCode`
2. 在`VSCode`中安装`Cortex-Debug`插件，安装完成后关闭`VSCode`
3. 进入需要调试的工程目录，执行构建，生成`.out`或`.axf`可调试文件
4. 下载[整合包](../_static/tools/vscode_cortex_debug_example.zip)，此包集成`AT32F405`、`AIC8800M`、`H7P20`调试工程以及必要的GDB、OpenOCD二进制文件
5. 解压整合包，根据目标芯片打开对应的调试工程，如：`vscode_cortex_debug.H7P20/vscode_cortex_debug.code-workspace`。
6. 把`launch.json`中的`"executable"`路径修改为可调试文件的相对路径，如是其他芯片，还需要修改`"device"`项及
`"configFiles"`项
7. 按`F5`即启动调试
