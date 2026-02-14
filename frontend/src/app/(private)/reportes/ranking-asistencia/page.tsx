'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy,
    Users,
    Building2,
    Download,
    Award,
    TrendingUp,
    Search,
    Loader2,
    Medal
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface RankingUsuario {
    id: number;
    nombre: string;
    username: string;
    sucursal: string;
    total_presentes: number;
}

interface RankingSucursal {
    sucursal: string;
    total_presentes: number;
}

export default function RankingAsistenciaPage() {
    const [activeTab, setActiveTab] = useState<'usuarios' | 'sucursales'>('usuarios');
    const [rankingUsuarios, setRankingUsuarios] = useState<RankingUsuario[]>([]);
    const [rankingSucursales, setRankingSucursales] = useState<RankingSucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para detalles
    const [selectedOperator, setSelectedOperator] = useState<RankingUsuario | null>(null);
    const [details, setDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        loadRankings();
    }, []);

    const loadRankings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [resUsuarios, resSucursales] = await Promise.all([
                axios.get('/api/reportes/rankings/asistencia/usuarios', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/reportes/rankings/asistencia/sucursales', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setRankingUsuarios(resUsuarios.data);
            setRankingSucursales(resSucursales.data);
        } catch (error) {
            console.error('Error loading rankings:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsuarios = rankingUsuarios.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.sucursal.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSucursales = rankingSucursales.filter(s =>
        s.sucursal.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewDetails = async (operator: RankingUsuario) => {
        setSelectedOperator(operator);
        setLoadingDetails(true);
        setDetails([]);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/reportes/rankings/asistencia/usuarios/${operator.id}/detalle`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDetails(res.data);
        } catch (error) {
            console.error('Error loading details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const title = activeTab === 'usuarios' ? 'Ranking de Asistencia por Operador' : 'Ranking de Asistencia por Sucursal';

        doc.setFillColor(13, 148, 136); // teal-500
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text(title, 105, 13, { align: 'center' });

        const date = new Date().toLocaleString('es-PY');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text(`Generado el: ${date}`, 14, 28);

        if (activeTab === 'usuarios') {
            autoTable(doc, {
                startY: 35,
                head: [['#', 'Operador', 'Sucursal', 'Asistentes Confirmados']],
                body: filteredUsuarios.map((r, i) => [i + 1, r.nombre, r.sucursal, r.total_presentes]),
                theme: 'grid',
                headStyles: { fillColor: [13, 148, 136] }
            });
        } else {
            autoTable(doc, {
                startY: 35,
                head: [['#', 'Sucursal', 'Total Asistentes']],
                body: filteredSucursales.map((r, i) => [i + 1, r.sucursal, r.total_presentes]),
                theme: 'grid',
                headStyles: { fillColor: [13, 148, 136] }
            });
        }

        doc.save(`ranking_asistencia_${activeTab}.pdf`);
    };

    const exportToExcel = () => {
        const data = activeTab === 'usuarios'
            ? filteredUsuarios.map((r, i) => ({ Ranking: i + 1, Operador: r.nombre, Sucursal: r.sucursal, Asistentes: r.total_presentes }))
            : filteredSucursales.map((r, i) => ({ Ranking: i + 1, Sucursal: r.sucursal, Total: r.total_presentes }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ranking");
        XLSX.writeFile(wb, `ranking_asistencia_${activeTab}.xlsx`);
    };

    return (
        <div className="mx-auto space-y-6" style={{ maxWidth: 'clamp(320px, 98vw, 1400px)', padding: 'clamp(0.5rem, 2vw, 1.5rem)' }}>
            {/* Header Premium */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-5 sm:p-8 shadow-2xl"
            >
                {/* Decoraciones de fondo */}
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="w-64 h-64 text-white" />
                </div>

                <div className="relative z-10 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-yellow-300" />
                        <span className="text-xs font-bold uppercase tracking-widest text-purple-200">Reporte Especial</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
                        Ranking de <span className="text-yellow-300">Asistencia Efectiva</span>
                    </h1>
                    <p className="text-purple-100 max-w-xl text-sm sm:text-base">
                        Top de operadores y sucursales según la cantidad de socios asignados que registraron su asistencia en la asamblea.
                    </p>
                </div>
            </motion.div>

            {/* Tabs & Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('usuarios')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'usuarios'
                            ? 'bg-white text-violet-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Operadores
                    </button>
                    <button
                        onClick={() => setActiveTab('sucursales')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'sucursales'
                            ? 'bg-white text-violet-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Building2 className="h-4 w-4" />
                        Sucursales
                    </button>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={exportToPDF}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold text-sm transition-colors border border-rose-200"
                    >
                        <Download className="h-4 w-4" />
                        PDF
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold text-sm transition-colors border border-emerald-200"
                    >
                        <Download className="h-4 w-4" />
                        Excel
                    </button>
                </div>
            </div>

            {/* Ranking Display */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                {/* Search Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={activeTab === 'usuarios' ? "Buscar operador..." : "Buscar sucursal..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-2 text-violet-500" />
                        <span className="text-sm font-medium">Calculando posiciones...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 text-left">
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider w-16 text-center">#</th>
                                    {activeTab === 'usuarios' && (
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Operador</th>
                                    )}
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Sucursal</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Asistencias</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(activeTab === 'usuarios' ? filteredUsuarios : filteredSucursales).map((item, idx) => (
                                    <motion.tr
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => activeTab === 'usuarios' && handleViewDetails(item as RankingUsuario)}
                                        className={`hover:bg-slate-50 transition-colors group ${activeTab === 'usuarios' ? 'cursor-pointer' : ''}`}
                                    >
                                        <td className="px-6 py-4 text-center">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                idx === 1 ? 'bg-slate-200 text-slate-700' :
                                                    idx === 2 ? 'bg-amber-100 text-amber-800' :
                                                        'bg-slate-50 text-slate-500'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                        </td>

                                        {activeTab === 'usuarios' && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold">
                                                        {(item as RankingUsuario).nombre.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700">{(item as RankingUsuario).nombre}</p>
                                                        <p className="text-xs text-slate-400">@{(item as RankingUsuario).username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        )}

                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                <Building2 className="h-3 w-3" />
                                                {(item as any).sucursal}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-black text-violet-600">
                                                {(item as any).total_presentes}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            {idx < 3 && <Medal className={`h-5 w-5 ${idx === 0 ? 'text-yellow-400 drop-shadow-sm' :
                                                idx === 1 ? 'text-slate-400' :
                                                    'text-amber-600'
                                                }`} />}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>

                        {(activeTab === 'usuarios' ? filteredUsuarios : filteredSucursales).length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>No se encontraron resultados</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Detalles */}
            {
                selectedOperator && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOperator(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">
                                        Detalle de Asistencia
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {selectedOperator.nombre} • <span className="font-semibold text-violet-600">{selectedOperator.total_presentes} Asistentes</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedOperator(null)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-0">
                                {loadingDetails ? (
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <Loader2 className="w-10 h-10 text-violet-600 animate-spin mb-3" />
                                        <p className="text-slate-500 font-medium">Cargando lista...</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Cédula</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hora Entrada</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {details.map((detail, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-6 py-3 text-slate-500 text-sm font-medium">{idx + 1}</td>
                                                    <td className="px-6 py-3 text-slate-700 text-sm font-mono">{detail.cedula}</td>
                                                    <td className="px-6 py-3 text-slate-800 text-sm font-semibold">
                                                        {detail.nombre_completo}
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-600 text-sm text-right">
                                                        {new Date(detail.fecha_hora_llegada).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => setSelectedOperator(null)}
                                    className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
}
