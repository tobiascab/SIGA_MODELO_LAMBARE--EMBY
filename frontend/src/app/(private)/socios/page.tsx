"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    FileDown,
    FileSpreadsheet,
    FileText,
    ShieldCheck,
    AlertTriangle,
    Building2,
    Edit,
    Trash2,
    X,
    Users,
    Zap,
    Plus,
    Save,
    Loader2,
    Upload,
    Phone,
    Mail,
    MapPin,
    MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Socio {
    id: number;
    numeroSocio: string;
    nombreCompleto: string;
    cedula: string;
    telefono: string | null;
    direccion: string | null;
    sucursal: { id: number; nombre: string; codigo: string } | null;
    aporteAlDia: boolean;
    solidaridadAlDia: boolean;
    fondoAlDia: boolean;
    incoopAlDia: boolean;
    creditoAlDia: boolean;
    activo: boolean;
    habilitadoVozVoto: string;
    estadoVozVoto?: boolean;
    // Campos enriquecidos 2024
    edad?: string;
    profesion?: string;
    ocupacion?: string;
    barrio?: string;
    ciudad?: string;
    email?: string;
    mesa?: string;
    nroOrdenPadron?: string;
}

interface User {
    id: number;
    username: string;
    rol: string;
}

interface SocioRowProps {
    socio: Socio;
    index: number;
    tieneVozYVoto: boolean;
    isSuperAdmin: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onClick: () => void;
}

// Helper para WhatsApp
const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return undefined;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return undefined;
    return `https://wa.me/${cleanPhone}`;
};

