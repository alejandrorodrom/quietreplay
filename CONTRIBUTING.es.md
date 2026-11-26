# Contribuir

Gracias por ayudar a mejorar **QuietReplay**.

[English](./CONTRIBUTING.md)

## Configuración de desarrollo

```bash
git clone https://github.com/alejandrorodrom/quietreplay.git
cd quietreplay
pnpm install
pnpm run build
```

Requisitos: Node.js `>= 22.12`, pnpm 9+.

Carga la extensión desempaquetada desde `.output/chrome-mv3` (tras `pnpm run build` o `pnpm run dev`).

## Scripts

| Comando | Propósito |
|---------|-----------|
| `pnpm run dev` | Servidor WXT + recarga |
| `pnpm run build` | Build de producción |
| `pnpm run zip` | ZIP de la extensión Chrome |
| `pnpm run compile` | Typecheck |
| `pnpm run lint` | ESLint |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm run test:coverage` | Unitarios con umbrales de cobertura |
| `pnpm run test:e2e` | E2e clásico Playwright (obligatorio si tocas el flujo de captura) |
| `pnpm run test:e2e:external` | E2e externos / frágiles (informativos en CI) |
| `pnpm run check:no-network` | Falla si el bundle introduce APIs de red |
| `pnpm run check:license-headers` | Comprueba headers SPDX/copyright en fuentes |

CI ejecuta lint, typecheck, build, unitarios (con cobertura), check sin red,
CodeQL y e2e clásico. El e2e externo corre después de forma informativa
(`continue-on-error`).

## Estándares de código

- TypeScript según la config del repo; no añadas `any` sin motivo.
- Prefiere módulos pequeños y enfocados en `lib/` para lógica testeable.
- Prefiere controles HTML nativos en popup/options; consulta Modern Web Guidance para UI.
- **Nunca** añadas llamadas de red remotas desde el código de la extensión. La ofuscación sigue opt-in.
- Mantén strings de UI en `locales/en.ts` y `locales/es.ts`.

## Política de tests (obligatoria en cambios mayores)

- Al añadir **funcionalidad mayor nueva**, añade tests automatizados
  (`tests/unit` y/o `tests/e2e` según corresponda).
- Al corregir un bug, añade un **test de regresión** cuando sea práctico.
- Ejecuta `pnpm test` (y e2e si tocas captura) antes de abrir un PR.
- Los umbrales de cobertura se aplican en CI (`pnpm run test:coverage`). El piso actual
  es estilo Silver (≥80% statements / ≥65% branches en `lib/`); súbelo hacia Gold
  (90% / 80%) a medida que crezcan los tests. Ver [docs/OPENSSF.es.md](./docs/OPENSSF.es.md).

## Code review

Las reviews comprueban:

1. Corrección y casos límite (ciclo de vida de pestaña, permisos, guardado).
2. Que no haya red / telemetría / endpoints cloud nuevos.
3. Tests y docs (EN + ES) actualizados si cambia el comportamiento.
4. Entradas de changelog en releases visibles.
5. Que secretos y redacción sigan seguros por defecto.

Contribuidores externos: abrid un pull request; los mantenedores aprueban antes del merge.
Los issues con etiqueta `good first issue` están pensados para contribuidores nuevos o ocasionales.

## Pull requests

- Mantén los cambios enfocados; sigue la plantilla de PR.
- Actualiza **ambos** `README.md` y `README.es.md` (y otros `*.es.md`) cuando cambie el comportamiento visible.
- Actualiza `CHANGELOG.md` y `CHANGELOG.es.md` en releases visibles.
- Enlaza issues relacionados.

## Docs del proyecto

- [GOVERNANCE.es.md](./GOVERNANCE.es.md) — roles y decisiones
- [ROADMAP.es.md](./ROADMAP.es.md) — intención a corto/medio plazo
- [docs/ARCHITECTURE.es.md](./docs/ARCHITECTURE.es.md) — diseño
- [docs/SECURITY_ASSURANCE.es.md](./docs/SECURITY_ASSURANCE.es.md) — modelo de amenazas

## Código de conducta

Ver [CODE_OF_CONDUCT.es.md](./CODE_OF_CONDUCT.es.md).
