package com.asamblea.service;

import com.asamblea.model.Socio;
import com.asamblea.repository.SocioRepository;
import com.asamblea.dto.MemoriaBalanceResponseDTO;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemoriaBalanceService {

    private final SocioRepository socioRepository;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    /**
     * Autentica a un socio usando su número de socio y cédula
     */
    public MemoriaBalanceResponseDTO autenticarSocio(String numeroSocio, String cedula) {
        log.info("Autenticando socio: {}", numeroSocio);

        // Buscar socio por número de socio
        Socio socio = socioRepository.findByNumeroSocio(numeroSocio)
                .orElseThrow(() -> new RuntimeException("Socio no encontrado"));

        // Verificar que la cédula coincida
        if (!socio.getCedula().equals(cedula)) {
            log.warn("Intento de login fallido - Cédula incorrecta para socio: {}", numeroSocio);
            throw new RuntimeException("Credenciales inválidas");
        }

        // Verificar que esté en el padrón actual
        if (!socio.isEnPadronActual()) {
            log.warn("Intento de login de socio no activo: {}", numeroSocio);
            throw new RuntimeException("El socio no está activo en el padrón actual");
        }

        // Generar token JWT
        String token = generarToken(socio);

        // Crear respuesta
        MemoriaBalanceResponseDTO response = new MemoriaBalanceResponseDTO();
        response.setToken(token);
        response.setNumeroSocio(socio.getNumeroSocio());
        response.setNombreCompleto(socio.getNombreCompleto());
        response.setSucursal(socio.getSucursal() != null ? socio.getSucursal().getNombre() : "Sin sucursal");

        log.info("Autenticación exitosa para socio: {} - {}", numeroSocio, socio.getNombreCompleto());

        return response;
    }

    /**
     * Genera un token JWT para el socio autenticado
     */
    private String generarToken(Socio socio) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("numeroSocio", socio.getNumeroSocio());
        claims.put("nombreCompleto", socio.getNombreCompleto());
        claims.put("tipo", "memoria-balance");

        return Jwts.builder()
                .claims(claims)
                .subject(socio.getNumeroSocio())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSignInKey())
                .compact();
    }

    /**
     * Genera la clave de firma para JWT
     */
    private SecretKey getSignInKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Verifica si un token es válido
     */
    public boolean verificarToken(String token) {
        try {
            // Remover "Bearer " si está presente
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            Claims claims = Jwts.parser()
                    .verifyWith(getSignInKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            // Verificar que sea un token de memoria-balance
            String tipo = (String) claims.get("tipo");
            return "memoria-balance".equals(tipo);

        } catch (Exception e) {
            log.error("Token inválido: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Obtiene la información del socio desde el token
     */
    public MemoriaBalanceResponseDTO obtenerInfoSocio(String token) {
        try {
            // Remover "Bearer " si está presente
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            Claims claims = Jwts.parser()
                    .verifyWith(getSignInKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            MemoriaBalanceResponseDTO response = new MemoriaBalanceResponseDTO();
            response.setNumeroSocio((String) claims.get("numeroSocio"));
            response.setNombreCompleto((String) claims.get("nombreCompleto"));

            return response;

        } catch (Exception e) {
            log.error("Error al obtener info del socio: {}", e.getMessage());
            throw new RuntimeException("Token inválido");
        }
    }
}
