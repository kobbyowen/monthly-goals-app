"use client";

import useSWR from "swr";
import { getEpics } from "@lib/api/index";
import type { Epic } from "@lib/api/types";
import { withBase } from "../lib/api";

export function useEpics() {
    const { data, error, isLoading, mutate } = useSWR(withBase("/epics"), getEpics);
    return {
        epics: (data as Epic[] | undefined) || [],
        isLoading,
        isError: !!error,
        mutate,
    };
}
