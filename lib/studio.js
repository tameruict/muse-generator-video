// Studio tự động: 1 yêu cầu -> kịch bản -> render (qua Engine sẵn có) -> giọng đọc/phụ đề -> kiểm tra -> thư mục tập.
// Không sửa Engine: chỉ gọi addToQueue/start/retry và đọc store.data.videos. Tiến trình lưu trong store.data.studio nên tiếp tục được sau khi tắt app.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const plan = require('./studio-plan'), media = require('./media'), tts = require('./tts');
const { safeSegment } = require('./paths');
const { t, getLang } = require('./i18n');
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
const safe = s => {
  const slug = safeSegment(s, '', 40, true);
  if (slug) return slug;
  return 'ch-' + crypto.createHash('md5').update(String(s || '')).digest('hex').slice(0, 6);
};
const RATIO = { '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1, '3:4': 3 / 4 };
const FINAL = new Set(['done', 'review', 'error']);

class Studio {
  constructor(store, engine, opts = {}) {
    this.s = store; this.engine = engine; this.ask = (p, o) => engine.ask(p, o); this.busy = new Set(); this.timer = null; this.resumeOnce = false;
    if (!store.data.studio) store.data.studio = { channels: [], episodes: [] };
  }
  get d() { return this.s.data.studio; }
  get set() { return this.s.data.settings; }
  uiLang() { return getLang(this.s); }
  changed() { this.engine.changed(); }

  // ---------- kênh ----------
  saveChannel(c) {
    const l = this.uiLang();
    const name = String(c.name || '').trim(); if (!name) throw new Error(t(l, 'studio.enterChannelName'));
    const o = { id: c.id || uid(), name, ratio: c.ratio || '9:16', duration: Math.min(60, Math.max(10, +c.duration || 30)), style: String(c.style || '').trim(),
      lang: ['vi', 'en', 'zh'].includes(c.lang) ? c.lang : 'vi', voiceMode: ['muse', 'tts', 'none'].includes(c.voiceMode) ? c.voiceMode : 'muse', ttsVoice: String(c.ttsVoice || '').trim(),
      voiceMap: String(c.voiceMap || ''), subtitles: c.subtitles !== false, music: c.music || '', avoid: String(c.avoid || '').trim(),
      continuity: c.continuity !== false, dailyTarget: Math.min(50, Math.max(1, Math.round(+c.dailyTarget || 10))), ideaSeeds: String(c.ideaSeeds || '').trim(), characterIds: Array.isArray(c.characterIds) ? c.characterIds : [] };
    const i = this.d.channels.findIndex(x => x.id === o.id); if (i >= 0) this.d.channels[i] = o; else this.d.channels.push(o);
    this.changed(); return o;
  }
  deleteChannel(id) {
    const l = this.uiLang();
    if (this.d.episodes.some(e => e.channelId === id && !FINAL.has(e.status))) throw new Error(t(l, 'studio.channelBusy'));
    this.d.channels = this.d.channels.filter(c => c.id !== id); this.changed();
  }

  // ---------- nhật ký ----------
  log(ep, step, msg, level = 'info') { ep.log.push({ t: Date.now(), step, level, msg: String(msg) }); this.changed(); }
  warn(ep, msg) { msg = String(msg); if (!ep.warnings.includes(msg)) ep.warnings.push(msg); this.log(ep, ep.status, msg, 'warn'); }

  // ---------- tạo tập ----------
  create({ channelId, request }) {
    const l = this.uiLang();
    const ch = this.d.channels.find(c => c.id === channelId); if (!ch) throw new Error(t(l, 'studio.selectChannel'));
    request = String(request || '').trim(); if (!request) throw new Error(t(l, 'studio.enterEpisodeRequest'));
    if (this.d.episodes.some(e => e.channelId === ch.id && e.request === request && !FINAL.has(e.status))) throw new Error(t(l, 'studio.duplicateEpisode'));
    const ep = { id: uid(), channelId: ch.id, channelName: ch.name, request, status: 'planning', createdAt: Date.now(), seq: this.d.episodes.filter(e => e.channelId === ch.id).length + 1,
      plan: null, videoId: null, dir: '', warnings: [], qc: null, report: '', error: '', log: [] };
    this.d.episodes.push(ep); this.log(ep, 'planning', t(l, 'studio.logReceivedRequest', { request })); this.kick(ep); return ep.id;
  }
  kick(ep) {
    if (this.busy.has(ep.id)) return; this.busy.add(ep.id);
    (async () => {
      try {
        if (ep.status === 'planning') { await this.doPlan(ep); await this.doQueue(ep); }
        else if (ep.status === 'queued') await this.doQueue(ep);
        else if (ep.status === 'finishing') await this.doFinish(ep);
      } catch (e) { this.fail(ep, e); }
      finally { this.busy.delete(ep.id); this.changed(); }
    })();
  }
  fail(ep, e) { ep.status = 'error'; ep.error = String(e.message || e); this.log(ep, 'error', ep.error, 'error'); }

  // ---------- bước 1-4: kế hoạch ----------
  chars(ch) { return this.s.data.characters.filter(c => ch.characterIds.includes(c.id)); }
  async doPlan(ep) {
    const l = this.uiLang();
    const ch = this.d.channels.find(c => c.id === ep.channelId); if (!ch) throw new Error(t(l, 'studio.channelDeleted'));
    const chars = this.chars(ch), n = plan.sceneCount(ch.duration);
    const prev = this.d.episodes.filter(e => e.channelId === ch.id && e.plan && e.id !== ep.id).slice(-5).map(e => ({ title: e.plan.title, summary: e.plan.summary }));
    this.log(ep, 'planning', t(l, 'studio.logPlanStart', { name: ch.name, n, sec: plan.SEC, chars: chars.length, prev: prev.length }));
    let r;
    if (this.engine.canAsk()) {
      try { r = await plan.planWithLLM({ ask: this.ask, request: ep.request, channel: ch, chars, prev, n, uiLang: l }); this.log(ep, 'planning', t(l, 'studio.logPlanMuse')); }
      catch (e) { r = plan.fallbackPlan(ep.request, ch, n, l); r.warnings.unshift(t(l, 'studio.warnPlanFallback', { err: e.message })); }
    } else r = plan.fallbackPlan(ep.request, ch, n, l);
    ep.plan = r.plan; r.warnings.forEach(w => this.warn(ep, w));
    ep.lock = chars.map(c => ({ name: c.name, method: c.images?.length ? t(l, 'studio.lockImgAndDesc', { count: Math.min(2, c.images.length) }) : t(l, 'studio.lockDescOnly') }));
    for (let idx = 0; idx < chars.length; idx++) if (!chars[idx].images?.length) this.warn(ep, t(l, 'studio.warnCharNoImg', { name: chars[idx].name, method: ep.lock[idx].method }));
    if (ch.voiceMode === 'muse' && ep.plan.scenes.some(s => s.dialogue.length)) this.warn(ep, t(l, 'studio.warnMuseVoiceUnverified'));
    ep.status = 'queued';
  }

  // ---------- bước 5: đưa vào hàng đợi render ----------
  async doQueue(ep) {
    const l = this.uiLang();
    const ch = this.d.channels.find(c => c.id === ep.channelId); if (!ch) throw new Error(t(l, 'studio.channelDeleted'));
    const lines = ep.plan.scenes.map(s => plan.sceneLine(s, { voiceMode: ch.voiceMode, lang: ch.lang, chars: this.chars(ch) }));
    const prefix = [ch.style && `Visual style: ${ch.style}.`, `Avoid: ${plan.AVOID}${ch.avoid ? ', ' + ch.avoid : ''}.`].filter(Boolean).join(' ');
    const before = new Set(this.s.data.videos.map(v => v.id));
    const r = await this.engine.addToQueue({ mode: 'script', script: lines.join('\n'), ratio: ch.ratio, duration: String(lines.length * plan.SEC), prefix,
      voice: ch.voiceMode === 'muse' ? ch.lang : 'none', characterIds: ch.characterIds, images: [], copies: 1, continuity: ch.continuity, music: ch.music && fs.existsSync(ch.music) ? ch.music : '',
      project: 'Studio · ' + ch.name, useAI: false });
    const v = this.s.data.videos.find(x => !before.has(x.id));
    if (!r.added || !v) throw new Error(t(l, 'studio.queueCreateFailed'));
    ep.videoId = v.id; ep.status = 'rendering'; this.log(ep, 'rendering', t(l, 'studio.logQueuedScenes', { count: v.scenes.length }));
    this.engine.start();
  }

  // ---------- theo dõi ----------
  boot() {
    for (const ep of this.d.episodes) if (['planning', 'queued', 'finishing'].includes(ep.status)) this.kick(ep);
    this.resumeOnce = this.d.episodes.some(e => e.status === 'rendering');
    this.timer = setInterval(() => this.tick(), 2500); this.tick();
  }
  stop() { clearInterval(this.timer); this.timer = null; }
  tick() {
    const l = this.uiLang();
    for (const ep of this.d.episodes) {
      if (ep.status !== 'rendering' || this.busy.has(ep.id)) continue;
      const v = this.s.data.videos.find(x => x.id === ep.videoId);
      if (!v) { this.fail(ep, new Error(t(l, 'studio.videoDeleted'))); continue; }
      if (v.status === 'done') { ep.status = 'finishing'; this.kick(ep); }
      else if (v.status === 'error') {
        if (this.engine.resumable(v)) continue;   // engine còn tự thử lại (tối đa 3 lần sau ~10 phút): đừng đánh dấu tập lỗi sớm
        const bad = v.scenes.filter(s => s.status === 'error').map(s => t(l, 'studio.sceneErrItem', { idx: s.idx + 1, err: s.error })).join('; ');
        this.fail(ep, new Error(t(l, 'studio.renderFailed', { detail: bad || v.error }))); // không giả lập thành công
      } else if (this.resumeOnce && !this.engine.running && v.scenes.some(s => s.status === 'pending')) { this.resumeOnce = false; this.engine.start(); } // chỉ tự chạy lại sau khi mở app; nút Dừng của bạn được tôn trọng
    }
  }
  retry(id) {
    const ep = this.d.episodes.find(e => e.id === id); if (!ep || ep.status !== 'error') return;
    ep.error = ''; this.log(ep, 'retry', t(this.uiLang(), 'studio.logRetry'));
    const v = this.s.data.videos.find(x => x.id === ep.videoId);
    if (!ep.plan) ep.status = 'planning';
    else if (!v) ep.status = 'queued';
    else if (v.status === 'done') ep.status = 'finishing';
    else { ep.status = 'rendering'; this.engine.retry(v.id); }
    this.kick(ep); this.changed();
  }
  // Tạo lại riêng một cảnh của tập: dùng engine.regenScene, tập quay về 'rendering' rồi tự kiểm tra + xuất lại khi video ghép xong.
  regenScene(id, idx) {
    const l = this.uiLang();
    const ep = this.d.episodes.find(e => e.id === id); if (!ep || !ep.videoId) throw new Error(t(l, 'studio.epNoVideo'));
    if (this.busy.has(id) || ['planning', 'queued', 'finishing'].includes(ep.status)) throw new Error(t(l, 'studio.epBusyRegen'));
    this.engine.regenScene(ep.videoId, idx);
    ep.status = 'rendering'; ep.error = ''; ep.qc = null; ep.report = '';
    this.log(ep, 'regen', t(l, 'studio.logRegenScene', { idx: idx + 1 })); this.changed();
  }
  remove(id) {
    const ep = this.d.episodes.find(e => e.id === id); if (!ep || this.busy.has(id)) return;
    this.d.episodes = this.d.episodes.filter(e => e.id !== id); this.changed();
  }

  // ---------- bước 6-8: âm thanh, kiểm tra, xuất ----------
  async doFinish(ep) {
    const l = this.uiLang();
    const ch = this.d.channels.find(c => c.id === ep.channelId) || { name: ep.channelName, ratio: '9:16', duration: 30, voiceMode: 'none', subtitles: false, lang: 'vi' };
    const v = this.s.data.videos.find(x => x.id === ep.videoId); if (!v || !v.final || !fs.existsSync(v.final)) throw new Error(t(l, 'studio.missingFinalFile'));
    const dir = ep.dir || path.join(this.set.outputDir, 'Studio', safe(ch.name), `${String(ep.seq).padStart(2, '0')}-${safe(ep.plan.title)}`);
    await fs.promises.mkdir(dir, { recursive: true }); ep.dir = dir;
    const out = path.join(dir, 'final.mp4'); await fs.promises.copyFile(v.final, out);
    this.log(ep, 'finishing', t(l, 'studio.logFinishing'));

    // thời lượng từng cảnh -> mốc thời gian
    const infos = []; let t0 = 0; const starts = [];
    for (const sc of v.scenes) { const p = sc.file && fs.existsSync(sc.file) ? await media.probe(sc.file) : { ok: false, duration: 0 }; infos.push(p); starts.push(t0); t0 += p.duration; }

    // giọng đọc TTS
    const cues = []; let ttsOverflow = [];
    if (ch.voiceMode === 'tts') {
      const clips = [];
      try {
        for (const s of ep.plan.scenes) {
          let at = starts[s.idx] + 0.3;
          for (let k = 0; k < s.dialogue.length; k++) {
            const d = s.dialogue[k], f = path.join(dir, `tts_${s.idx + 1}_${k + 1}.mp3`);
            await tts.synth(d.line, tts.voiceFor(d.speaker, ch), f, l);
            const len = (await media.probe(f)).duration || 2;
            clips.push({ file: f, start: at }); cues.push({ start: at, end: at + len, text: d.line }); at += len + 0.25;
          }
          if (s.dialogue.length && at - 0.25 > starts[s.idx] + (infos[s.idx].duration || plan.SEC)) ttsOverflow.push(s.idx + 1);
        }
        if (clips.length) {
          const fin = await media.probe(out), tmp = path.join(dir, 'mix.tmp.mp4');
          await media.mixClips(out, clips, tmp, { hasAudio: fin.hasAudio, duration: fin.duration, lang: l });
          await retryBusy(() => fs.promises.rename(tmp, out));
          this.log(ep, 'finishing', t(l, 'studio.logTtsMixed', { count: clips.length }));
        }
      } catch (e) { cues.length = 0; ttsOverflow = []; this.warn(ep, t(l, 'studio.warnTtsFailed', { err: e.message })); ep.ttsFailed = true; }
      for (const c of clips) fs.rmSync(c.file, { force: true });
    } else if (ch.voiceMode === 'muse') {
      // lời thoại do Muse đọc: phụ đề chỉ ước lượng theo độ dài chữ trong từng cảnh
      for (const s of ep.plan.scenes) {
        const total = s.dialogue.reduce((a, d) => a + d.line.length, 0) || 1, dur = Math.max(1, (infos[s.idx].duration || plan.SEC) - 0.6); let at = starts[s.idx] + 0.3;
        for (const d of s.dialogue) { const len = dur * d.line.length / total; cues.push({ start: at, end: at + len, text: d.line }); at += len; }
      }
    }
    if (ttsOverflow.length) this.warn(ep, t(l, 'studio.warnTtsOverflow', { scenes: ttsOverflow.join(', ') }));
    if (ch.subtitles && cues.length) fs.writeFileSync(path.join(dir, 'subtitles.srt'), plan.buildSrt(cues), 'utf8');
    else if (ch.subtitles) this.warn(ep, t(l, 'studio.warnSubNoDialogue'));

    // thumbnail
    const fin = await media.probe(out);
    try { await media.thumbnail(out, path.join(dir, 'thumbnail.png'), Math.min(1, fin.duration / 3)); } catch (e) { this.warn(ep, t(l, 'studio.warnThumbFailed', { err: e.message })); }

    // kiểm tra chất lượng — chỉ ghi những gì thật sự đã kiểm
    const checks = [], chk = (name, ok, detail, required = true) => checks.push({ name, ok: !!ok, detail: detail || '', required });
    const missing = v.scenes.filter((s, i) => !infos[i].ok);
    chk(t(l, 'studio.qcValidScenes'), !missing.length, missing.length ? t(l, 'studio.qcErrorScenes', { list: missing.map(s => s.idx + 1).join(', ') }) : t(l, 'studio.qcPlayableCount', { ok: v.scenes.length, total: v.scenes.length }));
    chk(t(l, 'studio.qcFinalPlayable'), fin.ok, fin.ok ? `${fin.width}×${fin.height}, ${fin.duration.toFixed(1)}s` : t(l, 'studio.qcUnreadable'));
    const want = RATIO[ch.ratio] || 9 / 16, got = fin.height ? fin.width / fin.height : 0;
    chk(t(l, 'studio.qcAspectRatio'), Math.abs(got - want) / want < 0.04, t(l, 'studio.qcAspectDetail', { want: ch.ratio, w: fin.width, h: fin.height }));
    const sum = infos.reduce((a, p) => a + p.duration, 0);
    chk(t(l, 'studio.qcDurationMatch'), Math.abs(fin.duration - sum) <= 1.5, t(l, 'studio.qcDurationDetail', { final: fin.duration.toFixed(1), sum: sum.toFixed(1) }));
    chk(t(l, 'studio.qcDurationTarget'), fin.duration >= 0.7 * v.scenes.length * plan.SEC, t(l, 'studio.qcDurationTargetDetail', { final: fin.duration.toFixed(1), target: v.scenes.length * plan.SEC }), false);
    if (ch.voiceMode !== 'none') chk(t(l, 'studio.qcHasAudio'), fin.hasAudio, fin.hasAudio ? t(l, 'studio.qcAudioYes') : t(l, 'studio.qcAudioNo'));
    if (ch.voiceMode === 'tts') chk(t(l, 'studio.qcTtsMixed'), !ep.ttsFailed, ep.ttsFailed ? t(l, 'studio.qcTtsFailDetail') : t(l, 'studio.qcTtsOkDetail'));
    const nDia = ep.plan.scenes.reduce((a, s) => a + s.dialogue.length, 0);
    if (ch.subtitles && nDia) chk(t(l, 'studio.qcSubMatch'), cues.length === nDia, t(l, 'studio.qcSubCount', { cues: cues.length, total: nDia }));
    chk(t(l, 'studio.qcRetries'), !v.scenes.some(s => s.failovers || s.attempts), v.scenes.filter(s => s.failovers || s.attempts).map(s => t(l, 'studio.qcSceneItem', { idx: s.idx + 1 })).join(', ') || t(l, 'studio.qcNone'), false);
    const notChecked = [t(l, 'studio.notCheckedIdentity'), t(l, 'studio.notCheckedDialogue')].filter((_, i) => i === 0 || ch.voiceMode === 'muse');
    const ok = checks.filter(c => c.required).every(c => c.ok);
    ep.qc = { checks, notChecked, passed: ok };

    // hồ sơ xuất
    const w = (f, o) => fs.writeFileSync(path.join(dir, f), typeof o === 'string' ? o : JSON.stringify(o, null, 2), 'utf8');
    const prompts = v.scenes.map(sc => { const refs = this.engine.collectRefs(v, sc), cs = this.engine.castOf(v, sc);
      return { scene: sc.idx + 1, cast: cs ? cs.map(c => c.name) : t(l, 'studio.legacyAllChars'), castSource: sc.castSrc || null,
        refImages: refs.map((r, i) => `image_${i + 1}: ${r.kind === 'character' ? t(l, 'studio.refChar', { who: r.who }) : r.kind === 'lastframe' ? t(l, 'studio.refLastFrame') : t(l, 'studio.refProduct')} (${path.basename(r.path)})`),
        prompt: this.engine.buildPrompt(v, sc, refs), account: sc.account || null }; });
    const review = [...new Set([...missing.map(s => s.idx + 1), ...v.scenes.filter(s => s.failovers || s.attempts).map(s => s.idx + 1), ...ttsOverflow])].sort();
    w('script.md', `# ${ep.plan.title}\n\n${ep.plan.summary}\n\n**${t(l, 'studio.mdHookLabel')}** ${ep.plan.hook || t(l, 'studio.mdNone')}\n\n` + ep.plan.scenes.map(s =>
      `${t(l, 'studio.mdSceneHeader', { idx: s.idx + 1, sec: s.seconds })}\n- ${t(l, 'studio.mdVisual')}: ${s.visual}\n- ${t(l, 'studio.mdCamera')}: ${s.camera || '-'}\n- ${t(l, 'studio.mdSetting')}: ${s.setting || '-'}\n- ${t(l, 'studio.mdContinues')}: ${s.continues || '-'}\n` +
      (s.dialogue.length ? s.dialogue.map(d => `- **${d.speaker}**${d.emotion ? ` (${d.emotion})` : ''}: ${d.line}`).join('\n') : `- ${t(l, 'studio.mdNoDialogue')}`) + '\n').join('\n'));
    w('storyboard.json', { title: ep.plan.title, scenes: ep.plan.scenes.map(s => ({ ...s, file: v.scenes[s.idx]?.file || null, seconds: +(infos[s.idx].duration || 0).toFixed(2) })) });
    w('prompts.json', prompts);
    w('metadata.json', { title: ep.plan.title, description: ep.plan.description, hashtags: ep.plan.hashtags, channel: ch.name, request: ep.request, ratio: ch.ratio, durationSeconds: +fin.duration.toFixed(2),
      voiceMode: ch.voiceMode, subtitles: !!ch.subtitles, characterLock: ep.lock || [], sceneCast: v.scenes.map(sc => ({ scene: sc.idx + 1, cast: (this.engine.castOf(v, sc) || []).map(c => c.name), source: sc.castSrc || null })), warnings: ep.warnings, scenesToReview: review, qcPassed: ok, notChecked, createdAt: new Date(ep.createdAt).toISOString(), published: false });
    w('render_log.json', { episode: ep.id, log: ep.log, scenes: v.scenes.map(s => ({ scene: s.idx + 1, status: s.status, account: s.account || null, attempts: s.attempts || 0, failovers: s.failovers || 0, error: String(s.error || '') })), qc: ep.qc });

    ep.status = ok ? 'done' : 'review';
    ep.report = `${ok ? t(l, 'studio.statusDone') : t(l, 'studio.statusReview')} · ${dir}` + (review.length ? ` · ${t(l, 'studio.reportReviewScenes', { list: review.join(', ') })}` : '');
    this.log(ep, ep.status, ep.report);
  }

  // ---------- sản xuất hàng loạt theo ngày ----------
  todayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  todayEps(chId) { const t0 = this.todayStart(); return this.d.episodes.filter(e => e.channelId === chId && e.createdAt >= t0); }
  progress(ch) {
    const eps = this.todayEps(ch.id), live = eps.filter(e => e.status !== 'error');
    return { target: ch.dailyTarget || 10, made: live.length, finished: eps.filter(e => e.status === 'done' || e.status === 'review').length, posted: eps.filter(e => e.posted).length,
      failed: eps.filter(e => e.status === 'error').length, missing: Math.max(0, (ch.dailyTarget || 10) - live.length) };
  }
  // requests: danh sách yêu cầu do bạn gõ (mỗi dòng 1 tập). Không có -> AI nghĩ ý tưởng (qua chat Muse) hoặc lấy từ "Hướng nội dung" nếu nhiều dòng.
  async createBatch({ channelId, count, requests }) {
    const l = this.uiLang();
    const ch = this.d.channels.find(c => c.id === channelId); if (!ch) throw new Error(t(l, 'studio.selectChannel'));
    let list = String(requests || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!list.length) {
      count = Math.min(30, Math.max(1, Math.round(+count || 1)));
      const past = this.d.episodes.filter(e => e.channelId === ch.id).slice(-30).map(e => e.plan?.title || e.request);
      if (this.engine.canAsk()) {
        try { list = await plan.genIdeas({ ask: this.ask, channel: ch, chars: this.chars(ch), past, count, uiLang: l }); }
        catch (e) { throw new Error(t(l, 'studio.ideasFailed', { err: e.message })); }
      } else {
        const seeds = String(ch.ideaSeeds || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (!seeds.length) throw new Error(t(l, 'studio.needAccountOrSeeds'));
        const used = new Set(this.d.episodes.filter(e => e.channelId === ch.id).map(e => e.request));
        list = seeds.filter(s => !used.has(s)).slice(0, count);
        if (!list.length) throw new Error(t(l, 'studio.seedsExhausted'));
      }
    }
    let created = 0, skipped = 0;
    for (const request of list) { try { this.create({ channelId, request }); created++; } catch (_) { skipped++; } }
    return { created, skipped };
  }
  // 1 nút: thử lại tập lỗi hôm nay + tạo thêm cho đủ mục tiêu ngày
  async continueToday(channelId) {
    const ch = this.d.channels.find(c => c.id === channelId); if (!ch) throw new Error(t(this.uiLang(), 'studio.selectChannel'));
    let retried = 0;
    for (const e of this.todayEps(ch.id)) if (e.status === 'error') { this.retry(e.id); retried++; }
    const need = this.progress(ch).missing;
    const r = need > 0 ? await this.createBatch({ channelId, count: need }) : { created: 0, skipped: 0 };
    this.engine.start();
    return { retried, created: r.created, skipped: r.skipped, target: ch.dailyTarget };
  }
  setPosted(id, posted) { const ep = this.d.episodes.find(e => e.id === id); if (!ep) return; ep.posted = !!posted; ep.postedAt = posted ? Date.now() : 0; this.changed(); }
  postText(id) {
    const ep = this.d.episodes.find(e => e.id === id); if (!ep || !ep.plan) throw new Error(t(this.uiLang(), 'studio.epNoContent'));
    return [ep.plan.title, ep.plan.description || ep.plan.summary, (ep.plan.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
  }

  // ---------- dữ liệu cho giao diện ----------
  view() {
    return { channels: this.d.channels.map(c => ({ ...c, progress: this.progress(c) })), episodes: this.d.episodes.slice().reverse().map(e => {
      const v = this.s.data.videos.find(x => x.id === e.videoId);
      return { id: e.id, channelId: e.channelId, channelName: e.channelName, request: e.request, status: e.status, createdAt: e.createdAt, title: e.plan?.title || '', summary: e.plan?.summary || '',
        dir: e.dir, video: e.dir && fs.existsSync(path.join(e.dir, 'final.mp4')) ? path.join(e.dir, 'final.mp4') : '', posted: !!e.posted, error: e.error, warnings: e.warnings, qc: e.qc, report: e.report, lock: e.lock || [], log: e.log.slice(-40),
        scenes: v ? v.scenes.map(s => ({ idx: s.idx, status: s.status, account: s.account || '', error: s.error || '' })) : [] };
    }) };
  }
}
module.exports = { Studio };
