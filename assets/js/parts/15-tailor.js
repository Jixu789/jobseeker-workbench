/* ============================================================
   JOBSEARCH · 岗位定制闭环
   证据索引 → 四态匹配 → 逐条优化（接受/拒绝/编辑/重新生成）→ 版本
   原则：只使用简历里已有的事实；缺证据的要求先提问，不代写、不补数字。
   ============================================================ */
const TL_STATES = {
  supported:   {label:"已有证据", badge:"ok",     color:"var(--success)"},
  partial:     {label:"需补充证据", badge:"warn",  color:"var(--warning)"},
  missing:     {label:"暂无证据", badge:"danger", color:"var(--danger)"},
  hard_unclear:{label:"硬性待确认", badge:"warn", color:"var(--warning)"},
  hard_unmet:  {label:"硬性不满足", badge:"danger", color:"var(--danger)"}
};
const TL_ORDER = ["supported","partial","missing","hard_unclear","hard_unmet"];
const TL_HARD_LABEL = {degree:"学历",major:"专业",years:"年限",cert:"证书",location:"地点",availability:"到岗"};
const TL_HARD_RULES = [
  {type:"degree", re:/博士|硕士|本科|大专|专科|学历/},
  {type:"major", re:/专业/},
  {type:"years", re:/(\d+)\s*年(?:以上|及以上|\+)?[^，。；]{0,6}(?:经验|工作)/},
  {type:"cert", re:/证书|资格证|执业资格|CPA|CFA|PMP|软考|注会/i},
  {type:"location", re:/工作地点|常驻地|常驻|base\s*城市/i},
  {type:"availability", re:/全职|到岗|每周\s*\d+\s*天|实习期/}
];

function tlHash(s){
  let h=5381; const t=String(s||"");
  for(let i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))|0;
  return Math.abs(h).toString(36);
}
function tlShort(s,n){ s=String(s||""); return s.length>n? s.slice(0,n)+"…" : s; }
function tlUniq(arr){ return [...new Set(arr.filter(Boolean))]; }

/* ---------- 学历 ---------- */
const TL_DEGREE_RANK = {大专:1,专科:1,本科:2,学士:2,硕士:3,研究生:3,博士:4};
function tlDegreeOf(text){
  const t=String(text||"");
  if(/博士/.test(t)) return 4;
  if(/硕士|研究生/.test(t)) return 3;
  if(/本科|学士/.test(t)) return 2;
  if(/大专|专科/.test(t)) return 1;
  return 0;
}
function tlDegreeName(n){ return n>=4?"博士":n===3?"硕士":n===2?"本科":n===1?"大专":"未写"; }

/* ---------- 证据索引：每条证据都带来源与强度 ----------
   strong：工作成果句 / 项目行动与结果 / 任职时间（可被追问、可核实）
   medium：简介、项目背景与任务、技术栈、教育、荣誉
   weak  ：技能栏自述（只代表自我声明，不算能力证明） */
/* 全局词典没覆盖、但对岗位判定很关键的词，只在定制模块内补齐，不改全局词典 */
const TL_SKILL_PATCH = [
  ["Go", /(^|[^a-z])go(golang|lang)?([^a-z]|$)|golang/i],
  ["Kubernetes", /kubernetes|k8s/i],
  ["Redis", /redis/i],
  ["MySQL", /mysql/i]
];
function tlSkillsOf(text){
  const t=String(text||"");
  const out=extractSkills(t);
  TL_SKILL_PATCH.forEach(([n,re])=>{ if(re.test(t)&&!out.includes(n)) out.push(n); });
  return out;
}
function tailorEvidence(res){
  const out=[];
  const push=(field,label,text,strength)=>{
    const t=String(text||"").trim();
    if(!t) return;
    out.push({id:"ev-"+tlHash(field+"|"+t), field, label, text:t, strength,
      skills:tlSkillsOf(t), hasNum:/\d/.test(t)});
  };
  push("summary","个人简介",res.summary,"medium");
  (res.experience||[]).forEach((e,i)=>{
    const co=e.company||e.role||`经历 ${i+1}`;
    push(`exp:${i}:period`,`工作经历 · ${co} · 任职时间`,e.period,"strong");
    (e.bullets||[]).forEach((b,j)=>push(`exp:${i}:b:${j}`,`工作经历 · ${co} · 第 ${j+1} 条`,b,"strong"));
  });
  (res.projects||[]).forEach((p,i)=>{
    const nm=p.name||`项目 ${i+1}`;
    push(`prj:${i}:s`,`项目 · ${nm} · 背景`,p.star&&p.star.s,"medium");
    push(`prj:${i}:t`,`项目 · ${nm} · 任务`,p.star&&p.star.t,"medium");
    push(`prj:${i}:a`,`项目 · ${nm} · 行动`,p.star&&p.star.a,"strong");
    push(`prj:${i}:r`,`项目 · ${nm} · 结果`,p.star&&p.star.r,"strong");
    push(`prj:${i}:stack`,`项目 · ${nm} · 技术栈`,p.stack,"medium");
  });
  push("education","教育背景",res.education,"medium");
  push("honor","荣誉与证书",res.honor,"medium");
  push("skills","技能栏（自述）",(res.skills||[]).join(" · "),"weak");
  return out;
}
/* 软别名：只用于「间接证据」识别。
   例如简历写「协调数据平台与前端共 4 人」可以间接说明协作能力，
   但不能等同于岗位要求的「项目管理」——因此只记为 medium，永远不判 strong。 */
const TL_SOFT_ALIAS = {
  "项目管理":["协调","统筹","牵头","推进","跨团队","跨部门","排期","对接"],
  "沟通表达":["对接","协作","汇报","宣讲","评审","同步","沟通"],
  "产品思维":["需求评审","用户调研","方案设计"],
  "运营":["活动","拉新","留存"]
};
function tlSkillEvidence(req,evidence){
  return (req.skills||[]).map(sk=>{
    const direct=evidence.filter(ev=>ev.skills.includes(sk)||
      (ev.strength==="weak"&&String(ev.text||"").toLowerCase().includes(String(sk).toLowerCase())));
    const alias=TL_SOFT_ALIAS[sk]||[];
    const soft=evidence.filter(ev=>!direct.includes(ev)&&ev.strength!=="weak"&&
      alias.some(a=>String(ev.text||"").includes(a)));
    const strong=direct.filter(ev=>ev.strength==="strong");
    const medium=direct.filter(ev=>ev.strength==="medium").concat(soft);
    const weak=direct.filter(ev=>ev.strength==="weak");
    const level=strong.length?"strong":medium.length?"medium":weak.length?"weak":"none";
    return {skill:sk,level,soft:!direct.length&&!!soft.length,
      hits:(strong.length?strong:medium.length?medium:weak).slice(0,2)};
  });
}

