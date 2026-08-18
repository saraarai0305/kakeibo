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
window.addEventListener("load", () => setTimeout(async () => {
  const visible = selector => Array.from(document.querySelectorAll(selector)).find(node => {
    const style = getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length;
  });
  const tap = (selector, label) => {
    const el = visible(selector);
    if (!el) throw new Error("UI smoke: " + label);
    el.click();
  };
  const openHomeGroup = (id, label) => {
    const el = visible(`[data-v2-home-group-toggle="${id}"]`);
    if (!el) throw new Error("UI smoke: " + label);
    if (el.getAttribute("aria-expanded") !== "true") el.click();
  };
  const closeHomeGroup = (id, label) => {
    const el = visible(`[data-v2-home-group-toggle="${id}"]`);
    if (!el) throw new Error("UI smoke: " + label);
    if (el.getAttribute("aria-expanded") === "true") el.click();
  };
  const setValue = (selector, value, label) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error("UI smoke: " + label);
    el.value = value;
    el.dispatchEvent(new Event("input", {bubbles:true}));
  };
  const selectValue = (selector, value, label) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error("UI smoke: " + label);
    el.value = value;
    el.dispatchEvent(new Event("change", {bubbles:true}));
  };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  try {
    openHomeGroup('life', "home → life group");
    tap('[data-v2-go="moneyRecord"]', "home → 支出・収入");
    if (!document.querySelector('#v2Amount')) throw new Error("UI smoke: money form");
    tap('[data-v2-moneytype="borrowing"]', "money → borrowing");
    if (!document.querySelector('#v2Borrower') || !document.querySelector('[data-v2-money-save]')?.textContent.includes('借入')) throw new Error("UI smoke: borrowing form");
    tap('[data-v2-moneytype="expense"]', "borrowing → expense");
    tap('[data-v2-back]', "支出・収入 → home");
    closeHomeGroup('life', "home → compact life group");
    if (document.querySelectorAll('.an-home-group').length !== 3) throw new Error("UI smoke: home groups");
    if (!document.querySelector('.an-home-group.work')?.textContent.includes('仕事') || !document.querySelector('.an-home-group.life')?.textContent.includes('生活') || !document.querySelector('.an-home-group.review')?.textContent.includes('見える化')) throw new Error("UI smoke: group labels");
    if (document.querySelectorAll('.an-home-shortcut').length !== 3 || document.querySelectorAll('.an-home-group-list:not([hidden]) .an-choice').length) throw new Error("UI smoke: compact home defaults");
    openHomeGroup('work', "home → work group");
    tap('[data-v2-go="workLog"]', "home → work log");
    if (document.querySelectorAll('[data-v2-work-punch]').length !== 4) throw new Error("UI smoke: work punch controls");
    setValue('#v2WorkStart', '09:00', "work start");
    setValue('#v2WorkEnd', '18:00', "work end");
    setValue('#v2WorkBreak', '60', "work break");
    if (document.querySelector('[data-v2-work-net]')?.textContent !== "8時間0分") {
      throw new Error("UI smoke: net work duration");
    }
    if (document.querySelectorAll('[data-v2-work-time-save]').length !== 2) throw new Error("UI smoke: work time confirm controls");
    const workStartConfirm = document.querySelector('[data-v2-work-time-save="start"]');
    const workEndConfirm = document.querySelector('[data-v2-work-time-save="end"]');
    if (!workStartConfirm?.disabled && !workEndConfirm?.disabled) {
      tap('[data-v2-work-time-save="start"]', "confirm work start");
      await pause(100);
      if (!document.querySelector('[data-v2-work-time-save="start"]')?.textContent.includes('変更')) throw new Error("UI smoke: confirmed work start label");
      tap('[data-v2-work-time-save="end"]', "confirm work end");
      await pause(100);
      if (!document.querySelector('[data-v2-work-time-save="end"]')?.textContent.includes('変更')) throw new Error("UI smoke: confirmed work end label");
    } else if (!workStartConfirm?.textContent.includes('確定') || !workEndConfirm?.textContent.includes('確定')) {
      throw new Error("UI smoke: read-only work time labels");
    }
    tap('[data-v2-back]', "work log → home");
    tap('[data-v2-go="flow"]', "today → flow");
    if (!document.querySelector('.v2-timeline')) throw new Error("UI smoke: flow timeline");
    if (document.querySelectorAll('[data-v2-flow-filter]').length !== 3) throw new Error("UI smoke: flow filters");
    if (!document.querySelector('.an-flow-filter-note')?.textContent.includes('共通')) throw new Error("UI smoke: common default flow filter");
    tap('[data-v2-flow-filter="common"]', "flow → common filter");
    if (!document.querySelector('.an-flow-filter-note')?.textContent.includes('共通')) throw new Error("UI smoke: common flow filter");
    tap('[data-v2-flow-filter="life"]', "common → life filter");
    const lifeModeButton = document.querySelector('.an-flow-filter button.on');
    const lifeTimelineIcon = document.querySelector('.an-timeline-section h2 .v2-icon');
    if (getComputedStyle(lifeModeButton).backgroundColor !== 'rgb(79, 152, 111)' || getComputedStyle(lifeTimelineIcon).color !== 'rgb(79, 152, 111)') throw new Error("UI smoke: life mode color token");
    tap('[data-v2-flow-filter="common"]', "life → common filter");
    const commonModeButton = document.querySelector('.an-flow-filter button.on');
    const commonTimelineIcon = document.querySelector('.an-timeline-section h2 .v2-icon');
    if (getComputedStyle(commonModeButton).backgroundColor !== 'rgb(210, 127, 67)' || getComputedStyle(commonTimelineIcon).color !== 'rgb(210, 127, 67)') throw new Error("UI smoke: common mode color token");
    tap('[data-v2-flow-filter="work"]', "common → work filter");
    if (!document.querySelector('[data-v2-plan-open]')?.textContent.includes('仕事内容を追加する')) throw new Error("UI smoke: work add label");
    tap('[data-v2-plan-open]', "flow → add work");
    selectValue('#v2TimelineKind', 'work-new', "new work catalog kind");
    setValue('#v2TimelineNewProject', 'UI smoke project', "new work project");
    setValue('#v2TimelineWorkName', 'UI smoke work', "new work item");
    setValue('#v2PlanFrom', '14:00', "work plan start");
    setValue('#v2PlanTo', '15:00', "work plan end");
    tap('[data-v2-timeline-save]', "save work catalog");
    await pause(100);
    const newWorkEvent = Array.from(document.querySelectorAll('.v2-event')).find(el => el.textContent.includes('UI smoke work'));
    if (!newWorkEvent || !newWorkEvent.textContent.includes('14:00 - 15:00') || /優先|未着手|UI smoke project/.test(newWorkEvent.textContent)) throw new Error("UI smoke: work card label and time only");
    if (!newWorkEvent.getAttribute('style')?.includes('#d2a449')) throw new Error("UI smoke: next priority color token");
    const workEvent = document.querySelector('[data-v2-event-work-item-id]');
    if (!workEvent) throw new Error("UI smoke: editable work event");
    workEvent.click();
    await pause(100);
    if (!document.querySelector('[data-v2-event-work-item-id].is-selected') || document.querySelectorAll('.v2-event.is-selected .v2-event-resize').length !== 2 || !document.querySelector('.v2-event.is-selected [data-v2-event-edit]')?.textContent.includes('予定を編集') || document.querySelector('.an-flow-edit-toolbar') || document.querySelector('[data-v2-event-sheet-layer]')) throw new Error("UI smoke: event select handles");
    document.querySelector('.an-flow-filter').click();
    await pause(100);
    if (document.querySelector('.v2-event.is-selected')) throw new Error("UI smoke: outside tap clears selection");
    const selectedWorkEvent = Array.from(document.querySelectorAll('[data-v2-event-work-item-id]')).find(el => el.textContent.includes('UI smoke work'));
    if (!selectedWorkEvent) throw new Error("UI smoke: reselect work event");
    selectedWorkEvent.click();
    await pause(80);
    document.querySelector('[data-v2-event-work-item-id].is-selected [data-v2-event-edit]')?.click();
    await pause(100);
    if (!document.querySelector('#v2EventPriority') || !document.querySelector('#v2EventStatus')) throw new Error("UI smoke: event priority/status edit");
    tap('[data-v2-event-save]', "save selected event");
    await pause(100);
    if (!document.querySelector('[data-v2-flow-undo]')) throw new Error("UI smoke: event undo available");
    tap('[data-v2-flow-undo]', "undo selected event change");
    await pause(100);
    if (document.querySelector('[data-v2-flow-undo]')) throw new Error("UI smoke: event undo consumed");
    tap('[data-v2-plan-open]', "open existing work planner");
    selectValue('#v2TimelineKind', 'work-existing', "existing work catalog kind");
    const existingWork = document.querySelector('#v2TimelineExistingWork option:not([value=""])');
    if (!existingWork) throw new Error("UI smoke: existing work option");
    selectValue('#v2TimelineExistingWork', existingWork.value, "existing work select");
    setValue('#v2PlanFrom', '15:00', "existing work plan start");
    setValue('#v2PlanTo', '16:00', "existing work plan end");
    tap('[data-v2-timeline-save]', "save existing work plan");
    await pause(100);
    const workCards = Array.from(document.querySelectorAll('[data-v2-event-work-item-id]')).filter(el => el.textContent.includes('UI smoke work'));
    if (workCards.length < 2 || new Set(workCards.map(el => el.dataset.v2EventWorkItemId)).size !== 1) throw new Error("UI smoke: existing work reuses catalog id");
    tap('[data-v2-flow-filter="common"]', "work → common flow");
    const addTestPlan = async label => {
      tap('[data-v2-plan-open]', "open overlap planner");
      selectValue('#v2TimelineKind', 'plan', "overlap plan kind");
      setValue('#v2PlanText', label, "overlap plan text");
      setValue('#v2PlanFrom', '09:00', "overlap plan start");
      setValue('#v2PlanTo', '11:00', "overlap plan end");
      tap('[data-v2-timeline-save]', "save overlap plan");
      await pause(80);
    };
    await addTestPlan('UI smoke overlap 1');
    await addTestPlan('UI smoke overlap 2');
    await addTestPlan('UI smoke overlap 3');
    if (document.querySelectorAll('.v2-event').length < 3 || !Array.from(document.querySelectorAll('.v2-event')).some(el => el.getAttribute('style')?.includes('--event-width:calc(33'))) throw new Error("UI smoke: three-column overlap layout");
    tap('[data-v2-plan-open]', "open recurring planner");
    selectValue('#v2TimelineKind', 'daily', "recurring plan kind");
    setValue('#v2PlanText', 'UI smoke daily', "recurring plan text");
    setValue('#v2PlanFrom', '12:00', "recurring plan start");
    setValue('#v2PlanTo', '13:00', "recurring plan end");
    tap('[data-v2-timeline-save]', "save recurring plan");
    await pause(80);
    const dailyEvent = Array.from(document.querySelectorAll('.v2-event')).find(el => el.textContent.includes('UI smoke daily'));
    if (!dailyEvent) throw new Error("UI smoke: recurring event");
    dailyEvent.click();
    await pause(80);
    if (!document.querySelector('.v2-event.is-selected') || document.querySelectorAll('.v2-event.is-selected .v2-event-resize').length !== 2) throw new Error("UI smoke: recurring event select");
    document.querySelector('.v2-event.is-selected [data-v2-event-edit]')?.click();
    await pause(80);
    if (!document.querySelector('[data-v2-event-delete]')?.textContent.includes('毎日の予定から削除')) throw new Error("UI smoke: recurring delete label");
    tap('[data-v2-event-close]', "close recurring editor");
    tap('[data-v2-back]', "flow → home after work catalog");
    openHomeGroup('work', "home → work group for board");
    tap('[data-v2-go="workBoard"]', "home → work board");
    if (!document.querySelector('.an-work-group.next') || !document.querySelector('.an-work-group.now') || !document.querySelector('.an-work-group.someday') || !document.querySelector('.an-work-group.waiting')) throw new Error("UI smoke: work priority groups");
    const priorityOrder = Array.from(document.querySelectorAll('.an-work-group h2')).map(el => el.textContent.trim()).join('|');
    if (priorityOrder !== '今すぐやる|次にやる|いつかやる・たぶんやる|待ち') throw new Error("UI smoke: priority order");
    if (document.querySelectorAll('.an-work-item').length < 1) throw new Error("UI smoke: registered existing work group");
    if (!Array.from(document.querySelectorAll('.an-work-group')).some(el => el.textContent.includes('UI smoke work'))) throw new Error("UI smoke: work board item");
    if (!document.querySelector('.an-work-projects')) throw new Error("UI smoke: project reference section");
    const projectEdit = visible('[data-v2-work-project-edit]');
    if (projectEdit) {
      projectEdit.click();
      await pause(60);
      if (!document.querySelector('[data-v2-work-project-name]')) throw new Error("UI smoke: project rename editor");
      tap('[data-v2-work-project-name-cancel]', "cancel project rename");
    }
    const itemEdit = visible('[data-v2-work-item-edit]');
    if (itemEdit) {
      itemEdit.click();
      await pause(60);
      if (!document.querySelector('[data-v2-work-item-name]')) throw new Error("UI smoke: work item rename editor");
      tap('[data-v2-work-item-name-cancel]', "cancel work item rename");
    }
    const smokePriority = Array.from(document.querySelectorAll('[data-v2-work-priority]')).find(el => el.closest('.an-work-item')?.textContent.includes('UI smoke work'));
    if (!smokePriority) throw new Error("UI smoke: work priority control");
    smokePriority.value = 'now';
    smokePriority.dispatchEvent(new Event('change', {bubbles:true}));
    await pause(100);
    if (!document.querySelector('.an-work-group.now')?.textContent.includes('UI smoke work')) throw new Error("UI smoke: work priority regroup");
    tap('[data-v2-back]', "work board → home");
    tap('[data-v2-go="flow"]', "home → flow after work board");
    tap('[data-v2-flow-filter="work"]', "flow → work priority color");
    const linkedPriorityEvent = Array.from(document.querySelectorAll('[data-v2-event-work-item-id]')).find(el => el.textContent.includes('UI smoke work'));
    if (!linkedPriorityEvent || !linkedPriorityEvent.getAttribute('style')?.includes('#c85d54')) throw new Error("UI smoke: linked priority color update");
    tap('[data-v2-back]', "flow → home before linked work log");
    openHomeGroup('work', "home → work group for linked log");
    tap('[data-v2-go="workLog"]', "today → linked work log");
    if (!document.querySelector('#v2WorkProjectAdd') || !document.querySelector('[data-v2-work-project-row]') || !document.querySelector('[data-v2-work-item-for-project]') || document.querySelectorAll('.an-work-check').length || document.querySelectorAll('input[type="checkbox"][data-v2-work-project]').length) throw new Error("UI smoke: linked work catalog");
    if (!Array.from(document.querySelectorAll('[data-v2-work-item-for-project] option')).some(o => o.textContent.includes('UI smoke work'))) throw new Error("UI smoke: linked work item option");
    if (document.querySelectorAll('[data-v2-work-project-row]').length < 2) {
      const projectAdd = document.querySelector('#v2WorkProjectAdd');
      const nextProject = Array.from(projectAdd?.options || []).find(option => option.value);
      if (!nextProject) throw new Error("UI smoke: second work project option");
      selectValue('#v2WorkProjectAdd', nextProject.value, "add second work project");
      await pause(80);
    }
    if (document.querySelectorAll('[data-v2-work-project-row]').length < 2 || !Array.from(document.querySelectorAll('[data-v2-work-project-row]')).every(row => row.textContent.trim())) throw new Error("UI smoke: multiple work projects");
    tap('[data-v2-back]', "linked work log → today");
    tap('[data-v2-go="flow"]', "today → flow after linked work log");
    tap('[data-v2-go="calendar"]', "flow → calendar");
    tap('[data-v2-cal-mode="month"]', "calendar month mode");
    if (!document.querySelector('.an-calendar-month-grid') || !document.querySelector('[data-v2-cal-nav="-1"]') || !document.querySelector('[data-v2-cal-today]')) throw new Error("UI smoke: month calendar controls");
    if (!document.querySelector('.an-calendar-month-summary') || !document.querySelector('.an-calendar-upcoming-list')) throw new Error("UI smoke: month calendar overview");
    tap('[data-v2-cal-mode="week"]', "calendar week mode");
    if (document.querySelectorAll('.an-calendar-week-spot').length !== 7 || document.querySelectorAll('.an-calendar-day-card').length !== 7) throw new Error("UI smoke: week calendar agenda");
    tap('[data-v2-cal-lane="work"]', "calendar work filter");
    if (document.querySelector('.an-calendar-filter button.on')?.dataset.v2CalLane !== 'work') throw new Error("UI smoke: calendar lane filter");
    tap('[data-v2-cal-lane="common"]', "calendar common filter");
    tap('[data-v2-back]', "calendar → flow");
    tap('[data-v2-back]', "flow → home");
    openHomeGroup('life', "home → life group for health");
    tap('[data-v2-go="healthRecord"]', "home → health record");
    if (!document.querySelector('#v2HealthDate') || !document.querySelector('[data-v2-health-save="steps"]')) throw new Error("UI smoke: health date selector");
    selectValue('#v2HealthDate', '2099-01-02', "health record date");
    if (document.querySelector('#v2HealthDate')?.value !== '2099-01-02') throw new Error("UI smoke: health later-date switch");
    if (!document.querySelector('[data-v2-health-save="steps"]')?.textContent.includes('保存')) throw new Error("UI smoke: health save label");
    tap('[data-v2-rate="body"][data-v2-value="3"]', "health body rating");
    tap('[data-v2-health-save="body"]', "save later-date health body");
    await pause(80);
    if (!document.querySelector('[data-v2-health-save="body"]')?.textContent.includes('変更')) throw new Error("UI smoke: health change label");
    tap('[data-v2-back]', "health record → home");
    openHomeGroup('review', "home → review group for health analysis");
    tap('[data-v2-go="healthAnalysis"]', "home → health analysis");
    if (!document.querySelector('.v2-line-chart')) throw new Error("UI smoke: health chart");
    if (document.querySelectorAll('[data-v2-metric]').length !== 4 || !document.querySelector('[data-v2-metric="sleep"]') || !document.querySelector('[data-v2-metric="steps"]') || !document.querySelector('[data-v2-metric="body"]') || !document.querySelector('[data-v2-metric="mind"]') || document.querySelector('[data-v2-metric="work"]') || document.querySelector('[data-v2-metric="break"]')) throw new Error("UI smoke: four health metrics only");
    tap('[data-v2-health-analysis]', "health analysis report");
    await pause(80);
    const reportText = document.querySelector('.v2-health-ai')?.textContent || '';
    for (const section of ['使用したデータ','欠けているデータ','観察できた傾向','根拠の強さ','推測にすぎない部分','次に試せる小さな行動']) {
      if (!reportText.includes(section)) throw new Error("UI smoke: explainable health report " + section);
    }
    if (!reportText.includes('AI連携未接続')) throw new Error("UI smoke: local-only analysis notice");
    tap('[data-v2-back]', "health analysis → home");
    openHomeGroup('review', "home → review group for money analysis");
    tap('[data-v2-go="moneyAnalysis"]', "visualize → money analysis");
    if (!document.querySelector('.v2-chart-block') || !document.querySelector('[data-v2-money-month-label]')) throw new Error("UI smoke: monthly money analysis");
    tap('[data-v2-money-month="-1"]', "money analysis → previous month");
    if (!document.querySelector('[data-v2-money-month-label]')) throw new Error("UI smoke: monthly navigation");
    tap('[data-v2-back]', "money analysis → home");
    tap('[data-v2-go="settings"]', "home → settings");
    if (!document.querySelector('.v2-settings')) throw new Error("UI smoke: settings");
    document.documentElement.dataset.uiSmoke = "ok";
  } catch (error) {
    document.documentElement.dataset.uiSmoke = "failed: " + error.message;
  }
}, 800));
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

