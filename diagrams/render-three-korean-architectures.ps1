Add-Type -AssemblyName System.Drawing
$out = Split-Path -Parent $MyInvocation.MyCommand.Path
$c = Get-Content -Raw -Encoding UTF8 (Join-Path $out 'korean-architecture-content.json') | ConvertFrom-Json
$font=New-Object System.Drawing.Font('Malgun Gothic',12);$small=New-Object System.Drawing.Font('Malgun Gothic',10);$label=New-Object System.Drawing.Font('Malgun Gothic',14,[System.Drawing.FontStyle]::Bold);$title=New-Object System.Drawing.Font('Malgun Gothic',27,[System.Drawing.FontStyle]::Bold)
$white=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White);$ink=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20,30,45));$green=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(232,247,235));$green2=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(28,112,54),2);$orange=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,243,229));$orange2=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(222,92,19),2);$blue=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235,242,255));$blue2=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(38,80,190),2);$purple=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244,238,255));$purple2=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(88,43,180),2);$gray=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248,250,252));$gray2=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90,105,125),2);$line=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55,65,81),2)
function Box($g,$x,$y,$w,$h,$item,$fill,$stroke){$g.FillRectangle($fill,$x,$y,$w,$h);$g.DrawRectangle($stroke,$x,$y,$w,$h);$sf=[System.Drawing.StringFormat]::new();$sf.Alignment='Center';$sf.LineAlignment='Near';$g.DrawString($item.head,$label,$ink,[System.Drawing.RectangleF]::new($x+8,$y+10,$w-16,32),$sf);$g.DrawString($item.body,$small,$ink,[System.Drawing.RectangleF]::new($x+14,$y+50,$w-28,$h-58),$sf)}
function Arrow($g,$x1,$y1,$x2,$y2,$text=''){$g.DrawLine($line,$x1,$y1,$x2,$y2);$g.FillPolygon($ink,@([System.Drawing.Point]::new($x2,$y2),[System.Drawing.Point]::new($x2-10,$y2-5),[System.Drawing.Point]::new($x2-10,$y2+5)));if($text){$sf=[System.Drawing.StringFormat]::new();$sf.Alignment='Center';$g.DrawString($text,$small,$ink,[System.Drawing.RectangleF]::new(($x1+$x2)/2-70,($y1+$y2)/2-20,140,38),$sf)}}
function NewCanvas($w,$h){$b=New-Object System.Drawing.Bitmap($w,$h);$g=[System.Drawing.Graphics]::FromImage($b);$g.Clear([System.Drawing.Color]::White);$g.SmoothingMode='AntiAlias';return @($b,$g)}
function SaveCanvas($b,$g,$name){$g.Dispose();$b.Save((Join-Path $out $name),[System.Drawing.Imaging.ImageFormat]::Png);$b.Dispose()}
function Header($g,$text,$sub){$g.DrawString($text,$title,$ink,60,25);$g.DrawString($sub,$font,$ink,70,75)}

# 1. Main architecture
$p=NewCanvas 2100 1250;$b=$p[0];$g=$p[1];Header $g '1. Main 아키텍처' '요청 진입부터 검증, 라우팅, 지식 조회, Agent/Model 호출, 응답 반환까지의 핵심 서버 구조'
Box $g 55 250 250 300 $c.user $gray $gray2;Box $g 350 250 280 300 $c.frontend $green $green2;Arrow $g 305 400 350 400 '질문'
$g.DrawRectangle($green2,680,130,850,980);$g.DrawString('Main API Server · Node.js HTTP Server',$label,$ink,900,150)
Box $g 720 210 770 135 $c.routes $gray $green2;Box $g 720 375 770 145 $c.validation $green $green2;Box $g 720 550 770 170 $c.orchestrator $green $green2;Arrow $g 1105 345 1105 375 '요청';Arrow $g 1105 520 1105 550 '검증 완료'
Box $g 720 770 360 210 $c.knowledge $blue $blue2;Box $g 1130 770 360 210 $c.data $blue $blue2;Arrow $g 900 720 900 770 '지식 조회';Arrow $g 1080 875 1130 875 '파일 읽기'
Box $g 720 1010 360 210 $c.agents $orange $orange2;Box $g 1130 1010 360 210 $c.model $orange $orange2;Arrow $g 1250 720 1250 1010 '생성 필요';Arrow $g 1080 1110 1130 1110 '모델 호출'
Box $g 1600 180 430 230 $c.a2a $purple $purple2;Box $g 1600 470 430 230 $c.ops $purple $purple2;Box $g 1600 760 430 230 $c.response $green $green2;Arrow $g 1530 300 1600 300 '외부 연동';Arrow $g 1490 1120 1600 850 '운영 정보';Arrow $g 1530 800 1600 850 '응답 통합'
$g.DrawRectangle($blue2,55,1130,580,90);$g.DrawString('핵심 책임',$label,$ink,80,1150);$g.DrawString('server.js: HTTP · 인증 · CORS  |  orchestrator.js: 라우팅 · 조회 · 호출',$small,$ink,80,1185);SaveCanvas $b $g 'main-architecture-ko.png'

