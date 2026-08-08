/* LIFE NOTE v2. The data model remains in index.html; this file replaces only the UI shell. */
(() => {
  "use strict";
  const root = document.getElementById("lifeNoteV2");
  if (!root) return;
  document.body.dataset.appShell = "v2";

  let page = "home";
  let stack = [];
  let moneyType = "expense";
  let healthDraft = null;
  let calendarMode = "month";
  let calendarDate = ymd(now());
  let flowDate = ymd(now());
  const metricOn = {sleep:true, steps:true, body:true, mind:true};

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
      expense:'<path d="M5 4h14v16H5zM12 7v7m-3-3 3 3 3-3"/>',
      income:'<path d="M5 4h14v16H5zM12 17v-7m-3 3 3-3 3 3"/>',
      pay:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M10 10h4v4h-4z"/>',
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
      refresh:'<path d="M20 11a8 8 0 0 0-13.8-4L4 9M4 5v4h4M4 13a8 8 0 0 0 13.8 4L20 15M20 19v-4h-4"/>',
      download:'<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>'
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
  const privateMoney = (value, cls = "") => S.ui.moneyVisible ? `<b class="${(+value < 0 ? "v2-negative " : "") + cls}">${money(value)}</b>` : `<b class="v2-muted">---</b>`;
  const titleFor = p => ({home:"LIFE NOTE",record:"記録する",moneyRecord:"支出・収入を記録",moneyOutlook:"お金の見通し",moneyAnalysis:"お金の分析",healthRecord:"こころとからだ",healthAnalysis:"体調の分析",today:"今日を整える",flow:"一日の流れ",checklist:"チェックリスト",theme:"今日のテーマ",calendar:"週・月を見る",settings:"設定"}[p] || "LIFE NOTE");
  function top(title, settings = page !== "settings"){
    return `<header class="v2-top">${stack.length ? `<button class="v2-back" data-v2-back>${icon("back")}<span>戻る</span></button>` : `<span class="v2-top-spacer"></span>`}<h1>${esc2(title)}</h1>${settings ? `<button class="v2-top-action" data-v2-go="settings">${icon("settings")}<span>設定</span></button>` : `<span class="v2-top-spacer"></span>`}</header><div class="v2-issue"><span>${issueDate()}</span><span>LIFE NOTE</span></div>${pageMasthead()}`;
  }
  function masthead(name, english, japanese){
    return `<div class="v2-masthead"><p><span class="v2-masthead-icon">${icon(name)}</span><span>${esc2(english)}</span></p><h2>${esc2(japanese)}</h2></div>`;
  }
  function pageMasthead(){
    const heads={
      moneyRecord:["money","MONEY LOG","支出・収入を記録"],moneyOutlook:["money","MONEY OUTLOOK","お金の見通し"],moneyAnalysis:["money","MONEY ANALYSIS","直近30日の動き"],
      healthRecord:["heart","HEALTH LOG","今日の調子を残す"],healthAnalysis:["body","HEALTH ANALYSIS","体調の分析"],
      flow:["calendar","DAILY FLOW","一日の流れ"],checklist:["list","CHECKLIST","今日のやること"],theme:["sun","TODAY'S THEME","今日のテーマ"],calendar:["calendar","CALENDAR","週・月を見る"],settings:["folder","SETTINGS","暮らしの設定"]
    };
    return heads[page] ? masthead(...heads[page]) : "";
  }
  function choice(to, tone, i, label, sub, index){ return `<button class="v2-choice" data-v2-go="${to}" data-tone="${tone}">${index ? `<em class="v2-choice-index">${esc2(index)}</em>` : ""}<span class="v2-icon-bed">${icon(i)}</span><span><strong>${label}</strong>${sub ? `<small>${sub}</small>` : ""}</span><span class="v2-chevron">›</span></button>`; }
  function go(next){ if(next === page) return; stack.push(page); page = next; newAppRender(); window.scrollTo({top:0,behavior:"smooth"}); }
  function back(){ const prev = stack.pop(); if(!prev) return; page = prev; newAppRender(); window.scrollTo({top:0,behavior:"smooth"}); }
  function goHome(){ page = "home"; stack = []; newAppRender(); window.scrollTo({top:0,behavior:"smooth"}); }
  // 旧ホームは廃止。入口は homeV2 に一本化する。
  function home(){ return homeV2(); }
  function branch(kind){
    const data = kind === "record" ? [["moneyRecord","money","money","支出・収入","金額、方法、カテゴリーを記録"],["healthRecord","health","heart","こころとからだ","今日の調子を記録"]] : kind === "today" ? [["flow","calendar","calendar","一日の流れ","予定と現在時刻を見る"],["theme","today","sun","テーマ設定","今日の軸をひとことで"]] : [["moneyAnalysis","analysis","money","お金の分析","支払い方法とカテゴリーの傾向"],["healthAnalysis","health","body","体調の分析","睡眠・歩数・こころ・からだ"]];
    const head = kind === "record" ? ["edit","RECORD","記録する"] : kind === "today" ? ["sun","TODAY","今日を整える"] : ["chart","REVIEW","見える化する"];
    return `<section class="v2-page v2-branch">${top(titleFor(kind),true)}${masthead(...head)}<div class="v2-list">${data.map(x=>choice(...x)).join("")}</div></section>`;
  }
  function moneyRecord(){
    const c = calc(), remaining = c.balance - c.unpaid - c.cardNow;
    const options = moneyOptions(moneyType), currentMethod = moneyType === "income" ? (S.ui.incomeMethod || "bank") : (S.ui.pay || "cash");
    const entries = [...S.spends.filter(x=>x.d===ymd(now())).map(x=>({type:"expense",...x})), ...(S.incomeLogs||[]).filter(x=>x.d===ymd(now())).map(x=>({type:"income",...x}))].sort((a,b)=>(b.t||"").localeCompare(a.t||""));
    const recordTitle = moneyType === "income" ? "収入を記録" : "支出を記録";
    return `<section class="v2-page v2-money-record">${top(titleFor(page))}<p class="v2-kicker">${icon("money")}MONEY LOG</p><div class="v2-balance"><div class="v2-balance-row primary"><span>今日使えるお金</span><button class="v2-privacy" data-v2-private>${S.ui.moneyVisible ? icon("eyeoff") + "隠す" : icon("eye") + "表示"}</button>${privateMoney(c.left)}</div><div class="v2-balance-row"><span>今残っているお金</span>${privateMoney(remaining)}</div></div><div class="v2-tabs"><button class="${moneyType === "expense" ? "on expense" : ""}" data-v2-moneytype="expense">${icon("expense")}支出</button><button class="${moneyType === "income" ? "on income" : ""}" data-v2-moneytype="income">${icon("income")}収入</button></div><h2 class="v2-form-heading">${moneyType === "income" ? icon("income") : icon("expense")}${recordTitle}</h2><div class="v2-form-row"><label for="v2Amount">${icon("money")}金額</label><input id="v2Amount" type="text" inputmode="numeric" placeholder="￥0"></div><div class="v2-form-row"><label for="v2Method">${icon("pay")}${moneyType === "income" ? "受け取り方法" : "支払い方法"}</label><select id="v2Method">${options.methods.map(([v,l])=>`<option value="${esc2(v)}" ${v===currentMethod?"selected":""}>${esc2(l)}</option>`).join("")}</select></div><div class="v2-form-row"><label for="v2Category">${icon("tag")}${moneyType === "income" ? "収入のカテゴリー" : "支出のカテゴリー"}</label><select id="v2Category">${options.cats.map(x=>`<option>${esc2(x)}</option>`).join("")}</select></div><button class="v2-primary ${moneyType === "income" ? "income" : ""}" data-v2-money-save>${icon("plus")}${recordTitle}</button><button class="v2-sub-action" data-v2-go="moneyOutlook">${icon("wallet")}お金の見通しを見る</button><div class="v2-activity">${entries.length ? entries.map(x=>`<div class="v2-activity-row ${x.type}"><span>${esc2(x.cat)}<small>${esc2(x.methodLabel || (x.pay === "card" ? "クレジットカード" : x.pay === "paypay" ? "PayPay" : "現金・引落"))}　${esc2(x.t||"")}</small></span><b>${x.type === "income" ? "+" : ""}${money(x.amt)}</b></div>`).join("") : `<p class="v2-empty">今日はまだ記録がありません</p>`}</div></section>`;
  }
  function moneyOutlook(){ const c=calc(), rest=c.balance-c.unpaid-c.cardNow; const benefit=(S.incomes||[]).find(x=>x.benefit||x.id==="benefit"); return `<section class="v2-page v2-outlook-page">${top(titleFor(page))}<p class="v2-kicker">${icon("money")}MONEY OUTLOOK</p><h2 class="v2-page-lead">お金の見通し</h2><div class="v2-balance"><div class="v2-balance-row primary"><span>今日使えるお金</span><button class="v2-privacy" data-v2-private>${S.ui.moneyVisible ? icon("eyeoff") + "隠す" : icon("eye") + "表示"}</button>${privateMoney(c.left)}</div></div><div class="v2-outline-row"><i>${icon("bank")}</i><span>今残っているお金<small>予定されている支払いを引いた残高</small></span>${privateMoney(rest)}</div><div class="v2-outline-row"><i>${icon("coin")}</i><span>生活を支える収入<small>傷病手当などの大切な収入</small></span>${privateMoney(benefit ? +benefit.amt||0 : 0,"v2-green")}</div><div class="v2-outline-row"><i>${icon("card")}</i><span>今後のカード・固定費<small>カード請求と未払いの固定費</small></span>${privateMoney(c.unpaid+c.cardNow)}</div><button class="v2-sub-action" data-v2-go="moneyAnalysis">${icon("chart")}お金の分析を見る</button></section>`; }
  function moneyAnalysis(){ const cut=new Date();cut.setDate(cut.getDate()-29);const from=ymd(cut), rec=S.spends.filter(x=>x.d>=from), byPay={cash:0,paypay:0,card:0},byCat={};rec.forEach(x=>{const n=+x.amt||0;byPay[x.pay==="card"?"card":x.pay==="paypay"?"paypay":"cash"]+=n;byCat[x.cat]=(byCat[x.cat]||0)+n});const max=Math.max(1,...Object.values(byPay));const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=cats.reduce((a,[,v])=>a+v,0), cols=["#376b91","#39785d","#7263a8","#d2a73e"];let p=0;const stops=cats.map(([,v],i)=>{const a=p;p+=sum?v/sum*100:0;return `${cols[i]} ${a}% ${p}%`}).join(",");const income=(S.incomeLogs||[]).filter(x=>x.d>=from).reduce((a,x)=>a+(+x.amt||0),0); const bar=(lab,n,color)=>`<div class="v2-bar-row"><span>${lab}</span><span class="v2-bar-track"><i class="v2-bar-fill" style="width:${n/max*100}%;--bar:${color}"></i></span><strong>${money(n)}</strong></div>`; return `<section class="v2-page v2-money-analysis">${top(titleFor(page))}<p class="v2-kicker">${icon("chart")}MONEY ANALYSIS</p><h2 class="v2-page-lead">直近30日の動き</h2><div class="v2-chart-block"><h2>収入と支出のバランス</h2>${bar("収入",income,"#39785d")}${bar("支出",rec.reduce((a,x)=>a+(+x.amt||0),0),"#376b91")}</div><div class="v2-chart-block"><h2>支払い方法</h2>${bar("カード",byPay.card,"#7263a8")}${bar("現金・引落",byPay.cash,"#376b91")}${bar("PayPay",byPay.paypay,"#d2a73e")}</div><div class="v2-chart-block"><h2>お金を使ったカテゴリー</h2>${cats.length?`<div class="v2-donut-wrap"><div class="v2-donut" style="background:conic-gradient(${stops})"></div><div>${cats.map(([k,v],i)=>`<div class="v2-legend-row"><i style="background:${cols[i]}"></i><span>${esc2(k)}</span><b>${sum?Math.round(v/sum*100):0}%</b></div>`).join("")}</div></div>`:`<p class="v2-empty">支出を記録すると、カテゴリーの比率を円グラフで表示します。</p>`}</div></section>`; }
  function shownHealth(){return Object.assign({},S.health[ymd(now())]||{},healthDraft||{});} function dots(kind,value){return `<div class="v2-rating">${[1,2,3,4,5].map(i=>`<button class="${i<= (+value||0)?"on "+kind:""}" data-v2-rate="${kind}" data-v2-value="${i}" aria-label="${i}">${i}</button>`).join("")}</div>`;}
  function healthRecord(){
    const h = shownHealth();
    const sm = sleepMin(h.bed, h.wake);
    const steps = h.steps != null ? `${(+h.steps).toLocaleString("ja-JP")}歩` : "—";
    return `<section class="v2-page v2-health-record">${top(titleFor(page))}<div class="v2-date-tag">${dateLabel(ymd(now()))}</div><h2 class="v2-page-lead">今日の調子を残す</h2><div class="v2-health-paper-grid"><section class="v2-health-paper-item"><h3>${icon("body")}からだ</h3><small>体の調子</small>${dots("body",h.body)}<b>${h.body ? `${h.body} / 5` : "未記録"}</b></section><section class="v2-health-paper-item mind"><h3>${icon("heart")}こころ</h3><small>心の調子</small>${dots("mind",h.mind)}<b>${h.mind ? `${h.mind} / 5` : "未記録"}</b></section><section class="v2-health-paper-item"><h3>${icon("moon")}睡眠</h3><strong>${fmtSleep(sm)}</strong><small>設定から自動取り込み</small></section><section class="v2-health-paper-item"><h3>${icon("foot")}歩数</h3><strong>${steps}</strong><small>設定から自動取り込み</small></section></div><details class="v2-sleep-edit"><summary>${icon("clock")}睡眠時間を編集</summary><div class="v2-form-row"><label for="v2Bed">${icon("moon")}就寝時刻</label><input id="v2Bed" type="time" value="${esc2(h.bed||"")}" data-v2-health="bed"></div><div class="v2-form-row"><label for="v2Wake">${icon("sun")}起床時刻</label><input id="v2Wake" type="time" value="${esc2(h.wake||"")}" data-v2-health="wake"></div></details><button class="v2-primary income" data-v2-health-save>${icon("download")}この日の記録を保存</button><button class="v2-sub-action" data-v2-go="healthAnalysis">${icon("chart")}体調の変化を見る</button></section>`;
  }
  function healthChart(){const ds=healthDays(), lines=[{id:"sleep",c:"#376b91",vals:ds.map(d=>Math.min(1,(sleepMin((S.health[d]||{}).bed,(S.health[d]||{}).wake)||0)/600))},{id:"steps",c:"#39785d",vals:ds.map(d=>Math.min(1,(+(S.health[d]||{}).steps||0)/10000))},{id:"body",c:"#7263a8",vals:ds.map(d=>(+(S.health[d]||{}).body||0)/5)},{id:"mind",c:"#c86655",vals:ds.map(d=>(+(S.health[d]||{}).mind||0)/5)}];const x=i=>42+i*48,y=n=>144-(n*112);const paths=lines.filter(l=>metricOn[l.id]).map(l=>`<path d="${l.vals.map((v,i)=>`${i?"L":"M"}${x(i)} ${y(v)}`).join(" ")}" stroke="${l.c}" stroke-width="3"></path>`).join("");return `<svg class="v2-line-chart" viewBox="0 0 360 178" role="img" aria-label="一週間の体調変化"><line x1="42" y1="20" x2="42" y2="144"></line><line x1="42" y1="144" x2="345" y2="144"></line><line x1="42" y1="103" x2="345" y2="103"></line><line x1="42" y1="62" x2="345" y2="62"></line><text x="8" y="25">高</text><text x="8" y="148">低</text>${ds.map((d,i)=>`<text x="${x(i)-5}" y="166">${"日月火水木金土"[new Date(d+"T00:00:00").getDay()]}</text>`).join("")}${paths}</svg>`;}
  function healthAnalysis(){const labels=[["sleep","睡眠","#376b91"],["steps","歩数","#39785d"],["body","からだ","#7263a8"],["mind","こころ","#c86655"]];return `<section class="v2-page v2-health-analysis">${top(titleFor(page))}<p class="v2-kicker">${icon("chart")}HEALTH ANALYSIS</p><h2 class="v2-page-lead">一週間の相関</h2><div class="v2-chart-block"><h2>睡眠・歩数・調子の変化</h2><div class="v2-metric-toggle">${labels.map(([id,l,c])=>`<button class="${metricOn[id]?"":"off"}" data-v2-metric="${id}"><i style="background:${c}"></i>${l}</button>`).join("")}</div>${healthChart()}</div><div class="v2-chart-block"><h2>振り返り</h2><div class="v2-outline-row"><i>${icon("moon")}</i><span>睡眠が短い日<small>5時間未満の日</small></span><strong>${healthDays().filter(d=>(sleepMin((S.health[d]||{}).bed,(S.health[d]||{}).wake)||0)<360).length}日</strong></div><div class="v2-outline-row"><i>${icon("foot")}</i><span>よく歩いた日<small>8,000歩以上の日</small></span><strong class="v2-green">${healthDays().filter(d=>+(S.health[d]||{}).steps>=8000).length}日</strong></div></div></section>`;}
  function flow(){
    const key = flowDate;
    const rec = S.daily[key] || {};
    const blocks = allBlocks(key);
    const start = typeof TL_START === "number" ? TL_START : 4 * 60;
    const end = typeof TL_END === "number" ? TL_END : 27 * 60;
    const h = Math.round(((end - start) / 60) * 28);
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
  function homeV2(){
    return `<section class="v2-page v2-home"><div class="v2-perf"></div><div class="v2-home-title">${masthead("home","HOME","暮らしのアーカイブ")}<p class="v2-home-seal"><i></i>${issueDate()} · LIFE NOTE</p></div><div class="v2-list">${choice("record","money","edit","記録する","支出・収入 / こころとからだ","01")}${choice("today","today","sun","今日を整える","一日の流れ / チェックリスト / テーマ","02")}${choice("visualize","analysis","chart","見える化する","お金 / こころとからだ","03")}</div><p class="v2-home-foot">LIFE NOTE · PERSONAL ARCHIVE</p></section>`;
  }
  function homeReturn(){ return `<button class="v2-home-return" data-v2-home>${icon("home")}<span>ホームへ戻る</span></button>`; }
  window.newAppRender = function(){const view={home:homeV2,record:()=>branch("record"),today:()=>branch("today"),visualize:()=>branch("visualize"),moneyRecord,moneyOutlook,moneyAnalysis,healthRecord,healthAnalysis,flow,checklist:checklistV2,theme,calendar,settings:settingsV2}[page]||homeV2;root.innerHTML=view();if(page!=="home")root.querySelector(".v2-page")?.insertAdjacentHTML("beforeend",homeReturn());if(page==="settings")root.querySelectorAll(".v2-settings summary>i").forEach(el=>{el.innerHTML=icon("folder")});document.body.dataset.v2Scroll=["home","record","today","visualize"].includes(page)?"locked":"auto";};
  const baseNewAppRender = window.newAppRender;
  window.newAppRender = function(){
    baseNewAppRender();
    if(page === "healthRecord"){
      const sleepCard=root.querySelector(".v2-health-paper-item:nth-child(3)"), sleepEdit=root.querySelector(".v2-sleep-edit");
      if(sleepCard && sleepEdit) sleepCard.appendChild(sleepEdit);
    }
  };
  root.addEventListener("click",e=>{const t=e.target.closest("[data-v2-go],[data-v2-back],[data-v2-moneytype],[data-v2-money-save],[data-v2-private],[data-v2-rate],[data-v2-health-save],[data-v2-metric],[data-v2-plan-open],[data-v2-habit],[data-v2-task],[data-v2-theme-save],[data-v2-cal-mode],[data-v2-cal-date],[data-v2-sync],[data-v2-role],[data-v2-habit-add],[data-v2-card-cap],[data-v2-export]");if(!t)return;if(t.hasAttribute("data-v2-back")){back();return;}if(t.dataset.v2Go){go(t.dataset.v2Go);return;}if(t.dataset.v2Moneytype){moneyType=t.dataset.v2Moneytype;newAppRender();return;}if(t.hasAttribute("data-v2-private")){S.ui.moneyVisible=!S.ui.moneyVisible;save();newAppRender();return;}if(t.hasAttribute("data-v2-money-save")){const amt=document.getElementById("v2Amount").value,method=document.getElementById("v2Method"),cat=document.getElementById("v2Category").value;if(moneyType==="income")addIncomeLog(amt,cat,method.value,method.selectedOptions[0]?.textContent);else addSpend(amt,cat,method.value,method.selectedOptions[0]?.textContent);return;}if(t.dataset.v2Rate){healthDraft=Object.assign({},healthDraft||{}, {[t.dataset.v2Rate]:+t.dataset.v2Value});newAppRender();return;}if(t.hasAttribute("data-v2-health-save")){if(!canWrite())return;const key=ymd(now());S.health[key]=Object.assign({},S.health[key]||{},healthDraft||{});healthDraft=null;save();render();toast("この日の記録を保存しました");return;}if(t.dataset.v2Metric){metricOn[t.dataset.v2Metric]=!metricOn[t.dataset.v2Metric];newAppRender();return;}if(t.hasAttribute("data-v2-plan-open")){const box=document.getElementById("v2PlanArea");box.innerHTML=`<div class="v2-form-row"><label>予定</label><input id="v2PlanText" placeholder="予定の名前"></div><div class="v2-form-row"><label>開始時刻</label><input id="v2PlanFrom" type="time"></div><div class="v2-form-row"><label>終了時刻</label><input id="v2PlanTo" type="time"></div><button class="v2-primary" data-v2-plan-save>${icon("plus")}予定を保存</button>`;return;}if(t.hasAttribute("data-v2-plan-save")){if(!canWrite())return;const text=document.getElementById("v2PlanText").value.trim(),from=document.getElementById("v2PlanFrom").value,to=document.getElementById("v2PlanTo").value;if(!text||!from||!to)return toast("予定・開始時刻・終了時刻を入れてください");const key=ymd(now());(S.plan[key]||(S.plan[key]=[])).push({id:uid(),text,from,to,cat:"custom"});save();render();return;}if(t.dataset.v2Habit){if(!canWrite())return;const d=dayRec(ymd(now()));d.habits[t.dataset.v2Habit]=!d.habits[t.dataset.v2Habit];save();render();return;}if(t.dataset.v2Task){if(!canWrite())return;const task=S.errands.find(x=>x.id===t.dataset.v2Task);if(task){task.done=!task.done;task.doneAt=task.done?ymd(now()):null;save();render();}return;}if(t.hasAttribute("data-v2-theme-save")){if(!canWrite())return;dayRec(ymd(now())).theme=document.getElementById("v2Theme").value.trim();save();render();toast("テーマを保存しました");return;}if(t.dataset.v2CalMode){calendarMode=t.dataset.v2CalMode;newAppRender();return;}if(t.dataset.v2CalDate){calendarDate=t.dataset.v2CalDate;go("flow");return;}if(t.hasAttribute("data-v2-sync")){pullRemote(false);return;}if(t.hasAttribute("data-v2-role")){const c=syncCfg();c.role=c.role==="ro"?"rw":"ro";setSyncCfg(c);rolePaint();newAppRender();return;}if(t.hasAttribute("data-v2-habit-add")){if(!canWrite())return;const label=document.getElementById("v2HabitLabel").value.trim();if(!label)return toast("項目名を入れてください");S.habits=habitList().slice();S.habits.push({id:uid(),icon:"・",label});save();render();return;}if(t.hasAttribute("data-v2-card-cap")){if(!canWrite())return;S.cardCap=Math.max(0,moneyAmount(document.getElementById("v2CardCap").value));save();render();toast("カードの上限を保存しました");return;}if(t.hasAttribute("data-v2-export")){document.getElementById("expBtn")?.click();return;}});
  root.addEventListener("input",e=>{if(e.target.id==="v2Amount"){const n=moneyAmount(e.target.value);e.target.value=n?`￥${n.toLocaleString("ja-JP")}`:"";}if(e.target.dataset.v2Health){healthDraft=Object.assign({},healthDraft||{},{[e.target.dataset.v2Health]:e.target.value});}});
  root.addEventListener("click", event => { if(event.target.closest("[data-v2-home]")){ goHome(); } });
  root.addEventListener("click", event => {
    const selected = event.target.closest("[data-v2-cal-date],[data-v2-habit],[data-v2-task],[data-v2-theme-save],[data-v2-plan-save]");
    if(selected?.dataset.v2CalDate){ flowDate=selected.dataset.v2CalDate; calendarDate=flowDate; return; }
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
      calendarDate = flowDate;
      newAppRender();
      return;
    }
    if(event.target.closest('[data-v2-go="flow"]')){
      flowDate = ymd(now());
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
  newAppRender();
})();
