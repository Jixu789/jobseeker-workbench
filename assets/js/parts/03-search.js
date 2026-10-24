/* ============================================================
   全局搜索 / 命令面板（Ctrl / ⌘ + K）
   ============================================================ */
const CMDK_MAX = 9;
const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

/* 面板里的可搜索条目：页面 + 岗位 + 简历 + 待办 + 笔记 + 快捷操作 */
function cmdkItems(){
  const out=[];
  NAV_GROUPS.forEach(g=>g.items.forEach(it=>out.push({
    kind:"页面", icon:it.icon, title:it.label, sub:"打开「"+it.label+"」",
    keys:it.label+" "+it.go,
    text:it.label+" "+it.go, act:()=>go(it.go)
  })));
  out.push({ kind:"页面", icon:"activity", title:"洞察", sub:"打开「洞察」",
    keys:"洞察 insight", text:"洞察 insight 模块 进展", act:()=>go("insight") });
  (data.jobs||[]).forEach(j=>out.push({
    kind:"岗位", icon:"briefcase", title:j.title||"未填岗位",
    sub:[j.company,j.location,j.salary,j.status].filter(Boolean).join(" · ")||"查看岗位详情",
    keys:[j.title,j.company].filter(Boolean).join(" "),
    text:[j.title,j.company,j.location,j.salary,j.channel,j.status,j.url,j.jd].filter(Boolean).join(" "),
    act:()=>go("jobs", j.id)
  }));
  (data.resumes||[]).forEach(r=>out.push({
    kind:"简历", icon:"file", title:r.name||"未命名简历",
    sub:[r.target,r.contact].filter(Boolean).join(" · ")||"查看简历",
    keys:[r.name,r.target].filter(Boolean).join(" "),
    text:resumeText(r), act:()=>openResumeDetail(r.id)
  }));
  (data.todo||[]).forEach(t=>out.push({
    kind:"待办", icon:"list", title:t.title||"未命名任务",
    sub:[t.priority, t.done?"已完成":"未完成", t.note].filter(Boolean).join(" · "),
    keys:t.title||"",
    text:[t.title,t.note,t.priority].filter(Boolean).join(" "),
    act:()=>openEditor("todo", t)
  }));
  (data.note||[]).forEach(n=>out.push({
    kind:"笔记", icon:"pen", title:n.title||"未命名笔记",
    sub:[n.mood, n.date].filter(Boolean).join(" · ")||"打开笔记",
    keys:n.title||"",
    text:[n.title,n.content,n.mood].filter(Boolean).join(" "),
    act:()=>openEditor("note", n)
  }));
  out.push({ kind:"操作", icon:"plus", title:"新建岗位", sub:"粘贴 JD，自动拆出职责与要求",
    text:"新建 添加 岗位 jd", act:()=>openJobForm(null) });
  out.push({ kind:"操作", icon:"plus", title:"新建简历", sub:"按经历分条填写，带数字更有说服力",
    text:"新建 添加 简历", act:()=>openResumeForm(null) });
  out.push({ kind:"操作", icon:"plus", title:"新建待办", sub:"把复盘建议落成下一步动作",
    text:"新建 添加 待办 任务", act:()=>openEditor("todo", null) });
  out.push({ kind:"操作", icon:"plus", title:"新建笔记", sub:"面试复盘 · 话术卡 · 公司研究",
    text:"新建 添加 笔记", act:()=>openEditor("note", null) });
  return out;
}

function cmdkSearch(q){
  const kw=String(q||"").trim().toLowerCase();
  const items=cmdkItems();
  if(!kw){
    return items.filter(x=>x.kind==="页面").slice(0,6)
      .concat(items.filter(x=>x.kind==="岗位").slice(0,3));
  }
  const hit=[];
  items.forEach(it=>{
    /* 主关键词（名称 / 公司 / 目标岗位）优先命中，正文与副标题兜底 */
    const key=String(it.keys||it.title||"").toLowerCase();
    const title=String(it.title||"").toLowerCase();
    let s=0;
    if(title===kw) s=100;
    else if(key.startsWith(kw)) s=90;
    else if(title.startsWith(kw)) s=80;
    else if(key.includes(kw)) s=70;
    else if(title.includes(kw)) s=60;
    else if(String(it.text||"").toLowerCase().includes(kw)) s=30;
    else if(String(it.sub||"").toLowerCase().includes(kw)) s=20;
    if(s) hit.push({it,s});
  });
  hit.sort((a,b)=>b.s-a.s);
  return hit.slice(0,CMDK_MAX).map(x=>x.it);
}

