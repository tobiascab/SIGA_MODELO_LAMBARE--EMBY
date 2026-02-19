package com.asamblea.controller;

import com.asamblea.model.Asistencia;
import com.asamblea.model.Socio;
import com.asamblea.model.Usuario;
import com.asamblea.model.Asignacion;
import com.asamblea.model.Asamblea;
import com.asamblea.repository.AsistenciaRepository;
import com.asamblea.repository.AsignacionRepository;
import com.asamblea.repository.SocioRepository;
import com.asamblea.repository.UsuarioRepository;
import com.asamblea.repository.AsambleaRepository;
import com.asamblea.service.LogAuditoriaService;
import com.asamblea.service.MesaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;

@RestController
@RequestMapping("/api/asistencia")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:6001")
@SuppressWarnings("null")
public class AsistenciaController {

    private final AsistenciaRepository asistenciaRepository;
    private final AsignacionRepository asignacionRepository;
    private final SocioRepository socioRepository;
    private final UsuarioRepository usuarioRepository;
    private final AsambleaRepository asambleaRepository;
    private final LogAuditoriaService auditService;
    private final MesaService mesaService;

    @GetMapping("/hoy")
    public ResponseEntity<?> asistenciasHoy() {
        List<Asistencia> asistencias = asistenciaRepository.findAll();

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Asistencia a : asistencias) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", a.getId());
            item.put("socioNombre", a.getSocio().getNombreCompleto());
            item.put("socioNumero", a.getSocio().getNumeroSocio());
            item.put("vozVoto", a.getEstadoVozVoto() != null ? a.getEstadoVozVoto() : false);
            item.put("fechaHora", a.getFechaHora());
            // Añadir sucursal del socio para estadísticas por sucursal
            item.put("sucursal",
                    a.getSocio().getSucursal() != null ? a.getSocio().getSucursal().getNombre() : "Sin Sucursal");
            resultado.add(item);
        }

        return ResponseEntity.ok(resultado);
    }

    @PostMapping("/marcar")
    public ResponseEntity<?> marcarAsistencia(@RequestBody Map<String, Object> body, Authentication auth,
            HttpServletRequest request) {
        try {
            Long socioId = Long.valueOf(body.get("socioId").toString());

            // Obtener el operador actual
            Usuario operador = usuarioRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Operador no encontrado: " + auth.getName()));

            // Obtener socio
            Socio socio = socioRepository.findById(socioId)
                    .orElseThrow(() -> new RuntimeException("Socio no encontrado con ID: " + socioId));

            // Obtener ASAMBLEA ACTIVA (Fix: id_asamblea cannot be null)
            Asamblea asamblea = asambleaRepository.findTopByActivoTrueOrderByFechaDesc()
                    .orElseThrow(() -> new RuntimeException(
                            "NO_ASAMBLEA_ACTIVA: No hay ninguna asamblea activa configurada en el sistema."));

            // VALIDACIÓN: Verificar si el socio ya tiene asistencia registrada para ESTA
            // asamblea
            // (Nota: idealmente findFirstBySocioId debería filtrar por asambleaId también,
            // pero por ahora usamos el existente)
            Optional<Asistencia> asistenciaExistente = asistenciaRepository.findFirstBySocioId(socioId);
            if (asistenciaExistente.isPresent()) {
                // Verificar si es de la misma asamblea (si la lógica de negocio lo requiere)
                // Por ahora asumimos que si ya marcó, ya marcó.
                Asistencia yaRegistrada = asistenciaExistente.get();
                // Verificar si ya tiene asistencia registrada (independiente de la asamblea)
                // Política actual: Bloquear registro duplicado.

                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "SOCIO_YA_INGRESO");
                errorResponse.put("message", "Este socio ya se encuentra en la asamblea");
                errorResponse.put("socioNombre", socio.getNombreCompleto());
                errorResponse.put("socioNumero", socio.getNumeroSocio());
                errorResponse.put("horaIngreso", yaRegistrada.getFechaHora());
                errorResponse.put("operadorRegistro", yaRegistrada.getOperador() != null
                        ? yaRegistrada.getOperador().getNombreCompleto()
                        : "Sistema");
                return ResponseEntity.status(409).body(errorResponse);
            }

            // Calcular estado voz y voto
            boolean vozVoto = socio.isEstadoVozVoto();

            // Crear asistencia
            Asistencia asistencia = new Asistencia();
            asistencia.setSocio(socio);
            asistencia.setOperador(operador);
            asistencia.setAsamblea(asamblea); // <--- ASIGNACIÓN FALTANTE
            asistencia.setEstadoVozVoto(vozVoto);
            asistencia.setFechaHora(LocalDateTime.now());

            Asistencia guardada = asistenciaRepository.save(asistencia);

            auditService.registrar(
                    "ASISTENCIA",
                    "MARCAR_ASISTENCIA",
                    String.format("Marcó asistencia del socio #%s (%s). Voto: %s", socio.getNumeroSocio(),
                            socio.getNombreCompleto(), vozVoto ? "SÍ" : "NO"),
                    auth.getName(),
                    request.getRemoteAddr());

            // Calcular mesa asignada
            Map<String, Object> mesaInfo = mesaService.calcularMesa(socio);

            // Calcular Número de Orden (Ranking en Padrón Activo)
            Long numeroOrden = socioRepository.calcularNumeroOrden(socio.getNumeroSocio());

            Map<String, Object> response = new HashMap<>();
            response.put("id", guardada.getId());
            response.put("mensaje", "Asistencia registrada exitosamente");
            response.put("socioNombre", socio.getNombreCompleto());
            response.put("socioNumero", socio.getNumeroSocio());
            response.put("numeroOrden", numeroOrden);
            response.put("vozVoto", vozVoto);
            response.put("mesa", mesaInfo);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ELIMINAR ASISTENCIA (Solo SUPER_ADMIN) =====
    @DeleteMapping("/eliminar/{socioId}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> eliminarAsistencia(@PathVariable Long socioId, Authentication auth,
            HttpServletRequest request) {
        try {
            // Verificar permisos - Solo SUPER_ADMIN puede eliminar
            Usuario currentUser = usuarioRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            if (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "Solo el Super Administrador puede eliminar registros de asistencia"));
            }

            // Verificar que existe la asistencia
            Optional<Asistencia> asistenciaOpt = asistenciaRepository.findFirstBySocioId(socioId);
            if (asistenciaOpt.isEmpty()) {
                return ResponseEntity.status(404)
                        .body(Map.of("error", "No se encontró registro de asistencia para este socio"));
            }

            Asistencia asistencia = asistenciaOpt.get();
            Socio socio = asistencia.getSocio();

            // Eliminar la asistencia
            asistenciaRepository.deleteBySocioId(socioId);

            // Registrar en auditoría
            auditService.registrar(
                    "ASISTENCIA",
                    "ELIMINAR_ASISTENCIA",
                    String.format("Eliminó asistencia del socio #%s (%s)", socio.getNumeroSocio(),
                            socio.getNombreCompleto()),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Asistencia eliminada correctamente",
                    "socioNombre", socio.getNombreCompleto(),
                    "socioNumero", socio.getNumeroSocio()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ELIMINAR TODAS LAS ASISTENCIAS (Solo SUPER_ADMIN con código de
    // seguridad) =====
    @DeleteMapping("/eliminar-todas")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> eliminarTodasAsistencias(@RequestBody Map<String, String> body, Authentication auth,
            HttpServletRequest request) {
        try {
            // Verificar permisos - Solo SUPER_ADMIN puede eliminar
            Usuario currentUser = usuarioRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            if (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN) {
                return ResponseEntity.status(403)
                        .body(Map.of("error",
                                "Solo el Super Administrador puede eliminar todos los registros de asistencia"));
            }

            // Verificar código de seguridad
            String codigoSeguridad = body.get("codigoSeguridad");
            if (codigoSeguridad == null || !codigoSeguridad.equals("ELIMINAR-TODO-2026")) {
                return ResponseEntity.status(400)
                        .body(Map.of("error", "Código de seguridad incorrecto"));
            }

            // Contar asistencias antes de eliminar
            long totalAntes = asistenciaRepository.count();

            // Eliminar todas las asistencias
            asistenciaRepository.deleteAll();

            // Registrar en auditoría
            auditService.registrar(
                    "ASISTENCIA",
                    "ELIMINAR_TODAS_ASISTENCIAS",
                    String.format("Eliminó TODAS las asistencias (%d registros)", totalAntes),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Todas las asistencias fueron eliminadas correctamente",
                    "totalEliminados", totalAntes));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== LISTAR TODAS LAS ASISTENCIAS PARA GESTIÓN (Solo SUPER_ADMIN) =====
    @GetMapping("/gestion")
    public ResponseEntity<?> listarAsistenciasGestion(
            @RequestParam(required = false) String busqueda,
            Authentication auth) {
        try {
            // Verificar permisos - Solo SUPER_ADMIN
            Usuario currentUser = usuarioRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            if (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "Solo el Super Administrador puede acceder a esta función"));
            }

            List<Asistencia> asistencias = asistenciaRepository.findAll();

            List<Map<String, Object>> resultado = new ArrayList<>();
            for (Asistencia a : asistencias) {
                Socio socio = a.getSocio();

                // Filtrar por búsqueda si se proporciona
                if (busqueda != null && !busqueda.isEmpty()) {
                    String searchLower = busqueda.toLowerCase();
                    boolean matches = (socio.getNumeroSocio() != null
                            && socio.getNumeroSocio().toLowerCase().contains(searchLower)) ||
                            (socio.getNombreCompleto() != null
                                    && socio.getNombreCompleto().toLowerCase().contains(searchLower))
                            ||
                            (socio.getCedula() != null && socio.getCedula().toLowerCase().contains(searchLower));
                    if (!matches)
                        continue;
                }

                Map<String, Object> item = new HashMap<>();
                item.put("id", a.getId());
                item.put("socioId", socio.getId());
                item.put("socioNombre", socio.getNombreCompleto());
                item.put("socioNumero", socio.getNumeroSocio());
                item.put("cedulaSocio", socio.getCedula());
                item.put("vozVoto", a.getEstadoVozVoto() != null ? a.getEstadoVozVoto() : false);
                item.put("fechaHora", a.getFechaHora());
                item.put("sucursal", socio.getSucursal() != null ? socio.getSucursal().getNombre() : "Sin Sucursal");
                item.put("operador", a.getOperador() != null ? a.getOperador().getNombreCompleto() : "Sistema");
                item.put("operadorUsername", a.getOperador() != null ? a.getOperador().getUsername() : "-");
                resultado.add(item);
            }

            // Ordenar por fecha más reciente primero
            resultado.sort((a, b) -> {
                LocalDateTime fa = (LocalDateTime) a.get("fechaHora");
                LocalDateTime fb = (LocalDateTime) b.get("fechaHora");
                if (fa == null)
                    return 1;
                if (fb == null)
                    return -1;
                return fb.compareTo(fa);
            });

            return ResponseEntity.ok(Map.of(
                    "asistencias", resultado,
                    "total", resultado.size()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Ranking de operadores por cantidad de registros (Quien marcó la asistencia en puerta)
    @GetMapping("/ranking-operadores")
    public ResponseEntity<?> rankingOperadores() {
        List<Asistencia> asistencias = asistenciaRepository.findAll();

        // Agrupar por el USUARIO que marcó la asistencia (Operador de Puerta)
        Map<Long, Map<String, Object>> rankingMap = new HashMap<>();

        for (Asistencia a : asistencias) {
            Usuario responsable = a.getOperador();

            if (responsable != null) {
                Long userId = responsable.getId();
                if (!rankingMap.containsKey(userId)) {
                    Map<String, Object> userData = new HashMap<>();
                    userData.put("id", userId);
                    userData.put("nombre", responsable.getNombreCompleto() != null ? responsable.getNombreCompleto() : responsable.getUsername());
                    userData.put("username", responsable.getUsername());
                    userData.put("totalRegistros", 0);
                    userData.put("vozYVoto", 0);
                    userData.put("soloVoz", 0);
                    rankingMap.put(userId, userData);
                }

                Map<String, Object> data = rankingMap.get(userId);
                data.put("totalRegistros", (int) data.get("totalRegistros") + 1);

                if (Boolean.TRUE.equals(a.getEstadoVozVoto())) {
                    data.put("vozYVoto", (int) data.get("vozYVoto") + 1);
                } else {
                    data.put("soloVoz", (int) data.get("soloVoz") + 1);
                }
            }
        }

        List<Map<String, Object>> ranking = new ArrayList<>(rankingMap.values());
        ranking.sort((a, b) -> (int) b.get("totalRegistros") - (int) a.get("totalRegistros"));

        return ResponseEntity.ok(ranking);
    }

    // ===== REPORTE ADMIN: Asistencias registradas por un operador específico =====
    @GetMapping("/admin/por-operador/{operadorId}")
    public ResponseEntity<?> asistenciasPorOperador(@PathVariable Long operadorId, Authentication auth) {
        // Verificar permisos (SUPER_ADMIN o DIRECTIVO)
        Usuario currentUser = usuarioRepository.findByUsername(auth.getName()).orElse(null);
        if (currentUser == null ||
                (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN && currentUser.getRol() != Usuario.Rol.DIRECTIVO)) {
            return ResponseEntity.status(403).body(Map.of("error", "No tiene permisos para ver este reporte"));
        }

        // Obtener operador
        Optional<Usuario> operadorOpt = usuarioRepository.findById(operadorId);
        if (operadorOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Operador no encontrado"));
        }
        Usuario operador = operadorOpt.get();

        // Obtener asistencias registradas por este operador
        List<Asistencia> asistencias = asistenciaRepository.findByOperadorId(operadorId);

        List<Map<String, Object>> sociosAsistencia = new ArrayList<>();
        int totalVyV = 0;
        int totalSoloVoz = 0;

        for (Asistencia a : asistencias) {
            Socio socio = a.getSocio();
            if (socio != null) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", a.getId());
                item.put("cedula", socio.getCedula() != null ? socio.getCedula() : "-");
                item.put("nombreCompleto",
                        socio.getNombreCompleto() != null ? socio.getNombreCompleto() : "Sin Nombre");
                item.put("numeroSocio", socio.getNumeroSocio() != null ? socio.getNumeroSocio() : "-");

                // Fecha/Hora Ingreso Asamblea
                item.put("fechaHoraIngreso", a.getFechaHora());
                item.put("horaIngreso", a.getFechaHora() != null ? a.getFechaHora().toLocalTime().toString() : "-");

                // Buscar fecha de asignación a lista
                java.util.Optional<Asignacion> asignacionOpt = asignacionRepository.findBySocioId(socio.getId());
                LocalDateTime fechaAsignacion = null;
                String asignadoPor = "-";
                if (asignacionOpt.isPresent()) {
                    Asignacion asig = asignacionOpt.get();
                    fechaAsignacion = asig.getFechaAsignacion();
                    if (asig.getAsignadoPor() != null) {
                        asignadoPor = asig.getAsignadoPor().getNombreCompleto();
                    }
                }
                item.put("fechaHoraLista", fechaAsignacion);
                item.put("asignadoPor", asignadoPor);

                // Registrado por (quien marcó asistencia)
                item.put("registradoPor", a.getOperador() != null ? a.getOperador().getNombreCompleto() : "Sistema");

                boolean esVyV = Boolean.TRUE.equals(a.getEstadoVozVoto());
                item.put("condicion", esVyV ? "VOZ Y VOTO" : "SOLO VOZ");
                item.put("esVyV", esVyV);
                sociosAsistencia.add(item);

                if (esVyV)
                    totalVyV++;
                else
                    totalSoloVoz++;
            }
        }

        // Ordenar por hora de registro
        sociosAsistencia.sort((a, b) -> {
            LocalDateTime fa = (LocalDateTime) a.get("fechaHoraIngreso");
            LocalDateTime fb = (LocalDateTime) b.get("fechaHoraIngreso");
            if (fa == null)
                return 1;
            if (fb == null)
                return -1;
            return fa.compareTo(fb);
        });

        Map<String, Object> response = new HashMap<>();
        response.put("operador", Map.of(
                "id", operador.getId(),
                "nombre", operador.getNombreCompleto() != null ? operador.getNombreCompleto() : "Sin Nombre",
                "username", operador.getUsername(),
                "rol", operador.getRol()));
        response.put("asistencias", sociosAsistencia);
        response.put("stats", Map.of(
                "total", sociosAsistencia.size(),
                "vyv", totalVyV,
                "soloVoz", totalSoloVoz));

        return ResponseEntity.ok(response);
    }

    // ===== MI REPORTE: Socios asignados a las listas del usuario autenticado =====
    @GetMapping("/mi-reporte")
    public ResponseEntity<?> miReporte(Authentication auth) {
        // Obtener usuario autenticado
        Usuario usuario = usuarioRepository.findByUsername(auth.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Usuario no autenticado"));
        }

        List<Map<String, Object>> misRegistros = new ArrayList<>();
        int totalVyV = 0;
        int totalSoloVoz = 0;
        int totalPropios = 0;
        int totalDePunteros = 0;

        // IDs de usuarios a incluir: el propio + sus punteros (si es dirigente)
        List<Long> usuarioIds = new ArrayList<>();
        usuarioIds.add(usuario.getId());
        Map<Long, String> punteroNombres = new HashMap<>();

        // Si es dirigente, incluir también los punteros activos
        if (Boolean.TRUE.equals(usuario.getIsDirigente())) {
            List<Usuario> punteros = usuarioRepository.findByDirigenteIdAndActivoTrue(usuario.getId());
            for (Usuario p : punteros) {
                usuarioIds.add(p.getId());
                punteroNombres.put(p.getId(), p.getNombreCompleto());
            }
        }

        // Obtener todas las asignaciones y filtrar por usuarios relevantes
        List<Asignacion> todasAsignaciones = asignacionRepository.findAll();

        for (Asignacion a : todasAsignaciones) {
            if (a.getListaAsignacion() != null &&
                    a.getListaAsignacion().getUsuario() != null &&
                    usuarioIds.contains(a.getListaAsignacion().getUsuario().getId())) {

                Socio socio = a.getSocio();
                if (socio != null) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", a.getId());
                    item.put("cedula", socio.getCedula() != null ? socio.getCedula() : "-");
                    item.put("nombreCompleto",
                            socio.getNombreCompleto() != null ? socio.getNombreCompleto() : "Sin Nombre");
                    item.put("numeroSocio", socio.getNumeroSocio() != null ? socio.getNumeroSocio() : "-");

                    item.put("fechaHoraLista", a.getFechaAsignacion());

                    Optional<Asistencia> asistenciaOpt = asistenciaRepository.findFirstBySocioId(socio.getId());
                    if (asistenciaOpt.isPresent()) {
                        item.put("fechaHoraIngreso", asistenciaOpt.get().getFechaHora());
                    } else {
                        item.put("fechaHoraIngreso", null);
                    }

                    boolean esVyV = socio.isEstadoVozVoto();
                    item.put("condicion", esVyV ? "VOZ Y VOTO" : "SOLO VOZ");
                    item.put("esVyV", esVyV);
                    item.put("listaAsignacion", a.getListaAsignacion().getNombre());

                    // Identificar origen: propio o puntero
                    Long listOwner = a.getListaAsignacion().getUsuario().getId();
                    if (listOwner.equals(usuario.getId())) {
                        item.put("origen", "PROPIO");
                        item.put("punteroNombre", null);
                        totalPropios++;
                    } else {
                        item.put("origen", "PUNTERO");
                        item.put("punteroNombre", punteroNombres.getOrDefault(listOwner, "Puntero"));
                        totalDePunteros++;
                    }

                    misRegistros.add(item);

                    if (esVyV)
                        totalVyV++;
                    else
                        totalSoloVoz++;
                }
            }
        }

        // Ordenar por fecha de asignación a la lista
        misRegistros.sort((a, b) -> {
            LocalDateTime fa = (LocalDateTime) a.get("fechaHoraLista");
            LocalDateTime fb = (LocalDateTime) b.get("fechaHoraLista");
            if (fa == null)
                return 1;
            if (fb == null)
                return -1;
            return fb.compareTo(fa);
        });

        Map<String, Object> response = new HashMap<>();
        response.put("usuario", Map.of(
                "id", usuario.getId(),
                "nombre", usuario.getNombreCompleto() != null ? usuario.getNombreCompleto() : "Sin Nombre",
                "username", usuario.getUsername(),
                "rol", usuario.getRol()));
        response.put("registros", misRegistros);

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", misRegistros.size());
        stats.put("vyv", totalVyV);
        stats.put("soloVoz", totalSoloVoz);
        stats.put("propios", totalPropios);
        stats.put("dePunteros", totalDePunteros);
        response.put("stats", stats);

        return ResponseEntity.ok(response);
    }

}