# 2. Cat architecture
$p=NewCanvas 2100 1050;$b=$p[0];$g=$p[1];Header $g '2. Cat / Catalog 아키텍처' '게임 콘텐츠 카탈로그 질의가 어떤 데이터와 응답 구조를 거치는지 분리해서 표현'
Box $g 55 350 250 230 $c.user $gray $gray2;Box $g 350 350 260 230 $c.routes $green $green2;Box $g 655 350 270 230 $c.validation $green $green2;Arrow $g 305 465 350 465 'catalog 질문';Arrow $g 610 465 655 465 '검증'
Box $g 970 310 290 310 $c.cat $blue $blue2;Arrow $g 925 465 970 465 'mode=catalog'
Box $g 1305 150 300 220 $c.knowledge $blue $blue2;Box $g 1305 440 300 220 $c.data $blue $blue2;Arrow $g 1260 390 1305 260 '조회 함수';Arrow $g 1455 370 1455 440 '데이터 읽기'
Box $g 1650 310 380 310 $c.response $green $green2;Arrow $g 1605 465 1650 465 '답변 + 출처'
$g.DrawRectangle($orange2,655,710,950,190);$g.DrawString('Cat 처리 규칙',$label,$ink,690,735);$g.DrawString('1) catalog 모드는 우선 구조화된 지식 데이터를 직접 조회합니다.',$font,$ink,690,775);$g.DrawString('2) 이름·키워드 정규화 후 일치 항목을 찾습니다.',$font,$ink,690,810);$g.DrawString('3) sourceRef를 통해 출처 링크를 응답에 포함합니다.',$font,$ink,690,845);SaveCanvas $b $g 'cat-architecture-ko.png'

# 3. Connected services
$p=NewCanvas 2300 1250;$b=$p[0];$g=$p[1];Header $g '3. Main + Cat + Video + Development + WorkMate 통합 아키텍처' 'Main이 공통 요청 계약을 사용해 각 전문 서비스로 요청을 분배하고 결과를 통합하는 구조'
Box $g 50 420 250 250 $c.user $gray $gray2;Box $g 360 350 360 390 $c.orchestrator $green $green2;Arrow $g 300 545 360 545 '공통 요청'
Box $g 820 130 380 230 $c.cat $blue $blue2;Box $g 820 405 380 230 $c.video $gray $gray2;Box $g 820 680 380 230 $c.development $gray $gray2;Box $g 820 955 380 230 $c.workmate $gray $gray2
Arrow $g 720 460 820 245 'catalog';Arrow $g 720 520 820 520 'video';Arrow $g 720 585 820 795 'dev-guide';Arrow $g 720 650 820 1070 'workContext'
Box $g 1320 130 360 230 $c.data $blue $blue2;Box $g 1320 405 360 230 $c.response $green $green2;Box $g 1320 680 360 230 $c.model $orange $orange2;Box $g 1320 955 360 230 $c.a2a $purple $purple2
Arrow $g 1200 245 1320 245 '지식 데이터';Arrow $g 1200 520 1320 520 '결과';Arrow $g 1200 795 1320 795 '모델';Arrow $g 1200 1070 1320 1070 '외부 연동'
Box $g 1780 350 450 390 $c.ops $purple $purple2;Arrow $g 1680 520 1780 520 'health · metrics · sources'
$g.DrawRectangle($blue2,50,80+1110,2180,80);$g.DrawString('통합 원칙: requestId · mode · context · evidence를 공통 계약으로 유지하고, Main은 서비스별 결과를 하나의 응답으로 통합합니다.',$font,$ink,85,1145);SaveCanvas $b $g 'main-connected-services-ko.png'
Write-Output '3 Korean architecture PNG files created.'
