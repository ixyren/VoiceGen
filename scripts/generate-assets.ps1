$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $root 'src-tauri\icons'
$nsisDir = Join-Path $root 'src-tauri\nsis'
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null
New-Item -ItemType Directory -Force -Path $nsisDir | Out-Null

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function Add-RadialGlow([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$rx, [float]$ry, [System.Drawing.Color]$centerColor) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse($cx - $rx, $cy - $ry, $rx * 2, $ry * 2)
    $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
    $pgb.CenterColor = $centerColor
    $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, $centerColor.R, $centerColor.G, $centerColor.B))
    $g.FillPath($pgb, $path)
    $pgb.Dispose()
    $path.Dispose()
}

function Draw-WaveformMark([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$size) {
    $bars = @(0.32, 0.56, 0.88, 0.48, 1.00, 0.72, 0.40)
    $count = $bars.Length
    $totalW = $size * 0.74
    $step = $totalW / $count
    $barW = $step * 0.56
    $startX = $cx - ($totalW - ($step - $barW)) / 2

    $gradRect = New-Object System.Drawing.RectangleF(($cx - $size / 2), ($cy - $size / 2), $size, $size)
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $gradRect,
        [System.Drawing.Color]::FromArgb(255, 139, 92, 246),
        [System.Drawing.Color]::FromArgb(255, 6, 182, 212),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )

    for ($i = 0; $i -lt $count; $i++) {
        $bh = [Math]::Max($barW, $size * 0.62 * $bars[$i])
        $bx = $startX + $i * $step
        $by = $cy - $bh / 2
        $p = New-RoundedRectPath $bx $by $barW $bh ($barW / 2)
        $g.FillPath($gradBrush, $p)
        $p.Dispose()
    }
    $gradBrush.Dispose()
}

function New-AppIconBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $pad = $size * 0.06
    $boxSize = $size - 2 * $pad
    $radius = $size * 0.22
    $cardPath = New-RoundedRectPath $pad $pad $boxSize $boxSize $radius

    # Dark studio background gradient
    $bgRect = New-Object System.Drawing.RectangleF($pad, $pad, $boxSize, $boxSize)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $bgRect,
        [System.Drawing.Color]::FromArgb(255, 18, 18, 24),
        [System.Drawing.Color]::FromArgb(255, 9, 9, 11),
        [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
    )
    $g.SetClip($cardPath)
    $g.FillPath($bgBrush, $cardPath)
    $bgBrush.Dispose()

    # Ambient glows
    Add-RadialGlow $g ($size * 0.26) ($size * 0.24) ($size * 0.45) ($size * 0.45) ([System.Drawing.Color]::FromArgb(95, 139, 92, 246))
    Add-RadialGlow $g ($size * 0.78) ($size * 0.78) ($size * 0.45) ($size * 0.45) ([System.Drawing.Color]::FromArgb(80, 6, 182, 212))

    # Inner glass ring
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(42, 255, 255, 255), [Math]::Max(1, $size * 0.015))
    $g.DrawPath($ringPen, $cardPath)
    $ringPen.Dispose()

    # Waveform mark
    Draw-WaveformMark $g ($size * 0.5) ($size * 0.5) ($size * 0.72)

    $g.ResetClip()

    # Crisp gradient border
    $borderBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $bgRect,
        [System.Drawing.Color]::FromArgb(200, 139, 92, 246),
        [System.Drawing.Color]::FromArgb(200, 6, 182, 212),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    $borderPen = New-Object System.Drawing.Pen($borderBrush, [Math]::Max(1.2, $size * 0.022))
    $g.DrawPath($borderPen, $cardPath)
    $borderPen.Dispose()
    $borderBrush.Dispose()
    $cardPath.Dispose()

    $g.Dispose()
    return $bmp
}

function Save-Png([System.Drawing.Bitmap]$bmp, [string]$path) {
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Get-PngBytes([System.Drawing.Bitmap]$bmp) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    return ,$bytes
}

function Get-DibBytes([System.Drawing.Bitmap]$bmp) {
    $w = $bmp.Width
    $h = $bmp.Height
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    # BITMAPINFOHEADER (40 bytes)
    $bw.Write([uint32]40)
    $bw.Write([int32]$w)
    $bw.Write([int32]($h * 2)) # XOR + AND mask height
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]0)
    $bw.Write([uint32]($w * $h * 4))
    $bw.Write([int32]0)
    $bw.Write([int32]0)
    $bw.Write([uint32]0)
    $bw.Write([uint32]0)

    # Bottom-up BGRA pixels
    for ($y = $h - 1; $y -ge 0; $y--) {
        for ($x = 0; $x -lt $w; $x++) {
            $c = $bmp.GetPixel($x, $y)
            $bw.Write([byte]$c.B)
            $bw.Write([byte]$c.G)
            $bw.Write([byte]$c.R)
            $bw.Write([byte]$c.A)
        }
    }

    # AND mask (1 bit per pixel, rows padded to 4 bytes)
    $maskStride = [int]([Math]::Ceiling($w / 32.0) * 4)
    $mask = New-Object byte[] ($maskStride * $h)
    $bw.Write($mask, 0, $mask.Length)

    $bw.Flush()
    $bytes = $ms.ToArray()
    $bw.Dispose()
    $ms.Dispose()
    return ,$bytes
}

