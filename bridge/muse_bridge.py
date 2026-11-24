"""Cầu nối JSON-lines giữa Muse Studio (Node) và thư viện MuseAI-API (Python).

Giao thức: mỗi dòng stdin là một JSON {"id", "op", ...}; mỗi dòng stdout là
{"id", "ok": true, "data": ...} hoặc {"id", "ok": false, "error": {"code", "message"}}.

Mã lỗi (khớp với engine.js):
  412 hết hạn mức · 596 phiên đăng nhập hỏng / bị chặn · 429 bận · 400 prompt/ảnh bị từ chối
  422 Muse TRẢ LỜI BẰNG CHỮ (từ chối / không tạo video) — engine phải ĐỔI nội dung rồi mới thử lại
  504 quá thời gian · 503 lỗi tạm thời
"""
from __future__ import annotations

import asyncio
import json
import re
import secrets
import sys
import time
import uuid
from pathlib import Path

try:
    from muse_ai import MuseAuth, MuseClient
    from muse_ai.media import extract_session_ids, extract_video_refs
    from muse_ai.errors import MuseAuthError, MuseRpcError
except ImportError as exc:  # pragma: no cover - chỉ khi chưa cài thư viện
    MuseAuth = MuseClient = extract_session_ids = extract_video_refs = None  # type: ignore[assignment]
    MuseAuthError = MuseRpcError = Exception  # type: ignore[assignment,misc]
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None


# ---------- chat văn bản (thay cho Meta Model API) ----------
# Thư viện MuseAI-API chỉ có chat_stream + history, chưa có hàm "hỏi - nhận chữ". Bridge tự ghép:
# gửi prompt vào một phiên mới, rồi quét lịch sử chat để tìm câu trả lời.
# Vì chưa biết chính xác cấu trúc JSON của lịch sử, ta bắt Muse bọc câu trả lời giữa 2 dấu mốc ngẫu nhiên
# và tìm dấu mốc trong MỌI chuỗi của lịch sử/luồng sự kiện (không phụ thuộc tên trường).
PLACEHOLDER = "(your reply)"
ASSISTANT_ROLES = {"assistant", "model", "bot", "agent", "muse", "ai"}
TEXT_KEYS = ("text", "content", "message", "body")


def chat_wrap(prompt: str, token: str) -> str:
    return (
        f"{prompt.strip()}\n\n---\n"
        "OUTPUT PROTOCOL (mandatory): this is a plain-text writing task. Do NOT generate any video or image, "
        "do not use tools, do not ask questions. Reply with ONE message in exactly this layout and nothing outside it:\n"
        f"<<<{token}\n{PLACEHOLDER}\n{token}>>>"
    )


def iter_strings(node):
    """Mọi chuỗi trong cấu trúc JSON lồng nhau (giải mã luôn chuỗi chứa JSON)."""
    if isinstance(node, str):
        yield node
        t = node.strip()
        if t[:1] in "[{":
            try:
                yield from iter_strings(json.loads(t))
            except ValueError:
                pass
    elif isinstance(node, dict):
        for v in node.values():
            yield from iter_strings(v)
    elif isinstance(node, (list, tuple)):
        for v in node:
            yield from iter_strings(v)


def extract_marked(strings, token: str) -> str | None:
    """Lấy nội dung giữa <<<token ... token>>>; bỏ qua mẫu trong chính prompt (nội dung = PLACEHOLDER)."""
    pat = re.compile(re.escape("<<<" + token) + r"\s*(.*?)\s*" + re.escape(token + ">>>"), re.S)
    best = None
    for s in strings:
        for m in pat.finditer(s):
            body = m.group(1).strip()
            if body and body != PLACEHOLDER:
                best = body
    return best