function openCommandPalette(){
  const open=document.querySelector(".cmdk");
  if(open){ const i=document.querySelector("#cmdk-input"); if(i){ i.focus(); i.select(); } return; }
  const ov=openModal(`
    <h3>全局搜索</h3>
    <div class="sub">找岗位、简历、待办和笔记，或直接跳到某个页面</div>
    <div class="cmdk">
      <div class="cmdk-top">${icon("search",16,2.2)}
        <input id="cmdk-input" type="search" placeholder="搜索岗位 / 简历 / 待办 / 页面…" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" aria-label="搜索岗位、简历、待办和页面"/>
      </div>
      <div class="cmdk-list" id="cmdk-list" role="listbox" aria-label="搜索结果"></div>
      <div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>Enter</kbd> 打开</span><span><kbd>Esc</kbd> 关闭</span></div>
    </div>`, true);
  const input=ov.querySelector("#cmdk-input"), list=ov.querySelector("#cmdk-list");
  let rows=[], cur=0;

  const mark=()=>{
    list.querySelectorAll(".cmdk-row").forEach((el,i)=>{
      const on=i===cur;
      el.classList.toggle("sel", on);
      el.setAttribute("aria-selected", on?"true":"false");
      if(on){
        const lr=list.getBoundingClientRect(), rr=el.getBoundingClientRect();
        if(rr.top<lr.top) list.scrollTop -= (lr.top-rr.top)+4;
        else if(rr.bottom>lr.bottom) list.scrollTop += (rr.bottom-lr.bottom)+4;
      }
    });
    input.setAttribute("aria-activedescendant", rows.length?("cmdk-opt-"+cur):"");
  };

  const paint=()=>{
    rows=cmdkSearch(input.value);
    cur=0;
    list.innerHTML = rows.length ? rows.map((r,i)=>`
      <button type="button" class="cmdk-row${i===cur?" sel":""}" role="option" id="cmdk-opt-${i}"
        aria-selected="${i===cur}" data-i="${i}">
        <span class="cmdk-ico">${icon(r.icon,17)}</span>
        <span class="cmdk-main"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span>
        <span class="cmdk-kind">${esc(r.kind)}</span>
      </button>`).join("")
      : `<div class="cmdk-empty">没有找到「${esc(input.value.trim())}」<br><span>换个关键词，或直接搜页面名称（如「看板」）</span></div>`;
    mark();
  };

  const run=i=>{
    const r=rows[i]; if(!r) return;
    ov.remove();
    try{ r.act(); }catch(err){ toast("打开失败，请重试"); }
  };

  input.oninput=paint;
  input.onkeydown=e=>{
    if(e.key==="ArrowDown"){ e.preventDefault(); if(rows.length){ cur=(cur+1)%rows.length; mark(); } }
    else if(e.key==="ArrowUp"){ e.preventDefault(); if(rows.length){ cur=(cur-1+rows.length)%rows.length; mark(); } }
    else if(e.key==="Enter"){ e.preventDefault(); run(cur); }
  };
  list.addEventListener("mousemove", ev=>{
    const b=ev.target.closest(".cmdk-row"); if(!b) return;
    const i=+b.dataset.i; if(i!==cur){ cur=i; mark(); }
  });
  list.addEventListener("click", ev=>{
    const b=ev.target.closest(".cmdk-row"); if(b) run(+b.dataset.i);
  });
  paint();
}

/* Ctrl/⌘ + K 随时呼出；面板已开时聚焦搜索框 */
document.addEventListener("keydown", e=>{
  const k=String(e.key||"").toLowerCase();
  if((e.ctrlKey||e.metaKey) && !e.altKey && k==="k"){ e.preventDefault(); openCommandPalette(); }
});

/* ---------- 技能词典 ---------- */
const SKILL_LEXICON = [
  ["SQL",["sql","mysql","postgresql","postgres","clickhouse","presto","hive sql","spark sql"]],
  ["Python",["python","pandas","numpy","pyspark"]],
  ["Excel",["excel","vba","数据透视"]],
  ["数据分析",["数据分析","数据洞察","经营分析","商业分析","业务分析"]],
  ["指标体系",["指标体系","指标口径","北极星指标","数据体系"]],
  ["A/B 测试",["a/b","ab test","ab实验","a/b实验","实验设计","显著性检验","假设检验"]],
  ["数据可视化",["数据可视化","可视化","看板","dashboard","报表"]],
  ["Tableau",["tableau"]],
  ["Power BI",["power bi","powerbi"]],
  ["Hive",["hive"]],
  ["ClickHouse",["clickhouse"]],
  ["Spark",["spark","pyspark"]],
  ["机器学习",["机器学习","算法模型","xgboost","lightgbm","建模"]],
  ["用户增长",["用户增长","增长分析","拉新","留存","转化率","复购"]],
  ["电商",["电商","交易域","gmv","订单","大促"]],
  ["内容平台",["内容平台","内容生态","推荐系统","短视频","内容消费"]],
  ["数据治理",["数据治理","数据质量","元数据","数据资产"]],
  ["项目管理",["项目管理","跨部门","协同","推动落地","统筹"]],
  ["沟通表达",["沟通","表达","汇报","演讲","讲故事"]],
  ["产品思维",["产品思维","需求分析","用户研究","产品设计"]],
  ["Java",["java","spring","springboot"]],
  ["Go",["golang","go 语言"]],
  ["前端",["前端","react","vue","javascript","typescript","css"]],
  ["后端",["后端","服务端","微服务","高并发","分布式"]],
  ["云原生",["云原生","kubernetes","k8s","docker","devops"]],
  ["运营",["运营","活动运营","用户运营","内容运营"]],
  ["市场",["市场","品牌","投放","增长黑客","营销"]],
  ["财务",["财务","会计","报表合并","预算","审计"]],
  ["英语",["英语","english","六级","雅思","托福"]],
  ["证书",["证书","cpa","cfa","pmp","软考","执业资格"]],
];
function canonSkill(s){
  const raw=String(s||"").trim(); if(!raw) return "";
  const low=raw.toLowerCase();
  for(const [name,alias] of SKILL_LEXICON){
    if(name.toLowerCase()===low) return name;
    if(alias.some(a=>a===low||low.includes(a))) return name;
  }
  return raw;
}
function extractSkills(text){
  const low=String(text||"").toLowerCase(); const out=[];
  SKILL_LEXICON.forEach(([name,alias])=>{
    if(alias.some(a=>low.includes(a))) out.push(name);
  });
  return [...new Set(out)];
}
function skillSetOf(res){
  if(!res) return new Set();
  const raw=[].concat(res.skills||[]);
  (res.experience||[]).forEach(e=>(e.bullets||[]).forEach(b=>raw.push(b)));
  (res.projects||[]).forEach(p=>{ raw.push(p.name||"",p.stack||"",p.star?.a||"",p.star?.r||""); });
  raw.push(res.summary||"",res.education||"");
  const set=new Set();
  raw.forEach(x=>{ if(!x) return; extractSkills(x).forEach(s=>set.add(s)); canonSkill(x) && !/[，。；]/.test(x) && set.add(canonSkill(x)); });
  (res.skills||[]).forEach(s=>set.add(canonSkill(s)));
  return set;
}

