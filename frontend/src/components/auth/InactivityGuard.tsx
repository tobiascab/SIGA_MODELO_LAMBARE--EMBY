"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const INACTIVITY_TIMEOUT_MS = (7 * 60 + 59) * 60 * 1000; // 7 horas 59 minutos (1 min antes del JWT backend)
const WARNING_BEFORE_MS = 60 * 1000; // Avisar 1 minuto antes

/**
 * Detecta inactividad del usuario (sin tocar pantalla, mover mouse, o teclear).
 * Después de 15 minutos de inactividad:
 * 1. Limpia token y datos de sesión
 * 2. Dispara evento "session-expired" para mostrar el SessionExpiredModal
 */
export function InactivityGuard() {
    const router = useRouter();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningRef = useRef<NodeJS.Timeout | null>(null);
    const isExpiredRef = useRef(false);

    const clearTimers = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
    }, []);

    const handleSessionExpire = useCallback(() => {
        if (isExpiredRef.current) return;
        isExpiredRef.current = true;

        clearTimers();

        // Limpiar sesión completa (incluido last-activity para evitar bucle al re-login)
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("last-activity");

        // Disparar evento para mostrar el modal
        window.dispatchEvent(new Event("session-expired"));
    }, [clearTimers]);

    const resetTimer = useCallback(() => {
        if (isExpiredRef.current) return;

        clearTimers();

        // Timer principal: expire después de INACTIVITY_TIMEOUT_MS
        timeoutRef.current = setTimeout(() => {
            handleSessionExpire();
        }, INACTIVITY_TIMEOUT_MS);

        // Guardar timestamp de última actividad
        localStorage.setItem("last-activity", Date.now().toString());
    }, [clearTimers, handleSessionExpire]);

    useEffect(() => {
        // Verificar que hay sesión activa
        const token = localStorage.getItem("token");
        if (!token) return;

        // Al montar con un token válido, resetear el flag de expiración
        // (es un nuevo login o una nueva carga de página)
        isExpiredRef.current = false;

        // Verificar si la sesión ya expiró por inactividad (para cuando vuelve a la pestaña)
        const lastActivity = localStorage.getItem("last-activity");
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity, 10);
            if (elapsed > INACTIVITY_TIMEOUT_MS) {
                handleSessionExpire();
                return;
            }
        }

        // Marcar actividad actual (cubre el caso de login fresco sin last-activity)
        localStorage.setItem("last-activity", Date.now().toString());

        // Eventos que consideramos como "actividad"
        const activityEvents = [
            "mousedown",
            "mousemove",
            "keydown",
            "scroll",
            "touchstart",
            "touchmove",
            "click",
            "pointermove",
        ];

        // Throttle para no resetear en cada pixel de movimiento
        let lastReset = Date.now();
        const throttledReset = () => {
            const now = Date.now();
            if (now - lastReset > 10000) { // Solo resetear cada 10 seg
                lastReset = now;
                resetTimer();
            }
        };

        activityEvents.forEach((event) => {
            window.addEventListener(event, throttledReset, { passive: true });
        });

        // Cuando la pestaña vuelve a ser visible, verificar si expiró
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                const lastAct = localStorage.getItem("last-activity");
                if (lastAct) {
                    const elapsed = Date.now() - parseInt(lastAct, 10);
                    if (elapsed > INACTIVITY_TIMEOUT_MS) {
                        handleSessionExpire();
                        return;
                    }
                }
                resetTimer();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        // Iniciar el timer
        resetTimer();

        return () => {
            clearTimers();
            activityEvents.forEach((event) => {
                window.removeEventListener(event, throttledReset);
            });
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [resetTimer, handleSessionExpire, clearTimers]);

    return null; // No renderiza nada
}
