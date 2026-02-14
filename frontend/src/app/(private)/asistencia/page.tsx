"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
    Search, User, Users, CheckCircle, XCircle, AlertCircle,
    ChevronDown, Menu, Loader2, QrCode, CreditCard, Clock, Check, Trash2,
    X, MapPin, ChevronRight
} from "lucide-react";
import { Toaster, toast } from "sonner";

interface FoundSocio {
    id: number;
    nombreCompleto: string;
    numeroSocio: string;
    cedula: string;
    conVozYVoto: boolean;

    // Asistencia
    asistenciaConfirmada: boolean;
    fechaAsistencia?: string;

    // Campos de estado de cuenta
    aporteAlDia: boolean;
    solidaridadAlDia: boolean;
    fondoAlDia: boolean;
    incoopAlDia: boolean;
    creditoAlDia: boolean;
    estadoVozVoto?: boolean;
    habilitadoVozVoto?: string;

    sucursal?: { nombre: string };
}

interface AsistenciaItem {
    id: number;
    fechaHora: string;
    socioNombre: string;
    socioNumero: string;
    vozVoto: boolean;
}

import { AssemblyCountdownGate } from "@/components/AssemblyCountdownGate";

export default function AsistenciaPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [foundSocios, setFoundSocios] = useState<FoundSocio[]>([]);
    const [loading, setLoading] = useState(false);
    const [marking, setMarking] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string>("");
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Lista de asistencias del día
    const [asistenciasHoy, setAsistenciasHoy] = useState<AsistenciaItem[]>([]);

    // Cargar asistencias y rol de usuario al inicio
    useEffect(() => {
        fetchAsistenciasHoy();
        fetchUserRole();
        const interval = setInterval(fetchAsistenciasHoy, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchUserRole = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserRole(res.data.rol || "");
        } catch (error) {
            console.error("Error fetching user role", error);
        }
    };

    const fetchAsistenciasHoy = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/asistencia/hoy", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAsistenciasHoy(res.data);
        } catch (error) {
            console.error("Error cargando asistencias", error);
        }
    };

    // Búsqueda en tiempo real
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchTerm.trim().length >= 1) {
            searchTimeoutRef.current = setTimeout(() => {
                buscarSocios(searchTerm);
            }, 600);
        } else if (searchTerm === "") {
            setFoundSocios([]);
            setHasSearched(false);
        }

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchTerm]);

    const buscarSocios = async (term: string) => {
        setLoading(true);
        setHasSearched(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/socios/buscar?term=${term}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Mapemos la respuesta para asegurar compatibilidad
            const socios = res.data.map((s: FoundSocio) => ({
                ...s,
                conVozYVoto: s.estadoVozVoto !== undefined ? s.estadoVozVoto : (s.habilitadoVozVoto ? s.habilitadoVozVoto.toLowerCase().includes('voto') : (s.conVozYVoto !== undefined ? s.conVozYVoto : false)),
                asistenciaConfirmada: asistenciasHoy.some((a: AsistenciaItem) => a.socioNumero === s.numeroSocio)
            }));

            setFoundSocios(socios);
        } catch (error) {
            console.error("Error buscando socios", error);
            toast.error("Error al buscar socios");
        } finally {
            setLoading(false);
        }
    };

    // Estado para el modal de éxito con mesa
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [checkinInfo, setCheckinInfo] = useState<{
        nombre: string;
        numeroSocio: string;
        numeroOrden: number;
        vozVoto: boolean;
        mesa: {
            numero: number;
            mensaje: string;
            rango: string;
            responsables: string[];
            ubicacion: string;
        }
    } | null>(null);

    const marcarAsistencia = async (socioId: number) => {
        setMarking(socioId);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `/api/asistencia/marcar`,
                { socioId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = res.data;

            // Si el backend devolvió info de la mesa, la guardamos para el modal
            if (data.mesa) {
                setCheckinInfo({
                    nombre: data.socioNombre,
                    numeroSocio: data.socioNumero,
                    numeroOrden: data.numeroOrden,
                    vozVoto: data.vozVoto,
                    mesa: data.mesa
                });
                setShowSuccessModal(true);
            }

            // Actualizar estado local
            setFoundSocios(prev => prev.map(s =>
                s.id === socioId
                    ? { ...s, asistenciaConfirmada: true, fechaAsistencia: new Date().toISOString() }
                    : s
            ));

            toast.success("Asistencia registrada correctamente");
            fetchAsistenciasHoy();

        } catch (error: any) {
            console.error("Error marcando asistencia", error);
            const msg = error.response?.data?.error || "Error al marcar asistencia";
            toast.error(msg);
        } finally {
            setMarking(null);
        }
    };

    const eliminarAsistencia = async (socioId: number, nombreSocio: string) => {
        if (!confirm(`¿Estás seguro de eliminar la asistencia de ${nombreSocio}?`)) {
            return;
        }

        setDeleting(socioId);
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/asistencia/eliminar/${socioId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setFoundSocios((prev: FoundSocio[]) => prev.map((s: FoundSocio) =>
                s.id === socioId
                    ? { ...s, asistenciaConfirmada: false, fechaAsistencia: undefined }
                    : s
            ));

            toast.success("Asistencia eliminada correctamente");
            fetchAsistenciasHoy();

        } catch (error: any) {
            console.error("Error eliminando asistencia", error);
            const msg = error.response?.data?.error || "Error al eliminar asistencia";
            toast.error(msg);
        } finally {
            setDeleting(null);
        }
    };

    // Estadísticas rápidas
    const totalPresentes = asistenciasHoy.length;
    const conVoto = asistenciasHoy.filter(a => a.vozVoto).length;
    const isSuperAdmin = userRole === "SUPER_ADMIN";

    return (
        <AssemblyCountdownGate>
            <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 min-h-screen relative">
                <Toaster position="top-center" richColors />

                {/* Header Premium - Compacto en móvil */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 sm:pt-10">
                    <h1 className="text-2xl sm:text-5xl font-black text-slate-800 tracking-tight text-center sm:text-left">
                        Registro <span className="text-emerald-600">Asistencia</span>
                    </h1>

                    <div className="flex gap-3 shrink-0">
                        <div className="bg-white px-4 py-2 rounded-2xl shadow-lg border border-emerald-50 text-center min-w-[100px]">
                            <p className="text-xl font-black text-emerald-500 leading-none">{totalPresentes}</p>
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">Presentes</p>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl shadow-lg border border-blue-50 text-center min-w-[100px]">
                            <p className="text-xl font-black text-blue-500 leading-none">{conVoto}</p>
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">Votan</p>
                        </div>
                    </div>
                </div>

                {/* Buscador Superior - Compacto */}
                <div className="sticky top-2 z-30">
                    <div className="bg-white p-3 md:p-5 rounded-[2rem] shadow-2xl border border-slate-100 flex items-center gap-3">
                        <div className="bg-emerald-500 h-10 w-10 md:h-14 md:w-14 rounded-xl flex items-center justify-center shrink-0">
                            <Search className="h-5 w-5 md:h-7 md:w-7 text-white" />
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Cédula o N° Socio..."
                            className="w-full bg-transparent border-none text-lg md:text-2xl font-black text-slate-800 focus:ring-0 outline-none placeholder:text-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-4 md:space-y-6">
                        {foundSocios.map((socio: FoundSocio) => (
                            <div key={socio.id} className="bg-white rounded-[2rem] p-5 md:p-8 shadow-xl border border-slate-50 flex flex-col md:flex-row items-center gap-6 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden h-full">
                                <div className="h-20 w-20 md:h-28 md:w-28 bg-slate-50 rounded-[1.5rem] flex items-center justify-center border border-white shadow-inner shrink-0 overflow-hidden">
                                    <User className="h-10 w-10 md:h-16 md:w-16 text-slate-200" />
                                </div>
                                <div className="flex-1 min-w-0 text-center md:text-left space-y-2">
                                    <h3 className="text-xl md:text-3xl font-black text-slate-900 leading-tight truncate uppercase tracking-tighter">{socio.nombreCompleto}</h3>
                                    <div className="flex items-center justify-center md:justify-start gap-4">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">#{socio.numeroSocio}</span>
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border ${socio.conVozYVoto ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                                            <div className={`h-2 w-2 rounded-full ${socio.conVozYVoto ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{socio.conVozYVoto ? 'Vota' : 'Solo Voz'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto shrink-0 flex justify-center">
                                    {socio.asistenciaConfirmada ? (
                                        <div className="flex flex-col items-center md:items-end gap-2">
                                            <div className="bg-emerald-500 text-white font-black px-6 py-3 md:px-8 md:py-4 rounded-2xl flex items-center gap-3 shadow-xl">
                                                <Check className="h-5 w-5 md:h-6 md:w-6" strokeWidth={4} />
                                                <span className="text-xs md:text-base">REGISTRADO</span>
                                            </div>
                                            {userRole === 'ADMIN' && (
                                                <button
                                                    onClick={() => eliminarAsistencia(socio.id, socio.nombreCompleto)}
                                                    className="text-red-500 font-black text-[9px] uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
                                                >
                                                    ELIMINAR REGISTRO
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => marcarAsistencia(socio.id)}
                                            disabled={marking === socio.id}
                                            className="w-full md:w-auto bg-slate-900 border-b-6 border-black hover:bg-emerald-600 hover:border-emerald-800 text-white font-black px-8 py-5 md:px-12 md:py-6 rounded-2xl md:rounded-3xl transition-all active:translate-y-2 shadow-2xl uppercase tracking-widest text-xs md:text-lg disabled:bg-slate-300 disabled:border-slate-400"
                                        >
                                            {marking === socio.id ? "PROCESANDO..." : "REGISTRAR"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {hasSearched && foundSocios.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                                <Search className="h-16 w-16 text-slate-100 mx-auto mb-4" />
                                <h3 className="text-xl font-black text-slate-300 uppercase italic">Sin resultados</h3>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-50 sticky top-24 hidden lg:block">
                        <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-3 mb-6">
                            <Clock className="h-6 w-6 text-emerald-500" />
                            Últimos Ingresantes
                        </h3>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                            {asistenciasHoy.map((a) => (
                                <div key={a.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-emerald-100 transition-all">
                                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-300 italic shadow-sm shrink-0">
                                        {a.socioNombre.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-800 truncate">{a.socioNombre}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{a.socioNumero} • {new Date(a.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}hs</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Modal de Éxito Premium con Mesa - RESPONSIVO */}
                {showSuccessModal && checkinInfo && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setShowSuccessModal(false)}
                        />

                        {/* VERSIÓN MÓVIL - Compacta */}
                        <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 md:hidden">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-black text-sm uppercase">¡Registro Exitoso!</span>
                                </div>
                                <button onClick={() => setShowSuccessModal(false)} className="p-1.5 bg-white/20 rounded-full">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="text-center">
                                    <h3 className="text-base font-black text-slate-800 uppercase leading-tight truncate">{checkinInfo.nombre}</h3>
                                    <div className="flex justify-center gap-2 mt-1">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">#{checkinInfo.numeroSocio}</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Orden: #{checkinInfo.numeroOrden}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${checkinInfo.vozVoto ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {checkinInfo.vozVoto ? 'VOZ Y VOTO' : 'SOLO VOZ'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl p-4 text-center">
                                    <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">Dirigirse a la</p>
                                    <h4 className="text-4xl font-black text-slate-900 tracking-tighter italic">MESA <span className="text-emerald-500">{checkinInfo.mesa.numero}</span></h4>
                                    <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-emerald-100 mt-3">
                                        <MapPin className="h-3 w-3 text-emerald-500" />
                                        <p className="text-[10px] font-bold text-slate-600 uppercase">{checkinInfo.mesa.ubicacion}</p>
                                    </div>
                                    {checkinInfo.mesa.responsables && checkinInfo.mesa.responsables.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-emerald-200">
                                            <p className="text-slate-400 text-[9px] font-bold uppercase mb-2">Encargados:</p>
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {checkinInfo.mesa.responsables.map((resp: string, idx: number) => (
                                                    <span key={idx} className="bg-white px-2 py-1 rounded text-[10px] font-bold text-slate-600 border border-slate-100">{resp}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setShowSuccessModal(false)} className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-3 rounded-xl uppercase tracking-wider text-sm flex items-center justify-center gap-2">
                                    CONTINUAR <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* VERSIÓN ESCRITORIO - Premium */}
                        <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 hidden md:block">
                            {/* Header con gradiente premium */}
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white relative">
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="bg-white/20 p-3 rounded-2xl">
                                        <CheckCircle className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight">¡Registro Exitoso!</h2>
                                        <p className="opacity-80 font-bold uppercase tracking-widest text-xs">Asamblea General de Socios</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Información del Socio */}
                                <div className="text-center space-y-1">
                                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Socio Registrado</p>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase italic leading-tight">{checkinInfo.nombre}</h3>
                                    <div className="flex justify-center gap-4 mt-2">
                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-black italic">SOCIO #{checkinInfo.numeroSocio}</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black italic uppercase">ORDEN: #{checkinInfo.numeroOrden}</span>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black italic ${checkinInfo.vozVoto ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {checkinInfo.vozVoto ? 'VOZ Y VOTO' : 'SOLO VOZ'}
                                        </span>
                                    </div>
                                </div>

                                {/* TARJETA DE MESA - Premium */}
                                <div className="bg-slate-50 border-2 border-dashed border-emerald-200 rounded-[2rem] p-8 relative overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                                    <div className="relative text-center">
                                        <p className="text-emerald-600 text-xs font-black uppercase tracking-[0.3em] mb-2">Dirigirse a la</p>
                                        <h4 className="text-8xl font-black text-slate-900 tracking-tighter mb-4 italic">
                                            MESA <span className="text-emerald-500">{checkinInfo.mesa.numero}</span>
                                        </h4>
                                        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100 mb-6">
                                            <MapPin className="h-4 w-4 text-emerald-500" />
                                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">{checkinInfo.mesa.ubicacion}</p>
                                        </div>
                                        {checkinInfo.mesa.responsables && checkinInfo.mesa.responsables.length > 0 && (
                                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Encargados de Mesa:</p>
                                                <div className="flex flex-wrap justify-center gap-2">
                                                    {checkinInfo.mesa.responsables.map((resp: string, idx: number) => (
                                                        <div key={idx} className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm flex items-center gap-2">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{resp}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Botón de cierre Premium */}
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl uppercase tracking-widest text-lg group"
                                >
                                    <span className="flex items-center justify-center gap-3">
                                        CONTINUAR REGISTRO <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AssemblyCountdownGate>
    );
}