/* ---------- 简历 / 岗位种子 ---------- */
function demoResume(){
  return {
    id:"r-demo", name:"张一鸣", target:"高级数据分析师", years:5,
    contact:"138****0000 · zhang@example.com · 上海",
    summary:"5 年互联网数据分析经验，覆盖电商与内容两条业务线；擅长用 SQL 与 Python 把模糊问题拆成可验证的指标，主导过 3 次影响千万级 GMV 的策略迭代。",
    skills:["SQL","Python","Pandas","A/B 测试","指标体系","数据可视化","Hive","Tableau"],
    experience:[
      {company:"橙果电商",role:"高级数据分析师",period:"2022.03 - 至今",bullets:[
        "负责交易域指标体系搭建，覆盖 12 个核心指标，日报表服务 6 个业务团队；",
        "通过漏斗分析定位下单转化流失，推动结算页改版，转化率提升 8.6%，年化 GMV 增加 2300 万；",
        "主导 14 次 A/B 实验设计与复盘，沉淀实验准入与判读规范，实验返工率下降 40%。"
      ]},
      {company:"青柚内容",role:"数据分析师",period:"2020.07 - 2022.02",bullets:[
        "搭建内容消费看板，用 SQL 每日更新 30+ 指标，替代原有人工周报；",
        "完成用户分层模型，识别高潜用户 12 万，配合运营策略使 7 日留存提升 5.2%。"
      ]}
    ],
    projects:[
      {name:"大促实时作战看板",role:"数据负责人",stack:"Hive · ClickHouse · Tableau",
       star:{s:"2023 年双十一前，运营需要每小时盯库存与转化，原报表 T+1 无法支撑。",
             t:"我负责指标口径、实时链路与看板落地，协调数据平台与前端共 4 人。",
             a:"先统一 8 个核心口径，再用 ClickHouse 物化视图把查询压到 3 秒内，最后按业务场景重排看板。",
             r:"大促期间 200+ 人使用，异常发现时间从 4 小时缩短到 20 分钟，当天挽回预估 300 万销售额。"}},
      {name:"新客首单转化提升",role:"分析负责人",stack:"SQL · Python · A/B 测试",
       star:{s:"新客首单转化连续两个季度低于行业均值。",t:"我负责归因分析与实验设计。",
             a:"拆解 5 段漏斗并做用户分群，发现优惠感知弱是主因，设计 3 组权益文案实验。",
             r:"最优组转化提升 11.3%，全量后月新增首单 1.4 万。"}}
    ],
    education:"华东师范大学 · 统计学 · 本科 · 2016 - 2020",
    raw:"", createdAt:nowISO()
  };
}
function demoJob(){
  return {
    id:"j-demo", title:"高级数据分析师", company:"星野科技", location:"上海 · 徐汇",
    salary:"25-40K · 15薪", channel:"内推", deadline:"", status:"面试中",
    jd:`岗位职责：
1. 负责核心业务的数据指标体系搭建，输出日/周/月度经营分析报告；
2. 通过 SQL 与数据看板定位业务问题，推动产品与运营策略迭代；
3. 设计并评估 A/B 实验，沉淀实验方法论；
4. 与产品、运营、研发协作，把分析结论落成可执行动作。

任职要求：
1. 本科及以上学历，统计学、数学、计算机相关专业，3 年以上数据分析经验；
2. 精通 SQL，熟悉 Hive / ClickHouse 等数据仓库，能独立完成取数与建模；
3. 熟练使用 Python 进行数据处理，掌握 Pandas、NumPy；
4. 具备 A/B 实验设计与统计分析能力，理解显著性检验；
5. 有较强的业务理解力与跨部门沟通能力，能把数据讲成故事。

加分项：
1. 有电商或内容平台增长分析经验优先；
2. 熟悉 Tableau / Power BI 等 BI 工具；
3. 有指标体系从 0 到 1 搭建经验者优先。`,
    createdAt:nowISO()
  };
}

/* ---------- JD 结构化解析 ---------- */
function parseJD(jd){
  const text=String(jd||"").replace(/\r/g,"");
  const lines=text.split("\n").map(s=>s.trim()).filter(Boolean);
  const HEAD=[
    {key:"duty",re:/(岗位职责|工作职责|职位描述|工作内容|你将负责|职责描述|主要职责|你将要做)/},
    {key:"nice",re:/(加分项|加分|优先条件|bonus)/},
    {key:"req",re:/(任职要求|岗位要求|任职资格|我们期待|你需要|职位要求|能力要求|任职条件)/},
    {key:"other",re:/(公司介绍|团队介绍|关于我们|福利|薪酬|工作地点|汇报对象)/}
  ];
  const buckets={duty:[],req:[],nice:[],other:[]};
  let cur="other";
  lines.forEach(raw=>{
    const line=raw.replace(/^[\d一二三四五六七八九十]+[.、)．]\s*/,"").replace(/^[-•·*]\s*/,"").trim();
    if(!line) return;
    const h=HEAD.find(x=>x.re.test(line) && line.length<=22 && !/[。；;]$/.test(line));
    if(h && /[:：]?$/.test(line)){ cur=h.key; return; }
    if(line.length<=6 && /[:：]$/.test(line)) return;
    buckets[cur].push(line);
  });
  // 无小标题时的兜底：含“要求/熟悉/精通/掌握”的行归为要求
  if(!buckets.req.length){
    buckets.other.slice().forEach(l=>{ if(/(熟悉|精通|掌握|具备|年以上|学历|优先|负责)/.test(l)){
      buckets.req.push(l); buckets.other=buckets.other.filter(x=>x!==l); } });
  }
  const dedupe=arr=>[...new Set(arr.map(s=>s.replace(/[。；;]\s*$/,"")))];
  const must=dedupe(buckets.req).filter(t=>!/优先|加分|更佳|者优先/.test(t));
  const nice=dedupe(buckets.req.concat(buckets.nice)).filter(t=>/优先|加分|更佳|者优先/.test(t));
  const duties=dedupe(buckets.duty);
  const years=(text.match(/(\d+)\s*年(?:以上|及以上|\+)?(?:的)?(?:相关工作)?经验/)||[])[1];
  const degree=(text.match(/博士|硕士|本科|大专/)||[""])[0];
  const skills=extractSkills(text);
  return {duties,must,nice,skills,years:years?+years:null,degree,parsedAt:nowISO()};
}

