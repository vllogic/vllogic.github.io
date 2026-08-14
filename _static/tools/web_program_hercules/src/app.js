/* =========================================================================
 * Web Program Hercules - 量产控制面板 UI / 配置 / 连接管理
 * ========================================================================= */

/* ================= 三模态主题 ================= */
const ThemeManager = {
    btns: document.querySelectorAll('[data-theme]'),
    slider: document.getElementById('themeSlider'),
    init() {
        const saved = localStorage.getItem('hercules-theme-preference') || 'auto';
        this.apply(saved);
        this.btns.forEach(b => b.addEventListener('click', () => this.apply(b.dataset.theme)));
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (localStorage.getItem('hercules-theme-preference') === 'auto') this.apply('auto');
        });
    },
    apply(mode) {
        localStorage.setItem('hercules-theme-preference', mode);
        const isDark = mode === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : mode === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        const i = Array.from(this.btns).findIndex(b => b.dataset.theme === mode);
        if (this.slider) this.slider.style.left = `calc(${i * 33.33}% + 4px)`;
        this.btns.forEach(b => {
            const act = b.dataset.theme === mode;
            b.classList.toggle('text-white', act);
            b.classList.toggle('text-slate-500', !act);
        });
    }
};

/* ================= DOM 引用 ================= */
const $ = (id) => document.getElementById(id);
const connDot = $('connDot'), connText = $('connText'), connStatus = $('connStatus');
const versionShow = $('versionShow');
const connectBtn = $('connectBtn'), startBtn = $('startBtn'), stopBtn = $('stopBtn'), manualGoBtn = $('manualGoBtn');
const authDirName = $('authDirName'), exportCfgBtn = $('exportCfgBtn'), loadCfgBtn = $('loadCfgBtn');
const autoRunCb = $('autoRunCb'), retryCountSel = $('retryCountSel');
const statusOutCb = $('statusOutCb'), passActionSel = $('passActionSel'), failActionSel = $('failActionSel');
const autoIntervalSel = $('autoIntervalSel');

/* ================= 间隔触发: 秒数下拉启用/禁用 ================= */
function updateIntervalRow() {
    const mode = document.querySelector('input[name="trigger-mode"]:checked');
    autoIntervalSel.disabled = !(mode && mode.value === 'auto-timer');
}
const statBurn = $('statBurn'), statPass = $('statPass'), statFail = $('statFail'), statRetry = $('statRetry');
const vrefVal = $('vrefVal'), vrefState = $('vrefState'), rxdLevel = $('rxdLevel'), keyState = $('keyState');
const progressFill = $('progressFill'), progressText = $('progressText'), sessionState = $('sessionState');
const fileTable = $('fileTable'), logBox = $('logBox');

/* ================= 量产引擎 ================= */
const engine = new MassProduceEngine();

/* ================= 后台节流防护: 唤醒锁 + 节流检测 =================
 * 量产引擎轮询已改为 USB 事件驱动, 后台不受定时器节流影响;
 * 此处再防两类风险: (1) 显示器/系统休眠中断 USB 通信 → 唤醒锁;
 * (2) 浏览器节流降频 → 红色横幅 + 日志提醒操作员保持页面前台。
 */
const bgWarnEl = $('bgWarn');
const WakeGuard = {
    locks: [],
    _gen: 0,   // 代数计数: 防止停止瞬间迟到的 async 锁被误保留
    async acquire() {
        this.release();
        const gen = this._gen;
        if (!('wakeLock' in navigator)) {
            appendLog('⚠ 浏览器不支持唤醒锁: 运行期间电脑休眠将中断量产, 请保持页面前台', 'error');
            return false;
        }
        let got = false;
        for (const type of ['screen', 'system']) {   // screen: 防显示器休眠; system: 防整机休眠 (Chrome 131+)
            try {
                const lock = await navigator.wakeLock.request(type);
                if (gen !== this._gen) { try { lock.release(); } catch (_) { /* ignore */ } continue; }   // 已被停止: 丢弃迟到的锁
                this.locks.push(lock);
                got = true;
                appendLog('唤醒锁已获取: ' + type, 'debug');
            } catch (e) { /* 类型不支持/被拒绝: 忽略 */ }
        }
        if (!got && gen === this._gen) appendLog('⚠ 唤醒锁请求失败: 请勿让电脑休眠, 保持页面前台', 'error');
        return got;
    },
    release() {
        this._gen++;
        for (const l of this.locks) { try { l.release(); } catch (_) { /* ignore */ } }
        this.locks = [];
    }
};

