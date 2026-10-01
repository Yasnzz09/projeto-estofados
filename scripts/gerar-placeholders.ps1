# Gera os modelos 3D (.glb) e as fotos (.svg) PLACEHOLDER dos produtos de exemplo.
#
# Os modelos são feitos de caixas simples, mas com as MEDIDAS REAIS de cada produto
# (1 unidade = 1 metro, como manda o padrão glTF). Assim o AR mostra o móvel em
# tamanho real e as linhas de cota batem com o products.json.
#
# Uso (na raiz do projeto):
#   powershell -ExecutionPolicy Bypass -File scripts/gerar-placeholders.ps1
#
# Quando os modelos reais ficarem prontos, basta substituir os arquivos em
# public/modelos/ (mesmo nome) ou trocar os caminhos no products.json.

$ErrorActionPreference = 'Stop'
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$raiz = Split-Path -Parent $PSScriptRoot
$dirModelos = Join-Path $raiz 'public/modelos'
$dirFotos = Join-Path $raiz 'public/fotos'
New-Item -ItemType Directory -Force $dirModelos, $dirFotos | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)

# ---------------------------------------------------------------- cores

function Hex-ParaRgb([string]$hex) {
  $h = $hex.TrimStart('#')
  return @(
    ([Convert]::ToInt32($h.Substring(0, 2), 16) / 255.0),
    ([Convert]::ToInt32($h.Substring(2, 2), 16) / 255.0),
    ([Convert]::ToInt32($h.Substring(4, 2), 16) / 255.0)
  )
}

function Srgb-ParaLinear([double]$c) {
  if ($c -le 0.04045) { return $c / 12.92 }
  return [Math]::Pow(($c + 0.055) / 1.055, 2.4)
}

function Tom([string]$hex, [double]$fator) {
  # fator > 1 clareia, < 1 escurece
  $rgb = Hex-ParaRgb $hex
  $partes = foreach ($c in $rgb) {
    $v = if ($fator -ge 1) { $c + (1 - $c) * ($fator - 1) } else { $c * $fator }
    '{0:x2}' -f [int][Math]::Round([Math]::Min(1.0, [Math]::Max(0.0, [double]$v)) * 255.0)
  }
  return '#' + ($partes -join '')
}

# ---------------------------------------------------------------- cena

function Nova-Cena {
  $script:materiais = New-Object System.Collections.ArrayList
  $script:caixas = New-Object System.Collections.ArrayList
}

function Material([string]$nome, [string]$hex, [double]$metal, [double]$rugosidade) {
  $rgb = Hex-ParaRgb $hex
  [void]$script:materiais.Add([ordered]@{
      name                 = $nome
      pbrMetallicRoughness = [ordered]@{
        baseColorFactor = @((Srgb-ParaLinear $rgb[0]), (Srgb-ParaLinear $rgb[1]), (Srgb-ParaLinear $rgb[2]), 1.0)
        metallicFactor  = $metal
        roughnessFactor = $rugosidade
      }
    })
  return $script:materiais.Count - 1
}

function Caixa([int]$m, [double]$x0, [double]$y0, [double]$z0, [double]$x1, [double]$y1, [double]$z1) {
  [void]$script:caixas.Add(@{ m = $m; x0 = $x0; y0 = $y0; z0 = $z0; x1 = $x1; y1 = $y1; z1 = $z1 })
}

