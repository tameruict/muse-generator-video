// Mục "Làm phim", "Video Aff", "Codex AI". Dùng lại hàm toàn cục từ app.js: $, $$, esc, call, toast, fileUrl, S.
let fMusic = '', aImgs = [], tSig = {}, cxPreset = 'general', cxBusy = false, cxLog = [];
const PRESET_LABEL = new Proxy({}, { get: (_, k) => I18N.t('codex.presets.' + k) });
const TST = new Proxy({}, { get: (_, k) => I18N.t('status.' + k) });
const vprog = v => `${v.scenes.filter(s => s.status === 'done').length}/${v.scenes.length}`;

// ---- chọn nhân vật / phong cách cho Làm phim (giữ lựa chọn đang tick) ----
function tPickers() {
  if (!S) return;
  const key = JSON.stringify([S.characters.map(c => [c.id, c.name]), S.styles.map(s => [s.id, s.name])]);
  if (key === tSig.pick) return; tSig.pick = key;
  const on = new Set($$('#fChars input:checked').map(i => i.value)), st = $('#fStyle').value;
  $('#fChars').innerHTML = S.characters.map(c => `<label><input type="checkbox" value="${esc(c.id)}" ${on.has(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('') || `<small>${esc(I18N.t('sync.noCharPicker'))}</small>`;
  $('#fStyle').innerHTML = `<option value="">${esc(I18N.t('sync.noStyleOption'))}</option>` + S.styles.map(s => `<option value="${esc(s.id)}" ${s.id === st ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}
// ---- danh sách video (phim / aff) ----
function vcard(v, aff) {
  const done = v.scenes.filter(s => s.status === 'done').length, pct = v.scenes.length ? 100 * done / v.scenes.length : 0;
  const a = v.aff;
  return `<div class="ep ${a ? 'aff' : ''}"><div class="meta"><h4 class="grow">${esc(v.title)}</h4><small>${esc(I18N.t('tools.cardMeta', { project: v.project, total: v.scenes.length, prog: vprog(v), ratio: v.ratio }))}${v.phase ? ' · ' + esc(v.phase) : ''}</small><span class="chip ${v.status}">${esc(TST[v.status])}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>${v.status === 'error' ? `<div class="warn" style="color:#ff8a8d">${esc(I18N.t('common.errorPrefix', { msg: v.error }))}</div>` : ''}
    ${a ? `<details><summary>${esc(I18N.t('aff.postDetails'))}</summary><pre>${esc([a.caption, a.link ? 'Link: ' + a.link : '', a.hashtags.join(' '), a.pinned ? '\n' + I18N.t('aff.pinnedTag') + a.pinned : ''].filter(Boolean).join('\n\n'))}</pre></details>` : ''}
    <details><summary>${esc(I18N.t('tools.scenesSummary'))}</summary><pre>${esc(v.scenes.map(s => I18N.t('tools.sceneLine', { n: s.idx + 1, st: TST[s.status], text: s.text })).join('\n\n'))}</pre></details>
    ${v.final ? `<details><summary>${esc(I18N.t('tools.watchVideo'))}</summary><video data-vid="${v.id}" controls preload="none" src="${fileUrl(v.final)}"></video></details>` : ''}
    <div class="act" style="margin-top:6px">${a ? `<button data-ac="${v.id}">${esc(I18N.t('aff.copyPost'))}</button>` : ''}<button data-vo="${v.id}">${esc(I18N.t('common.openDir'))}</button>${v.status === 'error' ? `<button data-vr="${v.id}" class="primary">${esc(I18N.t('common.retry'))}</button>` : ''}<button data-vx="${v.id}" class="dangero">${esc(I18N.t('common.delete'))}</button></div></div>`;
}
function tLists() {
  if (!S) return;
  for (const [box, test, emptyKey] of [['#fList', v => v.film, 'film.empty'], ['#aList', v => v.aff, 'aff.empty']]) {
    const list = S.videos.filter(test).slice().reverse();
    const sig = JSON.stringify(list.map(v => [v.id, v.title, v.status, v.phase, v.error, v.final, v.scenes.map(s => s.status)]));
    if (sig === tSig[box]) continue; tSig[box] = sig;
    $(box).innerHTML = list.map(v => vcard(v)).join('') || `<div class="hint">${esc(I18N.t(emptyKey))}</div>`;
    $$(box + ' [data-vo]').forEach(b => b.onclick = () => call('video:open', b.dataset.vo));
    $$(box + ' [data-vr]').forEach(b => b.onclick = () => call('video:retry', b.dataset.vr));
    $$(box + ' [data-ac]').forEach(b => b.onclick = async () => { await call('aff:copy', b.dataset.ac); toast(I18N.t('aff.toastCopied')); });
    $$(box + ' [data-vx]').forEach(b => b.onclick = async () => { const f = confirm(I18N.t('common.confirmDelFiles')); await window.releaseMedia?.([b.dataset.vx]); try { await call('video:delete', [b.dataset.vx], f); } catch (e) { tSig = {}; tLists(); throw e; } });
  }
}
const tBtn = (id, labelKey, fn) => $(id).onclick = async () => { const b = $(id), t = b.textContent; b.disabled = true; if (labelKey) b.textContent = I18N.t(labelKey); try { await fn(); } finally { b.disabled = false; b.textContent = b.dataset.i18n ? I18N.t(b.dataset.i18n) : t; } };

// ---- Làm phim ----
const fCount = () => { const n = $('#fScript').value.split(/\r?\n/).filter(l => l.trim()).length; $('#fCount').textContent = n ? I18N.t('film.countMeta', { n, sec: n * 10 }) : ''; };
$('#fScript').oninput = fCount;
$('#fMusic').onclick = async () => { fMusic = await call('pick:audio'); $('#fMusicName').textContent = fMusic.split(/[\\/]/).pop(); if (fMusic) $('#fMusicOn').checked = true; };
const fSpec = () => ({ title: $('#fTitle').value, premise: $('#fPremise').value, genre: selVal('fGenre') || 'drama', duration: selDur('fDur'), ratio: selVal('fRatio') || '16:9', voice: selVal('fVoice') || 'none',
  styleId: $('#fStyle').value, characterIds: $$('#fChars input:checked').map(i => i.value), refMode: $('#fMode').value, bible: $('#fBible').value, music: $('#fMusicOn').checked ? fMusic : '', script: $('#fScript').value });
const fCheck = s => { if (!s.duration) { toast(I18N.t('film.invalidDur'), true); return false; } return true; };
tBtn('#fPlan', 'film.planningBtn', async () => {
  if ($('#fScript').value.trim() && !confirm(I18N.t('film.confirmReplace'))) return;
  const sp = fSpec(); if (!fCheck(sp)) return;
  const r = await call('film:plan', sp); $('#fScript').value = r.script; if (r.bible) $('#fBible').value = r.bible; fCount();
  if (r.partial) toast(r.partial, true);
  toast(I18N.t('film.plannedToast', { scenes: r.scenes, bibleNote: r.bibleOk ? I18N.t('film.bibleOk') : I18N.t('film.bibleManual') }), !r.bibleOk && !r.bible);
});
tBtn('#fGo', 'film.queueingBtn', async () => { const sp = fSpec(); if (!fCheck(sp)) return; const r = await call('film:queue', sp); toast(I18N.t('film.queuedToast', { added: r.added })); });

// ---- Video Aff ----
function aThumbs() {
  $('#aImgCount').textContent = aImgs.length ? I18N.t('common.imagesCount', { n: aImgs.length }) : I18N.t('common.zeroImages');
  $('#aThumbs').innerHTML = aImgs.map((p, i) => `<div><img src="${fileUrl(p)}"><b data-i="${i}">×</b></div>`).join('');
  $$('#aThumbs b').forEach(b => b.onclick = () => { aImgs.splice(+b.dataset.i, 1); aThumbs(); });
}
$('#aPick').onclick = async () => { const f = await call('pick:images'); aImgs = [...new Set([...aImgs, ...f])].slice(0, 4); aThumbs(); };
$('#aClear').onclick = () => { aImgs = []; aThumbs(); };
tBtn('#aGo', 'aff.generatingBtn', async () => {
  if (!selDur('aDur')) return toast(I18N.t('aff.invalidDur'), true);
  const r = await call('aff:create', { product: $('#aProduct').value, price: $('#aPrice').value, points: $('#aPoints').value, audience: $('#aAud').value, link: $('#aLink').value,
    platform: selVal('aPlat') || 'tiktok', formula: selVal('aForm') || 'review', duration: selDur('aDur'), copies: $('#aCopies').value, voice: selVal('aVoice') || 'none', ratio: selVal('aRatio') || '9:16', continuity: $('#aCont').checked, productDesc: $('#aDesc').value, images: aImgs });
  toast(I18N.t('aff.createdToast', { added: r.added, note: r.note ? ' ' + r.note : '' }), !!r.note);
});

// ---- Codex AI ----
function cxRender() {
  $('#cxPresets').innerHTML = ['general', 'script', 'prompt', 'ideas', 'caption'].map(k => `<button data-p="${k}" class="${cxPreset === k ? 'on' : ''}">${esc(PRESET_LABEL[k])}</button>`).join('');
  $$('#cxPresets button').forEach(b => b.onclick = () => { cxPreset = b.dataset.p; cxRender(); });
  const log = $('#cxLog'), atEnd = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
  log.innerHTML = cxLog.map(m => `<div class="msg ${m.role}">${esc(m.text)}${m.role === 'ai' ? `<div class="act"><button data-cp="${m.id}">${esc(I18N.t('codex.copyBtn'))}</button><button data-sc="${m.id}">${esc(I18N.t('codex.toScriptBtn'))}</button><button data-fl="${m.id}">${esc(I18N.t('codex.toFilmBtn'))}</button></div>` : ''}</div>`).join('') +
    (cxBusy ? `<div class="msg ai wait">${esc(I18N.t('codex.thinking'))}</div>` : '') || `<div class="hint">${esc(I18N.t('codex.empty'))}</div>`;
  if (atEnd) log.scrollTop = log.scrollHeight;
  const get = id => (cxLog.find(m => m.id === id) || {}).text || '';
  $$('#cxLog [data-cp]').forEach(b => b.onclick = async () => { await navigator.clipboard.writeText(get(b.dataset.cp)); toast(I18N.t('codex.toastCopied')); });
  const go = (view, sel, id) => { $(sel).value = get(id); $(`#nav button[data-view="${view}"]`).click(); if (sel === '#fScript') fCount(); };
  $$('#cxLog [data-sc]').forEach(b => b.onclick = () => go('script', '#script', b.dataset.sc));
  $$('#cxLog [data-fl]').forEach(b => b.onclick = () => go('film', '#fScript', b.dataset.fl));
  $('#cxHint').textContent = I18N.t('codex.modePrefix', { mode: PRESET_LABEL[cxPreset] });
}
async function cxSend() {
  const t = $('#cxIn').value.trim(); if (!t || cxBusy) return;
  cxBusy = true; $('#cxSend').disabled = true; cxLog = [...cxLog, { id: 'tmp', role: 'user', text: t }]; $('#cxIn').value = ''; cxRender();
  try { cxLog = await call('ai:chat', { message: t, preset: cxPreset }); }
  catch (e) { cxLog = cxLog.filter(m => m.id !== 'tmp'); $('#cxIn').value = t; }
  finally { cxBusy = false; $('#cxSend').disabled = false; cxRender(); }
}
$('#cxSend').onclick = cxSend;
$('#cxIn').onkeydown = e => { if (e.key === 'Enter' && e.ctrlKey) cxSend(); };
$('#cxClear').onclick = async () => { if (confirm(I18N.t('codex.confirmClear'))) { cxLog = await call('ai:clear'); cxRender(); } };

const syncTools = () => { if (S && ($('#v-film').classList.contains('on') || $('#v-aff').classList.contains('on'))) { tPickers(); tLists(); } };
window.I18N?.onChange?.(() => {
  tSig = {};
  tPickers();
  tLists();
  fCount();
  aThumbs();
  cxRender();
});
api.onState(syncTools);
window.addEventListener('viewchange', e => { if (e.detail === 'film' || e.detail === 'aff') syncTools(); });
call('state:get').then(() => setTimeout(syncTools, 0));
call('ai:state').then(l => { cxLog = l; cxRender(); }); aThumbs(); cxRender();
