"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, RefreshCw, LogOut, AlertTriangle, Shield } from "lucide-react";
import axios from "axios";

// Sesión se cierra automáticamente cada 60 minutos
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos
// Mostrar aviso 5 minutos antes del cierre
const WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 minutos antes
// Tiempo de la advertencia = 55 minutos
const WARNING_AT_MS = SESSION_TIMEOUT_MS - WARNING_BEFORE_MS;

/**
 * Controla el cierre de sesión automático cada 60 minutos.
 * - A los 55 min: muestra aviso con opción de RENOVAR SESIÓN
 * - A los 60 min: cierra sesión automáticamente
 * - RENOVAR llama a /api/auth/refresh para obtener un nuevo token
 */
export function InactivityGuard() {
    const router = useRouter();
    const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isExpiredRef = useRef(false);

    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(300); // 5 min = 300 seg
    const [refreshing, setRefreshing] = useState(false);

    const clearAllTimers = useCallback(() => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    }, []);

    const handleSessionExpire = useCallback(() => {
        if (isExpiredRef.current) return;
        isExpiredRef.current = true;

        clearAllTimers();
        setShowWarning(false);

        // Limpiar sesión
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("session-start");
        localStorage.removeItem("last-activity");

        // Disparar evento para mostrar el SessionExpiredModal
        window.dispatchEvent(new Event("session-expired"));
    }, [clearAllTimers]);

    const startTimers = useCallback(() => {
        if (isExpiredRef.current) return;

        clearAllTimers();

        // Calcular tiempo restante basado en session-start
        const sessionStart = parseInt(localStorage.getItem("session-start") || "0", 10);
        if (!sessionStart) return;

        const elapsed = Date.now() - sessionStart;
        const remainingToWarning = WARNING_AT_MS - elapsed;
        const remainingToLogout = SESSION_TIMEOUT_MS - elapsed;

        // Si ya pasó el tiempo, expirar inmediatamente
        if (remainingToLogout <= 0) {
            handleSessionExpire();
            return;
        }

        // Si ya pasó el warning pero no el logout, mostrar warning
        if (remainingToWarning <= 0) {
            setShowWarning(true);
            setCountdown(Math.ceil(remainingToLogout / 1000));

            // Countdown cada segundo
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        handleSessionExpire();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Timer de logout
            logoutTimerRef.current = setTimeout(() => {
                handleSessionExpire();
            }, remainingToLogout);
            return;
        }

        // Programar warning
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setCountdown(Math.ceil(WARNING_BEFORE_MS / 1000));

            // Countdown cada segundo
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        handleSessionExpire();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, remainingToWarning);

        // Programar logout
        logoutTimerRef.current = setTimeout(() => {
            handleSessionExpire();
        }, remainingToLogout);

    }, [clearAllTimers, handleSessionExpire]);

    // Renovar sesión: obtener nuevo token
    const handleRenewSession = async () => {
        setRefreshing(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post("/api/auth/refresh", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.token) {
                // Guardar nuevo token y reiniciar la sesión
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("session-start", Date.now().toString());

                // Actualizar datos del usuario si vinieron
                if (res.data.id) {
                    const userData = JSON.parse(localStorage.getItem("user") || "{}");
                    const updatedUser = {
                        ...userData,
                        ...res.data,
                    };
                    delete updatedUser.token; // No guardar el token en el user object
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                }

                // Limpiar timers y reiniciar
                setShowWarning(false);
                setCountdown(300);
                clearAllTimers();
                isExpiredRef.current = false;
                startTimers();
            }
        } catch (err) {
            console.error("Error renovando sesión:", err);
            // Si falla el refresh, forzar logout
            handleSessionExpire();
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Al montar, resetear flag de expiración
        isExpiredRef.current = false;

        // Si no hay session-start, establecerlo ahora
        if (!localStorage.getItem("session-start")) {
            localStorage.setItem("session-start", Date.now().toString());
        }

        // Cuando la pestaña se vuelve visible, re-evaluar timers
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                const token = localStorage.getItem("token");
                if (!token) return;
                startTimers();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        startTimers();

        return () => {
            clearAllTimers();
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [startTimers, clearAllTimers]);

    // Formatear countdown mm:ss
    const formatTime = (secs: number) => {
        const min = Math.floor(secs / 60);
        const sec = secs % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <AnimatePresence>
            {showWarning && (
                <div className="fixed inset-0 z-[199] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-200"
                    >
                        {/* Top bar */}
                        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

                        <div className="p-6 text-center">
                            {/* Icon */}
                            <div className="relative mb-5 flex justify-center">
                                <motion.div
                                    animate={{ scale: [1, 1.15, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="absolute h-16 w-16 rounded-full bg-amber-100 opacity-60 blur-lg"
                                />
                                <div className="relative h-14 w-14 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner border border-amber-200">
                                    <Clock className="h-7 w-7" />
                                </div>
                            </div>

                            <h2 className="text-lg font-black text-slate-800 tracking-tight mb-1">
                                Tu sesión está por expirar
                            </h2>
                            <p className="text-slate-500 text-sm mb-4">
                                Se cerrará automáticamente en:
                            </p>

                            {/* Countdown */}
                            <div className="mb-5">
                                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    <span className="text-2xl font-black text-red-600 font-mono tracking-wider">
                                        {formatTime(countdown)}
                                    </span>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={handleRenewSession}
                                    disabled={refreshing}
                                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
                                >
                                    {refreshing ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Shield className="h-4 w-4" />
                                    )}
                                    {refreshing ? "RENOVANDO..." : "RENOVAR SESIÓN"}
                                </button>

                                <button
                                    onClick={handleSessionExpire}
                                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                    CERRAR SESIÓN AHORA
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-400 mt-4 font-medium">
                                Por seguridad, la sesión se cierra automáticamente cada 60 minutos
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