def assistant_texts(node) -> list[str]:
    """Dự phòng khi Muse không tuân thủ dấu mốc: chuỗi nằm trong nút có vai trò trợ lý."""
    out: list[str] = []

    def walk(n):
        if isinstance(n, dict):
            role = str(n.get("role") or n.get("author") or n.get("sender") or n.get("type") or "").lower()
            if role in ASSISTANT_ROLES or role.startswith("assistant"):
                for k in TEXT_KEYS:
                    v = n.get(k)
                    if isinstance(v, str) and v.strip():
                        out.append(v.strip())
                    elif isinstance(v, (list, dict)):
                        out.extend(x.strip() for x in iter_strings(v) if x.strip() and len(x.strip()) > 1)
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)

    walk(node)
    return out


# Câu trả lời CHỮ của Muse khi từ chối tạo video (tiếng Việt + Anh + Trung). Khớp -> báo ngay, không chờ hết 15 phút.
REFUSAL_TEXT_RE = re.compile(
    r"không\s+(?:thể|tạo\s+được|làm\s+được|hỗ\s+trợ|được\s+phép)|xin\s+lỗi|rất\s+tiếc|từ\s+chối|vi\s+phạm|"
    r"chính\s+sách|không\s+phù\s+hợp|nhạy\s+cảm|người\s+thật|"
    r"无法|不能|抱歉|对不起|拒绝|违规|政策|敏感|不支持|不允许|不适合|真实人物|违反|"
    r"無法|拒絕|違規|不允許|真實人物|違反|"
    r"\bcan(?:'|’)?t\b|\bcannot\b|\bunable\b|\bsorry\b|not\s+able|won(?:'|’)?t\s+be\s+able|"
    r"\bpolic(?:y|ies)\b|guideline|against\s+(?:my|our)|real\s+(?:person|people)|isn(?:'|’)?t\s+something|"
    r"\bcan\s+not\b|\bwon(?:'|’)?t\b|\bwill\s+not\b|\bdo(?:es)?\s*n(?:'|’)?o?t\s+(?:allow|permit|support)|\bi(?:'|’)?m\s+afraid\b|"
    r"\bcouldn(?:'|’)?t\b|\bcould\s+not\b|\bwasn(?:'|’)?t\s+able\b|\bno\s+starting\s+frame\b|\bapolog|(?:not|n(?:'|’)t)\s+(?:permitted|allowed|appropriate|possible)|\b(?:violat|restrict|declin|inappropriate|sensitive|unfortunately)", re.I)
REFUSAL_AFTER = 25.0    # giây: câu chữ có mẫu từ chối đứng yên chừng này mà chưa có video -> coi là bị từ chối
TEXT_ONLY_AFTER = 240.0  # giây: có chữ (không rõ mẫu) nhưng vẫn không video -> coi là không ra video


