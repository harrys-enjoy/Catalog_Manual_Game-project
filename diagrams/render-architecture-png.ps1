Add-Type -AssemblyName System.Drawing

$out = Split-Path -Parent $MyInvocation.MyCommand.Path
$fontTitle = New-Object System.Drawing.Font('Arial', 24, [System.Drawing.FontStyle]::Bold)
$fontLabel = New-Object System.Drawing.Font('Arial', 14, [System.Drawing.FontStyle]::Bold)
$fontSmall = New-Object System.Drawing.Font('Arial', 11)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(71,85,105), 2)
$bluePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(37,99,235), 2)
$orangePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(249,115,22), 2)
$greenPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(5,150,105), 2)
$blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(219,234,254))
$lightBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248,250,252))
$orangeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,247,237))
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(236,253,245))
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(23,32,51))

function New-Canvas($w,$h) { $b=New-Object System.Drawing.Bitmap($w,$h); $g=[System.Drawing.Graphics]::FromImage($b); $g.Clear([System.Drawing.Color]::White); $g.SmoothingMode='AntiAlias'; return @($b,$g) }
function Box($g,$x,$y,$w,$h,$title,$sub,$fill,$stroke) { $g.FillRectangle($fill,$x,$y,$w,$h); $g.DrawRectangle($stroke,$x,$y,$w,$h); $sf=[System.Drawing.StringFormat]::new();$sf.Alignment='Center';$g.DrawString($title,$fontLabel,$textBrush,[System.Drawing.RectangleF]::new($x,$y+20,$w,28),$sf);$g.DrawString($sub,$fontSmall,$textBrush,[System.Drawing.RectangleF]::new($x,$y+52,$w,38),$sf) }
function Arrow($g,$x1,$y1,$x2,$y2) { $g.DrawLine($pen,$x1,$y1,$x2,$y2); $g.FillPolygon($textBrush,@([System.Drawing.Point]::new($x2,$y2),[System.Drawing.Point]::new($x2-9,$y2-5),[System.Drawing.Point]::new($x2-9,$y2+5))) }
function Save($b,$g,$name) { $g.Dispose();$b.Save((Join-Path $out $name),[System.Drawing.Imaging.ImageFormat]::Png);$b.Dispose() }

# Main
$c=New-Canvas 1400 900;$b=$c[0];$g=$c[1];$g.DrawString('Main Architecture',$fontTitle,$textBrush,520,25)
Box $g 40 390 180 80 'Client / UI' 'HTTP request' $lightBrush $pen; Box $g 280 330 240 200 'Main API Server' 'src/server.js | routes | auth' $blueBrush $bluePen; Box $g 600 330 250 200 'Orchestrator' 'validate | lookup | route | model' $blueBrush $bluePen; Box $g 930 120 220 100 'Knowledge' 'data/*.json' $orangeBrush $orangePen; Box $g 930 280 220 100 'Agent Registry' 'local / remote A2A' $lightBrush $pen; Box $g 930 440 220 100 'Model Adapter' 'Mock / external model' $lightBrush $pen; Box $g 930 600 220 100 'Observability' 'health | metrics | sources' $lightBrush $pen; Box $g 280 650 240 100 'Public Assets' 'index.html | app.js | CSS' $orangeBrush $orangePen
Arrow $g 220 430 280 430;Arrow $g 520 430 600 430;Arrow $g 850 380 930 190;Arrow $g 850 430 930 330;Arrow $g 850 480 930 490;Arrow $g 400 530 400 650;Arrow $g 850 510 930 650;Save $b $g 'main-architecture.png'

# Cat
$c=New-Canvas 1400 600;$b=$c[0];$g=$c[1];$g.DrawString('Cat / Catalog Architecture',$fontTitle,$textBrush,500,25)
Box $g 35 250 165 90 'Catalog question' 'mode=catalog' $lightBrush $pen;Box $g 245 250 170 90 'Main API' 'POST /api/ask' $blueBrush $bluePen;Box $g 460 250 180 90 'Orchestrator' 'route catalog' $blueBrush $bluePen;Box $g 685 250 180 90 'Catalog Agent' 'agent=catalog' $blueBrush $bluePen;Box $g 910 145 220 90 'Catalog data' 'knowledge.json' $orangeBrush $orangePen;Box $g 910 285 220 90 'Normalized matching' 'keyword lookup' $lightBrush $pen;Box $g 910 425 220 90 'Sources' 'sourceRef -> sources.json' $lightBrush $pen;Box $g 1180 250 180 90 'AgentResponse' 'answer | sources | id' $blueBrush $bluePen
Arrow $g 200 295 245 295;Arrow $g 415 295 460 295;Arrow $g 640 295 685 295;Arrow $g 865 275 910 190;Arrow $g 865 315 910 330;Arrow $g 1020 235 1020 285;Arrow $g 1020 375 1020 425;Arrow $g 1130 330 1180 295;Save $b $g 'cat-architecture.png'

# Connected services
$c=New-Canvas 1400 760;$b=$c[0];$g=$c[1];$g.DrawString('Main Connected Services Architecture',$fontTitle,$textBrush,450,25)
Box $g 55 340 170 90 'User / Team' 'request source' $lightBrush $pen;Box $g 300 285 250 200 'Main' 'API Gateway | Orchestrator' $blueBrush $bluePen;Box $g 650 115 220 90 'Cat / Catalog' 'content Q&A' $lightBrush $pen;Box $g 650 250 220 90 'Video' 'asset / playback' $lightBrush $pen;Box $g 650 385 220 90 'Development' 'dev-guide / planning' $lightBrush $pen;Box $g 650 520 220 90 'WorkMate' 'productivity context' $lightBrush $pen;Box $g 1010 130 250 80 'Catalog knowledge' 'data/knowledge.json' $orangeBrush $orangePen;Box $g 1010 270 250 80 'Video storage' 'metadata / assets' $orangeBrush $orangePen;Box $g 1010 410 250 80 'Development guides' 'knowledge + model' $orangeBrush $orangePen;Box $g 1010 550 250 80 'Work context' 'project | user | task' $orangeBrush $orangePen;Box $g 300 590 250 80 'Shared contracts' 'requestId | mode | context' $greenBrush $greenPen
Arrow $g 225 385 300 385;Arrow $g 550 330 650 160;Arrow $g 550 385 650 295;Arrow $g 550 425 650 430;Arrow $g 550 460 650 565;Arrow $g 870 160 1010 170;Arrow $g 870 295 1010 310;Arrow $g 870 430 1010 450;Arrow $g 870 565 1010 590;Arrow $g 425 485 425 590;Save $b $g 'main-connected-services.png'

Write-Output 'PNG files created.'
