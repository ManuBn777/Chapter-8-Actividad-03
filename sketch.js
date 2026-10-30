// =====================================================================
//  EL LIBRO MÁGICO · Unidad 8 "Why Bother?"
//  Manuela Barrera · Simulación
//
//  Tienes una idea, la dibujas en el aire, y un libro mágico intenta
//  hacerla realidad con tinta. Pero no te entiende: lo dibuja mal,
//  daña partes, le agrega cosas que no pediste y se le olvida.
//  Repasando con calma, poco a poco se entienden. Cuando por fin lo
//  logra, tu idea sube al cielo como constelación y se queda ahí,
//  junto a las de las personas que jugaron antes.
//
//  Lo que usa del curso:
//   - Aleatoriedad y ruido Perlin (U1): la inestabilidad de la tinta
//   - Fuerzas (U3) y agentes con comportamiento "llegar" (U6):
//     cada gota de tinta busca su lugar en la página
//   - Oscilaciones y Kuramoto (U4): el brillo de cada parte titila a su
//     ritmo y se va sincronizando a medida que el libro te entiende
//   - Partículas (U5): las gotas, las chispas y las salpicaduras
//
//  Al terminar una obra, un clic deja crear otra (sin repetir la historia).
//
//  Teclas para quien presenta:
//   N  = nuevo jugador (vuelve a la historia)
//   D  = ver el desorden oculto (barras por dentro)
//   B  = borrar todas las constelaciones del cielo
// =====================================================================


// ---------------------------------------------------------------------
//  CONFIGURACIÓN (números que se pueden ajustar)
// ---------------------------------------------------------------------
const MIN_INTENTOS = 15;     // nunca se puede ganar antes de esto
const RANGO_INTENTOS = 15;   // la meta secreta queda entre 15 y 30
const INTENTO_FINAL = 28;    // desde aquí el libro entiende sí o sí
const NUM_PARTES = 6;        // en cuántas partes se divide tu dibujo
const NUM_GOTAS = 480;       // cuántas gotas de tinta dibujan
const VEL_RABIA = 0.85;      // si trazas más rápido que esto, es "con rabia"
const IMPRECISION = 11;      // si te alejas más que esto de tu línea, es impreciso
const SEG_OLVIDO = 3;        // segundos quieta para que el libro empiece a olvidar
const CLAVE_CIELO = 'libroMagico_cielo';  // nombre con que se guarda el cielo

const HISTORIA = [
  'Toda idea empieza en tu cabeza.',
  'Este libro puede traerla al mundo,',
  'pero lo difícil es que se entiendan.'
];

const PASOS = [
  ['Dibuja en el aire', 'tu idea'],
  ['El libro intentará', 'hacerla realidad'],
  ['Si no te entiende,', 'repásala con calma para explicarle']
];

// Lo que dice el libro (frases típicas de una IA)
const FRASES = {
  inicio:   ['¡Claro! Aquí tienes tu dibujo.'],
  bien:     ['Entiendo perfectamente lo que buscas.', '¡Excelente observación! Ajusto eso de inmediato.', 'Tiene sentido. Aquí tienes la versión actualizada.', '¡Claro! Con gusto hago ese cambio.'],
  impreciso:['Disculpa, ¿podrías darme un poco más de contexto?', 'No estoy seguro de entender. ¿Podrías ser más específico?', 'Interesante. ¿Podrías aclarar a qué te refieres?'],
  rabia:    ['Lamento la confusión. Vamos paso a paso.', 'Parece que hubo un malentendido. Intentémoslo de nuevo.', 'Entiendo tu frustración. Vamos con calma.'],
  todo:     ['Son muchas solicitudes a la vez. ¿Por cuál empezamos?', 'Hay varios puntos aquí. Abordémoslos uno por uno.'],
  dano:     ['¡Tienes toda la razón! Disculpa el error. Aquí está la versión corregida.', '¡Perfecto! Ahora sí debería funcionar.', 'Corregí ese detalle. También hice algunos ajustes adicionales.'],
  adorno:   ['Me tomé la libertad de agregar algunas mejoras.', 'Aquí tienes una versión mejorada y más pulida.', 'Le añadí algunos toques para que se vea más profesional.'],
  limpiar:  ['Entendido, eliminé las mejoras. Lo mantengo simple.', '¡Por supuesto! Respeto tu visión original.'],
  olvido:   ['¡Hola! ¿En qué te puedo ayudar hoy?', '¿Podrías recordarme en qué estábamos trabajando?'],
  asegurar: ['¡Ahora sí! Esa parte quedó exactamente como la pediste.', '¡Gracias por la paciencia! Esa parte ya está.'],
  casi:     ['¡Listo! Tu dibujo está completo.', 'Creo que ya casi lo tenemos.'],
  final:    ['¡Por fin te entendí! ¿Hay algo más en lo que pueda ayudarte?']
};

const TIPOS_ADORNO = ['flor', 'corazon', 'espiral', 'estrella'];


// ---------------------------------------------------------------------
//  ESTADO DEL JUEGO
// ---------------------------------------------------------------------
// estados: 'historia' → 'instrucciones' → 'dibujar' → 'explicar' → 'ascender' → 'listo'
let estado = 'historia';

let idea = [];        // los puntos de tu dibujo en el aire
let ideaLibro = [];   // los mismos puntos, adaptados a la página del libro
let partes = [];      // cada parte del dibujo con su propio desorden
let gotas = [];       // las gotas de tinta (agentes)
let trazo = [];       // el trazo que estás haciendo ahora con la varita
let dibujando = false;

let intentos = 0;
let meta = 0;         // la meta secreta de intentos de esta partida
let ultimoGesto = 0;  // cuándo fue la última vez que trazaste
let yaOlvido = false;

let cielo = [];       // constelaciones guardadas
let ascenso = null;   // datos de la animación final

let globo = null;     // el mensaje que está diciendo el libro
let chispas = [], salpicaduras = [], preguntas = [], huellas = [], estela = [];
let tiembla = -9999;
let tHistoria = 0;
let verDesorden = false;
let estrellasFondo = [];

// Kuramoto: cada parte tiene una fase (en qué punto de su titileo va)
// y una frecuencia natural (qué tan rápido titila sola)
let fases = [];
let frecuencias = [];

// Música
let golpeSiguiente = 0, golpeIndice = 0;


