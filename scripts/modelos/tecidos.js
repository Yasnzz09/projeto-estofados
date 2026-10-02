// Texturas de tecido geradas por código (ladrilho que se repete sem emenda).
//
// Cada tipo gera um mapa de ALTURA (o relevo dos fios) e, a partir dele:
// - cor: clara e quase neutra (a cor de verdade vem do baseColor do material), com os vãos
//   entre os fios mais escuros, que é o que faz o tecido parecer tecido de perto;
// - relevo: normal map (fios que pegam luz), calculado da altura.
//
// Escala: o ladrilho tem TAMANHO px e cobre `metrosPorRepeticao` (src/data/tecidos.json), hoje 12,5 cm,
// ou seja ~0,12 mm por pixel. Laçada do bouclê ~3 mm, fio do linho ~1,1 mm, grão do couro ~2 mm.
// Roda no navegador (canvas) na hora de exportar os modelos; as imagens vão para public/texturas.

export const TAMANHO = 1024;

/** Número pseudoaleatório estável em [0, 1). */
function hash(...n) {
  let h = 2166136261;
  for (const v of n) h = Math.imul(h ^ (v | 0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const suave = (t) => t * t * (3 - 2 * t);
const mod = (a, n) => ((a % n) + n) % n;

/** Ruído suave periódico: `celulasX`/`celulasY` células no ladrilho todo (fecha a emenda). */
function ruido(x, y, celulasX, celulasY, semente, N = TAMANHO) {
  const gx = (x / N) * celulasX, gy = (y / N) * celulasY;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const sx = suave(gx - x0), sy = suave(gy - y0);
  const v = (i, j) => hash(mod(i, celulasX), mod(j, celulasY), semente);
  const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * sx;
  const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
}

/** Soma de oitavas (fbm) periódica, resultado ~[0, 1]. */
function fbm(x, y, celulas, oitavas, semente) {
  let soma = 0, peso = 1, total = 0;
  for (let o = 0; o < oitavas; o++) {
    soma += ruido(x, y, celulas << o, celulas << o, semente + o * 101) * peso;
    total += peso;
    peso *= 0.5;
  }
  return soma / total;
}

// ---------------------------------------------------------------------------
// Bouclé: milhares de laçadas (anéis de fio enrolado) sobrepostas, sobre um fundo escuro.

function boucle(N) {
  const altura = new Float32Array(N * N);
  const tom = new Float32Array(N * N).fill(0.96);
  // fundo (trama de base), bem baixo: aparece só nos vãos
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) altura[y * N + x] = 0.2 + 0.15 * fbm(x, y, 64, 2, 7);

  // as laçadas se juntam em "tufinhos": a densidade varia um pouco pelo tecido
  const LACADAS = 6500;
  let k = 0;
  for (let tentativa = 0; k < LACADAS; tentativa++) {
    const cx = hash(tentativa, 1) * N, cy = hash(tentativa, 2) * N;
    const tufo = fbm(cx, cy, 32, 2, 17);
    if (hash(tentativa, 18) > 0.35 + 0.9 * tufo) continue;
    k++;
    const r = 11 + 10 * hash(k, 3); // raio da laçada (px): ~2,7 a 5 mm de diâmetro
    const w = 3.6 + 2.4 * hash(k, 4); // meia-espessura do fio (px): fio de ~1,2 mm
    const achatar = 0.45 + 0.55 * hash(k, 5); // laçada vista meio de lado
    const giro = hash(k, 6) * Math.PI * 2;
    const inicio = hash(k, 7) * Math.PI * 2;
    const abertura = Math.PI * (1.1 + 0.9 * hash(k, 8)); // arco de ~200° a 360°
    const topo = (0.5 + 0.5 * hash(k, 9)) * (0.75 + 0.35 * tufo); // altura da laçada
    const fase = hash(k, 10) * Math.PI * 2;
    const f = hash(k, 11);
    const tomLacada = f < 0.02 ? 0.9 : f > 0.98 ? 1.05 : 0.975 + 0.05 * hash(k, 12); // alguns fios mesclados
    const cos = Math.cos(giro), sen = Math.sin(giro);
    const alcance = Math.ceil(r + w + 1);
    for (let dy = -alcance; dy <= alcance; dy++) {
      for (let dx = -alcance; dx <= alcance; dx++) {
        const px = Math.floor(cx) + dx, py = Math.floor(cy) + dy;
        const lx = px + 0.5 - cx, ly = py + 0.5 - cy;
        const ux = lx * cos + ly * sen, uy = (-lx * sen + ly * cos) / achatar;
        const rho = Math.hypot(ux, uy);
        const d = Math.abs(rho - r) * (0.7 + 0.3 * achatar);
        if (d >= w) continue;
        let ang = Math.atan2(uy, ux) - inicio;
        ang = mod(ang, Math.PI * 2);
        if (ang > abertura) continue;
        // pontas do arco afinam (o fio entra no tecido)
        const ponta = Math.min(1, ang / 0.6, (abertura - ang) / 0.6);
        const perfil = Math.sqrt(1 - (d / w) * (d / w)) * Math.sqrt(Math.max(0, ponta));
        if (perfil <= 0) continue;
        const centro = topo * (0.8 + 0.2 * Math.sin(ang + fase)) * (0.5 + 0.5 * ponta);
        // fio torcido: listrinhas finas ao longo do fio
        const torcao = 0.5 + 0.5 * Math.sin(ang * r * 0.55 + d * 0.9);
        const h = centro - 0.3 + 0.3 * perfil + 0.025 * torcao;
        const i = mod(py, N) * N + mod(px, N);
        if (h > altura[i]) {
          altura[i] = h;
          tom[i] = tomLacada * (0.985 + 0.03 * torcao);
        }
      }
    }
  }
  // tufos maiores (5 a 15 mm): o "encaroçado" que se vê de longe
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) altura[y * N + x] += 0.22 * (fbm(x, y, 12, 3, 19) - 0.5);
  return { altura, tom, contraste: 0.16, forca: 6 };
}

// ---------------------------------------------------------------------------
// Linho: tela (um por cima, um por baixo), fio ~1,1 mm com engrossamentos (slub) e tom mesclado.

function linho(N) {
  const altura = new Float32Array(N * N);
  const tom = new Float32Array(N * N);
  const FIOS = 112;
  const passo = N / FIOS;
  // espessura de um fio ao longo do comprimento (slub: trechos mais grossos e mais claros)
  const slub = (fio, t, semente) => {
    const s = ruido(t, fio * 7.3, 24, FIOS, semente);
    return Math.pow(Math.max(0, (s - 0.55) / 0.45), 2);
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const gx = x / passo, gy = y / passo;
      const i = Math.floor(gx), j = Math.floor(gy);
      const u = gx - i - 0.5, v = gy - j - 0.5;
      // urdume (vertical): coluna i, sobe e desce a cada linha
      const sU = slub(i, y, 3);
      const larguraU = 0.44 + 0.1 * sU + 0.04 * hash(i, 31);
      const pU = Math.abs(u) < larguraU ? Math.sqrt(1 - (u / larguraU) ** 2) : 0;
      const ondaU = Math.cos(Math.PI * (gy - 0.5 + i)); // +1 por cima, -1 por baixo
      const hU = pU > 0 ? 0.5 + 0.22 * ondaU + 0.3 * pU + 0.1 * sU : -1;
      // trama (horizontal): linha j
      const sT = slub(j, x, 5);
      const larguraT = 0.44 + 0.1 * sT + 0.04 * hash(j, 37);
      const pT = Math.abs(v) < larguraT ? Math.sqrt(1 - (v / larguraT) ** 2) : 0;
      const ondaT = -Math.cos(Math.PI * (gx - 0.5 + j));
      const hT = pT > 0 ? 0.5 + 0.22 * ondaT + 0.3 * pT + 0.1 * sT : -1;
      const fibra = 0.03 * (ruido(x, y, 512, 64, 41) - 0.5) + 0.03 * (ruido(x, y, 64, 512, 43) - 0.5);
      const k = y * N + x;
      if (hU < 0 && hT < 0) {
        altura[k] = 0.1;
        tom[k] = 0.92;
      } else if (hU >= hT) {
        altura[k] = hU + fibra;
        tom[k] = (0.94 + 0.08 * hash(i, 51) + 0.04 * ruido(x, y, 8, 64, 55) + 0.06 * sU) * (1 + fibra);
      } else {
        altura[k] = hT + fibra;
        tom[k] = (0.94 + 0.08 * hash(j, 53) + 0.04 * ruido(x, y, 64, 8, 57) + 0.06 * sT) * (1 + fibra);
      }
    }
  }
  return { altura, tom, contraste: 0.22, forca: 2.6 };
}