function Adicionar-Faces($c, $pos, $nor, $uv, $idx) {
  $x0 = $c.x0; $y0 = $c.y0; $z0 = $c.z0; $x1 = $c.x1; $y1 = $c.y1; $z1 = $c.z1
  # vértices de cada face em ordem anti-horária vista de fora
  $faces = @(
    # uv: projeção da face em metros (a textura de tecido se repete em tamanho real)
    @{ n = @(1, 0, 0); v = @(@($x1, $y0, $z1), @($x1, $y0, $z0), @($x1, $y1, $z0), @($x1, $y1, $z1)) },
    @{ n = @(-1, 0, 0); v = @(@($x0, $y0, $z0), @($x0, $y0, $z1), @($x0, $y1, $z1), @($x0, $y1, $z0)) },
    @{ n = @(0, 1, 0); v = @(@($x0, $y1, $z1), @($x1, $y1, $z1), @($x1, $y1, $z0), @($x0, $y1, $z0)) },
    @{ n = @(0, -1, 0); v = @(@($x0, $y0, $z0), @($x1, $y0, $z0), @($x1, $y0, $z1), @($x0, $y0, $z1)) },
    @{ n = @(0, 0, 1); v = @(@($x0, $y0, $z1), @($x1, $y0, $z1), @($x1, $y1, $z1), @($x0, $y1, $z1)) },
    @{ n = @(0, 0, -1); v = @(@($x1, $y0, $z0), @($x0, $y0, $z0), @($x0, $y1, $z0), @($x1, $y1, $z0)) }
  )
  foreach ($f in $faces) {
    $base = [int]($pos.Count / 3)
    foreach ($v in $f.v) {
      $pos.Add([float]$v[0]); $pos.Add([float]$v[1]); $pos.Add([float]$v[2])
      $nor.Add([float]$f.n[0]); $nor.Add([float]$f.n[1]); $nor.Add([float]$f.n[2])
      if ($f.n[0] -ne 0) { $uv.Add([float]$v[2]); $uv.Add([float](-$v[1])) }
      elseif ($f.n[1] -ne 0) { $uv.Add([float]$v[0]); $uv.Add([float]$v[2]) }
      else { $uv.Add([float]$v[0]); $uv.Add([float](-$v[1])) }
    }
    foreach ($i in @(0, 1, 2, 0, 2, 3)) { $idx.Add([uint32]($base + $i)) }
  }
}

