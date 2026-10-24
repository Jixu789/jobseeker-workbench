/* ============================================================
   JOBSEARCH · 岗位库
   ============================================================ */

/* ---------- 岗位雷达：方向 / 企业类型筛选 + 公开源抓取 ---------- */
const RADAR = { dir:"all", org:"all", city:"all", q:"", online:[], loading:false, tried:false,
  selected:new Set(), lastAt:"", error:"" };
const RADAR_SRC = {
  name:"校招公告雷达",
  url:"https://cdn.jsdelivr.net/gh/AdenXie/job-website@main/public/jobs.json",
};
const RADAR_DIRS = ["物联网","嵌入式","自动化","电子信息","计算机IT","材料与化工"];
const RADAR_DIR_RE = {
  "物联网":/物联网|iot|传感网|无线传感|智能家居|边缘计算|mqtt|rfid/i,
  "嵌入式":/嵌入式|单片机|mcu|stm32|rtos|固件|驱动开发|linux ?驱动|bsp/i,
  "自动化":/自动化(?!测试)|控制工程|plc|运动控制|伺服|机器人|dcs|仪器仪表|电气工程|电气自动化|机电一体化/i,
  "电子信息":/电子信息|硬件|电路|pcb|射频|微波|模拟ic|数字ic|芯片|半导体|fpga|通信|信号处理|光电子|天线/i,
  "计算机IT":/软件|开发|java|前端|后端|全栈|测试|运维|算法|大数据|云计算|网络安全|数据库|程序员|python|golang|c\+\+|web|android|ios|系统集成|it ?支持/i,
  "材料与化工":/材料|化工|化学|高分子|催化|冶金|涂料|树脂|橡胶|塑料|复合材料|无机非金属|金属材料|锂电|电解液|正极|负极|隔膜|石化|炼化|石油化工|精细化工|工艺流程|工艺工程/i,
};
const RADAR_SEG_TECH=/工程师|研发|技术|开发|硬件|软件|算法|测试|设计|it|程序|数据|网络|电子|电路|嵌入式|单片机|自动化|电气|控制|机器人|通信|射频|芯片|半导体|fpga|物联网|传感|机械|材料|化工|化学|高分子|催化|冶金|涂料|树脂|橡胶|塑料|锂电|电解液|石化|炼化|工艺/i;
/* 行业兜底：只在标题已含技术词、但标题本身判不出方向时使用（避免「运营」被算成计算机 IT） */
const RADAR_IND=[
  ["材料与化工", /材料|化工|化学|高分子|催化|冶金|石化|炼化|新能源|电池/i],
  ["电子信息", /电子|通信|半导体|芯片|集成电路|硬件|仪器/i],
  ["计算机IT", /it|互联网|游戏|软件|计算机|信息/i],
];
const RADAR_MAT_IND=/材料|化工|化学|高分子|催化|冶金|石化|炼化|新能源|电池/i;
const RADAR_IND_GENERIC=/^(工程师|工程师类|技术|技术类|研发|研发类|其他|其他职位)$/;
const RADAR_BRAND = /腾讯|字节|阿里|百度|美团|京东|华为|小米|网易|快手|滴滴|拼多多|蚂蚁|中兴|oppo|vivo|海康|大疆|浪潮|用友|金山|携程|微博|哔哩哔哩|b站|商汤|旷视|科大讯飞|比亚迪|宁德时代|联想|tcl|海尔|美的|格力|新华三|紫光|烽火|中芯|地平线|寒武纪|大华|汇顶|兆易|深信服|奇安信/i;
const RADAR_STATE = /中国|国家|国网|电网|中电|中船|中核|中铁|中建|中车|中交|中冶|中化|中粮|中煤|中航|航天|航空|兵器|电科|中广核|华能|大唐|华电|国电|三峡|南网|移动|联通|电信|铁路|烟草|邮政|华润|招商局|保利|国投/i;