/* ---------- 岗位要求：必需 / 优先 + 硬性类型 ---------- */
function tlHardType(text){
  const hit=TL_HARD_RULES.find(r=>r.re.test(text));
  return hit? hit.type : "";
}
function tailorRequirements(parsed){
  const out=[];
  const add=(text,kind)=>{
    const t=String(text||"").replace(/^[\d一二三四五六七八九十]+[.、)．]\s*/,"").trim();
    if(!t) return;
    out.push({id:"req-"+kind+"-"+tlHash(t), text:t, kind, index:out.length,
      skills:tlSkillsOf(t), hardType:tlHardType(t), weight:kind==="must"?3:1});
  };
  (parsed.must||[]).forEach(t=>add(t,"must"));
  (parsed.nice||[]).forEach(t=>add(t,"nice"));
  return out;
}

/* ---------- 单项判断：四态 + 理由 + 证据 + 追问 ---------- */
function tlGapQuestion(row){
  const sk=(row.skills||[]).join("、");
  switch(row.hardType){
    case "years": return "每段工作的起止时间分别是？这个岗位要求多少年经验？";
    case "degree": return "你的最高学历、学校、专业和起止时间分别是？";
    case "major": return "你的专业是什么？如果与要求不同，有哪些相关课程、论文或项目能证明？";
    case "cert": return "你有哪些证书？名称、发证机构和取得时间分别是？";
    case "location": return "你能接受的工作地点是？是否接受在该城市常驻？";
    case "availability": return "你最早可以到岗的时间是？是否接受全职、每周到岗天数要求？";
    default:
      return `你在哪段经历或项目里用过 ${sk||"这项能力"}？当时的场景、你的具体动作和可核实的结果是什么？`;
  }
}
function tlMatchReq(req,res,evidence,rgrams){
  const row={reqId:req.id,text:req.text,kind:req.kind,hardType:req.hardType,skills:req.skills,
    state:"missing",reason:"",evidence:[],needsInfo:false,question:"",blocked:false,weight:req.weight};
  const edu=String(res.education||"");
  const eduEv=evidence.filter(ev=>ev.field==="education").slice(0,1);

  if(req.hardType==="degree"){
    const need=tlDegreeOf(req.text), own=tlDegreeOf(edu);
    row.evidence=eduEv;
    if(!own){
      row.state="hard_unclear";
      row.reason="简历的教育经历没有写学历，无法确认是否满足这条硬性要求。未写不等于不满足。";
      row.needsInfo=true;
    } else if(need&&own<need){
      row.state="hard_unmet";
      row.reason=`岗位要求 ${tlDegreeName(need)}，简历写的是 ${tlDegreeName(own)}；这属于硬性条件不满足，不建议直接投递。`;
      row.needsInfo=true; row.blocked=true;
    } else {
      row.state="supported";
      row.reason=`简历教育经历为 ${tlDegreeName(own)}，满足「${tlShort(req.text,26)}」。`;
    }
  } else if(req.hardType==="years"){
    const m=req.text.match(/(\d+)\s*年/); const need=m?+m[1]:0;
    const own=resYears(res);
    const periods=(res.experience||[]).filter(e=>/\d{4}/.test(e.period||""));
    row.evidence=evidence.filter(ev=>/:period$/.test(ev.field)).slice(0,3);
    if(!periods.length){
      row.state="hard_unclear";
      row.reason=`简历没有可核对的任职起止时间，只能看到自述 ${res.years||0} 年，无法按时间核算。`;
      row.needsInfo=true;
    } else if(need&&own+0.05<need){
      row.state="hard_unmet";
      row.reason=`按任职时间核算约 ${own} 年，低于岗位要求的 ${need} 年。这是硬性缺口。`;
      row.needsInfo=true; row.blocked=true;
    } else {
      row.state="supported";
      row.reason=`按任职时间核算约 ${own} 年${need?`，满足 ${need} 年要求`:"，时间线可核对"}。`;
    }
  } else if(req.hardType==="major"){
    const words=req.text.match(/(统计学|数学|计算机|软件工程|金融|经济|会计|市场营销|新闻|传播|心理学|电子信息|自动化|法学|管理科学)/g)||[];
    row.evidence=eduEv;
    if(!edu){
      row.state="hard_unclear"; row.reason="简历没有教育经历，无法确认专业是否符合要求。"; row.needsInfo=true;
    } else if(words.length&&words.some(w=>edu.includes(w))){
      row.state="supported"; row.reason=`教育经历包含「${words.filter(w=>edu.includes(w)).join("、")}」，与要求的专业方向一致。`;
    } else {
      row.state="hard_unclear";
      row.reason=`教育经历里没有出现要求的专业（${words.join("、")||"相关专业"}）。专业不符不必然淘汰，需确认是否有相关课程或项目。`;
      row.needsInfo=true;
    }
  } else if(req.hardType==="cert"){
    const names=tlUniq((req.text.match(/CPA|CFA|PMP|软考|注会|注册会计师|法律职业资格|教师资格证|一级建造师|二级建造师|雅思|托福/gi)||[]));
    const pool=[resumeText(res),res.honor||""].join(" ");
    const hit=names.filter(n=>new RegExp(n,"i").test(pool));
    row.evidence=evidence.filter(ev=>ev.field==="honor").slice(0,2);
    if(hit.length){
      row.state="supported"; row.reason=`简历里能查到「${hit.join("、")}」的记录，证书条件有证据。`;
    } else {
      row.state="hard_unclear";
      row.reason="简历中没有写这类证书。未写不代表没有，需要你确认后再决定是否补充。";
      row.needsInfo=true;
    }
  } else if(req.hardType==="location"){
    const cities=["北京","上海","广州","深圳","杭州","成都","武汉","南京","苏州","西安","重庆","长沙","青岛","厦门","合肥","郑州","天津"];
    const need=cities.filter(c=>req.text.includes(c));
    const own=cities.filter(c=>String(res.contact||"").includes(c)||resumeText(res).includes(c));
    row.evidence=tlUniq(own.map(c=>`简历出现城市：${c}`)).map(t=>({label:"基本信息",text:t,strength:"medium"}));
    if(!need.length){ row.state="hard_unclear"; row.reason="岗位地点没有解析出具体城市，无法核对。"; row.needsInfo=true; }
    else if(need.some(c=>own.includes(c))){ row.state="supported"; row.reason=`简历所在城市与岗位地点（${need.join("/")}）一致。`; }
    else { row.state="hard_unclear"; row.reason=`岗位地点是 ${need.join("/")}，简历里没有明确的城市信息。需要你确认是否接受。`; row.needsInfo=true; }
  } else if(req.hardType==="availability"){
    row.state="hard_unclear";
    row.reason="到岗时间与工作形式无法从简历推断，需要你确认。";
    row.needsInfo=true;
  } else {
    const skillEv=tlSkillEvidence(req,evidence);
    const hit=skillEv.filter(x=>x.level!=="none");
    const strong=skillEv.filter(x=>x.level==="strong");
    const strongHits=tlUniq(strong.flatMap(x=>x.hits.map(h=>h.id))).map(id=>evidence.find(ev=>ev.id===id)).filter(Boolean);
    const hits=tlUniq(hit.flatMap(x=>x.hits.map(h=>h.id))).map(id=>evidence.find(ev=>ev.id===id)).filter(Boolean);
    row.evidence=(strongHits.length?strongHits:hits).slice(0,3);
    if(skillEv.length){
      const ratio=hit.length/skillEv.length, sr=strong.length/skillEv.length;
      /* 只有每项要求都在工作经历/项目里拿到 strong 证据，才算「已有证据支持」；
         技能栏自述与间接表述最多只能到 partial，避免把关键词当成能力证明。 */
      const allStrong=hit.length===skillEv.length&&hit.every(x=>x.level==="strong"&&!x.soft);
      if(ratio>=0.8&&sr>=0.5&&allStrong){
        row.state="supported";
        row.reason=`工作/项目中有 ${strongHits.length} 处可核实记录命中 ${hit.map(x=>x.skill).join("、")}，例如「${strongHits[0]?strongHits[0].label:"—"}」。`;
      } else if(hit.length){
        row.state="partial";
        const onlyWeak=hit.every(x=>x.level==="weak"||x.level==="medium");
        const anySoft=hit.some(x=>x.soft);
        row.reason=anySoft
          ? `${hit.map(x=>x.skill).join("、")} 在经历或项目里只有间接表述（如协调、对接、汇报），没有写明你的具体职责与结果；这类表述可以作为线索，但不能直接当作能力证明。`
          : onlyWeak
          ? `技能栏或简介里提到了 ${hit.map(x=>x.skill).join("、")}，但工作与项目经历里没有对应的动作和结果；关键词出现不等于能力证明。`
          : `部分命中 ${hit.map(x=>x.skill).join("、")}，但缺少 ${skillEv.filter(x=>x.level==="none").map(x=>x.skill).join("、")||"完整证据"} 的可核实记录。`;
        row.needsInfo=true;
      } else {
        const ov=overlap(req.text,rgrams);
        if(ov>=0.45){
          row.state="partial";
          row.reason="简历里有一段表述与该要求语义相近，但没有出现对应的技能词，无法确认是否真的做过。";
          row.needsInfo=true;
        } else {
          row.state="missing";
          row.reason="简历中没有找到与该要求对应的经历、项目或技能证据。缺少关键词不代表你不具备，只代表这份简历暂时无法证明。";
          row.needsInfo=true;
        }
      }
    } else {
      const scored=evidence.map(ev=>({ev,s:overlap(ev.text,bigrams(req.text))}))
        .filter(x=>x.s>=0.3).sort((a,b)=>b.s-a.s);
      row.evidence=scored.slice(0,2).map(x=>x.ev);
      if(scored.length&&scored[0].s>=0.3){
        row.state="partial";
        row.reason=`「${scored[0].ev.label}」与要求表述相近（相似度 ${Math.round(scored[0].s*100)}%），但无法据此确认能力，需要你补充具体动作与结果。`;
        row.needsInfo=true;
      } else {
        row.state="missing";
        row.reason="简历中没有找到与该要求对应的证据。缺少关键词不代表你不具备，只代表这份简历暂时无法证明。";
        row.needsInfo=true;
      }
    }
  }
  /* 同一行可能同时写了学历与年限（如「本科及以上，3 年以上经验」），
     硬性类型只取第一个命中，所以年限要单独再核对一次。 */
  if(req.hardType==="degree"&&/(经验|工作)/.test(req.text)){
    const ym=req.text.match(/(\d+)\s*年/);
    const need=ym?+ym[1]:0;
    if(need){
      const periods=(res.experience||[]).filter(e=>/\d{4}/.test(e.period||""));
      const own=resYears(res);
      if(!periods.length&&row.state==="supported"){
        row.state="hard_unclear";
        row.reason+=" 同一行还要求经验年限，但简历缺少可核对的任职起止时间。";
        row.needsInfo=true;
      } else if(periods.length&&own+0.05<need){
        row.state="hard_unmet"; row.blocked=true; row.needsInfo=true;
        row.reason+=` 同一行还要求 ${need} 年经验，按任职时间核算约 ${own} 年，不满足。`;
      }
    }
  }
  if(row.needsInfo) row.question=tlGapQuestion(row);
  return row;
}

