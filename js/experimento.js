/* =====================================================================
   LÓGICA DEL EXPERIMENTO (participante)
   Flujo: consentimiento -> asignación aleatoria -> instrucciones ->
          secuencia de imágenes (común + final según condición) ->
          tarea distractora -> cuestionario -> preguntas finales -> envío
   ===================================================================== */
(function () {
  "use strict";
  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const CLAVE_ESTADO = "loftus_estado_" + C.COHORTE;
  const CLAVE_LOCAL = "loftus_datos_local";

  /* ---------- almacenamiento seguro (puede fallar en modo privado) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  /* ---------- datos del participante ---------- */
  const D = {
    id: "P-" + Date.now().toString(36).toUpperCase().slice(-5) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
    cohorte: C.COHORTE,
    condicion: null,
    asignacion: null,          // "servidor" (equilibrada) o "aleatoria"
    fecha_inicio: new Date().toISOString(),
    cambios_pestana: 0,
    salidas_pantalla_completa: 0,
    pantalla: window.innerWidth + "x" + window.innerHeight,
    movil: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 1 : 0,
    tiempos_escenas: []
  };

  /* ---------- textos de cabecera ---------- */
  $("#asig").textContent = C.ASIGNATURA;
  $("#tema").textContent = C.TEMA;
  $("#pie-asig").textContent = C.ASIGNATURA;

  /* ---------- navegación entre pantallas ---------- */
  function mostrar(id) {
    document.querySelectorAll("main > section").forEach((s) => s.classList.add("oculto"));
    $(id).classList.remove("oculto");
    window.scrollTo(0, 0);
  }

  /* Impedir el botón "atrás" del navegador durante toda la actividad */
  function bloquearAtras() {
    history.pushState({ paso: 1 }, "", location.href);
    window.addEventListener("popstate", () => history.pushState({ paso: 1 }, "", location.href));
  }

  /* Evitar repetir desde el mismo navegador (el profesor puede usar ?reset=1 para probar) */
  const params = new URLSearchParams(location.search);
  if (params.get("reset") === "1") store.del(CLAVE_ESTADO);
  if (store.get(CLAVE_ESTADO)) { mostrar("#p-repetido"); return; }

  /* ================== 1. CONSENTIMIENTO ================== */
  $("#chk-edad").addEventListener("change", (e) => { $("#btn-acepto").disabled = !e.target.checked; });

  $("#btn-rechazo").addEventListener("click", () => mostrar("#p-rechazo"));   // no se guarda nada

  $("#btn-acepto").addEventListener("click", async () => {
    $("#btn-acepto").disabled = true;
    D.consentimiento = "sí";
    store.set(CLAVE_ESTADO, "iniciado");
    bloquearAtras();
    await asignarCondicion();
    mostrar("#p-instrucciones");
    precargar();
  });

  /* ================== 2. ASIGNACIÓN ALEATORIA ================== */
  async function asignarCondicion() {
    // Con base de datos: el servidor asigna al grupo con menos participantes
    // (aleatorización equilibrada). Sin conexión: moneda al aire (50/50).
    if (C.ENDPOINT) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch(C.ENDPOINT + "?accion=asignar&cohorte=" + encodeURIComponent(C.COHORTE), { signal: ctrl.signal });
        clearTimeout(t);
        const j = await r.json();
        if (j.condicion === "experimental" || j.condicion === "control") {
          D.condicion = j.condicion; D.asignacion = "servidor"; return;
        }
      } catch (e) { /* si falla, aleatoria simple */ }
    }
    D.condicion = Math.random() < 0.5 ? "experimental" : "control";
    D.asignacion = "aleatoria";
  }

  function secuencia() { return C.SECUENCIA_COMUN.concat(C.FINALES[D.condicion]); }

  /* Precarga de TODAS las imágenes (ambas condiciones: así el tiempo de carga no delata la condición) */
  const cache = {};
  function precargar() {
    const urls = [...new Set(C.SECUENCIA_COMUN.concat(C.FINALES.experimental, C.FINALES.control).map((e) => e.img))];
    let listas = 0;
    urls.forEach((u) => {
      const im = new Image();
      im.onload = im.onerror = () => {
        listas++;
        $("#precarga").textContent = listas < urls.length ? `Cargando imágenes… ${listas}/${urls.length}` : "Imágenes preparadas.";
        if (listas === urls.length) $("#btn-empezar").disabled = false;
      };
      im.src = u; cache[u] = im;
    });
  }

  /* ================== 3. PRESENTACIÓN DE ESTÍMULOS ================== */
  const visor = $("#visor");
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  let enVisor = false;

  // Durante la secuencia se bloquean teclas y clic derecho; se registran cambios de pestaña
  document.addEventListener("keydown", (e) => { if (enVisor) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("contextmenu", (e) => { if (enVisor) e.preventDefault(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && D.condicion) D.cambios_pestana++; });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && enVisor) D.salidas_pantalla_completa++; });
  window.addEventListener("beforeunload", (e) => { if (D.condicion && !D.enviado) { e.preventDefault(); e.returnValue = ""; } });

  $("#btn-empezar").addEventListener("click", async () => {
    $("#btn-empezar").disabled = true;
    enVisor = true;
    visor.style.display = "flex";
    try { if (visor.requestFullscreen) await visor.requestFullscreen(); } catch (e) { /* p. ej. iOS */ }

    for (let i = C.CUENTA_ATRAS_S; i > 0; i--) { visor.innerHTML = `<div class="cuenta">${i}</div>`; await esperar(1000); }
    visor.innerHTML = '<div class="punto">+</div>'; await esperar(600);

    const sec = secuencia();
    for (let i = 0; i < sec.length; i++) {
      visor.innerHTML = "";
      const img = cache[sec[i].img].cloneNode();
      img.alt = ""; img.draggable = false;
      visor.appendChild(img);
      const t0 = performance.now();
      await esperar(C.DURACION_MS);
      D.tiempos_escenas.push(Math.round(performance.now() - t0));
      visor.innerHTML = "";
      if (i < sec.length - 1) await esperar(C.PANTALLA_NEGRA_MS);
    }
    D.secuencia_vista = sec.map((e) => e.img.split("/").pop()).join(" > ");

    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { }
    enVisor = false;
    visor.style.display = "none";
    iniciarDistractora();
  });

  /* ================== 4. TAREA DISTRACTORA (Stroop de colores) ================== */
  const COLORES = [
    { nombre: "ROJO", hex: "#D32F2F" }, { nombre: "AZUL", hex: "#1565C0" },
    { nombre: "VERDE", hex: "#2E7D32" }, { nombre: "AMARILLO", hex: "#E6A800" }
  ];
  function iniciarDistractora() {
    mostrar("#p-distractora");
    const cont = $("#stroop-botones"); cont.innerHTML = "";
    let actual = null, tEst = 0, aciertos = 0, errores = 0, trs = [];
    COLORES.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = c.nombre.charAt(0) + c.nombre.slice(1).toLowerCase();
      b.className = "secundario";
      b.addEventListener("click", () => {
        if (!actual) return;
        if (c.hex === actual.tinta) { aciertos++; trs.push(performance.now() - tEst); } else errores++;
        nuevo();
      });
      cont.appendChild(b);
    });
    function nuevo() {
      const palabra = COLORES[Math.floor(Math.random() * 4)];
      let tinta = COLORES[Math.floor(Math.random() * 4)];
      actual = { tinta: tinta.hex };
      const el = $("#stroop-palabra");
      el.textContent = palabra.nombre; el.style.color = tinta.hex;
      tEst = performance.now();
    }
    nuevo();
    const inicio = Date.now(), total = C.DISTRACTORA_S * 1000;
    const iv = setInterval(() => {
      const f = Math.min(1, (Date.now() - inicio) / total);
      $("#stroop-barra").style.width = (f * 100) + "%";
      if (f >= 1) {
        clearInterval(iv); actual = null;
        D.stroop_aciertos = aciertos; D.stroop_errores = errores;
        D.stroop_tr_medio_ms = trs.length ? Math.round(trs.reduce((a, b) => a + b, 0) / trs.length) : "";
        construirCuestionario();
        mostrar("#p-cuestionario");
      }
    }, 200);
  }

  /* ================== 5. CUESTIONARIO (respuestas cerradas) ================== */
  function htmlOpciones(nombre, valores, fila) {
    return `<div class="opciones ${fila ? "fila" : ""}">` + valores.map((v) =>
      `<label class="opcion"><input type="radio" name="${nombre}" value="${String(v).replace(/"/g, "&quot;")}"><span>${v}</span></label>`
    ).join("") + "</div>";
  }
  function htmlPregunta(p, n) {
    let campo = "";
    if (p.tipo === "numero") {
      // Solo dígitos: teclado numérico en móvil, se filtran letras y signos
      campo = `<input type="number" name="${p.id}" inputmode="numeric" pattern="[0-9]*" min="${p.min}" max="${p.max}" step="1" autocomplete="off">`
        + (p.ayuda ? `<p class="nota" style="margin-top:6px">${p.ayuda}</p>` : "");
    } else if (p.tipo === "opcion") campo = htmlOpciones(p.id, p.opciones, false);
    else if (p.tipo === "sino") campo = htmlOpciones(p.id, ["Sí", "No"], true);
    else if (p.tipo === "escala") {
      const vals = []; for (let i = p.min; i <= p.max; i++) vals.push(i);
      campo = htmlOpciones(p.id, vals, true) + `<div class="escala-etq"><span>${p.min} = ${p.etiquetas[0]}</span><span>${p.max} = ${p.etiquetas[1]}</span></div>`;
    }
    const conf = p.confianza ? `<div class="confianza">Seguridad en tu respuesta:${htmlOpciones(p.id + "_conf", [1, 2, 3, 4, 5], true)}
      <div class="escala-etq"><span>1 = estoy adivinando</span><span>5 = muy seguro/a</span></div></div>` : "";
    const aviso = p.tipo === "numero" ? `Escribe un número entero entre ${p.min} y ${p.max}.` : "Esta pregunta es obligatoria.";
    return `<div class="pregunta" data-id="${p.id}"><div class="enunciado"><span class="num">${n}.</span> ${p.texto}</div>${campo}${conf}<div class="aviso">${aviso}</div></div>`;
  }
  function filtrarNumeros(form) {
    form.querySelectorAll('input[type=number]').forEach((inp) => {
      inp.addEventListener("keydown", (e) => {
        const ok = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"];
        if (!ok.includes(e.key) && !/^[0-9]$/.test(e.key)) e.preventDefault();
      });
      inp.addEventListener("input", () => { inp.value = inp.value.replace(/[^0-9]/g, "").slice(0, 3); });
      inp.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    });
  }
  function construirCuestionario() {
    const f = $("#form-preguntas");
    f.innerHTML = C.PREGUNTAS.map((p, i) => htmlPregunta(p, i + 1)).join("");
    filtrarNumeros(f);
    const g = $("#form-finales");
    g.innerHTML = C.PREGUNTAS_FINALES.map((p, i) => htmlPregunta(p, i + 1)).join("");
    filtrarNumeros(g);
  }

  function leer(form, lista) {
    const res = {}; let completo = true, primero = null;
    lista.forEach((p) => {
      const bloque = form.querySelector(`[data-id="${p.id}"]`);
      let v = null, ok = true;
      if (p.tipo === "numero") {
        const s = form.querySelector(`[name="${p.id}"]`).value;
        const n = parseInt(s, 10);
        if (s === "" || isNaN(n) || n < p.min || n > p.max) ok = false; else v = n;
      } else {
        const r = form.querySelector(`[name="${p.id}"]:checked`);
        if (!r) ok = false; else v = p.tipo === "escala" ? Number(r.value) : r.value;
      }
      if (p.confianza) {
        const c = form.querySelector(`[name="${p.id}_conf"]:checked`);
        if (!c) ok = false; else res[p.id + "_conf"] = Number(c.value);
      }
      bloque.classList.toggle("falta", !ok);
      if (!ok) { completo = false; if (!primero) primero = bloque; }
      res[p.id] = v;
    });
    if (primero) primero.scrollIntoView({ behavior: "smooth", block: "center" });
    return completo ? res : null;
  }

  $("#btn-continuar-final").addEventListener("click", () => {
    const r = leer($("#form-preguntas"), C.PREGUNTAS);
    if (!r) return;
    D.respuestas = r;
    mostrar("#p-finales");            // no hay botón para volver al cuestionario
  });

  /* ================== 6. CODIFICACIÓN Y ENVÍO ================== */
  function esCorrecta(p, v) {
    const lista = Array.isArray(p.correcta) ? p.correcta : [p.correcta];
    return lista.map(String).includes(String(v)) ? 1 : 0;
  }
  function codificar() {
    const fila = {
      id: D.id, cohorte: D.cohorte, condicion: D.condicion, asignacion: D.asignacion,
      fecha_inicio: D.fecha_inicio, fecha_fin: new Date().toISOString(),
      duracion_s: Math.round((Date.now() - new Date(D.fecha_inicio).getTime()) / 1000),
      movil: D.movil, pantalla: D.pantalla,
      cambios_pestana: D.cambios_pestana, salidas_pantalla_completa: D.salidas_pantalla_completa,
      secuencia_vista: D.secuencia_vista, tiempos_escenas_ms: D.tiempos_escenas.join("|"),
      stroop_aciertos: D.stroop_aciertos, stroop_errores: D.stroop_errores, stroop_tr_medio_ms: D.stroop_tr_medio_ms
    };
    let acR = 0, nR = 0, confR = 0;
    C.PREGUNTAS.forEach((p) => {
      const v = D.respuestas[p.id];
      fila[p.id] = v;
      fila[p.id + "_ok"] = esCorrecta(p, v);
      if (p.confianza) fila[p.id + "_conf"] = D.respuestas[p.id + "_conf"];
      if (p.valida) { nR++; acR += fila[p.id + "_ok"]; confR += D.respuestas[p.id + "_conf"] || 0; }
    });
    fila.aciertos_relleno = acR;
    fila.n_items_relleno = nR;
    fila.confianza_media_relleno = nR ? Math.round((confR / nR) * 100) / 100 : "";
    Object.assign(fila, D.finales);
    return fila;
  }

  $("#btn-enviar").addEventListener("click", async () => {
    const r = leer($("#form-finales"), C.PREGUNTAS_FINALES);
    if (!r) return;
    D.finales = r;
    $("#btn-enviar").disabled = true;
    const fila = codificar();
    D.enviado = true;
    store.set(CLAVE_ESTADO, "completado");

    // copia local (modo de prueba sin servidor y respaldo)
    try {
      const prev = JSON.parse(store.get(CLAVE_LOCAL) || "[]"); prev.push(fila);
      store.set(CLAVE_LOCAL, JSON.stringify(prev));
    } catch (e) { }

    mostrar("#p-fin");
    $("#codigo").textContent = D.id;
    if (!C.ENDPOINT) { $("#estado-envio").textContent = "Modo de prueba: respuestas guardadas solo en este navegador."; return; }
    try {
      // text/plain evita la petición previa CORS; Apps Script la recibe en doPost
      await fetch(C.ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ accion: "guardar", fila }) });
      $("#estado-envio").textContent = "Respuestas enviadas correctamente.";
    } catch (e) {
      $("#estado-envio").textContent = "No se ha podido enviar (sin conexión). Avisa al profesor e indícale tu código.";
    }
  });
})();
