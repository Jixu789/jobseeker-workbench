/* ============================================================
   启程 v2 · 投递看板 / 截止日历 / 本周周报 / 帮助中心
   ============================================================ */
let boardStage = "todo";
let calMonth = null;

function isoDay(d){ return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
function dayDiff(iso){
  const m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(iso||"").trim());
  if(!m) return null;
  const t=new Date(+m[1], +m[2]-1, +m[3]);
  if(isNaN(t.getTime())) return null;
  const n=new Date(), today=new Date(n.getFullYear(),n.getMonth(),n.getDate());
  return Math.round((t.getTime()-today.getTime())/86400000);
}
function deadlineDays(j){ return dayDiff(j&&j.deadline); }
function urgentOf(d){
  if(d===null||d===undefined) return "";
  if(d<0) return "已过期 "+(-d)+" 天";
  if(d===0) return "今天截止";
  if(d===1) return "明天截止";
  if(d<=7) return "还剩 "+d+" 天";
  return d+" 天后截止";
}
function stageLabel(k){ const s=STAGES.find(x=>x.key===k); return s?s.label:k; }
/* 推进记录一行文字：投递带渠道，阶段变更带来源备注 */
function jobEventText(e){
  if(!e) return "";
  if(e.type==="applied") return "投递"+(e.method?"（"+e.method+"）":"");
  if(e.type==="stage") return stageLabel(e.from)+" → "+stageLabel(e.to)+(e.note?"（"+e.note+"）":"");
  return e.note||e.type||"变更";
}

/* 统一改阶段：中文 status 是事实，stage / events 只是派生记录 */
function setJobStage(j, stage, note){
  if(!j || !STAGES.some(s=>s.key===stage)) return false;
  const from=stageOf(j.status);
  if(from===stage) return false;
  const at=nowISO();
  j.status=statusOfStage(stage);
  j.stage=stage;
  j.stageAt=at;
  if(!Array.isArray(j.events)) j.events=[];
  j.events.unshift({ at, type:"stage", from, to:stage, note:note||"" });
  j.events=j.events.slice(0,80);
  if(stage!=="todo" && !j.appliedAt) j.appliedAt=at;
  return true;
}
function pushJobEvent(j, type, extra){
  if(!j) return;
  if(!Array.isArray(j.events)) j.events=[];
  j.events.unshift(Object.assign({ at:nowISO(), type }, extra||{}));
  j.events=j.events.slice(0,80);
}

