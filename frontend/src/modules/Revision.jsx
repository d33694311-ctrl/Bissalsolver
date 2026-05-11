import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { API } from "@/lib/auth";
import { PageHeader, Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Trash2, Download, RotateCw, Layers } from "lucide-react";

export default function Revision() {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flipped, setFlipped] = useState({});

  const load = async () => {
    const res = await axios.get(`${API}/revision/sessions`, { withCredentials: true });
    setSessions(res.data || []);
    if (!active && res.data?.[0]) setActive(res.data[0]);
  };

  useEffect(() => { load(); }, []);

  const generate = async (e) => {
    e.preventDefault();
    if (notes.trim().length < 30) return toast.error("Paste at least 30 characters.");
    setBusy(true);
    try {
      const res = await axios.post(`${API}/revision/generate`, { title, notes }, { withCredentials: true });
      setActive(res.data);
      setTitle("");
      setNotes("");
      toast.success("Revision sheet prepared.");
      await load();
    } catch (err) {
      toast.error("Could not generate.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    await axios.delete(`${API}/revision/sessions/${id}`, { withCredentials: true });
    if (active?.id === id) setActive(null);
    await load();
  };

  const exportPdf = async (id) => {
    const res = await axios.get(`${API}/revision/sessions/${id}/pdf`, { withCredentials: true, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = `revision_${id.slice(0, 6)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="revision-page">
      <PageHeader number="VII" title="The Revision Sheet" subtitle="Paste raw notes. Claude summarises, builds a revision table, and a flashcard deck — ready to print." />

      <Section title="Compose a new sheet">
        <form onSubmit={generate} className="space-y-4" data-testid="revision-form">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter / topic title (optional)" className="border-black" data-testid="revision-title" />
          <Textarea rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste your notes here — definitions, formulas, dates, anything…" className="border-black font-mono-print" data-testid="revision-notes" />
          <Button type="submit" disabled={busy} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="revision-generate">
            <Sparkles className="w-4 h-4 mr-2" /> {busy ? "Composing…" : "Summarise & build flashcards"}
          </Button>
        </form>
      </Section>

      {sessions.length > 0 && (
        <Section title="Saved sheets">
          <div className="flex gap-2 flex-wrap" data-testid="revision-sessions">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActive(s); setFlipped({}); }}
                className={`font-mono-print text-xs uppercase tracking-widest-print border border-black px-3 py-2 ${active?.id === s.id ? "bg-black text-white" : "hover:bg-neutral-100"}`}
                data-testid={`revision-session-${s.id}`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </Section>
      )}

      {active && (
        <>
          <Section title={`Summary · ${active.title}`} right={
            <div className="flex gap-2">
              <Button onClick={() => exportPdf(active.id)} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="revision-export"><Download className="w-4 h-4 mr-2" /> PDF</Button>
              <Button onClick={() => remove(active.id)} variant="outline" className="border-black uppercase tracking-widest-print text-xs hover:bg-black hover:text-white"><Trash2 className="w-4 h-4" /></Button>
            </div>
          }>
            <div className="border border-black bg-[#fffbf2] p-6">
              <p className="font-mono-print text-sm leading-relaxed" data-testid="revision-summary">{active.summary}</p>
            </div>
          </Section>

          <Section title="Revision table">
            <div className="border border-black overflow-x-auto" data-testid="revision-table">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3 w-1/4">Topic</th>
                    <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Key point</th>
                    <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3 w-1/4">Example / Formula</th>
                  </tr>
                </thead>
                <tbody>
                  {(active.table || []).map((r, i) => (
                    <tr key={i} className="border-b border-neutral-200">
                      <td className="font-mono-print text-sm px-4 py-3 font-bold">{r.topic}</td>
                      <td className="font-mono-print text-sm px-4 py-3">{r.key_point}</td>
                      <td className="font-mono-print text-sm px-4 py-3 italic">{r.example_or_formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={<span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Flashcards · click to flip</span>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="revision-flashcards">
              {(active.flashcards || []).map((fc, i) => {
                const isFlipped = !!flipped[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
                    className="relative border border-black h-48 p-5 text-left bg-white hover:bg-[#fffbf2] lift-hover"
                    data-testid={`revision-card-${i}`}
                  >
                    <span className="absolute top-2 right-3 font-mono-print text-xs text-neutral-500">№ {String(i + 1).padStart(2, "0")}</span>
                    <p className="font-mono-print text-[10px] tracking-widest-print uppercase text-neutral-600">{isFlipped ? "Answer" : "Question"}</p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={isFlipped ? "a" : "q"}
                        initial={{ opacity: 0, rotateY: 90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        exit={{ opacity: 0, rotateY: -90 }}
                        className="font-typewriter text-lg leading-relaxed mt-3"
                      >
                        {isFlipped ? fc.a : fc.q}
                      </motion.p>
                    </AnimatePresence>
                    <RotateCw className="absolute bottom-3 right-3 w-3 h-3 text-neutral-400" />
                  </button>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {sessions.length === 0 && !active && (
        <Section><Empty text="No revision sheets yet — paste some notes above." /></Section>
      )}
    </div>
  );
}
