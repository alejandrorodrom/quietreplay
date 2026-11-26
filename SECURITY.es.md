# Política de seguridad

[English](./SECURITY.md)

## Versiones soportadas

Las correcciones de seguridad se aplican a la **última versión publicada** de
QuietReplay. Las versiones anteriores no se parchean; actualiza.

## Cómo reportar una vulnerabilidad

**No** abras un issue público de GitHub para vulnerabilidades de seguridad.

Prefiere una de estas opciones:

1. [GitHub Security Advisories](https://github.com/alejandrorodrom/quietreplay/security/advisories/new) (reporte privado) — preferido, o
2. Contactar al mantenedor vía el [perfil de GitHub](https://github.com/alejandrorodrom) si los advisories no están disponibles.

Incluye:

- Versión afectada de la extensión
- Pasos para reproducir
- Evaluación de impacto (si la conoces)

### Plazos de respuesta y divulgación

- Deberías recibir un **acuse de recibo en 14 días** tras un reporte completo.
- Nuestro objetivo es publicar un arreglo o mitigación para issues confirmados
  de severidad media o superior en **90 días** desde el acuse, o acordar una
  fecha de divulgación coordinada si hace falta más tiempo.
- **No** divulgues en público hasta que haya un arreglo o hayan pasado 90 días
  desde el acuse (lo que ocurra antes), salvo acuerdo distinto.

Caso de aseguramiento y modelo de amenazas: [docs/SECURITY_ASSURANCE.es.md](./docs/SECURITY_ASSURANCE.es.md).

## Alcance

QuietReplay es una extensión de Chrome **solo local**. No envía datos capturados
a ningún servidor de QuietReplay. La ofuscación/redacción es opcional (apagada
por defecto). Reporta problemas que puedan filtrar secretos con la ofuscación
activa, saltarse `connect-src 'none'` o elevar privilegios más allá de los
permisos declarados.

## Verificar artefactos de release

Los GitHub Releases pueden incluir attestations de provenance SLSA. Tras
descargar un ZIP:

```bash
gh attestation verify --repo alejandrorodrom/quietreplay ./quietreplay-*.zip
```
