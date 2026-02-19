"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker automáticamente al cargar la app.
 * Esto es NECESARIO para que el navegador considere la app como PWA instalable
 * y dispare el evento `beforeinstallprompt`.
 */
export function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;

        // Registrar el SW al cargar
        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                });
                console.log("[SW] Service Worker registrado con éxito:", registration.scope);

                // Verificar actualizaciones periódicamente (cada 1h)
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);
            } catch (error) {
                console.error("[SW] Error registrando Service Worker:", error);
            }
        };

        // Esperar a que la página cargue completamente para no bloquear el render
        if (document.readyState === "complete") {
            registerSW();
        } else {
            window.addEventListener("load", registerSW, { once: true });
        }
    }, []);

    return null; // No renderiza nada
}
