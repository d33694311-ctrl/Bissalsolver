import React from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section } from "./_shared";
import { useAuth } from "@/lib/auth";
import {
  Calculator, Globe2, Users,
  BookOpen, Gavel, CloudSun, ArrowRight, Heart, Leaf,
} from "lucide-react";

const items = [
  { to: "/dashboard/consumption-exchange", icon: Leaf, name: "Consumption Exchange", desc: "Waste Exchange + Water Tracker — what you give away, what you draw in.", stamp: "GREEN" },
  { to: "/dashboard/tax", icon: Calculator, name: "Tax Helper", desc: "Income & expenses to auto P&L and a printable PDF return.", stamp: "OFFICIAL" },
  { to: "/dashboard/currency", icon: Globe2, name: "Currency + Logistics", desc: "Live rates plus customs, freight and landed cost.", stamp: "LIVE" },
  { to: "/dashboard/revision", icon: BookOpen, name: "Revision", desc: "Notes in, summary + table + flashcards out, printable.", stamp: "STUDY" },
  { to: "/dashboard/amendments", icon: Gavel, name: "Amendments", desc: "RBI, SEBI, GST, IT, MCA, ICAI — live notifications wire.", stamp: "LIVE" },
  { to: "/dashboard/wellness", icon: Heart, name: "Wellness", desc: "Medicine prices + mood journal & anonymous community Q&A.", stamp: "CARE" },
  { to: "/dashboard/weather", icon: CloudSun, name: "Weather", desc: "Hyper-local forecast and role-based daily checklist.", stamp: "TODAY" },
  { to: "/dashboard/skills", icon: Users, name: "Skill Swap", desc: "Offer a skill, receive one — rated by your neighbours.", stamp: "OPEN" },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div data-testid="dashboard-home">
      <PageHeader number="00" title={`Good day, ${user?.name?.split(" ")[0] || "reader"}.`} subtitle={`${today}. Eight chapters await. Pick one and begin.`} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <Link
            key={it.to}
            to={it.to}
            data-testid={`home-card-${it.to.split("/").pop()}`}
            className={`relative module-card lift-hover bg-white border-black p-8 ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 !== 1 ? "md:border-r" : ""} border-b`}
          >
            <span className="ink-stamp">{it.stamp}</span>
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
          Exports are downloadable. Quotes come from Claude. Currency rates and regulator wires come live.
        </p>
      </Section>
    </div>
  );
}
