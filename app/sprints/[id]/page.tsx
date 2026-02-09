import React from "react";
import Sidebar from "../../components/Sidebar";
import SprintList from "../../components/SprintList";

async function getSprint(id: string) {
  if (!id) return null;
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`;
  const url = new URL(`/api/sprints/${id}`, base).toString();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function SprintPage(ctx: any) {
  const p = await ctx.params;
  const sprint = await getSprint(p.id);
  return (
    <div className="min-h-screen flex">
      <Sidebar sprints={[]} />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold">{sprint?.name || "Sprint"}</h1>
        <div className="mt-4">
          <SprintList />
        </div>
      </main>
    </div>
  );
}
