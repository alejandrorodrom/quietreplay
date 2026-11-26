# Roadmap

[English](./ROADMAP.md)

Este roadmap describe qué pretende hacer QuietReplay — y qué no — en
aproximadamente el próximo año. Las fechas son orientativas, no compromisos.

## Corto plazo

- Mantener la extensión **solo local** (sin cuentas ni telemetría remota).
- Mejorar la postura OpenSSF: Scorecard, Best Practices (Passing → Silver),
  provenance SLSA en GitHub Releases, artefactos SBOM.
- Endurecer CI: CodeQL, umbrales de cobertura, Dependabot, npm audit.
- Pulir fiabilidad de captura (supervivencia a reload, vídeo opcional).
- Mantener docs bilingües (EN/ES) alineadas en cambios visibles.

## Medio plazo

- Mejoras de UX del visor para paquetes HAR/replay grandes.
- Mejores patrones de redacción y documentación de defaults seguros.
- Ayudas opcionales de publicación a Chrome Web Store / Edge (manual o CI
  con gate), sin cambiar el modelo runtime solo-local.
- Incorporar un segundo reviewer/colaborador para subir el bus factor y
  habilitar revisión de dos personas (Best Practices Gold).

## Fuera de alcance (por ahora)

- Sincronización en la nube, cuentas o subir grabaciones a servidores QuietReplay.
- Grabar páginas de Chrome Web Store / `chrome://` (limitación de plataforma).
- Convertirse en un SaaS general de session replay.

## Cómo influir en el roadmap

Abre un issue de feature o un pull request. Ideas sensibles de seguridad van
por advisories privados (ver [SECURITY.es.md](./SECURITY.es.md)).
