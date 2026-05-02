import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleLogin } from "@react-oauth/google";
import QUESTIONS from "./questions.js";
import {
  CHAPTERS,
  getChapterById,
  getChapterQuestions,
  getChapterQuestionCount,
  getQuestionsForTopics,
  getTopicQuestionCount,
} from "./chapters.js";
import posthog from "posthog-js";

posthog.init("phc_kxL4zQeTY4eJZ7AxybUx3JPTng9H6WAvLRWEAZyftofr", {
  api_host: "https://us.i.posthog.com",
  person_profiles: "always",
});

const SAMPLE_EXAM_SIZE = 30;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// מערבב את סדר התשובות בשאלה ומעדכן את אינדקס התשובה הנכונה
function shuffleOptions(q) {
  const order = shuffle([0, 1, 2, 3]);
  return {
    ...q,
    options: order.map(i => q.options[i]),
    correct: order.indexOf(q.correct),
  };
}

// בוחר שאלות למבחן לדוגמא — התפלגות שווה ככל האפשר בין השיעורים שנבחרו
function pickSampleExam(pool, totalTarget = 30) {
  const bySource = {};
  for (const q of pool) {
    if (!bySource[q.source]) bySource[q.source] = [];
    bySource[q.source].push(q);
  }
  const sources = Object.keys(bySource);
  if (sources.length === 0) return [];
  if (pool.length <= totalTarget) return shuffle(pool);

  const n = sources.length;
  const base = Math.floor(totalTarget / n);
  const extras = totalTarget % n;
  const shuffledSources = shuffle(sources);

  const result = [];
  const remaining = {};
  let deficit = 0;

  shuffledSources.forEach((src, i) => {
    const want = base + (i < extras ? 1 : 0);
    const questions = shuffle(bySource[src]);
    const take = Math.min(want, questions.length);
    result.push(...questions.slice(0, take));
    remaining[src] = questions.slice(take);
    if (take < want) deficit += want - take;
  });

  while (deficit > 0) {
    let added = false;
    for (const src of shuffledSources) {
      if (deficit === 0) break;
      if (remaining[src].length > 0) {
        result.push(remaining[src].shift());
        deficit--;
        added = true;
      }
    }
    if (!added) break;
  }

  return shuffle(result);
}