// ---------------------------------------------------------------------
//  SETUP Y DRAW
// ---------------------------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(min(2, displayDensity()));
  noCursor();
  for (let i = 0; i < 160; i++) {
    estrellasFondo.push({ x: random(), y: random(0.72), r: random(0.3, 1.5), f: random(TWO_PI) });
  }
  cargarCielo();
  nuevoJugador();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  const ahora = millis();
  const t = ahora / 1000;
  const L = libro();

  background('#100e1a');
  dibujarFondo(t);
  dibujarCielo(t);

  // si el libro se dañó, tiembla un momento
  push();
  if (ahora - tiembla < 320) {
    const f = (1 - (ahora - tiembla) / 320) * 4;
    translate(random(-f, f), random(-f, f));
  }
  dibujarLibro(L);
  if (estado === 'explicar') {
    logicaContinua(ahora, L);
    for (const g of gotas) g.actualizar(t, L);
    dibujarTinta(t, ahora);
  }
  pop();

  dibujarPreguntas(ahora);
  if (estado === 'dibujar' && trazo.length === 0) textoGuia('Dibuja en el aire tu idea', L, t, true);
  if (estado === 'listo' && !globo) textoGuia('Tu idea quedó en el cielo. Haz clic para crear otra.', L, t, true);
  if (estado === 'explicar') { dibujarIdeaFantasma(); dibujarHuellas(); dibujarContador(); }
  dibujarTrazo();
  if (estado === 'ascender') dibujarAscenso(ahora);
  dibujarChispas();
  dibujarEstela();
  dibujarGlobo(ahora, L);
  if (verDesorden && partes.length) dibujarDesorden();
  if (estado === 'historia') dibujarHistoria(ahora, t);
  if (estado === 'instrucciones') dibujarInstrucciones(t);
  dibujarVarita(mouseX, mouseY, 1);
}


// ---------------------------------------------------------------------
//  EL LIBRO (posición y tamaño según la pantalla)
// ---------------------------------------------------------------------
function libro() {
  const w = min(width * 0.62, 640);
  const h = min(height * 0.32, 240);
  return { x: (width - w) / 2, y: height - h - 34, w: w, h: h };
}


// ---------------------------------------------------------------------
//  LAS GOTAS DE TINTA (agentes)
//  Cada gota sabe a qué punto de tu dibujo pertenece. El libro calcula
//  dónde CREE que va (con desorden), y la gota "llega" hasta ahí
//  usando el comportamiento de llegada de la Unidad 6.
// ---------------------------------------------------------------------
class Gota {
  constructor(indice, inicio) {
    this.i = indice;
    this.pos = inicio.copy();
    this.vel = createVector(0, 0);
    this.desvio = createVector(randomGaussian(0, 21), randomGaussian(0, 13));
    this.semilla = random(1000);
    this.fase = random(TWO_PI);
    this.mancha = random() < 0.08;
  }

  parte() { return parteDe(this.i); }

  // Dónde cree el libro que va esta gota
  objetivo(t) {
    const p = partes[this.parte()];
    const m = p.desorden;
    const q = ideaLibro[this.i];
    const ang = p.giro * m;
    const dx = q.x - p.centro.x, dy = q.y - p.centro.y;

    let x = p.centro.x + dx * cos(ang) - dy * sin(ang) + p.corrimiento.x * m + this.desvio.x * m;
    let y = p.centro.y + dx * sin(ang) + dy * cos(ang) + p.corrimiento.y * m + this.desvio.y * m;

    // ruido Perlin: la magia inestable tiembla más entre más desorden
    x += (noise(this.semilla, t * 0.5) - 0.5) * 16 * m;
    y += (noise(this.semilla + 50, t * 0.5) - 0.5) * 16 * m;

    // si el libro le puso adornos a esta parte, las gotas se enroscan
    if (p.adornos.length) {
      const a = this.i * 0.35 + p.faseAdorno + t * 0.8;
      const r = 10 * sin(this.i * 0.2);
      x += cos(a) * r;
      y += sin(a) * r;
    }
    return createVector(x, y);
  }

  // Comportamiento "llegar": acelera hacia el objetivo y frena al acercarse
  actualizar(t, L) {
    const deseo = p5.Vector.sub(this.objetivo(t), this.pos);
    const d = deseo.mag();
    const rapidez = d < 60 ? map(d, 0, 60, 0, 8) : 8;
    deseo.setMag(rapidez);
    const fuerza = p5.Vector.sub(deseo, this.vel);
    fuerza.limit(0.9);
    this.vel.add(fuerza);
    this.pos.add(this.vel);
    // que la tinta no se salga de las páginas
    this.pos.x = constrain(this.pos.x, L.x + 6, L.x + L.w - 6);
    this.pos.y = constrain(this.pos.y, L.y + 6, L.y + L.h - 6);
  }
}

function parteDe(i) {
  return min(NUM_PARTES - 1, floor(i / idea.length * NUM_PARTES));
}

function puntosDeParte(k) {
  return ideaLibro.slice(floor(k / NUM_PARTES * ideaLibro.length), floor((k + 1) / NUM_PARTES * ideaLibro.length));
}

function desordenTotal() {
  if (!partes.length) return 1;
  return partes.reduce((s, p) => s + p.desorden, 0) / NUM_PARTES;
}


// ---------------------------------------------------------------------
//  LANZAR EL HECHIZO (cuando terminas tu primer dibujo)
// ---------------------------------------------------------------------
function lanzarHechizo() {
  // guardar tu idea, sin puntos repetidos
  idea = [];
  for (const p of trazo) {
    const u = idea[idea.length - 1];
    if (!u || dist(p.x, p.y, u.x, u.y) > 3) idea.push({ x: p.x, y: p.y });
  }

  // adaptar tu dibujo al tamaño de la página
  const L = libro();
  const xs = idea.map(p => p.x), ys = idea.map(p => p.y);
  const x0 = min(xs), x1 = max(xs), y0 = min(ys), y1 = max(ys);
  const esc = min((L.w - 80) / max(1, x1 - x0), (L.h - 50) / max(1, y1 - y0));
  ideaLibro = idea.map(p => createVector(L.x + L.w / 2 + (p.x - (x0 + x1) / 2) * esc, L.y + L.h / 2 + (p.y - (y0 + y1) / 2) * esc));

  // crear las partes, todas empiezan con desorden total
  partes = [];
  for (let k = 0; k < NUM_PARTES; k++) {
    const pts = puntosDeParte(k);
    const centro = createVector(0, 0);
    for (const q of pts) centro.add(q);
    centro.div(max(1, pts.length));
    const p = {
      desorden: 1, adornos: [], faseAdorno: 0, aseguradaHasta: 0,
      golpe: -9999, bien: -9999, proxNota: millis() + random(1500),
      centro: centro, corrimiento: createVector(0, 0), giro: 0, notaFalsa: 0
    };
    revolver(p, 1);
    partes.push(p);
  }

  // crear las gotas de tinta en el centro del libro
  gotas = [];
  const centroLibro = createVector(L.x + L.w / 2, L.y + L.h / 2);
  for (let i = 0; i < NUM_GOTAS; i++) gotas.push(new Gota(floor(i / NUM_GOTAS * idea.length), centroLibro));

  // Kuramoto: fases al azar y frecuencias distintas para cada parte
  fases = []; frecuencias = [];
  for (let k = 0; k < NUM_PARTES; k++) { fases.push(random(TWO_PI)); frecuencias.push(random(2, 6)); }

  // la meta secreta: casi siempre cerca de 22, rara vez en los extremos
  meta = MIN_INTENTOS + round(RANGO_INTENTOS * (random() + random() + random()) / 3);
  intentos = 0;
  yaOlvido = false;
  ultimoGesto = millis();
  estado = 'explicar';
  decir(elegir(FRASES.inicio));
}

