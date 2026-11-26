<!-- QuietReplay logo: cambia con el tema claro/oscuro de GitHub. -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo/quietreplay-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="logo/quietreplay-logo-light.svg">
    <img alt="QuietReplay" src="logo/quietreplay-logo-light.svg" width="360">
  </picture>
</p>

# QuietReplay

QuietReplay graba lo que haces en una página web y guarda un archivo en tu equipo, para verlo después o enviárselo a alguien. Pulsa **Grabar**, haz lo que quieres mostrar y pulsa **Detener y guardar**. No se envía nada a internet y no hay que crear una cuenta.

[English](./README.md) · [Privacidad](./PRIVACY.es.md) · [Contribuir](./CONTRIBUTING.es.md) · [Seguridad](./SECURITY.es.md)

Las palabras de esta guía son las mismas que aparecen en la pantalla.

## Grabar una página

1. Abre la página. Tiene que ser un sitio normal (la dirección empieza por `http://` o `https://`). QuietReplay no puede grabar las páginas propias de Chrome, la Chrome Web Store ni otra extensión.
2. Pulsa el icono de QuietReplay. Al pasar el cursor dice **QuietReplay — grabar esta página**.
3. Pulsa **Grabar**. Chrome puede pedir acceso a ese sitio. Acéptalo si vas a recargar la página. Si lo rechazas, esta vista se puede grabar, pero al recargar pueden dejar de anotarse cosas nuevas.
4. Haz lo que quieres mostrar. Puedes cerrar la ventana de QuietReplay: la grabación sigue. Si recargas la página, la grabación sigue. Si cierras la pestaña, la grabación se descarta y no se guarda.
5. Abre QuietReplay otra vez y pulsa **Detener y guardar**.

Graba una página cada vez. El video es el de la pestaña donde pulsaste **Grabar** por última vez.

### Qué dice la ventana

| Lo que ves | Cuándo |
|------------|--------|
| **Listo** | En esta pestaña no se está grabando. El texto dice que pulses **Grabar**. |
| **Grabando…** | QuietReplay está grabando. El texto dice que pulses **Detener y guardar** al terminar. El botón se pone rojo. |
| **Guardando…** | Se está escribiendo el archivo. El botón no se puede pulsar. |
| **Guardado** | El archivo está en Descargas. El texto dice que mires allí. |

Mientras grabas aparece **Nombre del archivo**. Puedes cambiarlo. Si lo dejas así, se usa ese nombre. El campo se oculta mientras se guarda.

Si **Grabar un video** está activado, bajo el botón sale una de estas frases:

- **Empezando el video…**
- **El video también se está grabando**
- **No se pudo grabar el video. El resto sí se guarda.**

**Idioma** es **English** o **Español**. Cambiarlo aquí se guarda al momento. La misma elección está en **Ajustes**, donde igual hay que pulsar **Guardar ajustes**. La primera vez, QuietReplay sigue a Chrome: español si el idioma de Chrome es español, e inglés en los demás casos.

