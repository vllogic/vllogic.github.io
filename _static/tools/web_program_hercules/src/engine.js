/* =========================================================================
 * Web Program Hercules - 量产引擎 (可实例化, 预留多工位)
 * -------------------------------------------------------------------------
 * 依赖: hercules.js (命令构建) / dapv2.js (bulk 传输)
 * 职责: 带超时请求层 / 触发检测(5种) / 状态输出(电平保持) /
 *       多文件烧写(强制 ERASE+VERIFY, 双计数器重试, 容量校验) / 统计(4项)
 * ========================================================================= */

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class MassProduceEngine {
    constructor() {
        this.port = null;
        this.cfg = null;
        this.stats = { burn: 0, pass: 0, fail: 0, retryFail: 0 };
        this.running = false;
        this._pending = null;
        this._manualGo = false;
        this._lastStatus = null;
        this._connecting = false;   // 连接互斥锁 (防并发连接同一设备)
        this._triggerPrev = null;   // 触发边沿检测的上一状态 (跨片保持, 支持连续量产换片)
        this._autoFirst = false;    // 间隔触发: 首次立即烧第一片标记
        this._progressBytes = 0;    // 当前片已烧录累计字节 (用于进度条)
        this._outTxd = null;        // 状态输出: 当前 TXD 电平 (null=未设置)
        this._outSrst = null;       // 状态输出: 当前 SRST 电平 (null=未设置)
        this._baseAddr = 0;         // 多文件虚拟文件基地址 (按地址排序后首个文件地址)
        this._fullLength = 0;       // 虚拟文件总长 = 最大偏移 - 基地址 (AUTORESET/完成判定用)

        // 芯片/设备信息
        this.version = 0;
        this.chipSupportedNum = 0;
        this.common = null;
        this.chipValid = false;
        this.capacity = 0;

        // 逐片结果记录 (生产报表数据源, 每片一条: {t, ok, msg})
        this.chipRecords = [];
        this.chipResultFn = () => {};

        // UI 回调
        this.logFn = () => {};
        this.statusFn = () => {};
        this.stateFn = () => {};
        this.progressFn = () => {};
    }

    setLog(fn) { this.logFn = fn || (() => {}); }
    setStatus(fn) { this.statusFn = fn || (() => {}); }
    setState(fn) { this.stateFn = fn || (() => {}); }
    setProgress(fn) { this.progressFn = fn || (() => {}); }
    setChipResult(fn) { this.chipResultFn = fn || (() => {}); }
    getChipRecords() { return this.chipRecords; }
    log(msg, level) { this.logFn(msg, level); }

    /* ================= 连接 / 断开 ================= */
    async connect(existingDevice = null) {
        if (this._connecting) { this.log('连接互斥: 已有连接进行中'); return; }
        this._connecting = true;
        try {
            if (existingDevice) {
                this.port = new dapv2.Port(existingDevice);
                this.log('复用已授权设备: ' + (existingDevice.productName || ''));
            } else {
                this.log('弹出设备选择框...');
                this.port = await dapv2.requestPort();
                this.log('已选择设备: ' + (this.port.device_.productName || ''));
            }
            // 先绑定回调再 connect, 避免 readLoop 启动后回调缺失
            this.port.onReceive = (data) => this._onReceive(data);
            this.port.onReceiveError = (err) => this._handleReceiveError(err);
            this.log('打开设备并声明接口...');
            await this.port.connect();
            this.log('设备已打开');
            try {
                await this.getInfo();
                this.log('GET_INFO OK, version=0x' + this.version.toString(16));
            } catch (e) { this.log('GET_INFO 失败: ' + e.message); }
        } catch (e) {
            // 连接失败: 清理端口, 允许下次重试 (否则 engine.port 残留导致无法再次连接)
            if (this.port) {
                try { this.port.disconnect(); } catch (_) { /* ignore */ }
                this.port = null;
            }
            this.log('连接异常: ' + ((e && e.message) || e));
            throw e;
        } finally {
            this._connecting = false;
        }
    }

    _handleReceiveError(err) {
        // 正常断开/device.close() 会取消 in-flight transferIn(AbortError), 属预期行为, 忽略
        if (err && (err.name === 'AbortError' || /cancelled|disconnected|device closed/i.test(String(err.message || '')))) return;
        this.log('通讯错误: ' + err);
    }

    disconnect() {
        this.running = false;
        if (this.port) {
            this.log('断开设备...');
            try { this.port.disconnect(); } catch (e) { this.log('断开异常: ' + e.message); }
            this.port = null;
            this.log('已断开');
        }
    }

    /* ================= 带超时的请求层 (命令级 3s 超时) ================= */
    _onReceive(data) {
        const p = this._pending;
        if (p) {
            this._pending = null;
            clearTimeout(p.timer);
            p.resolve(data);
        }
    }

    request(cmdBytes, timeoutMs = 3000) {
        if (!this.port) return Promise.reject(new Error('Device disconnected'));
        return new Promise((resolve, reject) => {
            const holder = {};
            holder.timer = setTimeout(() => {
                if (this._pending === holder) {
                    this._pending = null;
                    reject(new Error('Command timeout (' + timeoutMs + 'ms)'));
                }
            }, timeoutMs);
            holder.resolve = resolve;
            holder.reject = reject;
            this._pending = holder;
            this.port.send(cmdBytes).catch((e) => {
                clearTimeout(holder.timer);
                if (this._pending === holder) this._pending = null;
                reject(e);
            });
        });
    }

    // 响应头: [0]=0x90 [1]=subcmd [2]=cmdSts [3]=subSts [4:]=payload
    respOk(view) {
        return view && view.byteLength >= 4 && view.getUint8(3) === HERCULES_SUBCMD_RESP_OK;
    }

    /* ================= 基础命令 ================= */
    async getInfo() {
        const resp = await this.request(hercules_cmd_get_info());
        if (!this.respOk(resp)) throw new Error('GET_INFO failed');
        const v = new DataView(resp.buffer, resp.byteOffset + 4);
        this.version = v.getUint32(0, true);
        this.chipSupportedNum = v.getUint32(4, true);
        return this.version;
    }

    async getStatus() {
        const resp = await this.request(hercules_cmd_get_status());
        if (!this.respOk(resp)) throw new Error('GET_STATUS failed');
        const v = new DataView(resp.buffer, resp.byteOffset + 4, resp.byteLength - 4);
        const st = {
            vrefMv:    v.getInt32(0, true),
            vrefValid: v.getUint8(4) !== 0,
            rxdLogic:  v.getUint8(5) !== 0,
            keyMode:   v.getUint8(6) !== 0
        };
        this._lastStatus = st;
        this.statusFn(st);
        return st;
    }

    async takeover() {
        const resp = await this.request(hercules_cmd_takeover_txd_rxd());
        if (!this.respOk(resp)) throw new Error('TAKEOVER failed');
    }

    async release() {
        if (!this.port) return;
        try {
            const resp = await this.request(hercules_cmd_release_txd_rxd());
            if (!this.respOk(resp)) this.log('RELEASE 响应异常');
        } catch (e) { this.log('RELEASE: ' + e.message); }
    }

    async outputTxdSrst(t, s) {
        // null 表示保持该引脚当前电平 (单引脚更新时另一引脚传 null)
        const nt = (t === null || t === undefined) ? (this._outTxd ?? 0) : t;
        const ns = (s === null || s === undefined) ? (this._outSrst ?? 0) : s;
        this._outTxd = nt;
        this._outSrst = ns;
        const resp = await this.request(hercules_cmd_output_txd_srst(nt, ns));
        if (!this.respOk(resp)) throw new Error('OUTPUT_TXD_SRST failed');
    }

    async probeChip() {
        const resp = await this.request(hercules_cmd_probe_chip());
        if (!this.respOk(resp)) throw new Error('Probe resp: ' + (resp ? resp.getUint8(3) : 'timeout'));
        // 与老代码一致: 从响应 offset 4 拷贝 12 字节到固定缓冲 (勿用 raw.buffer, 那是整个响应缓冲)
        const buf = new Uint8Array(12);
        buf.set(new Uint8Array(resp.buffer, resp.byteOffset + 4, 12), 0);
        this.common = new DataView(buf.buffer);
        const attachMs = this.common.getUint32(0, true);
        const khz = this.common.getUint16(4, true);
        const targetType = this.common.getUint8(6);
        this.capacity = this.common.getUint32(8, true);
        if (!attachMs || !khz || targetType >= this.chipSupportedNum) {
            this.chipValid = false;
            throw new Error('Chip not supported (type=' + targetType + ')');
        }
        this.chipValid = true;
        this.log(`探测: 芯片容量 ${this.capacity}B, ${khz}kHz`);
        return { targetType, capacity: this.capacity };
    }

    /* ================= 触发检测 (5 种) ================= */
    manualGo() { this._manualGo = true; }

    async waitTrigger() {
        const mode = this.cfg.trigger.mode;
        if (mode === 'manual') {
            while (this.running && !this._manualGo) await sleep(100);
            this._manualGo = false;
            return;
        }
        if (mode === 'auto-timer') {
            if (this._autoFirst) { this._autoFirst = false; return; }   // 首次立即烧第一片
            const ms = (this.cfg.trigger.autoInterval || 2) * 1000;
            this.log(`⏳ 间隔触发: ${ms / 1000}s 后自动烧录下一片`);
            const steps = Math.max(1, Math.ceil(ms / 100));
            for (let i = 0; i < steps && this.running; i++) await sleep(100);   // 可被 stop 中断
            return;
        }
        // 边沿检测前先建立稳定基线: 连续 3 帧 (300ms) 电平一致才作为基线, 期间不触发。
        // 避免 TAKEOVER/上电瞬态在默认高(RXD 上升沿)或默认低(RXD 下降沿)电平下产生伪边沿导致立刻触发。
        const STABLE_FRAMES = 3;
        let prev = null, stable = 0;
        while (this.running) {
            let s;
            try {
                s = await this.getStatus();
            } catch (e) {
                await sleep(100);
                continue;
            }
            if (!prev) {
                prev = { key: s.keyMode, rxd: s.rxdLogic, vref: s.vrefValid };
                stable = 1;
            } else if (prev.key === s.keyMode && prev.rxd === s.rxdLogic && prev.vref === s.vrefValid) {
                stable++;
                if (stable >= STABLE_FRAMES) break;   // 基线稳定, 进入边沿检测
            } else {
                prev = { key: s.keyMode, rxd: s.rxdLogic, vref: s.vrefValid };
                stable = 1;
            }
            await sleep(100);
        }
        if (!this.running) return;
        this._triggerPrev = prev;
        // 边沿检测: 只有从稳定基线发生跳变才触发 (prev 跨片保持)
        while (this.running) {
            let s;
            try {
                s = await this.getStatus();
            } catch (e) {
                this.log('GET_STATUS 轮询失败(重试): ' + e.message);
                await sleep(100);
                continue;
            }
            // 注意: getStatus() 返回的是布尔字段, 此处统一用布尔比较 (true/false)
            if (mode === 'vref-rising') {
                // 严格 0→1 上升沿: 基线必须为 false, 之后 VREF false→true (掉电再上电) 才触发
                if (prev.vref === false && s.vrefValid === true) {
                    this._triggerPrev = { key: s.keyMode, rxd: s.rxdLogic, vref: true };
                    return;
                }
            } else if (mode === 'key-rising' && prev.key === false && s.keyMode === true) {
                this._triggerPrev = { key: true, rxd: s.rxdLogic, vref: s.vrefValid };
                return;
            } else if (mode === 'rxd-rising' && prev.rxd === false && s.rxdLogic === true) {
                this._triggerPrev = { key: s.keyMode, rxd: true, vref: s.vrefValid };
                return;
            } else if (mode === 'rxd-falling' && prev.rxd === true && s.rxdLogic === false) {
                this._triggerPrev = { key: s.keyMode, rxd: false, vref: s.vrefValid };
                return;
            }
            prev = { key: s.keyMode, rxd: s.rxdLogic, vref: s.vrefValid };
            this._triggerPrev = prev;
            await sleep(100);
        }
    }

    /* ================= 状态输出 (电平保持) =================
     * 语义: 烧录前及烧录时保持"忙电平", 成功后翻转为"成功电平", 下一片触发烧录恢复忙电平
     *   SRST 为普通 IO: 写0=低, 写1=高 (无反相)
     *   上升沿: 忙=低(0), 失败=高(1); 下降沿: 忙=高(1), 失败=低(0)
     */
    async _signalBusyLevels() {
        const p = this.cfg.statusOut.passAction, f = this.cfg.statusOut.failAction;
        let t = null, s = null;
        if (p === 'pass_txd_rise') t = 0;
        else if (p === 'pass_txd_fall') t = 1;
        if (f === 'fail_srst_rise') s = 0;          // 上升沿: 忙=低(0)
        else if (f === 'fail_srst_fall') s = 1;     // 下降沿: 忙=高(1)
        if (t === null && s === null) return;   // 全部无动作: 不改变引脚
        await this.outputTxdSrst(t, s);
    }
    async signalReady() { if (this.cfg.statusOut.enable) await this._signalBusyLevels(); }
    async signalBusy()  { if (this.cfg.statusOut.enable) await this._signalBusyLevels(); }
    // 成功: TXD 翻转为成功电平, SRST 保持
    async signalPass() {
        if (!this.cfg.statusOut.enable) return;
        const a = this.cfg.statusOut.passAction;
        const t = a === 'pass_txd_rise' ? 1 : a === 'pass_txd_fall' ? 0 : null;
        if (t === null) return;   // 无动作
        await this.outputTxdSrst(t, null);
    }
    // 失败: SRST 翻转为失败电平, TXD 保持
    async signalFail() {
        if (!this.cfg.statusOut.enable) return;
        const a = this.cfg.statusOut.failAction;
        const s = a === 'fail_srst_rise' ? 1 : a === 'fail_srst_fall' ? 0 : null;
        if (s === null) return;   // 无动作
        await this.outputTxdSrst(null, s);
    }

    /* ================= 容量校验 ================= */
    checkCapacity(files) {
        const maxEnd = files.reduce((m, f) => Math.max(m, f.addr + (f.data ? f.data.byteLength : 0)), 0);
        if (maxEnd > this.capacity) {
            throw new Error(`容量不足: 需要 ${maxEnd}B, 芯片仅 ${this.capacity}B`);
        }
        return maxEnd;
    }

    /* ================= 烧写 (强制 ERASE+VERIFY, 双计数器重试) ================= */
    async sendFlashWriteBlock(f, data, pos) {
        const data_len = Math.min(256, data.byteLength - pos);
        let op_mask = HERCULES_OP_WRITE | HERCULES_OP_ERASE | HERCULES_OP_VERIFY; // 强制
        if (this.cfg.options.autoRun) op_mask |= HERCULES_OP_AUTORESET;
        // 注意: 需传 ArrayBuffer (this.common.buffer), 不能传 DataView (new Uint8Array(DataView) 会得到空数组)
        // 多文件虚拟单一文件: 基地址 _baseAddr, data_pos = 绝对烧写地址 - 基地址, full_length = 虚拟文件总长
        // slice_pos=pos: 数据切片用文件内偏移 (data_pos 在虚拟文件模型中含文件地址, 不能用于切片)
        const cmd = hercules_cmd_flash_write(this.common.buffer, data, op_mask, this._fullLength, this._baseAddr, f.addr + pos - this._baseAddr, data_len, pos);
        const resp = await this.request(cmd, this.cfg.options.cmdTimeoutMs || 3000);
        if (!this.respOk(resp)) {
            const code = resp.getUint8(3);
            const detail = (code === HERCULES_SUBCMD_RESP_INVALID_COMMON) ? 'INVALID_COMMON(common不匹配, 需重新探测)'
                        : (code === HERCULES_SUBCMD_RESP_VERIFY_FAIL) ? 'VERIFY_FAIL'
                        : (code === HERCULES_SUBCMD_RESP_FAIL) ? 'FAIL' : 'code=' + code;
            throw new Error('块失败 @0x' + pos.toString(16) + ' ' + detail);
        }
        const done = new DataView(resp.buffer, resp.byteOffset + 4).getUint32(0, true);
        return done > 0 ? done : data_len;
    }

    // 单个文件烧写：块级重试 blockRetry + 整文件回退 fileRetry (双计数器独立, 上限 retryCount)
    // baseBytes: 本片内该文件之前已烧字节; totalBytes: 本片文件总字节 (进度条用)
    async burnFile(f, data, baseBytes, totalBytes) {
        const retryCount = this.cfg.options.retryCount;
        let fileRetry = 0;
        while (true) {
            let ok = true;
            let pos = 0;
            let blockRetry = 0;
            while (pos < data.byteLength) {
                try {
                    pos += await this.sendFlashWriteBlock(f, data, pos);
                    blockRetry = 0;                                   // 块成功 → 清零
                    this._progressBytes = baseBytes + pos;
                    this.progressFn({ phase: 'burning', done: this._progressBytes, total: totalBytes, file: f.name });
                } catch (e) {
                    blockRetry++;
                    this.stats.retryFail++;
                    this.log(`  [${f.name}] 块重试 #${blockRetry} @0x${pos.toString(16)}: ${e.message}`);
                    if (blockRetry > retryCount) { ok = false; break; }   // 块级耗尽 → 整文件回退
                }
            }
            if (ok) { this.log(`  [${f.name}] 写入完成 ${data.byteLength}B`); return; }
            fileRetry++;
            this.stats.retryFail++;
            this.log(`  [${f.name}] 整文件回退 #${fileRetry}`);
            this._progressBytes = baseBytes;                          // 进度回退到该文件起点
            this.progressFn({ phase: 'retry', done: this._progressBytes, total: totalBytes, file: f.name });
            if (fileRetry > retryCount) throw new Error(`文件 ${f.name} 重试耗尽`);
            await this.probeChip();                                   // 回退前重新探测
        }
    }

    /* ================= 量产循环 ================= */
    async run(cfg) {
        if (this.running) return;
        this.cfg = cfg;
        this.running = true;
        this.stats = { burn: 0, pass: 0, fail: 0, retryFail: 0 };
        this.chipRecords = [];      // 新会话重置逐片记录
        this._triggerPrev = null;   // 新量产会话重置触发状态
        this._autoFirst = true;     // 间隔触发: 新会话首次立即烧第一片
        this._progressBytes = 0;
        const totalBytes = this.cfg.files.reduce((s, f) => s + (f.data ? f.data.byteLength : 0), 0);
        this.progressFn({ phase: 'wait', done: 0, total: totalBytes });   // 会话开始: 等待首次触发
        this.stateFn('run');
        try {
            if (this.cfg.statusOut.enable) await this.takeover();
            await this.signalReady();
            // 多文件虚拟单一文件: 按地址升序烧写, 基地址 = 首个文件地址, full_length = 最大偏移 - 基地址
            // 量产中文件表锁定, 布局不随片变化 → 会话开始计算一次并输出, 后续烧录不重复
            const files = [...this.cfg.files].sort((a, b) => (a.addr || 0) - (b.addr || 0));
            this._baseAddr = files.length ? (files[0].addr || 0) : 0;
            const maxOffset = files.reduce((m, f) => Math.max(m, (f.addr || 0) + (f.data ? f.data.byteLength : 0)), 0);
            this._fullLength = maxOffset - this._baseAddr;
            this.log(`虚拟文件: 基地址 0x${this._baseAddr.toString(16)} full_length=0x${this._fullLength.toString(16)}B (最大偏移 0x${maxOffset.toString(16)}), 共 ${files.length} 个数据块区, 缝隙跳过`);
            while (this.running) {
                await this.waitTrigger();
                if (!this.running) break;
                await this.signalBusy();
                this.stats.burn++;
                this.log(`==== 开始烧写第 ${this.stats.burn} 片 ====`);
                this.progressFn({ phase: 'burning', done: 0, total: totalBytes });   // 下次烧录开始: 恢复0%蓝色
                try {
                    await this.probeChip();                           // 触发后探测 (输出: 探测: 芯片容量 ...)
                    this.checkCapacity(files);                        // 容量不足时抛错, 由下方 catch 输出; 满足时不输出
                    this._progressBytes = 0;
                    let base = 0;
                    for (const f of files) {
                        if (!f.data) throw new Error(`文件未加载: ${f.name}`);
                        await this.burnFile(f, f.data, base, totalBytes);
                        base += f.data.byteLength;
                    }
                    this.stats.pass++;
                    this.progressFn({ phase: 'pass', done: totalBytes, total: totalBytes });
                    await this.signalPass();
                    this.log(`✅ 第 ${this.stats.burn} 片成功`);
                    this._recordChip(true, '第 ' + this.stats.burn + ' 片成功');
                } catch (e) {
                    this.stats.fail++;
                    this.progressFn({ phase: 'fail', done: this._progressBytes, total: totalBytes });
                    await this.signalFail();
                    this.log(`❌ 第 ${this.stats.burn} 片失败: ${e.message}`);
                    this._recordChip(false, '第 ' + this.stats.burn + ' 片失败: ' + e.message);
                }
            }
        } catch (e) {
            this.log('量产异常终止: ' + e.message);
        } finally {
            if (this.cfg && this.cfg.statusOut.enable) await this.release();  // 退出量产解除接管
            this.running = false;
            this.progressFn({ phase: 'idle', done: 0, total: totalBytes });
            this.stateFn('idle');
        }
    }

    // 记录逐片结果 (生产报表明细数据源)
    _recordChip(ok, msg) {
        const rec = { t: new Date().toLocaleString('zh-CN', { hour12: false }), ok, msg };
        this.chipRecords.push(rec);
        if (this.chipRecords.length > 100000) this.chipRecords.splice(0, this.chipRecords.length - 100000);   // 软上限防超长会话
        this.chipResultFn(rec);
    }

    stop() {
        this.running = false;
        this._manualGo = false;
    }
}
