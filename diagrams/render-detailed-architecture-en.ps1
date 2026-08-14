Add-Type -AssemblyName System.Drawing
$out = Split-Path -Parent $MyInvocation.MyCommand.Path
$font = New-Object System.Drawing.Font('Arial', 12)
$small = New-Object System.Drawing.Font('Arial', 10)
$label = New-Object System.Drawing.Font('Arial', 14, [System.Drawing.FontStyle]::Bold)
$title = New-Object System.Drawing.Font('Arial', 27, [System.Drawing.FontStyle]::Bold)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$ink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20,30,45))
$green = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(232,247,235)); $green2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(28,112,54), 2)
$orange = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,243,229)); $orange2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(222,92,19), 2)
$blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235,242,255)); $blue2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(38,80,190), 2)
$purple = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244,238,255)); $purple2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(88,43,180), 2)
$gray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248,250,252)); $gray2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90,105,125), 2)
$line = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55,65,81), 2)
function Box($g,$x,$y,$w,$h,$head,$body,$fill,$stroke){$g.FillRectangle($fill,$x,$y,$w,$h);$g.DrawRectangle($stroke,$x,$y,$w,$h);$sf=[System.Drawing.StringFormat]::new();$sf.Alignment='Center';$sf.LineAlignment='Center';$g.DrawString($head,$label,$ink,[System.Drawing.RectangleF]::new($x+8,$y+8,$w-16,30),$sf);if($body){$body=$body.Replace('`n',[Environment]::NewLine);$g.DrawString($body,$small,$ink,[System.Drawing.RectangleF]::new($x+10,$y+43,$w-20,$h-50),$sf)}}
function Arrow($g,$x1,$y1,$x2,$y2,$text=''){$g.DrawLine($line,$x1,$y1,$x2,$y2);$g.FillPolygon($ink,@([System.Drawing.Point]::new($x2,$y2),[System.Drawing.Point]::new($x2-10,$y2-5),[System.Drawing.Point]::new($x2-10,$y2+5)));if($text){$sf=[System.Drawing.StringFormat]::new();$sf.Alignment='Center';$g.DrawString($text,$small,$ink,[System.Drawing.RectangleF]::new(($x1+$x2)/2-70,($y1+$y2)/2-22,140,40),$sf)}}
function Save($b,$g,$name){$g.Dispose();$b.Save((Join-Path $out $name),[System.Drawing.Imaging.ImageFormat]::Png);$b.Dispose()}
$w=2600;$h=1650;$b=New-Object System.Drawing.Bitmap($w,$h);$g=[System.Drawing.Graphics]::FromImage($b);$g.Clear([System.Drawing.Color]::White);$g.SmoothingMode='AntiAlias'
$g.DrawString('Game Q&A API / Catalog & Manual - Detailed Architecture',$title,$ink,430,25);$g.DrawString('Current implementation + future service connections',$font,$ink,1010,75)
Box $g 35 260 260 360 'Users / Clients' 'Designer | Artist | Developer`nQuestion input | answer review`n`nExternal productivity services`nWorkMate | Video | Development' $gray $gray2
Box $g 335 260 260 360 'Frontend / Local Demo UI' 'public/index.html`npublic/app.js`npublic/styles.css`n`nQuestion input`nMode selection`nAnswer + sources`nAPI health status' $green $green2
Arrow $g 295 440 335 440 'question'
$g.DrawRectangle($green2,640,130,820,1120);$g.DrawString('Game Q&A API - Node.js HTTP Server',$label,$ink,820,150)
Box $g 680 205 740 125 'HTTP Routes / Static Assets' 'GET /health | /metrics | /sources | /knowledge`nPOST /api/ask | /a2a | /message:send`nStatic UI: index.html | app.js | styles.css' $gray $green2
Box $g 680 360 740 130 'Request Validation - src/request.js' 'Parse JSON body | validate mode | validate question length`ncontext: projectId | userId | workContext`nevidence array validation | requestId creation' $green $green2
Box $g 680 520 740 155 'Orchestrator - src/orchestrator.js' 'Cache check | mode routing | direct knowledge lookup`nModes: dev-guide | catalog | codex | lore`nAgent Registry or Model Adapter when needed`nMetrics: cacheHits | directKnowledgeResponses | agentCalls' $green $green2
Arrow $g 1050 330 1050 360 'request';Arrow $g 1050 490 1050 520 'validated'
Box $g 680 720 350 220 'Knowledge Layer - src/knowledge.js' 'lookupKnowledge()`nlookupKnowledgeBest()`nNormalized search | keyword matching`nLocale and source resolution' $blue $blue2
Box $g 1070 720 350 220 'Data Files - data/' 'knowledge.json`nsources.json`nlore-locales.json`nstory-locales.json`nstories/*.json' $blue $blue2
Arrow $g 850 675 850 720 'direct lookup';Arrow $g 1030 830 1070 830 'read'
Box $g 680 990 350 200 'Local Agent Registry - src/agents.js' 'planning-guide`nart-guide`ncatalog`ncodex`nlore`nDomain-specific context and prompts' $orange $orange2
Box $g 1070 990 350 200 'Model Adapter' 'MockModelAdapter`nOpenAI-compatible endpoint`nLangChain adapter`nPrompt | evidence | answer generation' $orange $orange2
Arrow $g 1180 675 1180 990 'generation needed';Arrow $g 1030 1090 1070 1090 'model call'
Box $g 1510 150 420 220 'Specialized Agents' 'planning-guide: planning and systems`nart-guide: art and UI/UX`ncatalog: game content catalog`ncodex: characters and items`nlore: world and story' $orange $orange2
Box $g 1510 410 420 190 'Cat / Catalog Service' 'catalog mode`nknowledge.json direct lookup`nContent list | classification | metadata`nsourceRef-based source links' $blue $blue2
Box $g 1510 640 420 190 'Video Service' 'videoId | asset metadata`nVideo list | playback link`nConnected to content and catalog`nFuture API or storage integration' $gray $gray2
Box $g 1510 870 420 190 'Development Service' 'dev-guide mode`nplanning-guide integration`nDevelopment docs | task guides`nProject context aware' $gray $gray2
Box $g 1510 1100 420 190 'WorkMate Service' 'Productivity and user context`nprojectId | userId | workContext`nBriefing | task status | work links`nFuture A2A / HTTP integration' $gray $gray2
Arrow $g 1420 580 1510 260 'agent call';Arrow $g 1420 815 1510 505 'Cat';Arrow $g 1420 900 1510 735 'Video';Arrow $g 1420 1020 1510 965 'Development';Arrow $g 1420 1110 1510 1195 'WorkMate'
Box $g 1980 150 380 300 'External A2A Agents' 'GET /.well-known/agent-card.json`nPOST /message:send`nBearer API key | HTTP+JSON`nExternal knowledge | validation | analysis' $purple $purple2
Box $g 1980 520 380 310 'Docker / Operations' 'Dockerfile | compose.yaml`n`n/health status`n/metrics operations metrics`n/sources attribution data`nLogs | monitoring | deployment' $purple $purple2
Box $g 1980 900 380 290 'Response Contract' 'answer`nmode | agent`nsources`nusage`nconfidence (A2A)`nrequestId`n`nErrors: INVALID_REQUEST`nKNOWLEDGE_NOT_FOUND`nMODEL_UNAVAILABLE' $green $green2
Arrow $g 1930 250 1980 250 'external call';Arrow $g 1930 1030 1980 1030 'merge response';Arrow $g 1420 1140 1980 675 'status | metrics | sources'
$g.DrawRectangle($blue2,35,1350,2325,220);$g.DrawString('End-to-end request flow',$label,$ink,75,1370)
$flow=@(@('1','Question'),@('2','HTTP route'),@('3','Validation'),@('4','Cache / knowledge'),@('5','Agent / model'),@('6','Answer + sources'));$x=100;foreach($f in $flow){$g.FillEllipse($blue,[System.Drawing.Rectangle]::new($x,1450,54,54));$g.DrawString($f[0],$label,$white,$x+17,1458);$g.DrawString($f[1],$font,$ink,$x-5,1515);if($x -lt 1850){Arrow $g ($x+60) 1477 ($x+250) 1477};$x+=390}
Save $b $g 'game-qna-api-detailed-architecture.png'
Write-Output (Join-Path $out 'game-qna-api-detailed-architecture.png')
