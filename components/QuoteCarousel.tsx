"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

type Quote = {
  text: string;
  author?: string;
  tag?: string;
};

const QUOTES: Quote[] = [
  {
    text: "Protect one deep-focus block today. Everything else is optional.",
    tag: "Focus cue",
  },
  {
    text: "If this task doesn’t move the needle, it doesn’t get your best energy.",
    tag: "Impact cue",
  },
  {
    text: "Pick one thing that would make today feel undeniably productive.",
    tag: "Daily anchor",
  },
  {
    text: "Say no to one low-value task so you can say yes to a high-value one.",
    tag: "Boundary cue",
  },
  {
    text: "Your calendar shows time spent. Your 20% shows value created.",
    tag: "Perspective cue",
  },
];

export default function QuoteCarousel() {
  const [index, setIndex] = useState(0);

  // Auto-advance every 12 seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % QUOTES.length);
    }, 12000);
    return () => window.clearInterval(id);
  }, []);

  const current = QUOTES[index];

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + QUOTES.length) % QUOTES.length);
  };

  const goNext = () => {
    setIndex((prev) => (prev + 1) % QUOTES.length);
  };

  return (
    <section
      aria-label="Focus quote carousel"
      className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 backdrop-blur px-4 py-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-300 dark:bg-indigo-900/40 grid place-items-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Focus cue
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              One line to guide your next block.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 p-1 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Previous quote"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 p-1 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Next quote"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
        “{current.text}”
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          {current.tag && (
            <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5">
              {current.tag}
            </span>
          )}
        </div>

        {/* Dots indicator */}
        <div className="flex items-center gap-1">
          {QUOTES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-3 bg-indigo-600 dark:bg-indigo-300"
                  : "w-1.5 bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