function radarStr(v, cap){ return String(v??"").replace(/\s+/g," ").trim().slice(0, cap||80); }
function radarDay(s){
  const t=String(s||"");
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t.slice(5) : radarTime(t);
}
function radarKey(s){ let h=0; const t=String(s||""); for(let i=0;i<t.length;i++) h=(h*31+t.charCodeAt(i))|0; return "k"+(h>>>0).toString(36); }
function radarTime(s){
  const d=new Date(s); if(isNaN(d)) return radarStr(s,10)||"—";
  return `${d.getMonth()+1}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/* 内置示例池：断网 / 跨域失败时仍能演示筛选；明确标注非真实在招 */
const RADAR_SEED = [
  ["嵌入式软件工程师","某央企研究院","北京","央企国企","嵌入式",["STM32","FreeRTOS","C 语言"],"负责国产化控制板的驱动移植与任务调度，参与整机联调与低功耗优化。"],
  ["硬件电路工程师","某消费电子公司","深圳","私企","电子信息",["原理图","PCB","EMC"],"负责主板电源与接口电路设计，跟进打样、调试与量产问题定位。"],
  ["自动化控制工程师","某装备制造厂","苏州","大厂","自动化",["PLC","伺服","运动控制"],"负责产线控制逻辑开发与节拍优化，配合现场调试与故障排查。"],
  ["物联网平台开发工程师","某智能家居公司","杭州","小公司","物联网",["MQTT","边缘计算","云平台"],"负责设备接入网关与云端数据链路，处理海量上报与指令下发。"],
  ["Java 后端开发工程师","某互联网公司","上海","大厂","计算机IT",["Java","Spring Boot","MySQL"],"负责交易链路服务开发与稳定性治理，参与高并发场景压测。"],
  ["FPGA 开发工程师","某通信研究所","成都","央企国企","电子信息",["FPGA","Verilog","信号处理"],"负责基带信号处理模块的 FPGA 实现与仿真验证。"],
  ["机器人算法工程师","某机器人公司","深圳","大厂","自动化",["ROS","SLAM","C++"],"负责移动机器人定位与路径规划算法开发，参与整机联调。"],
  ["单片机开发工程师","某电子厂","东莞","私企","嵌入式",["MCU","C 语言","串口通信"],"负责小家电控制板固件开发与外设驱动调试。"],
  ["材料研发工程师","某新材料公司","宁波","私企","材料与化工",["高分子材料","复合材料","性能表征"],"负责高分子复合材料配方开发与性能表征，跟进中试放大与工艺验证。"],
  ["化工工艺工程师","某精细化工企业","南京","私企","材料与化工",["精细化工","反应工艺","工艺安全"],"负责精细化工产品反应工艺开发与放大，处理现场工艺异常并做安全评估。"],
].map(([title,company,city,org,dir,tags,desc],i)=>({
  rid:"seed"+i, title, company:"示例 · "+company, city, org, dir, tags,
  desc:desc+"（内置示例，非真实在招）", demo:true, source:"内置示例", url:"",
  edu:"本科", type:"校招", deadline:"", date:"",
  jd:`${title}｜示例 · ${company}｜${city}\n关键词：${tags.join("、")}\n${desc}\n（内置示例条目，仅用于演示筛选；请以「抓取在线岗位」得到的真实岗位为准。）`,
}));

function radarOrgOf(company, type){
  const t=String(type||""), n=String(company||"");
  if(/国有|央企|中央企业/.test(t)) return "央企国企";
  if(/民营|私营|个体|股份制|合资|外商独资|上市/.test(t)) return RADAR_BRAND.test(n) ? "大厂" : "私企";
  if(RADAR_STATE.test(n)) return "央企国企";
  if(RADAR_BRAND.test(n)) return "大厂";
  if(/研究院|研究所|实验室|设计院/.test(n)) return "央企国企";
  if(/集团|控股|股份/.test(n)) return "私企";
  if(/公司|厂|中心|工作室|事务所/.test(n)) return "小公司";
  return "私企";   /* 公开源多数只写品牌名（如「联发科技」），按私企估算 */
}
/* 源 B（校招公告聚合）字段：company / title（聚合类别）/ program / industry / cities[] / cohort / batch / deadline / updatedAt / announcementUrl */
function radarSegs(s){
  return String(s||"").split(/[、,，/｜|]+/).map(x=>x.trim()).filter(Boolean);
}
function radarDirOfSegs(tech, ind){
  const industry=String(ind||"");
  /* 行业写明材料 / 化工，且标题里也有材料/化工词 → 优先归「材料与化工」，
     避免「半导体材料」「化工自动化」被电子信息 / 自动化先抢走 */
  if(RADAR_MAT_IND.test(industry) && tech.some(s=>RADAR_DIR_RE["材料与化工"].test(s))) return "材料与化工";
  for(const d of RADAR_DIRS) if(tech.some(s=>RADAR_DIR_RE[d].test(s))) return d;
  if(!tech.length) return "";
  for(const [d,re] of RADAR_IND) if(re.test(industry)) return d;
  return "";
}
function radarTitleOf(tech, dir, ind){
  const hit=tech.filter(s=>RADAR_DIR_RE[dir].test(s));
  let title=(hit.length?hit:tech).slice(0,3).join(" / ");
  if(RADAR_IND_GENERIC.test(title) && ind) title+=`（${String(ind).split("、")[0]}）`;
  return radarStr(title,40);
}
function radarJdOf(it){
  return [
    `${it.company}｜${it.title}｜${it.city}`,
    `招聘项目：${it.program||"—"}（${[it.cohort,it.batch].filter(Boolean).join(" ")||"批次未标注"}）`,
    `所属行业：${it.industry||"未标注"}`,
    it.url?`公告原文：${it.url}`:"",
    "说明：条目来自公开校招公告，原公告没有逐条职位描述；投递前打开原文核对，并把正文补到岗位弹窗的「岗位职责 / 任职要求」两栏后再做匹配分析。",
  ].filter(Boolean).join("\n");
}
function radarMapCampus(j){
  const company=radarStr(j.company,60);
  if(!company) return null;
  if(/教师|老师|讲师|教研|辅导员/.test(String(j.title||""))) return null;   // 化学教师 / 教研岗不是材料化工岗位
  const tech=radarSegs(j.title).filter(s=>RADAR_SEG_TECH.test(s));
  if(!tech.length) return null;               // 纯「运营 / 销售 / 管培生」不进雷达
  const dir=radarDirOfSegs(tech, j.industry);
  if(!dir) return null;
  const title=radarTitleOf(tech, dir, j.industry);
  const cities=(Array.isArray(j.cities)?j.cities:[]).map(c=>radarStr(c,16)).filter(Boolean);
  const city=cities[0]||"地点未公布";
  const cohort=radarStr(j.cohort,12), batch=radarStr(j.batch,12);
  const it={
    rid:radarKey(company+"|"+title+"|"+city),
    title, company, city, dir, kind:"公告",
    org:radarOrgOf(company, ""),
    edu:"",
    type:[cohort, batch].filter(Boolean).join(" · "),
    deadline:radarStr(j.deadline,10), date:radarStr(j.updatedAt,10),
    program:radarStr(j.program,40), industry:radarStr(j.industry,24), cohort, batch,
    tags:[radarStr(j.industry,24), radarStr(j.program,24)].filter(Boolean),
    desc:radarStr([
      radarStr(j.program,40)||"招聘公告",
      cities.slice(0,3).join("/")+(cities.length>3?` 等 ${cities.length} 城`:""),
    ].filter(Boolean).join(" · "),200),
    demo:false,
    source:radarStr(j.source,24)||RADAR_SRC.name,
    url:radarStr(j.announcementUrl||j.applyUrl||j.sourceUrl,300),
    jd:"",
  };
  it.jd=radarJdOf(it);
  return it;
}
function radarAll(){ return RADAR.online.length ? RADAR.online : RADAR_SEED; }
function radarFiltered(){
  const q=RADAR.q.trim().toLowerCase();
  return radarAll().filter(it=>{
    if(RADAR.dir!=="all" && it.dir!==RADAR.dir) return false;
    if(RADAR.org!=="all" && it.org!==RADAR.org) return false;
    if(RADAR.city!=="all" && it.city!==RADAR.city) return false;
    if(q){
      const hay=(it.title+it.company+it.desc+(it.tags||[]).join("")).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}
function radarCities(){
  const cnt={}; radarAll().forEach(it=>{ cnt[it.city]=(cnt[it.city]||0)+1; });
  return Object.keys(cnt).filter(c=>c!=="地点未公布").sort((a,b)=>cnt[b]-cnt[a]).slice(0,14);
}
function radarExists(it){
  return (data.jobs||[]).some(j=>String(j.title||"").trim()===it.title && String(j.company||"").trim()===it.company);
}
function radarStatusText(){
  if(RADAR.loading) return "正在从公开校招公告源抓取…（首次约 6 秒，之后走 CDN 缓存）";
  if(RADAR.error && RADAR.online.length) return `刷新失败：${RADAR.error} · 仍显示上一次抓到的 ${RADAR.online.length} 条，可再点「抓取在线岗位」重试`;
  if(RADAR.error) return `在线抓取失败：${RADAR.error} · 当前显示内置示例池，联网后点「抓取在线岗位」重试`;
  if(RADAR.online.length) return `在线数据 ${RADAR.online.length} 条 · 公告更新于 ${radarDay(RADAR.lastAt)} · 企业类型按公司名估算 · 公告类原条目没有完整 JD，加入后建议打开原文补两栏`;
  return "当前为内置示例池（仅演示筛选）。点「抓取在线岗位」拉取公开校招公告；企业类型按公司名估算。";
}
function radarItemHTML(it){
  const exists=radarExists(it);
  const checked=RADAR.selected.has(it.rid)?"checked":"";
  const hi=it.deadline?`截止 ${radarDay(it.deadline)}`:(it.type||it.kind||"示例");
  const pills=[it.city, it.type, it.edu].filter(p=>p&&p!==hi);
  const tags=(it.tags||[]).filter(Boolean).slice(0,5);
  const shown=new Set([...pills,...tags]);
  const coMeta=[it.org,
    (it.industry&&!shown.has(it.industry))?it.industry:((it.dir&&!shown.has(it.dir))?it.dir:""),
    it.kind].filter((v,i,a)=>v&&a.indexOf(v)===i);
  return `<div class="radar-item" data-rid="${it.rid}" data-open="${it.rid}" role="button" tabindex="0">
    <label class="rc"><input type="checkbox" data-pick="${it.rid}" aria-label="选择「${attr(it.title)}」加入岗位库" ${checked}/></label>
    <div class="rm">
      <div class="rhead"><div class="rt">${esc(it.title)}${it.demo?'<span class="badge demo">示例</span>':""}</div>
        <div class="rpay">${esc(hi)}</div></div>
      <div class="rmeta">${pills.map(p=>`<span class="mpill">${esc(p)}</span>`).join("")}
        ${tags.map(t=>`<span class="mpill">${esc(radarStr(t,20))}</span>`).join("")}</div>
      <div class="rco"><span class="rlogo">${esc(radarStr(it.company,1)||"公")}</span>
        <span class="rco-name">${esc(it.company)}</span>
        ${coMeta.map(m=>`<span class="rsep"></span><span>${esc(m)}</span>`).join("")}
        ${it.date?`<span class="rsep"></span><span>${esc(it.date)} 发布</span>`:""}</div>
    </div>
    <div class="ra">
      ${exists?'<span class="badge ok">已在库</span>':`<button class="btn line sm" data-radar-add="${it.rid}">加入</button>`}
      ${it.url?`<a class="radar-link" href="${attr(it.url)}" target="_blank" rel="noopener">原文</a>`:""}
      <span class="rd-hint">查看详情 →</span>
    </div>
  </div>`;
}
function radarListHTML(pool){
  if(!pool.length) return `<div class="radar-empty">没有符合筛选条件的岗位，放宽方向 / 企业 / 城市，或清空关键词再试。</div>`;
  const shown=pool.slice(0,60);
  const more=pool.length>shown.length?`<div class="tiny" style="padding:4px 2px">已显示前 ${shown.length} 条，共 ${pool.length} 条；用关键词或城市收窄范围。</div>`:"";
  return shown.map(radarItemHTML).join("")+more;
}
function radarPanelHTML(){
  const cities=radarCities();
  if(RADAR.city!=="all" && !cities.includes(RADAR.city)) RADAR.city="all";
  const pool=radarFiltered();
  const pend=pendingJobs().length;
  const chip=(dim,label,v)=>`<span class="chip click ${RADAR[dim]===v?'on':''}" data-dim="${dim}" data-v="${v}">${label}</span>`;
  const dirRow=`<div class="radar-frow"><b>方向</b>${chip("dir","全部","all")}${RADAR_DIRS.map(d=>chip("dir",d,d)).join("")}</div>`;
  const orgRow=`<div class="radar-frow"><b>企业</b>${chip("org","全部","all")}${["央企国企","大厂","私企","小公司"].map(o=>chip("org",o,o)).join("")}</div>`;
  return `<h3>${icon("target",16)} 岗位雷达 <span class="badge demo">动态抓取</span></h3>
    <div class="ph-sub">按方向聚合计算机 IT / 电子信息 / 自动化 / 物联网 / 嵌入式 / 材料与化工的公开校招岗位，央企国企、大厂、私企、小公司都在范围里；勾选后批量写入岗位库，公告类加入后会自动进入「补 JD」向导，把原文里的职责 / 要求写进两栏。</div>
    ${dirRow}${orgRow}
    <div class="radar-bar">
      <div class="search-box">${icon("search",15,2.2)}<input id="radar-q" placeholder="岗位 / 公司 / 关键词" value="${attr(RADAR.q)}"/></div>
      <select id="radar-city" aria-label="按城市筛选岗位"><option value="all"${RADAR.city==="all"?" selected":""}>全部城市</option>
        ${cities.map(c=>`<option value="${attr(c)}"${RADAR.city===c?" selected":""}>${esc(c)}</option>`).join("")}</select>
      <button class="btn sm" id="radar-fetch"${RADAR.loading?" disabled":""}>${icon("download",15)} ${RADAR.loading?"抓取中…":"抓取在线岗位"}</button>
      ${pend?`<button class="btn line sm" id="radar-jdfill">${icon("file",15)} 补 JD（${pend}）</button>`:""}
      <span class="spacer"></span>
      <span class="tiny" id="radar-count">${pool.length} 条符合</span>
      <button class="btn line sm" id="radar-all">全选本页</button>
      <button class="btn sm" id="radar-import">${icon("plus",15,2.4)} 加入岗位库（${RADAR.selected.size}）</button>
    </div>
    <div class="radar-status${RADAR.error?" err":""}" id="radar-status">${esc(radarStatusText())}</div>
    <div class="radar-list" id="radar-list">${radarListHTML(pool)}</div>`;
}
function radarRenderPanel(){
  const root=$("#radar"); if(!root) return;
  root.innerHTML=radarPanelHTML(); wireRadar();
}
function radarCountUpdate(){
  const b=$("#radar-import"); if(b) b.innerHTML=`${icon("plus",15,2.4)} 加入岗位库（${RADAR.selected.size}）`;
}
function radarById(rid){ return radarAll().find(x=>x.rid===rid)||null; }
/* 岗位雷达 · 详情弹窗：左「职位信息」、右「公司信息」，对齐招聘站职位详情页 */
function openRadarDetail(rid){
  const it=radarById(rid); if(!it) return;
  const job=(data.jobs||[]).find(j=>String(j.title||"").trim()===it.title && String(j.company||"").trim()===it.company);
  const hi=it.deadline?`截止 ${radarDay(it.deadline)}`:(it.type||"公告招聘");
  const facts=[
    ["城市", it.city||"—"],
    ["招聘项目", it.program||it.type||"—"],
    ["公告批次", [it.cohort,it.batch].filter(Boolean).join(" ")||"—"],
    ["所属方向", it.dir||"—"],
    ["学历要求", it.edu||"公告未标注"],
    ["截止时间", it.deadline||"未公布"],
    ["发布时间", it.date||"—"],
    ["信息来源", it.source||"公开校招公告"],
  ];
  const tags=(it.tags||[]).filter(Boolean);
  const coMeta=[it.org, it.industry||it.dir, it.kind].filter(Boolean);
  const ov=openModal(`<div class="rd-head">
      <div style="min-width:0">
        <div class="rd-t">${esc(it.title)}${it.demo?' <span class="badge demo">示例</span>':""}</div>
        <div class="rd-sub">${esc(it.company)} · ${esc(it.city)}${it.dir?` · ${esc(it.dir)}`:""}</div>
      </div>
      <div class="rd-hi">${esc(hi)}</div>
    </div>
    <div class="rd-acts">
      ${job?`<button class="btn sm" id="rd-open-job">${icon("briefcase",14)} 查看已入库岗位</button>`
           :`<button class="btn sm" id="rd-add">${icon("plus",14,2.4)} 加入岗位库</button>`}
      ${it.url?`<a class="btn line sm" href="${attr(it.url)}" target="_blank" rel="noopener">${icon("file",14)} 打开公告原文</a>`:""}
      <button class="btn ghost sm" id="rd-close">关闭</button>
    </div>
    <div class="rd-meta">
      <span>${icon("building",14)} ${esc(it.company)}</span>
      <span>${icon("target",14)} ${esc(it.type||"应届生 · 校招")}</span>
      <span>${icon("award",14)} ${esc(it.edu||"学历以公告为准")}</span>
      <span>${icon("calendar",14)} ${esc(it.deadline?`截止 ${radarDay(it.deadline)}`:"截止时间未公布")}</span>
    </div>
    <div class="rd-grid">
      <div>
        <div class="rd-h">${icon("briefcase",14)} 职位信息</div>
        <div class="rd-facts">${facts.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(radarStr(v,60))}</b></div>`).join("")}</div>
        ${it.desc?`<div class="rd-desc">${esc(it.desc)}</div>`:""}
        ${it.kind
          ? `<div class="rd-note"><b>关于岗位职责 / 任职要求：</b>这条目来自公开校招公告，原公告只写招聘项目与专业方向，没有逐条职位描述。加入岗位库后会进入「补 JD」向导：打开原文，把职责、要求两栏填进去，再做匹配分析。</div>`
          : ""}
      </div>
      <div>
        <div class="rd-card">
          <div class="rd-co"><span class="rlogo lg">${esc(radarStr(it.company,1)||"公")}</span>
            <div style="min-width:0"><b>${esc(it.company)}</b><div class="tiny">${esc(coMeta.join(" · ")||"企业信息未标注")}</div></div></div>
          <div class="rd-facts col">
            <div><span>企业类型</span><b>${esc(it.org||"未标注")}</b></div>
            <div><span>所属行业</span><b>${esc(it.industry||it.dir||"未标注")}</b></div>
            <div><span>工作城市</span><b>${esc(it.city||"—")}</b></div>
            <div><span>岗位方向</span><b>${esc(it.dir||"—")}</b></div>
          </div>
        </div>
        <div class="rd-card">
          <div class="rd-h">${icon("spark",14)} 关键词</div>
          <div class="chips" style="margin:0">${tags.length?tags.map(t=>`<span class="chip nice">${esc(radarStr(t,20))}</span>`).join(""):'<span class="tiny">公告未标注关键词</span>'}</div>
        </div>
      </div>
    </div>`, true);
  ov.querySelector("#rd-close").onclick=()=>ov.remove();
  const add=ov.querySelector("#rd-add");
  if(add) add.onclick=()=>{
    const r=radarImport([it]);
    const nid=(r.all||[])[0];
    ov.remove();
    toast(r.add?`已加入「${it.title}」`:`「${it.title}」已在岗位库`);
    if(!nid) return;
    if(it.kind) openJdWizard([nid]); else openJobCard(nid);
  };
  const openJob=ov.querySelector("#rd-open-job");
  if(openJob) openJob.onclick=()=>{ ov.remove(); openJobCard(job.id); };
}
function radarWireItems(){
  const wrap=$("#radar-list"); if(!wrap) return;
  wrap.querySelectorAll("input[data-pick]").forEach(cb=>cb.onchange=()=>{
    if(cb.checked) RADAR.selected.add(cb.dataset.pick); else RADAR.selected.delete(cb.dataset.pick);
    radarCountUpdate();
  });
  wrap.querySelectorAll("[data-radar-add]").forEach(b=>b.onclick=()=>{
    const it=radarAll().find(x=>x.rid===b.dataset.radarAdd); if(!it) return;
    const r=radarImport([it]);
    toast(r.add?`已加入「${it.title}」`:`「${it.title}」已在岗位库`);
    if(r.ids&&r.ids.length) openJdWizard(r.ids);
  });
  wrap.querySelectorAll("[data-open]").forEach(el=>{
    const open=()=>openRadarDetail(el.dataset.open);
    el.onclick=e=>{ if(e.target.closest("input,button,a,label")) return; open(); };
    el.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); open(); } };
  });
}
function wireRadar(){
  const root=$("#radar"); if(!root) return;
  root.querySelectorAll(".chip[data-dim]").forEach(el=>el.onclick=()=>{
    RADAR[el.dataset.dim]=el.dataset.v; radarRenderPanel();
  });
  const city=$("#radar-city"); if(city) city.onchange=()=>{ RADAR.city=city.value; radarRefresh(); };
  const q=$("#radar-q"); if(q) q.oninput=()=>{ RADAR.q=q.value; radarRefresh(); };
  const f=$("#radar-fetch"); if(f) f.onclick=()=>radarFetch(false);
  const all=$("#radar-all"); if(all) all.onclick=()=>{
    const boxes=[...root.querySelectorAll("#radar-list input[data-pick]")];
    const allOn=boxes.length>0 && boxes.every(b=>b.checked);
    boxes.forEach(b=>{ b.checked=!allOn; if(allOn) RADAR.selected.delete(b.dataset.pick); else RADAR.selected.add(b.dataset.pick); });
    radarCountUpdate();
  };
  const imp=$("#radar-import"); if(imp) imp.onclick=()=>radarImportSelected();
  const jf=$("#radar-jdfill"); if(jf) jf.onclick=()=>openJdWizard();
  radarWireItems();
}
function radarRefresh(){
  const pool=radarFiltered();
  const list=$("#radar-list"); if(list) list.innerHTML=radarListHTML(pool);
  const c=$("#radar-count"); if(c) c.textContent=`${pool.length} 条符合`;
  const st=$("#radar-status");
  if(st){ st.textContent=radarStatusText(); st.classList.toggle("err", !!RADAR.error); }
  radarCountUpdate(); radarWireItems();
}
async function radarFetch(auto){
  if(RADAR.loading) return;
  RADAR.loading=true; RADAR.error=""; radarRenderPanel();
  try{
    const ctl=new AbortController();
    const tm=setTimeout(()=>ctl.abort(), 30000);
    let res;
    try{ res=await fetch(RADAR_SRC.url,{signal:ctl.signal,cache:"default"}); }
    finally{ clearTimeout(tm); }
    if(!res.ok) throw new Error("HTTP "+res.status);
    const json=await res.json();
    const raw=Array.isArray(json)?json:(Array.isArray(json.jobs)?json.jobs:[]);
    const seen=new Set();
    const items=[];
    raw.forEach(row=>{
      const it=radarMapCampus(row);
      if(!it || seen.has(it.rid)) return;
      seen.add(it.rid); items.push(it);
    });
    if(!items.length) throw new Error("源里没有匹配这些方向的岗位");
    RADAR.online=items;
    RADAR.lastAt=items.reduce((a,x)=>x.date&&x.date>a?x.date:a, "")||(json&&json.generatedAt)||nowISO();
    RADAR.selected.clear();
    if(!auto) toast(`抓取到 ${items.length} 条校招岗位，按方向筛一筛`);
  }catch(e){
    RADAR.error=(e && e.name==="AbortError")?"请求超时":((e && e.message)||"网络错误");
    if(!auto) toast("在线抓取失败，已保留内置示例池");
  }finally{
    RADAR.loading=false; radarRenderPanel();
  }
}
function radarImport(items){
  let add=0, dup=0, notice=0;
  const ids=[], allIds=[];
  data.jobs=data.jobs||[];
  items.forEach(it=>{
    if(radarExists(it)){ dup++; return; }
    const jd=it.jd||`${it.title}｜${it.company}｜${it.city}\n关键词：${(it.tags||[]).join("、")}`;
    const rec={ id:uid("j"), createdAt:nowISO(), updatedAt:nowISO(),
      title:it.title, company:it.company, location:it.city==="地点未公布"?"":it.city,
      salary:it.salary||"", channel:it.kind?`岗位雷达 · ${it.kind}`:`岗位雷达 · ${it.source||"公开源"}`,
      deadline:it.deadline||"", status:"在投", jd, parsed:parseJD(jd),
      srcUrl:it.url||"", jdPending:!!it.kind, radarKind:it.kind||"" };
    data.jobs.unshift(rec); add++; allIds.push(rec.id); if(it.kind) ids.push(rec.id);
    if(it.kind) notice++;
  });
  if(add){
    if(!data.activeJobId) data.activeJobId=data.jobs[0].id;
    store.save(); render();
  }
  return {add,dup,notice,ids,all:allIds};
}
function radarImportSelected(){
  const items=radarAll().filter(x=>RADAR.selected.has(x.rid));
  if(!items.length){ toast("先勾选要加入的岗位"); return; }
  const r=radarImport(items);
  RADAR.selected.clear();
  toast(r.add
    ? `已加入 ${r.add} 条${r.dup?`，${r.dup} 条重复已跳过`:""}${r.notice?`；${r.notice} 条公告进入补 JD 向导`:""}`
    : "选中的岗位都已在库");
  if(r.add && r.ids.length) openJdWizard(r.ids);
  if(!r.add) radarRefresh();
}

