export function toast(message: string, type: "info" | "success" | "error" = "info", ttl?: number) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, type, ttl } }));
}

export function confirmDialog(message: string): Promise<boolean> {
    if (typeof window === "undefined") return Promise.resolve(false);
    return new Promise((resolve) => {
        window.dispatchEvent(new CustomEvent("app:confirm", { detail: { message, resolve } }));
    });
}
