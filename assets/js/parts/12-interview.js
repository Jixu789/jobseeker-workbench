/* ============================================================
   JOBSEARCH · 模拟面试引擎
   ============================================================ */
let ivMode = "dialog";

function buildQuestionPlan(job,res){
  const parsed = job.parsed || parseJD(job.jd);
  const m = runMatch(job.id,res.id);
  const qs = [];
  qs.push({id:"q-intro",tag:"开场",step:"self_intro",text:`先做个自我介绍。重点讲和「${job.title}」相关的经历，控制在 90 秒内。`,intent:"面试官想确认你的定位是否和岗位一致，而不是听一遍完整简历。"});

  const projects = (res.projects||[]).slice(0,2);
  projects.forEach((p,i)=>{
    qs.push({id:"q-p"+i,tag:"项目深挖",step:"project_deepdive",text:`你在「${p.name}」里具体负责哪部分？如果重来一次，你会改哪一步？`,intent:"确认你是这个项目的主人还是旁观者，同时看复盘能力。"});
  });
  if(!projects.length && (res.experience||[])[0]){
    const e = res.experience[0];
    qs.push({id:"q-p0",tag:"项目深挖",step:"project_deepdive",text:`你在${e.company}做${e.role}期间，最有代表性的一件事是什么？你个人做了什么？`,intent:"从最近一段经历里找行为证据。"});
  }
  (m.missing||[]).slice(0,2).forEach((it,i)=>{
    qs.push({id:"q-g"+i,tag:"岗位匹配",step:"job_fit",text:`岗位要求「${String(it.text).replace(/^[\d.、]+/,"")}」，能举个你的实际例子说明你具备这一点吗？`,intent:"这是 JD 的硬性要求，但你简历里没有明确证据，答不上来会被判定为硬伤。"});
  });
  const hitRow = (m.rows||[]).find(r=>r.kind==="must" && r.hit>=0.5);
  if(hitRow) qs.push({id:"q-g-ok",tag:"岗位匹配",step:"job_fit",text:`JD 里提到「${String(hitRow.text).replace(/^[\d.、]+/,"")}」。你过去的场景和这家公司未必一样，你打算怎么迁移？`,intent:"看方法论能不能迁移，而不是只会照搬上一家的做法。"});

  qs.push({id:"q-b1",tag:"行为面",step:"behavioral",text:"讲一次你和业务方或同事意见不一致的经历：你怎么处理，最后结果如何？",intent:"考察协作和推动力。重点听你怎么处理分歧，而不是谁对谁错。"});
  const duty = (parsed.duties||[])[0];
  if(duty) qs.push({id:"q-b2",tag:"行为面",step:"behavioral",text:`这个岗位要「${String(duty).replace(/^[\d.、]+/,"")}」，讲一次你做类似事情的完整过程。`,intent:"把岗位职责翻译成你的行为证据。"});

  qs.push({id:"q-s1",tag:"压力面",step:"pressure",text:`你觉得自己最弱的一点是什么？如果我说你只有 ${m.yOwn} 年经验、离这个岗位还差一点，你怎么回应？`,intent:"看抗压和自我认知。不要辩解，给证据和补法。"});
  qs.push({id:"q-end",tag:"收尾",step:"candidate_questions",reverse:true,text:"我的问题问完了。你还有什么想问我的吗？",intent:"反问环节——问什么，比问不问更重要。"});
  return qs;
}

