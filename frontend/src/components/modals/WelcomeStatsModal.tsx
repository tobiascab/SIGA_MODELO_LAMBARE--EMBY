"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy, Users, UserCheck, Clock, X, TrendingUp,
    Award, CheckCircle2, Calendar, LayoutDashboard, ChevronRight
} from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

export function WelcomeStatsModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkShowModal = async () => {
            const userData = localStorage.getItem("user");
            if (!userData) return;

            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            // Verificar si el usuario tiene notificaciones desactivadas
            const notificationsEnabled = localStorage.getItem("notifications_enabled");
            if (notificationsEnabled === "false") {
                setLoading(false);
                return;
            }

            // Check if already shown in this "session" (we can use a flag with date)
            const today = new Date().toISOString().split('T')[0];
            const lastShown = localStorage.getItem(`welcome_stats_shown_${parsedUser.id}`);

            if (lastShown === today) {
                setLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem("token");
                const res = await axios.get("/api/reportes/mis-asignados", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setStats(res.data);
                setIsOpen(true);
                localStorage.setItem(`welcome_stats_shown_${parsedUser.id}`, today);
            } catch (error) {
                console.error("Error loading welcome stats:", error);
            } finally {
                setLoading(false);
            }
        };

        checkShowModal();
    }, []);

    const handleClose = () => {
        setIsOpen(false);
    };

    if (!isOpen || !stats) return null;

    const totalAsignados = stats.stats.total || 0;
    const presentes = stats.data?.filter((s: any) => s.estado === "PRESENTE") || [];
    const totalPresentes = presentes.length;
    const porcentajeAsistencia = totalAsignados > 0 ? Math.round((totalPresentes / totalAsignados) * 100) : 0;

    // Last 3 arrivals
    const lastArrivals = [...presentes]
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
        .slice(0, 3);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-emerald-500/10 overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
                >
                    {/* Close button - always visible */}
                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>

                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-5 sm:p-8 text-white relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Trophy className="h-24 w-24 sm:h-32 sm:w-32 rotate-12" />
                        </div>

                        <div className="relative z-10 pr-8">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                                    <Award className="h-4 w-4 sm:h-6 sm:w-6" />
                                </div>
                                <span className="text-[10px] sm:text-sm font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-emerald-50">Resumen de Gestión</span>
                            </div>
                            <h2 className="text-xl sm:text-3xl md:text-4xl font-black mb-0.5 sm:mb-1 tracking-tight">¡Hola, {user?.nombreCompleto?.split(' ')[0]}! 👋</h2>
                            <p className="text-emerald-50 font-medium opacity-90 text-sm sm:text-base">Mira cómo va tu lista en la asamblea de hoy.</p>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-10 space-y-5 sm:space-y-8">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="bg-slate-50 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                                <div className="p-2 sm:p-3 bg-blue-100 text-blue-600 rounded-xl sm:rounded-2xl mb-2 sm:mb-3">
                                    <Users className="h-4 w-4 sm:h-6 sm:w-6" />
                                </div>
                                <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Recolectados</span>
                                <span className="text-xl sm:text-3xl font-black text-slate-800 tracking-tighter">{totalAsignados}</span>
                            </div>

                            <div className="bg-emerald-50 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-100 flex flex-col items-center text-center relative overflow-hidden group">
                                <div className="p-2 sm:p-3 bg-emerald-500 text-white rounded-xl sm:rounded-2xl mb-2 sm:mb-3 shadow-lg shadow-emerald-200">
                                    <UserCheck className="h-4 w-4 sm:h-6 sm:w-6" />
                                </div>
                                <span className="text-[8px] sm:text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-0.5 sm:mb-1">Presentes</span>
                                <span className="text-xl sm:text-3xl font-black text-emerald-600 tracking-tighter">{totalPresentes}</span>
                            </div>

                            <div className="bg-indigo-50 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-indigo-100 flex flex-col items-center text-center">
                                <div className="p-2 sm:p-3 bg-indigo-500 text-white rounded-xl sm:rounded-2xl mb-2 sm:mb-3 shadow-lg shadow-indigo-200">
                                    <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />
                                </div>
                                <span className="text-[8px] sm:text-[10px] font-black text-indigo-600/70 uppercase tracking-widest mb-0.5 sm:mb-1">Efectividad</span>
                                <span className="text-xl sm:text-3xl font-black text-indigo-600 tracking-tighter">{porcentajeAsistencia}%</span>
                            </div>
                        </div>

                        {/* Recent Arrivals */}
                        {lastArrivals.length > 0 && (
                            <div className="space-y-3 sm:space-y-4">
                                <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Últimos ingresos de tu lista
                                </h3>
                                <div className="space-y-2 sm:space-y-3">
                                    {lastArrivals.map((arrival: any, idx) => (
                                        <motion.div
                                            key={arrival.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-center justify-between p-3 sm:p-4 bg-white border border-slate-100 rounded-xl sm:rounded-2xl shadow-sm"
                                        >
                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs sm:text-sm">
                                                    {arrival.socioNombre.split(' ').map((n: any) => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-xs sm:text-sm leading-tight truncate">{arrival.socioNombre}</p>
                                                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Socio #{arrival.socioNro}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                                <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-600 font-bold text-[10px] sm:text-xs">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Ingresó
                                                </div>
                                                <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                                                    {new Date(arrival.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer buttons - fixed at bottom */}
                    <div className="flex-shrink-0 p-3 sm:p-6 pt-3 sm:pt-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-3 sm:py-4 bg-slate-900 hover:bg-black text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 group"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Ir al Dashboard
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={handleClose}
                            className="px-6 py-3 sm:py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl sm:rounded-2xl font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>

                    {/* Footer decoration */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 opacity-50" />
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
