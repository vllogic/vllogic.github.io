# USB Sniffer 2 极速性能演示

## 准备
1. 下载测试包 [百度网盘](https://pan.baidu.com/s/5JUr_pjg2ruN9iUGAtKdnkQ) 或 [Github Release](https://github.com/vllogic/usb_sniffer.extcap/releases/download/V0.2/USBHS_MSC_Extreme_Test.zip)
2. Windows主机，Linux及MacOS未测试
3. 一个高性能U盘或者高性能TF卡配读卡器，后文统称`U盘`，读取性能要达到USB2.0峰值`40MB/S`
4. 将`USB_MSC_FILE`文件夹拷贝至`U盘`中，然后安全弹出
5. 准备好`USB Sniffer 2`及线材

## 抓包
1. 将`USB Sniffer 2`通过USB3.0线材接3.0母口
2. 将`USB Sniffer 2`的C口接2.0母口
3. **【重要】特别说明，当前WireShark显示层无法满足极速抓包性能需求，不要试图通过GUI工具进行此项测试**
4. 打开`PowerShell`，执行：`& "$env:USERPROFILE\AppData\Roaming\Wireshark\extcap\capture_usb_vllogic.exe" --capture --fifo "$env:USERPROFILE\Desktop\msc_extreme.pcapng" --speed auto --fold`
5. 把`U盘`接上`USB Sniffer 2`的母口
6. 主机中出现新磁盘，将磁盘中的`USB_MSC_FILE`文件夹拷贝出来，然后安全弹出
7. 移除`U盘`
8. 回到`PowerShell`，`Ctrl + C`结束捕获。
9.  桌面上出现一个`msc_extreme.pcapng`文件，就是针对这次MSC峰值读取所捕获的数据文件

## 分析方法
* 我已将`msc_extreme.pcapng`移动到`USBHS_MSC_Extreme_Test`，方便AI分析
* 使用Agent打开`USBHS_MSC_Extreme_Test`文件夹，AI模型选择`DeepSeek V4.1 Flash High`官方API，使用如下提示词：
    ```
    这是USB Sniffer 2 极速性能演示，做以下评估：
    1. 是否存在丢包或CRC错误
    2. MSC数据是否完整
    3. 抓包数据是否能与`USB_MSC_FILE`文件夹中的数据对应
    ```

## 分析结果（独立评估前，可将此部分删除，防止误导AI）
分析完成。结论如下。

### 1. 丢包 / CRC 错误：无

| 检查项 | 数量 |
|---|---|
| CRC5 错误 `usbll.crc5.wrong` | 0 |
| CRC16 错误 `usbll.crc16.wrong` | 0 |
| Split CRC5 错误 | 0 |
| 非法 PID / PID 序列错误 | 0 |
| 重组错误/重叠/超长分片 | 0 |
| 带外信息通道中的 drop/overflow/lost 告警 | 0 |

- 唯一 1 个 `Malformed`：帧 332，枚举阶段一个 STRING 描述符响应只回了 2 字节（`04 03`，bLength 却为 4），**CRC 正确**，属设备返回的短描述符，非总线错误。
- 5 个 `short`（帧 471/489/584/991/1007）为 `INQUIRY allocation_length too small`，主机主动限制长度，Note 级，正常。
- 带外通道只有 `Folded N empty frames`（空帧折叠，正常），无任何丢包告警。

### 2. MSC 数据完整性：完整

- CBW 2732 个 ↔ CSW 2732 个，一一对应；**CSW status 全部 = 0 (Good)，residue 全部 = 0**。
- READ(10) 共 2530 条：每条 `捕获长度 == dCBWDataTransferLength`，**请求块数 321,905 == 实际捕获块数 321,905（164.8 MB），零缺失**。
- 无重复冲突（same 29 / conflict 0）。

### 3. 与 `USB_MSC_FILE` 对应：逐字节一致

- 文件在 U 盘上位于连续区间：磁盘偏移 `62,412,800`（LBA 121,900），共 2048 条 64 KiB READ，恰好顺序读一遍。
- 利用文件自身的分页图案头（`0x5AA55AA5 | 页内偏移 | ~偏移 | 0xA5A55A5A`）自校验定位：**32,768 / 32,768 页头全部捕获**。
- 重建 128 MiB：**262,144 / 262,144 个 512B 块全部匹配，0 错误**；
- 重建 SHA256 `26d97d2c…b17`
- `stress_pat.bin` SHA256 `26d97d2c…b17` → **完全一致**。

### 附：性能

- 128 MiB 文件读取耗时 **3.042 s ≈ 44.1 MB/s**（超过 USB2.0 峰值 40 MB/s）。
- 整包 1,015,713 帧 / 23.644 s ≈ 42,958 帧/s，全程零 CRC 错误、零丢包。

三个问题结论均为正常：**无丢包与 CRC 错误、MSC 数据完整、抓包内容与 `USB_MSC_FILE` 完全对应**。