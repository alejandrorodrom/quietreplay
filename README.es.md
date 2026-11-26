<!-- QuietReplay logo: cambia con el tema claro/oscuro de GitHub. -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo/quietreplay-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="logo/quietreplay-logo-light.svg">
    <img alt="QuietReplay" src="logo/quietreplay-logo-light.svg" width="360">
  </picture>
</p>

# QuietReplay

Graba lo que pasa en una página de Chrome y lo guarda en tu equipo. No hace falta saber de informática: pulsa **Grabar**, muestra lo que falló y pulsa **Detener y guardar**. No se envía nada a internet y no hay que crear una cuenta.

[English](./README.md) · [Privacidad](./PRIVACY.es.md) · [Contribuir](./CONTRIBUTING.es.md) · [Seguridad](./SECURITY.es.md)

## Cómo usarla

1. Abre la página que quieres mostrar.
2. Pulsa el icono de QuietReplay y luego **Grabar**.
3. Haz en la página lo que quieres enseñar. Si la recargas, la grabación sigue.
4. Pulsa **Detener y guardar**.

El archivo queda en **Descargas**, dentro de la carpeta `quietreplay`. El nombre se puede cambiar, pero no es necesario.

## Atajos de teclado

| Atajo | Qué hace |
|-------|----------|
| `Alt+Mayús+R` | Empezar a grabar, o parar y guardar |
| `Alt+Mayús+B` | Parar y guardar |
| `Alt+Mayús+L` | Abrir QuietReplay |

## Ajustes

Puedes grabar sin cambiar nada. Si abres **Ajustes** puedes elegir:

- si se guarda lo que carga la página
- si se graba un video
- si se ocultan contraseñas y datos privados (viene apagado)
- la carpeta dentro de Descargas
- el idioma: **Español / English**

La grabación guarda todo desde **Grabar** hasta **Detener y guardar**.

En **Más ajustes** se puede pedir que se oculte un texto o una parte concreta de la página. Si no sabes qué poner, déjalo vacío.

## Para quien la instala desde el código

```bash
pnpm install
pnpm run build
```

Abre `chrome://extensions` → Modo desarrollador → **Cargar descomprimida** → elige `.output/chrome-mv3`.

La extensión no abre conexiones de red (`connect-src 'none'`). Pide acceso al sitio solo al grabar, para seguir si se recarga la página. Hace falta Chrome 116 o posterior. No guarda lo que se escribe en los campos: solo anota dónde se hizo clic. El video de la página usa la captura de pestaña de Chrome.

El archivo incluye un informe legible, capturas, un video si estaba activado y el detalle de lo que cargó la página.

## Scripts

Ver [CONTRIBUTING.es.md](./CONTRIBUTING.es.md).

## Licencia

MIT — ver [license](./license).
