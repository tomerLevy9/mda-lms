import { useState, useCallback } from "react";
import { GoogleLogin } from "@react-oauth/google";
import QUESTIONS from "./questions.js";


const SOURCES = [...new Set(QUESTIONS.map(q => q.source))];

// קבוצות של שיעורים — קיצורי דרך לבחירה מהירה
const GROUPS = {
  "מבואות": SOURCES,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem("mda_logged_in") === "true");
  const [loginError, setLoginError] = useState("");

  const handleGoogleSuccess = () => {
    sessionStorage.setItem("mda_logged_in", "true");
    setIsLoggedIn(true);
    setLoginError("");
  };

  const handleGoogleError = () => {
    setLoginError("ההתחברות נכשלה, נסה שוב");
  };

  const [screen, setScreen] = useState("home");
  const [filterSources, setFilterSources] = useState(new Set());
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const toggleGroup = (groupName) => {
    const groupSources = GROUPS[groupName] || [];
    setFilterSources(prev => {
      const allSelected = groupSources.every(s => prev.has(s));
      const next = new Set(prev);
      if (allSelected) {
        groupSources.forEach(s => next.delete(s));
      } else {
        groupSources.forEach(s => next.add(s));
      }
      return next;
    });
  };

  const beginQuiz = (questions) => {
    if (questions.length === 0) return;
    setQuizQuestions(questions);
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

  const getFilteredPool = useCallback(() => {
    let pool = QUESTIONS;
    if (filterSources.size > 0) pool = pool.filter(q => filterSources.has(q.source));
    return pool;
  }, [filterSources]);

  const startQuiz = useCallback(() => {
    beginQuiz(shuffle(getFilteredPool()));
  }, [getFilteredPool]);

  const startSampleExam = useCallback(() => {
    beginQuiz(pickSampleExam(getFilteredPool(), 30));
  }, [getFilteredPool]);

  const handleSelect = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = idx === quizQuestions[currentIdx].correct;
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
    setAnswers(a => [...a, { qId: quizQuestions[currentIdx].id, selected: idx, correct: quizQuestions[currentIdx].correct, isCorrect }]);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= quizQuestions.length) {
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
          background: rgba(30,34,50,0.95);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 40px 32px;
          width: 90%;
          max-width: 380px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .login-logo {
          font-size: 48px;
          margin-bottom: 8px;
        }
        .login-title {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        .login-subtitle {
          font-size: 14px;
          color: #8b92a8;
          margin-bottom: 28px;
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
            <div className="login-logo">✡</div>
            <div className="login-title">מד״א — בנק שאלות</div>
            <div className="login-subtitle">בית הספר לפראמדיקים</div>
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
            <button className="home-btn" onClick={() => setScreen("home")}>← תפריט ראשי</button>
          )}
        </div>

        <div className="container">
          {screen === "home" && (
            <div className="home-card">
              <div className="home-title">תרגול למבחן</div>
              <div className="home-subtitle">כימיה וביולוגיה — קורס פראמדיקים</div>

              <div className="filter-group">
                <label className="filter-label">קיצורי דרך</label>
                <div className="chip-list">
                  {Object.keys(GROUPS).map(g => {
                    const groupSources = GROUPS[g];
                    const allSelected = groupSources.length > 0 && groupSources.every(s => filterSources.has(s));
                    return (
                      <button
                        key={g}
                        className={`chip ${allSelected ? "chip-active" : ""}`}
                        onClick={() => toggleGroup(g)}
                      >
                        כל {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">סנן לפי שיעור</label>
                <div className="chip-list">
                  {SOURCES.map(s => (
                    <button
                      key={s}
                      className={`chip ${filterSources.has(s) ? "chip-active" : ""}`}
                      onClick={() => {
                        setFilterSources(prev => {
                          const next = new Set(prev);
                          if (next.has(s)) next.delete(s); else next.add(s);
                          return next;
                        });
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="q-count">
                <strong>{
                  QUESTIONS.filter(q =>
                    filterSources.size === 0 || filterSources.has(q.source)
                  ).length
                }</strong> שאלות זמינות
              </div>

              <button
                className="start-btn"
                onClick={startQuiz}
                disabled={QUESTIONS.filter(q =>
                  filterSources.size === 0 || filterSources.has(q.source)
                ).length === 0}
              >
                התחל תרגול
              </button>

              <button
                className="start-btn start-btn-secondary"
                onClick={startSampleExam}
                disabled={QUESTIONS.filter(q =>
                  filterSources.size === 0 || filterSources.has(q.source)
                ).length === 0}
              >
                מבחן לדוגמא (30 שאלות)
              </button>
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="btn-row">
                <button className="btn-primary" onClick={startQuiz}>תרגול חדש</button>
                <button className="btn-secondary" onClick={() => setScreen("home")}>תפריט</button>
              </div>

              {answers.some(a => !a.isCorrect) && (
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button
                    className="btn-retry-wrong"
                    onClick={() => {
                      const wrongIds = answers.filter(a => !a.isCorrect).map(a => a.qId);
                      const wrongQs = shuffle(QUESTIONS.filter(q => wrongIds.includes(q.id)));
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
