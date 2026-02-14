package com.asamblea.repository;

import com.asamblea.model.Mesa;
import com.asamblea.model.Sucursal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MesaRepository extends JpaRepository<Mesa, Long> {

    List<Mesa> findBySucursalId(Long sucursalId);

    List<Mesa> findByOrderByNumeroAsc();

    @Query("SELECT m FROM Mesa m WHERE m.tipo = 'SOLO_VOZ' AND m.activa = true")
    Optional<Mesa> findMesaSoloVoz();

    // Buscar mesa por rango y sucursal
    @Query("SELECT m FROM Mesa m WHERE m.sucursal = :sucursal AND m.tipo = 'RANGO' AND m.activa = true AND :socioNro BETWEEN m.rangoDesde AND m.rangoHasta")
    Optional<Mesa> findMesaForSocio(@Param("sucursal") Sucursal sucursal, @Param("socioNro") Integer socioNro);
}
