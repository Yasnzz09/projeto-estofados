# Texturas de tecido

**Arquivos `<tipo>-cor.jpg` e `<tipo>-relevo.jpg`** (boucle, linho, veludo, suede, couro): trama gerada
por código (`scripts/modelos/tecidos.js`), usada em todos os modelos 3D e nas bolinhas de tecido.
Não apague. Ajustes de brilho/rugosidade de cada tipo ficam em `src/data/tecidos.json`.

Fotos reais de tecido também podem ficar aqui (com outro nome). Elas aparecem na página do produto
e nas bolinhas do seletor "Escolha o tecido"; no AR do Android continua a trama gerada.

## Como preparar a imagem

- **Quadrada, 1024 x 1024 px**, em `.jpg` (qualidade ~85) ou `.webp`. Mantenha abaixo de ~300 KB.
- **Que se repita sem emenda (seamless / tileable):** ao colocar uma cópia ao lado da outra, não pode
  aparecer linha nem degrau. No Photoshop: *Filtro > Outros > Deslocamento* (metade da largura e da
  altura) e corrija a emenda com o carimbo. Ferramentas online de "seamless texture" também servem.
- **Foto de frente, com luz difusa e sem sombras** (luz de janela, dia nublado). Nada de brilho
  estourado nem de dobras: a sombra e o brilho quem faz é o 3D.
- **Cor fiel ao tecido**: fotografe ao lado de um cartão cinza ou branco e corrija o balanço de branco.
- A imagem deve cobrir **cerca de 30 x 30 cm de tecido** (o 3D repete a foto ~3 vezes por metro).

## Como ligar a textura ao produto

Em `src/data/products.json`, no acabamento, adicione o campo `textura`:

```json
{ "id": "linho-areia", "nome": "Linho Areia", "tipo": "Linho", "corHex": "#cbb79a",
  "textura": "/texturas/linho-areia.jpg" }
```

- Com `textura`, a cor vem da foto (o `corHex` continua sendo usado nas bolinhas do catálogo).
- Sem `textura`, vale a trama gerada do tipo (bouclê, linho...), tingida com o `corHex`.
- Se o arquivo não for encontrado, o site volta para a trama gerada.

## Modelos 3D

O tecido é aplicado nos materiais do `.glb` cujo nome contém **"Tecido"** (ou fabric, estofado,
almofada, assento, encosto). Pés, estrutura e metais ficam como estão. Se nenhum material tiver
esse nome, o tecido vai para o primeiro material do modelo. O modelo precisa ter coordenadas de
textura (UV) para a trama aparecer.
