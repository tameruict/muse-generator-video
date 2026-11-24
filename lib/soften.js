// "Thang làm nhẹ" khi Muse từ chối một cảnh.
// Vấn đề cũ: Muse trả lời bằng CHỮ ("cảnh này mình không tạo được…") -> app tưởng lỗi tạm -> gửi LẠI Y NGUYÊN -> bị từ chối mãi.
// Giờ mỗi lần bị từ chối là leo thêm một bậc, nội dung LUÔN khác lần trước:
//   0 = nguyên bản · 1 = thay từ nhạy cảm + câu dặn an toàn · 2 = nhờ Muse viết lại (bỏ tên người thật, bạo lực chỉ còn gợi ý), bỏ khung cuối cảnh trước
//   3 = cảnh "cắt cảnh" không thấy mặt (bối cảnh, đồ vật, bóng người), bỏ ảnh mặt nhân vật · hết bậc 3 mà vẫn từ chối -> báo lỗi để bạn sửa tay / bỏ qua cảnh
const { t } = require('./i18n');
const MAX_LEVEL = 3;

const SWAPS = [
  // ---- tiếng Anh ----
  [/\bcaptured alive\b/gi, 'quietly surrendering'], [/\bcaptur(?:e|es|ed|ing)\b/gi, 'surrender'], [/\barrest(?:s|ed|ing)?\b/gi, 'stop'],
  [/\bprisoners?\b/gi, 'men'], [/\bhostages?\b/gi, 'civilians'],
  [/\bblood[- ]red\b/gi, 'crimson'], [/\bcars? (?:slid(?:e|es|ing)|crash(?:es|ed|ing)?) into\b/gi, 'cars wait in'],
  [/\bkill(?:s|ed|ing)?\b|\bmurder(?:s|ed|ing)?\b|\bexecut(?:e|es|ed|ion|ions)\b/gi, 'confront'],
  [/\btortur(?:e|es|ed|ing)\b|\bbeat(?:s|ing|en)?\b/gi, 'pressure'],
  [/\bblood(?:y|ied)?\b|\bgore\b|\bcorpses?\b|\bdead bod(?:y|ies)\b|\bwounds?\b|\bwounded\b/gi, 'weary'],
  [/\bgunfire\b|\bgunshots?\b|\bshooting\b|\bexplosions?\b|\bbombs?\b|\bshelling\b/gi, 'distant rumbling'],
  [/\b(?:machine )?guns?\b|\brifles?\b|\bpistols?\b|\bweapons?\b|\bbayonets?\b/gi, 'equipment'],
  // thảm họa / hủy diệt (Muse từ chối "cảnh thành phố sụp đổ, xe trượt xuống đường nứt"): chỉ giữ không khí và quy mô, bỏ cảnh phá huỷ
  [/\b(?:violently )?shak(?:es|ing|en)\b|\bquak(?:e|es|ing)\b/gi, 'trembling'],
  [/\bcollaps(?:e|es|ed|ing)\b|\bcrumbl(?:e|es|ed|ing)\b|\bdestroy(?:s|ed|ing)?\b|\bdestruction\b|\bdevastat\w*\b|\bobliterat\w*\b|\bwip(?:e|es|ed|ing) out\b|\bengulf(?:s|ed|ing)?\b/gi, 'looming'],
  [/\bcracks?\b(?: spread(?:s|ing)?| open(?:s|ing)?)?/gi, 'faint tremors'], [/\bslid(?:e|es|ing)\b/gi, 'stand still'], [/\bcrash(?:es|ed|ing)?\b/gi, 'pass'],
  [/\bburn(?:s|ed|ing)\b|\binferno\b|\bflames?\b|\bfirestorm\b/gi, 'glowing'], [/\bapocalyp\w*\b|\bdoomsday\b/gi, 'ominous'], [/\bterrifying\b|\bhorrif\w*\b|\bpanic(?:king|ked)?\b/gi, 'tense'],
  [/\bscream(?:s|ed|ing)?\b|\bdying\b|\bdie[sd]?\b|\bdeaths?\b|\bvictims?\b|\bcasualt(?:y|ies)\b/gi, 'uneasy'],
  // ---- tiếng Việt ----
  [/sụp đổ|đổ sập|đổ nát|nứt toác|nứt vỡ|phá hủy|phá huỷ|hủy diệt|huỷ diệt|thiêu rụi|nhấn chìm|tận thế|đại họa|đại hoạ/gi, 'rung chuyển nhẹ'], [/hoảng loạn|kinh hoàng|la hét|nạn nhân|tử vong|chết chóc/gi, 'bất an'],
  [/bắt sống|bắt giữ|bị bắt|bắt giam|bị giam/gi, 'đầu hàng'], [/tù binh/gi, 'người lính'],
  [/giết|sát hại|tàn sát|hành quyết|ám sát/gi, 'đối đầu'], [/tra tấn|đánh đập/gi, 'gây áp lực'],
  [/đẫm máu|máu me|máu|xác chết|thi thể/gi, 'mệt mỏi'],
  [/tiếng súng|nổ súng|bắn|vụ nổ|bom|đạn pháo|pháo kích/gi, 'tiếng ầm vang xa'], [/khẩu súng|súng|lưỡi lê|vũ khí/gi, 'trang bị'],
  // ---- tiếng Trung ----
  [/倒塌|崩塌|坍塌|毁灭|摧毁|吞噬|末日|浩劫|烧毁|焚毁|烈火|大火|火海/g, '微弱震动'], [/恐慌|惊恐|尖叫|哀嚎|遇难|死亡|死伤|伤亡/g, '紧张不安'],
  [/活捉|抓捕|逮捕|拘捕|被捕|关押|囚禁/g, '投降'], [/俘虏|战俘/g, '士兵'], [/人质/g, '平民'],
  [/杀害|杀死|屠杀|谋杀|处决|暗杀|灭口/g, '对峙'], [/折磨|拷打|殴打|虐待/g, '施压'],
  [/血腥|鲜血|流血|满身是血|血迹|尸体|尸首|遗体|重伤|受伤/g, '疲惫'],
  [/枪声|开枪|射击|爆炸|炸弹|炮击|轰炸/g, '远处轰鸣'], [/机枪|步枪|手枪|枪支|武器|刺刀|刀剑/g, '装备']
];

