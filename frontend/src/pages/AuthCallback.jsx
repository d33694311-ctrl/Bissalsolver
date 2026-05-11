import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/lib/auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sid = params.get("session_id");
    if (!sid) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      try {
        await axios.post(
          `${API}/auth/session`,
          { session_id: sid },
          { withCredentials: true }
        );
        await refresh();
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { replace: true });
      } catch (e) {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white" data-testid="auth-callback">
      <div className="text-center">
        <p className="font-mono-print text-sm tracking-widest-print uppercase">Authenticating</p>
        <p className="font-typewriter text-xl mt-4 cursor-blink">please hold</p>
      </div>
    </div>
  );
}
