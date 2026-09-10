/*
 * Vantras EHS Academy — database-backed detail workspaces.
 *
 * This file intentionally contains only cross-portal detail behavior. Core learning,
 * course, live-session and assessment flows remain in app.js. Keeping this concern
 * separate makes status filters, record details and workflow actions reusable.
 */

const DETAIL_META = {
  trainer: {
    assessments:{title:'Assessment Studio',desc:'Review assessment setup, attempts, score rules and course coverage.',icon:'assessment',kpis:[['Assessments','46'],['Question Bank','486'],['Average Score','84.6%']]},
    questionbank:{title:'Question Bank',desc:'Review reusable questions by course, topic, difficulty, usage and answer purpose.',icon:'exam',kpis:[['Questions','486'],['Courses','18'],['Hard','144']]},
    assignments:{title:'Assignments Overview',desc:'Open every assignment to inspect submissions, grading, rubrics, pending work and resubmissions.',icon:'upload',kpis:[['Open','14'],['Graded','128'],['Resubmit','6']]},
    certificates:{title:'Recently Issued & Eligibility',desc:'Check issued, pending, revoked and eligible certificate records, including the exact problem and next action.',icon:'certificate',kpis:[['Issued','8'],['Pending','5'],['Eligible','4'],['Revoked','2']]},
    library:{title:'Content Library',desc:'Inspect course files, versions, access rules and publishing status.',icon:'resource',kpis:[['Files','248'],['Videos','64'],['Templates','92']]},
    feedback:{title:'Feedback Overview',desc:'Open every learner response, see new/open/responded status and reply context.',icon:'message',kpis:[['Responses','386'],['New','24'],['Rating','4.8★']]},
    reports:{title:'Reports',desc:'Open reporting definitions and export evidence for learning outcomes.',icon:'report'},
    messages:{title:'Messages & Batch Discussions',desc:'Open batch discussions and direct learner threads inside the portal.',icon:'message',kpis:[['Unread','7'],['Threads','42'],['Batches','9']]},
    calendar:{title:'Calendar',desc:'Inspect sessions, deadlines and internal course milestones.',icon:'calendar'},
    profile:{title:'My Profile',desc:'Review professional profile, specializations and availability.',icon:'profile'}
  },
  corporate: {
    assessments:{title:'Assessments',desc:'Inspect assigned employees, completion, pending attempts, score rules and deadlines.',icon:'assessment',kpis:[['Assigned','49'],['Completed','40'],['Avg Score','82%']]},
    certificates:{title:'Certificates',desc:'Maintain workforce training evidence, validity, expiry risk and downloadable credentials.',icon:'certificate',kpis:[['Valid','33'],['Expiring Soon','4'],['Courses','7']]},
    resources:{title:'Resource Library',desc:'Inspect shared corporate resources, versions, access and usage.',icon:'resource',kpis:[['Resources','48'],['Shared','31'],['Downloads','226']]},
    requests:{title:'Training Requests',desc:'Inspect business need, employee scope, approval state and next action.',icon:'message',kpis:[['Open','3'],['Approved','5'],['Completed','12']]},
    notifications:{title:'Notifications',desc:'Review training reminders, certificate notices and program updates.',icon:'bell'}
  },
  admin: {
    categories:{title:'Categories',desc:'Organize the course catalogue into clear EHS learning domains and inspect every category mapping.',icon:'resource',kpis:[['Categories','8'],['Published','18'],['With Courses','8']]},
    approvals:{title:'Course Approvals',desc:'Review every trainer submission, content completion, assessment coverage, review notes and approval outcome.',icon:'shield',kpis:[['Pending','3'],['Approved','21'],['Returned','2']]},
    enrollments:{title:'Enrollment Management',desc:'Review learner access, progress, payment verification, join date and last activity for every enrollment.',icon:'learn',kpis:[['Active','219'],['Completed','164'],['New','28']]},
    assessments:{title:'Assessment Management',desc:'Govern assessment rules and inspect attempts, averages, pass rules, question counts and result behavior.',icon:'assessment',kpis:[['Assessments','46'],['Attempts','2,846'],['Avg Score','84.6%']]},
    questionbank:{title:'Question Bank Overview',desc:'Inspect question coverage across courses, topics, difficulty and assessment usage.',icon:'exam',kpis:[['Questions','486'],['Courses','18'],['Hard','144']]},
    exams:{title:'Exam Management',desc:'Inspect scheduled, active and completed final examinations, attempts, pass rules and result release.',icon:'exam',kpis:[['Scheduled','6'],['Active','2'],['Completed','34']]},
    certificates:{title:'Certificate Management',desc:'Inspect valid, expiring, pending, revoked and eligible credentials with problem and next-action fields.',icon:'certificate',kpis:[['Valid','33'],['Expiring Soon','4'],['Pending','6'],['Eligible','5']]},
    refunds:{title:'Refunds',desc:'Inspect refund reason, value and workflow status.',icon:'payment'},
    coupons:{title:'Coupons',desc:'Inspect discount rules, validity and campaign status.',icon:'coupon'},
    invoices:{title:'Invoices',desc:'Inspect invoice evidence and transaction status.',icon:'resource'},
    corporate:{title:'Corporate Management',desc:'Inspect corporate accounts, employees and training program status.',icon:'company'},
    sessions:{title:'Live Sessions',desc:'Inspect scheduled sessions, attendance and recording state.',icon:'live'},
    resources:{title:'Resources',desc:'Inspect academy learning resources, access and publication status.',icon:'resource'},
    content:{title:'CMS / Blog',desc:'Inspect website knowledge content and publishing workflow.',icon:'message'},
    notifications:{title:'Notifications',desc:'Inspect communication campaigns and delivery status.',icon:'bell'},
    support:{title:'Support Tickets',desc:'Inspect support requests, priority and resolution state.',icon:'support'},
    audit:{title:'Audit Logs',desc:'Inspect administrative and security audit events.',icon:'audit'},
    security:{title:'Security',desc:'Inspect security controls and required actions.',icon:'shield'},
    roles:{title:'Roles & Permissions',desc:'Inspect access boundaries and role status.',icon:'users'},
    settings:{title:'System Settings',desc:'Inspect platform configuration areas and readiness.',icon:'settings'}
  }
};

