import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API } from "@/lib/auth";
import { PageHeader, Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Pill, Search, Sparkles } from "lucide-react";

const SUGGESTED = ["fever", "headache", "acidity", "diabetes", "high blood pressure", "asthma", "allergy", "diarrhea", "thyroid", "cholesterol"];

export default function Medicines() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);

  const search = async (query) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/medicines/search`, { params: { q: query || "" } });
      setItems(res.data || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(q), 220);
    return () => debounce.current && clearTimeout(debounce.current);
    // eslint-disable-next-line
  }, [q]);

  return (
    <div data-testid="medicines-page">
      <PageHeader number="IX" title="The Affordable Medicine Finder" subtitle="Type a health issue or a medicine name. We show common options, generics and cheaper alternatives — sorted by price." />

      <Section title="Live search">
        <div className="relative max-w-2xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a symptom (fever, acidity, diabetes…) or medicine name"
            className="border-black pl-10 font-mono-print"
            data-testid="medicines-search"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-4" data-testid="medicines-suggested">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => setQ(s)}
              className="font-mono-print text-xs uppercase tracking-widest-print border border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
              data-testid={`medicines-suggest-${s.replace(/\s+/g, '-')}`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title={loading ? "Searching…" : `Results (${items.length})`}>
        {!loading && items.length === 0 ? (
          <Empty text={q ? `No matches for "${q}". Try a different symptom or medicine.` : "Type above to begin."} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {items.map((m, i) => {
              const cheapest = m.avg_price <= 30;
              return (
                <div key={m.id} className={`relative border-black p-6 ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 !== 1 ? "md:border-r" : ""} border-b`} data-testid={`med-card-${m.id}`}>
                  {cheapest && <span className="ink-stamp green">CHEAP</span>}
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="w-4 h-4 text-[#FF3333]" />
                    <span className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600">{m.unit}</span>
                  </div>
                  <h4 className="font-typewriter text-xl">{m.name}</h4>
                  <p className="font-mono-print text-xs uppercase tracking-widest-print mt-1 text-neutral-600">Generic: {m.generic || "—"}</p>
                  <p className="font-typewriter text-3xl mt-3">₹{m.avg_price}</p>
                  <div className="mt-4 space-y-2">
                    <div>
                      <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600">Treats</p>
                      <p className="font-mono-print text-sm mt-1">{(m.conditions || []).join(" · ") || "—"}</p>
                    </div>
                    {m.alternatives?.length > 0 && (
                      <div>
                        <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Cheaper / brand alternatives
                        </p>
                        <p className="font-mono-print text-sm mt-1 italic">{m.alternatives.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="A note">
        <p className="font-mono-print text-sm leading-relaxed max-w-2xl">
          Prices are typical Indian retail averages and may vary by city and pharmacy.
          This is informational — always consult a registered medical practitioner before changing medication.
        </p>
      </Section>
    </div>
  );
}