// ---------------------------------------------------------------------------
// Veludo: pelo curtinho e uniforme (quem dá o ar de veludo é o brilho "sheen" do material),
// com marcas bem leves do pelo deitado.

function veludo(N) {
  const altura = new Float32Array(N * N);
  const tom = new Float32Array(N * N);
  const inclinacao = new Float32Array(N * N * 2);
  // pontinhas do pelo: granulado fino e uniforme (média 3x3 de ruído = "pelinho" macio)
  const ponta = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) ponta[k] = hash(k % N, (k / N) | 0, 61);
  const pelo = (x, y) => {
    let soma = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) soma += ponta[mod(y + b, N) * N + mod(x + a, N)];
    return soma / 9;
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // direção do pelo deitado: muda aos poucos, em manchinhas de 1 a 2 cm (amassado de uso)
      const wx = x + 40 * (ruido(x, y, 8, 8, 62) - 0.5), wy = y + 40 * (ruido(x, y, 8, 8, 64) - 0.5);
      const ang = Math.PI / 2 + (fbm(wx, wy, 10, 2, 63) - 0.5) * Math.PI * 1.4;
      const deitado = 0.1 + 0.1 * fbm(x, y, 16, 2, 65);
      // riscos finos ao longo do pelo (pelo penteado)
      const risco = ruido(x, y, 512, 24, 67) - 0.5;
      const k = y * N + x;
      const p = pelo(x, y);
      inclinacao[k * 2] = Math.cos(ang) * deitado;
      inclinacao[k * 2 + 1] = Math.sin(ang) * deitado;
      altura[k] = 0.5 + 0.6 * (p - 0.5) + 0.25 * risco;
      // pelo virado para um lado reflete mais: o tom varia de leve com a direção
      tom[k] = 0.96 + 0.025 * Math.cos(ang - Math.PI / 2) + 0.05 * (p - 0.5) + 0.02 * risco;
    }
  }
  return { altura, tom, contraste: 0.06, forca: 2.4, inclinacao };
}

