# ✅ CHECKLIST DE DESPLIEGUE - CORRECCIONES DE SEGURIDAD

**Fecha:** 14 de Marzo de 2026
**Sistema:** Asamblea Cloud
**Responsable:** _____________

---

## 📋 ANTES DEL DESPLIEGUE

- [ ] Revisar todos los cambios en Git
- [ ] Crear backup completo de la base de datos
- [ ] Backup del código actual en producción
- [ ] Verificar que `.env` NO está en el repositorio Git
- [ ] Leer completamente [SECURITY_FIXES.md](SECURITY_FIXES.md)

---

## 🔧 CONFIGURACIÓN DE VARIABLES DE ENTORNO

### En Servidor de Producción

Ejecutar estos comandos en el servidor de producción:

```bash
# Configurar JWT Secret
export JWT_SECRET="45d73f941f05284f56fab705661bf28e6f5d8e3d385d7a5c91e82900941824bd"

# Configurar expiración de tokens (60 minutos)
export JWT_EXPIRATION="3600000"

# Configurar CORS (CAMBIAR POR TUS DOMINIOS REALES)
export CORS_ALLOWED_ORIGINS="https://asamblea.cloud,https://www.asamblea.cloud"
```

### Verificar Variables

- [ ] `JWT_SECRET` configurado
- [ ] `JWT_EXPIRATION` configurado
- [ ] `CORS_ALLOWED_ORIGINS` configurado con dominios correctos
- [ ] Variables NO expuestas públicamente

---

## 🚀 DESPLIEGUE PASO A PASO

### 1. Frontend

```bash
cd frontend
npm install
npm run build
npm start  # o tu comando de despliegue
```

- [ ] Dependencias instaladas sin errores
- [ ] Build completado exitosamente
- [ ] Frontend desplegado

### 2. Backend

```bash
cd backend
mvn clean package -DskipTests
# Desplegar el JAR generado
```

- [ ] Compilación exitosa
- [ ] Backend desplegado
- [ ] Logs sin errores críticos

### 3. Migración de Base de Datos

**⚠️ IMPORTANTE: Ejecutar DESPUÉS de que el nuevo código esté desplegado**

```bash
mysql -u root -p asamblea_db < scripts/security_migration.sql
```

- [ ] Script SQL ejecutado sin errores
- [ ] Todos los tokens JWT invalidados
- [ ] Usuarios notificados que deben volver a iniciar sesión

---

## ✅ VERIFICACIONES POST-DESPLIEGUE

### Verificaciones Funcionales

- [ ] **Login funciona correctamente**
  - Probar con usuario SUPER_ADMIN
  - Probar con usuario normal
  - Verificar que genera nuevo token JWT

- [ ] **Endpoint system-reset protegido**
  - Acceder a `/api/auth/system-reset` sin autenticación → debe retornar **404**
  - En desarrollo: debe requerir autenticación SUPER_ADMIN

- [ ] **CORS funcionando**
  - Verificar que el frontend puede comunicarse con el backend
  - Verificar que dominios no autorizados son bloqueados

### Verificaciones de Seguridad

- [ ] No hay contraseñas en texto plano en la BD (campo `password_visible` vacío o eliminado)
- [ ] Tokens JWT usan el nuevo secret
- [ ] Logs no muestran información sensible
- [ ] `npm audit` muestra máximo 1 vulnerabilidad HIGH (xlsx)

### Verificaciones de Logs

- [ ] No hay errores en logs del backend
- [ ] No hay errores 500 en el frontend
- [ ] Logs de auditoría registran la migración

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Antes | Después | ✓ |
|---------|-------|---------|---|
| **Vulnerabilidades Críticas** | 2 | 0 | [ ] |
| **Vulnerabilidades Altas** | 4 | 1 | [ ] |
| **Calificación de Seguridad** | 6.25/10 | 8.75/10 | [ ] |
| **Secretos en Código** | Sí | No | [ ] |
| **Contraseñas en Texto Plano** | Sí | No | [ ] |

---

## 🔄 ROLLBACK (En caso de problemas)

Si algo sale mal, seguir estos pasos:

### 1. Restaurar Código

```bash
# Frontend
cd frontend
cp backups/security-migration-*/frontend-package.json.backup package.json
npm install

# Backend
cd backend
cp backups/security-migration-*/backend-pom.xml.backup pom.xml
mvn clean package
```

### 2. Restaurar Variables de Entorno

```bash
# Usar el secret antiguo (TEMPORAL - cambiar lo antes posible)
export JWT_SECRET="404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
```

### 3. Restaurar Base de Datos

```bash
# Restaurar desde backup
mysql -u root -p asamblea_db < backup_antes_migracion.sql
```

- [ ] Código restaurado
- [ ] Variables restauradas
- [ ] Base de datos restaurada
- [ ] Sistema funcionando

**⚠️ IMPORTANTE:** Si haces rollback, planificar nueva fecha para aplicar las correcciones.

---

## 📞 SOPORTE

### En caso de problemas

1. **Revisar logs:**
   - Backend: `logs/spring.log`
   - Frontend: consola del navegador (F12)

2. **Verificar configuración:**
   - Variables de entorno
   - Base de datos accesible
   - Puertos disponibles

3. **Contactar:**
   - Equipo de desarrollo
   - Abrir issue en el repositorio

---

## 📝 NOTAS ADICIONALES

### Comunicación a Usuarios

**Mensaje sugerido:**

> Estimados usuarios,
>
> El día [FECHA] a las [HORA] se realizará una actualización de seguridad del sistema.
>
> **¿Qué significa esto para vos?**
> - Deberás volver a iniciar sesión después de la actualización
> - Tu contraseña NO cambia, solo tenés que ingresar de nuevo
> - El sistema estará offline por aproximadamente 15 minutos
>
> Esta actualización mejora significativamente la seguridad de tus datos.
>
> Gracias por tu comprensión.

### Tiempo Estimado

- **Despliegue completo:** 30-45 minutos
- **Downtime esperado:** 10-15 minutos
- **Ventana de mantenimiento recomendada:** Horario de menor uso (madrugada)

---

## ✅ FIRMA DE APROBACIÓN

- [ ] **Desarrollador:** _____________ Fecha: _______
- [ ] **DevOps/SysAdmin:** _____________ Fecha: _______
- [ ] **QA/Testing:** _____________ Fecha: _______
- [ ] **Aprobación Final:** _____________ Fecha: _______

---

**Estado del Despliegue:** [ ] PENDIENTE [ ] EN PROGRESO [ ] COMPLETADO [ ] ROLLBACK

**Observaciones:**
_________________________________________________________________________________
_________________________________________________________________________________
_________________________________________________________________________________
