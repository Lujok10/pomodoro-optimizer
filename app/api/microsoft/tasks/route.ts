import { NextRequest, NextResponse } from "next/server";
import { refreshWithCookie } from "@/lib/microsoft/token";

// Map Graph task → your UI Task
function mapTask(x: any) {
  return {
    id: Number(BigInt.asUintN(53, BigInt(`0x${(x.id || "").replace(/[^0-9a-f]/gi,"").slice(0,13) || "0"}`))), // quick numeric
    name: x.title || "Untitled",
    impact: 3,                      // you can map from importance: high/normal/low → 5/3/2
    duration: 30,                   // if no duration, default; or derive from due date distance
    project: x.parentList?.displayName || "Microsoft To Do",
  };
}

export async function GET(req: NextRequest) {
  try {
    const access = await refreshWithCookie(req.headers);

    // 1) lists
    const r1 = await fetch("https://graph.microsoft.com/v1.0/me/todo/lists", {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!r1.ok) return NextResponse.json({ error: await r1.text() }, { status: 400 });
    const lists = (await r1.json()).value as any[];

    // pick default or first
    const list = lists.find(l => l.wellknownListName === "defaultList") || lists[0];
    if (!list) return NextResponse.json({ tasks: [] });

    // 2) tasks in that list (incomplete only)
    const r2 = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!r2.ok) return NextResponse.json({ error: await r2.text() }, { status: 400 });
    const raw = (await r2.json()).value as any[];

    const tasks = raw.map(t => mapTask({ ...t, parentList: list }));
    return NextResponse.json({ list: list.displayName, count: tasks.length, tasks });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
