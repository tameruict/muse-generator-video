// Trang chủ, ước tính, mẫu kịch bản, nháp tự lưu, giao diện sáng/tối, phím tắt. Dùng lại $, $$, esc, call, toast, fileUrl, S, mode, images từ app.js.
(() => {
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };

  // ---------- giao diện sáng / tối ----------
  const applyTheme = t => document.documentElement.setAttribute('data-theme', t);
  applyTheme(LS.get('ms.theme') || 'light');
  $('#btnTheme').onclick = () => { const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; applyTheme(t); LS.set('ms.theme', t); };

  // ---------- chuyển mục ----------
  const go = v => { const b = $(`#nav button[data-view="${v}"]`); if (b) b.click(); };
  document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && /^[1-9]$/.test(e.key)) { const b = $$('#nav button')[+e.key - 1]; if (b) { e.preventDefault(); b.click(); } }
    if (e.ctrlKey && e.key === 'Enter' && e.target && e.target.id === 'script') { e.preventDefault(); $('#btnAdd').click(); }
    if (e.ctrlKey && e.key === 'Enter' && e.target && e.target.id === 'qkIdea') { e.preventDefault(); $('#qkGo').click(); }
  });
  $$('.toc a').forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  // ---------- mẫu kịch bản ----------
  const TPL_KEYS = [
    ['home.tpl.productName', 'home.tpl.productBody'],
    ['home.tpl.characterName', 'home.tpl.characterBody'],
    ['home.tpl.vlogName', 'home.tpl.vlogBody']
  ];
  function buildTplChips() {
    const wrap = $('#tplChips');
    wrap.querySelectorAll('[data-tpl]').forEach(b => b.remove());
    wrap.insertAdjacentHTML('beforeend', TPL_KEYS.map(([nk], idx) => `<button type="button" data-tpl="${idx}">${esc(I18N.t(nk))}</button>`).join(''));
    wrap.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => {
      const t = $('#script'), body = I18N.t(TPL_KEYS[+b.dataset.tpl][1]);
      t.value = (t.value.trim() ? t.value.replace(/\s+$/, '') + '\n' : '') + body;
      t.dispatchEvent(new Event('input')); t.focus();
    });
  }
  buildTplChips();

  // ---------- nháp tự lưu ----------
  const DRAFT = ['script', 'prefix', 'project', 'ratio', 'duration', 'voice', 'copies', 'parallel', 'qkDur', 'qkRatio', 'qkVoice', 'qkCopies'];
  try { const d = JSON.parse(LS.get('ms.draft') || '{}'); for (const k of DRAFT) if (d[k] != null && $('#' + k)) $('#' + k).value = d[k]; } catch (_) {}
  const saveDraft = () => LS.set('ms.draft', JSON.stringify(Object.fromEntries(DRAFT.map(k => [k, $('#' + k).value]))));
  DRAFT.forEach(k => { $('#' + k).addEventListener('input', saveDraft); $('#' + k).addEventListener('change', saveDraft); });

  // ---------- ước tính & ETA ----------
  const readyAcc = () => (S ? S.accounts.filter(a => a.enabled !== false && a.state === 'ok').length : 0);
  const enabledAcc = () => (S ? S.accounts.filter(a => a.enabled !== false).length : 0);
  const fmtDur = ms => {
    if (ms < 60000) return I18N.t('common.under1Min');
    const m = Math.round(ms / 60000);
    if (m < 60) return I18N.t('common.mins', { m });
    const h = Math.floor(m / 60), rem = m % 60;
    return rem ? I18N.t('common.hoursMins', { h, m: rem }) : I18N.t('common.hours', { h });
  };
  // giống Engine.assignChains: số nhóm cảnh chạy song song của một video
  const chainsFor = (n, vids, acc, mode, cont) => !cont || n < 2 ? n : mode === 'fast' ? n : mode === 'smart' ? Math.max(1, Math.min(Math.floor(acc / Math.max(1, vids)), Math.floor(n / 2))) : mode === 'auto' && n >= Math.max(4, +S.settings.autoFrom || 12) ? Math.max(1, Math.min(Math.floor(acc / Math.max(1, vids)), Math.floor(n / Math.max(2, +S.settings.minChapter || 4)))) : 1;
  function plan(perVideo, nVideos, cont, mode) {
    const unfinished = S.videos.filter(v => v.status !== 'done' && v.status !== 'error').length + nVideos, acc = readyAcc();
    const per = chainsFor(perVideo, unfinished, enabledAcc(), mode, cont), cap = S.settings.concurrency > 0 ? Math.min(+S.settings.concurrency, acc) : acc;
    const par = Math.max(0, Math.min(cap, per * nVideos)), clips = perVideo * nVideos;
    return { clips, par, per, acc, eta: S.avgSceneMs && par ? Math.ceil(clips / par) * S.avgSceneMs : 0 };
  }
  function planText(p, nVideos, mode, cont, extra) {
    if (!p.acc) return { t: I18N.t('home.est.noAcc'), warn: true };
    let t = I18N.t('home.est.summary', {
      nVideos,
      clips: p.clips,
      sec: p.clips * 10,
      extra: extra || '',
      acc: p.acc,
      par: p.par,
      chains: p.per > 1 && cont ? I18N.t('home.est.chains', { per: p.per }) : '',
      eta: p.eta ? I18N.t('home.est.eta', { dur: fmtDur(p.eta) }) : ''
    });
    if (cont && mode === 'strict' && p.acc > nVideos) t += I18N.t('home.est.tipAuto');
    return { t, warn: false };
  }
  const show = (box, r) => { box.textContent = r.t; box.style.background = r.warn ? 'var(--warnsoft)' : ''; box.style.color = r.warn ? 'var(--warn)' : ''; };
  function estimate() {
    if (!S) return;
    if (!$('#v-home').classList.contains('on') && !$('#v-script').classList.contains('on')) return;
    const box = $('#estBox'), lines = $('#script').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length, dur = selDur('duration') || '30', copies = Math.max(1, +$('#copies').value || 1);
    const want = dur === 'auto' ? (lines || 3) : Math.max(1, Math.round(+dur / 10)), perVideo = Math.max(lines, want), nVideos = (mode === 'image' ? Math.max(images.length, 0) : 1) * copies;
    if (mode === 'image' && !images.length) { box.textContent = I18N.t('home.est.needImg'); }
    else if (mode === 'script' && !lines) { box.textContent = I18N.t('home.est.needScript'); }
    else {
      const pm = $('#parallel').value || S.settings.parallel || 'auto', cont = $('#continuity').checked;
      show(box, planText(plan(perVideo, nVideos, cont, pm), nVideos, pm, cont, lines < want && $('#useAI').checked ? I18N.t('home.est.extraPerVideo', { n: want - lines }) : ''));
    }
    // khung Tạo nhanh
    const q = $('#qkIdea').value.trim(), ql = q.split(/\r?\n/).filter(l => l.trim()).length, qw = Math.max(1, Math.round(+$('#qkDur').value / 10)), qc = Math.max(1, +$('#qkCopies').value || 1), qb = $('#qkEst');
    if (!q) { qb.textContent = I18N.t('home.quick.estIdle'); qb.style.background = qb.style.color = ''; }
    else show(qb, planText(plan(Math.max(ql, qw), qc, true, S.settings.parallel || 'auto'), qc, S.settings.parallel || 'auto', true, ql < qw ? I18N.t('home.est.extraQuick', { n: qw - ql }) : ''));
  }
  // còn bao lâu: số cảnh còn lại × thời gian thật trung bình ÷ số cảnh có thể chạy song song
  function etaMs() {
    const avg = S && S.avgSceneMs; if (!avg) return 0;
    let remaining = 0, structural = 0;
    for (const v of S.videos) {
      if (v.status === 'done' || v.status === 'error') continue;
      const open = s => s.status === 'pending' || s.status === 'running', rem = v.scenes.filter(open).length; if (!rem) continue;
      remaining += rem;
      if (!v.continuity) structural += rem; else { const groups = new Set(); let g = 0; v.scenes.forEach((s, i) => { if (i > 0 && s.chainStart) g++; if (open(s)) groups.add(g); }); structural += groups.size; }
    }
    if (!remaining) return 0;
    const acc = readyAcc(), cap = S.settings.concurrency > 0 ? Math.min(+S.settings.concurrency, acc) : acc;
    return remaining * avg / Math.max(1, Math.min(cap, structural));
  }
  window.etaText = () => { const ms = etaMs(); return ms ? I18N.t('home.est.etaSuffix', { dur: fmtDur(ms) }) : ''; };
  setInterval(estimate, 700);
  ['continuity', 'useAI', 'parallel'].forEach(k => $('#' + k).addEventListener('change', estimate));

  // ---------- Tạo nhanh (một bước) ----------
  let qkImgs = [], lastQk = '';
  $('#qkPick').onclick = async () => { const f = await call('pick:images'); qkImgs = [...new Set([...qkImgs, ...f])].slice(0, 5); $('#qkImgN').textContent = qkImgs.length ? I18N.t('home.quick.imgCountMore', { n: qkImgs.length }) : I18N.t('home.quick.noImg'); };
  $('#qkGo').onclick = async () => {
    const idea = $('#qkIdea').value.trim(); if (!idea) return toast(I18N.t('home.quick.needIdea'), true);
    if (!S.accounts.length) { go('accounts'); return toast(I18N.t('toast.noAccount'), true); }
    const b = $('#qkGo'); b.disabled = true; b.textContent = I18N.t('home.quick.planning');
    try {
      const r = await call('queue:add', { mode: 'script', script: idea, images: qkImgs, ratio: $('#qkRatio').value, duration: $('#qkDur').value, prefix: $('#prefix')?.value || I18N.t('script.defaultPrefix'), voice: $('#qkVoice').value,
        styleId: '', project: I18N.t('home.quick.projectDefault'), copies: Math.max(1, +$('#qkCopies').value || 1), continuity: true, useAI: true, music: '', characterIds: $$('#qkChars input:checked').map(i => i.value) });
      if (r.added) { await call('queue:start'); $('#qkIdea').value = ''; toast(I18N.t('home.quick.createdToast', { n: r.added })); if (r.warn) toast(I18N.t('toast.charWarn', { warn: r.warn })); }
      else toast(r.note || I18N.t('home.quick.addFail'), true);
      if (r.note && r.added) toast(r.note, true);
    } finally { b.disabled = false; b.textContent = I18N.t('home.quick.go'); }
  };
  $('#qkIdea').addEventListener('input', estimate);
  ['qkDur', 'qkCopies'].forEach(k => $('#' + k).addEventListener('input', estimate));

  // ---------- điều khiển trên trang chủ ----------
  $('#homeStart').onclick = () => call('queue:start'); $('#homeStop').onclick = () => call('queue:stop');
  $('#homeCheck').onclick = async () => { const b = $('#homeCheck'); b.disabled = true; try { const rs = await call('acct:checkAll'), ok = rs.filter(x => x.ok).length; toast(I18N.t('accounts.toastCheckAll', { ok, total: rs.length, extra: '' }), ok < rs.length); } finally { b.disabled = false; } };
  $('#homeQueue').addEventListener('click', e => { const r = e.target.closest('[data-vid]'); if (!r) return; cur = r.dataset.vid; go('script'); renderQueue(); renderPreview(); });
  try { const a = LS.get('ms.autoStart'); if (a != null) $('#autoStart').checked = a === '1'; } catch (_) {}
  $('#autoStart').addEventListener('change', () => LS.set('ms.autoStart', $('#autoStart').checked ? '1' : '0'));

  // ---------- thử lại tất cả lỗi ----------
  $('#bRetryAll').onclick = async () => { const n = S.videos.filter(v => v.status === 'error').length; if (!n) return toast(I18N.t('home.retryAllNone')); await call('video:retry', ''); toast(I18N.t('home.retryAllDone', { n })); };

  // ---------- trang chủ ----------
  let sig = { stats: '', steps: '', recent: '', lanes: '', queue: '', qk: '' };
  const STEPS = () => {
    const a = S.accounts, ok = readyAcc(), v = S.videos;
    return [
      [I18N.t('home.steps.s1Title'), I18N.t('home.steps.s1Desc'), a.length > 0, 'accounts'],
      [I18N.t('home.steps.s2Title'), I18N.t('home.steps.s2Desc'), ok > 0, 'accounts'],
      [I18N.t('home.steps.s3Title'), I18N.t('home.steps.s3Desc'), S.characters.length > 0, 'sync'],
      [I18N.t('home.steps.s4Title'), I18N.t('home.steps.s4Desc'), v.length > 0, 'home'],
      [I18N.t('home.steps.s5Title'), I18N.t('home.steps.s5Desc'), v.some(x => x.status === 'done'), 'library']
    ];
  };
  function render() {
    if (!S) return;
    const vs = S.videos, c = k => vs.filter(v => v.status === k).length;
    // huy hiệu thanh bên
    const q = c('pending') + c('running'), bad = S.accounts.filter(a => a.enabled !== false && a.state !== 'ok').length;
    $('#nb-script').textContent = q || ''; $('#nb-accounts').textContent = bad || '';
    $('#bRetryAll').disabled = !c('error');
    if (!$('#v-home').classList.contains('on')) return;
    const ready = readyAcc();
    const par = S.settings.concurrency > 0 ? Math.min(+S.settings.concurrency, ready) : ready;
    // thống kê
    const st = [
      ['', `${ready}/${S.accounts.length}`, I18N.t('home.stats.ready')],
      ['run', c('running'), I18N.t('home.stats.running')],
      ['', c('pending'), I18N.t('home.stats.pending')],
      ['ok', c('done'), I18N.t('home.stats.done')],
      [c('error') ? 'err' : '', c('error'), I18N.t('home.stats.error')],
      ['', par, I18N.t('home.stats.maxPar')]
    ];
    const s1 = JSON.stringify(st);
    if (s1 !== sig.stats) { sig.stats = s1; $('#homeStats').innerHTML = st.map(([k, n, l]) => `<div class="card stat ${k}"><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join(''); }
    // các bước
    const steps = STEPS(), s2 = JSON.stringify(steps.map(x => x[2]));
    if (s2 !== sig.steps) {
      sig.steps = s2; const firstOpen = steps.findIndex(x => !x[2]);
      $('#homeSteps').innerHTML = steps.map(([t, d, done, view], i) => `<div class="step ${done ? 'done' : ''}" data-go="${view}" style="cursor:pointer"><span class="dot">${done ? '✓' : i + 1}</span><div><div class="st">${esc(t)}${i === firstOpen ? ` <span class="chip running">${esc(I18N.t('home.steps.next'))}</span>` : ''}</div><small>${esc(d)}</small></div></div>`).join('');
    }
    // video gần đây
    const recent = vs.filter(v => v.status === 'done' && v.final).slice(-4).reverse(), s3 = JSON.stringify(recent.map(v => [v.id, v.final, v.title]));
    if (s3 !== sig.recent) {
      sig.recent = s3; $('#homeRecentHint').textContent = recent.length ? '' : I18N.t('home.recent.empty');
      $('#homeRecent').innerHTML = recent.map(v => `<div class="vc"><video data-vid="${v.id}" src="${fileUrl(v.final)}#t=0.5" preload="none" controls></video><div><div class="t" title="${esc(v.title)}">${esc(v.title)}</div><small>${esc(v.project)}</small></div></div>`).join('');
    }
    // luồng tài khoản
    const work = {}; for (const v of vs) for (const sc of v.scenes) if (sc.status === 'running' && sc.account) work[sc.account] = I18N.t('home.lanes.sceneWork', { i: sc.idx + 1, n: v.scenes.length, title: v.title });
    const lanes = S.accounts.map(a => { const [lb, cl] = accLabel(a); return [a.email, lb, cl, work[a.email] || (a.running ? I18N.t('home.lanes.preparing') : a.enabled === false ? '' : I18N.t('home.lanes.idle')), a.used || 0]; });
    const s4 = JSON.stringify(lanes);
    if (s4 !== sig.lanes) {
      sig.lanes = s4;
      $('#homeLanes').innerHTML = lanes.map(([em, lb, cl, wk, used]) => `<div class="lane ${cl}"><span class="ld"></span><div class="grow"><b>${esc(em)}</b><small>${esc(lb)}${wk ? ' · ' + esc(wk) : ''}</small></div><small>${esc(I18N.t('home.lanes.usedScenes', { n: used }))}</small></div>`).join('') || `<div class="hint">${esc(I18N.t('home.lanes.empty'))}</div>`;
    }
    $('#homeStart').disabled = S.running; $('#homeStop').disabled = !S.running;
    const eta = etaMs(); $('#homeEta').textContent = S.running ? (eta ? I18N.t('home.eta.runningEta', { dur: fmtDur(eta) }) : I18N.t('home.eta.running')) : I18N.t('home.eta.stopped');
    // đang xử lý
    const live = vs.filter(v => v.status !== 'done').slice(0, 6), s5 = JSON.stringify(live.map(v => [v.id, v.title, v.status, v.scenes.map(x => x.status)]));
    if (s5 !== sig.queue) {
      sig.queue = s5; $('#homeQHint').textContent = live.length ? I18N.t('home.queue.hintSome') : I18N.t('home.queue.hintEmpty');
      $('#homeQueue').innerHTML = live.map(v => { const d = v.scenes.filter(x => x.status === 'done').length, n = v.scenes.length; return `<div class="hqi" data-vid="${v.id}"><div class="grow"><div class="t">${esc(v.title)}</div><small>${esc(I18N.t('home.queue.itemMeta', { done: d, total: n }))}${v.chains > 1 ? esc(I18N.t('home.queue.chains', { n: v.chains })) : ''}</small><div class="bar"><i style="width:${n ? 100 * d / n : 0}%"></i></div></div><span class="chip ${v.status}">${esc(ST[v.status])}</span></div>`; }).join('');
    }
    // nhân vật cho Tạo nhanh
    const s6 = JSON.stringify(S.characters.map(c => [c.id, c.name]));
    if (s6 !== sig.qk) { sig.qk = s6; const on = new Set($$('#qkChars input:checked').map(i => i.value)); $('#qkChars').innerHTML = S.characters.length ? `<small>${esc(I18N.t('home.quick.charsLabel'))}</small> ` + S.characters.map(c => `<label><input type="checkbox" value="${esc(c.id)}" ${on.has(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('') : ''; }
    estimate();
  }
  window.I18N?.onChange?.(() => {
    sig = { stats: '', steps: '', recent: '', lanes: '', queue: '', qk: '' };
    buildTplChips();
    $('#qkImgN').textContent = qkImgs.length ? I18N.t('home.quick.imgCountMore', { n: qkImgs.length }) : I18N.t('home.quick.noImg');
    if (!$('#qkGo').disabled) $('#qkGo').textContent = I18N.t('home.quick.go');
    render();
    estimate();
  });
  window.addEventListener('viewchange', e => { if (e.detail === 'home') render(); else if (e.detail === 'script') estimate(); });
  api.onState(() => render());
  call('state:get').then(() => setTimeout(render, 0));
})();