let _bgDrift = 0, _bgWarnShown = false, _bgTitle = document.title;
function updateBgWarn() {
    const show = engine.running && (document.hidden || _bgDrift > 2500);
    if (bgWarnEl) {
        bgWarnEl.classList.toggle('hidden', !show);
        if (show) bgWarnEl.textContent = '⚠️ 页面在后台 / 浏览器节流中: 烧写轮询为 USB 事件驱动不受影响, 但请保持本标签页前台以获得最佳响应';
    }
    document.title = show ? '⚠ ' + _bgTitle : _bgTitle;
    if (show && !_bgWarnShown) {
        _bgWarnShown = true;
        appendLog('⚠️ 页面处于后台, 浏览器将节流定时器: 量产引擎已采用 USB 事件驱动轮询(不受影响), 但请尽量保持本标签页前台', 'error');
    } else if (!show) {
        _bgWarnShown = false;
    }
}

/* ================= 文件表状态 ================= */
let fileRows = [];  // { fileName, addr, cutAcf, rawData, loaded }

/* ================= 日志 ================= */
// 日志行数上限: 批量量产(如 3 万片)时 DOM 节点数恒定, 避免内存暴涨/卡顿
const MAX_LOG_LINES = 3000;

function appendLog(msg, level = 'info') {
    const div = document.createElement('div');
    div.className = 'log-line';
    if (level) div.dataset.level = level;   // debug/info/error: CSV 导出时过滤 debug 调试行
    div.textContent = `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${msg}`;
    logBox.appendChild(div);
    // 超出上限批量裁剪旧行, 保持 DOM 与 reflow 成本恒定
    const over = logBox.childElementCount - MAX_LOG_LINES;
    if (over > 0) {
        for (let i = 0; i < over; i++) logBox.removeChild(logBox.firstElementChild);
    }
    // 仅当接近底部时自动滚动, 避免每次追加都强制同步 reflow
    if (logBox.scrollTop + logBox.clientHeight >= logBox.scrollHeight - 40) {
        logBox.scrollTop = logBox.scrollHeight;
    }
}

/* ================= 统计 / 状态 UI ================= */
function refreshStats() {
    statBurn.textContent = engine.stats.burn;
    statPass.textContent = engine.stats.pass;
    statFail.textContent = engine.stats.fail;
    statRetry.textContent = engine.stats.retryFail;
}

