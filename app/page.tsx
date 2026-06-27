"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "running" | "result";
type Mode = "random" | "custom";

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

export default function Home() {
  const [mode, setMode] = useState<Mode>("random");
  const [target, setTarget] = useState(5);
  const [customInput, setCustomInput] = useState("5");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<number | null>(null); // الوقت الفعلي
  const [best, setBest] = useState<number | null>(null); // أصغر فرق محقّق
  const [streak, setStreak] = useState(0);

  const startRef = useRef(0);

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
    if (mode === "random") rollTarget();
    else {
      const n = parseFloat(toEnDigits(customInput));
      setTarget(Number.isFinite(n) && n > 0 ? Math.min(60, n) : 5);
    }
    setResult(null);
    setPhase("idle");
  }, [mode, customInput, rollTarget]);

  const start = () => {
    startRef.current = performance.now();
    setPhase("running");
  };

  const stop = () => {
    const elapsed = (performance.now() - startRef.current) / 1000;
    setResult(elapsed);
    setPhase("result");

    const diff = Math.abs(elapsed - target);
    setBest((prev) => {
      const next = prev === null ? diff : Math.min(prev, diff);
      localStorage.setItem(STORAGE_KEY, next.toString());
      return next;
    });
    setStreak((s) => (diff <= 0.3 ? s + 1 : 0));
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

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">
      {/* العنوان */}
      <header className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">⏱️ وقّت</h1>
        <p className="text-slate-400 mt-2">
          حاول توقف المؤقّت بالضبط على الوقت المستهدف
        </p>
      </header>

      {/* اختيار الوضع */}
      <div className="flex gap-2 bg-slate-800/60 p-1 rounded-2xl">
        {(
          [
            ["random", "🎲 هدف عشوائي"],
            ["custom", "✏️ أكتب وقتي"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setResult(null);
              setPhase("idle");
              if (m === "custom") {
                const n = parseFloat(toEnDigits(customInput));
                setTarget(Number.isFinite(n) && n > 0 ? Math.min(60, n) : 5);
              } else {
                rollTarget();
              }
            }}
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

          {phase === "result" && result !== null && verdict && (
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

          {phase === "idle" && (
            <p className="text-slate-500">اضغط «ابدأ» وقدّر الوقت في رأسك</p>
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
        {phase === "result" && (
          <button
            onClick={newRound}
            className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xl font-black transition active:scale-95"
          >
            جولة جديدة ↻
          </button>
        )}
      </section>

      {/* إحصائيات */}
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
    </main>
  );
}