/* ---------- 证据制评估（辅助分，不替代 runMatch 的页面分数） ---------- */
function tailorAssess(job,res,parsed){
  parsed=parsed||job.parsed||parseJD(job.jd||"");
  const evidence=tailorEvidence(res);
  const reqs=tailorRequirements(parsed);
  const rtext=resumeText(res), rgrams=bigrams(rtext);
  const rows=reqs.map(r=>tlMatchReq(r,res,evidence,rgrams));
  const counts={supported:0,partial:0,missing:0,hard_unclear:0,hard_unmet:0};
  const W={supported:1,partial:0.5,missing:0,hard_unclear:0.3,hard_unmet:0};
  let total=0, got=0;
  rows.forEach(r=>{ counts[r.state]++; total+=r.weight; got+=r.weight*(W[r.state]||0); });
  const coverage=total?got/total:0;
  const yReq=parsed.years||0, yOwn=resYears(res);
  const expScore=yReq?clamp(yOwn/Math.max(1,yReq),0,1):1;
  const bullets=allBullets(res);
  const quantScore=Math.min(1,bullets.filter(b=>/\d/.test(b)).length/3);
  const score=clamp(Math.round(coverage*68+expScore*17+quantScore*15),0,100);
  return {parsed,evidence,reqs,rows,counts,coverage,expScore,quantScore,score,yReq,yOwn,
    hard:rows.filter(r=>r.hardType&&(r.state==="hard_unclear"||r.state==="hard_unmet")),at:nowISO()};
}
function tailorVerdict(a){
  if(a.counts.hard_unmet) return `有 ${a.counts.hard_unmet} 项硬性条件按简历所写不满足，先确认是否属实，再决定要不要投。`;
  if(a.counts.hard_unclear) return `有 ${a.counts.hard_unclear} 项硬性条件无法从简历确认，补齐后再判断，不要先假定自己不合格。`;
  if(a.counts.missing) return `有 ${a.counts.missing} 项要求这份简历暂时无法证明。缺关键词不等于不具备，逐条补充真实证据即可。`;
  if(a.counts.partial) return `要求基本都能对上，但有 ${a.counts.partial} 项只有间接证据，建议补充动作与结果。`;
  return "解析到的要求都能在简历中找到可核实证据；投递前再检查一次事实与联系方式。";
}
function tlTopEvidence(res){
  return tailorEvidence(res).filter(ev=>ev.strength!=="weak").slice(0,3);
}

