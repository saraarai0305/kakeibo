/* LIFE NOTE v2. The data model remains in index.html; this file replaces only the UI shell. */
(() => {
  "use strict";
  const root = document.getElementById("lifeNoteV2");
  // 体調の各項目は独立して保存する。保存済みの値は残し、入力欄だけを空に戻す。
  root.addEventListener("click",event=>{
    const button=event.target.closest("[data-v2-health-save]");
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    const mode=button.dataset.v2HealthSave,key=healthRecordDate||ymd(now()),draft=healthDraft||{},saved=Object.assign({},S.health[key]||{}),wasSaved=mode==="sleep"?Boolean(saved.bed&&saved.wake):saved[mode]!=null,remaining=Object.assign({},draft);
    const missing=message=>{toast(message);};
    if(mode==="body"||mode==="mind"){
      if(!draft[mode])return missing(`${mode==="body"?"からだ":"こころ"}の調子を選んでください`);
      saved[mode]=+draft[mode];delete remaining[mode];
    }else if(mode==="sleep"){
      if(!draft.bed||!draft.wake)return missing("就寝時刻と起床時刻を入力してください");
      saved.bed=draft.bed;saved.wake=draft.wake;delete remaining.bed;delete remaining.wake;
    }else if(mode==="steps"){
      if(draft.steps===""||draft.steps==null)return missing("歩数を入力してください");
      saved.steps=Math.max(0,+draft.steps||0);saved.stepsSource="manual";saved.stepsSavedAt=new Date().toISOString();delete remaining.steps;
    }else return;
    S.health[key]=saved;healthDraft=Object.keys(remaining).length?remaining:null;save();render();successToast(`${mode==="body"?"からだ":mode==="mind"?"こころ":mode==="sleep"?"睡眠":"歩数"}を${wasSaved?"変更":"保存"}しました`);
  },true);
  root.addEventListener("change",event=>{
    const input=event.target.closest("#v2HealthDate");
    if(!input)return;
    event.preventDefault();event.stopImmediatePropagation();
    healthRecordDate=input.value||ymd(now());
    healthDraft=null;
    newAppRender();
  },true);
  if (!root) return;
  document.body.dataset.appShell = "v2";

  let page = "home";
  let stack = [];
  let homeOpenGroups = new Set();
  let workProjectEditingId = "";
  let workItemEditingId = "";
  let moneyType = "expense";
  let benefitFlip = false;
  let healthDraft = null;
  let healthRecordDate = ymd(now());
  let calendarMode = "month";
  let calendarLane = "common";
  let flowLaneFilter = "common";
  let moneyAnalysisMonth = ymd(now()).slice(0,7);
  let calendarDate = ymd(now());
  let flowDate = ymd(now());
  const metricOn = {sleep:true, steps:true, body:true, mind:true};
  let metricViewport = null;
  let healthChartSelectedPoint = null;
  let healthBarCycle = {};
  let healthAnalysisOpen = false;
  let healthChartView = {scale:1,x:0,y:0};
  let healthChartPointers = new Map();
  let healthChartGesture = null;
  let healthChartIgnoreClickUntil = 0;
  const successToast = message => {
    if(S?.ui?.successNotices !== false) toast(message);
  };
  // ホームの3枠に登録できる遷移先。ホーム自身以外の全画面を対象にする。
  const HOME_SHORTCUT_CATALOG = Object.freeze({
    record:["edit","記録する"],
    today:["sun","今日を整える"],
    visualize:["chart","見える化する"],
    moneyRecord:["money","支出・収入を記録"],
    moneyOutlook:["wallet","お金の見通し"],
    moneyAnalysis:["chart","お金の分析"],
    healthRecord:["heart","こころとからだ"],
    healthAnalysis:["body","体調の分析"],
    flow:["calendar","一日の流れ"],
    checklist:["list","今日のやること"],
    theme:["sun","テーマ設定"],
    ideas:["edit","アイデアと目標"],
    workLog:["work","仕事の記録"],
    calendar:["calendar","こよみ"],
    settings:["settings","設定"]
  });
  const PRODUCT_PROMISE = "体調に合わせて仕事と暮らしを立て直すアプリ";

  const icon = (name, cls = "") => {
    const approved = {
      home:'<path d="m3.5 10.5 8.5-7 8.5 7V20H14v-5H10v5H3.5z"/>',
      back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
      settings:'<path d="M5 7h14M5 12h14M5 17h14"/>',
      edit:'<path d="m4 20 4.4-.9L19 8.5 15.5 5 4.9 15.6zM14.7 5.8l3.5 3.5M4 20l.8-4.4"/>',
      sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
      chart:'<path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/>',
      money:'<circle cx="12" cy="12" r="8.5"/><path d="m9.4 7.8 2.6 3.8 2.6-3.8M12 11.6v5.2M9.5 13.4h5M9.5 15.6h5"/>',
      heart:'<path d="M20.5 8.4c0 5-8.5 10-8.5 10s-8.5-5-8.5-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.5 2.4z"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M17 14h2M7 18h2M12 18h2"/>',
      plus:'<path d="M12 4v16M4 12h16"/>',
      close:'<path d="M6 6l12 12M18 6 6 18"/>',
      expense:'<path d="M5 4h14v16H5zM12 7v7m-3-3 3 3 3-3"/>',
      income:'<path d="M5 4h14v16H5zM12 17v-7m-3 3 3-3 3 3"/>',
      pay:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M10 10h4v4h-4z"/>',
      fullscreen:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
      tag:'<path d="M3 12V5h7l10 10-7 7z"/><circle cx="7.5" cy="8.5" r="1"/>',
      list:'<path d="M8 6h12M8 12h12M8 18h12M3 6l1 1 2-3M3 12l1 1 2-3M3 18l1 1 2-3"/>',
      eye:'<path d="M2.5 12s3.3-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.3 5.5-9.5 5.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.7"/>',
      eyeoff:'<path d="M3 3l18 18M10.2 6.7A10.8 10.8 0 0 1 12 6.5c6.2 0 9.5 5.5 9.5 5.5a17 17 0 0 1-3 3.6M6.1 8.1A16.5 16.5 0 0 0 2.5 12s3.3 5.5 9.5 5.5c1.2 0 2.2-.2 3.1-.6M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4"/>',
      wallet:'<circle cx="12" cy="12" r="8.5"/><path d="M8 9h8M8 12h8M8 15h5"/>',
      bank:'<path d="m3.5 10.5 8.5-7 8.5 7V20H3.5zM9 20v-5h6v5"/>',
      card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
      coin:'<circle cx="12" cy="12" r="8.5"/><path d="M8 9h8M8 12h8M8 15h5"/>',
      moon:'<path d="M19.5 15.2A8.5 8.5 0 0 1 8.8 4.5 8.5 8.5 0 1 0 19.5 15.2z"/>',
      clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
      foot:'<path d="M9 3c1.7.2 2.4 1.9 2 3.6l-1 3.7c-.4 1.6-1.8 2.6-3.4 2.3l-1.3-.2c-1.2-.2-2-1.3-1.7-2.5l.8-4.3C4.8 3.9 6.2 2.7 8 3zM18 11c1.7.2 2.4 1.9 2 3.6l-1 3.7c-.4 1.6-1.8 2.6-3.4 2.3l-1.3-.2c-1.2-.2-2-1.3-1.7-2.5l.8-4.3c.4-1.7 1.8-2.9 3.6-2.6z"/>',
      body:'<circle cx="12" cy="4.5" r="2.5"/><path d="M12 7v7M7 11h10M12 14l-3 7M12 14l3 7"/>',
      work:'<rect x="3.5" y="8" width="17" height="11.5" rx="1.5"/><path d="M9 8V6.5h6V8M3.5 12h17M10 14.8h4"/>',
      life:'<path d="m3.5 11 8.5-7 8.5 7v9H14v-5h-4v5H3.5z"/><path d="M18 5.5h2.5V9"/>',
      refresh:'<path d="M20 11a8 8 0 0 0-13.8-4L4 9M4 5v4h4M4 13a8 8 0 0 0 13.8 4L20 15M20 19v-4h-4"/>',
      download:'<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>'
      ,text:'<path d="M4 5h16M12 5v14M8 19h8"/>'
      ,cursor:'<path d="m5 3.5 14 8.2-6.3 1.9-2.1 6.4z"/><path d="m13.2 14.1 4.3 4.3"/>'
      ,shape:'<rect x="4" y="5" width="16" height="14" rx="3"/>'
      ,memo:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>'
      ,pen:'<path d="m4 20 4.3-.9L19.2 8.2 15.8 4.8 4.9 15.7zM14.9 5.7l3.4 3.4"/>'
      ,image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/>'
      ,folder:'<path d="M3.5 7.5h5l2 2h10v11H3.5z"/>'
      ,pill:'<rect x="8" y="3.5" width="8" height="17" rx="4"/><path d="M8 12h8"/>'
      ,walk:'<path d="M4 6h5.4a1 1 0 0 1 .9.5l1.1 1.8a3 3 0 0 0 1.9 1.4l4.7 1.1a4 4 0 0 1 3.1 3.9V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/><path d="m14 13 1-2M8 18v-1a4 4 0 0 0-4-4H3M10 12l1.5-3"/>'
      ,cook:'<path d="M5 10h14l-1 9H6zM8 6v4M16 6v4M3 12h18"/>'
      ,bath:'<path d="M4 15h16l-1 4H5zM7 11c-1.4-1.4 1.4-2.4 0-3.8M12 11c-1.4-1.4 1.4-2.4 0-3.8M17 11c-1.4-1.4 1.4-2.4 0-3.8"/>'
      ,teeth:'<path d="M7.2 4.6c1.5-1.1 3.2-.7 4.8.1 1.6-.8 3.3-1.2 4.8-.1 1.9 1.5 1.6 4.6.6 7.1-.8 2-1.6 3.4-2.5 5.8-.3.7-1.3.7-1.5 0L12 13.8l-1.4 3.7c-.3.7-1.3.7-1.5 0-.9-2.4-1.7-3.8-2.5-5.8-1-2.5-1.3-5.6.6-7.1z"/>'
    };
    const p = approved[name] || {
      back:'<path d="m14.5 5-7 7 7 7"/>', settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5.3v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z"/>',
      edit:'<path d="m13.5 5.2 5.3 5.3"/><path d="m5 19 3.7-.8L19.5 7.4a1.9 1.9 0 0 0-2.7-2.7L6 15.5 5 19Z"/>',
      sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
      chart:'<path d="M4 19.5V10.8M10 19.5V4.5M16 19.5v-6.2M22 19.5H2"/>',
      money:'<path d="M4 7.5h16v10H4z"/><path d="M4 10h16M7 15h3"/>', heart:'<path d="M12 21s-7-4.6-7-10.1A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.9C19 16.4 12 21 12 21Z"/>',
      calendar:'<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/>', plus:'<path d="M12 5v14M5 12h14"/>', list:'<path d="M8 6h11M8 12h11M8 18h11"/><path d="m3.5 6 .7.7 1.3-1.4M3.5 12l.7.7 1.3-1.4M3.5 18l.7.7 1.3-1.4"/>',
      eye:'<path d="M2.8 12s3.1-5 9.2-5 9.2 5 9.2 5-3.1 5-9.2 5-9.2-5-9.2-5Z"/><circle cx="12" cy="12" r="2.3"/>', eyeoff:'<path d="m3 3 18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.2 6 9.2 6a16.4 16.4 0 0 1-3.2 3.8M6.1 6.1A16.7 16.7 0 0 0 2.8 12s3.1 5 9.2 5a10.8 10.8 0 0 0 2.2-.2"/><path d="M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4"/>',
      wallet:'<path d="M4 6.5h14a2 2 0 0 1 2 2v9H6a2 2 0 0 1-2-2v-9Z"/><path d="M4 8.5V5.8A1.8 1.8 0 0 1 5.8 4H17"/><path d="M16 12h4"/>', bank:'<path d="m3 9 9-5 9 5"/><path d="M5 10v7M9 10v7M15 10v7M19 10v7M3 20h18"/>', card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M6.5 15h3"/>', coin:'<circle cx="12" cy="12" r="8"/><path d="M14.6 9.3c-.5-.6-1.3-1-2.5-1-1.5 0-2.5.7-2.5 1.8 0 2.7 5 1.1 5 3.6 0 1.1-1 1.9-2.6 1.9-1.2 0-2.2-.5-2.8-1.3M12 6.6v10.8"/>',
      moon:'<path d="M20 15.5A8 8 0 0 1 8.5 4 8.1 8.1 0 1 0 20 15.5Z"/>', foot:'<path d="M7.5 4.5c.4 1.9-.2 3.1-1.6 4.2-1.5 1.1-2.3 2.5-1.8 4.1.6 1.8 2.4 2.5 4.2 1.6 2-1 3-3.1 2.5-5.5l-.9-3.8c-.3-1.2-1.8-1.6-2.4-.6Z"/><path d="M16.5 4.5c-.4 1.9.2 3.1 1.6 4.2 1.5 1.1 2.3 2.5 1.8 4.1-.6 1.8-2.4 2.5-4.2 1.6-2-1-3-3.1-2.5-5.5l.9-3.8c.3-1.2 1.8-1.6 2.4-.6Z"/>',
      body:'<circle cx="12" cy="5" r="2.2"/><path d="M8 20v-5l-2.3-3.4M16 20v-5l2.3-3.4M7.6 9.2 12 11l4.4-1.8M12 11v5"/>', refresh:'<path d="M20 11a8.1 8.1 0 0 0-14.4-4L4 9"/><path d="M4 4v5h5M4 13a8.1 8.1 0 0 0 14.4 4L20 15"/><path d="M20 20v-5h-5"/>', download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 20h14"/>', upload:'<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 4h14"/>'
    }[name] || '';
    return `<svg class="v2-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  };
  const habitIcon = habit => {
    const marks = {med_m:"pill",med_d:"pill",med_n:"pill",out:"walk",cook:"cook",bath:"bath",teeth:"teeth",dev:"edit"};
    return icon(marks[habit.id] || "stamp");
  };
  const esc2 = value => esc(String(value == null ? "" : value));
  const money = value => yen(+value || 0);
  const dateLabel = key => { const d = new Date(key + "T00:00:00"); return `${d.getMonth()+1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`; };
  const issueDate = () => { const d = now(); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; };
  const versionLabel = () => `VER. ${typeof BUILD !== "undefined" ? BUILD : "0.27.0"}`;
  const appBrand = () => `<span class="v2-app-brand" aria-label="くらしのしるし"><svg viewBox="0 0 48 32" aria-hidden="true"><rect x="4" y="15" width="9" height="13" rx="3" fill="#4d80ad"/><rect x="19.5" y="8" width="9" height="20" rx="3" fill="#4f986f"/><rect x="35" y="2" width="9" height="26" rx="3" fill="#ca796b"/></svg><span>くらしのしるし</span></span>`;
  const recordMoney = (value, extraClass = "") => {
    const amount = Number(value) || 0;
    const negative = amount < 0;
    // 表示は円単位で丸める。元の金額は状態データのまま保持する。
    const displayed = Math.round(Math.abs(amount)).toLocaleString("ja-JP");
    return `<b class="v2-money-value ${extraClass} ${negative ? "v2-negative" : ""}"><span class="v2-money-sign">${negative ? "-" : ""}</span><span class="v2-money-yen">¥</span><span class="v2-money-digits">${displayed}</span></b>`;
  };
  const privateRecordMoney = (value, extraClass = "") => S.ui.moneyVisible ? recordMoney(value, extraClass) : `<b class="v2-muted v2-money-value ${extraClass}">---</b>`;
  // 記録画面と見通し画面は、見せる／隠すを別々に扱う。
  const privateOutlookMoney = (value, extraClass = "") => S.ui.moneyOutlookVisible !== false ? recordMoney(value, extraClass) : `<b class="v2-muted v2-money-value ${extraClass}">---</b>`;
  const privateMoney = (value, cls = "") => S.ui.moneyVisible ? `<b class="${(+value < 0 ? "v2-negative " : "") + cls}">${money(value)}</b>` : `<b class="v2-muted">---</b>`;
  const titleFor = p => ({home:"LIFE NOTE",record:"記録する",moneyRecord:"支出・収入を記録",moneyOutlook:"お金の見通し",moneyAnalysis:"お金の分析",healthRecord:"こころとからだ",healthAnalysis:"体調の分析",today:"今日を整える",flow:"一日の流れ",workBoard:"仕事の一覧",checklist:"チェックリスト",theme:"今日のテーマ",ideas:"アイデアと目標",workLog:"仕事の記録",calendar:"週・月を見る",settings:"設定"}[p] || "LIFE NOTE");
  function top(title, settings = page !== "settings"){
    const isMoneyRecord = page === "moneyRecord";
    return `<header class="v2-top">${stack.length ? `<button class="v2-back" data-v2-back>${icon("back")}<span>戻る</span></button>` : `<span class="v2-top-spacer"></span>`}<h1 class="${isMoneyRecord ? "v2-top-brand" : ""}">${isMoneyRecord ? appBrand() : esc2(title)}</h1>${settings ? `<button class="v2-top-action" data-v2-go="settings">${icon("settings")}<span>設定</span></button>` : `<span class="v2-top-spacer"></span>`}</header><div class="v2-issue"><span>${issueDate()}</span><span>${versionLabel()}</span></div>${pageMasthead()}`;
  }
  function moneyRecordHeader(){
    const backAction = stack.length ? "data-v2-back" : "data-v2-home";
    return `<header class="mr-record-header"><div class="mr-record-nav"><button class="mr-nav-button" ${backAction}>${icon("back")}<span>戻る</span></button><div class="mr-record-brand">${appBrand()}</div><button class="mr-nav-button" data-v2-go="settings">${icon("settings")}<span>設定</span></button></div><div class="mr-record-issue"><span>${issueDate()}</span><span>${versionLabel()}</span></div></header>`;
  }
  function masthead(name, english, japanese){
    return `<div class="v2-masthead"><p><span class="v2-masthead-icon">${icon(name)}</span><span>${esc2(english)}</span></p><h2>${esc2(japanese)}</h2></div>`;
  }
  function pageMasthead(){
    const heads={
      moneyRecord:["money","MONEY LOG","支出・収入を記録"],moneyOutlook:["money","MONEY OUTLOOK","お金の見通し"],moneyAnalysis:["money","MONEY ANALYSIS","直近30日の動き"],
      healthRecord:["heart","HEALTH LOG","今日の調子を残す"],healthAnalysis:["body","HEALTH ANALYSIS","体調の分析"],
      flow:["calendar","DAILY FLOW","一日の流れ"],workBoard:["list","WORK BOARD","仕事の一覧"],checklist:["list","CHECKLIST","今日のやること"],theme:["sun","TODAY'S THEME","今日のテーマ"],workLog:["work","WORK LOG","仕事の記録"],calendar:["calendar","CALENDAR","週・月を見る"],settings:["folder","SETTINGS","暮らしの設定"]
    };
    return heads[page] ? masthead(...heads[page]) : "";
  }
  function choice(to, tone, i, label, sub, index){ return `<button class="v2-choice" data-v2-go="${to}" data-tone="${tone}">${index ? `<em class="v2-choice-index">${esc2(index)}</em>` : ""}<span class="v2-icon-bed">${icon(i)}</span><span><strong>${label}</strong>${sub ? `<small>${sub}</small>` : ""}</span><span class="v2-chevron">›</span></button>`; }
  function resetViewport(){ window.scrollTo(0,0); document.documentElement.scrollTop=0; document.body.scrollTop=0; }
  function currentViewport(){ return {x:window.scrollX||document.documentElement.scrollLeft||0,y:window.scrollY||document.documentElement.scrollTop||0}; }
  function restoreViewport(position){
    if(!position) return;
    const restore=()=>window.scrollTo(position.x,position.y);
    restore();
    requestAnimationFrame(()=>{ restore(); setTimeout(restore,50); });
  }
  let workLogDate = ymd(now());
  let workLogFormReset = false;
  let workLogDateViewport = null;
  let workLogImportDraft = null;
  const WORK_LOG_IMPORT_FORMAT = "mainichi.daily-report.v1";
  const DAILY_REPORT_API_KEY = "mainichi.daily-report-api";
  let dailyReportApiBusy = false;
  let dailyReportApiTimer = null;
  const WORK_LOG_IMPORT_FIELDS = [
    ["description", "仕事内容"], ["done", "やったこと・成果"], ["statusNote", "今の状況"],
    ["todo", "やること"], ["trial", "試行・メモ"], ["delivery", "納品・成果物"], ["next", "次回やること"]
  ];
  function workLogProjectAliases(){
    return S.workLogProjectAliases&&typeof S.workLogProjectAliases==="object"&&!Array.isArray(S.workLogProjectAliases)?S.workLogProjectAliases:{};
  }
  function resolveWorkLogProject(projectId,projectName){
    const direct=workProjectOf(projectId),name=String(projectName||"").trim(),aliases=workLogProjectAliases(),aliasId=name?String(aliases[name]||"").trim():"";
    return direct||workProjectOf(aliasId)||workProjects().find(project=>String(project?.name||"").trim()===name)||null;
  }
  const normalizeImportDate = value => {
    const raw = String(value || "").trim().replace(/[./]/g, "-");
    const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(!match) return "";
    const date = `${match[1]}-${String(match[2]).padStart(2,"0")}-${String(match[3]).padStart(2,"0")}`;
    const parsed = new Date(`${date}T00:00:00`);
    const sameLocalDate = parsed.getFullYear()===+match[1] && parsed.getMonth()+1===+match[2] && parsed.getDate()===+match[3];
    return Number.isNaN(parsed.getTime()) || !sameLocalDate ? "" : date;
  };
  function parseWorkLogImport(text, filename=""){
    const source=String(text||"").trim();
    let raw=null;
    try{ raw=JSON.parse(source); }catch{}
    if(!raw){
      const lines=source.split(/\r?\n/), parsed={projects:[]};
      let current=null, field="";
      for(const line of lines){
        const project=line.match(/^##\s*(?:プロジェクト|Project)\s*[：:]\s*(.+?)\s*$/i);
        if(project){ current={projectName:project[1].trim()}; parsed.projects.push(current); field=""; continue; }
        const heading=line.match(/^###\s*(.+?)\s*$/);
        if(heading){
          const hit=WORK_LOG_IMPORT_FIELDS.find(([,label])=>heading[1].trim()===label);
          field=hit?.[0]||""; continue;
        }
        const date=line.match(/(?:日付|Date)\s*[：:]\s*([0-9./-]+)/i);
        if(date) parsed.date=date[1];
        const start=line.match(/(?:作業開始|開始|Start)\s*[：:]\s*([0-9:]+)/i);
        const end=line.match(/(?:作業終了|終了|End)\s*[：:]\s*([0-9:]+)/i);
        const rest=line.match(/(?:休憩|Break)\s*[：:]\s*(\d+)/i);
        const actual=line.match(/(?:実作業時間|Actual\s*Work\s*Minutes)\s*[：:]\s*(\d+)/i);
        if(start) parsed.start=start[1]; if(end) parsed.end=end[1]; if(rest) parsed.breakMinutes=rest[1]; if(actual) parsed.actualWorkMinutes=actual[1];
        if(current&&field&&line.trim()) current[field]=(current[field]?`${current[field]}\n`:"")+line.trim();
      }
      raw=parsed;
    }
    if(raw?.format && raw.format!==WORK_LOG_IMPORT_FORMAT) return {ok:false,errors:[`対応していない形式です（${WORK_LOG_IMPORT_FORMAT}）`],filename,projects:[]};
    const date=normalizeImportDate(raw?.date||raw?.day||raw?.recordDate);
    const projects=Array.isArray(raw?.projects)?raw.projects.map(item=>{
      const projectId=String(item?.projectId||item?.id||"").trim();
      const projectName=String(item?.projectName||item?.project||item?.name||"").trim();
      const fields={};
      for(const [key] of WORK_LOG_IMPORT_FIELDS) fields[key]=String(item?.[key]??"").trim();
      return {projectId,projectName,fields};
    }).filter(item=>item.projectId||item.projectName):[];
    const errors=[];
    if(!date) errors.push("日付（YYYY-MM-DD）が必要です");
    if(!projects.length) errors.push("プロジェクトが1件以上必要です");
    const actualRaw=raw?.actualWorkMinutes==null?"":String(raw.actualWorkMinutes).trim();
    if(actualRaw!==""&&!/^\d+$/.test(actualRaw)) errors.push("actualWorkMinutesは0以上の分数で指定してください");
    const resolved=projects.map(item=>{
      const project=resolveWorkLogProject(item.projectId,item.projectName);
      return Object.assign({},item,{project});
    });
    return {ok:errors.length===0,errors,date,filename,format:raw?.format||"markdown",start:String(raw?.start||raw?.workStart||"").trim(),end:String(raw?.end||raw?.workEnd||"").trim(),breakMinutes:raw?.breakMinutes==null?"":String(raw.breakMinutes).trim(),actualWorkMinutes:actualRaw,projects:resolved};
  }
  function workLogImportResolution(draft,item,index){
    const selected=draft.resolutions?.[index]||"";
    if(item.project)return `<span class="an-import-project-status is-linked">既存プロジェクトに自動紐付け</span>`;
    const options=workProjects().map(project=>`<option value="existing:${esc2(project.id)}" ${selected===`existing:${project.id}`?"selected":""}>既存：${esc2(project.name)}</option>`).join("");
    return `<label class="an-import-project-resolution"><span>対応付け</span><select data-v2-work-log-project-resolution="${index}" ${canWrite()?"":"disabled"}><option value="" ${selected?"":"selected"}>選択してください</option>${options}${item.projectName?`<option value="new" ${selected==="new"?"selected":""}>新規プロジェクトとして登録</option>`:""}</select></label>`;
  }
  function syncWorkLogImportResolutionUI(){
    const draft=workLogImportDraft,data=draft?.data;
    if(!data?.ok)return;
    const unresolved=data.projects.some((item,index)=>!item.project&&!draft.resolutions?.[index]);
    const confirm=root.querySelector("[data-v2-work-log-import-confirm]");
    if(confirm)confirm.disabled=Boolean(S.workLogs?.[data.date]&&Object.keys(S.workLogs[data.date]).length)||unresolved||!canWrite();
    const warning=root.querySelector("[data-v2-work-log-resolution-warning]");
    if(warning)warning.hidden=!unresolved;
    data.projects.forEach((item,index)=>{
      if(item.project)return;
      const status=root.querySelector(`[data-v2-work-log-project-status="${index}"]`),selected=draft.resolutions?.[index]||"";
      if(status)status.textContent=selected?"対応付け済み・取り込み時に確定":"未解決のプロジェクト名";
    });
  }
  function keepWorkLogImportDetailsOpen(open){
    if(!open)return;
    [...root.querySelectorAll("details")].find(details=>details.textContent.includes("日報ファイルを取り込む"))?.setAttribute("open","");
  }
  function dailyReportApiCfg(){
    try{return JSON.parse(localStorage.getItem(DAILY_REPORT_API_KEY))||{};}catch{return {};}
  }
  function setDailyReportApiCfg(value){localStorage.setItem(DAILY_REPORT_API_KEY,JSON.stringify(value||{}));}
  function dailyReportApiStatus(c){
    if(!(c.endpoint&&c.token))return "未設定";
    if(c.lastError)return "接続エラー（確認が必要）";
    if(c.lastCheck)return c.lastPending?"未確認の日報あり":"確認済み・待機中";
    return "設定済み（通信未確認）";
  }
  function dailyReportApiUrl(c,path=""){
    return String(c.endpoint||"").trim().replace(/\/+$/,"/")+String(path||"").replace(/^\/+/,"");
  }
  async function dailyReportApiRequest(path,options={}){
    const c=dailyReportApiCfg();
    if(!c.endpoint||!c.token)throw new Error("日報APIの接続設定がありません");
    const headers=Object.assign({"Accept":"application/json","Authorization":"Bearer "+c.token},options.headers||{});
    const response=await fetch(dailyReportApiUrl(c,path),Object.assign({},options,{headers}));
    if(!response.ok)throw new Error(`日報API ${response.status}`);
    if(response.status===204)return null;
    return response.json();
  }
  function dailyReportApiEntryList(payload){
    if(Array.isArray(payload?.reports))return payload.reports;
    if(Array.isArray(payload?.data?.reports))return payload.data.reports;
    if(payload?.report)return [{id:payload.id||payload.reportId||"",report:payload.report}];
    if(payload?.data?.report)return [{id:payload.data.id||payload.id||"",report:payload.data.report}];
    return [];
  }
  async function acknowledgeDailyReportApi(id){
    if(!id)return;
    try{
      await dailyReportApiRequest(`/v1/daily-reports/${encodeURIComponent(id)}/ack`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"imported"})});
      const c=dailyReportApiCfg();c.lastAck=new Date().toISOString();delete c.lastAckError;setDailyReportApiCfg(c);
    }catch(error){
      const c=dailyReportApiCfg();c.lastAckError=error.message||"確認済み通知に失敗しました";setDailyReportApiCfg(c);
      toast("日報は保存しましたが、APIへの確認済み通知に失敗しました");
    }
  }
  async function pullDailyReportApi(silent=false){
    const c=dailyReportApiCfg();
    if(!c.endpoint||!c.token||dailyReportApiBusy||workLogImportDraft)return {skipped:true};
    dailyReportApiBusy=true;
    try{
      const payload=await dailyReportApiRequest("/v1/daily-reports/pending"),entries=dailyReportApiEntryList(payload);
      c.lastCheck=new Date().toISOString();delete c.lastError;c.lastPending=entries.length>0;setDailyReportApiCfg(c);
      if(!entries.length){if(!silent)toast("未確認の日報はありません");return {pending:0};}
      const entry=entries[0],raw=entry.report||entry.payload||entry.data||entry;
      const data=parseWorkLogImport(typeof raw==="string"?raw:JSON.stringify(raw),`API日報${raw?.date||""}.json`);
      workLogImportDraft={name:`共有API：${raw?.date||"日報"}`,data,resolutions:{},apiId:String(entry.id||entry.reportId||"")};
      newAppRender();keepWorkLogImportDetailsOpen(true);
      toast("未確認の日報を受信しました。内容を確認してください");
      return {pending:entries.length,data};
    }catch(error){
      c.lastCheck=new Date().toISOString();c.lastError=error.message||"日報APIを確認できませんでした";setDailyReportApiCfg(c);
      if(!silent)toast(`日報APIを確認できませんでした: ${c.lastError}`);
      return {pending:0,error};
    }finally{dailyReportApiBusy=false;}
  }
  function startDailyReportApiLoop(){
    clearInterval(dailyReportApiTimer);
    dailyReportApiTimer=setInterval(()=>{if(!document.hidden)pullDailyReportApi(true);},60000);
  }
  function workLogImportPanel(){
    const draft=workLogImportDraft;
    if(!draft) return `<p>指定した日報ファイルをこの端末で読み取り、内容を確認してから取り込みます。常時監視や自動上書きはしません。</p><label class="an-file-pick"><span class="an-file-pick-content">${icon("upload")}<span>日報ファイルを選ぶ</span></span><input id="v2WorkLogFile" type="file" accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain"></label><small>JSON（mainichi.daily-report.v1）または定型Markdownに対応します。</small>`;
    if(!draft.data?.ok) return `<div class="an-import-preview is-error"><strong>読み込めません</strong><p>${esc2((draft.data?.errors||["形式を確認してください"]).join("／"))}</p><button type="button" class="an-small-action" data-v2-work-log-import-cancel>ファイルを選び直す</button></div>`;
    const data=draft.data,existing=Boolean(S.workLogs?.[data.date]&&Object.keys(S.workLogs[data.date]).length),unknown=data.projects.filter(item=>!item.project),unresolved=data.projects.some((item,index)=>!item.project&&!draft.resolutions?.[index]);
    const confirmLabel=existing?"既存の日報を上書きして取り込む":"この内容を日報に取り込む";
    const confirmClass=existing?" an-import-overwrite":"";
    const confirmAttr=existing?" data-v2-work-log-import-overwrite":"";
    return `<div class="an-import-preview"><strong>取り込み内容を確認</strong><p><b>${esc2(data.date)}</b> ／ ${data.projects.length}プロジェクト ／ 休憩 ${esc2(data.breakMinutes||"0")}分 ／ 実作業時間 ${data.actualWorkMinutes===""?"未申告":formatWorkMinutes(data.actualWorkMinutes)}</p><ul>${data.projects.map((item,index)=>`<li><div><b>${esc2(item.projectName||item.projectId)}</b>${item.project?`<small>既存プロジェクトに自動紐付け</small>`:`<small data-v2-work-log-project-status="${index}">未解決のプロジェクト名</small>`}</div>${workLogImportResolution(draft,item,index)}</li>`).join("")}</ul>${existing?`<p class="an-import-warning">この日付には既存の日報があります。内容を確認すると、下のボタンで置き換えできます。</p>`:""}${unknown.length?`<p class="an-import-warning" data-v2-work-log-resolution-warning>未解決のプロジェクトは、既存への対応付けか新規登録を選んでください。</p>`:""}${!canWrite()?`<p class="an-import-warning">この端末は読み取り専用のため、取り込みはできません。</p>`:""}<div class="an-import-actions"><button type="button" class="an-small-action" data-v2-work-log-import-cancel>取り消す</button><button type="button" class="an-small-action an-import-confirm${confirmClass}" data-v2-work-log-import-confirm${confirmAttr} ${unresolved||!canWrite()?"disabled":""}>${confirmLabel}</button></div></div>`;
  }
  // iOS/Safari can scroll a focused date input into view before `focusin`.
  // Keep a short history so a date change can restore the viewport from before
  // that browser-managed scroll, including keyboard and automation-like paths.
  const viewportHistory=[];
  function rememberViewport(){
    const current=currentViewport(),last=viewportHistory[viewportHistory.length-1];
    if(!last||last.x!==current.x||last.y!==current.y)viewportHistory.push({x:current.x,y:current.y,time:Date.now()});
    while(viewportHistory.length>8)viewportHistory.shift();
  }
  function viewportBeforeFocus(){
    const latest=viewportHistory[viewportHistory.length-1],prior=viewportHistory[viewportHistory.length-2];
    if(latest&&prior&&Date.now()-latest.time<700&&(latest.x!==prior.x||latest.y!==prior.y))return {x:prior.x,y:prior.y};
    return currentViewport();
  }
  window.addEventListener("scroll",rememberViewport,{passive:true});
  rememberViewport();
  function go(next){ if(next === page) return; if(document.getElementById("v2WorkDate")) persistWorkLogDraft(document.getElementById("v2WorkDate").value||workLogDate); stack.push(page); if(next === "workLog"){workLogDate=flowDate||ymd(now());workLogFormReset=false;} page = next; newAppRender({preserveScroll:false}); resetViewport(); }
  function back(){ const prev = stack.pop(); if(!prev) return; page = prev; newAppRender({preserveScroll:false}); resetViewport(); }
  function goHome(){ page = "home"; stack = []; newAppRender({preserveScroll:false}); resetViewport(); }
  // 旧ホームは廃止。入口は homeV2 に一本化する。
  function home(){ return homeV2(); }
  function branch(kind){
    const data = kind === "record" ? [["moneyRecord","money","money","支出・収入","金額、方法、カテゴリーを記録"],["healthRecord","health","heart","こころとからだ","今日の調子を記録"]] : kind === "today" ? [["flow","calendar","calendar","一日の流れ","予定と現在時刻を見る"],["theme","today","sun","テーマ設定","今日の軸をひとことで"]] : [["moneyAnalysis","analysis","money","お金の分析","支払い方法とカテゴリーの傾向"],["healthAnalysis","health","body","体調の分析","睡眠・歩数・こころ・からだ"]];
    const head = kind === "record" ? ["edit","RECORD","記録する"] : kind === "today" ? ["sun","TODAY","今日を整える"] : ["chart","REVIEW","見える化する"];
    return `<section class="v2-page v2-branch">${top(titleFor(kind),true)}${masthead(...head)}<div class="v2-list">${data.map(x=>choice(...x)).join("")}</div></section>`;
  }
  function moneyRecord(){
    const c = calc(), remaining = c.remaining;
    const options = moneyType === "borrowing" ? {methods:[],cats:[]} : moneyOptions(moneyType), currentMethod = moneyType === "income" ? (S.ui.incomeMethod || "bank") : (S.ui.pay || "cash");
    const entries = [...S.spends.filter(x=>x.d===ymd(now())).map(x=>({type:"expense",...x})), ...(S.incomeLogs||[]).filter(x=>x.d===ymd(now())).map(x=>({type:"income",...x})), ...(S.borrowings||[]).filter(x=>x.d===ymd(now())).map(x=>({type:"borrowing",...x,cat:`借入・${x.lender||"借入"}`}))].sort((a,b)=>(b.t||"").localeCompare(a.t||""));
    const recordTitle = moneyType === "borrowing" ? "借入を記録" : moneyType === "income" ? "収入を記録" : "支出を記録";
    const categoryTone = cat => ({"食費":"food","日用品":"daily","医療費":"medical","家賃":"home","交通費":"travel","趣味":"fun"}[cat] || "other");
    if(moneyType === "borrowing") return `<section class="v2-page v2-money-record mr-approval-page">${moneyRecordHeader()}<main class="mr-record-content"><div class="mr-record-mark"><span class="mr-record-mark-icon">${icon("money")}</span><span>MONEY LOG</span></div><section class="mr-balance"><div class="mr-balance-top"><span>今残っているお金（借入を含む）</span><button class="mr-privacy" data-v2-private="record">${S.ui.moneyVisible ? "隠す" : "表示"}</button></div>${privateRecordMoney(remaining,"mr-primary-money")}<div class="mr-borrowing-total"><span>借入合計</span>${privateRecordMoney(c.borrowedTotal)}</div></section><div class="mr-tabs mr-money-type-tabs is-borrowing"><button data-v2-moneytype="expense">支出</button><button data-v2-moneytype="income">収入</button><button class="on borrowing" data-v2-moneytype="borrowing">借入</button></div><div class="mr-form-row"><label for="v2Amount">借入金額</label><input id="v2Amount" type="text" inputmode="numeric" placeholder="￥0"></div><div class="mr-form-row"><label for="v2Borrower">借入先</label><input id="v2Borrower" type="text" placeholder="例：母"></div><p class="mr-borrowing-note">借入は収入に混ぜず、返済が必要なお金として記録します。</p><button class="mr-save borrowing" data-v2-money-save>借入を記録</button><section class="mr-activity">${entries.length ? entries.map(x=>`<div class="mr-activity-row ${x.type}"><span><i class="mr-category-dot ${categoryTone(x.cat)}"></i>${esc2(x.cat)}</span><b>${x.type === "income" || x.type === "borrowing" ? "＋" : ""}${money(x.amt)}</b></div>`).join("") : `<p class="v2-empty">今日はまだ記録がありません</p>`}</section><button class="mr-home-return" data-v2-home>${icon("home")}<span>ホームへ戻る</span></button></main></section>`;
    return `<section class="v2-page v2-money-record mr-approval-page">${moneyRecordHeader()}<main class="mr-record-content"><div class="mr-record-mark"><span class="mr-record-mark-icon">${icon("money")}</span><span>MONEY LOG</span></div><section class="mr-balance"><div class="mr-balance-top"><span>今日使えるお金</span><button class="mr-privacy" data-v2-private="record">${S.ui.moneyVisible ? "隠す" : "表示"}</button></div>${privateRecordMoney(c.left,"mr-primary-money")}<div class="mr-balance-rule"></div><div class="mr-balance-bottom"><span>今残っているお金（借入を含む）</span>${privateRecordMoney(remaining,"mr-secondary-money")}</div><div class="mr-borrowing-total"><span>借入合計</span>${privateRecordMoney(c.borrowedTotal)}</div></section><div class="mr-tabs mr-money-type-tabs"><button class="${moneyType === "expense" ? "on expense" : ""}" data-v2-moneytype="expense">支出</button><button class="${moneyType === "income" ? "on income" : ""}" data-v2-moneytype="income">収入</button><button data-v2-moneytype="borrowing">借入</button></div><div class="mr-form-row"><label for="v2Amount">金額</label><input id="v2Amount" type="text" inputmode="numeric" placeholder="￥0"></div><div class="mr-form-row"><label for="v2Method">${moneyType === "income" ? "受け取り方法" : "支払い方法"}</label><select id="v2Method">${options.methods.map(([v,l])=>`<option value="${esc2(v)}" ${v===currentMethod?"selected":""}>${esc2(l)}</option>`).join("")}</select></div><div class="mr-form-row"><label for="v2Category">${moneyType === "income" ? "収入のカテゴリー" : "支出のカテゴリー"}</label><select id="v2Category">${options.cats.map(x=>`<option>${esc2(x)}</option>`).join("")}</select></div><button class="mr-save ${moneyType === "income" ? "income" : ""}" data-v2-money-save>${recordTitle}</button><button class="mr-forecast" data-v2-go="moneyOutlook">${icon("wallet")}<span>お金の見通しを見る</span><b>›</b></button><section class="mr-activity">${entries.length ? entries.map(x=>`<div class="mr-activity-row ${x.type}"><span><i class="mr-category-dot ${categoryTone(x.cat)}"></i>${esc2(x.cat)}</span><b>${x.type === "income" || x.type === "borrowing" ? "＋" : ""}${money(x.amt)}</b></div>`).join("") : `<p class="v2-empty">今日はまだ記録がありません</p>`}</section><button class="mr-home-return" data-v2-home>${icon("home")}<span>ホームへ戻る</span></button></main></section>`;
  }
  function moneyOutlook(){ const c=calc(), rest=c.remaining; const benefit=(S.incomes||[]).find(x=>x.benefit||x.id==="benefit"); return `<section class="v2-page v2-outlook-page">${top(titleFor(page))}<p class="v2-kicker">${icon("money")}MONEY OUTLOOK</p><h2 class="v2-page-lead">お金の見通し</h2><div class="v2-balance"><div class="v2-balance-row primary"><span>今日使えるお金</span><button class="v2-privacy" data-v2-private>${S.ui.moneyVisible ? icon("eyeoff") + "隠す" : icon("eye") + "表示"}</button>${privateMoney(c.left)}</div></div><div class="v2-outline-row"><i>${icon("bank")}</i><span>今残っているお金（借入を含む）<small>予定支払いを反映した現在残高</small></span>${privateMoney(rest)}</div><div class="v2-outline-row"><i>${icon("coin")}</i><span>借入合計<small>返済が必要な借入</small></span>${privateMoney(c.borrowedTotal)}</div><div class="v2-outline-row"><i>${icon("coin")}</i><span>生活を支える収入<small>傷病手当など</small></span>${privateMoney(benefit ? +benefit.amt||0 : 0,"v2-green")}</div><div class="v2-outline-row"><i>${icon("card")}</i><span>今後のカード・固定費<small>カード請求と未払いの固定費</small></span>${privateMoney(c.unpaid+c.cardNow)}</div><button class="v2-sub-action" data-v2-go="moneyAnalysis">${icon("chart")}お金の分析を見る</button></section>`; }
  function moneyAnalysis(){ const cut=new Date();cut.setDate(cut.getDate()-29);const from=ymd(cut), rec=S.spends.filter(x=>x.d>=from), byPay={cash:0,paypay:0,card:0},byCat={};rec.forEach(x=>{const n=+x.amt||0;byPay[x.pay==="card"?"card":x.pay==="paypay"?"paypay":"cash"]+=n;byCat[x.cat]=(byCat[x.cat]||0)+n});const max=Math.max(1,...Object.values(byPay));const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=cats.reduce((a,[,v])=>a+v,0), cols=["#376b91","#39785d","#7263a8","#d2a73e"];let p=0;const stops=cats.map(([,v],i)=>{const a=p;p+=sum?v/sum*100:0;return `${cols[i]} ${a}% ${p}%`}).join(",");const income=(S.incomeLogs||[]).filter(x=>x.d>=from).reduce((a,x)=>a+(+x.amt||0),0); const bar=(lab,n,color)=>`<div class="v2-bar-row"><span>${lab}</span><span class="v2-bar-track"><i class="v2-bar-fill" style="width:${n/max*100}%;--bar:${color}"></i></span><strong>${money(n)}</strong></div>`; return `<section class="v2-page v2-money-analysis">${top(titleFor(page))}<p class="v2-kicker">${icon("chart")}MONEY ANALYSIS</p><h2 class="v2-page-lead">直近30日の動き</h2><div class="v2-chart-block"><h2>収入と支出のバランス</h2>${bar("収入",income,"#39785d")}${bar("支出",rec.reduce((a,x)=>a+(+x.amt||0),0),"#376b91")}</div><div class="v2-chart-block"><h2>支払い方法</h2>${bar("カード",byPay.card,"#7263a8")}${bar("現金・引落",byPay.cash,"#376b91")}${bar("PayPay",byPay.paypay,"#d2a73e")}</div><div class="v2-chart-block"><h2>お金を使ったカテゴリー</h2>${cats.length?`<div class="v2-donut-wrap"><div class="v2-donut" style="background:conic-gradient(${stops})"></div><div>${cats.map(([k,v],i)=>`<div class="v2-legend-row"><i style="background:${cols[i]}"></i><span>${esc2(k)}</span><b>${sum?Math.round(v/sum*100):0}%</b></div>`).join("")}</div></div>`:`<p class="v2-empty">支出を記録すると、カテゴリーの比率を円グラフで表示します。</p>`}</div></section>`; }
  function shownHealth(){return Object.assign({},S.health[ymd(now())]||{},healthDraft||{});} function dots(kind,value){return `<div class="v2-rating">${[1,2,3,4,5].map(i=>`<button class="${i<= (+value||0)?"on "+kind:""}" data-v2-rate="${kind}" data-v2-value="${i}" aria-label="${i}">${i}</button>`).join("")}</div>`;}
  // 旧レイアウトは参照用に残し、実際の画面には使わない。
  // healthRecord は下の「項目ごとに保存する」実装だけを公開する。
  function healthRecordLegacy(){
    const h = shownHealth();
    const sm = sleepMin(h.bed, h.wake);
    const steps = h.steps != null ? `${(+h.steps).toLocaleString("ja-JP")}歩` : "—";
    return `<section class="v2-page v2-health-record">${top(titleFor(page))}<div class="v2-date-tag">${dateLabel(ymd(now()))}</div><h2 class="v2-page-lead">今日の調子を残す</h2><div class="v2-health-paper-grid"><section class="v2-health-paper-item"><h3>${icon("body")}からだ</h3><small>体の調子</small>${dots("body",h.body)}<b>${h.body ? `${h.body} / 5` : "未記録"}</b></section><section class="v2-health-paper-item mind"><h3>${icon("heart")}こころ</h3><small>心の調子</small>${dots("mind",h.mind)}<b>${h.mind ? `${h.mind} / 5` : "未記録"}</b></section><section class="v2-health-paper-item"><h3>${icon("moon")}睡眠</h3><strong>${fmtSleep(sm)}</strong><small>設定から自動取り込み</small></section><section class="v2-health-paper-item"><h3>${icon("foot")}歩数</h3><strong>${steps}</strong><small>設定から自動取り込み</small></section></div><details class="v2-sleep-edit"><summary>${icon("clock")}睡眠時間を編集</summary><div class="v2-form-row"><label for="v2Bed">${icon("moon")}就寝時刻</label><input id="v2Bed" type="time" value="${esc2(h.bed||"")}" data-v2-health="bed"></div><div class="v2-form-row"><label for="v2Wake">${icon("sun")}起床時刻</label><input id="v2Wake" type="time" value="${esc2(h.wake||"")}" data-v2-health="wake"></div></details><button class="v2-primary income" data-v2-health-save>${icon("download")}この日の記録を保存</button><button class="v2-sub-action" data-v2-go="healthAnalysis">${icon("chart")}体調の変化を見る</button></section>`;
  }
  function checklistProgress(key){
    const rec=S.daily[key]||{}, habits=habitList(), tasks=plannedOn(key);
    const total=habits.length+tasks.length;
    if(!total) return null;
    const habitDone=habits.filter(h=>rec.habits&&rec.habits[h.id]).length;
    const taskDone=tasks.filter(t=>t.done).length;
    return Math.round((habitDone+taskDone)/total*100);
  }
  function timeValueMinutes(value){if(typeof value!=="string"||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))return null;const [h,m]=value.split(":").map(Number);return h*60+m;}
  function workInterval(start,end){const a=timeValueMinutes(start),b=timeValueMinutes(end);if(a==null)return null;return {start,end:end||"",a,b:b==null?null:(b>=a?b:b+1440)};}
  function workIntervals(record,key){
    const source=Array.isArray(record?.[key])?record[key]:[];
    const intervals=source.map(x=>workInterval(x?.start||x?.from||"",x?.end||x?.to||"")).filter(Boolean);
    if(intervals.length)return intervals;
    if(key==="workSessions"){
      const fallback=workInterval(record?.start||"",record?.end||"");
      return fallback?[fallback]:[];
    }
    const start=record?.start,end=record?.end,breakMinutes=Math.max(0,Math.round(Number(record?.breakMinutes)||0));
    if(!breakMinutes)return [];
    const span=workInterval(start,end);if(!span||span.b==null)return [];
    return [{start:"",end:"",a:span.b-breakMinutes,b:span.b}];
  }
  function intervalLength(interval){return interval&&interval.b!=null?Math.max(0,interval.b-interval.a):0;}
  function workLogSpan(record){const sessions=workIntervals(record,"workSessions").filter(x=>x.b!=null);return sessions.length?sessions.reduce((sum,x)=>sum+intervalLength(x),0):null;}
  function workLogBreakMinutes(record){
    const sessions=workIntervals(record,"workSessions").filter(x=>x.b!=null),breaks=workIntervals(record,"breakSessions").filter(x=>x.b!=null);
    if(!breaks.length)return Math.max(0,Math.round(Number(record?.breakMinutes)||0));
    return breaks.reduce((sum,br)=>sum+sessions.reduce((inner,work)=>inner+Math.max(0,Math.min(br.b,work.b)-Math.max(br.a,work.a)),0),0);
  }
  function workLogMinutes(record){const declared=record?.actualWorkMinutes;if(declared!==null&&declared!==undefined&&declared!==""&&Number.isFinite(Number(declared)))return Math.max(0,Math.round(Number(declared)));const span=workLogSpan(record);if(span==null)return null;return Math.max(0,span-workLogBreakMinutes(record));}
  function formatWorkMinutes(value){if(value==null)return "未記録";const n=Math.max(0,Math.round(Number(value)||0));return `${Math.floor(n/60)}時間${n%60}分`;}
  function workPunchState(record){
    const sessions=workIntervals(record,"workSessions"),breaks=workIntervals(record,"breakSessions"),lastWork=sessions[sessions.length-1],lastBreak=breaks[breaks.length-1];
    return {sessions,breaks,activeWork:Boolean(lastWork&&!lastWork.end),activeBreak:Boolean(lastBreak&&!lastBreak.end),firstStart:sessions[0]?.start||"",lastEnd:[...sessions].reverse().find(x=>x.end)?.end||"",breakMinutes:workLogBreakMinutes(record)};
  }
  function workTimeSaved(record,edge){const punch=workPunchState(record);return Boolean(edge==="start"?(record?.start||punch.firstStart):(record?.end||punch.lastEnd));}
  function workSessionRecords(record){
    let source=Array.isArray(record?.workSessions)?record.workSessions:[];
    if(!source.length&&(record?.start||record?.end))source=[{start:record.start||"",end:record.end||""}];
    return source.map(x=>({start:x?.start||x?.from||"",end:x?.end||x?.to||""}));
  }
  function applyWorkTimeConfirmation(record,edge,value){
    const sessions=workSessionRecords(record);
    if(!sessions.length)sessions.push({start:"",end:""});
    if(edge==="start"){sessions[0].start=value;record.start=value;}else{sessions[sessions.length-1].end=value;record.end=value;}
    record.workSessions=sessions;
    record.breakSessions=Array.isArray(record.breakSessions)?record.breakSessions.map(x=>({start:x?.start||x?.from||"",end:x?.end||x?.to||""})):[];
    record.breakMinutes=workLogBreakMinutes(record);
    return record;
  }
  function workLogState(record){
    const span=workLogSpan(record),breakMinutes=Math.max(0,Math.min(720,workLogBreakMinutes(record)));
    if(span==null)return {state:"empty",span:null,breakMinutes,net:null};
    if(breakMinutes>span)return {state:"invalid",span,breakMinutes,net:null};
    return {state:"valid",span,breakMinutes,net:workLogMinutes(record)};
  }
  function workLogDraftState(){return workLogState({start:document.getElementById("v2WorkStart")?.value||"",end:document.getElementById("v2WorkEnd")?.value||"",breakMinutes:document.getElementById("v2WorkBreak")?.value||""});}
  const WORK_LOG_DRAFT_KEY="mainichi.worklog-draft.v1";
  function canPersistWorkLogDraft(){return true;}
  function workLogDraftFor(key){try{const raw=localStorage.getItem(WORK_LOG_DRAFT_KEY),draft=raw?JSON.parse(raw):null;return draft&&draft.day===key&&draft.data&&typeof draft.data==="object"?draft.data:null;}catch{return null;}}
  function clearWorkLogDraft(key){try{const raw=localStorage.getItem(WORK_LOG_DRAFT_KEY),draft=raw?JSON.parse(raw):null;if(!draft||draft.day===key)localStorage.removeItem(WORK_LOG_DRAFT_KEY);}catch{}}
  function readWorkLogChoice(id){const choice=document.getElementById(`${id}Choice`),custom=document.getElementById(id);return choice?.value==="__custom"?(custom?.value||"").trim():(choice?.value||"").trim();}
  function persistWorkLogDraft(key=workLogDate){
    if(!document.getElementById("v2WorkDate")||!canPersistWorkLogDraft())return;
    const saved=(S.workLogs&&S.workLogs[key])||{},data={start:document.getElementById("v2WorkStart")?.value||"",end:document.getElementById("v2WorkEnd")?.value||"",breakMinutes:document.getElementById("v2WorkBreak")?.value||"",workSessions:Array.isArray(saved.workSessions)?saved.workSessions:[],breakSessions:Array.isArray(saved.breakSessions)?saved.breakSessions:[],projectIds:selectedWorkLogProjects(),workItemIds:selectedWorkLogItems(),workDescriptions:selectedWorkLogDescriptions(),projectReviews:selectedWorkLogReviews(),done:readWorkLogChoice("v2WorkDone"),statusNote:readWorkLogChoice("v2WorkStatusNote"),todo:readWorkLogChoice("v2WorkTodo"),trial:readWorkLogChoice("v2WorkTrial"),delivery:readWorkLogChoice("v2WorkDelivery"),next:readWorkLogChoice("v2WorkNext")};
    const meaningful=Object.values(data).some(value=>Array.isArray(value)?value.length:Boolean(value));
    try{if(meaningful)localStorage.setItem(WORK_LOG_DRAFT_KEY,JSON.stringify({day:key,data,updatedAt:Date.now()}));else clearWorkLogDraft(key);}catch{}
  }
  function workLogDurationNote(state){return state.state==="invalid"?"休憩分は作業時間以内にしてください":state.state==="valid"?`拘束時間 ${formatWorkMinutes(state.span)} − 休憩 ${state.breakMinutes}分`:"開始・終了・休憩分を入力すると計算します";}
  function paintWorkLogDraft(){
    const state=workLogDraftState(),card=document.querySelector("[data-v2-work-duration]"),value=document.querySelector("[data-v2-work-net]"),note=document.querySelector("[data-v2-work-duration-note]");
    if(!card||!value||!note)return;
    card.dataset.state=state.state;
    value.textContent=state.net==null?"未計算":formatWorkMinutes(state.net);
    note.textContent=workLogDurationNote(state);
  }
  function paintWorkLogTime(id){const input=document.getElementById(id),value=root.querySelector(`[data-v2-work-time-value="${id}"]`);if(input&&value)value.textContent=input.value||"--:--";}
  const WORK_STATUS_OPTIONS=[{id:"todo",label:"未着手"},{id:"doing",label:"進行中"},{id:"waiting",label:"待ち"},{id:"done",label:"完了"}];
  const WORK_PRIORITY_OPTIONS=[{id:"now",label:"今すぐやる"},{id:"next",label:"次にやる"},{id:"someday",label:"いつかやる・たぶんやる"},{id:"waiting",label:"待ち"}];
  const WORK_PRIORITY_LEGACY={next:"b",now:"a",someday:"c",waiting:"d"};
  const WORK_PRIORITY_COLORS={now:"#c85d54",next:"#d2a449",someday:"#4d80ad",waiting:"#796aa8"};
  const WORK_REVIEW_OPTIONS={
    done:["調査した","作成した","修正した","確認した","提出した"],
    statusNote:["進行中","確認待ち","問題あり","完了","保留"],
    todo:["次の作業を決める","確認・修正する","提出・共有する","返事を待つ"],
    trial:["比較した","試作した","相談した","調べた"],
    delivery:["提出済み","確認済み","未提出","対象なし"],
    next:["続きから始める","結果を確認する","次の予定を入れる","保留の理由を書く"]
  };
  const WORK_REVIEW_LABELS={done:"やったこと・成果",statusNote:"今の状況",todo:"やること",trial:"試行・メモ",delivery:"納品・成果物",next:"次回やること"};
  const WORK_REVIEW_PLACEHOLDERS={done:"何をしたか・何ができたか",statusNote:"進み具合・待っていること",todo:"次に進める内容",trial:"試したこと・判断メモ",delivery:"提出物・確認結果",next:"次に続けること"};
  const workProjects=()=>Array.isArray(S.workProjects)?S.workProjects.filter(Boolean):[];
  const workItems=()=>Array.isArray(S.workItems)?S.workItems.filter(Boolean):[];
  function ensureWorkProject(name){
    const clean=String(name||"").trim();if(!clean)return null;
    S.workProjects=Array.isArray(S.workProjects)?S.workProjects:[];
    let project=S.workProjects.find(x=>x&&String(x.name||"").trim()===clean);
    if(project)return project;
    project={id:uid(),name:clean,color:"#7AA7F0",note:""};S.workProjects.push(project);
    S.areas=Array.isArray(S.areas)?S.areas:[];
    if(!S.areas.some(x=>x&&x.id===project.id))S.areas.push({id:project.id,label:project.name,color:project.color,urgent:false,note:""});
    return project;
  }
  function renameWorkProject(projectId,name){
    if(!canWrite())return {ok:false,reason:"readonly"};
    const project=workProjectOf(projectId),clean=String(name||"").trim();
    if(!project)return {ok:false,reason:"missing"};
    if(!clean)return {ok:false,reason:"empty"};
    if(workProjects().some(x=>x.id!==projectId&&String(x.name||"").trim()===clean))return {ok:false,reason:"duplicate"};
    const oldName=String(project.name||"").trim();
    project.name=clean;
    S.areas=Array.isArray(S.areas)?S.areas:[];
    S.areas=S.areas.map(area=>area&&(area.id===projectId||String(area.label||"").trim()===oldName)?Object.assign({},area,{label:clean}):area);
    Object.values(S.workLogs||{}).forEach(record=>{
      if(!record||typeof record!=="object")return;
      if(Array.isArray(record.projectIds)&&record.projectIds.includes(projectId)){
        record.project=record.projectIds.map(id=>workProjectOf(id)?.name||"").filter(Boolean).join("、");
      }else if(String(record.project||"").trim()===oldName){
        record.project=clean;
      }
    });
    return {ok:true};
  }
  function renameWorkItem(itemId,name){
    if(!canWrite())return {ok:false,reason:"readonly"};
    const item=workItemOf(itemId),clean=String(name||"").trim();
    if(!item)return {ok:false,reason:"missing"};
    if(!clean)return {ok:false,reason:"empty"};
    if(workItems().some(x=>x.id!==itemId&&x.projectId===item.projectId&&String(x.name||"").trim()===clean))return {ok:false,reason:"duplicate"};
    const oldName=String(item.name||"").trim();
    item.name=clean;
    const updateEvent=event=>{
      if(!event||typeof event!=="object")return;
      if(event.workItemId===itemId){event.text=clean;event.projectId=item.projectId;return;}
      if(!event.workItemId&&String(event.text||"").trim()===oldName&&(event.projectId===item.projectId||event.lane==="work"||event.cat==="work"||event.cat==="make")){
        event.workItemId=itemId;event.projectId=item.projectId;event.lane="work";event.cat="work";event.text=clean;
      }
    };
    for(const list of Object.values(S.plan||{})) for(const event of Array.isArray(list)?list:[]) updateEvent(event);
    for(const event of Array.isArray(S.dailyTimeline)?S.dailyTimeline:[]) updateEvent(event);
    for(const record of Object.values(S.workLogs||{})){
      if(!record||typeof record!=="object")continue;
      if(record.workItemId===itemId){record.workItem=clean;record.projectId=item.projectId;continue;}
      if(!record.workItemId&&String(record.workItem||"").trim()===oldName&&(record.projectId===item.projectId||record.project===workProjectOf(item.projectId)?.name)){
        record.workItemId=itemId;record.projectId=item.projectId;record.workItem=clean;
      }
    }
    return {ok:true};
  }
  const workProjectOf=id=>workProjects().find(x=>x.id===id)||null;
  const workItemOf=id=>workItems().find(x=>x.id===id)||null;
  const workStatusLabel=id=>WORK_STATUS_OPTIONS.find(x=>x.id===id)?.label||"未着手";
  const workPriorityId=value=>{
    const raw=value&&typeof value==="object"?(value.priorityGroup||value.priority):value;
    if(WORK_PRIORITY_OPTIONS.some(x=>x.id===raw))return raw;
    return ({a:"now",b:"next",c:"someday",d:"someday"})[raw]||"someday";
  };
  const workPriorityLabel=value=>WORK_PRIORITY_OPTIONS.find(x=>x.id===workPriorityId(value))?.label||"いつかやる・たぶんやる";
  const workPriorityColor=value=>WORK_PRIORITY_COLORS[workPriorityId(value)]||WORK_PRIORITY_COLORS.next;
  const workOptions=(options,selected)=>options.map(x=>`<option value="${esc2(x.id)}" ${x.id===selected?"selected":""}>${esc2(x.label)}</option>`).join("");
  function scheduledWorkForDate(key,id){return (typeof planOf==="function"?planOf(key):[]).filter(x=>x&&x.workItemId===id);}
  const asIdList=value=>Array.isArray(value)?value.filter(Boolean):value?[value]:[];
  function workLogSelection(key,saved){
    let projectIds=asIdList(saved.projectIds),workItemIds=asIdList(saved.workItemIds);
    const projectNames=saved.projectNames&&typeof saved.projectNames==="object"&&!Array.isArray(saved.projectNames)?saved.projectNames:{};
    // 同期先と端末でカタログIDが違っても、日報に退避した正式名を優先して現在のIDへ戻す。
    Object.entries(projectNames).forEach(([sourceId,name])=>{
      const clean=String(name||"").trim();
      const aliasId=clean?String(workLogProjectAliases()[clean]||"").trim():"";
      const resolved=(clean&&workProjects().find(project=>String(project?.name||"").trim()===clean))||workProjectOf(aliasId)||workProjectOf(sourceId);
      if(resolved&&!projectIds.includes(resolved.id))projectIds.push(resolved.id);
    });
    if(saved.projectId&&!projectIds.includes(saved.projectId))projectIds.unshift(saved.projectId);
    if(saved.workItemId&&!workItemIds.includes(saved.workItemId))workItemIds.unshift(saved.workItemId);
    const byName=workItems().find(x=>x.name===saved.workItem);
    if(byName&&!workItemIds.includes(byName.id))workItemIds.unshift(byName.id);
    if(saved.project&&!projectIds.length){const project=workProjects().find(x=>x.name===saved.project);if(project)projectIds.push(project.id);}
    workItemIds.forEach(id=>{const projectId=workItemOf(id)?.projectId;if(projectId&&!projectIds.includes(projectId))projectIds.push(projectId);});
    if(!workItemIds.length){
      const planned=(typeof planOf==="function"?planOf(key):[]).filter(x=>x&&x.workItemId);
      planned.forEach(x=>{if(!workItemIds.includes(x.workItemId))workItemIds.push(x.workItemId);const projectId=x.projectId||workItemOf(x.workItemId)?.projectId;if(projectId&&!projectIds.includes(projectId))projectIds.push(projectId);});
    }
    return {projectIds,workItemIds,projectId:projectIds[0]||"",workItemId:workItemIds[0]||""};
  }
  function workItemOptionsHtml(projectId,selected,key){
    const scheduled=new Set((typeof planOf==="function"?planOf(key):[]).filter(x=>x&&x.workItemId&&x.projectId===projectId).map(x=>x.workItemId));
    const list=workItems().filter(x=>!projectId||x.projectId===projectId).sort((a,b)=>(scheduled.has(b.id)?1:0)-(scheduled.has(a.id)?1:0)||String(a.name).localeCompare(String(b.name),"ja"));
    return `<option value="">仕事を選ぶ</option>${list.map(x=>`<option value="${esc2(x.id)}" ${x.id===selected?"selected":""}>${esc2(x.name)} ・ ${workPriorityLabel(x)} ・ ${esc2(workStatusLabel(x.status))}${scheduled.has(x.id)?" ・ 今日の時間割":""}</option>`).join("")}`;
  }
  function workScheduleHint(key,itemIds){
    const ids=asIdList(itemIds),planned=ids.flatMap(id=>scheduledWorkForDate(key,id));
    return planned.length?`時間割の予定：${planned.map(x=>`${esc2(workItemOf(x.workItemId)?.name||x.text||"仕事")} ${esc2(x.from||"--:--")}〜${esc2(x.to||"--:--")}`).join("、")}（実績の開始・終了は別に記録します）`:`一日の流れで登録した仕事を選ぶと、予定時間をここで確認できます。`;
  }
  function workLogProjectRowHtml(projectId,key,itemId=""){
    const project=workProjectOf(projectId);
    if(!project)return "";
    return `<article class="an-work-project-row" data-v2-work-project-row data-v2-work-project="${esc2(project.id)}"><div class="an-work-project-head"><strong>${esc2(project.name)}</strong><button type="button" class="an-work-project-remove" data-v2-work-project-remove="${esc2(project.id)}">外す</button></div><label class="an-work-field"><span>仕事内容</span><select data-v2-work-item-for-project="${esc2(project.id)}">${workItemOptionsHtml(project.id,itemId,key)}</select></label></article>`;
  }
  function selectedWorkLogProjects(){return [...root.querySelectorAll("[data-v2-work-project-row]")].map(row=>row.dataset.v2WorkProject).filter(Boolean);}
  function selectedWorkLogItems(){return [...root.querySelectorAll("[data-v2-work-project-row]")].map(row=>row.dataset.v2WorkItem).filter(Boolean);}
  function selectedWorkLogDescriptions(){const descriptions={};root.querySelectorAll("[data-v2-work-project-row]").forEach(row=>{const projectId=row.dataset.v2WorkProject,text=row.querySelector("[data-v2-work-description]")?.value.trim()||"";if(projectId&&text)descriptions[projectId]=text;});return descriptions;}
  function reviewChoiceValue(scope,key){
    const select=scope.querySelector(`[data-v2-work-review="${CSS.escape(key)}"]`),custom=scope.querySelector(`[data-v2-work-review-custom="${CSS.escape(key)}"]`);
    return select?.value==="__custom"?(custom?.value||"").trim():(select?.value||"").trim();
  }
  function selectedWorkLogReviews(){
    const reviews={};
    root.querySelectorAll("[data-v2-work-project-review]").forEach(scope=>{
      const projectId=scope.dataset.v2WorkProjectReview;if(!projectId)return;
      const review={description:scope.querySelector("[data-v2-work-description]")?.value.trim()||""};
      Object.keys(WORK_REVIEW_OPTIONS).forEach(key=>{const value=reviewChoiceValue(scope,key);if(value)review[key]=value;});
      if(Object.values(review).some(Boolean))reviews[projectId]=review;
    });
    return reviews;
  }
  function workReviewFor(record,projectId){
    const reviews=record?.projectReviews&&typeof record.projectReviews==="object"?record.projectReviews:{};
    const descriptions=record?.workDescriptions&&typeof record.workDescriptions==="object"?record.workDescriptions:{};
    const project=workProjectOf(projectId),names=record?.projectNames&&typeof record.projectNames==="object"&&!Array.isArray(record.projectNames)?record.projectNames:{};
    const sourceId=Object.entries(names).find(([,name])=>project&&String(name||"").trim()===String(project.name||"").trim())?.[0]||projectId;
    const legacyDescription=descriptions[projectId]||descriptions[sourceId]||"";
    return Object.assign({description:legacyDescription},reviews[projectId]||reviews[sourceId]||{});
  }
  function workReviewFieldHtml(projectId,key,value,options){
    const custom=Boolean(value)&&!options.includes(value),selected=custom?"__custom":value||"";
    return `<div class="an-work-review-entry" data-v2-work-review-entry="${esc2(key)}"><label class="an-work-field"><span>${esc2(WORK_REVIEW_LABELS[key])}</span><select data-v2-work-review="${esc2(key)}" data-v2-work-project="${esc2(projectId)}"><option value="">選択してください</option>${options.map(option=>`<option value="${esc2(option)}" ${option===selected?"selected":""}>${esc2(option)}</option>`).join("")}<option value="__custom" ${selected==="__custom"?"selected":""}>自由に入力する</option></select></label><textarea rows="2" data-v2-work-review-custom="${esc2(key)}" placeholder="${esc2(WORK_REVIEW_PLACEHOLDERS[key])}"${custom?"":" hidden"}>${esc2(custom?value:"")}</textarea></div>`;
  }
  function workProjectReviewHtml(projectId,key,itemId="",description="",review={},pageIndex=0){
    const fields=Object.keys(WORK_REVIEW_OPTIONS).map(reviewKey=>workReviewFieldHtml(projectId,reviewKey,review[reviewKey]||"",WORK_REVIEW_OPTIONS[reviewKey])).join("");
    return `<section class="an-work-project-review${pageIndex===0?" is-active":""}" data-v2-work-project-review="${esc2(projectId)}" data-v2-work-page-index="${pageIndex}">${workLogProjectRowHtml(projectId,key,itemId,description)}<div class="an-work-review-fields">${fields}</div></section>`;
  }
  function syncWorkLogProjectPage(index=0){
    if(page!=="workLog")return;
    const pages=[...root.querySelectorAll("[data-v2-work-project-review]")];
    if(!pages.length){root.querySelector("[data-v2-work-page-nav-wrap]")?.remove();root.querySelector("[data-v2-work-selected-projects]")?.remove();return;}
    const next=Math.max(0,Math.min(Number(index)||0,pages.length-1));
    pages.forEach((section,i)=>section.classList.toggle("is-active",i===next));
    const chipWrap=root.querySelector("[data-v2-work-selected-projects]");
    if(chipWrap)chipWrap.innerHTML=pages.map((section,i)=>{const project=workProjectOf(section.dataset.v2WorkProjectReview);return project?`<button type="button" data-v2-work-page-chip="${i}" aria-current="${i===next?"page":"false"}">${esc2(project.name)}</button>`:"";}).join("");
    root.querySelector("[data-v2-work-page-status]")?.replaceChildren(document.createTextNode(`${next+1} / ${pages.length}`));
    root.querySelectorAll("[data-v2-work-page-nav]").forEach(button=>{
      const direction=button.dataset.v2WorkPageNav;
      button.disabled=(direction==="prev"&&next===0)||(direction==="next"&&next===pages.length-1);
    });
    root.querySelectorAll("[data-v2-work-page-chip]").forEach(button=>{
      const active=Number(button.dataset.v2WorkPageChip)===next;
      button.classList.toggle("is-active",active);button.setAttribute("aria-current",active?"page":"false");
    });
  }
  function normalizeWorkLogDescriptions(){
    const date=document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()),draft=workLogDraftFor(date),saved=(S.workLogs&&S.workLogs[date])||{},descriptions=Object.assign({},saved.workDescriptions||{},draft?.workDescriptions||{});
    root.querySelectorAll("[data-v2-work-item-for-project]").forEach(select=>{
      const row=select.closest("[data-v2-work-project-row]"),projectId=row?.dataset.v2WorkProject;
      if(!row||!projectId||row.querySelector("[data-v2-work-description]"))return;
      row.dataset.v2WorkItem=select.value||"";
      const input=document.createElement("textarea");
      input.dataset.v2WorkDescription=projectId;input.value=String(descriptions[projectId]||"");input.placeholder="今日やった仕事内容を自由に記述";
      select.replaceWith(input);
    });
  }
  function syncWorkLogProjectAddOptions(){
    const select=root.querySelector("#v2WorkProjectAdd");
    if(!select)return;
    const selected=new Set(selectedWorkLogProjects());
    select.innerHTML=`<option value="" disabled hidden selected>プロジェクトを選択</option>${workProjects().filter(project=>!selected.has(project.id)).map(project=>`<option value="${esc2(project.id)}">${esc2(project.name)}</option>`).join("")}<option value="__new__">新しいプロジェクトを作る</option>`;
  }
  function syncWorkLogCatalog(){
    root.querySelectorAll("[data-v2-work-item-for-project]").forEach(select=>{select.disabled=false;});
    syncWorkLogProjectAddOptions();
    updateWorkLogScheduleHint();
  }
  function updateWorkLogScheduleHint(){
    const key=document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()),note=root.querySelector("[data-v2-work-schedule]");
    if(note)note.textContent=workScheduleHint(key,selectedWorkLogItems());
  }
  function workSavedReviewSummary(record,projectIds){
    return projectIds.map(projectId=>{const review=workReviewFor(record,projectId),project=workProjectOf(projectId);const parts=[review.description,review.done,review.statusNote,review.todo,review.trial,review.delivery,review.next].filter(Boolean);if(!parts.length)return "";return `<article class="an-work-saved-review"><h3>${esc2(project?.name||"プロジェクト")}</h3>${review.description?`<p><strong>仕事内容</strong>${esc2(review.description)}</p>`:""}${review.done?`<p><strong>やったこと・成果</strong>${esc2(review.done)}</p>`:""}${review.statusNote?`<p><strong>今の状況</strong>${esc2(review.statusNote)}</p>`:""}${review.todo?`<p><strong>やること</strong>${esc2(review.todo)}</p>`:""}${review.trial?`<p><strong>試行・メモ</strong>${esc2(review.trial)}</p>`:""}${review.delivery?`<p><strong>納品・成果物</strong>${esc2(review.delivery)}</p>`:""}${review.next?`<p><strong>次回やること</strong>${esc2(review.next)}</p>`:""}</article>`;}).join("");
  }
  function workLog(){
    const key=workLogDate||ymd(now()),saved=(S.workLogs&&S.workLogs[key])||{},draft=workLogDraftFor(key),form=workLogFormReset?{}:Object.assign({},saved,draft||{}),punch=workPunchState(form),projectReviews=form.projectReviews&&typeof form.projectReviews==="object"?form.projectReviews:{},selection=workLogSelection(key,form),planned=scheduledWorkForDate(key,selection.workItemId)[0],start=form.start||punch.firstStart||planned?.from||"",end=form.end||punch.lastEnd||planned?.to||"";
    const input=(id,label,type,value,placeholder="")=>`<label class="an-work-field"><span>${label}</span><input id="${id}" type="${type}" value="${esc2(value==null?"":value)}"${placeholder?` placeholder="${placeholder}"`:""}></label>`;
    const timeInput=(id,label,value)=>{const edge=id==="v2WorkStart"?"start":"end",changed=workTimeSaved(saved,edge);return `<label class="an-work-field an-work-time-field"><span>${label}</span><span class="an-work-time-control"><input id="${id}" type="time" value="${esc2(value==null?"":value)}"><span class="an-work-time-value" data-v2-work-time-value="${id}" aria-hidden="true">${esc2(value||"--:--")}</span></span><span class="an-work-time-actions"><button type="button" class="an-work-time-save${changed?" is-change":""}" data-v2-work-time-save="${edge}" ${canWrite()?"":"disabled"}>${label}${changed?"を変更":"を確定"}</button></span></label>`;};
    const choice=(id,label,value,options,placeholder)=>{const custom=Boolean(value)&&!options.includes(value),selected=custom?"__custom":value||"";return `<div class="an-work-entry" data-v2-work-entry="${id}"><label class="an-work-field"><span>${label}</span><select id="${id}Choice" data-v2-work-choice="${id}"><option value="">選択してください</option>${options.map(option=>`<option value="${esc2(option)}" ${option===selected?"selected":""}>${esc2(option)}</option>`).join("")}<option value="__custom" ${selected==="__custom"?"selected":""}>自由に入力する</option></select></label><textarea id="${id}" data-v2-work-custom="${id}" rows="3" placeholder="${placeholder}"${custom?"":" hidden"}>${esc2(custom?value:"")}</textarea></div>`};
    const options={done:["調査した","作成した","修正した","確認した","提出した"],statusNote:["進行中","確認待ち","問題あり","完了","保留"],todo:["次の作業を決める","確認・修正する","提出・共有する","返事を待つ"],trial:["比較した","試作した","相談した","調べた"],delivery:["提出済み","確認済み","未提出","対象なし"],next:["続きから始める","結果を確認する","次の予定を入れる","保留の理由を書く"]};
    const savedProjectIds=selection.projectIds.map(id=>workProjectOf(id)?.name).filter(Boolean),savedItemIds=selection.workItemIds.map(id=>workItemOf(id)).filter(Boolean),summary=Object.keys(saved).length?`<section class="an-work-summary"><h2>保存済みの記録</h2><div class="an-work-summary-stats"><div><small>実作業時間</small><b>${formatWorkMinutes(workLogMinutes(saved))}</b></div><div><small>休憩</small><b>${workLogBreakMinutes(saved)}分</b></div></div>${savedProjectIds.length?`<p><strong>プロジェクト</strong>${esc2(savedProjectIds.join("、"))}</p>`:""}${savedItemIds.length?`<p><strong>仕事内容</strong>${savedItemIds.map(item=>`${esc2(item.name)}（${esc2(workStatusLabel(item.status))}・優先 ${workPriorityLabel(item)}）`).join("、")}</p>`:""}${(saved.done||saved.implementation)?`<p><strong>やったこと・成果</strong>${esc2(saved.done||saved.implementation)}</p>`:""}${(saved.statusNote||saved.quality)?`<p><strong>今の状況</strong>${esc2(saved.statusNote||saved.quality)}</p>`:""}${(saved.todo||saved.insight)?`<p><strong>やること</strong>${esc2(saved.todo||saved.insight)}</p>`:""}${(saved.trial||saved.design)?`<p><strong>試行・メモ</strong>${esc2(saved.trial||saved.design)}</p>`:""}${saved.delivery?`<p><strong>納品・成果物</strong>${esc2(saved.delivery)}</p>`:""}${saved.next?`<p><strong>次回やること</strong>${esc2(saved.next)}</p>`:""}</section>`:"";
    const dateLabel=String(key).replaceAll("-","/"),initialState=workLogState(form),initialNet=initialState.net==null?"未計算":formatWorkMinutes(initialState.net),punchLabel=punch.activeBreak?"休憩中":punch.activeWork?"勤務中":"未打刻",selectedRows=selection.projectIds.map((projectId,pageIndex)=>{const itemId=selection.workItemIds.find(id=>workItemOf(id)?.projectId===projectId)||"",review=workReviewFor(form,projectId);return workProjectReviewHtml(projectId,key,itemId,review.description||"",review,pageIndex);}).join(""),projectOptions=workProjects().filter(project=>!selection.projectIds.includes(project.id)).map(project=>`<option value="${esc2(project.id)}">${esc2(project.name)}</option>`).join(""),selectedProjectNames=selection.projectIds.map((projectId,pageIndex)=>{const project=workProjectOf(projectId);return project?`<button type="button" data-v2-work-page-chip="${pageIndex}" aria-current="${pageIndex===0?"page":"false"}">${esc2(project.name)}</button>`:"";}).join(""),projectPageNav=selection.projectIds.length?`<div class="an-work-page-nav" data-v2-work-page-nav-wrap><button type="button" data-v2-work-page-nav="prev" disabled aria-label="前のプロジェクト">◀</button><strong data-v2-work-page-status>1 / ${selection.projectIds.length}</strong><button type="button" data-v2-work-page-nav="next" ${selection.projectIds.length<2?"disabled":""} aria-label="次のプロジェクト">▶</button></div><div class="an-work-selected-projects" data-v2-work-selected-projects aria-label="選択中のプロジェクト">${selectedProjectNames}</div>`:"",projectRows=`<label class="an-work-project-add"><span>プロジェクトを追加</span><select id="v2WorkProjectAdd"><option value="" disabled hidden selected>プロジェクトを選択</option>${projectOptions}<option value="__new__">新しいプロジェクトを作る</option></select></label>${projectPageNav}<div class="an-work-project-selected" data-v2-work-catalog-list>${selectedRows||`<p class="an-work-project-empty" data-v2-work-project-empty>プロジェクトを追加すると、ここに選んだ仕事が表示されます。</p>`}</div>`;
    return analogPage("an-work-log","work","WORK LOG","仕事の記録",`<p class="an-date-note">予定した仕事と、実際に行った仕事を同じ名前で記録できます。</p><section class="an-work-form"><label class="an-work-date"><span>日付</span><span class="an-work-date-control"><input id="v2WorkDate" aria-label="日付" type="date" value="${esc2(key)}"><span class="an-work-date-value" aria-hidden="true">${esc2(dateLabel)}</span></span></label><div class="an-work-punch" data-v2-work-punch-state="${punchLabel}"><strong>勤務の打刻</strong><span class="an-work-punch-status">${punchLabel}</span><div class="an-work-punch-actions"><button type="button" data-v2-work-punch="in" ${punch.activeWork?"disabled":""}>勤務開始（IN）</button><button type="button" data-v2-work-punch="break-start" ${!punch.activeWork||punch.activeBreak?"disabled":""}>休憩開始</button><button type="button" data-v2-work-punch="break-end" ${!punch.activeBreak?"disabled":""}>休憩終了</button><button type="button" data-v2-work-punch="out" ${!punch.activeWork?"disabled":""}>勤務終了（OUT）</button></div></div><div class="an-work-time-grid">${timeInput("v2WorkStart","作業開始",start)}${timeInput("v2WorkEnd","作業終了",end)}</div>${input("v2WorkBreak","休憩分","number",form.breakMinutes==null?"":form.breakMinutes,"例：60")}<div class="an-work-duration" data-v2-work-duration data-state="${initialState.state}"><div><small>実作業時間</small><b data-v2-work-net>${initialNet}</b></div><p data-v2-work-duration-note>${workLogDurationNote(initialState)}</p></div></section><section class="an-work-section an-work-catalog"><h2>仕事を選ぶ</h2><p class="an-work-catalog-help">複数の仕事を選び、それぞれの仕事内容を記録できます。</p><div class="an-work-project-list">${projectRows}</div><p class="an-work-schedule-note" data-v2-work-schedule>${workScheduleHint(key,selection.workItemIds)}</p></section><p class="an-work-review-help">各プロジェクトの中で、その日の振り返りを記録します。</p><button type="button" class="an-save blue" data-v2-work-save>仕事の記録を保存</button>${summary}`);
  }
  function healthMetrics(){
    const ds=healthDays();
    return [
      {id:"sleep",label:"睡眠",min:180,max:600,c:"#4d80ad",kind:"bar",marker:"bar",vals:ds.map(d=>{const h=S.health[d]||{},v=sleepMin(h.bed,h.wake);return v||null;}),format:v=>fmtSleep(v)},
      {id:"steps",label:"歩数",min:0,max:12000,c:"#4f986f",kind:"bar",marker:"bar",vals:ds.map(d=>{const v=(S.health[d]||{}).steps;return v==null?null:+v;}),format:v=>`${(+v).toLocaleString("ja-JP")}歩`},
      {id:"body",label:"からだ",min:1,max:5,c:"#796aa8",kind:"line",marker:"circle",vals:ds.map(d=>{const v=+(S.health[d]||{}).body||0;return v||null;}),format:v=>`${v} / 5`},
      {id:"mind",label:"こころ",min:1,max:5,c:"#ca796b",kind:"line",marker:"square",dash:"5 4",vals:ds.map(d=>{const v=+(S.health[d]||{}).mind||0;return v||null;}),format:v=>`${v} / 5`}
    ];
  }
  function legacyWorkCandidates(){
    const registered=new Set(workItems().map(item=>`${item.projectId||""}::${String(item.name||"").trim()}`));
    const candidates=new Map();
    const add=(projectId,name,source)=>{
      const clean=String(name||"").trim();
      if(!clean)return;
      const key=`${projectId||""}::${clean}`;
      if(registered.has(key)||candidates.has(key))return;
      candidates.set(key,{key,projectId:projectId||workProjects()[0]?.id||"",name:clean,source});
    };
    for(const list of Object.values(S.plan||{})) for(const event of Array.isArray(list)?list:[]){
      if(event && (event.lane==="work"||event.cat==="work"||event.cat==="make")) add(event.projectId,event.text,"時間割の仕事予定");
    }
    for(const event of Array.isArray(S.dailyTimeline)?S.dailyTimeline:[]){
      if(event && event.lane==="work") add(event.projectId,event.text,"毎日の仕事予定");
    }
    return [...candidates.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name),"ja"));
  }
  function linkWorkCatalogItem(item){
    const matches=(event)=>event && !event.workItemId && String(event.text||"").trim()===item.name && (event.lane==="work"||event.cat==="work"||event.cat==="make"||event.projectId===item.projectId);
    for(const list of Object.values(S.plan||{})) for(const event of Array.isArray(list)?list:[]){
      if(matches(event)){event.workItemId=item.id;event.projectId=item.projectId;event.lane="work";event.cat="work";}
    }
    for(const event of Array.isArray(S.dailyTimeline)?S.dailyTimeline:[]){
      if(matches(event)){event.workItemId=item.id;event.projectId=item.projectId;event.lane="work";event.cat="work";}
    }
    for(const record of Object.values(S.workLogs||{})){
      if(record && !record.workItemId && (record.workItem===item.name || record.projectId===item.projectId || record.project===workProjectOf(item.projectId)?.name)){
        record.workItemId=item.id;record.projectId=item.projectId;
      }
    }
  }
  function healthChart(){
    const ds=healthDays(), metrics=healthMetrics().filter(m=>metricOn[m.id]);
    const W=360,H=238,L=34,R=12,T=33,B=34,gx=L,gw=W-L-R,base=H-B;
    const x=i=>gx+(ds.length<2?gw/2:i*gw/(ds.length-1));
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    const norm=(m,v)=>v==null?null:clamp((v-m.min)/(m.max-m.min),0,1);
    const y=n=>base-n*(base-T), barMetrics=metrics.filter(m=>m.kind==="bar"), lineMetrics=metrics.filter(m=>m.kind==="line");
    const grid=[0,.25,.5,.75,1].map(n=>`<line x1="${gx}" y1="${y(n)}" x2="${gx+gw}" y2="${y(n)}" stroke="rgba(39,55,68,.15)" stroke-dasharray="3 4"></line>`).join("");
    const barLayout=(mi,i)=>{const width=mi===0?16:8,center=x(i)+(mi-(barMetrics.length-1)/2)*14;return {width,center};};
    const bars=barMetrics.map((m,mi)=>m.vals.map((v,i)=>{const n=norm(m,v);if(n==null)return "";const {width,center}=barLayout(mi,i),opacity=mi===0?.48:.9;return `<rect x="${center-width/2}" y="${y(n)}" width="${width}" height="${Math.max(2,base-y(n))}" rx="4" fill="${m.c}" opacity="${opacity}"></rect>`;}).join("")).join("");
    const barHits=barMetrics.map((m,mi)=>m.vals.map((v,i)=>{const n=norm(m,v);if(n==null)return "";const {width,center}=barLayout(mi,i),hitWidth=width+8,hitY=Math.max(T,y(n)-4),hitBottom=Math.min(base+4,base+4),hitHeight=Math.max(10,hitBottom-hitY);return `<rect class="v2-health-bar-hit" data-v2-health-bars="${m.id}" data-v2-health-bar-index="${i}" x="${center-hitWidth/2}" y="${hitY}" width="${hitWidth}" height="${hitHeight}" rx="${Math.min(8,hitWidth/2)}" fill="transparent" fill-opacity="0" stroke="none" style="fill:transparent;fill-opacity:0;stroke:none" pointer-events="all" tabindex="0" role="button" aria-label="${dateLabel(ds[i])}の${m.label}"></rect>`;}).join("")).join("");
    const pathFor=m=>{let joined=false;return m.vals.map((v,i)=>{const n=norm(m,v);if(n==null)return "";const cmd=joined?"L":"M";joined=true;return `${cmd}${x(i)} ${y(n)}`;}).join(" ");};
    const marker=(m,i,n)=>{const common=`class="v2-health-value-target" data-v2-health-point="${i}" data-v2-health-metric="${m.id}" tabindex="0" role="button" aria-label="${dateLabel(ds[i])}の${m.label}: ${m.format(m.vals[i])}" fill="#fffaf0" stroke="${m.c}" stroke-width="2.4"`;
      if(m.marker==="square")return `<rect ${common} x="${x(i)-4.8}" y="${y(n)-4.8}" width="9.6" height="9.6" rx="1.5"></rect>`;
      if(m.marker==="triangle")return `<path ${common} d="M ${x(i)} ${y(n)-5.8} L ${x(i)+5.3} ${y(n)+4.4} L ${x(i)-5.3} ${y(n)+4.4} Z"></path>`;
      return `<circle ${common} cx="${x(i)}" cy="${y(n)}" r="5.1"></circle>`;
    };
    const lines=lineMetrics.map(m=>{const path=pathFor(m);return `<path d="${path}" fill="none" stroke="${m.c}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" ${m.dash?`stroke-dasharray="${m.dash}"`:""}></path><path class="v2-health-line-hit" data-v2-health-line="${m.id}" d="${path}" fill="none"></path>${m.vals.map((v,i)=>{const n=norm(m,v);return n==null?"":marker(m,i,n);}).join("")}`;}).join("");
    const picked=healthChartSelectedPoint&&ds[healthChartSelectedPoint.index]?healthChartSelectedPoint:null;
    const pickedMetric=picked&&healthMetrics().find(m=>m.id===picked.metric), pickedValue=pickedMetric?.vals[picked.index];
    const detail=(!pickedMetric||pickedValue==null)?"":`<p class="an-health-detail" style="--health-detail:${pickedMetric.c}"><strong>${pickedMetric.label} ${pickedMetric.format(pickedValue)}</strong></p>`;
    return `<div class="v2-health-viewport" data-v2-health-viewport><div class="v2-health-stage" data-v2-health-stage style="--health-chart-scale:${healthChartView.scale};--health-chart-x:${healthChartView.x}px;--health-chart-y:${healthChartView.y}px"><svg class="v2-line-chart v2-health-compare" viewBox="0 0 ${W} ${H}" role="img" aria-label="睡眠・歩数・からだ・こころの一週間の比較グラフ"><title>一週間の体調比較</title>${grid}${bars}${barHits}${lines}<line x1="${gx}" y1="${base}" x2="${gx+gw}" y2="${base}" stroke="rgba(39,55,68,.4)"></line>${ds.map((d,i)=>`<text x="${x(i)}" y="${H-10}" text-anchor="middle">${"日月火水木金土"[new Date(d+"T00:00:00").getDay()]}</text>`).join("")}</svg></div></div>${detail}`;
  }
  function healthAnalysis(){const labels=[["sleep","睡眠","#376b91"],["steps","歩数","#39785d"],["body","からだ","#7263a8"],["mind","こころ","#c86655"]];return `<section class="v2-page v2-health-analysis">${top(titleFor(page))}<p class="v2-kicker">${icon("chart")}HEALTH ANALYSIS</p><h2 class="v2-page-lead">一週間の相関</h2><div class="v2-chart-block"><h2>睡眠・歩数・調子の変化</h2><div class="v2-metric-toggle">${labels.map(([id,l,c])=>`<button class="${metricOn[id]?"":"off"}" data-v2-metric="${id}"><i style="background:${c}"></i>${l}</button>`).join("")}</div>${healthChart()}</div><div class="v2-chart-block"><h2>振り返り</h2><div class="v2-outline-row"><i>${icon("moon")}</i><span>睡眠が短い日<small>5時間未満の日</small></span><strong>${healthDays().filter(d=>(sleepMin((S.health[d]||{}).bed,(S.health[d]||{}).wake)||0)<360).length}日</strong></div><div class="v2-outline-row"><i>${icon("foot")}</i><span>よく歩いた日<small>8,000歩以上の日</small></span><strong class="v2-green">${healthDays().filter(d=>+(S.health[d]||{}).steps>=8000).length}日</strong></div></div></section>`;}
  // 共通の時間割カード geometry は、この下の定義だけを正本にする。
  const FLOW_LANE_GAP = 5;
  function flowCardGeometry(block){
    const lane=flowLane(block),laneWidth=flowLaneFilter==="common"&&(lane==="work"||lane==="life")?50:100,laneBase=flowLaneFilter==="common"&&lane==="life"?50:0;
    const colWidth=laneWidth/block._v2Cols;
    return {
      left:"calc("+(laneBase+(block._v2Col||0)*colWidth)+"% + "+FLOW_LANE_GAP+"px)",
      width:"calc("+colWidth+"% - "+(FLOW_LANE_GAP*2)+"px)"
    };
  }
  function flow(){
    const key = flowDate;
    const rec = S.daily[key] || {};
    const blocks = allBlocks(key);
    const start = typeof TL_START === "number" ? TL_START : 4 * 60;
    const end = typeof TL_END === "number" ? TL_END : 27 * 60;
    const h = Math.round(((end - start) / 60) * FLOW_HOUR_PX);
    const slots = [];
    for(let m=start;m<=end;m+=60) slots.push(`<span class="v2-time" style="top:${(m-start)/(end-start)*h}px">${toHHMM(m % 1440)}</span>`);
    const events = blocks.map(b=>{
      const a=Math.max(start,b.a), z=Math.min(end,b.b);
      if(z<=a) return "";
      return `<div class="v2-event" style="--event:${esc2(b.color||catOf(b.cat).color)};top:${(a-start)/(end-start)*h}px;height:${Math.max(42,(z-a)/(end-start)*h-3)}px"><strong>${esc2(b.text)}</strong><span>${toHHMM(a % 1440)} - ${toHHMM(z % 1440)}</span></div>`;
    }).join("");
    const n=now(), nowM=n.getHours()*60+n.getMinutes(), isToday=key===ymd(n);
    const nowline=isToday&&nowM>=start&&nowM<=end?`<div class="v2-now" style="top:${(nowM-start)/(end-start)*h}px"><b>いま ${toHHMM(nowM)}</b></div>`:"";
    return `<section class="v2-page v2-flow-page">${top(titleFor(page))}<div class="v2-theme-line"><div><small>${dateLabel(key)}</small><div class="v2-theme-marquee"><strong>${esc2(rec.theme||"今日のテーマを設定")}</strong></div></div>${icon("edit")}</div><div class="v2-flow-heading"><span>${icon("clock")}時間割</span><small>${isToday ? "現在時刻は赤い線で表示しています" : "選んだ日の予定"}</small></div><div class="v2-timeline" style="min-height:${h}px">${slots.join("")}${events}${nowline}</div><div class="v2-flow-actions"><button data-v2-plan-open>${icon("plus")}<span>予定を足す</span>${icon("back")}</button><button data-v2-go="checklist">${icon("list")}<span>チェックリストを開く</span>${icon("back")}</button><button data-v2-go="calendar">${icon("calendar")}<span>週／月を見る</span>${icon("back")}</button></div><div id="v2PlanArea"></div></section>`;
  }
  // 旧チェックリストは廃止。選択中の日付を扱う checklistV2 に一本化する。
  function checklist(){ return checklistV2(); }
  function theme(){const key=ymd(now()),value=(S.daily[key]||{}).theme||"";return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("sun")}TODAY'S THEME</p><h2 class="v2-heading">今日のテーマ</h2><div class="v2-form-row"><label for="v2Theme">テーマ</label><input id="v2Theme" value="${esc2(value)}" maxlength="40" placeholder="ひとことで書く"></div><button class="v2-primary" data-v2-theme-save>${icon("download")}テーマを保存</button></section>`;}
  function calendar(){const base=new Date(calendarDate+"T00:00:00"),mon=new Date(base);mon.setDate(base.getDate()-((base.getDay()+6)%7));let content="";if(calendarMode==="week"){content=`<div class="v2-week">${Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const key=ymd(d),bs=allBlocks(key);return `<button class="v2-week-day ${key===ymd(now())?"today":""}" data-v2-cal-date="${key}"><span>${"月火水木金土日"[i]}</span><b>${d.getDate()}</b>${bs.slice(0,3).map(b=>`<i class="v2-cal-dot" style="background:${esc2(b.color||catOf(b.cat).color)}"></i>`).join("")}</button>`}).join("")}</div>`;}else{const y=base.getFullYear(),m=base.getMonth(),days=new Date(y,m+1,0).getDate(),off=(new Date(y,m,1).getDay()+6)%7;content=`<div class="v2-month">${Array.from({length:off},()=>"<span></span>").join("")}${Array.from({length:days},(_,i)=>{const d=i+1,key=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,has=allBlocks(key).length;return `<button class="${key===ymd(now())?"today ":""}${has?"has":""}" data-v2-cal-date="${key}">${d}</button>`}).join("")}</div>`;}const period=calendarMode==="week"?`${mon.getMonth()+1}月${mon.getDate()}日からの1週間`:`${base.getFullYear()}年${base.getMonth()+1}月`;return `<section class="v2-page v2-calendar-page">${top(titleFor(page))}<p class="v2-kicker">${icon("calendar")}CALENDAR</p><h2 class="v2-page-lead">${period}</h2><div class="v2-calendar-switch"><button class="${calendarMode==="week"?"on":""}" data-v2-cal-mode="week">1週間</button><button class="${calendarMode==="month"?"on":""}" data-v2-cal-mode="month">1か月</button></div>${content}<p class="v2-note">日付をタップすると、その日の時間割を開きます。</p></section>`;}
  // 旧設定画面は廃止。設定は5フォルダ構成の settingsV2 に一本化する。
  function settings(){ return settingsV2(); }
  function checklistV2(){
    const key=flowDate, rec=S.daily[key]||{habits:{}};
    const tasks=plannedOn(key).slice().sort((a,b)=>PRIOS.findIndex(p=>p.id===autoPriority(a).id)-PRIOS.findIndex(p=>p.id===autoPriority(b).id));
    const habits=habitList().map(h=>`<button class="v2-habit ${rec.habits&&rec.habits[h.id]?"on":""}" data-v2-habit="${esc2(h.id)}"><i>${habitIcon(h)}</i>${esc2(h.label)}</button>`).join("");
    const list=tasks.length ? tasks.map(t=>{const p=autoPriority(t);return `<button class="v2-task ${t.done?"done":""}" data-v2-task="${esc2(t.id)}"><i class="v2-check">✓</i><span><strong>${esc2(t.text)}</strong><small style="color:${p.color}">${esc2(p.label)}</small></span></button>`;}).join("") : `<p class="v2-empty">予定を足すと、ここで状態を記録できます。</p>`;
    return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("list")}${dateLabel(key)}</p><section class="v2-check-section"><h2>今日の習慣</h2><div class="v2-habits">${habits}</div></section><section class="v2-check-section"><h2>今日やること</h2>${list}</section></section>`;
  }
  function settingsV2(){
    const cfg=syncCfg();
    const methods=[...(S.expenseMethods||[])].map(esc2).join("、") || "追加なし";
    const categories=[...(S.expenseCats||[])].map(esc2).join("、") || "追加なし";
    return `<section class="v2-page v2-settings-page">${top("設定")}<p class="v2-kicker">${icon("settings")}SETTINGS</p><h2 class="v2-page-lead">暮らしの設定</h2><div class="v2-settings">
      <details><summary><i>${icon("refresh")}</i><span><strong>同期・歩数／睡眠</strong><small>${cfg.token&&cfg.gistId?"同期済み・アプリを開くと更新します":"未接続"}</small></span></summary><div class="v2-settings-body"><p>歩数と睡眠は、設定済みのiPhoneショートカット／同期から読み込みます。</p><label>GitHubトークン</label><input id="v2SyncToken" type="password" autocomplete="off" placeholder="初回設定時のみ入力"><label>Gist ID</label><input id="v2SyncGist" value="${esc2(cfg.gistId||"")}" placeholder="2台目のみ入力"><button class="v2-sub-action" data-v2-sync-start>${icon("refresh")}同期を設定・開始</button><button class="v2-sub-action" data-v2-sync>今すぐ同期する</button><button class="v2-sub-action" data-v2-role>${cfg.role==="ro"?"記録する端末にする":"見るだけの端末にする"}</button></div></details>
      <details><summary><i>${icon("list")}</i><span><strong>毎日の習慣</strong><small>今日の流れに表示する項目</small></span></summary><div class="v2-settings-body"><div class="v2-habits">${habitList().map(h=>`<span class="v2-habit"><i>${habitIcon(h)}</i>${esc2(h.label)}</span>`).join("")}</div><label>習慣の名前</label><input id="v2HabitLabel" placeholder="例：ストレッチ"><button class="v2-sub-action" data-v2-habit-add>${icon("plus")}習慣を追加</button></div></details>
      <details><summary><i>${icon("wallet")}</i><span><strong>お金の初期設定</strong><small>カード上限・方法・カテゴリー</small></span></summary><div class="v2-settings-body"><label>カードの上限</label><input id="v2CardCap" type="text" inputmode="numeric" value="${(+S.cardCap||0).toLocaleString("ja-JP")}"><button class="v2-sub-action" data-v2-card-cap>上限を保存</button><hr><label>支出の方法</label><small>追加済み：${methods}</small><input id="v2MethodAdd" placeholder="例：交通系IC"><button class="v2-sub-action" data-v2-method-add>方法を追加</button><label>支出のカテゴリー</label><small>追加済み：${categories}</small><input id="v2CategoryAdd" placeholder="例：医療費"><button class="v2-sub-action" data-v2-category-add>カテゴリーを追加</button><hr><label>収入の受け取り方法</label><input id="v2IncomeMethodAdd" placeholder="例：PayPay"><button class="v2-sub-action" data-v2-income-method-add>方法を追加</button><label>収入のカテゴリー</label><input id="v2IncomeCategoryAdd" placeholder="例：傷病手当"><button class="v2-sub-action" data-v2-income-category-add>カテゴリーを追加</button></div></details>
      <details><summary><i>${icon("calendar")}</i><span><strong>カレンダー連携</strong><small>予定の取り込みと表示</small></span></summary><div class="v2-settings-body"><p>予定は「一日の流れ」から確認・追加できます。</p></div></details>
      <details><summary><i>${icon("download")}</i><span><strong>バックアップ</strong><small>この端末のデータを保存</small></span></summary><div class="v2-settings-body"><p>端末の記録を書き出して保管できます。</p><button class="v2-sub-action" data-v2-export>${icon("download")}データを書き出す</button></div></details>
    </div></section>`;
  }
  /* 2026-08-08: approved money-record page is the source of truth. The definitions below
     deliberately replace the old V2 shells so every route shares the same paper, header,
     typography, spacing and return affordance without inheriting legacy card geometry. */
  function analogHeader(settings = true){
    const backAction = stack.length ? "data-v2-back" : "data-v2-home";
    return `<header class="an-header"><div class="an-nav"><button class="an-nav-button" ${backAction}>${icon("back")}<span>戻る</span></button><div class="an-brand">${appBrand()}</div>${settings ? `<button class="an-nav-button" data-v2-go="settings">${icon("settings")}<span>設定</span></button>` : `<span class="an-nav-space" aria-hidden="true"></span>`}</div><div class="an-issue"><span>${issueDate()}</span><span>${versionLabel()}</span></div></header>`;
  }
  function analogMark(iconName, english, japanese){
    return `<div class="an-mark"><p><span>${icon(iconName)}</span>${esc2(english)}</p>${japanese ? `<h1>${esc2(japanese)}</h1>` : ""}</div>`;
  }
  function analogReturn(){ return `<button class="an-home-return" data-v2-home>${icon("home")}<span>ホームへ戻る</span></button>`; }
  function analogPage(cls, iconName, english, title, content, options = {}){
    return `<section class="v2-page an-page ${cls || ""}">${analogHeader(options.settings !== false)}<main class="an-content">${analogMark(iconName,english,title)}${content}</main>${options.home === false ? "" : analogReturn()}</section>`;
  }
  function analogChoice(to, tone, i, label, sub, attrs=""){
    return `<button class="an-choice ${tone}" data-v2-go="${to}" ${attrs||""}><span class="an-choice-icon">${icon(i)}</span><span class="an-choice-copy"><strong>${esc2(label)}</strong>${sub ? `<small>${esc2(sub)}</small>` : ""}</span><b>›</b></button>`;
  }
  function homeV2(){
    const catalog=HOME_SHORTCUT_CATALOG;
    const fallback=["moneyRecord","flow","healthRecord"];
    const legacyFallback=["moneyAnalysis","healthAnalysis","calendar"];
    const stored=Array.isArray(S.homeShortcuts)&&S.homeShortcuts.length===3&&S.homeShortcuts.every(x=>catalog[x])?S.homeShortcuts:null;
    const shortcuts=stored&&stored.join("|")!==legacyFallback.join("|")?stored:fallback;
    const d=now(),time=toHHMM(d.getHours()*60+d.getMinutes());
    const tile=id=>`<button class="an-home-shortcut" data-v2-go="${id}">${icon(catalog[id][0])}<span>${catalog[id][1]}</span></button>`;
    const group=(id,tone,iconName,title,sub,items)=>{const open=homeOpenGroups.has(id);return `<section class="an-home-group ${tone}${open?" is-open":""}"><button type="button" class="an-home-group-toggle" data-v2-home-group-toggle="${id}" aria-expanded="${open}"><span class="an-home-group-icon">${icon(iconName)}</span><span><h2>${title}</h2><p>${sub}</p></span><b>${open?"閉じる":"開く"}</b></button><div class="an-home-group-list"${open?"":" hidden"}>${items.map(x=>analogChoice(...x)).join("")}</div></section>`;};
    const work=group("work","work","work","仕事","予定・実績・日報をまとめる",[["flow","blue","calendar","仕事の時間割","予定と現在時刻を見る",`data-v2-open-flow-filter="work"`],["workBoard","blue","list","仕事の一覧","優先度ごとに次の行動を見る"],["workLog","blue","work","仕事の記録","作業・休憩・日報を残す"]]);
    const life=group("life","life","life","生活","お金・こころとからだを記録する",[["moneyRecord","green","money","支出・収入","金額、方法、カテゴリーを記録"],["healthRecord","green","heart","こころとからだ","今日の調子を記録"],["checklist","yellow","list","生活の習慣・やること","今日の習慣と予定を確認"]]);
    const review=group("review","review","chart","見える化","記録した変化を振り返る",[["moneyAnalysis","purple","money","お金の分析","支払い方法とカテゴリーの傾向"],["healthAnalysis","purple","body","体調の分析","睡眠・歩数・こころ・からだ"]]);
    return `<section class="v2-page an-page an-home"><main class="an-home-content"><div class="an-home-brand">${appBrand()}</div><p class="an-home-positioning">${PRODUCT_PROMISE}</p><div class="an-home-meta"><div class="an-home-date"><span>今日</span><time data-v2-live-date>${dateLabel(ymd(d))}</time></div><strong data-v2-live-time>${time}</strong></div><section class="an-home-shortcuts" aria-label="ショートカット"><div><h2>ショートカット</h2><button type="button" data-v2-shortcuts-open>編集</button></div><div class="an-home-shortcut-grid">${shortcuts.map(tile).join("")}</div><div id="v2ShortcutArea"></div></section><div class="an-home-groups">${work}${life}${review}</div><button type="button" class="an-home-settings" data-v2-go="settings">${icon("settings")}<span>設定</span></button></main></section>`;
  }
  function branch(kind){
    const groups={
      record:[["moneyRecord","blue","money","支出・収入","金額、方法、カテゴリーを記録"],["healthRecord","green","heart","こころとからだ","今日の調子を記録"]],
      today:[["flow","purple","calendar","一日の流れ","予定と現在時刻を見る"],["workLog","blue","work","仕事の記録","作業・休憩・日報を残す"],["theme","yellow","sun","テーマ設定","今日の軸をひとことで"],["ideas","blue","edit","アイデアと目標","プラグイン・映像・今月の目標"]],
      visualize:[["moneyAnalysis","blue","money","お金の分析","支払い方法とカテゴリーの傾向"],["healthAnalysis","green","body","体調の分析","睡眠・歩数・こころ・からだ"]]
    };
    const data=groups[kind]||groups.visualize;
    const head={record:["edit","RECORD","記録する"],today:["sun","TODAY","今日を整える"],visualize:["chart","REVIEW","見える化する"]}[kind]||["chart","REVIEW","見える化する"];
    return analogPage("an-branch",head[0],head[1],head[2],`<div class="an-choice-list">${data.map(x=>analogChoice(...x)).join("")}</div>`);
  }
  function benefitOverview(){
    const b=Object.assign({start:"2026-01",units:18,nextApplicationStart:"2026-08-01",applicationMonths:"",applicationDays:""},S.benefit||{});
    if(!b.nextApplicationStart)b.nextApplicationStart="2026-08-01";
    const total=Math.max(0,Number(b.units)||0),keys=[];
    for(let i=0;i<total;i++) keys.push(addMonths(b.start,i));
    const currentMonth=ymd(now()).slice(0,7);
    const received=keys.filter(key=>Boolean(S.benefitMonths&&S.benefitMonths[key])).length;
    const remainingByPeriod=keys.filter(key=>key>=currentMonth).length;
    const span=[b.applicationMonths!==""&&b.applicationMonths!=null?`${b.applicationMonths}か月`:"",b.applicationDays!==""&&b.applicationDays!=null?`${b.applicationDays}日`:""].filter(Boolean).join("");
    const monthText=key=>/^\d{4}-\d{2}$/.test(String(key||""))?`${key.slice(0,4)}年${Number(key.slice(5,7))}月`:"未設定";
    return {nextApplicationStart:b.nextApplicationStart?dateLabel(b.nextApplicationStart):"未設定",applicationSpan:span||"未入力",receivingPeriod:keys.length?`${monthText(keys[0])}〜${monthText(keys[keys.length-1])}`:"未設定",remaining:remainingByPeriod,total,received};
  }
  function moneyOutlook(){
    const c=calc(), rest=c.remaining, benefit=(S.incomes||[]).find(x=>x.benefit||x.id==="benefit");
    const visible=S.ui.moneyOutlookVisible!==false;
    const benefitInfo=benefitOverview();
    const row=(i,label,sub,val,cls="")=>`<div class="an-summary-row ${cls}"><i>${icon(i)}</i><span><strong>${label}</strong><small>${sub}</small></span>${privateOutlookMoney(val,"an-summary-value")}</div>`;
    const accounts=Array.isArray(S.accounts)?S.accounts:[];
    const cashAccounts=accounts.filter(a=>/現金|手元/.test(String(a.name||"")));
    const bankAccounts=accounts.filter(a=>!cashAccounts.includes(a));
    const cashTotal=cashAccounts.reduce((sum,a)=>sum+(+a.bal||0),0);
    const bankTotal=bankAccounts.reduce((sum,a)=>sum+(+a.bal||0),0);
    const accountRows=accounts.length?accounts.map(a=>row(/現金|手元/.test(String(a.name||""))?"coin":"bank",String(a.name||"口座"),"登録している残高",+a.bal||0,"an-account-row")).join(""):"<p class=\"an-empty\">口座・現金を登録すると、ここに内訳を表示します。</p>";
    const benefitPanel=`<section class="an-benefit-flip ${benefitFlip?"is-back":""}" data-v2-benefit-panel><div class="an-benefit-flip-inner"><div class="an-benefit-face an-benefit-front" data-v2-benefit-flip role="button" tabindex="0" aria-label="傷病手当の申請情報を表示"><div class="an-benefit-front-content"><i>${icon("money")}</i><span><strong>今日使えるお金</strong><small>タップで傷病手当の申請情報</small></span>${privateOutlookMoney(c.left,"an-summary-value")}</div><button class="an-benefit-privacy" data-v2-private="outlook">${visible ? "隠す" : "表示"}</button></div><div class="an-benefit-face an-benefit-back" data-v2-benefit-flip role="button" tabindex="0" aria-label="今日使えるお金に戻す"><div class="an-benefit-back-head"><strong>傷病手当の申請情報</strong><span>タップで戻る</span></div><dl><div><dt>次回申請開始日</dt><dd>${esc2(benefitInfo.nextApplicationStart)}から</dd></div><div><dt>今回申請している分</dt><dd>${esc2(benefitInfo.applicationSpan)}</dd></div><div><dt>受給予定期間</dt><dd>${esc2(benefitInfo.receivingPeriod)}</dd></div><div><dt>残り</dt><dd>${benefitInfo.remaining}か月</dd></div></dl></div></div></section>`;
    return analogPage("an-outlook","coin","MONEY OUTLOOK","お金の見通し",`<div class="an-outlook-privacy"><span>金額をまとめて表示</span><button data-v2-private="outlook">${visible ? "隠す" : "表示"}</button></div><section class="an-summary-sheet">${benefitPanel}${row("bank","今残っているお金（借入を含む）","予定支払い反映後",rest)}${row("coin","全財産（借入を含む）","口座・現金＋借入",c.balance+c.borrowedTotal,"an-total-funds")}${row("coin","借入合計","返済が必要な借入",c.borrowedTotal,"an-liability")}${row("coin","現金・手元合計","現金として登録した残高",cashTotal,"an-asset-group")}${row("bank","口座合計","口座として登録した残高",bankTotal,"an-asset-group")}${accountRows}${row("coin","生活を支える収入","傷病手当など",benefit ? +benefit.amt||0 : 0,"income")}${row("card","今後のカード・固定費","カード請求と未払い",c.unpaid+c.cardNow)}</section><button class="an-wide-action blue" data-v2-go="moneyAnalysis">${icon("chart")}<span>お金の分析を見る</span><b>›</b></button>`);
  }
  function moneyAnalysis(){
    const [year,month]=moneyAnalysisMonth.split("-").map(Number),monthKey=moneyAnalysisMonth;
    const rec=S.spends.filter(x=>String(x.d||"").slice(0,7)===monthKey),byPay={cash:0,paypay:0,card:0},byCat={};rec.forEach(x=>{const n=+x.amt||0;byPay[x.pay==="card"?"card":x.pay==="paypay"?"paypay":"cash"]+=n;byCat[x.cat]=(byCat[x.cat]||0)+n});const expense=rec.reduce((a,x)=>a+(+x.amt||0),0),income=(S.incomeLogs||[]).filter(x=>String(x.d||"").slice(0,7)===monthKey).reduce((a,x)=>a+(+x.amt||0),0);const max=Math.max(1,income,expense,...Object.values(byPay));const chart=(label,n,color)=>`<div class="an-bar"><span>${label}</span><i><b style="width:${Math.max(0,n/max*100)}%;background:${color}"></b></i><strong>${money(n)}</strong></div>`;const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=cats.reduce((a,[,v])=>a+v,0),cols=["#4d80ad","#4f986f","#796aa8","#ca796b"];let p=0;const stops=cats.map(([,v],i)=>{const a=p;p+=sum?v/sum*100:0;return `${cols[i]} ${a}% ${p}%`}).join(",");
    const label=`${year}年${month}月`,monthNav=`<div class="an-month-nav"><button type="button" data-v2-money-month="-1" aria-label="前月">‹</button><strong data-v2-money-month-label>${label}</strong><button type="button" data-v2-money-month="1" aria-label="次月">›</button></div>`;
    return analogPage("an-analysis","chart","MONEY ANALYSIS","月次の動き",`${monthNav}<p class="an-month-note">暦月（${monthKey}）の支出・収入</p><section class="an-chart-section v2-chart-block"><h2>収入と支出のバランス</h2>${chart("収入",income,"#4f986f")}${chart("支出",expense,"#4d80ad")}</section><section class="an-chart-section v2-chart-block"><h2>支払い方法</h2>${chart("カード",byPay.card,"#796aa8")}${chart("現金・引落",byPay.cash,"#4d80ad")}${chart("PayPay",byPay.paypay,"#d2a449")}</section><section class="an-chart-section v2-chart-block"><h2>お金を使ったカテゴリー</h2>${cats.length?`<div class="an-donut-wrap"><div class="an-donut" style="background:conic-gradient(${stops})"></div><div>${cats.map(([k,v],i)=>`<p><i style="background:${cols[i]}"></i><span>${esc2(k)}</span><b>${sum?Math.round(v/sum*100):0}%</b></p>`).join("")}</div></div>`:`<p class="an-empty">支出を記録すると、ここに割合を表示します。</p>`}</section>`);
  }
  function healthRecordLegacyAnalog(){
    const h=shownHealth(),sm=sleepMin(h.bed,h.wake),steps=h.steps!=null?`${(+h.steps).toLocaleString("ja-JP")}歩`:"—";
    const rating=(kind,label,sub)=>`<section class="an-health-rating ${kind}"><div><span>${icon(kind==="body"?"body":"heart")}</span><strong>${label}</strong><small>${sub}</small></div>${dots(kind,h[kind])}</section>`;
    return analogPage("an-health-record","heart","HEALTH LOG","今日の調子を残す",`<p class="an-date-note">${dateLabel(ymd(now()))}</p><section class="an-health-sheet">${rating("body","からだ","体の調子")}${rating("mind","こころ","心の調子")}<div class="an-health-data"><span>${icon("moon")}睡眠</span><strong>${fmtSleep(sm)}</strong><small>設定から自動取り込み</small><details><summary>睡眠時間を編集</summary><div class="an-time-fields"><input id="v2Bed" type="time" value="${esc2(h.bed||"")}" data-v2-health="bed"><input id="v2Wake" type="time" value="${esc2(h.wake||"")}" data-v2-health="wake"></div></details></div><div class="an-health-data"><span>${icon("foot")}歩数</span><strong>${steps}</strong><small>設定から自動取り込み</small></div></section><button class="an-save green" data-v2-health-save>この日の記録を保存</button><button class="an-wide-action green" data-v2-go="healthAnalysis">${icon("chart")}<span>体調の変化を見る</span><b>›</b></button>`);
  }
  function healthChangeButton(label,kind,saved){
    const isSaved=kind==="sleep"?Boolean(saved.bed&&saved.wake):saved[kind]!=null;
    return `<button class="an-health-item-save${isSaved?" is-change":""}" data-v2-health-save="${kind}">${label}${isSaved?"を変更":"を保存"}</button>`;
  }
  function healthRecord(){
    const key=healthRecordDate||ymd(now()),saved=S.health[key]||{},draft=healthDraft||{};
    const draftValue=name=>Object.prototype.hasOwnProperty.call(draft,name)?draft[name]:"";
    const savedRating=(kind,label,sub)=>`<section class="an-health-rating ${kind}"><div><span>${icon(kind==="body"?"body":"heart")}</span><strong>${label}</strong><small>${sub}</small></div>${dots(kind,draftValue(kind))}<p class="an-health-saved">保存済み: ${saved[kind]!=null?`${saved[kind]} / 5`:"—"}</p>${healthChangeButton(label,kind,saved)}</section>`;
    const savedSleep=sleepMin(saved.bed,saved.wake);
    const savedSteps=saved.steps!=null?`${(+saved.steps).toLocaleString("ja-JP")}歩`:"—";
    const timeField=(id,value,label)=>`<span class="an-native-time-control"><input id="${id}" type="time" value="${esc2(value||"")}" data-v2-health="${id==='v2Bed'?"bed":"wake"}" aria-label="${label}"><span data-v2-health-time-value="${id}" aria-hidden="true">${esc2(value||"--:--")}</span></span>`;
    const stepNote=saved.stepsSource==="sync"?`自動保存済み${saved.stepsSavedAt?`（${new Date(saved.stepsSavedAt).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}）`:""}`:"保存済みの歩数";
    return analogPage("an-health-record","heart","HEALTH LOG","今日の調子を残す",`<label class="an-health-date"><span>記録日</span><span class="an-health-date-control"><input id="v2HealthDate" aria-label="記録日" type="date" value="${esc2(key)}"><span class="an-health-date-value" aria-hidden="true">${esc2(dateLabel(key))}</span></span></label><p class="an-date-note">${dateLabel(key)}</p><section class="an-health-sheet">${savedRating("body","からだ","体の調子")}${savedRating("mind","こころ","心の調子")}<section class="an-health-data"><span>${icon("moon")}睡眠</span><strong>${fmtSleep(savedSleep)}</strong><small>保存済みの睡眠時間</small><div class="an-time-fields">${timeField("v2Bed",draftValue("bed"),"就寝時刻")}${timeField("v2Wake",draftValue("wake"),"起床時刻")}</div>${healthChangeButton("睡眠","sleep",saved)}</section><section class="an-health-data"><span>${icon("foot")}歩数</span><strong>${savedSteps}</strong><small>${stepNote}</small><input id="v2Steps" type="number" inputmode="numeric" min="0" value="${esc2(draftValue("steps"))}" placeholder="歩数を入力" data-v2-health="steps">${healthChangeButton("歩数","steps",saved)}</section></section><button class="an-wide-action green" data-v2-go="healthAnalysis">${icon("chart")}<span>体調の変化を見る</span><b>›</b></button>`);
  }
  function healthAnalysis(){
    const labels=[["sleep","睡眠","#4d80ad","bar"],["steps","歩数","#4f986f","bar"],["body","からだ","#796aa8","circle"],["mind","こころ","#ca796b","square"]];
    return analogPage("an-health-analysis","body","HEALTH ANALYSIS","体調の分析",`<section class="an-chart-section"><h2>睡眠・歩数・からだ・こころ</h2><div class="an-metric-toggle">${labels.map(([id,l,c,shape])=>`<button class="${metricOn[id]?"":"off"}" data-v2-metric="${id}"><i class="an-health-marker marker-${shape}" style="--marker-color:${c}"></i>${l}</button>`).join("")}</div>${healthChart()}</section><section class="an-chart-section"><h2>振り返り</h2><div class="an-insight"><span>${icon("moon")}睡眠が短い日</span><b>${healthDays().filter(d=>(sleepMin((S.health[d]||{}).bed,(S.health[d]||{}).wake)||0)<360).length}日</b></div><div class="an-insight"><span>${icon("foot")}よく歩いた日</span><b>${healthDays().filter(d=>+(S.health[d]||{}).steps>=8000).length}日</b></div></section>`);
  }
  function flow(){
    const key=flowDate,rec=S.daily[key]||{},blocks=allBlocks(key),start=typeof TL_START==="number"?TL_START:4*60,end=typeof TL_END==="number"?TL_END:27*60,h=Math.round(((end-start)/60)*FLOW_HOUR_PX),slots=[];for(let m=start;m<=end;m+=60)slots.push(`<span class="v2-time" style="top:${(m-start)/(end-start)*h}px">${toHHMM(m%1440)}</span>`);const events=blocks.map(b=>{const a=Math.max(start,b.a),z=Math.min(end,b.b);return z<=a?"":`<div class="v2-event" style="--event:${esc2(b.color||catOf(b.cat).color)};top:${(a-start)/(end-start)*h}px;height:${Math.max(42,(z-a)/(end-start)*h-3)}px"><strong>${esc2(b.text)}</strong><span>${toHHMM(a%1440)} - ${toHHMM(z%1440)}</span></div>`}).join("");const n=now(),nowM=n.getHours()*60+n.getMinutes(),isToday=key===ymd(n),nowline=isToday&&nowM>=start&&nowM<=end?`<div class="v2-now" style="top:${(nowM-start)/(end-start)*h}px"><b>いま ${toHHMM(nowM)}</b></div>`:"";
    return analogPage("an-flow","calendar","DAILY FLOW","一日の流れ",`<section class="an-theme-strip"><small>${dateLabel(key)}</small><strong>${esc2(rec.theme||"今日のテーマを設定")}</strong></section><section class="an-timeline-section"><h2>${icon("clock")}時間割</h2><div class="v2-timeline" style="min-height:${h}px">${slots.join("")}${events}${nowline}</div></section><div class="an-flow-actions"><button data-v2-plan-open>${icon("plus")}予定を足す</button><button data-v2-go="calendar">${icon("calendar")}週／月を見る</button></div><div id="v2PlanArea"></div>`);
  }
  function checklistV2(){
    const key=flowDate,rec=S.daily[key]||{habits:{},},all=plannedOn(key).slice().sort((a,b)=>PRIOS.findIndex(p=>p.id===autoPriority(a).id)-PRIOS.findIndex(p=>p.id===autoPriority(b).id));
    const tasks=all.filter(t=>t.kind!=="shopping"), shopping=all.filter(t=>t.kind==="shopping");
    const habits=habitList().map(h=>`<button class="an-habit ${rec.habits&&rec.habits[h.id]?"on":""}" data-v2-habit="${esc2(h.id)}">${habitIcon(h)}<span>${esc2(h.label)}</span></button>`).join("");
    const row=t=>`<button class="an-task ${t.done?"done":""}" data-v2-task="${esc2(t.id)}"><i>✓</i><span>${esc2(t.text)}</span>${t.kind==="shopping"?"":`<b>${esc2(autoPriority(t).label)}</b>`}</button>`;
    const list=tasks.length?tasks.map(row).join(""):`<p class="an-empty">予定を足すと、ここに表示します。</p>`;
    const shop=shopping.length?shopping.map(row).join(""):`<p class="an-empty">買うものを追加すると、ここに並びます。</p>`;
    return analogPage("an-checklist","list","CHECKLIST","今日のやること",`<p class="an-date-note">${dateLabel(key)}</p><section class="an-chart-section"><h2>毎日の習慣</h2><div class="an-habits">${habits}</div></section><section class="an-chart-section"><h2>やること</h2><div class="an-tasks">${list}</div></section><section class="an-chart-section an-shopping-section"><h2>買い物リスト</h2><div class="an-tasks">${shop}</div><div class="an-shopping-add"><input id="v2ShoppingText" maxlength="80" placeholder="買うものを追加"><button type="button" data-v2-shopping-add>${icon("plus")}追加</button></div></section>`);
  }
  function theme(){const key=ymd(now()),value=(S.daily[key]||{}).theme||"";return analogPage("an-theme","sun","TODAY'S THEME","今日のテーマ",`<div class="an-theme-editor"><label for="v2Theme">ひとことで書く</label><input id="v2Theme" value="${esc2(value)}" maxlength="40" placeholder="今日のテーマ"></div><button class="an-save yellow" data-v2-theme-save>テーマを保存</button>`);}
  function legacyIdeaNote(){
    const board=Object.assign({monthlyGoal:"",ideas:[],images:[]},S.ideaBoard||{}),ideas=Array.isArray(board.ideas)?board.ideas:[],images=Array.isArray(board.images)?board.images:[];
    const notes=ideas.slice().reverse().map(x=>`<article class="an-board-note"><small>${esc2(x.date||"")}</small><p>${esc2(x.text||"")}</p></article>`).join("");
    const photos=images.slice().reverse().map(x=>`<figure class="an-board-image"><img src="${esc2(x.src||"")}" alt="追加したアイデア画像"><button type="button" data-v2-board-image-delete="${esc2(x.id)}" aria-label="画像を削除">${icon("close")}</button><figcaption>${esc2(x.name||"画像")}</figcaption></figure>`).join("");
    return analogPage("an-idea-note","edit","IDEA NOTE","アイデアと目標",`<section class="an-board-goal"><div><span>今月の目標</span><textarea id="v2MonthlyGoal" maxlength="240" placeholder="今月かなえたいことを書く">${esc2(board.monthlyGoal||"")}</textarea></div><button class="an-small-action" data-v2-month-goal-save>目標を保存</button></section><section class="an-board-composer"><label for="v2IdeaText">シートにメモを置く</label><textarea id="v2IdeaText" maxlength="500" placeholder="プラグイン、映像、暮らしのアイデアなど"></textarea><div><label class="an-board-upload">${icon("upload")}画像を追加<input id="v2IdeaImage" type="file" accept="image/*" multiple></label><button class="an-small-action" data-v2-idea-add>${icon("plus")}メモを追加</button></div><small>画像とメモはこの端末に保存されます。</small></section><section class="an-free-board" aria-label="アイデアボード">${photos}${notes||(!photos?`<p class="an-empty">画像やメモを置くと、ここに並びます。</p>`:"")}</section>`);
  }
  function boardState(){
    S.ideaBoard=Object.assign({monthlyGoal:"",ideas:[],images:[],cards:[]},S.ideaBoard||{});
    if(!Array.isArray(S.ideaBoard.cards)||!S.ideaBoard.cards.length){
      const cards=[];
      if(S.ideaBoard.monthlyGoal) cards.push({id:"goal",type:"goal",text:S.ideaBoard.monthlyGoal,x:7,y:6,w:86,h:18});
      (S.ideaBoard.ideas||[]).forEach((note,index)=>cards.push({id:note.id||uid(),type:"note",text:note.text||"",x:8+(index%2)*44,y:29+Math.floor(index/2)*24,w:39,h:20}));
      (S.ideaBoard.images||[]).forEach((image,index)=>cards.push({id:image.id||uid(),type:"image",src:image.src||"",name:image.name||"画像",x:8+(index%2)*44,y:29+Math.floor(index/2)*28,w:39,h:24}));
      S.ideaBoard.cards=cards;
    }
    S.ideaBoard.cards.forEach(card=>{
      /* Legacy cards are kept as free-board elements; no user content is discarded. */
      if(card.type==="note") card.type="text";
      if(card.type==="goal") { card.type="memo"; card.variant="goal"; }
      if(!["text","memo","shape","image","stroke"].includes(card.type)) card.type="text";
      card.x=Math.max(2,Math.min(92,Number(card.x)||8));
      card.y=Math.max(2,Math.min(92,Number(card.y)||8));
      card.w=Math.max(12,Math.min(88,Number(card.w)|| (card.type==="image"?42:38)));
      card.h=Math.max(8,Math.min(55,Number(card.h)|| (card.type==="image"?30:16)));
      if(card.type!=="image"){
        card.size=Math.max(14,Math.min(34,Number(card.size)|| (card.type==="goal"?22:19)));
        card.weight=[400,500,600,700,800].includes(+card.weight)?+card.weight:(card.type==="goal"?800:600);
        card.face=["sans","mincho","udgothic","udmincho","mono"].includes(card.face)?card.face:(card.variant==="goal"?"mincho":"sans");
      }
    });
    return S.ideaBoard;
  }
  function boardStyle(card){
    const x=Math.max(1,Math.min(94,Number(card.x)||8)),y=Math.max(1,Math.min(88,Number(card.y)||8)),w=Math.max(24,Math.min(88,Number(card.w)||39)),h=Math.max(12,Math.min(45,Number(card.h)||20));
    return `--board-x:${x};--board-y:${y};--board-w:${w};--board-h:${h};`;
  }
  let boardSelectedId=null;
  function boardTextStyle(card){
    const size=Math.max(14,Math.min(34,Number(card.size)||19));
    const weight=[400,500,600,700,800].includes(+card.weight)?+card.weight:600;
    const face=["sans","mincho","udgothic","udmincho","mono"].includes(card.face)?card.face:"sans";
    return `--board-text-size:${size}px;--board-text-weight:${weight};--board-text-face:${face};`;
  }
  function boardFace(card){return ["sans","mincho","udgothic","udmincho","mono"].includes(card?.face)?card.face:"sans";}
  function selectBoardItem(id){
    const card=boardCardById(id);
    if(!card) return;
    boardSelectedId=id;
    root.querySelectorAll("[data-v2-board-card]").forEach(node=>node.classList.toggle("is-selected",node.dataset.v2BoardCard===id));
    const inspector=root.querySelector(".an-board-inspector");
    if(!inspector) return;
    inspector.querySelector("span").textContent=card.type==="image"?"画像を選択中です。移動または削除できます。":"選択中のテキストを整える";
    const face=inspector.querySelector("[data-v2-board-face]"),weight=inspector.querySelector("[data-v2-board-weight]"),size=inspector.querySelector("[data-v2-board-size]");
    [face,weight,size].forEach(control=>{if(control) control.disabled=card.type==="image";});
    if(face) face.value=boardFace(card);
    if(weight) weight.value=String(card.weight||600);
    if(size) size.value=String(card.size||19);
  }
  let boardTool="select";
  let boardFullscreen=false;
  const boardTools=[
    ["select","edit","選択"], ["text","text","テキスト"], ["shape","shape","図形"],
    ["memo","memo","メモ"], ["pen","pen","手書き"], ["image","image","画像"]
  ];
  function boardToolbar(){
    return `<nav class="an-board-tools" aria-label="ボードのツール">${boardTools.map(([id,mark,label])=>id==="image"
      ? `<label class="${boardTool===id?"is-active":""}" title="${label}">${icon(mark)}<span>${label}</span><input id="v2BoardToolImageUpload" type="file" accept="image/*" multiple></label>`
      : `<button type="button" class="${boardTool===id?"is-active":""}" data-v2-board-tool="${id}" aria-pressed="${boardTool===id}">${icon(mark)}<span>${label}</span></button>`).join("")}</nav>`;
  }
  function boardNode(card,{preview=false}={}){
    const selected=!preview&&boardSelectedId===card.id?" is-selected":"";
    const common=`class="an-board-node an-board-node-${esc2(card.type)} an-board-face-${boardFace(card)}${card.variant?` an-board-variant-${esc2(card.variant)}`:""}${selected}" data-v2-board-node="${esc2(card.id)}" style="${boardStyle(card)} ${boardTextStyle(card)}"`;
    if(card.type==="stroke"){
      const points=(card.points||[]).map(p=>`${Number(p[0]).toFixed(2)},${Number(p[1]).toFixed(2)}`).join(" ");
      return `<svg ${common} viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="手書き線"><polyline points="${points}"/></svg>`;
    }
    if(card.type==="shape") return `<div ${common} aria-label="図形"></div>`;
    if(card.type==="image") return `<figure ${common}><img src="${esc2(card.src||"")}" alt="${esc2(card.name||"追加した画像")}"></figure>`;
    return `<article ${common}><textarea data-v2-board-text="${esc2(card.id)}" ${preview?"readonly tabindex=-1":""} maxlength="500" aria-label="${card.type==="memo"?"メモ":"テキスト"}" placeholder="テキストを入力">${esc2(card.text||"")}</textarea></article>`;
  }
  function boardProperties(selected){
    if(!selected || ["image","shape","stroke"].includes(selected.type)) return `<p class="an-board-property-empty">要素を選ぶと、文字の書体・太さ・大きさを整えられます。</p>`;
    const size=Math.max(14,Math.min(34,Number(selected.size)||19)),weight=selected.weight||600,face=boardFace(selected);
    return `<div class="an-board-properties"><label>書体<select data-v2-board-face><option value="sans" ${face==="sans"?"selected":""}>Noto Sans JP</option><option value="mincho" ${face==="mincho"?"selected":""}>Noto Serif JP</option><option value="udgothic" ${face==="udgothic"?"selected":""}>BIZ UDPゴシック</option><option value="udmincho" ${face==="udmincho"?"selected":""}>BIZ UDP明朝</option></select></label><label>太さ<select data-v2-board-weight><option value="400" ${+weight===400?"selected":""}>細い</option><option value="600" ${+weight===600?"selected":""}>標準</option><option value="800" ${+weight===800?"selected":""}>太い</option></select></label><label>文字サイズ<input data-v2-board-size type="range" min="14" max="34" value="${size}"></label><button type="button" class="an-board-delete" data-v2-board-delete="${esc2(selected.id)}">${icon("close")}削除</button></div>`;
  }
  function ideaNote(){
    const board=boardState(),cards=board.cards||[],selected=cards.find(card=>card.id===boardSelectedId);
    const nodes=cards.map(card=>boardNode(card)).join("");
    if(boardFullscreen) return analogPage("an-idea-note an-idea-workspace","edit","IDEA BOARD","アイデアと目標",`<section class="an-board-workspace" aria-label="フリーボード編集"><header><button type="button" data-v2-board-close>${icon("back")}戻る</button><strong>フリーボード</strong><button type="button" data-v2-board-delete="${esc2(selected?.id||"")}" ${selected?"":"disabled"}>${icon("close")}削除</button></header>${boardToolbar()}<section class="an-free-board an-free-board-canvas an-board-editor" data-v2-board-canvas aria-label="フリーボード。選択ツールでは要素を動かし、手書きツールではドラッグで線を描けます。">${nodes||`<p class="an-empty">ツールを選んで、ここから自由に置いてください。</p>`}</section>${boardProperties(selected)}</section>`,{settings:false});
    return analogPage("an-idea-note","edit","IDEA BOARD","アイデアと目標",`<p class="an-board-guide">文字・図形・メモ・手書き・画像を、好きな位置に置ける自由なボードです。</p>${boardToolbar()}<section class="an-board-inline"><header><strong>フリーボード</strong><button type="button" data-v2-board-open>${icon("edit")}全画面表示</button></header><section class="an-free-board an-board-editor an-board-editor-inline" data-v2-board-canvas aria-label="アイデアと目標のフリーボード">${nodes||`<span class="an-empty">ツールを選んで、最初のアイデアを置きましょう。</span>`}</section>${boardProperties(selected)}</section>`);
  }
  function calendar(){const base=new Date(calendarDate+"T00:00:00"),mon=new Date(base);mon.setDate(base.getDate()-((base.getDay()+6)%7));let content="";if(calendarMode==="week"){content=`<div class="v2-week">${Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const key=ymd(d),bs=allBlocks(key);return `<button class="v2-week-day ${key===ymd(now())?"today":""}" data-v2-cal-date="${key}"><span>${"月火水木金土日"[i]}</span><b>${d.getDate()}</b>${bs.slice(0,3).map(b=>`<i class="v2-cal-dot" style="background:${esc2(b.color||catOf(b.cat).color)}"></i>`).join("")}</button>`}).join("")}</div>`;}else{const y=base.getFullYear(),m=base.getMonth(),days=new Date(y,m+1,0).getDate(),off=(new Date(y,m,1).getDay()+6)%7;content=`<div class="v2-month">${Array.from({length:off},()=>"<span></span>").join("")}${Array.from({length:days},(_,i)=>{const d=i+1,key=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,has=allBlocks(key).length;return `<button class="${key===ymd(now())?"today ":""}${has?"has":""}" data-v2-cal-date="${key}">${d}</button>`}).join("")}</div>`;}const period=calendarMode==="week"?`${mon.getMonth()+1}月${mon.getDate()}日からの1週間`:`${base.getFullYear()}年${base.getMonth()+1}月`;return analogPage("an-calendar","calendar","CALENDAR",period,`<div class="an-calendar-switch"><button class="${calendarMode==="week"?"on":""}" data-v2-cal-mode="week">1週間</button><button class="${calendarMode==="month"?"on":""}" data-v2-cal-mode="month">1か月</button></div>${content}<p class="an-empty">日付をタップすると、その日の時間割を開きます。</p>`);}
  function settingsV2(){const cfg=syncCfg(),benefit=Object.assign({start:"2026-01",units:18,nextApplicationStart:"2026-08-01",applicationMonths:"",applicationDays:""},S.benefit||{});return analogPage("an-settings","settings","SETTINGS","くらしの設定",`<div class="an-settings v2-settings">${[["refresh","同期・歩数／睡眠",cfg.token&&cfg.gistId?"同期済み・アプリを開くと更新します":"未接続",`<p>歩数と睡眠は、設定済みのiPhoneショートカット／同期から読み込みます。</p><label>GitHubトークン</label><input id="v2SyncToken" type="password" autocomplete="off" placeholder="初回設定時のみ入力"><label>Gist ID</label><input id="v2SyncGist" value="${esc2(cfg.gistId||"")}" placeholder="2台目のみ入力"><button class="an-small-action" data-v2-sync-start>同期を設定・開始</button><button class="an-small-action" data-v2-sync>今すぐ同期する</button><button class="an-small-action" data-v2-role>${cfg.role==="ro"?"記録する端末にする":"見るだけの端末にする"}</button>`],["list","毎日の習慣","今日の流れに表示する項目",`<div class="an-habits">${habitList().map(h=>`<span class="an-habit">${habitIcon(h)}<span>${esc2(h.label)}</span></span>`).join("")}</div><label>習慣の名前</label><input id="v2HabitLabel" placeholder="例：ストレッチ"><button class="an-small-action" data-v2-habit-add>習慣を追加</button>`],["wallet","お金の初期設定","カード上限・方法・カテゴリー",`<label>カードの上限</label><input id="v2CardCap" type="text" inputmode="numeric" value="${(+S.cardCap||0).toLocaleString("ja-JP")}"><button class="an-small-action" data-v2-card-cap>上限を保存</button><label>支出の方法</label><input id="v2MethodAdd" placeholder="例：交通系IC"><button class="an-small-action" data-v2-method-add>方法を追加</button><label>支出のカテゴリー</label><input id="v2CategoryAdd" placeholder="例：医療費"><button class="an-small-action" data-v2-category-add>カテゴリーを追加</button><label>収入の受け取り方法</label><input id="v2IncomeMethodAdd" placeholder="例：PayPay"><button class="an-small-action" data-v2-income-method-add>方法を追加</button><label>収入のカテゴリー</label><input id="v2IncomeCategoryAdd" placeholder="例：傷病手当"><button class="an-small-action" data-v2-income-category-add>カテゴリーを追加</button>`],["benefit","傷病手当の申請情報","次回申請・今回の申請分・受給期間",`<label>次回申請開始日</label><input id="v2BenefitNextStart" type="date" value="${esc2(benefit.nextApplicationStart||"")}"><label>今回申請している分（月）</label><input id="v2BenefitMonths" type="number" min="0" inputmode="numeric" value="${esc2(benefit.applicationMonths??"")}"><label>今回申請している分（日）</label><input id="v2BenefitDays" type="number" min="0" inputmode="numeric" value="${esc2(benefit.applicationDays??"")}"><p class="an-settings-help">受給期間は既存の「${esc2(benefit.start)}から${esc2(benefit.units)}か月」の設定を使います。</p><button class="an-small-action" data-v2-benefit-save>傷病手当の申請情報を保存</button>`],["calendar","カレンダー連携","予定の取り込みと表示",`<p>予定は「一日の流れ」から確認・追加できます。</p>`],["download","バックアップ","この端末のデータを保存",`<p>端末の記録を書き出して保管できます。</p><button class="an-small-action" data-v2-export>データを書き出す</button>`]].map(([i,t,s,b])=>`<details><summary><i>${icon(i)}</i><span><strong>${t}</strong><small>${s}</small></span><b>›</b></summary><div class="an-settings-body">${b}</div></details>`).join("")}</div>`,{settings:false});}
  function homeReturn(){ return analogReturn(); }
  // 画面描画の唯一の入口。通常の再描画は表示位置を保持し、画面遷移だけが明示的に先頭へ戻す。
  // 保存・選択・削除・ドラッグの各操作は、この入口を経由しても同じ復元契約を使う。
  function renderV2(options={}){
    const position=options.preserveScroll===false?null:currentViewport();
    const view={home:homeV2,record:()=>branch("record"),today:()=>branch("today"),visualize:()=>branch("visualize"),moneyRecord,moneyOutlook,moneyAnalysis,healthRecord,healthAnalysis,flow,workBoard,checklist:checklistV2,theme,ideas:ideaNote,workLog,calendar:calendarV2,settings:settingsV2}[page]||homeV2;
    document.querySelectorAll("[data-v2-event-sheet-layer]").forEach(layer=>layer.remove());
    root.innerHTML=view();
    root.querySelectorAll("[data-v2-work-item-for-project]").forEach(select=>{
      const row=select.closest("[data-v2-work-project-row]"),projectId=row?.dataset.v2WorkProject;
      if(!row||!projectId)return;
      row.dataset.v2WorkItem=select.value||"";
      const date=document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()),draft=workLogDraftFor(date),saved=(S.workLogs&&S.workLogs[date])||{},savedDescriptions=saved.workDescriptions&&typeof saved.workDescriptions==="object"?saved.workDescriptions:{},draftDescriptions=draft?.workDescriptions&&typeof draft.workDescriptions==="object"?draft.workDescriptions:{};
      const input=document.createElement("textarea");
      input.rows=2;input.dataset.v2WorkDescription=projectId;input.placeholder="今日やった仕事内容を自由に記述";
      select.replaceWith(input);
    });
    const eventLayer=root.querySelector("[data-v2-event-sheet-layer]");
    if(eventLayer) document.body.appendChild(eventLayer);
    document.body.dataset.v2Scroll=["home","record","today","visualize"].includes(page)?"locked":"auto";
    if(page === "settings"){
      root.querySelector('[data-v2-sync-status="refresh"]')?.replaceChildren(deviceSyncStatus(syncCfg()));
      root.querySelector('[data-v2-sync-status="health"]')?.replaceChildren(healthSyncStatus(healthSyncCfg()));
    }
    if(page === "healthRecord"){
      const sleepCard=root.querySelector(".v2-health-paper-item:nth-child(3)"), sleepEdit=root.querySelector(".v2-sleep-edit");
      if(sleepCard && sleepEdit) sleepCard.appendChild(sleepEdit);
    }
    restoreViewport(position);
  }
  window.newAppRender = renderV2;
  // 画面遷移を待たず、ホームの時計と時間割の現在線を毎秒更新する。
  function paintLiveClock(){
    const d=now(), raw=d.getHours()*60+d.getMinutes(), text=toHHMM(raw);
    root.querySelectorAll("[data-v2-live-time]").forEach(node=>{node.textContent=text;});
    root.querySelectorAll("[data-v2-live-date]").forEach(node=>{node.textContent=dateLabel(ymd(d));});
    const line=root.querySelector("[data-v2-now-line]");
    if(!line) return;
    const start=Number(line.dataset.v2Start), end=Number(line.dataset.v2End);
    const minute=raw<start?raw+1440:raw;
    if(flowDate!==ymd(d)||minute<start||minute>end){ line.remove(); return; }
    line.style.top=`${(minute-start)/(end-start)*Math.round(((end-start)/60)*FLOW_HOUR_PX)}px`;
    const label=line.querySelector("[data-v2-now-label]");
    if(label) label.textContent=`いま ${text}`;
  }
  window.setInterval(paintLiveClock,1000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden) paintLiveClock();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&document.getElementById("v2WorkDate"))persistWorkLogDraft(document.getElementById("v2WorkDate").value||workLogDate);});
  window.addEventListener("pagehide",()=>{if(document.getElementById("v2WorkDate"))persistWorkLogDraft(document.getElementById("v2WorkDate").value||workLogDate);});
  root.addEventListener("click",e=>{
    const button=e.target.closest("[data-v2-money-save]");
    if(!button||moneyType!=="borrowing")return;
    e.stopImmediatePropagation();
    addBorrowingLog(document.getElementById("v2Amount")?.value,document.getElementById("v2Borrower")?.value);
  },true);
  root.addEventListener("click",e=>{
    const flip=e.target.closest("[data-v2-benefit-flip]");
    if(flip&&!e.target.closest("[data-v2-private]")){
      e.stopImmediatePropagation();
      benefitFlip=!benefitFlip;
      root.querySelector("[data-v2-benefit-panel]")?.classList.toggle("is-back",benefitFlip);
      return;
    }
    const benefitSave=e.target.closest("[data-v2-benefit-save]");
    if(benefitSave){
      e.stopImmediatePropagation();
      if(!canWrite())return;
      const current=Object.assign({},S.benefit||{});
      S.benefit=Object.assign(current,{nextApplicationStart:document.getElementById("v2BenefitNextStart")?.value||"",applicationMonths:document.getElementById("v2BenefitMonths")?.value||"",applicationDays:document.getElementById("v2BenefitDays")?.value||""});
      save();newAppRender();successToast("傷病手当の申請情報を保存しました");
      return;
    }
    const dailyEnd=e.target.closest("[data-v2-daily-end]");
    if(dailyEnd){
      e.stopImmediatePropagation();
      if(!canWrite())return;
      const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
      const endDate=ymd(tomorrow);
      if(!window.confirm(`明日（${dateLabel(endDate)}）まで残し、明後日以降の毎日の予定を終了します。よろしいですか？`))return;
      S.dailyTimelineEndDate=endDate;save();newAppRender();successToast("明後日以降の毎日の予定を終了しました");
      return;
    }
    const futureWorkClear=e.target.closest("[data-v2-work-future-clear]");
    if(futureWorkClear){
      e.stopImmediatePropagation();
      if(!canWrite())return;
      const today=ymd(now()),tomorrow=new Date();
      tomorrow.setDate(tomorrow.getDate()+1);
      const startDate=ymd(tomorrow),count=futureWorkScheduleCount(today);
      if(!count){toast("削除対象の仕事予定はありません");return;}
      if(!window.confirm(`明日（${dateLabel(startDate)}）以降の仕事予定を${count}件削除します。過去の予定・仕事記録・生活／共通予定は残ります。よろしいですか？`))return;
      captureFlowUndo();
      const removed=deleteFutureWorkSchedules(today);
      selectedFlowEvent=null;
      save();newAppRender();successToast(`明日以降の仕事予定を${removed}件削除しました`);
      return;
    }
  },true);
  root.addEventListener("click",e=>{const t=e.target.closest("[data-v2-go],[data-v2-back],[data-v2-moneytype],[data-v2-money-save],[data-v2-private],[data-v2-rate],[data-v2-health-save],[data-v2-metric],[data-v2-plan-open],[data-v2-habit],[data-v2-task],[data-v2-theme-save],[data-v2-cal-mode],[data-v2-cal-date],[data-v2-sync],[data-v2-role],[data-v2-habit-add],[data-v2-card-cap],[data-v2-export]");if(!t)return;if(t.hasAttribute("data-v2-back")){back();return;}if(t.dataset.v2Go){go(t.dataset.v2Go);return;}if(t.dataset.v2Moneytype){moneyType=t.dataset.v2Moneytype;newAppRender();return;}if(t.hasAttribute("data-v2-private")){S.ui.moneyVisible=!S.ui.moneyVisible;save();newAppRender();return;}if(t.hasAttribute("data-v2-money-save")){const amt=document.getElementById("v2Amount").value,method=document.getElementById("v2Method"),cat=document.getElementById("v2Category").value;if(moneyType==="income")addIncomeLog(amt,cat,method.value,method.selectedOptions[0]?.textContent);else addSpend(amt,cat,method.value,method.selectedOptions[0]?.textContent);return;}if(t.dataset.v2Rate){healthDraft=Object.assign({},healthDraft||{}, {[t.dataset.v2Rate]:+t.dataset.v2Value});newAppRender();return;}if(t.hasAttribute("data-v2-health-save")){if(!canWrite())return;const key=ymd(now());S.health[key]=Object.assign({},S.health[key]||{},healthDraft||{});healthDraft=null;save();render();toast("この日の記録を保存しました");return;}if(t.dataset.v2Metric){metricOn[t.dataset.v2Metric]=!metricOn[t.dataset.v2Metric];newAppRender();return;}if(t.hasAttribute("data-v2-plan-open")){const box=document.getElementById("v2PlanArea");box.innerHTML=`<div class="v2-form-row"><label>予定</label><input id="v2PlanText" placeholder="予定の名前"></div><div class="v2-form-row"><label>開始時刻</label><input id="v2PlanFrom" type="time"></div><div class="v2-form-row"><label>終了時刻</label><input id="v2PlanTo" type="time"></div><button class="v2-primary" data-v2-plan-save>${icon("plus")}予定を保存</button>`;return;}if(t.hasAttribute("data-v2-plan-save")){if(!canWrite())return;const text=document.getElementById("v2PlanText").value.trim(),from=document.getElementById("v2PlanFrom").value,to=document.getElementById("v2PlanTo").value;if(!text||!from||!to)return toast("予定・開始時刻・終了時刻を入れてください");const key=ymd(now());(S.plan[key]||(S.plan[key]=[])).push({id:uid(),text,from,to,cat:"custom"});save();render();return;}if(t.dataset.v2Habit){if(!canWrite())return;const d=dayRec(ymd(now()));d.habits[t.dataset.v2Habit]=!d.habits[t.dataset.v2Habit];save();render();return;}if(t.dataset.v2Task){if(!canWrite())return;const task=S.errands.find(x=>x.id===t.dataset.v2Task);if(task){task.done=!task.done;task.doneAt=task.done?ymd(now()):null;save();render();}return;}if(t.hasAttribute("data-v2-theme-save")){if(!canWrite())return;dayRec(ymd(now())).theme=document.getElementById("v2Theme").value.trim();save();render();toast("テーマを保存しました");return;}if(t.dataset.v2CalMode){calendarMode=t.dataset.v2CalMode;newAppRender();return;}if(t.dataset.v2CalDate){calendarDate=t.dataset.v2CalDate;go("flow");return;}if(t.hasAttribute("data-v2-sync")){pullRemote(false);return;}if(t.hasAttribute("data-v2-role")){const c=syncCfg();c.role=c.role==="ro"?"rw":"ro";setSyncCfg(c);rolePaint();newAppRender();return;}if(t.hasAttribute("data-v2-habit-add")){if(!canWrite())return;const label=document.getElementById("v2HabitLabel").value.trim();if(!label)return toast("項目名を入れてください");S.habits=habitList().slice();S.habits.push({id:uid(),icon:"・",label});save();render();return;}if(t.hasAttribute("data-v2-card-cap")){if(!canWrite())return;S.cardCap=Math.max(0,moneyAmount(document.getElementById("v2CardCap").value));save();render();toast("カードの上限を保存しました");return;}if(t.hasAttribute("data-v2-export")){document.getElementById("expBtn")?.click();return;}});
  // 表示／非表示は金額領域ごとに独立。capture で旧一括ハンドラより先に処理する。
  root.addEventListener("click", event => {
    const toggle=event.target.closest("[data-v2-private]");
    if(!toggle) return;
    event.stopImmediatePropagation();
    const privacyKey=toggle.dataset.v2Private==="outlook"?"moneyOutlookVisible":"moneyVisible";
    S.ui[privacyKey]=!(S.ui[privacyKey]!==false);
    save(); newAppRender();
  },true);
  root.addEventListener("click", event => {
    const monthButton=event.target.closest("[data-v2-money-month]");
    if(!monthButton) return;
    event.stopImmediatePropagation();
    const [year,month]=moneyAnalysisMonth.split("-").map(Number);
    const shifted=new Date(year,month-1+(+monthButton.dataset.v2MoneyMonth||0),1);
    moneyAnalysisMonth=`${shifted.getFullYear()}-${String(shifted.getMonth()+1).padStart(2,"0")}`;
    newAppRender();
  },true);
  /* Imported blocks remain as their source data.  A date-specific override is
     saved for any edit, drag, or delete so every visible event is editable. */
  function flowOverrideMap(key){
    S.flowOverrides=S.flowOverrides||{};
    S.flowOverrides[key]=S.flowOverrides[key]||{};
    return S.flowOverrides[key];
  }
  function flowEventStore(event){
    if(event.origin==="plan"||event.origin==="daily"){
      const list=event.origin==="daily"?(Array.isArray(S.dailyTimeline)?S.dailyTimeline:[]):(S.plan[event.key]||[]);
      return {list,item:list.find(x=>x.id===event.id),override:false};
    }
    const map=flowOverrideMap(event.key),source=event.sourceKey;
    let item=map[source];
    if(!item || item.deleted){
      item={id:`override_${uid()}`,text:event.text,a:event.a,b:event.b,from:toHHMM(event.a%1440),to:toHHMM(event.b%1440),cat:event.cat||"custom",lane:event.lane||"life",color:event.color||"",workItemId:event.workItemId||"",priorityGroup:event.priorityGroup||"next",priority:event.priority||"b",status:event.status||"todo"};
      map[source]=item;
    }
    return {map,item,override:true,source};
  }
  function deleteFlowEvent(event){
    if(event.origin==="plan"){
      const list=S.plan[event.key]||[],index=list.findIndex(x=>x.id===event.id);
      if(index>=0) list.splice(index,1);
      return;
    }
    if(event.origin==="daily"){
      const list=Array.isArray(S.dailyTimeline)?S.dailyTimeline:[],index=list.findIndex(x=>x.id===event.id);
      if(index>=0) list.splice(index,1);
      return;
    }
    const map=flowOverrideMap(event.key);
    map[event.sourceKey]=Object.assign({},map[event.sourceKey]||{}, {deleted:true});
  }
  function flowWorkMeta(block){
    const item=workItemOf(block?.workItemId);
    return {item,priority:workPriorityId(item||block),status:item?.status||block?.status||"todo"};
  }
  function timelineGroupLayout(blocks){
    const out=[];
    for(let i=0;i<blocks.length;){
      let end=blocks[i].b,j=i;
      while(j+1<blocks.length&&blocks[j+1].a<end){j++;end=Math.max(end,blocks[j].b);}
      const active=[],group=[];
      for(let k=i;k<=j;k++){
        const block=blocks[k];
        for(let c=0;c<active.length;c++)if(active[c]<=block.a)active[c]=0;
        let col=active.findIndex(x=>x===0);if(col<0){col=active.length;active.push(0);}
        active[col]=block.b;group.push({block,col});
      }
      const cols=Math.max(1,Math.min(3,active.length));
      group.forEach(({block,col})=>out.push(Object.assign({},block,{_v2Col:col%cols,_v2Cols:cols})));
      i=j+1;
    }
    return out;
  }
  function timelineLayout(blocks,mode="single"){
    if(mode!=="common") return timelineGroupLayout(blocks);
    const placed=new Map();
    ["work","life","common"].forEach(lane=>{
      const indexed=blocks.map((block,index)=>({block,index})).filter(({block})=>flowLane(block)===lane);
      timelineGroupLayout(indexed.map(item=>item.block)).forEach((block,index)=>{
        placed.set(indexed[index].index,Object.assign({},block,{_v2Lane:lane}));
      });
    });
    return blocks.map((block,index)=>Object.assign({},placed.get(index)||block,{_v2Lane:flowLane(block)}));
  }
  function chooseHealthChartPoint(target){
    const index=Number(target?.dataset?.v2HealthPoint), metric=target?.dataset?.v2HealthMetric;
    if(!Number.isInteger(index)||!metric) return false;
    healthChartSelectedPoint={index,metric};
    newAppRender();
    return true;
  }
  root.addEventListener("pointerover",event=>{
    const target=event.target.closest("[data-v2-health-point]");
    if(!target||event.pointerType==="touch") return;
    if(Number(target.dataset.v2HealthPoint)===healthChartSelectedPoint?.index&&target.dataset.v2HealthMetric===healthChartSelectedPoint?.metric) return;
    chooseHealthChartPoint(target);
  },true);
  root.addEventListener("click",event=>{
    const target=event.target.closest("[data-v2-health-point]");
    if(!target) return;
    event.stopImmediatePropagation();
    chooseHealthChartPoint(target);
  },true);
  root.addEventListener("keydown",event=>{
    if(event.key!=="Enter"&&event.key!==" ") return;
    const target=event.target.closest?.("[data-v2-health-point]");
    if(!target) return;
    event.preventDefault();
    chooseHealthChartPoint(target);
  },true);
  let flowPress=null,flowDrag=null,flowDragClickGuard=false;
  let selectedFlowEvent=null,flowAdjustMode="move",flowUndoState=null;
  function cloneFlowState(value){return JSON.parse(JSON.stringify(value==null?{}:value));}
  function captureFlowUndo(){
    flowUndoState={plan:cloneFlowState(S.plan||{}),dailyTimeline:cloneFlowState(S.dailyTimeline||[]),flowOverrides:cloneFlowState(S.flowOverrides||{})};
  }
  function restoreFlowUndo(){
    if(!flowUndoState) return false;
    const state=flowUndoState;
    S.plan=state.plan; S.dailyTimeline=state.dailyTimeline; S.flowOverrides=state.flowOverrides;
    flowUndoState=null; selectedFlowEvent=null; flowAdjustMode="move";
    save(); newAppRender(); successToast("変更を取り消しました");
    return true;
  }
  function flowEventDescriptor(found,key=flowDate){
    const workMeta=flowWorkMeta(found);
    return {id:found.id,origin:found._v2Origin,key,sourceKey:found._v2SourceKey,text:found.text,a:found.a,b:found.b,lane:flowLane(found),cat:found.cat,color:found.color,workItemId:found.workItemId||"",priorityGroup:workMeta.priority,status:workMeta.status};
  }
  function flowSelectionMatches(card){
    return !!selectedFlowEvent&&selectedFlowEvent.key===card.dataset.v2EventKey&&selectedFlowEvent.id===card.dataset.v2EventId&&selectedFlowEvent.origin===card.dataset.v2EventOrigin&&selectedFlowEvent.sourceKey===card.dataset.v2EventSource;
  }
  function clearFlowPress(){
    if(flowPress?.timer) clearTimeout(flowPress.timer);
    flowPress=null;
  }
  /* Pointer events are shared by a desktop mouse and iPhone touch.  A mouse
     starts moving after a small movement threshold; touch keeps the intended
     long-press gesture so an ordinary tap can still open the detail sheet. */
  function startFlowDrag(press){
    if(!press || flowDrag) return false;
    const baseStart=press.a!=null?press.a:onTl(toMin(press.from));
    const baseEnd=press.b!=null?press.b:onTl(toMin(press.to));
    if(baseStart==null||baseEnd==null||baseEnd<=baseStart) return false;
    const rect=press.timeline.getBoundingClientRect();
    flowDrag=Object.assign(press,{rect,baseStart,baseEnd,nextStart:baseStart,nextEnd:baseEnd,mode:press.mode||"move",originalTop:press.card.style.top,originalHeight:press.card.style.height,originalTransform:press.card.style.transform});
    press.card.classList.add(flowDrag.mode==="move"?"is-dragging":"is-resizing");
    press.card.setPointerCapture?.(press.pointerId);
    clearFlowPress();
    return true;
  }
  document.addEventListener("click",event=>{
    const undo=event.target.closest("[data-v2-flow-undo]");
    if(undo){
      event.stopImmediatePropagation();
      restoreFlowUndo();
      return;
    }
    const del=event.target.closest("[data-v2-event-delete]");
    if(del){
      event.stopImmediatePropagation();
      if(!canWrite()||!activeFlowEvent) return;
      if(activeFlowEvent.origin==="daily"&&!window.confirm("これは毎日表示される予定です。全日付から削除しますか？")) return;
      captureFlowUndo();
      deleteFlowEvent(activeFlowEvent);
      activeFlowEvent=null; save(); newAppRender(); successToast("予定を削除しました");
      return;
    }
    const saveEvent=event.target.closest("[data-v2-event-save]");
    if(saveEvent){
      event.stopImmediatePropagation();
      if(!canWrite()||!activeFlowEvent) return;
      const text=document.getElementById("v2EventText")?.value.trim()||"";
      const from=document.getElementById("v2EventFrom")?.value||"";
      const to=document.getElementById("v2EventTo")?.value||"";
      const lane=document.getElementById("v2EventLane")?.value||"life";
      const priorityGroup=document.getElementById("v2EventPriority")?.value||activeFlowEvent.priorityGroup||"next";
      const status=document.getElementById("v2EventStatus")?.value||activeFlowEvent.status||"todo";
      const a=toMin(from),b=toMin(to);
      if(!text||a==null||b==null||b<=a) return toast("予定・開始時刻・終了時刻を確認してください");
      captureFlowUndo();
      const found=flowEventStore(activeFlowEvent);
      if(!found.item) return;
      Object.assign(found.item,{text,from,to,a:onTl(a),b:onTl(b),lane});
      if(lane==="work"){
        Object.assign(found.item,{priorityGroup,priority:WORK_PRIORITY_LEGACY[priorityGroup]||"b",status});
        const linked=workItemOf(activeFlowEvent.workItemId||found.item.workItemId);
        if(linked) Object.assign(linked,{priorityGroup,priority:WORK_PRIORITY_LEGACY[priorityGroup]||"b",status});
      }
      activeFlowEvent=null; save(); newAppRender(); successToast("予定を保存しました");
      return;
    }
    const close=event.target.closest("[data-v2-event-close]");
    const sheetLayer=event.target.closest("[data-v2-event-sheet-layer]");
    if(close || (sheetLayer && event.target===sheetLayer)){ event.stopImmediatePropagation(); activeFlowEvent=null; newAppRender(); return; }
    const panelEdit=event.target.closest("[data-v2-flow-selection-edit]");
    if(panelEdit&&selectedFlowEvent&&canWrite()){
      event.stopImmediatePropagation();
      activeFlowEvent=Object.assign({},selectedFlowEvent);selectedFlowEvent=null;flowAdjustMode="move";newAppRender();return;
    }
    const panelClear=event.target.closest("[data-v2-flow-selection-clear]");
    if(panelClear){event.stopImmediatePropagation();selectedFlowEvent=null;flowAdjustMode="move";newAppRender();return;}
    if(selectedFlowEvent&&!event.target.closest("[data-v2-event-id]")&&!event.target.closest("[data-v2-event-sheet-layer]")){
      event.stopImmediatePropagation();
      flowDragClickGuard=false;
      selectedFlowEvent=null; flowAdjustMode="move"; newAppRender();
      return;
    }
    const card=event.target.closest("[data-v2-event-id]");
    if(!card){ if(flowDragClickGuard) flowDragClickGuard=false; return; }
    if(flowDragClickGuard){ flowDragClickGuard=false; return; }
    event.stopImmediatePropagation();
    const visibleBlocks=flowVisibleBlocks(card.dataset.v2EventKey||flowDate);
    const found=visibleBlocks[Number(card.dataset.v2EventIndex)];
    if(!found) return;
    const edit=event.target.closest("[data-v2-event-edit]");
    if(edit&&flowSelectionMatches(card)&&!(typeof isReadOnly==="function"&&isReadOnly())){
      activeFlowEvent=Object.assign({},selectedFlowEvent); selectedFlowEvent=null; flowAdjustMode="move"; newAppRender();
    }else if(!flowSelectionMatches(card)){
      selectedFlowEvent=flowEventDescriptor(found,card.dataset.v2EventKey||flowDate);
      flowAdjustMode="move";
      newAppRender();
    }
  },true);
  document.addEventListener("keydown",event=>{
    if(event.key!=="Enter"&&event.key!==" ") return;
    const edit=event.target.closest?.("[data-v2-event-edit]");
    if(!edit) return;
    event.preventDefault(); edit.click();
  },true);
  root.addEventListener("pointerdown",event=>{
    const card=event.target.closest('[data-v2-event-editable="true"]');
    if(!card||event.button>0) return;
    const timeline=card.closest("[data-v2-timeline]");
    if(!timeline) return;
    if(typeof isReadOnly==="function"&&isReadOnly()) return;
    // Drag-endの合成clickが発生しないブラウザでは、次の実タップを通常操作へ戻す。
    if(flowDragClickGuard&&!flowDrag) flowDragClickGuard=false;
    if(!flowSelectionMatches(card)) return;
    const visibleBlocks=flowVisibleBlocks(card.dataset.v2EventKey);
    const source=visibleBlocks[Number(card.dataset.v2EventIndex)];
    if(!source) return;
    const resizeHandle=event.target.closest("[data-v2-event-resize]");
    const mode=resizeHandle?.dataset.v2EventResize||flowAdjustMode||"move";
    const press={card,timeline,origin:card.dataset.v2EventOrigin,id:card.dataset.v2EventId,sourceKey:card.dataset.v2EventSource,key:card.dataset.v2EventKey,text:source.text,a:source.a,b:source.b,lane:flowLane(source),cat:source.cat,color:source.color,startY:event.clientY,pointerId:event.pointerId,pointerType:event.pointerType||"mouse",mode};
    flowPress=press;
    if(resizeHandle){
      startFlowDrag(press);
      event.preventDefault();
      return;
    }
    // Selection is required before this timer.  Do not capture the pointer
    // yet: a short touch drag must remain available for page scrolling.
    // startFlowDrag() captures only after the long-press/mouse-move threshold.
    press.timer=setTimeout(()=>{
      if(flowPress===press) startFlowDrag(press);
    },430);
  },true);
  root.addEventListener("pointermove",event=>{
    if(!flowDrag&&flowPress&&event.pointerId===flowPress.pointerId){
      const moved=Math.abs(event.clientY-flowPress.startY);
      if(flowPress.pointerType==="mouse"&&moved>=4) startFlowDrag(flowPress);
      else if(flowPress.pointerType!=="mouse"&&moved>10) clearFlowPress();
    }
    if(flowDrag&&event.pointerId===flowDrag.pointerId){
      event.preventDefault();
      const start=+flowDrag.timeline.dataset.v2Start,end=+flowDrag.timeline.dataset.v2End,duration=flowDrag.baseEnd-flowDrag.baseStart;
      const minutesPerPixel=(end-start)/flowDrag.rect.height;
      if(flowDrag.mode==="start"){
        let next=Math.round((flowDrag.baseStart+(event.clientY-flowDrag.startY)*minutesPerPixel)/30)*30;
        next=Math.max(start,Math.min(flowDrag.baseEnd-30,next));
        flowDrag.nextStart=next;
        flowDrag.card.style.transform="";
        flowDrag.card.style.top=`${(next-start)/(end-start)*Math.round(((end-start)/60)*FLOW_HOUR_PX)}px`;
        flowDrag.card.style.height=`${Math.max(42,(flowDrag.baseEnd-next)/(end-start)*Math.round(((end-start)/60)*FLOW_HOUR_PX)-3)}px`;
      }else if(flowDrag.mode==="end"){
        let next=Math.round((flowDrag.baseEnd+(event.clientY-flowDrag.startY)*minutesPerPixel)/30)*30;
        next=Math.max(flowDrag.baseStart+30,Math.min(end,next));
        flowDrag.nextEnd=next;
        flowDrag.card.style.transform="";
        flowDrag.card.style.height=`${Math.max(42,(next-flowDrag.baseStart)/(end-start)*Math.round(((end-start)/60)*FLOW_HOUR_PX)-3)}px`;
      }else{
        let next=Math.round((flowDrag.baseStart+(event.clientY-flowDrag.startY)*minutesPerPixel)/30)*30;
        next=Math.max(start,Math.min(end-duration,next));
        flowDrag.nextStart=next;
        flowDrag.card.style.transform=`translateY(${(next-flowDrag.baseStart)/minutesPerPixel}px)`;
      }
      return;
    }
  },{capture:true,passive:false});
  root.addEventListener("pointerup",event=>{
    clearFlowPress();
    const edit=event.target.closest?.("[data-v2-event-edit]");
    if(edit){
      const card=edit.closest("[data-v2-event-id]");
      if(card&&flowSelectionMatches(card)&&!(typeof isReadOnly==="function"&&isReadOnly())){
        event.preventDefault(); event.stopImmediatePropagation();
        activeFlowEvent=Object.assign({},selectedFlowEvent); selectedFlowEvent=null; flowAdjustMode="move"; flowDragClickGuard=true; newAppRender();
      }
      return;
    }
    if(!flowDrag||event.pointerId!==flowDrag.pointerId) return;
    const drag=flowDrag; flowDrag=null; drag.card.classList.remove("is-dragging","is-resizing");
    drag.card.releasePointerCapture?.(event.pointerId);
    if(typeof isReadOnly==="function"&&isReadOnly()){
      drag.card.style.top=drag.originalTop; drag.card.style.height=drag.originalHeight; drag.card.style.transform=drag.originalTransform;
      return;
    }
    const changed=drag.mode==="start"?drag.nextStart!==drag.baseStart:drag.mode==="end"?drag.nextEnd!==drag.baseEnd:drag.nextStart!==drag.baseStart;
    if(!changed){ drag.card.style.top=drag.originalTop; drag.card.style.height=drag.originalHeight; drag.card.style.transform=drag.originalTransform; return; }
    captureFlowUndo();
    const found=flowEventStore(drag);
    if(!found.item) return;
    if(drag.mode==="start"){
      found.item.from=toHHMM(drag.nextStart%1440); found.item.a=drag.nextStart;
    }else if(drag.mode==="end"){
      found.item.to=toHHMM(drag.nextEnd%1440); found.item.b=drag.nextEnd;
    }else{
      const duration=drag.baseEnd-drag.baseStart;
      found.item.from=toHHMM(drag.nextStart%1440); found.item.to=toHHMM((drag.nextStart+duration)%1440); found.item.a=drag.nextStart; found.item.b=drag.nextStart+duration;
    }
    if(selectedFlowEvent){
      selectedFlowEvent=Object.assign({},selectedFlowEvent,{a:found.item.a,b:found.item.b});
    }
    flowAdjustMode="move";
    // pointerup後にブラウザが発火する合成clickは、次の1回だけ詳細表示へ渡さない。
    flowDragClickGuard=true;
    save(); newAppRender(); successToast("予定を変更しました");
  },true);
  root.addEventListener("pointercancel",event=>{ clearFlowPress(); if(flowDrag){flowDrag.card.classList.remove("is-dragging","is-resizing");flowDrag.card.style.top=flowDrag.originalTop;flowDrag.card.style.height=flowDrag.originalHeight;flowDrag.card.style.transform=flowDrag.originalTransform;flowDrag.card.releasePointerCapture?.(event.pointerId);flowDrag=null;} },true);
  root.addEventListener("click",event=>{
    const add=event.target.closest("[data-v2-shopping-add]");
    if(!add) return;
    event.stopImmediatePropagation();
    if(!canWrite()) return;
    const field=document.getElementById("v2ShoppingText"),text=field?.value.trim()||"";
    if(!text) return toast("買うものを入力してください");
    S.errands=Array.isArray(S.errands)?S.errands:[];
    S.errands.push({id:uid(),text,note:"",due:"",from:"",to:"",prio:"n",done:false,doneAt:null,plan:flowDate,kind:"shopping"});
    save(); newAppRender(); toast("買い物リストに追加しました");
  },true);
  const syncEventTimePreview=target=>{if(!["v2EventFrom","v2EventTo"].includes(target?.id))return;const value=root.querySelector(`[data-v2-event-time-value="${CSS.escape(target.id)}"]`);if(value)value.textContent=target.value||"--:--";};
  root.addEventListener("input",e=>{if(e.target.id==="v2Amount"){const n=moneyAmount(e.target.value);e.target.value=n?`￥${n.toLocaleString("ja-JP")}`:"";}if(e.target.dataset.v2Health){healthDraft=Object.assign({},healthDraft||{},{[e.target.dataset.v2Health]:e.target.value});const value=root.querySelector(`[data-v2-health-time-value="${CSS.escape(e.target.id)}"]`);if(value)value.textContent=e.target.value||"--:--";}syncEventTimePreview(e.target);});
  // iOSのネイティブ時間ピッカーは確定時にchangeだけを発火するため、保存前表示も同じ経路で更新する。
  root.addEventListener("change",e=>{syncEventTimePreview(e.target);});
  root.addEventListener("click", event => { if(event.target.closest("[data-v2-home]")){ goHome(); } });
  root.addEventListener("click", event => {
    const selected = event.target.closest("[data-v2-cal-date],[data-v2-habit],[data-v2-task],[data-v2-theme-save],[data-v2-plan-save]");
    if(selected?.dataset.v2CalDate){ flowDate=selected.dataset.v2CalDate; calendarDate=flowDate; flowLaneFilter="common"; return; }
    if(selected?.dataset.v2Habit){
      event.stopImmediatePropagation(); if(!canWrite()) return;
      const d=dayRec(flowDate); d.habits[selected.dataset.v2Habit]=!d.habits[selected.dataset.v2Habit]; save(); render(); return;
    }
    if(selected?.dataset.v2Task){
      event.stopImmediatePropagation(); if(!canWrite()) return;
      const task=(S.errands||[]).find(x=>x.id===selected.dataset.v2Task);
      if(task){ task.done=!task.done; task.doneAt=task.done?flowDate:null; save(); render(); }
      return;
    }
    if(selected?.hasAttribute("data-v2-theme-save")){
      event.stopImmediatePropagation(); if(!canWrite()) return;
      dayRec(flowDate).theme=document.getElementById("v2Theme")?.value.trim()||""; save(); render(); toast("テーマを保存しました"); return;
    }
    if(selected?.hasAttribute("data-v2-plan-save")){
      event.stopImmediatePropagation(); if(!canWrite()) return;
      const text=document.getElementById("v2PlanText")?.value.trim(), from=document.getElementById("v2PlanFrom")?.value, to=document.getElementById("v2PlanTo")?.value;
      if(!text||!from||!to) return toast("予定・開始時刻・終了時刻を入力してください");
      (S.plan[flowDate]||(S.plan[flowDate]=[])).push({id:uid(),text,from,to,cat:"custom"}); save(); render(); return;
    }
  }, true);
  root.addEventListener("click", event => {
    const day = event.target.closest("[data-v2-cal-date]");
    if(day){
      flowDate = day.dataset.v2CalDate;
      flowLaneFilter = "common";
      calendarDate = flowDate;
      newAppRender();
      return;
    }
    const flowLink=event.target.closest('[data-v2-go="flow"]');
    if(flowLink){
      flowDate = ymd(now());
      flowLaneFilter = flowLink.dataset.v2FlowFilter || "common";
    }
    if(event.target.closest("[data-v2-sync-start]")){
      const token=document.getElementById("v2SyncToken")?.value.trim();
      const gistId=document.getElementById("v2SyncGist")?.value.trim();
      if(!token) return toast("GitHubトークンを入力してください");
      const oldToken=document.getElementById("syncToken"), oldGist=document.getElementById("syncGist");
      if(oldToken && oldGist){ oldToken.value=token; oldGist.value=gistId; document.getElementById("syncStart")?.click(); }
      return;
    }
    if(event.target.closest("[data-v2-method-add]")){
      if(!canWrite()) return;
      const input=document.getElementById("v2MethodAdd"), value=input?.value.trim();
      if(!value) return toast("方法の名前を入力してください");
      S.expenseMethods=[...new Set([...(S.expenseMethods||[]),value])]; save(); newAppRender(); toast("支出の方法を追加しました"); return;
    }
    if(event.target.closest("[data-v2-category-add]")){
      if(!canWrite()) return;
      const input=document.getElementById("v2CategoryAdd"), value=input?.value.trim();
      if(!value) return toast("カテゴリー名を入力してください");
      S.expenseCats=[...new Set([...(S.expenseCats||[]),value])]; save(); newAppRender(); toast("支出のカテゴリーを追加しました"); return;
    }
    if(event.target.closest("[data-v2-income-method-add]")){
      if(!canWrite()) return;
      const input=document.getElementById("v2IncomeMethodAdd"), value=input?.value.trim();
      if(!value) return toast("方法の名前を入力してください");
      S.incomeMethods=[...new Set([...(S.incomeMethods||[]),value])]; save(); newAppRender(); toast("収入の方法を追加しました"); return;
    }
    if(event.target.closest("[data-v2-income-category-add]")){
      if(!canWrite()) return;
      const input=document.getElementById("v2IncomeCategoryAdd"), value=input?.value.trim();
      if(!value) return toast("カテゴリー名を入力してください");
      S.incomeCats=[...new Set([...(S.incomeCats||[]),value])]; save(); newAppRender(); toast("収入のカテゴリーを追加しました"); return;
    }
  });
  root.addEventListener("click", event => {
    const action = event.target.closest("[data-v2-month-goal-save],[data-v2-idea-add]");
    if(!action) return;
    if(!canWrite()) return;
    S.ideaBoard=Object.assign({monthlyGoal:"",ideas:[],images:[]},S.ideaBoard||{});
    if(action.hasAttribute("data-v2-month-goal-save")){
      S.ideaBoard.monthlyGoal=document.getElementById("v2MonthlyGoal")?.value.trim()||"";
      save(); toast("今月の目標を保存しました"); return;
    }
    const text=document.getElementById("v2IdeaText")?.value.trim()||"";
    if(!text) return toast("アイデアを書いてください");
    S.ideaBoard.ideas=Array.isArray(S.ideaBoard.ideas)?S.ideaBoard.ideas:[];
    S.ideaBoard.ideas.push({id:uid(),text,date:issueDate()});
    save(); render(); toast("アイデアを追加しました");
  });
  // Freeform のように画像を置けるが、端末内データが肥大化しないよう長辺を圧縮する。
  const boardImageData = file => new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("画像を読み込めませんでした"));
    reader.onload=()=>{
      const image=new Image();
      image.onerror=()=>reject(new Error("画像を開けませんでした"));
      image.onload=()=>{
        const limit=1280, scale=Math.min(1,limit/Math.max(image.naturalWidth,image.naturalHeight));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        const ctx=canvas.getContext("2d"); ctx.drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",.78));
      };
      image.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
  root.addEventListener("change", async event => {
    const input=event.target;
    if(input.id==="v2BenefitNextStart"){
      const display=root.querySelector("[data-v2-settings-date-value]");
      if(display)display.textContent=String(input.value||"").replaceAll("-","/");
      return;
    }
    const resolution=input.closest("[data-v2-work-log-project-resolution]");
    if(resolution){
      const index=Number(resolution.dataset.v2WorkLogProjectResolution);
      if(workLogImportDraft&&Number.isInteger(index)){
        workLogImportDraft.resolutions=Object.assign({},workLogImportDraft.resolutions||{}, {[index]:resolution.value||""});
        syncWorkLogImportResolutionUI();
      }
      return;
    }
    if(input.id==="v2WorkLogFile" && input.files?.length){
      const file=input.files[0];
      const keepOpen=Boolean(input.closest("details")?.open);
      try{
        const data=parseWorkLogImport(await file.text(),file.name);
        workLogImportDraft={name:file.name,data,resolutions:{}};
        newAppRender();keepWorkLogImportDetailsOpen(keepOpen);
      }catch(error){
        workLogImportDraft={name:file.name,data:{ok:false,errors:[error.message||"ファイルを解析できません"]},resolutions:{}};
        newAppRender();keepWorkLogImportDetailsOpen(keepOpen);
      }
      input.value="";
      return;
    }
    if(input.id!=="v2IdeaImage" || !input.files?.length) return;
    if(!canWrite()) return;
    const files=Array.from(input.files).slice(0,4);
    try{
      const data=await Promise.all(files.map(boardImageData));
      S.ideaBoard=Object.assign({monthlyGoal:"",ideas:[],images:[]},S.ideaBoard||{});
      S.ideaBoard.images=Array.isArray(S.ideaBoard.images)?S.ideaBoard.images:[];
      S.ideaBoard.images.push(...data.map((src,i)=>({id:uid(),src,name:files[i].name,date:issueDate()})));
      save(); render(); toast(`${data.length}枚の画像を追加しました`);
    }catch(error){ toast(error.message||"画像を追加できませんでした"); }
  });
  root.addEventListener("click", event => {
    const remove=event.target.closest("[data-v2-board-image-delete]");
    if(!remove) return;
    if(!canWrite()) return;
    S.ideaBoard=Object.assign({monthlyGoal:"",ideas:[],images:[]},S.ideaBoard||{});
    S.ideaBoard.images=(S.ideaBoard.images||[]).filter(x=>x.id!==remove.dataset.v2BoardImageDelete);
    save(); render(); toast("画像を削除しました");
  });
  /* The visual board keeps the old note/image arrays intact.  New cards are
     stored independently so that a board can be rearranged without losing
     any previously recorded content. */
  function boardCardPosition(board){
    const n=(board.cards||[]).length;
    return {x:7+(n%2)*46,y:7+(Math.floor(n/2)%4)*22};
  }
  function boardCardById(id){
    return (boardState().cards||[]).find(card=>card.id===id);
  }
  /* Freeboard: the selected tool acts directly on the canvas.  Existing cards
     remain elements, so legacy ideas and images are preserved. */
  function boardCanvasPoint(canvas,event){
    const rect=canvas.getBoundingClientRect();
    return {x:Math.max(2,Math.min(96,(event.clientX-rect.left)/rect.width*100)),y:Math.max(2,Math.min(96,(event.clientY-rect.top)/rect.height*100))};
  }
  function boardNewElement(type,point){
    const board=boardState();
    const defaults={text:{w:40,h:16,text:"",size:19,weight:600,face:"sans"},memo:{w:38,h:20,text:"",size:18,weight:600,face:"udgothic"},shape:{w:28,h:16}}[type];
    if(!defaults) return null;
    const card=Object.assign({id:uid(),type,x:point.x,y:point.y},defaults);
    card.x=Math.min(96-card.w,card.x); card.y=Math.min(96-card.h,card.y);
    board.cards.push(card); boardSelectedId=card.id; save(); return card;
  }
  function boardSaveText(id,value){const card=boardCardById(id);if(card){card.text=value;save();}}
  let boardGesture=null;
  root.addEventListener("click",event=>{
    const open=event.target.closest("[data-v2-board-open]"),close=event.target.closest("[data-v2-board-close]"),tool=event.target.closest("[data-v2-board-tool]"),remove=event.target.closest("[data-v2-board-delete]");
    if(!open&&!close&&!tool&&!remove) return;
    event.stopImmediatePropagation();
    if(open){boardFullscreen=true;newAppRender();return;}
    if(close){boardFullscreen=false;boardSelectedId=null;newAppRender();return;}
    if(tool){boardTool=tool.dataset.v2BoardTool;newAppRender();return;}
    if(remove){
      if(!remove.dataset.v2BoardDelete) return;
      if(!canWrite()) return;
      const board=boardState(); board.cards=board.cards.filter(card=>card.id!==remove.dataset.v2BoardDelete);
      boardSelectedId=null;save();newAppRender();toast("要素を削除しました");
    }
  },true);
  root.addEventListener("change",event=>{
    const field=event.target.closest("[data-v2-board-text]");
    if(field&&canWrite()){boardSaveText(field.dataset.v2BoardText,field.value);return;}
    const face=event.target.closest("[data-v2-board-face]"),weight=event.target.closest("[data-v2-board-weight]");
    if((!face&&!weight)||!canWrite()||!boardSelectedId) return;
    const card=boardCardById(boardSelectedId);if(!card) return;
    if(face) card.face=face.value;if(weight) card.weight=+weight.value;save();newAppRender();
  },true);
  root.addEventListener("input",event=>{
    const control=event.target.closest("[data-v2-board-size]");
    if(!control||!canWrite()||!boardSelectedId) return;
    const card=boardCardById(boardSelectedId);if(!card) return;
    card.size=+control.value;save();
    root.querySelector(`[data-v2-board-node="${CSS.escape(boardSelectedId)}"]`)?.style.setProperty("--board-text-size",`${card.size}px`);
  },true);
  root.addEventListener("change",async event=>{
    const input=event.target;
    if(input.id!=="v2BoardToolImageUpload"||!input.files?.length||!canWrite()) return;
    const files=Array.from(input.files).slice(0,4);
    try{
      const images=await Promise.all(files.map(boardImageData)),board=boardState();
      images.forEach((src,index)=>{const pos=boardCardPosition(board);board.cards.push({id:uid(),type:"image",src,name:files[index].name,x:pos.x,y:pos.y,w:42,h:30});});
      boardTool="select";save();newAppRender();toast(`${images.length}枚の画像を置きました`);
    }catch(error){toast(error.message||"画像を追加できませんでした");}
  },true);
  root.addEventListener("pointerdown",event=>{
    const canvas=event.target.closest("[data-v2-board-canvas]");
    if(!canvas||event.button>0||!canWrite()) return;
    const node=event.target.closest("[data-v2-board-node]"),point=boardCanvasPoint(canvas,event);
    if(boardTool==="pen"){
      const board=boardState(),stroke={id:uid(),type:"stroke",x:0,y:0,w:100,h:100,points:[[point.x,point.y]]};
      board.cards.push(stroke);boardSelectedId=stroke.id;boardGesture={kind:"draw",pointerId:event.pointerId,canvas,id:stroke.id};canvas.setPointerCapture?.(event.pointerId);event.preventDefault();newAppRender();return;
    }
    if(boardTool!=="select"&&!node){
      const card=boardNewElement(boardTool,point);boardTool="select";newAppRender();
      if(card?.type==="text"||card?.type==="memo") requestAnimationFrame(()=>root.querySelector(`[data-v2-board-text="${CSS.escape(card.id)}"]`)?.focus());
      return;
    }
    if(!node) return;
    const id=node.dataset.v2BoardNode,card=boardCardById(id);if(!card) return;
    boardSelectedId=id;
    if(event.target.closest("textarea")){newAppRender();return;}
    const rect=canvas.getBoundingClientRect();
    boardGesture={kind:"move",pointerId:event.pointerId,canvas,node,id,startX:event.clientX,startY:event.clientY,baseX:+card.x||8,baseY:+card.y||8,rect};
    canvas.setPointerCapture?.(event.pointerId);event.preventDefault();
  },true);
  root.addEventListener("pointermove",event=>{
    if(!boardGesture||event.pointerId!==boardGesture.pointerId) return;
    const card=boardCardById(boardGesture.id);if(!card) return;
    const rect=boardGesture.canvas.getBoundingClientRect();
    if(boardGesture.kind==="draw"){
      const point=boardCanvasPoint(boardGesture.canvas,event);card.points.push([point.x,point.y]);
      const line=root.querySelector(`[data-v2-board-node="${CSS.escape(card.id)}"] polyline`);if(line) line.setAttribute("points",card.points.map(p=>`${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" "));
    }else{
      const maxX=Math.max(2,98-(+card.w||42)),maxY=Math.max(2,96-(+card.h||20));
      const x=Math.max(2,Math.min(maxX,boardGesture.baseX+(event.clientX-boardGesture.startX)/rect.width*100));
      const y=Math.max(2,Math.min(maxY,boardGesture.baseY+(event.clientY-boardGesture.startY)/rect.height*100));
      boardGesture.node.style.setProperty("--board-x",x.toFixed(2));boardGesture.node.style.setProperty("--board-y",y.toFixed(2));
    }
    event.preventDefault();
  },{capture:true,passive:false});
  root.addEventListener("pointerup",event=>{
    if(!boardGesture||event.pointerId!==boardGesture.pointerId) return;
    const gesture=boardGesture;boardGesture=null;const card=boardCardById(gesture.id);if(!card)return;
    if(gesture.kind==="move"){
      const rect=gesture.canvas.getBoundingClientRect(),maxX=Math.max(2,98-(+card.w||42)),maxY=Math.max(2,96-(+card.h||20));
      card.x=Math.max(2,Math.min(maxX,gesture.baseX+(event.clientX-gesture.startX)/rect.width*100));
      card.y=Math.max(2,Math.min(maxY,gesture.baseY+(event.clientY-gesture.startY)/rect.height*100));
    }
    save();newAppRender();
  },true);
  root.addEventListener("pointercancel",()=>{boardGesture=null;},true);
  /* DAILY FLOW: a single shared time axis with a light dotted work/life guide. */
  const FLOW_HOUR_PX=49;
  const flowLane = block => block.lane || ((block.cat === "sleep" || block.cat === "life" || block.cat === "out" || block.errand) ? "life" : "work");
  const flowVisibleBlocks = key => allBlocks(key).filter(b=>b.cat!=="sleep").filter(b=>flowLaneFilter==="common"||flowLane(b)===flowLaneFilter);
  function isWorkScheduleEvent(event){
    return Boolean(event&&(event.lane==="work"||event.cat==="work"||event.cat==="make"||event.workItemId||event.projectId));
  }
  function futureWorkScheduleCount(today=ymd(now())){
    return Object.entries(S.plan||{}).filter(([key])=>key>today).reduce((sum,[,list])=>sum+(Array.isArray(list)?list.filter(isWorkScheduleEvent).length:0),0);
  }
  function deleteFutureWorkSchedules(today=ymd(now())){
    let removed=0;
    for(const key of Object.keys(S.plan||{})){
      if(key<=today)continue;
      const list=Array.isArray(S.plan[key])?S.plan[key]:[];
      const next=list.filter(event=>{
        const keep=!isWorkScheduleEvent(event);
        if(!keep)removed++;
        return keep;
      });
      if(next.length)S.plan[key]=next;else delete S.plan[key];
    }
    return removed;
  }
  function calendar(){
    const base=new Date(calendarDate+"T00:00:00"),mon=new Date(base);
    mon.setDate(base.getDate()-((base.getDay()+6)%7));
    const filtered=key=>allBlocks(key).filter(b=>calendarLane==="all"||flowLane(b)===calendarLane);
    const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
    let content="",legend="";
    if(calendarMode==="week"){
      content=`<div class="v2-week">${weekDays.map((d,i)=>{const key=ymd(d),bs=filtered(key);return `<button class="v2-week-day ${key===ymd(now())?"today":""}" data-v2-cal-date="${key}"><span>${"月火水木金土日"[i]}</span><b>${d.getDate()}</b>${bs.slice(0,3).map(b=>`<i class="v2-cal-dot" style="background:${esc2(b.color||catOf(b.cat).color)}"></i>`).join("")}</button>`}).join("")}</div>`;
      const seen=new Set(),items=[];
      weekDays.forEach(d=>filtered(ymd(d)).forEach(b=>{const key=`${b.text}|${b.color||catOf(b.cat).color}`;if(!seen.has(key)){seen.add(key);items.push(b);}}));
      legend=`<section class="an-calendar-legend"><h2>予定の色</h2>${items.length?`<div>${items.slice(0,8).map(b=>`<span><i style="background:${esc2(b.color||catOf(b.cat).color)}"></i>${esc2(b.text)}</span>`).join("")}</div>`:`<p>この表示に予定はありません。</p>`}</section>`;
    }else{
      const y=base.getFullYear(),m=base.getMonth(),days=new Date(y,m+1,0).getDate(),off=(new Date(y,m,1).getDay()+6)%7;
      content=`<div class="v2-month">${Array.from({length:off},()=>"<span></span>").join("")}${Array.from({length:days},(_,i)=>{const d=i+1,key=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,has=filtered(key).length;return `<button class="${key===ymd(now())?"today ":""}${has?"has":""}" data-v2-cal-date="${key}">${d}</button>`}).join("")}</div>`;
    }
    const period=calendarMode==="week"?`${mon.getMonth()+1}月${mon.getDate()}日からの1週間`:`${base.getFullYear()}年${base.getMonth()+1}月`;
    const purpose=calendarMode==="week"?`<section class="an-calendar-purpose"><strong>1週間：予定の重なりを見つけて整える</strong><span>仕事と生活を切り替え、負担が偏る日を確認します。</span></section>`:`<section class="an-calendar-purpose"><strong>1か月：先の予定を見通す</strong><span>支払い・通院・締切などを先回りして確認します。</span></section>`;
    return analogPage("an-calendar","calendar","CALENDAR",period,`<div class="an-calendar-switch"><button class="${calendarMode==="week"?"on":""}" data-v2-cal-mode="week">1週間</button><button class="${calendarMode==="month"?"on":""}" data-v2-cal-mode="month">1か月</button></div><div class="an-calendar-filter"><button class="${calendarLane==="all"?"on":""}" data-v2-cal-lane="all">すべて</button><button class="${calendarLane==="work"?"on":""}" data-v2-cal-lane="work">${icon("work")}仕事</button><button class="${calendarLane==="life"?"on":""}" data-v2-cal-lane="life">${icon("life")}生活</button><button class="${calendarLane==="common"?"on":""}" data-v2-cal-lane="common">共通</button></div>${purpose}${content}${legend}<p class="an-empty">日付をタップすると、その日の時間割を開きます。</p>`);
  }
  function calendarMoveDate(key, mode, delta){
    const date=new Date(`${key}T00:00:00`);
    if(mode==="week") date.setDate(date.getDate()+delta*7);
    else { date.setDate(1); date.setMonth(date.getMonth()+delta); }
    return ymd(date);
  }
  function calendarV2(){
    const base=new Date(`${calendarDate}T00:00:00`),mon=new Date(base);
    mon.setDate(base.getDate()-((base.getDay()+6)%7));
    const filtered=key=>allBlocks(key).filter(b=>b.cat!=="sleep").filter(b=>calendarLane==="common"||flowLane(b)===calendarLane);
    const label=b=>workItemOf(b.workItemId)?.name||b.text||"予定";
    const color=b=>b.color||catOf(b.cat).color;
    const recurring=b=>b._v2Origin==="daily"?`<small class="an-calendar-repeat">毎日</small>`:"";
    const itemRow=(b,key)=>`<div class="an-calendar-item"><i style="background:${esc2(color(b))}"></i><span><strong>${esc2(label(b))}</strong><small>${toHHMM((b.a||0)%1440)} - ${toHHMM((b.b||0)%1440)}${recurring(b)}</small></span></div>`;
    const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
    const weekData=weekDays.map((date,index)=>({date,key:ymd(date),index,items:filtered(ymd(date))}));
    const period=calendarMode==="week"?`${mon.getMonth()+1}月${mon.getDate()}日からの1週間`:`${base.getFullYear()}年${base.getMonth()+1}月`;
    const nav=`<div class="an-calendar-nav"><button type="button" data-v2-cal-nav="-1" aria-label="前の期間">‹</button><div><strong>${esc2(period)}</strong><small>${calendarMode==="week"?"今週の重なりと負荷を見る":"先の予定と習慣を見通す"}</small></div><button type="button" data-v2-cal-today>今日</button><button type="button" data-v2-cal-nav="1" aria-label="次の期間">›</button></div>`;
    let content="",purpose="";
    if(calendarMode==="week"){
      const total=weekData.reduce((sum,day)=>sum+day.items.length,0);
      const strip=weekData.map(day=>`<button type="button" class="an-calendar-week-spot ${day.key===ymd(now())?"today":""}" data-v2-cal-date="${day.key}"><span>${"月火水木金土日"[day.index]}</span><b>${day.date.getDate()}</b><small>${day.items.length?`${day.items.length}件`:"—"}</small></button>`).join("");
      const agenda=weekData.map(day=>`<article class="an-calendar-day-card"><button type="button" class="an-calendar-day-head" data-v2-cal-date="${day.key}"><span>${"月火水木金土日"[day.index]} ${day.date.getMonth()+1}/${day.date.getDate()}</span><b>${day.items.length?`${day.items.length}件`:"予定なし"}</b></button><div class="an-calendar-day-items">${day.items.length?day.items.slice(0,6).map(b=>itemRow(b,day.key)).join(""):`<p>この日の予定はありません。</p>`}${day.items.length>6?`<small class="an-calendar-more">ほか${day.items.length-6}件</small>`:""}</div></article>`).join("");
      purpose=`<section class="an-calendar-purpose"><strong>1週間：予定の重なりと負荷を整える</strong><span>毎日の習慣も含めて、忙しい日と余白のある日を見比べます。</span></section>`;
      content=`<div class="an-calendar-week-strip">${strip}</div><section class="an-calendar-agenda"><header><h2>今週の予定</h2><span>${total}件</span></header>${agenda}</section>`;
    }else{
      const year=base.getFullYear(),month=base.getMonth(),daysInMonth=new Date(year,month+1,0).getDate(),offset=(new Date(year,month,1).getDay()+6)%7;
      const monthData=Array.from({length:daysInMonth},(_,i)=>{const date=new Date(year,month,i+1),key=ymd(date);return {date,key,items:filtered(key)};});
      const cells=Array.from({length:offset},()=>`<span class="an-calendar-empty-cell" aria-hidden="true"></span>`).concat(monthData.map(day=>`<button type="button" class="an-calendar-month-day ${day.key===ymd(now())?"today":""} ${day.items.length?"has":""}" data-v2-cal-date="${day.key}"><b>${day.date.getDate()}</b><small>${day.items.length?`${day.items.length}件`:""}</small><span>${day.items.slice(0,3).map(b=>`<i style="background:${esc2(color(b))}"></i>`).join("")}</span></button>`)).join("");
      const plannedDays=monthData.filter(day=>day.items.length).length;
      const recurringNames=[...new Set(monthData.flatMap(day=>day.items.filter(b=>b._v2Origin==="daily").map(label)))];
      const upcoming=monthData.flatMap(day=>day.items.map(item=>({day,item}))).filter(entry=>entry.day.key>=ymd(now())).slice(0,6);
      const nextList=upcoming.length?upcoming.map(({day,item})=>`<div class="an-calendar-upcoming"><span>${day.date.getMonth()+1}/${day.date.getDate()}</span>${itemRow(item,day.key)}</div>`).join(""):`<p>この月の先の予定はありません。</p>`;
      purpose=`<section class="an-calendar-purpose"><strong>1か月：先の予定と習慣を見通す</strong><span>支払い・通院・締切に加えて、毎日の習慣が続けやすい配置か確認します。</span></section>`;
      content=`<div class="an-calendar-weekday-row">${["月","火","水","木","金","土","日"].map(day=>`<span>${day}</span>`).join("")}</div><div class="an-calendar-month-grid">${cells}</div><section class="an-calendar-month-summary"><div><strong>${plannedDays}</strong><span>予定がある日</span></div><div><strong>${recurringNames.length}</strong><span>毎日の習慣</span></div><div><strong>${monthData.reduce((max,day)=>Math.max(max,day.items.length),0)}</strong><span>最多の日</span></div></section><section class="an-calendar-agenda an-calendar-upcoming-list"><header><h2>この先の予定</h2><span>最大6件</span></header>${nextList}</section>`;
    }
    const filters=[["work","仕事", "work"],["life","生活","life"],["common","共通","common"]];
    const filterHtml=filters.map(([id,text,iconName])=>`<button type="button" class="${calendarLane===id?"on":""}" data-v2-cal-lane="${id}">${id==="common"?"":icon(iconName)}${text}</button>`).join("");
    return analogPage("an-calendar","calendar","CALENDAR",period,`${nav}<div class="an-calendar-switch"><button class="${calendarMode==="week"?"on":""}" data-v2-cal-mode="week">1週間</button><button class="${calendarMode==="month"?"on":""}" data-v2-cal-mode="month">1か月</button></div><div class="an-calendar-filter">${filterHtml}</div>${purpose}${content}<p class="an-empty">日付をタップすると、その日の時間割を開きます。</p>`);
  }
  function workProjectHistory(projectId){
    return Object.entries(S.workLogs||{}).map(([date,record])=>({date,review:workReviewFor(record,projectId)})).filter(entry=>Object.values(entry.review||{}).some(Boolean)).sort((a,b)=>a.date.localeCompare(b.date));
  }
  function workProjectGrowthSummary(projectId){
    const history=workProjectHistory(projectId);
    if(!history.length)return `<small class="an-work-growth-empty">日報の振り返りはまだありません</small>`;
    const latest=history[history.length-1],latestText=latest.review.description||latest.review.done||"記録あり",latestStatus=latest.review.statusNote||"未記録",next=latest.review.next||latest.review.todo||"未記録";
    return `<div class="an-work-growth" data-v2-work-growth="${esc2(projectId)}"><small>成長の記録 ${history.length}日</small><p><b>最新</b>${esc2(latestText)}</p><p><b>状況</b>${esc2(latestStatus)}</p><p><b>次回</b>${esc2(next)}</p><details><summary>履歴を見る</summary><ol>${history.slice().reverse().map(entry=>`<li><time>${esc2(entry.date.replaceAll("-","/"))}</time><span>${esc2(entry.review.description||entry.review.done||"記録あり")}</span></li>`).join("")}</ol></details></div>`;
  }
  function workBoard(){
    const candidates=legacyWorkCandidates();
    const groups=WORK_PRIORITY_OPTIONS.map(group=>{
      const items=workItems().filter(item=>workPriorityId(item)===group.id).sort((a,b)=>String(a.name).localeCompare(String(b.name),"ja"));
      const rows=items.length?items.map(item=>{const project=workProjectOf(item.projectId),writable=!(typeof isReadOnly==="function"&&isReadOnly()),editing=workItemEditingId===item.id&&writable,projectName=project?.name||"プロジェクト未設定",projectEdit=project&&writable?`<button type="button" class="an-work-item-project-edit" data-v2-work-project-edit="${esc2(project.id)}">プロジェクト名を変更</button>`:"",itemEdit=writable?`<button type="button" class="an-work-item-edit-open" data-v2-work-item-edit="${esc2(item.id)}">仕事内容名を変更</button>`:"",copy=editing?`<div class="an-work-item-edit"><input data-v2-work-item-name value="${esc2(item.name)}" maxlength="80" aria-label="仕事内容名"><div><button type="button" data-v2-work-item-name-save="${esc2(item.id)}">保存</button><button type="button" data-v2-work-item-name-cancel>キャンセル</button></div></div>`:`<strong>${esc2(item.name)}</strong>${itemEdit}<small>${esc2(projectName)}${projectEdit}</small>`;return `<article class="an-work-item" style="--work-priority-color:${esc2(workPriorityColor(item))}"><div class="an-work-item-copy">${copy}</div><span class="an-work-status ${esc2(item.status||"todo")}">${esc2(workStatusLabel(item.status))}</span><label class="an-work-priority-label">優先度<select data-v2-work-priority="${esc2(item.id)}">${workOptions(WORK_PRIORITY_OPTIONS,workPriorityId(item))}</select></label></article>`}).join(""):`<p class="an-empty">この分類の仕事はありません。</p>`;
      return `<section class="an-work-group ${esc2(group.id)}" style="--work-priority-color:${esc2(workPriorityColor(group.id))}"><header><h2>${esc2(group.label)}</h2><span>${items.length}件</span></header><div class="an-work-items">${rows}</div></section>`;
    }).join("");
    const candidateRows=candidates.map(candidate=>`<article class="an-work-import-row"><label class="an-work-import-check"><input type="checkbox" data-v2-work-import="${esc2(candidate.key)}"><span><strong>${esc2(candidate.name)}</strong><small>${esc2(candidate.source)} ・ ${esc2(workProjectOf(candidate.projectId)?.name||"プロジェクト未設定")}</small></span></label><label>優先度<select data-v2-work-import-priority="${esc2(candidate.key)}">${workOptions(WORK_PRIORITY_OPTIONS,"next")}</select></label><label>状態<select data-v2-work-import-status="${esc2(candidate.key)}">${workOptions(WORK_STATUS_OPTIONS,"todo")}</select></label></article>`).join("");
    const importBox=candidates.length?`<section class="an-work-import"><header><div><h2>既存の仕事を登録</h2><p>以前の予定を仕事として整理できます。登録後は、優先度と進み具合を一覧で確認できます。</p></div><span>${candidates.length}件</span></header><div class="an-work-import-list">${candidateRows}</div><button type="button" class="an-save blue" data-v2-work-import-save>選択した仕事を登録</button></section>`:`<section class="an-work-import is-empty"><h2>仕事を登録する</h2><p>まだ仕事が登録されていません。時間割から仕事内容を追加すると、ここで優先度と進み具合を整理できます。</p></section>`;
    const projectRows=workProjects().map(project=>{const count=workItems().filter(item=>item.projectId===project.id).length,editing=workProjectEditingId===project.id&&canWrite();const controls=canWrite()?(editing?`<div class="an-work-project-edit"><input data-v2-work-project-name value="${esc2(project.name)}" maxlength="60" aria-label="プロジェクト名"><button type="button" data-v2-work-project-name-save="${esc2(project.id)}">保存</button><button type="button" data-v2-work-project-name-cancel>キャンセル</button></div>`:`<button type="button" class="an-work-project-edit-open" data-v2-work-project-edit="${esc2(project.id)}">プロジェクト名を変更</button>`):"";return `<article class="an-work-project"><div class="an-work-project-title"><strong>${esc2(project.name)}</strong>${controls}</div><span>${count}件の仕事内容</span>${workProjectGrowthSummary(project.id)}</article>`}).join("");
    const projectBox=`<section class="an-work-projects"><header><div><h2>プロジェクト</h2><p>まとまりを管理します。次にする行動は下の「仕事内容」で分けます。</p></div><span>${workProjects().length}件</span></header><div class="an-work-project-list">${projectRows||`<p class="an-empty">プロジェクトはありません。</p>`}</div></section>`;
    return analogPage("an-work-board","list","WORK BOARD","仕事の一覧",`<p class="an-date-note">仕事のまとまりと、具体的にすることを分けて整理します。今やる仕事を優先度順に並べます。</p>${projectBox}${importBox}${groups}`);
  }
  let activeFlowEvent=null;
  function flowEventSheet(){
    if(!activeFlowEvent) return "";
    const e=activeFlowEvent;
    const isWork=e.lane==="work",isDaily=e.origin==="daily";
    const eventTime=(id,label,value)=>`<label>${label}<span class="an-native-time-control"><input id="${id}" type="time" value="${toHHMM(value%1440)}"><span data-v2-event-time-value="${id}" aria-hidden="true">${toHHMM(value%1440)}</span></span></label>`;
    return `<div class="an-event-sheet-layer" data-v2-event-sheet-layer><section class="an-event-sheet" role="dialog" aria-modal="true" aria-labelledby="v2EventTitle"><button type="button" class="an-event-sheet-close" data-v2-event-close aria-label="閉じる">${icon("close")}</button><small>この日の予定を編集</small><h2 id="v2EventTitle">${esc2(e.text)}</h2><div class="an-event-form"><label>予定の名前<input id="v2EventText" value="${esc2(e.text)}" maxlength="80"></label><div class="an-event-time-grid">${eventTime("v2EventFrom","開始",e.a)}${eventTime("v2EventTo","終了",e.b)}</div><label>区分<select id="v2EventLane"><option value="work" ${e.lane==="work"?"selected":""}>仕事</option><option value="life" ${e.lane==="life"?"selected":""}>生活</option><option value="common" ${e.lane==="common"?"selected":""}>共通</option></select></label>${isWork?`<div class="an-event-work-fields"><label>優先順位<select id="v2EventPriority">${workOptions(WORK_PRIORITY_OPTIONS,e.priorityGroup)}</select></label><label>状態<select id="v2EventStatus">${workOptions(WORK_STATUS_OPTIONS,e.status)}</select></label></div>`:""}</div><p class="an-event-sheet-note">時間割では、予定をタップして選択してから「予定全体」「開始」「終了」を選び、カードを上下に動かします。${isDaily?"これは毎日表示される予定です。削除すると全日付から消えます。":"取り込んだ予定も、この日だけ編集できます。"}</p><div class="an-event-sheet-actions"><button type="button" class="danger" data-v2-event-delete>${isDaily?"毎日の予定から削除":"予定を削除"}</button><button type="button" class="primary" data-v2-event-save>保存</button></div></section></div>`;
  }
  function flowSelectionPanel(topPx=0){
    if(!selectedFlowEvent)return "";
    const e=selectedFlowEvent,writable=!(typeof isReadOnly==="function"&&isReadOnly());
    return `<aside class="an-flow-selection-panel" data-v2-flow-selection-panel style="--selection-panel-top:${Math.max(0,Math.round(topPx))}px" aria-live="polite"><div><small>選択中の予定</small><strong>${esc2(e.text)}</strong><span>${toHHMM(e.a%1440)} - ${toHHMM(e.b%1440)}</span></div>${writable?`<button type="button" class="v2-flow-selection-edit" data-v2-flow-selection-edit>予定を編集</button>`:""}<button type="button" class="v2-flow-selection-clear" data-v2-flow-selection-clear>選択を解除</button></aside>`;
  }
  function flow(){
    const key=flowDate,rec=S.daily[key]||{},blocks=flowVisibleBlocks(key),start=typeof TL_START==="number"?TL_START:4*60,end=typeof TL_END==="number"?TL_END:27*60,h=Math.round(((end-start)/60)*FLOW_HOUR_PX),slots=[];
    const writable=!(typeof isReadOnly==="function"&&isReadOnly());
    const undoToolbar=flowUndoState&&writable?`<button type="button" class="an-flow-undo" data-v2-flow-undo>↶ 変更を取り消す</button>`:"";
    for(let m=start;m<end;m+=60)slots.push(`<span class="v2-time" style="top:${(m-start)/(end-start)*h}px">${toHHMM(m%1440)}</span>`);
    const events=timelineLayout(blocks,flowLaneFilter).map((b,index)=>{const a=Math.max(start,b.a),z=Math.min(end,b.b),work=workItemOf(b.workItemId),isWork=flowLane(b)==="work",label=work?.name||b.text,eventColor=isWork?workPriorityColor(work||b.priorityGroup||"next"):(b.color||catOf(b.cat).color),geometry=flowCardGeometry(b),left=geometry.left,width=geometry.width,selected=selectedFlowEvent&&selectedFlowEvent.id===b.id&&selectedFlowEvent.origin===b._v2Origin&&selectedFlowEvent.sourceKey===b._v2SourceKey,handles=selected&&writable?`<span class="v2-event-resize v2-event-resize-start" data-v2-event-resize="start" aria-hidden="true"></span><span class="v2-event-resize v2-event-resize-end" data-v2-event-resize="end" aria-hidden="true"></span>`:"";return z<=a?"":`<div class="v2-event an-flow-event an-lane-${flowLane(b)}${selected?" is-selected":""}${writable?" is-writable":""}" role="button" tabindex="0" data-v2-event-id="${esc2(b.id||"")}" data-v2-event-index="${index}" data-v2-event-source="${esc2(b._v2SourceKey||"")}" data-v2-event-origin="${esc2(b._v2Origin||"auto")}" data-v2-event-key="${esc2(key)}" data-v2-event-work-item-id="${esc2(b.workItemId||"")}" data-v2-event-editable="true" aria-pressed="${selected?"true":"false"}" style="--event:${esc2(eventColor)};--event-left:${left};--event-width:${width};left:${left};width:${width};right:auto;top:${(a-start)/(end-start)*h}px;height:${Math.max(42,(z-a)/(end-start)*h-3)}px">${handles}<span class="v2-event-content"><strong>${esc2(label)}</strong><span class="v2-event-time">${toHHMM(a%1440)} - ${toHHMM(z%1440)}</span></span></div>`}).join("");
    const n=now(),rawNowM=n.getHours()*60+n.getMinutes(),nowM=rawNowM<start?rawNowM+1440:rawNowM,isToday=key===ymd(n),nowline=isToday&&nowM>=start&&nowM<=end?`<div class="v2-now" data-v2-now-line data-v2-start="${start}" data-v2-end="${end}" style="top:${(nowM-start)/(end-start)*h}px"><b data-v2-now-label>いま ${toHHMM(rawNowM)}</b></div>`:"",selectedStart=selectedFlowEvent?Math.max(start,selectedFlowEvent.a):start,selectedEnd=selectedFlowEvent?Math.min(end,selectedFlowEvent.b):start,selectionBelow=((selectedEnd-start)/(end-start))*h+8,selectionAbove=((selectedStart-start)/(end-start))*h-92-8,selectionPanelTop=selectionBelow+92<=h?selectionBelow:Math.max(0,selectionAbove);
    const filterLabel={work:"仕事",life:"生活",common:"共通（すべての予定）"}[flowLaneFilter]||"共通（すべての予定）";
    const addLabel=flowLaneFilter==="work"?"仕事内容を追加する":flowLaneFilter==="life"?"生活の予定を足す":"予定を追加する";
    const laneGuide=flowLaneFilter==="work"?`<span>${icon("work")}仕事</span>`:flowLaneFilter==="life"?`<span>${icon("life")}生活</span>`:`<span>${icon("work")}仕事</span><span>${icon("life")}生活</span>`;
    const dailyEndAction=writable&&Array.isArray(S.dailyTimeline)&&S.dailyTimeline.length?`<button type="button" data-v2-daily-end>毎日の予定を明後日以降終了</button>`:"";
    const futureWorkCount=futureWorkScheduleCount();
    const futureWorkAction=writable&&flowLaneFilter==="work"&&futureWorkCount?`<button type="button" class="an-flow-work-clear" data-v2-work-future-clear>明日以降の仕事予定を削除（${futureWorkCount}件）<\/button>`:"";
    return analogPage("an-flow","calendar","DAILY FLOW","一日の流れ",`<section class="an-theme-strip"><small>${dateLabel(key)}<\/small><strong>${esc2(rec.theme||"今日のテーマを設定")}<\/strong><\/section><div class="an-flow-filter" aria-label="時間割の分類"><button class="${flowLaneFilter==="work"?"on":""}" data-v2-flow-filter="work">仕事<\/button><button class="${flowLaneFilter==="life"?"on":""}" data-v2-flow-filter="life">生活<\/button><button class="${flowLaneFilter==="common"?"on":""}" data-v2-flow-filter="common">共通<\/button><\/div><p class="an-flow-filter-note">表示中：${filterLabel}。共通はすべての予定を表示します。<\/p>${undoToolbar}<section class="an-timeline-section"><h2>${icon("clock")}時間割<\/h2><div class="an-flow-timeline-shell" data-v2-flow-view="${flowLaneFilter}"><div class="an-flow-lane-guide">${laneGuide}<\/div><div class="v2-timeline" data-v2-timeline data-v2-start="${start}" data-v2-end="${end}" style="min-height:${h}px"><div class="an-flow-time-rail">${slots.join("")}<\/div><div class="an-flow-event-layer" style="height:${h}px">${events}${nowline}${flowSelectionPanel(selectionPanelTop)}<\/div><\/div><\/div><\/section><div class="an-flow-actions"><button data-v2-plan-open aria-expanded="false">${icon("plus")}${addLabel}<\/button><button data-v2-go="calendar">${icon("calendar")}週／月を見る<\/button>${dailyEndAction}${futureWorkAction}<\/div><div id="v2PlanArea" aria-live="polite"><\/div>${flowEventSheet()}`);
  }
  root.addEventListener("click", event => {
    const opener=event.target.closest("[data-v2-plan-open]");
    if(!opener) return;
    event.stopImmediatePropagation();
    const box=document.getElementById("v2PlanArea");
    if(!box) return;
    if(box.dataset.open==="1"){
      box.innerHTML=""; delete box.dataset.open; opener.setAttribute("aria-expanded","false"); return;
    }
    const habits=habitList();
    box.dataset.open="1"; opener.setAttribute("aria-expanded","true");
    const projectOptions=workProjects().map(x=>`<option value="${esc2(x.id)}">${esc2(x.name)}</option>`).join("");
    const kindOptions=flowLaneFilter==="work"?`<option value="work-existing">登録済みの仕事を選ぶ</option><option value="work-new">新しい仕事内容を追加する</option>`:flowLaneFilter==="life"?`<option value="plan">この日の予定</option><option value="daily">毎日やること</option>`:`<option value="plan">この日の予定</option><option value="work-existing">登録済みの仕事を選ぶ</option><option value="work-new">新しい仕事内容を追加する</option><option value="daily">毎日やること</option>`;
    const defaultLane=flowLaneFilter==="work"?"work":flowLaneFilter==="common"?"common":"life";
    const laneOptions=`<option value="work" ${defaultLane==="work"?"selected":""}>仕事</option><option value="life" ${defaultLane==="life"?"selected":""}>生活</option><option value="common" ${defaultLane==="common"?"selected":""}>共通</option>`;
    box.innerHTML=`<section class="an-flow-planner"><div class="an-planner-head"><strong>時間を決めて追加</strong><button type="button" data-v2-plan-close aria-label="閉じる">${icon("close")}</button></div><label>種類<select id="v2TimelineKind">${kindOptions}</select></label><div id="v2TimelineWorkFields" class="an-work-planner-fields" hidden></div><label id="v2TimelineHabitRow" class="an-planner-habit" hidden>毎日の習慣から選ぶ<select id="v2TimelineHabit"><option value="">自由入力</option>${habits.map(h=>`<option value="${esc2(h.id)}">${esc2(h.label)}</option>`).join("")}</select></label><label id="v2TimelineGeneralText">内容<input id="v2PlanText" placeholder="例：散歩、薬、集中作業"></label><div class="an-planner-times"><label>開始<input id="v2PlanFrom" type="time"></label><label>終了<input id="v2PlanTo" type="time"></label></div><label id="v2TimelineLaneRow">置く場所<select id="v2PlanLane">${laneOptions}</select></label><button class="an-save" data-v2-timeline-save>${icon("plus")}時間割に追加</button></section>`;
    syncTimelineKind(document.getElementById("v2TimelineKind")?.value||"plan");
    const kindSelect=document.getElementById("v2TimelineKind");
    if(kindSelect&&flowLaneFilter!=="life")kindSelect.insertAdjacentHTML("beforeend",`<option value="project-new">プロジェクトだけを追加する</option>`);
    document.querySelector("#v2PlanFrom")?.closest(".an-planner-times")?.setAttribute("id","v2TimelineTimeRow");
    syncTimelineKind(kindSelect?.value||"plan");
  },true);
  function syncTimelineKind(kind){
    const fields=document.getElementById("v2TimelineWorkFields");
    if(fields){
      if(kind==="work-existing"){
        const items=workItems().slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),"ja"));
        fields.innerHTML=`<label>登録済みの仕事<select id="v2TimelineExistingWork"><option value="">仕事を選ぶ</option>${items.map(item=>{const project=workProjectOf(item.projectId);return `<option value="${esc2(item.id)}">${esc2(item.name)} ・ ${esc2(project?.name||"プロジェクト未設定")} ・ ${esc2(workPriorityLabel(item))} ・ ${esc2(workStatusLabel(item.status))}</option>`}).join("")}</select></label><p class="an-planner-help">登録済みの仕事をそのまま時間割に追加します。</p>`;
      }else if(kind==="project-new"){
        fields.innerHTML=`<label>新しいプロジェクト名<input id="v2TimelineProjectOnlyName" placeholder="例：新しい仕事のまとまり"></label><p class="an-planner-help">プロジェクトだけを登録します。予定の開始・終了はあとで時間割へ追加できます。</p>`;
      }else if(kind==="work-new"||kind==="work"){
        const projectOptions=workProjects().map(x=>`<option value="${esc2(x.id)}">${esc2(x.name)}</option>`).join("");
        fields.innerHTML=`<label>プロジェクト<select id="v2TimelineProject"><option value="">選ぶ</option>${projectOptions}</select></label><label>新しいプロジェクト名<input id="v2TimelineNewProject" placeholder="既存にない場合だけ入力"></label><label>新しい仕事内容<input id="v2TimelineWorkName" placeholder="例：素材を確認する"></label><div class="an-planner-times"><label>優先順位<select id="v2TimelinePriority">${workOptions(WORK_PRIORITY_OPTIONS,"next")}</select></label><label>状態<select id="v2TimelineStatus">${workOptions(WORK_STATUS_OPTIONS,"todo")}</select></label></div><p class="an-planner-help">新しい仕事内容を登録して、時間割に追加します。プロジェクト名は既存のものを選べます。</p>`;
      }else fields.innerHTML="";
    }
    document.getElementById("v2TimelineHabitRow")?.toggleAttribute("hidden",kind!=="daily");
    const isWork=kind==="work-existing"||kind==="work-new"||kind==="work"||kind==="project-new";
    document.getElementById("v2TimelineWorkFields")?.toggleAttribute("hidden",!isWork);
    document.getElementById("v2TimelineGeneralText")?.toggleAttribute("hidden",isWork);
    document.getElementById("v2TimelineLaneRow")?.toggleAttribute("hidden",isWork);
    document.getElementById("v2TimelineTimeRow")?.toggleAttribute("hidden",kind==="project-new");
    if(kind==="work-new"||kind==="work")document.getElementById("v2TimelineProject")?.querySelector("option[value='']")?.replaceChildren("プロジェクトを選択");
  }
  root.addEventListener("change", event => {
    const target=event.target;
    if(target.matches("[data-v2-work-priority]")){
      event.stopImmediatePropagation();
      if(!canWrite()) return;
      const item=workItemOf(target.dataset.v2WorkPriority);
      if(!item) return;
      item.priorityGroup=target.value;
      item.priority=WORK_PRIORITY_LEGACY[target.value]||"c";
      save(); newAppRender(); successToast("優先度を変更しました");
      return;
    }
    if(target.id==="v2TimelineKind"){
      syncTimelineKind(target.value);
      return;
    }
    if(target.id==="v2TimelineHabit"){
      const habit=habitList().find(x=>x.id===target.value);
      const text=document.getElementById("v2PlanText");
      if(habit && text) text.value=habit.label;
    }
  });
  root.addEventListener("click", event => {
    const button=event.target.closest("[data-v2-work-import-save]");
    if(!button)return;
    event.stopImmediatePropagation();
    if(!canWrite())return;
    const candidates=legacyWorkCandidates(),selected=[...root.querySelectorAll("[data-v2-work-import]:checked")];
    if(!selected.length)return toast("登録する仕事を選んでください");
    S.workProjects=Array.isArray(S.workProjects)?S.workProjects:[];
    S.workItems=Array.isArray(S.workItems)?S.workItems:[];
    let added=0;
    for(const checkbox of selected){
      const candidate=candidates.find(x=>x.key===checkbox.dataset.v2WorkImport);
      if(!candidate)continue;
      const duplicate=S.workItems.find(item=>item&&item.projectId===candidate.projectId&&String(item.name||"").trim()===candidate.name);
      if(duplicate){linkWorkCatalogItem(duplicate);continue;}
      const priorityGroup=root.querySelector(`[data-v2-work-import-priority="${CSS.escape(candidate.key)}"]`)?.value||"next";
      const status=root.querySelector(`[data-v2-work-import-status="${CSS.escape(candidate.key)}"]`)?.value||"todo";
      const item={id:uid(),kind:"task",projectId:candidate.projectId,name:candidate.name,priorityGroup,priority:WORK_PRIORITY_LEGACY[priorityGroup]||"b",status,note:""};
      S.workItems.push(item);linkWorkCatalogItem(item);added++;
    }
    save();newAppRender();successToast(`${added}件の仕事を登録しました`);
  },true);
  root.addEventListener("click", event => {
    const closer=event.target.closest("[data-v2-plan-close]");
    if(!closer) return;
    event.stopImmediatePropagation();
    const box=document.getElementById("v2PlanArea");
    if(box){box.innerHTML="";delete box.dataset.open;}
    root.querySelector("[data-v2-plan-open]")?.setAttribute("aria-expanded","false");
  },true);
  root.addEventListener("click", event => {
    const saver=event.target.closest("[data-v2-timeline-save]");
    if(!saver) return;
    event.stopImmediatePropagation();
    if(!canWrite()) return;
    const habitId=document.getElementById("v2TimelineHabit")?.value||"",habit=habitList().find(x=>x.id===habitId),from=document.getElementById("v2PlanFrom")?.value||"",to=document.getElementById("v2PlanTo")?.value||"",kind=document.getElementById("v2TimelineKind")?.value||"plan",lane=document.getElementById("v2PlanLane")?.value||"life";
    if(kind==="work-existing"){
      const workItemId=document.getElementById("v2TimelineExistingWork")?.value||"",item=workItemOf(workItemId);
      if(!item||!from||!to)return toast("登録済みの仕事・開始・終了を選んでください");
      if(toMin(to)<=toMin(from))return toast("終了時刻は開始時刻より後にしてください");
      S.plan=S.plan&&typeof S.plan==="object"?S.plan:{};(S.plan[flowDate]||(S.plan[flowDate]=[])).push({id:uid(),workItemId:item.id,projectId:item.projectId,text:item.name,from,to,lane:"work",cat:"work"});
      save();newAppRender();successToast("登録済みの仕事を時間割に追加しました");return;
    }
    if(kind==="project-new"){
      const project=ensureWorkProject(document.getElementById("v2TimelineProjectOnlyName")?.value||"");
      if(!project)return toast("新しいプロジェクト名を入力してください");
      save();newAppRender();successToast("プロジェクトを仕事カタログに追加しました");return;
    }
    if(kind==="work-new"||kind==="work"){
      const name=document.getElementById("v2TimelineWorkName")?.value.trim()||"";
      if(!name||!from||!to)return toast("プロジェクト・仕事内容・開始・終了を入れてください");
      if(toMin(to)<=toMin(from))return toast("終了時刻は開始時刻より後にしてください");
      S.workProjects=Array.isArray(S.workProjects)?S.workProjects:[];S.workItems=Array.isArray(S.workItems)?S.workItems:[];
      const newName=document.getElementById("v2TimelineNewProject")?.value.trim()||"";
      let projectId=document.getElementById("v2TimelineProject")?.value||"";
      if(newName){const project=ensureWorkProject(newName);if(project)projectId=project.id;}
      if(!projectId)return toast("プロジェクトを選ぶか、新しく作ってください");
      const priorityGroup=document.getElementById("v2TimelinePriority")?.value||"next";
      const workItem={id:uid(),kind:"task",projectId,name,priorityGroup,priority:WORK_PRIORITY_LEGACY[priorityGroup]||"b",status:document.getElementById("v2TimelineStatus")?.value||"todo",note:""};
      S.workItems.push(workItem);S.plan=S.plan&&typeof S.plan==="object"?S.plan:{};(S.plan[flowDate]||(S.plan[flowDate]=[])).push({id:uid(),workItemId:workItem.id,projectId,text:name,from,to,lane:"work",cat:"work"});
      save();newAppRender();successToast("仕事をカタログと時間割に追加しました");return;
    }
    const text=habit?.label||document.getElementById("v2PlanText")?.value.trim()||"";
    if(!text||!from||!to) return toast("内容・開始・終了を入れてください");
    if(toMin(to)<=toMin(from)) return toast("終了時刻は開始時刻より後にしてください");
    const item={id:uid(),text,from,to,lane,cat:lane==="work"?"make":lane==="common"?"common":"life",repeat:kind==="daily",habitId:habit?.id||""};
    if(kind==="daily"){
      S.dailyTimeline=Array.isArray(S.dailyTimeline)?S.dailyTimeline:[];
      S.dailyTimeline.push(item);
      successToast("毎日やることを時間割に追加しました");
    }else{
      (S.plan[flowDate]||(S.plan[flowDate]=[])).push(item);
      successToast("この日の予定を時間割に追加しました");
    }
    save(); newAppRender();
  },true);
  root.addEventListener("click", event => {
    const openFlow=event.target.closest("[data-v2-open-flow-filter]");
    if(!openFlow) return;
    event.stopImmediatePropagation();
    flowLaneFilter=openFlow.dataset.v2OpenFlowFilter||"common";
    go("flow");
  },true);
  root.addEventListener("click", event => {
    const filter=event.target.closest("[data-v2-flow-filter]");
    if(!filter) return;
    event.stopImmediatePropagation();
    flowLaneFilter=filter.dataset.v2FlowFilter||"common";
    newAppRender();
  },true);
  root.addEventListener("click", event => {
    const nav=event.target.closest("[data-v2-cal-nav],[data-v2-cal-today]");
    if(!nav) return;
    event.stopImmediatePropagation();
    if(nav.hasAttribute("data-v2-cal-today")) calendarDate=ymd(now());
    else calendarDate=calendarMoveDate(calendarDate,calendarMode,+nav.dataset.v2CalNav);
    newAppRender();
  },true);
  root.addEventListener("click", event => {
    const lane=event.target.closest("[data-v2-cal-lane]");
    if(!lane) return;
    event.stopImmediatePropagation();
    calendarLane=lane.dataset.v2CalLane;
    newAppRender();
  },true);
  root.addEventListener("click", event => {
    const groupToggle=event.target.closest("[data-v2-home-group-toggle]");
    if(!groupToggle||page!=="home") return;
    event.stopImmediatePropagation();
    const groupId=groupToggle.dataset.v2HomeGroupToggle;
    if(homeOpenGroups.has(groupId)) homeOpenGroups.delete(groupId); else homeOpenGroups.add(groupId);
    newAppRender({preserveScroll:true});
  },true);
  root.addEventListener("click", event => {
    const opener=event.target.closest("[data-v2-shortcuts-open]");
    if(!opener) return;
    event.stopImmediatePropagation();
    const box=document.getElementById("v2ShortcutArea");
    if(!box) return;
    if(box.dataset.open==="1"){box.innerHTML="";delete box.dataset.open;return;}
    const catalog=Object.entries(HOME_SHORTCUT_CATALOG);
    const current=Array.isArray(S.homeShortcuts)&&S.homeShortcuts.length===3?S.homeShortcuts:["moneyAnalysis","healthAnalysis","calendar"];
    const select=n=>`<label>${n+1}<select data-v2-shortcut-select>${catalog.map(([id,[,label]])=>`<option value="${id}" ${current[n]===id?"selected":""}>${label}</option>`).join("")}</select></label>`;
    box.dataset.open="1";
    box.innerHTML=`<div class="an-shortcut-editor">${[0,1,2].map(select).join("")}<button type="button" data-v2-shortcuts-save>保存</button></div>`;
  },true);
  root.addEventListener("click", event => {
    const itemOpen=event.target.closest("[data-v2-work-item-edit]");
    if(itemOpen&&page==="workBoard"){
      event.stopImmediatePropagation();
      workItemEditingId=itemOpen.dataset.v2WorkItemEdit||"";
      newAppRender({preserveScroll:true});
      setTimeout(()=>root.querySelector("[data-v2-work-item-name]")?.focus(),0);
      return;
    }
    const itemCancel=event.target.closest("[data-v2-work-item-name-cancel]");
    if(itemCancel&&page==="workBoard"){
      event.stopImmediatePropagation();
      workItemEditingId="";
      newAppRender({preserveScroll:true});
      return;
    }
    const itemSaver=event.target.closest("[data-v2-work-item-name-save]");
    if(itemSaver&&page==="workBoard"){
      event.stopImmediatePropagation();
      const itemId=itemSaver.dataset.v2WorkItemNameSave||"",result=renameWorkItem(itemId,root.querySelector("[data-v2-work-item-name]")?.value||"");
      if(!result.ok){toast(result.reason==="empty"?"仕事内容名を入力してください":result.reason==="duplicate"?"同じプロジェクト内に同じ仕事内容があります":result.reason==="readonly"?"この端末は読み取り専用です":"仕事内容を確認できません");return;}
      workItemEditingId="";save();newAppRender({preserveScroll:true});successToast("仕事内容名を変更しました");
      return;
    }
    const open=event.target.closest("[data-v2-work-project-edit]");
    if(open&&page==="workBoard"){
      event.stopImmediatePropagation();
      workProjectEditingId=open.dataset.v2WorkProjectEdit||"";
      newAppRender({preserveScroll:true});
      setTimeout(()=>root.querySelector("[data-v2-work-project-name]")?.focus(),0);
      return;
    }
    const cancel=event.target.closest("[data-v2-work-project-name-cancel]");
    if(cancel&&page==="workBoard"){
      event.stopImmediatePropagation();
      workProjectEditingId="";
      newAppRender({preserveScroll:true});
      return;
    }
    const saver=event.target.closest("[data-v2-work-project-name-save]");
    if(!saver||page!=="workBoard") return;
    event.stopImmediatePropagation();
    const projectId=saver.dataset.v2WorkProjectNameSave||"",result=renameWorkProject(projectId,root.querySelector("[data-v2-work-project-name]")?.value||"");
    if(!result.ok){toast(result.reason==="empty"?"プロジェクト名を入力してください":result.reason==="duplicate"?"同じ名前のプロジェクトがあります":result.reason==="readonly"?"この端末は読み取り専用です":"プロジェクトを確認できません");return;}
    workProjectEditingId="";save();newAppRender({preserveScroll:true});successToast("プロジェクト名を変更しました");
  },true);
  root.addEventListener("click", event => {
    const saver=event.target.closest("[data-v2-shortcuts-save]");
    if(!saver) return;
    event.stopImmediatePropagation();
    if(!canWrite()) return;
    S.homeShortcuts=Array.from(document.querySelectorAll("[data-v2-shortcut-select]")).map(x=>x.value);
    save(); newAppRender(); toast("ショートカットを更新しました");
  },true);
  /*
    Sync settings are intentionally split.
    Device sync moves the complete application data between PC and iPhone.
    Health sync only receives inbox.txt from an iPhone Shortcut. Never share
    their Gist IDs: this prevents a shortcut write from touching app records.
  */
  function deviceSyncStatus(c){
    const ro=c.role==="ro";
    if(!(c.token&&c.gistId)) return ro ? "読み取り専用・未設定" : "未設定";
    if(c.lastSyncError) return "接続エラー（確認が必要）";
    if(c.lastSync) return ro ? "読み取り専用・接続確認済み" : "接続確認済み";
    return ro ? "読み取り専用・設定済み（通信未確認）" : "設定済み（通信未確認）";
  }
  function healthSyncStatus(c){
    if(!(c.token&&c.gistId)) return "未設定";
    if(c.lastError) return "接続エラー（確認が必要）";
    if(c.lastCheck) return c.lastReceipt?.sleep != null ? "受信済み・睡眠まで確認" : c.lastImport ? "受信済み・歩数を確認" : "接続確認済み";
    return "受信先を作成済み（通信未確認）";
  }
  function healthSyncGuide(c){
    if(!c.gistId) return `<p>「受信先を新規作成」を押すと、歩数・睡眠専用の非公開Gistを作ります。</p>`;
    const url=`https://api.github.com/gists/${esc2(c.gistId)}`;
    const last=c.lastReceipt ? `<p>最終受信：${esc2(c.lastReceipt.day)} ／ ${c.lastReceipt.steps ?? "—"}歩 ／ ${fmtSleep(c.lastReceipt.sleep)}</p>` : "";
    return `<p>ショートカットのURLを下記に変更してください。端末データ同期のGist IDは使いません。受信箱には最新の記録を残すため、再確認もできます。</p>${last}<label>ショートカットの送信先 URL</label><code class="an-sync-code">${url}</code><label>本文（JSON）</label><code class="an-sync-code">{"files":{"inbox.txt":{"content":"kenko|YYYY-MM-DD|歩数|就寝時刻|起床時刻"}}}</code>`;
  }
  function dailyReportApiPanel(){
    const c=dailyReportApiCfg(),ackError=c.lastAckError?`<p class="an-import-warning">${esc2(c.lastAckError)}</p>`:"";
    const pending=c.lastPending?"未確認の日報があります。下の日報取り込みで内容を確認してください。":"未確認の日報を待機中です。API受信後も自動保存はしません。";
    return `<p>Claude Codeが送信した日報だけを受信します。受信後は内容を確認してから取り込みます。家計・残高・体調・端末全体データは送信しません。</p><label>日報APIのURL</label><input id="v2DailyReportApiEndpoint" type="url" value="${esc2(c.endpoint||"")}" placeholder="https://example.com"><label>日報APIトークン</label><input id="v2DailyReportApiToken" type="password" autocomplete="off" placeholder="この端末だけに保存"><div class="an-sync-actions"><button class="an-small-action" data-v2-daily-report-api-save>接続設定を保存</button><button class="an-small-action" data-v2-daily-report-api-check ${c.endpoint&&c.token?"":"disabled"}>未確認の日報を確認</button></div><p data-v2-daily-report-api-status>${esc2(pending)}</p>${ackError}`;
  }
  function settingsV2(){
    const device=syncCfg(), health=healthSyncCfg(), dailyReportApi=dailyReportApiCfg(), benefit=Object.assign({start:"2026-01",units:18,nextApplicationStart:"2026-08-01",applicationMonths:"",applicationDays:""},S.benefit||{});
    if(!benefit.nextApplicationStart)benefit.nextApplicationStart="2026-08-01";
    const deviceRole=device.role==="ro" ? "ro" : device.gistId ? "rw" : "ro";
    const settingsDate=(id,value)=>`<span class="an-settings-date-control"><input id="${id}" type="date" value="${esc2(value||"")}" aria-label="次回申請開始日"><span data-v2-settings-date-value aria-hidden="true">${esc2(String(value||"").replaceAll("-","/"))}</span></span>`;
    const sections=[
      ["refresh","端末データ同期",deviceSyncStatus(device),`<p>PC・iPhone間で、予定・お金・記録などアプリ全体のデータを同期します。歩数・睡眠のショートカットは使いません。</p><p class="an-sync-note">iPhoneを正本にしてこのPCへ共有する場合は、読み取り専用で受信します。受信で置き換わるのはPC側だけで、iPhone側へ書き戻しません。</p><label for="v2DeviceSyncRole">このPCの役割</label><select id="v2DeviceSyncRole"><option value="ro" ${deviceRole==="ro"?"selected":""}>読み取り専用（iPhoneから受信する）</option><option value="rw" ${deviceRole==="rw"?"selected":""}>記録・送信もする</option></select><button class="an-small-action" data-v2-device-sync-role-save>役割を保存</button><label>GitHubトークン</label><input id="v2DeviceSyncToken" type="password" autocomplete="off" placeholder="この端末で入力"><label>端末データ用Gist ID</label><input id="v2DeviceSyncGist" value="${esc2(device.gistId||"")}" placeholder="iPhone側の既存IDを入力"><div class="an-sync-actions"><button class="an-small-action" data-v2-device-sync-start>端末同期を設定</button><button class="an-small-action" data-v2-device-sync-pull>今すぐ端末同期</button></div>`],
      ["heart","ヘルスケア自動取り込み",healthSyncStatus(health),`<p>iPhoneショートカットから歩数・睡眠だけを受信します。端末データ同期とは別の専用Gistです。</p><label>GitHubトークン</label><input id="v2HealthSyncToken" type="password" autocomplete="off" placeholder="この端末で入力"><label>ヘルスケア受信用Gist ID</label><input id="v2HealthSyncGist" value="${esc2(health.gistId||"")}" placeholder="空欄なら新規作成"><div class="an-sync-actions"><button class="an-small-action" data-v2-health-sync-create>受信先を新規作成</button><button class="an-small-action" data-v2-health-sync-check>受信を確認</button></div>${healthSyncGuide(health)}`],
      ["download","日報API受信",dailyReportApiStatus(dailyReportApi),dailyReportApiPanel()],
      ["list","毎日の習慣","今日の流れに表示する項目",`<div class="an-habits">${habitList().map(h=>`<span class="an-habit">${habitIcon(h)}<span>${esc2(h.label)}</span></span>`).join("")}</div><label>習慣の名前</label><input id="v2HabitLabel" placeholder="例：ストレッチ"><button class="an-small-action" data-v2-habit-add>習慣を追加</button>`],
      ["wallet","お金の初期設定","カード上限・方法・カテゴリー",`<label>カードの上限</label><input id="v2CardCap" type="text" inputmode="numeric" value="${(+S.cardCap||0).toLocaleString("ja-JP")}"><button class="an-small-action" data-v2-card-cap>上限を保存</button>`],
      ["coin","傷病手当の申請情報","次回申請・今回の申請分・受給期間",`<label>次回申請開始日</label>${settingsDate("v2BenefitNextStart",benefit.nextApplicationStart)}<label>今回申請している分（月）</label><input id="v2BenefitMonths" type="number" min="0" inputmode="numeric" value="${esc2(benefit.applicationMonths??"")}"><label>今回申請している分（日）</label><input id="v2BenefitDays" type="number" min="0" inputmode="numeric" value="${esc2(benefit.applicationDays??"")}"><p class="an-settings-help">受給予定期間は${esc2(benefit.start)}から${esc2(benefit.units)}か月です。</p><button class="an-small-action" data-v2-benefit-save>傷病手当の申請情報を保存</button>`],
      ["calendar","カレンダー連携","予定の読み込みと表示",`<p>予定は「一日の流れ」とカレンダーから確認できます。</p>`],
      ["download","日報ファイルを取り込む","読み取り専用・確認してから保存",workLogImportPanel()],
      ["list","表示","完了メッセージ",`<p>「変更しました」など、操作が完了したときのメッセージを切り替えます。入力不足などの注意は常に表示します。</p><button class="an-small-action" data-v2-success-notices>${S.ui?.successNotices===false?"完了メッセージを表示する":"完了メッセージを表示しない"}</button>`],
      ["download","バックアップ","この端末の記録を書き出す",`<button class="an-small-action" data-v2-export>データを書き出す</button>`]
    ];
    return analogPage("an-settings","settings","SETTINGS","暮らしの設定",`<div class="an-settings v2-settings an-sync-settings">${sections.map(([i,t,s,b])=>`<details><summary><i>${icon(i)}</i><span><strong>${t}</strong><small data-v2-sync-status="${i}">${s}</small></span><b>›</b></summary><div class="an-settings-body">${b}</div></details>`).join("")}</div>`,{settings:false});
  }
  /* ブランド表記はアプリ名に合わせて、設定画面も「くらし」で統一する。 */
  const settingsV2WithBrand=settingsV2;
  settingsV2=function(){return settingsV2WithBrand().replaceAll("暮らしの設定","くらしの設定");};
  root.addEventListener("click",async event=>{
    const cancel=event.target.closest("[data-v2-work-log-import-cancel]");
    if(cancel){ event.stopImmediatePropagation(); workLogImportDraft=null; newAppRender(); return; }
    const confirm=event.target.closest("[data-v2-work-log-import-confirm]");
    if(!confirm){ return; }
    event.stopImmediatePropagation();
    if(!canWrite()||confirm.disabled||!workLogImportDraft?.data?.ok) return;
    const data=workLogImportDraft.data,apiId=workLogImportDraft.apiId||"";
    const existing=S.workLogs?.[data.date];
    const overwrite=confirm.hasAttribute("data-v2-work-log-import-overwrite");
    if(existing&&Object.keys(existing).length&&!overwrite) return toast("既存の日報を上書きする場合は専用ボタンを使ってください");
    const reviews={},descriptions={},projectNames={},projectIds=[];
    const aliases=workLogProjectAliases();
    for(const [index,item] of data.projects.entries()){
      let project=item.project;
      if(!project){
        const resolution=workLogImportDraft.resolutions?.[index]||"";
        if(resolution==="new") project=ensureWorkProject(item.projectName);
        else if(resolution.startsWith("existing:")) project=workProjectOf(resolution.slice("existing:".length));
        if(!project)return toast("未解決のプロジェクトがあります");
        const name=String(item.projectName||"").trim();
        if(name)aliases[name]=project.id;
      }
      const id=project.id; projectIds.push(id); projectNames[id]=String(project.name||item.projectName||"").trim(); reviews[id]=Object.assign({},reviews[id]||{},item.fields);
      if(item.fields.description) descriptions[id]=item.fields.description;
    }
    S.workLogProjectAliases=aliases;
    S.workLogs=S.workLogs||{};
    S.workLogs[data.date]={start:data.start,end:data.end,breakMinutes:Math.max(0,+data.breakMinutes||0),actualWorkMinutes:data.actualWorkMinutes===""?null:Number(data.actualWorkMinutes),projectIds,projectNames,workDescriptions:descriptions,projectReviews:reviews,importedFrom:workLogImportDraft.name||"日報ファイル",importedAt:new Date().toISOString()};
    const importedRecord=JSON.parse(JSON.stringify(S.workLogs[data.date]));
    saveNow();
    // 日報専用の対象日マージが失敗したとき、古い端末全体を遅延送信して
    // 同期先を上書きしない。専用処理の成否だけを完了条件にする。
    try{ clearTimeout(syncTimer); syncTimer=null; }catch(e){}
    // 取り込み前の日付下書きが保存値を隠さないよう、確定した日だけ破棄する。
    clearWorkLogDraft(data.date);
    workLogImportDraft=null; newAppRender();
    const syncCfgNow=typeof syncCfg==="function"?syncCfg():{};
    if(syncCfgNow.token&&syncCfgNow.gistId&&syncCfgNow.role!=="ro"&&typeof pushImportedWorkLog==="function"){
      try{ localStorage.setItem("mainichi.pending-work-log-sync",JSON.stringify({day:data.date,record:importedRecord,createdAt:new Date().toISOString()})); }catch(e){}
      toast("日報を同期先へ反映中…");
      const syncResult=await pushImportedWorkLog(data.date,importedRecord);
      if(syncResult.ok) successToast(overwrite?"日報を上書きし、同期先へ反映しました":"日報を取り込み、同期先へ反映しました");
      else toast("日報はこの端末に保存しましたが、同期先へ反映できませんでした");
    }else if(syncCfgNow.token&&syncCfgNow.gistId&&syncCfgNow.role==="ro"){
      toast("読み取り専用のため、同期先へ反映できませんでした");
    }else{
      successToast(overwrite?"日報を上書きしました（端末内保存）":"日報を取り込みました（端末内保存）");
    }
    if(apiId)void acknowledgeDailyReportApi(apiId);
  },true);
  root.addEventListener("click",event=>{
    const toggle=event.target.closest("[data-v2-success-notices]");
    if(!toggle) return;
    event.stopImmediatePropagation();
    S.ui=S.ui||{};
    S.ui.successNotices=S.ui.successNotices===false;
    save();
    newAppRender();
  },true);
  root.addEventListener("click",async event=>{
    const button=event.target.closest("[data-v2-device-sync-role-save],[data-v2-device-sync-start],[data-v2-device-sync-pull],[data-v2-health-sync-create],[data-v2-health-sync-check],[data-v2-daily-report-api-save],[data-v2-daily-report-api-check]");
    if(!button) return;
    event.stopImmediatePropagation();
    if(button.hasAttribute("data-v2-daily-report-api-save")){
      const current=dailyReportApiCfg(),endpoint=document.getElementById("v2DailyReportApiEndpoint")?.value.trim()||"",token=document.getElementById("v2DailyReportApiToken")?.value.trim()||current.token||"";
      if(!endpoint||!token)return toast("日報APIのURLとトークンを入力してください");
      setDailyReportApiCfg(Object.assign({},current,{endpoint,token}));startDailyReportApiLoop();newAppRender();successToast("日報APIの接続設定を保存しました");
      return;
    }
    if(button.hasAttribute("data-v2-daily-report-api-check")){
      await pullDailyReportApi(false);newAppRender();keepWorkLogImportDetailsOpen(Boolean(workLogImportDraft));
      return;
    }
    if(button.hasAttribute("data-v2-device-sync-role-save")){
      const role=document.getElementById("v2DeviceSyncRole")?.value||"ro";
      const current=syncCfg();
      if(role==="rw" && current.role!=="rw" && !confirm("このPCから同期先へ記録を送信できるようにします。\n\niPhoneを正本として見るだけにする場合はキャンセルしてください。")) return;
      current.role=role; setSyncCfg(current);
      if(typeof rolePaint==="function") rolePaint();
      const status=root.querySelector('[data-v2-sync-status="refresh"]');
      if(status) status.textContent=deviceSyncStatus(current);
      toast(role==="ro" ? "このPCを読み取り専用にしました" : "このPCを記録・送信可能にしました");
      return;
    }
    if(button.hasAttribute("data-v2-device-sync-start")){
      const token=document.getElementById("v2DeviceSyncToken")?.value.trim(), gistId=document.getElementById("v2DeviceSyncGist")?.value.trim();
      if(!token) return toast("端末データ同期用のGitHubトークンを入力してください");
      const role=document.getElementById("v2DeviceSyncRole")?.value||"ro";
      if(role==="ro" && !gistId) return toast("読み取り専用で参加するには、iPhone側の既存Gist IDが必要です");
      setSyncCfg(Object.assign({},syncCfg(),{role}));
      const oldToken=document.getElementById("syncToken"),oldGist=document.getElementById("syncGist");
      if(oldToken&&oldGist){oldToken.value=token;oldGist.value=gistId;document.getElementById("syncStart")?.click();}
      return;
    }
    if(button.hasAttribute("data-v2-device-sync-pull")){ await pullRemote(false); newAppRender(); return; }
    const token=document.getElementById("v2HealthSyncToken")?.value.trim() || healthSyncCfg().token;
    let gistId=document.getElementById("v2HealthSyncGist")?.value.trim() || healthSyncCfg().gistId;
    if(!token) return toast("ヘルスケア受信用のGitHubトークンを入力してください");
    try{
      if(button.hasAttribute("data-v2-health-sync-create") && !gistId){
        const r=await fetch("https://api.github.com/gists",{method:"POST",headers:{"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json","Content-Type":"application/json"},body:JSON.stringify({description:"kurashi no shirushi health inbox (private)",public:false,files:{"inbox.txt":{content:"-"}}})});
        if(!r.ok) throw new Error(`GitHub ${r.status}`);
        gistId=(await r.json()).id;
      }
      if(!gistId) return toast("受信用Gist IDを入力するか、新規作成してください");
      setHealthSyncCfg({token,gistId});
      const c=healthSyncCfg();
      const g=await healthGistFetch(`/gists/${gistId}`);
      if(!g.files?.[HEALTH_INBOX_FILE]) await healthGistFetch(`/gists/${gistId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({files:{[HEALTH_INBOX_FILE]:{content:"-"}}})});
      c.lastCheck=new Date().toISOString(); delete c.lastError; setHealthSyncCfg(c);
      startHealthSyncLoop();
      if(button.hasAttribute("data-v2-health-sync-check")) await pullHealthInbox(false);
      toast("ヘルスケア専用の受信先を確認しました");
      newAppRender();
    }catch(e){
      const c=healthSyncCfg(); c.lastError=e.message||"受信先を確認できませんでした"; setHealthSyncCfg(c);
      toast(`ヘルスケア受信を設定できませんでした: ${c.lastError}`); newAppRender();
    }
  },true);
  /* v0.29: direct-manipulation freeboard and a single comparable health graph.
     These use their own data attributes so the retired board interactions cannot
     steal pointer events from the newer editor. */
  let freeBoardUI={tool:"select",selected:null,selectedIds:[],editingId:null,styleId:null,deleteReady:null,contextMenu:null,groupMenu:false,marquee:null,fullscreen:false,view:{scale:1,x:0,y:0},pointers:new Map(),gesture:null,lastTap:{id:"",at:0}};
  const fbCards=()=>boardState().cards||[];
  const fbCard=id=>fbCards().find(x=>x.id===id);
  // The selected object is kept for compatibility, while selectedIds is the
  // authoritative selection set used by marquee and group operations.
  const fbSelectedIds=()=>Array.isArray(freeBoardUI.selectedIds)&&freeBoardUI.selectedIds.length?freeBoardUI.selectedIds:(freeBoardUI.selected?[freeBoardUI.selected]:[]);
  function fbSelect(ids=[],primary=ids[ids.length-1]||null){
    freeBoardUI.selectedIds=[...new Set(ids)].filter(id=>!!fbCard(id));
    freeBoardUI.selected=primary&&freeBoardUI.selectedIds.includes(primary)?primary:(freeBoardUI.selectedIds.at(-1)||null);
    freeBoardUI.deleteReady=null;freeBoardUI.contextMenu=null;freeBoardUI.groupMenu=false;
  }
  function fbBounds(ids=fbSelectedIds()){
    const cards=ids.map(fbCard).filter(Boolean);if(!cards.length)return null;
    const left=Math.min(...cards.map(c=>+c.x||0)),top=Math.min(...cards.map(c=>+c.y||0));
    const right=Math.max(...cards.map(c=>(+c.x||0)+(+c.w||0))),bottom=Math.max(...cards.map(c=>(+c.y||0)+(+c.h||0)));
    return {left,top,right,bottom,w:right-left,h:bottom-top};
  }
  const fbInside=(p,b)=>!!b&&p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom;
  function fbDelete(ids){
    const wanted=new Set(ids);if(!wanted.size)return false;
    const board=boardState();board.cards=(board.cards||[]).filter(card=>!wanted.has(card.id));
    fbSelect([]);freeBoardUI.editingId=null;freeBoardUI.styleId=null;return true;
  }
  function fbDuplicate(ids=fbSelectedIds()){
    const board=boardState(),copies=ids.map(fbCard).filter(Boolean).map(card=>Object.assign({},card,{id:uid(),x:Math.min(92-(+card.w||0),(+card.x||0)+3),y:Math.min(92-(+card.h||0),(+card.y||0)+3),z:Math.max(1,+card.z||1)+1,points:Array.isArray(card.points)?card.points.map(p=>[...p]):card.points}));
    if(!copies.length)return false;board.cards.push(...copies);fbSelect(copies.map(c=>c.id),copies.at(-1).id);return true;
  }
  const fbType=card=>({text:"text",memo:"memo",shape:"shape",image:"image",stroke:"stroke"}[card.type]||card.type||"text");
  // These sets are the single source of truth for freeboard affordances.
  // Keeping them here prevents text/memo controls from drifting away from
  // shape/image controls as the board gains new interaction methods.
  const FB_TEXT_TYPES=new Set(["text","memo"]);
  const FB_RESIZABLE_TYPES=new Set(["shape","image","text","memo"]);
  const fbIsTextCard=card=>FB_TEXT_TYPES.has(fbType(card));
  const fbEsc=s=>esc2(String(s||"")).replace(/\n/g,"<br>");
  function fbFit(card,text){
    // A user-resized text frame owns its dimensions.  Editing the text must
    // never silently replace that frame with an automatically sized one.
    if(card.manualSize)return;
    const lines=String(text||"").split(/\n/);const longest=Math.max(4,...lines.map(x=>x.length));
    // The board works in percentages. Fit from actual type size so all text
    // stays visible without a manual resize handle.
    card.w=Math.max(22,Math.min(78,Math.ceil(longest*(+card.size||18)*.62/3.6)+10));
    card.h=Math.max(13,Math.min(70,Math.ceil(lines.length*Math.max(9,(+card.size||18)*1.45)/4.2)+10));
  }
  function fbNode(card){
    const type=fbType(card),selected=fbSelectedIds().includes(card.id),editing=freeBoardUI.editingId===card.id&&fbIsTextCard(card);
    const cls=`v2fb-node v2fb-${type}${selected?" is-selected":""}`;
    const style=`--x:${+card.x||8}%;--y:${+card.y||8}%;--w:${+card.w||32}%;--h:${+card.h||16}%;--size:${+card.size||18}px;--weight:${+card.weight||600};--z:${Math.max(1,+card.z||1)};`;
    // Text frames use the same live bounding-box contract as shapes.  The
    // type itself scales uniformly; it is never stretched independently.
    const handles=selected&&FB_RESIZABLE_TYPES.has(type)?["n","e","s","w","nw","ne","sw","se"].map(handle=>`<i class="v2fb-handle ${handle}" data-v2-freeboard-resize="${handle}" aria-hidden="true"></i>`).join(""):"";
    // Deletion is deliberately separate from the north-east resize handle.
    // Touch: a stationary long press reveals the ×. Desktop: a right click
    // reveals a small text menu, so no control competes with the handle.
    const remove=freeBoardUI.deleteReady===card.id?`<button type="button" class="v2fb-remove" data-v2-freeboard-delete="${esc2(card.id)}" aria-label="この要素を削除">×</button>`:"";
    const context=freeBoardUI.contextMenu===card.id?`<menu class="v2fb-context-menu"><button type="button" data-v2-freeboard-delete="${esc2(card.id)}">削除</button></menu>`:"";
    // A single SVG ring carries the selected state. It stays rounded at every
    // scale and is deliberately separate from the object's own paper border.
 // Selection is drawn from the element's *current* box.  The ring and every
 // resize handle therefore share the same edge/corner coordinates.
 const selection=selected?`<svg class="v2fb-selection-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="100" height="100" rx="10" ry="10"/></svg>`:"";
    if(type==="stroke") return `<div class="${cls}" data-v2-freeboard-node="${esc2(card.id)}" style="${style}" aria-label="手書き線"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${(card.points||[]).map(p=>`${p[0]},${p[1]}`).join(" ")}"></polyline></svg>${selection}${remove}${context}</div>`;
    if(type==="image") return `<figure class="${cls}" data-v2-freeboard-node="${esc2(card.id)}" style="${style}"><img src="${esc2(card.src||"")}" alt="${esc2(card.name||"追加した画像")}">${selection}${remove}${context}${handles}</figure>`;
    if(type==="shape") return `<div class="${cls}" data-v2-freeboard-node="${esc2(card.id)}" style="${style}" aria-label="図形">${selection}${remove}${context}${handles}</div>`;
    const tag=type==="memo"?"aside":"article";
    const content=editing?`<textarea class="v2fb-inline-editor" data-v2-freeboard-inline-edit="${esc2(card.id)}" aria-label="テキストを編集">${esc2(card.text||"")}</textarea>`:`<div class="v2fb-text-content">${fbEsc(card.text||"テキスト")}</div>`;
    const styleButton=selected?`<button type="button" class="v2fb-style" data-v2-freeboard-style="${esc2(card.id)}" aria-label="文字の書式">Aa</button>`:"";
    return `<${tag} class="${cls} v2fb-face-${esc2(card.face||"sans")}" data-v2-freeboard-node="${esc2(card.id)}" style="${style}">${content}${selection}${styleButton}${remove}${context}${handles}</${tag}>`;
  }
  function fbTools(){
    const toolSet=[["select","cursor","選択"],["text","kana","テキスト"],["shape","shape","図形"],["memo","memo","メモ"],["pen","pen","手書き"]];
    return `<nav class="v2fb-tools" aria-label="フリーボードのツール">${toolSet.map(([id,mark,label])=>`<button type="button" class="${freeBoardUI.tool===id?"is-active":""}" data-v2-freeboard-tool="${id}">${mark==="kana"?`<i class="v2fb-tool-kana" aria-hidden="true">あ</i>`:icon(mark)}<span>${label}</span></button>`).join("")}<label class="${freeBoardUI.tool==="image"?"is-active":""}">${icon("image")}<span>画像</span><input data-v2-freeboard-upload type="file" accept="image/*"></label><button type="button" class="v2fb-clear" data-v2-freeboard-clear>${icon("close")}<span>すべて削除（オールクリア）</span></button></nav>`;
  }
  function fbEditor(){
    const card=fbCard(freeBoardUI.styleId); if(!card || !fbIsTextCard(card)) return "";
    return `<div class="v2fb-modal" data-v2-freeboard-modal><section role="dialog" aria-modal="true" aria-label="文字の書式"><header><strong>文字の書式</strong><button type="button" data-v2-freeboard-modal-close>×</button></header><p class="v2fb-style-note">文字を直接編集するには、ボード上の文字をダブルタップします。</p><div class="v2fb-editor-fields"><label>書体<select data-v2-freeboard-face><option value="sans" ${card.face==="sans"?"selected":""}>Noto Sans JP</option><option value="mincho" ${card.face==="mincho"?"selected":""}>Noto Serif JP</option><option value="udgothic" ${card.face==="udgothic"?"selected":""}>BIZ UDPゴシック</option><option value="udmincho" ${card.face==="udmincho"?"selected":""}>BIZ UDP明朝</option></select></label><label>太さ<select data-v2-freeboard-weight><option value="400" ${+card.weight===400?"selected":""}>細い</option><option value="600" ${+card.weight===600?"selected":""}>標準</option><option value="800" ${+card.weight===800?"selected":""}>太い</option></select></label><label>文字サイズ<input data-v2-freeboard-size type="number" min="12" max="46" value="${+card.size||18}"></label></div><footer><button type="button" data-v2-freeboard-editor-save>適用</button></footer></section></div>`;
  }
  function fbMarquee(){
    const m=freeBoardUI.marquee;if(!m)return "";
    const left=Math.min(m.start.x,m.current.x),top=Math.min(m.start.y,m.current.y),w=Math.abs(m.current.x-m.start.x),h=Math.abs(m.current.y-m.start.y);
    return `<i class="v2fb-marquee" style="--x:${left}%;--y:${top}%;--w:${w}%;--h:${h}%" aria-hidden="true"></i>`;
  }
  function fbGroupSelection(){
    const ids=fbSelectedIds();if(ids.length<2)return "";const b=fbBounds(ids);if(!b)return "";
    const actions=freeBoardUI.groupMenu?`<menu class="v2fb-group-menu"><button type="button" data-v2-freeboard-duplicate>複製</button><button type="button" data-v2-freeboard-delete-group>削除</button></menu>`:"";
    return `<div class="v2fb-group-selection" data-v2-freeboard-group-box style="--x:${b.left}%;--y:${b.top}%;--w:${b.w}%;--h:${b.h}%" role="button" tabindex="0" aria-label="${ids.length}個を選択中">${actions}</div>`;
  }
  function fbCanvas(fullscreen=false){
    const nodeMarkup=fbCards().map(fbNode).join(""),v=freeBoardUI.view;
    return `<section class="v2fb-viewport ${fullscreen?"is-fullscreen":""}" data-v2-freeboard-viewport aria-label="自由に配置できるフリーボード"><div class="v2fb-stage" data-v2-freeboard-stage style="--fb-scale:${v.scale};--fb-x:${v.x}px;--fb-y:${v.y}px">${nodeMarkup||`<p class="v2fb-empty">ツールを選んで、画面に置いてください。</p>`}${fbGroupSelection()}${fbMarquee()}</div></section>`;
  }
  ideaNote=function(){
    if(freeBoardUI.fullscreen) return `<section class="v2fb-fullscreen">${fbTools()}${fbCanvas(true)}${fbEditor()}<button type="button" class="v2fb-exit" data-v2-freeboard-fullscreen>${icon("back")}<span>戻る</span></button></section>`;
    return analogPage("an-idea-note","edit","IDEA BOARD","アイデアと目標",`<p class="an-board-guide">文字・図形・メモ・手書き・画像を、好きな位置に置ける自由なボードです。</p>${fbTools()}<div class="v2fb-inline-head"><strong>フリーボード</strong><button type="button" data-v2-freeboard-fullscreen>${icon("fullscreen")}<span>全画面表示</span></button></div>${fbCanvas()}${fbEditor()}`);
  };
  function fbPoint(viewport,event){const r=viewport.getBoundingClientRect(),v=freeBoardUI.view;return {x:Math.max(0,Math.min(100,((event.clientX-r.left-v.x)/r.width/v.scale)*100)),y:Math.max(0,Math.min(100,((event.clientY-r.top-v.y)/r.height/v.scale)*100))};}
  function fbAdd(type,p){const board=boardState(),top=Math.max(0,...(board.cards||[]).map(c=>+c.z||0)),base={id:uid(),type,x:p.x,y:p.y,w:32,h:16,size:18,weight:600,face:"sans",z:top+1};if(type==="memo")Object.assign(base,{w:30,h:19,text:"メモ"});if(type==="text")Object.assign(base,{w:30,h:13,text:"テキスト"});if(type==="shape")Object.assign(base,{w:24,h:14});board.cards.push(base);fbSelect([base.id],base.id);freeBoardUI.tool="select";save();return base;}
  // Direct manipulation must never reset the page position. Rebuilding root
  // replaces the board DOM and Safari restores the document to its top, so
  // freeboard-only refreshes capture and restore the viewport twice (the
  // second frame covers scroll anchoring that runs after the first paint).
  function fbRestoreScroll(position){
    if(!position)return;
    const restore=()=>window.scrollTo(position.left,position.top);
    restore();
    requestAnimationFrame(()=>{restore();requestAnimationFrame(restore);});
  }
  function fbRefreshKeepingScroll(position){
    const before=position||{left:window.scrollX,top:window.scrollY};
    newAppRender();
    fbRestoreScroll(before);
  }
  function fbStore(){save();fbRefreshKeepingScroll();}
  root.addEventListener("click",event=>{
    const tool=event.target.closest("[data-v2-freeboard-tool]"),full=event.target.closest("[data-v2-freeboard-fullscreen]"),remove=event.target.closest("[data-v2-freeboard-delete]"),close=event.target.closest("[data-v2-freeboard-modal-close]"),keep=event.target.closest("[data-v2-freeboard-editor-save]"),style=event.target.closest("[data-v2-freeboard-style]"),clear=event.target.closest("[data-v2-freeboard-clear]"),duplicate=event.target.closest("[data-v2-freeboard-duplicate]"),groupDelete=event.target.closest("[data-v2-freeboard-delete-group]"),groupBox=event.target.closest("[data-v2-freeboard-group-box]");
    if(!tool&&!full&&!remove&&!close&&!keep&&!style&&!clear&&!duplicate&&!groupDelete&&!groupBox) return;
    event.stopImmediatePropagation();
    if(tool){freeBoardUI.tool=tool.dataset.v2FreeboardTool;fbSelect(fbSelectedIds());newAppRender();return;}
    if(full){freeBoardUI.fullscreen=!freeBoardUI.fullscreen;fbSelect([]);freeBoardUI.editingId=null;freeBoardUI.styleId=null;newAppRender();return;}
    if(clear){
      if(!canWrite()){toast("この端末では書き込みできません");return;}
      if(!fbCards().length||!window.confirm("フリーボードの内容をすべて削除しますか？"))return;
      boardState().cards=[];fbSelect([]);fbStore();toast("すべて削除しました");return;
    }
    if(duplicate){
      if(!canWrite()){toast("この端末では書き込みできません");return;}
      if(!fbDuplicate())return;fbStore();toast("選択した要素を複製しました");return;
    }
    if(groupDelete){
      if(!canWrite()){toast("この端末では書き込みできません");return;}
      if(!fbDelete(fbSelectedIds()))return;fbStore();toast("選択した要素を削除しました");return;
    }
    if(remove){
      if(!canWrite()){toast("この端末では書き込みできません");return;}
      if(!fbDelete([remove.dataset.v2FreeboardDelete]))return;fbStore();toast("要素を削除しました");return;
    }
    // Group actions are opened from pointerup so the same tap cannot
    // immediately close the menu again through this delegated click.
    if(groupBox)return;
    if(style){freeBoardUI.styleId=style.dataset.v2FreeboardStyle;freeBoardUI.editingId=null;newAppRender();return;}
    if(close){freeBoardUI.styleId=null;newAppRender();return;}
    if(keep){if(!canWrite())return;const card=fbCard(freeBoardUI.styleId);if(!card)return;card.face=document.querySelector("[data-v2-freeboard-face]")?.value||"sans";card.weight=+document.querySelector("[data-v2-freeboard-weight]")?.value||600;card.size=Math.max(12,Math.min(46,+document.querySelector("[data-v2-freeboard-size]")?.value||18));fbFit(card,card.text);freeBoardUI.styleId=null;fbStore();toast("文字の書式を変更しました");}
  },true);
  root.addEventListener("input",event=>{const editor=event.target.closest("[data-v2-freeboard-inline-edit]");if(!editor||!canWrite())return;const card=fbCard(editor.dataset.v2FreeboardInlineEdit);if(!card)return;card.text=editor.value;fbFit(card,card.text);const node=editor.closest("[data-v2-freeboard-node]");if(node){node.style.setProperty("--w",card.w+"%");node.style.setProperty("--h",card.h+"%");}save();},true);
  root.addEventListener("focusout",event=>{const editor=event.target.closest("[data-v2-freeboard-inline-edit]");if(!editor)return;const card=fbCard(editor.dataset.v2FreeboardInlineEdit);if(card&&canWrite()){card.text=editor.value;fbFit(card,card.text);save();}freeBoardUI.editingId=null;newAppRender();},true);
  root.addEventListener("change",async event=>{const file=event.target.matches("[data-v2-freeboard-upload]")?event.target.files?.[0]:null;if(!file||!canWrite())return;try{const src=await boardImageData(file),p={x:15,y:15},card={id:uid(),type:"image",src,name:file.name,x:p.x,y:p.y,w:40,h:27,z:Math.max(0,...fbCards().map(c=>+c.z||0))+1};boardState().cards.push(card);fbSelect([card.id],card.id);freeBoardUI.tool="select";fbStore();}catch(e){toast("画像を追加できませんでした");}},true);
  // Desktop deletion is a context action so it never overlaps the north-east
  // resize handle. Touch uses a stationary long press to reveal the same delete control.
  root.addEventListener("contextmenu",event=>{
    const node=event.target.closest("[data-v2-freeboard-node]");
    if(!node||!canWrite())return;
    event.preventDefault();event.stopImmediatePropagation();
    fbSelect([node.dataset.v2FreeboardNode],node.dataset.v2FreeboardNode);freeBoardUI.editingId=null;
    freeBoardUI.deleteReady=null;freeBoardUI.contextMenu=node.dataset.v2FreeboardNode;
    newAppRender();
  },true);
  root.addEventListener("pointerdown",event=>{
    const viewport=event.target.closest("[data-v2-freeboard-viewport]");if(!viewport||event.button>0)return;
    // Buttons (especially delete / copy / formatting) must receive their own
    // click.  Starting a board gesture from them previously swallowed actions.
    if(event.target.closest("button,input,textarea,select,[data-v2-freeboard-inline-edit]"))return;
    // A freeboard gesture owns the viewport until it finishes. iOS Safari can
    // otherwise apply its own page scroll after pointerup, even though the
    // object itself is manipulated inside the board.
    freeBoardUI.gestureScroll={left:window.scrollX,top:window.scrollY};
    const node=event.target.closest("[data-v2-freeboard-node]"),groupBox=event.target.closest("[data-v2-freeboard-group-box]"),handle=event.target.closest("[data-v2-freeboard-resize]"),p=fbPoint(viewport,event);freeBoardUI.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(freeBoardUI.pointers.size===2){const a=[...freeBoardUI.pointers.values()];freeBoardUI.gesture={kind:"pinch",distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),scale:freeBoardUI.view.scale};event.preventDefault();return;}
    if(groupBox){
      const ids=fbSelectedIds(),bases=ids.map(id=>{const c=fbCard(id);return {id,x:+c.x||0,y:+c.y||0,w:+c.w||20,h:+c.h||14};});
      const groupGesture={kind:"group-hold",id:ids.at(-1),ids,bases,pointerId:event.pointerId,pointerType:event.pointerType,viewport,startX:event.clientX,startY:event.clientY,baseX:0,baseY:0,baseW:0,baseH:0,movable:event.pointerType==="mouse",moved:false};
      // Desktop groups drag immediately. On touch, a stationary long press
      // enables movement; a short tap instead opens the group action menu.
      if(event.pointerType!=="mouse")groupGesture.timer=setTimeout(()=>{if(freeBoardUI.gesture===groupGesture){groupGesture.movable=true;ids.forEach(id=>viewport.querySelector(`[data-v2-freeboard-node="${CSS.escape(id)}"]`)?.classList.add("is-moving"));}},360);
      freeBoardUI.gesture=groupGesture;
      viewport.setPointerCapture?.(event.pointerId);event.preventDefault();return;
    }
    if(freeBoardUI.tool==="pen"&&!node&&canWrite()){
      const card={id:uid(),type:"stroke",x:0,y:0,w:100,h:100,points:[[p.x,p.y]]};boardState().cards.push(card);fbSelect([card.id],card.id);
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),poly=document.createElementNS("http://www.w3.org/2000/svg","polyline");
      svg.className.baseVal="v2fb-node v2fb-stroke is-selected";svg.dataset.v2FreeboardNode=card.id;svg.setAttribute("viewBox","0 0 100 100");svg.setAttribute("preserveAspectRatio","none");svg.style.cssText="--x:0%;--y:0%;--w:100%;--h:100%;";poly.setAttribute("points",`${p.x},${p.y}`);svg.append(poly);viewport.querySelector("[data-v2-freeboard-stage]")?.append(svg);
      freeBoardUI.gesture={kind:"draw",id:card.id,pointerId:event.pointerId,viewport};viewport.setPointerCapture?.(event.pointerId);event.preventDefault();return;
    }
    if(freeBoardUI.tool!=="select"&&!node&&canWrite()){
      const card=fbAdd(freeBoardUI.tool,p);
      // テキスト／メモは置いた直後から本文を入力する。選択だけで止めない。
      fbSelect([card.id],card.id);freeBoardUI.styleId=null;
      freeBoardUI.editingId=["text","memo"].includes(fbType(card))?card.id:null;
      freeBoardUI.tool="select";newAppRender();
      if(freeBoardUI.editingId)setTimeout(()=>root.querySelector(`[data-v2-freeboard-inline-edit="${CSS.escape(card.id)}"]`)?.focus(),0);
      return;
    }
    if(!node){
      const groupBounds=fbBounds();
      if(fbSelectedIds().length>1&&fbInside(p,groupBounds)){freeBoardUI.groupMenu=true;newAppRender();return;}
      freeBoardUI.editingId=null;freeBoardUI.deleteReady=null;freeBoardUI.contextMenu=null;freeBoardUI.groupMenu=false;
      freeBoardUI.gesture={kind:event.pointerType==="mouse"?"marquee":"marquee-hold",pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,start:p,current:p,viewport,clicked:true};
      if(freeBoardUI.gesture.kind==="marquee-hold")freeBoardUI.gesture.timer=setTimeout(()=>{if(freeBoardUI.gesture?.pointerId===event.pointerId){freeBoardUI.gesture.kind="marquee";freeBoardUI.marquee={start:p,current:p};}},360);
      else freeBoardUI.marquee={start:p,current:p};
      viewport.setPointerCapture?.(event.pointerId);event.preventDefault();return;
    }
    const card=fbCard(node.dataset.v2FreeboardNode);if(!card)return;
    // Safari の dblclick に依存せず、二回目のタップも直接編集として扱う。
    const nowAt=Date.now(),double=event.detail>=2||(freeBoardUI.lastTap.id===card.id&&nowAt-freeBoardUI.lastTap.at<820);freeBoardUI.lastTap={id:card.id,at:nowAt};
    if(event.shiftKey){
      fbSelect([...new Set([...fbSelectedIds(),card.id])],card.id);
    }else fbSelect([card.id],card.id);
    if(double&&["text","memo"].includes(fbType(card))){freeBoardUI.editingId=card.id;freeBoardUI.styleId=null;newAppRender();setTimeout(()=>root.querySelector(`[data-v2-freeboard-inline-edit="${CSS.escape(card.id)}"]`)?.focus(),0);event.preventDefault();return;}
    freeBoardUI.deleteReady=null;freeBoardUI.contextMenu=null;
    const kind=handle?"resize":"hold",movingIds=handle?[card.id]:fbSelectedIds(),bases=movingIds.map(id=>{const c=fbCard(id);return {id,x:+c.x||0,y:+c.y||0,w:+c.w||20,h:+c.h||14};});
    // A selected object is always brought to the front before it starts moving.
    // It therefore never appears to be caught behind another board object.
    if(kind==="hold"){
      const top=Math.max(0,...fbCards().map(c=>+c.z||0));
      movingIds.forEach((id,index)=>{const moving=fbCard(id);if(!moving)return;moving.z=top+index+1;viewport.querySelector(`[data-v2-freeboard-node="${CSS.escape(id)}"]`)?.style.setProperty("--z",moving.z);});
    }
    freeBoardUI.gesture={kind,id:card.id,ids:movingIds,bases,handle:handle?.dataset.v2FreeboardResize,pointerId:event.pointerId,pointerType:event.pointerType,viewport,startX:event.clientX,startY:event.clientY,baseX:+card.x||0,baseY:+card.y||0,baseW:+card.w||20,baseH:+card.h||14,baseSize:+card.size||18,movable:false,moved:false};
    if(kind==="hold")freeBoardUI.gesture.timer=setTimeout(()=>{if(freeBoardUI.gesture?.id===card.id){freeBoardUI.gesture.movable=true;freeBoardUI.gesture.ids.forEach(id=>viewport.querySelector(`[data-v2-freeboard-node="${CSS.escape(id)}"]`)?.classList.add("is-moving"));}},360);
    viewport.setPointerCapture?.(event.pointerId);node.classList.add("is-selected");event.preventDefault();
  },true);
  // Desktop browsers reliably report dblclick. Keep this explicit path in
  // addition to the touch double-tap detection above so both inputs edit the
  // text directly on the board.
  root.addEventListener("dblclick",event=>{
    const node=event.target.closest("[data-v2-freeboard-node]");
    if(!node||event.target.closest("[data-v2-freeboard-inline-edit]"))return;
    const card=fbCard(node.dataset.v2FreeboardNode);
    if(!card||!["text","memo"].includes(fbType(card)))return;
    event.preventDefault();event.stopImmediatePropagation();
    fbSelect([card.id],card.id);freeBoardUI.editingId=card.id;freeBoardUI.styleId=null;
    newAppRender();
    setTimeout(()=>root.querySelector(`[data-v2-freeboard-inline-edit="${CSS.escape(card.id)}"]`)?.focus(),0);
  },true);
  root.addEventListener("pointermove",event=>{
    const g=freeBoardUI.gesture,viewport=event.target.closest("[data-v2-freeboard-viewport]")||g?.viewport;if(!viewport)return; if(freeBoardUI.pointers.has(event.pointerId))freeBoardUI.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(g?.kind==="pinch"&&freeBoardUI.pointers.size>=2){const a=[...freeBoardUI.pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);freeBoardUI.view.scale=Math.max(.65,Math.min(2.6,g.scale*d/g.distance));viewport.querySelector("[data-v2-freeboard-stage]").style.setProperty("--fb-scale",freeBoardUI.view.scale);event.preventDefault();return;}
    if(!g||g.pointerId!==event.pointerId)return;const r=viewport.getBoundingClientRect(),dx=(event.clientX-g.startX)/r.width*100/freeBoardUI.view.scale,dy=(event.clientY-g.startY)/r.height*100/freeBoardUI.view.scale;
    if(g.kind==="pan"){freeBoardUI.view.x=g.baseX+event.clientX-g.startX;freeBoardUI.view.y=g.baseY+event.clientY-g.startY;const st=viewport.querySelector("[data-v2-freeboard-stage]");st.style.setProperty("--fb-x",freeBoardUI.view.x+"px");st.style.setProperty("--fb-y",freeBoardUI.view.y+"px");return;}
    if(g.kind==="marquee-hold"){
      if(Math.hypot(dx,dy)>.85){
        clearTimeout(g.timer);
        g.kind="pan";g.baseX=freeBoardUI.view.x;g.baseY=freeBoardUI.view.y;
      }else return;
    }
    if(g.kind==="marquee"){
      freeBoardUI.marquee={start:g.start,current:fbPoint(viewport,event)};
      const m=viewport.querySelector(".v2fb-marquee"),q=freeBoardUI.marquee;
      if(m){m.style.setProperty("--x",Math.min(q.start.x,q.current.x)+"%");m.style.setProperty("--y",Math.min(q.start.y,q.current.y)+"%");m.style.setProperty("--w",Math.abs(q.current.x-q.start.x)+"%");m.style.setProperty("--h",Math.abs(q.current.y-q.start.y)+"%");}
      event.preventDefault();return;
    }
    const card=fbCard(g.id);if(!card||!canWrite())return;
    if(g.kind==="draw"){card.points.push(fbPoint(viewport,event));const poly=viewport.querySelector(`[data-v2-freeboard-node="${CSS.escape(card.id)}"] polyline`);if(poly)poly.setAttribute("points",card.points.map(p=>`${p[0]},${p[1]}`).join(" "));return;}
    if((g.kind==="hold"||g.kind==="group-hold")&&(Math.abs(dx)>.3||Math.abs(dy)>.3))g.moved=true;
    if((g.kind==="hold"||g.kind==="group-hold")&&!g.movable)return;
    if(g.kind==="hold"||g.kind==="group-hold"){
      const highest=Math.max(1,...fbCards().map(c=>+c.z||1));
      (g.bases||[]).forEach((base,index)=>{const moving=fbCard(base.id);if(!moving)return;moving.x=Math.max(0,Math.min(100-base.w,base.x+dx));moving.y=Math.max(0,Math.min(100-base.h,base.y+dy));moving.z=highest+index+1;const movingNode=viewport.querySelector(`[data-v2-freeboard-node="${CSS.escape(base.id)}"]`);if(movingNode){movingNode.style.setProperty("--x",moving.x+"%");movingNode.style.setProperty("--y",moving.y+"%");movingNode.style.setProperty("--z",moving.z);}});
    }
    else if(g.kind==="resize"){
      // Each edge is anchored on its opposite side. Clamp the dragged edge first,
      // so hitting a boundary or minimum size never expands the other side.
      const h=g.handle||"se",minW=8,minH=8;
      const left=g.baseX,top=g.baseY,right=left+g.baseW,bottom=top+g.baseH;
      let x=left,y=top,w=g.baseW,hh=g.baseH;
      if(h.includes("e")){const edge=Math.max(left+minW,Math.min(100,right+dx));w=edge-left;}
      if(h.includes("w")){const edge=Math.max(0,Math.min(right-minW,left+dx));x=edge;w=right-edge;}
      if(h.includes("s")){const edge=Math.max(top+minH,Math.min(100,bottom+dy));hh=edge-top;}
      if(h.includes("n")){const edge=Math.max(0,Math.min(bottom-minH,top+dy));y=edge;hh=bottom-edge;}
      card.x=x;card.y=y;card.w=w;card.h=hh;
      // Text never stretches.  It follows its resized frame with one uniform
      // scale (the smaller axis), while its inset remains fixed in CSS.
      if(["text","memo"].includes(fbType(card))){
        const ratio=Math.min(w/g.baseW,hh/g.baseH);
        card.size=Math.max(10,Math.min(72,Math.round((g.baseSize||18)*ratio)));
        card.manualSize=true;
      }
    }
    const node=viewport.querySelector(`[data-v2-freeboard-node="${CSS.escape(card.id)}"]`);if(node){node.style.setProperty("--x",card.x+"%");node.style.setProperty("--y",card.y+"%");node.style.setProperty("--w",card.w+"%");node.style.setProperty("--h",card.h+"%");node.style.setProperty("--size",(card.size||18)+"px");}event.preventDefault();
  },true);
  root.addEventListener("wheel",event=>{
    const viewport=event.target.closest("[data-v2-freeboard-viewport]");
    if(!viewport||!window.matchMedia("(pointer:fine)").matches)return;
    const before=freeBoardUI.view.scale;
    const next=Math.max(.65,Math.min(2.6,before*Math.exp(-event.deltaY*.0015)));
    if(next===before)return;
    const r=viewport.getBoundingClientRect();
    const localX=(event.clientX-r.left-freeBoardUI.view.x)/before;
    const localY=(event.clientY-r.top-freeBoardUI.view.y)/before;
    freeBoardUI.view.scale=next;
    freeBoardUI.view.x=event.clientX-r.left-localX*next;
    freeBoardUI.view.y=event.clientY-r.top-localY*next;
    const stage=viewport.querySelector("[data-v2-freeboard-stage]");
    stage?.style.setProperty("--fb-scale",next);
    stage?.style.setProperty("--fb-x",freeBoardUI.view.x+"px");
    stage?.style.setProperty("--fb-y",freeBoardUI.view.y+"px");
    event.preventDefault();
  },{capture:true,passive:false});
  root.addEventListener("pointerup",event=>{
    freeBoardUI.pointers.delete(event.pointerId);const g=freeBoardUI.gesture;if(!g)return;clearTimeout(g.timer);const scrollAnchor=freeBoardUI.gestureScroll;
    if(g.kind==="pinch"&&freeBoardUI.pointers.size<2){freeBoardUI.gesture=null;freeBoardUI.gestureScroll=null;fbRestoreScroll(scrollAnchor);return;}
    if(g.pointerId!==event.pointerId)return;
    if(g.kind==="marquee"){
      const m=freeBoardUI.marquee||{start:g.start,current:g.current},left=Math.min(m.start.x,m.current.x),right=Math.max(m.start.x,m.current.x),top=Math.min(m.start.y,m.current.y),bottom=Math.max(m.start.y,m.current.y);
      const ids=fbCards().filter(card=>{const x=+card.x||0,y=+card.y||0,w=+card.w||0,h=+card.h||0;return x<right&&x+w>left&&y<bottom&&y+h>top;}).map(card=>card.id);
      fbSelect(ids,ids.at(-1)||null);freeBoardUI.marquee=null;freeBoardUI.gesture=null;freeBoardUI.gestureScroll=null;fbRefreshKeepingScroll(scrollAnchor);return;
    }
    if(g.kind==="marquee-hold"){
      fbSelect([]);freeBoardUI.marquee=null;freeBoardUI.gesture=null;freeBoardUI.gestureScroll=null;fbRefreshKeepingScroll(scrollAnchor);return;
    }
    // A short group tap is a command gesture, not a movement. It opens the
    // group command menu; a drag (or touch long-press then drag) moves items.
    if(g.kind==="group-hold"&&!g.moved){
      freeBoardUI.groupMenu=true;freeBoardUI.gesture=null;freeBoardUI.gestureScroll=null;fbRefreshKeepingScroll(scrollAnchor);return;
    }
    if(g.kind!=="pan"&&canWrite())save();
    if(g.kind==="hold"&&g.pointerType!=="mouse"&&g.movable&&!g.moved){freeBoardUI.deleteReady=g.id;freeBoardUI.contextMenu=null;}
    if(g.kind==="pan"&&g.clicked&&Math.abs(event.clientX-g.startX)<5&&Math.abs(event.clientY-g.startY)<5){fbSelect([]);}
    // Positions, sizes, pen strokes, and the board viewport are updated live
    // while dragging. Re-rendering root here used to force the document top.
    // A stationary touch long-press is the only completion that needs a fresh
    // DOM, to reveal its delete control.
    const revealDelete=g.kind==="hold"&&g.pointerType!=="mouse"&&g.movable&&!g.moved;
    freeBoardUI.gesture=null;
    freeBoardUI.gestureScroll=null;
    if(revealDelete)fbRefreshKeepingScroll(scrollAnchor);
    else fbRestoreScroll(scrollAnchor);
  },true);
  root.addEventListener("pointercancel",()=>{const scrollAnchor=freeBoardUI.gestureScroll;freeBoardUI.pointers.clear();if(freeBoardUI.gesture)clearTimeout(freeBoardUI.gesture.timer);freeBoardUI.gesture=null;freeBoardUI.gestureScroll=null;freeBoardUI.marquee=null;fbRestoreScroll(scrollAnchor);},true);
  function healthMean(values){const x=values.filter(v=>v!=null);return x.length?x.reduce((a,b)=>a+b,0)/x.length:0;}
  function healthCorr(a,b){const pairs=a.map((v,i)=>[v,b[i]]).filter(([x,y])=>x!=null&&y!=null);if(pairs.length<3)return null;const ax=healthMean(pairs.map(p=>p[0])),ay=healthMean(pairs.map(p=>p[1]));const n=pairs.reduce((s,[x,y])=>s+(x-ax)*(y-ay),0),dx=Math.sqrt(pairs.reduce((s,[x])=>s+(x-ax)**2,0)),dy=Math.sqrt(pairs.reduce((s,[,y])=>s+(y-ay)**2,0));return dx&&dy?n/(dx*dy):null;}
  function healthMetricMarker(metric){return `<i class="an-health-marker marker-${metric.marker||"bar"}" style="--marker-color:${metric.c}" aria-hidden="true"></i>`;}
  function healthAnalysisResult(metrics){
    const by=id=>metrics.find(m=>m.id===id),sleep=by("sleep"),steps=by("steps"),body=by("body"),mind=by("mind"),days=healthDays();
    const pairs=[
      ["睡眠とからだ",healthCorr(sleep.vals,body.vals)],
      ["睡眠とこころ",healthCorr(sleep.vals,mind.vals)],
      ["歩数とからだ",healthCorr(steps.vals,body.vals)],
      ["歩数とこころ",healthCorr(steps.vals,mind.vals)]
    ].filter(([,v])=>v!=null).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
    const strongest=pairs[0],recordCount=m=>m.vals.filter(v=>v!=null).length,totalRecords=metrics.reduce((n,m)=>n+recordCount(m),0),completeDays=days.filter((_,i)=>metrics.every(m=>m.vals[i]!=null)).length;
    const used=metrics.map(m=>{const count=recordCount(m),mean=count?healthMean(m.vals):null,display=m.id==="steps"&&mean!=null?Math.round(mean):mean;return `<li><strong>${m.label}</strong><span>${count?`${m.format(display)}・${count}日`:"未記録"}</span></li>`}).join("");
    const missing=metrics.filter(m=>recordCount(m)<days.length).map(m=>`${m.label}（${days.length-recordCount(m)}日不足）`);
    const missingText=missing.length?`${missing.join("、")}。4項目すべて揃った日は${completeDays}日です。`:`4項目すべて揃った日が${completeDays}日あります。`;
    const trendParts=metrics.filter(m=>recordCount(m)).map(m=>{const mean=healthMean(m.vals),label=m.label;if(m.id==="sleep"&&mean<360)return `${label}は平均${m.format(mean)}で、短い記録が含まれます`;if(m.id==="steps"&&mean>=8000)return `${label}は平均${m.format(mean)}で、よく歩いた記録があります`;if((m.id==="body"||m.id==="mind")&&mean>=4)return `${label}は平均${m.format(mean)}で、比較的高い記録です`;return `${label}は${recordCount(m)}日記録されています`;});
    const direction=strongest?(strongest[1]>.3?"同じ方向":strongest[1]<-.3?"反対方向":"大きな連動は未確認"):"比較できる記録がまだ不足しています";
    const trendText=strongest&&Math.abs(strongest[1])>.3?`${strongest[0]}に${direction}の変化が見られます。` : trendParts.join("。")+"。";
    const strength=completeDays>=5&&pairs.length?"中〜強（同じ日に揃った記録と比較可能な組み合わせがあります）":totalRecords>=6?"中（記録はありますが、欠けている日があります）":"弱（記録日数が少なく、傾向は仮置きです）";
    const speculation=strongest?`${strongest[0]}の相関は、同じ期間に動いた度合いを示すだけです。原因や医療上の関係は判断できません。`:"記録が増えるまで、体調の変化と生活上の原因を結びつけて推測しません。";
    const action=missing.length?"まずは明日、睡眠・歩数・からだ・こころを同じ日に記録して比較できる状態にする":"次の3日だけ、就寝・起床と体調を同じタイミングで記録して変化を見比べる";
    const section=(title,body,kind="")=>`<section class="v2-health-ai-section ${kind}"><h3>${title}</h3><div>${body}</div></section>`;
    return `<article class="v2-health-ai"><header class="v2-health-ai-head"><strong>体調分析レポート</strong><span>AI連携未接続・端末内の整理</span></header>${section("使用したデータ",`<ul>${used}</ul>`)}${section("欠けているデータ",missingText,missing.length?"is-warning":"is-good")}${section("観察できた傾向",trendText)}${section("根拠の強さ",strength)}${section("推測にすぎない部分",speculation,"is-caution")}${section("次に試せる小さな行動",action,"is-action")}<small class="v2-health-ai-note">この表示は保存された記録から算出した目安です。診断や治療の判断には使わず、気になる変化は専門家へ相談してください。</small></article>`;
  }
  // 体調分析の現行正本。対象は健康の4指標だけに固定する。
  healthAnalysis=function(){
    const ms=healthMetrics(),by=id=>ms.find(m=>m.id===id),sleep=by("sleep"),steps=by("steps"),body=by("body"),mind=by("mind");
    const values=[sleep,steps,body,mind].map(m=>m.vals.some(v=>v!=null)?healthMean(m.vals):null),summary=ms.map((m,i)=>`<div><small>平均${m.label}</small><b>${values[i]==null?"未記録":m.format(values[i])}</b></div>`).join("");
    return analogPage("an-health-analysis","body","HEALTH ANALYSIS","体調の分析",`<section class="an-chart-section"><h2>睡眠・歩数・からだ・こころ</h2><div class="an-metric-toggle">${ms.map(m=>`<button class="${metricOn[m.id]?"":"off"}" data-v2-metric="${m.id}">${healthMetricMarker(m)}${m.label}</button>`).join("")}</div>${healthChart()}</section><section class="an-chart-section"><h2>振り返り</h2><div class="v2-health-review">${summary}</div><button type="button" class="an-wide-action" data-v2-health-analysis>${icon("chart")}<span>記録から分析する</span><b>›</b></button>${healthAnalysisOpen?healthAnalysisResult(ms):""}</section>`);
  };
  root.addEventListener("click",event=>{const button=event.target.closest("[data-v2-health-analysis]");if(!button)return;event.stopImmediatePropagation();healthAnalysisOpen=!healthAnalysisOpen;newAppRender();},true);
  root.addEventListener("pointerdown",event=>{
    const date=event.target.closest("#v2WorkDate");
    if(date&&page==="workLog")workLogDateViewport=currentViewport();
    const metric=event.target.closest("[data-v2-metric]");
    if(metric)metricViewport=currentViewport();
  },true);
  root.addEventListener("focusin",event=>{
    const date=event.target.closest("#v2WorkDate");
    if(date&&page==="workLog"&&!workLogDateViewport)workLogDateViewport=viewportBeforeFocus();
  },true);
  root.addEventListener("input",event=>{
    if(!document.getElementById("v2WorkDate"))return;
    if(["v2WorkStart","v2WorkEnd"].includes(event.target.id))paintWorkLogTime(event.target.id);
    if(["v2WorkStart","v2WorkEnd","v2WorkBreak"].includes(event.target.id))paintWorkLogDraft();
    persistWorkLogDraft(document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()));
  },true);
  function syncWorkLogChoice(choice){
    const id=choice?.dataset.v2WorkChoice,custom=root.querySelector(`[data-v2-work-custom="${CSS.escape(id||"")}"]`);
    if(custom)custom.hidden=choice.value!=="__custom";
  }
  function syncWorkReviewChoice(choice){
    const key=choice?.dataset.v2WorkReview,scope=choice?.closest("[data-v2-work-project-review]"),custom=scope?.querySelector(`[data-v2-work-review-custom="${CSS.escape(key||"")}"]`);
    if(custom)custom.hidden=choice.value!=="__custom";
  }
  root.addEventListener("change",event=>{
    if(page!=="workLog")return;
    if(["v2WorkStart","v2WorkEnd"].includes(event.target.id))paintWorkLogTime(event.target.id);
    if(["v2WorkStart","v2WorkEnd","v2WorkBreak"].includes(event.target.id))paintWorkLogDraft();
    if(event.target.matches("[data-v2-work-choice]")){syncWorkLogChoice(event.target);persistWorkLogDraft(document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()));return;}
    if(event.target.matches("[data-v2-work-review]")){syncWorkReviewChoice(event.target);persistWorkLogDraft(document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()));return;}
    if(event.target.matches("#v2WorkProjectAdd")){
      let projectId=event.target.value;
      if(projectId==="__new__"){
        const project=ensureWorkProject(window.prompt("新しいプロジェクト名を入力してください"));
        projectId=project?.id||"";
        if(project)save();
      }
      const list=root.querySelector("[data-v2-work-catalog-list]");
      if(projectId&&list&&!root.querySelector(`[data-v2-work-project-row][data-v2-work-project=\"${CSS.escape(projectId)}\"]`)){
        root.querySelector("[data-v2-work-project-empty]")?.remove();
        const pageIndex=root.querySelectorAll("[data-v2-work-project-review]").length;
        list.insertAdjacentHTML("beforeend",workProjectReviewHtml(projectId,document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()),"","",{},pageIndex));
      }
      event.target.value="";normalizeWorkLogDescriptions();syncWorkLogCatalog();syncWorkLogProjectPage(root.querySelectorAll("[data-v2-work-project-review]").length-1);persistWorkLogDraft(document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()));return;
    }
    if(event.target.matches("[data-v2-work-project],[data-v2-work-item-for-project]")){
      syncWorkLogCatalog();
      const itemId=event.target.matches("[data-v2-work-item-for-project]")?event.target.value:"",item=workItemOf(itemId),planned=scheduledWorkForDate(document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()),itemId)[0];
      if(item&&planned){const start=document.getElementById("v2WorkStart"),end=document.getElementById("v2WorkEnd");if(start&&!start.value)start.value=planned.from||"";if(end&&!end.value)end.value=planned.to||"";paintWorkLogTime("v2WorkStart");paintWorkLogTime("v2WorkEnd");paintWorkLogDraft();}
      updateWorkLogScheduleHint();persistWorkLogDraft(document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()));
    }
  },true);
  root.addEventListener("click",event=>{
    const pageNav=event.target.closest("[data-v2-work-page-nav]");
    const pageChip=event.target.closest("[data-v2-work-page-chip]");
    if(page==="workLog"&&(pageNav||pageChip)){
      event.stopImmediatePropagation();
      const pages=[...root.querySelectorAll("[data-v2-work-project-review]")];
      const current=pages.findIndex(section=>section.classList.contains("is-active"));
      const target=pageChip?Number(pageChip.dataset.v2WorkPageChip):(pageNav?.dataset.v2WorkPageNav==="next"?current+1:current-1);
      syncWorkLogProjectPage(target);return;
    }
    const projectRemove=event.target.closest("[data-v2-work-project-remove]");
    if(page==="workLog"&&projectRemove){
      event.stopImmediatePropagation();
      const current=[...root.querySelectorAll("[data-v2-work-project-review]")].findIndex(section=>section.classList.contains("is-active"));
      projectRemove.closest("[data-v2-work-project-review]")?.remove()||projectRemove.closest("[data-v2-work-project-row]")?.remove();
      const list=root.querySelector("[data-v2-work-catalog-list]");
      if(list&&!list.querySelector("[data-v2-work-project-row]"))list.insertAdjacentHTML("afterbegin",`<p class="an-work-project-empty" data-v2-work-project-empty>プロジェクトを追加すると、ここに選んだ仕事が表示されます。</p>`);
      syncWorkLogCatalog();syncWorkLogProjectPage(Math.max(0,current-1));return;
    }
    const metric=event.target.closest("[data-v2-metric]");
    if(!metric)return;
    event.stopImmediatePropagation();
    const position=metricViewport||currentViewport();
    metricOn[metric.dataset.v2Metric]=!metricOn[metric.dataset.v2Metric];
    newAppRender({preserveScroll:false});
    metricViewport=null;
    restoreViewport(position);
  },true);
  root.addEventListener("change",event=>{
    const date=event.target.closest("#v2WorkDate");
    if(!date||!date.value)return;
    const position=workLogDateViewport||currentViewport();
    persistWorkLogDraft(workLogDate);workLogDate=date.value;workLogFormReset=false;newAppRender({preserveScroll:false});
    workLogDateViewport=null;
    restoreViewport(position);
  },true);
  function punchNow(){const d=new Date();return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}
  root.addEventListener("click",event=>{
    const button=event.target.closest("[data-v2-work-punch]");
    if(!button)return;
    event.stopImmediatePropagation();
    if(!canWrite())return;
    const date=document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()),saved=Object.assign({},(S.workLogs&&S.workLogs[date])||{}),draft=workLogDraftFor(date),record=Object.assign({},saved,draft||{}),punch=workPunchState(record),stamp=punchNow();
    const sessions=punch.sessions.map(x=>({start:x.start,end:x.end||""})),breaks=punch.breaks.map(x=>({start:x.start,end:x.end||""})),kind=button.dataset.v2WorkPunch;
    if(kind==="in"){
      if(punch.activeWork)return toast("勤務中です");
      sessions.push({start:stamp,end:""});
    }else if(kind==="break-start"){
      if(!punch.activeWork||punch.activeBreak)return toast("休憩を開始できません");
      breaks.push({start:stamp,end:""});
    }else if(kind==="break-end"){
      if(!punch.activeBreak)return toast("休憩中ではありません");
      breaks[breaks.length-1].end=stamp;
    }else if(kind==="out"){
      if(!punch.activeWork)return toast("勤務中ではありません");
      if(punch.activeBreak)breaks[breaks.length-1].end=stamp;
      sessions[sessions.length-1].end=stamp;
    }
    const first=sessions[0]?.start||record.start||"",last=[...sessions].reverse().find(x=>x.end)?.end||"";
    S.workLogs=S.workLogs&&typeof S.workLogs==="object"?S.workLogs:{};
    S.workLogs[date]=Object.assign({},saved,{id:saved.id||uid(),workSessions:sessions,breakSessions:breaks,start:first,end:last,breakMinutes:workLogBreakMinutes({workSessions:sessions,breakSessions:breaks})});
    if(draft){
      const draftData=Object.assign({},draft,{workSessions:sessions,breakSessions:breaks});
      localStorage.setItem(WORK_LOG_DRAFT_KEY,JSON.stringify({day:date,data:draftData,updatedAt:Date.now()}));
    }
    save();workLogDate=date;newAppRender();successToast(kind==="in"?"勤務を開始しました":kind==="out"?"勤務を終了しました":kind==="break-start"?"休憩を開始しました":"休憩を終了しました");
  },true);
  root.addEventListener("click",event=>{
    const button=event.target.closest("[data-v2-work-time-save]");
    if(!button)return;
    event.stopImmediatePropagation();
    if(!canWrite())return;
    const edge=button.dataset.v2WorkTimeSave,inputId=edge==="start"?"v2WorkStart":"v2WorkEnd",value=document.getElementById(inputId)?.value||"";
    if(timeValueMinutes(value)==null)return toast(`${edge==="start"?"作業開始":"作業終了"}の時刻を入力してください`);
    const date=document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()),saved=Object.assign({},(S.workLogs&&S.workLogs[date])||{}),wasSaved=workTimeSaved(saved,edge),draft=workLogDraftFor(date),record=applyWorkTimeConfirmation(Object.assign({},saved,draft||{}),edge,value);
    S.workLogs=S.workLogs&&typeof S.workLogs==="object"?S.workLogs:{};
    S.workLogs[date]=Object.assign({},saved,record,{id:saved.id||uid()});
    const draftData=Object.assign({},draft||{},record,{projectIds:selectedWorkLogProjects(),workItemIds:selectedWorkLogItems(),workDescriptions:selectedWorkLogDescriptions(),projectReviews:selectedWorkLogReviews()});
    try{localStorage.setItem(WORK_LOG_DRAFT_KEY,JSON.stringify({day:date,data:draftData,updatedAt:Date.now()}));}catch{}
    workLogDate=date;workLogFormReset=false;save();
    const position=currentViewport();newAppRender({preserveScroll:false});restoreViewport(position);
    successToast(`${edge==="start"?"作業開始":"作業終了"}を${wasSaved?"変更":"確定"}しました`);
  },true);
  root.addEventListener("click",event=>{
    const button=event.target.closest("[data-v2-work-save]");
    if(!button)return;
    event.stopImmediatePropagation();
    if(!canWrite())return;
    const date=document.getElementById("v2WorkDate")?.value||workLogDate||ymd(now()),start=document.getElementById("v2WorkStart")?.value||"",end=document.getElementById("v2WorkEnd")?.value||"",breakMinutes=Math.max(0,Math.min(720,Math.round(Number(document.getElementById("v2WorkBreak")?.value)||0))),span=workLogSpan({start,end});
    if(span==null)return toast("作業開始と作業終了を入力してください");
    if(breakMinutes>span)return toast("休憩分は作業時間以内にしてください");
    S.workLogs=S.workLogs&&typeof S.workLogs==="object"?S.workLogs:{};
    const previous=S.workLogs[date]||{},projectIds=selectedWorkLogProjects(),workItemIds=selectedWorkLogItems(),workDescriptions=selectedWorkLogDescriptions(),projectReviews=selectedWorkLogReviews(),projectId=projectIds[0]||"",workItemId=workItemIds[0]||"",project=workProjectOf(projectId),item=workItemOf(workItemId),timeRecord=Object.assign({},previous,{start,end,breakMinutes});
    applyWorkTimeConfirmation(timeRecord,"start",start);applyWorkTimeConfirmation(timeRecord,"end",end);
    S.workLogs[date]={id:previous.id||uid(),start,end,breakMinutes,actualWorkMinutes:previous.actualWorkMinutes??null,workSessions:timeRecord.workSessions,breakSessions:timeRecord.breakSessions,projectIds,workItemIds,workDescriptions,projectReviews,projectId,workItemId,project:project?.name||previous.project||"",workItem:item?.name||previous.workItem||"",checks:Array.isArray(previous.checks)?previous.checks:[],done:previous.done||"",statusNote:previous.statusNote||"",todo:previous.todo||"",trial:previous.trial||"",delivery:previous.delivery||"",next:previous.next||"",implementation:previous.implementation||"",quality:previous.quality||"",design:previous.design||"",insight:previous.insight||""};
    workLogDate=date;workLogFormReset=true;clearWorkLogDraft(date);save();newAppRender();successToast("仕事の記録を保存しました");
  },true);
  function healthChartBounds(vp){
    const rect=vp.getBoundingClientRect(), scale=Math.max(1,healthChartView.scale||1);
    return {x:Math.max(0,(rect.width*(scale-1))/2),y:Math.max(0,(rect.height*(scale-1))/2)};
  }
  function syncHealthChartView(vp){
    if(healthChartView.scale<=1.001){ healthChartView={scale:1,x:0,y:0}; }
    const bounds=healthChartBounds(vp);
    healthChartView.x=Math.max(-bounds.x,Math.min(bounds.x,healthChartView.x));
    healthChartView.y=Math.max(-bounds.y,Math.min(bounds.y,healthChartView.y));
    const stage=vp.querySelector("[data-v2-health-stage]");
    if(!stage) return;
    stage.style.setProperty("--health-chart-scale",healthChartView.scale);
    stage.style.setProperty("--health-chart-x",`${healthChartView.x}px`);
    stage.style.setProperty("--health-chart-y",`${healthChartView.y}px`);
  }
  root.addEventListener("click",event=>{if(Date.now()<healthChartIgnoreClickUntil)return;const hit=event.target.closest("[data-v2-health-bars]");if(!hit)return;event.stopImmediatePropagation();const i=+hit.dataset.v2HealthBarIndex,ids=hit.dataset.v2HealthBars.split(",");healthBarCycle[i]=(healthBarCycle[i]||0)%ids.length;healthChartSelectedPoint={index:i,metric:ids[healthBarCycle[i]++]};newAppRender();},true);
  root.addEventListener("click",event=>{if(Date.now()<healthChartIgnoreClickUntil)return;const line=event.target.closest("[data-v2-health-line]");if(!line)return;event.stopImmediatePropagation();const svg=line.closest("svg"),r=svg.getBoundingClientRect(),i=Math.max(0,Math.min(healthDays().length-1,Math.round(((event.clientX-r.left)/r.width*360-34)/(314/Math.max(1,healthDays().length-1)))));healthChartSelectedPoint={index:i,metric:line.dataset.v2HealthLine};newAppRender();},true);
  root.addEventListener("pointerdown",event=>{
    const vp=event.target.closest("[data-v2-health-viewport]");
    if(!vp || (event.pointerType==="mouse"&&event.button!==0)) return;
    healthChartPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    vp.setPointerCapture?.(event.pointerId);
    if(healthChartPointers.size===1){
      healthChartGesture={vp,pointerId:event.pointerId,mode:healthChartView.scale>1.001?"pan":"idle",startX:event.clientX,startY:event.clientY,baseX:healthChartView.x,baseY:healthChartView.y,moved:false};
      return;
    }
    if(healthChartPointers.size===2){
      const points=[...healthChartPointers.values()];
      healthChartGesture={vp,mode:"pinch",startDistance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),startScale:healthChartView.scale,moved:false};
      event.preventDefault();
    }
  },true);
  root.addEventListener("pointermove",event=>{
    if(!healthChartPointers.has(event.pointerId)) return;
    const gesture=healthChartGesture, vp=gesture?.vp||event.target.closest("[data-v2-health-viewport]");
    if(!vp) return;
    healthChartPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(healthChartPointers.size>=2 && gesture?.mode==="pinch"){
      const points=[...healthChartPointers.values()], distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
      healthChartView.scale=Math.max(1,Math.min(2.6,gesture.startScale*distance/Math.max(1,gesture.startDistance)));
      gesture.moved=true;
      syncHealthChartView(vp);
      event.preventDefault();
      return;
    }
    if(gesture?.mode==="pan" && gesture.pointerId===event.pointerId){
      const dx=event.clientX-gesture.startX,dy=event.clientY-gesture.startY;
      if(Math.hypot(dx,dy)>2){
        gesture.moved=true;
        healthChartView.x=gesture.baseX+dx;
        healthChartView.y=gesture.baseY+dy;
        syncHealthChartView(vp);
        event.preventDefault();
      }
    }
  },{capture:true,passive:false});
  function finishHealthChartPointer(event){
    const gesture=healthChartGesture;
    if(gesture?.moved) healthChartIgnoreClickUntil=Date.now()+280;
    const vp=gesture?.vp||event.target.closest?.("[data-v2-health-viewport]");
    vp?.releasePointerCapture?.(event.pointerId);
    healthChartPointers.delete(event.pointerId);
    if(healthChartPointers.size<2) healthChartGesture=null;
  }
  root.addEventListener("pointerup",finishHealthChartPointer,true);
  root.addEventListener("pointercancel",finishHealthChartPointer,true);
  /*
   * Record correction + completed-shopping swipe actions.
   * These are kept here, inside the UI closure, so they use the same data
   * store and rendering lifecycle as the rest of the PWA.
   */
  const recordUiState={editing:null,swipe:null,ignoreClickUntil:0};
  function recordTodayEntries(){
    const day=ymd(now());
    return [...S.spends.filter(x=>x.d===day).map(x=>({type:"expense",item:x})),...(S.incomeLogs||[]).filter(x=>x.d===day).map(x=>({type:"income",item:x}))].sort((a,b)=>(b.item.t||"").localeCompare(a.item.t||""));
  }
  function recordEntryByKey(key){
    const [type,id]=String(key||"").split("::");
    const list=type==="income"?(S.incomeLogs||[]):S.spends;
    const item=list.find(x=>x.id===id);
    return item?{type,item}:null;
  }
  function recordOptions(type){
    return moneyOptions(type==="income"?"income":"expense");
  }
  function recordCloseEditor(){
    document.querySelector(".v2-record-editor-layer")?.remove();
    recordUiState.editing=null;
  }
  function recordField(label,control){
    const wrap=document.createElement("label");
    wrap.className="v2-record-editor-field";
    const text=document.createElement("span");
    text.textContent=label;
    wrap.append(text,control);
    return wrap;
  }
  function recordOptionList(select,items,current){
    items.forEach(item=>{
      const value=Array.isArray(item)?item[0]:item;
      const label=Array.isArray(item)?item[1]:item;
      const option=document.createElement("option");
      option.value=value;option.textContent=label;option.selected=value===current;
      select.append(option);
    });
  }
  function recordOpenEditor(key){
    if(!canWrite())return;
    const entry=recordEntryByKey(key);
    if(!entry)return;
    recordCloseEditor();
    recordUiState.editing=key;
    const type=entry.type, item=entry.item, options=recordOptions(type);
    const layer=document.createElement("div");
    layer.className="v2-record-editor-layer";
    const panel=document.createElement("section");
    panel.className="v2-record-editor";
    const title=document.createElement("h2");
    title.textContent=type==="income"?"収入を編集":"支出を編集";
    const note=document.createElement("p");
    note.textContent="金額・方法・カテゴリーを直せます。保存すると残高にも反映されます。";
    const amount=document.createElement("input");
    amount.type="text";amount.inputMode="numeric";amount.value=String(item.amt||"");amount.setAttribute("aria-label","金額");
    const method=document.createElement("select");
    recordOptionList(method,options.methods,type==="income"?(item.method||"bank"):(item.pay||"cash"));
    const category=document.createElement("select");
    recordOptionList(category,options.cats,item.cat||options.cats[0]);
    const actions=document.createElement("div");
    actions.className="v2-record-editor-actions";
    const cancel=document.createElement("button");
    cancel.type="button";cancel.className="v2-record-editor-cancel";cancel.textContent="キャンセル";
    const saveButton=document.createElement("button");
    saveButton.type="button";saveButton.className="v2-record-editor-save";saveButton.textContent="変更を保存";
    cancel.addEventListener("click",recordCloseEditor);
    layer.addEventListener("click",event=>{if(event.target===layer)recordCloseEditor();});
    saveButton.addEventListener("click",()=>{
      const nextAmount=moneyAmount(amount.value);
      if(!(nextAmount>0)){toast("金額を入れてください");amount.focus();return;}
      const oldAmount=Number(item.amt||0);
      if(type==="expense"){
        const oldPay=item.pay||"cash", nextPay=method.value;
        const account=primaryAcct();
        if(account&&["cash","paypay"].includes(oldPay))account.bal=(+account.bal||0)+oldAmount;
        if(account&&["cash","paypay"].includes(nextPay))account.bal=(+account.bal||0)-nextAmount;
        item.amt=nextAmount;item.pay=nextPay;item.methodLabel=method.selectedOptions[0]?.textContent||nextPay;item.cat=category.value;
      }else{
        const account=bankAcct();
        if(account)account.bal=(+account.bal||0)-oldAmount+nextAmount;
        item.amt=nextAmount;item.method=method.value;item.methodLabel=method.selectedOptions[0]?.textContent||method.value;item.cat=category.value;
      }
      save();recordCloseEditor();newAppRender();toast("記録を変更しました");
    });
    actions.append(cancel,saveButton);
    panel.append(title,note,recordField("金額",amount),recordField(type==="income"?"受け取り方法":"支払い方法",method),recordField(type==="income"?"収入のカテゴリー":"支出のカテゴリー",category),actions);
    layer.append(panel);document.body.append(layer);
    setTimeout(()=>amount.focus(),0);
  }
  function recordDecoratePage(){
    // Mobile checklist contract: apply the geometry directly as an inline
    // important style. Older analog stylesheet rules also use !important, so
    // a selector-only override can lose depending on stylesheet order.
    const habits=root.querySelector(".an-checklist .an-habits");
    if(habits){
      habits.style.setProperty("display","grid","important");
      habits.style.setProperty("grid-template-columns","repeat(2,minmax(0,1fr))","important");
      habits.style.setProperty("gap","10px","important");
      habits.querySelectorAll(".an-habit").forEach(habit=>{
        habit.style.setProperty("width","100%","important");
        habit.style.setProperty("min-width","0","important");
        habit.style.setProperty("height","58px","important");
        habit.style.setProperty("min-height","58px","important");
        habit.style.setProperty("padding","0 10px","important");
        habit.style.setProperty("justify-content","center","important");
        habit.style.setProperty("gap","8px","important");
        habit.style.setProperty("border-radius","18px","important");
        const label=habit.querySelector("span");
        if(label){
          label.style.setProperty("min-width","0","important");
          label.style.setProperty("overflow","hidden","important");
          label.style.setProperty("white-space","nowrap","important");
          label.style.setProperty("text-overflow","ellipsis","important");
          label.style.setProperty("line-height","1","important");
          label.style.setProperty("font-size","14px","important");
        }
      });
    }
    const rows=root.querySelectorAll(".mr-activity-row");
    const entries=recordTodayEntries();
    rows.forEach((row,index)=>{
      const entry=entries[index];
      if(!entry||row.dataset.v2RecordDecorated)return;
      row.dataset.v2RecordDecorated="1";
      row.dataset.v2RecordEdit=entry.type+"::"+entry.item.id;
      row.setAttribute("role","button");row.setAttribute("tabindex","0");
      const hint=document.createElement("em");
      hint.textContent="編集";
      row.append(hint);
    });
    root.querySelectorAll(".an-shopping-section .an-task.done[data-v2-task]").forEach(button=>{
      if(button.closest("[data-v2-shopping-swipe]"))return;
      const wrap=document.createElement("div");
      wrap.className="an-shopping-swipe";
      wrap.dataset.v2ShoppingSwipe=button.dataset.v2Task;
      const remove=document.createElement("button");
      remove.type="button";remove.className="an-shopping-delete";remove.dataset.v2ShoppingDelete=button.dataset.v2Task;remove.textContent="削除";
      button.parentNode.replaceChild(wrap,button);
      wrap.append(button,remove);
    });
  }
  function recordInstallStyle(){
    if(document.getElementById("v2-record-correction-style"))return;
    const style=document.createElement("style");
    style.id="v2-record-correction-style";
    style.textContent=[
      ".an-checklist .an-habits{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}",
      ".an-checklist .an-habit{width:100%!important;min-width:0!important;height:58px!important;min-height:58px!important;justify-content:center!important;padding:0 10px!important;gap:8px!important;border-radius:18px!important}",
      ".an-checklist .an-habit span{min-width:0!important;overflow:hidden!important;white-space:nowrap!important;text-overflow:ellipsis!important;line-height:1!important;font-size:14px!important}",
      ".an-checklist .an-habit .v2-icon{width:20px!important;height:20px!important;flex:0 0 20px!important}",
      "@media(min-width:620px){.an-checklist .an-habits{grid-template-columns:repeat(3,minmax(0,1fr))!important}}",
      ".an-shopping-swipe{position:relative!important;overflow:hidden!important;border-radius:11px!important;touch-action:pan-y!important}",
      ".an-shopping-swipe .an-task{position:relative!important;z-index:1!important;width:100%!important;transition:transform .18s ease!important}",
      ".an-shopping-swipe.is-open .an-task{transform:translateX(-84px)!important}",
      ".an-shopping-delete{position:absolute!important;inset:0 0 0 auto!important;width:84px!important;border:0!important;border-radius:0 11px 11px 0!important;background:#c85e55!important;color:#fffaf0!important;font:inherit!important;font-size:13px!important;font-weight:800!important}",
      ".mr-activity-row{width:100%!important;appearance:none!important;cursor:pointer!important;text-align:left!important;grid-template-columns:minmax(0,1fr) auto auto!important}",
      ".mr-activity-row em{color:#85755e!important;font-size:10px!important;font-style:normal!important;font-weight:800!important}",
      ".v2-record-editor-layer{position:fixed!important;z-index:99999!important;inset:0!important;display:grid!important;place-items:end center!important;padding:20px!important;background:rgba(32,39,35,.38)!important}",
      ".v2-record-editor{width:min(100%,520px)!important;display:grid!important;gap:12px!important;padding:20px!important;border:1px solid #bba98d!important;border-radius:22px!important;background:#fffaf0!important;color:#21312d!important;box-shadow:0 16px 42px rgba(42,37,28,.22)!important}",
      ".v2-record-editor h2{margin:0!important;font-family:inherit!important;font-size:20px!important;font-weight:800!important}.v2-record-editor p{margin:0!important;color:#706b60!important;font-size:12px!important;line-height:1.55!important}",
      ".v2-record-editor-field{display:grid!important;gap:6px!important}.v2-record-editor-field>span{font-size:12px!important;font-weight:800!important}.v2-record-editor-field input,.v2-record-editor-field select{min-height:46px!important;width:100%!important;border:1px solid #cdbfa6!important;border-radius:12px!important;padding:0 12px!important;background:#fffdf8!important;color:#21312d!important;font:inherit!important;font-size:16px!important}",
      ".v2-record-editor-actions{display:grid!important;grid-template-columns:1fr 1.2fr!important;gap:9px!important}.v2-record-editor-actions button{min-height:48px!important;border-radius:13px!important;font:inherit!important;font-size:14px!important;font-weight:800!important}.v2-record-editor-cancel{border:1px solid #cdbfa6!important;background:#fffaf0!important;color:#5e665f!important}.v2-record-editor-save{border:0!important;background:#4d80ad!important;color:#fff!important}"
    ].join("\\n");
    document.head.append(style);
  }
  recordInstallStyle();
  new MutationObserver(recordDecoratePage).observe(root,{childList:true,subtree:true});
  document.addEventListener("click",event=>{
    const del=event.target.closest("[data-v2-shopping-delete]");
    if(del){
      event.preventDefault();event.stopImmediatePropagation();
      if(!canWrite())return;
      S.errands=(S.errands||[]).filter(item=>item.id!==del.dataset.v2ShoppingDelete);
      save();newAppRender();toast("買い物を削除しました");return;
    }
    const edit=event.target.closest("[data-v2-record-edit]");
    if(edit){
      event.preventDefault();event.stopImmediatePropagation();
      recordOpenEditor(edit.dataset.v2RecordEdit);return;
    }
    if(Date.now()<recordUiState.ignoreClickUntil&&event.target.closest("[data-v2-shopping-swipe]")){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  document.addEventListener("keydown",event=>{
    const edit=event.target.closest?.("[data-v2-record-edit]");
    if(edit&&(event.key==="Enter"||event.key===" ")){event.preventDefault();recordOpenEditor(edit.dataset.v2RecordEdit);}
    if(event.key==="Escape")recordCloseEditor();
  },true);
  document.addEventListener("pointerdown",event=>{
    const wrap=event.target.closest("[data-v2-shopping-swipe]");
    if(!wrap)return;
    recordUiState.swipe={wrap,button:wrap.querySelector(".an-task"),x:event.clientX,y:event.clientY,dragging:false};
  },true);
  document.addEventListener("pointermove",event=>{
    const gesture=recordUiState.swipe;
    if(!gesture)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(Math.abs(dx)<=Math.abs(dy)||dx>=0)return;
    gesture.dragging=true;
    gesture.button.style.transform="translateX("+Math.max(-84,dx)+"px)";
    event.preventDefault();
  },true);
  document.addEventListener("pointerup",event=>{
    const gesture=recordUiState.swipe;
    if(!gesture)return;
    const dx=event.clientX-gesture.x;
    if(gesture.dragging){
      gesture.wrap.classList.toggle("is-open",dx<-38);
      gesture.button.style.transform="";
      recordUiState.ignoreClickUntil=Date.now()+360;
    }
    recordUiState.swipe=null;
  },true);
  document.addEventListener("pointercancel",()=>{recordUiState.swipe=null;},true);
  startDailyReportApiLoop();
  newAppRender();
})();
