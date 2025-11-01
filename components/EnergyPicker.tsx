"use client";

import { Star } from "lucide-react";

type Props = {
  value: number;           // 1..5
  onChange: (v: number) => void;
};

export default function EnergyPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {( [1,2,3,4,5] as const ).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={"p-1 rounded-md " + (v <= value ? "text-yellow-500" : "text-gray-400 hover:text-gray-500")}
          aria-label={`Set energy ${v}`}
        >
          <Star className="w-5 h-5" fill={v <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}
