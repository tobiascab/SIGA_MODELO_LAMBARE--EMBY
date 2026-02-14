"use client";

import { useState, useEffect } from "react";
import { X, Download, Calendar, TrendingUp, Award, BarChart3, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import axios from "axios";
import { toast } from "sonner";

interface DailyAssignmentsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface DailyStat {
    fecha: string;
    total: number;
}

export function DailyAssignmentsModal({ isOpen, onClose }: DailyAssignmentsModalProps) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<DailyStat[]>([]);
    const [dias, setDias] = useState(30);

    useEffect(() => {
        if (isOpen) {
            fetchStats();
        }
    }, [isOpen, dias]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/asignaciones/stats-por-dia?dias=${dias}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Error fetching daily stats:", error);
            toast.error("Error al cargar estadísticas");
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/asignaciones/exportar-asignaciones-excel?dias=${dias}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `asignaciones_diarias_${dias}_dias.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Excel descargado correctamente");
        } catch (error) {
            console.error("Error downloading Excel:", error);
            toast.error("Error al descargar Excel");
        }
    };

    const handleExportPDF = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/asignaciones/exportar-asignaciones-pdf?dias=${dias}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `asignaciones_diarias_${dias}_dias.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("PDF descargado correctamente");
        } catch (error) {
            console.error("Error downloading PDF:", error);
            toast.error("Error al descargar PDF");
        }
    };

    // Calcular estadísticas
    const total = stats.reduce((sum, s) => sum + s.total, 0);
    const promedio = stats.length > 0 ? Math.round(total / stats.length) : 0;
    const diaConMas = stats.length > 0
        ? stats.reduce((max, s) => s.total > max.total ? s : max, stats[0])
        : null;

    // Preparar datos para el gráfico (invertir para mostrar cronológicamente)
    const chartData = [...stats].reverse().map(s => ({
        fecha: new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        total: s.total
    }));

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                    {/* Header Premium */}
                    <div className="p-6 lg:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Asignaciones Diarias</h2>
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={12} className="text-blue-500" />
                                    Seguimiento de Nuevos Socios
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors border border-rose-100"
                            >
                                <FileText size={16} /> PDF
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors border border-emerald-100"
                            >
                                <Download size={16} /> Excel
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 ml-2"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Filtros de Rango */}
                    <div className="p-4 lg:px-8 bg-white flex items-center gap-2 border-b border-slate-50">
                        <span className="text-sm font-bold text-slate-600 mr-2">Período:</span>
                        {[7, 14, 30, 60, 90].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDias(d)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dias === d
                                    ? "bg-blue-500 text-white shadow-md"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                    }`}
                            >
                                {d} días
                            </button>
                        ))}
                    </div>

                    {/* Stats Cards */}
                    <div className="p-4 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-500 rounded-xl">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
                            </div>
                            <p className="text-4xl font-black text-slate-800">{total}</p>
                            <p className="text-xs text-slate-500 font-medium mt-1">Asignaciones en {dias} días</p>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-500 rounded-xl">
                                    <BarChart3 className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Promedio</span>
                            </div>
                            <p className="text-4xl font-black text-slate-800">{promedio}</p>
                            <p className="text-xs text-slate-500 font-medium mt-1">Por día</p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-amber-500 rounded-xl">
                                    <Award className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Día Top</span>
                            </div>
                            <p className="text-4xl font-black text-slate-800">{diaConMas?.total || 0}</p>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {diaConMas ? new Date(diaConMas.fecha + 'T00:00:00').toLocaleDateString('es-ES') : '-'}
                            </p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="flex-1 overflow-auto p-4 lg:p-8">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando datos...</p>
                            </div>
                        ) : stats.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-100 p-4">
                                <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm mb-4">Tendencia de Asignaciones</h3>
                                <div style={{ width: '100%', height: '220px', minHeight: '180px' }}>
                                    <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="fecha"
                                                tick={{ fontSize: 12, fill: '#64748b' }}
                                                stroke="#94a3b8"
                                            />
                                            <YAxis
                                                tick={{ fontSize: 12, fill: '#64748b' }}
                                                stroke="#94a3b8"
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '1rem',
                                                    border: 'none',
                                                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                            <Bar dataKey="total" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                                            <defs>
                                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" />
                                                    <stop offset="100%" stopColor="#6366f1" />
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <TrendingUp size={48} className="mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-sm">No hay datos para este período</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Sistema de Seguimiento de Asignaciones • Cooperativa Multiactiva Lambaré Ltda.
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