function updateStatusPanel(st) {
    vrefVal.textContent = (st.vrefMv / 1000).toFixed(2) + 'V';
    const valid = st.vrefValid;
    vrefState.textContent = valid ? '已稳定' : '未稳定';
    vrefState.className = 'text-[9px] px-2 py-0.5 rounded-full ' +
        (valid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500');
    rxdLevel.textContent = st.rxdLogic ? '高' : '低';
    keyState.textContent = st.keyMode ? '按下' : '释放';
}

function updateProgress(p) {
    const pct = p.total > 0 ? Math.min(100, Math.round(p.done / p.total * 100)) : 0;
    if (progressFill) progressFill.style.width = pct + '%';
    // 阶段颜色: 烧录中=青蓝, 重试=琥珀, 成功=绿, 失败=红, 等待/空闲=灰
    const colors = { burning: 'bg-sky-500', retry: 'bg-amber-400', pass: 'bg-emerald-500', fail: 'bg-rose-500', wait: 'bg-slate-400', idle: 'bg-slate-400' };
    // 注意: 进度条不加 transition-all duration-* — 每 256B 块高频更新, 300ms 过渡动画会严重滞后
    if (progressFill) progressFill.className = 'h-full rounded-full ' + (colors[p.phase] || 'bg-sky-500');
    const labels = { burning: '烧录中', retry: '重试', pass: '成功', fail: '失败', wait: '等待', idle: '--' };
    if (progressText) {
        const label = labels[p.phase] || '';
        progressText.textContent = p.phase === 'idle' ? '--' : (label + ' ' + pct + '%');
        progressText.className = 'font-mono text-xs font-black ' +
            (p.phase === 'pass' ? 'text-emerald-500' : p.phase === 'fail' ? 'text-rose-500' :
             p.phase === 'retry' ? 'text-amber-500' : 'text-slate-500');
    }
    // SESSION 会话状态徽章 (与进度阶段同步)
    if (sessionState) {
        const sColors = { burning: 'bg-sky-500/20 text-sky-500', retry: 'bg-amber-400/20 text-amber-500', pass: 'bg-emerald-500/20 text-emerald-500', fail: 'bg-rose-500/20 text-rose-500', wait: 'bg-amber-400/20 text-amber-500', idle: 'bg-slate-200 dark:bg-slate-700 text-slate-500' };
        const sLabels = { burning: '烧录中', retry: '重试中', pass: '本片成功', fail: '本片失败', wait: '等待触发', idle: '空闲' };
        sessionState.className = 'text-[10px] px-2 py-0.5 rounded-full font-black ' + (sColors[p.phase] || sColors.idle);
        sessionState.textContent = sLabels[p.phase] || '空闲';
    }
}

/* ================= 连接管理 ================= */
function setConnectedUI(state) {
    // 兼容布尔调用: setConnectedUI(true/false) 与字符串调用
    if (state === true) state = 'connected';
    else if (state === false) state = 'disconnected';
    appendLog('[UI] 连接状态 → ' + state, 'debug');
    if (state === 'connected') {
        connectBtn.textContent = 'Disconnect';
        connectBtn.classList.add('bg-green-600');
        connStatus.textContent = 'ONLINE';
        connDot.className = 'w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#00d4ff]';
        connText.textContent = '已连接';
    } else if (state === 'connecting') {
        connectBtn.textContent = 'Connecting...';
        connStatus.textContent = 'CONNECTING...';
        connDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
        connText.textContent = '连接中...';
    } else {
        connectBtn.textContent = 'Connect Vllink';
        connectBtn.classList.remove('bg-green-600');
        connStatus.textContent = 'Disconnected';
        connDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400 shadow-[0_0_10px_rgba(100,116,139,0.6)]';
        connText.textContent = '未连接';
        versionShow.textContent = '-';
        stopBtn.disabled = true;
        manualGoBtn.disabled = true;
    }
    updateStartBtn();
}

async function performConnect() {
    if (engine._connecting) { appendLog('连接进行中，请稍候...'); return; }
    if (engine.port) {
        appendLog('断开连接...');
        engine.disconnect();
        setConnectedUI(false);
        appendLog('已断开');
        return;
    }
    connectBtn.disabled = true;
    try {
        appendLog('开始连接（请求设备）...');
        setConnectedUI('connecting');
        await engine.connect();
        appendLog('连接成功: ' + (engine.port ? engine.port.device_.productName : '(未知设备)'));
        setConnectedUI(true);
        versionShow.textContent = engine.version ? engine.version.toString(16) : '-';
    } catch (e) {
        setConnectedUI(false);
        const msg = String((e && e.message) || e);
        const hint = /already open|claim|occupied|in use|busy/i.test(msg)
            ? ' （设备可能被其他网页占用，请先关闭 web_download_hercules 等页面后重试）' : '';
        appendLog('连接失败: ' + msg + hint);
    } finally {
        connectBtn.disabled = false;
    }
}

/* ================= 配置收集 / 恢复 ================= */
function collectCfg() {
    const mode = document.querySelector('input[name="trigger-mode"]:checked');
    return {
        schema: 4,
        product: '',
        options: {
            autoProbe: true,
            autoErase: true,          // 量产强制
            autoVerify: true,         // 量产强制
            autoRun: autoRunCb.checked,
            retryCount: parseInt(retryCountSel.value, 10),
            cmdTimeoutMs: 3000,
            speedKHz: 48000
        },
        trigger: { mode: mode ? mode.value : 'vref-rising', autoInterval: parseFloat(autoIntervalSel.value) },
        statusOut: {
            enable: statusOutCb.checked,
            passAction: passActionSel.value,
            failAction: failActionSel.value
        },
        files: fileRows.map(r => ({ name: r.fileName, addr: r.addr, cutAcf: r.cutAcf, rawData: r.rawData }))
    };
}

function applyCfg(cfg) {
    if (!cfg) return;
    if (cfg.options) {
        autoRunCb.checked = !!cfg.options.autoRun;
        if (cfg.options.retryCount !== undefined) retryCountSel.value = String(cfg.options.retryCount);
    }
    if (cfg.trigger && cfg.trigger.mode) {
        const radio = document.querySelector(`input[name="trigger-mode"][value="${cfg.trigger.mode}"]`);
        if (radio) radio.checked = true;
        // 仅当配置的间隔值在新选项列表中存在时才恢复 (旧配置值如 3/5/8 不在新列表则保持默认 2s)
        if (cfg.trigger.autoInterval && [...autoIntervalSel.options].some(o => o.value === String(cfg.trigger.autoInterval))) {
            autoIntervalSel.value = String(cfg.trigger.autoInterval);
        }
    }
    updateIntervalRow();
    if (cfg.statusOut) {
        statusOutCb.checked = cfg.statusOut.enable !== false;
        if (cfg.statusOut.passAction) passActionSel.value = cfg.statusOut.passAction;
        if (cfg.statusOut.failAction) failActionSel.value = cfg.statusOut.failAction;
    }
    if (Array.isArray(cfg.files)) {
        fileRows = cfg.files.map(f => ({
            fileName: f.name || '', addr: f.addr || 0, cutAcf: f.cutAcf !== false, rawData: null, loaded: false
        }));
        renderFileTable();
    }
}

/* ================= 文件裁剪 (烧写前) ================= */
function prepareFiles(cfg) {
    for (const f of cfg.files) {
        if (!f.rawData) { f.data = null; continue; }
        let start = 0;
        const ext = (f.name || '').toLowerCase().endsWith('.acf');
        if (f.cutAcf && ext) {
            start = getFlashWriteStartPos(f.rawData, 'acf', 0, true);
        }
        f.data = new Uint8Array(f.rawData.slice(start));
        delete f.rawData;
    }
}

/* ================= 文件占用空间重叠检测 ================= */
// 计算单个文件的烧写占用区间 [start, end) (含 ACF 注释头偏移), 未加载返回 null
function computeFileRange(r) {
    const buf = r.rawData || r.data;
    if (!buf) return null;
    const ext = (r.fileName || '').toLowerCase().endsWith('.acf');
    let start = 0;
    if (r.cutAcf && ext) {
        const ab = buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        start = getFlashWriteStartPos(ab, 'acf', 0, true);
    }
    // ACF+CutACF 时排除注释头(长度 start): 实际占用 = [addr, addr + 文件总长 - 头长)
    return { name: r.fileName || '(未命名)', addr: r.addr, start: r.addr, end: r.addr + buf.byteLength - start };
}

// 检查所有已加载文件的占用空间重叠, 返回重叠对数组 [{i, j}] (i<j)
function findOverlaps() {
    const ranges = fileRows.map(computeFileRange);
    const overlaps = [];
    for (let i = 0; i < ranges.length; i++) {
        if (!ranges[i]) continue;
        for (let j = i + 1; j < ranges.length; j++) {
            if (!ranges[j]) continue;
            if (ranges[i].start < ranges[j].end && ranges[j].start < ranges[i].end) {
                overlaps.push({ i, j });
            }
        }
    }
    return overlaps;
}

// 烧录地址必须按 0x100 对齐
function isAddrAligned(addr) { return addr % 0x100 === 0; }

// 更新文件表中的告警提示(地址对齐 + 占用重叠) + 开始按钮可用性
function updateFileWarnings() {
    const overlaps = findOverlaps();
    fileRows.forEach((r, i) => {
        const el = fileTable.querySelector(`[data-warn="${i}"]`);
        if (!el) return;
        const warns = [];
        if (!isAddrAligned(r.addr)) warns.push('地址未按 0x100 对齐');
        overlaps.filter(o => o.i === i || o.j === i).forEach(o => {
            const other = o.i === i ? fileRows[o.j] : fileRows[o.i];
            warns.push(`与「${other.fileName || '(未命名)'}」地址重叠`);
        });
        if (warns.length) {
            el.textContent = '⚠ ' + warns.join('；');
            el.classList.remove('hidden');
        } else {
            el.textContent = '';
            el.classList.add('hidden');
        }
    });
    updateStartBtn();
}

/* ================= 文件表渲染 ================= */
function renderFileTable() {
    fileTable.innerHTML = fileRows.map((r, i) => `
        <div class="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3">
            <div class="flex-1 flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                    <input type="file" accept=".acf,.bin" class="hidden file-input" data-idx="${i}" />
                    <button type="button" data-idx="${i}" data-field="pick" class="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black bg-primary/10 text-primary hover:bg-primary/20 transition-colors">${r.loaded ? '🔄 更换' : '📁 选择文件'}</button>
                    <span data-file-name="${i}" class="text-xs font-mono ${r.loaded ? 'text-emerald-500' : 'text-slate-400'} truncate min-w-0" title="${r.fileName || ''}">${r.loaded ? '✓ ' + r.fileName : (r.fileName ? r.fileName + '（未加载）' : '未选择文件')}</span>
                </div>
                <div data-warn="${i}" class="text-[10px] font-bold text-rose-500 hidden"></div>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span class="text-[9px] text-slate-400 uppercase font-black w-16">地址 0x</span>
                <input type="text" data-idx="${i}" data-field="addr" value="${r.addr.toString(16)}" class="addr-input w-24 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-mono outline-none" />
                <label class="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" data-idx="${i}" data-field="cutAcf" ${r.cutAcf ? 'checked' : ''} class="accent-primary" /> Cut ACF
                </label>
                <button data-idx="${i}" data-field="del" class="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors">✕</button>
            </div>
        </div>`).join('') || '<div class="text-center text-slate-500 text-xs italic py-6">暂无文件，点击"添加文件"</div>';
    updateFileWarnings();
}

function bindFileTable() {
    fileTable.addEventListener('change', (e) => {
        if (engine.running) return;   // 量产中禁止修改文件表
        const input = e.target;
        if (input.classList.contains('file-input')) {
            const i = parseInt(input.dataset.idx, 10);
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                fileRows[i].rawData = reader.result;
                fileRows[i].fileName = file.name;
                fileRows[i].loaded = true;
                // 仅局部更新该行状态, 不重建表格 (避免隐藏 file input 重置)
                const nameEl = fileTable.querySelector(`[data-file-name="${i}"]`);
                if (nameEl) {
                    nameEl.textContent = '✓ ' + file.name;
                    nameEl.className = 'text-xs font-mono text-emerald-500 truncate min-w-0';
                    nameEl.title = file.name;
                }
                const pickBtn = fileTable.querySelector(`[data-idx="${i}"][data-field="pick"]`);
                if (pickBtn) pickBtn.textContent = '🔄 更换';
                appendLog(`加载文件: ${file.name} (${reader.result.byteLength}B)`);
                updateFileWarnings();
            };
            reader.readAsArrayBuffer(file);
        } else if (input.dataset.field === 'cutAcf') {
            const i = parseInt(input.dataset.idx, 10);
            fileRows[i].cutAcf = input.checked;
            updateFileWarnings();
        }
    });
    fileTable.addEventListener('input', (e) => {
        if (engine.running) return;   // 量产中禁止修改文件表
        if (e.target.classList.contains('addr-input')) {
            const i = parseInt(e.target.dataset.idx, 10);
            const v = parseInt(e.target.value, 16);
            fileRows[i].addr = isNaN(v) ? 0 : v;
            updateFileWarnings();
        }
    });
    fileTable.addEventListener('click', (e) => {
        if (engine.running) return;   // 量产中禁止修改文件表
        const pick = e.target.closest('[data-field="pick"]');
        if (pick) {
            const i = parseInt(pick.dataset.idx, 10);
            const input = fileTable.querySelector(`.file-input[data-idx="${i}"]`);
            if (input) input.click();
            return;
        }
        const btn = e.target.closest('[data-field="del"]');
        if (btn) {
            const i = parseInt(btn.dataset.idx, 10);
            fileRows.splice(i, 1);
            renderFileTable();
        }
    });
}

