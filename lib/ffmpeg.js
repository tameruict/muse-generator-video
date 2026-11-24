const { execFile } = require('child_process');
const path = require('path'), fs = require('fs'), os = require('os');
let bin = require('ffmpeg-static');
if (bin) bin = bin.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);

const POOL = Math.max(1, Math.min(2, Math.floor((os.cpus().length || 2) / 4) || 1));
const FF_THREADS = String(POOL === 1 ? Math.max(1, Math.min(4, Math.floor((os.cpus().length || 4) / 2))) : 2);

let activeSlots = 0;
const slotQueue = [];
function withSlot(fn) {
  return new Promise((resolve, reject) => {
    const release = () => {
      activeSlots--;
      if (slotQueue.length) slotQueue.shift()();
    };
    const runTask = () => {
      activeSlots++;
      Promise.resolve().then(fn).then(
        val => { release(); resolve(val); },
        err => { release(); reject(err); }
      );
    };
    if (activeSlots < POOL) runTask();
    else slotQueue.push(runTask);
  });
}

function spawnFF(args) {
  return withSlot(() => new Promise(res => {
    const child = execFile(bin, args, { maxBuffer: 1 << 26, windowsHide: true },
      (e, so, se) => res({ e, so: String(so || ''), se: String(se || '') }));
    if (child && child.pid) {
      try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (_) {}
    }
  }));
}

