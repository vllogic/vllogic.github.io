# AIC8800开发资料

## IO复用
### AIC8800
* AIC8800M.Port.A
    | PAD | Function 0 | Function 1 | Function 2 | Function 3 | Function 4 | Function 5 | Function 6 | Function 8 | Function 9 |
    | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: |
    | GPIOA0 | SWCLK | GPIOA0 |  | LNA_EN_5G | PCM_FSYNC |  | I2S_LRCK_0 |  | SPI_SCK |
    | GPIOA1 | SWDIO | GPIOA1 |  |  | PCM_CLK |  | I2S_BCK_0 |  | SPI_CSN |
    | GPIOA2 | GPIOA2 | UART0_RX | UART1_RX | TX_EN_5G | PCM_DIN |  | I2S_DIN_0 |  | SPI_DI |
    | GPIOA3 | GPIOA3 | UART0_TX | UART1_TX | RX_EN_5G | PCM_DOUT |  | I2S_DOUT_0 |  | SPI_DO |
    | GPIOA4 | GPIOA4 | UART0_CTS | UART1_CTS | UART1_RX |  |  | CODEC_MCLK |  |  |
    | GPIOA5 | GPIOA5 | UART0_RTS | UART1_RTS | UART1_TX |  |  |  |  |  |
    | GPIOA6 | GPIOA6 | I2CM_SCL | UART2_RX | UART1_CTS |  | PWM_A0 |  |  |  |
    | GPIOA7 | GPIOA7 | I2CM_SDA | UART2_TX | UART1_RTS |  | PWM_A1 |  | I2S_BCK_0 |  |
    | GPIOA8 | UART0_RX | GPIOA8 | UART2_CTS |  |  | PWM_A2 |  | I2S_LRCK_0 |  |
    | GPIOA9 | UART0_TX | GPIOA9 | UART2_RTS |  |  |  |  | I2S_DOUT_0 |  |
    | GPIOA10 | GPIOA10 | UART1_RX | SD_S_D1 | SPI_SCK |  |  | SD_M_D2 | I2S_BCK_1 | UART2_RX |
    | GPIOA11 | GPIOA11 | UART1_TX | SD_S_D0 | SPI_CSN |  |  | SD_M_D3 | I2S_LRCK_1 | UART2_TX |
    | GPIOA12 | GPIOA12 | UART1_CTS | SD_S_CLK | SPI_DI | PWM_A0 | PCM_FSYNC | SD_M_CMD | I2S_DOUT_1 | UART2_CTS |
    | GPIOA13 | GPIOA13 | UART1_RTS | SD_S_CMD | SPI_DO | PWM_A1 | PCM_CLK | SD_M_CLK | I2S_DIN_0 | UART2_RTS |
    | GPIOA14 | GPIOA14 | I2CM_SCL | SD_S_D3 |  | PWM_A2 | PCM_DIN | SD_M_D0 | I2S_DIN_1 |  |
    | GPIOA15 | GPIOA15 | I2CM_SDA | SD_S_D2 |  |  | PCM_DOUT | SD_M_D1 | CODEC_MCLK |  |
* AIC8800M.Port.B
    | PAD | ANA Function0 | ANA Function1 | ANA Function2 | Function 0 | Function 1 | Function 2 | Function 3 | Function 4 | 
    | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: |
    | GPIOB0 | LED0 | ADC(0~1.1V) |  |  | GPIOB0(5V) | UART1_RX |  |  | 
    | GPIOB1 |  | ADC(0~1.1V) | TOUCH |  | GPIOB1 | UART1_TX |  |  | 
    | GPIOB2 | LED1 | ADC(0~1.1V) |  | GPIOB2 | UART1_RX |  |  |  | 
    | GPIOB3 | LED2 | ADC(0~1.1V) |  | GPIOB3 | UART1_TX |  | PWM_B0 |  | 
    | GPIOB4 | XTAL1_32K | ADC(0~1.1V) | TOUCH | GPIOB4(AON) |  |  | PWM_B1 | MCLK_OUT | 
    | GPIOB5 | XTAL2_32K | ADC(0~1.1V) | TOUCH | GPIOB5(AON) |  |  | PWM_B2 |  | 
    | GPIOB6 |  | ADC(0~1.1V) | TOUCH | GPIOB6(AON) | UART0_RX |  |  |  | 
    | GPIOB7 |  | ADC(0~1.1V) | TOUCH | GPIOB7(AON) | UART0_TX |  |  |  | 
    | GPIOB13 | USB_ID |  |  | GPIOB13 | PWM_B3 |  |  |  | 
    | GPIOB14 | USB_DP |  |  | GPIOB14 | PWM_B4 |  |  |  | 
    | GPIOB15 | USB_DM |  |  | GPIOB15 | PWM_B5 |  |  |  | 
