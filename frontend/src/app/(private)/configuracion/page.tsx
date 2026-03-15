"use client";

import { useState } from "react";
import {
    Trash2,
    Database,
    RefreshCcw,
    ShieldAlert,
    Save,
    Info,
    Key,
    Search,
    UserCircle2,
    Check,
    X,
    Loader2,
    Camera,
    Mail,
    Phone,
    Upload,
    HelpCircle,
    RotateCcw,
    Hammer,
    Bell,
    Settings2,
    ClipboardList,
    Clock,
    Calendar,
    Plus,
    Star,
    Smartphone,
    Download
} from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useCallback } from "react";
import { useConfig } from "@/context/ConfigContext";
import Swal from 'sweetalert2';
import { useTour } from "@/components/tour";
import { configuracionTour } from "@/components/tour/tourSteps";
import { useRouter } from "next/navigation";

const ConfiguracionEvento = () => {
    const { nombreAsamblea, fechaAsamblea, mensajeWhatsApp, updateConfig } = useConfig();
    const [nombre, setNombre] = useState(nombreAsamblea);
    const [fecha, setFecha] = useState(fechaAsamblea);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setNombre(nombreAsamblea);
        setFecha(fechaAsamblea);
    }, [nombreAsamblea, fechaAsamblea]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateConfig("ASAMBLEA_NOMBRE", nombre);
            await updateConfig("ASAMBLEA_FECHA", fecha);

            Swal.fire({
                title: '¡Configuración Guardada!',
                text: 'Los parámetros del evento se han actualizado y sincronizado con el sistema.',
                icon: 'success',
                confirmButtonText: 'Excelente',
                confirmButtonColor: '#10b981',
                padding: '2em',
                customClass: {
                    popup: 'rounded-[2rem] shadow-2xl'
                }
            });
        } catch (error) {
            Swal.fire({
                title: 'Error al Guardar',
                text: 'Hubo un problema al intentar actualizar la configuración. Verifica tu conexión.',
                icon: 'error',
                confirmButtonText: 'Intentar De Nuevo',
                confirmButtonColor: '#ef4444',
                padding: '2em',
                customClass: {
                    popup: 'rounded-[2rem] shadow-2xl'
                }
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 italic uppercase">
                <Save className="h-5 w-5 text-emerald-500" />
                Parámetros del Evento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">Nombre de la Asamblea</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none transition-all font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">Fecha del Evento</label>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none transition-all font-medium"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl bg-slate-900 px-8 py-3 font-bold text-white hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? "Guardando..." : "Guardar Configuración"}
                </button>
            </div>
        </>
    );
};

// Componente de Mantenimiento (Compacto)
const ConfiguracionMantenimiento = () => {
    const { isMaintenanceMode, updateConfig } = useConfig();
    const [enabled, setEnabled] = useState(isMaintenanceMode);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEnabled(isMaintenanceMode);
    }, [isMaintenanceMode]);

    const handleToggle = async () => {
        const newValue = !enabled;
        setSaving(true);
        try {
            await updateConfig("MODO_MANTENIMIENTO", newValue ? "true" : "false");
            setEnabled(newValue);

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: newValue ? 'warning' : 'success',
                title: newValue ? 'Modo Mantenimiento Activo' : 'Sistema Disponible'
            });
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${enabled ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Hammer className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Modo Mantenimiento</h3>
                    <p className="text-xs text-slate-500">Bloquea el acceso a usuarios estándar.</p>
                </div>
            </div>

            <button
                onClick={handleToggle}
                disabled={saving}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${enabled ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}>
                    {saving && <Loader2 className="h-4 w-4 m-1 animate-spin text-amber-500" />}
                </span>
            </button>
        </div>
    );
};

// Componente para Configurar Mensaje de WhatsApp
const ConfiguracionMensajeWhatsApp = () => {
    const { mensajeWhatsApp, fechaAsamblea, updateConfig } = useConfig();
    const [mensaje, setMensaje] = useState(mensajeWhatsApp);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        setMensaje(mensajeWhatsApp);
    }, [mensajeWhatsApp]);

    // Función para formatear la fecha de la asamblea con día de la semana
    const formatearFechaAsamblea = () => {
        if (!fechaAsamblea) return "sábado 21 de marzo de 2026";
        try {
            const fecha = new Date(fechaAsamblea + 'T00:00:00');
            const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const diaSemana = diasSemana[fecha.getDay()];
            const dia = fecha.getDate();
            const mes = meses[fecha.getMonth()];
            const anio = fecha.getFullYear();
            return `${diaSemana} ${dia} de ${mes} de ${anio}`;
        } catch (e) {
            return "sábado 21 de marzo de 2026";
        }
    };

    // Vista previa del mensaje con placeholders reemplazados
    const getMensajePreview = () => {
        return mensaje
            .replace('{SALUDO}', 'Sr./Sra.')
            .replace('{NOMBRE}', 'Juan')
            .replace('{ASESOR}', 'María López')
            .replace('{FECHA_ASAMBLEA}', formatearFechaAsamblea());
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateConfig("MENSAJE_WHATSAPP", mensaje);
            Swal.fire({
                title: '¡Mensaje Actualizado!',
                text: 'El mensaje de WhatsApp se ha guardado correctamente.',
                icon: 'success',
                confirmButtonText: 'Excelente',
                confirmButtonColor: '#10b981',
                padding: '2em',
                customClass: {
                    popup: 'rounded-[2rem] shadow-2xl'
                }
            });
        } catch (error) {
            Swal.fire({
                title: 'Error al Guardar',
                text: 'Hubo un problema al guardar el mensaje.',
                icon: 'error',
                confirmButtonText: 'Intentar De Nuevo',
                confirmButtonColor: '#ef4444',
                padding: '2em',
                customClass: {
                    popup: 'rounded-[2rem] shadow-2xl'
                }
            });
        } finally {
            setSaving(false);
        }
    };

    const restaurarMensajePorDefecto = () => {
        const mensajePorDefecto = "¡Hola! Buenos días {SALUDO} *{NOMBRE}* 👋\n\nTe saluda *{ASESOR}* de la *Cooperativa Lambaré* ✅ para invitarte cordialmente a nuestra próxima asamblea institucional que será el día *{FECHA_ASAMBLEA}*.\n\n¡Contamos con tu apoyo y participación! 🌟 Si tienes alguna duda, puedes responderme por este medio.";
        setMensaje(mensajePorDefecto);
    };

    return (
        <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 italic uppercase">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    Mensaje de WhatsApp
                </h2>
                <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                    {showPreview ? 'Ocultar' : 'Ver'} Vista Previa
                </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-800 font-medium">
                    <strong>Placeholders disponibles:</strong> {'{SALUDO}'} (Sr./Sra.), {'{NOMBRE}'} (nombre del socio),
                    {'{ASESOR}'} (nombre del asesor), {'{FECHA_ASAMBLEA}'} (fecha configurada: {formatearFechaAsamblea()})
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase">Mensaje Personalizado</label>
                <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all font-medium resize-none"
                    placeholder="Escribe tu mensaje..."
                />
                <p className="text-xs text-slate-400">Caracteres: {mensaje.length}</p>
            </div>

            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-green-50 border border-green-200 rounded-xl p-4"
                    >
                        <h4 className="text-xs font-black text-green-800 uppercase mb-2">Vista Previa del Mensaje:</h4>
                        <div className="bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-green-100">
                            {getMensajePreview()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-3 justify-end pt-2">
                <button
                    onClick={restaurarMensajePorDefecto}
                    className="rounded-xl bg-slate-200 px-6 py-2.5 font-bold text-slate-700 hover:bg-slate-300 transition-all active:scale-95"
                >
                    Restaurar Por Defecto
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl bg-slate-900 px-8 py-2.5 font-bold text-white hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? "Guardando..." : "Guardar Mensaje"}
                </button>
            </div>
        </div>
    );
};