async function run(args) {
  const { e, se } = await spawnFF(['-y', '-hide_banner', '-loglevel', 'error', ...args]);
  if (e) throw new Error((se || e.message).slice(-400));
}
// Khung cuối dùng làm "khung bắt đầu" của cảnh sau. Clip AI hay kết thúc bằng mờ dần/đen: nếu khung sát cuối quá tối thì lùi về khung sáng gần nhất
// (đưa khung đen cho Muse thì cảnh sau mất sạch bối cảnh).
async function frameY(img) {   // độ sáng trung bình của 1 ảnh tĩnh (stats() dùng fps=2 nên không dùng được cho ảnh 1 khung)
  const { so } = await exec(['-hide_banner', '-loglevel', 'error', '-i', img, '-vf', 'scale=160:-2,signalstats,metadata=mode=print:file=-', '-f', 'null', '-']);
  const m = /lavfi\.signalstats\.YAVG=([\d.]+)/.exec(so); return m ? +m[1] : null;
}
// Độ giống nhau (SSIM 0..1, ảnh xám 128px) giữa khung cuối cảnh trước và khung ĐẦU clip mới: thấp = Muse bỏ qua khung nối, nhảy sang bối cảnh khác
async function firstFrame(file, out) { await run(['-i', file, '-frames:v', '1', '-q:v', '2', out]); return out; }
async function ssim(a, b) {
  const { se } = await exec(['-hide_banner', '-i', a, '-i', b, '-filter_complex', '[0:v]scale=128:128,format=gray[x];[1:v]scale=128:128,format=gray[y];[x][y]ssim', '-f', 'null', '-']);
  const m = /SSIM[^\n]*All:([\d.]+)/.exec(se); return m ? +m[1] : null;
}
async function lastFrame(file, out) {
  let ok = false;
  for (const off of [0.12, 0.4, 0.8, 1.3]) {
    try { await run(['-sseof', '-' + off, '-i', file, '-frames:v', '1', '-q:v', '2', out]); } catch (e) { if (ok) break; continue; }
    ok = true;
    const y = await frameY(out);
    if (y === null || y > 28) break;
  }
  if (!ok) await run(['-sseof', '-0.12', '-i', file, '-frames:v', '1', '-q:v', '2', out]);
  return out;
}
// Ghép nhiều cảnh: chuẩn hoá TỪNG clip (cùng kích thước, 24fps, âm thanh AAC stereo; clip thiếu tiếng được chèn im lặng)
// rồi nối bằng concat demuxer (-c copy). Không dựng một đồ thị lọc khổng lồ cho 15+ đầu vào nên nhẹ RAM và
// một clip thiếu âm thanh không còn làm mất tiếng cả video.
async function normalize(file, out, [W, H]) {
  const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p`;
  const enc = ['-threads', FF_THREADS, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-shortest', '-movflags', '+faststart', out];
  try { await run(['-i', file, '-vf', vf, '-af', 'aresample=44100', '-map', '0:v:0', '-map', '0:a:0', ...enc]); }
  catch (_) { await run(['-i', file, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-vf', vf, '-map', '0:v:0', '-map', '1:a:0', ...enc]); }
}
// ---------- Ghép MƯỢT: cân màu/sáng + cân âm lượng + chuyển mờ ở điểm nối ----------
function exec(args) {
  return spawnFF(args);
}
async function info(file) {
  const { se } = await exec(['-hide_banner', '-i', file]);
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(se);
  return { dur: m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0, audio: /Stream #\d+:\d+.*Audio:/.test(se) };
}
// Đo độ sáng/màu trung bình của clip (lấy mẫu 2 khung/giây, thu nhỏ cho nhanh)
async function stats(file) {
  const { so } = await exec(['-hide_banner', '-loglevel', 'error', '-threads', FF_THREADS, '-i', file, '-an', '-vf', 'fps=2,scale=160:-2,signalstats,metadata=mode=print:file=-', '-f', 'null', '-']);
  const acc = { YAVG: [], UAVG: [], VAVG: [], SATAVG: [] };
  for (const line of so.split(/\r?\n/)) { const m = /lavfi\.signalstats\.(YAVG|UAVG|VAVG|SATAVG)=([\d.]+)/.exec(line); if (m) acc[m[1]].push(+m[2]); }
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  if (!acc.YAVG.length) return null;
  return { Y: avg(acc.YAVG), U: avg(acc.UAVG), V: avg(acc.VAVG), S: avg(acc.SATAVG) };
}
// Chạy song song có giới hạn (video dài 60 clip: chuẩn hoá từng clip lần lượt mất rất lâu)
async function pmap(items, fn, limit = POOL) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { for (;;) { const i = next++; if (i >= items.length) return; out[i] = await fn(items[i], i); } }));
  return out;
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const median = a => { const b = [...a].sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
// Kéo từng clip về MỨC TRUNG VỊ của cả video, giới hạn nhẹ để vẫn giữ khác biệt có chủ đích (ngày/đêm) mà bỏ lệch vô tình
function computeGrades(st) {
  const ok = st.filter(Boolean); if (ok.length < 2) return st.map(() => null);
  const t = { Y: median(ok.map(x => x.Y)), U: median(ok.map(x => x.U)), V: median(ok.map(x => x.V)), S: median(ok.map(x => x.S)) };
  return st.map(x => {
    if (!x) return null;
    const f = x.Y - 16 > 12 ? clamp((t.Y - 16) / (x.Y - 16), 0.86, 1.16) : 1;
    const sat = x.S > 4 ? clamp(t.S / x.S, 0.8, 1.25) : 1;
    const du = clamp(t.U - (128 + (x.U - 128) * sat), -5, 5), dv = clamp(t.V - (128 + (x.V - 128) * sat), -5, 5);
    return { f, sat, du, dv };
  });
}
const gradeVf = g => !g ? '' : `,lutyuv=y='clip(16+(val-16)*${g.f.toFixed(4)},16,235)':u='clip(128+(val-128)*${g.sat.toFixed(4)}+${g.du.toFixed(3)},16,240)':v='clip(128+(val-128)*${g.sat.toFixed(4)}+${g.dv.toFixed(3)},16,240)',format=yuv420p`;
async function normalizeSmooth(file, out, [W, H], { grade, loud, hq }) {
  const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p${gradeVf(grade)}`;
  const af = 'aresample=44100' + (loud ? ',loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100' : '');
  const enc = ['-threads', FF_THREADS, '-c:v', 'libx264', '-preset', hq ? 'ultrafast' : 'veryfast', '-crf', hq ? '17' : '20', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-shortest', '-movflags', '+faststart', out];
  try { await run(['-i', file, '-vf', vf, '-af', af, '-map', '0:v:0', '-map', '0:a:0', ...enc]); }
  catch (_) { await run(['-i', file, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-vf', vf, '-map', '0:v:0', '-map', '1:a:0', ...enc]); }
}
const ENC_FINAL = ['-threads', FF_THREADS, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '24', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart'];
async function concatSmooth(files, out, size, opt) {
  out = path.resolve(out); files = files.map(f => path.resolve(f));   // đường dẫn tương đối làm list.txt của concat trỏ sai
  const fade = clamp(+opt.fade || 0, 0, 1.5), n = files.length, wd = path.join(path.dirname(out), '_join'), made = [];
  fs.mkdirSync(wd, { recursive: true });
  const P = nm => { const f = path.join(wd, nm); made.push(f); return f; };
  try {
    let grades = files.map(() => null);
    if (opt.match && n > 1) grades = computeGrades(await pmap(files, f => stats(f).catch(() => null)));
    const norm = files.map((_, i) => P(`n${i}.mp4`)), len = await pmap(files, async (f, i) => {
      await normalizeSmooth(f, norm[i], size, { grade: grades[i], loud: opt.loud !== false, hq: fade > 0 && n > 1 }); return (await info(norm[i])).dur;
    });
    // thời lượng chồng lên nhau ở mỗi điểm nối (ngắn hơn 45% clip ngắn nhất để không ăn mất cảnh)
    const d = []; for (let i = 0; i < n - 1; i++) { const fi = fade > 0 && opt.cuts && opt.cuts[i] ? Math.min(1.5, Math.max(fade, 0.9)) : fade, x = fade > 0 ? Math.min(fi, 0.45 * len[i], 0.45 * len[i + 1]) : 0; d.push(x >= 0.1 ? +x.toFixed(2) : 0); }
    const pieces = [];
    if (n === 1 || d.every(x => !x)) pieces.push(...norm);
    else {
      const idx = files.map((_, i) => i);
      const mids = await pmap(idx, async i => {   // phần thân từng clip (cắt bỏ đoạn chồng ở 2 đầu), song song
        const a = i > 0 ? d[i - 1] : 0, b = len[i] - (i < n - 1 ? d[i] : 0), mid = P(`m${i}.mp4`);
        await run(['-ss', String(a), '-i', norm[i], '-t', String(+(b - a).toFixed(3)), ...ENC_FINAL, mid]); return mid;
      });
      const brs = await pmap(idx.slice(0, -1), async i => {   // đoạn chuyển mờ ở từng điểm nối, song song
        if (!d[i]) return null;
        const br = P(`b${i}.mp4`), x = Math.max(0.06, d[i] - 0.04);
        await run(['-ss', String(+(len[i] - d[i]).toFixed(3)), '-t', String(d[i]), '-i', norm[i], '-t', String(d[i]), '-i', norm[i + 1],
          '-filter_complex', `[0:v]fps=24,settb=1/24,setpts=PTS-STARTPTS[a];[1:v]fps=24,settb=1/24,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=${x}:offset=0,format=yuv420p[v];[0:a][1:a]acrossfade=d=${x}:c1=tri:c2=tri[au]`,
          '-map', '[v]', '-map', '[au]', ...ENC_FINAL, br]); return br;
      });
      for (let i = 0; i < n; i++) { pieces.push(mids[i]); if (i < n - 1 && brs[i]) pieces.push(brs[i]); }
    }
    const list = P('list.txt');
    fs.writeFileSync(list, pieces.map(f => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
    await run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  } finally { for (const f of made) { try { fs.unlinkSync(f); } catch (_) {} } try { fs.rmdirSync(wd); } catch (_) {} }
}
async function concat(files, out, size, opt = {}) {
  if (files.length > 1 && ((+opt.fade || 0) > 0 || opt.match)) {
    try { await concatSmooth(files, out, size, opt); return 'smooth'; }
    catch (e) {
      console.warn('concatSmooth failed, falling back to concatHard:', e && e.message || e);
      try { fs.unlinkSync(out); } catch (_) {} /* lỗi -> quay về ghép cắt thẳng */
    }
  }
  await concatHard(files, out, size); return 'hard';
}
async function concatHard(files, out, size) {
  out = path.resolve(out);
  files = files.map(f => path.resolve(f));
  const dir = path.dirname(out), tmp = files.map((_, i) => path.join(dir, `_n${i}.mp4`)), list = path.join(dir, '_list.txt');
  fs.mkdirSync(dir, { recursive: true });
  try {
    await pmap(files, (f, i) => normalize(f, tmp[i], size));
    fs.writeFileSync(list, tmp.map(f => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
    await run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  } finally { for (const f of [...tmp, list]) { try { fs.unlinkSync(f); } catch (_) {} } }
}
async function addMusic(video, music, out) {
  await run(['-i', video, '-stream_loop', '-1', '-i', music, '-filter_complex',
    '[1:a]volume=0.18[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]',
    '-map', '0:v', '-map', '[a]', '-threads', FF_THREADS, '-c:v', 'copy', '-c:a', 'aac', '-shortest', out]);
}
module.exports = { firstFrame, ssim, lastFrame, concat, concatSmooth, concatHard, info, stats, addMusic, run, POOL, FF_THREADS, get bin() { return bin; } };
