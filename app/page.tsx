"use client";

import { useState } from "react";
import TimingGame from "./TimingGame";
import RankingGame from "./RankingGame";
import NumberGuess from "./NumberGuess";

type Game = "timing" | "ranking" | "number";

const GAMES: { id: Game; emoji: string; title: string; desc: string; color: string }[] = [
  {
    id: "timing",
    emoji: "⏱️",
    title: "وقّت",
    desc: "خمّن الوقت بالثواني — اضغط ابدأ وأنهِ وحاول تصيب الهدف",
    color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40",
  },
  {
    id: "ranking",
    emoji: "🧩",
    title: "رتّبها",
    desc: "اكتشف الترتيب السرّي — خمّن وشوف كم وحدة في مكانها، وتزيد الصعوبة",
    color: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/40",
  },
  {
    id: "number",
    emoji: "🔢",
    title: "خمّن الرقم",
    desc: "رقم سرّي ١-١٠٠ وتلميح أكبر/أصغر — أقل محاولات تفوز",
    color: "from-amber-500/20 to-amber-500/5 border-amber-500/40",
  },
];

export default function Home() {
  const [game, setGame] = useState<Game | null>(null);

  if (game === "timing") return <TimingGame onBack={() => setGame(null)} />;
  if (game === "ranking") return <RankingGame onBack={() => setGame(null)} />;
  if (game === "number") return <NumberGuess onBack={() => setGame(null)} />;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-10">
      <header className="text-center">
        <h1 className="text-5xl font-black tracking-tight">🎮 ألعاب وقّت</h1>
        <p className="text-slate-400 mt-3">اختر لعبة وابدأ التحدّي</p>
      </header>

      <div className="w-full max-w-md flex flex-col gap-4">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGame(g.id)}
            className={`text-right bg-gradient-to-bl ${g.color} border rounded-3xl p-6 flex items-center gap-4 transition hover:scale-[1.02] active:scale-95 shadow-xl`}
          >
            <span className="text-5xl">{g.emoji}</span>
            <span className="flex-1">
              <span className="block text-2xl font-black">{g.title}</span>
              <span className="block text-slate-300 text-sm mt-1">{g.desc}</span>
            </span>
            <span className="text-slate-400 text-2xl">←</span>
          </button>
        ))}
      </div>

      <p className="text-slate-500 text-xs">كل لعبة فيها وضع فردي ومنافسة بين لاعبَين</p>
    </main>
  );
}
