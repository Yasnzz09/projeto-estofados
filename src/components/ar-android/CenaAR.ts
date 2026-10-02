import {
  Box3,
  CanvasTexture,
  Euler,
  Group,
  HemisphereLight,
  DirectionalLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  REPETICAO_TEXTURA_FOTO,
  REPETICAO_TEXTURA_GERADA,
  RUGOSIDADE,
  ehMaterialDeTecido,
  texturaDeTecido,
} from '../../lib/tecido';
import type { Acabamento } from '../../types';

export type AcabamentoCena = Pick<Acabamento, 'tipo' | 'corHex' | 'textura'>;

export interface PontoTela {
  x: number;
  y: number;
  visivel: boolean;
}

export interface CotaTela {
  a: PontoTela;
  b: PontoTela;
  rotulo: PontoTela;
  texto: string;
}

export interface OpcoesCena {
  alturaCameraM: number;
  distanciaInicialM: number;
  fovCameraGraus: number;
  textosCotas: [string, string, string];
}

const AFASTAMENTO_COTA = 0.04;
const DISTANCIA_MIN = 0.6;
const DISTANCIA_MAX = 12;
/*
 * Giroscópio. Sem ARCore o celular não enxerga o chão, então seguir o sensor faz o
 * móvel "deslizar". Por padrão a cena fica TRAVADA: lemos a inclinação do celular por
 * um instante ao abrir (calibração), e depois o móvel só se mexe pelas setas.
 * O modo "seguir o celular" continua disponível, com suavização leve (sem atraso).
 */
const CALIBRACAO_MS = 600;
const FILTRO_SENSOR = 0.3;
const SUAVIDADE_SEGUIR = 20; // por segundo
/** Limites de altura (m) para Subir / Descer: o suficiente para acertar o chão sem perder o móvel. */
const ALTURA_MIN = -1;
const ALTURA_MAX = 1.5;
/** Inclinação usada quando o celular não tem giroscópio: levemente para baixo, mirando o chão. */
const INCLINACAO_PADRAO = MathUtils.degToRad(-32);

/**
 * Cena three.js do visualizador com câmera (Android).
 * Mundo em metros, chão em y = 0, câmera virtual parada a `alturaCameraM` do chão,
 * girando junto com o celular (DeviceOrientation).
 */
