/* ============================================================
   JOBSEARCH · 匹配分析（以岗位为中心的定制闭环）
   证据报告 → 逐条优化 → 版本 → 导出
   ============================================================ */
function mbar(label, ratio, note){
  const v=Math.round(clamp(ratio,0,1)*100);
  const col=v>=75?"var(--success)":v>=50?"var(--warning)":"var(--danger)";
  return `<div class="mbar"><div class="mt"><span>${label} <span class="tiny">${esc(note||"")}</span></span><b>${v}%</b></div>
    <div class="track"><i style="width:${v}%;background:${col}"></i></div></div>`;
}
function renderMatch(){
  const jobs=data.jobs||[], resList=data.resumes||[];
  if(!jobs.length||!resList.length){
    $("#screen").innerHTML=headHTML("匹配分析","先有岗位和简历，才能做证据分析")
      + emptyState("target","还缺分析对象","至少录入一个岗位和一份简历，匹配诊断才有意义。","去岗位库","go-jobs");
    $("#screen").querySelectorAll("[data-act='go-jobs']").forEach(el=>el.onclick=()=>go("jobs"));
    return;
  }
  const job=activeJob(), res=activeResume();
  const bundle=tailorBundle(job,res);
  const m=bundle.match, a=bundle.assessment;
  data.match=m; store.save();
  const quant=allBullets(res).filter(b=>/\d/.test(b)).length;
  const c=a.counts;

  $("#screen").innerHTML = headHTML("匹配分析","按岗位逐条对照证据，缺口只提问、不代写")
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
        <div class="alert info mt12">${icon("alert",14)} <b>分数怎么来的：</b>关键词与要求覆盖 ×70 + 经验年限 ×15 + 量化密度 ×15；硬性条件缺失时封顶 59。分数只是辅助参考，不能保证通过 ATS 或拿到面试。</div>
      </div>`
    + tailorAIBadgeHTML()
    + tailorJDPanelHTML(a,job)
    + `<div class="panel-lg mt18">
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
            <div class="chips mt8">
              <span class="badge ok">已有证据 ${c.supported}</span>
              <span class="badge warn">需补充 ${c.partial}</span>
              <span class="badge danger">暂无证据 ${c.missing}</span>
              <span class="badge warn">硬性待确认 ${c.hard_unclear}</span>
              <span class="badge danger">硬性不满足 ${c.hard_unmet}</span>
            </div>
            <div class="tiny mt8">证据制覆盖率 ${Math.round(a.coverage*100)}%（辅助参考，计算规则见下方报告）</div>
          </div>
        </div>
      </div>

      <div class="split wide-left mt18">
        ${tailorReportHTML(a,bundle.session)}
        <div class="panel-lg">
          <h3>${icon("check",16)} ATS 体检</h3>
          <div class="ph-sub">机器筛简历时最容易踩的六个坑，仅代表可解析性，不代表录用结果</div>
          <div class="scroll" style="max-height:520px">
            ${m.ats.map(x=>`<div class="cov-row">
              <span class="dot-pass" style="background:${x.pass?'var(--success)':'var(--warning)'}"></span>
              <div class="cv"><b>${esc(x.name)}</b> <span class="badge ${x.pass?'ok':'warn'}">${esc(x.value)}</span>
                <div class="tiny">${esc(x.advice)}</div></div></div>`).join("")}
          </div>
        </div>
      </div>`
    + tailorSuggestionsHTML(bundle)
    + tailorVersionHTML(bundle)
    + `<div class="panel-lg mt18">
        <h3>${icon("spark",16)} 一键改写（可选）</h3>
        <div class="ph-sub">不逐条确认，直接把整份简历按当前岗位整体调一遍：定位句、技能顺序与项目排序${aiReady()?"，并由 AI 改写经历句":""}一起调整，生成一份定制版副本，原简历始终保留。</div>
        <div class="flex mt12" style="align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn" id="m-rewrite">${icon("spark",15)} 一键改写简历</button>
          <button class="btn line" id="m-view">${icon("file",15)} 简历阅览</button>
          <button class="btn line" id="m-ai">${icon("spark",15)} 逐条改写 · 提示词工坊</button>
          <span class="tiny">不会写入简历里没有证据的内容，岗位缺口只提示、不代写。</span>
        </div>
      </div>`;
  wireMatch(bundle);
}
function matchVerdict(m,job,res){
  if(m.hardMiss) return `有 ${m.hardMiss} 项硬性条件没有证据，HR 初筛大概率直接过滤。先决定是补经历、换岗位，还是用相邻经验去解释。`;
  if(m.score>=85) return "关键词和成果都比较扎实，直接投；面试重点准备项目深挖。";
  if(m.score>=75) return "已经过初筛线，投之前把缺口技能补一句证据，再练两轮面试。";
  if(m.score>=60) return "能过一部分初筛，但优势不明显。建议先改写最近一段经历，把岗位关键词前置。";
  return "匹配度偏低，不建议直接投这家。先看是方向不匹配，还是简历没写出已有能力。";
}
function wireMatch(bundle){
  const {job,res,match:m}=bundle;
  const jsel=$("#m-job"), rsel=$("#m-res");
  if(jsel) jsel.onchange=()=>{ data.activeJobId=jsel.value; store.save(); render(); };
  if(rsel) rsel.onchange=()=>{
    const prevBase=bundle.session.baseResumeId;
    const next=getResume(rsel.value);
    data.activeResumeId=rsel.value; store.save();
    if(next&&next.id!==prevBase&&(!next.parentId||next.jobId!==job.id))
      toast("已切换分析简历，本岗位会以它为基础重新建立定制版本；旧版本仍保留在简历库");
    render();
  };
  const rr=$("#m-rerun"); if(rr) rr.onclick=()=>{ toast("已重新诊断"); tailorRefresh(); };
  const atop=$("#m-ai-top"); if(atop) atop.onclick=()=>openPromptStudio("match_explain");
  const ai=$("#m-ai"); if(ai) ai.onclick=()=>openPromptStudio("rewrite_bullets");
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
  const vw=$("#m-view"); if(vw) vw.onclick=()=>openResumePreview(bundle.draft||getResume(data.activeResumeId)||res);
  wireTailor(bundle);
}