if ($uiV2 -notmatch 'press\.timer\s*=\s*setTimeout') { Write-Error "予定中央の長押しタイマーがありません" }
"OK  予定中央の長押しタイマーあり"
if ($uiV2 -notmatch 'flowDragClickGuard' -or $uiV2 -notmatch 'flowDragClickGuard=true' -or $uiV2 -notmatch 'flowDragClickGuard=false') { Write-Error "ドラッグ後クリック抑制がありません" }
"OK  ドラッグ後クリック抑制あり"
if ($uiV2 -notmatch 'syncEventTimePreview' -or $uiV2 -notmatch 'syncEventTimePreview\(e\.target\)' -or $uiV2 -notmatch 'addEventListener\("change"') { Write-Error "時間ピッカーの表示同期がinput/change共通処理になっていません" }
"OK  時間ピッカー表示同期あり"
if ($uiV2 -notmatch 'typeof isReadOnly.*isReadOnly\(\)' -or $uiV2 -notmatch 'selected&&writable') { Write-Error "時間割の読み取り専用ガードがありません" }
"OK  時間割の読み取り専用ガードあり"

# AI分析へ進む前の日報取り込み基盤。ファイル選択・プレビュー・明示保存を分け、
# 既存日報は専用の上書き操作に隔離し、読み取り専用端末からの保存を許さない。
if ($uiV2 -notmatch 'mainichi\.daily-report\.v1' -or $uiV2 -notmatch 'data-v2-work-log-import-confirm' -or $uiV2 -notmatch 'data-v2-work-log-import-overwrite' -or $uiV2 -notmatch '既存の日報があります。内容を確認すると' -or $uiV2 -notmatch 'if\(!canWrite\(\)' -or $uiV2 -notmatch 'actualWorkMinutes' -or $uiV2 -notmatch 'data-v2-work-log-project-resolution' -or $uiV2 -notmatch 'workLogProjectAliases' -or $uiV2 -notmatch '新規プロジェクトとして登録') { Write-Error "日報ファイル取り込みの安全契約がありません" }
"OK  日報ファイル取り込みの安全契約あり"

