import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { ArrowRight, Recycle, Droplet, Calculator, Globe2, BookText, Users, Heart, BookOpen, Gavel, Pill, CloudSun } from "lucide-react";

const modules = [
  { icon: Recycle, name: "Waste Exchange", line: "Trade recyclables locally", stamp: "FRESH", stampClass: "green" },
  { icon: Droplet, name: "Water Tracker", line: "Ledger your consumption", stamp: "DAILY", stampClass: "blue" },
  { icon: Calculator, name: "Tax Helper", line: "Auto P&L for micro-business", stamp: "OFFICIAL", stampClass: "" },
  { icon: Globe2, name: "Currency + Logistics", line: "Real landed cost", stamp: "LIVE", stampClass: "" },
  { icon: BookOpen, name: "Revision", line: "AI summaries & flashcards", stamp: "STUDY", stampClass: "blue" },
  { icon: Gavel, name: "Amendment Wire", line: "RBI · SEBI · GST · IT · MCA", stamp: "LIVE", stampClass: "" },
  { icon: Pill, name: "Medicine Finder", line: "Search by symptom, find cheaper", stamp: "CHEAP", stampClass: "green" },
  { icon: BookText, name: "Mental Journal", line: "Typewriter quotes & community Q&A", stamp: "QUIET", stampClass: "green" },
  { icon: CloudSun, name: "Weather Hub", line: "Hyper-local + persona checklists", stamp: "TODAY", stampClass: "blue" },
  { icon: Users, name: "Skill Swap", line: "Trade time, not money", stamp: "OPEN", stampClass: "blue" },
];

const TypewriterSVG = () => (
  <svg viewBox="0 0 220 160" className="typewriter-svg w-full max-w-xs mx-auto" fill="none" stroke="#0a0a0a" strokeWidth="2">
    {/* Paper */}
    <rect className="carriage" x="60" y="6" width="100" height="40" fill="#ffffff" />
    <line x1="68" y1="18" x2="152" y2="18" stroke="#999" strokeWidth="1" />
    <line x1="68" y1="26" x2="152" y2="26" stroke="#999" strokeWidth="1" />
    <line x1="68" y1="34" x2="120" y2="34" stroke="#FF3333" strokeWidth="1.5" />
    {/* Body */}
    <rect x="30" y="46" width="160" height="80" fill="#fffbf2" />
    <rect x="40" y="58" width="140" height="14" fill="#0a0a0a" />
    <text x="110" y="69" fontFamily="Special Elite, monospace" fontSize="9" fill="#FF3333" textAnchor="middle" letterSpacing="2">BISSAL</text>
    {/* Keys */}
    <g fill="#0a0a0a">
      <circle className="key k1" cx="60" cy="92" r="6" />
      <circle className="key k2" cx="78" cy="92" r="6" />
      <circle className="key k3" cx="96" cy="92" r="6" />
      <circle className="key k4" cx="114" cy="92" r="6" />
      <circle className="key k5" cx="132" cy="92" r="6" />
      <circle className="key k3" cx="150" cy="92" r="6" />
      <circle className="key k4" cx="69" cy="108" r="6" />
      <circle className="key k1" cx="87" cy="108" r="6" />
      <circle className="key k2" cx="105" cy="108" r="6" />
      <circle className="key k5" cx="123" cy="108" r="6" />
      <circle className="key k3" cx="141" cy="108" r="6" />
    </g>
    {/* Spacebar */}
    <rect x="68" y="120" width="84" height="6" fill="#0a0a0a" />
    {/* Base */}
    <line x1="22" y1="130" x2="198" y2="130" stroke="#0a0a0a" strokeWidth="2" />
    <line x1="36" y1="138" x2="184" y2="138" stroke="#0a0a0a" strokeWidth="1" strokeDasharray="3 3" />
    {/* Ribbon */}
    <line className="ribbon" x1="40" y1="76" x2="180" y2="76" stroke="#FF3333" strokeWidth="2" strokeDasharray="6 4" />
  </svg>
);