/* ---------- 投递看板 ---------- */
const STALL_DAYS = 14;   /* 超过这么久没有阶段变更，就算停滞 */
function stageAgeDays(j){
  const t=new Date(j.stageAt||j.appliedAt||j.createdAt||"").getTime();
  if(!t||isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now()-t)/86400000));
}
/* 已结束和已拿 offer 不再催；其余按停滞时间从长到短 */
function stalledJobs(jobs){
  return (jobs||[]).filter(j=>{
    const st=stageOf(j.status);
    if(st==="closed"||st==="offer") return false;
    return stageAgeDays(j)>=STALL_DAYS;
  }).sort((a,b)=>stageAgeDays(b)-stageAgeDays(a));
}
function boardKpis(jobs){
  const now=Date.now();
  const recent=jobs.filter(j=>{
    const t=new Date(j.appliedAt||"").getTime();
    return t && !isNaN(t) && now-t<=7*86400000;
  }).length;
  const cnt=k=>jobs.filter(j=>stageOf(j.status)===k).length;
  const denom=cnt("applied")+cnt("interview")+cnt("offer")+cnt("closed");
  return { total:jobs.length, recent, interview:cnt("interview"), offer:cnt("offer"),
    rate:denom?Math.round(cnt("offer")/denom*100):0, stalled:stalledJobs(jobs).length };
}
function boardCard(j){
  const res=activeResume();
  const m=res?runMatch(j.id,res.id):null;
  const d=deadlineDays(j), u=urgentOf(d), st=stageOf(j.status);
  const age=stageAgeDays(j), stall=st!=="closed"&&st!=="offer"&&age>=STALL_DAYS?age:0;
  return `<div class="bcard" data-id="${j.id}" draggable="true">
    <div class="bt">${esc(j.title||"未填岗位")}</div>
    <div class="bm">${esc(j.company||"未填公司")}${j.location?" · "+esc(j.location):""}</div>
    <div class="bf">
      ${u?`<span class="bb ${d!==null&&d<=3?"urg":""}">${icon("clock",12)} ${esc(u)}</span>`:""}
      ${m?`<span class="bb">${icon("target",12)} ${m.score} 分</span>`:""}
      ${stall?`<span class="bb warn">${icon("alert",12)} 停滞 ${stall} 天</span>`:""}
    </div>
    ${j.nextAction?`<div class="bnx">${icon("bolt",12)}<span>${esc(j.nextAction)}${j.nextAt?` · ${esc(String(j.nextAt).slice(5,10))}`:""}</span></div>`:""}
    <div class="brow">
      <select class="bst-sel" data-id="${j.id}" aria-label="修改投递阶段">
        ${STAGES.map(s=>`<option value="${s.key}"${st===s.key?" selected":""}>${s.label}</option>`).join("")}
      </select>
      ${j.appliedAt?`<span class="tiny bapp" title="投递于 ${attr(String(j.appliedAt).slice(0,10))}">${esc(String(j.appliedAt).slice(5,10))}</span>`:""}
    </div>
  </div>`;
}
function renderBoard(){
  const jobs=data.jobs||[];
  const counts={}; STAGES.forEach(s=>counts[s.key]=0);
  jobs.forEach(j=>{ const k=stageOf(j.status); counts[k]=(counts[k]||0)+1; });
  const kp=boardKpis(jobs), stallList=stalledJobs(jobs);
  const cols=STAGES.map(s=>{
    const list=jobs.filter(j=>stageOf(j.status)===s.key);
    const hide=s.key!==boardStage?" hide-sm":"";
    return `<div class="bcol${hide}" data-stage="${s.key}">
      <div class="bcol-head"><span class="dot" style="background:${s.color}"></span>${s.label}<span class="cnt">${counts[s.key]}</span></div>
      ${list.length? list.map(boardCard).join("")
        : `<div class="b-empty">${s.key==="todo"?"还没有待投岗位；去岗位库新建，或把卡片拖进来。"
          :s.key==="applied"?"点岗位上的「一键投递」，这里会自动出现。"
          :"把卡片拖到这里，或用卡片底部的阶段下拉。"}</div>`}
    </div>`;
  }).join("");
  $("#screen").innerHTML = headHTML("投递看板","拖动卡片改阶段；每次变更都会写进该岗位的时间线",
      `<span class="badge">${jobs.length} 个岗位</span><button class="btn sm" id="board-new" style="margin-left:10px">${icon("plus",15,2.4)} 新建岗位</button>`)
    + `<div class="kpi-row mt12">
        <div class="kpi"><div class="l">${icon("briefcase",14)} 岗位总数</div>
          <div class="n">${kp.total}</div><div class="t">含已结束的投递</div></div>
        <div class="kpi"><div class="l">${icon("send",14)} 近 7 天投递</div>
          <div class="n">${kp.recent}</div><div class="t">按首次投递时间统计</div></div>
        <div class="kpi"><div class="l">${icon("chat",14)} 面试中</div>
          <div class="n">${kp.interview}</div><div class="t">Offer 转化 ${kp.offer} 份 · ${kp.rate}%</div></div>
        <div class="kpi${kp.stalled?" warn-kpi":""}"><div class="l">${icon("alert",14)} 停滞 ${STALL_DAYS} 天以上</div>
          <div class="n">${kp.stalled}</div><div class="t">${kp.stalled?"向下看停滞提醒":"每个岗位都在推进"}</div></div>
      </div>`
    + (stallList.length?`<div class="panel-lg mt18" id="board-stall">
        <h3>${icon("alert",16)} 停滞提醒 <span class="badge warn">${stallList.length}</span></h3>
        <div class="ph-sub">超过 ${STALL_DAYS} 天没有改过阶段，先推进或归档，别让它们吊着</div>
        <div class="mt12">${stallList.slice(0,5).map(j=>`
          <div class="cov-row">
            <span class="dot-pass" style="background:var(--warning)"></span>
            <div class="cv"><b>${esc(j.title||"未填岗位")}</b>
              <div class="tiny">${esc(j.company||"未填公司")} · ${stageLabel(stageOf(j.status))} · 已 ${stageAgeDays(j)} 天没动</div></div>
            <button class="btn ghost sm js-stall" data-id="${j.id}">打开</button>
          </div>`).join("")}
          ${stallList.length>5?`<div class="tiny mt8">还有 ${stallList.length-5} 个，处理完前 5 个再看</div>`:""}
        </div>
      </div>`:"")
    + `<div class="board-tabs" id="board-tabs">${STAGES.map(s=>`<span class="chip click${boardStage===s.key?" on":""}" data-bs="${s.key}">${s.label} ${counts[s.key]}</span>`).join("")}</div>`
    + `<div class="board mt12" id="board">${cols}</div>`
    + `<div class="panel-lg mt18"><h3>${icon("alert",16)} 阶段怎么用</h3>
        <div class="lead mt8">待投递 → 已投递（点「一键投递」自动进入）→ 面试中 → Offer / 已结束。<br>
        桌面端可以直接拖动卡片；手机端用卡片底部的「阶段」下拉。日历与周报读的是同一份阶段变更记录。</div></div>`;
  wireBoard();
}
function wireBoard(){
  const nb=$("#board-new"); if(nb) nb.onclick=()=>openJobForm(null);
  $("#screen").querySelectorAll("[data-bs]").forEach(el=>el.onclick=()=>{ boardStage=el.dataset.bs; render(); });
  $("#screen").querySelectorAll(".js-stall").forEach(b=>b.onclick=()=>openJobCard(b.dataset.id));
  $("#screen").querySelectorAll(".bst-sel").forEach(sel=>{
    sel.onchange=()=>{
      const j=getJob(sel.dataset.id); if(!j) return;
      const to=stageLabel(sel.value);
      if(setJobStage(j, sel.value, "看板阶段下拉")){
        store.save(); toast("已移到「"+to+"」，时间线记了一笔"); render();
      } else render();
    };
  });
  $("#screen").querySelectorAll(".bcard").forEach(el=>{
    el.onclick=e=>{ if(e.target.closest("select")) return; openJobCard(el.dataset.id); };
    el.ondragstart=e=>{ el.classList.add("dragging"); e.dataTransfer.setData("text/plain", el.dataset.id); e.dataTransfer.effectAllowed="move"; };
    el.ondragend=()=>el.classList.remove("dragging");
  });
  $("#screen").querySelectorAll(".bcol").forEach(col=>{
    col.ondragover=e=>{ e.preventDefault(); col.classList.add("over"); };
    col.ondragleave=()=>col.classList.remove("over");
    col.ondrop=e=>{
      e.preventDefault(); col.classList.remove("over");
      const j=getJob(e.dataTransfer.getData("text/plain"));
      if(j && setJobStage(j, col.dataset.stage, "看板拖动")){
        store.save(); toast("已移到「"+stageLabel(col.dataset.stage)+"」，时间线记了一笔"); render();
      }
    };
  });
}

