let port;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// 连接串口
document.getElementById('connectBtn').addEventListener('click', async () => {
    try {
        port = await navigator.serial.requestPort();
        let baudRate = parseInt(document.getElementById('baudrate').value);
        const customBaud = parseInt(document.getElementById('customBaudrate').value);
        
        if (!isNaN(customBaud) && customBaud >= 1200 && customBaud <= 20000000) {
            baudRate = customBaud;
        } else if (document.getElementById('customBaudrate').value) {
            alert('波特率需在1200-20000000之间');
            return;
        }
        await port.open({ baudRate });
        
        document.getElementById('connectBtn').disabled = true;
        document.getElementById('disconnectBtn').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('status').textContent = '状态：已连接';
        
        // 持续读取数据
        const reader = port.readable.getReader();
        window.activeReader = reader; // 保存reader引用
        
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const text = decoder.decode(value);
                appendToOutput(`← 接收: ${text}`);
            }
        } catch (error) {
            // 忽略正常取消的错误
            if (!error.message.includes('user request')) {
                alert(`读取错误: ${error.message}`);
            }
        }
    } catch (error) {
        alert(`连接错误: ${error.message}`);
    }
});

// 断开连接
document.getElementById('disconnectBtn').addEventListener('click', async () => {
    if (port) {
        try {
            // 先取消读取器
            if (window.activeReader) {
                await window.activeReader.cancel();
                window.activeReader = null;
            }
            // 关闭端口
            await port.close();
            port = null;
            
            document.getElementById('connectBtn').disabled = false;
            document.getElementById('disconnectBtn').disabled = true;
            document.getElementById('sendBtn').disabled = true;
            document.getElementById('status').textContent = '状态：已断开';
        } catch (error) {
            alert(`断开错误: ${error.message}`);
        }
    }
});

// 发送数据
document.getElementById('sendBtn').addEventListener('click', async () => {
    const data = document.getElementById('dataInput').value;
    if (!data || !port) return;
    
    try {
        const writer = port.writable.getWriter();
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        await writer.write(encoder.encode(data));
        writer.releaseLock();
        appendToOutput(`→ 发送: ${data}`);
    } catch (error) {
        alert(`发送错误: ${error.message}`);
    }
});

// 清空记录
document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('output').textContent = '';
});

function appendToOutput(text) {
    const output = document.getElementById('output');
    output.textContent += `${new Date().toLocaleTimeString()}: ${text}\n`;
    output.scrollTop = output.scrollHeight;
}