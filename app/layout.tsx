import type { Metadata } from "next";
import ThemeToggle from "@/components/ThemeToggle";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('atmosiq-theme');document.documentElement.classList.toggle('dark',t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches));}catch(e){document.documentElement.classList.toggle('dark',window.matchMedia('(prefers-color-scheme: dark)').matches);}})();` }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <header className="site-header">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <a href="/" className="site-brand text-lg font-bold">
              AtmosIQ
            </a>
            <nav aria-label="Main navigation" className="order-3 flex w-full flex-wrap gap-x-4 gap-y-2 text-sm md:order-none md:w-auto">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="site-nav-link inline-flex min-h-11 items-center rounded px-1"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="site-footer mt-12">
          <div className="mx-auto max-w-6xl px-4 py-5 text-center text-sm">
            © 2026 · Developed by{" "}
            <a
              className="footer-link underline underline-offset-4"
              href="https://arafat174.vercel.app"
              target="_blank"
              rel="noreferrer"
            >
              Arafat Rahman
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
