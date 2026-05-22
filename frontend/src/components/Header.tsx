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
        <div className="flex items-center gap-2.5">
          {/* DoomStack stacked-layers mark */}
          <div style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "drop-shadow(0 0 8px rgba(139,92,246,0.7))",
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="100%" stopColor="#a78bfa"/>
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#c4b5fd"/>
                </linearGradient>
                <linearGradient id="g3" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#ede9fe"/>
                </linearGradient>
              </defs>
              {/* Bottom layer */}
              <rect x="4" y="22" width="24" height="5" rx="1.5" fill="url(#g1)" opacity="0.9"/>
              {/* Middle layer */}
              <rect x="6" y="14.5" width="20" height="5" rx="1.5" fill="url(#g2)" opacity="0.95"/>
              {/* Top layer */}
              <rect x="9" y="7" width="14" height="5" rx="1.5" fill="url(#g3)"/>
            </svg>
          </div>
          {/* Wordmark */}
          <span style={{
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            background: "linear-gradient(90deg, #e2d9f3 0%, #a78bfa 60%, #7c3aed 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "inherit",
            lineHeight: 1,
          }}>
            doom<span style={{ WebkitTextFillColor: "#a78bfa" }}>Stack</span>
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
