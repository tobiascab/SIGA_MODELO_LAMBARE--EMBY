"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Clock, Users, UserCheck, Target, TrendingUp, Activity,
    Bell, Zap, MapPin, RefreshCw, CheckCircle2, Award, Crown, Medal,
    Building2, BarChart3, PieChart as PieIcon, AlertTriangle, Shield, MessageCircle, Phone
} from "lucide-react";
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
    BarChart, Bar, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import axios from "axios";

interface Asistencia {
    id: number;
    socioNombre: string;
    socioNumero: string;
    vozVoto: boolean;
    fechaHora: string;
    sucursal?: string;
    // Campos extendidos
    telefono?: string;
    email?: string;
    direccion?: string;
    barrio?: string;
    ciudad?: string;
    profesion?: string;
    ocupacion?: string;
    edad?: string;
}

interface Stats {
    totalPadron: number;
    conVozYVoto: number;
    soloVoz: number;
    presentes: number;
    presentesVyV: number;
}

interface Operador {
    id: number;
    nombre: string;
    username: string;
    rol: string;
    totalRegistros: number;
    vozYVoto: number;
    soloVoz: number;
}

interface SucursalStats {
    sucursalId: number;
    sucursal: string;
    padron: number;
    presentes: number;
    vozVoto: number;
    soloVoz: number;
}

// Tooltip personalizado premium
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-2xl px-5 py-4 rounded-2xl shadow-2xl border border-white/20">
                <p className="font-bold text-slate-800 mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm font-semibold" style={{ color: entry.color || '#374151' }}>
                        {entry.name}: <span className="font-black">{entry.value?.toLocaleString()}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Interface para registros por sucursal (desde asistencias, NO padrón)
interface RegistrosPorSucursal {
    sucursal: string;
    totalRegistros: number;
    conVozYVoto: number;
    soloVoz: number;
    soloVoz: number;
}

// Helper para WhatsApp
const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return undefined;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return undefined;
    return `https://wa.me/${cleanPhone}`;
};

