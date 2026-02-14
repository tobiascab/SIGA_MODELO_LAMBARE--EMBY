"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Users, Loader2, Plus, Shield, CheckCircle2, AlertTriangle, Trash2, Clock, Zap } from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Swal from 'sweetalert2';

interface Socio {
    id: number;
    numeroSocio: string;
    nombreCompleto: string;
    cedula: string;
    aporteAlDia: boolean;
    solidaridadAlDia: boolean;
    fondoAlDia: boolean;
    incoopAlDia: boolean;
    creditoAlDia: boolean;
    estadoVozVoto?: boolean;
    habilitadoVozVoto?: string;
}

interface ListaAsignacion {
    id: number;
    nombre: string;
    descripcion: string;
    total: number;
    vyv: number;
    soloVoz: number;
}

export default function AsignacionRapidaPage() {
    const [user, setUser] = useState<any>(null);
    const [miLista, setMiLista] = useState<ListaAsignacion | null>(null);
    const [socios, setSocios] = useState<Socio[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSocios, setLoadingSocios] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchedSocio, setSearchedSocio] = useState<Socio | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Modal para socio ya asignado
    const [showAlreadyAssignedModal, setShowAlreadyAssignedModal] = useState(false);
    const [alreadyAssignedInfo, setAlreadyAssignedInfo] = useState<{
        socioNombre: string;
        socioNro: string;
        listaNombre: string;
        listaUsuario: string;
        fechaAsignacion: string;
    } | null>(null);

    // Modal para socio SOLO VOZ (sin derecho a voto)
    const [showSoloVozModal, setShowSoloVozModal] = useState(false);
    const [soloVozInfo, setSoloVozInfo] = useState<{
        socioNombre: string;
        socioNro: string;
        cedula: string;
        requisitosIncumplidos: string[];
    } | null>(null);

    const tieneVozYVoto = (socio: Socio) => {
        if (socio.estadoVozVoto !== undefined) return socio.estadoVozVoto;
        if (socio.habilitadoVozVoto) return socio.habilitadoVozVoto.toLowerCase().includes('voto');
        return false;
    };

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const userData = localStorage.getItem("user");
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                const headers = { Authorization: `Bearer ${token}` };

                // Obtener mis listas
                const response = await axios.get("/api/asignaciones/mis-listas", { headers });

                if (response.data.length === 0) {
                    // AUTO CREAR LISTA si no existe ninguna
                    const timestamp = new Date().toLocaleString('es-PY', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    });
                    await axios.post("/api/asignaciones/crear-lista", {
                        nombre: `Lista de ${parsedUser.nombreCompleto || parsedUser.username}`,
                        descripcion: `Creada automáticamente el ${timestamp}`
                    }, { headers });

                    // Recargar
                    const newResponse = await axios.get("/api/asignaciones/mis-listas", { headers });
                    if (newResponse.data.length > 0) {
                        setMiLista(newResponse.data[0]);
                        await loadSocios(newResponse.data[0].id);
                    }
                } else {
                    // Usar la primera lista
                    setMiLista(response.data[0]);
                    await loadSocios(response.data[0].id);
                }
            }
        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSocios = async (listaId: number) => {
        setLoadingSocios(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/asignaciones/${listaId}/socios`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSocios(response.data);
        } catch (error) {
            console.error("Error al cargar socios:", error);
        } finally {
            setLoadingSocios(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Búsqueda automática con debounce
    useEffect(() => {
        if (searchTerm.length >= 1) {
            const timer = setTimeout(() => {
                handleSearch();
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setSearchedSocio(null);
        }
    }, [searchTerm]);

    const handleSearch = async () => {
        if (!searchTerm || searchTerm.length < 1) return;
        setSearching(true);
        setErrorMessage("");
        setSearchedSocio(null);

        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/socios/buscar?term=${searchTerm}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.length > 0) {
                setSearchedSocio(response.data[0]);
            } else {
                setErrorMessage("No se encontró ningún socio con ese dato");
            }
        } catch (error: any) {
            setErrorMessage(error.response?.data?.error || "Error al buscar");
        } finally {
            setSearching(false);
        }
    };

    const handleAddSocio = async () => {
        if (!miLista || !searchedSocio) return;

        try {
            const token = localStorage.getItem("token");
            await axios.post(`/api/asignaciones/${miLista.id}/agregar-socio`,
                { term: searchedSocio.cedula },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccessMessage(`✓ ${searchedSocio.nombreCompleto} agregado exitosamente`);
            setSearchTerm("");
            setSearchedSocio(null);

            // Recargar datos
            await loadSocios(miLista.id);
            fetchData(); // Actualizar contadores

            // Limpiar mensaje después de 3 segundos
            setTimeout(() => setSuccessMessage(""), 3000);

        } catch (error: any) {
            if (error.response?.status === 409 && error.response?.data?.error === 'SOCIO_YA_ASIGNADO') {
                setAlreadyAssignedInfo({
                    socioNombre: error.response.data.socioNombre,
                    socioNro: error.response.data.socioNro,
                    listaNombre: error.response.data.listaNombre,
                    listaUsuario: error.response.data.listaUsuario,
                    fechaAsignacion: error.response.data.fechaAsignacion
                });
                setShowAlreadyAssignedModal(true);
                setSearchedSocio(null);
                setSearchTerm("");
            } else if (error.response?.status === 400) {
                setErrorMessage("Este socio ya está en tu lista");
            }
            // Error de socio SOLO VOZ (sin derecho a voto) - código 422
            else if (error.response?.status === 422 && error.response?.data?.error === 'SOCIO_SOLO_VOZ') {
                setSoloVozInfo({
                    socioNombre: error.response.data.socioNombre,
                    socioNro: error.response.data.socioNro,
                    cedula: error.response.data.cedula,
                    requisitosIncumplidos: error.response.data.requisitosIncumplidos || []
                });
                setShowSoloVozModal(true);
                setSearchedSocio(null);
                setSearchTerm("");
            } else if (error.response?.status === 403 && error.response?.data?.bloqueado) {
                // MENSAJE AMABLE DE TIEMPO EXPIRADO - REDISEÑO PREMIUM
                Swal.fire({
                    title: '<span class="text-3xl font-black italic uppercase">¡Tiempo Finalizado!</span>',
                    html: `
                        <div class="p-4 space-y-4">
                            <div class="relative w-24 h-24 mx-auto bg-orange-100 rounded-3xl flex items-center justify-center border-4 border-orange-50 mb-6 group">
                                <span class="text-5xl group-hover:scale-110 transition-transform">🔒</span>
                                <div class="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-orange-100">
                                    <svg class="h-5 w-5 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <p class="text-slate-600 font-medium text-lg leading-relaxed">
                                ${error.response.data.mensaje || 'El periodo de asignación ha concluido oficialmente.'}
                            </p>
                            <div class="pt-4 border-t border-slate-100">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                                    Las asignaciones están selladas para esta asamblea. <br/> ¡Muchas gracias por tu valiosa colaboración!
                                </p>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#f59e0b',
                    padding: '2rem',
                    customClass: {
                        popup: 'rounded-[3rem] shadow-[0_30px_100px_rgba(249,115,22,0.2)] border-2 border-orange-100',
                        confirmButton: 'rounded-2xl px-12 py-4 font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform'
                    }
                });
                setSearchedSocio(null);
                setSearchTerm("");
            } else {
                setErrorMessage(error.response?.data?.error || error.response?.data?.message || "Error al agregar");
            }
        }
    };

    const handleRemoveSocio = async (socioId: number) => {
        if (!miLista) return;
        if (!confirm("¿Quitar este socio de tu lista?")) return;

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/asignaciones/${miLista.id}/socio/${socioId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await loadSocios(miLista.id);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || "Error al eliminar");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Cargando tu espacio de trabajo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header con identidad del usuario - Compacto */}
            <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white">
                <div className="mx-auto" style={{ maxWidth: 'clamp(320px, 95vw, 900px)', padding: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <p className="text-violet-200 text-xs md:text-sm font-medium">Bienvenido</p>
                            <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }} className="font-black">{user?.nombreCompleto || user?.username}</h1>
                        </div>

                        {/* Estadísticas del usuario - Compactas */}
                        {miLista && (
                            <div className="flex gap-2">
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center flex-1 md:flex-none">
                                    <p className="text-xl md:text-2xl font-black">{miLista.total}</p>
                                    <p className="text-[9px] md:text-xs text-violet-200">Asignados</p>
                                </div>
                                <div className="bg-emerald-500/40 backdrop-blur rounded-xl px-3 py-2 text-center flex-1 md:flex-none">
                                    <p className="text-xl md:text-2xl font-black text-emerald-200">{miLista.vyv}</p>
                                    <p className="text-[9px] md:text-xs text-emerald-100">Voz y Voto</p>
                                </div>
                                <div className="bg-amber-500/40 backdrop-blur rounded-xl px-3 py-2 text-center flex-1 md:flex-none">
                                    <p className="text-xl md:text-2xl font-black text-amber-200">{miLista.soloVoz}</p>
                                    <p className="text-[9px] md:text-xs text-amber-100">Solo Voz</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto space-y-4" style={{ maxWidth: 'clamp(320px, 95vw, 900px)', padding: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
                {/* Mensaje de advertencia - Compacto */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-3 flex items-start gap-3"
                >
                    <div className="p-1.5 bg-amber-500 rounded-lg flex-shrink-0">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-amber-800 text-sm">¡La velocidad importa!</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Los socios se asignan por <strong>orden de registro</strong>.
                        </p>
                    </div>
                </motion.div>

                {/* Buscador Principal - Responsivo */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 md:p-5"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 md:p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg md:rounded-xl shadow-lg shadow-violet-200">
                            <Plus className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-black text-slate-800">Agregar Socio</h2>
                            <p className="text-xs text-slate-500 hidden md:block">Escribe el número de cédula o número de socio</p>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar socio (CI, N°)..."
                            className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base md:text-lg text-slate-700 placeholder:text-slate-400 placeholder:font-normal focus:border-violet-500 focus:bg-white outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setErrorMessage("");
                            }}
                            autoComplete="off"
                            autoFocus
                        />
                        {searching && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-500 animate-spin" />
                        )}
                    </div>

                    {/* Mensaje de error */}
                    <AnimatePresence>
                        {errorMessage && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="mt-3 text-red-600 text-sm font-medium flex items-center gap-2"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                {errorMessage}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {/* Mensaje de éxito */}
                    <AnimatePresence>
                        {successMessage && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="mt-4 bg-emerald-100 text-teal-500 px-4 py-3 rounded-xl font-bold flex items-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                {successMessage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Resultado de búsqueda */}
                    <AnimatePresence>
                        {searchedSocio && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 sm:mt-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl border-2 border-emerald-300 p-3 sm:p-5"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="p-2 sm:p-3 bg-emerald-500 rounded-lg sm:rounded-xl flex-shrink-0">
                                            <CheckCircle2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] sm:text-xs text-emerald-500 font-bold uppercase tracking-wide">Socio Encontrado</p>
                                            <p className="text-base sm:text-2xl font-black text-slate-800 truncate">{searchedSocio.nombreCompleto}</p>
                                            <div className="flex flex-wrap gap-2 sm:gap-4 mt-1">
                                                <span className="text-xs sm:text-sm text-slate-600">CI: <span className="font-bold">{searchedSocio.cedula}</span></span>
                                                <span className="text-xs sm:text-sm text-slate-600">Nro: <span className="font-bold">{searchedSocio.numeroSocio}</span></span>
                                                <span className={`text-xs sm:text-sm font-bold ${tieneVozYVoto(searchedSocio) ? 'text-emerald-500' : 'text-amber-600'}`}>
                                                    {tieneVozYVoto(searchedSocio) ? '✓ V&V' : '⚠ SV'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleAddSocio}
                                        className="w-full sm:w-auto px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-sm sm:text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                                    >
                                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                                        AGREGAR
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Lista de Socios Asignados */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden"
                >
                    <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5" />
                            <span className="font-bold">Mis Socios Asignados</span>
                        </div>
                        <span className="bg-white/20 px-3 py-1 rounded-lg font-bold">{socios.length}</span>
                    </div>

                    {loadingSocios ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">Cargando...</p>
                        </div>
                    ) : socios.length > 0 ? (
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                            {socios.map((socio, index) => {
                                const esVyV = tieneVozYVoto(socio);
                                return (
                                    <motion.div
                                        key={socio.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="p-3 sm:p-4 hover:bg-slate-50 transition-colors group flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white text-xs sm:text-sm ${esVyV ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 text-sm sm:text-base truncate">{socio.nombreCompleto}</p>
                                                <p className="text-[10px] sm:text-sm text-slate-500 truncate">
                                                    CI: {socio.cedula} | Nro: {socio.numeroSocio}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                                            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold ${esVyV ? 'bg-emerald-100 text-teal-500' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {esVyV ? 'V&V' : 'SV'}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveSocio(socio.id)}
                                                className="p-1.5 sm:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Aún no tienes socios asignados</p>
                            <p className="text-sm text-slate-400 mt-1">Usa el buscador de arriba para comenzar</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Modal: Socio Ya Asignado */}
            <AnimatePresence>
                {showAlreadyAssignedModal && alreadyAssignedInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-red-100 rounded-full">
                                    <AlertTriangle className="w-12 h-12 text-red-500" />
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-center text-slate-800 mb-2">
                                ¡Socio Ya Asignado!
                            </h3>
                            <p className="text-slate-500 text-center text-sm mb-6">
                                Otro usuario registró este socio antes que tú
                            </p>

                            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Socio</p>
                                <p className="font-bold text-slate-800">{alreadyAssignedInfo.socioNombre}</p>
                                <p className="text-sm text-slate-500">Nro: {alreadyAssignedInfo.socioNro}</p>
                            </div>

                            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border-2 border-red-200">
                                <p className="text-xs text-red-600 uppercase tracking-wide font-bold mb-2">Fue asignado a:</p>
                                <p className="font-bold text-slate-800">{alreadyAssignedInfo.listaNombre}</p>
                                <p className="text-sm text-slate-600">por <span className="font-bold">{alreadyAssignedInfo.listaUsuario}</span></p>
                                <div className="mt-3 pt-3 border-t border-red-200 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-red-500" />
                                    <p className="text-sm text-red-700 font-medium">
                                        {alreadyAssignedInfo.fechaAsignacion
                                            ? new Date(alreadyAssignedInfo.fechaAsignacion).toLocaleString('es-PY', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : 'Fecha no disponible'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowAlreadyAssignedModal(false);
                                    setAlreadyAssignedInfo(null);
                                }}
                                className="w-full mt-6 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-all"
                            >
                                Entendido
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal: Socio SOLO VOZ (sin derecho a voto) */}
            <AnimatePresence>
                {showSoloVozModal && soloVozInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowSoloVozModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full">
                                    <AlertTriangle className="w-12 h-12 text-amber-500" />
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-center text-slate-800 mb-2">
                                Solo Tiene Voz
                            </h3>
                            <p className="text-slate-500 text-center text-sm mb-6">
                                Este socio no cumple los requisitos para votar
                            </p>

                            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Socio</p>
                                <p className="font-bold text-slate-800">{soloVozInfo.socioNombre}</p>
                                <p className="text-sm text-slate-500">Nro: {soloVozInfo.socioNro} | CI: {soloVozInfo.cedula}</p>
                            </div>

                            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border-2 border-red-200 mb-4">
                                <p className="text-xs text-red-600 uppercase tracking-wide font-bold mb-3">
                                    Requisitos pendientes:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {soloVozInfo.requisitosIncumplidos.map((req, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200"
                                        >
                                            ✗ {req}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 mb-6">
                                <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    <strong>Solo puedes agregar socios con Voz y Voto.</strong><br />
                                    Este socio tiene obligaciones pendientes.
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setShowSoloVozModal(false);
                                    setSoloVozInfo(null);
                                }}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-all"
                            >
                                Entendido
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
