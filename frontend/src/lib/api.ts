import axios from 'axios';

// API Configuration - Centralized API URL management
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://asamblea.cloud';

// Create a configured axios instance
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Lógica centralizada de detección de sesión expirada
function isSessionExpired(error: any): boolean {
    if (!error.response) return false;
    const status = error.response.status;

    // 401 siempre indica sesión expirada/inválida
    if (status === 401) return true;

    // 403 solo si es claramente un JWT expirado, NO un error de negocio
    if (status === 403) {
        const data = error.response.data;

        // Si tiene campos de negocio (bloqueado, error, etc), NO es sesión expirada
        if (data && typeof data === 'object') {
            if (data.bloqueado || data.error || data.mensaje || data.message) return false;
        }

        // Spring Security devuelve "Forbidden" como texto plano SIN body de negocio
        // cuando el JWT expiró — solo ese caso específico
        if (typeof data === 'string' && data.trim() === '') return true;
        if (typeof data === 'string' && data === 'Forbidden') return true;

        // Body completamente vacío/null = JWT rechazado por Spring Security
        if (data === null || data === undefined) return true;
    }
    return false;
}

let sessionExpiredFired = false;
function fireSessionExpired() {
    if (typeof window !== 'undefined' && !sessionExpiredFired) {
        sessionExpiredFired = true;
        window.dispatchEvent(new CustomEvent('session-expired'));
        // Reset después de 3 segundos para permitir re-disparo si es necesario
        setTimeout(() => { sessionExpiredFired = false; }, 3000);
    }
}

// Add a response interceptor to handle session expiration (instancia api)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (isSessionExpired(error)) {
            fireSessionExpired();
        }
        return Promise.reject(error);
    }
);

// Interceptor global en axios default para páginas que usan `axios` directamente
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (isSessionExpired(error)) {
            fireSessionExpired();
        }
        return Promise.reject(error);
    }
);

// For use with axios instances
export const apiConfig = {
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
};

// Helper to get API endpoint
export const getApiUrl = (endpoint: string): string => {
    return `${API_URL}${endpoint}`;
};
