"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Search,
    UserCheck,
    Printer,
    AlertCircle,
    ShieldCheck,
    MapPin,
    Loader2,
    Users,
    Clock,
    CheckCircle2,
    AlertTriangle,
    X
} from "lucide-react";
import axios from "axios";
import { createRoot } from "react-dom/client";
import SocioCarnet, { SocioCarnetBase } from "@/components/carnet/SocioCarnet";
import { useConfig } from "@/context/ConfigContext";

interface Socio {
    id: number;
    numeroSocio: string;
    nombreCompleto: string;
    cedula: string;
    telefono: string | null;
    sucursal: { id: number; nombre: string; codigo: string } | null;
    aporteAlDia: boolean;
    solidaridadAlDia: boolean;
    fondoAlDia: boolean;
    incoopAlDia: boolean;
    creditoAlDia: boolean;
    estadoVozVoto?: boolean;
    habilitadoVozVoto?: string;
    presente?: boolean;
    horaIngreso?: string;
}

interface CheckinStat {
    total: number;
    presentes: number;
}

import { AssemblyCountdownGate } from "@/components/AssemblyCountdownGate";

export default function CheckInPage() {
    const [query, setQuery] = useState("");
    const [socioEncontrado, setSocioEncontrado] = useState<Socio | null>(null);
    const [searching, setSearching] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [checkinLoading, setCheckinLoading] = useState(false);
    const [checkinSuccess, setCheckinSuccess] = useState(false);
    const [stats, setStats] = useState<CheckinStat>({ total: 0, presentes: 0 });
    const [ultimosCheckins, setUltimosCheckins] = useState<Socio[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const { nombreAsamblea, fechaAsamblea } = useConfig();

    // Estado para modal de socio ya ingresado
    const [showYaIngresoModal, setShowYaIngresoModal] = useState(false);
    const [yaIngresoInfo, setYaIngresoInfo] = useState<{
        socioNombre: string;
        socioNumero: string;
        horaIngreso: string;
        operadorRegistro: string;
    } | null>(null);

    // Estado para modal de mesa (check-in exitoso)
    const [showMesaModal, setShowMesaModal] = useState(false);
    const [mesaInfo, setMesaInfo] = useState<{
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

    const fetchStats = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get("/api/socios/estadisticas", { headers });
            setStats({
                total: response.data.totalPadron || 0,
                presentes: response.data.presentes || 0
            });
        } catch (error) {
            console.error("Error:", error);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        inputRef.current?.focus();
    }, [fetchStats]);

    const tieneVozYVoto = (socio: Socio) => {
        if (socio.estadoVozVoto !== undefined) return socio.estadoVozVoto;
        if (socio.habilitadoVozVoto) return socio.habilitadoVozVoto.toLowerCase().includes('voto');
        return false;
    };

    // Nueva función reutilizable de búsqueda
    const performSearch = useCallback(async (searchTerm: string) => {
        if (!searchTerm.trim()) {
            setSocioEncontrado(null);
            setNotFound(false);
            return;
        }

        setSearching(true);
        setNotFound(false);
        setSocioEncontrado(null);
        setCheckinSuccess(false);

        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Usar endpoint de búsqueda parcial/exacta
            const response = await axios.get(
                `/api/socios/buscar?term=${encodeURIComponent(searchTerm.trim())}`,
                { headers }
            );

            if (response.data && response.data.length > 0) {
                // Si la búsqueda es exacta (ej. cédula completa o nro socio), el backend lo pone primero
                setSocioEncontrado(response.data[0]);
            } else {
                setNotFound(true);
            }
        } catch (error) {
            console.error("Error al buscar:", error);
            // No mostrar error 404 como alert, solo estado notFound
            setNotFound(true);
        } finally {
            setSearching(false);
        }
    }, []);

    // Effect para búsqueda automática (Debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length >= 1) {
                performSearch(query);
            } else if (query.trim().length === 0) {
                setSocioEncontrado(null);
                setNotFound(false);
            }
        }, 500); // 500ms de espera al escribir

        return () => clearTimeout(timer);
    }, [query, performSearch]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(query);
    };

    const handleCheckin = async () => {
        if (!socioEncontrado) return;

        setCheckinLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post("/api/asistencia/marcar",
                { socioId: socioEncontrado.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = response.data;

            // Mostrar modal de mesa si viene la información
            if (data.mesa) {
                setMesaInfo({
                    nombre: data.socioNombre,
                    numeroSocio: data.socioNumero,
                    numeroOrden: data.numeroOrden,
                    vozVoto: data.vozVoto,
                    mesa: data.mesa
                });
                setShowMesaModal(true);
            }

            setUltimosCheckins(prev => [
                { ...socioEncontrado, horaIngreso: new Date().toLocaleTimeString() },
                ...prev.slice(0, 4)
            ]);

            // Actualizar estadísticas inmediatamente
            fetchStats();

            // Limpiar búsqueda pero NO cerrar modal automáticamente
            setQuery("");
            setSocioEncontrado(null);

        } catch (error: any) {
            // Manejar error de socio ya ingresado
            if (error.response?.status === 409 && error.response?.data?.error === 'SOCIO_YA_INGRESO') {
                setYaIngresoInfo({
                    socioNombre: error.response.data.socioNombre,
                    socioNumero: error.response.data.socioNumero,
                    horaIngreso: error.response.data.horaIngreso,
                    operadorRegistro: error.response.data.operadorRegistro
                });
                setShowYaIngresoModal(true);
                setSocioEncontrado(null);
                setQuery("");
            } else {
                console.error("Error en check-in:", error);
                alert("Error al registrar asistencia. Intente nuevamente.");
            }
        } finally {
            setCheckinLoading(false);
        }
    };

    const resetSearch = () => {
        setQuery("");
        setSocioEncontrado(null);
        setNotFound(false);
        setCheckinSuccess(false);
        inputRef.current?.focus();
    };

    const handlePrint = () => {
        if (!socioEncontrado) return;

        const printWindow = window.open('', '_blank', 'width=800,height=800');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Imprimir Carnet - ${socioEncontrado.nombreCompleto}</title>
                    <base href="${window.location.origin}/">
                    <meta charset="utf-8" />
                    <style>
                        body { 
                            margin: 0; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh; 
                            background: white; 
                        }
                        @media print {
                            @page { size: 100mm 100mm; margin: 0; }
                            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            #print-root { width: 100%; height: 100%; }
                        }
                    </style>
                </head>
                <body>
                    <div id="print-root"></div>
                </body>
            </html>
        `);
        printWindow.document.close();

        // Inyectar estilos del documento padre (Tailwind, fuentes, etc.)
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach(style => {
            printWindow.document.head.appendChild(style.cloneNode(true));
        });

        const printRoot = printWindow.document.getElementById('print-root');
        if (printRoot) {
            const root = createRoot(printRoot);
            root.render(
                <SocioCarnetBase
                    socio={{
                        nroSocio: socioEncontrado.numeroSocio,
                        nombreCompleto: socioEncontrado.nombreCompleto,
                        tieneVoto: tieneVozYVoto(socioEncontrado),
                        cedula: socioEncontrado.cedula
                    }}
                    config={{
                        nombreAsamblea,
                        fechaAsamblea
                    }}
                />
            );

            // Esperar a que se renderice y carguen imágenes
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 1000);
        }
    };

    return (
        <AssemblyCountdownGate>
            <div className="mx-auto space-y-6" style={{ maxWidth: 'clamp(320px, 95vw, 900px)', padding: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
                {/* Header con stats - Compacto en móvil */}
                <div className="flex flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-3 rounded-3xl border border-white md:bg-transparent md:p-0 md:rounded-none md:border-none">
                    <div className="flex-1 md:text-center">
                        <h1 className="text-lg md:text-3xl font-black text-slate-800 tracking-tight leading-none">Registro</h1>
                        <p className="text-slate-500 text-[10px] md:text-sm">Asistencia</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <div className="bg-white rounded-2xl px-3 py-2 border border-slate-100 text-center min-w-[80px] md:min-w-[120px] shadow-sm">
                            <p className="text-sm md:text-2xl font-black text-slate-800 leading-none">{stats.total.toLocaleString()}</p>
                            <p className="text-[8px] md:text-xs text-slate-400 uppercase font-bold mt-0.5">Padrón</p>
                        </div>
                        <div className="bg-emerald-500 rounded-2xl px-3 py-2 border border-emerald-400 text-center min-w-[80px] md:min-w-[120px] shadow-lg shadow-emerald-200">
                            <p className="text-sm md:text-2xl font-black text-white leading-none">{stats.presentes}</p>
                            <p className="text-[8px] md:text-xs text-emerald-100 uppercase font-bold mt-0.5">Presentes</p>
                        </div>
                    </div>
                </div>

                {/* Buscador Central - Compacto en móvil */}
                <div className="bg-white rounded-[2rem] shadow-xl md:shadow-2xl md:p-8 p-4 border border-slate-100 relative overflow-hidden">
                    <form onSubmit={handleSearch} className="relative z-10">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    {searching ? (
                                        <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                                    ) : (
                                        <Search className="h-5 w-5 text-emerald-300 transition-colors" />
                                    )}
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Cédula o N° Socio..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3 md:py-6 pl-12 md:pl-14 pr-6 text-base md:text-2xl font-black text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
                                    autoFocus
                                    disabled={searching}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={searching || !query.trim()}
                                className="bg-slate-900 border-b-4 border-black hover:bg-emerald-600 hover:border-emerald-800 disabled:bg-slate-200 disabled:border-slate-300 text-white font-black py-3 md:py-6 px-8 rounded-2xl transition-all active:translate-y-1 shadow-lg text-xs md:text-lg uppercase tracking-widest shrink-0"
                            >
                                {searching ? "..." : "Buscar"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Resultado Check-in Exitoso */}
                {checkinSuccess && socioEncontrado && (
                    <div className="bg-emerald-50 rounded-3xl p-8 border-2 border-emerald-300 text-center animate-pulse">
                        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-emerald-500">¡CHECK-IN EXITOSO!</h2>
                        <p className="text-emerald-500 font-bold text-lg">{socioEncontrado.nombreCompleto}</p>
                    </div>
                )}

                {/* Socio Encontrado */}
                {socioEncontrado && !checkinSuccess && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Ficha del Socio */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className={`rounded-[2rem] p-4 md:p-8 border ${tieneVozYVoto(socioEncontrado) ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} shadow-sm relative overflow-hidden`}>
                                <div className="relative z-10 flex flex-row gap-4 md:gap-8 items-center">
                                    <div className={`h-16 w-16 md:h-32 md:w-32 rounded-2xl md:rounded-3xl flex items-center justify-center font-black text-xl md:text-4xl shadow-inner shrink-0 ${tieneVozYVoto(socioEncontrado) ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                        {socioEncontrado.numeroSocio.slice(-2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg md:text-3xl font-black text-slate-800 leading-tight truncate uppercase">{socioEncontrado.nombreCompleto}</h2>
                                        <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                            #{socioEncontrado.numeroSocio} • CI {socioEncontrado.cedula}
                                        </p>
                                        <div className="flex mt-2">
                                            {tieneVozYVoto(socioEncontrado) ? (
                                                <div className="bg-emerald-600 text-white px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm font-black text-[9px] uppercase">
                                                    <ShieldCheck className="h-3 w-3" />
                                                    VOZ Y VOTO
                                                </div>
                                            ) : (
                                                <div className="bg-amber-500 text-white px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm font-black text-[9px] uppercase">
                                                    <AlertCircle className="h-3 w-3" />
                                                    SOLO VOZ
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Estado según Padrón */}
                            {socioEncontrado.habilitadoVozVoto && (
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Estado según Padrón</p>
                                    <p className={`text-sm font-black uppercase ${tieneVozYVoto(socioEncontrado) ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {socioEncontrado.habilitadoVozVoto}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Acciones Rápidas */}
                        <div className="space-y-6">
                            <button
                                onClick={handleCheckin}
                                disabled={checkinLoading}
                                className="w-full h-24 bg-emerald-500 hover:bg-teal-500 disabled:bg-emerald-400 text-white rounded-3xl flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-900/20 active:scale-95 transition-all text-xl font-black"
                            >
                                {checkinLoading ? (
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                ) : (
                                    <UserCheck className="h-8 w-8" />
                                )}
                                {checkinLoading ? "PROCESANDO..." : "CONFIRMAR INGRESO"}
                            </button>

                            <button
                                onClick={handlePrint}
                                className="w-full h-24 bg-white border-2 border-slate-100 hover:border-emerald-200 text-emerald-500 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-xl font-black shadow-sm group">
                                <Printer className="h-8 w-8 group-hover:scale-110 transition-transform" />
                                IMPRIMIR CARNET
                            </button>

                            <button
                                onClick={resetSearch}
                                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all"
                            >
                                Nueva Búsqueda
                            </button>
                        </div>
                    </div>
                )}

                {/* No encontrado */}
                {notFound && (
                    <div className="bg-red-50 rounded-3xl p-12 text-center border-2 border-red-200">
                        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-600">Socio no encontrado</h3>
                        <p className="text-red-500 mt-2">No se encontró ningún socio con: &quot;{query}&quot;</p>
                        <button
                            onClick={resetSearch}
                            className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                )}

                {/* Últimos Check-ins */}
                {ultimosCheckins.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-emerald-500" />
                            Últimos Ingresos
                        </h3>
                        <div className="space-y-3">
                            {ultimosCheckins.map((socio, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                            {socio.numeroSocio.slice(-2)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700">{socio.nombreCompleto}</p>
                                            <p className="text-xs text-slate-500">#{socio.numeroSocio}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-emerald-500">{socio.horaIngreso}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Placeholder inicial */}
                {!socioEncontrado && !notFound && !query && (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                        <Users className="h-20 w-20 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-400">Introduce un número para comenzar</h3>
                        <p className="text-slate-400 text-sm mt-2">Ingresa el número de socio o cédula del asistente</p>
                    </div>
                )}

                {/* Modal: Socio Ya Ingresó */}
                {showYaIngresoModal && yaIngresoInfo && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200">
                            {/* Icono de advertencia */}
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-amber-100 rounded-full">
                                    <AlertTriangle className="w-12 h-12 text-amber-600" />
                                </div>
                            </div>

                            {/* Título */}
                            <h3 className="text-xl font-black text-center text-slate-800 mb-2">
                                ¡Socio Ya Ingresó!
                            </h3>
                            <p className="text-slate-500 text-center text-sm mb-6">
                                Este socio ya se encuentra registrado en la asamblea
                            </p>

                            {/* Info del Socio */}
                            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Socio</p>
                                <p className="font-bold text-slate-800">{yaIngresoInfo.socioNombre}</p>
                                <p className="text-sm text-slate-500">Nro: {yaIngresoInfo.socioNumero}</p>
                            </div>

                            {/* Info del Ingreso */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border-2 border-amber-200">
                                <p className="text-xs text-amber-600 uppercase tracking-wide font-bold mb-2">Hora de Ingreso</p>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500 rounded-xl">
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            {new Date(yaIngresoInfo.horaIngreso).toLocaleTimeString('es-PY', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        <p className="text-sm text-slate-600">Registrado por {yaIngresoInfo.operadorRegistro}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Botón Cerrar */}
                            <button
                                onClick={() => {
                                    setShowYaIngresoModal(false);
                                    setYaIngresoInfo(null);
                                    inputRef.current?.focus();
                                }}
                                className="w-full mt-6 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal de Mesa (Check-in) - ULTRA COMPACTO PARA MÓVIL */}
                {showMesaModal && mesaInfo && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-2 md:p-4">
                        {/* Backdrop */}
                        <div className="absolute inset-0" onClick={() => { setShowMesaModal(false); setMesaInfo(null); inputRef.current?.focus(); }} />

                        {/* VERSIÓN MÓVIL - Ultra Compacta SIN SCROLL */}
                        <div className="relative bg-white w-full max-w-[95vw] sm:max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 md:hidden max-h-[92vh] flex flex-col">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="bg-white/20 p-1 rounded-lg">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-wider">¡Check-in Exitoso!</span>
                                </div>
                                <button
                                    onClick={() => { setShowMesaModal(false); setMesaInfo(null); inputRef.current?.focus(); }}
                                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="p-4 space-y-3 overflow-y-auto flex-1">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">Socio Registrado</p>
                                    <h3 className="text-base font-black text-slate-800 uppercase leading-tight line-clamp-2">{mesaInfo.nombre}</h3>
                                    <div className="flex flex-wrap justify-center gap-1.5 mt-1.5">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black">#{mesaInfo.numeroSocio}</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">Orden: #{mesaInfo.numeroOrden}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${mesaInfo.vozVoto ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {mesaInfo.vozVoto ? 'VOZ Y VOTO' : 'SOLO VOZ'}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border-2 border-dashed border-emerald-200 rounded-2xl p-4 text-center relative overflow-hidden">
                                    <div className="absolute -top-8 -right-8 w-16 h-16 bg-emerald-500/5 rounded-full blur-2xl" />
                                    <p className="text-emerald-600 text-[9px] font-black uppercase tracking-[0.2em] mb-1 relative z-10">Dirigirse a la</p>
                                    <h4 className="text-5xl font-black text-slate-900 tracking-tighter italic relative z-10">
                                        MESA <span className="text-emerald-500">{mesaInfo.mesa.numero}</span>
                                    </h4>

                                    <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-emerald-100 mt-3 relative z-10">
                                        <MapPin className="h-3 w-3 text-emerald-500" />
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{mesaInfo.mesa.ubicacion}</p>
                                    </div>

                                    {mesaInfo.mesa.responsables && mesaInfo.mesa.responsables.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 relative z-10">
                                            <p className="text-slate-400 text-[8px] font-black uppercase tracking-wider mb-1.5">Encargados de Mesa:</p>
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {mesaInfo.mesa.responsables.map((resp: string, idx: number) => (
                                                    <span key={idx} className="bg-white px-2 py-0.5 rounded-lg text-[9px] font-bold text-slate-700 border border-slate-100 shadow-sm">{resp}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => { setShowMesaModal(false); setMesaInfo(null); inputRef.current?.focus(); }}
                                    className="w-full bg-slate-900 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white font-black py-3.5 rounded-2xl uppercase tracking-[0.12em] text-xs shadow-xl"
                                >
                                    Listo, Siguiente Socio
                                </button>
                            </div>
                        </div>

                        {/* VERSIÓN ESCRITORIO - Premium */}
                        <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 hidden md:block">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white relative">
                                <button
                                    onClick={() => { setShowMesaModal(false); setMesaInfo(null); inputRef.current?.focus(); }}
                                    className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="bg-white/20 p-3 rounded-2xl">
                                        <CheckCircle2 className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight">¡Check-in Exitoso!</h2>
                                        <p className="opacity-80 font-bold uppercase tracking-widest text-xs">Asamblea General de Socios</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="text-center space-y-1">
                                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Socio Registrado</p>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase italic leading-tight">{mesaInfo.nombre}</h3>
                                    <div className="flex justify-center gap-4 mt-2">
                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-black italic">SOCIO #{mesaInfo.numeroSocio}</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black italic uppercase">ORDEN: #{mesaInfo.numeroOrden}</span>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black italic ${mesaInfo.vozVoto ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {mesaInfo.vozVoto ? 'VOZ Y VOTO' : 'SOLO VOZ'}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border-2 border-dashed border-emerald-200 rounded-[2rem] p-8 relative overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                                    <div className="relative text-center">
                                        <p className="text-emerald-600 text-xs font-black uppercase tracking-[0.3em] mb-2">Dirigirse a la</p>
                                        <h4 className="text-8xl font-black text-slate-900 tracking-tighter mb-4 italic">
                                            MESA <span className="text-emerald-500">{mesaInfo.mesa.numero}</span>
                                        </h4>
                                        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100 mb-6">
                                            <MapPin className="h-4 w-4 text-emerald-500" />
                                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">{mesaInfo.mesa.ubicacion}</p>
                                        </div>
                                        {mesaInfo.mesa.responsables && mesaInfo.mesa.responsables.length > 0 && (
                                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Encargados de Mesa:</p>
                                                <div className="flex flex-wrap justify-center gap-2">
                                                    {mesaInfo.mesa.responsables.map((resp: string, idx: number) => (
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

                                <button
                                    onClick={() => { setShowMesaModal(false); setMesaInfo(null); inputRef.current?.focus(); }}
                                    className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl uppercase tracking-widest text-lg"
                                >
                                    SIGUIENTE SOCIO
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AssemblyCountdownGate>
    );
}
