"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    ShieldCheck,
    AlertTriangle,
    TrendingUp,
    Clock,
    Building2,
    RefreshCw
} from "lucide-react";
import axios from "axios";

interface Estadisticas {
    totalPadron: number;
    conVozYVoto: number;
    soloVoz: number;
    totalMeta?: number;
}

interface DesempenoSucursal {
    sucursalId: number;
    sucursal: string;
    padron: number;
    presentes: number;
    vozVoto: number;
    ratio: number;
}

interface ListaResumen {
    id: number;
    nombre: string;
    total: number;
    vyv: number;
    soloVoz: number;
}

import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { SocioDashboard } from "@/components/dashboard/SocioDashboard";
import { CountdownTimer } from "@/components/dashboard/CountdownTimer";
import { DeadlineOverlay } from "@/components/dashboard/DeadlineOverlay";

export default function DashboardPage() {
    const [stats, setStats] = useState<Estadisticas | null>(null);
    const [desempeno, setDesempeno] = useState<DesempenoSucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [misListas, setMisListas] = useState<ListaResumen[]>([]);
    const [rankingOperadores, setRankingOperadores] = useState<any[]>([]);

    // Nuevo estado para estadísticas de actividad
    const [userActivity, setUserActivity] = useState<{
        total: number;
        usuales: number;
        activos: number;
        sinRegistros?: number;
        activeList: any[];
        hourlyStats: { labels: string[], data: number[] };
    } | undefined>(undefined);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userData = localStorage.getItem("user");
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                const headers = { Authorization: `Bearer ${token}` };
                // Solo SUPER_ADMIN, SUPER_ADMIN_VISUAL y DIRECTIVO ven el dashboard administrativo completo
                const isAdmin = parsedUser.rol === "SUPER_ADMIN" || parsedUser.rol === "SUPER_ADMIN_VISUAL" || parsedUser.rol === "DIRECTIVO";
                const isSocioView = !isAdmin; // Todos los demás roles ven el SocioDashboard

                if (isSocioView) {
                    try {
                        const listasRes = await axios.get("/api/asignaciones/mis-listas", { headers });
                        setMisListas(listasRes.data);
                    } catch (err) {
                        console.error("Error cargando listas del socio:", err);
                        setMisListas([]);
                    }
                } else {
                    const [statsRes, desempenoRes, rankingRes, historyRes] = await Promise.all([
                        axios.get("/api/socios/estadisticas", { headers }),
                        axios.get("/api/socios/estadisticas/por-sucursal", { headers }),
                        axios.get("/api/asignaciones/ranking-usuarios", { headers }),
                        axios.get("/api/socios/import-history", { headers })
                    ]);

                    let statsData = statsRes.data;

                    // FIXED: Override Total Padron from History if larger than DB count (to show "Numeros Completos")
                    try {
                        const history = historyRes.data || [];
                        if (history.length > 0) {
                            const maxImported = Math.max(...history.map((h: any) => h.totalRegistros || 0));

                            // If history shows much more data than current DB (e.g. only assigned loaded)
                            if (maxImported > (statsData.totalPadron * 1.2)) {
                                console.log("Adjusting Padron Limit using History:", maxImported);
                                const originalTotal = statsData.totalPadron;
                                const ratioVyV = originalTotal > 0 ? statsData.conVozYVoto / originalTotal : 0.85;

                                statsData.totalPadron = maxImported;
                                // Extrapolate distribution
                                statsData.conVozYVoto = Math.round(maxImported * ratioVyV);
                                statsData.soloVoz = maxImported - statsData.conVozYVoto;
                            }
                        }
                    } catch (e) {
                        console.error("Error correcting stats with history:", e);
                    }

                    setStats(statsData);
                    setDesempeno(desempenoRes.data);

                    // Mapear respuesta del ranking de asignaciones al formato esperado por AdminDashboard
                    const mappedRanking = (rankingRes.data || []).map((item: any) => ({
                        nombre: item.nombre,
                        username: item.username,
                        totalRegistros: item.totalAsignados, // Mapeamos totalAsignados a totalRegistros
                        ...item
                    }));

                    setRankingOperadores(mappedRanking);

                    // Setear actividad de usuarios (SOLO si es ADMIN o DIRECTIVO)
                    if (parsedUser.rol === "SUPER_ADMIN" || parsedUser.rol === "SUPER_ADMIN_VISUAL" || parsedUser.rol === "DIRECTIVO") {

                        const [activityRes, activeListRes, hourlyStatsRes] = await Promise.all([
                            axios.get("/api/usuarios/estadisticas", { headers }),
                            axios.get("/api/usuarios/activos-lista", { headers }),
                            axios.get("/api/usuarios/stats-actividad", { headers })
                        ]);

                        setUserActivity({
                            total: activityRes.data.total,
                            usuales: activityRes.data.usuales,
                            activos: activityRes.data.activos,
                            sinRegistros: activityRes.data.sinRegistros,
                            activeList: activeListRes.data,
                            hourlyStats: hourlyStatsRes.data
                        });

                    }
                }
            }
        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
            // Fallback: Set empty stats to prevent infinite loading
            setStats({
                totalPadron: 0,
                conVozYVoto: 0,
                soloVoz: 0,
                totalMeta: 0,
                presentes: 0,
                presentesVyV: 0
            });
            setDesempeno([]);
            setRankingOperadores([]);
            if (user?.rol === "SUPER_ADMIN" || user?.rol === "SUPER_ADMIN_VISUAL" || user?.rol === "DIRECTIVO") {
                setUserActivity({
                    total: 0,
                    usuales: 0,
                    activos: 0,
                    sinRegistros: 0,
                    activeList: [],
                    hourlyStats: { labels: [], data: [] }
                });
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando Dashboard...</p>
                </div>
            </div>
        );
    }

    // Solo SUPER_ADMIN, SUPER_ADMIN_VISUAL y DIRECTIVO ven el dashboard administrativo
    const isAdminView = user?.rol === "SUPER_ADMIN" || user?.rol === "SUPER_ADMIN_VISUAL" || user?.rol === "DIRECTIVO";
    const isSocioView = !isAdminView;

    return (
        <div className="animate-in fade-in duration-500">
            <DeadlineOverlay />
            <CountdownTimer />

            {isSocioView ? (
                <SocioDashboard misListas={misListas} />
            ) : (
                <AdminDashboard
                    stats={stats}
                    desempeno={desempeno}
                    ranking={rankingOperadores}
                    userActivity={userActivity || { total: 0, usuales: 0, activos: 0, activeList: [], hourlyStats: { labels: [], data: [] } }}
                    onRefresh={fetchData}
                />
            )}

            {!isSocioView && stats && stats.totalPadron === 0 && (
                <div className="mt-8 rounded-3xl bg-amber-50 border border-amber-200 p-12 text-center">
                    <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-black text-amber-800 mb-2 uppercase italic">Padrón Vacío</h2>
                    <p className="text-amber-700 font-medium mb-6">
                        Es necesario importar el padrón oficial de socios para activar las métricas del sistema.
                    </p>
                    <a
                        href="/importar"
                        className="inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-4 font-black text-white hover:bg-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-sm"
                    >
                        Ir a Importación
                    </a>
                </div>
            )}
        </div>
    );
}
