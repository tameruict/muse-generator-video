// Mục "Studio tự động" (tách riêng khỏi app.js). Dùng lại các hàm toàn cục: $, $$, esc, call, toast, fmtT, S.
let STU = { channels: [], episodes: [] }, stuEdit = null, stuMusic = '', stuSig = '', stuBusy = false, stuFilter = 'ready';
const STU_ST = new Proxy({}, { get: (_, k) => I18N.t('studio.st.' + k) });
const stuChip = s => ({ done: 'done', review: 'review', error: 'error' }[s] || 'running');

async function releaseStudioMedia(eid) {
  const els = eid ? $$(`#stuEps video[data-eid="${CSS.escape(eid)}"]`) : $$('#stuEps video[data-eid]');
  for (const el of els) {
    try { el.pause(); el.removeAttribute('src'); el.load(); } catch (_) {}
  }
  stuSig = '';
  await new Promise(r => setTimeout(r, 80));
}

function stuRenderChars(sel) {
  const list = (S && S.characters) || [];
  $('#chChars').innerHTML = list.length ? `<small>${esc(I18N.t('studio.charsLabel'))}</small> ` + list.map(c => `<label><input type="checkbox" value="${esc(c.id)}"${sel.includes(c.id) ? ' checked' : ''}> ${esc(c.name)}${c.images && c.images.length ? ' 🖼️' : ''}</label>`).join('')
    : `<small>${esc(I18N.t('studio.charsEmpty'))}</small>`;
}
function stuFillForm(c) {
  stuEdit = c ? c.id : null; c = c || {};
  $('#stuFormT').textContent = c.id ? I18N.t('studio.form.editTitle', { name: c.name }) : I18N.t('studio.form.newTitle');
  $('#stuChName').value = c.name || ''; $('#chStyle').value = c.style || ''; $('#chRatio').value = c.ratio || '9:16'; $('#chDur').value = c.duration || 30;
  $('#chLang').value = c.lang || 'vi'; $('#chVoice').value = c.voiceMode || 'muse'; $('#chTts').value = c.ttsVoice || ''; $('#chMap').value = c.voiceMap || ''; $('#chAvoid').value = c.avoid || '';
  $('#chSub').checked = c.subtitles !== false; $('#chCont').checked = c.continuity !== false; stuMusic = c.music || ''; $('#chMusicName').textContent = stuMusic.split(/[\\/]/).pop();
  $('#chDaily').value = c.dailyTarget || 10; $('#chSeeds').value = c.ideaSeeds || '';
  $('#chDel').hidden = !c.id; stuRenderChars(c.characterIds || []);
}
function stuRender() {
  const accCount = (S && S.accounts || []).filter(a => a.enabled !== false && a.state === 'ok').length;
  const sig = JSON.stringify([STU, accCount]);
  if (sig === stuSig) return; stuSig = sig;
  const cur = $('#stuCh').value;
  $('#stuCh').innerHTML = STU.channels.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('') || `<option value="">${esc(I18N.t('studio.noChannelOpt'))}</option>`;
  if (STU.channels.some(c => c.id === cur)) $('#stuCh').value = cur;
  const ch = STU.channels.find(c => c.id === $('#stuCh').value);
  $('#stuCh0').innerHTML = $('#stuCh').innerHTML; $('#stuCh0').value = $('#stuCh').value;
  if (ch) {
    const p = ch.progress, acc = (S && S.accounts || []).filter(a => a.enabled !== false && a.state === 'ok').length, clips = p.missing * Math.round(ch.duration / 10);
    $('#stuProg').innerHTML = I18N.t('studio.progHtml', { made: p.made, target: p.target, finished: p.finished, posted: p.posted }) + (p.failed ? I18N.t('studio.progFailed', { failed: p.failed }) : '');
    $('#stuBar').style.width = Math.min(100, 100 * p.made / p.target) + '%';
    $('#stuContinue').textContent = p.missing || p.failed ? I18N.t('studio.continueMore', { retryPart: p.failed ? I18N.t('studio.continueRetryPart', { failed: p.failed }) : '', missing: p.missing }) : I18N.t('studio.continueDone');
    $('#stuContHint').textContent = p.missing ? I18N.t('studio.contHint', { clips, acc }) : '';
  } else { $('#stuProg').textContent = I18N.t('studio.needChannelHint'); $('#stuBar').style.width = '0'; $('#stuContinue').textContent = I18N.t('studio.continueBtn'); $('#stuContHint').textContent = ''; }
  $('#stuHint').textContent = ch ? I18N.t('studio.hintMeta', { ratio: ch.ratio, dur: ch.duration, voice: I18N.t('studio.voiceShort.' + ch.voiceMode), chars: ch.characterIds.length }) : I18N.t('studio.needChannelHint');
  const mine = STU.episodes.filter(e => !$('#stuCh').value || e.channelId === $('#stuCh').value);
  const isReady = e => (e.status === 'done' || e.status === 'review') && !e.posted, isWork = e => !['done', 'review', 'error'].includes(e.status);
  const F = {
    ready: [I18N.t('studio.filters.ready'), mine.filter(isReady)],
    work: [I18N.t('studio.filters.work'), mine.filter(isWork)],
    error: [I18N.t('studio.filters.error'), mine.filter(e => e.status === 'error')],
    posted: [I18N.t('studio.filters.posted'), mine.filter(e => e.posted)],
    all: [I18N.t('studio.filters.all'), mine]
  };
  $('#stuFilters').innerHTML = Object.entries(F).map(([k, [n, l]]) => `<button data-f="${k}" class="${stuFilter === k ? 'on' : ''}">${esc(n)} (${l.length})</button>`).join('');
  $$('#stuFilters [data-f]').forEach(b => b.onclick = () => { stuFilter = b.dataset.f; stuSig = ''; stuRender(); });
  const shown = F[stuFilter][1];
  $('#stuEps').innerHTML = shown.length ? shown.map(e => {
    const qc = e.qc ? `<details><summary>${esc(I18N.t('studio.ep.qcTitle'))}</summary><ul>` + e.qc.checks.map(k => `<li class="${k.ok ? 'ok' : k.required ? 'bad' : 'opt'}">${k.ok ? '✔' : k.required ? '✘' : '!'} ${esc(k.name)} — ${esc(k.detail)}</li>`).join('') +
      e.qc.notChecked.map(n => `<li class="opt">? ${esc(I18N.t('studio.ep.notChecked', { name: n }))}</li>`).join('') + '</ul></details>' : '';
    const sc = e.scenes.length ? e.scenes.map(s => `<span class="chip ${s.status}" title="${esc(s.error || s.account)}">${esc(I18N.t('studio.ep.sceneChip', { n: s.idx + 1, st: I18N.t('studio.scSt.' + s.status) }))}</span>${s.status !== 'running' && ['rendering', 'done', 'review', 'error'].includes(e.status) ? `<button data-rg="${e.id}" data-i="${s.idx}" title="${esc(I18N.t('studio.ep.regenSceneTitle', { n: s.idx + 1 }))}" style="padding:0 6px;margin-left:2px">↻</button>` : ''}`).join(' ') : '';
    return `<div class="ep${e.posted ? ' posted' : ''}"><div class="meta"><h4 class="grow">${esc(e.title || e.request)}</h4><small>${esc(e.channelName)} · ${fmtT(e.createdAt)}</small>${e.posted ? `<span class="chip done">${esc(I18N.t('studio.ep.postedBadge'))}</span>` : ''}<span class="chip ${stuChip(e.status)}">${esc(STU_ST[e.status])}</span></div>
      <small>${esc(e.request)}</small><div style="margin-top:4px">${sc}</div>
      ${e.error ? `<div class="warn" style="color:#ff8a8d">${esc(I18N.t('common.errorPrefix', { msg: e.error }))}</div>` : ''}${e.warnings.map(w => `<div class="warn">⚠ ${esc(w)}</div>`).join('')}${qc}
      ${e.report ? `<div><small>${esc(e.report)}</small></div>` : ''}
      ${e.video ? `<details><summary>${esc(I18N.t('studio.ep.watchVideo'))}</summary><video data-eid="${e.id}" controls preload="none" src="${fileUrl(e.video)}"></video></details>` : ''}
      <details><summary>${esc(I18N.t('studio.ep.logTitle'))}</summary><pre>${esc(e.log.map(l => `${fmtT(l.t)} [${l.step}] ${l.msg}`).join('\n'))}</pre></details>
      <div class="act" style="margin-top:6px">${e.video ? `<button data-c="${e.id}">${esc(I18N.t('studio.ep.copyPost'))}</button><button data-p="${e.id}" data-v="${e.posted ? 0 : 1}" class="${e.posted ? '' : 'primary'}">${esc(e.posted ? I18N.t('studio.ep.unmarkPosted') : I18N.t('studio.ep.markPosted'))}</button>` : ''}${e.dir ? `<button data-o="${e.id}">${esc(I18N.t('common.openDir'))}</button>` : ''}${e.status === 'error' ? `<button data-r="${e.id}" class="primary">${esc(I18N.t('common.retry'))}</button>` : ''}<button data-d="${e.id}" class="dangero">${esc(I18N.t('common.delete'))}</button></div></div>`;
  }).join('') : `<div class="hint">${esc(stuFilter === 'ready' ? I18N.t('studio.ep.emptyReady') : I18N.t('studio.ep.emptyOther'))}</div>`;
  $$('#stuEps [data-c]').forEach(b => b.onclick = async () => { await call('studio:copy', b.dataset.c); toast(I18N.t('studio.toast.copiedPost')); });
  $$('#stuEps [data-p]').forEach(b => b.onclick = () => call('studio:posted', b.dataset.p, b.dataset.v === '1'));
  $$('#stuEps [data-o]').forEach(b => b.onclick = () => call('studio:open', b.dataset.o));
  $$('#stuEps [data-rg]').forEach(b => b.onclick = async () => { const n = +b.dataset.i; if (!confirm(I18N.t('studio.confirm.regenScene', { n: n + 1 }))) return; try { await releaseStudioMedia(b.dataset.rg); await call('studio:regen', b.dataset.rg, n); } catch (_) {} });
  $$('#stuEps [data-r]').forEach(b => b.onclick = async () => { await releaseStudioMedia(b.dataset.r); await call('studio:retry', b.dataset.r); });
  $$('#stuEps [data-d]').forEach(b => b.onclick = () => confirm(I18N.t('studio.confirm.delEp')) && call('studio:delete', b.dataset.d));
}
async function stuRefresh() { if (stuBusy) return; stuBusy = true; try { STU = await call('studio:state'); stuRender(); if (!$('#stuChName').value && !stuEdit) stuRenderChars([]); } finally { stuBusy = false; } }

