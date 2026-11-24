// Lập kế hoạch tập: kịch bản, phân cảnh, prompt. Thuần hàm + lời gọi chat văn bản tới Muse (hàm ask do Engine cấp, không cần khoá Meta).
const cast = require('./cast');
const { langName } = require('./lang');
const { t } = require('./i18n');
const SEC = 10, MAX_SCENES = 6; // mỗi clip Muse ~10 giây; app ghép tối đa 60 giây
const AVOID = 'face distortion, extra limbs or fingers, outfit color changes, characters that were not requested, on-screen text, watermark';

const sceneCount = duration => Math.min(MAX_SCENES, Math.max(1, Math.round((+duration || 30) / SEC)));

function extractJson(text, uiLang) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error(t(uiLang, 'studioPlan.badJson'));
  try { return JSON.parse(text.slice(a, b + 1)); } catch (_) { throw new Error(t(uiLang, 'studioPlan.badJson')); }
}

function normalizePlan(raw, n, speakers, uiLang) {
  const warnings = [];
  if (!raw || !Array.isArray(raw.scenes) || raw.scenes.length < n) throw new Error(t(uiLang, 'studioPlan.tooFewScenes', { got: raw?.scenes?.length || 0, want: n }));
  const known = new Set(speakers.map(s => s.toLowerCase()));
  const scenes = raw.scenes.slice(0, n).map((s, i) => {
    const visual = String(s.visual || '').replace(/\s+/g, ' ').trim();
    if (!visual) throw new Error(t(uiLang, 'studioPlan.missingVisual', { idx: i + 1 }));
    const dialogue = (Array.isArray(s.dialogue) ? s.dialogue : []).map(d => ({
      speaker: String(d.speaker || '').trim(), line: String(d.line || '').replace(/\s+/g, ' ').trim(), emotion: String(d.emotion || '').trim()
    })).filter(d => d.line);
    for (const d of dialogue) if (known.size && !known.has(d.speaker.toLowerCase())) warnings.push(t(uiLang, 'studioPlan.unknownSpeaker', { idx: i + 1, speaker: d.speaker }));
    return { idx: i, visual, camera: String(s.camera || '').trim(), setting: String(s.setting || '').trim(),
      continues: i === 0 ? '' : String(s.continues || '').replace(/\s+/g, ' ').trim(), dialogue, seconds: SEC };
  });
  const tags = (Array.isArray(raw.hashtags) ? raw.hashtags : []).map(t => '#' + String(t).replace(/^#/, '').replace(/\s+/g, '')).filter(t => t.length > 1);
  return { plan: { title: String(raw.title || '').trim() || t(uiLang, 'studioPlan.defaultTitle'), summary: String(raw.summary || '').trim(), hook: String(raw.hook || '').trim(),
    description: String(raw.description || raw.summary || '').trim(), hashtags: tags, scenes }, warnings };
}

async function planWithLLM({ ask, request, channel, chars, prev, n, uiLang }) {
  const speakers = chars.map(c => c.name);
  const outLang = langName(channel.lang) || 'Vietnamese';
  const sys = 'You are the head writer and director of a recurring AI short-video channel. Reply with ONLY one JSON object, no markdown. Schema: ' +
    '{"title":string,"summary":string,"hook":string,"description":string,"hashtags":string[],"scenes":[{"visual":string,"camera":string,"setting":string,"continues":string,"dialogue":[{"speaker":string,"line":string,"emotion":string}]}]}. ' +
    `Rules: exactly ${n} scenes of about ${SEC} seconds each, forming ONE continuous story with a strong hook in scene 1. ` +
    `"title", "summary", "hook", "description", "hashtags", and all spoken "dialogue" lines MUST be written in ${outLang}. ` +
    '"visual", "camera", "setting", and "continues" MUST be written in English. ' +
    '"visual" is a vivid self-contained ENGLISH prompt for ONE shot: setting, each character\'s position and action, outfit appropriate to the setting, lighting. Put NO spoken lines in "visual". Refer to every character in "visual" by exactly their given name, and only name the characters who are actually in that shot. ' +
    '"continues" explains how the action continues from the previous scene (empty for scene 1). ' +
    `Dialogue lines are in ${outLang}, at most about 25 words per scene in total so they fit ${SEC} seconds; speakers must be exactly one of: ${speakers.join(', ') || '(no characters: no dialogue)'}. ` +
    'Never invent new characters and never change the locked appearance of the given characters. Do not repeat the plots of the previous episodes. ' +
    'SAFETY (the video generator refuses otherwise): never use the name of any real person, historical or living, in a shot; describe them by role, age and clothing instead (e.g. \'a French general in a 1950s dress uniform\'). Never depict capture, arrest, violence, injuries or weapons aimed at anyone; convey conflict only by implication (tense silence, raised hands, a door opening, a flag lowered, reactions). ';
  const user = `Request: ${request}\nChannel: ${channel.name}\nVisual style: ${channel.style || '(none)'}\nScenes: ${n}\n` +
    `Characters (locked identity):\n${chars.map(c => `- ${c.name}: ${c.desc}`).join('\n') || '(none)'}\n` +
    `Previous episodes (avoid repeating):\n${prev.map(p => `- ${p.title}: ${p.summary}`).join('\n') || '(none)'}`;
  return normalizePlan(extractJson(await ask(sys + '\n\n' + user), uiLang), n, speakers, uiLang);
}

const BEATS = ['Opening hook: the central situation of the request appears right away, striking and clear.',
  'The situation develops; the characters react and the action builds.',
  'A complication or funny/emotional turn happens.', 'The tension or emotion reaches its peak.',
  'The situation resolves with a clear payoff.', 'Closing beat: warm ending, everyone in frame, clean last shot.'];

// Nghĩ ý tưởng hàng loạt cho cả ngày: mỗi ý tưởng là 1 yêu cầu ngắn cho 1 tập.
async function genIdeas({ ask, channel, chars, past, count, uiLang }) {
  const outLang = langName(channel.lang) || 'Vietnamese';
  const sys = `You are the content planner of a recurring AI short-video fanpage. Reply with ONLY a JSON array of exactly ${count} strings. Each string is ONE short episode request (one sentence, written in ${outLang}) for a self-contained ~${channel.duration || 30}s episode starring the given characters. ` +
    'Ideas must be clearly different from each other and from the past episodes (different situation, location, emotion), family-friendly, and filmable with the characters and style given. Never add new main characters.';
  const user = `Channel: ${channel.name}\nVisual style: ${channel.style || '(none)'}\nContent directions / themes: ${channel.ideaSeeds || '(free)'}\n` +
    `Characters:\n${chars.map(c => `- ${c.name}: ${c.desc}`).join('\n') || '(none)'}\nPast episodes (do not repeat):\n${past.map(p => `- ${p}`).join('\n') || '(none)'}\nIdeas needed: ${count}`;
  const out = await ask(sys + '\n\n' + user), m = out.match(/\[[\s\S]*\]/);
  if (!m) throw new Error(t(uiLang, 'studioPlan.noIdeasList'));
  let parsed; try { parsed = JSON.parse(m[0]); } catch (_) { throw new Error(t(uiLang, 'studioPlan.badIdeasList')); }
  const arr = [...new Set(parsed.map(x => String(x).replace(/\s+/g, ' ').trim()).filter(Boolean))];
  if (arr.length < count) throw new Error(t(uiLang, 'studioPlan.tooFewIdeas', { got: arr.length, want: count }));
  return arr.slice(0, count);
}

// Không có tài khoản Muse khả dụng: khung mẫu bám yêu cầu, KHÔNG phải kịch bản do AI viết.
function fallbackPlan(request, channel, n, uiLang) {
  const scenes = Array.from({ length: n }, (_, i) => ({
    idx: i, visual: `${request}. ${BEATS[Math.min(i, BEATS.length - 1)]}`, camera: i === 0 ? 'slow push-in' : 'smooth cinematic movement', setting: '',
    continues: i === 0 ? '' : 'continue the same action and location from the previous shot', dialogue: [], seconds: SEC }));
  const rawTag = String(channel.name || 'video').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '');
  const tag = '#' + (rawTag || String(channel.name || '').replace(/[^\p{L}\p{N}_]/gu, '') || 'video');
  return { plan: { title: String(request).slice(0, 60), summary: request, hook: '', description: request, hashtags: [tag], scenes },
    warnings: [t(uiLang, 'studioPlan.fallbackWarn')] };
}

// Một dòng prompt cho engine (engine tự thêm ảnh tham chiếu, nhân vật, phong cách, tỷ lệ).
function sceneLine(scene, { voiceMode, lang, chars = [] }) {
  let t = scene.visual;
  // Thẻ [Tên...] = ai có mặt trong cảnh: người nói + tên xuất hiện trong mô tả (engine dùng thẻ này để chỉ gửi đúng ảnh nhân vật)
  const ids = new Set([...cast.detect(scene.visual, chars), ...scene.dialogue.map(d => (chars.find(c => cast.fold(c.name) === cast.fold(d.speaker)) || {}).id).filter(Boolean)]);
  const tag = chars.filter(c => ids.has(c.id)).map(c => c.name);
  if (scene.setting) t += ` Setting: ${scene.setting}.`;
  if (scene.camera) t += ` Camera: ${scene.camera}.`;
  if (scene.continues) t += ` Continuity: ${scene.continues}.`;
  if (voiceMode === 'muse' && scene.dialogue.length) {
    const outLang = langName(lang) || 'Vietnamese';
    t += ` Spoken dialogue (${outLang}): ` + scene.dialogue.map(d => `${d.speaker}${d.emotion ? ` (${d.emotion})` : ''}: "${d.line}"`).join(' ');
  }
  t = t.replace(/\s*[\r\n]+\s*/g, ' ').trim();
  return tag.length ? `[${tag.join(', ')}] ${t}` : t;
}

const pad = (n, w) => String(n).padStart(w, '0');
const srtTime = s => { const ms = Math.round(s * 1000); return `${pad(Math.floor(ms / 3600000), 2)}:${pad(Math.floor(ms / 60000) % 60, 2)}:${pad(Math.floor(ms / 1000) % 60, 2)},${pad(ms % 1000, 3)}`; };
function buildSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
}
module.exports = { genIdeas, SEC, MAX_SCENES, AVOID, sceneCount, normalizePlan, planWithLLM, fallbackPlan, sceneLine, buildSrt, srtTime };
