# Arquitectura

[English](./ARCHITECTURE.md)

QuietReplay es una extensión Chromium Manifest V3 que graba la actividad del
usuario en una página web normal y escribe un ZIP local (HAR + vídeo opcional +
metadatos). Nada se sube a servidores de QuietReplay.

## Componentes de alto nivel

```text
┌─────────────┐     mensajes      ┌──────────────────┐
│ Popup /     │ ◄───────────────► │ Background       │
│ Options UI  │                   │ (service worker) │
└─────────────┘                   └────────┬─────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
             ┌────────────┐         ┌────────────┐         ┌────────────┐
             │ Bridge /   │         │ Offscreen  │         │ Downloads  │
             │ content    │         │ (vídeo)    │         │ (ZIP)      │
             └────────────┘         └────────────┘         └────────────┘
                    │
                    ▼
             Eventos DOM, consola, notas de red
```

| Pieza | Rol |
|-------|-----|
| **Background** (`entrypoints/background.ts`) | Estado de sesión, arm/stop, ensamblar paquete, permisos, badge |
| **Bridge** (`entrypoints/bridge.ts`) | Hooks de captura en la página; habla con background |
| **Popup / Options** | Controles de usuario, ajustes, idioma |
| **Viewer** | UI local para abrir un paquete guardado |
| **Documento offscreen** | Captura de vídeo opcional vía `tabCapture` |
| **`lib/*`** | Helpers puros: HAR, ZIP, redact, settings, selectores, buffers |

## Flujo de datos

1. El usuario pulsa **Grabar** → background arma la pestaña activa e inyecta/habilita el bridge.
2. El bridge observa interacciones; background acumula eventos estructurados.
3. El vídeo opcional corre en un documento offscreen.
4. **Detener y guardar** → construir ZIP HAR/informe en memoria → API `downloads` escribe a disco.
5. Cerrar la pestaña descarta una grabación en curso; un reload no la detiene.

## Límites de confianza

| Límite | Confianza |
|--------|-----------|
| Proceso de extensión ↔ página | La página no es de confianza; el bridge no debe exfiltrar; CSP `connect-src 'none'` |
| Extensión ↔ disco | Carpeta Downloads controlada por el usuario |
| Extensión ↔ red | **Ninguna** hacia backends QuietReplay; la página puede seguir haciendo sus propias peticiones |
| Storage de ajustes | `chrome.storage` local al perfil del navegador |

## Build

- Tooling: [WXT](https://wxt.dev/) + TypeScript + pnpm.
- Artefacto: directorio / ZIP Chrome MV3 con `pnpm run zip`.
- CI: lint, typecheck, unitarios, check sin red, e2e Playwright.
