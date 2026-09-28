/* =====================================================================
   FUNCIONES ESTADÍSTICAS (sin dependencias externas)
   - t de Welch (medias independientes, varianzas no asumidas iguales)
   - U de Mann-Whitney (no paramétrica), aproximación normal con
     corrección por empates y por continuidad
   - Chi-cuadrado 2x2 con corrección de Yates y prueba exacta de Fisher
   - Tamaños del efecto: d de Cohen, r = Z/√N, diferencia de proporciones
   ===================================================================== */
window.EST = (function () {
  "use strict";
  const media = (x) => x.reduce((a, b) => a + b, 0) / x.length;
  const varianza = (x) => { const m = media(x); return x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1); };
  const de = (x) => Math.sqrt(varianza(x));
  const mediana = (x) => { const s = [...x].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const cuantil = (x, q) => { const s = [...x].sort((a, b) => a - b); const pos = (s.length - 1) * q, b = Math.floor(pos); return s[b] + ((s[b + 1] ?? s[b]) - s[b]) * (pos - b); };

  /* log-gamma (Lanczos) */
  function lnGamma(z) {
    const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    z -= 1; let x = 0.99999999999980993;
    for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  /* beta incompleta regularizada (fracción continua, Numerical Recipes) */
  function betacf(a, b, x) {
    const MAX = 300, EPS = 3e-12, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= MAX; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function ibeta(a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  /* p bilateral de la t de Student */
  const pT = (t, gl) => ibeta(gl / 2, 0.5, gl / (gl + t * t));
  /* normal estándar */
  function phi(z) { // CDF, Abramowitz-Stegun 7.1.26 vía erf
    const s = z < 0 ? -1 : 1, x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return 0.5 * (1 + s * y);
  }
  const pZ = (z) => 2 * (1 - phi(Math.abs(z)));
  /* p de chi-cuadrado con 1 gl */
  const pChi1 = (x2) => pZ(Math.sqrt(x2));

  function welch(a, b) {
    const n1 = a.length, n2 = b.length;
    if (n1 < 2 || n2 < 2) return null;
    const m1 = media(a), m2 = media(b), v1 = varianza(a), v2 = varianza(b);
    const se = Math.sqrt(v1 / n1 + v2 / n2);
    if (se === 0) return { t: 0, gl: n1 + n2 - 2, p: 1, d: 0, m1, m2 };
    const t = (m1 - m2) / se;
    const gl = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
    const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
    return { t, gl, p: pT(t, gl), d: sp ? (m1 - m2) / sp : 0, m1, m2 };
  }

  function mannWhitney(a, b) {
    const n1 = a.length, n2 = b.length, N = n1 + n2;
    if (!n1 || !n2) return null;
    const todos = a.map((v) => ({ v, g: 1 })).concat(b.map((v) => ({ v, g: 2 }))).sort((x, y) => x.v - y.v);
    let i = 0, T = 0;
    while (i < N) {
      let j = i; while (j + 1 < N && todos[j + 1].v === todos[i].v) j++;
      const r = (i + j) / 2 + 1, k = j - i + 1;
      for (let q = i; q <= j; q++) todos[q].r = r;
      T += k ** 3 - k; i = j + 1;
    }
    const R1 = todos.filter((o) => o.g === 1).reduce((s, o) => s + o.r, 0);
    const U1 = R1 - n1 * (n1 + 1) / 2, U2 = n1 * n2 - U1, U = Math.min(U1, U2);
    const mu = n1 * n2 / 2;
    const sigma = Math.sqrt(n1 * n2 / 12 * ((N + 1) - T / (N * (N - 1))));
    const z = sigma ? (U1 - mu - Math.sign(U1 - mu) * 0.5) / sigma : 0;
    return { U, U1, z, p: sigma ? pZ(z) : 1, r: z / Math.sqrt(N) };
  }

  /* Tabla 2x2: a = aciertos G1, b = fallos G1, c = aciertos G2, d = fallos G2 */
  function chi2Yates(a, b, c, d) {
    const n = a + b + c + d, den = (a + b) * (c + d) * (a + c) * (b + d);
    if (!den) return null;
    const x2 = n * Math.max(0, Math.abs(a * d - b * c) - n / 2) ** 2 / den;
    return { x2, p: pChi1(x2) };
  }
  const lnFact = (n) => lnGamma(n + 1);
  function fisher(a, b, c, d) {
    const r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2;
    const prob = (x) => Math.exp(lnFact(r1) + lnFact(r2) + lnFact(c1) + lnFact(n - c1) - lnFact(n) - lnFact(x) - lnFact(r1 - x) - lnFact(c1 - x) - lnFact(r2 - c1 + x));
    const p0 = prob(a); let p = 0;
    for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) { const px = prob(x); if (px <= p0 * (1 + 1e-7)) p += px; }
    return Math.min(1, p);
  }

  return { media, de, varianza, mediana, cuantil, welch, mannWhitney, chi2Yates, fisher, pT, pZ };
})();