// Mobile-friendly card component to prevent clipping
function SocioCard({ socio, tieneVozYVoto, isSuperAdmin, onEdit, onDelete, onClick }: Omit<SocioRowProps, 'index'>) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white rounded-xl sm:rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform active:scale-[0.98]"
            onClick={onClick}
        >
            {/* Header con gradiente sutil y número de socio */}
            <div className="absolute top-0 left-0 right-0 h-16 sm:h-24 bg-gradient-to-br from-slate-50 to-slate-100/50 border-b border-slate-100" />

            <div className="relative p-3 pb-12 sm:p-5 sm:pb-16"> {/* Padding bottom extra para la franja inferior */}
                <div className="flex justify-between items-start mb-2 sm:mb-4">
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Socio N°</span>
                        <span className="text-sm font-black text-slate-800">{socio.numeroSocio}</span>
                    </div>
                    {isSuperAdmin && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-blue-600 active:scale-95 transition"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Avatar y Datos Principales */}
                <div className="flex flex-col items-center text-center mb-3 sm:mb-6">
                    <div className={`h-14 w-14 sm:h-20 sm:w-20 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black text-white shadow-xl mb-2 sm:mb-3 transform group-hover:scale-105 transition-transform duration-300
                        ${tieneVozYVoto
                            ? 'bg-gradient-to-br from-[#009900] to-[#007700] shadow-[#009900]/30'
                            : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30'}`}>
                        {socio.nombreCompleto.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 className="text-sm sm:text-lg font-black text-slate-800 leading-tight mb-1">{socio.nombreCompleto}</h3>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 font-medium text-xs font-mono">
                        <span>CI: {socio.cedula}</span>
                    </div>
                </div>

                {/* Grid de Datos - Diseño Premium */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-3">
                        {/* Teléfono y Email */}
                        {(socio.telefono || socio.email) && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-500 shrink-0">
                                    <Phone className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contacto</p>
                                    <div className="flex flex-col gap-1">
                                        {socio.telefono && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-700 truncate">{socio.telefono}</span>
                                                {getWhatsAppLink(socio.telefono) && (
                                                    <a
                                                        href={getWhatsAppLink(socio.telefono)!}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-all shadow-sm transform hover:scale-105"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-bold">WhatsApp</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {socio.email && <span className="text-[10px] font-medium text-slate-500 truncate">{socio.email}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dirección y Barrio */}
                        {(socio.direccion || socio.barrio || socio.ciudad) && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-500 shrink-0">
                                    <MapPin className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ubicación</p>
                                    <div className="flex flex-col">
                                        {socio.barrio && <span className="text-xs font-semibold text-slate-700 truncate">{socio.barrio}</span>}
                                        {(socio.ciudad || socio.direccion) && (
                                            <span className="text-[10px] font-medium text-slate-500 truncate">
                                                {[socio.direccion, socio.ciudad].filter(Boolean).join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Datos Adicionales (Profesion, etc) */}
                        {(socio.profesion || socio.edad) && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-500 shrink-0">
                                    <Users className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Perfil</p>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-700 truncate">
                                            {[socio.edad ? `${socio.edad} años` : '', socio.profesion].filter(Boolean).join(' - ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Franja Inferior - Estado de Voto */}
            <div className={`absolute bottom-0 left-0 right-0 py-3 px-4 flex items-center justify-between font-bold text-xs uppercase tracking-wider text-white shadow-lg z-10
                ${tieneVozYVoto
                    ? 'bg-gradient-to-r from-[#009900] to-[#007700]'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
                <div className="flex items-center gap-2">
                    {tieneVozYVoto ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{tieneVozYVoto ? 'Habilitado: Voz y Voto' : 'Solo Voz'}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-75" />
            </div>
        </motion.div>
    );
}

function SocioRow({ socio, index, tieneVozYVoto, isSuperAdmin, onEdit, onDelete, onClick }: SocioRowProps) {
    return (
        <motion.tr
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02, duration: 0.3 }}
            onClick={onClick}
            className="cursor-pointer hover:bg-slate-50/80 transition-colors group relative border-b border-slate-50 last:border-0"
        >
            {/* Número de Socio */}
            <td className="p-4 md:p-5">
                <div className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl font-black text-base shadow-sm group-hover:shadow-md transition-all
                        ${tieneVozYVoto
                        ? 'bg-[#009900]/10 text-[#009900] border border-[#009900]/20'
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}
                >
                    <span className="text-slate-400 text-xs">#</span>
                    {socio.numeroSocio}
                </div>
            </td>

            {/* Datos Personales (Nombre, Cédula, Edad, Profesión) */}
            <td className="p-4 md:p-5">
                <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0
                            ${tieneVozYVoto
                            ? 'bg-gradient-to-br from-[#009900] to-[#007700]'
                            : 'bg-yellow-500'
                        }`}
                    >
                        {socio.nombreCompleto.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 text-sm md:text-base group-hover:text-[#009900] transition-colors flex items-center gap-2">
                            {socio.nombreCompleto}
                            {socio.telefono && getWhatsAppLink(socio.telefono) && (
                                <a
                                    href={getWhatsAppLink(socio.telefono)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-all shadow-lg hover:shadow-green-500/30 transform hover:scale-105 border border-green-400"
                                    title="Enviar Mensaje de WhatsApp"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="hidden lg:inline text-xs font-bold">WhatsApp</span>
                                </a>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">CI: {socio.cedula}</span>
                        </div>
                    </div>
                </div>
            </td>

            {/* Ubicación (Barrio/Ciudad) */}
            <td className="p-4 md:p-5 hidden md:table-cell">
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">
                        {socio.barrio || <span className="text-slate-300 font-normal italic">Sin barrio</span>}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                        {socio.ciudad || '—'}
                    </span>
                </div>
            </td>

            {/* Sucursal */}
            <td className="p-4 md:p-5 hidden lg:table-cell">
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 font-medium">
                        {socio.sucursal?.nombre || <span className="text-slate-300">—</span>}
                    </span>
                </div>
            </td>

            {/* Estado Voto */}
            <td className="p-4 md:p-5 text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black
                        ${tieneVozYVoto
                        ? 'bg-[#009900]/10 text-[#009900]'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                >
                    {tieneVozYVoto ? (
                        <><ShieldCheck className="h-3.5 w-3.5" /> Voz y Voto</>
                    ) : (
                        <><AlertTriangle className="h-3.5 w-3.5" /> Solo Voz</>
                    )}
                </span>
            </td>

            {/* Action Arrow */}
            <td className="p-4 md:p-5 w-12 text-center">
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#009900] transition-colors" />
            </td>
        </motion.tr>
    );
}

export default function SociosPage() {
    const [socios, setSocios] = useState<Socio[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [pageSize] = useState(10);
    const [error, setError] = useState<string | null>(null);

    // User & permissions
    const [user, setUser] = useState<User | null>(null);
    const isSuperAdmin = user?.rol === "SUPER_ADMIN";

    // Export dropdown
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);

    // ABM Modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
    const [saving, setSaving] = useState(false);

    // View Modal
    const [viewSocio, setViewSocio] = useState<Socio | null>(null);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [socioToDelete, setSocioToDelete] = useState<Socio | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Import state
    const [showImportMenu, setShowImportMenu] = useState(false);
    const [importMode, setImportMode] = useState<"full" | "complementary">("full");
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importMenuRef = useRef<HTMLDivElement>(null);


    // Additional statistics
    const [presentesCount, setPresentesCount] = useState(0);
    const [registradosVozYVoto, setRegistradosVozYVoto] = useState(0);
    const [registradosSoloVoz, setRegistradosSoloVoz] = useState(0);

    // Column Filters
    const [filterNumeroSocio, setFilterNumeroSocio] = useState("");
    const [filterNombre, setFilterNombre] = useState("");
    const [filterTelefono, setFilterTelefono] = useState("");
    const [filterSucursal, setFilterSucursal] = useState("");
    const [filterEstado, setFilterEstado] = useState<"todos" | "vozYVoto" | "soloVoz">("todos");
    const [showFilters, setShowFilters] = useState(false);
    const [sucursales, setSucursales] = useState<{ id: number; nombre: string; codigo: string }[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        numeroSocio: "",
        nombreCompleto: "",
        cedula: "",
        telefono: "",
        aporteAlDia: true,
        solidaridadAlDia: true,
        fondoAlDia: true,
        incoopAlDia: true,
        creditoAlDia: true
    });

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close modals on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (viewSocio) setViewSocio(null);
                if (showModal) setShowModal(false);
                if (showDeleteConfirm) setShowDeleteConfirm(false);
                if (showExportMenu) setShowExportMenu(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [viewSocio, showModal, showDeleteConfirm, showExportMenu]);

    // Load user from localStorage
    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                console.error("Error parsing user data:", e);
            }
        }
    }, []);

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
            if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
                setShowImportMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load sucursales
    useEffect(() => {
        const fetchSucursales = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get("/api/sucursales", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSucursales(res.data);
            } catch (err) {
                console.error("Error loading sucursales:", err);
            }
        };
        fetchSucursales();
    }, []);

    const fetchSocios = useCallback(async (page: number, term: string, estado: string, nSocio: string, nombre: string, tel: string, sucId: string) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            if (term) {
                const searchUrl = `/api/socios/buscar?term=${encodeURIComponent(term)}`;
                const response = await axios.get(searchUrl, { headers });

                if (response.data) {
                    setSocios(Array.isArray(response.data) ? response.data : response.data.content || []);
                    setTotalElements(Array.isArray(response.data) ? response.data.length : response.data.totalElements || 0);
                    setTotalPages(1);
                } else {
                    setSocios([]);
                    setTotalElements(0);
                    setTotalPages(0);
                }
            } else {
                const baseUrl = `/api/socios`;
                const params: any = {
                    page,
                    size: pageSize
                };

                if (estado && estado !== "todos") params.estado = estado;
                if (nSocio) params.numeroSocio = nSocio;
                if (nombre) params.nombre = nombre;
                if (tel) params.telefono = tel;
                if (sucId) params.sucursalId = sucId;

                const response = await axios.get(baseUrl, { headers, params });

                if (response.data.content) {
                    setSocios(response.data.content);
                    setTotalPages(response.data.totalPages);
                    setTotalElements(response.data.totalElements);
                } else {
                    setSocios([]);
                    setTotalElements(0);
                    setTotalPages(0);
                }
            }
        } catch (err) {
            console.error("Error cargando socios:", err);
            setError("No se pudieron cargar los datos del padrón.");
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchSocios(currentPage, searchTerm, filterEstado, filterNumeroSocio, filterNombre, filterTelefono, filterSucursal);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [currentPage, searchTerm, filterEstado, filterNumeroSocio, filterNombre, filterTelefono, filterSucursal, fetchSocios]);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };

            try {
                const asistenciaRes = await axios.get("/api/asistencia/hoy", { headers });
                if (asistenciaRes.data) {
                    setPresentesCount(asistenciaRes.data.length);
                    const conVoto = asistenciaRes.data.filter((a: { socio?: Socio }) => a.socio && a.socio.habilitadoVozVoto && a.socio.habilitadoVozVoto.toLowerCase().includes('voto')).length;
                    setRegistradosVozYVoto(conVoto);
                    setRegistradosSoloVoz(asistenciaRes.data.length - conVoto);
                }
            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        };
        fetchStats();
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setCurrentPage(0);
            fetchSocios(0, val, filterEstado, filterNumeroSocio, filterNombre, filterTelefono, filterSucursal);
        }, 500);
    };

    const tieneVozYVoto = (socio: Socio) => {
        if (socio.estadoVozVoto !== undefined) return socio.estadoVozVoto;
        return socio.habilitadoVozVoto ? socio.habilitadoVozVoto.toLowerCase().includes('voto') : false;
    };

    const displayedSocios = socios;
    const sociosConVoto = 14608;
    const hasActiveFilters = filterNumeroSocio || filterNombre || filterTelefono || filterSucursal || filterEstado !== "todos";

    const clearAllFilters = () => {
        setFilterNumeroSocio("");
        setFilterNombre("");
        setFilterTelefono("");
        setFilterSucursal("");
        setFilterEstado("todos");
        fetchSocios(0, "", "todos", "", "", "", "");
    };

    const handleExport = async (format: "excel" | "pdf") => {
        setExporting(format);
        setShowExportMenu(false);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(
                `/api/socios/export/${format}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: "blob"
                }
            );

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = format === "excel" ? "padron_socios.xlsx" : "padron_socios.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Padrón exportado a ${format.toUpperCase()} exitosamente`);
        } catch (err) {
            console.error("Error exporting:", err);
            toast.error(`Error al exportar a ${format.toUpperCase()}`);
        } finally {
            setExporting(null);
        }
    };

    const openCreateModal = () => {
        setFormData({
            numeroSocio: "",
            nombreCompleto: "",
            cedula: "",
            telefono: "",
            aporteAlDia: true,
            solidaridadAlDia: true,
            fondoAlDia: true,
            incoopAlDia: true,
            creditoAlDia: true
        });
        setSelectedSocio(null);
        setModalMode("create");
        setShowModal(true);
    };

    const openEditModal = (socio: Socio) => {
        setFormData({
            numeroSocio: socio.numeroSocio,
            nombreCompleto: socio.nombreCompleto,
            cedula: socio.cedula,
            telefono: socio.telefono || "",
            aporteAlDia: socio.aporteAlDia,
            solidaridadAlDia: socio.solidaridadAlDia,
            fondoAlDia: socio.fondoAlDia,
            incoopAlDia: socio.incoopAlDia,
            creditoAlDia: socio.creditoAlDia
        });
        setSelectedSocio(socio);
        setModalMode("edit");
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.numeroSocio || !formData.nombreCompleto || !formData.cedula) {
            toast.error("Número de socio, nombre y cédula son obligatorios");
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            if (modalMode === "create") {
                await axios.post("/api/socios", formData, { headers });
                toast.success("Socio creado exitosamente");
            } else {
                await axios.put(`/api/socios/${selectedSocio?.id}`, formData, { headers });
                toast.success("Socio actualizado exitosamente");
            }

            setShowModal(false);
            fetchSocios(currentPage, searchTerm, filterEstado, filterNumeroSocio, filterNombre, filterTelefono, filterSucursal);
        } catch (err: any) {
            console.error("Error saving:", err);
            const msg = err.response?.data?.error || "Error al guardar socio";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (socio: Socio) => {
        setSocioToDelete(socio);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        if (!socioToDelete) return;

        setDeleting(true);
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/socios/${socioToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Socio eliminado exitosamente");
            setShowDeleteConfirm(false);
            setSocioToDelete(null);
            fetchSocios(currentPage, searchTerm, filterEstado, filterNumeroSocio, filterNombre, filterTelefono, filterSucursal);
        } catch (err: any) {
            console.error("Error deleting:", err);
            toast.error(err.response?.data?.error || "Error al eliminar socio");
        } finally {
            setDeleting(false);
        }
    };

    const handleImportClick = (mode: "full" | "complementary") => {
        setImportMode(mode);
        setShowImportMenu(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const endpoint = importMode === "full" ? "/api/socios/import" : "/api/socios/import/complementary";

        setIsImporting(true);
        const toastId = toast.loading("Iniciando importación...");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const token = localStorage.getItem("token");
            const res = await axios.post(endpoint, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            const processId = res.data.processId;
            toast.dismiss(toastId);
            toast.success(`Importación ${importMode === "full" ? "completa" : "complementaria"} iniciada.`);

            // Simple polling notification
            setTimeout(() => {
                toast.info("La importación se está procesando en segundo plano. Recargue la página en unos momentos.");
                setIsImporting(false);
                fetchSocios(currentPage, searchTerm, filterEstado, filterNumeroSocio, filterNombre, filterTelefono, filterSucursal);
            }, 3000);

        } catch (error) {
            console.error(error);
            toast.error("Error al iniciar importación");
            toast.dismiss(toastId);
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 lg:p-12 pb-32">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">

                <div className="relative overflow-hidden rounded-2xl md:rounded-[2rem] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 p-6 md:p-10 shadow-2xl shadow-emerald-500/20 text-white">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-white/10 blur-3xl hidden md:block" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-black/10 blur-3xl hidden md:block" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 md:px-4 md:py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-3 md:mb-4 border border-white/20 shadow-lg">
                                <Zap className="h-3 w-3 text-yellow-300 fill-yellow-300" />
                                Base de Datos Electoral
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-sm">
                                Padrón de Socios
                            </h1>
                            <p className="mt-2 md:mt-3 text-sm md:text-lg font-medium text-emerald-50 max-w-xl leading-relaxed opacity-90">
                                Consulta y gestión del padrón electoral.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full lg:w-auto">
                            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-3 gap-2 md:gap-3">
                                <div className="bg-white rounded-xl p-2.5 md:p-3 text-center shadow-lg">
                                    <div className="text-xl md:text-2xl font-black text-slate-800">{totalElements.toLocaleString()}</div>
                                    <div className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Padrón</div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-500 rounded-xl p-2.5 md:p-3 text-center shadow-lg text-white">
                                    <div className="text-xl md:text-2xl font-black">{sociosConVoto.toLocaleString()}</div>
                                    <div className="text-[8px] md:text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Voz y Voto</div>
                                </div>
                                <div className="bg-yellow-500 rounded-xl p-2.5 md:p-3 text-center shadow-lg text-white">
                                    <div className="text-xl md:text-2xl font-black">{(totalElements - sociosConVoto > 0 ? totalElements - sociosConVoto : 0).toLocaleString()}</div>
                                    <div className="text-[8px] md:text-[10px] font-bold text-yellow-100 uppercase tracking-wider">Solo Voz</div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl p-2.5 md:p-3 text-center shadow-lg text-white">
                                    <div className="text-xl md:text-2xl font-black">{presentesCount.toLocaleString()}</div>
                                    <div className="text-[8px] md:text-[10px] font-bold text-cyan-100 uppercase tracking-wider">Presentes</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-xl p-2.5 md:p-3 text-center shadow-lg text-white">
                                    <div className="text-xl md:text-2xl font-black">{registradosVozYVoto.toLocaleString()}</div>
                                    <div className="text-[8px] md:text-[10px] font-bold text-green-100 uppercase tracking-wider">Reg. Voz+Voto</div>
                                </div>
                                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-2.5 md:p-3 text-center shadow-lg text-white">
                                    <div className="text-xl md:text-2xl font-black">{registradosSoloVoz.toLocaleString()}</div>
                                    <div className="text-[8px] md:text-[10px] font-bold text-orange-100 uppercase tracking-wider">Reg. Solo Voz</div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <div className="relative" ref={exportMenuRef}>
                                    <button
                                        onClick={() => setShowExportMenu(!showExportMenu)}
                                        disabled={!!exporting}
                                        className="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white px-4 md:px-6 py-2.5 md:py-3 text-emerald-900 shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
                                    >
                                        <div className="relative z-10 flex items-center gap-2 font-bold text-sm md:text-base">
                                            {exporting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <FileDown className="h-4 w-4 text-emerald-500" />
                                            )}
                                            <span>Exportar</span>
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {showExportMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50"
                                            >
                                                <button
                                                    onClick={() => handleExport("excel")}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left"
                                                >
                                                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                                                    <span className="font-medium text-slate-700">Excel (.xlsx)</span>
                                                </button>
                                                <button
                                                    onClick={() => handleExport("pdf")}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 transition-colors text-left border-t border-slate-100"
                                                >
                                                    <FileText className="h-5 w-5 text-rose-600" />
                                                    <span className="font-medium text-slate-700">PDF</span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Import Menu */}
                                {isSuperAdmin && (
                                    <div className="relative" ref={importMenuRef}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileChange}
                                        />
                                        <button
                                            onClick={() => setShowImportMenu(!showImportMenu)}
                                            disabled={isImporting}
                                            className="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white px-4 md:px-6 py-2.5 md:py-3 text-emerald-900 shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
                                        >
                                            <div className="relative z-10 flex items-center gap-2 font-bold text-sm md:text-base">
                                                {isImporting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Upload className="h-4 w-4 text-purple-500" />
                                                )}
                                                <span>Importar</span>
                                                <ChevronDown className="h-4 w-4" />
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {showImportMenu && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50"
                                                >
                                                    <button
                                                        onClick={() => handleImportClick("full")}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left"
                                                    >
                                                        <div className="bg-emerald-100 p-2 rounded-lg">
                                                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-700 block text-sm">Importación Completa</span>
                                                            <span className="text-[10px] text-slate-500">Reemplaza/Actualiza todo el padrón</span>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => handleImportClick("complementary")}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-left border-t border-slate-100"
                                                    >
                                                        <div className="bg-purple-100 p-2 rounded-lg">
                                                            <Zap className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-700 block text-sm">Solo Rellenar Datos</span>
                                                            <span className="text-[10px] text-slate-500">Completa vacíos, no sobreescribe</span>
                                                        </div>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {isSuperAdmin && (
                                    <button
                                        onClick={openCreateModal}
                                        className="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-md px-4 md:px-6 py-2.5 md:py-3 text-white shadow-xl transition-all hover:scale-105 active:scale-95 border border-white/20"
                                    >
                                        <div className="relative z-10 flex items-center gap-2 font-bold text-sm md:text-base">
                                            <Plus className="h-4 w-4" />
                                            <span>Nuevo Socio</span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="group relative rounded-xl md:rounded-[2rem] bg-white p-2 shadow-xl shadow-slate-200/50">
                        <div className="absolute -inset-1 rounded-[1.5rem] md:rounded-[2.1rem] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 blur group-hover:opacity-20 transition duration-500" />
                        <div className="relative flex items-center">
                            <div className="pl-4 md:pl-5 pr-2 md:pr-3 text-slate-400">
                                <Search className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre, cédula o número de socio..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full py-3 md:py-4 bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400 text-base md:text-lg"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        fetchSocios(0, "", filterEstado, filterNumeroSocio, filterNombre, filterTelefono, filterSucursal);
                                    }}
                                    className="mr-2 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`mr-2 md:mr-4 px-3 md:px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm font-bold
                                     ${showFilters || hasActiveFilters
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <Filter className="h-4 w-4" />
                                <span className="hidden md:inline">Filtros</span>
                                {hasActiveFilters && (
                                    <span className="bg-white text-emerald-500 text-xs font-black px-1.5 py-0.5 rounded-md">!</span>
                                )}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xl shadow-slate-200/50 border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-emerald-500" />
                                            Filtros por Columna
                                        </h4>
                                        {hasActiveFilters && (
                                            <button
                                                onClick={clearAllFilters}
                                                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                                            >
                                                <X className="h-3 w-3" />
                                                Limpiar todo
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">N° Socio</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: 1234"
                                                value={filterNumeroSocio}
                                                onChange={(e) => setFilterNumeroSocio(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Juan"
                                                value={filterNombre}
                                                onChange={(e) => setFilterNombre(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Teléfono</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: 0981"
                                                value={filterTelefono}
                                                onChange={(e) => setFilterTelefono(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sucursal</label>
                                            <select
                                                value={filterSucursal}
                                                onChange={(e) => setFilterSucursal(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all bg-white"
                                            >
                                                <option value="">Todas</option>
                                                {sucursales.map((sucursal) => (
                                                    <option key={sucursal.id} value={sucursal.id}>
                                                        {sucursal.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Estado</label>
                                            <select
                                                value={filterEstado}
                                                onChange={(e) => setFilterEstado(e.target.value as "todos" | "vozYVoto" | "soloVoz")}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all bg-white"
                                            >
                                                <option value="todos">Todos</option>
                                                <option value="vozYVoto">Voz y Voto</option>
                                                <option value="soloVoz">Solo Voz</option>
                                            </select>
                                        </div>
                                    </div>
                                    {hasActiveFilters && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
                                            <span className="font-medium">Mostrando:</span>
                                            <span className="font-black text-emerald-500">{displayedSocios.length}</span>
                                            <span>de {totalElements} resultados</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="relative inline-block">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-500 mx-auto"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Users className="h-6 w-6 text-emerald-500" />
                            </div>
                        </div>
                        <p className="mt-4 text-slate-500 font-medium">Cargando padrón...</p>
                    </div>
                ) : error ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 text-red-600 p-8 rounded-2xl text-center border-2 border-red-100 shadow-xl shadow-red-500/10"
                    >
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                        <p className="font-bold text-lg">{error}</p>
                    </motion.div>
                ) : (
                    <>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl md:rounded-3xl lg:shadow-2xl lg:shadow-slate-200/50 lg:border lg:border-slate-100 overflow-hidden"
                        >
                            <div className="grid grid-cols-1 gap-4 p-2 md:hidden">
                                {displayedSocios.map((socio) => (
                                    <SocioCard
                                        key={socio.id}
                                        socio={socio}
                                        tieneVozYVoto={tieneVozYVoto(socio)}
                                        isSuperAdmin={isSuperAdmin}
                                        onEdit={() => openEditModal(socio)}
                                        onDelete={() => confirmDelete(socio)}
                                        onClick={() => setViewSocio(socio)}
                                    />
                                ))}
                                {displayedSocios.length === 0 && (
                                    <div className="text-center py-10 text-slate-400">No se encontraron socios</div>
                                )}
                            </div>

                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-100">
                                            <th className="p-4 md:p-5 text-xs font-black text-slate-500 uppercase tracking-wider">N° Socio</th>
                                            <th className="p-4 md:p-5 text-xs font-black text-slate-500 uppercase tracking-wider">Socio</th>
                                            <th className="p-4 md:p-5 text-xs font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Ubicación</th>
                                            <th className="p-4 md:p-5 text-xs font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Sucursal</th>
                                            <th className="p-4 md:p-5 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Estado</th>
                                            <th className="p-4 md:p-5 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayedSocios.map((socio, index) => (
                                            <SocioRow
                                                key={socio.id}
                                                socio={socio}
                                                index={index}
                                                tieneVozYVoto={tieneVozYVoto(socio)}
                                                isSuperAdmin={isSuperAdmin}
                                                onEdit={() => openEditModal(socio)}
                                                onDelete={() => confirmDelete(socio)}
                                                onClick={() => setViewSocio(socio)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/80 backdrop-blur-xl rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl shadow-slate-200/50 border border-slate-100/50 flex flex-col sm:flex-row items-center justify-between gap-4"
                        >
                            <p className="text-sm text-slate-500 font-medium">
                                Mostrando <span className="font-black text-emerald-500">{displayedSocios.length}</span> de <span className="font-black text-slate-800">{totalElements.toLocaleString()}</span> socios
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                    disabled={currentPage === 0}
                                    className="h-12 w-12 md:h-14 md:w-14 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-emerald-500 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-400 transition-all duration-300 text-slate-600 shadow-lg shadow-slate-200/50 hover:shadow-emerald-200/50"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                                <div className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-base shadow-xl shadow-emerald-200/50 min-w-[100px] text-center">
                                    {currentPage + 1} /{totalPages || 1}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={currentPage >= totalPages - 1 && (!searchTerm || displayedSocios.length < pageSize)}
                                    className="h-12 w-12 md:h-14 md:w-14 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-emerald-500 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-400 transition-all duration-300 text-slate-600 shadow-lg shadow-slate-200/50 hover:shadow-emerald-200/50"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </div>

            {/* Modal Ver Detalles Socio (Premium & Responsive) */}
            <AnimatePresence>
                {viewSocio && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
                        onClick={() => setViewSocio(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 relative"
                        >
                            {/* Header Premium con Gradiente y Patrón */}
                            <div className="relative h-32 bg-slate-100 overflow-hidden">
                                <div className={`absolute inset-0 bg-gradient-to-br opacity-90 ${tieneVozYVoto(viewSocio)
                                    ? 'from-[#009900] via-[#008800] to-[#006600]'
                                    : 'from-amber-400 via-orange-500 to-amber-600'}`}
                                />

                                {/* Decoración de fondo */}
                                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

                                <button
                                    onClick={() => setViewSocio(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full backdrop-blur-md transition-all active:scale-95 z-10"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Contenido Principal - Avatar superpuesto */}
                            <div className="px-6 pb-24 relative"> {/* Padding-bottom grande para evitar solapamiento con la franja inferior */}
                                <div className="flex flex-col items-center -mt-16 mb-6">
                                    <div className={`h-28 w-28 rounded-[2rem] p-1 bg-white shadow-2xl
                                        ${tieneVozYVoto(viewSocio) ? 'shadow-[#009900]/20' : 'shadow-orange-500/20'}`}>
                                        <div className={`w-full h-full rounded-[1.8rem] flex items-center justify-center text-4xl font-black text-white
                                            ${tieneVozYVoto(viewSocio)
                                                ? 'bg-gradient-to-br from-[#009900] to-[#007700]'
                                                : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                                            {viewSocio.nombreCompleto.substring(0, 2).toUpperCase()}
                                        </div>
                                    </div>

                                    <h2 className="mt-4 text-2xl font-black text-slate-800 text-center leading-tight">
                                        {viewSocio.nombreCompleto}
                                    </h2>

                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold font-mono tracking-wide border border-slate-200">
                                            #{viewSocio.numeroSocio}
                                        </span>
                                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold font-mono border border-slate-200">
                                            CI: {viewSocio.cedula}
                                        </span>
                                    </div>
                                </div>

                                {/* Información Detallada */}
                                <div className="space-y-4">
                                    {/* Contacto */}
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
                                            <Phone className="h-3 w-3" /> Contacto
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-500">Teléfono</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-800 font-mono">{viewSocio.telefono || '—'}</span>
                                                    {viewSocio.telefono && getWhatsAppLink(viewSocio.telefono) && (
                                                        <a
                                                            href={getWhatsAppLink(viewSocio.telefono)!}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-all shadow-lg hover:shadow-green-500/30 font-bold text-xs"
                                                            title="WhatsApp"
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                            Chatear
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            {(viewSocio.email) && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-500">Email</span>
                                                    <span className="text-sm font-bold text-slate-800">{viewSocio.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ubicación y Datos */}
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
                                            <MapPin className="h-3 w-3" /> Datos Personales
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">VIVIENDA</p>
                                                <p className="text-sm font-bold text-slate-700 leading-tight">
                                                    {[viewSocio.barrio, viewSocio.ciudad].filter(Boolean).join(', ') || '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">SUCURSAL</p>
                                                <p className="text-sm font-bold text-slate-700 leading-tight">{viewSocio.sucursal?.nombre || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">EDAD</p>
                                                <p className="text-sm font-bold text-slate-700 leading-tight">{viewSocio.edad ? `${viewSocio.edad} años` : '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">PROFESIÓN</p>
                                                <p className="text-sm font-bold text-slate-700 leading-tight truncate">{viewSocio.profesion || '—'}</p>
                                            </div>
                                        </div>
                                        {(viewSocio.direccion) && (
                                            <div className="mt-4 pt-3 border-t border-slate-200/60">
                                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">DIRECCIÓN</p>
                                                <p className="text-xs font-medium text-slate-600 leading-relaxed">{viewSocio.direccion}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Actions si es Admin */}
                                    {isSuperAdmin && (
                                        <button
                                            onClick={() => { openEditModal(viewSocio); setViewSocio(null); }}
                                            className="w-full py-3 bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Editar Información
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Franja Inferior - Estado de Voto - Fixed at bottom */}
                            <div className={`absolute bottom-0 left-0 right-0 py-4 px-6 flex items-center justify-between shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-20
                                ${tieneVozYVoto(viewSocio)
                                    ? 'bg-[#009900] text-white'
                                    : 'bg-amber-500 text-white'}`}>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold opacity-80 letter-spacing-wide">Estado Habilitación</span>
                                    <div className="flex items-center gap-2 font-black text-lg leading-none mt-1">
                                        {tieneVozYVoto(viewSocio)
                                            ? <><ShieldCheck className="h-5 w-5" /> HABILITADO: VOZ Y VOTO</>
                                            : <><AlertTriangle className="h-5 w-5" /> SOLO VOZ</>
                                        }
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Crear/Editar (Sin Aportes) */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-slate-800">
                                        {modalMode === "create" ? "Nuevo Socio" : "Editar Socio"}
                                    </h2>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        <X className="h-5 w-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">N° Socio *</label>
                                        <input
                                            type="text"
                                            value={formData.numeroSocio}
                                            onChange={(e) => setFormData({ ...formData, numeroSocio: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all font-mono"
                                            placeholder="00001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cédula *</label>
                                        <input
                                            type="text"
                                            value={formData.cedula}
                                            onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all font-mono"
                                            placeholder="1234567"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        value={formData.nombreCompleto}
                                        onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                                        placeholder="Juan Pérez González"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all font-mono"
                                        placeholder="0981123456"
                                    />
                                </div>
                                {/* Sección de Aportes ELIMINADA por solicitud del usuario */}
                            </div>

                            <div className="p-6 border-t border-slate-100 flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-teal-500 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="h-5 w-5" />
                                            Guardar
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDeleteConfirm && socioToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-md p-6"
                        >
                            <div className="text-center">
                                <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                                    <Trash2 className="h-8 w-8 text-rose-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Socio?</h3>
                                <p className="text-slate-500 mb-1">
                                    Estás a punto de eliminar a:
                                </p>
                                <p className="font-bold text-slate-800 mb-4">
                                    {socioToDelete.nombreCompleto}
                                </p>
                                <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3 mb-6">
                                    Esta acción no se puede deshacer. Se eliminarán también las asistencias y asignaciones relacionadas.
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                                    >
                                        {deleting ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Trash2 className="h-5 w-5" />
                                                Eliminar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
