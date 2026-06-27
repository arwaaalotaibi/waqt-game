"use client";

import { useCallback, useEffect, useState } from "react";

type Mode = "solo" | "versus";
type Phase = "arranging" | "result";

// تصنيفات: كل واحد ترتيبه الصحيح من الأصغر/الأول إلى الأكبر/الأخير
const CATEGORIES: { hint: string; items: string[] }[] = [
  { hint: "رتّب من الأصغر إلى الأكبر حجمًا", items: ["نملة", "فأر", "قطة", "كلب", "حصان", "فيل", "حوت"] },
  { hint: "رتّب الكواكب من الأقرب إلى الأبعد عن الشمس", items: ["عطارد", "الزهرة", "الأرض", "المريخ", "المشتري", "زحل", "أورانوس"] },
  { hint: "رتّب أيام الأسبوع بالترتيب", items: ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] },
  { hint: "رتّب من الأصغر إلى الأكبر عددًا", items: ["واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة"] },
  { hint: "رتّب مراحل العمر من الأصغر", items: ["رضيع", "طفل", "مراهق", "شاب", "كهل", "مسنّ"] },
  { hint: "رتّب أوقات اليوم بالترتيب", items: ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"] },
];

const MAX_LEVEL = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// خلط مع ضمان ألّا يطابق الترتيب الصحيح
function shuffleDifferent(correct: string[]): string[] {
  let s = shuffle(correct);
  let guard = 0;
  while (s.every((v, i) => v === correct[i]) && guard++ < 20) {
    s = shuffle(correct);
  }
  return s;
}

function countCorrect(arr: string[], correct: string[]) {
  return arr.reduce((n, v, i) => (v === correct[i] ? n + 1 : n), 0);
}

function buildRound(level: number) {
  const pool = CATEGORIES.filter((c) => c.items.length >= level);
  const cat = pool[Math.floor(Math.random() * pool.length)];
  const correct = cat.items.slice(0, level);
  return { hint: cat.hint, correct, shuffled: shuffleDifferent(correct) };
}

