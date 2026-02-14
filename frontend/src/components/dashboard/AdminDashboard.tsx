"use client";

import { useState, useEffect } from "react";
import {
    Users, ShieldCheck, TrendingUp, Building2, Clock, RefreshCw,
    Activity, UserCheck, PieChart as PieIcon, BarChart3, Award,
    Zap, Target, CheckCircle2, AlertCircle, Crown, Medal, Star, AlertTriangle, Eye
} from "lucide-react";


import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { RankMotivationWidget } from "./RankMotivationWidget";



import { useUserActivity } from "@/context/UserActivityContext";
import { UserActivityReportModal } from "./UserActivityReportModal";
import { ActiveUsersModal } from "./ActiveUsersModal";
import { ActivityWidget } from "./ActivityWidget";
import { DailyAssignmentsWidget } from "./DailyAssignmentsWidget";
import { DailyAssignmentsModal } from "./DailyAssignmentsModal";
import { SucursalAvanceWidget } from "./SucursalAvanceWidget";

interface AdminDashboardProps {
    stats: {
        totalPadron: number;
        conVozYVoto: number;
        soloVoz: number;
        presentes?: number;
        presentesVyV?: number;
        totalMeta?: number;
    } | null;
    desempeno: any[];
    ranking?: any[];
    userActivity: {
        total: number;
        usuales: number;
        activos: number;
        sinRegistros?: number;
        activeList: any[];
        hourlyStats: { labels: string[], data: number[] };
    };
    onRefresh: (silent?: boolean) => void;
}


import { MetasWidgets } from "./MetasWidgets";

