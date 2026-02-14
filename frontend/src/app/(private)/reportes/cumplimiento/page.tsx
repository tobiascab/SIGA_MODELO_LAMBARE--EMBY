"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    BarChart, Search as SearchIcon, Filter, Download, RefreshCw,
    Building2, User, FileText, Printer, ArrowLeft, MoreHorizontal,
    TrendingUp, Award
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CumplimientoItem {
    sucursal: string;
    operador: string;
    operadorId: number;
    totalAsignados: number;
    totalPresentes: number;
    porcentaje: number;
}

interface DetalleSocio {
    socioNombre: string;
    socioNro: string;
    cedula: string;
    estado: string;
    fechaHora?: string;
}

export default function CumplimientoListasPage() {
    const [data, setData] = useState<CumplimientoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroSucursal, setFiltroSucursal] = useState<string>("todas");
    const [busqueda, setBusqueda] = useState("");
    const [sortBy, setSortBy] = useState<"operador" | "porcentaje" | "sucursal" | "presentes">("presentes");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [expandedOp, setExpandedOp] = useState<number | null>(null);
    const [detalles, setDetalles] = useState<DetalleSocio[]>([]);
    const [loadingDetalles, setLoadingDetalles] = useState(false);

    // Lista de sucursales únicas extraídas de los datos
    const [sucursales, setSucursales] = useState<string[]>([]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/reportes/cumplimiento-listas", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);

            // Extract unique sucursales
            const uniqueSucs = Array.from(new Set(res.data.map((item: CumplimientoItem) => item.sucursal))).sort() as string[];
            setSucursales(uniqueSucs);

        } catch (error) {
            console.error(error);
            toast.error("Error al cargar datos de cumplimiento");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchDetalles = async (opId: number) => {
        if (expandedOp === opId) {
            setExpandedOp(null);
            return;
        }

        try {
            setLoadingDetalles(true);
            setExpandedOp(opId);
            setDetalles([]);
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/reportes/asignaciones-general?operadorId=${opId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDetalles(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar detalles del operador");
        } finally {
            setLoadingDetalles(false);
        }
    };

    const handleSort = (field: "operador" | "porcentaje" | "sucursal" | "presentes") => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder(field === "presentes" || field === "porcentaje" ? "desc" : "asc");
        }
    };

    const filteredAndSortedData = data
        .filter((item: CumplimientoItem) => {
            if (filtroSucursal !== "todas" && item.sucursal !== filtroSucursal) return false;

            if (busqueda) {
                const term = busqueda.toLowerCase();
                return item.operador.toLowerCase().includes(term) ||
                    item.sucursal.toLowerCase().includes(term) ||
                    item.operadorId.toString().includes(term);
            }

            return true;
        })
        .sort((a: CumplimientoItem, b: CumplimientoItem) => {
            let comparison = 0;
            if (sortBy === "operador") {
                comparison = a.operador.localeCompare(b.operador);
            } else if (sortBy === "porcentaje") {
                comparison = a.porcentaje - b.porcentaje;
            } else if (sortBy === "sucursal") {
                comparison = a.sucursal.localeCompare(b.sucursal);
            } else if (sortBy === "presentes") {
                comparison = a.totalPresentes - b.totalPresentes;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('Reporte de Cumplimiento de Listas', 105, 13, { align: 'center' });

        // Subheader
        const date = new Date().toLocaleString('es-PY');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text(`Generado el: ${date}`, 14, 28);
        if (filtroSucursal !== 'todas') {
            doc.text(`Filtro Sucursal: ${filtroSucursal}`, 14, 33);
        }

        // Table
        autoTable(doc, {
            startY: filtroSucursal !== 'todas' ? 38 : 33,
            head: [['Sucursal', 'Operador', 'Asignados', 'Presentes', 'Efectividad']],
            body: filteredAndSortedData.map((item) => [
                item.sucursal,
                item.operador,
                item.totalAsignados,
                item.totalPresentes,
                `${item.porcentaje}%`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 80 },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 25, halign: 'right' }
            }
        });

        doc.save(`cumplimiento_listas_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportarExcel = async () => {
        try {
            const { utils, writeFile } = await import("xlsx");

            const exportData = filteredAndSortedData.map((item: CumplimientoItem) => ({
                "Sucursal": item.sucursal,
                "Operador": item.operador,
                "Total Asignados": item.totalAsignados,
                "Presentes": item.totalPresentes,
                "Porcentaje (%)": item.porcentaje
            }));

            const ws = utils.json_to_sheet(exportData);

            // Estilo básico de columnas
            const wscols = [
                { wch: 20 }, // Sucursal
                { wch: 35 }, // Operador
                { wch: 15 }, // Total
                { wch: 10 }, // Presentes
                { wch: 15 }  // Porcentaje
            ];
            ws['!cols'] = wscols;

            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Cumplimiento");

            writeFile(wb, `Reporte_Cumplimiento_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Excel generado correctamente");
        } catch (error) {
            console.error("Error al exportar Excel:", error);
            toast.error("Error al generar el archivo Excel");
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link href="/reportes" className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0">
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-800">Cumplimiento de Listas</h1>
                        <p className="text-slate-500 text-xs sm:text-sm">Efectividad de operadores por sucursal</p>
                    </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 w-full md:w-auto">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-xs sm:text-sm transition-colors"
                    >
                        <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-white font-bold text-xs sm:text-sm transition-colors"
                    >
                        <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        PDF
                    </button>
                    <button
                        onClick={exportarExcel}
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold text-xs sm:text-sm transition-colors"
                    >
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar operador..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                </div>
                <div className="w-full md:w-64">
                    <select
                        value={filtroSucursal}
                        onChange={(e) => setFiltroSucursal(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                        <option value="todas">Todas las Sucursales</option>
                        {sucursales.map((suc: string) => (
                            <option key={suc} value={suc}>{suc}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
                {loading ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-slate-100">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                        <p className="text-slate-400 text-sm">Cargando...</p>
                    </div>
                ) : filteredAndSortedData.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-slate-100">
                        <p className="text-slate-400 text-sm">No se encontraron registros</p>
                    </div>
                ) : (
                    filteredAndSortedData.map((row: CumplimientoItem, idx: number) => (
                        <div
                            key={`card-${idx}`}
                            onClick={() => fetchDetalles(row.operadorId)}
                            className={`bg-white rounded-xl border p-3 transition-all cursor-pointer active:scale-[0.98] ${expandedOp === row.operadorId ? 'border-emerald-200 shadow-md' : 'border-slate-100 shadow-sm'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <User className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{row.operador}</p>
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {row.sucursal}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-lg font-black ${row.porcentaje >= 50 ? 'text-emerald-600' :
                                        row.porcentaje >= 20 ? 'text-amber-600' : 'text-red-600'
                                    }`}>
                                    {row.porcentaje}%
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${row.porcentaje >= 50 ? 'bg-emerald-500' :
                                                row.porcentaje >= 20 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${row.porcentaje}%` }}
                                    />
                                </div>
                                <div className="flex gap-2 text-[10px] font-bold shrink-0">
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{row.totalAsignados} asig.</span>
                                    <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">{row.totalPresentes} pres.</span>
                                </div>
                            </div>

                            {/* Expanded detail for mobile */}
                            {expandedOp === row.operadorId && (
                                <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        Detalle Socios
                                        {loadingDetalles && <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />}
                                    </h4>
                                    {loadingDetalles ? (
                                        <p className="text-center text-slate-400 text-xs py-4">Cargando...</p>
                                    ) : detalles.length === 0 ? (
                                        <p className="text-center text-slate-400 text-xs py-4">Sin socios</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                                            {detalles.map((s: DetalleSocio, si: number) => (
                                                <div key={si} className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{s.socioNombre}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">CI: {s.cedula} | Nº {s.socioNro}</p>
                                                    </div>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ml-2 ${s.estado === 'PRESENTE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {s.estado}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50">
                                <th
                                    onClick={() => handleSort("sucursal")}
                                    className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        Sucursal
                                        {sortBy === "sucursal" && (sortOrder === "asc" ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />)}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort("operador")}
                                    className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        Operador / Líder
                                        {sortBy === "operador" && (sortOrder === "asc" ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Asignados</th>
                                <th
                                    onClick={() => handleSort("presentes")}
                                    className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        Presentes
                                        {sortBy === "presentes" && (sortOrder === "asc" ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />)}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort("porcentaje")}
                                    className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        Efectividad
                                        {sortBy === "porcentaje" && (sortOrder === "asc" ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />)}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-emerald-500" />
                                        Cargando datos...
                                    </td>
                                </tr>
                            ) : filteredAndSortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No se encontraron registros
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedData.map((row: CumplimientoItem, idx: number) => (
                                    <>
                                        <tr
                                            key={`row-${idx}`}
                                            onClick={() => fetchDetalles(row.operadorId)}
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedOp === row.operadorId ? 'bg-emerald-50/50' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    <span className="font-bold text-slate-700">{row.sucursal}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-800">{row.operador}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">ID: {row.operadorId}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-600 bg-slate-50/10">
                                                {row.totalAsignados}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-emerald-600 bg-emerald-50/10">
                                                {row.totalPresentes}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${row.porcentaje >= 50 ? 'bg-emerald-500' :
                                                                row.porcentaje >= 20 ? 'bg-amber-500' :
                                                                    'bg-red-500'
                                                                }`}
                                                            style={{ width: `${row.porcentaje}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-black w-12 text-right ${row.porcentaje >= 50 ? 'text-emerald-600' :
                                                        row.porcentaje >= 20 ? 'text-amber-600' :
                                                            'text-red-600'
                                                        }`}>
                                                        {row.porcentaje}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedOp === row.operadorId && (
                                            <tr key={`expanded-${idx}`} className="bg-slate-50/30">
                                                <td colSpan={5} className="px-8 py-6">
                                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                                <FileText className="h-4 w-4" />
                                                                Detalle de Socios Asignados
                                                            </h3>
                                                            {loadingDetalles && <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />}
                                                        </div>
                                                        <div className="overflow-x-auto max-h-[400px]">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50/50 sticky top-0">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">Socio</th>
                                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">Documento / Nro</th>
                                                                        <th className="px-4 py-2 text-center text-[10px] font-bold text-slate-400 uppercase">Estado</th>
                                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">Fecha Checked</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {loadingDetalles ? (
                                                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
                                                                    ) : detalles.length === 0 ? (
                                                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No hay socios asignados</td></tr>
                                                                    ) : (
                                                                        detalles.map((s: DetalleSocio, si: number) => (
                                                                            <tr key={si} className="hover:bg-slate-50/50">
                                                                                <td className="px-4 py-2 font-bold text-slate-700">{s.socioNombre}</td>
                                                                                <td className="px-4 py-2 text-slate-500">
                                                                                    {s.cedula} <br />
                                                                                    <span className="text-[10px] font-mono bg-slate-100 px-1 rounded">Nº {s.socioNro}</span>
                                                                                </td>
                                                                                <td className="px-4 py-2 text-center">
                                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.estado === 'PRESENTE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                                        {s.estado}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-2 text-right text-slate-400 text-[10px]">
                                                                                    {s.fechaHora ? new Date(s.fechaHora).toLocaleString('es-PY') : '-'}
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3 sm:p-4 rounded-xl text-blue-800 text-xs sm:text-sm">
                <p className="flex items-center gap-2 font-bold mb-1">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Información sobre el cálculo:
                </p>
                <p>
                    La efectividad se calcula dividiendo la cantidad de socios PRESENTES sobre el total de socios ASIGNADOS a la lista de cada operador.
                    <strong className="hidden sm:inline"> Haga clic en una fila para ver el detalle de los socios.</strong>
                </p>
            </div>
        </div>
    );
}