// ---------------------------------------------------------------------------
// Suede: camurça. Microfibra curtinha penteada numa direção, com "marcas de dedo"
// (faixas onde a fibra foi escovada ao contrário, mais claras ou mais escuras) e leve mesclado.

function suede(N) {
  const altura = new Float32Array(N * N);
  const tom = new Float32Array(N * N);
  const inclinacao = new Float32Array(N * N * 2);
  // direção da fibra em cada ponto: para baixo, invertida nas marcas escovadas
  const sentido = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const wx = x + 40 * (ruido(x, y, 12, 12, 72) - 0.5), wy = y + 30 * (ruido(x, y, 12, 12, 74) - 0.5);
      const marca = ruido(wx, wy, 8, 24, 76) * 0.7 + ruido(wx, wy, 16, 48, 78) * 0.3; // faixas alongadas de ~1 cm
      sentido[y * N + x] = Math.max(-1, Math.min(1, (marca - 0.5) * 3.5)); // -1 ... 1 com transição suave
    }
  }
  for (let k = 0; k < N * N; k++) altura[k] = 0.3 + 0.1 * hash(k, 70);
  // fibrinhas: traços curtos seguindo a direção (e a sujeira de tom de cada fibra)
  const FIBRAS = 70000;
  for (let f = 0; f < FIBRAS; f++) {
    const cx = hash(f, 1, 79) * N, cy = hash(f, 2, 79) * N;
    const s = sentido[mod(Math.floor(cy), N) * N + mod(Math.floor(cx), N)];
    const ang = Math.PI / 2 + (s < 0 ? Math.PI : 0) + (hash(f, 3, 79) - 0.5) * 1.1;
    const comp = 5 + 9 * hash(f, 4, 79);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const alto = 0.55 + 0.45 * hash(f, 5, 79);
    for (let t = 0; t <= comp; t += 0.7) {
      const px = Math.floor(cx + dx * t), py = Math.floor(cy + dy * t);
      const i = mod(py, N) * N + mod(px, N);
      const h = alto * (0.6 + 0.4 * (t / comp)); // a ponta da fibra fica mais alta
      if (h > altura[i]) altura[i] = h;
    }
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = y * N + x;
      const s = sentido[k];
      const mescla = fbm(x, y, 16, 3, 75);
      inclinacao[k * 2] = 0;
      inclinacao[k * 2 + 1] = 0.08 * s;
      tom[k] = 0.96 + 0.02 * s + 0.04 * (mescla - 0.5);
    }
  }
  return { altura, tom, contraste: 0.12, forca: 1.8, inclinacao };
}