/* ---------- 文本相似（二元组覆盖） ---------- */
function bigrams(s){
  const t=String(s||"").replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g,"").toLowerCase();
  const set=new Set();
  for(let i=0;i<t.length-1;i++){ const g=t.slice(i,i+2); if(!/^\d+$/.test(g)) set.add(g); }
  return set;
}
function overlap(text, gramSet){
  const g=bigrams(text); if(!g.size||!gramSet.size) return 0;
  let hit=0; g.forEach(x=>{ if(gramSet.has(x)) hit++; });
  return hit/g.size;
}
function resumeText(r){
  if(!r) return "";
  const parts=[r.name,r.target,r.summary,r.education,r.contact,...(r.skills||[])];
  (r.experience||[]).forEach(e=>{ parts.push(e.company,e.role,e.period,...(e.bullets||[])); });
  (r.projects||[]).forEach(p=>{ parts.push(p.name,p.role,p.stack,p.star?.s,p.star?.t,p.star?.a,p.star?.r); });
  return parts.filter(Boolean).join(" ");
}
function resYears(r){
  if(!r) return 0;
  let total=0, ok=false;
  (r.experience||[]).forEach(e=>{
    const m=String(e.period||"").match(/(\d{4})[.\-/年]?\s*(\d{1,2})?[^\d]*[-–—~至]\s*(?:(\d{4})[.\-/年]?\s*(\d{1,2})?|至今|现在|present)/i);
    if(!m) return;
    const start=new Date(+m[1], (+m[2]||1)-1, 1);
    const end=/至今|现在|present/i.test(e.period)? new Date() : new Date(+m[3], (+m[4]||1)-1, 1);
    const y=(end-start)/(365*86400000);
    if(y>0&&y<40){ total+=y; ok=true; }
  });
  return ok? Math.round(total*10)/10 : (+r.years||0);
}

/* ---------- 匹配引擎 ---------- */
function itemHit(it, res, rtext, rgrams, skills){
  const t=it.text;
  if(/博士/.test(t)) return /博士/.test(rtext)?1:0;
  if(/硕士/.test(t)) return /硕士|博士/.test(rtext)?1:0;
  if(/本科/.test(t)) return /本科|硕士|博士/.test(rtext)?1:0;
  const ym=t.match(/(\d+)\s*年(?:以上|及以上)?/);
  if(ym && /(经验|以上|工作)/.test(t)){
    const need=+ym[1], y=resYears(res);
    return need? clamp(y/need,0,1) : 1;
  }
  const sk=it.skills;
  if(sk.length){
    const sHit=sk.filter(s=>skills.has(s)).length/sk.length;
    const tHit=overlap(t,rgrams);
    if(sHit>=0.5) return 1;
    if(sHit>0) return Math.max(0.66, tHit);
    return tHit>=0.45?0.8:Math.max(tHit, tHit>=0.28?0.3:0);
  }
  const h=overlap(t,rgrams);
  return h>=0.45?1:(h>=0.30?0.55:0);
}
function runMatch(jobId, resumeId){
  const job=getJob(jobId), res=getResume(resumeId);
  if(!job||!res) return null;
  const parsed=job.parsed||parseJD(job.jd);
  const rtext=resumeText(res), rgrams=bigrams(rtext), skills=skillSetOf(res);
  const rows=[];
  (parsed.must||[]).forEach(t=>rows.push({text:t,weight:3,kind:"must",skills:extractSkills(t)}));
  (parsed.nice||[]).forEach(t=>rows.push({text:t,weight:1,kind:"nice",skills:extractSkills(t)}));
  let total=0, got=0;
  rows.forEach(it=>{ const hit=itemHit(it,res,rtext,rgrams,skills); it.hit=hit; total+=it.weight; got+=it.weight*hit; });
  const coverage=total? got/total : 0;
  const yReq=parsed.years||0, yOwn=resYears(res);
  const expScore= yReq? clamp(yOwn/Math.max(1,yReq),0,1) : 1;
  const bullets=allBullets(res);
  const quantScore=Math.min(1, bullets.filter(b=>/\d/.test(b)).length/3);
  const hardRows=rows.filter(it=>it.hit<0.5 && /(本科|硕士|博士|学历|证书|年以上|年经验|专业)/.test(it.text));
  const hardMiss=hardRows.length;
  let score=Math.round(coverage*70 + expScore*15 + quantScore*15);
  if(hardMiss) score=Math.min(score,59);
  const missing=rows.filter(it=>it.kind==="must" && it.hit<0.5).sort((a,b)=>b.weight-a.weight);
  return {jobId, resumeId, score:clamp(score,0,100), coverage, expScore, quantScore,
    rows, missing, hardMiss, yReq, yOwn, parsed, ats:atsCheck(job,res,parsed), at:nowISO()};
}
function allBullets(res){
  const out=[];
  (res.experience||[]).forEach(e=>(e.bullets||[]).forEach(b=>out.push(b)));
  (res.projects||[]).forEach(p=>{ if(p.star?.a) out.push(p.star.a); if(p.star?.r) out.push(p.star.r); });
  return out.filter(Boolean);
}

