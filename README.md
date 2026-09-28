# Réplica de Loftus y Burns (1982) — *Mental shock can produce retrograde amnesia*

**ESIC University · Métodos, Diseño y Técnicas de Investigación en Psicología**
**Tema 4 · Diseños experimentales con grupos distintos de participantes** — sesión «Viaje a través de un experimento»

Esta aplicación web permite reproducir en clase el experimento de Loftus y Burns (1982) con un diseño de **dos grupos aleatorios** (experimental y control):

1. El estudiante lee un **consentimiento informado** con una descripción genérica, que no revela las variables. Si no acepta, se le dan las gracias y no se guarda nada.
2. Si acepta, se le asigna **aleatoriamente** a una de las dos condiciones.
3. Ve las **instrucciones** y una secuencia de imágenes a pantalla completa. Cada imagen dura 4 s, avanza sola y no se puede pausar ni volver atrás.
4. Hace una **tarea distractora** de 60 s.
5. Responde un **cuestionario cerrado**. Sus respuestas se envían a una **Google Sheet**, que las guarda ya **codificadas** (acierto = 1 / error = 0).
6. El profesor proyecta **`resultados.html`**, que compara los dos grupos en directo: distribuciones, t de Welch, U de Mann-Whitney, χ² / Fisher para el ítem crítico y control de la manipulación.

> Referencia: Loftus, E. F. y Burns, T. E. (1982). Mental shock can produce retrograde amnesia. *Memory & Cognition, 10*(4), 318-323. https://doi.org/10.3758/BF03202423

---

## 0. Secuencia de imágenes (versión corregida)

| Archivo | Contenido | Grupo experimental | Grupo control |
|---|---|---|---|
| `e01.jpg` | Discusión vista de frente · camiseta **nº 17** visible | 1.ª (0-4 s) | 1.ª (0-4 s) |
| `e03.jpg` | Amenaza con arma (el joven, de espaldas) | 2.ª (4-8 s) | — |
| `e05.jpg` | El hombre de pelo rizado en el suelo | 3.ª (8-12 s) | — |
| `e02.jpg` | La discusión continúa (el joven, de espaldas) | — | 2.ª (4-8 s) |
| `e04.jpg` | El hombre de pelo rizado, solo y de pie | — | 3.ª (8-12 s) |

- La **escena común** es solo `e01`. El número 17 se ve durante los **4 s inmediatamente anteriores al incidente**; en el original se veía de 4 a 2 s antes.
- Los dos finales son **simétricos**: 2 escenas de 4 s. En la primera aparecen los dos hombres, con el joven de espaldas y el número oculto. En la segunda aparece solo el hombre de pelo rizado. Así la ropa y el fondo se ven el mismo tiempo en ambos grupos, y la única diferencia es el contenido emocional (la VI).
- Los nombres de archivo son neutros a propósito: un estudiante que inspeccione la página no ve «disparo.jpg».
- Si sustituyes alguna imagen, conserva el nombre de archivo y revisa `docs/cuestionario.md`: cada ítem de relleno debe referirse a información **igual de visible en los dos grupos**.

---

## 1. Qué hay en esta carpeta

```
replica-loftus-burns/
├── index.html              ← experimento (lo que abren los estudiantes)
├── resultados.html         ← panel de resultados (lo que proyecta el profesor)
├── css/estilos.css         ← estilo ESIC (azul #0047E8, marino #001447, naranja #FF9606)
├── js/
│   ├── config.js           ← ★ ÚNICO archivo a editar: URL de la base de datos, tiempos, imágenes y preguntas
│   ├── experimento.js      ← flujo del participante (consentimiento → envío)
│   ├── estadistica.js      ← t de Welch, U de Mann-Whitney, χ², Fisher (verificado con SciPy)
│   └── resultados.js       ← gráficos y tablas del panel
├── img/
│   ├── logo-esic-azul.png
│   ├── logo-esic-blanco.png
│   └── estimulos/e01.jpg … e05.jpg
├── Loftus_Burns_datos.xlsx ← plantilla de la hoja de cálculo (por si hay que recrearla)
├── apps-script/
│   ├── Code.gs             ← código de la base de datos (Google Apps Script)
│   ├── crear_plantilla_xlsx.py  ← regenera la plantilla si cambias las preguntas
│   ├── columnas.json / preguntas.json  ← columnas y clave usadas por el script
├── docs/
│   ├── cuestionario.md     ← cuestionario completo, clave de corrección y codificación
│   └── debriefing.md       ← texto para explicar el estudio al terminar
└── .nojekyll               ← hace que GitHub Pages sirva los archivos tal cual
```