const detailState = {role:'',feature:'',status:'All',search:'',records:[],counts:{},meta:null,freshAccount:false};

function humanKey(key){
  return String(key||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function statusClass(s){
  const x=String(s||'').toLowerCase();
  if(/valid|approved|issued|completed|published|healthy|active|eligible|ready|responded|recorded/.test(x))return 'good';
  if(/pending|review|scheduled|open|new|expir|planning|configuration|action/.test(x))return 'warn';
  if(/revoked|returned|critical|expired|failed/.test(x))return 'bad';
  return 'neutral';
}
function getDetailMeta(role,feature){return DETAIL_META?.[role]?.[feature]||null}

async function renderDetailWorkspace(el, role, feature){
  const meta=getDetailMeta(role,feature);
  if(!meta)return false;
  detailState.role=role; detailState.feature=feature; detailState.meta=meta;
  await loadDetailRecords();
  drawDetailWorkspace(el);
  return true;
}

async function loadDetailRecords(){
  const qs=new URLSearchParams({feature:detailState.feature});
  if(detailState.status && detailState.status!=='All')qs.set('status',detailState.status);
  if(detailState.search)qs.set('search',detailState.search);
  const d=await api('/api/workspace?'+qs.toString());
  detailState.records=d.records||[];
  detailState.counts=d.counts||{};
  detailState.freshAccount=!!d.fresh_account;
}

function drawDetailWorkspace(el=document.getElementById('portalContent')){
  if(!el)return;
  const m=detailState.meta, counts=detailState.counts;
  const statuses=Object.keys(counts);
  const baseKpis=m.kpis || statuses.slice(0,4).map(s=>[s,String(counts[s])]);
  const kpis=detailState.freshAccount ? baseKpis.map(x=>[x[0],'0']) : baseKpis;
  const colorLegend=detailState.feature==='questionbank' ? `
    <div class="question-colour-guide card">
      <div><span class="difficulty-dot easy"></span><b>Green — Easy</b><small>Foundational recall and essential concepts.</small></div>
      <div><span class="difficulty-dot medium"></span><b>Amber — Medium</b><small>Application, comparison and routine decisions.</small></div>
      <div><span class="difficulty-dot hard"></span><b>Red — Hard</b><small>Scenario judgement, multi-step reasoning and higher-risk decisions.</small></div>
    </div>` : '';
  const filterButtons=statuses.map(s=>`<button class="detail-filter ${detailState.status===s?'active':''}" onclick="setDetailStatus('${esc(s)}')"><span>${esc(s)}</span><b>${counts[s]}</b></button>`).join('');
  const rows=detailState.records.map(r=>{
    const d=r.details||{};
    const secondary=[d.course,d.batch,d.department,d.category,d.topic].filter(Boolean).slice(0,2).join(' • ');
    return `<tr class="detail-row" onclick="openWorkspaceRecord(${r.id})">
      <td><strong>${esc(r.record_key)}</strong></td>
      <td><strong>${esc(r.title)}</strong><small>${esc(r.subtitle||secondary||'Open for full record details')}</small></td>
      <td><span class="detail-status ${statusClass(r.status)}">${esc(r.status)}</span></td>
      <td>${esc(r.owner)}</td>
      <td>${esc(secondary||r.priority||'—')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openWorkspaceRecord(${r.id})">Open Details →</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="6"><div class="empty">${detailState.freshAccount?'Your workspace is fresh. New records will appear here as you start using this feature.':'No records match this filter.'}</div></td></tr>`;

  el.innerHTML=`${pageTitle(m.title,m.desc,`<button class="btn btn-ghost" onclick="downloadDetailRegister()">${icon('report')} Export Register</button>`)}
    <div class="detail-kpi-grid">${kpis.map((x,i)=>`<button class="detail-kpi kpi-${i%4}" onclick="smartKpiFilter('${esc(x[0])}')"><span class="metric-icon">${icon(m.icon||'dashboard')}</span><span><small>${esc(x[0])}</small><b>${esc(x[1])}</b><em>Open details</em></span></button>`).join('')}</div>
    ${colorLegend}
    <div class="detail-toolbar card">
      <div class="detail-search"><span>${icon('search')}</span><input id="detailSearch" value="${esc(detailState.search)}" placeholder="Search title, status, learner, course or reference..." onkeydown="if(event.key==='Enter')applyDetailSearch()"></div>
      <button class="btn btn-primary btn-sm" onclick="applyDetailSearch()">Search</button>
      <button class="btn btn-ghost btn-sm" onclick="clearDetailFilters()">Clear</button>
    </div>
    <div class="detail-filter-strip"><button class="detail-filter ${detailState.status==='All'?'active':''}" onclick="setDetailStatus('All')"><span>All</span><b>${Object.values(counts).reduce((a,b)=>a+b,0)}</b></button>${filterButtons}</div>
    <div class="card detail-table-card">
      <div class="section-card-title"><h3>${esc(m.title)} Records</h3><span class="pill green">${detailState.records.length} shown</span></div>
      <div class="table-wrap"><table class="table detail-table"><thead><tr><th>Reference</th><th>Record</th><th>Status</th><th>Owner</th><th>Context</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}

async function setDetailStatus(status){detailState.status=status;await loadDetailRecords();drawDetailWorkspace()}
async function applyDetailSearch(){detailState.search=document.getElementById('detailSearch')?.value.trim()||'';await loadDetailRecords();drawDetailWorkspace()}
async function clearDetailFilters(){detailState.status='All';detailState.search='';await loadDetailRecords();drawDetailWorkspace()}
function smartKpiFilter(label){
  const match=Object.keys(detailState.counts).find(s=>s.toLowerCase()===String(label).toLowerCase());
  if(match)return setDetailStatus(match);
  detailState.status='All'; detailState.search=''; loadDetailRecords().then(()=>drawDetailWorkspace());
}

function recordById(id){return detailState.records.find(x=>Number(x.id)===Number(id))}
function detailGrid(details){
  return Object.entries(details||{}).map(([k,v])=>`<div class="record-detail-cell"><b>${esc(humanKey(k))}</b><span>${esc(typeof v==='object'?JSON.stringify(v):v)}</span></div>`).join('');
}
function messageThreadHtml(r){
  if(detailState.role!=='trainer'||detailState.feature!=='messages')return '';
  const d=r.details||{};
  return `<div class="discussion-panel"><div class="discussion-head"><b>${esc(d.batch||r.title)}</b><span>${esc(String(d.participants||2))} participants</span></div>
    <div class="discussion-message"><span>MN</span><div><b>${esc(d.last_sender||'Learner')}</b><p>${esc(d.last_message||'Question posted in this discussion.')}</p><small>${esc(d.last_activity||'Recently')}</small></div></div>
    <div class="discussion-message trainer"><span>AR</span><div><b>Trainer</b><p>This discussion is open here. Add a reply below and save it to the record notes.</p><small>Trainer workspace</small></div></div>
  </div>`;
}
function certificateProblemHtml(r){
  if(detailState.feature!=='certificates')return '';
  const d=r.details||{};
  return `<div class="certificate-problem ${statusClass(r.status)}"><b>Credential check</b><span><strong>Problem:</strong> ${esc(d.problem||d.eligibility_issue||'None')}</span><span><strong>Next action:</strong> ${esc(d.next_action||d.action||'No action required')}</span></div>`;
}
function availableStatuses(){return Object.keys(detailState.counts).length?Object.keys(detailState.counts):['Current','Active','Pending','Completed']}
function openWorkspaceRecord(id){
  const r=recordById(id); if(!r)return toast('Record is no longer in the current filter','error');
  const statuses=availableStatuses();
  showModal(`<button class="modal-close" onclick="closeModal()">✕</button>
    <div class="record-modal">
      <div class="record-modal-head"><div><div class="eyebrow">${esc(detailState.meta.title)} • ${esc(r.record_key)}</div><h2>${esc(r.title)}</h2><p>${esc(r.subtitle)}</p></div><span class="detail-status ${statusClass(r.status)}">${esc(r.status)}</span></div>
      ${certificateProblemHtml(r)}
      ${messageThreadHtml(r)}
      <div class="record-detail-grid">${detailGrid(r.details)}</div>
      <div class="record-audit"><span><b>Owner</b>${esc(r.owner)}</span><span><b>Priority</b>${esc(r.priority)}</span><span><b>Last updated</b>${fmtDate(r.updated_at)}</span></div>
      <div class="grid grid-2"><div class="field"><label>Status</label><select id="recordStatus">${statuses.map(s=>`<option ${s===r.status?'selected':''}>${esc(s)}</option>`).join('')}</select></div><div class="field"><label>Reference</label><input value="${esc(r.record_key)}" disabled></div></div>
      <div class="field"><label>Notes / response / review update</label><textarea id="recordNote" rows="4" placeholder="Add review notes, response, action evidence or follow-up..."></textarea></div>
      <div class="action-row right"><button class="btn btn-ghost" onclick="downloadRecord(${r.id})">Export Record</button><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="saveWorkspaceRecord(${r.id})">Save Update</button></div>
    </div>`,true);
}
async function saveWorkspaceRecord(id){
  try{
    const status=document.getElementById('recordStatus')?.value||'Current';
    const note=document.getElementById('recordNote')?.value||'';
    await api('/api/workspace/'+id,{method:'PUT',body:JSON.stringify({status,note})});
    closeModal(); toast('Record updated'); await loadDetailRecords(); drawDetailWorkspace();
  }catch(e){toast(e.message,'error')}
}
function downloadRecord(id){
  const r=recordById(id);if(!r)return;
  const lines=[detailState.meta.title,r.record_key,r.title,r.subtitle,'Status: '+r.status,'Owner: '+r.owner,'',...Object.entries(r.details||{}).map(([k,v])=>humanKey(k)+': '+v)];
  downloadTextFile(`${r.record_key}.txt`,lines.join('\n'));toast('Record exported');
}
function downloadDetailRegister(){
  const lines=[detailState.meta.title,'Generated: '+new Date().toLocaleString('en-IN'),'Filter: '+detailState.status,'',...detailState.records.map(r=>`${r.record_key}\t${r.title}\t${r.status}\t${r.owner}`)];
  downloadTextFile(`${detailState.role}-${detailState.feature}-register.txt`,lines.join('\n'));toast('Register exported');
}

/* Route only detail-oriented modules here; keep specialized functional pages in app.js. */
const baseTrainerPage=trainerPage, baseCorporatePage=corporatePage, baseAdminPage=adminPage;
trainerPage=async function(p){const el=document.getElementById('portalContent');if(await renderDetailWorkspace(el,'trainer',p))return;return baseTrainerPage(p)};
corporatePage=async function(p){const el=document.getElementById('portalContent');if(await renderDetailWorkspace(el,'corporate',p))return;return baseCorporatePage(p)};
adminPage=async function(p){const el=document.getElementById('portalContent');if(await renderDetailWorkspace(el,'admin',p))return;return baseAdminPage(p)};

/* Clean visual system: one managed image path, no doubled/blurry module screenshots. */
const MANAGED='assets/managed';
COURSE_ART.splice(0,COURSE_ART.length,...Array.from({length:20},(_,i)=>`managed/courses/course-${String(i+1).padStart(2,'0')}.jpg`));
ROLE_HERO_ART.student='managed/hero-student.jpg';
ROLE_HERO_ART.trainer='managed/hero-trainer.jpg';
ROLE_HERO_ART.corporate='managed/hero-corporate.jpg';
ROLE_HERO_ART.admin='managed/hero-admin.jpg';
workspaceImage=function(role=state.user?.role,page=state.portalPage,i=0){
  if(page==='dashboard' && role!=='admin')return ROLE_HERO_ART[role];
  return COURSE_ART[(Math.max(0,i)+(page?.length||0)+(role?.length||0))%COURSE_ART.length];
};
moduleHeroStyle=function(){return `style="--module-visual:url('${MANAGED}/hero-public.jpg')"`};
function detailFeatureArt(role,feature,label='',i=0){
  const direct=typeof VISUALS!=='undefined' ? VISUALS?.[role]?.[feature]?.[0] : '';
  if(direct) return direct;
  const t=`${role||''} ${feature||''} ${label||''} ${DETAIL_META?.[role]?.[feature]?.title||''} ${DETAIL_META?.[role]?.[feature]?.desc||''}`.toLowerCase();
  if(/browse|course|mycourses|courseplayer|learning|curriculum|program/.test(t)) return 'managed/custom/feature-learning-v18.jpg';
  if(/assessment|exam|question|quiz|result|score/.test(t)) return 'managed/custom/feature-learning-v18.jpg';
  if(/certificate|credential|verify|verification|valid/.test(t)) return 'managed/custom/feature-certificate-v18.jpg';
  if(/resource|library|template|guide|file|content|blog/.test(t)) return 'managed/custom/resources-hero-v18.jpg';
  if(/session|calendar|webinar|live|recording|training/.test(t)) return 'managed/custom/feature-training-v18.jpg';
  if(/user|learner|student|employee|team|people|corporate|profile/.test(t)) return 'managed/custom/feature-support-v18.jpg';
  if(/report|analytics|progress|performance|payment|invoice|refund|revenue/.test(t)) return 'managed/custom/card-analytics.jpg';
  if(/support|message|feedback|notification|request|contact/.test(t)) return 'managed/custom/card-support.jpg';
  if(/approval|audit|security|role|permission|setting|governance|compliance/.test(t)) return 'managed/hero-admin.jpg';
  return workspaceImage(role,feature,(i||0)+1);
}
function detailHeroMeta(role,feature){
  const t=`${role||''} ${feature||''}`.toLowerCase();
  if(/assessment|exam|question|result/.test(t))return [['assessment','Knowledge checks'],['results','Score insights'],['shield','Verified evidence']];
  if(/certificate|verification/.test(t))return [['certificate','Digital credential'],['shield','Secure verification'],['results','Completion proof']];
  if(/report|analytics|performance|progress/.test(t))return [['results','Live insights'],['report','Export ready'],['shield','Evidence based']];
  if(/resource|library|content|blog/.test(t))return [['resource','Practical tools'],['learn','Curated learning'],['shield','Role relevant']];
  if(/session|calendar/.test(t))return [['live','Live delivery'],['calendar','Scheduled learning'],['users','Team ready']];
  if(/user|learner|team|employee|corporate|profile/.test(t))return [['users','People management'],['results','Progress visible'],['shield','Role controlled']];
  if(/support|message|feedback|notification|request|contact/.test(t))return [['support','Responsive support'],['bell','Smart updates'],['users','Connected teams']];
  if(/payment|refund|invoice|coupon/.test(t))return [['payment','Transaction view'],['report','Audit trail'],['shield','Controlled access']];
  if(/security|role|setting|audit|approval/.test(t))return [['shield','Governance'],['results','Operational control'],['report','Audit ready']];
  return [['shield','Role-based'],['results','Live data'],['plus','Action ready']];
}
portalSectionVisual=function(role,p){
  if(p==='dashboard')return '';
  if(role==='student' && p==='checkout') return `<section class="portal-feature-hero-v20 detail-feature-hero-v25"><div class="portal-feature-hero-copy-v20"><div class="v20-hero-top"><span class="eyebrow">Student Enrollment</span><span class="visual-live-dot">Secure</span></div><h2>Secure Course Payment</h2><p>Review your selected course, confirm billing details, choose a payment method and complete enrollment in one clear checkout flow.</p><div class="v20-hero-meta"><span><i>${icon('shield')}</i><b>Secure checkout</b></span><span><i>${icon('payment')}</i><b>Payment record</b></span><span><i>${icon('learn')}</i><b>Instant access</b></span></div></div><div class="v20-hero-art" aria-hidden="true"><img src="assets/managed/custom/card-analytics.jpg" alt=""></div></section>`;
  const label=(DETAIL_META?.[role]?.[p]?.title)||(NAV[role]?.find(x=>x[0]===p)?.[2])||humanKey(p);
  const desc=(DETAIL_META?.[role]?.[p]?.desc)||(typeof VISUALS!=='undefined' ? VISUALS?.[role]?.[p]?.[2] : '')||'Open records, inspect full details, review status and take the next action from one focused workspace.';
  const art=detailFeatureArt(role,p,label);
  const meta=detailHeroMeta(role,p);
  return `<section class="portal-feature-hero-v20 detail-feature-hero-v25">
    <div class="portal-feature-hero-copy-v20">
      <div class="v20-hero-top"><span class="eyebrow">${roleLabel(role)} Workspace</span><span class="visual-live-dot">Live</span></div>
      <h2>${esc(label)}</h2>
      <p>${esc(desc)}</p>
      <div class="v20-hero-meta">${meta.map(x=>`<span><i>${icon(x[0])}</i><b>${x[1]}</b></span>`).join('')}</div>
      <div class="v20-hero-actions"><button class="btn btn-primary" onclick="openWorkspaceOverview()">${icon('dashboard')} Overview</button><button class="btn btn-ghost" onclick="openWorkspaceInsights()">${icon('report')} Insights</button></div>
    </div>
    <div class="v20-hero-art" aria-hidden="true"><img src="assets/${art}" alt=""></div>
  </section>`;
};