/* ---------- ATS 体检 ---------- */
function atsCheck(job,res,parsed){
  const rtext=resumeText(res), skills=skillSetOf(res), bullets=allBullets(res);
  const mustSkills=[...new Set((parsed.must||[]).flatMap(extractSkills))];
  const covered=mustSkills.filter(s=>skills.has(s));
  const coverPct=mustSkills.length? covered.length/mustSkills.length : 1;
  const withNum=bullets.filter(b=>/\d/.test(b)).length;
  const verbRe=/^(负责|主导|搭建|设计|推动|优化|落地|实现|分析|建立|重构|带领|协调|输出|提升|降低|完成|参与|制定|沉淀|监控|支持|对接|管理|开发|撰写|独立|牵头|推动)/;
  const verbOk=bullets.length? bullets.filter(b=>verbRe.test(b.trim())).length/bullets.length : 0;
  const words=rtext.replace(/\s/g,"").length;
  const contactOk=/[\w.+-]+@[\w-]+\.[\w.]+|1[3-9]\d{9}/.test(res.contact||"")||/1[3-9]\d{9}/.test(rtext);
  const fmtOk=!/\t{2,}|\|{2,}|【表格】/.test(rtext);
  return [
    {key:"kw",name:"关键词覆盖",pass:coverPct>=0.6,value:Math.round(coverPct*100)+"%",
     detail:`岗位硬性技能 ${mustSkills.length} 项，命中 ${covered.length} 项`,
     advice:coverPct>=0.6?"关键词已覆盖主流筛选条件。":"优先把缺失技能写进最近一段经历的动作里，而不是堆在技能栏。"},
    {key:"quant",name:"量化成果",pass:withNum>=3,value:withNum+" 条",
     detail:"招聘方与 ATS 都偏好带数字的成果句",
     advice:withNum>=3?"量化密度达标。":"至少补 3 条含数字的成果（比例、金额、人数、时长）。"},
    {key:"verb",name:"动词开头",pass:verbOk>=0.7,value:Math.round(verbOk*100)+"%",
     detail:"每条经历以行为动词开头，可读性更高",
     advice:verbOk>=0.7?"表述动作清晰。":"把“参与了/负责了一些”改成“主导/搭建/推动”等强动词。"},
    {key:"len",name:"篇幅密度",pass:words>=500&&words<=1800,value:words+" 字",
     detail:"一页简历建议 600–1400 字",
     advice:(words>=500&&words<=1800)?"篇幅在合理区间。":(words<500?"内容偏薄，补充与岗位相关的项目细节。":"内容偏长，删掉与目标岗位无关的经历。")},
    {key:"contact",name:"基本信息",pass:contactOk,value:contactOk?"已填":"缺失",
     detail:"手机号或邮箱缺失会导致无法联系",
     advice:contactOk?"联系方式完整。":"补上手机号与邮箱，放在页首。"},
    {key:"fmt",name:"可解析格式",pass:fmtOk,value:fmtOk?"正常":"有风险",
     detail:"避免表格、分栏、文本框，ATS 可能读不出来",
     advice:fmtOk?"纯文本结构，ATS 可正常解析。":"改为单列纯文本，去掉表格与文本框。"}
  ];
}

