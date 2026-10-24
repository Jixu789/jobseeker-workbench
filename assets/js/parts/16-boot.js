/* ============================================================
   JOBSEARCH · 首次运行整形
   ============================================================ */
function ensureShape(){
  data.jobs = data.jobs || [];
  data.resumes = data.resumes || [];
  data.sessions = data.sessions || [];
  data.todo = data.todo || [];
  data.note = data.note || [];
  data.settings = Object.assign({ engine:"local", baseUrl:"https://api.openai.com/v1", apiKey:"", model:"gpt-4o-mini" }, data.settings||{});
  data.reverse = Object.assign({ extra:[] }, data.reverse||{});
  data.tailor = data.tailor || {};   /* 每个岗位独立的定制会话：版本、决策、补充信息 */
  data.trash = data.trash || [];
  trashClean();   /* 启动时清掉超过 30 天的回收站条目 */
  /* 只有「从没建过」时才补示例；用户把最后一条删进回收站时不再自动冒出来 */
  if(!data.jobs.length && !data.trash.some(t=>t.key==="jobs")){
    const j = demoJob(); j.demo = true; j.parsed = parseJD(j.jd); data.jobs.push(j);
  }
  if(!data.resumes.length && !data.trash.some(t=>t.key==="resumes")){
    const r = demoResume(); r.demo = true; data.resumes.push(r);
  }
  if(!data.activeJobId) data.activeJobId = (data.jobs[0]||{}).id || null;
  if(!data.activeResumeId) data.activeResumeId = (data.resumes[0]||{}).id || null;
  store.save();
}

/* __JOBSEARCH_BLOCK__ */
ensureShape();
/* 首次进入补一个默认 hash；之后一切渲染都由 hashchange/applyRoute 驱动 */
if(!/^#\//.test(location.hash||"")) history.replaceState(null,"",hrefOf("home"));
buildNav();
applyRoute();
wireDrawer();
maybePrivacyIntro();
maybeOnboarding();
wechatTip();
maybeHealthTip();
/* 键盘用户跳过侧栏：Tab 第一下出现「跳到主内容」 */
const skipBtn=$("#skip-link");
if(skipBtn) skipBtn.onclick=()=>{
  const m=$("#main");
  if(m){ try{ m.focus({preventScroll:true}); }catch(e){ m.focus(); } window.scrollTo({top:0}); }
};
/* PWA：仅 http/https 下注册（file:// 打开时跳过，避免报错） */
if("serviceWorker" in navigator && /^https?:$/.test(location.protocol)){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  });
}
