# Generate valid PNG launcher icons for Flutter app
# Each mipmap density gets correctly sized icons

Add-Type -AssemblyName System.Drawing

function Create-LauncherIcon {
    param([string]$path, [int]$size)
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Background: deep teal gradient
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($size, $size)),
        [System.Drawing.Color]::FromArgb(255, 0, 77, 90),
        [System.Drawing.Color]::FromArgb(255, 0, 120, 140)
    )
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $brush.Dispose()
    
    # Rounded corners mask
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Draw truck icon (simple truck shape)
    $margin = [int]($size * 0.15)
    $w = $size - ($margin * 2)
    $h = $size - ($margin * 2)
    
    # Truck body
    $bodyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $bodyH = [int]($h * 0.45)
    $bodyY = [int]($margin + $h * 0.25)
    $g.FillRectangle($bodyBrush, $margin, $bodyY, $w, $bodyH)
    
    # Cab
    $cabW = [int]($w * 0.4)
    $cabH = [int]($h * 0.55)
    $cabY = [int]($margin + $h * 0.15)
    $g.FillRectangle($bodyBrush, ($size - $margin - $cabW), $cabY, $cabW, ($bodyY + $bodyH - $cabY))
    
    # Wheels
    $wheelR = [int]($size * 0.1)
    $wheelY = $bodyY + $bodyH - $wheelR
    $orangeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 122, 0))
    $g.FillEllipse($orangeBrush, ($margin + [int]($w*0.1)), $wheelY, $wheelR*2, $wheelR*2)
    $g.FillEllipse($orangeBrush, ($margin + [int]($w*0.6)), $wheelY, $wheelR*2, $wheelR*2)
    
    $bodyBrush.Dispose()
    $orangeBrush.Dispose()
    $g.Dispose()
    
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $path ($size x $size)"
}

$basePath = "android\app\src\main\res"

Create-LauncherIcon "$basePath\mipmap-mdpi\ic_launcher.png" 48
Create-LauncherIcon "$basePath\mipmap-hdpi\ic_launcher.png" 72
Create-LauncherIcon "$basePath\mipmap-xhdpi\ic_launcher.png" 96
Create-LauncherIcon "$basePath\mipmap-xxhdpi\ic_launcher.png" 144
Create-LauncherIcon "$basePath\mipmap-xxxhdpi\ic_launcher.png" 192

Write-Host "All launcher icons generated successfully!"
