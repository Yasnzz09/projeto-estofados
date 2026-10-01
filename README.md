# Casa Estofados — loja de móveis com 3D e AR (MVP)

Catálogo de móveis com visualização 3D, linhas de medida sobre o modelo, realidade aumentada
("Veja na sua casa"), verificador "Vai caber no seu espaço?" e orçamento pelo WhatsApp.

Stack: React + Vite + TypeScript, Tailwind CSS v4, [`<model-viewer>`](https://modelviewer.dev).

## Rodar

Pré-requisito: [Node.js 20+](https://nodejs.org).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ para publicar
```

## Configuração

`src/config.ts`:

| Campo            | O que é                                                     |
| ---------------- | ----------------------------------------------------------- |
| `whatsappNumero` | Número só com dígitos: 55 + DDD + número (ex. `5511999999999`) |
| `folgaCm`        | Folga somada a cada medida ao verificar se o móvel cabe      |
| `nomeLoja`       | Nome exibido no topo                                         |

## Produtos

Ficam em `src/data/products.json`. Medidas sempre em **centímetros** (L x A x P).

- `fotos`: caminhos em `public/` (ex. `/fotos/sofa-lisboa-1.jpg`)
- `modeloGlb`: modelo para web/Android
- `modeloUsdz`: modelo para iPhone. Se ficar `""`, o model-viewer gera o USDZ
  automaticamente a partir do `.glb` quando o cliente toca em "Veja na sua casa" no iPhone.

### Modelos placeholder

Os `.glb` e as fotos `.svg` atuais são placeholders feitos de caixas, mas **com as medidas reais**
de cada produto. Foram gerados por `scripts/gerar-placeholders.ps1` (`npm run modelos` refaz).

### Regras para os modelos reais

- Exportar em **metros** e em **escala real** (1 unidade = 1 m). O AR usa o tamanho do arquivo.
- Origem no chão (base do móvel em y = 0), frente voltada para +Z.
- As linhas de cota são posicionadas na caixa envolvente do modelo; os números exibidos
  vêm do `products.json`. Se o modelo estiver fora de escala, as linhas ficam certas na tela,
  mas o AR mostra o tamanho errado.
- Mantenha os `.glb` leves (idealmente < 5 MB, texturas 2K, compressão Draco/Meshopt).

## Realidade aumentada

`<model-viewer>` com `ar-modes="webxr scene-viewer quick-look"`, `ar-placement="floor"` e
`ar-scale="fixed"`:

- **Android**: WebXR no Chrome (precisa de HTTPS) ou Scene Viewer (Google). O móvel é colocado
  no chão, fica ancorado no ambiente e não pode ser redimensionado.
- **iPhone**: AR Quick Look com o `.usdz` (ou o gerado automaticamente).
- No computador o botão mostra um aviso para abrir a página no celular.

Para testar no celular é preciso **HTTPS**. O mais simples é publicar (Vercel, Netlify,
Cloudflare Pages) ou usar um túnel (`npx cloudflared tunnel --url http://localhost:5173`).
`public/_redirects` já configura o Netlify/Cloudflare para as rotas do React.

## Estrutura

```
src/
  config.ts                 número do WhatsApp, folga, nome da loja
  data/products.json        produtos
  lib/encaixe.ts            lógica "vai caber?" (+ leitura/escrita na URL)
  lib/whatsapp.ts           link wa.me com mensagem pronta
  components/Visualizador3D.tsx   model-viewer, linhas de cota, painel de medidas, botão AR
  components/FormularioEncaixe.tsx
  pages/Catalogo.tsx        grade, filtro por categoria e por medidas
  pages/PaginaProduto.tsx
```

O filtro de medidas do catálogo usa a URL (`/?largura=180&altura=100&profundidade=90&prioridade=Sofás`),
então "Olhar outras opções" só monta esse link.

## Fora do MVP

Medir o espaço com a câmera, troca de tecido/cor, checkout, login e painel administrativo.
