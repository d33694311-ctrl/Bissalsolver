import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/lib/auth";
import { PageHeader, Section, Empty } from "./_shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CloudSun, MapPin, Wind, Droplets, Thermometer, Sun, Cloud, CloudRain, CloudSnow } from "lucide-react";

const PERSONAS = {
  farmer: {
    label: "Farmer",
    build: (cur, day) => {
      const items = [];
      if ((day?.precipitation_sum?.[0] ?? 0) > 5) items.push("Postpone fertiliser / pesticide spraying — rain expected.");
      else items.push("Good window for spraying & open-field work.");
      if ((cur?.wind_speed_10m ?? 0) > 20) items.push("Strong winds today — secure tarpaulins and young plants.");
      if ((day?.temperature_2m_max?.[0] ?? 20) > 35) items.push("High heat — irrigate early morning or late evening.");
      else items.push("Standard irrigation schedule is fine.");
      if ((cur?.relative_humidity_2m ?? 0) > 80) items.push("Humid — watch for fungal disease on leaves.");
      return items;
    },
  },
  student: {
    label: "Student",
    build: (cur, day) => {
      const items = [];
      if ((day?.precipitation_sum?.[0] ?? 0) > 2) items.push("Carry an umbrella to college / school.");
      else items.push("Dry day — outdoor study session is possible.");
      if ((cur?.temperature_2m ?? 22) < 14) items.push("Cold morning — wear layers.");
      else if ((cur?.temperature_2m ?? 22) > 32) items.push("Hot — keep water bottle filled.");
      items.push("Best focus hours today: 6–9am and 8–11pm based on temperature.");
      return items;
    },
  },
  commuter: {
    label: "Commuter",
    build: (cur, day) => {
      const items = [];
      if ((day?.precipitation_sum?.[0] ?? 0) > 4) items.push("Leave 15 min early — wet roads slow traffic.");
      else items.push("Normal commute time expected.");
      if ((cur?.wind_speed_10m ?? 0) > 25) items.push("Two-wheeler? Ride cautiously — gusty winds.");
      if ((cur?.relative_humidity_2m ?? 0) > 85) items.push("Humid — pack a spare shirt.");
      return items;
    },
  },
};

const codeMeta = (code) => {
  if (code == null) return { label: "—", Icon: Cloud };
  if (code === 0) return { label: "Clear", Icon: Sun };
  if (code <= 3) return { label: "Mainly clear / cloudy", Icon: CloudSun };
  if (code <= 48) return { label: "Foggy", Icon: Cloud };
  if (code <= 67) return { label: "Rain", Icon: CloudRain };
  if (code <= 77) return { label: "Snow", Icon: CloudSnow };
  if (code <= 82) return { label: "Showers", Icon: CloudRain };
  return { label: "Storm", Icon: CloudRain };
};

