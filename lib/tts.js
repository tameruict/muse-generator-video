// Giọng đọc qua edge-tts (giọng thần kinh miễn phí của Microsoft Edge), chạy bằng Python trong bridge/.venv.
// Test có thể đặt MUSE_TTS_CMD (mảng JSON) để dùng lệnh giả: <cmd...> --voice V --text T --write-media FILE
const { execFile } = require('child_process');
const fs = require('fs'), path = require('path');
const { t } = require('./i18n');

const py = () => require('./bridge-dir').pythonExe(require('./bridge-dir')());
const exec = (cmd, args) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 1 << 24, windowsHide: true, env: { ...process.env, PYTHONUTF8: '1' } },
  (e, so, se) => e ? rej(new Error((String(se) || e.message).trim().slice(-400))) : res(so)));

const DEFAULT_VOICES = {
  vi: 'vi-VN-HoaiMyNeural',
  en: 'en-US-AriaNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  'zh-cn': 'zh-CN-XiaoxiaoNeural',
  'zh-hans': 'zh-CN-XiaoxiaoNeural',
  ja: 'ja-JP-NanamiNeural',
  ko: 'ko-KR-SunHiNeural',
  th: 'th-TH-PremwadeeNeural',
  fr: 'fr-FR-DeniseNeural',
  es: 'es-ES-ElviraNeural',
  de: 'de-DE-KatjaNeural',
  id: 'id-ID-GadisNeural'
};

let installed = false;
async function base(uiLang) {
  if (process.env.MUSE_TTS_CMD) return JSON.parse(process.env.MUSE_TTS_CMD);
  const p = py();
  if (!fs.existsSync(p)) throw new Error(t(uiLang, 'tts.noPython'));
  if (!installed) {
    try { await exec(p, ['-c', 'import edge_tts']); }
    catch (_) { await exec(p, ['-m', 'pip', 'install', '-q', 'edge-tts']); }
    installed = true;
  }
  return [p, '-m', 'edge_tts'];
}

async function synth(text, voice, outFile, uiLang) {
  const [cmd, ...pre] = await base(uiLang);
  await exec(cmd, [...pre, '--voice', voice, '--text', text, '--write-media', outFile]);
  if (!fs.existsSync(outFile) || fs.statSync(outFile).size < 100) throw new Error(t(uiLang, 'tts.noAudio'));
  return outFile;
}

// "Bắp=vi-VN-NamMinhNeural" mỗi dòng
function parseVoiceMap(text) {
  const m = {};
  for (const l of String(text || '').split(/\r?\n/)) { const i = l.indexOf('='); if (i > 0) m[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
  return m;
}
function voiceFor(speaker, ch) {
  const map = parseVoiceMap(ch.voiceMap);
  const langKey = String(ch.lang || '').trim().toLowerCase();
  return map[String(speaker || '').toLowerCase()] || ch.ttsVoice || DEFAULT_VOICES[langKey] || 'vi-VN-HoaiMyNeural';
}
module.exports = { synth, parseVoiceMap, voiceFor };
