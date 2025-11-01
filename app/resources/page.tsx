// app/resources/page.tsx
import Link from "next/link";

type Resource = {
  title: string;
  description: string;
  url: string;
  tag?: string;
};

const RESOURCES: Resource[] = [
  {
    title: "Deep Work (Book)",
    description: "Cal Newport’s classic on focused work.",
    url: "https://amzn.to/xxxxx", // <- your affiliate link
    tag: "Books",
  },
  {
    title: "Noise-Cancelling Headphones",
    description: "Block interruptions and sink into flow.",
    url: "https://amzn.to/xxxxx",
    tag: "Gear",
  },
  {
    title: "Mechanical Keyboard",
    description: "Comfortable typing for long focus blocks.",
    url: "https://amzn.to/xxxxx",
    tag: "Tools",
  },
];

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-indigo-800">Recommended Resources</h1>
      <p className="mt-1 text-gray-600">Curated books, gear, and tools to upgrade your focus.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {RESOURCES.map((r) => (
          <div key={r.title} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-indigo-700">{r.title}</h3>
              {r.tag && (
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">{r.tag}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">{r.description}</p>
            <Link
              href={r.url}
              target="_blank"
              className="mt-3 inline-block rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              View
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Some links are affiliate links. If you buy through them, we may earn a small commission at no extra cost.
      </p>
    </div>
  );
}
