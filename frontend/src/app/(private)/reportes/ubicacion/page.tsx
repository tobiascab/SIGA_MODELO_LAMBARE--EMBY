"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
    MapPin, Building2, Home, Users, Download, Search,
    ArrowUpDown, ArrowUp, ArrowDown, Loader2, Mail, Phone
} from "lucide-react";
import * as XLSX from "xlsx";

interface Socio {
    id: number;
    numeroSocio: string;
    nombreCompleto: string;
    cedula: string;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    barrio: string | null;
    ciudad: string | null;
    sucursal: { id: number; nombre: string } | null;
    habilitadoVozVoto: string;
}

type OrdenColumna = "numeroSocio" | "nombreCompleto" | "cedula" | "ciudad" | "barrio" | "direccion" | "telefono" | "email";
type DireccionOrden = "asc" | "desc";

export default function ReporteUbicacionPage() {
    const [socios, setSocios] = useState<Socio[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [filtroCiudad, setFiltroCiudad] = useState("");
    const [filtroBarrio, setFiltroBarrio] = useState("");
    const [ordenColumna, setOrdenColumna] = useState<OrdenColumna>("numeroSocio");
    const [direccionOrden, setDireccionOrden] = useState<DireccionOrden>("asc");

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Estadísticas
    const [stats, setStats] = useState({
        total: 0,
        conDireccion: 0,
        conCiudad: 0,
        conBarrio: 0,
        conTelefono: 0,
        conEmail: 0
    });



    useEffect(() => {
        cargarSocios();
    }, []);

    const cargarSocios = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                console.error("No hay token de autenticación");
                return;
            }

            // Usar axios con URL relativa y header de autorización
            const response = await axios.get("/api/socios?size=10000", { // Traer todos para el reporte
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = response.data;
            const sociosList = Array.isArray(data) ? data : (data.content || []);

            if (!Array.isArray(sociosList)) {
                console.error("Formato de datos inválido:", data);
                setSocios([]);
                return;
            }

            setSocios(sociosList);

            // Calcular estadísticas con los datos recibidos
            setStats({
                total: sociosList.length,
                conDireccion: sociosList.filter((s: Socio) => s.direccion).length,
                conCiudad: sociosList.filter((s: Socio) => s.ciudad).length,
                conBarrio: sociosList.filter((s: Socio) => s.barrio).length,
                conTelefono: sociosList.filter((s: Socio) => s.telefono).length,
                conEmail: sociosList.filter((s: Socio) => s.email).length,
            });
        } catch (error) {
            console.error("Error cargando socios:", error);
            setSocios([]); // Prevenir estado invalido
        } finally {
            setLoading(false);
        }
    };

    const handleOrdenar = (columna: OrdenColumna) => {
        if (ordenColumna === columna) {
            setDireccionOrden(direccionOrden === "asc" ? "desc" : "asc");
        } else {
            setOrdenColumna(columna);
            setDireccionOrden("asc");
        }
    };

    const sociosFiltrados = socios
        .filter(socio => {
            const textoBusqueda = busqueda.toLowerCase();

            // Helper seguro para texto
            const safeText = (text: string | null | undefined) => (text || "").toLowerCase();

            const coincideBusqueda = !busqueda ||
                safeText(socio.numeroSocio).includes(textoBusqueda) ||
                safeText(socio.nombreCompleto).includes(textoBusqueda) ||
                safeText(socio.cedula).includes(textoBusqueda) ||
                safeText(socio.telefono).includes(textoBusqueda) ||
                safeText(socio.email).includes(textoBusqueda) ||
                safeText(socio.direccion).includes(textoBusqueda);

            const coincideCiudad = !filtroCiudad ||
                safeText(socio.ciudad).includes(filtroCiudad.toLowerCase());

            const coincideBarrio = !filtroBarrio ||
                safeText(socio.barrio).includes(filtroBarrio.toLowerCase());

            return coincideBusqueda && coincideCiudad && coincideBarrio;
        })
        .sort((a, b) => {
            let valorA: any = a[ordenColumna];
            let valorB: any = b[ordenColumna];

            // Manejar valores nulos
            if (valorA === null || valorA === undefined) valorA = "";
            if (valorB === null || valorB === undefined) valorB = "";

            if (typeof valorA === "string") {
                valorA = valorA.toLowerCase();
                valorB = valorB.toLowerCase();
            }

            if (direccionOrden === "asc") {
                return valorA > valorB ? 1 : -1;
            } else {
                return valorA < valorB ? 1 : -1;
            }
        });

    // Resetear a página 1 cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [busqueda, filtroCiudad, filtroBarrio]);

    // Calcular items para la página actual
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedSocios = sociosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sociosFiltrados.length / itemsPerPage);

    const IconoOrden = ({ columna }: { columna: OrdenColumna }) => {
        if (ordenColumna !== columna) {
            return <ArrowUpDown className="h-4 w-4 opacity-30" />;
        }
        return direccionOrden === "asc" ?
            <ArrowUp className="h-4 w-4 text-emerald-500" /> :
            <ArrowDown className="h-4 w-4 text-emerald-500" />;
    };

    const exportarExcel = () => {
        try {
            const dataToExport = sociosFiltrados.map((socio: Socio) => ({
                "N° Socio": socio.numeroSocio,
                "Nombre Completo": socio.nombreCompleto,
                "Cédula": socio.cedula,
                "Teléfono": socio.telefono || "Sin dato",
                "Email": socio.email || "Sin dato",
                "Dirección": socio.direccion || "Sin dato",
                "Barrio": socio.barrio || "Sin dato",
                "Ciudad": socio.ciudad || "Sin dato",
                "Sucursal": socio.sucursal?.nombre || "Sin dato"
            }));

            // Crear libro y hoja
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);

            // Ajustar ancho de columnas
            const wscols = [
                { wch: 10 }, // N Socio
                { wch: 35 }, // Nombre
                { wch: 15 }, // Cedula
                { wch: 15 }, // Telefono
                { wch: 25 }, // Email
                { wch: 40 }, // Direccion
                { wch: 20 }, // Barrio
                { wch: 20 }, // Ciudad
                { wch: 15 }  // Sucursal
            ];
            worksheet['!cols'] = wscols;

            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Ubicación");

            // Generar nombre de archivo con fecha
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Reporte_Ubicacion_${date}.xlsx`);
        } catch (error) {
            console.error("Error exportando a Excel:", error);
            alert("Error al exportar a Excel. Intente nuevamente.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <MapPin className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black">Padrón por Ubicación</h1>
                            <p className="text-blue-100 mt-1">Directorio completo de socios con datos de contacto y ubicación</p>
                        </div>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {[
                        { label: "Total", value: stats.total, icon: Users, color: "blue" },
                        { label: "Con Ciudad", value: stats.conCiudad, icon: Building2, color: "purple" },
                        { label: "Con Barrio", value: stats.conBarrio, icon: Home, color: "orange" },
                        { label: "Con Dirección", value: stats.conDireccion, icon: MapPin, color: "teal" },
                        { label: "Con Teléfono", value: stats.conTelefono, icon: Phone, color: "green" },
                        { label: "Con Email", value: stats.conEmail, icon: Mail, color: "pink" },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-xl p-3 shadow-lg border border-slate-200"
                        >
                            <div className="flex items-center gap-2">
                                <stat.icon className={`h-6 w-6 text-${stat.color}-500`} />
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">{stat.label}</p>
                                    <p className="text-xl font-black text-slate-800">{stat.value}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Búsqueda General</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar por nombre, cédula, teléfono, email..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Filtrar por Ciudad</label>
                            <input
                                type="text"
                                value={filtroCiudad}
                                onChange={(e) => setFiltroCiudad(e.target.value)}
                                placeholder="Ej: Asunción"
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Filtrar por Barrio</label>
                            <input
                                type="text"
                                value={filtroBarrio}
                                onChange={(e) => setFiltroBarrio(e.target.value)}
                                placeholder="Ej: Centro"
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Mostrando <span className="font-black text-emerald-600">{sociosFiltrados.length}</span> de {stats.total} socios
                        </p>
                        <button
                            onClick={exportarExcel}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 text-sm"
                        >
                            <Download className="h-4 w-4" />
                            Exportar Excel
                        </button>
                    </div>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-200">
                                        <tr>
                                            {[
                                                { key: "numeroSocio", label: "N° Socio", width: "w-24" },
                                                { key: "nombreCompleto", label: "Socio", width: "w-64" },
                                                { key: "cedula", label: "Cédula", width: "w-32" },
                                                { key: "telefono", label: "Teléfono", width: "w-32" },
                                                { key: "email", label: "Email", width: "w-48" },
                                                { key: "direccion", label: "Dirección", width: "w-64" },
                                                { key: "barrio", label: "Barrio", width: "w-32" },
                                                { key: "ciudad", label: "Ciudad", width: "w-32" },
                                            ].map((col) => (
                                                <th
                                                    key={col.key}
                                                    onClick={() => handleOrdenar(col.key as OrdenColumna)}
                                                    className={`${col.width} p-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors select-none`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {col.label}
                                                        <IconoOrden columna={col.key as OrdenColumna} />
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedSocios.map((socio, index) => (
                                            <tr
                                                key={socio.id}
                                                className="hover:bg-blue-50 transition-colors"
                                            >
                                                <td className="p-3">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-black text-sm">
                                                        #{socio.numeroSocio}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-800">{socio.nombreCompleto}</div>
                                                    {socio.sucursal && (
                                                        <div className="text-xs text-slate-500">{socio.sucursal.nombre}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 font-mono text-sm text-slate-700">{socio.cedula}</td>
                                                <td className="p-3 font-mono text-sm text-slate-700">
                                                    {socio.telefono || <span className="text-slate-300 italic">Sin dato</span>}
                                                </td>
                                                <td className="p-3 text-sm text-slate-700">
                                                    {socio.email || <span className="text-slate-300 italic">Sin dato</span>}
                                                </td>
                                                <td className="p-3 text-sm text-slate-700">
                                                    {socio.direccion || <span className="text-slate-300 italic">Sin dato</span>}
                                                </td>
                                                <td className="p-3 text-sm text-slate-700">
                                                    {socio.barrio || <span className="text-slate-300 italic">Sin dato</span>}
                                                </td>
                                                <td className="p-3 text-sm text-slate-700">
                                                    {socio.ciudad || <span className="text-slate-300 italic">Sin dato</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {sociosFiltrados.length === 0 && (
                                    <div className="text-center py-20 text-slate-400">
                                        <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <p className="font-bold">No se encontraron socios con los filtros aplicados</p>
                                    </div>
                                )}
                            </div>

                            {/* Paginación */}
                            {sociosFiltrados.length > 0 && (
                                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <div className="text-sm text-slate-500">
                                        Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, sociosFiltrados.length)} de {sociosFiltrados.length} resultados
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Anterior
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                // Lógica simple de paginación para mostrar 5 páginas alrededor de la actual
                                                let pageNum = currentPage;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${currentPage === pageNum
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
