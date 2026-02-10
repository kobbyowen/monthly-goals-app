"use client";

import React from "react";

export default function MobileHeader() {
  const open = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("openSidebar"));
    }
  };

  return (
    <header className="block md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#0b0b0b] border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <button
          aria-label="open sidebar"
          onClick={open}
          className="p-2 rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-transparent dark:text-slate-200"
        >
          ☰
        </button>
        <div className="text-sm font-semibold">Monthly Goals Planner</div>
        <div style={{ width: 40 }} />
      </div>
    </header>
  );
}
