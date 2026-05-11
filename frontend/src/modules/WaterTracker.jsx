import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/lib/auth";
import { PageHeader, Section, Stat, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

const BENCHMARK = 150;

export default function WaterTracker() {
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), liters: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await axios.get(`${API}/water/logs`, { withCredentials: true });
    setLogs(res.data || []);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.liters || isNaN(parseFloat(form.liters))) return toast.error("Enter litres.");
    setBusy(true);
    try {
      await axios.post(`${API}/water/logs`, { ...form, liters: parseFloat(form.liters) }, { withCredentials: true });
      setForm({ date: new Date().toISOString().slice(0, 10), liters: "", notes: "" });
      toast.success("Logged.");
      await load();
    } catch { toast.error("Could not save."); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    await axios.delete(`${API}/water/logs/${id}`, { withCredentials: true });
    await load();
  };

  const exportXlsx = async () => {
    const res = await axios.get(`${API}/water/export`, { withCredentials: true, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = "water_usage.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const totalWeek = sorted.slice(-7).reduce((s, l) => s + l.liters, 0);
  const avg = sorted.length ? (sorted.reduce((s, l) => s + l.liters, 0) / sorted.length).toFixed(1) : 0;
  const today = sorted[sorted.length - 1];

  return (
    <div data-testid="water-page">
      <PageHeader number="II" title="The Water Tracker" subtitle="Logged like a 1962 utility ledger. Compared against a conservation benchmark.">
        <Button onClick={exportXlsx} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="water-export"><Download className="w-4 h-4 mr-2" /> Export .xlsx</Button>
      </PageHeader>

      <Section title="Summary">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 -m-px">
          <div className="border-black border md:border-r-0"><Stat label="Today" value={`${today?.liters ?? 0} L`} accent={today && today.liters > BENCHMARK} /></div>
          <div className="border-black border md:border-r-0"><Stat label="Last 7 days" value={`${totalWeek} L`} /></div>
          <div className="border-black border"><Stat label="Daily Average" value={`${avg} L`} /></div>
        </div>
      </Section>

      <Section title="Usage chart (target: 150 L/day)">
        {sorted.length === 0 ? <Empty text="No data to chart yet. Log a day below." /> : (
          <div className="h-72 border border-black p-4" data-testid="water-chart">
            <ResponsiveContainer>
              <LineChart data={sorted}>
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#0a0a0a" style={{ fontFamily: "Courier Prime", fontSize: 10 }} />
                <YAxis stroke="#0a0a0a" style={{ fontFamily: "Courier Prime", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #0a0a0a", borderRadius: 0, fontFamily: "Courier Prime" }} />
                <ReferenceLine y={BENCHMARK} stroke="#FF3333" strokeDasharray="4 4" label={{ value: "benchmark", fill: "#FF3333", fontFamily: "Courier Prime", fontSize: 10 }} />
                <Line type="monotone" dataKey="liters" stroke="#0a0a0a" strokeWidth={2} dot={{ fill: "#0a0a0a", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      <Section title="Log a day">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" data-testid="water-form">
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Date</label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border-black mt-2" data-testid="water-date" />
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Litres</label>
            <Input type="number" step="0.1" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} className="border-black mt-2" data-testid="water-liters" />
          </div>
          <div className="md:col-span-2">
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border-black mt-2" data-testid="water-notes" />
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={busy} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="water-submit"><Plus className="w-4 h-4 mr-2" /> Add log</Button>
          </div>
        </form>
      </Section>

      <Section title={`Daily ledger (${logs.length})`}>
        {logs.length === 0 ? <Empty text="No entries yet." /> : (
          <div className="border border-black overflow-x-auto" data-testid="water-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Date</th>
                  <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Litres</th>
                  <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                    <td className="font-mono-print text-sm px-4 py-3">{l.date}</td>
                    <td className={`font-mono-print text-sm px-4 py-3 ${l.liters > BENCHMARK ? "text-[#FF3333]" : ""}`}>{l.liters}</td>
                    <td className="font-mono-print text-sm px-4 py-3">{l.notes || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(l.id)} className="text-neutral-500 hover:text-[#FF3333]" data-testid={`water-delete-${l.id}`}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
