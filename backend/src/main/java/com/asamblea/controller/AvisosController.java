package com.asamblea.controller;

import com.asamblea.model.*;
import com.asamblea.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.*;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/avisos")
@RequiredArgsConstructor
@Transactional
@CrossOrigin(origins = "*")
public class AvisosController {

    private final AvisoRepository avisoRepository;
    private final AvisoDestinatarioRepository destinatarioRepository;
    // private final NotificacionLogRepository notificacionLogRepository; // Unused
    // for now
    private final UsuarioRepository usuarioRepository;
    private final com.asamblea.service.LogAuditoriaService auditService;

    // ========================================================================
    // ADMIN: CREAR Y GESTIONAR AVISOS
    // ========================================================================

    /**
     * Crear nuevo aviso (individual/masivo/por filtro)
     */
    @PostMapping
    public ResponseEntity<?> crearAviso(@RequestBody Map<String, Object> body,
            Authentication auth, HttpServletRequest request) {
        Usuario emisor = getCurrentUser(auth);
        if (emisor == null || !isAdmin(emisor)) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo administradores pueden crear avisos"));
        }

        // Parsear datos
        String tipoStr = (String) body.get("tipo");
        String prioridadStr = (String) body.getOrDefault("prioridad", "NORMAL");
        String titulo = (String) body.get("titulo");
        String contenido = (String) body.get("contenido");
        Boolean mostrarModal = (Boolean) body.getOrDefault("mostrarModal", false);
        Boolean requiereConfirmacion = (Boolean) body.getOrDefault("requiereConfirmacion", false);
        Boolean requiereRespuesta = (Boolean) body.getOrDefault("requiereRespuesta", false);

        if (contenido == null || contenido.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El contenido es obligatorio"));
        }

        // Crear aviso
        Aviso aviso = new Aviso();
        aviso.setTipo(Aviso.TipoAviso.valueOf(tipoStr != null ? tipoStr : "MASIVO"));
        aviso.setPrioridad(Aviso.PrioridadAviso.valueOf(prioridadStr));
        aviso.setTitulo(titulo);
        aviso.setContenido(contenido.trim());
        aviso.setEmisor(emisor);
        aviso.setMostrarModal(mostrarModal);
        aviso.setRequiereConfirmacion(requiereConfirmacion);
        aviso.setRequiereRespuesta(requiereRespuesta);
        aviso.setIpEmisor(request.getRemoteAddr());
        aviso.setUserAgentEmisor(request.getHeader("User-Agent"));

        // Imagen adjunta
        String imagenUrl = (String) body.get("imagenUrl");
        if (imagenUrl != null && !imagenUrl.trim().isEmpty()) {
            aviso.setImagenUrl(imagenUrl.trim());
        }

        avisoRepository.save(aviso);

        // Crear destinatarios según tipo
        List<Usuario> destinatarios = new ArrayList<>();

        if (aviso.getTipo() == Aviso.TipoAviso.INDIVIDUAL) {
            Long usuarioId = body.get("usuarioId") != null
                    ? Long.valueOf(body.get("usuarioId").toString())
                    : null;
            if (usuarioId != null) {
                usuarioRepository.findById(usuarioId).ifPresent(destinatarios::add);
            }
        } else if (aviso.getTipo() == Aviso.TipoAviso.MASIVO) {
            // Todos los usuarios (excepto el emisor)
            destinatarios = usuarioRepository.findAll().stream()
                    .filter(u -> !u.getId().equals(emisor.getId()))
                    .toList();
        } else if (aviso.getTipo() == Aviso.TipoAviso.POR_FILTRO) {
            String filtroRol = (String) body.get("filtroRol");
            Long filtroSucursalId = body.get("filtroSucursalId") != null
                    ? Long.valueOf(body.get("filtroSucursalId").toString())
                    : null;

            aviso.setFiltroRol(filtroRol);
            aviso.setFiltroSucursalId(filtroSucursalId);
            avisoRepository.save(aviso);

            // Filtrar usuarios
            destinatarios = usuarioRepository.findAll().stream()
                    .filter(u -> !u.getId().equals(emisor.getId()))
                    .filter(u -> filtroRol == null || filtroRol.equals(u.getRol().name()))
                    .filter(u -> filtroSucursalId == null ||
                            (u.getSucursal() != null && filtroSucursalId.equals(u.getSucursal().getId())))
                    .toList();
        }

