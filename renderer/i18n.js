// Muse Studio i18n (vi / en / zh)
(() => {
  const SUPPORTED = ['vi', 'en', 'zh'];
  const LABELS = { vi: 'Tiếng Việt', en: 'English', zh: '中文' };
  const HTML_LANG = { vi: 'vi', en: 'en', zh: 'zh-CN' };
  const LOCALES = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };
  const LS_KEY = 'ms.lang';

  const lsGet = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const norm = l => (SUPPORTED.includes(l) ? l : 'vi');

  const DICT = {
    vi: {
      nav: {
        tagline: 'Render video AI hàng loạt',
        home: 'Trang chủ',
        grpCreate: 'Tạo video',
        script: 'Kịch bản',
        studio: 'Studio kênh',
        film: 'Làm phim',
        aff: 'Video Aff',
        grpManage: 'Quản lý',
        library: 'Kho video',
        sync: 'Nhân vật & phong cách',
        codex: 'Trợ lý AI',
        grpSystem: 'Hệ thống',
        accounts: 'Tài khoản',
        settings: 'Cài đặt',
        guide: 'Hướng dẫn'
      },
      top: {
        allProjects: 'Tất cả dự án',
        accPill: 'Tài khoản: {active} đang chạy · {ok}/{total} sẵn sàng',
        langTitle: 'Language / Ngôn ngữ / 语言',
        themeTitle: 'Đổi giao diện sáng / tối',
        resume: '▶ Chạy tiếp',
        stopAll: 'Dừng tất cả',
        outDir: '📁 Thư mục video'
      },
      common: {
        none: 'Không',
        save: 'Lưu',
        cancel: 'Huỷ',
        cancelEdit: 'Huỷ sửa',
        edit: 'Sửa',
        delete: 'Xoá',
        open: 'Mở',
        openDir: 'Mở thư mục',
        retry: 'Thử lại',
        stop: 'Dừng',
        pick: 'Chọn',
        pickFile: 'Chọn file',
        pickImages: 'Chọn ảnh',
        clearImages: 'Bỏ hết ảnh',
        zeroImages: '0 ảnh',
        imagesCount: '{n} ảnh',
        imagesSelected: '{n} ảnh đã chọn',
        sec10: '10 giây',
        sec20: '20 giây',
        sec30: '30 giây',
        sec40: '40 giây',
        sec60: '60 giây',
        under1Min: 'dưới 1 phút',
        mins: '{m} phút',
        hours: '{h} giờ',
        hoursMins: '{h} giờ {m} phút',
        errorPrefix: 'Lỗi: {msg}',
        confirmDelFiles: 'Xoá cả file video trên ổ đĩa?\nOK = xoá cả file, Cancel = chỉ xoá khỏi danh sách'
      },
      status: {
        pending: 'Chờ',
        running: 'Đang làm',
        done: 'Xong',
        error: 'Lỗi',
        skipped: 'Bỏ qua'
      },
      voice: {
        none: 'Không lồng tiếng',
        noneShort: 'Không',
        vi: 'Tiếng Việt',
        en: 'Tiếng Anh',
        ja: 'Tiếng Nhật',
        ko: 'Tiếng Hàn',
        zh: 'Tiếng Trung',
        th: 'Tiếng Thái',
        fr: 'Tiếng Pháp',
        es: 'Tiếng Tây Ban Nha'
      },
      customSelect: {
        otherOption: '✎ Khác (tự nhập)…',
        defaultPh: 'Nhập giá trị của bạn…'
      },
      home: {
        heroTitle: 'Tạo video AI <em>hàng loạt</em>,<br>chỉ với một ý tưởng.',
        heroDesc: 'Viết kịch bản (hoặc chỉ cần một ý tưởng), thêm vào hàng đợi, và để Muse Studio tự render, nối cảnh, đổi tài khoản khi hết hạn mức và ghép thành video hoàn chỉnh.',
        ctaScript: 'Soạn kịch bản chi tiết',
        ctaGuide: 'Xem hướng dẫn',
        quick: {
          title: '⚡ Tạo nhanh',
          sub: 'Gõ ý tưởng, bấm một nút: app tự viết kịch bản, chia cảnh, render song song nhiều tài khoản và ghép video.',
          ideaPh: 'VD: Cô gái pha cà phê buổi sáng trong căn bếp ấm áp, nắng chiếu qua cửa sổ, cận cảnh hơi nước bốc lên...',
          dur: 'Thời lượng',
          ratio: 'Tỉ lệ',
          copies: 'Số video',
          voice: 'Lồng tiếng',
          pickImg: '🖼 Ảnh tham chiếu',
          noImg: 'không có ảnh',
          imgCountMore: '{n} ảnh (nhấn lại để thêm)',
          estIdle: 'Nhập ý tưởng để xem ước tính.',
          go: '⚡ Tạo & render ngay',
          needIdea: 'Nhập ý tưởng cho video.',
          planning: 'Đang viết kịch bản…',
          projectDefault: 'Tạo nhanh',
          createdToast: 'Đã tạo {n} video và bắt đầu render. Theo dõi ở khung "Luồng tài khoản".',
          addFail: 'Không thêm được video.',
          charsLabel: 'Nhân vật:'
        },
        lanes: {
          title: 'Luồng tài khoản',
          hint: 'Mỗi tài khoản render 1 clip một lúc; app tự chia việc và chuyển sang tài khoản khác khi một tài khoản hết hạn mức hoặc lỗi.',
          check: 'Kiểm tra phiên đăng nhập',
          sceneWork: 'Cảnh {i}/{n} · {title}',
          preparing: 'Đang chuẩn bị…',
          idle: 'Đang rảnh',
          usedScenes: '{n} cảnh',
          empty: 'Chưa có tài khoản. Vào mục Tài khoản để thêm.'
        },
        eta: {
          runningEta: 'Đang chạy · còn ~{dur}',
          running: 'Đang chạy',
          stopped: 'Đang dừng'
        },
        queue: {
          title: 'Đang xử lý',
          hintSome: 'Bấm một video để xem chi tiết.',
          hintEmpty: 'Không có video nào đang chờ. Hãy tạo video ở khung Tạo nhanh.',
          itemMeta: '{done}/{total} cảnh',
          chains: ' · {n} nhóm song song'
        },
        stats: {
          ready: 'Tài khoản sẵn sàng',
          running: 'Đang render',
          pending: 'Đang chờ',
          done: 'Hoàn thành',
          error: 'Bị lỗi',
          maxPar: 'Clip chạy cùng lúc (tối đa)'
        },
        steps: {
          title: 'Bắt đầu trong 5 phút',
          hint: 'Các bước tự đánh dấu khi bạn hoàn thành.',
          next: 'Tiếp theo',
          s1Title: 'Thêm tài khoản Muse',
          s1Desc: 'Mục Tài khoản → OTP hoặc cookie.',
          s2Title: 'Có tài khoản sẵn sàng',
          s2Desc: 'Tài khoản đăng nhập hợp lệ và chưa hết hạn mức.',
          s3Title: 'Tạo nhân vật (tuỳ chọn)',
          s3Desc: 'Giữ ngoại hình nhất quán xuyên suốt video.',
          s4Title: 'Tạo video đầu tiên',
          s4Desc: 'Gõ ý tưởng ở khung ⚡ Tạo nhanh phía trên.',
          s5Title: 'Render xong video đầu tiên',
          s5Desc: 'Theo dõi ở khung Luồng tài khoản; video xong nằm trong Kho video.'
        },
        recent: {
          title: 'Video gần đây',
          empty: 'Chưa có video nào hoàn thành.'
        },
        cards: {
          scriptTitle: 'Kịch bản',
          scriptDesc: 'Dán kịch bản hoặc để AI chia cảnh. Hỗ trợ thẻ [Tên nhân vật].',
          studioTitle: 'Studio kênh',
          studioDesc: 'Làm đủ N tập mỗi ngày cho một kênh, có giọng đọc và phụ đề.',
          filmTitle: 'Làm phim',
          filmDesc: 'AI viết cốt truyện nhiều đợt để phim liền mạch.',
          affTitle: 'Video Aff',
          affDesc: 'Kịch bản bán hàng + caption + hashtag cho TikTok / Reels.',
          codexTitle: 'Trợ lý AI',
          codexDesc: 'Viết prompt, ý tưởng, caption ngay trong app.'
        },
        est: {
          noAcc: 'Chưa có tài khoản sẵn sàng: vào mục Tài khoản để thêm hoặc kiểm tra.',
          summary: '≈ {nVideos} video · {clips} clip Muse (~{sec} giây video){extra}. {acc} tài khoản sẵn sàng → chạy {par} clip cùng lúc{chains}{eta}.',
          chains: ' (mỗi video chia {per} nhóm cảnh)',
          eta: ' · dự kiến ~{dur}',
          extraPerVideo: ' · Muse sẽ viết thêm {n} cảnh/video',
          extraQuick: ' · Muse viết {n} cảnh/video',
          tipAuto: ' Mẹo: chọn chế độ Tự động để video dài chạy song song nhiều tài khoản.',
          needImg: 'Chọn ít nhất 1 ảnh: mỗi ảnh sẽ ra một video riêng.',
          needScript: 'Nhập kịch bản (mỗi dòng một cảnh) để xem ước tính.',
          etaSuffix: ' · còn ~{dur}'
        },
        tpl: {
          productName: 'Quảng cáo sản phẩm',
          productBody: '0-10s: Opening hook, a striking close-up reveal of the product, glossy light, shallow depth of field, slow push-in\n10-20s: A person naturally using and enjoying the product in a warm everyday setting, handheld camera, genuine reaction\n20-30s: Final shot, the product centered with its packaging clearly visible, confident camera pull-back, clean ending',
          characterName: 'Câu chuyện nhân vật',
          characterBody: '[Tên nhân vật] walks into a sunlit kitchen, curious, slow tracking shot\n[Tên nhân vật] discovers something unexpected on the table, close-up of the surprised face\n[Tên nhân vật] laughs and shares it with the family, warm wide shot, cozy light',
          vlogName: 'Du lịch / vlog',
          vlogBody: '0-10s: Sunrise over a quiet old town, drone shot slowly descending, golden light\n10-20s: A traveler walks through a busy morning market, handheld, vivid colors, ambient sound\n20-30s: The traveler sits at a street-side cafe enjoying breakfast, shallow depth of field, relaxed mood'
        },
        retryAllNone: 'Không có video nào đang lỗi.',
        retryAllDone: 'Đã thử lại {n} video lỗi.'
      },
      script: {
        title: 'Tạo video từ kịch bản',
        sub: 'Viết mỗi dòng một cảnh (≈10 giây), hoặc chọn "Từ ảnh" để mỗi ảnh ra một video. Thêm vào hàng đợi rồi bấm Bắt đầu render.',
        tabScript: 'Kịch bản',
        tabImage: 'Từ ảnh',
        placeholder: 'VD:\n0-10s: Cô gái Việt mở hộp gà giữa kho hàng, cận cảnh đèn Noel\n10-20s: Cả gia đình quây quần mở quà hộp lịch Giáng Sinh\n(Mỗi 10 giây = 1 cảnh. Chế độ \'Từ ảnh\': để trống để AI tự nghĩ.)\nNhiều nhân vật: ghi [Bắp, Mẹ] ở đầu dòng để chỉ rõ ai có mặt trong cảnh đó; không ghi thì app tự nhận theo tên trong câu.',
        tplLabel: 'Chèn mẫu:',
        refHint: 'Chế độ "Từ ảnh": mỗi ảnh ra 1 video riêng. Chế độ "Kịch bản": ảnh là tham chiếu sản phẩm.',
        ratio: 'Tỉ lệ',
        duration: 'Thời lượng',
        durPh: 'vd: 75 giây, 1:30, 2 phút',
        dur10: '10 giây (1 cảnh)',
        dur20: '20 giây (2 cảnh)',
        dur30: '30 giây (3 cảnh)',
        dur40: '40 giây (4 cảnh)',
        dur60: '60 giây (6 cảnh)',
        durAuto: 'Theo số dòng kịch bản',
        voice: 'Giọng đọc',
        voicePh: 'vd: Tiếng Thái, Japanese',
        style: 'Phong cách / ý tưởng',
        charsHint: 'Nhân vật (đồng bộ ngoại hình xuyên suốt):',
        advTitle: '⚙ Tuỳ chọn nâng cao',
        prefixLabel: 'Tiền tố câu lệnh',
        projectLabel: 'Dự án',
        projectPh: 'vd: KOREAN BBQ',
        copiesLabel: 'Số bản / video',
        parallelLabel: 'Chế độ chạy song song',
        parDefault: 'Theo Cài đặt (khuyên dùng)',
        parAuto: 'Tự động: ngắn liền mạch, dài tự chia chương song song',
        parSmart: 'Thông minh: chia nhóm cảnh chạy song song',
        parStrict: 'Liền mạch tuyệt đối: tuần tự',
        parFast: 'Nhanh nhất: mọi cảnh song song',
        continuity: 'Nối liền mạch giữa các cảnh (lấy khung cuối cảnh trước)',
        useAI: 'Dùng Muse viết/chia cảnh khi thiếu',
        useMusic: 'Ghép nhạc nền',
        autoStart: 'Tự bắt đầu render ngay sau khi thêm',
        estIdle: 'Nhập kịch bản để xem ước tính.',
        addBtn: 'Đưa vào hàng đợi',
        preparing: 'Đang chuẩn bị (AI chia cảnh)...',
        colVideo: 'Video',
        colStatus: 'Trạng thái',
        colActions: 'Thao tác',
        defaultPrefix: 'Tạo video chân thực:'
      },
      queue: {
        selectAll: 'Chọn tất cả',
        deselectAll: 'Bỏ chọn',
        delSelectedInit: 'Xoá đã chọn (0)',
        delSelected: 'Xoá đã chọn ({n})',
        retryAll: '↻ Thử lại tất cả lỗi',
        clearDone: 'Xoá video đã xong',
        startRender: '▶ Bắt đầu render',
        summary: 'Đang làm {run} video · {done}/{total} xong · {err} lỗi{eta}',
        filterAll: 'Tất cả {n}',
        filterPending: 'Chờ {n}',
        filterRunning: 'Đang làm {n}',
        filterDone: 'Xong {n}',
        filterError: 'Lỗi {n}',
        rowMeta: '{n} cảnh · {prog} xong · {ratio} · {project}',
        empty: 'Hàng đợi trống. Nhập kịch bản rồi bấm "Đưa vào hàng đợi".',
        openDirTitle: 'Mở thư mục',
        retryTitle: 'Thử lại',
        confirmClearDone: 'Xoá toàn bộ video đã xong khỏi danh sách (giữ file trên ổ đĩa)?',
        selectPrompt: 'Chọn một video bên trái để xem.',
        projectLabel: 'Dự án:',
        sceneTitle: 'Cảnh {n}',
        regenBtn: '↻ Tạo lại',
        regenTitle: 'Tạo lại riêng cảnh {n} (các cảnh khác giữ nguyên)',
        editBtn: '✎ Sửa',
        editTitle: 'Sửa nội dung cảnh rồi tạo lại',
        skipBtn: '⏭ Bỏ qua',
        skipTitle: 'Bỏ qua cảnh này, ghép video từ các cảnh còn lại',
        softened: 'mức làm nhẹ {n}/3',
        noChar: 'không có nhân vật',
        guessedChar: ' (đoán)',
        saveRegen: 'Lưu & tạo lại',
        tagsPh: 'Nhãn (cách nhau dấu phẩy)',
        notePh: 'Ghi chú',
        confirmSkip: 'Bỏ qua Cảnh {n}?\nVideo sẽ ghép từ các cảnh còn lại.',
        confirmRegen: 'Tạo lại riêng Cảnh {n}?\nCác cảnh khác giữ nguyên, video sẽ được ghép lại sau khi xong.'
      },
      preview: {
        title: 'Xem trước & chi tiết'
      },
      library: {
        title: 'Kho video',
        sub: 'Tất cả video đã hoàn thành. Tìm theo tên, nhãn hoặc ghi chú.',
        searchPh: 'Tìm theo tên, nhãn, ghi chú...',
        count: '{n} video',
        secDur: '{n}s',
        openBtn: '📁 Mở',
        rejoinBtn: '🔄 Ghép lại',
        rejoinTitle: 'Ghép lại các clip với cài đặt chuyển mờ/đồng bộ màu hiện tại',
        rejoining: 'Đang ghép...',
        empty: 'Chưa có video nào hoàn thành.',
        confirmDel: 'Xoá video này và file trên ổ đĩa?',
        toastRejoined: 'Đã ghép lại video',
        toastRejoinErr: 'Ghép lại lỗi'
      },
      sync: {
        title: 'Nhân vật & phong cách',
        sub: 'Lưu một lần, dùng cho mọi video để ngoại hình và không khí hình ảnh nhất quán.',
        charTitle: '🧍 Nhân vật đồng bộ',
        charHint: 'Ảnh tham chiếu + mô tả cố định được chèn vào MỌI cảnh để nhân vật giống nhau từ đầu đến cuối.',
        charNamePh: 'Tên nhân vật (vd: Lan)',
        charDescPh: 'Mô tả cố định: tuổi, khuôn mặt, tóc, trang phục... (tiếng Anh cho chuẩn)',
        charPickBtn: 'Chọn ảnh (1–2 ảnh rõ mặt)',
        charAutoBtn: 'Tự mô tả từ ảnh',
        charAutoTitle: 'Muse nhìn ảnh và viết mô tả ngoại hình cố định',
        charDescribing: 'Đang mô tả...',
        charSaveBtn: 'Lưu nhân vật',
        charEmpty: 'Chưa có nhân vật.',
        confirmDelChar: 'Xoá nhân vật này?',
        styleTitle: '💡 Ý tưởng / Phong cách',
        styleHint: 'Khối văn bản bối cảnh, màu sắc, ánh sáng, mood... dùng lại cho nhiều video.',
        styleNamePh: 'Tên (vd: Giáng Sinh ấm áp)',
        styleTextPh: 'Vd: warm Christmas market at night, golden fairy lights, snowy background, cinematic soft film look',
        styleAutoBtn: 'Tự mô tả bằng AI',
        styleAutoTitle: 'Muse viết mô tả phong cách dựa trên tên (và ghi chú bạn đã nhập)',
        styleWriting: 'Đang viết...',
        styleEmpty: 'Chưa có ý tưởng/phong cách.',
        confirmDelStyle: 'Xoá mục này?',
        noCharPicker: 'Chưa có nhân vật – tạo ở mục Đồng bộ.',
        noStyleOption: '— Không dùng —',
        toastPickFirst: 'Chọn ảnh nhân vật trước.',
        toastCharDescribed: 'Đã tạo mô tả, bạn có thể sửa lại rồi Lưu',
        toastCharDescribeErr: 'Lỗi mô tả ảnh',
        toastCharSaved: 'Đã lưu nhân vật',
        toastStyleNeedName: 'Nhập tên ý tưởng/phong cách trước.',
        toastStyleDescribeErr: 'Lỗi tạo mô tả',
        toastStyleSaved: 'Đã lưu'
      },
      accounts: {
        title: 'Tài khoản Muse',
        sub: 'Mỗi tài khoản render 1 video một lúc. Thêm nhiều tài khoản để chạy song song và tự chuyển khi hết hạn mức.',
        otpTitle: 'Thêm tài khoản Muse',
        otpHint: 'Đăng nhập bằng mã OTP gửi về email/số điện thoại của tài khoản Muse (không cần mật khẩu, không qua dịch vụ trả phí). Phiên đăng nhập chỉ lưu trên máy bạn. Đây là giao thức nội bộ không chính thức của Muse nên có thể hỏng khi Muse đổi hệ thống; nên dùng tài khoản phụ.',
        emailPh: 'Email Muse',
        sendOtp: 'Gửi mã OTP',
        otpPh: 'Mã OTP',
        confirmAdd: 'Xác nhận & thêm',
        cookieTitle: 'Hoặc nhập cookie từ trình duyệt',
        cookieHint: 'Dùng khi bạn đăng nhập muse.ai bằng mật khẩu hoặc 2FA: đăng nhập trên Chrome, xuất cookie của muse.ai (extension Cookie-Editor → Export → JSON, hoặc file cookies.txt) rồi dán vào đây. Cookie có giá trị như mật khẩu: không gửi cho ai. Phiên hết hạn thì nhập lại.',
        cookieEmailPh: 'Email Muse (để đặt tên tài khoản)',
        cookieAdd: 'Nhập cookie',
        cookieTextPh: 'Dán JSON hoặc nội dung cookies.txt',
        listTitle: 'Danh sách tài khoản',
        checkAll: 'Kiểm tra tất cả',
        resetAll: 'Đặt lại tất cả',
        checkBridge: 'Kiểm tra bridge',
        listHint: 'Khi một tài khoản hết hạn mức tuần (412), bị chặn (596) hoặc lỗi liên tục, app tự chuyển cảnh đó sang tài khoản khác và làm tiếp.',
        disabled: 'Đang tắt',
        blocked: 'Bị chặn / cần đăng nhập lại',
        exhaustedUntil: 'Tạm nghỉ đến {time}',
        ready: 'Sẵn sàng',
        colEmail: 'Email',
        colStatus: 'Trạng thái',
        colRunning: 'Đang chạy',
        colUsed: 'Đã giao',
        colLastErr: 'Lỗi gần nhất',
        colSession: 'Phiên đăng nhập',
        sessionOk: '✓ Phiên hợp lệ ({time})',
        sessionErrFallback: 'Phiên lỗi',
        btnCheck: 'Kiểm tra',
        btnEnable: 'Bật',
        btnDisable: 'Tắt',
        btnReset: 'Đặt lại',
        empty: 'Chưa có tài khoản. Thêm ở khung bên trên.',
        confirmRemove: 'Xoá tài khoản và phiên đăng nhập đã lưu trên máy?',
        toastSessionOk: 'Phiên đăng nhập hợp lệ ✓',
        toastSessionBad: 'Phiên lỗi: {msg}',
        toastAdded: 'Đã thêm tài khoản',
        toastOtpSent: 'Đã gửi mã OTP. Nhập mã rồi bấm Xác nhận.',
        toastCookieAdded: 'Đã nhập cookie và xác nhận phiên hợp lệ',
        toastCheckAll: 'Phiên hợp lệ: {ok}/{total} tài khoản.{extra}',
        toastCheckAllExtra: ' Tài khoản lỗi đã được đánh dấu.',
        toastResetAll: 'Đã đặt lại trạng thái mọi tài khoản.',
        toastBridgeOk: 'Bridge hoạt động. Có {n} phiên đăng nhập lưu trên máy.'
      },
      studio: {
        title: 'Studio kênh',
        sub: 'Một yêu cầu → kịch bản → render → giọng/phụ đề → kiểm tra → thư mục tập. Làm hàng loạt theo mục tiêu mỗi ngày.',
        todayTitle: 'Hôm nay',
        continueBtn: '▶ Làm tiếp hôm nay',
        continueMore: '▶ Làm tiếp hôm nay ({retryPart}còn {missing} tập)',
        continueRetryPart: 'thử lại {failed} lỗi + ',
        continueDone: '✔ Đủ mục tiêu hôm nay',
        moreSummary: 'Tạo thêm / nhập ý tưởng riêng',
        moreCountLabel: 'Số tập tạo thêm',
        moreBtn: 'Tạo thêm (AI tự nghĩ ý tưởng)',
        ideasPh: 'Hoặc gõ ý tưởng của bạn, mỗi dòng 1 tập (để trống thì AI tự nghĩ):\nBắp lén ăn bánh trước bữa cơm\nBắp đi chợ cùng mẹ',
        fromIdeasBtn: 'Tạo các tập từ danh sách trên',
        newEpTitle: 'Sản xuất tập mới',
        newEpHint: 'Chỉ cần một yêu cầu tự nhiên. App tự lập kịch bản, chia cảnh, render, thêm giọng/phụ đề, kiểm tra và xuất thư mục tập. Nhân vật lấy từ mục Đồng bộ (Character Bible), tài khoản ở mục Tài khoản.',
        newChBtn: '+ Kênh mới',
        reqPh: 'VD: Gia đình nhà Bắp — tạo tập mới về Bắp lén ăn bánh trước bữa cơm.',
        goBtn: 'Sản xuất tập mới',
        epsTitle: 'Các tập',
        noChannelOpt: '(chưa có kênh)',
        progHtml: '<b>{made}</b>/{target} tập đã tạo hôm nay · {finished} xong · {posted} đã đăng',
        progFailed: ' · <span style="color:#ff8a8d">{failed} lỗi</span>',
        contHint: 'Cần ~{clips} clip Muse, đang có {acc} tài khoản sẵn sàng. Mỗi tài khoản có hạn mức theo tuần.',
        needChannelHint: 'Tạo kênh ở khung "Cấu hình kênh" bên dưới.',
        hintMeta: '{ratio} · {dur}s · {voice} · {chars} nhân vật',
        voiceShort: { muse: 'Muse tự đọc', tts: 'TTS', none: 'không lời' },
        charsLabel: 'Nhân vật (Character Bible):',
        charsEmpty: 'Chưa có nhân vật. Tạo ở mục Đồng bộ (🧬) rồi quay lại chọn.',
        st: {
          planning: 'Đang lập kịch bản',
          queued: 'Chờ render',
          rendering: 'Đang render',
          finishing: 'Đang hoàn thiện',
          done: 'Hoàn tất',
          review: 'Cần xem lại',
          error: 'Lỗi'
        },
        scSt: { pending: 'chờ', running: 'chạy', done: 'xong', error: 'lỗi' },
        filters: { ready: 'Chờ đăng', work: 'Đang làm', error: 'Lỗi', posted: 'Đã đăng', all: 'Tất cả' },
        ep: {
          qcTitle: 'Kết quả kiểm tra chất lượng',
          notChecked: 'Chưa kiểm tra: {name}',
          sceneChip: 'C{n} {st}',
          regenSceneTitle: 'Tạo lại riêng cảnh {n}',
          postedBadge: 'Đã đăng',
          watchVideo: '▶ Xem video',
          logTitle: 'Nhật ký',
          copyPost: 'Sao chép bài đăng',
          unmarkPosted: 'Bỏ đánh dấu đã đăng',
          markPosted: 'Đã đăng',
          emptyReady: 'Chưa có tập nào chờ đăng. Bấm "Làm tiếp hôm nay" ở trên.',
          emptyOther: 'Không có tập nào.'
        },
        confirm: {
          regenScene: 'Tạo lại riêng Cảnh {n}?\nCác cảnh khác giữ nguyên, tập sẽ ghép + kiểm tra + xuất lại sau khi xong.',
          delEp: 'Xoá tập này khỏi danh sách? (file đã xuất giữ nguyên)',
          delCh: 'Xoá kênh này?'
        },
        toast: {
          copiedPost: 'Đã sao chép tiêu đề + mô tả + hashtag',
          todayStarted: 'Đã bắt đầu: tạo mới {created}, thử lại {retried}.',
          todayMet: 'Hôm nay đã đủ mục tiêu.',
          batchStarted: 'Đã bắt đầu {created} tập mới.',
          ideasStarted: 'Đã bắt đầu {created} tập{skipped}.',
          ideasSkipped: ', bỏ qua {n} (trùng)',
          needChName: 'Nhập tên kênh trước khi lưu',
          chSaved: 'Đã lưu kênh: {name}',
          epStarted: 'Đã bắt đầu sản xuất tập mới.'
        },
        form: {
          title: 'Cấu hình kênh',
          newTitle: 'Kênh mới',
          editTitle: 'Sửa kênh: {name}',
          name: 'Tên kênh',
          namePh: 'Gia đình nhà Bắp',
          style: 'Phong cách hình ảnh cố định',
          stylePh: '3D Pixar-style, warm cozy home lighting',
          ratio: 'Tỷ lệ',
          dur: 'Thời lượng mục tiêu (giây, 10–60)',
          lang: 'Ngôn ngữ',
          voiceMode: 'Giọng nói',
          voiceMuse: 'Muse tự đọc lời thoại trong video',
          voiceTts: 'Giọng đọc TTS (edge-tts) trộn vào video',
          voiceNone: 'Không lời thoại',
          ttsDefault: 'Giọng TTS mặc định (tuỳ chọn)',
          ttsMap: 'Giọng theo nhân vật (mỗi dòng Tên=giọng)',
          ttsMapPh: 'Bắp=vi-VN-NamMinhNeural',
          dailyTarget: 'Số video mỗi ngày (mục tiêu)',
          ideaSeeds: 'Hướng nội dung / chủ đề (mỗi dòng 1 ý, AI dựa vào đây để nghĩ tập mới)',
          ideaSeedsPh: 'Bắp nghịch ngợm trong nhà\nBắp và mẹ nấu ăn\nBắp đi chơi cuối tuần',
          avoid: 'Điều cần tránh thêm (tuỳ chọn)',
          avoidPh: 'cảnh bạo lực, nhân vật nhìn thẳng ống kính',
          subtitles: 'Tạo phụ đề .srt',
          continuity: 'Nối liền mạch giữa các cảnh',
          music: 'Nhạc nền',
          delBtn: 'Xoá kênh',
          saveBtn: 'Lưu kênh'
        }
      },
      film: {
        title: 'Làm phim',
        sub: 'Từ ý tưởng đến phim nhiều cảnh liền mạch (tối đa 6 phút).',
        cardTitle: '🎥 Làm phim',
        cardHint: 'Từ một ý tưởng → AI viết kịch bản nhiều cảnh (mỗi cảnh ~10 giây, viết theo từng đợt để cốt truyện liền mạch) → bạn sửa → render và ghép thành một phim. Tối đa 60 cảnh (10 phút).',
        nameLabel: 'Tên phim',
        namePh: 'vd: Chuyến tàu cuối',
        genreLabel: 'Thể loại',
        genrePh: 'vd: kinh dị hài, trinh thám noir, võ hiệp',
        genres: {
          drama: 'Tâm lý / cảm xúc',
          action: 'Hành động / kịch tính',
          comedy: 'Hài nhẹ',
          horror: 'Bí ẩn / hồi hộp',
          fantasy: 'Giả tưởng phiêu lưu',
          scifi: 'Khoa học viễn tưởng',
          romance: 'Tình cảm',
          doc: 'Phim tài liệu'
        },
        modeLabel: 'Cách giữ nhân vật & cảnh liền mạch',
        modes: {
          auto: 'Tự động (khuyên dùng): liền mạch, phim dài tự chia chương chạy song song',
          strict: 'Liền mạch tuyệt đối: tuần tự từng cảnh (chậm nhất)',
          balanced: 'Nhanh hơn: chia nhóm chạy song song (đứt mạch ở chỗ cắt nhóm)',
          anchor: 'Bám nhân vật tối đa: không nối khung, chỉ dùng ảnh gốc, chạy nhanh'
        },
        premiseLabel: 'Ý tưởng / tóm tắt cốt truyện',
        premisePh: 'vd: Một cô gái trẻ lạc vào ga tàu cũ lúc nửa đêm và gặp người soát vé từ 50 năm trước...',
        durLabel: 'Thời lượng',
        durPh: 'vd: 150 giây, 2:30, 4 phút',
        durs: {
          d30: '30 giây (3 cảnh)',
          d60: '1 phút (6 cảnh)',
          d90: '1 phút 30 (9 cảnh)',
          d120: '2 phút (12 cảnh)',
          d180: '3 phút (18 cảnh)',
          d300: '5 phút (30 cảnh)',
          d600: '10 phút (60 cảnh)'
        },
        ratioLabel: 'Tỉ lệ',
        ratioPh: 'vd: 21:9 (chỉ dùng 16:9, 9:16, 1:1, 3:4 được ghép chuẩn)',
        voiceLabel: 'Ngôn ngữ lời thoại',
        voicePh: 'vd: Tiếng Thái, Italian',
        styleLabel: 'Phong cách / ý tưởng',
        charsHint: 'Nhân vật (đồng bộ ngoại hình):',
        bibleLabel: 'Bible phim (cố định xuyên suốt: phong cách quay, bối cảnh, trang phục nhân vật; AI tự điền khi viết kịch bản, bạn sửa được và nó được chèn vào MỌI cảnh)',
        biblePh: 'Bấm Viết kịch bản bằng AI để tự tạo, hoặc tự viết. Vd: Look: 35mm film, teal-orange grade. Locations: old train station at night... Fixed outfits: Lan: red wool coat, black bob hair...',
        musicLabel: 'Nhạc nền',
        planBtn: '✍️ Viết kịch bản bằng AI',
        planningBtn: 'AI đang viết (có thể vài phút)...',
        scriptTitle: 'Kịch bản (sửa được, mỗi dòng 1 cảnh)',
        scriptPh: 'Bấm "Viết kịch bản bằng AI" hoặc tự dán theo dạng:\n0-10s: ...\n10-20s: ...',
        scriptHint: 'Phim được thêm vào hàng đợi chung và dùng các tài khoản Muse như mục Kịch bản.',
        goBtn: '🎬 Render phim',
        queueingBtn: 'Đang đưa vào hàng đợi...',
        listTitle: 'Phim của bạn',
        empty: 'Chưa có phim nào.',
        countMeta: '{n} cảnh · ~{sec}s',
        invalidDur: 'Thời lượng tự nhập chưa hợp lệ (vd: 150, 2:30, 4 phút).',
        confirmReplace: 'Thay kịch bản hiện tại bằng kịch bản AI viết mới?',
        plannedToast: 'AI đã viết {scenes} cảnh{bibleNote} Đọc và sửa trước khi render.',
        bibleOk: ' kèm bible phim.',
        bibleManual: '. Không lập được bible tự động, hãy tự điền ô Bible để phim liền mạch hơn.',
        queuedToast: 'Đã đưa phim vào hàng đợi ({added}) và bắt đầu render.'
      },
      aff: {
        title: 'Video Aff',
        sub: 'Ảnh sản phẩm → kịch bản bán hàng, caption, hashtag và bình luận ghim → video.',
        cardTitle: '🛍️ Video Aff',
        cardHint: 'Nhập sản phẩm + ảnh → AI viết kịch bản bán hàng theo công thức, kèm caption, hashtag và bình luận ghim → render video. App không bịa giá/khuyến mãi: chỉ dùng thông tin bạn nhập. App không tự đăng bài.',
        productLabel: 'Tên sản phẩm',
        productPh: 'vd: Máy xay mini cầm tay',
        priceLabel: 'Giá / ưu đãi (tuỳ chọn)',
        pricePh: 'vd: 199k, freeship',
        pointsLabel: 'Điểm nổi bật (mỗi ý một dòng hoặc cách nhau dấu phẩy)',
        pointsPh: 'Pin 4000mAh, sạc Type-C, xay đá được, rửa dễ',
        descLabel: 'Mô tả ngoại hình sản phẩm (tuỳ chọn; để trống thì AI tự mô tả từ ảnh rồi chèn vào mọi cảnh để sản phẩm không bị sai)',
        descPh: 'vd: matte white cylinder blender, 20cm tall, black lid, blue logo MINIX on the front...',
        audLabel: 'Đối tượng khách',
        audPh: 'vd: dân văn phòng, mẹ bỉm sữa',
        linkLabel: 'Link affiliate (đưa vào bài đăng)',
        platLabel: 'Nền tảng',
        platPh: 'vd: YouTube Shorts, Lazada Video',
        plats: { tiktok: 'TikTok', shopee: 'Shopee Video', reels: 'Facebook / Instagram Reels' },
        formLabel: 'Công thức',
        formPh: 'vd: so sánh với sản phẩm cũ, ASMR đóng gói, kể chuyện khách hàng',
        forms: {
          review: 'Review chân thực',
          problem: 'Vấn đề → giải pháp',
          unbox: 'Unboxing',
          beforeafter: 'Trước / sau',
          top: '3 lý do nên mua'
        },
        durLabel: 'Thời lượng',
        durPh: 'vd: 45 giây, 1 phút 30',
        copiesLabel: 'Số biến thể (mỗi bản hook khác nhau)',
        voiceLabel: 'Ngôn ngữ lời thoại',
        voicePh: 'vd: Tiếng Thái, Indonesian',
        ratioLabel: 'Tỉ lệ',
        ratioPh: 'vd: 4:5',
        refHint: 'Chọn 1–4 ảnh sản phẩm rõ nét, nhiều góc (AI nhìn tất cả để mô tả và viết kịch bản).',
        contLabel: 'Nối thêm ảnh khung cuối (dễ làm lệch sản phẩm, mặc định tắt)',
        contTitle: 'Các cảnh Aff luôn chạy tuần tự trong cùng một phiên chat Muse để giữ cùng người/địa điểm/ánh sáng/sản phẩm. Bật thêm mục này thì cảnh sau còn lấy ảnh khung cuối cảnh trước làm tham chiếu: liền mạch hơn nhưng sản phẩm dễ trôi khỏi ảnh gốc',
        goBtn: '🛍️ Tạo video Aff',
        generatingBtn: 'AI đang mô tả sản phẩm & viết kịch bản...',
        listTitle: 'Video Aff đã tạo',
        empty: 'Chưa có video Aff nào.',
        invalidDur: 'Thời lượng tự nhập chưa hợp lệ.',
        createdToast: 'Đã tạo {added} video Aff và bắt đầu render.{note}',
        postDetails: 'Bài đăng (caption, hashtag, bình luận ghim)',
        pinnedTag: '[Bình luận ghim] ',
        copyPost: 'Sao chép bài đăng',
        toastCopied: 'Đã sao chép caption + link + hashtag'
      },
      tools: {
        cardMeta: '{project} · {total} cảnh · {prog} xong · {ratio}',
        scenesSummary: 'Kịch bản các cảnh',
        sceneLine: 'Cảnh {n} [{st}]: {text}',
        watchVideo: '▶ Xem video'
      },
      codex: {
        title: 'Trợ lý AI',
        sub: 'Hỏi đáp, viết kịch bản, tối ưu prompt, nghĩ ý tưởng và caption qua tài khoản Muse.',
        cardTitle: '🤖 Codex AI',
        clearBtn: 'Xoá hội thoại',
        hint: 'Trợ lý chat chạy qua chính các tài khoản Muse của bạn (mỗi câu hỏi tốn một lượt chat). Chọn chế độ rồi hỏi; kết quả có thể sao chép hoặc gửi thẳng sang mục Kịch bản / Làm phim.',
        inputPh: 'Nhập câu hỏi... (Ctrl+Enter để gửi)',
        sendBtn: 'Gửi',
        presets: {
          general: 'Hỏi đáp',
          script: 'Viết kịch bản',
          prompt: 'Tối ưu prompt',
          ideas: 'Ý tưởng video',
          caption: 'Caption + hashtag'
        },
        copyBtn: 'Sao chép',
        toScriptBtn: '→ Kịch bản',
        toFilmBtn: '→ Làm phim',
        thinking: 'Đang suy nghĩ...',
        empty: 'Chưa có hội thoại. Hãy hỏi gì đó, ví dụ: "Viết kịch bản 30 giây quảng cáo cà phê".',
        toastCopied: 'Đã sao chép',
        modePrefix: 'Chế độ: {mode}',
        confirmClear: 'Xoá toàn bộ hội thoại Codex AI?'
      },
      settings: {
        title: 'Cài đặt',
        sub: 'Thư mục lưu, số cảnh chạy song song, số lần thử lại, thông báo.',
        connTitle: 'Kết nối',
        connHint: 'Kịch bản và ý tưởng do chính Muse viết qua các tài khoản ở mục Tài khoản — không cần khoá API nào khác.',
        outDirLabel: 'Thư mục lưu video',
        maxRefsLabel: 'Ảnh tham chiếu tối đa mỗi cảnh (2–9)',
        maxRefsTitle: 'Muse khuyên bộ ảnh gọn (vd 1 ảnh nhân vật + 1 ảnh sản phẩm); càng nhiều ảnh vai trò càng dễ lẫn. Muse nhìn ảnh theo thứ tự đính kèm; quá nhiều ảnh thì ảnh sau bị bỏ qua. Khi vượt giới hạn app bỏ khung cuối trước, rồi ảnh nhân vật/sản phẩm thừa.',
        concLabel: 'Số cảnh chạy song song (0 = tự động theo số tài khoản)',
        retryLabel: 'Số lần thử lại mỗi cảnh',
        pollLabel: 'Chu kỳ kiểm tra (giây)',
        parLabel: 'Chế độ chạy song song mặc định',
        parAuto: 'Tự động (khuyên dùng): video ngắn liền mạch tuyệt đối; video dài tự chia chương song song, cắt ở chỗ đổi cảnh',
        parStrict: 'Liền mạch tuyệt đối: tuần tự từng cảnh, 1 tài khoản/video (chậm với video dài)',
        parSmart: 'Thông minh: video nào cũng chia nhóm song song (nhanh, nhưng ĐỨT mạch ở chỗ cắt nhóm)',
        parFast: 'Nhanh nhất: mọi cảnh chạy song song, không nối khung',
        fadeLabel: 'Chuyển cảnh giữa các clip 10s',
        fadeTitle: 'Muse chỉ trả tối đa 10s/clip nên video dài là nhiều clip ghép lại. Chuyển mờ che chỗ nối; cân màu kéo độ sáng/màu từng clip về mức chung của cả video; cân âm lượng làm tiếng không to nhỏ thất thường. Ghép sẽ lâu hơn vài chục giây.',
        fade0: 'Cắt thẳng (nhanh nhất)',
        fade03: 'Chuyển mờ 0.3s',
        fade05: 'Chuyển mờ 0.5s (khuyên dùng)',
        fade08: 'Chuyển mờ 0.8s',
        matchLabel: 'Đồng bộ màu, độ sáng và âm lượng giữa các clip khi ghép',
        autoFromLabel: 'Video dài từ (cảnh)',
        autoFromTitle: 'Từ số cảnh này trở lên, chế độ Tự động mới chia video thành các chương chạy song song (6 phút = 36 cảnh, 10 phút = 60 cảnh).',
        minChapLabel: 'Mỗi chương tối thiểu (cảnh)',
        minChapTitle: 'Mỗi chương tối thiểu bấy nhiêu cảnh liên tiếp (chạy liền mạch trong một phiên chat). Càng dài càng ít chỗ cắt, nhưng càng ít luồng song song.',
        checkLabel: 'Kiểm tra mối nối, tự tạo lại cảnh nhảy bối cảnh',
        checkTitle: 'Sau mỗi cảnh, app so khung đầu của clip mới với khung cuối clip trước; nếu Muse nhảy sang bối cảnh khác thì tạo lại đúng 1 lần (tốn thêm 1 lượt hạn mức).',
        sessLabel: 'Nối cảnh trong cùng một phiên chat Muse (giữ ngữ cảnh cảnh trước)',
        sessTitle: 'Các cảnh nối liền được tạo trong CÙNG MỘT cuộc chat Muse (cùng tài khoản) nên Muse nhớ các prompt và video đã tạo trước đó. Tắt đi thì mỗi cảnh là một chat mới, Muse chỉ thấy ảnh khung cuối + chữ mô tả cảnh trước.',
        notifyLabel: 'Thông báo trên máy khi có video render xong',
        saveBtn: 'Lưu cài đặt',
        testBtn: 'Kiểm tra bridge Python',
        toastSaved: 'Đã lưu cài đặt',
        toastBridgeOk: 'Bridge Python hoạt động.'
      },
      toast: {
        welcome: 'Chào mừng! Xem Trang chủ để làm theo 5 bước bắt đầu, hoặc mục Hướng dẫn.',
        noAccount: 'Chưa có tài khoản Muse. Hãy thêm tài khoản trước khi tạo video.',
        invalidDur: 'Thời lượng tự nhập chưa hợp lệ (vd: 75, 1:30, 2 phút).',
        needScript: 'Nhập kịch bản (hoặc chuyển sang tab "Từ ảnh").',
        needImg: 'Chọn ít nhất 1 ảnh sản phẩm.',
        addedQueue: 'Đã thêm {n} video vào hàng đợi.{note}',
        addedRender: 'Đã thêm {n} video và bắt đầu render.{note}',
        charWarn: 'Lưu ý nhân vật: {warn}'
      },
      err: {
        ipcCall: 'Lỗi gọi {cmd}: {msg}',
        ipcUnknown: 'Lỗi không rõ khi gọi {cmd}'
      },
      guide: {
        title: 'Hướng dẫn sử dụng',
        sub: 'Đọc 5 phút là dùng được. Dùng mục lục bên trái để nhảy tới phần cần xem.',
        toc1: '1. Bắt đầu nhanh',
        toc2: '2. Viết kịch bản',
        toc3: '3. Các chế độ tạo video',
        toc4: '4. Nhân vật & phong cách',
        toc5: '5. Hàng đợi & sửa cảnh',
        toc6: '6. Chạy song song',
        toc7: '7. App tự xử lý lỗi',
        toc8: '8. Tiết kiệm hạn mức',
        toc9: '9. Xử lý sự cố',
        toc10: '10. Phím tắt',
        g1: `<h2>1. Bắt đầu nhanh</h2>
<ol><li><b>Kích hoạt key</b> (màn hình khoá hiện ra lần đầu mở app).</li>
<li>Vào <b>Tài khoản</b> → nhập email Muse → <b>Gửi mã OTP</b> → nhập mã → <b>Xác nhận &amp; thêm</b>. Nếu bạn đăng nhập Muse bằng mật khẩu/2FA, dùng khung <b>nhập cookie</b>.</li>
<li>Vào <b>Cài đặt</b> → <b>Kiểm tra bridge Python</b> để chắc chắn bộ cầu nối chạy được.</li>
<li>(Tuỳ chọn) Vào <b>Nhân vật &amp; phong cách</b> để lưu nhân vật có ảnh tham chiếu.</li>
<li><b>Cách nhanh nhất:</b> ở <b>Trang chủ</b>, gõ ý tưởng vào khung <b>⚡ Tạo nhanh</b> và bấm một nút. Hoặc vào <b>Kịch bản</b> để tự viết từng cảnh, bấm <b>Đưa vào hàng đợi</b> (mặc định tự bắt đầu render). Video xong nằm trong <b>Kho video</b> và thư mục lưu.</li></ol>
<div class="callout">Nên dùng <b>tài khoản phụ</b>. Kết nối với Muse là giao thức không chính thức, có thể thay đổi khi Muse cập nhật.</div>`,
        g2: `<h2>2. Viết kịch bản</h2>
<p>Mỗi <b>dòng = một cảnh</b>, mỗi cảnh dài khoảng <b>10 giây</b>. Tiền tố thời gian như <code>0-10s:</code> được tự bỏ. Viết bằng tiếng Anh cho chủ thể, hành động, góc máy, ánh sáng sẽ cho kết quả ổn định nhất; lời thoại có thể để tiếng Việt.</p>
<pre>0-10s: A young Vietnamese woman opens a gift box in a cozy warehouse, warm fairy lights, slow push-in
10-20s: The whole family gathers around the table, laughing, handheld camera
20-30s: Close-up of the product on the table, steam rising, soft golden light</pre>
<p><b>Nhiều nhân vật:</b> ghi tên trong ngoặc vuông ở đầu dòng để chỉ rõ ai có mặt, app chỉ gửi đúng ảnh của họ:</p>
<pre>[Bắp, Mẹ] Bắp chạy vào bếp, Mẹ quay lại mỉm cười
[-] Cảnh toàn thành phố lúc hoàng hôn, không có nhân vật nào</pre>
<p>Không ghi thẻ thì app tự nhận theo tên xuất hiện trong câu. Nút <b>Chèn mẫu</b> dưới ô kịch bản giúp bạn bắt đầu nhanh.</p>
<div class="callout">Mẹo: cảnh sau nên nối tiếp cảnh trước (cùng địa điểm, cùng trang phục). Bật <b>Nối liền mạch</b> để app lấy khung cuối của cảnh trước làm tham chiếu.</div>`,
        g3: `<h2>3. Các chế độ tạo video</h2>
<table><tr><td>Kịch bản</td><td>Bạn viết cảnh. Thiếu cảnh so với thời lượng chọn thì Muse tự viết thêm (nếu bật "Dùng Muse viết/chia cảnh").</td></tr>
<tr><td>Từ ảnh</td><td>Mỗi ảnh sản phẩm ra một video riêng. Để trống kịch bản để AI tự nghĩ.</td></tr>
<tr><td>Studio kênh</td><td>Tạo kênh (phong cách, nhân vật, giọng, phụ đề) rồi bấm <b>Làm tiếp hôm nay</b> để đủ mục tiêu mỗi ngày. Mỗi tập được kiểm tra chất lượng và xuất thư mục gồm video, kịch bản, phụ đề, thumbnail, metadata.</td></tr>
<tr><td>Làm phim</td><td>Nhập ý tưởng → AI lập "bible phim" (phong cách, bối cảnh, trang phục cố định) rồi viết kịch bản theo từng đợt → bạn sửa → render. Tối đa 60 cảnh (10 phút).</td></tr>
<tr><td>Video Aff</td><td>Nhập sản phẩm, ảnh, điểm nổi bật → AI viết kịch bản bán hàng + caption + hashtag + bình luận ghim. App không bịa giá và không tự đăng bài.</td></tr>
<tr><td>Trợ lý AI</td><td>Chat để viết kịch bản, tối ưu prompt, nghĩ ý tưởng, caption. Kết quả gửi thẳng sang Kịch bản hoặc Làm phim.</td></tr></table>`,
        g4: `<h2>4. Nhân vật &amp; phong cách</h2>
<ul><li><b>Nhân vật:</b> tên + mô tả cố định (tuổi, mặt, tóc, trang phục) + 1–2 ảnh rõ mặt. Chọn nhân vật ở ô "Nhân vật" khi tạo video.</li>
<li><b>Phong cách:</b> khối chữ về bối cảnh, màu, ánh sáng, mood. Dùng lại cho nhiều video.</li>
<li>Sửa ảnh/mô tả nhân vật có hiệu lực cho các cảnh <b>chưa render</b>.</li></ul>`,
        g5: `<h2>5. Hàng đợi &amp; sửa cảnh</h2>
<ul><li>Bấm một video trong hàng đợi để xem và chỉnh từng cảnh ở khung bên phải.</li>
<li><b>↻ Tạo lại</b>: render lại riêng một cảnh, các cảnh khác giữ nguyên, video tự ghép lại.</li>
<li><b>✎ Sửa</b>: đổi nội dung cảnh rồi tạo lại ngay (dùng khi Muse từ chối mãi).</li>
<li><b>⏭ Bỏ qua</b>: bỏ hẳn cảnh không ra được, video ghép từ các cảnh còn lại.</li>
<li><b>Thử lại tất cả lỗi</b> ở thanh dưới để chạy lại mọi video đang lỗi cùng lúc.</li>
<li>Bấm <b>Dừng</b> bất cứ lúc nào; tiến độ được lưu, mở app lại bấm <b>Chạy tiếp</b>.</li></ul>`,
        g6: `<h2>6. Chạy song song nhiều tài khoản</h2>
<p>Mỗi tài khoản Muse render <b>1 clip một lúc</b>, nên <b>N tài khoản = tối đa N clip cùng lúc</b>. Bảng <b>Luồng tài khoản</b> trên Trang chủ cho thấy từng tài khoản đang làm cảnh nào.</p>
<p>Cảnh "nối liền mạch" phải đợi khung cuối của cảnh trước, nên một video dài nếu chạy tuần tự chỉ dùng được 1 tài khoản. Vì vậy app có 3 chế độ (chọn mặc định trong <b>Cài đặt</b>, hoặc riêng từng lô ở <b>Tuỳ chọn nâng cao</b>):</p>
<table><tr><td>Thông minh</td><td>Khuyên dùng. Chia các cảnh của video thành nhiều nhóm; trong nhóm vẫn nối liền mạch, các nhóm chạy song song. Ví dụ 1 video 6 cảnh + 3 tài khoản → 3 nhóm × 2 cảnh. Có nhiều video thì mỗi video chạy 1 nhóm vì tài khoản đã đủ việc.</td></tr>
<tr><td>Liền mạch tuyệt đối</td><td>Mọi cảnh nối khung với cảnh trước, chạy tuần tự. Mượt nhất nhưng chậm nhất khi chỉ có ít video.</td></tr>
<tr><td>Nhanh nhất</td><td>Mọi cảnh chạy cùng lúc, không nối khung. Giữ nhân vật bằng ảnh tham chiếu, chỗ nối giữa các cảnh có thể không liền.</td></tr></table>
<ul><li>Khi một tài khoản hết hạn mức, bị chặn hoặc lỗi liên tục, cảnh đang làm được <b>tự chuyển sang tài khoản khác</b>, tài khoản đó nghỉ rồi tự quay lại.</li>
<li>App khởi động các cảnh so le (không dội cùng lúc) và tự dàn đều công việc giữa các tài khoản.</li>
<li>Sau vài cảnh đầu, app đo thời gian thật và hiển thị <b>"còn ~X phút"</b> ở thanh dưới và Trang chủ.</li>
<li>Nút <b>Kiểm tra tất cả</b> ở mục Tài khoản kiểm tra phiên đăng nhập từng tài khoản trước khi chạy lô lớn (không tốn hạn mức tạo video).</li></ul>`,
        g7: `<h2>7. App tự xử lý lỗi</h2>
<table><tr><th>Mã</th><th>Ý nghĩa</th><th>App làm gì</th></tr>
<tr><td>412</td><td>Hết hạn mức tuần</td><td>Cho tài khoản nghỉ 2 giờ, chuyển cảnh sang tài khoản khác.</td></tr>
<tr><td>596 / 404</td><td>Phiên đăng nhập hỏng / bị chặn</td><td>Đánh dấu "Bị chặn", chuyển tài khoản khác. Bạn cần đăng nhập lại tài khoản đó.</td></tr>
<tr><td>429</td><td>Tài khoản đang bận</td><td>Chờ 30 giây rồi thử lại.</td></tr>
<tr><td>400 / 422</td><td>Muse từ chối nội dung</td><td>Leo "thang làm nhẹ" (xem dưới), không phạt tài khoản.</td></tr>
<tr><td>502–504</td><td>Lỗi tạm / quá thời gian</td><td>Thử lại; lỗi liên tục thì cho tài khoản nghỉ 5 → 20 → 60 phút. Video lỗi tạm tự chạy tiếp sau ~10 phút (tối đa 3 lần) nếu để app mở.</td></tr></table>
<p><b>Thang làm nhẹ khi Muse từ chối một cảnh:</b> mức 0 nguyên bản → 1 thay từ nhạy cảm + câu dặn an toàn → 2 nhờ Muse viết lại (bỏ tên người thật, bạo lực chỉ gợi ý) → 3 cảnh "cắt cảnh" không thấy mặt. Hết 3 mức vẫn bị từ chối thì app dừng cảnh đó để bạn <b>Sửa</b> hoặc <b>Bỏ qua</b>.</p>
<div class="callout warn">Tránh dùng tên người thật (lịch sử hoặc đang sống), cảnh bạo lực, bắt giữ, vũ khí chĩa vào người: đây là lý do phổ biến nhất khiến Muse từ chối.</div>`,
        g8: `<h2>8. Tiết kiệm hạn mức</h2>
<ul><li>Số cảnh chạy cùng lúc thực tế = <b>số tài khoản sẵn sàng</b> (mỗi tài khoản 1 video một lúc). Mặc định "Số cảnh chạy song song" = 0 nghĩa là tự động dùng hết các tài khoản; đặt số khác để giới hạn.</li>
<li>Mỗi cảnh ≈ 1 clip Muse; mỗi lần Muse viết kịch bản, chia cảnh hay chat với Trợ lý AI cũng tốn một lượt. Nếu đã có kịch bản sẵn, tắt "Dùng Muse viết/chia cảnh".</li>
<li>Thử một video ngắn (10–20 giây) trước khi chạy hàng loạt; kiểm tra nhân vật ổn rồi mới tăng "Số bản / video".</li>
<li>Xem thanh ước tính dưới nút "Đưa vào hàng đợi" để biết lô này tốn bao nhiêu clip.</li></ul>`,
        g9: `<h2>9. Xử lý sự cố</h2>
<details><summary>"Chưa thấy bridge Python"</summary><p>Chạy bằng mã nguồn: chạy <code>CAI-DAT-VA-CHAY.bat</code>. Dùng file exe: build lại bằng <code>TAO-FILE-EXE.bat</code> (cần Internet lần đầu để nhúng Python).</p></details>
<details><summary>Gửi OTP không được / phiên hết hạn</summary><p>Thử nhập cookie từ trình duyệt (Cookie-Editor → Export JSON). Phiên hết hạn thì đăng nhập lại; tài khoản hiện "Bị chặn".</p></details>
<details><summary>Tất cả tài khoản hết hạn mức</summary><p>Thêm tài khoản khác hoặc đợi tài khoản nghỉ xong. Có thể bấm <b>Đặt lại</b> ở mục Tài khoản nếu bạn chắc hạn mức đã làm mới.</p></details>
<details><summary>Nhân vật bị lệch ngoại hình giữa các cảnh</summary><p>Thêm ảnh tham chiếu rõ mặt, viết mô tả cố định chi tiết, bật Nối liền mạch, và dùng thẻ <code>[Tên]</code> để chỉ rõ ai có mặt trong từng cảnh.</p></details>
<details><summary>Ghép video lỗi</summary><p>Mở thư mục video, kiểm tra file scene_N.mp4 có phát được không. Dùng ↻ Tạo lại cho cảnh hỏng rồi để app ghép lại.</p></details>`,
        g10: `<h2>10. Phím tắt</h2>
<table><tr><td>Ctrl + Enter</td><td>Đưa kịch bản vào hàng đợi (ở ô kịch bản) · Gửi tin (ở Trợ lý AI)</td></tr>
<tr><td>Ctrl + 1…9</td><td>Chuyển nhanh giữa các mục theo thứ tự thanh bên</td></tr>
<tr><td>Ctrl + Enter (Trang chủ)</td><td>Tạo &amp; render ngay ở khung Tạo nhanh</td></tr>
<tr><td>F12</td><td>Mở công cụ nhà phát triển (chỉ khi chạy bằng npm start)</td></tr></table>`
      }
    },

    en: {
      nav: {
        tagline: 'Batch AI video rendering',
        home: 'Home',
        grpCreate: 'Create Video',
        script: 'Script',
        studio: 'Channel Studio',
        film: 'Film Maker',
        aff: 'Affiliate Video',
        grpManage: 'Manage',
        library: 'Video Library',
        sync: 'Characters & Styles',
        codex: 'AI Assistant',
        grpSystem: 'System',
        accounts: 'Accounts',
        settings: 'Settings',
        guide: 'Guide'
      },
      top: {
        allProjects: 'All projects',
        accPill: 'Accounts: {active} active · {ok}/{total} ready',
        langTitle: 'Language / Ngôn ngữ / 语言',
        themeTitle: 'Toggle light / dark theme',
        resume: '▶ Resume',
        stopAll: 'Stop all',
        outDir: '📁 Output folder'
      },
      common: {
        none: 'None',
        save: 'Save',
        cancel: 'Cancel',
        cancelEdit: 'Cancel edit',
        edit: 'Edit',
        delete: 'Delete',
        open: 'Open',
        openDir: 'Open folder',
        retry: 'Retry',
        stop: 'Stop',
        pick: 'Choose',
        pickFile: 'Choose file',
        pickImages: 'Choose images',
        clearImages: 'Clear images',
        zeroImages: '0 images',
        imagesCount: '{n} images',
        imagesSelected: '{n} images selected',
        sec10: '10 sec',
        sec20: '20 sec',
        sec30: '30 sec',
        sec40: '40 sec',
        sec60: '60 sec',
        under1Min: 'under 1 min',
        mins: '{m} min',
        hours: '{h} hr',
        hoursMins: '{h} hr {m} min',
        errorPrefix: 'Error: {msg}',
        confirmDelFiles: 'Also delete video files on disk?\nOK = delete files too, Cancel = remove from list only'
      },
      status: {
        pending: 'Pending',
        running: 'Running',
        done: 'Done',
        error: 'Error',
        skipped: 'Skipped'
      },
      voice: {
        none: 'No voiceover',
        noneShort: 'None',
        vi: 'Vietnamese',
        en: 'English',
        ja: 'Japanese',
        ko: 'Korean',
        zh: 'Chinese',
        th: 'Thai',
        fr: 'French',
        es: 'Spanish'
      },
      customSelect: {
        otherOption: '✎ Custom (type your own)…',
        defaultPh: 'Enter your value…'
      },
      home: {
        heroTitle: 'Batch-create AI <em>videos</em>,<br>from a single idea.',
        heroDesc: 'Write a script (or just enter an idea), add to the queue, and let Muse Studio render, chain scenes, switch accounts when quota runs out, and merge into a finished video.',
        ctaScript: 'Write detailed script',
        ctaGuide: 'View guide',
        quick: {
          title: '⚡ Quick Create',
          sub: 'Type an idea, click once: the app writes the script, splits scenes, renders in parallel across accounts, and merges the video.',
          ideaPh: 'e.g. A young woman brewing coffee in a warm morning kitchen, sunlight through the window, close-up of rising steam...',
          dur: 'Duration',
          ratio: 'Aspect ratio',
          copies: 'Videos',
          voice: 'Voiceover',
          pickImg: '🖼 Reference images',
          noImg: 'no images',
          imgCountMore: '{n} images (click again to add)',
          estIdle: 'Enter an idea to see the estimate.',
          go: '⚡ Create & render now',
          needIdea: 'Please enter a video idea.',
          planning: 'Writing script…',
          projectDefault: 'Quick Create',
          createdToast: 'Created {n} video(s) and started rendering. Track progress in "Account Lanes".',
          addFail: 'Could not add video.',
          charsLabel: 'Characters:'
        },
        lanes: {
          title: 'Account Lanes',
          hint: 'Each account renders 1 clip at a time; the app distributes work and switches accounts automatically on quota limit or error.',
          check: 'Check sessions',
          sceneWork: 'Scene {i}/{n} · {title}',
          preparing: 'Preparing…',
          idle: 'Idle',
          usedScenes: '{n} scenes',
          empty: 'No accounts yet. Go to Accounts to add one.'
        },
        eta: {
          runningEta: 'Running · ~{dur} left',
          running: 'Running',
          stopped: 'Stopped'
        },
        queue: {
          title: 'In Progress',
          hintSome: 'Click a video to view details.',
          hintEmpty: 'No videos waiting. Create one in Quick Create.',
          itemMeta: '{done}/{total} scenes',
          chains: ' · {n} parallel groups'
        },
        stats: {
          ready: 'Ready accounts',
          running: 'Rendering',
          pending: 'Pending',
          done: 'Completed',
          error: 'Errors',
          maxPar: 'Max concurrent clips'
        },
        steps: {
          title: 'Get started in 5 minutes',
          hint: 'Steps are checked off automatically as you complete them.',
          next: 'Next',
          s1Title: 'Add a Muse account',
          s1Desc: 'Accounts tab → OTP or browser cookie.',
          s2Title: 'Have a ready account',
          s2Desc: 'Session is valid and not quota-limited.',
          s3Title: 'Create characters (optional)',
          s3Desc: 'Keep character appearance consistent across scenes.',
          s4Title: 'Create your first video',
          s4Desc: 'Type an idea in ⚡ Quick Create above.',
          s5Title: 'Finish your first render',
          s5Desc: 'Watch progress in Account Lanes; finished videos appear in Video Library.'
        },
        recent: {
          title: 'Recent Videos',
          empty: 'No completed videos yet.'
        },
        cards: {
          scriptTitle: 'Script',
          scriptDesc: 'Paste a script or let AI split scenes. Supports [Character] tags.',
          studioTitle: 'Channel Studio',
          studioDesc: 'Produce N daily episodes per channel with voiceover and subtitles.',
          filmTitle: 'Film Maker',
          filmDesc: 'AI writes multi-batch storylines for cohesive films.',
          affTitle: 'Affiliate Video',
          affDesc: 'Sales script + caption + hashtags for TikTok / Reels.',
          codexTitle: 'AI Assistant',
          codexDesc: 'Draft prompts, ideas, and captions inside the app.'
        },
        est: {
          noAcc: 'No ready accounts: go to Accounts to add or check sessions.',
          summary: '≈ {nVideos} video(s) · {clips} Muse clip(s) (~{sec}s video){extra}. {acc} ready account(s) → {par} concurrent clip(s){chains}{eta}.',
          chains: ' ({per} scene groups per video)',
          eta: ' · est. ~{dur}',
          extraPerVideo: ' · Muse will write {n} more scene(s)/video',
          extraQuick: ' · Muse writes {n} scene(s)/video',
          tipAuto: ' Tip: choose Auto mode so long videos run in parallel across accounts.',
          needImg: 'Select at least 1 image: each image creates a separate video.',
          needScript: 'Enter a script (one scene per line) to see the estimate.',
          etaSuffix: ' · ~{dur} left'
        },
        tpl: {
          productName: 'Product Showcase',
          productBody: '0-10s: Opening hook, a striking close-up reveal of the product, glossy light, shallow depth of field, slow push-in\n10-20s: A person naturally using and enjoying the product in a warm everyday setting, handheld camera, genuine reaction\n20-30s: Final shot, the product centered with its packaging clearly visible, confident camera pull-back, clean ending',
          characterName: 'Character Story',
          characterBody: '[Character Name] walks into a sunlit kitchen, curious, slow tracking shot\n[Character Name] discovers something unexpected on the table, close-up of the surprised face\n[Character Name] laughs and shares it with the family, warm wide shot, cozy light',
          vlogName: 'Travel / Vlog',
          vlogBody: '0-10s: Sunrise over a quiet old town, drone shot slowly descending, golden light\n10-20s: A traveler walks through a busy morning market, handheld, vivid colors, ambient sound\n20-30s: The traveler sits at a street-side cafe enjoying breakfast, shallow depth of field, relaxed mood'
        },
        retryAllNone: 'No failed videos to retry.',
        retryAllDone: 'Retried {n} failed video(s).'
      },
      script: {
        title: 'Create Video from Script',
        sub: 'Write one scene per line (≈10s each), or switch to "From Images" to create one video per image. Add to queue then click Start render.',
        tabScript: 'Script',
        tabImage: 'From Images',
        placeholder: 'Example:\n0-10s: Young woman opens a gift box in a cozy warehouse, warm fairy lights\n10-20s: Family gathers around the table opening holiday gifts\n(Each 10s = 1 scene. "From Images" mode: leave blank for AI to decide.)\nMultiple characters: prefix with [Alex, Mom] to specify who appears; otherwise detected from names in the line.',
        tplLabel: 'Insert template:',
        refHint: '"From Images" mode: 1 video per image. "Script" mode: images act as product references.',
        ratio: 'Aspect ratio',
        duration: 'Duration',
        durPh: 'e.g. 75s, 1:30, 2 min',
        dur10: '10 sec (1 scene)',
        dur20: '20 sec (2 scenes)',
        dur30: '30 sec (3 scenes)',
        dur40: '40 sec (4 scenes)',
        dur60: '60 sec (6 scenes)',
        durAuto: 'Match script line count',
        voice: 'Voiceover',
        voicePh: 'e.g. Thai, Italian',
        style: 'Style / idea',
        charsHint: 'Characters (consistent appearance across scenes):',
        advTitle: '⚙ Advanced options',
        prefixLabel: 'Prompt prefix',
        projectLabel: 'Project',
        projectPh: 'e.g. KOREAN BBQ',
        copiesLabel: 'Copies / video',
        parallelLabel: 'Parallel mode',
        parDefault: 'Use Settings (recommended)',
        parAuto: 'Auto: short videos sequential, long videos parallel chapters',
        parSmart: 'Smart: split scenes into parallel groups',
        parStrict: 'Strict continuity: strictly sequential',
        parFast: 'Fastest: all scenes in parallel',
        continuity: 'Chain scenes seamlessly (use last frame of previous scene)',
        useAI: 'Use Muse to write/split missing scenes',
        useMusic: 'Add background music',
        autoStart: 'Start rendering automatically after adding',
        estIdle: 'Enter a script to see the estimate.',
        addBtn: 'Add to queue',
        preparing: 'Preparing (AI splitting scenes)...',
        colVideo: 'Video',
        colStatus: 'Status',
        colActions: 'Actions',
        defaultPrefix: 'Create realistic video:'
      },
      queue: {
        selectAll: 'Select all',
        deselectAll: 'Deselect all',
        delSelectedInit: 'Delete selected (0)',
        delSelected: 'Delete selected ({n})',
        retryAll: '↻ Retry all errors',
        clearDone: 'Clear completed',
        startRender: '▶ Start render',
        summary: 'Running {run} video(s) · {done}/{total} done · {err} error(s){eta}',
        filterAll: 'All {n}',
        filterPending: 'Pending {n}',
        filterRunning: 'Running {n}',
        filterDone: 'Done {n}',
        filterError: 'Error {n}',
        rowMeta: '{n} scenes · {prog} done · {ratio} · {project}',
        empty: 'Queue is empty. Enter a script and click "Add to queue".',
        openDirTitle: 'Open folder',
        retryTitle: 'Retry',
        confirmClearDone: 'Remove all completed videos from the list (keep files on disk)?',
        selectPrompt: 'Select a video on the left to inspect.',
        projectLabel: 'Project:',
        sceneTitle: 'Scene {n}',
        regenBtn: '↻ Regen',
        regenTitle: 'Regenerate only Scene {n} (keep other scenes)',
        editBtn: '✎ Edit',
        editTitle: 'Edit scene prompt and regenerate',
        skipBtn: '⏭ Skip',
        skipTitle: 'Skip this scene and merge remaining scenes',
        softened: 'soften level {n}/3',
        noChar: 'no characters',
        guessedChar: ' (inferred)',
        saveRegen: 'Save & regen',
        tagsPh: 'Tags (comma-separated)',
        notePh: 'Notes',
        confirmSkip: 'Skip Scene {n}?\nThe video will be merged from the remaining scenes.',
        confirmRegen: 'Regenerate only Scene {n}?\nOther scenes remain intact and the video will be re-merged once done.'
      },
      preview: {
        title: 'Preview & details'
      },
      library: {
        title: 'Video Library',
        sub: 'All completed videos. Search by title, tags, or notes.',
        searchPh: 'Search by title, tags, notes...',
        count: '{n} video(s)',
        secDur: '{n}s',
        openBtn: '📁 Open',
        rejoinBtn: '🔄 Re-merge',
        rejoinTitle: 'Re-merge clips using current transition and color/audio sync settings',
        rejoining: 'Merging...',
        empty: 'No completed videos yet.',
        confirmDel: 'Delete this video and its files on disk?',
        toastRejoined: 'Video re-merged',
        toastRejoinErr: 'Re-merge failed'
      },
      sync: {
        title: 'Characters & Styles',
        sub: 'Save once and reuse across all videos for consistent appearance and visual mood.',
        charTitle: '🧍 Character Bible',
        charHint: 'Reference images + fixed description injected into EVERY scene so characters stay consistent.',
        charNamePh: 'Character name (e.g. Mia)',
        charDescPh: 'Fixed description: age, face, hair, outfit... (English works best)',
        charPickBtn: 'Choose images (1–2 clear face shots)',
        charAutoBtn: 'Auto-describe from image',
        charAutoTitle: 'Muse inspects the image and writes a fixed appearance description',
        charDescribing: 'Describing...',
        charSaveBtn: 'Save character',
        charEmpty: 'No characters yet.',
        confirmDelChar: 'Delete this character?',
        styleTitle: '💡 Ideas / Styles',
        styleHint: 'Reusable text block for setting, color palette, lighting, and mood.',
        styleNamePh: 'Name (e.g. Cozy Christmas)',
        styleTextPh: 'e.g. warm Christmas market at night, golden fairy lights, snowy background, cinematic soft film look',
        styleAutoBtn: 'Auto-describe with AI',
        styleAutoTitle: 'Muse writes a style description based on the name (and your notes)',
        styleWriting: 'Writing...',
        styleEmpty: 'No ideas or styles yet.',
        confirmDelStyle: 'Delete this item?',
        noCharPicker: 'No characters yet – create them in Characters & Styles.',
        noStyleOption: '— None —',
        toastPickFirst: 'Please select character image(s) first.',
        toastCharDescribed: 'Description generated — review/edit and click Save',
        toastCharDescribeErr: 'Failed to describe image',
        toastCharSaved: 'Character saved',
        toastStyleNeedName: 'Please enter a style/idea name first.',
        toastStyleDescribeErr: 'Failed to generate description',
        toastStyleSaved: 'Saved'
      },
      accounts: {
        title: 'Muse Accounts',
        sub: 'Each account renders 1 video at a time. Add multiple accounts for parallel rendering and automatic quota failover.',
        otpTitle: 'Add Muse Account',
        otpHint: 'Sign in with an OTP sent to your Muse email/phone (no password needed, no paid third-party service). Sessions are stored locally only. This uses Muse’s unofficial internal protocol and may break on updates; use secondary accounts.',
        emailPh: 'Muse email',
        sendOtp: 'Send OTP',
        otpPh: 'OTP code',
        confirmAdd: 'Verify & add',
        cookieTitle: 'Or import browser cookies',
        cookieHint: 'Use when signing into muse.ai with password or 2FA: log in on Chrome, export muse.ai cookies (Cookie-Editor → Export → JSON, or cookies.txt) and paste here. Cookies act like passwords—never share them. Re-import if expired.',
        cookieEmailPh: 'Muse email (for account label)',
        cookieAdd: 'Import cookies',
        cookieTextPh: 'Paste JSON or cookies.txt content',
        listTitle: 'Account List',
        checkAll: 'Check all',
        resetAll: 'Reset all',
        checkBridge: 'Check bridge',
        listHint: 'When an account hits weekly quota (412), is blocked (596), or fails repeatedly, the scene is automatically reassigned to another account.',
        disabled: 'Disabled',
        blocked: 'Blocked / re-login required',
        exhaustedUntil: 'Resting until {time}',
        ready: 'Ready',
        colEmail: 'Email',
        colStatus: 'Status',
        colRunning: 'Running',
        colUsed: 'Assigned',
        colLastErr: 'Last error',
        colSession: 'Session',
        sessionOk: '✓ Valid session ({time})',
        sessionErrFallback: 'Invalid session',
        btnCheck: 'Check',
        btnEnable: 'Enable',
        btnDisable: 'Disable',
        btnReset: 'Reset',
        empty: 'No accounts yet. Add one above.',
        confirmRemove: 'Remove account and delete locally saved session?',
        toastSessionOk: 'Session is valid ✓',
        toastSessionBad: 'Session error: {msg}',
        toastAdded: 'Account added',
        toastOtpSent: 'OTP sent. Enter the code and click Verify & add.',
        toastCookieAdded: 'Cookies imported and session verified',
        toastCheckAll: 'Valid sessions: {ok}/{total} account(s).{extra}',
        toastCheckAllExtra: ' Failed accounts have been marked.',
        toastResetAll: 'All account states have been reset.',
        toastBridgeOk: 'Bridge is running. {n} session(s) stored locally.'
      },
      studio: {
        title: 'Channel Studio',
        sub: 'One prompt → script → render → voice/subtitles → QC → episode folder. Batch-produce toward your daily target.',
        todayTitle: 'Today',
        continueBtn: '▶ Continue today',
        continueMore: '▶ Continue today ({retryPart}{missing} ep(s) left)',
        continueRetryPart: 'retry {failed} failed + ',
        continueDone: '✔ Daily target reached',
        moreSummary: 'Generate more / enter custom ideas',
        moreCountLabel: 'Extra episodes to create',
        moreBtn: 'Generate more (AI ideas)',
        ideasPh: 'Or type your own ideas, 1 episode per line (leave blank for AI ideas):\nBap sneaks cookies before dinner\nBap goes to the market with Mom',
        fromIdeasBtn: 'Create episodes from list above',
        newEpTitle: 'Produce New Episode',
        newEpHint: 'Just enter a natural request. The app plans the script, splits scenes, renders, adds voice/subtitles, runs QC, and exports the episode folder.',
        newChBtn: '+ New channel',
        reqPh: 'e.g. Cozy Family — new episode about Mia sneaking cookies before dinner.',
        goBtn: 'Produce new episode',
        epsTitle: 'Episodes',
        noChannelOpt: '(no channels yet)',
        progHtml: '<b>{made}</b>/{target} episodes created today · {finished} done · {posted} posted',
        progFailed: ' · <span style="color:#ff8a8d">{failed} failed</span>',
        contHint: 'Needs ~{clips} Muse clip(s); {acc} ready account(s) available. Accounts have weekly quotas.',
        needChannelHint: 'Create a channel in "Channel Configuration" below.',
        hintMeta: '{ratio} · {dur}s · {voice} · {chars} character(s)',
        voiceShort: { muse: 'Muse voice', tts: 'TTS', none: 'no voice' },
        charsLabel: 'Characters (Character Bible):',
        charsEmpty: 'No characters yet. Create them in Characters & Styles first.',
        st: {
          planning: 'Planning script',
          queued: 'Queued',
          rendering: 'Rendering',
          finishing: 'Finishing',
          done: 'Completed',
          review: 'Needs review',
          error: 'Error'
        },
        scSt: { pending: 'pending', running: 'running', done: 'done', error: 'error' },
        filters: { ready: 'Ready to post', work: 'In progress', error: 'Errors', posted: 'Posted', all: 'All' },
        ep: {
          qcTitle: 'Quality check results',
          notChecked: 'Not checked: {name}',
          sceneChip: 'S{n} {st}',
          regenSceneTitle: 'Regenerate Scene {n}',
          postedBadge: 'Posted',
          watchVideo: '▶ Watch video',
          logTitle: 'Logs',
          copyPost: 'Copy post text',
          unmarkPosted: 'Unmark posted',
          markPosted: 'Mark posted',
          emptyReady: 'No episodes ready to post. Click "Continue today" above.',
          emptyOther: 'No episodes found.'
        },
        confirm: {
          regenScene: 'Regenerate only Scene {n}?\nOther scenes stay unchanged; the episode will be re-merged, checked, and exported.',
          delEp: 'Remove this episode from the list? (exported files stay on disk)',
          delCh: 'Delete this channel?'
        },
        toast: {
          copiedPost: 'Copied title + description + hashtags',
          todayStarted: 'Started: {created} new, {retried} retried.',
          todayMet: 'Daily target already met.',
          batchStarted: 'Started {created} new episode(s).',
          ideasStarted: 'Started {created} episode(s){skipped}.',
          ideasSkipped: ', skipped {n} (duplicate)',
          needChName: 'Please enter a channel name before saving',
          chSaved: 'Saved channel: {name}',
          epStarted: 'Started producing new episode.'
        },
        form: {
          title: 'Channel Configuration',
          newTitle: 'New Channel',
          editTitle: 'Edit channel: {name}',
          name: 'Channel name',
          namePh: 'Cozy Family',
          style: 'Fixed visual style',
          stylePh: '3D Pixar-style, warm cozy home lighting',
          ratio: 'Aspect ratio',
          dur: 'Target duration (seconds, 10–60)',
          lang: 'Language',
          voiceMode: 'Voice mode',
          voiceMuse: 'Muse generates spoken dialogue in video',
          voiceTts: 'TTS voiceover (edge-tts) mixed into video',
          voiceNone: 'No dialogue',
          ttsDefault: 'Default TTS voice (optional)',
          ttsMap: 'Per-character voice (Name=voice per line)',
          ttsMapPh: 'Mia=en-US-AriaNeural',
          dailyTarget: 'Daily target (videos/day)',
          ideaSeeds: 'Content themes / seeds (1 per line for AI idea generation)',
          ideaSeedsPh: 'Mia playing tricks at home\nMia cooking with Mom\nWeekend family trip',
          avoid: 'Extra things to avoid (optional)',
          avoidPh: 'violence, characters staring at camera',
          subtitles: 'Generate .srt subtitles',
          continuity: 'Chain scenes seamlessly',
          music: 'Background music',
          delBtn: 'Delete channel',
          saveBtn: 'Save channel'
        }
      },
      film: {
        title: 'Film Maker',
        sub: 'Turn an idea into a cohesive multi-scene film (up to 10 minutes).',
        cardTitle: '🎥 Film Maker',
        cardHint: 'From one idea → AI writes a multi-scene script (~10s/scene, written in batches for continuity) → edit as needed → render and merge into one film. Up to 60 scenes (10 minutes).',
        nameLabel: 'Film title',
        namePh: 'e.g. The Last Train',
        genreLabel: 'Genre',
        genrePh: 'e.g. horror comedy, noir mystery, wuxia',
        genres: {
          drama: 'Drama / Emotional',
          action: 'Action / Thriller',
          comedy: 'Light Comedy',
          horror: 'Mystery / Suspense',
          fantasy: 'Fantasy Adventure',
          scifi: 'Sci-Fi',
          romance: 'Romance',
          doc: 'Documentary'
        },
        modeLabel: 'Character & scene continuity mode',
        modes: {
          auto: 'Auto (recommended): seamless, long films split into parallel chapters',
          strict: 'Strict continuity: sequential scene by scene (slowest)',
          balanced: 'Faster: parallel scene groups (cuts between groups)',
          anchor: 'Max character lock: no frame chaining, original refs only, fast'
        },
        premiseLabel: 'Idea / plot summary',
        premisePh: 'e.g. A young woman gets lost in an old train station at midnight and meets a ticket inspector from 50 years ago...',
        durLabel: 'Duration',
        durPh: 'e.g. 150s, 2:30, 4 min',
        durs: {
          d30: '30 sec (3 scenes)',
          d60: '1 min (6 scenes)',
          d90: '1 min 30s (9 scenes)',
          d120: '2 min (12 scenes)',
          d180: '3 min (18 scenes)',
          d300: '5 min (30 scenes)',
          d600: '10 min (60 scenes)'
        },
        ratioLabel: 'Aspect ratio',
        ratioPh: 'e.g. 21:9 (16:9, 9:16, 1:1, 3:4 merge most reliably)',
        voiceLabel: 'Dialogue language',
        voicePh: 'e.g. Thai, Italian',
        styleLabel: 'Style / idea',
        charsHint: 'Characters (consistent appearance):',
        bibleLabel: 'Film Bible (fixed across all scenes: cinematography, locations, outfits; auto-filled by AI, editable, injected into EVERY scene)',
        biblePh: 'Click "Write script with AI" to auto-generate, or write your own. e.g. Look: 35mm film, teal-orange grade. Locations: old train station at night... Fixed outfits: Mia: red wool coat...',
        musicLabel: 'Background music',
        planBtn: '✍️ Write script with AI',
        planningBtn: 'AI is writing (may take a few minutes)...',
        scriptTitle: 'Script (editable, 1 scene per line)',
        scriptPh: 'Click "Write script with AI" or paste in format:\n0-10s: ...\n10-20s: ...',
        scriptHint: 'Films are added to the shared queue and use Muse accounts just like Script mode.',
        goBtn: '🎬 Render film',
        queueingBtn: 'Adding to queue...',
        listTitle: 'Your Films',
        empty: 'No films yet.',
        countMeta: '{n} scenes · ~{sec}s',
        invalidDur: 'Invalid custom duration (e.g. 150, 2:30, 4 min).',
        confirmReplace: 'Replace current script with a newly AI-written script?',
        plannedToast: 'AI wrote {scenes} scene(s){bibleNote} Review and edit before rendering.',
        bibleOk: ' with Film Bible.',
        bibleManual: '. Could not auto-generate Bible; fill the Bible box manually for better consistency.',
        queuedToast: 'Added film to queue ({added}) and started rendering.'
      },
      aff: {
        title: 'Affiliate Video',
        sub: 'Product photos → sales script, caption, hashtags, and pinned comment → video.',
        cardTitle: '🛍️ Affiliate Video',
        cardHint: 'Enter product + photos → AI writes a formula-based sales script, caption, hashtags, and pinned comment → render video. Never invents prices/promos and does not auto-post.',
        productLabel: 'Product name',
        productPh: 'e.g. Portable mini blender',
        priceLabel: 'Price / promo (optional)',
        pricePh: 'e.g. $19.99, free shipping',
        pointsLabel: 'Key selling points (one per line or comma-separated)',
        pointsPh: '4000mAh battery, USB-C charging, crushes ice, easy to clean',
        descLabel: 'Product appearance (optional; leave blank for AI to describe from photos and lock across all scenes)',
        descPh: 'e.g. matte white cylinder blender, 20cm tall, black lid, blue MINIX logo on front...',
        audLabel: 'Target audience',
        audPh: 'e.g. office workers, busy parents',
        linkLabel: 'Affiliate link (included in post copy)',
        platLabel: 'Platform',
        platPh: 'e.g. YouTube Shorts, Amazon Video',
        plats: { tiktok: 'TikTok', shopee: 'Shopee Video', reels: 'Facebook / Instagram Reels' },
        formLabel: 'Script formula',
        formPh: 'e.g. comparison with old model, ASMR unboxing, customer story',
        forms: {
          review: 'Authentic review',
          problem: 'Problem → solution',
          unbox: 'Unboxing',
          beforeafter: 'Before / after',
          top: '3 reasons to buy'
        },
        durLabel: 'Duration',
        durPh: 'e.g. 45s, 1 min 30',
        copiesLabel: 'Variations (different hooks)',
        voiceLabel: 'Dialogue language',
        voicePh: 'e.g. Thai, Indonesian',
        ratioLabel: 'Aspect ratio',
        ratioPh: 'e.g. 4:5',
        refHint: 'Select 1–4 clear product photos from multiple angles (AI inspects all of them).',
        contLabel: 'Chain last frame (may drift product appearance, off by default)',
        contTitle: 'Affiliate scenes always run sequentially in one Muse chat session to preserve person/location/lighting/product. Enabling this also feeds the previous scene’s last frame as a reference: smoother cuts, but product details may drift.',
        goBtn: '🛍️ Create Affiliate Video',
        generatingBtn: 'AI is analyzing product & writing script...',
        listTitle: 'Created Affiliate Videos',
        empty: 'No affiliate videos yet.',
        invalidDur: 'Invalid custom duration.',
        createdToast: 'Created {added} affiliate video(s) and started rendering.{note}',
        postDetails: 'Post copy (caption, hashtags, pinned comment)',
        pinnedTag: '[Pinned comment] ',
        copyPost: 'Copy post text',
        toastCopied: 'Copied caption + link + hashtags'
      },
      tools: {
        cardMeta: '{project} · {total} scenes · {prog} done · {ratio}',
        scenesSummary: 'Scene scripts',
        sceneLine: 'Scene {n} [{st}]: {text}',
        watchVideo: '▶ Watch video'
      },
      codex: {
        title: 'AI Assistant',
        sub: 'Q&A, scriptwriting, prompt optimization, ideas, and captions via your Muse accounts.',
        cardTitle: '🤖 Codex AI',
        clearBtn: 'Clear chat',
        hint: 'Chat runs directly through your Muse accounts (each message uses 1 chat turn). Pick a mode and ask; copy or send results straight to Script or Film Maker.',
        inputPh: 'Type your question... (Ctrl+Enter to send)',
        sendBtn: 'Send',
        presets: {
          general: 'Q&A',
          script: 'Write Script',
          prompt: 'Optimize Prompt',
          ideas: 'Video Ideas',
          caption: 'Caption + Hashtags'
        },
        copyBtn: 'Copy',
        toScriptBtn: '→ Script',
        toFilmBtn: '→ Film Maker',
        thinking: 'Thinking...',
        empty: 'No messages yet. Try asking: "Write a 30-second coffee commercial script".',
        toastCopied: 'Copied',
        modePrefix: 'Mode: {mode}',
        confirmClear: 'Clear all Codex AI conversation history?'
      },
      settings: {
        title: 'Settings',
        sub: 'Output directory, concurrency, retries, and desktop notifications.',
        connTitle: 'Connection',
        connHint: 'Scripts and ideas are generated by Muse via your accounts in the Accounts tab — no extra API keys required.',
        outDirLabel: 'Output folder',
        maxRefsLabel: 'Max reference images per scene (2–9)',
        maxRefsTitle: 'Muse works best with concise references (e.g. 1 character + 1 product). Too many images can confuse roles or get ignored. When over the limit, previous last frames are dropped first, then extra character/product images.',
        concLabel: 'Max concurrent scenes (0 = auto by ready accounts)',
        retryLabel: 'Max retries per scene',
        pollLabel: 'Poll interval (seconds)',
        parLabel: 'Default parallel mode',
        parAuto: 'Auto (recommended): short videos sequential; long videos split into parallel chapters at scene shifts',
        parStrict: 'Strict continuity: sequential scene by scene, 1 account/video (slower for long videos)',
        parSmart: 'Smart: always split into parallel groups (faster, but cuts continuity at group boundaries)',
        parFast: 'Fastest: all scenes in parallel, no frame chaining',
        fadeLabel: 'Transition between 10s clips',
        fadeTitle: 'Muse outputs up to 10s/clip, so longer videos are merged from multiple clips. Crossfade smooths cuts; color & loudness matching balances brightness/color and audio levels across clips.',
        fade0: 'Hard cut (fastest)',
        fade03: 'Crossfade 0.3s',
        fade05: 'Crossfade 0.5s (recommended)',
        fade08: 'Crossfade 0.8s',
        matchLabel: 'Match color, brightness, and audio loudness when merging clips',
        autoFromLabel: 'Long video threshold (scenes)',
        autoFromTitle: 'At or above this scene count, Auto mode splits the video into parallel chapters (6 min = 36 scenes, 10 min = 60 scenes).',
        minChapLabel: 'Minimum scenes per chapter',
        minChapTitle: 'Minimum consecutive scenes per chapter (chained in one chat session). Higher = fewer cuts, lower = more parallelism.',
        checkLabel: 'Check cut continuity & auto-regen on sudden scene jumps',
        checkTitle: 'After each scene, compares the new clip’s first frame to the previous clip’s last frame; if Muse jumped to an unrelated setting, regenerates once (uses 1 extra quota).',
        sessLabel: 'Chain scenes in the same Muse chat session (keep context)',
        sessTitle: 'Chained scenes share ONE Muse chat on the same account so Muse remembers prior prompts and clips. Turning this off starts a fresh chat per scene with only the last frame + text summary.',
        notifyLabel: 'Desktop notification when a video finishes rendering',
        saveBtn: 'Save settings',
        testBtn: 'Test Python bridge',
        toastSaved: 'Settings saved',
        toastBridgeOk: 'Python bridge is working.'
      },
      toast: {
        welcome: 'Welcome! Follow the 5 quick-start steps on Home, or check the Guide.',
        noAccount: 'No Muse accounts yet. Please add an account first.',
        invalidDur: 'Invalid custom duration (e.g. 75, 1:30, 2 min).',
        needScript: 'Enter a script (or switch to "From Images").',
        needImg: 'Select at least 1 product image.',
        addedQueue: 'Added {n} video(s) to queue.{note}',
        addedRender: 'Added {n} video(s) and started rendering.{note}',
        charWarn: 'Character note: {warn}'
      },
      err: {
        ipcCall: 'Error calling {cmd}: {msg}',
        ipcUnknown: 'Unknown error calling {cmd}'
      },
      guide: {
        title: 'User Guide',
        sub: 'Read in 5 minutes and start creating. Use the left menu to jump to any section.',
        toc1: '1. Quick Start',
        toc2: '2. Writing Scripts',
        toc3: '3. Creation Modes',
        toc4: '4. Characters & Styles',
        toc5: '5. Queue & Scene Edits',
        toc6: '6. Parallel Rendering',
        toc7: '7. Auto Error Handling',
        toc8: '8. Saving Quota',
        toc9: '9. Troubleshooting',
        toc10: '10. Shortcuts',
        g1: `<h2>1. Quick Start</h2>
<ol><li><b>Activate your license key</b> (lock screen shown on first launch).</li>
<li>Go to <b>Accounts</b> → enter Muse email → <b>Send OTP</b> → enter code → <b>Verify &amp; add</b>. If you sign in with password/2FA, use <b>Import cookies</b>.</li>
<li>Go to <b>Settings</b> → <b>Test Python bridge</b> to verify the bridge works.</li>
<li>(Optional) Go to <b>Characters &amp; Styles</b> to save characters with reference photos.</li>
<li><b>Fastest way:</b> on <b>Home</b>, type an idea into <b>⚡ Quick Create</b> and click once. Or use <b>Script</b> to write scene-by-scene and click <b>Add to queue</b> (auto-starts by default). Finished videos appear in <b>Video Library</b> and your output folder.</li></ol>
<div class="callout">Use <b>secondary accounts</b>. Muse integration uses an unofficial internal protocol that may change when Muse updates.</div>`,
        g2: `<h2>2. Writing Scripts</h2>
<p>Each <b>line = one scene</b> (~<b>10 seconds</b>). Time prefixes like <code>0-10s:</code> are stripped automatically. Writing visuals, action, camera angle, and lighting in English yields the steadiest results; spoken dialogue can be in any supported language.</p>
<pre>0-10s: A young woman opens a gift box in a cozy warehouse, warm fairy lights, slow push-in
10-20s: The whole family gathers around the table, laughing, handheld camera
20-30s: Close-up of the product on the table, steam rising, soft golden light</pre>
<p><b>Multiple characters:</b> add bracketed names at the start of a line so only those characters’ reference images are sent:</p>
<pre>[Mia, Mom] Mia runs into the kitchen, Mom turns around smiling
[-] Wide shot of the city skyline at sunset, no characters</pre>
<p>Without tags, the app detects characters mentioned in the line. Use <b>Insert template</b> below the script box to start fast.</p>
<div class="callout">Tip: keep consecutive scenes continuous (same location, same outfit). Enable <b>Chain scenes seamlessly</b> to pass the previous scene’s last frame as reference.</div>`,
        g3: `<h2>3. Creation Modes</h2>
<table><tr><td>Script</td><td>Write scenes line by line. If fewer lines than target duration, Muse fills in the rest (when "Use Muse to write/split" is enabled).</td></tr>
<tr><td>From Images</td><td>Each product image generates its own video. Leave the script empty for AI to improvise.</td></tr>
<tr><td>Channel Studio</td><td>Configure a channel (style, cast, voice, subtitles) and click <b>Continue today</b> to hit daily goals. Outputs video, script, subtitles, thumbnail, and metadata with QC checks.</td></tr>
<tr><td>Film Maker</td><td>Enter a premise → AI creates a "Film Bible" (fixed look, locations, outfits) and writes multi-batch scripts → edit → render up to 60 scenes (10 min).</td></tr>
<tr><td>Affiliate Video</td><td>Enter product info + photos → AI writes a sales script + caption + hashtags + pinned comment. Never invents prices and never auto-posts.</td></tr>
<tr><td>AI Assistant</td><td>Chat to draft scripts, refine prompts, brainstorm ideas, and write captions. Send outputs directly to Script or Film Maker.</td></tr></table>`,
        g4: `<h2>4. Characters &amp; Styles</h2>
<ul><li><b>Characters:</b> name + fixed description (age, face, hair, outfit) + 1–2 clear face photos. Check them under "Characters" when creating videos.</li>
<li><b>Styles:</b> reusable text block for environment, color, lighting, and mood.</li>
<li>Edits to character photos/descriptions apply to any <b>unrendered</b> scenes.</li></ul>`,
        g5: `<h2>5. Queue &amp; Scene Edits</h2>
<ul><li>Click any queued video to inspect and edit individual scenes on the right panel.</li>
<li><b>↻ Regen</b>: re-render one scene while keeping all other scenes, then auto-merge.</li>
<li><b>✎ Edit</b>: rewrite a scene prompt and regenerate immediately (great when Muse rejects a prompt).</li>
<li><b>⏭ Skip</b>: drop a stuck scene and merge from the remaining scenes.</li>
<li><b>Retry all errors</b> in the bottom bar reruns every failed video at once.</li>
<li>Click <b>Stop</b> anytime; progress is saved and you can click <b>Resume</b> later.</li></ul>`,
        g6: `<h2>6. Parallel Rendering</h2>
<p>Each Muse account renders <b>1 clip at a time</b>, so <b>N accounts = up to N concurrent clips</b>. The <b>Account Lanes</b> card on Home shows what each account is rendering.</p>
<p>Chained scenes wait on the previous scene’s last frame, so purely sequential long videos only use 1 account. Choose a parallel mode in <b>Settings</b> or <b>Advanced options</b>:</p>
<table><tr><td>Smart</td><td>Recommended. Splits a video’s scenes into parallel groups; scenes inside each group still chain frames. E.g. 6 scenes + 3 accounts → 3 groups × 2 scenes. When queuing many videos, each video uses 1 group.</td></tr>
<tr><td>Strict continuity</td><td>Every scene chains from the previous one sequentially. Smoothest transitions, slowest for single videos.</td></tr>
<tr><td>Fastest</td><td>All scenes render simultaneously without frame chaining. Uses character reference images; cuts between scenes may vary slightly.</td></tr></table>
<ul><li>If an account hits quota, gets blocked, or fails repeatedly, active scenes <b>automatically fail over to another account</b>.</li>
<li>Scene starts are staggered to avoid bursts and balance load across accounts.</li>
<li>After the first few clips, real-time speed is measured to display <b>"~X min left"</b>.</li>
<li>Use <b>Check all</b> in Accounts to verify sessions before a big batch (costs zero generation quota).</li></ul>`,
        g7: `<h2>7. Auto Error Handling</h2>
<table><tr><th>Code</th><th>Meaning</th><th>App Behavior</th></tr>
<tr><td>412</td><td>Weekly quota reached</td><td>Rests account for 2 hours and moves scene to another account.</td></tr>
<tr><td>596 / 404</td><td>Session invalid / blocked</td><td>Marks account "Blocked" and fails over. Re-login that account.</td></tr>
<tr><td>429</td><td>Account busy</td><td>Waits 30 seconds and retries.</td></tr>
<tr><td>400 / 422</td><td>Content refused by Muse</td><td>Climbs the "softening ladder" (below) without penalizing the account.</td></tr>
<tr><td>502–504</td><td>Temporary / timeout error</td><td>Retries; repeated failures rest the account for 5 → 20 → 60 min. Temporarily failed videos auto-resume after ~10 min (up to 3 times) while the app is open.</td></tr></table>
<p><b>Softening ladder on content refusal:</b> level 0 original → 1 swap sensitive words + safety framing → 2 AI rewrite (no real names, implied action only) → 3 cutaway shot without faces. After 3 levels, the scene pauses so you can <b>Edit</b> or <b>Skip</b>.</p>
<div class="callout warn">Avoid real person names (historical or living), graphic violence, arrests, or weapons aimed at people—these are the top refusal triggers.</div>`,
        g8: `<h2>8. Saving Quota</h2>
<ul><li>Actual concurrency = <b>ready accounts</b> (1 clip per account). Setting "Max concurrent scenes" = 0 uses all ready accounts; set a non-zero number to cap it.</li>
<li>Each scene ≈ 1 Muse clip; AI scriptwriting, scene splitting, and AI Assistant chats also use 1 turn. If you already have a full script, uncheck "Use Muse to write/split".</li>
<li>Test a short clip (10–20s) to verify characters before increasing "Copies / video".</li>
<li>Check the estimate bar above "Add to queue" to see total clip cost before starting.</li></ul>`,
        g9: `<h2>9. Troubleshooting</h2>
<details><summary>"Python bridge not found"</summary><p>Running from source: launch via <code>CAI-DAT-VA-CHAY.bat</code>. Using the exe build: rebuild via <code>TAO-FILE-EXE.bat</code> (requires Internet on first run to embed Python).</p></details>
<details><summary>OTP fails / session expired</summary><p>Try importing cookies from Chrome (Cookie-Editor → Export JSON). Expired sessions show "Blocked"—just re-import or re-login.</p></details>
<details><summary>All accounts exhausted</summary><p>Add more accounts or wait for cooldowns. You can click <b>Reset</b> in Accounts if you know quota has refreshed.</p></details>
<details><summary>Character looks inconsistent across scenes</summary><p>Add clear face photos, write a detailed fixed description, keep Chaining enabled, and use <code>[Name]</code> tags per scene.</p></details>
<details><summary>Merge failed</summary><p>Open the video folder and verify each <code>scene_N.mp4</code> plays properly. Use ↻ Regen on any broken scene to re-merge.</p></details>`,
        g10: `<h2>10. Shortcuts</h2>
<table><tr><td>Ctrl + Enter</td><td>Add to queue (in Script box) · Send message (in AI Assistant)</td></tr>
<tr><td>Ctrl + 1…9</td><td>Switch between sidebar views</td></tr>
<tr><td>Ctrl + Enter (Home)</td><td>Create &amp; render immediately in Quick Create</td></tr>
<tr><td>F12</td><td>Open Developer Tools (when running via npm start)</td></tr></table>`
      }
    },

    zh: {
      nav: {
        tagline: 'AI 视频批量渲染',
        home: '首页',
        grpCreate: '创作视频',
        script: '脚本生成',
        studio: '频道工作室',
        film: '长片制作',
        aff: '带货视频',
        grpManage: '管理',
        library: '视频库',
        sync: '角色与风格',
        codex: 'AI 助手',
        grpSystem: '系统',
        accounts: '账号管理',
        settings: '设置',
        guide: '使用指南'
      },
      top: {
        allProjects: '全部项目',
        accPill: '账号：{active} 运行中 · {ok}/{total} 可用',
        langTitle: 'Language / Ngôn ngữ / 语言',
        themeTitle: '切换浅色 / 深色主题',
        resume: '▶ 继续运行',
        stopAll: '全部停止',
        outDir: '📁 视频目录'
      },
      common: {
        none: '无',
        save: '保存',
        cancel: '取消',
        cancelEdit: '取消编辑',
        edit: '编辑',
        delete: '删除',
        open: '打开',
        openDir: '打开文件夹',
        retry: '重试',
        stop: '停止',
        pick: '选择',
        pickFile: '选择文件',
        pickImages: '选择图片',
        clearImages: '清空图片',
        zeroImages: '0 张图片',
        imagesCount: '{n} 张图片',
        imagesSelected: '已选 {n} 张图片',
        sec10: '10 秒',
        sec20: '20 秒',
        sec30: '30 秒',
        sec40: '40 秒',
        sec60: '60 秒',
        under1Min: '不足 1 分钟',
        mins: '{m} 分钟',
        hours: '{h} 小时',
        hoursMins: '{h} 小时 {m} 分钟',
        errorPrefix: '错误：{msg}',
        confirmDelFiles: '是否同时删除磁盘上的视频文件？\n确定 = 删除文件，取消 = 仅从列表移除'
      },
      status: {
        pending: '等待中',
        running: '处理中',
        done: '已完成',
        error: '失败',
        skipped: '已跳过'
      },
      voice: {
        none: '无配音',
        noneShort: '无',
        vi: '越南语',
        en: '英语',
        ja: '日语',
        ko: '韩语',
        zh: '中文',
        th: '泰语',
        fr: '法语',
        es: '西班牙语'
      },
      customSelect: {
        otherOption: '✎ 自定义（手动输入）…',
        defaultPh: '请输入自定义内容…'
      },
      home: {
        heroTitle: '只需一个创意，<br>批量生成 AI <em>视频</em>。',
        heroDesc: '写好脚本（或只输入一句创意），加入队列即可自动渲染、衔接镜头、在额度耗尽时自动切换账号并合成完整视频。',
        ctaScript: '编写详细脚本',
        ctaGuide: '查看使用指南',
        quick: {
          title: '⚡ 快速生成',
          sub: '输入创意一键启动：自动写脚本、拆镜头、多账号并行渲染并合成视频。',
          ideaPh: '例：清晨温暖厨房里女孩冲泡咖啡，阳光透过窗户照入，特写热气缓缓升起...',
          dur: '时长',
          ratio: '画面比例',
          copies: '生成数量',
          voice: '配音语言',
          pickImg: '🖼 参考图片',
          noImg: '无图片',
          imgCountMore: '{n} 张图片（可继续添加）',
          estIdle: '输入创意以查看预估。',
          go: '⚡ 立即生成并渲染',
          needIdea: '请输入视频创意。',
          planning: '正在生成脚本…',
          projectDefault: '快速生成',
          createdToast: '已创建 {n} 个视频并开始渲染，可在“账号通道”查看进度。',
          addFail: '无法添加视频。',
          charsLabel: '角色：'
        },
        lanes: {
          title: '账号通道',
          hint: '每个账号同一时间渲染 1 个片段；额度耗尽或出错时自动分配给其他可用账号。',
          check: '检测登录状态',
          sceneWork: '镜头 {i}/{n} · {title}',
          preparing: '准备中…',
          idle: '空闲',
          usedScenes: '{n} 个镜头',
          empty: '暂无账号，请先到“账号管理”添加。'
        },
        eta: {
          runningEta: '运行中 · 约剩 {dur}',
          running: '运行中',
          stopped: '已停止'
        },
        queue: {
          title: '处理队列',
          hintSome: '点击任意视频查看详情。',
          hintEmpty: '当前没有待处理视频，可在上方“快速生成”创建。',
          itemMeta: '{done}/{total} 镜头',
          chains: ' · {n} 个并行分组'
        },
        stats: {
          ready: '可用账号',
          running: '渲染中',
          pending: '等待中',
          done: '已完成',
          error: '失败',
          maxPar: '最大并行片段数'
        },
        steps: {
          title: '5 分钟快速上手',
          hint: '完成以下步骤后会自动勾选。',
          next: '下一步',
          s1Title: '添加 Muse 账号',
          s1Desc: '进入“账号管理”→ 验证码或导入 Cookie。',
          s2Title: '确保账号可用',
          s2Desc: '登录状态有效且未达本周额度上限。',
          s3Title: '创建角色（可选）',
          s3Desc: '保持跨镜头人物外观一致。',
          s4Title: '创建第一个视频',
          s4Desc: '在上方 ⚡ 快速生成中输入创意。',
          s5Title: '完成首个视频渲染',
          s5Desc: '在账号通道观察进度，完成后可在视频库查看。'
        },
        recent: {
          title: '最近完成',
          empty: '暂无已完成的视频。'
        },
        cards: {
          scriptTitle: '脚本生成',
          scriptDesc: '粘贴脚本或由 AI 拆分镜头，支持 [角色名] 标签。',
          studioTitle: '频道工作室',
          studioDesc: '按每日目标批量制作频道剧集，含配音与字幕。',
          filmTitle: '长片制作',
          filmDesc: 'AI 分批次撰写连贯剧情并合成长视频。',
          affTitle: '带货视频',
          affDesc: '生成带货脚本、文案、话题标签与置顶评论。',
          codexTitle: 'AI 助手',
          codexDesc: '在应用内直接生成脚本、优化提示词和文案。'
        },
        est: {
          noAcc: '暂无可用账号：请到“账号管理”添加或检测登录状态。',
          summary: '≈ {nVideos} 个视频 · {clips} 个 Muse 片段（约 {sec} 秒视频）{extra}。{acc} 个可用账号 → 同时运行 {par} 个片段{chains}{eta}。',
          chains: '（每个视频分 {per} 组）',
          eta: ' · 预计约 {dur}',
          extraPerVideo: ' · Muse 将补写 {n} 个镜头/视频',
          extraQuick: ' · Muse 生成 {n} 个镜头/视频',
          tipAuto: ' 提示：选择“自动模式”可让长视频在多账号间并行分段渲染。',
          needImg: '请至少选择 1 张图片：每张图片将生成一个独立视频。',
          needScript: '输入脚本（每行一个镜头）以查看预估。',
          etaSuffix: ' · 约剩 {dur}'
        },
        tpl: {
          productName: '产品展示广告',
          productBody: '0-10s: Opening hook, a striking close-up reveal of the product, glossy light, shallow depth of field, slow push-in\n10-20s: A person naturally using and enjoying the product in a warm everyday setting, handheld camera, genuine reaction\n20-30s: Final shot, the product centered with its packaging clearly visible, confident camera pull-back, clean ending',
          characterName: '角色故事短片',
          characterBody: '[角色名] walks into a sunlit kitchen, curious, slow tracking shot\n[角色名] discovers something unexpected on the table, close-up of the surprised face\n[角色名] laughs and shares it with the family, warm wide shot, cozy light',
          vlogName: '旅行 / Vlog',
          vlogBody: '0-10s: Sunrise over a quiet old town, drone shot slowly descending, golden light\n10-20s: A traveler walks through a busy morning market, handheld, vivid colors, ambient sound\n20-30s: The traveler sits at a street-side cafe enjoying breakfast, shallow depth of field, relaxed mood'
        },
        retryAllNone: '当前没有失败的视频。',
        retryAllDone: '已重试 {n} 个失败的视频。'
      },
      script: {
        title: '从脚本创建视频',
        sub: '每行写一个镜头（约 10 秒），或切换到“以图生视频”为每张图片生成独立视频。加入队列后点击开始渲染。',
        tabScript: '脚本',
        tabImage: '以图生视频',
        placeholder: '示例：\n0-10s: 女孩在温馨仓库拆开礼盒，暖色节日灯串，缓慢推进\n10-20s: 一家人围坐餐桌拆节日礼物，手持跟拍\n（每 10 秒 = 1 个镜头。“以图生视频”模式可留空由 AI 自动构思。）\n多角色：行首写 [小美, 妈妈] 指定出镜角色；不写则按句中名字自动识别。',
        tplLabel: '插入模板：',
        refHint: '“以图生视频”模式：每张图生成 1 个视频。“脚本”模式：图片作为产品参考图。',
        ratio: '画面比例',
        duration: '视频时长',
        durPh: '例：75s, 1:30, 2 分钟',
        dur10: '10 秒（1 个镜头）',
        dur20: '20 秒（2 个镜头）',
        dur30: '30 秒（3 个镜头）',
        dur40: '40 秒（4 个镜头）',
        dur60: '60 秒（6 个镜头）',
        durAuto: '按脚本行数自动匹配',
        voice: '配音语言',
        voicePh: '例：泰语, Italian',
        style: '风格 / 创意模板',
        charsHint: '角色（全片保持外观一致）：',
        advTitle: '⚙ 高级选项',
        prefixLabel: '提示词前缀',
        projectLabel: '项目名称',
        projectPh: '例：KOREAN BBQ',
        copiesLabel: '每个视频生成份数',
        parallelLabel: '并行渲染模式',
        parDefault: '跟随设置（推荐）',
        parAuto: '自动：短视频全连贯，长视频自动分章并行',
        parSmart: '智能：将镜头分组并行渲染',
        parStrict: '绝对连贯：严格顺序逐镜渲染',
        parFast: '最快速度：所有镜头同时并行',
        continuity: '镜头无缝衔接（提取上一镜头末帧作参考）',
        useAI: '镜头不足时使用 Muse 自动补写/拆分',
        useMusic: '添加背景音乐',
        autoStart: '加入队列后立即开始渲染',
        estIdle: '输入脚本以查看预估。',
        addBtn: '加入队列',
        preparing: '正在准备（AI 拆分镜头中）...',
        colVideo: '视频',
        colStatus: '状态',
        colActions: '操作',
        defaultPrefix: '生成写实视频：'
      },
      queue: {
        selectAll: '全选',
        deselectAll: '取消全选',
        delSelectedInit: '删除所选 (0)',
        delSelected: '删除所选 ({n})',
        retryAll: '↻ 重试全部失败',
        clearDone: '清除已完成',
        startRender: '▶ 开始渲染',
        summary: '运行中 {run} 个 · 已完成 {done}/{total} · 失败 {err}{eta}',
        filterAll: '全部 {n}',
        filterPending: '等待 {n}',
        filterRunning: '运行 {n}',
        filterDone: '完成 {n}',
        filterError: '失败 {n}',
        rowMeta: '{n} 镜头 · 已完成 {prog} · {ratio} · {project}',
        empty: '队列为空。输入脚本后点击“加入队列”。',
        openDirTitle: '打开文件夹',
        retryTitle: '重试',
        confirmClearDone: '确定从列表移除所有已完成视频？（磁盘文件将保留）',
        selectPrompt: '请在左侧选择一个视频查看详情。',
        projectLabel: '项目：',
        sceneTitle: '镜头 {n}',
        regenBtn: '↻ 重绘',
        regenTitle: '仅重新渲染第 {n} 镜头（保留其余镜头）',
        editBtn: '✎ 编辑',
        editTitle: '修改镜头内容并重新生成',
        skipBtn: '⏭ 跳过',
        skipTitle: '跳过此镜头并用其余镜头合成视频',
        softened: '柔化等级 {n}/3',
        noChar: '无角色',
        guessedChar: '（自动识别）',
        saveRegen: '保存并重新生成',
        tagsPh: '标签（用逗号分隔）',
        notePh: '备注',
        confirmSkip: '确定跳过第 {n} 镜头？\n视频将由其余镜头合成。',
        confirmRegen: '仅重新生成第 {n} 镜头？\n其余镜头保持不变，完成后将自动重新合成视频。'
      },
      preview: {
        title: '预览与详情'
      },
      library: {
        title: '视频库',
        sub: '查看所有已完成的视频，支持按名称、标签或备注搜索。',
        searchPh: '按名称、标签、备注搜索...',
        count: '{n} 个视频',
        secDur: '{n}秒',
        openBtn: '📁 打开',
        rejoinBtn: '🔄 重新合成',
        rejoinTitle: '使用当前转场与色彩/音量同步设置重新合并片段',
        rejoining: '合成中...',
        empty: '暂无已完成的视频。',
        confirmDel: '确定删除此视频及磁盘上的文件？',
        toastRejoined: '视频已重新合成',
        toastRejoinErr: '重新合成失败'
      },
      sync: {
        title: '角色与风格',
        sub: '一次保存即可在所有视频中复用，保持人物外观与画面基调统一。',
        charTitle: '🧍 角色档案',
        charHint: '参考图与固定描述会自动注入每个镜头，确保角色从头到尾一致。',
        charNamePh: '角色名称（例：小兰）',
        charDescPh: '固定描述：年龄、脸型、发型、服装等（英文描述效果最佳）',
        charPickBtn: '选择图片（1–2 张清晰正脸）',
        charAutoBtn: '从图片自动生成描述',
        charAutoTitle: 'Muse 识别图片并生成固定外观描述',
        charDescribing: '识别描述中...',
        charSaveBtn: '保存角色',
        charEmpty: '暂无角色。',
        confirmDelChar: '确定删除此角色？',
        styleTitle: '💡 创意 / 风格',
        styleHint: '可复用的场景、色调、光线与氛围文本块。',
        styleNamePh: '名称（例：温暖圣诞集市）',
        styleTextPh: '例：warm Christmas market at night, golden fairy lights, snowy background, cinematic soft film look',
        styleAutoBtn: 'AI 自动生成描述',
        styleAutoTitle: 'Muse 根据名称和备注生成风格描述',
        styleWriting: '生成中...',
        styleEmpty: '暂无创意或风格。',
        confirmDelStyle: '确定删除此项？',
        noCharPicker: '暂无角色 – 请先在“角色与风格”创建。',
        noStyleOption: '— 不使用 —',
        toastPickFirst: '请先选择角色图片。',
        toastCharDescribed: '已生成描述，可修改后保存',
        toastCharDescribeErr: '图片描述失败',
        toastCharSaved: '角色已保存',
        toastStyleNeedName: '请先输入创意/风格名称。',
        toastStyleDescribeErr: '生成描述失败',
        toastStyleSaved: '已保存'
      },
      accounts: {
        title: 'Muse 账号',
        sub: '每个账号同时渲染 1 个视频。添加多个账号可实现并行渲染与额度耗尽自动切换。',
        otpTitle: '添加 Muse 账号',
        otpHint: '通过发送至 Muse 邮箱/手机的验证码登录（无需密码，无需付费第三方服务）。登录态仅保存在本地。此为非官方内部协议，平台更新时可能失效，建议使用小号。',
        emailPh: 'Muse 邮箱',
        sendOtp: '发送验证码',
        otpPh: '验证码',
        confirmAdd: '验证并添加',
        cookieTitle: '或从浏览器导入 Cookie',
        cookieHint: '当使用密码或双因素验证登录 muse.ai 时使用：在 Chrome 登录后导出 muse.ai 的 Cookie（Cookie-Editor → Export → JSON，或 cookies.txt）并粘贴到此处。Cookie 等同于密码，请勿泄露；过期后重新导入即可。',
        cookieEmailPh: 'Muse 邮箱（用于标识账号）',
        cookieAdd: '导入 Cookie',
        cookieTextPh: '粘贴 JSON 或 cookies.txt 内容',
        listTitle: '账号列表',
        checkAll: '全部检测',
        resetAll: '全部重置',
        checkBridge: '检测 Bridge',
        listHint: '当某个账号周额度耗尽 (412)、被封禁 (596) 或连续报错时，任务会自动切换至其他可用账号。',
        disabled: '已禁用',
        blocked: '已封禁 / 需重新登录',
        exhaustedUntil: '冷却至 {time}',
        ready: '可用',
        colEmail: '邮箱',
        colStatus: '状态',
        colRunning: '运行中',
        colUsed: '已分配',
        colLastErr: '最近错误',
        colSession: '登录状态',
        sessionOk: '✓ 会话有效 ({time})',
        sessionErrFallback: '会话失效',
        btnCheck: '检测',
        btnEnable: '启用',
        btnDisable: '禁用',
        btnReset: '重置',
        empty: '暂无账号，请在上方添加。',
        confirmRemove: '确定移除此账号并删除本地保存的登录态？',
        toastSessionOk: '登录状态有效 ✓',
        toastSessionBad: '登录状态异常：{msg}',
        toastAdded: '账号已添加',
        toastOtpSent: '验证码已发送，请输入后点击“验证并添加”。',
        toastCookieAdded: 'Cookie 已导入且会话有效',
        toastCheckAll: '有效会话：{ok}/{total} 个账号。{extra}',
        toastCheckAllExtra: ' 异常账号已标记。',
        toastResetAll: '已重置所有账号状态。',
        toastBridgeOk: 'Bridge 运行正常，本地已保存 {n} 个会话。'
      },
      studio: {
        title: '频道工作室',
        sub: '一句话需求 → 脚本 → 渲染 → 配音/字幕 → 质检 → 导出剧集目录，按每日目标批量生产。',
        todayTitle: '今日进度',
        continueBtn: '▶ 继续今日制作',
        continueMore: '▶ 继续今日制作（{retryPart}还需 {missing} 集）',
        continueRetryPart: '重试 {failed} 个失败 + ',
        continueDone: '✔ 已达成今日目标',
        moreSummary: '额外生成 / 输入自定义创意',
        moreCountLabel: '追加生成集数',
        moreBtn: '追加生成（AI 构思）',
        ideasPh: '或输入您的剧集创意，每行 1 集（留空则由 AI 构思）：\n小玉米饭前偷吃饼干\n小玉米和妈妈去买菜',
        fromIdeasBtn: '按以上列表创建剧集',
        newEpTitle: '制作新剧集',
        newEpHint: '只需输入一句自然语言要求。应用会自动编写脚本、拆分镜头、渲染、加配音/字幕、质检并导出剧集目录。',
        newChBtn: '+ 新建频道',
        reqPh: '例：快乐一家人 —— 制作一集关于饭前偷吃零食的趣事。',
        goBtn: '制作新剧集',
        epsTitle: '剧集列表',
        noChannelOpt: '（暂无频道）',
        progHtml: '今日已创建 <b>{made}</b>/{target} 集 · 完成 {finished} · 已发布 {posted}',
        progFailed: ' · <span style="color:#ff8a8d">{failed} 失败</span>',
        contHint: '约需 {clips} 个 Muse 片段，当前有 {acc} 个可用账号（账号有每周额度限制）。',
        needChannelHint: '请先在下方“频道配置”中创建频道。',
        hintMeta: '{ratio} · {dur}秒 · {voice} · {chars} 个角色',
        voiceShort: { muse: 'Muse 原声', tts: 'TTS 配音', none: '无旁白' },
        charsLabel: '角色（角色档案）：',
        charsEmpty: '暂无角色，请先到“角色与风格”创建后返回选择。',
        st: {
          planning: '编写脚本中',
          queued: '等待渲染',
          rendering: '渲染中',
          finishing: '后期合成中',
          done: '已完成',
          review: '需复核',
          error: '失败'
        },
        scSt: { pending: '等待', running: '运行', done: '完成', error: '失败' },
        filters: { ready: '待发布', work: '制作中', error: '失败', posted: '已发布', all: '全部' },
        ep: {
          qcTitle: '质量检查结果',
          notChecked: '未检查：{name}',
          sceneChip: '镜{n} {st}',
          regenSceneTitle: '仅重绘第 {n} 镜头',
          postedBadge: '已发布',
          watchVideo: '▶ 播放视频',
          logTitle: '运行日志',
          copyPost: '复制发布文案',
          unmarkPosted: '取消已发布',
          markPosted: '标为已发布',
          emptyReady: '暂无待发布剧集，可点击上方“继续今日制作”。',
          emptyOther: '暂无剧集。'
        },
        confirm: {
          regenScene: '仅重新生成第 {n} 镜头？\n其余镜头不变，完成后会自动重新合成、质检并导出。',
          delEp: '从列表移除此剧集？（已导出的文件会保留）',
          delCh: '确定删除此频道？'
        },
        toast: {
          copiedPost: '已复制标题 + 简介 + 话题标签',
          todayStarted: '已启动：新建 {created} 集，重试 {retried} 集。',
          todayMet: '今日目标已达成。',
          batchStarted: '已开始制作 {created} 集新剧集。',
          ideasStarted: '已启动 {created} 集{skipped}。',
          ideasSkipped: '，跳过 {n} 个重复项',
          needChName: '保存前请输入频道名称',
          chSaved: '已保存频道：{name}',
          epStarted: '已开始制作新剧集。'
        },
        form: {
          title: '频道配置',
          newTitle: '新建频道',
          editTitle: '编辑频道：{name}',
          name: '频道名称',
          namePh: '快乐一家人',
          style: '固定视觉风格',
          stylePh: '3D Pixar-style, warm cozy home lighting',
          ratio: '画面比例',
          dur: '目标时长（秒，10–60）',
          lang: '语言',
          voiceMode: '配音方式',
          voiceMuse: '由 Muse 在视频中生成对白',
          voiceTts: '使用 TTS 配音 (edge-tts) 混音',
          voiceNone: '无对白',
          ttsDefault: '默认 TTS 音色（可选）',
          ttsMap: '按角色指定音色（每行 角色名=音色）',
          ttsMapPh: '小兰=zh-CN-XiaoxiaoNeural',
          dailyTarget: '每日目标产量（集/天）',
          ideaSeeds: '内容方向 / 主题种子（每行 1 个，供 AI 构思新剧集）',
          ideaSeedsPh: '家里发生的搞笑小事\n周末和家人一起做饭\n户外郊游日常',
          avoid: '额外规避内容（可选）',
          avoidPh: '暴力画面、角色直视镜头',
          subtitles: '生成 .srt 字幕',
          continuity: '镜头之间无缝衔接',
          music: '背景音乐',
          delBtn: '删除频道',
          saveBtn: '保存频道'
        }
      },
      film: {
        title: '长片制作',
        sub: '从创意出发制作多镜头连贯短片（最长 10 分钟）。',
        cardTitle: '🎥 长片制作',
        cardHint: '输入创意 → AI 分批次编写多镜头脚本（每镜约 10 秒，保持剧情连贯）→ 自由修改 → 渲染并合成为完整影片。最多 60 个镜头（10 分钟）。',
        nameLabel: '影片名称',
        namePh: '例：末班列车',
        genreLabel: '题材类型',
        genrePh: '例：悬疑喜剧、黑色侦探、武侠',
        genres: {
          drama: '剧情 / 情感',
          action: '动作 / 悬疑',
          comedy: '轻喜剧',
          horror: '神秘 / 惊悚',
          fantasy: '奇幻冒险',
          scifi: '科幻',
          romance: '爱情',
          doc: '纪录片'
        },
        modeLabel: '角色与镜头连贯策略',
        modes: {
          auto: '自动（推荐）：连贯优先，长片自动分章并行',
          strict: '绝对连贯：严格逐镜头顺序生成（最慢）',
          balanced: '更快：分组并行渲染（组间衔接处会断开）',
          anchor: '强锁角色：不传末帧，仅用原图参考，速度最快'
        },
        premiseLabel: '故事创意 / 剧情梗概',
        premisePh: '例：一名年轻女孩午夜迷失在老旧火车站，遇见了来自五十年前的检票员...',
        durLabel: '影片时长',
        durPh: '例：150s, 2:30, 4 分钟',
        durs: {
          d30: '30 秒（3 个镜头）',
          d60: '1 分钟（6 个镜头）',
          d90: '1 分 30 秒（9 个镜头）',
          d120: '2 分钟（12 个镜头）',
          d180: '3 分钟（18 个镜头）',
          d300: '5 分钟（30 个镜头）',
          d600: '10 分钟（60 个镜头）'
        },
        ratioLabel: '画面比例',
        ratioPh: '例：21:9（仅 16:9、9:16、1:1、3:4 合成最稳定）',
        voiceLabel: '对白语言',
        voicePh: '例：泰语, Italian',
        styleLabel: '风格 / 创意模板',
        charsHint: '角色（保持外观一致）：',
        bibleLabel: '影片圣经 Bible（全片固定：摄影风格、场景、角色服装；AI 写脚本时自动生成，可手动修改并注入每个镜头）',
        biblePh: '点击“AI 自动写脚本”生成，或手动填写。例：Look: 35mm film, teal-orange grade. Locations: old train station at night... Fixed outfits: Mia: red wool coat...',
        musicLabel: '背景音乐',
        planBtn: '✍️ AI 自动写脚本',
        planningBtn: 'AI 编写中（可能需要几分钟）...',
        scriptTitle: '脚本（可编辑，每行 1 个镜头）',
        scriptPh: '点击“AI 自动写脚本”或按以下格式粘贴：\n0-10s: ...\n10-20s: ...',
        scriptHint: '影片会加入公共队列，与脚本模式共用 Muse 账号池。',
        goBtn: '🎬 开始渲染影片',
        queueingBtn: '正在加入队列...',
        listTitle: '我的影片',
        empty: '暂无影片。',
        countMeta: '{n} 个镜头 · 约 {sec} 秒',
        invalidDur: '自定义时长格式无效（例：150、2:30、4 分钟）。',
        confirmReplace: '是否用 AI 新写的脚本替换当前内容？',
        plannedToast: 'AI 已生成 {scenes} 个镜头{bibleNote} 请检查修改后再渲染。',
        bibleOk: '并附带影片圣经。',
        bibleManual: '。未能自动生成圣经，建议手动补充上方 Bible 以提升连贯性。',
        queuedToast: '已将影片加入队列 ({added}) 并开始渲染。'
      },
      aff: {
        title: '带货视频',
        sub: '商品图片 → 带货脚本、文案、话题标签与置顶评论 → 生成视频。',
        cardTitle: '🛍️ 带货视频',
        cardHint: '输入商品信息与图片 → AI 按营销公式生成带货脚本、文案、标签与置顶评论 → 渲染视频。不会虚构价格/促销，也不会自动发布。',
        productLabel: '商品名称',
        productPh: '例：便携式迷你榨汁杯',
        priceLabel: '价格 / 优惠（可选）',
        pricePh: '例：¥99，包邮',
        pointsLabel: '核心卖点（每行一条或用逗号分隔）',
        pointsPh: '4000mAh 电池、Type-C 充电、可碎冰、易清洗',
        descLabel: '商品外观描述（可选；留空则由 AI 根据图片描述并锁定到所有镜头）',
        descPh: '例：matte white cylinder blender, 20cm tall, black lid, blue logo MINIX on front...',
        audLabel: '目标人群',
        audPh: '例：上班族、宝妈',
        linkLabel: '推广链接（写入发布文案）',
        platLabel: '发布平台',
        platPh: '例：YouTube Shorts, 小红书',
        plats: { tiktok: 'TikTok / 抖音', shopee: 'Shopee Video', reels: 'Facebook / Instagram Reels' },
        formLabel: '脚本公式',
        formPh: '例：新旧对比、ASMR 拆箱、用户真实故事',
        forms: {
          review: '真实测评',
          problem: '痛点 → 解决方案',
          unbox: '开箱体验',
          beforeafter: '使用前后对比',
          top: '必买的 3 个理由'
        },
        durLabel: '时长',
        durPh: '例：45 秒, 1 分 30 秒',
        copiesLabel: '变体数量（不同开头钩子）',
        voiceLabel: '对白语言',
        voicePh: '例：泰语, Indonesian',
        ratioLabel: '画面比例',
        ratioPh: '例：4:5',
        refHint: '选择 1–4 张多角度清晰商品图（AI 会综合参考全部图片）。',
        contLabel: '额外传递上一镜头末帧（易导致商品变形，默认关闭）',
        contTitle: '带货镜头默认在同一 Muse 会话中顺序生成，以保持人物/环境/光线/商品一致。开启此项还会附带上一镜头的末帧图：过渡更连贯，但商品外观更容易偏移原图。',
        goBtn: '🛍️ 生成带货视频',
        generatingBtn: 'AI 正在分析商品并撰写脚本...',
        listTitle: '已创建的带货视频',
        empty: '暂无带货视频。',
        invalidDur: '自定义时长格式无效。',
        createdToast: '已创建 {added} 个带货视频并开始渲染。{note}',
        postDetails: '发布文案（正文、话题标签、置顶评论）',
        pinnedTag: '[置顶评论] ',
        copyPost: '复制发布文案',
        toastCopied: '已复制文案 + 链接 + 标签'
      },
      tools: {
        cardMeta: '{project} · {total} 镜头 · 已完成 {prog} · {ratio}',
        scenesSummary: '分镜脚本',
        sceneLine: '镜头 {n} [{st}]：{text}',
        watchVideo: '▶ 播放视频'
      },
      codex: {
        title: 'AI 助手',
        sub: '通过您的 Muse 账号进行问答、写脚本、优化提示词、构思创意与文案。',
        cardTitle: '🤖 Codex AI',
        clearBtn: '清空对话',
        hint: '直接通过您的 Muse 账号对话（每次提问消耗 1 次对话额度）。选择模式后提问，结果可一键复制或发送到脚本/长片制作。',
        inputPh: '输入问题...（Ctrl+Enter 发送）',
        sendBtn: '发送',
        presets: {
          general: '自由问答',
          script: '编写脚本',
          prompt: '优化提示词',
          ideas: '视频创意',
          caption: '文案 + 标签'
        },
        copyBtn: '复制',
        toScriptBtn: '→ 发送到脚本',
        toFilmBtn: '→ 发送到长片',
        thinking: '思考中...',
        empty: '暂无对话记录。试着提问：“帮我写一个 30 秒咖啡广告脚本”。',
        toastCopied: '已复制',
        modePrefix: '当前模式：{mode}',
        confirmClear: '确定清空 Codex AI 的全部对话记录？'
      },
      settings: {
        title: '设置',
        sub: '输出目录、并行镜头数、重试次数与桌面通知。',
        connTitle: '连接说明',
        connHint: '脚本与创意均通过“账号管理”中的 Muse 账号直接生成，无需额外配置其他 API Key。',
        outDirLabel: '视频保存目录',
        maxRefsLabel: '每镜头最大参考图数量 (2–9)',
        maxRefsTitle: 'Muse 建议使用精简参考图（如 1 张角色图 + 1 张商品图）；图片过多容易混淆角色或被忽略。超出上限时会先丢弃末帧，再丢弃多余参考图。',
        concLabel: '最大并行镜头数（0 = 自动按可用账号数）',
        retryLabel: '单镜头失败重试次数',
        pollLabel: '状态轮询间隔（秒）',
        parLabel: '默认并行渲染模式',
        parAuto: '自动（推荐）：短视频全连贯；长视频自动在转场处拆章并行',
        parStrict: '绝对连贯：逐镜头顺序渲染，单视频仅用 1 个账号（长视频较慢）',
        parSmart: '智能：所有视频均分组并行（更快，但组间衔接处会断开）',
        parFast: '最快：所有镜头同时并行，不传末帧',
        fadeLabel: '10 秒片段间的转场效果',
        fadeTitle: 'Muse 单次最多生成 10 秒片段，长视频由多片段拼接而成。淡入淡出可弱化接缝；色彩与音量同步可统一明暗和响度，但合成会多花几十秒。',
        fade0: '硬切（最快）',
        fade03: '淡入淡出 0.3s',
        fade05: '淡入淡出 0.5s（推荐）',
        fade08: '淡入淡出 0.8s',
        matchLabel: '合成时自动统一各片段的色彩、亮度与音量',
        autoFromLabel: '长视频分章阈值（镜头数）',
        autoFromTitle: '达到或超过此镜头数时，“自动模式”才会将视频拆分为并行章节（6 分钟 = 36 镜头，10 分钟 = 60 镜头）。',
        minChapLabel: '每章最少连续镜头数',
        minChapTitle: '每章至少包含的连续镜头数（在同一对话中连贯生成）。越大切点越少，越小并行度越高。',
        checkLabel: '检测镜头衔接，若画面跳变自动重绘一次',
        checkTitle: '每个镜头完成后对比首帧与上一镜头末帧；若 Muse 跳到无关场景则自动重绘 1 次（多消耗 1 次额度）。',
        sessLabel: '在同一 Muse 会话中衔接镜头（保留上下文记忆）',
        sessTitle: '开启后连贯镜头共用同一个 Muse 对话（同一账号），便于记住前文。关闭则每个镜头新建会话，仅传末帧图片与文字摘要。',
        notifyLabel: '视频渲染完成时发送桌面通知',
        saveBtn: '保存设置',
        testBtn: '测试 Python Bridge',
        toastSaved: '设置已保存',
        toastBridgeOk: 'Python Bridge 运行正常。'
      },
      toast: {
        welcome: '欢迎使用！请先查看首页的 5 步快速上手，或阅读使用指南。',
        noAccount: '暂无 Muse 账号，请先添加账号。',
        invalidDur: '自定义时长无效（例：75、1:30、2 分钟）。',
        needScript: '请输入脚本（或切换到“以图生视频”标签）。',
        needImg: '请至少选择 1 张商品图片。',
        addedQueue: '已将 {n} 个视频加入队列。{note}',
        addedRender: '已添加 {n} 个视频并开始渲染。{note}',
        charWarn: '角色提示：{warn}'
      },
      err: {
        ipcCall: '调用 {cmd} 出错：{msg}',
        ipcUnknown: '调用 {cmd} 时发生未知错误'
      },
      guide: {
        title: '使用指南',
        sub: '5 分钟即可上手，点击左侧目录快速跳转。',
        toc1: '1. 快速开始',
        toc2: '2. 编写脚本',
        toc3: '3. 创作模式',
        toc4: '4. 角色与风格',
        toc5: '5. 队列与镜头修改',
        toc6: '6. 多账号并行',
        toc7: '7. 自动错误处理',
        toc8: '8. 节省额度',
        toc9: '9. 常见问题',
        toc10: '10. 快捷键',
        g1: `<h2>1. 快速开始</h2>
<ol><li><b>激活密钥</b>（首次打开应用时会弹出锁屏验证）。</li>
<li>进入 <b>账号管理</b> → 输入 Muse 邮箱 → <b>发送验证码</b> → 输入验证码 → <b>验证并添加</b>。如使用密码/2FA 登录，可使用 <b>导入 Cookie</b>。</li>
<li>进入 <b>设置</b> → 点击 <b>测试 Python Bridge</b> 确认连接组件正常。</li>
<li>（可选）进入 <b>角色与风格</b> 保存带参考图的角色档案。</li>
<li><b>最快用法：</b>在 <b>首页</b> 的 <b>⚡ 快速生成</b> 输入创意并一键启动；或在 <b>脚本生成</b> 逐镜编写后点击 <b>加入队列</b>（默认自动开始渲染）。成片保存在 <b>视频库</b> 与输出文件夹中。</li></ol>
<div class="callout">建议使用<b>备用小号</b>。与 Muse 的通信基于非官方内部协议，平台更新后可能会出现变动。</div>`,
        g2: `<h2>2. 编写脚本</h2>
<p>每 <b>一行 = 一个镜头</b>，约 <b>10 秒</b>。类似 <code>0-10s:</code> 的时间前缀会自动去除。主体、动作、景别和光影建议用英文描述以获得更稳定效果，口播台词可使用中文或其他目标语言。</p>
<pre>0-10s: A young woman opens a gift box in a cozy warehouse, warm fairy lights, slow push-in
10-20s: The whole family gathers around the table, laughing, handheld camera
20-30s: Close-up of the product on the table, steam rising, soft golden light</pre>
<p><b>多角色控制：</b>在行首用方括号标明出场角色，应用只会发送对应角色的参考图：</p>
<pre>[小美, 妈妈] 小美跑进厨房，妈妈回头微笑
[-] 日落时的城市全景，无人出场</pre>
<p>未加标签时应用会根据句子中的名字自动匹配角色。输入框下方的 <b>插入模板</b> 可帮您快速起步。</p>
<div class="callout">技巧：相邻镜头保持同一场景与服装连贯，开启 <b>镜头无缝衔接</b> 可自动将上一镜末帧传入下一镜。</div>`,
        g3: `<h2>3. 创作模式</h2>
<table><tr><td>脚本生成</td><td>逐行写镜头；若行数少于目标时长，Muse 会自动补全（需开启“使用 Muse 自动补写/拆分”）。</td></tr>
<tr><td>以图生视频</td><td>每张商品图单独生成一个视频，脚本可留空交由 AI 发挥。</td></tr>
<tr><td>频道工作室</td><td>配置频道（风格、角色、配音、字幕）后点击 <b>继续今日制作</b> 完成日更目标，自动质检并输出视频、脚本、字幕、封面与元数据目录。</td></tr>
<tr><td>长片制作</td><td>输入创意 → AI 生成“影片圣经”（固定画风、场景、服装）并分批写脚本 → 修改 → 渲染，最长 60 个镜头（10 分钟）。</td></tr>
<tr><td>带货视频</td><td>填写商品卖点与图片 → AI 生成带货脚本 + 文案 + 标签 + 置顶评论。绝不虚构价格，也不会自动发布。</td></tr>
<tr><td>AI 助手</td><td>对话撰写脚本、优化提示词、构思选题与文案，一键发送到脚本生成或长片制作。</td></tr></table>`,
        g4: `<h2>4. 角色与风格</h2>
<ul><li><b>角色：</b>名称 + 固定外貌描述（年龄、五官、发型、服饰）+ 1–2 张清晰正脸图。生成视频时勾选对应角色即可。</li>
<li><b>风格：</b>可复用的背景、色彩、打光与氛围提示词块。</li>
<li>修改角色图片或描述后，对所有 <b>尚未渲染</b> 的镜头立即生效。</li></ul>`,
        g5: `<h2>5. 队列与镜头修改</h2>
<ul><li>点击队列中的视频，可在右侧面板逐个查看和调整镜头。</li>
<li><b>↻ 重绘</b>：仅重新渲染指定镜头，保留其余镜头并自动重新合成。</li>
<li><b>✎ 编辑</b>：修改该镜头提示词并立即重绘（适合 Muse 多次拒稿时调整）。</li>
<li><b>⏭ 跳过</b>：跳过无法生成的镜头，仅用其余镜头合成视频。</li>
<li>底部的 <b>重试全部失败</b> 可一键重跑所有失败的视频。</li>
<li>随时点击 <b>停止</b>，进度会自动保存，下次点击 <b>继续运行</b> 即可恢复。</li></ul>`,
        g6: `<h2>6. 多账号并行</h2>
<p>每个 Muse 账号同一时间只能渲染 <b>1 个片段</b>，因此 <b>N 个账号 = 最多同时渲染 N 个片段</b>。首页的 <b>账号通道</b> 面板会实时显示每个账号的工作状态。</p>
<p>需要衔接末帧的镜头必须等待上一镜头完成，因此长视频纯顺序渲染只能用到 1 个账号。可在 <b>设置</b> 或 <b>高级选项</b> 中选择并行策略：</p>
<table><tr><td>智能</td><td>推荐。将镜头拆成多个并行组，组内依然衔接末帧。例如 6 镜头 + 3 账号 → 3 组 × 2 镜头；多视频同时排队时每个视频占 1 组。</td></tr>
<tr><td>绝对连贯</td><td>所有镜头严格前后衔接并顺序渲染，过渡最顺滑，但单个长视频耗时最长。</td></tr>
<tr><td>最快速度</td><td>所有镜头同时渲染，不传末帧。靠角色参考图维持一致，镜头切换处可能有轻微跳变。</td></tr></table>
<ul><li>当某账号额度耗尽、被封或连续出错时，当前镜头会 <b>自动转移至其他账号</b> 继续渲染。</li>
<li>系统会错峰启动镜头，避免并发突刺并均衡分配负载。</li>
<li>完成最初几个镜头后，应用会依据实际耗时显示 <b>“约剩 X 分钟”</b>。</li>
<li>在账号管理点击 <b>全部检测</b> 可在批量开跑前检查登录态（不消耗生成额度）。</li></ul>`,
        g7: `<h2>7. 自动错误处理</h2>
<table><tr><th>状态码</th><th>含义</th><th>系统处理方式</th></tr>
<tr><td>412</td><td>本周额度已满</td><td>账号冷却 2 小时，镜头自动转交其他账号。</td></tr>
<tr><td>596 / 404</td><td>会话失效 / 被封禁</td><td>标记为“已封禁”并转移任务，需重新登录该账号。</td></tr>
<tr><td>429</td><td>账号繁忙</td><td>等待 30 秒后自动重试。</td></tr>
<tr><td>400 / 422</td><td>内容被 Muse 拒绝</td><td>逐级触发“柔化阶梯”（见下），不会惩罚账号。</td></tr>
<tr><td>502–504</td><td>临时错误 / 超时</td><td>自动重试；连续报错则账号冷却 5 → 20 → 60 分钟。保持应用开启时，临时失败视频约 10 分钟后自动恢复（最多 3 次）。</td></tr></table>
<p><b>内容拒稿柔化阶梯：</b>0 级原句 → 1 级替换敏感词并加安全提示 → 2 级由 AI 改写（去除真名、弱化冲突）→ 3 级改为无人脸空镜/切镜。3 级均失败则会暂停该镜头，交由您 <b>编辑</b> 或 <b>跳过</b>。</p>
<div class="callout warn">请避免使用真实人物姓名（历史或现存）、血腥暴力、逮捕或持械指向人物等描述，这些是最常见的拒稿原因。</div>`,
        g8: `<h2>8. 节省额度</h2>
<ul><li>实际并行数 = <b>可用账号数</b>（每账号同时 1 镜）。“最大并行镜头数”设为 0 表示自动用满全部可用账号，设为具体数字可限制上限。</li>
<li>每个镜头 ≈ 1 个 Muse 片段；AI 写脚本、拆镜头以及 AI 助手对话也会各自消耗 1 次对话额度。若已有完整脚本，请取消勾选“使用 Muse 自动补写/拆分”。</li>
<li>批量跑大任务前，先用 10–20 秒短视频测试角色效果，确认无误再提高“生成份数”。</li>
<li>点击“加入队列”前先看上方的预估栏，了解本次总片段消耗。</li></ul>`,
        g9: `<h2>9. 常见问题</h2>
<details><summary>提示“未找到 Python Bridge”</summary><p>源码运行请通过 <code>CAI-DAT-VA-CHAY.bat</code> 启动；EXE 版本请运行 <code>TAO-FILE-EXE.bat</code> 重新打包（首次需联网下载嵌入式 Python）。</p></details>
<details><summary>验证码发送失败 / 登录过期</summary><p>请改用浏览器导入 Cookie（Cookie-Editor → Export JSON）。显示“已封禁”或会话过期时重新导入或登录即可。</p></details>
<details><summary>所有账号额度耗尽</summary><p>可添加新账号或等待冷却结束；若确认平台额度已刷新，可在账号管理点击 <b>重置</b>。</p></details>
<details><summary>角色跨镜头外貌跑偏</summary><p>上传清晰正脸参考图、完善固定外观描述、开启镜头衔接，并在每行使用 <code>[角色名]</code> 标签。</p></details>
<details><summary>视频合成失败</summary><p>打开视频目录检查各 <code>scene_N.mp4</code> 是否能正常播放，对损坏镜头点击 ↻ 重绘即可自动重新合成。</p></details>`,
        g10: `<h2>10. 快捷键</h2>
<table><tr><td>Ctrl + Enter</td><td>加入队列（脚本框内）· 发送消息（AI 助手内）</td></tr>
<tr><td>Ctrl + 1…9</td><td>按侧边栏顺序快速切换功能页</td></tr>
<tr><td>Ctrl + Enter（首页）</td><td>在“快速生成”框内立即生成并渲染</td></tr>
<tr><td>F12</td><td>打开开发者工具（仅 npm start 运行时有效）</td></tr></table>`
      }
    }
  };

  let curLang = norm(lsGet(LS_KEY) || 'vi');
  const listeners = new Set();

  function lookup(lang, key) {
    const parts = String(key || '').split('.');
    let node = DICT[lang];
    for (const p of parts) {
      if (node && typeof node === 'object' && p in node) node = node[p];
      else return undefined;
    }
    return typeof node === 'string' ? node : undefined;
  }

  function t(key, vars) {
    let str = lookup(curLang, key);
    if (str === undefined && curLang !== 'vi') str = lookup('vi', key);
    if (str === undefined) return String(key);
    if (vars && typeof vars === 'object') {
      str = str.replace(/\{(\w+)\}/g, (_, k) => (
        Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== undefined && vars[k] !== null
          ? String(vars[k])
          : '{' + k + '}'
      ));
    }
    return str;
  }

  function applyDom(root = document) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (k) el.textContent = t(k);
    });
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
      const k = el.getAttribute('data-i18n-html');
      if (k) el.innerHTML = t(k);
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const k = el.getAttribute('data-i18n-ph');
      if (!k) return;
      const val = t(k);
      if (el.tagName === 'SELECT') {
        el.setAttribute('data-ph', val);
        const customIn = document.getElementById(el.id + 'Custom');
        if (customIn) customIn.placeholder = val;
      } else {
        el.placeholder = val;
      }
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      const k = el.getAttribute('data-i18n-title');
      if (k) el.title = t(k);
    });
    const sel = document.getElementById('langSel');
    if (sel && sel.value !== curLang) sel.value = curLang;
  }

  function setLang(lang, opts) {
    const next = norm(lang);
    curLang = next;
    lsSet(LS_KEY, next);
    if (document.documentElement) document.documentElement.lang = HTML_LANG[next] || 'vi';
    applyDom(document);
    listeners.forEach(fn => {
      try { fn(next); } catch (e) { console.error(e); }
    });
    if (!(opts && opts.silent) && window.api && typeof window.api.invoke === 'function') {
      try { window.api.invoke('settings:uiLang', next).catch(() => {}); } catch (_) {}
    }
    return next;
  }

  function syncFromSettings(lang) {
    const saved = lsGet(LS_KEY);
    if (!saved && SUPPORTED.includes(lang)) {
      setLang(lang, { silent: true });
    }
  }

  function getLang() {
    const saved = lsGet(LS_KEY);
    curLang = norm(saved || curLang || 'vi');
    return curLang;
  }

  function locale() {
    return LOCALES[curLang] || 'vi-VN';
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function init() {
    curLang = norm(lsGet(LS_KEY) || 'vi');
    if (document.documentElement) document.documentElement.lang = HTML_LANG[curLang] || 'vi';
    const sel = document.getElementById('langSel');
    if (sel) {
      sel.value = curLang;
      sel.addEventListener('change', e => setLang(e.target.value));
    }
    applyDom(document);
  }

  window.I18N = {
    SUPPORTED,
    LABELS,
    getLang,
    setLang,
    syncFromSettings,
    locale,
    t,
    applyDom,
    onChange
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