// Componente para Notificaciones de Asignación (Compacto)
const ConfiguracionNotificaciones = () => {
    const { updateConfig } = useConfig();
    const [enabled, setEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get("/api/configuracion", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = res.data;
                if (Array.isArray(data)) {
                    const config = data.find((c: any) => c.clave === "notificaciones_asignacion_activas");
                    if (config) setEnabled(config.valor !== "false");
                } else if (data && typeof data === 'object') {
                    if (data.notificaciones_asignacion_activas !== undefined) {
                        setEnabled(data.notificaciones_asignacion_activas !== "false");
                    }
                }
            } catch (error) {
                console.error("Error loading notification config:", error);
            } finally {
                setLoaded(true);
            }
        };
        fetchConfig();
    }, []);

    const handleToggle = async () => {
        const newValue = !enabled;
        setSaving(true);
        try {
            await updateConfig("notificaciones_asignacion_activas", newValue ? "true" : "false");
            setEnabled(newValue);

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: newValue ? 'success' : 'info',
                title: newValue ? 'Notificaciones Activadas' : 'Notificaciones Desactivadas'
            });
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleTestNotification = async () => {
        if (!("Notification" in window)) return;
        if (Notification.permission === "default") await Notification.requestPermission();

        const notification = new Notification("🔔 Nueva Asignación", {
            body: "Prueba de notificación de sistema",
            icon: "/logo.png",
            tag: "test-" + Date.now()
        });
        notification.onclick = () => window.focus();
    };

    if (!loaded) return null;

    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Bell className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Avisos de Asignación</h3>
                    <p className="text-xs text-slate-500">Recibe alertas cuando se asignen socios.</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleTestNotification}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Probar notificación"
                >
                    <Bell className="h-4 w-4" />
                </button>

                <button
                    onClick={handleToggle}
                    disabled={saving}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                >
                    <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}>
                        {saving && <Loader2 className="h-4 w-4 m-1 animate-spin text-blue-500" />}
                    </span>
                </button>
            </div>
        </div>
    );
};

// Componente para Configuración del Spotlight de Candidatos (Compacto)
const ConfiguracionSpotlight = () => {
    const [enabled, setEnabled] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const preference = localStorage.getItem("spotlight_enabled");
        if (preference === "false") setEnabled(false);
    }, []);

    const handleToggle = async () => {
        const newValue = !enabled;
        setSaving(true);
        localStorage.setItem("spotlight_enabled", newValue ? "true" : "false");
        setEnabled(newValue);

        // Simular delay breve para feedback visual
        setTimeout(() => setSaving(false), 300);

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: newValue ? 'success' : 'info',
            title: newValue ? 'Spotlight Activado' : 'Spotlight Desactivado'
        });
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${enabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Star className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Spotlight de Candidatos</h3>
                    <p className="text-xs text-slate-500">Muestra popups automáticos de candidatos.</p>
                </div>
            </div>

            <button
                onClick={handleToggle}
                disabled={saving}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${enabled ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}>
                    {saving && <Loader2 className="h-4 w-4 m-1 animate-spin text-amber-500" />}
                </span>
            </button>
        </div>
    );
};

// Componente de Gestión Listas (Compacto)
const ConfiguracionGestionListas = () => {
    const router = useRouter();
    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-teal-100 text-teal-600">
                    <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Operativa de Listas</h3>
                    <p className="text-xs text-slate-500">Gestión global de candidatos y listas.</p>
                </div>
            </div>

            <button
                onClick={() => router.push("/gestion-listas")}
                className="px-4 py-2 bg-teal-500 text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors"
            >
                Acceder
            </button>
        </div>
    );
};

