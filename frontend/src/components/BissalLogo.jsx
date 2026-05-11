import React from "react";

export default function BissalLogo({ size = 32, className = "" }) {
  return (
    <img
      src="/bissal-logo.png"
      alt="Bissal mark"
      data-testid="bissal-logo"
      style={{ width: size, height: size }}
      className={`rounded-full border border-black object-cover bg-white ${className}`}
    />
  );
}
