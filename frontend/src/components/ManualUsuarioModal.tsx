"use client";

import { X, Book, LayoutDashboard, Users, MessageSquare, FileText, Settings, HelpCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ManualUsuarioModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SECTIONS = [
    {
        id: "intro",
        title: "Introducción",
        icon: HelpCircle,
        content: (
            <div className="space-y-4">
                <p className="text-slate-600">
                    Bienvenido al <strong className="text-emerald-500">Sistema Integral de Gestión de Asambleas (SIGA)</strong>.
                    Esta guía rápida te ayudará a entender las funciones principales del sistema para que puedas operar con confianza.
                </p>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                    <h4 className="font-bold text-emerald-500 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Objetivo del Sistema
                    </h4>
                    <p className="text-sm text-teal-500">
                        Facilitar el registro, control de quórum, gestión de votaciones y comunicación durante la asamblea de la cooperativa.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: "dashboard",
        title: "Dashboard",
        icon: LayoutDashboard,
        content: (
            <div className="space-y-4">
                <p className="text-slate-600">
                    El panel principal te ofrece una vista en tiempo real del estado de la asamblea.
                </p>
                <ul className="space-y-3">
                    <li className="flex gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold">1</div>
                        <div>
                            <span className="font-bold text-slate-800 block">KPIs en Tiempo Real</span>
                            <span className="text-sm text-slate-500">Visualiza el total de socios presentes, ausentes y el porcentaje de quórum actual.</span>
                        </div>
                    </li>
                    <li className="flex gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <div className="h-8 w-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold">2</div>
                        <div>
                            <span className="font-bold text-slate-800 block">Gráficos de Asistencia</span>
                            <span className="text-sm text-slate-500">Gráficos circulares que muestran la distribución de habilitados vs. no habilitados.</span>
                        </div>
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: "socios",
        title: "Socios",
        icon: Users,
        content: (
            <div className="space-y-4">
                <p className="text-slate-600">
                    El módulo de socios es el corazón del registro y control. Aquí puedes buscar y gestionar a los participantes.
                </p>
                <div className="grid grid-cols-1 gap-3">
                    <div className="border-l-4 border-emerald-500 bg-slate-50 p-4 rounded-r-xl">
                        <h4 className="font-bold text-slate-800">Búsqueda Rápida</h4>
                        <p className="text-sm text-slate-500 mt-1">Usa la barra superior para buscar por <strong>Nombre</strong> o <strong>Cédula</strong>. El sistema te mostrará los resultados al instante.</p>
                    </div>
                    <div className="border-l-4 border-amber-500 bg-slate-50 p-4 rounded-r-xl">
                        <h4 className="font-bold text-slate-800">Estados de Habilitación</h4>
                        <p className="text-sm text-slate-500 mt-1">Verifica si un socio tiene <strong>Voz y Voto</strong> (Verde) o <strong>Solo Voz</strong> (Amarillo) antes de permitir su ingreso.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "mensajes",
        title: "Mensajes y Chat",
        icon: MessageSquare,
        content: (
            <div className="space-y-4">
                <p className="text-slate-600">
                    Mantente conectado con el equipo de soporte y administración durante el evento.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                    <li>
                        <strong>Chat Global:</strong> Comunicación general con todos los operadores.
                    </li>
                    <li>
                        <strong>Avisos Importantes:</strong> Recibe notificaciones críticas de los administradores (ej. "Inicio de Votación").
                    </li>
                    <li>
                        <strong>Soporte:</strong> Reporta incidencias técnicas directamente desde el chat.
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: "reportes",
        title: "Reportes",
        icon: FileText,
        content: (
            <div className="space-y-4">
                <p className="text-slate-600">
                    Genera documentación oficial y listados de control.
                </p>
                <p className="text-sm text-slate-500">
                    Puedes exportar listas de asistencia, padrón de habilitados y resultados de votaciones en formato PDF o Excel para la auditoría.
                </p>
            </div>
        )
    }
];

export function ManualUsuarioModal({ isOpen, onClose }: ManualUsuarioModalProps) {
    const [activeSection, setActiveSection] = useState("intro");

    if (!isOpen) return null;

    const activeContent = SECTIONS.find(s => s.id === activeSection);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]"
                    >
                        {/* Sidebar de Navegación */}
                        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 flex flex-col">
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex items-center gap-3 text-emerald-500">
                                    <Book className="h-6 w-6" />
                                    <span className="font-black text-lg tracking-tight">Manual SIGA</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                                {SECTIONS.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeSection === section.id
                                            ? "bg-white text-teal-500 shadow-sm ring-1 ring-slate-200"
                                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                            }`}
                                    >
                                        <section.icon className={`h-4 w-4 ${activeSection === section.id ? "text-emerald-500" : "text-slate-400"}`} />
                                        {section.title}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contenido Principal */}
                        <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
                            {/* Header Móvil (Solo visible en pantallas pequeñas) */}
                            <div className="md:hidden p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                                <span className="font-bold text-slate-700 text-sm truncate">{activeContent?.title}</span>
                                <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm text-slate-500 touch-manipulation">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-10">
                                <div className="max-w-2xl mx-auto">
                                    <motion.div
                                        key={activeSection}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-100">
                                            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-emerald-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-emerald-500 flex-shrink-0">
                                                {activeContent?.icon && <activeContent.icon className="h-5 w-5 sm:h-6 sm:w-6" />}
                                            </div>
                                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                                                {activeContent?.title}
                                            </h2>
                                        </div>

                                        <div className="prose prose-slate prose-sm sm:prose-lg">
                                            {activeContent?.content}
                                        </div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Footer con Botón Cerrar - visible en todas las pantallas */}
                            <div className="p-3 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end flex-shrink-0">
                                <button
                                    onClick={onClose}
                                    className="px-5 sm:px-6 py-2 sm:py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-colors flex items-center gap-2 text-sm touch-manipulation"
                                >
                                    <span>Entendido</span>
                                    <CheckCircle2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
