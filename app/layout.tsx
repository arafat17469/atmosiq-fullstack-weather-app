import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtmosIQ | Intelligent Weather & Travel Insights",
  description:
    "Full-stack weather intelligence app built by Arafat Rahman for the PM Accelerator AI Engineer Intern technical assessment.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/compare", label: "Compare" },
  { href: "/travel", label: "Travel" },
  { href: "/requests", label: "Saved Requests" },
  { href: "/about", label: "About" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <a href="/" className="text-lg font-bold text-blue-700">
              AtmosIQ
            </a>
            <nav aria-label="Main navigation" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-slate-600 hover:text-blue-700"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="mt-12 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500">
            Developed by{" "}
            <a
              className="text-blue-700 underline"
              href="https://arafat174.vercel.app"
              target="_blank"
              rel="noreferrer"
            >
              Arafat Rahman
            </a>{" "}
            · 2026
          </div>
        </footer>
      </body>
    </html>
  );
}
