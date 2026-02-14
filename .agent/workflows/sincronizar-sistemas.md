---
description: Cómo sincronizar funcionalidades entre SIGA Asamblea.cloud y SIGA (repo minercompany)
---

# Sincronización de Sistemas SIGA

## Contexto
Existen dos instancias del sistema SIGA:
- **SIGA Asamblea.cloud** → `/home/sigalam/asamblea.cloud/` (en producción en asamblea.cloud)
- **SIGA Repo (minercompany)** → Clonar de `https://github.com/minercompany/SIGA.git` a `/home/sigalam/SIGA-compare/`

Ambos comparten la misma base pero cada uno fue evolucionando independientemente con funcionalidades distintas.

## Paso 1: Clonar/Actualizar el repo de comparación
```bash
# Si no existe, clonar:
git clone https://github.com/minercompany/SIGA.git /home/sigalam/SIGA-compare
# Si ya existe, actualizar:
cd /home/sigalam/SIGA-compare && git pull
```

## Paso 2: Ejecutar comparación automática
Analizar las diferencias en todas las capas:

### Backend
```bash
# Entidades
comm -23 <(find /home/sigalam/asamblea.cloud/backend/src -name "*.java" -path "*/model/*" | xargs -I{} basename {} .java | sort) <(find /home/sigalam/SIGA-compare/backend/src -name "*.java" -path "*/model/*" | xargs -I{} basename {} .java | sort)

# Controllers
comm -3 <(find /home/sigalam/asamblea.cloud/backend/src -name "*Controller.java" | xargs -I{} basename {} .java | sort) <(find /home/sigalam/SIGA-compare/backend/src -name "*Controller.java" | xargs -I{} basename {} .java | sort)

# Services
comm -3 <(find /home/sigalam/asamblea.cloud/backend/src -name "*Service.java" | xargs -I{} basename {} .java | sort) <(find /home/sigalam/SIGA-compare/backend/src -name "*Service.java" | xargs -I{} basename {} .java | sort)

# Repositories
comm -3 <(find /home/sigalam/asamblea.cloud/backend/src -name "*Repository.java" | xargs -I{} basename {} .java | sort) <(find /home/sigalam/SIGA-compare/backend/src -name "*Repository.java" | xargs -I{} basename {} .java | sort)
```

### Frontend
```bash
# Páginas
comm -3 <(find /home/sigalam/asamblea.cloud/frontend/src/app -name "page.tsx" | sed 's|.*/frontend/src/app||' | sort) <(find /home/sigalam/SIGA-compare/frontend/src/app -name "page.tsx" | sed 's|.*/frontend/src/app||' | sort)

# Componentes
comm -3 <(find /home/sigalam/asamblea.cloud/frontend/src/components -name "*.tsx" | xargs -I{} basename {} .tsx | sort) <(find /home/sigalam/SIGA-compare/frontend/src/components -name "*.tsx" | xargs -I{} basename {} .tsx | sort)
```

## Paso 3: Implementar las diferencias
Ver el reporte de diferencias en `/home/sigalam/asamblea.cloud/REPORTE_SINCRONIZACION.md` y seguir las tareas indicadas.

## Notas importantes
- Siempre hacer backup antes de modificar: `docker exec asamblea-mysql mysqldump -u root -proot_secure_pass_2024 asamblea_db > backup_pre_sync.sql`
- Después de cambios en backend, rebuild: `cd /home/sigalam/asamblea.cloud && docker compose up -d --build backend`
- Después de cambios en frontend, rebuild: `cd /home/sigalam/asamblea.cloud && docker compose up -d --build frontend`
- El repo minercompany es la referencia de las funciones del otro sistema
