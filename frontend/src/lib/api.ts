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
// NOTA: Solo 401 es tratado como sesión expirada definitiva.
// Los 403 NO se tratan como sesión expirada porque Spring Security devuelve 403
// tanto para JWT expirado como para @PreAuthorize denegado (falta de permisos),
// y no hay forma confiable de distinguirlos desde el frontend.
// En el backend, el JwtAuthenticationFilter simplemente continúa la cadena sin
// autenticar si el token es inválido, lo que produce 403 (no 401).
function isSessionExpired(error: any): boolean {
    if (!error.response) return false;
    const status = error.response.status;

    // 401 siempre indica sesión expirada/inválida — esto es definitivo
    if (status === 401) return true;

    // 403: NO forzar logout. Un 403 puede ser:
    //  - Falta de permisos del rol (@PreAuthorize)
    //  - Modo mantenimiento activo
    //  - JWT expirado (Spring Security default)
    // Como NO podemos distinguirlos de forma confiable, no cerramos sesión.
    // El InactivityGuard con su timer de 60 min se encarga del cierre correcto.

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