function Salvar-Glb([string]$arquivo, [string]$nome) {
  $bin = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter($bin)
  $accessors = New-Object System.Collections.ArrayList
  $views = New-Object System.Collections.ArrayList
  $primitivas = New-Object System.Collections.ArrayList

  for ($m = 0; $m -lt $script:materiais.Count; $m++) {
    $doMaterial = @($script:caixas | Where-Object { $_.m -eq $m })
    if ($doMaterial.Count -eq 0) { continue }
    $pos = New-Object 'System.Collections.Generic.List[float]'
    $nor = New-Object 'System.Collections.Generic.List[float]'
    $uv = New-Object 'System.Collections.Generic.List[float]'
    $idx = New-Object 'System.Collections.Generic.List[uint32]'
    foreach ($c in $doMaterial) { Adicionar-Faces $c $pos $nor $uv $idx }

    $min = @([double]::MaxValue, [double]::MaxValue, [double]::MaxValue)
    $max = @([double]::MinValue, [double]::MinValue, [double]::MinValue)
    for ($i = 0; $i -lt $pos.Count; $i++) {
      $k = $i % 3
      if ($pos[$i] -lt $min[$k]) { $min[$k] = [double]$pos[$i] }
      if ($pos[$i] -gt $max[$k]) { $max[$k] = [double]$pos[$i] }
    }

    $inicio = $bin.Position
    foreach ($v in $pos) { $bw.Write([float]$v) }
    [void]$views.Add([ordered]@{ buffer = 0; byteOffset = [int]$inicio; byteLength = [int]($bin.Position - $inicio); target = 34962 })
    [void]$accessors.Add([ordered]@{ bufferView = $views.Count - 1; componentType = 5126; count = [int]($pos.Count / 3); type = 'VEC3'; min = $min; max = $max })
    $aPos = $accessors.Count - 1

    $inicio = $bin.Position
    foreach ($v in $nor) { $bw.Write([float]$v) }
    [void]$views.Add([ordered]@{ buffer = 0; byteOffset = [int]$inicio; byteLength = [int]($bin.Position - $inicio); target = 34962 })
    [void]$accessors.Add([ordered]@{ bufferView = $views.Count - 1; componentType = 5126; count = [int]($nor.Count / 3); type = 'VEC3' })
    $aNor = $accessors.Count - 1

    $inicio = $bin.Position
    foreach ($v in $uv) { $bw.Write([float]$v) }
    [void]$views.Add([ordered]@{ buffer = 0; byteOffset = [int]$inicio; byteLength = [int]($bin.Position - $inicio); target = 34962 })
    [void]$accessors.Add([ordered]@{ bufferView = $views.Count - 1; componentType = 5126; count = [int]($uv.Count / 2); type = 'VEC2' })
    $aUv = $accessors.Count - 1

    $inicio = $bin.Position
    foreach ($v in $idx) { $bw.Write([uint32]$v) }
    [void]$views.Add([ordered]@{ buffer = 0; byteOffset = [int]$inicio; byteLength = [int]($bin.Position - $inicio); target = 34963 })
    [void]$accessors.Add([ordered]@{ bufferView = $views.Count - 1; componentType = 5125; count = $idx.Count; type = 'SCALAR' })
    $aIdx = $accessors.Count - 1

    [void]$primitivas.Add([ordered]@{ attributes = [ordered]@{ POSITION = $aPos; NORMAL = $aNor; TEXCOORD_0 = $aUv }; indices = $aIdx; material = $m })
  }
  $bw.Flush()
  while ($bin.Length % 4 -ne 0) { $bin.WriteByte(0) }
  $binBytes = $bin.ToArray()

  $gltf = [ordered]@{
    asset       = [ordered]@{ version = '2.0'; generator = 'gerar-placeholders.ps1' }
    scene       = 0
    scenes      = @([ordered]@{ nodes = @(0) })
    nodes       = @([ordered]@{ name = $nome; mesh = 0 })
    meshes      = @([ordered]@{ name = $nome; primitives = $primitivas.ToArray() })
    materials   = $script:materiais.ToArray()
    accessors   = $accessors.ToArray()
    bufferViews = $views.ToArray()
    buffers     = @([ordered]@{ byteLength = $binBytes.Length })
  }
  $json = $gltf | ConvertTo-Json -Depth 20 -Compress
  $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $pad = (4 - ($jsonBytes.Length % 4)) % 4
  if ($pad -gt 0) { $jsonBytes = [byte[]]($jsonBytes + (@([byte]0x20) * $pad)) }

  $out = New-Object System.IO.MemoryStream
  $w = New-Object System.IO.BinaryWriter($out)
  $w.Write([uint32]0x46546C67)  # 'glTF'
  $w.Write([uint32]2)
  $w.Write([uint32](12 + 8 + $jsonBytes.Length + 8 + $binBytes.Length))
  $w.Write([uint32]$jsonBytes.Length); $w.Write([uint32]0x4E4F534A); $w.Write($jsonBytes)
  $w.Write([uint32]$binBytes.Length); $w.Write([uint32]0x004E4942); $w.Write($binBytes)
  $w.Flush()
  [System.IO.File]::WriteAllBytes((Join-Path $dirModelos $arquivo), $out.ToArray())
  Write-Host "modelo: public/modelos/$arquivo"
}

# ---------------------------------------------------------------- móveis
# Origem no chão, centro do móvel. Frente voltada para +Z. Medidas em metros.

function Montar-Estofado([double]$w, [double]$h, [double]$d, [int]$lugares, [string]$hexTecido, [string]$hexPe) {
  Nova-Cena
  $tec = Material 'Tecido' $hexTecido 0 0.95
  $alm = Material 'Tecido_Almofada' (Tom $hexTecido 1.08) 0 1
  $pe = Material 'Pes' $hexPe 0 0.55

  $x0 = - $w / 2; $x1 = $w / 2; $z0 = - $d / 2; $z1 = $d / 2
  $hPe = 0.08
  $topoBase = 0.38
  $lBraco = [Math]::Min(0.18, $w * 0.15)
  $hBraco = [Math]::Min($h * 0.68, 0.64)
  $pEncosto = [Math]::Min(0.22, $d * 0.27)

  $p = 0.05
  foreach ($px in @(($x0 + 0.04), ($x1 - 0.04 - $p))) {
    foreach ($pz in @(($z0 + 0.04), ($z1 - 0.04 - $p))) { Caixa $pe $px 0 $pz ($px + $p) $hPe ($pz + $p) }
  }
  Caixa $tec ($x0 + $lBraco) $hPe $z0 ($x1 - $lBraco) $topoBase $z1
  Caixa $tec $x0 $hPe $z0 ($x0 + $lBraco) $hBraco $z1
  Caixa $tec ($x1 - $lBraco) $hPe $z0 $x1 $hBraco $z1
  Caixa $tec ($x0 + $lBraco) $topoBase $z0 ($x1 - $lBraco) $h ($z0 + $pEncosto)

  $vao = $w - 2 * $lBraco
  $lAlm = $vao / $lugares
  for ($i = 0; $i -lt $lugares; $i++) {
    $a = $x0 + $lBraco + $i * $lAlm + 0.008
    $b = $x0 + $lBraco + ($i + 1) * $lAlm - 0.008
    Caixa $alm $a $topoBase ($z0 + $pEncosto) $b ($topoBase + 0.12) ($z1 - 0.01)
    Caixa $alm $a ($topoBase + 0.12) ($z0 + $pEncosto) $b ($h - 0.07) ($z0 + $pEncosto + 0.14)
  }
}

