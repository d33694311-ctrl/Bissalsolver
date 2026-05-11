import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/lib/auth";
import { PageHeader, Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Building2 } from "lucide-react";

export default function Amendments() {
  const [items, setItems] = useState([]);
  const [sources, setSources] = useState([]);
  const [source, setSource] = useState("all");
  const [q, setQ] = useState("");
  const [cachedAt, setCachedAt] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (force = false) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/amendments`, { params: { source, q: q || undefined, force } });
      setItems(res.data.items || []);
      setSources(res.data.sources || []);
      setCachedAt(res.data.cached_at);
    } catch (e) {
      toast.error("Could not fetch sources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [source]);

  return (
    <div data-testid="amendments-page">
      <PageHeader number="VIII" title="The Amendment Wire" subtitle="Live notifications, circulars and amendments from India's regulators.">
        <Button onClick={() => load(true)} disabled={loading} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="amend-refresh">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </PageHeader>

      <Section title="Source filter">
        <div className="flex flex-wrap gap-2 mb-4" data-testid="amend-sources">
          <button onClick={() => setSource("all")} className={`font-mono-print text-xs uppercase tracking-widest-print border border-black px-3 py-2 ${source === "all" ? "bg-black text-white" : "hover:bg-neutral-100"}`} data-testid="amend-src-all">All</button>
          {sources.map((s) => (
            <button key={s} onClick={() => setSource(s)} className={`font-mono-print text-xs uppercase tracking-widest-print border border-black px-3 py-2 ${source === s ? "bg-black text-white" : "hover:bg-neutral-100"}`} data-testid={`amend-src-${s.replace(/\s+/g, '-').toLowerCase()}`}>
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 max-w-xl">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by topic (e.g. GST, lending, IPO, audit)" className="border-black" data-testid="amend-search-input" />
          <Button type="submit" className="bg-black text-white hover:bg-[#FF3333]" data-testid="amend-search-btn">Go</Button>
        </form>
        {cachedAt && <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600 mt-3">Last fetched: {new Date(cachedAt).toLocaleString("en-GB")}</p>}
      </Section>

      <Section title={`Items (${items.length})`}>
        {loading ? (
          <p className="font-mono-print text-sm italic">Fetching wires…</p>
        ) : items.length === 0 ? (
          <Empty text="No items returned. Some regulator sites occasionally block automated fetches — try Refresh or another source." />
        ) : (
          <div className="border border-black" data-testid="amend-list">
            {items.map((it, i) => (
              <a
                key={i}
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`block p-5 ${i !== items.length - 1 ? "border-b border-neutral-300" : ""} hover:bg-[#fffbf2]`}
                data-testid={`amend-item-${i}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 font-mono-print text-[10px] uppercase tracking-widest-print bg-black text-white px-2 py-1">
                        <Building2 className="w-3 h-3" /> {it.source}
                      </span>
                      {it.published && <span className="font-mono-print text-[10px] text-neutral-600">{it.published}</span>}
                    </div>
                    <p className="font-typewriter text-lg leading-snug">{it.title}</p>
                    {it.summary && <p className="font-mono-print text-sm mt-2 text-neutral-700 leading-relaxed">{it.summary}</p>}
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </div>
        )}
      </Section>

      <Section title="Sources">
        <p className="font-mono-print text-sm leading-relaxed">
          RBI · SEBI · CBIC (GST) · Income Tax India · MCA · ICAI. Items are fetched live and cached for 30 minutes.
          For binding text, always open the official link.
        </p>
      </Section>
    </div>
  );
}
