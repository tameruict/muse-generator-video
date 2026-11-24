// Xác định NHÂN VẬT NÀO xuất hiện trong TỪNG cảnh (để chỉ gửi đúng ảnh + mô tả của họ cho cảnh đó).
// Thứ tự ưu tiên:
//   1. Thẻ ghi tay/AI ghi ở đầu dòng:  [Bắp, Mẹ] Bắp chạy vào bếp...   ([-] hoặc [none] = cảnh không có nhân vật nào)
//   2. Tên nhân vật xuất hiện trong chữ của cảnh (không phân biệt hoa/thường và dấu)
//   3. Không thấy tên nào: dùng nhân vật của cảnh trước (hoặc tất cả nếu là cảnh đầu); chỉ 1 nhân vật thì dùng luôn nhân vật đó
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NONE = new Set(['-', 'none', 'no one', 'nobody', 'khong', 'khong ai', 'empty', '无', '无人', '没有', '空']);

function parseTag(text) {
  const m = String(text || '').match(/^\s*\[([^\]\n]{1,200})\]\s*/);
  if (!m) return { names: null, text: String(text || '').trim() };
  // "và" có dấu không nhận được bằng \b của JS -> dùng khoảng trắng làm ranh giới; trước đây "[Bắp và Mẹ]" không tách được và bị coi là TẤT CẢ nhân vật
  const names = m[1].split(/\s*(?:,|;|\/|&|\+|、|，)\s*|\s+(?:và|va|and|和|与)\s+/i).map(x => x.trim()).filter(Boolean);
  return { names, text: String(text).slice(m[0].length).trim() };
}

function byName(names, chars) {
  const want = names.map(fold), ids = [];
  for (const c of chars) if (want.includes(fold(c.name)) && !ids.includes(c.id)) ids.push(c.id);
  return ids;
}

// Tên phải đứng riêng như một từ. Nếu tên trùng từ thường (vd "Bắp" và "bắp cải") hãy dùng thẻ [..] để chắc chắn.
// Ưu tiên khớp CÓ DẤU (Mẹ ≠ me, Bắp ≠ bap); chỉ khi tên đủ dài (>=4 ký tự sau khi bỏ dấu) mới cho khớp không dấu,
// để tên ngắn như "Mẹ", "Ba", "Lan" không bị nhận nhầm vào từ tiếng Anh ("me", "ba"...) -> sai ảnh nhân vật trong cảnh.
const lower = s => String(s || '').normalize('NFC').toLowerCase();
function detect(text, chars) {
  const u = lower(text), f = fold(text), ids = [];
  for (const c of chars) {
    const raw = lower(c.name).trim(); if (!raw) continue;
    const isCjk = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(raw);
    let hit = isCjk ? u.includes(raw) : new RegExp('(^|[^\\p{L}\\p{N}])' + esc(raw) + '($|[^\\p{L}\\p{N}])', 'u').test(u);
    if (!hit) { const n = fold(c.name).trim(); hit = n.length >= 4 && new RegExp('(^|[^a-z0-9])' + esc(n) + '($|[^a-z0-9])').test(f); }
    if (hit) ids.push(c.id);
  }
  return ids;
}

// resolve(dòng kịch bản, danh sách nhân vật đã chọn, cast cảnh trước) -> { text, cast: [id], source }
function resolve(raw, chars, prevCast) {
  const { names, text } = parseTag(raw);
  if (!chars.length) return { text, cast: [], source: 'none' };
  if (names) {
    if (names.length && names.every(n => NONE.has(fold(n)))) return { text, cast: [], source: 'tag' };
    const ids = byName(names, chars);
    if (ids.length) return { text, cast: ids, source: 'tag' };
  }
  const found = detect(text, chars);
  if (found.length) return { text, cast: found, source: 'name' };
  if (chars.length === 1) return { text, cast: [chars[0].id], source: 'single' };
  if (prevCast && prevCast.length) return { text, cast: prevCast.slice(), source: 'carry' };
  return { text, cast: chars.map(c => c.id), source: 'all' };
}

module.exports = { fold, parseTag, detect, resolve };
