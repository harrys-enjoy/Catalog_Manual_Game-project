Add-Type -AssemblyName System.Drawing
$out = Split-Path -Parent $MyInvocation.MyCommand.Path
$font = New-Object System.Drawing.Font('Malgun Gothic', 12)
$small = New-Object System.Drawing.Font('Malgun Gothic', 10)
$label = New-Object System.Drawing.Font('Malgun Gothic', 14, [System.Drawing.FontStyle]::Bold)
$title = New-Object System.Drawing.Font('Malgun Gothic', 27, [System.Drawing.FontStyle]::Bold)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$ink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20,30,45))
$green = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(232,247,235))
$green2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(28,112,54), 2)
$orange = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,243,229))
$orange2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(222,92,19), 2)
$blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235,242,255))
$blue2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(38,80,190), 2)
$purple = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244,238,255))
$purple2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(88,43,180), 2)
$gray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248,250,252))
$gray2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90,105,125), 2)
$line = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55,65,81), 2)

function Box($g,$x,$y,$w,$h,$head,$body,$fill,$stroke) {
  $g.FillRectangle($fill,$x,$y,$w,$h); $g.DrawRectangle($stroke,$x,$y,$w,$h)
  $sf=[System.Drawing.StringFormat]::new(); $sf.Alignment='Center'; $sf.LineAlignment='Center'
  $g.DrawString($head,$label,$ink,[System.Drawing.RectangleF]::new($x+8,$y+8,$w-16,30),$sf)
  if($body){ $g.DrawString($body,$small,$ink,[System.Drawing.RectangleF]::new($x+10,$y+43,$w-20,$h-50),$sf) }
}
function Arrow($g,$x1,$y1,$x2,$y2,$text='') {
  $g.DrawLine($line,$x1,$y1,$x2,$y2); $g.FillPolygon($ink,@([System.Drawing.Point]::new($x2,$y2),[System.Drawing.Point]::new($x2-10,$y2-5),[System.Drawing.Point]::new($x2-10,$y2+5)))
  if($text){$sf=[System.Drawing.StringFormat]::new();$sf.Alignment='Center';$g.DrawString($text,$small,$ink,[System.Drawing.RectangleF]::new(($x1+$x2)/2-70,($y1+$y2)/2-22,140,40),$sf)}
}
function Save($b,$g,$name){$g.Dispose();$b.Save((Join-Path $out $name),[System.Drawing.Imaging.ImageFormat]::Png);$b.Dispose()}

$w=2600;$h=1650;$b=New-Object System.Drawing.Bitmap($w,$h);$g=[System.Drawing.Graphics]::FromImage($b);$g.Clear([System.Drawing.Color]::White);$g.SmoothingMode='AntiAlias'
$g.DrawString('Game Q&A API / Catalog & Manual (Game project)',$title,$ink,470,25)
$g.DrawString('상세 아키텍처 구성도',$font,$ink,1120,75)

# left: consumers
Box $g 35 260 260 360 '사용자 / 호출 주체' '기획자 · 아티스트 · 개발자`n질문 입력 · 답변 확인`n`n외부 생산성 서비스`nWorkMate · Video · Development' $gray $gray2
Box $g 335 260 260 360 'Frontend / Local Demo UI' 'public/index.html`npublic/app.js`npublic/styles.css`n`n질문 입력`n모드 선택`n답변·출처 확인`nAPI 상태 확인' $green $green2
Arrow $g 295 440 335 440 '질문'

# main container
$g.DrawRectangle($green2,640,130,820,1120);$g.DrawString('Game Q&A API · Node.js HTTP Server',$label,$ink,820,150)
Box $g 680 205 740 125 'HTTP Routes / Static Assets' 'GET /health · /metrics · /sources · /knowledge`nPOST /api/ask · /a2a · /message:send`n정적 UI 제공: index.html · app.js · styles.css' $gray $green2
Box $g 680 360 740 130 'Request Validation · src/request.js' 'JSON body 파싱 · mode 검증 · question 길이 제한`ncontext(projectId · userId · workContext)`nevidence 배열 검증 · requestId 생성' $green $green2
Box $g 680 520 740 155 'Orchestrator · src/orchestrator.js' '캐시 확인 · 모드 라우팅 · 지식 직접 조회`n질문 유형: dev-guide / catalog / codex / lore`n필요 시 Agent Registry 또는 Model Adapter 호출`nmetrics: cacheHits · directKnowledgeResponses · agentCalls' $green $green2
Arrow $g 1050 330 1050 360 '요청'
Arrow $g 1050 490 1050 520 '검증 완료'

