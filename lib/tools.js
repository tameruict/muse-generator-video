// Ba mục mới: Làm phim, Video Aff, Codex AI. Tất cả dùng lại Engine (hàng đợi, tài khoản Muse, ghép video)
// và hỏi chữ qua engine.ask (chat Muse) — không cần khoá API nào khác.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const spark = require('./spark'), { langName } = require('./lang'), { t, getLang, normalizeLang } = require('./i18n');
const uid = () => crypto.randomBytes(6).toString('hex');
const SEC = 10, MAX_FILM = 60, CHUNK = 5;   // mỗi clip ~10s; phim tối đa 60 cảnh (10 phút); viết kịch bản theo từng đợt 5 cảnh, mỗi đợt đều được nhắc lại 'bible phim'

const GENRES = { drama: 'drama, emotional', action: 'action, thriller', comedy: 'light comedy', horror: 'mystery, suspense (not gory)', fantasy: 'fantasy adventure', scifi: 'science fiction', romance: 'romance', doc: 'documentary style' };
const FORMULAS = {
  review: 'honest hands-on review (UGC style): hook, first impression, demo of the key feature, result, call to action',
  problem: 'problem then solution: relatable daily problem, product enters, how it fixes it, result, call to action',
  unbox: 'unboxing: package arrives, opening, first look at details, quick try, call to action',
  beforeafter: 'before/after demonstration (visual comparison only, no exaggerated or guaranteed claims), call to action',
  top: '3 reasons to buy: strong hook, three short benefit shots, final call to action'
};
const PLATFORMS = { tiktok: 'TikTok', shopee: 'Shopee Video', reels: 'Facebook/Instagram Reels' };
const PRESETS_BY_LANG = {
  vi: {
    general: 'Bạn là Codex AI, trợ lý trong app Muse Studio (tạo video AI hàng loạt). Trả lời ngắn gọn, thực tế, bằng tiếng Việt trừ khi người dùng yêu cầu khác.',
    script: 'Bạn là đạo diễn video ngắn. Viết kịch bản theo định dạng mỗi dòng "0-10s: mô tả cảnh bằng tiếng Anh chi tiết (chủ thể, hành động, máy quay, ánh sáng)". Mỗi 10 giây một dòng, các cảnh liền mạch. Chỉ trả về các dòng đó, không giải thích.',
    prompt: 'Bạn là chuyên gia viết prompt cho AI tạo video. Viết lại ý của người dùng thành prompt tiếng Anh chi tiết cho một cảnh ~10 giây (chủ thể, hành động, máy quay, ánh sáng, mood). Đưa 3 phương án khác nhau, đánh số 1-3.',
    ideas: 'Bạn là người lên ý tưởng nội dung video ngắn. Đưa 10 ý tưởng khác nhau, mỗi ý một dòng, có hook rõ trong 3 giây đầu. Trả lời bằng tiếng Việt.',
    caption: 'Bạn là copywriter mạng xã hội. Viết tiêu đề, mô tả ngắn và 5-8 hashtag cho video người dùng mô tả. Tiếng Việt, không hứa hẹn quá đà, không bịa số liệu.'
  },
  en: {
    general: 'You are Codex AI, the assistant inside Muse Studio (batch AI video creation app). Reply concisely and practically in English unless the user asks for another language.',
    script: 'You are a short-video director. Write the script with one line per shot in the format "0-10s: detailed English shot description (subject, action, camera, lighting)". One line per 10 seconds, continuous shots. Return ONLY those lines with no explanation.',
    prompt: 'You are an AI video prompt specialist. Rewrite the user\'s idea into a detailed English prompt for one ~10-second shot (subject, action, camera, lighting, mood). Provide 3 distinct options numbered 1-3.',
    ideas: 'You are a short-video content strategist. Give 10 distinct ideas, one per line, each with a clear hook in the first 3 seconds. Reply in English.',
    caption: 'You are a social media copywriter. Write a title, short description, and 5-8 hashtags for the video the user describes. Write in English, avoid exaggerated promises, and never invent metrics.'
  },
  zh: {
    general: '你是 Muse Studio（批量 AI 视频制作应用）中的助手 Codex AI。除非用户另有要求，否则请用简体中文简明、务实地回答。',
    script: '你是一名短视频导演。请按每行“0-10s: 详细的英文镜头描述（主体、动作、镜头运动、光线）”格式撰写剧本。每 10 秒一行，各镜头连贯衔接。仅输出这些行，不要额外解释。',
    prompt: '你是 AI 视频提示词专家。请将用户的想法改写为约 10 秒单镜头的详细英文提示词（主体、动作、机位、光线、氛围）。提供 3 个不同版本，用 1-3 编号。',
    ideas: '你是一名短视频内容策划。给出 10 个不同的创意，每行一个，每个都包含前 3 秒的强钩子。请用简体中文回答。',
    caption: '你是一名社交媒体文案撰写人。为用户描述的视频撰写标题、简短文案和 5-8 个标签（hashtags）。请用简体中文，不作夸大承诺，不编造数据。'
  }
};
function getPresets(uiLang) {
  return PRESETS_BY_LANG[normalizeLang(uiLang)] || PRESETS_BY_LANG.vi;
}
const PRESETS = PRESETS_BY_LANG.vi;

