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
  let calendarMode = "week";
  let calendarDate = ymd(now());
  let flowDate = ymd(now());
  const metricOn = {sleep:true, steps:true, body:true, mind:true};

  const icon = (name, cls = "") => {
    const p = {
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
  const esc2 = value => esc(String(value == null ? "" : value));
  const money = value => yen(+value || 0);
  const dateLabel = key => { const d = new Date(key + "T00:00:00"); return `${d.getMonth()+1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`; };
  const privateMoney = (value, cls = "") => S.ui.moneyVisible ? `<b class="${(+value < 0 ? "v2-negative " : "") + cls}">${money(value)}</b>` : `<b class="v2-muted">---</b>`;
  const titleFor = p => ({home:"まとめて管理",record:"記録する",moneyRecord:"支出・収入を記録",moneyOutlook:"お金の見通し",moneyAnalysis:"お金の分析",healthRecord:"こころとからだ",healthAnalysis:"体調の分析",today:"今日を整える",flow:"一日の流れ",checklist:"チェックリスト",theme:"今日のテーマ",calendar:"週・月を見る",settings:"設定"}[p] || "まとめて管理");
  function top(title, settings = false){
    return `<header class="v2-top">${stack.length ? `<button class="v2-back" data-v2-back>${icon("back")}戻る</button>` : `<span></span>`}<h1>${esc2(title)}</h1>${settings ? `<button class="v2-top-action" data-v2-go="settings">${icon("settings")}設定</button>` : `<span class="v2-top-placeholder"></span>`}</header>`;
  }
  function choice(to, tone, i, label, sub){ return `<button class="v2-choice" data-v2-go="${to}" data-tone="${tone}"><span class="v2-icon-bed">${icon(i)}</span><span><strong>${label}</strong>${sub ? `<small>${sub}</small>` : ""}</span><span class="v2-chevron">›</span></button>`; }
  function go(next){ if(next === page) return; stack.push(page); page = next; newAppRender(); window.scrollTo({top:0,behavior:"smooth"}); }
  function back(){ const prev = stack.pop(); if(!prev) return; page = prev; newAppRender(); window.scrollTo({top:0,behavior:"smooth"}); }
  function home(){ return `<section class="v2-page"><div class="v2-brand"><span class="v2-mark"><i></i><i></i><i></i></span>LIFE NOTE</div><h1 class="v2-home-title">いま、何をしますか？</h1><div class="v2-list">${choice("record","money","edit","記録する","支出・収入、こころとからだ")}${choice("today","today","sun","今日を整える","一日の流れ、テーマ")}${choice("visualize","analysis","chart","見える化する","お金と体調を振り返る")}</div><p class="v2-home-foot">まとめて管理</p></section>`; }
  function branch(kind){
    const data = kind === "record" ? [["moneyRecord","money","money","支出・収入","金額、方法、カテゴリーを記録"],["healthRecord","health","heart","こころとからだ","今日の調子を記録"]] : kind === "today" ? [["flow","calendar","calendar","一日の流れ","予定と現在時刻を見る"],["theme","today","sun","テーマ設定","今日の軸をひとことで"]] : [["moneyAnalysis","analysis","chart","お金の分析","支払い方法とカテゴリーの傾向"],["healthAnalysis","health","chart","体調の分析","睡眠・歩数・こころ・からだ"]];
    return `<section class="v2-page">${top(titleFor(kind),true)}<p class="v2-kicker">${icon(kind === "record" ? "edit" : kind === "today" ? "sun" : "chart")}${kind === "record" ? "何を記録しますか？" : kind === "today" ? "何をしますか？" : "何を見える化しますか？"}</p><div class="v2-list">${data.map(x=>choice(...x)).join("")}</div></section>`;
  }
  function moneyRecord(){
    const c = calc(), remaining = c.balance - c.unpaid - c.cardNow;
    const options = moneyOptions(moneyType), currentMethod = moneyType === "income" ? (S.ui.incomeMethod || "bank") : (S.ui.pay || "cash");
    const entries = [...S.spends.filter(x=>x.d===ymd(now())).map(x=>({type:"expense",...x})), ...(S.incomeLogs||[]).filter(x=>x.d===ymd(now())).map(x=>({type:"income",...x}))].sort((a,b)=>(b.t||"").localeCompare(a.t||""));
    return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("money")}おかね</p><div class="v2-balance"><div class="v2-balance-row primary"><span>今日使えるお金</span><button class="v2-privacy" data-v2-private>${S.ui.moneyVisible ? icon("eyeoff") + "隠す" : icon("eye") + "表示"}</button>${privateMoney(c.left)}</div><div class="v2-balance-row"><span>今残っているお金</span>${privateMoney(remaining)}</div></div><div class="v2-tabs"><button class="${moneyType === "expense" ? "on expense" : ""}" data-v2-moneytype="expense">支出</button><button class="${moneyType === "income" ? "on income" : ""}" data-v2-moneytype="income">収入</button></div><div class="v2-form-row"><label for="v2Amount">金額</label><input id="v2Amount" type="text" inputmode="numeric" placeholder="￥0"></div><div class="v2-form-row"><label for="v2Method">${moneyType === "income" ? "受け取り方法" : "支払い方法"}</label><select id="v2Method">${options.methods.map(([v,l])=>`<option value="${esc2(v)}" ${v===currentMethod?"selected":""}>${esc2(l)}</option>`).join("")}</select></div><div class="v2-form-row"><label for="v2Category">${moneyType === "income" ? "収入のカテゴリー" : "支出のカテゴリー"}</label><select id="v2Category">${options.cats.map(x=>`<option>${esc2(x)}</option>`).join("")}</select></div><button class="v2-primary ${moneyType === "income" ? "income" : ""}" data-v2-money-save>${icon("plus")}${moneyType === "income" ? "収入を記録" : "支出を記録"}</button><button class="v2-sub-action" data-v2-go="moneyOutlook">${icon("wallet")}お金の見通しを見る</button><div class="v2-activity">${entries.length ? entries.map(x=>`<div class="v2-activity-row ${x.type}"><span>${esc2(x.cat)}<small>${esc2(x.methodLabel || (x.pay === "card" ? "クレジットカード" : x.pay === "paypay" ? "PayPay" : "現金・引落"))}　${esc2(x.t||"")}</small></span><b>${x.type === "income" ? "+" : ""}${money(x.amt)}</b></div>`).join("") : `<p class="v2-empty">今日はまだ記録がありません</p>`}</div></section>`;
  }
  function moneyOutlook(){ const c=calc(), rest=c.balance-c.unpaid-c.cardNow; const benefit=(S.incomes||[]).find(x=>x.benefit||x.id==="benefit"); return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("wallet")}おかね</p><div class="v2-balance"><div class="v2-balance-row primary"><span>今日使えるお金</span><button class="v2-privacy" data-v2-private>${S.ui.moneyVisible ? "隠す" : "表示"}</button>${privateMoney(c.left)}</div></div><div class="v2-outline-row"><i>${icon("bank")}</i><span>今残っているお金<small>口座・現金・PayPayから予定支払いを引いた額</small></span>${privateMoney(rest)}</div><div class="v2-outline-row"><i>${icon("coin")}</i><span>生活を支える収入<small>手当など、生活の基盤になる収入</small></span>${privateMoney(benefit ? +benefit.amt||0 : 0,"v2-green")}</div><div class="v2-outline-row"><i>${icon("card")}</i><span>今後のカード・固定費<small>カード請求と未払いの固定費</small></span>${privateMoney(c.unpaid+c.cardNow)}</div><button class="v2-sub-action" data-v2-go="moneyAnalysis">${icon("chart")}お金の分析を見る</button></section>`; }
  function moneyAnalysis(){ const cut=new Date();cut.setDate(cut.getDate()-29);const from=ymd(cut), rec=S.spends.filter(x=>x.d>=from), byPay={cash:0,paypay:0,card:0},byCat={};rec.forEach(x=>{const n=+x.amt||0;byPay[x.pay==="card"?"card":x.pay==="paypay"?"paypay":"cash"]+=n;byCat[x.cat]=(byCat[x.cat]||0)+n});const max=Math.max(1,...Object.values(byPay));const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=cats.reduce((a,[,v])=>a+v,0), cols=["#75bcf3","#60d59d","#b19bff","#f1c35b"];let p=0;const stops=cats.map(([,v],i)=>{const a=p;p+=sum?v/sum*100:0;return `${cols[i]} ${a}% ${p}%`}).join(",");const c=calc();const income=(S.incomeLogs||[]).filter(x=>x.d>=from).reduce((a,x)=>a+(+x.amt||0),0); const bar=(lab,n,color)=>`<div class="v2-bar-row"><span>${lab}</span><span class="v2-bar-track"><i class="v2-bar-fill" style="width:${n/max*100}%;background:${color}"></i></span><strong>${money(n)}</strong></div>`; return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("chart")}見える化する</p><div class="v2-chart-block"><h2>収入と支出のバランス</h2>${bar("収入",income,"#60d59d")}${bar("支出",rec.reduce((a,x)=>a+(+x.amt||0),0),"#75bcf3")}</div><div class="v2-chart-block"><h2>直近30日の支払い方法</h2>${bar("カード",byPay.card,"#6a93ca")}${bar("現金・引落",byPay.cash,"#75bcf3")}${bar("PayPay",byPay.paypay,"#b19bff")}</div><div class="v2-chart-block"><h2>お金を使ったカテゴリー</h2>${cats.length?`<div class="v2-donut-wrap"><div class="v2-donut" style="background:conic-gradient(${stops})"></div><div>${cats.map(([k,v],i)=>`<div class="v2-legend-row"><i style="background:${cols[i]}"></i><span>${esc2(k)}</span><b>${sum?Math.round(v/sum*100):0}%</b></div>`).join("")}</div></div>`:`<p class="v2-empty">支出を記録すると、カテゴリーの比率を円グラフで表示します。</p>`}</div></section>`; }
  function shownHealth(){return Object.assign({},S.health[ymd(now())]||{},healthDraft||{});} function dots(kind,value){return `<div class="v2-rating">${[1,2,3,4,5].map(i=>`<button class="${i<= (+value||0)?"on "+kind:""}" data-v2-rate="${kind}" data-v2-value="${i}" aria-label="${i}">${i}</button>`).join("")}</div>`;}
  function healthRecord(){
    const h = shownHealth();
    const sm = sleepMin(h.bed, h.wake);
    const steps = h.steps != null ? `${(+h.steps).toLocaleString("ja-JP")}歩` : "—";
    return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("heart")}記録する</p><div class="v2-rate-section"><h2>${icon("body")}からだの調子</h2>${dots("body",h.body)}</div><div class="v2-rate-section mind"><h2>${icon("heart")}こころの調子</h2>${dots("mind",h.mind)}</div><div class="v2-health-metrics"><div><span>${icon("moon")}睡眠時間</span><strong>${fmtSleep(sm)}</strong></div><div><span>${icon("foot")}歩数</span><strong>${steps}</strong></div></div><div class="v2-form-row"><label for="v2Bed">就寝時刻</label><input id="v2Bed" type="time" value="${esc2(h.bed||"")}" data-v2-health="bed"></div><div class="v2-form-row"><label for="v2Wake">起床時刻</label><input id="v2Wake" type="time" value="${esc2(h.wake||"")}" data-v2-health="wake"></div><button class="v2-primary income" data-v2-health-save>${icon("download")}この日の記録を保存</button><button class="v2-sub-action" data-v2-go="healthAnalysis">${icon("chart")}体調を分析する</button></section>`;
  }
  function healthChart(){const ds=healthDays(), lines=[{id:"sleep",c:"#75bcf3",vals:ds.map(d=>Math.min(1,(sleepMin((S.health[d]||{}).bed,(S.health[d]||{}).wake)||0)/600))},{id:"steps",c:"#60d59d",vals:ds.map(d=>Math.min(1,(+(S.health[d]||{}).steps||0)/10000))},{id:"body",c:"#b19bff",vals:ds.map(d=>(+(S.health[d]||{}).body||0)/5)},{id:"mind",c:"#f18a82",vals:ds.map(d=>(+(S.health[d]||{}).mind||0)/5)}];const x=i=>42+i*48,y=n=>144-(n*112);const paths=lines.filter(l=>metricOn[l.id]).map(l=>`<path d="${l.vals.map((v,i)=>`${i?"L":"M"}${x(i)} ${y(v)}`).join(" ")}" stroke="${l.c}" stroke-width="3"></path>`).join("");return `<svg class="v2-line-chart" viewBox="0 0 360 178" role="img" aria-label="一週間の体調変化"><line x1="42" y1="20" x2="42" y2="144"></line><line x1="42" y1="144" x2="345" y2="144"></line><line x1="42" y1="103" x2="345" y2="103"></line><line x1="42" y1="62" x2="345" y2="62"></line><text x="8" y="25">高</text><text x="8" y="148">低</text>${ds.map((d,i)=>`<text x="${x(i)-5}" y="166">${"日月火水木金土"[new Date(d+"T00:00:00").getDay()]}</text>`).join("")}${paths}</svg>`;}
  function healthAnalysis(){const labels=[["sleep","睡眠","#75bcf3"],["steps","歩数","#60d59d"],["body","からだ","#b19bff"],["mind","こころ","#f18a82"]];return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("chart")}見える化する</p><div class="v2-chart-block"><h2>一週間の変化</h2><div class="v2-metric-toggle">${labels.map(([id,l,c])=>`<button class="${metricOn[id]?"":"off"}" data-v2-metric="${id}"><i style="background:${c}"></i>${l}</button>`).join("")}</div>${healthChart()}</div><div class="v2-chart-block"><h2>振り返り</h2><div class="v2-outline-row"><i>${icon("moon")}</i><span>睡眠が短い日<small>こころとからだの記録を並べて見ます</small></span><strong>${healthDays().filter(d=>(sleepMin((S.health[d]||{}).bed,(S.health[d]||{}).wake)||0)<360).length}日</strong></div><div class="v2-outline-row"><i>${icon("foot")}</i><span>よく歩いた日<small>からだの調子との関係を振り返ります</small></span><strong class="v2-green">${healthDays().filter(d=>+(S.health[d]||{}).steps>=8000).length}日</strong></div></div></section>`;}
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
      return `<div class="v2-event" style="top:${(a-start)/(end-start)*h}px;height:${Math.max(42,(z-a)/(end-start)*h-3)}px;border-color:${esc2(b.color||catOf(b.cat).color)}"><strong>${esc2(b.text)}</strong><span>${toHHMM(a % 1440)} - ${toHHMM(z % 1440)}</span></div>`;
    }).join("");
    const n=now(), nowM=n.getHours()*60+n.getMinutes(), isToday=key===ymd(n);
    const nowline=isToday&&nowM>=start&&nowM<=end?`<div class="v2-now" style="top:${(nowM-start)/(end-start)*h}px"><b>いま ${toHHMM(nowM)}</b></div>`:"";
    return `<section class="v2-page">${top(titleFor(page))}<div class="v2-theme-line"><div><small>${dateLabel(key)}</small><div class="v2-theme-marquee"><strong>${esc2(rec.theme||"今日のテーマを設定")}</strong></div></div>${icon("edit")}</div><div class="v2-timeline" style="min-height:${h}px">${slots.join("")}${events}${nowline}</div><div class="v2-flow-actions"><button data-v2-plan-open>${icon("plus")}<span>予定を足す</span>${icon("back")}</button><button data-v2-go="checklist">${icon("list")}<span>チェックリストを開く</span>${icon("back")}</button><button data-v2-go="calendar">${icon("calendar")}<span>週／月を見る</span>${icon("back")}</button></div><div id="v2PlanArea"></div></section>`;
  }
  function checklist(){const key=ymd(now()),rec=S.daily[key]||{habits:{}},tasks=plannedOn(key).slice().sort((a,b)=>PRIOS.findIndex(p=>p.id===autoPriority(a).id)-PRIOS.findIndex(p=>p.id===autoPriority(b).id));return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("list")}${dateLabel(key)}</p><section class="v2-check-section"><h2>毎日の習慣</h2><div class="v2-habits">${habitList().map(h=>`<button class="v2-habit ${rec.habits&&rec.habits[h.id]?"on":""}" data-v2-habit="${esc2(h.id)}"><i>${esc2(h.icon||"・")}</i>${esc2(h.label)}</button>`).join("")}</div></section><section class="v2-check-section"><h2>今日やること</h2>${tasks.length?tasks.map(t=>{const p=autoPriority(t);return `<button class="v2-task ${t.done?"done":""}" data-v2-task="${esc2(t.id)}"><i class="v2-check">✓</i><span><strong>${esc2(t.text)}</strong><small style="color:${p.color}">${esc2(p.label)}</small></span></button>`}).join(""):`<p class="v2-empty">予定を足すと、ここで完了を記録できます。</p>`}</section></section>`;}
  function theme(){const key=ymd(now()),value=(S.daily[key]||{}).theme||"";return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("sun")}今日を整える</p><h2 class="v2-heading">今日をどう過ごしたい？</h2><div class="v2-form-row"><label for="v2Theme">テーマ</label><input id="v2Theme" value="${esc2(value)}" maxlength="40" placeholder="ひとことで書く"></div><button class="v2-primary" data-v2-theme-save>${icon("download")}テーマを保存</button></section>`;}
  function calendar(){const base=new Date(calendarDate+"T00:00:00"),mon=new Date(base);mon.setDate(base.getDate()-((base.getDay()+6)%7));let content="";if(calendarMode==="week"){content=`<div class="v2-week">${Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const key=ymd(d),bs=allBlocks(key);return `<button class="v2-week-day ${key===ymd(now())?"today":""}" data-v2-cal-date="${key}"><span>${"月火水木金土日"[i]}</span><b>${d.getDate()}</b>${bs.slice(0,3).map(b=>`<i class="v2-cal-dot" style="background:${esc2(b.color||catOf(b.cat).color)}"></i>`).join("")}</button>`}).join("")}</div>`;}else{const y=base.getFullYear(),m=base.getMonth(),days=new Date(y,m+1,0).getDate(),off=(new Date(y,m,1).getDay()+6)%7;content=`<div class="v2-month">${Array.from({length:off},()=>"<span></span>").join("")}${Array.from({length:days},(_,i)=>{const d=i+1,key=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,has=allBlocks(key).length;return `<button class="${key===ymd(now())?"today ":""}${has?"has":""}" data-v2-cal-date="${key}">${d}</button>`}).join("")}</div>`;}return `<section class="v2-page">${top(titleFor(page))}<div class="v2-calendar-switch"><button class="${calendarMode==="week"?"on":""}" data-v2-cal-mode="week">1週間</button><button class="${calendarMode==="month"?"on":""}" data-v2-cal-mode="month">1か月</button></div>${content}<p class="v2-note">日付をタップすると、その日の時間割を開きます。</p></section>`;}
  function settings(){const cfg=syncCfg(),habitItems=habitList().map(h=>`<span class="v2-habit"><i>${esc2(h.icon||"・")}</i>${esc2(h.label)}</span>`).join("");return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("settings")}まとめて管理</p><div class="v2-settings"><details><summary><i>${icon("refresh")}</i><span><strong>同期・歩数／睡眠</strong><small>${cfg.role==="ro"?"見るだけ":"記録する（歩数を受け取る）"}</small></span></summary><div class="v2-settings-body"><p>${cfg.token&&cfg.gistId?"同期は接続済みです。アプリを開いたときに最新の歩数・睡眠を確認します。":"同期は未設定です。既存の同期設定から接続できます。"}</p><button class="v2-sub-action" data-v2-sync>今すぐ同期する</button><button class="v2-sub-action" data-v2-role>${cfg.role==="ro"?"記録する端末にする":"見るだけの端末にする"}</button></div></details><details><summary><i>${icon("list")}</i><span><strong>毎日の習慣</strong><small>今日の流れに表示する項目</small></span></summary><div class="v2-settings-body"><div class="v2-habits">${habitItems}</div><input id="v2HabitLabel" placeholder="項目名を追加"><button class="v2-sub-action" data-v2-habit-add>${icon("plus")}習慣を追加</button></div></details><details><summary><i>${icon("wallet")}</i><span><strong>お金の初期設定</strong><small>カード上限・方法・カテゴリー</small></span></summary><div class="v2-settings-body"><label class="v2-muted">カードの上限</label><input id="v2CardCap" type="number" inputmode="numeric" value="${+S.cardCap||0}"><button class="v2-sub-action" data-v2-card-cap>保存</button></div></details><details><summary><i>${icon("calendar")}</i><span><strong>カレンダー連携</strong><small>予定の取り込みと表示</small></span></summary><div class="v2-settings-body"><p>予定は「一日の流れ」から確認・追加できます。PCからの納品予定の取り込みは既存の同期設定に保存されています。</p></div></details><details><summary><i>${icon("download")}</i><span><strong>バックアップ</strong><small>この端末のデータを保存</small></span></summary><div class="v2-settings-body"><p>端末の記録を書き出して保管できます。</p><button class="v2-sub-action" data-v2-export>${icon("download")}データを書き出す</button></div></details></div></section>`;}
  function checklistV2(){
    const key=flowDate, rec=S.daily[key]||{habits:{}};
    const tasks=plannedOn(key).slice().sort((a,b)=>PRIOS.findIndex(p=>p.id===autoPriority(a).id)-PRIOS.findIndex(p=>p.id===autoPriority(b).id));
    const habits=habitList().map(h=>`<button class="v2-habit ${rec.habits&&rec.habits[h.id]?"on":""}" data-v2-habit="${esc2(h.id)}"><i>${esc2(h.icon||"•")}</i>${esc2(h.label)}</button>`).join("");
    const list=tasks.length ? tasks.map(t=>{const p=autoPriority(t);return `<button class="v2-task ${t.done?"done":""}" data-v2-task="${esc2(t.id)}"><i class="v2-check">✓</i><span><strong>${esc2(t.text)}</strong><small style="color:${p.color}">${esc2(p.label)}</small></span></button>`;}).join("") : `<p class="v2-empty">予定を足すと、ここで状態を記録できます。</p>`;
    return `<section class="v2-page">${top(titleFor(page))}<p class="v2-kicker">${icon("list")}${dateLabel(key)}</p><section class="v2-check-section"><h2>今日の習慣</h2><div class="v2-habits">${habits}</div></section><section class="v2-check-section"><h2>今日やること</h2>${list}</section></section>`;
  }
  function settingsV2(){
    const cfg=syncCfg();
    const methods=[...(S.expenseMethods||[])].map(esc2).join("、") || "追加なし";
    const categories=[...(S.expenseCats||[])].map(esc2).join("、") || "追加なし";
    return `<section class="v2-page">${top("設定")}<p class="v2-kicker">${icon("settings")}まとめて管理</p><div class="v2-settings">
      <details><summary><i>${icon("refresh")}</i><span><strong>同期・歩数／睡眠</strong><small>${cfg.token&&cfg.gistId?"同期済み・アプリを開くと更新します":"未接続"}</small></span></summary><div class="v2-settings-body"><p>歩数と睡眠は、設定済みのiPhoneショートカット／同期から読み込みます。</p><label>GitHubトークン</label><input id="v2SyncToken" type="password" autocomplete="off" placeholder="初回設定時のみ入力"><label>Gist ID</label><input id="v2SyncGist" value="${esc2(cfg.gistId||"")}" placeholder="2台目のみ入力"><button class="v2-sub-action" data-v2-sync-start>${icon("refresh")}同期を設定・開始</button><button class="v2-sub-action" data-v2-sync>今すぐ同期する</button><button class="v2-sub-action" data-v2-role>${cfg.role==="ro"?"記録する端末にする":"見るだけの端末にする"}</button></div></details>
      <details><summary><i>${icon("list")}</i><span><strong>毎日の習慣</strong><small>今日の流れに表示する項目</small></span></summary><div class="v2-settings-body"><div class="v2-habits">${habitList().map(h=>`<span class="v2-habit"><i>${esc2(h.icon||"•")}</i>${esc2(h.label)}</span>`).join("")}</div><label>習慣の名前</label><input id="v2HabitLabel" placeholder="例：ストレッチ"><button class="v2-sub-action" data-v2-habit-add>${icon("plus")}習慣を追加</button></div></details>
      <details><summary><i>${icon("wallet")}</i><span><strong>お金の初期設定</strong><small>カード上限・方法・カテゴリー</small></span></summary><div class="v2-settings-body"><label>カードの上限</label><input id="v2CardCap" type="text" inputmode="numeric" value="${(+S.cardCap||0).toLocaleString("ja-JP")}"><button class="v2-sub-action" data-v2-card-cap>上限を保存</button><hr><label>支出の方法</label><small>追加済み：${methods}</small><input id="v2MethodAdd" placeholder="例：交通系IC"><button class="v2-sub-action" data-v2-method-add>方法を追加</button><label>支出のカテゴリー</label><small>追加済み：${categories}</small><input id="v2CategoryAdd" placeholder="例：医療費"><button class="v2-sub-action" data-v2-category-add>カテゴリーを追加</button><hr><label>収入の受け取り方法</label><input id="v2IncomeMethodAdd" placeholder="例：PayPay"><button class="v2-sub-action" data-v2-income-method-add>方法を追加</button><label>収入のカテゴリー</label><input id="v2IncomeCategoryAdd" placeholder="例：傷病手当"><button class="v2-sub-action" data-v2-income-category-add>カテゴリーを追加</button></div></details>
      <details><summary><i>${icon("calendar")}</i><span><strong>カレンダー連携</strong><small>予定の取り込みと表示</small></span></summary><div class="v2-settings-body"><p>予定は「一日の流れ」から確認・追加できます。</p></div></details>
      <details><summary><i>${icon("download")}</i><span><strong>バックアップ</strong><small>この端末のデータを保存</small></span></summary><div class="v2-settings-body"><p>端末の記録を書き出して保管できます。</p><button class="v2-sub-action" data-v2-export>${icon("download")}データを書き出す</button></div></details>
    </div></section>`;
  }
  function homeV2(){
    return `<section class="v2-page v2-home"><div class="v2-home-top"><span>まとめて管理</span><button aria-label="設定" data-v2-go="settings">${icon("settings")}</button></div><div class="v2-brand"><span class="v2-mark"><i></i><i></i><i></i></span>LIFE NOTE</div><h1 class="v2-home-title">いま、何をしますか？</h1><div class="v2-list">${choice("record","money","edit","記録する","支出・収入、こころとからだ")}${choice("today","today","sun","今日を整える","一日の流れ、テーマ")}${choice("visualize","analysis","chart","見える化する","お金と体調を振り返る")}</div><p class="v2-home-foot">必要なところから、ひとつずつ。</p></section>`;
  }
  window.newAppRender = function(){const view={home:homeV2,record:()=>branch("record"),today:()=>branch("today"),visualize:()=>branch("visualize"),moneyRecord,moneyOutlook,moneyAnalysis,healthRecord,healthAnalysis,flow,checklist:checklistV2,theme,calendar,settings:settingsV2}[page]||homeV2;root.innerHTML=view();};
  root.addEventListener("click",e=>{const t=e.target.closest("[data-v2-go],[data-v2-back],[data-v2-moneytype],[data-v2-money-save],[data-v2-private],[data-v2-rate],[data-v2-health-save],[data-v2-metric],[data-v2-plan-open],[data-v2-habit],[data-v2-task],[data-v2-theme-save],[data-v2-cal-mode],[data-v2-cal-date],[data-v2-sync],[data-v2-role],[data-v2-habit-add],[data-v2-card-cap],[data-v2-export]");if(!t)return;if(t.hasAttribute("data-v2-back")){back();return;}if(t.dataset.v2Go){go(t.dataset.v2Go);return;}if(t.dataset.v2Moneytype){moneyType=t.dataset.v2Moneytype;newAppRender();return;}if(t.hasAttribute("data-v2-private")){S.ui.moneyVisible=!S.ui.moneyVisible;save();newAppRender();return;}if(t.hasAttribute("data-v2-money-save")){const amt=document.getElementById("v2Amount").value,method=document.getElementById("v2Method"),cat=document.getElementById("v2Category").value;if(moneyType==="income")addIncomeLog(amt,cat,method.value,method.selectedOptions[0]?.textContent);else addSpend(amt,cat,method.value,method.selectedOptions[0]?.textContent);return;}if(t.dataset.v2Rate){healthDraft=Object.assign({},healthDraft||{}, {[t.dataset.v2Rate]:+t.dataset.v2Value});newAppRender();return;}if(t.hasAttribute("data-v2-health-save")){if(!canWrite())return;const key=ymd(now());S.health[key]=Object.assign({},S.health[key]||{},healthDraft||{});healthDraft=null;save();render();toast("この日の記録を保存しました");return;}if(t.dataset.v2Metric){metricOn[t.dataset.v2Metric]=!metricOn[t.dataset.v2Metric];newAppRender();return;}if(t.hasAttribute("data-v2-plan-open")){const box=document.getElementById("v2PlanArea");box.innerHTML=`<div class="v2-form-row"><label>予定</label><input id="v2PlanText" placeholder="予定の名前"></div><div class="v2-form-row"><label>開始時刻</label><input id="v2PlanFrom" type="time"></div><div class="v2-form-row"><label>終了時刻</label><input id="v2PlanTo" type="time"></div><button class="v2-primary" data-v2-plan-save>${icon("plus")}予定を保存</button>`;return;}if(t.hasAttribute("data-v2-plan-save")){if(!canWrite())return;const text=document.getElementById("v2PlanText").value.trim(),from=document.getElementById("v2PlanFrom").value,to=document.getElementById("v2PlanTo").value;if(!text||!from||!to)return toast("予定・開始時刻・終了時刻を入れてください");const key=ymd(now());(S.plan[key]||(S.plan[key]=[])).push({id:uid(),text,from,to,cat:"custom"});save();render();return;}if(t.dataset.v2Habit){if(!canWrite())return;const d=dayRec(ymd(now()));d.habits[t.dataset.v2Habit]=!d.habits[t.dataset.v2Habit];save();render();return;}if(t.dataset.v2Task){if(!canWrite())return;const task=S.errands.find(x=>x.id===t.dataset.v2Task);if(task){task.done=!task.done;task.doneAt=task.done?ymd(now()):null;save();render();}return;}if(t.hasAttribute("data-v2-theme-save")){if(!canWrite())return;dayRec(ymd(now())).theme=document.getElementById("v2Theme").value.trim();save();render();toast("テーマを保存しました");return;}if(t.dataset.v2CalMode){calendarMode=t.dataset.v2CalMode;newAppRender();return;}if(t.dataset.v2CalDate){calendarDate=t.dataset.v2CalDate;go("flow");return;}if(t.hasAttribute("data-v2-sync")){pullRemote(false);return;}if(t.hasAttribute("data-v2-role")){const c=syncCfg();c.role=c.role==="ro"?"rw":"ro";setSyncCfg(c);rolePaint();newAppRender();return;}if(t.hasAttribute("data-v2-habit-add")){if(!canWrite())return;const label=document.getElementById("v2HabitLabel").value.trim();if(!label)return toast("項目名を入れてください");S.habits=habitList().slice();S.habits.push({id:uid(),icon:"・",label});save();render();return;}if(t.hasAttribute("data-v2-card-cap")){if(!canWrite())return;S.cardCap=Math.max(0,moneyAmount(document.getElementById("v2CardCap").value));save();render();toast("カードの上限を保存しました");return;}if(t.hasAttribute("data-v2-export")){document.getElementById("expBtn")?.click();return;}});
  root.addEventListener("input",e=>{if(e.target.id==="v2Amount"){const n=moneyAmount(e.target.value);e.target.value=n?`￥${n.toLocaleString("ja-JP")}`:"";}if(e.target.dataset.v2Health){healthDraft=Object.assign({},healthDraft||{},{[e.target.dataset.v2Health]:e.target.value});}});
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