function evaluateAnswer(text,q,job,res){
  const t = String(text||"").trim();
  const n = t.replace(/\s/g,"").length;
  const parsed = (job&&job.parsed) || parseJD(job&&job.jd);
  const kws = [...new Set([].concat(parsed.skills||[], (parsed.must||[]).flatMap(extractSkills)))];
  const hit = kws.filter(k=>t.toLowerCase().includes(String(k).toLowerCase())).length;

  const content = clamp(Math.round(hit/Math.max(3,kws.length)*18 + Math.min(7,n/60*7)),0,25);
  const sRe=[/当时|背景|情况|问题|挑战|一开始|起因/,/目标|任务|我负责|要我|需要/,/我先|然后|接着|于是|做法|方案|步骤|拆/,/结果|最终|最后|提升了|降低|带来了|节省/];
  const sHit = sRe.filter(re=>re.test(t)).length;
  const structure = clamp(Math.round(sHit/4*18 + (/首先|其次|最后|因为|所以|但是|因此|于是/.test(t)?7:0)),0,25);
  const nums = (t.match(/\d+(\.\d+)?%?/g)||[]).length;
  const evidence = clamp(Math.round(Math.min(1,nums/4)*16 + (/我(负责|主导|牵头|推动|搭建|设计|独立)/.test(t)?9:0)),0,25);
  let expression = 12;
  if(n>=80) expression += 6;
  if(n>=150) expression += 4;
  if(n>520) expression -= 8;
  if(n<40) expression -= 6;
  if(/(嗯|那个|就是|然后就是|差不多)/.test(t)) expression -= 3;
  expression = clamp(expression,0,25);

  const dims = {content,structure,evidence,expression};
  const total = Math.round((content*.35 + structure*.25 + evidence*.25 + expression*.15)/25*100);
  const tips = [];
  if(n<60) tips.push("回答太短，面试官拿不到判断依据。用「背景一句 → 我的动作两句 → 结果一句」补到 150 字以上。");
  if(n>520) tips.push("太长了。先给结论再展开，控制在两分钟内。");
  if(nums===0) tips.push("一个数字都没有。补上比例、金额、人数或时长，哪怕是区间估计。");
  if(sHit<3) tips.push("结构不完整。按 STAR 说：当时什么情况、你要解决什么、你做了什么、结果怎样。");
  if(hit===0 && kws.length) tips.push(`没有主动提到岗位关键词，建议自然带出 ${kws.slice(0,3).join(" / ")}。`);
  if(!/我(负责|主导|牵头|推动|搭建|设计|独立)/.test(t)) tips.push("通篇在说「我们」，听不出你个人做了什么，换成「我负责…」。");
  return {dims,total,tips,star:{s:sRe[0].test(t),t:sRe[1].test(t),a:sRe[2].test(t),r:sRe[3].test(t)},nums,len:n};
}

function coachLine(ev,q){
  if(ev.total>=80) return "这题比较完整，我基本能判断你的能力边界了。";
  if(ev.dims.evidence<10) return "方向对，但全是定性描述。补一个数字，我才知道这件事的量级。";
  if(ev.dims.structure<10) return "信息有点散。你按「当时的问题 → 你的动作 → 结果」再讲一遍。";
  if(ev.dims.content<10) return "你讲的例子和这个岗位的关联不够，换一个更贴近「"+(q?q.tag:"这道题")+"」的例子。";
  if(ev.dims.expression<10) return "我抓不到重点。先说结论，再补两句过程就行。";
  return "嗯，我理解了。";
}

function startSession(mode){
  const job = activeJob(), res = activeResume();
  if(!job || !res){ toast("先录入岗位和简历"); return; }
  const plan = buildQuestionPlan(job,res);
  const s = {
    id: uid("iv"), jobId: job.id, resumeId: res.id, mode: mode||ivMode,
    plan, qi:0, turns:[], answers:[], reverseText:"", done:false, drillResult:null, startedAt: nowISO()
  };
  if(s.mode==="dialog"){
    s.turns.push({who:"ai",tag:"面试官",text:`你好，我是${job.company}这轮面试的面试官。我们大概聊 20 分钟，中间我会追问细节，你按真实情况说就行。`});
    s.turns.push({who:"ai",tag:plan[0].tag,text:plan[0].text});
  }
  data.interview = s;
  store.save(); render();
}