**Ver un archivo guardado** abre la página de [Ver un archivo guardado](#ver-un-archivo-guardado).

**Ajustes** abre la página de [Ajustes](#ajustes).

### El icono de la barra

| Marca | Significado |
|-------|-------------|
| **REC** | Esta pestaña se está grabando. |
| **…** | Esta pestaña se está guardando. |
| **✓** | Acaba de guardarse. Desaparece al momento. |

Recargar no quita **REC** mientras la grabación siga.

## Atajos de teclado

Chrome propone estos. Se pueden cambiar en `chrome://extensions/shortcuts`. En un Mac, Alt es la tecla Opción.

| Atajo | Qué hace |
|-------|----------|
| `Alt+Mayús+R` | Empezar a grabar, o parar y guardar |
| `Alt+Mayús+B` | Parar y guardar. Si esta pestaña no está grabando, no pasa nada. |
| `Alt+Mayús+L` | Abrir QuietReplay |

## Ajustes

Puedes grabar sin cambiar nada. Pulsa **Guardar ajustes** cuando los cambies. QuietReplay los recuerda en este navegador. No se copian a tu cuenta de Google.

La carpeta, el idioma y **Ocultar contraseñas y datos privados** se usan al pulsar **Detener y guardar**.

**Guardar lo que carga la página** y **Grabar un video** se usan la próxima vez que pulses **Grabar**. Si la página se recarga durante una grabación, **Guardar lo que carga la página** se lee de nuevo.

| Ajuste | Al empezar | Qué hace |
|--------|------------|----------|
| **Idioma** | El de Chrome | English o Español, para QuietReplay y para el informe legible. |
| **Guardar lo que carga la página** | Activado | Guarda los datos que la página envía y recibe. Apágalo si el archivo quedaría demasiado grande. El archivo sigue anotando que hubo una petición. |
| **Grabar un video** | Activado | Un video de la página, para verlo después. |
| **Ocultar contraseñas y datos privados** | Apagado | Tapa contraseñas y datos privados en el archivo, y pone borrosos los campos en las capturas. El video es la pantalla tal como la viste. |
| **Carpeta en Descargas** | `quietreplay` | Los archivos van dentro de esta carpeta. Si la borras, se usa el nombre `quietreplay`. Se quitan las barras. |
| **Más formas de ocultar** | Vacío | Solo se usa si **Ocultar contraseñas y datos privados** está activado. Se abre solo si ya guardaste algo aquí. |

**Palabras que quieres ocultar en el archivo** — una palabra o frase por línea. Si aparece en el archivo, se sustituye por `[REDACTED]`. Basta una palabra normal. No distingue mayúsculas. Caracteres como `(` y `[` empiezan un patrón: si no los cierras, **Guardar ajustes** no guarda y el mensaje **Esta línea no se puede usar** nombra esa línea.

**Zonas que quieres ver borrosas** — una por línea. Son los nombres que muestra Chrome al inspeccionar la página. Se ven borrosas en las capturas. Si no sabes qué escribir, déjalo vacío. Para copiar un nombre:

1. Pulsa el área con el botón derecho y elige **Inspeccionar**.
2. Pulsa con el botón derecho la línea resaltada y elige **Copiar**, luego **Copiar selector**.
3. Pégalo en una línea sola.

Un nombre que no coincide con nada se guarda y, simplemente, no difumina nada.

Si se guardó bien, la página dice **Ajustes guardados**.

## Qué se graba

El archivo guarda todo el tiempo desde **Grabar** hasta **Detener y guardar**. No hay un límite de tiempo.

| Entra | No entra |
|-------|----------|
| Los clics, con las palabras del botón o del enlace (no el texto que hay dentro de un campo) | Lo que escribiste, guardado como el contenido de un campo |
| Cada tecla que pulsas. En un campo de contraseña la nota es `*`. En los demás campos es la tecla, salvo que ocultar esté activado: entonces las letras de los campos de texto también son `*`. Mayús, Ctrl, Alt y la tecla Comando solas no se anotan. El espacio se escribe como Space. | Otras pestañas |
| Cada vez que la página cambia de dirección, con la dirección y el título | Imágenes, estilos y otros archivos que el navegador carga por su cuenta |
| Los errores que encuentra la página | Las direcciones de la propia QuietReplay |
| Los mensajes que la página escribe para sí misma (lo que un desarrollador llama consola) | |
| Las peticiones que hace la página. Una petición «no cargó» si falló o si el sitio respondió con un error. | |
| Capturas al hacer clic, al cambiar de página y una al parar. Como mucho, una cada 2 segundos. | |
| Un video de esa pestaña, si **Grabar un video** está activado y la grabación sale bien | |

Ocultar, cuando lo activas, tapa en el archivo textos privados habituales: correos, teléfonos, números de tarjeta, direcciones IP, contraseñas dentro de una dirección web y cadenas largas que parecen un secreto. También tapa cabeceras de petición que llevan un inicio de sesión, una cookie o un token. Puede dejar fuera algo que tú consideres privado, y puede tapar algo que querías conservar (un correo, por ejemplo). También se aplican las líneas de **Palabras que quieres ocultar en el archivo**.

Las capturas ponen borrosos los campos de texto, las áreas de texto y las **Zonas que quieres ver borrosas**. El desenfoque es solo para la foto. El video queda como viste la pantalla.

## El archivo

Una grabación se guarda directo en **Descargas**, dentro de la carpeta de Ajustes (normalmente `quietreplay`). QuietReplay no pregunta dónde ponerla. Si Chrome está configurado para preguntar dónde guardar cada archivo, Chrome sí pregunta.

El nombre tiene esta forma: `quietreplay-20261126-133045-ejemplo.com.zip`: la palabra quietreplay, la fecha, la hora y el sitio. Los caracteres que no pueden ir en un nombre se sustituyen. Si no pones `.zip`, se añade. Si el nombre es muy largo, se recorta.

Al abrir el ZIP hay:

| Archivo | Qué es |
|---------|--------|
| `report.md` | Un informe legible en el idioma que tenías elegido: qué hiciste, errores de la página, lo que no cargó y tu navegador (nombre, tamaño de la ventana, densidad de la pantalla, idioma, zona horaria). |
| `report.json` | Los mismos datos en un archivo estructurado. El nombre del esquema es `quietreplay/v1`. |
| `console.json` | Los mensajes de la página, con la hora y el tipo de mensaje. |
| `events.json` | La línea de tiempo completa. |
| `network.har` | Las peticiones de la página, solo si hubo alguna. HAR es una forma habitual de guardar una lista de peticiones. No hace falta para entender la grabación. |
| `screenshots/001-….jpg` | Las fotos, en orden. |
| `video.webm` | El video, solo si se grabó. |

En el informe legible, un paso es uno de estos: **Clic en «…»**, **Clic en la página**, **Pulsó la tecla …**, **Pulsó una tecla**, o **Abrió** seguido del nombre de la página.

## Ver un archivo guardado

Desde la ventana de QuietReplay, elige **Ver un archivo guardado**. El título de la página es **Archivos guardados**. No se sube nada.

**Abrir archivos**, o suelta un archivo en cualquier parte de la página. Puedes abrir varios a la vez.

- Una grabación se abre como un elemento en **Grabaciones**.
- Un archivo que contiene varias grabaciones las abre todas. Si **Título** está vacío, se rellena con el título guardado en ese archivo.
- Cada elemento muestra su nombre, el sitio y cuántos segundos duró.
- Pulsa un elemento para verlo. El actual queda resaltado.
- **Cambiar nombre** (el lápiz, o un doble clic en el nombre): escribe el nombre nuevo y pulsa Intro o haz clic fuera. Escape cancela. Un nombre vacío conserva el anterior. Este nombre es para la lista y para un archivo que guardes después. No cambia el archivo que ya está en Descargas.
- **Cerrar** (la ×) lo quita de la lista. El archivo en Descargas se queda.
- Los videos grandes usan memoria en esta pestaña. Cierra las grabaciones que ya no necesites.

Si el archivo no se puede usar, la página dice una de estas frases:

- **Este archivo no lo creó QuietReplay.**
- **No se pudo abrir este archivo.**
- **Falta una grabación dentro del archivo:** seguido del nombre interno. Las demás grabaciones sí se abren.
- **Este archivo no contiene grabaciones.**

### Una grabación

| Parte de la página | Qué muestra |
|--------------------|-------------|
| El nombre | El nombre de la lista. |
| El título de la página y la dirección | Dónde se grabó. |
| La línea de tiempo | Inicio, fin, duración en segundos y la versión de QuietReplay. |
| **Se ocultaron datos privados al guardar** | Solo si ocultar estaba activado al guardar el archivo. |
| **De un vistazo** | Cuentas de **Errores**, **No cargó**, **Clics** y **Capturas**. |
| **Tiempo de la grabación** | Un reloj como `+0.0s`. Sigue al video. |
| **Video** | El reproductor, ocupando el espacio junto a los pasos, o **Esta grabación no tiene video.** La imagen se ve entera. |
| **Qué hiciste** | Cada paso con su tiempo, o **No se anotaron clics ni cambios de página.** |
| **Mensajes de la página** | Cada mensaje con su tiempo. **Mostrar** los filtra: **Todos**, **Errores**, **Avisos**, **Notas**, **Información**, **Detalle**. Si el filtro no encuentra nada: **No hay mensajes con este filtro.** |
| **Lo que no cargó** | La petición, el código de respuesta, la dirección y cuánto tardó, o **Nada falló al cargar.** |
| **Errores de la página** | El texto del error, o **No apareció ningún error.** |

Si hay video, la página dice: **El resaltado sigue el video. Pulsa un paso para ir a ese momento. Pulsa un mensaje, una carga fallida o un error para ver su detalle.** Un paso mueve el video. El nombre del botón es **Ir a** y el tiempo. Un mensaje, una carga fallida o un error abre una ventana con el texto completo. **Cerrar** la quita. Esc o un clic fuera también la quitan. Si hay video, **Ir a** también está en esa ventana. En una carga fallida, **Copiar petición**, **Copiar respuesta** y **Copiar como curl** copian ese texto. Si sale bien, aparece **Copiado**. Si no, **No se pudo copiar**.

Si no hay video, la página dice: **No hay video, así que las listas no se mueven con el tiempo. Pulsa un mensaje, una carga fallida o un error para ver su detalle.**

### Guardar juntas

**Guardar juntas** junta todas las grabaciones abiertas en un archivo, para compartirlas juntas.

| Control | Qué hace |
|---------|----------|
| **Título** | Opcional. Si lo dejas vacío, el título es **Grabaciones de QuietReplay**. |
| **Nombre del archivo** | Opcional. El texto gris es un nombre automático. Deja la caja vacía para usarlo. |
| **Guardar en un solo archivo** | No se puede pulsar hasta que haya una grabación abierta. Chrome pregunta dónde guardar. Este archivo no tiene que ir a la carpeta de QuietReplay. |

Mientras guarda, la página dice **Guardando…** y luego **Guardado en Descargas.** Si no puede, dice **No se pudo guardar el archivo.**

Ese archivo contiene `bundle.json` (esquema `quietreplay-bundle/v1`, con el título y la lista) y un ZIP por grabación dentro de una carpeta `cases`. Ábrelo después con **Abrir archivos** y cada grabación vuelve con su nombre.

## Para quien la instala desde el código

```bash
pnpm install
pnpm run build
```

Abre `chrome://extensions` → Modo desarrollador → **Cargar descomprimida** → elige `.output/chrome-mv3`.

Hace falta Chrome 116 o posterior. La extensión no abre conexiones de red (`connect-src 'none'`).

## Scripts

Ver [CONTRIBUTING.es.md](./CONTRIBUTING.es.md).

## Licencia

MIT — ver [license](./license).
