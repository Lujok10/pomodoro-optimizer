"use client";

import { useState, type ChangeEvent } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

type Props = {
  onTimeChange?: (minutes: number) => void;
};

export function AvailableTimeSection({
  onTimeChange = () => {}, // ✅ default no-op prevents “possibly undefined”
}: Props) {
  const [time, setTime] = useState(120);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setTime(val);
    onTimeChange(val); // ✅ always callable
  };

  return (
    <Card className="rounded-2xl shadow-md border border-gray-200 bg-white">
      <CardHeader className="flex items-center gap-2">
        <h3 className="text-base font-semibold leading-6">Available Time</h3>
        <Clock className="w-5 h-5 text-gray-500" aria-hidden />
      </CardHeader>
      <CardContent>
        <Input
          type="number"
          value={time}
          onChange={handleChange}
          className="w-32"
          aria-label="Available minutes today"
        />
        <p className="text-sm text-gray-500 mt-2">
          Enter how many minutes you have today.
        </p>
      </CardContent>
    </Card>
  );
}