/* ---------- 岗位会话：每个岗位独立的定制记录 ---------- */
function tailorSession(job,res){
  data.tailor=data.tailor||{};
  const isVersion=!!(res.parentId&&res.jobId===job.id);
  const baseId=isVersion?res.parentId:res.id;
  let s=data.tailor[job.id];
  if(!s||s.baseResumeId!==baseId){
    s={jobId:job.id,baseResumeId:baseId,versionId:null,
      decisions:{},inputs:{},edits:{},variants:{},createdAt:nowISO(),updatedAt:nowISO()};
    data.tailor[job.id]=s;
  }
  if(isVersion) s.versionId=res.id;
  return s;
}
function tailorDraft(session){
  if(!session||!session.versionId) return null;
  return getResume(session.versionId);
}
function tlVersionName(base,job){
  const root=String(base.name||"简历").split(" · ")[0].trim()||"简历";
  const tag=(job&&(job.company||job.title))||"定制";
  let name=`${root} · ${tag}定制版`;
  const used=new Set((data.resumes||[]).map(r=>r.name));
  if(used.has(name)){ let i=2; while(used.has(`${name} ${i}`)) i++; name=`${name} ${i}`; }
  return name;
}
function tailorEnsureDraft(job,res,session){
  const exist=tailorDraft(session);
  if(exist) return exist;
  const base=(res.parentId&&res.jobId===job.id)?(getResume(res.parentId)||res):res;
  const d=structuredClone(base);
  d.id=uid("r"); d.parentId=base.id; d.jobId=job.id; d.tailored=true;
  d.name=tlVersionName(base,job);
  delete d.demo;
  d.createdAt=nowISO(); d.updatedAt=nowISO();
  data.resumes.unshift(d);
  session.versionId=d.id;
  return d;
}
function tailorSyncJob(job,session){
  if(!job) return;
  const draft=tailorDraft(session);
  const m=draft?runMatch(job.id,draft.id):null;
  job.tailor={versionId:session.versionId||null,at:nowISO(),score:m?m.score:null,
    applied:Object.keys(session.decisions||{}).filter(k=>session.decisions[k].status==="accepted").length};
}
function tailorBundle(job,res){
  const parsed=job.parsed||parseJD(job.jd||"");
  const session=tailorSession(job,res);
  const draft=tailorDraft(session);
  const assessment=tailorAssess(job,res,parsed);
  const match=runMatch(job.id,res.id);
  const bundle={job,res,session,draft,assessment,match,parsed,suggestions:[]};
  bundle.suggestions=tailorSuggestions(bundle);
  return bundle;
}

/* ---------- 写入 / 撤回：路径式操作 ---------- */
function tlPathPrev(draft,path){
  const p=String(path||"").split(":");
  if(path==="field:target") return draft.target||"";
  if(path==="field:summary") return draft.summary||"";
  if(path==="field:education") return draft.education||"";
  if(path==="field:skills") return (draft.skills||[]).join(" · ");
  if(p[0]==="replace"&&p.length===3){
    const e=(draft.experience||[])[+p[1]]||{};
    return (e.bullets||[])[+p[2]]||"";
  }
  return undefined;
}
function tlApply(draft,op){
  if(!draft||!op||!op.path) return false;
  const path=op.path, mode=op.mode||"set", text=String(op.text||"");
  if(path==="field:target"){ draft.target=text; return true; }
  if(path==="field:summary"){ draft.summary=text; return true; }
  if(path==="field:education"){ draft.education=text; return true; }
  if(path==="field:skills"){
    draft.skills=text.split(/[·、,，;；]/).map(s=>s.trim()).filter(Boolean); return true;
  }
  if(path==="appendText:honor"){
    const old=String(draft.honor||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);
    if(!old.includes(text)) old.push(text);
    draft.honor=old.join("\n"); return true;
  }
  const p=path.split(":");
  if(p[0]==="append"&&p.length===2){
    const e=(draft.experience||[])[+p[1]]; if(!e) return false;
    e.bullets=(e.bullets||[]).concat(text); return true;
  }
  if(p[0]==="appendText"&&p[1]==="project"&&p.length===4){
    const pr=(draft.projects||[])[+p[2]]; if(!pr) return false;
    pr.star=pr.star||{};
    const k=p[3], cur=String(pr.star[k]||"").trim();
    pr.star[k]=cur? cur.replace(/[；。]$/,"")+"；"+text : text;
    return true;
  }
  if(p[0]==="replace"&&p.length===3){
    const e=(draft.experience||[])[+p[1]]; if(!e||!e.bullets) return false;
    e.bullets[+p[2]]=text; return true;
  }
  return false;
}
function tlUndo(draft,rec){
  if(!draft||!rec) return;
  const p=String(rec.path||"").split(":"), text=String(rec.text||"");
  if(rec.mode==="append"){
    if(rec.path==="appendText:honor"){
      const old=String(draft.honor||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);
      draft.honor=old.filter(x=>x!==text).join("\n"); return;
    }
    if(p[0]==="append"&&p.length===2){
      const e=(draft.experience||[])[+p[1]]; if(!e||!e.bullets) return;
      const i=e.bullets.lastIndexOf(text); if(i>=0) e.bullets.splice(i,1); return;
    }
    if(p[0]==="appendText"&&p[1]==="project"&&p.length===4){
      const pr=(draft.projects||[])[+p[2]]; if(!pr||!pr.star) return;
      const k=p[3], cur=String(pr.star[k]||""), ix=cur.lastIndexOf(text);
      if(ix<0) return;
      pr.star[k]=cur.slice(0,ix).replace(/[；;]\s*$/,"").trim(); return;
    }
    return;
  }
  if(rec.prev!==undefined) tlApply(draft,{path:rec.path,mode:"set",text:rec.prev});
}
function tlNormalizeText(s){
  let t=String(s||"").replace(/\s+/g," ").trim();
  t=t.replace(/^[-•·*]\s*/,"").replace(/[；;，,、]+$/,"").replace(/。+$/,"");
  return t? t+"。" : "";
}
function tlNewNumbers(base,text){
  const known=new Set(rwNumbers(resumeText(base)));
  return rwNumbers(text).filter(n=>!known.has(n));
}

