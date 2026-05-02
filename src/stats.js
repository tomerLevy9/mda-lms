// סטטיסטיקות אישיות — נשמרות ב-localStorage. אין שיתוף עם משתמשים אחרים.
const KEY = "mda_stats_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    return { ...defaultStats(), ...parsed, perChapter: { ...parsed.perChapter } };
  } catch {
    return defaultStats();
  }
}

function write(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // localStorage עלול להיות חסום (incognito, מכסת אחסון מלאה) — מתעלמים בשקט
  }
}

function defaultStats() {
  return {
    perChapter: {},
    totalQuizzes: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    studyDays: [], // YYYY-MM-DD
  };
}

function emptyChapterEntry() {
  return { practiceCount: 0, lastPracticed: null, correctTotal: 0, answeredTotal: 0 };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function recordQuizStart(chapterIds) {
  const s = read();
  s.totalQuizzes += 1;
  const today = todayKey();
  if (!s.studyDays.includes(today)) s.studyDays.push(today);
  const now = new Date().toISOString();
  for (const id of chapterIds) {
    if (!s.perChapter[id]) s.perChapter[id] = emptyChapterEntry();
    s.perChapter[id].practiceCount += 1;
    s.perChapter[id].lastPracticed = now;
  }
  write(s);
}

export function recordAnswer(chapterId, isCorrect) {
  const s = read();
  s.totalAnswered += 1;
  if (isCorrect) s.totalCorrect += 1;
  if (chapterId) {
    if (!s.perChapter[chapterId]) s.perChapter[chapterId] = emptyChapterEntry();
    s.perChapter[chapterId].answeredTotal += 1;
    if (isCorrect) s.perChapter[chapterId].correctTotal += 1;
  }
  write(s);
}

export function getChapterStats(chapterId) {
  return read().perChapter[chapterId] || null;
}

export function getOverallStats() {
  const s = read();
  return {
    totalQuizzes: s.totalQuizzes,
    totalAnswered: s.totalAnswered,
    totalCorrect: s.totalCorrect,
    accuracy: s.totalAnswered ? Math.round((s.totalCorrect / s.totalAnswered) * 100) : 0,
    daysStudied: s.studyDays.length,
    streak: computeStreak(s.studyDays),
  };
}

// רצף ימים — נשמר אם המשתמש למד היום או אתמול. ימים שלפני "אתמול" מאפסים.
function computeStreak(days) {
  if (!days || !days.length) return 0;
  const sorted = [...new Set(days)].sort().reverse();
  const today = todayKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00Z");
    const curr = new Date(sorted[i] + "T00:00:00Z");
    const diffDays = Math.round((prev - curr) / 86400000);
    if (diffDays === 1) streak += 1;
    else break;
  }
  return streak;
}

export function formatRelativeDate(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "היום";
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 14) return "לפני שבוע";
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  if (diffDays < 60) return "לפני חודש";
  return `לפני ${Math.floor(diffDays / 30)} חודשים`;
}