/* ---------- 改写建议 ---------- */
function buildSuggestions(match, job, res){
  const out=[];
  const mustSkills=(match.parsed.must||[]).flatMap(extractSkills);
  const top=[...new Set(mustSkills)].slice(0,3);
  const target=job.title;
  out.push({id:uid("sg"), kind:"summary", label:"个人定位句",
    before:res.summary||"（暂无个人简介）",
    after:`${resYears(res)} 年${target}相关经验；核心能力是${top.join("、")||"业务分析"}，最近一段经历中${bestResult(res)||"【补充：一个最硬的成果】"}。求职方向明确为${target}。`,
    needsEvidence:!bestResult(res),
    reason:`首屏 6 秒决定是否继续读。把目标岗位名「${target}」和岗位最看重的 ${top.join("/")||"核心能力"} 写进第一句。`});

  const mis=(match.missing||[]).slice(0,4);
  mis.forEach(it=>{
    const sk=it.skills[0]||"";
    const cand=findBestBullet(res,it.text);
    if(cand){
      out.push({id:uid("sg"), kind:"bullet", label:`对齐「${sk||"岗位要求"}」`,
        before:cand.text,
        after:tuneBullet(cand.text, sk, it.text),
        needsEvidence:false,
        reason:`这条要求未被覆盖。原文有相近事实，只需要把「${sk||"关键动作"}」和结果前置，不改事实。`});
    } else {
      out.push({id:uid("sg"), kind:"new", label:`新增一条「${sk||"相关经历"}」`,
        before:"（无对应经历）",
        after:`在【项目/场景】中，使用 ${sk||"【工具】"} 完成【具体任务】，使【指标】从【X】提升到【Y】（【时间范围】）。`,
        needsEvidence:true,
        reason:`岗位硬性要求「${trimTo(it.text,28)}」在简历中没有证据。不要编造，先用真实项目补一条，数字留空待填。`});
    }
  });
  if(res.target!==target){
    out.push({id:uid("sg"), kind:"target", label:"求职意向对齐",
      before:res.target||"（未填写）", after:target, needsEvidence:false,
      reason:"求职意向与投递岗位不一致，会被判定为海投。"});
  }
  const ordered=(res.skills||[]).slice().sort((a,b)=>{
    const A=mustSkills.includes(canonSkill(a))?0:1, B=mustSkills.includes(canonSkill(b))?0:1; return A-B;
  });
  if(ordered.join("|")!==(res.skills||[]).join("|")){
    out.push({id:uid("sg"), kind:"skills", label:"技能排序",
      before:(res.skills||[]).join(" · "), after:ordered.join(" · "), needsEvidence:false,
      reason:"把岗位要求的技能排在最前，HR 扫读时优先看到匹配项。"});
  }
  out.forEach((s,i)=>{ s.id=`sg-${i}-${s.kind}`; });
  return out;
}
function trimTo(s,n){ s=String(s||""); return s.length>n? s.slice(0,n)+"…" : s; }
function bestResult(res){
  const b=allBullets(res).filter(x=>/\d/.test(x)).sort((a,c)=>c.length-a.length)[0];
  return b? trimTo(b.replace(/[；。]$/,""), 46) : "";
}
function findBestBullet(res, reqText){
  const g=bigrams(reqText); let best=null, bs=0;
  (res.experience||[]).forEach(e=>(e.bullets||[]).forEach(b=>{
    const s=overlap(b,g); if(s>bs){ bs=s; best={text:b, company:e.company, role:e.role, period:e.period}; }
  }));
  return bs>=0.16? best : null;
}
function tuneBullet(text, skill, reqText){
  let t=String(text||"").replace(/[；。]$/,"");
  if(skill && !t.toLowerCase().includes(skill.toLowerCase())) t=`使用 ${skill}，${t}`;
  if(!/\d/.test(t)) t+=`，【补充：量化结果，如提升 X% / 覆盖 X 人】`;
  return t+"。";
}
function applySuggestions(list){
  const src=activeResume(); const job=activeJob(); if(!src) return null;
  const acc=(list||[]).filter(s=>s.accepted);
  if(!acc.length){ toast("先勾选要采纳的建议"); return null; }
  const next=structuredClone(src);
  next.id=uid("r"); next.parentId=src.id; next.createdAt=nowISO();
  next.name=`${src.name} · ${job?job.company+"定制版":"定制版"}`;
  acc.forEach(s=>{
    if(s.kind==="summary") next.summary=s.after;
    else if(s.kind==="target") next.target=s.after;
    else if(s.kind==="skills") next.skills=(s.after||"").split(" · ").filter(Boolean);
    else if(s.kind==="bullet"){
      (next.experience||[]).forEach(e=>{
        const i=(e.bullets||[]).indexOf(s.before);
        if(i>=0) e.bullets[i]=s.after;
      });
    } else if(s.kind==="new"){
      if(!next.experience?.length) next.experience=[{company:"",role:"",period:"",bullets:[]}];
      next.experience[0].bullets=(next.experience[0].bullets||[]).concat(s.after);
    }
  });
  data.resumes.unshift(next); data.activeResumeId=next.id; store.save();
  return next;
}