// ---------------------------------------------------------------------------
// Couro: grão (células irregulares com vincos entre elas) + poros + manchado natural.

function couro(N) {
  const altura = new Float32Array(N * N);
  const tom = new Float32Array(N * N);
  const G = 96; // células no ladrilho (~1,3 mm)
  const passo = N / G;
  const ponto = (i, j) => {
    const a = mod(i, G), b = mod(j, G);
    return [(i + 0.15 + 0.7 * hash(a, b, 81)) * passo, (j + 0.15 + 0.7 * hash(a, b, 83)) * passo];
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // distorce um pouco para as células não ficarem "certinhas"
      const qx = x + 7 * (ruido(x, y, 32, 32, 85) - 0.5), qy = y + 7 * (ruido(x, y, 32, 32, 87) - 0.5);
      const ci = Math.floor(qx / passo), cj = Math.floor(qy / passo);
      let f1 = 1e9, f2 = 1e9;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const [px, py] = ponto(ci + a, cj + b);
        const d = Math.hypot(qx - px, qy - py);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
      const vinco = suave(Math.min(1, (f2 - f1) / (passo * 0.5)));
      const domo = 1 - Math.min(1, f1 / passo) * 0.35;
      const poro = hash(x >> 1, y >> 1, 89) > 0.998 ? 0.55 : 1;
      const mancha = fbm(x, y, 4, 3, 91);
      const k = y * N + x;
      altura[k] = (0.3 + 0.5 * vinco * domo + 0.05 * hash(x, y, 93)) * (poro < 1 ? 0.75 : 1);
      tom[k] = (0.95 + 0.1 * (mancha - 0.5)) * (poro < 1 ? 0.92 : 1);
    }
  }
  return { altura, tom, contraste: 0.1, forca: 1.6 };
}

const GERADORES = { Bouclé: boucle, Linho: linho, Veludo: veludo, Suede: suede, Couro: couro };

/**
 * Gera cor (RGBA, cinza claro) e relevo (normal map RGBA, convenção glTF) de um tipo de tecido.
 * A cor é normalizada para média ~0,9: o tom final fica perto do corHex cadastrado.
 */
export function gerarTecido(tipo, N = TAMANHO) {
  const { altura, tom, contraste, forca, inclinacao } = GERADORES[tipo](N);
  let min = Infinity, max = -Infinity;
  for (const h of altura) { if (h < min) min = h; if (h > max) max = h; }
  const faixa = max - min || 1;

  const valores = new Float32Array(N * N);
  let soma = 0;
  for (let k = 0; k < N * N; k++) {
    const h = (altura[k] - min) / faixa;
    // vãos (altura baixa) ficam mais escuros: sombra entre os fios
    valores[k] = tom[k] * (1 - contraste + contraste * Math.pow(h, 0.7));
    soma += valores[k];
  }
  const ajuste = 0.9 / (soma / (N * N));
  const cor = new Uint8ClampedArray(N * N * 4);
  for (let k = 0; k < N * N; k++) {
    const v = Math.min(1, valores[k] * ajuste);
    // leve calor no claro (fio cru), quase imperceptível
    cor[k * 4] = Math.round(v * 255);
    cor[k * 4 + 1] = Math.round(v * 253);
    cor[k * 4 + 2] = Math.round(v * 250);
    cor[k * 4 + 3] = 255;
  }

  const relevo = new Uint8ClampedArray(N * N * 4);
  const H = (x, y) => (altura[mod(y, N) * N + mod(x, N)] - min) / faixa;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Sobel
      const gx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
      const gy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
      let nx = -gx * forca / 4, ny = gy * forca / 4, nz = 1;
      // pelo/fibra deitada numa direção (veludo, suede): a luz pega diferente em cada mancha
      if (inclinacao) { nx += inclinacao[(y * N + x) * 2]; ny += inclinacao[(y * N + x) * 2 + 1]; }
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const k = (y * N + x) * 4;
      relevo[k] = Math.round((nx * 0.5 + 0.5) * 255);
      relevo[k + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      relevo[k + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      relevo[k + 3] = 255;
    }
  }
  return { cor, relevo, N };
}
