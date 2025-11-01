"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  loadSessions,
  getTwoWeekWindows,
  filterRange,
  effectivenessStats,
  sumMinutes,
  groupBy,
  taskLevelRecommendations,
  type Session,
} from "@/lib/insights";
import { useThemeTokens } from "@/components/ThemeProvider";

// Recharts (client-only)
const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

/** Wilson score interval for a binomial proportion. Returns [low, high] as 0..1 */
function wilsonCI(yes: number, n: number, z = 1.96): [number, number] {
  if (n <= 0) return [0, 0];
  const p = yes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  const low = Math.max(0, (center - margin) / denom);
  const high = Math.min(1, (center + margin) / denom);
  return [low, high];
}

export default function LearningPage() {
  const theme = useThemeTokens();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  // Get two 14-day windows (oldest first per your helper)
  const [w0, w1] = getTwoWeekWindows(2);
  // Fallbacks if the helper returns less than 2 windows
  const recentWin = w1 ?? w0 ?? { start: Date.now() - 6 * 24 * 60 * 60 * 1000, end: Date.now() };
  const prevWin =
    w0 ??
    {
      start: recentWin.start - 7 * 24 * 60 * 60 * 1000,
      end: recentWin.start - 1,
    };

  const recent = useMemo(
    () => filterRange(sessions, recentWin.start, recentWin.end),
    [sessions, recentWin.start, recentWin.end]
  );
  const prev = useMemo(
    () => filterRange(sessions, prevWin.start, prevWin.end),
    [sessions, prevWin.start, prevWin.end]
  );

  // High-level stats
  const rEff = effectivenessStats(recent);
  const pEff = effectivenessStats(prev);
  const rMins = sumMinutes(recent);
  const pMins = sumMinutes(prev);

  const wow = {
    rate: rEff.effectivenessPct - pEff.effectivenessPct, // percentage points
    mins: rMins - pMins,
    samples: rEff.total - pEff.total,
  };

  // Build daily effectiveness for last 14 days
  const daily = useMemo(() => {
    const days: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const map = new Map(days.map((d) => [d, { day: d, done: 0, ok: 0 }]));
    sessions.forEach((s) => {
      const key = (s.date || "").slice(0, 10);
      const rec = map.get(key);
      if (rec) {
        rec.done += 1;
        if (s.feedback === "yes") rec.ok += 1;
      }
    });
    return Array.from(map.values()).map((r) => ({
      day: r.day.slice(5), // MM-DD
      eff: r.done ? r.ok / r.done : 0,
    }));
  }, [sessions]);

  // Compute CI band from the last 7 days
  const band = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const last7 = filterRange(sessions, start.getTime(), end.getTime());
    const n = last7.length;
    const yes = last7.filter((s) => s.feedback === "yes").length;
    const [low, high] = wilsonCI(yes, n);
    return daily.map((d) => ({ ...d, low, high }));
  }, [sessions, daily]);

  // Per-project effectiveness (last 7 days – matches table label)
  const proj = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const last7 = filterRange(sessions, start.getTime(), end.getTime());

    const grouped = groupBy(last7, (x) => x.project || "General");
    const rows = Object.entries(grouped).map(([project, list]) => {
      const samples = list.length;
      const yes = list.filter((s) => s.feedback === "yes").length;
      const rate = samples ? Math.round((yes / samples) * 100) : 0;
      const [low, high] = wilsonCI(yes, samples);
      const totalMinutes = list.reduce((acc, s) => acc + Math.max(0, Math.round((s.seconds || 0) / 60)), 0);
      const avgDur = Math.round(totalMinutes / Math.max(1, samples));
      return {
        project,
        samples,
        effective: yes,
        rate,
        low: Math.round(low * 100),
        high: Math.round(high * 100),
        avgDur,
      };
    });

    return rows.sort((a, b) => b.rate - a.rate || b.samples - a.samples);
  }, [sessions]);

  // Recommendations from recent window (use the bundle directly)
  const recs = useMemo(() => {
    const bundle = taskLevelRecommendations(recent);
    // Flatten to simple list; items have { title, detail? }
    return [...bundle.top, ...bundle.bottom];
  }, [recent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-800">What we’re learning</h1>
            <p className="text-gray-600 text-sm">Trends, confidence, and actionable suggestions from your last two weeks.</p>
          </div>
          <Link href="/" className="rounded border bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50">
            ← Back
          </Link>
        </header>

        {/* Top KPIs with WoW deltas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Kpi
            label="Effectiveness rate"
            value={`${Math.round(rEff.effectivenessPct)}%`}
            delta={`${wow.rate >= 0 ? "+" : ""}${Math.round(wow.rate)} pts`}
            theme={theme}
          />
          <Kpi
            label="Focus minutes"
            value={`${rMins}m`}
            delta={`${wow.mins >= 0 ? "+" : ""}${wow.mins}m WoW`}
            theme={theme}
          />
          <Kpi
            label="Blocks completed"
            value={`${rEff.total}`}
            delta={`${wow.samples >= 0 ? "+" : ""}${wow.samples} WoW`}
            theme={theme}
          />
        </div>

        {/* Effectiveness trend with confidence band */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium text-gray-700">
            Daily effectiveness (last 14 days) with 7-day confidence band
            <span className="ml-2 text-xs text-gray-500">(band from Wilson CI on the last 7 days)</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={band} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="effLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.primary} stopOpacity={0.85} />
                    <stop offset="95%" stopColor={theme.primary} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={theme.accent} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: theme.label, fontSize: 12 }} />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  tick={{ fill: theme.label, fontSize: 12 }}
                />
                <Tooltip formatter={(v: any) => (typeof v === "number" ? `${Math.round(v * 100)}%` : v)} />
                {/* CI band */}
                <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" />
                <Area type="monotone" dataKey="high" stroke="none" fill="url(#band)" />
                {/* Line */}
                <Area type="monotone" dataKey="eff" stroke={theme.line} fill="url(#effLine)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project effectiveness with CI */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium text-gray-700">Projects by effectiveness (last 7 days)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-2">Project</th>
                  <th className="text-right p-2">Blocks</th>
                  <th className="text-right p-2">Avg Duration</th>
                  <th className="text-right p-2">Effectiveness</th>
                  <th className="text-right p-2">Confidence band</th>
                </tr>
              </thead>
              <tbody>
                {proj.map((r) => (
                  <tr key={r.project} className="border-t">
                    <td className="p-2">{r.project}</td>
                    <td className="p-2 text-right">{r.samples}</td>
                    <td className="p-2 text-right">{r.avgDur}m</td>
                    <td className="p-2 text-right">{r.rate}%</td>
                    <td className="p-2 text-right">
                      {r.low}% – {r.high}%
                    </td>
                  </tr>
                ))}
                {proj.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-gray-500">
                      No recent sessions. Run a few focus blocks and give feedback to see insights.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium text-gray-700">Recommendations</div>
          {recs.length === 0 ? (
            <div className="text-sm text-gray-500">
              We’ll suggest optimizations once we see a bit more data.
            </div>
          ) : (
            <ul className="space-y-2">
              {recs.map((r, i) => (
                <li key={r.title ?? i} className="rounded-lg border p-3">
                  <div className="font-medium">{r.title ?? `Item ${i + 1}`}</div>
                  {r.detail && <div className="text-xs text-gray-600 mt-1">{r.detail}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  theme,
}: {
  label: string;
  value: string;
  delta: string;
  theme: { ok: string; warn: string; err: string; primary: string };
}) {
  const isPos = delta.trim().startsWith("+");
  const color = isPos ? theme.ok : theme.err;
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="mt-1 text-xs" style={{ color }}>
        {delta}
      </div>
    </div>
  );
}
