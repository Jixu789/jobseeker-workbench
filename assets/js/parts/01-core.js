/* ============================================================
   CONFIG — 唯一需要定制的地方（与手机版结构一致）。
   modules 里每个模块 = 一个功能页；type 决定它长什么样、记什么字段。
   支持的 type：
     todo     今日计划/待办（勾选 + 优先级）
     checkin  习惯打卡（连续天数，每天清零）
     progress 长期计划（进度条：当前/目标）
     finance  记账（收入/支出 + 分类 + 金额）
     note     内容记录/日记（标题 + 正文 + 心情标签）
   图标用 icon 字段（取自下方 ICONS 图标库，全部为单色线性图标）。
   ============================================================ */
const CONFIG = {
  storageKey: "jobseeker-workbench-v1",   // 换 key 可强制重置
  owner: "启程",
  slogan: "从第一份简历，到第一份 Offer",

  quotes: [
    "把岗位读懂，比把简历投出去更重要。",   // 周一
    "简历不是自传，是针对岗位的一份论证。", // 周二
    "先补最硬的那块短板，再谈优化。",       // 周三
    "面试是可以练的，把答案说出来才算会。", // 周四
    "复盘一场面试，胜过盲目投十份简历。",   // 周五
    "反问不是客套，是你判断这家公司的机会。", // 周六
    "收好这一周的反馈，下周换个打法。",     // 周日
  ],

  // 仅保留两个原生模块：待办与笔记（复盘用），其余为定制视图
  modules: [
    { key:"todo", name:"复盘待办", icon:"list", tint:"#fceee2", color:"var(--accent)", type:"todo", desc:"把面试复盘建议落成行动",
      priorities:[ {key:"P0",label:"重要",color:"#f7eae7",text:"#b64d43"}, {key:"P1",label:"一般",color:"#f6efe6",text:"#a8792f"}, {key:"P2",label:"随手",color:"#eaf1ec",text:"#4f7a63"} ],
      seed:[
        {id:101,title:"为「星野科技」岗位定制一版简历",priority:"P0",done:false,note:"重点补强数据分析与 AB 测试的量化结果"},
        {id:102,title:"练 3 道项目深挖题并录音回听",priority:"P1",done:false,note:"控制在 2 分钟内，突出个人贡献"},
        {id:103,title:"整理面试官反问清单",priority:"P2",done:true,note:""}
      ] },
    { key:"note", name:"复盘笔记", icon:"pen", tint:"#f1eef4", color:"var(--module-5)", type:"note", desc:"面试复盘·话术卡·公司研究",
      moods:["面试复盘","话术卡","公司研究","行业观察"],
      seed:[
        {id:111,title:"示例：一面复盘",content:"项目讲得太长，面试官两次打断。下次先用一句话给结论，再展开背景。",mood:"面试复盘",date:isoToday()}
      ] },
  ],
};

/* ============================================================
   ICONS — 单色线性图标库（stroke 跟随 color）
   ============================================================ */