/* ================= ConfigStore (File System Access + IndexedDB + 授权前置) ================= */
const ConfigStore = {
    dirHandle: null,
    idbName: 'hercules-mass',
    idbStore: 'dir-handle',

    supportsFileSystem() { return typeof window.showDirectoryPicker === 'function'; },

    _openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.idbName, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(this.idbStore);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    async _saveDirHandle(handle) {
        const db = await this._openDB();
        await new Promise((res, rej) => {
            const tx = db.transaction(this.idbStore, 'readwrite');
            tx.objectStore(this.idbStore).put(handle, 'dir');
            tx.oncomplete = res; tx.onerror = () => rej(tx.error);
        });
        db.close();
    },
    async _loadDirHandle() {
        const db = await this._openDB();
        const handle = await new Promise((res, rej) => {
            const tx = db.transaction(this.idbStore, 'readonly');
            const rq = tx.objectStore(this.idbStore).get('dir');
            rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
        });
        db.close();
        return handle || null;
    },

    async authorizeDir() {
        if (!this.supportsFileSystem()) { appendLog('当前浏览器不支持 File System Access，无法使用配置自动导入/导出(需 Chrome/Edge)'); return null; }
        try {
            this.dirHandle = await window.showDirectoryPicker();
            await this._saveDirHandle(this.dirHandle);
            appendLog('已授权目录: ' + this.dirHandle.name);
            updateAuthUI();
            return this.dirHandle;
        } catch (e) { return null; }
    },

    async restoreDir() {
        if (!this.supportsFileSystem()) return null;
        try {
            const handle = await this._loadDirHandle();
            if (!handle) return null;
            let perm = await handle.queryPermission({ mode: 'read' });
            if (perm !== 'granted') perm = await handle.requestPermission({ mode: 'read' });
            if (perm !== 'granted') return null;
            this.dirHandle = handle;
            updateAuthUI();
            return handle;
        } catch (e) { return null; }
    },

    async readFile(name) {
        if (!this.dirHandle || !name) return null;
        try {
            const fh = await this.dirHandle.getFileHandle(name);
            const file = await fh.getFile();
            return await file.arrayBuffer();
        } catch (e) { return null; }
    },

    async writeConfig(json) {
        if (!this.dirHandle) return false;
        try {
            const fh = await this.dirHandle.getFileHandle('config.json', { create: true });
            const w = await fh.createWritable();
            await w.write(json);
            await w.close();
            return true;
        } catch (e) { console.warn(e); return false; }
    },

    async readConfig() {
        const buf = await this.readFile('config.json');
        if (!buf) return null;
        try { return JSON.parse(new TextDecoder().decode(buf)); } catch (e) { return null; }
    }
};

