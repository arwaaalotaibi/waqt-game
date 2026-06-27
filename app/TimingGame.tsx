"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "running" | "result";
type Mode = "random" | "custom" | "versus";

const STORAGE_KEY = "waqt:best";

function fmt(s: number) {
  return s.toFixed(2);
}

// رسالة التقييم حسب فرق الثواني
function judge(diff: number) {
  if (diff === 0) return { msg: "مستحيل! إصابة كاملة 🎯", tone: "perfect" };
  if (diff <= 0.05) return { msg: "خياليّ! دقّة لا تصدّق ⭐️", tone: "perfect" };
  if (diff <= 0.15) return { msg: "ممتاز جدًّا 🔥", tone: "great" };
  if (diff <= 0.3) return { msg: "قريب كثير 👏", tone: "great" };
  if (diff <= 0.6) return { msg: "حلو، استمري 🙂", tone: "ok" };
  if (diff <= 1.2) return { msg: "مو بطّال، جرّبي مرّة ثانية", tone: "ok" };
  return { msg: "بعيد شوي… ركّزي 💪", tone: "bad" };
}

function points(diff: number) {
  // كل ما قلّ الفرق زادت النقاط (٠–١٠٠٠)
  return Math.round(1000 * Math.max(0, 1 - diff / 2));
}

