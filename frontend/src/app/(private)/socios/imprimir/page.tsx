"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Printer, Loader2, ChevronLeft, CheckSquare, Square, X } from "lucide-react";
import axios from "axios";
import SocioCarnet from "@/components/carnet/SocioCarnet";
import Link from "next/link";

interface Socio {
    id: number;
    numeroSocio: string;
    nombreCompleto: string;
    cedula: string;
    tieneVoto: boolean; // Calculado en el frontend o backend
    aporteAlDia: boolean;
    solidaridadAlDia: boolean;
    fondoAlDia: boolean;
    incoopAlDia: boolean;
    creditoAlDia: boolean;
    estadoVozVoto?: boolean;
    habilitadoVozVoto?: string;
}

export default function ImprimirCarnetsPage() {
    const [socios, setSocios] = useState<Socio[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [printing, setPrinting] = useState(false);

    const fetchSocios = useCallback(async (term?: string) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            let url = "/api/socios";
            if (term && term.length > 0) {
                url = `/api/socios/buscar?term=${encodeURIComponent(term)}`;
            }

            const response = await axios.get(url, { headers });
            // Adaptar datos para el carnet
            const data = response.data.map((s: any) => ({
                ...s,
                tieneVoto: s.estadoVozVoto !== undefined ? s.estadoVozVoto : (s.habilitadoVozVoto ? s.habilitadoVozVoto.toLowerCase().includes('voto') : false)
            }));
            setSocios(data);
        } catch (error) {
            console.error("Error al cargar socios:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSocios();
    }, [fetchSocios]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchSocios(searchTerm);
    };

    const toggleSelect = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === socios.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(socios.map(s => s.id)));
        }
    };

    const handlePrint = () => {
        setPrinting(true);
        setTimeout(() => {
            window.print();
            setPrinting(false);
        }, 500);
    };

    const selectedSocios = socios.filter(s => selectedIds.has(s.id));

    return (
        <div className="space-y-6">
            {/* NO PRINT AREA */}
            <div className="print:hidden space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/socios" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ChevronLeft className="h-6 w-6 text-slate-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Imprimir Carnets</h1>
                            <p className="text-slate-500">Selecciona los socios para generar sus credenciales de asamblea</p>
                        </div>
                    </div>

                    <button
                        onClick={handlePrint}
                        disabled={selectedIds.size === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all active:scale-95"
                    >
                        <Printer className="h-5 w-5" />
                        Imprimir Seleccionados ({selectedIds.size})
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, CI o Nro Socio..."
                                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-all text-sm">
                                Buscar
                            </button>
                        </form>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-emerald-500">
                                            {selectedIds.size === socios.length && socios.length > 0 ? (
                                                <CheckSquare className="h-5 w-5 text-emerald-500" />
                                            ) : (
                                                <Square className="h-5 w-5" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-sm font-medium text-slate-400">Socio</th>
                                    <th className="px-6 py-4 text-sm font-medium text-slate-400">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                                        </td>
                                    </tr>
                                ) : socios.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center text-slate-400">
                                            No se encontraron socios
                                        </td>
                                    </tr>
                                ) : (
                                    socios.map((socio) => (
                                        <tr
                                            key={socio.id}
                                            onClick={() => toggleSelect(socio.id)}
                                            className={`cursor-pointer transition-colors ${selectedIds.has(socio.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                {selectedIds.has(socio.id) ? (
                                                    <CheckSquare className="h-5 w-5 text-emerald-500" />
                                                ) : (
                                                    <Square className="h-5 w-5 text-slate-300" />
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-700">{socio.nombreCompleto}</p>
                                                <p className="text-xs text-slate-500">N° {socio.numeroSocio} • CI: {socio.cedula}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${socio.tieneVoto ? 'bg-emerald-100 text-teal-500' : 'bg-amber-100 text-amber-700'}`}>
                                                    {socio.tieneVoto ? 'VOZ Y VOTO' : 'SOLO VOZ'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PRINT ONLY AREA */}
            <div className={`hidden print:block ${printing ? 'block' : ''}`}>
                <style jsx global>{`
                    @media print {
                        @page {
                            size: auto;
                            margin: 0mm;
                        }
                        body {
                            background: white !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        .print-container {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 0;
                            padding: 0;
                        }
                        /* Cada carnet ocupa media hoja horizontal si es carta, o ajusta segun 100mm */
                        .print-item {
                            width: 100mm;
                            height: 100mm;
                            margin: 0;
                            border: 1px solid #eee; /* Borde muy tenue para corte */
                            box-sizing: border-box;
                            page-break-inside: avoid;
                        }
                    }
                `}</style>
                <div className="print-container flex flex-wrap justify-center">
                    {selectedSocios.map(socio => (
                        <div key={socio.id} className="print-item">
                            <SocioCarnet socio={{
                                nroSocio: socio.numeroSocio,
                                nombreCompleto: socio.nombreCompleto,
                                tieneVoto: socio.tieneVoto,
                                cedula: socio.cedula
                            }} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Preview Banner */}
            {selectedIds.size > 0 && (
                <div className="print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-8 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 p-1 rounded-full">
                            <CheckSquare className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{selectedIds.size} socios seleccionados</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-700" />
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <X className="h-4 w-4" /> Limpiar
                    </button>
                </div>
            )}
        </div>
    );
}
