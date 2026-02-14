package com.asamblea.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "mesas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Mesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer numero;

    private String descripcion;

    @ManyToOne
    @JoinColumn(name = "id_sucursal")
    private Sucursal sucursal;

    // Si rangoDesde y rangoHasta son nulos, podría ser una mesa especial (ej: Solo Voz)
    @Column(name = "rango_desde")
    private Integer rangoDesde;

    @Column(name = "rango_hasta")
    private Integer rangoHasta;

    // "RANGO", "SOLO_VOZ", "ESPECIAL", "INCIDENCIA"
    @Column(nullable = false)
    private String tipo = "RANGO";

    @Column(name = "ubicacion")
    private String ubicacion;

    private boolean activa = true;

    // Relación ManyToMany con Usuarios (Encargados)
    @ManyToMany
    @JoinTable(
        name = "mesas_encargados",
        joinColumns = @JoinColumn(name = "mesa_id"),
        inverseJoinColumns = @JoinColumn(name = "usuario_id")
    )
    private List<Usuario> encargados = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