/* ---------- 截止日历 ---------- */
function calNow(){ if(!calMonth){ const n=new Date(); calMonth={ y:n.getFullYear(), m:n.getMonth() }; } return calMonth; }
function calendarEvents(){
  const evs=[];
  (data.jobs||[]).forEach(j=>{
    const dl=String(j.deadline||"").slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(dl)) evs.push({ iso:dl, kind:"dl", jobId:j.id, text:"截止 · "+(j.company||"")+" "+(j.title||"") });
    const nx=String(j.nextAt||"").slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(nx)) evs.push({ iso:nx, kind:"nx", jobId:j.id, text:(j.nextAction||"下一步")+" · "+(j.company||"") });
  });
  return evs;
}
function renderCalendar(){
  const cm=calNow(), y=cm.y, m=cm.m;
  const start=(new Date(y,m,1).getDay()+6)%7;
  const dim=new Date(y,m+1,0).getDate();
  const byDate={}; calendarEvents().forEach(e=>{ (byDate[e.iso]=byDate[e.iso]||[]).push(e); });
  const todayISO=isoDay(new Date());
  const cells=[];
  for(let i=0;i<start;i++) cells.push(`<div class="cal-cell pad"></div>`);
  for(let d=1; d<=dim; d++){
    const iso=`${y}-${pad2(m+1)}-${pad2(d)}`;
    const list=(byDate[iso]||[]).slice().sort((a,b)=>(a.kind==="dl"?0:1)-(b.kind==="dl"?0:1));
    cells.push(`<div class="cal-cell${iso===todayISO?" today":""}">
      <div class="d">${d}<span class="wk">${"日一二三四五六"[new Date(y,m,d).getDay()]}</span></div>
      ${list.slice(0,3).map(e=>`<div class="cal-ev ${e.kind}" data-job="${e.jobId}" title="${attr(e.text)}">${esc(e.text)}</div>`).join("")}
      ${list.length>3?`<div class="cal-ev" data-job="${list[3].jobId}">+${list.length-3} 条</div>`:""}
    </div>`);
  }
  const tail=(7-cells.length%7)%7;
  for(let i=0;i<tail;i++) cells.push(`<div class="cal-cell pad"></div>`);
  const soon=(data.jobs||[]).map(j=>({ j, d:deadlineDays(j) }))
    .filter(x=>x.d!==null && x.d>=0 && x.d<=14).sort((a,b)=>a.d-b.d);
  $("#screen").innerHTML = headHTML("截止日历",`${y} 年 ${m+1} 月 · 红条是岗位截止日，蓝条是你定的下一步`,
      `<button class="iconbtn" id="cal-prev" aria-label="上个月" style="transform:rotate(180deg)">${icon("chevron",15)}</button>
       <button class="btn ghost sm" id="cal-today" style="margin:0 6px">本月</button>
       <button class="iconbtn" id="cal-next" aria-label="下个月">${icon("chevron",15)}</button>`)
    + `<div class="panel-lg mt12">
        <div class="cal-head">${["一","二","三","四","五","六","日"].map(d=>`<span>周${d}</span>`).join("")}</div>
        <div class="cal-grid">${cells.join("")}</div>
        <div class="cal-legend"><span><i style="background:var(--danger)"></i>岗位截止日</span><span><i style="background:var(--module-2)"></i>你定的下一步</span><span><i style="background:var(--accent)"></i>今天</span></div>
      </div>`
    + `<div class="panel-lg mt18"><h3>${icon("clock",16)} 未来 14 天</h3>
        ${soon.length? `<div class="wk-list mt8">${soon.map(x=>`<div class="wk-row">
            <span class="when">${esc(String(x.j.deadline).slice(5))}</span>
            <span class="what"><b>${esc(x.j.title||"未填岗位")}</b> · ${esc(x.j.company||"未填公司")}</span>
            <span class="tiny" style="color:${x.d<=3?"var(--danger)":"var(--text-tertiary)"}">${esc(urgentOf(x.d))}</span></div>`).join("")}</div>`
          : `<div class="tiny mt8">14 天内没有截止的岗位。给岗位补上截止日，日历才会有内容。</div>`}</div>`;
  wireCalendar();
}
function wireCalendar(){
  const shift=n=>{ const cm=calNow(); let y=cm.y, m=cm.m+n; if(m<0){ m=11; y--; } if(m>11){ m=0; y++; } calMonth={ y, m }; render(); };
  const prev=$("#cal-prev"), next=$("#cal-next"), td=$("#cal-today");
  if(prev) prev.onclick=()=>shift(-1);
  if(next) next.onclick=()=>shift(1);
  if(td) td.onclick=()=>{ calMonth=null; render(); };
  $("#screen").querySelectorAll(".cal-ev[data-job]").forEach(el=>el.onclick=()=>openJobCard(el.dataset.job));
}

