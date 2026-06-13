import { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import type { ApiError } from "@/types";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | undefined>;
  refresh: () => void;
}

export function useApi<T>(
  apiFunc: (...args: unknown[]) => Promise<T>,
  immediate = false
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const execute = useCallback(
    async (...args: unknown[]) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await apiFunc(...args);
        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        let message = "Une erreur est survenue";
        if (err instanceof AxiosError) {
          const apiErr = err.response?.data as ApiError;
          message = apiErr?.message || err.message;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setState({ data: null, loading: false, error: message });
        return undefined;
      }
    },
    [apiFunc]
  );

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [refreshKey]);

  return { ...state, execute, refresh };
}