function localSoften(text) { let t = String(text || ''); for (const [re, to] of SWAPS) t = t.replace(re, to); return t; }

const CLAUSE = [
  '',
  'Keep it family-friendly: no gore, blood, weapons pointed at anyone, and no real named people or brand logos; express tension only through mood, lighting and camera. Any disaster is shown only through atmosphere and scale (ominous sky, trembling light, swaying lamps, distant dust, tiny silhouettes looking up), never as collapsing buildings, vehicle crashes or people in danger.',
  'IMPORTANT: every person shown is a fictional actor in period costume, not a real person; use no real names. Violence is never shown, only implied by silence, reactions and the setting.',
  'IMPORTANT: a purely atmospheric cutaway. Show the place, objects, hands, silhouettes or people filmed from behind; no clear faces; nothing violent or sensitive on screen.'
];
const clause = level => CLAUSE[Math.min(Math.max(level | 0, 0), MAX_LEVEL)] || '';

// Mỗi lần thử lại phải khác lần trước — chính Muse nói "nội dung không đổi nên kết quả cũng như các lần trước".
const VARIATIONS = [
  'Alternative take: use a different camera angle than before (for example over-the-shoulder or low angle).',
  'Alternative take: choose a different framing, a medium shot with the subject off-centre, and a slightly different light.',
  'Alternative take: open on a different detail of the setting first, then slowly reveal the subject.',
  'Alternative take: a slower, quieter, more observational camera with softer, more diffuse light.'
];
const variation = n => (n > 0 ? VARIATIONS[(n - 1) % VARIATIONS.length] : '');