### AIC8800MC
* AIC8800MC/AIC8800FC
    | PAD | Ext. Func | Function 0 | Function 1 | Function 2 | Function 3 | Function 4 | Function 5 | Function 6 |
    | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: |
    | GPIOA0 |  | SWCLK | GPIOA0 | I2C_SCL | DEBUG_CLK | I2S_LRCK_0 | PCM_FSYNC | SPI_LCD_SCK | 
    | GPIOA1 |  | SWDIO | GPIOA1 | I2C_SDA | AON_UART_TX | I2S_BCK_0 | PCM_CLK | SPI_LCD_CSN_0 | 
    | GPIOA2 |  | GPIOA2 | UART0_RX | UART1_RX | I2C_SCL | I2S_DIN_0 | PCM_DIN | SPI_LCD_DI | 
    | GPIOA3 |  | GPIOA3 | UART0_TX | UART1_TX | I2C_SDA | I2S_DOUT_0 | PCM_DOUT | SPI_LCD_DO | 
    | GPIOA4 |  | GPIOA4 | UART0_CTS | UART1_CTS | UART1_RX | CODEC_MCLK | PWM_0 | SPI_LCD_CD | 
    | GPIOA5 |  | GPIOA5 | UART0_RTS | UART1_RTS | UART1_TX | DEBUG_CLK | PWM_1 | SPI_LCD_FMARK | 
    | GPIOA6 |  | GPIOA6 | I2C_SCL | UART2_RX | UART1_CTS | AON_PWM_0 | I2S_BCK_0 | SPI_LCD_CSN_1 | 
    | GPIOA7 |  | GPIOA7 | I2C_SDA | UART2_TX | UART1_RTS | AON_PWM_1 | I2S_LRCK_0 | SPI_LCD_CSN_2 | 
    | GPIOA8 |  | UART0_RX | GPIOA8 | UART2_CTS |  |  |  |  | 
    | GPIOA9 |  | UART0_TX | GPIOA9 | UART2_RTS |  | AON_PWM_2 | I2S_DOUT_0 | SPI_LCD_CSN_3 | 
    | GPIOA10 | SD_S_D1 | GPIOA10 | UART1_RX | SPI_LCD_SCK | PSI_M_SCL | SD_M_D2 | I2S_BCK_1 | UART2_RX | 
    | GPIOA11 | SD_S_D0 | GPIOA11 | UART1_TX | SPI_LCD_CSN_0 | PSI_M_SDA | SD_M_D3 | I2S_LRCK_1 | UART2_TX | 
    | GPIOA12 | SD_S_CLK | GPIOA12 | UART1_CTS | SPI_LCD_DI | PCM_FSYNC | SD_M_CMD | I2S_DIN_1 | UART2_CTS | 
    | GPIOA13 | SD_S_CMD | GPIOA13 | UART1_RTS | SPI_LCD_DO | PCM_CLK | SD_M_CLK | CODEC_MCLK | UART2_RTS | 
    | GPIOA14 | SD_S_D3 | GPIOA14 | I2C_SCL | SPI_LCD_CD | PCM_DIN | SD_M_D0 | I2S_DOUT_1 | PWM_2 | 
    | GPIOA15 | SD_S_D2 | GPIOA15 | I2C_SDA | SPI_LCD_FMARK | PCM_DOUT | SD_M_D1 | I2S_DIN_0 | DEBUG_CLK | 
    | GPIOB0 | host_wake_wl | GPIOA16 | PCM_FSYNC | TPORTS0 | UART1_RX | PWM_0 | SPI_LCD_CSN_1 |  | 
    | GPIOB1 | wl_wake_host | GPIOA17 | PCM_CLK | TPORTS1 | UART1_TX | PWM_1 | SPI_LCD_CSN_2 |  | 
    | GPIOB2 | bt_wake_host | GPIOA18 | PCM_DIN | TPORTS2 | UART1_CTS | PWM_2 | SPI_LCD_CSN_3 |  | 
    | GPIOB3 | host_wake_bt | GPIOA19 | PCM_DOUT | TPORTS3 | UART1_RTS |  |  |  | 
    | USB_DP | GPIOA20 |  |  |  |  |  |  |  | 
    | USB_DM | GPIOA21 |  |  |  |  |  |  |  | 
