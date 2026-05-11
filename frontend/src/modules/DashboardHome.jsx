import React from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section } from "./_shared";
import { useAuth } from "@/lib/auth";
import {
  Recycle, Droplet, Calculator, Globe2, BookText, Users,
  BookOpen, Gavel, Pill, CloudSun, ArrowRight,
} from "lucide-react";

const groups = [
  {
    head: "Consumption Exchange",
    items: [
      { to: "/dashboard/waste", icon: Recycle, name: "Waste Exchange", desc: "List recyclables, find takers nearby, coordinate handoff.", stamp: "FRESH" },
      { to: "/dashboard/water", icon: Droplet, name: "Water Tracker", desc: "Daily logs, weekly charts, downloadable Excel report.", stamp: "DAILY" },
    ],
  },
  {
    head: "Finance",
    items: [
      { to: "/dashboard/tax", icon: Calculator, name: "Tax Helper", desc: "Income & expenses to auto P&L and a printable PDF return.", stamp: "OFFICIAL" },
      { to: "/dashboard/currency", icon: Globe2, name: "Currency + Logistics", desc: "Live rates plus customs, freight and landed cost.", stamp: "LIVE" },
    ],
  },
  {
    head: "Education",
    items: [
      { to: "/dashboard/revision", icon: BookOpen, name: "Revision", desc: "Notes in, summary + table + flashcards out, printable.", stamp: "STUDY" },
      { to: "/dashboard/amendments", icon: Gavel, name: "Amendments", desc: "RBI, SEBI, GST, IT, MCA, ICAI — live notifications wire.", stamp: "LIVE" },
    ],
  },
  {
    head: "Wellness",
    items: [
      { to: "/dashboard/medicines", icon: Pill, name: "Medicines", desc: "Live search by symptom for prices and cheaper alternatives.", stamp: "CHEAP" },
      { to: "/dashboard/journal", icon: BookText, name: "Journal & Health Q&A", desc: "Mood logs, AI quotes, plus anonymous community help.", stamp: "QUIET" },
    ],
  },
  {
    head: "Community",
    items: [
      { to: "/dashboard/weather", icon: CloudSun, name: "Weather", desc: "Hyper-local forecast and role-based daily checklist.", stamp: "TODAY" },
      { to: "/dashboard/skills", icon: Users, name: "Skill Swap", desc: "Offer a skill, receive one — rated by your neighbours.", stamp: "OPEN" },
    ],
  },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div data-testid="dashboard-home">
      <PageHeader number="00" title={`Good day, ${user?.name?.split(" ")[0] || "reader"}.`} subtitle={`${today}. Ten instruments under five heads. Pick one and begin.`} />
      {groups.map((g, gi) => (
        <Section key={g.head} title={g.head}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 -m-px">
            {g.items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                data-testid={`home-card-${it.to.split("/").pop()}`}
                className="relative module-card lift-hover bg-white border border-black p-6"
              >
                <span className="ink-stamp">{it.stamp}</span>
                <div className="flex items-start justify-between mb-8">
                  <it.icon className="w-7 h-7" strokeWidth={1.25} />
                </div>
                <h3 className="font-typewriter text-xl mb-2">{it.name}</h3>
                <p className="font-mono-print text-sm leading-relaxed mb-6">{it.desc}</p>
                <div className="flex items-center font-mono-print text-xs tracking-widest-print uppercase">
                  Enter <ArrowRight className="w-4 h-4 ml-2 module-arrow" />
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ))}
      <Section title="A note from the editors">
        <p className="font-mono-print text-sm max-w-2xl leading-relaxed">
          Bissal collects tiny utilities for daily problems and dresses them in old paper. Every action is local to your account.
          Exports are downloadable. Quotes come from Claude. Currency rates and regulator wires come live.
        </p>
      </Section>
    </div>
  );
}