// Componente para Control de Check-in (Nuevo)
const ConfiguracionCheckin = () => {
    const { isCheckinHabilitado, updateConfig } = useConfig();
    const [enabled, setEnabled] = useState(isCheckinHabilitado);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEnabled(isCheckinHabilitado);
    }, [isCheckinHabilitado]);

    const handleToggle = async () => {
        const newValue = !enabled;
        setSaving(true);
        try {
            await updateConfig("CHECKIN_HABILITADO", newValue ? "true" : "false");
            setEnabled(newValue);

            Swal.fire({
                title: newValue ? '✅ Check-in HABILITADO' : '🔒 Check-in CERRADO',
                html: newValue
                    ? '<p class="text-slate-600">Los operadores ahora pueden <b>registrar asistencia y realizar check-in</b> normalmente.</p>'
                    : '<p class="text-slate-600">Se ha bloqueado el acceso al registro. Nadie podrá registrarse hasta que el módulo sea habilitado nuevamente.</p>',
                icon: newValue ? 'success' : 'warning',
                confirmButtonText: 'Entendido',
                confirmButtonColor: newValue ? '#10b981' : '#f59e0b',
                padding: '2em',
                customClass: {
                    popup: 'rounded-[2rem] shadow-2xl'
                }
            });
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${enabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-red-100 text-red-600'}`}>
                    <Check className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Estado del Check-in</h3>
                    <p className="text-xs text-slate-500">Cierra el registro global al terminar la Asamblea.</p>
                </div>
            </div>

            <button
                onClick={handleToggle}
                disabled={saving}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}>
                    {saving && <Loader2 className="h-4 w-4 m-1 animate-spin text-emerald-500" />}
                </span>
            </button>
        </div>
    );
};

// Componente para Restricción Solo Voz y Voto
const ConfiguracionSoloVozVoto = () => {
    const { updateConfig } = useConfig();
    const [enabled, setEnabled] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Cargar estado actual de la configuración
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get("/api/configuracion", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Manejar diferentes formatos de respuesta
                const data = res.data;
                if (Array.isArray(data)) {
                    const config = data.find((c: any) => c.clave === "SOLO_VOZ_VOTO_ACTIVO");
                    if (config) {
                        setEnabled(config.valor === "true");
                    }
                } else if (data && typeof data === 'object') {
                    if (data.SOLO_VOZ_VOTO_ACTIVO !== undefined) {
                        setEnabled(data.SOLO_VOZ_VOTO_ACTIVO === "true");
                    }
                }
            } catch (error) {
                console.error("Error cargando config de solo voz y voto:", error);
            } finally {
                setLoaded(true);
            }
        };
        fetchConfig();
    }, []);

    const handleToggle = async () => {
        const newValue = !enabled;
        setSaving(true);
        try {
            await updateConfig("SOLO_VOZ_VOTO_ACTIVO", newValue ? "true" : "false");
            setEnabled(newValue);

            Swal.fire({
                title: newValue ? '🗳️ Restricción ACTIVADA' : '✅ Restricción DESACTIVADA',
                html: newValue
                    ? '<p class="text-slate-600">Ahora <strong>solo se podrán asignar socios que tengan Voz y Voto</strong>.<br/>Los usuarios verán un mensaje profesional si intentan agregar un socio que solo tiene voz.</p>'
                    : '<p class="text-slate-600">Se permite asignar <strong>cualquier socio</strong> independientemente de su condición de voto.</p>',
                icon: newValue ? 'warning' : 'success',
                confirmButtonText: 'Entendido',
                confirmButtonColor: newValue ? '#f59e0b' : '#10b981',
                padding: '2em',
                customClass: {
                    popup: 'rounded-[2rem] shadow-2xl'
                }
            });
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudo actualizar la configuración',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setSaving(false);
        }
    };

    if (!loaded) return null;

    // Layout Compacto Voz y Voto
    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${enabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Restricción de Asignaciones</h3>
                    <p className="text-xs text-slate-500">Solo permite asignar socios con Voz y Voto.</p>
                </div>
            </div>

            <button
                onClick={handleToggle}
                disabled={saving}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}>
                    {saving && <Loader2 className="h-4 w-4 m-1 animate-spin text-emerald-500" />}
                </span>
            </button>
        </div>
    );
};

