# Gobernanza del proyecto

[English](./GOVERNANCE.md)

## Toma de decisiones

QuietReplay lo mantiene el propietario del repositorio. Las decisiones
diarias de producto y seguridad las toma el mantenedor. La discusión pública
ocurre en Issues y Pull Requests de GitHub.

## Roles

| Rol | Quién | Responsabilidades |
|-----|-------|-------------------|
| **Mantenedor / Owner** | [@alejandrorodrom](https://github.com/alejandrorodrom) | Mergear PRs, publicar releases, responder reportes de seguridad, definir el roadmap |
| **Contribuidor** | Quien tenga un PR aceptado | Proponer cambios vía pull requests; seguir CONTRIBUTING |

Cuando se una un segundo colaborador con acceso Write, podrá revisar pull
requests. El número de approvals requeridas podrá subir a dos (ver reglas de rama).

## Merges y releases

- Los cambios externos llegan solo por pull request.
- El owner puede omitir reglas de review en su propio trabajo cuando haga falta.
- Los releases se crean con el workflow `Publish extension release`
  (`workflow_dispatch`) y el environment `production`.
- Las versiones siguen SemVer en `package.json` / `wxt.config.ts`.

## Continuidad

Si el mantenedor no está disponible, la continuidad depende de una transferencia
del repositorio o de elevar a un colaborador. Hasta nombrar un segundo
mantenedor, el bus factor es 1. Notas de sucesión / lockbox de credenciales son
privadas del mantenedor y no viven en este repositorio.

## Código de conducta

Ver [CODE_OF_CONDUCT.es.md](./CODE_OF_CONDUCT.es.md).
