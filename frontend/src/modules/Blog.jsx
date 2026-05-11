import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { API, useAuth } from "@/lib/auth";
import { PageHeader, Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Image as ImageIcon, Video as VideoIcon, Heart,
  Sparkles, Search, ExternalLink, Loader2, X,
} from "lucide-react";

const TOPICS = ["general", "math", "science", "history", "language", "law", "finance", "tech", "exam-prep", "essay"];

function youtubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  const v = url.match(/vimeo\.com\/(\d+)/);
  if (v) return `https://player.vimeo.com/video/${v[1]}`;
  return null;
}

function MediaTile({ m }) {
  const src = `${API}/blog/file?path=${encodeURIComponent(m.path)}`;
  if (m.kind === "video") {
    return (
      <video controls className="w-full max-h-[480px] border border-black bg-black" data-testid="blog-media-video">
        <source src={src} type={m.content_type} />
      </video>
    );
  }
  return <img src={src} alt={m.original_filename} className="w-full border border-black object-cover max-h-[480px]" data-testid="blog-media-image" />;
}

export default function Blog() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("all");
  const [form, setForm] = useState({ title: "", body: "", topic: "general", video_url: "" });
  const [pendingMedia, setPendingMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploadingPct, setUploadingPct] = useState(null);
  const [summarising, setSummarising] = useState({});
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/blog/posts`, { params: { q: q || undefined, topic }, withCredentials: true });
      setPosts(res.data || []);
    } catch (e) {
      // not authed? ignore
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [topic]);

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        setUploadingPct(0);
        const res = await axios.post(`${API}/blog/upload`, fd, {
          withCredentials: true,
          onUploadProgress: (ev) => {
            if (ev.total) setUploadingPct(Math.round((ev.loaded / ev.total) * 100));
          },
        });
        setPendingMedia((m) => [...m, res.data]);
        toast.success(`${file.name} uploaded`);
      } catch (err) {
        toast.error(`Upload failed for ${file.name}`);
      } finally {
        setUploadingPct(null);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePending = (idx) => setPendingMedia((m) => m.filter((_, i) => i !== idx));

  const publish = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and body are required.");
    setBusy(true);
    try {
      await axios.post(`${API}/blog/posts`, { ...form, media: pendingMedia }, { withCredentials: true });
      setForm({ title: "", body: "", topic: "general", video_url: "" });
      setPendingMedia([]);
      toast.success("Blog published.");
      await load();
    } catch (err) {
      toast.error("Could not publish.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/blog/posts/${id}`, { withCredentials: true });
      toast.success("Deleted.");
      await load();
    } catch { toast.error("Only your own posts."); }
  };

  const summarise = async (id) => {
    setSummarising((s) => ({ ...s, [id]: true }));
    try {
      const res = await axios.post(`${API}/blog/posts/${id}/summarise`, {}, { withCredentials: true });
      setPosts((ps) => ps.map((p) => p.id === id ? { ...p, summary: res.data.summary } : p));
    } catch { toast.error("AI summary failed."); }
    finally { setSummarising((s) => ({ ...s, [id]: false })); }
  };

  const like = async (id) => {
    try {
      const res = await axios.post(`${API}/blog/posts/${id}/like`, {}, { withCredentials: true });
      setPosts((ps) => ps.map((p) => p.id === id ? { ...p, likes: p.likes + (res.data.liked ? 1 : -1) } : p));
    } catch {}
  };

  return (
    <div data-testid="blog-page">
      <PageHeader number="XI" title="Educational Blog" subtitle="Unlimited blogs on what you're learning — text, images, video. Press the AI Summarise button when you want the gist.">
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-40 border-black" data-testid="blog-topic-filter"><SelectValue placeholder="Topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {TOPICS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </PageHeader>

      <Section title="Search">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, body, topic…" className="border-black pl-10" data-testid="blog-search" />
          </div>
          <Button type="submit" className="bg-black text-white hover:bg-[#FF3333]" data-testid="blog-search-btn">Go</Button>
        </form>
      </Section>

      <Section title="Compose a new blog">
        <form onSubmit={publish} className="space-y-4 border border-black p-6" data-testid="blog-form">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="border-0 border-b border-black rounded-none px-0 font-typewriter text-2xl focus-visible:ring-0"
            data-testid="blog-title"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-mono-print text-xs tracking-widest-print uppercase">Topic</label>
              <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                <SelectTrigger className="border-black mt-2" data-testid="blog-form-topic"><SelectValue /></SelectTrigger>
                <SelectContent>{TOPICS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-mono-print text-xs tracking-widest-print uppercase">Video URL (YouTube / Vimeo — optional)</label>
              <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=…" className="border-black mt-2" data-testid="blog-video-url" />
            </div>
          </div>
          <Textarea
            rows={8}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Write your educational blog… markdown-style line breaks are kept."
            className="border-black font-mono-print"
            data-testid="blog-body"
          />

          {/* Media uploader */}
          <div className="border border-dashed border-black p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="font-mono-print text-xs uppercase tracking-widest-print">Attach images / videos (no size limit)</div>
              <div>
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={onFile} className="hidden" data-testid="blog-file-input" />
                <Button type="button" onClick={() => fileRef.current?.click()} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="blog-attach">
                  <ImageIcon className="w-4 h-4 mr-2" /> Attach files
                </Button>
              </div>
            </div>
            {uploadingPct !== null && (
              <div className="mt-3 flex items-center gap-2 font-mono-print text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading… {uploadingPct}%
              </div>
            )}
            {pendingMedia.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4" data-testid="blog-pending-media">
                {pendingMedia.map((m, i) => (
                  <div key={i} className="relative border border-black p-2 bg-[#fffbf2]">
                    <div className="flex items-center gap-2">
                      {m.kind === "video" ? <VideoIcon className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      <p className="font-mono-print text-xs truncate flex-1">{m.original_filename}</p>
                      <button type="button" onClick={() => removePending(i)} className="text-neutral-500 hover:text-[#FF3333]"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={busy} className="bg-black text-white hover:bg-[#FF3333] uppercase tracking-widest-print text-xs" data-testid="blog-publish">
            <Plus className="w-4 h-4 mr-2" /> {busy ? "Publishing…" : "Publish blog"}
          </Button>
        </form>
      </Section>

      <Section title={`Blog feed (${posts.length})`}>
        {posts.length === 0 ? (
          <Empty text="No blogs yet. Be the first to publish." />
        ) : (
          <div className="space-y-8" data-testid="blog-feed">
            <AnimatePresence>
              {posts.map((p) => {
                const embed = youtubeEmbed(p.video_url);
                return (
                  <motion.article
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border border-black bg-white p-6 md:p-8"
                    data-testid={`blog-post-${p.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block bg-black text-white font-mono-print text-[10px] uppercase tracking-widest-print px-2 py-1 mb-3">{p.topic}</span>
                        <h2 className="font-typewriter text-3xl md:text-4xl leading-tight" data-testid={`blog-title-${p.id}`}>{p.title}</h2>
                        <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600 mt-2">
                          By {p.author_name} · {new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      {p.user_id === user?.user_id && (
                        <button onClick={() => remove(p.id)} className="text-neutral-500 hover:text-[#FF3333]" data-testid={`blog-delete-${p.id}`}><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>

                    {p.summary && (
                      <div className="border-l-2 border-[#FF3333] bg-[#fffbf2] p-4 my-6" data-testid={`blog-summary-${p.id}`}>
                        <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600 mb-2">AI digest</p>
                        <p className="font-mono-print text-sm leading-relaxed whitespace-pre-wrap">{p.summary}</p>
                      </div>
                    )}

                    <div className="font-mono-print text-base leading-relaxed mt-6 whitespace-pre-wrap" data-testid={`blog-body-${p.id}`}>{p.body}</div>

                    {p.media?.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {p.media.map((m, i) => <MediaTile key={i} m={m} />)}
                      </div>
                    )}

                    {embed && (
                      <div className="aspect-video border border-black mt-6">
                        <iframe src={embed} title="video" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    )}
                    {p.video_url && !embed && (
                      <a href={p.video_url} target="_blank" rel="noopener noreferrer" className="font-mono-print text-sm underline inline-flex items-center gap-1 mt-4">
                        Open video <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-neutral-200">
                      <button onClick={() => like(p.id)} className="font-mono-print text-xs uppercase tracking-widest-print border border-black px-3 py-2 hover:bg-black hover:text-white flex items-center gap-2" data-testid={`blog-like-${p.id}`}>
                        <Heart className="w-3 h-3" /> {p.likes || 0}
                      </button>
                      <button
                        onClick={() => summarise(p.id)}
                        disabled={summarising[p.id]}
                        className="font-mono-print text-xs uppercase tracking-widest-print bg-[#FF3333] text-white border border-black px-3 py-2 hover:bg-black flex items-center gap-2"
                        data-testid={`blog-summarise-${p.id}`}
                      >
                        {summarising[p.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {p.summary ? "Re-summarise" : "AI Summarise"}
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Section>
    </div>
  );
}
