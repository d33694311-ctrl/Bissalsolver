import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/lib/auth";
import { PageHeader, Section, Stat } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "NPR", "JPY", "CNY", "AUD", "CAD", "AED"];

export default function CurrencyConverter() {
  const [form, setForm] = useState({
    base: "USD", target: "INR", amount: 1000, customs_pct: 10, transport_cost: 50, other_fees: 25,
  });
  const [result, setResult] = useState(null);
  const [rateInfo, setRateInfo] = useState(null);

  useEffect(() => {
    axios.get(`${API}/currency/rates`, { params: { base: form.base } }).then((r) => setRateInfo(r.data)).catch(() => {});
    // eslint-disable-next-line
  }, [form.base]);

  const calc = async (e) => {
    e?.preventDefault();
    try {
      const res = await axios.post(`${API}/currency/calculate`, {
        ...form,
        amount: parseFloat(form.amount),
        customs_pct: parseFloat(form.customs_pct),
        transport_cost: parseFloat(form.transport_cost),
        other_fees: parseFloat(form.other_fees),
      });
      setResult(res.data);
    } catch {
      toast.error("Calculation failed.");
    }
  };

  return (
    <div data-testid="currency-page">
      <PageHeader number="IV" title="Currency & Logistics" subtitle="Live exchange + customs + freight = the true landed cost." />

      <Section title="Conversion">
        <form onSubmit={calc} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end" data-testid="currency-form">
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">From</label>
            <Select value={form.base} onValueChange={(v) => setForm({ ...form, base: v })}>
              <SelectTrigger className="border-black mt-2" data-testid="currency-base"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">To</label>
            <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
              <SelectTrigger className="border-black mt-2" data-testid="currency-target"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Amount</label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border-black mt-2" data-testid="currency-amount" />
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Customs %</label>
            <Input type="number" value={form.customs_pct} onChange={(e) => setForm({ ...form, customs_pct: e.target.value })} className="border-black mt-2" data-testid="currency-customs" />
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Transport (target)</label>
            <Input type="number" value={form.transport_cost} onChange={(e) => setForm({ ...form, transport_cost: e.target.value })} className="border-black mt-2" data-testid="currency-transport" />
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Other fees</label>
            <Input type="number" value={form.other_fees} onChange={(e) => setForm({ ...form, other_fees: e.target.value })} className="border-black mt-2" data-testid="currency-fees" />
          </div>
          <div className="md:col-span-6">
            <Button type="submit" className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="currency-calc"><Calculator className="w-4 h-4 mr-2" /> Calculate landed cost</Button>
          </div>
        </form>
      </Section>

      {result && (
        <Section title="Result">
          <div className="border border-black p-8 paper-grain" data-testid="currency-result">
            <p className="font-mono-print text-xs tracking-widest-print uppercase text-neutral-600">Exchange rate</p>
            <p className="font-typewriter text-2xl">1 {result.base} = {result.rate.toFixed(4)} {result.target}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-6 -m-px">
              <div className="border-black border md:border-r-0"><Stat label="Converted" value={`${result.converted.toFixed(2)} ${result.target}`} /></div>
              <div className="border-black border md:border-r-0"><Stat label="Customs" value={`${result.customs.toFixed(2)}`} /></div>
              <div className="border-black border md:border-r-0"><Stat label="Transport" value={`${result.transport_cost.toFixed(2)}`} /></div>
              <div className="border-black border"><Stat label="Landed cost" value={`${result.landed_cost.toFixed(2)} ${result.target}`} accent /></div>
            </div>
          </div>
        </Section>
      )}

      {rateInfo && rateInfo.rates && (
        <Section title={`Live rates — base ${rateInfo.base}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-0 border border-black -m-px">
            {Object.entries(rateInfo.rates).filter(([k]) => CURRENCIES.includes(k)).map(([k, v]) => (
              <div key={k} className="border-black border p-4">
                <p className="font-mono-print text-xs tracking-widest-print uppercase text-neutral-600">{k}</p>
                <p className="font-typewriter text-lg">{Number(v).toFixed(4)}</p>
              </div>
            ))}
          </div>
          <p className="font-mono-print text-[10px] uppercase tracking-widest-print mt-3 text-neutral-600">Updated {rateInfo.time}</p>
        </Section>
      )}
    </div>
  );
}
