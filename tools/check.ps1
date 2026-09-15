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
$sw = Get-Content "$root\sw.js" -Raw -Encoding UTF8
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
    const homeShortcuts = document.querySelector('.an-home-shortcuts');
    const homeGroups = document.querySelector('.an-home-groups');
    if (document.querySelectorAll('.an-home-shortcut').length !== 3 || document.querySelectorAll('.an-home-group').length !== 3 || !homeShortcuts || !homeGroups || !(homeShortcuts.compareDocumentPosition(homeGroups) & Node.DOCUMENT_POSITION_FOLLOWING)) throw new Error("UI smoke: smartphone home layout");
    if (document.querySelector('.an-home').textContent.includes('今やること') || document.querySelector('.an-home').textContent.includes('明日の予定') || document.querySelector('.an-home-focus,.an-home-tomorrow,.an-home-share')) throw new Error("UI smoke: compact home content");
    openHomeGroup('life', "home → life group");
    tap('[data-v2-go="moneyRecord"]', "home → 支出・収入");
    if (!document.querySelector('#v2Amount')) throw new Error("UI smoke: money form");
    tap('[data-v2-moneytype="borrowing"]', "money → borrowing");
    if (!document.querySelector('#v2Borrower') || !document.querySelector('[data-v2-money-save]')?.textContent.includes('借入')) throw new Error("UI smoke: borrowing form");
    tap('[data-v2-moneytype="expense"]', "borrowing → expense");
    tap('[data-v2-back]', "支出・収入 → home");
    openHomeGroup('work', "home → work group");
    tap('[data-v2-go="workLog"]', "work group → work log");
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
    if (!document.querySelector('[data-v2-event-work-item-id].is-selected')) throw new Error("UI smoke: event select handles (selected card)");
    if (document.querySelectorAll('.v2-event.is-selected .v2-event-resize').length !== 2) throw new Error("UI smoke: event select handles (resize handles)");
    // 「予定を編集」は選んだ予定の枠の中でなく、選択中の予定の帯（an-flow-selection-panel）に出す
    if (!document.querySelector('[data-v2-flow-selection-panel] [data-v2-flow-selection-edit]')?.textContent.includes('予定を編集')) throw new Error("UI smoke: event select handles (selection panel edit)");
    if (document.querySelector('.an-flow-edit-toolbar') || document.querySelector('[data-v2-event-sheet-layer]')) throw new Error("UI smoke: event select handles (no sheet before edit)");
    document.querySelector('.an-flow-filter').click();
    await pause(100);
    if (document.querySelector('.v2-event.is-selected')) throw new Error("UI smoke: outside tap clears selection");
    const selectedWorkEvent = Array.from(document.querySelectorAll('[data-v2-event-work-item-id]')).find(el => el.textContent.includes('UI smoke work'));
    if (!selectedWorkEvent) throw new Error("UI smoke: reselect work event");
    selectedWorkEvent.click();
    await pause(80);
    tap('[data-v2-flow-selection-panel] [data-v2-flow-selection-edit]', "selection panel → edit");
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
    tap('[data-v2-flow-selection-panel] [data-v2-flow-selection-edit]', "recurring selection panel → edit");
    await pause(80);
    if (!document.querySelector('[data-v2-event-delete]')?.textContent.includes('毎日の予定から削除')) throw new Error("UI smoke: recurring delete label");
    tap('[data-v2-event-close]', "close recurring editor");
    tap('[data-v2-back]', "flow → home after work catalog");
    openHomeGroup('work', "home → work group after work catalog");
    tap('[data-v2-go="workBoard"]', "work group → work board");
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
    openHomeGroup('work', "home → work group after work board");
    tap('[data-v2-go="flow"]', "home → flow after work board");
    tap('[data-v2-flow-filter="work"]', "flow → work priority color");
    const linkedPriorityEvent = Array.from(document.querySelectorAll('[data-v2-event-work-item-id]')).find(el => el.textContent.includes('UI smoke work'));
    if (!linkedPriorityEvent || !linkedPriorityEvent.getAttribute('style')?.includes('#c85d54')) throw new Error("UI smoke: linked priority color update");
    tap('[data-v2-back]', "flow → home before linked work log");
    openHomeGroup('work', "home → work group before linked work log");
    tap('[data-v2-go="workLog"]', "work group → linked work log");
    if (!document.querySelector('#v2WorkProjectAdd')) throw new Error("UI smoke: linked work catalog (project add)");
    if (!document.querySelector('[data-v2-work-project-row]')) throw new Error("UI smoke: linked work catalog (project row)");
    // 仕事内容は選択でなく案件ごとの自由記述（c4579c0）。選んでいた仕事の id は行の data-v2-work-item に残る
    if (!document.querySelector('[data-v2-work-project-row] [data-v2-work-description]')) throw new Error("UI smoke: linked work catalog (description)");
    if (document.querySelectorAll('.an-work-check').length || document.querySelectorAll('input[type="checkbox"][data-v2-work-project]').length) throw new Error("UI smoke: linked work catalog (no legacy checks)");
    const smokeWorkIds = (S.workItems || []).filter(item => item.name === 'UI smoke work').map(item => item.id);
    if (!Array.from(document.querySelectorAll('[data-v2-work-project-row]')).some(row => smokeWorkIds.includes(row.dataset.v2WorkItem))) throw new Error("UI smoke: linked work item");
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
    openHomeGroup('review', "home → visualize group");
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
    openHomeGroup('review', "home → visualize group before money analysis");
    tap('[data-v2-go="moneyAnalysis"]', "visualize → money analysis");
    if (!document.querySelector('.v2-chart-block') || !document.querySelector('[data-v2-money-month-label]')) throw new Error("UI smoke: monthly money analysis");
    tap('[data-v2-money-month="-1"]', "money analysis → previous month");
    if (!document.querySelector('[data-v2-money-month-label]')) throw new Error("UI smoke: monthly navigation");
    tap('[data-v2-back]', "money analysis → home");
    tap('[data-v2-go="settings"]', "home → settings");
    if (!document.querySelector('.v2-settings')) throw new Error("UI smoke: settings");
    // 端末どうしの同期: 偽の同期先で、足し合わせ・消した記録・打刻・読み取り専用を確かめる
    const clone = value => JSON.parse(JSON.stringify(value));
    const idsOf = list => (list || []).map(item => item.id).sort().join(",");
    const errand = (id, text) => ({id, text, note:"", due:"", from:"", to:"", prio:"n", done:false, doneAt:null, plan:null});
    // 1) 片方で支出を足して1件消す／もう片方で予定を足して支出を直す
    const base1 = {accounts:[{id:"a1", bal:1000}], spends:[{id:"s1", amt:100}, {id:"s2", amt:200}], plan:{"2099-01-01":[{id:"p1", text:"a"}]}, savedAt:"2099-01-01T00:00:00Z"};
    const local1 = clone(base1); local1.spends.push({id:"s3", amt:300}); local1.spends = local1.spends.filter(item => item.id !== "s2"); local1.accounts[0].bal = 900; local1.savedAt = "2099-01-01T00:01:00Z";
    const remote1 = clone(base1); remote1.plan["2099-01-01"].push({id:"p2", text:"b"}); remote1.spends[0].amt = 150; remote1.accounts[0].bal = 800; remote1.savedAt = "2099-01-01T00:02:00Z";
    const merged1 = mergeSyncData(base1, local1, remote1);
    if (idsOf(merged1.spends) !== "s1,s3" || merged1.spends.find(item => item.id === "s1").amt !== 150 || idsOf(merged1.plan["2099-01-01"]) !== "p1,p2") throw new Error("UI smoke: sync merge adds and deletes");
    if (merged1.accounts?.[0]?.bal !== 700) throw new Error("UI smoke: sync merge adds both balance changes");
    // 2) 同じ日の日報: PC で取り込んだ中身と、iPhone の打刻がぶつかる
    const pc = {workLogs:{"2099-01-02":{implementation:"日報の中身", start:"", end:"", breakMinutes:60, actualWorkMinutes:300}}, savedAt:"2099-01-02T10:00:00Z"};
    const phone = {workLogs:{"2099-01-02":{implementation:"", start:"09:00", end:"18:00", breakMinutes:45, actualWorkMinutes:495, workSessions:[{start:"09:00", end:"18:00"}]}}, savedAt:"2099-01-02T09:00:00Z"};
    const day2 = mergeSyncData(null, pc, phone).workLogs["2099-01-02"];
    if (day2.implementation !== "日報の中身" || day2.start !== "09:00" || day2.end !== "18:00" || day2.breakMinutes !== 45 || day2.actualWorkMinutes !== 495 || day2.workSessions?.length !== 1) throw new Error("UI smoke: sync merge keeps phone timing");
    const savedFetch = window.fetch, savedCfg = localStorage.getItem(SYNC_KEY), savedBefore = localStorage.getItem("mainichi.before-sync"), savedS = clone(S);
    let gistContent = null, patches = 0;
    window.fetch = async (url, opts) => {
      if (!String(url).startsWith("https://api.github.com/gists/smoke")) return savedFetch(url, opts);
      if (opts && opts.method === "PATCH") { gistContent = JSON.parse(opts.body).files[GIST_FILE].content; patches++; }
      return {ok:true, status:200, json: async () => ({files:{[GIST_FILE]:{content:gistContent}}})};
    };
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify({token:"smoke", gistId:"smoke", role:"rw"}));
      // 3) 08-13 の再現: 相手が日報を足した後に、こちらが体調を保存して送っても、相手の日報は消えない
      const agreed = clone(S); agreed.savedAt = "2099-02-01T00:00:00Z";
      S = normalize(clone(agreed)); setSyncBase(agreed);
      const other = clone(agreed); other.workLogs["2099-02-02"] = {implementation:"相手の日報"}; other.savedAt = "2099-02-01T00:05:00Z";
      gistContent = JSON.stringify(other);
      S.health["2099-02-03"] = Object.assign({}, S.health["2099-02-03"], {steps:1234}); S.savedAt = "2099-02-01T00:06:00Z";
      await pushRemote();
      const sent = JSON.parse(gistContent);
      if (patches !== 1 || sent.workLogs?.["2099-02-02"]?.implementation !== "相手の日報" || sent.health?.["2099-02-03"]?.steps !== 1234 || S.workLogs["2099-02-02"]?.implementation !== "相手の日報") throw new Error("UI smoke: sync push merges other device");
      // 4) 受け取り: こちらが変えていなければ相手に合わせ、両方が変えていれば足し合わせる（相手が消した記録は戻さない）
      const other2 = clone(sent); other2.errands = (other2.errands || []).concat([errand("smoke-remote", "相手の用事")]); other2.savedAt = "2099-02-01T00:07:00Z";
      gistContent = JSON.stringify(other2);
      await pullRemote(true);
      if (!S.errands.some(item => item.id === "smoke-remote")) throw new Error("UI smoke: sync pull adopts remote");
      S.errands.push(errand("smoke-local", "こちらの用事")); S.savedAt = "2099-02-01T00:08:00Z"; localStorage.setItem(KEY, JSON.stringify(S));
      const other3 = JSON.parse(gistContent); other3.errands = other3.errands.filter(item => item.id !== "smoke-remote"); other3.savedAt = "2099-02-01T00:09:00Z";
      gistContent = JSON.stringify(other3);
      await pullRemote(true);
      clearTimeout(syncTimer);
      if (!S.errands.some(item => item.id === "smoke-local") || S.errands.some(item => item.id === "smoke-remote")) throw new Error("UI smoke: sync pull merges both sides");
      // 5) 読み取り専用の端末は、自分の変更があっても相手に合わせ、送らない
      localStorage.setItem(SYNC_KEY, JSON.stringify({token:"smoke", gistId:"smoke", role:"ro"}));
      S.errands.push(errand("smoke-ro", "見るだけの端末の用事"));
      const patchesBefore = patches;
      await pullRemote(true);
      await pushRemote();
      if (S.errands.some(item => item.id === "smoke-ro") || S.errands.some(item => item.id === "smoke-local") || patches !== patchesBefore) throw new Error("UI smoke: sync read-only adopts remote");
    } finally {
      window.fetch = savedFetch;
      clearTimeout(syncTimer);
      if (savedCfg === null) localStorage.removeItem(SYNC_KEY); else localStorage.setItem(SYNC_KEY, savedCfg);
      if (savedBefore === null) localStorage.removeItem("mainichi.before-sync"); else localStorage.setItem("mainichi.before-sync", savedBefore);
      localStorage.removeItem(SYNC_BASE_KEY);
      S = normalize(savedS); localStorage.setItem(KEY, JSON.stringify(S)); render();
    }
    // 日報の受信箱の自動取り込み（2026-09-15 社長 案1）: 偽の受信箱で、自動で入る日と、止める3つと、押す取り込みを確かめる
    {
      const INBOX = "https://smoke-inbox.test", REPORT_API_KEY = "mainichi.daily-report-api", DRAFT_KEY = "mainichi.worklog-draft.v1";
      const savedFetch2 = window.fetch, savedApi = localStorage.getItem(REPORT_API_KEY), savedDraft = localStorage.getItem(DRAFT_KEY), savedS2 = clone(S);
      let inbox = [], acks = [];
      const report = (date, projectName, done) => ({format:"mainichi.daily-report.v1", date, start:"", end:"", breakMinutes:0, projects:[{projectName, done}]});
      window.fetch = async (url, opts) => {
        const u = String(url);
        if (!u.startsWith(INBOX)) return savedFetch2(url, opts);
        if (u.endsWith("/v1/daily-reports/pending")) return {ok:true, status:200, json: async () => ({reports: inbox.map(item => ({id:item.date, report:item}))})};
        const ack = u.match(/\/v1\/daily-reports\/([^/]+)\/ack$/);
        if (ack) { const id = decodeURIComponent(ack[1]); acks.push(id); inbox = inbox.filter(item => item.date !== id); return {ok:true, status:200, json: async () => ({status:"imported"})}; }
        return {ok:false, status:404, json: async () => ({})};
      };
      const checkInbox = async label => {
        newAppRender();
        const button = document.querySelector('[data-v2-daily-report-api-check]');
        if (!button || button.disabled) throw new Error("UI smoke: daily report check button (" + label + ")");
        button.click();
        // 偽の受信箱は時計を待たずに返す。検査の Chrome は仮想の時間4秒で DOM を書き出すので、待ちは短くする
        await pause(60);
      };
      const cancelDraft = label => {
        const button = document.querySelector('[data-v2-work-log-import-cancel]');
        if (!button) throw new Error("UI smoke: daily report draft cancel (" + label + ")");
        button.click();
      };
      const homeHas = (selector, label) => {
        tap('[data-v2-back]', "settings → home (" + label + ")");
        const found = Boolean(document.querySelector(selector));
        tap('[data-v2-go="settings"]', "home → settings (" + label + ")");
        return found;
      };
      try {
        localStorage.setItem(REPORT_API_KEY, JSON.stringify({endpoint:INBOX, token:"smoke"}));
        S.workProjects = (S.workProjects || []).concat([{id:"smoke-report-project", name:"UI smoke 日報の案件", color:"#7AA7F0", note:""}]);
        const timing = {start:"09:00", end:"18:00", breakMinutes:45, actualWorkMinutes:495, workSessions:[{start:"09:00", end:"18:00"}]};
        // 1) 打刻だけの日（字の無い下書きあり）は、押さずに入り、打刻が残り、受信箱へ確認済みを送る
        S.workLogs["2099-03-01"] = clone(timing);
        localStorage.setItem(DRAFT_KEY, JSON.stringify({day:"2099-03-01", data:Object.assign(clone(timing), {projectIds:[], workItemIds:[], workDescriptions:{}, projectReviews:{}, done:""}), updatedAt:Date.now()}));
        inbox = [report("2099-03-01", "UI smoke 日報の案件", "自動の中身")];
        await checkInbox("auto");
        const day1 = S.workLogs["2099-03-01"];
        if (!JSON.stringify(day1?.projectReviews || {}).includes("自動の中身") || acks.join(",") !== "2099-03-01") throw new Error("UI smoke: daily report auto import");
        if (day1.start !== "09:00" || day1.end !== "18:00" || day1.breakMinutes !== 45 || day1.actualWorkMinutes !== 495 || day1.workSessions?.length !== 1) throw new Error("UI smoke: daily report auto import keeps timing");
        if (!homeHas('[data-v2-daily-report-imported]', "auto") ) throw new Error("UI smoke: daily report auto import home line");
        // 2) その日に中身がある日は入れずに知らせを出す。確認画面で上書きを押すと入る（押す取り込みは今のまま）
        S.workLogs["2099-03-02"] = Object.assign(clone(timing), {projectIds:["smoke-report-project"], projectReviews:{"smoke-report-project":{done:"手で書いた中身"}}});
        const before2 = JSON.stringify(S.workLogs["2099-03-02"]);
        inbox = [report("2099-03-02", "UI smoke 日報の案件", "日報の中身")];
        await checkInbox("existing content");
        const toastText = () => document.getElementById("toast")?.textContent || "";
        if (JSON.stringify(S.workLogs["2099-03-02"]) !== before2 || acks.includes("2099-03-02") || !toastText().includes("理由: その日に中身がある")) throw new Error("UI smoke: daily report stops on existing content");
        if (!homeHas('[data-v2-daily-report-open]', "existing content")) throw new Error("UI smoke: daily report notice on existing content");
        const overwrite = document.querySelector('[data-v2-work-log-import-confirm][data-v2-work-log-import-overwrite]');
        if (!overwrite || overwrite.disabled) throw new Error("UI smoke: daily report manual overwrite button");
        overwrite.click();
        await pause(60);
        if (!JSON.stringify(S.workLogs["2099-03-02"]?.projectReviews || {}).includes("日報の中身") || S.workLogs["2099-03-02"].start !== "09:00" || !acks.includes("2099-03-02")) throw new Error("UI smoke: daily report manual import");
        // 3) 知らない案件名は入れない
        inbox = [report("2099-03-03", "UI smoke 知らない案件", "知らない案件の中身")];
        await checkInbox("unknown project");
        // 確定の処理も未解決の案件を断るので、止めた理由の字で自動の側の判定を見る
        if (S.workLogs["2099-03-03"] || acks.includes("2099-03-03") || !document.querySelector('[data-v2-work-log-import-cancel]') || !toastText().includes("理由: 知らない案件名")) throw new Error("UI smoke: daily report stops on unknown project");
        cancelDraft("unknown project");
        // 4) その日の下書きに字がある日は入れない（取り込みは下書きを捨てるため）
        S.workLogs["2099-03-04"] = clone(timing);
        localStorage.setItem(DRAFT_KEY, JSON.stringify({day:"2099-03-04", data:Object.assign(clone(timing), {done:"書きかけ"}), updatedAt:Date.now()}));
        inbox = [report("2099-03-04", "UI smoke 日報の案件", "下書きの日の中身")];
        await checkInbox("draft text");
        if (JSON.stringify(S.workLogs["2099-03-04"]).includes("下書きの日の中身") || acks.includes("2099-03-04") || !String(localStorage.getItem(DRAFT_KEY)).includes("書きかけ") || !toastText().includes("理由: その日の下書きに字がある")) throw new Error("UI smoke: daily report stops on draft text");
        cancelDraft("draft text");
      } finally {
        window.fetch = savedFetch2;
        if (savedApi === null) localStorage.removeItem(REPORT_API_KEY); else localStorage.setItem(REPORT_API_KEY, savedApi);
        if (savedDraft === null) localStorage.removeItem(DRAFT_KEY); else localStorage.setItem(DRAFT_KEY, savedDraft);
        S = normalize(savedS2); localStorage.setItem(KEY, JSON.stringify(S)); render();
      }
    }
    // 勤怠の割合（2026-09-15 社長 案3）: 読み込みの整え・取り込み・その日の割合を残す・形の違い・月の分析・画面で直して保存・同期先への反映の付け替え
    {
      const tidy = normalize({workLogs:{"2099-04-01":{projectPercents:{a:150, b:-5, c:"あ", d:33.4, e:40}}, "2099-04-09":{start:"09:00"}}}).workLogs;
      if (Object.keys(tidy["2099-04-01"].projectPercents || {}).sort().join(",") !== "d,e" || tidy["2099-04-01"].projectPercents.d !== 33 || tidy["2099-04-01"].projectPercents.e !== 40 || Object.prototype.hasOwnProperty.call(tidy["2099-04-09"], "projectPercents")) throw new Error("UI smoke: work percent normalize");
      const INBOX3 = "https://smoke-inbox-percent.test", API_KEY3 = "mainichi.daily-report-api", DRAFT_KEY3 = "mainichi.worklog-draft.v1";
      const savedFetch3 = window.fetch, savedApi3 = localStorage.getItem(API_KEY3), savedDraft3 = localStorage.getItem(DRAFT_KEY3), savedS3 = clone(S);
      let inbox3 = [];
      window.fetch = async (url, opts) => {
        const u = String(url);
        if (!u.startsWith(INBOX3)) return savedFetch3(url, opts);
        if (u.endsWith("/v1/daily-reports/pending")) return {ok:true, status:200, json: async () => ({reports: inbox3.map(item => ({id:item.date, report:item}))})};
        const ack = u.match(/\/v1\/daily-reports\/([^/]+)\/ack$/);
        if (ack) { inbox3 = inbox3.filter(item => item.date !== decodeURIComponent(ack[1])); return {ok:true, status:200, json: async () => ({status:"imported"})}; }
        return {ok:false, status:404, json: async () => ({})};
      };
      const pull3 = async label => {
        newAppRender();
        const button = document.querySelector('[data-v2-daily-report-api-check]');
        if (!button || button.disabled) throw new Error("UI smoke: work percent check button (" + label + ")");
        button.click();
        await pause(60);
      };
      const report3 = (date, percentA, percentB) => ({format:"mainichi.daily-report.v1", date, start:"", end:"", breakMinutes:0, projects:[Object.assign({projectName:"UI smoke 割合A", done:"A の中身"}, percentA === undefined ? {} : {workPercent:percentA}), Object.assign({projectName:"UI smoke 割合B", done:"B の中身"}, percentB === undefined ? {} : {workPercent:percentB})]});
      try {
        localStorage.setItem(API_KEY3, JSON.stringify({endpoint:INBOX3, token:"smoke"}));
        localStorage.removeItem(DRAFT_KEY3);
        S.workProjects = (S.workProjects || []).concat([{id:"smoke-pct-a", name:"UI smoke 割合A", color:"#7AA7F0", note:""}, {id:"smoke-pct-b", name:"UI smoke 割合B", color:"#7AA7F0", note:""}]);
        // 1) 取り込み: 日報の workPercent がその日の記録に入る
        S.workLogs["2099-04-02"] = {start:"09:00", end:"19:00", breakMinutes:60, actualWorkMinutes:540};
        inbox3 = [report3("2099-04-02", 70, 30)];
        await pull3("import");
        const p2 = S.workLogs["2099-04-02"]?.projectPercents || {};
        if (p2["smoke-pct-a"] !== 70 || p2["smoke-pct-b"] !== 30) throw new Error("UI smoke: work percent import");
        // 2) その日に割合がすでにあれば残す（中身は入る）
        S.workLogs["2099-04-03"] = {start:"09:00", end:"13:00", breakMinutes:0, actualWorkMinutes:240, projectIds:["smoke-pct-a","smoke-pct-b"], projectPercents:{"smoke-pct-a":20, "smoke-pct-b":80}};
        inbox3 = [report3("2099-04-03", 60, 40)];
        await pull3("keep existing");
        const d3 = S.workLogs["2099-04-03"] || {};
        if (d3.projectPercents?.["smoke-pct-a"] !== 20 || d3.projectPercents?.["smoke-pct-b"] !== 80 || !JSON.stringify(d3.projectReviews || {}).includes("A の中身")) throw new Error("UI smoke: work percent import keeps existing");
        // 3) 形の違う割合（小数）は取り込まず、読み込めない理由を出す
        inbox3 = [report3("2099-04-04", 55.5, 30)];
        await pull3("invalid");
        const cancel3 = document.querySelector('[data-v2-work-log-import-cancel]');
        if (S.workLogs["2099-04-04"] || !cancel3 || !document.body.textContent.includes("workPercentは0〜100の整数")) throw new Error("UI smoke: work percent invalid stops import");
        cancel3.click();
        inbox3 = [];
        // 4) 月の分析（見本は手で計算）: 4/2 540分×70:30・4/3 240分×20:80・4/5 割合だけ＝時間の無い日・4/6 何も無い＝割合の無い日・4/7 手で入れた分 A100 B20・4/8 案件1つで60分
        S.workLogs["2099-04-05"] = {projectIds:["smoke-pct-a","smoke-pct-b"], projectPercents:{"smoke-pct-a":50, "smoke-pct-b":50}};
        S.workLogs["2099-04-06"] = {projectIds:["smoke-pct-a","smoke-pct-b"]};
        S.workLogs["2099-04-07"] = {projectIds:["smoke-pct-a","smoke-pct-b"], projectMinutes:{"smoke-pct-a":100, "smoke-pct-b":20}, projectPercents:{"smoke-pct-a":10, "smoke-pct-b":90}, actualWorkMinutes:500};
        S.workLogs["2099-04-08"] = {projectIds:["smoke-pct-a"], actualWorkMinutes:60};
        const share = window.mainichiWorkShareForMonth("2099-04");
        if (JSON.stringify(share.list.map(row => [row.name, row.minutes, row.percent])) !== JSON.stringify([["UI smoke 割合A", 586, 61], ["UI smoke 割合B", 374, 39]]) || share.total !== 960 || JSON.stringify(share.days) !== JSON.stringify({timed:4, untimed:1, none:1})) throw new Error("UI smoke: work percent month share " + JSON.stringify(share));
        tap('[data-v2-back]', "settings → home (work analysis)");
        openHomeGroup("review", "review group (work analysis)");
        tap('[data-v2-go="workAnalysis"]', "review group → work analysis");
        if (!document.querySelector('[data-v2-work-share-days]') || !document.querySelector('[data-v2-work-month-label]')) throw new Error("UI smoke: work analysis page");
        tap('[data-v2-back]', "work analysis → home");
        // 5) 仕事の記録の画面で割合を直して保存する（合計が100でないと知らせる）
        const today = ymd(now());
        S.workLogs[today] = {start:"09:00", end:"18:00", breakMinutes:0, projectIds:["smoke-pct-a","smoke-pct-b"], projectPercents:{"smoke-pct-a":50, "smoke-pct-b":50}};
        localStorage.removeItem(DRAFT_KEY3);
        openHomeGroup("work", "work group (work percent)");
        tap('[data-v2-go="workLog"]', "work group → work log (work percent)");
        if (document.querySelector('[data-v2-work-percent="smoke-pct-a"]')?.value !== "50" || !document.querySelector('[data-v2-work-percent-total]')?.textContent.includes("100%")) throw new Error("UI smoke: work percent field shows saved");
        selectValue('[data-v2-work-percent="smoke-pct-a"]', "60", "percent A");
        const total5 = document.querySelector('[data-v2-work-percent-total]');
        if (!total5?.textContent.includes("110%") || !total5.classList.contains("is-off")) throw new Error("UI smoke: work percent total warns");
        selectValue('[data-v2-work-percent="smoke-pct-b"]', "40", "percent B");
        tap('[data-v2-work-save]', "work percent save");
        const saved5 = S.workLogs[today]?.projectPercents || {};
        if (saved5["smoke-pct-a"] !== 60 || saved5["smoke-pct-b"] !== 40) throw new Error("UI smoke: work percent save");
        tap('[data-v2-back]', "work log → home (work percent)");
        tap('[data-v2-go="settings"]', "home → settings (work percent)");
        // 6) 日報を同期先へ反映するとき、案件の ID が同期先の ID に付け替わっても割合が付いてくる
        const merged6 = mergeImportedWorkCatalog({workProjects:[{id:"remote-pct-a", name:"UI smoke 割合A", color:"#7AA7F0", note:""}], areas:[]}, {projectIds:["smoke-pct-a"], projectNames:{"smoke-pct-a":"UI smoke 割合A"}, projectPercents:{"smoke-pct-a":70}, workDescriptions:{}, projectReviews:{}});
        if (merged6.projectPercents?.["remote-pct-a"] !== 70 || Object.prototype.hasOwnProperty.call(merged6.projectPercents || {}, "smoke-pct-a")) throw new Error("UI smoke: work percent sync remap");
      } finally {
        window.fetch = savedFetch3;
        if (savedApi3 === null) localStorage.removeItem(API_KEY3); else localStorage.setItem(API_KEY3, savedApi3);
        if (savedDraft3 === null) localStorage.removeItem(DRAFT_KEY3); else localStorage.setItem(DRAFT_KEY3, savedDraft3);
        S = normalize(savedS3); localStorage.setItem(KEY, JSON.stringify(S)); render();
      }
    }
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
if ($uiV2 -notmatch 'function homeProjectShare' -or $uiV2 -notmatch 'projectMinutes' -or $src -notmatch 'projectMinutes' -or $uiV2 -notmatch 'an-home-shortcuts.*an-home-groups' -or $uiV2 -match 'an-home-groups-first|an-home-shortcuts-second|an-home-group-link' -or $uiV2 -notmatch 'const work=group\("work"') { Write-Error "案件別割合・スマホ版ホーム維持契約がありません" }
"OK  案件別割合・スマホ版ホーム維持あり"
if ($uiV2 -notmatch 'bodyParts' -or $uiV2 -notmatch 'currentItems' -or $uiV2 -notmatch '場所:' -or $uiV2 -notmatch '準備:' -or $uiV2 -notmatch '忘れない:' -or $uiV2 -notmatch 'showNotification' -or $sw -notmatch 'notificationclick') { Write-Error "前日通知の本文契約がありません" }
"OK  前日通知の本文契約あり"
${pushServer} = Join-Path $root "push-server"
${pushWorker} = Join-Path $pushServer "src\worker.mjs"
if (-not (Test-Path $pushWorker)) { Write-Error "Web Push通知サーバーがありません" }
${pushWorkerSrc} = Get-Content $pushWorker -Raw -Encoding UTF8
if ($uiV2 -notmatch 'mainichi\.schedule-push\.v1' -or $uiV2 -notmatch 'schedulePushConfig' -or $uiV2 -notmatch 'data-v2-notification-connect' -or $uiV2 -notmatch 'remoteSchedulePushPlan' -or $sw -notmatch 'self\.addEventListener\("push"' -or $pushWorkerSrc -notmatch 'class ScheduleReminder extends DurableObject' -or $pushWorkerSrc -notmatch 'setAlarm' -or $pushWorkerSrc -notmatch 'SETUP_KEY' -or $pushWorkerSrc -notmatch 'webpush\.sendNotification') { Write-Error "Web Push通知サーバーの契約がありません" }
"OK  Web Push通知サーバー契約あり"
if ($uiV2 -notmatch 'data-v2-work-auto-clear' -or $uiV2 -notmatch 'workAutoScheduleEndDate' -or $src -notmatch 'workAutoScheduleIsVisibleOn' -or $uiV2 -notmatch '過去の日報・案件カタログ・手動予定・生活／共通予定は残ります') { Write-Error "自動仕事予定の今日以降停止契約がありません" }
"OK  自動仕事予定の今日以降停止契約あり"
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
if ($uiV2 -notmatch 'DAILY_REPORT_API_KEY' -or $uiV2 -notmatch 'dailyReportApiRequest\("/v1/daily-reports/pending"\)' -or $uiV2 -notmatch 'v1/daily-reports/.+?/ack' -or $uiV2 -notmatch 'data-v2-daily-report-api-check' -or $uiV2 -notmatch 'const draft=\{name:`共有API' -or $uiV2 -notmatch 'async function commitWorkLogImport' -or $uiV2 -notmatch 'function dailyReportAutoImportBlock' -or $uiV2 -notmatch 'data-v2-daily-report-imported') { Write-Error "共有APIの日報未確認受信契約（自動の取り込みと止める3つ）がありません" }
"OK  共有APIの日報未確認受信契約あり"
if ($src -notmatch 'function mergeSyncData' -or $src -notmatch 'function reconcileSync' -or $src -notmatch 'mainichi\.sync-base' -or ([regex]::Matches($src, 'reconcileSync\(S, remote(Raw)?, syncBase\(\)').Count -lt 2)) { Write-Error "端末同期の足し合わせ契約がありません" }
"OK  端末同期の足し合わせ契約あり"
if ($pushWorkerSrc -notmatch 'class DailyReportInbox extends DurableObject' -or $pushWorkerSrc -notmatch 'DAILY_REPORT_SENDER_KEY' -or $pushWorkerSrc -notmatch '/v1/daily-reports' -or (Get-Content (Join-Path $pushServer "wrangler.jsonc") -Raw -Encoding UTF8) -notmatch 'DailyReportInbox' -or $uiV2 -notmatch 'function dailyReportApiTarget' -or $uiV2 -notmatch 'X-Mainichi-Device-Id":push\.deviceId' -or $uiV2 -notmatch 'data-v2-daily-report-open') { Write-Error "日報の受信箱（通知サーバー・端末の鍵・ホームの知らせ）の契約がありません" }
"OK  日報の受信箱の契約あり"

# PWAが古いCSS/JSをキャッシュすると、公開URLとホーム画面アプリの表示が食い違う。
# 画面側とService Worker側の主要資産は、BUILDと同じクエリ版を必ず持たせる。
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
# 試しのページはアプリ直下に置く（.gitignore で外してある）。一時フォルダに置くと
# ui-v2.js などの相対の部品が読めず、新しい画面を見ないまま入口で止まる（2026-09-15 実測）。
$test = Join-Path $root "_check_tmp.html"
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
