package com.asamblea.controller;

import com.asamblea.model.Usuario;
import com.asamblea.repository.UsuarioRepository;
import com.asamblea.service.ReporteExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Controlador para Reporte de Asesores de Crédito
 * Muestra cumplimiento de meta mínima (20) y meta general (50)
 */
@RestController
@RequestMapping("/api/reportes/asesores")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@SuppressWarnings("null")
public class ReporteAsesoresController {

    private final UsuarioRepository usuarioRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ReporteExportService exportService;
    private final com.asamblea.service.LogAuditoriaService auditService;

    // Constantes de metas
    private static final int META_MINIMA = 20;
    private static final int META_GENERAL = 50;

    // Lista de números de socio y cédulas a excluir del reporte
    private static final List<String> SOCIOS_EXCLUIDOS = List.of("1", "2", "10620");
    private static final List<String> CEDULAS_EXCLUIDAS = List.of("4132544");

    /**
     * Obtener datos de todos los usuarios con su progreso hacia las metas
     * Excluye: SUPER_ADMIN y socios específicos de prueba/sistema
     */
    @GetMapping
    public ResponseEntity<?> getReporteAsesores(Authentication auth, jakarta.servlet.http.HttpServletRequest request) {
        if (auth == null)
            return ResponseEntity.status(401).build();

        // Auditoría
        auditService.registrar(
                "REPORTES",
                "GENERAR_REPORTE_ASESORES",
                "Generó reporte de cumplimiento de metas de asesores",
                auth.getName(),
                request.getRemoteAddr());

        // Obtener todos los usuarios activos, excluyendo SUPER_ADMIN y socios de
        // sistema
        List<Usuario> asesores = usuarioRepository.findAll().stream()
                .filter(Usuario::isActivo)
                .filter(u -> u.getRol() != Usuario.Rol.SUPER_ADMIN) // Excluir superadmins
                .filter(u -> {
                    // Excluir usuarios cuyos socios estén en la lista de excluidos
                    if (u.getSocio() != null) {
                        String numSocio = u.getSocio().getNumeroSocio();
                        String cedula = u.getSocio().getCedula();
                        if (numSocio != null && SOCIOS_EXCLUIDOS.contains(numSocio)) {
                            return false;
                        }
                        if (cedula != null && CEDULAS_EXCLUIDAS.contains(cedula)) {
                            return false;
                        }
                    }
                    return true;
                })
                .collect(Collectors.toList());

        // Obtener conteo de registros (asignaciones con voz y voto) por usuario
        String sql = """
                SELECT la.user_id, COUNT(*) as total
                FROM asignaciones_socios asig
                JOIN listas_asignacion la ON asig.lista_id = la.id
                GROUP BY la.user_id
                """;

        Map<Long, Long> registrosPorUsuario = jdbcTemplate.queryForList(sql).stream()
                .filter(m -> m.get("user_id") != null)
                .collect(Collectors.toMap(
                        m -> ((Number) m.get("user_id")).longValue(),
                        m -> ((Number) m.get("total")).longValue()));

        // Construir respuesta
        List<Map<String, Object>> resultado = new ArrayList<>();
        int cumplieronMeta = 0;
        int cumplieronMinimo = 0;
        int sinMinimo = 0;
        int sinGestion = 0;

        for (Usuario asesor : asesores) {
            long registrados = registrosPorUsuario.getOrDefault(asesor.getId(), 0L);
            int faltaMinimo = Math.max(0, META_MINIMA - (int) registrados);
            int faltaMeta = Math.max(0, META_GENERAL - (int) registrados);

            String estado;
            String estadoColor;
            if (registrados >= META_GENERAL) {
                estado = "✅ Cumplió Meta";
                estadoColor = "success";
                cumplieronMeta++;
            } else if (registrados >= META_MINIMA) {
                estado = "⚠️ Cumplió Mínimo";
                estadoColor = "warning";
                cumplieronMinimo++;
            } else if (registrados > 0) {
                estado = "❌ Sin Mínimo";
                estadoColor = "danger";
                sinMinimo++;
            } else {
                estado = "💤 Sin Gestión";
                estadoColor = "gray";
                sinGestion++;
            }

            // Obtener sucursal
            String sucursal = "N/A";
            if (asesor.getSucursal() != null) {
                sucursal = asesor.getSucursal().getNombre();
            } else if (asesor.getSocio() != null && asesor.getSocio().getSucursal() != null) {
                sucursal = asesor.getSocio().getSucursal().getNombre();
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", asesor.getId());
            item.put("nombreCompleto", asesor.getNombreCompleto());
            item.put("rol", asesor.getRol().getNombre()); // Agregar rol para mostrar en tabla/PDF
            item.put("sucursal", sucursal);
            item.put("registrados", registrados);
            item.put("faltaMinimo", faltaMinimo);
            item.put("faltaMeta", faltaMeta);
            item.put("estado", estado);
            item.put("estadoColor", estadoColor);
            item.put("porcentaje", Math.min(100, (registrados * 100) / META_GENERAL));

            resultado.add(item);
        }

        // Ordenar: primero los que menos tienen (más urgentes)
        resultado.sort((a, b) -> {
            long regA = (Long) a.get("registrados");
            long regB = (Long) b.get("registrados");
            return Long.compare(regA, regB);
        });

        return ResponseEntity.ok(Map.of(
                "asesores", resultado,
                "resumen", Map.of(
                        "total", asesores.size(),
                        "cumplieronMeta", cumplieronMeta,
                        "cumplieronMinimo", cumplieronMinimo,
                        "sinMinimo", sinMinimo,
                        "sinGestion", sinGestion,
                        "metaMinima", META_MINIMA,
                        "metaGeneral", META_GENERAL)));
    }

    /**
     * Generar PDF del reporte de usuarios
     * 
     * @param filtro Opcional: "cumplieron_meta", "cumplieron_minimo", "sin_minimo"
     */
    @GetMapping("/pdf")
    public ResponseEntity<byte[]> exportarPdf(
            @RequestParam(required = false) String filtro,
            Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        if (auth == null)
            return ResponseEntity.status(401).build();

        // Auditoría
        auditService.registrar(
                "REPORTES",
                "EXPORTAR_PDF_ASESORES",
                "Exportó reporte de asesores en PDF (Filtro: " + (filtro != null ? filtro : "Ninguno") + ")",
                auth.getName(),
                request.getRemoteAddr());

        // Reutilizar la lógica del endpoint principal
        ResponseEntity<?> response = getReporteAsesores(auth, request);
        if (response.getStatusCode().isError()) {
            return ResponseEntity.status(response.getStatusCode()).build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.getBody();
        if (data == null) {
            return ResponseEntity.status(500).build();
        }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> asesores = (List<Map<String, Object>>) data.get("asesores");

        // Aplicar filtro si se especifica
        List<Map<String, Object>> asesoresFiltrados = asesores;
        String tituloFiltro = "General";
        String filename = "reporte_usuarios";

        if (filtro != null && !filtro.isEmpty()) {
            switch (filtro) {
                case "cumplieron_meta":
                    asesoresFiltrados = asesores.stream()
                            .filter(a -> "success".equals(a.get("estadoColor")))
                            .collect(Collectors.toList());
                    tituloFiltro = "Cumplieron Meta (≥50)";
                    filename = "reporte_cumplieron_meta";
                    break;
                case "cumplieron_minimo":
                    asesoresFiltrados = asesores.stream()
                            .filter(a -> "warning".equals(a.get("estadoColor")))
                            .collect(Collectors.toList());
                    tituloFiltro = "Cumplieron Mínimo (20-49)";
                    filename = "reporte_cumplieron_minimo";
                    break;
                case "sin_minimo":
                    asesoresFiltrados = asesores.stream()
                            .filter(a -> "danger".equals(a.get("estadoColor"))
                                    && ((Number) a.get("registrados")).longValue() > 0)
                            .collect(Collectors.toList());
                    tituloFiltro = "Sin Mínimo (1-19)";
                    filename = "reporte_sin_minimo";
                    break;
                case "sin_gestion":
                    asesoresFiltrados = asesores.stream()
                            .filter(a -> ((Number) a.get("registrados")).longValue() == 0)
                            .collect(Collectors.toList());
                    tituloFiltro = "Sin Gestión (0 registros)";
                    filename = "reporte_sin_gestion";
                    break;
            }
        }

        // Recalcular resumen para el filtro
        Map<String, Object> resumenFiltrado = new LinkedHashMap<>();
        resumenFiltrado.put("total", asesoresFiltrados.size());

        // Calcular conteos globales para el resumen
        long meta = asesores.stream().filter(a -> "success".equals(a.get("estadoColor"))).count();
        long minimo = asesores.stream().filter(a -> "warning".equals(a.get("estadoColor"))).count();
        long sinMinimo = asesores.stream()
                .filter(a -> "danger".equals(a.get("estadoColor")) && ((Number) a.get("registrados")).longValue() > 0)
                .count();
        long sinGestion = asesores.stream().filter(a -> ((Number) a.get("registrados")).longValue() == 0).count();

        resumenFiltrado.put("cumplieronMeta", meta);
        resumenFiltrado.put("cumplieronMinimo", minimo);
        resumenFiltrado.put("sinMinimo", sinMinimo);
        resumenFiltrado.put("sinGestion", sinGestion);
        resumenFiltrado.put("filtroAplicado", tituloFiltro);

        byte[] pdf = exportService.generarPdfAsesores(asesoresFiltrados, resumenFiltrado);

        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=" + filename + ".pdf")
                .body(pdf);
    }

    /**
     * Generar PDF de socios asignados por un usuario específico
     * Muestra socios separados por: Voz y Voto / Solo Voz
     */
    @GetMapping("/pdf/{userId}")
    public ResponseEntity<byte[]> exportarPdfPorUsuario(
            @PathVariable Long userId,
            Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).build();

        // Buscar el usuario
        Usuario usuario = usuarioRepository.findById(userId).orElse(null);
        if (usuario == null) {
            return ResponseEntity.notFound().build();
        }

        // Obtener socios asignados por este usuario con Voz y Voto
        String sqlVyV = """
                SELECT s.numero_socio, s.cedula, s.nombre_completo,
                       COALESCE(suc.nombre, 'N/A') as sucursal,
                       asig.fecha_asignacion
                FROM asignaciones_socios asig
                INNER JOIN listas_asignacion la ON asig.lista_id = la.id
                INNER JOIN socios s ON asig.socio_id = s.id
                LEFT JOIN sucursales suc ON s.id_sucursal = suc.id
                WHERE la.user_id = ?
                AND LOWER(s.habilitado_voz_voto) LIKE '%voto%'
                ORDER BY asig.fecha_asignacion DESC
                """;

        List<Map<String, Object>> sociosVyV = jdbcTemplate.queryForList(sqlVyV, userId);

        // Obtener socios asignados que NO tienen Voz y Voto (Solo Voz)
        String sqlSoloVoz = """
                SELECT s.numero_socio, s.cedula, s.nombre_completo,
                       COALESCE(suc.nombre, 'N/A') as sucursal,
                       asig.fecha_asignacion,
                       s.habilitado_voz_voto
                FROM asignaciones_socios asig
                INNER JOIN listas_asignacion la ON asig.lista_id = la.id
                INNER JOIN socios s ON asig.socio_id = s.id
                LEFT JOIN sucursales suc ON s.id_sucursal = suc.id
                WHERE la.user_id = ?
                AND (LOWER(s.habilitado_voz_voto) NOT LIKE '%voto%' OR s.habilitado_voz_voto IS NULL)
                ORDER BY asig.fecha_asignacion DESC
                """;

        List<Map<String, Object>> sociosSoloVoz = jdbcTemplate.queryForList(sqlSoloVoz, userId);

        // Obtener sucursal del usuario
        String sucursalUsuario = "N/A";
        if (usuario.getSucursal() != null) {
            sucursalUsuario = usuario.getSucursal().getNombre();
        } else if (usuario.getSocio() != null && usuario.getSocio().getSucursal() != null) {
            sucursalUsuario = usuario.getSocio().getSucursal().getNombre();
        }

        // Generar el PDF
        byte[] pdf = exportService.generarPdfPorUsuario(
                usuario.getNombreCompleto(),
                usuario.getRol().getNombre(),
                sucursalUsuario,
                sociosVyV,
                sociosSoloVoz);

        // Auditoría
        auditService.registrar(
                "REPORTES",
                "EXPORTAR_PDF_USUARIO_DETALLE",
                "Exportó detalle de socios asignados para el usuario: " + usuario.getNombreCompleto(),
                auth.getName(),
                ((jakarta.servlet.http.HttpServletRequest) org.springframework.web.context.request.RequestContextHolder
                        .currentRequestAttributes()
                        .resolveReference(org.springframework.web.context.request.RequestAttributes.REFERENCE_REQUEST))
                        .getRemoteAddr());

        String filename = "reporte_" + usuario.getNombreCompleto().replaceAll("\\s+", "_") + ".pdf";

        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=" + filename)
                .body(pdf);
    }
}
