// Tiện ích media cho Studio tự động (không sửa lib/ffmpeg.js cũ). ffmpeg-static không có ffprobe nên đọc thông tin bằng `ffmpeg -i`.
const { execFile } = require('child_process');
const ff = require('./ffmpeg');
const { t } = require('./i18n');

function probe(file) {
  return new Promise(resolve => {
    execFile(ff.bin, ['-hide_banner', '-i', file], { maxBuffer: 1 << 24, windowsHide: true }, (_e, _so, se) => {
      const s = String(se || '');
      const d = s.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
      const v = s.match(/Stream #[^\n]*Video:[^\n]*?(\d{2,5})x(\d{2,5})/);
      resolve({
        ok: !!(d && v), hasVideo: !!v, hasAudio: /Stream #[^\n]*Audio:/.test(s),
        duration: d ? (+d[1]) * 3600 + (+d[2]) * 60 + parseFloat(d[3]) : 0,
        width: v ? +v[1] : 0, height: v ? +v[2] : 0,
        // file chỉ có âm thanh (mp3 lời thoại) vẫn có Duration
        audioOnly: !!d && !v && /Audio:/.test(s)
      });
    });
  });
}

async function thumbnail(video, out, at) { await ff.run(['-ss', String(Math.max(0, at || 0)), '-i', video, '-frames:v', '1', '-q:v', '2', out]); return out; }

// Trộn các đoạn lời thoại (TTS) lên âm thanh gốc của video tại thời điểm chỉ định.
async function mixClips(video, clips, out, { hasAudio, duration, lang }) {
  const n = clips.length;
  if (!n) throw new Error(t(lang, 'media.noClips'));
  const build = normalize => {
    const args = ['-i', video];
    if (!hasAudio) args.push('-f', 'lavfi', '-t', String(Math.max(1, duration)), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    clips.forEach(c => args.push('-i', c.file));
    const base = hasAudio ? '0:a' : '1:a', first = hasAudio ? 1 : 2;
    let fc = `[${base}]aresample=44100,aformat=channel_layouts=stereo,volume=0.55[b];`;
    clips.forEach((c, i) => { const ms = Math.max(0, Math.round(c.start * 1000));
      fc += `[${first + i}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[t${i}];`; });
    fc += '[b]' + clips.map((_, i) => `[t${i}]`).join('') + `amix=inputs=${n + 1}:duration=first:dropout_transition=0` + (normalize ? ':normalize=0' : `,volume=${n + 1}`) + '[a]';
    return [...args, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', out];
  };
  try { await ff.run(build(true)); } catch (_) { await ff.run(build(false)); }
}

module.exports = { probe, thumbnail, mixClips };