export default function Landing() {
  const { user, login } = useAuth();
  const today = new Date().toLocaleDateString("en-GB");

  return (
    <div className="min-h-screen bg-white text-black overflow-hidden" data-testid="landing-page">
      {/* Top bar */}
      <header className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="bissal-mark text-2xl" data-testid="brand-mark">Bissal.</span>
            <span className="font-mono-print text-xs tracking-widest-print uppercase text-neutral-600 hidden sm:inline">
              Problem Solver Hub — Vol. I
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono-print text-xs uppercase tracking-widest-print hidden md:inline">
              {today}
            </span>
            {user ? (
              <Link to="/dashboard" className="font-mono-print text-sm border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors" data-testid="open-dashboard-link">
                Open Dashboard →
              </Link>
            ) : (
              <button
                onClick={login}
                data-testid="login-btn"
                className="font-mono-print text-sm border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Ticker */}
      <div className="ticker" data-testid="ticker">
        <div className="ticker__track">
          <span>WORKSHOP OPEN <span className="dot">●</span></span>
          <span>SIX INSTRUMENTS, INFINITE USES <span className="dot">●</span></span>
          <span>NEW: COMMUNITY HEALTH Q&amp;A <span className="dot">●</span></span>
          <span>CLAUDE TYPES YOUR DAILY QUOTE <span className="dot">●</span></span>
          <span>LIVE FX RATES VIA OPEN.ER-API <span className="dot">●</span></span>
          <span>EXPORT TO PDF · EXCEL <span className="dot">●</span></span>
          <span>WORKSHOP OPEN <span className="dot">●</span></span>
          <span>SIX INSTRUMENTS, INFINITE USES <span className="dot">●</span></span>
          <span>NEW: COMMUNITY HEALTH Q&amp;A <span className="dot">●</span></span>
        </div>
      </div>

      {/* Masthead */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 print-in">
            <p className="font-mono-print text-xs tracking-widest-print uppercase text-neutral-700 mb-6">
              Est. 2026 — A weekly broadside of practical instruments
            </p>
            <h1 className="font-typewriter text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
              <span className="marker-underline">Ten small instruments</span><br />
              for <span className="text-[#FF3333]">ten</span> large problems.
            </h1>
            <p className="font-mono-print mt-8 max-w-xl text-base leading-relaxed">
              Bissal is a quiet, premium workshop for the messy parts of modern life — waste, water,
              taxes, currency, study, law, medicine, mood, weather and skill — drawn in the spirit of a 1962 typewritten ledger.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={login}
                data-testid="cta-start"
                className="font-mono-print bg-black text-white px-8 py-4 border border-black hover:bg-[#FF3333] transition-colors uppercase tracking-widest-print text-sm lift-hover"
              >
                Begin →
              </button>
              <a
                href="#modules"
                className="font-mono-print px-8 py-4 border border-black hover:bg-black hover:text-white transition-colors uppercase tracking-widest-print text-sm lift-hover"
                data-testid="cta-tour"
              >
                Tour the volumes
              </a>
            </div>
            <p className="pull-quote text-lg md:text-xl mt-12 max-w-xl print-in delay-2">
              A small tool, kept on a clean shelf, beats a clever app that nobody opens twice.
            </p>
          </div>

          <div className="md:col-span-5 print-in delay-1">
            <div className="border border-black p-6 lift-hover bg-[#fffbf2] relative">
              <span className="ink-stamp">VOL · I</span>
              <TypewriterSVG />
              <p className="font-mono-print text-[10px] tracking-widest-print uppercase mt-4 text-neutral-600 text-center">
                Now printing — {today}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4 border-b border-black">
        <div className="flex-1 print-rule"></div>
        <span className="font-mono-print text-xs uppercase tracking-widest-print">In this issue</span>
        <div className="flex-1 print-rule"></div>
      </div>

      {/* Modules grid */}
      <section id="modules" className="border-b border-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`relative module-card lift-hover bg-white border-black p-8 ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 !== 1 ? "md:border-r" : ""} border-b`}
                data-testid={`module-card-${i}`}
              >
                <span className={`ink-stamp ${m.stampClass}`}>{m.stamp}</span>
                <div className="flex items-start justify-between mb-12">
                  <m.icon className="w-8 h-8" strokeWidth={1.25} />
                  <span className="font-mono-print text-xs tracking-widest-print">№ {String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="font-typewriter text-2xl mb-2">{m.name}</h3>
                <p className="font-mono-print text-sm leading-relaxed mb-8">{m.line}</p>
                <div className="flex items-center font-mono-print text-xs tracking-widest-print uppercase">
                  Open volume <ArrowRight className="w-4 h-4 ml-2 module-arrow" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* New: Community Help callout */}
      <section className="border-b border-black bg-[#fffbf2]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-2 flex justify-center md:justify-start">
            <Heart className="w-14 h-14 text-[#FF3333]" strokeWidth={1.25} />
          </div>
          <div className="md:col-span-7">
            <p className="font-mono-print text-xs tracking-widest-print uppercase text-neutral-700">New chapter in the Journal</p>
            <h2 className="font-typewriter text-3xl md:text-4xl mt-2">
              <span className="marker-underline">Community Health Q&amp;A</span>
            </h2>
            <p className="font-mono-print text-sm leading-relaxed mt-3 max-w-2xl">
              Inside the Mental Journal, post a health concern publicly — anonymously if you wish — and the Bissal community
              responds with suggestions and lived experience.
            </p>
          </div>
          <div className="md:col-span-3 flex md:justify-end">
            <button
              onClick={user ? () => (window.location.href = "/dashboard/journal") : login}
              className="font-mono-print text-sm border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors uppercase tracking-widest-print lift-hover"
              data-testid="cta-health"
            >
              Open the Journal →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="font-mono-print text-xs uppercase tracking-widest-print">© Bissal Press — Printed in browser</p>
        <p className="font-mono-print text-xs">Set in Courier Prime &amp; Special Elite. Made for slow hands.</p>
      </footer>
    </div>
  );
}