if ($uiV2 -notmatch 'function renameWorkProject' -or $uiV2 -notmatch 'function renameWorkItem' -or $uiV2 -notmatch 'data-v2-work-project-edit' -or $uiV2 -notmatch 'data-v2-work-item-edit' -or $uiV2 -notmatch 'workItemId===itemId') { Write-Error "仕事カタログのID保持編集契約がありません" }
"OK  仕事カタログのID保持編集契約あり"

if ($uiV2 -notmatch 'function applyWorkTimeConfirmation' -or $uiV2 -notmatch 'data-v2-work-time-save' -or $uiV2 -notmatch 'workSessions:timeRecord\.workSessions') { Write-Error "作業時間の確定と勤務区間の連動契約がありません" }
$healthSrc = $src + $uiV2
if ($healthSrc -notmatch 'stepsSource\s*=\s*"sync"' -or $healthSrc -notmatch 'stepsSavedAt' -or $src -notmatch 'saveNow\(\);[\s\S]{0,300}?render\(\)' -or $healthSrc -notmatch 'mainichiHealthAutoSaved' -or $healthSrc -notmatch 'mainichiHealthAutoPullStarted' -or $healthSrc -notmatch 'mainichiHealthAutoPullFinished' -or $healthSrc -notmatch 'pullHealthInbox\(true,\s*"startup"\)' -or $uiV2 -notmatch 'an-health-auto-status') { Write-Error "歩数自動保存・次回起動時の自動確認契約がありません" }
"OK  作業時間の確定・勤務区間連動と歩数自動保存あり"