/* ---------- 本周周报 ---------- */
function weekISO(){
  const n=new Date(), dow=(n.getDay()+6)%7;
  const mon=new Date(n.getFullYear(),n.getMonth(),n.getDate()-dow);
  const arr=[]; for(let i=0;i<7;i++) arr.push(isoDay(new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+i)));
  return arr;
}
function weekEvents(){
  const out=[];
  (data.jobs||[]).forEach(j=>{
    (j.events||[]).forEach(e=>{
      if(!e||!e.at) return;
      if(e.type==="applied") out.push({ at:e.at, kind:"applied", jobId:j.id, text:`投递 ${j.company||"未填公司"} · ${j.title||"未填岗位"}` });
      else if(e.type==="stage") out.push({ at:e.at, kind:"stage", jobId:j.id, text:`${j.company||""} · ${j.title||""}：${stageLabel(e.from)} → ${stageLabel(e.to)}` });
    });
  });
  (data.sessions||[]).forEach(s=>{
    const at=s.finishedAt||s.startedAt; if(!at) return;
    out.push({ at, kind:"session", jobId:s.jobId, text:`模拟面试：${s.jobTitle||"未绑定岗位"}${s.total!=null?" · "+s.total+" 分":""}` });
  });
  (data.todo||[]).forEach(t=>{
    if(!t.done||!t.doneAt) return;
    out.push({ at:t.doneAt, kind:"todo", text:`完成待办：${t.title||""}` });
  });
  return out.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
}
function weekStats(){
  const days=weekISO(), per={};
  days.forEach(d=>per[d]={ applied:0, stage:0, session:0, todo:0, rows:[] });
  weekEvents().forEach(e=>{
    const p=per[String(e.at).slice(0,10)]; if(!p) return;
    p[e.kind]++; p.rows.push(e);
  });
  const sum=k=>days.reduce((s,d)=>s+per[d][k],0);
  return { days, per, applied:sum("applied"), stage:sum("stage"), session:sum("session"), todo:sum("todo") };
}
function weekMarkdown(){
  const st=weekStats(), days=st.days;
  const lines=[`# 启程周报 · 第 ${weekNum()} 周（${days[0].slice(5)} – ${days[6].slice(5)}）`,"",
    `- 投递：${st.applied}`,
    `- 阶段推进：${st.stage}`,
    `- 模拟面试：${st.session} 场`,
    `- 完成待办：${st.todo}`,"","## 本周时间线"];
  const rows=days.flatMap(d=>st.per[d].rows).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  if(rows.length) rows.forEach(e=>lines.push(`- ${String(e.at).replace("T"," ").slice(5,16)} ${e.text}`));
  else lines.push("- 本周还没有记录");
  const soon=(data.jobs||[]).map(j=>({ j, d:deadlineDays(j) }))
    .filter(x=>x.d!==null && x.d>=0 && x.d<=14).sort((a,b)=>a.d-b.d);
  lines.push("","## 未来 14 天截止");
  if(soon.length) soon.forEach(x=>lines.push(`- ${x.j.deadline} ${x.j.company||""} ${x.j.title||""}（${urgentOf(x.d)}）`));
  else lines.push("- 没有临近截止的岗位");
  lines.push("","（统计只含本机记录：投递、阶段变更、模拟面试、待办完成）");
  return lines.join("\n");
}
function renderWeek(){
  const st=weekStats(), days=st.days;
  const max=Math.max(1,...days.map(d=>st.per[d].applied+st.per[d].stage+st.per[d].session+st.per[d].todo));
  const rows=days.flatMap(d=>st.per[d].rows).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,30);
  const soon=(data.jobs||[]).map(j=>({ j, d:deadlineDays(j) }))
    .filter(x=>x.d!==null && x.d>=0 && x.d<=14).sort((a,b)=>a.d-b.d);
  $("#screen").innerHTML = headHTML(`本周周报 · 第 ${weekNum()} 周`,`${days[0].slice(5)} – ${days[6].slice(5)} · 只统计本机记录，不联网`,
      `<button class="btn sm" id="wk-copy">${icon("copy",15)} 复制周报</button>`)
    + `<div class="wk-kpis mt12">
        <div class="wk-kpi"><div class="n">${st.applied}</div><div class="l">本周投递</div></div>
        <div class="wk-kpi"><div class="n">${st.stage}</div><div class="l">阶段推进</div></div>
        <div class="wk-kpi"><div class="n">${st.session}</div><div class="l">模拟面试</div></div>
        <div class="wk-kpi"><div class="n">${st.todo}</div><div class="l">完成待办</div></div>
      </div>`
    + `<div class="panel-lg mt18"><h3>${icon("activity",16)} 每日动作</h3>
        <div class="wk-bars mt8">${days.map(d=>{
          const p=st.per[d], n=p.applied+p.stage+p.session+p.todo;
          const h=n?Math.round(n/max*104)+6:4;
          return `<div class="wk-day"><span class="n">${n||""}</span><div class="bar${n?"":" zero"}" style="height:${h}px"></div><span class="d">${esc(d.slice(8))}</span></div>`;
        }).join("")}</div>
        <div class="tiny mt8">柱高按本周最大单日动作数等比缩放，灰色代表 0。</div></div>`
    + `<div class="panel-lg mt18"><h3>${icon("list",16)} 本周时间线</h3>
        ${rows.length? `<div class="wk-list mt8">${rows.map(e=>`<div class="wk-row">
            <span class="when">${esc(String(e.at).replace("T"," ").slice(5,16))}</span>
            <span class="what">${esc(e.text)}</span></div>`).join("")}</div>`
          : `<div class="tiny mt8">本周还没有记录。投递一次、推进一个阶段或完成一场模拟面试，这里就会长出来。</div>`}</div>`
    + `<div class="panel-lg mt18"><h3>${icon("clock",16)} 未来 14 天截止</h3>
        ${soon.length? `<div class="wk-list mt8">${soon.map(x=>`<div class="wk-row">
            <span class="when">${esc(String(x.j.deadline).slice(5))}</span>
            <span class="what"><b>${esc(x.j.title||"未填岗位")}</b> · ${esc(x.j.company||"未填公司")}</span>
            <span class="tiny" style="color:${x.d<=3?"var(--danger)":"var(--text-tertiary)"}">${esc(urgentOf(x.d))}</span></div>`).join("")}</div>`
          : `<div class="tiny mt8">没有临近截止的岗位。</div>`}</div>`;
  wireWeek();
}
function wireWeek(){
  const cp=$("#wk-copy");
  if(cp) cp.onclick=()=>copyText(weekMarkdown());
}

