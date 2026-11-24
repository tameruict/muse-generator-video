"""Cài thư viện MuseAI-API vào bridge/.venv (chạy 1 lần, an toàn chạy lại).

Repo gốc chưa có giấy phép nên KHÔNG đóng gói kèm: script này tải trực tiếp từ GitHub.
Một số bản của repo bị dính tiền tố số dòng ("  12 | code") trong file nguồn; script tự gỡ nếu có.
"""
import re
import subprocess
import sys
import venv
from pathlib import Path

HERE = Path(__file__).resolve().parent
VENV = HERE / ".venv"
REPO = HERE / "MuseAI-API"
URL = "https://github.com/minhquan130599/MuseAI-API.git"
PREFIX = re.compile(r"^ *\d+ \| ?")


def run(*cmd, **kw):
    print(">", " ".join(map(str, cmd)))
    subprocess.check_call(list(map(str, cmd)), **kw)


def strip_prefixes() -> int:
    fixed = 0
    for f in [REPO / "pyproject.toml", *REPO.glob("muse_ai/*.py")]:
        lines = f.read_text(encoding="utf-8").splitlines()
        if lines and PREFIX.match(lines[0]):
            f.write_text("\n".join(PREFIX.sub("", l) for l in lines) + "\n", encoding="utf-8")
            fixed += 1
    return fixed


def main():
    if not VENV.exists():
        venv.create(VENV, with_pip=True)
    py = VENV / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    if not REPO.exists():
        run("git", "clone", "--depth", "1", URL, REPO)
    else:
        run("git", "-C", REPO, "checkout", "--", ".")  # bỏ bản vá cũ rồi cập nhật
        run("git", "-C", REPO, "pull", "--ff-only")
    print("Đã sửa", strip_prefixes(), "file có tiền tố số dòng")
    run(py, "-m", "pip", "install", "-q", "-U", "pip")
    run(py, "-m", "pip", "install", "-q", "-e", REPO)
    run(py, "-c", "import muse_ai; print('muse_ai OK')")


if __name__ == "__main__":
    main()
