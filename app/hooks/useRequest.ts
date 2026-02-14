import { useCallback, useState, useRef, useEffect } from "react";

export type RequestFn<Args extends unknown[], R> = (...args: Args) => Promise<R>;

export type UseRequestOptions<R> = {
    onSuccess?: (data: R) => void;
    onError?: (error: unknown) => void;
    onFinally?: () => void;
    immediate?: boolean;
    initialData?: R | null;
};

export function useRequest<Args extends unknown[], R>(
    fn: RequestFn<Args, R>,
    options?: UseRequestOptions<R>
) {
    const { onSuccess, onError, onFinally, immediate = false, initialData = null } = options || {};

    const [loading, setLoading] = useState<boolean>(Boolean(immediate));
    const [data, setData] = useState<R | null>(initialData);
    const [error, setError] = useState<unknown | null>(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const run = useCallback(
        async (...args: Args): Promise<R | null> => {
            setLoading(true);
            setError(null);
            try {
                const res = await fn(...args);
                if (mounted.current) {
                    setData(res);
                }
                try {
                    onSuccess?.(res);
                } catch (e) {
                    // swallow errors in user callbacks

                    console.error("useRequest onSuccess callback error", e);
                }
                return res;
            } catch (err) {
                if (mounted.current) setError(err);
                try {
                    onError?.(err);
                } catch (e) {

                    console.error("useRequest onError callback error", e);
                }
                return null;
            } finally {
                if (mounted.current) setLoading(false);
                try {
                    onFinally?.();
                } catch (e) {

                    console.error("useRequest onFinally callback error", e);
                }
            }
        },
        [fn, onSuccess, onError, onFinally]
    );

    useEffect(() => {
        if (immediate) {
            // call without args when immediate is true

            run(...([] as unknown as Args));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [immediate]);

    const reset = useCallback(() => {
        if (!mounted.current) return;
        setLoading(false);
        setData(initialData);
        setError(null);
    }, [initialData]);

    return {
        loading,
        data,
        error,
        run,
        reset,
    } as const;
}
