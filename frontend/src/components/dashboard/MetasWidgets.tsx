"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
    Target,
    Award,
    TrendingUp,
    Users,
    BarChart3,
    CheckCircle2,
    AlertCircle,
    Info,
    Download
} from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface MetasData {
    usuarioId: number;
    cargo: string;
    meta: number;
    registradosVozYVoto: number;
    registradosSoloVoz: number;
    totalRegistrados: number;
    porcentajeMeta: number;
    faltanMeta: number;
    cumplida: boolean;
    asesores?: {
        meta: number;
        registradosVozYVoto: number;
        registradosSoloVoz: number;
        porcentajeMeta: number;
    };
    funcionarios?: {
        meta: number;
        registradosVozYVoto: number;
        registradosSoloVoz: number;
        porcentajeMeta: number;
    };
}

interface MetasWidgetsProps {
    userId?: number; // Optional: for admin view to see specific user
}

export function MetasWidgets({ userId }: MetasWidgetsProps) {
    const [data, setData] = useState<MetasData | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<"vyv" | "voz" | null>(null);

    useEffect(() => {
        const fetchMetas = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };
                const url = userId
                    ? `/api/dashboard/metas?userId=${userId}`
                    : "/api/dashboard/metas";

                const response = await axios.get(url, { headers });
                setData(response.data);
            } catch (error) {
                console.error("Error fetching metas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetas();
    }, [userId]);

    const handleExportPdf = async (tipo: "vyv" | "voz") => {
        if (downloading) return;
        setDownloading(tipo);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/dashboard/export-socios-pdf?tipo=${tipo}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = tipo === "vyv" ? "socios_voz_y_voto.pdf" : "socios_solo_voz.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting PDF:", error);
        } finally {
            setDownloading(null);
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-slate-100 rounded-3xl w-full mb-6"></div>;
    if (!data) return null;

    // Colores y datos para gráficos
    const pieData = [
        { name: 'Voz y Voto', value: data.registradosVozYVoto, color: '#10b981' }, // Emerald
        { name: 'Solo Voz', value: data.registradosSoloVoz, color: '#f59e0b' },   // Amber
    ];

    const porcentajeStr = data.porcentajeMeta.toFixed(1);
    const progressWidth = Math.min(data.porcentajeMeta, 100);

    return (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            {/* WIDGET 1: PROGRESO META (VOZ Y VOTO) - Destacado (ocupa 2 columnas en LG) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-1 md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-6 lg:p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group"
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

                <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                            <Target className="h-8 w-8 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg lg:text-xl tracking-tight">Progreso Meta</h3>
                            <div className="flex items-center gap-2 text-emerald-400/80 text-xs font-bold uppercase tracking-wider">
                                <span>Voz y Voto</span>
                                <Info className="h-3 w-3 cursor-help" />
                            </div>
                        </div>
                    </div>

                    {/* Badge de Meta */}
                    <div className="flex flex-col items-end shrink-0">
                        <span className="text-2xl xs:text-3xl md:text-3xl font-black text-white leading-none">{data.registradosVozYVoto}</span>
                        <span className="text-slate-400 text-[9px] xs:text-xs md:text-xs font-bold uppercase tracking-widest mt-1">
                            de {data.meta} Objetivo
                        </span>
                    </div>
                </div>

                {/* Progress Bar Premium */}
                <div className="relative pt-2 pb-6 z-10">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                        <span>Progreso Actual</span>
                        <span>{porcentajeStr}%</span>
                    </div>
                    <div className="h-5 bg-slate-700/50 rounded-full overflow-hidden shadow-inner border border-white/5 relative">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressWidth}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`h-full rounded-full relative ${data.cumplida ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                        </motion.div>
                    </div>
                </div>

                {/* Insight /Mensaje */}
                <div className="flex items-center gap-3 relative z-10 bg-white/5 rounded-xl p-3 border border-white/5">
                    {data.cumplida ? (
                        <>
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            <span className="text-emerald-100 font-medium text-sm">¡Excelente! Has cumplido tu meta como {data.cargo}.</span>
                        </>
                    ) : (
                        <>
                            <TrendingUp className="h-5 w-5 text-amber-400" />
                            <span className="text-slate-300 font-medium text-sm">
                                {data.porcentajeMeta < 50 ? "Necesitas aumentar registros de Voz y Voto." : "¡Vas bien! Sigue registrando socios habilitados."}
                            </span>
                        </>
                    )}
                </div>
            </motion.div>

            {/* WIDGET 2: FALTAN PARA LA META */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="col-span-1 md:col-span-1 bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between group hover:border-emerald-200 transition-colors"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-100 transition-colors">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Faltan para Meta</h3>
                </div>

                <div className="flex flex-col items-center justify-center flex-1 py-2">
                    {data.faltanMeta > 0 ? (
                        <>
                            <span className="text-3xl xs:text-5xl md:text-5xl font-black text-slate-800 tracking-tighter group-hover:scale-110 transition-transform duration-300">
                                {data.faltanMeta}
                            </span>
                            <span className="text-slate-400 font-bold text-[10px] xs:text-xs md:text-xs uppercase tracking-widest mt-2 text-center">
                                Socios Voz y Voto
                            </span>
                        </>
                    ) : (
                        <div className="text-center">
                            <span className="inline-flex items-center justify-center h-16 w-16 bg-emerald-100 text-emerald-500 rounded-full mb-2">
                                <Award className="h-8 w-8" />
                            </span>
                            <p className="text-emerald-500 font-black text-lg">¡Meta Superada!</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-medium max-w-[150px] mx-auto">
                        Contando solo socios habilitados para votar
                    </p>
                </div>
            </motion.div>

            {/* WIDGET 3: CALIDAD DE LISTA (Donut Chart) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-1 md:col-span-1 bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col"
            >
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Calidad Lista</h3>
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                        <Users className="h-4 w-4 text-slate-400" />
                    </div>
                </div>

                <div className="relative w-full h-[180px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-black text-slate-800">{data.totalRegistrados}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Total</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-2 text-xs font-bold">
                    <button
                        onClick={() => handleExportPdf("vyv")}
                        disabled={downloading === "vyv"}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer group"
                        title="Descargar PDF de socios con Voz y Voto"
                    >
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-slate-600 group-hover:text-emerald-600">V&V</span>
                        {downloading === "vyv" ? (
                            <Download className="h-3 w-3 text-emerald-500 animate-bounce" />
                        ) : (
                            <Download className="h-3 w-3 text-slate-400 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                    </button>
                    <button
                        onClick={() => handleExportPdf("voz")}
                        disabled={downloading === "voz"}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer group"
                        title="Descargar PDF de socios Solo Voz"
                    >
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-slate-600 group-hover:text-amber-600">Voz</span>
                        {downloading === "voz" ? (
                            <Download className="h-3 w-3 text-amber-500 animate-bounce" />
                        ) : (
                            <Download className="h-3 w-3 text-slate-400 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                    </button>
                </div>
            </motion.div>

            {/* WIDGETS SEGMENTADOS (SOLO ADMIN) */}
            {data.asesores && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-to-r from-blue-900 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden"
                >
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-blue-500/10 -skew-x-12 transform origin-bottom-right" />

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h3 className="font-bold text-lg mb-1">Meta Asesores</h3>
                            <div className="text-xs text-blue-300 font-bold uppercase tracking-widest">
                                Global Asesores
                            </div>
                        </div>
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Users className="h-5 w-5 text-blue-300" />
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 mb-2 relative z-10">
                        <span className="text-3xl md:text-4xl font-black">{data.asesores.registradosVozYVoto}</span>
                        <span className="text-xs md:text-sm text-blue-300 font-bold uppercase">de {data.asesores.meta}</span>
                    </div>

                    <div className="relative pt-1">
                        <div className="flex justify-between text-[10px] font-bold text-blue-300 mb-1.5 uppercase">
                            <span>Progreso</span>
                            <span>{data.asesores.porcentajeMeta.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-blue-950 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(data.asesores.porcentajeMeta, 100)}%` }}
                                className="h-full bg-blue-400 rounded-full relative"
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}

            {data.funcionarios && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-to-r from-emerald-900 to-teal-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden"
                >
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 -skew-x-12 transform origin-bottom-right" />

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h3 className="font-bold text-lg mb-1">Meta Operadores</h3>
                            <div className="text-xs text-emerald-300 font-bold uppercase tracking-widest">
                                Global Operadores
                            </div>
                        </div>
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Award className="h-5 w-5 text-emerald-300" />
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 mb-2 relative z-10">
                        <span className="text-3xl md:text-4xl font-black">{data.funcionarios.registradosVozYVoto}</span>
                        <span className="text-xs md:text-sm text-emerald-300 font-bold uppercase">de {data.funcionarios.meta}</span>
                    </div>

                    <div className="relative pt-1">
                        <div className="flex justify-between text-[10px] font-bold text-emerald-300 mb-1.5 uppercase">
                            <span>Progreso</span>
                            <span>{data.funcionarios.porcentajeMeta.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-emerald-950 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(data.funcionarios.porcentajeMeta, 100)}%` }}
                                className="h-full bg-emerald-400 rounded-full relative"
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
