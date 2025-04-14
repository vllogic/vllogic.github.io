# 互联网使用

**`版权声明：转载需注明来自于 vllogic.com `**

* 本文所述功能适用于`Vllink Basic2`，固件版本不应小于`V00.21`

## 一、准备工作
* 参看[局域网使用](../example/over_local_area_network)，完成局域网使用
* 本文不考虑 **防火墙问题** ，请自行处理

## 二、安全性说明
* `Basic2`无线模式下，`DAP`与`UART`的TCP数据流未加密。其数据安全性依赖于数据通路。直连使用时，具备WPA2加密机制；局域网使用时，数据通路可控；互联网使用时，TCP数据流应当认为是暴露的，需要做安全性处理。
* 如对安全性有要求，可考虑`spiped`，此工具笔者未实测，请咨询AI或专业人员
* 本文后续操作将不会考虑安全性

## 三、公网IP直连
* 适用于拥有公网IPv4，且可配置端口转发的用户
* 操作
    1. 在路由器中，使用端口转发机制暴露`192.168.6.123`的端口`20000`及`20010`
    2. 记录当前公网IPv4，如`111.222.333.444`
    3. 修改STA端的配置：`Mode3_SERVER_IPV4=111.222.333.444`
    4. 重新上电等待连接完成

## 四、FRP服务器
### 4.1 测试服务器
* 此服务器仅用于`Basic2`产品的互联网测试，使用此服务器需进行合理配置，防止与其他用户冲突
* 此服务器不保证`安全性`及`稳定性`
* 服务器信息：
    ```
    serverAddr = "47.122.0.242"
    serverPort = 9999
    ```
### 4.2 `可选`自行部署
* 基于一台具备公网IPv4的x86服务器
    1. `wget https://github.com/fatedier/frp/releases/download/v0.61.2/frp_0.61.2_linux_amd64.tar.gz`
    2. `tar zxvf frp_0.61.2_linux_amd64.tar.gz`
    3. `cd frp_0.61.2_linux_amd64`
    4. `echo "bindPort = 9999" >> vllink_frps.toml`
    5. `./frps -c ./vllink_frps.toml`
