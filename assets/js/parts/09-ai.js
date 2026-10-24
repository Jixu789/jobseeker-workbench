/* ============================================================
   JOBSEARCH · AI 适配器与提示词工坊
   ============================================================ */
const DIM_KEYS = ["content","structure","evidence","expression"];
const DIM_NAMES = { content:"内容相关", structure:"结构完整", evidence:"证据量化", expression:"表达清晰" };

const PROMPTS = {
  jd_parse: {
    name:"JD 结构化解析",
    desc:"把招聘 JD 拆成职责、硬性要求、加分项、技能词与年限，供匹配引擎使用。",
    build(ctx){
      const jd = (ctx.job && ctx.job.jd) || "";
      return `你是招聘方的 JD 解析专家。请解析下面的岗位 JD，只输出 JSON，不要任何解释。

输出格式：
{"title":"","company":"","duties":[],"must":[],"nice":[],"skills":[],"years":null,"degree":""}

规则：
1. must 只放没有商量余地的条件（学历、年限、必备技能）；含“优先/加分/更佳”的句子一律进 nice；
2. duties 是入职后要做的事，不要与任职要求混在一起；
3. skills 用行业通用名词（如 SQL、A/B 测试、指标体系），不要整句；
4. years 只填数字；degree 只填 大专/本科/硕士/博士 之一；
5. 不要编造 JD 里没有的信息。

【JD】
${jd}`;
    }
  },
  match_explain: {
    name:"匹配诊断解释",
    desc:"解释匹配分背后的真实缺口，并给出今天就能执行的补强动作。",
    build(ctx){
      const m = ctx.match;
      const gaps = m ? (m.missing||[]).map(x=>x.text).slice(0,5).join("\n") : "（还没跑匹配）";
      return `你是资深招聘顾问，正在帮一位候选人判断“这份简历投这个岗位到底差在哪”。

只输出 JSON：
{"verdict":"","strengths":[],"gaps":[{"item":"","why":"","fix":""}],"next3":[]}

要求：
1. gaps 最多 4 条，按“会不会被初筛直接刷掉”排序；
2. fix 必须是今天就能改简历或补材料的动作，不能是“多积累几年经验”；
3. 严禁建议编造经历或数字；
4. next3 是未来三天的三个动作，按优先级排列。

【岗位】${(ctx.job&&ctx.job.company)||""} · ${(ctx.job&&ctx.job.title)||""}
【岗位要求】
${(m&&m.parsed&&m.parsed.must||[]).join("\n")||"（未解析）"}
【未覆盖的硬性项】
${gaps||"（无）"}
【本地匹配结果】覆盖率 ${m?Math.round(m.coverage*100):0}%，匹配分 ${m?m.score:0}，硬性缺失 ${m?m.hardMiss:0} 项
【候选人简历】
${ctx.res?resumeText(ctx.res):"（未录入）"}`;
    }
  },
  rewrite_bullets: {
    name:"简历定向改写",
    desc:"按岗位逐条重写经历句，只重组已有事实，需补数字的地方明确标注。",
    build(ctx){
      return `你是简历改写顾问。你的任务是把候选人的简历改成更贴合目标岗位的版本。

硬性约束：
1. 只能重述、重组、前置关键词，禁止新增候选人没有做过的事；
2. 禁止编造任何数字、比例、金额；需要数字但原文没有时，用【补充：具体数字】占位；
3. 每条改写都要说明“为什么这样改”，对应 JD 的哪一条要求。

只输出 JSON：
{"suggestions":[{"target":"summary|experience|project","before":"原文","after":"改写后的整句","reason":"","needsEvidence":true}]}

要求：给出 4–6 条，优先改最近一段经历和个人定位句；after 要能直接粘进简历。

【目标岗位】${(ctx.job&&ctx.job.company)||""} · ${(ctx.job&&ctx.job.title)||""}
【岗位硬性要求】
${(ctx.match&&ctx.match.parsed&&ctx.match.parsed.must||[]).join("\n")||"（未解析）"}
【岗位职责】
${(ctx.match&&ctx.match.parsed&&ctx.match.parsed.duties||[]).join("\n")||"（未解析）"}
【候选人简历】
${ctx.res?resumeText(ctx.res):"（未录入）"}`;
    }
  },
  resume_rewrite: {
    name:"简历一键改写",
    desc:"按目标岗位重写定位句、技能顺序与经历句，只重组已有事实，数字必须能在原文找到。",
    build(ctx){
      const res=ctx.res||{}, m=ctx.match||{}, job=ctx.job||{};
      const p=m.parsed||{};
      const exp=(res.experience||[]).map((e,i)=>
        `#${i} ${e.company||""}｜${e.role||""}｜${e.period||""}\n`+
        (e.bullets||[]).map((b,j)=>`  ${j+1}. ${b}`).join("\n")).join("\n")||"（无）";
      return `你是简历改写顾问。请把候选人简历改写成更贴合目标岗位的版本。

硬性约束：
1. 只能重述、重组、前置关键词，禁止新增原文没有的公司、项目、技能、职责；
2. 禁止新增原文没有的数字、比例、金额；原文没有就保留原表述，不要用占位符；
3. 经历 bullet 只能逐条对应改写，条数必须与原文完全一致，不能合并或拆分；
4. skills 只能从候选人现有技能里挑选并重排，不能新增技能名；
5. 改写后要像简历，不要出现“候选人”“建议”等说明词。

只输出 JSON：
{"summary":"80-140 字个人定位句","skills":["从现有技能里按岗位相关度排序"],"experience":[{"index":0,"bullets":["改写后的第 1 条","第 2 条"]}],"notes":["因缺少证据没写进简历的岗位要求，最多 3 条"]}

【目标岗位】${job.company||""} · ${job.title||""}
【岗位硬性要求】
${(p.must||[]).join("\n")||"（未解析）"}
【岗位职责】
${(p.duties||[]).join("\n")||"（未解析）"}
【现有技能】
${(res.skills||[]).join("、")||"（未填）"}
【现有工作经历】
${exp}
【简历原文】
${resumeText(res).slice(0,4000)}`;
    }
  },
  interview_ask: {
    name:"面试提问生成",
    desc:"按“自我介绍 → 项目深挖 → 岗位匹配 → 行为面 → 压力面”生成连续追问题。",
    build(ctx){
      return `你是 ${(ctx.job&&ctx.job.company)||"该公司"} 的面试官，正在面 ${(ctx.job&&ctx.job.title)||"这个岗位"}。风格务实，喜欢抓住一个细节连续追问。

请根据 JD 与候选人简历，生成 8 个问题，只输出 JSON：
{"questions":[{"tag":"自我介绍|项目深挖|岗位匹配|行为面|压力面","text":"","intent":"","followup":""}]}

要求：
1. 问题必须具体到简历里的项目名、公司名或 JD 里的某条要求，不要通用模板题；
2. followup 是候选人答完后你会追问的一句；
3. 项目深挖至少 3 题，围绕“你个人做了什么”和“如果重来怎么改”；
4. 岗位匹配题要针对简历里没有明确证据的 JD 要求。

【JD】
${(ctx.job&&ctx.job.jd)||""}
【候选人简历】
${ctx.res?resumeText(ctx.res):"（未录入）"}`;
    }
  },
  interview_score: {
    name:"单题回答评分",
    desc:"对一段面试回答按内容、结构、证据、表达四维打分，并给出可照说的改写版。",
    build(ctx){
      return `你是面试评估官。请对候选人的这段回答打分。

四维各 0–25 分：content（是否回答了问题、是否贴合岗位）、structure（是否有清晰结构）、evidence（是否有具体事实与数字）、expression（是否简洁、有条理）。
总分 total = (content*0.35 + structure*0.25 + evidence*0.25 + expression*0.15) / 25 * 100，四舍五入。

只输出 JSON：
{"scores":{"content":0,"structure":0,"evidence":0,"expression":0},"total":0,
 "star":{"s":false,"t":false,"a":false,"r":false},
 "good":"答得好的地方","bad":"最大的问题","better":"改写后的回答","tips":[""]}

要求：better 只能使用回答里已有的事实，缺数字用【补充：数字】占位；tips 最多 3 条，每条是一句可执行的改法。

【面试问题】${ctx.question||""}
【候选人回答】${ctx.answer||""}
【目标岗位】${(ctx.job&&ctx.job.title)||""}`;
    }
  },
  reverse_questions: {
    name:"反问问题生成",
    desc:"生成面试收尾时能加分、且对候选人真正有用的反问。",
    build(ctx){
      return `你是面试教练。候选人马上要被问到“你还有什么想问我的”。

请基于 JD、简历缺口和岗位层级，生成 6 个能体现专业度的反问，只输出 JSON：
{"groups":[{"tag":"岗位与目标","items":[{"q":"","why":"","risk":""}]}]}

要求：
1. 每个问题都要让面试官感觉候选人研究过这个岗位，而不是套话；
2. 不要问薪资、福利、加班、远程、上市这类问题；
3. why 说明这个问题帮候选人判断什么；risk 说明问法上要注意什么；
4. 至少 2 个问题直接指向 JD 里的具体职责或要求。

【JD】
${(ctx.job&&ctx.job.jd)||""}
【简历里没覆盖的岗位要求】
${(ctx.match&&ctx.match.missing||[]).map(x=>x.text).join("\n")||"（无）"}`;
    }
  },
  review_summary: {
    name:"面试复盘总结",
    desc:"把一场面试的问答与评分整理成可执行的复盘结论。",
    build(ctx){
      return `你是面试复盘教练。请根据这场模拟面试的问答记录输出复盘结论，只输出 JSON：
{"headline":"","keep":[],"change":[],"drill":[],"reverse":[]}

要求：
1. headline 一句话说清这场面试最核心的问题；
2. keep 是表现好的 2–3 点，change 是必须改的 2–3 点；
3. drill 是能直接变成练习任务的句子（含题号和目标）；
4. reverse 是下次面试可以问面试官的问题。

【岗位】${(ctx.job&&ctx.job.title)||""}
【问答记录】
${ctx.transcript||""}`;
    }
  }
};