class BridgeError(Exception):
    def __init__(self, code: int, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


# Lưu ý: KHÔNG dùng "rate" trần vì trùng với chữ "gene-rate"/"ope-rate" -> lỗi thường bị coi nhầm là hết hạn mức.
QUOTA_RE = re.compile(r"\blimit(?:s|ed)?\b|quota|exhaust|too many|\brate[ _-]?limit|allowance|daily|credits?\b|usage cap|reached (?:the|your|today)|hết|配额|上限|次数用完|额度|已达|配額|次數用完|額度|已達", re.I)
REFUSED_RE = re.compile(r"policy|safety|unsafe|blocked content|not allowed|refus", re.I)


def classify(exc: BaseException) -> BridgeError:
    if isinstance(exc, BridgeError):
        return exc
    msg = str(exc) or type(exc).__name__
    if isinstance(exc, FileNotFoundError):
        return BridgeError(400, msg)
    if isinstance(exc, TimeoutError):
        return BridgeError(504, msg)
    if isinstance(exc, MuseAuthError):
        return BridgeError(596, msg)
    status = getattr(exc, "status", None)
    if status in (401, 403) and not REFUSED_RE.search(msg):
        return BridgeError(596, msg)
    if status == 429 or QUOTA_RE.search(msg):
        return BridgeError(412, msg)
    if REFUSED_RE.search(msg):
        return BridgeError(400, msg)
    return BridgeError(503, msg)


def parse_cookies(text: str) -> list[dict]:
    """Nhận cookie xuất từ trình duyệt: JSON (Cookie-Editor/EditThisCookie), {"cookies": [...]}
    hoặc cookies.txt dạng Netscape. Trả về danh sách {name, value, domain, path}."""
    text = (text or "").strip()
    if not text:
        raise BridgeError(400, "Chưa dán cookie")
    raw: list = []
    if text[0] in "[{":
        try:
            data = json.loads(text)
        except ValueError as exc:
            raise BridgeError(400, f"JSON cookie không hợp lệ: {exc}")
        raw = data.get("cookies", []) if isinstance(data, dict) else data
    else:
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("#HttpOnly_"):
                line = line[len("#HttpOnly_"):]
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) >= 7:
                raw.append({"domain": parts[0], "path": parts[2], "name": parts[5], "value": parts[6]})
    out = []
    for c in raw:
        if isinstance(c, dict) and c.get("name") and c.get("value") is not None:
            out.append({"name": str(c["name"]), "value": str(c["value"]),
                        "domain": c.get("domain") or "muse.ai", "path": c.get("path") or "/"})
    if not out:
        raise BridgeError(400, "Không đọc được cookie nào (cần JSON hoặc cookies.txt của muse.ai)")
    return out


def safe_name(email: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.@-]", "_", email.strip().lower())[:80] or "default"


