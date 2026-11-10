# VeriNotas

Dos listas y lo cumplido: **Pendientes** (todo entra aquí primero; en el código, `bandeja`) y **Me gustaría**
(lo que apetece hacer, sin fecha). Modo oscuro, pensado para el iPhone.

HTML, CSS y JS sin dependencias ni build. Sin backend, sin cuentas: los datos se
guardan en `localStorage` del dispositivo (`verinotas.v1.cosas`). «Guardar copia»
descarga un `.json`; «Recuperar copia» lo vuelve a cargar.

## Probar en local

```bash
python3 -m http.server 5190   # http://localhost:5190
```

## Publicar

En https://veromoreno.github.io/verinotas/

GitHub Pages sirve la rama `main` tal cual. Si cambias ficheros, sube `CACHE`
en `sw.js` para que el iPhone coja la versión nueva.

## Instalar en el iPhone

Safari → compartir → **Añadir a pantalla de inicio**. Instalada, iOS no borra
sus datos por no usarla; aun así, guarda una copia de vez en cuando.
