/**
 * Biometric Authentication Helper
 * Uses WebAuthn API to enable fingerprint/Face ID login
 * Works on: Android (fingerprint), iOS (Face ID/Touch ID), Windows Hello
 */

const BIOMETRIC_CRED_KEY = "biometric-credentials";
const BIOMETRIC_ENABLED_KEY = "biometric-enabled";

// Simple XOR-based obfuscation (not cryptographic security, but prevents casual reading)
function obfuscate(text: string, key: string): string {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
}

function deobfuscate(encoded: string, key: string): string {
    const text = atob(encoded);
    let result = "";
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

const OBF_KEY = "siga-lambarecooperativa2026";

/**
 * Check if biometric authentication is available on this device
 */
export async function isBiometricAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) return false;

    try {
        // Check if platform authenticator (fingerprint/face) is available
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    } catch {
        return false;
    }
}

/**
 * Check if biometric login is already set up for this device
 */
export function isBiometricEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true" &&
        localStorage.getItem(BIOMETRIC_CRED_KEY) !== null;
}

/**
 * Save credentials for biometric access (after successful password login)
 */
export function saveBiometricCredentials(username: string, password: string): void {
    const data = JSON.stringify({ username, password });
    const encoded = obfuscate(data, OBF_KEY);
    localStorage.setItem(BIOMETRIC_CRED_KEY, encoded);
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
}

/**
 * Retrieve stored credentials (only accessible after biometric verification)
 */
function getStoredCredentials(): { username: string; password: string } | null {
    const encoded = localStorage.getItem(BIOMETRIC_CRED_KEY);
    if (!encoded) return null;

    try {
        const data = deobfuscate(encoded, OBF_KEY);
        return JSON.parse(data);
    } catch {
        return null;
    }
}

/**
 * Trigger biometric verification and return stored credentials if successful
 * This prompts the user for fingerprint/Face ID
 */
export async function authenticateWithBiometric(): Promise<{ username: string; password: string } | null> {
    if (!isBiometricEnabled()) return null;

    try {
        // Create a challenge for WebAuthn
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        // Try to use an existing credential or create a temporary verification
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: {
                    name: "SIGA - Sistema de Asambleas",
                    id: window.location.hostname,
                },
                user: {
                    id: new Uint8Array(16),
                    name: "siga-biometric-user",
                    displayName: "Acceso Biométrico SIGA",
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },   // ES256
                    { alg: -257, type: "public-key" },  // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // Only device biometrics (not USB keys)
                    userVerification: "required",        // MUST verify with biometric
                    residentKey: "discouraged",
                },
                timeout: 60000,
                attestation: "none",
            },
        });

        if (credential) {
            // Biometric verification successful - return stored credentials
            return getStoredCredentials();
        }

        return null;
    } catch (err: any) {
        // User cancelled or biometric failed
        console.log("[Biometric] Verification cancelled or failed:", err.name);

        // If credential already exists, try to get instead of create
        if (err.name === "InvalidStateError") {
            try {
                const challenge = new Uint8Array(32);
                crypto.getRandomValues(challenge);

                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge,
                        rpId: window.location.hostname,
                        userVerification: "required",
                        timeout: 60000,
                    },
                });

                if (assertion) {
                    return getStoredCredentials();
                }
            } catch {
                return null;
            }
        }

        return null;
    }
}

/**
 * Remove biometric data
 */
export function disableBiometric(): void {
    localStorage.removeItem(BIOMETRIC_CRED_KEY);
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
}