function bubbleHTML(t){
  const me = t.who==="me", fb = t.who==="fb";
  return `<div class="bubble-row ${me?"me":""}">
    <div class="avatar-dot">${me?"我":fb?"评":"面"}</div>
    <div class="bubble ${fb?"fb":""}">${t.tag?`<span class="btag">${esc(t.tag)}</span>`:""}${esc(t.text)}</div>
  </div>`;
}

function renderInterview(){
  const job = activeJob(), res = activeResume();
  if(!job || !res){
    $("#screen").innerHTML = headHTML("模拟面试","先准备好岗位和简历，面试才有针对性")
      + emptyState("chat","还缺面试材料","面试官会围绕岗位要求和你的经历追问，先把两者录进来。","去录入岗位","go-jobs");
    $("#screen").querySelectorAll("[data-act='go-jobs']").forEach(el=>el.onclick=()=>go("jobs"));
    return;
  }
  const s = data.interview;
  if(!s){ renderInterviewSetup(job,res); return; }
  if(s.done){ renderInterviewReport(s); return; }
  if(s.mode==="drill") renderInterviewDrill(s,job,res);
  else renderInterviewDialog(s,job,res);
}

function renderInterviewSetup(job,res){
  const plan = buildQuestionPlan(job,res);
  const history = (data.sessions||[]).slice().reverse().slice(0,5);
  $("#screen").innerHTML = headHTML("模拟面试",`${job.company} · ${job.title}`)
    + `<div class="split">
        <div class="panel-lg">
          <h3>${icon("chat",16)} 开始一场模拟面试</h3>
          <div class="ph-sub">面试官按「${esc(job.company)}」这个岗位的真实要求追问，问题来自 JD 和你简历里的具体项目</div>
          <div class="chips mt12">
            <span class="chip click ${ivMode==='dialog'?'on':''}" data-mode="dialog">对话式（像真实面试）</span>
            <span class="chip click ${ivMode==='drill'?'on':''}" data-mode="drill">逐题训练（每题单独评分）</span>
          </div>
          <div class="alert info mt12">${icon("alert",14)} 本场共 ${plan.length} 题：自我介绍 → 项目深挖 → 岗位匹配 → 行为面 → 压力面 → 反问。答完给四维答辩评分。</div>
          <div class="flex mt12">
            <button class="btn" id="iv-start">${icon("play",15)} 开始面试</button>
            <button class="btn line" id="iv-aiq">${icon("spark",15)} AI 出题</button>
          </div>
        </div>
        <div class="panel-lg">
          <h3>${icon("clock",16)} 最近练习</h3>
          <div class="ph-sub">每次答辩结果都会留档，可对比进步</div>
          ${history.length? history.map(h=>`<div class="cov-row">
              <span class="dot-pass" style="background:${h.total>=75?'var(--success)':h.total>=60?'var(--warning)':'var(--danger)'}"></span>
              <div class="cv"><b>${esc(h.jobTitle||"模拟面试")}</b>
                <div class="tiny">${fmtDate(h.finishedAt)} · ${esc(h.mode==="drill"?"逐题训练":"对话式")} · ${(h.qa||[]).length} 题</div></div>
              <span class="badge ${h.total>=75?'ok':h.total>=60?'warn':'danger'}">${h.total} 分</span>
            </div>`).join("") : `<div class="tiny">还没练过。第一次建议用对话式，先适应被追问的节奏。</div>`}
        </div>
      </div>`;
  $("#screen").querySelectorAll("[data-mode]").forEach(el=>el.onclick=()=>{
    ivMode = el.dataset.mode;
    $("#screen").querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("on",x===el));
  });
  $("#iv-start").onclick = ()=>startSession(ivMode);
  $("#iv-aiq").onclick = ()=>openPromptStudio("interview_ask");
}

