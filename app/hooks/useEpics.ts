"use client";

import useSWR from "swr";
import { getEpics } from "@lib/api/index";
import type { Epic } from "@lib/api/types";

export function useEpics() {
    const { data, error, isLoading, mutate } = useSWR("/epics", getEpics);
    return {
        epics: (data as Epic[] | undefined) || [],
        isLoading,
        isError: !!error,
        mutate,
    };
}