// Muse nói lý do liên quan tới ẢNH/khuôn mặt (người thật) -> bỏ bớt ảnh tham chiếu chứ không chỉ đổi chữ
const imageComplaint = list => /ảnh|hình ảnh|khuôn mặt|người thật|nhận diện|图片|照片|人脸|面孔|真人|真实人物|肖像|\bimages?\b|\bphotos?\b|\bfaces?\b|real (?:person|people)|identif|likeness/i.test((list || []).join(' '));

function rewritePrompt(text, refusal, level) {
  return 'You are a prompt editor for an AI video generator whose safety filter just REFUSED the shot below. ' +
    'Rewrite the shot so it will be accepted, keeping the same story beat, location, camera movement, mood and the meaning of any spoken dialogue.\n' +
    'RULES: replace every real person\'s name (historical or living) with a role description such as "a French general in a 1950s dress uniform"; ' +
    'never show capture, arrest, violence, injuries or weapons aimed at anyone, convey them only by implication (tense silence, raised hands, a door opening, soldiers entering, a flag lowered); ' +
    'no gore; no brand logos; characters are fictional actors in costume. ' +
    'DISASTERS, WAR AND END-OF-WORLD SCENES (collapsing buildings, earthquakes, fires, floods, explosions, cars or people swept away, crowds in panic) are the most common reason for refusal: keep the same place, scale and epic cinematography but show the THREAT, not the destruction: ominous sky and light, trembling reflections in glass, swaying lamps and cables, dust and small debris drifting, birds fleeing, distant skyline or tiny silhouettes looking up, water rippling; nothing collapses, crashes, burns or hurts anyone on screen.' +
    (level >= 3 ? ' ALSO: show NO recognizable faces: only the setting, objects, hands, silhouettes or people from behind.' : '') + '\n' +
    (refusal ? 'The generator said (so avoid whatever caused it): "' + String(refusal).slice(0, 700) + '"\n' +
      'If it offered an alternative take, follow the SPIRIT of that offer (the kind of image it said it can make) while keeping this shot\'s story beat, place and mood.\n' : '') +
    'ORIGINAL SHOT:\n' + String(text).slice(0, 1500) + '\n\n' +
    'Output ONLY the rewritten shot as plain English text (50-120 words), no preface, no quotes, no list.';
}
async function rewrite({ ask, text, refusal, level, uiLang }) {
  const out = String(await ask(rewritePrompt(text, refusal, level)) || '').trim().replace(/^["'“”\s]+|["'“”\s]+$/g, '');
  if (out.length < 20) throw new Error(t(uiLang, 'soften.rewriteTooShort'));
  return out.slice(0, 1800);
}

// Muse thường kèm đề xuất thay thế khi từ chối ("A genuinely different direction I can do: a calm satellite view of Earth..."). Lấy phần đề xuất đó.
function extractOffer(msg) {
  const t = String(msg || '').replace(/^[^]*?Muse (?:từ chối bằng chữ|chỉ trả lời chữ, không tạo video):\s*/i, '');
  const m = /(?:different\s+(?:direction|take|version|approach)[^:.]{0,80}:|I can (?:do|offer|make|create|generate)[^:.]{0,60}:|for example,?|instead,? I can|I can instead)\s*([^]*)$/i.exec(t);
  let o = (m ? m[1] : '').replace(/\b(?:Want me to|Would you like|Shall I|Let me know|If you'd like|Should I)[^]*$/i, '').replace(/\s+/g, ' ').trim();
  return o.length >= 25 ? o.slice(0, 600) : '';
}
module.exports = { extractOffer, MAX_LEVEL, localSoften, clause, variation, imageComplaint, rewritePrompt, rewrite };