function renderInterviewDialog(s,job,res){
  const total = s.plan.length;
  const cur = s.plan[s.qi];
  $("#screen").innerHTML = headHTML("模拟面试",`${job.company} · ${job.title} · 已答 ${s.answers.length} / ${total}`,
      `<button class="btn line sm" id="iv-quit">结束并答辩</button>`)
    + `<div class="panel-lg" style="padding:0;overflow:hidden">
        <div class="chatbox" style="border:none;border-radius:0;height:min(62vh,600px)">
          <div class="chat-log" id="chat-log">${(s.turns||[]).map(bubbleHTML).join("")}</div>
        </div>
        <div class="composer">
          <textarea id="iv-input" placeholder="按 STAR 说：当时什么情况 → 你做了什么 → 结果怎样（Ctrl+Enter 发送）"></textarea>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn" id="iv-send">${icon("send",15)} 回答</button>
            <button class="btn ghost sm" id="iv-skip">跳过</button>
          </div>
        </div>
      </div>
      <div class="alert info mt12">${icon("alert",14)} 当前题：<b>${esc(cur?cur.tag:"收尾")}</b>。面试官在意的是你个人的动作和结果，不是团队做了什么。</div>
      <div class="flex mt12">
        <button class="btn line sm" id="iv-ai-score">${icon("spark",14)} 用 AI 深评这题</button>
        <span class="tiny">本地评分看结构、数字和岗位关键词；AI 深评会给出可以照说的版本</span>
      </div>`;
  wireInterviewDialog(s);
}

function wireInterviewDialog(s){
  const input = $("#iv-input"), send = $("#iv-send");
  if(send) send.onclick = ()=>submitAnswer(input?input.value:"");
  if(input){
    input.onkeydown = e=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){ e.preventDefault(); submitAnswer(input.value); } };
    setTimeout(()=>{ const l=$("#chat-log"); if(l) l.scrollTop=l.scrollHeight; input.focus(); },40);
  }
  const sk = $("#iv-skip"); if(sk) sk.onclick = skipQuestion;
  const quit = $("#iv-quit"); if(quit) quit.onclick = finishSession;
  const ais = $("#iv-ai-score");
  if(ais) ais.onclick = ()=>{ toast("先把这题答完，再去提示词工坊做深度评估"); openPromptStudio("interview_score"); };
}

