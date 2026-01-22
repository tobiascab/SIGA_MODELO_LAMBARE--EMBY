'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function PageTransition() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Cargando...');

    // Textos dinámicos según la ruta
    const getLoadingText = useCallback((path: string) => {
        if (path.includes('dashboard')) return 'Cargando Dashboard...';
        if (path.includes('socios')) return 'Cargando Padrón...';
        if (path.includes('asignaciones')) return 'Cargando Asignaciones...';
        if (path.includes('reportes')) return 'Generando Reportes...';
        if (path.includes('checkin')) return 'Iniciando Check-in...';
        if (path.includes('asistencia')) return 'Cargando Asistencia...';
        if (path.includes('mensajes')) return 'Abriendo Mensajes...';
        if (path.includes('configuracion')) return 'Cargando Configuración...';
        if (path.includes('importar')) return 'Preparando Importación...';
        if (path.includes('usuarios')) return 'Cargando Usuarios...';
        return 'Cargando...';
    }, []);

    useEffect(() => {
        // Mostrar loading al iniciar navegación
        setIsLoading(true);
        setLoadingText(getLoadingText(pathname));

        // Ocultar después de un tiempo mínimo (para que la animación se vea)
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 400); // Mínimo 400ms para transición suave

        return () => clearTimeout(timer);
    }, [pathname, searchParams, getLoadingText]);

    return (
        <AnimatePresence mode="wait">
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-slate-50/95 via-white/95 to-teal-50/95 backdrop-blur-sm"
                >
                    {/* Contenedor principal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -10 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30
                        }}
                        className="flex flex-col items-center gap-6"
                    >
                        {/* Logo animado */}
                        <motion.div
                            className="relative"
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <div className="relative w-28 h-28">
                                {/* Anillo exterior giratorio */}
                                <motion.div
                                    className="absolute inset-0 rounded-full border-4 border-teal-200"
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                    style={{
                                        borderTopColor: '#14b8a6',
                                        borderRightColor: '#14b8a6',
                                    }}
                                />

                                {/* Logo central con fondo blanco */}
                                <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-slate-100">
                                    <img
                                        src="/logo-cooperativa.png"
                                        alt="Cooperativa Lambaré"
                                        className="w-16 h-16 object-contain"
                                        onError={(e) => {
                                            // Fallback a logo.png
                                            (e.target as HTMLImageElement).src = '/logo.png';
                                        }}
                                    />
                                </div>

                                {/* Partículas decorativas */}
                                <motion.div
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full"
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <motion.div
                                    className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-400 rounded-full"
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                                />
                            </div>
                        </motion.div>

                        {/* Texto de carga */}
                        <div className="text-center">
                            <motion.p
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-lg font-bold text-slate-700 mb-1"
                            >
                                {loadingText}
                            </motion.p>

                            {/* Barra de progreso animada */}
                            <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '100%' }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Ondas decorativas de fondo */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden pointer-events-none opacity-30">
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-teal-200 to-transparent"
                            animate={{
                                y: [0, -10, 0],
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
