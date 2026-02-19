package com.asamblea.controller;

import com.asamblea.model.Socio;
import com.asamblea.model.Asistencia;
import com.asamblea.model.Usuario;
import com.asamblea.repository.AsistenciaRepository;
import com.asamblea.repository.UsuarioRepository;
import com.asamblea.repository.ListaAsignacionRepository;
import com.asamblea.repository.AsignacionRepository;
import com.asamblea.repository.SucursalRepository;
import com.asamblea.repository.SocioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReporteController {

    private final AsistenciaRepository asistenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ListaAsignacionRepository listaAsignacionRepository;
    private final AsignacionRepository asignacionRepository;
    private final SucursalRepository sucursalRepository;
    private final SocioRepository socioRepository;
    private final com.asamblea.service.LogAuditoriaService auditService;

    /**
     * Reporte de socios agrupados por dirección
     * GET /api/reportes/por-direccion?ciudad=X&barrio=Y
     */
    @GetMapping("/por-direccion")
    public ResponseEntity<Map<String, Object>> reportePorDireccion(
            @RequestParam(required = false) String ciudad,
            @RequestParam(required = false) String barrio,
            @RequestParam(required = false) String direccion
    ) {
        List<Socio> socios = socioRepository.findAll();

        // Filtrar por parámetros
        if (ciudad != null && !ciudad.isEmpty()) {
            socios = socios.stream()
                    .filter(s -> s.getCiudad() != null && s.getCiudad().toLowerCase().contains(ciudad.toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (barrio != null && !barrio.isEmpty()) {
            socios = socios.stream()
                    .filter(s -> s.getBarrio() != null && s.getBarrio().toLowerCase().contains(barrio.toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (direccion != null && !direccion.isEmpty()) {
            socios = socios.stream()
                    .filter(s -> s.getDireccion() != null && s.getDireccion().toLowerCase().contains(direccion.toLowerCase()))
                    .collect(Collectors.toList());
        }

        // Agrupar por dirección
        Map<String, List<Socio>> porDireccion = socios.stream()
                .filter(s -> s.getDireccion() != null && !s.getDireccion().trim().isEmpty())
                .collect(Collectors.groupingBy(Socio::getDireccion));

        // Convertir a formato de respuesta
        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Map.Entry<String, List<Socio>> entry : porDireccion.entrySet()) {
            Map<String, Object> grupo = new HashMap<>();
            grupo.put("direccion", entry.getKey());
            grupo.put("cantidad", entry.getValue().size());
            grupo.put("socios", entry.getValue().stream().map(s -> {
                Map<String, Object> socioData = new HashMap<>();
                socioData.put("numeroSocio", s.getNumeroSocio());
                socioData.put("nombreCompleto", s.getNombreCompleto());
                socioData.put("cedula", s.getCedula());
                socioData.put("telefono", s.getTelefono());
                socioData.put("barrio", s.getBarrio());
                socioData.put("ciudad", s.getCiudad());
                socioData.put("sucursal", s.getSucursal() != null ? s.getSucursal().getNombre() : null);
                return socioData;
            }).collect(Collectors.toList()));
            resultado.add(grupo);
        }

        // Ordenar por cantidad descendente
        resultado.sort((a, b) -> ((Integer) b.get("cantidad")).compareTo((Integer) a.get("cantidad")));

        Map<String, Object> response = new HashMap<>();
        response.put("totalGrupos", resultado.size());
        response.put("totalSocios", socios.size());
        response.put("grupos", resultado);

        return ResponseEntity.ok(response);
    }

    /**
     * Reporte de socios agrupados por ciudad
     * GET /api/reportes/por-ciudad
     */
    @GetMapping("/por-ciudad")
    public ResponseEntity<Map<String, Object>> reportePorCiudad() {
        List<Socio> socios = socioRepository.findAll();

        Map<String, List<Socio>> porCiudad = socios.stream()
                .filter(s -> s.getCiudad() != null && !s.getCiudad().trim().isEmpty())
                .collect(Collectors.groupingBy(Socio::getCiudad));

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Map.Entry<String, List<Socio>> entry : porCiudad.entrySet()) {
            Map<String, Object> grupo = new HashMap<>();
            grupo.put("ciudad", entry.getKey());
            grupo.put("cantidad", entry.getValue().size());
            
            // Agrupar por barrio dentro de cada ciudad
            Map<String, Long> porBarrio = entry.getValue().stream()
                    .filter(s -> s.getBarrio() != null && !s.getBarrio().trim().isEmpty())
                    .collect(Collectors.groupingBy(Socio::getBarrio, Collectors.counting()));
            
            grupo.put("barrios", porBarrio);
            resultado.add(grupo);
        }

        resultado.sort((a, b) -> ((Integer) b.get("cantidad")).compareTo((Integer) a.get("cantidad")));

        Map<String, Object> response = new HashMap<>();
        response.put("totalCiudades", resultado.size());
        response.put("totalSocios", socios.size());
        response.put("ciudades", resultado);

        return ResponseEntity.ok(response);
    }

    /**
     * Reporte de socios agrupados por barrio
     * GET /api/reportes/por-barrio?ciudad=X
     */
    @GetMapping("/por-barrio")
    public ResponseEntity<Map<String, Object>> reportePorBarrio(
            @RequestParam(required = false) String ciudad
    ) {
        List<Socio> socios = socioRepository.findAll();

        if (ciudad != null && !ciudad.isEmpty()) {
            socios = socios.stream()
                    .filter(s -> s.getCiudad() != null && s.getCiudad().equalsIgnoreCase(ciudad))
                    .collect(Collectors.toList());
        }

        Map<String, List<Socio>> porBarrio = socios.stream()
                .filter(s -> s.getBarrio() != null && !s.getBarrio().trim().isEmpty())
                .collect(Collectors.groupingBy(Socio::getBarrio));

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Map.Entry<String, List<Socio>> entry : porBarrio.entrySet()) {
            Map<String, Object> grupo = new HashMap<>();
            grupo.put("barrio", entry.getKey());
            grupo.put("cantidad", entry.getValue().size());
            grupo.put("socios", entry.getValue().stream().map(s -> {
                Map<String, Object> socioData = new HashMap<>();
                socioData.put("numeroSocio", s.getNumeroSocio());
                socioData.put("nombreCompleto", s.getNombreCompleto());
                socioData.put("cedula", s.getCedula());
                socioData.put("telefono", s.getTelefono());
                socioData.put("direccion", s.getDireccion());
                socioData.put("ciudad", s.getCiudad());
                socioData.put("sucursal", s.getSucursal() != null ? s.getSucursal().getNombre() : null);
                return socioData;
            }).collect(Collectors.toList()));
            resultado.add(grupo);
        }

        resultado.sort((a, b) -> ((Integer) b.get("cantidad")).compareTo((Integer) a.get("cantidad")));

        Map<String, Object> response = new HashMap<>();
        response.put("totalBarrios", resultado.size());
        response.put("totalSocios", socios.size());
        response.put("ciudad", ciudad);
        response.put("barrios", resultado);

        return ResponseEntity.ok(response);
    }

    /**
     * Reporte de socios agrupados por sucursal
     * GET /api/reportes/por-sucursal
     */
    @GetMapping("/por-sucursal")
    public ResponseEntity<Map<String, Object>> reportePorSucursal() {
        List<Socio> socios = socioRepository.findAll();

        Map<String, List<Socio>> porSucursal = socios.stream()
                .filter(s -> s.getSucursal() != null)
                .collect(Collectors.groupingBy(s -> s.getSucursal().getNombre()));

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Map.Entry<String, List<Socio>> entry : porSucursal.entrySet()) {
            Map<String, Object> grupo = new HashMap<>();
            grupo.put("sucursal", entry.getKey());
            grupo.put("cantidad", entry.getValue().size());
            
            // Agrupar por ciudad dentro de cada sucursal
            Map<String, Long> porCiudad = entry.getValue().stream()
                    .filter(s -> s.getCiudad() != null && !s.getCiudad().trim().isEmpty())
                    .collect(Collectors.groupingBy(Socio::getCiudad, Collectors.counting()));
            
            grupo.put("ciudades", porCiudad);
            resultado.add(grupo);
        }

        resultado.sort((a, b) -> ((Integer) b.get("cantidad")).compareTo((Integer) a.get("cantidad")));

        Map<String, Object> response = new HashMap<>();
        response.put("totalSucursales", resultado.size());
        response.put("totalSocios", socios.size());
        response.put("sucursales", resultado);

        return ResponseEntity.ok(response);
    }

    /**
     * Estadísticas de datos completos
     * GET /api/reportes/estadisticas-datos
     */
    @GetMapping("/estadisticas-datos")
    public ResponseEntity<Map<String, Object>> estadisticasDatos() {
        List<Socio> socios = socioRepository.findAll();

        long total = socios.size();
        long conTelefono = socios.stream().filter(s -> s.getTelefono() != null && !s.getTelefono().trim().isEmpty()).count();
        long conCiudad = socios.stream().filter(s -> s.getCiudad() != null && !s.getCiudad().trim().isEmpty()).count();
        long conBarrio = socios.stream().filter(s -> s.getBarrio() != null && !s.getBarrio().trim().isEmpty()).count();
        long conDireccion = socios.stream().filter(s -> s.getDireccion() != null && !s.getDireccion().trim().isEmpty()).count();
        long conEdad = socios.stream().filter(s -> s.getEdad() != null && !s.getEdad().trim().isEmpty()).count();
        long conProfesion = socios.stream().filter(s -> s.getProfesion() != null && !s.getProfesion().trim().isEmpty()).count();
        long conEmail = socios.stream().filter(s -> s.getEmail() != null && !s.getEmail().trim().isEmpty()).count();

        Map<String, Object> response = new HashMap<>();
        response.put("totalSocios", total);
        response.put("conTelefono", conTelefono);
        response.put("conCiudad", conCiudad);
        response.put("conBarrio", conBarrio);
        response.put("conDireccion", conDireccion);
        response.put("conEdad", conEdad);
        response.put("conProfesion", conProfesion);
        response.put("conEmail", conEmail);
        
        response.put("porcentajeTelefono", String.format("%.2f%%", (conTelefono * 100.0 / total)));
        response.put("porcentajeCiudad", String.format("%.2f%%", (conCiudad * 100.0 / total)));
        response.put("porcentajeBarrio", String.format("%.2f%%", (conBarrio * 100.0 / total)));
        response.put("porcentajeDireccion", String.format("%.2f%%", (conDireccion * 100.0 / total)));
        response.put("porcentajeEdad", String.format("%.2f%%", (conEdad * 100.0 / total)));
        response.put("porcentajeProfesion", String.format("%.2f%%", (conProfesion * 100.0 / total)));
        response.put("porcentajeEmail", String.format("%.2f%%", (conEmail * 100.0 / total)));

        return ResponseEntity.ok(response);
    }

    // =====================================================
    // REPORTES ADICIONALES (sincronizados desde SIGA repo)
    // =====================================================

    @GetMapping("/asistencia")
    public ResponseEntity<?> obtenerReporteAsistencia(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin,
            @RequestParam(required = false) Long sucursalId,
            @RequestParam(required = false) Long operadorId,
            Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        Usuario currentUser = usuarioRepository.findByUsername(auth.getName()).orElseThrow();

        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_ASISTENCIA",
                String.format("Generó reporte de asistencia filtrado (Sucursal: %s, Operador: %s)",
                        sucursalId != null ? sucursalId : "TODAS",
                        operadorId != null ? operadorId : "TODOS"),
                auth.getName(),
                request.getRemoteAddr());

        boolean isSuperAdmin = currentUser.getRol() == Usuario.Rol.SUPER_ADMIN;

        boolean filterByAssignment = false;
        Set<Long> socioIds = new HashSet<>();

        if (!isSuperAdmin) {
            if (currentUser.getRol() == Usuario.Rol.USUARIO_SOCIO) {
                filterByAssignment = true;
                if (currentUser.getIdSocio() != null) {
                    socioIds.add(currentUser.getIdSocio());
                }
                var listas = listaAsignacionRepository.findByUsuarioId(currentUser.getId());
                for (var lista : listas) {
                    var asignaciones = asignacionRepository.findByListaAsignacionId(lista.getId());
                    for (var asignacion : asignaciones) {
                        socioIds.add(asignacion.getSocio().getId());
                    }
                }
                operadorId = null;
            } else {
                operadorId = currentUser.getId();
            }
        }

        if (filterByAssignment && socioIds.isEmpty()) {
            Map<String, Object> emptyStats = new HashMap<>();
            emptyStats.put("totalRegistros", 0);
            emptyStats.put("habilitados", 0L);
            emptyStats.put("observados", 0L);
            return ResponseEntity
                    .ok(Map.of("data", java.util.Collections.emptyList(), "stats", emptyStats));
        }

        List<Asistencia> filtradas = asistenciaRepository.findAsistenciasReporte(
                fechaInicio, fechaFin, sucursalId, operadorId, filterByAssignment,
                socioIds.isEmpty() ? java.util.Collections.singletonList(-1L) : socioIds);

        List<Map<String, Object>> reporte = filtradas.stream().map(a -> {
            Map<String, Object> fila = new HashMap<>();
            fila.put("id", a.getId());
            fila.put("fechaHora", a.getFechaHora());
            fila.put("socioId", a.getSocio().getId());
            fila.put("socioNombre", a.getSocio().getNombreCompleto());
            fila.put("socioNro", a.getSocio().getNumeroSocio());
            fila.put("cedula", a.getSocio().getCedula());
            fila.put("sucursal",
                    a.getSocio().getSucursal() != null ? a.getSocio().getSucursal().getNombre()
                            : "Sin Sucursal");
            fila.put("vozVoto", a.getEstadoVozVoto() != null && a.getEstadoVozVoto() ? "HABILITADO"
                    : "OBSERVADO");
            fila.put("operador", a.getOperador() != null ? a.getOperador().getNombreCompleto() : "Sistema");
            return fila;
        }).collect(Collectors.toList());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRegistros", reporte.size());
        stats.put("habilitados", reporte.stream().filter(r -> "HABILITADO".equals(r.get("vozVoto"))).count());
        stats.put("observados", reporte.stream().filter(r -> "OBSERVADO".equals(r.get("vozVoto"))).count());

        Map<String, Object> response = new HashMap<>();
        response.put("data", reporte);
        response.put("stats", stats);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/mis-asignados")
    public ResponseEntity<?> reporteMisAsignados(Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        Usuario currentUser = usuarioRepository.findByUsername(auth.getName()).orElseThrow();

        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_MIS_ASIGNADOS",
                "Generó reporte de sus propios socios asignados",
                auth.getName(),
                request.getRemoteAddr());

        boolean isSuperAdmin = currentUser.getRol() == Usuario.Rol.SUPER_ADMIN;
        if (currentUser.getRol() != Usuario.Rol.USUARIO_SOCIO && !isSuperAdmin) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado."));
        }

        var asignaciones = asignacionRepository.findAsignacionesReporte(currentUser.getId());

        Set<Long> socioIds = asignaciones.stream()
                .map(a -> a.getSocio().getId())
                .collect(Collectors.toSet());

        List<Asistencia> asistencias = socioIds.isEmpty() ? Collections.emptyList()
                : asistenciaRepository.findAsistenciasReporte(null, null, null, null, true, socioIds);

        Map<Long, Asistencia> asistenciaMap = asistencias.stream()
                .collect(Collectors.toMap(a -> a.getSocio().getId(), a -> a, (a1, a2) -> a1));

        List<Map<String, Object>> result = new ArrayList<>();

        for (var asignacion : asignaciones) {
            com.asamblea.model.Socio s = asignacion.getSocio();

            Map<String, Object> fila = new HashMap<>();
            fila.put("id", s.getId());
            fila.put("socioNombre", s.getNombreCompleto());
            fila.put("socioNro", s.getNumeroSocio());
            fila.put("cedula", s.getCedula());
            fila.put("sucursal",
                    s.getSucursal() != null ? s.getSucursal().getNombre() : "Sin Sucursal");
            fila.put("vozVoto", s.isEstadoVozVoto() ? "HABILITADO" : "OBSERVADO");
            fila.put("fechaAsignacion", asignacion.getFechaAsignacion());

            if (asignacion.getAsignadoPor() != null) {
                fila.put("asignadoPor", asignacion.getAsignadoPor().getNombreCompleto());
            } else {
                fila.put("asignadoPor", "Sistema / Anterior");
            }

            Asistencia asistenciaOpt = asistenciaMap.get(s.getId());
            if (asistenciaOpt != null) {
                fila.put("estado", "PRESENTE");
                fila.put("fechaHora", asistenciaOpt.getFechaHora());
                Usuario op = asistenciaOpt.getOperador();
                fila.put("operador", op != null ? op.getNombreCompleto() : "Sistema");
                fila.put("operadorId", op != null ? op.getId() : "SYS");
            } else {
                fila.put("estado", "AUSENTE");
                fila.put("fechaHora", null);
                fila.put("operador", "-");
                fila.put("operadorId", "-");
            }
            result.add(fila);
        }

        long total = result.size();
        long presentes = result.stream().filter(r -> "PRESENTE".equals(r.get("estado"))).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRegistros", total);
        stats.put("habilitados", presentes);
        stats.put("observados", total - presentes);

        Map<String, Object> response = new HashMap<>();
        response.put("data", result);
        response.put("stats", stats);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/socios-sin-asignar")
    public ResponseEntity<?> reporteSociosSinAsignar(Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        Usuario currentUser = usuarioRepository.findByUsername(auth.getName()).orElseThrow();

        if (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN && currentUser.getRol() != Usuario.Rol.DIRECTIVO) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado."));
        }

        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_SIN_ASIGNAR",
                "Generó reporte de socios sin asignar",
                auth.getName(),
                request.getRemoteAddr());

        List<Socio> sinAsignar = socioRepository.findSociosSinAsignar();

        List<Map<String, Object>> result = sinAsignar.stream().map(s -> {
            Map<String, Object> fila = new HashMap<>();
            fila.put("id", s.getId());
            fila.put("socioNombre", s.getNombreCompleto());
            fila.put("socioNro", s.getNumeroSocio());
            fila.put("cedula", s.getCedula());
            fila.put("sucursal", s.getSucursal() != null ? s.getSucursal().getNombre() : "Sin Sucursal");
            fila.put("vozVoto", s.isEstadoVozVoto() ? "HABILITADO" : "OBSERVADO");
            fila.put("estado", "SIN ASIGNAR");
            return fila;
        }).collect(Collectors.toList());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRegistros", result.size());
        stats.put("habilitados", result.stream().filter(r -> "HABILITADO".equals(r.get("vozVoto"))).count());
        stats.put("observados", result.stream().filter(r -> "OBSERVADO".equals(r.get("vozVoto"))).count());

        return ResponseEntity.ok(Map.of("data", result, "stats", stats));
    }

    @GetMapping("/estadisticas-sucursal")
    public ResponseEntity<?> reporteEstadisticasSucursal(Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        Usuario currentUser = usuarioRepository.findByUsername(auth.getName()).orElseThrow();

        if (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado."));
        }

        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_ESTADISTICAS_SUCURSAL",
                "Generó reporte estadístico por sucursal",
                auth.getName(),
                request.getRemoteAddr());

        var asistencias = asistenciaRepository.findAll();

        Map<String, List<Asistencia>> porSucursalAsist = asistencias.stream()
                .collect(Collectors.groupingBy(a -> a.getSocio().getSucursal() != null
                        ? a.getSocio().getSucursal().getNombre()
                        : "Sin Sucursal"));

        List<Map<String, Object>> result = new ArrayList<>();
        for (var entry : porSucursalAsist.entrySet()) {
            Map<String, Object> fila = new HashMap<>();
            fila.put("sucursal", entry.getKey());
            fila.put("totalPresentes", entry.getValue().size());
            long habilitados = entry.getValue().stream()
                    .filter(a -> a.getSocio().isEstadoVozVoto())
                    .count();
            fila.put("habilitados", habilitados);
            fila.put("soloVoz", entry.getValue().size() - habilitados);
            result.add(fila);
        }

        result.sort((a, b) -> Integer.compare(
                (Integer) b.get("totalPresentes"),
                (Integer) a.get("totalPresentes")));

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSucursales", result.size());
        stats.put("totalPresentes", asistencias.size());

        return ResponseEntity.ok(Map.of("data", result, "stats", stats));
    }

    @GetMapping("/socios-observados")
    public ResponseEntity<?> reporteSociosObservados(Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        Usuario currentUser = usuarioRepository.findByUsername(auth.getName()).orElseThrow();

        if (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado."));
        }

        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_SOCIOS_OBSERVADOS",
                "Generó reporte de socios observados",
                auth.getName(),
                request.getRemoteAddr());

        var asistencias = asistenciaRepository.findAll();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Asistencia a : asistencias) {
            if (!a.getSocio().isEstadoVozVoto()) {
                Map<String, Object> fila = new HashMap<>();
                fila.put("id", a.getSocio().getId());
                fila.put("socioNombre", a.getSocio().getNombreCompleto());
                fila.put("socioNro", a.getSocio().getNumeroSocio());
                fila.put("cedula", a.getSocio().getCedula());
                fila.put("sucursal",
                        a.getSocio().getSucursal() != null
                                ? a.getSocio().getSucursal().getNombre()
                                : "Sin Sucursal");
                fila.put("fechaIngreso", a.getFechaHora());
                fila.put("operador", a.getOperador() != null ? a.getOperador().getNombreCompleto()
                        : "Sistema");

                List<String> motivos = new ArrayList<>();
                String hvv = a.getSocio().getHabilitadoVozVoto();
                if (hvv == null || hvv.isBlank()) {
                    motivos.add("Sin dato de habilitación Voz/Voto");
                } else {
                    motivos.add("Estado: " + hvv);
                }
                fila.put("motivos", String.join(", ", motivos));

                result.add(fila);
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRegistros", result.size());
        stats.put("totalAsistencia", asistencias.size());
        stats.put("porcentaje", asistencias.isEmpty() ? 0 : (result.size() * 100 / asistencias.size()));

        return ResponseEntity.ok(Map.of("data", result, "stats", stats));
    }

    @GetMapping("/sucursales-lista")
    public ResponseEntity<?> listarSucursales(Authentication auth) {
        var sucursales = sucursalRepository.findAllByOrderByCodigoAsc();
        List<Map<String, Object>> result = new ArrayList<>();

        for (var suc : sucursales) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", suc.getId());
            item.put("nombre", suc.getNombre());
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/por-sucursal/{sucursalId}")
    public ResponseEntity<?> reportePorSucursalDetalle(
            @PathVariable Long sucursalId,
            @RequestParam(required = false) Long operadorId,
            Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_POR_SUCURSAL",
                String.format("Generó reporte por sucursal ID: %d", sucursalId),
                auth.getName(),
                request.getRemoteAddr());

        var asignaciones = asignacionRepository.findAsignacionesPorSucursal(sucursalId, operadorId);

        List<Asistencia> asistenciasSucursal = asistenciaRepository.findAsistenciasReporte(
                null, null, sucursalId, null, false, java.util.Collections.singletonList(-1L));

        Map<Long, Asistencia> asistenciaPorSocio = new HashMap<>();
        for (Asistencia a : asistenciasSucursal) {
            asistenciaPorSocio.put(a.getSocio().getId(), a);
        }

        Set<Long> sociosProcesados = new HashSet<>();
        List<Map<String, Object>> result = new ArrayList<>();

        for (var asig : asignaciones) {
            var socio = asig.getSocio();

            if (!sociosProcesados.contains(socio.getId())) {
                sociosProcesados.add(socio.getId());

                Map<String, Object> fila = new HashMap<>();
                fila.put("id", socio.getId());
                fila.put("socioNombre", socio.getNombreCompleto());
                fila.put("socioNro", socio.getNumeroSocio());
                fila.put("cedula", socio.getCedula());
                fila.put("sucursal",
                        socio.getSucursal() != null ? socio.getSucursal().getNombre() : "N/A");
                fila.put("vozVoto", socio.isEstadoVozVoto() ? "HABILITADO" : "OBSERVADO");
                fila.put("fechaAsignacion", asig.getFechaAsignacion());
                fila.put("operador", asig.getListaAsignacion().getUsuario().getNombreCompleto());

                Asistencia asist = asistenciaPorSocio.get(socio.getId());
                if (asist != null) {
                    fila.put("estado", "PRESENTE");
                    fila.put("fechaHora", asist.getFechaHora());
                } else {
                    fila.put("estado", "AUSENTE");
                    fila.put("fechaHora", null);
                }
                result.add(fila);
            }
        }

        long presentes = result.stream().filter(r -> "PRESENTE".equals(r.get("estado"))).count();
        long habilitados = result.stream().filter(r -> "HABILITADO".equals(r.get("vozVoto"))).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRegistros", result.size());
        stats.put("presentes", presentes);
        stats.put("ausentes", result.size() - presentes);
        stats.put("habilitados", habilitados);
        stats.put("observados", result.size() - habilitados);
        stats.put("sucursalNombre",
                sucursalRepository.findById(sucursalId).map(s -> s.getNombre()).orElse("Desconocida"));

        return ResponseEntity.ok(Map.of("data", result, "stats", stats));
    }

    @GetMapping("/asignaciones-general")
    public ResponseEntity<?> reporteAsignacionesGenerales(
            @RequestParam(required = false) Long operadorId,
            Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        Usuario currentUser = usuarioRepository.findByUsername(auth.getName()).orElseThrow();

        if (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN && currentUser.getRol() != Usuario.Rol.DIRECTIVO) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado."));
        }

        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_ASIGNACIONES_GENERAL",
                "Generó reporte general de asignaciones",
                auth.getName(),
                request.getRemoteAddr());

        var asignaciones = asignacionRepository.findAsignacionesReporte(operadorId);

        var asistencias = asistenciaRepository.findAll();

        Map<Long, Asistencia> asistenciaPorSocio = new HashMap<>();
        for (Asistencia a : asistencias) {
            asistenciaPorSocio.put(a.getSocio().getId(), a);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (var asig : asignaciones) {
            var socio = asig.getSocio();
            Map<String, Object> fila = new HashMap<>();
            fila.put("id", socio.getId());
            fila.put("socioNombre", socio.getNombreCompleto());
            fila.put("socioNro", socio.getNumeroSocio());
            fila.put("cedula", socio.getCedula());
            fila.put("sucursal",
                    socio.getSucursal() != null ? socio.getSucursal().getNombre() : "Sin Sucursal");
            fila.put("vozVoto", socio.isEstadoVozVoto() ? "HABILITADO" : "OBSERVADO");
            fila.put("operador", asig.getListaAsignacion().getUsuario().getNombreCompleto());
            fila.put("fechaAsignacion", asig.getFechaAsignacion());

            Asistencia asist = asistenciaPorSocio.get(socio.getId());
            if (asist != null) {
                fila.put("estado", "PRESENTE");
                fila.put("fechaHora", asist.getFechaHora());
            } else {
                fila.put("estado", "AUSENTE");
                fila.put("fechaHora", null);
            }
            result.add(fila);
        }

        long presentes = result.stream().filter(r -> "PRESENTE".equals(r.get("estado"))).count();
        long habilitados = result.stream().filter(r -> "HABILITADO".equals(r.get("vozVoto"))).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRegistros", result.size());
        stats.put("totalAsignados", result.size());
        stats.put("presentes", presentes);
        stats.put("ausentes", result.size() - presentes);
        stats.put("habilitados", habilitados);
        stats.put("observados", result.size() - habilitados);

        return ResponseEntity.ok(Map.of("data", result, "stats", stats));
    }

    @GetMapping("/ranking-global")
    public ResponseEntity<List<Map<String, Object>>> reporteRankingGlobal(Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_RANKING_GLOBAL",
                "Generó reporte de ranking global de operadores",
                auth.getName(),
                request.getRemoteAddr());
        List<Object[]> ranking = usuarioRepository.findRankingByAsignaciones();

        // Construir mapa de ranking por username
        Map<String, Map<String, Object>> rankingMap = new java.util.LinkedHashMap<>();
        for (Object[] row : ranking) {
            String username = (String) row[0];
            Map<String, Object> map = new HashMap<>();
            map.put("username", username);
            map.put("cargo", row[1]);
            map.put("meta", row[2]);
            map.put("registrados", row[3]);
            map.put("porcentaje", row[4]);
            map.put("nombreCompleto", row[5] != null ? row[5] : row[0]);
            map.put("sucursal", row[6] != null ? row[6] : "N/A");
            map.put("esDirigente", false);
            map.put("incluyePunteros", 0);
            map.put("registradosPunteros", 0L);
            rankingMap.put(username, map);
        }

        // Sumar asignaciones de punteros a sus dirigentes
        List<Usuario> dirigentes = usuarioRepository.findDirigentesActivos();
        for (Usuario dirigente : dirigentes) {
            String dirUsername = dirigente.getUsername();
            if (!rankingMap.containsKey(dirUsername)) continue;

            Map<String, Object> dirItem = rankingMap.get(dirUsername);
            dirItem.put("esDirigente", true);

            List<Usuario> punteros = usuarioRepository.findByDirigenteIdAndActivoTrue(dirigente.getId());
            long totalPunterosReg = 0;
            int cantPunteros = 0;

            for (Usuario puntero : punteros) {
                long asigPuntero = listaAsignacionRepository.findByUsuarioId(puntero.getId())
                        .stream()
                        .mapToLong(l -> asignacionRepository.countByListaAsignacionId(l.getId()))
                        .sum();
                totalPunterosReg += asigPuntero;
                cantPunteros++;
                rankingMap.remove(puntero.getUsername());
            }

            if (cantPunteros > 0) {
                long registradosPropios = ((Number) dirItem.get("registrados")).longValue();
                long nuevoTotal = registradosPropios + totalPunterosReg;
                dirItem.put("registrados", nuevoTotal);
                dirItem.put("registradosPunteros", totalPunterosReg);
                dirItem.put("incluyePunteros", cantPunteros);

                Integer meta = (Integer) dirItem.get("meta");
                if (meta != null && meta > 0) {
                    dirItem.put("porcentaje", nuevoTotal * 100.0 / meta);
                }
            }
        }

        // Reordenar por total
        List<Map<String, Object>> result = rankingMap.values().stream()
                .sorted((a, b) -> Long.compare(
                        ((Number) b.get("registrados")).longValue(),
                        ((Number) a.get("registrados")).longValue()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/cumplimiento-listas")
    public ResponseEntity<?> reporteCumplimientoListas(
            @RequestParam(required = false) Long sucursalId,
            Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        Usuario currentUser = usuarioRepository.findByUsername(auth.getName()).orElseThrow();

        if (currentUser.getRol() != Usuario.Rol.SUPER_ADMIN && currentUser.getRol() != Usuario.Rol.DIRECTIVO) {
            return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado."));
        }

        auditService.registrar(
                "REPORTES",
                "REPORTE_CUMPLIMIENTO_LISTAS",
                "Generó reporte de cumplimiento de listas por operador",
                auth.getName(),
                request.getRemoteAddr());

        List<com.asamblea.model.Asignacion> asignaciones;
        if (sucursalId != null) {
            asignaciones = asignacionRepository.findAsignacionesPorSucursal(sucursalId, null);
        } else {
            asignaciones = asignacionRepository.findAsignacionesReporte(null);
        }

        List<Long> sociosPresentesIds = asistenciaRepository.findAll().stream()
                .map(a -> a.getSocio().getId())
                .collect(Collectors.toList());
        Set<Long> presentesSet = new HashSet<>(sociosPresentesIds);

        Map<String, Map<String, int[]>> grouping = new HashMap<>();

        for (var asig : asignaciones) {
            String sucursalName = "Sin Sucursal";
            Usuario opUser = asig.getListaAsignacion().getUsuario();

            if (opUser.getSocio() != null && opUser.getSocio().getSucursal() != null) {
                sucursalName = opUser.getSocio().getSucursal().getNombre();
            } else if (opUser.getSucursal() != null) {
                sucursalName = opUser.getSucursal().getNombre();
            } else if (asig.getSocio().getSucursal() != null) {
                sucursalName = asig.getSocio().getSucursal().getNombre();
            }

            String operadorName = opUser.getNombreCompleto();
            if (operadorName == null || operadorName.isEmpty()) {
                operadorName = opUser.getUsername();
            }

            sucursalName = sucursalName.trim().toUpperCase();

            String opKey = opUser.getId() + "|" + operadorName;

            grouping.putIfAbsent(sucursalName, new HashMap<>());
            Map<String, int[]> opMap = grouping.get(sucursalName);

            opMap.putIfAbsent(opKey, new int[] { 0, 0 });

            int[] statsArr = opMap.get(opKey);
            statsArr[0]++;

            if (presentesSet.contains(asig.getSocio().getId())) {
                statsArr[1]++;
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();

        for (var entrySuc : grouping.entrySet()) {
            String sucName = entrySuc.getKey();
            for (var entryOp : entrySuc.getValue().entrySet()) {
                String opKey = entryOp.getKey();
                String[] parts = opKey.split("\\|", 2);
                Long opId = Long.parseLong(parts[0]);
                String opName = parts[1];

                int[] statsArr = entryOp.getValue();

                Map<String, Object> row = new HashMap<>();
                row.put("sucursal", sucName);
                row.put("operador", opName);
                row.put("operadorId", opId);
                row.put("totalAsignados", statsArr[0]);
                row.put("totalPresentes", statsArr[1]);

                double porcentaje = statsArr[0] > 0 ? ((double) statsArr[1] / statsArr[0]) * 100.0 : 0.0;
                row.put("porcentaje", Math.round(porcentaje * 100.0) / 100.0);

                result.add(row);
            }
        }

        result.sort((a, b) -> {
            int presentesCompare = Integer.compare((Integer) b.get("totalPresentes"),
                    (Integer) a.get("totalPresentes"));
            if (presentesCompare != 0)
                return presentesCompare;
            return ((String) a.get("operador")).compareTo((String) b.get("operador"));
        });

        return ResponseEntity.ok(result);
    }
}