class Bridge:
    def __init__(self, state_root: Path, out_root: Path) -> None:
        self.state_root = Path(state_root)
        self.out_root = Path(out_root)
        self.state_root.mkdir(parents=True, exist_ok=True)
        self.out_root.mkdir(parents=True, exist_ok=True)
        self.pending_login: dict[str, "MuseAuth"] = {}
        self.jobs: dict[str, dict] = {}
        self.locks: dict[str, asyncio.Lock] = {}

    def prune_old_outputs(self, max_age_sec: float = 86400.0) -> int:
        import shutil
        if not self.out_root.exists():
            return 0
        cutoff = time.time() - max_age_sec
        removed = 0
        try:
            entries = list(self.out_root.iterdir())
        except OSError:
            return 0
        for p in entries:
            try:
                if p.is_dir() and p.stat().st_mtime < cutoff:
                    shutil.rmtree(p, ignore_errors=True)
                    removed += 1
            except OSError:
                pass
        return removed

    def state_dir(self, email: str) -> Path:
        return self.state_root / safe_name(email)

    def lock(self, email: str) -> asyncio.Lock:
        return self.locks.setdefault(email, asyncio.Lock())

    # ---------- đăng nhập OTP (2 bước) ----------
    async def login_start(self, email: str, region: str = "VN") -> dict:
        old = self.pending_login.pop(email, None)
        if old:
            await old.close()
        auth = MuseAuth(state_dir=self.state_dir(email))
        try:
            await auth.restart_login()
            await auth.send_otp(email, region)
        except BaseException:
            await auth.close()
            raise
        self.pending_login[email] = auth
        return {"sent": True}

    async def login_confirm(self, email: str, otp: str) -> dict:
        auth = self.pending_login.get(email)
        if auth is None:
            raise BridgeError(400, "Chưa yêu cầu mã OTP cho email này. Bấm 'Gửi mã OTP' trước.")
        try:
            await auth.confirm_otp(otp.strip())
            await auth.save_account()
            check = await auth.auth_check()
            if check.get("ok") is not True:
                raise MuseAuthError(f"Đăng nhập xong nhưng phiên không hợp lệ: {check}")
            await auth.save_cookies()
        finally:
            self.pending_login.pop(email, None)
            await auth.close()
        return {"loggedIn": True}

    async def import_cookies(self, email: str, text: str) -> dict:
        cookies = parse_cookies(text)
        sd = self.state_dir(email)
        sd.mkdir(parents=True, exist_ok=True)
        target = sd / "cookies.json"
        backup = target.read_bytes() if target.exists() else None
        target.write_text(json.dumps(cookies, indent=2), encoding="utf-8")
        try:
            await self.check(email)  # xác nhận phiên còn hợp lệ trước khi giữ lại
        except BaseException:
            if backup is None:
                target.unlink(missing_ok=True)
                try:
                    sd.rmdir()  # bỏ thư mục rỗng để không hiện tài khoản ma
                except OSError:
                    pass
            else:
                target.write_bytes(backup)
            raise
        return {"imported": len(cookies)}

    async def check(self, email: str) -> dict:
        auth = MuseAuth(state_dir=self.state_dir(email))
        try:
            await auth.ensure_session()
        finally:
            await auth.close()
        return {"ok": True}

    def accounts(self) -> list[dict]:
        if not self.state_root.exists():
            return []
        return [
            {"email": p.name, "hasSession": (p / "cookies.json").exists()}
            for p in sorted(self.state_root.iterdir())
            if p.is_dir()
        ]

    # ---------- tạo video ----------
    def submit(self, email: str, prompt: str, images: list[str], timeout: float, session_id: str | None = None) -> dict:
        if not prompt.strip():
            raise BridgeError(400, "Prompt trống")
        for img in images:
            if not Path(img).is_file():
                raise BridgeError(400, f"Không thấy ảnh: {img}")
        if not (self.state_dir(email) / "cookies.json").exists():
            raise BridgeError(596, f"Tài khoản {email} chưa đăng nhập")
        now = time.time()   # dọn job cũ đã xong để bộ nhớ không phình mãi
        for k in [k for k, j in self.jobs.items() if j.get("done_at") and now - j["done_at"] > 7200]:
            self.jobs.pop(k, None)
        jobid = uuid.uuid4().hex[:12]
        job = {"status": "queued", "email": email}
        self.jobs[jobid] = job
        job["task"] = asyncio.create_task(self._run(jobid, email, prompt, images, timeout, session_id))
        return {"jobid": jobid, "status": "queued"}

    async def _wait_or_refusal(self, client, *, session_id, baseline, timeout=600.0, poll_interval=3.0,
                               settle_seconds=5.0, min_videos=1, refusal_after=REFUSAL_AFTER,
                               text_only_after=TEXT_ONLY_AFTER, old_texts=frozenset()):
        """Thay cho client.wait_for_videos: ngoài việc chờ video, còn đọc câu trả lời CHỮ của Muse.
        Trước đây khi Muse từ chối bằng chữ (không có video) thư viện cứ chờ tới hết giờ (15 phút) rồi báo 'quá thời gian',
        engine hiểu là lỗi tạm và gửi LẠI Y NGUYÊN prompt -> bị từ chối lặp vô tận. Giờ báo 422 kèm nguyên văn lời Muse."""
        t0 = time.monotonic()
        deadline = t0 + timeout
        first_found_at = None
        latest_history = None
        latest_refs: list = []
        seen_text: str | None = None
        text_since = 0.0
        while time.monotonic() < deadline:
            latest_history = await client.history(session_id=session_id, limit=80)
            refs = [r for r in extract_video_refs(latest_history) if r.identity not in baseline]
            latest_refs = list({r.identity: r for r in refs}.values())
            if len(latest_refs) >= min_videos:
                first_found_at = first_found_at or time.monotonic()
                if time.monotonic() - first_found_at >= settle_seconds:
                    return latest_refs, latest_history
            else:
                first_found_at = None
                # mỗi job mở một phiên chat MỚI nên mọi chữ của trợ lý trong phiên đều là phản hồi cho prompt này
                # phiên mới: mọi chữ của trợ lý là phản hồi cho prompt này. Phiên DÙNG LẠI (nối cảnh): bỏ các câu trả lời đã có từ trước
                texts = [t for t in assistant_texts(latest_history) if PLACEHOLDER not in t and len(t) > 3 and t not in old_texts]
                if texts:
                    cur = texts[-1]
                    now = time.monotonic()
                    if cur != seen_text:
                        seen_text, text_since = cur, now
                    age = now - text_since
                    if REFUSAL_TEXT_RE.search(cur) and age >= refusal_after:
                        raise BridgeError(422, "Muse từ chối bằng chữ: " + cur[:900])
                    if age >= text_only_after:
                        raise BridgeError(422, "Muse chỉ trả lời chữ, không tạo video: " + cur[:900])
            await asyncio.sleep(poll_interval)
        if latest_refs:
            return latest_refs, latest_history
        raise TimeoutError(f"No new Muse video appeared within {timeout:.0f}s"
                           + (f" for session {session_id}" if session_id else ""))

    async def _run(self, jobid: str, email: str, prompt: str, images: list[str], timeout: float,
                   session_id: str | None = None) -> None:
        job = self.jobs[jobid]
        try:
            async with self.lock(email):  # mỗi tài khoản 1 video một lúc để không lẫn kết quả
                job["status"] = "started"
                out_dir = self.out_root / jobid
                client = MuseClient(MuseAuth(state_dir=self.state_dir(email)),
                                    state_dir=self.state_dir(email))
                await client.connect()
                old_texts: frozenset = frozenset()
                if session_id:   # nối vào phiên chat của cảnh trước: ghi nhớ các câu trả lời cũ để không nhầm với phản hồi của prompt mới
                    try:
                        old_texts = frozenset(assistant_texts(await client.history(session_id=session_id, limit=80)))
                    except Exception:  # noqa: BLE001
                        old_texts = frozenset()
                if extract_video_refs is not None and hasattr(client, "wait_for_videos"):
                    client.wait_for_videos = lambda **kw: self._wait_or_refusal(client, old_texts=old_texts, **kw)   # thêm nhận diện từ chối bằng chữ
                try:
                    res = await client.generate_video(
                        prompt=prompt, images=images, output_dir=out_dir, timeout=timeout, session_id=session_id or None)
                finally:
                    await client.close()
            if not res.downloaded:
                detail = "; ".join(res.download_errors) or "không tải được video"
                raise BridgeError(503, "Muse đã tạo video nhưng tải về lỗi: " + detail)
            job.update(status="completed", file=str(res.downloaded[0]), session_id=res.session_id, done_at=time.time())
        except BaseException as exc:  # noqa: BLE001
            if isinstance(exc, (KeyboardInterrupt, SystemExit)):
                raise
            err = classify(exc)
            job.update(status="failed", error={"code": err.code, "message": err.message}, done_at=time.time())

    # ---------- chat văn bản ----------
    async def chat(self, email: str, prompt: str, images: list[str], timeout: float,
                   poll: float = 3.0, idle_fallback: float = 45.0) -> dict:
        if not prompt.strip():
            raise BridgeError(400, "Prompt trống")
        for img in images:
            if not Path(img).is_file():
                raise BridgeError(400, f"Không thấy ảnh: {img}")
        if not (self.state_dir(email) / "cookies.json").exists():
            raise BridgeError(596, f"Tài khoản {email} chưa đăng nhập")
        token = secrets.token_hex(6)
        full = chat_wrap(prompt, token)
        async with self.lock(email):  # dùng chung khoá với tạo video để không lẫn phiên của cùng tài khoản
            client = MuseClient(MuseAuth(state_dir=self.state_dir(email)), state_dir=self.state_dir(email))
            await client.connect()
            try:
                before = set(extract_session_ids(await client.sessions_list()))
                events = await client.chat_stream(prompt=full, images=images, stream_timeout=20.0)
                session = await client._resolve_session_id(None, events, before)
                deadline = time.monotonic() + timeout
                first_text_at = None
                while True:
                    hist = await client.history(session_id=session, limit=80)
                    text = extract_marked(list(iter_strings(events)) + list(iter_strings(hist)), token)
                    if text:
                        return {"text": text, "session_id": session, "marked": True}
                    # dự phòng: có trả lời của trợ lý nhưng không có dấu mốc -> chờ ổn định rồi dùng bản cuối
                    texts = [t for t in assistant_texts(hist) if t != full.strip() and PLACEHOLDER not in t]
                    if texts:
                        first_text_at = first_text_at or time.monotonic()
                        if time.monotonic() - first_text_at >= idle_fallback:
                            return {"text": texts[-1], "session_id": session, "marked": False}
                    if time.monotonic() >= deadline:
                        raise TimeoutError(f"Muse không trả lời văn bản trong {timeout:.0f}s")
                    await asyncio.sleep(poll)
            finally:
                await client.close()

    def job(self, jobid: str) -> dict:
        job = self.jobs.get(jobid)
        if job is None:
            raise BridgeError(503, "Bridge đã khởi động lại, job bị mất")
        return {k: v for k, v in job.items() if k != "task"}

    # ---------- điều phối ----------
    async def handle(self, req: dict) -> dict:
        op = req.get("op")
        if _IMPORT_ERROR is not None:
            raise BridgeError(
                500, "Chưa cài thư viện MuseAI-API. Chạy lại CAI-DAT-VA-CHAY.bat. " + str(_IMPORT_ERROR))
        if op == "ping":
            return {"pong": True}
        if op == "login_start":
            return await self.login_start(req["email"], req.get("region", "VN"))
        if op == "login_confirm":
            return await self.login_confirm(req["email"], req["otp"])
        if op == "import_cookies":
            return await self.import_cookies(req["email"], req["cookies"])
        if op == "check":
            return await self.check(req["email"])
        if op == "accounts":
            return {"accounts": self.accounts()}
        if op == "submit":
            return self.submit(req["email"], req["prompt"], req.get("images", []),
                               float(req.get("timeout", 900)), req.get("session_id") or None)
        if op == "chat":
            return await self.chat(req["email"], req["prompt"], req.get("images", []),
                                   float(req.get("timeout", 240)))
        if op == "job":
            return self.job(req["jobid"])
        if op == "remove":
            import shutil
            shutil.rmtree(self.state_dir(req["email"]), ignore_errors=True)
            return {"removed": True}
        raise BridgeError(400, f"op không hợp lệ: {op}")