### AIC8800M40
* AIC8800M40B/AIC8800M80
    | PAD | Ext. Func | Function 0 | Function 1 | Function 2 | Function 3 | Function 4 | Function 5 | Function 6 | Function 8 | Function 9 | Function 10 | Function 11 | Function 12 | Function 13 | 
    | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: |
    | GPIOA0 |  | SWCLK | GPIOA0 | I2C_SCL | WF_EXT_PA_CTRL_0 | PCM_FSYNC | PTA_ANT_SW_0 | I2S_LRCK_0 | SPDIF_IN | SPI_LCD_SCK | PWM_0 | PCM_DOUT | PCM_CLK | BT_UART_CTS | 
    | GPIOA1 |  | SWDIO | GPIOA1 | I2C_SDA | WF_EXT_PA_CTRL_1 | PCM_CLK | PTA_ANT_SW_1 | I2S_BCK_0 | SPDIF_OUT | SPI_LCD_CSN_0 | PWM_1 | PCM_DIN | PCM_DOUT | BT_UART_RTS | 
    | GPIOA2 |  | GPIOA2 | UART0_RX | UART1_RX | WF_EXT_PA_CTRL_2 | PCM_DIN | DEBUG_CLK | I2S_DIN_0 | PTA_ANT_SW_0 | SPI_LCD_DI | PWM_2 | PCM_FSYNC | PCM_DIN | BT_UART_RX | 
    | GPIOA3 |  | GPIOA3 | UART0_TX | UART1_TX | WF_EXT_PA_CTRL_3 | PCM_DOUT | AON_UART_TX | I2S_DOUT_0 | PTA_ANT_SW_1 | SPI_LCD_DO |  | PCM_CLK | PCM_FSYNC | BT_UART_TX | 
    | GPIOA4 |  | GPIOA4 | UART0_CTS | UART1_CTS | UART1_RX | BT_UART_RX | AUD_DAC_SYNC | CODEC_MCLK | I2S_BCK_0 | SPI_LCD_CD |  |  |  | PCM_FSYNC | 
    | GPIOA5 |  | GPIOA5 | UART0_RTS | UART1_RTS | UART1_TX | BT_UART_TX | AON_UART_TX | DEBUG_CLK | I2S_LRCK_0 | SPI_LCD_FMARK |  |  |  | PCM_DIN | 
    | GPIOA6 |  | GPIOA6 | I2C_SCL | UART2_RX | UART1_CTS | BT_UART_CTS | PSI_S_SCL | BT_UART_RX |  | SPI_LCD_CSN_1 |  |  |  | PCM_DOUT | 
    | GPIOA7 |  | GPIOA7 | I2C_SDA | UART2_TX | UART1_RTS | BT_UART_RTS | PSI_S_SDA | BT_UART_TX | AON_PWM_0 | SPI_LCD_CSN_2 |  |  |  | PCM_CLK | 
    | GPIOA8 |  | UART0_RX | GPIOA8 | UART2_CTS | SPDIF_IN |  |  | BT_UART_CTS |  |  |  |  |  |  | 
    | GPIOA9 |  | UART0_TX | GPIOA9 | UART2_RTS | SPDIF_OUT | AON_PWM_1 |  | BT_UART_RTS | I2S_DOUT_0 | SPI_LCD_CSN_3 |  |  |  |  | 
    | GPIOA10 | SD_S_D1 | GPIOA10 | UART1_RX | BT_UART_RX | SPI_LCD_SCK | BT_UART_CTS |  | SD_M_D2 | I2S_BCK_1 | UART2_RX | BT_UART_CTS | BT_UART_RTS |  |  | 
    | GPIOA11 | SD_S_D0 | GPIOA11 | UART1_TX | BT_UART_TX | SPI_LCD_CSN_0 | BT_UART_RTS | DEBUG_CLK | SD_M_D3 | I2S_LRCK_1 | UART2_TX | BT_UART_RTS | BT_UART_RX |  |  | 
    | GPIOA12 | SD_S_CLK | GPIOA12 | UART1_CTS | BT_UART_CTS | SPI_LCD_DI | AON_PWM_2 | PCM_FSYNC | SD_M_CMD | I2S_DIN_1 | UART2_CTS | BT_UART_RX | BT_UART_TX |  |  | 
    | GPIOA13 | SD_S_CMD | GPIOA13 | UART1_RTS | BT_UART_RTS | SPI_LCD_DO | PWM_0 | PCM_CLK | SD_M_CLK | CODEC_MCLK | UART2_RTS | BT_UART_TX | BT_UART_CTS |  |  | 
    | GPIOA14 | SD_S_D3 | GPIOA14 | I2C_SCL | SPDIF_IN | SPI_LCD_CD | PWM_1 | PCM_DIN | SD_M_D0 | I2S_DOUT_1 | PTA_ANT_SW_0 | UART0_RX |  |  |  | 
    | GPIOA15 | SD_S_D2 | GPIOA15 | I2C_SDA | SPDIF_OUT | SPI_LCD_FMARK | PWM_2 | PCM_DOUT | SD_M_D1 | I2S_DIN_0 | PTA_ANT_SW_1 | UART0_TX |  |  |  | 
    | GPIOB0 |  | GPIOB0 | PCM_FSYNC | I2C_SCL | SPI_LCD_SCK | AON_PWM_0 | WF_EXT_PA_CTRL_0 |  |  |  |  |  |  |  | 
    | GPIOB1 |  | GPIOB1 | PCM_CLK | I2C_SDA | SPI_LCD_CSN_0 | AON_PWM_1 | WF_EXT_PA_CTRL_1 |  |  |  |  |  |  |  | 
    | GPIOB2 |  | GPIOB2 | PCM_DIN | PSI_M_SCL | SPI_LCD_DI | AON_PWM_2 | WF_EXT_PA_CTRL_2 |  |  |  |  |  |  |  | 
    | GPIOB3 |  | GPIOB3 | PCM_DOUT | PSI_M_SDA | SPI_LCD_DO | SPDIF_IN | WF_EXT_PA_CTRL_3 |  |  |  |  |  |  |  | 
    | GPIOB4 |  | GPIOB4 | PWM_0 | I2S_LRCK_0 | BT_UART_RX | SPDIF_OUT |  |  |  |  |  |  |  |  | 
    | GPIOB5 |  | GPIOB5 | PWM_1 | I2S_BCK_0 | BT_UART_TX |  |  |  |  |  |  |  |  |  | 
    | GPIOB6 |  | GPIOB6 | PWM_2 | I2S_DIN_0 | BT_UART_CTS |  |  |  |  |  |  |  |  |  | 
    | GPIOB7 |  | GPIOB7 | AON_PWM_0 | I2S_DOUT_0 | BT_UART_RTS |  |  |  |  |  |  |  |  |  | 
    | USB_DP | GPIOA16 |  |  |  |  |  |  |  |  |  |  |  |  |  | 
    | USB_DM | GPIOA17 |  |  |  |  |  |  |  |  |  |  |  |  |  | 