export default function DashboardEnVivoPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [ultimasLlegadas, setUltimasLlegadas] = useState<Asistencia[]>([]);
    const [evolucionHora, setEvolucionHora] = useState<any[]>([]);
    const [rankingOperadores, setRankingOperadores] = useState<Operador[]>([]);
    const [sucursalesStats, setSucursalesStats] = useState<SucursalStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [quorumReached, setQuorumReached] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    // REGISTROS (desde asistencias, NO del padrón)
    const [registrosTotales, setRegistrosTotales] = useState(0);
    const [registrosVyV, setRegistrosVyV] = useState(0);
    const [registrosSoloVoz, setRegistrosSoloVoz] = useState(0);
    const [registrosPorSucursal, setRegistrosPorSucursal] = useState<RegistrosPorSucursal[]>([]);

    // METAS DATA (Asesores vs Operadores)
    const [metasData, setMetasData] = useState<{
        meta: number;
        registradosVozYVoto: number;
        porcentajeMeta: number;
        asesores?: { meta: number; registradosVozYVoto: number; porcentajeMeta: number };
        funcionarios?: { meta: number; registradosVozYVoto: number; porcentajeMeta: number };
    } | null>(null);

    // Verificar permisos de acceso-redirigir USUARIO_SOCIO a su dashboard
    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const user = JSON.parse(userData);
            if (user.rol === "USUARIO_SOCIO") {
                setAccessDenied(true);
                window.location.href = "/dashboard";
            }
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [statsRes, asistenciasRes, rankingRes, sucursalesRes, metasRes] = await Promise.all([
                axios.get("/api/socios/estadisticas", { headers }).catch(e => { console.error("Error stats", e); return { data: null }; }),
                axios.get("/api/asistencia/hoy", { headers }).catch(e => { console.error("Error asistencias", e); return { data: [] }; }),
                axios.get("/api/asistencia/ranking-operadores", { headers }).catch(e => { console.error("Error ranking", e); return { data: [] }; }),
                axios.get("/api/socios/estadisticas/por-sucursal", { headers }).catch(e => { console.error("Error sucursales", e); return { data: [] }; }),
                axios.get("/api/dashboard/metas", { headers }).catch(() => ({ data: null })),
            ]);

            if (statsRes.data) {
                setStats(statsRes.data);
            } else {
                // Fallback to avoid infinite loading if stats fail
                setStats({
                    totalPadron: 0,
                    conVozYVoto: 0,
                    soloVoz: 0,
                    presentes: 0,
                    presentesVyV: 0
                });
            }

            setRankingOperadores(rankingRes.data || []);
            setSucursalesStats(sucursalesRes.data || []);
            if (metasRes.data) setMetasData(metasRes.data);

            const asistencias = asistenciasRes.data || [];
            const ordenadas = [...asistencias].sort((a: Asistencia, b: Asistencia) =>
                new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
            );
            setUltimasLlegadas(ordenadas.slice(0, 8));

            const ahora = new Date();
            const horaInicio = 7;
            const horaActual = ahora.getHours();

            const evolucion = [];
            for (let h = horaInicio; h <= Math.min(horaActual, 20); h++) {
                const asistenciasHastaHora = asistencias.filter((a: Asistencia) => {
                    const fecha = new Date(a.fechaHora);
                    return fecha.getHours() <= h;
                }).length;
                evolucion.push({ hora: `${h}:00`, presentes: asistenciasHastaHora });
            }
            setEvolucionHora(evolucion);

            // =====================================================
            // CÁLCULO DE REGISTROS (desde asistencias, NO padrón)
            // =====================================================
            const totalRegs = asistencias.length;
            const regsVyV = asistencias.filter((a: Asistencia) => a.vozVoto === true).length;
            const regsSoloVoz = asistencias.filter((a: Asistencia) => a.vozVoto === false).length;

            setRegistrosTotales(totalRegs);
            setRegistrosVyV(regsVyV);
            setRegistrosSoloVoz(regsSoloVoz);

            // Calcular registros agrupados por sucursal (desde asistencias)
            const sucursalMap: { [key: string]: RegistrosPorSucursal } = {};
            asistencias.forEach((a: Asistencia) => {
                const suc = a.sucursal || 'Sin Sucursal';
                if (!sucursalMap[suc]) {
                    sucursalMap[suc] = { sucursal: suc, totalRegistros: 0, conVozYVoto: 0, soloVoz: 0 };
                }
                sucursalMap[suc].totalRegistros++;
                if (a.vozVoto) {
                    sucursalMap[suc].conVozYVoto++;
                } else {
                    sucursalMap[suc].soloVoz++;
                }
            });
            const regsPorSuc = Object.values(sucursalMap).sort((a, b) => b.totalRegistros - a.totalRegistros);
            setRegistrosPorSucursal(regsPorSuc);
            // =====================================================

            const quorum = Math.floor(statsRes.data.totalPadron / 2) + 1;
            if (statsRes.data.presentes >= quorum && !quorumReached) {
                setQuorumReached(true);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [quorumReached]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (isLoading || !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full blur-xl opacity-30 animate-pulse" />
                        <RefreshCw className="relative h-16 w-16 text-teal-500 animate-spin mx-auto mb-4" />
                    </div>
                    <p className="text-slate-500 font-medium">Cargando datos en tiempo real...</p>
                </div>
            </div>
        );
    }

    const quorumNecesario = Math.floor(stats.totalPadron / 2) + 1;
    const faltanParaQuorum = Math.max(0, quorumNecesario - stats.presentes);
    const porcentajeQuorum = Math.min((stats.presentes / quorumNecesario) * 100, 100);
    const porcentajeAsistencia = stats.totalPadron > 0 ? (stats.presentes / stats.totalPadron) * 100 : 0;
    const presentesSoloVoz = stats.presentes - stats.presentesVyV;

    const distribucionPresentes = [
        { name: 'Con V&V', value: stats.presentesVyV, color: '#10b981' },
        { name: 'Solo Voz', value: presentesSoloVoz, color: '#f59e0b' },
    ];

    const distribucionPadron = [
        { name: 'Voz y Voto', value: stats.conVozYVoto, color: '#0d9488' },
        { name: 'Solo Voz', value: stats.soloVoz, color: '#f59e0b' },
    ];

    const topSucursales = [...sucursalesStats]
        .sort((a, b) => b.padron - a.padron)
        .slice(0, 6)
        .map(s => ({
            name: s.sucursal?.substring(0, 12) || 'N/A',
            padron: s.padron,
            vyv: s.vozVoto,
            soloVoz: s.soloVoz || (s.presentes - s.vozVoto),
            presentes: s.presentes || 0,
        }));

    // Estilos de cards premium
    const cardStyle = "bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-teal-100/50 transition-all duration-500";
    const darkCardStyle = "bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/30 p-3 md:p-4 lg:p-8">
            {/* Elementos decorativos de fondo */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-200/30 to-emerald-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                {/* Alerta de Quórum Alcanzado */}
                <AnimatePresence>
                    {quorumReached && (
                        <motion.div
                            initial={{ opacity: 0, y: -50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -50, scale: 0.9 }}
                            className="fixed top-2 left-2 right-2 sm:top-6 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-white px-4 py-3 sm:px-10 sm:py-5 rounded-2xl sm:rounded-3xl shadow-2xl shadow-emerald-500/30 flex items-center gap-2 sm:gap-4 border border-white/20"
                        >
                            <CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7" />
                            <span className="font-bold text-sm sm:text-xl tracking-tight">¡QUÓRUM ALCANZADO!</span>
                            <Zap className="h-5 w-5 sm:h-7 sm:w-7 animate-pulse" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header Premium */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 sm:mb-8"
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-6">
                        <div className="flex items-center gap-3 sm:gap-5">
                            <div className="p-2 sm:p-4 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl sm:rounded-2xl shadow-xl shadow-teal-500/30">
                                <Activity className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-slate-800 via-slate-700 to-teal-500 bg-clip-text text-transparent tracking-tight">
                                    Centro de Monitoreo
                                </h1>
                                <p className="text-slate-500 text-sm flex items-center gap-2 mt-1 font-medium">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Actualización en tiempo real
                                </p>
                            </div>
                        </div>

                        {/* Reloj Premium */}
                        <div className={`${cardStyle} px-4 md:px-8 py-3 md:py-4`}>
                            <div className="text-2xl md:text-4xl lg:text-5xl font-mono font-black text-slate-800 tracking-wider">
                                {currentTime.toLocaleTimeString('es-PY', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false
                                })}
                            </div>
                            <p className="text-center text-slate-400 text-sm mt-1 font-medium capitalize">
                                {currentTime.toLocaleDateString('es-PY', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </p>
                        </div>
                    </div>
                </motion.header>

                {/* ========== MEGA PANEL: PROGRESO DE METAS (Para pantalla grande) ========== */}
                {metasData && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-4 sm:mb-8 relative"
                    >
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 md:p-8 text-white shadow-2xl shadow-slate-900/50 border border-slate-700/50 relative overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                {/* Header */}
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-8 gap-3 sm:gap-4">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="p-2 sm:p-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl sm:rounded-2xl shadow-xl shadow-emerald-500/30">
                                            <Target className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight">Progreso de Metas</h2>
                                            <p className="text-slate-400 text-xs hidden sm:block">Registros de Voz y Voto hacia la meta global</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/5 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-6 sm:py-3 border border-white/10">
                                        <div className="text-right">
                                            <p className="text-2xl md:text-4xl lg:text-5xl font-black text-emerald-400">{metasData.registradosVozYVoto}</p>
                                            <p className="text-xs text-slate-400 uppercase tracking-widest">de {metasData.meta} objetivo</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Progress Bar */}
                                <div className="mb-4 sm:mb-8">
                                    <div className="flex justify-between mb-2 sm:mb-3">
                                        <span className="text-xs sm:text-sm font-bold text-slate-300">Meta Global</span>
                                        <span className="text-lg sm:text-2xl font-black text-emerald-400">{metasData.porcentajeMeta.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-4 sm:h-6 bg-slate-700/50 rounded-full overflow-hidden relative shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(metasData.porcentajeMeta, 100)}%` }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full relative"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Segmented Progress: Asesores vs Operadores */}
                                {(metasData.asesores || metasData.funcionarios) && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {metasData.asesores && (
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-2xl p-6 border border-blue-500/20"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/30 rounded-xl">
                                                            <Users className="h-5 w-5 text-blue-300" />
                                                        </div>
                                                        <span className="font-bold text-blue-200">Asesores de Crédito</span>
                                                    </div>
                                                    <span className="text-2xl font-black text-blue-400">{metasData.asesores.porcentajeMeta.toFixed(1)}%</span>
                                                </div>
                                                <div className="flex items-baseline gap-2 mb-3">
                                                    <span className="text-3xl font-black text-white">{metasData.asesores.registradosVozYVoto}</span>
                                                    <span className="text-sm text-slate-400">de {metasData.asesores.meta}</span>
                                                </div>
                                                <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(metasData.asesores.porcentajeMeta, 100)}%` }}
                                                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                                                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}

                                        {metasData.funcionarios && (
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 border border-emerald-500/20"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-500/30 rounded-xl">
                                                            <Award className="h-5 w-5 text-emerald-300" />
                                                        </div>
                                                        <span className="font-bold text-emerald-200">Operadores</span>
                                                    </div>
                                                    <span className="text-2xl font-black text-emerald-400">{metasData.funcionarios.porcentajeMeta.toFixed(1)}%</span>
                                                </div>
                                                <div className="flex items-baseline gap-2 mb-3">
                                                    <span className="text-3xl font-black text-white">{metasData.funcionarios.registradosVozYVoto}</span>
                                                    <span className="text-sm text-slate-400">de {metasData.funcionarios.meta}</span>
                                                </div>
                                                <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(metasData.funcionarios.porcentajeMeta, 100)}%` }}
                                                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* KPIs Premium Grid-6 Tarjetas */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                    {/* 1. Total Padrón */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ y: -8, scale: 1.03 }}
                        className="bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-white relative overflow-hidden shadow-xl shadow-violet-500/30 border border-white/10 cursor-pointer"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                        <div className="relative">
                            <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl w-fit mb-3">
                                <Users className="h-5 w-5" />
                            </div>
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">{stats.totalPadron.toLocaleString()}</div>
                            <p className="text-violet-100 text-xs font-bold mt-1 uppercase tracking-wider">Total Padrón</p>
                        </div>
                    </motion.div>

                    {/* 2. Habilitados Voz y Voto (Padrón) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        whileHover={{ y: -8, scale: 1.03 }}
                        className="bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-500 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-white relative overflow-hidden shadow-xl shadow-emerald-500/30 border border-white/10 cursor-pointer"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                        <div className="relative">
                            <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl w-fit mb-3">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">{stats.conVozYVoto.toLocaleString()}</div>
                            <p className="text-emerald-100 text-xs font-bold mt-1 uppercase tracking-wider">Con Voz y Voto</p>
                        </div>
                    </motion.div>

                    {/* 3. Solo Voz (Padrón) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ y: -8, scale: 1.03 }}
                        className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-white relative overflow-hidden shadow-xl shadow-amber-500/30 border border-white/10 cursor-pointer"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                        <div className="relative">
                            <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl w-fit mb-3">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">{stats.soloVoz.toLocaleString()}</div>
                            <p className="text-amber-100 text-xs font-bold mt-1 uppercase tracking-wider">Solo Voz</p>
                        </div>
                    </motion.div>

                    {/* 4. Presentes Ahora */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        whileHover={{ y: -8, scale: 1.03 }}
                        className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-white relative overflow-hidden shadow-xl shadow-blue-500/30 border border-white/10 cursor-pointer"
                    >
                        <span className="absolute top-3 right-3 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <div className="relative">
                            <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl w-fit mb-3">
                                <UserCheck className="h-5 w-5" />
                            </div>
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">{stats.presentes}</div>
                            <p className="text-blue-100 text-xs font-bold mt-1 uppercase tracking-wider">Presentes Ahora</p>
                        </div>
                    </motion.div>

                    {/* 5. Presentes con Voz y Voto */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ y: -8, scale: 1.03 }}
                        className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-white relative overflow-hidden shadow-xl shadow-green-500/30 border border-white/10 cursor-pointer"
                    >
                        <span className="absolute top-3 right-3 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <div className="relative">
                            <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl w-fit mb-3">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">{stats.presentesVyV}</div>
                            <p className="text-green-100 text-xs font-bold mt-1 uppercase tracking-wider">Presentes V&V</p>
                        </div>
                    </motion.div>

                    {/* 6. Presentes Solo Voz */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        whileHover={{ y: -8, scale: 1.03 }}
                        className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-white relative overflow-hidden shadow-xl shadow-orange-500/30 border border-white/10 cursor-pointer"
                    >
                        <span className="absolute top-3 right-3 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <div className="relative">
                            <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl w-fit mb-3">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">{presentesSoloVoz}</div>
                            <p className="text-orange-100 text-xs font-bold mt-1 uppercase tracking-wider">Presentes Solo Voz</p>
                        </div>
                    </motion.div>
                </div>

                {/* Grid de Métricas de Asamblea (Participación y Mayoría) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                    {/* Nivel de Participación */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`${cardStyle} p-6 relative overflow-hidden`}
                    >
                        <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-300/20 blur-2xl rounded-bl-full pointer-events-none" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-200">
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Nivel de Participación</h2>
                                    <p className="text-xs text-slate-400">Socios presentes sobre total padrón</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-black text-slate-800">{porcentajeAsistencia.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${porcentajeAsistencia}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={`h-full rounded-full relative overflow-hidden ${porcentajeAsistencia >= 50
                                    ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-500'
                                    : 'bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-500'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                            </motion.div>
                        </div>
                        <div className="mt-2 text-right">
                            <p className="text-xs font-bold text-slate-500">{stats.presentes} de {stats.totalPadron} socios</p>
                        </div>
                    </motion.div>

                    {/* Umbral de Aprobación (Mayoría Simple) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-slate-800/30 border border-slate-700/50"
                    >
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
                                    <Target className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Umbral de Aprobación</h2>
                                    <p className="text-xs text-slate-400">Mayoría Simple (50% + 1 de Votos Presentes)</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-end justify-between mt-4">
                            <div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl lg:text-5xl font-black text-emerald-400 tracking-tight">
                                        {(Math.floor(stats.presentesVyV / 2) + 1).toLocaleString()}
                                    </span>
                                    <span className="text-lg font-bold text-slate-300">votos</span>
                                </div>
                                <p className="text-sm text-emerald-100/80 font-medium mt-1">
                                    Necesarios para aprobar mociones
                                </p>
                            </div>
                            <div className="text-right pb-1">
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Base de Cálculo</div>
                                <div className="text-xl font-bold text-white">{stats.presentesVyV}</div>
                                <div className="text-[10px] text-slate-400">Presentes con V&V</div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Grid de Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`lg:col-span-2 ${cardStyle} p-6`}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Evolución de Asistencia por Hora</h2>
                        </div>
                        {evolucionHora.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={evolucionHora}>
                                    <defs>
                                        <linearGradient id="colorPresentes" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.6} />
                                            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="hora" stroke="#64748b" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="presentes" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorPresentes)" name="Presentes" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-slate-400">
                                <p>Sin datos de evolución</p>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${cardStyle} p-6`}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-200">
                                <PieIcon className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Presentes por Estado</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={distribucionPresentes} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">
                                    {distribucionPresentes.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={3} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-3">
                            {distribucionPresentes.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs text-slate-500 font-medium">{item.name}: <span className="font-bold text-slate-700">{item.value}</span></span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Segunda fila */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`lg:col-span-2 ${cardStyle} p-6`}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
                                <BarChart3 className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Top Sucursales por Padrón</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={topSucursales} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                    <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#059669" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="padron" fill="url(#barGradient1)" name="Padrón" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="vyv" fill="url(#barGradient2)" name="V&V" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${cardStyle} p-6`}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-200">
                                <PieIcon className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Habilitación General</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={distribucionPadron} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">
                                    {distribucionPadron.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={3} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-3">
                            {distribucionPadron.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs text-slate-500 font-medium">{item.name}: <span className="font-bold text-slate-700">{item.value.toLocaleString()}</span></span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* =============================================================== */}
                {/* REGISTROS POR USUARIOS (desde asistencias, NO del padrón)       */}
                {/* =============================================================== */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${cardStyle} p-6 mb-8`}
                >
                    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-200">
                                <UserCheck className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800">Registros por Usuarios</h2>
                                <p className="text-xs text-slate-500">Check-ins cargados por operadores/directivos • NO es el padrón</p>
                            </div>
                        </div>
                        {/* Totales premium */}
                        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                            <div className="bg-emerald-50 rounded-2xl px-4 py-2 text-center border border-emerald-100 flex-1 md:flex-none min-w-[100px]">
                                <div className="text-xl font-black text-emerald-500">{registrosVyV}</div>
                                <div className="text-[10px] font-bold text-emerald-400 uppercase">Voz y Voto</div>
                            </div>
                            <div className="bg-amber-50 rounded-2xl px-4 py-2 text-center border border-amber-100 flex-1 md:flex-none min-w-[100px]">
                                <div className="text-xl font-black text-amber-600">{registrosSoloVoz}</div>
                                <div className="text-[10px] font-bold text-amber-400 uppercase">Solo Voz</div>
                            </div>
                            <div className="bg-blue-50 rounded-2xl px-4 py-2 text-center border border-blue-100 flex-1 md:flex-none min-w-[100px]">
                                <div className="text-xl font-black text-blue-600">{registrosTotales}</div>
                                <div className="text-[10px] font-bold text-blue-400 uppercase">Total Reg.</div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Registros por Sucursal - Desktop */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                    <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sucursal</th>
                                    <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Total Registros</th>
                                    <th className="py-4 px-4 text-xs font-bold text-emerald-500 uppercase tracking-wider text-center">Con Voz y Voto</th>
                                    <th className="py-4 px-4 text-xs font-bold text-amber-600 uppercase tracking-wider text-center">Solo Voz</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {registrosPorSucursal.length > 0 ? (
                                    registrosPorSucursal.slice(0, 10).map((reg, idx) => (
                                        <motion.tr
                                            key={reg.sucursal}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-bold text-sm text-slate-700">{reg.sucursal}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm">
                                                    {reg.totalRegistros}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-sm">
                                                    <Shield className="h-3 w-3" />
                                                    {reg.conVozYVoto}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-sm">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {reg.soloVoz}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center text-slate-400">
                                            <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">Sin registros cargados hoy</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {registrosPorSucursal.length > 0 && (
                                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-700">
                                    <tr>
                                        <td className="py-3 px-4 text-sm">TOTAL REGISTROS</td>
                                        <td className="py-3 px-4 text-center text-indigo-600">{registrosTotales}</td>
                                        <td className="py-3 px-4 text-center text-emerald-500">{registrosVyV}</td>
                                        <td className="py-3 px-4 text-center text-amber-600">{registrosSoloVoz}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Tarjetas de Registros por Sucursal - Mobile */}
                    <div className="md:hidden space-y-3">
                        {registrosPorSucursal.length > 0 ? (
                            registrosPorSucursal.slice(0, 10).map((reg, idx) => (
                                <motion.div
                                    key={reg.sucursal}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="bg-slate-50 rounded-2xl p-4 border border-slate-100"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">
                                                {idx + 1}
                                            </div>
                                            <span className="font-bold text-sm text-slate-700">{reg.sucursal}</span>
                                        </div>
                                        <span className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold text-sm">
                                            {reg.totalRegistros}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-around pt-3 border-t border-slate-200">
                                        <div className="text-center">
                                            <span className="flex items-center justify-center gap-1 text-emerald-500 font-bold text-lg">
                                                <Shield className="h-4 w-4" />
                                                {reg.conVozYVoto}
                                            </span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">V&V</span>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200" />
                                        <div className="text-center">
                                            <span className="flex items-center justify-center gap-1 text-amber-600 font-bold text-lg">
                                                <AlertTriangle className="h-4 w-4" />
                                                {reg.soloVoz}
                                            </span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">Solo Voz</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-10 text-center text-slate-400">
                                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Sin registros cargados hoy</p>
                            </div>
                        )}
                        {registrosPorSucursal.length > 0 && (
                            <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 mt-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-slate-700">TOTAL</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-emerald-500 font-bold">{registrosVyV} V&V</span>
                                        <span className="text-amber-600 font-bold">{registrosSoloVoz} SV</span>
                                        <span className="text-indigo-600 font-black">{registrosTotales}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Nota de aclaración */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span>Datos mostrados en tiempo real (10s refresh). <strong className="text-slate-500">No representan el padrón oficial.</strong></span>
                        </p>
                    </div>
                </motion.div>

                {/* Tercera fila: Llegadas + Ranking */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${cardStyle} p-6`}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-200">
                                <Bell className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Últimas Llegadas</h2>
                        </div>
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                            {ultimasLlegadas.length > 0 ? (
                                ultimasLlegadas.map((llegada, index) => (
                                    <motion.div
                                        key={llegada.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:shadow-md transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0 pr-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="font-black text-slate-800 text-sm truncate uppercase">
                                                        {llegada.socioNombre || 'Sin nombre'}
                                                    </p>
                                                    <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                                        {new Date(llegada.fechaHora).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                        #{llegada.socioNumero}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${llegada.vozVoto ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {llegada.vozVoto ? 'Voz y Voto' : 'Solo Voz'}
                                                    </span>
                                                </div>

                                                {/* Contacto y WhatsApp */}
                                                {(llegada.telefono || llegada.barrio) && (
                                                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                                                        {llegada.telefono && getWhatsAppLink(llegada.telefono) && (
                                                            <a
                                                                href={getWhatsAppLink(llegada.telefono)!}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-md transition-colors shadow-sm group"
                                                            >
                                                                <MessageCircle className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                                                <span className="text-[10px] font-bold">WhatsApp</span>
                                                            </a>
                                                        )}
                                                        {llegada.barrio && (
                                                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                                {llegada.barrio}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-slate-400">
                                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Esperando registros...</p>
                                </div>
                            )}
                        </div>
                        {ultimasLlegadas.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Actualizando en vivo
                                </p>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`lg:col-span-2 ${cardStyle} p-6`}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-200">
                                <Award className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Ranking de Operadores</h2>
                        </div>
                        {rankingOperadores.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {rankingOperadores.slice(0, 6).map((operador, index) => (
                                    <motion.div
                                        key={operador.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ y: -3, scale: 1.02 }}
                                        className={`relative rounded-2xl p-4 border transition-all duration-300 ${index === 0
                                            ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-lg shadow-amber-100'
                                            : index === 1
                                                ? 'bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200 shadow-lg shadow-slate-100'
                                                : index === 2
                                                    ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg shadow-orange-100'
                                                    : 'bg-slate-50 border-slate-100'
                                            }`}
                                    >
                                        {index < 3 && (
                                            <div className="absolute -top-2 -right-2">
                                                <div className={`p-1.5 rounded-full shadow-lg ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-200' :
                                                    index === 1 ? 'bg-gradient-to-br from-slate-400 to-gray-500 shadow-slate-200' :
                                                        'bg-gradient-to-br from-orange-400 to-amber-500 shadow-orange-200'
                                                    }`}>
                                                    {index === 0 ? <Crown className="h-4 w-4 text-white" /> : <Medal className="h-4 w-4 text-white" />}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-200' :
                                                index === 1 ? 'bg-gradient-to-br from-slate-400 to-gray-500 text-white shadow-slate-200' :
                                                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-orange-200' :
                                                        'bg-slate-200 text-slate-600'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate">{operador.nombre || operador.username}</p>
                                                <p className="text-xs text-slate-400">@{operador.username}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between text-center">
                                            <div>
                                                <p className="text-lg font-black text-slate-800">{operador.totalRegistros}</p>
                                                <p className="text-xs text-slate-400">Total</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-emerald-500">{operador.vozYVoto}</p>
                                                <p className="text-xs text-slate-400">V&V</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-amber-600">{operador.soloVoz}</p>
                                                <p className="text-xs text-slate-400">SV</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400">
                                <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Sin registros de operadores</p>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Métricas Footer */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                    {[
                        { icon: Building2, value: sucursalesStats.length, label: 'Sucursales', color: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-200' },
                        { icon: Users, value: rankingOperadores.length, label: 'Operadores Activos', color: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-200' },
                        { icon: TrendingUp, value: `${(stats.conVozYVoto > 0 ? ((stats.conVozYVoto / stats.totalPadron) * 100) : 0).toFixed(1)}%`, label: 'Ratio V&V General', color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
                        { icon: AlertTriangle, value: stats.soloVoz.toLocaleString(), label: 'Solo Voz (Total)', color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200' },
                    ].map((metric, index) => (
                        <motion.div
                            key={metric.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                            whileHover={{ y: -3, scale: 1.02 }}
                            className={`${cardStyle} p-5 text-center`}
                        >
                            <div className={`p-3 bg-gradient-to-br ${metric.color} rounded-2xl w-fit mx-auto mb-3 shadow-lg ${metric.shadow}`}>
                                <metric.icon className="h-6 w-6 text-white" />
                            </div>
                            <p className="text-2xl font-black text-slate-800">{metric.value}</p>
                            <p className="text-xs text-slate-400 font-medium mt-1">{metric.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>
        </div>
    );
}