function Save-MultiIco([string]$path, [int[]]$sizes) {
    $entries = New-Object System.Collections.ArrayList
    foreach ($sz in $sizes) {
        $bmp = New-AppIconBitmap $sz
        if ($sz -ge 256) {
            [byte[]]$data = Get-PngBytes $bmp
        } else {
            [byte[]]$data = Get-DibBytes $bmp
        }
        $null = $entries.Add([PSCustomObject]@{ Size = $sz; Data = $data })
        $bmp.Dispose()
    }

    $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    $bw = New-Object System.IO.BinaryWriter($fs)
    $bw.Write([uint16]0) # reserved
    $bw.Write([uint16]1) # type = ICO
    $bw.Write([uint16]$entries.Count)

    $offset = 6 + (16 * $entries.Count)
    foreach ($e in $entries) {
        $dim = if ($e.Size -ge 256) { [byte]0 } else { [byte]$e.Size }
        $bw.Write($dim)
        $bw.Write($dim)
        $bw.Write([byte]0)
        $bw.Write([byte]0)
        $bw.Write([uint16]1)
        $bw.Write([uint16]32)
        $bw.Write([uint32]$e.Data.Length)
        $bw.Write([uint32]$offset)
        $offset += $e.Data.Length
    }
    foreach ($e in $entries) {
        [byte[]]$buf = $e.Data
        $bw.Write($buf, 0, $buf.Length)
    }
    $bw.Flush()
    $bw.Dispose()
    $fs.Dispose()
}

function Save-Bmp24([System.Drawing.Bitmap]$src, [string]$path) {
    $dst = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
    $g.Dispose()
    $dst.Save($path, [System.Drawing.Imaging.ImageFormat]::Bmp)
    $dst.Dispose()
}

# 1. App Icons
$bmp512 = New-AppIconBitmap 512
Save-Png $bmp512 (Join-Path $iconsDir 'icon.png')
$bmp512.Dispose()

$bmp256 = New-AppIconBitmap 256
Save-Png $bmp256 (Join-Path $iconsDir '128x128@2x.png')
$bmp256.Dispose()

$bmp128 = New-AppIconBitmap 128
Save-Png $bmp128 (Join-Path $iconsDir '128x128.png')
$bmp128.Dispose()

$bmp32 = New-AppIconBitmap 32
Save-Png $bmp32 (Join-Path $iconsDir '32x32.png')
$bmp32.Dispose()

Save-MultiIco (Join-Path $iconsDir 'icon.ico') @(16, 32, 48, 256)

# 2. NSIS Header BMP (150 x 57, 24-bit RGB)
$header = New-Object System.Drawing.Bitmap(150, 57, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gh = [System.Drawing.Graphics]::FromImage($header)
$gh.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gh.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$hRect = New-Object System.Drawing.RectangleF(0, 0, 150, 57)
$hBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $hRect,
    [System.Drawing.Color]::FromArgb(255, 18, 18, 24),
    [System.Drawing.Color]::FromArgb(255, 9, 9, 11),
    [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
)
$gh.FillRectangle($hBg, $hRect)
$hBg.Dispose()

Add-RadialGlow $gh 28 28 52 38 ([System.Drawing.Color]::FromArgb(85, 139, 92, 246))
Add-RadialGlow $gh 132 30 46 34 ([System.Drawing.Color]::FromArgb(70, 6, 182, 212))

Draw-WaveformMark $gh 28 28 32

$fontTitle = New-Object System.Drawing.Font('Segoe UI', 11.5, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font('Consolas', 7.2, [System.Drawing.FontStyle]::Regular)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 244, 244, 245))
$cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 34, 211, 238))

$gh.DrawString('VoiceGen', $fontTitle, $whiteBrush, 50, 13)
$gh.DrawString('TTS STUDIO', $fontSub, $cyanBrush, 51, 32)

$lineGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF(0, 55, 150, 2)),
    [System.Drawing.Color]::FromArgb(255, 139, 92, 246),
    [System.Drawing.Color]::FromArgb(255, 6, 182, 212),
    [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
)
$gh.FillRectangle($lineGrad, 0, 55, 150, 2)