export class CenaAR {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.05, 50);
  private readonly movel = new Group();
  private readonly tamanho = new Vector3();
  private readonly pmrem: PMREMGenerator;
  private readonly ambiente: Texture;
  private modeloCarregado = false;
  private posicionado = false;
  private movidoPeloUsuario = false;
  private temOrientacao = false;
  private calibrandoAte = 0;
  private _seguirCelular = false;
  private ultimoQuadro = 0;
  private sujo = true;
  private raf = 0;
  private largura = 1;
  private altura = 1;
  private _mostrarCotas = false;
  private ultimasCotas: CotaTela[] | null = null;

  // DeviceOrientation -> quaternion (mesma matemática do DeviceOrientationControls do three.js)
  private readonly quatAlvo = new Quaternion();
  private readonly quatBruto = new Quaternion();
  private readonly euler = new Euler();
  private readonly q0 = new Quaternion();
  private readonly q1 = new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
  private readonly eixoZ = new Vector3(0, 0, 1);
  private readonly v = new Vector3();

  private acabamento: AcabamentoCena | null = null;
  private texturaTecido: Texture | null = null;
  private versaoAcabamento = 0;
  private descartada = false;

  aoAtualizarCotas?: (cotas: CotaTela[] | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly opcoes: OpcoesCena,
  ) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = NeutralToneMapping;

    this.pmrem = new PMREMGenerator(this.renderer);
    this.ambiente = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.ambiente;
    this.scene.environmentIntensity = 0.55;

    this.scene.add(new HemisphereLight(0xffffff, 0x8a7a66, 0.35));
    const sol = new DirectionalLight(0xffffff, 0.6);
    sol.position.set(1, 3, 2);
    this.scene.add(sol);

    this.camera.position.set(0, opcoes.alturaCameraM, 0);
    this.camera.quaternion.setFromEuler(new Euler(INCLINACAO_PADRAO, 0, 0, 'YXZ'));
    this.scene.add(this.movel);
  }

  async carregar(url: string): Promise<void> {
    const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    try {
      const gltf = await loader.loadAsync(url);
      const modelo = gltf.scene;
      // Apoia o modelo no chão e centraliza (sem mudar a escala: o arquivo já é em metros).
      const caixa = new Box3().setFromObject(modelo);
      const centro = caixa.getCenter(new Vector3());
      caixa.getSize(this.tamanho);
      modelo.position.set(-centro.x, -caixa.min.y, -centro.z);
      this.movel.add(modelo);
      this.movel.add(this.criarSombra(this.tamanho.x, this.tamanho.z));
      this.modeloCarregado = true;
      if (this.acabamento) void this.aplicarNoModelo();
      this.sujo = true;
    } finally {
      draco.dispose();
    }
  }

  /** Sombra de contato: um gradiente radial suave logo abaixo do móvel. */
  private criarSombra(largura: number, profundidade: number): Mesh {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const sombra = new Mesh(
      new PlaneGeometry(largura * 1.3, profundidade * 1.3),
      new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }),
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.003;
    sombra.renderOrder = -1;
    return sombra;
  }

  /**
   * Ajusta o tamanho do canvas e o campo de visão para casar com o vídeo,
   * que é exibido com object-fit: cover.
   */
  ajustarTamanho(largura: number, altura: number, videoL: number, videoA: number) {
    this.largura = largura;
    this.altura = altura;
    this.renderer.setSize(largura, altura, false);
    this.camera.aspect = largura / altura;

    const tanLadoMaior = Math.tan(MathUtils.degToRad(this.opcoes.fovCameraGraus) / 2);
    let tanVertical: number;
    if (videoL > 0 && videoA > 0) {
      const tanVideo = videoA >= videoL ? tanLadoMaior : (tanLadoMaior * videoA) / videoL;
      const escala = Math.max(largura / videoL, altura / videoA);
      tanVertical = tanVideo * (altura / (videoA * escala));
    } else {
      tanVertical = altura >= largura ? tanLadoMaior : (tanLadoMaior * altura) / largura;
    }
    this.camera.fov = MathUtils.radToDeg(2 * Math.atan(tanVertical));
    this.camera.updateProjectionMatrix();
    this.sujo = true;
  }

  /** Ângulos do evento deviceorientation (graus) + ângulo da tela (graus). */
  definirOrientacao(alpha: number, beta: number, gamma: number, anguloTela: number) {
    const r = MathUtils.degToRad;
    this.euler.set(r(beta), r(alpha), -r(gamma), 'YXZ');
    this.quatBruto
      .setFromEuler(this.euler)
      .multiply(this.q1)
      .multiply(this.q0.setFromAxisAngle(this.eixoZ, -r(anguloTela)));
    if (!this.temOrientacao) {
      this.temOrientacao = true;
      this.quatAlvo.copy(this.quatBruto);
      this.camera.quaternion.copy(this.quatAlvo);
      this.calibrandoAte = performance.now() + CALIBRACAO_MS;
      if (!this.posicionado) this.centralizar();
      this.sujo = true;
      return;
    }
    // Média das leituras: guarda sempre a inclinação atual (usada pelo "Centralizar").
    this.quatAlvo.slerp(this.quatBruto, FILTRO_SENSOR);

    const calibrando = performance.now() < this.calibrandoAte;
    if (calibrando) {
      // Primeiro instante: acerta a inclinação e reposiciona o móvel na frente.
      this.camera.quaternion.copy(this.quatAlvo);
      if (!this.movidoPeloUsuario) this.posicionarNaFrente();
      this.sujo = true;
    }
  }

  /** Liga/desliga o modo em que a cena acompanha o giroscópio. */
  set seguirCelular(valor: boolean) {
    this._seguirCelular = valor;
    // Ao travar de novo, fixa na inclinação atual e traz o móvel para a frente.
    if (!valor && this.temOrientacao) this.centralizar();
    this.sujo = true;
  }

  /** Sem giroscópio: câmera fixa olhando um pouco para baixo. */
  usarOrientacaoPadrao() {
    if (this.temOrientacao) return;
    if (!this.posicionado) this.centralizar();
  }

  /** Direção "para frente" da câmera projetada no chão. */
  private frenteNoChao(): Vector3 {
    const frente = this.v.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    frente.y = 0;
    if (frente.lengthSq() < 0.01) {
      // Celular apontado reto para o chão: usa o "topo" do celular como frente.
      frente.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
      frente.y = 0;
    }
    return frente.normalize();
  }

  /**
   * "Centralizar": usa a inclinação atual do celular e traz o móvel para o meio da tela,
   * na altura do chão. É também o jeito de "recalibrar" a cena travada.
   */
  centralizar() {
    if (this.temOrientacao) this.camera.quaternion.copy(this.quatAlvo);
    this.movel.position.y = 0;
    this.movidoPeloUsuario = false;
    this.posicionarNaFrente();
  }

  /** Coloca o móvel no meio da tela, a `distanciaInicialM`, de frente para a câmera. */
  private posicionarNaFrente() {
    const frente = this.frenteNoChao();
    const d = this.opcoes.distanciaInicialM;
    this.movel.position.set(this.camera.position.x + frente.x * d, this.movel.position.y, this.camera.position.z + frente.z * d);
    this.movel.rotation.y = Math.atan2(-frente.x, -frente.z);
    this.posicionado = true;
    this.sujo = true;
  }

  /** Move o móvel em metros, relativo para onde o celular está virado. */
  mover(paraFrente: number, paraDireita: number) {
    this.movidoPeloUsuario = true;
    const frente = this.frenteNoChao();
    const p = this.movel.position;
    p.x += frente.x * paraFrente - frente.z * paraDireita;
    p.z += frente.z * paraFrente + frente.x * paraDireita;

    const dx = p.x - this.camera.position.x;
    const dz = p.z - this.camera.position.z;
    const dist = Math.hypot(dx, dz);
    const limitada = MathUtils.clamp(dist, DISTANCIA_MIN, DISTANCIA_MAX);
    if (dist > 0 && limitada !== dist) {
      p.x = this.camera.position.x + (dx / dist) * limitada;
      p.z = this.camera.position.z + (dz / dist) * limitada;
    }
    this.sujo = true;
  }

  /** Sobe ou desce o móvel (em metros). Ajuda a "encostar" o móvel no chão. */
  subir(metros: number) {
    this.movidoPeloUsuario = true;
    const p = this.movel.position;
    p.y = MathUtils.clamp(p.y + metros, ALTURA_MIN, ALTURA_MAX);
    this.sujo = true;
  }

  girar(graus: number) {
    this.movidoPeloUsuario = true;
    this.movel.rotation.y += MathUtils.degToRad(graus);
    this.sujo = true;
  }

  set mostrarCotas(valor: boolean) {
    this._mostrarCotas = valor;
    this.sujo = true;
    if (!valor) {
      this.ultimasCotas = null;
      this.aoAtualizarCotas?.(null);
    }
  }

  iniciar() {
    const quadro = (agora: number) => {
      this.raf = requestAnimationFrame(quadro);
      const dt = this.ultimoQuadro ? Math.min((agora - this.ultimoQuadro) / 1000, 0.1) : 1 / 60;
      this.ultimoQuadro = agora;
      if (this.temOrientacao && this._seguirCelular) this.suavizarCamera(dt);
      if (!this.sujo) return;
      this.sujo = false;
      this.renderer.render(this.scene, this.camera);
      if (this._mostrarCotas) this.emitirCotas();
    };
    this.raf = requestAnimationFrame(quadro);
  }

  /** Modo "seguir o celular": acompanha o sensor com suavização leve, sem atraso visível. */
  private suavizarCamera(dt: number) {
    if (this.camera.quaternion.angleTo(this.quatAlvo) < 0.0005) return;
    this.camera.quaternion.slerp(this.quatAlvo, 1 - Math.exp(-SUAVIDADE_SEGUIR * dt));
    this.sujo = true;
  }

  private projetar(x: number, y: number, z: number): PontoTela {
    const v = this.v.set(x, y, z).applyMatrix4(this.movel.matrixWorld).project(this.camera);
    return {
      x: ((v.x + 1) / 2) * this.largura,
      y: ((1 - v.y) / 2) * this.altura,
      visivel: v.z > -1 && v.z < 1,
    };
  }

  /** Mesmas cotas da página do produto: largura na frente, altura e profundidade na lateral direita. */
  private emitirCotas() {
    if (!this.modeloCarregado) return;
    this.movel.updateMatrixWorld();
    const x1 = this.tamanho.x / 2, y1 = this.tamanho.y, z1 = this.tamanho.z / 2;
    const xd = x1 + AFASTAMENTO_COTA;
    const zf = z1 + AFASTAMENTO_COTA;
    const [tl, ta, tp] = this.opcoes.textosCotas;
    const cotas: CotaTela[] = [
      { a: this.projetar(-x1, 0, zf), b: this.projetar(x1, 0, zf), rotulo: this.projetar(0, 0, zf), texto: tl },
      { a: this.projetar(xd, 0, -z1), b: this.projetar(xd, y1, -z1), rotulo: this.projetar(xd, y1 / 2, -z1), texto: ta },
      { a: this.projetar(xd, 0, z1), b: this.projetar(xd, 0, -z1), rotulo: this.projetar(xd, 0, 0), texto: tp },
    ];
    this.ultimasCotas = cotas;
    this.aoAtualizarCotas?.(cotas);
  }

  /** Foto = quadro atual do vídeo (com o mesmo corte da tela) + 3D + cotas visíveis. */
  async foto(video: HTMLVideoElement): Promise<Blob> {
    const gl = this.renderer.domElement;
    const L = gl.width, A = gl.height;
    const escalaTela = L / this.largura;
    const c = document.createElement('canvas');
    c.width = L;
    c.height = A;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, L, A);
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      const s = Math.max(L / video.videoWidth, A / video.videoHeight);
      const dl = video.videoWidth * s, da = video.videoHeight * s;
      ctx.drawImage(video, (L - dl) / 2, (A - da) / 2, dl, da);
    }
    // Renderiza e copia na mesma tarefa, enquanto o buffer do WebGL ainda é válido.
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(gl, 0, 0);
    if (this._mostrarCotas && this.ultimasCotas) this.desenharCotas(ctx, this.ultimasCotas, escalaTela);

    return new Promise((resolve, reject) => {
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a foto'))), 'image/jpeg', 0.9);
    });
  }

  private desenharCotas(ctx: CanvasRenderingContext2D, cotas: CotaTela[], k: number) {
    ctx.save();
    ctx.lineWidth = 2.5 * k;
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([6 * k, 5 * k]);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3 * k;
    for (const c of cotas) {
      if (!c.a.visivel || !c.b.visivel) continue;
      ctx.beginPath();
      ctx.moveTo(c.a.x * k, c.a.y * k);
      ctx.lineTo(c.b.x * k, c.b.y * k);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.font = `700 ${13 * k}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const c of cotas) {
      if (!c.rotulo.visivel) continue;
      const w = ctx.measureText(c.texto).width + 20 * k;
      const h = 26 * k;
      const x = c.rotulo.x * k, y = c.rotulo.y * k;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#232221';
      ctx.fillText(c.texto, x, y + k);
      ctx.shadowBlur = 3 * k;
    }
    ctx.restore();
  }

  /** Troca o tecido do estofado (mesma regra da página do produto). */
  aplicarAcabamento(acabamento: AcabamentoCena | null) {
    this.acabamento = acabamento;
    if (this.modeloCarregado) void this.aplicarNoModelo();
  }

  /** Materiais de tecido pelo nome; se nenhum tiver nome de tecido, o primeiro material do modelo. */
  private materiaisDeTecido(): MeshStandardMaterial[] {
    const todos: MeshStandardMaterial[] = [];
    this.movel.traverse((o: Object3D) => {
      const malha = o as Mesh;
      if (!malha.isMesh) return;
      const materiais = Array.isArray(malha.material) ? malha.material : [malha.material];
      for (const m of materiais) {
        const padrao = m as MeshStandardMaterial;
        if (padrao.isMeshStandardMaterial && !todos.includes(padrao)) todos.push(padrao);
      }
    });
    const deTecido = todos.filter((m) => ehMaterialDeTecido(m.name));
    return deTecido.length > 0 ? deTecido : todos.slice(0, 1);
  }

  private async aplicarNoModelo() {
    const a = this.acabamento;
    if (!a) return;
    const versao = ++this.versaoAcabamento;

    let textura: Texture | null = null;
    let foto = false;
    if (a.textura) {
      try {
        textura = await new TextureLoader().loadAsync(a.textura);
        foto = true;
      } catch {
        // foto do tecido não encontrada: usa a trama gerada
      }
    }
    textura ??= new CanvasTexture(texturaDeTecido(a.tipo));
    if (versao !== this.versaoAcabamento || this.descartada) {
      textura.dispose();
      return;
    }

    const repeticao = foto ? REPETICAO_TEXTURA_FOTO : REPETICAO_TEXTURA_GERADA;
    textura.colorSpace = SRGBColorSpace;
    textura.wrapS = textura.wrapT = RepeatWrapping;
    textura.repeat.set(repeticao, repeticao);
    textura.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());

    for (const m of this.materiaisDeTecido()) {
      if (m.map && m.map !== this.texturaTecido) m.map.dispose();
      m.color.set(foto ? '#ffffff' : a.corHex);
      m.roughness = RUGOSIDADE[a.tipo];
      m.metalness = 0;
      m.map = textura;
      m.needsUpdate = true;
    }
    this.texturaTecido?.dispose();
    this.texturaTecido = textura;
    this.sujo = true;
  }

  /** Libera tudo da GPU. */
  dispose() {
    this.descartada = true;
    cancelAnimationFrame(this.raf);
    this.aoAtualizarCotas = undefined;
    this.scene.traverse((o: Object3D) => {
      const malha = o as Mesh;
      if (!malha.isMesh) return;
      malha.geometry.dispose();
      const materiais: Material[] = Array.isArray(malha.material) ? malha.material : [malha.material];
      for (const m of materiais) {
        for (const valor of Object.values(m as unknown as Record<string, unknown>)) {
          if (valor instanceof Texture) valor.dispose();
        }
        m.dispose();
      }
    });
    this.ambiente.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
