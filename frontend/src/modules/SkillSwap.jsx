import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API, useAuth } from "@/lib/auth";
import { PageHeader, Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Search, Star } from "lucide-react";

export default function SkillSwap() {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ skill_name: "", description: "", location: "", looking_for: "" });
  const [reviewing, setReviewing] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: "" });

  const load = async () => {
    const res = await axios.get(`${API}/skills`, { params: { q: q || undefined } });
    setSkills(res.data || []);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.skill_name || !form.description) return toast.error("Skill and description required.");
    try {
      await axios.post(`${API}/skills`, form, { withCredentials: true });
      setForm({ skill_name: "", description: "", location: "", looking_for: "" });
      toast.success("Skill posted.");
      await load();
    } catch { toast.error("Could not post."); }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/skills/${id}`, { withCredentials: true });
      await load();
    } catch { toast.error("Only your own listings."); }
  };

  const submitReview = async (id) => {
    try {
      await axios.post(`${API}/skills/${id}/review`, review, { withCredentials: true });
      toast.success("Review submitted.");
      setReviewing(null);
      setReview({ rating: 5, comment: "" });
      await load();
    } catch { toast.error("Could not submit review."); }
  };

  const stars = (s) => {
    const avg = s.rating_count > 0 ? s.rating_sum / s.rating_count : 0;
    const rounded = Math.round(avg);
    return "*".repeat(rounded).padEnd(5, "·");
  };

  return (
    <div data-testid="skills-page">
      <PageHeader number="VI" title="The Skill Swap" subtitle="Offer a skill. Trade rather than sell. Ratings shown as asterisks, in the old way." />

      <Section title="Search">
        <div className="flex gap-2 max-w-xl">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. tutoring, accounting, design…" className="border-black" data-testid="skills-search" />
          <Button onClick={load} className="bg-black text-white hover:bg-[#FF3333]" data-testid="skills-search-btn"><Search className="w-4 h-4" /></Button>
        </div>
      </Section>

      <Section title="Offer a skill">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="skills-form">
          <Input placeholder="Skill name" value={form.skill_name} onChange={(e) => setForm({ ...form, skill_name: e.target.value })} className="border-black" data-testid="skills-name" />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="border-black" data-testid="skills-location" />
          <Input placeholder="Looking for in return" value={form.looking_for} onChange={(e) => setForm({ ...form, looking_for: e.target.value })} className="border-black md:col-span-2" data-testid="skills-trade" />
          <Textarea placeholder="Describe what you offer" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-black md:col-span-2 font-mono-print" data-testid="skills-description" />
          <div className="md:col-span-2">
            <Button type="submit" className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="skills-submit"><Plus className="w-4 h-4 mr-2" /> Post skill</Button>
          </div>
        </form>
      </Section>

      <Section title={`Skills on offer (${skills.length})`}>
        {skills.length === 0 ? <Empty text="No skills posted yet." /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {skills.map((s, i) => (
              <div key={s.id} className={`border-black p-6 ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 !== 1 ? "md:border-r" : ""} border-b`} data-testid={`skill-card-${s.id}`}>
                <div className="flex items-start justify-between">
                  <h4 className="font-typewriter text-xl">{s.skill_name}</h4>
                  {s.user_id === user?.user_id && (
                    <button onClick={() => remove(s.id)} className="text-neutral-500 hover:text-[#FF3333]" data-testid={`skill-delete-${s.id}`}><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <p className="font-mono-print text-xs uppercase tracking-widest-print text-neutral-600 mt-1">{s.location || "—"}</p>
                <p className="font-mono-print text-sm mt-3 leading-relaxed">{s.description}</p>
                {s.looking_for && <p className="font-mono-print text-xs mt-3 italic">Trades for: {s.looking_for}</p>}
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <p className="font-mono-print text-[10px] tracking-widest-print uppercase text-neutral-600">By {s.user_name}</p>
                  <p className="font-typewriter text-lg mt-1 text-[#FF3333]" title="Average rating" data-testid={`skill-rating-${s.id}`}>{stars(s)} <span className="text-xs text-neutral-600">({s.rating_count})</span></p>
                  {reviewing === s.id ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button key={r} type="button" onClick={() => setReview({ ...review, rating: r })}>
                            <Star className={`w-4 h-4 ${r <= review.rating ? "fill-black" : ""}`} />
                          </button>
                        ))}
                      </div>
                      <Textarea rows={2} value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} placeholder="optional comment" className="border-black font-mono-print" />
                      <div className="flex gap-2">
                        <Button onClick={() => submitReview(s.id)} className="bg-black text-white hover:bg-[#FF3333] text-xs" data-testid={`skill-submit-review-${s.id}`}>Send</Button>
                        <Button variant="outline" className="border-black text-xs" onClick={() => setReviewing(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReviewing(s.id)} className="font-mono-print text-xs uppercase tracking-widest-print mt-3 underline" data-testid={`skill-review-${s.id}`}>Leave a rating</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
