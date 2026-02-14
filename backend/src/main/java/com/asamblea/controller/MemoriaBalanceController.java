package com.asamblea.controller;

import com.asamblea.service.MemoriaBalanceService;
import com.asamblea.dto.LoginMemoriaDTO;
import com.asamblea.dto.MemoriaBalanceResponseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/memoria-balance")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MemoriaBalanceController {

    private final MemoriaBalanceService memoriaBalanceService;

    /**
     * Endpoint de login para el módulo de Memoria y Balance
     * Usuario: Número de socio
     * Contraseña: Cédula
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginMemoriaDTO loginDTO) {
        try {
            log.info("Intento de login en Memoria y Balance - Usuario: {}", loginDTO.getNumeroSocio());

            MemoriaBalanceResponseDTO response = memoriaBalanceService.autenticarSocio(
                    loginDTO.getNumeroSocio(),
                    loginDTO.getCedula());

            log.info("Login exitoso para socio: {}", loginDTO.getNumeroSocio());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error en login de Memoria y Balance: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Credenciales inválidas. Verifique su número de socio y cédula.");
        }
    }

    /**
     * Endpoint para verificar si el token de sesión es válido
     */
    @GetMapping("/verificar-sesion")
    public ResponseEntity<?> verificarSesion(@RequestHeader("Authorization") String token) {
        try {
            boolean esValido = memoriaBalanceService.verificarToken(token);
            if (esValido) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        } catch (Exception e) {
            log.error("Error al verificar sesión: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Endpoint para obtener información del socio autenticado
     */
    @GetMapping("/info-socio")
    public ResponseEntity<?> getInfoSocio(@RequestHeader("Authorization") String token) {
        try {
            MemoriaBalanceResponseDTO info = memoriaBalanceService.obtenerInfoSocio(token);
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            log.error("Error al obtener info del socio: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Token inválido o expirado");
        }
    }
}
