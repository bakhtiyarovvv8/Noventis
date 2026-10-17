// Бесплатные ресурсы (или с бесплатной частью). tags: экзамены и области (ключи AREAS) или 'all' — для всех.
const EXAMS_LIST = {
  ielts: 'IELTS', sat: 'SAT', toefl: 'TOEFL', det: 'Duolingo English Test', topik: 'TOPIK', hsk: 'HSK', jlpt: 'JLPT',
  de: L('Немецкий / TestDaF', 'German / TestDaF'), tr: L('Турецкий', 'Turkish'), uzbmb: L('Тест uzbmb', 'uzbmb test'),
};

const RESOURCES = [
  // для всех
  { n: 'Khan Academy', url: 'https://www.khanacademy.org', tags: ['all', 'sci'], d: L('Математика, физика, химия, биология — с нуля до продвинутого', 'Math, physics, chemistry, biology — from zero to advanced') },
  { n: 'Coursera', url: 'https://www.coursera.org', tags: ['all'], d: L('Курсы лучших вузов; большинство можно смотреть бесплатно (audit)', 'Courses from top universities; most can be audited for free') },
  { n: 'edX', url: 'https://www.edx.org', tags: ['all'], d: L('Курсы MIT, Harvard и других вузов', 'Courses from MIT, Harvard and more') },
  { n: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu', tags: ['all', 'eng', 'sci', 'ict'], d: L('Лекции и задания MIT — полностью бесплатно', 'MIT lectures and assignments — completely free') },
  { n: 'Learning How to Learn', url: 'https://www.coursera.org/learn/learning-how-to-learn', tags: ['all', 'edu'], d: L('Самый популярный курс о том, как эффективно учиться', 'The most popular course on how to learn effectively') },
  { n: 'Anki', url: 'https://apps.ankiweb.net', tags: ['all'], d: L('Карточки с интервальным повторением — для слов и формул', 'Spaced-repetition flashcards for words and formulas') },
  { n: 'TED-Ed', url: 'https://ed.ted.com', tags: ['all', 'edu'], d: L('Короткие анимированные уроки обо всём', 'Short animated lessons on everything') },

  // английский
  { n: 'British Council — LearnEnglish', url: 'https://learnenglish.britishcouncil.org', tags: ['ielts', 'det', 'toefl'], d: L('Грамматика, слова, аудио и видео по уровням', 'Grammar, vocabulary, audio and video by level') },
  { n: 'IELTS — official preparation', url: 'https://ielts.org', tags: ['ielts'], d: L('Официальные примеры заданий и формат экзамена', 'Official sample tasks and exam format') },
  { n: 'Take IELTS — British Council', url: 'https://takeielts.britishcouncil.org', tags: ['ielts'], d: L('Бесплатные пробные тесты и вебинары', 'Free practice tests and webinars') },
  { n: 'IELTS Liz', url: 'https://ieltsliz.com', tags: ['ielts'], d: L('Советы и примеры ответов для всех частей IELTS', 'Tips and model answers for every IELTS section') },
  { n: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish', tags: ['ielts', 'toefl', 'det'], d: L('Подкасты, новости и уроки произношения', 'Podcasts, news and pronunciation lessons') },
  { n: 'Write & Improve (Cambridge)', url: 'https://writeandimprove.com', tags: ['ielts', 'toefl'], d: L('Проверка письменных работ с оценкой уровня', 'Writing checker with level feedback') },
  { n: 'TOEFL — ETS', url: 'https://www.ets.org/toefl', tags: ['toefl'], d: L('Официальный бесплатный пробный тест', 'Official free practice test') },
  { n: 'Duolingo English Test — practice', url: 'https://englishtest.duolingo.com', tags: ['det'], d: L('Бесплатная пробная версия экзамена', 'Free practice version of the test') },
  { n: 'Duolingo', url: 'https://www.duolingo.com', tags: ['all', 'de', 'tr', 'topik', 'hsk', 'jlpt'], d: L('Ежедневная практика языков', 'Daily language practice') },

  // SAT
  { n: 'Khan Academy — Digital SAT', url: 'https://www.khanacademy.org/test-prep/digital-sat', tags: ['sat'], d: L('Официальная бесплатная подготовка к SAT', 'Official free SAT prep') },
  { n: 'College Board — SAT practice (Bluebook)', url: 'https://satsuite.collegeboard.org/practice', tags: ['sat'], d: L('Полные пробные тесты в формате экзамена', 'Full practice tests in the real exam format') },

  // азиатские языки
  { n: 'TOPIK — official', url: 'https://www.topik.go.kr', tags: ['topik'], d: L('Расписание и прошлые варианты TOPIK', 'Dates and past TOPIK papers') },
  { n: 'Talk To Me In Korean', url: 'https://talktomeinkorean.com', tags: ['topik'], d: L('Уроки корейского, много бесплатного', 'Korean lessons, lots of free content') },
  { n: 'Chinese Test (HSK)', url: 'https://www.chinesetest.cn', tags: ['hsk'], d: L('Официальный сайт HSK: даты, образцы', 'Official HSK site: dates and samples') },
  { n: 'JLPT — official', url: 'https://www.jlpt.jp', tags: ['jlpt'], d: L('Образцы заданий всех уровней N5–N1', 'Sample questions for all levels N5–N1') },
  { n: 'NHK — Easy Japanese', url: 'https://www.nhk.or.jp/lesson/en/', tags: ['jlpt'], d: L('Бесплатный курс японского от NHK', 'Free Japanese course from NHK') },

  // немецкий, турецкий
  { n: 'DW — Learn German', url: 'https://learngerman.dw.com', tags: ['de'], d: L('Бесплатный курс немецкого A1–C1', 'Free German course A1–C1') },
  { n: 'Goethe-Institut', url: 'https://www.goethe.de', tags: ['de'], d: L('Пробные экзамены Goethe по уровням', 'Goethe practice exams by level') },
  { n: 'TestDaF', url: 'https://www.testdaf.de', tags: ['de'], d: L('Экзамен немецкого для поступления', 'German exam for university admission') },
  { n: 'Yunus Emre — Türkçe Öğretimi', url: 'https://www.turkceogretimi.com', tags: ['tr'], d: L('Бесплатные онлайн-курсы турецкого', 'Free online Turkish courses') },

  // Узбекистан
  { n: 'uzbmb.uz', url: 'https://uzbmb.uz', tags: ['uzbmb'], d: L('Официальные тесты, проходные баллы, сроки', 'Official tests, cut-off scores, dates') },
  { n: 'my.gov.uz', url: 'https://my.gov.uz', tags: ['uzbmb'], d: L('Регистрация на вступительные тесты', 'Registration for entrance tests') },

  // IT
  { n: 'CS50 (Harvard)', url: 'https://cs50.harvard.edu', tags: ['ict'], d: L('Лучший бесплатный старт в программировании', 'The best free start in programming') },
  { n: 'freeCodeCamp', url: 'https://www.freecodecamp.org', tags: ['ict'], d: L('Веб-разработка с сертификатами', 'Web development with certificates') },
  { n: 'The Odin Project', url: 'https://www.theodinproject.com', tags: ['ict'], d: L('Путь фронтенд/фулстек-разработчика', 'Front-end / full-stack developer path') },
  { n: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', tags: ['ict', 'sci'], d: L('Python, машинное обучение, анализ данных', 'Python, machine learning, data analysis') },
  { n: 'TryHackMe', url: 'https://tryhackme.com', tags: ['ict'], d: L('Кибербезопасность в игровой форме', 'Cybersecurity through hands-on labs') },
  { n: 'Cisco Networking Academy', url: 'https://www.netacad.com', tags: ['ict'], d: L('Сети, Linux, основы кибербезопасности', 'Networking, Linux, cybersecurity basics') },
  { n: 'Unity Learn', url: 'https://learn.unity.com', tags: ['ict', 'arts'], d: L('Разработка игр на Unity', 'Game development with Unity') },

  // инженерия и наука
  { n: 'Arduino Project Hub', url: 'https://projecthub.arduino.cc', tags: ['eng'], d: L('Тысячи проектов электроники с инструкциями', 'Thousands of electronics projects with instructions') },
  { n: 'Autodesk Education', url: 'https://www.autodesk.com/education', tags: ['eng'], d: L('Fusion 360, AutoCAD, Revit бесплатно для учащихся', 'Fusion 360, AutoCAD, Revit free for students') },
  { n: 'NPTEL', url: 'https://nptel.ac.in', tags: ['eng', 'sci'], d: L('Инженерные курсы ведущих вузов Индии', 'Engineering courses from top Indian institutes') },
  { n: 'PhET Simulations', url: 'https://phet.colorado.edu', tags: ['sci'], d: L('Интерактивные симуляции по физике и химии', 'Interactive physics and chemistry simulations') },
  { n: 'Art of Problem Solving', url: 'https://artofproblemsolving.com', tags: ['sci'], d: L('Олимпиадная математика и форум', 'Olympiad math and community') },
  { n: '3Blue1Brown', url: 'https://www.3blue1brown.com', tags: ['sci', 'ict'], d: L('Математика наглядно: линейная алгебра, нейросети', 'Visual math: linear algebra, neural networks') },

  // медицина и природа
  { n: 'Khan Academy — Health & Medicine', url: 'https://www.khanacademy.org/science/health-and-medicine', tags: ['health'], d: L('Анатомия и физиология для будущих медиков', 'Anatomy and physiology for future medics') },
  { n: 'TeachMeAnatomy', url: 'https://teachmeanatomy.info', tags: ['health'], d: L('Анатомия с иллюстрациями', 'Illustrated anatomy') },
  { n: 'Geeky Medics', url: 'https://geekymedics.com', tags: ['health'], d: L('Клинические навыки и чек-листы', 'Clinical skills and checklists') },
  { n: 'FAO eLearning Academy', url: 'https://elearning.fao.org', tags: ['agro'], d: L('Курсы ООН по сельскому хозяйству и питанию', 'UN courses on agriculture and food') },
  { n: 'SDG Academy', url: 'https://sdgacademy.org', tags: ['agro', 'soc'], d: L('Курсы об устойчивом развитии и экологии', 'Courses on sustainable development and ecology') },

  // бизнес и общество
  { n: 'Grow with Google', url: 'https://grow.google', tags: ['biz'], d: L('Цифровой маркетинг и навыки для работы', 'Digital marketing and career skills') },
  { n: 'HubSpot Academy', url: 'https://academy.hubspot.com', tags: ['biz'], d: L('Маркетинг и продажи с сертификатами', 'Marketing and sales with certificates') },
  { n: 'Investopedia', url: 'https://www.investopedia.com', tags: ['biz'], d: L('Финансы и инвестиции простыми словами', 'Finance and investing explained simply') },
  { n: 'Corporate Finance Institute — free courses', url: 'https://corporatefinanceinstitute.com', tags: ['biz'], d: L('Excel, бухучёт, финансовое моделирование', 'Excel, accounting, financial modelling') },
  { n: 'UNITAR', url: 'https://www.unitar.org', tags: ['soc'], d: L('Учебные программы ООН по дипломатии и праву', 'UN training on diplomacy and law') },

  // искусство
  { n: 'Blender — tutorials', url: 'https://www.blender.org/support/tutorials', tags: ['arts'], d: L('3D и анимация в бесплатной программе', '3D and animation in free software') },
  { n: 'Figma — Learn', url: 'https://help.figma.com', tags: ['arts'], d: L('UI/UX-дизайн в Figma', 'UI/UX design in Figma') },
  { n: 'Krita', url: 'https://krita.org', tags: ['arts'], d: L('Бесплатная программа для цифровой живописи', 'Free digital painting software') },
  { n: 'DaVinci Resolve — training', url: 'https://www.blackmagicdesign.com/products/davinciresolve/training', tags: ['arts'], d: L('Монтаж и цветокоррекция, бесплатные книги', 'Editing and colour grading, free books') },
  { n: 'musictheory.net', url: 'https://www.musictheory.net', tags: ['arts'], d: L('Теория музыки и тренировка слуха', 'Music theory and ear training') },
  { n: 'Behance', url: 'https://www.behance.net', tags: ['arts'], d: L('Площадка для портфолио и вдохновения', 'Portfolio platform and inspiration') },

  // сервис, туризм и спорт
  { n: 'Science of Exercise (CU Boulder)', url: 'https://www.coursera.org/learn/science-exercise', tags: ['serv', 'health'], d: L('Как тело реагирует на тренировки — основа для тренера', 'How the body responds to training — a base for coaches') },
  { n: 'Sports and Society (Duke)', url: 'https://www.coursera.org/learn/sports-society', tags: ['serv'], d: L('Спортивная индустрия, менеджмент и общество', 'The sports industry, management and society') },
  { n: 'Sustainable Tourism (University of Copenhagen)', url: 'https://www.coursera.org/learn/sustainable-tourism', tags: ['serv'], d: L('Устойчивый туризм и гостеприимство', 'Sustainable tourism and hospitality') },

  // гуманитарные
  { n: 'Open Yale Courses', url: 'https://oyc.yale.edu', tags: ['hum', 'soc'], d: L('Лекции Йеля по истории, философии, психологии', 'Yale lectures in history, philosophy, psychology') },
  { n: 'Stanford Encyclopedia of Philosophy', url: 'https://plato.stanford.edu', tags: ['hum'], d: L('Главная энциклопедия философии', 'The leading philosophy encyclopedia') },
  { n: 'World History Encyclopedia', url: 'https://www.worldhistory.org', tags: ['hum'], d: L('История цивилизаций с картами', 'History of civilisations with maps') },
  { n: 'Project Gutenberg', url: 'https://www.gutenberg.org', tags: ['hum'], d: L('70 000+ бесплатных книг', '70,000+ free books') },
];

// область направления — первая область, где оно встречается
const areaOf = fid => Object.keys(AREAS).find(a => AREAS[a].f.includes(fid));
