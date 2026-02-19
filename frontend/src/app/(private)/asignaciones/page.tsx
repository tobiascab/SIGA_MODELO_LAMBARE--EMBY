"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search,
    MapPin,
    Users,
    UserCheck,
    Loader2,
    Building2,
    ChevronRight,
    ClipboardList,
    HelpCircle
} from "lucide-react";
import axios from "axios";
import { useTour } from "@/components/tour/TourContext";
import { asignacionesTour } from "@/components/tour/tourSteps";
import Swal from 'sweetalert2';

// interfaces locales adicionales
interface Sucursal {
    sucursalId: number;
    sucursal: string;
    padron: number;
    presentes: number;
    vozVoto: number;
}

interface Socio {
    id: number;
    numeroSocio: string;
    nombreCompleto: string;
    cedula: string;
    sucursal: { id: number; nombre: string } | null;
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

interface RankingUsuario {
    id: number;
    nombre: string;
    username: string;
    rol: string;
    totalListas: number;
    totalAsignados: number;
    vyv: number;
    soloVoz: number;
}

import AdminAssignments from "@/components/asignaciones/AdminAssignments";
import { SocioAssignments } from "@/components/asignaciones/SocioAssignments";

export default function AsignacionesPage() {
    const [user, setUser] = useState<any>(null);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);
    const [socios, setSocios] = useState<Socio[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSocios, setLoadingSocios] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [rankingUsuarios, setRankingUsuarios] = useState<RankingUsuario[]>([]);