// Mueve, gira y desafina una parte al azar
function revolver(p, fuerza) {
  p.corrimiento = createVector(randomGaussian(0, 28 * fuerza), randomGaussian(0, 17 * fuerza));
  p.giro = randomGaussian(0, 0.75 * fuerza);
  p.notaFalsa = floor(random(13));
}


// ---------------------------------------------------------------------
//  EXPLICARLE AL LIBRO (cada vez que repasas tu dibujo)
// ---------------------------------------------------------------------
function explicar(s) {
  if (s.length < 4) return;

  // ¿qué tan rápido trazaste?
  let largo = 0;
  for (let i = 1; i < s.length; i++) largo += dist(s[i].x, s[i].y, s[i - 1].x, s[i - 1].y);
  const velocidad = largo / max(1, s[s.length - 1].t - s[0].t);

  // ¿qué partes tocaste y qué tan cerca de tu línea pasaste?
  const toques = new Array(NUM_PARTES).fill(0);
  let distProm = 0, n = 0;
  for (let j = 0; j < s.length; j += 2) {
    let mejor = 1e9, mejorI = 0;
    for (let i = 0; i < idea.length; i++) {
      const d = dist(idea[i].x, idea[i].y, s[j].x, s[j].y);
      if (d < mejor) { mejor = d; mejorI = i; }
    }
    if (mejor < 30) toques[parteDe(mejorI)]++;
    distProm += min(mejor, 40);
    n++;
  }
  distProm /= n;
  const tocadas = [];
  toques.forEach((v, k) => { if (v >= 3) tocadas.push(k); });

  if (!tocadas.length || distProm > 30) {
    decir('Repasa encima de tu dibujo en el aire', false, false);
    return;
  }

  intentos++;
  const ahora = millis();
  const tarde = intentos >= meta;            // ya pasó la meta: el libro se ablanda
  const final = intentos >= INTENTO_FINAL;  // ya no puede fallar

  if (!final) {
    // 1. Con rabia: la tinta se descontrola en lo que tocaste
    if (velocidad > VEL_RABIA) {
      for (const k of tocadas) {
        const p = partes[k];
        if (p.desorden > 0 || p.aseguradaHasta <= intentos) {
          p.desorden = min(1, p.desorden + 0.16);
          revolver(p, 0.6);
          p.golpe = ahora;
        }
      }
      tiembla = ahora;
      for (const g of gotas) g.vel.add(randomGaussian(0, 7), randomGaussian(0, 7));
      decir(elegir(FRASES.rabia));
      return;
    }
    // 2. Todo de una vez: el libro se enreda
    if (tocadas.length > 4) {
      for (const k of tocadas) if (partes[k].desorden > 0) partes[k].desorden = min(1, partes[k].desorden + 0.05);
      decir(elegir(FRASES.todo));
      return;
    }
    // 3. Con calma pero impreciso: casi no entiende
    if (distProm > IMPRECISION) {
      for (const k of tocadas) partes[k].desorden = max(0, partes[k].desorden - 0.04);
      if (random() < 0.4) decir(elegir(FRASES.impreciso));
      return;
    }
  }

  // 4. Bien explicado: las partes tocadas se ordenan
  let limpio = false, asegurada = false;
  const factor = tocadas.length >= 3 ? 0.6 : 1;
  const objetivos = final ? [0, 1, 2, 3, 4, 5] : tocadas;
  for (const k of objetivos) {
    const p = partes[k];
    if (p.adornos.length) {           // primero hay que quitarle los adornos
      for (const a of p.adornos) for (let j = 0; j < 6; j++) chispas.push(nuevaChispa(a.x, a.y, [180, 140, 230]));
      p.adornos = [];
      limpio = true;
      continue;
    }
    if (p.desorden === 0) continue;
    const paso = final ? 1 : (0.18 + 0.16 * p.desorden) * (tarde ? 1.6 : 1) * factor;
    p.desorden = max(0, p.desorden - paso);
    p.bien = ahora;
    if (p.desorden < 0.04) {          // ¡parte asegurada!
      p.desorden = 0;
      p.aseguradaHasta = intentos + 3;
      asegurada = true;
      nota(frecuencia(ESCALA[k] + 12), 0, 1.2, 0.35, 'sine');
      puntosDeParte(k).forEach((q, j) => { if (j % 3 === 0) chispas.push(nuevaChispa(q.x, q.y)); });
    }
  }
  for (let j = 0; j < 2; j++) {
    const q = s[floor(random(s.length))];
    huellas.push({ x: q.x + randomGaussian(0, 4), y: q.y + randomGaussian(0, 4) });
  }
  if (limpio && !final) { decir(elegir(FRASES.limpiar)); return; }

  const tot = desordenTotal();

  // Si ya iba a ganar antes del mínimo, el libro daña algo
  if (tot === 0 && intentos < MIN_INTENTOS) {
    const opciones = [0, 1, 2, 3, 4, 5].filter(k => !tocadas.includes(k));
    danar(elegir(opciones.length ? opciones : [0, 1, 2, 3, 4, 5]), true);
    decir(elegir(FRASES.dano));
    return;
  }

  // Cuando ya casi está, el libro "lo mejora" con adornos que nadie pidió
  if (!tarde && intentos < meta - 3 && tot < 0.35 && tot > 0 && random() < 0.45) {
    const opciones = [0, 1, 2, 3, 4, 5].filter(k => !partes[k].adornos.length && !tocadas.includes(k) && partes[k].aseguradaHasta <= intentos);
    if (opciones.length) {
      agregarAdornos(elegir(opciones));
      nota(frecuencia(16), 0, 0.5, 0.2, 'sine');
      nota(frecuencia(19), 0.08, 0.5, 0.2, 'sine');
      decir(elegir(FRASES.adorno));
      return;
    }
  }

  // Arreglas una parte y se daña otra
  const probDano = intentos < MIN_INTENTOS ? 0.6 : (tarde ? 0 : 0.35);
  const otras = [0, 1, 2, 3, 4, 5].filter(k => !tocadas.includes(k) && partes[k].desorden < 0.5 && partes[k].aseguradaHasta <= intentos);
  if (otras.length && random() < probDano) {
    danar(elegir(otras));
    decir(elegir(FRASES.dano));
    return;
  }

  if (asegurada) { decir(elegir(FRASES.asegurar)); return; }
  if (tot < 0.15 && tot > 0) { if (random() < 0.5) decir(elegir(FRASES.casi)); return; }
  if (random() < 0.3) decir(elegir(FRASES.bien));
}