const ICONS = {
  home:'<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10.5V19h12v-8.5"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
  chart:'<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4"/><path d="M12 16v-7"/><path d="M16 16v-2"/>',
  user:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19c.7-3.2 3.2-5 6.5-5s5.8 1.8 6.5 5"/>',
  plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  menu:'<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  calendar:'<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 9.5h16"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  list:'<path d="M8.5 6h11"/><path d="M8.5 12h11"/><path d="M8.5 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>',
  leaf:'<path d="M20 4C10 4 4 9 4 17c0 1 .1 2 .5 3 5.5-9 9-9.5 15.5-16z"/><path d="M4.5 20c3-6 7-9.5 13-11.5"/>',
  book:'<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5z"/><path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H19v4H7.5A2.5 2.5 0 0 1 5 19.5z"/>',
  activity:'<path d="M3 12h4l2.5 6L14 5l2.5 7H21"/>',
  wallet:'<path d="M4 8a2 2 0 0 1 2-2h11a1.5 1.5 0 0 1 1.5 1.5V8"/><rect x="3.5" y="7.5" width="17" height="11.5" rx="2.5"/><circle cx="16.5" cy="13.2" r="1.3"/>',
  pen:'<path d="M4 20l1.2-4L16 5.2l2.8 2.8L8 19z"/><path d="M14.2 7l2.8 2.8"/>',
  camera:'<path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z"/><circle cx="12" cy="13" r="3.2"/>',
  flame:'<path d="M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-2 1-3.6 2.6-4.6C9 10.4 10.4 6.2 12 3z"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  star:'<path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 16.9l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z"/>',
  quote:'<path d="M9.5 7C7.6 7.9 6.5 9.6 6.5 12v5h5v-6H8.5c0-1.7.7-2.7 2.2-3.4zM19 7c-1.9.9-3 2.6-3 5v5h5v-6h-3c0-1.7.7-2.7 2.2-3.4z"/>',
  chevron:'<path d="M9 5l7 7-7 7"/>',
  check:'<path d="M5 12.5 10 17 19 7"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/>',
  bolt:'<path d="M13 3 5 13h5l-1 8 8-11h-5z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
  briefcase:'<rect x="2.5" y="7" width="19" height="13" rx="2.5"/><path d="M8.5 7V5.5A2.5 2.5 0 0 1 11 3h2a2.5 2.5 0 0 1 2.5 2.5V7"/><path d="M2.5 12.5h19"/>',
  file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  upload:'<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  chat:'<path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/><path d="M8 11h8M8 14.5h5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1 1-1.1 1.9"/><path d="M12 17v.2"/>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>',
  send:'<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  download:'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  building:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  award:'<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5"/>',
  alert:'<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5"/><path d="M12 17.4v.2"/>',
  spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  play:'<path d="M7 4.5 19 12 7 19.5z"/>',
};
function icon(name, size=22, sw=1.7){
  const path = ICONS[name] || ICONS.grid;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/* ============================================================
   ENGINE — 一般无需改动
   ============================================================ */
function isoToday(){ return new Date().toISOString().slice(0,10); }
function today(){ return isoToday(); }
function avgProgress(list){
  if(!list||!list.length) return { value:0, sub:"0" };
  const v = Math.round(list.reduce((s,x)=>s+Math.min(100,(x.current/x.target)*100||0),0)/list.length);
  return { value:v, sub:`${list.length} 项` };
}
const modOf = k => CONFIG.modules.find(m=>m.key===k);
const $ = s => document.querySelector(s);

/* ---------- 本机档案（同一浏览器里隔离多人数据） ---------- */
const PROFILE_KEY = "qicheng-profiles";
const ACTIVE_KEY  = "qicheng-active";
const STORE_BASE  = "qicheng-v2";
/* v1（求职作战室）旧键：只读迁移，永不删除，方便回退 */
const V1_PROFILE_KEY = "jobseeker-wb-profiles";
const V1_ACTIVE_KEY  = "jobseeker-wb-active";
const V1_STORE_BASE  = "jobseeker-workbench-v1";

/* 投递阶段：中文 status 是唯一事实，stage 由它派生（不要反向写 stage） */
const STAGES = [
  { key:"todo",      label:"待投递", color:"var(--text-tertiary)" },
  { key:"applied",   label:"已投递", color:"var(--module-2)" },
  { key:"interview", label:"面试中", color:"var(--module-3)" },
  { key:"offer",     label:"Offer",  color:"var(--success)" },
  { key:"closed",    label:"已结束", color:"var(--danger)" },
];
function stageOf(status){
  if(status==="已投递") return "applied";
  if(status==="面试中") return "interview";
  if(status==="已offer") return "offer";
  if(status==="已挂") return "closed";
  return "todo";
}
function statusOfStage(stage){
  return { todo:"在投", applied:"已投递", interview:"面试中", offer:"已offer", closed:"已挂" }[stage] || "在投";
}

/* v1 → v2 幂等迁移：补 events / appliedAt / nextAction / nextAt / todo.doneAt */
function migrateV1toV2(raw){
  if(!raw || typeof raw!=="object") return raw;
  const d = structuredClone(raw);
  d.meta = Object.assign({ createdAt:new Date().toISOString() }, d.meta||{});
  const already = d.meta.schema===2;
  d.meta.schema = 2;
  (d.jobs||[]).forEach(j=>{
    if(!Array.isArray(j.events)) j.events=[];
    if(!Array.isArray(j.applyLog)) j.applyLog=[];
    if(j.stage!==stageOf(j.status)) j.stage = stageOf(j.status);
    if(!j.appliedAt && j.stage!=="todo" && j.applyLog.length) j.appliedAt = j.applyLog[0].at || null;
    if(typeof j.nextAction!=="string") j.nextAction="";
    if(typeof j.nextAt!=="string") j.nextAt="";
    if(typeof j.applyUrl!=="string") j.applyUrl=j.applyUrl||"";
    if(!already && j.appliedAt && !j.events.some(e=>e.type==="applied"))
      j.events.push({ at:j.appliedAt, type:"applied", from:"todo", to:"applied", note:"历史投递（升级补全）" });
  });
  (d.todo||[]).forEach(t=>{
    if(t.done && !t.doneAt && !already) t.doneAt = t.updatedAt || null;
  });
  if(d.meta.migratedAt==null){
    d.meta.migratedAt = new Date().toISOString();
    d.meta.migratedFrom = 1;
  }
  return d;
}

function profiles(){
  try{ const a=JSON.parse(localStorage.getItem(PROFILE_KEY)||"[]"); return (Array.isArray(a)&&a.length)?a:[{id:"p1",name:"我的档案"}]; }
  catch(e){ return [{id:"p1",name:"我的档案"}]; }
}
function saveProfiles(list){ localStorage.setItem(PROFILE_KEY, JSON.stringify(list)); }
function activePid(){ return localStorage.getItem(ACTIVE_KEY)||localStorage.getItem(V1_ACTIVE_KEY)||"p1"; }
function setActivePid(id){ localStorage.setItem(ACTIVE_KEY, id); }
function activeProfile(){ const id=activePid(); const list=profiles(); return list.find(p=>p.id===id)||list[0]; }
function storeKey(){ return STORE_BASE+"::"+activePid(); }
function initProfiles(){
  let list=null; try{ list=JSON.parse(localStorage.getItem(PROFILE_KEY)||"null"); }catch(e){}
  /* 1) 档案列表：v2 缺失时从 v1 复制一份 */
  if(!Array.isArray(list)||!list.length){
    let v1=null; try{ v1=JSON.parse(localStorage.getItem(V1_PROFILE_KEY)||"null"); }catch(e){}
    const seed = (Array.isArray(v1)&&v1.length) ? v1 : [{id:"p1",name:"我的档案"}];
    saveProfiles(seed);
    if(!localStorage.getItem(ACTIVE_KEY)){
      const oldActive = localStorage.getItem(V1_ACTIVE_KEY);
      setActivePid(oldActive || seed[0].id || "p1");
    }
  }
  /* 2) 每个档案的数据：v2 缺失且 v1 存在 → 迁移写入 v2（v1 原样保留） */
  profiles().forEach(p=>{
    const v2key = STORE_BASE+"::"+p.id, v1key = V1_STORE_BASE+"::"+p.id;
    if(localStorage.getItem(v2key)) return;
    const legacy = localStorage.getItem(v1key) || (p.id==="p1" ? localStorage.getItem(V1_STORE_BASE) : null);
    if(!legacy) return;
    try{
      const migrated = migrateV1toV2(JSON.parse(legacy));
      localStorage.setItem(v2key, JSON.stringify(migrated));
    }catch(e){}
  });
}
initProfiles();

const store = {
  load(){
    const raw = localStorage.getItem(storeKey());
    if(raw){
      try { return migrateV1toV2(JSON.parse(raw)); } catch(e){}
    }
    const d={ meta:{ schema:2, createdAt:new Date().toISOString() } };
    CONFIG.modules.forEach(m=>d[m.key]=structuredClone(m.seed||[]));
    return d;
  },
  save(){ localStorage.setItem(storeKey(), JSON.stringify(data)); },
};
let data = store.load();
let view = "home";
let routeJobId = null;
let searchQ = "";
let jobFilter = "all";   // 岗位库筛选：all / todo(未投递) / applied(已投递)
let indFilter = "all";   // 岗位库行业筛选：all / 行业名
let pomo = { running:false, remain:25*60, total:25*60 };   // 番茄钟状态（内存态，跨渲染保留）
let clockTimer = null;                                       // 全局秒级心跳（时钟 + 番茄钟）
function persist(){ store.save(); render(); }
function pad2(n){ return String(n).padStart(2,"0"); }

/* 本周（周一起）7 天的 ISO 日期 */
function weekDates(){
  const n=new Date(); const dow=(n.getDay()+6)%7; const mon=new Date(n); mon.setDate(n.getDate()-dow);
  const arr=[]; for(let i=0;i<7;i++){ const d=new Date(mon); d.setDate(mon.getDate()+i); arr.push(d.toISOString().slice(0,10)); }
  return arr;
}
function weekNum(){ const n=new Date(); const s=new Date(n.getFullYear(),0,1);
  return Math.ceil(((n-s)/86400000 + s.getDay()+1)/7); }

/* 秒级心跳：更新时钟；番茄钟运行时倒计时 */
function startClock(){ if(clockTimer) return; clockTimer=setInterval(heartbeat,1000); heartbeat(); }
function heartbeat(){
  const el=$("#clk"); if(el){ const n=new Date(); el.textContent=`${pad2(n.getHours())}:${pad2(n.getMinutes())}:${pad2(n.getSeconds())}`; }
  if(pomo.running){ pomo.remain--; if(pomo.remain<=0) completePomo(); pomoUpdate(); }
}
function pomoUpdate(){
  const t=$("#pomo-time"); if(t){ t.textContent=`${pad2(Math.floor(pomo.remain/60))}:${pad2(pomo.remain%60)}`; }
  const fg=$("#pomo-fg"); if(fg){ const r=64,c=2*Math.PI*r; fg.style.strokeDashoffset=c*(1-pomo.remain/pomo.total); }
  const st=$("#pomo-status"); if(st) st.textContent=pomo.running?"专注中":"已暂停";
  const b=$("#pomo-toggle"); if(b) b.textContent=pomo.running?"暂停":"开始";
}
function completePomo(){ pomo.running=false; pomo.remain=pomo.total;
  data.__pomo=data.__pomo||{count:0,min:0}; data.__pomo.count++; data.__pomo.min+=Math.round(pomo.total/60); store.save();
  const c=$("#pomo-count"); if(c) c.textContent=data.__pomo.count;
  const mn=$("#pomo-min"); if(mn) mn.textContent=data.__pomo.min;
}

/* ---------- ring svg ---------- */
function ringSVG(pct, color){
  const r=25, c=2*Math.PI*r, off=c*(1-Math.min(100,pct)/100);
  return `<svg class="gauge" viewBox="0 0 60 60"><circle cx="30" cy="30" r="${r}" fill="none" stroke="var(--border)" stroke-width="5.5"/>
    <circle cx="30" cy="30" r="${r}" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
}
function trendSVG(series){
  const w=560, h=170, padX=12, padTop=16, padBot=22;
  const max=Math.max(...series), min=Math.min(...series);
  const rng=(max-min)||1;
  const innerW=w-2*padX, innerH=h-padTop-padBot;
  const pts=series.map((v,i)=>{
    const x=padX+innerW*i/(series.length-1);
    const y=padTop+innerH*(1-(v-min)/rng);
    return [x,y];
  });
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L ${padX+innerW} ${h-padBot} L ${padX} ${h-padBot} Z`;
  const dots=pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="var(--surface-card)" stroke="var(--module-2)" stroke-width="2"/>`).join('');
  return `<svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--module-2)" stop-opacity=".22"/><stop offset="1" stop-color="var(--module-2)" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#tg)"/><path d="${line}" fill="none" stroke="var(--module-2)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}

/* ---------- HOME (Bento 复杂仪表盘) ---------- */
function grp(zh,en){ return `<div class="sec-grp"><span class="bar"></span><span class="zh">${zh}</span><span class="en">${en}</span><span class="line"></span></div>`; }

/* 今日聚焦：跨模块置顶任务（就地交互，不跳转） */
function focusTileHTML(){
  const pins=[]; CONFIG.modules.forEach(m=>(data[m.key]||[]).forEach(x=>{ if(x.pinned) pins.push({m,x}); }));
  const chk=icon("check",13,2.6);
  const sub=(m,x)=>{
    if(m.type==="checkin") return `${m.name} · 连续 ${streak(x.log)} 天`;
    if(m.type==="progress"){ const p=Math.min(100,Math.round((x.current/x.target)*100||0)); return `${m.name} · ${x.current}/${x.target} ${x.unit||m.unit||''} · ${p}%`; }
    return m.name;
  };
  const ctl=(m,x)=>{
    if(m.type==="checkin"){ const on=!!(x.log&&x.log[today()]); return `<div class="pin-chk js-pin-chk ${on?'on':''}" data-mkey="${m.key}" data-id="${x.id}">${chk}</div>`; }
    if(m.type==="todo"){ return `<div class="pin-chk js-pin-chk ${x.done?'on':''}" data-mkey="${m.key}" data-id="${x.id}">${chk}</div>`; }
    if(m.type==="progress"){ return `<div class="pin-step"><button class="js-pin-dec" data-mkey="${m.key}" data-id="${x.id}">−</button><button class="js-pin-inc" data-mkey="${m.key}" data-id="${x.id}">+</button></div>`; }
    return `<span style="color:var(--text-tertiary)">${icon("chevron",16,2)}</span>`;
  };
  const rows = pins.length ? pins.map(({m,x})=>`<div class="focus-row">
      <span class="fic" style="color:${m.color}">${icon(m.icon,16)}</span>
      <div class="ft js-pin-open" data-mkey="${m.key}" data-id="${x.id}"><div class="fn ${(m.type==='todo'&&x.done)?'done':''}">${esc(x.title)}</div><div class="fm">${sub(m,x)}</div></div>
      ${ctl(m,x)}</div>`).join("")
    : `<div class="focus-empty">在任意模块点击 <span style="display:inline-flex;color:var(--module-3);vertical-align:-2px">${icon("star",13)}</span> 即可把要事置顶到这里。</div>`;
  return `<div class="tile b4"><div class="tile-h"><span class="tic">${icon("star",16)}</span><div class="tt"><span class="en">TODAY'S FOCUS</span><span class="zh">今日聚焦</span></div><span class="r">${pins.length} 项</span></div>
    <div class="focus-list">${rows}</div></div>`;
}

/* 快速记录 */
function quickTileHTML(){
  const quick = CONFIG.quickAdd.map(q=>`<button class="qbtn" data-quick="${q.module}"><span class="e" style="background:${q.tint};color:${q.color}">${icon(q.icon,20)}<i class="qplus">${icon("plus",10,3)}</i></span><span class="l">${q.label}</span></button>`).join("");
  return `<div class="tile b4"><div class="tile-h"><span class="tic">${icon("plus",16,2.2)}</span><div class="tt"><span class="en">QUICK ADD</span><span class="zh">快速记录</span></div></div>
    <div class="quick-grid" style="flex:1;align-content:start">${quick}</div></div>`;
}

/* 今日概览（环形 + 深色统计侧栏，合并原「整体情况」独有指标） */
function overviewTileHTML(){
  const rings = CONFIG.overview.map(o=>{ const r=o.calc(data);
    return `<div class="ring" data-open="${o.key}"><div class="dial">${ringSVG(r.value,o.color)}<span class="mid" style="color:${o.color}">${icon(o.icon,26)}</span></div>
      <div class="pct">${r.value}%</div><div class="lbl">${o.label}</div><div class="sub">${r.sub}</div></div>`; }).join("");
  const recCount=CONFIG.modules.reduce((s,m)=>s+((data[m.key]||[]).length),0);
  const pinCount=CONFIG.modules.reduce((s,m)=>s+((data[m.key]||[]).filter(x=>x.pinned).length),0);
  const money=data.money||[];
  const inc=money.filter(x=>x.type==="income").reduce((a,x)=>a+ +x.amount,0);
  const exp=money.filter(x=>x.type==="expense").reduce((a,x)=>a+ +x.amount,0);
  const bal=inc-exp, balCol=bal>=0?"var(--module-1)":"var(--danger)";
  return `<div class="tile b12"><div class="tile-h"><span class="tic">${icon("target",16)}</span><div class="tt"><span class="en">DAILY VITALS</span><span class="zh">今日概览</span></div><span class="r">${dateStr()}</span></div>
    <div class="ov2-body">
      <div class="rings">${rings}</div>
      <div class="ov2-side">
        <div class="ov2-stat" data-open="note"><span class="s-ic" style="color:var(--module-2)">${icon("chart",17)}</span><div class="s-tx"><div class="s-v">${recCount}</div><div class="s-l">累计记录条数</div></div></div>
        <div class="ov2-stat"><span class="s-ic" style="color:var(--module-3)">${icon("star",17)}</span><div class="s-tx"><div class="s-v">${pinCount}</div><div class="s-l">置顶要事</div></div></div>
        <div class="ov2-stat" data-open="money"><span class="s-ic" style="color:${balCol}">${icon("wallet",17)}</span><div class="s-tx"><div class="s-v" style="color:${balCol}">¥${bal}</div><div class="s-l">本月结余 · 收¥${inc} 支¥${exp}</div></div></div>
      </div>
    </div></div>`;
}

/* 本周习惯追踪表：checkin.log × 本周 7 天 */
function habitTileHTML(){
  const items=data.checkin||[]; const wk=weekDates(); const t=today(); const tIdx=wk.indexOf(t);
  const dnames=["一","二","三","四","五","六","日"];
  const palette=["var(--module-1)","var(--module-2)","var(--module-3)","var(--module-4)","var(--module-5)","var(--accent)"];
  const chk=icon("check",13,2.8);
  const ths=dnames.map((d,i)=>`<th class="${i===tIdx?'tdcol':''}">${d}</th>`).join("");
  const rows = items.length ? items.map((x,ri)=>{
    let cnt=0;
    const cells=wk.map((day,i)=>{ const on=!!(x.log&&x.log[day]); if(on)cnt++;
      return `<td class="${i===tIdx?'tdcol':''}"><span class="hcell js-habit ${on?'on':'off'}" data-id="${x.id}" data-day="${day}">${chk}</span></td>`; }).join("");
    const rate=Math.round(cnt/7*100);
    return `<tr><td class="hn"><span class="hdot" style="background:${palette[ri%palette.length]}"></span>${esc(x.title)}</td>${cells}<td class="hrate" style="color:${palette[ri%palette.length]}">${rate}%</td></tr>`;
  }).join("") : `<tr><td colspan="9" style="text-align:center;color:var(--text-tertiary);font-size:12.5px;padding:18px 0">还没有习惯，去「习惯打卡」添加吧</td></tr>`;
  return `<div class="tile b7"><div class="tile-h"><span class="tic">${icon("leaf",16)}</span><div class="tt"><span class="en">HABIT TRACKER</span><span class="zh">本周习惯追踪表</span></div><span class="r js-open" data-open="checkin">本周 · 周${dnames[((new Date().getDay())+6)%7]}</span></div>
    <table class="habit-tb"><thead><tr><th class="hh">习惯</th>${ths}<th class="hr">完成率</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* 待办清单（仪表盘式，就地勾选） */
function todoTileHTML(){
  const it=data.todo||[]; const done=it.filter(x=>x.done).length; const pct=it.length?Math.round(done/it.length*100):0;
  const chk=icon("check",12,2.8);
  const list = it.length ? it.map(x=>{ const m=modOf("todo"); const p=(m.priorities||[]).find(p=>p.key===x.priority);
    return `<div class="tk-row"><div class="tk-chk js-pin-chk ${x.done?'on':''}" data-mkey="todo" data-id="${x.id}">${chk}</div>
      <span class="tk-name ${x.done?'done':''} js-pin-open" data-mkey="todo" data-id="${x.id}">${esc(x.title)}</span>
      ${p?`<span class="badge prio" data-p="${p.key}"><span class="dot"></span>${p.label}</span>`:''}</div>`; }).join("")
    : `<div class="focus-empty">还没有待办，去「今日计划」添加吧</div>`;
  return `<div class="tile b5"><div class="tile-h"><span class="tic">${icon("list",16)}</span><div class="tt"><span class="en">TODO LIST</span><span class="zh">待办清单</span></div><span class="r js-open" data-open="todo">查看全部</span></div>
    <div class="tk-head"><span class="pct">${done}<span style="color:var(--text-secondary)">/${it.length}</span></span><span class="cnt">完成 ${pct}%</span><span class="bar"><i style="width:${pct}%"></i></span></div>
    <div class="tk-list">${list}</div></div>`;
}

/* 专注番茄钟（暗色炫酷卡 · 实时倒计时） */
function pomoTileHTML(){
  const p=data.__pomo||{count:0,min:0};
  const r=64,c=2*Math.PI*r,off=c*(1-pomo.remain/pomo.total);
  return `<div class="pomo b4"><div><div class="pen">POMODORO · 25 / 5</div><div class="pzh">专注番茄钟</div></div>
    <div class="ring-wrap"><svg width="150" height="150" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r="${r}" fill="none" stroke="rgba(244,243,240,.14)" stroke-width="7"/>
      <circle id="pomo-fg" cx="75" cy="75" r="${r}" fill="none" stroke="#e6b877" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
      <div class="ptime"><span class="t" id="pomo-time">${pad2(Math.floor(pomo.remain/60))}:${pad2(pomo.remain%60)}</span><span class="s" id="pomo-status">${pomo.running?'专注中':'保持专注'}</span></div></div>
    <div class="pctl"><button class="primary" id="pomo-toggle">${pomo.running?'暂停':'开始'}</button><button id="pomo-reset">重置</button></div>
    <div class="pstats"><div class="ps"><div class="pv" id="pomo-count">${p.count}</div><div class="pl">今日番茄</div></div>
      <div class="ps"><div class="pv" id="pomo-min">${p.min}</div><div class="pl">专注分钟</div></div>
      <div class="ps"><div class="pv">${p.count+ (pomo.running?1:0)}</div><div class="pl">轮次</div></div></div></div>`;
}

/* 心情趋势折线（复用 trend） */
function trendTileHTML(){
  const series=CONFIG.trend.series(data); const has=series.length>0;
  const avg=has?Math.round(series.reduce((a,b)=>a+b,0)/series.length):0;
  const body=has?trendSVG(series):`<div class="trend-empty">${icon("chart",26)}<span>暂无本周数据 · 在洞察中记录每日状态</span></div>`;
  return `<div class="tile b8"><div class="tile-h"><span class="tic">${icon("chart",16)}</span><div class="tt"><span class="en">MOOD TREND · 近 7 天</span><span class="zh">${CONFIG.trend.title}</span></div>${has?`<span class="r">均 ${avg}${CONFIG.trend.unit}</span>`:''}</div>
    ${body}${has?`<div class="trend-x"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>`:''}</div>`;
}

/* 月度开销：finance 支出按分类占比 */
function spendTileHTML(){
  const all=data.money||[]; const exp=all.filter(x=>x.type==="expense").reduce((a,x)=>a+ +x.amount,0);
  const palette=["var(--module-4)","var(--module-3)","var(--module-1)","var(--module-2)","var(--module-5)","var(--accent)","var(--danger)"];
  const byCat={}; all.filter(x=>x.type==="expense").forEach(x=>{ const c=x.category||"其他"; byCat[c]=(byCat[c]||0)+ +x.amount; });
  const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const rows=cats.length? cats.map((c,i)=>{ const pc=exp?Math.round(c[1]/exp*100):0; const col=palette[i%palette.length];
    return `<div class="book-row js-open" data-open="money"><span class="spine" style="background:${col}">${icon("wallet",16)}</span>
      <div class="bmid"><div class="btt">${esc(c[0])}</div><div class="bsub">¥${c[1]}</div>
        <div class="bbar"><i style="width:${pc}%;background:${col}"></i></div></div><span class="bpct" style="color:${col}">${pc}%</span></div>`; }).join("")
    : `<div class="focus-empty">暂无支出记录</div>`;
  return `<div class="tile b4"><div class="tile-h"><span class="tic">${icon("wallet",16)}</span><div class="tt"><span class="en">MONTHLY SPENDING</span><span class="zh">月度开销</span></div><span class="r js-open" data-open="money">明细</span></div>
    <div class="spend-sum"><span class="spend-total">¥${exp}</span><span class="spend-cap">本月支出 · 共 ${all.filter(x=>x.type==='expense').length} 笔</span></div>
    <div class="book-list">${rows}</div></div>`;
}

/* 在读好书：read (progress) 各书进度 */
function booksTileHTML(){
  const all=data.read||[]; const colors=["var(--module-2)","var(--module-1)","var(--module-3)","var(--module-4)","var(--module-5)"];
  const rows=all.length? all.map((x,i)=>{ const pct=Math.min(100,Math.round((x.current/x.target)*100||0)); const col=colors[i%colors.length];
    return `<div class="book-row js-open" data-open="read"><span class="spine" style="background:${col}">${icon("book",16)}</span>
      <div class="bmid"><div class="btt">${esc(x.title)}</div><div class="bsub">${x.note?esc(x.note):`${x.current}/${x.target} ${x.unit||'页'}`}</div>
        <div class="bbar"><i style="width:${pct}%;background:${col}"></i></div></div><span class="bpct" style="color:${col}">${pct}%</span></div>`; }).join("")
    : `<div class="focus-empty">还没有在读书籍，去「阅读打卡」添加吧</div>`;
  return `<div class="tile b4"><div class="tile-h"><span class="tic">${icon("book",16)}</span><div class="tt"><span class="en">CURRENTLY READING</span><span class="zh">在读好书</span></div><span class="r">${all.length} 本</span></div>
    <div class="book-list">${rows}</div></div>`;
}

/* 本周目标：sport (progress) 各项进度条 */
function goalsTileHTML(){
  const all=data.sport||[]; const colors=["var(--module-3)","var(--module-1)","var(--module-2)","var(--module-4)","var(--module-5)"];
  const rows=all.length? all.map((x,i)=>{ const pct=Math.min(100,Math.round((x.current/x.target)*100||0)); const col=colors[i%colors.length];
    return `<div class="book-row"><span class="spine" style="background:${col}">${icon("activity",16)}</span>
      <div class="bmid"><div class="btt">${pct>=100?`<span style="color:var(--module-1);display:inline-flex;vertical-align:-2px;margin-right:3px">${icon("check",13,2.6)}</span>`:''}${esc(x.title)}</div>
        <div class="bsub">${x.current}/${x.target} ${x.unit||'次'}</div>
        <div class="bbar"><i style="width:${pct}%;background:${col}"></i></div></div><span class="bpct" style="color:${col}">${pct}%</span></div>`; }).join("")
    : `<div class="focus-empty">还没有锻炼目标，去「每日锻炼」添加吧</div>`;
  return `<div class="tile b4"><div class="tile-h"><span class="tic">${icon("activity",16)}</span><div class="tt"><span class="en">WEEKLY GOALS</span><span class="zh">本周目标</span></div><span class="r js-open" data-open="sport">${all.length} 项</span></div>
    <div class="book-list">${rows}</div></div>`;
}

function renderHome(){
  const now = new Date();
  const hour = now.getHours();
  const hi = hour<5?"夜深了":hour<11?"早上好":hour<13?"中午好":hour<18?"下午好":"晚上好";
  const q = CONFIG.quotes[(now.getDay()+6)%7 % CONFIG.quotes.length];
  const job = getJob(data.activeJobId), res = getResume(data.activeResumeId);
  const m = (job && res) ? runMatch(job.id, res.id) : null;
  const next = nextAction(job, res, m);
  const tasks = (data.todo||[]).filter(t=>!t.done).slice(0,4);
  const doneCount = (data.todo||[]).filter(t=>t.done).length;
  const sessions = data.sessions||[];
  const engine = aiReady() ? "AI 增强" : "本地规则";
  /* 近期截止（含已过期）与今天到期的下一步：只列 3 天内，避免首页变清单 */
  const soonAll = (data.jobs||[]).map(j=>({ j, d:deadlineDays(j) }))
    .filter(x=>x.d!==null && x.d!==undefined && x.d<=3)
    .sort((a,b)=>a.d-b.d);
  const todayNext = (data.jobs||[]).filter(j=>j.nextAt && dayDiff(j.nextAt)===0);
  const todayIds = new Set(todayNext.map(j=>j.id));
  const soon = soonAll.filter(x=>!todayIds.has(x.j.id));
  const remindHTML = (soon.length||todayNext.length) ? `
    <div class="panel-lg mt18">
      <h3>${icon("clock",16)} 近期截止与今天该做的</h3>
      <div class="ph-sub">未来 3 天内截止（含已过期）的岗位，以及今天到期的下一步</div>
      ${todayNext.map(j=>`<a class="remind-row" href="#/jobs/${encodeURIComponent(j.id)}">
        <span class="chip must">今天</span>
        <span class="grow" style="min-width:0"><b class="rt">${esc(j.title||"未填岗位")}</b><span class="tiny">${esc(j.nextAction||"你定的下一步")}${j.company?" · "+esc(j.company):""}</span></span>
        <span class="arw" style="color:var(--text-tertiary)">${icon("chevron",15,2)}</span></a>`).join("")}
      ${soon.map(({j,d})=>`<a class="remind-row" href="#/jobs/${encodeURIComponent(j.id)}">
        <span class="chip ${d<=1?"must":"nice"}">${esc(urgentOf(d))}</span>
        <span class="grow" style="min-width:0"><b class="rt">${esc(j.title||"未填岗位")}</b><span class="tiny">${esc(j.company||"未填公司")}${j.status?" · "+esc(j.status):""}</span></span>
        <span class="arw" style="color:var(--text-tertiary)">${icon("chevron",15,2)}</span></a>`).join("")}
      <div class="flex mt8"><span class="tiny">点任意一条直达岗位详情</span><span style="flex:1"></span><a class="rlink" href="#/calendar">打开截止日历 →</a></div>
    </div>` : "";

  $("#screen").innerHTML = `
    <h2 class="sr-only">今日概览</h2>
    <div class="hero-banner">
      <div class="htop"><span class="badge demo">${icon("bolt",12)} ${engine}</span><span class="badge">${dateStr()}</span></div>
      <div class="hi">${hi}，开始今天的求职推进</div>
      <div class="sub">${esc(q)}</div>
      <div class="hstats">
        <div class="hstat"><span class="n">${(data.jobs||[]).length}</span><span class="t">在投岗位</span></div>
        <div class="hstat"><span class="n">${m?m.score:"—"}${m?'<small style="font-size:12px;color:var(--text-secondary)"> /100</small>':''}</span><span class="t">当前匹配分</span></div>
        <div class="hstat"><span class="n">${sessions.length}</span><span class="t">已完成模拟面试</span></div>
        <div class="hstat"><span class="n">${doneCount}</span><span class="t">已勾掉复盘待办</span></div>
      </div>
    </div>

    ${remindHTML}

    <div class="sec-title">下一步该做什么</div>
    <div class="panel-lg" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <span class="pin-ic" style="color:var(--accent);background:var(--accent-muted);border-color:transparent;width:42px;height:42px;border-radius:12px;display:grid;place-items:center">${icon(next.icon,20)}</span>
      <div class="grow" style="min-width:220px">
        <div style="font-size:15px;font-weight:800">${esc(next.title)}</div>
        <div class="lead" style="margin-top:3px">${esc(next.desc)}</div>
      </div>
      <button class="btn" data-next="${next.go}">${esc(next.cta)}${icon("chevron",15,2.2)}</button>
    </div>

    <div class="kpi-row mt18">
      <div class="kpi"><div class="l">${icon("briefcase",14)} 当前岗位</div><div class="n" style="font-size:17px;margin-top:10px">${job?esc(job.company):"—"}</div><div class="t">${job?esc(job.title):"还没有录入岗位"}</div></div>
      <div class="kpi"><div class="l">${icon("file",14)} 当前简历</div><div class="n" style="font-size:17px;margin-top:10px">${res?esc(res.name):"—"}</div><div class="t">${res?esc(res.target||"未填目标岗位"):"还没有录入简历"}</div></div>
      <div class="kpi"><div class="l">${icon("target",14)} 技能覆盖</div><div class="n">${m?Math.round(m.coverage*100):0}<small>%</small></div><div class="t">${m?`硬性缺失 ${m.hardMiss} 项`:"先跑一次匹配诊断"}</div></div>
      <div class="kpi"><div class="l">${icon("chat",14)} 最近面试</div><div class="n" style="font-size:17px;margin-top:10px">${sessions.length?esc((sessions[sessions.length-1].jobTitle||"模拟面试")):"—"}</div><div class="t">${sessions.length?fmtDate(sessions[sessions.length-1].finishedAt)+" · "+sessions[sessions.length-1].total+" 分":"还没练过"}</div></div>
    </div>

    <div class="split wide-left mt18">
      <div class="panel-lg">
        <h3>${icon("briefcase",16)} 岗位优先级</h3>
        <div class="ph-sub">按匹配分排序，点一行进入匹配分析</div>
        ${jobRowsHTML()}
      </div>
      <div>
        <div class="panel-lg">
          <h3>${icon("list",16)} 今日复盘待办</h3>
          <div class="ph-sub">面试复盘后落成动作，才是真的进步</div>
          ${tasks.length? tasks.map(t=>`<div class="flex" style="padding:8px 0;border-bottom:1px solid var(--border)">
            <span class="iconbtn js-home-todo" data-id="${t.id}" style="width:24px;height:24px;border-radius:7px">${icon("check",13,2.4)}</span>
            <span class="grow" style="font-size:13px">${esc(t.title)}</span>
            <span class="chip ${t.priority==='P0'?'must':'nice'}">${t.priority||'P1'}</span></div>`).join("")
            : `<div class="tiny">暂无待办，去「复盘待办」新建一条。</div>`}
        </div>
        <div class="panel-lg mt12">
          <h3>${icon("spark",16)} 快捷入口</h3>
          <div class="chips mt8">
            <span class="chip click" data-go-quick="jobs">${icon("plus",12)} 录入岗位</span>
            <span class="chip click" data-go-quick="resume">${icon("file",12)} 录入简历</span>
            <span class="chip click" data-go-quick="match">${icon("target",12)} 匹配诊断</span>
            <span class="chip click" data-go-quick="interview">${icon("chat",12)} 开始模拟面试</span>
            <span class="chip click" data-go-quick="reverse">${icon("help",12)} 准备反问</span>
          </div>
        </div>
      </div>
    </div>`;
  wireHome();
}

function jobRowsHTML(){
  const jobs=(data.jobs||[]).slice().map(j=>{
    const r=getResume(data.activeResumeId); const s=r?runMatch(j.id,r.id).score:null;
    return {...j, _s:s};
  }).sort((a,b)=>(b._s??-1)-(a._s??-1)).slice(0,5);
  if(!jobs.length) return `<div class="empty-state" style="padding:24px"><div class="e">${icon("briefcase",24)}</div><p>还没有岗位，先去「岗位库」录入一份 JD。</p></div>`;
  return jobs.map(j=>`<div class="flex js-home-job" data-id="${j.id}" style="padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer">
    <span class="avatar-dot" style="background:var(--surface-nested);color:var(--accent)">${icon("building",16)}</span>
    <div class="grow"><div style="font-size:13.5px;font-weight:700">${esc(j.title)}</div><div class="tiny">${esc(j.company)} · ${esc(j.status||"在投")}</div></div>
    ${j._s!=null?`<span class="score" style="font-size:17px;color:${j._s>=75?'var(--success)':j._s>=60?'var(--warning)':'var(--danger)'}">${j._s}</span>`:'<span class="tiny">—</span>'}
    <span class="arw" style="color:var(--text-tertiary)">${icon("chevron",15,2)}</span></div>`).join("");
}

function wireHome(){
  $("#screen").querySelectorAll("[data-next]").forEach(el=>el.onclick=()=>go(el.dataset.next));
  $("#screen").querySelectorAll("[data-go-quick]").forEach(el=>el.onclick=()=>go(el.dataset.goQuick));
  $("#screen").querySelectorAll(".js-home-job").forEach(el=>el.onclick=()=>{ data.activeJobId=el.dataset.id; store.save(); go("match"); });
  $("#screen").querySelectorAll(".js-home-todo").forEach(el=>el.onclick=()=>{
    const t=(data.todo||[]).find(i=>i.id==el.dataset.id); if(!t) return; t.done=true; t.doneAt=nowISO(); persist();
  });
}

/* ---------- INSIGHT ---------- */
function renderInsight(){
  const cards=CONFIG.modules.map(m=>{ const it=data[m.key]||[]; let main="", pct=0;
    if(m.type==="todo"){ main=`${it.filter(x=>x.done).length}/${it.length} 已完成`; pct=it.length?Math.round(it.filter(x=>x.done).length/it.length*100):0; }
    else if(m.type==="checkin"){ const t=today(); main=`今日 ${it.filter(x=>x.log&&x.log[t]).length}/${it.length} 打卡`; pct=it.length?Math.round(it.filter(x=>x.log&&x.log[t]).length/it.length*100):0; }
    else if(m.type==="progress"){ pct=avgProgress(it).value; main=`平均进度 ${pct}%`; }
    else if(m.type==="finance"){ const e=it.filter(x=>x.type==="expense").reduce((a,x)=>a+ +x.amount,0); const inc=it.filter(x=>x.type==="income").reduce((a,x)=>a+ +x.amount,0); main=`收 ¥${inc} · 支 ¥${e}`; }
    else main=`${it.length} 条记录`;
    return `<div class="pin" data-open="${m.key}" style="cursor:pointer">
      <span class="pin-ic" style="color:${m.color};background:${m.tint};border-color:transparent">${icon(m.icon,19)}</span>
      <div class="pin-b"><div class="pin-t">${m.name}</div><div class="pin-m">${main}</div>
      ${['progress','todo','checkin'].includes(m.type)?`<div class="hero-bar" style="margin-top:9px"><i style="width:${pct}%;background:${m.color}"></i></div>`:''}</div>
      <span class="arw" style="color:var(--text-tertiary)">${icon("chevron",16,2)}</span></div>`; }).join("");
  $("#screen").innerHTML=`<div class="header"><div><h2>洞察</h2><p>各模块进展一览 · 记录—执行—统计—反馈</p></div><div class="spacer"></div><span class="date-chip">${icon("calendar",14)} ${dateStr()}</span></div>
    <div class="sec-title">模块概况</div><div class="pin-list" style="grid-template-columns:repeat(3,1fr)">${cards}</div>`;
  $("#screen").querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>go(el.dataset.open));
}

/* ---------- MODULE VIEW ---------- */
function renderModule(key){
  const m=modOf(key); const all=data[key]||[]; let it=all;
  const t=today();
  const q=searchQ.trim().toLowerCase();
  if(q) it=all.filter(x=>(x.title||"").toLowerCase().includes(q)||(x.note||x.content||"").toLowerCase().includes(q));

  let head="";
  if(m.type==="finance"){
    const inc=all.filter(x=>x.type==="income").reduce((a,x)=>a+ +x.amount,0);
    const exp=all.filter(x=>x.type==="expense").reduce((a,x)=>a+ +x.amount,0);
    head=`<div class="mod-summary">
      <div class="mini"><div class="l">收入</div><div class="v" style="color:var(--module-1)">¥${inc}</div></div>
      <div class="mini"><div class="l">支出</div><div class="v" style="color:var(--danger)">¥${exp}</div></div>
      <div class="mini"><div class="l">结余</div><div class="v">¥${inc-exp}</div></div>
      <div class="mini"><div class="l">笔数</div><div class="v">${all.length}</div></div></div>`;
  } else if(m.type==="todo"){
    const done=all.filter(x=>x.done).length;
    head=headHero(m, `${done}/${all.length}`, "今日已完成");
  } else if(m.type==="checkin"){
    const done=all.filter(x=>x.log&&x.log[t]).length;
    head=headHero(m, `${done}/${all.length}`, "今日已打卡");
  } else if(m.type==="progress"){
    const p=avgProgress(all);
    head=headHero(m, `${p.value}%`, `平均进度 · ${all.length} 项`);
  } else if(m.type==="note"){
    const todayN=all.filter(x=>x.date===t).length;
    head=headHero(m, `${all.length}`, `条记录 · 今日 ${todayN} 条`, null);
  }

  const body = it.length ? it.map(x=>recHTML(m,x)).join("")
    : `<div class="empty"><span class="e">${icon(m.icon,28)}</span><div>${q?'没有匹配的记录':'还没有记录，点右上角「新建」添加第一条吧'}</div></div>`;

  $("#screen").innerHTML=`<div class="header"><div><h2>${m.name}</h2><p>${m.desc}</p></div><div class="spacer"></div><span class="date-chip">${icon("calendar",14)} ${dateStr()}</span></div>
    <div class="toolbar">
      <div class="search-box">${icon("search",15,2.2)}<input id="search" placeholder="搜索…" value="${attr(searchQ)}"/></div>
      <div class="spacer"></div><button class="btn" id="btn-new">${icon("plus",16,2.2)}新建</button></div>
    ${head}
    <div class="mod-layout">
      <div class="mod-main">
        <div class="sec-title">全部记录 <span id="rec-count" style="margin-left:auto;font-weight:500;color:var(--text-secondary);font-size:12px">${it.length} 条</span></div>
        <div class="rec-grid">${body}</div>
      </div>
      <aside class="mod-side">${sideStats(m,all)}</aside>
    </div>`;
  const s=$("#search");
  let composing=false;
  const refresh=()=>{ searchQ=s.value; renderModuleResults(key); };
  s.addEventListener("compositionstart",()=>{ composing=true; });
  s.addEventListener("compositionend",()=>{ composing=false; refresh(); });
  s.addEventListener("input",()=>{ if(!composing) refresh(); });
  $("#btn-new").onclick=()=>openEditor(key,null);
  wireModule(key);
}

/* 仅刷新受搜索影响的记录列表与计数，不重建搜索框（避免打断中文输入法） */
function renderModuleResults(key){
  const m=modOf(key); const all=data[key]||[];
  const q=searchQ.trim().toLowerCase();
  const it=q?all.filter(x=>(x.title||"").toLowerCase().includes(q)||(x.note||x.content||"").toLowerCase().includes(q)):all;
  const body = it.length ? it.map(x=>recHTML(m,x)).join("")
    : `<div class="empty"><span class="e">${icon(m.icon,28)}</span><div>${q?'没有匹配的记录':'还没有记录，点右上角「新建」添加第一条吧'}</div></div>`;
  const grid=$(".rec-grid"); if(grid) grid.innerHTML=body;
  const cnt=$("#rec-count"); if(cnt) cnt.textContent=`${it.length} 条`;
  wireModule(key);
}

/* 模块统计侧栏：按 type 生成多维数据，填满右侧空间 */
function sideStats(m, all){
  const t=today();
  const palette=["var(--accent)","var(--module-1)","var(--module-2)","var(--module-3)","var(--module-4)","var(--module-5)","var(--danger)"];
  const row=(k,v,dot)=>`<div class="stat-row"><span class="k">${dot?`<span class="kd" style="background:${dot}"></span>`:''}${k}</span><span class="val">${v}</span></div>`;

  if(m.type==="finance"){
    const inc=all.filter(x=>x.type==="income").reduce((a,x)=>a+ +x.amount,0);
    const exp=all.filter(x=>x.type==="expense").reduce((a,x)=>a+ +x.amount,0);
    // 支出按分类聚合
    const byCat={}; all.filter(x=>x.type==="expense").forEach(x=>{ const c=x.category||"其他"; byCat[c]=(byCat[c]||0)+ +x.amount; });
    const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
    const maxC=cats.length?cats[0][1]:1;
    const catBars=cats.length? cats.map((c,i)=>`<div class="cbrow"><span class="cbn">${esc(c[0])}</span><span class="cbt"><i style="width:${Math.round(c[1]/maxC*100)}%;background:${palette[i%palette.length]}"></i></span><span class="cbv">¥${c[1]}</span></div>`).join("")
      : `<div style="color:var(--text-tertiary);font-size:12.5px;padding:6px 0">暂无支出记录</div>`;
    const todayExp=all.filter(x=>x.type==="expense"&&x.date===t).reduce((a,x)=>a+ +x.amount,0);
    return `<div class="side-card"><div class="sh">${icon("wallet",15)} 收支概况</div>
        ${row("总收入",`<span style="color:var(--module-1)">¥${inc}</span>`)}
        ${row("总支出",`<span style="color:var(--danger)">¥${exp}</span>`)}
        ${row("净结余",`¥${inc-exp}`)}
        ${row("今日支出",`¥${todayExp}`)}
        ${row("总笔数",`${all.length} 笔`)}</div>
      <div class="side-card"><div class="sh">${icon("chart",15)} 支出分类占比</div><div class="catbar">${catBars}</div></div>`;
  }

  if(m.type==="progress"){
    const p=avgProgress(all);
    const doneN=all.filter(x=>((x.current/x.target)*100||0)>=100).length;
    const totalCur=all.reduce((a,x)=>a+ (+x.current||0),0);
    const totalTgt=all.reduce((a,x)=>a+ (+x.target||0),0);
    return `<div class="side-card"><div class="sh">${icon("target",15)} 总体进度</div>
        <div class="side-ring"><div class="dial">${ringSVG(p.value,m.color)}<span class="mid"><span class="big" style="color:${m.color}">${p.value}%</span><span class="cap">平均进度</span></span></div></div></div>
      <div class="side-card"><div class="sh">${icon("list",15)} 数据统计</div>
        ${row("进行项目",`${all.length} 项`)}
        ${row("已达成",`${doneN} 项`)}
        ${row("累计完成",`${totalCur} ${all[0]?.unit||m.unit||''}`)}
        ${row("总目标量",`${totalTgt} ${all[0]?.unit||m.unit||''}`)}</div>`;
  }

  if(m.type==="checkin"){
    const done=all.filter(x=>x.log&&x.log[t]).length; const pct=all.length?Math.round(done/all.length*100):0;
    const streaks=all.map(x=>({title:x.title,s:streak(x.log)})).sort((a,b)=>b.s-a.s);
    const best=streaks[0]?streaks[0].s:0;
    const list=streaks.slice(0,6).map(x=>`<div class="stat-row"><span class="k">${esc(x.title)}</span><span class="val" style="color:var(--module-3)">${x.s} 天</span></div>`).join("");
    return `<div class="side-card"><div class="sh">${icon("leaf",15)} 今日打卡</div>
        <div class="side-ring"><div class="dial">${ringSVG(pct,m.color)}<span class="mid"><span class="big" style="color:${m.color}">${done}/${all.length}</span><span class="cap">已完成</span></span></div></div></div>
      <div class="side-card"><div class="sh">${icon("flame",15)} 连续天数</div>
        ${row("最长连续",`<span style="color:var(--module-3)">${best} 天</span>`)}
        ${row("习惯总数",`${all.length} 个`)}
        <div style="margin-top:6px">${list}</div></div>`;
  }

  if(m.type==="todo"){
    const done=all.filter(x=>x.done).length; const pct=all.length?Math.round(done/all.length*100):0;
    const byP={}; (m.priorities||[]).forEach(p=>byP[p.key]=0); all.forEach(x=>{ if(byP[x.priority]!=null) byP[x.priority]++; });
    const pRows=(m.priorities||[]).map(p=>`<div class="stat-row"><span class="k"><span class="kd" style="background:${p.text}"></span>${p.label}</span><span class="val">${byP[p.key]||0} 项</span></div>`).join("");
    return `<div class="side-card"><div class="sh">${icon("list",15)} 完成情况</div>
        <div class="side-ring"><div class="dial">${ringSVG(pct,m.color)}<span class="mid"><span class="big" style="color:${m.color}">${pct}%</span><span class="cap">${done}/${all.length} 完成</span></span></div></div></div>
      <div class="side-card"><div class="sh">${icon("chart",15)} 优先级分布</div>
        ${pRows}
        ${row("剩余待办",`${all.length-done} 项`)}</div>`;
  }

  // note
  const todayN=all.filter(x=>x.date===t).length;
  const byMood={}; all.forEach(x=>{ const md=x.mood||"未分类"; byMood[md]=(byMood[md]||0)+1; });
  const moods=Object.entries(byMood).sort((a,b)=>b[1]-a[1]);
  const maxM=moods.length?moods[0][1]:1;
  const moodBars=moods.length? moods.map((c,i)=>`<div class="cbrow"><span class="cbn">${esc(c[0])}</span><span class="cbt"><i style="width:${Math.round(c[1]/maxM*100)}%;background:${palette[i%palette.length]}"></i></span><span class="cbv">${c[1]} 条</span></div>`).join("")
    : `<div style="color:var(--text-tertiary);font-size:12.5px;padding:6px 0">暂无记录</div>`;
  return `<div class="side-card"><div class="sh">${icon("pen",15)} 记录统计</div>
      ${row("累计记录",`${all.length} 条`)}
      ${row("今日新增",`${todayN} 条`)}
      ${row("标签种类",`${moods.length} 种`)}</div>
    <div class="side-card"><div class="sh">${icon("chart",15)} 标签分布</div><div class="catbar">${moodBars}</div></div>`;
}

/* per-module hero header: icon + big number + label */
function headHero(m, big, label){
  const inner=`<div class="hero-ic" style="background:${m.tint};color:${m.color}">${icon(m.icon,24)}</div>
    <div class="hero-tx"><div class="hero-row"><span class="hero-v">${big}</span><span class="hero-l">${label}</span></div></div>`;
  if(m.cover) return `<div class="hero has-cover"><div class="hero-bg" style="background-image:url('${attr(m.cover)}')"></div><div class="hero-inner">${inner}</div></div>`;
  return `<div class="hero">${inner}</div>`;
}

function recHTML(m,x){
  const pin=`<button class="pin-btn js-pin ${x.pinned?'on':''}" data-id="${x.id}" title="置顶">${icon("star",15)}</button>`;
  const del=`<button class="del js-del" data-id="${x.id}" title="删除">${icon("trash",15)}</button>`;
  const acts=`<div class="acts">${pin}${del}</div>`;
  const chkMark=icon("check",13,2.4);
  const thumb=x.image?`<img class="thumb" src="${attr(x.image)}" alt="">`:'';
  const customMeta=(m.fields||[]).filter(f=>x[f.key]).map(f=>`<span class="meta-tag">${esc(x[f.key])}</span>`).join("");
  const customBlock=customMeta?`<div class="meta-line">${customMeta}</div>`:'';
  const layout=x.layout||'default';
  const layoutCls=`rec-layout-${layout}`;

  // feature layout: 大图在上 + 标题 + 正文在下 (适合有图记录)
  if(layout==='feature' && x.image){
    const body=(x.content||x.note||'').trim();
    return `<div class="rec ${layoutCls}">${acts}<div class="top" data-edit="${x.id}">
      ${thumb}
      <div class="feat-title">${esc(x.title||'无标题')}</div>
      ${body?`<div class="feat-body">${esc(body)}</div>`:''}
      ${customBlock?`<div style="padding:0 16px 14px">${customBlock}</div>`:''}</div></div>`;
  }
  // quote layout: 大字居中 (适合短文本/灵感/金句)
  if(layout==='quote'){
    const text=(x.content||x.title||'').trim();
    return `<div class="rec ${layoutCls}">${acts}<div class="top" data-edit="${x.id}" style="flex-direction:column;align-items:center;text-align:center">
      <div class="quote-text">${esc(text)}</div>
      ${x.mood?`<div class="quote-meta">${esc(x.mood)}${x.date?` · ${esc(x.date)}`:''}</div>`:(x.date?`<div class="quote-meta">${esc(x.date)}</div>`:'')}
      ${customBlock?`<div style="margin-top:8px">${customBlock}</div>`:''}</div></div>`;
  }

  // default layout
  if(m.type==="todo"){ const p=(m.priorities||[]).find(p=>p.key===x.priority);
    return `<div class="rec ${layoutCls}">${acts}<div class="top" style="padding-right:60px"><div class="chk js-chk ${x.done?'on':''}" data-id="${x.id}">${chkMark}</div>
      ${thumb}
      <div class="body" data-edit="${x.id}"><span class="rname ${x.done?'done':''}">${esc(x.title)}</span>
      ${p?`<span class="badge prio" data-p="${p.key}"><span class="dot"></span>${p.label}</span>`:''}
      ${x.note?`<span class="rdate" style="margin-left:0;color:var(--text-tertiary)">${esc(x.note).slice(0,40)}</span>`:''}${customBlock}</div></div></div>`; }
  if(m.type==="checkin"){ const on=!!(x.log&&x.log[today()]); const st=streak(x.log);
    return `<div class="rec ${layoutCls}">${acts}<div class="top" style="padding-right:60px"><div class="chk js-chk ${on?'on':''}" data-id="${x.id}">${chkMark}</div>
      ${thumb}
      <div class="body" data-edit="${x.id}"><span class="rname">${esc(x.title)}</span>
      <span class="streak">${icon("flame",13)} 连续 ${st} 天</span>${on?'<span class="badge" style="background:var(--accent-muted);color:var(--accent)">今日已打卡</span>':''}${customBlock}</div></div></div>`; }
  if(m.type==="progress"){ const pct=Math.min(100,Math.round((x.current/x.target)*100||0));
    return `<div class="rec ${layoutCls}">${acts}<div class="top" style="padding-right:60px">${thumb}<div class="body" data-edit="${x.id}">
      <span class="rname">${esc(x.title)}</span>
      <div class="pbar"><i style="width:${pct}%;background:${m.color}"></i></div>
      <span class="rdate" style="margin-left:0;color:var(--text-secondary)">${x.current}/${x.target} ${x.unit||m.unit||''} · ${pct}%</span>
      ${x.note?`<div class="rnote">${esc(x.note)}</div>`:''}${customBlock}</div></div></div>`; }
  if(m.type==="finance"){ const inc=x.type==="income";
    return `<div class="rec ${layoutCls}">${acts}<div class="top" style="padding-right:60px">${thumb}<div class="body" data-edit="${x.id}">
      <span class="rname">${esc(x.title)}</span>
      <span class="badge" style="background:var(--surface-nested);color:var(--text-secondary)">${esc(x.category||'其他')}</span>
      <span class="rdate">${x.date||''}</span>${customBlock}</div>
      <div class="amt ${inc?'inc':'exp'}">${inc?'+':'-'}¥${x.amount}</div></div></div>`; }
  // note
  return `<div class="rec ${layoutCls}">${acts}<div class="top" style="padding-right:60px">${thumb}<div class="body" data-edit="${x.id}">
    <span class="rname">${esc(x.title||'无标题')}</span>
    ${x.mood?`<span class="badge" style="background:var(--accent-muted);color:var(--accent)">${esc(x.mood)}</span>`:''}
    ${x.content?`<span class="rdate" style="margin-left:0;color:var(--text-tertiary)">${esc(x.content).slice(0,40)}</span>`:''}
    <span class="rdate">${x.date||''}</span>${customBlock}</div></div></div>`;
}

function streak(log){ if(!log) return 0; let n=0; const d=new Date();
  for(;;){ const k=d.toISOString().slice(0,10); if(log[k]){ n++; d.setDate(d.getDate()-1);} else break; } return n; }

function wireModule(key){ const m=modOf(key);
  $("#screen").querySelectorAll(".js-chk").forEach(el=>el.onclick=e=>{ e.stopPropagation();
    const x=(data[key]).find(i=>i.id==el.dataset.id);
    if(m.type==="todo"){ x.done=!x.done; x.doneAt = x.done ? nowISO() : null; }
    else if(m.type==="checkin"){ x.log=x.log||{}; const t=today(); x.log[t]?delete x.log[t]:x.log[t]=true; }
    persist(); });
  $("#screen").querySelectorAll("[data-edit]").forEach(el=>el.onclick=()=>openEditor(key,(data[key]).find(i=>i.id==el.dataset.edit)));
  $("#screen").querySelectorAll(".js-del").forEach(el=>el.onclick=e=>{ e.stopPropagation(); confirmDelete(key, el.dataset.id); });
  $("#screen").querySelectorAll(".js-pin").forEach(el=>el.onclick=e=>{ e.stopPropagation(); const x=(data[key]).find(i=>i.id==el.dataset.id); x.pinned=!x.pinned; persist(); });
}

/* ---------- EDITOR MODAL (per type) ---------- */
function openEditor(key,item){
  const m=modOf(key); const editing=!!item; const d=item||newItem(m);
  let fields="";
  if(m.type==="todo"){
    fields=`<div class="field"><label>任务</label><input id="f-title" value="${attr(d.title)}" placeholder="要做什么？"/></div>
      <div class="field"><label>优先级</label><div class="seg" id="f-prio">${(m.priorities||[]).map(p=>`<div class="opt ${p.key===d.priority?'on':''}" data-v="${p.key}">${p.label}</div>`).join("")}</div></div>
      <div class="field"><label>备注</label><textarea id="f-note" placeholder="补充说明">${esc(d.note||'')}</textarea></div>`;
  } else if(m.type==="checkin"){
    fields=`<div class="field"><label>打卡项</label><input id="f-title" value="${attr(d.title)}" placeholder="例如：喝够 8 杯水"/></div>
      <p class="sub" style="margin:0">保存后可在卡片点击左侧方块打卡；连续天数自动统计，每天从零开始。</p>`;
  } else if(m.type==="progress"){
    fields=`<div class="field"><label>名称</label><input id="f-title" value="${attr(d.title)}" placeholder="书名 / 目标"/></div>
      <div class="frow"><div class="field"><label>当前</label><input id="f-cur" type="number" value="${d.current??0}"/></div>
      <div class="field"><label>目标</label><input id="f-tgt" type="number" value="${d.target??1}"/></div>
      <div class="field"><label>单位</label><input id="f-unit" value="${attr(d.unit||m.unit||'')}"/></div></div>
      <div class="field"><label>摘录 / 想法</label><textarea id="f-note" placeholder="随手记">${esc(d.note||'')}</textarea></div>`;
  } else if(m.type==="finance"){
    fields=`<div class="field"><label>类型</label><div class="seg" id="f-ftype">
        <div class="opt ${d.type!=='income'?'on':''}" data-v="expense">支出</div><div class="opt ${d.type==='income'?'on':''}" data-v="income">收入</div></div></div>
      <div class="frow"><div class="field"><label>项目</label><input id="f-title" value="${attr(d.title)}" placeholder="午餐 / 稿费"/></div>
      <div class="field"><label>金额 ¥</label><input id="f-amt" type="number" value="${d.amount??''}" placeholder="0"/></div></div>
      <div class="field"><label>分类</label><div class="seg" id="f-cat">${(m.categories||[]).map(c=>`<div class="opt ${c===d.category?'on':''}" data-v="${attr(c)}" style="flex:0 0 auto;min-width:auto">${esc(c)}</div>`).join("")}</div></div>
      <div class="field"><label>日期</label><input id="f-date" type="date" value="${d.date||isoToday()}"/></div>`;
  } else {
    fields=`<div class="field"><label>标题</label><input id="f-title" value="${attr(d.title)}" placeholder="给这条起个名"/></div>
      ${(m.moods&&m.moods.length)?`<div class="field"><label>标签 / 心情</label><div class="seg" id="f-mood">${m.moods.map(md=>`<div class="opt ${md===d.mood?'on':''}" data-v="${attr(md)}" style="flex:0 0 auto;min-width:auto">${md}</div>`).join("")}</div></div>`:''}
      <div class="field"><label>内容</label><textarea id="f-content" placeholder="写点什么…">${esc(d.content||'')}</textarea></div>
      <div class="field"><label>日期</label><input id="f-date" type="date" value="${d.date||isoToday()}"/></div>`;
  }
  // layout variant selector
  const layoutOpts=[{v:'default',l:'标准'},{v:'feature',l:'大图'},{v:'quote',l:'引文'}];
  fields=`<div class="field"><label>卡片样式</label><div class="seg" id="f-layout">${layoutOpts.map(o=>`<div class="opt ${o.v===(d.layout||'default')?'on':''}" data-v="${o.v}">${o.l}</div>`).join("")}</div></div>`+fields;
  // custom fields (from m.fields config) — rendered after type-specific fields
  (m.fields||[]).forEach(f=>{
    const v=d[f.key]||"";
    if(f.type==="select") fields+=`<div class="field"><label>${esc(f.label)}</label><div class="seg" id="f-cf-${f.key}">${(f.options||[]).map(o=>`<div class="opt ${o===v?'on':''}" data-v="${attr(o)}" style="flex:0 0 auto;min-width:auto">${esc(o)}</div>`).join("")}</div></div>`;
    else if(f.type==="textarea") fields+=`<div class="field"><label>${esc(f.label)}</label><textarea id="f-cf-${f.key}" placeholder="${attr(f.placeholder||'')}">${esc(v)}</textarea></div>`;
    else if(f.type==="number") fields+=`<div class="field"><label>${esc(f.label)}</label><input id="f-cf-${f.key}" type="number" value="${attr(v)}" placeholder="${attr(f.placeholder||'')}"/></div>`;
    else fields+=`<div class="field"><label>${esc(f.label)}</label><input id="f-cf-${f.key}" value="${attr(v)}" placeholder="${attr(f.placeholder||'')}"/></div>`;
  });
  // shared image URL field (all types)
  fields+=`<div class="field"><label>图片 URL（可选）</label><input id="f-image" value="${attr(d.image||'')}" placeholder="https://..."/></div>`;
  const overlay=document.createElement("div"); overlay.className="overlay";
  overlay.innerHTML=`<div class="modal"><h3>${editing?'编辑':'新建'} · ${m.name}</h3><div class="sub">${m.desc}</div>${fields}
    <div class="modal-actions">${editing?'<button class="link-danger" id="m-del">删除</button>':''}<div class="spacer"></div>
      <button class="btn ghost" id="m-cancel">取消</button><button class="btn" id="m-save">保存</button></div></div>`;
  document.body.appendChild(overlay);
  /* 与 openModal 对齐：可访问名称 + 打开聚焦 + 关闭焦点归还 */
  const box=overlay.querySelector(".modal");
  box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true");
  box.setAttribute("aria-label", `${editing?'编辑':'新建'} · ${m.name}`);
  const prevFocus=document.activeElement, rawRemove=overlay.remove.bind(overlay);
  overlay.remove=()=>{ rawRemove(); if(prevFocus&&prevFocus.focus){ try{ prevFocus.focus({preventScroll:true}); }catch(e){} } };
  setTimeout(()=>{
    const f=overlay.querySelector("input:not([type=hidden]):not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled])");
    if(f){ try{ f.focus({preventScroll:true}); }catch(e){} }
  },30);
  const close=()=>overlay.remove();
  overlay.onclick=e=>{ if(e.target===overlay) close(); };
  overlay.querySelector("#m-cancel").onclick=close;
  overlay.querySelectorAll(".seg").forEach(seg=>seg.querySelectorAll(".opt").forEach(o=>o.onclick=()=>{ seg.querySelectorAll(".opt").forEach(x=>x.classList.remove("on")); o.classList.add("on"); }));
  if(editing) overlay.querySelector("#m-del").onclick=()=>{ close(); confirmDelete(key,d.id); };
  overlay.querySelector("#m-save").onclick=()=>{
    const val=id=>{ const el=overlay.querySelector(id); return el?el.value:undefined; };
    const seg=id=>{ const el=overlay.querySelector(id+" .on"); return el?el.dataset.v:undefined; };
    d.title=(val("#f-title")||"").trim()||"未命名";
    d.layout=seg("#f-layout")||'default';
    if(m.type==="todo"){ d.priority=seg("#f-prio")||d.priority; d.note=(val("#f-note")||"").trim(); }
    else if(m.type==="progress"){ d.current=Math.max(0,+val("#f-cur")||0); d.target=Math.max(1,+val("#f-tgt")||1); d.unit=(val("#f-unit")||"").trim(); d.note=(val("#f-note")||"").trim(); }
    else if(m.type==="finance"){ d.type=seg("#f-ftype")||"expense"; d.amount=Math.max(0,+val("#f-amt")||0); d.category=seg("#f-cat")||(m.categories&&m.categories[0])||"其他"; d.date=val("#f-date"); }
    else if(m.type==="note"){ d.mood=seg("#f-mood")||d.mood||""; d.content=(val("#f-content")||"").trim(); d.date=val("#f-date"); }
    // save custom fields
    (m.fields||[]).forEach(f=>{
      if(f.type==="select") d[f.key]=seg("#f-cf-"+f.key)||d[f.key]||"";
      else if(f.type==="number") d[f.key]=Math.max(0,+val("#f-cf-"+f.key)||0);
      else d[f.key]=(val("#f-cf-"+f.key)||"").trim();
    });
    // save image
    d.image=(val("#f-image")||"").trim();
    if(!editing) (data[key]=data[key]||[]).unshift(d);
    persist(); close();
  };
}

function newItem(m){ const base={id:Date.now()}; let item;
  if(m.type==="todo") item={...base,title:"",priority:(m.priorities&&m.priorities[1]?m.priorities[1].key:"P1"),done:false,note:""};
  else if(m.type==="checkin") item={...base,title:"",log:{}};
  else if(m.type==="progress") item={...base,title:"",current:0,target:(m.unit==="页"?100:20),unit:m.unit||"",note:""};
  else if(m.type==="finance") item={...base,title:"",type:"expense",amount:"",category:(m.categories&&m.categories[0])||"其他",date:isoToday()};
  else item={...base,title:"",content:"",mood:(m.moods&&m.moods[0])||"",date:isoToday()};
  // initialize custom fields
  (m.fields||[]).forEach(f=>{ if(!(f.key in item)) item[f.key]= f.type==="select"?(f.options&&f.options[0]||""):""; });
  return item;
}

/* ---------- 回收站：删除先进回收站，30 天后自动清理 ---------- */
const TRASH_TTL = 30*86400000;
function trashClean(){
  const now=Date.now();
  data.trash=(data.trash||[]).filter(t=>{ const at=Date.parse(t.at||""); return !isNaN(at) && now-at<TRASH_TTL; });
}
function trashLabel(t){
  if(t.key==="jobs") return "岗位";
  if(t.key==="resumes") return "简历";
  const m=CONFIG.modules.find(x=>x.key===t.key);
  return m?m.name:"记录";
}
function trashName(t){ return (t.item&&(t.item.title||t.item.name))||t.label||"未命名"; }
function trashAdd(key,item,label){
  trashClean();
  const rec={ id:"tr-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    key, item:structuredClone(item), label:label||"", at:new Date().toISOString() };
  data.trash.unshift(rec);
  if(data.trash.length>200) data.trash.length=200;   /* 上限，避免本地存储被无限撑大 */
  store.save();
  return rec;
}
/* 返回 true=已恢复 / "dup"=原 id 已存在（视为已恢复，移除回收站副本） / false=找不到 */
function trashRestore(id){
  const i=(data.trash||[]).findIndex(t=>t.id===id); if(i<0) return false;
  const t=data.trash[i];
  if(!Array.isArray(data[t.key])) data[t.key]=[];
  data.trash.splice(i,1);
  if(data[t.key].some(x=>x.id===t.item.id)){ store.save(); return "dup"; }
  data[t.key].unshift(t.item);
  if(t.key==="jobs" && !data.activeJobId) data.activeJobId=t.item.id;
  if(t.key==="resumes" && !data.activeResumeId) data.activeResumeId=t.item.id;
  store.save();
  return true;
}
function trashPurge(id){ data.trash=(data.trash||[]).filter(t=>t.id!==id); store.save(); }
function trashDaysLeft(t){
  const d=Math.ceil((TRASH_TTL-(Date.now()-Date.parse(t.at||"")))/86400000);
  return Math.max(0,d);
}
/* 删除统一走这里：移入回收站 + 可撤销提示 */
function trashDelete(key,id,after){
  const item=(data[key]||[]).find(i=>i.id==id); if(!item) return false;
  const rec=trashAdd(key,item);
  data[key]=data[key].filter(i=>i.id!=id);
  store.save();
  if(after) after(item);
  return rec;
}
function undoToast(rec,label,extra){
  toast(`「${label}」已移到回收站`, { action:"撤销", onAction:()=>{
    if(trashRestore(rec.id)===false){ toast("这条已不在回收站"); return; }
    if(extra) extra();
    render(); toast("已撤销删除");
  }});
}
function confirmDelete(key,id){
  const item=(data[key]||[]).find(i=>i.id==id); if(!item) return;
  const rec=trashDelete(key,id);
  if(!rec) return;
  persist();
  undoToast(rec, item.title||item.name||"这条记录");
}

/* ---------- router（Hash 深链：#/home … #/jobs/<id>） ---------- */
function dateStr(){ const n=new Date(); const wd="日一二三四五六"[n.getDay()]; return `${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日 周${wd}`; }
const ROUTES = ["home","flow","jobs","board","calendar","resume","match","interview","reverse","week","todo","note","help","settings","insight"];
function parseHash(){
  const h = String(location.hash||"").replace(/^#\/?/,"");
  const parts = h.split("?")[0].split("/").filter(Boolean);
  const name = parts[0] || "home";
  if(name==="jobs" && parts[1]) return { view:"jobs", jobId:decodeURIComponent(parts[1]) };
  if(ROUTES.includes(name)) return { view:name, jobId:null };
  return { view:"home", jobId:null, unknown:name };
}
function hrefOf(v, id){ return "#/" + v + (id?("/"+encodeURIComponent(id)):""); }
function go(v, id){
  const target = hrefOf(v, id);
  if(location.hash===target) applyRoute();
  else location.hash = target;
}
function applyRoute(){
  const r = parseHash();
  view = r.view; routeJobId = r.jobId || null;
  searchQ = "";
  closeDrawer();
  /* 路由离开详情页时，把残留的详情弹窗收掉 */
  const stray = document.querySelector(".overlay[data-job-detail]");
  if(stray && stray.dataset.jobDetail !== routeJobId) stray.remove();
  renderNavActive();
  render();
  window.scrollTo({top:0});
  if(view==="jobs" && routeJobId){
    const ov = openJobDetail(routeJobId);
    if(ov){ bindJobDetailRoute(ov, routeJobId); }
    else history.replaceState(null,"",hrefOf("jobs"));
  }
}
window.addEventListener("hashchange", applyRoute);

/* 详情弹窗与地址栏同步：#/jobs/<id> 可直接分享/刷新 */
function bindJobDetailRoute(ov, id){
  ov.dataset.jobDetail = id;
  const orig = ov.remove.bind(ov);
  let fired = false;
  ov.remove = ()=>{
    if(!fired){
      fired = true;
      if(routeJobId===id) routeJobId=null;
      if(location.hash===hrefOf("jobs",id)) history.replaceState(null,"",hrefOf("jobs"));
    }
    return orig();
  };
}
function openJobCard(id){
  const ov = openJobDetail(id);
  if(!ov) return null;
  bindJobDetailRoute(ov, id);
  if(view==="jobs"){ routeJobId=id; history.pushState(null,"",hrefOf("jobs",id)); }
  return ov;
}
/* ---------- 移动端抽屉 ---------- */
function closeDrawer(){
  const sb=document.querySelector(".sidebar"); if(sb) sb.classList.remove("open");
  const sc=document.getElementById("scrim"); if(sc) sc.classList.remove("on");
}
function openDrawer(){
  const sb=document.querySelector(".sidebar"), sc=document.getElementById("scrim");
  if(sb) sb.classList.add("open"); if(sc) sc.classList.add("on");
}
function wireDrawer(){
  const sc=document.getElementById("scrim");
  const btn=document.getElementById("mnav");
  if(btn) btn.onclick=openDrawer;
  const ms=document.getElementById("msearch");
  if(ms) ms.onclick=openCommandPalette;
  if(sc) sc.onclick=closeDrawer;
  const tag=document.getElementById("mt-tag"); if(tag) tag.textContent=activeProfile().name;
  window.addEventListener("resize",()=>{ if(window.innerWidth>900) closeDrawer(); });
}
function render(){
  const tag=document.getElementById("mt-tag"); if(tag) tag.textContent=activeProfile().name;
  if(view==="home") renderHome();
  else if(view==="flow") renderFlow();
  else if(view==="jobs") renderJobs();
  else if(view==="board") renderBoard();
  else if(view==="calendar") renderCalendar();
  else if(view==="week") renderWeek();
  else if(view==="resume") renderResumeLib();
  else if(view==="match") renderMatch();
  else if(view==="interview") renderInterview();
  else if(view==="reverse") renderReverse();
  else if(view==="help") renderHelp();
  else if(view==="settings") renderSettings();
  else if(view==="insight") renderInsight();
  else renderModule(view);
}

/* 侧栏分组 + 移动端底部标签栏（唯一导航数据源） */
const NAV_GROUPS = [
  { sep:"求职主线", items:[
    {go:"home", icon:"home", label:"首页"},
    {go:"flow", icon:"target", label:"求职流程"},
    {go:"jobs", icon:"briefcase", label:"岗位库"},
    {go:"board", icon:"grid", label:"投递看板"},
    {go:"calendar", icon:"calendar", label:"截止日历"},
    {go:"resume", icon:"file", label:"简历库"},
    {go:"match", icon:"chart", label:"匹配分析"},
  ]},
  { sep:"面试演练", items:[
    {go:"interview", icon:"chat", label:"模拟面试"},
    {go:"reverse", icon:"help", label:"反问助手"},
  ]},
  { sep:"复盘沉淀", items:[
    {go:"week", icon:"activity", label:"本周周报"},
    {go:"todo", icon:"list", label:"复盘待办"},
    {go:"note", icon:"pen", label:"复盘笔记"},
  ]},
  { sep:"偏好", items:[
    {go:"help", icon:"book", label:"帮助中心"},
    {go:"settings", icon:"settings", label:"设置"},
  ]},
];
const TABS = [
  {go:"home", icon:"home", label:"首页"},
  {go:"jobs", icon:"briefcase", label:"岗位"},
  {go:"board", icon:"grid", label:"看板"},
  {go:"interview", icon:"chat", label:"面试"},
  {more:true, icon:"menu", label:"更多"},
];
function buildNav(){
  $("#brandName").textContent=CONFIG.owner; $("#brandSlogan").textContent=CONFIG.slogan;
  const items=[];
  NAV_GROUPS.forEach(g=>{ items.push({sep:g.sep}); g.items.forEach(it=>items.push(it)); });
  /* 无障碍：不写 aria-label，让可访问名直接取元素内可见文本「搜索 Ctrl K」，避免与可见文本不一致 */
  $("#nav").innerHTML=`<button type="button" class="navi navi-search" id="nav-search">
      ${icon("search",19)}<span>搜索</span><kbd class="navi-kbd">${isMac?"⌘K":"Ctrl K"}</kbd></button>`
    + items.map(it=>it.sep?`<div class="nav-sep">${it.sep}</div>`
    :`<a class="navi" href="#/${it.go}" data-go="${it.go}">${icon(it.icon,19)}${it.label}</a>`).join("");
  const ns=$("#nav-search"); if(ns) ns.onclick=openCommandPalette;
  /* 已在该页时再点一次：回到顶部并重渲染（原生锚点此时不会触发 hashchange） */
  $("#nav").querySelectorAll("[data-go]").forEach(el=>{
    el.addEventListener("click", ev=>{
      if(location.hash === el.getAttribute("href")){ ev.preventDefault(); applyRoute(); }
    });
  });
  const tb=document.getElementById("tabbar");
  if(tb){
    tb.innerHTML=TABS.map(t=>`<button class="tab" ${t.more?'data-more="1"':`data-go="${t.go}"`} aria-label="${t.label}">${icon(t.icon,21)}<span>${t.label}</span></button>`).join("");
    tb.querySelectorAll("[data-go]").forEach(el=>el.onclick=()=>go(el.dataset.go));
    const more=tb.querySelector("[data-more]"); if(more) more.onclick=openDrawer;
  }
  renderNavActive();
}
function renderNavActive(){
  $("#nav").querySelectorAll(".navi").forEach(el=>{
    const on = el.dataset.go===view;
    el.classList.toggle("active", on);
    if(on) el.setAttribute("aria-current","page"); else el.removeAttribute("aria-current");
  });
  const tb=document.getElementById("tabbar");
  if(tb){
    const inTabs = TABS.some(t=>t.go===view);
    tb.querySelectorAll(".tab").forEach(el=>{
      const on = el.dataset.go ? el.dataset.go===view : (!inTabs);
      el.classList.toggle("active", on);
      if(on) el.setAttribute("aria-current","page"); else el.removeAttribute("aria-current");
    });
  }
}

/* ---------- avatar upload ---------- */
$("#avaCam").innerHTML = icon("camera",18);
if(data.__avatar){ $("#avaImg").src = data.__avatar; $("#avaImg").style.display="block"; $("#avaPh").style.display="none"; }
$("#ava").onclick = () => $("#avatarInput").click();
$("#avatarInput").onchange = e => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => { data.__avatar = reader.result; $("#avaImg").src = reader.result;
    $("#avaImg").style.display="block"; $("#avaPh").style.display="none"; store.save(); };
  reader.readAsDataURL(f);
  e.target.value = "";
};

/* ---------- utils ---------- */
function esc(s){ return String(s??"").replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function attr(s){ return esc(s).replace(/"/g,'&quot;'); }
