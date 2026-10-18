# -*- coding: utf-8 -*-
import json
import re

# Comprehensive translation dictionary for all missing UI keys across all 27 languages
FULL_DICT = {
    "page": {
        "en": "Page", "es": "Página", "fr": "Page", "de": "Seite", "it": "Pagina", "pt": "Página",
        "ja": "ページ", "ru": "Страница", "ko": "페이지", "zh-CN": "页面", "zh-TW": "頁面",
        "ar": "صفحة", "bg": "Страница", "ca": "Pàgina", "nl": "Pagina", "el": "Σελίδα",
        "hi": "पृष्ठ", "id": "Halaman", "ms": "Halaman", "pl": "Strona", "sv": "Sida",
        "th": "หน้า", "tr": "Sayfa", "uk": "Сторінка", "vi": "Trang", "sw": "Ukurasa", "bn": "পৃষ্ঠা"
    },
    "pages": {
        "en": "Pages", "es": "Páginas", "fr": "Pages", "de": "Seiten", "it": "Pagine", "pt": "Páginas",
        "ja": "ページ", "ru": "Страницы", "ko": "페이지", "zh-CN": "页面", "zh-TW": "頁面",
        "ar": "صفحات", "bg": "Страници", "ca": "Pàgines", "nl": "Pagina's", "el": "Σελίδες",
        "hi": "पृष्ठ", "id": "Halaman", "ms": "Halaman", "pl": "Strony", "sv": "Sidor",
        "th": "หน้า", "tr": "Sayfalar", "uk": "Сторінки", "vi": "Các trang", "sw": "Kurasa", "bn": "পৃষ্ঠা"
    },
    "delete": {
        "en": "Delete", "es": "Eliminar", "fr": "Supprimer", "de": "Löschen", "it": "Elimina", "pt": "Excluir",
        "ja": "削除", "ru": "Удалить", "ko": "삭제", "zh-CN": "删除", "zh-TW": "刪除",
        "ar": "حذف", "bg": "Изтриване", "ca": "Elimina", "nl": "Verwijderen", "el": "Διαγραφή",
        "hi": "हटाएं", "id": "Hapus", "ms": "Padam", "pl": "Usuń", "sv": "Ta bort",
        "th": "ลบ", "tr": "Sil", "uk": "Видалити", "vi": "Xóa", "sw": "Futa", "bn": "মুছুন"
    },
    "close": {
        "en": "Close", "es": "Cerrar", "fr": "Fermer", "de": "Schließen", "it": "Chiudi", "pt": "Fechar",
        "ja": "閉じる", "ru": "Закрыть", "ko": "닫기", "zh-CN": "关闭", "zh-TW": "關閉",
        "ar": "إغلاق", "bg": "Затвори", "ca": "Tanca", "nl": "Sluiten", "el": "Κλείσιμο",
        "hi": "बंद करें", "id": "Tutup", "ms": "Tutup", "pl": "Zamknij", "sv": "Stäng",
        "th": "ปิด", "tr": "Kapat", "uk": "Закрити", "vi": "Đóng", "sw": "Funga", "bn": "বন্ধ করুন"
    },
    "done": {
        "en": "Done", "es": "Listo", "fr": "Terminé", "de": "Fertig", "it": "Fatto", "pt": "Concluído",
        "ja": "完了", "ru": "Готово", "ko": "완료", "zh-CN": "完成", "zh-TW": "完成",
        "ar": "تم", "bg": "Готово", "ca": "Fet", "nl": "Gereed", "el": "Έγινε",
        "hi": "संपन्न", "id": "Selesai", "ms": "Selesai", "pl": "Gotowe", "sv": "Klar",
        "th": "เสร็จสิ้น", "tr": "Tamamlandı", "uk": "Готово", "vi": "Xong", "sw": "Imekamilika", "bn": "সম্পন্ন"
    },
    "clearAll": {
        "en": "Clear All", "es": "Borrar todo", "fr": "Tout effacer", "de": "Alles löschen", "it": "Cancella tutto", "pt": "Limpar tudo",
        "ja": "すべてクリア", "ru": "Очистить все", "ko": "모두 지우기", "zh-CN": "全部清除", "zh-TW": "全部清除",
        "ar": "مسح الكل", "bg": "Изчисти всичко", "ca": "Neteja-ho tot", "nl": "Alles wissen", "el": "Εκκαθάριση όλων",
        "hi": "सभी साफ़ करें", "id": "Hapus Semua", "ms": "Kosongkan Semua", "pl": "Wyczyść wszystko", "sv": "Rensa allt",
        "th": "ล้างทั้งหมด", "tr": "Tümünü Temizle", "uk": "Очистити все", "vi": "Xóa tất cả", "sw": "Futa Yote", "bn": "সব মুছুন"
    },
    "signature": {
        "en": "Signature", "es": "Firma", "fr": "Signature", "de": "Unterschrift", "it": "Firma", "pt": "Assinatura",
        "ja": "署名", "ru": "Подпись", "ko": "서명", "zh-CN": "签名", "zh-TW": "簽名",
        "ar": "توقيع", "bg": "Подпис", "ca": "Signatura", "nl": "Handtekening", "el": "Υπογραφή",
        "hi": "हस्ताक्षर", "id": "Tanda Tangan", "ms": "Tandatangan", "pl": "Podpis", "sv": "Signatur",
        "th": "ลายเซ็น", "tr": "İmza", "uk": "Підпис", "vi": "Chữ ký", "sw": "Saini", "bn": "স্বাক্ষর"
    },
    "digitalSeal": {
        "en": "Digital Seal", "es": "Sello digital", "fr": "Sceau numérique", "de": "Digitales Siegel", "it": "Sigillo digitale", "pt": "Selo digital",
        "ja": "デジタル印章", "ru": "Цифровая печать", "ko": "디지털 직인", "zh-CN": "电子印章", "zh-TW": "電子印章",
        "ar": "ختم رقمي", "bg": "Дигитален печат", "ca": "Segell digital", "nl": "Digitaal zegel", "el": "Ψηφιακή σφραγίδα",
        "hi": "डिजिटल सील", "id": "Stempel Digital", "ms": "Meterai Digital", "pl": "Cyfrowa pieczęć", "sv": "Digitalt sigill",
        "th": "ตราประทับดิจิทัล", "tr": "Dijital Mühür", "uk": "Цифрова печатка", "vi": "Con dấu kỹ thuật số", "sw": "Muhuri wa Kidijitali", "bn": "ডিজিটাল সিল"
    },
    "seal": {
        "en": "Seal", "es": "Sello", "fr": "Sceau", "de": "Siegel", "it": "Sigillo", "pt": "Selo",
        "ja": "印章", "ru": "Печать", "ko": "직인", "zh-CN": "印章", "zh-TW": "印章",
        "ar": "ختم", "bg": "Печат", "ca": "Segell", "nl": "Zegel", "el": "Σφραγίδα",
        "hi": "मुहर", "id": "Stempel", "ms": "Meterai", "pl": "Pieczęć", "sv": "Sigill",
        "th": "ตราประทับ", "tr": "Mühür", "uk": "Печатка", "vi": "Con dấu", "sw": "Muhuri", "bn": "সিল"
    },
    "verifiedAuditTrail": {
        "en": "Verified Audit Trail", "es": "Pista de auditoría verificada", "fr": "Piste d'audit vérifiée", "de": "Verifizierter Prüfpfad", "it": "Traccia di audit verificata", "pt": "Trilha de auditoria verificada",
        "ja": "検証済み監査ログ", "ru": "Проверенный журнал аудита", "ko": "검증된 감사 추적", "zh-CN": "经过验证的审计跟踪", "zh-TW": "經過驗證的審計追蹤",
        "ar": "سجل تدقيق معتمد وموثق", "bg": "Проверен одитен запис", "ca": "Registre d'auditoria verificat", "nl": "Geverifieerd audittraject", "el": "Επαληθευμένη διαδρομή ελέγχου",
        "hi": "सत्यापित ऑडिट ट्रेल", "id": "Jejak Audit Terverifikasi", "ms": "Jejak Audit Disahkan", "pl": "Zweryfikowana ścieżka audytu", "sv": "Verifierad revisionskedja",
        "th": "บันทึกการตรวจสอบที่ผ่านการยืนยัน", "tr": "Doğrulanmış Denetim İzi", "uk": "Перевірений слід аудиту", "vi": "Dấu vết kiểm toán đã xác minh", "sw": "Njia ya Ukaguzi Iliyothibitishwa", "bn": "যাচাইকৃত অডিট ট্রেইল"
    },
    "freeWithSnapDoc": {
        "en": "100% Free with SnapDoc", "es": "100% Gratis con SnapDoc", "fr": "100% gratuit avec SnapDoc", "de": "100% kostenlos mit SnapDoc", "it": "100% gratuito con SnapDoc", "pt": "100% gratuito com SnapDoc",
        "ja": "SnapDocで完全無料", "ru": "100% бесплатно со SnapDoc", "ko": "SnapDoc에서 100% 무료", "zh-CN": "SnapDoc 完全免费提供", "zh-TW": "SnapDoc 完全免費提供",
        "ar": "100% مجاني مع SnapDoc", "bg": "100% безплатно със SnapDoc", "ca": "100% gratuït amb SnapDoc", "nl": "100% gratis met SnapDoc", "el": "100% δωρεάν με το SnapDoc",
        "hi": "SnapDoc के साथ 100% मुफ़्त", "id": "100% Gratis dengan SnapDoc", "ms": "100% Percuma dengan SnapDoc", "pl": "100% za darmo ze SnapDoc", "sv": "100% gratis med SnapDoc",
        "th": "ฟรี 100% กับ SnapDoc", "tr": "SnapDoc ile %100 Ücretsiz", "uk": "100% безкоштовно зі SnapDoc", "vi": "100% miễn phí với SnapDoc", "sw": "100% Bure na SnapDoc", "bn": "SnapDoc-এ ১০০% ফ্রি"
    },
    "sealShape": {
        "en": "Seal Shape", "es": "Forma del sello", "fr": "Forme du sceau", "de": "Siegelform", "it": "Forma del sigillo", "pt": "Formato do selo",
        "ja": "印章の形状", "ru": "Форма печати", "ko": "직인 형태", "zh-CN": "印章形状", "zh-TW": "印章形狀",
        "ar": "شكل الختم", "bg": "Форма на печата", "ca": "Forma del segell", "nl": "Vorm van het zegel", "el": "Σχήμα σφραγίδας",
        "hi": "मुहर का आकार", "id": "Bentuk Stempel", "ms": "Bentuk Meterai", "pl": "Kształt pieczęci", "sv": "Sigillform",
        "th": "รูปทรงตราประทับ", "tr": "Mühür Şekli", "uk": "Форма печатки", "vi": "Hình dạng con dấu", "sw": "Umbo la Muhuri", "bn": "সিলের আকার"
    },
    "circularSeal": {
        "en": "Circular Official Seal", "es": "Sello oficial circular", "fr": "Sceau officiel circulaire", "de": "Rundes offizielles Siegel", "it": "Sigillo ufficiale circolare", "pt": "Selo oficial circular",
        "ja": "円形公式印章", "ru": "Круглая официальная печать", "ko": "원형 공식 직인", "zh-CN": "圆形官方印章", "zh-TW": "圓形官方印章",
        "ar": "ختم رسمي دائري", "bg": "Кръгъл официален печат", "ca": "Segell oficial circular", "nl": "Rond officieel zegel", "el": "Κυκλική επίσημη σφραγίδα",
        "hi": "गोलाकार आधिकारिक मुहर", "id": "Stempel Resmi Melingkar", "ms": "Meterai Rasmi Bulat", "pl": "Okrągła oficjalna pieczęć", "sv": "Runt officiellt sigill",
        "th": "ตราประทับทางการทรงกลม", "tr": "Dairesel Resmi Mühür", "uk": "Кругла офіційна печатка", "vi": "Con dấu tròn chính thức", "sw": "Muhuri Rasmi wa Mviringo", "bn": "গোলাকার অফিশিয়াল সিল"
    },
    "boxedStamp": {
        "en": "Boxed Stamp", "es": "Sello en recuadro", "fr": "Tampon rectangulaire", "de": "Rechteckiger Stempel", "it": "Timbro rettangolare", "pt": "Carimbo retangular",
        "ja": "角形スタンプ", "ru": "Прямоугольный штамп", "ko": "사각형 스탬프", "zh-CN": "方形/矩形印章", "zh-TW": "方形/矩形印章",
        "ar": "ختم مستطيل ومؤطر", "bg": "Правоъгълен печат", "ca": "Tampó en requadre", "nl": "Rechthoekige stempel", "el": "Ορθογώνια σφραγίδα",
        "hi": "आयताकार स्टैम्प", "id": "Stempel Persegi Panjang", "ms": "Cap Segi Empat", "pl": "Prostokątna pieczątka", "sv": "Rektangulär stämpel",
        "th": "ตราประทับสี่เหลี่ยม", "tr": "Kutulu Kaşe", "uk": "Прямокутний штамп", "vi": "Con dấu hình chữ nhật", "sw": "Muhuri wa Mstatili", "bn": "চারকোনা স্ট্যাম্প"
    },
    "regNumber": {
        "en": "Registration / License Number", "es": "Número de registro / licencia", "fr": "Numéro d'enregistrement / licence", "de": "Registrierungs- / Lizenznummer", "it": "Numero di registrazione / licenza", "pt": "Número de registro / licença",
        "ja": "登録番号 / 免许番号", "ru": "Регистрационный номер / лицензия", "ko": "등록 번호 / 면허 번호", "zh-CN": "注册号 / 许可证号", "zh-TW": "註冊號 / 許可證號",
        "ar": "رقم التسجيل / الترخيص", "bg": "Регистрационен / лицензен номер", "ca": "Número de registre / llicència", "nl": "Registratie- / licentienummer", "el": "Αριθμός μητρώου / άδειας",
        "hi": "पंजीकरण / लाइसेंस संख्या", "id": "Nomor Registrasi / Izin", "ms": "Nombor Pendaftaran / Lesen", "pl": "Numer rejestracji / licencji", "sv": "Registrerings- / licensnummer",
        "th": "หมายเลขทะเบียน / ใบอนุญาต", "tr": "Sicil / Lisans Numarası", "uk": "Реєстраційний номер / ліцензія", "vi": "Số đăng ký / Số giấy phép", "sw": "Nambari ya Usajili / Leseni", "bn": "নিবন্ধন / লাইসেন্স নম্বর"
    },
    "optional": {
        "en": "Optional", "es": "Opcional", "fr": "Optionnel", "de": "Optional", "it": "Opzionale", "pt": "Opcional",
        "ja": "任意", "ru": "Необязательно", "ko": "선택 사항", "zh-CN": "可选", "zh-TW": "選填",
        "ar": "اختياري", "bg": "По избор", "ca": "Opcional", "nl": "Optioneel", "el": "Προαιρετικό",
        "hi": "वैकल्पिक", "id": "Opsional", "ms": "Pilihan", "pl": "Opcjonalnie", "sv": "Valfritt",
        "th": "ไม่บังคับ", "tr": "İsteğe bağlı", "uk": "Необов'язково", "vi": "Tùy chọn", "sw": "Hiari", "bn": "ঐচ্ছিক"
    },
    "signatoryName": {
        "en": "Authorized Person's Name / Signatory", "es": "Nombre del firmante autorizado", "fr": "Nom du signataire autorisé", "de": "Name der bevollmächtigten Person", "it": "Nome del firmatario autorizzato", "pt": "Nome do signatário autorizado",
        "ja": "承認者の氏名 / 署名者", "ru": "ФИО уполномоченного лица / подписанта", "ko": "공인 서명권자 성명", "zh-CN": "授权签署人姓名", "zh-TW": "授權簽署人姓名",
        "ar": "اسم الشخص المصرح له / الموقع", "bg": "Име на упълномощеното лице / подписващия", "ca": "Nom del signant autoritzat", "nl": "Naam gemachtigde / ondertekenaar", "el": "Όνομα εξουσιοδοτημένου υπογράφοντος",
        "hi": "अधिकृत व्यक्ति का नाम / हस्ताक्षरकर्ता", "id": "Nama Penandatangan Resmi", "ms": "Nama Penandatangan Diberi Kuasa", "pl": "Imię i nazwisko osoby upoważnionej", "sv": "Namn på behörig underskrivare",
        "th": "ชื่อผู้มีอำนาจลงนาม / ผู้ลงนาม", "tr": "Yetkili Kişi / İmza Sahibinin Adı", "uk": "ПІБ уповноваженої особи / підписанта", "vi": "Họ tên người ký được ủy quyền", "sw": "Jina la Mtu Aliyeidhinishwa / Msaini", "bn": "অনুমোদিত ব্যক্তির নাম / স্বাক্ষরকারী"
    },
    "includeDateOnSeal": {
        "en": "Include Date on Seal", "es": "Incluir fecha en el sello", "fr": "Inclure la date sur le sceau", "de": "Datum im Siegel einfügen", "it": "Includi data nel sigillo", "pt": "Incluir data no selo",
        "ja": "印章に日付を含める", "ru": "Включить дату в печать", "ko": "직인에 날짜 포함", "zh-CN": "在印章上包含日期", "zh-TW": "在印章上包含日期",
        "ar": "تضمين التاريخ في الختم", "bg": "Включване на дата в печата", "ca": "Inclou la data al segell", "nl": "Datum op zegel opnemen", "el": "Συμπερίληψη ημερομηνίας στη σφραγίδα",
        "hi": "मुहर पर तारीख शामिल करें", "id": "Sertakan Tanggal pada Stempel", "ms": "Sertakan Tarikh pada Meterai", "pl": "Dołącz datę na pieczęci", "sv": "Inkludera datum på sigill",
        "th": "ระบุวันที่บนตราประทับ", "tr": "Mühre Tarih Ekle", "uk": "Включити дату в печатку", "vi": "Bao gồm ngày tháng trên con dấu", "sw": "Weka Tarehe kwenye Muhuri", "bn": "সিলে তারিখ অন্তর্ভুক্ত করুন"
    },
    "setToday": {
        "en": "Set Today", "es": "Poner hoy", "fr": "Aujourd'hui", "de": "Heute setzen", "it": "Imposta oggi", "pt": "Definir hoje",
        "ja": "今日を設定", "ru": "Сегодняшняя дата", "ko": "오늘 날짜로 설정", "zh-CN": "设为今日", "zh-TW": "設為今日",
        "ar": "تعيين تاريخ اليوم", "bg": "Задай днес", "ca": "Posa avui", "nl": "Stel vandaag in", "el": "Ορισμός σημερινής",
        "hi": "आज की तारीख सेट करें", "id": "Atur Hari Ini", "ms": "Tetapkan Hari Ini", "pl": "Ustaw dzisiaj", "sv": "Sätt idag",
        "th": "ตั้งเป็นวันนี้", "tr": "Bugünü Seç", "uk": "Встановити сьогодні", "vi": "Đặt ngày hôm nay", "sw": "Weka Leo", "bn": "আজকের তারিখ দিন"
    },
    "emblemLogo": {
        "en": "Emblem / Logo", "es": "Emblema / Logotipo", "fr": "Emblème / Logo", "de": "Emblem / Logo", "it": "Emblema / Logo", "pt": "Emblema / Logotipo",
        "ja": "エンブレム / ロゴ", "ru": "Эмблема / Логотип", "ko": "문장 / 로고", "zh-CN": "徽标 / 标志", "zh-TW": "徽標 / 標誌",
        "ar": "شعار / رمز", "bg": "Емблема / Лого", "ca": "Emblema / Logotip", "nl": "Embleem / Logo", "el": "Έμβλημα / Λογότυπο",
        "hi": "प्रतीक / लोगो", "id": "Lambang / Logo", "ms": "Lambang / Logo", "pl": "Godło / Logo", "sv": "Emblem / Logotyp",
        "th": "ตราสัญลักษณ์ / โลโก้", "tr": "Amblem / Logo", "uk": "Емблема / Логотип", "vi": "Huy hiệu / Biểu trưng", "sw": "Nembo / Nembo ya Shirika", "bn": "প্রতীক / লোগো"
    },
    "remove": {
        "en": "Remove", "es": "Eliminar", "fr": "Supprimer", "de": "Entfernen", "it": "Rimuovi", "pt": "Remover",
        "ja": "削除", "ru": "Удалить", "ko": "제거", "zh-CN": "移除", "zh-TW": "移除",
        "ar": "إزالة", "bg": "Премахни", "ca": "Elimina", "nl": "Verwijderen", "el": "Αφαίρεση",
        "hi": "हटाएं", "id": "Hapus", "ms": "Buang", "pl": "Usuń", "sv": "Ta bort",
        "th": "ลบออก", "tr": "Kaldır", "uk": "Видалити", "vi": "Xóa bỏ", "sw": "Ondoa", "bn": "মুছে ফেলুন"
    },
    "uploadLogo": {
        "en": "Upload Logo (PNG, SVG, JPG)", "es": "Subir logotipo (PNG, SVG, JPG)", "fr": "Téléverser logo (PNG, SVG, JPG)", "de": "Logo hochladen (PNG, SVG, JPG)", "it": "Carica logo (PNG, SVG, JPG)", "pt": "Enviar logo (PNG, SVG, JPG)",
        "ja": "ロゴをアップロード (PNG, SVG, JPG)", "ru": "Загрузить логотип (PNG, SVG, JPG)", "ko": "로고 업로드 (PNG, SVG, JPG)", "zh-CN": "上传标志 (PNG, SVG, JPG)", "zh-TW": "上傳標誌 (PNG, SVG, JPG)",
        "ar": "رفع الشعار (PNG, SVG, JPG)", "bg": "Качи лого (PNG, SVG, JPG)", "ca": "Puja logotip (PNG, SVG, JPG)", "nl": "Upload logo (PNG, SVG, JPG)", "el": "Μεταφόρτωση λογότυπου (PNG, SVG, JPG)",
        "hi": "लोगो अपलोड करें (PNG, SVG, JPG)", "id": "Unggah Logo (PNG, SVG, JPG)", "ms": "Muat Naik Logo (PNG, SVG, JPG)", "pl": "Prześlij logo (PNG, SVG, JPG)", "sv": "Ladda upp logotyp (PNG, SVG, JPG)",
        "th": "อัปโหลดโลโก้ (PNG, SVG, JPG)", "tr": "Logo Yükle (PNG, SVG, JPG)", "uk": "Завантажити логотип (PNG, SVG, JPG)", "vi": "Tải lên logo (PNG, SVG, JPG)", "sw": "Pakia Nembo (PNG, SVG, JPG)", "bn": "লোগো আপলোড করুন (PNG, SVG, JPG)"
    },
    "placeOnPage": {
        "en": "Place on Page", "es": "Colocar en página", "fr": "Placer sur la page", "de": "Auf Seite platzieren", "it": "Posiziona sulla pagina", "pt": "Posicionar na página",
        "ja": "ページに配置", "ru": "Разместить на странице", "ko": "페이지에 배치", "zh-CN": "放置到页面", "zh-TW": "放置到頁面",
        "ar": "وضع على الصفحة", "bg": "Постави на страницата", "ca": "Col·loca a la pàgina", "nl": "Plaats op pagina", "el": "Τοποθέτηση στη σελίδα",
        "hi": "पृष्ठ पर रखें", "id": "Tempatkan di Halaman", "ms": "Letakkan pada Halaman", "pl": "Umieść na stronie", "sv": "Placera på sidan",
        "th": "วางบนหน้าเอกสาร", "tr": "Sayfaya Yerleştir", "uk": "Розмістити на сторінці", "vi": "Đặt lên trang", "sw": "Weka kwenye Ukurasa", "bn": "পৃষ্ঠায় স্থাপন করুন"
    },
    "createSignature": {
        "en": "Create Signature", "es": "Crear firma", "fr": "Créer une signature", "de": "Unterschrift erstellen", "it": "Crea firma", "pt": "Criar assinatura",
        "ja": "署名を作成", "ru": "Создать подпись", "ko": "서명 만들기", "zh-CN": "创建签名", "zh-TW": "建立簽名",
        "ar": "إنشاء توقيع", "bg": "Създай подпис", "ca": "Crea signatura", "nl": "Handtekening maken", "el": "Δημιουργία υπογραφής",
        "hi": "हस्ताक्षर बनाएं", "id": "Buat Tanda Tangan", "ms": "Cipta Tandatangan", "pl": "Utwórz podpis", "sv": "Skapa signatur",
        "th": "สร้างลายเซ็น", "tr": "İmza Oluştur", "uk": "Створити підпис", "vi": "Tạo chữ ký", "sw": "Tengeneza Saini", "bn": "স্বাক্ষর তৈরি করুন"
    },
    "createInitials": {
        "en": "Create Initials", "es": "Crear iniciales", "fr": "Créer des initiales", "de": "Initialen erstellen", "it": "Crea iniziali", "pt": "Criar iniciais",
        "ja": "イニシャルを作成", "ru": "Создать инициалы", "ko": "이니셜 만들기", "zh-CN": "创建缩写/首字母", "zh-TW": "建立縮寫/縮寫簽名",
        "ar": "إنشاء الأحرف الأولى", "bg": "Създай инициали", "ca": "Crea inicials", "nl": "Initialen maken", "el": "Δημιουργία αρχικών",
        "hi": "आद्याक्षर बनाएं", "id": "Buat Inisial", "ms": "Cipta Huruf Pertama", "pl": "Utwórz inicjały", "sv": "Skapa initialer",
        "th": "สร้างชื่อย่อ", "tr": "Paraf Oluştur", "uk": "Створити ініціали", "vi": "Tạo chữ viết tắt", "sw": "Tengeneza Herufi za Mwanzo", "bn": "আদ্যক্ষর তৈরি করুন"
    },
    "drawHere": {
        "en": "Draw here", "es": "Dibuje aquí", "fr": "Dessinez ici", "de": "Hier zeichnen", "it": "Disegna qui", "pt": "Desenhe aqui",
        "ja": "ここに描いてください", "ru": "Распишитесь здесь", "ko": "여기에 서명하세요", "zh-CN": "在此处绘制", "zh-TW": "在此處繪製",
        "ar": "ارسم هنا", "bg": "Рисувайте тук", "ca": "Dibuixeu aquí", "nl": "Teken hier", "el": "Σχεδιάστε εδώ",
        "hi": "यहां हस्ताक्षर बनाएं", "id": "Gambar di sini", "ms": "Lukis di sini", "pl": "Narysuj tutaj", "sv": "Rita här",
        "th": "วาดที่นี่", "tr": "Buraya çizin", "uk": "Розпишіться тут", "vi": "Vẽ vào đây", "sw": "Chora hapa", "bn": "এখানে আঁকুন"
    },
    "typeYourSig": {
        "en": "Type your signature...", "es": "Escriba su firma...", "fr": "Tapez votre signature...", "de": "Unterschrift eingeben...", "it": "Digita la tua firma...", "pt": "Digite sua assinatura...",
        "ja": "お名前を入力...", "ru": "Введите ваше имя...", "ko": "서명할 이름을 입력하세요...", "zh-CN": "输入您的签名...", "zh-TW": "輸入您的簽名...",
        "ar": "اكتب توقيعك هنا...", "bg": "Въведете вашия подпис...", "ca": "Escriviu la vostra signatura...", "nl": "Typ uw handtekening...", "el": "Πληκτρολογήστε την υπογραφή σας...",
        "hi": "अपना हस्ताक्षर टाइप करें...", "id": "Ketik tanda tangan Anda...", "ms": "Taip tandatangan anda...", "pl": "Wpisz swój podpis...", "sv": "Skriv din signatur...",
        "th": "พิมพ์ลายเซ็นของคุณ...", "tr": "İmzanızı yazın...", "uk": "Введіть свій підпис...", "vi": "Nhập chữ ký của bạn...", "sw": "Andika saini yako...", "bn": "আপনার স্বাক্ষর টাইপ করুন..."
    },
    "typeYourInitials": {
        "en": "Type your initials...", "es": "Escriba sus iniciales...", "fr": "Tapez vos initiales...", "de": "Initialen eingeben...", "it": "Digita le tue iniziali...", "pt": "Digite suas iniciais...",
        "ja": "イニシャルを入力...", "ru": "Введите инициалы...", "ko": "이니셜을 입력하세요...", "zh-CN": "输入您的首字母...", "zh-TW": "輸入您的縮寫...",
        "ar": "اكتب الحروف الأولى...", "bg": "Въведете вашите инициали...", "ca": "Escriviu les vostres inicials...", "nl": "Typ uw initialen...", "el": "Πληκτρολογήστε τα αρχικά σας...",
        "hi": "अपने आद्याक्षर टाइप करें...", "id": "Ketik inisial Anda...", "ms": "Taip huruf pertama anda...", "pl": "Wpisz swoje inicjały...", "sv": "Skriv dina initialer...",
        "th": "พิมพ์ชื่อย่อของคุณ...", "tr": "Parafınızı yazın...", "uk": "Введіть свої ініціали...", "vi": "Nhập chữ viết tắt...", "sw": "Andika herufi zako za mwanzo...", "bn": "আপনার আদ্যক্ষর টাইপ করুন..."
    },
    "yourSignature": {
        "en": "Your Signature", "es": "Su firma", "fr": "Votre signature", "de": "Ihre Unterschrift", "it": "La tua firma", "pt": "Sua assinatura",
        "ja": "あなたの署名", "ru": "Ваша подпись", "ko": "나의 서명", "zh-CN": "您的签名", "zh-TW": "您的簽名",
        "ar": "توقيعك", "bg": "Вашият подпис", "ca": "La vostra signatura", "nl": "Uw handtekening", "el": "Η υπογραφή σας",
        "hi": "आपका हस्ताक्षर", "id": "Tanda Tangan Anda", "ms": "Tandatangan Anda", "pl": "Twój podpis", "sv": "Din signatur",
        "th": "ลายเซ็นของคุณ", "tr": "İmzanız", "uk": "Ваш підпис", "vi": "Chữ ký của bạn", "sw": "Saini Yako", "bn": "আপনার স্বাক্ষর"
    },
    "yourInitials": {
        "en": "Your Initials", "es": "Sus iniciales", "fr": "Vos initiales", "de": "Ihre Initialen", "it": "Le tue iniziali", "pt": "Suas iniciais",
        "ja": "あなたのイニシャル", "ru": "Ваши инициалы", "ko": "나의 이니셜", "zh-CN": "您的首字母", "zh-TW": "您的縮寫",
        "ar": "أحرفك الأولى", "bg": "Вашите инициали", "ca": "Les vostres inicials", "nl": "Uw initialen", "el": "Τα αρχικά σας",
        "hi": "आपके आद्याक्षर", "id": "Inisial Anda", "ms": "Huruf Pertama Anda", "pl": "Twoje inicjały", "sv": "Dina initialer",
        "th": "ชื่อย่อของคุณ", "tr": "Parafınız", "uk": "Ваші ініціали", "vi": "Chữ viết tắt của bạn", "sw": "Herufi Zako za Mwanzo", "bn": "আপনার আদ্যক্ষর"
    },
    "undo": {
        "en": "Undo", "es": "Deshacer", "fr": "Annuler", "de": "Rückgängig", "it": "Annulla", "pt": "Desfazer",
        "ja": "元に戻す", "ru": "Отменить", "ko": "실행 취소", "zh-CN": "撤销", "zh-TW": "復原",
        "ar": "تراجع", "bg": "Отмяна", "ca": "Desfés", "nl": "Ongedaan maken", "el": "Αναίρεση",
        "hi": "पूर्ववत करें", "id": "Urungkan", "ms": "Buat asal", "pl": "Cofnij", "sv": "Ångra",
        "th": "เลิกทำ", "tr": "Geri Al", "uk": "Скасувати", "vi": "Hoàn tác", "sw": "Tendua", "bn": "পূর্বাবস্থায়"
    },
    "redo": {
        "en": "Redo", "es": "Rehacer", "fr": "Rétablir", "de": "Wiederholen", "it": "Ripeti", "pt": "Refazer",
        "ja": "やり直す", "ru": "Повторить", "ko": "다시 실행", "zh-CN": "重做", "zh-TW": "重做",
        "ar": "إعادة", "bg": "Повтори", "ca": "Refés", "nl": "Opnieuw", "el": "Επανάληψη",
        "hi": "फिर से करें", "id": "Ulangi", "ms": "Buat semula", "pl": "Ponów", "sv": "Gör om",
        "th": "ทำซ้ำ", "tr": "Yinele", "uk": "Повторити", "vi": "Làm lại", "sw": "Rejesha", "bn": "পুনরায় করুন"
    },
    "panMode": {
        "en": "Pan Mode", "es": "Modo desplazamiento", "fr": "Mode déplacement", "de": "Schwenkmodus", "it": "Modalità panoramica", "pt": "Modo panorâmico",
        "ja": "パンモード", "ru": "Режим перемещения", "ko": "화면 이동 모드", "zh-CN": "平移模式", "zh-TW": "平移模式",
        "ar": "وضع التحريك", "bg": "Режим преместване", "ca": "Mode panoràmic", "nl": "Pan-modus", "el": "Λειτουργία μετακίνησης",
        "hi": "पैन मोड", "id": "Mode Geser", "ms": "Mod Sorot", "pl": "Tryb przesuwania", "sv": "Panoreringsläge",
        "th": "โหมดเลื่อน", "tr": "Kaydırma Modu", "uk": "Режим панорамування", "vi": "Chế độ kéo rê", "sw": "Hali ya Kusogeza", "bn": "প্যান মোড"
    },
    "selectMoveTool": {
        "en": "Select & Move Tool", "es": "Herramienta de selección", "fr": "Outil de sélection", "de": "Auswahlwerkzeug", "it": "Strumento Seleziona", "pt": "Ferramenta de seleção",
        "ja": "選択・移動ツール", "ru": "Инструмент выбора и перемещения", "ko": "선택 및 이동 도구", "zh-CN": "选择与移动工具", "zh-TW": "選取與移動工具",
        "ar": "أداة التحديد والتحريك", "bg": "Инструмент за избор", "ca": "Eina de selecció", "nl": "Selecteer & verplaats", "el": "Εργαλείο επιλογής",
        "hi": "चयन और स्थानांतरण टूल", "id": "Alat Pilih & Pindahkan", "ms": "Alat Pilih & Gerak", "pl": "Zaznacz i przenieś", "sv": "Markera och flytta",
        "th": "เครื่องมือเลือกและย้าย", "tr": "Seç ve Taşı", "uk": "Виділення та переміщення", "vi": "Công cụ chọn & di chuyển", "sw": "Zana ya Kuchagua", "bn": "সিলেক্ট ও মুভ টুল"
    },
    "addDateStamp": {
        "en": "Add Date Stamp", "es": "Añadir sello de fecha", "fr": "Ajouter date", "de": "Datum einfügen", "it": "Aggiungi data", "pt": "Adicionar carimbo de data",
        "ja": "日付スタンプを追加", "ru": "Добавить штамп даты", "ko": "날짜 도장 추가", "zh-CN": "添加日期印章", "zh-TW": "添加日期印章",
        "ar": "إضافة ختم التاريخ", "bg": "Добави печат с дата", "ca": "Afegeix data", "nl": "Datumstempel toevoegen", "el": "Προσθήκη ημερομηνίας",
        "hi": "तारीख का स्टैम्प जोड़ें", "id": "Tambah Stempel Tanggal", "ms": "Tambah Cap Tarikh", "pl": "Dodaj datownik", "sv": "Lägg till datumstämpel",
        "th": "เพิ่มตราประทับวันที่", "tr": "Tarih Kaşesi Ekle", "uk": "Додати штамп дати", "vi": "Thêm con dấu ngày tháng", "sw": "Weka Tarehe", "bn": "তারিখ স্ট্যাম্প দিন"
    },
    "addText": {
        "en": "Add Text", "es": "Añadir texto", "fr": "Ajouter du texte", "de": "Text hinzufügen", "it": "Aggiungi testo", "pt": "Adicionar texto",
        "ja": "テキストを追加", "ru": "Добавить текст", "ko": "텍스트 추가", "zh-CN": "添加文本", "zh-TW": "添加文字",
        "ar": "إضافة نص", "bg": "Добави текст", "ca": "Afegeix text", "nl": "Tekst toevoegen", "el": "Προσθήκη κειμένου",
        "hi": "टेक्स्ट जोड़ें", "id": "Tambah Teks", "ms": "Tambah Teks", "pl": "Dodaj tekst", "sv": "Lägg till text",
        "th": "เพิ่มข้อความ", "tr": "Metin Ekle", "uk": "Додати текст", "vi": "Thêm văn bản", "sw": "Weka Maandishi", "bn": "টেক্সট যোগ করুন"
    },
    "addSymbols": {
        "en": "Add Symbols", "es": "Añadir símbolos", "fr": "Ajouter des symboles", "de": "Symbole hinzufügen", "it": "Aggiungi simboli", "pt": "Adicionar símbolos",
        "ja": "記号を追加", "ru": "Добавить символы", "ko": "기호 추가", "zh-CN": "添加符号", "zh-TW": "添加符號",
        "ar": "إضافة رموز", "bg": "Добави символи", "ca": "Afegeix símbols", "nl": "Symbolen toevoegen", "el": "Προσθήκη συμβόλων",
        "hi": "प्रतीक जोड़ें", "id": "Tambah Simbol", "ms": "Tambah Simbol", "pl": "Dodaj symbole", "sv": "Lägg till symboler",
        "th": "เพิ่มสัญลักษณ์", "tr": "Sembol Ekle", "uk": "Додати символи", "vi": "Thêm biểu tượng", "sw": "Weka Alama", "bn": "প্রতীক যোগ করুন"
    },
    "checkmark": {
        "en": "Checkmark", "es": "Marca de verificación", "fr": "Coche", "de": "Häkchen", "it": "Spunta", "pt": "Marca de seleção",
        "ja": "チェックマーク", "ru": "Галочка", "ko": "체크 표시", "zh-CN": "对勾", "zh-TW": "勾選",
        "ar": "علامة صح", "bg": "Отметка", "ca": "Marca de verificació", "nl": "Vinkje", "el": "Σημάδι επιλογής",
        "hi": "चेकमार्क", "id": "Centang", "ms": "Tanda Semak", "pl": "Ptaszek", "sv": "Bock",
        "th": "เครื่องหมายถูก", "tr": "Onay işareti", "uk": "Галочка", "vi": "Dấu tích", "sw": "Alama ya vema", "bn": "টিকচিহ্ন"
    },
    "cross": {
        "en": "Cross", "es": "Cruz", "fr": "Croix", "de": "Kreuz", "it": "Croce", "pt": "Cruz",
        "ja": "バツ印", "ru": "Крестик", "ko": "십자 표시", "zh-CN": "叉号", "zh-TW": "叉號",
        "ar": "علامة خطأ", "bg": "Кръстче", "ca": "Creu", "nl": "Kruisje", "el": "Σταυρός",
        "hi": "क्रॉस", "id": "Silang", "ms": "Tanda Pangkah", "pl": "Krzyżyk", "sv": "Kryss",
        "th": "กากบาท", "tr": "Çarpı", "uk": "Хрестик", "vi": "Dấu gạch chéo", "sw": "Msalaba", "bn": "ক্রসচিহ্ন"
    },
    "dot": {
        "en": "Dot", "es": "Punto", "fr": "Point", "de": "Punkt", "it": "Punto", "pt": "Ponto",
        "ja": "ドット", "ru": "Точка", "ko": "점", "zh-CN": "圆点", "zh-TW": "圓點",
        "ar": "نقطة", "bg": "Точка", "ca": "Punt", "nl": "Punt", "el": "Κουκκίδα",
        "hi": "बिंदु", "id": "Titik", "ms": "Titik", "pl": "Kropka", "sv": "Punkt",
        "th": "จุด", "tr": "Nokta", "uk": "Крапка", "vi": "Dấu chấm", "sw": "Nukta", "bn": "বিন্দু"
    },
    "line": {
        "en": "Line", "es": "Línea", "fr": "Ligne", "de": "Linie", "it": "Linea", "pt": "Linha",
        "ja": "直線", "ru": "Линия", "ko": "직선", "zh-CN": "直线", "zh-TW": "直線",
        "ar": "خط", "bg": "Линия", "ca": "Línia", "nl": "Lijn", "el": "Γραμμή",
        "hi": "रेखा", "id": "Garis", "ms": "Garis", "pl": "Linia", "sv": "Linje",
        "th": "เส้นตรง", "tr": "Çizgi", "uk": "Лінія", "vi": "Đường kẻ", "sw": "Mstari", "bn": "রেখা"
    },
    "stampOfficialSeal": {
        "en": "Stamp Official Digital Seal", "es": "Estampar sello digital oficial", "fr": "Apposer un sceau officiel", "de": "Offizielles Siegel stempeln", "it": "Apponi sigillo ufficiale", "pt": "Carimbar selo digital oficial",
        "ja": "公式デジタル印章を押印", "ru": "Поставить официальную цифровую печать", "ko": "공식 디지털 직인 날인", "zh-CN": "加盖官方电子印章", "zh-TW": "加蓋官方電子印章",
        "ar": "ختم المستند بالختم الرقمي الرسمي", "bg": "Постави официален печат", "ca": "Estampa el segell oficial", "nl": "Plaats officieel digitaal zegel", "el": "Επίσημη ψηφιακή σφράγιση",
        "hi": "आधिकारिक डिजिटल सील लगाएं", "id": "Bubuhkan Stempel Digital Resmi", "ms": "Cap Meterai Digital Rasmi", "pl": "Przybądź oficjalną pieczęć", "sv": "Stämpla officiellt sigill",
        "th": "ประทับตราดิจิทัลทางการ", "tr": "Resmi Dijital Mührü Bas", "uk": "Поставити офіційну цифрову печатку", "vi": "Đóng dấu kỹ thuật số chính thức", "sw": "Piga Muhuri Rasmi wa Kidijitali", "bn": "অফিশিয়াল ডিজিটাল সিল স্ট্যাম্প করুন"
    },
    "zoomIn": {
        "en": "Zoom In", "es": "Acercar", "fr": "Agrandir", "de": "Vergrößern", "it": "Ingrandisci", "pt": "Aproximar",
        "ja": "拡大", "ru": "Приблизить", "ko": "확대", "zh-CN": "放大", "zh-TW": "放大",
        "ar": "تكبير", "bg": "Увеличи", "ca": "Apropa", "nl": "Inzoomen", "el": "Μεγέθυνση",
        "hi": "ज़ूम इन", "id": "Perbesar", "ms": "Zum Masuk", "pl": "Przybliż", "sv": "Zooma in",
        "th": "ซูมเข้า", "tr": "Yakınlaştır", "uk": "Наблизити", "vi": "Phóng to", "sw": "Kuza ndani", "bn": "জুম ইন"
    },
    "zoomOut": {
        "en": "Zoom Out", "es": "Alejar", "fr": "Réduire", "de": "Verkleinern", "it": "Rimpicciolisci", "pt": "Afastar",
        "ja": "縮小", "ru": "Отдалить", "ko": "축소", "zh-CN": "缩小", "zh-TW": "縮小",
        "ar": "تصغير", "bg": "Намали", "ca": "Allunya", "nl": "Uitzoomen", "el": "Σμίκρυνση",
        "hi": "ज़ूम आउट", "id": "Perkecil", "ms": "Zum Keluar", "pl": "Oddal", "sv": "Zooma ut",
        "th": "ซูมออก", "tr": "Uzaklaştır", "uk": "Віддалити", "vi": "Thu nhỏ", "sw": "Kuza nje", "bn": "জুম আউট"
    },
    "signedPdfSuccess": {
        "en": "Your PDF has been signed successfully!", "es": "¡Su PDF se ha firmado con éxito!", "fr": "Votre PDF a été signé avec succès !", "de": "Ihre PDF wurde erfolgreich signiert!", "it": "Il tuo PDF è stato firmato con successo!", "pt": "Seu PDF foi assinado com sucesso!",
        "ja": "PDFの署名が正常に完了しました！", "ru": "Ваш PDF успешно подписан!", "ko": "PDF가 성공적으로 서명되었습니다!", "zh-CN": "您的 PDF 已成功签署！", "zh-TW": "您的 PDF 已成功簽署！",
        "ar": "تم توقيع ملف PDF بنجاح!", "bg": "Вашият PDF файл беше подписан успешно!", "ca": "El vostre PDF s'ha signat amb èxit!", "nl": "Uw PDF is succesvol ondertekend!", "el": "Το PDF σας υπογράφηκε με επιτυχία!",
        "hi": "आपका PDF सफलतापूर्वक हस्ताक्षरित हो गया है!", "id": "PDF Anda berhasil ditandatangani!", "ms": "PDF anda berjaya ditandatangani!", "pl": "Twój plik PDF został pomyślnie podpisany!", "sv": "Din PDF har signerats framgångsrikt!",
        "th": "เซ็นชื่อใน PDF ของคุณเรียบร้อยแล้ว!", "tr": "PDF'iniz başarıyla imzalandı!", "uk": "Ваш PDF успішно підписано!", "vi": "Tệp PDF của bạn đã được ký thành công!", "sw": "PDF yako imesainiwa kikamilifu!", "bn": "আপনার পিডিএফ সফলভাবে স্বাক্ষরিত হয়েছে!"
    },
    "signedPdfDesc": {
        "en": "Your digital signatures and annotations have been securely flattened into your document.", "es": "Sus firmas y anotaciones digitales se han integrado de forma segura en su documento.", "fr": "Vos signatures numériques et annotations ont été intégrées de manière sécurisée dans votre document.", "de": "Ihre digitalen Signaturen und Anmerkungen wurden sicher in Ihr Dokument eingebettet.", "it": "Le tue firme digitali e annotazioni sono state incorporate in modo sicuro nel documento.", "pt": "Suas assinaturas digitais e anotações foram integradas com segurança ao documento.",
        "ja": "デジタル署名と注釈がドキュメントに安全に埋め込まれました。", "ru": "Ваши цифровые подписи и аннотации надежно объединены с документом.", "ko": "디지털 서명과 주석이 문서에 안전하게 병합되었습니다.", "zh-CN": "您的数字签名和注释已安全合并到文档中。", "zh-TW": "您的數位簽名與註釋已安全合併到文件中。",
        "ar": "تم دمج توقيعاتك الرقمية والتعليقات التوضيحية بأمان داخل المستند.", "bg": "Вашите цифрови подписи бяха сигурно вградени в документа.", "ca": "Les vostres signatures digitals i anotacions s'han integrat de manera segura al document.", "nl": "Uw digitale handtekeningen en aantekeningen zijn veilig in uw document ingebed.", "el": "Οι ψηφιακές υπογραφές και οι σημειώσεις σας ενσωματώθηκαν με ασφάλεια στο έγγραφο.",
        "hi": "आपके डिजिटल हस्ताक्षर और एनोटेशन आपके दस्तावेज़ में सुरक्षित रूप से जोड़े गए हैं।", "id": "Tanda tangan digital dan anotasi Anda telah digabungkan dengan aman ke dalam dokumen.", "ms": "Tandatangan digital dan anotasi anda telah digabungkan dengan selamat ke dalam dokumen.", "pl": "Twoje cyfrowe podpisy i adnotacje zostały bezpiecznie scalone z dokumentem.", "sv": "Dina digitala signaturer och anteckningar har bäddats in säkert i ditt dokument.",
        "th": "ลายเซ็นดิจิทัลและคำอธิบายประกอบของคุณถูกฝังลงในเอกสารอย่างปลอดภัยแล้ว", "tr": "Dijital imzalarınız ve ek açıklamalarınız belgenize güvenli bir şekilde işlendi.", "uk": "Ваші цифрові підписи та примітки надійно об'єднано з документом.", "vi": "Chữ ký số và các chú thích của bạn đã được nhúng an toàn vào tài liệu.", "sw": "Saini zako za kidijitali zimeunganishwa kwa usalama kwenye hati yako.", "bn": "আপনার ডিজিটাল স্বাক্ষর নিরাপদে ডকুমেন্টে মার্জ করা হয়েছে।"
    },
    "signAnotherDoc": {
        "en": "Sign Another Document", "es": "Firmar otro documento", "fr": "Signer un autre document", "de": "Anderes Dokument signieren", "it": "Firma un altro documento", "pt": "Assinar outro documento",
        "ja": "別の文書を署名", "ru": "Подписать другой документ", "ko": "다른 문서 서명하기", "zh-CN": "签署另一个文档", "zh-TW": "簽署另一個文件",
        "ar": "توقيع مستند آخر", "bg": "Подпиши друг документ", "ca": "Signa un altre document", "nl": "Ander document ondertekenen", "el": "Υπογραφή άλλου εγγράφου",
        "hi": "दूसरा दस्तावेज़ साइन करें", "id": "Tandatangani Dokumen Lain", "ms": "Tandatangan Dokumen Lain", "pl": "Podpisz inny dokument", "sv": "Signera ett annat dokument",
        "th": "เซ็นเอกสารอื่น", "tr": "Başka Bir Belge İmzala", "uk": "Підписати інший документ", "vi": "Ký tài liệu khác", "sw": "Saini Hati Nyingine", "bn": "অন্য ডকুমেন্ট স্বাক্ষর করুন"
    },
    "copied": {
        "en": "Copied!", "es": "¡Copiado!", "fr": "Copié !", "de": "Kopiert!", "it": "Copiato!", "pt": "Copiado!",
        "ja": "コピーしました！", "ru": "Скопировано!", "ko": "복사됨!", "zh-CN": "已复制！", "zh-TW": "已複製！",
        "ar": "تم النسخ!", "bg": "Копирано!", "ca": "Copiat!", "nl": "Gekopieerd!", "el": "Αντιγράφηκε!",
        "hi": "कॉपी किया गया!", "id": "Tersalin!", "ms": "Disalin!", "pl": "Skopiowano!", "sv": "Kopierad!",
        "th": "คัดลอกแล้ว!", "tr": "Kopyalandı!", "uk": "Скопійовано!", "vi": "Đã sao chép!", "sw": "Imenakiliwa!", "bn": "কপি করা হয়েছে!"
    },
    "copyText": {
        "en": "Copy Text", "es": "Copiar texto", "fr": "Copier le texte", "de": "Text kopieren", "it": "Copia testo", "pt": "Copiar texto",
        "ja": "テキストをコピー", "ru": "Копировать текст", "ko": "텍스트 복사", "zh-CN": "复制文本", "zh-TW": "複製文字",
        "ar": "نسخ النص", "bg": "Копирай текста", "ca": "Copia el text", "nl": "Tekst kopiëren", "el": "Αντιγραφή κειμένου",
        "hi": "टेक्स्ट कॉपी करें", "id": "Salin Teks", "ms": "Salin Teks", "pl": "Kopiuj tekst", "sv": "Kopiera text",
        "th": "คัดลอกข้อความ", "tr": "Metni Kopyala", "uk": "Копіювати текст", "vi": "Sao chép văn bản", "sw": "Nakili Maandishi", "bn": "টেক্সট কপি করুন"
    },
    "downloadExcel": {
        "en": "Download Extracted Excel (.xlsx)", "es": "Descargar Excel extraído (.xlsx)", "fr": "Télécharger Excel extrait (.xlsx)", "de": "Extrahiertes Excel herunterladen (.xlsx)", "it": "Scarica Excel estratto (.xlsx)", "pt": "Baixar Excel extraído (.xlsx)",
        "ja": "抽出したExcelをダウンロード (.xlsx)", "ru": "Скачать извлеченный Excel (.xlsx)", "ko": "추출된 Excel 다운로드 (.xlsx)", "zh-CN": "下载提取的 Excel (.xlsx)", "zh-TW": "下載擷取的 Excel (.xlsx)",
        "ar": "تحميل ملف Excel المستخرج (.xlsx)", "bg": "Изтегли Excel (.xlsx)", "ca": "Descarrega l'Excel (.xlsx)", "nl": "Download Excel (.xlsx)", "el": "Λήψη Excel (.xlsx)",
        "hi": "एक्सेल डाउनलोड करें (.xlsx)", "id": "Unduh Excel (.xlsx)", "ms": "Muat Turun Excel (.xlsx)", "pl": "Pobierz Excel (.xlsx)", "sv": "Ladda ner Excel (.xlsx)",
        "th": "ดาวน์โหลด Excel (.xlsx)", "tr": "Excel'i İndir (.xlsx)", "uk": "Завантажити Excel (.xlsx)", "vi": "Tải xuống Excel (.xlsx)", "sw": "Pakua Excel (.xlsx)", "bn": "এক্সেল ডাউনলোড করুন (.xlsx)"
    },
    "downloadText": {
        "en": "Download Extracted Text (.txt)", "es": "Descargar texto extraído (.txt)", "fr": "Télécharger le texte extrait (.txt)", "de": "Extrahierten Text herunterladen (.txt)", "it": "Scarica testo estratto (.txt)", "pt": "Baixar texto extraído (.txt)",
        "ja": "抽出したテキストをダウンロード (.txt)", "ru": "Скачать извлеченный текст (.txt)", "ko": "추출된 텍스트 다운로드 (.txt)", "zh-CN": "下载提取的文本 (.txt)", "zh-TW": "下載擷取的文字 (.txt)",
        "ar": "تحميل النص المستخرج (.txt)", "bg": "Изтегли текст (.txt)", "ca": "Descarrega el text (.txt)", "nl": "Download tekst (.txt)", "el": "Λήψη κειμένου (.txt)",
        "hi": "टेक्स्ट डाउनलोड करें (.txt)", "id": "Unduh Teks (.txt)", "ms": "Muat Turun Teks (.txt)", "pl": "Pobierz tekst (.txt)", "sv": "Ladda ner text (.txt)",
        "th": "ดาวน์โหลดข้อความ (.txt)", "tr": "Metni İndir (.txt)", "uk": "Завантажити текст (.txt)", "vi": "Tải xuống văn bản (.txt)", "sw": "Pakua Maandishi (.txt)", "bn": "টেক্সট ডাউনলোড করুন (.txt)"
    }
}

target_file = 'lib/i18n/extendedAppTranslations.ts'
with open(target_file, 'r', encoding='utf-8') as f:
    code = f.read()

# Apply to every language
for key, lang_map in FULL_DICT.items():
    for lang, val in lang_map.items():
        pattern = rf'("{lang}":\s*\{{[\s\S]*?{re.escape(json.dumps(key))}\s*:\s*)(["\'][^"\']*["\'])'
        
        def repl(match):
            return match.group(1) + json.dumps(val, ensure_ascii=False)
        
        code = re.sub(pattern, repl, code, count=1)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated full matrix successfully!")
