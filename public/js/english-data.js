// Мини-тест английского: 30 вопросов от A1 до C1. a — индекс правильного ответа.
const EN_PARTS = { g: L('Грамматика', 'Grammar'), v: L('Словарный запас', 'Vocabulary'), r: L('Чтение', 'Reading') };

const EN_TEXTS = {
  r1: 'Aziz grew up in Samarkand and always dreamed of studying engineering abroad. At school, he was strong in maths but found English difficult. In his last two years, he studied English for an hour every evening and took two practice tests each month. When he finally sat the IELTS exam, he scored 6.5, which was enough for a scholarship at a university in South Korea. Today he says the most important thing was not talent but routine.',
  r2: 'Remote work was once considered a privilege reserved for a handful of technology companies. The pandemic, however, turned it into a global experiment almost overnight. Proponents argue that it widens access to jobs, allowing talented people in smaller cities to compete for positions that were previously out of reach. Critics counter that it erodes the informal learning that happens when junior employees observe experienced colleagues. The emerging consensus is that hybrid arrangements may capture the benefits of both, although the ideal balance varies considerably between industries.',
};

const EN_Q = [
  { p: 'g', q: 'She ___ to school every day.', o: ['go', 'goes', 'going', 'gone'], a: 1 },
  { p: 'g', q: 'There ___ two apples on the table.', o: ['is', 'are', 'be', 'am'], a: 1 },
  { p: 'g', q: 'I ___ TV when you called.', o: ['watched', 'was watching', 'am watching', 'have watched'], a: 1 },
  { p: 'g', q: 'He has lived here ___ 2015.', o: ['for', 'since', 'from', 'during'], a: 1 },
  { p: 'g', q: 'If it rains tomorrow, we ___ at home.', o: ['stay', 'will stay', 'would stay', 'stayed'], a: 1 },
  { p: 'g', q: 'This is the ___ book I have ever read.', o: ['more interesting', 'most interesting', 'interestingest', 'interesting'], a: 1 },
  { p: 'g', q: 'The letter ___ yesterday.', o: ['was sent', 'sent', 'has sent', 'is sending'], a: 0 },
  { p: 'g', q: 'I wish I ___ more time to study.', o: ['have', 'had', 'will have', 'having'], a: 1 },
  { p: 'g', q: 'By the time we arrived, the film ___.', o: ['already started', 'has already started', 'had already started', 'was already start'], a: 2 },
  { p: 'g', q: 'She suggested ___ a taxi.', o: ['to take', 'taking', 'take', 'took'], a: 1 },
  { p: 'g', q: 'If he had studied harder, he ___ the exam.', o: ['would pass', 'would have passed', 'will pass', 'passed'], a: 1 },
  { p: 'g', q: 'Hardly ___ the door when the phone rang.', o: ['I had opened', 'had I opened', 'I opened', 'did I opened'], a: 1 },
  { p: 'v', q: '“Enormous” means…', o: ['very small', 'very big', 'very old', 'very fast'], a: 1 },
  { p: 'v', q: 'I need to ___ a decision.', o: ['do', 'make', 'put', 'get'], a: 1 },
  { p: 'v', q: 'The opposite of “generous” is…', o: ['kind', 'selfish', 'brave', 'honest'], a: 1 },
  { p: 'v', q: 'She is very good ___ maths.', o: ['in', 'at', 'on', 'for'], a: 1 },
  { p: 'v', q: '“To postpone” means…', o: ['to cancel', 'to delay', 'to finish', 'to begin'], a: 1 },
  { p: 'v', q: 'The company had to ___ 200 workers because of the crisis.', o: ['lay off', 'lay out', 'take off', 'put off'], a: 0 },
  { p: 'v', q: 'We need to ___ the risks before investing.', o: ['assess', 'assist', 'access', 'assume'], a: 0 },
  { p: 'v', q: '“Reluctant” means…', o: ['eager', 'unwilling', 'angry', 'tired'], a: 1 },
  { p: 'v', q: 'The new policy had a significant ___ on students.', o: ['affect', 'impact', 'effort', 'reason'], a: 1 },
  { p: 'v', q: 'His explanation was so ___ that everyone understood it at once.', o: ['vague', 'lucid', 'obscure', 'tedious'], a: 1 },
  { p: 'r', t: 'r1', q: 'What did Aziz find difficult at school?', o: ['maths', 'English', 'engineering', 'routine'], a: 1 },
  { p: 'r', t: 'r1', q: 'How often did he take practice tests?', o: ['every evening', 'twice a month', 'once a year', 'every week'], a: 1 },
  { p: 'r', t: 'r1', q: 'What did his IELTS score allow him to do?', o: ['study in Samarkand', 'get a scholarship', 'skip school', 'teach English'], a: 1 },
  { p: 'r', t: 'r1', q: 'According to Aziz, what mattered most?', o: ['talent', 'money', 'routine', 'luck'], a: 2 },
  { p: 'r', t: 'r2', q: 'Before the pandemic, remote work was…', o: ['common everywhere', 'limited to a few companies', 'illegal', 'unknown'], a: 1 },
  { p: 'r', t: 'r2', q: 'Proponents believe that remote work…', o: ['reduces salaries', 'widens access to jobs', 'harms technology', 'closes offices'], a: 1 },
  { p: 'r', t: 'r2', q: 'The word “erodes” is closest in meaning to…', o: ['strengthens', 'gradually weakens', 'explains', 'replaces'], a: 1 },
  { p: 'r', t: 'r2', q: 'What does the text say about hybrid work?', o: ['It suits every industry equally', 'The ideal balance differs by industry', 'It has been rejected', 'It only suits junior staff'], a: 1 },
];

// Число верных → уровень. Оценка IELTS примерная: мини-тест не заменяет экзамен.
const EN_LEVELS = [
  { min: 0, cefr: 'A1', band: '3.0–3.5' }, { min: 9, cefr: 'A2', band: '4.0–4.5' }, { min: 14, cefr: 'B1', band: '5.0–5.5' },
  { min: 19, cefr: 'B2', band: '6.0–6.5' }, { min: 24, cefr: 'C1', band: '7.0–7.5' }, { min: 28, cefr: 'C1+', band: '8.0+' },
];
const enLevel = score => [...EN_LEVELS].reverse().find(l => score >= l.min);
