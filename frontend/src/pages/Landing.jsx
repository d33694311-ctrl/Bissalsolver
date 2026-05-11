import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { ArrowRight, Recycle, Droplet, Calculator, Globe2, BookText, Users } from "lucide-react";

const modules = [
  { icon: Recycle, name: "Waste Exchange", line: "Trade recyclables locally" },
  { icon: Droplet, name: "Water Tracker", line: "Ledger your consumption" },
  { icon: Calculator, name: "Tax Helper", line: "Auto P&L for micro-business" },
  { icon: Globe2, name: "Currency + Logistics", line: "Real landed cost" },
  { icon: BookText, name: "Mental Journal", line: "Typewriter-styled AI quotes" },
  { icon: Users, name: "Skill Swap", line: "Trade time, not money" },
];

export default function Landing() {
  const { user, login } = useAuth();
  return (
    <div className="min-h-screen bg-white text-black" data-testid="landing-page">
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
              {new Date().toLocaleDateString("en-GB")}
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

      {/* Masthead */}
      <section className="border-b border-black">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-12 gap-8">
          <div className="md:col-span-8">
            <p className="font-mono-print text-xs tracking-widest-print uppercase text-neutral-700 mb-6">
              Est. 2026 — A weekly broadside of practical instruments
            </p>
            <h1 className="font-typewriter text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
              Six small instruments<br />
              for six large problems.
            </h1>
            <p className="font-mono-print mt-8 max-w-xl text-base leading-relaxed">
              Bissal is a quiet, premium workshop for the messy parts of modern life — waste, water,
              taxes, currency, mood, and skill — drawn in the spirit of a 1962 typewritten ledger.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={login}
                data-testid="cta-start"
                className="font-mono-print bg-black text-white px-8 py-4 border border-black hover:bg-[#FF3333] transition-colors uppercase tracking-widest-print text-sm"
              >
                Begin →
              </button>
              <a
                href="#modules"
                className="font-mono-print px-8 py-4 border border-black hover:bg-black hover:text-white transition-colors uppercase tracking-widest-print text-sm"
                data-testid="cta-tour"
              >
                Tour the volumes
              </a>
            </div>
          </div>
          <div className="md:col-span-4 border-l border-black md:pl-8 hidden md:block">
            <p className="font-mono-print text-xs uppercase tracking-widest-print mb-4">In this issue</p>
            <ol className="space-y-3">
              {modules.map((m, i) => (
                <li key={m.name} className="flex gap-3 font-mono-print text-sm">
                  <span className="text-neutral-500 w-6">{String(i + 1).padStart(2, "0")}</span>
                  <span>{m.name}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

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
                transition={{ delay: i * 0.05 }}
                className={`module-card border-black p-8 ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 !== 1 ? "md:border-r" : ""} ${i < modules.length - (modules.length % 3 || 3) ? "border-b" : "border-b md:border-b lg:border-b-0"}`}
                data-testid={`module-card-${i}`}
              >
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

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="font-mono-print text-xs uppercase tracking-widest-print">© Bissal Press — Printed in browser</p>
        <p className="font-mono-print text-xs">Set in Courier Prime & Special Elite. Made for slow hands.</p>
      </footer>
    </div>
  );
}
