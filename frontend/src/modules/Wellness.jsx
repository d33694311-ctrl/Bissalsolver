import React, { useState } from "react";
import { PageHeader } from "./_shared";
import { Pill, BookText } from "lucide-react";
import Medicines from "./Medicines";
import MentalJournal from "./MentalJournal";

const tabs = [
  { key: "medicines", label: "Medicines", icon: Pill, Component: Medicines },
  { key: "journal", label: "Journal & Q&A", icon: BookText, Component: MentalJournal },
];

export default function Wellness() {
  const [active, setActive] = useState("medicines");
  const Active = tabs.find((t) => t.key === active).Component;
  return (
    <div data-testid="wellness-page">
      <PageHeader
        number="V·IX"
        title="Wellness"
        subtitle="Medicine prices on one page, mood and community help on the other. One chapter, two pages."
      />
      <div className="border-b border-black flex overflow-x-auto" data-testid="wellness-tabs">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex items-center gap-2 px-6 py-4 font-mono-print text-xs uppercase tracking-widest-print border-r border-black ${
                isActive ? "bg-black text-white" : "hover:bg-neutral-100"
              }`}
              data-testid={`wellness-tab-${t.key}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>
      <div data-testid={`wellness-content-${active}`}>
        <Active />
      </div>
    </div>
  );
}
