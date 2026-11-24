const fs = require('fs'), path = require('path');
const DEFAULTS = {
  settings: { uiLang: 'vi', outputDir: '', concurrency: 0, maxRetries: 3, pollSec: 8, notify: true, parallel: 'auto', autoFrom: 12, minChapter: 4, shareSession: true, contCheck: true, maxRefs: 4, joinFade: 0.5, joinMatch: true },
  accounts: [], characters: [], styles: [], videos: [], aiChat: []
};
class Store {
  constructor(dir) {
    this.dir = dir; this.file = path.join(dir, 'data.json'); this._t = null;
    this.data = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const d = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      Object.assign(this.data, d);
      this.data.settings = Object.assign({}, DEFAULTS.settings, d.settings || {});
      if (!this.data.settings.refsV2) { if (this.data.settings.maxRefs === 6) this.data.settings.maxRefs = 4; this.data.settings.refsV2 = true; }   // Muse khuyên bộ ảnh gọn: 6 (mặc định cũ) -> 4
      // 4.4: video dài bị lệch giữa các clip vì chế độ "Thông minh" cắt chuỗi nối thành nhóm song song (cảnh đầu mỗi nhóm không có khung/ngữ cảnh cảnh trước): đưa về tuần tự một lần
      if (!this.data.settings.contV44) { if (this.data.settings.parallel === 'smart') this.data.settings.parallel = 'strict'; this.data.settings.contV44 = true; }
      if (!this.data.settings.autoV45) { if (this.data.settings.parallel === 'strict') this.data.settings.parallel = 'auto'; this.data.settings.autoV45 = true; }   // 4.5: tự chia chương song song cho video dài
      delete this.data.settings.metaKey; // bản cũ từng lưu khoá Meta: xoá khỏi đĩa
    } catch (_) {}
  }
  save() { clearTimeout(this._t); this._t = setTimeout(() => this.flush(), 1500); }
  flush() {
    clearTimeout(this._t);
    this._t = null;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmp = this.file + '.sync.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      for (let i = 0; i < 5; i++) {
        try {
          fs.renameSync(tmp, this.file);
          return;
        } catch (e) {
          if (e && e.code === 'EXDEV') {
            fs.copyFileSync(tmp, this.file);
            try { fs.unlinkSync(tmp); } catch (_) {}
            return;
          }
          if (e && (e.code === 'EBUSY' || e.code === 'EPERM') && i < 4) {
            try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); } catch (_) {}
            continue;
          }
          throw e;
        }
      }
    } catch (e) { console.error('save error', e); }
  }
}
module.exports = { Store };
