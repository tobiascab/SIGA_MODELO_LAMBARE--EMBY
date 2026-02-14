package com.asamblea.controller;

import com.asamblea.model.Cooperativa;
import com.asamblea.repository.CooperativaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Controller para gestionar los datos de la cooperativa.
 * Esta configuración es fundamental para hacer el sistema white-label.
 */
@RestController
@RequestMapping("/api/cooperativa")
public class CooperativaController {

    @Autowired
    private CooperativaRepository cooperativaRepository;

    @Autowired
    private com.asamblea.service.LogAuditoriaService auditService;

    // Directorio donde se guardarán los logos
    private static final String UPLOAD_DIR = "/app/uploads/logos/";

    /**
     * Obtiene los datos de la cooperativa (público - sin autenticación).
     * Usado por el frontend para mostrar logo, nombre, colores, etc.
     */
    @GetMapping
    public ResponseEntity<?> obtenerDatos() {
        try {
            Cooperativa cooperativa = cooperativaRepository.findFirstByOrderByIdAsc()
                    .orElse(crearCooperativaDefault());

            return ResponseEntity.ok(cooperativa);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Obtiene datos públicos mínimos (para páginas públicas sin autenticación).
     */
    @GetMapping("/publica")
    public ResponseEntity<?> obtenerDatosPublicos() {
        try {
            Cooperativa coop = cooperativaRepository.findFirstByOrderByIdAsc()
                    .orElse(crearCooperativaDefault());

            return ResponseEntity.ok(Map.of(
                    "nombre", coop.getNombre() != null ? coop.getNombre() : "Cooperativa",
                    "nombreCorto", coop.getNombreCorto() != null ? coop.getNombreCorto() : "Coop",
                    "logo", coop.getLogo() != null ? coop.getLogo() : "/logo.png",
                    "eslogan", coop.getEslogan() != null ? coop.getEslogan() : "",
                    "colorPrimario", coop.getColorPrimario() != null ? coop.getColorPrimario() : "#A8252C",
                    "colorSecundario", coop.getColorSecundario() != null ? coop.getColorSecundario() : "#600000"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "nombre", "Cooperativa",
                    "nombreCorto", "Coop",
                    "logo", "/logo.png",
                    "eslogan", "",
                    "colorPrimario", "#A8252C",
                    "colorSecundario", "#600000"));
        }
    }

    /**
     * Actualiza los datos de la cooperativa (solo SUPER_ADMIN).
     */
    @PutMapping
    public ResponseEntity<?> actualizarDatos(@RequestBody Cooperativa datos, Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        try {
            // Verificar permisos
            if (auth == null || !auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"))) {
                return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado. Solo SUPER_ADMIN."));
            }

            Cooperativa cooperativa = cooperativaRepository.findFirstByOrderByIdAsc()
                    .orElse(new Cooperativa());

            // Actualizar campos
            if (datos.getNombre() != null)
                cooperativa.setNombre(datos.getNombre());
            if (datos.getNombreCorto() != null)
                cooperativa.setNombreCorto(datos.getNombreCorto());
            if (datos.getEslogan() != null)
                cooperativa.setEslogan(datos.getEslogan());
            if (datos.getDireccion() != null)
                cooperativa.setDireccion(datos.getDireccion());
            if (datos.getCiudad() != null)
                cooperativa.setCiudad(datos.getCiudad());
            if (datos.getPais() != null)
                cooperativa.setPais(datos.getPais());
            if (datos.getTelefono() != null)
                cooperativa.setTelefono(datos.getTelefono());
            if (datos.getTelefonoSecundario() != null)
                cooperativa.setTelefonoSecundario(datos.getTelefonoSecundario());
            if (datos.getEmail() != null)
                cooperativa.setEmail(datos.getEmail());
            if (datos.getEmailSoporte() != null)
                cooperativa.setEmailSoporte(datos.getEmailSoporte());
            if (datos.getSitioWeb() != null)
                cooperativa.setSitioWeb(datos.getSitioWeb());
            if (datos.getRuc() != null)
                cooperativa.setRuc(datos.getRuc());
            if (datos.getColorPrimario() != null)
                cooperativa.setColorPrimario(datos.getColorPrimario());
            if (datos.getColorSecundario() != null)
                cooperativa.setColorSecundario(datos.getColorSecundario());
            if (datos.getColorAcento() != null)
                cooperativa.setColorAcento(datos.getColorAcento());
            if (datos.getAnioFundacion() != null)
                cooperativa.setAnioFundacion(datos.getAnioFundacion());
            if (datos.getNumeroResolucion() != null)
                cooperativa.setNumeroResolucion(datos.getNumeroResolucion());
            if (datos.getFacebookUrl() != null)
                cooperativa.setFacebookUrl(datos.getFacebookUrl());
            if (datos.getInstagramUrl() != null)
                cooperativa.setInstagramUrl(datos.getInstagramUrl());
            if (datos.getTwitterUrl() != null)
                cooperativa.setTwitterUrl(datos.getTwitterUrl());
            if (datos.getWhatsappNumero() != null)
                cooperativa.setWhatsappNumero(datos.getWhatsappNumero());
            if (datos.getHorarioAtencion() != null)
                cooperativa.setHorarioAtencion(datos.getHorarioAtencion());
            if (datos.getTextoFooter() != null)
                cooperativa.setTextoFooter(datos.getTextoFooter());

            cooperativa.setUpdatedAt(LocalDateTime.now());
            cooperativa.setUpdatedBy(auth.getName());

            cooperativaRepository.save(cooperativa);

            // Auditoría
            auditService.registrar(
                    "CONFIGURACION",
                    "ACTUALIZAR_COOPERATIVA",
                    "Actualizó los datos generales de la cooperativa: " + cooperativa.getNombre(),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Datos de la cooperativa actualizados correctamente",
                    "cooperativa", cooperativa));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Sube el logo de la cooperativa.
     */
    @PostMapping("/logo")
    public ResponseEntity<?> subirLogo(@RequestParam("file") MultipartFile file, Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        try {
            // Verificar permisos
            if (auth == null || !auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"))) {
                return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado. Solo SUPER_ADMIN."));
            }

            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Archivo vacío"));
            }

            // Validar tipo de archivo
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Solo se permiten imágenes"));
            }

            // Crear directorio si no existe
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generar nombre único para el archivo
            String extension = getFileExtension(file.getOriginalFilename());
            String fileName = "logo_" + UUID.randomUUID().toString().substring(0, 8) + "." + extension;
            Path filePath = uploadPath.resolve(fileName);

            // Guardar archivo
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Actualizar cooperativa con la ruta del logo
            Cooperativa cooperativa = cooperativaRepository.findFirstByOrderByIdAsc()
                    .orElse(new Cooperativa());

            String logoUrl = "/uploads/logos/" + fileName;
            cooperativa.setLogo(logoUrl);
            cooperativa.setUpdatedAt(LocalDateTime.now());
            cooperativa.setUpdatedBy(auth.getName());

            cooperativaRepository.save(cooperativa);

            // Auditoría
            auditService.registrar(
                    "CONFIGURACION",
                    "ACTUALIZAR_LOGO_COOPERATIVA",
                    "Actualizó el logo de la cooperativa: " + logoUrl,
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Logo actualizado correctamente",
                    "logo", logoUrl));
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Error al guardar el archivo: " + e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Crea una cooperativa con valores por defecto (Cooperativa Multiactiva Lambaré Ltda.).
     */
    private Cooperativa crearCooperativaDefault() {
        Cooperativa coop = new Cooperativa();
        coop.setNombre("Cooperativa Multiactiva Lambaré Ltda.");
        coop.setNombreCorto("Lambaré");
        coop.setEslogan("Sistema de Asambleas");
        coop.setLogo("/logo.png");
        coop.setColorPrimario("#A8252C");
        coop.setColorSecundario("#600000");
        coop.setColorAcento("#f59e0b");
        coop.setPais("Paraguay");
        coop.setUpdatedAt(LocalDateTime.now());

        return cooperativaRepository.save(coop);
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf(".") == -1) {
            return "png";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}