const flat = s => String(s || '').replace(/\s+/g, ' ').trim();
function extractJson(text, uiLang) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error(t(uiLang, 'tools.badJson'));
  const raw = text.slice(a, b + 1);
  for (const s of [raw, raw.replace(/[\u201C\u201D]/g, '"').replace(/,\s*([\]}])/g, '$1')]) { try { return JSON.parse(s); } catch (_) {} }
  throw new Error(t(uiLang, 'tools.badJson'));
}
const lines = scenes => scenes.map((t0, i) => `${i * SEC}-${(i + 1) * SEC}s: ${flat(t0)}`).join('\n');

class Tools {
  constructor(store, engine) { this.s = store; this.e = engine; if (!Array.isArray(store.data.aiChat)) store.data.aiChat = []; }
  get d() { return this.s.data; }
  uiLang() { return getLang(this.s); }
  ask(p, o) { return this.e.ask(p, o); }
  need() { if (!this.e.canAsk()) throw new Error(t(this.uiLang(), 'tools.noAccount')); }
  pick(spec) {
    const chars = this.d.characters.filter(c => (spec.characterIds || []).includes(c.id));
    const style = this.d.styles.find(x => x.id === spec.styleId);
    return { chars, style, charText: chars.map(c => `${c.name}: ${c.desc}`).join(' | ') };
  }
  // Gọi engine.addToQueue rồi gắn nhãn cho các video vừa tạo.
  async queueTagged(spec, tag) {
    const before = new Set(this.d.videos.map(v => v.id));
    const r = await this.e.addToQueue({ ...spec, mode: 'script', duration: 'auto', useAI: false, copies: 1 });
    const fresh = this.d.videos.filter(v => !before.has(v.id));
    for (const v of fresh) Object.assign(v, tag);
    this.e.changed(); return { ...r, ids: fresh.map(v => v.id) };
  }