/* ---------- 帮助中心 + 新手引导 ---------- */
const FAQ_ITEMS = [
  { q:"换电脑、换浏览器，数据还在吗？", a:"不在。所有内容都存在当前设备当前浏览器的本地存储里。换设备前，请在「设置 → 本机数据」导出 JSON 或加密备份，再到新设备导入。" },
  { q:"为什么朋友打开链接看不到我的数据？", a:"分享出去的只是应用本身。数据不进服务器，每个人打开都是自己的空白工作台，互相看不到。" },
  { q:"「一键投递」会替我填表或提交吗？", a:"不会。它只打开公司官网的投递页，并在本地记一笔「已投递」；表单仍由你自己在官网填写提交。" },
  { q:"看板上的卡片拖不动？", a:"手机端不支持拖拽，请用卡片底部的「阶段」下拉；桌面端可以按住卡片拖到目标列。" },
  { q:"周报统计哪些动作？", a:"投递、阶段推进、完成的模拟面试、勾选完成的待办，全部按本机时间归入本周（周一至周日）。" },
  { q:"匹配分为什么会被压到 59 以下？", a:"缺任一硬性要求时风险偏高，分数会被封顶。先按缺口清单补强简历，再投递更稳。" },
  { q:"想清空重来怎么办？", a:"「设置 → 本机数据 → 清空」有二次确认；清空前先导出备份，本地清空无法恢复。" },
  { q:"忘记 API Key 的加密口令了怎么办？", a:"口令不上传也不落盘，无法找回。到「设置 → API 配置 → 移除密钥」后重新填入 Key 并设新口令即可；岗位、简历等数据不受影响。" },
];
function renderHelp(){
  $("#screen").innerHTML = headHTML("帮助中心","三分钟了解启程怎么用、数据存在哪、哪些事它不会替你做",
      `<button class="btn sm" id="help-tour">${icon("spark",15)} 重看新手引导</button>`)
    + `<div class="help-grid mt12">
        <div class="help-card"><h3>${icon("spark",16)} 5 分钟上手</h3>
          <ol><li>岗位库 → 新建岗位，粘贴 JD，系统自动拆要求。</li>
          <li>简历库 → 录入主简历，每条经历尽量带数字。</li>
          <li>匹配分析 → 看缺口，按建议改简历。</li>
          <li>模拟面试 → 练一场，拿四维评分。</li>
          <li>投递看板 → 投完拖动卡片，周报自动汇总。</li></ol></div>
        <div class="help-card"><h3>${icon("alert",16)} 数据与隐私</h3>
          <p>不用注册，没有服务器，内容只留在本机浏览器。清缓存、换设备、换浏览器都会丢。</p>
          <p>多人共用一台设备，请在「设置 → 本机档案」各建一份；不同档案之间数据互不可见。</p>
          <p>API Key 只存在本机。建议在「设置 → API 配置」设一个口令加密保存：密文用 AES-256-GCM 存本机、口令不落盘，刷新页面后需解锁才能调用接口。</p></div>
        <div class="help-card"><h3>${icon("file",16)} 导入与回填</h3>
          <p>岗位弹窗和简历弹窗都支持上传 / 拖入 TXT、Markdown、DOCX、PDF（含文字层）。</p>
          <p>识别后先追加到文本框，点「回填到上方各栏」才会填表；只填空栏，不覆盖已写内容。旧版 .doc 请先另存为 .docx 或 PDF。</p></div>
        <div class="help-card"><h3>${icon("grid",16)} 移动端与桌面端</h3>
          <p>窄屏底部有 5 个标签：首页 / 岗位 / 看板 / 面试 / 更多；「更多」打开完整导航抽屉。</p>
          <p>看板在手机上改为按阶段切换；弹窗从底部弹出。桌面端支持卡片拖拽。</p></div>
      </div>`
    + `<div class="panel-lg mt18"><h3>${icon("help",16)} 常见问题</h3>
        <div class="mt8">${FAQ_ITEMS.map((f,i)=>`<div class="faq-item" data-faq="${i}">
          <button class="faq-q" type="button">${esc(f.q)}<span class="ar">${icon("chevron",14)}</span></button>
          <div class="faq-a">${esc(f.a)}</div></div>`).join("")}</div></div>`
    + `<div class="panel-lg mt18"><h3>${icon("alert",16)} 它不做什么</h3>
        <div class="lead mt8">不替你提交表单、不伪造经历、不上传你的简历到任何服务器。匹配与评分都是本机规则计算，结果只作参考。</div></div>`;
  wireHelp();
}
function wireHelp(){
  $("#screen").querySelectorAll(".faq-q").forEach(btn=>{
    btn.onclick=()=>btn.closest(".faq-item").classList.toggle("open");
  });
  const tour=$("#help-tour"); if(tour) tour.onclick=()=>startOnboarding();
}
function maybeOnboarding(){
  if(!(data.settings && data.settings.privacyAck)) return;
  if(data.settings.onboarded) return;
  startOnboarding();
}
function startOnboarding(){
  const steps=[
    { t:"欢迎来到启程", h:`<div class="sub">从第一份简历，到第一份 Offer。</div>
        <div class="lead mt8">岗位、简历、匹配、模拟面试、投递看板、周报，全部在同一个工作台；不用注册，也不联网。</div>` },
    { t:"你的数据只在本地", h:`<div class="lead">内容存在这台设备当前浏览器的本地存储里，别人打开同一个链接看到的是自己的空白工作台。</div>
        <div class="lead mt8">换设备或清缓存会丢，请在「设置 → 本机数据」导出备份。</div>` },
    { t:"建议的动线", h:`<div class="lead">① 岗位库录入 JD　② 简历库录入主简历　③ 匹配分析看缺口　④ 模拟面试练一场　⑤ 投递后在看板拖卡片，周报自动汇总。</div>
        <div class="tiny mt8">随时可以在「帮助中心」重看这段引导。</div>` },
  ];
  let i=0;
  const ov=openModal(`<div id="ob-body"></div>
    <div class="modal-actions"><span class="tiny" id="ob-dot"></span><span style="flex:1"></span>
      <button class="btn ghost" id="ob-skip">跳过</button><button class="btn" id="ob-next">下一步</button></div>`);
  const finish=()=>{ data.settings=data.settings||{}; data.settings.onboarded=true; store.save(); ov.remove(); };
  ov.onclick=e=>{ if(e.target===ov) finish(); };
  const paint=()=>{
    ov.querySelector("#ob-body").innerHTML=`<h3>${steps[i].t}</h3>${steps[i].h}`;
    ov.querySelector("#ob-dot").textContent=`${i+1} / ${steps.length}`;
    ov.querySelector("#ob-next").textContent=i===steps.length-1?"开始使用":"下一步";
    /* 标题是动态注入的，弹层可访问名称跟着当前步骤走 */
    const box=ov.querySelector(".modal"); if(box) box.setAttribute("aria-label", steps[i].t);
  };
  ov.querySelector("#ob-skip").onclick=finish;
  ov.querySelector("#ob-next").onclick=()=>{ if(i>=steps.length-1){ finish(); return; } i++; paint(); };
  paint();
}
