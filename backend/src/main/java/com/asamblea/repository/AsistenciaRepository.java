package com.asamblea.repository;

import com.asamblea.model.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {

    @Query("SELECT COUNT(a) FROM Asistencia a WHERE a.socio.id IN (SELECT asig.socio.id FROM Asignacion asig WHERE asig.listaAsignacion.id = :listaId)")
    long countPresentesByListaId(@org.springframework.data.repository.query.Param("listaId") Long listaId);

    long countByEstadoVozVoto(Boolean estadoVozVoto);

    // Conteo por Rol de Operador (Asesores vs Otros)
    long countByOperador_RolAndEstadoVozVoto(com.asamblea.model.Usuario.Rol rol, Boolean estadoVozVoto);

    long countByOperador_RolNotAndEstadoVozVoto(com.asamblea.model.Usuario.Rol rol, Boolean estadoVozVoto);

    // Contar presentes por sucursal
    @Query("SELECT COUNT(a) FROM Asistencia a WHERE a.socio.sucursal.id = :sucursalId")
    long countBySucursalId(Long sucursalId);

    // Verificar si un socio tiene asistencia
    // Verificar si un socio tiene asistencia
    boolean existsBySocioId(Long socioId);

    java.util.Optional<Asistencia> findFirstBySocioId(Long socioId);

    // Buscar asistencias por operador
    java.util.List<Asistencia> findByOperadorId(Long operadorId);

    long countByOperadorIdAndEstadoVozVoto(Long operadorId, Boolean estadoVozVoto);

    // Eliminar asistencias por socio ID
    void deleteBySocioId(Long socioId);

    // Métodos para Dashboard Público
    long countByFechaHoraBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

    long countByFechaHoraBetweenAndEstadoVozVoto(java.time.LocalDateTime start, java.time.LocalDateTime end,
            Boolean estadoVozVoto);

    java.util.List<Asistencia> findByFechaHoraBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

     // Optimized Report Query - UPDATED: Filter by OPERATOR BRANCH
    @Query("SELECT a FROM Asistencia a " +
           "WHERE (:fechaInicio IS NULL OR a.fechaHora >= :fechaInicio) " +
           "AND (:fechaFin IS NULL OR a.fechaHora <= :fechaFin) " +
           "AND (:sucursalId IS NULL OR a.operador.sucursal.id = :sucursalId) " +
           "AND (:operadorId IS NULL OR a.operador.id = :operadorId) " +
           "AND (:filterByAssignment = false OR a.socio.id IN :socioIds)")
    java.util.List<Asistencia> findAsistenciasReporte(
            @org.springframework.data.repository.query.Param("fechaInicio") java.time.LocalDateTime fechaInicio,
            @org.springframework.data.repository.query.Param("fechaFin") java.time.LocalDateTime fechaFin,
            @org.springframework.data.repository.query.Param("sucursalId") Long sucursalId,
            @org.springframework.data.repository.query.Param("operadorId") Long operadorId,
            @org.springframework.data.repository.query.Param("filterByAssignment") boolean filterByAssignment,
            @org.springframework.data.repository.query.Param("socioIds") java.util.Collection<Long> socioIds);
}
