// Tìm thư mục `bridge` + Python để chạy nó.
// Ưu tiên Python nhúng sẵn (bridge/python/python.exe, do build/prepare-python.js tạo) -> máy nào cũng chạy, khỏi cài Python.
// Dự phòng: bridge/.venv (tạo bằng CAI-DAT-VA-CHAY.bat / setup_bridge.py).
const fs = require('fs'), path = require('path');

function pythonExe(dir) {
  const win = process.platform === 'win32';
  const list = win
    ? [path.join(dir, 'python', 'python.exe'), path.join(dir, '.venv', 'Scripts', 'python.exe')]
    : [path.join(dir, 'python', 'bin', 'python3'), path.join(dir, '.venv', 'bin', 'python')];
  return list.find(p => fs.existsSync(p)) || list[list.length - 1];
}

function candidates() {
  const c = [];
  if (process.env.MUSE_BRIDGE_DIR) c.push(process.env.MUSE_BRIDGE_DIR);
  if (process.env.PORTABLE_EXECUTABLE_DIR) c.push(path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'bridge')); // cạnh file exe (nếu bạn tự để)
  if (process.resourcesPath) c.push(path.join(process.resourcesPath, 'bridge'));                            // đóng gói sẵn trong exe
  c.push(path.join(path.dirname(process.execPath), 'bridge'));
  c.push(path.join(__dirname, '..', 'bridge'));                                                             // chạy bằng npm start
  return c;
}

function bridgeDir() {
  const c = candidates().filter(d => fs.existsSync(path.join(d, 'muse_bridge.py')));
  return c.find(d => fs.existsSync(pythonExe(d))) || c[0] || candidates()[0];
}
module.exports = bridgeDir;
module.exports.pythonExe = pythonExe;