/* ---------- 生成逐条建议 ---------- */
function tlModeOfPath(path){
  return (/^append/.test(String(path||"")))? "append" : "set";
}
function tlGapPath(row,view){
  if(row.hardType==="degree"||row.hardType==="major") return "field:education";
  if(row.hardType==="cert") return "appendText:honor";
  if((view.experience||[]).length) return "append:0";
  if((view.projects||[]).length) return "appendText:project:0:a";
  return "";
}
function tailorSuggestions(bundle){
  const {job,res,assessment,draft}=bundle;
  const view=draft||res;
  const out=[];
  if(String(res.target||"")!==String(job.title||"")){
    out.push({key:"global:target",reqId:"",kind:"target",label:"求职意向对齐",
      path:"field:target",mode:"set",text:job.title||"",before:res.target||"（未填写）",
      reqText:`目标岗位：${job.title||"未填"}`,
      reason:`简历的求职意向是「${res.target||"未填"}」，与岗位「${job.title||""}」不一致，HR 容易判定为海投。`,
      evidence:[],needsInfo:false,question:"",blocked:false});
  }
  const best=rwBestResult(res);
  if(best&&(res.summary||"").trim()){
    /* 年限优先用简历自己填的数字，避免和原文自述冲突；没填才按任职时间推算 */
    const y=Math.round(Number(res.years)||resYears(res)||0);
    const sk=rwMatchedSkills(res,assessment).slice(0,3);
    const facts=[y?`${y} 年工作经验`:"",sk.length?`核心能力是${sk.join("、")}`:"",`代表成果：${best}`]
      .filter(Boolean).join("；");
    const v1=`${facts}；求职方向明确为${job.title||"目标岗位"}。`;
    const v2=`${facts}；求职方向：${job.title||""}。`;
    const v3=`目标岗位：${job.title||""}。${facts}。`;
    out.push({key:"global:summary",reqId:"",kind:"summary",label:"个人简介重写",
      path:"field:summary",mode:"set",text:v1,variants:[v1,v2,v3],before:res.summary||"（空）",
      reqText:"岗位职责与技能的整体匹配",
      reason:"首屏 6 秒决定是否继续读；只重组简历里已有的年限、技能与成果，不新增任何事实或数字。",
      evidence:tlTopEvidence(res),needsInfo:false,question:"",blocked:false});
  }
  const ordered=rwReorderSkills(res,assessment);
  if(ordered.join("|")!==(res.skills||[]).join("|")){
    out.push({key:"global:skills",reqId:"",kind:"skills",label:"核心技能排序",
      path:"field:skills",mode:"set",text:ordered.join(" · "),before:(res.skills||[]).join(" · "),
      reqText:"岗位必需与优先技能",
      reason:"把岗位要求的技能排到前面，扫读时先看到匹配项；不新增你没有的技能。",
      evidence:[],needsInfo:false,question:"",blocked:false});
  }
  let gaps=0;
  assessment.rows.forEach(row=>{
    if(row.state==="supported") return;
    if(row.kind==="nice"&&gaps>=6) return;
    if(gaps>=8) return;
    gaps++;
    const path=tlGapPath(row,view);
    const blocked=!!row.blocked||["location","availability"].includes(row.hardType);
    const sk=(row.skills||[]).join("、");
    const tpl=(!blocked&&!row.hardType)
      ? `在【场景】中，使用 ${sk||"相关方法"} 完成【任务】，结果是【可核实的结果】。`
      : "";
    out.push({key:row.reqId,reqId:row.reqId,kind:"gap",
      label:row.hardType?`${TL_HARD_LABEL[row.hardType]||"硬性"}：${tlShort(row.text,14)}`:`补证据「${sk||tlShort(row.text,12)}」`,
      path:blocked?"":path,mode:tlModeOfPath(path),text:tpl,before:"（简历中没有对应内容）",
      reqText:row.text,reason:`${row.reason}${blocked?"（硬性条件只能记录，不能靠改简历解决。）":"先补充你的真实经历，系统不会替你编造。"}`,
      evidence:row.evidence||[],needsInfo:!blocked,question:row.question||tlGapQuestion(row),blocked});
  });
  return out;
}
function tlFind(bundle,key){ return bundle.suggestions.find(s=>s.key===key)||null; }
function tlStatus(ses,s){
  const d=ses.decisions&&ses.decisions[s.key];
  return d?d.status:"pending";
}
function tlSuggestionText(ses,s){
  if(ses.edits&&ses.edits[s.key]!==undefined&&String(ses.edits[s.key]).trim()) return ses.edits[s.key];
  const vi=ses.variants&&ses.variants[s.key];
  if(vi!==undefined&&s.variants&&s.variants.length) return s.variants[vi%s.variants.length];
  return s.text||"";
}
function tlCanWrite(bundle,s){
  const ses=bundle.session, text=tlSuggestionText(ses,s);
  if(s.blocked) return {ok:false,why:"这是硬性缺口，只能记录，不能写进简历。"};
  if(!s.path) return {ok:false,why:"需要先补充真实信息，并确定写入位置。"};
  if(!String(text||"").trim()) return {ok:false,why:"还需要你补充真实内容，暂不写入。"};
  if(/【[^】]*】/.test(text)) return {ok:false,why:"文本里还有占位符，请先替换成真实内容。"};
  if(s.needsInfo&&!String(ses.edits[s.key]||ses.inputs[s.key]||"").trim())
    return {ok:false,why:"请先补充真实经历信息。"};
  return {ok:true};
}
function tlPathOptions(bundle){
  const r=bundle.draft||bundle.res;
  const out=[];
  (r.experience||[]).forEach((e,i)=>out.push({v:`append:${i}`,t:`工作经历 · ${e.company||e.role||"第 "+(i+1)+" 段"} · 追加一条成果`}));
  (r.projects||[]).forEach((p,i)=>out.push({v:`appendText:project:${i}:a`,t:`项目 · ${p.name||"第 "+(i+1)+" 个"} · 追加到行动`}));
  out.push({v:"appendText:honor",t:"荣誉与证书 · 追加一条"});
  out.push({v:"field:education",t:"教育背景 · 更新整段"});
  out.push({v:"field:summary",t:"个人简介 · 更新整段"});
  return out;
}

