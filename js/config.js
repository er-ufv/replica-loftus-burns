/* =====================================================================
   CONFIGURACIÓN DEL EXPERIMENTO
   Réplica didáctica de Loftus y Burns (1982) — "Mental shock can produce
   retrograde amnesia". Memory & Cognition, 10(4), 318-323.

   Este es el ÚNICO archivo que normalmente hay que tocar:
     1. ENDPOINT  -> URL de la aplicación web de Google Apps Script.
     2. Duraciones, secuencias de imágenes y preguntas (si se cambian).
   Todo lo demás (index.html, resultados.html) lee de aquí.
   ===================================================================== */

window.CONFIG = {

  /* ------------------------------------------------------------------
     1) CONEXIÓN CON LA BASE DE DATOS (Google Sheets vía Apps Script)
     Pega aquí la URL que termina en /exec (ver README, paso 3).
     Si se deja vacía, el experimento funciona en "modo local":
     guarda las respuestas solo en este navegador (útil para probar).
     ------------------------------------------------------------------ */
  ENDPOINT: "https://script.google.com/macros/s/AKfycbzXzxTsR5_-t6hAIxzocVTmJLIkzQE0vJCC1oPIqJdZr4oGFVLueIDKIBfEVY2YcUD0mw/exec",

  /* Identificador de la aplicación de datos: cámbialo cada curso o grupo
     (p. ej. "2026-G1") para separar las respuestas en la hoja. */
  COHORTE: "MDTI-2026-G1",

  ASIGNATURA: "Métodos, Diseño y Técnicas de Investigación en Psicología",
  TEMA: "Tema 4 · Diseños experimentales con grupos distintos de participantes",

  /* ------------------------------------------------------------------
     2) PRESENTACIÓN DE LOS ESTÍMULOS
     Cada escena se muestra DURACION_MS milisegundos y avanza sola.
     No hay botones para volver atrás ni pausar.
     ------------------------------------------------------------------ */
  DURACION_MS: 4000,          // 4 s por escena. El detalle crítico (17) se ve durante los
                              // 4 s previos al incidente (Loftus y Burns: de 4 a 2 s antes)
  PANTALLA_NEGRA_MS: 350,     // breve fundido a negro entre escenas
  CUENTA_ATRAS_S: 3,          // cuenta atrás antes de empezar

  /* Parte COMÚN a los dos grupos (idéntica hasta el momento crítico).
     e01: discusión vista de frente; el número 17 de la camiseta (ítem crítico)
     SOLO es visible aquí, en los 4 s inmediatamente anteriores al incidente. */
  SECUENCIA_COMUN: [
    { img: "img/estimulos/e01.jpg" }
  ],

  /* Final de cada condición: MISMO número de escenas y MISMA duración (2 x 4 s).
     Estructura simétrica: en la 1.ª escena de ambos finales se ve a los dos
     hombres (el joven de espaldas); en la 2.ª solo al hombre de pelo rizado.
     experimental = amenaza con arma -> persona en el suelo (ficticio)
     control      = la discusión continúa -> el hombre se queda solo       */
  FINALES: {
    experimental: [
      { img: "img/estimulos/e03.jpg" },   // amenaza con arma (joven de espaldas)
      { img: "img/estimulos/e05.jpg" }    // hombre de pelo rizado en el suelo
    ],
    control: [
      { img: "img/estimulos/e02.jpg" },   // la discusión sigue (joven de espaldas)
      { img: "img/estimulos/e04.jpg" }    // hombre de pelo rizado solo, de pie
    ]
  },

  /* ------------------------------------------------------------------
     3) TAREA DISTRACTORA (como el "short unrelated activity" del Exp. 2)
     Tarea de colores (tipo Stroop): no usa números para no interferir
     con el recuerdo del número de la camiseta.
     ------------------------------------------------------------------ */
  DISTRACTORA_S: 60,

  /* ------------------------------------------------------------------
     4) CUESTIONARIO (idéntico para los dos grupos)
     tipo: "numero" | "opcion" | "sino"
     correcta: valor (o lista de valores) que se codifica como acierto
     valida: true -> entra en la puntuación de "aciertos de relleno"
             (solo ítems cuya información es igual de visible en ambas
             condiciones, igual que hicieron Loftus y Burns)
     critica: true -> ítem crítico (se analiza aparte)
     confianza: true -> se pide seguridad 1-5 (como en el original)
     El ORDEN aproxima el orden de aparición; los críticos van al final.
     ------------------------------------------------------------------ */
  PREGUNTAS: [
    { id: "p01", tipo: "numero", min: 0, max: 20,
      texto: "¿Cuántas personas aparecían en la primera escena?",
      correcta: 2, valida: true, confianza: true, fuente: "todas (máx. 2 personas)" },

    { id: "p02", tipo: "opcion",
      texto: "¿De qué color era la chaqueta del hombre de pelo rizado?",
      opciones: ["Beige", "Gris", "Negra", "Verde"],
      correcta: "Beige", valida: true, confianza: true, fuente: "común + ambos finales" },

    { id: "p03", tipo: "opcion",
      texto: "¿Qué prenda llevaba en la parte de arriba el hombre más joven?",
      opciones: ["Una camiseta sin mangas", "Una sudadera con capucha", "Una chaqueta vaquera", "Una camisa de manga larga"],
      correcta: "Una camiseta sin mangas", valida: true, confianza: true, fuente: "común + 1.ª escena de ambos finales" },

    { id: "p04", tipo: "opcion",
      texto: "¿De qué color eran los calcetines del hombre más joven?",
      opciones: ["Blancos", "Negros", "Grises", "No llevaba calcetines"],
      correcta: "Blancos", valida: true, confianza: true, fuente: "común + 1.ª escena de ambos finales" },

    { id: "p05", tipo: "opcion",
      texto: "¿Qué calzado llevaba el hombre de pelo rizado?",
      opciones: ["Zapatos marrones", "Zapatillas deportivas blancas", "Botas negras", "Sandalias"],
      correcta: "Zapatos marrones", valida: true, confianza: true, fuente: "común + ambos finales" },

    { id: "p06", tipo: "opcion",
      texto: "¿De qué color era el coche aparcado más alejado de la cámara (al fondo)?",
      opciones: ["Blanco", "Rojo", "Negro", "Azul"],
      correcta: "Blanco", valida: true, confianza: true, fuente: "fondo (todas)" },

    { id: "p07", tipo: "opcion",
      texto: "¿Qué tipo de establecimiento había en el lado derecho de la calle?",
      opciones: ["Una tienda de cerámica / decoración", "Una cafetería", "Una farmacia", "Una tienda de ropa"],
      correcta: "Una tienda de cerámica / decoración", valida: true, confianza: true, fuente: "fondo (todas)" },

    { id: "p08", tipo: "sino",
      texto: "¿Había un árbol en la acera?",
      correcta: "Sí", valida: true, confianza: true, fuente: "fondo (todas)" },

    { id: "p09", tipo: "sino",
      texto: "¿Se veía alguna planta en el escaparate?",
      correcta: "Sí", valida: true, confianza: true, fuente: "fondo (todas)" },

    { id: "p10", tipo: "sino",
      texto: "¿Aparecían otros peatones en la calle, además de los protagonistas?",
      correcta: "No", valida: true, confianza: true, fuente: "todas" },

    /* --- Ítems críticos (al final, como en el original) --- */
    { id: "c1_recuerdo", tipo: "numero", min: 0, max: 99,
      texto: "¿Qué número llevaba en la camiseta uno de los hombres?",
      ayuda: "Escribe solo el número. Si no lo recuerdas, escribe tu mejor estimación.",
      correcta: 17, critica: true, confianza: true, fuente: "solo escena común (0-4 s antes del incidente)" },

    { id: "c2_reconocimiento", tipo: "opcion",
      texto: "De estas opciones, ¿cuál era el número de la camiseta?",
      opciones: ["10", "13", "1", "17"],           // alternativas del Experimento 2
      correcta: "17", critica: true, confianza: true, fuente: "solo escena común" }
  ],

  /* Preguntas finales: control de la manipulación y exclusión */
  PREGUNTAS_FINALES: [
    { id: "interes",   tipo: "escala", texto: "¿Cuánto interés te han despertado las imágenes?",
      min: 1, max: 5, etiquetas: ["Ninguno", "Muchísimo"] },
    { id: "malestar",  tipo: "escala", texto: "¿Hasta qué punto te ha resultado inquietante o desagradable ver las imágenes?",
      min: 1, max: 5, etiquetas: ["Nada", "Muchísimo"] },
    { id: "condiciones", tipo: "sino", texto: "¿Has podido ver las imágenes con atención y sin interrupciones?" },
    { id: "conocia",   tipo: "sino", texto: "¿Conocías este experimento o alguien te ha contado de qué trata?" },
    { id: "edad",      tipo: "numero", min: 16, max: 99, texto: "Edad (en años)" }
  ],

  /* Clave para ver los resultados (debe coincidir con CLAVE_RESULTADOS en Code.gs) */
  PIDE_CLAVE_RESULTADOS: true
};
