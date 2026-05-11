import React from "react";

export const PageHeader = ({ number, title, subtitle, children }) => (
  <div className="border-b border-black px-6 md:px-12 py-8 md:py-12" data-testid="page-header">
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p className="font-mono-print text-xs tracking-widest-print uppercase text-neutral-600">Volume {number}</p>
        <h1 className="font-typewriter text-4xl md:text-5xl mt-2">{title}</h1>
        {subtitle && <p className="font-mono-print mt-3 max-w-2xl text-sm leading-relaxed">{subtitle}</p>}
      </div>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  </div>
);

export const Section = ({ title, children, right }) => (
  <section className="border-b border-black px-6 md:px-12 py-8">
    {title && (
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono-print text-xs tracking-widest-print uppercase">{title}</h2>
        {right}
      </div>
    )}
    {children}
  </section>
);

export const Stat = ({ label, value, accent }) => (
  <div className="border border-black p-6" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
    <p className="font-mono-print text-[10px] tracking-widest-print uppercase text-neutral-600">{label}</p>
    <p className={`font-typewriter text-3xl mt-2 ${accent ? "text-[#FF3333]" : ""}`}>{value}</p>
  </div>
);

export const Empty = ({ text }) => (
  <p className="font-mono-print text-sm text-neutral-600 italic">— {text}</p>
);
