# 互联网使用
* 本文所述功能适用于`Vllink Basic2`，固件版本不应小于`V00.19`

## 一、准备工作
* 参看[局域网使用](../example/over_local_area_network)，完成局域网使用

## 二、公网IP直连
* 适用于不要求调试数据安全性的场景
* 适用于拥有公网IPv4，且可配置端口转发的用户
* 操作
    1. 在路由器中，使用端口转发机制暴露`192.168.6.123`的端口`20000`及`20010`
    2. 记录当前公网IPv4，如`111.222.333.444`
    3. 修改STA端的配置：`Mode3_SERVER_IPV4=111.222.333.444`
    4. 重新上电等待连接完成

## 三、FRP-STCP模式
`TODO`

## 四、FRP-P2P模式
`TODO`

## 五、速度测试
### 5.1 FRP-STCP模式
| IDE and Interface | Ram Write | Flash Write |
| :----: | :----: | :----: |
| OpenOCD V2-SWD 20M | 255KB/S | 50KB/S |
| IAR-DAP V2-SWD 20M | 无法完成 | 无法完成 |
### 5.2 FRP-P2P模式
`TODO`
