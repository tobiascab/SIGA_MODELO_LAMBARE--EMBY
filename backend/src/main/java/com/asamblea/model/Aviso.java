package com.asamblea.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "avisos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Aviso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tipo", nullable = false)
    @Enumerated(EnumType.STRING)
    private TipoAviso tipo;

    @Column(name = "prioridad")
    @Enumerated(EnumType.STRING)
    private PrioridadAviso prioridad = PrioridadAviso.NORMAL;

    @Column(name = "titulo")
    private String titulo;

    @Column(name = "contenido", columnDefinition = "TEXT", nullable = false)
    private String contenido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emisor_id", nullable = false)
    private Usuario emisor;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "mostrar_modal")
    private Boolean mostrarModal = false;

    @Column(name = "requiere_confirmacion")
    private Boolean requiereConfirmacion = false;

    @Column(name = "requiere_respuesta")
    private Boolean requiereRespuesta = false;

    @Column(name = "programado_para")
    private LocalDateTime programadoPara;

    @Column(name = "estado_general")
    @Enumerated(EnumType.STRING)
    private EstadoAviso estadoGeneral = EstadoAviso.CREADO;

    @Column(name = "ip_emisor")
    private String ipEmisor;

    @Column(name = "user_agent_emisor")
    private String userAgentEmisor;

    // Filtros para envío masivo por filtro
    @Column(name = "filtro_rol")
    private String filtroRol;

    @Column(name = "filtro_sucursal_id")
    private Long filtroSucursalId;

    @Column(name = "imagen_url")
    private String imagenUrl;

    @OneToMany(mappedBy = "aviso", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<AvisoDestinatario> destinatarios = new ArrayList<>();

    public enum TipoAviso {
        INDIVIDUAL, MASIVO, POR_FILTRO
    }

    public enum PrioridadAviso {
        NORMAL, ALTA, CRITICA
    }

    public enum EstadoAviso {
        CREADO, ENVIADO, FINALIZADO, CANCELADO
    }
}
