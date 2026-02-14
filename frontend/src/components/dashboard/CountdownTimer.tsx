"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useConfig } from "@/context/ConfigContext";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, AlertCircle, ChevronUp, ChevronDown, Zap } from "lucide-react";

export const CountdownTimer = () => {
    const { fechaAsamblea, nombreAsamblea } = useConfig();
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
    const [isPast, setIsPast] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('countdown_minimized') === 'true';
        }
        return false;
    });

    const toggleMinimize = useCallback(() => {
        setIsMinimized((prev: boolean) => {
            const next = !prev;
            sessionStorage.setItem('countdown_minimized', String(next));
            return next;
        });
    }, []);

    const handleDragEnd = useCallback((_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
        // Swipe up to minimize, swipe down to restore
        if (info.offset.y < -40 || info.velocity.y < -200) {
            setIsMinimized(true);
            sessionStorage.setItem('countdown_minimized', 'true');
        }
    }, []);

    useEffect(() => {
        if (!fechaAsamblea) return;

        const [year, month, day] = fechaAsamblea.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day, 8, 0, 0);

        const calculateTimeLeft = () => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();

            if (difference > 0) {
                setIsPast(false);
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setIsPast(true);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [fechaAsamblea]);

    if (!timeLeft && !isPast) return null;

    // Vivid Premium Design: High Contrast & System Colors
    return (
        <div className="w-full mb-3 sm:mb-4">
            <AnimatePresence mode="wait">
                {isMinimized ? (
                    /* Minimized compact bar */
                    <motion.div
                        key="minimized"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={toggleMinimize}
                        className={`
                        relative overflow-hidden rounded-xl w-full shadow-lg cursor-pointer touch-manipulation
                        ${isPast
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            }
                    `}
                    >
                        <div className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                {!isPast && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
                                    </span>
                                )}
                                <span className="text-xs font-bold text-white/90 truncate">{nombreAsamblea}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {!isPast && timeLeft && (
                                    <div className="flex items-center gap-1.5 text-white">
                                        <span className="text-sm font-black tabular-nums">{timeLeft.days}d</span>
                                        <span className="text-white/50">:</span>
                                        <span className="text-sm font-black tabular-nums">{String(timeLeft.hours).padStart(2, '0')}h</span>
                                        <span className="text-white/50">:</span>
                                        <span className="text-sm font-black tabular-nums">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                                    </div>
                                )}
                                <ChevronDown className="w-4 h-4 text-white/70" />
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="expanded"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        drag={typeof window !== 'undefined' && window.innerWidth < 640 ? 'y' : false}
                        dragConstraints={{ top: -100, bottom: 0 }}
                        dragElastic={0.3}
                        onDragEnd={handleDragEnd}
                        className={`
                relative overflow-hidden rounded-2xl sm:rounded-[2rem] w-full shadow-2xl shadow-emerald-900/20
                ${isPast
                                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
                                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500'
                            }
            `}>
                        {/* Decorative Background Elements - Glassy & Vivid */}
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                        {/* Pattern Overlay */}
                        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none" />

                        <div className="relative flex flex-col lg:flex-row items-center justify-between px-3 py-3 sm:px-4 sm:py-5 lg:px-10 lg:py-8 gap-3 sm:gap-5 lg:gap-8">

                            {/* Minimize hint - mobile only */}
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 sm:hidden">
                                <div className="w-8 h-1 bg-white/30 rounded-full" />
                            </div>

                            {/* Left: Event Info with High Impact */}
                            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto z-10">
                                <div className={`
                            p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl shadow-xl shrink-0 backdrop-blur-md border border-white/20
                            ${isPast ? 'bg-white/20' : 'bg-white/10'}
                        `}>
                                    {isPast
                                        ? <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white drop-shadow-md" />
                                        : <Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white drop-shadow-md" />
                                    }
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {!isPast && (
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                                            </span>
                                        )}
                                        <h3 className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-emerald-100 uppercase tracking-[0.15em] sm:tracking-[0.2em] drop-shadow-sm">
                                            {isPast ? 'Evento Finalizado' : 'Cuenta Regresiva Oficial'}
                                        </h3>
                                    </div>
                                    <h2 className="text-base sm:text-xl lg:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                                        {nombreAsamblea}
                                    </h2>
                                    <p className="text-white/80 text-[10px] sm:text-xs lg:text-sm font-medium mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        {fechaAsamblea} • Asamblea.Cloud
                                    </p>
                                </div>
                            </div>

                            {/* Right: The Timer (White Cards on Vivid Background) */}
                            {!isPast && timeLeft && (
                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4 z-10 w-full lg:w-auto justify-center lg:justify-end">
                                    {[
                                        { val: timeLeft.days, label: 'DÍAS' },
                                        { val: timeLeft.hours, label: 'HORAS' },
                                        { val: timeLeft.minutes, label: 'MIN' },
                                        { val: timeLeft.seconds, label: 'SEG' }
                                    ].map((item, i) => (
                                        <div key={item.label} className="flex flex-col items-center">
                                            <motion.div
                                                whileHover={{ y: -2 }}
                                                className="relative bg-white rounded-lg sm:rounded-xl lg:rounded-2xl w-11 h-11 sm:w-14 sm:h-14 lg:w-20 lg:h-20 flex items-center justify-center shadow-lg shadow-emerald-900/20 border-b-2 sm:border-b-4 border-emerald-100/50"
                                            >
                                                <span className="text-lg sm:text-2xl lg:text-4xl font-black text-teal-500 tabular-nums leading-none tracking-tight">
                                                    {String(item.val).padStart(2, '0')}
                                                </span>
                                            </motion.div>
                                            <span className="text-[8px] sm:text-[9px] lg:text-xs font-bold text-white/90 mt-1 sm:mt-2 uppercase tracking-wider sm:tracking-widest drop-shadow-sm">
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Status Badge (Desktop Only) */}
                            <div className="hidden lg:block z-10">
                                <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isPast ? 'bg-amber-400' : 'bg-emerald-400'} shadow-[0_0_8px_rgba(52,211,153,0.6)]`} />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                                        {isPast ? 'Finalizado' : 'Sistema Activo'}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isPast && (
                <div className="mt-3 text-center">
                    <p className="text-xs text-amber-600 font-bold bg-amber-50 py-1.5 px-6 rounded-full inline-block border border-amber-100">
                        La fecha del evento ({fechaAsamblea}) ha pasado.
                        Configura 2026 para reiniciar el contador.
                    </p>
                </div>
            )}
        </div>
    );
};
