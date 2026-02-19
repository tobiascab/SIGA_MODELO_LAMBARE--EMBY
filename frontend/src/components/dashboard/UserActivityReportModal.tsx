"use client";

import React, { useState, useEffect } from "react";
import {
    X, Users, Clock, Search, Download, FileText,
    Table as TableIcon, Filter, ExternalLink, Activity, AlertTriangle
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";


interface UsuarioActivity {
    id: number;
    username: string;
    nombreCompleto: string;
    rol: string;
    sucursal: string;
    lastLogin: string;
    totalOnlineSeconds: number;
    isOnline: boolean;
    totalRegistros: number;
    totalAsignaciones: number;
    timeOnlineFormatted: string;
    lastSeenRelative: string;
}

interface UserActivityReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFilter?: "todos" | "habituales" | "no-entraron" | "sin-registros";
}

export function UserActivityReportModal({ isOpen, onClose, initialFilter = "todos" }: UserActivityReportModalProps) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UsuarioActivity[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"todos" | "habituales" | "no-entraron" | "sin-registros">(initialFilter);
    const [coopNombre, setCoopNombre] = useState('Sistema de Asambleas');


    useEffect(() => {
        if (isOpen) {
            fetchData();
            fetch('/api/cooperativa/publica')
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data?.nombre) setCoopNombre(data.nombre); })
                .catch(() => { });
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/usuarios/reporte-actividad", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);

        } catch (error) {
            console.error("Error fetching activity stats:", error);
            toast.error("Error al cargar estadísticas de usuarios");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (type: 'pdf' | 'excel') => {
        try {
            const token = localStorage.getItem("token");
            const endpoint = type === 'pdf' ? '/api/usuarios/exportar-pdf' : '/api/usuarios/exportar-excel';
            const res = await axios.get(`${endpoint}?filtro=${filter}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_usuarios_${filter}.${type === 'pdf' ? 'pdf' : 'xlsx'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading report:", error);
            toast.error("Error al generar el reporte");
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === "habituales") return matchesSearch && user.lastLogin !== null;
        if (filter === "no-entraron") return matchesSearch && user.lastLogin === null;
        if (filter === "sin-registros") return matchesSearch && (user.totalRegistros === 0 && user.totalAsignaciones === 0);
        return matchesSearch;
    });


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
                    <div className="p-6 lg:p-8 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-200">
                                <Users size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Reporte de Usuarios & Actividad</h2>
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={12} className="text-emerald-500" />
                                    {coopNombre}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDownload('pdf')}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors border border-rose-100"
                            >
                                <FileText size={16} /> PDF
                            </button>
                            <button
                                onClick={() => handleDownload('excel')}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors border border-emerald-100"
                            >
                                <TableIcon size={16} /> Excel
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 ml-2"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Filtros & Búsqueda */}
                    <div className="p-4 lg:px-8 bg-white flex flex-col sm:flex-row gap-4 items-center border-b border-slate-50">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o usuario..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                            />
                        </div>

                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
                            {[
                                { id: "todos", label: "Todos", icon: Users },
                                { id: "habituales", label: "Habituales", icon: UserCheck },
                                { id: "no-entraron", label: "Sin Acceso", icon: Clock },
                                { id: "sin-registros", label: "Cero Registros", icon: AlertTriangle }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === tab.id
                                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                                        : "text-slate-400 hover:text-slate-600"
                                        }`}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tabla de Resultados */}
                    <div className="flex-1 overflow-auto p-4 lg:p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                >
                                    <Activity className="h-10 w-10 text-indigo-500" />
                                </motion.div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Analizando actividad de usuarios...</p>
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredUsers.map((user, idx) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                                    >
                                        {/* Status Online/Offline */}
                                        <div className="absolute top-4 right-4">
                                            {user.isOnline ? (
                                                <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100">
                                                    Offline
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0 ${idx === 0 && filter === "habituales" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
                                                }`}>
                                                {filter === "habituales" ? idx + 1 : user.nombreCompleto.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{user.nombreCompleto}</h3>
                                                <p className="text-indigo-500 text-[10px] font-bold tracking-widest uppercase">@{user.username}</p>
                                                <p className="text-slate-400 text-[10px] font-bold truncate mt-1">{user.rol} • {user.sucursal}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Última Vez</p>
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <span className="text-xs font-black">{user.lastSeenRelative}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tiempo Total</p>
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <Activity size={12} className="text-indigo-400" />
                                                    <span className="text-xs font-black">{user.timeOnlineFormatted}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aportes:</span>
                                                <span className="text-xs font-black text-slate-800">{user.totalRegistros + user.totalAsignaciones}</span>
                                            </div>
                                            <div className="flex -space-x-1">
                                                <div className="w-5 h-5 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-600" title="Check-ins">✓</div>
                                                <div className="w-5 h-5 rounded-full bg-violet-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-violet-600" title="Asignaciones">A</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Users size={48} className="mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-sm">No se encontraron usuarios</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Panel de Auditoría • Datos actualizados en tiempo real
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// Icono faltante
const UserCheck = ({ size }: { size: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
    </svg>
);
