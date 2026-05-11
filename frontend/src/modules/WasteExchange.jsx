import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/lib/auth";
import { PageHeader, Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Search } from "lucide-react";

const MATERIALS = ["plastic", "paper", "e-waste", "metal", "glass", "organic"];

export default function WasteExchange() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ material: "plastic", quantity: "", location: "", contact: "", description: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await axios.get(`${API}/waste/listings`, { params: { q: q || undefined, material: filter } });
    setItems(res.data || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filter]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.quantity || !form.location || !form.contact) {
      toast.error("Quantity, location and contact are required.");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API}/waste/listings`, form, { withCredentials: true });
      setForm({ material: "plastic", quantity: "", location: "", contact: "", description: "" });
      toast.success("Listing published.");
      await load();
    } catch (err) {
      toast.error("Could not publish listing.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/waste/listings/${id}`, { withCredentials: true });
      toast.success("Removed.");
      await load();
    } catch {
      toast.error("Could not remove (not your listing?).");
    }
  };

  return (
    <div data-testid="waste-page">
      <PageHeader number="I" title="The Waste Exchange" subtitle="Post recyclables. Find neighbours. Trade rather than throw." />
      <Section title="Search & Filter">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Search</label>
            <div className="flex gap-2 mt-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="material, place, words…" className="border-black" data-testid="waste-search-input" />
              <Button onClick={load} className="bg-black text-white hover:bg-[#FF3333]" data-testid="waste-search-btn"><Search className="w-4 h-4" /></Button>
            </div>
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Material</label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40 border-black mt-2" data-testid="waste-material-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Publish a listing">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="waste-form">
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Material</label>
            <Select value={form.material} onValueChange={(v) => setForm({ ...form, material: v })}>
              <SelectTrigger className="border-black mt-2" data-testid="waste-material"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Quantity</label>
            <Input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 5 kg" className="border-black mt-2" data-testid="waste-quantity" />
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Location</label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="neighbourhood / city" className="border-black mt-2" data-testid="waste-location" />
          </div>
          <div>
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Contact (phone / email)</label>
            <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="border-black mt-2" data-testid="waste-contact" />
          </div>
          <div className="md:col-span-2">
            <label className="font-mono-print text-xs tracking-widest-print uppercase">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="condition, pickup hours, etc." className="border-black mt-2 font-mono-print" data-testid="waste-description" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print" data-testid="waste-submit"><Plus className="w-4 h-4 mr-2" /> Publish</Button>
          </div>
        </form>
      </Section>

      <Section title={`Listings (${items.length})`}>
        {items.length === 0 ? (
          <Empty text="No listings yet. Be the first to post." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {items.map((it, i) => (
              <div key={it.id} className={`border-black p-6 ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 !== 1 ? "md:border-r" : ""} border-b`} data-testid={`waste-card-${it.id}`}>
                <div className="flex justify-between items-start">
                  <span className="font-mono-print text-xs tracking-widest-print uppercase bg-black text-white px-2 py-1">{it.material}</span>
                  <button onClick={() => remove(it.id)} className="text-neutral-500 hover:text-[#FF3333]" data-testid={`waste-delete-${it.id}`} title="Delete (only yours)">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-typewriter text-xl mt-4">{it.quantity}</h4>
                <p className="font-mono-print text-sm mt-1 text-neutral-700">{it.location}</p>
                <p className="font-mono-print text-sm mt-3 leading-relaxed">{it.description || "—"}</p>
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <p className="font-mono-print text-[10px] tracking-widest-print uppercase text-neutral-600">Posted by {it.user_name}</p>
                  <p className="font-mono-print text-sm mt-1"><a className="underline" href={`mailto:${it.contact}`} data-testid={`waste-contact-${it.id}`}>{it.contact}</a></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
