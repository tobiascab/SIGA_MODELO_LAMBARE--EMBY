"use client";

import { useState } from "react";
import axios from "axios";
import {
    Search as SearchIcon, MapPin, Users, Ticket, AlertCircle, CheckCircle, ArrowLeft, Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface MesaInfo {
    numero: number;
    mensaje: string;
    ubicacion: string;
    rango: string;
    responsables: string[];
    socioNombre: string;
    socioNro: string;
    cedula: string;
    socioId: number;
}

export default function ConsultaMesaPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MesaInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!query.trim()) {
            toast.error("Ingrese una Cédula o Número de Socio");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/mesas/consulta?query=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setResult(res.data);

        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 404) {
                setError("No se encontró ningún socio con esos datos.");
            } else {
                setError("Ocurrió un error al consultar. Intente nuevamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/asistencia" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800">Consulta de Mesa</h1>
                    <p className="text-slate-500">Ubique rápidamente su mesa de votación</p>
                </div>
            </div>

            {/* Search Box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Ingrese Cédula o Número de Socio..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Buscar"}
                    </button>
                </form>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-red-800 mb-1">Búsqueda sin resultados</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* Result Card */}
            {result && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <p className="text-emerald-100 font-medium mb-1 uppercase tracking-wider text-xs">Socio Identificado</p>
                                <h2 className="text-3xl font-black mb-1">{result.socioNombre}</h2>
                                <div className="flex gap-4 text-emerald-100 text-sm font-medium">
                                    <span>#{result.socioNro}</span>
                                    <span>•</span>
                                    <span>CI: {result.cedula}</span>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20 text-center min-w-[120px]">
                                <span className="block text-emerald-100 text-xs font-bold uppercase mb-1">MESA ASIGNADA</span>
                                <span className="block text-5xl font-black">{result.numero}</span>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                    <MapPin className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Ubicación</h4>
                                    <p className="text-lg font-bold text-slate-800">{result.ubicacion}</p>
                                    <p className="text-slate-500 text-sm mt-1">{result.mensaje}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                    <Ticket className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Rango / Criterio</h4>
                                    <p className="text-lg font-bold text-slate-800">{result.rango}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="h-5 w-5 text-slate-500" />
                                <h4 className="font-bold text-slate-700">Responsables de Mesa</h4>
                            </div>
                            <ul className="space-y-3">
                                {result.responsables && result.responsables.length > 0 ? (
                                    result.responsables.map((resp, idx) => (
                                        <li key={idx} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-500 shadow-sm">
                                                {resp.charAt(0)}
                                            </div>
                                            <span className="font-medium text-slate-700">{resp}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-slate-400 italic text-sm">Sin responsables asignados</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-center">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Consulta verificada en tiempo real
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
