import React from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section } from "./_shared";
import { useAuth } from "@/lib/auth";
import { Recycle, Droplet, Calculator, Globe2, BookText, Users, ArrowRight } from "lucide-react";

const items = [
  { to: "/dashboard/waste", icon: Recycle, name: "Waste Exchange", desc: "List recyclables, find takers nearby, coordinate handoff." },
  { to: "/dashboard/water", icon: Droplet, name: "Water Tracker", desc: "Daily logs, weekly charts, downloadable Excel report." },
  { to: "/dashboard/tax", icon: Calculator, name: "Tax Helper", desc: "Income & expenses to auto P&L and a printable PDF return." },
  { to: "/dashboard/currency", icon: Globe2, name: "Currency + Logistics", desc: "Live rates plus customs, freight and landed cost." },
  { to: "/dashboard/journal", icon: BookText, name: "Mental Journal", desc: "Mood logs and a fresh typewriter quote from Claude." },
  { to: "/dashboard/skills", icon: Users, name: "Skill Swap", desc: "Offer a skill, receive one — rated by your neighbours." },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div data-testid="dashboard-home">
      <PageHeader number="00" title={`Good day, ${user?.name?.split(" ")[0] || "reader"}.`} subtitle={`${today}. Six instruments are below. Pick one and begin.`} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <Link
            key={it.to}
            to={it.to}
            data-testid={`home-card-${it.to.split("/").pop()}`}
            className={`module-card border-black p-8 ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 !== 1 ? "md:border-r" : ""} border-b`}
          >
            <div className="flex items-start justify-between mb-12">
              <it.icon className="w-8 h-8" strokeWidth={1.25} />
              <span className="font-mono-print text-xs tracking-widest-print">№ {String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="font-typewriter text-2xl mb-2">{it.name}</h3>
            <p className="font-mono-print text-sm leading-relaxed mb-8">{it.desc}</p>
            <div className="flex items-center font-mono-print text-xs tracking-widest-print uppercase">
              Enter <ArrowRight className="w-4 h-4 ml-2 module-arrow" />
            </div>
          </Link>
        ))}
      </div>
      <Section title="A note from the editors">
        <p className="font-mono-print text-sm max-w-2xl leading-relaxed">
          Bissal collects tiny utilities for daily problems and dresses them in old paper. Every action is local to your account.
          Exports are downloadable. Quotes come from Claude. Currency rates come live from the open exchange-rate network.
        </p>
      </Section>
    </div>
  );
}