export default function Weather() {
  const [q, setQ] = useState("Kathmandu");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [persona, setPersona] = useState("commuter");

  const geocode = async (query) => {
    try {
      const res = await axios.get(`${API}/weather/geocode`, { params: { q: query } });
      const list = res.data?.results || [];
      setResults(list);
      if (list[0]) { setPicked(list[0]); fetchForecast(list[0]); }
    } catch (e) { toast.error("Could not find that place."); }
  };

  const fetchForecast = async (place) => {
    try {
      const res = await axios.get(`${API}/weather/forecast`, { params: { lat: place.latitude, lon: place.longitude } });
      setForecast(res.data);
    } catch (e) { toast.error("Weather service unavailable."); }
  };

  useEffect(() => { geocode("Kathmandu"); /* eslint-disable-next-line */ }, []);

  const current = forecast?.current;
  const daily = forecast?.daily;
  const checklist = (current && daily) ? PERSONAS[persona].build(current, daily) : [];
  const curMeta = codeMeta(current?.weather_code);
  const CurIcon = curMeta.Icon;

  return (
    <div data-testid="weather-page">
      <PageHeader number="X" title="The Neighbourhood Weather" subtitle="Hyper-local forecast for any town. Then a checklist for your day, in your role." />

      <Section title="Pick a place">
        <form onSubmit={(e) => { e.preventDefault(); geocode(q); }} className="flex gap-2 max-w-xl">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kathmandu, Birgunj, Mumbai…" className="border-black" data-testid="weather-search" />
          <Button type="submit" className="bg-black text-white hover:bg-[#FF3333]" data-testid="weather-search-btn"><MapPin className="w-4 h-4 mr-2" /> Find</Button>
        </form>
        {results.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => { setPicked(r); fetchForecast(r); }}
                className={`font-mono-print text-xs border border-black px-3 py-1 ${picked?.id === r.id ? "bg-black text-white" : "hover:bg-neutral-100"}`}
                data-testid={`weather-place-${r.id}`}
              >
                {r.name}{r.admin1 ? `, ${r.admin1}` : ""} · {r.country_code}
              </button>
            ))}
          </div>
        )}
      </Section>

      {forecast && current && (
        <Section title={picked ? `${picked.name}${picked.admin1 ? `, ${picked.admin1}` : ""}` : "Forecast"}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-black" data-testid="weather-current">
            <div className="lg:col-span-2 p-8 border-r border-black bg-[#fffbf2]">
              <div className="flex items-center gap-6">
                <CurIcon className="w-20 h-20" strokeWidth={1} />
                <div>
                  <p className="font-typewriter text-6xl">{Math.round(current.temperature_2m)}°C</p>
                  <p className="font-mono-print text-sm uppercase tracking-widest-print text-neutral-600">{curMeta.label} · feels {Math.round(current.apparent_temperature)}°C</p>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-0">
              <div className="border-b border-r border-black p-4">
                <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600 flex items-center gap-1"><Droplets className="w-3 h-3" /> Humidity</p>
                <p className="font-typewriter text-2xl mt-1">{current.relative_humidity_2m}%</p>
              </div>
              <div className="border-b border-black p-4">
                <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600 flex items-center gap-1"><Wind className="w-3 h-3" /> Wind</p>
                <p className="font-typewriter text-2xl mt-1">{Math.round(current.wind_speed_10m)} km/h</p>
              </div>
              <div className="border-r border-black p-4">
                <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600 flex items-center gap-1"><CloudRain className="w-3 h-3" /> Rain</p>
                <p className="font-typewriter text-2xl mt-1">{current.precipitation} mm</p>
              </div>
              <div className="p-4">
                <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600 flex items-center gap-1"><Thermometer className="w-3 h-3" /> Today</p>
                <p className="font-typewriter text-2xl mt-1">{Math.round(daily?.temperature_2m_min?.[0])}° / {Math.round(daily?.temperature_2m_max?.[0])}°</p>
              </div>
            </div>
          </div>
        </Section>
      )}

      {daily && (
        <Section title="7-day outlook">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-0 border border-black -m-px" data-testid="weather-daily">
            {daily.time.map((d, i) => {
              const m = codeMeta(daily.weather_code[i]);
              const Icon = m.Icon;
              const date = new Date(d);
              return (
                <div key={d} className="border-black border p-4 text-center">
                  <p className="font-mono-print text-[10px] uppercase tracking-widest-print text-neutral-600">{date.toLocaleDateString("en-GB", { weekday: "short" })}</p>
                  <Icon className="w-8 h-8 mx-auto my-2" strokeWidth={1.25} />
                  <p className="font-typewriter text-base">{Math.round(daily.temperature_2m_max[i])}°</p>
                  <p className="font-mono-print text-xs text-neutral-600">{Math.round(daily.temperature_2m_min[i])}°</p>
                  {daily.precipitation_sum[i] > 0 && <p className="font-mono-print text-[10px] text-[#FF3333] mt-1">{daily.precipitation_sum[i].toFixed(1)}mm</p>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Today's checklist · pick your role">
        <div className="flex gap-2 flex-wrap mb-6" data-testid="weather-personas">
          {Object.entries(PERSONAS).map(([k, p]) => (
            <button
              key={k}
              onClick={() => setPersona(k)}
              className={`font-mono-print text-xs uppercase tracking-widest-print border border-black px-4 py-2 ${persona === k ? "bg-black text-white" : "hover:bg-neutral-100"}`}
              data-testid={`weather-persona-${k}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {checklist.length === 0 ? (
          <Empty text="Pick a place to see today's checklist." />
        ) : (
          <ol className="space-y-3 border border-black p-6 bg-[#fffbf2]" data-testid="weather-checklist">
            {checklist.map((c, i) => (
              <li key={i} className="flex gap-3 font-mono-print text-sm leading-relaxed">
                <span className="font-typewriter text-[#FF3333]">{String(i + 1).padStart(2, "0")}</span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
