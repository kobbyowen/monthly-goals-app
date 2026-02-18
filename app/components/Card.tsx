"use client";

import React from "react";

type Props = React.PropsWithChildren<{ className?: string }>;

export default function Card({ children, className = "" }: Props) {
  return (
    <div
      className={
        "rounded-xl border border-border bg-card text-card-foreground p-4 shadow-sm " +
        className
      }
    >
      {children}
    </div>
  );
}