/* ================= 授权 UI 状态 ================= */
// 仅在已授权目录时允许导出/载入配置, 并显示当前授权目录名
function updateAuthUI() {
    const authed = !!ConfigStore.dirHandle;
    if (exportCfgBtn) exportCfgBtn.disabled = !authed;
    if (loadCfgBtn) loadCfgBtn.disabled = !authed;
    if (authDirName) {
        if (authed) {
            authDirName.textContent = '📁 ' + ConfigStore.dirHandle.name;
            authDirName.title = ConfigStore.dirHandle.name;
            authDirName.classList.remove('hidden');
        } else {
            authDirName.textContent = '';
            authDirName.title = '';
            authDirName.classList.add('hidden');
        }
    }
}

/* ================= 配置导出 / 载入 (必须先授权目录) ================= */
// 确保已授权目录: 优先恢复 IndexedDB 保存的目录句柄, 否则弹出目录选择框引导授权
async function ensureDirAuthorized() {
    if (ConfigStore.dirHandle) return true;
    if (!ConfigStore.supportsFileSystem()) {
        appendLog('当前浏览器不支持 File System Access，无法使用配置自动导入/导出(需 Chrome/Edge)');
        return false;
    }
    if (await ConfigStore.restoreDir()) {
        appendLog('已恢复目录授权: ' + ConfigStore.dirHandle.name);
        return true;
    }
    appendLog('未授权目录，请选择固件文件夹以启用配置自动导入/导出...');
    const handle = await ConfigStore.authorizeDir();
    return !!handle;
}

