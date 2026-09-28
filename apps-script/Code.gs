/* =====================================================================
   BASE DE DATOS DEL EXPERIMENTO — Google Apps Script + Google Sheets
   Réplica didáctica de Loftus y Burns (1982)

   Cómo instalar (resumen; detalle en README.md, paso 3):
     1. Abre la hoja "Loftus_Burns_datos" (o sube Loftus_Burns_datos.xlsx a Drive y
        ábrela con Hojas de cálculo de Google: Archivo > Guardar como Hojas de cálculo).
     2. Extensiones > Apps Script. Borra el contenido y pega este archivo.
     3. Cambia CLAVE_RESULTADOS por una palabra que solo sepas tú.
     4. Ejecuta una vez la función "preparar" (autoriza los permisos).
     5. Implementar > Nueva implementación > Aplicación web
          - Ejecutar como: Yo
          - Quién tiene acceso: Cualquier usuario
        Copia la URL que termina en /exec y pégala en js/config.js (ENDPOINT).

   Pestañas de la hoja (plantilla "Loftus_Burns_datos"):
     Resumen      -> estadísticos en vivo con fórmulas (no los escribe este script)
     Respuestas   -> una fila por participante, ya codificada (0/1)  <- escribe doPost
     Clave        -> respuestas correctas (informativa)
     Asignaciones -> registro de la aleatorización equilibrada        <- escribe asignar_
     Leeme        -> descripción de las columnas
   ===================================================================== */

const CLAVE_RESULTADOS = "cambia-esta-clave";   // <-- ¡CÁMBIALA!
const HOJA_RESP = "Respuestas";
const HOJA_ASIG = "Asignaciones";

/* ---------- GET: asignar condición o leer datos ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.accion === "asignar") return json_(asignar_(p.cohorte || ""));
  if (p.accion === "datos") {
    if (p.clave !== CLAVE_RESULTADOS) return json_({ error: "clave incorrecta" });
    return json_({ filas: leerFilas_(p.cohorte || "") });
  }
  return json_({ ok: true, info: "Servicio del experimento activo" });
}

/* ---------- POST: guardar una fila de respuestas ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cuerpo = JSON.parse(e.postData.contents);
    if (cuerpo.accion !== "guardar" || !cuerpo.fila) return json_({ error: "petición no válida" });
    const fila = cuerpo.fila;
    fila.recibido = new Date().toISOString();
    const hoja = hoja_(HOJA_RESP);
    // Cabeceras dinámicas: si aparece una columna nueva, se añade al final
    let cab = hoja.getLastColumn() > 0 ? hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0] : [];
    const nuevas = Object.keys(fila).filter(k => cab.indexOf(k) === -1);
    if (nuevas.length) {
      hoja.getRange(1, cab.length + 1, 1, nuevas.length).setValues([nuevas]).setFontWeight("bold");
      cab = cab.concat(nuevas);
    }
    hoja.appendRow(cab.map(k => (fila[k] === undefined || fila[k] === null) ? "" : fila[k]));
    return json_({ ok: true });
  } catch (err) {
    return json_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* Aleatorización equilibrada: asigna a la condición con menos asignaciones
   en la cohorte; en caso de empate, al azar. */
function asignar_(cohorte) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const h = hoja_(HOJA_ASIG);
    if (h.getLastRow() === 0) h.appendRow(["fecha", "cohorte", "condicion"]);
    const datos = h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, 3).getValues() : [];
    let nE = 0, nC = 0;
    datos.forEach(r => { if (String(r[1]) === cohorte) { if (r[2] === "experimental") nE++; else if (r[2] === "control") nC++; } });
    const cond = nE < nC ? "experimental" : nC < nE ? "control" : (Math.random() < 0.5 ? "experimental" : "control");
    h.appendRow([new Date(), cohorte, cond]);
    return { condicion: cond };
  } finally {
    lock.releaseLock();
  }
}

function leerFilas_(cohorte) {
  const h = hoja_(HOJA_RESP);
  if (h.getLastRow() < 2) return [];
  const v = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
  const cab = v[0];
  return v.slice(1).map(r => { const o = {}; cab.forEach((k, i) => o[k] = r[i]); return o; })
          .filter(o => !cohorte || String(o.cohorte) === cohorte);
}

function hoja_(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Columnas de la pestaña Respuestas (mismo orden que la plantilla y que la web) */
const COLUMNAS = ["id", "cohorte", "condicion", "asignacion", "fecha_inicio", "fecha_fin", "duracion_s", "movil", "pantalla", "cambios_pestana", "salidas_pantalla_completa", "secuencia_vista", "tiempos_escenas_ms", "stroop_aciertos", "stroop_errores", "stroop_tr_medio_ms", "p01", "p01_ok", "p01_conf", "p02", "p02_ok", "p02_conf", "p03", "p03_ok", "p03_conf", "p04", "p04_ok", "p04_conf", "p05", "p05_ok", "p05_conf", "p06", "p06_ok", "p06_conf", "p07", "p07_ok", "p07_conf", "p08", "p08_ok", "p08_conf", "p09", "p09_ok", "p09_conf", "p10", "p10_ok", "p10_conf", "c1_recuerdo", "c1_recuerdo_ok", "c1_recuerdo_conf", "c2_reconocimiento", "c2_reconocimiento_ok", "c2_reconocimiento_conf", "aciertos_relleno", "n_items_relleno", "confianza_media_relleno", "interes", "malestar", "condiciones", "conocia", "edad", "recibido"];

/* Ejecutar UNA vez desde el editor para autorizar permisos.
   Si usas la plantilla "Loftus_Burns_datos" ya está todo creado y no se borra nada;
   si partes de una hoja vacía, crea las pestañas y las cabeceras. */
function preparar() {
  const r = hoja_(HOJA_RESP);
  if (r.getLastRow() === 0) {
    r.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS])
     .setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#0047E8");
    r.setFrozenRows(1);
  }
  const a = hoja_(HOJA_ASIG);
  if (a.getLastRow() === 0) a.appendRow(["fecha", "cohorte", "condicion"]);
  SpreadsheetApp.getActiveSpreadsheet().toast("Hoja preparada. Ahora: Implementar > Nueva implementación > Aplicación web.");
}