function renderInterviewDrill(s,job,res){
  const cur = s.plan[s.qi];
  const r = s.drillResult;
  const answered = (s.answers||[]).length;
  const card = r ? `<div class="panel-lg mt18">
      <div class="flex" style="justify-content:space-between">
        <h3>${icon("award",16)} 本题评分</h3>
        <span class="badge ${r.ev.total>=75?'ok':r.ev.total>=60?'warn':'danger'}">${r.ev.total} / 100</span>
      </div>
      <div class="score-grid mt12">
        ${DIM_KEYS.map(k=>`<div class="sc"><div class="k">${DIM_NAMES[k]}</div>
          <div class="v">${r.ev.dims[k]}<small style="font-size:11px;color:var(--text-secondary)"> /25</small></div></div>`).join("")}
      </div>
      <div class="star-list mt12">
        ${[["s","情境"],["t","任务"],["a","行动"],["r","结果"]].map(x=>`<span class="star-pill ${r.ev.star[x[0]]?'ok':''}">${x[1]}${r.ev.star[x[0]]?" ✓":""}</span>`).join("")}
      </div>
      <div class="alert info mt12">${icon("alert",14)} ${esc(coachLine(r.ev,cur))}</div>
      ${r.ev.tips.length?`<ul style="font-size:13px;line-height:1.8;padding-left:18px;margin-top:10px">${r.ev.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
      <div class="flex mt12">
        <button class="btn" id="iv-next">${icon("play",14)} 下一题</button>
        <button class="btn line" id="iv-rewrite">${icon("spark",14)} AI 深评</button>
        <button class="btn ghost" id="iv-quit">结束并答辩</button>
      </div>
    </div>`
    : `<div class="panel-lg mt18">
        <div class="qcard">
          <div class="qmeta"><span class="badge">${esc(cur.tag)}</span><span class="tiny">第 ${s.qi+1} / ${s.plan.length} 题</span></div>
          <div class="qtext">${esc(cur.text)}</div>
          <div class="intent">${icon("alert",13)} ${esc(cur.intent||"")}</div>
        </div>
        <div class="field mt12"><label>你的回答</label>
          <textarea id="iv-drill-input" style="min-height:150px" placeholder="先给结论，再讲背景、你的动作和结果。尽量带数字。"></textarea></div>
        <div class="flex mt12">
          <button class="btn" id="iv-drill-submit">提交并评分</button>
          <button class="btn ghost" id="iv-skip">跳过</button>
          <button class="btn ghost" id="iv-quit">结束并答辩</button>
        </div>
      </div>`;

  $("#screen").innerHTML = headHTML("逐题训练",`${job.company} · ${job.title} · 已答 ${answered} / ${s.plan.length} 题`)
    + card;
  const sub = $("#iv-drill-submit");
  if(sub) sub.onclick = ()=>submitAnswer($("#iv-drill-input").value, true);
  const nx = $("#iv-next"); if(nx) nx.onclick = advanceDrill;
  const rw = $("#iv-rewrite"); if(rw) rw.onclick = ()=>openPromptStudio("interview_score");
  const sk = $("#iv-skip"); if(sk) sk.onclick = skipQuestion;
  const q = $("#iv-quit"); if(q) q.onclick = finishSession;
}

function submitAnswer(text, drill){
  const s = data.interview;
  if(!s || s.done) return;
  const t = String(text||"").trim();
  if(!t){ toast("先写点内容，哪怕只写三句话"); return; }
  const job = getJob(s.jobId), res = getResume(s.resumeId);
  const q = s.plan[s.qi] || {tag:"收尾",text:""};
  const ev = evaluateAnswer(t,q,job,res);

  if(drill){
    s.answers.push({qid:q.id,q:q.text,tag:q.tag,text:t,ev});
    s.drillResult = {qid:q.id,ev};
    store.save(); render();
    return;
  }

  s.turns.push({who:"me",text:t,tag:"我"});
  if(q.reverse){
    s.reverseText = t;
    s.turns.push({who:"ai",tag:"面试官",text:"好，我记下了。这些问题我会在后续流程里回复你。今天就到这里，我给你一份答辩评估。"});
    finishSession();
    return;
  }
  s.answers.push({qid:q.id,q:q.text,tag:q.tag,text:t,ev});
  s.turns.push({who:"fb",tag:`评分 ${ev.total} / 100`,text:coachLine(ev,q)+(ev.tips.length?"\n建议："+ev.tips.slice(0,2).join(" "):"")});
  s.qi++;
  if(s.qi>=s.plan.length){ finishSession(); return; }
  const nq = s.plan[s.qi];
  s.turns.push({who:"ai",tag:nq.tag,text:nq.text});
  store.save();
  renderInterviewDialog(s, job, res);
  const input = $("#iv-input"); if(input) input.value="";
}

function advanceDrill(){
  const s = data.interview;
  if(!s) return;
  s.qi++; s.drillResult = null;
  if(s.qi>=s.plan.length){ finishSession(); return; }
  store.save(); render();
}

function skipQuestion(){
  const s = data.interview;
  if(!s) return;
  const q = s.plan[s.qi];
  if(q && q.reverse){ finishSession(); return; }
  if(s.mode==="drill"){
    s.qi++; s.drillResult = null;
    if(s.qi>=s.plan.length){ finishSession(); return; }
    store.save(); render(); return;
  }
  s.turns.push({who:"ai",tag:"面试官",text:"好，那我换个角度问。"});
  s.qi++;
  if(s.qi>=s.plan.length){ finishSession(); return; }
  const nq = s.plan[s.qi];
  s.turns.push({who:"ai",tag:nq.tag,text:nq.text});
  store.save(); render();
}

function finishSession(){
  const s = data.interview;
  if(!s || s.done) return;
  const job = getJob(s.jobId), res = getResume(s.resumeId);
  const ans = (s.answers||[]).filter(a=>a.ev);
  if(!ans.length){
    data.interview = null; store.save();
    toast("本场还没有作答，已退出"); render(); return;
  }
  const dims = {};
  DIM_KEYS.forEach(k=>{ dims[k] = Math.round(ans.reduce((x,a)=>x+a.ev.dims[k],0)/ans.length); });
  const total = Math.round((dims.content*.35 + dims.structure*.25 + dims.evidence*.25 + dims.expression*.15)/25*100);
  const tips = [];
  ans.forEach(a=>{ (a.ev.tips||[]).forEach(t=>{ if(tips.indexOf(t)<0) tips.push(t); }); });
  const rec = {
    id: s.id, jobId: s.jobId, resumeId: s.resumeId,
    jobTitle: `${job?job.company:"—"} · ${job?job.title:"模拟面试"}`,
    mode: s.mode, startedAt: s.startedAt, finishedAt: nowISO(),
    total, dims, tips: tips.slice(0,5), reverseText: s.reverseText||"",
    qa: ans.map(a=>({q:a.q,tag:a.tag,text:a.text,ev:a.ev}))
  };
  data.sessions = data.sessions || [];
  data.sessions.push(rec);
  s.done = true; s.sessionId = rec.id;
  store.save(); render();
}

function buildReportText(rec){
  const lines = [`模拟面试答辩 · ${rec.jobTitle}`, `时间：${rec.finishedAt}`, `总分：${rec.total} / 100`];
  lines.push(`四维：内容 ${rec.dims.content}/25 · 结构 ${rec.dims.structure}/25 · 证据 ${rec.dims.evidence}/25 · 表达 ${rec.dims.expression}/25`);
  lines.push("");
  (rec.qa||[]).forEach((a,i)=>{
    lines.push(`Q${i+1}（${a.tag}）${a.q}`);
    lines.push(`我的回答：${a.text}`);
    lines.push(`得分：${a.ev.total}`);
    lines.push("");
  });
  if((rec.tips||[]).length){ lines.push("改进项："); rec.tips.forEach(t=>lines.push("- "+t)); }
  return lines.join("\n");
}

function renderInterviewReport(s){
  const rec = (data.sessions||[]).find(x=>x.id===s.sessionId) || (data.sessions||[])[(data.sessions||[]).length-1];
  if(!rec){ data.interview=null; render(); return; }
  const tipRows = (rec.tips||[]).map((t,i)=>`<div class="cov-row">
      <span class="dot-pass" style="background:var(--warning)"></span>
      <div class="cv">${esc(t)}</div>
      <button class="btn ghost sm js-tip-todo" data-i="${i}">加入待办</button></div>`).join("");
  const qaRows = (rec.qa||[]).map((a,i)=>`<div class="panel-lg mt12">
      <div class="flex" style="justify-content:space-between">
        <b style="font-size:13.5px">Q${i+1} · ${esc(a.tag)}</b>
        <span class="badge ${a.ev.total>=75?'ok':a.ev.total>=60?'warn':'danger'}">${a.ev.total} 分</span>
      </div>
      <div class="lead mt8">${esc(a.q)}</div>
      <div class="diff-cell mt8" style="white-space:pre-wrap">${esc(a.text)}</div>
      <div class="star-list mt8">
        ${[["s","情境"],["t","任务"],["a","行动"],["r","结果"]].map(x=>`<span class="star-pill ${a.ev.star[x[0]]?'ok':''}">${x[1]}${a.ev.star[x[0]]?" ✓":""}</span>`).join("")}
      </div>
      ${a.ev.tips.length?`<div class="tiny mt8">改进：${esc(a.ev.tips.slice(0,2).join(" "))}</div>`:""}
    </div>`).join("");

  $("#screen").innerHTML = headHTML("面试答辩",`${rec.jobTitle} · ${fmtDate(rec.finishedAt)} · ${rec.mode==="drill"?"逐题训练":"对话式"}`,
      `<button class="btn line sm" id="rp-copy">复制复盘</button>
       <button class="btn sm" id="rp-again">再练一场</button>`)
    + `<div class="panel-lg">
        <div class="score-hero">
          ${scoreRing(rec.total)}
          <div class="mbars">
            ${DIM_KEYS.map(k=>mbar(DIM_NAMES[k], (rec.dims[k]||0)/25, (rec.dims[k]||0)+" / 25")).join("")}
          </div>
          <div class="mverdict mv220">
            <div class="badge ${rec.total>=75?'ok':rec.total>=60?'warn':'danger'}">${rec.total>=75?"面试表现已过线":rec.total>=60?"有亮点，但证据不足":"结构性问题，先补 STAR"}</div>
            <div class="lead mt8">${esc(rec.total>=75?"这场的回答已经能让面试官判断你的能力边界，接下来练压力面和反问。":rec.total>=60?"方向对，但多数回答停留在「我们做了什么」，缺少你个人的动作和数字。":"先把每题的结论、动作、结果说清楚，再谈技巧。")}</div>
            <div class="tiny mt8">共 ${(rec.qa||[]).length} 题 · ${rec.reverseText?"已记录反问":"未进入反问环节"}</div>
          </div>
        </div>
      </div>
      <div class="split mt18">
        <div class="panel-lg">
          <h3>${icon("alert",16)} 答辩结论</h3>
          <div class="ph-sub">按优先级排序，逐条改，不要一次改所有问题</div>
          ${tipRows || `<div class="tiny">本场没有触发明显问题，保持节奏，去练压力面。</div>`}
        </div>
        <div class="panel-lg">
          <h3>${icon("help",16)} 下一步</h3>
          <div class="ph-sub">把结论落成动作，下一场才不会再犯</div>
          <div class="flex mt8 wrap">
            <button class="btn sm" id="rp-reverse">${icon("help",14)} 生成反问清单</button>
            <button class="btn line sm" id="rp-match">${icon("target",14)} 回看匹配缺口</button>
            <button class="btn line sm" id="rp-todo">${icon("list",14)} 全部加入复盘待办</button>
          </div>
          ${rec.reverseText?`<div class="mt12"><div class="tiny" style="font-weight:800">你在反问环节问的是：</div>
            <div class="diff-cell mt8" style="white-space:pre-wrap">${esc(rec.reverseText)}</div></div>`:""}
        </div>
      </div>
      ${qaRows}`;
  wireReport(rec);
}

function wireReport(rec){
  const cp = $("#rp-copy"); if(cp) cp.onclick = ()=>copyText(buildReportText(rec));
  const ag = $("#rp-again"); if(ag) ag.onclick = ()=>startSession(rec.mode);
  const rv = $("#rp-reverse"); if(rv) rv.onclick = ()=>go("reverse");
  const mt = $("#rp-match"); if(mt) mt.onclick = ()=>go("match");
  $("#screen").querySelectorAll(".js-tip-todo").forEach(b=>b.onclick=()=>{
    addTodo(rec.tips[+b.dataset.i], "P0");
    b.textContent = "已加入"; b.disabled = true;
  });
  const all = $("#rp-todo");
  if(all) all.onclick = ()=>{ (rec.tips||[]).forEach(t=>addTodo(t,"P1")); toast("已全部加入复盘待办"); };
}

function addTodo(text, p){
  const t = String(text||"").trim();
  if(!t) return;
  data.todo = data.todo || [];
  data.todo.unshift({id: Date.now()+Math.floor(Math.random()*1000), title: t.slice(0,90), priority: p||"P1", done:false, note:"来自模拟面试答辩"});
  store.save();
}
