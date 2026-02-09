"use client";

import useSWR from "swr";
import { fetcher } from "./useEpics";

export function useEpic(id?: string | null) {
    const shouldFetch = !!id;
    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch ? `/api/epics/${id}` : null,
        fetcher,
    );
    return {
        epic: (data as any) || null,
        isLoading,
        isError: !!error,
        mutate,
    };
}
