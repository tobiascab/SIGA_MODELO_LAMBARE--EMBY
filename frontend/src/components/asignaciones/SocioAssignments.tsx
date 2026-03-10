"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Loader2, ClipboardList, Trash2, Plus, Shield, CheckCircle2, UserPlus, Bell, X, Zap, MessageCircle } from "lucide-react";

interface Socio {
    id: number;
    numeroSocio: string;
    nombreCompleto: string;
    cedula: string;
    aporteAlDia: boolean;
    solidaridadAlDia: boolean;
    fondoAlDia: boolean;
    incoopAlDia: boolean;
    creditoAlDia: boolean;
    estadoVozVoto?: boolean;
    habilitadoVozVoto?: string;
    telefono?: string;
}

interface ListaAsignacion {
    id: number;
    nombre: string;
    descripcion: string;
    total: number;
    vyv: number;
    soloVoz: number;
}

interface SocioAssignmentsProps {
    misListas: ListaAsignacion[];
    selectedLista: ListaAsignacion | null;
    socios: Socio[];
    loadingSocios: boolean;
    socioSearchTerm: string;
    addingSocio: boolean;
    searchedSocio: Socio | null;
    showConfirmModal: boolean;
    searchType: string;
    onSelectLista: (lista: ListaAsignacion) => void;
    onCreateClick: () => void;
    onSearchSocio: () => void;
    onConfirmAddSocio: () => Promise<void> | void;
    onCancelAdd: () => void;
    onRemoveSocio: (socioId: number) => void;
    onSearchTermChange: (term: string) => void;
    onSearchTypeChange: (tipo: string) => void;
    tieneVozYVoto: (socio: Socio) => boolean;
    onDeleteLista?: (listaId: number) => void;
    onUpdateLista?: (listaId: number, nombre: string, descripcion: string) => void;
}

