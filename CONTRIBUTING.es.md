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
| `pnpm run test:e2e` | E2e clásico Playwright (obligatorio si tocas el flujo de captura) |
| `pnpm run test:e2e:external` | E2e externos / frágiles (informativos en CI) |
| `pnpm run check:no-network` | Falla si el bundle introduce APIs de red |

CI ejecuta unitarios, cero red y e2e clásico como checks requeridos. El e2e externo corre después de forma informativa (`continue-on-error`).

## Pull requests

- Mantén los cambios enfocados; sigue la plantilla de PR.
- Actualiza **ambos** `README.md` y `README.es.md` (y otros `*.es.md`) cuando cambie el comportamiento visible.
- Actualiza `CHANGELOG.md` y `CHANGELOG.es.md` en releases visibles.
- Nunca añadas llamadas de red remotas desde el código de la extensión. La ofuscación sigue siendo opt-in vía ajustes.
- Prefiere controles HTML nativos en popup/options; consulta Modern Web Guidance para UI.

## Código de conducta

Ver [CODE_OF_CONDUCT.es.md](./CODE_OF_CONDUCT.es.md).
