const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileUrl = p => encodeURI('file:///' + String(p).replace(/\\/g, '/').replace(/^\//, ''));
const ST = new Proxy({}, { get: (_, k) => I18N.t('status.' + k) });
let S = null, mode = 'script', images = [], music = '', sel = new Set(), cur = null, filter = 'all', proj = '', editCh = null, editSt = null, chImgs = [], lastPickers = '', playerSrc = '', lastPreviewSig = '', lastLib = '', lastQueueSig = '', lastSyncSig = '', lastAccSig = '';

async function releaseMedia(ids) {
  const set = Array.isArray(ids) ? new Set(ids.filter(Boolean)) : null;
  const els = [];
  const p = $('#player');
  if (p && (!set || (cur && set.has(cur)))) els.push(p);
  $$('video[data-vid]').forEach(v => { if (!set || set.has(v.dataset.vid)) els.push(v); });
  for (const el of els) {
    try { el.pause(); el.removeAttribute('src'); el.load(); } catch (_) {}
  }
  playerSrc = ''; lastPreviewSig = ''; lastLib = '';
  await new Promise(r => setTimeout(r, 80));
}
window.releaseMedia = releaseMedia;

function toast(m, err) { const d = document.createElement('div'); if (err) d.className = 'err'; d.textContent = m; $('#toast').appendChild(d); setTimeout(() => d.remove(), err ? 7000 : 3500); }
async function call(c, ...a) {
  let r;
  try { r = await api.invoke(c, ...a); }
  catch (e) { const m = I18N.t('err.ipcCall', { cmd: c, msg: String((e && e.message) || e).replace(/^Error invoking remote method '[^']*':\s*/, '') }); toast(m, true); throw new Error(m); }
  if (!r || !r.ok) { const m = (r && r.error) || I18N.t('err.ipcUnknown', { cmd: c }); toast(m, true); throw new Error(m); }
  return r.data;
}
window.addEventListener('unhandledrejection', e => { console.error(e.reason); });
const go2 = v => { const b = document.querySelector(`#nav button[data-view="${v}"]`); if (b) b.click(); };
const fmtT = t => new Date(t).toLocaleTimeString(I18N.locale(), { hour: '2-digit', minute: '2-digit' });

// ---- điều hướng ----
$$('#nav button').forEach(b => b.onclick = () => {
  const view = b.dataset.view;
  $$('#nav button').forEach(x => x.classList.toggle('on', x === b));
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + view));
  if (view === 'settings' && S) fillSettings();
  if (view === 'library' && S) { lastLib = ''; renderLibrary(); }
  if (view === 'accounts' && S) renderAccounts();
  if (view === 'sync' && S) renderSync();
  if (view === 'script' && S) { renderQueue(); renderPreview(); }
  window.dispatchEvent(new CustomEvent('viewchange', { detail: view }));
});
$$('.tab').forEach(t => t.onclick = () => { mode = t.dataset.mode; $$('.tab').forEach(x => x.classList.toggle('on', x === t)); });

// ---- composer ----
function renderThumbs() {
  $('#imgCount').textContent = images.length ? I18N.t('common.imagesCount', { n: images.length }) : I18N.t('common.zeroImages');
  $('#thumbs').innerHTML = images.map((p, i) => `<div><img src="${fileUrl(p)}"><b data-i="${i}">×</b></div>`).join('');
  $$('#thumbs b').forEach(b => b.onclick = () => { images.splice(+b.dataset.i, 1); renderThumbs(); });
}
$('#btnPickImg').onclick = async () => { const f = await call('pick:images'); images = [...new Set([...images, ...f])]; renderThumbs(); };
$('#btnClearImg').onclick = () => { images = []; renderThumbs(); };
$('#btnMusic').onclick = async () => { music = await call('pick:audio'); $('#musicName').textContent = music.split(/[\\/]/).pop(); if (music) $('#useMusic').checked = true; };
$('#btnAdd').onclick = async () => {
  if (!S.accounts.length) { go2('accounts'); return toast(I18N.t('toast.noAccount'), true); }
  const script = $('#script').value;
  if (!selDur('duration')) return toast(I18N.t('toast.invalidDur'), true);
  if (mode === 'script' && !script.trim()) return toast(I18N.t('toast.needScript'), true);
  if (mode === 'image' && !images.length) return toast(I18N.t('toast.needImg'), true);
  $('#btnAdd').disabled = true; $('#btnAdd').textContent = I18N.t('script.preparing');
  try {
    const r = await call('queue:add', {
      mode, script, images, ratio: $('#ratio').value, duration: selDur('duration'), prefix: $('#prefix').value, voice: selVal('voice') || 'none',
      styleId: $('#styleSel').value, project: $('#project').value, copies: +$('#copies').value || 1, continuity: $('#continuity').checked,
      useAI: $('#useAI').checked, parallel: $('#parallel').value, music: $('#useMusic').checked ? music : '', characterIds: $$('#charPick input:checked').map(i => i.value)
    });
    const auto = r.added && $('#autoStart').checked; if (auto) call('queue:start');
    toast(I18N.t(auto ? 'toast.addedRender' : 'toast.addedQueue', { n: r.added, note: r.note ? ' ' + r.note : '' }), !!r.note);
    if (r.warn) toast(I18N.t('toast.charWarn', { warn: r.warn }));
  } finally { $('#btnAdd').disabled = false; $('#btnAdd').textContent = I18N.t('script.addBtn'); }
};

// ---- thanh trên / dưới ----
$('#btnResume').onclick = () => call('queue:start');
$('#btnStopAll').onclick = () => call('queue:stop');
$('#bStart').onclick = () => call('queue:start');
$('#bStop').onclick = () => call('queue:stop');
$('#btnOutDir').onclick = () => call('dir:open');
$('#projSel').onchange = e => { proj = e.target.value; renderQueue(); renderLibrary(); };
$('#bAll').onclick = () => { visible().forEach(v => sel.add(v.id)); renderQueue(); };
$('#bNone').onclick = () => { sel.clear(); renderQueue(); };
$('#bDel').onclick = async () => { if (!sel.size) return; const f = confirm(I18N.t('common.confirmDelFiles')); const ids = [...sel]; await releaseMedia(ids); await call('video:delete', ids, f); sel.clear(); renderQueue(); };
$('#bClear').onclick = async () => { if (confirm(I18N.t('queue.confirmClearDone'))) { await releaseMedia(S ? S.videos.filter(v => v.status === 'done').map(v => v.id) : undefined); await call('video:clearDone', false); } };

// ---- hàng đợi ----
const visible = () => S.videos.filter(v => (!proj || v.project === proj) && (filter === 'all' || v.status === filter));
function prog(v) { const d = v.scenes.filter(s => s.status === 'done').length; return `${d}/${v.scenes.length}`; }
function renderQueue() {
  if (!S) return;
  $('#bDel').textContent = I18N.t('queue.delSelected', { n: sel.size });
  const run = S.videos.filter(v => v.status === 'running').length, done = S.videos.filter(v => v.status === 'done').length, err = S.videos.filter(v => v.status === 'error').length;
  const eta = window.etaText ? window.etaText() : '';
  $('#bSum').textContent = I18N.t('queue.summary', { run, done, total: S.videos.length, err, eta });
  if (!$('#v-script').classList.contains('on')) return;
  const all = S.videos.filter(v => !proj || v.project === proj), c = k => all.filter(v => v.status === k).length;
  const vis = visible();
  const qsig = JSON.stringify([proj, filter, cur, [...sel], eta, [all.length, c('pending'), c('running'), c('done'), c('error')], vis.map(v => [v.id, v.title, v.status, v.phase, v.error, v.project, v.ratio, v.scenes.map(s => s.status)])]);
  if (qsig === lastQueueSig) return; lastQueueSig = qsig;
  $('#filters').innerHTML = [
    ['all', I18N.t('queue.filterAll', { n: all.length })],
    ['pending', I18N.t('queue.filterPending', { n: c('pending') })],
    ['running', I18N.t('queue.filterRunning', { n: c('running') })],
    ['done', I18N.t('queue.filterDone', { n: c('done') })],
    ['error', I18N.t('queue.filterError', { n: c('error') })]
  ].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${esc(l)}</button>`).join('') + `<span class="grow"></span>`;
  $$('#filters button').forEach(b => b.onclick = () => { filter = b.dataset.f; renderQueue(); });
  const q = $('#queue'), top = q.scrollTop;
  q.innerHTML = vis.map((v, i) => `<div class="row q ${cur === v.id ? 'cur' : ''}" data-id="${v.id}">
    <input type="checkbox" data-s="${v.id}" ${sel.has(v.id) ? 'checked' : ''}><span>${i + 1}</span>
    <div style="min-width:0"><div class="t">${esc(v.title)}</div><small>${esc(I18N.t('queue.rowMeta', { n: v.scenes.length, prog: prog(v), ratio: v.ratio, project: v.project }))}${v.phase ? ' · ' + esc(v.phase) : ''}</small>
      <div class="bar"><i style="width:${v.scenes.length ? 100 * v.scenes.filter(s => s.status === 'done').length / v.scenes.length : 0}%"></i></div>${v.status === 'error' ? `<small style="color:#ff8a8d" title="${esc(v.error)}">${esc(v.error)}</small>` : ''}</div>
    <span class="chip ${v.status}">${esc(ST[v.status])}</span>
    <div class="act"><button data-o="${v.id}" title="${esc(I18N.t('queue.openDirTitle'))}">📁</button>${v.status === 'error' ? `<button data-r="${v.id}" title="${esc(I18N.t('queue.retryTitle'))}">↻</button>` : ''}<button data-x="${v.id}" class="dangero">✕</button></div></div>`).join('') || `<div class="hint" style="padding:20px">${esc(I18N.t('queue.empty'))}</div>`;
  q.scrollTop = top;
  $$('#queue .q').forEach(r => r.onclick = e => { if (e.target.closest('input,button')) return; cur = r.dataset.id; renderQueue(); renderPreview(); });
  $$('#queue input[data-s]').forEach(i => i.onchange = () => { i.checked ? sel.add(i.dataset.s) : sel.delete(i.dataset.s); $('#bDel').textContent = I18N.t('queue.delSelected', { n: sel.size }); });
  $$('#queue [data-o]').forEach(b => b.onclick = () => call('video:open', b.dataset.o));
  $$('#queue [data-r]').forEach(b => b.onclick = () => call('video:retry', b.dataset.r));
  $$('#queue [data-x]').forEach(b => b.onclick = async () => { const f = confirm(I18N.t('common.confirmDelFiles')); await releaseMedia([b.dataset.x]); await call('video:delete', [b.dataset.x], f); });
}
let editing = null, editText = '';   // {vid, idx}: cảnh đang sửa nội dung
function renderPreview() {
  if (!S || !$('#v-script').classList.contains('on')) return;
  const v = S.videos.find(x => x.id === cur);
  if (!v) {
    lastPreviewSig = '';
    if (playerSrc) { playerSrc = ''; const p = $('#player'); if (p) { try { p.pause(); p.removeAttribute('src'); p.load(); } catch (_) {} } }
    $('#pInfo').innerHTML = `<span class="hint">${esc(I18N.t('queue.selectPrompt'))}</span>`; $('#pStatus').textContent = ''; return;
  }
  $('#pStatus').className = 'chip ' + v.status; $('#pStatus').textContent = ST[v.status];
  const f = v.final || v.scenes.find(s => s.file)?.file;
  const src = f ? fileUrl(f) : '';
  if (src !== playerSrc) { playerSrc = src; $('#player').src = src; }
  const sig = JSON.stringify([v.id, v.status, v.scenes.map(s => [s.status, s.error, s.account, s.cast, s.softened, s.text]), editing && editing.vid === v.id ? editing.idx : -1]);
  const castNames = s => Array.isArray(s.cast) ? s.cast.map(id => (S.characters.find(c => c.id === id) || (v.chars || []).find(c => c.id === id) || {}).name).filter(Boolean) : null;
  if (sig === lastPreviewSig) return; lastPreviewSig = sig;
  const typed = $('#pTags') && $('#pInfo').dataset.vid === v.id ? [$('#pTags').value, $('#pNote').value] : null;
  $('#pInfo').dataset.vid = v.id;
  $('#pInfo').innerHTML = `<b>${esc(v.title)}</b><br>${esc(I18N.t('queue.projectLabel'))} ${esc(v.project)} · ${v.ratio}<br>` +
    v.scenes.map(s => `<div style="margin-top:6px"><b>${esc(I18N.t('queue.sceneTitle', { n: s.idx + 1 }))}</b> <span class="chip ${s.status}">${esc(ST[s.status])}</span>${s.status !== 'running' ? ` <button data-rg="${s.idx}" title="${esc(I18N.t('queue.regenTitle', { n: s.idx + 1 }))}" style="padding:1px 7px">${esc(I18N.t('queue.regenBtn'))}</button> <button data-ed="${s.idx}" title="${esc(I18N.t('queue.editTitle'))}" style="padding:1px 7px">${esc(I18N.t('queue.editBtn'))}</button>${s.status !== 'skipped' ? ` <button data-sk="${s.idx}" title="${esc(I18N.t('queue.skipTitle'))}" style="padding:1px 7px">${esc(I18N.t('queue.skipBtn'))}</button>` : ''}` : ''}${s.softened ? ` <small style="color:#ffb86b">${esc(I18N.t('queue.softened', { n: s.softened }))}</small>` : ''}${s.account ? ' <small>' + esc(s.account) + '</small>' : ''}${castNames(s) ? `<br><small>👤 ${castNames(s).length ? esc(castNames(s).join(', ')) : esc(I18N.t('queue.noChar'))}${s.castSrc === 'carry' || s.castSrc === 'all' ? esc(I18N.t('queue.guessedChar')) : ''}</small>` : ''}<br>${editing && editing.vid === v.id && editing.idx === s.idx ? `<textarea data-et="${s.idx}" style="width:100%;min-height:90px;margin-top:4px">${esc(editText || s.text)}</textarea><div style="margin-top:4px"><button data-es="${s.idx}">${esc(I18N.t('queue.saveRegen'))}</button> <button data-ec="${s.idx}">${esc(I18N.t('common.cancel'))}</button></div>` : esc(s.text)}${s.error ? `<br><small style="color:#ffb86b">${esc(s.error)}</small>` : ''}</div>`).join('') +
    `<div style="margin-top:8px"><input id="pTags" placeholder="${esc(I18N.t('queue.tagsPh'))}" value="${esc((v.tags || []).join(', '))}"><textarea id="pNote" placeholder="${esc(I18N.t('queue.notePh'))}" style="min-height:50px;margin-top:4px">${esc(v.note || '')}</textarea></div>`;
  if (typed) { $('#pTags').value = typed[0]; $('#pNote').value = typed[1]; }
  $$('#pInfo [data-ed]').forEach(b => b.onclick = () => { editing = { vid: v.id, idx: +b.dataset.ed }; editText = ''; lastPreviewSig = ''; renderPreview(); });
  $$('#pInfo [data-ec]').forEach(b => b.onclick = () => { editing = null; editText = ''; lastPreviewSig = ''; renderPreview(); });
  $$('#pInfo [data-et]').forEach(t => t.oninput = () => { editText = t.value; });
  $$('#pInfo [data-es]').forEach(b => b.onclick = async () => { const n = +b.dataset.es, t = ($(`#pInfo [data-et="${n}"]`) || {}).value || ''; try { await releaseMedia([v.id]); await call('video:edit', v.id, n, t); editing = null; editText = ''; lastPreviewSig = ''; } catch (_) {} });
  $$('#pInfo [data-sk]').forEach(b => b.onclick = async () => { const n = +b.dataset.sk; if (!confirm(I18N.t('queue.confirmSkip', { n: n + 1 }))) return; try { await releaseMedia([v.id]); await call('video:skip', v.id, n); } catch (_) {} });
  $$('#pInfo [data-rg]').forEach(b => b.onclick = async () => { const n = +b.dataset.rg; if (!confirm(I18N.t('queue.confirmRegen', { n: n + 1 }))) return; try { await releaseMedia([v.id]); await call('video:regen', v.id, n); } catch (_) {} });
  const save = () => call('video:meta', v.id, { tags: $('#pTags').value.split(',').map(x => x.trim()).filter(Boolean), note: $('#pNote').value });
  $('#pTags').onchange = save; $('#pNote').onchange = save;
}

// ---- kho video ----
function renderLibrary() {
  if (!S || !$('#v-library').classList.contains('on')) return;
  const q = $('#libQ').value.toLowerCase();
  const list = S.videos.filter(v => v.status === 'done' && v.final && (!proj || v.project === proj) &&
    (!q || (v.title + ' ' + (v.tags || []).join(' ') + ' ' + (v.note || '') + ' ' + v.project).toLowerCase().includes(q)));
  $('#libCount').textContent = I18N.t('library.count', { n: list.length });
  const lsig = JSON.stringify(list.map(v => [v.id, v.title, v.tags, v.final]));
  if (lsig === lastLib) return; lastLib = lsig;
  $('#libGrid').innerHTML = list.map(v => `<div class="vc"><video data-vid="${v.id}" src="${fileUrl(v.final)}#t=0.5" preload="none" controls></video><div><div class="t" title="${esc(v.title)}">${esc(v.title)}</div>
    <small>${esc(v.project)} · ${esc(I18N.t('library.secDur', { n: v.scenes.length * 10 }))}${(v.tags || []).length ? ' · ' + esc(v.tags.join(', ')) : ''}</small><div class="act" style="margin-top:5px;padding:0"><button data-o="${v.id}">${esc(I18N.t('library.openBtn'))}</button>${v.scenes.length > 1 ? `<button data-j="${v.id}" title="${esc(I18N.t('library.rejoinTitle'))}">${esc(I18N.t('library.rejoinBtn'))}</button>` : ''}<button data-x="${v.id}" class="dangero">${esc(I18N.t('common.delete'))}</button></div></div></div>`).join('') ||
    `<div class="hint">${esc(I18N.t('library.empty'))}</div>`;
  $$('#libGrid [data-o]').forEach(b => b.onclick = () => call('video:open', b.dataset.o));
  $$('#libGrid [data-j]').forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = I18N.t('library.rejoining'); try { await releaseMedia([b.dataset.j]); await call('video:rejoin', b.dataset.j); playerSrc = ''; lastLib = ''; renderLibrary(); toast(I18N.t('library.toastRejoined')); } catch (e) { toast(e.message || I18N.t('library.toastRejoinErr'), true); } finally { b.disabled = false; b.textContent = I18N.t('library.rejoinBtn'); } });
  $$('#libGrid [data-x]').forEach(b => b.onclick = async () => { if (confirm(I18N.t('library.confirmDel'))) { await releaseMedia([b.dataset.x]); await call('video:delete', [b.dataset.x], true); } });
}
$('#libQ').oninput = renderLibrary;

// ---- đồng bộ nhân vật / ý tưởng ----
const syncOpen = new Set();   // mục đang mở rộng để đọc hết văn bản dài
const longTxt = (id, t) => `<small data-x="${id}" title="${esc(t)}" class="${syncOpen.has(id) ? 'open' : String(t).length > 150 ? 'more' : ''}">${esc(t)}</small>`;
function renderSync() {
  if (!S || !$('#v-sync').classList.contains('on')) return;
  const sig = JSON.stringify([S.characters, S.styles, [...syncOpen]]);
  if (sig === lastSyncSig) return; lastSyncSig = sig;
  $('#chList').innerHTML = S.characters.map(c => `<div class="cd">${c.images[0] ? `<img src="${fileUrl(c.images[0])}">` : ''}<div class="grow"><b>${esc(c.name)}</b>${longTxt(c.id, c.desc)}</div><button data-e="${c.id}">${esc(I18N.t('common.edit'))}</button><button data-d="${c.id}" class="dangero">${esc(I18N.t('common.delete'))}</button></div>`).join('') || `<div class="hint">${esc(I18N.t('sync.charEmpty'))}</div>`;
  $$('#chList [data-e]').forEach(b => b.onclick = () => { editCh = S.characters.find(c => c.id === b.dataset.e); $('#chName').value = editCh.name; $('#chDesc').value = editCh.desc; chImgs = [...editCh.images]; $('#chImgs').textContent = chImgs.length ? I18N.t('common.imagesCount', { n: chImgs.length }) : I18N.t('common.zeroImages'); $('#chCancel').hidden = false; });
  $$('#chList [data-d]').forEach(b => b.onclick = () => confirm(I18N.t('sync.confirmDelChar')) && call('char:delete', b.dataset.d));
  $('#stList').innerHTML = S.styles.map(s => `<div class="cd"><div class="grow"><b>${esc(s.name)}</b>${longTxt(s.id, s.text)}</div><button data-e="${s.id}">${esc(I18N.t('common.edit'))}</button><button data-d="${s.id}" class="dangero">${esc(I18N.t('common.delete'))}</button></div>`).join('') || `<div class="hint">${esc(I18N.t('sync.styleEmpty'))}</div>`;
  $$('#stList [data-e]').forEach(b => b.onclick = () => { editSt = S.styles.find(s => s.id === b.dataset.e); $('#stName').value = editSt.name; $('#stText').value = editSt.text; $('#stCancel').hidden = false; });
  $$('#stList [data-d]').forEach(b => b.onclick = () => confirm(I18N.t('sync.confirmDelStyle')) && call('style:delete', b.dataset.d));
  $$('#chList small[data-x], #stList small[data-x]').forEach(sm => sm.onclick = () => { const id = sm.dataset.x; syncOpen.has(id) ? syncOpen.delete(id) : syncOpen.add(id); renderSync(); });
}
const resetCh = () => { editCh = null; chImgs = []; $('#chName').value = ''; $('#chDesc').value = ''; $('#chImgs').textContent = ''; $('#chCancel').hidden = true; };
const resetSt = () => { editSt = null; $('#stName').value = ''; $('#stText').value = ''; $('#stCancel').hidden = true; };
$('#chPick').onclick = async () => { const f = await call('pick:images'); if (f.length) { chImgs = f.slice(0, 2); $('#chImgs').textContent = I18N.t('common.imagesSelected', { n: chImgs.length }); } };
$('#chAuto').onclick = async () => {
  const imgs = chImgs.length ? chImgs : (editCh?.images || []);
  if (!imgs.length) return toast(I18N.t('sync.toastPickFirst'), true);
  const b = $('#chAuto'); b.disabled = true; b.textContent = I18N.t('sync.charDescribing');
  try { const t = await call('char:describe', { name: $('#chName').value, images: imgs }); $('#chDesc').value = t; toast(I18N.t('sync.toastCharDescribed')); }
  catch (e) { toast(e.message || I18N.t('sync.toastCharDescribeErr'), true); }
  finally { b.disabled = false; b.textContent = I18N.t('sync.charAutoBtn'); }
};
$('#chSave').onclick = async () => { await call('char:save', { id: editCh?.id, name: $('#chName').value, desc: $('#chDesc').value, images: chImgs }); resetCh(); toast(I18N.t('sync.toastCharSaved')); };
$('#chCancel').onclick = resetCh;
$('#stAuto').onclick = async () => {
  const name = $('#stName').value.trim(); if (!name) return toast(I18N.t('sync.toastStyleNeedName'), true);
  const b = $('#stAuto'); b.disabled = true; b.textContent = I18N.t('sync.styleWriting');
  try { $('#stText').value = await call('style:describe', { name, hint: $('#stText').value }); toast(I18N.t('sync.toastCharDescribed')); }
  catch (e) { toast(e.message || I18N.t('sync.toastStyleDescribeErr'), true); }
  finally { b.disabled = false; b.textContent = I18N.t('sync.styleAutoBtn'); }
};
$('#stSave').onclick = async () => { await call('style:save', { id: editSt?.id, name: $('#stName').value, text: $('#stText').value }); resetSt(); toast(I18N.t('sync.toastStyleSaved')); };
$('#stCancel').onclick = resetSt;
function renderPickers() {
  if (!S) return;
  const key = JSON.stringify([S.characters.map(c => [c.id, c.name]), S.styles.map(s => [s.id, s.name]), [...new Set(S.videos.map(v => v.project))]]);
  if (key === lastPickers) return; lastPickers = key;
  const checked = new Set($$('#charPick input:checked').map(i => i.value)), selStyle = $('#styleSel').value;
  $('#charPick').innerHTML = S.characters.map(c => `<label><input type="checkbox" value="${c.id}" ${checked.has(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('') || `<small>${esc(I18N.t('sync.noCharPicker'))}</small>`;
  $('#styleSel').innerHTML = `<option value="">${esc(I18N.t('sync.noStyleOption'))}</option>` + S.styles.map(s => `<option value="${s.id}" ${s.id === selStyle ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const ps = [...new Set(S.videos.map(v => v.project))];
  $('#projList').innerHTML = ps.map(p => `<option value="${esc(p)}">`).join('');
  $('#projSel').innerHTML = `<option value="">${esc(I18N.t('top.allProjects'))}</option>` + ps.map(p => `<option ${p === proj ? 'selected' : ''}>${esc(p)}</option>`).join('');
}

// ---- tài khoản ----
const accLabel = a => a.enabled === false ? [I18N.t('accounts.disabled'), 'pending'] : a.state === 'blocked' ? [I18N.t('accounts.blocked'), 'error'] : a.state === 'exhausted' ? [I18N.t('accounts.exhaustedUntil', { time: fmtT(a.until) }), 'running'] : [I18N.t('accounts.ready'), 'done'];
function renderHeader() {
  if (!S) return;
  const ok = S.accounts.filter(a => a.enabled !== false && a.state === 'ok').length;
  $('#accPill').textContent = I18N.t('top.accPill', { active: S.active, ok, total: S.accounts.length });
  $('#btnResume').disabled = S.running; $('#btnStopAll').disabled = !S.running; $('#bStart').disabled = S.running; $('#bStop').disabled = !S.running;
  const n = $('#notice'); n.hidden = !S.notice; n.textContent = S.notice || '';
}
function renderAccounts() {
  if (!S || !$('#v-accounts').classList.contains('on')) return;
  const sig = JSON.stringify(S.accounts);
  if (sig === lastAccSig) return; lastAccSig = sig;
  $('#acList').innerHTML = S.accounts.length ? `<table><tr><th>${esc(I18N.t('accounts.colEmail'))}</th><th>${esc(I18N.t('accounts.colStatus'))}</th><th>${esc(I18N.t('accounts.colRunning'))}</th><th>${esc(I18N.t('accounts.colUsed'))}</th><th>${esc(I18N.t('accounts.colLastErr'))}</th><th>${esc(I18N.t('accounts.colSession'))}</th><th></th></tr>${S.accounts.map(a => {
    const [l, c] = accLabel(a), r = a.remote ? Object.entries(a.remote).filter(([k, v]) => k !== 'email' && !/pass|token|cookie/i.test(k) && v !== null && typeof v !== 'object').map(([k, v]) => `${k}: ${v}`).join(' · ') : '';
    return `<tr><td>${esc(a.email)}</td><td><span class="chip ${c}">${esc(l)}</span></td><td>${a.running}/1</td><td>${a.used || 0}</td><td><small style="white-space:normal;overflow-wrap:anywhere">${esc(a.lastErr || '')}</small></td><td><small>${a.checked ? (a.checked.ok ? esc(I18N.t('accounts.sessionOk', { time: fmtT(a.checked.at) })) : '✗ ' + esc(a.checked.msg || I18N.t('accounts.sessionErrFallback'))) + '<br>' : ''}${esc(r)}</small></td>
      <td class="act"><button data-k="${esc(a.email)}">${esc(I18N.t('accounts.btnCheck'))}</button><button data-t="${esc(a.email)}">${esc(a.enabled === false ? I18N.t('accounts.btnEnable') : I18N.t('accounts.btnDisable'))}</button><button data-r="${esc(a.email)}">${esc(I18N.t('accounts.btnReset'))}</button><button data-x="${esc(a.email)}" class="dangero">${esc(I18N.t('common.delete'))}</button></td></tr>`;
  }).join('')}</table>` : `<div class="hint">${esc(I18N.t('accounts.empty'))}</div>`;
  $$('#acList [data-t]').forEach(b => b.onclick = () => call('acct:toggle', b.dataset.t));
  $$('#acList [data-k]').forEach(b => b.onclick = async () => { b.disabled = true; try { const r = await call('acct:check', b.dataset.k); toast(r.ok ? I18N.t('accounts.toastSessionOk') : I18N.t('accounts.toastSessionBad', { msg: r.msg }), !r.ok); } finally { b.disabled = false; } });
  $$('#acList [data-r]').forEach(b => b.onclick = () => call('acct:reset', b.dataset.r));
  $$('#acList [data-x]').forEach(b => b.onclick = () => confirm(I18N.t('accounts.confirmRemove')) && call('acct:remove', b.dataset.x));
}
$('#acAdd').onclick = async () => {
  $('#acAdd').disabled = true;
  try { await call('acct:add', { email: $('#acEmail').value.trim(), otp: $('#acOtp').value.trim() }); $('#acOtp').value = ''; toast(I18N.t('accounts.toastAdded')); }
  finally { $('#acAdd').disabled = false; }
};
$('#acSend').onclick = async () => {
  $('#acSend').disabled = true;
  try { await call('acct:otp', { email: $('#acEmail').value.trim() }); toast(I18N.t('accounts.toastOtpSent')); }
  finally { $('#acSend').disabled = false; }
};
$('#ckAdd').onclick = async () => {
  $('#ckAdd').disabled = true;
  try { await call('acct:cookies', { email: $('#ckEmail').value.trim(), cookies: $('#ckText').value }); $('#ckText').value = ''; toast(I18N.t('accounts.toastCookieAdded')); }
  finally { $('#ckAdd').disabled = false; }
};
$('#acCheckAll').onclick = async () => { const b = $('#acCheckAll'); b.disabled = true; try { const rs = await call('acct:checkAll'), ok = rs.filter(x => x.ok).length; toast(I18N.t('accounts.toastCheckAll', { ok, total: rs.length, extra: ok < rs.length ? I18N.t('accounts.toastCheckAllExtra') : '' }), ok < rs.length); } finally { b.disabled = false; } };
$('#acResetAll').onclick = async () => { await call('acct:resetAll'); toast(I18N.t('accounts.toastResetAll')); };
$('#acRefresh').onclick = async () => { const n = await call('acct:refresh'); toast(I18N.t('accounts.toastBridgeOk', { n })); };

// ---- cài đặt ----
function fillSettings() {
  const s = S.settings; $('#sDir').value = s.outputDir;
  $('#sRefs').value = s.maxRefs || 4; $('#sPar').value = s.parallel || 'auto'; $('#sAutoFrom').value = s.autoFrom || 12; $('#sMinChap').value = s.minChapter || 4; $('#sNotify').checked = s.notify !== false; $('#sFade').value = String(s.joinFade === undefined ? 0.5 : s.joinFade); $('#sMatch').checked = s.joinMatch !== false; $('#sSess').checked = s.shareSession !== false; $('#sCheck').checked = s.contCheck !== false; $('#sConc').value = s.concurrency; $('#sRetry').value = s.maxRetries; $('#sPoll').value = s.pollSec;
}
$('#sPickDir').onclick = async () => { const d = await call('pick:dir'); if (d) $('#sDir').value = d; };
const saveSettings = () => call('settings:save', { outputDir: $('#sDir').value.trim(),
  parallel: $('#sPar').value, autoFrom: Math.min(60, Math.max(4, +$('#sAutoFrom').value || 12)), minChapter: Math.min(20, Math.max(2, +$('#sMinChap').value || 4)), notify: $('#sNotify').checked, joinFade: +$('#sFade').value, joinMatch: $('#sMatch').checked, shareSession: $('#sSess').checked, contCheck: $('#sCheck').checked, maxRefs: Math.min(9, Math.max(2, +$('#sRefs').value || 4)), concurrency: Math.max(0, +$('#sConc').value || 0), maxRetries: +$('#sRetry').value || 0, pollSec: +$('#sPoll').value || 8 });
$('#sSave').onclick = async () => { await saveSettings(); toast(I18N.t('settings.toastSaved')); };
$('#sTest').onclick = async () => { await saveSettings(); await call('bridge:test'); toast(I18N.t('settings.toastBridgeOk')); };

// ---- vòng đời ----
let first = true;
function onState(s) {
  S = s;
  if (first) {
    first = false;
    window.I18N?.syncFromSettings?.(s?.settings?.uiLang);
    fillSettings();
    if (!s.accounts.length) toast(I18N.t('toast.welcome'));
  }
  renderHeader(); renderPickers(); renderAccounts(); renderQueue(); renderPreview(); renderSync();
  if ($('#v-library').classList.contains('on')) renderLibrary();
}
window.I18N?.onChange?.(() => {
  lastPickers = ''; lastPreviewSig = ''; lastLib = ''; lastQueueSig = ''; lastSyncSig = ''; lastAccSig = '';
  if (!$('#btnAdd').disabled) $('#btnAdd').textContent = I18N.t('script.addBtn');
  renderThumbs();
  renderHeader();
  renderPickers();
  renderAccounts();
  renderQueue();
  renderPreview();
  renderSync();
  renderLibrary();
});
api.onState(onState);
call('state:get').then(onState);