/* ---------- 补 JD 向导：加入后逐条核对原文，把职责 / 要求写进两栏 ---------- */
const JDW={ids:[],idx:0,token:0};
function jobNeedsJd(j){
  if(!j||j.jdFilled) return false;
  if(j.jdPending) return true;
  return /岗位雷达/.test(j.channel||"") && !(j.parsed&&(j.parsed.duties||[]).length) && !(j.parsed&&(j.parsed.must||[]).length);
}
function pendingJobs(){ return (data.jobs||[]).filter(jobNeedsJd); }
function jobSrcUrl(j){
  if(j&&j.srcUrl) return j.srcUrl;
  const hit=(RADAR.online||[]).find(x=>j&&x.title===j.title&&x.company===j.company);
  return hit?hit.url:"";
}
function htmlToText(html){
  return String(html||"")
    .replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n").replace(/<\/(p|div|li|h\d|tr|section)>/gi,"\n")
    .replace(/<li[^>]*>/gi,"- ").replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/[ \t\u3000]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
async function fetchArticle(url, ms){
  const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(), ms||3500);
  try{
    const r=await fetch(url,{signal:ctl.signal,mode:"cors",credentials:"omit",cache:"no-store"});
    if(!r.ok) throw new Error("HTTP "+r.status);
    return htmlToText(await r.text());
  }catch(e){
    if(e&&e.name==="AbortError") throw new Error("请求超时");
    if(e&&(e.name==="TypeError"||/Failed to fetch|NetworkError/i.test(e.message||""))) throw new Error("原站不允许跨域读取");
    throw e;
  }finally{ clearTimeout(tm); }
}
const JDW_DUTY=/^(?:岗位|工作|职位|主要|具体)?(?:职责|描述|内容)|^(?:你将负责|你需要做)/;
const JDW_MUST=/^(?:任职|岗位|职位|应聘|招聘|专业|能力|素质|技能)(?:要求|资格|条件)|^我们希望|^加分项|^优先条件/;
const JDW_STOP=/^(?:福利|薪酬|薪资|待遇|公司介绍|关于我们|投递|简历投递|联系我们|工作地点|面试流程|招聘流程|培训|发展通道)/;
function jdwClean(l){
  return String(l||"").replace(/^[\d一二三四五六七八九十]+[.、)．]\s*/,"").replace(/^[-•·*●○▪]\s*/,"").replace(/^[（(]\d+[)）]\s*/,"").trim();
}
function splitDutyMust(text){
  let lines=String(text||"").replace(/\r/g,"").split(/\n+/).map(s=>s.replace(/[ \t\u3000]+/g," ").trim()).filter(Boolean);
  const expanded=[];
  lines.forEach(l=>{
    const m=l.match(/^([^：:]{2,24})[：:]\s*(\S.*)$/);
    if(m && (JDW_DUTY.test(m[1].trim())||JDW_MUST.test(m[1].trim())) && !/(负责|熟悉|精通|了解)/.test(m[1])) expanded.push(m[1].trim(), m[2].trim());
    else expanded.push(l);
  });
  lines=expanded;
  let dutyI=-1, mustI=-1;
  lines.forEach((l,i)=>{
    const t=l.replace(/[:：]\s*$/,"");
    if(t.length<=24 && dutyI<0 && JDW_DUTY.test(t)) dutyI=i;
    if(t.length<=24 && JDW_MUST.test(t) && (dutyI<0||i>dutyI) && mustI<0) mustI=i;
  });
  const grab=(from,to)=>{
    const out=[];
    for(let i=from;i<to;i++){
      const l=jdwClean(lines[i]);
      if(!l) continue;
      if(l.length<=20 && JDW_STOP.test(l)) break;
      if(JDW_DUTY.test(l)||JDW_MUST.test(l)) continue;
      if(l.length<4||l.length>140) continue;
      out.push(l.replace(/[。；;]\s*$/,""));
      if(out.length>=12) break;
    }
    return out;
  };
  let duties=[], must=[];
  if(dutyI>=0) duties=grab(dutyI+1, mustI>dutyI?mustI:lines.length);
  if(mustI>=0){
    let end=lines.length;
    for(let i=mustI+1;i<lines.length;i++){ if(lines[i].length<=20&&JDW_STOP.test(lines[i])){ end=i; break; } }
    if(dutyI>mustI && dutyI<end) end=dutyI;   // 「要求」写在「职责」之前时，到职责标题就截断
    must=grab(mustI+1, end);
  }
  if(!duties.length){
    duties=lines.map(jdwClean).filter(l=>l.length>=6&&l.length<=140&&/(负责|参与|协助|完成|推动|搭建|设计|开发|维护|跟进|支持|制定)/.test(l)).slice(0,10);
  }
  if(!must.length){
    must=lines.map(jdwClean).filter(l=>l.length>=6&&l.length<=140&&/(熟悉|精通|掌握|具备|熟练|以上|学历|专业|优先|加分|本科|硕士|大专)/.test(l)).slice(0,10);
  }
  const uniq=a=>[...new Set(a)];
  return {duties:uniq(duties),must:uniq(must)};
}
function openJdWizard(ids){
  const jobs=(ids&&ids.length? ids.map(getJob).filter(Boolean) : pendingJobs());
  if(!jobs.length){ toast("没有待补 JD 的岗位"); return; }
  JDW.ids=jobs.map(j=>j.id); JDW.idx=0; JDW.token++;
  let ov=document.querySelector(".overlay.jdw");
  if(!ov){ ov=openModal("", true); ov.classList.add("jdw"); }
  jdwRender(ov);
}
function jdwRender(ov){
  JDW.token++;
  const job=getJob(JDW.ids[JDW.idx]);
  if(!job){ jdwDone(ov); return; }
  const url=jobSrcUrl(job), total=JDW.ids.length, modal=ov.querySelector(".modal");
  modal.innerHTML=`<h3>补 JD · 第 ${JDW.idx+1} / ${total} 条</h3>
    <div class="sub">${esc(job.title)} · ${esc(job.company)} · ${esc(job.location||"地点未填")}${/岗位雷达/.test(job.channel||"")?" · 公告类":""}</div>
    <div class="jw-nav">
      ${url?`<button class="btn sm" id="jw-open">${icon("send",15)} 打开原文</button>`:""}
      ${url?`<button class="btn line sm" id="jw-auto">${icon("download",15)} 重新抓取</button>`:""}
      <span class="spacer"></span><span class="tiny" id="jw-status">${url?"准备抓取原文…":"没有原文链接，直接粘贴公告正文"}</span>
    </div>
    ${url?`<div class="jw-url">${esc(url)}</div>`:""}
    <div class="field"><label>公告正文</label><textarea id="jw-text" class="ta-lg" placeholder="点「打开原文」后把「岗位职责 / 任职要求」整段复制粘贴到这里；只粘这两段也可以"></textarea></div>
    <div class="field-row">
      <div class="field"><label>岗位职责</label><textarea id="jw-duty" style="min-height:120px;font-size:13px;line-height:1.7"></textarea></div>
      <div class="field"><label>任职要求</label><textarea id="jw-must" style="min-height:120px;font-size:13px;line-height:1.7"></textarea></div>
    </div>
    <div class="tiny" style="margin:-2px 0 10px">粘贴后自动拆分；识别不准可直接在两栏里改。保存时以这两栏为准，含「优先 / 加分」的行会自动归到加分项。</div>
    <div class="jw-nav" style="margin-top:4px">
      <button class="btn sm" id="jw-save">${icon("check",15)} 保存并下一条</button>
      <button class="btn line sm" id="jw-skip">跳过这条</button>
      <span class="spacer"></span>
      <button class="btn line sm" id="jw-close">关闭</button>
    </div>`;
  const st=modal.querySelector("#jw-status"), ta=modal.querySelector("#jw-text");
  const open=modal.querySelector("#jw-open");
  if(open) open.onclick=()=>{ window.open(url,"_blank","noopener"); if(st) st.textContent="已在浏览器打开，复制正文后粘贴到下面"; };
  const auto=modal.querySelector("#jw-auto"); if(auto) auto.onclick=()=>jdwAuto(ov);
  ta.oninput=()=>{
    clearTimeout(ov.__tm);
    ov.__tm=setTimeout(()=>jdwParse(ov), 380);
  };
  modal.querySelector("#jw-save").onclick=()=>jdwSave(ov);
  modal.querySelector("#jw-skip").onclick=()=>{ JDW.idx++; if(JDW.idx>=JDW.ids.length) jdwDone(ov); else jdwRender(ov); };
  modal.querySelector("#jw-close").onclick=()=>ov.remove();
  ["#jw-duty","#jw-must"].forEach(s=>{
    const el=modal.querySelector(s); if(el) el.addEventListener("input",()=>{ delete el.dataset.auto; });
  });
  if(job.jd && !/岗位雷达/.test(job.channel||"")) ta.value=job.jd;
  if(url) jdwAuto(ov);
  else jdwParse(ov);
}
async function jdwAuto(ov){
  const job=getJob(JDW.ids[JDW.idx]); if(!job) return;
  const url=jobSrcUrl(job), st=ov.querySelector("#jw-status"), token=JDW.token;
  if(!url||!st) return;
  st.textContent="正在直连抓取原文…";
  try{
    const text=await fetchArticle(url, 3500);
    if(token!==JDW.token||!document.body.contains(ov)) return;
    if(!text||text.length<160) throw new Error("页面没有可读正文（可能是图片公告）");
    const ta=ov.querySelector("#jw-text");
    if(ta && !ta.value.trim()) ta.value=text.slice(0,12000);
    jdwParse(ov);
    const s0=ov.querySelector("#jw-status");
    if(s0) s0.textContent="已自动抓取正文，核对两栏后保存";
  }catch(e){
    if(token!==JDW.token||!document.body.contains(ov)) return;
    const s=ov.querySelector("#jw-status");
    if(s) s.textContent=`直连抓取失败：${(e&&e.message)||"网络错误"} · 请点「打开原文」后复制正文粘贴`;
  }
}
function jdwParse(ov){
  const ta=ov.querySelector("#jw-text"), d=ov.querySelector("#jw-duty"), m=ov.querySelector("#jw-must");
  if(!ta||!d||!m) return;
  const text=ta.value.trim();
  if(text.length<30) return;
  const r=splitDutyMust(text);
  const set=(el,arr)=>{
    const next=arr.join("\n");
    if(el.value.trim() && el.value!==(el.dataset.auto||"")) return;   // 用户手改过的两栏不覆盖
    el.value=next;
    if(next) el.dataset.auto=next; else delete el.dataset.auto;
  };
  set(d,r.duties); set(m,r.must);
  const st=ov.querySelector("#jw-status");
  if(st) st.textContent=`识别出 ${r.duties.length} 条职责 / ${r.must.length} 条要求${(!r.duties.length&&!r.must.length)?" · 没找到小标题，可手动补":""}`;
}
function jdwLines(v){
  return String(v||"").split(/\n+/).map(s=>s.replace(/^[\d一二三四五六七八九十]+[.、)．]\s*/,"").replace(/^[-•·*]\s*/,"").trim()).filter(Boolean).slice(0,20);
}
function jdwSave(ov){
  const job=getJob(JDW.ids[JDW.idx]); if(!job) return;
  const text=(ov.querySelector("#jw-text")||{}).value||"";
  const duty=jdwLines((ov.querySelector("#jw-duty")||{}).value);
  const mustAll=jdwLines((ov.querySelector("#jw-must")||{}).value);
  if(!text.trim()&&!duty.length&&!mustAll.length){ toast("先粘贴公告正文，或直接填两栏"); return; }
  const body=(text.trim()||job.jd||"").slice(0,12000);
  const p=parseJD(body);
  p.duties=duty.length?duty:(p.duties||[]);
  const nice=[...new Set([...(p.nice||[]),...mustAll.filter(t=>/优先|加分|更佳/.test(t))])];
  p.must=mustAll.length?mustAll.filter(t=>!/优先|加分|更佳/.test(t)):(p.must||[]);
  p.nice=nice;
  job.jd=body; job.parsed=p; job.jdFilled=nowISO(); delete job.jdPending; job.updatedAt=nowISO();
  store.save();
  JDW.idx++;
  if(JDW.idx>=JDW.ids.length) jdwDone(ov, JDW.ids.length);
  else { render(); jdwRender(ov); }
}
function jdwDone(ov, done){
  if(ov&&ov.remove) ov.remove();
  render();
  const left=pendingJobs().length;
  toast(done?`补 JD 完成：${done} 条`:(left?`还剩 ${left} 条待补`:"补 JD 已完成"));
}

