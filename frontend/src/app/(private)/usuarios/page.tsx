"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    UserPlus,
    Shield,
    Search,
    Loader2,
    CheckCircle2,
    XCircle,
    Edit2,
    Trash2,
    X,
    Eye,
    EyeOff,
    Monitor,
    Layout,
    Globe,
    CreditCard,
    ClipboardList,
    FileText,
    Settings,
    Lock,
    UserCircle2,
    BarChart3,
    Activity,
    Zap,
    ShieldAlert,
    UserCheck,
    CheckSquare,
    History,
    Upload,
    Award,
    Building2,
    Briefcase,
    Clock,
    Edit, // Added from instruction
    UserX, // Added from instruction
    MapPin, // Added from instruction
    ChevronLeft, // Added from instruction
    ChevronRight, // Added from instruction
    Info, // Added from instruction
    AlertCircle, // Added from instruction
    Send,
    LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Swal from 'sweetalert2';

interface Usuario {
    id: number | null;
    username: string | null;
    nombreCompleto: string;
    email: string;
    telefono: string;
    rol: string;
    rolNombre: string;
    activo: boolean;
    sucursal: string | null;
    sucursalId: number | null;
    permisosEspeciales: string | null;
    passwordVisible: string | null; // Contraseña visible para admins
    idSocio: number | null;
    tipo: "USUARIO" | "SOCIO";
    nroSocio?: string;
    numeroSocio?: string; // New field from backend
    cedula?: string;
    cargo?: string;
    meta?: number;
}

interface Rol {
    value: string;
    nombre: string;
    descripcion: string;
}

