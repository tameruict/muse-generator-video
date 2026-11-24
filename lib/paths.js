const fs = require('fs');
const os = require('os');
const path = require('path');
const { t } = require('./i18n');

const WIN_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
let probeSeq = 0;

/**
 * Sanitize a path segment for safe cross-platform / Windows directory names.
 */
function safeSegment(str, fallback = 'Chung', maxLen = 60, asciiSlug = false) {
  let out = String(str == null ? '' : str);
  if (asciiSlug) {
    out = out
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  } else {
    out = out.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  }
  out = out.slice(0, maxLen);
  out = asciiSlug
    ? out.replace(/^[\s.-]+|[\s.-]+$/g, '')
    : out.replace(/^[\s.]+|[\s.]+$/g, '');
  if (WIN_RESERVED.test(out)) {
    out = ('_' + out).slice(0, maxLen);
    out = asciiSlug
      ? out.replace(/^[\s.-]+|[\s.-]+$/g, '')
      : out.replace(/^[\s.]+|[\s.]+$/g, '');
  }
  return out || fallback;
}

/**
 * Ensure directory exists and is writable; returns resolved path or throws.
 */
function probeWritableDir(dir, lang) {
  const raw = String(dir || '').trim();
  if (!raw) throw new Error(t(lang, 'err.invalidOutputDir'));
  const resolved = path.resolve(raw);
  fs.mkdirSync(resolved, { recursive: true });
  const probe = path.join(resolved, `.muse_probe_${process.pid}_${Date.now()}_${++probeSeq}`);
  fs.writeFileSync(probe, '');
  fs.unlinkSync(probe);
  return resolved;
}

/**
 * Find the first writable default MuseStudio output directory.
 */
function defaultOutputDir(getPathFn, lang) {
  const bases = [
    () => {
      const v = typeof getPathFn === 'function' ? getPathFn('videos') : '';
      return v ? path.join(v, 'MuseStudio') : '';
    },
    () => path.join(os.homedir(), 'MuseStudio'),
    () => (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'MuseStudio', 'Videos') : ''),
    () => {
      const u = typeof getPathFn === 'function' ? getPathFn('userData') : '';
      return u ? path.join(u, 'MuseStudio-Videos') : '';
    },
    () => path.join(os.tmpdir(), 'MuseStudio')
  ];
  let lastErr = null;
  for (const getTarget of bases) {
    try {
      const target = getTarget();
      if (!target) continue;
      return probeWritableDir(target, lang);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(t(lang, 'err.noWritableOutputDir'));
}

/**
 * Validate candidate output directory or fall back to a writable default.
 */
function ensureOutputDir(candidate, getPathFn, lang) {
  const raw = String(candidate || '').trim();
  if (raw) {
    try {
      return { dir: probeWritableDir(raw, lang), fallback: false };
    } catch (_) {}
  }
  return { dir: defaultOutputDir(getPathFn, lang), fallback: true };
}

module.exports = { safeSegment, probeWritableDir, defaultOutputDir, ensureOutputDir };
