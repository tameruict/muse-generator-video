// Client Muse trực tiếp (không qua useapi.net): điều khiển bridge Python dùng thư viện MuseAI-API.
// Giữ gần giống giao diện cũ của useapi.js để engine thay đổi ít nhất.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), readline = require('readline');
const { t } = require('./i18n');

class ApiError extends Error {
  constructor(code, msg, body) { super(msg); this.code = code; this.body = body; }
}

let proc = null, rl = null, seq = 0, cfg = null;
const waiting = new Map();

const pythonPath = require('./bridge-dir').pythonExe;
// cfg: { dataDir } — nơi lưu phiên đăng nhập & video tạm. Test có thể đặt MUSE_BRIDGE_CMD (mảng JSON) để dùng bridge giả.
function configure(c) { cfg = c; }
function failAll(err) { for (const w of waiting.values()) w.reject(err); waiting.clear(); }

function ensure() {
  if (proc) return;
  const lang = cfg && cfg.lang;
  if (!cfg) throw new ApiError(500, t(lang, 'muse.notConfigured'));
  const bridgeDir = require('./bridge-dir')();
  let cmd, args;
  if (process.env.MUSE_BRIDGE_CMD) { [cmd, ...args] = JSON.parse(process.env.MUSE_BRIDGE_CMD); }
  else {
    cmd = pythonPath(bridgeDir);
    if (!fs.existsSync(cmd)) throw new ApiError(500, t(lang, 'muse.bridgeMissing', { cmd }));
    args = [path.join(bridgeDir, 'muse_bridge.py')];
  }
  args.push('--state-root', path.join(cfg.dataDir, 'muse-state'), '--out-root', path.join(cfg.dataDir, 'muse-out'));
  proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } });
  let errBuf = '';
  proc.stderr.on('data', d => { errBuf = (errBuf + d).slice(-2000); });
  rl = readline.createInterface({ input: proc.stdout });
  rl.on('line', line => {
    let m; try { m = JSON.parse(line); } catch (_) { return; }
    const w = waiting.get(m.id); if (!w) return; waiting.delete(m.id);
    if (m.ok) w.resolve(m.data); else w.reject(new ApiError(m.error?.code || 503, m.error?.message || t(cfg && cfg.lang, 'muse.error'), m.error));
  });
  proc.on('error', e => { proc = null; failAll(new ApiError(500, t(cfg && cfg.lang, 'muse.pythonSpawnFail', { msg: e.message }))); });
  proc.on('exit', code => { proc = null; failAll(new ApiError(503, t(cfg && cfg.lang, 'muse.bridgeExited', { code, detail: errBuf.trim() }).trim())); });
}

function call(op, params = {}) {
  return new Promise((resolve, reject) => {
    try { ensure(); } catch (e) { return reject(e); }
    const id = ++seq; waiting.set(id, { resolve, reject });
    proc.stdin.write(JSON.stringify({ id, op, ...params }) + '\n');
  });
}
function shutdown() { if (proc) { try { proc.kill(); } catch (_) {} proc = null; } }

module.exports = {
  ApiError, configure, shutdown,
  ping: () => call('ping'),
  loginStart: (email, region) => call('login_start', { email, region }),
  loginConfirm: (email, otp) => call('login_confirm', { email, otp }),
  importCookies: (email, cookies) => call('import_cookies', { email, cookies }),
  check: email => call('check', { email }),
  // hỏi Muse bằng văn bản (viết kịch bản/ý tưởng) — thay cho Meta Model API. Trả { text, session_id }.
  chat: ({ email, prompt, images, timeout }) => call('chat', { email, prompt, images: images || [], timeout: timeout || 240 }),
  listAccounts: async () => (await call('accounts')).accounts,
  removeAccount: email => call('remove', { email }),
  // ảnh được gửi nội tuyến trong chat nên không cần upload: "assetId" chính là đường dẫn file
  submitVideo: body => {
    const images = Object.keys(body).filter(k => /^image_\d+$/.test(k)).sort((a, b) => a.slice(6) - b.slice(6)).map(k => body[k]);
    return call('submit', { email: body.email, prompt: body.prompt, images, timeout: 900, session_id: body.session_id || null });
  },
  getJob: async jobid => {
    const j = await call('job', { jobid });
    if (j.status === 'completed') return { jobid, status: 'completed', sessionId: j.session_id || null, result: { assets: [{ assetId: j.file, type: 'video' }] } };
    if (j.status === 'failed') return { jobid, status: 'failed', error: j.error };
    return { jobid, status: j.status };
  },
  download: async file => fs.readFileSync(file),
  moveTo: async (assetId, destPath) => {
    if (typeof assetId !== 'string' || !fs.existsSync(assetId)) return false;
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    if (path.resolve(assetId) === path.resolve(destPath)) return true;
    await fs.promises.copyFile(assetId, destPath);
    try { await fs.promises.unlink(assetId); } catch (_) {}
    try {
      const jobDir = path.dirname(assetId);
      if (path.basename(path.dirname(jobDir)).toLowerCase() === 'muse-out') {
        await fs.promises.rm(jobDir, { recursive: true, force: true });
      }
    } catch (_) {}
    return true;
  }
};
