// components/RecommendedResources.tsx
"use client";

import { BookOpen, Headphones, Keyboard as KeyboardIcon, Monitor } from "lucide-react";
import React from "react";

type Resource = {
  title: string;
  subtitle: string;
  type: "Book" | "Tool" | "Setup";
  note?: string;
  url?: string;
};

const RECOMMENDED_RESOURCES: Resource[] = [
  {
    title: "Deep Work – Cal Newport",
    subtitle: "Rules for focused success in a distracted world",
    type: "Book",
    note: "Great for building long, uninterrupted focus blocks.",
    url: "https://www.calnewport.com/books/deep-work/",
  },
  {
    title: "Make Time – Knapp & Zeratsky",
    subtitle: "Daily tactics to design your time with intention",
    type: "Book",
    note: "Pairs nicely with a 1–2 block OptimApp routine.",
  },
  {
    title: "Noise-cancelling headphones",
    subtitle: "Block out ambient noise for focus sessions",
    type: "Tool",
    note: "Any comfortable pair works — no brand required.",
  },
  {
    title: "Comfortable keyboard & mouse",
    subtitle: "Ergonomics matter for long focus days",
    type: "Setup",
    note: "If it hurts, you won’t sit still long enough to get deep work done.",
  },
  {
    title: "Single-tab work mode",
    subtitle: "Close everything except the task you’re doing",
    type: "Setup",
    note: "Brutal but effective: one window, one task.",
  },
];

function typeIcon(t: Resource["type"]) {
  switch (t) {
    case "Book":
      return <BookOpen className="w-4 h-4" aria-hidden />;
    case "Tool":
      return <Headphones className="w-4 h-4" aria-hidden />;
    case "Setup":
      return <Monitor className="w-4 h-4" aria-hidden />;
    default:
      return <KeyboardIcon className="w-4 h-4" aria-hidden />;
  }
}

export default function RecommendedResourcesSection() {
  return (
    <section
      aria-labelledby="recommended-resources-heading"
      className="mt-6 rounded-xl border dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2
            id="recommended-resources-heading"
            className="text-base font-semibold text-indigo-700 dark:text-indigo-400"
          >
            Recommended gear & reads
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Optional helpers for making your 20% time feel easier and more protected.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {RECOMMENDED_RESOURCES.map((item) => (
          <article
            key={item.title}
            className="rounded-lg border dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-3 flex flex-col justify-between"
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-indigo-600 dark:text-indigo-300">
                {typeIcon(item.type)}
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {item.subtitle}
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-neutral-700 px-2 py-0.5">
                {item.type}
              </span>
              {item.note && (
                <span className="ml-2 flex-1 text-right">
                  {item.note}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Affiliate disclaimer */}
      <p className="mt-4 text-[10px] text-gray-500 dark:text-gray-400">
        Some links are affiliate links. If you buy through them, we may earn a small commission at no extra cost.
      </p>
    </section>
  );
}
