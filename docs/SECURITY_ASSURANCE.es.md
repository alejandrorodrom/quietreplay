# Caso de aseguramiento de seguridad

[English](./SECURITY_ASSURANCE.md)

Este documento argumenta por qué QuietReplay cumple sus requisitos de
seguridad. Es el assurance case del proyecto para OpenSSF Best Practices
(silver/gold).

## Requisitos de seguridad (qué puede esperar el usuario)

QuietReplay **sí**:

- Guarda las grabaciones en la máquina local (Downloads / perfil del navegador).
- Evita endpoints de red operados por QuietReplay para datos de captura (`connect-src 'none'`).
- Declara solo los permisos de Chrome necesarios para grabar/guardar/vídeo.
- Ofrece redacción opcional de patrones típicos de secretos (apagada por defecto).

QuietReplay **no** (por diseño):

- Crea cuentas ni sincroniza grabaciones a la nube de QuietReplay.
- Garantiza que una página hostil no pueda observar las acciones del usuario en esa página.
- Garantiza que la redacción atrape todo secreto (los patrones son heurísticos).

## Modelo de amenazas

| Amenaza | Mitigación |
|---------|------------|
| Exfiltración de la grabación a un servidor del atacante vía código de la extensión | CSP `connect-src 'none'`; CI `check:no-network` en bundles; code review |
| Acceso demasiado amplio a hosts | `optional_host_permissions`; el usuario concede por sitio |
| Valores sensibles en el ZIP guardado | Redact opcional; el usuario controla qué graba y comparte |
| Compromiso de supply chain del ZIP de release | Build en GitHub Actions; attestations (provenance SLSA); SBOM en el release |
| Contribución maliciosa | Review de PR; reglas de rama; CODEOWNERS; Dependabot; CodeQL |

## Límites de confianza

Ver [ARCHITECTURE.es.md](./ARCHITECTURE.es.md#límites-de-confianza). Los datos
que cruzan página ↔ extensión se tratan como entrada no confiable en
selectores/texto; la salida es un archivo local que el usuario decide compartir.

## Principios de diseño seguro aplicados

| Principio | Cómo |
|-----------|------|
| Fail-safe defaults | Sin red desde páginas de la extensión; redacción opt-in |
| Least privilege | Permisos MV3 mínimos; hosts opcionales |
| Complete mediation | Captura solo con la pestaña armada; stop limpia la sesión |
| Economy of mechanism | Pipeline ZIP local sin plano de control en la nube |
| Psychological acceptability | Estados de UI claros (Listo / Grabando / Guardando) |

## Clases de debilidad comunes contrarrestadas

| Clase (ejemplos) | Contramedida |
|------------------|--------------|
| CWE-319 / transmisión en claro | Sin transmisión de capturas por red QuietReplay |
| CWE-200 / exposición de información | Redact opcional; almacenamiento solo local |
| CWE-829 / inclusión de esfera no confiable | Actions pineadas por SHA; lockfile; npm audit |
| Inyección en páginas de la extensión | CSP; sin carga remota de scripts |
| OWASP A07 fallos de identificación | Sin auth de usuario final en el producto |

## Revisión de seguridad

Una revisión de seguridad del mantenedor sobre requisitos y límites quedó
registrada para este assurance case (2026). Re-revisar al menos cada cinco años
o tras cambios mayores de arquitectura (nuevos permisos, cualquier feature de
red, nuevos sinks de captura).

## Verificación

- Tests unitarios + e2e en CI
- `pnpm run check:no-network`
- CodeQL en push/PR
- Workflow OpenSSF Scorecard
- Attestations de release: `gh attestation verify --repo alejandrorodrom/quietreplay <zip>`