* 合理配置防火墙，开放后续使用时所涉及的端口
* 如需长期启动，请参考[使用 systemd](https://gofrp.org/zh-cn/docs/setup/systemd/)

## 五、FRP-STCP模式
* 此模式需要两端都运行`frpc`命令
* 此模式数据经过FRP服务器；两端与服务器的通讯延迟都会影响调试体验
* 演示用程序：[v0.61.2](https://github.com/fatedier/frp/releases/tag/v0.61.2)
### 5.1 AP端调试器
* 配置：
    ```
    Mode=wirelesshost
    Mode2_STA=enable
    TCP_PORT_DAP=20000
    TCP_PORT_UART=20010
    Wireless_Device_SSID=XXX_5G
    Wireless_Device_Password=XXX_5G_PASS
    Wireless_ATTR=[wifi]
    ```
* 从路由器处，获取AP端调试器的局域网地址：`192.168.68.183`
### 5.2 AP端`frpc`
* 新建`stcp_ap.toml`
* 编辑内容：
    ```
    # 将`test20250412` 替换为随机字符串，建议12位-16位大小写字母+数字，必须具备随机性，如果与其他用户碰撞会造成错配
    # 修改localIP，填入AP端调试器的实际局域网IP

    serverAddr = "47.122.0.242"
    serverPort = 9999

    [[proxies]]
    type = "stcp"
    localPort = 20000
    name = "ap_stcp.dap.test20250412"   
    secretKey = "seckey.test20250412"   # secretKey，建议修改
    localIP = "192.168.68.183"          # 根据实际情况修改

    [[proxies]]
    type = "stcp"
    localPort = 20010
    name = "ap_stcp.uart.test20250412"
    secretKey = "seckey.test20250412"   # secretKey，建议修改
    localIP = "192.168.68.183"          # 根据实际情况修改

    # end
    ```
* 运行：`.\frpc.exe -c .\stcp_ap.toml`
### 5.3 STA端`frpc`
* 新建`stcp_sta.toml`
* 编辑内容：
    ```
    # 将`test20250412` 替换为随机字符串，建议12位-16位大小写字母+数字，必须具备随机性，如果与其他用户碰撞会造成错配

    serverAddr = "47.122.0.242"
    serverPort = 9999

    [[visitors]]
    type = "stcp"
    name = "sta_stcp.dap.visitor"
    bindAddr = "0.0.0.0"
    bindPort = 20000
    serverName = "ap_stcp.dap.test20250412" # stcp_ap中的name
    secretKey = "seckey.test20250412"       # secretKey，需与stcp_ap中一致，建议修改

    [[visitors]]
    type = "stcp"
    name = "sta_stcp.uart.visitor"
    bindAddr = "0.0.0.0"
    bindPort = 20010
    serverName = "ap_stcp.uart.test20250412"# stcp_ap中的name
    secretKey = "seckey.test20250412"       # secretKey，需与stcp_ap中一致，建议修改

    # end
    ```
* 运行：`.\frpc.exe -c .\stcp_sta.toml`
* 从路由器或STA端网络管理工具内，获取STA端的局域网地址：`192.168.68.221`
### 5.4 STA端调试器
* 配置：
    ```
    Mode=wirelessdevice
    Mode3_SERVER_IPV4=192.168.68.221
    TCP_PORT_DAP=20000
    TCP_PORT_UART=20010
    Wireless_Device_SSID=XXX_5G
    Wireless_Device_Password=XXX_5G_PASS
    Wireless_ATTR=[wifi]
    ```
* 同步配置后，重新上电，正常情况下，两端指示灯常亮

## 六、FRP-P2P模式
* 此模式需要两端都运行`frpc`命令
* 此模式数据不经过FRP服务器；两端之间的通讯延迟会影响调试体验，在一些同城同网场景中可能具有最好的使用体验
* 在一些网络场景下，P2P打洞会无法成功
### 6.1 AP端调试器
* 配置：
    ```
    Mode=wirelesshost
    Mode2_STA=enable
    TCP_PORT_DAP=20000
    TCP_PORT_UART=20010
    Wireless_Device_SSID=XXX_5G
    Wireless_Device_Password=XXX_5G_PASS
    Wireless_ATTR=[wifi]
    ```
* 从路由器处，获取AP端调试器的局域网地址：`192.168.68.183`
### 6.2 AP端`frpc`
* 新建`stcp_ap.toml`
* 编辑内容：
    ```
    # 将`test20250412` 替换为随机字符串，建议12位-16位大小写字母+数字，必须具备随机性，如果与其他用户碰撞会造成错配
    # 修改localIP，填入AP端调试器的实际局域网IP

    serverAddr = "47.122.0.242"
    serverPort = 9999

    [[proxies]]
    type = "xtcp"
    localPort = 20000
    name = "ap_p2p.dap.test20250412"
    secretKey = "seckey.test20250412"   # secretKey，建议修改
    localIP = "192.168.68.183"          # 根据实际情况修改

    [[proxies]]
    type = "xtcp"
    localPort = 20010
    name = "ap_p2p.uart.test20250412"
    secretKey = "seckey.test20250412"   # secretKey，建议修改
    localIP = "192.168.68.183"          # 根据实际情况修改

    # end
    ```
* 运行：`.\frpc.exe -c .\stcp_ap.toml`
### 6.3 STA端`frpc`
* 新建`stcp_sta.toml`
* 编辑内容：
    ```
    # 将`test20250412` 替换为随机字符串，建议12位-16位大小写字母+数字，必须具备随机性，如果与其他用户碰撞会造成错配

    serverAddr = "47.122.0.242"
    serverPort = 9999

    [[visitors]]
    type = "xtcp"
    name = "p2p_sta.dap.visitor"
    bindAddr = "0.0.0.0"
    bindPort = 20000
    serverName = "ap_p2p.dap.test20250412"  # p2p_ap中的name
    secretKey = "seckey.test20250412"       # secretKey，需与p2p_ap中一致，建议修改
    keepTunnelOpen = true

    [[visitors]]
    type = "xtcp"
    name = "p2p_sta.uart.visitor"
    bindAddr = "0.0.0.0"
    bindPort = 20010
    serverName = "ap_p2p.uart.test20250412" # p2p_ap中的name
    secretKey = "seckey.test20250412"       # secretKey，需与p2p_ap中一致，建议修改
    keepTunnelOpen = true

    # end
    ```
* 运行：`.\frpc.exe -c .\stcp_sta.toml`
* 从路由器或STA端网络管理工具内，获取STA端的局域网地址：`192.168.68.221`
### 6.4 STA端调试器
* 配置：
    ```
    Mode=wirelessdevice
    Mode3_SERVER_IPV4=192.168.68.221
    TCP_PORT_DAP=20000
    TCP_PORT_UART=20010
    Wireless_Device_SSID=XXX_5G
    Wireless_Device_Password=XXX_5G_PASS
    Wireless_ATTR=[wifi]
    ```
* 同步配置后，重新上电，正常情况下，两端指示灯常亮

## 七、FRP-TCP模式
* 此模式只需要AP端运行`frpc`命令
* 此模式数据经过FRP服务器，且需独占FRP服务器的两个端口，端口号若与其他用户碰撞，会无法正常使用
### 7.1 AP端调试器
* 配置：
    ```
    Mode=wirelesshost
    Mode2_STA=enable
    TCP_PORT_DAP=20000
    TCP_PORT_UART=20010
    Wireless_Device_SSID=XXX_5G
    Wireless_Device_Password=XXX_5G_PASS
    Wireless_ATTR=[wifi]
    ```
* 从路由器处，获取AP端调试器的局域网地址：`192.168.68.183`
### 7.2 AP端`frpc`
* 新建`tcp_ap.toml`
* 编辑内容：
    ```
    # 此模式只需要AP端运行`frpc`命令
    # 此需独占FRP服务器的两个端口，端口号若与其他用户碰撞，会无法正常使用
    # 建议先随机取一个21000-65534的随机数作为DAP的remotePort，然后UART的remotePort加一
    # 比如：取DAP的remotePort = 34560，取UART的remotePort = 34561

    serverAddr = "47.122.0.242"
    serverPort = 9999

    [[proxies]]
    type = "tcp"
    localPort = 20000
    localIP = "192.168.68.183"          # AP调试器的局域网地址
    name = "tcp.34560"                  # 约定在此项中填入选取的服务器转发端口
    remotePort = 34560                  # 选取的服务器转发端口

    [[proxies]]
    type = "tcp"
    localPort = 20010
    localIP = "192.168.68.183"          # AP端调试器的局域网地址
    name = "tcp.34561"                  # 约定在此项中填入选取的服务器转发端口
    remotePort = 34561                  # 选取的服务器转发端口
    # end
    ```
* 运行：`.\frpc.exe -c .\tcp_ap.toml`
### 7.3 STA端调试器
* 配置：
    ```
    Mode=wirelessdevice
    Mode3_SERVER_IPV4=47.122.0.242
    TCP_PORT_DAP=34560
    TCP_PORT_UART=34561
    Wireless_Device_SSID=XXX_5G
    Wireless_Device_Password=XXX_5G_PASS
    Wireless_ATTR=[wifi]
    ```
* 同步配置后，重新上电，正常情况下，两端指示灯常亮
* 实测，STA端调试器指示灯会很快常亮，AP端调试器指示灯需要等几分钟才会常亮，原因不确定。常亮后，可正常使用

## 八、速度测试
### 8.1 FRP-STCP模式
* 测试网络环境：AP端与服务器ping延迟约14毫秒，STA端与服务器ping延迟约14毫秒

| IDE and Interface | Ram Write | Flash Write |
| :----: | :----: | :----: |
| OpenOCD V2-SWD 20M | 72KB/S | 25KB/S |
| IAR-DAP V2-SWD 20M | 10KB/S | 4KB/S |

* IAR调试，单步等待时间大约2.4秒

## 九、相关资料打包
* [上述配置文件及Windows下frpc程序](../_static/tools/vllink_test.frp_0.61.2_windows_amd64.zip)
