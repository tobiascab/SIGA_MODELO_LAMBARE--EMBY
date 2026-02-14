package com.asamblea.controller;

import com.asamblea.service.SystemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/system")
@CrossOrigin(origins = "*") // Ajustar según sea necesario
public class SystemController {

    @Autowired
    private SystemService systemService;

    @Autowired
    private com.asamblea.service.LogAuditoriaService auditService;

    @PostMapping("/reset-data")
    public ResponseEntity<?> resetData(@RequestBody Map<String, String> request,
            org.springframework.security.core.Authentication auth,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        // En una implementación real, aquí validaríamos una contraseña maestra de Super
        // Admin
        String confirm = request.get("confirm");
        if (!"REINICIAR_TODO_EL_PADRON".equals(confirm)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Confirmación incorrecta"));
        }

        systemService.resetAllData();

        // Auditoría
        auditService.registrar(
                "SISTEMA",
                "RESET_DATOS_PADRON",
                "Ejecutó REINICIAR_TODO_EL_PADRON. Se borraron socios, asignaciones y asistencias.",
                auth != null ? auth.getName() : "REMOTAMENTE",
                httpRequest.getRemoteAddr());
        return ResponseEntity.ok(Map.of("message",
                "Todos los datos de socios, asignaciones y asistencias han sido borrados. Sistema listo para padrón final."));
    }

    @PostMapping("/factory-reset")
    public ResponseEntity<?> factoryReset(@RequestBody Map<String, String> request,
            org.springframework.security.core.Authentication auth,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        String confirm = request.get("confirm");
        if (!"RESETEO_TOTAL_DE_FABRICA".equals(confirm)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Confirmación incorrecta"));
        }

        systemService.resetFullSystem();

        // Auditoría
        auditService.registrar(
                "SISTEMA",
                "FACTORY_RESET",
                "Ejecutó RESETEO_TOTAL_DE_FABRICA. El sistema volvió a su estado inicial.",
                auth != null ? auth.getName() : "REMOTAMENTE",
                httpRequest.getRemoteAddr());
        return ResponseEntity.ok(Map.of("message", "El sistema ha sido reseteado a su estado inicial de fábrica."));
    }
}