  // ---------- Làm phim ----------
  // Bước 1: "bible phim" (một lần): phong cách quay, danh sách bối cảnh, trang phục CỐ ĐỊNH của từng nhân vật, dàn ý từng cảnh.
  // Bước 2: viết cảnh theo từng đợt, mỗi đợt đều nhận lại bible + dàn ý + các cảnh vừa viết => không bị "mỗi đợt một phim".
  async makeBible({ title, premise, genre, n, chars, style, ratio, uiLang }) {
    const names = chars.map(c => c.name);
    const sys = 'You are the showrunner of a short film. Reply with ONLY one JSON object, no markdown: ' +
      '{"logline":string,"look":string,"locations":[{"name":string,"desc":string}],"characters":[{"name":string,"outfit":string,"traits":string}],"outline":[string]}. ' +
      `Rules: "outline" has EXACTLY ${n} items, one per ~10 second shot, forming one story with a strong opening, rising conflict, a turning point and a clear ending; each item starts with "[Location name] " then who appears (max 2 characters per shot) and ONE simple filmable action. ` +
      '"look": ONE sentence applied to every shot (color grading, lens, lighting style, era, film texture). "locations": at most 4 reusable locations, each desc = concrete look (materials, colors, time of day). ' +
      `"characters": ${names.length ? 'exactly these names, no others: ' + names.join(', ') : 'at most 3 recurring characters'}; "outfit" = ONE fixed outfit and hairstyle used in the whole film (change only if the story needs it, and say when); "traits" = age, build, face in a few words. ` +
      'SAFETY: never use real people\'s names (describe by role/age/clothing); never depict capture, arrest, violence, injuries or weapons aimed at anyone, only imply conflict. English only.';
    const user = `Title: ${title || 'Untitled'}\nGenre: ${genre}\nPremise: ${premise}\nAspect ratio: ${ratio}\nShots: ${n}\nVisual style: ${style || '(none)'}\n` +
      `Given characters:\n${chars.map(c => `- ${c.name}: ${c.desc}`).join('\n') || '(none)'}`;
    let problem = '';
    for (let retry = 0; retry < 2; retry++) {
      try {
        const j = extractJson(await this.ask(sys + '\n\n' + user + (problem ? `\n\nYOUR PREVIOUS ANSWER WAS REJECTED: ${problem}.` : '')), uiLang);
        const outline = (Array.isArray(j.outline) ? j.outline : []).map(x => flat(typeof x === 'string' ? x : (x && (x.text || x.beat)) || '')).filter(Boolean);
        const locs = (Array.isArray(j.locations) ? j.locations : []).map(l => `${flat(l && l.name)}: ${flat(l && l.desc)}`).filter(x => x.length > 3);
        const people = (Array.isArray(j.characters) ? j.characters : []).map(c => `${flat(c && c.name)}: ${flat(c && c.outfit)}${c && c.traits ? ' (' + flat(c.traits) + ')' : ''}`).filter(x => x.length > 3);
        if (!flat(j.look) && !locs.length) { problem = 'it had no look or locations'; continue; }
        const text = [flat(j.look) && `Look: ${flat(j.look)}.`, locs.length && `Locations: ${locs.join(' | ')}.`, people.length && `Fixed outfits: ${people.join(' | ')}.`].filter(Boolean).join(' ');
        return { text, outline: outline.length >= n ? outline.slice(0, n) : [] };
      } catch (e) { problem = e.message; if (e.code === 412 || e.code === 596 || e.code === 500) throw e; }
    }
    return null;   // không lập được bible: vẫn viết cảnh bằng cách cũ, chỉ kém liền mạch hơn
  }
  async filmPlan(a) {
    const l = this.uiLang();
    const title = flat(a.title), premise = flat(a.premise);
    if (!premise) throw new Error(t(l, 'tools.enterPremise'));
    const n = Math.min(MAX_FILM, Math.max(1, Math.round((+a.duration || 60) / SEC)));
    const genre = GENRES[a.genre] || flat(a.genre) || GENRES.drama;   // thể loại tự nhập cũng được
    this.need();
    const { chars, style, charText } = this.pick(a), out = [];
    const bible = await this.makeBible({ title, premise, genre, n, chars, style: style && style.text, ratio: a.ratio || '9:16', uiLang: l });
    const userBible = flat(a.bible), bibleText = userBible || (bible && bible.text) || '';
    let partialErr = '';   // lỗi giữa chừng không làm mất các cảnh đã viết (mỗi đợt tốn một lượt hạn mức)
    while (out.length < n) {
      const k = Math.min(CHUNK, n - out.length), from = out.length + 1;
      const act = out.length === 0 ? 'opening: strong hook, introduce characters and place' : out.length + k >= n ? 'ending: climax and a clear resolution' : 'middle: development, conflict, turning point';
      const recap = out.length ? `\nPrevious shots (this batch is NOT the start of the film: its FIRST shot must also begin exactly where the last previous shot ended, same place/time/outfits, and the story moves forward):\n${out.slice(-2).map(s => '- ' + flat(s).slice(0, 380)).join('\n')}` : '';
      const beats = bible && bible.outline.length ? `\nPlanned beats for these shots (follow them):\n${bible.outline.slice(from - 1, from - 1 + k).map((s, i) => `${from + i}. ${s}`).join('\n')}` : '';
      const idea = `Short film "${title || 'Untitled'}", genre: ${genre}. Premise: ${premise}. You are writing shots ${from}-${from + k - 1} of ${n} (${act}).${beats}${recap}`;
      const extra = bibleText ? `STORY BIBLE (fixed for the whole film; restate the relevant look, location and outfits inside each shot because shots are generated independently): ${bibleText}` : '';
      let arr;
      try { arr = await spark.genScenes({ ask: (p, o) => this.ask(p, o), idea, n: k, ratio: a.ratio || '9:16', chars: charText, style: style && style.text, voice: a.voice || 'none', extra, film: true, uiLang: l }); }
      catch (e) { if (!out.length) throw e; partialErr = e.message; break; }
      out.push(...arr);
    }
    return { script: lines(out), scenes: out.length, usedChars: chars.length, bible: bibleText, bibleOk: !!bible,
      partial: partialErr ? t(l, 'tools.partialScenes', { got: out.length, want: n, err: partialErr }) : '' };
  }
  async filmQueue(a) {
    const l = this.uiLang();
    const script = String(a.script || '').trim(), title = flat(a.title) || t(l, 'tools.defaultFilmTitle');
    const n = script.split(/\r?\n/).filter(ln => ln.trim()).length;
    if (!n) throw new Error(t(l, 'tools.noScript'));
    if (n > MAX_FILM) throw new Error(t(l, 'tools.tooManyScenes', { got: n, max: MAX_FILM, mins: MAX_FILM / 6 }));
    // Cách giữ liền mạch (mặc định strict): balanced = khung cuối + chia nhóm song song (nhanh hơn nhưng đứt mạch ở chỗ cắt nhóm) · anchor = chỉ bám ảnh nhân vật, mọi cảnh song song · strict = tuần tự tuyệt đối
    const m = a.refMode || 'auto';
    const o = m === 'anchor' ? { continuity: false, parallel: 'fast', noFrame: true } : m === 'strict' ? { continuity: true, parallel: 'strict' } : { continuity: a.continuity !== false, parallel: m === 'balanced' ? 'smart' : 'auto' };
    const r = await this.queueTagged({ script, images: [], ratio: a.ratio || '9:16', prefix: 'Cinematic live-action film shot, photorealistic, natural motion, stable consistent faces and outfits, no on-screen text:', voice: a.voice || 'none', styleId: a.styleId,
      project: t(l, 'tools.filmProjectPrefix') + title.slice(0, 40), music: a.music || '', characterIds: a.characterIds || [], bible: flat(a.bible), film: true, ...o }, { film: true, title });
    for (const v of this.d.videos.filter(x => r.ids.includes(x.id))) v.title = title;
    this.e.changed(); this.e.start(); return { added: r.added };
  }

