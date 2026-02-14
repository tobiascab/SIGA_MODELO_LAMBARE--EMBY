package com.asamblea.controller;

import com.asamblea.dto.BackupHistorialDTO;
import com.asamblea.dto.ConfiguracionBackupDTO;
import com.asamblea.model.BackupHistorial.TipoBackup;
import com.asamblea.service.BackupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/backups")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class BackupController {

    private static final Logger logger = LoggerFactory.getLogger(BackupController.class);

    @Autowired
    private BackupService backupService;

    @Autowired
    private com.asamblea.service.LogAuditoriaService auditService;

    /**
     * Obtiene la configuración actual de backups
     */
    @GetMapping("/config")
    public ResponseEntity<ConfiguracionBackupDTO> getConfiguracion() {
        try {
            ConfiguracionBackupDTO config = backupService.getConfiguracion();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            logger.error("Error al obtener configuración de backup: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Actualiza la configuración de backups
     */
    @PutMapping("/config")
    public ResponseEntity<?> actualizarConfiguracion(@RequestBody ConfiguracionBackupDTO dto,
            Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        try {
            ConfiguracionBackupDTO config = backupService.actualizarConfiguracion(dto);

            // Auditoría
            auditService.registrar(
                    "BACKUP",
                    "ACTUALIZAR_CONFIGURACION",
                    String.format("Actualizó configuración de backups. Habilitado: %b",
                            dto.getBackupAutomaticoActivo()),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(config);
        } catch (Exception e) {
            logger.error("Error al actualizar configuración de backup: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Verifica el código de acceso al historial
     */
    @PostMapping("/verificar-codigo")
    public ResponseEntity<?> verificarCodigo(@RequestBody Map<String, String> request) {
        try {
            String codigo = request.get("codigo");
            if (codigo == null || codigo.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Código requerido"));
            }

            boolean valido = backupService.verificarCodigoAcceso(codigo);
            return ResponseEntity.ok(Map.of("valido", valido));
        } catch (Exception e) {
            logger.error("Error al verificar código: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Crea un backup manual
     */
    @PostMapping("/crear")
    public ResponseEntity<?> crearBackup(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        try {
            String usuario = auth.getName();
            BackupHistorialDTO backup = backupService.crearBackup(usuario, TipoBackup.MANUAL);

            // Auditoría
            auditService.registrar(
                    "BACKUP",
                    "CREAR_BACKUP",
                    String.format("Creó backup manual: %s", backup.getNombreArchivo()),
                    usuario,
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Backup creado exitosamente",
                    "backup", backup));
        } catch (Exception e) {
            logger.error("Error al crear backup: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Obtiene el historial de backups
     */
    @GetMapping("/historial")
    public ResponseEntity<?> getHistorial() {
        try {
            List<BackupHistorialDTO> historial = backupService.getHistorial();
            return ResponseEntity.ok(historial);
        } catch (Exception e) {
            logger.error("Error al obtener historial: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Restaura un backup específico
     */
    @PostMapping("/restaurar/{id}")
    public ResponseEntity<?> restaurarBackup(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Authentication auth,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        try {
            String confirmacion = request.get("confirmacion");
            if (!"RESTAURAR".equals(confirmacion)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Debe escribir 'RESTAURAR' para confirmar"));
            }

            String usuario = auth.getName();
            backupService.restaurarBackup(id, usuario);

            // Auditoría
            auditService.registrar(
                    "BACKUP",
                    "RESTAURAR_BACKUP",
                    String.format("Restauró backup con ID: %d", id),
                    usuario,
                    httpRequest.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Backup restaurado exitosamente",
                    "advertencia", "Se recomienda reiniciar la aplicación para aplicar todos los cambios"));
        } catch (Exception e) {
            logger.error("Error al restaurar backup: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Obtiene información sobre el último backup de seguridad disponible para
     * deshacer
     */
    @GetMapping("/undo-info")
    public ResponseEntity<?> getUndoInfo() {
        try {
            BackupHistorialDTO backup = backupService.getUltimoBackupPreRestauracion();
            if (backup == null) {
                return ResponseEntity.ok(Map.of("disponible", false));
            }
            return ResponseEntity.ok(Map.of(
                    "disponible", true,
                    "backup", backup));
        } catch (Exception e) {
            logger.error("Error al obtener info de undo: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Deshace la última restauración (restaura el backup de seguridad)
     */
    @PostMapping("/undo")
    public ResponseEntity<?> undoRestoration(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        try {
            String usuario = auth.getName();
            backupService.restaurarUltimoUndo(usuario);

            // Auditoría
            auditService.registrar(
                    "BACKUP",
                    "UNDO_RESTAURACION",
                    "Deshizo la última restauración de base de datos",
                    usuario,
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Restauración deshecha exitosamente. El sistema ha vuelto al estado anterior.",
                    "advertencia", "Se recomienda recargar la página."));
        } catch (Exception e) {
            logger.error("Error al deshacer restauración: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
