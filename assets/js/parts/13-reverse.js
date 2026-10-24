/* ============================================================
   JOBSEARCH · 反问助手
   ============================================================ */
function shortText(s,n){ const t=String(s||"").replace(/^[\d.、]+/,"").trim(); return t.length>(n||36)?t.slice(0,n||36)+"…":t; }

function buildReverseQuestions(job,res,m){
  const parsed = (job&&job.parsed) || parseJD(job&&job.jd) || {};
  const missing = (m&&m.missing)||[];
  const duties = parsed.duties||[];
  const groups = [];

  const g1 = {tag:"岗位与目标",items:[
    {q:"这个岗位现在最想解决的一个业务问题是什么？如果前三个月只能做成一件事，您希望是哪件？",why:"把 JD 的职责清单变成具体目标，同时能听出这个岗位是长期需求还是临时救火。",risk:""},
    {q:"这个岗位是新增编制还是补位？上一任在这块做到什么程度？",why:"新增通常意味着有预算和资源；补位要判断接手的是不是烂摊子。",risk:"对方含糊其辞，说明岗位定位可能还没想清楚。"}
  ]};
  if(duties[0]) g1.items.push({q:`JD 里提到「${shortText(duties[0])}」，这块目前的现状是什么？最大的阻力在哪？`,why:"证明你认真读过 JD，也在预判自己入职后的真实工作场景。",risk:""});
  groups.push(g1);

  groups.push({tag:"团队与协作",items:[
    {q:"团队现在的分工是怎样的？这个岗位日常要和哪些角色配合最多？",why:"判断你是独立作战还是强协作，也顺便确认团队是否缺人缺得厉害。",risk:""},
    {q:"这个岗位的直接汇报对象是谁？他更看重结果还是过程？",why:"汇报关系决定你的工作方式和考核口径，比薪资更影响日常体验。",risk:""}
  ]});

  groups.push({tag:"业务与决策",items:[
    {q:"像我在简历里做的这类分析（或项目），在贵司通常由谁拍板落地？从结论到执行大概要多久？",why:"判断你的工作能不能真正产生影响，还是只输出报告没人用。",risk:"如果对方答不出流程，说明决策链可能很随意。"},
    {q:"这个岗位做得好不好，半年后会用哪些指标来衡量？",why:"提前知道考核标准，面试时就能把自己的经历往这个标准上靠。",risk:""}
  ]});

  if(missing.length){
    const g = {tag:"针对你的缺口提问（加分项）",items:missing.slice(0,3).map(it=>({
      q:`JD 要求「${shortText(it.text,30)}」。团队目前在这块的成熟度如何？是希望我从 0 搭，还是接手现有体系？`,
      why:"既不回避自己的缺口，又把问题转成对工作内容的确认，比硬解释更加分。",
      risk:"问之前先用一句话承认自己的差距，再问，否则容易被听成抬杠。"
    }))};
    groups.push(g);
  }

  const years = (m&&m.yOwn)||0;
  groups.push({tag:"成长与评估",items:[
    {q:"如果我入职，您建议我第一个月先补哪一块能力，能最快跟上团队节奏？",why:"把面试收尾变成一次免费辅导，也传递出你愿意补短板的信号。",risk:""},
    {q:`我有 ${years} 年经验，您觉得我从现在这个阶段往下一阶段走，最缺的是什么？`,why:"借面试官的经验做一次职业诊断，这类问题通常会被认真回答。",risk:""}
  ]});

  groups.push({tag:"收尾一句",items:[
    {q:"今天聊完，您对我还有哪方面的顾虑？如果有，我希望现在就能补充说明。",why:"直接把面试官心里的疑问摆到桌面上，很多顾虑当场就能化解。",risk:"问完要真的准备好回答，不要问完就沉默。"},
    {q:"后续流程大概什么时候会有反馈？我需要补什么材料可以提前准备。",why:"显得你有节奏感，也能避免无限等待。",risk:""}
  ]});
  return groups;
}

const REVERSE_AVOID = [
  {bad:"你们加班多吗？",good:"团队在项目高峰期的节奏一般怎么安排？",why:"直接问加班会被理解成抗拒投入；问节奏是在了解工作方式。"},
  {bad:"工资能给多少？",good:"这个岗位的薪资区间和晋升节奏大概是怎样的？",why:"技术面问钱容易减分，这类问题留到 HR 环节或 offer 阶段更合适。"},
  {bad:"我可以远程办公吗？",good:"团队日常协作以现场为主，还是有固定的远程日？",why:"问制度而不是问特权，听起来更像在关心协作效率。"},
  {bad:"公司未来会上市吗？",good:"公司未来一年的业务重点在哪块？这个岗位在其中承担什么？",why:"宏大叙事对你没有直接价值，业务重点才决定你做什么。"},
  {bad:"我刚才表现得怎么样？",good:"如果我有机会加入，您建议我入职前先补哪一块？",why:"当场要评价会让面试官为难，换成求建议就变成加分项。"}
];