function Montar-Geladeira([double]$w, [double]$h, [double]$d, [string]$hexInox) {
  Nova-Cena
  $inox = Material 'inox' $hexInox 0.85 0.35
  $porta = Material 'porta' (Tom $hexInox 1.05) 0.8 0.3
  $escuro = Material 'puxador' '#3a3a3a' 0.6 0.4

  $x0 = - $w / 2; $x1 = $w / 2; $z0 = - $d / 2; $z1 = $d / 2
  $zPorta = $z1 - 0.07; $zPux = $z1 - 0.025
  $hDiv = $h * 0.70

  Caixa $inox $x0 0 $z0 $x1 $h $zPorta
  Caixa $escuro ($x0 + 0.03) 0.01 $zPorta ($x1 - 0.03) 0.08 ($zPorta + 0.02)
  Caixa $porta ($x0 + 0.005) ($hDiv + 0.006) $zPorta ($x1 - 0.005) ($h - 0.01) $zPux
  Caixa $porta ($x0 + 0.005) 0.09 $zPorta ($x1 - 0.005) ($hDiv - 0.006) $zPux
  Caixa $escuro ($x0 + 0.05) ($hDiv + 0.04) $zPux ($x0 + 0.075) ($hDiv + 0.30) $z1
  Caixa $escuro ($x0 + 0.05) ($hDiv - 0.50) $zPux ($x0 + 0.075) ($hDiv - 0.05) $z1
}

function Montar-Fogao([double]$w, [double]$h, [double]$d, [string]$hexInox) {
  Nova-Cena
  $inox = Material 'inox' $hexInox 0.85 0.35
  $vidro = Material 'vidro' '#1d1d1f' 0.1 0.08
  $ferro = Material 'ferro' '#2a2a2a' 0.5 0.6

  $x0 = - $w / 2; $x1 = $w / 2; $z0 = - $d / 2; $z1 = $d / 2
  $zFrente = $z1 - 0.03
  $yMesa = $h - 0.045

  foreach ($px in @(($x0 + 0.03), ($x1 - 0.07))) {
    foreach ($pz in @(($z0 + 0.03), ($zFrente - 0.07))) { Caixa $ferro $px 0 $pz ($px + 0.04) 0.04 ($pz + 0.04) }
  }
  Caixa $inox $x0 0.04 $z0 $x1 ($yMesa - 0.01) $zFrente
  Caixa $vidro $x0 ($yMesa - 0.01) $z0 $x1 $yMesa $zFrente
  # porta do forno, puxador e botões
  Caixa $vidro ($x0 + 0.05) 0.12 $zFrente ($x1 - 0.05) ($yMesa - 0.20) ($zFrente + 0.012)
  Caixa $inox ($x0 + 0.08) ($yMesa - 0.17) $zFrente ($x1 - 0.08) ($yMesa - 0.15) $z1
  for ($i = 0; $i -lt 5; $i++) {
    $cx = $x0 + 0.12 + $i * (($w - 0.24) / 4)
    Caixa $ferro ($cx - 0.018) ($yMesa - 0.10) $zFrente ($cx + 0.018) ($yMesa - 0.064) $z1
  }
  # queimadores (2 atrás, 1 centro, 2 na frente) e grades
  $queimadores = @(@(-0.22, -0.18), @(0.22, -0.18), @(0, 0), @(-0.22, 0.16), @(0.22, 0.16))
  foreach ($q in $queimadores) {
    $qx = $q[0] * $w / 0.77; $qz = $q[1] * $d / 0.66 - 0.015
    Caixa $ferro ($qx - 0.045) $yMesa ($qz - 0.045) ($qx + 0.045) ($yMesa + 0.02) ($qz + 0.045)
  }
  $g = 0.012
  foreach ($gz in @(($z0 + 0.04), (($z0 + $zFrente) / 2), ($zFrente - 0.04))) {
    Caixa $ferro ($x0 + 0.03) ($h - $g) ($gz - $g / 2) ($x1 - 0.03) $h ($gz + $g / 2)
  }
  foreach ($gx in @(($x0 + 0.03), 0, ($x1 - 0.03))) {
    Caixa $ferro ($gx - $g / 2) ($h - $g) ($z0 + 0.04) ($gx + $g / 2) $h ($zFrente - 0.04)
  }
  foreach ($pc in @(@(($x0 + 0.03), ($z0 + 0.04)), @(($x1 - 0.03), ($z0 + 0.04)), @(($x0 + 0.03), ($zFrente - 0.04)), @(($x1 - 0.03), ($zFrente - 0.04)))) {
    Caixa $ferro ($pc[0] - $g / 2) $yMesa ($pc[1] - $g / 2) ($pc[0] + $g / 2) ($h - $g) ($pc[1] + $g / 2)
  }
}