/* ---------- 操作：接受 / 拒绝 / 编辑 / 重新生成 / 撤回 ---------- */
function tailorAccept(bundle,s){
  const {job,res,session}=bundle;
  const gate=tlCanWrite(bundle,s);
  if(!gate.ok){ toast(gate.why); tailorAskInfo(bundle,s); return; }
  const draft=tailorEnsureDraft(job,res,session);
  const text=tlNormalizeText(tlSuggestionText(session,s));
  const old=session.decisions[s.key];
  if(old&&old.status==="accepted"&&old.op) tlUndo(draft,old.op);
  const prev=tlPathPrev(draft,s.path);
  if(!tlApply(draft,{path:s.path,mode:s.mode,text})){ toast("写入位置不存在，请重新选择写入位置"); return; }
  draft.updatedAt=nowISO();
  session.decisions[s.key]={status:"accepted",at:nowISO(),text,
    op:{path:s.path,mode:s.mode,text,prev}};
  session.updatedAt=nowISO();
  tailorSyncJob(job,session);
  store.save(); tailorRefresh();
  toast(`已写入定制版：${s.label}`);
}
function tailorReject(bundle,s){
  const {job,session,draft}=bundle;
  const old=session.decisions[s.key];
  if(old&&old.status==="accepted"&&old.op&&draft){ tlUndo(draft,old.op); draft.updatedAt=nowISO(); }
  session.decisions[s.key]={status:"rejected",at:nowISO()};
  session.updatedAt=nowISO();
  tailorSyncJob(job,session); store.save(); tailorRefresh();
  toast("已拒绝，简历保留原文");
}
function tailorRegenerate(bundle,s){
  const ses=bundle.session;
  if(s.kind==="summary"&&s.variants&&s.variants.length>1){
    const old=ses.decisions[s.key];
    if(old&&old.status==="accepted"&&old.op&&bundle.draft) tlUndo(bundle.draft,old.op);
    ses.variants[s.key]=((ses.variants[s.key]||0)+1)%s.variants.length;
    ses.decisions[s.key]={status:"pending",at:nowISO()};
    tailorSyncJob(bundle.job,ses); store.save(); tailorRefresh();
    toast("已换一版简介（仍只使用简历里已有的事实）");
    return;
  }
  toast(s.kind==="gap"?"已按当前简历重新检测证据；如仍无证据，请先补充真实经历":"这条建议没有可替换的变体");
  tailorRefresh();
}
function tailorReset(bundle){
  const {job,session,draft}=bundle;
  Object.keys(session.decisions||{}).forEach(k=>{
    const d=session.decisions[k];
    if(d.status==="accepted"&&d.op&&draft) tlUndo(draft,d.op);
  });
  session.decisions={}; session.edits={}; session.inputs={}; session.variants={};
  session.updatedAt=nowISO();
  tailorSyncJob(job,session); store.save(); tailorRefresh();
  toast("已撤回所有应用到定制版的修改");
}
function tailorEditModal(bundle,s){
  const ses=bundle.session, cur=tlSuggestionText(ses,s), opts=tlPathOptions(bundle);
  const ov=openModal(`<h3>编辑这条建议</h3>
    <div class="sub">只改写表述，不新增事实；修改后会写入该岗位的定制版本。</div>
    <div class="field mt12"><label>改后内容</label>
      <textarea id="tl-edit" class="ta-lg">${esc(cur)}</textarea>
      <div class="modal-note">占位符【…】必须替换成真实内容；没有数字就留空，系统不会替你补。</div></div>
    <div class="field"><label>写入位置</label>
      <select class="selbox" id="tl-edit-path">${opts.map(o=>`<option value="${o.v}" ${o.v===s.path?"selected":""}>${esc(o.t)}</option>`).join("")}</select></div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="tl-edit-cancel">取消</button>
      <button class="btn" id="tl-edit-save">保存并写入</button></div>`,true);
  ov.querySelector("#tl-edit-cancel").onclick=()=>ov.remove();
  ov.querySelector("#tl-edit-save").onclick=()=>{
    const text=ov.querySelector("#tl-edit").value.trim();
    if(!text){ toast("内容不能为空"); return; }
    if(/【[^】]*】/.test(text)){ toast("还有占位符，请替换成真实内容"); return; }
    ses.edits[s.key]=text;
    const pv=ov.querySelector("#tl-edit-path").value;
    if(pv){ s.path=pv; s.mode=tlModeOfPath(pv); }
    ses.updatedAt=nowISO();
    ov.remove();
    tailorAccept(bundle,s);
  };
}
function tailorAskInfo(bundle,s){
  const ses=bundle.session;
  const cur=ses.edits[s.key]!==undefined?ses.edits[s.key]:(ses.inputs[s.key]||"");
  const opts=tlPathOptions(bundle);
  const ov=openModal(`<h3>补充真实信息</h3>
    <div class="sub">${esc(s.question||"请补充与这条要求对应的真实经历。")}</div>
    <div class="alert info mt12">${icon("alert",14)} 只写你真实做过的事；没有数字就留空，系统不会替你补。</div>
    <div class="field mt12"><label>你的真实经历（场景 + 你的动作 + 可核实结果）</label>
      <textarea id="tl-ask" class="ta-lg" placeholder="例如：在橙果电商负责交易域指标，用 SQL 搭了 12 个核心指标，日报服务 6 个团队。">${esc(cur)}</textarea></div>
    <div class="field"><label>写入位置</label>
      <select class="selbox" id="tl-ask-path">${opts.map(o=>`<option value="${o.v}" ${o.v===s.path?"selected":""}>${esc(o.t)}</option>`).join("")}</select>
      <div class="modal-note">写入的是该岗位的定制版本，不会改动原始简历。</div></div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="tl-ask-cancel">取消</button>
      <button class="btn" id="tl-ask-save">保存并接受</button></div>`,true);
  ov.querySelector("#tl-ask-cancel").onclick=()=>ov.remove();
  ov.querySelector("#tl-ask-save").onclick=()=>{
    const text=ov.querySelector("#tl-ask").value.trim();
    if(!text){ toast("先填写真实经历"); return; }
    if(/【[^】]*】/.test(text)){ toast("还有占位符，请替换成真实内容"); return; }
    ses.inputs[s.key]=text; ses.edits[s.key]=text;
    const pv=ov.querySelector("#tl-ask-path").value;
    if(pv){ s.path=pv; s.mode=tlModeOfPath(pv); }
    ses.updatedAt=nowISO();
    ov.remove();
    tailorAccept(bundle,s);
  };
}

