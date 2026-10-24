/* ============================================================
   JOBSEARCH · 匹配分析
   ============================================================ */
let accSet=new Set(), accKey="";
function mbar(label, ratio, note){
  const v=Math.round(clamp(ratio,0,1)*100);
  const col=v>=75?"var(--success)":v>=50?"var(--warning)":"var(--danger)";
  return `<div class="mbar"><div class="mt"><span>${label} <span class="tiny">${esc(note||"")}</span></span><b>${v}%</b></div>
    <div class="track"><i style="width:${v}%;background:${col}"></i></div></div>`;
}
function renderMatch(){
  const jobs=data.jobs||[], resList=data.resumes||[];
  if(!jobs.length||!resList.length){
    $("#screen").innerHTML=headHTML("匹配分析","先有岗位和简历，才能算匹配")
      + emptyState("target","还缺分析对象","至少录入一个岗位和一份简历，匹配诊断才有意义。","去岗位库","go-jobs");
    $("#screen").querySelectorAll("[data-act='go-jobs']").forEach(el=>el.onclick=()=>go("jobs"));
    return;
  }
  const job=activeJob(), res=activeResume();
  const key=job.id+"|"+res.id;
  if(key!==accKey){ accKey=key; accSet.clear(); }
  const m=runMatch(job.id,res.id);
  const sugs=buildSuggestions(m,job,res);
  data.match=m; store.save();
  const quant=allBullets(res).filter(b=>/\d/.test(b)).length;

  $("#screen").innerHTML = headHTML("匹配分析","用岗位的硬性要求逐条对照简历，找出真实缺口")
    + `<div class="panel-lg">
        <div class="flex wrap" style="gap:12px">
          <div class="field" style="margin:0"><label>目标岗位</label>
            <select class="selbox" id="m-job">${jobs.map(j=>`<option value="${j.id}" ${j.id===job.id?"selected":""}>${esc(j.company)} · ${esc(j.title)}</option>`).join("")}</select></div>
          <div class="field" style="margin:0"><label>分析简历</label>
            <select class="selbox" id="m-res">${resList.map(r=>`<option value="${r.id}" ${r.id===res.id?"selected":""}>${esc(r.name)}${r.parentId?"（定制）":""}</option>`).join("")}</select></div>
          <div style="flex:1"></div>
          <button class="btn sm" id="m-rerun">${icon("activity",14)} 重新诊断</button>
          <button class="btn line sm" id="m-ai-top">${icon("spark",14)} 提示词工坊</button>
        </div>
        <div class="alert info mt12">${icon("alert",14)} <b>分数怎么来的：</b>技能覆盖 ×70 + 经验年限 ×15 + 量化密度 ×15；有硬性要求完全没覆盖时，总分直接封顶 59。</div>
      </div>

      <div class="panel-lg mt18">
        <div class="score-hero">
          ${scoreRing(m.score)}
          <div class="mbars">
            ${mbar("技能与要求覆盖",m.coverage,"权重 70")}
            ${mbar("经验年限",m.expScore,`你 ${m.yOwn} 年 / 岗位要求 ${m.yReq||"未写"} 年`)}
            ${mbar("量化成果密度",m.quantScore,`${quant} 条带数字`)}
          </div>
          <div class="mverdict">
            <div class="badge ${m.score>=75?'ok':m.score>=60?'warn':'danger'}">${m.score>=75?"匹配度较高":m.score>=60?"可以投，但要补强":"先别投，缺口太硬"}</div>
            <div class="lead mt8">${esc(matchVerdict(m,job,res))}</div>
            <div class="tiny mt8">岗位硬性要求 ${(m.parsed.must||[]).length} 条 · 未覆盖 ${m.missing.length} 条</div>
          </div>
        </div>
      </div>

      <div class="split mt18">
        <div class="panel-lg">
          <h3>${icon("list",16)} 要求逐条对照</h3>
          <div class="ph-sub">命中判断基于技能词 + 语义片段，不只看关键词堆砌</div>
          <div class="scroll" style="max-height:440px">
            ${m.rows.map(it=>{
              const ok=it.hit>=0.5;
              return `<div class="cov-row">
                <span class="dot-pass" style="background:${ok?'var(--success)':'var(--danger)'}"></span>
                <div class="cv">${esc(it.text)}<div class="tiny">${it.kind==="must"?"硬性要求":"加分项"}${it.skills.length?" · "+it.skills.join("/"):""}</div></div>
                <span class="badge ${ok?'ok':'danger'}">${ok?"已覆盖":"缺失"}</span></div>`;
            }).join("")||'<div class="tiny">没有解析到要求，检查一下 JD 分段。</div>'}
          </div>
        </div>
        <div class="panel-lg">
          <h3>${icon("check",16)} ATS 体检</h3>
          <div class="ph-sub">机器筛简历时最容易踩的六个坑</div>
          <div class="scroll" style="max-height:440px">
            ${m.ats.map(a=>`<div class="cov-row">
              <span class="dot-pass" style="background:${a.pass?'var(--success)':'var(--warning)'}"></span>
              <div class="cv"><b>${esc(a.name)}</b> <span class="badge ${a.pass?'ok':'warn'}">${esc(a.value)}</span>
                <div class="tiny">${esc(a.advice)}</div></div></div>`).join("")}
          </div>
        </div>
      </div>

      <div class="panel-lg mt18">
        <div class="flex" style="justify-content:space-between;align-items:flex-start">
          <div><h3>${icon("spark",16)} 改写建议 <span class="badge">${sugs.length} 条</span></h3>
            <div class="ph-sub">只重组你已有的事实；需要补证据的会明确标出，不会编造数字</div></div>
          <button class="btn line sm" id="m-accept-safe">${icon("check",14)} 一键采纳低风险项</button>
        </div>
        <div>${sugs.map(s=>`<div class="diff-row">
          <div class="diff-meta"><b>${esc(s.label)}</b>
            ${s.needsEvidence?'<span class="badge warn">需补证据</span>':'<span class="badge ok">可直接用</span>'}
            <span class="tiny">${esc(s.reason)}</span></div>
          <div class="diff-cell"><div class="tiny">改前</div>${esc(s.before)}</div>
          <div class="diff-cell after"><div class="tiny">改后</div>${esc(s.after)}</div>
          <div class="diff-meta">
            <label class="flex" style="gap:6px;cursor:pointer;font-size:12px"><input type="checkbox" class="js-acc" data-id="${s.id}" ${accSet.has(s.id)?"checked":""}/> 采纳这条</label>
            <div class="diff-actions"><button class="btn ghost sm js-copy-sug" data-id="${s.id}">复制改后文案</button></div>
          </div></div>`).join("")}</div>
        <div class="flex mt12">
          <button class="btn line" id="m-apply">${icon("file",15)} 按勾选生成定制版</button>
          <button class="btn line" id="m-ai">${icon("spark",15)} 逐条改写 · 提示词工坊</button>
          <span class="tiny">已勾选 <b id="acc-count">${accSet.size}</b> 条</span>
        </div>
      </div>
      ${customHistoryHTML(job.id)}
      <div class="panel-lg mt18">
        <h3>${icon("spark",16)} 一键改写</h3>
        <div class="ph-sub">按当前岗位把整份简历整体调一遍：定位句、技能顺序与项目排序${aiReady()?"，并由 AI 改写经历句":""}一起调整，生成一份定制版副本，原简历始终保留。</div>
        <div class="flex mt12" style="align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn" id="m-rewrite">${icon("spark",15)} 一键改写简历</button>
          <button class="btn line" id="m-view">${icon("file",15)} 简历阅览</button>
          <span class="tiny">不会写入简历里没有证据的内容，岗位缺口只提示、不代写。</span>
        </div>
      </div>`;
  wireMatch(m,sugs,job,res);
}
function matchVerdict(m,job,res){
  if(m.hardMiss) return `有 ${m.hardMiss} 项硬性条件没有证据，HR 初筛大概率直接过滤。先决定是补经历、换岗位，还是用相邻经验去解释。`;
  if(m.score>=85) return "关键词和成果都比较扎实，直接投；面试重点准备项目深挖。";
  if(m.score>=75) return "已经过初筛线，投之前把缺口技能补一句证据，再练两轮面试。";
  if(m.score>=60) return "能过一部分初筛，但优势不明显。建议先改写最近一段经历，把岗位关键词前置。";
  return "匹配度偏低，不建议直接投这家。先看是方向不匹配，还是简历没写出已有能力。";
}
function customHistoryHTML(jobId){
  const list=(data.resumes||[]).filter(r=>r.parentId);
  if(!list.length) return "";
  return `<div class="panel-lg mt18"><h3>${icon("file",16)} 定制版简历</h3>
    <div class="ph-sub">这些版本是从主简历复制后改写的，可随时切回来对比</div>
    ${list.map(r=>`<div class="cov-row"><span class="dot-pass" style="background:var(--accent)"></span>
      <div class="cv"><b>${esc(r.name)}</b><div class="tiny">目标 ${esc(r.target||"—")} · ${resYears(r)} 年</div></div>
      <button class="btn ghost sm js-use-res" data-id="${r.id}">用这份分析</button></div>`).join("")}</div>`;
}
function wireMatch(m,sugs,job,res){
  const jsel=$("#m-job"), rsel=$("#m-res");
  if(jsel) jsel.onchange=()=>{ data.activeJobId=jsel.value; store.save(); render(); };
  if(rsel) rsel.onchange=()=>{ data.activeResumeId=rsel.value; store.save(); render(); };
  const rr=$("#m-rerun"); if(rr) rr.onclick=()=>{ toast("已重新诊断"); render(); };
  const atop=$("#m-ai-top"), ai=$("#m-ai");
  if(atop) atop.onclick=()=>openPromptStudio("match_explain");
  if(ai) ai.onclick=()=>openPromptStudio("rewrite_bullets");
  $("#screen").querySelectorAll(".js-acc").forEach(cb=>cb.onchange=()=>{
    cb.checked? accSet.add(cb.dataset.id) : accSet.delete(cb.dataset.id);
    const c=$("#acc-count"); if(c) c.textContent=accSet.size;
  });
  $("#screen").querySelectorAll(".js-copy-sug").forEach(b=>b.onclick=()=>{
    const s=sugs.find(x=>x.id===b.dataset.id); if(s) copyText(s.after);
  });
  const safe=$("#m-accept-safe"); if(safe) safe.onclick=()=>{
    sugs.forEach(s=>{ if(!s.needsEvidence) accSet.add(s.id); });
    toast(`已勾选 ${accSet.size} 条低风险建议`); render();
  };
  const ap=$("#m-apply"); if(ap) ap.onclick=()=>{
    const list=sugs.map(s=>({...s, accepted:accSet.has(s.id)}));
    const next=applySuggestions(list);
    if(next){ accSet.clear(); toast("已生成定制版并设为当前简历"); render(); }
  };
  const rw=$("#m-rewrite"); if(rw) rw.onclick=async()=>{
    const old=rw.innerHTML;
    rw.disabled=true; rw.textContent=aiReady()?"一键改写中（含 AI）…":"一键改写中…";
    try{
      const next=await runOneClickRewrite(m,job,res);
      toast(next?"已生成定制版并设为当前简历":"这份简历已经贴合该岗位，没有可改写的地方");
    }catch(e){
      toast("改写失败："+((e&&e.message)||e));
    }finally{
      rw.disabled=false; rw.innerHTML=old;
    }
  };
  const vw=$("#m-view"); if(vw) vw.onclick=()=>openResumePreview(getResume(data.activeResumeId)||res);
  $("#screen").querySelectorAll(".js-use-res").forEach(b=>b.onclick=()=>{
    data.activeResumeId=b.dataset.id; store.save(); render();
  });
}
