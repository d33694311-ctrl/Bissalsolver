import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { API, useAuth } from "@/lib/auth";
import { Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, Trash2, Send, EyeOff } from "lucide-react";

export default function HealthHelp() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ title: "", body: "", anonymous: false });
  const [openId, setOpenId] = useState(null);
  const [comments, setComments] = useState({});
  const [draftComment, setDraftComment] = useState({});

  const load = async () => {
    try {
      const res = await axios.get(`${API}/health/posts`, { withCredentials: true });
      setPosts(res.data || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and message are required.");
    try {
      await axios.post(`${API}/health/posts`, form, { withCredentials: true });
      setForm({ title: "", body: "", anonymous: false });
      toast.success("Posted — wishing you good answers.");
      await load();
    } catch { toast.error("Could not post."); }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/health/posts/${id}`, { withCredentials: true });
      toast.success("Removed.");
      await load();
    } catch { toast.error("Could not remove."); }
  };

  const toggle = async (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    try {
      const res = await axios.get(`${API}/health/posts/${id}/comments`, { withCredentials: true });
      setComments((c) => ({ ...c, [id]: res.data || [] }));
    } catch {}
  };

  const sendComment = async (id) => {
    const draft = draftComment[id] || { body: "", anonymous: false };
    if (!draft.body?.trim()) return toast.error("Write a suggestion first.");
    try {
      await axios.post(`${API}/health/posts/${id}/comments`, draft, { withCredentials: true });
      setDraftComment((d) => ({ ...d, [id]: { body: "", anonymous: false } }));
      const res = await axios.get(`${API}/health/posts/${id}/comments`, { withCredentials: true });
      setComments((c) => ({ ...c, [id]: res.data || [] }));
      await load();
    } catch { toast.error("Could not send."); }
  };

  const removeComment = async (postId, cid) => {
    try {
      await axios.delete(`${API}/health/posts/${postId}/comments/${cid}`, { withCredentials: true });
      const res = await axios.get(`${API}/health/posts/${postId}/comments`, { withCredentials: true });
      setComments((c) => ({ ...c, [postId]: res.data || [] }));
      await load();
    } catch {}
  };

  return (
    <Section title="Community Health Q&A · Open to all readers">
      <p className="font-mono-print text-sm leading-relaxed max-w-2xl mb-6">
        Share a health concern with the Bissal community. Other readers will reply with suggestions and lived experience.
        You may post anonymously. Not medical advice.
      </p>

      {/* Composer */}
      <form onSubmit={submit} className="border border-black p-6 mb-8" data-testid="health-form">
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="One-line title (e.g. Trouble sleeping for two weeks)"
          className="border-0 border-b border-black rounded-none font-typewriter text-lg px-0 focus-visible:ring-0"
          data-testid="health-title"
        />
        <Textarea
          rows={4}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Describe what's happening, what you've tried, what you're hoping for…"
          className="border-0 border-b border-black rounded-none mt-4 font-mono-print px-0 focus-visible:ring-0 resize-none"
          data-testid="health-body"
        />
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <label className="flex items-center gap-3 font-mono-print text-xs uppercase tracking-widest-print cursor-pointer">
            <Switch checked={form.anonymous} onCheckedChange={(v) => setForm({ ...form, anonymous: v })} data-testid="health-anon" />
            <EyeOff className="w-3 h-3" /> Post anonymously
          </label>
          <Button type="submit" className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="health-submit">
            <Send className="w-4 h-4 mr-2" /> Post question
          </Button>
        </div>
      </form>

      {posts.length === 0 ? (
        <Empty text="No questions yet. Be the first to ask." />
      ) : (
        <div className="space-y-0 border border-black" data-testid="health-list">
          {posts.map((p, idx) => (
            <div key={p.id} className={`p-6 ${idx !== posts.length - 1 ? "border-b border-neutral-300" : ""}`} data-testid={`health-post-${p.id}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="font-typewriter text-xl">{p.title}</h3>
                  <p className="font-mono-print text-[10px] tracking-widest-print uppercase mt-1 text-neutral-600">
                    {p.author_name} · {new Date(p.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                {p.user_id === user?.user_id && (
                  <button onClick={() => remove(p.id)} className="text-neutral-500 hover:text-[#FF3333]" data-testid={`health-delete-${p.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="font-mono-print text-sm mt-3 leading-relaxed whitespace-pre-wrap">{p.body}</p>

              <button
                onClick={() => toggle(p.id)}
                className="mt-4 font-mono-print text-xs uppercase tracking-widest-print underline flex items-center gap-2 hover:text-[#FF3333]"
                data-testid={`health-toggle-${p.id}`}
              >
                <MessageCircle className="w-3 h-3" /> {p.comments_count || 0} suggestion{(p.comments_count || 0) === 1 ? "" : "s"} {openId === p.id ? "▲" : "▼"}
              </button>

              <AnimatePresence>
                {openId === p.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="border-l-2 border-[#FF3333] pl-4 space-y-3" data-testid={`health-comments-${p.id}`}>
                      {(comments[p.id] || []).length === 0 ? (
                        <p className="font-mono-print text-xs italic text-neutral-600">— No suggestions yet. Be kind, be first.</p>
                      ) : (
                        comments[p.id].map((c) => (
                          <div key={c.id} className="bg-[#F4F4F4] p-3" data-testid={`health-comment-${c.id}`}>
                            <div className="flex items-start justify-between">
                              <p className="font-mono-print text-[10px] tracking-widest-print uppercase text-neutral-600">
                                {c.author_name} · {new Date(c.created_at).toLocaleDateString("en-GB")}
                              </p>
                              {c.user_id === user?.user_id && (
                                <button onClick={() => removeComment(p.id, c.id)} className="text-neutral-500 hover:text-[#FF3333]">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="font-mono-print text-sm mt-2 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                          </div>
                        ))
                      )}

                      <div className="pt-2">
                        <Textarea
                          rows={2}
                          value={(draftComment[p.id]?.body) || ""}
                          onChange={(e) => setDraftComment((d) => ({ ...d, [p.id]: { ...(d[p.id] || {}), body: e.target.value } }))}
                          placeholder="Share a suggestion or what worked for you…"
                          className="border-black font-mono-print"
                          data-testid={`health-comment-input-${p.id}`}
                        />
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
                          <label className="flex items-center gap-2 font-mono-print text-[10px] uppercase tracking-widest-print cursor-pointer">
                            <Switch
                              checked={!!draftComment[p.id]?.anonymous}
                              onCheckedChange={(v) => setDraftComment((d) => ({ ...d, [p.id]: { ...(d[p.id] || {}), anonymous: v } }))}
                              data-testid={`health-comment-anon-${p.id}`}
                            />
                            Anonymous
                          </label>
                          <Button onClick={() => sendComment(p.id)} className="bg-black text-white hover:bg-[#FF3333] text-xs uppercase tracking-widest-print" data-testid={`health-comment-submit-${p.id}`}>
                            <Send className="w-3 h-3 mr-2" /> Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
