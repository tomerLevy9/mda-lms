import QUESTIONS from "./questions.js";

// היררכיה: פרק → נושאים → שאלות.
// "נושא" כאן הוא ערך השדה `source` בשאלה. אפשר לערוך/למפות מחדש בעתיד.
export const CHAPTERS = [
  {
    id: "chemistry-cell",
    title: "כימיה, ביוכימיה והתא",
    topics: [
      "כימיה וביוכימיה",
      "מולקולות ורקמות",
      "התא ומרכיביו",
      "מעבר חומרים בממברנה",
      "הפקת אנרגיה בתא",
    ],
  },
  {
    id: "respiratory-basics",
    title: "מערכת הנשימה — אנטומיה ופיזיולוגיה",
    topics: [
      "אנטומיה מערכת הנשימה",
      "פיזיולוגיה מערכת הנשימה",
    ],
  },
  {
    id: "cardiovascular",
    title: "מערכת הלב וכלי הדם",
    topics: [
      "אנטומיה קרדיווסקולרית",
      "פיזיולוגיה קרדיווסקולרית",
      "פיזיולוגיה של לחץ הדם",
    ],
  },
  {
    id: "blood-immune",
    title: "דם, לימפה וחיסון",
    topics: [
      "מבנה הדם ומרכיביו",
      "סוגי דם ועירוי דם",
      "מנגנון הקרישה",
      "לימפה ובצקת",
      "מערכת החיסון",
    ],
  },
  {
    id: "body-systems",
    title: "מערכות הגוף",
    topics: [
      "מערכת העיכול",
      "מערכת השתן",
      "המערכת האנדוקרינית",
      "מערכת העצבים",
      "מערכת השלד",
      "שריר ומיוציט",
      "מערכת הכסות",
    ],
  },
  {
    id: "homeostasis",
    title: "איזון פיזיולוגי ונוזלים",
    topics: [
      "חומצות ובסיסים",
      "נוזלים ואלקטרוליטים",
      "מאזן נוזלים ובצקת",
      "פתופיזיולוגיה חומצה-בסיס",
    ],
  },
  {
    id: "pathophysiology",
    title: "פתופיזיולוגיה",
    topics: [
      "הלם המודינאמי",
      "מנגנון דלקת וספסיס",
      "פתופיזיולוגיה כללית",
    ],
  },
  {
    id: "resuscitation",
    title: "החייאה ומצבי חירום",
    topics: [
      "החייאת BLS",
      "מכשירי החייאת BLS",
      "השתנקות",
    ],
  },
  {
    id: "airway",
    title: "ניהול נתיב אוויר",
    topics: [
      "ניהול נתיב אוויר בסיסי",
      "ניהול נתיב אוויר מתקדם",
      "קפנומטריה וקפנוגרפיה",
      "סטורציה",
      "האזנה לריאות",
      "תרופות הרדמה",
      "פרוטוקול הפסקת נשימה מאיימת",
      "וידאו לרינגוסקופ",
      "ניהול נתיב אוויר קשה",
    ],
  },
  {
    id: "ventilation",
    title: "נשימה והנשמה",
    topics: [
      "מצבי חירום נשימתיים נוספים",
      "DD לחולה הנשימתי",
      "CPAP",
      "PEEP",
      "שיטות הנשמה",
      "הגישה למטופל המונשם",
    ],
  },
  {
    id: "pharmacology",
    title: "פרמקולוגיה",
    topics: [
      "פרמקודינמיקה רספירטורית",
      "מבוא לפרמקולוגיה",
      "אירועי חשיפה ונוהל הזרקות",
      "פרמקוקינטיקה",
      "פרמקודינמיקה",
      "גישה גרמית IO",
      "גישה ורידית IV",
      "הזרקות לשריר ותת עור",
    ],
  },
  {
    id: "protocols",
    title: "פרוטוקולים",
    topics: [
      "פרוטוקול ניהול מתקדם של נתיב האוויר",
      "פרוטוקול סיוע נשימתי לטיפול באי-ספיקה נשימתית",
      "פרוטוקול אינטובציה",
      "פרוטוקול נתיב אוויר סופראגלוטי",
      "פרוטוקול קריקוטירוטומיה",
      "פרוטוקול חיבור מטופל ל-CPAP",
    ],
  },
];

// אימות: כל source בשאלות חייב להופיע באחד הפרקים, ולהיפך.
const sourcesInData = new Set(QUESTIONS.map(q => q.source));
const topicsInChapters = new Set(CHAPTERS.flatMap(c => c.topics));

const unmapped = [...sourcesInData].filter(s => !topicsInChapters.has(s));
const emptyTopics = [...topicsInChapters].filter(t => !sourcesInData.has(t));

if (unmapped.length > 0) {
  throw new Error(
    `[chapters.js] sources not mapped to any chapter:\n  - ${unmapped.join("\n  - ")}\n` +
    `Add them to a chapter's "topics" array.`
  );
}
if (emptyTopics.length > 0) {
  console.warn(
    `[chapters.js] topics declared in chapters but with no matching questions:\n  - ${emptyTopics.join("\n  - ")}`
  );
}

const dupeTopic = [];
const seen = new Set();
for (const c of CHAPTERS) {
  for (const t of c.topics) {
    if (seen.has(t)) dupeTopic.push(t);
    seen.add(t);
  }
}
if (dupeTopic.length > 0) {
  throw new Error(`[chapters.js] topic appears in more than one chapter: ${dupeTopic.join(", ")}`);
}

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));

const CHAPTER_BY_TOPIC = (() => {
  const map = {};
  for (const c of CHAPTERS) for (const t of c.topics) map[t] = c;
  return map;
})();

export function getChapterById(id) {
  return CHAPTER_BY_ID[id] || null;
}

export function getChapterByTopic(topic) {
  return CHAPTER_BY_TOPIC[topic] || null;
}

export function getTopicQuestionCount(topic) {
  let n = 0;
  for (const q of QUESTIONS) if (q.source === topic) n++;
  return n;
}

export function getChapterQuestions(chapterId) {
  const ch = CHAPTER_BY_ID[chapterId];
  if (!ch) return [];
  const topicSet = new Set(ch.topics);
  return QUESTIONS.filter(q => topicSet.has(q.source));
}

export function getChapterQuestionCount(chapterId) {
  return getChapterQuestions(chapterId).length;
}

export function getQuestionsForTopics(topics) {
  if (!topics || topics.length === 0) return [];
  const set = new Set(topics);
  return QUESTIONS.filter(q => set.has(q.source));
}
