"use client";

import useSWR from "swr";

export const fetcher = async (url: string) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to fetch ${url}`);
    }
    return res.json();
};

export function useEpics() {
    const { data, error, isLoading, mutate } = useSWR("/api/epics", fetcher);
    return {
        epics: (data as any[]) || [],
        isLoading,
        isError: !!error,
        mutate,
    };
}