// Contador animado premium
const AnimatedCounter = ({ value, duration = 3.5 }: { value: number; duration?: number }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value || 0;
        // Optimization: Reduce updates on mobile or large numbers
        const totalFrames = end > 1000 ? 20 : 50;
        const incrementValue = Math.ceil(end / totalFrames);
        const incrementTime = (duration * 1000) / totalFrames;

        const timer = setInterval(() => {
            start += incrementValue;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, incrementTime || 50);
        return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{count.toLocaleString()}</span>;
};

export function AdminDashboard({ stats, desempeno, ranking, userActivity, onRefresh }: AdminDashboardProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isActiveUsersModalOpen, setIsActiveUsersModalOpen] = useState(false);
    const [isActivityReportModalOpen, setIsActivityReportModalOpen] = useState(false);
    const [activityReportFilter, setActivityReportFilter] = useState<"todos" | "habituales" | "no-entraron" | "sin-registros">("todos");
    const [userRole, setUserRole] = useState<string>("");
    const [currentUsername, setCurrentUsername] = useState<string>("");
    const [isDailyAssignmentsModalOpen, setIsDailyAssignmentsModalOpen] = useState(false);

    // Obtener username actual
    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                setCurrentUsername(parsed.username || "");
                setUserRole(parsed.rol || "");
            } catch (e) {
                console.error("Error parsing user for dashboard restrictions:", e);
            }
        }
    }, []);

    // Usar el contexto global para usuarios activos en tiempo real
    const { stats: realTimeStats } = useUserActivity();

    // Si tenemos datos del contexto, usamos esos para "activos", sino el fallback de props
    const activeUsersCount = realTimeStats.activos > 0 ? realTimeStats.activos : (userActivity?.activos || 0);

    // Persistencia del estado Auto-Sync
    // Leer al montar el componente
    useEffect(() => {
        const saved = localStorage.getItem("dashboard_autosync");
        if (saved === "true") {
            setAutoRefresh(true);
        }
    }, []);

    const handleRefresh = (silent = false) => {
        if (!silent) setIsRefreshing(true);
        onRefresh(silent);
        if (!silent) setTimeout(() => setIsRefreshing(false), 800);
    };

    // Efecto para intervalo y guardar estado
    useEffect(() => {
        // Guardar persistencia
        localStorage.setItem("dashboard_autosync", String(autoRefresh));

        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(() => handleRefresh(true), 10000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [autoRefresh]);

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <RefreshCw className="h-10 w-10 text-emerald-500" />
                </motion.div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando Inteligencia de Datos...</p>
            </div>
        );
    }

    const presentes = stats.presentes || 0;
    const ausentes = Math.max(0, stats.totalPadron - presentes);

    // Calcular porcentaje con precisión adecuada
    const porcentajeAsistenciaRaw = stats.totalPadron > 0 ? ((presentes / stats.totalPadron) * 100) : 0;
    // Mostrar hasta 3 decimales para valores pequeños, 1 decimal para valores grandes
    const porcentajeAsistencia = porcentajeAsistenciaRaw < 1
        ? porcentajeAsistenciaRaw.toFixed(3)
        : porcentajeAsistenciaRaw.toFixed(1);

    const porcentajeHabilitacionRaw = stats.totalPadron > 0 ? ((stats.conVozYVoto / stats.totalPadron) * 100) : 0;
    const porcentajeHabilitacion = porcentajeHabilitacionRaw < 1
        ? porcentajeHabilitacionRaw.toFixed(3)
        : porcentajeHabilitacionRaw.toFixed(1);
    const quorumNecesario = Math.floor(stats.totalPadron / 2) + 1;
    const progresoQuorum = stats.totalPadron > 0 ? Math.min((presentes / quorumNecesario) * 100, 100) : 0;

    // Data para gráficos
    const pieAsistencia = [
        { name: 'Presentes', value: presentes, color: '#10b981' },
        { name: 'Ausentes', value: ausentes, color: '#e2e8f0' },
    ];

    const pieHabilitacion = [
        { name: 'Voz y Voto', value: stats.conVozYVoto, color: '#6366f1' },
        { name: 'Solo Voz', value: stats.soloVoz, color: '#f59e0b' },
    ];

    const radialData = [
        { name: 'Quorum', value: progresoQuorum, fill: progresoQuorum >= 100 ? '#10b981' : '#6366f1' }
    ];

    const topSucursales = desempeno.slice(0, 6).map((item) => ({
        name: item.sucursal?.substring(0, 8) || 'N/A',
        vyv: item.vozVoto || 0,
        sv: Math.max(0, (item.padron || 0) - (item.vozVoto || 0)),
        presentes: item.presentes || 0,
    }));

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-12">
            <ActiveUsersModal
                isOpen={isActiveUsersModalOpen}
                onClose={() => setIsActiveUsersModalOpen(false)}
                users={userActivity?.activeList || []}
            />

            <UserActivityReportModal
                isOpen={isActivityReportModalOpen}
                onClose={() => setIsActivityReportModalOpen(false)}
                initialFilter={activityReportFilter}
            />

            <DailyAssignmentsModal
                isOpen={isDailyAssignmentsModalOpen}
                onClose={() => setIsDailyAssignmentsModalOpen(false)}
            />

            {/* Header Centro de Control - REDISEÑO RESPONSIVE */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative group"
            >
                {/* Background Layer */}
                <div className="absolute inset-0 bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-white/50 shadow-xl transition-all duration-500" />

                {/* Decorative Blobs - Ocultos en móvil para performance */}
                <div className="hidden md:block absolute top-0 right-0 w-[300px] h-full bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" />

                <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 md:gap-6">

                    {/* Left Branding Group */}
                    <div className="flex items-center gap-2.5 sm:gap-3 md:gap-5">
                        {/* Interactive Main Icon */}
                        <div className="relative group/icon cursor-help">
                            {/* Animated Outer Rings */}
                            <motion.div
                                animate={{
                                    scale: autoRefresh ? [1, 1.2, 1] : 1,
                                    opacity: autoRefresh ? [0.3, 0.1, 0.3] : 0
                                }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="absolute -inset-4 bg-emerald-400 rounded-full blur-2xl"
                            />

                            <div className="relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-white rounded-2xl sm:rounded-3xl shadow-[0_12px_24px_-8px_rgba(16,185,129,0.3)] border border-slate-100 transition-all duration-500 group-hover/icon:scale-110 group-hover/icon:rotate-3 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30" />
                                <Activity className={`h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-emerald-500 relative z-10 transition-all duration-1000 ${autoRefresh ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`} />

                                {/* Micro Shine Effect */}
                                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />
                            </div>

                            {/* Status Indicator Overlap */}
                            <motion.div
                                initial={false}
                                animate={{ scale: autoRefresh ? 1 : 0.8, opacity: autoRefresh ? 1 : 0.7 }}
                                className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-lg z-20 transition-colors duration-500 ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                {autoRefresh && <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />}
                            </motion.div>
                        </div>

                        {/* Title Wrapper */}
                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-4">
                                <h1 className="text-xl sm:text-3xl lg:text-5xl font-black text-slate-800 tracking-tight leading-none drop-shadow-sm">
                                    Centro de <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Control</span>
                                </h1>
                                <AnimatePresence mode="wait">
                                    {autoRefresh && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10, scale: 0.8 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="px-3 py-1 bg-emerald-100/50 backdrop-blur-md rounded-full border border-emerald-200"
                                        >
                                            <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Live Monitoring
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <p className="text-slate-500/80 font-bold text-xs sm:text-sm lg:text-base flex items-center gap-2 sm:gap-3">
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                Panel Inteligente de Operaciones & Estadísticas
                            </p>
                        </div>
                    </div>

                    {/* Right Control Group - Premium Floating Island */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">

                        {/* Auto-Sync Tactile Toggle */}
                        <motion.div
                            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.8)" }}
                            onTap={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-3 sm:gap-4 pl-3 sm:pl-5 pr-4 sm:pr-6 py-3 sm:py-4 rounded-2xl sm:rounded-[2rem] border transition-all duration-500 cursor-pointer shadow-sm select-none touch-manipulation
                            ${autoRefresh ? 'bg-white border-emerald-200 shadow-emerald-100/30' : 'bg-slate-50/50 border-slate-200'}`}
                        >
                            <div className="flex flex-col items-start pr-2">
                                <span className={`text-[10px] font-black tracking-[0.15em] mb-1 ${autoRefresh ? 'text-emerald-500' : 'text-slate-400'}`}>AUTO-SYNC</span>
                                <span className={`text-xs font-bold ${autoRefresh ? 'text-slate-700' : 'text-slate-500'}`}>
                                    {autoRefresh ? 'Sincronización Activa' : 'Pausado Manual'}
                                </span>
                            </div>

                            {/* Tactile Switch UI */}
                            <div className={`relative w-14 h-8 rounded-full transition-all duration-500 p-1 ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                <motion.div
                                    animate={{
                                        x: autoRefresh ? 24 : 0,
                                        backgroundColor: autoRefresh ? "#fff" : "#fff"
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className="w-6 h-6 rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden"
                                >
                                    {autoRefresh ? (
                                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                    )}
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Interactive Refresh Button */}
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleRefresh(false)}
                            disabled={isRefreshing}
                            className="relative h-12 sm:h-16 group/btn"
                        >
                            {/* Glowing Aura on Hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl blur-lg opacity-0 group-hover/btn:opacity-30 transition-opacity duration-500" />

                            <div className="relative h-full px-5 sm:px-8 bg-slate-900 overflow-hidden rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 border border-slate-800 transition-all duration-300 group-hover/btn:border-emerald-500/50">
                                {/* Flowing Shine Animation */}
                                <motion.div
                                    animate={{ x: ['-200%', '200%'] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                                />

                                <RefreshCw className={`h-5 w-5 text-emerald-400 transition-all duration-700 ${isRefreshing ? 'animate-spin' : 'group-hover/btn:rotate-180'}`} />
                                <span className="text-white font-black uppercase text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em]">
                                    {isRefreshing ? 'Procesando...' : 'Actualizar'}
                                </span>

                                {/* Progress Indicator */}
                                {isRefreshing && (
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        className="absolute bottom-0 left-0 h-1 bg-emerald-500 shadow-[0_-2px_8px_rgba(16,185,129,0.5)]"
                                    />
                                )}
                            </div>
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* SECCIÓN DE ACTIVIDAD DE USUARIOS - SOLO SUPER_ADMIN */}
            {userRole === "SUPER_ADMIN" && userActivity && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Widget Graph (Ocupa 7 columnas en desktop grande) */}
                    <div className="lg:col-span-7 h-[360px]">
                        <ActivityWidget data={userActivity.hourlyStats.data} labels={userActivity.hourlyStats.labels} />
                    </div>

                    {/* Summary Cards (Ocupa 5 columnas) - Grid interno 2x3 */}
                    <div className="lg:col-span-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Activos - Ocupa 2 filas - NÚMERO GIGANTE */}
                        <motion.div
                            whileHover={{ scale: 1.03, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            onClick={() => setIsActiveUsersModalOpen(true)}
                            role="button"
                            tabIndex={0}
                            className="row-span-2 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-2xl shadow-emerald-500/30 cursor-pointer relative overflow-hidden group flex flex-col items-center justify-center text-center border border-white/20 select-none touch-manipulation"
                        >
                            {/* Decorative glow */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"
                            />

                            <div className="relative z-10 mb-1">
                                <motion.span
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30 shadow-lg"
                                >
                                    <div className="w-2.5 h-2.5 bg-emerald-300 rounded-full animate-pulse shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                                    En Vivo
                                </motion.span>
                            </div>
                            <h3 className="relative z-10 text-xs font-bold uppercase tracking-widest opacity-90 mt-2">Online</h3>
                            <motion.div
                                className="relative z-10 my-3"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <span className="text-7xl lg:text-8xl font-black tracking-tighter drop-shadow-lg"><AnimatedCounter value={activeUsersCount} /></span>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="relative z-10 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur px-4 py-2 rounded-xl border border-white/30 shadow-lg hover:bg-white/30 transition-all"
                            >
                                <Users size={12} />
                                <span>Ver Lista</span>
                            </motion.div>
                        </motion.div>

                        {/* Usuales */}
                        <motion.div
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.97 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            onClick={() => {
                                setActivityReportFilter("habituales");
                                setIsActivityReportModalOpen(true);
                            }}
                            role="button"
                            tabIndex={0}
                            className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl border border-slate-100 hover:border-blue-200 relative overflow-hidden flex flex-col items-center justify-center text-center group cursor-pointer transition-all duration-300 select-none touch-manipulation active:scale-95"
                        >
                            <div className="relative z-10">
                                <motion.div
                                    whileHover={{ rotate: [0, -10, 10, 0] }}
                                    transition={{ duration: 0.5 }}
                                    className="inline-flex items-center justify-center p-2 bg-blue-50 text-blue-500 rounded-xl mb-1 shadow-sm"
                                >
                                    <UserCheck className="h-5 w-5" strokeWidth={2.5} />
                                </motion.div>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Usuales</p>
                            </div>
                            <motion.p
                                className="relative z-10 text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter my-2"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                            >
                                <AnimatedCounter value={userActivity.usuales} />
                            </motion.p>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative z-10 flex items-center gap-1 px-4 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-lg"
                            >
                                <Eye size={12} />
                                <span>Ver</span>
                            </motion.div>
                        </motion.div>

                        {/* Total */}
                        <motion.div
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.97 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            onClick={() => {
                                setActivityReportFilter("todos");
                                setIsActivityReportModalOpen(true);
                            }}
                            role="button"
                            tabIndex={0}
                            className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl border border-slate-100 hover:border-indigo-200 relative overflow-hidden flex flex-col items-center justify-center text-center group cursor-pointer transition-all duration-300 select-none touch-manipulation active:scale-95"
                        >
                            <div className="relative z-10">
                                <motion.div
                                    whileHover={{ rotate: [0, -10, 10, 0] }}
                                    transition={{ duration: 0.5 }}
                                    className="inline-flex items-center justify-center p-2 bg-indigo-50 text-indigo-500 rounded-xl mb-1 shadow-sm"
                                >
                                    <Users className="h-5 w-5" strokeWidth={2.5} />
                                </motion.div>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Total</p>
                            </div>
                            <motion.p
                                className="relative z-10 text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter my-2"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                            >
                                <AnimatedCounter value={userActivity.total} />
                            </motion.p>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative z-10 flex items-center gap-1 px-4 py-1.5 bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors shadow-lg"
                            >
                                <Eye size={12} />
                                <span>Ver</span>
                            </motion.div>
                        </motion.div>

                        {/* 0 Registros */}
                        <motion.div
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.97 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            onClick={() => {
                                setActivityReportFilter("sin-registros");
                                setIsActivityReportModalOpen(true);
                            }}
                            role="button"
                            tabIndex={0}
                            className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl border border-slate-100 hover:border-amber-200 relative overflow-hidden flex flex-col items-center justify-center text-center group cursor-pointer transition-all duration-300 select-none touch-manipulation active:scale-95"
                        >
                            <div className="relative z-10">
                                <motion.div
                                    whileHover={{ rotate: [0, -10, 10, 0] }}
                                    animate={{ y: [0, -2, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="inline-flex items-center justify-center p-2 bg-amber-50 text-amber-600 rounded-xl mb-1 shadow-sm"
                                >
                                    <AlertTriangle className="h-5 w-5" strokeWidth={2.5} />
                                </motion.div>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">0 Registros</p>
                            </div>
                            <motion.p
                                className="relative z-10 text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter my-2"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                            >
                                <AnimatedCounter value={userActivity.sinRegistros || 0} />
                            </motion.p>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative z-10 flex items-center gap-1 px-4 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-600 transition-colors shadow-lg"
                            >
                                <Eye size={12} />
                                <span>Ver</span>
                            </motion.div>
                        </motion.div>

                        {/* Widget de Asignaciones Diarias */}
                        <div className="row-span-2">
                            <DailyAssignmentsWidget onOpenModal={() => setIsDailyAssignmentsModalOpen(true)} />
                        </div>
                    </div>

                </div>
            )}

            {/* Widget de Motivación basado en Ranking */}
            {ranking && ranking.length > 0 && currentUsername && (
                <RankMotivationWidget
                    ranking={ranking}
                    currentUsername={currentUsername}
                />
            )}

            {/* WIDGETS DE METAS DE REGISTRO */}
            <MetasWidgets />

            {/* KPIs Premium 'Nano' Style */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-6">
                {
                    [
                        { label: "Meta Global", value: stats.totalMeta || 0, icon: Target, gradient: "from-pink-500 via-rose-600 to-rose-700", shadow: "shadow-rose-500/40", ring: "ring-rose-400/30" },
                        { label: "Total Padrón", value: stats.totalPadron, icon: Users, gradient: "from-blue-500 via-blue-600 to-blue-700", shadow: "shadow-blue-500/40", ring: "ring-blue-400/30" },
                        { label: "Habilitados V&V", value: stats.conVozYVoto, icon: ShieldCheck, gradient: "from-emerald-500 via-emerald-500 to-teal-500", shadow: "shadow-emerald-500/40", ring: "ring-emerald-400/30" },
                        { label: "Presentes Ahora", value: presentes, icon: UserCheck, gradient: "from-violet-500 via-purple-600 to-purple-700", shadow: "shadow-purple-500/40", ring: "ring-purple-400/30" },
                        { label: "Solo Voz", value: stats.soloVoz, icon: AlertCircle, gradient: "from-amber-400 via-orange-500 to-orange-600", shadow: "shadow-orange-500/40", ring: "ring-orange-400/30" },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className={`relative overflow-hidden rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 lg:p-8 text-white shadow-2xl bg-gradient-to-br ${stat.shadow} ${stat.gradient} group`}
                        >
                            {/* Glossy Overlay/Reflection */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />

                            {/* Inner Highlight Ring */}
                            <div className={`absolute inset-0 rounded-2xl sm:rounded-[2rem] border border-white/20 ${stat.ring} pointer-events-none`} />

                            {/* Background Icon */}
                            <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110">
                                <stat.icon className="h-20 w-20 sm:h-32 sm:w-32" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex flex-col h-full justify-between gap-2 sm:gap-4">
                                {/* Header: Icon + Label */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-1.5 sm:p-2.5 bg-white/20 backdrop-blur-md rounded-lg sm:rounded-xl shadow-inner border border-white/20">
                                        <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                    </div>
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/90 drop-shadow-sm">
                                        {stat.label}
                                    </span>
                                </div>

                                {/* Value */}
                                <div className="mt-auto">
                                    <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter drop-shadow-lg leading-none">
                                        <AnimatedCounter value={stat.value} />
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                }
            </div>

            {/* Barra de Progreso Quórum Premium */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100"
            >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl shadow-lg shadow-indigo-200">
                            <Target className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm sm:text-lg">Progreso de Asistencia</h3>
                            <p className="text-slate-400 text-[10px] sm:text-xs font-medium hidden sm:block">Asistencia sobre el total de padrón</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl sm:text-4xl font-black text-slate-800">{porcentajeAsistencia}%</p>
                        <p className="text-slate-400 text-xs sm:text-sm font-medium">{presentes.toLocaleString()} /{stats.totalPadron.toLocaleString()}</p>
                    </div>
                </div>
                <div className="h-4 sm:h-6 bg-slate-100 rounded-full overflow-hidden relative">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(porcentajeAsistenciaRaw, 100)}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={`h-full rounded-full relative ${porcentajeAsistenciaRaw >= 50 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-pulse" />
                    </motion.div>
                </div>

            </motion.div>

            {/* Grid Principal de Estadísticas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

                {/* Gráfico Radial de Quórum */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-200">
                            <PieIcon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Asistencia en Vivo</h3>
                    </div>

                    <div className="h-[180px] relative">
                        <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                            <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="95%" data={radialData} startAngle={90} endAngle={-270}>
                                <RadialBar background dataKey="value" cornerRadius={10} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
                            <span className="text-2xl lg:text-3xl font-black text-slate-800 leading-tight">{porcentajeAsistencia}%</span>
                            <span className="text-emerald-500 font-bold text-[9px] uppercase tracking-wider">Presentes</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                            <p className="text-2xl font-black text-emerald-500">{presentes.toLocaleString()}</p>
                            <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest">Presentes</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                            <p className="text-2xl font-black text-slate-600">{ausentes.toLocaleString()}</p>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Ausentes</p>
                        </div>
                    </div>
                </motion.div>

                {/* Gráfico de Habilitación */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Estado Habilitación</h3>
                    </div>

                    <div className="h-[180px] relative">
                        <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                            <PieChart>
                                <Pie
                                    data={pieHabilitacion}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieHabilitacion.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
                            <span className="text-2xl lg:text-3xl font-black text-slate-800 leading-tight">{porcentajeHabilitacion}%</span>
                            <span className="text-indigo-500 font-bold text-[9px] uppercase tracking-wider">Habilitados</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                            <p className="text-2xl font-black text-indigo-600">{stats.conVozYVoto.toLocaleString()}</p>
                            <p className="text-indigo-600/70 text-xs font-bold uppercase tracking-widest">Voz y Voto</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                            <p className="text-2xl font-black text-amber-600">{stats.soloVoz.toLocaleString()}</p>
                            <p className="text-amber-600/70 text-xs font-bold uppercase tracking-widest">Solo Voz</p>
                        </div>
                    </div>
                </motion.div>

                {/* Ranking de Operadores */}
                {/* Ranking de Operadores - DISEÑO PREMIUM */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col justify-between overflow-hidden relative"
                >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-100/40 to-orange-100/40 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none" />

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-amber-200">
                                <Award className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-wider text-base">Top Operadores</h3>
                                <p className="text-slate-400 text-xs font-bold">Líderes en asignaciones</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                            En Tiempo Real
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10 flex-1">
                        {ranking && ranking.length > 0 ? (
                            ranking.slice(0, 5).map((op, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 + 0.3 }}
                                    className={`group flex items-center gap-4 p-4 rounded-2xl transition-all border ${i === 0
                                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100 hover:shadow-md hover:shadow-amber-100/50'
                                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm'
                                        }`}
                                >
                                    {/* Ranking Badge - NÚMERO GRANDE */}
                                    <div className={`h-14 w-14 rounded-2xl flex flex-col items-center justify-center transition-transform group-hover:scale-110 shadow-lg shrink-0 ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-orange-200' :
                                        i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-slate-200' :
                                            i === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-700 text-white shadow-orange-200' :
                                                'bg-slate-100 text-slate-400'
                                        }`}>
                                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-90">TOP</span>
                                        <span className="text-2xl font-black leading-none -mt-0.5">{i + 1}</span>
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col">
                                            <p className={`font-bold text-sm truncate ${i === 0 ? 'text-slate-800' : 'text-slate-700'}`}>
                                                {op.nombre || op.username}
                                            </p>
                                            <p className="text-slate-400 text-xs font-medium">@{op.username}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="text-right pl-4 border-l border-slate-100">
                                        <p className={`font-black text-xl ${i === 0 ? 'text-orange-500' : 'text-slate-700'}`}>
                                            {op.totalRegistros}
                                        </p>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Socios</p>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                                <div className="p-4 bg-slate-50 rounded-full mb-3">
                                    <Clock className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sin actividad registrada</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Segunda Fila - Gráficos Grandes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" >
                {/* Gráfico Torta Composición por Sucursal (Voz y Voto vs Solo Voz) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200">
                                <PieIcon className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Composición por Sucursal</h3>
                        </div>
                    </div>

                    <div className="h-[280px] relative">
                        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                            <PieChart>
                                <Pie
                                    data={pieHabilitacion}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                                    labelLine={false}
                                >
                                    {pieHabilitacion.map((entry, index) => (
                                        <Cell key={`cell-comp-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
                                    formatter={(value) => (value as number).toLocaleString()}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black text-slate-800">{stats.totalPadron.toLocaleString()}</span>
                            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Total Padrón</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white text-center shadow-lg shadow-indigo-200">
                            <p className="text-3xl font-black">{stats.conVozYVoto.toLocaleString()}</p>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">Voz y Voto</p>
                            <p className="text-white/60 text-[10px] font-bold mt-1">{porcentajeHabilitacion}%</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white text-center shadow-lg shadow-amber-200">
                            <p className="text-3xl font-black">{stats.soloVoz.toLocaleString()}</p>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">Solo Voz</p>
                            <p className="text-white/60 text-[10px] font-bold mt-1">{(100 - parseFloat(porcentajeHabilitacion)).toFixed(1)}%</p>
                        </div>
                    </div>
                </motion.div>

                {/* Tabla de Ranking Regional (Reemplazado por Avance Sucursal) */}
                <div className="h-[400px]">
                    <SucursalAvanceWidget />
                </div>
            </div>

            {/* Mini Stats Footer */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {
                    [
                        { label: "Sucursales", value: desempeno.length, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Operadores Activos", value: ranking?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Ratio VyV", value: `${porcentajeHabilitacion}%`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
                        { label: "Meta Quórum", value: quorumNecesario.toLocaleString(), icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            whileHover={{ y: -3 }}
                            className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 flex items-center gap-4"
                        >
                            <div className={`p-3 ${stat.bg} rounded-xl`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </motion.div>
                    ))
                }
            </div>
        </div>
    );
}