        // Crear registros de destinatario (Optimizado Batch)
        LocalDateTime now = LocalDateTime.now();
        List<AvisoDestinatario> destinatariosEntities = new ArrayList<>();
        for (Usuario dest : destinatarios) {
            AvisoDestinatario ad = new AvisoDestinatario();
            ad.setAviso(aviso);
            ad.setUsuario(dest);
            ad.setEnviadoAt(now);
            ad.setEstado(AvisoDestinatario.EstadoDestinatario.PENDIENTE);
            destinatariosEntities.add(ad);
        }
        destinatarioRepository.saveAll(destinatariosEntities);

        aviso.setEstadoGeneral(Aviso.EstadoAviso.ENVIADO);
        avisoRepository.save(aviso);

        auditService.registrar("AVISOS", "CREAR_AVISO",
                String.format("Aviso #%d creado (%s) - %d destinatarios",
                        aviso.getId(), aviso.getTipo(), destinatarios.size()),
                auth.getName(), request.getRemoteAddr());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "avisoId", aviso.getId(),
                "destinatarios", destinatarios.size()));
    }

    /**
     * Subir imagen para aviso
     */
    @PostMapping("/upload-imagen")
    public ResponseEntity<?> uploadImagen(@RequestParam("file") MultipartFile file,
            Authentication auth, HttpServletRequest request) {
        Usuario emisor = getCurrentUser(auth);
        if (emisor == null || !isAdmin(emisor)) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo administradores pueden subir imágenes"));
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El archivo está vacío"));
        }

        try {
            // Generar nombre único
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";
            String filename = "aviso_" + UUID.randomUUID().toString() + extension;

            // Directorio de uploads (Ruta dentro del contenedor Docker)
            // Asegúrate de que esta ruta coincida con el volumen montado en docker-compose
            Path uploadDir = Paths.get("/app/uploads/avisos");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            // Guardar archivo
            Path filePath = uploadDir.resolve(filename);
            Files.write(filePath, file.getBytes());

            // URL accesible (mapeada en WebMvcConfig)
            String imageUrl = "/uploads/avisos/" + filename;

            // Auditoría
            auditService.registrar("AVISOS", "UPLOAD_IMAGEN",
                    String.format("Subió imagen para aviso: %s", filename),
                    auth.getName(), request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "imagenUrl", imageUrl));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Error al guardar imagen: " + e.getMessage()));
        }
    }

    /**
     * Lista de avisos enviados (admin)
     */
    @GetMapping
    public ResponseEntity<?> listarAvisos(Authentication auth) {
        Usuario current = getCurrentUser(auth);
        if (current == null || !isAdmin(current)) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        }

        List<Aviso> avisos = avisoRepository.findAllByOrderByCreatedAtDesc();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Aviso a : avisos) {
            result.add(mapAvisoAdmin(a));
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Detalle de aviso con auditoría
     */
    @GetMapping("/{id}/auditoria")
    public ResponseEntity<?> getAuditoriaAviso(@PathVariable long id, Authentication auth) {
        Usuario current = getCurrentUser(auth);
        if (current == null || !isAdmin(current)) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
        }

        Optional<Aviso> avisoOpt = avisoRepository.findById(id);
        if (avisoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Aviso aviso = avisoOpt.get();
        List<AvisoDestinatario> destinatarios = destinatarioRepository.findByAvisoId(id);

        Map<String, Object> response = new HashMap<>();
        response.put("aviso", mapAvisoAdmin(aviso));
        response.put("destinatarios", destinatarios.stream().map(this::mapDestinatarioAuditoria).toList());

        // Estadísticas
        Map<String, Integer> stats = new HashMap<>();
        stats.put("total", destinatarios.size());
        stats.put("pendientes", (int) destinatarios.stream()
                .filter(d -> d.getEstado() == AvisoDestinatario.EstadoDestinatario.PENDIENTE).count());
        stats.put("leidos", (int) destinatarios.stream()
                .filter(d -> d.getLeidoAt() != null).count());
        stats.put("confirmados", (int) destinatarios.stream()
                .filter(d -> d.getConfirmadoAt() != null).count());
        stats.put("respondidos", (int) destinatarios.stream()
                .filter(d -> d.getRespondidoAt() != null).count());
        response.put("estadisticas", stats);

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // USUARIO: MIS AVISOS
    // ========================================================================

    /**
     * Avisos del usuario actual
     */
    @GetMapping("/mis-avisos")
    public ResponseEntity<?> misAvisos(Authentication auth) {
        Usuario current = getCurrentUser(auth);
        if (current == null)
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));

        List<AvisoDestinatario> avisos = destinatarioRepository
                .findByUsuarioIdOrderByEnviadoAtDesc(current.getId());

        List<Map<String, Object>> result = new ArrayList<>();
        for (AvisoDestinatario ad : avisos) {
            result.add(mapAvisoUsuario(ad));
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Contador de avisos no leídos
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        Usuario current = getCurrentUser(auth);
        if (current == null)
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));

        int count = destinatarioRepository.countByUsuarioIdAndLeidoAtIsNull(current.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * Marcar aviso como leído
     */
    @PutMapping("/{id}/leido")
    public ResponseEntity<?> marcarLeido(@PathVariable Long id, Authentication auth) {
        Usuario current = getCurrentUser(auth);
        if (current == null)
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));

        Optional<AvisoDestinatario> adOpt = destinatarioRepository.findByAvisoIdAndUsuarioId(id, current.getId());
        if (adOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AvisoDestinatario ad = adOpt.get();
        if (ad.getAbiertoAt() == null) {
            ad.setAbiertoAt(LocalDateTime.now());
        }
        if (ad.getLeidoAt() == null) {
            ad.setLeidoAt(LocalDateTime.now());
            ad.setEstado(AvisoDestinatario.EstadoDestinatario.LEIDO);
        }
        destinatarioRepository.save(ad);

        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Confirmar aviso ("Entendido")
     */
    @PutMapping("/{id}/confirmar")
    public ResponseEntity<?> confirmarAviso(@PathVariable Long id, Authentication auth, HttpServletRequest request) {
        Usuario current = getCurrentUser(auth);
        if (current == null)
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));

        Optional<AvisoDestinatario> adOpt = destinatarioRepository.findByAvisoIdAndUsuarioId(id, current.getId());
        if (adOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AvisoDestinatario ad = adOpt.get();
        if (ad.getLeidoAt() == null)
            ad.setLeidoAt(LocalDateTime.now());
        ad.setConfirmadoAt(LocalDateTime.now());
        ad.setEstado(AvisoDestinatario.EstadoDestinatario.CONFIRMADO);
        destinatarioRepository.save(ad);

        // Auditoría
        auditService.registrar("AVISOS", "CONFIRMAR_AVISO",
                String.format("Confirmó lectura (\"Entendido\") del aviso #%d", id),
                auth.getName(), request.getRemoteAddr());

        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Responder aviso (chip o texto libre)
     */
    @PutMapping("/{id}/responder")
    public ResponseEntity<?> responderAviso(@PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth, HttpServletRequest request) {
        Usuario current = getCurrentUser(auth);
        if (current == null)
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));

        Optional<AvisoDestinatario> adOpt = destinatarioRepository.findByAvisoIdAndUsuarioId(id, current.getId());
        if (adOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String respuestaTipo = body.get("tipo"); // "Leído", "Entendido", "A la orden", etc.
        String respuestaTexto = body.get("texto");

        AvisoDestinatario ad = adOpt.get();
        if (ad.getLeidoAt() == null)
            ad.setLeidoAt(LocalDateTime.now());
        ad.setRespondidoAt(LocalDateTime.now());
        ad.setRespuestaTipo(respuestaTipo);
        ad.setRespuestaTexto(respuestaTexto);
        ad.setEstado(AvisoDestinatario.EstadoDestinatario.RESPONDIDO);
        destinatarioRepository.save(ad);

        auditService.registrar("AVISOS", "RESPONDER_AVISO",
                String.format("Respuesta a aviso #%d: %s", id, respuestaTipo),
                auth.getName(), request.getRemoteAddr());

        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Eliminar aviso (solo admin)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarAviso(@PathVariable Long id, Authentication auth, HttpServletRequest request) {
        Usuario current = getCurrentUser(auth);
        if (current == null || !isAdmin(current)) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo administradores pueden eliminar avisos"));
        }

        Optional<Aviso> avisoOpt = avisoRepository.findById(id);
        if (avisoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Eliminar todos los destinatarios asociados primero
        List<AvisoDestinatario> destinatarios = destinatarioRepository.findByAvisoId(id);
        destinatarioRepository.deleteAll(destinatarios);

        // Eliminar el aviso
        avisoRepository.delete(avisoOpt.get());

        // Auditoría
        auditService.registrar("AVISOS", "ELIMINAR_AVISO",
                String.format("Eliminó aviso #%d: %s", id, avisoOpt.get().getTitulo()),
                auth.getName(), request.getRemoteAddr());

        return ResponseEntity.ok(Map.of("success", true, "message", "Aviso eliminado correctamente"));
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private Usuario getCurrentUser(Authentication auth) {
        if (auth == null)
            return null;
        return usuarioRepository.findByUsername(auth.getName()).orElse(null);
    }

    private boolean isAdmin(Usuario user) {
        Usuario.Rol rol = user.getRol();
        return rol == Usuario.Rol.SUPER_ADMIN || rol == Usuario.Rol.DIRECTIVO;
    }

    private Map<String, Object> mapAvisoAdmin(Aviso a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId());
        map.put("tipo", a.getTipo());
        map.put("prioridad", a.getPrioridad());
        map.put("titulo", a.getTitulo());
        map.put("contenido", a.getContenido());
        map.put("createdAt", a.getCreatedAt());
        map.put("mostrarModal", a.getMostrarModal());
        map.put("requiereConfirmacion", a.getRequiereConfirmacion());
        map.put("requiereRespuesta", a.getRequiereRespuesta());
        map.put("estadoGeneral", a.getEstadoGeneral());
        map.put("imagenUrl", a.getImagenUrl());
        if (a.getEmisor() != null) {
            map.put("emisorNombre", a.getEmisor().getNombreCompleto());
        }
        return map;
    }

    private Map<String, Object> mapAvisoUsuario(AvisoDestinatario ad) {
        Map<String, Object> map = new HashMap<>();
        Aviso a = ad.getAviso();
        map.put("id", a.getId());
        map.put("destinatarioId", ad.getId());
        map.put("titulo", a.getTitulo());
        map.put("contenido", a.getContenido());
        map.put("prioridad", a.getPrioridad());
        map.put("mostrarModal", a.getMostrarModal());
        map.put("requiereConfirmacion", a.getRequiereConfirmacion());
        map.put("requiereRespuesta", a.getRequiereRespuesta());
        map.put("enviadoAt", ad.getEnviadoAt());
        map.put("leidoAt", ad.getLeidoAt());
        map.put("confirmadoAt", ad.getConfirmadoAt());
        map.put("respondidoAt", ad.getRespondidoAt());
        map.put("estado", ad.getEstado());
        map.put("imagenUrl", a.getImagenUrl());
        if (a.getEmisor() != null) {
            map.put("emisorNombre", a.getEmisor().getNombreCompleto());
        }
        return map;
    }

    private Map<String, Object> mapDestinatarioAuditoria(AvisoDestinatario ad) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", ad.getId());
        map.put("usuarioId", ad.getUsuario().getId());
        map.put("usuarioNombre", ad.getUsuario().getNombreCompleto());
        map.put("enviadoAt", ad.getEnviadoAt());
        map.put("entregadoAt", ad.getEntregadoAt());
        map.put("notificadoPcAt", ad.getNotificadoPcAt());
        map.put("notificadoMobileAt", ad.getNotificadoMobileAt());
        map.put("abiertoAt", ad.getAbiertoAt());
        map.put("leidoAt", ad.getLeidoAt());
        map.put("confirmadoAt", ad.getConfirmadoAt());
        map.put("respondidoAt", ad.getRespondidoAt());
        map.put("respuestaTipo", ad.getRespuestaTipo());
        map.put("respuestaTexto", ad.getRespuestaTexto());
        map.put("estado", ad.getEstado());
        map.put("reintentosCount", ad.getReintentosCount());
        return map;
    }
}
