# Registro de cambios

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

[English](./CHANGELOG.md)

## [Sin publicar]

## [2.1.0] - 2026-11-26

### Añadido

- Página para abrir archivos guardados de QuietReplay en este equipo, cambiarles el nombre y guardar varias grabaciones en un solo archivo (`quietreplay-bundle/v1`)

### Cambiado

- El popup, los ajustes y la página de archivos guardados usan palabras cotidianas, y el README describe cada control de esas pantallas
- La página de archivos guardados muestra el video entero. Desaparece la tira de capturas; la cuenta sigue en **De un vistazo**, y las fotos siguen en el archivo

### Eliminado

- Tira de capturas en la página de archivos guardados

## [2.0.0] - 2026-11-26

### Cambiado

- La grabación guarda toda la sesión desde **Grabar** hasta **Detener y guardar** (sin ventana de tiempo)
- Textos del popup, los ajustes y la descripción de Chrome en lenguaje cotidiano: la acción principal es **Grabar**
- Ocultar contraseñas y datos privados sigue apagado hasta que lo actives
- El informe legible describe los clics con palabras, sin códigos de la página
- Los pasos del informe nombran la tecla pulsada y, en los clics, el texto del botón o la etiqueta del campo (aria-label, `<label>`, placeholder, contenedores de formulario), sin leer lo escrito
- El informe JSON y Markdown incluye todos los pasos, errores y requests fallidos (sin tope)
- La captura guarda la sesión completa: sin tope de eventos, capturas, video, bodies ni consola

### Eliminado

- Ajuste de duración del búfer (30 s–5 min)

## [1.0.0] - 2026-11-25

### Añadido

- Extensión Chrome MV3 local de captura de bugs (iniciar / detener / guardar) con búfer circular
- Consola, errores, clics, navegación, capturas; video y cuerpos de red activos por defecto
- Popup con estado claro de capturando / detenido; la captura sobrevive recargas hasta detenerla
- Captura de red (fetch/XHR) y HAR 1.2; se excluye tráfico `chrome-extension://` de la extensión
- Ofuscación opcional (redacción + blur de inputs), apagada por defecto
- Video de pestaña vía `tabCapture` + MediaRecorder offscreen
- Página de opciones: duración del búfer, cuerpos de red, video, ofuscación, carpeta de descarga, reglas extra, idioma ES/EN
- Exportación ZIP: `report.json`, `report.md`, `console.json`, `events.json`, `network.har`, capturas, `video.webm` opcional
- Check de cero red en CI, tests unitarios, e2e Playwright
- Docs bilingües (EN/ES), SECURITY, CONTRIBUTING, PRIVACY, plantillas de comunidad

## [0.1.0] - 2026-11-25

### Añadido

- Scaffold inicial y pipeline de captura (supersedido por 1.0.0 en el mismo tren de release)
