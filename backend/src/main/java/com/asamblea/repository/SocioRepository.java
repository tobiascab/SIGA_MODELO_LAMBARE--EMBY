package com.asamblea.repository;

import com.asamblea.model.Socio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SocioRepository extends JpaRepository<Socio, Long> {
        @Query("SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal ORDER BY CAST(s.numeroSocio AS int) ASC")
        List<Socio> findAllByOrderByNumeroSocioAsc();

        // Paginación con sucursal cargada y ordenamiento numérico
        @Query(value = "SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal ORDER BY CAST(s.numeroSocio AS int) ASC", countQuery = "SELECT COUNT(s) FROM Socio s")
        org.springframework.data.domain.Page<Socio> findAllWithSucursal(
                        org.springframework.data.domain.Pageable pageable);

        @Query("SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE s.numeroSocio = :numeroSocio")
        Optional<Socio> findByNumeroSocio(String numeroSocio);

        @Query("SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE s.cedula = :cedula")
        Optional<Socio> findByCedula(String cedula);

        @Query("SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE s.sucursal.id = :sucursalId")
        List<Socio> findBySucursalId(Long sucursalId);

        // Contar total con Voz y Voto (campo habilitadoVozVoto contiene 'Voto')
        @Query("SELECT COUNT(s) FROM Socio s WHERE LOWER(s.habilitadoVozVoto) LIKE '%voto%'")
        Long countConVozYVoto();

        // Contar solo voz (campo habilitadoVozVoto NO contiene 'Voto' pero contiene 'Voz')
        @Query("SELECT COUNT(s) FROM Socio s WHERE LOWER(s.habilitadoVozVoto) NOT LIKE '%voto%' AND LOWER(s.habilitadoVozVoto) LIKE '%voz%'")
        Long countSoloVoz();

        // Contar socios en padrón actual (excluye los dados de baja / fuera del último
        // padrón)
        @Query("SELECT COUNT(s) FROM Socio s WHERE s.enPadronActual = true")
        Long countEnPadronActual();

        // Contar con Voz y Voto SOLO del padrón actual (habilitadoVozVoto contiene 'Voto')
        @Query("SELECT COUNT(s) FROM Socio s WHERE s.enPadronActual = true AND LOWER(s.habilitadoVozVoto) LIKE '%voto%'")
        Long countConVozYVotoEnPadron();

        // Contar solo voz SOLO del padrón actual (habilitadoVozVoto NO contiene 'Voto' pero contiene 'Voz')
        @Query("SELECT COUNT(s) FROM Socio s WHERE s.enPadronActual = true AND LOWER(s.habilitadoVozVoto) NOT LIKE '%voto%' AND LOWER(s.habilitadoVozVoto) LIKE '%voz%'")
        Long countSoloVozEnPadron();

        // Contar por sucursal
        @Query("SELECT COUNT(s) FROM Socio s WHERE s.sucursal.id = :sucursalId")
        Long countBySucursalId(Long sucursalId);

        // Contar con voz y voto por sucursal (habilitadoVozVoto contiene 'Voto')
        @Query("SELECT COUNT(s) FROM Socio s WHERE s.sucursal.id = :sucursalId AND LOWER(s.habilitadoVozVoto) LIKE '%voto%'")
        Long countConVozYVotoBySucursalId(Long sucursalId);

        // Buscar exacto por número de socio o cédula - CON SUCURSAL
        @Query("SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE s.numeroSocio = :term OR s.cedula = :term")
        List<Socio> buscarExacto(String term);

        // Buscar parcial por nombre, cédula o número socio - CON SUCURSAL
        // Ordenado para que coincidencias exactas o que empiecen con el término
        // aparezcan primero
        @Query("SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE LOWER(s.nombreCompleto) LIKE LOWER(CONCAT('%', :term, '%')) OR s.cedula LIKE CONCAT('%', :term, '%') OR s.numeroSocio LIKE CONCAT('%', :term, '%') ORDER BY CASE WHEN s.numeroSocio = :term THEN 0 WHEN s.cedula = :term THEN 0 WHEN s.numeroSocio LIKE CONCAT(:term, '%') THEN 1 WHEN s.cedula LIKE CONCAT(:term, '%') THEN 1 ELSE 2 END, s.nombreCompleto ASC")
        List<Socio> buscarParcial(String term);

        // Buscar socios que NO están en ninguna asignación (Sin asignar)
        @Query("SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE NOT EXISTS (SELECT 1 FROM Asignacion a WHERE a.socio.id = s.id) ORDER BY s.nombreCompleto ASC")
        List<Socio> findSociosSinAsignar();

        // Paginación con filtro Voz y Voto (todos los campos en SI)
        @Query(value = "SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE LOWER(s.habilitadoVozVoto) LIKE '%voto%' ORDER BY CAST(s.numeroSocio AS int) ASC", countQuery = "SELECT COUNT(s) FROM Socio s WHERE LOWER(s.habilitadoVozVoto) LIKE '%voto%'")
        org.springframework.data.domain.Page<Socio> findAllConVozYVoto(
                        org.springframework.data.domain.Pageable pageable);

        // Paginación con filtro Solo Voz (al menos 1 campo en NO)
        @Query(value = "SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE LOWER(s.habilitadoVozVoto) NOT LIKE '%voto%' OR s.habilitadoVozVoto IS NULL ORDER BY CAST(s.numeroSocio AS int) ASC", countQuery = "SELECT COUNT(s) FROM Socio s WHERE LOWER(s.habilitadoVozVoto) NOT LIKE '%voto%' OR s.habilitadoVozVoto IS NULL")
        org.springframework.data.domain.Page<Socio> findAllSoloVoz(org.springframework.data.domain.Pageable pageable);

        @Query(value = "SELECT s FROM Socio s LEFT JOIN FETCH s.sucursal WHERE " +
                        "(:numeroSocio IS NULL OR s.numeroSocio = :numeroSocio) AND " +
                        "(:nombre IS NULL OR LOWER(s.nombreCompleto) LIKE LOWER(CONCAT('%', :nombre, '%'))) AND " +
                        "(:telefono IS NULL OR s.telefono LIKE CONCAT('%', :telefono, '%')) AND " +
                        "(:sucursalId IS NULL OR s.sucursal.id = :sucursalId) AND " +
                        "(:estado IS NULL OR " +
                        "  (:estado = 'vozYVoto' AND LOWER(s.habilitadoVozVoto) LIKE '%voto%') OR " +
                        "  (:estado = 'soloVoz' AND (LOWER(s.habilitadoVozVoto) NOT LIKE '%voto%' OR s.habilitadoVozVoto IS NULL))" +
                        ") ORDER BY CAST(s.numeroSocio AS int) ASC",
                        countQuery = "SELECT COUNT(s) FROM Socio s WHERE " +
                                        "(:numeroSocio IS NULL OR s.numeroSocio = :numeroSocio) AND " +
                                        "(:nombre IS NULL OR LOWER(s.nombreCompleto) LIKE LOWER(CONCAT('%', :nombre, '%'))) AND " +
                                        "(:telefono IS NULL OR s.telefono LIKE CONCAT('%', :telefono, '%')) AND " +
                                        "(:sucursalId IS NULL OR s.sucursal.id = :sucursalId) AND " +
                                        "(:estado IS NULL OR " +
                                        "  (:estado = 'vozYVoto' AND LOWER(s.habilitadoVozVoto) LIKE '%voto%') OR " +
                                        "  (:estado = 'soloVoz' AND (LOWER(s.habilitadoVozVoto) NOT LIKE '%voto%' OR s.habilitadoVozVoto IS NULL))" +
                                        ")")
        org.springframework.data.domain.Page<Socio> findWithFilters(
                        @org.springframework.data.repository.query.Param("numeroSocio") String numeroSocio,
                        @org.springframework.data.repository.query.Param("nombre") String nombre,
                        @org.springframework.data.repository.query.Param("telefono") String telefono,
                        @org.springframework.data.repository.query.Param("sucursalId") Long sucursalId,
                        @org.springframework.data.repository.query.Param("estado") String estado,
                        org.springframework.data.domain.Pageable pageable);

        // Calcular el número de orden basado en el número de socio (orden numérico) en
        // el padrón activo
        @Query("SELECT COUNT(s) + 1 FROM Socio s WHERE s.enPadronActual = true AND CAST(s.numeroSocio AS int) < CAST(:numeroSocio AS int)")
        Long calcularNumeroOrden(String numeroSocio);
}
