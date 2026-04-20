# Guía Local de Uruapan

Sitio web estático que muestra los mejores lugares de Uruapan, Michoacán, con información de Google Maps y videos de TikTok / Instagram / Facebook / YouTube.

## Estructura

```
uruapan-guide/
├── index.html       ← estructura y estilos (casi nunca lo tocas)
├── app.js           ← lógica (casi nunca lo tocas)
├── places.json      ← ✨ AQUÍ editas los lugares ✨
└── README.md
```

Toda la información de los lugares vive en `places.json`. Para agregar un lugar nuevo o un video, solo editas ese archivo y guardas — no hay que reescribir nada más.

---

## Cómo correrlo localmente

El sitio carga `places.json` con `fetch()`, lo que significa que **no puedes simplemente hacer doble-clic en `index.html`**. Tienes que servirlo con un servidor local. El más fácil:

```bash
cd uruapan-guide
python3 -m http.server 8000
```

Luego abre http://localhost:8000 en el navegador.

Alternativas si no tienes Python:
- `npx serve` (requiere Node)
- VS Code con la extensión "Live Server"

---

## Cómo agregar un lugar nuevo

Abre `places.json` y agrega un nuevo objeto al arreglo. Formato:

```json
{
  "id": "nombre-unico-sin-espacios",
  "nombre": "Nombre del Lugar",
  "cat": "restaurante",
  "catLabel": "Restaurante",
  "desc": "Descripción breve del lugar, qué lo hace especial, recomendaciones…",
  "rating": 4.7,
  "reviews": 523,
  "horario": "Lun–Vie 9:00–20:00",
  "tel": "+52 452 123 4567",
  "ubicacion": "Calle Independencia 45, Centro",
  "lat": 19.4225,
  "lng": -102.0645,
  "placeId": "ChIJ...",
  "videos": []
}
```

### Categorías permitidas

El campo `cat` debe ser exactamente uno de:
- `restaurante` → `catLabel`: `"Restaurante"`
- `cafe` → `catLabel`: `"Café"`
- `tienda` → `catLabel`: `"Tienda"`
- `servicio` → `catLabel`: `"Servicio"`
- `turismo` → `catLabel`: `"Turismo"`

### Cómo obtener el `placeId`, `lat` y `lng`

1. Busca el lugar en [Google Maps](https://maps.google.com).
2. Haz clic derecho en el pin → el primer número que aparece son las coordenadas (lat, lng). Cópialos.
3. Para el `placeId`, usa https://developers.google.com/maps/documentation/places/web-service/place-id — pega el nombre del lugar y obtén el ID que empieza con `ChIJ...`.

Si no tienes el `placeId`, puedes dejar cualquier valor (ej. `"ChIJ000"`) — el botón de Google Maps seguirá funcionando buscando por nombre, solo que con un poco menos de precisión.

---

## Cómo agregar videos a un lugar

En el objeto del lugar, el campo `videos` es un arreglo. Cada video es un objeto con `url` y opcionalmente `label`:

```json
"videos": [
  { "url": "https://www.tiktok.com/@usuario/video/7234567890123456789", "label": "Tour completo" },
  { "url": "https://www.instagram.com/reel/ABC123xyz/", "label": "El platillo estrella" },
  { "url": "https://www.facebook.com/reel/1234567890", "label": "Entrevista con el chef" },
  { "url": "https://youtube.com/shorts/abc123" }
]
```

### Plataformas soportadas

| Plataforma | Formato del URL |
|---|---|
| **TikTok** | `https://www.tiktok.com/@usuario/video/1234567890123456789` |
| **Instagram** | `https://www.instagram.com/reel/CODIGO/` o `.../p/CODIGO/` |
| **Facebook** | `https://www.facebook.com/reel/1234567890` o `https://fb.watch/XXX` |
| **YouTube** | `https://youtu.be/VIDEOID`, `https://youtube.com/watch?v=VIDEOID`, `https://youtube.com/shorts/VIDEOID` |

### Qué pasa en el sitio con los videos

- Lugares con videos muestran una **insignia roja pulsante** ("Video") en la esquina superior izquierda de la tarjeta.
- La imagen de portada se vuelve clickeable con un botón de play grande.
- Aparecen **chips por plataforma** debajo de la descripción.
- El marcador en el mapa lleva un pequeño símbolo ▶ en la esquina.
- El filtro **"▶ Solo con video"** permite ver únicamente lugares con video.
- Al hacer clic se abre un modal con formato vertical (9:16) ideal para reels.
- Si un video no permite ser incrustado (puede pasar con Facebook si no es público), el modal muestra el enlace para abrirlo directamente en la plataforma.

### Nota sobre Facebook

Facebook solo permite incrustar videos públicos. Si el video es parte de un reel privado o de un perfil no público, el usuario verá un enlace para abrirlo en Facebook directamente.

---

## Control de versiones (Git)

El proyecto ya está inicializado como repo de Git. Los comandos más comunes:

### Ver qué cambiaste
```bash
git status            # lista archivos modificados
git diff places.json  # ver los cambios en un archivo
```

### Guardar un cambio
```bash
git add places.json
git commit -m "Agrega Café Odisea con video de TikTok"
```

O para guardar todos los cambios de una:
```bash
git add .
git commit -m "Descripción de lo que cambió"
```

### Ver el historial
```bash
git log --oneline
```

### Deshacer cambios no guardados en un archivo
```bash
git checkout places.json
```

### Subirlo a GitHub (recomendado como respaldo en la nube)

1. Crea un repo vacío en github.com.
2. En tu terminal:
```bash
git remote add origin https://github.com/TU-USUARIO/uruapan-guide.git
git push -u origin main
```
3. De ahí en adelante, después de cada commit:
```bash
git push
```

### Flujo típico para agregar un lugar

```bash
# 1. Edita places.json en tu editor
# 2. Verifica visualmente que funcione:
python3 -m http.server 8000
# (Ctrl+C para detener)

# 3. Guarda el cambio
git add places.json
git commit -m "Agrega [nombre del lugar]"
git push   # si tienes GitHub configurado
```

---

## Publicar el sitio en internet (gratis)

Opciones fáciles, todas gratuitas:

- **GitHub Pages** — sube el repo a GitHub, activa Pages en Settings. Listo.
- **Netlify** — arrastra la carpeta al navegador en netlify.com/drop. Listo en 10 segundos.
- **Cloudflare Pages** — conecta el repo de GitHub, deploy automático en cada push.

Todas funcionan perfectamente con sitios estáticos como este (HTML + JS + JSON).
