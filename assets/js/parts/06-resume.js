/* ============================================================
   JOBSEARCH · 简历库
   ============================================================ */
function renderResumeLib(){
  const all=data.resumes||[];
  $("#screen").innerHTML = headHTML("简历库","一份主简历 + 针对不同岗位的定制版；所有版本都可追溯",
      `<span class="badge">${all.length} 份</span><button class="btn sm" id="btn-res-new" style="margin-left:10px">${icon("plus",15,2.4)} 新建简历</button>`)
    + (all.length? `<div class="job-list mt12">${all.map(r=>resumeCardHTML(r)).join("")}</div>`
      : emptyState("file","还没有简历","录入一份主简历后，才能做匹配诊断与定制改写。","录入简历","new-resume"))
    + `<div class="panel-lg mt18"><h3>${icon("alert",16)} 录入建议</h3>
        <div class="lead mt8">1. 每条经历用「动词 + 动作 + 数字结果」写，例如“搭建指标体系，覆盖 12 个核心指标”。<br>
        2. 技能栏只放你真能聊 20 分钟的；面试官会挑着问。<br>
        3. 定制版简历是从主简历复制出来的，不会覆盖原件。</div></div>`;
  wireResumeLib();
}
function resumeCardHTML(r){
  const isCur=r.id===data.activeResumeId;
  return `<div class="job-card" data-res="${r.id}">
    <div class="jh"><span class="logo">${icon("file",19)}</span>
      <div class="grow"><div class="jt">${esc(r.name)}${r.parentId?' <span class="badge demo">定制版</span>':""}</div>
        <div class="jc">${esc(r.target||"未填目标岗位")} · ${resYears(r)} 年经验</div></div>
      ${isCur?'<span class="badge ok">当前</span>':""}</div>
    <div class="jm"><span>${icon("briefcase",13)} ${(r.experience||[]).length} 段经历</span><span>${icon("spark",13)} ${(r.projects||[]).length} 个项目</span><span>${icon("award",13)} ${(r.skills||[]).length} 项技能</span></div>
    <div class="chips mt12">${(r.skills||[]).slice(0,6).map(s=>`<span class="chip">${esc(s)}</span>`).join("")||'<span class="tiny">未填技能</span>'}</div>
    <div class="jf"><span class="tiny">${r.parentId?"基于「"+(getResume(r.parentId)?.name||"主简历")+"」改写":"主简历"}</span>
      <div style="flex:1"></div><span class="iconbtn js-res-edit" data-id="${r.id}" style="width:28px;height:28px">${icon("pen",14)}</span></div></div>`;
}
function wireResumeLib(){
  const nb=$("#btn-res-new"); if(nb) nb.onclick=()=>openResumeForm(null);
  $("#screen").querySelectorAll("[data-act='new-resume']").forEach(el=>el.onclick=()=>openResumeForm(null));
  $("#screen").querySelectorAll("[data-res]").forEach(el=>el.onclick=e=>{
    if(e.target.closest(".js-res-edit")) return; openResumeDetail(el.dataset.res);
  });
  $("#screen").querySelectorAll(".js-res-edit").forEach(el=>el.onclick=e=>{
    e.stopPropagation(); openResumeForm(getResume(el.dataset.id));
  });
}
function serExperiences(list){
  return (list||[]).map(e=>[e.company||"",e.role||"",e.period||"",(e.bullets||[]).join("；")].join("｜")).join("\n");
}
function parseExperiences(text){
  return String(text||"").split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
    const p=l.split("｜").map(s=>s.trim());
    return {company:p[0]||"",role:p[1]||"",period:p[2]||"",
      bullets:(p[3]||"").split(/[；;]/).map(s=>s.trim()).filter(Boolean)};
  });
}
function serProjects(list){
  return (list||[]).map(p=>[p.name||"",p.role||"",p.stack||"",p.star?.s||"",p.star?.a||"",p.star?.r||""].join("｜").replace(/[｜\s]+$/,"")).join("\n");
}
function parseProjects(text){
  return String(text||"").split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
    const p=l.split("｜").map(s=>s.trim());
    return {name:p[0]||"",role:p[1]||"",stack:p[2]||"",star:{s:p[3]||"",t:"",a:p[4]||"",r:p[5]||""}};
  });
}
function resumeBody(r){
  const ex=(r.experience||[]).map(e=>`${e.company}｜${e.role}｜${e.period}\n${(e.bullets||[]).map(b=>"· "+b).join("\n")}`).join("\n\n");
  const pj=(r.projects||[]).map(p=>`${p.name}｜${p.role}｜${p.stack}\n背景：${p.star?.s||""}\n行动：${p.star?.a||""}\n结果：${p.star?.r||""}`).join("\n\n");
  return `【个人简介】\n${r.summary||""}\n\n【核心技能】\n${(r.skills||[]).join(" · ")}\n\n【工作经历】\n${ex}\n\n【项目经历】\n${pj}\n\n【教育经历】\n${r.education||""}${r.honor?`\n\n【荣誉】\n${r.honor}`:""}`;
}
function openResumeForm(r){
  const d=r||{name:"",target:"",years:"",contact:"",summary:"",skills:[],experience:[],projects:[],education:"",honor:"",raw:""};
  const ov=openModal(`<h3>${r?"编辑简历":"新建简历"}</h3><div class="sub">结构化填写，才能被后面所有环节用起来</div>
    <div class="field-row three">
      <div class="field"><label>姓名</label><input id="rf-name" value="${attr(d.name)}" placeholder="张一鸣"/></div>
      <div class="field"><label>目标岗位</label><input id="rf-target" value="${attr(d.target)}" placeholder="高级数据分析师"/></div>
      <div class="field"><label>工作年限</label><input id="rf-years" type="number" value="${attr(d.years||"")}" placeholder="5"/></div></div>
    <div class="field"><label>联系方式</label><input id="rf-contact" value="${attr(d.contact)}" placeholder="手机 · 邮箱 · 城市"/></div>
    <div class="field"><label>个人简介</label><textarea id="rf-summary" placeholder="一句话定位 + 最硬的成果">${esc(d.summary)}</textarea></div>
    <div class="field"><label>核心技能</label><input id="rf-skills" value="${attr((d.skills||[]).join("、"))}" placeholder="SQL、Python、A/B 测试"/>
      <div class="modal-note">用中文顿号或逗号分隔；只写你能被追问 20 分钟的技能。</div></div>
    <div class="field"><label>工作经历（每行一段）</label><textarea id="rf-exp" class="ta-lg" placeholder="公司｜职位｜时间｜成果1；成果2">${esc(serExperiences(d.experience))}</textarea>
      <div class="modal-note">格式：公司｜职位｜起止时间｜成果1；成果2；成果3</div></div>
    <div class="field"><label>项目经历（每行一段）</label><textarea id="rf-proj" class="ta-lg" placeholder="项目名｜角色｜技术栈｜背景｜行动｜结果">${esc(serProjects(d.projects))}</textarea>
      <div class="modal-note">格式：项目名｜角色｜技术栈｜背景｜行动｜结果</div></div>
    <div class="field"><label>教育经历</label><input id="rf-edu" value="${attr(d.education)}" placeholder="学校 · 专业 · 学历 · 起止"/></div>
    <div class="field"><label>荣誉</label><textarea id="rf-honor" class="ta-sm" placeholder="国家励志奖学金 / 2024&#10;全国大学生电子设计竞赛省二等奖&#10;CET-4">${esc(String(d.honor||"").split(/[、]/).filter(Boolean).join("\n"))}</textarea>
      <div class="modal-note">一行一条；回填时只取简历里「获奖 / 荣誉 / 证书」段落，保留原顺序。</div></div>
    <div class="hr"></div>
    <div class="field"><label>上传或粘贴整份简历（可选，用于快速拆字段）</label><textarea id="rf-raw" class="ta-lg" placeholder="点下面按钮上传 Word / PDF / 截图，或把简历纯文本粘进来">${esc(d.raw||"")}</textarea>
      <div class="import-row">
        <button class="btn line sm" id="rf-import">${icon("upload",14)} 上传简历文件 / 截图</button>
        <span class="tiny">Word(.docx)、PDF、图片、TXT · 也可直接拖进上面的框 · 识别后点下面的回填按钮</span>
      </div>
      <div class="import-status tiny"></div>
      <div class="flex mt8"><button class="btn sm" id="rf-split">${icon("spark",14)} 回填到上方各栏</button>
        <span class="tiny">${aiReady()?"已启用 AI：个人简介、工作经历、项目经历由模型按原文生成/拆分，其余按本地规则；只填空栏，点完请核对":"按本地规则拆分；在「设置」配好 API 后，个人简介、工作经历、项目经历会交给 AI 识别"}</span></div>
      <div class="import-status tiny" id="rf-fill-status"></div></div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="rf-cancel">取消</button>
      <button class="btn" id="rf-save">保存</button></div>`, true);
  const val=id=>ov.querySelector(id).value;
  ov.querySelector("#rf-cancel").onclick=()=>ov.remove();
  wireImport("#rf-import","#rf-raw","resume",ov);
  ov.querySelector("#rf-split").onclick=async()=>{
    const raw=val("#rf-raw"); if(!raw.trim()){ toast("先上传或粘贴简历文本"); return; }
    const btn=ov.querySelector("#rf-split"), st=ov.querySelector("#rf-fill-status");
    const old=btn.innerHTML; btn.disabled=true; btn.textContent=aiReady()?"AI 识别中…":"识别中…";
    let r;
    try{ r=await autofillResume(raw,ov); }
    catch(e){ toast("回填失败："+(e.message||e)); return; }
    finally{ btn.disabled=false; btn.innerHTML=old; }
    if(st){
      const miss=r.missing.length?`未识别：${r.missing.join("、")}（可手动补充，或换一份更完整的简历）`:"";
      const ai=r.aiError?`AI 调用失败（${String(r.aiError).slice(0,60)}），已按本地规则填写。`:(r.aiNote||"");
      st.textContent=[miss,ai].filter(Boolean).join(" · ");
    }
    toast(r.n?`已回填 ${r.n} 个空栏${r.aiError?"（本地规则）":(r.aiNote?"（含 AI 识别）":"")}，请核对`
      : r.missing.length<10 ? "没有空栏可填，已填内容不会被覆盖"
      : "没识别到简历内容，检查文本是否完整");
  };
  ov.querySelector("#rf-save").onclick=()=>{
    const name=val("#rf-name").trim(); if(!name){ toast("先填姓名"); return; }
    const rec=r||{id:uid("r"),createdAt:nowISO()};
    Object.assign(rec,{
      name, target:val("#rf-target").trim(), years:+val("#rf-years")||0, contact:val("#rf-contact").trim(),
      summary:val("#rf-summary").trim(),
      skills:val("#rf-skills").split(/[、,，;；]/).map(s=>s.trim()).filter(Boolean),
      experience:parseExperiences(val("#rf-exp")),
      projects:parseProjects(val("#rf-proj")),
      education:val("#rf-edu").trim(), honor:val("#rf-honor").trim(), raw:val("#rf-raw").trim(), updatedAt:nowISO()
    });
    if(!r) data.resumes.unshift(rec);
    data.activeResumeId=rec.id; store.save(); ov.remove();
    toast("简历已保存"); render();
  };
}
/* --- 简历分段：标题归一化 → 分桶 → 结构化解析 --- */
const RV_HEADS=[
  {key:"info",re:/^(个人信息|基本信息|联系方式|个人资料)/},
  {key:"honors",re:/^(获奖情况|获奖经历|荣誉奖项|所获荣誉|奖项荣誉|荣誉证书|荣誉|奖励|奖学金|证书|技能证书|资格证书|所获证书|AWARDS|HONORS|CERTIFICATES)/},
  {key:"summary",re:/^(个人简介|自我评价|个人评价|个人优势|个人总结|自我介绍|关于我|职业概述|SUMMARY|PROFILE)/},
  {key:"skills",re:/^(核心技能|专业技能|技能清单|技能特长|技能专长|技术栈|核心能力|专业能力|IT技能|技能|SKILLS)/},
  {key:"experience",re:/^(工作经历|工作经验|职业经历|工作履历|职业履历|实习经历|实习经验|EXPERIENCE)/},
  {key:"projects",re:/^(项目经历|项目经验|项目实践|主要项目|代表项目|项目描述|校园经历|校园实践|实践经历|社团经历|竞赛经历|比赛经历|参赛经历|科研经历|课题经历|PROJECTS)/},
  {key:"education",re:/^(教育经历|教育背景|学习经历|教育|学历|EDUCATION)/}
];
const RV_DATE=/((?:19|20)\d{2}(?:\s*[.\-/年]\s*\d{1,2}\s*月?)?)\s*(?:-|–|—|~|～|至|到)\s*((?:19|20)\d{2}(?:\s*[.\-/年]\s*\d{1,2}\s*月?)?|至今|现在|今)/;
const RV_ROLE=/(工程师|经理|专员|分析师|设计师|开发|运营|销售|主管|总监|架构师|顾问|助理|实习生|技术员|研究员|教师|会计|Engineer|Manager|Developer|Analyst|Designer|Intern|Consultant|Specialist)/i;
const RV_CO=/(公司|集团|科技|有限|银行|研究院|研究所|大学|工作室|事务所|股份|事业部|中心|Co\.|Ltd|Inc\.?|Corp\.?|Company)/i;
const RV_PJ=/(项目|系统|平台|模块|APP|小程序|工具|框架|网站|机器人)/i;
const RV_EDU=/(?:(大学|学院|学校|中学)(?!生)|University|College|Institute|School|本科|专科|硕士|博士|学士|研究生|在读)/i;
function rvEduLike(l){
  const t=String(l||"");
  if(!RV_EDU.test(t)) return false;
  return !/(公司|集团|科技有限|有限公司|事业部)/.test(t);
}
function rvOnlyDate(l){
  const t=String(l||"");
  return RV_DATE.test(t) && !t.replace(RV_DATE,"").replace(/[·|｜,，;；:：\s\u3000]/g,"");
}
function rvNormHead(s){
  return String(s||"").trim()
    .replace(/^[一二三四五六七八九十\d]{1,2}[、.．)）]\s*/,"")
    .replace(/^[【\[（(「『《]+/,"").replace(/[】\]）)」』》]+$/,"")
    .replace(/[：:]\s*$/,"").replace(/\s+/g," ").trim().toUpperCase();
}
function rvHead(line){
  const h=rvNormHead(line);
  if(!h||h.length>24||/[。，；;]/.test(h)) return "";
  const m=RV_HEADS.find(x=>x.re.test(h));
  return m?m.key:"";
}
function rvIsBullet(l){ return /^([-•·*]|\d{1,2}[.、)])/.test(l); }
function rvClean(l){ return l.replace(/^[-•·*]\s*/,"").replace(/^\d{1,2}[.、)]\s*/,"").trim(); }
function rvSplitParts(line){
  const tidy=s=>s.replace(/^[·•,，;；\s]+|[·•,，;；\s]+$/g,"").trim();
  let parts=line.split(/[｜|]/).map(tidy).filter(Boolean);
  if(parts.length<2) parts=line.split(/\s{2,}/).map(tidy).filter(Boolean);
  if(parts.length<2&&RV_DATE.test(line)) parts=line.split(/\s+/).map(tidy).filter(Boolean);
  if(parts.length<2&&RV_ROLE.test(line)&&(RV_CO.test(line)||extractSkills(line).length)) parts=line.split(/\s+/).map(tidy).filter(Boolean);
  if(parts.length<2) parts=line.split(/[·•，,]+/).map(tidy).filter(Boolean);
  return parts;
}
function rvMakeExp(line){
  const parts=rvSplitParts(line);
  let period="",role="",company="";
  const rest=[];
  parts.forEach(p=>{
    const m=p.match(RV_DATE);
    if(m&&!period){ period=m[0].replace(/\s+/g,""); return; }
    if(!role&&RV_ROLE.test(p)&&!RV_CO.test(p)&&p.length<=24){ role=p.replace(RV_DATE,"").trim(); return; }
    if(!company&&p.length<=30){ company=p.replace(RV_DATE,"").trim(); return; }
    rest.push(p);
  });
  if(!company) company=line.replace(RV_DATE,"").trim().slice(0,30);
  const bullets=[];
  rest.forEach(t=>t.split(/[；;]/).map(s=>s.trim()).filter(Boolean).forEach(b=>bullets.push(b)));
  return {company,role,period,bullets};
}
function rvIsExpStart(l){
  if(rvIsBullet(l)) return false;
  if(rvEduLike(l)||rvOnlyDate(l)) return false;
  if(RV_DATE.test(l)) return true;
  return l.length<=40&&RV_CO.test(l)&&!/[。；;]$/.test(l);
}
function rvParseExp(seg){
  const list=[]; let cur=null, pending="";
  (seg||[]).forEach(l=>{
    if(rvEduLike(l)) return;
    if(rvOnlyDate(l)){
      const d=(l.match(RV_DATE)||[""])[0].replace(/\s+/g,"");
      if(cur&&!cur.period) cur.period=d; else pending=d;
      return;
    }
    if(rvIsExpStart(l)){
      cur=rvMakeExp(l);
      if(pending&&!cur.period) cur.period=pending;
      pending="";
      list.push(cur); return;
    }
    const txt=rvClean(l); if(!txt) return;
    if(!cur){ cur={company:"",role:"",period:pending||"",bullets:[]}; pending=""; list.push(cur); }
    txt.split(/[；;]/).map(s=>s.trim()).filter(Boolean).forEach(b=>cur.bullets.push(b));
  });
  let out=list.filter(e=>e.company||e.role||e.period);
  if(!out.length&&seg&&seg.length){
    const first=seg.find(l=>!rvIsBullet(l))||seg[0];
    const e=rvMakeExp(first);
    e.bullets=seg.filter(l=>l!==first).map(rvClean).filter(Boolean);
    out.push(e);
  }
  const seen=new Set();
  return out.filter(e=>{ const k=[e.company,e.role,e.period].join("|"); if(seen.has(k)) return false; seen.add(k); return true; });
}
function rvMakePj(line){
  const parts=rvSplitParts(line).map(s=>s.replace(RV_DATE,"").trim()).filter(Boolean);
  const raw=(parts[0]||line).replace(/^(项目名称|项目名|项目)[：:]\s*/,"").trim();
  let role="",stack="";
  const star={s:"",t:"",a:"",r:""};
  const LAB={背景:"s",S:"s",任务:"t",T:"t",行动:"a",A:"a",结果:"r",R:"r"};
  parts.slice(1).forEach(p=>{
    const lm=p.match(/^(背景|任务|行动|结果|S|T|A|R)\s*[：:]\s*(.+)$/i);
    if(lm){ const k=LAB[lm[1].toUpperCase()]||LAB[lm[1]]; if(k) star[k]=lm[2].trim(); return; }
    if(!role&&RV_ROLE.test(p)&&!/[\/]/.test(p)){ role=p; return; }
    if(!stack&&(/^[A-Za-z0-9+#./·\- ]{2,24}$/.test(p)||extractSkills(p).length)){ stack=p; return; }
    if(!role&&p.length<=24) role=p;
  });
  return {name:raw.slice(0,40),role,stack,star,_b:[]};
}
function rvIsPjStart(l){
  if(rvIsBullet(l)) return false;
  if(rvEduLike(l)||rvOnlyDate(l)) return false;
  if(RV_DATE.test(l)) return true;
  if((l.match(/[｜|]/g)||[]).length>=2) return true;
  return l.length<=40&&RV_PJ.test(l)&&!/[。；;]$/.test(l);
}
function rvIsPjLine(l){
  if(rvIsBullet(l)||rvEduLike(l)||rvOnlyDate(l)||rvIsExpStart(l)) return false;
  if((l.match(/[｜|]/g)||[]).length>=2) return true;
  if(/^(项目名称|项目名|项目|课题)[：:]/i.test(l)) return true;
  if(l.length<=40&&RV_PJ.test(l)&&!/[。；;，,]$/.test(l)) return true;
  return l.length<=40&&RV_ROLE.test(l)&&(/[\/]|[A-Za-z]{3,}/.test(l))&&!/[。；;，,]$/.test(l)&&!/^(负责|参与|主要|协助|独立|通过|基于)/.test(l);
}
function rvParsePj(bucket){
  const list=[]; let cur=null;
  const LAB={背景:"s",S:"s",任务:"t",T:"t",行动:"a",A:"a",结果:"r",R:"r"};
  (bucket||[]).forEach(l=>{
    const m=l.match(/^(背景|任务|行动|结果|S|T|A|R)\s*[：:]\s*(.+)$/i);
    if(m&&cur){ const k=LAB[m[1].toUpperCase()]||LAB[m[1]]; if(k){ cur.star[k]=m[2].trim(); return; } }
    if(rvIsPjStart(l)||(!cur&&!rvIsBullet(l)&&l.length<=40)){ cur=rvMakePj(l); list.push(cur); return; }
    if(!cur) return;
    const txt=rvClean(l); if(!txt) return;
    txt.split(/[；;]/).map(s=>s.trim()).filter(Boolean).forEach(b=>cur._b.push(b));
  });
  list.forEach(p=>{
    p.star.s=p.star.s||p._b[0]||"";
    p.star.a=p.star.a||p._b[1]||"";
    p.star.r=p.star.r||p._b[2]||"";
    delete p._b;
  });
  const seen=new Set();
  return list.filter(p=>{ if(!p.name||seen.has(p.name)) return false; seen.add(p.name); return true; });
}
const RV_DATEISH=/^[（(]?(?:19|20)\d{2}(?:[.\-/年]\s*\d{1,2}\s*月?)?[)）]?$|^(?:至今|现在|今)$/;
function rvEduOne(text){
  const raw=String(text||"").replace(/\s+/g," ").trim();
  if(!raw) return "";
  const pm=raw.match(RV_DATE);
  const period=pm?pm[0].replace(/\s+/g,""):"";
  /* 先摘掉时间，避免「至今 广西民族大学」被当成校名、日期被当成专业 */
  const t=raw.replace(new RegExp(RV_DATE.source,"g")," ")
    .replace(/[（(]?(?:19|20)\d{2}(?:[.\-/年]\s*\d{1,2}\s*月?)?[)）]?/g," ")
    .replace(/至今|现在/g," ").replace(/\s+/g," ").trim();
  if(!t) return "";
  const school=(t.match(/([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z ]{1,40}?(?:大学|学院|学校|中学|University|College|Institute|School))/)||[])[1]||"";
  const degree=(t.match(/(博士|硕士|本科|大专|专科|高中|MBA|Bachelor|Master|PhD)/i)||[])[1]||"";
  if(!school&&!degree) return "";
  let major=(t.match(/专业[：:\s]*([^\s·，,；;、]{2,20})/)||[])[1]||"";
  if(!major&&school){
    const chunks=t.split(/[·，,；;|｜\s]+/).filter(Boolean);
    const idx=chunks.findIndex(c=>c.includes(school));
    if(idx>=0){
      for(let i=idx+1;i<chunks.length;i++){
        const c=chunks[i];
        if(c===degree||RV_DATE.test(c)||RV_DATEISH.test(c)||/(大学|学院|学校|中学)/.test(c)) continue;
        if(c.length>=2&&c.length<=20){ major=c; break; }
      }
    }
  }
  if(!major&&school&&t.includes(school)){
    const after=t.slice(t.indexOf(school)+school.length).replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/,"");
    const seg=(after.split(/[·，,；;|｜]|\s{2,}/).map(s=>s.trim()).filter(Boolean)[0]||"")
      .split(/\s+(?=(?:本科|硕士|博士|Bachelor|Master|PhD))/i)[0].trim();
    if(seg.length>=2&&seg.length<=24&&!RV_DATE.test(seg)&&!RV_DATEISH.test(seg)&&!/(本科|硕士|博士|Bachelor|Master|PhD)/i.test(seg)) major=seg;
  }
  return [school,major,degree,period].filter(Boolean).join(" · ");
}
function rvParseEdu(bucket,whole){
  const W=String(whole||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const rows=(bucket||[]).filter(l=>/(大学|学院|学校|中学|University|College|Institute|School)/i.test(l));
  const around=r=>{
    const i=W.indexOf(r); if(i<0) return r;
    const ext=[r];
    [i-1,i+1,i+2].forEach(j=>{
      const t=W[j]||"";
      if(!t||rvHead(t)) return;
      if(rvOnlyDate(t)){ ext.push(t); return; }
      if(t.length<=24&&!/[。；;]$/.test(t)&&!/(主修|课程|GPA|排名|奖学金|竞赛)/.test(t)) ext.push(t);
    });
    return ext.join(" ");
  };
  if(rows.length>1) return rows.map(r=>rvEduOne(around(r))).filter(Boolean).join("；");
  return rvEduOne(rows[0]?around(rows[0]):(bucket||[]).join(" "));
}
/* 荣誉：获奖 / 奖学金 / 证书段落 → 「、」连接的一行 */
function rvParseHonor(bucket){
  const items=[], seen=new Set();
  (bucket||[]).forEach(l=>{
    const t=rvClean(l);
    if(!t) return;
    const parts=t.split(/[、,，;；]|\s{2,}/).map(s=>s.trim().replace(/^[-–—]\s*/,"")).filter(Boolean);
    (parts.length?parts:[t]).forEach(p=>{
      const c=p.replace(/\s+/g," ").trim();
      if(c.length<2||c.length>50||seen.has(c)) return;
      if(/^(荣誉|奖励|证书|获奖情况|获奖经历|荣誉奖项|所获荣誉)$/.test(c)) return;
      seen.add(c); items.push(c);
    });
  });
  return items.slice(0,8).join("\n");
}
function rvClip(s,n){
  const t=String(s||"").replace(/\s+/g," ").trim();
  if(t.length<=n) return t;
  const cut=t.slice(0,n);
  const i=Math.max(cut.lastIndexOf("。"),cut.lastIndexOf("；"),cut.lastIndexOf("."));
  return (i>40?cut.slice(0,i+1):cut).trim();
}
function rvSummaryFallback(pre){
  for(const l of pre||[]){
    const t=l.trim();
    if(t.length<20||t.length>200) continue;
    if(/@|1[3-9]\d{9}|(年龄|性别|民族|政治面貌|求职意向|目标岗位|期望薪资)[：:]/.test(t)) continue;
    if(/^(个人简历|简历|RESUME)$/i.test(t)) continue;
    if(!/(我|本人|擅长|熟悉|精通|经验|负责|具备|专注|致力于)/.test(t)) continue;
    return t;
  }
  return "";
}
const RV_SOFT=new Set(["沟通表达","英语","证书"]);
function autoSplitResume(raw){
  const text=String(raw||"").replace(/\r/g,"");
  const lines=text.split("\n").map(s=>s.trim()).filter(Boolean);
  const out={summary:"",skills:[],experience:[],projects:[],education:"",honor:""};
  const B={info:[],summary:[],skills:[],experience:[],projects:[],education:[],honors:[]};
  const pre=[];
  let cur="";
  lines.forEach(l=>{
    /* 先看「标题：内容」同行写法，否则「核心技能：Python、SQL」会被当成纯标题丢掉内容 */
    const im=l.match(/^([^：:]{2,20})[：:]\s*(\S.*)$/);
    if(im){
      const k2=rvHead(im[1]);
      if(k2){ cur=k2; B[k2].push(im[2]); return; }
    }
    const k=rvHead(l);
    if(k){ cur=k; return; }
    if(rvEduLike(l)&&cur!=="education"&&cur!=="projects"&&cur!=="summary"&&cur!=="skills"&&cur!=="info"&&cur!=="honors"){ B.education.push(l); return; }
    if(cur) B[cur].push(l); else pre.push(l);
  });
  if(B.skills.length){
    const seen=new Set();
    B.skills.forEach(l=>{
      const clean=rvClean(l);
      let parts=clean.split(/[、,，;；|｜·]+/).map(s=>s.trim()).filter(Boolean);
      if(parts.length<2) parts=clean.split(/\s{2,}/).map(s=>s.trim()).filter(Boolean);
      parts.forEach(p=>{
        const c=canonSkill(p.replace(/^(熟练(使用|掌握)?|精通|掌握|了解|熟悉)\s*/,"").trim());
        if(c&&c.length<=20&&!seen.has(c)){ seen.add(c); out.skills.push(c); }
      });
    });
    out.skills=out.skills.slice(0,20);
  }
  if(!out.skills.length){
    const src=[].concat(B.experience||[],B.projects||[],B.summary||[]).join(" ");
    out.skills=extractSkills(src).filter(s=>!RV_SOFT.has(s)).slice(0,10);
  }
  if(!out.skills.length) out.skills=extractSkills(text).filter(s=>!RV_SOFT.has(s)).slice(0,8);
  out.summary=B.summary.length?rvClip(B.summary.join(" "),260):"";
  if(!out.summary) out.summary=rvSummaryFallback(pre);
  out.experience=rvParseExp(B.experience);
  if(!out.experience.length&&!B.projects.length&&!B.education.length&&!B.skills.length&&!B.honors.length){
    const starts=[];
    lines.forEach((l,i)=>{ if(rvIsExpStart(l)&&starts.length<3) starts.push(i); });
    if(starts.length){
      const seg=[];
      starts.forEach(idx=>{
        let end=lines.length, from=idx;
        if(idx>0&&rvOnlyDate(lines[idx-1])) from=idx-1;
        for(let k=idx+1;k<lines.length;k++){ if(starts.includes(k)||rvHead(lines[k])||rvIsPjLine(lines[k])||rvEduLike(lines[k])){ end=k; break; } }
        seg.push(...lines.slice(from,end));
      });
      out.experience=rvParseExp(seg);
    }
  }
  out.projects=rvParsePj(B.projects);
  if(!out.projects.length&&!B.experience.length&&!B.education.length&&!B.skills.length&&!B.summary.length&&!B.honors.length){
    const idxs=[];
    lines.forEach((l,i)=>{ if(rvIsPjLine(l)&&idxs.length<5) idxs.push(i); });
    if(idxs.length){
      const seg=[];
      idxs.forEach((idx,j)=>{
        let end=j+1<idxs.length?idxs[j+1]:lines.length;
        for(let k=idx+1;k<end;k++){ if(rvHead(lines[k])||rvEduLike(lines[k])){ end=k; break; } }
        seg.push(...lines.slice(idx,end));
      });
      out.projects=rvParsePj(seg);
    }
  }
  /* 技能栏缺失时，用项目技术栈里的英文技术名词兜底（STM32 / FreeRTOS / React …） */
  if(!out.skills.length){
    const stack=(out.projects||[]).map(p=>(p.stack||"")+" "+(p.name||"")).join(" ");
    const seen=new Set();
    stack.split(/[\/·,，、;；|\s]+/).map(s=>s.trim())
      .filter(s=>/^[A-Za-z][A-Za-z0-9+#.]{1,19}$/.test(s)&&!/^(19|20)\d{2}$/.test(s))
      .forEach(s=>{ if(!seen.has(s)){ seen.add(s); out.skills.push(s); } });
    out.skills=out.skills.slice(0,10);
  }
  out.education=rvParseEdu(B.education,text);
  out.honor=rvParseHonor(B.honors);
  return out;
}
/* --- 识别结果回填：只填空栏，不覆盖用户已填内容 --- */
function guessYears(text){
  const src=String(text||"");
  const m=src.match(/(?<!\d)(\d{1,2})\s*年(?:以上|及以上|\+)?[^\n。；，]{0,8}?经验/);
  if(m) return Math.min(40,+m[1]);
  const seg=(src.split(/(?:工作经历|工作经验|职业经历)/)[1]||"")
    .split(/(?:项目经历|项目经验|教育经历|教育背景|专业技能|核心技能|自我评价|技能特长)/)[0];
  const ys=[...seg.matchAll(/(?:19|20)\d{2}/g)].map(x=>+x[0]).filter(y=>y>1980&&y<=new Date().getFullYear()+1);
  if(ys.length>=2){ const span=Math.max(...ys)-Math.min(...ys); if(span>0&&span<=40) return span; }
  return 0;
}
function guessName(text){
  const roleRe=/(经理|工程师|分析师|设计师|运营|销售|专员|主管|总监|助理|实习|顾问|架构师|开发|产品|简历|求职)/;
  const lines=String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,5);
  for(const raw of lines){
    const l=raw.replace(/\s*(个人)?简历\s*$/,"").replace(/^(姓名|Name)[：:\s]*/i,"").trim();
    if(!l||roleRe.test(l)||/[：:|｜@\d]/.test(l)) continue;
    if(/^[\u4e00-\u9fa5]{2,4}$/.test(l)) return l;
    if(/^[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){1,2}$/.test(l)) return l;
  }
  return "";
}
const AI_RESUME_SYS = "你是简历信息抽取器。只输出 JSON 对象，不要解释、不要 Markdown 代码块。";
function aiResumePrompt(raw){
  return `任务：从下面的简历原文中抽取「工作经历」「项目经历」，并写一段「个人简介」，用于填简历表单。
输出 JSON，结构固定：
{"summary":"个人简介",
 "experience":[{"company":"公司名","role":"职位","period":"起止时间","bullets":["一句话成果"]}],
 "projects":[{"name":"项目名","role":"角色","stack":"技术栈","background":"背景","action":"行动","result":"结果"}]}
规则：
1. 只使用原文中明确出现的事实，禁止编造公司、项目、时间、数字、学历；原文没写的字段留空字符串。
2. 原文没有工作经历就返回 "experience":[]；没有项目经历就返回 "projects":[]。
3. period 用原文的时间写法（如 2020.03-2023.05），不要换算。
4. bullets 每条是一句可验证的事实，保留原文数字与专有名词，最多 4 条；不要把教育、课程、获奖写进工作经历。
5. 项目按「背景 / 行动 / 结果」拆分时分别放进 background / action / result；没有对应内容就留空，不要补。
6. 每段经历、每个项目都必须是原文里独立的一条，不要把多条合并成一条。
7. summary 为 80–140 字的中文个人简介：先写身份与年限，再写 2–3 项最相关的能力或成果，最后写求职方向；只用原文事实，不新增任何数字、公司、奖项，不堆砌形容词，不用「本人」以外的人称；原文信息不足就写到有的部分为止，不要编。

简历原文：
"""${String(raw||"").slice(0,6000)}"""`;
}
function aiNormSummary(s){
  const t=String(s||"").replace(/^["“「']|["”」']$/g,"").replace(/\s+/g," ").trim();
  if(t.length<15||/[\r\n]/.test(String(s||""))) return "";
  return t.slice(0,220);
}
function aiNormExperience(list){
  const arr=Array.isArray(list)?list:[];
  return arr.slice(0,5).map(e=>{
    const o=e&&typeof e==="object"?e:{};
    const bullets=(Array.isArray(o.bullets)?o.bullets:[o.bullets]).map(b=>String(b||"").trim()).filter(Boolean).slice(0,4);
    return {company:String(o.company||"").trim().slice(0,40),role:String(o.role||"").trim().slice(0,30),
      period:String(o.period||"").trim().replace(/\s+/g,"").slice(0,30),bullets};
  }).filter(e=>e.company||e.role||e.bullets.length);
}
function aiNormProjects(list){
  const arr=Array.isArray(list)?list:[];
  return arr.slice(0,6).map(e=>{
    const o=e&&typeof e==="object"?e:{};
    return {name:String(o.name||"").trim().slice(0,40),role:String(o.role||"").trim().slice(0,30),
      stack:String(o.stack||o.tech||"").trim().slice(0,40),
      star:{s:String(o.background||o.s||"").trim().slice(0,120),
            a:String(o.action||o.a||"").trim().slice(0,160),
            r:String(o.result||o.r||"").trim().slice(0,120)}};
  }).filter(p=>p.name||p.star.s||p.star.a||p.star.r);
}
async function aiResumeBlocks(raw){
  const txt=await aiChat([{role:"system",content:AI_RESUME_SYS},{role:"user",content:aiResumePrompt(raw)}],{json:true});
  const j=parseJSON(txt);
  if(!j||typeof j!=="object") return null;
  return {summary:aiNormSummary(j.summary),experience:aiNormExperience(j.experience),projects:aiNormProjects(j.projects)};
}
function flashFilled(hits, ov){
  if(!hits.length) return;
  hits.forEach(el=>{ el.classList.remove("auto-filled"); void el.offsetWidth; el.classList.add("auto-filled"); });
  const m=ov.querySelector(".modal"); if(m) m.scrollTo({top:0,behavior:"smooth"});
  setTimeout(()=>hits.forEach(el=>el.classList.remove("auto-filled")),1600);
}
async function autofillResume(text, ov){
  const box=sel=>ov.querySelector(sel);
  const blank=sel=>{ const el=box(sel); return el && !String(el.value||"").trim(); };
  const hits=[], missing=[];
  const setV=(sel,v)=>{ if(v && blank(sel)){ box(sel).value=v; hits.push(box(sel)); return true; } return false; };
  const fill=(sel,name,v)=>{ if(v && setV(sel,v)) return; if(!v && blank(sel)) missing.push(name); };
  const email=(text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)||[""])[0];
  const phone=(text.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/)||[""])[0];
  const city=(text.match(/(北京|上海|广州|深圳|杭州|成都|南京|武汉|西安|苏州|天津|重庆|长沙|厦门|合肥|郑州|青岛|大连|宁波|无锡|福州|济南|东莞|佛山)/)||[""])[0];
  fill("#rf-contact","联系方式",[phone,email,city].filter(Boolean).join(" · "));
  fill("#rf-name","姓名",guessName(text));
  const target=((text.match(/(?:求职意向|目标岗位|应聘职位|意向岗位|求职岗位|期望职位)[：:\s]+([^\n]{2,20})/)||[])[1]||"").trim();
  fill("#rf-target","目标岗位",target);
  const y=guessYears(text);
  fill("#rf-years","工作年限",y?String(y):"");
  const out=autoSplitResume(text);
  let expList=out.experience, projList=out.projects, aiSummary="", aiNote="", aiError="";
  const status=ov.querySelector("#rf-fill-status");
  if(aiReady() && (blank("#rf-summary")||blank("#rf-exp")||blank("#rf-proj"))){
    if(status) status.textContent="AI 正在识别个人简介、工作经历与项目经历…";
    try{
      const ai=await aiResumeBlocks(text);
      if(ai){
        if(ai.experience.length) expList=ai.experience;
        if(ai.projects.length) projList=ai.projects;
        if(ai.summary) aiSummary=ai.summary;
        const parts=[];
        if(aiSummary) parts.push("个人简介");
        if(ai.experience.length) parts.push(`工作经历 ${ai.experience.length} 段`);
        if(ai.projects.length) parts.push(`项目 ${ai.projects.length} 个`);
        aiNote=parts.length?`AI 已补：${parts.join(" / ")}`:"";
      }
    }catch(e){ aiError=e.message||"AI 调用失败"; }
    if(status) status.textContent="";
  }
  let summary=out.summary;
  if(!summary){
    const seg=[];
    if(target) seg.push(target);
    if(y) seg.push(`${y} 年经验`);
    if(out.skills.length) seg.push(`核心技能：${out.skills.slice(0,3).join("、")}`);
    summary=seg.length>=2?seg.join(" · "):"";
  }
  if(aiSummary) summary=aiSummary;
  fill("#rf-summary","个人简介",summary);
  fill("#rf-skills","核心技能",out.skills.join("、"));
  fill("#rf-exp","工作经历",expList.length?serExperiences(expList):"");
  fill("#rf-proj","项目经历",projList.length?serProjects(projList):"");
  fill("#rf-edu","教育经历",out.education);
  fill("#rf-honor","荣誉",out.honor);
  flashFilled(hits, ov);
  return {n:hits.length, missing, aiNote, aiError};
}
/* --- 岗位信息抽取：从 JD 首行同时拆出岗位名称、地点、薪资 --- */
function pickSalary(text){
  const t=String(text||"");
  const m=t.match(/\d{1,3}(?:\.\d+)?\s*[kK千万]?\s*[-–—~至]\s*\d{1,3}(?:\.\d+)?\s*[kK千万]\s*(?:元)?(?:\s*\/\s*(?:月|年|天))?(?:\s*[·x×]\s*\d{1,2}\s*薪)?/) ||
          t.match(/\d{4,5}\s*[-–—~至]\s*\d{4,5}\s*元?\s*\/\s*(?:月|年)/);
  return m ? m[0].replace(/\s+/g,"") : "";
}
function guessCity(text){
  return (String(text||"").match(/(北京|上海|广州|深圳|杭州|成都|南京|武汉|西安|苏州|天津|重庆|长沙|厦门|合肥|郑州|青岛|大连|宁波|无锡|福州|济南|东莞|佛山)/)||[""])[0];
}
function autofillJob(text, ov){
  const box=sel=>ov.querySelector(sel);
  const blank=sel=>box(sel) && !box(sel).value.trim();
  const hits=[];
  const setV=(sel,v)=>{ if(v && blank(sel)){ box(sel).value=v; hits.push(box(sel)); } };
  const src=String(text||"");
  const first=(src.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)[0]||"");
  const sal=pickSalary(first)||pickSalary(src);
  const city=guessCity(first)||guessCity(src);
  const loc=((src.match(/(?:工作地点|办公地点|上班地点|地点)[：:]\s*([^\n]{2,30})/)||[])[1]||city||"").trim();
  let title=first;
  if(sal) title=title.split(sal).join(" ");
  if(loc) title=title.split(loc).join(" ");
  if(city) title=title.split(city).join(" ");
  title=title.replace(/\s*[·|｜]\s*(岗位描述|职位描述|招聘|JD|岗位职责).*$/i,"")
    .replace(/[（(]\s*[)）]/g,"")
    .replace(/[·|｜、,，;；:：\s\u3000]+/g," ").trim();
  const okTitle=(title.length>=2 && title.length<=24 && !/[。！？；，,]/.test(title) && !/(岗位职责|任职要求|公司介绍|职位描述)/.test(title)) ? title : "";
  setV("#jf-title",okTitle);
  const company=(src.match(/(?:公司|企业)(?:名称)?[：:]\s*([^\n]{2,30})/)||[])[1];
  setV("#jf-company",company?company.trim():"");
  setV("#jf-loc",loc);
  setV("#jf-salary",sal);
  const channel=(src.match(/(?:投递渠道|渠道)[：:]\s*([^\n]{2,20})/)||[])[1] ||
    (src.match(/(BOSS直聘|BOSS|拉勾|猎聘|智联招聘|前程无忧|内推|官网投递)/)||[])[1];
  setV("#jf-channel",channel?channel.trim():"");
  const parsed=parseJD(src);
  const autoSet=(sel,v)=>{
    if(!v) return;
    const el=box(sel); if(!el) return;
    if(el.value.trim() && el.dataset.auto!==el.value) return;   // 用户手改过就保留
    if(el.value===v) return;
    el.value=v; el.dataset.auto=v; hits.push(el);
  };
  autoSet("#jf-duty", parsed.duties.join("\n"));
  autoSet("#jf-must", parsed.must.join("\n"));
  flashFilled(hits, ov);
  return {n:hits.length, detected:[okTitle,company,loc,sal,channel,parsed.duties.length,parsed.must.length].filter(Boolean).length};
}
function openResumeDetail(id){
  const r=getResume(id); if(!r) return;
  const ov=openModal(`<h3>${esc(r.name)}${r.parentId?' <span class="badge demo">定制版</span>':""}</h3>
    <div class="sub">${esc(r.target||"未填目标岗位")} · ${resYears(r)} 年经验 · ${esc(r.contact||"未填联系方式")}</div>
    <div class="pane mt12"><h4>${icon("user",14)} 个人简介</h4><div style="font-size:13px;line-height:1.7">${esc(r.summary||"—")}</div></div>
    <div class="field"><label>核心技能</label><div class="chips">${(r.skills||[]).map(s=>`<span class="chip">${esc(s)}</span>`).join("")||'<span class="tiny">—</span>'}</div></div>
    <div class="field"><label>工作经历</label>${(r.experience||[]).map(e=>`<div class="pane" style="margin-bottom:9px">
      <h4>${esc(e.company)} · ${esc(e.role)} <span class="tiny" style="font-weight:500">${esc(e.period)}</span></h4>
      ${(e.bullets||[]).map(b=>`<div style="font-size:12.5px;line-height:1.7;padding-left:10px;border-left:2px solid var(--border);margin-top:5px">${esc(b)}</div>`).join("")}</div>`).join("")||'<div class="tiny">—</div>'}
    <div class="field"><label>项目经历</label>${(r.projects||[]).map(p=>`<div class="pane" style="margin-bottom:9px">
      <h4>${esc(p.name)} · ${esc(p.role)}</h4><div class="tiny">${esc(p.stack)}</div>
      ${["s","a","r"].map(k=>p.star?.[k]?`<div style="font-size:12.5px;line-height:1.7;margin-top:5px"><b>${k==="s"?"背景":k==="a"?"行动":"结果"}：</b>${esc(p.star[k])}</div>`:"").join("")}</div>`).join("")||'<div class="tiny">—</div>'}
    <div class="field"><label>教育经历</label><div style="font-size:13px">${esc(r.education||"—")}</div></div>
    <div class="field"><label>荣誉</label><div style="font-size:13px;white-space:pre-line">${esc(r.honor||"—")}</div></div>
    <div class="modal-actions"><button class="link-danger" id="rd-del">删除</button><div class="spacer"></div>
      <button class="btn ghost" id="rd-copy">${icon("copy",14)} 复制全文</button>
      <button class="btn line" id="rd-print" title="在浏览器打印对话框里选「另存为 PDF」">${icon("download",14)} 打印 / 导出 PDF</button>
      <button class="btn line" id="rd-set">设为当前简历</button>
      <button class="btn" id="rd-edit">编辑</button></div>`, true);
  ov.querySelector("#rd-edit").onclick=()=>{ ov.remove(); openResumeForm(r); };
  ov.querySelector("#rd-set").onclick=()=>{ data.activeResumeId=r.id; store.save(); ov.remove(); toast("已设为当前简历"); render(); };
  ov.querySelector("#rd-copy").onclick=()=>copyText(resumeBody(r));
  ov.querySelector("#rd-print").onclick=()=>printResume(r);
  ov.querySelector("#rd-del").onclick=()=>{
    const rec=trashDelete("resumes", r.id, ()=>{
      if(data.activeResumeId===r.id) data.activeResumeId=(data.resumes[0]||{}).id||null;
    });
    if(!rec) return;
    ov.remove(); render();
    undoToast(rec, r.name||"未命名简历");
  };
}
/* 只读「简历阅览」：按简历版式展示，只留复制与关闭，不做增删改 */
function openResumePreview(r){
  if(!r) return;
  const sec=(t,body)=>body?`<div class="rp-sec"><h6>${t}</h6>${body}</div>`:"";
  const exp=(r.experience||[]).map(e=>`<div class="rp-item">
    <div class="rp-t">${esc(e.company)} · ${esc(e.role)}<small>${esc(e.period||"")}</small></div>
    ${(e.bullets||[]).map(b=>`<div class="rp-d">${esc(b)}</div>`).join("")}</div>`).join("");
  const pj=(r.projects||[]).map(p=>`<div class="rp-item">
    <div class="rp-t">${esc(p.name)}${p.role?` · ${esc(p.role)}`:""}</div>
    ${p.stack?`<div class="rp-s">${esc(p.stack)}</div>`:""}
    ${["s","a","r"].map(k=>p.star&&p.star[k]?`<div class="rp-d"><b>${k==="s"?"背景":k==="a"?"行动":"结果"}：</b>${esc(p.star[k])}</div>`:"").join("")}</div>`).join("");
  const empty=!r.summary&&!(r.skills||[]).length&&!exp&&!pj&&!r.education&&!r.honor;
  const ov=openModal(`<div class="rp-doc">
    <div class="rp-head"><div class="grow" style="min-width:0">
      <div class="rp-name">${esc(r.name||"未命名简历")}${r.parentId?'<span class="badge demo">定制版</span>':""}</div>
      <div class="rp-meta">${esc(r.target||"未填目标岗位")} · ${resYears(r)} 年经验${r.contact?" · "+esc(r.contact):""}</div>
    </div></div>
    ${sec("个人简介", r.summary?`<p>${esc(r.summary)}</p>`:"")}
    ${sec("核心技能", (r.skills||[]).length?`<div class="chips">${r.skills.map(s=>`<span class="chip nice">${esc(s)}</span>`).join("")}</div>`:"")}
    ${sec("工作经历", exp)}
    ${sec("项目经历", pj)}
    ${sec("教育经历", r.education?`<p>${esc(r.education)}</p>`:"")}
    ${sec("荣誉", r.honor?`<div style="font-size:13px;line-height:1.75;white-space:pre-line">${esc(r.honor)}</div>`:"")}
    ${empty?'<div class="tiny" style="margin-top:14px">这份简历还没有可展示的内容，先去「简历库」补充。</div>':""}
  </div>
  <div class="modal-actions"><div class="spacer"></div>
    <button class="btn ghost" id="rp-copy">${icon("copy",14)} 复制全文</button>
    <button class="btn line" id="rp-print" title="在浏览器打印对话框里选「另存为 PDF」">${icon("download",14)} 打印 / 导出 PDF</button>
    <button class="btn" id="rp-close">关闭</button></div>`, true);
  ov.querySelector("#rp-copy").onclick=()=>copyText(resumeBody(r));
  ov.querySelector("#rp-print").onclick=()=>printResume(r);
  ov.querySelector("#rp-close").onclick=()=>ov.remove();
}
/* --- 打印 / 导出 PDF：A4 版式，交给浏览器打印对话框「另存为 PDF」 --- */
function resumeSheetHTML(r){
  const sec=(t,body)=>body?`<div class="rp-sec"><h6>${t}</h6>${body}</div>`:"";
  const exp=(r.experience||[]).map(e=>`<div class="rp-item">
    <div class="rp-t">${esc(e.company)} · ${esc(e.role)}${e.period?`<small>${esc(e.period)}</small>`:""}</div>
    ${(e.bullets||[]).map(b=>`<div class="rp-d">${esc(b)}</div>`).join("")}</div>`).join("");
  const pj=(r.projects||[]).map(p=>`<div class="rp-item">
    <div class="rp-t">${esc(p.name)}${p.role?` · ${esc(p.role)}`:""}</div>
    ${p.stack?`<div class="rp-s">${esc(p.stack)}</div>`:""}
    ${["s","a","r"].map(k=>p.star&&p.star[k]?`<div class="rp-d"><b>${k==="s"?"背景":k==="a"?"行动":"结果"}：</b>${esc(p.star[k])}</div>`:"").join("")}</div>`).join("");
  const meta=[r.target||"未填目标岗位", `${resYears(r)} 年经验`, r.contact||""].filter(Boolean).join(" · ");
  return `<div class="rp-doc">
    <div class="rp-head"><div class="grow" style="min-width:0">
      <div class="rp-name">${esc(r.name||"未命名简历")}</div>
      <div class="rp-meta">${esc(meta)}</div>
    </div></div>
    ${sec("个人简介", r.summary?`<p>${esc(r.summary)}</p>`:"")}
    ${sec("核心技能", (r.skills||[]).length?`<div class="chips">${r.skills.map(s=>`<span class="chip nice">${esc(s)}</span>`).join("")}</div>`:"")}
    ${sec("工作经历", exp)}
    ${sec("项目经历", pj)}
    ${sec("教育经历", r.education?`<p>${esc(r.education)}</p>`:"")}
    ${sec("荣誉", r.honor?`<div class="rp-d" style="border-left:none;padding-left:0;white-space:pre-line">${esc(r.honor)}</div>`:"")}
  </div>`;
}
function printResume(r){
  if(!r) return;
  const old=document.getElementById("print-root"); if(old) old.remove();
  const root=document.createElement("div");
  root.id="print-root";
  root.innerHTML=resumeSheetHTML(r);
  document.body.appendChild(root);
  document.body.classList.add("printing");
  let cleaned=false;
  const done=()=>{
    if(cleaned) return; cleaned=true;
    document.body.classList.remove("printing");
    const n=document.getElementById("print-root"); if(n) n.remove();
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  /* 等一帧让样式生效再唤起打印，避免打出空白页 */
  setTimeout(()=>{
    try{ window.print(); }
    catch(e){ done(); toast("当前环境不支持打印，可以先用「复制全文」粘到文档里"); return; }
    setTimeout(done, 500);
  }, 80);
}
function copyText(t){
  const done=()=>toast("已复制到剪贴板");
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(done).catch(()=>fallbackCopy(t,done));
  } else fallbackCopy(t,done);
}
function fallbackCopy(t,done){
  let ok=false;
  const ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ ok=document.execCommand("copy"); }catch(e){ ok=false; }
  ta.remove();
  if(ok) done(); else toast("复制失败，请手动选中文本后按 Ctrl+C");
}
