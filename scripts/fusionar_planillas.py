#!/usr/bin/env python3
"""
Script para fusionar dos planillas de socios en una sola
Elimina datos financieros y mantiene solo información de perfil
"""

import pandas as pd
import sys
from pathlib import Path

def limpiar_columna(df, columna):
    """Limpia valores vacíos, NaN y espacios en blanco"""
    if columna in df.columns:
        df[columna] = df[columna].fillna('').astype(str).str.strip()
        df[columna] = df[columna].replace(['nan', 'NaN', 'None', ''], None)
    return df

def fusionar_planillas(archivo_padron, archivo_datos_extra, archivo_salida):
    """
    Fusiona dos planillas de Excel en una sola
    
    Args:
        archivo_padron: Excel con datos básicos (numeroSocio, cedula, nombre, etc)
        archivo_datos_extra: Excel con datos adicionales (edad, profesion, direccion, etc)
        archivo_salida: Archivo Excel de salida
    """
    
    print("📋 Leyendo planilla de padrón base...")
    df_padron = pd.read_excel(archivo_padron)
    print(f"   ✓ {len(df_padron)} registros encontrados")
    
    print("\n📋 Leyendo planilla de datos adicionales...")
    df_extra = pd.read_excel(archivo_datos_extra)
    print(f"   ✓ {len(df_extra)} registros encontrados")
    
    # Normalizar nombres de columnas (quitar espacios, mayúsculas)
    df_padron.columns = df_padron.columns.str.strip().str.lower()
    df_extra.columns = df_extra.columns.str.strip().str.lower()
    
    print("\n🔍 Columnas en padrón base:")
    print("   ", list(df_padron.columns))
    print("\n🔍 Columnas en datos adicionales:")
    print("   ", list(df_extra.columns))
    
    # Identificar columna de unión (numeroSocio o cedula)
    columna_union = None
    for posible in ['numerosocio', 'numero_socio', 'nro_socio', 'socio', 'cedula', 'ci']:
        if posible in df_padron.columns and posible in df_extra.columns:
            columna_union = posible
            break
    
    if not columna_union:
        print("\n❌ ERROR: No se encontró columna común para unir (numeroSocio o cedula)")
        print("   Columnas disponibles en padrón:", list(df_padron.columns))
        print("   Columnas disponibles en extra:", list(df_extra.columns))
        sys.exit(1)
    
    print(f"\n🔗 Uniendo planillas por columna: '{columna_union}'")
    
    # Limpiar columna de unión
    df_padron = limpiar_columna(df_padron, columna_union)
    df_extra = limpiar_columna(df_extra, columna_union)
    
    # Realizar fusión (LEFT JOIN para mantener todos los del padrón)
    df_fusionado = df_padron.merge(
        df_extra,
        on=columna_union,
        how='left',
        suffixes=('', '_extra')
    )
    
    print(f"   ✓ {len(df_fusionado)} registros en planilla fusionada")
    
    # Definir columnas finales (SOLO datos de perfil, SIN financieros)
    columnas_deseadas = [
        'numerosocio', 'numero_socio', 'nro_socio', 'socio',  # ID
        'cedula', 'ci',  # Identificación
        'nombrecompleto', 'nombre_completo', 'nombre', 'apellido',  # Nombre
        'telefono', 'celular', 'movil',  # Contacto
        'email', 'correo',  # Email
        'direccion',  # Dirección
        'barrio',  # Barrio
        'ciudad', 'localidad',  # Ciudad
        'edad',  # Edad
        'profesion',  # Profesión
        'ocupacion',  # Ocupación
        'gradoinstruccion', 'grado_instruccion', 'estudios',  # Educación
        'sucursal', 'idsucursal', 'id_sucursal',  # Sucursal
        'mesa',  # Mesa electoral
        'nroordenpadron', 'nro_orden_padron', 'orden',  # Orden
        'habilitadovozvoto', 'habilitado_voz_voto', 'vozvoto', 'voz_voto',  # Estado
        'fechaingreso', 'fecha_ingreso',  # Fecha ingreso
    ]
    
    # Filtrar solo las columnas que existen y NO son financieras
    columnas_excluir = [
        'deuda', 'aporte', 'cubierto', 'solidaridad', 'fondo', 'sede',
        'prestamo', 'credito', 'tarjeta', 'atraso', 'dia', 'pmo', 'tc',
        'incoop', 'aldia', 'al_dia'
    ]
    
    columnas_finales = []
    for col in df_fusionado.columns:
        # Incluir si está en la lista deseada Y NO contiene palabras financieras
        col_lower = col.lower()
        es_deseada = any(deseada in col_lower for deseada in columnas_deseadas)
        es_financiera = any(excluir in col_lower for excluir in columnas_excluir)
        
        if es_deseada and not es_financiera:
            columnas_finales.append(col)
    
    # Si hay columnas duplicadas con sufijo _extra, preferir la del extra
    columnas_limpias = []
    for col in columnas_finales:
        if col.endswith('_extra'):
            col_base = col.replace('_extra', '')
            if col_base in columnas_finales:
                # Reemplazar la columna base con la del extra
                columnas_limpias = [c if c != col_base else col for c in columnas_limpias]
            else:
                columnas_limpias.append(col)
        else:
            if col not in columnas_limpias:
                columnas_limpias.append(col)
    
    df_final = df_fusionado[columnas_limpias].copy()
    
    # Renombrar columnas _extra quitando el sufijo
    df_final.columns = [col.replace('_extra', '') for col in df_final.columns]
    
    # Limpiar todas las columnas
    for col in df_final.columns:
        df_final = limpiar_columna(df_final, col)
    
    print(f"\n📊 Columnas en planilla final ({len(df_final.columns)}):")
    for col in sorted(df_final.columns):
        print(f"   - {col}")
    
    # Guardar
    print(f"\n💾 Guardando planilla fusionada en: {archivo_salida}")
    df_final.to_excel(archivo_salida, index=False, engine='openpyxl')
    
    print(f"\n✅ ¡Listo! Planilla fusionada creada exitosamente")
    print(f"   📁 Archivo: {archivo_salida}")
    print(f"   📊 Registros: {len(df_final)}")
    print(f"   📋 Columnas: {len(df_final.columns)}")
    
    # Estadísticas de datos faltantes
    print("\n📈 Estadísticas de datos faltantes:")
    for col in df_final.columns:
        vacios = df_final[col].isna().sum()
        if vacios > 0:
            porcentaje = (vacios / len(df_final)) * 100
            print(f"   - {col}: {vacios} vacíos ({porcentaje:.1f}%)")

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 FUSIONADOR DE PLANILLAS DE SOCIOS")
    print("=" * 60)
    
    if len(sys.argv) != 4:
        print("\n❌ Uso incorrecto")
        print("\nUso:")
        print("  python fusionar_planillas.py <padron_base.xlsx> <datos_extra.xlsx> <salida.xlsx>")
        print("\nEjemplo:")
        print("  python fusionar_planillas.py padron_2024.xlsx datos_personales.xlsx padron_completo.xlsx")
        sys.exit(1)
    
    archivo_padron = Path(sys.argv[1])
    archivo_extra = Path(sys.argv[2])
    archivo_salida = Path(sys.argv[3])
    
    # Validar que existan los archivos
    if not archivo_padron.exists():
        print(f"\n❌ ERROR: No se encuentra el archivo: {archivo_padron}")
        sys.exit(1)
    
    if not archivo_extra.exists():
        print(f"\n❌ ERROR: No se encuentra el archivo: {archivo_extra}")
        sys.exit(1)
    
    try:
        fusionar_planillas(archivo_padron, archivo_extra, archivo_salida)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
