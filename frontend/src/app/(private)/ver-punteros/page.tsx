"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Swal from "sweetalert2";
import { useCooperativa } from "@/context/CooperativaContext";
import {
    Target,
    Users,
    UserPlus,
    CheckCircle2,
    Search,
    RefreshCw,
    Clock,
    UserCheck,
    Loader2,
    X,
    Hash,
    CreditCard,
    ChevronDown,
    ChevronUp,
    BarChart3,
    AlertCircle,
    Phone,
    Eye,
    EyeOff,
    List,
    Trash2,
    UserMinus,
    ArrowRight,
    Check,
    LogIn,
    Lock,
    Unlock,
    RotateCcw,
    MessageCircle,
} from "lucide-react";

interface Puntero {
    id: number;
    username: string;
    nombreCompleto: string;
    meta: number;
    activo: boolean;
    fotoPerfil: string | null;
    lastLogin: string | null;
    totalAsignados: number;
    cumplioMeta: boolean;
    porcentajeMeta: number;
    loginHabilitado: boolean;
}

interface PunterosResponse {
    punteros: Puntero[];
    totalPunteros: number;
    totalTraidosPorPunteros: number;
    punterosQueCumplieron: number;
    totalPropiosDirigente: number;
    totalCombinado: number;
}

interface SocioLista {
    id: number;
    cedula: string;
    nombreCompleto: string;
    numeroSocio: string;
    telefono: string;
    sucursal: { id: number; nombre: string } | null;
    listaOrigen?: string;
}

// Deteccion de genero por nombre
const FEMALE_NAMES = new Set(['maria', 'ana', 'carmen', 'rosa', 'julia', 'laura', 'lucia', 'andrea', 'patricia', 'gabriela', 'sandra', 'monica', 'claudia', 'silvia', 'susana', 'veronica', 'adriana', 'elena', 'alicia', 'teresa', 'beatriz', 'lorena', 'carolina', 'liliana', 'alejandra', 'cecilia', 'marta', 'miriam', 'natalia', 'graciela', 'norma', 'irene', 'gladys', 'blanca', 'raquel', 'ruth', 'olga', 'esther', 'estela', 'dora', 'ester', 'martha', 'nilda', 'mirta', 'elsa', 'elvira', 'hilda', 'edith', 'celsa', 'juana', 'isabel', 'liz', 'luz', 'sol', 'eva', 'alba', 'perla', 'gloria', 'nancy', 'delia', 'ramona', 'lidia', 'victoria', 'celia', 'elba', 'stella', 'sara', 'lilian', 'sonia', 'emma', 'dora', 'nora', 'catalina', 'viviana', 'rocio', 'diana', 'paola', 'noemi', 'cristina', 'florencia', 'romina', 'valeria', 'yolanda', 'cinthia', 'jessica', 'vanessa', 'maribel', 'mariel', 'marlene', 'soledad', 'fatima', 'marcela', 'pamela', 'daniela', 'micaela', 'antonella', 'agustina', 'camila', 'sofia', 'valentina', 'martina', 'milagros', 'pilar', 'luciana', 'brenda', 'silvana', 'karina', 'margarita', 'francisca', 'antonia', 'josefina', 'magdalena', 'celeste', 'dahiana', 'daisy']);

function isFemale(name: string): boolean {
    if (!name) return false;
    // Take the first name part (after last name if format is "LASTNAME, FIRSTNAME")
    const parts = name.toLowerCase().trim().split(/[,\s]+/).filter(Boolean);
    // If comma-separated (APELLIDO, NOMBRE), use the part after comma
    const commaIdx = name.indexOf(',');
    let firstName = '';
    if (commaIdx > 0) {
        firstName = name.substring(commaIdx + 1).trim().split(/\s+/)[0].toLowerCase();
    } else {
        firstName = parts[0] || '';
    }
    // Remove accents for matching
    firstName = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return FEMALE_NAMES.has(firstName);
}

// SVG siluetas inline (data URIs)
const MALE_SILHOUETTE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="32" r="18" fill="white" opacity="0.9"/><ellipse cx="50" cy="85" rx="30" ry="22" fill="white" opacity="0.9"/></svg>')}`;
const FEMALE_SILHOUETTE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="30" r="18" fill="white" opacity="0.9"/><path d="M20,95 Q20,58 50,55 Q80,58 80,95 Z" fill="white" opacity="0.9"/></svg>')}`;

function getAvatarSvg(name: string, size = 40): string {
    const female = isFemale(name);
    const src = female ? FEMALE_SILHOUETTE : MALE_SILHOUETTE;
    return `<img src="${src}" width="${size}" height="${size}" style="display:block;margin:auto;" alt="" />`;
}

