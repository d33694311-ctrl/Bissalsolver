import React, { useState } from "react";
import { PageHeader } from "./_shared";
import { Recycle, Droplet } from "lucide-react";
import WasteExchange from "./WasteExchange";
import WaterTracker from "./WaterTracker";

const tabs = [
  { key: "waste", label: "Waste Exchange", icon: Recycle, Component: WasteExchange },
  { key: "water", label: "Water Tracker", icon: Droplet, Component: WaterTracker },
];

export default function ConsumptionExchange() {
  const [active, setActive] = useState("waste");
  const Active = tabs.find((t) => t.key === active).Component;
  return (
    <div data-testid="consumption-exchange-page">
      <PageHeader
        number="I·II"
        title="Consumption Exchange"
        subtitle="What you give away and what you draw in — recyclables and water, two ledgers in one chapter."
      />
      <div className="border-b border-black flex overflow-x-auto" data-testid="consumption-tabs">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex items-center gap-2 px-6 py-4 font-mono-print text-xs uppercase tracking-widest-print border-r border-black ${
                isActive ? "bg-black text-white" : "hover:bg-neutral-100"
              }`}
              data-testid={`consumption-tab-${t.key}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>
      <div data-testid={`consumption-content-${active}`}>
        <Active />
      </div>
    </div>
  );
}