    // Estados para gestión de listas (Socio)
    const [misListas, setMisListas] = useState<ListaAsignacion[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [newListDesc, setNewListDesc] = useState("");
    const [selectedLista, setSelectedLista] = useState<ListaAsignacion | null>(null);
    const [socioSearchTerm, setSocioSearchTerm] = useState("");
    const [addingSocio, setAddingSocio] = useState(false);
    const [searchedSocio, setSearchedSocio] = useState<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [searchType, setSearchType] = useState(''); // '', 'cedula', 'nroSocio', 'nombre'

    // Modal para socio ya asignado
    const [showAlreadyAssignedModal, setShowAlreadyAssignedModal] = useState(false);
    const [alreadyAssignedInfo, setAlreadyAssignedInfo] = useState<{
        socioNombre: string;
        socioNro: string;
        listaNombre: string;
        listaUsuario: string;
    } | null>(null);


    // Modal para socio no encontrado
    const [showNotFoundModal, setShowNotFoundModal] = useState(false);
    const [notFoundTerm, setNotFoundTerm] = useState("");

    // Modal para socio SOLO VOZ (sin derecho a voto)
    const [showSoloVozModal, setShowSoloVozModal] = useState(false);
    const [soloVozInfo, setSoloVozInfo] = useState<{
        socioNombre: string;
        socioNro: string;
        cedula: string;
        requisitosIncumplidos: string[];
    } | null>(null);

    const { startTour, hasSeenTour } = useTour();

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const userData = localStorage.getItem("user");
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                const headers = { Authorization: `Bearer ${token}` };

                // TODOS los usuarios cargan sus listas (no solo USUARIO_SOCIO)
                try {
                    const response = await axios.get("/api/asignaciones/mis-listas", { headers });

                    if (response.data.length === 0) {
                        // AUTO CREAR LISTA si no existe ninguna
                        const timestamp = new Date().toLocaleString('es-PY', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        });
                        const createRes = await axios.post("/api/asignaciones/crear-lista",
                            {
                                nombre: `Mi Lista ${timestamp}`,
                                descripcion: "Lista generada automáticamente"
                            },
                            { headers }
                        );
                        const nuevaLista = { ...createRes.data, total: 0, vyv: 0, soloVoz: 0 };
                        setMisListas([nuevaLista]);
                        setSelectedLista(nuevaLista);
                    } else {
                        setMisListas(response.data);
                        // Auto-select the list with the most socios (not just the first one)
                        if (response.data.length > 0 && !selectedLista) {
                            const listaConMasSocios = response.data.reduce((prev: ListaAsignacion, curr: ListaAsignacion) =>
                                (curr.total || 0) > (prev.total || 0) ? curr : prev
                            );
                            handleSelectLista(listaConMasSocios);
                        }
                    }
                } catch (err: any) {
                    console.error("Error cargando listas:", err);
                    if (err.response?.status === 403) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        window.location.href = "/login";
                    }
                }

                // Admin/Directivo: TAMBIÉN cargar sucursales + ranking (para otras funcionalidades)
                const isSocio = parsedUser.rol === "USUARIO_SOCIO";
                if (!isSocio) {
                    try {
                        const [sucursalesRes, rankingRes] = await Promise.all([
                            axios.get("/api/socios/estadisticas/por-sucursal", { headers }),
                            axios.get("/api/asignaciones/ranking-usuarios", { headers }).catch(() => ({ data: [] }))
                        ]);
                        setSucursales(sucursalesRes.data);
                        setRankingUsuarios(rankingRes.data || []);
                    } catch (e) {
                        console.error("Error cargando datos admin:", e);
                    }
                }
            }
        } catch (error: any) {
            console.error("Error:", error);
            if (error.response?.status === 403) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateLista = async () => {
        try {
            const token = localStorage.getItem("token");
            // Crear lista automáticamente con nombre temporal
            const timestamp = new Date().toLocaleString('es-PY', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            const response = await axios.post("/api/asignaciones/crear-lista",
                {
                    nombre: `Mi Lista ${timestamp}`,
                    descripcion: "Lista creada automáticamente"
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Recargar datos
            await fetchData();

            // Seleccionar la nueva lista automáticamente
            setTimeout(() => {
                if (response.data && response.data.id) {
                    handleSelectLista({
                        ...response.data,
                        total: 0,
                        vyv: 0,
                        soloVoz: 0
                    });
                }
            }, 100);
        } catch (error) {
            alert("Error al crear lista");
        }
    };



    // Botón flotante de ayuda manual
    const handleManualTour = () => {
        startTour(asignacionesTour, 'asignaciones');
    };

    const handleSearchSocio = async () => {
        if (!selectedLista || !socioSearchTerm) return;
        setAddingSocio(true);
        try {
            const token = localStorage.getItem("token");
            // Buscar el socio sin asignarlo todavía
            const response = await axios.get(`/api/socios/buscar-exacto?term=${socioSearchTerm}${searchType ? `&tipo=${searchType}` : ''}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data) {
                setSearchedSocio(response.data);
                // No mostramos modal, se muestra inline
            } else {
                setNotFoundTerm(socioSearchTerm);
                setShowNotFoundModal(true);
                setSocioSearchTerm("");
            }
        } catch (error: any) {
            // Si hay error 404, es socio no encontrado
            if (error.response?.status === 404) {
                setNotFoundTerm(socioSearchTerm);
                setShowNotFoundModal(true);
                setSocioSearchTerm("");
            } else {
                setNotFoundTerm(error.response?.data?.error || "Error al buscar socio");
                setShowNotFoundModal(true);
            }
        } finally {
            setAddingSocio(false);
        }
    };

    const handleConfirmAddSocio = async () => {
        if (!selectedLista || !searchedSocio) return;
        try {
            const token = localStorage.getItem("token");
            await axios.post(`/api/asignaciones/${selectedLista.id}/agregar-socio`,
                { term: searchedSocio.cedula, tipo: 'cedula' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSocioSearchTerm("");
            setSearchedSocio(null);

            // Refresh socios list and counts
            const responseSocios = await axios.get(`/api/asignaciones/${selectedLista.id}/socios`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSocios(responseSocios.data);
            fetchData(); // actualizar contadores
        } catch (error: any) {
            // Force refresh list even on error if it might be an inconsistency
            if (error.response?.status === 400 && error.response.data.error === "El socio ya está en esta lista") {
                // Refresh anyway to show the invisible socio
                try {
                    const token = localStorage.getItem("token");
                    const responseSocios = await axios.get(`/api/asignaciones/${selectedLista.id}/socios`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSocios(responseSocios.data);
                } catch (e) { console.error("Error refreshing list", e); }

                alert("El socio ya figura en tu lista (actualizando visualización...)");
                setSearchedSocio(null);
                setSocioSearchTerm("");
                return;
            }
            // Verificar si es error de socio ya asignado a OTRA lista (código 409)
            if (error.response?.status === 409 && error.response?.data?.error === 'SOCIO_YA_ASIGNADO') {
                setAlreadyAssignedInfo({
                    socioNombre: error.response.data.socioNombre,
                    socioNro: error.response.data.socioNro,
                    listaNombre: error.response.data.listaNombre,
                    listaUsuario: error.response.data.listaUsuario
                });
                setShowAlreadyAssignedModal(true);
                setSearchedSocio(null);
                setSocioSearchTerm("");
            }
            // Error de socio ya en la MISMA lista (código 400)
            else if (error.response?.status === 400 && error.response?.data?.error?.includes('ya está')) {
                setAlreadyAssignedInfo({
                    socioNombre: searchedSocio?.nombreCompleto || 'Socio',
                    socioNro: searchedSocio?.numeroSocio || '',
                    listaNombre: selectedLista?.nombre || 'esta lista',
                    listaUsuario: 'TÚ MISMO'
                });
                setShowAlreadyAssignedModal(true);
                setSearchedSocio(null);
                setSocioSearchTerm("");
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
                setSocioSearchTerm("");
            }
            else if (error.response?.status === 403 && error.response?.data?.bloqueado) {
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
                setSocioSearchTerm("");
            }
            else {
                alert(error.response?.data?.error || error.response?.data?.message || "Error al agregar socio");
            }
        }
    };

    const handleRemoveSocio = async (socioId: number) => {
        if (!selectedLista) return;

        // Optimistic UI: remover inmediatamente para animación suave
        setSocios(prev => prev.filter(s => s.id !== socioId));

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/asignaciones/${selectedLista.id}/socio/${socioId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData(); // actualizar contadores
        } catch (error: any) {
            console.error("Error al eliminar socio:", error);
            alert(error.response?.data?.error || "Error al eliminar socio. Recargando lista...");

            // Recargar la lista completa en caso de error
            try {
                const token = localStorage.getItem("token");
                const responseSocios = await axios.get(`/api/asignaciones/${selectedLista.id}/socios`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSocios(responseSocios.data);
                fetchData();
            } catch (reloadError) {
                console.error("Error al recargar:", reloadError);
            }
        }
    };

    const handleDeleteLista = async (listaId: number) => {
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/asignaciones/lista/${listaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (selectedLista?.id === listaId) {
                setSelectedLista(null);
                setSocios([]);
            }
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || "Error al eliminar lista");
        }
    };

    const handleUpdateLista = async (listaId: number, nombre: string, descripcion: string) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(`/api/asignaciones/lista/${listaId}`,
                { nombre, descripcion },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (selectedLista?.id === listaId) {
                setSelectedLista({ ...selectedLista, nombre, descripcion });
            }
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || "Error al actualizar lista");
        }
    };

    const handleSelectLista = async (lista: ListaAsignacion) => {
        setSelectedLista(lista);
        setLoadingSocios(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/asignaciones/${lista.id}/socios`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSocios(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingSocios(false);
        }
    };

    const fetchSociosBySucursal = useCallback(async (sucursalId: number) => {
        setLoadingSocios(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get("/api/socios", { headers });
            const filtered = response.data.filter((s: Socio) => s.sucursal?.id === sucursalId);
            setSocios(filtered);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoadingSocios(false);
        }
    }, []);

    const handleSelectSucursal = (suc: Sucursal) => {
        setSelectedSucursal(suc);
        fetchSociosBySucursal(suc.sucursalId);
        setSearchTerm("");
    };

    const tieneVozYVoto = (socio: Socio) => {
        if (socio.estadoVozVoto !== undefined) return socio.estadoVozVoto;
        if (socio.habilitadoVozVoto) return socio.habilitadoVozVoto.toLowerCase().includes('voto');
        return false;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Módulos...</p>
                </div>
            </div>
        );
    }

    // Mostrar el nuevo diseño premium para todos los usuarios
    return (
        <div className="animate-in fade-in duration-500">
            <SocioAssignments
                misListas={misListas}
                selectedLista={selectedLista}
                socios={socios}
                loadingSocios={loadingSocios}
                socioSearchTerm={socioSearchTerm}
                addingSocio={addingSocio}
                searchedSocio={searchedSocio}
                showConfirmModal={showConfirmModal}
                searchType={searchType}
                onSelectLista={handleSelectLista}
                onCreateClick={handleCreateLista}
                onSearchSocio={handleSearchSocio}
                onConfirmAddSocio={handleConfirmAddSocio}
                onCancelAdd={() => { setShowConfirmModal(false); setSearchedSocio(null); setSocioSearchTerm(""); }}
                onRemoveSocio={handleRemoveSocio}
                onSearchTermChange={setSocioSearchTerm}
                onSearchTypeChange={setSearchType}
                tieneVozYVoto={(socio) => {
                    if (socio.estadoVozVoto !== undefined) return socio.estadoVozVoto;
                    if (socio.habilitadoVozVoto) return socio.habilitadoVozVoto.toLowerCase().includes('voto');
                    return false;
                }}
                onDeleteLista={handleDeleteLista}
                onUpdateLista={handleUpdateLista}
            />

            {/* MODAL CREAR LISTA */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/50">
                            <h3 className="text-lg md:text-xl font-black text-slate-800 italic uppercase">Nueva Lista de Asignación</h3>
                        </div>
                        <div className="p-6 md:p-8 space-y-4 md:space-y-6">
                            <div>
                                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Identificador de Lista</label>
                                <input
                                    type="text"
                                    className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-100 border-2 border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-sm md:text-base text-slate-700 placeholder:text-slate-300"
                                    placeholder="Nombre descriptivo..."
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Notas Adicionales</label>
                                <textarea
                                    className="w-full px-5 md:px-6 py-3.5 md:py-4 bg-slate-100 border-2 border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white outline-none h-24 md:h-32 transition-all font-bold text-sm md:text-base text-slate-700 placeholder:text-slate-300 resize-none"
                                    placeholder="Detalles sobre este grupo..."
                                    value={newListDesc}
                                    onChange={(e) => setNewListDesc(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-6 md:p-8 bg-slate-50 flex flex-col md:flex-row gap-3 md:gap-4">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="order-2 md:order-1 flex-1 py-3.5 md:py-4 font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest text-[10px]"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleCreateLista}
                                disabled={!newListName}
                                className="order-1 md:order-2 flex-1 py-3.5 md:py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-teal-500 shadow-xl shadow-emerald-200 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                            >
                                Confirmar Creación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SOCIO YA ASIGNADO - Premium Animated */}
            {showAlreadyAssignedModal && alreadyAssignedInfo && (
                <div
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    onClick={() => setShowAlreadyAssignedModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header con Gradiente */}
                        <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-8 text-white overflow-hidden">
                            {/* Decorative Circles */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-8 -mb-8" />

                            <div className="relative z-10">
                                {/* Icon */}
                                <div className="inline-flex p-4 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-lg">
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl md:text-3xl font-black leading-tight mb-2">
                                    ¡Socio Ya Asignado!
                                </h2>
                                <p className="text-red-100 text-sm font-medium">
                                    Este socio ya pertenece a otra lista
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 md:p-8 space-y-5 md:space-y-6">
                            {/* Socio Info Card */}
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 md:p-6 border-2 border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">
                                    Información del Socio
                                </p>
                                <p className="text-lg md:text-xl font-black text-slate-800 mb-1">
                                    {alreadyAssignedInfo.socioNombre}
                                </p>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <span className="text-xs md:text-sm font-bold">N° {alreadyAssignedInfo.socioNro}</span>
                                </div>
                            </div>

                            {/* Assignment Info */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Detalles de Asignación
                                </p>

                                {/* Grid for assignment details on mobile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Lista */}
                                    <div className="flex items-start gap-3 p-3 md:p-4 bg-orange-50 rounded-xl border border-orange-200">
                                        <div className="p-2 bg-orange-500 rounded-lg shadow-lg shrink-0">
                                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-orange-600 font-bold uppercase tracking-wide">Lista</p>
                                            <p className="text-xs md:text-sm font-black text-slate-800 mt-0.5 truncate">{alreadyAssignedInfo.listaNombre}</p>
                                        </div>
                                    </div>

                                    {/* Usuario */}
                                    <div className="flex items-start gap-3 p-3 md:p-4 bg-violet-50 rounded-xl border border-violet-200">
                                        <div className="p-2 bg-violet-500 rounded-lg shadow-lg shrink-0">
                                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-violet-600 font-bold uppercase tracking-wide">Por</p>
                                            <p className="text-xs md:text-sm font-black text-slate-800 mt-0.5 truncate">{alreadyAssignedInfo.listaUsuario}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info Message */}
                            <div className="flex gap-2 md:gap-3 p-3 md:p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-[10px] md:text-xs text-blue-700 leading-relaxed font-medium">
                                    Un socio solo puede estar en una lista. Para moverlo, debe ser quitado de su lista actual primero.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setShowAlreadyAssignedModal(false)}
                                className="w-full py-3.5 md:py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-2xl font-bold text-xs md:text-sm hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg shadow-slate-300 active:scale-95"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL: SOCIO NO ENCONTRADO - Premium Animated */}
            {showNotFoundModal && (
                <div
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    onClick={() => setShowNotFoundModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header con Gradiente Azul */}
                        <div className="relative bg-gradient-to-r from-blue-500 via-emerald-500 to-teal-500 p-8 text-white overflow-hidden">
                            {/* Decorative Circles */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-8 -mb-8" />

                            <div className="relative z-10 text-center">
                                {/* Animated Icon */}
                                <div className="inline-flex p-5 bg-white/20 backdrop-blur rounded-full mb-4 shadow-lg">
                                    <svg className="w-12 h-12 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 10l4 4" />
                                    </svg>
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl md:text-3xl font-black leading-tight mb-2">
                                    Socio No Encontrado
                                </h2>
                                <p className="text-blue-100 text-sm font-medium">
                                    No pudimos localizar al socio buscado
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-5">
                            {/* Término buscado */}
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border-2 border-slate-200 text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                    Término buscado
                                </p>
                                <p className="text-2xl font-black text-slate-800 font-mono">
                                    "{notFoundTerm}"
                                </p>
                            </div>

                            {/* Sugerencias */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    ¿Qué puedes hacer?
                                </p>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">✓</span>
                                        Verifica que el número de cédula sea correcto
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">✓</span>
                                        Intenta con el número de socio en su lugar
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">✓</span>
                                        Confirma que el socio esté en el padrón actual
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setShowNotFoundModal(false)}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-bold text-sm hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SOCIO SOLO VOZ (sin derecho a voto) - Premium Animated */}
            {showSoloVozModal && soloVozInfo && (
                <div
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    onClick={() => setShowSoloVozModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header con Gradiente Ámbar/Naranja */}
                        <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-8 text-white overflow-hidden">
                            {/* Decorative Circles */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-8 -mb-8" />

                            <div className="relative z-10">
                                {/* Icon */}
                                <div className="inline-flex p-4 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-lg">
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl md:text-3xl font-black leading-tight mb-2">
                                    Solo Tiene Voz
                                </h2>
                                <p className="text-amber-100 text-sm font-medium">
                                    Este socio no cumple con todos los requisitos para votar
                                </p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 md:p-8 space-y-5 md:space-y-6">
                            {/* Socio Info Card */}
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 md:p-6 border-2 border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">
                                    Información del Socio
                                </p>
                                <p className="text-lg md:text-xl font-black text-slate-800 mb-1">
                                    {soloVozInfo.socioNombre}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        <span className="text-xs md:text-sm font-bold">N° {soloVozInfo.socioNro}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                        </svg>
                                        <span className="text-xs md:text-sm font-bold">CI: {soloVozInfo.cedula}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Requisitos Incumplidos */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Requisitos Pendientes para Votar
                                </p>

                                <div className="bg-red-50 rounded-xl border-2 border-red-200 p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {soloVozInfo.requisitosIncumplidos.map((req, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                {req}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Info Message */}
                            <div className="flex gap-2 md:gap-3 p-3 md:p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <svg className="w-4 h-4 md:w-5 md:h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-[10px] md:text-xs text-amber-700 leading-relaxed font-medium">
                                    <strong>Solo puedes agregar socios que tengan Voz y Voto.</strong><br />
                                    Este socio tiene obligaciones pendientes que le impiden votar en la asamblea.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setShowSoloVozModal(false)}
                                className="w-full py-3.5 md:py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-2xl font-bold text-xs md:text-sm hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg shadow-slate-300 active:scale-95"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Botón Flotante de Ayuda */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={handleManualTour}
                    className="p-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-lg shadow-violet-300 hover:scale-110 transition-transform group"
                    title="Reiniciar Guía"
                >
                    <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </button>
            </div>
        </div>
    );
}