export function SocioAssignments({
    misListas,
    selectedLista,
    socios,
    loadingSocios,
    socioSearchTerm,
    addingSocio,
    searchedSocio,
    searchType,
    onSelectLista,
    onSearchSocio,
    onConfirmAddSocio,
    onCancelAdd,
    onRemoveSocio,
    onSearchTermChange,
    onSearchTypeChange,
    tieneVozYVoto,
}: SocioAssignmentsProps) {

    // Estado para notificación toast
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [isConfirming, setIsConfirming] = useState(false);
    const [justAdded, setJustAdded] = useState<string | null>(null);
    const [warningMessage, setWarningMessage] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            setCurrentUser(JSON.parse(stored));
        }
    }, []);

    const FEMALE_NAMES = new Set(['maria', 'ana', 'carmen', 'rosa', 'julia', 'laura', 'lucia', 'andrea', 'patricia', 'gabriela', 'sandra', 'monica', 'claudia', 'silvia', 'susana', 'veronica', 'adriana', 'elena', 'alicia', 'teresa', 'beatriz', 'lorena', 'carolina', 'liliana', 'alejandra', 'cecilia', 'marta', 'miriam', 'natalia', 'graciela', 'norma', 'irene', 'gladys', 'blanca', 'raquel', 'ruth', 'olga', 'esther', 'estela', 'dora', 'ester', 'martha', 'nilda', 'mirta', 'elsa', 'elvira', 'hilda', 'edith', 'celsa', 'juana', 'isabel', 'liz', 'luz', 'sol', 'eva', 'alba', 'perla', 'gloria', 'nancy', 'delia', 'ramona', 'lidia', 'victoria', 'celia', 'elba', 'stella', 'sara', 'lilian', 'sonia', 'emma', 'dora', 'nora', 'catalina', 'viviana', 'rocio', 'diana', 'paola', 'noemi', 'cristina', 'florencia', 'romina', 'valeria', 'yolanda', 'cinthia', 'jessica', 'vanessa', 'maribel', 'mariel', 'marlene', 'soledad', 'fatima', 'marcela', 'pamela', 'daniela', 'micaela', 'antonella', 'agustina', 'camila', 'sofia', 'valentina', 'martina', 'milagros', 'pilar', 'luciana', 'brenda', 'silvana', 'karina', 'margarita', 'francisca', 'antonia', 'josefina', 'magdalena', 'celeste', 'dahiana', 'daisy']);
    const isFemale = (name: string): boolean => {
        if (!name) return false;
        const parts = name.toLowerCase().trim().split(/[,\s]+/).filter(Boolean);
        const commaIdx = name.indexOf(',');
        let firstName = '';
        if (commaIdx > 0) {
            firstName = name.substring(commaIdx + 1).trim().split(/\s+/)[0].toLowerCase();
        } else {
            firstName = parts[0] || '';
        }
        firstName = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return FEMALE_NAMES.has(firstName);
    };

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

        const userNameParts = currentUser?.nombre?.split(' ') || currentUser?.nombreCompleto?.split(' ') || ['Asesor'];
        const userNameStr = userNameParts[0] + (userNameParts.length > 1 ? ' ' + userNameParts[userNameParts.length - 1] : '');

        const message = `¡Hola! Buenos días ${greeting} *${name}* 👋\n\nTe saluda *${userNameStr}* de la *Cooperativa Lambaré* ✅ para invitarte cordialmente a nuestra próxima asamblea institucional que será el día *sábado 21 de marzo de 2026*.\n\n¡Contamos con tu apoyo y participación! 🌟 Si tienes alguna duda, puedes responderme por este medio.`;

        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    };

    const handleConfirmClick = async () => {
        if (isConfirming) return;
        setIsConfirming(true);
        try {
            const socioName = searchedSocio?.nombreCompleto || 'Socio';
            await onConfirmAddSocio();
            // Solo mostrar éxito si onConfirmAddSocio NO lanzó error
            setJustAdded(socioName);
            setTimeout(() => setJustAdded(null), 3000);
        } catch {
            // Error ya manejado por el padre (modal de "Ya Asignado", etc.)
            // Mostrar mensaje motivacional inline (misma posición que "Agregado exitosamente")
            setTimeout(() => {
                setWarningMessage("⚡ ¡Intentá con otro socio! Sé más veloz 💪");
                setTimeout(() => setWarningMessage(null), 4000);
            }, 500);
        } finally {
            setIsConfirming(false);
        }
    };

    // Usar selectedLista para estadísticas (el padre selecciona la lista con más socios)
    // Fallback a la primera lista solo si no hay ninguna seleccionada
    const miLista = selectedLista || (misListas.length > 0 ? misListas[0] : null);

    // Mensajes amables rotativos
    const mensajesAmables = [
        "¡Hola! 👋 Te faltan {n} socios para alcanzar tu meta de 10. ¡Tú puedes!",
        "📊 Recordatorio amable: Con {n} socios más llegarás a la meta recomendada.",
        "🎯 ¡Sigue así! Solo necesitas agregar {n} socios más a tu lista.",
        "💪 ¡Casi llegas! Agrega {n} socios más para una distribución óptima.",
        "🌟 ¡Excelente trabajo! Solo faltan {n} socios para completar tu meta."
    ];

    // Notificación periódica amable (cada 2 minutos)
    useEffect(() => {
        if (!miLista || miLista.total >= 10) return;

        const interval = setInterval(() => {
            const faltantes = 10 - miLista.total;
            const mensajeRandom = mensajesAmables[Math.floor(Math.random() * mensajesAmables.length)];
            setToastMessage(mensajeRandom.replace("{n}", faltantes.toString()));
            setShowToast(true);

            // Auto-ocultar después de 8 segundos
            setTimeout(() => setShowToast(false), 8000);
        }, 120000); // 2 minutos

        // Mostrar primera notificación después de 30 segundos
        const initialTimeout = setTimeout(() => {
            if (miLista.total < 10) {
                const faltantes = 10 - miLista.total;
                setToastMessage(`¡Hola! 👋 Te recomendamos agregar ${faltantes} socios más para llegar a 10. ¡Tú puedes!`);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 8000);
            }
        }, 30000);

        return () => {
            clearInterval(interval);
            clearTimeout(initialTimeout);
        };
    }, [miLista?.total]);

    // Búsqueda automática (Debounce) - Requiere mínimo 3 caracteres
    useEffect(() => {
        const timer = setTimeout(() => {
            // Requiere mínimo 3 caracteres para evitar búsquedas prematuras
            if (socioSearchTerm.length >= 3) {
                onSearchSocio();
            }
        }, 800); // 800ms de debounce para evitar búsquedas mientras escribe lento
        return () => clearTimeout(timer);
    }, [socioSearchTerm]);

    // Auto-selección de la primera lista solo si no hay una seleccionada
    useEffect(() => {
        if (misListas.length > 0 && !selectedLista) {
            // Seleccionar la lista con más socios
            const listaConMasSocios = misListas.reduce((prev, curr) =>
                (curr.total || 0) > (prev.total || 0) ? curr : prev
            );
            onSelectLista(listaConMasSocios);
        }
    }, [misListas, selectedLista]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header Premium con Estadísticas - Compacto */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
                <div className="mx-auto" style={{ maxWidth: 'clamp(320px, 95vw, 900px)', padding: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
                        <div data-tour="asignaciones-header" className="text-center md:text-left">
                            <h1 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)' }} className="font-black leading-tight">
                                Mi Lista de Asignaciones
                            </h1>
                            <p className="text-violet-200 text-[10px] md:text-xs mt-0.5 font-bold uppercase tracking-wider">
                                {miLista?.nombre || "Cargando..."}
                            </p>
                        </div>

                        {/* Estadísticas - Compactas y centradas en móvil */}
                        {miLista && (
                            <div className="flex justify-center md:justify-end gap-2 overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                                <div className="bg-white/10 backdrop-blur rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-center min-w-[55px] md:min-w-[60px] flex-shrink-0 border border-white/5">
                                    <p className="text-base md:text-xl font-black">{miLista.total}</p>
                                    <p className="text-[8px] md:text-[10px] text-violet-200 uppercase tracking-wide font-bold">Total</p>
                                </div>
                                <div className="bg-emerald-500/30 backdrop-blur rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-center min-w-[55px] md:min-w-[60px] flex-shrink-0 border border-emerald-400/20">
                                    <p className="text-base md:text-xl font-black text-emerald-300">{miLista.vyv}</p>
                                    <p className="text-[8px] md:text-[10px] text-emerald-200 uppercase tracking-wide font-bold">V&V</p>
                                </div>
                                <div className="bg-amber-500/30 backdrop-blur rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-center min-w-[55px] md:min-w-[60px] flex-shrink-0 border border-amber-400/20">
                                    <p className="text-base md:text-xl font-black text-amber-300">{miLista.soloVoz}</p>
                                    <p className="text-[8px] md:text-[10px] text-amber-200 uppercase tracking-wide font-bold">Solo</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto space-y-4" style={{ maxWidth: 'clamp(320px, 95vw, 900px)', padding: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
                {/* Mensaje Amable: Mínimo 5 Socios */}
                {miLista && miLista.total < 10 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 rounded-3xl border-2 border-indigo-200 p-6 shadow-lg shadow-indigo-100"
                        data-tour="meta-indicator"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-500 rounded-xl shadow-lg">
                                <ClipboardList className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-indigo-900 mb-1">
                                    ¡Estás comenzando bien! 🎯
                                </h3>
                                <p className="text-sm text-indigo-700 mb-3 leading-relaxed">
                                    Para asegurar una distribución efectiva del trabajo, <span className="font-bold">te recomendamos agregar al menos 10 socios</span> a tu lista.
                                    Actualmente tienes <span className="font-bold text-indigo-900">{miLista.total}</span> {miLista.total === 1 ? 'socio' : 'socios'}.
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-white/50 rounded-full h-3 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((miLista.total / 10) * 100, 100)}%` }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-indigo-600 min-w-[60px] text-right">
                                        {miLista.total} /10
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Buscador Principal */}
                {miLista && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6"
                        data-tour="search-socio"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Agregar Socio</h2>
                                <p className="text-sm text-slate-500">Seleccioná cómo querés buscar</p>
                            </div>
                        </div>

                        {/* Search Type Selector - 3-column grid */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
                            {[
                                { value: '', label: 'Todos', icon: '🔍' },
                                { value: 'cedula', label: 'CI', icon: '🪪' },
                                { value: 'nroSocio', label: 'N° Socio', icon: '🔢' },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => onSearchTypeChange(opt.value)}
                                    className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all border-2 ${searchType === opt.value
                                        ? 'bg-gradient-to-b from-violet-500 to-purple-600 text-white border-violet-400 shadow-lg shadow-violet-200 scale-[1.02]'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 active:scale-95'
                                        }`}
                                >
                                    <span className="text-base sm:text-sm leading-none">{opt.icon}</span>
                                    <span className="leading-tight">{opt.label}</span>
                                    {searchType === opt.value && (
                                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-violet-300 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); onSearchSocio(); }} className="flex flex-col gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    inputMode={searchType === 'cedula' || searchType === 'nroSocio' ? 'numeric' : 'text'}
                                    placeholder={
                                        searchType === 'cedula' ? 'Ingresá el N° de Cédula...' :
                                            searchType === 'nroSocio' ? 'Ingresá el N° de Socio...' :
                                                'Ingresa Cédula, N° de Socio o Nombre...'
                                    }
                                    className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-medium text-base md:text-lg text-slate-700 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white outline-none transition-all"
                                    value={socioSearchTerm}
                                    onChange={(e) => onSearchTermChange(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={addingSocio || !socioSearchTerm}
                                className="w-full sm:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                            >
                                {addingSocio ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <Search className="h-5 w-5" />
                                        <span className="md:inline">Buscar Socio</span>
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Toast de éxito animado */}
                        <AnimatePresence>
                            {justAdded && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-emerald-200/50"
                                >
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-sm">✓ Agregado exitosamente</p>
                                        <p className="text-emerald-100 text-xs font-medium">{justAdded}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Mensaje motivacional cuando socio ya asignado */}
                        <AnimatePresence>
                            {warningMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-amber-200/50"
                                >
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Zap className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-sm">{warningMessage}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Resultado de búsqueda */}
                        <AnimatePresence>
                            {searchedSocio && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 p-5"
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-emerald-500 rounded-xl">
                                                <CheckCircle2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-emerald-500 font-bold uppercase tracking-wide">Socio Encontrado</p>
                                                <p className="text-xl font-black text-slate-800">{searchedSocio.nombreCompleto}</p>
                                                <div className="flex gap-4 mt-1">
                                                    <span className="text-sm text-slate-500">CI: <span className="font-bold text-slate-700">{searchedSocio.cedula}</span></span>
                                                    <span className="text-sm text-slate-500">Nro: <span className="font-bold text-slate-700">{searchedSocio.numeroSocio}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                            <div className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 border-2 ${tieneVozYVoto(searchedSocio)
                                                ? 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                {tieneVozYVoto(searchedSocio) ? (
                                                    <><CheckCircle2 className="w-4 h-4" /> VOZ Y VOTO</>
                                                ) : (
                                                    <><Shield className="w-4 h-4" /> SOLO VOZ</>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={handleConfirmClick}
                                                    disabled={isConfirming}
                                                    className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg min-w-[130px] ${isConfirming
                                                        ? 'bg-emerald-400 text-white cursor-wait shadow-emerald-100/50'
                                                        : 'bg-emerald-500 hover:bg-teal-500 hover:scale-105 active:scale-95 text-white shadow-emerald-200/50'
                                                        }`}
                                                >
                                                    {isConfirming ? (
                                                        <><Loader2 className="w-5 h-5 animate-spin" /> Agregando...</>
                                                    ) : (
                                                        <><Plus className="w-5 h-5" /> Agregar</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={onCancelAdd}
                                                    disabled={isConfirming}
                                                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold transition-all"
                                                    title="Cancelar"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Lista de Socios */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden"
                    data-tour="socios-list"
                >
                    {/* Header Compacto Movil */}
                    <div className="p-3 md:p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                        <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                <Users className="w-5 h-5 flex-shrink-0" />
                                <div className="min-w-0">
                                    <h2 className="text-sm md:text-xl font-bold leading-tight truncate">Mis Socios</h2>
                                    <p className="text-[10px] md:text-sm text-emerald-100 truncate hidden md:block">{miLista?.nombre}</p>
                                </div>
                            </div>
                            <div className="flex gap-1.5 md:gap-3 flex-shrink-0">
                                <div className="bg-white/20 backdrop-blur rounded-lg px-2 py-1 text-center min-w-[36px] md:min-w-[50px]">
                                    <p className="text-sm md:text-xl font-black">{miLista?.total || 0}</p>
                                    <p className="text-[7px] md:text-[10px] text-white/80 uppercase">Total</p>
                                </div>
                                <div className="bg-emerald-400/30 backdrop-blur rounded-lg px-2 py-1 text-center min-w-[36px] md:min-w-[50px]">
                                    <p className="text-sm md:text-xl font-black text-emerald-100">{miLista?.vyv || 0}</p>
                                    <p className="text-[7px] md:text-[10px] text-emerald-100/80 uppercase">V&V</p>
                                </div>
                                <div className="bg-amber-400/30 backdrop-blur rounded-lg px-2 py-1 text-center min-w-[36px] md:min-w-[50px]">
                                    <p className="text-sm md:text-xl font-black text-amber-100">{miLista?.soloVoz || 0}</p>
                                    <p className="text-[7px] md:text-[10px] text-amber-100/80 uppercase">SV</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lista con Animaciones */}
                    {loadingSocios ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-3" />
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Actualizando nómina...</p>
                        </div>
                    ) : socios.length > 0 ? (
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {socios.map((socio, index) => {
                                    const esVyV = tieneVozYVoto(socio);
                                    return (
                                        <motion.div
                                            key={socio.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{
                                                opacity: 0,
                                                scale: 0.9,
                                                x: -20,
                                                transition: { duration: 0.2, ease: "easeIn" }
                                            }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 400,
                                                damping: 30,
                                                delay: index * 0.01
                                            }}
                                            className="p-3 md:p-5 hover:bg-slate-50/80 transition-all group relative border-l-4 border-transparent hover:border-violet-500"
                                        >
                                            <div className="flex items-center gap-2.5 md:gap-4">
                                                {/* Número Identificador - Más pequeño en móvil */}
                                                <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-white text-xs md:text-lg shadow-lg rotate-2 group-hover:rotate-0 transition-transform ${esVyV ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-100' : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-100'
                                                    }`}>
                                                    {index + 1}
                                                </div>

                                                {/* Información Principal */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-0.5 md:gap-1 mb-1">
                                                        <div className="flex flex-row items-center gap-2 mb-0.5 flex-wrap">
                                                            <p className="font-black text-slate-800 text-sm md:text-lg leading-tight truncate tracking-tight">
                                                                {socio.nombreCompleto}
                                                            </p>
                                                            {socio.telefono && getWhatsAppLinkWithMessage(socio) && (
                                                                <a
                                                                    href={getWhatsAppLinkWithMessage(socio)!}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 md:py-1 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-all shadow-md hover:shadow-green-500/30 transform hover:scale-105 border border-green-400"
                                                                    title="Enviar Mensaje de WhatsApp"
                                                                >
                                                                    <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
                                                                    <span className="text-[10px] md:text-xs font-bold">WhatsApp</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className={`px-1.5 py-0.5 rounded-lg text-[8px] md:text-xs font-black uppercase tracking-wider border-2 ${esVyV
                                                                ? 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                                                }`}>
                                                                {esVyV ? 'V&V' : 'S. Voz'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 md:gap-2 text-[9px] md:text-sm">
                                                        <div className="flex items-center gap-1 md:gap-1.5 px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-100 text-slate-500 rounded-lg font-bold">
                                                            <Shield className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-400" />
                                                            CI: <span className="text-slate-800">{socio.cedula}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 md:gap-1.5 px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-100 text-slate-500 rounded-lg font-bold">
                                                            <Users className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-400" />
                                                            N°: <span className="text-slate-800">{socio.numeroSocio}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Acción de Quitar */}
                                                <div className="flex-shrink-0">
                                                    <ConfirmRemoveButton onConfirm={() => onRemoveSocio(socio.id)} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <div className="relative inline-block mb-6">
                                <Users className="w-20 h-20 text-slate-100" />
                                <Plus className="w-8 h-8 text-emerald-400 absolute -bottom-2 -right-2 animate-bounce" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 uppercase italic">Tu lista está vacía</h3>
                            <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">
                                Comienza agregando socios a tu lista de trabajo usando el buscador superior.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Toast Notification Premium - Mobile Optimized */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -80 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -80 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-2 left-2 right-2 md:left-auto md:right-4 md:top-4 md:max-w-sm z-50"
                    >
                        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-3 py-2.5 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-2.5 md:gap-3 border border-white/10">
                            <div className="p-1.5 md:p-2 bg-white/20 rounded-lg md:rounded-xl backdrop-blur flex-shrink-0">
                                <Bell className="w-4 h-4 md:w-5 md:h-5 text-white animate-pulse" />
                            </div>
                            <p className="text-xs md:text-sm font-medium flex-1 leading-snug">{toastMessage}</p>
                            <button
                                onClick={() => setShowToast(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 active:scale-90"
                            >
                                <X className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Componente Interno para botón de borrado con confirmación premium
function ConfirmRemoveButton({ onConfirm }: { onConfirm: () => void }) {
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (isConfirming) {
            const timer = setTimeout(() => setIsConfirming(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isConfirming]);

    return (
        <div className="relative flex items-center justify-end min-w-[40px] md:min-w-[120px]">
            <AnimatePresence mode="wait">
                {!isConfirming ? (
                    <motion.button
                        key="delete"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsConfirming(true);
                        }}
                        className="p-2 md:p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100"
                        title="Quitar socio"
                    >
                        <Trash2 className="w-5 h-5" />
                    </motion.button>
                ) : (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className="flex items-center gap-2 bg-red-500 rounded-xl p-1 md:pr-4 overflow-hidden shadow-lg shadow-red-200"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsConfirming(false);
                            }}
                            className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                            <X className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onConfirm();
                            }}
                            className="text-white text-[10px] md:text-sm font-black uppercase tracking-widest whitespace-nowrap py-2 pr-2"
                        >
                            Confirmar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
