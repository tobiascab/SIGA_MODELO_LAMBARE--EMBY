"use client";

import { useState, useEffect, useCallback } from "react";
import { Target, Users, Briefcase, UserCheck, Star, Trophy } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import axios from "axios";

interface Stats {
    totalPadron: number;
    presentes: number;
    presentesVyV: number;
}

interface MetasData {
    meta: number;
    registradosVozYVoto: number;
    porcentajeMeta: number;
    asesores?: { meta: number; registradosVozYVoto: number; porcentajeMeta: number };
    funcionarios?: { meta: number; registradosVozYVoto: number; porcentajeMeta: number };
}

export default function PantallaPublicaPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [metasData, setMetasData] = useState<MetasData | null>(null);
    const [rankingData, setRankingData] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [totalRegistradosEnListas, setTotalRegistradosEnListas] = useState(0);

    // View States
    const [activeLeftView, setActiveLeftView] = useState<'stats' | 'ranking'>('stats');
    const [activeRightView, setActiveRightView] = useState<'presentes' | 'operadores' | 'asesores'>('presentes');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, metasRes, rankingRes] = await Promise.all([
                axios.get("/api/public/estadisticas").catch(() => ({ data: null })),
                axios.get("/api/public/metas").catch(() => ({ data: null })),
                axios.get("/api/public/ranking-funcionarios").catch(() => ({ data: [] }))
            ]);

            if (statsRes.data) setStats(statsRes.data);
            if (rankingRes.data) setRankingData(rankingRes.data);
            if (metasRes.data) {
                setMetasData(metasRes.data);
                const asesores = metasRes.data.asesores?.registradosVozYVoto || 0;
                const funcionarios = metasRes.data.funcionarios?.registradosVozYVoto || 0;
                setTotalRegistradosEnListas(asesores + funcionarios);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Rotation Timers
    useEffect(() => {
        const leftRotation = setInterval(() => {
            setActiveLeftView(current => current === 'stats' ? 'ranking' : 'stats');
        }, 15000);

        const rightRotation = setInterval(() => {
            setActiveRightView(current => {
                if (current === 'presentes') return 'operadores';
                if (current === 'operadores') return 'asesores';
                return 'presentes';
            });
        }, 8000);

        return () => {
            clearInterval(leftRotation);
            clearInterval(rightRotation);
        };
    }, []);

    if (isLoading || !stats) {
        return (
            <div className="h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="h-24 w-24 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6" />
                    <p className="text-amber-500 text-3xl font-black animate-pulse tracking-widest">CARGANDO...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen md:h-screen overflow-y-auto md:overflow-hidden bg-[#0A0F1C] p-4 md:p-6 flex flex-col relative text-slate-100 font-sans selection:bg-amber-500/30">
            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Spotlight Effects */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse-slow mix-blend-screen" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse-slow delay-1000 mix-blend-screen" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_70%)]" />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
            </div>

            {/* HEADER */}
            <header className="relative z-20 flex flex-col md:flex-row items-center justify-between mb-6 px-2 md:px-4 gap-4 md:gap-0">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-center md:text-left">
                    <div className="relative group perspective-1000">
                        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full group-hover:bg-amber-500/30 transition-all duration-500" />
                        <motion.img
                            initial={{ rotateY: 0 }}
                            animate={{ rotateY: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            src="/logo-cooperativa.png"
                            alt="Logo"
                            className="h-20 md:h-24 w-auto relative drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transform-gpu"
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-tight">
                            Asamblea General 2025
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></span>
                            </span>
                            <p className="text-red-400 text-sm font-bold tracking-[0.2em] uppercase text-shadow-sm">Transmisión en Vivo</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 px-8 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden flex items-center gap-6 group hidden md:flex">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="text-center">
                        <div className="text-5xl font-mono font-black text-white tracking-widest tabular-nums leading-none drop-shadow-md">
                            {currentTime.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1 border-t border-white/10 pt-1">Hora Oficial</div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT GRID */}
            <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 perspective-1000 pb-10 md:pb-0">

                {/* LEFT PANEL (Dynamic View: Stats or Ranking) */}
                <div className="lg:col-span-7 flex flex-col min-h-[600px] lg:min-h-0 order-2 lg:order-1">
                    <AnimatePresence mode="wait">
                        {activeLeftView === 'stats' ? (
                            <motion.div
                                key="stats"
                                initial={{ opacity: 0, rotateX: 10, scale: 0.9 }}
                                animate={{ opacity: 1, rotateX: 0, scale: 1 }}
                                exit={{ opacity: 0, rotateX: -10, scale: 0.9 }}
                                transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                                className="h-full bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-4 md:p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between relative overflow-hidden group"
                            >
                                {/* Glass Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

                                <div className="flex items-center gap-6 mb-8 relative z-10">
                                    <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)]">
                                        <Target className="h-8 w-8 md:h-10 md:w-10 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">Progreso de Metas</h2>
                                        <div className="w-20 h-1 bg-emerald-500 rounded-full mt-2 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    </div>
                                </div>

                                {metasData && (
                                    <div className="flex-1 flex flex-col justify-start gap-8 relative z-10">
                                        {/* Global Progress */}
                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden shadow-inner">
                                            <div className="absolute top-0 right-0 p-3 opacity-20">
                                                <Target className="w-32 h-32 text-emerald-400" />
                                            </div>
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 relative z-10 gap-4 md:gap-0">
                                                <span className="text-xl md:text-2xl text-emerald-100 font-bold uppercase tracking-wider">Meta Global</span>
                                                <div className="text-right flex flex-col items-end w-full md:w-auto">
                                                    <span className="text-6xl md:text-7xl font-black text-white tabular-nums tracking-tighter" style={{ textShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
                                                        {metasData.porcentajeMeta.toFixed(1)}%
                                                    </span>
                                                    <span className="text-emerald-300/80 text-lg font-mono font-bold bg-black/30 px-3 py-1 rounded-lg border border-emerald-500/20">
                                                        {metasData.registradosVozYVoto} /{metasData.meta}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-8 bg-black/40 rounded-full overflow-hidden shadow-inner p-1 border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(metasData.porcentajeMeta, 100)}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                                                >
                                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.4),transparent)] animate-[shimmer_2s_infinite]" />
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* "Faltan" Indicator to fill empty space */}
                                        <div className="flex-1 flex items-center justify-center py-4">
                                            <div className="bg-slate-800/50 rounded-3xl p-6 border border-white/5 w-full flex flex-col md:flex-row items-center justify-between relative overflow-hidden group gap-4 md:gap-0">
                                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                                                <div className="relative z-10 text-center md:text-left">
                                                    <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-1">Faltan para el Objetivo</p>
                                                    <p className="text-white/60 text-xs">¡Cada registro cuenta!</p>
                                                </div>
                                                <div className="relative z-10 flex flex-col items-end">
                                                    <span className="text-5xl md:text-6xl font-black text-white tabular-nums drop-shadow-xl" style={{ textShadow: '0 4px 10px rgba(220, 38, 38, 0.5)' }}>
                                                        {(metasData.meta - metasData.registradosVozYVoto).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Breakdowns */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-auto">
                                            {/* Asesores Card */}
                                            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-blue-500/20 relative group overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                                                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                                                <div className="relative z-10">
                                                    <h3 className="text-xl font-bold text-blue-200 mb-4 uppercase tracking-wider">Asesores</h3>
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-5xl font-black text-white" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                                                            {metasData.asesores?.registradosVozYVoto || 0}
                                                        </span>
                                                        <div className="text-right">
                                                            <div className="text-xs text-blue-400 uppercase font-bold">Meta</div>
                                                            <div className="text-xl font-mono text-blue-200">{metasData.asesores?.meta || 0}</div>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 bg-slate-900/80 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(metasData.asesores?.porcentajeMeta || 0, 100)}%` }}
                                                            className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Operadores Card */}
                                            <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-emerald-500/20 relative group overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                                                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                                                <div className="relative z-10">
                                                    <h3 className="text-xl font-bold text-emerald-200 mb-4 uppercase tracking-wider">Operadores</h3>
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-5xl font-black text-white" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                                                            {metasData.funcionarios?.registradosVozYVoto || 0}
                                                        </span>
                                                        <div className="text-right">
                                                            <div className="text-xs text-emerald-400 uppercase font-bold">Meta</div>
                                                            <div className="text-xl font-mono text-emerald-200">{metasData.funcionarios?.meta || 0}</div>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 bg-slate-900/80 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(metasData.funcionarios?.porcentajeMeta || 0, 100)}%` }}
                                                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="ranking"
                                initial={{ opacity: 0, rotateY: 90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                exit={{ opacity: 0, rotateY: -90 }}
                                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                                className="h-full bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] p-4 md:p-8 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.1),transparent_60%)] pointer-events-none" />

                                <div className="flex items-center gap-6 mb-6 relative z-10">
                                    <div className="p-4 bg-gradient-to-b from-amber-300 to-amber-600 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-amber-200">
                                        <Trophy className="h-8 w-8 md:h-10 md:w-10 text-white drop-shadow-md" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-amber-200 drop-shadow-md tracking-tight">Top Operadores</h2>
                                        <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full mt-2 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col relative z-10">
                                    {/* PODIUM (Top 3) */}
                                    <div className="flex items-end justify-center gap-2 md:gap-4 mb-8 h-[200px] md:h-[240px] perspective-500">
                                        {/* 2nd Place */}
                                        {rankingData[1] && (
                                            <motion.div
                                                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                                                className="flex flex-col items-center w-1/3 relative group"
                                            >
                                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] border-slate-300 bg-slate-800 flex items-center justify-center -mb-6 md:-mb-8 z-20 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                                                    <span className="text-lg md:text-2xl font-black text-slate-300">2</span>
                                                </div>
                                                <div className="bg-gradient-to-b from-slate-700/80 to-slate-800/90 w-full rounded-t-2xl pt-8 md:pt-10 pb-4 px-2 md:px-3 border-t border-slate-500/30 text-center h-[140px] md:h-[160px] flex flex-col justify-end backdrop-blur-sm shadow-xl">
                                                    <p className="font-bold text-slate-100 truncate w-full text-xs md:text-base mb-1">{rankingData[1].nombre}</p>
                                                    <p className="text-[10px] md:text-xs text-slate-400 truncate w-full uppercase tracking-wider mb-2">{rankingData[1].sucursal}</p>
                                                    <div className="bg-slate-900/50 rounded-lg py-1 px-2 border border-slate-600/30 mx-auto">
                                                        <span className="font-black text-emerald-400 text-lg md:text-xl">{rankingData[1].registrados}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                        {/* 1st Place */}
                                        {rankingData[0] && (
                                            <motion.div
                                                initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                                className="flex flex-col items-center w-1/3 relative z-30 transform-gpu"
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/30 rounded-full blur-[50px] animate-pulse" />
                                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-[4px] border-[#FFD700] bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center -mb-8 md:-mb-10 z-20 shadow-[0_0_30px_rgba(251,191,36,0.6)] relative">
                                                    <Star className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md animate-pulse" fill="white" />
                                                </div>
                                                <div className="bg-gradient-to-b from-amber-600/20 to-slate-900/80 w-full rounded-t-2xl pt-12 md:pt-14 pb-6 px-2 md:px-3 border-t border-amber-500/50 text-center h-[180px] md:h-[210px] flex flex-col justify-end backdrop-blur-md shadow-2xl relative overflow-hidden group">
                                                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                                                    <p className="font-black text-sm md:text-xl text-white truncate w-full mb-1 drop-shadow-md">{rankingData[0].nombre}</p>
                                                    <p className="text-[10px] md:text-xs text-amber-200/80 truncate w-full uppercase tracking-wider mb-3">{rankingData[0].sucursal}</p>
                                                    <div className="bg-amber-500/20 rounded-xl py-2 px-4 border border-amber-500/40 mx-auto shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                                        <span className="font-black text-amber-400 text-2xl md:text-3xl drop-shadow-sm">{rankingData[0].registrados}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                        {/* 3rd Place */}
                                        {rankingData[2] && (
                                            <motion.div
                                                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                                                className="flex flex-col items-center w-1/3 relative"
                                            >
                                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] border-amber-800 bg-slate-800 flex items-center justify-center -mb-6 md:-mb-8 z-20 shadow-xl">
                                                    <span className="text-lg md:text-2xl font-black text-amber-700">3</span>
                                                </div>
                                                <div className="bg-gradient-to-b from-amber-900/30 to-slate-800/90 w-full rounded-t-2xl pt-8 md:pt-10 pb-4 px-2 md:px-3 border-t border-amber-800/30 text-center h-[120px] md:h-[140px] flex flex-col justify-end backdrop-blur-sm shadow-xl">
                                                    <p className="font-bold text-slate-200 truncate w-full text-xs md:text-base mb-1">{rankingData[2].nombre}</p>
                                                    <p className="text-[10px] md:text-xs text-slate-500 truncate w-full uppercase tracking-wider mb-2">{rankingData[2].sucursal}</p>
                                                    <div className="bg-slate-900/50 rounded-lg py-1 px-2 border border-slate-600/30 mx-auto">
                                                        <span className="font-black text-emerald-400 text-lg md:text-xl">{rankingData[2].registrados}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* LIST (4-7) */}
                                    <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                                        {rankingData.slice(3, 8).map((user, index) => (
                                            <motion.div
                                                key={`user-${user.username || index}`}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.4 + (index * 0.1) }}
                                                className="flex items-center gap-4 bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-sm border border-slate-700 shadow-inner">
                                                    {index + 4}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-200 truncate group-hover:text-amber-200 transition-colors">{user.nombre}</p>
                                                    <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user.sucursal}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-mono font-black text-emerald-400 text-xl drop-shadow-sm">{user.registrados}</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* RIGHT PANEL (Rotating Stats) */}
                <div className="lg:col-span-5 flex flex-col gap-6 min-h-[500px] lg:min-h-0 order-1 lg:order-2">
                    <AnimatePresence mode="wait">
                        {activeRightView === 'presentes' && (
                            <motion.div
                                key="presentes"
                                initial={{ opacity: 0, rotateX: -20 }}
                                animate={{ opacity: 1, rotateX: 0 }}
                                exit={{ opacity: 0, rotateX: 20 }}
                                transition={{ duration: 0.6 }}
                                className="h-full bg-gradient-to-br from-indigo-700 to-blue-900 rounded-[2.5rem] p-4 md:p-8 flex flex-col justify-center items-center shadow-[0_20px_60px_rgba(59,130,246,0.3)] relative overflow-hidden group perspective-1000 border border-blue-500/20"
                            >
                                <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[80px] animate-pulse-slow" />
                                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent" />

                                <div className="p-4 md:p-6 bg-white/10 backdrop-blur-xl rounded-full mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] ring-1 ring-white/20 relative z-10">
                                    <Users className="h-16 w-16 md:h-20 md:w-20 text-white drop-shadow-lg" />
                                </div>
                                <h2 className="text-7xl md:text-[11rem] leading-none font-black text-white drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] tracking-tighter mb-4 tabular-nums z-10 scale-y-110">
                                    {stats.presentes}
                                </h2>
                                <p className="text-2xl md:text-3xl text-blue-100 font-bold tracking-tight mb-8 z-10 uppercase text-center">Presentes en Sala</p>
                                <div className="px-8 py-3 bg-black/30 backdrop-blur-md rounded-2xl text-blue-200 font-medium border border-blue-400/30 z-10 flex items-center gap-3">
                                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                                    <strong className="text-white text-xl md:text-2xl">{stats.presentesVyV}</strong> con Voz y Voto
                                </div>
                            </motion.div>
                        )}

                        {activeRightView === 'operadores' && (
                            <motion.div
                                key="operadores"
                                initial={{ opacity: 0, rotateX: -20 }}
                                animate={{ opacity: 1, rotateX: 0 }}
                                exit={{ opacity: 0, rotateX: 20 }}
                                transition={{ duration: 0.6 }}
                                className="h-full bg-gradient-to-br from-emerald-700 to-teal-900 rounded-[2.5rem] p-4 md:p-8 flex flex-col justify-center items-center shadow-[0_20px_60px_rgba(16,185,129,0.3)] relative overflow-hidden group border border-emerald-500/20"
                            >
                                <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-[80px]" />
                                <div className="p-4 md:p-6 bg-white/10 backdrop-blur-xl rounded-full mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] ring-1 ring-white/20 relative z-10">
                                    <Briefcase className="h-16 w-16 md:h-20 md:w-20 text-white drop-shadow-lg" />
                                </div>
                                <h2 className="text-7xl md:text-[10rem] leading-none font-black text-white drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] tracking-tighter mb-4 tabular-nums z-10 scale-y-110">
                                    {metasData?.funcionarios?.registradosVozYVoto || 0}
                                </h2>
                                <p className="text-2xl md:text-3xl text-emerald-100 font-bold tracking-tight mb-2 z-10 uppercase text-center">Operadores</p>
                                <div className="px-6 py-2 bg-emerald-900/40 rounded-xl border border-emerald-500/30 z-10 mt-4">
                                    <p className="text-emerald-200 text-lg font-mono">Meta: <span className="text-white font-bold">{metasData?.funcionarios?.meta || 0}</span></p>
                                </div>
                            </motion.div>
                        )}

                        {activeRightView === 'asesores' && (
                            <motion.div
                                key="asesores"
                                initial={{ opacity: 0, rotateX: -20 }}
                                animate={{ opacity: 1, rotateX: 0 }}
                                exit={{ opacity: 0, rotateX: 20 }}
                                transition={{ duration: 0.6 }}
                                className="h-full bg-gradient-to-br from-blue-900 to-slate-900 rounded-[2.5rem] p-4 md:p-8 flex flex-col justify-center items-center shadow-[0_20px_60px_rgba(30,58,138,0.4)] relative overflow-hidden group border border-blue-500/20"
                            >
                                <div className="absolute top-0 left-0 w-full h-full bg-[url('/circuit.svg')] opacity-10" />
                                <div className="p-4 md:p-6 bg-white/10 backdrop-blur-xl rounded-full mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] ring-1 ring-white/20 relative z-10">
                                    <UserCheck className="h-16 w-16 md:h-20 md:w-20 text-white drop-shadow-lg" />
                                </div>
                                <h2 className="text-7xl md:text-[10rem] leading-none font-black text-white drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] tracking-tighter mb-4 tabular-nums z-10 scale-y-110">
                                    {metasData?.asesores?.registradosVozYVoto || 0}
                                </h2>
                                <p className="text-2xl md:text-3xl text-blue-100 font-bold tracking-tight mb-2 z-10 uppercase text-center">Asesores</p>
                                <div className="px-6 py-2 bg-blue-900/40 rounded-xl border border-blue-500/30 z-10 mt-4">
                                    <p className="text-blue-200 text-lg font-mono">Meta: <span className="text-white font-bold">{metasData?.asesores?.meta || 0}</span></p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