---

## 2. Probarlo en tu ordenador (sin base de datos)

Con `ENDPOINT: ""` en `js/config.js`, la aplicación funciona en **modo local**: guarda las respuestas solo en el navegador.

1. Abre una terminal en la carpeta y ejecuta `python3 -m http.server 8000`.
2. Abre `http://localhost:8000/index.html` y haz el experimento.
3. Para repetirlo (el navegador recuerda que ya participaste), abre `http://localhost:8000/index.html?reset=1`.
4. Abre `http://localhost:8000/resultados.html`:
   - **«Datos de este navegador»** muestra tus pruebas.
   - **«Datos simulados»** genera 64 participantes ficticios, para ensayar la explicación de los gráficos.

---

## 3. Conectar la hoja de cálculo (Google Sheets + Apps Script) — unos 10 minutos

La hoja de cálculo **ya está creada en tu Google Drive**: **«Loftus_Burns_datos (réplica MDTI · ESIC)»**. Si alguna vez hay que recrearla, sube `Loftus_Burns_datos.xlsx` a Drive y ábrela con Hojas de cálculo de Google.

Tiene cinco pestañas:

| Pestaña | Qué contiene |
|---|---|
| **Resumen** | Estadísticos **en vivo**, calculados con fórmulas: n, medias, DT, t de Welch, gl, p, d de Cohen, % de aciertos del 17 con χ² de Yates, y control de la manipulación. Aplica los mismos filtros de exclusión que el panel. En **B4** puedes escribir una cohorte para filtrar. |
| **Respuestas** | Una fila por participante, ya codificada. La escribe la web: **no cambies las cabeceras de la fila 1**. |
| **Clave** | Respuestas correctas del cuestionario. |
| **Asignaciones** | Registro de la aleatorización equilibrada. |
| **Leeme** | Descripción de las columnas. |

Para que la web pueda **escribir** en la hoja y el panel pueda **leerla**, hay que añadirle el script:

1. Abre la hoja en Google Sheets → **Extensiones → Apps Script**.
2. Borra el código que aparece y **pega todo el contenido de `apps-script/Code.gs`**.
3. En la línea `const CLAVE_RESULTADOS = "cambia-esta-clave";`, escribe una clave propia. Es la que pedirá el panel de resultados.
4. Guarda (icono del disquete). En el desplegable de funciones elige **`preparar`** y pulsa **Ejecutar**. Google pedirá permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a (no seguro) → Permitir*. Es normal: el script es tuyo. En la plantilla ya creada, `preparar` no borra nada.
5. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario**. Es imprescindible para que los estudiantes puedan enviar datos sin iniciar sesión.
6. Copia la **URL de la aplicación web** (termina en `/exec`).
7. Abre `js/config.js` y pégala: `ENDPOINT: "https://script.google.com/macros/s/…/exec",`.
8. Comprobación: abre esa URL en el navegador. Debe aparecer `{"ok":true,"info":"Servicio del experimento activo"}`.

> **Si cambias el `Code.gs` más adelante**, haz *Implementar → Gestionar implementaciones → editar (lápiz) → Versión: nueva versión*. Si no, sigue funcionando la versión antigua. Así la URL no cambia.

**Flujo de datos:**

```
Estudiante (index.html) ──POST──▶ Apps Script (doPost) ──▶ pestaña Respuestas ──fórmulas──▶ pestaña Resumen
                         ◀─GET── asignar (doGet)         ──▶ pestaña Asignaciones
Profesor (resultados.html) ◀──GET datos + clave── Apps Script (doGet) ◀── pestaña Respuestas
```

**Cómo funciona la conexión:**

- **Asignación:** al aceptar el consentimiento, la web pregunta `?accion=asignar` y el script asigna la condición con **menos participantes** en esa cohorte (aleatorización equilibrada; en caso de empate, al azar). Si no hay conexión, se hace al azar 50/50.
- **Envío:** al terminar, la web envía una fila con las respuestas **brutas y ya codificadas** (`pXX`, `pXX_ok`, `pXX_conf`, `aciertos_relleno`, `c1_recuerdo_ok`…). El script la añade a *Respuestas*. Si aparece una columna nueva, la crea sola.
- **Lectura:** `resultados.html` pide `?accion=datos&clave=…` y recibe todas las filas de la cohorte en JSON.
- Los datos son **anónimos**: solo un código aleatorio (`P-XXXXX-XXXX`), la condición, las respuestas y metadatos técnicos (tamaño de pantalla, cambios de pestaña, tiempos reales de cada escena).

