package com.asamblea.controller;

import com.asamblea.model.Usuario;
import com.asamblea.repository.UsuarioRepository;
import com.asamblea.service.ReporteExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reportes/rankings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@SuppressWarnings("null")
public class ReporteRankingsController {

    private final JdbcTemplate jdbcTemplate;
    private final UsuarioRepository usuarioRepository;
    private final ReporteExportService exportService;

    private boolean isAuthorized(Authentication auth) {
        if (auth == null)
            return false;
        Usuario user = usuarioRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null)
            return false;
        return user.getRol() == Usuario.Rol.SUPER_ADMIN || user.getRol() == Usuario.Rol.DIRECTIVO;
    }

    @GetMapping("/asesores")
    public ResponseEntity<?> getTopAsesores(Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();

        String sql = """
                    SELECT
                        u.nombre_completo as nombre,
                        u.username,
                        CASE
                            WHEN UPPER(s.nombre) LIKE '%CENTRAL%' OR UPPER(s.nombre) LIKE '%SUCURSAL 5%' OR UPPER(s.nombre) LIKE '%SUC 5%' OR UPPER(s.nombre) LIKE '%SAN LORENZO%' THEN 'CASA CENTRAL'
                            WHEN UPPER(s.nombre) LIKE '%CDE%' OR UPPER(s.nombre) LIKE '%CIUDAD DEL ESTE%' OR UPPER(s.nombre) LIKE '%HERNANDARIAS%' OR UPPER(s.nombre) LIKE '%ALTO PARANA%' THEN 'CDE ALTO PARANA'
                            ELSE COALESCE(s.nombre, 'Sin Sucursal')
                        END as sucursal,
                        COUNT(a.id) as total_vyv
                    FROM usuarios u
                    INNER JOIN sucursales s ON u.id_sucursal = s.id
                    INNER JOIN listas_asignacion la ON la.user_id = u.id
                    INNER JOIN asignaciones_socios a ON a.lista_id = la.id
                    INNER JOIN socios socio ON a.socio_id = socio.id
                    WHERE u.rol = 'ASESOR_DE_CREDITO'
                    AND LOWER(socio.habilitado_voz_voto) LIKE '%voto%'
                    GROUP BY u.id, u.nombre_completo, u.username, 3
                    ORDER BY total_vyv DESC
                    LIMIT 10
                """;

        List<Map<String, Object>> result = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/usuarios")
    public ResponseEntity<?> getTopUsuarios(Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();

        String sql = """
                    SELECT
                        u.nombre_completo as nombre,
                        u.username,
                        u.rol,
                        CASE
                            WHEN UPPER(s.nombre) LIKE '%CENTRAL%' OR UPPER(s.nombre) LIKE '%SUCURSAL 5%' OR UPPER(s.nombre) LIKE '%SUC 5%' OR UPPER(s.nombre) LIKE '%SAN LORENZO%' THEN 'CASA CENTRAL'
                            WHEN UPPER(s.nombre) LIKE '%CDE%' OR UPPER(s.nombre) LIKE '%CIUDAD DEL ESTE%' OR UPPER(s.nombre) LIKE '%HERNANDARIAS%' OR UPPER(s.nombre) LIKE '%ALTO PARANA%' THEN 'CDE ALTO PARANA'
                            ELSE COALESCE(s.nombre, 'Sin Sucursal')
                        END as sucursal,
                        COUNT(a.id) as total_vyv
                    FROM usuarios u
                    LEFT JOIN sucursales s ON u.id_sucursal = s.id
                    INNER JOIN listas_asignacion la ON la.user_id = u.id
                    INNER JOIN asignaciones_socios a ON a.lista_id = la.id
                    INNER JOIN socios socio ON a.socio_id = socio.id
                    WHERE LOWER(socio.habilitado_voz_voto) LIKE '%voto%'
                    GROUP BY u.id, u.nombre_completo, u.username, u.rol, 4
                    ORDER BY total_vyv DESC
                    LIMIT 10
                """;

        List<Map<String, Object>> result = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/sucursales")
    public ResponseEntity<?> getTopSucursales(Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();

        String sql = """
                    SELECT
                        CASE
                            WHEN UPPER(s.nombre) LIKE '%CENTRAL%' OR UPPER(s.nombre) LIKE '%SUCURSAL 5%' OR UPPER(s.nombre) LIKE '%SUC 5%' OR UPPER(s.nombre) LIKE '%SAN LORENZO%' THEN 'CASA CENTRAL'
                            WHEN UPPER(s.nombre) LIKE '%CDE%' OR UPPER(s.nombre) LIKE '%CIUDAD DEL ESTE%' OR UPPER(s.nombre) LIKE '%HERNANDARIAS%' OR UPPER(s.nombre) LIKE '%ALTO PARANA%' THEN 'CDE ALTO PARANA'
                            ELSE COALESCE(s.nombre, 'Sin Sucursal')
                        END as sucursal,
                        COUNT(a.id) as total_vyv
                    FROM sucursales s
                    INNER JOIN usuarios u ON u.id_sucursal = s.id
                    INNER JOIN listas_asignacion la ON la.user_id = u.id
                    INNER JOIN asignaciones_socios a ON a.lista_id = la.id
                    INNER JOIN socios socio ON a.socio_id = socio.id
                    WHERE LOWER(socio.habilitado_voz_voto) LIKE '%voto%'
                    GROUP BY 1
                    ORDER BY total_vyv DESC
                    LIMIT 10
                """;

        List<Map<String, Object>> result = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(result);
    }

    private List<Map<String, Object>> fetchAsesores() {
        return jdbcTemplate.queryForList(
                """
                            SELECT u.nombre_completo as asesor,
                            CASE
                                WHEN UPPER(s.nombre) LIKE '%CENTRAL%' OR UPPER(s.nombre) LIKE '%SUCURSAL 5%' OR UPPER(s.nombre) LIKE '%SUC 5%' OR UPPER(s.nombre) LIKE '%SAN LORENZO%' THEN 'CASA CENTRAL'
                                WHEN UPPER(s.nombre) LIKE '%CDE%' OR UPPER(s.nombre) LIKE '%CIUDAD DEL ESTE%' OR UPPER(s.nombre) LIKE '%HERNANDARIAS%' OR UPPER(s.nombre) LIKE '%ALTO PARANA%' THEN 'CDE ALTO PARANA'
                                ELSE COALESCE(s.nombre, 'Sin Sucursal')
                            END as sucursal,
                            COUNT(a.id) as total_vyv
                            FROM usuarios u
                            INNER JOIN sucursales s ON u.id_sucursal = s.id
                            INNER JOIN listas_asignacion la ON la.user_id = u.id
                            INNER JOIN asignaciones_socios a ON a.lista_id = la.id
                            INNER JOIN socios socio ON a.socio_id = socio.id
                            WHERE u.rol = 'ASESOR_DE_CREDITO'
                            AND LOWER(socio.habilitado_voz_voto) LIKE '%voto%'
                            GROUP BY u.id, u.nombre_completo, 2
                            ORDER BY total_vyv DESC LIMIT 10
                        """);
    }

    private List<Map<String, Object>> fetchUsuarios() {
        return jdbcTemplate.queryForList(
                """
                            SELECT u.nombre_completo as usuario, u.rol,
                            CASE
                                WHEN UPPER(s.nombre) LIKE '%CENTRAL%' OR UPPER(s.nombre) LIKE '%SUCURSAL 5%' OR UPPER(s.nombre) LIKE '%SUC 5%' OR UPPER(s.nombre) LIKE '%SAN LORENZO%' THEN 'CASA CENTRAL'
                                WHEN UPPER(s.nombre) LIKE '%CDE%' OR UPPER(s.nombre) LIKE '%CIUDAD DEL ESTE%' OR UPPER(s.nombre) LIKE '%HERNANDARIAS%' OR UPPER(s.nombre) LIKE '%ALTO PARANA%' THEN 'CDE ALTO PARANA'
                                ELSE COALESCE(s.nombre, 'Sin Sucursal')
                            END as sucursal,
                            COUNT(a.id) as total_vyv
                            FROM usuarios u
                            LEFT JOIN sucursales s ON u.id_sucursal = s.id
                            INNER JOIN listas_asignacion la ON la.user_id = u.id
                            INNER JOIN asignaciones_socios a ON a.lista_id = la.id
                            INNER JOIN socios socio ON a.socio_id = socio.id
                            WHERE LOWER(socio.habilitado_voz_voto) LIKE '%voto%'
                            GROUP BY u.id, u.nombre_completo, u.rol, 3
                            ORDER BY total_vyv DESC LIMIT 10
                        """);
    }

    private List<Map<String, Object>> fetchSucursales() {
        return jdbcTemplate.queryForList(
                """
                            SELECT
                            CASE
                                WHEN UPPER(s.nombre) LIKE '%CENTRAL%' OR UPPER(s.nombre) LIKE '%SUCURSAL 5%' OR UPPER(s.nombre) LIKE '%SUC 5%' OR UPPER(s.nombre) LIKE '%SAN LORENZO%' THEN 'CASA CENTRAL'
                                WHEN UPPER(s.nombre) LIKE '%CDE%' OR UPPER(s.nombre) LIKE '%CIUDAD DEL ESTE%' OR UPPER(s.nombre) LIKE '%HERNANDARIAS%' OR UPPER(s.nombre) LIKE '%ALTO PARANA%' THEN 'CDE ALTO PARANA'
                                ELSE COALESCE(s.nombre, 'Sin Sucursal')
                            END as sucursal,
                            COUNT(a.id) as total_vyv
                            FROM sucursales s
                            INNER JOIN usuarios u ON u.id_sucursal = s.id
                            INNER JOIN listas_asignacion la ON la.user_id = u.id
                            INNER JOIN asignaciones_socios a ON a.lista_id = la.id
                            INNER JOIN socios socio ON a.socio_id = socio.id
                            WHERE LOWER(socio.habilitado_voz_voto) LIKE '%voto%'
                            GROUP BY 1
                            ORDER BY total_vyv DESC LIMIT 10
                        """);
    }

    @GetMapping("/export-excel")
    public ResponseEntity<byte[]> exportToExcel(Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();
        byte[] excelContent = exportService.generarExcelRankings(fetchAsesores(), fetchUsuarios(), fetchSucursales());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rankings_vyv.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(excelContent);
    }

    @GetMapping("/export-pdf")
    public ResponseEntity<byte[]> exportToPdf(@RequestParam(defaultValue = "all") String type, Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();
        byte[] pdfContent = exportService.generarPdfRankings(type, fetchAsesores(), fetchUsuarios(), fetchSucursales());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rankings_vyv_" + type + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfContent);
    }

    // ==========================================
    // RANKINGS DE ASISTENCIA (GENTE QUE VINO)
    // ==========================================

    @GetMapping("/asistencia/usuarios")
    public ResponseEntity<?> getRankingAsistenciaUsuarios(Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();

        String sql = """
                    SELECT
                        u.id,
                        u.nombre_completo as nombre,
                        u.username,
                        CASE
                            WHEN UPPER(COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')) LIKE '%CENTRAL%'
                              OR UPPER(COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')) LIKE '%SUCURSAL 5%'
                              OR UPPER(COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')) LIKE '%SUC 5%'
                              OR UPPER(COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')) LIKE '%SAN LORENZO%'
                            THEN 'CASA CENTRAL'
                            WHEN UPPER(COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')) LIKE '%CDE%'
                              OR UPPER(COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')) LIKE '%CIUDAD DEL ESTE%'
                              OR UPPER(COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')) LIKE '%HERNANDARIAS%'
                              OR UPPER(COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')) LIKE '%ALTO PARANA%'
                            THEN 'CDE ALTO PARANA'
                            ELSE COALESCE(s.nombre, s2.nombre, 'Sin Sucursal')
                        END as sucursal,
                        COUNT(asis.id) as total_presentes
                    FROM usuarios u
                    LEFT JOIN sucursales s ON u.id_sucursal = s.id
                    LEFT JOIN socios socio_u ON u.id_socio = socio_u.id
                    LEFT JOIN sucursales s2 ON socio_u.id_sucursal = s2.id
                    INNER JOIN listas_asignacion la ON la.user_id = u.id
                    INNER JOIN asignaciones_socios asig ON asig.lista_id = la.id
                    INNER JOIN asistencias asis ON asis.id_socio = asig.socio_id
                    WHERE u.activo = true
                    GROUP BY u.id, u.nombre_completo, u.username, 3
                    ORDER BY total_presentes DESC
                """;

        List<Map<String, Object>> result = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/asistencia/sucursales")
    public ResponseEntity<?> getRankingAsistenciaSucursales(Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();

        // Agrupamos por la sucursal del OPERADOR (u.id_sucursal o fallback a sucursal
        // del socio del operador)
        String sql = """
                    SELECT
                        CASE
                            WHEN UPPER(COALESCE(s_member_suc.nombre, '')) LIKE '%CENTRAL%'
                              OR UPPER(COALESCE(s_member_suc.nombre, '')) LIKE '%SUCURSAL 5%'
                              OR UPPER(COALESCE(s_member_suc.nombre, '')) LIKE '%SUC 5%'
                              OR UPPER(COALESCE(s_member_suc.nombre, '')) LIKE '%SAN LORENZO%'
                            THEN 'CASA CENTRAL'
                            WHEN UPPER(COALESCE(s_member_suc.nombre, '')) LIKE '%CDE%'
                              OR UPPER(COALESCE(s_member_suc.nombre, '')) LIKE '%CIUDAD DEL ESTE%'
                              OR UPPER(COALESCE(s_member_suc.nombre, '')) LIKE '%HERNANDARIAS%'
                              OR UPPER(COALESCE(s_member_suc.nombre, '')) LIKE '%ALTO PARANA%'
                            THEN 'CDE ALTO PARANA'
                            ELSE COALESCE(s_member_suc.nombre, 'Sin Sucursal')
                        END as sucursal,
                        COUNT(asis.id) as total_presentes
                    FROM asistencias asis
                    JOIN socios s_member ON asis.id_socio = s_member.id
                    LEFT JOIN sucursales s_member_suc ON s_member.id_sucursal = s_member_suc.id
                    GROUP BY 1
                    ORDER BY total_presentes DESC
                """;

        List<Map<String, Object>> result = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/asistencia/usuarios/{userId}/detalle")
    public ResponseEntity<?> getDetalleAsistenciaUsuario(@PathVariable Long userId, Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();

        String sql = """
                    SELECT
                        s.id,
                        s.nombre_completo,
                        s.cedula,
                        asis.fecha_hora_llegada
                    FROM asistencias asis
                    JOIN socios s ON asis.id_socio = s.id
                    JOIN asignaciones_socios asig ON asig.socio_id = s.id
                    JOIN listas_asignacion la ON la.id = asig.lista_id
                    WHERE la.user_id = ?
                    ORDER BY asis.fecha_hora_llegada DESC
                """;

        List<Map<String, Object>> result = jdbcTemplate.queryForList(sql, userId);
        return ResponseEntity.ok(result);
    }
}
