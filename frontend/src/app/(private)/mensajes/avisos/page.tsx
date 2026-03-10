'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Bell,
    Filter,
    Users,
    User,
    AlertTriangle,
    CheckCircle,
    BarChart2,
    Search,
    X,
    Megaphone,
    Sparkles,
    Check,
    AlertCircle,
    Info,
    Trash2,
    RefreshCw,
    Eye,
    PauseCircle,
    PlayCircle,
    ChevronRight,
    Image,
    Upload
} from 'lucide-react';
import axios from 'axios';

interface Aviso {
    id: number;
    titulo: string;
    contenido: string;
    tipo: 'MASIVO' | 'INDIVIDUAL' | 'POR_FILTRO';
    prioridad: 'NORMAL' | 'ALTA' | 'CRITICA';
    createdAt: string;
    emisorNombre: string;
    estadoGeneral: string;
    imagenUrl?: string;
}

interface UserResult {
    id: number | null;
    idSocio?: number;
    nombreCompleto: string;
    cedula?: string;
    username?: string;
}

export default function AdminAvisosPage() {
    const [activeTab, setActiveTab] = useState<'crear' | 'historial'>('crear');
    const [avisos, setAvisos] = useState<Aviso[]>([]);

    // Form State
    const [tipo, setTipo] = useState<'MASIVO' | 'INDIVIDUAL' | 'POR_FILTRO'>('MASIVO');
    const [prioridad, setPrioridad] = useState<'NORMAL' | 'ALTA' | 'CRITICA'>('NORMAL');
    const [titulo, setTitulo] = useState('');
    const [contenido, setContenido] = useState('');
    const [mostrarModal, setMostrarModal] = useState(false);
    const [requiereConfirmacion, setRequiereConfirmacion] = useState(false);
    const [requiereRespuesta, setRequiereRespuesta] = useState(false);

    // Filtros
    const [filtroRol, setFiltroRol] = useState('');

    // Individual Search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Image upload state
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Confirm Modal
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: 'cancel' | 'delete' | 'resend' | 'activate' | null;
        avisoId: number | null;
        isProcessing: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        avisoId: null,
        isProcessing: false
    });

    // Initial Load
    useEffect(() => {
        if (activeTab === 'historial') {
            loadAvisos();
        }
    }, [activeTab]);

    // Search Users
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 1 && !selectedUser) {
                setIsSearching(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`/api/usuarios/unificados?term=${searchTerm}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSearchResults(res.data);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedUser]);

    const loadAvisos = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/avisos', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvisos(res.data);
        } catch (error) {
            console.error('Error loading avisos:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!titulo || !contenido) return;
        if (tipo === 'INDIVIDUAL' && !selectedUser) return;

        setIsSending(true);
        try {
            const token = localStorage.getItem('token');

            // Step 1: Upload image if exists
            let uploadedImageUrl: string | null = null;
            if (imagenFile) {
                setIsUploadingImage(true);
                const formData = new FormData();
                formData.append('file', imagenFile);

                const uploadRes = await axios.post('/api/avisos/upload-imagen', formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });

                if (uploadRes.data.success) {
                    uploadedImageUrl = uploadRes.data.imagenUrl;
                }
                setIsUploadingImage(false);
            }

            // Step 2: Create aviso with image URL
            const payload: any = {
                tipo,
                prioridad,
                titulo,
                contenido,
                mostrarModal,
                requiereConfirmacion,
                requiereRespuesta,
                imagenUrl: uploadedImageUrl
            };

            if (tipo === 'INDIVIDUAL') {
                if (!selectedUser?.id) {
                    alert("Este socio no es un usuario del sistema (ID nulo). No se le puede enviar aviso.");
                    setIsSending(false);
                    return;
                }
                payload.usuarioId = selectedUser.id;
            } else if (tipo === 'POR_FILTRO') {
                if (filtroRol) payload.filtroRol = filtroRol;
            }

            const res = await axios.post('/api/avisos', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                // Show custom success modal
                setSuccessMessage(`Aviso enviado exitosamente a ${res.data.destinatarios} usuarios.`);
                setShowSuccessModal(true);

                // Reset form
                setTitulo('');
                setContenido('');
                setSelectedUser(null);
                setSearchTerm('');
                setImagenFile(null);
                setImagenPreview(null);
            }
        } catch (error) {
            console.error('Error creating aviso:', error);
            alert('Error al enviar el aviso');
        } finally {
            setIsSending(false);
            setIsUploadingImage(false);
        }
    };

    const requestCancel = (id: number) => setConfirmModal({
        isOpen: true,
        title: 'Desactivar Aviso',
        message: '¿Deseas desactivar este aviso? Los usuarios ya no lo verán en su centro de notificaciones.',
        action: 'cancel',
        avisoId: id,
        isProcessing: false
    });

    const requestDelete = (id: number) => setConfirmModal({
        isOpen: true,
        title: 'Eliminar Aviso',
        message: '¿Seguro que deseas eliminar este aviso permanentemente? Esta acción es irreversible.',
        action: 'delete',
        avisoId: id,
        isProcessing: false
    });

    const requestResend = (id: number) => setConfirmModal({
        isOpen: true,
        title: 'Reenviar Aviso',
        message: '¿Deseas reenviar este aviso? Se creará una copia y se enviará nuevamente a todos los destinatarios.',
        action: 'resend',
        avisoId: id,
        isProcessing: false
    });

    const executeConfirmAction = async () => {
        if (!confirmModal.avisoId || !confirmModal.action) return;

        setConfirmModal(prev => ({ ...prev, isProcessing: true }));
        try {
            const token = localStorage.getItem('token');
            const id = confirmModal.avisoId;

            if (confirmModal.action === 'cancel') {
                await axios.put(`/api/avisos/${id}/cancelar`, {}, { headers: { Authorization: `Bearer ${token}` } });
                loadAvisos();
            } else if (confirmModal.action === 'activate') {
                await axios.put(`/api/avisos/${id}/activar`, {}, { headers: { Authorization: `Bearer ${token}` } });
                loadAvisos();
            } else if (confirmModal.action === 'delete') {
                await axios.delete(`/api/avisos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                loadAvisos();
            } else if (confirmModal.action === 'resend') {
                const res = await axios.post(`/api/avisos/${id}/reenviar`, {}, { headers: { Authorization: `Bearer ${token}` } });
                if (res.data.success) {
                    setSuccessMessage(`Aviso reenviado exitosamente a ${res.data.destinatarios} usuarios.`);
                    setShowSuccessModal(true);
                    loadAvisos();
                }
            }
        } catch (error) {
            console.error(error);
            // Ignore for clean UX, or implement a clean error toast.
        } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false, isProcessing: false }));
        }
    };

    const handleActivate = async (id: number) => {
        // Here we could also use a confirm modal, but keeping it direct or using modal?
        // Wait, the user wants no web confirm(). Let's use the modal!
        setConfirmModal({
            isOpen: true,
            title: 'Activar Aviso',
            message: '¿Deseas activar nuevamente este aviso para los usuarios?',
            action: 'activate',
            avisoId: id,
            isProcessing: false
        });
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagenFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagenPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImagenFile(null);
        setImagenPreview(null);
    };

    const priorities = {
        NORMAL: { color: 'bg-emerald-500', label: 'Normal', icon: Info },
        ALTA: { color: 'bg-amber-500', label: 'Alta', icon: AlertTriangle },
        CRITICA: { color: 'bg-red-500', label: 'Crítica', icon: AlertCircle },
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Megaphone className="h-64 w-64 text-white transform rotate-12" />
                </div>
                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mb-2"
                    >
                        <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider border border-white/20">
                            Panel Administrativo
                        </span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight"
                    >
                        Gestión de <span className="text-emerald-100">Comunicación</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-emerald-50 text-lg max-w-2xl"
                    >
                        Redactá y enviá avisos oficiales a socios y operadores. Gestioná prioridades, confirmaciones de lectura y respuestas rápidas.
                    </motion.p>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex justify-center">
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex relative">
                    {['crear', 'historial'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`relative px-8 py-3 rounded-xl text-sm font-bold transition-colors z-10 ${activeTab === tab
                                ? 'text-slate-900'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white shadow-md rounded-xl border border-slate-100"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-20 flex items-center gap-2">
                                {tab === 'crear' ? <Send className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
                                {tab === 'crear' ? 'Redactar Aviso' : 'Historial de Envíos'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'crear' ? (
                    <motion.div
                        key="crear"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Card: Tipo de Envío */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-purple-500" />
                                    1. Seleccioná el Alcance
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Masivo General */}
                                    <div
                                        onClick={() => setTipo('MASIVO')}
                                        className={`relative cursor-pointer group p-6 rounded-2xl border-2 transition-all duration-300 ${tipo === 'MASIVO'
                                            ? 'border-emerald-500 bg-emerald-50/50'
                                            : 'border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className={`h-12 w-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${tipo === 'MASIVO' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 text-slate-500'}`}>
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <h4 className={`font-bold text-lg mb-1 ${tipo === 'MASIVO' ? 'text-slate-900' : 'text-slate-600'}`}>
                                            Masivo Generál
                                        </h4>
                                        <p className="text-sm text-slate-500">
                                            Enviar a toda la base de usuarios activos del sistema.
                                        </p>
                                        <div className="mt-2 p-2 bg-emerald-100/50 rounded-lg text-[10px] font-bold text-emerald-700 uppercase">
                                            Solo usuarios registrados
                                        </div>
                                        {tipo === 'MASIVO' && (
                                            <motion.div
                                                layoutId="check"
                                                className="absolute top-4 right-4 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-white"
                                            >
                                                <Check className="h-4 w-4" />
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Por Filtro */}
                                    <div
                                        onClick={() => setTipo('POR_FILTRO')}
                                        className={`relative cursor-pointer group p-6 rounded-2xl border-2 transition-all duration-300 ${tipo === 'POR_FILTRO'
                                            ? 'border-blue-500 bg-blue-50/50'
                                            : 'border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className={`h-12 w-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${tipo === 'POR_FILTRO' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-500'}`}>
                                            <Filter className="h-6 w-6" />
                                        </div>
                                        <h4 className={`font-bold text-lg mb-1 ${tipo === 'POR_FILTRO' ? 'text-slate-900' : 'text-slate-600'}`}>
                                            Por Filtro
                                        </h4>
                                        <p className="text-sm text-slate-500">
                                            Segmentar por Rol (Directivos, Operadores, Socios).
                                        </p>
                                        {tipo === 'POR_FILTRO' && (
                                            <motion.div
                                                layoutId="check"
                                                className="absolute top-4 right-4 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white"
                                            >
                                                <Check className="h-4 w-4" />
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Individual */}
                                    <div
                                        onClick={() => setTipo('INDIVIDUAL')}
                                        className={`relative cursor-pointer group p-6 rounded-2xl border-2 transition-all duration-300 ${tipo === 'INDIVIDUAL'
                                            ? 'border-violet-500 bg-violet-50/50'
                                            : 'border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className={`h-12 w-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${tipo === 'INDIVIDUAL' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30' : 'bg-slate-100 text-slate-500'}`}>
                                            <User className="h-6 w-6" />
                                        </div>
                                        <h4 className={`font-bold text-lg mb-1 ${tipo === 'INDIVIDUAL' ? 'text-slate-900' : 'text-slate-600'}`}>
                                            Individual
                                        </h4>
                                        <p className="text-sm text-slate-500">
                                            Mensaje directo a un usuario específico.
                                        </p>
                                        {tipo === 'INDIVIDUAL' && (
                                            <motion.div
                                                layoutId="check"
                                                className="absolute top-4 right-4 h-6 w-6 rounded-full bg-violet-500 flex items-center justify-center text-white"
                                            >
                                                <Check className="h-4 w-4" />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Filters */}
                                <AnimatePresence>
                                    {tipo !== 'MASIVO' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-8 mt-4 border-t border-slate-100">
                                                {tipo === 'INDIVIDUAL' && (
                                                    <div className="max-w-xl">
                                                        <label className="block text-sm font-bold text-slate-700 mb-2">Buscar Usuario</label>
                                                        <div className="relative">
                                                            {selectedUser ? (
                                                                <motion.div
                                                                    initial={{ scale: 0.95, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    className="flex items-center justify-between p-4 bg-violet-50 border border-violet-200 rounded-xl"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="h-10 w-10 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center font-bold text-lg">
                                                                            {selectedUser.nombreCompleto.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-violet-900">{selectedUser.nombreCompleto}</p>
                                                                            <p className="text-sm text-violet-600">CI: {selectedUser.cedula}</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setSelectedUser(null)}
                                                                        className="p-2 hover:bg-violet-200 rounded-lg transition-colors"
                                                                    >
                                                                        <X className="h-5 w-5 text-violet-600" />
                                                                    </button>
                                                                </motion.div>
                                                            ) : (
                                                                <>
                                                                    <div className="relative group">
                                                                        <input
                                                                            type="text"
                                                                            value={searchTerm}
                                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                                            placeholder="Buscar por Nombre, Céndula o Usuario..."
                                                                            className="w-full pl-12 pr-10 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none transition-all font-bold text-lg text-slate-800 placeholder:text-slate-400 backdrop-blur-sm"
                                                                        />
                                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-violet-500" />
                                                                        {isSearching && (
                                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                                                <div className="h-5 w-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}

                                                            <AnimatePresence>
                                                                {searchResults.length > 0 ? (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0 }}
                                                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-20"
                                                                    >
                                                                        {searchResults.map((u, i) => (
                                                                            <motion.div
                                                                                key={u.id || i}
                                                                                initial={{ opacity: 0, x: -10 }}
                                                                                animate={{ opacity: 1, x: 0 }}
                                                                                transition={{ delay: i * 0.05 }}
                                                                                onClick={() => { setSelectedUser(u); setSearchResults([]); setSearchTerm(''); }}
                                                                                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                                                            >
                                                                                <div>
                                                                                    <p className="font-bold text-sm text-slate-900">{u.nombreCompleto}</p>
                                                                                    <p className="text-xs font-medium text-violet-600">
                                                                                        {u.cedula ? `CI: ${u.cedula}` : `Usuario: ${u.username || 'N/A'}`}
                                                                                    </p>
                                                                                </div>
                                                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                                                                            </motion.div>
                                                                        ))}
                                                                    </motion.div>
                                                                ) : searchTerm.length >= 1 && !isSearching && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0 }}
                                                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-20 text-center"
                                                                    >
                                                                        <p className="text-slate-500 text-sm">No se encontraron usuarios</p>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                )}
                                                {tipo === 'POR_FILTRO' && (
                                                    <div className="max-w-xl">
                                                        <label className="block text-sm font-bold text-slate-700 mb-2">Seleccionar Rol</label>
                                                        <select
                                                            value={filtroRol}
                                                            onChange={(e) => setFiltroRol(e.target.value)}
                                                            className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none transition-all font-medium text-slate-900 appearance-none"
                                                        >
                                                            <option value="" className="bg-white text-slate-900">Todos los roles</option>
                                                            <option value="DIRECTIVO" className="bg-white text-slate-900">Directivo</option>
                                                            <option value="OPERADOR" className="bg-white text-slate-900">Operador</option>
                                                            <option value="USUARIO_SOCIO" className="bg-white text-slate-900">Socio</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Card: Contenido */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <Megaphone className="h-5 w-5 text-emerald-500" />
                                        2. Componé tu Mensaje
                                    </h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Título</label>
                                            <input
                                                type="text"
                                                value={titulo}
                                                onChange={(e) => setTitulo(e.target.value)}
                                                placeholder="Ingresá un título para el aviso..."
                                                className="w-full px-4 py-3 text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <textarea
                                                rows={8}
                                                value={contenido}
                                                onChange={(e) => setContenido(e.target.value)}
                                                placeholder="Escribí el contenido detallado aquí..."
                                                className="w-full p-4 bg-slate-50 border-0 rounded-2xl text-lg text-slate-600 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 resize-none"
                                            />
                                        </div>

                                        {/* Image Upload Section */}
                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                <Image className="h-4 w-4 text-emerald-500" />
                                                Imagen Adjunta (Opcional)
                                            </label>

                                            {imagenPreview ? (
                                                <div className="relative group">
                                                    <img
                                                        src={imagenPreview}
                                                        alt="Preview"
                                                        className="max-h-64 rounded-xl border-2 border-emerald-200 shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={removeImage}
                                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                                        <p className="mb-1 text-sm text-slate-500"><span className="font-semibold">Click para seleccionar</span></p>
                                                        <p className="text-xs text-slate-400">PNG, JPG hasta 5MB</p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageSelect}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}

                                            {isUploadingImage && (
                                                <div className="mt-2 flex items-center gap-2 text-emerald-600">
                                                    <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-sm font-medium">Subiendo imagen...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Configuración */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Configuración</h3>

                                        <div className="space-y-6">
                                            {/* Prioridad */}
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-3">Prioridad</label>
                                                <div className="flex gap-2">
                                                    {/* Normal */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setPrioridad('NORMAL')}
                                                        className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${prioridad === 'NORMAL'
                                                            ? 'border-emerald-500 bg-emerald-50 text-slate-900'
                                                            : 'border-slate-100 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {prioridad === 'NORMAL' && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-1">
                                                                <Info className="h-5 w-5 text-emerald-500" />
                                                            </motion.div>
                                                        )}
                                                        <span className="text-xs font-bold">Normal</span>
                                                    </button>

                                                    {/* Alta */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setPrioridad('ALTA')}
                                                        className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${prioridad === 'ALTA'
                                                            ? 'border-amber-500 bg-amber-50 text-slate-900'
                                                            : 'border-slate-100 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {prioridad === 'ALTA' && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-1">
                                                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                                            </motion.div>
                                                        )}
                                                        <span className="text-xs font-bold">Alta</span>
                                                    </button>

                                                    {/* Crítica */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setPrioridad('CRITICA')}
                                                        className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${prioridad === 'CRITICA'
                                                            ? 'border-red-500 bg-red-50 text-slate-900'
                                                            : 'border-slate-100 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {prioridad === 'CRITICA' && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-1">
                                                                <AlertCircle className="h-5 w-5 text-red-500" />
                                                            </motion.div>
                                                        )}
                                                        <span className="text-xs font-bold">Crítica</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Toggles */}
                                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                                {[
                                                    { label: 'Mostrar Popup (Modal)', desc: 'Interrumpe la navegación del usuario', checked: mostrarModal, set: setMostrarModal },
                                                    { label: 'Requerir Confirmación', desc: 'Obliga a dar clic en "Entendido"', checked: requiereConfirmacion, set: setRequiereConfirmacion },
                                                    { label: 'Permitir Respuesta', desc: 'Habilita chat rápido en el aviso', checked: requiereRespuesta, set: setRequiereRespuesta }
                                                ].map((opt, i) => (
                                                    <label key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                                        <div className="relative flex items-center mt-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={opt.checked}
                                                                onChange={(e) => opt.set(e.target.checked)}
                                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-emerald-500 checked:bg-emerald-500 hover:border-emerald-400"
                                                            />
                                                            <Check className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700 text-sm">{opt.label}</p>
                                                            <p className="text-xs text-slate-400 leading-tight">{opt.desc}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <motion.button
                                        type="submit"
                                        disabled={!titulo || !contenido || isSending}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl font-black text-xl shadow-xl shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out skew-y-12" />
                                        {isSending ? (
                                            <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="h-6 w-6" />
                                                <span>Enviar Aviso</span>
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="historial"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
                    >
                        {/* Custom Table Component */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        {['Aviso Detalles', 'Destinatarios', 'Fecha /Hora', 'Estado', 'Acciones'].map((h) => (
                                            <th key={h} className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {avisos.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-slate-400">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                        <Bell className="h-8 w-8 text-slate-300" />
                                                    </div>
                                                    <p>Aún no hay avisos enviados</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        avisos.map((aviso, i) => (
                                            <motion.tr
                                                key={aviso.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="hover:bg-slate-50 transition-colors group"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${aviso.prioridad === 'CRITICA' ? 'bg-red-500' : aviso.prioridad === 'ALTA' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-lg mb-1">{aviso.titulo}</div>
                                                            {aviso.imagenUrl && (
                                                                <img
                                                                    src={aviso.imagenUrl}
                                                                    alt="Imagen adjunta"
                                                                    className="max-h-32 rounded-lg mb-2 border border-slate-200 shadow-sm"
                                                                />
                                                            )}
                                                            <div className="text-sm text-slate-500 line-clamp-2 max-w-md">{aviso.contenido}</div>
                                                            <div className="flex gap-2 mt-3">
                                                                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold tracking-tight">
                                                                    {aviso.tipo}
                                                                </span>
                                                                {aviso.prioridad !== 'NORMAL' && (
                                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-tight ${aviso.prioridad === 'CRITICA' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                        {aviso.prioridad}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center -space-x-2">
                                                        {/* Mock users avatars */}
                                                        {[1, 2, 3].map((u) => (
                                                            <div key={u} className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white" />
                                                        ))}
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-500 font-bold">
                                                            +
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700">{new Date(aviso.createdAt).toLocaleDateString('es-PY')}</span>
                                                        <span className="text-xs text-slate-400">{new Date(aviso.createdAt).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm ${aviso.estadoGeneral === 'CANCELADO' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-teal-500'
                                                            }`}>
                                                            {aviso.estadoGeneral === 'CANCELADO' ? (
                                                                <>
                                                                    <PauseCircle className="h-4 w-4" /> Desactivado
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle className="h-4 w-4" /> Activo
                                                                </>
                                                            )}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 mt-1 font-medium ml-3">
                                                            Público: {aviso.tipo}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {/* Reenviar */}
                                                        <button
                                                            onClick={() => requestResend(aviso.id)}
                                                            className="p-2.5 hover:bg-teal-50 hover:text-teal-600 rounded-xl text-slate-400 transition-all transform hover:-translate-y-1"
                                                            title="Reenviar aviso"
                                                        >
                                                            <RefreshCw className="h-5 w-5" />
                                                        </button>

                                                        {/* Desactivar / Activar */}
                                                        {aviso.estadoGeneral === 'CANCELADO' ? (
                                                            <button
                                                                onClick={() => handleActivate(aviso.id)}
                                                                className="p-2.5 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl text-slate-400 transition-all transform hover:-translate-y-1"
                                                                title="Activar de nuevo"
                                                            >
                                                                <PlayCircle className="h-5 w-5" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => requestCancel(aviso.id)}
                                                                className="p-2.5 hover:bg-amber-50 hover:text-amber-600 rounded-xl text-slate-400 transition-all transform hover:-translate-y-1"
                                                                title="Desactivar"
                                                            >
                                                                <PauseCircle className="h-5 w-5" />
                                                            </button>
                                                        )}

                                                        {/* Eliminar */}
                                                        <button
                                                            onClick={() => requestDelete(aviso.id)}
                                                            className="p-2.5 hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 transition-all transform hover:-translate-y-1"
                                                            title="Eliminar permanentemente"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative"
                        >
                            {/* Decoración de fondo */}
                            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-10" />
                            <div className="absolute -top-10 -right-10 h-32 w-32 bg-emerald-500/20 rounded-full blur-2xl" />

                            <div className="p-8 text-center relative z-10">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                                    className="mx-auto h-20 w-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6"
                                >
                                    <Check className="h-10 w-10 text-white stroke-[3]" />
                                </motion.div>

                                <h3 className="text-2xl font-black text-slate-800 mb-2">
                                    ¡Envío Exitoso!
                                </h3>

                                <p className="text-slate-500 leading-relaxed mb-8">
                                    {successMessage}
                                </p>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        setActiveTab('historial');
                                    }}
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all"
                                >
                                    Excelente, continuar
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Confirm Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative"
                        >
                            <div className="p-6">
                                <div className={`mx-auto h-16 w-16 mb-5 rounded-full flex items-center justify-center shadow-lg ${confirmModal.action === 'delete' ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/30' :
                                        confirmModal.action === 'cancel' ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30' :
                                            confirmModal.action === 'activate' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30' :
                                                'bg-gradient-to-br from-teal-400 to-emerald-600 shadow-teal-500/30'
                                    }`}>
                                    {confirmModal.action === 'delete' ? (
                                        <Trash2 className="h-8 w-8 text-white" />
                                    ) : confirmModal.action === 'cancel' ? (
                                        <PauseCircle className="h-8 w-8 text-white" />
                                    ) : confirmModal.action === 'activate' ? (
                                        <PlayCircle className="h-8 w-8 text-white" />
                                    ) : (
                                        <RefreshCw className="h-8 w-8 text-white" />
                                    )}
                                </div>
                                <h3 className="text-xl font-black text-slate-800 text-center mb-2">
                                    {confirmModal.title}
                                </h3>
                                <p className="text-slate-500 text-center text-sm leading-relaxed mb-8">
                                    {confirmModal.message}
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        disabled={confirmModal.isProcessing}
                                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                        className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        disabled={confirmModal.isProcessing}
                                        onClick={executeConfirmAction}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${confirmModal.action === 'delete' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' :
                                                confirmModal.action === 'cancel' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' :
                                                    confirmModal.action === 'activate' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' :
                                                        'bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-teal-500/20'
                                            }`}
                                    >
                                        {confirmModal.isProcessing ? (
                                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            'Confirmar'
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