---

## 4. Publicar en GitHub Pages

1. En GitHub: **New repository** → nombre, p. ej. `replica-loftus-burns` → *Public* → *Create*.
2. **Add file → Upload files** → arrastra **el contenido** de esta carpeta (no la carpeta entera, para que `index.html` quede en la raíz) → *Commit changes*.
   - Alternativa por terminal: `git init && git add . && git commit -m "Réplica Loftus y Burns" && git branch -M main && git remote add origin https://github.com/USUARIO/replica-loftus-burns.git && git push -u origin main`.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. Al cabo de 1-2 minutos estará en `https://USUARIO.github.io/replica-loftus-burns/`.
   - Enlace para los estudiantes: `…/replica-loftus-burns/` (o un código QR de esa URL).
   - Panel del profesor: `…/replica-loftus-burns/resultados.html`.

> El repositorio es público: cualquiera puede ver el código (incluida la clave de corrección en `config.js`). Para una actividad docente no es un problema. Los **datos** no están en GitHub, sino en tu Google Sheet, protegidos por la clave de resultados.

---

## 5. Cómo se usa en la sesión (guion sugerido, ~25 min)

| Momento | Qué hacer |
|---|---|
| **Antes** de explicar nada del estudio | Proyecta el QR / enlace. Todos lo hacen a la vez, en silencio, con cascos si hay sonido ambiente. Pide que **no comenten** nada. |
| 8-10 min | Los estudiantes completan la actividad. |
| En directo | En `resultados.html`, escribe la clave, pulsa **Cargar datos** y activa «Actualizar cada 15 s»: se ve cómo llegan los participantes a cada grupo. |
| Al terminar | Lee `docs/debriefing.md`. |
| Análisis | Recorre el panel: control de la manipulación → ítem crítico → diferencia de medias. Conéctalo con las diapositivas del tema: VI, VD, niveles, variables extrañas, constancia/equilibrado/eliminación, validez interna y externa. |

**Cohortes:** cambia `COHORTE` en `config.js` (p. ej. `"2026-G1"`, `"2026-G2"`) para separar grupos de clase en la misma hoja. En el panel, escribe la cohorte que quieras ver.

**Preguntas para el debate con los datos:**

- ¿Funcionó la manipulación? Mira el malestar: si no hay diferencias, el resto no se puede interpretar.
- ¿Por qué el final control dura lo mismo que el experimental? Es control por constancia.
- ¿Por qué se precargan las imágenes de ambas condiciones? Para que el tiempo de carga no delate la condición.
- ¿Qué pasa con la validez interna si alguien cambia de pestaña? ¿Por qué lo excluimos?
- ¿Es igual de válido hacerlo en casa que en el aula? Es validez externa frente a control experimental.
- En el reconocimiento, ¿el grupo experimental supera el azar (25 %)?
- Con n ≈ 30 por grupo, ¿qué potencia tenemos para detectar el efecto del original? Enlaza con la semana de análisis de datos.

---

## 6. Qué hace exactamente cada pantalla

1. **Consentimiento.** Descripción genérica («cómo percibimos y procesamos escenas visuales breves»), duración, aviso de que las imágenes son ficticias y pueden mostrar tensión, voluntariedad, anonimato y derecho a abandonar. El botón «Sí, acepto» solo se activa al marcar la casilla de mayoría de edad. **«No deseo participar»** → pantalla de agradecimiento, sin guardar nada.
2. **Asignación aleatoria** (invisible para el participante).
3. **Instrucciones:** entorno tranquilo, sin notificaciones, brillo alto, pantalla completa, no se puede volver atrás, no cambiar de pestaña. El botón «Empezar» se activa cuando todas las imágenes están precargadas.
4. **Secuencia.** Pantalla completa negra, cuenta atrás 3-2-1, punto de fijación, escenas de `DURACION_MS` (4000 ms) con 350 ms de negro entre ellas. Durante la secuencia se bloquean el teclado, el clic derecho y el botón «atrás» del navegador. Se registran los cambios de pestaña, las salidas de pantalla completa y el tiempo real de cada escena.
5. **Tarea distractora** (60 s): Stroop de colores. Hay que pulsar el color de la tinta, no la palabra. Equivale a la «short unrelated activity» del Experimento 2 y no usa números para no interferir con el 17.
6. **Cuestionario:** 12 ítems cerrados, cada uno con seguridad 1-5. Todos son obligatorios: si falta alguno, se resalta en rojo. No se puede volver al cuestionario después de continuar.
   - Números: solo dígitos, con teclado numérico en el móvil y validación de rango.
   - Sí/No y opciones: botones de selección única.