export default function MDAQuizApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("mda_logged_in") === "true");
  const [loginError, setLoginError] = useState("");

  const handleGoogleSuccess = (credentialResponse) => {
    localStorage.setItem("mda_logged_in", "true");
    try {
      const payload = JSON.parse(atob(credentialResponse.credential.split(".")[1]));
      localStorage.setItem("mda_user_name", payload.name || "");
      localStorage.setItem("mda_user_email", payload.email || "");
      posthog.identify(payload.email, { name: payload.name, email: payload.email });
      posthog.capture("login");
    } catch {}
    setIsLoggedIn(true);
    setLoginError("");
  };

  const handleGoogleError = () => {
    setLoginError("ההתחברות נכשלה, נסה שוב");
  };

  // screen: "home" | "chapters" | "topics" | "quiz" | "results"
  const [screen, setScreen] = useState("home");
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(new Set()); // נושאים נבחרים בתוך הפרק הפעיל
  const [lastQuizScope, setLastQuizScope] = useState(null); // { mode, chapterId, topics } — להפעלה חוזרת
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const activeChapter = selectedChapterId ? getChapterById(selectedChapterId) : null;

  // ── סנכרון ניווט עם היסטוריית הדפדפן (כפתורי קדימה/אחורה) ──
  // המסכים home/chapters/topics/quiz/results נדחפים כרשומות נפרדות.
  // popstate משחזר screen + selectedChapterId + selectedTopics.
  // קצוות: רענון באמצע quiz/results מאבד את שאלות התרגול בזיכרון →
  // popstate שמחזיר למצב ללא נתונים נופל חזרה ל-home.
  const skipNextHistoryPush = useRef(false);
  const isFirstHistoryRender = useRef(true);
  const quizQuestionsRef = useRef(quizQuestions);
  quizQuestionsRef.current = quizQuestions;

  useEffect(() => {
    const stateSnapshot = {
      screen,
      selectedChapterId,
      selectedTopics: [...selectedTopics],
    };
    if (isFirstHistoryRender.current) {
      isFirstHistoryRender.current = false;
      window.history.replaceState(stateSnapshot, "");
      return;
    }
    if (skipNextHistoryPush.current) {
      skipNextHistoryPush.current = false;
      return;
    }
    window.history.pushState(stateSnapshot, "");
    // selectedTopics מועבר רק כחלק מה-snapshot, לא כתלות — אחרת כל toggle יוסיף רשומה
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, selectedChapterId]);

  useEffect(() => {
    const handlePopState = (event) => {
      const s = event.state || { screen: "home" };
      let nextScreen = s.screen || "home";
      // אם רענון מחק את שאלות התרגול אבל היסטוריה זוכרת quiz/results — חזור ל-home
      if (
        (nextScreen === "quiz" || nextScreen === "results") &&
        quizQuestionsRef.current.length === 0
      ) {
        nextScreen = "home";
      }
      skipNextHistoryPush.current = true;
      setScreen(nextScreen);
      setSelectedChapterId(s.selectedChapterId ?? null);
      setSelectedTopics(new Set(s.selectedTopics || []));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const beginQuiz = (questions) => {
    if (questions.length === 0) return;
    setQuizQuestions(questions.map(shuffleOptions));
    setCurrentIdx(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setAnswers([]);
    setShowExplanation(false);
    setStreak(0);
    setMaxStreak(0);
    setScreen("quiz");
  };

  const openChapter = (chapterId) => {
    setSelectedChapterId(chapterId);
    setSelectedTopics(new Set());
    setScreen("topics");
  };

  const toggleTopic = (topic) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic); else next.add(topic);
      return next;
    });
  };

  // תרגול מלא של פרק
  const startChapterPractice = useCallback((chapterId) => {
    const ch = getChapterById(chapterId);
    if (!ch) return;
    const pool = getChapterQuestions(chapterId);
    posthog.capture("quiz_started", {
      mode: "practice",
      scope: "chapter",
      chapter_id: chapterId,
      chapter_title: ch.title,
      topic_count: ch.topics.length,
      question_pool: pool.length,
    });
    setLastQuizScope({ mode: "practice", chapterId, topics: null });
    beginQuiz(shuffle(pool));
  }, []);

  // מבחן לדוגמא על פרק יחיד
  const startChapterExam = useCallback((chapterId) => {
    const ch = getChapterById(chapterId);
    if (!ch) return;
    const pool = getChapterQuestions(chapterId);
    posthog.capture("quiz_started", {
      mode: "sample_exam",
      scope: "chapter",
      chapter_id: chapterId,
      chapter_title: ch.title,
      topic_count: ch.topics.length,
      question_pool: pool.length,
    });
    setLastQuizScope({ mode: "exam", chapterId, topics: null });
    beginQuiz(pickSampleExam(pool, SAMPLE_EXAM_SIZE));
  }, []);

  // תרגול נושאים נבחרים בתוך פרק
  const startTopicsPractice = useCallback(() => {
    if (!activeChapter || selectedTopics.size === 0) return;
    const topicList = [...selectedTopics];
    const pool = getQuestionsForTopics(topicList);
    posthog.capture("quiz_started", {
      mode: "practice",
      scope: "topics",
      chapter_id: activeChapter.id,
      chapter_title: activeChapter.title,
      topic_count: topicList.length,
      topics: topicList,
      question_pool: pool.length,
    });
    setLastQuizScope({ mode: "practice", chapterId: activeChapter.id, topics: topicList });
    beginQuiz(shuffle(pool));
  }, [activeChapter, selectedTopics]);

  // מבחן מקיף — דגימה מאוזנת על כל הפרקים
  const startFullExam = useCallback(() => {
    posthog.capture("quiz_started", {
      mode: "sample_exam",
      scope: "all",
      question_pool: QUESTIONS.length,
    });
    setLastQuizScope({ mode: "exam", chapterId: null, topics: null });
    beginQuiz(pickSampleExam(QUESTIONS, SAMPLE_EXAM_SIZE));
  }, []);

  // הפעלה חוזרת של אותו תרגול — משמש בכפתור "תרגול חדש" אחרי תוצאות
  const restartLastQuiz = useCallback(() => {
    if (!lastQuizScope) return;
    const { mode, chapterId, topics } = lastQuizScope;
    let pool;
    if (topics && topics.length) pool = getQuestionsForTopics(topics);
    else if (chapterId) pool = getChapterQuestions(chapterId);
    else pool = QUESTIONS;
    if (mode === "exam") beginQuiz(pickSampleExam(pool, SAMPLE_EXAM_SIZE));
    else beginQuiz(shuffle(pool));
  }, [lastQuizScope]);

  const handleSelect = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const q = quizQuestions[currentIdx];
    const isCorrect = idx === q.correct;
    posthog.capture("question_answered", {
      question_id: q.id,
      source: q.source,
      topic: q.topic,
      correct: isCorrect,
      question_number: currentIdx + 1,
      total_questions: quizQuestions.length,
    });
    if (isCorrect) {
      setScore(s => s + 1);
      setStreak(s => {
        const ns = s + 1;
        setMaxStreak(m => Math.max(m, ns));
        return ns;
      });
    } else {
      setStreak(0);
    }
    setAnswers(a => [...a, { qId: q.id, selected: idx, correct: q.correct, isCorrect }]);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= quizQuestions.length) {
      const finalScore = score + (answers.length > 0 && answers[answers.length - 1]?.isCorrect ? 0 : 0); // score is already updated
      posthog.capture("quiz_finished", {
        total_questions: quizQuestions.length,
        score,
        score_pct: Math.round((score / quizQuestions.length) * 100),
        topics: [...new Set(quizQuestions.map(q => q.source))],
      });
      setScreen("results");
    } else {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setAnswered(false);
      setShowExplanation(false);
    }
  };

  const currentQ = quizQuestions[currentIdx];
  const progress = quizQuestions.length > 0 ? ((currentIdx + (answered ? 1 : 0)) / quizQuestions.length) * 100 : 0;
  const pct = quizQuestions.length > 0 ? Math.round((score / quizQuestions.length) * 100) : 0;

  const getOptionStyle = (idx) => {
    if (!answered) {
      return selected === idx ? "opt-hover" : "";
    }
    if (idx === currentQ.correct) return "opt-correct";
    if (idx === selected && idx !== currentQ.correct) return "opt-wrong";
    return "opt-disabled";
  };

  const gradeLabel = pct >= 90 ? "מצוין!" : pct >= 75 ? "טוב מאוד" : pct >= 60 ? "סביר" : "צריך לחזור על החומר";
  const gradeEmoji = pct >= 90 ? "🏆" : pct >= 75 ? "👏" : pct >= 60 ? "📚" : "💪";

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&family=Rubik:wght@400;500;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .root-wrap {
          min-height: 100vh;
          font-family: 'Heebo', sans-serif;
          direction: rtl;
          background: #0a0e1a;
          color: #e8eaf0;
          position: relative;
          overflow: hidden;
        }

        .root-wrap::before {
          content: '';
          position: fixed;
          top: -50%;
          right: -30%;
          width: 80vw;
          height: 80vw;
          background: radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .root-wrap::after {
          content: '';
          position: fixed;
          bottom: -40%;
          left: -20%;
          width: 60vw;
          height: 60vw;
          background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .header {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          box-shadow: 0 4px 30px rgba(220,38,38,0.3);
        }

        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mda-star {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #fff;
        }

        .brand-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          font-weight: 300;
        }

        .home-btn {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Heebo', sans-serif;
          font-size: 13px;
          transition: all 0.2s;
        }

        .home-btn:hover {
          background: rgba(255,255,255,0.25);
        }

        .container {
          max-width: 640px;
          margin: 0 auto;
          padding: 24px 16px 40px;
          position: relative;
          z-index: 1;
        }

        /* HOME */
        .home-card {
          background: linear-gradient(145deg, rgba(30,35,55,0.9), rgba(20,24,40,0.95));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px 28px;
          margin-top: 12px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }

        .home-title {
          font-size: 28px;
          font-weight: 900;
          text-align: center;
          background: linear-gradient(135deg, #f87171, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 6px;
        }

        .home-subtitle {
          text-align: center;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          margin-bottom: 32px;
        }

        .filter-group {
          margin-bottom: 20px;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          margin-bottom: 8px;
          display: block;
        }

        .filter-select {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #e8eaf0;
          font-family: 'Heebo', sans-serif;
          font-size: 15px;
          appearance: none;
          cursor: pointer;
          transition: border-color 0.2s;
          direction: rtl;
        }

        .filter-select:focus {
          outline: none;
          border-color: rgba(220,38,38,0.5);
        }

        .filter-select option {
          background: #1e2337;
          color: #e8eaf0;
        }

        .chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          padding: 8px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          color: rgba(255,255,255,0.6);
          font-family: 'Heebo', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chip:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }

        .chip-active {
          background: rgba(220,38,38,0.15);
          border-color: rgba(220,38,38,0.4);
          color: #f87171;
        }

        .chip-active:hover {
          background: rgba(220,38,38,0.25);
        }

        .q-count {
          text-align: center;
          padding: 14px;
          background: rgba(220,38,38,0.08);
          border: 1px solid rgba(220,38,38,0.15);
          border-radius: 12px;
          margin: 24px 0;
          font-size: 14px;
          color: rgba(255,255,255,0.7);
        }

        .q-count strong {
          color: #f87171;
          font-size: 20px;
        }

        .start-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          border: none;
          border-radius: 14px;
          color: #fff;
          font-family: 'Heebo', sans-serif;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(220,38,38,0.3);
          position: relative;
          overflow: hidden;
        }

        .start-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(220,38,38,0.4);
        }

        .start-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .start-btn-secondary {
          margin-top: 12px;
          background: transparent;
          border: 2px solid #dc2626;
          box-shadow: none;
          color: #fca5a5;
        }

        .start-btn-secondary:hover {
          background: rgba(220,38,38,0.1);
          box-shadow: 0 4px 20px rgba(220,38,38,0.2);
        }

        /* HOME — action buttons (3-button layout) */
        .action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          margin-bottom: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          color: #e8eaf0;
          font-family: 'Heebo', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          text-align: right;
          direction: rtl;
        }

        .action-btn:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-1px);
        }

        .action-primary {
          background: linear-gradient(135deg, rgba(220,38,38,0.15), rgba(185,28,28,0.08));
          border-color: rgba(220,38,38,0.35);
        }

        .action-primary:hover {
          background: linear-gradient(135deg, rgba(220,38,38,0.22), rgba(185,28,28,0.12));
          border-color: rgba(220,38,38,0.55);
        }

        .action-icon {
          font-size: 28px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          flex-shrink: 0;
        }

        .action-body {
          flex: 1;
          min-width: 0;
        }

        .action-title {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .action-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }

        .action-chevron {
          font-size: 24px;
          color: rgba(255,255,255,0.3);
          font-weight: 300;
        }

        .home-meta {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          font-family: 'Rubik', sans-serif;
        }

        /* CHAPTERS / TOPICS list card */
        .list-card {
          background: linear-gradient(145deg, rgba(30,35,55,0.9), rgba(20,24,40,0.95));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 28px 22px;
          margin-top: 12px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }

        .breadcrumb {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 8px;
          font-family: 'Heebo', sans-serif;
        }

        .screen-title {
          font-size: 22px;
          font-weight: 800;
          color: #f1f5f9;
          margin-bottom: 4px;
        }

        .screen-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          margin-bottom: 22px;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .list-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          color: #e8eaf0;
          font-family: 'Heebo', sans-serif;
          cursor: pointer;
          transition: all 0.18s;
          text-align: right;
          direction: rtl;
        }

        .list-item:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(220,38,38,0.3);
          transform: translateX(2px);
        }

        .list-item-body {
          flex: 1;
          min-width: 0;
        }

        .list-item-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 2px;
          color: #f1f5f9;
        }

        .list-item-meta {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          font-family: 'Rubik', sans-serif;
        }

        .list-chevron {
          font-size: 22px;
          color: rgba(255,255,255,0.25);
          font-weight: 300;
        }

        /* TOPICS — CTAs + topic checkboxes */
        .cta-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .cta-btn {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          font-family: 'Heebo', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .cta-primary {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff;
          box-shadow: 0 4px 16px rgba(220,38,38,0.25);
        }

        .cta-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(220,38,38,0.35);
        }

        .cta-secondary {
          background: transparent;
          border: 1.5px solid rgba(220,38,38,0.5) !important;
          color: #fca5a5;
        }

        .cta-secondary:hover {
          background: rgba(220,38,38,0.08);
        }

        .cta-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .section-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 8px 0 14px;
          color: rgba(255,255,255,0.35);
          font-size: 12px;
        }

        .section-divider::before,
        .section-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        .topic-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .topic-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          color: #d1d5db;
          font-family: 'Heebo', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: right;
          direction: rtl;
        }

        .topic-row:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
        }

        .topic-row:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .topic-row-active {
          background: rgba(220,38,38,0.1) !important;
          border-color: rgba(220,38,38,0.4) !important;
          color: #fca5a5;
        }

        .topic-check {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 1.5px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
          background: rgba(0,0,0,0.15);
        }

        .topic-check-on {
          background: #dc2626;
          border-color: #dc2626;
          color: #fff;
        }

        .topic-name {
          flex: 1;
          min-width: 0;
        }

        .topic-count {
          font-family: 'Rubik', sans-serif;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.05);
          padding: 2px 9px;
          border-radius: 10px;
          flex-shrink: 0;
        }

        /* QUIZ */
        .progress-bar {
          width: 100%;
          height: 5px;
          background: rgba(255,255,255,0.08);
          border-radius: 3px;
          margin-bottom: 20px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #dc2626, #f87171);
          border-radius: 3px;
          transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .quiz-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .quiz-counter {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          font-family: 'Rubik', sans-serif;
        }

        .quiz-score {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
        }

        .score-num {
          background: rgba(220,38,38,0.15);
          padding: 3px 10px;
          border-radius: 20px;
          color: #f87171;
          font-weight: 700;
          font-family: 'Rubik', sans-serif;
        }

        .streak-badge {
          background: rgba(251,191,36,0.15);
          padding: 3px 10px;
          border-radius: 20px;
          color: #fbbf24;
          font-size: 12px;
          font-weight: 600;
        }

        .quiz-card {
          background: linear-gradient(145deg, rgba(30,35,55,0.95), rgba(20,24,40,0.98));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          animation: cardIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .topic-tag {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(59,130,246,0.12);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 20px;
          font-size: 12px;
          color: #93c5fd;
          margin-bottom: 16px;
        }

        .q-text {
          font-size: 19px;
          font-weight: 700;
          line-height: 1.6;
          margin-bottom: 24px;
          color: #f1f5f9;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .opt-btn {
          width: 100%;
          text-align: right;
          padding: 14px 18px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #d1d5db;
          font-family: 'Heebo', sans-serif;
          font-size: 15px;
          line-height: 1.5;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          position: relative;
        }

        .opt-btn:not(.opt-correct):not(.opt-wrong):not(.opt-disabled):hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.15);
          transform: translateX(-2px);
        }

        .opt-letter {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          font-family: 'Rubik', sans-serif;
          color: rgba(255,255,255,0.4);
          margin-top: 1px;
        }

        .opt-correct {
          background: rgba(34,197,94,0.1) !important;
          border-color: rgba(34,197,94,0.4) !important;
          color: #86efac !important;
          cursor: default;
        }

        .opt-correct .opt-letter {
          background: rgba(34,197,94,0.3);
          color: #22c55e;
        }

        .opt-wrong {
          background: rgba(239,68,68,0.1) !important;
          border-color: rgba(239,68,68,0.4) !important;
          color: #fca5a5 !important;
          cursor: default;
        }

        .opt-wrong .opt-letter {
          background: rgba(239,68,68,0.3);
          color: #ef4444;
        }

        .opt-disabled {
          opacity: 0.35;
          cursor: default;
        }

        .explanation-box {
          margin-top: 20px;
          padding: 16px 18px;
          background: rgba(251,191,36,0.06);
          border: 1px solid rgba(251,191,36,0.15);
          border-radius: 14px;
          animation: fadeUp 0.3s ease;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .explanation-label {
          font-size: 12px;
          font-weight: 700;
          color: #fbbf24;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .explanation-text {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
        }

        .next-btn {
          width: 100%;
          padding: 14px;
          margin-top: 20px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          border: none;
          border-radius: 14px;
          color: #fff;
          font-family: 'Heebo', sans-serif;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .next-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(220,38,38,0.3);
        }

        /* RESULTS */
        .results-card {
          background: linear-gradient(145deg, rgba(30,35,55,0.95), rgba(20,24,40,0.98));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px 28px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          animation: cardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .result-emoji {
          font-size: 56px;
          margin-bottom: 12px;
          animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes popIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }

        .result-grade {
          font-size: 28px;
          font-weight: 900;
          background: linear-gradient(135deg, #f87171, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }

        .result-score {
          font-size: 48px;
          font-weight: 900;
          font-family: 'Rubik', sans-serif;
          color: #fff;
          margin-bottom: 4px;
        }

        .result-detail {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 24px;
        }

        .stats-row {
          display: flex;
          gap: 12px;
          margin-bottom: 28px;
        }

        .stat-box {
          flex: 1;
          padding: 14px 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
        }

        .stat-value {
          font-size: 22px;
          font-weight: 900;
          font-family: 'Rubik', sans-serif;
        }

        .stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin-top: 4px;
        }

        .stat-correct .stat-value { color: #22c55e; }
        .stat-wrong .stat-value { color: #ef4444; }
        .stat-streak .stat-value { color: #fbbf24; }

        .review-section {
          margin-top: 28px;
          text-align: right;
        }

        .review-title {
          font-size: 16px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          margin-bottom: 14px;
          text-align: center;
        }

        .review-item {
          padding: 14px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          margin-bottom: 8px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .review-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          margin-top: 2px;
        }

        .review-correct .review-icon { background: rgba(34,197,94,0.2); color: #22c55e; }
        .review-wrong .review-icon { background: rgba(239,68,68,0.2); color: #ef4444; }

        .review-q {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          line-height: 1.5;
        }

        .review-answer {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          margin-top: 4px;
        }

        .btn-row {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }

        .btn-row button {
          flex: 1;
          padding: 14px;
          border-radius: 14px;
          font-family: 'Heebo', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff;
        }

        .btn-secondary {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: rgba(255,255,255,0.7);
        }

        .btn-retry-wrong {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.25) !important;
          color: #fca5a5;
        }
        .login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Heebo', sans-serif;
          direction: rtl;
          background: #0a0e1a;
          position: relative;
          overflow: hidden;
        }
        .login-wrap::before {
          content: '';
          position: fixed;
          top: -50%;
          right: -30%;
          width: 80vw;
          height: 80vw;
          background: radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-card {
          background: linear-gradient(160deg, rgba(30,34,52,0.98) 0%, rgba(20,24,40,0.98) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 48px 36px 40px;
          width: 90%;
          max-width: 380px;
          text-align: center;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,255,255,0.07);
          backdrop-filter: blur(20px);
        }
        .login-logo {
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-logo-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(220,38,38,0.2), rgba(185,28,28,0.1));
          border: 1.5px solid rgba(220,38,38,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 32px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .login-title {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 6px;
          letter-spacing: 0.3px;
        }
        .login-subtitle {
          font-size: 13px;
          color: rgba(139,146,168,0.9);
          margin-bottom: 32px;
          letter-spacing: 0.5px;
        }
        .login-divider {
          width: 40px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(220,38,38,0.6), transparent);
          margin: 0 auto 28px;
        }
        .login-error {
          color: #f87171;
          font-size: 14px;
          margin-top: 12px;
        }
      `}</style>

      {!isLoggedIn ? (
        <div className="login-wrap">
          <div className="login-card">
            <div className="login-logo">
              <div className="login-logo-circle">
                <svg viewBox="0 0 100 100" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f87171"/>
                      <stop offset="100%" stopColor="#b91c1c"/>
                    </linearGradient>
                  </defs>
                  <polygon
                    points="50,10 61,31 83,31 72,50 83,69 61,69 50,90 39,69 17,69 28,50 17,31 39,31"
                    fill="url(#starGrad)"
                  />
                </svg>
              </div>
            </div>
            <div className="login-title">מד״א — בנק שאלות</div>
            <div className="login-subtitle">בית הספר לפראמדיקים</div>
            <div className="login-divider"></div>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              locale="he"
              shape="pill"
            />
            {loginError && <div className="login-error">{loginError}</div>}
          </div>
        </div>
      ) : (
      <div className="root-wrap">
        <div className="header">
          <div className="logo-area">
            <div className="mda-star">✡</div>
            <div className="brand-text">
              <div className="brand-title">מד״א — בנק שאלות</div>
              <div className="brand-sub">בית הספר לפראמדיקים</div>
            </div>
          </div>
          {screen !== "home" && (
            <button
              className="home-btn"
              onClick={() => {
                if (screen === "topics") setScreen("chapters");
                else setScreen("home");
              }}
            >
              {screen === "topics" ? "→ פרקים" : "→ תפריט ראשי"}
            </button>
          )}
        </div>

        <div className="container">
          {screen === "home" && (
            <div className="home-card">
              <div className="home-title">תרגול למבחן</div>
              <div className="home-subtitle">בית הספר לפראמדיקים — מד״א</div>

              <button
                className="action-btn action-primary"
                onClick={() => setScreen("chapters")}
              >
                <div className="action-icon">🎯</div>
                <div className="action-body">
                  <div className="action-title">תרגול לפי פרק</div>
                  <div className="action-sub">בחר פרק ונושאים מתוכו</div>
                </div>
                <div className="action-chevron">‹</div>
              </button>

              <button
                className="action-btn action-secondary"
                onClick={startFullExam}
              >
                <div className="action-icon">📝</div>
                <div className="action-body">
                  <div className="action-title">מבחן מקיף</div>
                  <div className="action-sub">{SAMPLE_EXAM_SIZE} שאלות מכל הפרקים</div>
                </div>
                <div className="action-chevron">‹</div>
              </button>

              <div className="home-meta">
                {QUESTIONS.length} שאלות · {CHAPTERS.length} פרקים
              </div>
            </div>
          )}

          {screen === "chapters" && (
            <div className="list-card">
              <div className="screen-title">בחר פרק</div>
              <div className="screen-sub">לחץ על פרק לבחירת נושאים</div>
              <div className="list">
                {CHAPTERS.map(ch => {
                  const qCount = getChapterQuestionCount(ch.id);
                  return (
                    <button
                      key={ch.id}
                      className="list-item"
                      onClick={() => openChapter(ch.id)}
                    >
                      <div className="list-item-body">
                        <div className="list-item-title">{ch.title}</div>
                        <div className="list-item-meta">
                          {ch.topics.length} נושאים · {qCount} שאלות
                        </div>
                      </div>
                      <div className="list-chevron">‹</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {screen === "topics" && activeChapter && (
            <div className="list-card">
              <div className="breadcrumb">פרקים › {activeChapter.title}</div>
              <div className="screen-title">{activeChapter.title}</div>
              <div className="screen-sub">
                {activeChapter.topics.length} נושאים · {getChapterQuestionCount(activeChapter.id)} שאלות
              </div>

              <div className="cta-row">
                <button
                  className="cta-btn cta-primary"
                  onClick={() => startChapterPractice(activeChapter.id)}
                >
                  תרגל את כל הנושאים
                </button>
                <button
                  className="cta-btn cta-secondary"
                  onClick={() => startChapterExam(activeChapter.id)}
                  disabled={getChapterQuestionCount(activeChapter.id) === 0}
                >
                  מבחן על הפרק ({SAMPLE_EXAM_SIZE} שאלות)
                </button>
              </div>

              <div className="section-divider">
                <span>או בחר נושאים ספציפיים</span>
              </div>

              <div className="topic-list">
                {activeChapter.topics.map(topic => {
                  const count = getTopicQuestionCount(topic);
                  const checked = selectedTopics.has(topic);
                  return (
                    <button
                      key={topic}
                      className={`topic-row ${checked ? "topic-row-active" : ""}`}
                      onClick={() => toggleTopic(topic)}
                      disabled={count === 0}
                    >
                      <span className={`topic-check ${checked ? "topic-check-on" : ""}`}>
                        {checked ? "✓" : ""}
                      </span>
                      <span className="topic-name">{topic}</span>
                      <span className="topic-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {selectedTopics.size > 0 && (
                <button
                  className="start-btn"
                  style={{ marginTop: 16 }}
                  onClick={startTopicsPractice}
                >
                  תרגל את הנבחרים ({getQuestionsForTopics([...selectedTopics]).length} שאלות)
                </button>
              )}
            </div>
          )}

          {screen === "quiz" && currentQ && (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>

              <div className="quiz-meta">
                <div className="quiz-counter">
                  שאלה {currentIdx + 1} מתוך {quizQuestions.length}
                </div>
                <div className="quiz-score">
                  {streak >= 3 && <span className="streak-badge">🔥 {streak}</span>}
                  <span className="score-num">{score}/{currentIdx + (answered ? 1 : 0)}</span>
                </div>
              </div>

              <div className="quiz-card">
                <div className="topic-tag">{currentQ.topic}</div>
                <div className="q-text">{currentQ.question}</div>

                <div className="options-list">
                  {currentQ.options.map((opt, idx) => (
                    <button
                      key={idx}
                      className={`opt-btn ${getOptionStyle(idx)}`}
                      onClick={() => handleSelect(idx)}
                      disabled={answered}
                    >
                      <span className="opt-letter">{["א","ב","ג","ד"][idx]}</span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>

                {showExplanation && (
                  <div className="explanation-box">
                    <div className="explanation-label">
                      💡 הסבר
                    </div>
                    <div className="explanation-text">{currentQ.explanation}</div>
                  </div>
                )}

                {answered && (
                  <button className="next-btn" onClick={nextQuestion}>
                    {currentIdx + 1 >= quizQuestions.length ? "סיום וצפייה בתוצאות" : "שאלה הבאה ←"}
                  </button>
                )}
              </div>
            </>
          )}

          {screen === "results" && (
            <div className="results-card">
              <div className="result-emoji">{gradeEmoji}</div>
              <div className="result-grade">{gradeLabel}</div>
              <div className="result-score">{pct}%</div>
              <div className="result-detail">
                {score} תשובות נכונות מתוך {quizQuestions.length}
              </div>

              <div className="stats-row">
                <div className="stat-box stat-correct">
                  <div className="stat-value">{score}</div>
                  <div className="stat-label">נכונות ✓</div>
                </div>
                <div className="stat-box stat-wrong">
                  <div className="stat-value">{quizQuestions.length - score}</div>
                  <div className="stat-label">שגויות ✗</div>
                </div>
                <div className="stat-box stat-streak">
                  <div className="stat-value">{maxStreak}</div>
                  <div className="stat-label">רצף מקסימלי 🔥</div>
                </div>
              </div>

              {answers.some(a => !a.isCorrect) && (
                <div className="review-section">
                  <div className="review-title">שאלות שטעית בהן</div>
                  {answers.filter(a => !a.isCorrect).map((a, i) => {
                    const q = QUESTIONS.find(qq => qq.id === a.qId);
                    return (
                      <div key={i} className="review-item review-wrong">
                        <div className="review-icon">✗</div>
                        <div>
                          <div className="review-q">{q.question}</div>
                          <div className="review-answer">
                            התשובה הנכונה: {q.options[q.correct]}
                          </div>
                          {q.explanation && (
                            <div className="review-answer" style={{ marginTop: 4, color: "rgba(251,191,36,0.7)" }}>
                              💡 {q.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="btn-row">
                <button className="btn-primary" onClick={restartLastQuiz}>תרגול חדש</button>
                <button className="btn-secondary" onClick={() => setScreen("home")}>תפריט</button>
              </div>

              {answers.some(a => !a.isCorrect) && (
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button
                    className="btn-retry-wrong"
                    onClick={() => {
                      const wrongIds = answers.filter(a => !a.isCorrect).map(a => a.qId);
                      const wrongQs = shuffle(QUESTIONS.filter(q => wrongIds.includes(q.id))).map(shuffleOptions);
                      setQuizQuestions(wrongQs);
                      setCurrentIdx(0);
                      setSelected(null);
                      setAnswered(false);
                      setScore(0);
                      setAnswers([]);
                      setShowExplanation(false);
                      setStreak(0);
                      setMaxStreak(0);
                      setScreen("quiz");
                    }}
                  >
                    תרגל רק שאלות שטעיתי ({answers.filter(a => !a.isCorrect).length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
