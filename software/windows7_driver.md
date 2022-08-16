# Windows7 驱动安装
## 下载驱动
* [Vllink Windows7 Driver.zip](../_static/driver/Vllink Windows7 Driver.zip)
* 解压，文件夹中有两个inf驱动文件，稍后会用到
  
## 安装CMSIS-DAP V2驱动
1. 将DAP接上电脑，在设备管理器中出现CMSIS-DAP v2设备，右击打开操作菜单，左击`更新驱动程序软件`
   ![](../_static/win7_cmsisdapv2_update.png)
2. 左击`浏览计算机以查找驱动程序软件`
   ![](../_static/win7_cmsisdapv2_manual.png)
3. 左击`从计算机的设备驱动程序列表中选择`
   ![](../_static/win7_cmsisdapv2_select.png)
4. 选中`显示所有设备`，左击`下一步`
   ![](../_static/win7_cmsisdapv2_selectalldeveice.png)
5. 左击`从磁盘安装`，左击`浏览`，选中压缩包解压的路径
   ![](../_static/win7_cmsisdapv2_selectpath.png)
6. 选中`KEIL - Tools By ARM`，选中`CMSIS-DAP v2`，左击`下一步`
   ![](../_static/win7_cmsisdapv2_selectv2.png)
7. 左击`是`
   ![](../_static/win7_cmsisdapv2_selectyes.png)
8. 若出现警告，点击`始终..`
   ![](../_static/win7_cmsisdapv2_warning.png)

## 安装CDC驱动
* 参考CMSIS-DAP V2驱动，唯一区别就是在第六步中，选中`ARM`，选中`CMSIS-DAP CDC`
   ![](../_static/win7_cmsisdapv2_selectcdc.png)


## 所有驱动安装完成
![](../_static/win7_cmsisdapv2_all.png)