function allReverseItems(job,res,m){
  const groups = buildReverseQuestions(job,res,m);
  const extra = ((data.reverse&&data.reverse.extra)||[]).map(x=>({q:x.q,why:x.why,risk:x.risk,ai:true}));
  if(extra.length) groups.push({tag:"AI 补充（来自提示词工坊）",items:extra});
  return groups;
}

function renderReverse(){
  const job = activeJob(), res = activeResume();
  if(!job || !res){
    $("#screen").innerHTML = headHTML("反问助手","面试最后五分钟，往往决定面试官对你的印象")
      + emptyState("help","还缺岗位和简历","反问要贴着岗位问，先把 JD 和简历录进来。","去录入岗位","go-jobs");
    $("#screen").querySelectorAll("[data-act='go-jobs']").forEach(el=>el.onclick=()=>go("jobs"));
    return;
  }
  const m = runMatch(job.id,res.id);
  const groups = allReverseItems(job,res,m);
  const count = groups.reduce((s,g)=>s+(g.items||[]).length,0);

  $("#screen").innerHTML = headHTML("反问助手",`${job.company} · ${job.title} · ${count} 个可选问题`,
      `<button class="btn line sm" id="rq-copy">全部复制</button>
       <button class="btn line sm" id="rq-print">打印</button>
       <button class="btn sm" id="rq-ai">${icon("spark",14)} AI 生成</button>`)
    + `<div class="alert info">${icon("alert",14)} <b>反问不是客套。</b>面试官问“你还有什么想问的”，是在看你有没有判断力。优先问「岗位要解决什么、团队怎么协作、怎么衡量我的产出」，把薪资和加班留到 HR 环节。</div>
      ${(data.reverse&&data.reverse.extra||[]).length?`<div class="alert warn mt12">${icon("alert",14)} AI 补充了 ${data.reverse.extra.length} 条，已合并到下方列表。</div>`:""}
      <div class="split mt18">
        ${groups.map((g,gi)=>`<div class="panel-lg">
          <h3>${icon("help",16)} ${esc(g.tag)}</h3>
          <div class="ph-sub">${gi===0?"优先问，能最快判断岗位是否值得去":gi===3?"带着缺口问，反而显得坦诚":"按现场气氛挑 2–3 个问即可"}</div>
          ${(g.items||[]).map((it,i)=>`<div class="rq-card mt12">
            <div class="rq">${esc(it.q)}</div>
            <div class="why">${esc(it.why||"")}</div>
            ${it.risk?`<div class="risk">注意：${esc(it.risk)}</div>`:""}
            <div class="rf">
              <button class="btn ghost sm js-rq-copy" data-g="${gi}" data-i="${i}">复制问题</button>
              <button class="btn ghost sm js-rq-todo" data-g="${gi}" data-i="${i}">加入待办</button>
              ${it.ai?'<span class="badge demo">AI</span>':""}
            </div>
          </div>`).join("")}
        </div>`).join("")}
      </div>
      <div class="panel-lg mt18">
        <h3>${icon("alert",16)} 别这样问</h3>
        <div class="ph-sub">同样的问题，换个问法，分数完全不同</div>
        <div class="avoid-list mt12">
          ${REVERSE_AVOID.map(a=>`<div class="avoid-item"><b>不要说：</b>${esc(a.bad)}<br/>
            <b>可以这样问：</b>${esc(a.good)}<br/>${esc(a.why)}</div>`).join("")}
        </div>
      </div>`;
  wireReverse(groups);
}

function wireReverse(groups){
  $("#screen").querySelectorAll(".js-rq-copy").forEach(b=>b.onclick=()=>{
    const it = groups[+b.dataset.g].items[+b.dataset.i]; if(it) copyText(it.q);
  });
  $("#screen").querySelectorAll(".js-rq-todo").forEach(b=>b.onclick=()=>{
    const it = groups[+b.dataset.g].items[+b.dataset.i];
    if(it){ addTodo("面试反问：" + it.q, "P2"); b.textContent = "已加入"; b.disabled = true; }
  });
  const cp = $("#rq-copy");
  if(cp) cp.onclick = ()=>{
    const lines = [];
    groups.forEach(g=>{ lines.push("【"+g.tag+"】"); (g.items||[]).forEach((it,i)=>lines.push(`${i+1}. ${it.q}`)); lines.push(""); });
    copyText(lines.join("\n"));
  };
  const pr = $("#rq-print"); if(pr) pr.onclick = ()=>window.print();
  const ai = $("#rq-ai"); if(ai) ai.onclick = ()=>openPromptStudio("reverse_questions");
}
