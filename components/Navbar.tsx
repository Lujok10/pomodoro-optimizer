"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
      <h1 className="text-xl font-bold">Pomodoro Optimizer</h1>
      <div className="space-x-6">
        <Link href="/">Home</Link>
        <Link href="/plan">Plan</Link>
        <Link href="/review">Review</Link>
        <Link href="/about">About</Link>
      </div>
    </nav>
  );
}
