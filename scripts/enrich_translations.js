const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('lib/i18n/extendedAppTranslations.ts');
const rawCode = fs.readFileSync(targetFile, 'utf8');

const start = rawCode.indexOf('{');
const end = rawCode.lastIndexOf('}');
const dict = JSON.parse(rawCode.slice(start, end + 1));

// Universal translations lookup
const T = {
  // About Page
  aboutTitle: {
    en: "About SnapDoc", es: "Acerca de SnapDoc", fr: "À propos de SnapDoc", de: "Über SnapDoc", it: "Informazioni su SnapDoc",
    pt: "Sobre o SnapDoc", ja: "SnapDocについて", ru: "О SnapDoc", ko: "SnapDoc 소개", "zh-CN": "关于 SnapDoc",
    "zh-TW": "關於 SnapDoc", ar: "حول SnapDoc", bg: "Относно SnapDoc", ca: "Sobre SnapDoc", nl: "Over SnapDoc",
    el: "Σχετικά με το SnapDoc", hi: "SnapDoc के बारे में", id: "Tentang SnapDoc", ms: "Mengenai SnapDoc",
    pl: "O SnapDoc", sv: "Om SnapDoc", th: "เกี่ยวกับ SnapDoc", tr: "SnapDoc Hakkında", uk: "Про SnapDoc",
    vi: "Giới thiệu SnapDoc", sw: "Kuhusu SnapDoc", bn: "SnapDoc সম্পর্কে"
  },
  aboutSubtitle: {
    en: "SnapDoc was created to eliminate bloated, ad-ridden, privacy-invasive file converters.",
    es: "SnapDoc fue creado para eliminar convertidores lentos, llenos de anuncios e invasivos.",
    fr: "SnapDoc a été créé pour éliminer les convertisseurs lourds, saturés de publicités et invasifs.",
    de: "SnapDoc wurde geschaffen, um überladene, werbeverseuchte und datenschutzunfreundliche Dateikonverter zu eliminieren.",
    it: "SnapDoc è stato creato per eliminare convertitori lenti, pieni di pubblicità e invasivi.",
    pt: "O SnapDoc foi criado para eliminar conversores pesados, cheios de anúncios e invasivos.",
    ja: "SnapDocは、肥大化し広告だらけでプライバシーを侵害するファイル変換ツールを排除するために作られました。",
    ru: "SnapDoc создан, чтобы избавить вас от медленных, перегруженных рекламой и небезопасных конвертеров файлов.",
    ko: "SnapDoc은 비대하고 광고가 넘치며 개인정보를 침해하는 파일 변환기를 없애기 위해 탄생했습니다.",
    "zh-CN": "SnapDoc 旨在消除臃肿、充斥广告且侵犯隐私的文件转换器。",
    "zh-TW": "SnapDoc 旨在消除臃腫、充斥廣告且侵犯隱私的文件轉換器。",
    ar: "تم إنشاء SnapDoc للتخلص من محولات الملفات البطيئة المليئة بالإعلانات والمنتهكة للخصوصية.",
    bg: "SnapDoc беше създаден, за да премахне претоварените, пълни с реклами и несигурни конвертори.",
    ca: "SnapDoc es va crear per eliminar convertidors pesats, plens d'anuncis i invasius.",
    nl: "SnapDoc is gemaakt om logge, met advertenties overspoelde en privacy-onvriendelijke converters te vervangen.",
    el: "Το SnapDoc δημιουργήθηκε για να εξαλείψει τους βαριούς, γεμάτους διαφημίσεις και αδιάκριτους μετατροπείς αρχείων.",
    hi: "SnapDoc को विज्ञापनों से भरे और गोपनीयता से समझौता करने वाले कनवर्टर्स को बदलने के लिए बनाया गया है।",
    id: "SnapDoc dibuat untuk menggantikan konverter file yang lambat, penuh iklan, dan melanggar privasi.",
    ms: "SnapDoc dicipta untuk menghapuskan penukar fail yang berat, penuh iklan dan menceroboh privasi.",
    pl: "SnapDoc powstał, aby zastąpić powolne, przeładowane reklamami i inwazyjne konwertery plików.",
    sv: "SnapDoc skapades för att eliminera tröga, annonsfyllda och integritetskränkande filkonverterare.",
    th: "SnapDoc ถูกสร้างขึ้นเพื่อกำจัดโปรแกรมแปลงไฟล์ที่เทอะทะ เต็มไปด้วยโฆษณา และล่วงล้ำความเป็นส่วนตัว",
    tr: "SnapDoc, reklam dolu, hantal ve gizliliği ihlal eden dosya dönüştürücüleri ortadan kaldırmak için tasarlandı.",
    uk: "SnapDoc створено, щоб усунути повільні, перевантажені рекламою та небезпечні конвертери файлів.",
    vi: "SnapDoc được tạo ra để loại bỏ các trình chuyển đổi tập tin cồng kềnh, ngập tràn quảng cáo và xâm phạm quyền riêng tư.",
    sw: "SnapDoc iliundwa ili kuondoa vibadilishi faili vilivyojaa matangazo na vinavyoingilia faragha.",
    bn: "বিজ্ঞাপনে ভরা, ধীরগতির এবং গোপনীয়তা লঙ্ঘনকারী ফাইল কনভার্টার থেকে মুক্তি দিতে SnapDoc তৈরি করা হয়েছে।"
  },
  ourMission: {
    en: "Our Mission", es: "Nuestra Misión", fr: "Notre Mission", de: "Unsere Mission", it: "La nostra missione",
    pt: "Nossa Missão", ja: "私たちの使命", ru: "Наша миссия", ko: "우리의 미션", "zh-CN": "我们的使命",
    "zh-TW": "我們的使命", ar: "مهمتنا", bg: "Нашата мисия", ca: "La nostra missió", nl: "Onze Missie",
    el: "Η αποστολή μας", hi: "हमारा उद्देश्य", id: "Misi Kami", ms: "Misi Kami", pl: "Nasza misja",
    sv: "Vårt uppdrag", th: "ภารกิจของเรา", tr: "Misyonumuz", uk: "Наша місія", vi: "Sứ mệnh của chúng tôi",
    sw: "Dhamira Yetu", bn: "আমাদের লক্ষ্য"
  },
  aboutMission1: {
    en: "Every day, millions of students, job seekers, and professionals need to compress a photo to 10KB for an official government application form, merge PDF contracts, or convert image formats. Most existing online tools are slow, enforce watermarks, require account registration, or store your private files on unknown remote servers.",
    es: "Todos los días millones de personas necesitan comprimir fotos a 10KB para trámites oficiales, unir contratos o convertir formatos. La mayoría de herramientas en línea son lentas, agregan marcas de agua, exigen registro o guardan archivos en servidores desconocidos.",
    fr: "Chaque jour, des millions d'utilisateurs doivent compresser une photo à 10 Ko pour un formulaire officiel, fusionner des contrats PDF ou convertir des images. La plupart des outils en ligne sont lents, imposent des filigranes ou stockent vos fichiers.",
    de: "Jeden Tag müssen Millionen von Nutzern Fotos auf 10KB für Formulare komprimieren, Verträge zusammenführen oder Bilder konvertieren. Viele Dienste erzwingen Wasserzeichen, Konten oder speichern private Daten.",
    it: "Ogni giorno milioni di utenti devono comprimere foto a 10KB per moduli ufficiali, unire contratti PDF o convertire immagini. Molti strumenti online impongono filigrane o memorizzano file personali.",
    pt: "Todos os dias milhões de pessoas precisam comprimir fotos para 10KB para formulários, juntar contratos em PDF ou converter formatos. A maioria dos sites impõe marcas de água, contas ou armazena arquivos.",
    ja: "毎日、何百万人もの人々が公式フォーム用に写真を10KBに圧縮したり、PDF契約書を結合したり、画像形式を変換したりしています。多くの既存ツールは透かしを入れたり、登録を強制したり、ファイルを保存したりします。",
    ru: "Каждый день миллионы людей сжимают фото до 10 КБ для государственных анкет, объединяют PDF-договоры или конвертируют изображения. Большинство существующих сервисов медленные, требуют регистрацию или сохраняют ваши файлы.",
    ko: "매일 수많은 사용자가 서류 제출용으로 사진을 10KB로 압축하거나 PDF를 병합하고 이미지를 변환합니다. 기존 도구 대다수는 워터마크를 넣거나 가입을 요구하며 파일을 서버에 저장합니다.",
    "zh-CN": "每天都有数以百万计的用户需要将照片压缩至 10KB 以提交官方表格，或合并 PDF 合同及转换格式。大多数现有工具速度缓慢、添加水印、强制注册或存储您的文件。",
    "zh-TW": "每天都有數以百萬計的使用者需要將照片壓縮至 10KB 以提交官方表格，或合併 PDF 合約及轉換格式。大多數現有工具速度緩慢、添加浮水印、強制註冊或存儲您的檔案。",
    ar: "كل يوم يحتاج الملايين إلى ضغط الصور إلى 10 كيلوبايت للاستمارات الرسمية أو دمج عقود PDF. معظم الأدوات الحالية بطيئة، وتفرض علامات مائية أو تسجل حسابات أو تحفظ ملفاتك الخاصة.",
    bg: "Всеки ден милиони хора компресират снимки до 10KB за формуляри, обединяват PDF договори или конвертират формати. Повечето сайтове слагат водни знаци или записват файловете ви.",
    ca: "Cada dia milions de persones necessiten comprimir fotos a 10KB per a tràmits oficials, unir contractes PDF o convertir formats. La majoria d'eines són lentes o guarden arxius.",
    nl: "Elke dag moeten miljoenen mensen foto's verkleinen tot 10KB voor officiële formulieren, contracten samenvoegen of bestanden converteren. Veel online tools forceren watermerken of slaan bestanden op.",
    el: "Καθημερινά εκατομμύρια χρήστες συμπιέζουν φωτογραφίες στα 10KB για επίσημες αιτήσεις, συγχωνεύουν συμβόλαια PDF ή μετατρέπουν εικόνες. Τα περισσότερα εργαλεία είναι αργά ή αποθηκεύουν τα αρχεία σας.",
    hi: "हर दिन लाखों लोगों को फॉर्म के लिए फोटो को 10KB में कंप्रेस करने, PDF जोड़ने या प्रारूप बदलने की आवश्यकता होती है। अधिकांश ऑनलाइन उपकरण धीमे होते हैं या आपकी फाइलें सहेजते हैं।",
    id: "Setiap hari jutaan orang perlu mengompres foto hingga 10KB untuk formulir resmi, menggabungkan kontrak PDF, atau mengonversi format. Sebagian besar alat online lambat atau menyimpan file Anda.",
    ms: "Setiap hari jutaan pengguna perlu memampatkan foto ke 10KB untuk borang rasmi, menggabungkan PDF atau menukar format. Kebanyakan alat dalam talian lambat atau menyimpan fail peribadi anda.",
    pl: "Każdego dnia miliony osób muszą zmniejszyć zdjęcie do 10 KB do wniosków urzędowych, połączyć umowy PDF lub przekonwertować pliki. Większość narzędzi jest powolna lub zapisuje pliki.",
    sv: "Varje dag behöver miljontals användare komprimera foton till 10KB för ansökningar, slå samman PDF-avtal eller konvertera filer. Många verktyg kräver registrering eller sparar filer.",
    th: "ทุกวัน ผู้คนหลายล้านคนจำเป็นต้องบีบอัดรูปภาพให้เหลือ 10KB สำหรับแบบฟอร์มทางการ รวมสัญญา PDF หรือแปลงรูปแบบไฟล์ เครื่องมือออนไลน์ส่วนใหญ่ทำงานช้าและบันทึกไฟล์ของคุณ",
    tr: "Her gün milyonlarca kullanıcı resmi formlar için fotoğrafları 10KB boyutuna küçültüyor, PDF sözleşmelerini birleştiriyor veya dosyaları dönüştürüyor. Çoğu araç filigran ekler veya dosyalarınızı kaydeder.",
    uk: "Щодня мільйони користувачів стискають фото до 10 КБ для офіційних форм, об'єднують договори PDF або конвертують зображення. Більшість сайтів повільні або зберігають ваші файли.",
    vi: "Mỗi ngày, hàng triệu người cần nén ảnh xuống 10KB cho hồ sơ hành chính, gộp hợp đồng PDF hoặc chuyển đổi định dạng. Hầu hết các trang web đều chậm chạp hoặc lưu trữ tệp của bạn.",
    sw: "Kila siku mamilioni ya watu wanahitaji kubana picha kuwa 10KB kwa fomu rasmi, kuunganisha mikataba ya PDF au kubadilisha fomati. Zana nyingi mtandaoni ni polepole na huhifadhi faili zako.",
    bn: "প্রতিদিন লাখ লাখ মানুষের সরকারি ফর্মের জন্য ছবি ১০ কেবিতে কম্প্রেস করা, পিডিএফ চুক্তিপত্র একত্রিত করা বা ফরম্যাট রূপান্তর করার প্রয়োজন হয়। প্রচলিত সাইটগুলো ধীরগতির এবং ফাইল সংরক্ষণ করে।"
  },
  aboutMission2: {
    en: "SnapDoc changes that by providing a completely free, zero-storage, in-memory tool suite that runs at native machine speed.",
    es: "SnapDoc cambia esto ofreciendo un conjunto de herramientas 100% gratuito, en memoria y sin almacenamiento que funciona a velocidad nativa.",
    fr: "SnapDoc change la donne en fournissant une suite d'outils gratuite, sans stockage permanent et ultra-rapide.",
    de: "SnapDoc ändert das mit einer völlig kostenlosen In-Memory-Tool-Suite ohne dauerhafte Speicherung bei nativer Geschwindigkeit.",
    it: "SnapDoc cambia tutto offrendo una suite di strumenti completamente gratuita, in memoria e senza archiviazione permanente.",
    pt: "O SnapDoc muda isso fornecendo ferramentas gratuitas em memória, sem armazenamento permanente e com velocidade nativa.",
    ja: "SnapDocは、完全無料・ストレージ保存ゼロ・メモリ内処理により、超高速で安全なツール群を提供します。",
    ru: "SnapDoc меняет это, предоставляя абсолютно бесплатный набор инструментов, работающих только в оперативной памяти с максимальной скоростью.",
    ko: "SnapDoc은 저장소 보관 없이 메모리 내에서 최고 속도로 동작하는 100% 무료 도구 모음을 제공합니다.",
    "zh-CN": "SnapDoc 通过提供完全免费、零存储、仅在内存中运行的高速工具套件改变了这一现状。",
    "zh-TW": "SnapDoc 透過提供完全免費、零存儲、僅在記憶體中運行的超高速工具套件改變了這一現狀。",
    ar: "يغير SnapDoc ذلك من خلال توفير مجموعة أدوات مجانية تماماً تعمل داخل الذاكرة المؤقتة بدون تخزين نهائي وبأقصى سرعة.",
    bg: "SnapDoc променя това, предоставяйки напълно безплатни инструменти в оперативната памет без никакво постоянно съхранение.",
    ca: "SnapDoc canvia això oferint eines gratuïtes en memòria, sense emmagatzematge permanent i a màxima velocitat.",
    nl: "SnapDoc verandert dit door een gratis, geheugengebaseerde toolset te bieden zonder permanente bestandsopslag.",
    el: "Το SnapDoc το αλλάζει αυτό παρέχοντας μια εντελώς δωρεάν σουίτα εργαλείων στη μνήμη χωρίς αποθήκευση σε δίσκο.",
    hi: "SnapDoc इसे पूरी तरह से मुफ्त, बिना स्टोरेज और मेमोरी में तेज गति से चलने वाले टूल्स के साथ बदलता है।",
    id: "SnapDoc mengubah hal itu dengan menyediakan rangkaian alat gratis, dalam memori, tanpa penyimpanan permanen dan secepat kilat.",
    ms: "SnapDoc mengubahnya dengan menyediakan alat percuma dalam memori tanpa storan kekal pada kelajuan maksimum.",
    pl: "SnapDoc zmienia to, oferując bezpłatny zestaw narzędzi działających w pamięci RAM bez trwałego zapisywania plików.",
    sv: "SnapDoc ändrar på detta med helt kostnadsfria verktyg som körs i minnet utan permanent lagring.",
    th: "SnapDoc เปลี่ยนสิ่งนั้นด้วยการจัดเตรียมชุดเครื่องมือที่ทำงานในหน่วยความจำ ฟรี 100% ไม่มีการบันทึกไฟล์ถาวร และรวดเร็ว",
    tr: "SnapDoc, kalıcı depolama yapmayan, tamamen bellekte ve maksimum hızda çalışan ücretsiz bir araç paketi sunar.",
    uk: "SnapDoc змінює це, пропонуючи повністю безкоштовний набір інструментів, що працюють виключно в оперативній пам'яті.",
    vi: "SnapDoc thay đổi điều đó bằng bộ công cụ hoàn toàn miễn phí, xử lý trực tiếp trong bộ nhớ RAM và không lưu trữ vĩnh viễn.",
    sw: "SnapDoc inabadilisha hilo kwa kutoa zana za bure kabisa, zinazofanya kazi katika kumbukumbu bila kuhifadhi faili.",
    bn: "SnapDoc সম্পূর্ণ বিনামূল্যে মেমোরিতে প্রসেসিং এবং কোনো ফাইল স্থায়ী সংরক্ষণ না করে অত্যন্ত দ্রুতগতির সুবিধা দেয়।"
  },
  privacyZeroStorageGuarantee: {
    en: "Zero Permanent File Storage Guarantee", es: "Garantía de almacenamiento permanente cero",
    fr: "Garantie de stockage permanent zéro", de: "Garantie: Null permanente Speicherung",
    it: "Garanzia di zero archiviazione permanente", pt: "Garantia de zero armazenamento permanente",
    ja: "永久保存ゼロ保証", ru: "Гарантия: файлы никогда не сохраняются на диск",
    ko: "영구 파일 저장 제로 보장", "zh-CN": "零永久文件存储保证", "zh-TW": "零永久檔案存儲保證",
    ar: "ضمان عدم التخزين الدائم للملفات", bg: "Гаранция за нулево постоянно съхранение",
    ca: "Garantia de zero emmagatzematge permanent", nl: "Garantie voor nul permanente bestandsopslag",
    el: "Εγγύηση μηδενικής μόνιμης αποθήκευσης", hi: "स्थायी फ़ाइल भंडारण शून्य गारंटी",
    id: "Jaminan Tanpa Penyimpanan File Permanen", ms: "Jaminan Sifar Storan Fail Kekal",
    pl: "Gwarancja zerowego przechowywania plików", sv: "Garanti för noll permanent fillagring",
    th: "รับประกันไม่มีการจัดเก็บไฟล์ถาวร", tr: "Sıfır Kalıcı Dosya Depolama Garantisi",
    uk: "Гарантія нульового постійного зберігання файлів", vi: "Cam kết không lưu trữ tập tin vĩnh viễn",
    sw: "Uhakika wa Kutohifadhi Faili Kabisa", bn: "ফাইল স্থায়ী সংরক্ষণ শূন্য নিশ্চয়তা"
  },
  privacyPolicyTitle: {
    en: "Privacy Policy", es: "Política de Privacidad", fr: "Politique de Confidentialité", de: "Datenschutzerklärung",
    it: "Informativa sulla Privacy", pt: "Política de Privacidade", ja: "プライバシーポリシー",
    ru: "Политика конфиденциальности", ko: "개인정보 처리방침", "zh-CN": "隐私政策",
    "zh-TW": "隱私權政策", ar: "سياسة الخصوصية", bg: "Политика за поверителност", ca: "Política de Privadesa",
    nl: "Privacybeleid", el: "Πολιτική Απορρήτου", hi: "गोपनीयता नीति", id: "Kebijakan Privasi",
    ms: "Dasar Privasi", pl: "Polityka prywatności", sv: "Integritetspolicy", th: "นโยบายความเป็นส่วนตัว",
    tr: "Gizlilik Politikası", uk: "Політика конфіденційності", vi: "Chính sách Bảo mật", sw: "Sera ya Faragha",
    bn: "গোপনীয়তা নীতি"
  },
  termsOfServiceTitle: {
    en: "Terms of Service", es: "Términos de Servicio", fr: "Conditions d'Utilisation", de: "Nutzungsbedingungen",
    it: "Termini di Servizio", pt: "Termos de Serviço", ja: "利用規約", ru: "Условия использования",
    ko: "이용약관", "zh-CN": "服务条款", "zh-TW": "服務條款", ar: "شروط الخدمة", bg: "Условия за ползване",
    ca: "Termes de Servei", nl: "Gebruiksvoorwaarden", el: "Όροι Χρήσης", hi: "सेवा की शर्तें",
    id: "Syarat Layanan", ms: "Syarat Perkhidmatan", pl: "Warunki korzystania", sv: "Användarvillkor",
    th: "ข้อกำหนดในการให้บริการ", tr: "Kullanım Şartları", uk: "Умови надання послуг", vi: "Điều khoản Dịch vụ",
    sw: "Masharti ya Huduma", bn: "ব্যবহারের শর্তাবলী"
  },
  backToGuides: {
    en: "Back to all guides", es: "Volver a todas las guías", fr: "Retour à tous les guides", de: "Zurück zu allen Anleitungen",
    it: "Torna a tutte le guide", pt: "Voltar para todos os guias", ja: "すべてのガイドに戻る", ru: "Назад ко всем руководствам",
    ko: "모든 가이드로 돌아가기", "zh-CN": "返回所有指南", "zh-TW": "返回所有指南", ar: "الرجوع إلى جميع الأدلة",
    bg: "Назад към всички ръководства", ca: "Tornar a totes les guies", nl: "Terug naar alle handleidingen",
    el: "Επιστροφή σε όλους τους οδηγούς", hi: "सभी गाइड पर वापस जाएं", id: "Kembali ke semua panduan",
    ms: "Kembali ke semua panduan", pl: "Wróć do wszystkich poradników", sv: "Tillbaka till alla guider",
    th: "กลับไปยังคู่มือทั้งหมด", tr: "Tüm rehberlere dön", uk: "Назад до всіх посібників", vi: "Quay lại tất cả hướng dẫn",
    sw: "Rudi kwenye miongozo yote", bn: "সকল গাইডে ফিরে যান"
  },
  updated: {
    en: "Updated", es: "Actualizado", fr: "Mis à jour", de: "Aktualisiert", it: "Aggiornato", pt: "Atualizado",
    ja: "更新日", ru: "Обновлено", ko: "업데이트됨", "zh-CN": "更新于", "zh-TW": "更新於",
    ar: "تم التحديث", bg: "Обновено", ca: "Actualitzat", nl: "Bijgewerkt", el: "Ενημερώθηκε",
    hi: "अद्यतन", id: "Diperbarui", ms: "Dikemas kini", pl: "Zaktualizowano", sv: "Uppdaterad",
    th: "อัปเดตแล้ว", tr: "Güncellendi", uk: "Оновлено", vi: "Đã cập nhật", sw: "Ilisasishwa", bn: "আপডেট করা হয়েছে"
  },
  recommendedTool: {
    en: "Recommended Free Online Tool", es: "Herramienta en línea recomendada", fr: "Outil en ligne gratuit recommandé",
    de: "Empfohlenes kostenloses Online-Tool", it: "Strumento online consigliato", pt: "Ferramenta online recomendada",
    ja: "おすすめの無料オンラインツール", ru: "Рекомендуемый бесплатный онлайн-инструмент", ko: "추천 무료 온라인 도구",
    "zh-CN": "推荐的免费在线工具", "zh-TW": "推薦的免費線上工具", ar: "الأداة المجانية الموصى بها عبر الإنترنت",
    bg: "Препоръчан безплатен онлайн инструмент", ca: "Eina en línia gratuïta recomanada", nl: "Aanbevolen gratis online tool",
    el: "Προτεινόμενο δωρεάν διαδικτυακό εργαλείο", hi: "अनुशंसित मुफ्त ऑनलाइन उपकरण", id: "Alat Online Gratis yang Direkomendasikan",
    ms: "Alat Dalam Talian Percuma Disyorkan", pl: "Polecane darmowe narzędzie online", sv: "Rekommenderat gratis onlineverktyg",
    th: "เครื่องมือออนไลน์ฟรีที่แนะนำ", tr: "Önerilen Ücretsiz Çevrimiçi Araç", uk: "Рекомендований безкоштовний онлайн-інструмент",
    vi: "Công cụ trực tuyến miễn phí được đề xuất", sw: "Zana ya Bure ya Mtandaoni Inayopendekezwa", bn: "প্রস্তাবিত ফ্রি অনলাইন টুল"
  },
  tableOfContents: {
    en: "Table of Contents", es: "Tabla de Contenidos", fr: "Table des Matières", de: "Inhaltsverzeichnis",
    it: "Sommario", pt: "Índice de Conteúdo", ja: "目次", ru: "Содержание", ko: "목차",
    "zh-CN": "目录", "zh-TW": "目錄", ar: "جدول المحتويات", bg: "Съдържание", ca: "Taula de Continguts",
    nl: "Inhoudsopgave", el: "Πίνακας Περιεχομένων", hi: "विषय सूची", id: "Daftar Isi", ms: "Jadual Kandungan",
    pl: "Spis treści", sv: "Innehållsförteckning", th: "สารบัญ", tr: "İçindekiler Tablosu", uk: "Зміст",
    vi: "Mục lục", sw: "Yaliyomo", bn: "সূচিপত্র"
  },
  faqTitle: {
    en: "Frequently Asked Questions", es: "Preguntas Frecuentes", fr: "Foire Aux Questions", de: "Häufig gestellte Fragen",
    it: "Domande Frequenti", pt: "Perguntas Frequentes", ja: "よくあるご質問", ru: "Часто задаваемые вопросы",
    ko: "자주 묻는 질문", "zh-CN": "常见问题解答", "zh-TW": "常見問題解答", ar: "الأسئلة الشائعة",
    bg: "Често задавани въпроси", ca: "Preguntes Freqüents", nl: "Veelgestelde Vragen", el: "Συχνές Ερωτήσεις",
    hi: "अक्सर पूछे जाने वाले प्रश्न", id: "Pertanyaan yang Sering Diajukan", ms: "Soalan Lazim", pl: "Często zadawane pytania",
    sv: "Vanliga frågor", th: "คำถามที่พบบ่อย", tr: "Sıkça Sorulan Sorular", uk: "Часті запитання",
    vi: "Câu hỏi thường gặp", sw: "Maswali Yanayoulizwa Mara kwa Mara", bn: "সাধারণ জিজ্ঞাসা ও উত্তর"
  },
  trySearchSuggestions: {
    en: "Try searching for \"compress\", \"pdf\", \"convert\", or \"10kb\".",
    es: "Pruebe a buscar \"comprimir\", \"pdf\", \"convertir\" o \"10kb\".",
    fr: "Essayez de rechercher « compresser », « pdf », « convertir » ou « 10ko ».",
    de: "Versuchen Sie, nach „komprimieren“, „pdf“, „konvertieren“ oder „10kb“ zu suchen.",
    it: "Prova a cercare \"comprimi\", \"pdf\", \"converti\" o \"10kb\".",
    pt: "Tente pesquisar por \"comprimir\", \"pdf\", \"converter\" ou \"10kb\".",
    ja: "「圧縮」、「PDF」、「変換」、「10KB」などで検索してみてください。",
    ru: "Попробуйте поискать «сжать», «pdf», «конвертировать» или «10kb».",
    ko: "\"압축\", \"pdf\", \"변환\" 또는 \"10kb\"로 검색해 보세요.",
    "zh-CN": "尝试搜索“压缩”、“pdf”、“转换”或“10kb”。",
    "zh-TW": "嘗試搜尋“壓縮”、“pdf”、“轉換”或“10kb”。",
    ar: "جرب البحث عن \"ضغط\" أو \"pdf\" أو \"تحويل\" أو \"10kb\".",
    bg: "Опитайте да потърсите \"компресиране\", \"pdf\", \"конвертиране\" или \"10kb\".",
    ca: "Proveu de cercar \"comprimir\", \"pdf\", \"convertir\" o \"10kb\".",
    nl: "Probeer te zoeken naar \"comprimeren\", \"pdf\", \"converteren\" of \"10kb\".",
    el: "Δοκιμάστε να αναζητήσετε \"συμπίεση\", \"pdf\", \"μετατροπή\" ή \"10kb\".",
    hi: "\"कंप्रेस\", \"pdf\", \"कन्वर्ट\" या \"10kb\" खोजें।",
    id: "Coba cari \"kompres\", \"pdf\", \"konversi\", atau \"10kb\".",
    ms: "Cuba cari \"mampat\", \"pdf\", \"tukar\", atau \"10kb\".",
    pl: "Spróbuj wyszukać „kompresuj”, „pdf”, „konwertuj” lub „10kb”.",
    sv: "Prova att söka efter \"komprimera\", \"pdf\", \"konvertera\" eller \"10kb\".",
    th: "ลองค้นหา \"บีบอัด\", \"pdf\", \"แปลงไฟล์\" หรือ \"10kb\"",
    tr: "\"Sıkıştır\", \"pdf\", \"dönüştür\" veya \"10kb\" aramayı deneyin.",
    uk: "Спробуйте пошукати «стиснути», «pdf», «конвертувати» або «10kb».",
    vi: "Thử tìm kiếm \"nén\", \"pdf\", \"chuyển đổi\" hoặc \"10kb\".",
    sw: "Jaribu kutafuta \"bana\", \"pdf\", \"badilisha\", au \"10kb\".",
    bn: "\"কম্প্রেস\", \"পিডিএফ\", \"কনভার্ট\" বা \"১০কেবি\" লিখে খুঁজুন।"
  },
  totalFreeTools: {
    en: "total free online tools", es: "herramientas gratuitas en total", fr: "outils en ligne gratuits au total",
    de: "kostenlose Online-Tools insgesamt", it: "strumenti online gratuiti in totale", pt: "ferramentas online gratuitas no total",
    ja: "種類の完全無料オンラインツール", ru: "бесплатных онлайн-инструментов", ko: "개의 무료 온라인 도구",
    "zh-CN": "款免费在线工具", "zh-TW": "款免費線上工具", ar: "أداة مجانية بالكامل عبر الإنترنت",
    bg: "безплатни онлайн инструмента общо", ca: "eines en línia gratuïtes en total", nl: "gratis online tools in totaal",
    el: "δωρεάν διαδικτυακά εργαλεία συνολικά", hi: "कुल मुफ्त ऑनलाइन उपकरण", id: "total alat online gratis",
    ms: "jumlah alat dalam talian percuma", pl: "darmowych narzędzi online łącznie", sv: "gratis onlineverktyg totalt",
    th: "เครื่องมือออนไลน์ฟรีทั้งหมด", tr: "toplam ücretsiz çevrimiçi araç", uk: "безкоштовних онлайн-інструментів загалом",
    vi: "công cụ trực tuyến miễn phí", sw: "jumla ya zana za bure mtandaoni", bn: "টি সম্পূর্ণ ফ্রি অনলাইন টুল"
  },
  pressEsc: {
    en: "Press ESC to close", es: "Presione ESC para cerrar", fr: "Appuyez sur Échap pour fermer",
    de: "ESC zum Schließen drücken", it: "Premi ESC per chiudere", pt: "Pressione ESC para fechar",
    ja: "ESCキーで閉じる", ru: "Нажмите ESC, чтобы закрыть", ko: "닫으려면 ESC 키를 누르세요",
    "zh-CN": "按 ESC 关闭", "zh-TW": "按 ESC 關閉", ar: "اضغط ESC للإغلاق", bg: "Натиснете ESC за затваряне",
    ca: "Premeu ESC per tancar", nl: "Druk op ESC om te sluiten", el: "Πατήστε ESC για κλείσιμο",
    hi: "बंद करने के लिए ESC दबाएं", id: "Tekan ESC untuk menutup", ms: "Tekan ESC untuk tutup",
    pl: "Naciśnij ESC, aby zamknąć", sv: "Tryck på ESC för att stänga", th: "กด ESC เพื่อปิด",
    tr: "Kapatmak için ESC tuşuna basın", uk: "Натисніть ESC, щоб закрити", vi: "Nhấn ESC để đóng",
    sw: "Bonyeza ESC kufunga", bn: "বন্ধ করতে ESC চাপুন"
  }
};

const ALL_LANGS = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ru', 'ko',
  'zh-CN', 'zh-TW', 'ar', 'bg', 'ca', 'nl', 'el', 'hi',
  'id', 'ms', 'pl', 'sv', 'th', 'tr', 'uk', 'vi', 'sw', 'bn'
];

for (const lang of ALL_LANGS) {
  if (!dict[lang]) dict[lang] = { ...dict['en'] };
  for (const [key, map] of Object.entries(T)) {
    if (map[lang]) {
      dict[lang][key] = map[lang];
    }
  }
}

const newContent = 'export const EXTENDED_APP_TRANSLATIONS: Record<string, Record<string, string>> = ' + JSON.stringify(dict, null, 2) + ';\n';
fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('Enriched extendedAppTranslations.ts successfully!');