# knowledge branch inside main
Box $g 680 720 350 220 'Knowledge Layer · src/knowledge.js' 'lookupKnowledge()`nlookupKnowledgeBest()`n정규화 검색 · 키워드 매칭`nlocale 적용 · source 연결' $blue $blue2
Box $g 1070 720 350 220 'Data Files · data/' 'knowledge.json`nsources.json`nlore-locales.json`nstory-locales.json`nstories/*.json' $blue $blue2
Arrow $g 850 675 850 720 '직접 조회'
Arrow $g 1030 830 1070 830 '읽기'

# service connection from main
Box $g 680 990 350 200 'Local Agent Registry · src/agents.js' 'planning-guide`nart-guide`ncatalog`ncodex`nlore`n전문 영역별 컨텍스트 구성' $orange $orange2
Box $g 1070 990 350 200 'Model Adapter' 'MockModelAdapter`nOpenAI-compatible endpoint`nLangChain adapter`n프롬프트 · evidence · 답변 생성' $orange $orange2
Arrow $g 1180 675 1180 990 '지식 부족 / 생성 필요'
Arrow $g 1030 1090 1070 1090 '모델 호출'

# right: specialized + external
Box $g 1510 150 420 220 'Specialized Agents' 'planning-guide: 기획·시스템 설계`nart-guide: 아트·UI/UX`ncatalog: 게임 콘텐츠 카탈로그`ncodex: 캐릭터·아이템 설정`nlore: 세계관·스토리' $orange $orange2
Box $g 1510 410 420 190 'Cat / Catalog Service' 'catalog mode`nknowledge.json 직접 조회`n콘텐츠 목록 · 분류 · 메타데이터`nsourceRef 기반 출처 연결' $blue $blue2
Box $g 1510 640 420 190 'Video Service' 'videoId · asset metadata`n영상 목록 · 재생 링크`n콘텐츠/카탈로그와 연결`n향후 별도 API 또는 저장소' $gray $gray2
Box $g 1510 870 420 190 'Development Service' 'dev-guide mode`nplanning-guide 연동`n개발 문서 · 작업 가이드`n프로젝트 컨텍스트 활용' $gray $gray2
Box $g 1510 1100 420 190 'WorkMate Service' '업무 생산성 · 사용자 맥락`nprojectId · userId · workContext`n브리핑 · 작업 상태 · 업무 연결`n향후 A2A/HTTP 연동' $gray $gray2
Arrow $g 1420 580 1510 260 '전문 Agent 호출'
Arrow $g 1420 815 1510 505 'Cat 연결'
Arrow $g 1420 900 1510 735 'Video 연결'
Arrow $g 1420 1020 1510 965 'Development 연결'
Arrow $g 1420 1110 1510 1195 'WorkMate 연결'

# far right external and ops
Box $g 1980 150 380 300 'External A2A Agents' 'GET /.well-known/agent-card.json`nPOST /message:send`nBearer API Key · HTTP+JSON`n외부 지식 / 검증 / 분석 Agent' $purple $purple2
Box $g 1980 520 380 310 'Docker / Operations' 'Dockerfile · compose.yaml`n`n/health 상태 확인`n/metrics 운영 지표`n/sources 출처 정보`n로그 · 모니터링 · 배포' $purple $purple2
Box $g 1980 900 380 290 'Response Contract' 'answer`nmode · agent`nsources`nusage`nconfidence (A2A)`nrequestId`n`n오류: INVALID_REQUEST`nKNOWLEDGE_NOT_FOUND`nMODEL_UNAVAILABLE' $green $green2
Arrow $g 1930 250 1980 250 '필요 시 외부 호출'
Arrow $g 1930 1030 1980 1030 '응답 통합'
Arrow $g 1420 1140 1980 675 '상태·메트릭·출처'

# response line
$g.DrawRectangle($blue2,35,1350,2325,220);$g.DrawString('전체 요청 처리 흐름',$label,$ink,75,1370)
$flow=@(@('1','질문 입력'),@('2','HTTP route'),@('3','요청 검증'),@('4','캐시/지식 조회'),@('5','Agent/Model 호출'),@('6','출처 포함 응답'))
$x=100;foreach($f in $flow){$g.FillEllipse($blue2,$x,1450,54,54);$g.DrawString($f[0],$label,$white,$x+17,1458);$g.DrawString($f[1],$font,$ink,$x-5,1515);if($x -lt 1850){Arrow $g ($x+60) 1477 ($x+250) 1477};$x+=390}

Save $b $g 'game-qna-api-detailed-architecture.png'
Write-Output (Join-Path $out 'game-qna-api-detailed-architecture.png')
