"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Timer, Calendar, ShieldAlert, XCircle } from "lucide-react";
import { useConfig } from "@/context/ConfigContext";

interface Props {
    children: React.ReactNode;
}

// Fecha de inicio de la Asamblea: 25 de enero de 2026, 00:00 AM (Cambio de 07:00 a 00:00 para habilitación inmediata)
const ASSEMBLY_DATE = new Date("2026-01-25T00:00:00").getTime();

export function AssemblyCountdownGate({ children }: Props) {
    const { isCheckinHabilitado } = useConfig();
    const [isCountingDown, setIsCountingDown] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        // Cargar datos del usuario
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const difference = ASSEMBLY_DATE - now;

            if (difference <= 0) {
                setIsCountingDown(false);
                clearInterval(timer);
            } else {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000)
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Si es SUPER_ADMIN, siempre tiene acceso
    if (user?.rol === "SUPER_ADMIN") {
        return <>{children}</>;
    }

    // Si el check-in ha sido cerrado manualmente desde admin
    if (!isCheckinHabilitado) {
        return (
            <div className="min-h-[70vh] md:min-h-[80vh] flex items-center justify-center p-3 md:p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md md:max-w-xl"
                >
                    <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-5 md:p-10 shadow-2xl border border-red-100 text-center relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-red-100 to-orange-50 rounded-full blur-3xl opacity-70" />

                        <div className="relative z-10 space-y-5 md:space-y-8">
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-red-200 rounded-full blur-xl scale-150" />
                                    <div className="relative h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-red-200/50">
                                        <XCircle className="h-8 w-8 md:h-10 md:w-10 text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight italic uppercase">Módulo Cerrado</h2>
                                <p className="text-slate-500 text-sm md:text-base font-medium max-w-sm mx-auto leading-snug">
                                    El proceso de check-in ha finalizado por decisión de la administración.
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full border border-red-100 text-xs font-bold uppercase tracking-wider">
                                <Lock className="h-3.5 w-3.5" />
                                Acceso Restringido
                            </div>

                            <div className="pt-2 md:pt-4">
                                <p className="text-[11px] md:text-xs font-semibold text-slate-400 leading-relaxed uppercase">
                                    Si crees que esto es un error, contacta al administrador del sistema.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Si todavía está en cuenta regresiva (antes del 25/01)
    if (isCountingDown) {
        return (
            <div className="min-h-[70vh] md:min-h-[80vh] flex items-center justify-center p-3 md:p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md md:max-w-xl"
                >
                    <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-5 md:p-10 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
                        {/* Fondo decorativo sutil */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-full blur-3xl opacity-70" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-amber-100 to-orange-50 rounded-full blur-3xl opacity-70" />

                        <div className="relative z-10 space-y-5 md:space-y-8">
                            {/* Icono Premium */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-200 rounded-full blur-xl animate-pulse scale-150" />
                                    <div className="relative h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200/50 transform rotate-3">
                                        <Timer className="h-8 w-8 md:h-10 md:w-10 text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Título compacto en móvil */}
                            <div className="space-y-2">
                                <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">Módulo en Espera</h2>
                                <p className="text-slate-500 text-sm md:text-base font-medium max-w-sm mx-auto leading-snug">
                                    Se habilitará automáticamente el día de la Asamblea General
                                </p>
                            </div>

                            {/* Contador Premium - Compacto en móvil */}
                            <div className="flex justify-center gap-2 md:gap-3">
                                {[
                                    { label: "DÍAS", value: timeLeft.days },
                                    { label: "HRS", value: timeLeft.hours },
                                    { label: "MIN", value: timeLeft.minutes },
                                    { label: "SEG", value: timeLeft.seconds }
                                ].map((unit) => (
                                    <div
                                        key={unit.label}
                                        className="bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-xl md:rounded-2xl px-3 py-2.5 md:px-5 md:py-4 border border-slate-200/60 shadow-sm min-w-[60px] md:min-w-[80px]"
                                    >
                                        <div className="text-2xl md:text-5xl font-black text-emerald-600 tabular-nums leading-none">
                                            {unit.value < 10 ? `0${unit.value}` : unit.value}
                                        </div>
                                        <div className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                            {unit.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Badges en línea */}
                            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-emerald-100">
                                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                                    <span className="text-xs md:text-sm font-bold text-emerald-700">25 Enero, 2026</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-amber-100">
                                    <Lock className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600" />
                                    <span className="text-xs md:text-sm font-bold text-amber-700">Automático</span>
                                </div>
                            </div>

                            {/* Aviso compacto */}
                            <div className="pt-2 md:pt-4">
                                <div className="inline-flex items-start gap-2.5 px-4 py-3 md:px-5 md:py-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl md:rounded-2xl text-left max-w-sm mx-auto">
                                    <ShieldAlert className="h-4 w-4 md:h-5 md:w-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] md:text-xs font-semibold text-amber-800 leading-relaxed">
                                        Acceso restringido a Operadores hasta la fecha indicada.
                                        <span className="text-amber-600 block mt-0.5">Si eres admin, inicia sesión con tu cuenta.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Si ya pasó la fecha y está habilitado, tiene acceso
    return <>{children}</>;
}