async function exportConfig() {
    if (!await ensureDirAuthorized()) {
        appendLog('未获得目录授权，配置未导出');
        return;
    }
    const cfg = collectCfg();
    cfg.files.forEach(f => delete f.rawData);
    const json = JSON.stringify(cfg, null, 2);
    const ok = await ConfigStore.writeConfig(json);
    if (ok) appendLog('配置已导出到目录 config.json');
    else appendLog('配置导出失败');
}

async function loadConfigFromDir() {
    if (!await ensureDirAuthorized()) {
        appendLog('未获得目录授权，配置未载入');
        return null;
    }
    const cfg = await ConfigStore.readConfig();
    if (!cfg) { appendLog('目录中未找到 config.json'); return null; }
    applyCfg(cfg);
    appendLog('已载入配置: ' + (cfg.product || '(未命名)'));
    // 自动按文件名加载固件
    let anyLoaded = false;
    for (const r of fileRows) {
        const buf = await ConfigStore.readFile(r.fileName);
        if (buf) { r.rawData = buf; r.loaded = true; anyLoaded = true; }
    }
    renderFileTable();
    if (anyLoaded) appendLog('已从目录自动加载固件文件');
    else if (fileRows.length) appendLog('提示: 部分固件文件未在目录中找到，请手动选择');
    return cfg;
}

