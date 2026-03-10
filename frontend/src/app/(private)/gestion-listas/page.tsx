"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
    Users,
    Search,
    Trash2,
    ChevronDown,
    ChevronUp,
    User,
    Shield,
    BarChart3,
    CheckCircle2,
    XCircle,
    Loader2,
    Filter,
    ArrowUpDown,
    AlertCircle,
    ClipboardList,
    Trophy,
    Trash,
    UserSearch,
    ShieldAlert,
    Download,
    FileText,
    MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";

interface RankingUser {
    id: number;
    nombre: string;
    username: string;
    rol: string;
    totalListas: number;
    totalAsignados: number;
    vyv: number;
    soloVoz: number;
    idListaReal?: number;
    nombreLista?: string;
}

interface SocioDetalle {
    id: number;
    numeroSocio: string;
    nombreCompleto: string;
    cedula: string;
    esVyV: boolean;
    aprobado: boolean;
    fechaAsignacion: string;
    fechaHoraIngreso: string | null;
    telefono?: string;
}

export default function GestionListasPage() {
    const router = useRouter();
    const [ranking, setRanking] = useState<RankingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState<number | null>(null);
    const [userDetails, setUserDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [socioSearchTerm, setSocioSearchTerm] = useState("");
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [downloadingPdf, setDownloadingPdf] = useState<"general" | number | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const getWhatsAppLinkWithMessage = (socio: any) => {
        if (!socio.telefono) return null;
        let cleanPhone = socio.telefono.replace(/\D/g, '');
        if (cleanPhone.startsWith('09')) {
            cleanPhone = '595' + cleanPhone.substring(1);
        }

        // Determinar nombre y genero
        const firstNames = socio.nombreCompleto.split(', ')[1] || socio.nombreCompleto.split(' ')[0] || '';
        const name = firstNames.split(' ')[0] || '';
        const isFemale = name.endsWith('A') || name.endsWith('a') || name.endsWith('IA');
        const greeting = isFemale ? 'Sra.' : 'Sr.';

        const userNameParts = currentUser?.nombre?.split(' ') || ['Asesor'];
        const userNameStr = userNameParts[0] + (userNameParts.length > 1 ? ' ' + userNameParts[userNameParts.length - 1] : '');

        const message = `¡Hola! Buenos días ${greeting} *${name}* 👋\n\nTe saluda *${userNameStr}* de la *Cooperativa Lambaré* ✅ para invitarte cordialmente a nuestra próxima asamblea institucional que será el día *sábado 21 de marzo de 2026*.\n\n¡Contamos con tu apoyo y participación! 🌟 Si tienes alguna duda, puedes responderme por este medio.`;

        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    };

    useEffect(() => {
        // Verificar permisos del usuario
        const userData = localStorage.getItem("user");
        if (userData) {
            const user = JSON.parse(userData);
            setCurrentUser(user);
            const isSuperAdmin = user.rol === "SUPER_ADMIN";
            const hasGranularPermission = user.permisosEspeciales?.split(',').includes("gestion-listas");
            if (isSuperAdmin || hasGranularPermission) {
                setHasAccess(true);
            } else {
                setHasAccess(false);
            }
        } else {
            setHasAccess(false);
        }
    }, []);

    const fetchRanking = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/asignaciones/ranking-usuarios", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRanking(res.data);
        } catch (error) {
            console.error("Error fetching ranking:", error);
            Swal.fire("Error", "No se pudo cargar el ranking de usuarios", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (hasAccess) {
            fetchRanking();
        }
    }, [hasAccess, fetchRanking]);

    // Filtros memoizados - DEBEN estar antes de cualquier return condicional
    const filteredRanking = useMemo(() =>
        ranking.filter(r =>
            r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.username.toLowerCase().includes(searchTerm.toLowerCase())
        ), [ranking, searchTerm]);

    const filteredSocios = useMemo(() => {
        if (!userDetails || !userDetails.socios) return [];
        return userDetails.socios.filter((s: any) =>
            s.nombreCompleto.toLowerCase().includes(socioSearchTerm.toLowerCase()) ||
            s.numeroSocio.includes(socioSearchTerm) ||
            s.cedula.includes(socioSearchTerm)
        );
    }, [userDetails, socioSearchTerm]);

    // Mostrar acceso denegado si no tiene permisos
    if (hasAccess === false) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md">
                    <div className="h-16 w-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 uppercase mb-2">Acceso Denegado</h2>
                    <p className="text-sm text-slate-500">No tienes permisos para acceder a esta sección.</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-6 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    // Mostrar loading mientras se verifica acceso
    if (hasAccess === null) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        );
    }

    const fetchUserDetails = async (userId: number) => {
        if (expandedUser === userId) {
            setExpandedUser(null);
            setSocioSearchTerm("");
            return;
        }

        setExpandedUser(userId);
        setSocioSearchTerm("");
        setLoadingDetails(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/asignaciones/admin/usuario/${userId}/detalle-completo`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserDetails(res.data);
        } catch (error) {
            console.error("Error fetching details:", error);
            setUserDetails(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDeleteSocio = async (listaId: number, socioId: number, socioNombre: string) => {
        const result = await Swal.fire({
            title: '¿Eliminar Socio?',
            text: `¿Estás seguro de quitar a ${socioNombre} de esta lista? Esta acción es irreversible y quedará auditada.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, Eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem("token");
                await axios.delete(`/api/asignaciones/${listaId}/socio/${socioId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire({
                    title: 'Eliminado',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Refrescar detalles y ranking
                if (expandedUser) {
                    const res = await axios.get(`/api/asignaciones/admin/usuario/${expandedUser}/detalle-completo`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUserDetails(res.data);
                }
                fetchRanking();
            } catch (error) {
                console.error("Error deleting:", error);
                Swal.fire("Error", "No se pudo eliminar el socio", "error");
            }
        }
    };

    // Exportar PDF General (toda la gestión de listas)
    const handleExportPdfGeneral = async () => {
        if (downloadingPdf) return;
        setDownloadingPdf("general");
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("/api/asignaciones/export-pdf-general", {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = "gestion_listas_general.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting PDF:", error);
            Swal.fire("Error", "No se pudo descargar el PDF", "error");
        } finally {
            setDownloadingPdf(null);
        }
    };

    // Exportar PDF por Usuario
    const handleExportPdfUsuario = async (userId: number, userName: string) => {
        if (downloadingPdf) return;
        setDownloadingPdf(userId);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/asignaciones/export-pdf-usuario/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lista_${userName.replace(/\s+/g, '_').toLowerCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting PDF:", error);
            Swal.fire("Error", "No se pudo descargar el PDF", "error");
        } finally {
            setDownloadingPdf(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Header Responsivo */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-0 sm:h-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    {/* Título */}
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-teal-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100 flex-shrink-0">
                            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-xl font-black text-slate-800 uppercase tracking-tight">Gestión de Listas</h1>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 hidden sm:block">Control maestro de asignaciones</p>
                        </div>
                    </div>

                    {/* Acciones - Buscador y botones */}
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {/* Buscador */}
                        <div className="flex-1 sm:flex-initial sm:w-64 relative group">
                            <input
                                type="text"
                                placeholder="Buscar operador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-10 sm:pl-12 pr-4 text-sm focus:bg-white focus:border-teal-500 transition-all outline-none"
                            />
                            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                        </div>

                        {/* Botón PDF General */}
                        <button
                            onClick={handleExportPdfGeneral}
                            disabled={downloadingPdf === "general" || loading || ranking.length === 0}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all shadow-md hover:shadow-lg flex-shrink-0"
                            title="Descargar PDF con todas las listas"
                        >
                            {downloadingPdf === "general" ? (
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-teal-200 blur-2xl opacity-20 animate-pulse rounded-full" />
                            <Loader2 className="h-12 w-12 animate-spin text-teal-500 relative z-10" />
                        </div>
                        <p className="text-slate-500 font-bold animate-pulse text-sm">Analizando todas las listas activas...</p>
                    </div>
                ) : filteredRanking.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-300">
                        <Users className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-400 italic">No se encontraron operadores con socios asignados</h3>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:gap-6">
                        {filteredRanking.map((user, index) => (
                            <motion.div
                                layout
                                key={user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={cn(
                                    "bg-white rounded-2xl sm:rounded-[2.5rem] border transition-all duration-300 overflow-hidden",
                                    expandedUser === user.id
                                        ? "ring-2 ring-teal-500/20 border-teal-200 shadow-2xl"
                                        : "border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
                                )}
                            >
                                {/* User Card Header - Responsivo */}
                                <div
                                    className="p-3 sm:p-6 cursor-pointer"
                                    onClick={() => fetchUserDetails(user.id)}
                                >
                                    {/* Fila superior: Avatar + Info + Chevron */}
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className={cn(
                                            "h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl flex items-center justify-center relative flex-shrink-0",
                                            index === 0 ? "bg-amber-50 text-amber-500" :
                                                index === 1 ? "bg-slate-100 text-slate-500" :
                                                    index === 2 ? "bg-orange-50 text-orange-600" :
                                                        "bg-teal-50 text-teal-600"
                                        )}>
                                            {index < 3 ? <Trophy className="h-6 w-6 sm:h-8 sm:w-8" /> : <User className="h-6 w-6 sm:h-8 sm:w-8" />}
                                            <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white border-2 border-current rounded-full h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center font-black text-[10px] sm:text-xs">
                                                #{index + 1}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm sm:text-lg font-black text-slate-800 uppercase leading-tight truncate">{user.nombre}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] sm:text-xs font-mono text-slate-400 truncate">@{user.username}</span>
                                                <span className="px-1.5 py-0.5 bg-slate-100 text-[8px] sm:text-[10px] font-black text-slate-500 rounded flex-shrink-0">
                                                    {user.rol}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="transition-transform duration-300 flex-shrink-0">
                                            {expandedUser === user.id ? <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-teal-500" /> : <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-slate-300" />}
                                        </div>
                                    </div>

                                    {/* Estadísticas - En fila debajo en móvil */}
                                    <div className="flex items-center justify-around mt-3 pt-3 border-t border-slate-100 sm:hidden">
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Total</p>
                                            <p className="text-lg font-black text-slate-800">{user.totalAsignados}</p>
                                        </div>
                                        <div className="h-6 w-px bg-slate-100" />
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-emerald-500 uppercase">VyV</p>
                                            <p className="text-lg font-black text-emerald-600">{user.vyv}</p>
                                        </div>
                                        <div className="h-6 w-px bg-slate-100" />
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-red-500 uppercase">S.Voz</p>
                                            <p className="text-lg font-black text-red-600">{user.soloVoz}</p>
                                        </div>
                                    </div>

                                    {/* Estadísticas - Desktop */}
                                    <div className="hidden sm:flex items-center gap-8 mt-4 pl-20">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                                            <p className="text-2xl font-black text-slate-800">{user.totalAsignados}</p>
                                        </div>
                                        <div className="text-center h-8 w-[1px] bg-slate-100" />
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">V y V</p>
                                            <p className="text-2xl font-black text-emerald-600">{user.vyv}</p>
                                        </div>
                                        <div className="text-center h-8 w-[1px] bg-slate-100" />
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">S. Voz</p>
                                            <p className="text-2xl font-black text-red-600">{user.soloVoz}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {expandedUser === user.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="bg-slate-50/50 border-t border-slate-100"
                                        >
                                            <div className="p-3 sm:p-8">
                                                {loadingDetails ? (
                                                    <div className="flex items-center justify-center p-8 sm:p-12 gap-3">
                                                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-teal-500" />
                                                        <span className="text-slate-400 font-bold text-xs sm:text-sm">Cargando...</span>
                                                    </div>
                                                ) : userDetails ? (
                                                    <div className="space-y-3 sm:space-y-4">
                                                        {/* Buscador Interno + Botón PDF - Full width en móvil */}
                                                        <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                                            <button
                                                                onClick={() => handleExportPdfUsuario(user.id, user.nombre)}
                                                                disabled={downloadingPdf === user.id}
                                                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-lg"
                                                            >
                                                                {downloadingPdf === user.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Download className="h-4 w-4" />
                                                                )}
                                                                <span>Descargar PDF</span>
                                                            </button>
                                                            <div className="relative group w-full sm:max-w-xs">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Buscar socio..."
                                                                    value={socioSearchTerm}
                                                                    onChange={(e) => setSocioSearchTerm(e.target.value)}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none shadow-sm"
                                                                />
                                                                <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                                            </div>
                                                        </div>

                                                        {/* Vista Móvil - Tarjetas */}
                                                        <div className="sm:hidden space-y-2">
                                                            {filteredSocios.length === 0 ? (
                                                                <div className="text-center py-8">
                                                                    <p className="text-sm font-bold text-slate-300 italic">Sin resultados</p>
                                                                </div>
                                                            ) : filteredSocios.map((socio: any) => (
                                                                <div key={socio.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                                    #{socio.numeroSocio}
                                                                                </span>
                                                                                <span className={cn(
                                                                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                                                                                    socio.esVyV
                                                                                        ? "bg-emerald-50 text-emerald-600"
                                                                                        : "bg-red-50 text-red-600"
                                                                                )}>
                                                                                    {socio.esVyV ? "VyV" : "Solo Voz"}
                                                                                </span>
                                                                                {socio.fechaHoraIngreso && (
                                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                                <p className="text-xs font-bold text-slate-700 truncate">{socio.nombreCompleto}</p>
                                                                                {socio.telefono && getWhatsAppLinkWithMessage(socio) && (
                                                                                    <a
                                                                                        href={getWhatsAppLinkWithMessage(socio)!}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-all shadow-lg hover:shadow-green-500/30 transform hover:scale-105 border border-green-400"
                                                                                        title="Enviar Mensaje de WhatsApp"
                                                                                    >
                                                                                        <MessageCircle className="h-3 w-3" />
                                                                                        <span className="text-[10px] font-bold">WhatsApp</span>
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-[10px] text-slate-400">CI: {socio.cedula}</p>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleDeleteSocio(userDetails.idListaActiva, socio.id, socio.nombreCompleto)}
                                                                            className="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-all flex-shrink-0"
                                                                        >
                                                                            <Trash className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Vista Desktop - Tabla */}
                                                        < div className="hidden sm:block bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-inner" >
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                        <th className="px-6 py-4"># Socio</th>
                                                                        <th className="px-6 py-4">Nombre Completo</th>
                                                                        <th className="px-6 py-4">Estado</th>
                                                                        <th className="px-6 py-4">Asignado en</th>
                                                                        <th className="px-6 py-4 text-center">Asistió</th>
                                                                        <th className="px-6 py-4 text-right">Acción</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {filteredSocios.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                                                <p className="text-sm font-bold text-slate-300 italic">No se encontraron socios</p>
                                                                            </td>
                                                                        </tr>
                                                                    ) : filteredSocios.map((socio: any) => (
                                                                        <tr key={socio.id} className="hover:bg-slate-50 transition-colors group">
                                                                            <td className="px-6 py-4">
                                                                                <span className="text-xs font-mono font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                                                                    {socio.numeroSocio}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <div className="flex flex-col gap-1 items-start">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <p className="text-sm font-bold text-slate-700">{socio.nombreCompleto}</p>
                                                                                        {socio.telefono && getWhatsAppLinkWithMessage(socio) && (
                                                                                            <a
                                                                                                href={getWhatsAppLinkWithMessage(socio)!}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-all shadow-lg hover:shadow-green-500/30 transform hover:scale-105 border border-green-400"
                                                                                                title="Enviar Mensaje de WhatsApp"
                                                                                            >
                                                                                                <MessageCircle className="h-4 w-4" />
                                                                                                <span className="hidden lg:inline text-xs font-bold">WhatsApp</span>
                                                                                            </a>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-[10px] text-slate-400">CI: {socio.cedula}</p>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <span className={cn(
                                                                                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                                                                    socio.esVyV
                                                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                                        : "bg-red-50 text-red-600 border-red-100"
                                                                                )}>
                                                                                    {socio.esVyV ? "Voz y Voto" : "Solo Voz"}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <p className="text-xs text-slate-500 font-medium">
                                                                                    {new Date(socio.fechaAsignacion).toLocaleDateString()}
                                                                                </p>
                                                                            </td>
                                                                            <td className="px-6 py-4 text-center">
                                                                                {socio.fechaHoraIngreso ? (
                                                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                                        <span className="text-[9px] font-black">SÍ</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-400 rounded-lg border border-slate-200">
                                                                                        <XCircle className="h-3 w-3" />
                                                                                        <span className="text-[9px] font-black">NO</span>
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-6 py-4 text-right">
                                                                                <button
                                                                                    onClick={() => handleDeleteSocio(userDetails.idListaActiva, socio.id, socio.nombreCompleto)}
                                                                                    className="p-2.5 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                                                                                    title="Eliminar de la lista"
                                                                                >
                                                                                    <Trash className="h-4 w-4" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center py-8 sm:py-10 text-slate-400 gap-2">
                                                        <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10" />
                                                        <p className="text-xs sm:text-sm font-bold">No se pudieron cargar los socios.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

