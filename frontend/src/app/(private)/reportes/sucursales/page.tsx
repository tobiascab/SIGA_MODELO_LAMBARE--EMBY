"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from "recharts";
import {
    Building2, Printer, TrendingUp, Target, PieChart as PieIcon,
    ArrowUpRight, Users, MapPin
} from "lucide-react";
import { motion } from "framer-motion";

export default function SucursalesReportPage() {
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalRegistros: 0,
        totalMeta: 0,
        cumplimientoGlobal: 0,
        topSucursal: { nombre: "", cantidad: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Colores corporativos para los gráficos
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get("/api/reportes/ranking-global", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // --- PROCESAMIENTO DE DATOS EN CLIENTE ---
                const rawData = res.data;
                const branchMap: Record<string, { name: string, registros: number, meta: number, funcionarios: number }> = {};

                let globalReg = 0;
                let globalMeta = 0;

                rawData.forEach((user: any) => {
                    const sucursalName = user.sucursal || "Sin Sucursal";

                    if (!branchMap[sucursalName]) {
                        branchMap[sucursalName] = {
                            name: sucursalName,
                            registros: 0,
                            meta: 0,
                            funcionarios: 0
                        };
                    }

                    branchMap[sucursalName].registros += user.registrados || 0;
                    branchMap[sucursalName].meta += user.meta || 0;
                    branchMap[sucursalName].funcionarios += 1;

                    globalReg += user.registrados || 0;
                    globalMeta += user.meta || 0;
                });

                // Convertir a array y ordenar por registros
                const processedData = Object.values(branchMap).sort((a, b) => b.registros - a.registros);

                setData(processedData);
                setStats({
                    totalRegistros: globalReg,
                    totalMeta: globalMeta,
                    cumplimientoGlobal: globalMeta > 0 ? (globalReg / globalMeta) * 100 : 0,
                    topSucursal: {
                        nombre: processedData[0]?.name || "N/A",
                        cantidad: processedData[0]?.registros || 0
                    }
                });

            } catch (error) {
                console.error("Error cargando reporte:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
            {/* BOTÓN FLOTANTE DE IMPRIMIR */}
            <div className="fixed bottom-8 right-8 print:hidden z-50">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-full shadow-2xl shadow-slate-500/50 hover:bg-black transition-colors font-bold"
                >
                    <Printer className="h-5 w-5" />
                    <span>Guardar PDF</span>
                </motion.button>
            </div>

            <div className="max-w-7xl mx-auto p-8 print:p-0 print:max-w-none">
                {/* HEADER */}
                <header className="flex items-center justify-between mb-10 border-b-2 border-slate-200 pb-6">
                    <div className="flex items-center gap-6">
                        <img src="/logo-cooperativa.png" alt="Logo" className="h-20 w-auto object-contain" />
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Reporte de Sucursales</h1>
                            <p className="text-slate-500 font-medium">Análisis de Gestión y Metas 2025</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-bold text-sm mb-2">
                            <Building2 className="h-4 w-4" />
                            VISTA CORPORATIVA
                        </div>
                        <p className="text-sm text-slate-400 font-medium">Generado el: {currentTime.toLocaleDateString()}</p>
                    </div>
                </header>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 print:grid-cols-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Users className="h-24 w-24 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Registrados</p>
                            <h3 className="text-4xl font-black text-slate-800">{stats.totalRegistros.toLocaleString()}</h3>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-sm">
                            <TrendingUp className="h-4 w-4" />
                            <span>Socios Activos</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Target className="h-24 w-24 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Meta Global</p>
                            <h3 className="text-4xl font-black text-slate-800">{stats.totalMeta.toLocaleString()}</h3>
                        </div>
                        <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(stats.cumplimientoGlobal, 100)}%` }}></div>
                        </div>
                        <p className="text-xs text-right mt-1 font-bold text-slate-400">{stats.cumplimientoGlobal.toFixed(1)}% Cumplido</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden md:col-span-2 print:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Building2 className="h-32 w-32 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Sucursal Líder</p>
                            <h3 className="text-4xl font-black text-slate-800">{stats.topSucursal.nombre}</h3>
                        </div>
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold w-fit">
                            <ArrowUpRight className="h-4 w-4" />
                            {stats.topSucursal.cantidad} Registros Aportados
                        </div>
                    </div>
                </div>

                {/* GRAFICO BARRAS */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-8 print:break-inside-avoid">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-indigo-500" />
                            Desempeño vs Objetivos
                        </h2>
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={350}>
                            <BarChart
                                data={data}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0/0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="registros" name="Registros Reales" fill="#10b981" radius={[4, 4, 0, 0]} barSize={50} />
                                <Bar dataKey="meta" name="Meta Asignada" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={50} opacity={0.3} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SECCION INFERIOR: TORTA Y TABLA */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-3">
                    {/* GRAFICO TORTA */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center print:break-inside-avoid">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 w-full">
                            <PieIcon className="h-5 w-5 text-purple-500" />
                            Participación
                        </h2>
                        <div className="h-[300px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="registros"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Centro de la dona */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="block text-3xl font-black text-slate-800">{data.length}</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Sucursales</span>
                                </div>
                            </div>
                        </div>
                        {/* Leyenda Custom */}
                        <div className="grid grid-cols-2 gap-2 w-full mt-4">
                            {data.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-slate-600 font-medium truncate">{entry.name}</span>
                                    <span className="ml-auto font-bold text-slate-800">{((entry.registros / stats.totalRegistros) * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TABLA DETALLADA */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden lg:col-span-2 print:col-span-2">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Detalle Operativo</h2>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                                    <th className="p-4">Sucursal</th>
                                    <th className="p-4 text-center">Funcionarios</th>
                                    <th className="p-4 text-center">Registros</th>
                                    <th className="p-4 text-center">Meta</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {data.map((row, index) => (
                                    <tr key={index} className="border-b border-slate-50 last:border-none hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-700 flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            {row.name}
                                        </td>
                                        <td className="p-4 text-center text-slate-500">{row.funcionarios}</td>
                                        <td className="p-4 text-center font-black text-slate-800 text-lg">{row.registros}</td>
                                        <td className="p-4 text-center">
                                            <div className="w-full max-w-[100px] mx-auto">
                                                <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                                                    <span>{row.meta > 0 ? Math.round((row.registros / row.meta) * 100) : 0}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${row.registros >= row.meta ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${row.meta > 0 ? Math.min((row.registros / row.meta) * 100, 100) : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 text-center print:mt-12">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cooperativa Multiactiva Lambaré Ltda • Gestión Estratégica</p>
                </div>
            </div>
            {/* ESTILOS PARA IMPRESIÓN */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0.5cm;
                        size: landscape;
                    }
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
