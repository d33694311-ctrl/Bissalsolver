import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { API, useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const pollRef = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await axios.get(`${API}/notifications`, { withCredentials: true });
      setItems(res.data?.items || []);
      setUnread(res.data?.unread || 0);
    } catch (e) {
      // not signed in or temp error - ignore
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    pollRef.current = setInterval(load, 25000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [user]);

  const click = async (n) => {
    try {
      if (!n.read) {
        await axios.post(`${API}/notifications/${n.id}/read`, {}, { withCredentials: true });
      }
    } catch {}
    setOpen(false);
    await load();
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`, {}, { withCredentials: true });
      await load();
    } catch {}
  };

  return (
    <div className="relative" data-testid="notification-bell-wrap">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative border border-black w-9 h-9 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
        data-testid="notification-bell"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#FF3333] text-white font-typewriter text-[10px] w-5 h-5 flex items-center justify-center border border-black" data-testid="notification-badge">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-black z-50"
            data-testid="notification-panel"
          >
            <div className="flex items-center justify-between border-b border-black px-4 py-2">
              <span className="font-mono-print text-xs uppercase tracking-widest-print">Notifications</span>
              {unread > 0 && (
                <button onClick={markAll} className="font-mono-print text-[10px] uppercase tracking-widest-print underline hover:text-[#FF3333]" data-testid="notification-read-all">Read all</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="font-mono-print text-sm italic text-neutral-600 p-4">— No notifications yet.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => click(n)}
                    className={`w-full text-left p-3 border-b border-neutral-200 hover:bg-[#fffbf2] ${!n.read ? "bg-[#fffbf2]" : ""}`}
                    data-testid={`notification-${n.id}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="block w-2 h-2 bg-[#FF3333] mt-2 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono-print text-xs uppercase tracking-widest-print">{n.title}</p>
                        <p className="font-mono-print text-sm mt-1 leading-snug">{n.message}</p>
                        <p className="font-mono-print text-[10px] text-neutral-500 mt-1">{new Date(n.created_at).toLocaleString("en-GB")}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
