package com.asamblea.repository;

import com.asamblea.model.Asignacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Map;
import org.springframework.data.repository.query.Param;

public interface AsignacionRepository extends JpaRepository<Asignacion, Long> {

       // Explicitly define the query - SOLO socios en padrón actual
       @Query("SELECT a FROM Asignacion a WHERE a.listaAsignacion.id = :listaId")

       List<Asignacion> findByListaAsignacionId(
                     @org.springframework.data.repository.query.Param("listaId") Long listaId);

       @Query(value = "SELECT DATE(fecha_asignacion) as fecha, COUNT(*) as total FROM asignaciones_socios " +
                     "WHERE fecha_asignacion >= DATE_SUB(CURDATE(), INTERVAL :dias DAY) " +
                     "GROUP BY DATE(fecha_asignacion) ORDER BY fecha DESC", nativeQuery = true)
       List<Map<String, Object>> findStatsPorDia(@Param("dias") int dias);

       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.listaAsignacion.id = :listaId AND LOWER(a.socio.habilitadoVozVoto) LIKE '%voto%'")

       Long countVyVByListaId(@org.springframework.data.repository.query.Param("listaId") Long listaId);

       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.listaAsignacion.id = :listaId AND (LOWER(a.socio.habilitadoVozVoto) NOT LIKE '%voto%' OR a.socio.habilitadoVozVoto IS NULL)")

       Long countSoloVozByListaId(@org.springframework.data.repository.query.Param("listaId") Long listaId);

       boolean existsByListaAsignacionIdAndSocioId(Long listaId, Long socioId);

       // Contar asignaciones de una lista específica
       long countByListaAsignacionId(Long listaId);

       // Verificar si un socio ya está asignado a CUALQUIER lista
       boolean existsBySocioId(Long socioId);

       // Obtener la asignación existente de un socio (para mostrar info en error)
       java.util.Optional<Asignacion> findBySocioId(Long socioId);

       java.util.Optional<Asignacion> findByListaAsignacionIdAndSocioId(Long listaId, Long socioId);

       // Consulta optimizada para evitar LazyInitializationException y cargar toda la
       // jerarquía
       @Query("SELECT a FROM Asignacion a JOIN FETCH a.listaAsignacion l LEFT JOIN FETCH l.usuario WHERE a.socio.id = :socioId")
       java.util.Optional<Asignacion> findBySocioIdWithDetails(
                     @org.springframework.data.repository.query.Param("socioId") Long socioId);

       // ====== Métodos para cálculo de METAS por rol del usuario ======

       // Contar asignaciones con Voz y Voto creadas por usuarios con rol específico
       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.listaAsignacion.usuario.rol = :rol AND LOWER(a.socio.habilitadoVozVoto) LIKE '%voto%'")

       Long countVyVByUsuarioRol(
                     @org.springframework.data.repository.query.Param("rol") com.asamblea.model.Usuario.Rol rol);

       // Contar asignaciones con Solo Voz creadas por usuarios con rol específico
       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.listaAsignacion.usuario.rol = :rol AND (LOWER(a.socio.habilitadoVozVoto) NOT LIKE '%voto%' OR a.socio.habilitadoVozVoto IS NULL)")

       Long countSoloVozByUsuarioRol(
                     @org.springframework.data.repository.query.Param("rol") com.asamblea.model.Usuario.Rol rol);

       // Contar asignaciones con Voz y Voto creadas por usuarios SIN el rol
       // especificado (funcionarios)
       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.listaAsignacion.usuario.rol != :rol AND LOWER(a.socio.habilitadoVozVoto) LIKE '%voto%'")

       Long countVyVByUsuarioRolNot(
                     @org.springframework.data.repository.query.Param("rol") com.asamblea.model.Usuario.Rol rol);

       // Contar asignaciones con Solo Voz creadas por usuarios SIN el rol especificado
       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.listaAsignacion.usuario.rol != :rol AND (LOWER(a.socio.habilitadoVozVoto) NOT LIKE '%voto%' OR a.socio.habilitadoVozVoto IS NULL)")

       Long countSoloVozByUsuarioRolNot(
                     @org.springframework.data.repository.query.Param("rol") com.asamblea.model.Usuario.Rol rol);

       // Total de asignaciones con Voz y Voto (global) - SOLO socios en padrón actual
       @Query("SELECT COUNT(a) FROM Asignacion a WHERE LOWER(a.socio.habilitadoVozVoto) LIKE '%voto%'")

       Long countTotalVyV();

       // Total de asignaciones con Solo Voz (global) - SOLO socios en padrón actual
       @Query("SELECT COUNT(a) FROM Asignacion a WHERE LOWER(a.socio.habilitadoVozVoto) NOT LIKE '%voto%' OR a.socio.habilitadoVozVoto IS NULL")

