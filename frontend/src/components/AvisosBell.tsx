'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, MessageSquare, AlertTriangle, AlertCircle, Info, Megaphone, Trash2 } from 'lucide-react';
import axios from 'axios';

interface Aviso {
    id: number;
    destinatarioId: number;
    titulo: string | null;
    contenido: string;
    prioridad: 'NORMAL' | 'ALTA' | 'CRITICA';
    mostrarModal: boolean;
    requiereConfirmacion: boolean;
    requiereRespuesta: boolean;
    enviadoAt: string;
    leidoAt: string | null;
    confirmadoAt: string | null;
    respondidoAt: string | null;
    estado: string;
    emisorNombre: string;
    imagenUrl?: string;
}

const RESPUESTAS_RAPIDAS = [
    'Leído',
    'Entendido',
    'A la orden',
    'En proceso',
    'Verifico'
];

export default function AvisosBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [avisos, setAvisos] = useState<Aviso[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedAviso, setSelectedAviso] = useState<Aviso | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [respuestaTexto, setRespuestaTexto] = useState('');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'DIRECTIVO';

    // Inicializar y polling
    useEffect(() => {
        audioRef.current = new Audio('/sounds/notification.mp3');
        audioRef.current.volume = 0.6;

        // Get user role
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                setUserRole(parsed.role || parsed.rol || '');
            } catch { }
        }

        loadAvisos();
        const interval = setInterval(loadAvisos, 5000);
        return () => clearInterval(interval);
    }, []);

    // Mostrar modal automático para avisos prioritarios
    useEffect(() => {
        const pendingCritical = avisos.find(
            a => !a.leidoAt && (a.prioridad === 'CRITICA' || a.prioridad === 'ALTA' || a.mostrarModal)
        );
        if (pendingCritical && !showModal) {
            setSelectedAviso(pendingCritical);
            setShowModal(true);
        }
    }, [avisos]);

    const loadAvisos = async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            return;
        }

        try {
            const [avisosRes, countRes] = await Promise.all([
                axios.get('/api/avisos/mis-avisos', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('/api/avisos/unread-count', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            const newCount = countRes.data.unreadCount || 0;

            // Reproducir sonido si hay nuevos
            if (newCount > unreadCount && soundEnabled && audioRef.current) {
                audioRef.current.play().catch(() => { });
            }

            setAvisos(avisosRes.data || []);
            setUnreadCount(newCount);
        } catch (error: any) {
            console.error('Error loading avisos:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                // silently stop
            }
        }
    };

    const marcarLeido = async (avisoId: number) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/avisos/${avisoId}/leido`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadAvisos();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    // Marcar todos como leídos cuando se abre el panel
    const marcarTodosLeidos = async () => {
        const noLeidos = avisos.filter(a => !a.leidoAt);
        if (noLeidos.length === 0) return;

        const token = localStorage.getItem('token');
        try {
            await Promise.all(
                noLeidos.map(aviso =>
                    axios.put(`/api/avisos/${aviso.id}/leido`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                )
            );
            setUnreadCount(0);
            loadAvisos();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const confirmarAviso = async (avisoId: number) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/avisos/${avisoId}/confirmar`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setSelectedAviso(null);
            loadAvisos();
        } catch (error) {
            console.error('Error confirming:', error);
        }
    };

    const responderAviso = async (avisoId: number, tipo: string, texto?: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/avisos/${avisoId}/responder`,
                { tipo, texto },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowModal(false);
            setSelectedAviso(null);
            setRespuestaTexto('');
            loadAvisos();
        } catch (error) {
            console.error('Error responding:', error);
        }
    };

    const eliminarAviso = async (avisoId: number, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        if (!confirm('¿Seguro que deseas eliminar este aviso?')) return;

        setDeletingId(avisoId);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/avisos/${avisoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // If we're viewing this aviso in modal, close modal
            if (selectedAviso?.id === avisoId) {
                setShowModal(false);
                setSelectedAviso(null);
            }
            loadAvisos();
        } catch (error) {
            console.error('Error deleting aviso:', error);
            alert('Error al eliminar el aviso. Puede que no tengas permisos.');
        } finally {
            setDeletingId(null);
        }
    };

    const getPrioridadIcon = (prioridad: string) => {
        switch (prioridad) {
            case 'CRITICA': return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'ALTA': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            default: return <Megaphone className="h-5 w-5 text-teal-500" />;
        }
    };

    const getPrioridadStyle = (prioridad: string) => {
        switch (prioridad) {
            case 'CRITICA': return 'border-l-4 border-red-500 bg-red-50';
            case 'ALTA': return 'border-l-4 border-amber-500 bg-amber-50';
            default: return 'border-l-4 border-teal-500 bg-teal-50/50';
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';

        const utcDateStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
        const date = new Date(utcDateStr);

        return new Intl.DateTimeFormat('es-PY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Asuncion'
        }).format(date);
    };

    return (
        <>
            {/* Bell Button */}
            <div className="relative">
                <motion.button
                    onClick={() => {
                        const willOpen = !isOpen;
                        setIsOpen(willOpen);
                        if (willOpen && unreadCount > 0) {
                            marcarTodosLeidos();
                        }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100 transition-all touch-manipulation"
                >
                    <Bell className="h-5 w-5 text-slate-600" />
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-teal-200"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                    )}
                </motion.button>
            </div>

            {/* Dropdown / Full-screen on mobile */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for mobile */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 sm:hidden"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="fixed inset-x-0 bottom-0 top-auto sm:absolute sm:inset-auto sm:right-0 sm:mt-3 sm:w-[420px] bg-white rounded-t-2xl sm:rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden z-50 max-h-[85vh] sm:max-h-[500px] flex flex-col"
                        >
                            {/* Header */}
                            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg sm:rounded-xl">
                                        <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black tracking-tight text-sm sm:text-base">AVISOS</h3>
                                        <p className="text-white/60 text-[10px] sm:text-xs font-medium">Centro de notificaciones</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors touch-manipulation"
                                >
                                    <X className="h-5 w-5 text-white/70 hover:text-white" />
                                </button>
                            </div>

                            {/* List - scrollable */}
                            <div className="flex-1 overflow-y-auto overscroll-contain">
                                {avisos.length === 0 ? (
                                    <div className="px-6 py-12 text-center">
                                        <div className="w-16 h-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <Bell className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-bold">Sin avisos pendientes</p>
                                        <p className="text-slate-300 text-sm mt-1">Estás al día</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {avisos.map((aviso) => (
                                            <motion.div
                                                key={aviso.id}
                                                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                                                onClick={() => {
                                                    setSelectedAviso(aviso);
                                                    setShowModal(true);
                                                    setIsOpen(false);
                                                    if (!aviso.leidoAt) marcarLeido(aviso.id);
                                                }}
                                                className={`px-4 sm:px-6 py-3 sm:py-4 cursor-pointer transition-all ${!aviso.leidoAt ? 'bg-teal-50/50' : ''
                                                    } ${getPrioridadStyle(aviso.prioridad)}`}
                                            >
                                                <div className="flex items-start gap-3 sm:gap-4">
                                                    <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 ${aviso.prioridad === 'CRITICA' ? 'bg-red-100' :
                                                        aviso.prioridad === 'ALTA' ? 'bg-amber-100' : 'bg-teal-100'
                                                        }`}>
                                                        {getPrioridadIcon(aviso.prioridad)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="font-bold text-sm text-slate-900 truncate">
                                                                {aviso.titulo || 'Aviso del Sistema'}
                                                            </p>
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                {!aviso.leidoAt && (
                                                                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                                                                )}
                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={(e) => eliminarAviso(aviso.id, e)}
                                                                        disabled={deletingId === aviso.id}
                                                                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all touch-manipulation"
                                                                        title="Eliminar aviso"
                                                                    >
                                                                        <Trash2 className={`h-3.5 w-3.5 ${deletingId === aviso.id ? 'animate-spin' : ''}`} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                                                            {aviso.contenido}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                                                {formatDate(aviso.enviadoAt)}
                                                            </span>
                                                            {aviso.confirmadoAt && (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase">
                                                                    <CheckCheck className="h-3 w-3" /> Confirmado
                                                                </span>
                                                            )}
                                                            {aviso.respondidoAt && !aviso.confirmadoAt && (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-teal-500 uppercase">
                                                                    <MessageSquare className="h-3 w-3" /> Respondido
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Mobile drag handle */}
                            <div className="sm:hidden flex justify-center py-2 flex-shrink-0">
                                <div className="w-10 h-1 bg-slate-200 rounded-full" />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Modal para aviso detallado */}
            <AnimatePresence>
                {showModal && selectedAviso && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => !selectedAviso.requiereConfirmacion && setShowModal(false)}
                            className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]"
                        />

                        <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-0 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                transition={{
                                    type: "spring",
                                    damping: 25,
                                    stiffness: 300
                                }}
                                className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] pointer-events-auto border-t-4 sm:border-4 border-white/50"
                                style={{ boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.4)' }}
                            >
                                {/* Mobile drag handle */}
                                <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
                                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                                </div>

                                {/* Modal Header */}
                                <div className={`px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-3 sm:gap-4 ${selectedAviso.prioridad === 'CRITICA' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                                    selectedAviso.prioridad === 'ALTA' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                                        'bg-gradient-to-r from-teal-500 to-emerald-500'
                                    }`}>
                                    <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                                        {selectedAviso.prioridad === 'CRITICA' ? <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" /> :
                                            selectedAviso.prioridad === 'ALTA' ? <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" /> :
                                                <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-white font-black text-base sm:text-lg tracking-tight truncate">
                                            {selectedAviso.titulo || 'Aviso del Sistema'}
                                        </h2>
                                        <p className="text-white/80 text-xs sm:text-sm font-medium">De: {selectedAviso.emisorNombre}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {isAdmin && (
                                            <button
                                                onClick={() => eliminarAviso(selectedAviso.id)}
                                                disabled={deletingId === selectedAviso.id}
                                                className="p-2 hover:bg-white/20 rounded-xl transition-colors touch-manipulation"
                                                title="Eliminar aviso"
                                            >
                                                <Trash2 className={`h-5 w-5 text-white/80 hover:text-white ${deletingId === selectedAviso.id ? 'animate-spin' : ''}`} />
                                            </button>
                                        )}
                                        {!selectedAviso.requiereConfirmacion && (
                                            <button
                                                onClick={() => setShowModal(false)}
                                                className="p-2 hover:bg-white/20 rounded-xl transition-colors touch-manipulation"
                                            >
                                                <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Body */}
                                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-slate-50/50">
                                    {selectedAviso.imagenUrl && (
                                        <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl overflow-hidden shadow-md border-2 sm:border-4 border-white">
                                            <img
                                                src={selectedAviso.imagenUrl}
                                                alt="Aviso visual"
                                                className="w-full h-auto object-cover max-h-[40vh] sm:max-h-[60vh] bg-slate-100"
                                            />
                                        </div>
                                    )}

                                    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
                                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-[15px]">
                                            {selectedAviso.contenido}
                                        </p>
                                    </div>

                                    <p className="text-xs text-slate-400 mt-3 sm:mt-4 text-center font-medium">
                                        Enviado: {formatDate(selectedAviso.enviadoAt)}
                                    </p>
                                </div>

                                {/* Modal Actions */}
                                <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-slate-100 bg-white space-y-3 sm:space-y-4 flex-shrink-0">
                                    {selectedAviso.requiereRespuesta && !selectedAviso.respondidoAt && (
                                        <>
                                            <p className="text-sm font-bold text-slate-700">
                                                Respondé el mensaje:
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                {RESPUESTAS_RAPIDAS.map((resp) => (
                                                    <motion.button
                                                        key={resp}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => responderAviso(selectedAviso.id, resp)}
                                                        className="px-3 sm:px-4 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-500 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 transition-colors border border-transparent hover:border-teal-200 touch-manipulation"
                                                    >
                                                        {resp}
                                                    </motion.button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 mt-2 sm:mt-3">
                                                <input
                                                    type="text"
                                                    value={respuestaTexto}
                                                    onChange={(e) => setRespuestaTexto(e.target.value)}
                                                    placeholder="O escribí una respuesta..."
                                                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-slate-400 font-medium"
                                                />
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => responderAviso(selectedAviso.id, 'texto_libre', respuestaTexto)}
                                                    disabled={!respuestaTexto.trim()}
                                                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-200 transition-all touch-manipulation"
                                                >
                                                    Enviar
                                                </motion.button>
                                            </div>
                                        </>
                                    )}

                                    {selectedAviso.requiereConfirmacion && !selectedAviso.confirmadoAt && (
                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => confirmarAviso(selectedAviso.id)}
                                            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-teal-200 hover:shadow-2xl hover:shadow-teal-300 transition-all touch-manipulation"
                                        >
                                            <Check className="h-5 w-5 inline mr-2" />
                                            Cerrar
                                        </motion.button>
                                    )}

                                    {!selectedAviso.requiereConfirmacion && !selectedAviso.requiereRespuesta && (
                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowModal(false)}
                                            className="w-full py-3.5 sm:py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl sm:rounded-2xl font-bold transition-colors touch-manipulation"
                                        >
                                            Cerrar
                                        </motion.button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