// Componente para Fecha Límite de Asignación - REDISEÑO PREMIUM
const ConfiguracionFechaLimite = () => {
    const { updateConfig } = useConfig();
    const [activa, setActiva] = useState(false);
    const [fechaLimite, setFechaLimite] = useState("");
    const [pruebaActiva, setPruebaActiva] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get("/api/configuracion/fecha-limite", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = res.data;
                setActiva(data.activa);
                setFechaLimite(data.fechaLimite || "");
                setPruebaActiva(data.pruebaActiva);
            } catch (error) {
                console.error("Error cargando config de fecha límite:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateConfig("FECHA_LIMITE_ACTIVA", activa ? "true" : "false");
            await updateConfig("FECHA_LIMITE_ASIGNACION", fechaLimite);

            Swal.fire({
                title: '<span class="text-2xl font-black italic">¡TIEMPO CONFIGURADO!</span>',
                html: `<p class="text-slate-600">${activa
                    ? `Las listas se cerrarán automáticamente el <b>${new Date(fechaLimite).toLocaleString()}</b>`
                    : 'Se ha desactivado la restricción de tiempo.'}</p>`,
                icon: 'success',
                confirmButtonColor: '#f59e0b',
                customClass: {
                    popup: 'rounded-[2rem] border-4 border-orange-100 shadow-2xl'
                }
            });
        } catch (error) {
            Swal.fire({ title: 'Error', text: 'No se pudo guardar la configuración', icon: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePrueba = async () => {
        const token = localStorage.getItem("token");
        const action = pruebaActiva ? 'desactivar-prueba' : 'activar-prueba';

        try {
            const res = await axios.post(`/api/configuracion/fecha-limite/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setPruebaActiva(!pruebaActiva);
                Swal.fire({
                    title: !pruebaActiva ? '🧪 MODO PRUEBA ACTIVO' : '✅ SISTEMA RESTABLECIDO',
                    text: res.data.message,
                    icon: !pruebaActiva ? 'warning' : 'success',
                    confirmButtonColor: !pruebaActiva ? '#f59e0b' : '#10b981',
                    customClass: {
                        popup: 'rounded-[2rem] shadow-2xl'
                    }
                });
            }
        } catch (error) {
            Swal.fire({ title: 'Error', text: 'Error al cambiar estado de prueba', icon: 'error' });
        }
    };

    if (loading) return null;

    return (
        <div className="relative group">
            {/* Título decorativo */}
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 italic uppercase mt-10 mb-6 group-hover:translate-x-1 transition-transform">
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                    <Clock className="h-6 w-6" />
                </div>
                Cronograma de Asignación
            </h2>

            <div className="relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/50 shadow-2xl shadow-slate-200/50 p-1 md:p-2">
                <div className={`rounded-[2rem] p-6 md:p-10 transition-all duration-700 ${activa ? 'bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50' : 'bg-slate-50/50'}`}>

                    {/* Header: Switch */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full animate-pulse ${activa ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-slate-300'}`} />
                                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Cierre Automatizado</h3>
                            </div>
                            <p className="text-slate-500 font-medium max-w-lg leading-relaxed">
                                Al activar esta opción, el sistema bloqueará nuevas asignaciones una vez alcanzada la fecha límite. Los socios recibirán un aviso premium de impacto al entrar.
                            </p>
                        </div>

                        <button
                            onClick={() => setActiva(!activa)}
                            className={`relative inline-flex h-12 w-24 flex-shrink-0 cursor-pointer rounded-full border-4 border-white shadow-inner transition-all duration-500 ease-in-out focus:outline-none ${activa ? 'bg-orange-500' : 'bg-slate-300'}`}
                        >
                            <div className={`pointer-events-none absolute inset-y-0 left-0 w-10 transform scale-90 rounded-full bg-white shadow-lg transition-all duration-500 ease-in-out ${activa ? 'translate-x-12' : 'translate-x-0'}`}>
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className={`w-1.5 h-1.5 rounded-full ${activa ? 'bg-orange-500' : 'bg-slate-300'}`} />
                                </div>
                            </div>
                        </button>
                    </div>

                    <AnimatePresence>
                        {activa && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: 20 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: 20 }}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="group/input relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block pl-2">Fecha y Hora de Cierre</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-400 group-hover/input:scale-110 transition-transform" />
                                            <input
                                                type="datetime-local"
                                                value={fechaLimite}
                                                onChange={(e) => setFechaLimite(e.target.value)}
                                                className="w-full bg-white/70 backdrop-blur rounded-2xl border-2 border-slate-100 pl-16 pr-6 py-5 text-lg font-black text-slate-800 focus:border-orange-400 focus:bg-white outline-none transition-all shadow-sm hover:border-orange-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-end">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="group/btn relative w-full overflow-hidden rounded-2xl bg-slate-900 px-8 py-5 transition-all active:scale-95 shadow-xl hover:shadow-orange-200"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                            <span className="relative flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest text-white">
                                                {saving ? "Procesando..." : (
                                                    <><Plus className="h-5 w-5" /> Confirmar Programación</>
                                                )}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer: Modo Prueba */}
                    <div className={`mt-10 pt-8 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-6 ${!activa ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${pruebaActiva ? 'bg-red-100 animate-pulse' : 'bg-slate-100'}`}>
                                <Hammer className={`h-6 w-6 ${pruebaActiva ? 'text-red-500' : 'text-slate-400'}`} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm uppercase italic">Simulador de Cierre</h4>
                                <p className="text-xs text-slate-500 font-medium">Fuerza el bloqueo inmediato para verificar la UX del socio.</p>
                            </div>
                        </div>

                        <button
                            onClick={handleTogglePrueba}
                            disabled={!activa}
                            className={`px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${pruebaActiva
                                ? 'bg-red-500 text-white shadow-red-200 hover:bg-red-600'
                                : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-orange-500 hover:text-orange-500'
                                }`}
                        >
                            {pruebaActiva ? "Finalizar Prueba" : "Probar Cierre Ahora"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente para Modo de Prueba (Compacto)
const ConfiguracionModoPrueba = () => {
    const { isTestMode, testModeInfo, activateTestMode, deactivateTestMode } = useConfig();
    const [saving, setSaving] = useState(false);

    const handleActivate = async () => {
        const result = await Swal.fire({
            title: '¿Activar Modo de Prueba?',
            text: 'Se creará una copia de seguridad. Los cambios que hagas NO serán permanentes.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#8b5cf6',
            confirmButtonText: 'Sí, Activar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setSaving(true);
        const response = await activateTestMode();
        setSaving(false);

        if (response.success) {
            Swal.fire({ title: 'Modo Prueba Activado', icon: 'success' });
        } else {
            Swal.fire({ title: 'Error', text: response.error, icon: 'error' });
        }
    };

    const handleDeactivate = async () => {
        const result = await Swal.fire({
            title: '¿Restaurar Sistema?',
            text: 'Se perderán todos los cambios hechos durante la prueba.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, Restaurar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setSaving(true);
        const response = await deactivateTestMode();
        setSaving(false);

        if (response.success) {
            Swal.fire({ title: 'Sistema Restaurado', icon: 'success' });
        } else {
            Swal.fire({ title: 'Error', text: response.error, icon: 'error' });
        }
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${isTestMode ? 'bg-violet-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                    <Database className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Modo de Prueba /Sandbox</h3>
                    <p className="text-xs text-slate-500">
                        {isTestMode ? "Activo: Los cambios no son permanentes." : "Prueba el sistema sin riesgos."}
                    </p>
                </div>
            </div>

            <button
                onClick={isTestMode ? handleDeactivate : handleActivate}
                disabled={saving}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${isTestMode ? 'bg-violet-500' : 'bg-slate-300'}`}
            >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isTestMode ? 'translate-x-5' : 'translate-x-0'}`}>
                    {saving && <Loader2 className="h-4 w-4 m-1 animate-spin text-violet-500" />}
                </span>
            </button>
        </div>
    );
};

// Subcomponente para Opciones de Reset
const ResetOptionsPanel = ({ isAdminMode, accessCode, setAccessCode, checkAccess, setIsAdminMode, loading, handleReset }: any) => {
    const [options, setOptions] = useState<{
        socios: boolean;
        asignaciones: boolean;
        listas: boolean;
        usuarios: boolean;
        asistencias: boolean;
        importaciones: boolean;
    }>({
        socios: true,
        asignaciones: true,
        listas: true,
        usuarios: true,
        asistencias: true,
        importaciones: true
    });

    // Validar dependencias visualmente
    useEffect(() => {
        const newOptions = { ...options };
        // Si borras listas, borras asignaciones
        if (newOptions.listas && !newOptions.asignaciones) setOptions((prev: any) => ({ ...prev, asignaciones: true }));
    }, [options.listas]);

    const toggleOption = (key: keyof typeof options) => {
        setOptions((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    const onResetClick = () => {
        handleReset(options);
    };

    return (
        <div className="rounded-2xl border-2 border-red-100 bg-gradient-to-br from-red-50/50 to-orange-50/30 p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-3 text-red-700 relative">
                <div className="p-2 bg-red-100 rounded-xl">
                    <ShieldAlert className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Zona de Peligro /Reset</h2>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-lg relative">
                {!isAdminMode ? (
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-amber-100 p-3 rounded-xl">
                                <Key className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800 text-lg">Acceso Protegido</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Ingresa el código maestro de administrador para desbloquear las opciones de limpieza.
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-3">
                            <input
                                type="password"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && checkAccess()}
                                placeholder="••••••"
                                className="w-full sm:flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-center text-lg font-mono tracking-[0.3em] md:tracking-[0.5em] outline-none focus:border-amber-500 transition-all"
                                maxLength={6}
                            />
                            <button
                                onClick={checkAccess}
                                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all"
                            >
                                Desbloquear
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
                            <span className="text-sm font-bold text-teal-500 flex items-center gap-2">
                                <Check className="h-4 w-4" /> Modo Administrador
                            </span>
                            <button onClick={() => setIsAdminMode(false)} className="text-xs text-emerald-500 font-bold hover:underline">Bloquear</button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Selecciona qué datos eliminar:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { key: "socios", label: "Padrón de Socios", desc: "Borra todos los socios (CUIDADO)" },
                                    { key: "asignaciones", label: "Asignaciones", desc: "Borra las distribuciones de socios en listas" },
                                    { key: "listas", label: "Listas Creadas", desc: "Borra las listas vacías o llenas de los operadores" },
                                    { key: "usuarios", label: "Cuentas de Operadores", desc: "Borra los usuarios (Login)" },
                                    { key: "asistencias", label: "Control de Asistencia", desc: "Borra registros de check-in" },
                                    { key: "importaciones", label: "Historial de Importación", desc: "Limpia el log de importaciones" },
                                ].map((opt) => (
                                    <label key={opt.key} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${(options as any)[opt.key] ? 'border-red-200 bg-red-50/50' : 'border-slate-100 hover:border-slate-200'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            checked={(options as any)[opt.key]}
                                            onChange={() => toggleOption(opt.key as any)}
                                            className="mt-1 w-4 h-4 accent-red-600"
                                        />
                                        <div>
                                            <span className="block font-bold text-slate-800 text-sm">{opt.label}</span>
                                            <span className="block text-[10px] text-slate-500 leading-tight">{opt.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={onResetClick}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
                            EJECUTAR LIMPIEZA SELECCIONADA
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sección de Instalación PWA - Visible para TODOS los usuarios
const PWAInstallSection = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true) {
            setIsInstalled(true);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        setInstalling(true);
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setIsInstalled(true);
            setDeferredPrompt(null);
        } catch (err) {
            console.error('Error installing PWA:', err);
        } finally {
            setInstalling(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden relative"
        >
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 sm:p-7 relative overflow-hidden">
                {/* Decoraciones animadas */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl"
                />
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.15, 0.05] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-xl"
                />
                <motion.div
                    animate={{ x: [0, 100], opacity: [0, 0.3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-1/2 left-0 w-20 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />

                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
                    {/* Ícono animado tipo teléfono */}
                    <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        className="relative shrink-0"
                    >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/15 backdrop-blur-sm rounded-2xl sm:rounded-3xl border-2 border-white/20 flex items-center justify-center shadow-2xl shadow-black/20">
                            <Smartphone className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                        </div>
                        {/* Punto de notificación */}
                        {!isInstalled && (
                            <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-amber-400 rounded-full border-2 border-emerald-600 flex items-center justify-center"
                            >
                                <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-800" />
                            </motion.div>
                        )}
                        {isInstalled && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-400 rounded-full border-2 border-emerald-600 flex items-center justify-center"
                            >
                                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Contenido central */}
                    <div className="flex-1 text-center sm:text-left min-w-0">
                        <motion.h3
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg sm:text-xl font-black text-white tracking-tight"
                        >
                            {isInstalled ? '¡SIGA Instalada!' : 'Instalar SIGA Móvil'}
                        </motion.h3>
                        <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs sm:text-sm text-emerald-100/80 mt-1 leading-relaxed"
                        >
                            {isInstalled
                                ? 'La app está instalada en tu dispositivo. Accedé desde tu pantalla de inicio.'
                                : 'Accedé más rápido desde tu celular. Sin necesidad de abrir el navegador.'}
                        </motion.p>

                        {/* Features mini */}
                        {!isInstalled && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3"
                            >
                                {['Acceso rápido', 'Sin navegador', 'Pantalla completa'].map((feat, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-lg text-[10px] sm:text-xs font-semibold text-white/90 border border-white/10">
                                        <Check className="h-2.5 w-2.5 text-emerald-300" />
                                        {feat}
                                    </span>
                                ))}
                            </motion.div>
                        )}
                    </div>

                    {/* Botón de acción */}
                    <div className="w-full sm:w-auto shrink-0">
                        {isInstalled ? (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                                    transition={{ delay: 0.3, duration: 0.5 }}
                                >
                                    <Check className="h-5 w-5 text-emerald-200" />
                                </motion.div>
                                <span className="text-sm font-bold text-emerald-100">Instalada ✓</span>
                            </motion.div>
                        ) : deferredPrompt ? (
                            <motion.button
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ delay: 0.4 }}
                                onClick={handleInstall}
                                disabled={installing}
                                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 bg-white text-emerald-700 rounded-xl font-black text-sm sm:text-base shadow-2xl shadow-black/20 hover:bg-emerald-50 transition-colors disabled:opacity-50 group"
                            >
                                {installing ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <motion.div
                                        animate={{ y: [0, 3, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <Download className="h-5 w-5" />
                                    </motion.div>
                                )}
                                {installing ? 'Instalando...' : 'Instalar Ahora'}
                            </motion.button>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-col items-center sm:items-end gap-1.5 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10"
                            >
                                <span className="text-xs text-white/80 font-semibold text-center sm:text-right">
                                    Abrí desde <strong className="text-white">Chrome</strong> o <strong className="text-white">Safari</strong>
                                </span>
                                <span className="text-[10px] text-white/50 text-center sm:text-right">
                                    para ver el botón de instalar
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function ConfiguracionPage() {
    const [user, setUser] = useState<any>(null);
    const [confirmText, setConfirmText] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    // Tour hook
    const { resetAllTours, startTour, hasSeenTour } = useTour();



    // Perfil /Password States
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPass, setSavingPass] = useState(false);

    // Hidden Admin Module State (Solo para ADMIN)
    const [accessCode, setAccessCode] = useState("");
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [foundSocios, setFoundSocios] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [updatingSocioId, setUpdatingSocioId] = useState<number | null>(null);

    // Personal Data States
    const [email, setEmail] = useState("");
    const [telefono, setTelefono] = useState("");
    const [fotoPerfil, setFotoPerfil] = useState("");
    const [savingPersonal, setSavingPersonal] = useState(false);

    // Logout all sessions
    const [closingSessions, setClosingSessions] = useState(false);
    const router = useRouter();

    // Notificaciones globales
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Handler para reiniciar guía
    const handleResetTour = () => {
        resetAllTours();
        Swal.fire({
            title: '¡Guía Reiniciada!',
            text: 'La próxima vez que entres al Dashboard verás el tutorial de nuevo.',
            icon: 'success',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#10b981',
            padding: '2em',
            customClass: {
                popup: 'rounded-[2rem] shadow-2xl'
            }
        });
    };

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const u = JSON.parse(userData);
            setUser(u);
            setEmail(u.email || "");
            setTelefono(u.telefono || "");
            setFotoPerfil(u.fotoPerfil || "");
        }

        // Cargar preferencia de notificaciones
        const notifPref = localStorage.getItem("notifications_enabled");
        setNotificationsEnabled(notifPref !== "false");
    }, []);

    const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5000000) { // 5MB limit
                setMessage({ type: 'error', text: 'La imagen es demasiado grande (Máx 5MB)' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFotoPerfil(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSavePersonal = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validación @gmail.com
        if (email && !email.toLowerCase().endsWith("@gmail.com")) {
            setMessage({ type: 'error', text: 'El correo electrónico debe ser una cuenta @gmail.com' });
            return;
        }

        setSavingPersonal(true);
        try {
            const token = localStorage.getItem("token");
            await axios.put(`/api/usuarios/${user.id}`, {
                email,
                telefono,
                fotoPerfil
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Actualizar Local Storage
            const updatedUser = { ...user, email, telefono, fotoPerfil };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);

            setMessage({ type: 'success', text: 'Datos personales actualizados correctamente' });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Error al actualizar datos'
            });
        } finally {
            setSavingPersonal(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
            return;
        }

        setSavingPass(true);
        setMessage(null);

        try {
            const token = localStorage.getItem("token");
            await axios.post("/api/usuarios/cambiar-password-actual", {
                currentPassword,
                newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Error al cambiar la contraseña'
            });
        } finally {
            setSavingPass(false);
        }
    };

    const handleToggleNotifications = () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);
        localStorage.setItem("notifications_enabled", String(newValue));

        Swal.fire({
            title: newValue ? '¡Notificaciones Activadas!' : 'Notificaciones Desactivadas',
            text: newValue
                ? 'Volverás a recibir mensajes y estadísticas al iniciar sesión.'
                : 'No recibirás más notificaciones automáticas. Puedes reactivarlas cuando quieras.',
            icon: newValue ? 'success' : 'info',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#10b981'
        });
    };

    const handleLogoutAllSessions = async () => {
        const result = await Swal.fire({
            title: '¿Cerrar Todas las Sesiones?',
            text: 'Esto invalidará todos los tokens activos. Tendrás que volver a iniciar sesión.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, Cerrar Todas',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setClosingSessions(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post("/api/auth/logout-all-sessions", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: '¡Sesiones Cerradas!',
                text: 'Todas tus sesiones han sido invalidadas. Serás redirigido al login.',
                icon: 'success',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#10b981'
            }).then(() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                router.push("/login");
            });
        } catch (error: any) {
            Swal.fire({
                title: 'Error',
                text: error.response?.data?.error || 'No se pudieron cerrar las sesiones',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setClosingSessions(false);
        }
    };

    const handleResetData = async (type: 'padron' | 'factory') => {
        if (type === 'padron' && confirmText !== "REINICIAR_TODO_EL_PADRON") {
            setMessage({ type: "error", text: "Texto de confirmación incorrecto." });
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setMessage({ type: "error", text: "No hay sesión activa. Por favor, cierra sesión e inicia de nuevo." });
                return;
            }
            const response = await axios.post(`/api/socios/reset-${type}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Reset response:", response.data);
            setMessage({ type: "success", text: `¡Sistema reiniciado! Se eliminaron ${response.data.eliminados?.socios || 0} socios, ${response.data.eliminados?.asistencias || 0} asistencias, ${response.data.eliminados?.asignaciones || 0} asignaciones.` });
            setConfirmText("");
            setIsAdminMode(false);
        } catch (error: any) {
            console.error("Error en reset:", error);
            setMessage({ type: "error", text: "Error al reiniciar: " + (error.message || "Error desconocido") });
        } finally {
            setLoading(false);
        }
    };

    // Función simplificada de reset-usando endpoint principal
    const handleSimpleReset = async (options: any = {}) => {
        setLoading(true);
        setMessage(null);
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("No hay sesión activa. Recarga la página.");

            // Usar el endpoint oficial que borra todo con opciones
            const response = await axios.post("/api/socios/reset-padron", options, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Reset response:", response.data);
            setMessage({
                type: "success",
                text: `¡Limpieza completada! ${response.data.message}`
            });
            setIsAdminMode(false);
        } catch (error: any) {
            console.error("Error en reset:", error);
            setMessage({ type: "error", text: "Error: " + (error.response?.data?.error || error.message) });
        } finally {
            setLoading(false);
        }
    };

    const checkAccess = () => {
        if (accessCode === "226118") {
            setIsAdminMode(true);
            setAccessCode("");
            setMessage({ type: "success", text: "Modo Administrador Maestro activado." });
        } else {
            setMessage({ type: "error", text: "Código incorrecto." });
        }
    };

    const handleSearchSocio = useCallback(async (query: string) => {
        if (query.length < 2) return;
        setIsSearching(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/socios/buscar?term=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFoundSocios(response.data);
        } catch (error) {
            console.error("Error buscando socio:", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) handleSearchSocio(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearchSocio]);

    const toggleStatus = async (socioId: number, field: string, currentValue: boolean) => {
        setUpdatingSocioId(socioId);
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`/api/socios/${socioId}/estado`,
                { [field]: !currentValue },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Actualizar localmente
            setFoundSocios((prev: any[]) => prev.map((s: any) =>
                s.id === socioId ? { ...s, [field]: !currentValue } : s
            ));
        } catch (error) {
            console.error("Error actualizando estado:", error);
            alert("Error al actualizar el estado");
        } finally {
            setUpdatingSocioId(null);
        }
    };

    const isSocio = user?.rol === "USUARIO_SOCIO";
    const isSuperAdmin = user?.rol === "SUPER_ADMIN";

    return (
        <div className="max-w-4xl space-y-8 pb-20 mt-2 md:mt-0">
            <div data-tour="config-header">
                <h1 className="text-2xl font-black text-slate-800 italic uppercase tracking-tight">Mi Perfil y Configuración</h1>
                <p className="text-slate-500">Gestiona tu cuenta y parámetros del sistema</p>
            </div>

            {/* SECCIÓN PERFIL (VISIBLE PARA TODOS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
                    <div className="relative group">
                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-xl overflow-hidden">
                            {fotoPerfil || user?.fotoPerfil ? (
                                <img src={fotoPerfil || user?.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
                            ) : (
                                <UserCircle2 className="h-12 w-12 text-emerald-500" />
                            )}
                        </div>
                        <label className="absolute bottom-4 right-0 p-1.5 bg-slate-800 rounded-full text-white cursor-pointer hover:bg-black transition-colors shadow-lg">
                            <Camera className="h-3 w-3" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleFotoUpload} />
                        </label>
                    </div>
                    <h2 className="font-bold text-slate-800 line-clamp-1">{user?.nombreCompleto}</h2>
                    <p className="text-xs text-slate-400 font-medium mb-4">@{user?.username}</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                        <UserCircle2 className="h-3 w-3" />
                        ROL: {user?.rol}
                    </div>
                </div>

                <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2" data-tour="config-profile">
                        <Key className="h-4 w-4 text-emerald-500" />
                        <h2 className="text-sm font-bold text-slate-700 uppercase">Datos Personales & Seguridad</h2>
                    </div>

                    <form onSubmit={handleSavePersonal} className="p-5 space-y-4 border-b border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Información Básica</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Correo Gmail (Para Notificaciones)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="email"
                                        placeholder="usuario@gmail.com"
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 ring-emerald-500 outline-none"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        pattern=".*@gmail\.com"
                                        title="Debe ser una dirección @gmail.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Teléfono /WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        placeholder="+595 981 ..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 ring-emerald-500 outline-none"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={savingPersonal}
                                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingPersonal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                Guardar Datos
                            </button>
                        </div>
                    </form>

                    <form onSubmit={handleChangePassword} className="p-5 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Seguridad de la Cuenta</h3>
                        {message && message.text.includes("Contraseña") && (
                            <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-teal-500' : 'bg-red-50 text-red-700'}`}>
                                {message.type === 'success' ? <Check className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                                {message.text}
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-4">
                            <input
                                type="password"
                                placeholder="Contraseña Actual"
                                className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 ring-emerald-500 outline-none"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                    type="password"
                                    placeholder="Nueva Contraseña"
                                    className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 ring-emerald-500 outline-none"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Confirmar Nueva"
                                    className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 ring-emerald-500 outline-none"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={savingPass}
                            className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-500 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            {savingPass ? "Guardando..." : "Actualizar Contraseña"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Sección Guía de Principiante */}
            <div className="rounded-2xl bg-white p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-200">
                            <HelpCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Guía de Principiante</h2>
                            <p className="text-sm text-slate-500">
                                ¿Necesitas ver el tutorial de nuevo? Reinícialo aquí.
                            </p>
                        </div>
                    </div>
                    <button
                        data-tour="config-guide"
                        onClick={handleResetTour}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-200"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reiniciar Guía
                    </button>
                </div>
            </div>

            {/* Sección Notificaciones - Visible para TODOS */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-5 sm:p-6 border border-indigo-100 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="p-2.5 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-200 shrink-0">
                            <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-slate-800">Notificaciones del Sistema</h2>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                {notificationsEnabled
                                    ? 'Recibes mensajes de bienvenida y estadísticas al iniciar sesión.'
                                    : 'No recibirás notificaciones automáticas.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleNotifications}
                        className={`relative inline-flex h-8 w-14 sm:h-9 sm:w-16 items-center rounded-full transition-all shadow-inner shrink-0 ${notificationsEnabled
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : 'bg-slate-300'
                            }`}
                    >
                        <span
                            className={`inline-block h-6 w-6 sm:h-7 sm:w-7 transform rounded-full bg-white shadow-lg transition-transform flex items-center justify-center ${notificationsEnabled ? 'translate-x-7 sm:translate-x-8' : 'translate-x-1'
                                }`}
                        >
                            {notificationsEnabled ? (
                                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                            ) : (
                                <X className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                            )}
                        </span>
                    </button>
                </div>
            </div>

            {/* Sección Cerrar Todas las Sesiones */}
            <div className="rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 p-6 border border-red-100 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-200">
                            <ShieldAlert className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Seguridad de la Cuenta</h2>
                            <p className="text-sm text-slate-500">
                                Si sospechas que alguien accedió a tu cuenta, cierra todas las sesiones.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogoutAllSessions}
                        disabled={closingSessions}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold text-sm hover:from-red-600 hover:to-orange-600 transition-all shadow-lg shadow-red-200 disabled:opacity-50"
                    >
                        {closingSessions ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                        Cerrar Todas las Sesiones
                    </button>
                </div>
            </div>

            {/* Configuración de Spotlight - Disponible para todos */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 space-y-6">
                <ConfiguracionSpotlight />
            </div>

            {/* Sección Instalar App Móvil - Visible para TODOS los usuarios */}
            <PWAInstallSection />

            {isSuperAdmin && (
                <>
                    <div className="h-px bg-slate-100 my-8"></div>


                    {/* Otras Configuraciones de Asamblea */}
                    <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 space-y-6">
                        <ConfiguracionEvento />
                        <ConfiguracionMensajeWhatsApp />
                        <ConfiguracionCheckin />
                        <ConfiguracionMantenimiento />
                        <ConfiguracionNotificaciones />
                        <ConfiguracionFechaLimite />
                        <ConfiguracionGestionListas />
                        <ConfiguracionSoloVozVoto />
                        <ConfiguracionModoPrueba />
                    </div>


                    <ResetOptionsPanel isAdminMode={isAdminMode} accessCode={accessCode} setAccessCode={setAccessCode} checkAccess={checkAccess} setIsAdminMode={setIsAdminMode} loading={loading} handleReset={handleSimpleReset} />


                    {/* Hidden Master Override Section */}
                    <div className="pt-20 pb-10 border-t border-slate-100 mt-12">
                        {!isAdminMode ? (
                            <div className="flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
                                <div className="p-2 bg-slate-100 rounded-full">
                                    <Key className="h-4 w-4 text-slate-400" />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Master Override</p>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && checkAccess()}
                                        placeholder="••••••"
                                        className="w-40 rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm outline-none focus:border-slate-400 shadow-sm"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl bg-white p-8 shadow-2xl border-4 border-emerald-500/20 space-y-8 animate-in zoom-in-95 duration-300">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-200">
                                            <ShieldAlert className="h-7 w-7 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Modificador Maestro</h2>
                                            <p className="text-emerald-500 text-xs font-black uppercase tracking-widest">Control Total de Estados</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsAdminMode(false)}
                                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Buscar socio para forzar cambio de estado..."
                                            className="w-full rounded-2xl bg-slate-50 border-2 border-slate-100 px-14 py-5 text-xl outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner font-bold"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {isSearching && (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 animate-spin text-emerald-500" />
                                        )}
                                    </div>

                                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {foundSocios.map((socio: any) => (
                                            <div key={socio.id} className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center justify-between gap-6 hover:border-emerald-200 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                                        <UserCircle2 className="h-7 w-7 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-lg line-clamp-1">{socio.nombreCompleto}</p>
                                                        <div className="flex gap-2 items-center text-xs text-slate-500 font-medium">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded italic"># {socio.numeroSocio}</span>
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded">CI: {socio.cedula}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const current = (socio as any).habilitadoVozVoto || '';
                                                            const isVoto = current.toUpperCase().includes('VOTO');
                                                            const newValue = isVoto ? 'SOLO VOZ' : 'VOZ Y VOTO';
                                                            setUpdatingSocioId(socio.id);
                                                            try {
                                                                const token = localStorage.getItem("token");
                                                                await axios.patch(`/api/socios/${socio.id}/estado`,
                                                                    { habilitadoVozVoto: newValue },
                                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                                );
                                                                setFoundSocios((prev: any[]) => prev.map((s: any) =>
                                                                    s.id === socio.id ? { ...s, habilitadoVozVoto: newValue } : s
                                                                ));
                                                            } catch {
                                                                alert("Error al actualizar");
                                                            } finally {
                                                                setUpdatingSocioId(null);
                                                            }
                                                        }}
                                                        disabled={updatingSocioId === socio.id}
                                                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border-2 ${(socio as any).habilitadoVozVoto?.toUpperCase().includes('VOTO')
                                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
                                                            : (socio as any).habilitadoVozVoto
                                                                ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                                                                : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        {(socio as any).habilitadoVozVoto || 'Sin estado'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

