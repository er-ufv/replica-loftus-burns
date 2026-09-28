/* =====================================================================
   PANEL DE RESULTADOS
   Lee las filas (Google Sheets, datos simulados o este navegador),
   aplica filtros de exclusión, calcula estadísticos y dibuja gráficos SVG.
   ===================================================================== */
(function () {
  "use strict";
  const C = window.CONFIG, E = window.EST;
  const $ = (s) => document.querySelector(s);
  const COL = { experimental: "#FF9606", control: "#0047E8" };
  const NOM = { experimental: "Experimental", control: "Control" };
  const GRUPOS = ["experimental", "control"];
  const VALIDAS = C.PREGUNTAS.filter((p) => p.valida);
  const NMAX = VALIDAS.length;
  let FILAS = [], timer = null;

  $("#asig").textContent = C.ASIGNATURA; $("#tema").textContent = C.TEMA; $("#pie-asig").textContent = C.ASIGNATURA;
  $("#cohorte").value = C.COHORTE;
  try { $("#clave").value = sessionStorage.getItem("clave_res") || ""; } catch (e) { }

  const fmt = (x, d = 2) => (x === null || x === undefined || isNaN(x)) ? "–" : Number(x).toFixed(d).replace(".", ",");
  const fmtP = (p) => p < 0.001 ? "< ,001" : fmt(p, 3).replace(/^0/, "");
  const num = (v) => (v === "" || v === null || v === undefined) ? NaN : Number(v);
  const estado = (t) => { $("#estado").textContent = t; };

  /* ------------------------- fuentes de datos ------------------------- */
  async function cargarServidor() {
    if (!C.ENDPOINT) { estado("No hay ENDPOINT en js/config.js: usa «Datos simulados» o «Datos de este navegador»."); return; }
    const clave = $("#clave").value.trim();
    try { sessionStorage.setItem("clave_res", clave); } catch (e) { }
    estado("Cargando…");
    try {
      const r = await fetch(`${C.ENDPOINT}?accion=datos&clave=${encodeURIComponent(clave)}&cohorte=${encodeURIComponent($("#cohorte").value.trim())}`);
      const j = await r.json();
      if (j.error) { estado("Error: " + j.error); return; }
      FILAS = j.filas; estado(`Datos del servidor · ${new Date().toLocaleTimeString()}`); pintar();
    } catch (e) { estado("No se pudo conectar con la hoja de datos."); }
  }
  function cargarLocal() {
    try { FILAS = JSON.parse(localStorage.getItem("loftus_datos_local") || "[]"); } catch (e) { FILAS = []; }
    estado(`${FILAS.length} respuestas guardadas en este navegador (modo prueba).`); pintar();
  }
  function simular() {
    // Datos ficticios para ensayar la sesión: el efecto va en la dirección del original
    const filas = [];
    const bern = (p) => (Math.random() < p ? 1 : 0);
    for (let i = 0; i < 64; i++) {
      const g = i % 2 ? "control" : "experimental", exp = g === "experimental";
      const hab = (Math.random() - 0.5) * 0.25;
      const f = { id: "SIM-" + i, cohorte: "simulado", condicion: g, conocia: bern(0.05) ? "Sí" : "No", condiciones: bern(0.05) ? "No" : "Sí", cambios_pestana: bern(0.05) };
      let ac = 0;
      VALIDAS.forEach((p) => { const ok = bern(Math.min(0.97, (exp ? 0.66 : 0.8) + hab)); f[p.id + "_ok"] = ok; f[p.id + "_conf"] = Math.max(1, Math.min(5, Math.round((ok ? 3.8 : 2.4) + (exp ? -0.3 : 0) + (Math.random() - 0.5) * 2))); ac += ok; });
      f.aciertos_relleno = ac;
      f.c1_recuerdo_ok = bern(exp ? 0.08 : 0.32); f.c1_recuerdo_conf = 1 + Math.floor(Math.random() * 3);
      f.c2_reconocimiento_ok = bern(exp ? 0.3 : 0.56); f.c2_reconocimiento_conf = 1 + Math.floor(Math.random() * 4);
      f.malestar = Math.max(1, Math.min(5, Math.round(exp ? 3.7 + (Math.random() - 0.5) * 2.4 : 1.5 + (Math.random() - 0.3) * 1.6)));
      f.interes = 2 + Math.floor(Math.random() * 4);
      filas.push(f);
    }
    FILAS = filas; estado("Datos SIMULADOS (no son reales)."); pintar();
  }

  /* ------------------------- filtros ------------------------- */
  function filtrar() {
    return FILAS.filter((f) => {
      if (!GRUPOS.includes(f.condicion)) return false;
      if ($("#f-conocia").checked && f.conocia === "Sí") return false;
      if ($("#f-condiciones").checked && f.condiciones === "No") return false;
      if ($("#f-pestana").checked && num(f.cambios_pestana) > 0) return false;
      return true;
    });
  }

  /* ------------------------- tooltip ------------------------- */
  const tip = $("#tip");
  function conTip(el, html) {
    el.addEventListener("mousemove", (e) => { tip.innerHTML = html; tip.style.display = "block"; tip.style.left = (e.clientX + 14) + "px"; tip.style.top = (e.clientY + 14) + "px"; });
    el.addEventListener("mouseleave", () => { tip.style.display = "none"; });
  }
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, padre) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (padre) padre.appendChild(e); return e; }
  function texto(padre, x, y, t, extra = {}) { const e = el("text", Object.assign({ x, y }, extra), padre); e.textContent = t; return e; }
  /* barra con extremo redondeado de 4 px anclado a la base */
  function barra(svg, x, y, w, h, color) {
    if (h <= 0) return el("rect", { x, y: y - 1, width: w, height: 1, fill: color, opacity: .5 }, svg);
    const r = Math.min(4, w / 2, h);
    return el("path", { d: `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`, fill: color }, svg);
  }
  function ejeY(svg, x0, x1, yEsc, max, paso, sufijo = "") {
    for (let v = 0; v <= max + 1e-9; v += paso) {
      const y = yEsc(v);
      el("line", { x1: x0, x2: x1, y1: y, y2: y, stroke: "#E3E8F4", "stroke-width": 1 }, svg);
      texto(svg, x0 - 6, y + 4, Math.round(v) + sufijo, { "text-anchor": "end" });
    }
  }

  /* ------------------------- gráfico 1: histograma ------------------------- */
  function histograma(d) {
    const W = 560, H = 300, m = { l: 40, r: 10, t: 16, b: 44 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Histograma de aciertos por grupo" });
    const cuentas = {}; GRUPOS.forEach((g) => { cuentas[g] = Array(NMAX + 1).fill(0); d[g].forEach((v) => cuentas[g][v]++); });
    const pct = {}; GRUPOS.forEach((g) => pct[g] = cuentas[g].map((c) => d[g].length ? 100 * c / d[g].length : 0));
    const maxP = Math.max(10, ...GRUPOS.flatMap((g) => pct[g]));
    const top = Math.ceil(maxP / 10) * 10;
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / top);
    ejeY(svg, m.l, W - m.r, y, top, top > 50 ? 20 : 10, "%");
    const banda = (W - m.l - m.r) / (NMAX + 1), bw = (banda - 8) / 2;
    for (let k = 0; k <= NMAX; k++) {
      const x0 = m.l + k * banda + 4;
      GRUPOS.forEach((g, gi) => {
        const x = x0 + gi * (bw + 2), v = pct[g][k];
        const b = barra(svg, x, y(v), bw, y(0) - y(v), COL[g]);
        const hit = el("rect", { x: x0, y: m.t, width: banda - 4, height: y(0) - m.t, fill: "transparent" }, svg);
        conTip(hit, `<b>${k} aciertos</b><br>Experimental: ${cuentas.experimental[k]} (${fmt(pct.experimental[k], 0)} %)<br>Control: ${cuentas.control[k]} (${fmt(pct.control[k], 0)} %)`);
      });
      texto(svg, x0 + banda / 2 - 4, H - m.b + 16, k, { "text-anchor": "middle" });
    }
    texto(svg, (W) / 2, H - 8, `Número de aciertos (0-${NMAX})`, { "text-anchor": "middle" });
    return svg;
  }

  /* ------------------------- gráfico 2: caja + puntos ------------------------- */
  function cajas(d) {
    const W = 560, H = 300, m = { l: 40, r: 20, t: 16, b: 34 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Diagrama de caja de aciertos por grupo" });
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / NMAX);
    ejeY(svg, m.l, W - m.r, y, NMAX, NMAX > 10 ? 4 : 2);
    GRUPOS.forEach((g, gi) => {
      const xs = d[g]; const cx = m.l + (W - m.l - m.r) * (gi === 0 ? 0.28 : 0.72);
      texto(svg, cx, H - 10, `${NOM[g]} (n = ${xs.length})`, { "text-anchor": "middle", "font-weight": 600 });
      if (!xs.length) return;
      const q1 = E.cuantil(xs, .25), q3 = E.cuantil(xs, .75), md = E.mediana(xs), mu = E.media(xs);
      const lo = Math.min(...xs), hi = Math.max(...xs), bw = 90;
      el("line", { x1: cx, x2: cx, y1: y(lo), y2: y(hi), stroke: "#8C97AE", "stroke-width": 2 }, svg);
      el("rect", { x: cx - bw / 2, y: y(q3), width: bw, height: Math.max(1, y(q1) - y(q3)), fill: COL[g], "fill-opacity": .14, stroke: COL[g], "stroke-width": 2, rx: 4 }, svg);
      el("line", { x1: cx - bw / 2, x2: cx + bw / 2, y1: y(md), y2: y(md), stroke: "#001447", "stroke-width": 3 }, svg);
      xs.forEach((v, i) => {
        const jx = cx + 60 + ((i * 37) % 50) - 25 + 30, jy = y(v) + (((i * 13) % 9) - 4);
        el("circle", { cx: jx, cy: jy, r: 4, fill: COL[g], "fill-opacity": .75, stroke: "#fff", "stroke-width": 1.5 }, svg);
      });
      const r = el("path", { d: `M${cx},${y(mu) - 7}L${cx + 7},${y(mu)}L${cx},${y(mu) + 7}L${cx - 7},${y(mu)}Z`, fill: "#fff", stroke: "#001447", "stroke-width": 2 }, svg);
      const hit = el("rect", { x: cx - bw / 2 - 10, y: m.t, width: bw + 140, height: H - m.t - m.b, fill: "transparent" }, svg);
      conTip(hit, `<b>${NOM[g]}</b><br>Media ${fmt(mu)} · Mediana ${fmt(md, 1)}<br>Q1 ${fmt(q1, 1)} · Q3 ${fmt(q3, 1)}<br>Mín ${lo} · Máx ${hi}`);
    });
    return svg;
  }

  /* ------------------------- gráfico 3: % aciertos críticos ------------------------- */
  function barrasPct(series, azar) {
    const W = 560, H = 260, m = { l: 44, r: 10, t: 22, b: 40 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Porcentaje de aciertos en los ítems críticos" });
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / 100);
    ejeY(svg, m.l, W - m.r, y, 100, 25, "%");
    const banda = (W - m.l - m.r) / series.length, bw = Math.min(90, (banda - 40) / 2);
    series.forEach((s, i) => {
      const cx = m.l + banda * (i + .5);
      GRUPOS.forEach((g, gi) => {
        const x = cx - bw - 1 + gi * (bw + 2), v = s[g].pct;
        barra(svg, x, y(v), bw, y(0) - y(v), COL[g]);
        texto(svg, x + bw / 2, y(v) - 6, isNaN(v) ? "–" : fmt(v, 0) + " %", { "text-anchor": "middle", "font-weight": 700, fill: "#001447" });
        const hit = el("rect", { x, y: m.t, width: bw, height: y(0) - m.t, fill: "transparent" }, svg);
        conTip(hit, `<b>${s.nombre} · ${NOM[g]}</b><br>${s[g].k} de ${s[g].n} aciertan (${fmt(v, 1)} %)`);
      });
      texto(svg, cx, H - m.b + 18, s.nombre, { "text-anchor": "middle", "font-weight": 600 });
      if (s.azar) {
        const yy = y(s.azar);
        el("line", { x1: cx - bw - 10, x2: cx + bw + 10, y1: yy, y2: yy, stroke: "#001447", "stroke-width": 1.5, "stroke-dasharray": "5 4" }, svg);
        texto(svg, cx + bw + 12, yy + 4, "azar", {});
      }
    });
    return svg;
  }

  /* ------------------------- gráfico 4: malestar (1-5) ------------------------- */
  function escala(d) {
    const W = 560, H = 240, m = { l: 40, r: 10, t: 16, b: 40 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Distribución del malestar por grupo" });
    const pct = {}; GRUPOS.forEach((g) => { pct[g] = [1, 2, 3, 4, 5].map((k) => d[g].length ? 100 * d[g].filter((v) => v === k).length / d[g].length : 0); });
    const top = Math.max(20, Math.ceil(Math.max(...GRUPOS.flatMap((g) => pct[g])) / 20) * 20);
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / top);
    ejeY(svg, m.l, W - m.r, y, top, 20, "%");
    const banda = (W - m.l - m.r) / 5, bw = (banda - 20) / 2;
    for (let k = 0; k < 5; k++) {
      const x0 = m.l + k * banda + 10;
      GRUPOS.forEach((g, gi) => barra(svg, x0 + gi * (bw + 2), y(pct[g][k]), bw, y(0) - y(pct[g][k]), COL[g]));
      const hit = el("rect", { x: x0, y: m.t, width: banda - 20, height: y(0) - m.t, fill: "transparent" }, svg);
      conTip(hit, `<b>Malestar = ${k + 1}</b><br>Experimental: ${fmt(pct.experimental[k], 0)} %<br>Control: ${fmt(pct.control[k], 0)} %`);
      texto(svg, x0 + banda / 2 - 10, H - m.b + 16, k + 1, { "text-anchor": "middle" });
    }
    texto(svg, W / 2, H - 6, "1 = nada inquietante · 5 = muchísimo", { "text-anchor": "middle" });
    return svg;
  }

  /* ------------------------- tablas e interpretación ------------------------- */
  function sig(p) { return p < .05 ? '<span class="sig">significativa</span>' : '<span class="nosig">no significativa</span>'; }

  function pintar() {
    const F = filtrar();
    const d = {}, crit = {}, mal = {};
    GRUPOS.forEach((g) => {
      const fg = F.filter((f) => f.condicion === g);
      // si la hoja no trae aciertos_relleno, se recalcula desde los _ok
      d[g] = fg.map((f) => isNaN(num(f.aciertos_relleno)) ? VALIDAS.reduce((s, p) => s + (num(f[p.id + "_ok"]) || 0), 0) : num(f.aciertos_relleno));
      crit[g] = fg; mal[g] = fg.map((f) => num(f.malestar)).filter((v) => !isNaN(v));
    });
    $("#t-n").textContent = F.length; $("#t-ne").textContent = d.experimental.length; $("#t-nc").textContent = d.control.length;
    $("#t-exc").textContent = FILAS.filter((f) => GRUPOS.includes(f.condicion)).length - F.length;
    $("#sub-hist").textContent = `Ítems de relleno válidos (${NMAX}): información igual de visible en ambos grupos · % de cada grupo`;

    $("#g-hist").replaceChildren(histograma(d));
    $("#g-caja").replaceChildren(cajas(d));

    /* Descriptivos */
    const fila = (g) => { const x = d[g]; return `<tr><td><b style="color:${COL[g]}">■</b> ${NOM[g]}</td><td>${x.length}</td><td>${x.length ? fmt(E.media(x)) : "–"}</td><td>${x.length > 1 ? fmt(E.de(x)) : "–"}</td><td>${x.length ? fmt(E.mediana(x), 1) : "–"}</td><td>${x.length ? fmt(100 * E.media(x) / NMAX, 1) + " %" : "–"}</td></tr>`; };
    $("#tab-desc").innerHTML = `<tr><th>Grupo</th><th>n</th><th>Media</th><th>DE</th><th>Mediana</th><th>% aciertos</th></tr>${fila("experimental")}${fila("control")}`;

    const w = E.welch(d.experimental, d.control), u = E.mannWhitney(d.experimental, d.control);
    $("#tab-pruebas").innerHTML = `<tr><th>Prueba</th><th>Estadístico</th><th>gl</th><th>p (bilateral)</th><th>Tamaño del efecto</th></tr>
      <tr><td>t de Welch (paramétrica)</td><td>t = ${w ? fmt(w.t) : "–"}</td><td>${w ? fmt(w.gl, 1) : "–"}</td><td>${w ? fmtP(w.p) : "–"}</td><td>d de Cohen = ${w ? fmt(w.d) : "–"}</td></tr>
      <tr><td>U de Mann-Whitney (no paramétrica)</td><td>U = ${u ? fmt(u.U, 1) : "–"} · z = ${u ? fmt(u.z) : "–"}</td><td>–</td><td>${u ? fmtP(u.p) : "–"}</td><td>r = ${u ? fmt(u.r) : "–"}</td></tr>`;
    $("#interp").innerHTML = !w ? "Se necesitan al menos 2 participantes por grupo para contrastar las medias." :
      `El grupo <b>experimental</b> obtuvo una media de <b>${fmt(w.m1)}</b> aciertos y el <b>control</b> de <b>${fmt(w.m2)}</b>
       (diferencia = ${fmt(w.m1 - w.m2)}). La diferencia es ${sig(w.p)} con la t de Welch (p ${w.p < .001 ? "< ,001" : "= " + fmtP(w.p)})
       y ${sig(u.p)} con U de Mann-Whitney (p ${u.p < .001 ? "< ,001" : "= " + fmtP(u.p)}).
       ${w.m1 < w.m2 ? "La dirección coincide con la hipótesis: tras el choque emocional se recuerda peor lo inmediatamente anterior." : "La dirección no coincide con la hipótesis del estudio original."}
       <br><span class="nota">Con muestras pequeñas o distribuciones asimétricas/con efecto techo, conviene fijarse en la prueba no paramétrica.</span>`;

    /* Ítem crítico */
    const tabla = (id) => { const o = {}; GRUPOS.forEach((g) => { const v = crit[g].map((f) => num(f[id + "_ok"])).filter((x) => !isNaN(x)); const k = v.filter((x) => x === 1).length; o[g] = { k, n: v.length, pct: v.length ? 100 * k / v.length : NaN }; }); return o; };
    const rec = tabla("c1_recuerdo"), rcn = tabla("c2_reconocimiento");
    $("#g-critico").replaceChildren(barrasPct([Object.assign({ nombre: "Recuerdo libre" }, rec), Object.assign({ nombre: "Reconocimiento (4 opciones)", azar: 25 }, rcn)]));
    const lineaC = (nom, t) => {
      const a = t.experimental.k, b = t.experimental.n - a, c = t.control.k, dd = t.control.n - c;
      const x = E.chi2Yates(a, b, c, dd), pf = (t.experimental.n && t.control.n) ? E.fisher(a, b, c, dd) : NaN;
      return `<tr><td>${nom}</td><td>${x ? "χ²(1) = " + fmt(x.x2) : "–"}</td><td>${x ? fmtP(x.p) : "–"}</td><td>${isNaN(pf) ? "–" : fmtP(pf)}</td></tr>`;
    };
    $("#tab-critico").innerHTML = `<tr><th>Ítem</th><th>χ² (Yates)</th><th>p</th><th>p exacta de Fisher</th></tr>${lineaC("Recuerdo", rec)}${lineaC("Reconocimiento", rcn)}`;

    /* Manipulación */
    $("#g-malestar").replaceChildren(escala(mal));
    const wm = E.welch(mal.experimental, mal.control);
    $("#interp-malestar").innerHTML = wm ? `Malestar medio: experimental <b>${fmt(wm.m1)}</b> vs. control <b>${fmt(wm.m2)}</b>
      (t = ${fmt(wm.t)}, p ${wm.p < .001 ? "< ,001" : "= " + fmtP(wm.p)}). ${wm.m1 > wm.m2 && wm.p < .05 ? "La manipulación funcionó." : "Revisar: la manipulación no ha producido una diferencia clara."}` : "Sin datos suficientes.";

    /* Por ítem */
    const todos = C.PREGUNTAS;
    $("#tab-items").innerHTML = `<tr><th>Ítem</th><th>Tipo</th><th>% Exp.</th><th>% Control</th><th>Seguridad Exp.</th><th>Seguridad Control</th></tr>` +
      todos.map((p, i) => {
        const c = GRUPOS.map((g) => { const v = crit[g].map((f) => num(f[p.id + "_ok"])).filter((x) => !isNaN(x)); return v.length ? 100 * v.filter((x) => x === 1).length / v.length : NaN; });
        const s = GRUPOS.map((g) => { const v = crit[g].map((f) => num(f[p.id + "_conf"])).filter((x) => !isNaN(x)); return v.length ? E.media(v) : NaN; });
        return `<tr><td>${i + 1}. ${p.texto}</td><td>${p.critica ? "<b>crítico</b>" : p.valida ? "relleno" : "no válido"}</td><td>${fmt(c[0], 0)}</td><td>${fmt(c[1], 0)}</td><td>${fmt(s[0], 1)}</td><td>${fmt(s[1], 1)}</td></tr>`;
      }).join("");

    /* Datos individuales */
    const cols = FILAS.length ? Object.keys(FILAS[0]) : [];
    $("#crudos").innerHTML = FILAS.length ? `<table class="tabla"><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>${FILAS.map((f) => `<tr>${cols.map((c) => `<td>${f[c] ?? ""}</td>`).join("")}</tr>`).join("")}</table>` : "<p class='nota'>Sin datos.</p>";
  }

  function csv() {
    if (!FILAS.length) return;
    const cols = [...new Set(FILAS.flatMap((f) => Object.keys(f)))];
    const q = (v) => { const s = v === undefined || v === null ? "" : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const txt = "﻿" + [cols.join(";")].concat(FILAS.map((f) => cols.map((c) => q(f[c])).join(";"))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" }));
    a.download = `loftus_burns_${$("#cohorte").value || "datos"}.csv`; a.click();
  }

  $("#btn-cargar").addEventListener("click", cargarServidor);
  $("#btn-demo").addEventListener("click", simular);
  $("#btn-local").addEventListener("click", cargarLocal);
  $("#btn-csv").addEventListener("click", csv);
  ["#f-conocia", "#f-condiciones", "#f-pestana"].forEach((s) => $(s).addEventListener("change", pintar));
  $("#auto").addEventListener("change", (e) => { clearInterval(timer); if (e.target.checked) { cargarServidor(); timer = setInterval(cargarServidor, 15000); } });
  pintar();
})();