export default function VerPunterosPage() {
    const { cooperativa } = useCooperativa();
    // Punteros module uses its own orange palette
    const cp = '#f59e0b';
    const cs = '#ea580c';
    const ca = cooperativa.colorAcento || '#D4AF37';
    const logoUrl = cooperativa.logo || '/logo.png';

    const [user, setUser] = useState<any>(null);
    const [punterosData, setPunterosData] = useState<PunterosResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCrearPuntero, setShowCrearPuntero] = useState(false);
    const [allSocios, setAllSocios] = useState<SocioLista[]>([]);
    const [loadingSocios, setLoadingSocios] = useState(false);
    const [sociosCargados, setSociosCargados] = useState(false);
    const [searchSocio, setSearchSocio] = useState("");
    const [creandoPuntero, setCreandoPuntero] = useState<number | null>(null);
    const [visibleCount, setVisibleCount] = useState(30);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Para auto-identificación del dirigente por CI
    const [dirigentes, setDirigentes] = useState<any[]>([]);
    const [selectedDirigenteId, setSelectedDirigenteId] = useState<number | null>(null);
    const [autoMatchedDirigente, setAutoMatchedDirigente] = useState<any>(null);
    const [autoMatchFailed, setAutoMatchFailed] = useState(false);

    // Expandir puntero para ver sus socios
    const [expandedPunteroId, setExpandedPunteroId] = useState<number | null>(null);
    const [punteroSocios, setPunteroSocios] = useState<any>(null);
    const [loadingPunteroSocios, setLoadingPunteroSocios] = useState(false);

    // Reporte de asistencia vs listas
    const [showReporte, setShowReporte] = useState(false);
    const [reporteData, setReporteData] = useState<any>(null);
    const [loadingReporte, setLoadingReporte] = useState(false);

    // Asignar socios del dirigente al puntero
    const [showAsignarSocios, setShowAsignarSocios] = useState<number | null>(null); // punteroId activo
    const [sociosDisponibles, setSociosDisponibles] = useState<any[]>([]);
    const [loadingDisponibles, setLoadingDisponibles] = useState(false);
    const [selectedSocioIds, setSelectedSocioIds] = useState<Set<number>>(new Set());
    const [asignandoSocios, setAsignandoSocios] = useState(false);
    const [searchAsignar, setSearchAsignar] = useState("");
    const [removingSocioId, setRemovingSocioId] = useState<number | null>(null);
    const [togglingLoginId, setTogglingLoginId] = useState<number | null>(null);

    const getWhatsAppLinkWithMessage = (socio: any) => {
        if (!socio.telefono) return null;
        let cleanPhone = socio.telefono.replace(/\D/g, '');
        if (cleanPhone.startsWith('09')) {
            cleanPhone = '595' + cleanPhone.substring(1);
        }

        const firstNames = socio.nombreCompleto?.split(', ')[1] || socio.nombreCompleto?.split(' ')[0] || '';
        const name = firstNames.split(' ')[0] || '';
        const female = isFemale(socio.nombreCompleto);
        const greeting = female ? 'Sra.' : 'Sr.';

        const userNameParts = user?.nombre?.split(' ') || user?.nombreCompleto?.split(' ') || ['Asesor'];
        const userNameStr = userNameParts[0] + (userNameParts.length > 1 ? ' ' + userNameParts[userNameParts.length - 1] : '');

        const message = `¡Hola! Buenos días ${greeting} *${name}* \uD83D\uDC4B\n\nTe saluda *${userNameStr}* de la *Cooperativa Lambaré* \u2705 para invitarte cordialmente a nuestra próxima asamblea institucional que será el día *sábado 21 de marzo de 2026*.\n\n¡Contamos con tu apoyo y participación! \uD83C\uDF1F Si tienes alguna duda, puedes responderme por este medio.`;

        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    };

    // Asignar socios del padrón general
    const [showAsignarPadron, setShowAsignarPadron] = useState<number | null>(null);
    const [searchPadron, setSearchPadron] = useState("");
    const [resultadosPadron, setResultadosPadron] = useState<any[]>([]);
    const [loadingPadron, setLoadingPadron] = useState(false);
    const [selectedPadronIds, setSelectedPadronIds] = useState<Set<number>>(new Set());
    const [asignandoPadron, setAsignandoPadron] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            const u = JSON.parse(stored);
            setUser(u);
        }
    }, []);

    const fetchPunteros = useCallback(async () => {
        if (!user) return;
        const token = localStorage.getItem("token");
        const dirigenteId = user.rol === "SUPER_ADMIN" && selectedDirigenteId ? selectedDirigenteId : user.id;

        try {
            setLoading(true);
            const res = await axios.get(`/api/usuarios/${dirigenteId}/punteros`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPunterosData(res.data);
        } catch (error: any) {
            console.error("Error fetching punteros:", error);
        } finally {
            setLoading(false);
        }
    }, [user, selectedDirigenteId]);

    const fetchDirigentes = useCallback(async () => {
        if (!user) return;
        const token = localStorage.getItem("token");
        try {
            const res = await axios.get("/api/usuarios", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allUsers = res.data;
            const dirs = allUsers.filter((u: any) => u.isDirigente === true);
            setDirigentes(dirs);

            // Auto-match: buscar al usuario logueado por su CI (username)
            const miCI = user.username;
            const miDirigente = dirs.find((d: any) => d.username === miCI);
            if (miDirigente) {
                setSelectedDirigenteId(miDirigente.id);
                setAutoMatchedDirigente(miDirigente);
                setAutoMatchFailed(false);
            } else {
                // Fallback: si el user.id coincide con un dirigente
                const porId = dirs.find((d: any) => d.id === user.id);
                if (porId) {
                    setSelectedDirigenteId(porId.id);
                    setAutoMatchedDirigente(porId);
                    setAutoMatchFailed(false);
                } else if (user.rol === "SUPER_ADMIN") {
                    // SUPER_ADMIN: validar CI contra el padrón de socios
                    try {
                        const padronRes = await axios.get(`/api/socios/buscar-exacto?term=${miCI}&tipo=cedula`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const socioMatch = padronRes.data;

                        if (socioMatch && socioMatch.cedula) {
                            // CI validada contra el padrón — usar su propio user como dirigente virtual
                            const miUser = allUsers.find((u: any) => u.id === user.id) || {
                                id: user.id,
                                username: user.username,
                                nombreCompleto: socioMatch.nombreCompleto || user.nombreCompleto || user.username,
                            };
                            setSelectedDirigenteId(user.id);
                            setAutoMatchedDirigente({
                                ...miUser,
                                nombreCompleto: socioMatch.nombreCompleto || miUser.nombreCompleto || user.username,
                            });
                            setAutoMatchFailed(false);
                        } else {
                            setAutoMatchFailed(true);
                        }
                    } catch (padronError) {
                        console.error("Error validando CI en padrón:", padronError);
                        // Si el endpoint retorna 404, la CI no existe en el padrón
                        setAutoMatchFailed(true);
                    }
                } else {
                    setAutoMatchFailed(true);
                }
            }
        } catch (error) {
            console.error("Error fetching dirigentes:", error);
        }
    }, [user]);

    // Cargar TODOS los socios de TODAS las listas del dirigente de una sola vez
    const fetchAllSocios = useCallback(async () => {
        const token = localStorage.getItem("token");
        try {
            setLoadingSocios(true);
            // Primero obtener todas las listas
            const listasRes = await axios.get("/api/asignaciones/mis-listas", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const listas = listasRes.data || [];

            if (listas.length === 0) {
                setAllSocios([]);
                setSociosCargados(true);
                return;
            }

            // Cargar socios de todas las listas en paralelo
            const promises = listas.map((lista: any) =>
                axios.get(`/api/asignaciones/${lista.id}/socios`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(res => (res.data || []).map((s: any) => ({
                    ...s,
                    listaOrigen: lista.nombre
                }))).catch(() => [])
            );

            const results = await Promise.all(promises);
            const todosLosSocios: SocioLista[] = [];
            const idsVistos = new Set<number>();

            // Unificar y eliminar duplicados (un socio puede estar en varias listas)
            for (const socios of results) {
                for (const socio of socios) {
                    if (!idsVistos.has(socio.id)) {
                        idsVistos.add(socio.id);
                        todosLosSocios.push(socio);
                    }
                }
            }

            setAllSocios(todosLosSocios);
            setSociosCargados(true);
        } catch (error) {
            console.error("Error fetching all socios:", error);
            setAllSocios([]);
        } finally {
            setLoadingSocios(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            // Siempre buscar dirigentes para auto-match (no solo SUPER_ADMIN)
            fetchDirigentes();
            fetchPunteros();
        }
    }, [user, fetchPunteros, fetchDirigentes]);

    const handleOpenCrearPuntero = () => {
        const nextState = !showCrearPuntero;
        setShowCrearPuntero(nextState);
        if (nextState && !sociosCargados) {
            fetchAllSocios();
        }
        if (nextState) {
            setTimeout(() => searchInputRef.current?.focus(), 300);
        }
    };

    // Fetch socios de un puntero específico
    const fetchPunteroSocios = async (punteroId: number) => {
        if (expandedPunteroId === punteroId) {
            // Colapsar
            setExpandedPunteroId(null);
            setPunteroSocios(null);
            return;
        }
        try {
            setExpandedPunteroId(punteroId);
            setLoadingPunteroSocios(true);
            setPunteroSocios(null);
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/usuarios/${punteroId}/puntero-socios`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPunteroSocios(res.data);
        } catch (error) {
            console.error("Error fetching puntero socios:", error);
        } finally {
            setLoadingPunteroSocios(false);
        }
    };

    // Fetch reporte de asistencia vs listas
    const fetchReporteAsistencia = async () => {
        const nextState = !showReporte;
        setShowReporte(nextState);
        if (!nextState || reporteData) return;
        try {
            setLoadingReporte(true);
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/reportes/rankings/asistencia/reporte-listas", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReporteData(res.data);
        } catch (error) {
            console.error("Error fetching reporte:", error);
        } finally {
            setLoadingReporte(false);
        }
    };

    const handleCrearPuntero = async (socio: SocioLista) => {
        if (!user) return;
        const dirigenteId = user.rol === "SUPER_ADMIN" && selectedDirigenteId ? selectedDirigenteId : user.id;

        const avatarHtml = getAvatarSvg(socio.nombreCompleto, 44);

        const result = await Swal.fire({
            html: `
                <div style="text-align:center; padding: 8px 0;">
                    <div style="width:72px; height:72px; border-radius:20px; background:linear-gradient(135deg,#f59e0b,#ea580c); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; box-shadow:0 8px 24px rgba(245,158,11,0.35);">
                        ${avatarHtml}
                    </div>
                    <h2 style="font-size:20px; font-weight:900; color:#1e293b; margin:0 0 4px;">${socio.nombreCompleto}</h2>
                    <div style="display:inline-flex; align-items:center; gap:6px; background:#fef3c7; border:1.5px solid #fbbf24; padding:4px 14px; border-radius:20px; margin:8px 0 20px;">
                        <span style="font-size:11px; font-weight:800; color:#92400e; letter-spacing:1px; text-transform:uppercase;">Nuevo Puntero</span>
                    </div>

                    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7); border-radius:16px; padding:20px; text-align:left; border:1.5px solid #fde68a;">
                        <p style="font-size:11px; font-weight:800; color:#92400e; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 14px;">Datos de acceso</p>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#fff; border-radius:10px; margin-bottom:8px; border:1px solid #fde68a;">
                            <span style="font-size:12px; color:#78716c; font-weight:600;">Usuario</span>
                            <span style="font-size:15px; font-weight:900; color:#1e293b; font-family:monospace;">${socio.cedula || 'N/A'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#fff; border-radius:10px; margin-bottom:8px; border:1px solid #fde68a;">
                            <span style="font-size:12px; color:#78716c; font-weight:600;">Contrase\u00f1a</span>
                            <span style="font-size:15px; font-weight:900; color:#1e293b; font-family:monospace;">${socio.cedula || 'N/A'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#fff; border-radius:10px; border:1px solid #fde68a;">
                            <span style="font-size:12px; color:#78716c; font-weight:600;">Meta asignada</span>
                            <span style="font-size:15px; font-weight:900; color:#f59e0b;">50 personas</span>
                        </div>
                    </div>

                    <p style="font-size:11px; color:#94a3b8; margin-top:14px;">Se crear\u00e1 su cuenta autom\u00e1ticamente</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "\u2705  Confirmar y Crear",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#f59e0b",
            cancelButtonColor: "#94a3b8",
            width: 400,
            showClass: { popup: 'swal2-show', backdrop: 'swal2-backdrop-show' },
            customClass: { popup: 'swal2-popup-rounded', confirmButton: 'swal2-confirm-rounded', cancelButton: 'swal2-cancel-rounded' }
        });

        if (!result.isConfirmed) return;

        try {
            setCreandoPuntero(socio.id);
            const token = localStorage.getItem("token");
            const res = await axios.post("/api/usuarios/crear-puntero", {
                socioId: socio.id,
                dirigenteId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const resAvatarHtml = getAvatarSvg(res.data.nombreCompleto, 52);

            await Swal.fire({
                html: `
                    <div style="text-align:center; padding:8px 0;">
                        <div style="position:relative; width:88px; height:88px; margin:0 auto 20px;">
                            <div style="width:88px; height:88px; border-radius:24px; background:linear-gradient(135deg,#10b981,#059669); display:flex; align-items:center; justify-content:center; box-shadow:0 10px 30px rgba(16,185,129,0.4); animation:bounceIn 0.5s ease;">
                                ${resAvatarHtml}
                            </div>
                            <div style="position:absolute; -top:6px; right:-6px; width:32px; height:32px; border-radius:50%; background:#10b981; border:3px solid #fff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(16,185,129,0.3);">
                                <span style="color:#fff; font-size:16px;">\u2713</span>
                            </div>
                        </div>

                        <h2 style="font-size:22px; font-weight:900; color:#1e293b; margin:0 0 4px;">Puntero Creado</h2>
                        <p style="font-size:14px; color:#64748b; margin:0 0 6px;">${res.data.nombreCompleto}</p>
                        <div style="display:inline-flex; align-items:center; gap:6px; background:#d1fae5; border:1.5px solid #6ee7b7; padding:4px 14px; border-radius:20px; margin:4px 0 20px;">
                            <span style="font-size:11px; font-weight:800; color:#065f46; letter-spacing:1px; text-transform:uppercase;">Activo</span>
                        </div>

                        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7); border-radius:16px; padding:20px; text-align:left; border:1.5px solid #bbf7d0;">
                            <p style="font-size:11px; font-weight:800; color:#065f46; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 14px;">Credenciales de Acceso</p>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:#fff; border-radius:10px; margin-bottom:8px; border:1px solid #bbf7d0;">
                                <span style="font-size:12px; color:#78716c; font-weight:600;">Usuario</span>
                                <span style="font-size:16px; font-weight:900; color:#1e293b; font-family:monospace; background:#f1f5f9; padding:2px 10px; border-radius:6px;">${res.data.username}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:#fff; border-radius:10px; border:1px solid #bbf7d0;">
                                <span style="font-size:12px; color:#78716c; font-weight:600;">Contrase\u00f1a</span>
                                <span style="font-size:16px; font-weight:900; color:#1e293b; font-family:monospace; background:#f1f5f9; padding:2px 10px; border-radius:6px;">${res.data.password}</span>
                            </div>
                        </div>

                        <div style="margin-top:16px; padding:10px 16px; background:#fffbeb; border-radius:10px; border:1px solid #fde68a;">
                            <p style="font-size:11px; color:#92400e; font-weight:600; margin:0;">
                                \u{1F4CC} El usuario y contrase\u00f1a es su n\u00famero de c\u00e9dula
                            </p>
                        </div>
                    </div>
                `,
                confirmButtonText: "Entendido",
                confirmButtonColor: "#10b981",
                width: 420,
                showClass: { popup: 'swal2-show', backdrop: 'swal2-backdrop-show' },
            });

            // Refrescar y limpiar
            fetchPunteros();
            setSearchSocio("");
            // Quitar al socio de la lista local para que no aparezca de nuevo
            setAllSocios((prev: SocioLista[]) => prev.filter(s => s.id !== socio.id));

        } catch (error: any) {
            Swal.fire("Error", error.response?.data?.error || "No se pudo crear el puntero", "error");
        } finally {
            setCreandoPuntero(null);
        }
    };

    const handleEliminarPuntero = async (puntero: Puntero) => {
        const avatarHtml = getAvatarSvg(puntero.nombreCompleto, 44);

        const result = await Swal.fire({
            html: `
                <div style="text-align:center; padding: 8px 0;">
                    <div style="width:72px; height:72px; border-radius:20px; background:linear-gradient(135deg,#ef4444,#dc2626); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; box-shadow:0 8px 24px rgba(239,68,68,0.35);">
                        ${avatarHtml}
                    </div>
                    <h2 style="font-size:20px; font-weight:900; color:#1e293b; margin:0 0 4px;">Eliminar Puntero</h2>
                    <p style="font-size:14px; color:#64748b; margin:0 0 12px;">${puntero.nombreCompleto}</p>
                    <div style="display:inline-flex; align-items:center; gap:6px; background:#fef2f2; border:1.5px solid #fecaca; padding:4px 14px; border-radius:20px; margin:0 0 20px;">
                        <span style="font-size:11px; font-weight:800; color:#991b1b; letter-spacing:1px; text-transform:uppercase;">@${puntero.username}</span>
                    </div>

                    <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2); border-radius:16px; padding:16px; text-align:left; border:1.5px solid #fecaca;">
                        <p style="font-size:12px; color:#991b1b; font-weight:700; margin:0 0 8px;">⚠️ Esta acción:</p>
                        <ul style="font-size:12px; color:#7f1d1d; margin:0; padding-left:16px; line-height:1.8;">
                            <li>Desactivará la cuenta del puntero</li>
                            <li>Reasignará sus listas al dirigente</li>
                            <li>El puntero no podrá iniciar sesión</li>
                        </ul>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "🗑️  Sí, Eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#94a3b8",
            width: 400,
            showClass: { popup: 'swal2-show', backdrop: 'swal2-backdrop-show' },
            customClass: { popup: 'swal2-popup-rounded', confirmButton: 'swal2-confirm-rounded', cancelButton: 'swal2-cancel-rounded' }
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/usuarios/eliminar-puntero/${puntero.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await Swal.fire({
                html: `
                    <div style="text-align:center; padding:8px 0;">
                        <div style="width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg,#10b981,#059669); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; box-shadow:0 8px 24px rgba(16,185,129,0.35);">
                            <span style="color:#fff; font-size:32px;">✓</span>
                        </div>
                        <h2 style="font-size:20px; font-weight:900; color:#1e293b; margin:0 0 4px;">Puntero Eliminado</h2>
                        <p style="font-size:14px; color:#64748b; margin:0;">${puntero.nombreCompleto} fue desactivado correctamente</p>
                    </div>
                `,
                confirmButtonText: "Entendido",
                confirmButtonColor: "#10b981",
                width: 380,
                timer: 3000,
                timerProgressBar: true,
            });

            // Refrescar lista
            fetchPunteros();
        } catch (error: any) {
            Swal.fire("Error", error.response?.data?.error || "No se pudo eliminar el puntero", "error");
        }
    };

    // ===== Asignar socios del dirigente al puntero =====
    const fetchSociosDisponibles = async (punteroId: number) => {
        setLoadingDisponibles(true);
        setSociosDisponibles([]);
        setSelectedSocioIds(new Set());
        setSearchAsignar("");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/usuarios/${punteroId}/socios-disponibles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSociosDisponibles(res.data.disponibles || []);
        } catch (err: any) {
            console.error("Error cargando socios disponibles:", err);
        } finally {
            setLoadingDisponibles(false);
        }
    };

    const handleAsignarSocios = async (punteroId: number) => {
        if (selectedSocioIds.size === 0) return;
        setAsignandoSocios(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`/api/usuarios/${punteroId}/asignar-socios-puntero`, {
                socioIds: Array.from(selectedSocioIds)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { asignados, yaEnOtraLista, sociosRechazados } = res.data;

            if (yaEnOtraLista > 0) {
                // Algunos fueron rechazados
                const rechazadosTexto = sociosRechazados?.length > 0
                    ? sociosRechazados.join(", ")
                    : `${yaEnOtraLista} socio(s)`;
                Swal.fire({
                    icon: asignados > 0 ? "warning" : "error",
                    title: asignados > 0 ? `${asignados} asignado(s), ${yaEnOtraLista} rechazado(s)` : "No se pudieron asignar",
                    html: `<p style="font-size:14px">Los siguientes socios <b>ya pertenecen a la lista de otra persona</b> y no se pueden duplicar:</p><p style="font-size:13px; color:#e65100; margin-top:8px"><b>${rechazadosTexto}</b></p>`,
                    confirmButtonColor: '#f59e0b',
                });
            } else if (asignados > 0) {
                Swal.fire({
                    icon: "success",
                    title: `${asignados} socio(s) asignado(s)`,
                    text: "Los socios fueron asignados al puntero exitosamente.",
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                });
            }

            // Refrescar disponibles y lista del puntero
            fetchSociosDisponibles(punteroId);
            if (expandedPunteroId === punteroId) {
                setLoadingPunteroSocios(true);
                const tokenR = localStorage.getItem("token");
                const resP = await axios.get(`/api/usuarios/${punteroId}/puntero-socios`, {
                    headers: { Authorization: `Bearer ${tokenR}` }
                });
                setPunteroSocios(resP.data);
                setLoadingPunteroSocios(false);
            }
            fetchPunteros(); // actualizar stats
        } catch (error: any) {
            Swal.fire("Error", error.response?.data?.error || "No se pudieron asignar los socios", "error");
        } finally {
            setAsignandoSocios(false);
        }
    };

    // Buscar socios en el padrón general
    const buscarEnPadron = async (term: string) => {
        if (term.trim().length < 2) {
            setResultadosPadron([]);
            return;
        }
        setLoadingPadron(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/socios/buscar?term=${encodeURIComponent(term.trim())}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResultadosPadron(res.data || []);
        } catch (err) {
            console.error("Error buscando en padrón:", err);
            setResultadosPadron([]);
        } finally {
            setLoadingPadron(false);
        }
    };

    // Asignar socios del padrón al puntero
    const handleAsignarPadron = async (punteroId: number) => {
        if (selectedPadronIds.size === 0) return;
        setAsignandoPadron(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`/api/usuarios/${punteroId}/asignar-socios-puntero`, {
                socioIds: Array.from(selectedPadronIds)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { asignados, yaEnOtraLista, sociosRechazados } = response.data;

            if (yaEnOtraLista > 0) {
                const rechazadosTexto = sociosRechazados?.length > 0
                    ? sociosRechazados.join(", ")
                    : `${yaEnOtraLista} socio(s)`;
                Swal.fire({
                    icon: asignados > 0 ? "warning" : "error",
                    title: asignados > 0 ? `${asignados} asignado(s), ${yaEnOtraLista} rechazado(s)` : "No se pudieron asignar",
                    html: `<p style="font-size:14px">Los siguientes socios <b>ya pertenecen a la lista de otra persona</b> y no se pueden duplicar:</p><p style="font-size:13px; color:#e65100; margin-top:8px"><b>${rechazadosTexto}</b></p>`,
                    confirmButtonColor: '#f59e0b',
                });
            } else if (asignados > 0) {
                Swal.fire({
                    icon: "success",
                    title: `${asignados} socio(s) asignado(s) del padrón`,
                    text: "Socios asignados al puntero exitosamente.",
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                });
            }

            setSelectedPadronIds(new Set());
            setResultadosPadron([]);
            setSearchPadron("");

            // Refrescar lista del puntero
            if (expandedPunteroId === punteroId) {
                const tokenR = localStorage.getItem("token");
                const resP = await axios.get(`/api/usuarios/${punteroId}/puntero-socios`, {
                    headers: { Authorization: `Bearer ${tokenR}` }
                });
                setPunteroSocios(resP.data);
            }
            fetchPunteros();
        } catch (error: any) {
            Swal.fire("Error", error.response?.data?.error || "No se pudieron asignar los socios", "error");
        } finally {
            setAsignandoPadron(false);
        }
    };

    const handleDesasignarSocio = async (punteroId: number, socioId: number) => {
        const result = await Swal.fire({
            title: "¿Remover socio?",
            text: "El socio será removido de la lista de este puntero.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, remover",
            cancelButtonText: "Cancelar",
            confirmButtonColor: cp,
        });
        if (!result.isConfirmed) return;

        setRemovingSocioId(socioId);
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/usuarios/${punteroId}/desasignar-socio/${socioId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Refrescar la lista del puntero
            const res = await axios.get(`/api/usuarios/${punteroId}/puntero-socios`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPunteroSocios(res.data);
            fetchPunteros();

            Swal.fire({
                icon: "success",
                title: "Socio removido",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 2000,
            });
        } catch (error: any) {
            Swal.fire("Error", error.response?.data?.error || "No se pudo remover el socio", "error");
        } finally {
            setRemovingSocioId(null);
        }
    };

    // Filtrado: busca por CI, Nro Socio o Nombre
    const searchTerm = searchSocio.trim().toLowerCase();
    const filteredSocios = allSocios.filter(s => {
        if (!searchTerm) return true; // Sin filtro: mostrar todos
        const nombre = (s.nombreCompleto || "").toLowerCase();
        const cedula = (s.cedula || "").toLowerCase();
        const nroSocio = (s.numeroSocio || "").toLowerCase();
        return nombre.includes(searchTerm)
            || cedula.includes(searchTerm)
            || nroSocio.includes(searchTerm);
    });

    // Paginación simple: mostrar de a 30
    const sociosToShow = filteredSocios.slice(0, visibleCount);
    const hasMore = filteredSocios.length > visibleCount;

    if (!user) return null;

    const isSuperAdmin = user.rol === "SUPER_ADMIN";
    const isDirigente = user.isDirigente === true;

    if (!isSuperAdmin && !isDirigente) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">{"\uD83D\uDEAB"}</div>
                    <h2 className="text-xl font-bold text-slate-700">Acceso Restringido</h2>
                    <p className="text-slate-500 mt-2">Solo los dirigentes pueden acceder a este m&oacute;dulo.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-32">
            {/* Header */}
            <div className="px-4 pt-10 sm:pt-14 pb-6 sm:pb-8" style={{ background: `linear-gradient(135deg, ${cp}, ${cs})` }}>
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <img
                            src={logoUrl}
                            alt="Logo"
                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/90 p-1 object-contain shadow-lg"
                        />
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Punteros</h1>
                            <p className="text-white/70 text-xs sm:text-sm font-medium">
                                {cooperativa.nombreCorto || 'Sistema'} — Gestión de punteros
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 -mt-4 sm:-mt-6">

                {/* Banner de usuario identificado automáticamente */}
                {autoMatchedDirigente && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm p-4 mb-4"
                        style={{ borderColor: `${cp}30`, borderWidth: 1 }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${cp}, ${cs})`, boxShadow: `0 4px 14px ${cp}40` }}
                                dangerouslySetInnerHTML={{ __html: getAvatarSvg(autoMatchedDirigente.nombreCompleto, 32) }}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-sm text-slate-800 truncate">{autoMatchedDirigente.nombreCompleto}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: cp }}>
                                        <CreditCard className="h-3 w-3" />
                                        CI: {autoMatchedDirigente.username}
                                    </span>
                                    <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-wider" style={{ backgroundColor: `${cp}15`, color: cp }}>
                                        Dirigente
                                    </span>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cp}15` }}>
                                    <CheckCircle2 className="h-4 w-4" style={{ color: cp }} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Selector de dirigente solo si no se pudo auto-identificar (Solo SUPER_ADMIN) */}
                {user.rol === "SUPER_ADMIN" && autoMatchFailed && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm p-4 mb-4"
                        style={{ borderColor: `${cp}25`, borderWidth: 1 }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4" style={{ color: cp }} />
                            <label className="text-xs font-black uppercase tracking-wider" style={{ color: cp }}>
                                No se encontró tu CI como dirigente — Seleccionar manualmente
                            </label>
                        </div>
                        <select
                            value={selectedDirigenteId || ""}
                            onChange={(e) => {
                                const id = Number(e.target.value) || null;
                                setSelectedDirigenteId(id);
                                if (id) {
                                    const d = dirigentes.find((d: any) => d.id === id);
                                    if (d) {
                                        setAutoMatchedDirigente(d);
                                        setAutoMatchFailed(false);
                                    }
                                }
                            }}
                            className="w-full p-3 border-2 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 outline-none"
                            style={{ borderColor: `${cp}30`, backgroundColor: `${cp}05` }}
                        >
                            <option value="">— Elegir dirigente —</option>
                            {dirigentes.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.nombreCompleto} (CI: {d.username})</option>
                            ))}
                        </select>
                    </motion.div>
                )}

                {/* Stats - solo mostrar desglose cuando hay punteros */}
                {punterosData && punterosData.totalPunteros > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6"
                    >
                        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm text-center" style={{ borderColor: `${cp}25`, borderWidth: 1 }}>
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1" style={{ color: cp }} />
                            <p className="text-xl sm:text-2xl font-black text-slate-800">{punterosData.totalPunteros}</p>
                            <p className="text-[7px] sm:text-[9px] font-bold uppercase leading-tight" style={{ color: cp }}>Punteros<br />Activos</p>
                        </div>
                        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-blue-100 text-center">
                            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mx-auto mb-0.5 sm:mb-1" />
                            <p className="text-xl sm:text-2xl font-black text-slate-800">{punterosData.totalPropiosDirigente}</p>
                            <p className="text-[7px] sm:text-[9px] font-bold text-blue-500 uppercase leading-tight">Socios en<br />Mi Lista</p>
                        </div>
                        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-teal-100 text-center">
                            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-teal-500 mx-auto mb-0.5 sm:mb-1" />
                            <p className="text-xl sm:text-2xl font-black text-slate-800">{punterosData.totalTraidosPorPunteros}</p>
                            <p className="text-[7px] sm:text-[9px] font-bold text-teal-500 uppercase leading-tight">Asignados a<br />Punteros</p>
                        </div>
                        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm text-center" style={{ borderColor: `${cp}40`, borderWidth: 2, background: `linear-gradient(135deg, ${cp}08, ${cp}15)` }}>
                            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1" style={{ color: cp }} />
                            <p className="text-xl sm:text-2xl font-black" style={{ color: cp }}>{punterosData.totalCombinado}</p>
                            <p className="text-[7px] sm:text-[9px] font-bold uppercase leading-tight" style={{ color: cp }}>Total Socios<br />Gestionados</p>
                        </div>
                        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-emerald-100 text-center">
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 mx-auto mb-0.5 sm:mb-1" />
                            <p className="text-xl sm:text-2xl font-black text-slate-800">{punterosData.punterosQueCumplieron}</p>
                            <p className="text-[7px] sm:text-[9px] font-bold text-emerald-500 uppercase leading-tight">Punteros que<br />Cumplieron Meta</p>
                        </div>
                    </motion.div>
                )}

                {/* Boton Crear Puntero */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    onClick={handleOpenCrearPuntero}
                    className={`w-full mb-4 sm:mb-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:gap-3 ${showCrearPuntero
                        ? 'bg-slate-600 text-white shadow-slate-200'
                        : 'text-white hover:shadow-xl'
                        }`}
                    style={!showCrearPuntero ? { background: `linear-gradient(135deg, ${cp}, ${cs})`, boxShadow: `0 4px 14px ${cp}40` } : {}}
                >
                    {showCrearPuntero ? <X className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                    {showCrearPuntero ? "CERRAR LISTA" : "CREAR NUEVO PUNTERO"}
                </motion.button>

                {/* Panel Crear Puntero - LISTA COMPLETA */}
                <AnimatePresence>
                    {showCrearPuntero && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 overflow-hidden"
                        >
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ borderColor: `${cp}25`, borderWidth: 1 }}>
                                {/* Barra de búsqueda/filtro */}
                                <div className="p-3 sm:p-4 border-b" style={{ background: `linear-gradient(135deg, ${cp}08, ${cp}12)`, borderColor: `${cp}20` }}>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: cp }} />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            inputMode="search"
                                            autoComplete="off"
                                            placeholder="Filtrar por nombre, CI o N° Socio..."
                                            value={searchSocio}
                                            onChange={(e) => { setSearchSocio(e.target.value); setVisibleCount(30); }}
                                            className="w-full pl-12 pr-12 py-3 sm:py-4 rounded-2xl border-2 bg-white text-base font-bold text-slate-700 focus:ring-2 outline-none placeholder:text-slate-400 placeholder:font-medium"
                                            style={{ borderColor: `${cp}30`, '--tw-ring-color': cp } as any}
                                        />
                                        {searchSocio && (
                                            <button
                                                onClick={() => { setSearchSocio(""); setVisibleCount(30); searchInputRef.current?.focus(); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all"
                                            >
                                                <X className="h-4 w-4 text-slate-500" />
                                            </button>
                                        )}
                                    </div>
                                    {sociosCargados && allSocios.length > 0 && (
                                        <p className="text-[10px] font-bold mt-2 ml-1" style={{ color: cp }}>
                                            {searchTerm
                                                ? `${filteredSocios.length} de ${allSocios.length} socios`
                                                : `${allSocios.length} socios en tus listas`
                                            }
                                        </p>
                                    )}
                                </div>

                                {/* Estado de carga */}
                                {loadingSocios && (
                                    <div className="flex items-center justify-center gap-3 py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: cp }} />
                                        <span className="text-sm font-bold text-slate-500">Cargando socios de tus listas...</span>
                                    </div>
                                )}

                                {/* Sin listas */}
                                {sociosCargados && allSocios.length === 0 && !loadingSocios && (
                                    <div className="text-center py-10 px-4">
                                        <div className="text-4xl mb-3">{"\uD83D\uDCCB"}</div>
                                        <p className="text-slate-600 text-sm font-bold">No tenés socios en tus listas aún.</p>
                                        <p className="text-slate-400 text-xs mt-1">Primero creá una lista en &quot;Mis Listas&quot; y agregá socios.</p>
                                    </div>
                                )}

                                {/* Lista completa de socios */}
                                {sociosCargados && allSocios.length > 0 && !loadingSocios && (
                                    <div className="p-2 sm:p-3">
                                        {filteredSocios.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-slate-500 text-sm font-bold">No se encontró ningún socio</p>
                                                <p className="text-slate-400 text-xs mt-1">Probá con otro término de búsqueda</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                                                {sociosToShow.map((socio) => (
                                                    <div
                                                        key={socio.id}
                                                        className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all"
                                                    >
                                                        {/* Avatar */}
                                                        <div
                                                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                                                            style={{ background: `linear-gradient(135deg, ${cp}, ${cs})` }}
                                                            dangerouslySetInnerHTML={{ __html: getAvatarSvg(socio.nombreCompleto, 28) }}
                                                        />

                                                        {/* Info del socio */}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-xs sm:text-sm text-slate-800 truncate">{socio.nombreCompleto}</p>
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0 mt-0.5">
                                                                {socio.cedula && (
                                                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 font-medium">
                                                                        <CreditCard className="h-2.5 w-2.5 text-slate-400" />
                                                                        {socio.cedula}
                                                                    </span>
                                                                )}
                                                                {socio.numeroSocio && (
                                                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                                                        <Hash className="h-2.5 w-2.5" />
                                                                        {socio.numeroSocio}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Botón Crear Puntero */}
                                                        <button
                                                            onClick={() => handleCrearPuntero(socio)}
                                                            disabled={creandoPuntero === socio.id || !socio.cedula}
                                                            className={`shrink-0 min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 touch-manipulation select-none ${creandoPuntero === socio.id
                                                                ? 'bg-slate-200 text-slate-400 cursor-wait'
                                                                : !socio.cedula
                                                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                                                    : 'text-white shadow-sm hover:shadow-md'
                                                                }`}
                                                            style={creandoPuntero !== socio.id && socio.cedula ? { background: `linear-gradient(135deg, ${cp}, ${cs})`, boxShadow: `0 2px 8px ${cp}40` } : {}}
                                                        >
                                                            {creandoPuntero === socio.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Target className="h-3.5 w-3.5" />
                                                            )}
                                                            Puntero
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Botón Ver Más */}
                                                {hasMore && (
                                                    <button
                                                        onClick={() => setVisibleCount(prev => prev + 30)}
                                                        className="w-full py-3 mt-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                                        style={{ backgroundColor: `${cp}10`, borderColor: `${cp}30`, borderWidth: 1, color: cp }}
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                        Ver más ({filteredSocios.length - visibleCount} restantes)
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Lista de Punteros */}
                <div className="space-y-2 sm:space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: cp }} />
                            <p className="text-xs text-slate-400 font-medium">Cargando punteros...</p>
                        </div>
                    ) : punterosData && punterosData.punteros.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-slate-600 text-xs sm:text-sm uppercase tracking-wider">
                                    Equipo de Punteros ({punterosData.punteros.length})
                                </h3>
                            </div>

                            {punterosData.punteros.map((puntero, index) => (
                                <motion.div
                                    key={puntero.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`bg-white rounded-xl sm:rounded-2xl shadow-sm border transition-all hover:shadow-md ${puntero.cumplioMeta ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}
                                >
                                    <div className="p-3 sm:p-4">
                                        <div className="flex items-start gap-3">
                                            {/* Avatar con silueta */}
                                            <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${puntero.cumplioMeta
                                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                                                : ''
                                                }`}
                                                style={!puntero.cumplioMeta ? { background: `linear-gradient(135deg, ${cp}, ${cs})` } : {}}
                                                dangerouslySetInnerHTML={{ __html: getAvatarSvg(puntero.nombreCompleto, 32) }}
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="font-black text-xs sm:text-sm text-slate-800 truncate">{puntero.nombreCompleto}</h4>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {puntero.cumplioMeta && (
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black rounded-full uppercase">Meta ✓</span>
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${puntero.activo ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                                            {puntero.activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-mono">@{puntero.username}</p>

                                                {/* Barra de progreso */}
                                                <div className="mt-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            {puntero.totalAsignados} / {puntero.meta} personas
                                                        </span>
                                                        <span className={`text-[10px] font-black ${puntero.porcentajeMeta >= 100 ? 'text-emerald-600' :
                                                            puntero.porcentajeMeta < 50 ? 'text-red-500' : ''
                                                            }`}
                                                            style={puntero.porcentajeMeta >= 50 && puntero.porcentajeMeta < 100 ? { color: cp } : {}}
                                                        >
                                                            {puntero.porcentajeMeta}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(puntero.porcentajeMeta, 100)}%` }}
                                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                                            className={`h-full rounded-full ${puntero.porcentajeMeta >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                                                                puntero.porcentajeMeta < 50 ? 'bg-gradient-to-r from-red-400 to-red-500' : ''
                                                                }`}
                                                            style={puntero.porcentajeMeta >= 50 && puntero.porcentajeMeta < 100 ? { background: `linear-gradient(90deg, ${cp}, ${cs})` } : {}}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Info adicional + botones Ver Lista y Eliminar */}
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-2">
                                                        {puntero.lastLogin && (
                                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                <Clock className="h-3 w-3 text-slate-300" />
                                                                {new Date(puntero.lastLogin).toLocaleDateString('es-PY')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {puntero.activo ? (
                                                            <>
                                                                {/* Toggle Login */}
                                                                <button
                                                                    onClick={async () => {
                                                                        setTogglingLoginId(puntero.id);
                                                                        try {
                                                                            const token = localStorage.getItem("token");
                                                                            const res = await axios.put(`/api/usuarios/${puntero.id}/toggle-login`, {}, {
                                                                                headers: { Authorization: `Bearer ${token}` }
                                                                            });
                                                                            Swal.fire({
                                                                                icon: 'success',
                                                                                title: res.data.loginHabilitado ? '🔓 Login Habilitado' : '🔒 Login Deshabilitado',
                                                                                text: `${puntero.nombreCompleto} ${res.data.loginHabilitado ? 'ya puede iniciar sesión' : 'no puede iniciar sesión'}`,
                                                                                toast: true,
                                                                                position: 'top-end',
                                                                                showConfirmButton: false,
                                                                                timer: 3000,
                                                                                timerProgressBar: true,
                                                                            });
                                                                            fetchPunteros();
                                                                        } catch (err: any) {
                                                                            Swal.fire('Error', err.response?.data?.error || 'No se pudo cambiar el estado', 'error');
                                                                        } finally {
                                                                            setTogglingLoginId(null);
                                                                        }
                                                                    }}
                                                                    disabled={togglingLoginId === puntero.id}
                                                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 touch-manipulation border ${puntero.loginHabilitado
                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                                        : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                                                        }`}
                                                                    title={puntero.loginHabilitado ? 'Deshabilitar inicio de sesión' : 'Habilitar inicio de sesión'}
                                                                >
                                                                    {togglingLoginId === puntero.id ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : puntero.loginHabilitado ? (
                                                                        <Unlock className="h-3.5 w-3.5" />
                                                                    ) : (
                                                                        <Lock className="h-3.5 w-3.5" />
                                                                    )}
                                                                    <span className="hidden sm:inline">{puntero.loginHabilitado ? 'Deshabilitar' : 'Habilitar'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEliminarPuntero(puntero)}
                                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 touch-manipulation bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
                                                                    title="Eliminar puntero"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    <span className="hidden sm:inline">Eliminar</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            /* Botón Reactivar para punteros inactivos */
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const token = localStorage.getItem("token");
                                                                        await axios.put(`/api/usuarios/reactivar-puntero/${puntero.id}`, {}, {
                                                                            headers: { Authorization: `Bearer ${token}` }
                                                                        });
                                                                        Swal.fire({
                                                                            icon: 'success',
                                                                            title: '✅ Puntero Reactivado',
                                                                            text: `${puntero.nombreCompleto} fue reactivado exitosamente.`,
                                                                            toast: true,
                                                                            position: 'top-end',
                                                                            showConfirmButton: false,
                                                                            timer: 3000,
                                                                            timerProgressBar: true,
                                                                        });
                                                                        fetchPunteros();
                                                                    } catch (err: any) {
                                                                        Swal.fire('Error', err.response?.data?.error || 'No se pudo reactivar', 'error');
                                                                    }
                                                                }}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 touch-manipulation bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                                                                title="Reactivar puntero"
                                                            >
                                                                <RotateCcw className="h-3.5 w-3.5" />
                                                                <span className="hidden sm:inline">Reactivar</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => fetchPunteroSocios(puntero.id)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 touch-manipulation ${expandedPunteroId === puntero.id
                                                                ? 'text-white shadow-sm'
                                                                : ''
                                                                }`}
                                                            style={expandedPunteroId === puntero.id
                                                                ? { background: cp }
                                                                : { backgroundColor: `${cp}10`, color: cp, borderColor: `${cp}30`, borderWidth: 1 }
                                                            }
                                                        >
                                                            {expandedPunteroId === puntero.id ? (
                                                                <><EyeOff className="h-3.5 w-3.5" /> Cerrar</>
                                                            ) : (
                                                                <><Eye className="h-3.5 w-3.5" /> Ver Lista</>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Panel expandible: Lista de socios del puntero */}
                                    <AnimatePresence>
                                        {expandedPunteroId === puntero.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden border-t border-slate-100"
                                            >
                                                {loadingPunteroSocios ? (
                                                    <div className="flex items-center justify-center py-8 gap-2">
                                                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: cp }} />
                                                        <span className="text-xs text-slate-400">Cargando socios...</span>
                                                    </div>
                                                ) : punteroSocios ? (
                                                    <div className="p-3 sm:p-4">
                                                        {/* Resumen de asistencia */}
                                                        <div className="flex items-center justify-between mb-3 px-1">
                                                            <div className="flex items-center gap-2">
                                                                <List className="h-4 w-4" style={{ color: cp }} />
                                                                <span className="text-xs font-bold text-slate-600">
                                                                    {punteroSocios.totalSocios} socios asignados
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-bold text-emerald-500">
                                                                    ✓ {punteroSocios.totalAsistieron} asistieron
                                                                </span>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${punteroSocios.porcentajeAsistencia >= 50
                                                                    ? 'bg-emerald-100 text-emerald-600'
                                                                    : 'bg-red-100 text-red-600'
                                                                    }`}>
                                                                    {punteroSocios.porcentajeAsistencia}%
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Lista de socios */}
                                                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                                                            {punteroSocios.socios.map((socio: any) => (
                                                                <div
                                                                    key={socio.id}
                                                                    className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-lg border text-xs transition-all ${socio.asistio
                                                                        ? 'bg-emerald-50/60 border-emerald-200'
                                                                        : 'bg-slate-50 border-slate-100'
                                                                        }`}
                                                                >
                                                                    {/* Indicador de asistencia */}
                                                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${socio.asistio
                                                                        ? 'bg-emerald-500 text-white'
                                                                        : 'bg-slate-200 text-slate-400'
                                                                        }`}>
                                                                        {socio.asistio ? (
                                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        ) : (
                                                                            <X className="h-3 w-3" />
                                                                        )}
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                                            <p className={`font-bold truncate text-[11px] ${socio.asistio ? 'text-slate-800' : 'text-slate-500'}`}>
                                                                                {socio.nombreCompleto}
                                                                            </p>
                                                                            {socio.telefono && getWhatsAppLinkWithMessage(socio) && (
                                                                                <a
                                                                                    href={getWhatsAppLinkWithMessage(socio)!}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#25D366] text-white rounded hover:bg-[#128C7E] transition-all shadow-sm hover:shadow-green-500/30 transform hover:scale-105 border border-green-400"
                                                                                    title="Enviar Mensaje de WhatsApp"
                                                                                >
                                                                                    <MessageCircle className="h-2.5 w-2.5" />
                                                                                    <span className="text-[9px] font-bold">WhatsApp</span>
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            {socio.cedula && (
                                                                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 whitespace-nowrap">
                                                                                    <CreditCard className="h-2.5 w-2.5" /> {socio.cedula}
                                                                                </span>
                                                                            )}
                                                                            {socio.telefono && (
                                                                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 whitespace-nowrap">
                                                                                    <Phone className="h-2.5 w-2.5" /> {socio.telefono}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${socio.asistio
                                                                            ? 'bg-emerald-100 text-emerald-600'
                                                                            : 'bg-slate-100 text-slate-400'
                                                                            }`}>
                                                                            {socio.asistio ? 'Presente' : 'Ausente'}
                                                                        </span>
                                                                        {(isSuperAdmin || isDirigente) && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleDesasignarSocio(puntero.id, socio.id); }}
                                                                                disabled={removingSocioId === socio.id}
                                                                                className="p-1 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                                                                title="Remover socio"
                                                                            >
                                                                                {removingSocioId === socio.id ? (
                                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                                ) : (
                                                                                    <UserMinus className="h-3 w-3" />
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {punteroSocios.socios.length === 0 && (
                                                            <div className="text-center py-6">
                                                                <p className="text-xs text-slate-400">Este puntero aún no tiene socios asignados.</p>
                                                            </div>
                                                        )}

                                                        {/* Botón para asignar socios */}
                                                        {(isSuperAdmin || isDirigente) && (
                                                            <div className="mt-4 pt-3 border-t border-slate-100">
                                                                <button
                                                                    onClick={() => {
                                                                        if (showAsignarSocios === puntero.id) {
                                                                            setShowAsignarSocios(null);
                                                                        } else {
                                                                            setShowAsignarSocios(puntero.id);
                                                                            fetchSociosDisponibles(puntero.id);
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 w-full justify-center shadow-sm"
                                                                    style={{ background: `linear-gradient(135deg, ${cp}, ${cs})` }}
                                                                >
                                                                    <UserPlus className="h-4 w-4" />
                                                                    {showAsignarSocios === puntero.id ? 'Cerrar Panel de Asignación' : 'Asignar Socios de Mi Lista'}
                                                                </button>

                                                                {/* Panel para asignar socios */}
                                                                <AnimatePresence>
                                                                    {showAsignarSocios === puntero.id && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            className="overflow-hidden mt-3"
                                                                        >
                                                                            <div className="rounded-xl border p-3" style={{ borderColor: `${cp}20`, backgroundColor: `${cp}03` }}>
                                                                                {/* Search */}
                                                                                <div className="relative mb-3">
                                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Buscar socio por nombre, CI..."
                                                                                        value={searchAsignar}
                                                                                        onChange={(e) => setSearchAsignar(e.target.value)}
                                                                                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 outline-none"
                                                                                        style={{ focusRingColor: cp } as any}
                                                                                    />
                                                                                </div>

                                                                                {loadingDisponibles ? (
                                                                                    <div className="flex items-center justify-center py-6 gap-2">
                                                                                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: cp }} />
                                                                                        <span className="text-xs text-slate-400">Cargando socios disponibles...</span>
                                                                                    </div>
                                                                                ) : (() => {
                                                                                    const searchT = searchAsignar.trim().toLowerCase();
                                                                                    const filtered = sociosDisponibles.filter((s: any) => {
                                                                                        if (!searchT) return true;
                                                                                        return (s.nombreCompleto || '').toLowerCase().includes(searchT)
                                                                                            || (s.cedula || '').includes(searchT)
                                                                                            || (s.telefono || '').includes(searchT);
                                                                                    });
                                                                                    return (
                                                                                        <>
                                                                                            {/* Select all / counter */}
                                                                                            <div className="flex items-center justify-between mb-2 px-1">
                                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        checked={filtered.length > 0 && filtered.every((s: any) => selectedSocioIds.has(s.id))}
                                                                                                        onChange={(e) => {
                                                                                                            const newSet = new Set(selectedSocioIds);
                                                                                                            if (e.target.checked) {
                                                                                                                filtered.forEach((s: any) => newSet.add(s.id));
                                                                                                            } else {
                                                                                                                filtered.forEach((s: any) => newSet.delete(s.id));
                                                                                                            }
                                                                                                            setSelectedSocioIds(newSet);
                                                                                                        }}
                                                                                                        className="rounded"
                                                                                                        style={{ accentColor: cp }}
                                                                                                    />
                                                                                                    <span className="text-[10px] font-bold text-slate-500">Seleccionar todos ({filtered.length})</span>
                                                                                                </label>
                                                                                                {selectedSocioIds.size > 0 && (
                                                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: cp }}>
                                                                                                        {selectedSocioIds.size} seleccionado(s)
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>

                                                                                            {/* List */}
                                                                                            <div className="space-y-1 max-h-[250px] overflow-y-auto">
                                                                                                {filtered.length === 0 ? (
                                                                                                    <div className="text-center py-6">
                                                                                                        <p className="text-xs text-slate-400">
                                                                                                            {sociosDisponibles.length === 0
                                                                                                                ? 'No hay socios disponibles para asignar. Primero agregá socios a tu lista.'
                                                                                                                : 'No se encontraron resultados para esta búsqueda.'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                ) : filtered.map((s: any) => (
                                                                                                    <label
                                                                                                        key={s.id}
                                                                                                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selectedSocioIds.has(s.id)
                                                                                                            ? 'border-2 bg-white shadow-sm'
                                                                                                            : 'bg-white border-slate-100 hover:border-slate-200'
                                                                                                            }`}
                                                                                                        style={selectedSocioIds.has(s.id) ? { borderColor: cp } : {}}
                                                                                                    >
                                                                                                        <div
                                                                                                            className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${selectedSocioIds.has(s.id) ? 'text-white' : 'border-slate-300'
                                                                                                                }`}
                                                                                                            style={selectedSocioIds.has(s.id) ? { backgroundColor: cp, borderColor: cp } : {}}
                                                                                                        >
                                                                                                            {selectedSocioIds.has(s.id) && <Check className="h-3 w-3" />}
                                                                                                        </div>
                                                                                                        <input
                                                                                                            type="checkbox"
                                                                                                            className="sr-only"
                                                                                                            checked={selectedSocioIds.has(s.id)}
                                                                                                            onChange={() => {
                                                                                                                const newSet = new Set(selectedSocioIds);
                                                                                                                if (newSet.has(s.id)) {
                                                                                                                    newSet.delete(s.id);
                                                                                                                } else {
                                                                                                                    newSet.add(s.id);
                                                                                                                }
                                                                                                                setSelectedSocioIds(newSet);
                                                                                                            }}
                                                                                                        />
                                                                                                        <div className="flex-1 min-w-0">
                                                                                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                                                                                <p className="text-[11px] font-bold text-slate-700 truncate">{s.nombreCompleto}</p>
                                                                                                                {s.telefono && getWhatsAppLinkWithMessage(s) && (
                                                                                                                    <a
                                                                                                                        href={getWhatsAppLinkWithMessage(s)!}
                                                                                                                        target="_blank"
                                                                                                                        rel="noopener noreferrer"
                                                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#25D366] text-white rounded hover:bg-[#128C7E] transition-all shadow-sm hover:shadow-green-500/30 transform hover:scale-105 border border-green-400"
                                                                                                                        title="Enviar Mensaje de WhatsApp"
                                                                                                                    >
                                                                                                                        <MessageCircle className="h-2.5 w-2.5" />
                                                                                                                        <span className="text-[9px] font-bold">WhatsApp</span>
                                                                                                                    </a>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                                                                {s.cedula && (
                                                                                                                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 whitespace-nowrap">
                                                                                                                        <CreditCard className="h-2.5 w-2.5" /> {s.cedula}
                                                                                                                    </span>
                                                                                                                )}
                                                                                                                {s.telefono && (
                                                                                                                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 whitespace-nowrap">
                                                                                                                        <Phone className="h-2.5 w-2.5" /> {s.telefono}
                                                                                                                    </span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </label>
                                                                                                ))}
                                                                                            </div>

                                                                                            {/* Confirm button */}
                                                                                            {selectedSocioIds.size > 0 && (
                                                                                                <button
                                                                                                    onClick={() => handleAsignarSocios(puntero.id)}
                                                                                                    disabled={asignandoSocios}
                                                                                                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow-md"
                                                                                                    style={{ background: `linear-gradient(135deg, ${cp}, ${cs})` }}
                                                                                                >
                                                                                                    {asignandoSocios ? (
                                                                                                        <><Loader2 className="h-4 w-4 animate-spin" /> Asignando...</>
                                                                                                    ) : (
                                                                                                        <><ArrowRight className="h-4 w-4" /> Confirmar Asignación ({selectedSocioIds.size} socios)</>
                                                                                                    )}
                                                                                                </button>
                                                                                            )}
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>

                                                                {/* Botón: Asignar Socios del Padrón */}
                                                                <button
                                                                    onClick={() => {
                                                                        if (showAsignarPadron === puntero.id) {
                                                                            setShowAsignarPadron(null);
                                                                            setSearchPadron("");
                                                                            setResultadosPadron([]);
                                                                            setSelectedPadronIds(new Set());
                                                                        } else {
                                                                            setShowAsignarPadron(puntero.id);
                                                                            setShowAsignarSocios(null);
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 w-full justify-center shadow-sm mt-2"
                                                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                                                >
                                                                    <Search className="h-4 w-4" />
                                                                    {showAsignarPadron === puntero.id ? 'Cerrar Búsqueda del Padrón' : 'Asignar Socios del Padrón'}
                                                                </button>

                                                                {/* Panel: Buscar en padrón */}
                                                                <AnimatePresence>
                                                                    {showAsignarPadron === puntero.id && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            className="overflow-hidden mt-3"
                                                                        >
                                                                            <div className="rounded-xl border p-3" style={{ borderColor: '#6366f120', backgroundColor: '#6366f103' }}>
                                                                                {/* Search input */}
                                                                                <div className="relative mb-3">
                                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Buscar por nombre, CI o Nro. Socio..."
                                                                                        value={searchPadron}
                                                                                        onChange={(e) => {
                                                                                            setSearchPadron(e.target.value);
                                                                                            // Debounce search
                                                                                            clearTimeout((window as any).__padronSearchTimer);
                                                                                            (window as any).__padronSearchTimer = setTimeout(() => {
                                                                                                buscarEnPadron(e.target.value);
                                                                                            }, 400);
                                                                                        }}
                                                                                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                                                                                    />
                                                                                </div>

                                                                                {searchPadron.trim().length < 2 ? (
                                                                                    <div className="text-center py-4">
                                                                                        <p className="text-xs text-slate-400">Escribí al menos 2 caracteres para buscar en el padrón.</p>
                                                                                    </div>
                                                                                ) : loadingPadron ? (
                                                                                    <div className="flex items-center justify-center py-6 gap-2">
                                                                                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                                                                                        <span className="text-xs text-slate-400">Buscando en el padrón...</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        {selectedPadronIds.size > 0 && (
                                                                                            <div className="flex items-center justify-end mb-2">
                                                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-indigo-500">
                                                                                                    {selectedPadronIds.size} seleccionado(s)
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="space-y-1 max-h-[250px] overflow-y-auto">
                                                                                            {resultadosPadron.length === 0 ? (
                                                                                                <div className="text-center py-4">
                                                                                                    <p className="text-xs text-slate-400">No se encontraron resultados.</p>
                                                                                                </div>
                                                                                            ) : resultadosPadron.map((s: any) => (
                                                                                                <label
                                                                                                    key={s.id}
                                                                                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selectedPadronIds.has(s.id)
                                                                                                        ? 'border-2 bg-white shadow-sm border-indigo-500'
                                                                                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                                                                                        }`}
                                                                                                >
                                                                                                    <div
                                                                                                        className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${selectedPadronIds.has(s.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300'
                                                                                                            }`}
                                                                                                    >
                                                                                                        {selectedPadronIds.has(s.id) && <Check className="h-3 w-3" />}
                                                                                                    </div>
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        className="sr-only"
                                                                                                        checked={selectedPadronIds.has(s.id)}
                                                                                                        onChange={() => {
                                                                                                            const newSet = new Set(selectedPadronIds);
                                                                                                            if (newSet.has(s.id)) {
                                                                                                                newSet.delete(s.id);
                                                                                                            } else {
                                                                                                                newSet.add(s.id);
                                                                                                            }
                                                                                                            setSelectedPadronIds(newSet);
                                                                                                        }}
                                                                                                    />
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <p className="text-[11px] font-bold text-slate-700 truncate">{s.nombreCompleto}</p>
                                                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                                                            {s.cedula && (
                                                                                                                <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                                                                                                    <CreditCard className="h-2.5 w-2.5" /> {s.cedula}
                                                                                                                </span>
                                                                                                            )}
                                                                                                            {s.numeroSocio && (
                                                                                                                <span className="text-[9px] text-indigo-400 flex items-center gap-0.5">
                                                                                                                    #{s.numeroSocio}
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </label>
                                                                                            ))}
                                                                                        </div>

                                                                                        {/* Confirm button */}
                                                                                        {selectedPadronIds.size > 0 && (
                                                                                            <button
                                                                                                onClick={() => handleAsignarPadron(puntero.id)}
                                                                                                disabled={asignandoPadron}
                                                                                                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow-md"
                                                                                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                                                                            >
                                                                                                {asignandoPadron ? (
                                                                                                    <><Loader2 className="h-4 w-4 animate-spin" /> Asignando...</>
                                                                                                ) : (
                                                                                                    <><ArrowRight className="h-4 w-4" /> Confirmar Asignación ({selectedPadronIds.size} socios)</>
                                                                                                )}
                                                                                            </button>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <div className="text-6xl mb-4">{"\uD83C\uDFAF"}</div>
                            <h3 className="text-lg font-bold text-slate-600 mb-2">A&uacute;n no ten&eacute;s punteros</h3>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                Toc&aacute; &quot;Crear Nuevo Puntero&quot; para buscar socios de tus listas y habilitarlos como punteros.
                            </p>
                            <button
                                onClick={() => {
                                    setShowCrearPuntero(true);
                                    if (!sociosCargados) fetchAllSocios();
                                    setTimeout(() => searchInputRef.current?.focus(), 300);
                                }}
                                className="mt-6 px-6 py-3 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 mx-auto"
                                style={{ background: `linear-gradient(135deg, ${cp}, ${cs})`, boxShadow: `0 4px 14px ${cp}40` }}
                            >
                                <UserPlus className="h-5 w-5" />
                                Crear mi primer puntero
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Reporte de Asistencia vs Listas - Solo SUPER_ADMIN */}
                {isSuperAdmin && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6"
                    >
                        <motion.button
                            onClick={fetchReporteAsistencia}
                            className={`w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:gap-3 ${showReporte
                                ? 'bg-slate-600 text-white shadow-slate-200'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300'
                                }`}
                        >
                            {showReporte ? <X className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
                            {showReporte ? "CERRAR REPORTE" : "REPORTE ASISTENCIA VS LISTAS"}
                        </motion.button>

                        <AnimatePresence>
                            {showReporte && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden mt-4"
                                >
                                    {loadingReporte ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-indigo-100">
                                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                            <p className="text-xs text-slate-400 font-medium">Generando reporte...</p>
                                        </div>
                                    ) : reporteData ? (
                                        <div className="space-y-3">
                                            {/* Total Asistencias */}
                                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                                                    <h4 className="font-black text-sm text-slate-800">Resumen General</h4>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="text-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                                        <p className="text-xl sm:text-2xl font-black text-indigo-600">{reporteData.totalAsistencias}</p>
                                                        <p className="text-[8px] sm:text-[10px] font-bold text-indigo-400 uppercase">Total Asistencias</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                        <p className="text-xl sm:text-2xl font-black text-emerald-600">{reporteData.asistentesEnListas}</p>
                                                        <p className="text-[8px] sm:text-[10px] font-bold text-emerald-400 uppercase">De Listas</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                                                        <p className="text-xl sm:text-2xl font-black text-red-600">{reporteData.asistentesIndependientes}</p>
                                                        <p className="text-[8px] sm:text-[10px] font-bold text-red-400 uppercase">Sin Lista</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Independientes (sin lista) */}
                                            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ borderColor: `${cp}25`, borderWidth: 1 }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertCircle className="h-5 w-5" style={{ color: cp }} />
                                                    <h4 className="font-black text-sm text-slate-800">Asistentes Independientes</h4>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-3">
                                                    Personas que vinieron a la asamblea pero <strong>no estaban en ninguna lista</strong> de ningún dirigente ni puntero.
                                                </p>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(reporteData.porcentajeIndependientes, 100)}%` }}
                                                                transition={{ duration: 0.8 }}
                                                                className="h-full rounded-full"
                                                                style={{ background: `linear-gradient(90deg, ${ca}, ${cp})` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-black shrink-0" style={{ color: cp }}>
                                                        {reporteData.porcentajeIndependientes}%
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-2">
                                                    {reporteData.asistentesIndependientes} de {reporteData.totalAsistencias} asistentes no estaban en listas
                                                </p>
                                            </div>

                                            {/* Comparación Punteros vs Dirigentes */}
                                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Users className="h-5 w-5 text-purple-500" />
                                                    <h4 className="font-black text-sm text-slate-800">Punteros vs Dirigentes</h4>
                                                </div>

                                                {/* Punteros */}
                                                <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: `${cp}08`, borderColor: `${cp}20`, borderWidth: 1 }}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: cp }}>
                                                            <Target className="h-3.5 w-3.5" /> Listas de Punteros
                                                        </span>
                                                        <span className="text-xs font-black" style={{ color: cp }}>
                                                            {reporteData.asistenciaDePunteros}/{reporteData.totalAsignadosPunteros}
                                                        </span>
                                                    </div>
                                                    <div className="h-3 bg-white rounded-full overflow-hidden" style={{ borderColor: `${cp}20`, borderWidth: 1 }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(reporteData.porcentajePunteros, 100)}%` }}
                                                            transition={{ duration: 0.8, delay: 0.2 }}
                                                            className="h-full rounded-full"
                                                            style={{ background: `linear-gradient(90deg, ${ca}, ${cp})` }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] font-bold mt-1 text-right" style={{ color: cp }}>
                                                        {reporteData.porcentajePunteros}% asistencia
                                                    </p>
                                                </div>

                                                {/* Dirigentes */}
                                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                                                            <UserCheck className="h-3.5 w-3.5" /> Listas de Dirigentes
                                                        </span>
                                                        <span className="text-xs font-black text-indigo-600">
                                                            {reporteData.asistenciaDeDirigentes}/{reporteData.totalAsignadosDirigentes}
                                                        </span>
                                                    </div>
                                                    <div className="h-3 bg-white rounded-full overflow-hidden border border-indigo-100">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(reporteData.porcentajeDirigentes, 100)}%` }}
                                                            transition={{ duration: 0.8, delay: 0.4 }}
                                                            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-indigo-600 font-bold mt-1 text-right">
                                                        {reporteData.porcentajeDirigentes}% asistencia
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Detalle por usuario */}
                                            {reporteData.detallePorUsuario && reporteData.detallePorUsuario.length > 0 && (
                                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <List className="h-5 w-5 text-slate-500" />
                                                        <h4 className="font-black text-sm text-slate-800">Detalle por Usuario</h4>
                                                    </div>
                                                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                                        {reporteData.detallePorUsuario.map((u: any) => (
                                                            <div key={u.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] font-black ${u.is_dirigente ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                                                                    : u.rol !== 'PUNTERO' ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                                                                        : ''
                                                                    }`}
                                                                    style={u.rol === 'PUNTERO' ? { background: `linear-gradient(135deg, ${cp}, ${cs})` } : {}}
                                                                >
                                                                    {u.rol === 'PUNTERO' ? 'P' : 'D'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] font-bold text-slate-700 truncate">{u.nombre_completo}</p>
                                                                    <p className="text-[9px] text-slate-400">@{u.username} · {u.rol === 'PUNTERO' ? 'Puntero' : 'Dirigente'}</p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-xs font-black text-slate-700">
                                                                        {u.asistieron}/{u.total_asignados}
                                                                    </p>
                                                                    <p className={`text-[10px] font-bold ${Number(u.porcentaje_asistencia) >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                        {u.porcentaje_asistencia}%
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
