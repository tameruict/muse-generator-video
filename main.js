const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Notification } = require('electron');
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const { Store } = require('./lib/store'), { Engine } = require('./lib/engine'), api = require('./lib/muse'), { Studio } = require('./lib/studio'), { Tools } = require('./lib/tools');
const { ensureOutputDir, probeWritableDir, defaultOutputDir } = require('./lib/paths');
const i18n = require('./lib/i18n');
const { t, getLang } = i18n;
if (process.env.MUSE_USERDATA) app.setPath('userData', process.env.MUSE_USERDATA);
// Tránh lỗi "Unable to move the cache / Gpu Cache Creation failed" (cache bị khoá do bản đang chạy khác hoặc quyền thư mục)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disk-cache-dir', path.join(require('os').tmpdir(), 'muse-studio-cache-' + process.pid));
if (!process.env.MUSE_USERDATA && !app.requestSingleInstanceLock()) app.exit(0);   // chỉ cho chạy 1 cửa sổ (exit thay vì quit để không kịp mở cửa sổ thứ 2)
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
let win, store, engine, studio, tools, studioOn = false, pt = null, lastDone = -1, lastErr = -1;
const uid = () => crypto.randomBytes(6).toString('hex');

function snapshot() {
  return { settings: store.data.settings, accounts: engine.accountView(), characters: store.data.characters,
    styles: store.data.styles, videos: store.data.videos, running: engine.running, active: engine.active, notice: engine.notice, avgSceneMs: engine.avgSceneMs() };
}
function push() {
  if (pt) return;
  pt = setTimeout(() => { pt = null; notifyDone(); if (win && !win.isDestroyed()) win.webContents.send('state', snapshot()); }, 500);
}
// Thông báo trên máy khi có video mới render xong / bị lỗi (chỉ khi cửa sổ không đang được xem)
function notifyDone() {
  if (!store || !Notification.isSupported()) return;
  const done = store.data.videos.filter(v => v.status === 'done').length, err = store.data.videos.filter(v => v.status === 'error').length;
  if (lastDone < 0) { lastDone = done; lastErr = err; return; }
  const on = store.data.settings.notify !== false && !(win && win.isFocused());
  const lang = getLang(store);
  if (on && done > lastDone) new Notification({ title: 'Muse Studio', body: t(lang, 'notify.done', { count: done - lastDone, total: done }) }).show();
  else if (on && err > lastErr) new Notification({ title: 'Muse Studio', body: t(lang, 'notify.err') }).show();
  lastDone = done; lastErr = err;
}
function h(name, fn) {
  ipcMain.handle(name, async (_e, ...a) => {
    try { return { ok: true, data: await fn(...a) }; } catch (e) { return { ok: false, error: e.message || String(e) }; } });
}
function copyAssets(files) {
  const dir = path.join(app.getPath('userData'), 'assets'); fs.mkdirSync(dir, { recursive: true });
  return files.map(f => { if (f.startsWith(dir)) return f; const t = path.join(dir, uid() + path.extname(f)); fs.copyFileSync(f, t); return t; });
}
function createWindow() {
  win = new BrowserWindow({ width: 1480, height: 900, minWidth: 1100, minHeight: 700, backgroundColor: '#ffffff', title: 'Muse Studio',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
  win.setMenuBarVisibility(false); win.webContents.on('before-input-event', (e, i) => { if (app.isPackaged) return; if (i.type === 'keyDown' && (i.key === 'F12' || (i.control && i.shift && i.key.toLowerCase() === 'i'))) win.webContents.toggleDevTools(); }); win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (process.env.MUSE_SMOKE) win.webContents.on('did-finish-load', () => setTimeout(async () => {
    const errs = await win.webContents.executeJavaScript('window.__errs||[]');
    const img = await win.webContents.capturePage(); fs.writeFileSync(process.env.MUSE_SMOKE, img.toPNG()); console.log('SMOKE errs', JSON.stringify(errs)); app.quit(); }, 2500));
}
app.whenReady().then(() => {
  store = new Store(app.getPath('userData'));
  i18n.setCurrentLang(getLang(store));
  const { dir, fallback } = ensureOutputDir(store.data.settings.outputDir, p => app.getPath(p), getLang(store));
  store.data.settings.outputDir = dir;
  if (fallback) store.save();
  engine = new Engine(store, push); engine.boot();
  api.configure({ dataDir: app.getPath('userData') });
  engine.refreshRemote().catch(() => {});

  h('state:get', () => snapshot());
  h('settings:uiLang', lang => {
    const l = i18n.SUPPORTED.includes(lang) ? lang : 'vi';
    store.data.settings.uiLang = l;
    i18n.setCurrentLang(l);
    engine.changed();
    return l;
  });
  h('settings:save', s => {
    const nextLang = (s && i18n.SUPPORTED.includes(s.uiLang)) ? s.uiLang : getLang(store);
    const rawDir = String((s && 'outputDir' in s ? s.outputDir : store.data.settings.outputDir) || '').trim();
    let targetDir;
    if (rawDir) {
      try { targetDir = probeWritableDir(rawDir, nextLang); }
      catch (e) { throw new Error(t(nextLang, 'err.invalidOutputDirWithDetail', { dir: rawDir, msg: e.message || e })); }
    } else {
      targetDir = defaultOutputDir(p => app.getPath(p), nextLang);
    }
    Object.assign(store.data.settings, { ...s, outputDir: targetDir, uiLang: nextLang });
    i18n.setCurrentLang(nextLang);
    engine.changed();
  });
  h('bridge:test', async () => { await api.ping(); return engine.refreshRemote(); });
  h('acct:otp', async a => { if (!a.email) throw new Error(t(getLang(store), 'err.enterEmail')); await api.loginStart(a.email, 'VN'); });
  h('acct:add', async a => {
    if (!a.email || !a.otp) throw new Error(t(getLang(store), 'err.enterEmailOtp'));
    const maxJobs = 1; // mỗi tài khoản 1 video một lúc để kết quả không lẫn nhau
    await api.loginConfirm(a.email, a.otp);
    const ex = store.data.accounts.find(x => x.email === a.email);
    if (ex) { ex.maxJobs = maxJobs; ex.enabled = true; } else store.data.accounts.push({ email: a.email, maxJobs, enabled: true, addedAt: Date.now() });
    engine.accState.delete(a.email); engine.refreshRemote().catch(() => {}); engine.changed();
  });
  h('acct:cookies', async a => {
    if (!a.email || !a.cookies) throw new Error(t(getLang(store), 'err.enterEmailCookies'));
    await api.importCookies(a.email, a.cookies);
    const ex = store.data.accounts.find(x => x.email === a.email);
    if (ex) ex.enabled = true; else store.data.accounts.push({ email: a.email, maxJobs: 1, enabled: true, addedAt: Date.now() });
    engine.accState.delete(a.email); engine.refreshRemote().catch(() => {}); engine.changed();
  });
  h('acct:remove', async email => {
    await api.removeAccount(email);
    store.data.accounts = store.data.accounts.filter(a => a.email !== email); engine.changed();
  });
  h('acct:toggle', email => { const a = store.data.accounts.find(x => x.email === email); if (a) a.enabled = a.enabled === false; engine.changed(); });
  h('acct:reset', email => { engine.accState.delete(email); engine.changed(); });
  h('acct:refresh', () => engine.refreshRemote());
  h('acct:check', email => engine.checkAccount(email));
  h('acct:checkAll', () => engine.checkAll());
  h('acct:resetAll', () => { engine.accState.clear(); engine.changed(); });
  h('char:save', c => {
    const o = { id: c.id || uid(), name: c.name.trim(), desc: c.desc.trim(), images: copyAssets(c.images || []) };
    if (!o.name) throw new Error(t(getLang(store), 'err.enterCharName'));
    const i = store.data.characters.findIndex(x => x.id === o.id); if (i >= 0) store.data.characters[i] = o; else store.data.characters.push(o);
    engine.changed();
  });
  h('char:describe', async ({ name, images }) => {
    const lang = getLang(store);
    const imgs = (images || []).filter(f => fs.existsSync(f)).slice(0, 2);
    if (!imgs.length) throw new Error(t(lang, 'err.pickCharImages'));
    if (!engine.canAsk()) throw new Error(t(lang, 'err.noAccountForDescribe'));
    const out = String(await engine.ask(require('./lib/spark').describePrompt(name), { images: imgs, timeout: 120 }) || '').trim().replace(/^[\"'“”\s]+|[\"'“”\s]+$/g, '');
    if (out.length < 30) throw new Error(t(lang, 'err.museDescribeFailed'));
    return out.slice(0, 700);
  });
  h('char:delete', id => { store.data.characters = store.data.characters.filter(c => c.id !== id); engine.changed(); });
  h('style:describe', async ({ name, hint }) => {
    const lang = getLang(store);
    if (!String(name || '').trim()) throw new Error(t(lang, 'err.enterStyleNameFirst'));
    if (!engine.canAsk()) throw new Error(t(lang, 'err.noAccount'));
    const out = String(await engine.ask(require('./lib/spark').stylePrompt(name, hint), { timeout: 120 }) || '').trim().replace(/^[\"'“”\s]+|[\"'“”\s]+$/g, '');
    if (out.length < 30) throw new Error(t(lang, 'err.museReplyTooShort'));
    return out.slice(0, 600);
  });
  h('style:save', s => {
    const o = { id: s.id || uid(), name: s.name.trim(), text: s.text.trim() };
    if (!o.name) throw new Error(t(getLang(store), 'err.enterStyleName'));
    const i = store.data.styles.findIndex(x => x.id === o.id); if (i >= 0) store.data.styles[i] = o; else store.data.styles.push(o);
    engine.changed();
  });
  h('style:delete', id => { store.data.styles = store.data.styles.filter(s => s.id !== id); engine.changed(); });
  h('pick:images', async () => (await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters: [{ name: t(getLang(store), 'dialog.images'), extensions: ['jpg', 'jpeg', 'png', 'webp'] }] })).filePaths);
  h('pick:audio', async () => (await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: t(getLang(store), 'dialog.audio'), extensions: ['mp3', 'wav', 'm4a'] }] })).filePaths[0] || '');
  h('pick:dir', async () => (await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })).filePaths[0] || '');
  h('queue:add', spec => engine.addToQueue(spec));
  h('queue:start', () => engine.start());
  h('queue:stop', () => engine.stop());
  h('video:retry', id => engine.retry(id));
  h('video:regen', (id, idx) => engine.regenScene(id, idx));
  h('video:edit', (id, idx, text) => engine.editScene(id, idx, text));
  h('video:skip', (id, idx) => engine.skipScene(id, idx));
  h('video:rejoin', id => engine.rejoin(id));
  h('video:delete', (ids, files) => engine.remove(ids, files));
  h('video:clearDone', files => engine.remove(store.data.videos.filter(v => v.status === 'done').map(v => v.id), files));
  h('video:meta', (id, m) => { const v = store.data.videos.find(x => x.id === id); if (v) Object.assign(v, m); engine.changed(); });
  h('video:open', async id => {
    const v = store.data.videos.find(x => x.id === id); if (!v) return;
    const f = v.final || v.scenes.find(s => s.file)?.file;
    if (f && fs.existsSync(f)) shell.showItemInFolder(f);
    else {
      const dir = engine.videoDir(v);
      fs.mkdirSync(dir, { recursive: true });
      const err = await shell.openPath(dir);
      if (err) throw new Error(err);
    }
  });
  h('dir:open', async () => {
    const { dir, fallback } = ensureOutputDir(store.data.settings.outputDir, p => app.getPath(p), getLang(store));
    if (fallback) { store.data.settings.outputDir = dir; engine.changed(); }
    const err = await shell.openPath(dir);
    if (err) throw new Error(err);
  });
  // ---- Studio tự động (mục riêng) ----
  studio = new Studio(store, engine);
  h('studio:state', () => studio.view());
  h('studio:channel:save', c => studio.saveChannel(c));
  h('studio:channel:delete', id => studio.deleteChannel(id));
  h('studio:create', a => studio.create(a));
  h('studio:batch', a => studio.createBatch(a));
  h('studio:today', id => studio.continueToday(id));
  h('studio:posted', (id, v) => studio.setPosted(id, v));
  h('studio:copy', id => { clipboard.writeText(studio.postText(id)); });
  h('studio:regen', (id, idx) => studio.regenScene(id, idx));
  h('studio:retry', id => studio.retry(id));
  h('studio:delete', id => studio.remove(id));
  h('studio:open', async id => {
    const e = store.data.studio.episodes.find(x => x.id === id);
    if (e && e.dir && fs.existsSync(e.dir)) {
      const err = await shell.openPath(e.dir);
      if (err) throw new Error(err);
      return;
    }
    throw new Error(t(getLang(store), 'err.episodeNoOutputDir'));
  });
  // ---- Làm phim / Video Aff / Codex AI ----
  tools = new Tools(store, engine);
  h('film:plan', a => tools.filmPlan(a));
  h('film:queue', a => tools.filmQueue(a));
  h('aff:create', a => tools.affCreate(a));
  h('aff:copy', id => { clipboard.writeText(tools.affText(id)); });
  h('ai:state', () => tools.aiState());
  h('ai:chat', a => tools.aiChat(a));
  h('ai:clear', () => tools.aiClear());
  if (studio && !studioOn) { studioOn = true; studio.boot(); }
  createWindow();
});
app.on('window-all-closed', () => { if (store) store.flush(); app.quit(); });
app.on('before-quit', () => { if (studio) studio.stop(); api.shutdown(); if (store) store.flush(); });
