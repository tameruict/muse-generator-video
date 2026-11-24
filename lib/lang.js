// Tên ngôn ngữ lời thoại: nhận mã có sẵn (vi, en, ja...) hoặc chữ người dùng tự nhập ("Tiếng Thái", "Japanese"...).
const NAMES = { vi: 'Vietnamese', en: 'English', ja: 'Japanese', ko: 'Korean', zh: 'Chinese (Mandarin)', th: 'Thai', fr: 'French', es: 'Spanish', de: 'German', id: 'Indonesian' };
const ALIASES = {
  'zh-cn': 'zh', 'zh-hans': 'zh', 'zh_cn': 'zh', 'zh-tw': 'zh', 'zh-hant': 'zh',
  chinese: 'zh', mandarin: 'zh', '中文': 'zh', '汉语': 'zh', '普通话': 'zh', 'tiếng trung': 'zh',
  vietnamese: 'vi', 'tiếng việt': 'vi',
  english: 'en', 'tiếng anh': 'en',
  japanese: 'ja', korean: 'ko', thai: 'th', french: 'fr', spanish: 'es', german: 'de', indonesian: 'id'
};
function langName(v) {
  v = String(v || '').trim();
  if (!v || v.toLowerCase() === 'none') return '';
  const low = v.toLowerCase();
  const code = ALIASES[low] || low;
  return NAMES[code] || v.slice(0, 60);
}
function isValidLang(v) {
  const low = String(v || '').trim().toLowerCase();
  if (!low || low === 'none') return false;
  return Boolean(NAMES[ALIASES[low] || low]);
}
module.exports = { langName, NAMES, isValidLang };
