import React, { useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Recycle, Droplet, Calculator, Globe2, BookText, Users,
  LogOut, LayoutGrid, BookOpen, Gavel, Pill, CloudSun,
} from "lucide-react";
import WasteExchange from "@/modules/WasteExchange";
import WaterTracker from "@/modules/WaterTracker";
import TaxHelper from "@/modules/TaxHelper";
import CurrencyConverter from "@/modules/CurrencyConverter";
import MentalJournal from "@/modules/MentalJournal";
import SkillSwap from "@/modules/SkillSwap";
import Revision from "@/modules/Revision";
import Amendments from "@/modules/Amendments";
import Medicines from "@/modules/Medicines";
import Weather from "@/modules/Weather";
import DashboardHome from "@/modules/DashboardHome";
import NotificationBell from "@/components/NotificationBell";

const navGroups = [
  { label: "Overview", items: [{ to: "/dashboard", label: "Index", icon: LayoutGrid, end: true, key: "home" }] },
  { label: "Sustainability", items: [
    { to: "/dashboard/waste", label: "Waste Exchange", icon: Recycle, key: "waste" },
    { to: "/dashboard/water", label: "Water Tracker", icon: Droplet, key: "water" },
  ]},
  { label: "Finance", items: [
    { to: "/dashboard/tax", label: "Tax Helper", icon: Calculator, key: "tax" },
    { to: "/dashboard/currency", label: "Currency", icon: Globe2, key: "currency" },
  ]},
  { label: "Education", items: [
    { to: "/dashboard/revision", label: "Revision", icon: BookOpen, key: "revision" },
    { to: "/dashboard/amendments", label: "Amendments", icon: Gavel, key: "amendments" },
  ]},
  { label: "Health", items: [
    { to: "/dashboard/medicines", label: "Medicines", icon: Pill, key: "medicines" },
    { to: "/dashboard/journal", label: "Journal & Q&A", icon: BookText, key: "journal" },
  ]},
  { label: "Community", items: [
    { to: "/dashboard/weather", label: "Weather", icon: CloudSun, key: "weather" },
    { to: "/dashboard/skills", label: "Skill Swap", icon: Users, key: "skills" },
  ]},
];

const allMobileItems = navGroups.flatMap((g) => g.items);

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" data-testid="dashboard-loading">
        <p className="font-typewriter text-xl cursor-blink">loading</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white text-black" data-testid="dashboard-shell">
      {/* Sidebar */}
      <aside className="w-64 border-r border-black flex-col flex-shrink-0 hidden md:flex sticky top-0 h-screen overflow-y-auto">
        <div className="border-b border-black p-6">
          <Link to="/" className="bissal-mark text-2xl block" data-testid="sidebar-brand">Bissal.</Link>
          <p className="font-mono-print text-[10px] tracking-widest-print uppercase mt-1 text-neutral-600">Problem Solver Hub</p>
        </div>
        <nav className="flex-1 py-2">
          {navGroups.map((g) => (
            <div key={g.label} className="mb-2">
              <p className="px-6 pt-3 pb-1 font-mono-print text-[10px] tracking-widest-print uppercase text-neutral-500">{g.label}</p>
              {g.items.map((n) => (
                <NavLink
                  key={n.key}
                  to={n.to}
                  end={n.end}
                  data-testid={`nav-${n.key}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-2 font-mono-print text-sm border-l-4 ${
                      isActive ? "bg-black text-white border-[#FF3333]" : "border-transparent hover:bg-neutral-100"
                    }`
                  }
                >
                  <n.icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{n.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-black p-4">
          <div className="flex items-center gap-3 mb-3">
            {user.picture ? (
              <img src={user.picture} alt="" className="w-8 h-8 border border-black" />
            ) : (
              <div className="w-8 h-8 border border-black bg-neutral-100" />
            )}
            <div className="overflow-hidden">
              <p className="font-mono-print text-xs truncate" data-testid="user-name">{user.name}</p>
              <p className="font-mono-print text-[10px] text-neutral-600 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full font-mono-print text-xs uppercase tracking-widest-print border border-black px-3 py-2 hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2"
            data-testid="logout-btn"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-black z-30 flex items-center justify-between px-4 py-3">
        <Link to="/" className="bissal-mark text-xl">Bissal.</Link>
        <div className="flex items-center gap-2">
          <div data-testid="notification-bell-mobile-wrap"><NotificationBell /></div>
          <button onClick={logout} className="font-mono-print text-xs border border-black px-3 py-1" data-testid="mobile-logout">Out</button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14 relative">
        {/* Desktop top-right bell */}
        <div className="hidden md:flex items-center justify-end gap-3 px-6 py-3 border-b border-black bg-white sticky top-0 z-20">
          <span className="font-mono-print text-xs uppercase tracking-widest-print text-neutral-600 hidden lg:inline">{new Date().toLocaleDateString("en-GB")}</span>
          <NotificationBell />
        </div>

        {/* Mobile nav strip */}
        <div className="md:hidden border-b border-black overflow-x-auto whitespace-nowrap">
          {allMobileItems.map((n) => (
            <NavLink
              key={n.key}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `inline-block px-4 py-3 font-mono-print text-xs uppercase tracking-widest-print border-r border-black ${
                  isActive ? "bg-black text-white" : ""
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>

        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="waste" element={<WasteExchange />} />
          <Route path="water" element={<WaterTracker />} />
          <Route path="tax" element={<TaxHelper />} />
          <Route path="currency" element={<CurrencyConverter />} />
          <Route path="revision" element={<Revision />} />
          <Route path="amendments" element={<Amendments />} />
          <Route path="medicines" element={<Medicines />} />
          <Route path="journal" element={<MentalJournal />} />
          <Route path="weather" element={<Weather />} />
          <Route path="skills" element={<SkillSwap />} />
        </Routes>
      </main>
    </div>
  );
}

