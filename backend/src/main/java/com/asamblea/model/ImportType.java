package com.asamblea.model;

public enum ImportType {
    PADRON_COMPLETO,      // Invalida registros antiguos, UPSERT completo
    SOLO_FALTANTES,       // No invalida, solo UPDATE IF NULL
    ACTUALIZACION_DATOS   // No invalida, UPSERT completo (Overwrite)
}
