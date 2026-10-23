// «С чего начать»: топ-3 вуза по стране и направлению, общий шаблон требований, курсы учебных центров.
// Нужны (подключать раньше): data.js (FIELDS, AREAS), unis-data.js (UNIS, uniFits, findUni); abroad.js (COUNTRIES) — по желанию, для расходов на жизнь.
// Всё без DOM: функции возвращают обычные объекты. Тексты — {ru, en, uz}; показывать через tx(...) из common.js.
// Экспорт: window.START = { countries, top3, requirementsTemplate, coursesFor, ... }, а также window.startCountries / top3 / requirementsTemplate / coursesFor.
// Источник цифр IELTS/SAT/балла/цены — UNIS (unis-data.js, ориентир 2026). Страновые правила (документы, сроки, местные экзамены) —
// START_RULES ниже: поле check:true = «уточнить на сайте вуза», v:'ok' = сверено с официальным сайтом, src и year — источник.
(function () {
  const T = (ru, en, uz) => ({ ru, en, uz });

  // ---------- названия стран ----------
  const NAMES = {
    US: T('США', 'USA', 'AQSH'), CA: T('Канада', 'Canada', 'Kanada'), GB: T('Великобритания', 'United Kingdom', 'Buyuk Britaniya'),
    IE: T('Ирландия', 'Ireland', 'Irlandiya'), DE: T('Германия', 'Germany', 'Germaniya'), AT: T('Австрия', 'Austria', 'Avstriya'),
    CH: T('Швейцария', 'Switzerland', 'Shveytsariya'), NL: T('Нидерланды', 'Netherlands', 'Niderlandiya'), BE: T('Бельгия', 'Belgium', 'Belgiya'),
    SE: T('Швеция', 'Sweden', 'Shvetsiya'), FI: T('Финляндия', 'Finland', 'Finlyandiya'), FR: T('Франция', 'France', 'Fransiya'),
    IT: T('Италия', 'Italy', 'Italiya'), ES: T('Испания', 'Spain', 'Ispaniya'), HU: T('Венгрия', 'Hungary', 'Vengriya'),
    PL: T('Польша', 'Poland', 'Polsha'), CZ: T('Чехия', 'Czechia', 'Chexiya'), KR: T('Южная Корея', 'South Korea', 'Janubiy Koreya'),
    JP: T('Япония', 'Japan', 'Yaponiya'), CN: T('Китай', 'China', 'Xitoy'), HK: T('Гонконг', 'Hong Kong', 'Gonkong'),
    SG: T('Сингапур', 'Singapore', 'Singapur'), MY: T('Малайзия', 'Malaysia', 'Malayziya'), TR: T('Турция', 'Türkiye', 'Turkiya'),
    AE: T('ОАЭ', 'UAE', 'BAA'), QA: T('Катар', 'Qatar', 'Qatar'), SA: T('Саудовская Аравия', 'Saudi Arabia', 'Saudiya Arabistoni'),
    AU: T('Австралия', 'Australia', 'Avstraliya'), NZ: T('Новая Зеландия', 'New Zealand', 'Yangi Zelandiya'),
    RU: T('Россия', 'Russia', 'Rossiya'), KZ: T('Казахстан', 'Kazakhstan', 'Qozogʻiston'), UZ: T('Узбекистан', 'Uzbekistan', 'Oʻzbekiston'),
  };

  // ---------- документы ----------
  const DOCS = {
    cert: { t: T('Аттестат о среднем образовании с оценками', 'Secondary school certificate with grades', 'Oʻrta taʼlim attestati (baholar bilan)') },
    translation: { t: T('Нотариальный перевод аттестата и приложения', 'Notarised translation of the certificate and transcript', 'Attestat va ilovaning notarial tarjimasi') },
    apostille: { t: T('Апостиль на аттестате (Минюст Узбекистана)', 'Apostille on the certificate (Uzbek Ministry of Justice)', 'Attestatga apostil (Oʻzbekiston Adliya vazirligi)') },
    passport: { t: T('Загранпаспорт (срок действия не менее 1,5 лет)', 'Passport (valid at least 1.5 years)', 'Xorijiy pasport (kamida 1,5 yil amal qiladi)') },
    essay: { t: T('Мотивационное письмо / эссе', 'Motivation letter / essay', 'Motivatsion xat / esse') },
    recs: { t: T('Рекомендательные письма (учителя, куратор)', 'Recommendation letters (teachers, counsellor)', 'Tavsiya xatlari (oʻqituvchilar, kurator)') },
    portfolio: { t: T('Портфолио работ', 'Portfolio of work', 'Ishlar portfolyosi') },
    finance: { t: T('Подтверждение финансов (выписка со счёта, спонсор)', 'Proof of funds (bank statement, sponsor)', 'Moliyaviy taʼminot tasdigʻi (bank hisobi, homiy)') },
    medical: { t: T('Медицинская справка', 'Medical certificate', 'Tibbiy maʼlumotnoma') },
  };
  const DOC_ORDER = ['cert', 'translation', 'apostille', 'passport', 'essay', 'recs', 'portfolio', 'finance', 'medical'];

  // ---------- правила по странам ----------
  // docs — какие документы нужны; dl — сроки подачи; exam — местный экзамен/язык (только если он реально нужен), check:true = уточнить
  const BASE = ['cert', 'translation', 'passport'];
  const EU_BASE = ['cert', 'translation', 'apostille', 'passport', 'finance'];
  const START_RULES = {
    US: { docs: [...BASE, 'essay', 'recs', 'finance'], src: 'https://www.commonapp.org', year: 2026,
      dl: { v: 'ok', t: T('Ранний раунд (Early) — около 1 ноября, основной (Regular) — 1–15 января; даты у каждого вуза свои', 'Early round about 1 November, Regular 1–15 January; each university sets its own dates', 'Erta raund (Early) — taxminan 1-noyabr, asosiy (Regular) — 1–15-yanvar; har bir oliygohning oʻz sanalari bor') } },
    CA: { docs: [...BASE, 'essay', 'finance'], src: 'https://future.utoronto.ca', year: 2026,
      dl: { v: 'check', t: T('Обычно 15 января (Торонто, UBC, McGill); рекомендуют подать в ноябре', 'Usually 15 January (Toronto, UBC, McGill); November is recommended', 'Odatda 15-yanvar (Toronto, UBC, McGill); noyabrda topshirish tavsiya etiladi') } },
    GB: { docs: [...BASE, 'essay', 'recs', 'finance'], src: 'https://www.ucas.com', year: 2026,
      dl: { v: 'check', t: T('UCAS: на набор 2027 срок для Оксфорда, Кембриджа и медицины (15 октября 2026) уже прошёл; основной срок на 2027 — 13 января 2027. Для набора 2028 ранний срок — примерно середина октября 2027, дату уточнить на ucas.com', 'UCAS: for 2027 entry the Oxford, Cambridge and medicine deadline (15 October 2026) has passed; main 2027 deadline is 13 January 2027. For 2028 entry the early deadline is about mid-October 2027 — check the date on ucas.com', 'UCAS: 2027-yil qabuli uchun Oksford, Kembrij va tibbiyot muddati (2026-yil 15-oktabr) oʻtib ketgan; 2027 uchun asosiy muddat — 2027-yil 13-yanvar. 2028 qabuli uchun erta muddat taxminan 2027-yil oktabr oʻrtalari — sanani ucas.com da aniqlang') } },
    IE: { docs: [...BASE, 'finance'], src: 'https://www.cao.ie', year: 2026,
      dl: { v: 'check', t: T('CAO: обычно до 1 февраля', 'CAO: usually by 1 February', 'CAO: odatda 1-fevralgacha') } },
    DE: { docs: [...EU_BASE, 'essay'], src: 'https://www.uni-assist.de', year: 2026,
      exam: { id: 'de', t: T('Немецкий: B1 для поступления в Studienkolleg, затем экзамен Feststellungsprüfung; для программ на немецком — C1 (TestDaF / DSH)', 'German: B1 to enter Studienkolleg, then the Feststellungsprüfung; for German-taught programmes C1 (TestDaF / DSH)', 'Nemis tili: Studienkolleg uchun B1, soʻng Feststellungsprüfung imtihoni; nemis tilidagi dasturlar uchun C1 (TestDaF / DSH)'), check: true, key: 'german' },
      dl: { v: 'ok', t: T('Зимний семестр — до 15 июля, летний — до 15 января (через uni-assist; у Studienkolleg и некоторых вузов свои сроки)', 'Winter semester by 15 July, summer by 15 January (via uni-assist; Studienkollegs and some universities have their own dates)', 'Qishki semestr — 15-iyulgacha, yozgi — 15-yanvargacha (uni-assist orqali; Studienkolleg va ayrim oliygohlarda oʻz muddatlari bor)') } },
    AT: { docs: [...EU_BASE, 'essay'], src: 'https://studyinaustria.at', year: 2026,
      exam: { id: 'de', t: T('Немецкий: B2–C1 для программ на немецком; подготовительный курс (Vorstudienlehrgang) для аттестата Узбекистана', 'German: B2–C1 for German-taught programmes; preparatory course (Vorstudienlehrgang) for the Uzbek certificate', 'Nemis tili: nemis tilidagi dasturlar uchun B2–C1; Oʻzbekiston attestati uchun tayyorlov kursi (Vorstudienlehrgang)'), check: true, key: 'german' },
      dl: { v: 'check', t: T('Обычно до 1–5 сентября (осенний набор) и до начала февраля (весенний)', 'Usually by 1–5 September (autumn) and early February (spring)', 'Odatda 1–5-sentabrgacha (kuz) va fevral boshigacha (bahor)') } },
    CH: { docs: [...EU_BASE, 'essay'], src: 'https://ethz.ch/en/studies/bachelor.html', year: 2026,
      dl: { v: 'check', t: T('ETH Zürich: до 30 апреля; у остальных вузов свои сроки', 'ETH Zürich: by 30 April; other universities differ', 'ETH Zürich: 30-apreldan oldin; boshqa oliygohlarda boshqacha') } },
    NL: { docs: [...EU_BASE, 'essay'], src: 'https://www.studyinholland.nl', year: 2026,
      dl: { v: 'check', t: T('Studielink: для студентов не из ЕС — обычно до 1 мая; медицина и ограниченные программы — до 15 января', 'Studielink: non-EU usually by 1 May; medicine and capped programmes by 15 January', 'Studielink: YeI dan tashqari — odatda 1-maygacha; tibbiyot va cheklangan dasturlar — 15-yanvargacha') } },
    BE: { docs: EU_BASE, src: 'https://www.studyinflanders.be', year: 2026,
      dl: { v: 'check', t: T('Обычно до 1 марта (для студентов не из ЕС)', 'Usually by 1 March (non-EU)', 'Odatda 1-martgacha (YeI dan tashqari)') } },
    SE: { docs: EU_BASE, src: 'https://www.universityadmissions.se', year: 2026,
      dl: { v: 'check', t: T('universityadmissions.se: середина января на осенний набор', 'universityadmissions.se: mid-January for autumn intake', 'universityadmissions.se: kuzgi qabul uchun yanvar oʻrtalari') } },
    FI: { docs: EU_BASE, src: 'https://studyinfinland.fi', year: 2026,
      dl: { v: 'check', t: T('Совместная подача (Studyinfo): январь', 'Joint application (Studyinfo): January', 'Birgalikda topshirish (Studyinfo): yanvar') } },
    FR: { docs: [...EU_BASE, 'essay'], src: 'https://www.campusfrance.org', year: 2026,
      exam: { id: 'fr', t: T('Французский B2 (DELF/TCF) для программ на французском', 'French B2 (DELF/TCF) for French-taught programmes', 'Frantsuz tili B2 (DELF/TCF) — frantsuz tilidagi dasturlar uchun'), check: true, key: null },
      dl: { v: 'check', t: T('Campus France / «Études en France»: ноябрь–январь', 'Campus France / “Études en France”: November–January', 'Campus France / «Études en France»: noyabr–yanvar') } },
    IT: { docs: EU_BASE, src: 'https://www.universitaly.it', year: 2026,
      exam: { id: 'it', t: T('Вступительный тест вуза (например TOLC) и итальянский B2 для программ на итальянском', 'University entrance test (e.g. TOLC) and Italian B2 for Italian-taught programmes', 'Oliygoh kirish testi (masalan TOLC) va italyan tili B2 — italyan tilidagi dasturlar uchun'), check: true, key: null },
      dl: { v: 'check', t: T('Предзапись на Universitaly: примерно февраль–апрель', 'Pre-enrolment on Universitaly: roughly February–April', 'Universitaly orqali dastlabki roʻyxat: taxminan fevral–aprel') } },
    ES: { docs: EU_BASE, src: 'https://www.universidades.gob.es', year: 2026,
      exam: { id: 'es', t: T('Испанский B2 для программ на испанском; допуск через UNEDasiss — уточнить', 'Spanish B2 for Spanish-taught programmes; admission via UNEDasiss — to confirm', 'Ispan tili B2 — ispan tilidagi dasturlar uchun; UNEDasiss orqali qabul — aniqlashtirish kerak'), check: true, key: null },
      dl: { v: 'check', t: T('Обычно май–июль', 'Usually May–July', 'Odatda may–iyul') } },
    HU: { docs: [...EU_BASE, 'essay', 'recs', 'medical'], src: 'https://stipendiumhungaricum.hu', year: 2026,
      exam: { id: 'hu', t: T('Вступительные экзамены/собеседование вуза — уточнить у каждого вуза', 'University entrance exams/interview — check with each university', 'Oliygohning kirish imtihonlari/suhbat — har bir oliygohdan aniqlang'), check: true, key: null },
      dl: { v: 'check', t: T('Грант Stipendium Hungaricum: ожидается 15 января 2027 (набор 2026/27 закрылся 15 января 2026; официальный набор 2027/28 ещё не объявлен); сами вузы — февраль–апрель', 'Stipendium Hungaricum: expected 15 January 2027 (2026/27 closed 15 January 2026; the official 2027/28 call is not out yet); universities themselves — February–April', 'Stipendium Hungaricum: 2027-yil 15-yanvar kutilmoqda (2026/27 — 2026-yil 15-yanvarda yopilgan; 2027/28 rasmiy eʼlon qilinmagan); oliygohlarning oʻzida — fevral–aprel') } },
    PL: { docs: EU_BASE, src: 'https://study.gov.pl', year: 2026,
      dl: { v: 'check', t: T('Обычно июнь–июль (у многих вузов до 31 июля)', 'Usually June–July (many universities until 31 July)', 'Odatda iyun–iyul (koʻp oliygohlarda 31-iyulgacha)') } },
    CZ: { docs: [...EU_BASE, 'medical'], src: 'https://www.studyin.cz', year: 2026,
      exam: { id: 'cz', t: T('Вступительные экзамены вуза (математика/профильные) — уточнить', 'University entrance exams (maths/subject) — to confirm', 'Oliygoh kirish imtihonlari (matematika/profil) — aniqlashtirish kerak'), check: true, key: null },
      dl: { v: 'check', t: T('Обычно февраль–апрель', 'Usually February–April', 'Odatda fevral–aprel') } },
    KR: { docs: [...BASE, 'apostille', 'essay', 'recs', 'finance', 'medical'], src: 'https://www.studyinkorea.go.kr', year: 2026,
      exam: { id: 'kr', t: T('TOPIK 3–4 для программ на корейском (для программ на английском достаточно IELTS)', 'TOPIK 3–4 for Korean-taught programmes (IELTS is enough for English-taught)', 'Koreys tilidagi dasturlar uchun TOPIK 3–4 (inglizcha dasturlar uchun IELTS yetarli)'), check: true, key: 'topik' },
      dl: { v: 'check', t: T('Осенний набор — март–июнь, весенний — сентябрь–ноябрь; GKS — смотри календарь и сайт', 'Autumn intake March–June, spring September–November; GKS — see the calendar and website', 'Kuzgi qabul — mart–iyun, bahorgi — sentabr–noyabr; GKS — taqvim va saytga qarang') } },
    JP: { docs: [...BASE, 'essay', 'recs', 'finance'], src: 'https://www.studyinjapan.go.jp', year: 2026,
      exam: { id: 'jp', t: T('EJU или JLPT N2 для программ на японском (для программ на английском — IELTS/TOEFL)', 'EJU or JLPT N2 for Japanese-taught programmes (IELTS/TOEFL for English-taught)', 'Yapon tilidagi dasturlar uchun EJU yoki JLPT N2 (inglizcha dasturlar uchun IELTS/TOEFL)'), check: true, key: 'japanese' },
      dl: { v: 'check', t: T('Набор в апреле: подача обычно с октября по январь', 'April intake: applications usually October–January', 'Aprel qabuli: ariza odatda oktabr–yanvar') } },
    CN: { docs: [...BASE, 'apostille', 'essay', 'recs', 'finance', 'medical'], src: 'https://www.campuschina.org', year: 2026,
      exam: { id: 'cn', t: T('HSK 4–5 для программ на китайском (для программ на английском — IELTS/TOEFL)', 'HSK 4–5 for Chinese-taught programmes (IELTS/TOEFL for English-taught)', 'Xitoy tilidagi dasturlar uchun HSK 4–5 (inglizcha dasturlar uchun IELTS/TOEFL)'), check: true, key: 'hsk' },
      dl: { v: 'check', t: T('Набор в сентябре: подача январь–июнь; стипендия CSC — обычно январь–апрель', 'September intake: applications January–June; CSC scholarship usually January–April', 'Sentabr qabuli: ariza yanvar–iyun; CSC stipendiyasi odatda yanvar–aprel') } },
    HK: { docs: [...BASE, 'essay', 'finance'], src: 'https://www.hku.hk', year: 2026,
      dl: { v: 'check', t: T('Обычно с осени до января–февраля', 'Usually autumn to January–February', 'Odatda kuzdan yanvar–fevralgacha') } },
    SG: { docs: [...BASE, 'essay', 'recs', 'finance'], src: 'https://www.nus.edu.sg/oam', year: 2026,
      dl: { v: 'check', t: T('Обычно октябрь–февраль', 'Usually October–February', 'Odatda oktabr–fevral') } },
    MY: { docs: [...BASE, 'finance', 'medical'], src: 'https://educationmalaysia.gov.my', year: 2026,
      dl: { v: 'check', t: T('Набор несколько раз в год (январь, май, сентябрь) — уточнить', 'Several intakes a year (January, May, September) — to confirm', 'Yilda bir necha qabul (yanvar, may, sentabr) — aniqlashtirish kerak') } },
    TR: { docs: [...EU_BASE, 'medical'], src: 'https://www.turkiyeburslari.gov.tr', year: 2026,
      exam: { id: 'tr', t: T('Вузы Турции принимают SAT или свой экзамен (YÖS) — уточнить у вуза', 'Turkish universities accept SAT or their own exam (YÖS) — check with the university', 'Turkiya oliygohlari SAT yoki oʻz imtihonini (YÖS) qabul qiladi — oliygohdan aniqlang'), check: true, key: null },
      dl: { v: 'check', t: T('Вузы: апрель–июль; стипендия Türkiye Bursları — до 20 февраля', 'Universities April–July; Türkiye Bursları scholarship — by 20 February', 'Oliygohlar: aprel–iyul; Türkiye Bursları stipendiyasi — 20-fevralgacha') } },
    AE: { docs: [...BASE, 'apostille', 'finance', 'medical'], src: 'https://www.ku.ac.ae', year: 2026,
      dl: { v: 'check', t: T('Обычно январь–июнь (у каждого вуза свои)', 'Usually January–June (varies by university)', 'Odatda yanvar–iyun (har bir oliygohda boshqacha)') } },
    QA: { docs: [...BASE, 'apostille', 'finance', 'medical'], src: 'https://www.qu.edu.qa', year: 2026,
      dl: { v: 'check', t: T('Обычно весна–лето — уточнить', 'Usually spring–summer — to confirm', 'Odatda bahor–yoz — aniqlashtirish kerak') } },
    SA: { docs: [...BASE, 'apostille', 'finance', 'medical'], src: 'https://www.kaust.edu.sa', year: 2026,
      dl: { v: 'check', t: T('Зависит от вуза — уточнить', 'Depends on the university — to confirm', 'Oliygohga bogʻliq — aniqlashtirish kerak') } },
    AU: { docs: [...BASE, 'essay', 'finance'], src: 'https://www.studyaustralia.gov.au', year: 2026,
      dl: { v: 'check', t: T('Семестр в феврале — подача ноябрь–декабрь; семестр в июле — апрель–май', 'February start — apply November–December; July start — April–May', 'Fevral semestri — noyabr–dekabr; iyul semestri — aprel–may') } },
    NZ: { docs: [...BASE, 'essay', 'finance'], src: 'https://www.studywithnewzealand.govt.nz', year: 2026,
      dl: { v: 'check', t: T('Старт в феврале — подача ноябрь–декабрь', 'February start — apply November–December', 'Fevral boshlanishi — noyabr–dekabr') } },
    RU: { docs: [...BASE, 'apostille', 'medical'], src: 'https://education-in-russia.com', year: 2026,
      exam: { id: 'ru', t: T('Русский язык (ТРКИ B1–B2) и вступительные испытания вуза (математика/профильный предмет, у МФТИ, МГУ, ИТМО — свои экзамены)', 'Russian language (TORFL B1–B2) and the university entrance exams (maths/subject; MIPT, MSU, ITMO have their own)', 'Rus tili (TRKI B1–B2) va oliygohning kirish sinovlari (matematika/profil fan; MFTI, MDU, ITMOʼda oʻz imtihonlari)'), check: true, key: 'russian' },
      dl: { v: 'check', t: T('Квота «Образование в России»: набор 2026/27 был до 15 января 2026; на 2027/28 — подача с сентября 2026, срок уточнить на education-in-russia.com; сами вузы — до конца июля', 'Education in Russia quota: 2026/27 closed 15 January 2026; for 2027/28 applications open from September 2026, check the deadline on education-in-russia.com; universities themselves — until end of July', 'Education in Russia kvotasi: 2026/27 — 2026-yil 15-yanvarda yopilgan; 2027/28 uchun 2026-yil sentabrdan, muddatini education-in-russia.com saytida aniqlang; oliygohlarning oʻzida — iyul oxirigacha') } },
    KZ: { docs: [...BASE, 'apostille', 'medical'], src: 'https://www.gov.kz', year: 2026,
      exam: { id: 'kz', t: T('Вступительное тестирование вуза и русский/казахский язык — уточнить', 'University entrance testing and Russian/Kazakh language — to confirm', 'Oliygoh kirish testi va rus/qozoq tili — aniqlashtirish kerak'), check: true, key: 'russian' },
      dl: { v: 'check', t: T('Обычно июнь–август', 'Usually June–August', 'Odatda iyun–avgust') } },
    UZ: { docs: ['cert', 'passport'], src: 'https://uzbmb.uz', year: 2026,
      dl: { v: 'check', t: T('Государственные вузы: регистрация на тест uzbmb — лето; международные вузы Ташкента — приём до августа', 'State universities: uzbmb test registration in summer; international universities in Tashkent — admission until August', 'Davlat oliygohlari: uzbmb testiga yozilish — yozda; Toshkentdagi xalqaro oliygohlar — avgustgacha qabul') } },
  };

  // ---------- вспомогательное ----------
  const UNIS_ = () => (typeof UNIS !== 'undefined' ? UNIS : []);
  const resolve = x => {
    if (Array.isArray(x)) return x;
    if (typeof x === 'string') return UNIS_().find(u => u[0] === x) || null;
    if (x && typeof x === 'object') return UNIS_().find(u => u[0] === (x.name || x.n) && (!x.cc || u[1] === x.cc)) || null;
    return null;
  };
  const toefl = v => ({ 5.5: 46, 6: 60, 6.5: 79, 7: 94, 7.5: 102, 8: 110 })[v] || null; // примерное соответствие IELTS → TOEFL iBT
  const money = n => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
  const fieldAreasLocal = fid => Object.keys(AREAS).filter(a => AREAS[a].f.includes(fid));
  function fitOf(u, fid) {
    if (!fid) return 'area';
    const F = FIELDS[fid];
    if (F && (F.world.some(([n]) => n === u[0]) || F.uz.includes(u[0]))) return 'direct';
    const ar = u[8].split(' ');
    return fieldAreasLocal(fid).some(a => ar.includes(a)) ? 'area' : 'none';
  }
  const reqOf = u => ({
    ielts: u[2], toefl: u[2] ? toefl(u[2]) : null, sat: u[3], satRequired: u[6].split(' ').includes('sat'),
    gpa: u[4], difficulty: u[5], foundation: u[6].split(' ').includes('f'), studienkolleg: u[6].split(' ').includes('s'),
    russianTaught: u[6].split(' ').includes('ru'), stateExam: u[2] == null,
  });
  const summaryT = u => {
    const r = reqOf(u), ru = [], en = [], uz = [];
    if (r.ielts) { ru.push(`IELTS ${r.ielts}`); en.push(`IELTS ${r.ielts}`); uz.push(`IELTS ${r.ielts}`); }
    else { ru.push('вступительный тест'); en.push('entrance test'); uz.push('kirish testi'); }
    if (r.satRequired && r.sat) { ru.push(`SAT ${r.sat}`); en.push(`SAT ${r.sat}`); uz.push(`SAT ${r.sat}`); }
    if (r.foundation) { ru.push('нужен Foundation'); en.push('Foundation needed'); uz.push('Foundation kerak'); }
    if (r.studienkolleg) { ru.push('нужен Studienkolleg'); en.push('Studienkolleg needed'); uz.push('Studienkolleg kerak'); }
    ru.push(`балл ${r.gpa}/5`); en.push(`GPA ${r.gpa}/5`); uz.push(`ball ${r.gpa}/5`);
    return T(ru.join(' · '), en.join(' · '), uz.join(' · '));
  };
  const uniCard = (u, fid, idx) => ({
    key: u[1] + '|' + u[0], name: u[0], cc: u[1], fit: fitOf(u, fid), profile: fitOf(u, fid) !== 'none',
    tuitionUsd: Math.round(u[7] * 1000), areas: u[8].split(' '), difficulty: u[5], rank: idx, req: reqOf(u), summary: summaryT(u),
  });

  // ---------- 1. страны и топ-3 ----------
  // Список стран, где есть вузы: [{cc, name:{ru,en,uz}, count}] — для выбора клиентом
  function countries() {
    const n = {};
    UNIS_().forEach(u => { n[u[1]] = (n[u[1]] || 0) + 1; });
    return Object.keys(n).map(cc => ({ cc, name: NAMES[cc] || T(cc, cc, cc), count: n[cc] }))
      .sort((a, b) => b.count - a.count || a.cc.localeCompare(b.cc));
  }

  // top3(countryCode, fieldId) → { cc, fieldId, countryName, fieldName, unis:[3], profileCount, total, note }
  // сортировка: профильные (прямо названы в направлении, затем по области) → престиж (сложность, порядок в базе) → цена
  function top3(cc, fieldId) {
    const rows = UNIS_().map((u, i) => [u, i]).filter(([u]) => u[1] === cc);
    const sorted = rows.map(([u, i]) => ({ u, i, fit: fitOf(u, fieldId) })).sort((a, b) => {
      const fr = { direct: 2, area: 1, none: 0 };
      return (fr[b.fit] - fr[a.fit]) || (a.u[5] - b.u[5]) || (a.i - b.i) || (a.u[7] - b.u[7]);
    });
    // профильных меньше трёх: добираем лучшими по престижу (сложность, порядок), помечаем profile:false
    const prof = sorted.filter(x => x.fit !== 'none');
    let pick = prof.slice(0, 3);
    if (pick.length < 3) {
      const rest = sorted.filter(x => x.fit === 'none').sort((a, b) => (a.u[5] - b.u[5]) || (a.i - b.i));
      pick = pick.concat(rest.slice(0, 3 - pick.length));
    }
    const profileCount = Math.min(prof.length, 3);
    const F = fieldId && FIELDS[fieldId];
    return {
      cc, fieldId: fieldId || null, countryName: NAMES[cc] || T(cc, cc, cc), fieldName: F ? F.name : null,
      unis: pick.map(x => uniCard(x.u, fieldId, x.i)), profileCount, total: rows.length,
      note: profileCount < 3 && pick.length ? T(
        'В этой стране мало вузов, сильных именно в этом направлении. Остальные взяты по рейтингу страны — направление у них не профильное.',
        'This country has few universities strong in this exact field. The rest are the best-ranked in the country — the field is not their specialty.',
        'Bu davlatda aynan shu yoʻnalishda kuchli oliygohlar kam. Qolganlari davlat reytingi boʻyicha olingan — yoʻnalish ular uchun profil emas.') : null,
    };
  }

  // ---------- 2. общий шаблон требований ----------
  const maxBy = (arr, f) => arr.reduce((m, x) => (f(x) > f(m) ? x : m), arr[0]);
  // requirementsTemplate(list, opts) — list: массив вузов (названия, {name, cc} или строки UNIS); opts.fieldId — направление теста (для портфолио и т. п.)
  // → { unis, countries, items:[{id, group, title, value, text, unis:[имена], perUni, courseKeys:[], check, src}], deadlines, cost }
  function requirementsTemplate(list, opts = {}) {
    const us = (list || []).map(resolve).filter(Boolean);
    const seen = new Set();
    const U = us.filter(u => !seen.has(u[1] + u[0]) && seen.add(u[1] + u[0]));
    const items = [];
    const names = f => U.filter(f).map(u => u[0]);
    const per = (f, g) => Object.fromEntries(U.filter(f).map(u => [u[0], g(u)]));
    if (!U.length) return { unis: [], countries: [], items, deadlines: [], cost: null };

    // язык: английский
    const en = U.filter(u => u[2]);
    if (en.length) {
      const mx = maxBy(en, u => u[2])[2];
      items.push({ id: 'ielts', group: 'language', value: mx, toefl: toefl(mx), check: true,
        title: T(`Английский: IELTS Academic, ориентир ${mx}`, `English: IELTS Academic, benchmark ${mx}`, `Ingliz tili: IELTS Academic, mezon ${mx}`),
        text: T(`Это ориентир (обычно требуемый или рекомендуемый балл), а не гарантия: точный официальный минимум у каждого вуза свой — уточнить. Берём самый высокий балл из ваших вузов. Вместо IELTS многие вузы принимают TOEFL iBT (примерно ${toefl(mx) || '—'} баллов) или Duolingo — уточнить у вуза.`,
          `This is a benchmark (usually required or recommended score), not a guarantee: each university sets its own official minimum — check it. We take the highest score among your universities. Many accept TOEFL iBT (about ${toefl(mx) || '—'}) or Duolingo instead — check with the university.`,
          `Bu mezon (odatda talab qilinadigan yoki tavsiya etiladigan ball), kafolat emas: rasmiy minimum har bir oliygohda alohida — aniqlang. Oliygohlaringiz ichida eng yuqori ball olinadi. Koʻpchilik IELTS oʻrniga TOEFL iBT (taxminan ${toefl(mx) || '—'}) yoki Duolingo qabul qiladi — oliygohdan aniqlang.`),
        unis: en.map(u => u[0]), perUni: per(u => u[2], u => u[2]), courseKeys: ['ielts', 'toefl'] });
    }
    // экзамены: SAT
    const satReq = U.filter(u => u[6].split(' ').includes('sat') && u[3]);
    if (satReq.length) {
      const mx = maxBy(satReq, u => u[3])[3];
      items.push({ id: 'sat', group: 'exam', value: mx, check: true,
        title: T(`SAT: ориентир ${mx} из 1600 (средний балл поступивших)`, `SAT: benchmark ${mx} out of 1600 (typical admitted score)`, `SAT: mezon ${mx} (1600 dan, qabul qilinganlarning oʻrtacha bali)`),
        text: T('Сдавать SAT нужно, но официального минимального балла у этих вузов нет: цифра — ориентир (средний балл поступивших). Берём самый высокий ориентир из списка; правило этого года — уточнить.', 'SAT is required, but these universities set no official minimum score: the number is a benchmark (typical admitted score). We take the highest in the list; this year’s policy — check.', 'SAT topshirish kerak, ammo bu oliygohlarda rasmiy minimal ball yoʻq: raqam — mezon (qabul qilinganlarning oʻrtacha bali). Roʻyxatdagi eng yuqorisi olinadi; joriy yil qoidasi — aniqlang.'),
        unis: satReq.map(u => u[0]), perUni: per(u => u[6].split(' ').includes('sat') && u[3], u => u[3]), courseKeys: ['sat'] });
    }
    const satOpt = U.filter(u => u[3] && !u[6].split(' ').includes('sat'));
    if (satOpt.length) {
      const mx = maxBy(satOpt, u => u[3])[3];
      items.push({ id: 'sat_optional', group: 'exam', value: mx, check: true,
        title: T(`SAT по желанию: ориентир ${mx}`, `SAT optional: benchmark ${mx}`, `SAT ixtiyoriy: mezon ${mx}`),
        text: T('Эти вузы не требуют SAT обязательно, но сильный балл усиливает заявку. Правило на этот год — уточнить на сайте вуза.', 'These universities do not strictly require SAT, but a strong score helps. This year’s policy — check the university website.', 'Bu oliygohlar SAT ni majburiy talab qilmaydi, ammo yuqori ball arizani kuchaytiradi. Joriy yil qoidasi — oliygoh saytida aniqlang.'),
        unis: satOpt.map(u => u[0]), perUni: per(u => u[3] && !u[6].split(' ').includes('sat'), u => u[3]), courseKeys: ['sat'] });
    }
    // местные экзамены/языки по странам
    const cs = [...new Set(U.map(u => u[1]))];
    cs.forEach(cc => {
      const r = START_RULES[cc];
      let us2 = U.filter(u => u[1] === cc);
      if (r && r.exam) {
        items.push({ id: 'exam_' + r.exam.id, group: 'exam', value: null, check: !!r.exam.check, title: r.exam.t,
          text: T('Нужен для вузов этой страны. ' + (r.exam.check ? 'Точные баллы — уточнить на сайте вуза.' : ''), 'Needed for universities in this country. ' + (r.exam.check ? 'Exact scores — check the university website.' : ''), 'Bu davlat oliygohlari uchun kerak. ' + (r.exam.check ? 'Aniq ballarni oliygoh saytida aniqlang.' : '')),
          unis: us2.map(u => u[0]), perUni: {}, courseKeys: r.exam.key ? [r.exam.key] : [], src: r.src, year: r.year });
      }
      const st = us2.filter(u => u[2] == null);
      if (cc === 'UZ' && st.length) {
        items.push({ id: 'exam_uzbmb', group: 'exam', value: null, check: true,
          title: T('Тест uzbmb (государственный вступительный) по профильным предметам', 'uzbmb state entrance test in the subject exams', 'Profil fanlardan uzbmb davlat kirish testi'),
          text: T('Для государственных вузов Узбекистана. Проходной балл и предметы зависят от направления — уточнить на uzbmb.uz.', 'For Uzbek state universities. Passing score and subjects depend on the programme — check uzbmb.uz.', 'Oʻzbekiston davlat oliygohlari uchun. Oʻtish bali va fanlar yoʻnalishga bogʻliq — uzbmb.uz da aniqlang.'),
          unis: st.map(u => u[0]), perUni: {}, courseKeys: ['uzbmb'], src: 'https://uzbmb.uz', year: 2026 });
      }
    });
    if (opts.fieldId && ['med', 'dent'].includes(opts.fieldId)) {
      const gb = U.filter(u => u[1] === 'GB');
      if (gb.length) items.push({ id: 'exam_ucat', group: 'exam', value: null, check: true,
        title: T('UCAT — тест для медицины и стоматологии в Великобритании', 'UCAT — admissions test for medicine and dentistry in the UK', 'UCAT — Buyuk Britaniyada tibbiyot va stomatologiya uchun test'),
        text: T('Нужен почти всем британским вузам на медицине; запись открывается летом. Уточнить для каждого вуза.', 'Needed by almost all UK medical schools; registration opens in summer. Check each university.', 'Deyarli barcha Britaniya tibbiyot oliygohlari uchun kerak; roʻyxatdan oʻtish yozda ochiladi. Har bir oliygohdan aniqlang.'),
        unis: gb.map(u => u[0]), perUni: {}, courseKeys: ['ucat'], src: 'https://www.ucat.ac.uk', year: 2026 });
    }
    // подготовка: Foundation / Studienkolleg
    const fd = U.filter(u => u[6].split(' ').includes('f'));
    if (fd.length) items.push({ id: 'foundation', group: 'prep', value: null, check: true,
      title: T('Foundation или 1-й курс вуза: после 11 классов обычно не берут сразу на бакалавриат — уточнить у вуза', 'Foundation year (or a first year at a local university): after grade 11 universities usually do not admit straight to a bachelor — check with the university', '11-sinfdan keyin odatda bakalavriatga bevosita qabul qilinmaydi — Foundation yoki mahalliy oliygohda 1-kurs; oliygohdan aniqlang'),
      text: T('Обычно 1 год: академический английский, математика, навыки учёбы. Стоимость и программы — у вуза; в результате вы поступаете на 1-й курс.', 'Usually 1 year: academic English, maths, study skills. Cost and programmes depend on the university; afterwards you enter year 1.', 'Odatda 1 yil: akademik ingliz tili, matematika, oʻqish koʻnikmalari. Narx va dasturlar oliygohga bogʻliq; keyin 1-kursga kirasiz.'),
      unis: fd.map(u => u[0]), perUni: {}, courseKeys: ['foundation'] });
    const sk = U.filter(u => u[6].split(' ').includes('s'));
    if (sk.length) items.push({ id: 'studienkolleg', group: 'prep', value: null, check: true,
      title: T('Studienkolleg (подготовительный год в Германии/Австрии) и немецкий минимум B1', 'Studienkolleg (preparatory year in Germany/Austria) and German at least B1', 'Studienkolleg (Germaniya/Avstriyadagi tayyorlov yili) va nemis tili kamida B1'),
      text: T('Аттестат Узбекистана обычно не даёт прямого доступа; учёба в Studienkolleg заканчивается экзаменом Feststellungsprüfung. Статус своего аттестата проверить в базе anabin.', 'The Uzbek certificate usually does not give direct access; Studienkolleg ends with the Feststellungsprüfung exam. Check your certificate in the anabin database.', 'Oʻzbekiston attestati odatda toʻgʻridan-toʻgʻri kirish huquqini bermaydi; Studienkolleg Feststellungsprüfung imtihoni bilan tugaydi. Attestat holatini anabin bazasida tekshiring.'),
      unis: sk.map(u => u[0]), perUni: {}, courseKeys: ['german'], src: 'https://anabin.kmk.org', year: 2026 });
    // средний балл
    const mxg = maxBy(U, u => u[4]);
    items.push({ id: 'gpa', group: 'grades', value: mxg[4], check: true,
      title: T(`Средний балл аттестата: ориентир ${mxg[4]} из 5`, `School certificate average: benchmark ${mxg[4]} out of 5`, `Attestat oʻrtacha bali: mezon ${mxg[4]} (5 dan)`),
      text: T('Ориентир по самому требовательному вузу из списка; точные пороги у вузов свои.', 'A benchmark from the most selective university on the list; exact thresholds differ.', 'Roʻyxatdagi eng talabchan oliygoh boʻyicha mezon; aniq chegaralar har xil.'),
      unis: U.map(u => u[0]), perUni: per(() => true, u => u[4]), courseKeys: [] });
    // документы — без повторов
    const needDocs = {};
    U.forEach(u => (START_RULES[u[1]] ? START_RULES[u[1]].docs : BASE).forEach(d => { (needDocs[d] = needDocs[d] || []).push(u[0]); }));
    const artsF = opts.fieldId && ['design', 'fineart', 'music', 'film', 'fashion', 'arch'].includes(opts.fieldId);
    if (artsF) needDocs.portfolio = U.map(u => u[0]);
    DOC_ORDER.filter(d => needDocs[d]).forEach(d => {
      items.push({ id: 'doc_' + d, group: 'docs', value: null, check: ['recs', 'medical', 'portfolio'].includes(d), title: DOCS[d].t,
        text: T(d === 'apostille' ? 'Делается заранее: на оформление и перевод уходит несколько недель.' : '', d === 'apostille' ? 'Do it in advance: it takes several weeks with translation.' : '', d === 'apostille' ? 'Oldindan qiling: tarjima bilan bir necha hafta ketadi.' : ''),
        unis: needDocs[d], perUni: {}, courseKeys: d === 'essay' ? ['motivation'] : d === 'portfolio' ? ['portfolio'] : d === 'apostille' ? ['docs'] : [] });
    });
    // сроки по странам
    const deadlines = cs.map(cc => {
      const r = START_RULES[cc];
      return { cc, country: NAMES[cc], text: r ? r.dl.t : T('уточнить', 'to confirm', 'aniqlashtirish kerak'), check: r ? r.dl.v !== 'ok' : true,
        src: r ? r.src : null, year: r ? r.year : null, unis: names(u => u[1] === cc) };
    });
    // стоимость
    const tu = U.map(u => ({ name: u[0], cc: u[1], tuitionUsd: Math.round(u[7] * 1000) }));
    let living = null;
    if (typeof COUNTRIES !== 'undefined') {
      const ls = cs.map(cc => COUNTRIES.find(c => c.cc === cc)).filter(Boolean);
      if (ls.length) living = { min: Math.min(...ls.map(c => c.live[0] * 12)), max: Math.max(...ls.map(c => c.live[1] * 12)) };
    }
    const tmin = Math.min(...tu.map(x => x.tuitionUsd)), tmax = Math.max(...tu.map(x => x.tuitionUsd));
    const cost = { tuitionUsd: { min: tmin, max: tmax }, perUni: tu, livingUsdYear: living, check: true,
      text: T(`Обучение в год: от $${money(tmin)} до $${money(tmax)}${living ? `; жизнь — ещё примерно $${money(living.min)}–${money(living.max)} в год` : ''}. Цены без грантов и скидок.`,
        `Tuition per year: $${money(tmin)} to $${money(tmax)}${living ? `; living costs add about $${money(living.min)}–${money(living.max)} a year` : ''}. Prices before grants and discounts.`,
        `Yillik oʻqish: $${money(tmin)} dan $${money(tmax)} gacha${living ? `; yashash xarajati yana taxminan $${money(living.min)}–${money(living.max)} yiliga` : ''}. Narxlar grant va chegirmalarsiz.`) };
    items.push({ id: 'cost', group: 'cost', value: tmax, check: true, title: T('Примерная стоимость', 'Approximate cost', 'Taxminiy narx'), text: cost.text, unis: U.map(u => u[0]), perUni: Object.fromEntries(tu.map(x => [x.name, x.tuitionUsd])), courseKeys: [] });
    return { unis: tu, countries: cs.map(cc => ({ cc, name: NAMES[cc] })), items, deadlines, cost, fieldId: opts.fieldId || null };
  }

  // ---------- 3. учебные центры и курсы (заглушки, demo:true) ----------
  const CENTERS = [
    { id: 'c1', name: T('Demo Lingua Center (пример)', 'Demo Lingua Center (example)', 'Demo Lingua Center (namuna)'), city: T('Ташкент', 'Tashkent', 'Toshkent'), demo: true },
    { id: 'c2', name: T('Demo SAT & Academic Lab (пример)', 'Demo SAT & Academic Lab (example)', 'Demo SAT & Academic Lab (namuna)'), city: T('Ташкент', 'Tashkent', 'Toshkent'), demo: true },
    { id: 'c3', name: T('Demo Deutsch-Haus (пример)', 'Demo Deutsch-Haus (example)', 'Demo Deutsch-Haus (namuna)'), city: T('Ташкент', 'Tashkent', 'Toshkent'), demo: true },
    { id: 'c4', name: T('Demo Samarkand Study Hub (пример)', 'Demo Samarkand Study Hub (example)', 'Demo Samarkand Study Hub (namuna)'), city: T('Самарканд', 'Samarkand', 'Samarqand'), demo: true },
    { id: 'c5', name: T('Demo Admit Studio (пример)', 'Demo Admit Studio (example)', 'Demo Admit Studio (namuna)'), city: T('Ташкент', 'Tashkent', 'Toshkent'), demo: true },
    { id: 'c6', name: T('Demo Asia & Russian Club (пример)', 'Demo Asia & Russian Club (example)', 'Demo Asia & Russian Club (namuna)'), city: T('Ташкент', 'Tashkent', 'Toshkent'), demo: true },
  ];
  const FORMAT = { offline: T('очно', 'in person', 'oflayn'), online: T('онлайн', 'online', 'onlayn'), hybrid: T('очно + онлайн', 'in person + online', 'oflayn + onlayn') };
  const weeks = w => T(`${w} нед.`, `${w} wks`, `${w} hafta`);
  // key — к какому пункту требований относится курс; target — для IELTS/SAT целевой балл (подбор по значению в шаблоне)
  const course = (id, center, key, title, w, price, format, extra = {}) => ({ id, centerId: center, key, title, weeks: w, duration: weeks(w), priceUzs: price, format, formatLabel: FORMAT[format], demo: true, ...extra });
  const COURSES = [
    course('k01', 'c1', 'ielts', T('IELTS: с 5.0 до 6.5', 'IELTS: from 5.0 to 6.5', 'IELTS: 5.0 dan 6.5 gacha'), 12, 2200000, 'offline', { target: 6.5 }),
    course('k02', 'c1', 'ielts', T('IELTS интенсив: с 6.0 до 7.5', 'IELTS intensive: from 6.0 to 7.5', 'IELTS intensiv: 6.0 dan 7.5 gacha'), 10, 3400000, 'hybrid', { target: 7.5 }),
    course('k03', 'c4', 'ielts', T('IELTS: основы и 6.0', 'IELTS: basics to 6.0', 'IELTS: asoslar va 6.0'), 12, 1800000, 'offline', { target: 6.0 }),
    course('k04', 'c1', 'toefl', T('TOEFL iBT: подготовка к 90+', 'TOEFL iBT: prep for 90+', 'TOEFL iBT: 90+ ga tayyorlov'), 10, 3000000, 'online', { target: 90 }),
    course('k05', 'c2', 'sat', T('SAT: математика + чтение и письмо', 'SAT: maths + reading & writing', 'SAT: matematika + oʻqish va yozish'), 14, 4200000, 'offline', { target: 1400 }),
    course('k06', 'c2', 'sat', T('SAT интенсив на 1500+', 'SAT intensive for 1500+', '1500+ uchun SAT intensiv'), 10, 5200000, 'online', { target: 1600 }),
    course('k07', 'c3', 'german', T('Немецкий A1→B1 (для Studienkolleg)', 'German A1→B1 (for Studienkolleg)', 'Nemis tili A1→B1 (Studienkolleg uchun)'), 24, 3600000, 'offline', { level: 'B1' }),
    course('k08', 'c3', 'german', T('Немецкий B1→C1: TestDaF / DSH', 'German B1→C1: TestDaF / DSH', 'Nemis tili B1→C1: TestDaF / DSH'), 16, 3200000, 'hybrid', { level: 'C1' }),
    course('k09', 'c4', 'german', T('Немецкий с нуля: A1–A2', 'German from scratch: A1–A2', 'Nemis tili noldan: A1–A2'), 16, 2400000, 'offline', { level: 'A2' }),
    course('k10', 'c2', 'foundation', T('Foundation-подготовка: академический английский и математика', 'Foundation prep: academic English and maths', 'Foundation tayyorlov: akademik ingliz tili va matematika'), 12, 4500000, 'hybrid'),
    course('k11', 'c5', 'motivation', T('Мотивационное письмо и эссе: 4 занятия с разбором', 'Motivation letter and essay: 4 sessions with feedback', 'Motivatsion xat va esse: 4 mashgʻulot, tahlil bilan'), 3, 700000, 'online'),
    course('k12', 'c5', 'docs', T('Документы: апостиль, перевод, сроки — сопровождение', 'Documents: apostille, translation, timeline — guidance', 'Hujjatlar: apostil, tarjima, muddatlar — hamrohlik'), 2, 450000, 'online'),
    course('k13', 'c5', 'portfolio', T('Портфолио для творческих направлений', 'Portfolio for creative programmes', 'Ijodiy yoʻnalishlar uchun portfolyo'), 8, 2600000, 'offline'),
    course('k14', 'c6', 'topik', T('Корейский: подготовка к TOPIK 3–4', 'Korean: TOPIK 3–4 prep', 'Koreys tili: TOPIK 3–4 ga tayyorlov'), 20, 3000000, 'offline'),
    course('k15', 'c6', 'hsk', T('Китайский: подготовка к HSK 4', 'Chinese: HSK 4 prep', 'Xitoy tili: HSK 4 ga tayyorlov'), 20, 2800000, 'offline'),
    course('k16', 'c6', 'russian', T('Русский как иностранный: ТРКИ B1–B2', 'Russian as a foreign language: TORFL B1–B2', 'Rus tili chet tili sifatida: TRKI B1–B2'), 16, 2400000, 'hybrid'),
    course('k17', 'c6', 'japanese', T('Японский: от N5 до N3 / подготовка к EJU', 'Japanese: N5 to N3 / EJU prep', 'Yapon tili: N5 dan N3 gacha / EJU ga tayyorlov'), 24, 3300000, 'offline'),
    course('k18', 'c4', 'uzbmb', T('Подготовка к тесту uzbmb (3 предмета)', 'uzbmb test prep (3 subjects)', 'uzbmb testiga tayyorlov (3 fan)'), 16, 2000000, 'offline'),
    course('k19', 'c2', 'ucat', T('UCAT: тренировка для медицины', 'UCAT: medicine admissions practice', 'UCAT: tibbiyotga kirish mashqlari'), 6, 1800000, 'online'),
  ];

  // coursesFor(template) → [{ itemId, itemTitle, courses:[{...course, center}] }]; пункты без курсов не возвращаются
  function coursesFor(tpl) {
    if (!tpl || !tpl.items) return [];
    const out = [];
    const shown = new Set(); // каждый курс показываем один раз — под первым подходящим пунктом
    tpl.items.forEach(it => {
      (it.courseKeys || []).forEach(k => {
        let cs = COURSES.filter(c => c.key === k && !shown.has(c.id));
        if (k === 'ielts' && it.value) {
          const ok = cs.filter(c => c.target >= it.value);
          cs = (ok.length ? ok : cs).sort((a, b) => a.target - b.target);
        } else if (k === 'sat' && it.value) {
          const ok = cs.filter(c => c.target >= it.value);
          cs = (ok.length ? ok : cs).sort((a, b) => a.target - b.target);
        } else if (k === 'german') {
          const need = it.id === 'studienkolleg' ? ['A2', 'B1'] : ['B1', 'C1'];
          cs = cs.slice().sort((a, b) => need.indexOf(b.level) - need.indexOf(a.level));
        }
        if (cs.length && !out.some(o => o.itemId === it.id && o.courseKey === k)) {
          cs.forEach(c => shown.add(c.id));
          out.push({ itemId: it.id, itemTitle: it.title, courseKey: k, courses: cs.map(c => ({ ...c, center: CENTERS.find(x => x.id === c.centerId) })) });
        }
      });
    });
    return out;
  }

  const API = { countries, top3, requirementsTemplate, coursesFor, CENTERS, COURSES, NAMES, DOCS, START_RULES, FORMAT };
  window.START = API;
  window.startCountries = countries;
  window.top3 = top3;
  window.requirementsTemplate = requirementsTemplate;
  window.coursesFor = coursesFor;
})();
