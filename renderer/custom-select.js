// Ô chọn có thêm mục "Khác (tự nhập)": thêm thuộc tính data-custom vào <select> là xong.
// selVal(id)  -> giá trị đang chọn hoặc chữ tự nhập · selDur(id) -> thời lượng (giây, hoặc 'auto'); chấp nhận "90", "90s", "1:30", "2 phút", "1 phút 30"
(() => {
  const OTHER = '__other__';
  const t = (k, v) => (window.I18N ? window.I18N.t(k, v) : k);
  function syncSelect(sel) {
    const o = sel.querySelector(`option[value="${OTHER}"]`);
    if (o) o.textContent = t('customSelect.otherOption');
    const inp = document.getElementById(sel.id + 'Custom');
    if (inp) {
      inp.placeholder = sel.dataset.i18nPh ? t(sel.dataset.i18nPh) : (sel.dataset.ph || t('customSelect.defaultPh'));
    }
  }
  function enhance(sel) {
    if (sel.dataset.enh) return; sel.dataset.enh = '1';
    const o = document.createElement('option'); o.value = OTHER; o.textContent = t('customSelect.otherOption'); sel.appendChild(o);
    const inp = document.createElement('input'); inp.type = 'text'; inp.id = sel.id + 'Custom'; inp.className = 'customIn'; inp.hidden = true;
    inp.placeholder = sel.dataset.i18nPh ? t(sel.dataset.i18nPh) : (sel.dataset.ph || t('customSelect.defaultPh'));
    sel.after(inp);
    sel.addEventListener('change', () => { inp.hidden = sel.value !== OTHER; if (!inp.hidden) inp.focus(); });
  }
  const parseSec = t => {
    t = String(t || '').trim().toLowerCase();
    const c = t.match(/^(\d+):(\d{1,2})$/); if (c) return +c[1] * 60 + +c[2];
    const mm = t.match(/(\d+(?:[.,]\d+)?)\s*(?:phút|phut|min|m|p|分钟|分)(?![a-z])/), ss = t.match(/(\d+)\s*(?:giây|giay|sec|s|秒)(?![a-z])/);
    if (mm || ss) return Math.round((mm ? parseFloat(mm[1].replace(',', '.')) * 60 : 0) + (ss ? +ss[1] : 0));
    const n = parseFloat(t.replace(',', '.')); return n > 0 ? Math.round(n) : 0;
  };
  window.selVal = id => { const s = document.getElementById(id); if (!s) return ''; if (s.value !== OTHER) return s.value; return (document.getElementById(id + 'Custom').value || '').trim(); };
  window.selDur = id => { const s = document.getElementById(id); if (!s) return ''; if (s.value !== OTHER) return s.value; const n = parseSec(document.getElementById(id + 'Custom').value); return n > 0 ? String(n) : ''; };
  document.querySelectorAll('select[data-custom]').forEach(enhance);
  window.I18N?.onChange?.(() => document.querySelectorAll('select[data-custom]').forEach(syncSelect));
})();
