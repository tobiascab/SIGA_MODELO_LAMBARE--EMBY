package com.asamblea.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private Long id;
    private String username;
    private String nombreCompleto;
    private String rol;
    private String permisosEspeciales;
    private Boolean requiresPasswordChange;
    private String fotoPerfil;
    private String telefono;
    private Boolean isDirigente;
    private String error;
}