# 現行の描画入口と最終CSS層を固定する。旧互換処理は参照確認後に段階整理する。
if ($uiV2 -notmatch 'window\.newAppRender\s*=' -or $uiV2 -match 'baseNewAppRender|renderWithSeparatedSync') { Write-Error "現行描画入口の責務が崩れています" }
$paper = Get-Content "$root\ui-paper-baseline.css" -Raw -Encoding UTF8
if ($paper -notmatch 'an-file-pick|an-import-preview') { Write-Error "日報取り込みの共通紙面層がありません" }
"OK  現行描画入口と日報取り込み紙面層あり"

$paper = Get-Content "$root\ui-paper-baseline.css" -Raw -Encoding UTF8
if ($paper -notmatch '\.an-health-date\{[^}]*justify-content:center' -or $paper -notmatch '\.an-health-date>span:first-child\{[^}]*position:absolute' -or ([regex]::Matches($paper,'\.an-health-date-control\{width:calc\(100% - var\(--health-date-side-space\)').Count -lt 2) -or $paper -notmatch '\.an-health-date-control\{[^}]*display:grid[^}]*margin-left:auto') { Write-Error "体調記録の日付枠が行全体中央の共通構造になっていません" }
"OK  体調記録の日付枠中央配置あり"
if ($uiV2 -notmatch 'benefitOverview' -or $uiV2 -notmatch 'data-v2-benefit-flip' -or $uiV2 -notmatch 'data-v2-benefit-save' -or $uiV2 -notmatch 'v2BenefitNextStart' -or $uiV2 -notmatch 'data-v2-daily-end' -or $src -notmatch 'dailyTimelineIsVisibleOn' -or $src -notmatch 'dailyTimelineEndDate') { Write-Error "毎日の予定終了日または傷病手当パネルの導線がありません" }
"OK  毎日の予定終了日と傷病手当パネルあり"
if ($uiV2 -notmatch 'function isWorkScheduleEvent' -or $uiV2 -notmatch 'function futureWorkScheduleCount' -or $uiV2 -notmatch 'function deleteFutureWorkSchedules' -or $uiV2 -notmatch 'data-v2-work-future-clear' -or $paper -notmatch '\.an-flow-work-clear') { Write-Error "明日以降の仕事予定一括削除契約がありません" }
"OK  明日以降の仕事予定一括削除契約あり"
if ($uiV2 -notmatch 'DAILY_REPORT_API_KEY' -or $uiV2 -notmatch 'dailyReportApiRequest\("/v1/daily-reports/pending"\)' -or $uiV2 -notmatch 'v1/daily-reports/.+?/ack' -or $uiV2 -notmatch 'data-v2-daily-report-api-check' -or $uiV2 -notmatch 'workLogImportDraft=\{name:`共有API') { Write-Error "共有APIの日報未確認受信契約がありません" }
"OK  共有APIの日報未確認受信契約あり"

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
$test = Join-Path $env:TEMP "kakeibo-check_tmp.html"
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
# PowerShell 5.1のStart-Processは環境変数のPath/PATH重複で失敗する環境がある。
# ProcessStartInfoで標準出力・標準エラーを分け、環境を再構成せずに起動する。
# 通常のChromeプロファイルを共有すると、GPUプロセスやプロファイルロックで
# dump-domが空になるため、検査ごとに専用プロファイルを使う。
$profile = Join-Path $env:TEMP ("kakeibo-check-profile-" + [guid]::NewGuid().ToString("N"))
$args = @("--headless","--disable-gpu","--virtual-time-budget=4000",
          "--disable-software-rasterizer","--disable-gpu-compositing",
          "--no-first-run","--no-default-browser-check",
          ("--user-data-dir=" + $profile),
          "--enable-logging=stderr","--v=0","--dump-dom",
          ("file:///" + $test.Replace('\','/')))
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $chrome
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.Arguments = ($args | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }) -join ' '
$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$null = $proc.Start()
$stdout = $proc.StandardOutput.ReadToEnd()
$stderr = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()
[System.IO.File]::WriteAllText($dom, $stdout)
[System.IO.File]::WriteAllText($log, $stderr)

if ([string]::IsNullOrWhiteSpace($stdout)) {
  Remove-Item $test -Force -ErrorAction SilentlyContinue
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
  if ($stderr -match 'GPU process.*(isn.?t usable|exited unexpectedly)|GPU process isn.?t usable') {
    Write-Warning "検査用ChromeがGPUプロセスで終了したため、DOMスモークは未実施です。静的契約と実ブラウザ確認を別途通してください。"
    Write-Host "--  DOMスモーク未実施（検査環境のGPU終了）" -ForegroundColor Yellow
    exit 0
  }
  Write-Error "検査用ChromeのDOM出力が空です。検査環境を確認してください。"
}

# file:// では fetch と manifest が必ず怒られる。それ以外のコンソール出力は異常とみなす
$bad = Get-Content $log -Encoding UTF8 | Select-String "CONSOLE" |
  Where-Object { $_ -notmatch "Access to (fetch|manifest)" -and $_ -notmatch "Failed to load resource" }
if ($bad) { $bad | ForEach-Object { Write-Host $_ -ForegroundColor Red }; Remove-Item $test -Force; Write-Error "コンソールにエラーがあります" }
"OK  コンソールにエラーなし"

$html = Get-Content $dom -Raw -Encoding UTF8
if ($html -notmatch 'data-ui-smoke="ok"') {
  $smokeState = [regex]::Match($html, 'data-ui-smoke="([^"]+)"').Groups[1].Value
  if ($smokeState) { Write-Host "SMOKE $smokeState" -ForegroundColor Red }
  Remove-Item $test -Force
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
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
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "`n通りました。git push して大丈夫です。" -ForegroundColor Green