# ---------------------------------------------------------------- fotos (SVG)

function Svg-Desenho([string]$tipo, [string]$cor) {
  $claro = Tom $cor 1.12; $escuro = Tom $cor 0.82
  switch ($tipo) {
    'sofa' {
      return @"
<ellipse cx="200" cy="236" rx="160" ry="10" fill="#000" opacity=".08"/>
<rect x="72" y="92" width="256" height="92" rx="20" fill="$escuro"/>
<rect x="88" y="104" width="110" height="70" rx="14" fill="$claro"/>
<rect x="202" y="104" width="110" height="70" rx="14" fill="$claro"/>
<rect x="74" y="168" width="252" height="58" rx="10" fill="$cor"/>
<rect x="84" y="160" width="114" height="30" rx="10" fill="$claro"/>
<rect x="202" y="160" width="114" height="30" rx="10" fill="$claro"/>
<rect x="50" y="136" width="44" height="92" rx="16" fill="$cor"/>
<rect x="306" y="136" width="44" height="92" rx="16" fill="$cor"/>
<rect x="62" y="226" width="9" height="12" rx="2" fill="#5b4636"/>
<rect x="329" y="226" width="9" height="12" rx="2" fill="#5b4636"/>
"@
    }
    'poltrona' {
      return @"
<ellipse cx="200" cy="238" rx="100" ry="9" fill="#000" opacity=".08"/>
<rect x="132" y="56" width="136" height="130" rx="34" fill="$escuro"/>
<rect x="146" y="72" width="108" height="100" rx="24" fill="$claro"/>
<rect x="134" y="168" width="132" height="58" rx="12" fill="$cor"/>
<rect x="144" y="160" width="112" height="30" rx="10" fill="$claro"/>
<rect x="112" y="132" width="36" height="96" rx="16" fill="$cor"/>
<rect x="252" y="132" width="36" height="96" rx="16" fill="$cor"/>
<rect x="124" y="226" width="8" height="14" rx="2" fill="#5b4636"/>
<rect x="268" y="226" width="8" height="14" rx="2" fill="#5b4636"/>
"@
    }
    'geladeira' {
      return @"
<ellipse cx="200" cy="262" rx="70" ry="7" fill="#000" opacity=".08"/>
<rect x="145" y="22" width="110" height="238" rx="10" fill="$escuro"/>
<rect x="148" y="25" width="104" height="66" rx="8" fill="$claro"/>
<rect x="148" y="95" width="104" height="155" rx="8" fill="$claro"/>
<rect x="158" y="38" width="6" height="40" rx="3" fill="#3a3a3a"/>
<rect x="158" y="104" width="6" height="70" rx="3" fill="#3a3a3a"/>
<rect x="152" y="252" width="96" height="6" rx="2" fill="#3a3a3a"/>
"@
    }
    'fogao' {
      return @"
<ellipse cx="200" cy="250" rx="100" ry="8" fill="#000" opacity=".08"/>
<rect x="122" y="70" width="156" height="12" rx="2" fill="#1d1d1f"/>
<rect x="132" y="62" width="40" height="8" rx="2" fill="#2a2a2a"/>
<rect x="180" y="62" width="40" height="8" rx="2" fill="#2a2a2a"/>
<rect x="228" y="62" width="40" height="8" rx="2" fill="#2a2a2a"/>
<rect x="122" y="82" width="156" height="160" rx="4" fill="$cor"/>
<circle cx="142" cy="98" r="6" fill="#2a2a2a"/><circle cx="171" cy="98" r="6" fill="#2a2a2a"/>
<circle cx="200" cy="98" r="6" fill="#2a2a2a"/><circle cx="229" cy="98" r="6" fill="#2a2a2a"/>
<circle cx="258" cy="98" r="6" fill="#2a2a2a"/>
<rect x="138" y="114" width="124" height="6" rx="3" fill="$escuro"/>
<rect x="136" y="128" width="128" height="96" rx="6" fill="#1d1d1f"/>
<rect x="148" y="140" width="104" height="72" rx="4" fill="#3b3b3f"/>
"@
    }
  }
}