/* ---------- 渲染 ---------- */
function tailorRefresh(){
  const y=window.scrollY||0;
  store.save(); render();
  requestAnimationFrame(()=>{ try{ window.scrollTo(0,y); }catch(e){} });
}
function tailorAIBadgeHTML(){
  const ready=aiReady();
  return `<div class="alert ${ready?"info":"warn"} mt12">${icon("alert",14)} ${ready
    ? "<b>AI 已配置：</b>可用于提示词工坊与一键改写；逐条建议仍以本地规则和你的补充为准，不会把关键词当成能力证明。"
    : "<b>当前为本地规则模式：</b>岗位解析、匹配报告与逐条建议全部由本地规则生成，不伪装成 AI 分析；可在「设置」配置 API 后再用提示词工坊。"}</div>`;
}
function tailorJDPanelHTML(a,job){
  const p=a.parsed;
  const hard=a.rows.filter(r=>r.hardType).length;
  return `<div class="panel-lg mt18">
    <div class="flex" style="justify-content:space-between;align-items:flex-start">
      <div><h3>${icon("briefcase",16)} 岗位要求解析</h3>
        <div class="ph-sub">${esc(job.company||"未填公司")} · ${esc(job.title||"未填岗位")}${job.location?" · "+esc(job.location):""}</div></div>
      <span class="tiny">职责 ${(p.duties||[]).length} · 必需 ${(p.must||[]).length} · 优先 ${(p.nice||[]).length}</span>
    </div>
    <div class="chips mt12">${(p.skills||[]).map(s=>`<span class="chip">${esc(s)}</span>`).join("")||'<span class="tiny">未识别到技能词</span>'}</div>
    <div class="tiny mt8">经验要求：${p.years?p.years+" 年":"未写"} · 学历：${esc(p.degree||"未写")} · 硬性条件 ${hard} 条</div>
    <details class="mt12"><summary class="tiny">查看 JD 原文</summary>
      <div class="tiny" style="white-space:pre-wrap;max-height:220px;overflow:auto">${esc(job.jd||"")}</div></details>
  </div>`;
}
function tailorReportHTML(a,session){
  const c=a.counts;
  const chips=TL_ORDER.map(k=>`<span class="badge ${TL_STATES[k].badge}">${TL_STATES[k].label} ${c[k]||0}</span>`).join("");
  return `<div class="panel-lg">
    <h3>${icon("target",16)} 匹配差距报告</h3>
    <div class="ph-sub">每条都给出判断理由与证据来源；关键词出现不等于能力证明</div>
    <div class="chips mt12">${chips}</div>
    <div class="alert ${c.hard_unmet?"warn":"info"} mt12">${icon("alert",14)} ${esc(tailorVerdict(a))}</div>
    <div class="scroll mt12" style="max-height:520px">
      ${a.rows.map(r=>{
        const st=TL_STATES[r.state];
        const sesKey=r.reqId;
        const decided=session.decisions&&session.decisions[sesKey];
        return `<div class="cov-row">
          <span class="dot-pass" style="background:${st.color}"></span>
          <div class="cv"><b>${esc(r.text)}</b>
            <div class="flex wrap mt8" style="gap:6px">
              <span class="badge ${st.badge}">${st.label}</span>
              <span class="badge">${r.kind==="must"?"必需":"优先"}</span>
              ${r.hardType?`<span class="badge demo">硬性 · ${esc(TL_HARD_LABEL[r.hardType]||r.hardType)}</span>`:""}
              ${decided?`<span class="badge ${decided.status==="accepted"?"ok":"demo"}">${decided.status==="accepted"?"已写入版本":"已记录"}</span>`:""}
              ${(r.skills||[]).map(s=>`<span class="chip">${esc(s)}</span>`).join("")}
            </div>
            <div class="tiny mt8">${esc(r.reason)}</div>
            ${r.evidence&&r.evidence.length?`<details class="mt8"><summary class="tiny">证据来源（${r.evidence.length}）</summary>
              ${r.evidence.map(e=>`<div class="tiny">· ${esc(e.label)}：${esc(tlShort(e.text,90))}</div>`).join("")}</details>`:""}
          </div>
          <button class="btn ghost sm js-tl-ask" data-req="${esc(r.reqId)}">补充证据</button>
        </div>`;
      }).join("")||'<div class="tiny">没有解析到要求，检查一下 JD 分段。</div>'}
    </div>
    <div class="tiny mt12">证据覆盖率 ${Math.round(a.coverage*100)}%（辅助参考）· 评分规则：已有证据 1、需补充 0.5、硬性待确认 0.3、暂无证据与硬性不满足 0；按必需 3 / 优先 1 加权。</div>
  </div>`;
}
function tailorSuggestionsHTML(bundle){
  const {session}=bundle, list=bundle.suggestions;
  const acc=list.filter(s=>tlStatus(session,s)==="accepted").length;
  const rej=list.filter(s=>tlStatus(session,s)==="rejected").length;
  const pend=list.length-acc-rej;
  return `<div class="panel-lg mt18">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div><h3>${icon("spark",16)} 逐条优化 <span class="badge">${list.length} 条</span></h3>
        <div class="ph-sub">接受后写入本岗位的定制版本；拒绝保留原文；缺证据的条目必须先补充真实信息</div></div>
      <div class="flex" style="gap:6px"><span class="badge ok">已应用 ${acc}</span><span class="badge warn">待处理 ${pend}</span><span class="badge">已拒绝 ${rej}</span></div>
    </div>
    <div class="mt12">
      ${list.map(s=>{
        const st=tlStatus(session,s);
        const text=tlSuggestionText(session,s);
        const badge=st==="accepted"?'<span class="badge ok">已写入</span>':st==="rejected"?'<span class="badge">已拒绝</span>':'<span class="badge warn">待确认</span>';
        return `<div class="diff-row">
          <div class="diff-meta"><b>${esc(s.label)}</b> ${badge}
            ${s.blocked?'<span class="badge danger">硬性缺口</span>':s.needsInfo?'<span class="badge warn">需补充信息</span>':'<span class="badge ok">可直接用</span>'}
            <span class="tiny">${esc(s.reason)}</span></div>
          <div class="diff-cell"><div class="tiny">改前</div>${esc(s.before)}</div>
          <div class="diff-cell after"><div class="tiny">改后</div>${text?esc(text):`<span class="tiny">待你补充：${esc(s.question||"")}</span>`}</div>
          <div class="diff-meta">
            <div class="tiny">对应岗位要求：${esc(s.reqText||"—")}</div>
            ${s.evidence&&s.evidence.length?`<details class="mt8"><summary class="tiny">支持这条建议的简历证据（${s.evidence.length}）</summary>
              ${s.evidence.map(e=>`<div class="tiny">· ${esc(e.label)}：${esc(tlShort(e.text,80))}</div>`).join("")}</details>`
              :'<div class="tiny">没有直接证据，需要你补充。</div>'}
            <div class="flex wrap mt8" style="gap:6px">
              <button class="btn sm js-tl-accept" data-key="${esc(s.key)}" ${s.blocked?"disabled":""}>${st==="accepted"?"重新应用":"接受"}</button>
              <button class="btn ghost sm js-tl-reject" data-key="${esc(s.key)}">${st==="accepted"?"撤回":"拒绝"}</button>
              <button class="btn ghost sm js-tl-edit" data-key="${esc(s.key)}">编辑</button>
              <button class="btn ghost sm js-tl-regen" data-key="${esc(s.key)}">重新生成</button>
              ${s.needsInfo?`<button class="btn line sm js-tl-ask" data-key="${esc(s.key)}">补充真实信息</button>`:""}
              <button class="btn ghost sm js-tl-copy" data-key="${esc(s.key)}">复制改后</button>
            </div>
          </div>
        </div>`;
      }).join("")||'<div class="tiny">当前岗位没有需要补充的要求。</div>'}
    </div>
  </div>`;
}
function tailorVersionHTML(bundle){
  const {job,session,draft}=bundle;
  const acc=Object.keys(session.decisions||{}).filter(k=>session.decisions[k].status==="accepted").length;
  const rej=Object.keys(session.decisions||{}).filter(k=>session.decisions[k].status==="rejected").length;
  const versions=(data.resumes||[]).filter(r=>r.jobId===job.id);
  const m=draft?runMatch(job.id,draft.id):null;
  const head=draft
    ? `<div class="cov-row"><span class="dot-pass" style="background:var(--accent)"></span>
        <div class="cv"><b>${esc(draft.name)}</b>
          <div class="tiny">目标 ${esc(draft.target||"—")} · ${resYears(draft)} 年 · 更新 ${fmtDate(draft.updatedAt||draft.createdAt)}
          ${m?` · 当前匹配分 ${m.score}`:""}</div></div>
        <span class="badge ok">当前确认版本</span></div>`
    : `<div class="tiny">还没有生成定制版。接受任意一条建议后会创建草稿，原始简历不会被改动。</div>`;
  return `<div class="panel-lg mt18">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div><h3>${icon("file",16)} 岗位简历版本</h3>
        <div class="ph-sub">每个岗位独立保存；原始简历始终保留，不会被覆盖</div></div>
      <div class="flex" style="gap:6px"><span class="badge ok">已应用 ${acc}</span><span class="badge">已拒绝 ${rej}</span></div>
    </div>
    <div class="mt12">${head}</div>
    <div class="flex wrap mt12" style="gap:8px">
      <button class="btn sm js-tl-view" ${draft?"":"disabled"}>${icon("file",14)} 预览</button>
      <button class="btn line sm js-tl-print" ${draft?"":"disabled"}>${icon("download",14)} 打印 / 导出 PDF</button>
      <button class="btn ghost sm js-tl-copyres" ${draft?"":"disabled"}>复制全文</button>
      <button class="btn ghost sm js-tl-reset" ${draft?"":"disabled"}>撤回全部已应用</button>
      <button class="btn ghost sm js-tl-go-resume">去简历库</button>
    </div>
    ${job.tailor&&job.tailor.score!=null?`<div class="tiny mt8">该岗位最近一次定制记录：匹配分 ${job.tailor.score} · ${fmtDate(job.tailor.at)}</div>`:""}
    ${versions.length?`<div class="mt12">${versions.map(v=>`<div class="cov-row">
        <span class="dot-pass" style="background:${v.id===session.versionId?"var(--success)":"var(--border)"}"></span>
        <div class="cv"><b>${esc(v.name)}</b><div class="tiny">${resYears(v)} 年 · ${fmtDate(v.updatedAt||v.createdAt)}${v.id===session.versionId?" · 当前版本":""}</div></div>
        <button class="btn ghost sm js-tl-use" data-id="${v.id}">用这份分析</button></div>`).join("")}</div>`:""}
    <div class="tiny mt12">导出说明：预览与「打印 / 导出 PDF」都读取当前确认版本，PDF 由浏览器打印生成；目前没有 DOCX 导出。</div>
  </div>`;
}
function wireTailor(bundle){
  const q=(sel)=>$("#screen").querySelectorAll(sel);
  q(".js-tl-accept").forEach(b=>b.onclick=()=>{
    const s=tlFind(bundle,b.dataset.key); if(s) tailorAccept(bundle,s);
  });
  q(".js-tl-reject").forEach(b=>b.onclick=()=>{
    const s=tlFind(bundle,b.dataset.key); if(s) tailorReject(bundle,s);
  });
  q(".js-tl-edit").forEach(b=>b.onclick=()=>{
    const s=tlFind(bundle,b.dataset.key); if(s) tailorEditModal(bundle,s);
  });
  q(".js-tl-regen").forEach(b=>b.onclick=()=>{
    const s=tlFind(bundle,b.dataset.key); if(s) tailorRegenerate(bundle,s);
  });
  q(".js-tl-ask").forEach(b=>b.onclick=()=>{
    const key=b.dataset.key||b.dataset.req;
    const s=tlFind(bundle,key);
    if(!s){ toast("这条要求已有证据，不需要补充"); return; }
    tailorAskInfo(bundle,s);
  });
  q(".js-tl-copy").forEach(b=>b.onclick=()=>{
    const s=tlFind(bundle,b.dataset.key);
    if(!s) return;
    const t=tlSuggestionText(bundle.session,s);
    if(!t){ toast("这条还需要先补充真实内容"); return; }
    copyText(t);
  });
  q(".js-tl-view").forEach(b=>b.onclick=()=>{ if(bundle.draft) openResumePreview(bundle.draft); });
  q(".js-tl-print").forEach(b=>b.onclick=()=>{ if(bundle.draft) printResume(bundle.draft); });
  q(".js-tl-copyres").forEach(b=>b.onclick=()=>{
    if(!bundle.draft) return;
    copyText(resumeBody(bundle.draft));
  });
  q(".js-tl-reset").forEach(b=>b.onclick=()=>{
    if(bundle.draft) tailorReset(bundle);
  });
  q(".js-tl-go-resume").forEach(b=>b.onclick=()=>go("resume"));
  q(".js-tl-use").forEach(b=>b.onclick=()=>{
    data.activeResumeId=b.dataset.id; store.save(); render();
  });
}



