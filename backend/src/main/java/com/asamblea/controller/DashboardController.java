package com.asamblea.controller;

import com.asamblea.model.Usuario;
import com.asamblea.repository.AsignacionRepository;
import com.asamblea.repository.UsuarioRepository;
import com.asamblea.service.ReporteExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/dashboard")
@SuppressWarnings("null")
public class DashboardController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private AsignacionRepository asignacionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ReporteExportService exportService;

    @Autowired
    private com.asamblea.service.LogAuditoriaService auditService;

    @GetMapping("/metas")
    public ResponseEntity<?> getMetas(Authentication authentication, @RequestParam(required = false) Long userId) {
        try {
            Usuario usuario;

            // Si viene userId y quien pide es admin, usamos ese user. Si no, usamos el
            // logueado.
            if (userId != null) {
                // Verificar permisos: Solo Admin/Directivo puede ver metas de otros
                String requesterUsername = authentication.getName();
                Usuario requester = usuarioRepository.findByUsername(requesterUsername).orElse(null);

                if (requester != null && !requester.getId().equals(userId)) {
                    if (requester.getRol() != Usuario.Rol.SUPER_ADMIN && requester.getRol() != Usuario.Rol.DIRECTIVO) {
                        return ResponseEntity.status(403)
                                .body("No tienes permisos para ver las metas de otros usuarios");
                    }
                }

                Optional<Usuario> targetUser = usuarioRepository.findById(userId);
                if (targetUser.isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
                usuario = targetUser.get();
            } else {
                String username = authentication.getName();
                Optional<Usuario> currentUser = usuarioRepository.findByUsername(username);
                if (currentUser.isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
                usuario = currentUser.get();
            }

            // 1. Determinar Meta y Conteos
            long vozYVoto;
            long soloVoz;
            int meta;
            String cargo;

            // Variables para segmentación (solo admin)
            Map<String, Object> asesoresData = null;
            Map<String, Object> funcionariosData = null;

            // Lógica GLOBAL para SUPER_ADMIN (si no está viendo a otro usuario específico)
            if (userId == null && usuario.getRol() == Usuario.Rol.SUPER_ADMIN) {
                Long totalMeta = usuarioRepository.sumTotalMetas();
                meta = totalMeta != null ? totalMeta.intValue() : 0;

                // CORREGIDO: Contar desde ASIGNACIONES (listas), NO desde ASISTENCIAS
                // (check-ins)
                Long vyv = asignacionRepository.countTotalVyV();
                Long sv = asignacionRepository.countTotalSoloVoz();
                vozYVoto = vyv != null ? vyv : 0;
                soloVoz = sv != null ? sv : 0;
                cargo = "Meta Global";

                // --- SEGMENTACION ASESORES vs FUNCIONARIOS ---
                // 1. Asesores de Crédito (cuentan desde sus listas)
                Long metaAsesores = usuarioRepository.sumTotalMetasByRol(Usuario.Rol.ASESOR_DE_CREDITO);
                Long vozAsesores = asignacionRepository.countVyVByUsuarioRol(Usuario.Rol.ASESOR_DE_CREDITO);
                if (vozAsesores == null)
                    vozAsesores = 0L;

                asesoresData = new HashMap<>();
                asesoresData.put("meta", metaAsesores != null ? metaAsesores : 0);
                asesoresData.put("registradosVozYVoto", vozAsesores);
                asesoresData.put("porcentajeMeta",
                        (metaAsesores != null && metaAsesores > 0) ? ((double) vozAsesores / metaAsesores) * 100 : 0);

                // 2. Funcionarios (todos los demás roles)
                Long metaFunc = usuarioRepository.sumTotalMetasByRolNot(Usuario.Rol.ASESOR_DE_CREDITO);
                Long vozFunc = asignacionRepository.countVyVByUsuarioRolNot(Usuario.Rol.ASESOR_DE_CREDITO);
                if (vozFunc == null)
                    vozFunc = 0L;

                funcionariosData = new HashMap<>();
                funcionariosData.put("meta", metaFunc != null ? metaFunc : 0);
                funcionariosData.put("registradosVozYVoto", vozFunc);
                funcionariosData.put("porcentajeMeta",
                        (metaFunc != null && metaFunc > 0) ? ((double) vozFunc / metaFunc) * 100 : 0);

            } else {
                // Lógica PERSONAL (para operadores, asesores o ver un usuario específico)
                meta = usuario.getMeta() != null ? usuario.getMeta() : 50;
                // CORREGIDO: Contar desde ASIGNACIONES del usuario
                Long vyv = asignacionRepository.countVyVByUsuarioId(usuario.getId());
                Long sv = asignacionRepository.countSoloVozByUsuarioId(usuario.getId());
                vozYVoto = vyv != null ? vyv : 0;
                soloVoz = sv != null ? sv : 0;
                cargo = usuario.getCargo() != null ? usuario.getCargo() : "Funcionario";
            }

            long totalRegistrados = vozYVoto + soloVoz;

            Map<String, Object> response = new HashMap<>();
            response.put("usuarioId", usuario.getId());
            response.put("cargo", cargo);
            response.put("meta", meta);
            response.put("registradosVozYVoto", vozYVoto);
            response.put("registradosSoloVoz", soloVoz);
            response.put("totalRegistrados", totalRegistrados);

            if (asesoresData != null)
                response.put("asesores", asesoresData);
            if (funcionariosData != null)
                response.put("funcionarios", funcionariosData);

            // Cálculos derivados facilitan al frontend
            double porcentajeMeta = meta > 0 ? ((double) vozYVoto / meta) * 100 : 0;
            response.put("porcentajeMeta", porcentajeMeta);
            response.put("faltanMeta", Math.max(0, meta - vozYVoto));
            response.put("cumplida", vozYVoto >= meta);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error calculando metas: " + e.getMessage());
        }
    }

    /**
     * Exportar PDF de socios asignados con Voz y Voto o Solo Voz
     * 
     * @param tipo "vyv" para Voz y Voto, "voz" para Solo Voz
     */
    @GetMapping("/export-socios-pdf")
    public ResponseEntity<byte[]> exportSociosPdf(
            Authentication authentication,
            @RequestParam(defaultValue = "vyv") String tipo,
            jakarta.servlet.http.HttpServletRequest request) {

        try {
            String username = authentication.getName();
            Usuario currentUser = usuarioRepository.findByUsername(username).orElse(null);

            if (currentUser == null) {
                return ResponseEntity.status(401).build();
            }

            // Auditoría
            auditService.registrar(
                    "DASHBOARD",
                    "EXPORTAR_PDF",
                    String.format("Exportó lista de socios asignados (%s) en PDF",
                            tipo.equalsIgnoreCase("vyv") ? "VOZ Y VOTO" : "SOLO VOZ"),
                    currentUser.getUsername(),
                    request.getRemoteAddr());

            // Solo SUPER_ADMIN puede ver datos globales
            boolean isGlobal = currentUser.getRol() == Usuario.Rol.SUPER_ADMIN;

            String sql;
            String title;
            String description;

            if ("vyv".equalsIgnoreCase(tipo)) {
                title = "LISTA DE SOCIOS ASIGNADOS - VOZ Y VOTO";
                description = "Socios habilitados para votar, ordenados por número de socio.";

                if (isGlobal) {
                    sql = """
                                SELECT s.numero_socio, s.cedula, s.nombre_completo,
                                       COALESCE(suc.nombre, 'Sin Sucursal') as sucursal,
                                       u.nombre_completo as asignado_por
                                FROM asignaciones_socios a
                                INNER JOIN socios s ON a.socio_id = s.id
                                LEFT JOIN sucursales suc ON s.id_sucursal = suc.id
                                INNER JOIN listas_asignacion la ON a.lista_id = la.id
                                INNER JOIN usuarios u ON la.user_id = u.id
                                WHERE LOWER(s.habilitado_voz_voto) LIKE '%voto%'
                                ORDER BY CAST(s.numero_socio AS UNSIGNED), s.nombre_completo
                            """;
                } else {
                    sql = """
                                SELECT s.numero_socio, s.cedula, s.nombre_completo,
                                       COALESCE(suc.nombre, 'Sin Sucursal') as sucursal,
                                       u.nombre_completo as asignado_por
                                FROM asignaciones_socios a
                                INNER JOIN socios s ON a.socio_id = s.id
                                LEFT JOIN sucursales suc ON s.id_sucursal = suc.id
                                INNER JOIN listas_asignacion la ON a.lista_id = la.id
                                INNER JOIN usuarios u ON la.user_id = u.id
                                WHERE la.user_id = %d
                                  AND LOWER(s.habilitado_voz_voto) LIKE '%%voto%%'
                                ORDER BY CAST(s.numero_socio AS UNSIGNED), s.nombre_completo
                            """.formatted(currentUser.getId());
                }
            } else {
                title = "LISTA DE SOCIOS ASIGNADOS - SOLO VOZ";
                description = "Socios sin derecho a voto (pendientes de regularizar), ordenados por número de socio.";

                if (isGlobal) {
                    sql = """
                                SELECT s.numero_socio, s.cedula, s.nombre_completo,
                                       COALESCE(suc.nombre, 'Sin Sucursal') as sucursal,
                                       u.nombre_completo as asignado_por,
                                       s.habilitado_voz_voto
                                FROM asignaciones_socios a
                                INNER JOIN socios s ON a.socio_id = s.id
                                LEFT JOIN sucursales suc ON s.id_sucursal = suc.id
                                INNER JOIN listas_asignacion la ON a.lista_id = la.id
                                INNER JOIN usuarios u ON la.user_id = u.id
                                WHERE (LOWER(s.habilitado_voz_voto) NOT LIKE '%voto%' OR s.habilitado_voz_voto IS NULL)
                                ORDER BY CAST(s.numero_socio AS UNSIGNED), s.nombre_completo
                            """;
                } else {
                    sql = """
                                SELECT s.numero_socio, s.cedula, s.nombre_completo,
                                       COALESCE(suc.nombre, 'Sin Sucursal') as sucursal,
                                       u.nombre_completo as asignado_por,
                                       s.habilitado_voz_voto
                                FROM asignaciones_socios a
                                INNER JOIN socios s ON a.socio_id = s.id
                                LEFT JOIN sucursales suc ON s.id_sucursal = suc.id
                                INNER JOIN listas_asignacion la ON a.lista_id = la.id
                                INNER JOIN usuarios u ON la.user_id = u.id
                                WHERE la.user_id = %d
                                  AND (LOWER(s.habilitado_voz_voto) NOT LIKE '%%voto%%' OR s.habilitado_voz_voto IS NULL)
                                ORDER BY CAST(s.numero_socio AS UNSIGNED), s.nombre_completo
                            """.formatted(currentUser.getId());
                }
            }

            List<Map<String, Object>> socios = jdbcTemplate.queryForList(sql);

            byte[] pdfContent = exportService.generarPdfListaSocios(
                    socios,
                    title,
                    description,
                    "vyv".equalsIgnoreCase(tipo));

            String filename = "vyv".equalsIgnoreCase(tipo)
                    ? "socios_voz_y_voto.pdf"
                    : "socios_solo_voz.pdf";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfContent);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
