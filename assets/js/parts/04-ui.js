/* ============================================================
   JOBSEARCH · UI 基础
   ============================================================ */
function headHTML(title, sub, extra){
  return `<div class="header"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div><div class="spacer"></div>${extra||`<span class="date-chip">${icon("calendar",14)} ${dateStr()}</span>`}</div>`;
}
function scoreRing(score, cap){
  const col=score>=75?"var(--success)":score>=60?"var(--warning)":"var(--danger)";
  const r=50, c=2*Math.PI*r, off=c*(1-clamp(score,0,100)/100);
  return `<div class="score-ring"><svg viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--border)" stroke-width="8"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
    <div class="mid"><span class="big" style="color:${col}">${score}</span><span class="cap">${cap||"/ 100"}</span></div></div>`;
}
function emptyState(ic,title,desc,cta,act){
  return `<div class="empty-state"><div class="e">${icon(ic,26)}</div><h3>${esc(title)}</h3><p>${esc(desc)}</p>
    ${cta?`<button class="btn mt12" data-act="${act}">${esc(cta)}</button>`:""}</div>`;
}

/* ============================================================
   JOBSEARCH · 基础工具
   ============================================================ */
const uid = p => (p||"id") + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

/* ============================================================
   JOBSEARCH · 求职流程向导
   ============================================================ */
function flowState(){
  const job=activeJob(), res=activeResume();
  const m=(job&&res)?runMatch(job.id,res.id):null;
  const customized=(data.resumes||[]).some(r=>r.parentId);
  const practiced=(data.sessions||[]).length>0;
  return [
    {n:1,key:"jobs",done:(data.jobs||[]).length>0,title:"录入岗位 JD",
     desc:job?`当前：${job.company} · ${job.title}`:"把招聘网站上的 JD 原样粘贴进来，系统自动拆出职责、硬性要求与加分项。",
     cta:job?"查看岗位库":"录入第一个岗位",go:"jobs"},
    {n:2,key:"resume",done:(data.resumes||[]).length>0,title:"录入你的简历",
     desc:res?`当前：${res.name}（${resYears(res)} 年经验）`:"按经历分条填写，每条尽量带数字；这是后面所有分析的基础。",
     cta:res?"管理简历":"录入简历",go:"resume"},
    {n:3,key:"match",done:!!m,title:"匹配诊断",
     desc:m?`匹配分 ${m.score}，硬性缺失 ${m.hardMiss} 项`:"看技能覆盖、经验年限、量化密度，以及 ATS 能不能读懂你的简历。",
     cta:m?"查看诊断":"开始诊断",go:"match"},
    {n:4,key:"match",done:customized,title:"生成定制版简历",
     desc:customized?"已生成定制版，可继续采纳建议迭代":"一键按岗位改写，或逐条勾选采纳；每条都能看到「改前 / 改后」和理由，编造的内容会被标记。",
     cta:"去改写",go:"match"},
    {n:5,key:"interview",done:practiced,title:"模拟面试与答辩",
     desc:practiced?`已完成 ${(data.sessions||[]).length} 场，可取最近一场复盘`:"面试官按岗位要求连续追问，结束后给出四维评分和改进项。",
     cta:"开始面试",go:"interview"},
  ];
}
function renderFlow(){
  const steps=flowState();
  const done=steps.filter(s=>s.done).length;
  const cur=steps.findIndex(s=>!s.done);
  const m=runMatch(data.activeJobId,data.activeResumeId);
  $("#screen").innerHTML = headHTML("求职流程","五步走完一轮投递：读岗 → 对简历 → 改写 → 面试 → 反问")
    + `<div class="panel-lg">
        <div class="flex" style="justify-content:space-between">
          <div><h3>${icon("target",16)} 本轮进度</h3><div class="ph-sub">已完成 ${done} / 5 步</div></div>
          <span class="badge ${done>=4?'ok':'warn'}">${done>=4?"可以投递":"继续推进"}</span>
        </div>
        <div class="stepbar mt12">
          ${steps.map((s,i)=>`<div class="step ${s.done?'done':(i===cur?'active':'')}" data-go-step="${s.go}">
            <span class="sn">${s.done?icon("check",14,2.6):s.n}</span><span class="sl">${s.title.replace(/（.*/,"").replace(/与答辩/,"")}</span></div>
            ${i<steps.length-1?`<span class="step-line"></span>`:""}`).join("")}
        </div>
        <div class="alert info">${icon("alert",14)} <b>顺序很重要：</b>先对齐关键词再改写，最后才练面试。反过来做，练的是一份不匹配的简历。</div>
      </div>
      <div class="split mt18">
        ${steps.map(s=>`<div class="panel-lg">
          <div class="flex" style="justify-content:space-between">
            <h3><span class="badge ${s.done?'ok':'demo'}">${s.done?"已完成":"待完成"}</span> ${esc(s.title)}</h3>
            <span class="tiny">STEP ${s.n}</span>
          </div>
          <div class="lead mt8">${esc(s.desc)}</div>
          <div class="flex mt12"><button class="btn ${s.done?'line':''} sm" data-go-step="${s.go}">${esc(s.cta)}</button>
          ${s.n===5&&m?`<span class="tiny">参考匹配分 ${m.score}</span>`:""}</div>
        </div>`).join("")}
      </div>`;
  wireFlow();
}
function wireFlow(){
  $("#screen").querySelectorAll("[data-go-step]").forEach(el=>el.onclick=()=>go(el.dataset.goStep));
}