$('#stuCh0').onchange = () => { $('#stuCh').value = $('#stuCh0').value; $('#stuCh').onchange(); };
const stuBtn = (id, fn) => $(id).onclick = async () => { $(id).disabled = true; try { await fn(); await stuRefresh(); } finally { $(id).disabled = false; } };
stuBtn('#stuContinue', async () => { const r = await call('studio:today', $('#stuCh').value); toast(r.created || r.retried ? I18N.t('studio.toast.todayStarted', { created: r.created, retried: r.retried }) : I18N.t('studio.toast.todayMet')); });
stuBtn('#stuMore', async () => { const r = await call('studio:batch', { channelId: $('#stuCh').value, count: $('#stuCount').value }); toast(I18N.t('studio.toast.batchStarted', { created: r.created })); });
stuBtn('#stuFromIdeas', async () => { const r = await call('studio:batch', { channelId: $('#stuCh').value, requests: $('#stuIdeas').value }); $('#stuIdeas').value = ''; toast(I18N.t('studio.toast.ideasStarted', { created: r.created, skipped: r.skipped ? I18N.t('studio.toast.ideasSkipped', { n: r.skipped }) : '' })); });
$('#stuNewCh').onclick = () => stuFillForm(null);
$('#stuCh').onchange = () => { const c = STU.channels.find(x => x.id === $('#stuCh').value); if (c) stuFillForm(c); stuSig = ''; stuRender(); };
$('#chMusic').onclick = async () => { stuMusic = await call('pick:audio'); $('#chMusicName').textContent = stuMusic.split(/[\\/]/).pop(); };
$('#stuChSave').onclick = async () => {
  const btn = $('#stuChSave');
  if (!$('#stuChName').value.trim()) { toast(I18N.t('studio.toast.needChName'), true); $('#stuChName').focus(); return; }
  btn.disabled = true;
  try {
    const c = await call('studio:channel:save', { id: stuEdit, name: $('#stuChName').value, style: $('#chStyle').value, ratio: $('#chRatio').value, duration: $('#chDur').value, lang: $('#chLang').value,
      voiceMode: $('#chVoice').value, ttsVoice: $('#chTts').value, voiceMap: $('#chMap').value, avoid: $('#chAvoid').value, subtitles: $('#chSub').checked, continuity: $('#chCont').checked,
      dailyTarget: $('#chDaily').value, ideaSeeds: $('#chSeeds').value, music: stuMusic, characterIds: $$('#chChars input:checked').map(i => i.value) });
    stuEdit = c.id; stuBusy = false; await stuRefresh(); $('#stuCh').value = c.id; stuFillForm(STU.channels.find(x => x.id === c.id) || c); stuSig = ''; stuRender(); toast(I18N.t('studio.toast.chSaved', { name: c.name }));
  } catch (e) { console.error('Lưu kênh lỗi', e); }
  finally { btn.disabled = false; }
};
$('#chDel').onclick = async () => { if (stuEdit && confirm(I18N.t('studio.confirm.delCh'))) { await call('studio:channel:delete', stuEdit); stuFillForm(null); stuSig = ''; await stuRefresh(); } };
$('#stuGo').onclick = async () => {
  $('#stuGo').disabled = true;
  try { await call('studio:create', { channelId: $('#stuCh').value, request: $('#stuReq').value }); $('#stuReq').value = ''; toast(I18N.t('studio.toast.epStarted')); await stuRefresh(); }
  finally { $('#stuGo').disabled = false; }
};
window.I18N?.onChange?.(() => {
  stuSig = '';
  stuRender();
  if (!stuEdit) stuFillForm(null);
  else {
    const ch = STU.channels.find(x => x.id === stuEdit);
    if (ch) stuFillForm(ch);
  }
});
api.onState(() => { if ($('#v-studio').classList.contains('on')) stuRefresh(); });
window.addEventListener('viewchange', e => { if (e.detail === 'studio') stuRefresh(); });
stuFillForm(null); stuRefresh();