$lineGrad.Dispose()
$fontTitle.Dispose()
$fontSub.Dispose()
$whiteBrush.Dispose()
$cyanBrush.Dispose()
$gh.Dispose()

Save-Bmp24 $header (Join-Path $nsisDir 'header.bmp')
$header.Dispose()

# 3. NSIS Sidebar BMP (164 x 314, 24-bit RGB)
$sidebar = New-Object System.Drawing.Bitmap(164, 314, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gs = [System.Drawing.Graphics]::FromImage($sidebar)
$gs.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gs.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$sRect = New-Object System.Drawing.RectangleF(0, 0, 164, 314)
$sBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $sRect,
    [System.Drawing.Color]::FromArgb(255, 16, 16, 22),
    [System.Drawing.Color]::FromArgb(255, 9, 9, 11),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$gs.FillRectangle($sBg, $sRect)
$sBg.Dispose()

# Subtle studio grid lines
$gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(14, 255, 255, 255), 1)
for ($gx = 0; $gx -le 164; $gx += 20) { $gs.DrawLine($gridPen, $gx, 0, $gx, 314) }
for ($gy = 0; $gy -le 314; $gy += 20) { $gs.DrawLine($gridPen, 0, $gy, 164, $gy) }
$gridPen.Dispose()

Add-RadialGlow $gs 38 66 95 95 ([System.Drawing.Color]::FromArgb(95, 139, 92, 246))
Add-RadialGlow $gs 134 250 90 95 ([System.Drawing.Color]::FromArgb(85, 6, 182, 212))

# Emblem card
$badgePath = New-RoundedRectPath 44 52 76 76 18
$badgeFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(225, 18, 18, 24))
$gs.FillPath($badgeFill, $badgePath)
$badgeBorder = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF(44, 52, 76, 76)),
    [System.Drawing.Color]::FromArgb(210, 139, 92, 246),
    [System.Drawing.Color]::FromArgb(210, 6, 182, 212),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)
$badgePen = New-Object System.Drawing.Pen($badgeBorder, 1.5)
$gs.DrawPath($badgePen, $badgePath)
Draw-WaveformMark $gs 82 90 54
$badgePen.Dispose()
$badgeBorder.Dispose()
$badgeFill.Dispose()
$badgePath.Dispose()

# Wordmark & tags
$sfCenter = New-Object System.Drawing.StringFormat
$sfCenter.Alignment = [System.Drawing.StringAlignment]::Center

$fWord = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$fTag = New-Object System.Drawing.Font('Consolas', 8.5, [System.Drawing.FontStyle]::Bold)
$fDesc = New-Object System.Drawing.Font('Segoe UI', 8.2, [System.Drawing.FontStyle]::Regular)

$bWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 244, 244, 245))
$bCyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 34, 211, 238))
$bMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 161, 161, 170))

$gs.DrawString('VoiceGen', $fWord, $bWhite, 82, 144, $sfCenter)
$gs.DrawString('TTS STUDIO', $fTag, $bCyan, 82, 173, $sfCenter)
$gs.DrawString("SAPI 5 · Loquendo`nOneCore · DSP · MP3", $fDesc, $bMuted, 82, 200, $sfCenter)

# Decorative bottom spectrum
$spec = @(0.22, 0.45, 0.30, 0.72, 0.55, 0.90, 0.64, 0.38, 0.80, 0.50, 0.34, 0.60, 0.25)
$specBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF(18, 258, 128, 36)),
    [System.Drawing.Color]::FromArgb(140, 139, 92, 246),
    [System.Drawing.Color]::FromArgb(140, 6, 182, 212),
    [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
)
for ($i = 0; $i -lt $spec.Length; $i++) {
    $bh = 34 * $spec[$i]
    $bx = 22 + $i * 9.5
    $by = 296 - $bh
    $p = New-RoundedRectPath $bx $by 5 $bh 2.5
    $gs.FillPath($specBrush, $p)
    $p.Dispose()
}
$specBrush.Dispose()

# Right edge accent hairline
$edgeLine = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF(162, 0, 2, 314)),
    [System.Drawing.Color]::FromArgb(220, 139, 92, 246),
    [System.Drawing.Color]::FromArgb(220, 6, 182, 212),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$gs.FillRectangle($edgeLine, 162, 0, 2, 314)
$edgeLine.Dispose()

$sfCenter.Dispose()
$fWord.Dispose()
$fTag.Dispose()
$fDesc.Dispose()
$bWhite.Dispose()
$bCyan.Dispose()
$bMuted.Dispose()
$gs.Dispose()

Save-Bmp24 $sidebar (Join-Path $nsisDir 'sidebar.bmp')
$sidebar.Dispose()

Write-Output 'Generated icons and NSIS 24-bit BMP assets successfully.'
