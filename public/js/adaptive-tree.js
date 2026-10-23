// Адаптивный тест Noventis: готовое дерево вопросов (без живого ИИ) + чистые функции выбора следующего вопроса и итога.
// Без DOM. Подключать после data.js (нужен FIELDS для названий направлений в финальном вопросе).
// Ключи весов — только id из FIELDS (data.js). Проверка дерева: node scripts/check-tree.js
// Формат и как подключить — в комментарии в конце файла.
(function (root) {
  'use strict';
  const T = (ru, en, uz) => ({ ru, en, uz });
  const O = (v, t, w, next) => (next ? { v, t, w, next } : { v, t, w });

  // ---------- 1. Широкие вопросы (для всех) ----------
  const NODES = {
    start: { q: T('Что тебе интереснее всего?', 'What interests you most?', 'Sizni eng koʻp nima qiziqtiradi?'),
      hint: T('Выбери один вариант — следующие вопросы подстроятся под ответ', 'Pick one — the next questions will adapt to your answer', 'Bittasini tanlang — keyingi savollar javobingizga moslashadi'),
      options: [
        O('people', T('Люди: помогать, учить, понимать их', 'People: helping, teaching, understanding them', 'Odamlar: yordam berish, oʻrgatish, ularni tushunish'), { psy: 2, edu: 2, med: 1, soc: 1, nurse: 1, sport: 1, tourism: 1 }, 'b_people'),
        O('tech', T('Техника: компьютеры, машины, гаджеты', 'Tech: computers, machines, gadgets', 'Texnika: kompyuterlar, mashinalar, gadjetlar'), { it: 2, eng: 2, elec: 1, cyber: 1, gamedev: 1, aero: 1 }, 'b_tech'),
        O('nature', T('Природа: животные, растения, планета, тело человека', 'Nature: animals, plants, the planet, the human body', 'Tabiat: hayvonlar, oʻsimliklar, sayyora, inson tanasi'), { bio: 2, eco: 2, agro: 1, vet: 1, med: 1 }, 'b_nature'),
        O('art', T('Творчество: рисунок, видео, музыка, стиль', 'Creativity: drawing, video, music, style', 'Ijod: rasm, video, musiqa, uslub'), { design: 2, fineart: 1, music: 1, film: 1, fashion: 1, arch: 1 }, 'b_art'),
        O('business', T('Бизнес: идеи, деньги, продажи, переговоры', 'Business: ideas, money, sales, negotiations', 'Biznes: gʻoyalar, pul, savdo, muzokaralar'), { biz: 2, marketing: 2, fin: 1, law: 1, logist: 1 }, 'b_biz'),
        O('numbers', T('Числа и логика: задачи, формулы, закономерности', 'Numbers and logic: problems, formulas, patterns', 'Raqamlar va mantiq: masalalar, formulalar, qonuniyatlar'), { math: 2, data: 2, phys: 1, fin: 1, acc: 1 }, 'b_num'),
        O('words', T('Слова и общество: языки, история, новости, политика', 'Words and society: languages, history, news, politics', 'Soʻz va jamiyat: tillar, tarix, yangiliklar, siyosat'), { ling: 2, ir: 2, hist: 1, media: 1, philo: 1, soc: 1 }, 'b_words'),
      ] },

    // 2-й вопрос зависит от первого ответа
    b_people: { q: T('Что тебе хочется делать для людей?', 'What would you like to do for people?', 'Odamlar uchun nima qilishni xohlaysiz?'), next: 'q_subject', options: [
      O('heal', T('Лечить и беречь здоровье', 'Treat them and protect their health', 'Davolash va sogʻligʻini asrash'), { med: 3, nurse: 2, dent: 2, pharm: 1 }),
      O('mind', T('Поддерживать в трудный момент, понимать чувства', 'Support them in hard times, understand feelings', 'Qiyin paytda qoʻllab-quvvatlash, his-tuygʻularni tushunish'), { psy: 3, edu: 1, soc: 1 }),
      O('teach', T('Учить и объяснять сложное просто', 'Teach and explain hard things simply', 'Oʻrgatish va murakkabni oddiy tushuntirish'), { edu: 3, ling: 1, psy: 1 }),
      O('protect', T('Защищать права и решать споры', 'Defend rights and settle disputes', 'Huquqlarni himoya qilish va nizolarni hal qilish'), { law: 3, pubadm: 1, soc: 1 }),
      O('move', T('Тренировать и заряжать энергией', 'Coach them and give them energy', 'Mashq qildirish va gʻayrat berish'), { sport: 3, edu: 1 }),
      O('host', T('Принимать гостей и показывать им страну', 'Host guests and show them the country', 'Mehmonlarni kutib olish va ularga mamlakatni koʻrsatish'), { tourism: 3, ling: 1, marketing: 1 }),
    ] },
    b_tech: { q: T('Что в технике тянет тебя сильнее?', 'What in tech pulls you in most?', 'Texnikada sizni eng koʻp nima tortadi?'), next: 'q_subject', options: [
      O('code', T('Писать программы, сайты, приложения', 'Writing programs, websites, apps', 'Dastur, sayt va ilovalar yozish'), { it: 3, gamedev: 1, data: 1 }),
      O('ai', T('Искусственный интеллект и данные', 'Artificial intelligence and data', 'Sunʼiy intellekt va maʼlumotlar'), { data: 3, it: 1, math: 1 }),
      O('secure', T('Защита от хакеров', 'Protection from hackers', 'Xakerlardan himoya'), { cyber: 3, it: 1 }),
      O('games', T('Видеоигры: как их делают', 'Video games: how they’re made', 'Video oʻyinlar: ular qanday yaratiladi'), { gamedev: 3, it: 1, design: 1 }),
      O('machines', T('Роботы, машины, механизмы', 'Robots, cars, machines', 'Robotlar, mashinalar, mexanizmlar'), { eng: 3, elec: 1, aero: 1 }),
      O('power', T('Электроника и энергия', 'Electronics and energy', 'Elektronika va energiya'), { elec: 3, energy: 2 }),
      O('sky', T('Самолёты и космос', 'Planes and space', 'Samolyotlar va koinot'), { aero: 3, phys: 1 }),
      O('build', T('Здания, мосты, города', 'Buildings, bridges, cities', 'Binolar, koʻpriklar, shaharlar'), { arch: 3, eng: 1 }),
    ] },
    b_nature: { q: T('Что в природе тебе интереснее?', 'What in nature interests you more?', 'Tabiatda sizga nima koʻproq qiziq?'), next: 'q_subject', options: [
      O('animals', T('Животные', 'Animals', 'Hayvonlar'), { vet: 3, bio: 1, agro: 1 }),
      O('plants', T('Растения, сады, фермы', 'Plants, orchards, farms', 'Oʻsimliklar, bogʻlar, fermalar'), { agro: 3, eco: 1, food: 1 }),
      O('planet', T('Климат, вода, горы, чистый воздух', 'Climate, water, mountains, clean air', 'Iqlim, suv, togʻlar, toza havo'), { eco: 3, energy: 1, petro: 1 }),
      O('body', T('Как устроено тело и как его лечить', 'How the body works and how to heal it', 'Tana qanday tuzilgan va uni qanday davolash'), { med: 3, pharm: 1, nurse: 1, dent: 1 }),
      O('lab', T('Опыты: клетки, молекулы, вещества', 'Experiments: cells, molecules, substances', 'Tajribalar: hujayralar, molekulalar, moddalar'), { bio: 3, pharm: 2, food: 1 }),
      O('food', T('Еда: как её делают и хранят', 'Food: how it’s made and stored', 'Oziq-ovqat: qanday tayyorlanadi va saqlanadi'), { food: 3, agro: 1, bio: 1 }),
      O('earth', T('Недра: нефть, газ, золото', 'Underground: oil, gas, gold', 'Yer osti boyliklari: neft, gaz, oltin'), { petro: 3, eco: 1 }),
    ] },
    b_art: { q: T('Какое творчество тебе ближе?', 'Which kind of creativity is closest to you?', 'Qaysi ijod sizga yaqinroq?'), next: 'q_subject', options: [
      O('draw', T('Рисовать картины', 'Painting and drawing', 'Rasm chizish'), { fineart: 3, design: 1 }),
      O('design', T('Дизайн: логотипы, сайты, приложения', 'Design: logos, websites, apps', 'Dizayn: logotiplar, saytlar, ilovalar'), { design: 3, it: 1, marketing: 1 }),
      O('film', T('Снимать видео и мультфильмы', 'Making videos and cartoons', 'Video va multfilmlar suratga olish'), { film: 3, media: 1 }),
      O('music', T('Музыка, сцена, театр', 'Music, stage, theatre', 'Musiqa, sahna, teatr'), { music: 3, film: 1 }),
      O('fashion', T('Одежда и стиль', 'Clothes and style', 'Kiyim va uslub'), { fashion: 3, design: 1 }),
      O('space', T('Дома и интерьеры', 'Houses and interiors', 'Uylar va interyerlar'), { arch: 3, design: 1 }),
      O('games', T('Миры и персонажи для игр', 'Worlds and characters for games', 'Oʻyinlar uchun olamlar va qahramonlar'), { gamedev: 3, design: 1, film: 1 }),
    ] },
    b_biz: { q: T('Что в бизнесе тебе интереснее?', 'What in business interests you more?', 'Biznesda sizga nima koʻproq qiziq?'), next: 'q_subject', options: [
      O('own', T('Открыть своё дело', 'Starting my own business', 'Oʻz ishimni ochish'), { biz: 3, marketing: 1 }),
      O('money', T('Как растут деньги: банки, инвестиции', 'How money grows: banks, investments', 'Pul qanday koʻpayadi: banklar, investitsiyalar'), { fin: 3, acc: 1 }),
      O('ads', T('Реклама, бренды, соцсети', 'Ads, brands, social media', 'Reklama, brendlar, ijtimoiy tarmoqlar'), { marketing: 3, media: 1, design: 1 }),
      O('law', T('Договоры и законы', 'Contracts and laws', 'Shartnomalar va qonunlar'), { law: 3, biz: 1 }),
      O('trade', T('Доставка и торговля между странами', 'Delivery and trade between countries', 'Yetkazib berish va davlatlararo savdo'), { logist: 3, biz: 1, ir: 1 }),
      O('order', T('Порядок в цифрах компании', 'Keeping a company’s numbers in order', 'Kompaniya raqamlarida tartib'), { acc: 3, fin: 1 }),
      O('travel', T('Туристический бизнес и отели', 'Travel business and hotels', 'Turizm biznesi va mehmonxonalar'), { tourism: 3, biz: 1 }),
    ] },
    b_num: { q: T('Что тебе нравится делать с числами?', 'What do you like doing with numbers?', 'Raqamlar bilan nima qilish sizga yoqadi?'), next: 'q_subject', options: [
      O('pure', T('Решать трудные задачи и доказывать', 'Solving hard problems and proving things', 'Qiyin masalalarni yechish va isbotlash'), { math: 3, phys: 1 }),
      O('data', T('Искать закономерности в больших данных', 'Finding patterns in big data', 'Katta maʼlumotlarda qonuniyat izlash'), { data: 3, math: 1 }),
      O('money', T('Считать деньги и прибыль', 'Counting money and profit', 'Pul va foydani hisoblash'), { fin: 2, acc: 2 }),
      O('physics', T('Понимать законы физики и космоса', 'Understanding the laws of physics and space', 'Fizika va koinot qonunlarini tushunish'), { phys: 3, aero: 1 }),
      O('calc', T('Рассчитывать машины и конструкции', 'Calculating machines and structures', 'Mashina va konstruksiyalarni hisoblash'), { eng: 3, arch: 1, elec: 1 }),
      O('code', T('Придумывать алгоритмы и программы', 'Designing algorithms and programs', 'Algoritm va dasturlar oʻylab topish'), { it: 3, cyber: 1 }),
    ] },
    b_words: { q: T('Что из этого тебе интереснее?', 'Which of these interests you more?', 'Bulardan qaysi biri sizga qiziqroq?'), next: 'q_subject', options: [
      O('langs', T('Учить языки и переводить', 'Learning languages and translating', 'Til oʻrganish va tarjima qilish'), { ling: 3, ir: 1, tourism: 1 }),
      O('history', T('История и древние города', 'History and ancient cities', 'Tarix va qadimiy shaharlar'), { hist: 3, philo: 1 }),
      O('news', T('Писать, снимать, вести блог', 'Writing, filming, running a blog', 'Yozish, suratga olish, blog yuritish'), { media: 3, marketing: 1 }),
      O('world', T('Политика и отношения между странами', 'Politics and relations between countries', 'Siyosat va davlatlararo munosabatlar'), { ir: 3, pubadm: 1, soc: 1 }),
      O('ideas', T('Большие вопросы: что правильно, что справедливо', 'Big questions: what is right, what is fair', 'Katta savollar: nima toʻgʻri, nima adolatli'), { philo: 3, hist: 1, law: 1 }),
      O('society', T('Почему люди и общество ведут себя именно так', 'Why people and society behave the way they do', 'Odamlar va jamiyat nega aynan shunday harakat qiladi'), { soc: 3, psy: 2 }),
      O('teach', T('Объяснять другим и учить', 'Explaining things and teaching others', 'Boshqalarga tushuntirish va oʻrgatish'), { edu: 3, ling: 1 }),
    ] },

    // Значения v совпадают с p_subjects из data.js — подходят для summary.subjects
    q_subject: { q: T('Какой школьный предмет тебе ближе всего?', 'Which school subject do you like most?', 'Qaysi maktab fani sizga eng yaqin?'), next: 'q_place', options: [
      O('math', T('Математика', 'Math', 'Matematika'), { math: 2, it: 1, data: 1, fin: 1, eng: 1, acc: 1 }),
      O('phys', T('Физика', 'Physics', 'Fizika'), { phys: 2, eng: 1, elec: 1, energy: 1, aero: 1 }),
      O('chem', T('Химия', 'Chemistry', 'Kimyo'), { pharm: 2, bio: 1, food: 1, petro: 1, med: 1 }),
      O('bio', T('Биология', 'Biology', 'Biologiya'), { med: 2, bio: 1, vet: 1, agro: 1, eco: 1, dent: 1, nurse: 1 }),
      O('cs', T('Информатика', 'Computer science', 'Informatika'), { it: 2, data: 1, cyber: 1, gamedev: 1 }),
      O('hist', T('История', 'History', 'Tarix'), { hist: 2, law: 1, ir: 1, philo: 1, pubadm: 1 }),
      O('lit', T('Литература', 'Literature', 'Adabiyot'), { media: 2, ling: 1, philo: 1, edu: 1 }),
      O('lang', T('Иностранные языки', 'Foreign languages', 'Chet tillari'), { ling: 2, ir: 1, tourism: 1 }),
      O('geo', T('География', 'Geography', 'Geografiya'), { eco: 2, tourism: 1, logist: 1, petro: 1 }),
      O('econ', T('Экономика / обществознание', 'Economics / social studies', 'Iqtisodiyot / jamiyatshunoslik'), { fin: 1, biz: 1, acc: 1, soc: 1, law: 1, marketing: 1 }),
      O('art', T('Рисование / черчение', 'Art / technical drawing', 'Rasm / chizmachilik'), { fineart: 2, design: 1, arch: 1, fashion: 1 }),
      O('music', T('Музыка', 'Music', 'Musiqa'), { music: 2, film: 1 }),
      O('pe', T('Физкультура', 'PE / sports', 'Jismoniy tarbiya'), { sport: 2, nurse: 1 }),
    ] },
    q_place: { q: T('Где тебе было бы приятно работать каждый день?', 'Where would you enjoy working every day?', 'Har kuni qayerda ishlash sizga yoqardi?'), next: '@lead', options: [
      O('pc', T('За компьютером', 'At a computer', 'Kompyuter oldida'), { it: 2, data: 2, cyber: 2, gamedev: 1, acc: 1 }),
      O('lab', T('В лаборатории или клинике', 'In a lab or clinic', 'Laboratoriya yoki klinikada'), { med: 2, bio: 2, pharm: 2, dent: 2, nurse: 1 }),
      O('office', T('В офисе: встречи и переговоры', 'In an office: meetings and negotiations', 'Ofisda: uchrashuvlar va muzokaralar'), { biz: 2, law: 2, fin: 1, marketing: 1, pubadm: 1, ir: 1 }),
      O('studio', T('В студии или мастерской', 'In a studio or workshop', 'Studiya yoki ustaxonada'), { design: 2, fineart: 2, music: 2, film: 2, fashion: 2 }),
      O('site', T('На стройке или заводе', 'On a construction site or at a factory', 'Qurilish maydonida yoki zavodda'), { eng: 2, energy: 2, petro: 2, elec: 1, aero: 1, arch: 1, food: 1 }),
      O('people', T('Среди людей: класс, центр, кабинет', 'Among people: a classroom, a centre, a consulting room', 'Odamlar orasida: sinfxona, markaz, maslahat xonasi'), { edu: 2, psy: 2, nurse: 1, soc: 1 }),
      O('outdoor', T('На природе', 'Outdoors', 'Tabiat qoʻynida'), { agro: 2, eco: 2, vet: 1, sport: 1 }),
      O('move', T('В разъездах и поездках', 'On the move, travelling', 'Safarlarda, yoʻlda'), { tourism: 2, logist: 1, ir: 1, media: 1, sport: 1 }),
      O('library', T('В тишине: книги и мысли', 'Somewhere quiet: books and thoughts', 'Sokin joyda: kitoblar va fikrlar'), { hist: 2, philo: 2, math: 1, ling: 1 }),
    ] },

    // ---------- 2. Ветки внутри лидирующей группы (по 5 вопросов) ----------
    // IT
    it1: { q: T('Чем приятнее заняться в выходные?', 'What would you rather do on a weekend?', 'Dam olish kunida nima bilan shugʻullanish yoqimliroq?'), options: [
      O('app', T('Сделать своё приложение или сайт', 'Make my own app or website', 'Oʻz ilovam yoki saytimni yaratish'), { it: 3 }),
      O('stats', T('Разобрать статистику футбола или игры', 'Dig into football or game stats', 'Futbol yoki oʻyin statistikasini tahlil qilish'), { data: 3 }),
      O('bug', T('Найти уязвимость на сайте', 'Find a vulnerability on a website', 'Saytdagi zaiflikni topish'), { cyber: 3 }),
      O('level', T('Собрать уровень для игры', 'Build a level for a game', 'Oʻyin uchun bosqich yaratish'), { gamedev: 3 }),
      O('net', T('Настроить сеть и умный дом', 'Set up a network and a smart home', 'Tarmoq va aqlli uyni sozlash'), { cyber: 1, it: 1, elec: 1 }),
    ] },
    it2: { q: T('Какой результат обрадует тебя больше?', 'Which result would make you happier?', 'Qaysi natija sizni koʻproq xursand qiladi?'), options: [
      O('users', T('Моим приложением пользуются тысячи людей', 'Thousands of people use my app', 'Ilovamdan minglab odamlar foydalanadi'), { it: 3 }),
      O('model', T('Моя модель угадала, что будет завтра', 'My model predicted what happens tomorrow', 'Modelim ertaga nima boʻlishini toʻgʻri topdi'), { data: 3 }),
      O('safe', T('Никто не смог взломать мою систему', 'No one could hack my system', 'Hech kim tizimimni buza olmadi'), { cyber: 3 }),
      O('play', T('Друзья не могут оторваться от моей игры', 'My friends can’t stop playing my game', 'Doʻstlarim oʻyinimdan ajrala olmayapti'), { gamedev: 3 }),
    ] },
    it3: { q: T('Как ты относишься к математике?', 'How do you feel about math?', 'Matematikaga munosabatingiz qanday?'), options: [
      O('love', T('Люблю: формулы и графики — это интересно', 'I love it: formulas and graphs are fun', 'Yaxshi koʻraman: formulalar va grafiklar qiziq'), { data: 3, math: 1, it: 1 }),
      O('tool', T('Нормально, если она помогает что-то сделать', 'It’s fine if it helps me build something', 'Biror narsa yaratishga yordam bersa, yaxshi'), { it: 2, gamedev: 1 }),
      O('logic', T('Больше люблю логические загадки', 'I prefer logic puzzles', 'Mantiqiy topishmoqlarni koʻproq yoqtiraman'), { cyber: 2, it: 1 }),
      O('story', T('Мне ближе картинка и история', 'I’m more into visuals and stories', 'Menga rasm va hikoya yaqinroq'), { gamedev: 2, design: 1 }),
    ] },
    it4: { q: T('Какая роль в команде твоя?', 'What’s your role in a team?', 'Jamoada sizning rolingiz qanday?'), options: [
      O('builder', T('Строю систему, чтобы всё работало', 'I build the system so everything works', 'Hammasi ishlashi uchun tizim quraman'), { it: 3 }),
      O('analyst', T('Копаюсь в цифрах и нахожу ответ', 'I dig into numbers and find the answer', 'Raqamlarni tahlil qilib, javob topaman'), { data: 3 }),
      O('guard', T('Проверяю, где слабое место', 'I check where the weak spot is', 'Zaif joy qayerdaligini tekshiraman'), { cyber: 3 }),
      O('creator', T('Придумываю миры и идеи', 'I invent worlds and ideas', 'Olamlar va gʻoyalar oʻylab topaman'), { gamedev: 3 }),
      O('lead', T('Организую всех и слежу за сроками', 'I organise everyone and keep deadlines', 'Hammani tashkil qilib, muddatlarni kuzataman'), { it: 1, biz: 2 }),
    ] },
    it5: { q: T('Что хочется понять глубже?', 'What would you like to understand better?', 'Nimani chuqurroq tushunishni xohlaysiz?'), options: [
      O('gpt', T('Как работает ChatGPT', 'How ChatGPT works', 'ChatGPT qanday ishlaydi'), { data: 3 }),
      O('apps', T('Как устроены сайты и приложения', 'How websites and apps are built', 'Saytlar va ilovalar qanday tuzilgan'), { it: 3 }),
      O('hackers', T('Как думают хакеры', 'How hackers think', 'Xakerlar qanday fikrlaydi'), { cyber: 3 }),
      O('graphics', T('Как сделаны графика и физика в играх', 'How game graphics and physics are made', 'Oʻyinlardagi grafika va fizika qanday yaratilgan'), { gamedev: 3 }),
      O('chip', T('Как работает процессор', 'How a processor works', 'Protsessor qanday ishlaydi'), { elec: 2, eng: 1 }),
    ] },

    // Инженерия
    e1: { q: T('Что тебе хотелось бы создать?', 'What would you like to create?', 'Nimani yaratishni xohlardingiz?'), options: [
      O('robot', T('Робота или электромобиль', 'A robot or an electric car', 'Robot yoki elektromobil'), { eng: 3 }),
      O('gadget', T('Новый гаджет или чип', 'A new gadget or chip', 'Yangi gadjet yoki chip'), { elec: 3 }),
      O('solar', T('Солнечную или ветровую станцию', 'A solar or wind power plant', 'Quyosh yoki shamol stansiyasi'), { energy: 3 }),
      O('rocket', T('Самолёт или ракету', 'A plane or a rocket', 'Samolyot yoki raketa'), { aero: 3 }),
      O('house', T('Здание или мост', 'A building or a bridge', 'Bino yoki koʻprik'), { arch: 3 }),
      O('product', T('Новый продукт питания', 'A new food product', 'Yangi oziq-ovqat mahsuloti'), { food: 3 }),
      O('mine', T('Шахту или месторождение', 'A mine or an oil field', 'Shaxta yoki kon'), { petro: 3 }),
    ] },
    e2: { q: T('Где тебе интереснее работать?', 'Where would you rather work?', 'Qayerda ishlash sizga qiziqroq?'), options: [
      O('cad', T('В конструкторском бюро: чертежи и 3D', 'In a design office: drawings and 3D', 'Konstruktorlik byurosida: chizmalar va 3D'), { eng: 3, aero: 1 }),
      O('lab', T('В лаборатории с платами и приборами', 'In a lab with circuit boards and devices', 'Platalar va asboblar bor laboratoriyada'), { elec: 3 }),
      O('plant', T('На электростанции', 'At a power plant', 'Elektr stansiyasida'), { energy: 3 }),
      O('field', T('На месторождении, в экспедициях', 'At an oil field, on expeditions', 'Konda, ekspeditsiyalarda'), { petro: 3 }),
      O('airport', T('В аэропорту или на авиазаводе', 'At an airport or aircraft factory', 'Aeroportda yoki aviazavodda'), { aero: 3 }),
      O('factory', T('На пищевом заводе', 'At a food factory', 'Oziq-ovqat zavodida'), { food: 3 }),
      O('bureau', T('В архитектурном бюро и на стройке', 'At an architecture firm and on site', 'Arxitektura byurosida va qurilishda'), { arch: 3 }),
    ] },
    e3: { q: T('Что для тебя важнее всего в работе?', 'What matters most to you in your work?', 'Ishda siz uchun eng muhimi nima?'), options: [
      O('beauty', T('Чтобы результат красиво выглядел', 'That the result looks beautiful', 'Natija chiroyli koʻrinishi'), { arch: 3, design: 1 }),
      O('precise', T('Чтобы всё работало точно, как часы', 'That everything works like clockwork', 'Hammasi soatdek aniq ishlashi'), { eng: 2, elec: 2 }),
      O('green', T('Чтобы планета стала чище', 'That the planet gets cleaner', 'Sayyora tozaroq boʻlishi'), { energy: 3, eco: 1 }),
      O('salary', T('Высокая зарплата, даже если работать вахтой', 'A high salary, even with rotation shifts', 'Yuqori maosh, hatto vaxta usulida boʻlsa ham'), { petro: 3 }),
      O('speed', T('Скорость, высота, полёт', 'Speed, altitude, flight', 'Tezlik, balandlik, parvoz'), { aero: 3 }),
      O('tasty', T('Чтобы люди ели вкусно и безопасно', 'That people eat tasty and safe food', 'Odamlar mazali va xavfsiz ovqatlanishi'), { food: 3 }),
    ] },
    e4: { q: T('Что тебе даётся легче?', 'What comes easier to you?', 'Sizga nima osonroq?'), options: [
      O('mech', T('Механика: силы, движение, детали', 'Mechanics: forces, motion, parts', 'Mexanika: kuchlar, harakat, detallar'), { eng: 2, aero: 2 }),
      O('elec', T('Электричество и схемы', 'Electricity and circuits', 'Elektr va sxemalar'), { elec: 3, energy: 1 }),
      O('chem', T('Химия', 'Chemistry', 'Kimyo'), { food: 2, petro: 2 }),
      O('geom', T('Черчение и геометрия', 'Technical drawing and geometry', 'Chizmachilik va geometriya'), { arch: 3 }),
      O('earth', T('География и устройство Земли', 'Geography and how the Earth works', 'Geografiya va Yer tuzilishi'), { petro: 2, energy: 1 }),
    ] },
    e5: { q: T('Какая новость обрадовала бы тебя больше?', 'Which news would make you happiest?', 'Qaysi yangilik sizni koʻproq xursand qilardi?'), options: [
      O('robot', T('Робот из Узбекистана выиграл мировой конкурс', 'A robot from Uzbekistan won a world contest', 'Oʻzbekistonlik robot jahon tanlovida gʻolib boʻldi'), { eng: 3 }),
      O('chip', T('Вышел телефон с новым быстрым чипом', 'A phone with a new fast chip came out', 'Yangi tezkor chipli telefon chiqdi'), { elec: 3 }),
      O('solar', T('Открылась крупнейшая солнечная станция страны', 'The country’s biggest solar plant opened', 'Mamlakatdagi eng katta quyosh stansiyasi ochildi'), { energy: 3 }),
      O('gas', T('Найдено новое месторождение газа', 'A new gas field was discovered', 'Yangi gaz koni topildi'), { petro: 3 }),
      O('sat', T('Запущен новый спутник Узбекистана', 'A new Uzbek satellite was launched', 'Oʻzbekistonning yangi sunʼiy yoʻldoshi uchirildi'), { aero: 3 }),
      O('city', T('Построили новый современный район', 'A new modern district was built', 'Yangi zamonaviy mahalla qurildi'), { arch: 3 }),
      O('juice', T('Узбекские соки начали продавать в Европе', 'Uzbek juices went on sale in Europe', 'Oʻzbek sharbatlari Yevropada sotila boshladi'), { food: 3 }),
    ] },

    // Наука
    s1: { q: T('Что тебе интереснее понять?', 'What would you like to understand?', 'Nimani tushunish sizga qiziqroq?'), options: [
      O('primes', T('Почему числа ведут себя так, как ведут', 'Why numbers behave the way they do', 'Raqamlar nega aynan shunday boʻladi'), { math: 3 }),
      O('universe', T('Как устроена Вселенная', 'How the universe works', 'Olam qanday tuzilgan'), { phys: 3 }),
      O('dna', T('Как работают клетки и ДНК', 'How cells and DNA work', 'Hujayralar va DNK qanday ishlaydi'), { bio: 3 }),
      O('climate', T('Почему меняется климат', 'Why the climate is changing', 'Iqlim nega oʻzgarmoqda'), { eco: 3 }),
      O('data', T('Что скрыто в больших данных', 'What’s hidden in big data', 'Katta maʼlumotlarda nima yashiringan'), { data: 3 }),
    ] },
    s2: { q: T('Олимпиада по какому предмету тебе ближе?', 'Which subject olympiad suits you best?', 'Qaysi fan olimpiadasi sizga yaqinroq?'), options: [
      O('math', T('Математика', 'Math', 'Matematika'), { math: 3 }),
      O('phys', T('Физика или астрономия', 'Physics or astronomy', 'Fizika yoki astronomiya'), { phys: 3 }),
      O('chembio', T('Химия или биология', 'Chemistry or biology', 'Kimyo yoki biologiya'), { bio: 3 }),
      O('geo', T('География или экология', 'Geography or ecology', 'Geografiya yoki ekologiya'), { eco: 3 }),
      O('cs', T('Информатика', 'Computer science', 'Informatika'), { data: 2, it: 1 }),
    ] },
    s3: { q: T('Как тебе нравится работать?', 'How do you like to work?', 'Qanday ishlash sizga yoqadi?'), options: [
      O('paper', T('Листок, ручка и долгие размышления', 'Paper, a pen and long thinking', 'Qogʻoz, ruchka va uzoq oʻylash'), { math: 3, phys: 1 }),
      O('devices', T('Приборы, измерения, эксперименты', 'Instruments, measurements, experiments', 'Asboblar, oʻlchovlar, tajribalar'), { phys: 3 }),
      O('trips', T('Экспедиции: горы, реки, пустыни', 'Expeditions: mountains, rivers, deserts', 'Ekspeditsiyalar: togʻlar, daryolar, choʻllar'), { eco: 3 }),
      O('models', T('Модели и расчёты на компьютере', 'Models and calculations on a computer', 'Kompyuterda modellar va hisob-kitoblar'), { data: 3, math: 1 }),
      O('micro', T('Микроскоп и пробирки', 'A microscope and test tubes', 'Mikroskop va probirkalar'), { bio: 3 }),
    ] },
    s4: { q: T('Какой результат был бы для тебя самым ценным?', 'Which result would you be proudest of?', 'Qaysi natija bilan koʻproq faxrlanardingiz?'), options: [
      O('proof', T('Красивое доказательство', 'An elegant proof', 'Chiroyli isbot'), { math: 3 }),
      O('law', T('Открытие нового закона природы', 'Discovering a new law of nature', 'Yangi tabiat qonunini kashf qilish'), { phys: 3 }),
      O('cure', T('Новое лекарство или материал', 'A new medicine or material', 'Yangi dori yoki material'), { bio: 3, pharm: 1 }),
      O('lake', T('Спасённое озеро или лес', 'A lake or forest saved', 'Qutqarilgan koʻl yoki oʻrmon'), { eco: 3 }),
      O('forecast', T('Точный прогноз для компании', 'An accurate forecast for a company', 'Kompaniya uchun aniq prognoz'), { data: 3 }),
    ] },
    s5: { q: T('Работа мечты — это…', 'Your dream job is…', 'Orzuingizdagi ish bu…'), options: [
      O('uni', T('Учёный-математик в университете', 'A mathematician at a university', 'Universitetda matematik olim'), { math: 3, edu: 1 }),
      O('cern', T('Физик в CERN или обсерватории', 'A physicist at CERN or an observatory', 'CERN yoki observatoriyada fizik'), { phys: 3 }),
      O('biotech', T('Исследователь в биотех-компании', 'A researcher at a biotech company', 'Biotexnologiya kompaniyasida tadqiqotchi'), { bio: 3 }),
      O('un', T('Эколог в международной организации', 'An ecologist at an international organisation', 'Xalqaro tashkilotda ekolog'), { eco: 3 }),
      O('analyst', T('Аналитик данных в банке или IT', 'A data analyst at a bank or IT company', 'Bank yoki IT kompaniyada maʼlumotlar tahlilchisi'), { data: 3 }),
    ] },

    // Медицина
    h1: { q: T('Как тебе хочется помогать людям?', 'How would you like to help people?', 'Odamlarga qanday yordam berishni xohlaysiz?'), options: [
      O('treat', T('Ставить диагноз и лечить', 'Diagnose and treat', 'Tashxis qoʻyish va davolash'), { med: 3 }),
      O('smile', T('Возвращать здоровую улыбку', 'Give back a healthy smile', 'Sogʻlom tabassumni qaytarish'), { dent: 3 }),
      O('drugs', T('Создавать и подбирать лекарства', 'Create and choose medicines', 'Dori yaratish va tanlash'), { pharm: 3 }),
      O('care', T('Ухаживать и ставить на ноги после травм', 'Care for people and help them recover after injuries', 'Parvarish qilish va jarohatdan keyin oyoqqa turgʻizish'), { nurse: 3 }),
      O('pets', T('Лечить животных', 'Treat animals', 'Hayvonlarni davolash'), { vet: 3 }),
      O('talk', T('Разговором помогать справиться с трудностями', 'Help people cope through conversation', 'Suhbat orqali qiyinchilikni yengishga yordam berish'), { psy: 3 }),
    ] },
    h2: { q: T('Сколько лет учёбы в вузе для тебя нормально?', 'How many years are you ready to study?', 'Oliygohda necha yil oʻqishga tayyorsiz?'), options: [
      O('long', T('6 лет и больше — ради сильной профессии', '6+ years — for a strong profession', '6 yil va undan koʻp — kuchli kasb uchun'), { med: 3, dent: 1 }),
      O('five', T('Около 5 лет', 'About 5 years', 'Taxminan 5 yil'), { dent: 2, pharm: 2, vet: 2 }),
      O('four', T('4 года, хочу быстрее начать работать', '4 years, I want to start working sooner', '4 yil, tezroq ishlashni boshlamoqchiman'), { nurse: 3, psy: 1 }),
      O('any', T('Неважно, лишь бы было интересно', 'Doesn’t matter, as long as it’s interesting', 'Farqi yoʻq, faqat qiziq boʻlsa'), { psy: 2, med: 1 }),
    ] },
    h3: { q: T('Что у тебя хорошо получается?', 'What are you good at?', 'Sizda nima yaxshi chiqadi?'), options: [
      O('calm', T('Не теряюсь, когда кому-то плохо', 'I stay calm when someone feels bad', 'Kimgadir yomon boʻlsa, oʻzimni yoʻqotmayman'), { med: 2, nurse: 2 }),
      O('hands', T('Аккуратная работа руками, до миллиметра', 'Precise handwork, down to the millimetre', 'Qoʻl bilan millimetrgacha aniq ishlash'), { dent: 3 }),
      O('chem', T('Химия и формулы', 'Chemistry and formulas', 'Kimyo va formulalar'), { pharm: 3 }),
      O('animals', T('Нахожу общий язык с животными', 'Getting along with animals', 'Hayvonlar bilan til topishish'), { vet: 3 }),
      O('listen', T('Слушать и поддерживать', 'Listening and supporting', 'Tinglash va qoʻllab-quvvatlash'), { psy: 3 }),
    ] },
    h4: { q: T('Где тебе хочется работать?', 'Where would you like to work?', 'Qayerda ishlashni xohlaysiz?'), options: [
      O('hospital', T('В больнице', 'In a hospital', 'Kasalxonada'), { med: 3, nurse: 1 }),
      O('clinic', T('В своей клинике', 'In my own clinic', 'Oʻz klinikamda'), { dent: 3 }),
      O('pharma', T('В лаборатории или фармкомпании', 'In a lab or pharma company', 'Laboratoriya yoki farmatsevtika kompaniyasida'), { pharm: 3 }),
      O('rehab', T('В реабилитационном центре', 'In a rehabilitation centre', 'Reabilitatsiya markazida'), { nurse: 3, sport: 1 }),
      O('vet', T('В ветклинике или на ферме', 'In a vet clinic or on a farm', 'Veterinariya klinikasida yoki fermada'), { vet: 3 }),
      O('office', T('В кабинете психолога или в школе', 'In a counselling room or at a school', 'Psixolog xonasida yoki maktabda'), { psy: 3 }),
    ] },
    h5: { q: T('Какой предмет тебе ближе?', 'Which subject is closer to you?', 'Qaysi fan sizga yaqinroq?'), options: [
      O('bio', T('Биология', 'Biology', 'Biologiya'), { med: 2, vet: 1, nurse: 1 }),
      O('chem', T('Химия', 'Chemistry', 'Kimyo'), { pharm: 3, dent: 1 }),
      O('both', T('Биология и химия одинаково', 'Biology and chemistry equally', 'Biologiya va kimyo bir xil'), { med: 2, dent: 2 }),
      O('soc', T('Обществознание, люди', 'Social studies, people', 'Jamiyatshunoslik, odamlar'), { psy: 3 }),
      O('pe', T('Физкультура', 'PE', 'Jismoniy tarbiya'), { nurse: 2, sport: 1 }),
    ] },

    // Природа и сельское хозяйство
    n1: { q: T('Что из этого тебе ближе?', 'Which is closest to you?', 'Bulardan qaysi biri sizga yaqinroq?'), options: [
      O('farm', T('Выращивать сады и урожай', 'Growing orchards and crops', 'Bogʻ va hosil yetishtirish'), { agro: 3 }),
      O('animals', T('Заботиться о животных', 'Caring for animals', 'Hayvonlarga gʻamxoʻrlik qilish'), { vet: 3 }),
      O('protect', T('Защищать природу', 'Protecting nature', 'Tabiatni muhofaza qilish'), { eco: 3 }),
      O('food', T('Делать продукты питания', 'Making food products', 'Oziq-ovqat mahsulotlari ishlab chiqarish'), { food: 3 }),
      O('genes', T('Изучать гены растений в лаборатории', 'Studying plant genes in a lab', 'Laboratoriyada oʻsimlik genlarini oʻrganish'), { bio: 3, agro: 1 }),
    ] },
    n2: { q: T('Где тебе хочется работать?', 'Where would you like to work?', 'Qayerda ishlashni xohlaysiz?'), options: [
      O('field', T('В поле или теплице', 'In a field or greenhouse', 'Dalada yoki issiqxonada'), { agro: 3 }),
      O('vet', T('В ветклинике или на конюшне', 'In a vet clinic or a stable', 'Veterinariya klinikasida yoki otxonada'), { vet: 3 }),
      O('park', T('В заповеднике, в экспедициях', 'In a nature reserve, on expeditions', 'Qoʻriqxonada, ekspeditsiyalarda'), { eco: 3 }),
      O('factory', T('На пищевом заводе', 'At a food factory', 'Oziq-ovqat zavodida'), { food: 3 }),
      O('lab', T('В лаборатории', 'In a lab', 'Laboratoriyada'), { bio: 3 }),
    ] },
    n3: { q: T('Какую задачу Узбекистана важнее решить первой?', 'Which problem in Uzbekistan would you solve first?', 'Oʻzbekistonning qaysi muammosini birinchi navbatda hal qilardingiz?'), options: [
      O('water', T('Экономить воду на полях', 'Saving water in the fields', 'Dalalarda suvni tejash'), { agro: 3, eco: 1 }),
      O('aral', T('Помочь Аралу и чистому воздуху', 'Help the Aral Sea and clean air', 'Orol va toza havoga yordam berish'), { eco: 3 }),
      O('herd', T('Здоровый скот и птица', 'Healthy livestock and poultry', 'Sogʻlom chorva va parranda'), { vet: 3 }),
      O('export', T('Качественные продукты на экспорт', 'Quality food products for export', 'Eksport uchun sifatli mahsulotlar'), { food: 3, agro: 1 }),
      O('crops', T('Сорта, которые выдержат жару', 'Crops that can survive the heat', 'Jaziramaga chidaydigan navlar'), { bio: 3, agro: 1 }),
    ] },
    n4: { q: T('Что тебе приятнее?', 'What feels better to you?', 'Sizga nima yoqimliroq?'), options: [
      O('harvest', T('Видеть, как растёт урожай', 'Watching the harvest grow', 'Hosil qanday oʻsayotganini koʻrish'), { agro: 3 }),
      O('puppy', T('Вылечить больного щенка', 'Curing a sick puppy', 'Kasal kuchukchani davolash'), { vet: 3 }),
      O('measure', T('Проверить, чистые ли вода и воздух', 'Checking if water and air are clean', 'Suv va havo tozami, tekshirish'), { eco: 3 }),
      O('taste', T('Придумать новый вкус', 'Inventing a new flavour', 'Yangi taʼm oʻylab topish'), { food: 3 }),
      O('cell', T('Увидеть клетку под микроскопом', 'Seeing a cell under a microscope', 'Mikroskop ostida hujayrani koʻrish'), { bio: 3 }),
    ] },
    n5: { q: T('Какой предмет даётся лучше?', 'Which subject comes easier?', 'Qaysi fan osonroq?'), options: [
      O('bio', T('Биология', 'Biology', 'Biologiya'), { vet: 2, agro: 1, bio: 1 }),
      O('chem', T('Химия', 'Chemistry', 'Kimyo'), { food: 2, bio: 2 }),
      O('geo', T('География', 'Geography', 'Geografiya'), { eco: 3 }),
      O('econ', T('Экономика', 'Economics', 'Iqtisodiyot'), { agro: 2, biz: 1 }),
    ] },

    // Бизнес, финансы, право
    z1: { q: T('Какое дело тебе по душе?', 'Which kind of work suits you?', 'Qaysi ish sizga yoqadi?'), options: [
      O('start', T('Запустить свою компанию', 'Launch my own company', 'Oʻz kompaniyamni ochish'), { biz: 3 }),
      O('invest', T('Управлять деньгами и вложениями', 'Manage money and investments', 'Pul va sarmoyalarni boshqarish'), { fin: 3 }),
      O('books', T('Вести точный учёт', 'Keep precise accounts', 'Aniq hisob yuritish'), { acc: 3 }),
      O('promo', T('Продвигать бренды', 'Promote brands', 'Brendlarni targʻib qilish'), { marketing: 3 }),
      O('deliver', T('Организовывать доставку грузов', 'Organise cargo delivery', 'Yuk yetkazishni tashkil qilish'), { logist: 3 }),
      O('court', T('Защищать в суде', 'Defend people in court', 'Sudda himoya qilish'), { law: 3 }),
    ] },
    z2: { q: T('Что у тебя получается лучше?', 'What are you better at?', 'Sizda nima yaxshiroq chiqadi?'), options: [
      O('lead', T('Вести за собой людей', 'Leading people', 'Odamlarni ortimdan ergashtirish'), { biz: 3 }),
      O('percent', T('Быстро считать проценты и выгоду', 'Quickly working out percentages and profit', 'Foiz va foydani tez hisoblash'), { fin: 3, acc: 1 }),
      O('detail', T('Замечать каждую мелочь без ошибок', 'Noticing every detail with no mistakes', 'Har bir mayda narsani xatosiz payqash'), { acc: 3 }),
      O('idea', T('Придумывать цепляющие идеи и посты', 'Coming up with catchy ideas and posts', 'Eʼtiborni tortadigan gʻoya va postlar oʻylab topish'), { marketing: 3 }),
      O('plan', T('Планировать маршруты и расписания', 'Planning routes and schedules', 'Yoʻnalish va jadvallarni rejalashtirish'), { logist: 3 }),
      O('argue', T('Спорить и доказывать свою правоту', 'Arguing and proving my point', 'Bahslashish va haqligimni isbotlash'), { law: 3 }),
    ] },
    z3: { q: T('Где тебе хочется работать?', 'Where would you like to work?', 'Qayerda ishlashni xohlaysiz?'), options: [
      O('startup', T('В своём стартапе', 'In my own startup', 'Oʻz startapimda'), { biz: 3 }),
      O('bank', T('В банке или инвестфонде', 'At a bank or investment fund', 'Bank yoki investitsiya fondida'), { fin: 3 }),
      O('audit', T('В аудиторской компании', 'At an audit firm', 'Auditorlik kompaniyasida'), { acc: 3 }),
      O('agency', T('В рекламном агентстве', 'At an ad agency', 'Reklama agentligida'), { marketing: 3 }),
      O('port', T('В порту, аэропорту, на складе', 'At a port, airport or warehouse', 'Portda, aeroportda, omborda'), { logist: 3 }),
      O('lawfirm', T('В суде или юридической фирме', 'In a court or law firm', 'Sudda yoki yuridik firmada'), { law: 3 }),
    ] },
    z4: { q: T('Что тебя больше порадует?', 'What would make you happier?', 'Sizni nima koʻproq xursand qiladi?'), options: [
      O('team', T('Моя команда выросла вдвое', 'My team doubled in size', 'Jamoam ikki baravar oʻsdi'), { biz: 3 }),
      O('profit', T('Вложения принесли прибыль', 'My investments paid off', 'Sarmoyalarim foyda keltirdi'), { fin: 3 }),
      O('balance', T('Отчёт сошёлся до последней цифры', 'The report balanced to the last digit', 'Hisobot oxirgi raqamigacha toʻgʻri chiqdi'), { acc: 3 }),
      O('viral', T('Моя реклама набрала миллион просмотров', 'My ad got a million views', 'Reklamam million marta koʻrildi'), { marketing: 3 }),
      O('ontime', T('Груз пришёл точно в срок', 'The cargo arrived right on time', 'Yuk aynan oʻz vaqtida yetib keldi'), { logist: 3 }),
      O('win', T('Дело в суде выиграно', 'I won a case in court', 'Sudda ishni yutdim'), { law: 3 }),
    ] },
    z5: { q: T('Какой предмет тебе ближе?', 'Which subject is closer to you?', 'Qaysi fan sizga yaqinroq?'), options: [
      O('math', T('Математика', 'Math', 'Matematika'), { fin: 2, acc: 2 }),
      O('econ', T('Экономика', 'Economics', 'Iqtisodiyot'), { biz: 2, fin: 1 }),
      O('law', T('История и право', 'History and law', 'Tarix va huquq'), { law: 3 }),
      O('lit', T('Литература и искусство', 'Literature and art', 'Adabiyot va sanʼat'), { marketing: 3 }),
      O('geo', T('География', 'Geography', 'Geografiya'), { logist: 3 }),
    ] },

    // Общество, право, медиа
    o1: { q: T('Что тебе хочется менять к лучшему?', 'What would you like to change for the better?', 'Nimani yaxshi tomonga oʻzgartirishni xohlaysiz?'), options: [
      O('mind', T('Настроение и жизнь отдельного человека', 'One person’s mood and life', 'Bir insonning kayfiyati va hayoti'), { psy: 3 }),
      O('society', T('Понимание того, как живёт общество', 'How we understand society', 'Jamiyat qanday yashashini tushunish'), { soc: 3 }),
      O('world', T('Отношения между странами', 'Relations between countries', 'Davlatlararo munosabatlar'), { ir: 3 }),
      O('city', T('То, как управляются город и страна', 'How a city and a country are run', 'Shahar va davlat qanday boshqarilishi'), { pubadm: 3 }),
      O('justice', T('Несправедливость — через законы', 'Injustice — through laws', 'Adolatsizlikni — qonunlar orqali'), { law: 3 }),
      O('info', T('То, что люди знают о мире', 'What people know about the world', 'Odamlar dunyo haqida nima bilishi'), { media: 3 }),
      O('school', T('То, как дети учатся', 'How children learn', 'Bolalar qanday oʻqishi'), { edu: 3 }),
    ] },
    o2: { q: T('Где тебе хочется работать?', 'Where would you like to work?', 'Qayerda ishlashni xohlaysiz?'), options: [
      O('cabinet', T('В кабинете психолога', 'In a counselling room', 'Psixolog xonasida'), { psy: 3 }),
      O('research', T('В исследовательском центре', 'At a research centre', 'Tadqiqot markazida'), { soc: 3 }),
      O('embassy', T('В посольстве или ООН', 'At an embassy or the UN', 'Elchixonada yoki BMTda'), { ir: 3 }),
      O('ministry', T('В министерстве или хокимияте', 'At a ministry or city administration', 'Vazirlikda yoki hokimiyatda'), { pubadm: 3 }),
      O('court', T('В суде или юридической фирме', 'In a court or law firm', 'Sudda yoki yuridik firmada'), { law: 3 }),
      O('newsroom', T('В редакции, на ТВ или YouTube', 'In a newsroom, on TV or YouTube', 'Tahririyatda, televideniyeda yoki YouTubeʼda'), { media: 3 }),
      O('school', T('В школе или учебном центре', 'At a school or learning centre', 'Maktabda yoki oʻquv markazida'), { edu: 3 }),
    ] },
    o3: { q: T('Что у тебя получается лучше всего?', 'What are you best at?', 'Sizda eng yaxshi nima chiqadi?'), options: [
      O('listen', T('Слушать и понимать других', 'Listening to and understanding others', 'Boshqalarni tinglash va tushunish'), { psy: 3, edu: 1 }),
      O('survey', T('Разбирать опросы и цифры о людях', 'Analysing surveys and data about people', 'Odamlar haqidagi soʻrovnoma va raqamlarni tahlil qilish'), { soc: 3 }),
      O('negotiate', T('Договариваться на разных языках', 'Negotiating in different languages', 'Turli tillarda kelishish'), { ir: 3 }),
      O('organise', T('Организовывать дела для многих людей', 'Organising things for lots of people', 'Koʻp odamlar uchun ishlarni tashkil qilish'), { pubadm: 3 }),
      O('logic', T('Строить чёткие аргументы', 'Building clear arguments', 'Aniq dalillar keltirish'), { law: 3 }),
      O('write', T('Интересно писать или снимать', 'Writing or filming in an engaging way', 'Qiziqarli yozish yoki suratga olish'), { media: 3 }),
      O('explain', T('Объяснять просто', 'Explaining simply', 'Oddiy qilib tushuntirish'), { edu: 3 }),
    ] },
    o4: { q: T('Что ты чаще читаешь или смотришь?', 'What do you read or watch most?', 'Nimani koʻproq oʻqiysiz yoki koʻrasiz?'), options: [
      O('psy', T('Видео о психологии и отношениях', 'Videos about psychology and relationships', 'Psixologiya va munosabatlar haqida videolar'), { psy: 3 }),
      O('trends', T('Почему люди выбирают то или иное', 'Why people choose what they choose', 'Odamlar nega u yoki bu narsani tanlaydi'), { soc: 3 }),
      O('worldnews', T('Мировые новости', 'World news', 'Dunyo yangiliklari'), { ir: 3 }),
      O('reforms', T('Как меняются города и законы', 'How cities and laws are changing', 'Shaharlar va qonunlar qanday oʻzgarmoqda'), { pubadm: 3 }),
      O('trials', T('Истории громких судов', 'Stories of famous trials', 'Mashhur sud ishlari haqidagi hikoyalar'), { law: 3 }),
      O('bloggers', T('Блогеров и журналистов', 'Bloggers and journalists', 'Blogerlar va jurnalistlar'), { media: 3 }),
      O('learning', T('Как лучше учиться и учить', 'How to learn and teach better', 'Qanday qilib yaxshiroq oʻqish va oʻrgatish'), { edu: 3 }),
    ] },
    o5: { q: T('Какой предмет тебе ближе?', 'Which subject is closer to you?', 'Qaysi fan sizga yaqinroq?'), options: [
      O('biosoc', T('Биология и обществознание', 'Biology and social studies', 'Biologiya va jamiyatshunoslik'), { psy: 3 }),
      O('soc', T('Обществознание', 'Social studies', 'Jamiyatshunoslik'), { soc: 2, pubadm: 1 }),
      O('langhist', T('Языки и история', 'Languages and history', 'Tillar va tarix'), { ir: 3 }),
      O('law', T('Право и история', 'Law and history', 'Huquq va tarix'), { law: 2, pubadm: 1 }),
      O('lit', T('Литература', 'Literature', 'Adabiyot'), { media: 3 }),
      O('any', T('Любой — мне нравится его объяснять', 'Any — I like explaining it', 'Istalgani — uni tushuntirish menga yoqadi'), { edu: 3 }),
    ] },

    // Гуманитарные науки и языки
    u1: { q: T('Что тебя затягивает надолго?', 'What can keep you hooked for hours?', 'Sizni uzoq vaqt nima band qila oladi?'), options: [
      O('ancient', T('Древние цивилизации, Великий шёлковый путь', 'Ancient civilisations, the Great Silk Road', 'Qadimiy sivilizatsiyalar, Buyuk ipak yoʻli'), { hist: 3 }),
      O('meaning', T('Вопросы о смысле и правде', 'Questions about meaning and truth', 'Maʼno va haqiqat haqidagi savollar'), { philo: 3 }),
      O('langs', T('Как устроены языки', 'How languages work', 'Tillar qanday tuzilgan'), { ling: 3 }),
      O('stories', T('Истории, статьи, видео', 'Stories, articles, videos', 'Hikoyalar, maqolalar, videolar'), { media: 3 }),
      O('explain', T('Объяснять другим', 'Explaining things to others', 'Boshqalarga tushuntirish'), { edu: 3 }),
      O('politics', T('Мировая политика', 'World politics', 'Jahon siyosati'), { ir: 3 }),
    ] },
    u2: { q: T('Как тебе нравится работать?', 'How do you like to work?', 'Qanday ishlash sizga yoqadi?'), options: [
      O('archive', T('В архивах и на раскопках', 'In archives and at excavations', 'Arxivlarda va qazishmalarda'), { hist: 3 }),
      O('debate', T('В спорах и размышлениях', 'Through debates and reflection', 'Bahs va mulohazalarda'), { philo: 3 }),
      O('translate', T('Переводить тексты и фильмы', 'Translating texts and films', 'Matn va filmlarni tarjima qilish'), { ling: 3 }),
      O('interview', T('Брать интервью', 'Interviewing people', 'Intervyu olish'), { media: 3 }),
      O('class', T('В классе с учениками', 'In a classroom with students', 'Sinfda oʻquvchilar bilan'), { edu: 3 }),
      O('talks', T('На переговорах', 'At negotiations', 'Muzokaralarda'), { ir: 3 }),
    ] },
    u3: { q: T('Сколько языков тебе хочется знать?', 'How many languages would you like to know?', 'Nechta tilni bilishni xohlaysiz?'), options: [
      O('one', T('Одного-двух хватит', 'One or two is enough', 'Bitta-ikkitasi yetarli'), { hist: 1, philo: 1, edu: 1, media: 1 }),
      O('three', T('Три', 'Three', 'Uchta'), { ir: 2, ling: 1 }),
      O('many', T('Четыре и больше', 'Four or more', 'Toʻrtta va undan koʻp'), { ling: 3, ir: 1 }),
    ] },
    u4: { q: T('Какую книгу или видео ты выберешь?', 'Which book or video would you choose?', 'Qaysi kitob yoki videoni tanlaysiz?'), options: [
      O('silk', T('История Самарканда и Бухары', 'The history of Samarkand and Bukhara', 'Samarqand va Buxoro tarixi'), { hist: 3 }),
      O('good', T('Что такое добро и свобода', 'What goodness and freedom are', 'Ezgulik va erkinlik nima'), { philo: 3 }),
      O('words', T('Откуда берутся слова', 'Where words come from', 'Soʻzlar qayerdan paydo boʻladi'), { ling: 3 }),
      O('invest', T('Журналистское расследование', 'A journalist’s investigation', 'Jurnalistik surishtiruv'), { media: 3 }),
      O('teacher', T('Про лучшего учителя в мире', 'About the best teacher in the world', 'Dunyodagi eng yaxshi oʻqituvchi haqida'), { edu: 3 }),
      O('diplomat', T('Мемуары дипломата', 'A diplomat’s memoirs', 'Diplomat xotiralari'), { ir: 3 }),
    ] },
    u5: { q: T('Где ты видишь себя через 10 лет?', 'Where do you see yourself in 10 years?', '10 yildan keyin oʻzingizni qayerda koʻrasiz?'), options: [
      O('museum', T('В музее или научном институте', 'At a museum or research institute', 'Muzeyda yoki ilmiy institutda'), { hist: 3 }),
      O('lecturer', T('Преподаю в университете и пишу книги', 'Teaching at a university and writing books', 'Universitetda dars berib, kitob yozaman'), { philo: 3 }),
      O('translator', T('Переводчик в международной компании', 'A translator at an international company', 'Xalqaro kompaniyada tarjimon'), { ling: 3 }),
      O('editor', T('Главный редактор или известный блогер', 'An editor-in-chief or a well-known blogger', 'Bosh muharrir yoki mashhur bloger'), { media: 3 }),
      O('director', T('Учитель или директор школы', 'A teacher or school principal', 'Oʻqituvchi yoki maktab direktori'), { edu: 3 }),
      O('embassy', T('В посольстве другой страны', 'At an embassy abroad', 'Boshqa davlatdagi elchixonada'), { ir: 3 }),
    ] },

    // Искусство и дизайн
    a1: { q: T('Что ты делаешь в свободное время?', 'What do you make in your free time?', 'Boʻsh vaqtingizda nima yaratasiz?'), options: [
      O('logos', T('Рисую логотипы, обложки, стикеры', 'Logos, covers, stickers', 'Logotip, muqova, stikerlar chizaman'), { design: 3 }),
      O('paint', T('Пишу картины', 'Paintings', 'Rasm chizaman'), { fineart: 3 }),
      O('songs', T('Играю или пою', 'I play music or sing', 'Cholgʻu chalaman yoki kuylayman'), { music: 3 }),
      O('edits', T('Снимаю и монтирую видео', 'I shoot and edit videos', 'Video suratga olib, montaj qilaman'), { film: 3 }),
      O('outfits', T('Придумываю образы, шью', 'I put together outfits, sew', 'Obrazlar oʻylab topaman, tikaman'), { fashion: 3 }),
      O('rooms', T('Строю дома в Minecraft, планирую комнату', 'I build houses in Minecraft, plan rooms', 'Minecraftʼda uy quraman, xonani rejalashtiraman'), { arch: 3 }),
      O('chars', T('Придумываю персонажей для игр', 'I invent game characters', 'Oʻyinlar uchun qahramonlar oʻylab topaman'), { gamedev: 3 }),
    ] },
    a2: { q: T('С чем тебе хочется работать?', 'What would you like to work with?', 'Nima bilan ishlashni xohlaysiz?'), options: [
      O('figma', T('Figma и Photoshop', 'Figma and Photoshop', 'Figma va Photoshop'), { design: 3 }),
      O('canvas', T('Кисти и холст', 'Brushes and canvas', 'Moʻyqalam va kanvas'), { fineart: 3 }),
      O('instrument', T('Инструмент или голос', 'An instrument or my voice', 'Cholgʻu yoki ovoz'), { music: 3 }),
      O('camera', T('Камера и монтаж', 'A camera and editing', 'Kamera va montaj'), { film: 3 }),
      O('fabric', T('Ткани и швейная машина', 'Fabric and a sewing machine', 'Mato va tikuv mashinasi'), { fashion: 3 }),
      O('model3d', T('Чертежи и 3D-модели зданий', 'Drawings and 3D models of buildings', 'Binolarning chizmalari va 3D modellari'), { arch: 3 }),
      O('engine', T('Игровой движок', 'A game engine', 'Oʻyin dvigateli'), { gamedev: 3 }),
    ] },
    a3: { q: T('Что для тебя важнее в работе?', 'What matters more to you in your work?', 'Ishda siz uchun nima muhimroq?'), options: [
      O('useful', T('Чтобы было и красиво, и удобно', 'Both beautiful and convenient', 'Ham chiroyli, ham qulay boʻlishi'), { design: 3, arch: 1 }),
      O('free', T('Свободно выражать себя', 'Expressing myself freely', 'Oʻzimni erkin ifoda etish'), { fineart: 3, music: 1 }),
      O('live', T('Эмоции зрителей вживую', 'The audience’s emotions live', 'Tomoshabinlarning jonli hissiyotlari'), { music: 3 }),
      O('story', T('Рассказать историю', 'Telling a story', 'Hikoya aytib berish'), { film: 3 }),
      O('trend', T('Стиль и тренды', 'Style and trends', 'Uslub va trendlar'), { fashion: 3 }),
      O('lasting', T('Чтобы это стояло 100 лет', 'That it stands for 100 years', '100 yil turishi'), { arch: 3 }),
      O('interactive', T('Чтобы в это можно было играть', 'That people can play it', 'Uni oʻynash mumkin boʻlishi'), { gamedev: 3 }),
    ] },
    a4: { q: T('Математика и техника для тебя…', 'For you, math and tech are…', 'Siz uchun matematika va texnika…'), options: [
      O('ok_build', T('Нормально, если нужны для зданий', 'Fine if they’re needed for buildings', 'Binolar uchun kerak boʻlsa, mayli'), { arch: 3 }),
      O('ok_code', T('Нормально, могу и код писать', 'Fine, I can write code too', 'Mayli, kod ham yoza olaman'), { gamedev: 3, design: 1 }),
      O('pure_art', T('Лучше чистое творчество', 'I’d rather do pure creative work', 'Sof ijod yaxshiroq'), { fineart: 2, music: 2 }),
      O('gear', T('Люблю технику: камеры, звук, свет', 'I like gear: cameras, sound, lighting', 'Texnikani yoqtiraman: kamera, ovoz, yorugʻlik'), { film: 3, music: 1 }),
      O('little', T('Немного — чтобы считать размеры и бюджет', 'A little — for sizes and budgets', 'Ozgina — oʻlcham va byudjetni hisoblash uchun'), { fashion: 2, design: 1 }),
    ] },
    a5: { q: T('Где тебе хочется работать?', 'Where would you like to work?', 'Qayerda ishlashni xohlaysiz?'), options: [
      O('studio', T('В дизайн-студии или IT-компании', 'At a design studio or IT company', 'Dizayn studiyasida yoki IT kompaniyada'), { design: 3 }),
      O('gallery', T('В своей мастерской, с выставками', 'In my own workshop, with exhibitions', 'Oʻz ustaxonamda, koʻrgazmalar bilan'), { fineart: 3 }),
      O('stage', T('На сцене, в оркестре, в театре', 'On stage, in an orchestra, in a theatre', 'Sahnada, orkestrda, teatrda'), { music: 3 }),
      O('filmstudio', T('На киностудии', 'At a film studio', 'Kinostudiyada'), { film: 3 }),
      O('fashionhouse', T('В модном доме', 'At a fashion house', 'Moda uyida'), { fashion: 3 }),
      O('archbureau', T('В архитектурном бюро', 'At an architecture firm', 'Arxitektura byurosida'), { arch: 3 }),
      O('gamestudio', T('В студии видеоигр', 'At a video game studio', 'Video oʻyinlar studiyasida'), { gamedev: 3 }),
    ] },

    // Спорт, туризм, работа с людьми
    v1: { q: T('Что тебе ближе?', 'What’s closest to you?', 'Sizga nima yaqinroq?'), options: [
      O('sport', T('Спорт и тренировки', 'Sport and training', 'Sport va mashgʻulotlar'), { sport: 3 }),
      O('travel', T('Путешествия и гости', 'Travel and guests', 'Sayohat va mehmonlar'), { tourism: 3 }),
      O('kids', T('Дети и лагерь', 'Kids and camps', 'Bolalar va lager'), { edu: 2, sport: 1 }),
      O('recover', T('Помогать восстановиться после травмы', 'Helping people recover after injury', 'Jarohatdan keyin tiklanishga yordam berish'), { nurse: 3, sport: 1 }),
    ] },
    v2: { q: T('Где тебе хочется работать?', 'Where would you like to work?', 'Qayerda ishlashni xohlaysiz?'), options: [
      O('club', T('В спортклубе или на стадионе', 'At a sports club or stadium', 'Sport klubida yoki stadionda'), { sport: 3 }),
      O('hotel', T('В отеле, авиакомпании, турфирме', 'At a hotel, airline or travel agency', 'Mehmonxona, aviakompaniya yoki turfirmada'), { tourism: 3 }),
      O('school', T('В школе', 'At a school', 'Maktabda'), { edu: 3 }),
      O('rehab', T('В реабилитационном центре', 'In a rehabilitation centre', 'Reabilitatsiya markazida'), { nurse: 3 }),
      O('events', T('Организовывать фестивали и события', 'Organising festivals and events', 'Festival va tadbirlarni tashkil qilish'), { tourism: 2, marketing: 1 }),
    ] },
    v3: { q: T('Какой навык у тебя сильнее?', 'Which skill is stronger for you?', 'Qaysi koʻnikmangiz kuchliroq?'), options: [
      O('discipline', T('Выносливость и дисциплина', 'Stamina and discipline', 'Chidamlilik va intizom'), { sport: 3 }),
      O('talk', T('Общение и языки', 'Communication and languages', 'Muloqot va tillar'), { tourism: 3, ling: 1 }),
      O('explain', T('Объяснять', 'Explaining', 'Tushuntirish'), { edu: 3 }),
      O('care', T('Внимание и забота', 'Attention and care', 'Eʼtibor va gʻamxoʻrlik'), { nurse: 3 }),
      O('organise', T('Организовывать поездки и доставку', 'Organising trips and deliveries', 'Safar va yetkazib berishni tashkil qilish'), { logist: 2, tourism: 1 }),
    ] },
    v4: { q: T('Что тебе приятнее?', 'What feels better to you?', 'Sizga nima yoqimliroq?'), options: [
      O('won', T('Команда победила по моему плану', 'The team won thanks to my plan', 'Jamoa mening rejam bilan gʻalaba qozondi'), { sport: 3 }),
      O('reviews', T('Гости уехали довольными', 'The guests left happy', 'Mehmonlar mamnun boʻlib ketishdi'), { tourism: 3 }),
      O('understood', T('Ученики всё поняли', 'The students understood everything', 'Oʻquvchilar hammasini tushunishdi'), { edu: 3 }),
      O('walked', T('Человек снова пошёл после травмы', 'Someone walked again after an injury', 'Inson jarohatdan keyin yana yurib ketdi'), { nurse: 3 }),
    ] },
    v5: { q: T('Кем ты видишь себя через 10 лет?', 'Who do you see yourself as in 10 years?', '10 yildan keyin oʻzingizni kim sifatida koʻrasiz?'), options: [
      O('coach', T('Тренер или спортивный менеджер', 'A coach or sports manager', 'Murabbiy yoki sport menejeri'), { sport: 3 }),
      O('hotelier', T('Владелец отеля или турфирмы', 'Owner of a hotel or travel company', 'Mehmonxona yoki turfirma egasi'), { tourism: 3, biz: 1 }),
      O('teacher', T('Учитель или директор школы', 'A teacher or school principal', 'Oʻqituvchi yoki maktab direktori'), { edu: 3 }),
      O('rehab', T('Специалист по реабилитации', 'A rehabilitation specialist', 'Reabilitatsiya mutaxassisi'), { nurse: 3 }),
    ] },
  };

  // Группы для правила '@lead': после широких вопросов идём в группу с самым сильным направлением
  const GROUPS = {
    it:     { t: T('IT и данные', 'IT and data', 'IT va maʼlumotlar'), fields: ['it', 'data', 'cyber', 'gamedev'], nodes: ['it1', 'it2', 'it3', 'it4', 'it5'] },
    eng:    { t: T('Инженерия', 'Engineering', 'Muhandislik'), fields: ['eng', 'elec', 'energy', 'petro', 'aero', 'arch', 'food'], nodes: ['e1', 'e2', 'e3', 'e4', 'e5'] },
    sci:    { t: T('Наука', 'Science', 'Fan'), fields: ['math', 'phys', 'bio', 'eco', 'data'], nodes: ['s1', 's2', 's3', 's4', 's5'] },
    health: { t: T('Медицина', 'Medicine', 'Tibbiyot'), fields: ['med', 'dent', 'pharm', 'nurse', 'vet', 'psy'], nodes: ['h1', 'h2', 'h3', 'h4', 'h5'] },
    nature: { t: T('Природа', 'Nature', 'Tabiat'), fields: ['agro', 'vet', 'eco', 'food', 'bio'], nodes: ['n1', 'n2', 'n3', 'n4', 'n5'] },
    biz:    { t: T('Бизнес и право', 'Business and law', 'Biznes va huquq'), fields: ['biz', 'fin', 'acc', 'marketing', 'logist', 'law'], nodes: ['z1', 'z2', 'z3', 'z4', 'z5'] },
    soc:    { t: T('Общество и медиа', 'Society and media', 'Jamiyat va media'), fields: ['psy', 'soc', 'ir', 'pubadm', 'law', 'media', 'edu'], nodes: ['o1', 'o2', 'o3', 'o4', 'o5'] },
    hum:    { t: T('Языки и гуманитарные науки', 'Languages and humanities', 'Tillar va gumanitar fanlar'), fields: ['hist', 'philo', 'ling', 'media', 'edu', 'ir'], nodes: ['u1', 'u2', 'u3', 'u4', 'u5'] },
    arts:   { t: T('Искусство и дизайн', 'Art and design', 'Sanʼat va dizayn'), fields: ['design', 'fineart', 'music', 'film', 'fashion', 'arch', 'gamedev'], nodes: ['a1', 'a2', 'a3', 'a4', 'a5'] },
    active: { t: T('Спорт и туризм', 'Sport and tourism', 'Sport va turizm'), fields: ['sport', 'tourism', 'edu', 'nurse'], nodes: ['v1', 'v2', 'v3', 'v4', 'v5'] },
  };
  for (const g of Object.values(GROUPS)) g.nodes.forEach((id, i) => { NODES[id].next = g.nodes[i + 1] || '@final'; });

  // ---------- 3. Финал: 1–2 вопроса между лидерами ----------
  // «Рабочий день» по каждому направлению — из этих фраз собираются вопросы-дуэли
  const DAY = {
    it: T('Пишешь код нового приложения с командой', 'Writing code for a new app with your team', 'Jamoa bilan yangi ilova kodini yozasiz'),
    data: T('Учишь модель ИИ предсказывать спрос', 'Training an AI model to predict demand', 'Sunʼiy intellekt modelini talabni bashorat qilishga oʻrgatasiz'),
    cyber: T('Ищешь дыру в защите банка раньше хакеров', 'Finding a hole in a bank’s security before hackers do', 'Xakerlardan oldin bank himoyasidagi teshikni topasiz'),
    gamedev: T('Собираешь новый уровень своей игры', 'Building a new level of your game', 'Oʻyiningizning yangi bosqichini yaratasiz'),
    eng: T('Собираешь и испытываешь робота', 'Assembling and testing a robot', 'Robotni yigʻib, sinovdan oʻtkazasiz'),
    elec: T('Паяешь плату для нового гаджета', 'Soldering a circuit board for a new gadget', 'Yangi gadjet uchun plata kavsharlaysiz'),
    energy: T('Запускаешь солнечную электростанцию', 'Launching a solar power plant', 'Quyosh elektr stansiyasini ishga tushirasiz'),
    petro: T('Ищешь газ на месторождении в пустыне', 'Searching for gas at a desert field', 'Choʻldagi konda gaz qidirasiz'),
    aero: T('Проверяешь двигатель самолёта перед полётом', 'Checking a plane’s engine before a flight', 'Parvoz oldidan samolyot dvigatelini tekshirasiz'),
    food: T('Придумываешь новый продукт на пищевом заводе', 'Creating a new product at a food factory', 'Oziq-ovqat zavodida yangi mahsulot ishlab chiqasiz'),
    arch: T('Рисуешь проект нового здания', 'Designing a new building', 'Yangi bino loyihasini chizasiz'),
    math: T('Решаешь задачу, которую ещё никто не решил', 'Solving a problem no one has solved yet', 'Hali hech kim yecha olmagan masalani yechasiz'),
    phys: T('Ставишь опыт в лаборатории физики', 'Running an experiment in a physics lab', 'Fizika laboratoriyasida tajriba oʻtkazasiz'),
    bio: T('Изучаешь клетки и ДНК под микроскопом', 'Studying cells and DNA under a microscope', 'Mikroskop ostida hujayra va DNKni oʻrganasiz'),
    eco: T('Берёшь пробы воды на Арале', 'Taking water samples at the Aral Sea', 'Orolda suv namunalarini olasiz'),
    med: T('Ставишь диагноз и лечишь пациента', 'Diagnosing and treating a patient', 'Bemorga tashxis qoʻyib, davolaysiz'),
    dent: T('Возвращаешь человеку здоровую улыбку', 'Giving someone back a healthy smile', 'Insonga sogʻlom tabassumini qaytarasiz'),
    pharm: T('Создаёшь и проверяешь новое лекарство', 'Creating and testing a new medicine', 'Yangi dori yaratib, sinab koʻrasiz'),
    nurse: T('Помогаешь человеку снова ходить после травмы', 'Helping someone walk again after an injury', 'Jarohatdan keyin insonga yana yurishga yordam berasiz'),
    agro: T('Выращиваешь урожай с дронами и датчиками', 'Growing crops with drones and sensors', 'Dron va datchiklar yordamida hosil yetishtirasiz'),
    vet: T('Лечишь собак, кошек и лошадей', 'Treating dogs, cats and horses', 'Itlar, mushuklar va otlarni davolaysiz'),
    biz: T('Запускаешь свой стартап и ведёшь команду', 'Launching your startup and leading a team', 'Oʻz startapingizni ochib, jamoani boshqarasiz'),
    fin: T('Решаешь, куда вложить миллион долларов', 'Deciding where to invest a million dollars', 'Million dollarni qayerga sarmoya qilishni hal qilasiz'),
    acc: T('Проверяешь отчёт компании до последней цифры', 'Checking a company report down to the last digit', 'Kompaniya hisobotini oxirgi raqamigacha tekshirasiz'),
    marketing: T('Придумываешь рекламу, о которой все говорят', 'Creating an ad everyone talks about', 'Hamma gapiradigan reklama oʻylab topasiz'),
    logist: T('Ведёшь груз из Китая в Ташкент без задержек', 'Moving cargo from China to Tashkent with no delays', 'Yukni Xitoydan Toshkentga kechikishsiz olib kelasiz'),
    law: T('Защищаешь клиента в суде', 'Defending a client in court', 'Sudda mijozni himoya qilasiz'),
    psy: T('Помогаешь человеку пережить трудный период', 'Helping someone get through a hard time', 'Insonga qiyin davrni yengishga yordam berasiz'),
    soc: T('Проводишь опрос и узнаёшь, что волнует молодёжь', 'Running a survey to learn what young people care about', 'Soʻrovnoma oʻtkazib, yoshlarni nima qiziqtirishini bilasiz'),
    ir: T('Ведёшь переговоры с делегацией другой страны', 'Negotiating with a delegation from another country', 'Boshqa davlat delegatsiyasi bilan muzokara olib borasiz'),
    media: T('Готовишь репортаж для миллиона зрителей', 'Making a report for a million viewers', 'Million tomoshabin uchun reportaj tayyorlaysiz'),
    pubadm: T('Готовишь проект, который улучшит жизнь в городе', 'Preparing a project to improve life in your city', 'Shahardagi hayotni yaxshilaydigan loyiha tayyorlaysiz'),
    design: T('Рисуешь дизайн приложения в Figma', 'Designing an app in Figma', 'Figmada ilova dizaynini chizasiz'),
    fineart: T('Пишешь картину для своей выставки', 'Painting a picture for your exhibition', 'Koʻrgazmangiz uchun rasm chizasiz'),
    music: T('Репетируешь перед концертом', 'Rehearsing before a concert', 'Konsert oldidan mashq qilasiz'),
    film: T('Снимаешь и монтируешь фильм', 'Shooting and editing a film', 'Film suratga olib, montaj qilasiz'),
    fashion: T('Шьёшь коллекцию для показа', 'Sewing a collection for a fashion show', 'Moda namoyishi uchun kolleksiya tikasiz'),
    hist: T('Раскапываешь древний город у Самарканда', 'Excavating an ancient city near Samarkand', 'Samarqand yaqinidagi qadimiy shaharni qazib oʻrganasiz'),
    philo: T('Споришь о том, что такое справедливость', 'Debating what justice really is', 'Adolat nima ekanligi haqida bahslashasiz'),
    ling: T('Переводишь книгу или переговоры', 'Translating a book or a negotiation', 'Kitob yoki muzokarani tarjima qilasiz'),
    edu: T('Ведёшь урок, после которого всё понятно', 'Teaching a lesson that makes everything clear', 'Hamma narsa tushunarli boʻladigan dars oʻtasiz'),
    tourism: T('Принимаешь туристов в своём отеле в Бухаре', 'Welcoming tourists to your hotel in Bukhara', 'Buxorodagi mehmonxonangizda sayyohlarni kutib olasiz'),
    sport: T('Готовишь команду к чемпионату', 'Preparing a team for a championship', 'Jamoani chempionatga tayyorlaysiz'),
  };
  // Дуэли: какой набор направлений различает вопрос. Выбирается та, что покрывает больше всего из топ-3 (минимум 2).
  const DUELS = {
    d_it: ['it', 'data', 'cyber', 'gamedev'],
    d_eng: ['eng', 'elec', 'energy', 'petro', 'aero', 'arch', 'food'],
    d_sci: ['math', 'phys', 'bio', 'eco', 'data'],
    d_med: ['med', 'dent', 'pharm', 'nurse', 'vet', 'psy'],
    d_nat: ['agro', 'vet', 'eco', 'food', 'bio'],
    d_biz: ['biz', 'fin', 'acc', 'marketing', 'logist', 'law'],
    d_soc: ['psy', 'soc', 'ir', 'pubadm', 'law', 'media', 'edu'],
    d_hum: ['hist', 'philo', 'ling', 'media', 'edu', 'ir'],
    d_art: ['design', 'fineart', 'music', 'film', 'fashion', 'arch', 'gamedev'],
    d_act: ['sport', 'tourism', 'edu', 'nurse'],
    d_x_create: ['it', 'design', 'gamedev', 'marketing', 'film'],
    d_x_life: ['med', 'bio', 'pharm', 'psy', 'vet'],
    d_x_numbers: ['fin', 'data', 'math', 'acc', 'phys'],
    d_x_power: ['law', 'ir', 'pubadm', 'biz', 'soc'],
  };
  for (const [id, fs] of Object.entries(DUELS)) {
    NODES[id] = { duel: fs, next: 'd_pick',
      q: T('Какой рабочий день тебе нравится больше?', 'Which workday do you like more?', 'Qaysi ish kuni sizga koʻproq yoqadi?'),
      hint: T('Почти готово: выбираем между твоими лидерами', 'Almost done: choosing between your top matches', 'Oz qoldi: yetakchi yoʻnalishlaringiz orasidan tanlaymiz'),
      options: fs.map(f => O(f, DAY[f], { [f]: 3 })) };
  }
  // Последний вопрос-уточнение: варианты = топ-3 направления на этот момент (названия из FIELDS)
  NODES.d_pick = { dynamic: 'top3', next: 'q_eng',
    q: T('Какое из этих направлений больше всего похоже на тебя?', 'Which of these fields sounds most like you?', 'Bu yoʻnalishlardan qaysi biri sizga koʻproq mos?'),
    hint: T('Это последний вопрос про направление', 'This is the last question about your field', 'Bu yoʻnalish haqidagi oxirgi savol'),
    options: [], extra: O('all', T('Не могу выбрать — все интересны', 'Can’t choose — they all sound good', 'Tanlay olmayman — hammasi qiziq'), {}) };

  // ---------- 4. Для подбора вузов (на направление не влияют) ----------
  NODES.q_eng = { save: 'eng', next: 'q_budget',
    q: T('Какой у тебя сейчас уровень английского?', 'What’s your English level right now?', 'Hozir ingliz tilingiz qaysi darajada?'),
    hint: T('Нужно для подбора вузов, на направление не влияет', 'Used to match universities, doesn’t affect your field', 'Oliygohlarni tanlash uchun kerak, yoʻnalishga taʼsir qilmaydi'),
    options: [ // v = p_eng из data.js
      O('a', T('Начальный (A1–A2)', 'Beginner (A1–A2)', 'Boshlangʻich (A1–A2)'), {}),
      O('b1', T('Средний (B1)', 'Intermediate (B1)', 'Oʻrta (B1)'), {}),
      O('b2', T('Выше среднего (B2)', 'Upper-intermediate (B2)', 'Oʻrtadan yuqori (B2)'), {}),
      O('c1', T('Продвинутый (C1+)', 'Advanced (C1+)', 'Yuqori (C1+)'), {}),
      O('ielts', T('Есть сертификат IELTS 6.5+', 'I have IELTS 6.5+', 'IELTS 6.5+ sertifikatim bor'), {}),
    ] };
  NODES.q_budget = { save: 'budget', next: 'q_lang',
    q: T('Сколько семья готова тратить на учёбу в год?', 'How much can your family spend on study per year?', 'Oilangiz oʻqish uchun yiliga qancha sarflashga tayyor?'),
    hint: T('Примерно. Гранты тоже подберём', 'Roughly. We’ll find grants too', 'Taxminan. Grantlarni ham topamiz'),
    options: [ // v = u_budget из data.js
      O('grant', T('Только грант / бесплатно', 'Grant / free only', 'Faqat grant / bepul'), {}),
      O('low', T('До $3 000', 'Up to $3,000', '$3 000 gacha'), {}),
      O('mid', T('$3 000 – $10 000', '$3,000 – $10,000', '$3 000 – $10 000'), {}),
      O('high', T('$10 000 – $30 000', '$10,000 – $30,000', '$10 000 – $30 000'), {}),
      O('top', T('Больше $30 000', 'Over $30,000', '$30 000 dan koʻp'), {}),
    ] };
  NODES.q_lang = { save: 'studyLangs', type: 'multi', next: '@end',
    q: T('На каких языках тебе удобно учиться?', 'Which languages are you comfortable studying in?', 'Qaysi tillarda oʻqish sizga qulay?'),
    hint: T('Можно несколько', 'Pick several', 'Bir nechtasini tanlash mumkin'),
    options: [
      O('en', T('Английский', 'English', 'Ingliz tili'), {}),
      O('ru', T('Русский', 'Russian', 'Rus tili'), {}),
      O('uz', T('Узбекский', 'Uzbek', 'Oʻzbek tili'), {}),
      O('ko', T('Корейский', 'Korean', 'Koreys tili'), {}),
      O('tr', T('Турецкий', 'Turkish', 'Turk tili'), {}),
      O('de', T('Немецкий', 'German', 'Nemis tili'), {}),
      O('zh', T('Китайский', 'Chinese', 'Xitoy tili'), {}),
    ] };

  for (const [id, n] of Object.entries(NODES)) { n.id = id; n.type = n.type || 'single'; }

  // ---------- Функции (чистые, без DOM) ----------
  // FIELDS из data.js — глобальная const (в браузере не лежит в window), поэтому берём её напрямую
  const allFields = () => (typeof FIELDS !== 'undefined' ? FIELDS : root.FIELDS) || {};
  const fieldIds = () => Object.keys(allFields());
  const vals = a => (Array.isArray(a.v) ? a.v : [a.v]);

  // Веса выбранного варианта (для d_pick — +4 выбранному направлению)
  function weightsOf(node, v) {
    if (!node) return {};
    if (node.dynamic) return v !== 'all' && fieldIds().includes(v) ? { [v]: 4 } : {};
    const o = node.options.find(o => o.v === v);
    return (o && o.w) || {};
  }

  // Сырые баллы по всем направлениям
  function scores(answers) {
    const s = Object.fromEntries(fieldIds().map(k => [k, 0]));
    for (const a of answers || []) {
      const node = NODES[a.id];
      for (const v of vals(a)) for (const [f, w] of Object.entries(weightsOf(node, v))) if (f in s) s[f] += w;
    }
    return s;
  }
  // Сортировка: по баллам, при равенстве — по порядку FIELDS (стабильно)
  const ranked = s => { const order = fieldIds(); return Object.keys(s).sort((a, b) => s[b] - s[a] || order.indexOf(a) - order.indexOf(b)); };

  function resolve(next, answers) {
    if (!next || next === '@end') return null;
    if (next === '@lead') {
      const s = scores(answers);
      // сила группы = лучшее направление, при равенстве — сумма трёх лучших направлений группы
      let best = null, bestV = -1;
      for (const [k, g] of Object.entries(GROUPS)) {
        const fs = g.fields.map(f => s[f] || 0).sort((a, b) => b - a);
        const v = fs[0] * 1000 + fs[0] + (fs[1] || 0) + (fs[2] || 0);
        if (v > bestV) { best = k; bestV = v; }
      }
      return GROUPS[best].nodes[0];
    }
    if (next === '@final') {
      const top = ranked(scores(answers)).slice(0, 3);
      const asked = new Set((answers || []).map(a => a.id));
      let best = null, bestHit = 1;
      for (const [id, fs] of Object.entries(DUELS)) {
        if (asked.has(id)) continue;
        const hit = top.filter(f => fs.includes(f)).length;
        if (hit > bestHit || (hit === bestHit && best && fs.length < DUELS[best].length)) { best = id; bestHit = hit; }
      }
      return best || 'd_pick';
    }
    return next;
  }

  // Узел, готовый к показу. Для d_pick варианты собираются из текущего топ-3.
  function materialize(id, answers) {
    const n = NODES[id];
    if (!n || !n.dynamic) return n || null;
    const top = ranked(scores(answers)).slice(0, 3);
    const F = allFields();
    return { ...n, options: [...top.map(f => O(f, F[f] ? F[f].name : T(f, f, f), { [f]: 4 })), n.extra] };
  }

  // Следующий вопрос. answers — массив [{ id, v }] по порядку (v — строка, у multi — массив строк).
  // Возвращает узел { id, type, q, hint?, options[], ... } или null, если тест закончен.
  function nextQuestion(answers) {
    answers = answers || [];
    if (!answers.length) return materialize('start', answers);
    const last = answers[answers.length - 1];
    const node = NODES[last.id];
    if (!node) return null;
    const opt = node.type === 'single' && !node.dynamic ? node.options.find(o => o.v === last.v) : null;
    const id = resolve((opt && opt.next) || node.next, answers);
    return id ? materialize(id, answers) : null;
  }

  // Итог в формате, совместимом с summary теста «Университет» (test.js buildSummary/scoreFields)
  function result(answers) {
    answers = answers || [];
    const s = scores(answers);
    const max = Math.max(1, ...Object.values(s));
    const fields = ranked(s).map(id => ({ id, pct: Math.max(8, Math.round((s[id] / (max * 1.04)) * 100)) }));
    const saved = {};
    for (const a of answers) { const n = NODES[a.id]; if (n && n.save) saved[n.save] = a.v; }
    const subj = answers.find(a => a.id === 'q_subject');
    return {
      top: fields.slice(0, 3), // [главное, запасное, запасное]
      fields,                  // все 43 направления по убыванию
      eng: saved.eng, budget: saved.budget, studyLangs: [].concat(saved.studyLangs || []),
      subjects: subj ? [subj.v] : [], langs: [], regions: [],
      answers: Object.fromEntries(answers.map(a => [a.id, a.v])),
      path: answers.map(a => a.id),
    };
  }

  // Какие ответы сильнее всего подняли направление — для блока «Почему тебе подходит». Возвращает [{ t: {ru,en,uz}, w }]
  function why(fid, answers) {
    const items = [];
    for (const a of answers || []) {
      const n = materialize(a.id, answers.slice(0, answers.indexOf(a)));
      if (!n || n.dynamic || n.duel) continue;
      for (const v of vals(a)) {
        const o = n.options.find(o => o.v === v);
        if (o && o.w && o.w[fid] > 0) items.push({ t: o.t, w: o.w[fid] });
      }
    }
    return items.sort((x, y) => y.w - x.w).slice(0, 5);
  }

  const API = { NODES, GROUPS, DUELS, DAY, START: 'start', MAX_LEN: 18, nextQuestion, result, scores, why };
  root.ADAPTIVE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

/* ======================== ФОРМАТ ДЛЯ FRONTEND ========================
Подключение: <script src="/js/adaptive-tree.js"></script> ПОСЛЕ data.js (нужен FIELDS). Всё лежит в window.ADAPTIVE.

Узел (вопрос): { id, type: 'single' | 'multi', q: {ru,en,uz}, hint?: {ru,en,uz}, options: [{ v, t: {ru,en,uz}, w: {fieldId: число}, next? }], next }
  - Тексты — объекты {ru, en, uz}: показывать через tx() из common.js (он берёт .uz напрямую).
  - next у варианта важнее next у узла. Значения next: id узла | '@lead' (группа с самым сильным направлением)
    | '@final' (дуэль между лидерами или d_pick) | '@end' (конец).
  - type 'multi' только у q_lang (языки обучения, можно несколько) — v там массив строк.
  - d_pick строится на лету: варианты = топ-3 направления (t = FIELDS[id].name) + «Не могу выбрать» (v 'all').

Как пройти:
  const answers = [];                          // [{ id, v }] по порядку
  let node = ADAPTIVE.nextQuestion(answers);   // первый вопрос ('start')
  // показать node; пользователь выбрал v →
  answers.push({ id: node.id, v });
  node = ADAPTIVE.nextQuestion(answers);       // следующий; null = тест закончен
  // «Назад»: answers.pop(); node = ADAPTIVE.nextQuestion(answers) (для первого — answers пуст → 'start').
  // Прогресс: ADAPTIVE.MAX_LEN = 18 (реально путь 13–14 вопросов).

Итог: ADAPTIVE.result(answers) →
  { top: [{id, pct}, {id, pct}, {id, pct}],   // главное направление + 2 запасных, pct как в test.js scoreFields
    fields: [{id, pct}, ...],                 // все 43 направления по убыванию (то же, что summary.fields у теста «Университет»)
    eng: 'a'|'b1'|'b2'|'c1'|'ielts',          // = значения p_eng
    budget: 'grant'|'low'|'mid'|'high'|'top', // = значения u_budget
    studyLangs: ['en','ru','uz','ko','tr','de','zh'],  // языки, на которых готов учиться (не путать с langs = «какие знаю»)
    subjects: ['math'|...],                   // любимый предмет, значения = p_subjects
    langs: [], regions: [],                   // страны выбирает клиент позже, на шаге подбора вузов
    answers: { nodeId: v }, path: [nodeId, ...] }
  Для сохранения как сейчас: summary = { ...ADAPTIVE.result(answers) } (поля fields/budget/eng/subjects/langs/regions совпадают
  с buildSummary для category 'university'); answers в POST /api/results — result.answers.

«Почему подходит»: ADAPTIVE.why(fieldId, answers) → [{ t: {ru,en,uz}, w }] (до 5 ответов, давших больше всего баллов).
Проверка дерева: node scripts/check-tree.js
====================================================================== */
