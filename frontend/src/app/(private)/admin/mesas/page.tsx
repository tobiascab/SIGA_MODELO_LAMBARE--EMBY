"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutGrid,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Users,
    MapPin,
    Hash,
    AlignLeft,
    CheckCircle,
    XCircle,
    Search,
    RefreshCw
} from "lucide-react";
import { toast, Toaster } from "sonner";

// Types
interface Sucursal {
    id: number;
    nombre: string;
    codigo: string;
}

interface Usuario {
    id: number;
    nombreCompleto: string;
    username: string;
}

interface Mesa {
    id: number;
    numero: number;
    descripcion: string;
    tipo: "RANGO" | "SOLO_VOZ" | "ESPECIAL" | "INCIDENCIA";
    rangoDesde?: number;
    rangoHasta?: number;
    ubicacion?: string;
    activa: boolean;
    sucursal?: Sucursal;
    encargados: Usuario[];
}

export default function MesasPage() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMesa, setEditingMesa] = useState<Mesa | null>(null);

    // Modal Form State
    const [formData, setFormData] = useState({
        numero: 1,
        descripcion: "",
        tipo: "RANGO",
        rangoDesde: "",
        rangoHasta: "",
        ubicacion: "",
        activa: true,
        sucursalId: "",
        encargadosIds: [] as number[],
    });

    // User Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Usuario[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Usuario[]>([]);

    const fetchMesas = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/mesas", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMesas(data);
            }
        } catch (e) {
            console.error(e);
            toast.error("Error al cargar mesas");
        }
    }, []);

    const fetchSucursales = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/sucursales", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSucursales(data);
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const searchUsers = useCallback(async (term: string) => {
        if (term.length < 3) return;
        try {
            const token = localStorage.getItem("token");
            // Usamos un endpoint existente de búsqueda de usuarios o creamos uno ad-hoc
            // Asumimos que existe api/usuarios/buscar o filtramos de una lista total si son pocos
            const res = await fetch(`/api/usuarios/buscar?q=${term}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Si no existe tal endpoint, podemos usar el de admins/responsables
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            } else {
                // Fallback: usar el de responsables que lista todos
                const resAll = await fetch(`/api/asignaciones/admin/responsables`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (resAll.ok) {
                    const allData: any[] = await resAll.json();
                    setSearchResults(allData.filter(u =>
                        u.responsable.toLowerCase().includes(term.toLowerCase()) ||
                        u.responsableUser.toLowerCase().includes(term.toLowerCase())
                    ).map(u => ({
                        id: u.idUsuario,
                        nombreCompleto: u.responsable,
                        username: u.responsableUser
                    })));
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        Promise.all([fetchMesas(), fetchSucursales()]).then(() => setLoading(false));
    }, [fetchMesas, fetchSucursales]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm) searchUsers(searchTerm);
            else setSearchResults([]);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, searchUsers]);

    const handleOpenModal = (mesa?: Mesa) => {
        if (mesa) {
            setEditingMesa(mesa);
            setFormData({
                numero: mesa.numero,
                descripcion: mesa.descripcion || "",
                tipo: mesa.tipo,
                rangoDesde: mesa.rangoDesde?.toString() || "",
                rangoHasta: mesa.rangoHasta?.toString() || "",
                ubicacion: mesa.ubicacion || "",
                activa: mesa.activa,
                sucursalId: mesa.sucursal?.id.toString() || "",
                encargadosIds: mesa.encargados.map(u => u.id),
            });
            setSelectedUsers(mesa.encargados);
        } else {
            setEditingMesa(null);
            setFormData({
                numero: mesas.length + 1,
                descripcion: "",
                tipo: "RANGO",
                rangoDesde: "",
                rangoHasta: "",
                ubicacion: "",
                activa: true,
                sucursalId: "",
                encargadosIds: [],
            });
            setSelectedUsers([]);
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem("token");
            const payload = {
                ...formData,
                rangoDesde: formData.rangoDesde ? parseInt(formData.rangoDesde) : null,
                rangoHasta: formData.rangoHasta ? parseInt(formData.rangoHasta) : null,
                sucursalId: formData.sucursalId ? parseInt(formData.sucursalId) : null,
                encargadosIds: selectedUsers.map(u => u.id)
            };

            const url = editingMesa ? `/api/mesas/${editingMesa.id}` : "/api/mesas";
            const method = editingMesa ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Error al guardar");

            toast.success(editingMesa ? "Mesa actualizada" : "Mesa creada");
            setModalOpen(false);
            fetchMesas();
        } catch (e) {
            toast.error("Error al guardar cambios");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Seguro que deseas eliminar esta mesa?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/mesas/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Mesa eliminada");
                fetchMesas();
            } else {
                toast.error("No se pudo eliminar");
            }
        } catch (e) {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 pt-8">
            <Toaster position="top-center" richColors />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <LayoutGrid className="h-8 w-8 text-emerald-500" />
                        Gestión de <span className="text-emerald-500">Mesas</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Configura las mesas de acreditación, rangos y responsables
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                    <Plus className="h-5 w-5" /> Nueva Mesa
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {mesas.map((mesa) => (
                        <motion.div
                            key={mesa.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black text-xl shadow-inner ${mesa.activa ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">Mesa</span>
                                    {mesa.numero}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-slate-800 text-lg">
                                            {mesa.descripcion || `Mesa ${mesa.numero}`}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${mesa.tipo === 'RANGO' ? 'bg-blue-100 text-blue-600' :
                                                mesa.tipo === 'SOLO_VOZ' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-purple-100 text-purple-600'
                                            }`}>
                                            {mesa.tipo}
                                        </span>
                                        {!mesa.activa && (
                                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest">
                                                Inactiva
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Hash className="h-4 w-4 text-slate-400" />
                                            {mesa.tipo === 'RANGO' ?
                                                <span>Rango: <strong>{mesa.rangoDesde || '?'}</strong> al <strong>{mesa.rangoHasta || '?'}</strong></span> :
                                                <span>Sin rango numérico</span>
                                            }
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            {mesa.ubicacion || mesa.sucursal?.nombre || 'Sin ubicación'}
                                        </div>
                                    </div>
                                    {mesa.encargados.length > 0 && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg inline-flex">
                                            <Users className="h-3 w-3 text-slate-400" />
                                            <span className="font-medium">Encargados:</span>
                                            {mesa.encargados.map(u => u.nombreCompleto.split(' ')[0]).join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                <button
                                    onClick={() => handleOpenModal(mesa)}
                                    className="flex-1 md:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit className="h-4 w-4" /> Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(mesa.id)}
                                    className="flex-1 md:flex-none px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    {editingMesa ? <Edit className="h-6 w-6 text-emerald-500" /> : <Plus className="h-6 w-6 text-emerald-500" />}
                                    {editingMesa ? `Editar Mesa ${editingMesa.numero}` : "Nueva Mesa"}
                                </h2>
                                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Número de Mesa</label>
                                        <input
                                            type="number"
                                            value={formData.numero}
                                            onChange={e => setFormData({ ...formData, numero: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Tipo</label>
                                        <select
                                            value={formData.tipo}
                                            onChange={e => setFormData({ ...formData, tipo: e.target.value as any })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none"
                                        >
                                            <option value="RANGO">Por Rango Numérico</option>
                                            <option value="SOLO_VOZ">Solo Voz (Especial)</option>
                                            <option value="ESPECIAL">Mesa Especial</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Descripción (Opcional)</label>
                                    <input
                                        type="text"
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                        placeholder="Ej: Mesa Principal"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Sucursal</label>
                                        <select
                                            value={formData.sucursalId}
                                            onChange={e => setFormData({ ...formData, sucursalId: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none"
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {sucursales.map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Ubicación Física</label>
                                        <input
                                            type="text"
                                            value={formData.ubicacion}
                                            onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
                                            placeholder="Ej: Planta Baja, Auditorio"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {formData.tipo === 'RANGO' && (
                                    <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2 block">Rango Desde</label>
                                            <input
                                                type="number"
                                                value={formData.rangoDesde}
                                                onChange={e => setFormData({ ...formData, rangoDesde: e.target.value })}
                                                placeholder="0"
                                                className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg font-bold text-slate-800 focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2 block">Rango Hasta</label>
                                            <input
                                                type="number"
                                                value={formData.rangoHasta}
                                                onChange={e => setFormData({ ...formData, rangoHasta: e.target.value })}
                                                placeholder="999999"
                                                className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg font-bold text-slate-800 focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block flex items-center justify-between">
                                        <span>Encargados de Mesa</span>
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400">{selectedUsers.length} seleccionados</span>
                                    </label>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {selectedUsers.map(user => (
                                            <div key={user.id} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                                                {user.nombreCompleto}
                                                <button onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))} className="hover:text-emerald-900">
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Buscar usuario para agregar..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:border-emerald-500 outline-none"
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-10 max-h-48 overflow-y-auto">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => {
                                                            if (!selectedUsers.find(u => u.id === user.id)) {
                                                                setSelectedUsers([...selectedUsers, user]);
                                                            }
                                                            setSearchTerm("");
                                                            setSearchResults([]);
                                                        }}
                                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col"
                                                    >
                                                        <span className="font-bold text-sm text-slate-700">{user.nombreCompleto}</span>
                                                        <span className="text-xs text-slate-400">@{user.username}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl">
                                    <input
                                        type="checkbox"
                                        checked={formData.activa}
                                        onChange={e => setFormData({ ...formData, activa: e.target.checked })}
                                        className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
                                        id="mesaActivaParams"
                                    />
                                    <label htmlFor="mesaActivaParams" className="font-bold text-slate-700 text-sm">Mesa Activa</label>
                                </div>

                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
                                >
                                    Guardar Mesa
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
