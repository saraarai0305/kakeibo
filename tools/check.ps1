# 公開前チェック。ヘッドレスChromeで実際に動かし、構文エラーと描画を確かめる。
# 使い方: powershell -File tools\check.ps1
#
# 2026-08-05に「const list の二重宣言」で全画面が空になった。
# 括弧の数を数えるだけの静的チェックでは捕まえられなかったので、必ず実行して確かめること。

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { Write-Error "Chromeが見つかりません: $chrome" }

# 版とversion.txtの一致
$src = Get-Content "$root\index.html" -Raw -Encoding UTF8
$smoke = @'
<script>
window.addEventListener("load", () => setTimeout(() => {
  const tap = (selector, label) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error("UI smoke: " + label);
    el.click();
  };
  const setValue = (selector, value, label) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error("UI smoke: " + label);
    el.value = value;
    el.dispatchEvent(new Event("input", {bubbles:true}));
  };
  try {
    tap('[data-v2-go="record"]', "home → record");
    tap('[data-v2-go="moneyRecord"]', "record → money");
    if (!document.querySelector('#v2Amount')) throw new Error("UI smoke: money form");
    tap('[data-v2-back]', "money → record");
    tap('[data-v2-back]', "record → home");
    tap('[data-v2-go="today"]', "home → today");
    tap('[data-v2-go="workLog"]', "today → work log");
    setValue('#v2WorkStart', '09:00', "work start");
    setValue('#v2WorkEnd', '18:00', "work end");
    setValue('#v2WorkBreak', '60', "work break");
    if (document.querySelector('[data-v2-work-net]')?.textContent !== "8時間0分") {
      throw new Error("UI smoke: net work duration");
    }
    tap('[data-v2-back]', "work log → today");
    tap('[data-v2-go="flow"]', "today → flow");
    if (!document.querySelector('.v2-timeline')) throw new Error("UI smoke: flow timeline");
    tap('[data-v2-go="calendar"]', "flow → calendar");
    tap('[data-v2-cal-mode="month"]', "calendar month mode");
    if (!document.querySelector('.v2-month')) throw new Error("UI smoke: month calendar");
    tap('[data-v2-back]', "calendar → flow");
    tap('[data-v2-back]', "flow → today");
    tap('[data-v2-back]', "today → home");
    tap('[data-v2-go="visualize"]', "home → visualize");
    tap('[data-v2-go="healthAnalysis"]', "visualize → health analysis");
    if (!document.querySelector('.v2-line-chart')) throw new Error("UI smoke: health chart");
    if (!document.querySelector('[data-v2-metric="work"]')) throw new Error("UI smoke: work metric");
    if (!document.querySelector('[data-v2-metric="break"]')) throw new Error("UI smoke: break metric");
    tap('[data-v2-back]', "health analysis → visualize");
    tap('[data-v2-go="moneyAnalysis"]', "visualize → money analysis");
    if (!document.querySelector('.v2-chart-block')) throw new Error("UI smoke: money analysis");
    tap('[data-v2-back]', "money analysis → visualize");
    tap('[data-v2-go="settings"]', "visualize → settings");
    if (!document.querySelector('.v2-settings')) throw new Error("UI smoke: settings");
    document.documentElement.dataset.uiSmoke = "ok";
  } catch (error) {
    document.documentElement.dataset.uiSmoke = "failed: " + error.message;
  }
}, 200));
</script>
'@
$src = $src.Replace('</body>', $smoke + '</body>')
$build = [regex]::Match($src, 'const BUILD = "([^"]+)"').Groups[1].Value
$ver = (Get-Content "$root\version.txt" -Raw -Encoding UTF8).Trim()
if ($build -ne $ver) { Write-Error "BUILD($build) と version.txt($ver) が違います" }
"OK  版 $build"

# レンダー入口が再び多重ラップされると、画面位置と設定表示が画面ごとにずれる。
$uiV2 = Get-Content "$root\ui-v2.js" -Raw -Encoding UTF8
if ([regex]::Matches($uiV2, 'window\.newAppRender\s*=').Count -ne 1) { Write-Error "newAppRender の入口が複数あります" }
if ($uiV2 -match 'baseNewAppRender|renderWithSeparatedSync') { Write-Error "旧レンダーラッパーが残っています" }
"OK  レンダー入口は単一"