function danar(k, forzar) {
  const p = partes[k];
  if (!forzar && p.aseguradaHasta > intentos) return;
  p.desorden = min(1, p.desorden + 0.22);
  revolver(p, 1);
  const ahora = millis();
  p.golpe = ahora;
  tiembla = ahora;
  for (let j = 0; j < 14; j++) {
    const a = random(TWO_PI), r = random(26);
    salpicaduras.push({ x: p.centro.x + cos(a) * r, y: p.centro.y + sin(a) * r, r: random(1, 5.5), t0: ahora });
  }
  nota(frecuencia(1) * 0.5, 0, 0.4, 0.18, 'sawtooth');
}

function agregarAdornos(k) {
  const p = partes[k];
  const pts = puntosDeParte(k);
  const ahora = millis();
  p.faseAdorno = random(TWO_PI);
  p.adornos = [];
  for (let j = 0; j < 3; j++) {
    const a = elegir(pts);
    p.adornos.push({ x: a.x + randomGaussian(0, 10), y: a.y + randomGaussian(0, 9) - 6, tipo: elegir(TIPOS_ADORNO), s: random(6, 10), t0: ahora + j * 160, rot: random(6) });
  }
}


// ---------------------------------------------------------------------
//  LO QUE PASA EN CADA CUADRO MIENTRAS EXPLICAS
// ---------------------------------------------------------------------
function logicaContinua(ahora, L) {
  const tot = desordenTotal();
  actualizarKuramoto(deltaTime / 1000, tot);
  musicaContinua(ahora);

  // ¿ganaste?
  if (tot === 0 && !partes.some(p => p.adornos.length)) { empezarAscenso(); return; }

  // si te quedas quieta, el libro olvida
  if (intentos < meta && ahora - ultimoGesto > SEG_OLVIDO * 1000) {
    const k = floor(random(NUM_PARTES));
    if (partes[k].aseguradaHasta <= intentos) partes[k].desorden = min(0.9, partes[k].desorden + 0.006);
    if (random() < 0.04) preguntas.push({ x: random(L.x + 30, L.x + L.w - 30), y: random(L.y + 20, L.y + L.h - 20), t0: ahora, s: random(14, 24) });
    if (!yaOlvido) { decir(elegir(FRASES.olvido)); yaOlvido = true; }
  } else if (ahora - ultimoGesto <= SEG_OLVIDO * 1000) {
    yaOlvido = false;
  }
}

// Modelo de Kuramoto: cada parte titila a su ritmo, pero se "jala"
// hacia el ritmo de las demás. Entre menos desorden, más fuerte el
// acople (K), hasta que todas titilan juntas.
function actualizarKuramoto(dt, tot) {
  const K = map(tot, 1, 0, 0, 7);
  const nuevas = [];
  for (let k = 0; k < NUM_PARTES; k++) {
    let suma = 0;
    for (let j = 0; j < NUM_PARTES; j++) suma += sin(fases[j] - fases[k]);
    const w = frecuencias[k] * (1 + 2 * tot);   // con desorden, titileo ansioso
    nuevas.push(fases[k] + (w + K / NUM_PARTES * suma) * dt);
  }
  fases = nuevas;
}


// ---------------------------------------------------------------------
//  EL FINAL: la tinta se vuelve luz y sube al cielo
// ---------------------------------------------------------------------
function empezarAscenso() {
  estado = 'ascender';
  const xs = idea.map(p => p.x), ys = idea.map(p => p.y);
  const cx = (min(xs) + max(xs)) / 2, cy = (min(ys) + max(ys)) / 2;

  // buscar un lugar del cielo que no choque con otras constelaciones
  let sx, sy, ok = false, intentosLugar = 0;
  while (!ok && intentosLugar < 60) {
    sx = random(70, width - 70);
    sy = random(50, height * 0.4);
    ok = cielo.every(o => dist(o.cx * width, o.cy * height, sx, sy) > 120);
    intentosLugar++;
  }

  const esc = 0.32;
  const estrellas = [];
  const paso = max(1, floor(idea.length / 16));
  for (let i = 0; i < idea.length; i += paso) estrellas.push({ x: sx + (idea[i].x - cx) * esc, y: sy + (idea[i].y - cy) * esc });

  for (const g of gotas) {
    const q = idea[g.i];
    g.inicio = g.pos.copy();
    g.fin = createVector(sx + (q.x - cx) * esc, sy + (q.y - cy) * esc);
  }
  ascenso = { estrellas, sx, sy, t0: millis(), n: intentos };
  salpicaduras = [];

  // la melodía: de do a do, y un acorde suave
  ESCALA.forEach((s, i) => nota(frecuencia(s), i * 0.22, 1.4, 0.32, 'triangle'));
  [0, 4, 7, 12].forEach(s => nota(frecuencia(s), ESCALA.length * 0.22, 3, 0.14, 'sine'));
  [0, 4, 7].forEach(s => nota(frecuencia(s - 12), ESCALA.length * 0.22, 3.2, 0.1, 'sine'));
  decir(elegir(FRASES.final));
}

