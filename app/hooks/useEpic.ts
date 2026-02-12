"use client";

import useSWR from "swr";
import { getEpic } from "@lib/api/index";
import type { Epic } from "@lib/api/types";

export function useEpic(id?: string | null) {
    const shouldFetch = !!id;
    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch ? `/epics/${id}` : null,
        async () => getEpic(String(id)),
    );
    return {
        epic: (data as Epic) || null,
        isLoading,
        isError: !!error,
        mutate,
    };
}