function isApplied(j){ return !!(j && (j.appliedAt || (j.applyLog && j.applyLog.length))); }
/* ---------------- 行业归类 ----------------
   雷达加入的岗位带公告源的行业字段（如「IT/互联网/游戏」），手动建的岗位没有。
   统一走这里：先看原始行业标签，再看公司 / 岗位 / JD 里的关键词，最后归「其他」。 */
const IND_OTHER="其他";
const INDUSTRY_RULES=[
  ["互联网/软件",/互联网|软件|电商|云计算|SaaS|游戏|社交|平台|人工智能|大数据|信息技术|计算机|\bIT\b/i],
  ["电子/半导体",/半导体|芯片|集成电路|电子|元器件|光电|光学|PCB|硬件/i],
  ["通信",/通信|运营商|5G|网络设备|光通信|华为|中兴/i],
  ["汽车",/汽车|整车|车载|自动驾驶|新能源车|主机厂/i],
  ["制造/机械",/制造|机械|装备|重工|工业|机床|机器人|精密|自动化/i],
  ["能源/化工",/能源|电力|电网|石化|化工|材料|新能源|电池|光伏|风电|环保|冶金/i],
  ["医药/医疗",/医药|医疗|生物|制药|器械|医院|健康|基因/i],
  ["金融",/金融|银行|证券|保险|基金|支付|资管|风控/i],
  ["教育",/教育|学校|培训|院校|学院|教师/i],
  ["建筑/地产",/建筑|地产|房地产|工程|设计院|施工|物业|建材/i],
  ["消费/零售",/消费品|零售|快消|食品|饮料|日化|服装|门店|餐饮/i],
  ["交通/物流",/物流|运输|航空|铁路|快递|供应链|仓储/i],
  ["咨询/服务",/咨询|会计|审计|律所|人力|外包|专业服务|广告|传媒/i],
];
function industryOf(j){
  if(!j) return IND_OTHER;
  const raw=String(j.industry||"");
  if(raw===IND_OTHER) return IND_OTHER;   // 手动选过「其他」就不要再被关键词改判
  for(const [name,re] of INDUSTRY_RULES) if(re.test(raw)) return name;
  if(raw && !INDUSTRY_RULES.some(([,re])=>re.test(raw))) return raw.slice(0,12);
  const scope=`${j.company||""} ${j.title||""} ${String(j.jd||"").slice(0,400)}`;
  for(const [name,re] of INDUSTRY_RULES) if(re.test(scope)) return name;
  return IND_OTHER;
}
function renderJobs(){
  const all=data.jobs||[]; const q=searchQ.trim().toLowerCase();
  const kq=q? all.filter(j=>(j.title+j.company+(j.jd||"")).toLowerCase().includes(q)):all;
  const base=kq.filter(j=> jobFilter==="all" ? true : jobFilter==="applied" ? isApplied(j) : !isApplied(j));
  const list=base.filter(j=> indFilter==="all" || industryOf(j)===indFilter);
  const appliedN=all.filter(isApplied).length;
  const indCounts={}; base.forEach(j=>{ const k=industryOf(j); indCounts[k]=(indCounts[k]||0)+1; });
  const indNames=[...new Set(kq.map(industryOf))].sort((a,b)=>(indCounts[b]||0)-(indCounts[a]||0));
  if(indFilter!=="all" && !indNames.includes(indFilter)) indNames.push(indFilter);
  const res=activeResume();
  $("#screen").innerHTML = headHTML("岗位库","每份 JD 都会被拆成结构化要求，作为简历改写的唯一依据",
      `<span class="badge">${all.length} 个岗位</span><button class="btn sm" id="btn-job-new" style="margin-left:10px">${icon("plus",15,2.4)} 新建岗位</button>`)
    + `<div class="toolbar"><div class="search-box">${icon("search",15,2.2)}<input id="job-search" placeholder="搜索岗位 / 公司 / JD 关键词" value="${attr(searchQ)}"/></div>
        <div class="spacer"></div><span class="tiny">当前简历：${res?esc(res.name):"未选择"}</span></div>`
    + `<div class="chips mt10" id="job-filter">
        <span class="chip click ${jobFilter==="all"?"on":""}" data-jf="all">全部 ${all.length}</span>
        <span class="chip click ${jobFilter==="todo"?"on":""}" data-jf="todo">未投递 ${all.length-appliedN}</span>
        <span class="chip click ${jobFilter==="applied"?"on":""}" data-jf="applied">已投递 ${appliedN}</span>
      </div>`
    + `<div class="chips mt8" id="ind-filter">
        <span class="chip click ${indFilter==="all"?"on":""}" data-ind="all">全部行业 ${base.length}</span>
        ${indNames.map(n=>`<span class="chip click ${indFilter===n?"on":""}" data-ind="${attr(n)}">${esc(n)} ${indCounts[n]||0}</span>`).join("")}
      </div>`
    + `<div class="panel-lg radar-panel" id="radar">${radarPanelHTML()}</div>`
    + (list.length? `<div class="job-list">${list.map(j=>jobCardHTML(j,res)).join("")}</div>`
      : emptyState("briefcase", indFilter!=="all" ? `「${indFilter}」下没有岗位` : (jobFilter==="applied"?"还没有投递记录":"没有符合条件的岗位"),
          indFilter!=="all" ? "换一个行业，或点「全部行业」看所有岗位。" : (jobFilter==="applied"?"点岗位卡片上的「一键投递」，打开官网后会自动记一笔。":"新建一个岗位，粘贴 JD 后即可开始匹配诊断。"),
          indFilter!=="all" ? "查看全部行业" : (jobFilter==="applied"?"查看全部岗位":"新建岗位"),
          indFilter!=="all" ? "ind-all" : (jobFilter==="applied"?"jf-all":"new-job")));
  wireJobs();
  if(!RADAR.online.length && !RADAR.loading && !RADAR.tried && navigator.onLine!==false){
    RADAR.tried=true; radarFetch(true);
  }
}
function jobCardHTML(j,res){
  const m=res?runMatch(j.id,res.id):null;
  const p=j.parsed||parseJD(j.jd||"");
  const pend=jobNeedsJd(j);
  const applied=isApplied(j);
  return `<div class="job-card" data-job="${j.id}">
    <div class="jh"><span class="logo">${icon("building",19)}</span>
      <div class="grow"><div class="jt">${esc(j.title)}</div><div class="jc">${esc(j.company)} · ${esc(j.location||"地点未填")}</div></div>
      ${j.id===data.activeJobId?'<span class="badge ok">当前</span>':""}
      ${pend?'<span class="badge warn">待补 JD</span>':""}
      ${applied?`<span class="badge ok">已投 ${esc(String(j.appliedAt||"").slice(5,10))}</span>`:""}</div>
    <div class="jm"><span>${icon("wallet",13)} ${esc(j.salary||"面议")}</span><span>${icon("clock",13)} ${esc(j.channel||"渠道未填")}</span><span>${icon("grid",13)} ${esc(industryOf(j))}</span><span>${icon("alert",13)} ${p.must.length} 条硬性要求</span></div>
    <div class="jf"><span class="score" style="color:${m?(m.score>=75?'var(--success)':m.score>=60?'var(--warning)':'var(--danger)'):'var(--text-tertiary)'}">${m?m.score:"—"}<small>分</small></span>
      <span class="badge">${esc(j.status||"在投")}</span><div class="spacer" style="flex:1"></div>
      ${pend?`<span class="btn line sm js-jd-fill" data-id="${j.id}" style="height:26px;padding:0 9px">${icon("file",13)} 补 JD</span>`:""}
      <span class="btn line sm js-apply" data-id="${j.id}" style="height:26px;padding:0 9px">${icon("send",13)} ${applied?"再投一次":"一键投递"}</span>
      <span class="tiny">${m?`覆盖 ${Math.round(m.coverage*100)}%`:"未匹配"}</span>
      <span class="iconbtn js-job-edit" data-id="${j.id}" style="width:28px;height:28px">${icon("pen",14)}</span></div></div>`;
}
function wireJobs(){
  wireRadar();
  const s=$("#job-search");
  if(s) s.oninput=()=>{ searchQ=s.value; const pos=s.selectionStart; renderJobs(); const n=$("#job-search"); if(n){ n.focus(); n.setSelectionRange(pos,pos); } };
  const nb=$("#btn-job-new"); if(nb) nb.onclick=()=>openJobForm(null);
  $("#screen").querySelectorAll("[data-act='new-job']").forEach(el=>el.onclick=()=>openJobForm(null));
  $("#screen").querySelectorAll("[data-job]").forEach(el=>el.onclick=e=>{
    if(e.target.closest(".js-job-edit")) return;
    openJobCard(el.dataset.job);
  });
  $("#screen").querySelectorAll(".js-job-edit").forEach(el=>el.onclick=e=>{
    e.stopPropagation(); openJobForm(getJob(el.dataset.id));
  });
  $("#screen").querySelectorAll(".js-jd-fill").forEach(el=>el.onclick=e=>{
    e.stopPropagation(); openJdWizard([el.dataset.id]);
  });
  $("#screen").querySelectorAll(".js-apply").forEach(el=>el.onclick=e=>{
    e.stopPropagation(); oneClickApply(el.dataset.id);
  });
  $("#screen").querySelectorAll("#job-filter .chip").forEach(el=>el.onclick=()=>{
    jobFilter=el.dataset.jf; renderJobs();
  });
  $("#screen").querySelectorAll("#ind-filter .chip").forEach(el=>el.onclick=()=>{
    indFilter=el.dataset.ind; renderJobs();
  });
  $("#screen").querySelectorAll("[data-act='ind-all']").forEach(el=>el.onclick=()=>{
    indFilter="all"; renderJobs();
  });
}
/* ---------------- 一键投递 ----------------
   单文件网页无法代替你在官网上提交（跨域 + 需要登录），所以这里做的是：
   1) 尽最大可能在本地找出「官网 / 公告原文」链接，一次点击直接打开；
   2) 没有链接时给出填写链接、按公司+岗位搜索、复制投递素材三条出路；
   3) 无论走哪条，都记一笔投递时间与入口，岗位库可按「已投递」筛。
*/
const APPLY_URL_RE=/https?:\/\/[^\s"'<>()（）【】\]]+/i;
function applyLinkOf(j){
  const list=[["官网链接",j.url],["公告原文",j.srcUrl],["公告原文",j.applyUrl]];
  for(const [kind,v] of list){
    const s=String(v||"").trim();
    if(/^https?:\/\//i.test(s)) return {url:s, kind};
  }
  const m=String((j&&j.jd)||"").match(APPLY_URL_RE);
  if(m) return {url:m[0].replace(/[.,;，。；、]+$/,""), kind:"JD 里的链接"};
  return null;
}
function applySearchURL(j){
  const q=[j.company,j.title,"官网","招聘","投递"].filter(Boolean).join(" ");
  return "https://cn.bing.com/search?q="+encodeURIComponent(q);
}
function applyMaterial(j){
  const res=activeResume();
  const m=res?runMatch(j.id,res.id):null;
  const p=j.parsed||parseJD(j.jd||"");
  const cover=m?`匹配分 ${m.score} / 要求覆盖 ${Math.round(m.coverage*100)}%`:"尚未做匹配分析";
  const hit=(m&&m.matchedSkills&&m.matchedSkills.length)?m.matchedSkills.slice(0,6).join("、"):(p.skills||[]).slice(0,6).join("、");
  return [
    `【投递素材】${j.company||"未填公司"} · ${j.title||"未填岗位"}`,
    `${cover}${hit?`｜匹配点：${hit}`:""}`,
    res&&res.summary?`个人简介：${res.summary}`:"",
    `投递时间：${new Date().toLocaleString("zh-CN")}`,
    "（粘贴到官网表单的「自我评价 / 备注」栏；数字与事实以简历原文为准）",
  ].filter(Boolean).join("\n");
}
function markApplied(j, url, method){
  j.applyLog=j.applyLog||[];
  j.applyLog.unshift({at:nowISO(), url:url||"", method:method||"官网"});
  j.applyLog=j.applyLog.slice(0,20);
  j.appliedAt=j.applyLog[0].at;
  j.applyUrl=url||"";
  j.applyMethod=method||"官网";
  const from=stageOf(j.status);
  j.status="已投递";
  j.stage="applied";
  if(!Array.isArray(j.events)) j.events=[];
  j.events.unshift({ at:j.appliedAt, type:"applied", from, to:"applied", url:url||"", method:method||"官网" });
  j.events=j.events.slice(0,80);
  store.save();
}
function openApplyModal(j){
  const target=applyLinkOf(j);
  const search=applySearchURL(j);
  const ov=openModal(`<h3>投递「${esc(j.title)}」</h3>
    <div class="sub">${esc(j.company||"未填公司")}${j.location?" · "+esc(j.location):""} · 岗位库没有收录官网链接，选一条路继续</div>
    <div class="field"><label>官网 / 投递页链接</label>
      <input id="ap-url" value="${attr(j.url||"")}" placeholder="https://公司官网/careers/岗位ID"/>
      <div class="tiny" style="margin-top:6px">粘贴招聘官网或公告页地址，保存后这个岗位以后就是「一键直达」。</div></div>
    <div class="field-row">
      <button class="btn line sm" id="ap-save">${icon("send",14)} 保存并打开</button>
      <button class="btn line sm" id="ap-search">${icon("search",14)} 按公司 + 岗位搜索</button>
      <button class="btn line sm" id="ap-copy">${icon("file",14)} 复制投递素材</button>
    </div>
    <div class="note-line tiny">搜索是用必应打开「公司 + 岗位 + 官网 + 投递」，结果里认准公司自有域名（如 careers.xxx.com / xxx.com/jobs），别在第三方页面填身份证号。</div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="ap-cancel">关闭</button></div>`, true);
  const done=(url,method)=>{
    markApplied(j, url, method);
    ov.remove(); render();
  };
  ov.querySelector("#ap-save").onclick=()=>{
    const v=ov.querySelector("#ap-url").value.trim();
    if(!/^https?:\/\//i.test(v)){ toast("链接要以 http:// 或 https:// 开头"); return; }
    if(!confirm("确认这个链接是公司自有招聘页？打开后请在官网完成投递。")) return;
    window.open(v,"_blank","noopener,noreferrer");
    j.url=v; done(v,"官网");
    toast("已打开官网，投递完成后回来记一笔");
  };
  ov.querySelector("#ap-search").onclick=()=>{
    window.open(search,"_blank","noopener,noreferrer");
    done("","搜索");
    toast("已打开搜索结果，认准公司自有域名再投");
  };
  ov.querySelector("#ap-copy").onclick=()=>copyText(applyMaterial(j));
  ov.querySelector("#ap-cancel").onclick=()=>ov.remove();
}
function oneClickApply(id){
  const j=getJob(id); if(!j) return;
  const target=applyLinkOf(j);
  if(!target){ openApplyModal(j); return; }
  if(target.kind==="公告原文" && !j.url){
    // 公告页不一定有逐条岗位，先让用户确认再打开，避免以为已投递
    const ov=openModal(`<h3>打开公告原文投递</h3>
      <div class="sub">${esc(j.company)} · ${esc(j.title)}</div>
      <div class="note-line">这条岗位来自公开校招公告，链接是<strong>公告页</strong>而不是岗位详情页。公告页里通常有网申入口或投递邮箱，打开后按页面指引投递。</div>
      <div class="pane" style="word-break:break-all;font-size:12px">${esc(target.url)}</div>
      <div class="field mt12"><label>如果已经拿到岗位详情页，可粘在这里（下次就能直达）</label>
        <input id="ap-url2" value="${attr(j.url||"")}" placeholder="https://..."/></div>
      <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="ap2-cancel">取消</button>
        <button class="btn" id="ap2-open">${icon("send",15)} 打开并记为已投</button></div>`, true);
    ov.querySelector("#ap2-cancel").onclick=()=>ov.remove();
    ov.querySelector("#ap2-open").onclick=()=>{
      const v=ov.querySelector("#ap-url2").value.trim();
      const url=/^https?:\/\//i.test(v)?v:target.url;
      if(/^https?:\/\//i.test(v)) j.url=v;
      window.open(url,"_blank","noopener,noreferrer");
      markApplied(j, url, j.url?"官网":"公告原文");
      ov.remove(); render();
      toast("已打开投递页，并按「已投递」记了一笔");
    };
    return;
  }
  if(!confirm(`打开「${j.company}」官网投递页？\n${target.url}`)) return;
  window.open(target.url,"_blank","noopener,noreferrer");
  markApplied(j, target.url, target.kind);
  render();
  toast(`已打开${target.kind}，投递完成后可在详情里补记录`);
}
function openJobForm(job){
  const d=job||{title:"",company:"",location:"",salary:"",channel:"",deadline:"",status:"在投",industry:"",jd:""};
  const p=(job&&job.parsed)||(job&&job.jd?parseJD(job.jd):null);
  const dutyInit=p?p.duties.join("\n"):"";
  const mustInit=p?p.must.join("\n"):"";
  const ov=openModal(`<h3>${job?"编辑岗位":"新建岗位"}</h3><div class="sub">JD 会在这里被拆成职责、硬性要求和加分项；职责 / 任职要求两栏可直接改</div>
    <div class="field-row three">
      <div class="field"><label>岗位名称</label><input id="jf-title" value="${attr(d.title)}" placeholder="高级数据分析师"/></div>
      <div class="field"><label>公司</label><input id="jf-company" value="${attr(d.company)}" placeholder="星野科技"/></div>
      <div class="field"><label>地点</label><input id="jf-loc" value="${attr(d.location)}" placeholder="上海 · 徐汇"/></div></div>
    <div class="field-row three">
      <div class="field"><label>薪资</label><input id="jf-salary" value="${attr(d.salary)}" placeholder="25-40K"/></div>
      <div class="field"><label>渠道</label><input id="jf-channel" value="${attr(d.channel)}" placeholder="内推 / BOSS"/></div>
      <div class="field"><label>截止日</label><input id="jf-deadline" type="date" value="${attr(d.deadline)}"/></div></div>
    <div class="field"><label>官网 / 投递链接</label>
      <input id="jf-url" value="${attr(d.url||"")}" placeholder="https://公司官网/careers/岗位ID"/>
      <div class="tiny" style="margin-top:6px">填了就能在岗位卡片上一键直达投递页；留空时会在 JD 原文里找一个链接。</div></div>
    <div class="field"><label>行业</label>
      <select id="jf-ind">
        <option value="">自动判断（${esc(industryOf(d))}）</option>
        ${INDUSTRY_RULES.map(([n])=>`<option value="${attr(n)}" ${d.industry===n?"selected":""}>${esc(n)}</option>`).join("")}
        <option value="${IND_OTHER}" ${d.industry===IND_OTHER?"selected":""}>${IND_OTHER}</option>
      </select>
      <div class="tiny" style="margin-top:6px">按公司 / 岗位 / JD 关键词自动归类；归错了可以在这里手动指定，岗位库顶部按行业筛选。</div></div>
    <div class="field"><label>状态</label><div class="seg" id="jf-status">
      ${["在投","已投递","面试中","已offer","已挂"].map(s=>`<div class="opt ${s===(d.status||"在投")?'on':''}" data-v="${s}">${s}</div>`).join("")}</div></div>
    <div class="field-row">
      <div class="field"><label>岗位职责</label><textarea id="jf-duty" style="min-height:118px;font-size:13px;line-height:1.7" placeholder="一行一条；粘贴 JD 后点下方「回填到上方各栏」会自动填入">${esc(dutyInit)}</textarea></div>
      <div class="field"><label>任职要求</label><textarea id="jf-must" style="min-height:118px;font-size:13px;line-height:1.7" placeholder="一行一条；含「优先 / 加分」的会归到加分项">${esc(mustInit)}</textarea></div>
    </div>
    <div class="tiny" style="margin:-2px 0 10px">这两栏会直接用于匹配分析；留空时按 JD 原文自动解析，填了就以这两栏为准。</div>
    <div class="field"><label>JD 原文</label><textarea id="jf-jd" class="ta-lg" placeholder="把招聘网站上的岗位描述整段粘贴进来，或点下面按钮上传…">${esc(d.jd||"")}</textarea>
      <div class="import-row">
        <button class="btn line sm" id="jf-import">${icon("upload",14)} 上传 JD 文件 / 截图</button>
        <button class="btn sm" id="jf-fill">${icon("spark",14)} 回填到上方各栏</button>
        <span class="tiny">Word(.docx)、PDF、图片、TXT · 也可直接拖进上面的框 · 识别后点「回填到上方各栏」</span>
      </div>
      <div class="import-status tiny"></div>
      <div class="modal-note">支持“岗位职责 / 任职要求 / 加分项”分段。保存后自动解析；点「回填到上方各栏」会把职责和要求同步填进上面两栏。</div></div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="jf-cancel">取消</button>
      <button class="btn" id="jf-save">${job?"保存":"解析并保存"}</button></div>`, true);
  ov.querySelectorAll(".seg .opt").forEach(o=>o.onclick=()=>{ ov.querySelectorAll(".seg .opt").forEach(x=>x.classList.remove("on")); o.classList.add("on"); });
  const indSel=ov.querySelector("#jf-ind"), indAuto=indSel.options[0];
  const refreshInd=()=>{ indAuto.textContent=`自动判断（${industryOf({industry:(job&&job.industry)||"",company:ov.querySelector("#jf-company").value,title:ov.querySelector("#jf-title").value,jd:ov.querySelector("#jf-jd").value})}）`; };
  ["#jf-title","#jf-company","#jf-jd"].forEach(s=>ov.querySelector(s).addEventListener("input",refreshInd));
  ["#jf-duty","#jf-must"].forEach(s=>{
    const el=ov.querySelector(s); if(!el) return;
    if(el.value.trim()) el.dataset.auto=el.value;   // 记下自动解析值，方便重新回填时覆盖
    el.addEventListener("input",()=>{ delete el.dataset.auto; });
  });
  wireImport("#jf-import","#jf-jd","jd",ov);
  ov.querySelector("#jf-fill").onclick=()=>{
    const text=ov.querySelector("#jf-jd").value;
    if(!text.trim()){ toast("先上传或粘贴 JD 文本"); return; }
    const r=autofillJob(text,ov);
    const u=ov.querySelector("#jf-url");
    if(u && !u.value.trim()){
      const m=text.match(APPLY_URL_RE);
      if(m){ u.value=m[0].replace(/[.,;，。；、]+$/,""); r.n++; }
    }
    toast(r.n ? `已回填 ${r.n} 个空栏，请核对`
      : r.detected ? "没有空栏可填，已填内容不会被覆盖"
      : "没识别到岗位名称 / 地点 / 薪资，检查 JD 开头是否完整");
  };
  ov.querySelector("#jf-cancel").onclick=()=>ov.remove();
  ov.querySelector("#jf-save").onclick=()=>{
    const val=id=>ov.querySelector(id).value;
    const linesOf=sel=>String(val(sel)||"").split(/\r?\n/)
      .map(s=>s.replace(/^[\d一二三四五六七八九十]+[.、)．]\s*/,"").replace(/^[-•·*]\s*/,"").trim())
      .filter(Boolean);
    const title=val("#jf-title").trim(), jd=val("#jf-jd").trim();
    const duty=linesOf("#jf-duty"), must=linesOf("#jf-must");
    if(!title){ toast("先填岗位名称"); return; }
    const src=[jd,duty.join("\n"),must.join("\n")].filter(Boolean).join("\n");
    if(src.length<20){ toast("JD 太短了，复制完整一点更准"); return; }
    const parsed=parseJD(jd||src);
    if(duty.length) parsed.duties=duty;
    if(must.length) parsed.must=must;
    const rec=job||{id:uid("j"),createdAt:nowISO()};
    const prevStatus=rec.status||"在投";
    Object.assign(rec,{title,company:val("#jf-company").trim()||"未填公司",location:val("#jf-loc").trim(),
      salary:val("#jf-salary").trim(),channel:val("#jf-channel").trim(),deadline:val("#jf-deadline"),
      url:val("#jf-url").trim(),
      industry:val("#jf-ind").trim()||(job&&job.industry)||"",
      status:ov.querySelector("#jf-status .on")?.dataset.v||"在投",jd,parsed,updatedAt:nowISO()});
    /* 阶段是 status 的派生值：编辑时改了状态就补一条时间线 */
    if(!Array.isArray(rec.events)) rec.events=[];
    const fromStage=stageOf(prevStatus), toStage=stageOf(rec.status);
    rec.stage=toStage;
    if(fromStage!==toStage){
      rec.events.unshift({ at:nowISO(), type:"stage", from:fromStage, to:toStage, note:"编辑岗位时修改" });
      rec.events=rec.events.slice(0,80);
      if(toStage!=="todo" && !rec.appliedAt) rec.appliedAt=nowISO();
    }
    if(!job) data.jobs.unshift(rec);
    data.activeJobId=rec.id; store.save(); ov.remove();
    toast(`已解析 ${parsed.must.length} 条硬性要求 / ${parsed.nice.length} 条加分项`); render();
  };
}
function openJobDetail(id){
  const j=getJob(id); if(!j) return;
  const p=j.parsed||parseJD(j.jd||"");
  const target=applyLinkOf(j), applied=isApplied(j), logs=(j.applyLog||[]).slice(0,4);
  const ov=openModal(`<h3>${esc(j.title)}</h3><div class="sub">${esc(j.company)} · ${esc(j.location||"未填")} · ${esc(j.salary||"面议")} · ${esc(industryOf(j))}</div>
    <div class="field-row three mt12">
      <div class="pane"><h4>${icon("briefcase",14)} 硬性要求</h4><div class="tiny">${p.must.length} 条</div></div>
      <div class="pane"><h4>${icon("spark",14)} 加分项</h4><div class="tiny">${p.nice.length} 条</div></div>
      <div class="pane"><h4>${icon("activity",14)} 职责</h4><div class="tiny">${p.duties.length} 条</div></div>
    </div>
    <div class="field"><label>投递</label>
      <div class="pane" style="padding:11px 12px">
        <div class="tiny" style="margin-bottom:9px">${target
          ? `${esc(target.kind)} · <span style="word-break:break-all">${esc(target.url)}</span>`
          : "还没收录可直达的投递链接：可以现在填官网链接，或按「公司 + 岗位」去搜官网。"}</div>
        <div class="chips" style="margin:0">
          <span class="chip click" id="jd-apply">${icon("send",13)} ${applied?"再投一次":"一键投递"}</span>
          <span class="chip click" id="jd-copy">${icon("copy",13)} 复制投递素材</span>
          ${target?"":`<span class="chip click" id="jd-find">${icon("search",13)} 搜官网</span>`}
        </div>
        ${logs.length?`<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">${logs.map(l=>
          `<div class="tiny" style="display:flex;gap:10px;padding:2px 0"><span style="font-family:var(--mono,monospace)">${esc(String(l.at||"").replace("T"," ").slice(0,16))}</span><span>${esc(l.method||"官网")}</span></div>`).join("")}</div>`:""}
        <div class="tiny" style="margin-top:8px">一键投递只负责把官网投递页打开并记一笔，不会替你提交表单。</div>
      </div></div>
    <div class="field"><label>技能关键词（自动提取）</label><div class="chips">${p.skills.length?p.skills.map(s=>`<span class="chip hit">${esc(s)}</span>`).join(""):'<span class="tiny">未识别到技能词</span>'}</div></div>
    <div class="field"><label>任职要求原文</label><div class="pane scroll" style="max-height:220px">${(p.must.length?p.must:["未解析到要求段落，请检查 JD 格式"]).map(t=>`<div style="font-size:12.5px;line-height:1.7;padding:4px 0;border-bottom:1px solid var(--border)">${esc(t)}</div>`).join("")}</div></div>
    <div class="field"><label>岗位职责</label><div class="pane scroll" style="max-height:180px">${p.duties.map(t=>`<div style="font-size:12.5px;line-height:1.7;padding:4px 0">· ${esc(t)}</div>`).join("")||'<span class="tiny">未识别</span>'}</div></div>
    <div class="field"><label>推进记录</label><div class="pane scroll" style="max-height:180px">
      ${(j.events||[]).length? (j.events||[]).slice(0,8).map(e=>
        `<div class="ev-row"><span class="ev-t">${esc(String(e.at||"").replace("T"," ").slice(5,16))}</span>
          <span class="ev-x">${esc(jobEventText(e))}</span></div>`).join("")
        : '<span class="tiny">还没有记录。去投递看板拖动卡片或改阶段，这里会自动记一条。</span>'}
    </div></div>
    <div class="modal-actions"><button class="link-danger" id="jd-del">删除</button><div class="spacer"></div>
      <button class="btn ghost" id="jd-edit">编辑</button>
      <button class="btn line" id="jd-set">设为当前岗位</button>
      <button class="btn" id="jd-go">去匹配分析</button></div>`, true);
  ov.querySelector("#jd-edit").onclick=()=>{ ov.remove(); openJobForm(j); };
  ov.querySelector("#jd-apply").onclick=()=>{ ov.remove(); oneClickApply(j.id); };
  ov.querySelector("#jd-copy").onclick=()=>copyText(applyMaterial(j));
  const findBtn=ov.querySelector("#jd-find");
  if(findBtn) findBtn.onclick=()=>window.open(applySearchURL(j),"_blank","noopener,noreferrer");
  ov.querySelector("#jd-set").onclick=()=>{ data.activeJobId=j.id; store.save(); ov.remove(); toast("已设为当前岗位"); render(); };
  ov.querySelector("#jd-go").onclick=()=>{ data.activeJobId=j.id; store.save(); ov.remove(); go("match"); };
  ov.querySelector("#jd-del").onclick=()=>{
    const rec=trashDelete("jobs", j.id, ()=>{
      if(data.activeJobId===j.id) data.activeJobId=(data.jobs[0]||{}).id||null;
    });
    if(!rec) return;
    ov.remove(); render();
    undoToast(rec, j.title||"未填岗位");
  };
  return ov;
}
