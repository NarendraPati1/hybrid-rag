import React, { useState } from "react";
import { Search } from "lucide-react";

interface HeaderProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, isSearching }) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <header className="relative w-full flex flex-col items-center justify-center min-h-screen px-4">
      {/* Ambient glows */}
      <div className="hero-glow" />
      <div className="hero-glow-secondary" />

      {/* ── Top bar ─────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-5">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L20 6.5V17.5L12 22L4 17.5V6.5L12 2Z" />
              <path d="M12 6L18 9.5V14.5L12 18L6 14.5V9.5L12 6Z" fill="rgba(255, 255, 255, 0.2)" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="20" y1="6.5" x2="18" y2="9.5" />
              <line x1="4" y1="6.5" x2="6" y2="9.5" />
              <line x1="20" y1="17.5" x2="18" y2="14.5" />
              <line x1="4" y1="17.5" x2="6" y2="14.5" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight font-display">
            doomStack
          </span>
        </div>


        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all text-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <span className="text-[13px] font-semibold text-white/80 font-display">GitHub</span>
        </a>


      </div>

      {/* ── Hero content ────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl w-full -mt-8">

        {/* Headline */}
        <h1 className="animate-fade-up delay-1 text-[clamp(2.3rem,5.5vw,4.2rem)] font-extrabold leading-[1.1] tracking-tight mb-6 font-display">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-purple-200">The semantic index</span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-soft via-fuchsia-400 to-accent">for AI tooling.</span>
        </h1>


        {/* Subtitle */}
        <p className="animate-fade-up delay-3 text-[14px] md:text-[16px] leading-relaxed text-white/35 max-w-2xl mb-12 font-body">
          Search frameworks, agents, vector databases, automation platforms, and AI infrastructure using intelligent hybrid retrieval.
        </p>

        {/* Search bar */}
        <form
          onSubmit={handleSubmit}
          className="animate-fade-up delay-4 w-full max-w-2xl"
        >
          <div className="search-bar rounded-full flex items-center pl-5 pr-2 py-2">
            <Search className="w-[18px] h-[18px] text-white/20 shrink-0" />

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="no code ai agent"
              disabled={isSearching}
              className="flex-1 bg-transparent border-none outline-none text-[14px] text-white/90 placeholder-white/25 px-3.5 py-2 font-body"
            />


            {/* Discover button */}
            <button
              type="submit"
              disabled={isSearching}
              className="shrink-0 px-5 py-2.5 rounded-full bg-accent hover:bg-violet-600 text-white text-[13px] font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/35 active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 font-display"
            >
              {isSearching ? "Searching…" : "Discover"}
              {!isSearching && <span className="text-white/70">↗</span>}
            </button>
          </div>
        </form>
      </div>
    </header>
  );
};