export default function RankingGame({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("solo");
  const [level, setLevel] = useState(2);
  const [hint, setHint] = useState("");
  const [correct, setCorrect] = useState<string[]>([]);
  const [initial, setInitial] = useState<string[]>([]); // الخلط الأصلي (لمساواة اللاعبَين)
  const [arr, setArr] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("arranging");

  // فردي
  const [soloCorrect, setSoloCorrect] = useState(0);
  const [bestLevel, setBestLevel] = useState(2);

  // منافسة
  const [vsTurn, setVsTurn] = useState<1 | 2>(1);
  const [p1, setP1] = useState<number | null>(null);
  const [p2, setP2] = useState<number | null>(null);
  const [wins, setWins] = useState({ p1: 0, p2: 0 });

  const isVersus = mode === "versus";

  const setupRound = useCallback((lvl: number) => {
    const r = buildRound(lvl);
    setHint(r.hint);
    setCorrect(r.correct);
    setInitial(r.shuffled);
    setArr(r.shuffled);
    setPhase("arranging");
    setVsTurn(1);
    setP1(null);
    setP2(null);
  }, []);

  useEffect(() => {
    setupRound(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setLevel(2);
    setWins({ p1: 0, p2: 0 });
    setBestLevel(2);
    setupRound(2);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    setArr(next);
  };

  const submit = () => {
    const c = countCorrect(arr, correct);
    if (!isVersus) {
      setSoloCorrect(c);
      setPhase("result");
      if (c === level) setBestLevel((b) => Math.max(b, level));
      return;
    }
    // منافسة
    if (vsTurn === 1) {
      setP1(c);
      setArr(initial); // نفس البداية للّاعب الثاني
      setVsTurn(2);
      setPhase("arranging");
    } else {
      setP2(c);
      setPhase("result");
      const c1 = p1 ?? 0;
      if (c1 > c) setWins((w) => ({ ...w, p1: w.p1 + 1 }));
      else if (c > c1) setWins((w) => ({ ...w, p2: w.p2 + 1 }));
    }
  };

  // فردي: التالي يزيد العدد عند الفوز الكامل، وإلا يعيد نفس المستوى
  const nextSolo = (advance: boolean) => {
    const lvl = advance ? Math.min(MAX_LEVEL, level + 1) : level;
    setLevel(lvl);
    setupRound(lvl);
  };

  // منافسة: الجولة القادمة تزيد العدد دائمًا
  const nextVersus = () => {
    const lvl = Math.min(MAX_LEVEL, level + 1);
    setLevel(lvl);
    setupRound(lvl);
  };

  const allCorrect = soloCorrect === level;
  const bothPlayed = p1 !== null && p2 !== null;
  const vsWinner = !bothPlayed ? null : (p1 ?? 0) > (p2 ?? 0) ? 1 : (p2 ?? 0) > (p1 ?? 0) ? 2 : 0;
  const playerColor = (n: 1 | 2) => (n === 1 ? "text-sky-400" : "text-pink-400");
  const playerName = (n: 1 | 2) => (n === 1 ? "اللاعب ١" : "اللاعب ٢");

  // في النتيجة نلوّن كل عنصر حسب صحّة مكانه
  const showResult = phase === "result";

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
        <p className="text-slate-400 mt-2">رتّب العناصر صح… وشوف كم وحدة في مكانها</p>
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
          {!showResult && (
            <p className="text-sm font-bold">
              <span className={playerColor(vsTurn)}>دور {playerName(vsTurn)}</span>
            </p>
          )}
        </div>
      )}

      {/* بطاقة اللعبة */}
      <section className="w-full max-w-md bg-slate-800/50 border border-slate-700/60 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-indigo-300 bg-indigo-500/15 px-3 py-1 rounded-full">
            {level} عناصر
          </span>
          {!isVersus && (
            <span className="text-xs text-slate-400">أعلى مستوى: {bestLevel}</span>
          )}
        </div>
        <p className="text-center text-lg font-bold mb-5 mt-2">{hint}</p>

        {/* القائمة القابلة لإعادة الترتيب */}
        <ol className="flex flex-col gap-2">
          {arr.map((item, i) => {
            const ok = showResult && item === correct[i];
            const bad = showResult && item !== correct[i];
            return (
              <li
                key={item}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 border transition ${
                  ok
                    ? "bg-emerald-500/15 border-emerald-500/50"
                    : bad
                      ? "bg-rose-500/10 border-rose-500/40"
                      : "bg-slate-900/50 border-slate-700"
                }`}
              >
                <span className="w-6 text-center text-slate-400 font-bold tabular-nums">
                  {i + 1}
                </span>
                <span className="flex-1 font-bold text-lg">{item}</span>
                {showResult ? (
                  <span className="text-lg">{ok ? "✅" : "❌"}</span>
                ) : (
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
                )}
              </li>
            );
          })}
        </ol>

        {/* النتيجة */}
        {showResult && (
          <div className="mt-5 text-center animate-pop">
            {!isVersus ? (
              <>
                <p className="text-3xl font-black">
                  <span className={allCorrect ? "text-emerald-400" : "text-amber-400"}>
                    {soloCorrect}
                  </span>
                  <span className="text-slate-400 text-xl"> / {level}</span>
                </p>
                <p className="mt-1 font-bold text-slate-300">
                  {allCorrect ? "ترتيب مثالي! نزيد الصعوبة 🚀" : "في مكانها الصح"}
                </p>
              </>
            ) : (
              <>
                <div className="flex justify-around">
                  <div>
                    <p className={`text-xs font-bold ${playerColor(1)}`}>اللاعب ١</p>
                    <p className="text-2xl font-black">{p1} / {level}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${playerColor(2)}`}>اللاعب ٢</p>
                    <p className="text-2xl font-black">{p2} / {level}</p>
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
              </>
            )}
          </div>
        )}

        {/* الأزرار */}
        <div className="mt-5">
          {!showResult ? (
            <button
              onClick={submit}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xl font-black transition active:scale-95"
            >
              {isVersus && vsTurn === 1 ? "تأكيد ترتيب اللاعب ١ ←" : "تأكيد الترتيب ✓"}
            </button>
          ) : isVersus ? (
            <button
              onClick={nextVersus}
              className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xl font-black transition active:scale-95"
            >
              جولة جديدة (أصعب) ↻
            </button>
          ) : (
            <button
              onClick={() => nextSolo(allCorrect)}
              className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xl font-black transition active:scale-95"
            >
              {allCorrect ? "التالي (أصعب) ←" : "جولة جديدة ↻"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
