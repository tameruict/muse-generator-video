# Muse Studio (`muse-generator-video`)

Batch AI video generator & workflow manager built on Electron, FFmpeg, Edge TTS, and `MuseAI-API`.  
Supports **Vietnamese (Tiếng Việt)**, **English**, and **Simplified Chinese (中文)** across the UI, AI script/storyboard/affiliate generation, TTS voiceovers, and safety/refusal handling.

---

## Features

- **Multi-language UI (`vi` / `en` / `zh`)**: Live language switcher in the top bar (persisted in app settings & local storage).
- **Quick Create & Script Composer**: Text-to-video and image-to-video batch queuing with parallel multi-account execution, automatic quota failover, scene continuity (`lastFrame` / `firstFrame` SSIM check), and smooth FFmpeg crossfade + color/loudness matching.
- **Channel Studio**: Automated daily episode production per channel with character bible locking, Edge TTS (`vi-VN-HoaiMyNeural`, `en-US-AriaNeural`, `zh-CN-XiaoxiaoNeural`, or custom voice map), `.srt` subtitles, thumbnails, and quality checks.
- **Film Maker**: Multi-batch long-form screenplay planning (up to 60 scenes / 10 minutes) with a consistent Story Bible.
- **Affiliate Video (`Video Aff`)**: Product photo analysis, UGC script generation, and localized social captions, hashtags, and pinned comments.
- **Codex AI Assistant**: In-app chat assistant with localized presets (Q&A, Script, Prompt Optimizer, Ideas, Caption + Hashtags).
- **Character & Style Sync**: Reference image + appearance lock per scene (`[CharacterName]` tags, including Vietnamese/English/Chinese separators).

---

## Setup & Run

### 1. Node / Electron dependencies
```bash
npm install
```

### 2. Python bridge (`MuseAI-API` + `edge-tts`)
```bash
python bridge/setup_bridge.py
```

### 3. Launch
```bash
npm start
```

---

## Hướng dẫn nhanh (Tiếng Việt)

1. Cài đặt gói Node: `npm install`
2. Cài đặt cầu nối Python (`MuseAI-API`): `python bridge/setup_bridge.py`
3. Chạy ứng dụng: `npm start`
4. Chọn ngôn ngữ **Tiếng Việt / English / 中文** ngay trên thanh trên cùng của ứng dụng.

---

## 快速开始 (中文)

1. 安装 Node 依赖：`npm install`
2. 初始化 Python 桥接环境（`MuseAI-API`）：`python bridge/setup_bridge.py`
3. 启动应用：`npm start`
4. 可在顶部栏随时切换 **Tiếng Việt / English / 中文** 界面语言，并在快速生成、频道工作室、电影制作和带货视频中选择中文配音与文案生成。
