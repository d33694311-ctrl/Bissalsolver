import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/lib/auth";
import { PageHeader, Section, Stat, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, FileText } from "lucide-react";

const CATEGORIES = ["sales", "services", "freelance", "supplies", "rent", "utilities", "salary", "marketing", "other"];

export default function TaxHelper() {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({
    type: "income", category: "sales", amount: "", description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const load = async () => {
    const [e, s] = await Promise.all([
      axios.get(`${API}/tax/entries`, { withCredentials: true }),
      axios.get(`${API}/tax/summary`, { withCredentials: true }),
    ]);
    setEntries(e.data || []);
    setSummary(s.data);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount))) return toast.error("Enter amount.");
    try {
      await axios.post(`${API}/tax/entries`, { ...form, amount: parseFloat(form.amount) }, { withCredentials: true });
      setForm({ ...form, amount: "", description: "" });
      toast.success("Entry saved.");
      await load();
    } catch { toast.error("Could not save."); }
  };

  const remove = async (id) => {
    await axios.delete(`${API}/tax/entries/${id}`, { withCredentials: true });
    await load();
  };

  const exportFile = async (kind) => {
    const res = await axios.get(`${API}/tax/export/${kind}`, { withCredentials: true, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = kind === "pdf" ? "tax_summary.pdf" : "tax_summary.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="tax-page">
      <PageHeader number="III" title="The Tax Helper" subtitle="Drop income and expenses. We compile the P&L and an estimated tax — printable.">
        <Button onClick={() => exportFile("pdf")} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="tax-export-pdf"><FileText className="w-4 h-4 mr-2" /> PDF</Button>
        <Button onClick={() => exportFile("excel")} variant="outline" className="border-black uppercase tracking-widest-print text-xs hover:bg-black hover:text-white" data-testid="tax-export-excel"><Download className="w-4 h-4 mr-2" /> Excel</Button>
      </PageHeader>

      <Section title="Summary">
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 -m-px">
            <div className="border-black border lg:border-r-0"><Stat label="Income" value={summary.income.toFixed(2)} /></div>
            <div className="border-black border lg:border-r-0"><Stat label="Expenses" value={summary.expenses.toFixed(2)} /></div>
            <div className="border-black border lg:border-r-0"><Stat label="Net profit" value={summary.net_profit.toFixed(2)} /></div>
            <div className="border-black border"><Stat label="Est. Tax" value={summary.estimated_tax.toFixed(2)} accent /></div>
          </div>
        )}
      </Section>

      <Section title="New entry">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end" data-testid="tax-form">
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Type</label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="border-black mt-2" data-testid="tax-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Category</label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="border-black mt-2" data-testid="tax-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Amount</label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border-black mt-2" data-testid="tax-amount" />
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Date</label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border-black mt-2" data-testid="tax-date" />
          </div>
          <div className="md:col-span-2">
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Description</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-black mt-2" data-testid="tax-desc" />
          </div>
          <div className="md:col-span-6">
            <Button type="submit" className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="tax-submit"><Plus className="w-4 h-4 mr-2" /> Add entry</Button>
          </div>
        </form>
      </Section>

      <Section title={`Ledger (${entries.length})`}>
        {entries.length === 0 ? <Empty text="No entries yet." /> : (
          <div className="border border-black overflow-x-auto" data-testid="tax-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Date</th>
                  <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Type</th>
                  <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Category</th>
                  <th className="text-right font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Amount</th>
                  <th className="text-left font-mono-print text-xs tracking-widest-print uppercase px-4 py-3">Description</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-neutral-200">
                    <td className="font-mono-print text-sm px-4 py-3">{e.date}</td>
                    <td className="font-mono-print text-sm px-4 py-3 uppercase">{e.type}</td>
                    <td className="font-mono-print text-sm px-4 py-3">{e.category}</td>
                    <td className={`font-mono-print text-sm px-4 py-3 text-right ${e.type === "expense" ? "text-[#FF3333]" : ""}`}>{e.type === "expense" ? "-" : "+"}{e.amount.toFixed(2)}</td>
                    <td className="font-mono-print text-sm px-4 py-3">{e.description || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(e.id)} className="text-neutral-500 hover:text-[#FF3333]" data-testid={`tax-delete-${e.id}`}><Trash2 className="w-4 h-4" /></button>
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