# PWAが古いCSS/JSをキャッシュすると、公開URLとホーム画面アプリの表示が食い違う。
# 画面側とService Worker側の主要資産は、BUILDと同じクエリ版を必ず持たせる。
$sw = Get-Content "$root\sw.js" -Raw -Encoding UTF8
$assets = @("ui-v2.css", "ui-analog.css", "ui-paper-baseline.css", "ui-v2.js")
foreach ($asset in $assets) {
  $expected = $asset + '?v=' + $build
  if ($src -notmatch [regex]::Escape($expected)) { Write-Error "index.html の資産版が違います: $expected" }
  if ($sw -notmatch [regex]::Escape($expected)) { Write-Error "sw.js の資産版が違います: $expected" }
}
if ($sw -notmatch [regex]::Escape('const CACHE = "mainichi-v' + $build + '"')) {
  Write-Error "sw.js のキャッシュ版がBUILDと違います: mainichi-v$build"
}
"OK  PWA資産とキャッシュ版が一致"

# 実データがあればそれを流し込んで試す（無ければ空データ）
$test = "$root\_check_tmp.html"
$dataFile = "$root\private\mainichi-data.json"
if (Test-Path $dataFile) {
  $json = (Get-Content $dataFile -Raw -Encoding UTF8 | ConvertFrom-Json | ConvertTo-Json -Depth 20 -Compress)
  $inject = 'let S = (function(){ try{ localStorage.setItem(KEY, ' + ($json | ConvertTo-Json) + '); }catch(e){} return load(); })();'
  [System.IO.File]::WriteAllText($test, $src.Replace('let S = load();', $inject), (New-Object System.Text.UTF8Encoding $false))
  "OK  実データを流し込んで検査します"
} else {
  [System.IO.File]::WriteAllText($test, $src, (New-Object System.Text.UTF8Encoding $false))
  "--  実データなし。空の状態で検査します"
}

$log = "$env:TEMP\kakeibo-check-console.txt"
$dom = "$env:TEMP\kakeibo-check-dom.html"
# ネイティブexeの stderr は Start-Process で分ける（PS5.1 の 2> は NativeCommandError になる）
$args = @("--headless","--disable-gpu","--virtual-time-budget=4000",
          "--enable-logging=stderr","--v=0","--dump-dom",
          ("file:///" + $test.Replace('\','/')))
Start-Process -FilePath $chrome -ArgumentList $args -NoNewWindow -Wait `
  -RedirectStandardOutput $dom -RedirectStandardError $log

# file:// では fetch と manifest が必ず怒られる。それ以外のコンソール出力は異常とみなす
$bad = Get-Content $log -Encoding UTF8 | Select-String "CONSOLE" |
  Where-Object { $_ -notmatch "Access to (fetch|manifest)" -and $_ -notmatch "Failed to load resource" }
if ($bad) { $bad | ForEach-Object { Write-Host $_ -ForegroundColor Red }; Remove-Item $test -Force; Write-Error "コンソールにエラーがあります" }
"OK  コンソールにエラーなし"

$html = Get-Content $dom -Raw -Encoding UTF8
if ($html -notmatch 'data-ui-smoke="ok"') {
  Remove-Item $test -Force
  Write-Error "画面遷移のスモークテストに失敗しました"
}
"OK  入口から設定までの画面遷移"

# 描画されたはずのものが本当にあるか（ソースだけの1件では不足とみなす）
$need = @{ 'data-habit="' = 2; 'class="ring"' = 2; 'data-gotab="' = 5 }
foreach ($k in $need.Keys) {
  $n = ([regex]::Matches($html, [regex]::Escape($k))).Count
  if ($n -lt $need[$k]) { Remove-Item $test -Force; Write-Error "描画されていません: $k ($n 件)" }
  "OK  $k $n 件"
}
# crashBox は正常時 hidden のまま。属性が消えていたら中身にエラーが入っている
if ($html -match 'id="crashBox"([^>]*)>') {
  if ($matches[1] -notmatch 'hidden') {
    Remove-Item $test -Force; Write-Error "画面にエラーが表示されています（crashBox が開いています）"
  }
} else { Remove-Item $test -Force; Write-Error "crashBox が見つかりません" }
"OK  crashBox は閉じたまま"

Remove-Item $test -Force
Write-Host "`n通りました。git push して大丈夫です。" -ForegroundColor Green
