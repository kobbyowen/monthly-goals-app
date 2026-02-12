"use client";

import useSWR from "swr";
import { fetcher } from "./useEpics";
import { withBase } from "@lib/api";
import type { Epic } from "@lib/api/types";

export function useEpic(id?: string | null) {
    const shouldFetch = !!id;
    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch ? withBase(`/api/epics/${id}`) : null,
        fetcher,
    );
    return {
        epic: (data as Epic) || null,
        isLoading,
        isError: !!error,
        mutate,
    };
}