function dibujarAscenso(ahora) {
  const A = min(1, (ahora - ascenso.t0) / 3000);
  const e = A < 0.5 ? 2 * A * A : 1 - pow(-2 * A + 2, 2) / 2;   // suave al inicio y al final
  const luz = min(1, A * 2.2);                                    // de tinta a luz
  noStroke();
  for (const g of gotas) {
    const x = lerp(g.inicio.x, g.fin.x, e);
    const y = lerp(g.inicio.y, g.fin.y, e) - sin(e * PI) * 60;
    fill(lerp(38, 255, luz), lerp(24, 235, luz), lerp(16, 170, luz), 255 * (1 - A * 0.3));
    circle(x, y, 2.8 + luz * 1.8);
  }
  if (A >= 1) {
    const ys = ascenso.estrellas.map(p => p.y);
    // se guarda en proporciones de la pantalla, para que funcione en cualquier tamaño
    cielo.push({
      estrellas: ascenso.estrellas.map(p => ({ x: p.x / width, y: p.y / height })),
      cx: ascenso.sx / width, cy: ascenso.sy / height,
      abajo: max(ys) / height,
      n: ascenso.n
    });
    guardarCielo();
    gotas = []; partes = [];
    estado = 'listo';
  }
}


// ---------------------------------------------------------------------
//  GUARDAR EL CIELO (queda en el navegador de este computador)
// ---------------------------------------------------------------------
function guardarCielo() {
  try { localStorage.setItem(CLAVE_CIELO, JSON.stringify(cielo)); } catch (e) {}
}
function cargarCielo() {
  try {
    const datos = localStorage.getItem(CLAVE_CIELO);
    cielo = datos ? JSON.parse(datos) : [];
  } catch (e) { cielo = []; }
}


// ---------------------------------------------------------------------
//  SONIDO (Web Audio, sin librerías extra)
// ---------------------------------------------------------------------
let audio = null, salida = null;
const DO4 = 261.63;
const ESCALA = [0, 2, 4, 5, 7, 9, 11, 12];   // do re mi fa sol la si do

function iniciarSonido() {
  if (audio) { if (audio.state === 'suspended') audio.resume(); return; }
  audio = new (window.AudioContext || window.webkitAudioContext)();
  salida = audio.createGain(); salida.gain.value = 0.2;
  const eco = audio.createDelay(); eco.delayTime.value = 0.3;
  const vuelta = audio.createGain(); vuelta.gain.value = 0.35;
  const mojado = audio.createGain(); mojado.gain.value = 0.3;
  salida.connect(audio.destination);
  salida.connect(eco); eco.connect(vuelta); vuelta.connect(eco);
  eco.connect(mojado); mojado.connect(audio.destination);
}

