"use client";

import { useCallback, useEffect, useState } from "react";

type Mode = "solo" | "versus";

// رموز عشوائية مميّزة — لا ترتيب منطقي لها، الترتيب الصحيح سرّي يُكتشف بالاستنتاج
const POOL = ["🍎", "🍌", "🍇", "🍊", "🍓", "🫐", "🥝", "🍍"];
const MAX_LEVEL = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// خلط يضمن اختلافه عن المرجع
function shuffleDifferent<T>(ref: T[]): T[] {
  let s = shuffle(ref);
  let guard = 0;
  while (s.every((v, i) => v === ref[i]) && guard++ < 30) s = shuffle(ref);
  return s;
}

function countCorrect(arr: string[], secret: string[]) {
  return arr.reduce((n, v, i) => (v === secret[i] ? n + 1 : n), 0);
}

type Attempt = { guess: string[]; correct: number };

export default function RankingGame({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("solo");
  const [level, setLevel] = useState(2);

  const [tokens, setTokens] = useState<string[]>([]); // العناصر المختارة لهذه الجولة
  const [secret, setSecret] = useState<string[]>([]); // الترتيب السرّي
  const [arr, setArr] = useState<string[]>([]); // محاولة اللاعب الحالية
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [solved, setSolved] = useState(false);

  // منافسة
  const [vsTurn, setVsTurn] = useState<1 | 2>(1);
  const [p1Tries, setP1Tries] = useState<number | null>(null);
  const [p2Tries, setP2Tries] = useState<number | null>(null);
  const [wins, setWins] = useState({ p1: 0, p2: 0 });

  const isVersus = mode === "versus";

  const setupRound = useCallback((lvl: number) => {
    const picked = shuffle(POOL).slice(0, lvl);
    const sec = shuffleDifferent(picked);
    setTokens(picked);
    setSecret(sec);
    setArr([...picked]); // يبدأ بترتيب يختلف عن السرّي
    setAttempts([]);
    setSolved(false);
    setVsTurn(1);
    setP1Tries(null);
    setP2Tries(null);
  }, []);

  useEffect(() => {
    setupRound(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setLevel(2);
    setWins({ p1: 0, p2: 0 });
    setupRound(2);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    setArr(next);
  };

  const guess = () => {
    const c = countCorrect(arr, secret);
    const tries = attempts.length + 1;
    setAttempts((a) => [...a, { guess: [...arr], correct: c }]);

    if (c < level) return; // ما اكتشف الترتيب بعد

    // اكتشف الترتيب كامل
    if (!isVersus) {
      setSolved(true);
      return;
    }
    if (vsTurn === 1) {
      setP1Tries(tries);
      // اللاعب الثاني يحلّ نفس السرّ من جديد
      setArr([...tokens]);
      setAttempts([]);
      setVsTurn(2);
    } else {
      setP2Tries(tries);
      setSolved(true);
      const t1 = p1Tries ?? 999;
      if (t1 < tries) setWins((w) => ({ ...w, p1: w.p1 + 1 }));
      else if (tries < t1) setWins((w) => ({ ...w, p2: w.p2 + 1 }));
    }
  };

  const next = (advance: boolean) => {
    const lvl = advance ? Math.min(MAX_LEVEL, level + 1) : level;
    setLevel(lvl);
    setupRound(lvl);
  };

  const playerColor = (n: 1 | 2) => (n === 1 ? "text-sky-400" : "text-pink-400");
  const playerName = (n: 1 | 2) => (n === 1 ? "اللاعب ١" : "اللاعب ٢");
  const vsWinner =
    p1Tries === null || p2Tries === null
      ? null
      : p1Tries < p2Tries
        ? 1
        : p2Tries < p1Tries
          ? 2
          : 0;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6">
      <header className="text-center relative w-full max-w-md">
        <button
          onClick={onBack}
          className="absolute right-0 top-1 text-slate-400 text-sm hover:text-slate-200"
        >
          ← الألعاب
        </button>
        <h1 className="text-4xl font-extrabold tracking-tight">🧩 رتّبها</h1>
        <p className="text-slate-400 mt-2">
          للعناصر ترتيب سرّي — خمّن، واكتشف كم وحدة في مكانها، وحاول مرّة ثانية
        </p>
      </header>

      {/* الوضع */}
      <div className="flex gap-2 bg-slate-800/60 p-1 rounded-2xl">
        {(
          [
            ["solo", "👤 فردي"],
            ["versus", "🆚 منافسة"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              mode === m ? "bg-indigo-500 text-white" : "text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* لوحة المنافسة */}
      {isVersus && (
        <div className="w-full max-w-md flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-6 text-center">
            <div>
              <p className={`text-3xl font-black tabular-nums ${playerColor(1)}`}>{wins.p1}</p>
              <p className="text-slate-400 text-xs">اللاعب ١</p>
            </div>
            <span className="text-slate-500 font-bold">—</span>
            <div>
              <p className={`text-3xl font-black tabular-nums ${playerColor(2)}`}>{wins.p2}</p>
              <p className="text-slate-400 text-xs">اللاعب ٢</p>
            </div>
          </div>
          {!solved && (
            <p className="text-sm font-bold">
              <span className={playerColor(vsTurn)}>دور {playerName(vsTurn)}</span>
              {vsTurn === 2 && p1Tries !== null && (
                <span className="text-slate-400 font-normal">
                  {" "}
                  (اللاعب ١ اكتشفه بـ {p1Tries} محاولة)
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* بطاقة اللعبة */}
      <section className="w-full max-w-md bg-slate-800/50 border border-slate-700/60 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-indigo-300 bg-indigo-500/15 px-3 py-1 rounded-full">
            {level} عناصر
          </span>
          <span className="text-xs text-slate-400">المحاولة {attempts.length + 1}</span>
        </div>

        {!solved ? (
          <>
            {/* القائمة القابلة لإعادة الترتيب */}
            <ol className="flex flex-col gap-2">
              {arr.map((item, i) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 border bg-slate-900/50 border-slate-700"
                >
                  <span className="w-6 text-center text-slate-400 font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-3xl">{item}</span>
                  <span className="flex gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="w-9 h-9 rounded-xl bg-slate-700 disabled:opacity-30 active:scale-90 transition text-lg"
                      aria-label="تحريك لأعلى"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === arr.length - 1}
                      className="w-9 h-9 rounded-xl bg-slate-700 disabled:opacity-30 active:scale-90 transition text-lg"
                      aria-label="تحريك لأسفل"
                    >
                      ▼
                    </button>
                  </span>
                </li>
              ))}
            </ol>

            <button
              onClick={guess}
              className="mt-5 w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xl font-black transition active:scale-95"
            >
              خمّن ✓
            </button>
          </>
        ) : (
          /* النتيجة النهائية */
          <div className="text-center animate-pop py-2">
            {!isVersus ? (
              <>
                <p className="text-2xl font-black text-emerald-400">اكتشفت الترتيب! 🎉</p>
                <p className="mt-2 text-slate-300">
                  بـ <span className="font-black text-white">{attempts.length}</span>{" "}
                  محاولة
                </p>
                <div className="flex justify-center gap-2 mt-4 text-3xl">
                  {secret.map((s, i) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-around">
                  <div>
                    <p className={`text-xs font-bold ${playerColor(1)}`}>اللاعب ١</p>
                    <p className="text-2xl font-black">{p1Tries} محاولة</p>
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${playerColor(2)}`}>اللاعب ٢</p>
                    <p className="text-2xl font-black">{p2Tries} محاولة</p>
                  </div>
                </div>
                <p className="mt-3 text-xl font-black">
                  {vsWinner === 0 ? (
                    <span className="text-amber-300">تعادل! 🤝</span>
                  ) : (
                    <span className={playerColor(vsWinner as 1 | 2)}>
                      فاز {playerName(vsWinner as 1 | 2)} 🏆
                    </span>
                  )}
                </p>
                <p className="text-slate-400 text-xs mt-1">الأقل محاولات يفوز</p>
              </>
            )}

            <button
              onClick={() => next(true)}
              className="mt-5 w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xl font-black transition active:scale-95"
            >
              التالي (أصعب) ←
            </button>
            <button
              onClick={() => next(false)}
              className="mt-2 w-full py-2 text-slate-400 text-sm underline underline-offset-4"
            >
              نفس المستوى من جديد
            </button>
          </div>
        )}

        {/* سجلّ المحاولات — يساعد على الاستنتاج */}
        {attempts.length > 0 && !solved && (
          <div className="mt-5 border-t border-slate-700/60 pt-3">
            <p className="text-slate-400 text-xs mb-2">محاولاتك السابقة:</p>
            <ul className="flex flex-col gap-1.5">
              {attempts.map((a, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between bg-slate-900/40 rounded-xl px-3 py-1.5"
                >
                  <span className="flex gap-1 text-xl">
                    {a.guess.map((g, i) => (
                      <span key={i}>{g}</span>
                    ))}
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {a.correct} ✓ في مكانها
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
