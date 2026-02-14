"use client";

import { useImport } from "@/context/ImportContext";
import { usePathname } from "next/navigation";
import { Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function ImportStatusFloating() {
    const { isImporting, progress, error, stats, resetImport } = useImport();
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);

    // Show if there is activity AND we are NOT on the import page
    // OR if it finished/errored and we haven't dismissed it yet
    useEffect(() => {
        if (pathname === "/importar") {
            setIsVisible(false);
        } else {
            if (isImporting || stats || error) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        }
    }, [pathname, isImporting, stats, error]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-2 left-2 right-2 sm:left-auto sm:bottom-6 sm:right-6 z-50 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                >
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-sm text-slate-800">
                                {isImporting ? "Importando Padrón..." : stats ? "Importación Completada" : "Error en Importación"}
                            </h4>
                            <button onClick={() => { setIsVisible(false); if (!isImporting) resetImport(); }} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>

                        {isImporting && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Procesando...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {stats && (
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                                <div className="text-xs text-slate-600">
                                    <p>Se procesaron <strong>{stats.totalRows}</strong> filas.</p>
                                    {/* <p className="text-emerald-500 font-medium cursor-pointer">Click para ver detalles</p> */}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                                <p className="text-xs text-red-600">{error}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