/* ================= 按钮 / 配置锁定状态 ================= */
function updateStartBtn() {
    const hasError = findOverlaps().length > 0 || fileRows.some(r => !isAddrAligned(r.addr));
    const canStart = !!engine.port && fileRows.some(r => r.loaded && r.rawData) && !engine.running && !hasError;
    startBtn.disabled = !canStart;
    if (canStart) {
        startBtn.classList.add('bg-emerald-500', 'shadow-lg', 'shadow-emerald-500/30', 'hover:bg-emerald-400', 'active:scale-95', 'text-white');
        startBtn.classList.remove('bg-slate-300', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400');
    } else {
        startBtn.classList.remove('bg-emerald-500', 'shadow-lg', 'shadow-emerald-500/30', 'hover:bg-emerald-400', 'active:scale-95', 'text-white');
        startBtn.classList.add('bg-slate-300', 'dark:bg-slate-700', 'text-slate-500', 'dark:text-slate-400');
    }
}

function setConfigLocked(locked) {
    ['cfgCardTrigger', 'cfgCardOptions', 'cfgCardStatus'].forEach(id => {
        const card = document.getElementById(id);
        if (!card) return;
        card.classList.toggle('opacity-40', locked);
        card.classList.toggle('pointer-events-none', locked);
        card.classList.toggle('grayscale', locked);
        card.querySelectorAll('input, select').forEach(el => {
            if (!locked && (el.id === 'autoEraseLocked' || el.id === 'autoVerifyLocked')) return;  // 永久锁定项
            el.disabled = locked;
        });
    });
    // 烧写文件表: 量产中禁止修改 (选择文件/地址/CutACF/删除/添加)
    const ftCard = document.getElementById('fileTableCard');
    if (ftCard) {
        ftCard.classList.toggle('opacity-40', locked);
        ftCard.classList.toggle('pointer-events-none', locked);
        ftCard.classList.toggle('grayscale', locked);
        ftCard.querySelectorAll('input, button').forEach(el => { el.disabled = locked; });
    }
    if (!locked) updateIntervalRow();   // 解锁后按触发模式恢复下拉状态
}

/* ================= 量产控制 ================= */
async function startRun() {
    if (engine.running) return;
    if (!engine.port) { appendLog('请先连接 Vllink'); return; }
    if (!fileRows.length) { appendLog('请先添加烧写文件'); return; }
    const alignBad = fileRows.filter(r => !isAddrAligned(r.addr));
    if (alignBad.length) {
        appendLog('❌ 以下文件烧录地址未按 0x100 对齐，禁止开始量产: ' + alignBad.map(r => `「${r.fileName || '(未命名)'}」@0x${r.addr.toString(16)}`).join('；'));
        return;
    }
    const overlaps = findOverlaps();
    if (overlaps.length) {
        appendLog('❌ 文件占用空间重叠，禁止开始量产: ' + overlaps.map(o => `「${fileRows[o.i].fileName}」与「${fileRows[o.j].fileName}」`).join('；'));
        return;
    }
    const cfg = collectCfg();
    prepareFiles(cfg);
    const missing = cfg.files.filter(f => !f.data);
    if (missing.length) {
        appendLog('以下文件未加载: ' + missing.map(m => m.name || '(未命名)').join(', '));
        return;
    }
    startBtn.disabled = true;
    stopBtn.disabled = false;
    setConfigLocked(true);
    appendLog(`======== 量产开始 ======== (触发=${cfg.trigger.mode} 成功=${cfg.statusOut.passAction} 失败=${cfg.statusOut.failAction} 间隔=${cfg.trigger.autoInterval}s)`);
    engine.run(cfg);
}

function stopRun() {
    if (engine.running) {
        engine.stop();
        appendLog('停止量产（等待当前片结束）...');
    }
}

/* ================= CSV 导出 ================= */
// 报表结构: 头部统计 + 逐片明细(结构化, 3 万片也仅几 MB) + 最近日志(过滤 debug 调试行)
function exportCsv() {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const rows = [
        ['生产报表', 'web_program_hercules'],
        ['导出时间', new Date().toLocaleString('zh-CN', { hour12: false })],
        ['总烧录(不含重试)', engine.stats.burn],
        ['成功(不含重试)', engine.stats.pass],
        ['失败(不含重试)', engine.stats.fail],
        ['含重试失败次数', engine.stats.retryFail],
        [],
        ['=== 逐片明细 ==='],
        ['序号', '时间', '结果', '详情']
    ];
    engine.getChipRecords().forEach((r, i) => {
        rows.push([i + 1, r.t, r.ok ? 'PASS' : 'FAIL', r.msg]);
    });
    rows.push([], ['=== 日志 (最近 ' + MAX_LOG_LINES + ' 条, 已过滤调试信息) ===']);
    document.querySelectorAll('#logBox .log-line').forEach(line => {
        if (line.dataset.level === 'debug') return;   // 过滤调试行 (OUTPUT_TXD_SRST / [UI] / [USB])
        rows.push([line.textContent]);
    });
    const csv = rows.map(r => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'mass_report_' + Date.now() + '.csv';
    a.click();
    appendLog('已导出报表 CSV (逐片明细 ' + engine.getChipRecords().length + ' 条)');
}

/* ================= 自动重连 ================= */
async function autoConnectOnLoad() {
    if (!navigator.usb) { appendLog('浏览器不支持 WebUSB（需 Chrome/Edge + HTTPS/localhost）'); return; }
    try {
        const ports = await dapv2.getPorts();
        if (ports.length === 0) { appendLog('自动重连: 无已授权设备'); return; }
        appendLog('自动重连: 检测到 ' + ports.length + ' 台已授权设备');
        setConnectedUI('connecting');
        await engine.connect(ports[0].device_);
        appendLog('自动重连成功');
        setConnectedUI(true);
        versionShow.textContent = engine.version ? engine.version.toString(16) : '-';
    } catch (e) {
        appendLog('自动重连失败: ' + ((e && e.message) || e));
        setConnectedUI(false);
    }
}

if (navigator.usb) {
    navigator.usb.addEventListener('connect', async (ev) => {
        appendLog('[USB] connect 事件: ' + (ev.device.productName || ev.device.productId), 'debug');
        if (!engine.port) {
            try {
                setConnectedUI('connecting');
                await engine.connect(ev.device);
                appendLog('[USB] 自动重连成功');
                setConnectedUI(true);
                versionShow.textContent = engine.version ? engine.version.toString(16) : '-';
            } catch (e) { appendLog('[USB] 自动重连失败: ' + ((e && e.message) || e)); setConnectedUI(false); }
        }
    });
    navigator.usb.addEventListener('disconnect', (ev) => {
        appendLog('[USB] disconnect 事件: ' + (ev.device.productName || ev.device.productId), 'debug');
        if (engine.port && ev.device === engine.port.device_) {
            engine.disconnect();
            setConnectedUI(false);
            appendLog('设备已断开');
        }
    });
}

/* ================= 初始化 ================= */
function init() {
    ThemeManager.init();
    bindFileTable();
    addFileRow();

    connectBtn.addEventListener('click', performConnect);
    startBtn.addEventListener('click', startRun);
    stopBtn.addEventListener('click', stopRun);
    manualGoBtn.addEventListener('click', () => engine.manualGo());
    document.querySelectorAll('input[name="trigger-mode"]').forEach(r => r.addEventListener('change', updateIntervalRow));
    $('addFileBtn').addEventListener('click', addFileRow);
    $('exportCsvBtn').addEventListener('click', exportCsv);
    const clearLogBtn = $('clearLogBtn');
    if (clearLogBtn) clearLogBtn.addEventListener('click', () => {
        logBox.innerHTML = '';
        appendLog('日志已清空');
    });
    $('authDirBtn').addEventListener('click', () => ConfigStore.authorizeDir());
    $('exportCfgBtn').addEventListener('click', exportConfig);
    $('loadCfgBtn').addEventListener('click', async () => {
        await loadConfigFromDir();
    });

    engine.setLog(appendLog);
    engine.setStatus(updateStatusPanel);
    engine.setProgress(updateProgress);
    engine.setState((s) => {
        const running = s === 'run';
        setConfigLocked(running);
        updateStartBtn();
        if (running) WakeGuard.acquire();
        else WakeGuard.release();
        updateBgWarn();
    });
    setInterval(refreshStats, 400);
    setInterval(() => {
        // 运行中使能停止/手动触发
        stopBtn.disabled = !engine.running;
        manualGoBtn.disabled = !(engine.running && engine.cfg && engine.cfg.trigger.mode === 'manual');
        updateStartBtn();
    }, 400);

    // 后台节流检测: 以本定时器自身间隔漂移为信号 (前台 ~1s, 后台被降频到 ≥2.5s 即告警)
    let tickLast = performance.now();
    setInterval(() => {
        const now = performance.now();
        _bgDrift = now - tickLast;
        tickLast = now;
        updateBgWarn();
    }, 1000);

    // 页面可见性: 切到后台立即告警; 回到前台重新获取唤醒锁 (screen 锁在隐藏期间被浏览器自动释放)
    document.addEventListener('visibilitychange', () => {
        updateBgWarn();
        if (!document.hidden && engine.running) WakeGuard.acquire();
    });

    // 量产运行中防止误关标签页 (当前片烧录被中断 = 该片报废)
    window.addEventListener('beforeunload', (e) => {
        if (!engine.running) return;
        e.preventDefault();
        e.returnValue = '';
    });

    // 恢复已授权目录: 显示目录名并启用导出/载入配置
    (async () => {
        if (ConfigStore.supportsFileSystem() && await ConfigStore.restoreDir()) {
            appendLog('已恢复目录授权: ' + ConfigStore.dirHandle.name);
        }
        updateAuthUI();
    })();

    autoConnectOnLoad();
}

function addFileRow() {
    fileRows.push({ fileName: '', addr: 0, cutAcf: true, rawData: null, loaded: false });
    renderFileTable();
}

init();