function nota(freq, retraso = 0, dur = 0.8, vol = 0.3, tipo = 'triangle') {
  if (!audio) return;
  const t = audio.currentTime + retraso;
  const osc = audio.createOscillator(), vol_ = audio.createGain();
  osc.type = tipo; osc.frequency.value = freq;
  vol_.gain.setValueAtTime(0.0001, t);
  vol_.gain.linearRampToValueAtTime(vol, t + 0.02);
  vol_.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(vol_); vol_.connect(salida);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function frecuencia(semitonos) { return DO4 * pow(2, semitonos / 12); }

// La nota que suena cada parte: desafinada mientras está desordenada
function notaDeParte(k) {
  const p = partes[k], correcta = ESCALA[k];
  if (p.desorden === 0) return frecuencia(correcta);
  let s = p.desorden > 0.5 ? p.notaFalsa : (p.desorden > 0.15 ? correcta + (random() < 0.5 ? 1 : -1) : correcta);
  return frecuencia(s + (random() - 0.5) * 1.6 * p.desorden);
}

function musicaContinua(ahora) {
  if (!audio) return;
  // las partes desordenadas suenan sueltas, a destiempo
  partes.forEach((p, k) => {
    if (p.desorden > 0 && ahora >= p.proxNota) {
      nota(notaDeParte(k), 0, 0.7, 0.12 + 0.1 * p.desorden, p.desorden > 0.5 ? 'sawtooth' : 'triangle');
      p.proxNota = ahora + 500 + random(1200 + 2200 * p.desorden);
    }
  });
  // las partes que ya entendió entran en un pulso ordenado: do, re, mi...
  if (ahora >= golpeSiguiente) {
    golpeSiguiente = ahora + 420;
    const k = golpeIndice++ % NUM_PARTES;
    if (partes[k].desorden === 0) nota(frecuencia(ESCALA[k]), 0, 0.9, 0.2, 'triangle');
  }
}


// ---------------------------------------------------------------------
//  INTERACCIÓN (mouse y pantalla táctil)
// ---------------------------------------------------------------------
function mousePressed() {
  iniciarSonido();
  if (estado === 'historia') {
    // si las frases todavía están apareciendo, se muestran todas de una
    if (millis() - tHistoria < HISTORIA.length * 1100) { tHistoria = millis() - HISTORIA.length * 1100; return false; }
    estado = 'instrucciones';
    return false;
  }
  if (estado === 'instrucciones') { estado = 'dibujar'; return false; }
  if (estado === 'listo') { otraObra(); return false; }
  if (estado === 'dibujar' || estado === 'explicar') {
    dibujando = true;
    trazo = [{ x: mouseX, y: mouseY, t: millis() }];
  }
  return false;
}

function mouseDragged() {
  if (!dibujando) return false;
  trazo.push({ x: mouseX, y: mouseY, t: millis() });
  if (random() < 0.6) estela.push({ x: mouseX + randomGaussian(0, 2), y: mouseY + randomGaussian(0, 2), vx: randomGaussian(0, 0.4), vy: randomGaussian(0, 0.4), vida: 1 });
  return false;
}

function mouseReleased() {
  if (!dibujando) return false;
  dibujando = false;
  ultimoGesto = millis();
  if (estado === 'dibujar' && trazo.length > 8) lanzarHechizo();
  else if (estado === 'explicar') explicar(trazo);
  trazo = [];
  return false;
}

function keyPressed() {
  if (key === 'n' || key === 'N') nuevoJugador();
  if (key === 'd' || key === 'D') verDesorden = !verDesorden;
  if (key === 'b' || key === 'B') {
    if (confirm('¿Borrar todas las constelaciones del cielo?')) { cielo = []; guardarCielo(); }
  }
}

// Otra obra para el mismo jugador: va directo a dibujar, sin repetir la historia
function otraObra() {
  estado = 'dibujar';
  idea = []; ideaLibro = []; partes = []; gotas = []; trazo = [];
  intentos = 0; dibujando = false; globo = null;
  salpicaduras = []; preguntas = []; huellas = [];
}

function nuevoJugador() {
  estado = 'historia';
  tHistoria = millis();
  idea = []; ideaLibro = []; partes = []; gotas = []; trazo = [];
  intentos = 0; dibujando = false; globo = null;
  chispas = []; salpicaduras = []; preguntas = []; huellas = []; estela = [];
}


// ---------------------------------------------------------------------
//  DIBUJO: fondo, cielo y libro
// ---------------------------------------------------------------------
function dibujarFondo(t) {
  noStroke();
  for (const s of estrellasFondo) {
    fill(255, 255, 255, 255 * (0.25 + 0.25 * sin(t + s.f)));
    circle(s.x * width, s.y * height, s.r * 2);
  }
}

function dibujarCielo(t) {
  for (const o of cielo) {
    stroke(200, 210, 255, 56);
    strokeWeight(0.8);
    noFill();
    beginShape();
    for (const p of o.estrellas) vertex(p.x * width, p.y * height);
    endShape();
    noStroke();
    o.estrellas.forEach((p, i) => {
      fill(255, 240, 200, 255 * (0.6 + 0.4 * sin(t * 1.5 + i * 1.7)));
      circle(p.x * width, p.y * height, 3.6);
    });
    fill(255, 255, 255, 76);
    textFont('sans-serif'); textSize(10); textAlign(CENTER, TOP);
    text(o.n + ' intentos', o.cx * width, o.abajo * height + 8);
  }
}

function dibujarLibro(L) {
  const ctx = drawingContext;
  noStroke();
  fill('#3b2618'); rect(L.x - 14, L.y - 8, L.w + 28, L.h + 20, 10);   // tapa
  fill('#d9c9a3'); rect(L.x - 4, L.y + 2, L.w + 8, L.h + 4, 4);       // bordes de hojas

  // página izquierda
  let grad = ctx.createLinearGradient(L.x, 0, L.x + L.w / 2, 0);
  grad.addColorStop(0, '#eadfc4'); grad.addColorStop(0.85, '#e6d8b8'); grad.addColorStop(1, '#cdbb92');
  ctx.fillStyle = grad; rect(L.x, L.y, L.w / 2, L.h, 3);
  // página derecha
  grad = ctx.createLinearGradient(L.x + L.w / 2, 0, L.x + L.w, 0);
  grad.addColorStop(0, '#cdbb92'); grad.addColorStop(0.15, '#e6d8b8'); grad.addColorStop(1, '#eadfc4');
  ctx.fillStyle = grad; rect(L.x + L.w / 2, L.y, L.w / 2, L.h, 3);

  // renglones
  stroke(120, 90, 50, 46); strokeWeight(0.6);
  for (let y = L.y + 22; y < L.y + L.h - 10; y += 16) {
    line(L.x + 16, y, L.x + L.w / 2 - 14, y);
    line(L.x + L.w / 2 + 14, y, L.x + L.w - 16, y);
  }
  // lomo
  stroke(60, 40, 20, 90); strokeWeight(1.5);
  line(L.x + L.w / 2, L.y + 2, L.x + L.w / 2, L.y + L.h - 2);
}


// ---------------------------------------------------------------------
//  DIBUJO: la tinta en la página
// ---------------------------------------------------------------------
function dibujarTinta(t, ahora) {
  noStroke();

  // brillo rojo donde algo se dañó
  for (const p of partes) {
    const h = (ahora - p.golpe) / 900;
    if (h < 1) {
      fill(200, 50, 40, 72 * (1 - h));
      circle(p.centro.x + p.corrimiento.x * p.desorden, p.centro.y + p.corrimiento.y * p.desorden, 72);
    }
  }

  // brillo cálido bajo la tinta: titila según Kuramoto, y dorado al arreglar
  for (const g of gotas) {
    const k = g.parte(), p = partes[k];
    const pulso = 0.5 + 0.5 * sin(fases[k] + g.fase * p.desorden);
    const dorado = max(0, 1 - (ahora - p.bien) / 800);
    fill(230, 150, 40, 255 * (0.12 * pulso + 0.35 * dorado));
    circle(g.pos.x, g.pos.y, 8 + 6 * dorado);
  }

  // salpicaduras que se desvanecen
  for (const s of salpicaduras) {
    const a = max(0, 1 - (ahora - s.t0) / 2500);
    fill(38, 24, 16, 140 * a);
    circle(s.x, s.y, s.r * 2);
  }
  salpicaduras = salpicaduras.filter(s => ahora - s.t0 < 2500);

  // el trazo de tinta: une cada gota con la siguiente
  strokeCap(ROUND);
  for (let i = 1; i < gotas.length; i++) {
    const a = gotas[i - 1], b = gotas[i];
    if (dist(a.pos.x, a.pos.y, b.pos.x, b.pos.y) > 26) continue;
    const pa = partes[a.parte()], pb = partes[b.parte()];
    const m = max(pa.desorden, pb.desorden);
    const adornada = pa.adornos.length || pb.adornos.length;
    if (adornada) stroke(95, 55, 140, 190);
    else stroke(38, 24, 16, 255 * (0.92 - 0.4 * m));
    strokeWeight(1.4 + 0.8 * (1 - m) + sin(i * 0.7) * 0.3);
    line(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
  }

  // manchones cuando el libro está confundido
  noStroke();
  for (const g of gotas) {
    const p = partes[g.parte()];
    if (g.mancha && p.desorden > 0.3) {
      fill(38, 24, 16, 255 * (0.25 + 0.4 * p.desorden));
      circle(g.pos.x + cos(g.fase) * 4, g.pos.y + sin(g.fase) * 4, 2.4 + 6 * p.desorden);
    }
  }

  // los adornos que nadie pidió
  for (const p of partes) for (const a of p.adornos) dibujarAdorno(a, ahora);
}

function dibujarAdorno(a, ahora) {
  const edad = (ahora - a.t0) / 260;
  if (edad < 0) return;
  const s = a.s * (edad < 1 ? edad * 1.3 : 1 + 0.08 * sin(ahora / 300 + a.rot));
  push();
  translate(a.x, a.y);
  rotate(a.rot * 0.2);
  stroke(95, 55, 140, 217);
  fill(95, 55, 140, 64);
  strokeWeight(1.3);
  if (a.tipo === 'flor') {
    for (let k = 0; k < 5; k++) {
      const ang = k * TWO_PI / 5;
      push(); translate(cos(ang) * s * 0.55, sin(ang) * s * 0.55); rotate(ang);
      ellipse(0, 0, s * 0.9, s * 0.56); pop();
    }
    circle(0, 0, s * 0.44);
  } else if (a.tipo === 'corazon') {
    beginShape();
    vertex(0, s * 0.6);
    bezierVertex(-s * 1.2, -s * 0.2, -s * 0.4, -s, 0, -s * 0.35);
    bezierVertex(s * 0.4, -s, s * 1.2, -s * 0.2, 0, s * 0.6);
    endShape(CLOSE);
  } else if (a.tipo === 'espiral') {
    noFill();
    beginShape();
    for (let ang = 0; ang < 12; ang += 0.3) vertex(cos(ang) * ang * s * 0.09, sin(ang) * ang * s * 0.09);
    endShape();
  } else {
    estrellaForma(0, 0, s, 1, true);
  }
  pop();
}


// ---------------------------------------------------------------------
//  DIBUJO: tu idea, tus trazos y las huellas
// ---------------------------------------------------------------------
function dibujarIdeaFantasma() {
  noFill(); stroke(200, 180, 255, 51); strokeWeight(1.5);
  beginShape(); for (const p of idea) vertex(p.x, p.y); endShape();
}

function dibujarHuellas() {
  noStroke(); fill(239, 159, 39, 102);
  for (const h of huellas) circle(h.x, h.y, 3.2);
}

function dibujarTrazo() {
  if (trazo.length < 2) return;
  noFill();
  stroke(estado === 'dibujar' ? color(255, 235, 190, 230) : color(255, 220, 150, 180));
  strokeWeight(2); strokeCap(ROUND);
  beginShape(); for (const p of trazo) vertex(p.x, p.y); endShape();
}

function dibujarContador() {
  noStroke(); fill(250, 240, 220, 110);
  textFont('sans-serif'); textSize(13); textAlign(LEFT, TOP);
  text('Intentos: ' + intentos, 18, 16);
}


// ---------------------------------------------------------------------
//  DIBUJO: partículas sueltas (chispas, estela, signos de pregunta)
// ---------------------------------------------------------------------
function nuevaChispa(x, y, col) {
  return { x, y, vx: randomGaussian(0, 1.8), vy: randomGaussian(0, 1.8) - 1, vida: 1, col: col || [255, 215, 120] };
}

function dibujarChispas() {
  noStroke();
  for (const c of chispas) {
    c.x += c.vx; c.y += c.vy; c.vy += 0.03; c.vida -= 0.02;
    fill(c.col[0], c.col[1], c.col[2], 255 * c.vida);
    circle(c.x, c.y, 3.6);
  }
  chispas = chispas.filter(c => c.vida > 0);
}

function dibujarEstela() {
  noStroke();
  for (const s of estela) {
    s.x += s.vx; s.y += s.vy; s.vida -= 0.03;
    fill(255, 230, 160, 255 * s.vida);
    circle(s.x, s.y, 2.8);
  }
  estela = estela.filter(s => s.vida > 0);
}

function dibujarPreguntas(ahora) {
  noStroke(); textAlign(CENTER, CENTER); textFont('sans-serif');
  for (const q of preguntas) {
    const a = (ahora - q.t0) / 2200;
    fill(250, 240, 220, 204 * (1 - a));
    textSize(q.s);
    text('?', q.x, q.y - a * 50);
  }
  preguntas = preguntas.filter(q => ahora - q.t0 < 2200);
}


// ---------------------------------------------------------------------
//  DIBUJO: lo que dice el libro (globo de diálogo)
// ---------------------------------------------------------------------
function decir(texto, fijo = false, esLibro = true) {
  globo = { texto: esLibro ? '“' + texto + '”' : texto, t0: millis(), fijo, esLibro };
}

function dibujarGlobo(ahora, L) {
  if (!globo) return;
  const edad = (ahora - globo.t0) / 1000;
  let a = min(1, edad / 0.3);
  if (!globo.fijo && edad > 3.6) a = max(0, 1 - (edad - 3.6) / 0.6);
  if (a <= 0) { globo = null; return; }

  textFont('sans-serif'); textSize(15);
  const lineas = partirTexto(globo.texto, min(420, width - 60));
  const anchoG = max(...lineas.map(l => textWidth(l))) + 32;
  const altoG = lineas.length * 21 + (globo.esLibro ? 36 : 20);
  const x = width / 2 - anchoG / 2;
  const y = L.y - altoG - 28 - (1 - a) * 8;

  fill(22, 17, 34, 217 * a); stroke(239, 190, 100, 140 * a); strokeWeight(1);
  rect(x, y, anchoG, altoG, 10);
  noStroke();
  triangle(width / 2 - 7, y + altoG, width / 2, y + altoG + 9, width / 2 + 7, y + altoG);

  textAlign(CENTER, TOP);
  let ty = y + 12;
  if (globo.esLibro) {
    textSize(12); fill(239, 190, 100, 204 * a);
    text('El libro', width / 2, ty);
    ty += 20; textSize(15);
  }
  fill(250, 240, 220, 242 * a);
  lineas.forEach((l, i) => text(l, width / 2, ty + i * 21));
}

function textoGuia(msg, L, t, parpadea) {
  noStroke(); textFont('sans-serif'); textSize(16); textAlign(CENTER, CENTER);
  fill(250, 240, 220, 255 * (parpadea ? 0.5 + 0.2 * sin(t * 2) : 0.6));
  text(msg, width / 2, L.y - 44);
}


// ---------------------------------------------------------------------
//  DIBUJO: la historia y las instrucciones
// ---------------------------------------------------------------------
function dibujarHistoria(ahora, t) {
  noStroke(); fill(10, 8, 18, 209); rect(0, 0, width, height);
  const resplandor = drawingContext.createRadialGradient(width / 2, height * 0.42, 0, width / 2, height * 0.42, 240);
  resplandor.addColorStop(0, 'rgba(239,190,100,0.10)'); resplandor.addColorStop(1, 'rgba(239,190,100,0)');
  drawingContext.fillStyle = resplandor; rect(0, 0, width, height);

  const seg = (ahora - tHistoria) / 1000;
  textAlign(CENTER, CENTER); textFont('Georgia'); textStyle(ITALIC);
  textSize(min(26, width / 28));
  HISTORIA.forEach((l, i) => {
    const a = constrain((seg - i * 1.1) / 0.9, 0, 1);
    fill(250, 240, 220, 242 * a);
    text(l, width / 2, height * 0.36 + i * 42 + (1 - a) * 8);
  });
  textStyle(NORMAL);
  if (seg > HISTORIA.length * 1.1 + 0.4) {
    textFont('sans-serif'); textSize(14);
    fill(250, 240, 220, 255 * (0.45 + 0.3 * sin(t * 2.5)));
    text('Haz clic para continuar', width / 2, height * 0.36 + HISTORIA.length * 42 + 50);
  }
}

function dibujarInstrucciones(t) {
  noStroke(); fill(10, 8, 18, 184); rect(0, 0, width, height);
  const ancho = min(210, (width - 80) / 3), sep = 22;
  const x0 = (width - (3 * ancho + 2 * sep)) / 2, y0 = height * 0.18, alto = 240;

  for (let i = 0; i < 3; i++) {
    const x = x0 + i * (ancho + sep), cx = x + ancho / 2, cy = y0 + 80;
    fill(30, 24, 44, 230); stroke(239, 190, 100, 90); strokeWeight(1);
    rect(x, y0, ancho, alto, 12);
    noStroke(); fill(239, 190, 100, 204); textFont('sans-serif'); textSize(12); textAlign(CENTER, CENTER);
    text(i + 1, cx, y0 + 20);

    if (i === 0) {          // varita dibujando una estrella
      noFill(); stroke(255, 230, 160, 242); strokeWeight(2);
      const fin = estrellaForma(cx - 8, cy, 34, (t * 0.4) % 1, false);
      dibujarVarita(fin.x, fin.y, 0.7);
    }
    if (i === 1) {          // libro con tinta revuelta
      libroMini(cx, cy + 8, 120, 62);
      noFill(); stroke(38, 24, 16, 217); strokeWeight(1.5);
      bezier(cx - 42, cy + 22, cx - 10, cy - 20, cx + 30, cy + 32, cx - 5, cy + 5);
      bezier(cx - 5, cy + 5, cx - 30, cy - 10, cx + 40, cy - 5, cx + 36, cy + 26);
      noStroke(); fill(38, 24, 16, 128);
      circle(cx - 26, cy + 30, 6); circle(cx + 18, cy - 6, 4.4); circle(cx + 42, cy + 12, 3.2);
      fill(250, 240, 220, 178); textSize(24); text('?', cx + 52, cy - 24);
    }
    if (i === 2) {          // repasar con calma sobre la línea punteada
      noFill(); stroke(200, 180, 255, 128); strokeWeight(1.5);
      drawingContext.setLineDash([3, 4]); estrellaForma(cx - 8, cy, 34, 1, false); drawingContext.setLineDash([]);
      stroke(255, 220, 150, 242); strokeWeight(2);
      const fin = estrellaForma(cx - 8, cy, 34, 0.15 + 0.35 * ((t * 0.15) % 1), false);
      dibujarVarita(fin.x, fin.y, 0.7);
    }

    noStroke(); textAlign(CENTER, TOP);
    fill(250, 240, 220, 242); textSize(15); textStyle(BOLD);
    text(PASOS[i][0], cx, y0 + alto - 58);
    textStyle(NORMAL); fill(250, 240, 220, 166); textSize(13);
    partirTexto(PASOS[i][1], ancho - 24).forEach((l, j) => text(l, cx, y0 + alto - 36 + j * 17));
  }
  textAlign(CENTER, CENTER); textSize(15);
  fill(250, 240, 220, 255 * (0.55 + 0.3 * sin(t * 2.5)));
  text('Haz clic para empezar', width / 2, y0 + alto + 48);
}

function libroMini(cx, cy, w, h) {
  noStroke();
  fill('#3b2618'); rect(cx - w / 2 - 5, cy - h / 2 - 4, w + 10, h + 10, 5);
  fill('#e6d8b8'); rect(cx - w / 2, cy - h / 2, w, h);
  stroke(60, 40, 20, 102); strokeWeight(1);
  line(cx, cy - h / 2, cx, cy + h / 2);
}


// ---------------------------------------------------------------------
//  DIBUJO: la varita (el cursor)
// ---------------------------------------------------------------------
function dibujarVarita(x, y, esc) {
  push();
  translate(x, y); scale(esc); rotate(-0.75);
  noStroke();
  fill('#4a2e1c'); rect(-2.2, 4, 4.4, 62, 2);   // palo
  fill('#2e1b10'); rect(-3, 46, 6, 20, 2);      // mango
  fill(239, 190, 100, 230); rect(-2.4, 44, 4.8, 2);
  pop();
  const brillo = drawingContext.createRadialGradient(x, y, 0, x, y, 12 * esc);
  brillo.addColorStop(0, 'rgba(255,240,190,0.95)'); brillo.addColorStop(1, 'rgba(255,200,90,0)');
  fill(255); noStroke();
  drawingContext.fillStyle = brillo;
  circle(x, y, 24 * esc);
}


// ---------------------------------------------------------------------
//  AYUDANTES
// ---------------------------------------------------------------------
function elegir(lista) { return lista[floor(random(lista.length))]; }

function partirTexto(txt, anchoMax) {
  const palabras = txt.split(' '), lineas = [];
  let linea = '';
  for (const p of palabras) {
    const prueba = linea ? linea + ' ' + p : p;
    if (textWidth(prueba) > anchoMax && linea) { lineas.push(linea); linea = p; }
    else linea = prueba;
  }
  lineas.push(linea);
  return lineas;
}

// Dibuja una estrella de 5 puntas (o solo una fracción, para animarla)
function estrellaForma(cx, cy, r, fraccion, cerrar) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = -HALF_PI + i * PI / 5, rr = i % 2 ? r * 0.45 : r;
    pts.push({ x: cx + cos(a) * rr, y: cy + sin(a) * rr });
  }
  const n = max(1, floor(pts.length * fraccion));
  beginShape();
  for (let i = 0; i < n; i++) vertex(pts[i].x, pts[i].y);
  cerrar ? endShape(CLOSE) : endShape();
  return pts[n - 1];
}

// Las barras del desorden oculto (tecla D)
function dibujarDesorden() {
  textFont('sans-serif'); textSize(11); textAlign(LEFT, CENTER); noStroke();
  partes.forEach((p, k) => {
    const y = 44 + k * 16;
    fill(255, 255, 255, 38); rect(18, y, 90, 6);
    fill('#D85A30'); rect(18, y, 90 * p.desorden, 6);
    fill(255, 255, 255, 153);
    let etiqueta = 'parte ' + (k + 1);
    if (p.adornos.length) etiqueta += ' (adornos)';
    if (p.desorden === 0 && p.aseguradaHasta > intentos) etiqueta += ' (asegurada)';
    text(etiqueta, 116, y + 3);
  });
  fill(255, 255, 255, 153);
  text('meta secreta: ' + meta + ' intentos', 18, 44 + NUM_PARTES * 16 + 8);
}
