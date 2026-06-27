"use client";

import { useCallback, useEffect, useState } from "react";

type Mode = "solo" | "versus";
type Hint = "higher" | "lower" | "correct";

const MIN = 1;
const MAX = 100;
const BEST_KEY = "waqt:numguess:best";

// تحويل الأرقام العربية إلى إنجليزية قبل التحقّق
function toEnDigits(v: string) {
  return v.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

function randomSecret() {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

type HistItem = { guess: number; hint: Hint; player?: 1 | 2 };

export default function NumberGuess({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("solo");
  const [secret, setSecret] = useState(randomSecret());
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistItem[]>([]);
  const [lo, setLo] = useState(MIN);
  const [hi, setHi] = useState(MAX);
  const [solved, setSolved] = useState(false);

  // فردي
  const [best, setBest] = useState<number | null>(null);

  // منافسة
  const [vsTurn, setVsTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [wins, setWins] = useState({ p1: 0, p2: 0 });

  const isVersus = mode === "versus";

  useEffect(() => {
    const v = localStorage.getItem(BEST_KEY);
    if (v) setBest(parseInt(v));
  }, []);

  const newGame = useCallback(() => {
    setSecret(randomSecret());
    setInput("");
    setHistory([]);
    setLo(MIN);
    setHi(MAX);
    setSolved(false);
    setVsTurn(1);
    setWinner(null);
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setWins({ p1: 0, p2: 0 });
    newGame();
  };

  const parsed = parseInt(toEnDigits(input), 10);
  const valid = Number.isInteger(parsed) && parsed >= lo && parsed <= hi;

  const guess = () => {
    if (!valid || solved) return;
    const g = parsed;
    let hint: Hint;
    if (g === secret) hint = "correct";
    else if (g < secret) hint = "higher";
    else hint = "lower";

    setHistory((h) => [{ guess: g, hint, player: isVersus ? vsTurn : undefined }, ...h]);
    setInput("");

    if (hint === "correct") {
      if (!isVersus) {
        setSolved(true);
        const attempts = history.length + 1;
        setBest((prev) => {
          const next = prev === null ? attempts : Math.min(prev, attempts);
          localStorage.setItem(BEST_KEY, next.toString());
          return next;
        });
      } else {
        setSolved(true);
        setWinner(vsTurn);
        setWins((w) =>
          vsTurn === 1 ? { ...w, p1: w.p1 + 1 } : { ...w, p2: w.p2 + 1 },
        );
      }
      return;
    }

    // ضيّق المجال
    if (hint === "higher") setLo(g + 1);
    else setHi(g - 1);
    if (isVersus) setVsTurn((t) => (t === 1 ? 2 : 1));
  };

  const lastHint = history[0]?.hint;
  const playerColor = (n: 1 | 2) => (n === 1 ? "text-sky-400" : "text-pink-400");
  const playerName = (n: 1 | 2) => (n === 1 ? "اللاعب ١" : "اللاعب ٢");
  const attempts = history.length;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6">
      <header className="text-center relative w-full max-w-md">
        <button
          onClick={onBack}
          className="absolute right-0 top-1 text-slate-400 text-sm hover:text-slate-200"
        >
          ← الألعاب
        </button>
        <h1 className="text-4xl font-extrabold tracking-tight">🔢 خمّن الرقم</h1>
        <p className="text-slate-400 mt-2">
          رقم سرّي بين {MIN} و {MAX} — خمّن واتبع التلميح
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
            </p>
          )}
        </div>
      )}

      {/* بطاقة اللعبة */}
      <section className="w-full max-w-md bg-slate-800/50 border border-slate-700/60 rounded-3xl p-6 shadow-2xl">
        {/* المجال المتبقّي + التلميح */}
        <div className="text-center mb-5">
          <p className="text-slate-400 text-sm">المجال المتبقّي</p>
          <p className="text-3xl font-black tabular-nums">
            {lo} <span className="text-slate-500">—</span> {hi}
          </p>
        </div>

        {!solved ? (
          <>
            <div className="min-h-[56px] flex items-center justify-center mb-3">
              {lastHint === "higher" && (
                <p className="text-2xl font-black text-amber-400 animate-pop">
                  ⬆️ الرقم أكبر
                </p>
              )}
              {lastHint === "lower" && (
                <p className="text-2xl font-black text-sky-400 animate-pop">
                  ⬇️ الرقم أصغر
                </p>
              )}
              {!lastHint && (
                <p className="text-slate-500">اكتب رقمك وخمّن</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && guess()}
                placeholder={`${lo}–${hi}`}
                className="flex-1 text-center bg-slate-900 border border-slate-700 rounded-2xl py-3 text-2xl font-black tabular-nums focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={guess}
                disabled={!valid}
                className="px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-slate-900 text-lg font-black transition active:scale-95"
              >
                خمّن
              </button>
            </div>
          </>
        ) : (
          <div className="text-center animate-pop py-2">
            {!isVersus ? (
              <>
                <p className="text-2xl font-black text-emerald-400">
                  أصبت! الرقم {secret} 🎉
                </p>
                <p className="mt-2 text-slate-300">
                  بـ <span className="font-black text-white">{attempts}</span> محاولة
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black text-emerald-400">
                  الرقم كان {secret}
                </p>
                <p className={`mt-2 text-xl font-black ${playerColor(winner as 1 | 2)}`}>
                  فاز {playerName(winner as 1 | 2)} 🏆
                </p>
              </>
            )}
            <button
              onClick={newGame}
              className="mt-5 w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xl font-black transition active:scale-95"
            >
              لعبة جديدة ↻
            </button>
          </div>
        )}

        {/* سجلّ التخمينات */}
        {history.length > 0 && (
          <div className="mt-5 border-t border-slate-700/60 pt-3">
            <p className="text-slate-400 text-xs mb-2">التخمينات:</p>
            <ul className="flex flex-wrap gap-1.5">
              {history.map((h, i) => (
                <li
                  key={i}
                  className={`px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums ${
                    h.hint === "correct"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-900/50 text-slate-300"
                  }`}
                >
                  {isVersus && h.player && (
                    <span className={playerColor(h.player)}>•</span>
                  )}{" "}
                  {h.guess}
                  {h.hint === "higher" && " ⬆️"}
                  {h.hint === "lower" && " ⬇️"}
                  {h.hint === "correct" && " ✅"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* أفضل نتيجة (فردي) */}
      {!isVersus && (
        <footer className="text-center">
          <p className="text-2xl font-black text-emerald-400 tabular-nums">
            {best === null ? "—" : best}
          </p>
          <p className="text-slate-400 text-xs">أقل محاولات (أفضل نتيجة)</p>
        </footer>
      )}
    </main>
  );
}