  // ---------- Video Aff ----------
  // Mô tả sản phẩm "sự thật" từ chính ảnh (hoặc do bạn nhập) -> chèn vào MỌI cảnh, để Muse không tự bịa màu/hình dáng/chữ trên bao bì.
  async describeProduct(name, images, userDesc) {
    if (flat(userDesc)) return flat(userDesc).slice(0, 900);
    if (!images.length) return '';
    const p = `Look at the attached product photo(s) (${images.length} view${images.length > 1 ? 's' : ''} of the same product named "${name}"). ` +
      'Describe ONLY what is literally visible, in English, 50-90 words, plain text: product type, overall shape and proportions, exact main colors, materials/finish, any printed text or logo copied exactly as written, packaging, buttons/details. ' +
      'Do not guess brand names, features or sizes that are not visible. No intro, no list.';
    try { const out = flat(await this.ask(p, { images })); return out.length > 30 ? out.slice(0, 900) : ''; } catch (e) { if (e.code === 412 || e.code === 596 || e.code === 500) throw e; return ''; }
  }
  async affCreate(a) {
    const l = this.uiLang();
    const name = flat(a.product);
    if (!name) throw new Error(t(l, 'tools.enterProduct'));
    const images = (a.images || []).filter(p => fs.existsSync(p)).slice(0, 4);
    const n = Math.min(12, Math.max(1, Math.round((+a.duration || 30) / SEC))), copies = Math.min(5, Math.max(1, +a.copies || 1));
    const voiceVal = a.voice === undefined ? l : a.voice;
    const ln = langName(voiceVal);
    const copyLang = ln || langName(l) || 'Vietnamese';
    this.need();
    const { charText } = this.pick(a), ids = [], notes = [];
    const formula = FORMULAS[a.formula] || flat(a.formula) || FORMULAS.review, platform = PLATFORMS[a.platform] || flat(a.platform) || PLATFORMS.tiktok;
    const prodDesc = await this.describeProduct(name, images, a.productDesc);
    if (images.length && !prodDesc) notes.push(t(l, 'tools.prodDescFailed'));
    for (let c = 0; c < copies; c++) {
      let plan = null, problem = '';
      for (let retry = 0; retry < 3 && !plan; retry++) {
        const sys = 'You are a TikTok/Reels affiliate video director and copywriter. Reply with ONLY one JSON object, no markdown: {"scenes":[string],"caption":string,"hashtags":[string],"pinned_comment":string}. ' +
          `Rules: exactly ${n} scenes of ~${SEC} seconds, English, each a vivid self-contained prompt for ONE realistic UGC-style shot (subject + one clear action, camera, light) that features the product with its packaging and look kept identical. ` +
          'In every scene call it just "the product" (or its name) and NEVER re-describe or change its color, shape, label or packaging: the verified product description below and the attached images are the only truth. ' +
          `Formula: ${formula}. Scene 1 is a strong 3-second hook; the last scene ends with a call to action. ` +
          'ONE VIDEO, ONE LOOK: all scenes are shots of the same video, so use the same presenter (same face, hair and outfit), same location and same lighting in every scene and restate them in a few words in each scene; only the camera angle, action and product focus change between scenes. If there is no person, keep the same surface, background and light. ' +
          'Do NOT invent prices, discounts, specs, certifications or guaranteed/medical results that are not given below. ' +
          (!ln ? 'No spoken dialogue. ' : `If a person speaks, put the line inside the scene as: says in ${ln}: "..." (max 25 words per scene). `) +
          `caption: ${copyLang} post caption (max 300 chars) with hook, main benefit and call to action. hashtags: 5-8 relevant ${copyLang}/English hashtags. pinned_comment: short ${copyLang} comment inviting viewers to buy.` + (problem ? `\nYOUR PREVIOUS ANSWER WAS REJECTED: ${problem}.` : '');
        const user = `Product: ${name}\nVerified product description (from the photos): ${prodDesc || '(none: only use what is visible in the attached images)'}\nPrice / offer: ${flat(a.price) || '(not given)'}\nKey points: ${flat(a.points) || '(none given: only describe what is visible in the image)'}\nTarget audience: ${flat(a.audience) || 'general'}\nPlatform: ${platform}\nVariant ${c + 1} of ${copies}${copies > 1 ? ' (use a clearly different hook and angle from the other variants)' : ''}`;
        try {
          const j = extractJson(await this.ask(sys + '\n\n' + user, { images }), l);   // gửi TẤT CẢ ảnh sản phẩm cho người viết kịch bản
          const sc = (Array.isArray(j.scenes) ? j.scenes : []).map(x => flat(typeof x === 'string' ? x : (x && (x.prompt || x.visual)) || '')).filter(Boolean);
          if (sc.length < n) { problem = `it had ${sc.length} scenes instead of ${n}`; continue; }
          plan = { scenes: sc.slice(0, n), caption: flat(j.caption), hashtags: (Array.isArray(j.hashtags) ? j.hashtags : []).map(h => '#' + String(h).replace(/^#/, '').replace(/\s+/g, '')).filter(h => h.length > 1), pinned: flat(j.pinned_comment) };
        } catch (e) { problem = e.message; if (e.code === 412 || e.code === 596 || e.code === 500) throw e; }
      }
      if (!plan) { notes.push(t(l, 'tools.affSkipVariant', { idx: c + 1, err: problem })); continue; }
      // Các cảnh aff là các cú máy khác nhau của CÙNG MỘT video: luôn chạy tuần tự trong cùng phiên chat Muse + chữ mô tả cảnh trước (cùng người/địa điểm/ánh sáng/sản phẩm).
      // Mặc định KHÔNG nối khung cuối ảnh tĩnh: nó làm sản phẩm trôi dần khỏi ảnh gốc.
      const cont = a.continuity === true;
      const r = await this.queueTagged({ script: lines(plan.scenes), images, ratio: a.ratio || '9:16', prefix: 'Create a realistic product video:', voice: voiceVal,
        project: t(l, 'tools.affProject'), continuity: true, cut: true, noFrame: !cont, parallel: 'auto', productText: prodDesc, music: a.music || '', characterIds: a.characterIds || [], styleId: a.styleId },
        { aff: { product: name, platform: a.platform || 'tiktok', link: flat(a.link), caption: plan.caption, hashtags: plan.hashtags, pinned: plan.pinned, variant: c + 1, productDesc: prodDesc } });
      for (const id of r.ids) { const v = this.d.videos.find(x => x.id === id); if (v) v.title = `${name}${copies > 1 ? ' #' + (c + 1) : ''}`; ids.push(id); }
    }
    if (!ids.length) throw new Error(notes.join(' ') || t(l, 'tools.affNoneCreated'));
    this.e.changed(); this.e.start(); return { added: ids.length, note: notes.join(' ') };
  }
  affText(id) {
    const v = this.d.videos.find(x => x.id === id), x = v && v.aff; if (!x) throw new Error(t(this.uiLang(), 'tools.affNotFound'));
    return [x.caption, x.link ? 'Link: ' + x.link : '', x.hashtags.join(' ')].filter(Boolean).join('\n\n');
  }

  // ---------- Codex AI (chat trợ lý) ----------
  aiState() { return this.d.aiChat; }
  async aiChat(a) {
    const l = this.uiLang();
    const msg = String(a.message || '').trim(); if (!msg) throw new Error(t(l, 'tools.enterQuestion'));
    this.need();
    const presets = getPresets(l);
    const sys = presets[a.preset] || presets.general;
    const userLbl = t(l, 'tools.chatUser'), aiLbl = t(l, 'tools.chatAi');
    const hist = this.d.aiChat.slice(-8).map(m => `${m.role === 'user' ? userLbl : aiLbl}: ${m.text.slice(0, 1500)}`).join('\n');
    const prompt = `${sys}\n\n${hist ? t(l, 'tools.chatPrev') + '\n' + hist + '\n\n' : ''}${userLbl}: ${msg}`.slice(0, 6000);
    const user = { id: uid(), role: 'user', text: msg, t: Date.now() };
    this.d.aiChat.push(user);
    try {
      const text = String(await this.ask(prompt)).trim();
      this.d.aiChat.push({ id: uid(), role: 'ai', text: text || t(l, 'tools.chatNoReply'), t: Date.now() });
    } catch (e) { this.d.aiChat.pop(); throw e; }
    if (this.d.aiChat.length > 60) this.d.aiChat = this.d.aiChat.slice(-60);
    this.e.changed(); return this.d.aiChat;
  }
  aiClear() { this.d.aiChat = []; this.e.changed(); return []; }
}
module.exports = { Tools, PRESETS, getPresets };
