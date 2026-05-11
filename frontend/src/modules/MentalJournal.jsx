import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { API } from "@/lib/auth";
import { PageHeader, Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download } from "lucide-react";

const MOODS = [
  { v: "happy", l: "Happy" },
  { v: "calm", l: "Calm" },
  { v: "neutral", l: "Neutral" },
  { v: "anxious", l: "Anxious" },
  { v: "sad", l: "Sad" },
  { v: "angry", l: "Angry" },
];

const Typewriter = ({ text }) => (
  <motion.span
    initial="hidden"
    animate="visible"
    variants={{ visible: { transition: { staggerChildren: 0.025 } } }}
    aria-label={text}
    data-testid="typewriter-quote"
  >
    {text.split("").map((c, i) => (
      <motion.span
        key={i}
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        transition={{ duration: 0.05 }}
      >
        {c}
      </motion.span>
    ))}
  </motion.span>
);

export default function MentalJournal() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), mood: "calm", note: "" });
  const [busy, setBusy] = useState(false);
  const [latestQuote, setLatestQuote] = useState("");

  const load = async () => {
    const res = await axios.get(`${API}/journal/entries`, { withCredentials: true });
    setEntries(res.data || []);
    if (res.data?.[0]?.quote) setLatestQuote(res.data[0].quote);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.note.trim()) return toast.error("Write a few words.");
    setBusy(true);
    try {
      const res = await axios.post(`${API}/journal/entries`, form, { withCredentials: true });
      setLatestQuote(res.data.quote || "");
      setForm({ ...form, note: "" });
      toast.success("Entry saved and a quote arrives.");
      await load();
    } catch { toast.error("Could not save."); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    await axios.delete(`${API}/journal/entries/${id}`, { withCredentials: true });
    await load();
  };

  const exportPdf = async () => {
    const res = await axios.get(`${API}/journal/export`, { withCredentials: true, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = "journal.pdf"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="journal-page">
      <PageHeader number="V" title="The Micro-Journal" subtitle="Note your mood, and a small motivational quote will be typed back to you.">
        <Button onClick={exportPdf} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="journal-export"><Download className="w-4 h-4 mr-2" /> Export PDF</Button>
      </PageHeader>

      {latestQuote && (
        <Section title="Today's quote">
          <div className="border border-black bg-[#F4F4F4] p-8 md:p-12" key={latestQuote} data-testid="quote-card">
            <p className="font-typewriter text-xl md:text-2xl leading-relaxed">
              <Typewriter text={latestQuote} />
              <span className="cursor-blink ml-1" />
            </p>
            <p className="font-mono-print text-xs uppercase tracking-widest-print mt-6 text-neutral-600">— typed by Claude, just now</p>
          </div>
        </Section>
      )}

      <Section title="Write an entry">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-4" data-testid="journal-form">
          <div className="md:col-span-2">
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Date</label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border-black mt-2" data-testid="journal-date" />
          </div>
          <div className="md:col-span-2">
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Mood</label>
            <Select value={form.mood} onValueChange={(v) => setForm({ ...form, mood: v })}>
              <SelectTrigger className="border-black mt-2" data-testid="journal-mood"><SelectValue /></SelectTrigger>
              <SelectContent>{MOODS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-6">
            <label className="font-mono-print text-xs tracking-widest-print uppercase">A few lines</label>
            <Textarea rows={4} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="border-black mt-2 font-mono-print" placeholder="What happened today…" data-testid="journal-note" />
          </div>
          <div className="md:col-span-6">
            <Button type="submit" disabled={busy} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="journal-submit">
              <Plus className="w-4 h-4 mr-2" /> {busy ? "Saving & typing…" : "Save & receive quote"}
            </Button>
          </div>
        </form>
      </Section>

      <Section title={`Past entries (${entries.length})`}>
        {entries.length === 0 ? <Empty text="Your journal is empty. Begin." /> : (
          <div className="space-y-0 border border-black" data-testid="journal-list">
            {entries.map((e, i) => (
              <div key={e.id} className={`p-6 ${i !== entries.length - 1 ? "border-b border-neutral-300" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="font-mono-print text-xs tracking-widest-print uppercase">{e.date} • mood: {e.mood}</p>
                  <button onClick={() => remove(e.id)} className="text-neutral-500 hover:text-[#FF3333]" data-testid={`journal-delete-${e.id}`}><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className="font-mono-print text-sm mt-3 leading-relaxed">{e.note}</p>
                {e.quote && <p className="font-typewriter italic text-sm mt-3 pl-4 border-l-2 border-[#FF3333]">— {e.quote}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
