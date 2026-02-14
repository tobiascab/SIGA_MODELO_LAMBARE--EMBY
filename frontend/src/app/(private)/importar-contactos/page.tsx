"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2, X, History, User, FileSpreadsheet, ChevronRight, Zap, ShieldCheck, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useImport } from "@/context/ImportContext";
import axios from "axios";

interface ImportHistorial {
    id: number;
    fechaImportacion: string;
    usuarioImportador: string;
    totalRegistros: number;
    archivoNombre: string;
}

export default function ImportarContactosPage() {
    const { isImporting, isUploading, progress, error, errorDetails, stats, startImport, cancelImport, resetImport } = useImport();
    const [file, setFile] = useState(null as File | null);
    const [dragActive, setDragActive] = useState(false);
    const [historial, setHistorial] = useState([] as ImportHistorial[]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    const fileInputRef = useRef(null as HTMLInputElement | null);

    // Reset import context on mount to avoid stuck state from other pages
    useEffect(() => {
        resetImport();
    }, []);

    useEffect(() => {
        fetchHistorial();
    }, [stats]);

    const fetchHistorial = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("/api/socios/import-history", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistorial(response.data);
        } catch (error) {
            console.error("Error cargando historial:", error);
        } finally {
            setLoadingHistorial(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (
                droppedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                droppedFile.name.endsWith(".xlsx")
            ) {
                setFile(droppedFile);
                handleStartImport(droppedFile);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            handleStartImport(selectedFile);
        }
    };

    const handleStartImport = (file: File) => {
        // USE THE NEW UPDATE CONTACTS ENDPOINT
        startImport(file, "/api/socios/import/update-contacts");
    };

    const formatNumber = (num: number | undefined | null) => (num ?? 0).toLocaleString();
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("es-PY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    };

    // Calcular paso actual
    const getStep = () => {
        if (stats) return 3; // Finalizado
        if (isImporting || isUploading) return 2; // Procesando
        return 1; // Subir
    };
    const currentStep = getStep();

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-[1200px] mx-auto space-y-6">

                {/* Header Premium - Azul/Indigo para diferenciar de Importación Normal */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 shadow-xl shadow-blue-500/20 text-white p-8 md:p-10">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-48 w-48 rounded-full bg-black/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 shadow-lg w-fit">
                            <Phone className="h-3 w-3 text-blue-300" />
                            Actualización de Contactos
                        </div>

                        <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-sm leading-tight">
                            Importar Contactos
                        </h1>

                        <p className="text-blue-100 max-w-xl leading-relaxed opacity-90 text-sm md:text-base">
                            Actualiza teléfonos, correos y direcciones de socios existentes.<br className="hidden md:block" />
                            Este módulo <strong>NO</strong> elimina ni desactiva socios que no estén en el archivo.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* ZONA PRINCIPAL DE CARGA */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group relative rounded-3xl bg-white p-2 shadow-xl shadow-slate-200/50"
                                >
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        className={`relative flex flex-col items-center justify-center rounded-2xl border-4 border-dashed text-center transition-all duration-300 bg-white
                                            ${dragActive ? "border-blue-500 bg-blue-50/50 scale-[0.99]" : "border-slate-100 hover:border-blue-300"}`}
                                        style={{ padding: 'clamp(3rem, 6vw, 5rem)' }}
                                    >
                                        <div className="mb-6 relative">
                                            <div className="absolute inset-0 bg-blue-400/30 blur-2xl rounded-full scale-150 animate-pulse" />
                                            <div className="relative rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl ring-1 ring-black/5">
                                                <Upload className="h-10 w-10 text-blue-500" />
                                            </div>
                                        </div>

                                        <h3 className="text-xl md:text-2xl font-black text-slate-800">
                                            Subir archivo de Contactos
                                        </h3>
                                        <p className="mt-2 text-slate-500 font-medium">
                                            Soporta archivos <span className="text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-md">.xlsx</span>
                                        </p>

                                        <div className="mt-8 w-full max-w-xs">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-2 group/btn"
                                            >
                                                Elegir Archivo Excel
                                                <ChevronRight className="h-4 w-4 opacity-50 group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" />

                                        {error && (
                                            <div className="mt-6 w-full max-w-md">
                                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-3 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-lg shadow-red-500/10">
                                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                                    <span className="font-bold text-sm text-left">{error}</span>
                                                </motion.div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {isImporting && (
                                        <div className="relative overflow-hidden rounded-3xl bg-white p-12 shadow-2xl shadow-blue-500/20 border-2 border-blue-100 text-center">
                                            <div className="flex flex-col items-center justify-center gap-6">
                                                <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                                                <div>
                                                    <h2 className="text-3xl font-black text-slate-800">Procesando Contactos</h2>
                                                    <p className="text-slate-500 font-medium mt-2">Estamos actualizando la información...</p>
                                                </div>
                                                <div className="text-5xl font-black text-blue-600">
                                                    {progress}%
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {currentStep === 3 && stats && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-white rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-500/10"
                                >
                                    <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                        <div className="relative z-10 text-center">
                                            <div className="inline-flex p-4 bg-white/20 rounded-full text-white mb-4 backdrop-blur-md shadow-lg">
                                                <CheckCircle2 className="h-10 w-10" />
                                            </div>
                                            <h2 className="text-3xl font-black tracking-tight">¡Actualización Completa!</h2>
                                            <p className="text-blue-100 font-medium mt-2">Los contactos han sido actualizados correctamente.</p>
                                        </div>
                                    </div>

                                    <div className="p-8">
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            {[
                                                { label: "Total Procesados", val: stats.imported ?? 0, color: "text-slate-800", bg: "bg-slate-50", border: "border-slate-100" },
                                                { label: "Actualizados", val: stats.actualizados ?? 0, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                                                { label: "Sin Cambios/Nuevos", val: stats.nuevos ?? 0, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
                                                { label: "Errores", val: stats.errors ?? 0, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" }
                                            ].map((stat, i) => (
                                                <div key={i} className={`p-6 rounded-2xl border ${stat.bg} ${stat.border} flex flex-col items-center justify-center`}>
                                                    <span className={`text-4xl font-black ${stat.color}`}>{formatNumber(stat.val)}</span>
                                                    <span className={`text-xs font-bold uppercase mt-1 opacity-70 ${stat.color}`}>{stat.label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={resetImport}
                                            className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95"
                                        >
                                            Actualizar otro archivo
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Sidebar Instructions */}
                    <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-500/30 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <ShieldCheck className="h-6 w-6 text-indigo-200" />
                                <h4 className="font-bold text-lg">Modo Actualización</h4>
                            </div>

                            <p className="text-sm text-indigo-100 mb-4 leading-relaxed">
                                Este módulo está diseñado para enriquecer los datos de contacto sin afectar el padrón general.
                            </p>

                            <ul className="space-y-4 relative z-10">
                                {[
                                    "Solo actualiza si encuentra la Cédula",
                                    "No inactiva socios faltantes",
                                    "Sobreescribe teléfonos antiguos",
                                    "Soporta columnas: Teléfono, Móvil, Dirección, Email"
                                ].map((req, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm font-medium text-indigo-50">
                                        <div className="min-w-[4px] h-[4px] mt-2 rounded-full bg-indigo-300" />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
