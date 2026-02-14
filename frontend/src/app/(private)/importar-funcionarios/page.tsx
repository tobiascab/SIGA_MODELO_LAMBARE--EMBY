"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2, Users, Database, Lock, Unlock, Download, ChevronRight, Zap, ShieldCheck, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// Componente reutilizable para cada módulo de importación
interface ImportModuleProps {
    title: string;
    subtitle: string;
    icon: React.ComponentType<any>;
    gradientFrom: string;
    gradientVia: string;
    gradientTo: string;
    accentColor: string;
    accentColorLight: string;
    countEndpoint: string;
    importEndpoint: string;
    entityName: string;
    columnInfo: string;
    templateUrl: string;
}

function ImportModule({
    title,
    subtitle,
    icon: Icon,
    gradientFrom,
    gradientVia,
    gradientTo,
    accentColor,
    accentColorLight,
    countEndpoint,
    importEndpoint,
    entityName,
    columnInfo,
    templateUrl
}: ImportModuleProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const [dbCount, setDbCount] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [loadingDb, setLoadingDb] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        checkDbStatus();
    }, []);

    const checkDbStatus = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(countEndpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const total = response.data.total || 0;
            setDbCount(total);
            if (total > 0) {
                setIsLocked(true);
            }
        } catch (error) {
            console.error("Error verificando DB:", error);
        } finally {
            setLoadingDb(false);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isUploading && progress < 90) {
            interval = setInterval(() => {
                setProgress(prev => {
                    const next = prev + Math.random() * 10;
                    return next > 90 ? 90 : next;
                });
            }, 200);
        }
        return () => clearInterval(interval);
    }, [isUploading, progress]);

    const startImport = async (selectedFile: File) => {
        setError(null);
        setStats(null);
        setProgress(0);
        setIsUploading(true);
        setIsImporting(true);

        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await axios.post(importEndpoint, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            setProgress(100);
            setIsUploading(false);

            const data = response.data;
            setStats({
                totalRows: data.total,
                imported: data.importados,
                updated: data.actualizados,
                errors: data.errores,
                mensajesError: data.mensajesError
            });

            checkDbStatus();

        } catch (err: any) {
            console.error("Error en importación:", err);
            setError(err.response?.data?.error || "Error al importar el archivo. Verifique el formato.");
            setIsUploading(false);
            setIsImporting(false);
        }
    };

    const resetImport = () => {
        setIsImporting(false);
        setIsUploading(false);
        setProgress(0);
        setStats(null);
        setError(null);
        setFile(null);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLocked) return;
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
        if (isLocked) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith(".xlsx")) {
                setFile(droppedFile);
                startImport(droppedFile);
            } else {
                setError("Solo archivos .xlsx permitidos");
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            startImport(selectedFile);
        }
    };

    const formatNumber = (num: number) => num?.toLocaleString() || '0';

    const getStep = () => {
        if (stats) return 3;
        if (isImporting || isUploading) return 2;
        return 1;
    };
    const currentStep = getStep();

    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
            {/* Header del módulo */}
            <div className={`relative overflow-hidden bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo} p-6 text-white`}>
                <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Icon className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">{title}</h2>
                            <p className="text-sm opacity-80">{subtitle}</p>
                        </div>
                    </div>

                    {/* Switch de protección */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-wider">
                                {isLocked ? "Protegida" : "Edición"}
                            </span>
                            <span className="text-[10px] font-medium opacity-70">
                                {dbCount} {entityName}
                            </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!isLocked}
                                onChange={() => setIsLocked(!isLocked)}
                            />
                            <div className="w-10 h-5 bg-white/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
                <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`relative flex flex-col items-center justify-center rounded-2xl border-3 border-dashed p-8 text-center transition-all duration-300 bg-slate-50/50 overflow-hidden
                                    ${dragActive ? `border-${accentColor} bg-${accentColorLight}/50 scale-[0.99]` : "border-slate-200 hover:border-slate-300"}`}
                                style={{ borderColor: dragActive ? accentColor : undefined }}
                            >
                                {/* Overlay de Bloqueo */}
                                {isLocked && (
                                    <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 cursor-not-allowed">
                                        <Lock className="h-8 w-8 text-slate-400 mb-3" />
                                        <h3 className="text-lg font-bold text-slate-700">Base Protegida</h3>
                                        <p className="text-xs text-slate-500 max-w-[200px] mt-1">
                                            Desactiva el modo protección para importar
                                        </p>
                                    </div>
                                )}

                                <div className={`mb-4 p-4 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-lg`}>
                                    <Icon className="h-8 w-8" />
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 mb-1">
                                    Arrastra tu Excel
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">
                                    <span className="font-semibold">{columnInfo}</span>
                                </p>

                                <div className="flex gap-2 w-full max-w-xs">
                                    <button
                                        onClick={() => !isLocked && fileInputRef.current?.click()}
                                        disabled={isLocked}
                                        className={`flex-1 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        Elegir Archivo
                                    </button>
                                    <button
                                        onClick={() => window.open(templateUrl, '_blank')}
                                        className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                                        title="Descargar Plantilla"
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} className="hidden" disabled={isLocked} />

                                {error && (
                                    <motion.div
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs"
                                    >
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span className="font-medium">{error}</span>
                                    </motion.div>
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
                            className="flex flex-col items-center py-8"
                        >
                            <div className="relative w-32 h-32 mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="none"
                                        className="text-slate-100"
                                    />
                                    <motion.circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke={accentColor}
                                        strokeWidth="8"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeDasharray="352"
                                        initial={{ strokeDashoffset: 352 }}
                                        animate={{ strokeDashoffset: 352 - (352 * progress) / 100 }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-black" style={{ color: accentColor }}>
                                        {Math.round(progress)}%
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Procesando...</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-2">
                                <Loader2 className="w-3 h-3 animate-spin" style={{ color: accentColor }} />
                                Importando {entityName.toLowerCase()}
                            </p>
                        </motion.div>
                    )}

                    {currentStep === 3 && stats && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="text-center mb-6">
                                <div className="inline-flex p-3 rounded-full mb-3" style={{ backgroundColor: accentColorLight }}>
                                    <CheckCircle2 className="h-8 w-8" style={{ color: accentColor }} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">¡Importación Exitosa!</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {[
                                    { label: "Total", val: stats.totalRows ?? 0, color: "text-slate-700", bg: "bg-slate-50" },
                                    { label: "Nuevos", val: stats.imported ?? 0, color: accentColor, bg: accentColorLight },
                                    { label: "Actualizados", val: stats.updated ?? 0, color: "text-blue-600", bg: "bg-blue-50" },
                                    { label: "Errores", val: stats.errors ?? 0, color: "text-red-500", bg: "bg-red-50" }
                                ].map((stat, i) => (
                                    <div key={i} className={`p-4 rounded-xl ${stat.bg} flex flex-col items-center`}>
                                        <span
                                            className={`text-2xl font-black ${typeof stat.color === 'string' && !stat.color.startsWith('#') ? stat.color : ''}`}
                                            style={{ color: typeof stat.color === 'string' && stat.color.startsWith('#') ? stat.color : undefined }}
                                        >
                                            {formatNumber(stat.val)}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase opacity-60">{stat.label}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={resetImport}
                                className="w-full py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all active:scale-95"
                            >
                                Nueva Importación
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function ImportarOperadoresPage() {
    return (
        <div className="min-h-screen bg-slate-50/50" style={{ padding: 'clamp(1rem, 3vw, 3rem)' }}>
            <div className="mx-auto space-y-8" style={{ maxWidth: 'clamp(320px, 95vw, 1400px)' }}>

                {/* Header General */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-4">
                        <Zap className="h-3 w-3" />
                        Gestión de Personal
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">
                        Importar Operadores
                    </h1>
                    <p className="text-slate-500 max-w-xl mx-auto">
                        Carga las bases de datos de operadores y asesores de crédito.
                        Su acceso al sistema se creará automáticamente al importar el padrón.
                    </p>
                </div>

                {/* Grid de módulos */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Módulo Operadores */}
                    <ImportModule
                        title="Operadores y Directivos"
                        subtitle="Personal operativo y directivo"
                        icon={Users}
                        gradientFrom="from-indigo-600"
                        gradientVia="via-indigo-500"
                        gradientTo="to-violet-500"
                        accentColor="#6366f1"
                        accentColorLight="#e0e7ff"
                        countEndpoint="/api/funcionarios/count/funcionarios"
                        importEndpoint="/api/funcionarios/importar"
                        entityName="Operadores"
                        columnInfo="Nro Socio | Nombre | CI"
                        templateUrl="/plantilla_funcionarios.xlsx"
                    />

                    {/* Módulo Asesores */}
                    <ImportModule
                        title="Asesores de Crédito"
                        subtitle="Gestores comerciales"
                        icon={Briefcase}
                        gradientFrom="from-orange-500"
                        gradientVia="via-amber-500"
                        gradientTo="to-yellow-500"
                        accentColor="#f97316"
                        accentColorLight="#ffedd5"
                        countEndpoint="/api/funcionarios/count/asesores"
                        importEndpoint="/api/funcionarios/importar/asesores"
                        entityName="Asesores"
                        columnInfo="Nro Socio | Nombre | Sucursal"
                        templateUrl="/plantilla_asesores.xlsx"
                    />
                </div>

                {/* Info adicional */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Database className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">Formato Excel</h3>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Ambos tipos requieren archivos <span className="font-semibold text-indigo-600">.xlsx</span>.
                            Descarga las plantillas para asegurar el formato correcto.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            </div>
                            <h3 className="font-bold text-slate-800">Protección de Datos</h3>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Cada base tiene su propio modo de protección.
                            Desactívalo solo cuando necesites hacer cambios.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-amber-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">Creación de Usuarios</h3>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Los usuarios se crean automáticamente cuando se importa el padrón de socios
                            y coinciden los números de socio.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