// تحويل الأرقام العربية إلى إنجليزية قبل التحقّق
function toEnDigits(v: string) {
  return v.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

export default function TimingGame({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("random");
  const [target, setTarget] = useState(5);
  const [customInput, setCustomInput] = useState("5");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<number | null>(null); // الوقت الفعلي (فردي)
  const [best, setBest] = useState<number | null>(null); // أصغر فرق محقّق
  const [streak, setStreak] = useState(0);

  // حالة المنافسة
  const [vsTurn, setVsTurn] = useState<1 | 2>(1);
  const [p1, setP1] = useState<number | null>(null);
  const [p2, setP2] = useState<number | null>(null);
  const [wins, setWins] = useState({ p1: 0, p2: 0 });

  const startRef = useRef(0);
  const isVersus = mode === "versus";

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) setBest(parseFloat(v));
  }, []);

  // هدف عشوائي بين ٢ و ٩ ثواني (بخطوة نصف ثانية)
  const rollTarget = useCallback(() => {
    const t = (Math.floor(Math.random() * 15) + 4) / 2; // 2.0 .. 9.0
    setTarget(t);
  }, []);

  const newRound = useCallback(() => {
    if (mode === "custom") {
      const n = parseFloat(toEnDigits(customInput));
      setTarget(Number.isFinite(n) && n > 0 ? Math.min(60, n) : 5);
    } else {
      rollTarget(); // random + versus
    }
    setResult(null);
    setPhase("idle");
    if (mode === "versus") {
      setVsTurn(1);
      setP1(null);
      setP2(null);
    }
  }, [mode, customInput, rollTarget]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setResult(null);
    setPhase("idle");
    setVsTurn(1);
    setP1(null);
    setP2(null);
    if (m === "custom") {
      const n = parseFloat(toEnDigits(customInput));
      setTarget(Number.isFinite(n) && n > 0 ? Math.min(60, n) : 5);
    } else {
      rollTarget();
    }
  };

  const start = () => {
    startRef.current = performance.now();
    setPhase("running");
  };

  const stop = () => {
    const elapsed = (performance.now() - startRef.current) / 1000;
    setPhase("result");

    if (isVersus) {
      if (vsTurn === 1) {
        setP1(elapsed);
      } else {
        setP2(elapsed);
        // كلاهما لعب → احسب الفائز
        const d1 = Math.abs((p1 ?? 0) - target);
        const d2 = Math.abs(elapsed - target);
        if (d1 < d2) setWins((w) => ({ ...w, p1: w.p1 + 1 }));
        else if (d2 < d1) setWins((w) => ({ ...w, p2: w.p2 + 1 }));
      }
      return;
    }

    setResult(elapsed);
    const diff = Math.abs(elapsed - target);
    setBest((prev) => {
      const next = prev === null ? diff : Math.min(prev, diff);
      localStorage.setItem(STORAGE_KEY, next.toString());
      return next;
    });
    setStreak((s) => (diff <= 0.3 ? s + 1 : 0));
  };

  // انتقال من دور اللاعب الأول إلى الثاني
  const nextPlayer = () => {
    setVsTurn(2);
    setPhase("idle");
  };

  const diff = result !== null ? Math.abs(result - target) : 0;
  const early = result !== null && result < target;
  const verdict = result !== null ? judge(diff) : null;

  const toneColor: Record<string, string> = {
    perfect: "text-emerald-400",
    great: "text-lime-400",
    ok: "text-amber-400",
    bad: "text-rose-400",
  };

  // بيانات المنافسة عند اكتمال الجولة
  const bothPlayed = p1 !== null && p2 !== null;
  const d1 = p1 !== null ? Math.abs(p1 - target) : 0;
  const d2 = p2 !== null ? Math.abs(p2 - target) : 0;
  const winner = !bothPlayed ? null : d1 < d2 ? 1 : d2 < d1 ? 2 : 0;

  const playerColor = (n: 1 | 2) => (n === 1 ? "text-sky-400" : "text-pink-400");
  const playerName = (n: 1 | 2) => (n === 1 ? "اللاعب ١" : "اللاعب ٢");

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">
      {/* العنوان */}
      <header className="text-center relative w-full max-w-md">
        <button
          onClick={onBack}
          className="absolute right-0 top-1 text-slate-400 text-sm hover:text-slate-200"
        >
          ← الألعاب
        </button>
        <h1 className="text-4xl font-extrabold tracking-tight">⏱️ وقّت</h1>
        <p className="text-slate-400 mt-2">
          حاول توقف المؤقّت بالضبط على الوقت المستهدف
        </p>
      </header>

      {/* اختيار الوضع */}
      <div className="flex gap-2 bg-slate-800/60 p-1 rounded-2xl">
        {(
          [
            ["random", "🎲 عشوائي"],
            ["custom", "✏️ وقتي"],
            ["versus", "🆚 منافسة"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            disabled={phase === "running"}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-40 ${
              mode === m ? "bg-indigo-500 text-white" : "text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "custom" && phase === "idle" && (
        <div className="flex items-center gap-3 -mt-3">
          <label className="text-slate-300 text-sm">
            الوقت المستهدف (ثواني):
          </label>
          <input
            type="number"
            min={1}
            max={60}
            step={0.5}
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              const n = parseFloat(toEnDigits(e.target.value));
              if (Number.isFinite(n) && n > 0) setTarget(Math.min(60, n));
            }}
            className="w-24 text-center bg-slate-800 border border-slate-700 rounded-xl py-2 text-lg font-bold focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* شريط المنافسة: لوحة النتائج + دور من */}
      {isVersus && (
        <div className="w-full max-w-md flex flex-col items-center gap-3 -mt-3">
          <div className="flex items-center justify-center gap-6 text-center">
            <div>
              <p className={`text-3xl font-black tabular-nums ${playerColor(1)}`}>
                {wins.p1}
              </p>
              <p className="text-slate-400 text-xs">اللاعب ١</p>
            </div>
            <span className="text-slate-500 font-bold">—</span>
            <div>
              <p className={`text-3xl font-black tabular-nums ${playerColor(2)}`}>
                {wins.p2}
              </p>
              <p className="text-slate-400 text-xs">اللاعب ٢</p>
            </div>
          </div>
          {!bothPlayed && (
            <p className="text-sm font-bold">
              <span className={playerColor(vsTurn)}>دور {playerName(vsTurn)}</span>
            </p>
          )}
        </div>
      )}

      {/* بطاقة اللعبة */}
      <section className="w-full max-w-md bg-slate-800/50 border border-slate-700/60 rounded-3xl p-8 text-center shadow-2xl">
        <p className="text-slate-400 text-sm mb-1">الوقت المستهدف</p>
        <p className="text-6xl font-black tabular-nums tracking-tight">
          {fmt(target)}
          <span className="text-2xl text-slate-400 mr-1">ث</span>
        </p>

        {/* الحالة */}
        <div className="my-8 min-h-[120px] flex items-center justify-center">
          {phase === "running" && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-slate-400 text-sm">المؤقّت يعمل… والوقت مخفي 🤫</p>
            </div>
          )}

          {/* نتيجة الوضع الفردي */}
          {!isVersus && phase === "result" && result !== null && verdict && (
            <div className="animate-pop">
              <p className="text-slate-400 text-sm">وقتك الفعلي</p>
              <p className="text-5xl font-black tabular-nums">
                {fmt(result)}
                <span className="text-xl text-slate-400 mr-1">ث</span>
              </p>
              <p className="mt-2 text-slate-300">
                {early ? "بكّرت بـ" : "تأخّرت بـ"}{" "}
                <span className="font-bold">{fmt(diff)}</span> ثانية
              </p>
              <p
                className={`mt-3 text-lg font-extrabold ${toneColor[verdict.tone]}`}
              >
                {verdict.msg}
              </p>
              <p className="mt-1 text-amber-300 font-bold">+{points(diff)} نقطة</p>
            </div>
          )}

          {/* نتيجة المنافسة: انتهى دور اللاعب الأول فقط */}
          {isVersus && phase === "result" && !bothPlayed && p1 !== null && (
            <div className="animate-pop">
              <p className={`text-sm font-bold ${playerColor(1)}`}>
                انتهى دور اللاعب ١
              </p>
              <p className="text-5xl font-black tabular-nums mt-1">
                {fmt(p1)}
                <span className="text-xl text-slate-400 mr-1">ث</span>
              </p>
              <p className="mt-2 text-slate-400 text-sm">
                النتيجة تظهر بعد لعب اللاعب ٢ 🤐
              </p>
            </div>
          )}

          {/* نتيجة المنافسة النهائية */}
          {isVersus && phase === "result" && bothPlayed && p1 !== null && p2 !== null && (
            <div className="animate-pop w-full">
              <div className="flex justify-around items-end">
                <div>
                  <p className={`text-xs font-bold ${playerColor(1)}`}>اللاعب ١</p>
                  <p className="text-3xl font-black tabular-nums">{fmt(p1)}</p>
                  <p className="text-slate-400 text-xs">فرق {fmt(d1)}</p>
                </div>
                <div>
                  <p className={`text-xs font-bold ${playerColor(2)}`}>اللاعب ٢</p>
                  <p className="text-3xl font-black tabular-nums">{fmt(p2)}</p>
                  <p className="text-slate-400 text-xs">فرق {fmt(d2)}</p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-black">
                {winner === 0 ? (
                  <span className="text-amber-300">تعادل! 🤝</span>
                ) : (
                  <span className={playerColor(winner as 1 | 2)}>
                    فاز {playerName(winner as 1 | 2)} 🏆
                  </span>
                )}
              </p>
            </div>
          )}

          {phase === "idle" && (
            <p className="text-slate-500">
              {isVersus
                ? `${playerName(vsTurn)}: اضغط «ابدأ» وقدّر الوقت`
                : "اضغط «ابدأ» وقدّر الوقت في رأسك"}
            </p>
          )}
        </div>

        {/* الأزرار */}
        {phase === "idle" && (
          <button
            onClick={start}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xl font-black transition active:scale-95"
          >
            ابدأ ▶︎
          </button>
        )}
        {phase === "running" && (
          <button
            onClick={stop}
            className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white text-xl font-black transition active:scale-95"
          >
            أنهِ ⏹
          </button>
        )}
        {phase === "result" &&
          (isVersus && !bothPlayed ? (
            <button
              onClick={nextPlayer}
              className="w-full py-4 rounded-2xl bg-pink-500 hover:bg-pink-400 text-white text-xl font-black transition active:scale-95"
            >
              دور اللاعب ٢ ←
            </button>
          ) : (
            <button
              onClick={newRound}
              className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xl font-black transition active:scale-95"
            >
              جولة جديدة ↻
            </button>
          ))}
      </section>

      {/* إحصائيات الوضع الفردي */}
      {!isVersus && (
        <footer className="flex gap-8 text-center">
          <div>
            <p className="text-2xl font-black text-emerald-400 tabular-nums">
              {best === null ? "—" : fmt(best)}
            </p>
            <p className="text-slate-400 text-xs">أفضل فرق (ث)</p>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-400 tabular-nums">
              {streak}
            </p>
            <p className="text-slate-400 text-xs">سلسلة الإصابات</p>
          </div>
        </footer>
      )}

      {isVersus && (
        <button
          onClick={() => {
            setWins({ p1: 0, p2: 0 });
            newRound();
          }}
          className="text-slate-400 text-sm underline underline-offset-4"
        >
          تصفير النتيجة
        </button>
      )}
    </main>
  );
}