function aiCtx(){
  const job = activeJob(), res = activeResume();
  let m = null;
  if(job && res) { try { m = runMatch(job.id,res.id); } catch(e){} }
  const s = data.interview;
  let transcript = "";
  if(s && (s.answers||[]).length){
    transcript = s.answers.map((a,i)=>`Q${i+1}（${a.tag}）：${a.q}\nA：${a.text}\n得分：${a.ev.total}`).join("\n\n");
  }
  return { job, res, match:m, transcript };
}
function parseJSON(text){
  let t = String(text||"").trim();
  t = t.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if(a>=0 && b>a) t = t.slice(a,b+1);
  try { return JSON.parse(t); } catch(e){ return null; }
}
async function aiChat(messages, opt){
  const cfg = data.settings || {};
  const apiKey = (opt && opt.apiKey) || getApiKey();
  if(!apiKey) throw new Error(vaultOf() ? "密钥已锁定，请到设置页解锁" : "未配置 API Key");
  if(!cfg.baseUrl) throw new Error("未配置接口地址");
  const ctrl = new AbortController();
  const tm = setTimeout(()=>ctrl.abort(), 45000);
  try{
    const res = await fetch(String(cfg.baseUrl).replace(/\/+$/,"") + "/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+apiKey },
      body:JSON.stringify(Object.assign({
        model: cfg.model || "gpt-4o-mini",
        messages,
        temperature: 0.5
      }, opt&&opt.json ? { response_format:{ type:"json_object" } } : {})),
      signal: ctrl.signal
    });
    if(!res.ok){
      const body = await res.text();
      throw new Error("HTTP " + res.status + " · " + body.slice(0,140));
    }
    const j = await res.json();
    return ((j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||"").trim();
  } finally { clearTimeout(tm); }
}
function aiReady(){ return !!(data.settings && data.settings.engine==="api" && hasApiKey()); }
function downloadText(name, text, mime){
  const blob = new Blob([text], {type: mime||"application/json;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 600);
}

let lastAIResult = null;
function renderAIResult(obj){
  if(!obj) return `<div class="alert warn">没解析出 JSON。检查一下是不是把解释文字也一起贴进来了。</div>`;
  if(obj.suggestions){
    return obj.suggestions.map(s=>`<div class="diff-row">
      <div class="diff-meta"><b>${esc(s.target||"改写")}</b>
        ${s.needsEvidence?'<span class="badge warn">需补证据</span>':'<span class="badge ok">可直接用</span>'}
        <span class="tiny">${esc(s.reason||"")}</span></div>
      <div class="diff-cell"><div class="tiny">改前</div>${esc(s.before||"")}</div>
      <div class="diff-cell after"><div class="tiny">改后</div>${esc(s.after||"")}</div>
    </div>`).join("")
    + `<div class="flex mt12"><button class="btn sm" id="ai-copy-all">复制全部改写文案</button></div>`;
  }
  if(obj.questions){
    return obj.questions.map((q,i)=>`<div class="cov-row">
      <span class="dot-pass" style="background:var(--accent)"></span>
      <div class="cv"><b>${i+1}. ${esc(q.text)}</b><div class="tiny">${esc(q.tag||"")} · ${esc(q.intent||"")}</div>
      ${q.followup?`<div class="tiny">追问：${esc(q.followup)}</div>`:""}</div></div>`).join("");
  }
  if(obj.groups){
    return obj.groups.map(g=>`<div class="mt12"><div class="tiny" style="font-weight:800">${esc(g.tag)}</div>
      ${(g.items||[]).map(it=>`<div class="rq-card mt8"><div class="rq">${esc(it.q)}</div>
        <div class="why">${esc(it.why||"")}</div>${it.risk?`<div class="risk">注意：${esc(it.risk)}</div>`:""}</div>`).join("")}</div>`).join("")
      + `<div class="flex mt12"><button class="btn sm" id="ai-add-reverse">加入反问清单</button></div>`;
  }
  if(obj.scores){
    return `<div class="score-grid">${DIM_KEYS.map(k=>`<div class="sc"><div class="k">${DIM_NAMES[k]}</div>
      <div class="v">${obj.scores[k]??"—"}<small style="font-size:11px;color:var(--text-secondary)"> /25</small></div></div>`).join("")}</div>
      <div class="mt12"><span class="badge ${obj.total>=75?'ok':'warn'}">本题 ${obj.total??"—"} 分</span></div>
      <div class="mt8"><b>好的地方：</b>${esc(obj.good||"—")}</div>
      <div class="mt8"><b>问题：</b>${esc(obj.bad||"—")}</div>
      <div class="mt8"><b>可以这样说：</b><div class="diff-cell after mt8">${esc(obj.better||"")}</div></div>`;
  }
  return `<pre class="tiny" style="white-space:pre-wrap;background:var(--surface-nested);padding:12px;border-radius:8px">${esc(JSON.stringify(obj,null,2))}</pre>`;
}
function openPromptStudio(key){
  const def = PROMPTS[key] || PROMPTS.match_explain;
  const ctx = aiCtx();
  const text = def.build(ctx);
  const ov = openModal(`
    <div class="flex" style="justify-content:space-between;align-items:flex-start">
      <div><h3>提示词工坊 · ${esc(def.name)}</h3><div class="sub">${esc(def.desc)}</div></div>
      <span class="badge ${aiReady()?'ok':'demo'}">${aiReady()?"API 已就绪":"复制到 ChatGPT 使用"}</span>
    </div>
    <div class="alert info mt12">提示词已经带入了当前岗位、简历和匹配结果。没有 API Key 也不影响使用：复制到 ChatGPT / 豆包 / Kimi，把返回的 JSON 整段贴回下面即可。</div>
    <label class="mt12" style="display:block;font-size:12px;font-weight:700">提示词</label>
    <textarea id="ps-text" style="min-height:200px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px">${esc(text)}</textarea>
    <div class="flex mt8">
      <button class="btn sm" id="ps-copy">复制提示词</button>
      <button class="btn line sm" id="ps-run">用 API 直接运行</button>
      <span class="tiny" id="ps-state"></span>
    </div>
    <label class="mt18" style="display:block;font-size:12px;font-weight:700">AI 返回结果（粘贴回来解析）</label>
    <textarea id="ps-in" placeholder="把 AI 返回的 JSON 整段贴进来（带 json 代码块标记也没关系）"></textarea>
    <div class="flex mt8"><button class="btn line sm" id="ps-parse">解析结果</button></div>
    <div id="ps-out" class="mt12"></div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="ps-close">关闭</button></div>`, true);

  const out = ov.querySelector("#ps-out");
  const state = ov.querySelector("#ps-state");
  ov.querySelector("#ps-copy").onclick = ()=>copyText(ov.querySelector("#ps-text").value);
  ov.querySelector("#ps-close").onclick = ()=>ov.remove();
  ov.querySelector("#ps-run").onclick = async ()=>{
    if(!aiReady()){ state.textContent = "先在设置页填 API Key"; return; }
    state.textContent = "调用中…";
    try{
      const r = await aiChat([
        {role:"system", content:"你是严谨的求职顾问，只输出 JSON，不要额外解释。"},
        {role:"user", content:ov.querySelector("#ps-text").value}
      ], {json:true});
      ov.querySelector("#ps-in").value = r;
      state.textContent = "已返回，正在解析";
      doParse();
    }catch(e){
      state.textContent = "失败：" + e.message;
    }
  };
  function doParse(){
    const obj = parseJSON(ov.querySelector("#ps-in").value);
    lastAIResult = obj;
    out.innerHTML = renderAIResult(obj);
    const ca = out.querySelector("#ai-copy-all");
    if(ca) ca.onclick = ()=>{
      copyText((obj.suggestions||[]).map(s=>s.after).join("\n"));
    };
    const ar = out.querySelector("#ai-add-reverse");
    if(ar) ar.onclick = ()=>{
      data.reverse = data.reverse || {extra:[]};
      (obj.groups||[]).forEach(g=>(g.items||[]).forEach(it=>data.reverse.extra.push({
        tag:g.tag, q:it.q, why:it.why, risk:it.risk, src:"ai"
      })));
      store.save(); toast("已加入反问清单"); ov.remove();
    };
  }
  ov.querySelector("#ps-parse").onclick = doParse;
}