function Salvar-Fotos([string]$id, [string]$tipo, [string]$cor) {
  $desenho = Svg-Desenho $tipo $cor
  $variantes = @(
    @{ n = 1; fundo = '#f5efe6'; zoom = '1' },
    @{ n = 2; fundo = '#e9dfd0'; zoom = '1.45' }
  )
  foreach ($v in $variantes) {
    $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="800" height="600">
<rect width="400" height="300" fill="$($v.fundo)"/>
<g transform="translate(200 160) scale($($v.zoom)) translate(-200 -160)">
$desenho
</g>
</svg>
"@
    [System.IO.File]::WriteAllText((Join-Path $dirFotos "$id-$($v.n).svg"), $svg, $utf8)
  }
  Write-Host "fotos:  public/fotos/$id-1.svg, $id-2.svg"
}

# ---------------------------------------------------------------- produtos
# Medidas iguais às do src/data/products.json (aqui em metros).

Montar-Estofado 2.10 0.95 1.00 3 '#cbb79a' '#5b4636'; Salvar-Glb 'sofa-lisboa.glb' 'Sofa Lisboa'
Salvar-Fotos 'sofa-lisboa' 'sofa' '#cbb79a'

Montar-Estofado 1.56 0.84 0.88 2 '#8a8d90' '#2f2f2f'; Salvar-Glb 'sofa-oslo.glb' 'Sofa Oslo'
Salvar-Fotos 'sofa-oslo' 'sofa' '#8a8d90'

Montar-Estofado 0.80 1.02 0.84 1 '#b5714f' '#5b4636'; Salvar-Glb 'poltrona-aurora.glb' 'Poltrona Aurora'
Salvar-Fotos 'poltrona-aurora' 'poltrona' '#b5714f'

Montar-Estofado 0.68 0.78 0.72 1 '#7d8463' '#2f2f2f'; Salvar-Glb 'poltrona-lina.glb' 'Poltrona Lina'
Salvar-Fotos 'poltrona-lina' 'poltrona' '#7d8463'

Montar-Geladeira 0.70 1.86 0.73 '#c9ccce'; Salvar-Glb 'geladeira-duplex.glb' 'Geladeira Duplex'
Salvar-Fotos 'geladeira-duplex' 'geladeira' '#c9ccce'

Montar-Fogao 0.77 0.92 0.66 '#c9ccce'; Salvar-Glb 'fogao-5-bocas.glb' 'Fogao 5 Bocas'
Salvar-Fotos 'fogao-5-bocas' 'fogao' '#c9ccce'
