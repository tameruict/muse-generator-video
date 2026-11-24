const fs = require('fs'), path = require('path'), crypto = require('crypto');
const os = require('os');
const api = require('./muse'), ff = require('./ffmpeg'), spark = require('./spark'), cast = require('./cast'), soften = require('./soften'), media = require('./media'), { langName } = require('./lang');
const { safeSegment, probeWritableDir } = require('./paths');
const i18n = require('./i18n');
const { t, getLang } = i18n;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function retryBusy(fn, attempts = 5, delayMs = 100) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      if (!(e && (e.code === 'EBUSY' || e.code === 'EPERM')) || i === attempts - 1) throw e;
      await sleep(delayMs);
    }
  }
}
const uid = () => crypto.randomBytes(6).toString('hex');
const ORIENT = { '9:16': 'vertical portrait 1080x1920, full-screen phone video', '16:9': 'horizontal landscape 1920x1080', '1:1': 'square 1080x1080', '3:4': 'vertical portrait 3:4' };
const RATIOS = { '9:16': [720, 1280], '16:9': [1280, 720], '1:1': [1024, 1024], '3:4': [832, 1104] };
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const TEMPLATES = [
  'Opening hook: a striking close-up reveal of the product from the references, glossy light, shallow depth of field, slow push-in.',
  'A person naturally using and enjoying the product in a warm, realistic everyday setting, handheld camera, genuine reaction.',
  'Extreme macro detail shot of the product texture and packaging, slow slider move, soft studio light.',
  'Lifestyle wide shot: the product on a table among friends or family, cheerful atmosphere, cinematic framing.',
  'Close-up of the product being served or opened, steam or sparkle, mouth-watering appeal.',
  'Final shot: the product centered and clearly visible with its packaging, confident camera pull-back, clean ending.'
];
function parseScript(t) {
  return (t || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(l => l.replace(/^\s*\d+\s*[-–—]\s*\d+\s*(s|sec|giây|秒)?\s*[:：]\s*/i, '').trim()).filter(Boolean);
}
const BEATS = ['Opening beat.', 'The situation develops and the action builds.', 'A complication or an emotional turn happens.', 'The tension or emotion reaches its peak.', 'The situation resolves with a clear payoff.', 'Closing beat: calm ending, clean last shot.'];
const CONT_MIN = 0.28;   // SSIM tối thiểu giữa khung cuối cảnh trước và khung đầu cảnh sau (dưới mức này coi như nhảy bối cảnh)
const SESSION_MAX = 8;   // tối đa số clip nối trong MỘT phiên chat Muse (phiên quá dài dễ lẫn ngữ cảnh), quá thì mở phiên mới
const RESUME_AFTER = 10 * 60e3, MAX_AUTO_RESUME = 3;   // video dừng vì lỗi tạm thời: tự chạy tiếp sau 10 phút, tối đa 3 lần
const safe = s => safeSegment(s, 'Chung', 60);

class Engine {
  constructor(store, notify) {
    this.s = store; this.notify = notify || (() => {});
    this.running = false; this.active = 0; this.timer = null; this.notice = '';
    this.accState = new Map(); this.accRun = new Map(); this.remote = [];
    this.finalizing = new Set(); this.cache = new Map();
    this.checked = new Map();   // kết quả kiểm tra phiên đăng nhập từng tài khoản
    if (!this.s.data.perf) this.s.data.perf = { durs: [] };   // thời gian thật của các cảnh đã xong, để ước tính còn bao lâu
    this.use = new Map(); this.lastErr = new Map(); this.strikes = new Map();   // số cảnh đã giao / lỗi gần nhất / số lần bị phạt của từng tài khoản
  }
  get d() { return this.s.data; }
  get set() { return this.d.settings; }
  uiLang() { return getLang(this.s); }
  keepAsset(p) {
    try {
      const dir = path.join(this.s.dir, 'assets'); if (String(p).startsWith(dir)) return p;
      fs.mkdirSync(dir, { recursive: true });
      const st = fs.statSync(p), t = path.join(dir, crypto.createHash('md5').update(p + st.mtimeMs + st.size).digest('hex').slice(0, 12) + path.extname(p).toLowerCase());
      if (!fs.existsSync(t)) fs.copyFileSync(p, t);
      return t;
    } catch (_) { return p; }
  }
  // Ảnh tham chiếu bắt buộc của cảnh mà file đã mất -> báo lỗi rõ ràng thay vì render im lặng thiếu ảnh
  missingRefs(v, sc) {
    const miss = [];
    for (const r of v.refs || []) if (!fs.existsSync(r.path)) miss.push(path.basename(r.path));
    const cs = this.castOf(v, sc);
    if (cs && (sc.softened || 0) < soften.MAX_LEVEL) for (const c of cs) (c.images || []).slice(0, 2).forEach(p => { if (!fs.existsSync(p)) miss.push(`${c.name}: ${path.basename(p)}`); });
    return miss;
  }
  changed() { this.s.save(); this.notify(); }
  boot() {
    for (const v of this.d.videos) {
      for (const sc of v.scenes) if (sc.status === 'running' || sc.status === 'pending') { sc.status = 'pending'; sc.jobid = null; sc.account = null; }   // bridge Python mới khởi động: job cũ đã mất, giao lại từ đầu, không tính là lỗi
      if (v.status === 'running') v.status = 'pending';
    }
  }
  start() {
    if (this.running) return;
    this.running = true; this.notice = '';
    this.timer = setInterval(() => this.tick(), 1500); this.tick(); this.notify();
  }
  stop() { this.running = false; clearInterval(this.timer); this.timer = null; this.notify(); }
  videoDir(v) { return path.join(this.set.outputDir, safe(v.project), v.id); }

  // ---------- tài khoản ----------
  accAvail(email, now = Date.now()) {
    const st = this.accState.get(email);
    return !st || st.state === 'ok' || (st.state !== 'blocked' && st.until && st.until <= now);
  }
  mark(email, state, until) { this.accState.set(email, { state, until: until || 0, fails: 0 }); }
  take(a) { this.accRun.set(a.email, (this.accRun.get(a.email) || 0) + 1); const u = this.use.get(a.email) || { n: 0, last: 0 }; this.use.set(a.email, { n: u.n + 1, last: Date.now() }); }
  release(a) { this.accRun.set(a.email, Math.max(0, (this.accRun.get(a.email) || 1) - 1)); }
  // Cảnh nối có thể dùng tiếp PHIÊN CHAT Muse của cảnh trước (Muse nhớ các prompt/video đã tạo): phải chạy đúng tài khoản đã mở phiên đó.
  sessionOf(v, sc) {
    if (this.set.shareSession === false || !v || !v.continuity || sc.idx < 1 || sc.chainStart || sc.noSession || (sc.softened || 0) > 0) return null;
    const p = this.prevOf(v, sc);
    if (!p || p.status !== 'done' || !p.sessionId || !p.sessionAcc || (p.sessionDepth || 1) >= SESSION_MAX) return null;
    return { id: p.sessionId, email: p.sessionAcc, depth: (p.sessionDepth || 1) + 1 };
  }
  reserve(sc, v) {
    const now = Date.now();
    const free = a => a.enabled !== false && this.accAvail(a.email, now) && (this.accRun.get(a.email) || 0) < (a.maxJobs || 2);
    if (sc.jobid && sc.account) {
      const a = this.d.accounts.find(x => x.email === sc.account);
      if (a && free(a)) { this.take(a); return a; }
      if (a && a.enabled !== false && this.accAvail(a.email, now)) return null; // chờ slot của đúng tài khoản đó
      sc.jobid = null; sc.account = null;
    }
    const ses = this.sessionOf(v, sc);
    if (ses) {
      const a = this.d.accounts.find(x => x.email === ses.email);
      if (a && free(a)) { this.take(a); return a; }
      if (a && a.enabled !== false && this.accAvail(a.email, now)) return null;   // tài khoản giữ phiên đang bận: chờ để nối đúng phiên
      sc.noSession = true;                                                          // tài khoản đó hỏng/hết hạn mức: mở phiên mới (vẫn có khung cuối + chữ mô tả)
    }
    // Chia đều: ưu tiên tài khoản đang rảnh, rồi tài khoản đã dùng ÍT nhất, rồi tài khoản nghỉ lâu nhất (xoay vòng).
    // Nối liền mạch chạy từng cảnh một nên mọi tài khoản đều "rảnh": nếu chỉ xét tải thì luôn rơi vào tài khoản đầu danh sách.
    // Tài khoản vừa lỗi ở chính cảnh này bị loại khỏi lượt chọn kế tiếp (trừ khi không còn tài khoản nào khác).
    const u = e => this.use.get(e) || { n: 0, last: 0 };
    let cand = this.d.accounts.filter(free);
    const fresh = cand.filter(a => !(sc.tried || []).includes(a.email));
    if (fresh.length) cand = fresh; else sc.tried = [];
    const list = cand.sort((x, y) =>
      (this.accRun.get(x.email) || 0) / (x.maxJobs || 2) - (this.accRun.get(y.email) || 0) / (y.maxJobs || 2) ||
      u(x.email).n - u(y.email).n || u(x.email).last - u(y.email).last);
    if (!list.length) return null;
    this.take(list[0]); return list[0];
  }
  accountView() {
    const now = Date.now();
    return this.d.accounts.map(a => {
      const st = this.accState.get(a.email) || { state: 'ok' };
      const ok = this.accAvail(a.email, now);
      const remote = this.remote.find(r => String(r.email || '').toLowerCase() === a.email.toLowerCase()) || null;
      return { ...a, state: ok ? 'ok' : st.state, until: st.until || 0, running: this.accRun.get(a.email) || 0, remote, used: (this.use.get(a.email) || {}).n || 0, lastErr: this.lastErr.get(a.email) || '', checked: this.checked.get(a.email) || null };
    });
  }
  async refreshRemote() {
    const arr = await api.listAccounts();
    this.remote = Array.isArray(arr) ? arr : []; this.notify(); return this.remote.length;
  }

  // ---------- hỏi Muse bằng văn bản (viết kịch bản/ý tưởng) — thay cho Meta Model API ----------
  canAsk() { const now = Date.now(); return this.d.accounts.some(a => a.enabled !== false && this.accAvail(a.email, now)); }
  async ask(prompt, { images = [], timeout = 240 } = {}) {
    const tried = new Set(); let last = null;
    for (;;) {
      const now = Date.now();
      const acc = this.d.accounts.filter(a => a.enabled !== false && this.accAvail(a.email, now) && !tried.has(a.email))
        .sort((x, y) => (this.accRun.get(x.email) || 0) - (this.accRun.get(y.email) || 0))[0];   // ưu tiên tài khoản đang rảnh
      if (!acc) throw last || new api.ApiError(412, t(this.uiLang(), 'engine.noAvailableAccount'));
      tried.add(acc.email);
      this.accRun.set(acc.email, (this.accRun.get(acc.email) || 0) + 1);   // giữ chỗ: các lượt hỏi song song tự dàn đều, cảnh video không bị giao vào tài khoản đang chat
      try { return (await api.chat({ email: acc.email, prompt, images, timeout })).text; }
      catch (e) {
        last = e; const code = e.code || 0;
        if (code === 412) { this.mark(acc.email, 'exhausted', Date.now() + 2 * 3600e3); this.notify(); }
        else if (code === 596 || code === 404) { this.mark(acc.email, 'blocked'); this.notify(); }
        else if (code === 500 || code === 400) throw e;       // chưa cài bridge / prompt bị từ chối: đổi tài khoản cũng vô ích
        // 503/504/mạng: thử tài khoản kế tiếp
      } finally { this.release(acc); }
    }
  }

  // ---------- đa luồng thông minh ----------
  // Chia các cảnh của video thành các "nhóm" nối liền mạch: trong nhóm chạy tuần tự (lấy khung cuối), các nhóm chạy SONG SONG trên nhiều tài khoản.
  // smart: số nhóm = số tài khoản rảnh chia cho số video đang chờ (mỗi nhóm >= 2 cảnh) · strict: 1 nhóm (liền mạch tuyệt đối) · fast: mỗi cảnh một nhóm
  assignChains(v, vidsTotal, accN, mode) {
    const n = v.scenes.length; for (const s of v.scenes) { s.chainStart = false; s.endsChapter = false; }
    v.chains = 1; if (!v.continuity || n < 2) return;
    let chains = 1;
    const share = Math.floor(accN / Math.max(1, vidsTotal));
    if (mode === 'fast') chains = n;
    else if (mode === 'smart') chains = Math.max(1, Math.min(share, Math.floor(n / 2)));
    else if (mode === 'auto') {   // video ngắn: 1 chuỗi liền mạch tuyệt đối. Video dài (>= autoFrom cảnh): chia thành các "chương" đủ dài, chạy song song trên nhiều tài khoản
      const from = Math.max(4, +this.set.autoFrom || 12), minC = Math.max(2, +this.set.minChapter || 4);
      if (n >= from) chains = Math.max(1, Math.min(share, Math.floor(n / minC)));
    }
    v.chains = chains;
    // Điểm cắt chương: ưu tiên cảnh Muse/AI đánh dấu "NEW SEQUENCE:" (đổi địa điểm/thời gian có chủ đích) gần vị trí chia đều nhất; không có thì chia đều
    const marks = v.scenes.filter(s => s.seqStart && s.idx > 0).map(s => s.idx); let last = 0;
    for (let k = 1; k < chains; k++) {
      const ideal = Math.round(k * n / chains), win = Math.max(1, Math.floor(n / chains / 3));
      const near = marks.filter(i => i > last && Math.abs(i - ideal) <= win).sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))[0];
      const at = Math.min(n - 1, Math.max(last + 1, near === undefined ? ideal : near)); v.scenes[at].chainStart = true; last = at;
    }
    v.chains = 1 + v.scenes.filter(s => s.chainStart).length;
    v.scenes.forEach((s, i) => { if (s.chainStart && i > 0) v.scenes[i - 1].endsChapter = true; });   // cảnh cuối chương: sẽ được dẫn về khung ĐẦU của cảnh mở chương sau
  }
  recordPerf(ms) { if (!(ms >= 1000)) return; const p = this.d.perf; p.durs.push(Math.round(ms)); if (p.durs.length > 30) p.durs.shift(); }
  avgSceneMs() {   // trung bình 80% giữa các lần gần đây (bỏ lần quá nhanh / quá chậm)
    const d = (this.d.perf && this.d.perf.durs || []).slice().sort((a, b) => a - b); if (d.length < 2) return 0;
    const cut = Math.floor(d.length * 0.1), m = d.slice(cut, d.length - cut); return Math.round(m.reduce((a, b) => a + b, 0) / m.length);
  }
  // Kiểm tra phiên đăng nhập thật của tài khoản (không tốn hạn mức tạo video)
  async checkAccount(email) {
    try {
      await api.check(email);
      const st = this.accState.get(email); if (st && st.state === 'blocked') this.accState.delete(email);
      this.lastErr.delete(email); this.checked.set(email, { ok: true, at: Date.now() }); this.notify(); return { email, ok: true };
    } catch (e) {
      const code = e.code || 0; if (code === 596 || code === 404) this.mark(email, 'blocked');
      this.checked.set(email, { ok: false, at: Date.now(), msg: String(e.message || e).slice(0, 160) }); this.notify(); return { email, ok: false, msg: e.message };
    }
  }
  checkAll() { return Promise.all(this.d.accounts.filter(a => a.enabled !== false).map(a => this.checkAccount(a.email))); }

  // ---------- thêm vào hàng đợi ----------
  async addToQueue(spec) {
    const l = this.uiLang();
    if (!this.set || !String(this.set.outputDir || '').trim()) {
      throw new Error(t(l, 'engine.noOutputDir'));
    }
    try {
      this.set.outputDir = probeWritableDir(this.set.outputDir, l);
    } catch (e) {
      throw new Error(t(l, 'err.invalidOutputDirWithDetail', { dir: this.set.outputDir, msg: e.message || e }));
    }
    const chars = this.d.characters.filter(c => (spec.characterIds || []).includes(c.id));
    const style = this.d.styles.find(x => x.id === spec.styleId);
    const charText = chars.map(c => `${c.name}: ${c.desc}`).join(' | ');
    const snap = chars.map(c => ({ id: c.id, name: c.name, desc: c.desc, images: (c.images || []).slice(0, 2) }));   // bản chụp phòng khi nhân vật bị xoá
    // Ảnh sản phẩm được SAO CHÉP vào thư mục dữ liệu của app: trước đây chỉ lưu đường dẫn gốc, người dùng di chuyển/xoá file
    // thì cảnh sau bị render KHÔNG có ảnh tham chiếu mà không báo gì (nguyên nhân hay gặp của "ảnh không chuẩn").
    const rawImgs = spec.images || [], origs = rawImgs.filter(p => fs.existsSync(p)), imgs = origs.map(p => this.keepAsset(p));
    const jobs = spec.mode === 'image' && imgs.length ? imgs.map((p, i) => ({ products: [p], name: path.parse(origs[i]).name }))
      : [{ products: imgs, name: '' }];
    const note = [], warn = [];
    if (rawImgs.length > origs.length) note.push(t(l, 'engine.missingRefImgsNote', { count: rawImgs.length - origs.length }));
    let added = 0;
    const copies = Math.max(1, +spec.copies || 1), tasks = [];
    for (const j of jobs) for (let c = 0; c < copies; c++) tasks.push([j, c]);
    const accN = Math.max(1, this.d.accounts.filter(a => a.enabled !== false).length), pmode = spec.parallel || this.set.parallel || 'auto';
    const build = async (j, c) => {
        let texts = parseScript(spec.script);
        const durN = +spec.duration, want = spec.duration === 'auto' || !(durN > 0) ? (texts.length || 3) : Math.max(1, Math.round(durN / 10));
        if (texts.length < want) {
          let ai = null, aiErr = '';
          if (spec.useAI && this.canAsk()) {
            try {
              ai = await spark.genScenes({ ask: (p, o) => this.ask(p, o), idea: texts.join(' '), n: want, ratio: spec.ratio,
                chars: charText, style: style?.text, voice: spec.voice, imagePath: j.products[0], film: !!spec.film, uiLang: l });
            } catch (e) { aiErr = e.message; }
          }
          if (ai && ai.length) texts = ai;
          else if (spec.useAI && aiErr) {
            // KHÔNG rơi về prompt mặc định (làm lệch cảnh): bỏ video này, báo để người dùng bấm thêm lại
            note.push(t(l, 'engine.skipVideoAiErr', { err: aiErr })); return null;
          } else {
            const base = texts.slice();
            while (texts.length < want) {
              const i = texts.length;
              // KHÔNG lặp lại dòng cuối kèm "new camera angle" (Muse quay lại y hệt cảnh trước): yêu cầu cảnh TIẾP THEO của cùng câu chuyện
              texts.push(base.length ? `The NEXT moment of the same story, happening right after the previous shot (advance the action, do not repeat it; same place and people). ${BEATS[Math.min(i, BEATS.length - 1)]} Story so far: ${base.join(' ').slice(0, 320)}` : TEMPLATES[i % TEMPLATES.length]);
            }
          }
        }
        const prods = j.products.slice(0, 5);
        const refs = prods.map((p, i) => ({ path: p, kind: 'product', k: i, label: `the product / reference object${prods.length > 1 ? ` (view ${i + 1} of ${prods.length})` : ''}: keep its exact shape, colors, material, printed text/logo and packaging` }));
        let prevCast = null;
        const scenes = texts.map((txt, i) => {
          const sq = /^(\s*\[[^\]]*\]\s*)?NEW SEQUENCE\s*:\s*/i.exec(txt); if (sq) txt = (sq[1] || '') + txt.slice(sq[0].length);   // "NEW SEQUENCE:" = cắt có chủ đích sang nơi/thời điểm mới
          const r = cast.resolve(txt, chars, prevCast); prevCast = r.cast;
          if (chars.length > 1 && (r.source === 'carry' || r.source === 'all'))
            warn.push(t(l, r.source === 'all' ? 'engine.castFallbackAll' : 'engine.castFallbackCarry', { idx: i + 1 }));
          return { id: uid(), idx: i, text: r.text, cast: r.cast, castSrc: r.source, status: 'pending', attempts: 0, failovers: 0, seqStart: !!sq && i > 0 };
        });
        const v = {
          id: uid(), title: (j.name || texts[0] || 'Video').slice(0, 60) + (spec.copies > 1 ? ` #${c + 1}` : ''),
          project: (spec.project || '').trim() || t(l, 'engine.defaultProject'), createdAt: Date.now(), status: 'pending', phase: '',
          ratio: spec.ratio || '9:16', voice: spec.voice || 'none', prefix: spec.prefix || '',
          charText, chars: snap, styleText: style?.text || '', refs, continuity: (!!spec.continuity || (texts.length > 1 && pmode !== 'fast')), music: spec.music || '',
          productText: String(spec.productText || '').trim().slice(0, 900), bibleText: String(spec.bible || '').trim().slice(0, 1800), noFrame: !!spec.noFrame || !spec.continuity, cut: !!spec.cut || !spec.continuity,
          tags: [], note: '', final: null, error: '',
          scenes
        };
        return v;
    };
    // AI viết kịch bản SONG SONG giữa các tài khoản (mỗi tài khoản một lượt), giữ nguyên thứ tự video
    const results = new Array(tasks.length); let next = 0;
    const worker = async () => {
      while (next < tasks.length) {
        const i = next++;
        try { results[i] = await build(...tasks[i]); } catch (e) { note.push(t(l, 'engine.skipVideoErr', { err: e.message || e })); results[i] = null; }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(tasks.length, spec.useAI ? accN : 1)) }, worker));
    const vids = results.filter(Boolean);
    const unfinished = this.d.videos.filter(x => x.status !== 'done' && x.status !== 'error').length + vids.length;
    for (const v of vids) { this.assignChains(v, unfinished, accN, pmode); this.d.videos.push(v); added++; }
    this.changed();
    return { added, note: note.join(' · '), warn: [...new Set(warn)].slice(0, 6).join(' · ') };
  }

  // ---------- vòng lặp ----------
  tick() {
    if (!this.running) return;
    const l = this.uiLang();
    if (!this.d.accounts.some(a => a.enabled !== false)) { this.notice = t(l, 'engine.noEnabledAccount'); this.stop(); return; }
    const conc = +this.set.concurrency, now = Date.now(), max = conc > 0 ? conc : Math.max(1, this.d.accounts.filter(a => a.enabled !== false).length);   // 0 = tự động theo số tài khoản
    let waiting = false, launched = 0;
    for (const v of this.d.videos) {
      if (v.status === 'error' && this.resumable(v) && now - (v.errAt || now) > RESUME_AFTER) this.autoResume(v);
      if (v.status === 'done' || v.status === 'error' || this.finalizing.has(v.id)) continue;
      for (const sc of v.scenes) {
        if (this.active >= max) break;
        if (sc.status !== 'pending' || (sc.notBefore || 0) > now) continue;
        if (v.continuity && sc.idx > 0 && !sc.chainStart) { const p = this.prevOf(v, sc); if (p && p.status !== 'done') continue; }
        if (v.continuity && sc.endsChapter && !v.cut && !v.noFrame && !sc.endGate) {   // đợi cảnh mở chương sau quay xong (có khung đầu) để dẫn cảnh cuối chương này về đúng khung đó
          const nx = this.nextOf(v, sc);
          if (nx && nx.chainStart && !nx.seqStart && ['pending', 'running'].includes(nx.status)) continue;
        }
        if (launched >= 2) { waiting = true; continue; }   // khởi động so le (tối đa 2 cảnh mỗi nhịp) để không dội hàng loạt vào Muse cùng lúc
        const acc = this.reserve(sc, v);
        if (!acc) { waiting = true; continue; }
        launched++; this.launch(v, sc, acc);
      }
      this.checkVideo(v);
    }
    const anyOk = this.d.accounts.some(a => a.enabled !== false && this.accAvail(a.email, now));
    const n = !anyOk ? t(l, 'engine.allAccountsUnavailable') : '';
    if (n !== this.notice) { this.notice = n; this.notify(); }
    if (!waiting && this.active === 0 && !this.d.videos.some(v => v.scenes.some(s => s.status === 'pending') && v.status !== 'error') && this.finalizing.size === 0 && !this.d.videos.some(v => v.status === 'error' && this.resumable(v))) {
      this.stop();
    }
  }
  checkVideo(v) {
    if (v.status === 'done' || this.finalizing.has(v.id)) return;
    const l = this.uiLang();
    const act = v.scenes.filter(s => s.status !== 'skipped');   // cảnh bị bỏ qua không tính, video vẫn ghép từ các cảnh còn lại
    if (!act.length) { v.status = 'error'; v.error = t(l, 'engine.allScenesSkipped'); return; }
    const st = act.map(s => s.status);
    if (st.every(x => x === 'done')) { this.finalize(v); return; }
    if (st.includes('running')) { v.status = 'running'; return; }
    if (st.includes('error')) {
      const bad = v.scenes.find(s => s.status === 'error');
      if (v.status !== 'error') v.errAt = Date.now();
      v.status = 'error'; v.error = t(l, 'engine.sceneErrSummary', { idx: bad.idx + 1, total: v.scenes.length, err: bad.error }) + (bad.perm ? '' : (v.autoRetries || 0) < MAX_AUTO_RESUME ? t(l, 'engine.autoRetryHint') : '');
      return;
    }
    v.status = st.includes('done') ? 'running' : 'pending';
  }
  async launch(v, sc, acc) {
    this.active++; sc.status = 'running'; sc.error = ''; v.status = 'running'; if (!sc.jobid) sc.startedAt = Date.now(); this.changed();
    try { await this.runScene(v, sc, acc); }
    catch (e) { this.handleErr(v, sc, acc, e); }
    finally { this.active--; this.release(acc); this.checkVideo(v); this.changed(); }
  }
  async runScene(v, sc, acc) {
    const l = this.uiLang();
    if (!sc.jobid) {
      const miss = this.missingRefs(v, sc);
      if (miss.length) throw new api.ApiError(400, t(l, 'engine.missingImages', { list: miss.join(', ') }));
      await this.prepareText(v, sc);                       // bậc ≥2: nhờ Muse viết lại cảnh cho qua bộ lọc
      const refs = await this.buildRefs(v, sc, acc);
      const ses = this.sessionOf(v, sc), useSes = !!(ses && ses.email === acc.email);
      const body = { prompt: this.buildPrompt(v, sc, refs, useSes), async: true, email: acc.email };
      if (useSes) body.session_id = ses.id;
      sc.usedSession = useSes; sc.sessionDepth = useSes ? ses.depth : 1;
      refs.forEach((r, i) => { body['image_' + (i + 1)] = r.assetId; });
      const job = await api.submitVideo(body);
      sc.jobid = job.jobid; sc.account = acc.email; this.changed();
    }
    const job = await this.poll(sc);
    const assets = job.result?.assets || [];
    const asset = assets.find(a => a.type === 'video') || assets[0];
    if (!asset) throw new api.ApiError(502, t(l, 'engine.jobNoVideo'));
    const dir = this.videoDir(v);
    await fs.promises.mkdir(dir, { recursive: true });
    sc.file = path.join(dir, `scene_${sc.idx + 1}.mp4`);
    if (!(await api.moveTo(asset.assetId, sc.file))) {
      const buf = await api.download(asset.assetId);
      await fs.promises.writeFile(sc.file, buf);
      try { await fs.promises.unlink(asset.assetId); } catch (_) {}   // bản tạm của bridge (muse-out) đã có bản chính thức: dọn để khỏi đầy ổ đĩa
    }
    // Muse không đảm bảo tỉ lệ (chỉ là chữ trong prompt): kiểm tra video thật; sai thì tạo lại ĐÚNG 1 lần với yêu cầu rõ hơn, vẫn sai thì chấp nhận (khi ghép sẽ có viền đen)
    const rr = RATIOS[v.ratio];
    if (rr && !sc.ratioFix) {
      const pr = await media.probe(sc.file), want = rr[0] / rr[1];
      if (pr.ok && pr.width && pr.height && Math.abs(pr.width / pr.height - want) / want > 0.06) {
        Object.assign(sc, { ratioFix: true, jobid: null, account: null, status: 'pending', notBefore: Date.now() + 2000, file: null,
          error: t(l, 'engine.wrongRatio', { w: pr.width, h: pr.height, want: v.ratio }) });
        return;
      }
    }
    if (sc.chainStart && v.continuity && !v.cut && typeof ff.firstFrame === 'function') { try { sc.firstFrame = await ff.firstFrame(sc.file, path.join(dir, `open_${sc.idx + 1}.jpg`)); } catch (_) {} }   // khung đầu của cảnh mở chương: đích của cảnh cuối chương trước
    if (await this.continuityBreak(v, sc)) return;
    sc.sessionId = job.sessionId || null; sc.sessionAcc = job.sessionId ? acc.email : null;   // cảnh kế tiếp nối vào đúng phiên chat này
    sc.assetId = asset.assetId; sc.jobid = null; sc.status = 'done'; sc.error = ''; this.recordPerf(Date.now() - (sc.startedAt || Date.now()));
    if (v.continuity) { try { sc.lastFrame = await ff.lastFrame(sc.file, path.join(dir, `last_${sc.idx + 1}.jpg`)); } catch (_) {} }
    this.accState.delete(acc.email); this.strikes.delete(acc.email); this.lastErr.delete(acc.email);
  }
  // Kiểm tra mối nối thật: khung ĐẦU clip mới phải giống khung CUỐI clip trước. Muse hay lờ ảnh nối và nhảy sang bối cảnh khác -> tạo lại ĐÚNG 1 lần
  async continuityBreak(v, sc) {
    const l = this.uiLang();
    try {
      if (v.cut || !v.continuity || this.set.contCheck === false || typeof ff.ssim !== 'function' || !sc.file) return false;
      const dir = this.videoDir(v);
      if (sc.idx >= 1 && !sc.chainStart && !sc.seqStart && !sc.contFix) {   // 1) đầu clip phải giống cuối cảnh trước
        const prev = this.prevOf(v, sc);
        if (prev && prev.lastFrame && fs.existsSync(prev.lastFrame)) {
          const first = await ff.firstFrame(sc.file, path.join(dir, `first_${sc.idx + 1}.jpg`));
          const s = await ff.ssim(prev.lastFrame, first); sc.joinSsim = s;
          if (s !== null && s < CONT_MIN) {
            Object.assign(sc, { contFix: true, jobid: null, account: null, status: 'pending', notBefore: Date.now() + 2000, file: null,
              error: t(l, 'engine.contBreakPrev', { ssim: s.toFixed(2), min: CONT_MIN }) });
            return true;
          }
        }
      }
      const tgt = this.endTarget(v, sc);   // 2) cuối cảnh cuối chương phải về đúng khung đầu của chương sau (mối nối giữa các luồng song song)
      if (tgt) {
        const lf = await ff.lastFrame(sc.file, path.join(dir, `last_${sc.idx + 1}.jpg`));
        const s = await ff.ssim(lf, tgt); sc.endSsim = s;
        if (s !== null && s < CONT_MIN && !sc.endFix) {
          Object.assign(sc, { endFix: true, jobid: null, account: null, status: 'pending', notBefore: Date.now() + 2000, file: null,
            error: t(l, 'engine.contBreakEnd', { ssim: s.toFixed(2), min: CONT_MIN }) });
          return true;
        }
      }
      return false;
    } catch (_) { return false; }
  }
  async poll(sc) {
    const l = this.uiLang();
    const t0 = Date.now(), ms = Math.max(3, +this.set.pollSec || 8) * 1000; let netFails = 0;
    while (true) {
      if (!this.running) throw Object.assign(new Error('stopped'), { stopped: true });
      let job = null;
      try { job = await api.getJob(sc.jobid); netFails = 0; }
      catch (e) { if ((e.code && e.code !== 502 && e.code !== 503) || /job bị mất|job (?:was )?lost|任务已丢失/i.test(e.message || '') || ++netFails > 5) throw e; }
      if (job) {
        if (job.status === 'completed') return job;
        if (job.status === 'failed') throw new api.ApiError(job.error?.code || 503, job.error?.message || t(l, 'engine.jobFailed'));
      }
      if (Date.now() - t0 > 17 * 60e3) throw new api.ApiError(504, t(l, 'engine.museTimeout'));
      await sleep(ms);
    }
  }
  handleErr(v, sc, acc, e) {
    if (e.stopped) { sc.status = 'pending'; return; }
    const l = this.uiLang();
    const code = e.code || 0, msg = e.message || String(e);
    if (sc.usedSession && code !== 429) { sc.noSession = true; sc.usedSession = false; }   // nối phiên bị lỗi: lần thử sau mở phiên chat mới, không để phiên hỏng làm kẹt cả chuỗi
    this.lastErr.set(acc.email, `${new Date().toLocaleTimeString(i18n.locale(l))} [${code}] ${msg}`.slice(0, 300));
    if (code !== 429 && code !== 500) sc.tried = [...new Set([...(sc.tried || []), acc.email])];   // lần sau giao tài khoản khác
    const requeue = () => { sc.status = 'pending'; sc.jobid = null; sc.account = null; sc.failovers = (sc.failovers || 0) + 1;
      sc.error = t(l, 'engine.switchedAccount', { email: acc.email, msg }).slice(0, 200); };
    if (code === 500) { this.notice = msg; sc.status = 'pending'; this.stop(); return; }                    // chưa cài bridge Python
    if (code === 412) { this.mark(acc.email, 'exhausted', Date.now() + 2 * 3600e3); return requeue(); }   // hết hạn mức tuần
    if (code === 596 || code === 404) { this.mark(acc.email, 'blocked'); return requeue(); }              // bị chặn / chưa thêm
    if (code === 429) { sc.status = 'pending'; sc.notBefore = Date.now() + 30000; return; }               // đầy slot, chờ
    if (code === 400 || code === 403 || code === 422) {                                                  // Muse từ chối (lỗi hoặc trả lời bằng chữ)
      if (/Không thấy ảnh|Định dạng ảnh|Prompt trống|Image not found|Unsupported image format|Empty prompt|找不到图片|不支持的图片格式|提示词为空/i.test(msg)) { sc.status = 'error'; sc.error = msg; sc.perm = true; return; }
      sc.refusals = [...(sc.refusals || []), msg.slice(0, 900)].slice(-6); sc.tries = (sc.tries || 0) + 1;
      if ((sc.softened || 0) >= soften.MAX_LEVEL && !sc.offerUsed) {                                       // hết thang: thử đúng 1 lần theo ĐỀ XUẤT THAY THẾ của chính Muse
        const off = soften.extractOffer(msg);
        if (off) {
          Object.assign(sc, { offerUsed: true, alt: off + ' Cinematic, realistic, no text on screen.', altLevel: soften.MAX_LEVEL, status: 'pending', jobid: null, account: null, notBefore: Date.now() + 3000,
            error: t(l, 'engine.useMuseOffer', { off }).slice(0, 260) });
          return;
        }
      }
      if ((sc.softened || 0) >= soften.MAX_LEVEL) {                                                        // đã thử hết các bậc: dừng hẳn, để người dùng quyết định
        sc.status = 'error'; sc.perm = true;
        sc.error = t(l, 'engine.refusedAllLevels', { levels: soften.MAX_LEVEL + 1, msg }).slice(0, 400); return;
      }
      sc.softened = (sc.softened || 0) + 1; sc.alt = null; sc.status = 'pending'; sc.jobid = null; sc.account = null; sc.notBefore = Date.now() + 3000;
      sc.error = t(l, 'engine.refusedRetrying', { lvl: sc.softened, max: soften.MAX_LEVEL, msg }).slice(0, 260); return;   // KHÔNG phạt tài khoản: lỗi do nội dung, không phải do tài khoản
    }
    // lỗi tạm thời: 502/503/504/mạng
    const bridgeLost = code === 503 && /Bridge .*(đã dừng|khởi động lại|job bị mất)|Python bridge (?:exited|stopped|restarted)|job (?:was )?lost|桥接.*(?:已停止|已重启|任务已丢失)/i.test(msg);   // lỗi do cầu nối Python, không phải lỗi tài khoản: không phạt
    sc.attempts = (sc.attempts || 0) + 1; sc.tries = (sc.tries || 0) + 1; sc.jobid = null; sc.account = null;
    if (code === 504 && sc.attempts >= 2) { sc.softened = Math.min(soften.MAX_LEVEL, (sc.softened || 0) + 1); sc.alt = null; }   // treo 2 lần liền: đừng gửi lại y nguyên, đổi nội dung
    const st = this.accState.get(acc.email) || { state: 'ok', fails: 0 };
    if (!bridgeLost) st.fails = (st.fails || 0) + 1;
    if (!bridgeLost && st.fails >= 2) {                                   // tài khoản lỗi liên tục: nghỉ 5 → 20 → 60 phút (tăng dần, hết lỗi thì tính lại)
      const k = this.strikes.get(acc.email) || 0; this.strikes.set(acc.email, k + 1);
      this.mark(acc.email, 'exhausted', Date.now() + [5, 20, 60][Math.min(k, 2)] * 60e3);
    } else this.accState.set(acc.email, st);
    if (sc.attempts > (+this.set.maxRetries || 3) + Math.floor(v.scenes.length / 5) + Math.min(5, Math.max(0, this.d.accounts.filter(a => a.enabled !== false).length - 1))) { sc.status = 'error'; sc.error = msg; }   // video càng dài càng được thử lại nhiều
    else { sc.status = 'pending'; sc.notBefore = Date.now() + (bridgeLost ? 3000 : Math.min(20000 * sc.attempts, 120000)); sc.error = t(l, 'engine.retryAttempt', { attempt: sc.attempts, msg }).slice(0, 200); }
  }
  async upload(acc, file) {
    const l = this.uiLang();
    // Muse nhận ảnh nội tuyến trong chat. LUÔN chuẩn hoá ảnh về JPEG sRGB tối đa 1280px, lưu cache cho các cảnh sau:
    //  - PNG/WebP có nền trong suốt (ảnh sản phẩm cắt nền) trước đây bị gửi nguyên -> nền hiện đen/lạ, Muse đọc sai sản phẩm: giờ ghép lên nền trắng
    //  - ảnh kích thước quá lớn / dung lượng nhỏ nhưng hàng nghìn pixel trước đây không bị thu nhỏ (chỉ xét >2.5MB)
    if (!MIME[path.extname(file).toLowerCase()]) throw new api.ApiError(400, t(l, 'engine.unsupportedImage', { file: path.basename(file) }));
    let st; try { st = fs.statSync(file); } catch (_) { throw new api.ApiError(400, t(l, 'engine.imageNotFound', { file: path.basename(file) })); }
    const dir = path.join(os.tmpdir(), 'muse-refs'), out = path.join(dir, crypto.createHash('md5').update(file + st.mtimeMs + st.size + 'v2').digest('hex') + '.jpg');
    try { if (fs.statSync(out).size > 1000) return out; } catch (_) {}
    fs.mkdirSync(dir, { recursive: true });
    const sc = "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:flags=lanczos";
    const plain = ['-i', file, '-vf', sc + ',format=yuvj420p', '-frames:v', '1', '-q:v', '2', out];
    try {
      if (/\.(png|webp)$/i.test(file)) await ff.run(['-i', file, '-f', 'lavfi', '-i', 'color=c=white:s=16x16', '-filter_complex', `[1:v][0:v]scale2ref[bg][im];[bg][im]overlay=format=auto,${sc},format=yuvj420p`, '-frames:v', '1', '-q:v', '2', out]);
      else await ff.run(plain);
    } catch (_) {
      try { await ff.run(plain); } catch (e2) { return file; }   // không chuẩn hoá được thì dùng ảnh gốc
    }
    return out;
  }
  // Nhân vật có mặt trong cảnh. Đọc bản MỚI NHẤT trong Đồng bộ (sửa ảnh/mô tả có hiệu lực cho cảnh chưa render), rơi về bản chụp nếu đã bị xoá.
  castOf(v, sc) {
    if (!Array.isArray(sc.cast)) return null;   // video cũ (trước khi có phân nhân vật theo cảnh): dùng cách cũ
    const snap = v.chars || [];
    return sc.cast.map(id => this.d.characters.find(c => c.id === id) || snap.find(c => c.id === id)).filter(Boolean);
  }
  // Danh sách ảnh tham chiếu của cảnh (đồng bộ, chưa upload). Thứ tự quan trọng (Muse nhìn theo thứ tự đính kèm):
  // ảnh nhân vật CÓ MẶT trong cảnh → ảnh sản phẩm → khung cuối cảnh trước (để cuối: nếu bị cắt bớt thì bỏ khung cuối trước, không bao giờ làm mất ảnh nhân vật/sản phẩm).
  // Khung cuối cảnh trước chỉ để nối bối cảnh/chuyển động; nó đã mang sai số của lần tạo trước nên KHÔNG được ưu tiên hơn ảnh gốc.
  collectRefs(v, sc) {
    const people = [], ctx = [], prod = [];
    const cs = this.castOf(v, sc), lvl = sc.softened || 0, limit = Math.max(2, Math.min(9, +this.set.maxRefs || 4)) + (this.endTarget(v, sc) ? 1 : 0);
    // bậc ≥3: bỏ ảnh mặt nhân vật (hay là lý do bị từ chối vì "người thật"); bậc ≥2 (hoặc Muse than phiền về ảnh): bỏ khung cuối cảnh trước
    if (cs && lvl < soften.MAX_LEVEL) cs.forEach((c, ci) => { const nm = this.nameOf(c, ci, lvl); (c.images || []).slice(0, 2).forEach((p, k, arr) => { if (fs.existsSync(p)) people.push({ path: p, kind: 'character', who: c.name, k,
      label: `character "${nm}"${arr.length > 1 ? ` (view ${k + 1} of ${arr.length})` : ''}: identity reference, keep ${nm}'s face, hair, skin tone, body and outfit exactly like this` }); }); });
    const dropLast = v.noFrame || sc.seqStart || lvl >= 2 || (lvl >= 1 && soften.imageComplaint(sc.refusals));
    if (v.continuity && sc.idx > 0 && !sc.chainStart && !dropLast) {
      const prev = this.prevOf(v, sc);
      if (prev && prev.lastFrame && fs.existsSync(prev.lastFrame)) ctx.push({ path: prev.lastFrame, kind: 'lastframe',
        label: 'starting frame = the LAST FRAME of the previous shot: this shot must begin from exactly this frame (same location, same camera position and framing, same people in the same poses, same lighting) and then continue the action forward; but every character and product must still match its own reference image, not any drift in this frame' });
    }
    const endF = this.endTarget(v, sc);
    if (endF) ctx.push({ path: endF, kind: 'endframe', label: 'ENDING frame = the OPENING frame of the next shot: this shot must converge to this exact composition during its last 2 seconds (same place, same people in these poses, same framing and lighting) and finish on it' });
    for (const r of v.refs || []) if (fs.existsSync(r.path)) prod.push(r);   // video cũ: v.refs đã chứa cả ảnh nhân vật, giữ nguyên
    const list = [...ctx, ...people, ...prod];   // theo Muse: khung bắt đầu đặt ĐẦU TIÊN; khi vượt giới hạn vẫn bỏ khung này TRƯỚC (ảnh gốc ưu tiên hơn khung đã trôi)
    // vượt giới hạn ảnh (Cài đặt → số ảnh tối đa): bỏ khung cuối, rồi ảnh nhân vật thứ 2, rồi ảnh sản phẩm thừa
    const drop = pred => { const i = list.map(pred).lastIndexOf(true); if (i < 0) return false; list.splice(i, 1); return true; };
    // Khung nối cảnh là thứ giữ sự liền mạch: bỏ góc ảnh phụ (nhân vật/sản phẩm thứ 2) TRƯỚC, khung cuối chỉ bỏ khi vẫn còn vượt giới hạn
    // (trước đây bỏ khung cuối đầu tiên nên video có 2 nhân vật + sản phẩm hầu như không bao giờ được nối cảnh).
    while (list.length > limit) {
      if (drop(r => r.kind === 'character' && r.k > 0)) continue;
      if (drop(r => r.kind === 'product' && r.k > 0)) continue;
      if (drop(r => r.kind === 'lastframe')) continue;
      if (drop(r => r.kind === 'endframe')) continue;
      list.pop();
    }
    return list;
  }
  nextOf(v, sc) { for (let i = sc.idx + 1; i < v.scenes.length; i++) if (v.scenes[i].status !== 'skipped') return v.scenes[i]; return null; }
  // Khung ĐÍCH của cảnh cuối chương: khung đầu của cảnh mở chương kế tiếp (quay song song từ trước). Không dùng khi sau đó là cắt có chủ đích hoặc video kiểu "cú máy rời" (aff).
  endTarget(v, sc) {
    if (!v.continuity || v.cut || v.noFrame || !sc.endsChapter || (sc.softened || 0) >= 2) return null;
    const nx = this.nextOf(v, sc);
    return nx && nx.chainStart && !nx.seqStart && nx.firstFrame && fs.existsSync(nx.firstFrame) ? nx.firstFrame : null;
  }
  prevOf(v, sc) { for (let i = sc.idx - 1; i >= 0; i--) if (v.scenes[i].status !== 'skipped') return v.scenes[i]; return null; }
  // tên nhân vật đưa vào prompt: từ bậc 2 dùng bí danh, tránh tên người thật (vd. tên tướng lịch sử) làm bộ lọc từ chối
  nameOf(c, i, lvl) { return lvl >= 2 ? `Character ${i + 1}` : c.name; }
  // bậc ≥2: nhờ Muse viết lại cảnh (bỏ tên người thật, bạo lực chỉ còn gợi ý); không được thì thay từ cơ học
  async prepareText(v, sc) {
    const lvl = sc.softened || 0;
    if (lvl < 2 || (sc.alt && sc.altLevel === lvl)) return;
    let alt = '';
    if (this.canAsk()) { try { alt = await soften.rewrite({ ask: (p, o) => this.ask(p, o), text: sc.text, refusal: (sc.refusals || []).slice(-1)[0] || '', level: lvl, uiLang: this.uiLang() }); } catch (_) {} }
    alt = alt || soften.localSoften(sc.text);
    // Muse đôi khi vẫn giữ nguyên tên nhân vật trong bản viết lại: thay bằng bí danh để không bị từ chối vì tên người thật
    (this.castOf(v, sc) || []).forEach((c, i) => { if (c && c.name) alt = alt.replace(new RegExp(c.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'gi'), this.nameOf(c, i, lvl)); });
    sc.alt = alt; sc.altLevel = lvl; this.changed();
  }
  async buildRefs(v, sc, acc) {
    const out = [];
    const list = this.collectRefs(v, sc);
    for (let i = 0; i < list.length; i++) {
      const r = list[i]; let id = await this.upload(acc, r.path);
      // thư viện Muse gửi kèm TÊN FILE: đặt tên có nghĩa để Muse biết ảnh nào là nhân vật nào / sản phẩm / khung bắt đầu
      try {
        const slug = cast.fold(r.who || r.kind).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || r.kind;
        const dir = path.join(os.tmpdir(), 'muse-refs', 'named'); fs.mkdirSync(dir, { recursive: true });
        const named = path.join(dir, `${crypto.createHash('md5').update(id + fs.statSync(id).mtimeMs).digest('hex').slice(0, 6)}_ref${i + 1}_${r.kind}_${slug}.jpg`);
        if (!fs.existsSync(named)) fs.copyFileSync(id, named); id = named;
      } catch (_) {}
      out.push({ ...r, assetId: id });
    }
    return out;
  }
  buildPrompt(v, sc, refs, followUp) {
    const ln = langName(v.voice);
    const voice = ln ? `Any spoken lines are in natural ${ln}.` : 'No spoken dialogue, only natural ambient sound and soft music.';
    const lvl = sc.softened || 0;
    // bậc 1: thay từ nhạy cảm; bậc ≥2: dùng bản Muse viết lại (sc.alt)
    const body = lvl >= 2 && sc.alt ? sc.alt : lvl >= 1 ? soften.localSoften(sc.text) : sc.text;
    let head = `${lvl >= 1 ? soften.localSoften(v.prefix || '') : (v.prefix || '')} ${body}`.trim();
    head = 'SCENE (follow exactly, include every action and detail below, add nothing else): ' + head;
    const parts = []; let refPart = '';
    const cs = this.castOf(v, sc), hasPeopleRefs = refs.some(r => r.kind === 'character'), hasProd = refs.some(r => r.kind === 'product');
    if (refs.length) {
      let rule;
      if (cs) {
        const bits = [];
        if (hasPeopleRefs) bits.push("Each character must look identical to their own character reference image (same face, hairstyle, skin tone, body and the exact same outfit in every shot; never change clothes, hair color or age)");
        if (hasProd) bits.push('the product must stay identical to its reference image in shape, color, material and printed text/logo; never redesign it or invent a different version');
        rule = bits.length ? bits.join('; ') + '.' : '';
      } else rule = "Keep every character's face, hair and outfit and every product identical to the references.";
      refPart = 'Reference images (attached in this order): ' + refs.map((r, i) => `image #${i + 1} = ${r.label}`).join('; ') + '. ' + rule +
        (refs.length > 1 ? ' These images are separate references, NOT a storyboard or a sequence: never morph, cross-fade or transition between them.' : '');
    }
    if (cs) {
      if (cs.length) parts.push(`Characters in this shot (ONLY ${cs.length === 1 ? 'this one character' : 'these ' + cs.length + ' characters'}; do not add or show anyone else): ` + cs.map((c, i) => `${this.nameOf(c, i, lvl)}: ${lvl >= 1 ? soften.localSoften(c.desc) : c.desc}`).join(' | '));
      else if ((v.chars || []).length) parts.push('No recurring named character appears in this shot; do not add any of the reference characters.');
    } else if (v.charText) parts.push('Characters: ' + v.charText);
    if (v.productText) parts.push('Product (ground truth, must match exactly whenever it is visible): ' + v.productText);
    if (v.bibleText) parts.push('Story world (keep identical in every shot): ' + (lvl >= 1 ? soften.localSoften(v.bibleText) : v.bibleText));
    if (v.styleText) parts.push('Visual style: ' + v.styleText);
    // Muse không thấy các clip khác: nói rõ cảnh trước đã quay gì và cảnh này bắt đầu NGAY SAU đó (trước đây chỉ có 1 ảnh khung cuối, không có chữ nối)
    const prev = v.continuity && sc.idx > 0 && !sc.chainStart ? this.prevOf(v, sc) : null;
    const cutHere = v.cut || sc.seqStart;
    if (v.continuity && sc.idx > 0 && sc.chainStart) {   // đầu "chương" chạy song song: cảnh trước CHƯA quay xong nhưng kịch bản đã biết -> đưa chữ để cùng thế giới/nhân vật/ánh sáng
      const pp = this.prevOf(v, sc), pt = pp ? String(pp.text || '').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
      parts.push('SEQUENCE OPENING: this shot opens a new part of the same video and will be edited right after the shot "' + pt + '". Keep exactly the same story world, characters, outfits, time of day, lighting and color grade as the rest of the video; frame it as a clear opening shot of this part, with no reference to any earlier frame.');
    } else if (prev && prev.status === 'done' && sc.seqStart) {
      const pt = String(prev.text || '').replace(/\s+/g, ' ').trim().slice(0, 260);
      parts.push('NEW SEQUENCE: a deliberate cut to a new place or time after the previous shot' + (pt ? ' ("' + pt + '")' : '') + '. Keep the same characters, outfits and overall look, but do NOT continue the previous framing or location; establish the new place clearly.');
    } else if (prev && prev.status === 'done' && v.cut) {   // video aff: cú máy mới của CÙNG video, không phải đoạn tiếp diễn hành động
      const pt = String(prev.text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      parts.push('CONSISTENCY: this is another shot of the SAME video' + (pt ? '; previous shot: "' + pt + '"' : '') + '. Keep exactly the same presenter or person (face, hair, outfit), the same location, lighting, color grade and the identical product as in the previous shot; only the camera angle, action and product focus change as this scene describes. Do not introduce a different person or place.');
    } else if (prev && prev.status === 'done') {
      const pt = String(prev.text || '').replace(/\s+/g, ' ').trim().slice(0, 380);
      parts.push('CONTINUITY: this shot starts at the exact instant the previous shot ended' + (pt ? '. Previous shot (already filmed): "' + pt + '"' : '') +
        '. Keep the same location, time of day, lighting, weather, outfits, props, character positions and screen direction as at the end of that shot, and move the story FORWARD from there. ' +
        'Do not restart or repeat the previous shot\'s action, no new establishing shot, no jump to another place unless this scene explicitly says so.' +
        (refs.some(r => r.kind === 'lastframe') ? '' : ' No starting frame image is provided for this shot: do not ask for one, rely on this text description only.'));
    }
    if (refs.some(r => r.kind === 'endframe')) parts.push('ENDING: during the last 2 seconds this shot must converge onto the attached ending frame and finish exactly on that composition, because the next shot begins from it.' + (sc.endFix ? ' STRICT: the previous attempt ended somewhere else; finish on the ending frame.' : ''));
    if (sc.contFix) parts.push('STRICT: the previous attempt did not start from the starting frame. The very first frame of this video MUST be the attached starting frame (same place, same people, same poses, same camera); do not cut to another location.');
    if (lvl) parts.push(soften.clause(lvl));
    const vr = soften.variation(sc.tries || 0); if (vr) parts.push(vr);   // mỗi lần thử lại prompt khác lần trước
    // Muse không có tham số tỉ lệ, chỉ hiểu qua chữ: nói rõ hướng khung hình + độ phân giải; lần tạo lại vì sai tỉ lệ thì nhấn mạnh hơn
    const ori = ORIENT[v.ratio] || '';
    parts.push(`In exactly ${v.ratio} aspect ratio${ori ? ', ' + ori : ''}, about 10 seconds.` + (sc.ratioFix && ori ? ` STRICT: the output frame MUST be ${ori}; do not output any other orientation.` : '') + ` ${voice}`);
    // Giới hạn độ dài: nếu quá dài thì cắt phần MÔ TẢ CẢNH, không cắt phần ảnh/nhân vật/phong cách/tỉ lệ ở cuối
    // Bản đồ ảnh tham chiếu đặt ĐẦU prompt: Muse đọc từ trên xuống, đặt cuối thì thường bị bỏ qua và ảnh không còn ràng buộc nhân vật/sản phẩm.
    const rest = parts.join('\n'), room = 4900 - rest.length - refPart.length - 120;
    if (head.length > room) head = head.slice(0, Math.max(200, room - 1)) + '…';
    const lead = followUp
      ? (cutHere ? `Continue the same video: create the NEXT shot (shot ${sc.idx + 1} of ${v.scenes.length}), a realistic 10-second ${ori || v.ratio} video with the same person, place, lighting and product as the previous video in this chat.`
        : `Continue the same video: create the NEXT shot (shot ${sc.idx + 1} of ${v.scenes.length}), a realistic 10-second ${ori || v.ratio} video that starts exactly where the previous video in this chat ended.`)
      : `Create a realistic 10-second ${ori || v.ratio} video.`;
    return ((refPart ? refPart + '\n' : '') + lead + '\n' + head + '\n' + rest).slice(0, 4900);   // bản đồ ảnh vẫn ĐẦU TIÊN (theo Muse), ngay sau là lệnh "Create a ... video"
  }
  async finalize(v) {
    const l = this.uiLang();
    this.finalizing.add(v.id); v.status = 'running'; v.phase = t(l, 'engine.phaseJoining'); this.changed();
    try {
      const dir = this.videoDir(v), out = path.join(dir, 'final.mp4'), files = v.scenes.filter(s => s.status === 'done').map(s => s.file);
      await fs.promises.mkdir(dir, { recursive: true });
      if (files.length === 1) await retryBusy(() => fs.promises.copyFile(files[0], out));
      else {
        const st = this.set || {}, fade = st.joinFade === undefined ? 0.5 : +st.joinFade, match = st.joinMatch !== false;
        const dn = v.scenes.filter(s => s.status === 'done'), cuts = dn.slice(1).map((s, i) => !!(s.chainStart || s.seqStart) && !(dn[i].endSsim >= CONT_MIN));   // chỗ nối giữa 2 "chương"/đổi địa điểm: chuyển mờ dài hơn
        v.joinMode = await ff.concat(files, out, RATIOS[v.ratio] || RATIOS['9:16'], { fade, match, cuts });   // 'smooth' = chuyển mờ + cân màu/âm lượng; 'hard' = cắt thẳng (tắt hoặc ffmpeg lỗi)
      }
      if (v.music && fs.existsSync(v.music)) {
        const o2 = path.join(dir, 'final_music.mp4'); await ff.addMusic(out, v.music, o2);
        try {
          await retryBusy(() => fs.promises.rename(o2, out));
        } catch (e) {
          if (e && e.code === 'EXDEV') {
            await retryBusy(() => fs.promises.copyFile(o2, out));
            await fs.promises.unlink(o2).catch(() => {});
          } else throw e;
        }
      }
      v.final = out; v.status = 'done'; v.finishedAt = Date.now(); v.error = '';
    } catch (e) { v.status = 'error'; v.error = t(l, 'engine.joinFailed', { msg: e.message }); }
    finally { v.phase = ''; this.finalizing.delete(v.id); this.changed(); }
  }
  // Ghép lại video đã xong với cài đặt hiện tại (chuyển mờ / đồng bộ màu) mà không render lại Muse
  async rejoin(id) {
    const l = this.uiLang();
    const v = this.d.videos.find(x => x.id === id); if (!v) throw new Error(t(l, 'engine.videoNotFound'));
    if (this.finalizing.has(v.id)) throw new Error(t(l, 'engine.videoJoining'));
    const sc = v.scenes.filter(s => s.status === 'done' && s.file);
    if (sc.length < 2 || sc.some(s => !fs.existsSync(s.file))) throw new Error(t(l, 'engine.missingClipFiles'));
    const before = v.final, bak = before && fs.existsSync(before) ? before + '.bak' : '';
    if (bak) await retryBusy(() => fs.promises.copyFile(before, bak));   // sao lưu bản cũ phòng khi ghép lại lỗi
    await this.finalize(v);
    if (v.status !== 'done') {
      const e = v.error; v.status = 'done'; v.final = before; v.error = '';
      if (bak) { try { await retryBusy(() => fs.promises.copyFile(bak, before)); } catch (_) {} }
      this.changed();
      if (bak) await fs.promises.unlink(bak).catch(() => {});
      throw new Error(e || t(l, 'engine.rejoinFailed'));
    }
    if (bak) await fs.promises.unlink(bak).catch(() => {});
  }
  resumable(v) { return (v.autoRetries || 0) < MAX_AUTO_RESUME && v.scenes.some(s => s.status === 'error') && !v.scenes.some(s => s.status === 'error' && s.perm); }
  autoResume(v) {
    for (const s of v.scenes) if (s.status === 'error') { s.status = 'pending'; s.attempts = 0; s.error = ''; s.notBefore = 0; }
    v.status = 'pending'; v.error = ''; v.errAt = 0; v.autoRetries = (v.autoRetries || 0) + 1; this.changed();
  }
  retry(id) {
    for (const v of this.d.videos) {
      if (id && v.id !== id) continue;
      if (v.status !== 'error') continue;
      for (const s of v.scenes) if (s.status === 'error') { s.status = 'pending'; s.attempts = 0; s.softened = (s.refusals || []).length ? 1 : 0; s.alt = null; s.perm = false; s.error = ''; s.notBefore = 0; }   // bậc 0 đã biết bị từ chối -> bắt đầu từ bậc 1
      v.status = 'pending'; v.error = ''; v.autoRetries = 0;
    }
    this.changed(); this.start();
  }
  // Tạo lại RIÊNG một cảnh (kể cả cảnh đã xong): reset cảnh đó, video quay về hàng đợi, xong thì tự ghép lại final.mp4.
  regenScene(id, idx) {
    const l = this.uiLang();
    const v = this.d.videos.find(x => x.id === id); if (!v) throw new Error(t(l, 'engine.videoNotFound'));
    const sc = v.scenes[idx]; if (!sc) throw new Error(t(l, 'engine.sceneNotFound'));
    if (sc.status === 'running' || this.finalizing.has(v.id)) throw new Error(t(l, 'engine.sceneBusyRegen'));
    Object.assign(sc, { status: 'pending', jobid: null, account: null, file: null, attempts: 0, softened: (sc.refusals || []).length ? 1 : 0, alt: null, failovers: 0, perm: false, error: '', notBefore: 0, tried: [] });
    v.final = ''; v.status = 'pending'; v.error = ''; v.errAt = 0; v.autoRetries = 0; v.phase = '';
    this.changed(); this.start();
  }
  // Sửa nội dung một cảnh rồi tạo lại ngay (cảnh bị Muse từ chối mãi -> tự đổi lời tả cho dễ qua).
  editScene(id, idx, text) {
    const l = this.uiLang();
    const v = this.d.videos.find(x => x.id === id); if (!v) throw new Error(t(l, 'engine.videoNotFound'));
    const sc = v.scenes[idx]; if (!sc) throw new Error(t(l, 'engine.sceneNotFound'));
    const t0 = String(text || '').trim(); if (!t0) throw new Error(t(l, 'engine.sceneEmpty'));
    if (sc.status === 'running' || this.finalizing.has(v.id)) throw new Error(t(l, 'engine.sceneBusyEdit'));
    Object.assign(sc, { text: t0, refusals: [], tries: 0, alt: null, altLevel: 0 });
    this.regenScene(id, idx);
  }
  // Bỏ qua một cảnh (Muse không chịu tạo): video vẫn ghép từ các cảnh còn lại.
  skipScene(id, idx) {
    const l = this.uiLang();
    const v = this.d.videos.find(x => x.id === id); if (!v) throw new Error(t(l, 'engine.videoNotFound'));
    const sc = v.scenes[idx]; if (!sc) throw new Error(t(l, 'engine.sceneNotFound'));
    if (sc.status === 'running' || this.finalizing.has(v.id)) throw new Error(t(l, 'engine.sceneBusySkip'));
    if (!v.scenes.some((s, i) => i !== idx && s.status !== 'skipped')) throw new Error(t(l, 'engine.cannotSkipOnlyScene'));
    Object.assign(sc, { status: 'skipped', jobid: null, account: null, perm: false, error: t(l, 'engine.sceneSkipped'), notBefore: 0 });
    v.final = ''; v.status = 'pending'; v.error = ''; v.errAt = 0; v.autoRetries = 0; v.phase = '';
    this.changed(); this.start();
  }
  async remove(ids, delFiles) {
    for (const id of ids) {
      const v = this.d.videos.find(x => x.id === id); if (!v) continue;
      if (this.finalizing.has(v.id) || v.scenes.some(s => s.status === 'running')) continue;
      if (delFiles) {
        try { await retryBusy(() => fs.promises.rm(this.videoDir(v), { recursive: true, force: true })); } catch (_) {}
      }
      this.d.videos = this.d.videos.filter(x => x.id !== id);
    }
    this.changed();
  }
}
module.exports = { Engine, parseScript, RATIOS };