/* ---------- 一键改写：按岗位整体优化简历 ---------- */
function rwReqSkills(m){
  const p=(m&&m.parsed)||{};
  return {
    must:[...new Set((p.must||[]).flatMap(extractSkills))],
    nice:[...new Set((p.nice||[]).flatMap(extractSkills))]
  };
}
function rwReorderSkills(res,m){
  const {must,nice}=rwReqSkills(m);
  return (res.skills||[]).map((s,i)=>{
    const c=canonSkill(s);
    const r=must.includes(c)?0:(nice.includes(c)?1:2);
    return {s,i,r};
  }).sort((a,b)=>a.r-b.r||a.i-b.i).map(x=>x.s);
}
function rwMatchedSkills(res,m){
  const {must,nice}=rwReqSkills(m);
  const own=(res.skills||[]).map(canonSkill);
  const out=[];
  must.concat(nice).forEach(s=>{ if(own.includes(s)&&!out.includes(s)) out.push(s); });
  return out;
}
function rwTidyBullet(s){
  let t=String(s||"").replace(/\s+/g," ").trim();
  if(!t) return "";
  t=t.replace(/[；;，,、]+$/,"").replace(/。+$/,"");
  return t+"。";
}
function rwProjectScore(p,m){
  const p2=(m&&m.parsed)||{};
  const req=[].concat(p2.must||[],p2.nice||[],p2.duties||[]).join("\n");
  const text=[p.name,p.role,p.stack,p.star?.s,p.star?.t,p.star?.a,p.star?.r].filter(Boolean).join(" ");
  const base=overlap(text,bigrams(req))*100;
  const hit=extractSkills(text).filter(s=>rwReqSkills(m).must.includes(s)).length;
  return base+hit*6;
}
function rwBestResult(res){
  const exp=[], pj=[];
  (res.experience||[]).forEach(e=>(e.bullets||[]).forEach(b=>{ if(/\d/.test(b)) exp.push(b); }));
  (res.projects||[]).forEach(p=>{ if(p.star?.r&&/\d/.test(p.star.r)) pj.push(p.star.r); });
  const pool=exp.length?exp:(pj.length?pj:[]);
  if(!pool.length) return "";
  const rank=s=>/(提升|下降|缩短|增加|减少|达成|节省|挽回|转化|增长)/.test(s)?0:1;
  const best=pool.slice().sort((a,b)=>rank(a)-rank(b)||a.length-b.length)[0];
  let t=String(best).replace(/[；。]$/,"").replace(/\s+/g," ").trim();
  if(t.length>56){
    const cut=t.slice(0,56);
    const i=Math.max(cut.lastIndexOf("，"),cut.lastIndexOf("、"),cut.lastIndexOf("；"));
    t=i>=16?cut.slice(0,i):cut;
  }
  return t;
}
function rwSummary(res,m,job){
  const yr=resYears(res);
  const y=yr>=1?Math.round(yr):0;
  const hit=rwMatchedSkills(res,m).slice(0,3);
  const sk=hit.length?hit:(res.skills||[]).slice(0,3);
  const br=rwBestResult(res);
  const parts=[];
  if(y) parts.push(`${y} 年工作经验`);
  if(sk.length) parts.push(`核心能力是${sk.join("、")}`);
  if(br) parts.push(`代表成果：${br}`);
  parts.push(`求职方向明确为${job.title}`);
  return parts.join("；")+"。";
}
function rewriteResumeLocal(res,m,job){
  const next=structuredClone(res);
  next.target=job.title||next.target;
  next.summary=rwSummary(res,m,job);
  next.skills=rwReorderSkills(res,m);
  next.projects=(res.projects||[]).map((p,i)=>({p,i,s:rwProjectScore(p,m)}))
    .sort((a,b)=>b.s-a.s||a.i-b.i).map(x=>x.p);
  next.experience=(res.experience||[]).map(e=>({...e,bullets:(e.bullets||[]).map(rwTidyBullet).filter(Boolean)}));
  return next;
}
function rwDiff(a,b){
  const out=[];
  const push=(field,x,y)=>{ if(String(x||"")!==String(y||"")) out.push({field,before:x||"（空）",after:y||"（空）"}); };
  push("求职意向",a.target,b.target);
  push("个人简介",a.summary,b.summary);
  push("核心技能",(a.skills||[]).join(" · "),(b.skills||[]).join(" · "));
  push("项目排序",(a.projects||[]).map(p=>p.name).join(" → "),(b.projects||[]).map(p=>p.name).join(" → "));
  (b.experience||[]).forEach((e,i)=>{
    const old=(a.experience||[])[i]||{};
    (e.bullets||[]).forEach((x,j)=>{
      const y=(old.bullets||[])[j];
      if(y!==undefined&&String(x)!==String(y)) out.push({field:`工作经历 ${i+1} · ${e.company||e.role||""} 第 ${j+1} 条`,before:y,after:x});
    });
  });
  return out;
}
function rwNumbers(s){ return (String(s||"").match(/\d+(?:\.\d+)?/g)||[]); }
function rwNewNumbers(oldText,newText){
  const set=new Set(rwNumbers(oldText));
  return rwNumbers(newText).filter(x=>!set.has(x));
}
function rwMergeAI(base,obj,res){
  const next=structuredClone(base);
  const note=[]; let used=false;
  if(obj&&typeof obj.summary==="string"){
    const s=String(obj.summary).replace(/\s+/g," ").trim().replace(/^[“"'「]+|[”"'」]+$/g,"");
    if(s.length>=20&&s.length<=240){ next.summary=s; used=true; }
    else if(s) note.push("AI 简介长度不合规，保留本地改写");
  }
  if(obj&&Array.isArray(obj.skills)&&(res.skills||[]).length){
    const exact=new Set(res.skills||[]);
    const byCanon=new Map();
    (res.skills||[]).forEach(s=>{ const c=canonSkill(s); if(!byCanon.has(c)) byCanon.set(c,s); });
    const picked=[];
    obj.skills.forEach(s=>{
      const raw=String(s||"").trim();
      if(!raw) return;
      const orig=exact.has(raw)?raw:byCanon.get(canonSkill(raw));
      if(orig&&!picked.includes(orig)) picked.push(orig);
    });
    if(picked.length&&picked.length<=(res.skills||[]).length){
      const rest=(res.skills||[]).filter(s=>!picked.includes(s));
      next.skills=picked.concat(rest); used=true;
    } else if(picked.length) note.push("AI 技能列表超出原有技能，已忽略");
  }
  if(obj&&Array.isArray(obj.experience)){
    let bad=0;
    obj.experience.forEach(it=>{
      const i=+it.index;
      if(!(i>=0&&i<(next.experience||[]).length)) return;
      const old=((res.experience||[])[i]||{}).bullets||[];
      const got=(it.bullets||[]).map(x=>rwTidyBullet(String(x||""))).filter(Boolean);
      if(got.length!==old.length){ bad++; return; }
      const safe=got.map((x,j)=>rwNewNumbers(old[j],x).length?null:x);
      if(safe.some(x=>x===null)){ bad++; return; }
      next.experience[i].bullets=safe; used=true;
    });
    if(bad) note.push(`${bad} 段经历因条数或数字与原文不一致，已保留原句`);
  }
  return {resume:next,note,used};
}
function rwName(src,job){
  const base=String(src.name||"简历").split(" · ")[0].trim()||"简历";
  const tag=(job&&(job.company||job.title))||"定制";
  let name=`${base} · ${tag}定制版`;
  const used=new Set((data.resumes||[]).map(r=>r.name));
  if(used.has(name)){ let i=2; while(used.has(`${name} ${i}`)) i++; name=`${name} ${i}`; }
  return name;
}
async function aiRewriteResume(res,m,job){
  const def=PROMPTS.resume_rewrite;
  const txt=await aiChat([
    {role:"system",content:"你是严谨的简历改写顾问，只输出 JSON，不要解释。"},
    {role:"user",content:def.build({job,res,match:m})}
  ],{json:true});
  const obj=parseJSON(txt);
  if(!obj) throw new Error("返回内容不是合法 JSON");
  return obj;
}
function openRewriteResult(o){
  const {src,next,before,after,diff,ai}=o;
  const s1=before?before.score:"—", s2=after?after.score:"—";
  const delta=(after?after.score:0)-(before?before.score:0);
  const gaps=(before&&before.missing||[]).slice(0,4);
  const notes=[];
  if(ai.err) notes.push(`AI 调用失败（${ai.err}），已用本地规则完成`);
  else if(ai.note&&ai.note.length) notes.push(...ai.note);
  else if(!ai.ready) notes.push("未配置 API：本次只调整定位句、技能顺序与项目排序，经历句保持原样；配好 API 后会连经历句一起改写");
  const ov=openModal(`<h3>一键改写完成 <span class="badge ${ai.used?"ok":"demo"}">${ai.used?"AI 增强":"本地规则"}</span></h3>
    <div class="sub">已生成「${esc(next.name)}」并设为当前简历；原简历「${esc(src.name)}」保留在简历库，可随时切回。</div>
    <div class="flex mt12" style="gap:10px;align-items:center;flex-wrap:wrap">
      <span class="badge ${delta>=0?"ok":"warn"}">匹配分 ${s1} → ${s2}${delta?`（${delta>0?"+":""}${delta}）`:""}</span>
      <span class="tiny">要求覆盖 ${before?Math.round(before.coverage*100):0}% → ${after?Math.round(after.coverage*100):0}%</span>
    </div>
    ${notes.length?`<div class="alert info mt12">${notes.map(esc).join("<br>")}</div>`:""}
    <div class="field mt18"><label>本次改了 ${diff.length} 处</label>
      ${diff.map(d=>`<div class="diff-row">
        <div class="diff-meta"><b>${esc(d.field)}</b></div>
        <div class="diff-cell"><div class="tiny">改前</div>${esc(d.before)}</div>
        <div class="diff-cell after"><div class="tiny">改后</div>${esc(d.after)}</div>
      </div>`).join("")}
    </div>
    <div class="field"><label>没有写进简历的缺口（需你补真实证据）</label>
      ${gaps.length?gaps.map(g=>`<div class="cov-row">
        <span class="dot-pass" style="background:var(--danger)"></span>
        <div class="cv">${esc(g.text)}<div class="tiny">岗位要求里有，但你的简历没有对应事实</div></div></div>`).join("")
        :'<div class="tiny">没有硬性缺口，这份版本可以直接投。</div>'}
      <div class="tiny mt8">一键改写只重组已有事实，不会替你编造公司、项目或数字；这些缺口补齐后再点一次即可。</div>
    </div>
    <div class="modal-actions"><div class="spacer"></div>
      <button class="btn ghost" id="rw-close">留在匹配分析</button>
      <button class="btn" id="rw-view">查看定制版</button></div>`, true);
  ov.querySelector("#rw-close").onclick=()=>ov.remove();
  ov.querySelector("#rw-view").onclick=()=>{ ov.remove(); openResumeDetail(next.id); };
}
async function runOneClickRewrite(m,job,res){
  let next=rewriteResumeLocal(res,m,job);
  const ai={ready:aiReady(),used:false,note:[],err:""};
  if(ai.ready){
    try{
      const obj=await aiRewriteResume(res,m,job);
      const r=rwMergeAI(next,obj,res);
      next=r.resume; ai.note=r.note; ai.used=r.used;
    }catch(e){ ai.err=String((e&&e.message)||e).slice(0,80); }
  }
  const diff=rwDiff(res,next);
  if(!diff.length) return null;
  next.id=uid("r"); next.parentId=res.id; next.createdAt=nowISO(); next.updatedAt=nowISO();
  next.name=rwName(res,job);
  data.resumes.unshift(next); data.activeResumeId=next.id; store.save();
  const after=runMatch(job.id,next.id);
  openRewriteResult({src:res,next,before:m,after,diff,ai});
  render();
  return next;
}

/* ---------- 下一步建议 ---------- */
function nextAction(job,res,m){
  if(!job) return {icon:"briefcase",title:"先录入一个目标岗位",desc:"把 JD 原样粘进来，系统会拆出硬性要求、加分项和技能关键词。",cta:"去录入岗位",go:"jobs"};
  if(!res) return {icon:"file",title:"再录入你的简历",desc:"按经历分条填写，越具体，后面的匹配和追问越准。",cta:"去录入简历",go:"resume"};
  if(!m) return {icon:"target",title:"跑一次匹配诊断",desc:"看看岗位要求里哪些已经覆盖、哪些是硬伤。",cta:"开始诊断",go:"match"};
  if(m.hardMiss) return {icon:"alert",title:`有 ${m.hardMiss} 项硬性要求没覆盖`,desc:"硬性缺失会把匹配分直接压到 59 分以下，先用真实经历补证据，再谈润色。",cta:"查看缺口",go:"match"};
  if(m.score<75) return {icon:"spark",title:`匹配分 ${m.score}，还有明确的提升空间`,desc:"先采纳改写建议生成定制版简历，再进入模拟面试。",cta:"优化简历",go:"match"};
  if(!(data.sessions||[]).some(s=>s.jobId===job.id)) return {icon:"chat",title:"简历准备得差不多了，去练一场面试",desc:"面试官会围绕岗位要求和你的项目连续追问，练完给答辩评分。",cta:"开始模拟面试",go:"interview"};
  return {icon:"help",title:"面试前最后一步：准备反问",desc:"根据岗位和你简历里的缺口，生成 5 个能加分的反问，避免问无效问题。",cta:"生成反问清单",go:"reverse"};
}