7. **Preguntas finales:** interés, malestar, condiciones de visualización, si conocía el estudio y edad.
8. **Fin:** agradecimiento, petición de no comentar nada y código anónimo. El navegador queda marcado para no repetir (el profesor puede usar `?reset=1`).

El detalle de ítems, clave de corrección y codificación está en **`docs/cuestionario.md`**.

---

## 7. El panel de resultados (`resultados.html`)

- **Fuentes de datos:** la hoja de Google Sheets (con clave), datos simulados, o este navegador (modo prueba). Botón **Descargar CSV** (separado por «;», se abre bien en Excel en español) para analizarlo luego en R/JASP/SPSS.
- **Filtros de exclusión** (activados por defecto): quienes conocían el estudio, quienes no vieron bien las imágenes y quienes cambiaron de pestaña.
- **Distribución de aciertos:** histograma en % de cada grupo (0-10 aciertos de relleno).
- **Comparación de grupos:** diagrama de caja con cada participante como punto, mediana y media.
- **Diferencia de medias:** descriptivos, **t de Welch** (no asume varianzas iguales) con **d de Cohen**, y **U de Mann-Whitney** con **r**. Incluye una frase de interpretación automática.
- **Ítem crítico:** % que recuerda / reconoce el 17 por grupo, **χ² con Yates** y **exacta de Fisher**, con los porcentajes del original como referencia y la línea del azar (25 %).
- **Control de la manipulación:** distribución del malestar 1-5 y t de Welch.
- **Aciertos por ítem** y tabla de datos individuales.

Las funciones estadísticas se han comprobado con SciPy. Con los datos del Experimento 1 original (5/115 frente a 31/111), el panel da **χ²(1) = 21,72**, el mismo valor que publicaron Loftus y Burns.

---

## 8. Personalizar

Todo se cambia en `js/config.js`:

- **Tiempos:** `DURACION_MS` (por escena), `DISTRACTORA_S`, `CUENTA_ATRAS_S`.
- **Imágenes:** `SECUENCIA_COMUN` y `FINALES.experimental` / `FINALES.control`. Mantén **la misma duración total** en los dos finales.
- **Preguntas:** añade o quita objetos en `PREGUNTAS`. Cada uno tiene `tipo` (`numero` / `opcion` / `sino`), `correcta`, `valida` (entra en la puntuación), `critica` y `confianza`. Una pregunta puede tener varias respuestas correctas: `correcta: [2, 3]`.
  - **Regla de oro:** un ítem solo puede ser `valida: true` si su información es **igual de visible en los dos grupos**.
- Para añadir una **tercera condición** (como el final «policía» del Exp. 2), habría que ampliar `FINALES` y los arrays de grupos de `experimento.js`, `resultados.js` y `Code.gs`.

---

## 9. Consideraciones éticas

- Las imágenes son **ficticias**, de impacto moderado, sin sangre, y se avisa de ello en el consentimiento sin revelar la manipulación.
- La participación es voluntaria, anónima y sin consecuencias en la evaluación.
- Es imprescindible el **debriefing** (`docs/debriefing.md`) en la misma sesión.
- Si los datos se van a **publicar** o usar fuera del aula (p. ej. en un capítulo o un proyecto de innovación docente), hace falta la aprobación del **comité de ética** de la universidad antes de recoger datos.
- Conecta con la semana de *Consideraciones éticas en la investigación psicológica*: engaño, consentimiento y debriefing.

---

## 10. Problemas frecuentes

| Problema | Solución |
|---|---|
| El panel dice «clave incorrecta» | La clave de `Code.gs` y la escrita en el panel no coinciden. Si cambiaste `Code.gs`, crea una **nueva versión** de la implementación. |
| No llegan filas a la hoja | Revisa que el acceso sea «**Cualquier usuario**» y que `ENDPOINT` termine en `/exec`, no en `/dev`. |
| «Actividad ya realizada» al probar | Añade `?reset=1` a la URL. |
| En iPhone no entra en pantalla completa | iOS Safari no lo permite en páginas web; las imágenes se ven igualmente a toda la ventana. Pide que usen el móvil en horizontal o, mejor, un ordenador. |
| Los grupos quedan desequilibrados | La asignación equilibrada solo funciona con `ENDPOINT` configurado. Sin él, es 50/50 simple. |
| Quiero borrar las pruebas | Borra las filas de las pestañas *Respuestas* y *Asignaciones*, o usa otra `COHORTE`. |