async def serve(state_root: Path, out_root: Path) -> None:
    bridge = Bridge(state_root, out_root)
    prune_task = asyncio.create_task(asyncio.to_thread(bridge.prune_old_outputs))
    prune_task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)
    loop = asyncio.get_running_loop()
    # đọc stdin bằng thread: connect_read_pipe không dùng được trên Windows (ProactorEventLoop)
    readline = lambda: loop.run_in_executor(None, sys.stdin.buffer.readline)  # noqa: E731
    write_lock = asyncio.Lock()

    async def reply(obj: dict) -> None:
        async with write_lock:
            sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
            sys.stdout.flush()

    async def one(line: bytes) -> None:
        rid = None
        try:
            req = json.loads(line)
            rid = req.get("id")
            await reply({"id": rid, "ok": True, "data": await bridge.handle(req)})
        except BaseException as exc:  # noqa: BLE001
            if isinstance(exc, (KeyboardInterrupt, SystemExit)):
                raise
            err = classify(exc)
            await reply({"id": rid, "ok": False, "error": {"code": err.code, "message": err.message}})

    tasks: set[asyncio.Task] = set()
    while True:
        line = await readline()
        if not line:
            break
        if not line.strip():
            continue
        t = asyncio.create_task(one(line))
        tasks.add(t)
        t.add_done_callback(tasks.discard)


def main() -> None:
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--state-root", required=True)
    p.add_argument("--out-root", required=True)
    a = p.parse_args()
    asyncio.run(serve(Path(a.state_root), Path(a.out_root)))


if __name__ == "__main__":
    main()
