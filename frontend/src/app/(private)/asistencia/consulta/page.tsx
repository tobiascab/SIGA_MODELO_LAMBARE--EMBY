"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Users, UserCheck, Search, Filter, Download, RefreshCw,
    ChevronDown, Building2, User, Clock, FileText, Printer,
    CheckCircle, XCircle, ArrowLeft
} from "lucide-react";
import Link from "next/link";

interface AsistenciaItem {
    id: number;
    socioNombre: string;
    socioNumero: string;
    vozVoto: boolean;
    fechaHora: string;
    sucursal: string;
}

interface Operador {
    id: number;
    nombre: string;
    username: string;
    totalRegistros: number;
    vozYVoto: number;
    soloVoz: number;
}

interface EstadisticasSucursal {
    sucursal: string;
    total: number;
    vozYVoto: number;
    soloVoz: number;
}

export default function ConsultaAsistenciaPage() {
    const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
    const [operadores, setOperadores] = useState<Operador[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<"todos" | "vozVoto" | "soloVoz">("todos");
    const [filtroSucursal, setFiltroSucursal] = useState<string>("todas");
    const [busqueda, setBusqueda] = useState("");
    const [vistaActiva, setVistaActiva] = useState<"general" | "sucursal" | "usuario">("general");

    // Estadísticas
    const [stats, setStats] = useState({
        total: 0,
        vozYVoto: 0,
        soloVoz: 0,
        sucursales: [] as EstadisticasSucursal[]
    });

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Obtener asistencias del día
            const resAsistencias = await axios.get("/api/asistencia/hoy", { headers });
            setAsistencias(resAsistencias.data);

            // Calcular estadísticas
            const data = resAsistencias.data as AsistenciaItem[];
            const vozYVoto = data.filter(a => a.vozVoto).length;
            const soloVoz = data.filter(a => !a.vozVoto).length;

            // Agrupar por sucursal normalizada
            const sucursalesMap = new Map<string, { total: number; vozYVoto: number; soloVoz: number }>();

            data.forEach(a => {
                const rawSuc = (a.sucursal || "Sin Sucursal").toUpperCase();
                let grupo = "OTRAS";

                if (rawSuc.includes("CENTRAL") || rawSuc.includes("SUC 5") || rawSuc.includes("SUCURSAL 5") || rawSuc.includes("SAN LORENZO") || rawSuc.includes("SANLO")) {
                    grupo = "CASA CENTRAL"; // Unificar todo en CASA CENTRAL
                } else if (rawSuc.includes("CDE") || rawSuc.includes("HERNANDARIAS") || rawSuc.includes("ALTO PARANA") || rawSuc.includes("CIUDAD DEL ESTE")) {
                    grupo = "CDE ALTO PARANA"; // CDE, Hernandarias
                } else if (rawSuc.includes("VILLARRICA")) {
                    grupo = "VILLARRICA"; // Villarrica se mantiene
                } else {
                    grupo = rawSuc; // Fallback para casos no esperados
                }

                if (!sucursalesMap.has(grupo)) {
                    sucursalesMap.set(grupo, { total: 0, vozYVoto: 0, soloVoz: 0 });
                }
                const s = sucursalesMap.get(grupo)!;
                s.total++;
                if (a.vozVoto) s.vozYVoto++;
                else s.soloVoz++;
            });

            const sucursalesArray = Array.from(sucursalesMap.entries()).map(([sucursal, stats]) => ({
                sucursal,
                ...stats
            })).sort((a, b) => b.total - a.total);

            setStats({
                total: data.length,
                vozYVoto,
                soloVoz,
                sucursales: sucursalesArray
            });

            // Obtener ranking de operadores
            const resOperadores = await axios.get("/api/asistencia/ranking-operadores", { headers });
            setOperadores(resOperadores.data);

        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // Actualizar cada 15 seg
        return () => clearInterval(interval);
    }, [fetchData]);

    // Filtrar asistencias
    const asistenciasFiltradas = asistencias.filter(a => {
        // Filtro por tipo
        if (filtro === "vozVoto" && !a.vozVoto) return false;
        if (filtro === "soloVoz" && a.vozVoto) return false;

        // Filtro por sucursal
        if (filtroSucursal !== "todas" && a.sucursal !== filtroSucursal) return false;

        // Búsqueda
        if (busqueda) {
            const term = busqueda.toLowerCase();
            return a.socioNombre.toLowerCase().includes(term) ||
                a.socioNumero.includes(term);
        }

        return true;
    });

    // Lista de sucursales únicas
    const sucursalesUnicas = [...new Set(asistencias.map(a => a.sucursal || "Sin Sucursal"))];

    // Imprimir reporte
    const imprimirReporte = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const fechaHoy = new Date().toLocaleDateString('es-PY', {
            day: '2-digit', month: 'long', year: 'numeric'
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reporte de Asistencia - Asamblea General</title>
                <style>
                    @page { size: A4; margin: 15mm; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; }
                    .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }
                    .logo { width: 80px; height: 80px; }
                    .header-text h1 { margin: 0; font-size: 24px; color: #059669; }
                    .header-text p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
                    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; }
                    .stat-number { font-size: 32px; font-weight: 800; color: #0f172a; }
                    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
                    .stat-card.green { border-color: #10b981; background: #ecfdf5; }
                    .stat-card.green .stat-number { color: #059669; }
                    .stat-card.amber { border-color: #f59e0b; background: #fffbeb; }
                    .stat-card.amber .stat-number { color: #d97706; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                    th { background: #0f172a; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
                    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
                    .badge-green { background: #dcfce7; color: #166534; }
                    .badge-amber { background: #fef3c7; color: #92400e; }
                    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 25px 0 15px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
                    .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px; }
                    @media print {
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="/logo-coop.png" alt="Logo" class="logo" onerror="this.style.display='none'" />
                    <div class="header-text">
                        <h1>REPORTE DE ASISTENCIA</h1>
                        <p>Asamblea General Ordinaria de Socios • ${fechaHoy}</p>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.total}</div>
                        <div class="stat-label">Total Presentes</div>
                    </div>
                    <div class="stat-card green">
                        <div class="stat-number">${stats.vozYVoto}</div>
                        <div class="stat-label">Voz y Voto</div>
                    </div>
                    <div class="stat-card amber">
                        <div class="stat-number">${stats.soloVoz}</div>
                        <div class="stat-label">Solo Voz</div>
                    </div>
                </div>

                <div class="section-title">Por Sucursal</div>
                <table>
                    <thead>
                        <tr>
                            <th>Sucursal</th>
                            <th style="text-align:center">Total</th>
                            <th style="text-align:center">Voz y Voto</th>
                            <th style="text-align:center">Solo Voz</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.sucursales.map(s => `
                            <tr>
                                <td><strong>${s.sucursal}</strong></td>
                                <td style="text-align:center">${s.total}</td>
                                <td style="text-align:center">${s.vozYVoto}</td>
                                <td style="text-align:center">${s.soloVoz}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="section-title">Detalle de Asistentes (${asistenciasFiltradas.length} registros)</div>
                <table>
                    <thead>
                        <tr>
                            <th>N° Socio</th>
                            <th>Nombre Completo</th>
                            <th>Sucursal</th>
                            <th>Condición</th>
                            <th>Hora Ingreso</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${asistenciasFiltradas.slice(0, 100).map(a => `
                            <tr>
                                <td><strong>${a.socioNumero}</strong></td>
                                <td>${a.socioNombre}</td>
                                <td>${a.sucursal || '-'}</td>
                                <td>
                                    <span class="badge ${a.vozVoto ? 'badge-green' : 'badge-amber'}">
                                        ${a.vozVoto ? 'VOZ Y VOTO' : 'SOLO VOZ'}
                                    </span>
                                </td>
                                <td>${new Date(a.fechaHora).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    Generado el ${new Date().toLocaleString('es-PY')} • SIGA - Sistema Integral de Gestión de Asambleas
                </div>

                <script>
                    setTimeout(() => { window.print(); }, 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/asistencia" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800">Consulta de Asistencia</h1>
                        <p className="text-slate-500 text-sm">Actualización en tiempo real cada 15 segundos</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-sm transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Actualizar
                    </button>
                    <button
                        onClick={imprimirReporte}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold text-sm transition-colors"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimir Reporte
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-100 rounded-xl">
                            <Users className="h-6 w-6 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-slate-800">{stats.total}</p>
                            <p className="text-xs text-slate-500 uppercase font-bold">Total Presentes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500 rounded-xl">
                            <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-emerald-600">{stats.vozYVoto}</p>
                            <p className="text-xs text-emerald-600 uppercase font-bold">Voz y Voto</p>
                        </div>
                    </div>
                </div>
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500 rounded-xl">
                            <XCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-amber-600">{stats.soloVoz}</p>
                            <p className="text-xs text-amber-600 uppercase font-bold">Solo Voz</p>
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500 rounded-xl">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-blue-600">{stats.sucursales.length}</p>
                            <p className="text-xs text-blue-600 uppercase font-bold">Sucursales</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs de Vista */}
            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl w-fit">
                {[
                    { id: "general", label: "General", icon: Users },
                    { id: "sucursal", label: "Por Sucursal", icon: Building2 },
                    { id: "usuario", label: "Por Usuario", icon: User }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setVistaActiva(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${vistaActiva === tab.id
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Vista General */}
            {vistaActiva === "general" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Filtros */}
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o número..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value as any)}
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                                <option value="todos">Todos</option>
                                <option value="vozVoto">Solo Voz y Voto</option>
                                <option value="soloVoz">Solo Voz</option>
                            </select>
                            <select
                                value={filtroSucursal}
                                onChange={(e) => setFiltroSucursal(e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                                <option value="todas">Todas las Sucursales</option>
                                {sucursalesUnicas.map(suc => (
                                    <option key={suc} value={suc}>{suc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">N° Socio</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Sucursal</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Condición</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Hora</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {asistenciasFiltradas.slice(0, 50).map((a: AsistenciaItem) => (
                                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-bold text-slate-800">#{a.socioNumero}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-700 truncate max-w-[200px]">{a.socioNombre}</p>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="text-sm text-slate-500">{a.sucursal || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${a.vozVoto
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {a.vozVoto ? 'Voz y Voto' : 'Solo Voz'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-slate-500">
                                                {new Date(a.fechaHora).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {asistenciasFiltradas.length > 50 && (
                        <div className="p-4 bg-slate-50 text-center text-sm text-slate-500">
                            Mostrando 50 de {asistenciasFiltradas.length} registros
                        </div>
                    )}
                </div>
            )}

            {/* Vista por Sucursal */}
            {vistaActiva === "sucursal" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.sucursales.map((suc: EstadisticasSucursal) => (
                        <div key={suc.sucursal} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 rounded-xl">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-slate-800 truncate">{suc.sucursal}</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p className="text-2xl font-black text-slate-800">{suc.total}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Total</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-emerald-600">{suc.vozYVoto}</p>
                                    <p className="text-[10px] text-emerald-600 uppercase font-bold">V&V</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-amber-600">{suc.soloVoz}</p>
                                    <p className="text-[10px] text-amber-600 uppercase font-bold">S.Voz</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Vista por Operador */}
            {vistaActiva === "usuario" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">Ranking de Usuarios</h3>
                        <p className="text-sm text-slate-500">Todos los usuarios del sistema que registraron asistencias</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Usuario</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">V&V</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Solo Voz</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {operadores.slice(0, 20).map((op: Operador, idx: number) => (
                                    <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                idx === 1 ? 'bg-slate-200 text-slate-600' :
                                                    idx === 2 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-800">{op.nombre || op.username}</p>
                                            <p className="text-xs text-slate-400">@{op.username}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-black text-xl text-slate-800">{op.totalRegistros}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-emerald-600 font-bold">{op.vozYVoto}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-amber-600 font-bold">{op.soloVoz}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
