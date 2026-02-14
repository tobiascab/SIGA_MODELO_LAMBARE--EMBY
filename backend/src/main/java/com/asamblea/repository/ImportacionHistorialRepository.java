package com.asamblea.repository;

import com.asamblea.model.ImportacionHistorial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ImportacionHistorialRepository extends JpaRepository<ImportacionHistorial, Long> {

    @Query("SELECT i FROM ImportacionHistorial i ORDER BY i.fechaImportacion DESC")
    List<ImportacionHistorial> findTop10ByOrderByFechaImportacionDesc();

    @Query("SELECT MAX(i.totalRegistros) FROM ImportacionHistorial i")
    Integer findMaxTotalRegistros();
}