interface Sucursal {
    sucursalId: number;
    sucursal: string;
}

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeRolFilter, setActiveRolFilter] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Socio Search State
    const [socioQuery, setSocioQuery] = useState("");
    const [sociosFound, setSociosFound] = useState<any[]>([]);
    const [searchingSocio, setSearchingSocio] = useState(false);
    const [selectedSocio, setSelectedSocio] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        }
    }, []);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Form state
    const [form, setForm] = useState({
        username: "",
        password: "",
        nombreCompleto: "",
        email: "",
        telefono: "",
        rol: "OPERADOR",
        sucursalId: "",
        permisosEspeciales: "",
        idSocio: "" as string | number,
        cargo: "",
        meta: 50
    });

    const AVAILABLE_SCREENS = [
        { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "from-blue-500 to-emerald-500", bgColor: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-700" },
        { id: "dashboard-live", label: "Dashboard En Vivo", icon: Activity, color: "from-purple-500 to-pink-500", bgColor: "bg-purple-50", borderColor: "border-purple-200", textColor: "text-purple-700" },
        { id: "importar", label: "Importar Padrón", icon: Upload, color: "from-indigo-500 to-blue-500", bgColor: "bg-indigo-50", borderColor: "border-indigo-200", textColor: "text-indigo-700" },
        { id: "importar-funcionarios", label: "Importar Operadores", icon: Users, color: "from-violet-500 to-purple-500", bgColor: "bg-violet-50", borderColor: "border-violet-200", textColor: "text-violet-700" },
        { id: "socios", label: "Padrón Socios", icon: Users, color: "from-teal-500 to-emerald-500", bgColor: "bg-teal-50", borderColor: "border-teal-200", textColor: "text-teal-500" },
        { id: "asignacion-rapida", label: "Asignación Rápida", icon: Zap, color: "from-amber-500 to-orange-500", bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-700" },
        { id: "asignaciones", label: "Mis Listas", icon: UserCheck, color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-teal-500" },
        { id: "asignaciones-admin", label: "Asignación Master", icon: ShieldAlert, color: "from-red-500 to-rose-500", bgColor: "bg-red-50", borderColor: "border-red-200", textColor: "text-red-700" },
        { id: "asistencia", label: "Asistencia", icon: ClipboardList, color: "from-sky-500 to-blue-500", bgColor: "bg-sky-50", borderColor: "border-sky-200", textColor: "text-sky-700" },
        { id: "checkin", label: "Check-in", icon: CheckSquare, color: "from-green-500 to-emerald-500", bgColor: "bg-green-50", borderColor: "border-green-200", textColor: "text-green-700" },
        { id: "consulta", label: "Consulta Asistencia", icon: Search, color: "from-cyan-500 to-blue-500", bgColor: "bg-cyan-50", borderColor: "border-cyan-200", textColor: "text-cyan-700" },
        { id: "gestion-asistencia", label: "Gestión Asistencia", icon: ShieldAlert, color: "from-orange-500 to-red-500", bgColor: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-700" },
        { id: "reportes-general", label: "Reportes Generales", icon: FileText, color: "from-slate-500 to-gray-600", bgColor: "bg-slate-50", borderColor: "border-slate-200", textColor: "text-slate-700" },
        { id: "reportes-rankings-vyv", label: "Rankings VyV", icon: Award, color: "from-amber-500 to-yellow-600", bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-700" },
        { id: "ranking-gestion", label: "Ranking de Gestión", icon: Award, color: "from-amber-400 to-yellow-600", bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-700" },
        { id: "reportes-asesores", label: "Reporte Asesores", icon: UserCheck, color: "from-blue-500 to-indigo-500", bgColor: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-700" },
        { id: "reportes-sucursal", label: "Reportes Sucursal", icon: Building2, color: "from-indigo-500 to-violet-600", bgColor: "bg-indigo-50", borderColor: "border-indigo-200", textColor: "text-indigo-700" },
        { id: "reportes-funcionarios", label: "Rep. Operadores", icon: Briefcase, color: "from-blue-500 to-cyan-600", bgColor: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-700" },
        { id: "reportes-asistencia", label: "Rep. Asistencia", icon: Clock, color: "from-rose-500 to-red-600", bgColor: "bg-rose-50", borderColor: "border-rose-200", textColor: "text-rose-700" },
        { id: "auditoria-usuarios", label: "Auditoría Usuarios", icon: Activity, color: "from-slate-500 to-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200", textColor: "text-slate-700" },
        { id: "mi-reporte", label: "Mi Reporte", icon: ClipboardList, color: "from-indigo-500 to-blue-600", bgColor: "bg-indigo-50", borderColor: "border-indigo-200", textColor: "text-indigo-700" },
        { id: "exportar-vyv", label: "Exportar VyV", icon: Send, color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-emerald-700" },
        { id: "mensajes-chat", label: "Mensajería", icon: Zap, color: "from-emerald-500 to-blue-500", bgColor: "bg-cyan-50", borderColor: "border-cyan-200", textColor: "text-cyan-700" },
        { id: "mensajes-avisos", label: "Avisos/Notif.", icon: Zap, color: "from-orange-500 to-red-500", bgColor: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-700" },
        { id: "candidatos", label: "Candidatos", icon: Award, color: "from-emerald-500 to-teal-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-emerald-700" },
        { id: "config-candidatos", label: "Gestión Candidatos", icon: Award, color: "from-amber-500 to-yellow-600", bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-700" },
        { id: "usuarios", label: "Usuarios y Roles", icon: Shield, color: "from-rose-500 to-pink-500", bgColor: "bg-rose-50", borderColor: "border-rose-200", textColor: "text-rose-700" },
        { id: "datos-cooperativa", label: "Datos Coop.", icon: Building2, color: "from-slate-500 to-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200", textColor: "text-slate-700" },
        { id: "gestor-mesas", label: "Gestión Mesas", icon: LayoutGrid, color: "from-teal-500 to-emerald-500", bgColor: "bg-teal-50", borderColor: "border-teal-200", textColor: "text-teal-600" },
        { id: "auditoria", label: "Auditoría Sist.", icon: History, color: "from-gray-500 to-slate-500", bgColor: "bg-gray-50", borderColor: "border-gray-200", textColor: "text-gray-700" },
        { id: "gestion-listas", label: "Gestión de Listas", icon: ClipboardList, color: "from-cyan-500 to-teal-500", bgColor: "bg-cyan-50", borderColor: "border-cyan-200", textColor: "text-cyan-700" },
        { id: "configuracion", label: "Configuración", icon: Settings, color: "from-zinc-500 to-gray-600", bgColor: "bg-zinc-50", borderColor: "border-zinc-200", textColor: "text-zinc-700" },
        { id: "backups", label: "Backups", icon: Globe, color: "from-violet-500 to-purple-600", bgColor: "bg-violet-50", borderColor: "border-violet-200", textColor: "text-violet-700" },
    ];

    const fetchData = useCallback(async (query = "") => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [usuariosRes, rolesRes, sucursalesRes] = await Promise.all([
                axios.get(`/api/usuarios?term=${query}`, { headers }),
                axios.get("/api/usuarios/roles", { headers }),
                axios.get("/api/socios/estadisticas/por-sucursal", { headers })
            ]);

            setUsuarios(usuariosRes.data);
            setRoles(rolesRes.data);
            setSucursales(sucursalesRes.data);
            setCurrentPage(1); // Reset page on new data
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, fetchData]);

    const openNewModal = () => {
        setEditingUser(null);
        setSelectedSocio(null);
        setSocioQuery("");
        setSociosFound([]);
        setForm({
            username: "",
            password: "",
            nombreCompleto: "",
            email: "",
            telefono: "",
            rol: "OPERADOR",
            sucursalId: "",
            permisosEspeciales: "",
            idSocio: "",
            cargo: "",
            meta: 50
        });
        setShowModal(true);
    };

    const searchSocios = async () => {
        if (!socioQuery.trim()) return;
        setSearchingSocio(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/socios/buscar?term=${socioQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSociosFound(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setSearchingSocio(false);
        }
    };

    const selectSocioForUser = (socio: any) => {
        setSelectedSocio(socio);
        setForm({
            ...form,
            nombreCompleto: socio.nombreCompleto,
            // Pre-fill username with CI if available
            username: socio.cedula ? socio.cedula.replace(/\D/g, '') : "",
            idSocio: socio.id,
            // Pre-fill phone/email if they exist on socio, otherwise empty for manual entry
            // BUT user specifically requested "telefono y email el usuario carga por su cuenta"
            // however, it makes sense to pre-fill IF available allowing edit. 
            // The prompt said: "el telefono y el email despues el usuario carga por su cuenta"
            // implying they want to check/enter it. I will pre-fill if available but it's editable.

            // Actually, let's leave email empty as requested context implies verification.
            // Phone can be pre-filled as it's useful.
            telefono: "", // Explicitly empty as per "user loads on their own" request interpretation? 
            // "el usuario carga por su cuenta" -> user inputs it manually.
            // I will leave it empty to force manual entry/verification.
            email: ""
        });
        setSociosFound([]);
    };

    const handleImpersonate = async (targetUser: Usuario) => {
        if (!targetUser.id) return;

        const result = await Swal.fire({
            title: '🕵️ Iniciar Impersonación',
            text: `¿Deseas ingresar al perfil de ${targetUser.nombreCompleto}? Se abrirá en una nueva pestaña.`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sí, Ingresar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.post(`/api/auth/impersonate/${targetUser.id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.token) {
                    const bridgeUrl = `/admin/impersonate?token=${res.data.token}&adminToken=${token}`;
                    window.open(bridgeUrl, '_blank');
                }
            } catch (error: any) {
                console.error("Error impersonating:", error);
                Swal.fire('Error', error.response?.data?.error || 'No se pudo impersonar', 'error');
            }
        }
    };

    const openGiveAccessModal = (socio: Usuario) => {
        setEditingUser(null);
        setForm({
            username: socio.cedula || socio.nroSocio || "",
            password: socio.cedula || socio.nroSocio || "", // Default password is ID/Nro
            nombreCompleto: socio.nombreCompleto,
            email: "",
            telefono: "",
            rol: "USUARIO_SOCIO",
            sucursalId: socio.sucursalId?.toString() || "", // Pre-fill sucursal
            permisosEspeciales: "dashboard,asignaciones,configuracion", // Default granular permissions
            idSocio: socio.idSocio || "",
            cargo: "",
            meta: 50
        });
        setShowModal(true);
    };

    const openEditModal = async (user: Usuario) => {
        // SEGURIDAD: Si soy el Super Admin Original (ID 1), pedir código para editar
        if (currentUser?.id === 1) {
            const { value: code } = await Swal.fire({
                title: '🔐 Acceso Protegido',
                text: 'Ingrese el código de seguridad para gestionar roles/usuarios',
                input: 'password',
                inputPlaceholder: 'Código de acceso',
                inputAttributes: {
                    maxlength: '6',
                    autocapitalize: 'off',
                    autocorrect: 'off'
                },
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                confirmButtonText: 'Verificar'
            });

            if (!code) return; // Cancelado

            if (code !== "226118") {
                Swal.fire({
                    title: 'Acceso Denegado',
                    text: 'Código incorrecto',
                    icon: 'error',
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }
        }

        setEditingUser(user);
        setForm({
            username: user.username || "",
            password: "",
            nombreCompleto: user.nombreCompleto,
            email: user.email || "",
            telefono: user.telefono || "",
            rol: user.rol,
            sucursalId: user.sucursalId?.toString() || "",
            permisosEspeciales: user.permisosEspeciales || "",
            idSocio: user.idSocio || "",
            cargo: user.cargo || "",
            meta: user.meta || 50
        });
        setShowModal(true);
    };

    const togglePermiso = (screenId: string) => {
        const current = form.permisosEspeciales.split(',').filter(p => p !== "");
        const index = current.indexOf(screenId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(screenId);
        }
        setForm(prev => ({ ...prev, permisosEspeciales: current.join(',') }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const payload = {
                ...form,
                sucursalId: form.sucursalId ? parseInt(form.sucursalId) : null,
                idSocio: form.idSocio ? parseInt(form.idSocio.toString()) : null
            };

            if (editingUser && editingUser.id) {
                await axios.put(`/api/usuarios/${editingUser.id}`, payload, { headers });

                // Si me estoy editando a mí mismo, actualizar localStorage para reflejar cambios en Sidebar inmediatamente
                if (currentUser && editingUser.id === currentUser.id) {
                    const updatedUser = { ...currentUser, ...payload };
                    // Asegurarse de que el rol y otros campos no enviados en payload se mantengan
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                    // Opcional: recargar para refrescar contexto global
                    // window.location.reload();
                }

                setMessage({ type: "success", text: "Usuario actualizado correctamente" });
            } else {
                await axios.post("/api/usuarios", payload, { headers });
                setMessage({ type: "success", text: "Usuario creado correctamente" });
            }

            fetchData(searchTerm);
            setTimeout(() => {
                setShowModal(false);
                setMessage(null);
            }, 1000);
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response?.data?.error) {
                setMessage({ type: "error", text: error.response.data.error });
            } else {
                setMessage({ type: "error", text: "Error al guardar usuario" });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user: Usuario) => {
        if (!user.id) return;

        // SEGURIDAD: Si soy ID 1 y quiero borrar, pedir código (especialmente si es otro admin)
        if (currentUser?.id === 1) {
            const { value: code } = await Swal.fire({
                title: '🔐 Seguridad Requerida',
                text: 'Ingrese código para confirmar la eliminación',
                input: 'password',
                inputAttributes: { maxlength: '6' },
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Verificar y Borrar'
            });
            if (!code) return;
            if (code !== "226118") {
                Swal.fire('Error', 'Código incorrecto', 'error');
                return;
            }
        }

        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `¿Deseas dar de baja al usuario "${user.nombreCompleto}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-2xl' }
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };
                // Usamos DELETE para baja lógica (según controller)
                await axios.delete(`/api/usuarios/${user.id}`, { headers });

                await Swal.fire({
                    title: '¡Desactivado!',
                    text: 'El usuario ha sido dado de baja correctamente.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: { popup: 'rounded-2xl' }
                });
                fetchData(searchTerm);
            } catch (error) {
                console.error("Error:", error);
                Swal.fire({ title: 'Error', text: 'No se pudo desactivar el usuario', icon: 'error' });
            }
        }
    };

    const handleActivate = async (user: Usuario) => {
        if (!user.id) return;

        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            await axios.put(`/api/usuarios/${user.id}`, { activo: true }, { headers });

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: 'success',
                title: 'Usuario reactivado exitosamente'
            });
            fetchData(searchTerm);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const getRolColor = (rol: string) => {
        switch (rol) {
            case "SUPER_ADMIN": return "bg-purple-100 text-purple-700 border-purple-200";
            case "DIRECTIVO": return "bg-blue-100 text-blue-700 border-blue-200";
            case "OPERADOR": return "bg-teal-100 text-teal-500 border-teal-200";
            case "USUARIO_SOCIO": return "bg-slate-100 text-slate-700 border-slate-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    // Filter by active role
    const filteredUsuarios = activeRolFilter
        ? usuarios.filter(u => u.rol === activeRolFilter && u.tipo === "USUARIO")
        : usuarios;

    // Pagination Logic
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentUsers = filteredUsuarios.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsuarios.length / ITEMS_PER_PAGE);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleRolFilter = (rol: string) => {
        if (activeRolFilter === rol) {
            setActiveRolFilter(null); // Toggle off
        } else {
            setActiveRolFilter(rol);
        }
        setCurrentPage(1); // Reset to first page
    };

    // Mobile-friendly Card component
    function UserCard({ user, onEdit, onDelete, onActivate, onGiveAccess }: {
        user: Usuario,
        onEdit: (u: Usuario) => void,
        onDelete: (u: Usuario) => void,
        onActivate: (u: Usuario) => void,
        onGiveAccess: (u: Usuario) => void
    }) {
        const isOperator = user.tipo === "USUARIO";
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3 relative"
            >
                <div className="flex items-center justify-between">
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black border ${getRolColor(user.rol)}`}>
                        {user.rolNombre}
                    </div>
                    {user.tipo === "USUARIO" ? (
                        <span className={`h-2 w-2 rounded-full ${user.activo ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    ) : (
                        <span className="text-[10px] font-bold text-slate-400">SIN ACCESO</span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${isOperator ? 'bg-teal-50 text-teal-500' : 'bg-slate-50 text-slate-400'}`}>
                        {isOperator ? <Shield className="h-6 w-6" /> : <UserCircle2 className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{user.nombreCompleto}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            {user.username && <span className="text-[10px] font-mono text-slate-400">@{user.username}</span>}
                            {user.cedula && <span className="text-[10px] text-slate-500 font-bold">CI: {user.cedula}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-50">
                    <div className="bg-slate-50/50 p-2 rounded-lg">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Sucursal</p>
                        <p className="text-[10px] font-bold text-slate-600 truncate">{user.sucursal || 'General'}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-lg">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Identificación</p>
                        <p className="text-[10px] font-bold text-slate-600 truncate">
                            {user.numeroSocio || user.nroSocio ? `Socio #${user.numeroSocio || user.nroSocio}` : 'Operativo'}
                        </p>
                    </div>
                </div>

                {/* Mobile-optimized action buttons with touch-friendly sizes */}
                <div className="flex gap-2 mt-1">
                    {isOperator ? (
                        <>
                            {(user.rol !== 'SUPER_ADMIN' || (currentUser?.id === 1 && user.id !== 1)) && (
                                <>
                                    <button
                                        onClick={() => onEdit(user)}
                                        className="flex-1 min-h-[44px] py-3 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 active:bg-blue-700 active:scale-95 transition-all touch-manipulation select-none flex items-center justify-center gap-2"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        <span>Editar</span>
                                    </button>
                                    <button
                                        onClick={() => user.activo ? onDelete(user) : onActivate(user)}
                                        className={`flex-1 min-h-[44px] py-3 rounded-xl text-white text-xs font-black uppercase tracking-wider transition-all touch-manipulation select-none active:scale-95 flex items-center justify-center gap-2 ${user.activo ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'}`}
                                    >
                                        {user.activo ? <><Trash2 className="h-4 w-4" /><span>Baja</span></> : <><CheckCircle2 className="h-4 w-4" /><span>Activar</span></>}
                                    </button>
                                </>
                            )}
                            {(currentUser?.rol === 'SUPER_ADMIN' || currentUser?.rol === 'ADMIN' || (typeof window !== 'undefined' && localStorage.getItem("user")?.includes("SUPER_ADMIN"))) && user.id !== currentUser?.id && user.activo && (
                                <button
                                    onClick={() => handleImpersonate(user)}
                                    className="flex-1 min-h-[44px] py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 transition-all shadow-lg shadow-emerald-200 border-2 border-white touch-manipulation select-none flex items-center justify-center gap-1"
                                    title="Ingresar como este usuario"
                                >
                                    <Monitor className="h-4 w-4" />
                                    <span>Login</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => onGiveAccess(user)}
                            className="flex-1 min-h-[44px] py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:bg-emerald-700 active:scale-95 transition-all touch-manipulation select-none flex items-center justify-center gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>Dar Acceso</span>
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    if (loading && usuarios.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        );
    }

    // ... (fetchData implementation remains same)

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            const doc = new jsPDF();

            // Header
            doc.setFontSize(16);
            doc.text("Reporte de Usuarios y Roles", 14, 20);
            doc.setFontSize(10);
            doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);
            if (searchTerm) {
                doc.text(`Filtro aplicado: "${searchTerm}"`, 14, 34);
            }

            const tableData = usuarios.map(u => [
                u.numeroSocio || "-",
                u.username || "-",
                u.nombreCompleto,
                u.rolNombre || u.rol,
                u.sucursal || "General",
                u.activo ? "Activo" : "Inactivo"
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['N° Socio', 'Usuario', 'Nombre Completo', 'Rol /Cargo', 'Sucursal', 'Estado']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] }
            });

            doc.save("usuarios-sistema.pdf");
        } catch (error) {
            console.error("Error exporting PDF", error);
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const { utils, writeFile } = await import("xlsx");

            const dataToExport = usuarios.map(u => ({
                "N° Socio": u.numeroSocio || "-",
                "Usuario": u.username,
                "Nombre Completo": u.nombreCompleto,
                "Rol": u.rolNombre || u.rol,
                "Cargo": u.cargo || "",
                "Sucursal": u.sucursal || "General",
                "Meta": u.meta || 0,
                "Estado": u.activo ? "Activo" : "Inactivo"
            }));

            const ws = utils.json_to_sheet(dataToExport);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Usuarios");
            writeFile(wb, "usuarios-sistema.xlsx");
        } catch (error) {
            console.error("Error exporting Excel", error);
            Swal.fire('Error', 'No se pudo generar el Excel', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="mx-auto space-y-4" style={{ maxWidth: 'clamp(320px, 98vw, 1100px)', padding: 'clamp(0.5rem, 2vw, 1.5rem)' }}>
            {/* Header Premium - Compacto */}
            <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 rounded-2xl p-4 text-white shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }} className="font-black">Gestión de Usuarios y Roles</h1>
                        <p className="text-rose-100 text-xs mt-0.5">Administra los accesos al sistema</p>
                    </div>
                    <button
                        onClick={openNewModal}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur px-4 py-2.5 font-bold text-sm text-white hover:bg-white/30 border border-white/30 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <UserPlus className="h-4 w-4" />
                        Crear Usuario
                    </button>
                </div>
            </div>

            {/* Resumen de Roles - Cards Clickeables Premium */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {roles.map((rol) => {
                    const count = usuarios.filter(u => u.rol === rol.value && u.tipo === "USUARIO").length;
                    const isActive = activeRolFilter === rol.value;
                    const colorConfig: Record<string, { gradient: string; bg: string; bgActive: string; border: string; text: string; ring: string }> = {
                        'SUPER_ADMIN': { gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', bgActive: 'bg-purple-600', border: 'border-purple-200', text: 'text-purple-700', ring: 'ring-purple-500' },
                        'DIRECTIVO': { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', bgActive: 'bg-blue-600', border: 'border-blue-200', text: 'text-blue-700', ring: 'ring-blue-500' },
                        'OPERADOR': { gradient: 'from-teal-500 to-emerald-500', bg: 'bg-teal-50', bgActive: 'bg-teal-500', border: 'border-teal-200', text: 'text-teal-500', ring: 'ring-teal-500' },
                        'ASESOR_DE_CREDITO': { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', bgActive: 'bg-amber-600', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-500' },
                        'USUARIO_SOCIO': { gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', bgActive: 'bg-slate-600', border: 'border-slate-200', text: 'text-slate-700', ring: 'ring-slate-500' }
                    };
                    const colors = colorConfig[rol.value] || colorConfig['USUARIO_SOCIO'];

                    return (
                        <button
                            key={rol.value}
                            onClick={() => handleRolFilter(rol.value)}
                            className={`relative overflow-hidden rounded-2xl p-4 border-2 transition-all duration-300 cursor-pointer group touch-manipulation select-none min-h-[80px] active:scale-95
                                ${isActive
                                    ? `${colors.bgActive} border-transparent shadow-xl scale-[1.02] ring-4 ${colors.ring}/30`
                                    : `${colors.bg} ${colors.border} hover:shadow-lg hover:scale-[1.01] hover:border-transparent`
                                }`}
                        >
                            {/* Shine effect on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                            <div className="flex items-center justify-between relative z-10">
                                <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : `bg-gradient-to-br ${colors.gradient}`}`}>
                                    <Shield className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white'}`} />
                                </div>
                                <p className={`text-3xl font-black ${isActive ? 'text-white' : colors.text}`}>{count}</p>
                            </div>
                            <p className={`font-bold mt-3 text-sm ${isActive ? 'text-white' : colors.text}`}>{rol.nombre}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                {isActive ? '✓ Filtro Activo' : 'Toca para filtrar'}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Active Filter Indicator */}
            {activeRolFilter && (
                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500 rounded-lg">
                            <Shield className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Filtro Activo</p>
                            <p className="text-sm font-black text-teal-500">
                                Mostrando: {roles.find(r => r.value === activeRolFilter)?.nombre} ({filteredUsuarios.length})
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveRolFilter(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-teal-500 font-bold text-xs hover:bg-emerald-100 transition-all"
                    >
                        <X className="h-4 w-4" />
                        Limpiar Filtro
                    </button>
                </div>
            )}

            {/* Tabla Unificada */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex flex-col justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar: N° Socio, Nombre, Cédula, Usuario..."
                                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                <FileText className="h-4 w-4" />
                                PDF
                            </button>
                            <button
                                onClick={handleExportExcel}
                                disabled={isExporting}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                <BarChart3 className="h-4 w-4" />
                                Excel
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        {(searchTerm.length > 0 || activeRolFilter) && (
                            <p className="text-xs text-emerald-500 font-bold bg-emerald-50 px-3 py-1 rounded-full">
                                ✓ Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
                            </p>
                        )}
                        <p className="text-xs text-slate-400 font-medium ml-auto">
                            Total Sistema: {usuarios.length}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                        {currentUsers.map((user, idx) => (
                            <UserCard
                                key={user.id ? `card-u-${user.id}` : `card-s-${user.idSocio}-${idx}`}
                                user={user}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                                onActivate={handleActivate}
                                onGiveAccess={openGiveAccessModal}
                            />
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <table className="w-full hidden md:table">
                        <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificación</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre y Detalles</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado /Rol</th>
                                <th className="px-4 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Acciones Rápidas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentUsers.map((user, idx) => (
                                <tr key={user.id ? `u-${user.id}` : `s-${user.idSocio}-${idx}`} className="hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-emerald-50/30 transition-all duration-200 group">
                                    <td className="px-6 py-4">
                                        {user.tipo === "USUARIO" ? (
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded w-fit mb-1">@{user.username}</span>
                                                {(user.numeroSocio || user.nroSocio) && (
                                                    <span className="text-[10px] text-teal-500 font-bold bg-teal-50 px-1 rounded w-fit">Socio #{user.numeroSocio || user.nroSocio}</span>
                                                )}
                                                {!user.numeroSocio && !user.nroSocio && <span className="text-[10px] text-slate-400 font-bold uppercase">Sist. Operativo</span>}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-600">Socio #{user.nroSocio || user.numeroSocio}</span>
                                                <span className="text-[10px] text-slate-400">Sin acceso activo</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${user.tipo === "USUARIO" ? 'bg-teal-50 text-teal-500' : 'bg-slate-100 text-slate-400'}`}>
                                                {user.tipo === "USUARIO" ? <Shield className="h-5 w-5" /> : <UserCircle2 className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700">{user.nombreCompleto}</p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    {user.cedula && <span className="text-[10px] font-medium text-slate-400">C.I.: {user.cedula}</span>}
                                                    {user.sucursal && <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded tracking-tight">{user.sucursal}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${getRolColor(user.rol)}`}>
                                                {user.tipo === "USUARIO" ? <CheckCircle2 className="h-3 w-3 mr-1.5" /> : <XCircle className="h-3 w-3 mr-1.5" />}
                                                {user.rolNombre}
                                            </span>
                                            {user.permisosEspeciales && (
                                                <div className="relative group/perm">
                                                    <Lock className="h-4 w-4 text-emerald-500" />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/perm:block z-20 w-40 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg">
                                                        Permisos: {user.permisosEspeciales}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    {/* Premium ABM Actions - Side Panel Style */}
                                    <td className="px-2 py-3">
                                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {user.tipo === "USUARIO" ? (
                                                <>
                                                    {(user.rol !== 'SUPER_ADMIN' || (currentUser?.id === 1 && user.id !== 1)) && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(user)}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] font-black tracking-wide hover:shadow-lg hover:shadow-blue-200 hover:scale-105 transition-all"
                                                                title="Editar Usuario"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                                <span className="hidden lg:inline">Editar</span>
                                                            </button>
                                                            <button
                                                                onClick={() => user.activo ? handleDelete(user) : handleActivate(user)}
                                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black tracking-wide transition-all hover:scale-105 ${user.activo
                                                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-lg hover:shadow-red-200'
                                                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-200'
                                                                    }`}
                                                                title={user.activo ? "Dar de Baja" : "Reactivar"}
                                                            >
                                                                {user.activo ? <Trash2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                                <span className="hidden lg:inline">{user.activo ? 'Baja' : 'Activar'}</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {(currentUser?.rol === 'SUPER_ADMIN' || currentUser?.rol === 'ADMIN' || (typeof window !== 'undefined' && localStorage.getItem("user")?.includes("SUPER_ADMIN"))) && user.id !== currentUser?.id && user.activo && (
                                                        <button
                                                            onClick={() => handleImpersonate(user)}
                                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[10px] font-black tracking-wide hover:shadow-xl hover:shadow-emerald-300 hover:scale-105 transition-all border-2 border-emerald-100/50"
                                                            title="Ingresar como este usuario"
                                                        >
                                                            <Monitor className="h-3.5 w-3.5" />
                                                            <span>Ingresar</span>
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => openGiveAccessModal(user)}
                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-black tracking-widest hover:shadow-xl hover:shadow-emerald-200 hover:scale-105 transition-all uppercase"
                                                >
                                                    <UserPlus className="h-4 w-4" />
                                                    Dar Acceso
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {usuarios.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <Search className="h-10 w-10 text-slate-200 mb-4" />
                                            <p className="text-slate-400 font-medium">No se encontraron resultados</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Controles de Paginación */}
                    {usuarios.length > 0 && (
                        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
                            <p className="text-xs text-slate-400 font-medium">
                                Mostrando <span className="font-bold text-slate-600">{indexOfFirstItem + 1}</span> a <span className="font-bold text-slate-600">{Math.min(indexOfLastItem, usuarios.length)}</span> de <span className="font-bold text-slate-600">{usuarios.length}</span> resultados
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Anterior
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        // Simple logic to show first 5 pages or sliding window could be added
                                        // For now, let's keep it simple or minimal
                                        let pageNum = i + 1;
                                        if (totalPages > 5 && currentPage > 3) {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        if (pageNum > totalPages) return null;

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => paginate(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                                    ? "bg-teal-500 text-white shadow-md shadow-teal-200"
                                                    : "bg-white text-slate-600 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Crear/Editar */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-teal-500 rounded-2xl shadow-lg shadow-teal-200">
                                    <Shield className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">
                                        {editingUser ? "Configurar Operador" : "Habilitar Nuevo Usuario"}
                                    </h2>
                                    <p className="text-slate-500 text-xs font-medium">Define el rol y los permisos granulares</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all">
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {message && (
                                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${message.type === "success" ? "bg-emerald-50 text-teal-500 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                                    {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            {/* SEARCH SECTION FOR NEW USERS */}
                            {!editingUser && (
                                <div className="space-y-4 mb-8 pb-8 border-b border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                        Paso 1: Buscar en Padrón de Socios
                                    </h3>

                                    {!selectedSocio ? (
                                        <div className="space-y-4">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={socioQuery}
                                                    onChange={(e) => setSocioQuery(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchSocios())}
                                                    placeholder="Buscar por Cédula, N° Socio o Nombre..."
                                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-sm transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={searchSocios}
                                                    disabled={searchingSocio}
                                                    className="px-6 py-3 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-500 transition-all flex items-center gap-2"
                                                >
                                                    {searchingSocio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                                    Buscar
                                                </button>
                                            </div>

                                            {/* Results List */}
                                            {sociosFound.length > 0 && (
                                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 divide-y divide-slate-100">
                                                    {sociosFound.map((sobj: any) => (
                                                        <button
                                                            key={sobj.id}
                                                            type="button"
                                                            onClick={() => selectSocioForUser(sobj)}
                                                            className="w-full text-left p-3 hover:bg-teal-50 transition-colors flex items-center justify-between group"
                                                        >
                                                            <div>
                                                                <p className="font-bold text-slate-700 text-sm group-hover:text-teal-500">{sobj.nombreCompleto}</p>
                                                                <div className="flex gap-2 text-xs text-slate-500">
                                                                    <span>C.I. {sobj.cedula}</span>
                                                                    <span>•</span>
                                                                    <span>Socio #{sobj.numeroSocio}</span>
                                                                </div>
                                                            </div>
                                                            <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-500 transition-all">
                                                                Seleccionar
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {sociosFound.length === 0 && socioQuery && !searchingSocio && (
                                                <p className="text-xs text-slate-400 italic text-center">
                                                    No se encontraron resultados o presiona buscar.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-100 rounded-full text-emerald-500">
                                                    <UserCheck className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Socio Seleccionado</p>
                                                    <p className="font-bold text-emerald-900">{selectedSocio.nombreCompleto}</p>
                                                    <p className="text-xs text-teal-500">C.I. {selectedSocio.cedula} | Socio #{selectedSocio.numeroSocio}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSocio(null);
                                                    setForm({ ...form, idSocio: "", nombreCompleto: "", username: "" });
                                                }}
                                                className="text-xs font-bold text-emerald-500 hover:text-emerald-500 hover:underline px-3 py-1"
                                            >
                                                Cambiar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nombre de Usuario</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={form.username}
                                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all font-mono text-sm pl-12"
                                                placeholder="ej: jdoe"
                                                required
                                                disabled={!!editingUser}
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <UserCircle2 className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nro Socio Display (Read Only) */}
                                    {editingUser && (editingUser.numeroSocio || editingUser.nroSocio) && (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                                N° Socio Vinculado
                                            </label>
                                            <div className="w-full px-5 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800 font-bold font-mono">
                                                {editingUser.numeroSocio || editingUser.nroSocio}
                                            </div>
                                        </div>
                                    )}



                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Teléfono</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={form.telefono}
                                                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all font-mono"
                                                placeholder="ej: 0981..."
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Users className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                            {editingUser ? "Nueva Contraseña (opcional)" : "Contraseña"}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={form.password}
                                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all pr-12 font-mono"
                                                placeholder={editingUser ? "Dejar vacío para no cambiar" : "••••••••"}
                                                required={!editingUser}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>

                                        {/* Mostrar contraseña actual si existe */}
                                        {editingUser && editingUser.passwordVisible && (
                                            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                                                        🔑 Contraseña Actual
                                                    </span>
                                                    <span className="font-mono font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg text-sm">
                                                        {editingUser.passwordVisible}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={form.nombreCompleto}
                                            onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all"
                                            placeholder="Nombre Apellido"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email /Contacto</label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all"
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Rol de Sistema</label>
                                        <div className="relative">
                                            <select
                                                value={form.rol}
                                                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none appearance-none transition-all font-bold text-slate-700"
                                            >
                                                {roles.map((rol) => (
                                                    <option key={rol.value} value={rol.value}>
                                                        {rol.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <Shield className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* NUEVO CAMPO: CARGO */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cargo (Opcional)</label>
                                        <input
                                            type="text"
                                            value={form.cargo || ""}
                                            onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                                            placeholder="Ej: Asesor, Supervisor, Cajero"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sucursal Asignada</label>
                                        <div className="relative">
                                            <select
                                                value={form.sucursalId}
                                                onChange={(e) => setForm({ ...form, sucursalId: e.target.value })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none appearance-none transition-all font-bold text-slate-700"
                                            >
                                                <option value="">Sin Restricción (Todas)</option>
                                                {sucursales.map((suc) => (
                                                    <option key={suc.sucursalId} value={suc.sucursalId}>
                                                        {suc.sucursal}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <Globe className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* NUEVO CAMPO: META */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Meta de Registro</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={form.meta || 50}
                                                onChange={(e) => setForm({ ...form, meta: parseInt(e.target.value) || 0 })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                                                disabled={form.rol !== 'SUPER_ADMIN'} // Solo Super Admin puede editar meta, O TODOS? "un campo de meta tambien en su perfil que puede ser modificable por el super admin"
                                            // Asumo que si el usuario logueado NO es super admin, no puede verlo/editarlo en el frontend, 
                                            // pero aquí estamos en la pantalla de gestión de usuarios que suele ser para admins.
                                            // Dejaré editable para quien tenga acceso a esta pantalla.
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-slate-400">
                                                <span className="text-[10px] uppercase font-bold">Socios</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">* Objetivo de registros V&V</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 space-y-4 border border-slate-200">
                                <label className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest">
                                    <Lock className="h-4 w-4 text-emerald-500" />
                                    Permisos Granulares (Pantallas)
                                </label>
                                <p className="text-[10px] text-slate-500 font-medium mb-4">
                                    Habilita pantallas específicas de forma individual. Los permisos activos se muestran con color.
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {AVAILABLE_SCREENS.map(screen => {
                                        const Icon = screen.icon;
                                        const hasAccess = form.permisosEspeciales.split(',').includes(screen.id);
                                        return (
                                            <button
                                                key={screen.id}
                                                type="button"
                                                onClick={() => togglePermiso(screen.id)}
                                                className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-[10px] font-bold border-2 transition-all duration-300 overflow-hidden group ${hasAccess
                                                    ? `${screen.bgColor} ${screen.borderColor} ${screen.textColor} shadow-lg`
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:shadow-md'
                                                    }`}
                                            >
                                                {/* Background gradient on active */}
                                                {hasAccess && (
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${screen.color} opacity-10`} />
                                                )}

                                                {/* Icon container */}
                                                <div className={`relative z-10 p-2 rounded-xl transition-all ${hasAccess
                                                    ? `bg-gradient-to-br ${screen.color} shadow-lg`
                                                    : 'bg-slate-100 group-hover:bg-slate-200'
                                                    }`}>
                                                    <Icon className={`h-5 w-5 ${hasAccess ? 'text-white' : 'text-slate-400'}`} />
                                                </div>

                                                {/* Label */}
                                                <span className="relative z-10 text-center leading-tight">
                                                    {screen.label}
                                                </span>

                                                {/* Active indicator */}
                                                {hasAccess && (
                                                    <div className="absolute top-2 right-2">
                                                        <CheckCircle2 className={`h-4 w-4 ${screen.textColor}`} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Quick actions */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, permisosEspeciales: AVAILABLE_SCREENS.map(s => s.id).join(',') }))}
                                        className="text-[10px] font-bold text-emerald-500 hover:text-teal-500 px-3 py-1.5 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all"
                                    >
                                        ✓ Seleccionar Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, permisosEspeciales: '' }))}
                                        className="text-[10px] font-bold text-red-600 hover:text-red-700 px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                                    >
                                        ✕ Quitar Todos
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-4 bg-teal-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-teal-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-teal-100 transition-all"
                                >
                                    {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                                    {editingUser ? "Actualizar" : "Activar Acceso"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
