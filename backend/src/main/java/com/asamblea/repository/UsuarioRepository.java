package com.asamblea.repository;

import com.asamblea.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);

    Optional<Usuario> findBySocioId(Long socioId);

    default Optional<Usuario> findByIdSocio(Long idSocio) {
        return findBySocioId(idSocio);
    }

    // Meta GLOBAL = Asesores + Funcionarios (todos los usuarios que pueden
    // registrar)
    @Query("SELECT SUM(u.meta) FROM Usuario u")
    Long sumTotalMetas();

    // Meta por rol específico (ej: ASESOR_DE_CREDITO)
    @Query("SELECT SUM(u.meta) FROM Usuario u WHERE u.rol = :rol")
    Long sumTotalMetasByRol(@Param("rol") Usuario.Rol rol);

    // Meta de FUNCIONARIOS = todos los que NO son ASESOR_DE_CREDITO (incluye
    // USUARIO_SOCIO, DIRECTIVO, OPERADOR, etc)
    @Query("SELECT SUM(u.meta) FROM Usuario u WHERE u.rol != :rol")
    Long sumTotalMetasByRolNot(@Param("rol") Usuario.Rol rol);

    // Ranking de funcionarios por cantidad de registros en sus listas
    // Sucursal: First try Usuario.sucursal, fallback to Socio.sucursal via socio
    // relationship
    @Query("SELECT u.username, u.cargo, u.meta, COUNT(a.id), " +
            "CASE WHEN u.meta > 0 THEN (COUNT(a.id) * 100.0 / u.meta) ELSE 0 END, " +
            "u.nombreCompleto, COALESCE(s.nombre, socioSuc.nombre), socio.nombreCompleto " +
            "FROM Usuario u " +
            "LEFT JOIN ListaAsignacion l ON l.usuario.id = u.id " +
            "LEFT JOIN Asignacion a ON a.listaAsignacion.id = l.id " +
            "LEFT JOIN Sucursal s ON u.sucursal.id = s.id " +
            "LEFT JOIN u.socio socio " +
            "LEFT JOIN Sucursal socioSuc ON socio.sucursal.id = socioSuc.id " +
            "GROUP BY u.id, u.username, u.cargo, u.meta, u.nombreCompleto, s.nombre, socioSuc.nombre, socio.nombreCompleto "
            +
            "ORDER BY COUNT(a.id) DESC")
    List<Object[]> findRankingByAsignaciones();

    List<Usuario> findByActivoTrue();

    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.sucursal LEFT JOIN FETCH u.socio s LEFT JOIN FETCH s.sucursal")
    List<Usuario> findAllWithRelations();

    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.sucursal LEFT JOIN FETCH u.socio s LEFT JOIN FETCH s.sucursal WHERE u.activo = true")
    List<Usuario> findAllActiveWithRelations();

    // ====== Queries para Reporte de Usuarios Sin Asignaciones ======

    // Usuarios activos con 0 asignaciones totales (cuenta asignaciones en todas sus
    // listas)
    @Query("""
            SELECT u FROM Usuario u
            LEFT JOIN FETCH u.sucursal
            LEFT JOIN FETCH u.socio socio
            LEFT JOIN FETCH socio.sucursal
            WHERE u.activo = true
            AND NOT EXISTS (
                SELECT 1 FROM Asignacion a
                JOIN a.listaAsignacion la
                WHERE la.usuario.id = u.id
            )
            ORDER BY u.nombreCompleto
            """)
    List<Usuario> findUsuariosSinAsignaciones();

    // Solo Asesores con 0 asignaciones
    @Query("""
            SELECT u FROM Usuario u
            LEFT JOIN FETCH u.sucursal
            LEFT JOIN FETCH u.socio socio
            LEFT JOIN FETCH socio.sucursal
            WHERE u.activo = true
            AND u.rol = com.asamblea.model.Usuario.Rol.ASESOR_DE_CREDITO
            AND NOT EXISTS (
                SELECT 1 FROM Asignacion a
                JOIN a.listaAsignacion la
                WHERE la.usuario.id = u.id
            )
            ORDER BY u.nombreCompleto
            """)
    List<Usuario> findAsesoresSinAsignaciones();

    // Por sucursal específica - todos los usuarios (checks both usuario.sucursal
    // and socio.sucursal)
    @Query("""
            SELECT u FROM Usuario u
            LEFT JOIN FETCH u.sucursal s
            LEFT JOIN FETCH u.socio socio
            LEFT JOIN FETCH socio.sucursal socioSuc
            WHERE u.activo = true
            AND (s.id = :sucursalId OR socioSuc.id = :sucursalId)
            AND NOT EXISTS (
                SELECT 1 FROM Asignacion a
                JOIN a.listaAsignacion la
                WHERE la.usuario.id = u.id
            )
            ORDER BY u.nombreCompleto
            """)
    List<Usuario> findUsuariosSinAsignacionesBySucursal(@Param("sucursalId") Long sucursalId);

    // Por sucursal específica - solo asesores
    @Query("""
            SELECT u FROM Usuario u
            LEFT JOIN FETCH u.sucursal s
            LEFT JOIN FETCH u.socio socio
            LEFT JOIN FETCH socio.sucursal socioSuc
            WHERE u.activo = true
            AND u.rol = com.asamblea.model.Usuario.Rol.ASESOR_DE_CREDITO
            AND (s.id = :sucursalId OR socioSuc.id = :sucursalId)
            AND NOT EXISTS (
                SELECT 1 FROM Asignacion a
                JOIN a.listaAsignacion la
                WHERE la.usuario.id = u.id
            )
            ORDER BY u.nombreCompleto
            """)
    List<Usuario> findAsesoresSinAsignacionesBySucursal(@Param("sucursalId") Long sucursalId);

    // ====== Queries para Dirigentes y Punteros ======

    // Encontrar todos los punteros de un dirigente específico
    List<Usuario> findByDirigenteIdAndActivoTrue(Long dirigenteId);

    // Encontrar todos los punteros de un dirigente (activos e inactivos)
    List<Usuario> findByDirigenteId(Long dirigenteId);

    // Encontrar todos los dirigentes activos
    @Query("SELECT u FROM Usuario u WHERE u.isDirigente = true AND u.activo = true")
    List<Usuario> findDirigentesActivos();

    // Contar punteros de un dirigente
    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.dirigente.id = :dirigenteId AND u.activo = true")
    Long countPunterosByDirigenteId(@Param("dirigenteId") Long dirigenteId);
}
