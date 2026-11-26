# Política de seguridad

## Versiones soportadas

Las correcciones de seguridad se aplican a la última versión publicada de QuietReplay.

## Cómo reportar una vulnerabilidad

**No** abras un issue público de GitHub para vulnerabilidades de seguridad.

Prefiere una de estas opciones:

1. [GitHub Security Advisories](https://github.com/alejandrorodrom/quietreplay/security/advisories/new) (reporte privado), o
2. Contactar al mantenedor vía el [perfil de GitHub](https://github.com/alejandrorodrom) si los advisories no están disponibles.

Incluye:

- Versión afectada de la extensión
- Pasos para reproducir
- Evaluación de impacto (si la conoces)

Recibirás un acuse de recibo cuando sea posible. Da un tiempo razonable para el arreglo antes de una divulgación pública.

## Alcance

QuietReplay es una extensión de Chrome **solo local**. No envía datos capturados a ningún servidor. La ofuscación/redacción es opcional (apagada por defecto). Reporta problemas que puedan filtrar secretos con la ofuscación activa, saltarse `connect-src 'none'` o elevar privilegios más allá de los permisos declarados.
