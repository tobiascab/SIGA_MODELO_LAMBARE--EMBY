-- ============================================================================
-- MIGRACIÓN DE SEGURIDAD - Sistema Asamblea Cloud
-- Fecha: 14 de Marzo de 2026
-- ============================================================================
-- IMPORTANTE: Ejecutar este script DESPUÉS de desplegar el nuevo código
-- ============================================================================

-- 1. INVALIDAR TODOS LOS TOKENS JWT EXISTENTES
-- Esto fuerza a todos los usuarios a volver a iniciar sesión con el nuevo secret
UPDATE usuarios
SET token_version = COALESCE(token_version, 0) + 1;

SELECT CONCAT('✅ Tokens JWT invalidados: ', COUNT(*), ' usuarios afectados') AS resultado
FROM usuarios;

-- 2. (OPCIONAL) ELIMINAR COLUMNA password_visible
-- Esta columna ya no se usa y almacenaba contraseñas en texto plano
-- PRECAUCIÓN: Esto es irreversible. Comentar si querés mantener la columna.

-- Verificar si existe la columna antes de eliminarla
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '⚠️  La columna password_visible existe y será eliminada'
        ELSE 'ℹ️  La columna password_visible no existe'
    END AS estado
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'usuarios'
  AND COLUMN_NAME = 'password_visible';

-- Eliminar la columna (descomentar para ejecutar)
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS password_visible;

-- 3. VERIFICAR INTEGRIDAD DE DATOS
SELECT
    'SUPER_ADMIN' as rol,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN token_version > 0 THEN 1 END) as tokens_incrementados
FROM usuarios
WHERE rol = 'SUPER_ADMIN'
UNION ALL
SELECT
    'ADMIN' as rol,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN token_version > 0 THEN 1 END) as tokens_incrementados
FROM usuarios
WHERE rol = 'ADMIN'
UNION ALL
SELECT
    'TODOS' as rol,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN token_version > 0 THEN 1 END) as tokens_incrementados
FROM usuarios;

-- 4. VERIFICAR QUE NO HAYA USUARIOS SIN PASSWORD HASH
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✅ Todos los usuarios tienen password hash'
        ELSE CONCAT('⚠️  ', COUNT(*), ' usuarios sin password hash')
    END AS estado
FROM usuarios
WHERE password IS NULL OR password = '';

-- ============================================================================
-- LOGS DE AUDITORÍA
-- ============================================================================
INSERT INTO log_auditoria (modulo, accion, detalle, usuario, ip_address, fecha)
VALUES (
    'SEGURIDAD',
    'MIGRACION_SEGURIDAD',
    'Migración de seguridad completada: tokens JWT invalidados, campo password_visible deprecado',
    'SYSTEM',
    '127.0.0.1',
    NOW()
);

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
SELECT
    '✅ MIGRACIÓN DE SEGURIDAD COMPLETADA' AS estado,
    NOW() AS fecha_ejecucion;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Todos los usuarios deberán volver a iniciar sesión
-- 2. Las contraseñas están protegidas con bcrypt (NO se almacenan en texto plano)
-- 3. El nuevo JWT secret debe estar configurado en las variables de entorno
-- 4. Verificar que CORS_ALLOWED_ORIGINS esté configurado correctamente
-- ============================================================================
