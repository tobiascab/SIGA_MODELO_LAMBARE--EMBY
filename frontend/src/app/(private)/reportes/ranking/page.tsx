"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { UserCircle2, Printer, Trophy, Medal, Award, Crown, ChevronDown, ChevronUp, Users, CheckCircle, AlertCircle, Search as SearchIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RankingReportPage() {
    const [ranking, setRanking] = useState<any[]>([]);
    // Mapa para guardar el ID real del usuario basado en su username: { 'admin': 1, 'pepe': 45 }
    const [userIdMap, setUserIdMap] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Estado para búsqueda
    const [searchTerm, setSearchTerm] = useState("");

    // Mapa para sucursales: { 'VILLARRICA': 5, 'CASA CENTRAL': 1 }
    const [sucursalMap, setSucursalMap] = useState<Record<string, number>>({});

    // Estado para expansión
    const [expandedUsername, setExpandedUsername] = useState<string | null>(null);
    const [sociosDetalle, setSociosDetalle] = useState<any[]>([]);
    const [visibleCount, setVisibleCount] = useState(10); // Límite inicial
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [statsDetalle, setStatsDetalle] = useState<any>(null);

    const [selectedUserForGoals, setSelectedUserForGoals] = useState<any | null>(null);

    useEffect(() => {
        const fetchRanking = async () => {
            try {
                const token = localStorage.getItem("token");
                const config = { headers: { Authorization: `Bearer ${token}` } };

                // Fetch all data in parallel
                const [resRanking, resIds, resSuc] = await Promise.all([
                    axios.get("/api/reportes/ranking-global", config).catch(err => { console.error("Error ranking:", err); return { data: [] }; }),
                    axios.get("/api/asignaciones/ranking-usuarios", config).catch(err => { console.error("Error IDs:", err); return { data: [] }; }),
                    axios.get("/api/reportes/sucursales-lista", config).catch(err => { console.error("Error sucursales:", err); return { data: [] }; })
                ]);

                setRanking(resRanking.data);

                // Map IDs
                const map: Record<string, number> = {};
                if (Array.isArray(resIds.data)) {
                    resIds.data.forEach((u: any) => {
                        if (u.username) map[u.username] = u.id;
                    });
                }
                setUserIdMap(map);

                // Map Sucursales
                const sMap: Record<string, number> = {};
                if (Array.isArray(resSuc.data)) {
                    resSuc.data.forEach((s: any) => {
                        if (s.nombre) sMap[s.nombre.toUpperCase()] = s.id;
                    });
                }
                setSucursalMap(sMap);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRanking();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const toggleExpand = async (user: any) => {
        const username = user.username;

        if (expandedUsername === username) {
            setExpandedUsername(null);
            setSociosDetalle([]);
            return;
        }

        const userId = userIdMap[username];
        if (!userId) {
            alert("No se pudo identificar el ID de este usuario para ver detalles.");
            return;
        }

        setExpandedUsername(username);
        setLoadingDetalle(true);
        setSociosDetalle([]);
        setVisibleCount(10);
        setStatsDetalle(null);

        try {
            const token = localStorage.getItem("token");
            // Usamos reporte general filtrado por operador para ver TODAS sus asignaciones
            const res = await axios.get(`/api/reportes/asignaciones-general?operadorId=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Endpoint devuelve { data: [...], stats: ... }
            const mappedSocios = res.data.data.map((s: any) => ({
                id: s.id,
                nombreCompleto: s.socioNombre,
                cedula: s.cedula,
                numeroSocio: s.socioNro,
                esVyV: s.vozVoto === "HABILITADO",
                fechaHoraIngreso: s.fechaHora, // null si ausente
                // Agregamos campos extra si se necesitan
            }));

            setSociosDetalle(mappedSocios);

            // Ajustamos stats
            setStatsDetalle({
                vyv: res.data.stats.habilitados,
                soloVoz: res.data.stats.observados,
                total: res.data.stats.totalRegistros
            });

        } catch (error) {
            console.error("Error cargando detalle:", error);
            setSociosDetalle([]);
        } finally {
            setLoadingDetalle(false);
        }
    };

    const filteredRanking = ranking.filter(user =>
        user.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Ordenamos el ranking para el podio (top 3) y lista según la query original
    const top1 = ranking[0];
    const top2 = ranking[1];
    const top3 = ranking[2];
    // La lista completa para la tabla

    return (
        <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
            {/* HERRAMIENTAS FLOTANTES (Oculto al imprimir) */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-3 print:hidden z-50">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePrint}
                    className="p-4 bg-slate-900 text-white rounded-full shadow-2xl shadow-slate-500/50 hover:bg-black transition-colors"
                    title="Imprimir /Guardar PDF"
                >
                    <Printer className="h-6 w-6" />
                </motion.button>
            </div>

            <div className="max-w-7xl mx-auto p-8 print:p-0 print:max-w-none">
                {/* HEADER DEL REPORTE */}
                <header className="flex items-center justify-between mb-12 border-b-2 border-slate-200 pb-8 print:mb-8">
                    <div className="flex items-center gap-6">
                        <img src="/logo-cooperativa.png" alt="Logo" className="h-20 w-auto object-contain" />
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Ranking de Gestión</h1>
                            <p className="text-slate-500 font-medium">Asamblea General Ordinaria 2025</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-teal-500 rounded-full font-bold text-sm mb-2 print:border print:border-emerald-200">
                            <Crown className="h-4 w-4" />
                            TOP OPERADORES
                        </div>
                        <p className="text-sm text-slate-400 font-medium">Generado el: {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</p>
                    </div>
                </header>

                {/* PODIUM SECTION (Solo visible si hay al menos 3) */}
                {ranking.length >= 3 && (
                    <div className="mb-16 print:mb-8 print:break-inside-avoid overflow-hidden">
                        <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-4 md:gap-6 min-h-0 md:min-h-[450px] pt-4 md:pt-12">
                            {/* 2nd Place - (Shown first on mobile list or side on desktop) */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="w-full md:w-1/4 flex flex-col items-center z-10"
                            >
                                <div className="mb-2 md:mb-8 text-center relative z-30">
                                    <h3 className="font-bold text-slate-700 line-clamp-1 text-sm md:text-lg px-2">{top2.nombreCompleto}</h3>
                                </div>
                                <div className="w-[85%] md:w-full h-[150px] md:h-[200px] bg-gradient-to-t from-slate-300 to-slate-200 rounded-2xl md:rounded-t-3xl relative shadow-xl border-t border-slate-100 flex flex-row md:flex-col items-center justify-around md:justify-start md:pt-6 print:bg-slate-200 print:bg-none">
                                    <div className="relative">
                                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white border-2 md:border-4 border-slate-300 shadow-lg flex items-center justify-center overflow-hidden">
                                            <UserCircle2 className="h-8 w-8 md:h-10 md:w-10 text-slate-300" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-slate-400 text-white w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-black border-2 border-white text-xs">2</div>
                                    </div>
                                    <div className="flex flex-col items-center md:items-center">
                                        <p className="px-2 py-0.5 bg-white/80 rounded-lg text-[8px] md:text-[10px] text-slate-500 font-bold uppercase border border-slate-200">{top2.sucursal || 'N/A'}</p>
                                        <div className="mt-2 px-3 py-1 md:px-4 md:py-2 bg-white rounded-full text-slate-700 font-black text-sm md:text-lg border-2 border-slate-300 shadow-md">
                                            {top2.registrados} <span className="text-[10px] md:text-sm font-bold">Reg.</span>
                                        </div>
                                    </div>
                                    <Medal className="hidden md:block absolute bottom-3 h-12 w-12 text-slate-400 opacity-20" />
                                </div>
                            </motion.div>

                            {/* 1st Place */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="w-full md:w-1/3 flex flex-col items-center z-20 md:-mx-4 order-first md:order-none"
                            >
                                <div className="mb-2 md:mb-8 text-center relative z-30">
                                    <div className="mb-1 md:mb-2 text-center">
                                        <Crown className="h-6 w-6 md:h-8 md:w-8 text-amber-400 mx-auto fill-amber-400 animate-bounce print:animate-none" />
                                    </div>
                                    <h3 className="font-black text-slate-800 text-lg md:text-2xl line-clamp-1 px-2">{top1.nombreCompleto}</h3>
                                </div>
                                <div className="w-full h-[180px] md:h-[260px] bg-gradient-to-t from-amber-400 to-amber-300 rounded-3xl md:rounded-t-3xl relative shadow-2xl shadow-amber-500/20 border-t border-amber-200 flex flex-row md:flex-col items-center justify-around md:justify-start md:pt-6 print:bg-amber-300 print:bg-none">
                                    <div className="relative">
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border-2 md:border-4 border-amber-300 shadow-xl flex items-center justify-center overflow-hidden">
                                            <UserCircle2 className="h-10 w-10 md:h-12 md:w-12 text-amber-200" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-amber-500 text-white w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black border-2 border-white text-sm">1</div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <p className="px-3 py-1 bg-white/90 rounded-lg text-[10px] md:text-sm text-amber-700 font-bold uppercase border border-amber-200 shadow-sm">{top1.sucursal || 'N/A'}</p>
                                        <div className="mt-2 px-4 py-2 md:px-6 md:py-3 bg-white rounded-full text-amber-600 font-black text-lg md:text-2xl border-2 border-amber-300 shadow-lg">
                                            {top1.registrados} <span className="text-xs md:text-base font-bold">Reg.</span>
                                        </div>
                                    </div>
                                    <Trophy className="hidden md:block absolute bottom-4 h-16 w-16 text-amber-600 opacity-20" />
                                </div>
                            </motion.div>

                            {/* 3rd Place */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="w-full md:w-1/4 flex flex-col items-center z-10"
                            >
                                <div className="mb-2 md:mb-8 text-center relative z-30">
                                    <h3 className="font-bold text-slate-700 line-clamp-1 text-sm md:text-lg px-2">{top3.nombreCompleto}</h3>
                                </div>
                                <div className="w-[75%] md:w-full h-[120px] md:h-[160px] bg-gradient-to-t from-orange-300 to-orange-200 rounded-2xl md:rounded-t-3xl relative shadow-xl border-t border-orange-100 flex flex-row md:flex-col items-center justify-around md:justify-start md:pt-5 print:bg-orange-200 print:bg-none">
                                    <div className="relative">
                                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white border-2 md:border-4 border-orange-300 shadow-lg flex items-center justify-center overflow-hidden">
                                            <UserCircle2 className="h-6 w-6 md:h-8 md:w-8 text-orange-200" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center font-black border-2 border-white text-[10px]">3</div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <p className="px-2 py-0.5 bg-white/80 rounded text-[7px] md:text-[9px] text-orange-600 font-bold uppercase border border-orange-200">{top3.sucursal || 'N/A'}</p>
                                        <div className="mt-1 px-2.5 py-1 md:px-3 md:py-1.5 bg-white rounded-full text-orange-700 font-black text-sm md:text-base border-2 border-orange-300 shadow-md">
                                            {top3.registrados} <span className="text-[10px] font-bold">Reg.</span>
                                        </div>
                                    </div>
                                    <Medal className="hidden md:block absolute bottom-2 h-10 w-10 text-orange-500 opacity-20" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* DETAILED LIST */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-none">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 print:hidden flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <Award className="h-5 w-5 text-indigo-500" />
                            Listado Completo de Gestión
                        </h2>

                        {/* BUSCADOR */}
                        <div className="relative w-full sm:w-72">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar operador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider print:bg-slate-100">
                                <th className="p-2 md:p-4 w-10 md:w-12 text-center">#</th>
                                <th className="p-2 md:p-4">Operador</th>
                                <th className="p-2 md:p-4 hidden sm:table-cell text-center">Sucursal</th>
                                <th className="p-2 md:p-4 w-20 md:w-32 text-center">Registrados</th>
                                <th className="p-2 md:p-4 w-24 md:w-48 text-center print:hidden hidden md:table-cell">Progreso</th>
                                <th className="p-2 md:p-4 w-10 md:w-12 print:hidden"></th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredRanking.map((user, index) => {
                                const isExpanded = expandedUsername === user.username;
                                const hasId = !!userIdMap[user.username];

                                return (
                                    <React.Fragment key={user.username}>
                                        <tr
                                            onClick={() => hasId && toggleExpand(user)}
                                            className={`border-b border-slate-50 last:border-none transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'
                                                } ${index < 3 ? 'bg-yellow-50/30 print:bg-white' : ''}`}
                                        >
                                            <td className="p-4 text-center font-black text-slate-400">
                                                {index < 3 ? (
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {index + 1}
                                                    </span>
                                                ) : <span>{index + 1}</span>}
                                            </td>
                                            <td className="p-2 md:p-4">
                                                <div className="font-bold text-slate-800 text-sm md:text-base leading-tight truncate max-w-[120px] md:max-w-none">{user.nombreCompleto}</div>
                                                <div className="text-[10px] text-slate-400 font-medium truncate">@{user.username}</div>
                                                <div className="sm:hidden mt-1 inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase">
                                                    {user.sucursal}
                                                </div>
                                            </td>
                                            <td className="p-2 md:p-4 hidden sm:table-cell text-center">
                                                <span className="inline-block px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase">
                                                    {user.sucursal}
                                                </span>
                                            </td>
                                            <td className="p-2 md:p-4 text-center">
                                                <div className="font-black text-lg md:text-xl text-slate-800">{user.registrados}</div>
                                            </td>
                                            <td
                                                className="p-4 print:hidden"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedUserForGoals(user);
                                                }}
                                            >
                                                {user.meta > 0 ? (
                                                    <div className="w-full cursor-pointer group/progress">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-[10px] font-black text-slate-400">{user.porcentaje.toFixed(0)}%</span>
                                                            <motion.span
                                                                animate={{
                                                                    scale: [1, 1.05, 1],
                                                                    opacity: [0.8, 1, 0.8]
                                                                }}
                                                                transition={{
                                                                    duration: 3,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut"
                                                                }}
                                                                className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-tighter border border-indigo-100 flex items-center gap-1 shadow-sm"
                                                            >
                                                                Ver Metas <ChevronDown className="h-2.5 w-2.5 rotate-[-90deg]" />
                                                            </motion.span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(user.porcentaje, 100)}%` }}
                                                                className={`h-full rounded-full ${user.porcentaje >= 100 ? 'bg-emerald-500' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400 italic">Sin meta</span>}
                                            </td>
                                            <td className="p-4 text-center print:hidden">
                                                {hasId && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Evitar doble trigger
                                                            if (hasId) toggleExpand(user);
                                                        }}
                                                        className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {/* DETALLE EXPANDIDO */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} className="p-0 border-b border-slate-100 bg-slate-50/50 print:table-row">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-6">
                                                                {loadingDetalle ? (
                                                                    <div className="flex justify-center p-4">
                                                                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                                                        {/* STATS DEL DETALLE - REDISEÑADO PREMIUM */}
                                                                        {statsDetalle && (
                                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-b border-slate-100 bg-white">
                                                                                <div className="p-6 text-center border-b sm:border-b-0 sm:border-r border-slate-100 relative group overflow-hidden">
                                                                                    <div className="absolute inset-0 bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                    <div className="relative z-10">
                                                                                        <div className="flex items-center justify-center gap-2 mb-2">
                                                                                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                                                                                <Users className="h-4 w-4" />
                                                                                            </div>
                                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Asignados</span>
                                                                                        </div>
                                                                                        <div className="text-5xl font-black text-slate-800 tracking-tight drop-shadow-sm">
                                                                                            {statsDetalle.total || 0}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="p-6 text-center border-b sm:border-b-0 sm:border-r border-slate-100 relative group overflow-hidden">
                                                                                    <div className="absolute inset-0 bg-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                    <div className="relative z-10">
                                                                                        <div className="flex items-center justify-center gap-2 mb-2">
                                                                                            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                                                                                                <CheckCircle className="h-4 w-4" />
                                                                                            </div>
                                                                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Voz y Voto</span>
                                                                                        </div>
                                                                                        <div className="text-5xl font-black text-emerald-600 tracking-tight drop-shadow-sm">
                                                                                            {statsDetalle.vyv || 0}
                                                                                        </div>
                                                                                        <div className="text-[10px] font-bold text-emerald-500/70 mt-1 uppercase">Habilitados</div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="p-6 text-center relative group overflow-hidden">
                                                                                    <div className="absolute inset-0 bg-amber-50/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                    <div className="relative z-10">
                                                                                        <div className="flex items-center justify-center gap-2 mb-2">
                                                                                            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                                                                                                <AlertCircle className="h-4 w-4" />
                                                                                            </div>
                                                                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Solo Voz</span>
                                                                                        </div>
                                                                                        <div className="text-5xl font-black text-amber-700 tracking-tight drop-shadow-sm">
                                                                                            {statsDetalle.soloVoz || 0}
                                                                                        </div>
                                                                                        <div className="text-[10px] font-bold text-amber-600/70 mt-1 uppercase">Observados</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <table className="w-full text-sm">
                                                                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                                                                <tr>
                                                                                    <th className="p-3 text-left w-16"># Socio</th>
                                                                                    <th className="p-3 text-left">Socio</th>
                                                                                    <th className="p-3 text-center">Condición</th>
                                                                                    <th className="p-3 text-center">Asistencia</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100">
                                                                                {sociosDetalle.slice(0, visibleCount).map((socio) => (
                                                                                    <tr key={socio.id} className="hover:bg-slate-50 transition-colors">
                                                                                        <td className="p-3 font-mono text-xs text-slate-500">{socio.numeroSocio}</td>
                                                                                        <td className="p-3">
                                                                                            <div className="font-bold text-slate-700">{socio.nombreCompleto}</div>
                                                                                            <div className="text-[10px] text-slate-400">CI: {socio.cedula}</div>
                                                                                        </td>
                                                                                        <td className="p-3 text-center">
                                                                                            {socio.esVyV ? (
                                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                                                                                    <Users className="h-3 w-3" /> V+V
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                                                                                    <AlertCircle className="h-3 w-3" /> Solo Voz
                                                                                                </span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="p-3 text-center">
                                                                                            {socio.fechaHoraIngreso ? (
                                                                                                <div className="flex flex-col items-center">
                                                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase mb-0.5">
                                                                                                        <CheckCircle className="h-3 w-3" />
                                                                                                        Presente
                                                                                                    </span>
                                                                                                    <span className="text-[9px] text-emerald-600 font-medium">
                                                                                                        {new Date(socio.fechaHoraIngreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                                    </span>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase">
                                                                                                    Ausente
                                                                                                </span>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                                {sociosDetalle.length === 0 && (
                                                                                    <tr>
                                                                                        <td colSpan={4} className="p-8 text-center text-slate-400 text-sm italic">
                                                                                            No se encontraron socios asignados para este operador.
                                                                                        </td>
                                                                                    </tr>
                                                                                )}
                                                                            </tbody>
                                                                        </table>

                                                                        {/* LOAD MORE BUTTON */}
                                                                        {sociosDetalle.length > visibleCount && (
                                                                            <div className="p-3 flex justify-center bg-slate-50 border-t border-slate-100">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setVisibleCount(prev => prev + 20);
                                                                                    }}
                                                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-6 py-2 rounded-full transition-all border border-indigo-100 shadow-sm"
                                                                                >
                                                                                    Mostrar más socios ({sociosDetalle.length - visibleCount} restantes)
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 text-center print:mt-12">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cooperativa Multiactiva Lambaré Ltda. Ltda • Sistema de Gestión de Asambleas</p>
                </div>
            </div>

            {/* MILESTONE SHEET (INTERACTIVE GOALS) */}
            <AnimatePresence>
                {selectedUserForGoals && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedUserForGoals(null)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] print:hidden"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col print:hidden"
                        >
                            {/* Header del Sheet */}
                            <div className="p-8 border-b border-slate-100 relative">
                                <button
                                    onClick={() => setSelectedUserForGoals(null)}
                                    className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <ChevronDown className="h-6 w-6 text-slate-400 rotate-[-90deg]" />
                                </button>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                        <Trophy className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Próximos Hitos</h2>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Metas de Gestión</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operador</div>
                                    <div className="font-black text-slate-800 text-lg leading-tight uppercase">{selectedUserForGoals.nombreCompleto}</div>
                                </div>
                            </div>

                            {/* Contenido del Sheet */}
                            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-200">
                                <div className="mb-8">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Estado Actual</span>
                                        <span className="text-3xl font-black text-indigo-600 tracking-tighter">{selectedUserForGoals.registrados} <span className="text-sm text-slate-300 italic uppercase">registros</span></span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((selectedUserForGoals.registrados / (Math.ceil((selectedUserForGoals.registrados + 1) / 50) * 50)) * 100, 100)}%` }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[50, 100, 150, 200, 300, 400, 500].map((goal, i) => {
                                        const isReached = selectedUserForGoals.registrados >= goal;
                                        const isNext = !isReached && (i === 0 || selectedUserForGoals.registrados >= [50, 100, 150, 200, 300, 400, 500][i - 1]);

                                        return (
                                            <div
                                                key={goal}
                                                className={`p-5 rounded-[2rem] border-2 transition-all flex items-center justify-between ${isReached
                                                    ? 'bg-emerald-50 border-emerald-100 opacity-60'
                                                    : isNext
                                                        ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-500/10 scale-[1.02]'
                                                        : 'bg-slate-50 border-slate-100'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-2xl ${isReached ? 'bg-emerald-500 text-white' : isNext ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                        {isReached ? <CheckCircle className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <div className={`text-xl font-black ${isReached ? 'text-emerald-700' : isNext ? 'text-slate-800' : 'text-slate-400'}`}>
                                                            Meta de {goal}
                                                        </div>
                                                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                            {isReached ? '¡CONSEGUIDO!' : isNext ? '¡SIGUIENTE NIVEL!' : 'BLOQUEADO'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isNext && (
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-indigo-600">Faltan {goal - selectedUserForGoals.registrados}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">esfuerzo final</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer del Sheet */}
                            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 text-slate-500 italic text-sm">
                                    <AlertCircle className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                                    "Cada registro es un paso más hacia la eficiencia absoluta de nuestra asamblea."
                                </div>
                                <button
                                    onClick={() => setSelectedUserForGoals(null)}
                                    className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-colors shadow-xl"
                                >
                                    Cerrar Panel
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ESTILOS PARA IMPRESIÓN */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 1cm;
                        size: A4;
                    }
                    body {
                        background-color: white !important;
                    }
                }
            `}</style>
        </div>
    );
}