       Long countTotalSoloVoz();

       // Por usuario específico (para dashboard personal) - SOLO socios en padrón
       // actual
       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.listaAsignacion.usuario.id = :userId AND LOWER(a.socio.habilitadoVozVoto) LIKE '%voto%'")

       Long countVyVByUsuarioId(@org.springframework.data.repository.query.Param("userId") Long userId);

       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.listaAsignacion.usuario.id = :userId AND (LOWER(a.socio.habilitadoVozVoto) NOT LIKE '%voto%' OR a.socio.habilitadoVozVoto IS NULL)")

       Long countSoloVozByUsuarioId(@org.springframework.data.repository.query.Param("userId") Long userId);

       // Distribución por sucursal
        @Query("SELECT CASE WHEN COALESCE(s_u.nombre, socioSuc.nombre, 'CASA CENTRAL') IN ('Sucursal 5', 'Central', 'CASA CENTRAL') THEN 'CASA CENTRAL' ELSE COALESCE(s_u.nombre, socioSuc.nombre, 'CASA CENTRAL') END, COUNT(a.id), " +
                      "SUM(CASE WHEN LOWER(s.habilitadoVozVoto) LIKE '%voto%' THEN 1 ELSE 0 END) " +
                      "FROM Asignacion a JOIN a.socio s JOIN a.listaAsignacion l JOIN l.usuario u " +
                      "LEFT JOIN u.sucursal s_u LEFT JOIN u.socio socio_u LEFT JOIN socio_u.sucursal socioSuc " +
                      "GROUP BY 1 ORDER BY COUNT(a.id) DESC")
         java.util.List<Object[]> countBySucursal();

       // Últimas asignaciones (con detalles) - SOLO socios en padrón actual
       @Query("SELECT s.nombreCompleto, s.numeroSocio, suc.nombre, u.username, " +
                     "CASE WHEN LOWER(s.habilitadoVozVoto) LIKE '%voto%' THEN true ELSE false END " +
                     "FROM Asignacion a JOIN a.socio s LEFT JOIN s.sucursal suc " +
                     "JOIN a.listaAsignacion l JOIN l.usuario u " +
                     "ORDER BY a.id DESC")

       java.util.List<Object[]> findUltimasAsignaciones();

       // ====== Queries para Estadísticas de Asignaciones por Día ======

       @Query("SELECT COUNT(a) FROM Asignacion a WHERE DATE(a.fechaAsignacion) = CURRENT_DATE")
       Long countAsignacionesHoy();

       @Query("SELECT DATE(a.fechaAsignacion) as fecha, COUNT(a) as total FROM Asignacion a WHERE a.fechaAsignacion >= :fechaInicio GROUP BY DATE(a.fechaAsignacion) ORDER BY DATE(a.fechaAsignacion) DESC")
       java.util.List<Object[]> countAsignacionesPorDia(
                     @org.springframework.data.repository.query.Param("fechaInicio") java.time.LocalDateTime fechaInicio);

       // Optimized Report Queries

       @Query("SELECT a FROM Asignacion a " +
                     "JOIN FETCH a.socio s " +
                     "JOIN FETCH a.listaAsignacion l " +
                     "JOIN FETCH l.usuario u LEFT JOIN FETCH u.sucursal " +
                     "LEFT JOIN FETCH s.sucursal sec " +
                     "WHERE (:operadorId IS NULL OR u.id = :operadorId)")
       java.util.List<Asignacion> findAsignacionesReporte(
                     @org.springframework.data.repository.query.Param("operadorId") Long operadorId);

       @Query("SELECT a FROM Asignacion a " +
                     "JOIN FETCH a.socio s " +
                     "JOIN FETCH a.listaAsignacion l " +
                     "JOIN FETCH l.usuario u LEFT JOIN FETCH u.sucursal " +
                     "LEFT JOIN FETCH s.sucursal sec " +
                     "WHERE u.sucursal.id = :sucursalId " +
                     "AND (:operadorId IS NULL OR u.id = :operadorId)")
       java.util.List<Asignacion> findAsignacionesPorSucursal(
                     @org.springframework.data.repository.query.Param("sucursalId") Long sucursalId,
                     @org.springframework.data.repository.query.Param("operadorId") Long operadorId);

       // Métodos para conteo por sucursal basado en ASIGNACIONES
       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.socio.sucursal.id = :sucursalId")
       long countBySocioSucursalId(@Param("sucursalId") Long sucursalId);

       @Query("SELECT COUNT(a) FROM Asignacion a WHERE a.socio.sucursal.id = :sucursalId AND LOWER(a.socio.habilitadoVozVoto) LIKE '%voto%'")
       long countVyVBySocioSucursalId(@Param("sucursalId") Long sucursalId);
}
