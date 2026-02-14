"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import axios from "axios";

type ImportStats = {
    totalRows: number;
    imported: number;
    nuevos: number;
    actualizados: number;
    errors: number;
    duplicados: number;
    duplicadosDetalle: DuplicateDetail[];
    sinCedula: number;
    sinNombre: number;
    filasVacias: number;
    timeMs: number;
    rowsPerSecond: number;
    sociosEliminados?: number;
    sociosInactivados?: number;
    usuariosCreados?: number;
    mode?: string;
};

type DuplicateDetail = {
    row: number;
    cedula: string;
    nombre: string;
};

type ErrorDetail = {
    row: number;
    cedula: string;
    message: string;
};

type ImportContextType = {
    isImporting: boolean;
    isUploading: boolean;
    progress: number;
    processId: string | null;
    stats: ImportStats | null;
    error: string | null;
    errorDetails: ErrorDetail[];
    startImport: (file: File, endpoint?: string) => Promise<void>;
    cancelImport: () => Promise<void>;
    resetImport: () => void;
};

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export function ImportProvider({ children }: { children: any }) {
    // Initialize state from localStorage if available
    const [isImporting, setIsImporting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [processId, setProcessId] = useState<string | null>(null);
    const [stats, setStats] = useState<ImportStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ErrorDetail[]>([]);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // We don't have useAuth available globally easily without circular deps sometimes, relative import might fail if context doesn't exist.
    // We'll read token directly from localStorage for the background polling to ensure robustness.

    useEffect(() => {
        // Restore state on mount 
        const storedProcessId = localStorage.getItem("import_processId");
        const storedIsImporting = localStorage.getItem("import_isImporting") === "true";

        if (storedProcessId && storedIsImporting) {
            setProcessId(storedProcessId);
            setIsImporting(true);
            startPolling(storedProcessId);
        }
    }, []);

    const startImport = async (file: File, endpoint: string = "/api/socios/import") => {
        setError(null);
        setStats(null);
        setProgress(0);
        setIsUploading(true);

        const token = localStorage.getItem("token");
        if (!token) {
            setError("No hay sesión activa");
            setIsUploading(false);
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(endpoint, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
                onUploadProgress: (progressEvent) => {
                    // Upload is fast, we can ignore or just set a small initial progress
                },
            });

            const { processId: newProcessId } = response.data;
            setProcessId(newProcessId);
            setIsImporting(true);

            // Persist
            localStorage.setItem("import_processId", newProcessId);
            localStorage.setItem("import_isImporting", "true");

            startPolling(newProcessId);
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al iniciar importación");
            setIsImporting(false);
        } finally {
            setIsUploading(false);
        }
    };

    const startPolling = (id: string) => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = setInterval(async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const res = await axios.get(`/api/socios/import-progress/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const status = res.data;
                setProgress(status.progress || 0);

                if (status.completed) {
                    stopPolling();
                    setIsImporting(false);
                    localStorage.removeItem("import_isImporting");
                    // Keep processId in local storage? maybe not needed once done.

                    if (status.error) {
                        setError(status.error);
                    } else {
                        setStats(status.result as ImportStats);
                    }
                    if (status.errorDetails && status.errorDetails.length > 0) {
                        setErrorDetails(status.errorDetails);
                    }
                }
            } catch (error: any) {
                console.error("Polling error", error);
                // Si es error de autenticación (401 o 403), detener y avisar
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    stopPolling();
                    setIsImporting(false);
                    localStorage.removeItem("import_isImporting");
                    localStorage.removeItem("import_processId");
                    setError("Sesión expirada. Por favor, recarga la página e inicia sesión nuevamente.");
                }
            }
        }, 200); // Poll every 200ms for smoother UX
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const cancelImport = async () => {
        if (!processId) return;
        try {
            const token = localStorage.getItem("token");
            await axios.post(`/api/socios/import/cancel/${processId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setError("Importación cancelada.");
        } catch (error) {
            console.error("Error cancelando", error);
        } finally {
            stopPolling();
            setIsImporting(false);
            setIsUploading(false);
        }
    };

    const resetImport = () => {
        stopPolling();
        setIsImporting(false);
        setIsUploading(false);
        setProgress(0);
        setProcessId(null);
        setStats(null);
        setError(null);
        setErrorDetails([]);
        localStorage.removeItem("import_processId");
        localStorage.removeItem("import_isImporting");
    };

    return (
        <ImportContext.Provider value={{ isImporting, isUploading, progress, processId, stats, error, errorDetails, startImport, cancelImport, resetImport }}>
            {children}
        </ImportContext.Provider>
    );
};

export function useImport() {
    const context = useContext(ImportContext);
    if (context === undefined) {
        throw new Error("useImport must be used within an ImportProvider");
    }
    return context;
}
