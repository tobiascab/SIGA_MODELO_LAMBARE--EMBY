"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, User, ChevronRight, Check, X, Users, ArrowLeft, UserCircle2, ShieldAlert } from "lucide-react";
import Swal from "sweetalert2";
import axios from "axios";

interface Lista {
    id: number;
    idUsuario: number;
    nombre: string;
    responsable: string;
    responsableUser: string;
    activa: boolean;
    total: number;
}

interface Socio {
    id: number;
    nombreCompleto: string;
    numeroSocio: string;
    cedula: string;
    vozYVoto: boolean;
    // Campos nuevos para seguridad
    yaAsignado?: boolean;
    asignadoA?: string;
    asignadoAUsuario?: string;
    fechaAsignacion?: string;
}

export default function DirectAssignmentMaster() {
    // ESTADOS
    const [step, setStep] = useState<1 | 2>(1); // 1: Elegir Responsable, 2: Asignar Socios

    // DATOS
    const [responsables, setResponsables] = useState<Lista[]>([]);
    const [filteredResponsables, setFilteredResponsables] = useState<Lista[]>([]);

    // SELECCIONES
    const [selectedTarget, setSelectedTarget] = useState<Lista | null>(null);
    const [socioEncontrado, setSocioEncontrado] = useState<Socio | null>(null);

    // INPUTS
    const [searchResponsable, setSearchResponsable] = useState("");
    const [searchSocio, setSearchSocio] = useState("");
    const [searchType, setSearchType] = useState(''); // '', 'cedula', 'nroSocio', 'nombre'

    // UI
    const [loading, setLoading] = useState(false);
    const [searchingSocio, setSearchingSocio] = useState(false);

    // REF para foco automático
    const socioInputRef = useRef<HTMLInputElement>(null);

    // Cargar responsables al inicio
    useEffect(() => {
        fetchResponsables();
    }, []);

    // Filtrar responsables localmente
    useEffect(() => {
        if (!searchResponsable) {
            setFilteredResponsables(responsables);
        } else {
            const term = searchResponsable.toLowerCase();
            const filtered = responsables.filter(r =>
                r.responsable.toLowerCase().includes(term) ||
                (r.responsableUser && r.responsableUser.toLowerCase().includes(term))
            );
            setFilteredResponsables(filtered);
        }
    }, [searchResponsable, responsables]);

    // Lógica BUSCADOR DE SOCIO (Paso 2)
    useEffect(() => {
        const timer = setTimeout(() => {
            const isNumeric = /^\d+$/.test(searchSocio);
            const minLength = isNumeric ? 1 : 2;

            if (searchSocio.length >= minLength) {
                performSearchSocio(searchSocio);
            } else if (searchSocio.length === 0) {
                setSocioEncontrado(null);
            }
        }, /^\d+$/.test(searchSocio) ? 100 : 300);

        return () => clearTimeout(timer);
    }, [searchSocio]);

    // --- FUNCIONES ---

    const fetchResponsables = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/asignaciones/admin/responsables", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResponsables(res.data);
            setFilteredResponsables(res.data);

            // Si solo hay uno, seleccionarlo automáticamente (opcional, pero práctico)
            if (res.data.length === 1) {
                selectResponsable(res.data[0]);
            }
        } catch (error) {
            console.error("Error cargando responsables:", error);
        }
    };

    const selectResponsable = (target: Lista) => {
        setSelectedTarget(target);
        setStep(2);
        setSearchSocio(""); // Limpiar búsqueda anterior
        setSocioEncontrado(null);
        // Dar foco al input de socio después de un breve delay para que renderice
        setTimeout(() => socioInputRef.current?.focus(), 100);
    };

    const performSearchSocio = async (term: string) => {
        setSearchingSocio(true);
        setSocioEncontrado(null);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/socios/buscar?term=${term}${searchType ? `&tipo=${searchType}` : ''}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (Array.isArray(res.data) && res.data.length > 0) {
                setSocioEncontrado(res.data[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSearchingSocio(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedTarget || !socioEncontrado) return;

        // VERIFICACIÓN PRECIA AL INTENTAR ASIGNAR
        if (socioEncontrado.yaAsignado) {
            Swal.fire({
                title: '¡Ya está registrado!',
                html: `
                    <div class="text-left mt-2">
                        <div class="bg-red-50 p-4 rounded-xl border border-red-100 shadow-inner">
                            <div class="mb-3 border-b border-red-200 pb-2 flex justify-between items-center">
                                <span class="text-xs font-bold text-red-500 uppercase tracking-widest">DETALLE DE ASIGNACIÓN</span>
                            </div>
                            
                            <div class="grid gap-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-slate-500 font-medium">Socio:</span>
                                    <span class="font-bold text-slate-800">${socioEncontrado.nombreCompleto}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500 font-medium">Asignado a:</span>
                                    <span class="font-bold text-teal-500">${socioEncontrado.asignadoAUsuario}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500 font-medium">Lista:</span>
                                    <span class="font-mono text-slate-600 text-xs text-right">${socioEncontrado.asignadoA}</span>
                                </div>
                                <div class="flex justify-between items-center pt-2 mt-2 border-t border-red-200/50">
                                    <span class="text-slate-500 font-medium">Fecha/Hora:</span>
                                    <span class="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        ${socioEncontrado.fechaAsignacion ? new Date(socioEncontrado.fechaAsignacion).toLocaleString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p class="text-slate-500 text-sm mt-4 text-center">Este socio no se puede volver a asignar.</p>
                    </div>
                `,
                icon: 'warning',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#0f172a',
                didClose: () => {
                    setSearchSocio("");
                    setSocioEncontrado(null);
                    socioInputRef.current?.focus();
                }
            });
            return; // DETENER PROCESO AQUÍ
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            await axios.post(
                `/api/asignaciones/admin/asignar-a-usuario/${selectedTarget.idUsuario || selectedTarget.id}`,
                { term: socioEncontrado.numeroSocio, tipo: 'nroSocio' },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Alerta Flotante (Toast)
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });

            Toast.fire({
                icon: 'success',
                title: `Asignado correctamente a ${selectedTarget.responsable}`
            });

            // Actualizar contador visualmente
            setSelectedTarget(prev => prev ? ({ ...prev, total: prev.total + 1 }) : null);

            // Actualizar lista global también para cuando volvamos al paso 1
            setResponsables(prev => prev.map(r => r.id === selectedTarget.id ? { ...r, total: r.total + 1 } : r));

            // RESETEO RÁPIDO PARA SEGUIR ASIGNANDO
            setSocioEncontrado(null);
            setSearchSocio("");
            // Foco de nuevo al input
            socioInputRef.current?.focus();

        } catch (error: any) {
            console.error("Error asignando:", error);

            if (error.response?.status === 409) {
                const data = error.response?.data || {};

                // Formato estructurado con detalles - DISEÑO PREMIUM
                if (data.error === "SOCIO_YA_ASIGNADO" && data.listaNombre) {
                    Swal.fire({
                        title: '',
                        html: `
                            <div class="text-center">
                                <!-- Header con gradiente -->
                                <div class="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 -mx-6 -mt-6 px-6 pt-8 pb-6 rounded-t-xl mb-6">
                                    <div class="w-20 h-20 mx-auto bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-4 border-4 border-white/30 shadow-xl">
                                        <span class="text-4xl">⚠️</span>
                                    </div>
                                    <h2 class="text-xl font-black text-white tracking-tight">¡Ya está asignado!</h2>
                                    <p class="text-white/80 text-sm mt-1">Este socio pertenece a otra lista</p>
                                </div>
                                
                                <!-- Tarjeta del Socio -->
                                <div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 mb-4 border border-slate-200 shadow-inner">
                                    <div class="flex items-center gap-4">
                                        <div class="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                                            ${(data.socioNombre || 'XX').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <div class="text-left flex-1">
                                            <p class="font-black text-slate-800 text-lg leading-tight">${data.socioNombre || 'N/A'}</p>
                                            <p class="text-xs text-slate-500 font-medium mt-0.5">Socio del Padrón</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Detalles de Asignación -->
                                <div class="space-y-3 text-left px-1">
                                    <div class="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <div class="flex items-center gap-2">
                                            <span class="text-lg">👤</span>
                                            <span class="text-sm text-slate-600">Asignado a</span>
                                        </div>
                                        <span class="font-bold text-teal-500 text-sm">${data.listaUsuario || 'Otro usuario'}</span>
                                    </div>
                                    
                                    <div class="flex items-center justify-between p-3 bg-violet-50 rounded-xl border border-violet-100">
                                        <div class="flex items-center gap-2">
                                            <span class="text-lg">📋</span>
                                            <span class="text-sm text-slate-600">Lista</span>
                                        </div>
                                        <span class="font-bold text-violet-700 text-xs">${data.listaNombre || 'N/A'}</span>
                                    </div>
                                    
                                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <div class="flex items-center gap-2">
                                            <span class="text-lg">🕐</span>
                                            <span class="text-sm text-slate-600">Fecha/Hora</span>
                                        </div>
                                        <span class="font-mono font-bold text-slate-800 text-xs bg-white px-2 py-1 rounded-lg border border-slate-200">
                                            ${data.fechaAsignacion ? new Date(data.fechaAsignacion).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `,
                        showCloseButton: true,
                        confirmButtonText: '✓ Entendido',
                        confirmButtonColor: '#0f172a',
                        customClass: {
                            popup: 'rounded-3xl shadow-2xl',
                            confirmButton: 'rounded-xl font-bold px-8 py-3'
                        }
                    });
                } else {
                    // Error 409 genérico sin detalles estructurados
                    Swal.fire({
                        title: '¡Socio ya asignado!',
                        text: data.message || 'Este socio ya está asignado a otra lista y no puede ser reasignado.',
                        icon: 'warning',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#0f172a'
                    });
                }

                // Limpiar para siguiente búsqueda
                setSocioEncontrado(null);
                setSearchSocio("");
                socioInputRef.current?.focus();
            } else {
                Swal.fire("Error", error.response?.data?.message || "No se pudo realizar la asignación", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-2 sm:p-4 min-h-screen">

            {/* HEADER */}
            <header className="mb-4 sm:mb-8 text-center md:text-left">
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Asignación <span className="text-emerald-500">Admin</span>
                </h1>
                <p className="text-xs sm:text-base text-slate-500 font-medium">Sistema rápido de distribución de socios.</p>
            </header>

            {/* ERROR DE ESTADO (Por seguridad) */}
            {!responsables && <div className="p-4 bg-red-100 text-red-700 rounded-lg">Error cargando datos.</div>}

            {/* --- PASO 1: SELECCIONAR RESPONSABLE --- */}
            {step === 1 && (
                <div className="animate-in slide-in-from-left duration-300">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

                        {/* Buscador de Responsable Header */}
                        <div className="p-3 sm:p-6 bg-slate-50 border-b border-slate-100">
                            <label className="block text-xs sm:text-sm font-bold text-emerald-500 uppercase tracking-wider mb-2">
                                Paso 1: Selecciona Responsable
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por Nombre, Usuario..."
                                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-200 rounded-xl text-sm sm:text-lg font-bold text-slate-800 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                                    value={searchResponsable}
                                    onChange={e => setSearchResponsable(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Lista de Resultados */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                            {filteredResponsables.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    No se encontraron responsables.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2">
                                    {filteredResponsables.map((resp) => (
                                        <button
                                            key={resp.id}
                                            onClick={() => selectResponsable(resp)}
                                            className="flex items-center p-3 sm:p-4 bg-white hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-xl transition-all group text-left"
                                        >
                                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-base sm:text-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors mr-3 sm:mr-4 shrink-0">
                                                {resp.responsable.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-slate-800 text-sm sm:text-lg leading-tight group-hover:text-teal-500 truncate">
                                                    {resp.responsable}
                                                </div>
                                                <div className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 truncate">
                                                    <UserCircle2 className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{resp.responsableUser}</span>
                                                </div>
                                            </div>
                                            <div className="ml-auto flex flex-col items-end shrink-0">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold mb-1">
                                                    {resp.total}
                                                </span>
                                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-300 group-hover:text-emerald-500" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- PASO 2: BUSCAR SOCIO Y ASIGNAR --- */}
            {step === 2 && selectedTarget && (
                <div className="animate-in slide-in-from-right duration-300">

                    {/* BARRA SUPERIOR CON RESPONSABLE SELECCIONADO */}
                    <div className="flex items-center justify-between bg-slate-900 text-white p-3 sm:p-4 rounded-t-2xl shadow-lg">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            <button
                                onClick={() => setStep(1)}
                                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
                                title="Cambiar Responsable"
                            >
                                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                            <div className="min-w-0">
                                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                                    Asignando a:
                                </div>
                                <div className="text-sm sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <span className="truncate">{selectedTarget.responsable}</span>
                                    <span className="bg-white/10 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-mono text-slate-300 hidden sm:inline">
                                        {selectedTarget.responsableUser}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-500 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-base shrink-0 ml-2">
                            {selectedTarget.total}
                        </div>
                    </div>

                    <div className="bg-white border-x border-b border-slate-200 shadow-xl rounded-b-2xl p-3 sm:p-6 md:p-10 space-y-4 sm:space-y-8 min-h-[300px] sm:min-h-[400px]">

                        {/* Buscador de SOCIO */}
                        <div className="relative">
                            <div className="text-xs sm:text-sm font-bold text-slate-400 uppercase mb-1.5 sm:mb-2">Paso 2: Buscar Socio</div>

                            {/* Search Type Selector - 3-column grid */}
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
                                {[
                                    { value: '', label: 'Todos', icon: '🔍' },
                                    { value: 'cedula', label: 'CI', icon: '🪪' },
                                    { value: 'nroSocio', label: 'N° Socio', icon: '🔢' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setSearchType(opt.value)}
                                        className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all border-2 ${searchType === opt.value
                                            ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-200 scale-[1.02]'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 active:scale-95'
                                            }`}
                                    >
                                        <span className="text-base sm:text-sm leading-none">{opt.icon}</span>
                                        <span className="leading-tight">{opt.label}</span>
                                        {searchType === opt.value && (
                                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-300 rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="relative">
                                <Search className={`absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-8 sm:w-8 transition-colors ${searchingSocio ? 'text-emerald-500 animate-pulse' : 'text-slate-300'}`} />
                                <input
                                    ref={socioInputRef}
                                    type="text"
                                    inputMode={searchType === 'cedula' || searchType === 'nroSocio' ? 'numeric' : 'text'}
                                    placeholder={
                                        searchType === 'cedula' ? 'Ingresá el N° de Cédula...' :
                                            searchType === 'nroSocio' ? 'Ingresá el N° de Socio...' :
                                                'Cédula o N° Socio...'
                                    }
                                    className="w-full pl-10 sm:pl-16 pr-10 sm:pr-4 py-3.5 sm:py-6 bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl sm:rounded-2xl text-xl sm:text-3xl md:text-4xl font-black text-slate-800 placeholder:text-slate-300 outline-none transition-all shadow-inner"
                                    value={searchSocio}
                                    onChange={e => setSearchSocio(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            performSearchSocio(searchSocio);
                                        }
                                    }}
                                />
                                {searchSocio && (
                                    <button
                                        onClick={() => { setSearchSocio(""); setSocioEncontrado(null); socioInputRef.current?.focus(); }}
                                        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 hover:bg-slate-200 rounded-full text-slate-400"
                                    >
                                        <X className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </button>
                                )}
                            </div>
                            <p className="mt-1.5 sm:mt-2 text-slate-400 text-xs sm:text-sm hidden sm:block">
                                Presiona <kbd className="bg-slate-100 border border-slate-300 rounded px-1 text-xs">ENTER</kbd> para búsqueda inmediata.
                            </p>
                        </div>

                        {/* RESULTADO Y ACCIÓN */}
                        <div className="transition-all duration-300">
                            {searchingSocio && (
                                <div className="text-center py-10">
                                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-2" />
                                    <p className="text-slate-500 font-medium">Buscando en padrón...</p>
                                </div>
                            )}

                            {!socioEncontrado && !searchingSocio && searchSocio.length > 2 && (
                                <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <div className="text-4xl mb-2">🤷‍♂️</div>
                                    <p className="text-slate-500 font-bold">No se encontró al socio</p>
                                    <p className="text-slate-400 text-sm">Verifica el número o la cédula.</p>
                                </div>
                            )}

                            {socioEncontrado && (
                                <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-6 md:p-8 animate-in zoom-in-95 duration-200 ${socioEncontrado.yaAsignado ? 'bg-red-50 border-red-200' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                    <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-6">

                                        {/* Datos Socio */}
                                        <div className="flex-1 text-center md:text-left min-w-0 w-full">
                                            {socioEncontrado.yaAsignado ? (
                                                <div className="inline-block bg-red-100 text-red-700 text-[10px] sm:text-xs font-bold px-2 py-1 rounded mb-1.5 sm:mb-2 uppercase animate-pulse">
                                                    ⚠️ YA ASIGNADO
                                                </div>
                                            ) : (
                                                <div className="inline-block bg-emerald-100 text-teal-500 text-[10px] sm:text-xs font-bold px-2 py-1 rounded mb-1.5 sm:mb-2 uppercase">
                                                    Socio Encontrado
                                                </div>
                                            )}

                                            <h3 className="text-lg sm:text-3xl font-black text-slate-800 mb-1 sm:mb-2 truncate">
                                                {socioEncontrado.nombreCompleto}
                                            </h3>
                                            <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-4 text-xs sm:text-base text-slate-600 font-medium">
                                                <span>CI: <strong className="text-slate-900">{socioEncontrado.cedula}</strong></span>
                                                <span>•</span>
                                                <span>N°: <strong className="text-slate-900">{socioEncontrado.numeroSocio}</strong></span>
                                            </div>

                                            {/* ALERTA DE YA ASIGNADO */}
                                            {socioEncontrado.yaAsignado && (
                                                <div className="mt-2 sm:mt-4 bg-white/80 p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-red-100 text-red-700 shadow-sm">
                                                    <div className="font-bold flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 text-red-800 text-xs sm:text-base">
                                                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                                                        No se puede re-asignar
                                                    </div>
                                                    <div className="text-[11px] sm:text-sm space-y-0.5 sm:space-y-1">
                                                        <div>👤 <strong className="text-slate-900">{socioEncontrado.asignadoAUsuario}</strong></div>
                                                        <div>📋 <strong>{socioEncontrado.asignadoA}</strong></div>
                                                        <div>🕒 <span className="font-mono text-red-600">{socioEncontrado.fechaAsignacion ? new Date(socioEncontrado.fechaAsignacion).toLocaleString() : 'N/A'}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Botón Acción */}
                                        <div className="shrink-0 w-full md:w-auto">
                                            <button
                                                onClick={handleAssign}
                                                disabled={loading}
                                                className={`w-full md:w-auto text-sm sm:text-xl font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${socioEncontrado.yaAsignado
                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'
                                                    : 'bg-slate-900 hover:bg-emerald-500 text-white hover:shadow-emerald-500/30 active:scale-95'
                                                    }`}
                                            >
                                                {loading ? <Loader2 className="animate-spin" /> : (
                                                    <>
                                                        {socioEncontrado.yaAsignado ? "VERIFICAR" : "ASIGNAR"}
                                                        {socioEncontrado.yaAsignado ? <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" /> : <Check className="h-5 w-5 sm:h-6 sm:w-6" />}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="mt-4 text-center">
                        <p className="text-sm text-slate-400">
                            Modo de asignación rápida activado. Al asignar, el buscador se limpiará automáticamente.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}
