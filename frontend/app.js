const app = document.getElementById('app');
const modalRoot = document.getElementById('modalRoot');
const state = { user:null, publicPage:'home', portalPage:'dashboard', courses:[], resources:[], myCourses:[], enrolledCourseIds:new Set(), assessments:[], chatOpen:false, test:null, testIndex:0, answers:{}, pendingEnrollCourse:null, checkoutCourse:null };

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtDate=s=>{try{return new Date(s).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}catch{return s||'—'}};
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
function toast(msg,type='ok'){const el=document.getElementById('toast');el.textContent=msg;el.style.cssText=`position:fixed;z-index:999;right:20px;top:20px;padding:12px 16px;border-radius:10px;color:#fff;background:${type==='error'?'#c64f4f':'#0a9062'};box-shadow:0 12px 35px #0003;font-weight:700;font-size:12px`;clearTimeout(window._tt);window._tt=setTimeout(()=>el.style.cssText='',2700)}
async function api(url,opts={}){const res=await fetch(url,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data.error||'Request failed');return data}
function showModal(html,wide=false){modalRoot.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal ${wide?'wide':''}">${html}</div></div>`}
function closeModal(){modalRoot.innerHTML=''}
function openActionPanel(title,body='This workspace is ready for action.',actions=''){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Vantras Workspace</div><h2>${esc(title)}</h2><p class="muted">${esc(body)}</p>${actions||`<div class="action-row right"><button class="btn btn-primary" onclick="closeModal()">Done</button></div>`}`)}
function downloadTextFile(name,text){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},100)}
function formatDue(a){const d=new Date(a.due_date+'T00:00:00');return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function goToAssessment(id){state.pendingAssessment=Number(id);openPage('assessments')}
function openWorkspaceOverview(){openActionPanel(`${roleLabel(state.user?.role||'student')} ${String(state.portalPage||'dashboard').replace(/\b\w/g,m=>m.toUpperCase())} Overview`,'This overview summarizes the current workspace and links its live actions to the related portal page.',`<div class="grid grid-3"><div class="note"><b>Live data</b><br>Connected to the current portal APIs.</div><div class="note"><b>Role based</b><br>Actions follow your signed-in portal role.</div><div class="note"><b>Action ready</b><br>Use the buttons on the page to continue.</div></div><div class="action-row right"><button class="btn btn-primary" onclick="closeModal()">Continue</button></div>`)}
function openWorkspaceInsights(){const target={student:'performance',trainer:'reports',corporate:'reports',admin:'analytics'}[state.user?.role]||'dashboard';openActionPanel('Workspace Insights','Open the relevant analytics and reporting workspace for this portal.',`<div class="note"><b>Next destination</b><br>${esc(target.replace(/\b\w/g,m=>m.toUpperCase()))}</div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();openPage('${target}')">Open Insights →</button></div>`)}
function openPublicArticle(title,category){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">${esc(category)}</div><h2>${esc(title)}</h2><p class="muted">This article workspace is connected to the Vantras Knowledge Centre. It shows how full article pages open without leaving the application shell.</p><div class="note"><b>Practical takeaway</b><br>Identify the hazard or EHS issue, select suitable controls, define ownership, verify completion and record evidence.</div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();goPublic('blog')">Knowledge Centre</button></div>`)}
function openResourcePreview(title,type='EHS Resource',access='Free'){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Resource Preview</div><h2>${esc(title)}</h2><p class="muted">${esc(type)} • ${esc(access)}</p><div class="note"><b>Preview</b><br>This resource is available in the Vantras library. Enrolled learners can open course-linked material from their Resources workspace.</div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();${state.user?"openPage('resources')":"showAuth('login')"}">Open Library →</button></div>`)}
function openPasswordReset(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Account Recovery</div><h2>Reset your password</h2><p class="muted">Enter your portal ID or registered mobile number.</p><div class="field"><label>Portal ID / Mobile</label><input placeholder="Your portal ID or mobile"></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="toast('Recovery request submitted');closeModal()">Continue</button></div>`)}
function downloadPortalReport(name='Vantras-report'){const safe=String(name).replace(/[^a-z0-9_-]+/gi,'-').toLowerCase();downloadTextFile(`${safe}.txt`,`${name}\nGenerated: ${new Date().toLocaleString('en-IN')}\nPortal: ${roleLabel(state.user?.role||'student')}\n\nVantras EHS Academy report export.`);toast('Report downloaded')}
function saveResourceToLibrary(title='EHS Resource'){let rows=[];try{rows=JSON.parse(localStorage.getItem('vantras_saved_resources')||'[]')}catch{};if(!rows.includes(title))rows.push(title);localStorage.setItem('vantras_saved_resources',JSON.stringify(rows));toast('Saved to your library')}
function openSessionRoom(title='Live Session'){openActionPanel(title,'The live classroom workspace is ready. In production this button opens the configured Zoom, Google Meet or Microsoft Teams room.',`<div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();openPage('sessions')">Live Sessions →</button></div>`)}
function openRecording(title='Session Recording'){openActionPanel(title,'The recording viewer is ready. In production the protected video player opens the secure HLS/CDN recording.',`<div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();openPage('sessions')">Recording Library →</button></div>`)}
function openPasswordSettings(){openActionPanel('Password & Security','Manage password, session and login security from this workspace.',`<div class="grid grid-2"><div class="field"><label>New Password</label><input type="password" placeholder="New password"></div><div class="field"><label>Confirm Password</label><input type="password" placeholder="Confirm password"></div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="toast('Password settings saved');closeModal()">Save Security Settings</button></div>`)}
function openMediaPicker(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Course Media</div><h2>Add course media</h2><div class="field"><label>Upload file</label><input type="file" accept="image/*,video/*,.pdf,.ppt,.pptx,.doc,.docx"></div><div class="field"><label>External video/resource URL</label><input placeholder="https://..."></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="toast('Media attached to course draft');closeModal()">Add Media</button></div>`)}
function viewLearnerProfile(name,email,course,progress,status){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Learner Profile</div><h2>${esc(name)}</h2><p class="muted">${esc(email)}</p><div class="grid grid-3"><div class="note"><b>${esc(course)}</b><br>Course</div><div class="note"><b>${clamp(progress)}%</b><br>Progress</div><div class="note"><b>${esc(status)}</b><br>Status</div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();openPage('learners')">Learner Workspace →</button></div>`)}
function openContentUpload(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Content Library</div><h2>Upload learning content</h2><div class="field"><label>File</label><input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,image/*,video/*"></div><div class="field"><label>Title</label><input placeholder="Resource title"></div><div class="field"><label>Access</label><select><option>Assigned courses</option><option>Trainer only</option><option>Public resource</option></select></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="toast('Content added to library');closeModal()">Upload</button></div>`)}
function openAdminAddUser(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">User Management</div><h2>Add User</h2><p class="muted">Create a new account from the administration workspace.</p><div class="grid grid-2"><div class="field"><label>Name</label><input id="admNewName" placeholder="Full name"></div><div class="field"><label>Email</label><input id="admNewEmail" type="email" placeholder="user@example.com"></div><div class="field"><label>Role</label><select id="admNewRole"><option>student</option><option>trainer</option><option>corporate</option></select></div><div class="field"><label>Temporary password</label><input id="admNewPass" value="welcome123"></div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="createAdminUser()">Create User</button></div>`)}
async function createAdminUser(){try{const d=await api('/api/admin/users',{method:'POST',body:JSON.stringify({name:admNewName.value,email:admNewEmail.value,role:admNewRole.value,password:admNewPass.value})});toast(d.message||'User created');closeModal();openPage('users')}catch(e){toast(e.message,'error')}}
function openAdminCourseCreator(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Course Management</div><h2>Create course</h2><p class="muted">Use the course creation workspace to define course basics before assigning a trainer.</p><div class="field"><label>Course title</label><input id="admCourseTitle" placeholder="Course title"></div><div class="grid grid-2"><div class="field"><label>Category</label><input id="admCourseCat" placeholder="Occupational Safety"></div><div class="field"><label>Level</label><select id="admCourseLevel"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="toast('Course draft created');closeModal()">Create Draft</button></div>`)}
function openArticleEditor(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">CMS / Blog</div><h2>New Article</h2><div class="field"><label>Title</label><input placeholder="Article title"></div><div class="field"><label>Summary</label><textarea rows="4" placeholder="Knowledge centre summary"></textarea></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="toast('Article saved as draft');closeModal()">Save Draft</button></div>`)}
async function assessmentDetails(id){try{const [q,d]=await Promise.all([api('/api/student/assessment/'+id+'/questions'),api('/api/student/assessments')]);const a=d.assessments.find(x=>Number(x.id)===Number(id));if(!a)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="assessment-detail-modal"><div class="eyebrow">${esc(a.exam_type||'Assessment')}</div><h2>${esc(a.title)}</h2><p class="muted">${esc(a.course)}</p><div class="grid grid-4 assessment-detail-stats"><div class="note"><b>${q.questions.length}</b><br>Questions</div><div class="note"><b>${a.time_minutes} min</b><br>Duration</div><div class="note"><b>${a.pass_percent}%</b><br>Pass mark</div><div class="note"><b>${formatDue(a)}</b><br>Ends</div></div><div class="note exam-flow-note"><b>Test flow</b><br>Instructions → Start Test → Answer Questions → Submit → Result automatically saved in Test History.</div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();startAssessmentFlow(${a.id})">${a.attempt_count?'Retake':'Start Test'} →</button></div></div>`)}catch(e){toast(e.message,'error')}}

const ICONS={
 dashboard:'<path d="M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z"/>',
 courses:'<path d="M4 5h16v14H4zM8 5v14M4 9h16"/>', search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 learn:'<path d="m3 10 9-5 9 5-9 5zM7 12v5c3 2 7 2 10 0v-5"/>', path:'<path d="M5 19c0-6 14-6 14-12M6 7l-2 3 3 2M17 5l3 2-2 3"/>',
 assessment:'<path d="M7 3h10v3H7zM5 5H3v16h18V5h-2M8 11h8M8 15h5"/>', exam:'<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>',
 results:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>', certificate:'<circle cx="12" cy="9" r="6"/><path d="m8 14-1 7 5-3 5 3-1-7"/>',
 payment:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>', resource:'<path d="M5 3h10l4 4v14H5zM15 3v5h5M8 13h8M8 17h6"/>',
 live:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>', ai:'<path d="M8 4h8M12 2v2M5 8h14v11H5zM8 12h.01M16 12h.01M9 16h6"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M10 19h4"/>', support:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2M12 17h.01"/>',
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>', users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
 message:'<path d="M4 4h16v13H8l-4 4z"/>', report:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6a7 7 0 0 0-1.7 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.3-1a7 7 0 0 0 1.7 1l.5 3.1h5l.5-3.1a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2.1-1.5c.1-.3.1-.7.1-1z"/>',
 shield:'<path d="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6z"/>', audit:'<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
 coupon:'<path d="M3 8a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 0 0-6V4H3zM9 4v14"/>', company:'<path d="M4 21V7h10v14M14 11h6v10M7 10h3M7 14h3M7 18h3M17 14h1M17 18h1"/>',
 upload:'<path d="M12 16V4M8 8l4-4 4 4M4 14v6h16v-6"/>', logout:'<path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/>', menu:'<path d="M4 7h16M4 12h16M4 17h16"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.dashboard}</svg>`}
const COURSE_ART=Array.from({length:20},(_,i)=>`managed/courses/course-${String(i+1).padStart(2,'0')}.jpg`);
function courseImage(c,i=0){const id=Number(c?.id);const idx=Number.isFinite(id)&&id>0?(id-1)%COURSE_ART.length:i%COURSE_ART.length;return `assets/${COURSE_ART[idx]}`}
function moduleHeroStyle(){const role=state.user?.role,p=state.portalPage;const v=VISUALS[role]?.[p]?.[0];return v?`style="--module-visual:url('assets/${v}')"`:''}
const ROLE_HERO_ART={student:'managed/hero-student.jpg',trainer:'managed/hero-trainer.jpg',corporate:'managed/hero-corporate.jpg',admin:'managed/hero-admin.jpg'};
function workspaceImage(role=state.user?.role,page=state.portalPage,i=0){if(page==='dashboard')return ROLE_HERO_ART[role]||'managed/hero-public.jpg';const v=VISUALS[role]?.[page]?.[0];if(i===0&&v)return v;return COURSE_ART[(Math.max(0,i-1)+(page?.length||0)+(role?.length||0))%COURSE_ART.length]}
function workspaceThumb(i=0){return `assets/${workspaceImage(state.user?.role,state.portalPage,i)}`}
function progress(v){v=clamp(v);return `<div class="progress"><span style="width:${v}%"></span></div>`}
function ring(v,label='Complete'){v=clamp(v);return `<div class="ring" style="--pct:${v}%"><strong>${v}%</strong><small>${label}</small></div>`}
function metric(label,value,hint,kind='',ico='dashboard',trend=''){return `<div class="card metric ${kind}" style="--metric-art:var(--workspace-art)"><div class="metric-icon">${icon(ico)}</div><div class="metric-copy"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>${trend?`<span class="metric-trend">${trend}</span>`:''}<span class="metric-photo" aria-hidden="true"></span></div>`}
function sectionTitle(h,link='',action=''){return `<div class="section-card-title"><h3>${h}</h3>${action||link?`<button class="view-link" onclick="${action||''}">${link}</button>`:''}</div>`}
function pageTitle(h,p='',actions=''){return `<div class="page-title"><div><h1>${h}</h1><p>${p}</p></div>${actions?`<div class="page-actions">${actions}</div>`:''}</div>`}
const VISUALS={
 student:{
  browse:['managed/hero-student.jpg','Discover learning that fits your role','Curated EHS programs with clear outcomes and practical application.'],mycourses:['managed/hero-student.jpg','Your active learning workspace','Resume modules, review progress and keep moving toward certification.'],courseplayer:['managed/hero-student.jpg','Focused course experience','Watch, read, practice and complete each module in one learning flow.'],learningpath:['managed/hero-student.jpg','A clear path to competence','See the next best action based on your learning progress.'],assessments:['managed/hero-student.jpg','Practice with purpose','Test knowledge, review explanations and strengthen weak areas.'],exams:['managed/hero-student.jpg','Professional examination workspace','Timed, structured evaluations with clear results and evidence.'],results:['managed/hero-student.jpg','Turn results into improvement','Understand strengths, gaps and the topics that need attention.'],performance:['managed/hero-student.jpg','Measure your growth','Progress, scores and learning consistency in one visual view.'],certificates:['managed/hero-student.jpg','Verified learning achievements','Access digital credentials and public verification details.'],payments:['managed/hero-student.jpg','Simple, transparent payments','See enrollment orders, transaction status and learning access.'],resources:['managed/hero-student.jpg','Practical EHS resources','Templates, checklists and references for real safety work.'],sessions:['managed/hero-student.jpg','Learn live with experts','Join scheduled sessions, workshops and Q&A clinics.'],ai:['managed/hero-student.jpg','AI support for learning and everyday questions','Ask EHS, coding, math, writing, study or general questions in one assistant.'],notifications:['managed/hero-student.jpg','Stay on top of learning','Course, assessment, certificate and session updates in one place.'],support:['managed/hero-student.jpg','Support when you need it','Create requests and keep track of resolutions.'],profile:['managed/hero-student.jpg','Your learning identity','Keep your learner profile and professional details current.']},
 trainer:{
  courses:['managed/hero-trainer.jpg','Course portfolio control','Review published, draft and archived learning programs.'],create:['managed/hero-trainer.jpg','Design professional learning','Build course structure, media, assessments and publishing details.'],learners:['managed/hero-trainer.jpg','Know every learner','Track progress, scores, milestones and learners needing support.'],sessions:['managed/hero-trainer.jpg','Deliver engaging live learning','Plan sessions, reminders, attendance and recordings.'],assessments:['managed/hero-trainer.jpg','Assessment Studio','Build tests that measure practical understanding.'],questionbank:['managed/hero-trainer.jpg','Reusable question intelligence','Organize questions by topic, difficulty and learning objective.'],assignments:['managed/hero-trainer.jpg','Review applied learning','Collect, grade and respond to learner submissions.'],certificates:['managed/hero-trainer.jpg','Credential-ready outcomes','Review course completion and certificate eligibility.'],library:['managed/hero-trainer.jpg','A richer content library','Organize videos, PDFs, checklists, images and presentations.'],feedback:['managed/hero-trainer.jpg','Listen to learner feedback','Use ratings and comments to improve course quality.'],reports:['managed/hero-trainer.jpg','Trainer performance insights','Review learning activity, completion and assessment outcomes.'],messages:['managed/hero-trainer.jpg','Keep communication clear','Connect with learners without leaving the training workspace.'],calendar:['managed/hero-trainer.jpg','See the training schedule','Coordinate sessions, deadlines and course milestones.'],profile:['managed/hero-trainer.jpg','Your trainer profile','Manage professional details and course identity.'],support:['managed/hero-trainer.jpg','Trainer support center','Resolve platform, course and learner management questions.']},
 corporate:{
  programs:['managed/hero-corporate.jpg','Build a stronger workforce','Choose programs designed for measurable workplace capability.'],team:['managed/hero-corporate.jpg','Your workforce in one view','Manage employees, departments, locations and training status.'],bulk:['managed/hero-corporate.jpg','Fast workforce onboarding','Import employee data and prepare teams for training at scale.'],assignment:['managed/hero-corporate.jpg','Assign the right training','Match employees and teams to role-relevant EHS programs.'],enrollments:['managed/hero-corporate.jpg','Track every enrollment','See assigned learning, activation and completion state.'],assessments:['managed/hero-corporate.jpg','Measure workforce knowledge','Review assessment participation and safety knowledge outcomes.'],progress:['managed/hero-corporate.jpg','Make progress visible','Identify completion gaps and departments needing attention.'],certificates:['managed/hero-corporate.jpg','Maintain training evidence','Keep verified certificates and completion records organized.'],reports:['managed/hero-corporate.jpg','Turn training into evidence','Export management-ready learning and compliance reports.'],resources:['managed/hero-corporate.jpg','Shared safety resources','Give teams access to practical templates and learning materials.'],requests:['managed/hero-corporate.jpg','Request targeted training','Capture new training needs from teams and business units.'],notifications:['managed/hero-corporate.jpg','Keep teams informed','Centralize training, assessment and certificate updates.'],profile:['managed/hero-corporate.jpg','Corporate account profile','Maintain organization and administrator information.'],settings:['managed/hero-corporate.jpg','Configure your workspace','Manage organization preferences and training defaults.'],support:['managed/hero-corporate.jpg','Corporate support','Get help with employees, enrollments, reports and platform access.']},
 admin:{
  users:['managed/hero-admin.jpg','People and access control','Manage students, trainers, corporate users and administrators.'],courses:['managed/hero-admin.jpg','Learning catalogue governance','Review course quality, publishing and catalogue structure.'],categories:['managed/hero-admin.jpg','Organize the academy catalogue','Keep course categories clear, useful and scalable.'],approvals:['managed/hero-admin.jpg','Publish with confidence','Review trainer submissions before they reach learners.'],enrollments:['managed/hero-admin.jpg','Enrollment operations','Monitor course access across individual and corporate learners.'],assessments:['managed/hero-admin.jpg','Assessment governance','Control tests, scoring and learning evidence.'],questionbank:['managed/hero-admin.jpg','Question bank governance','Maintain high-quality reusable assessment content.'],exams:['managed/hero-admin.jpg','Exam operations','Manage schedules, attempts, scoring and result workflows.'],certificates:['managed/hero-admin.jpg','Credential control center','Issue, review, revoke and verify digital certificates.'],verification:['managed/hero-admin.jpg','Trusted public verification','Validate certificate status through the public credential service.'],payments:['managed/hero-admin.jpg','Payment operations','Monitor verified transactions, orders and revenue.'],refunds:['managed/hero-admin.jpg','Refund management','Track refund requests and financial adjustments.'],coupons:['managed/hero-admin.jpg','Promotions with control','Create discounts with clear rules and limits.'],invoices:['managed/hero-admin.jpg','Invoice and receipt management','Keep financial documentation organized and exportable.'],corporate:['managed/hero-admin.jpg','Corporate account management','Oversee organizations, administrators and workforce programs.'],sessions:['managed/hero-admin.jpg','Live learning operations','See training schedules and platform-wide live activity.'],resources:['managed/hero-admin.jpg','Resource governance','Manage templates, files and access levels.'],content:['managed/hero-admin.jpg','CMS and knowledge centre','Publish useful EHS articles and academy content.'],reports:['managed/hero-admin.jpg','Operational reporting','Generate learning, financial and corporate reports.'],analytics:['managed/hero-admin.jpg','Platform intelligence','See growth, engagement, finance and learning outcomes.'],notifications:['managed/hero-admin.jpg','Notification control','Manage learner, trainer and corporate communications.'],support:['managed/hero-admin.jpg','Support operations','Review tickets, priorities and resolution status.'],audit:['managed/hero-admin.jpg','Audit visibility','Track important system and administrative actions.'],security:['managed/hero-admin.jpg','Security posture','Review access protection, logging and platform safeguards.'],roles:['managed/hero-admin.jpg','Roles and permissions','Control who can see and change each part of the platform.'],settings:['managed/hero-admin.jpg','Platform configuration','Manage academy-wide operational settings.']}
};
function portalSectionVisual(role,p){if(p==='dashboard')return '';const v=VISUALS[role]?.[p];if(!v)return '';return `<section class="section-visual section-visual-v6" style="--visual:url('assets/${v[0]}')"><div class="section-visual-copy"><div class="visual-kicker"><span class="eyebrow">${roleLabel(role)} Workspace</span><span class="visual-live-dot">Live</span></div><h2>${v[1]}</h2><p>${v[2]}</p><div class="visual-badges"><span>${icon('shield')} Role-based</span><span>${icon('results')} Live data</span><span>${icon('plus')} Action ready</span></div><div class="hero-mini-actions"><button onclick="openWorkspaceOverview()"><span>${icon('dashboard')}</span>Overview</button><button onclick="openWorkspaceInsights()"><span>${icon('report')}</span>Insights</button></div></div><div class="section-visual-photo" aria-hidden="true"><span class="photo-corner">Vantras EHS Academy</span><div class="hero-photo-stack"><span style="background-image:url('assets/${workspaceImage(role,p,1)}')"></span><span style="background-image:url('assets/${workspaceImage(role,p,2)}')"></span></div></div></section>`}
function dashboardVisualRibbon(role){const data={student:[['managed/hero-student.jpg','Continue Learning','courseplayer'],['managed/hero-student.jpg','Assessment Practice','assessments'],['managed/hero-student.jpg','EHS Resources','resources']],trainer:[['managed/hero-trainer.jpg','Build Courses','create'],['managed/hero-trainer.jpg','Assessment Studio','assessments'],['managed/hero-trainer.jpg','Content Library','library']],corporate:[['managed/hero-corporate.jpg','Manage Team','team'],['managed/hero-corporate.jpg','Assign Training','assignment'],['managed/hero-corporate.jpg','Reports & Analytics','reports']],admin:[['managed/hero-admin.jpg','User Operations','users'],['managed/hero-admin.jpg','Course Governance','approvals'],['managed/hero-admin.jpg','Platform Analytics','analytics']]};return `<div class="visual-ribbon">${(data[role]||[]).map((x,i)=>`<button class="visual-tile visual-tile-${i+1}" onclick="openPage('${x[2]}')"><img src="assets/${x[0]}" alt=""><span><b>${x[1]}</b><small>Open workspace <strong>→</strong></small></span></button>`).join('')}</div>`}
function lineChart(vals=[45,58,52,68,72,79,86]){const w=420,h=120,p=10;const pts=vals.map((v,i)=>`${p+i*(w-2*p)/(vals.length-1)},${h-p-(clamp(v)*(h-2*p)/100)}`).join(' ');const area=`${p},${h-p} ${pts} ${w-p},${h-p}`;return `<div class="line-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="gridline" d="M0 25H420M0 55H420M0 85H420"/><polygon class="area" points="${area}"/><polyline class="line" points="${pts}"/>${vals.map((v,i)=>`<circle cx="${p+i*(w-2*p)/(vals.length-1)}" cy="${h-p-clamp(v)*(h-2*p)/100}" r="3"/>`).join('')}</svg></div>`}

const PUBLIC_NAV=[['home','Home'],['about','About'],['courses','Courses'],['corporate','Corporate Training'],['resources','Resources'],['blog','Blog'],['verify','Certificate Verification'],['contact','Contact']];
function publicHeader(active='home'){return `<header class="public-header"><button class="public-brand" onclick="goPublic('home')" aria-label="Vantras EHS Academy home"><span class="public-brand-frame"><img class="brand-logo" src="assets/managed/logo.png" alt="Vantras EHS Academy"></span></button><nav class="topnav">${PUBLIC_NAV.map(([k,v])=>`<button class="${active===k?'active':''}" onclick="goPublic('${k}')">${v}</button>`).join('')}</nav><div class="header-actions"><button class="btn btn-ghost btn-sm header-login" onclick="showAuth('login')">${icon('profile')}<span>Login</span></button><button class="btn btn-primary btn-sm header-register" onclick="showAuth('register')">${icon('plus')}<span>Register</span></button></div></header>`}
function publicFooter(){return `<footer class="public-footer footer-v4"><div class="footer-shell"><div class="footer-brand-card"><button class="footer-brand-button" onclick="goPublic('home')" aria-label="Vantras EHS Academy home"><img class="footer-logo" src="assets/managed/logo.png" alt="Vantras EHS Academy"></button><p>Professional Environment, Health & Safety learning, assessments and certification for individuals and organizations.</p><div class="footer-badges"><span>India</span><span>Digital Learning Platform</span><span>Verified Certificates</span></div></div><div class="footer-nav-card"><h4>Explore</h4><button onclick="goPublic('courses')">Courses <b>→</b></button><button onclick="goPublic('corporate')">Corporate Training <b>→</b></button><button onclick="goPublic('resources')">EHS Resources <b>→</b></button><button onclick="goPublic('blog')">Knowledge Centre <b>→</b></button></div><div class="footer-nav-card"><h4>Student Services</h4><button onclick="showAuth('login')">My Learning <b>→</b></button><button onclick="goPublic('verify')">Verify Certificate <b>→</b></button><button onclick="goPublic('contact')">Help & Support <b>→</b></button><button onclick="goPublic('contact')">Privacy & Policies <b>→</b></button></div><div class="footer-news-card"><span class="footer-eyebrow">Stay updated</span><h3>Safety learning in your inbox.</h3><p>Receive new course announcements, practical EHS resources and training updates.</p><div class="newsletter"><input placeholder="Your email address"><button class="btn btn-primary" onclick="toast('Subscribed')">Join</button></div><div class="footer-note">No spam. Only useful EHS learning updates.</div></div></div><div class="footer-bottom"><span>© 2026 Vantras EHS Academy</span><div><button onclick="goPublic('about')">About</button><button onclick="goPublic('contact')">Contact</button><button onclick="goPublic('verify')">Certificate Verification</button></div></div></footer>`}
async function renderPublic(){document.body.classList.remove('portal-shell-active');state.user=null;app.innerHTML=publicHeader(state.publicPage)+publicContent(state.publicPage)+publicFooter();window.scrollTo(0,0);if(state.publicPage==='home')loadHomeCourses();if(state.publicPage==='courses')loadPublicCourses();if(state.publicPage==='resources')loadPublicResources()}
function goPublic(p){state.publicPage=p;renderPublic()}
function publicContent(p){
if(p==='home')return `<main><section class="public-hero"><div class="public-hero-copy"><div class="eyebrow">Professional EHS Learning</div><h1>Learn safety.<br><em>Lead with confidence.</em></h1><p>Industry-focused Environment, Health & Safety courses designed for professionals, supervisors, engineers, students and corporate teams.</p><div class="hero-actions"><button class="btn btn-primary btn-lg" onclick="goPublic('courses')">Explore Courses →</button><button class="btn btn-ghost btn-lg" onclick="goPublic('corporate')">Corporate Training</button></div><div class="public-statbar"><div class="public-stat"><span class="public-stat-icon">✓</span><div><b>18+</b><span> EHS Courses</span></div></div><div class="public-stat"><span class="public-stat-icon">★</span><div><b>4.8/5</b><span> Learner Rating</span></div></div><div class="public-stat"><span class="public-stat-icon">QR</span><div><b>Verified</b><span> Certificates</span></div></div></div></div><div class="public-hero-image"><div class="hero-note"><h4>Vantras Learning Path</h4><div class="hero-note-row"><span>Structured modules</span><strong>Learn</strong></div><div class="hero-note-row"><span>Practical assessments</span><strong>Practice</strong></div><div class="hero-note-row"><span>Final evaluation</span><strong>Qualify</strong></div><div class="hero-note-row"><span>Digital certificate</span><strong>Verify</strong></div></div></div></section>
<section class="public-section"><div class="public-section-head"><div><div class="eyebrow">Featured Courses</div><h2>Popular EHS learning programs</h2><p class="sub">Practical, role-relevant learning for safer workplaces.</p></div><button class="public-link" onclick="goPublic('courses')">View all courses →</button></div><div id="homeCourses" class="feature-course-row"><div class="empty">Loading featured courses…</div></div></section>
<section class="public-section alt"><div class="public-section-head"><div><div class="eyebrow">Explore by category</div><h2>Build skills that matter at work</h2><p class="sub">Choose a learning area and explore role-relevant EHS programs.</p></div></div><div class="category-row category-text-grid-v24">${[['shield','Occupational Safety','Core workplace safety practices'],['live','Fire Safety','Prevention and emergency readiness'],['resource','Environmental','Environmental systems and controls'],['assessment','Risk Management','Hazard identification and risk decisions'],['users','Health & Hygiene','Workplace health and wellbeing'],['audit','Compliance','Standards, audits and evidence'],['company','Construction','Site safety and contractor controls'],['settings','Electrical Safety','Electrical hazards and safe systems']].map(x=>`<button class="category-card category-text-card-v24" onclick="goPublic('courses')"><span class="category-icon-v24">${icon(x[0])}</span><span class="category-copy-v24"><b>${x[1]}</b><small>${x[2]}</small><em>Explore programs →</em></span></button>`).join('')}</div></section>
<section class="public-section visual-story-section"><div class="public-section-head"><div><div class="eyebrow">Learning in context</div><h2>Built around real EHS work</h2><p class="sub">Practical learning for risk, fire, environment, operations and workforce safety.</p></div></div><div class="public-story-grid"><button onclick="goPublic('courses')"><img src="assets/managed/courses/course-04.jpg"><span><b>Workplace Safety</b><small>People • Operations • Controls</small></span></button><button onclick="goPublic('courses')"><img src="assets/managed/custom/card-assessment.jpg"><span><b>Risk & HIRA</b><small>Hazards • Controls • Decisions</small></span></button><button onclick="goPublic('resources')"><img src="assets/managed/courses/course-16.jpg"><span><b>Environmental Practice</b><small>Aspects • Compliance • Action</small></span></button></div></section><section class="public-section"><div class="public-mid-grid"><div><div class="public-section-head"><div><div class="eyebrow">Learn from experts</div><h2>Experienced EHS trainers</h2></div></div><div class="trainer-row">${[['RA','R. Anand','Industrial Safety'],['SM','S. Mehta','Fire & Emergency'],['PK','P. Kumar','Risk & Compliance'],['AN','A. Nair','Environment']].map(x=>`<div class="trainer-mini"><div class="trainer-avatar">${x[0]}</div><b>${x[1]}</b><span>${x[2]}</span></div>`).join('')}</div></div><div class="corporate-strip"><div class="eyebrow">Corporate EHS Training</div><h3>Upskill your workforce at scale.</h3><p>Assign courses, track employee progress, review assessments and maintain verifiable training records.</p><div class="feature-list"><span>✓ Bulk employee enrollment</span><span>✓ Team progress tracking</span><span>✓ Corporate reports</span><span>✓ Digital certificates</span></div><button class="btn btn-primary btn-sm" onclick="goPublic('corporate')">Explore Corporate Training</button></div></div></section>
<section class="public-section alt"><div class="public-lower-grid"><div class="public-panel"><div class="eyebrow">Knowledge Centre</div><h2>Latest EHS insights</h2>${[['Near-miss reporting that prevents incidents','managed/courses/course-05.jpg'],['A practical HIRA register that gets used','managed/courses/course-11.jpg'],['Five questions for better toolbox talks','managed/courses/course-18.jpg']].map(x=>`<div class="blog-item"><img class="blog-thumb" src="assets/${x[1]}"><div><b>${x[0]}</b><span>Safety guidance • 5 min read</span></div></div>`).join('')}<button class="public-link" onclick="goPublic('blog')">Read all articles →</button></div><div class="public-panel"><div class="eyebrow">EHS Resources</div><h2>Ready-to-use tools</h2>${[['✓','HIRA Template','Risk Management'],['▤','Daily Safety Checklist','Operations'],['⚑','Incident Investigation Form','Incident Management']].map(x=>`<div class="resource-item"><span class="resource-dot">${x[0]}</span><div><b>${x[1]}</b><span>${x[2]}</span></div></div>`).join('')}<button class="public-link" onclick="goPublic('resources')">Browse library →</button></div><div class="public-panel"><div class="eyebrow">Certificate Verification</div><h2>Verify credentials</h2><p class="sub">Enter a Vantras certificate number to confirm its status.</p><div class="verify-box"><div class="verify-icon">✓</div><div class="verify-inline"><input id="homeCert" placeholder="VEA-2026-..."><button class="btn btn-primary btn-sm" onclick="verifyCertificate('homeCert','homeVerifyResult')">Verify</button></div></div><div id="homeVerifyResult" class="small muted" style="margin-top:7px"></div></div></div></section>
<section class="testimonial-strip"><div><div class="eyebrow">Learner stories</div><h2 style="margin:4px 0;font-size:20px">Trusted by safety professionals</h2><span class="small muted">Practical learning. Measurable outcomes.</span></div>${[['VM','Vikram M.','“Clear, practical modules that connect directly to site safety.”'],['SK','Sneha K.','“The assessment feedback helped me identify what to improve.”'],['AR','Arun R.','“Our team can now track training completion from one dashboard.”']].map(x=>`<div class="testimonial-card"><div class="trainer-avatar">${x[0]}</div><div><p>${x[2]}</p><b>${x[1]}</b></div></div>`).join('')}</section></main>`;

if(p==='about')return `<main><section class="public-page-hero about-v9"><div class="about-company-wrap"><div class="about-company-copy"><div class="eyebrow">About Vantras EHS Academy</div><h1>One academy. One purpose: safer workplaces.</h1><p>Vantras EHS Academy is a professional digital learning platform focused on Environment, Health & Safety education, assessment and trusted certification for individuals and organizations.</p><div class="about-badges"><span>Structured EHS Learning</span><span>Practical Assessments</span><span>Digital Credentials</span></div></div><div class="about-company-image"><img src="assets/managed/corporate/team.jpg" alt="Vantras EHS Academy professional learning team"></div></div></section><section class="section white"><div class="grid grid-3">${[['shield','Our Vision','Make EHS learning accessible, practical and measurable.'],['learn','Our Mission','Build workplace-ready capability through modern digital learning.'],['users','Who We Serve','Professionals, students, supervisors, trainers and corporate teams.']].map(x=>`<div class="card purpose-card-v9"><div class="metric-icon">${icon(x[0])}</div><h3>${x[1]}</h3><p class="muted">${x[2]}</p></div>`).join('')}</div></section><section class="section alt"><div class="section-head"><div><div class="eyebrow">How Vantras works</div><h2>Learn → Practice → Assess → Certify</h2><p>A focused professional learning journey with clear evidence of progress.</p></div></div><div class="grid grid-4 learning-model-grid">${[['01','Learn','Training videos, lessons and resources'],['02','Practice','Checklists, scenarios and knowledge checks'],['03','Assess','Timed tests with saved results'],['04','Certify','Verified credentials after completion']].map((x,i)=>`<div class="card learning-model-card v9"><span class="step-no">${x[0]}</span><img src="assets/${['managed/courses/course-02.jpg','managed/courses/course-07.jpg','managed/courses/course-12.jpg','managed/courses/course-18.jpg'][i]}" alt=""><h3>${x[1]}</h3><p class="muted">${x[2]}</p></div>`).join('')}</div></section></main>`;

if(p==='courses')return `<main><section class="public-page-hero public-courses-hero"><div class="eyebrow">Course Catalogue</div><h1>Build your next EHS capability.</h1><p>Search professional courses by category, level and learning need.</p></section><section class="section alt"><div class="toolbar"><div class="search"><span class="search-glyph">⌕</span><input id="pubSearch" placeholder="Search courses..." oninput="filterPublicCourses()"></div><select id="pubCat" onchange="filterPublicCourses()"><option value="">All Categories</option><option>Occupational Safety</option><option>Environmental Management</option><option>Health & Hygiene</option><option>Fire Safety</option><option>Risk Management</option><option>Compliance</option></select><select id="pubLevel" onchange="filterPublicCourses()"><option value="">All Levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div id="publicCourses" class="course-grid"><div class="empty">Loading courses…</div></div></section></main>`;

if(p==='corporate')return `<main><section class="public-page-hero corporate-company-v9"><div class="corporate-company-wrap"><div><div class="eyebrow">Corporate Training</div><h1>Build a safer, better-trained workforce.</h1><p>Centralize employee EHS learning, course assignment, assessments, completion tracking, certificates and management reporting.</p><div class="hero-actions"><button class="btn btn-primary btn-lg" onclick="showAuth('login','corporate')">Open Corporate Portal</button><button class="btn btn-ghost btn-lg" onclick="goPublic('contact')">Request a Proposal</button></div></div><img src="assets/managed/corporate/team.jpg" alt="Corporate EHS training team"></div></section><section class="section white"><div class="section-head"><div><div class="eyebrow">Corporate capabilities</div><h2>Everything a training administrator needs</h2></div></div><div class="grid grid-4">${[['users','Employee Management','Create, import and organize employees by department.'],['courses','Course Assignment','Assign the right EHS programs to individuals and teams.'],['results','Progress & Assessments','Track learning completion, attempts, scores and due dates.'],['certificate','Evidence & Reports','Maintain certificates and export training evidence.']].map(x=>`<div class="card purpose-card-v9"><div class="metric-icon">${icon(x[0])}</div><h3>${x[1]}</h3><p class="muted">${x[2]}</p><button class="public-link" onclick="showAuth('login','corporate')">Open workspace →</button></div>`).join('')}</div></section><section class="section alt"><div class="corporate-process-v9">${[['01','Import people','CSV/Excel bulk upload'],['02','Assign training','Role and risk based programs'],['03','Track learning','Progress, attendance and tests'],['04','Prove compliance','Certificates and reports']].map(x=>`<div><span>${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join('')}</div></section></main>`;

if(p==='resources')return `<main><section class="public-page-hero public-resources-hero"><div class="eyebrow">EHS Resource Library</div><h1>Practical tools for everyday safety work.</h1><p>Templates, checklists, forms, posters and training resources for students and professionals.</p></section><section class="section alt"><div id="publicResources" class="grid grid-3"><div class="empty">Loading resources…</div></div></section></main>`;
if(p==='blog')return `<main><section class="public-page-hero public-blog-hero"><div class="eyebrow">Knowledge Centre</div><h1>EHS insights for working professionals.</h1><p>Practical articles on risk, audits, incidents, compliance, safety leadership and workplace learning.</p></section><section class="section white"><div class="grid grid-3">${[['Near Misses: Turn Weak Signals into Prevention','managed/courses/course-02.jpg','Incident Management'],['How to Build a HIRA Register People Actually Use','managed/courses/course-05.jpg','Risk Management'],['Five Questions for a Better Toolbox Talk','managed/courses/course-08.jpg','Safety Leadership'],['From Audit Finding to Verified Closure','managed/courses/course-11.jpg','Audit & Compliance'],['Work at Height: Controls Before Harnesses','managed/courses/course-14.jpg','Occupational Safety'],['Environmental Aspects That Matter','managed/courses/course-17.jpg','Environment']].map(x=>`<article class="card hover" style="padding:0;overflow:hidden"><img src="assets/${x[1]}" style="height:160px;width:100%;object-fit:cover"><div style="padding:15px"><span class="pill green">${x[2]}</span><h3 style="margin-top:10px">${x[0]}</h3><p class="muted small">Practical guidance, examples and actions you can apply in real EHS work.</p><button class="public-link" onclick="openPublicArticle('${x[0]}','${x[2]}')">Read article →</button></div></article>`).join('')}</div></section></main>`;
if(p==='verify')return `<main><section class="public-page-hero public-verify-hero"><div class="eyebrow">Certificate Verification</div><h1>Check a Vantras digital credential.</h1><p>Enter the certificate number printed on the learner certificate or encoded in its QR code.</p></section><section class="section white"><div class="card verify-public-card" style="max-width:840px;margin:auto"><div class="verify-public-art"><img src="assets/managed/courses/course-20.jpg" alt=""></div><div class="verify-public-body"><div class="verify-box"><div class="verify-icon">✓</div><div style="flex:1"><h3>Verify certificate</h3><p class="muted small">Example format: VEA-2026-HIRA-000001</p><div class="verify-inline"><input id="certSearch" placeholder="Certificate number"><button class="btn btn-primary" onclick="verifyCertificate('certSearch','certResult')">Verify</button></div></div></div><div id="certResult" style="margin-top:16px"></div></div></div></section></main>`;
if(p==='contact')return `<main><section class="public-page-hero public-contact-hero"><div class="eyebrow">Contact Vantras</div><h1>Tell us how we can help.</h1><p>Talk to us about individual learning, corporate training, certificates, technical support or partnerships.</p></section><section class="section white contact-section-v24"><div class="contact-form-shell-v24"><div class="card contact-form-card-v24"><div class="contact-form-head-v24"><div><div class="eyebrow">Contact Vantras</div><h2>Send us an enquiry</h2><p class="muted">Share what you need and our team will respond through the appropriate support channel.</p></div><div class="contact-icon-v24">${icon('message')}</div></div><div class="grid grid-2"><div class="field"><label>Name</label><input placeholder="Your name"></div><div class="field"><label>Email</label><input placeholder="you@company.com"></div></div><div class="field"><label>Topic</label><select><option>Course Enquiry</option><option>Corporate Training</option><option>Certificate Support</option><option>Technical Support</option><option>Partnerships</option></select></div><div class="field"><label>Message</label><textarea rows="5" placeholder="Tell us what you need"></textarea></div><div class="contact-actions-v24"><button class="btn btn-primary" onclick="toast('Enquiry sent')">Send Enquiry →</button><span>${icon('shield')} Secure enquiry form</span></div></div><div class="contact-support-grid-v24">${[['support','Course Support','Learning and enrollment help'],['company','Corporate Training','Workforce programs and proposals'],['certificate','Certificates','Verification and credential support'],['settings','Technical Support','Portal access and platform help']].map(x=>`<div class="contact-support-card-v24"><span>${icon(x[0])}</span><div><b>${x[1]}</b><small>${x[2]}</small></div></div>`).join('')}</div></div></section></main>`;
return ''}

async function loadHomeCourses(){try{const d=await api('/api/public/courses');state.courses=d.courses;const el=document.getElementById('homeCourses');if(!el)return;el.innerHTML=d.courses.slice(0,6).map((c,i)=>`<button class="public-course-card" onclick="courseDetail(${c.id})" style="text-align:left"><img class="public-course-thumb" src="${courseImage(c,i)}"><div class="public-course-body"><h3>${esc(c.title)}</h3><div class="mini-meta"><span>${esc(c.level)}</span><span>•</span><span>${esc(c.duration)}</span></div><div class="mini-meta" style="margin-top:4px"><span class="stars">★★★★★</span><b>${money(c.price)}</b></div></div></button>`).join('')}catch(e){}}
async function loadPublicCourses(){try{const d=await api('/api/public/courses');state.courses=d.courses;filterPublicCourses()}catch(e){document.getElementById('publicCourses').innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
function filterPublicCourses(){const s=(document.getElementById('pubSearch')?.value||'').toLowerCase(),cat=document.getElementById('pubCat')?.value||'',lvl=document.getElementById('pubLevel')?.value||'';const rows=state.courses.filter(c=>(!s||(c.title+' '+c.category+' '+c.code).toLowerCase().includes(s))&&(!cat||c.category===cat)&&(!lvl||c.level===lvl));const el=document.getElementById('publicCourses');if(!el)return;el.innerHTML=rows.length?rows.map((c,i)=>courseCard(c,i,false)).join(''):`<div class="empty"><div class="big">⌕</div>No courses match these filters.</div>`}
async function loadPublicResources(){try{const d=await api('/api/public/resources');state.resources=d.resources;const el=document.getElementById('publicResources');const pics=['managed/story/inspection.jpg','managed/story/risk.jpg','managed/story/workers.jpg','managed/story/environment.jpg','managed/story/ppe.jpg','managed/story/fire.jpg'];el.innerHTML=d.resources.map((r,i)=>`<div class="card hover resource-photo-card"><img src="assets/${pics[i%pics.length]}" class="resource-photo" alt=""><div class="resource-photo-body"><div class="resource-photo-head"><div class="metric-icon ${i%2?'':'blue'}">${icon('resource')}</div><span class="pill ${r.access==='Free'?'green':'blue'}">${esc(r.access)}</span></div><h3>${esc(r.title)}</h3><p class="muted small">${esc(r.type||'EHS Resource')} • Practical downloadable reference material.</p><button class="btn btn-soft btn-sm" onclick="openResourcePreview('${esc(r.title)}','${esc(r.type||'EHS Resource')}','${esc(r.access)}')">Preview Resource</button></div></div>`).join('')}catch(e){}}
function courseCard(c,i=0,student=false){const rating=(4.6+((Number(c.id||i)%4)*.1)).toFixed(1);const enrolled=student&&state.enrolledCourseIds?.has(Number(c.id));return `<article class="card course-card course-card-v6 hover ${enrolled?'course-unlocked':'course-locked'}"><div class="course-cover"><img src="${courseImage(c,i)}" alt="${esc(c.title)}"><div class="course-cover-top"><span class="tag">${esc(c.category||'EHS')}</span><span class="rating-chip">★ ${rating}</span></div><div class="course-cover-bottom"><span>${icon('learn')} Expert-led</span><span>${icon('certificate')} Certificate</span></div></div><div class="course-body"><div class="course-code-row"><span class="kicker">${esc(c.code||'VANTRAS')}</span><span class="course-level">${esc(c.level||'Professional')}</span></div><h3>${esc(c.title)}</h3><div class="course-facts"><span>${icon('calendar')} ${esc(c.duration||'Self paced')}</span><span>${icon('live')} ${esc(c.mode||'Online')}</span></div>${student?`<div class="course-access-state ${enrolled?'unlocked':'locked'}">${enrolled?`${icon('shield')} <b>Unlocked</b><span>Course player, resources and assessments are available.</span>`:`${icon('shield')} <b>Locked</b><span>Enroll and complete payment to unlock course content and tests.</span>`}</div>`:''}<div class="course-card-footer"><div><small>Course fee</small><div class="price">${money(c.price)}</div></div><div class="action-row"><button class="btn btn-ghost btn-sm icon-arrow-btn" onclick="courseDetail(${c.id})">Details <b>→</b></button>${student?(enrolled?`<button class="btn btn-primary btn-sm icon-arrow-btn" onclick="state.selectedCourse=${c.id};openPage('courseplayer')">Open Course <b>→</b></button>`:`<button class="btn btn-primary btn-sm icon-arrow-btn" onclick="enroll(${c.id})">Enroll <b>→</b></button>`):''}</div></div></div></article>`}
function courseDetail(id){const c=state.courses.find(x=>Number(x.id)===Number(id));if(!c)return toast('Course details unavailable','error');const enrolled=state.user?.role==='student'&&state.enrolledCourseIds?.has(Number(c.id));showModal(`<button class="modal-close" onclick="closeModal()">✕</button><img src="${courseImage(c,id)}" style="width:100%;height:210px;object-fit:cover;border-radius:10px"><div class="kicker" style="margin-top:14px">${esc(c.code)}</div><h2>${esc(c.title)}</h2><div class="mini-meta"><span>${esc(c.category)}</span><span>•</span><span>${esc(c.level)}</span><span>•</span><span>${esc(c.duration)}</span></div><p class="muted" style="line-height:1.75">${esc(c.description||'Industry-focused EHS course with structured modules, practical resources and assessment.')}</p><div class="grid grid-3"><div class="note"><b>Structured learning</b><br>${enrolled?'Unlocked':'Unlock after enrollment'}</div><div class="note"><b>Assessment</b><br>${enrolled?'Available for this course':'Locked until enrollment'}</div><div class="note"><b>Certificate</b><br>Issued after successful completion</div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button>${enrolled?`<button class="btn btn-primary" onclick="closeModal();state.selectedCourse=${c.id};openPage('courseplayer')">Open Course →</button>`:`<button class="btn btn-primary" onclick="closeModal();enroll(${c.id})">Enroll Now</button>`}</div>`,true)}
async function verifyCertificate(inputId,resultId){const number=(document.getElementById(inputId)?.value||'').trim();const el=document.getElementById(resultId);if(!number){el.innerHTML='<div class="danger-note note">Enter a certificate number.</div>';return}try{const d=await api('/api/public/certificate?number='+encodeURIComponent(number));el.innerHTML=d.certificate?`<div class="note"><b>✓ ${esc(d.certificate.status)}</b><br><strong>${esc(d.certificate.student)}</strong><br>${esc(d.certificate.course)}<br>${esc(d.certificate.certificate_no)} • Issued ${esc(d.certificate.issue_date)}</div>`:`<div class="danger-note note"><b>Not Found</b><br>No matching Vantras certificate was found.</div>`}catch(e){el.innerHTML=`<div class="danger-note note">${esc(e.message)}</div>`}}
function togglePassword(id,btn){const input=document.getElementById(id);if(!input)return;const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Hide':'Show'}
async function logout(){try{await api('/api/logout',{method:'POST'})}catch{}state.user=null;state.publicPage='home';renderPublic();toast('Signed out')}

const NAV={
 student:[['dashboard','dashboard','Dashboard'],['browse','search','Browse Courses'],['mycourses','courses','My Courses'],['courseplayer','learn','Course Player'],['learningpath','path','Learning Path'],['assessments','assessment','Assessments'],['exams','exam','Exams'],['results','results','Results'],['performance','report','Performance'],['certificates','certificate','Certificates'],['payments','payment','Payments'],['resources','resource','Resources'],['sessions','live','Live Sessions'],['ai','ai','AI EHS Assistant'],['notifications','bell','Notifications'],['support','support','Help & Support'],['profile','profile','Profile']],
 trainer:[['dashboard','dashboard','Dashboard'],['courses','courses','My Courses'],['create','plus','Create Course'],['learners','users','Learners'],['sessions','live','Live Sessions'],['assessments','assessment','Assessments'],['questionbank','exam','Question Bank'],['assignments','upload','Assignments'],['certificates','certificate','Certificates'],['library','resource','Content Library'],['feedback','message','Feedback'],['reports','report','Reports'],['messages','message','Messages'],['calendar','calendar','Calendar'],['profile','profile','My Profile'],['support','support','Help & Support']],
 corporate:[['dashboard','dashboard','Dashboard'],['programs','courses','Training Programs'],['team','users','My Team'],['bulk','upload','Bulk Employee Upload'],['assignment','learn','Course Assignment'],['enrollments','assessment','Enrollments'],['assessments','exam','Assessments'],['progress','results','Employee Progress'],['certificates','certificate','Certificates'],['reports','report','Reports & Analytics'],['resources','resource','Resource Library'],['requests','message','Training Requests'],['notifications','bell','Notifications'],['profile','profile','Profile'],['settings','settings','Settings'],['support','support','Support']],
 admin:[['dashboard','dashboard','Dashboard'],['users','users','User Management'],['courses','courses','Course Management'],['categories','resource','Categories'],['approvals','shield','Course Approvals'],['enrollments','learn','Enrollments'],['assessments','assessment','Assessments'],['questionbank','exam','Question Bank'],['exams','exam','Exam Management'],['certificates','certificate','Certificates'],['verification','shield','Certificate Verification'],['payments','payment','Payments'],['refunds','payment','Refunds'],['coupons','coupon','Coupons'],['invoices','resource','Invoices'],['corporate','company','Corporate Management'],['sessions','live','Live Sessions'],['resources','resource','Resources'],['content','message','CMS / Blog'],['reports','report','Reports'],['analytics','results','Analytics'],['notifications','bell','Notifications'],['support','support','Support Tickets'],['audit','audit','Audit Logs'],['security','shield','Security'],['roles','users','Roles & Permissions'],['settings','settings','System Settings']]
};
const HERO={student:['Welcome back','Continue your EHS learning journey.','“Safety is not a slogan. It is a way of working.”','student-hero'],trainer:['Trainer Workspace','Create better learning experiences and guide every learner.','“Great training turns knowledge into safer actions.”','trainer-hero'],corporate:['Corporate Training Hub','Build a visible, measurable EHS learning culture.','“Competence grows when learning becomes continuous.”','corporate-hero'],admin:['Platform Control Center','Operate Vantras Academy with clarity and confidence.','“Good systems make the right work easier to do.”','admin-hero']};
function roleLabel(role){return role==='corporate'?'Corporate Admin':role.charAt(0).toUpperCase()+role.slice(1)}
function initials(name='User'){return name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function portalHero(role){
  const h=HERO[role],quick={student:'browse',trainer:'create',corporate:'assignment',admin:'users'}[role],daily={student:'results',trainer:'reports',corporate:'reports',admin:'analytics'}[role];
  if(role==='admin')return `<div class="portal-hero admin-hero-clean"><div class="portal-hero-copy"><div class="eyebrow">Admin Portal</div><h1>Platform Control Center, ${esc(state.user.name.split(' ')[0])}</h1><p>Operate users, learning, assessments, credentials and platform governance with clear evidence.</p><div class="quote">“Good systems make the right work easier to do.”</div><div class="portal-hero-actions"><button class="btn btn-primary" onclick="openPage('users')">${icon('users')} User Management</button><button class="btn btn-glass" onclick="openPage('analytics')">${icon('results')} Platform Analytics</button></div></div><div class="admin-control-illustration"><span>${icon('shield')}</span><div><b>CONTROL</b><small>LEARNING</small></div><i></i><i></i><i></i></div></div>`;
  const art=ROLE_HERO_ART[role];
  return `<div class="portal-hero ${h[3]} portal-hero-v6" style="--hero-art:url('assets/${art}')"><div class="portal-hero-copy"><div class="eyebrow">${roleLabel(role)} Portal</div><h1>${h[0]}, ${esc(state.user.name.split(' ')[0])}</h1><p>${h[1]}</p><div class="quote">${h[2]}</div><div class="portal-hero-actions"><button class="btn btn-primary" onclick="openPage('${quick}')">${icon('plus')} Quick Start</button><button class="btn btn-glass" onclick="openPage('${daily}')">${icon('results')} Daily Overview</button></div></div><div class="hero-brand-tag"><img src="assets/managed/logo.png" alt=""><span>People • Safety • Progress</span></div></div>`;
}
function renderPortal(){document.body.classList.add('portal-shell-active');const role=state.user?.role;if(!role||!NAV[role])return renderPublic();const menu=NAV[role];app.innerHTML=`<div class="portal"><aside class="sidebar" id="sidebar"><div class="side-brand"><button class="side-brand-frame" onclick="openPage('dashboard')" aria-label="Dashboard"><img src="assets/managed/logo.png" alt="Vantras EHS Academy"></button></div><div class="portal-role"><b>${roleLabel(role)}</b>${role==='corporate'?esc(state.user.company||'Corporate Training'):role==='trainer'?'Faculty & Course Management':role==='admin'?'System Administration':'Learning Workspace'}</div><nav class="side-menu">${menu.map(([k,ico,label])=>`<button class="${state.portalPage===k?'active':''}" onclick="openPage('${k}')"><span class="nav-ico">${icon(ico)}</span><span>${label}</span></button>`).join('')}</nav><div class="side-slogan side-slogan-${role}">BUILD KNOWLEDGE<br>BUILD SAFETY<br>BUILD CONFIDENCE</div><button class="side-logout" onclick="logout()">${icon('logout')} Logout</button></aside><main class="main"><header class="topbar"><button class="iconbtn mobile-menu" onclick="toggleSidebar()">${icon('menu')}</button><div class="portal-search"><span class="search-glyph">${icon('search')}</span><input placeholder="Search courses, learners, resources..." onkeydown="if(event.key==='Enter')toast('Search applied')"></div><div class="topbar-actions"><button class="iconbtn" onclick="openPage('notifications')">${icon('bell')}</button>${role==='student'&&state.portalPage==='dashboard'?`<button class="iconbtn" onclick="toggleChat()">${icon('ai')}</button>`:''}<div class="top-user"><div class="top-avatar">${initials(state.user.name)}</div><div><b>${esc(state.user.name)}</b><span>${roleLabel(role)}</span></div></div></div></header><div class="content" style="--workspace-art:url('assets/${workspaceImage(role,state.portalPage)}')">${state.portalPage==='dashboard'?portalHero(role)+dashboardVisualRibbon(role):portalSectionVisual(role,state.portalPage)}<div id="portalContent"><div class="empty">Loading workspace…</div></div></div></main></div>${role==='student'&&state.portalPage==='dashboard'?`<button class="chat-fab" onclick="toggleChat()">✦</button>`:''}`;loadPortalPage(role,state.portalPage)}
function toggleSidebar(){document.getElementById('sidebar')?.classList.toggle('open')}
function openPage(p){state.portalPage=p;renderPortal();requestAnimationFrame(()=>document.querySelector('.content')?.scrollTo({top:0,left:0,behavior:'auto'}))}
async function loadPortalPage(role,p){try{if(role==='student')await studentPage(p);else if(role==='trainer')await trainerPage(p);else if(role==='corporate')await corporatePage(p);else await adminPage(p)}catch(e){const el=document.getElementById('portalContent');if(el)el.innerHTML=`<div class="danger-note note"><b>Unable to load this workspace.</b><br>${esc(e.message)}</div>`}}
async function studentPage(p){const el=document.getElementById('portalContent');
if(p==='checkout'){await renderEnrollmentCheckout(el);return}
const enrollmentRequired=new Set(['courseplayer','learningpath','assessments','exams','results','performance','certificates','resources','sessions']);
if(enrollmentRequired.has(p)){
  const access=await api('/api/student/my-courses');
  state.myCourses=access.courses||[];
  state.enrolledCourseIds=new Set(state.myCourses.map(x=>Number(x.id)));
  if(!state.myCourses.length){
    const label=NAV.student.find(x=>x[0]===p)?.[2]||'Student Workspace';
    el.innerHTML=pageTitle(label,'This area unlocks after you enroll in a course and complete payment.')+`<section class="card student-lock-state"><div class="student-lock-icon">${icon('shield')}</div><div><span class="eyebrow">Enrollment Required</span><h2>Enroll in a course to unlock ${esc(label)}.</h2><p>Your course player, learning path, assessments, exams, results, performance, course resources, sessions and certificates are connected to your enrolled courses. Complete enrollment first and this workspace will unlock automatically.</p><button class="btn btn-primary" onclick="openPage('browse')">Browse Courses →</button></div></section>`;
    return;
  }
}
if(p==='browse'){const [d,my]=await Promise.all([api('/api/courses'),api('/api/student/my-courses')]);state.courses=d.courses;state.myCourses=my.courses||[];state.enrolledCourseIds=new Set(state.myCourses.map(x=>Number(x.id)));el.innerHTML=pageTitle('Browse Courses','Choose a course to enroll. Course content, tests and course-linked features unlock only after payment and enrollment are saved.')+`<div class="course-access-banner"><span>${icon('shield')}</span><div><b>Enrollment controls access</b><small>${state.myCourses.length?`${state.myCourses.length} course${state.myCourses.length===1?' is':'s are'} currently unlocked.`:'No courses are unlocked yet. Enroll to begin.'}</small></div></div><div class="toolbar"><div class="search"><input id="studentSearch" placeholder="Search course, category or code..." oninput="filterStudentCourses()"></div><select id="studentCat" onchange="filterStudentCourses()"><option value="">All Categories</option>${[...new Set(d.courses.map(c=>c.category))].map(x=>`<option>${esc(x)}</option>`).join('')}</select><select id="studentLvl" onchange="filterStudentCourses()"><option value="">All Levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div id="studentCourseGrid" class="course-grid"></div>`;filterStudentCourses();return}

if(p==='mycourses'){const d=await api('/api/student/my-courses');state.myCourses=d.courses;el.innerHTML=pageTitle('My Courses','Continue learning, review progress and complete enrolled EHS programs.',`<button class="btn btn-primary" onclick="openPage('browse')">${icon('plus')} Explore Courses</button>`)+(d.courses.length?`<div class="metric-grid">${metric('Enrolled',d.courses.length,'Learning programs','','courses')}${metric('In Progress',d.courses.filter(x=>x.progress<100).length,'Need attention','blue','learn')}${metric('Completed',d.courses.filter(x=>x.progress>=100).length,'Finished courses','green','certificate')}${metric('Average',Math.round(d.courses.reduce((a,x)=>a+x.progress,0)/d.courses.length)+'%','Course progress','orange','results')}</div><div class="course-grid">${d.courses.map((c,i)=>`<div class="card course-card"><div class="course-cover"><img src="${courseImage(c,i)}"><span class="tag">${c.progress>=100?'Completed':'In Progress'}</span></div><div class="course-body"><div class="kicker">${esc(c.code)}</div><h3>${esc(c.title)}</h3><div class="mini-meta"><span>${esc(c.level)}</span><span>•</span><span>${esc(c.duration)}</span></div><div style="margin:9px 0 3px;display:flex;justify-content:space-between;font-size:9px"><b>Progress</b><span>${c.progress}%</span></div>${progress(c.progress)}<div class="action-row"><button class="btn btn-primary btn-sm" onclick="state.selectedCourse=${c.id};openPage('courseplayer')">${c.progress?'Continue':'Start Course'}</button><button class="btn btn-ghost btn-sm" onclick="courseDetailFromMy(${c.id})">Details</button></div></div></div>`).join('')}</div>`:`<div class="empty"><div class="big">🎓</div><h3>Start your learning journey</h3><p>Enroll in a Vantras EHS course to see it here.</p><button class="btn btn-primary" onclick="openPage('browse')">Browse Courses</button></div>`);return}

if(p==='courseplayer'){const d=await api('/api/student/my-courses');state.myCourses=d.courses;const c=d.courses.find(x=>Number(x.id)===Number(state.selectedCourse))||d.courses[0];if(!c){el.innerHTML=pageTitle('Course Player','Your enrolled learning workspace.')+`<div class="empty">Enroll in a course to open the course player.<br><button class="btn btn-primary" onclick="openPage('browse')">Browse Courses</button></div>`;return}state.selectedCourse=c.id;const modules=Array.from({length:Number(c.modules||10)},(_,i)=>({n:i+1,title:i===4?'Module Assessment':i===9?'Final Course Assessment':['Introduction & Objectives','Hazard Recognition','Controls & Responsibilities','Practical Application','Assessment','Incident Scenarios','Inspection & Monitoring','Emergency Preparedness','Review & Revision','Final Assessment'][i]||`Module ${i+1}`,assessment:i===4||i===9}));let lp=[];try{lp=(await api('/api/student/lesson-progress?course_id='+c.id)).progress||[]}catch{};const doneMap=Object.fromEntries(lp.map(x=>[Number(x.module_no),x]));let active=modules.find(m=>!doneMap[m.n]?.module_completed)||modules[modules.length-1];state.activeModule=active.n;const videoDone=!!doneMap[active.n]?.video_completed;el.innerHTML=pageTitle(c.title,`${c.code} • ${c.level} • ${c.duration}`,`<button class="btn btn-ghost" onclick="openPage('mycourses')">← My Courses</button>`)+`<div class="player-layout v9-player"><div class="card curriculum-card"><div class="curriculum-head"><b>Course Curriculum</b><div class="small muted">${lp.filter(x=>x.module_completed).length}/${modules.length} modules complete</div>${progress(c.progress)}</div>${modules.map(m=>`<button class="module-item ${m.n===active.n?'active':''} ${doneMap[m.n]?.module_completed?'done':''}" onclick="selectStudentModule(${c.id},${m.n},${m.assessment?1:0},'${esc(m.title)}')"><span class="module-check">${doneMap[m.n]?.module_completed?'✓':m.n}</span><span>${esc(m.title)}</span>${m.assessment?'<small>Assessment</small>':''}</button>`).join('')}</div><div><div class="training-player-card"><div class="video-shell">${active.assessment?`<div class="assessment-gate"><div class="assessment-icon">${icon('assessment')}</div><div><div class="eyebrow">Assessment Module</div><h2>${esc(active.title)}</h2><p>This module is completed through the linked test. The attempt and score are automatically saved under Results.</p><button class="btn btn-primary" onclick="openAssessmentForCourse(${c.id})">Open Assessment →</button></div></div>`:`<video id="lessonVideo" controls preload="metadata" poster="${courseImage(c,c.id)}" ontimeupdate="trackLessonVideo(${c.id},${active.n},this)" onended="completeLessonVideo(${c.id},${active.n})"><source src="assets/managed/videos/training.mp4" type="video/mp4"></video>`}</div><div class="lesson-content-v9"><div><div class="eyebrow">Module ${active.n}</div><h2>${esc(active.title)}</h2><p class="muted">${active.assessment?'Open the assessment when ready.':'Watch the training video to the end. Only then can this lesson be marked complete.'}</p></div><div class="lesson-status"><span class="${videoDone?'done':'pending'}">${videoDone?'✓ Video completed':'Video required'}</span></div></div><div class="action-row"><button class="btn btn-ghost" onclick="openLessonNotes('${esc(active.title)}',${active.n})">Lesson Notes</button>${active.assessment?`<button class="btn btn-primary" onclick="openAssessmentForCourse(${c.id})">Take Assessment</button>`:`<button id="moduleCompleteBtn" class="btn btn-primary" ${videoDone?'':'disabled'} onclick="completeStudentModule(${c.id},${active.n})">✓ Mark Module Complete</button>`}</div></div></div><div class="player-side"><div class="card"><h3>Lesson Resources</h3>${[['PDF','Module Study Guide'],['Checklist','Practical Inspection Sheet'],['AUDIO','Audio Safety Briefing'],['Reference','Key EHS Controls']].map((x,i)=>`<button class="lesson-resource" onclick="openLessonResource('${x[1]}','${x[0]}',${i})"><span class="resource-dot">${x[0][0]}</span><span><b>${x[1]}</b><span>${x[0]} • Learning resource</span></span></button>`).join('')}</div><div class="card progress-purpose-card" style="margin-top:10px"><h3>Your Progress</h3>${ring(c.progress,'Course')}<div class="progress-purpose"><div><i class="purpose-green"></i><span><b>Green — Completed</b><small>Successfully finished learning or assessment.</small></span></div><div><i class="purpose-blue"></i><span><b>Blue — Current</b><small>Your active learning module.</small></span></div><div><i class="purpose-amber"></i><span><b>Amber — Pending</b><small>Still requires video, lesson or assessment.</small></span></div></div></div></div></div>`;return}

if(p==='learningpath'){
  const d=await api('/api/student/my-courses');
  const c=d.courses||[];
  const avg=c.length?Math.round(c.reduce((a,x)=>a+Number(x.progress||0),0)/c.length):0;
  const completed=c.filter(x=>Number(x.progress||0)>=100).length;
  const active=c.filter(x=>Number(x.progress||0)>0&&Number(x.progress||0)<100);
  const current=active[0]||c.find(x=>Number(x.progress||0)<100)||c[0];
  const stages=[
    ['Foundation Safety','Build essential EHS awareness, responsibilities and safe-work fundamentals.',0,20,'shield'],
    ['Hazard & Risk Controls','Recognize hazards, assess risk and select practical controls.',20,45,'assessment'],
    ['Emergency & Fire Readiness','Strengthen response, fire prevention and emergency preparedness.',45,65,'live'],
    ['Compliance & Audits','Apply inspection, compliance, documentation and corrective-action skills.',65,85,'report'],
    ['EHS Leadership','Lead safety performance, improvement and workplace learning.',85,101,'users']
  ];
  const currentStage=avg>=85?4:avg>=65?3:avg>=45?2:avg>=20?1:0;
  const roadmap=stages.map((x,i)=>{
    const status=i<currentStage?'complete':i===currentStage?'current':'upcoming';
    const stageProgress=status==='complete'?100:status==='upcoming'?0:Math.max(8,Math.min(99,Math.round(((avg-x[2])/(x[3]-x[2]))*100)));
    return `<div class="lp-stage ${status}">
      <div class="lp-stage-marker"><span>${status==='complete'?'✓':i+1}</span></div>
      <div class="lp-stage-main">
        <div class="lp-stage-top"><div><small>Stage ${i+1}</small><h3>${x[0]}</h3></div><span class="lp-status ${status}">${status==='complete'?'Completed':status==='current'?'Current':'Upcoming'}</span></div>
        <p>${x[1]}</p>
        <div class="lp-stage-progress"><span style="width:${stageProgress}%"></span></div>
        <div class="lp-stage-foot"><span>${stageProgress}% stage progress</span><span>${status==='current'?'Keep moving':'Roadmap milestone'}</span></div>
      </div>
    </div>`;
  }).join('');
  const nextActions=current?[
    [`Continue ${current.title}`,`${Number(current.progress||0)}% complete • ${current.level||'Learning program'}`,'mycourses','learn'],
    ['Take a skills check','Use an assessment to confirm what you understand.','assessments','assessment'],
    ['Review your performance','Use results to decide what to strengthen next.','performance','results']
  ]:[
    ['Explore EHS courses','Choose your first learning program.','browse','courses'],
    ['Build your first milestone','Your roadmap updates as soon as you enroll.','browse','path'],
    ['Track progress automatically','Course and assessment activity feeds this roadmap.','browse','results']
  ];
  el.innerHTML=pageTitle('Learning Path','Your personal EHS roadmap—what you have completed, what you are working on now, and what comes next.',`<button class="btn btn-primary" onclick="openPage('${current?'mycourses':'browse'}')">${icon(current?'learn':'courses')} ${current?'Continue Learning':'Explore Courses'}</button>`)+`
    <div class="lp-summary-grid">
      <div class="lp-summary-card"><span class="lp-summary-icon">${icon('results')}</span><div><small>Overall readiness</small><b>${avg}%</b><p>Based on enrolled course progress.</p></div></div>
      <div class="lp-summary-card"><span class="lp-summary-icon">${icon('courses')}</span><div><small>Active learning</small><b>${active.length}</b><p>${c.length?`${c.length} enrolled program${c.length===1?'':'s'}`:'No courses enrolled yet'}</p></div></div>
      <div class="lp-summary-card"><span class="lp-summary-icon">${icon('certificate')}</span><div><small>Completed</small><b>${completed}</b><p>Programs ready toward credentials.</p></div></div>
      <div class="lp-summary-card current"><span class="lp-summary-icon">${icon('path')}</span><div><small>Current stage</small><b>${currentStage+1}/5</b><p>${stages[currentStage][0]}</p></div></div>
    </div>
    <div class="lp-layout">
      <section class="card lp-roadmap-card">
        <div class="lp-card-head"><div><span class="eyebrow">Personal Roadmap</span><h2>Build capability step by step</h2><p>Progress automatically updates as you complete courses and assessments.</p></div><span class="lp-readiness-chip">${avg}% ready</span></div>
        <div class="lp-roadmap">${roadmap}</div>
      </section>
      <aside class="lp-side">
        <section class="card lp-current-card">
          <div class="lp-card-head compact"><div><span class="eyebrow">Current Focus</span><h3>${current?esc(current.title):'Start your first course'}</h3></div></div>
          ${current?`<div class="lp-current-progress"><div><span>Course progress</span><b>${Number(current.progress||0)}%</b></div>${progress(Number(current.progress||0))}</div><p>${esc(current.category||'EHS Learning')} • ${esc(current.level||'Program')} • ${esc(current.duration||'Self-paced')}</p><button class="btn btn-primary" onclick="state.selectedCourse=${Number(current.id)};openPage('courseplayer')">Continue Course →</button>`:`<p>Your roadmap becomes personalized after your first enrollment.</p><button class="btn btn-primary" onclick="openPage('browse')">Browse Courses →</button>`}
        </section>
        <section class="card lp-next-card">
          <div class="lp-card-head compact"><div><span class="eyebrow">Recommended Next</span><h3>Your next best actions</h3></div></div>
          <div class="lp-action-list">${nextActions.map((x,i)=>`<button onclick="openPage('${x[2]}')"><span class="lp-action-icon">${icon(x[3])}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><strong>→</strong></button>`).join('')}</div>
        </section>
        <section class="card lp-target-card">
          <span class="eyebrow">This Week</span><h3>Keep momentum simple</h3>
          <div class="lp-target-row"><span>Complete one module</span><b>${active.length?'In progress':'Start now'}</b></div>
          <div class="lp-target-row"><span>Take one assessment</span><b>Recommended</b></div>
          <div class="lp-target-row"><span>Review one weak area</span><b>Next action</b></div>
        </section>
      </aside>
    </div>`;
  return
}
if(p==='assessments'||p==='exams'){const d=await api('/api/student/assessments');state.assessments=d.assessments;const rows=[...d.assessments].sort((a,b)=>Number(a.ending_in_days)-Number(b.ending_in_days));const attempted=rows.filter(x=>Number(x.attempt_count)>0);const endingSoon=rows.filter(x=>Number(x.ending_in_days)<=5);const titleText=p==='exams'?'Exams':'Assessments';el.innerHTML=pageTitle(titleText,p==='exams'?'Complete course examinations before their closing date. Every attempt is recorded in Results.':'Choose a knowledge check, read the instructions and write the test. Every submitted attempt is saved in Test History.')+`<div class="metric-grid">${metric('Available',rows.length,'Active tests','','assessment')}${metric('Attempted',attempted.length,'At least one submission','blue','exam')}${metric('Ending Soon',endingSoon.length,'Due within 5 days','orange','calendar')}${metric('Pass Target',Math.max(...rows.map(x=>Number(x.pass_percent)||0),0)+'%','Highest current threshold','green','shield')}</div><div class="assessment-flow-strip"><span><b>1</b> Open</span><i>→</i><span><b>2</b> Instructions</span><i>→</i><span><b>3</b> Write Test</span><i>→</i><span><b>4</b> Submit</span><i>→</i><span class="green"><b>5</b> Saved in Results</span></div><div class="grid grid-2 assessment-grid-v8">${rows.map((a,i)=>`<div class="card assessment-card ${Number(state.pendingAssessment)===Number(a.id)?'selected-assessment':''}"><div class="assessment-cover"><img src="${courseImage(null,i+6)}" alt=""><div class="assessment-cover-top"><span class="assessment-cover-badge">${esc(a.exam_type||'Knowledge Check')}</span><span class="ending-chip ${a.ending_in_days<=3?'urgent':''}">Ends ${formatDue(a)}</span></div></div><div class="assessment-card-body"><div class="assessment-status-row"><span class="pill ${a.best_score>=a.pass_percent?'green':'blue'}">${a.best_score!=null?`Best ${a.best_score}%`:'Not attempted'}</span><span class="attempt-count">${a.attempt_count||0} attempt${Number(a.attempt_count)===1?'':'s'}</span></div><h3>${esc(a.title)}</h3><p class="small muted">${esc(a.course)}</p><div class="mini-meta"><span>${esc(a.difficulty)}</span><span>•</span><span>${a.time_minutes} min</span><span>•</span><span>Pass ${a.pass_percent}%</span></div><div class="exam-deadline"><span>${icon('calendar')}</span><div><b>${a.ending_in_days===1?'Ends tomorrow':`Ends in ${a.ending_in_days} days`}</b><small>${formatDue(a)}</small></div></div><div class="action-row"><button class="btn btn-primary btn-sm" onclick="startAssessmentFlow(${a.id})">${a.attempt_count?'Retake Test':'Open Test'} →</button><button class="btn btn-ghost btn-sm" onclick="assessmentDetails(${a.id})">Details</button>${a.attempt_count?`<button class="btn btn-soft btn-sm" onclick="openPage('results')">History</button>`:''}</div></div></div>`).join('')}</div><div class="result-save-note wide-note">✓ Your score, correct answers, pass status and submission time are automatically recorded under <button onclick="openPage('results')">Results → Test History</button>.</div>`;if(state.pendingAssessment){setTimeout(()=>{document.querySelector('.selected-assessment')?.scrollIntoView({behavior:'smooth',block:'center'});state.pendingAssessment=null},80)}return}

if(p==='results'){const d=await api('/api/student/results');const rows=d.results||[];const passed=rows.filter(x=>Number(x.passed)===1);const unique=new Set(rows.map(x=>x.assessment_id));const avg=rows.length?Math.round(rows.reduce((a,x)=>a+Number(x.score||0),0)/rows.length):0;el.innerHTML=pageTitle('Results','Complete test history. Every submitted assessment attempt is saved here, including retakes.',`<button class="btn btn-primary" onclick="openPage('assessments')">${icon('assessment')} Take Assessment</button>`)+(rows.length?`<div class="metric-grid">${metric('Test Attempts',rows.length,'All submitted attempts','','exam')}${metric('Assessments',unique.size,'Unique tests attempted','blue','assessment')}${metric('Passed',passed.length,'Passing submissions','green','shield')}${metric('Average',avg+'%','Across all attempts','orange','results')}</div><div class="card result-history-intro"><div><div class="eyebrow">Test History</div><h3>Your assessment record</h3><p>Newest submission appears first. Retakes are preserved instead of replacing the previous result.</p></div><span class="history-save-badge">Auto-saved ✓</span></div><div class="table-wrap"><table class="table result-history-table"><thead><tr><th>Submitted</th><th>Assessment</th><th>Course</th><th>Score</th><th>Correct</th><th>Result</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${fmtDate(r.submitted_at)}</strong></td><td><strong>${esc(r.title)}</strong><br><small>${esc(r.difficulty)}</small></td><td>${esc(r.course)}</td><td><b class="score-cell">${r.score}%</b></td><td>${r.correct}/${r.total}</td><td><span class="status ${Number(r.passed)===1?'completed':'attention'}">${Number(r.passed)===1?'Passed':'Review'}</span></td><td><div class="action-row compact"><button class="btn btn-ghost btn-sm" onclick="assessmentDetails(${r.assessment_id})">View</button><button class="btn btn-soft btn-sm" onclick="startAssessmentFlow(${r.assessment_id})">Retake</button></div></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><div class="big">📝</div><h3>No test history yet</h3><p>Submit your first assessment and the result will appear here automatically.</p><button class="btn btn-primary" onclick="openPage('assessments')">Take an Assessment</button></div>`);return}

if(p==='performance'){const [d,a,my]=await Promise.all([api('/api/dashboard'),api('/api/student/assessments'),api('/api/student/my-courses')]);const m=d.metrics;el.innerHTML=pageTitle('Performance','Understand your learning consistency, assessment strength and progress trends.',`<button class="btn btn-ghost" onclick="downloadPortalReport('Student Performance Report')">${icon('report')} Download Report</button>`)+`<div class="metric-grid">${metric('Readiness',Math.max(42,m.progress)+'%','Learning progress','green','results','+6%')}${metric('Skill Score',Math.round((m.progress+m.avg_score)/2)+'%','Progress + assessments','blue','shield')}${metric('Assessment Avg',m.avg_score+'%','Across attempts','orange','assessment')}${metric('Learning Activity',my.courses.length*3+' hrs','Estimated study time','purple','learn')}</div><div class="dash-two"><div class="card">${sectionTitle('Performance Trend')}<div class="mini-meta"><span class="pill green">Improving</span><span>Recent assessment performance</span></div>${lineChart([54,61,58,69,74,81,Math.max(82,m.avg_score)])}</div><div class="card"><h3>Subject-wise Performance</h3><div class="hbar-list">${[['Occupational Safety',86],['Risk Management',78],['Fire Safety',74],['Compliance',69],['Environment',63]].map(x=>`<div class="hbar-row"><span>${x[0]}</span><div class="hbar-track"><span style="width:${x[1]}%"></span></div><b>${x[1]}%</b></div>`).join('')}</div></div></div><div class="dash-two" style="margin-top:11px"><div class="card"><h3>Strengths</h3>${['Hazard identification','Hierarchy of controls','Emergency response'].map(x=>`<div class="activity"><span class="dot"></span><div><strong>${x}</strong><p>Consistently strong learning signal.</p></div></div>`).join('')}</div><div class="card"><h3>Recommended for Improvement</h3>${['Incident causation analysis','Legal compliance mapping','Environmental aspect scoring'].map(x=>`<div class="activity"><span class="dot" style="background:#f0a23c"></span><div><strong>${x}</strong><p>Review the related learning module and retry practice questions.</p></div></div>`).join('')}</div></div>`;return}
if(p==='certificates'){const d=await api('/api/student/certificates');el.innerHTML=pageTitle('Certificates','View, verify and share your completed Vantras credentials.')+(d.certificates.length?`<div class="grid grid-3">${d.certificates.map((c,i)=>`<div class="card certificate-card"><div class="certificate-banner"><div class="kicker" style="color:#b9eedc">Verified Credential</div><h3>${esc(c.course)}</h3></div><div class="certificate-body"><div class="certificate-seal">✓</div><div class="small muted" style="margin-top:8px">${esc(c.certificate_no)}</div><h3>${esc(c.student)}</h3><div class="mini-meta"><span>Issued ${esc(c.issue_date)}</span><span>•</span><span class="status ${c.status.toLowerCase()}">${esc(c.status)}</span></div><div class="action-row"><button class="btn btn-primary btn-sm" onclick="viewCertificate(${c.id})">View</button><button class="btn btn-ghost btn-sm" onclick="downloadCertificate(${c.id})">Download</button><button class="btn btn-ghost btn-sm" onclick="shareCertificate(${c.id})">Share</button></div></div></div>`).join('')}</div>`:`<div class="empty"><div class="big">🏅</div><h3>No certificates yet</h3><p>Complete an enrolled course to generate a certificate.</p><button class="btn btn-primary" onclick="openPage('mycourses')">Continue Learning</button></div>`);return}
if(p==='payments'){const d=await api('/api/student/payments');const total=d.payments.reduce((a,x)=>a+Number(x.amount||0),0);el.innerHTML=pageTitle('Payments','Your course orders, payment status and transaction history.')+`<div class="metric-grid">${metric('Total Paid',money(total),'Successful learning purchases','','payment')}${metric('Orders',d.payments.length,'Course transactions','blue','courses')}${metric('Successful',d.payments.filter(x=>x.status==='Successful').length,'Verified payments','green','shield')}${metric('Refunds','0','No refunds','orange','payment')}</div>${d.payments.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Course</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead><tbody>${d.payments.map(x=>`<tr><td><strong>${esc(x.order_id)}</strong><br><small>${esc(x.payment_id||'')}</small></td><td>${esc(x.course)}</td><td><b>${money(x.amount)}</b></td><td>${esc(x.method||'UPI')}</td><td><span class="status successful">${esc(x.status)}</span></td><td>${fmtDate(x.paid_at)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">No payment history yet.</div>`}`;return}
if(p==='resources'){const d=await api('/api/resources');el.innerHTML=pageTitle('Resources','Access practical EHS forms, checklists and learning references.')+`<div class="grid grid-3">${d.resources.map((r,i)=>`<div class="card hover resource-card-v5"><div class="resource-cover-v5"><img src="${courseImage(null,i+12)}" alt=""><span>${esc(r.type||'Resource')}</span></div><div class="resource-card-body-v5"><div class="metric-icon ${i%3===1?'blue':i%3===2?'orange':''}">${icon('resource')}</div><span class="pill ${r.access==='Free'?'green':'blue'}">${esc(r.access)}</span><h3 style="margin-top:10px">${esc(r.title)}</h3><p class="small muted">${esc(r.type||'Learning resource')} • Available in your Vantras resource library.</p><div class="action-row"><button class="btn btn-primary btn-sm" onclick="openResourcePreview('Student EHS Resource','Course Resource','Enrolled')">Open</button><button class="btn btn-ghost btn-sm" onclick="saveResourceToLibrary('Student EHS Resource')">Save</button></div></div></div>`).join('')}</div>`;return}
if(p==='sessions'){el.innerHTML=pageTitle('Live Sessions','Join upcoming instructor-led learning and review recorded sessions.')+`<div class="metric-grid">${metric('Upcoming','3','Scheduled sessions','','live')}${metric('This Week','2','Live classes','blue','calendar')}${metric('Recordings','8','Available replays','green','courses')}${metric('Attendance','92%','Session participation','orange','users')}</div><div class="dash-two"><div class="card"><h3>Upcoming Sessions</h3>${[['SEP','11','HIRA Workshop','Today • 6:30 PM','R. Anand'],['SEP','14','Fire Safety Q&A','Saturday • 11:00 AM','S. Mehta'],['SEP','18','Incident Investigation Clinic','Wednesday • 7:00 PM','P. Kumar']].map(x=>`<div class="session-row"><div class="date-badge"><div class="month">${x[0]}</div><div class="day">${x[1]}</div></div><div class="session-info"><b>${x[2]}</b><p>${x[3]} • ${x[4]}</p></div><button class="btn btn-primary btn-sm" onclick="openLiveClassroom('${x[2]}')">Join</button></div>`).join('')}</div><div class="card"><h3>Recent Recordings</h3>${['LOTO Practical Demonstration','Confined Space Entry Planning','Safety Audit Case Review'].map((x,i)=>`<div class="module-list-item"><span class="module-list-ico">▶</span><div><b>${x}</b><span>${28+i*7} min • Recording</span></div><button class="btn btn-ghost btn-sm" onclick="openRecording()">Watch</button></div>`).join('')}</div></div>`;return}
if(p==='ai'){el.innerHTML=pageTitle('AI EHS Assistant','Ask any question and receive a complete, clearly explained answer.')+`<div class="ai-workbench ai-workbench-v37">
<aside class="ai-history-panel card"><div class="ai-history-brand"><span class="ai-robot-mark">🤖</span><div><b>Vantras AI</b><small>Your conversation history</small></div></div><button class="btn btn-primary ai-new-chat" onclick="newAiChat()">${icon('plus')} New Chat</button><div class="ai-history-search">${icon('search')}<input id="aiHistorySearch" placeholder="Search conversations..." oninput="renderAiThreads()"></div><div class="ai-history-caption"><span>Conversation history</span><button onclick="clearAiHistory()">Clear</button></div><div id="aiThreadList" class="ai-thread-list"></div><div class="ai-history-foot"><span class="ai-mini-orb">✦</span><div><b>Saved chats</b><small>Rename • Pin • Share • Archive</small></div></div></aside>
<section class="ai-chat-main card ai-chat-main-v37"><header class="ai-chat-top"><div class="ai-agent-title"><span class="ai-agent-avatar robo-active">🤖</span><div><b>AI EHS Assistant</b><small>Detailed answers for EHS and general questions</small></div></div><span class="ai-ready-chip"><i></i> Ready</span></header><div id="aiPageMessages" class="ai-page-messages ai-page-messages-v37"></div><div class="ai-page-composer ai-page-composer-v37"><input id="aiFileInput" type="file" hidden onchange="handleAiFile(this)"><button class="ai-compose-icon" onclick="document.getElementById('aiFileInput').click()" title="Attach file">＋</button><textarea id="aiPageQ" rows="1" placeholder="Ask your question..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAiWorkspace()}"></textarea><button class="ai-compose-icon mic" onclick="startAiVoice()" title="Voice input">🎙</button><button class="ai-send-btn" onclick="sendAiWorkspace()">${icon('ai')}<span>Send</span></button></div><div class="ai-composer-note">Ask follow-up questions in the same conversation. Only the question-and-answer area scrolls.</div></section></div>`;setTimeout(initAiWorkspace,0);return}

if(p==='notifications'){el.innerHTML=richModulePage('Notifications','Stay updated on learning deadlines, certificates, sessions and course activity.','bell',[['Course reminder','Continue Risk Assessment Essentials — 62% complete.','Today'],['Live session','HIRA Workshop starts tomorrow at 6:30 PM.','1 day'],['Assessment available','Fire Safety Knowledge Check is ready.','2 days'],['Resource added','New incident investigation checklist available.','3 days']],[['Unread','3'],['This week','7'],['Important','2']]);return}
if(p==='profile'){const d=await api('/api/dashboard');el.innerHTML=pageTitle('Profile','Manage your learner identity and review your academy activity.')+`<div class="split"><div class="card"><div style="display:flex;gap:15px;align-items:center;margin-bottom:15px"><div class="top-avatar" style="width:72px;height:72px;font-size:22px">${initials(state.user.name)}</div><div><div class="eyebrow">Student Profile</div><h2 style="margin:4px 0">${esc(state.user.name)}</h2><span class="small muted">${esc(state.user.email)}</span></div></div><div class="grid grid-2"><div class="field"><label>Full Name</label><input value="${esc(state.user.name)}"></div><div class="field"><label>Email</label><input value="${esc(state.user.email)}" disabled></div><div class="field"><label>Designation</label><input placeholder="Safety Officer"></div><div class="field"><label>Experience</label><input placeholder="3 years"></div></div><button class="btn btn-primary" onclick="toast('Profile changes saved')">Save Changes</button></div><div><div class="card"><h3>Learning Summary</h3>${[['Courses enrolled',d.metrics.enrolled],['Overall progress',d.metrics.progress+'%'],['Assessments',d.metrics.attempts],['Certificates',d.metrics.certificates]].map(x=>`<div class="stat-row"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div><div class="card" style="margin-top:11px"><h3>Account</h3><button class="btn btn-ghost" style="width:100%" onclick="openPasswordSettings()">Change Password</button></div></div></div>`;return}
if(p==='support'){return supportPage(el)}
}

function filterStudentCourses(){const s=(document.getElementById('studentSearch')?.value||'').toLowerCase(),cat=document.getElementById('studentCat')?.value||'',lvl=document.getElementById('studentLvl')?.value||'';const rows=state.courses.filter(c=>(!s||(c.title+' '+c.category+' '+c.code).toLowerCase().includes(s))&&(!cat||c.category===cat)&&(!lvl||c.level===lvl));const el=document.getElementById('studentCourseGrid');if(el)el.innerHTML=rows.length?rows.map((c,i)=>courseCard(c,i,true)).join(''):`<div class="empty">No courses match the selected filters.</div>`}
function courseDetailFromMy(id){const c=state.myCourses.find(x=>Number(x.id)===Number(id));if(!c)return;state.courses=[...state.courses.filter(x=>Number(x.id)!==Number(id)),c];courseDetail(id)}
async function enroll(id){
  const cid=Number(id);
  if(!state.user){
    state.pendingEnrollCourse=cid;
    showAuth('login','student');
    toast('Sign in or register as a Student to continue to payment');
    return;
  }
  if(state.user.role!=='student'){
    toast('Course enrollment is available from the Student portal','error');
    return;
  }
  state.checkoutCourse=cid;
  state.portalPage='checkout';
  renderPortal();
}

async function getCheckoutCourse(){
  const cid=Number(state.checkoutCourse||state.pendingEnrollCourse||0);
  if(!cid)return null;
  let c=[...(state.courses||[]),...(state.myCourses||[])].find(x=>Number(x.id)===cid);
  if(!c){
    const d=await api('/api/courses');
    state.courses=d.courses||[];
    c=state.courses.find(x=>Number(x.id)===cid);
  }
  return c||null;
}

function paymentMethodFields(method){
  const box=document.getElementById('paymentMethodFields');
  if(!box)return;
  if(method==='UPI'){
    box.innerHTML=`<div class="field"><label>UPI ID</label><input id="paymentUpi" placeholder="name@bank" autocomplete="off"></div><div class="checkout-help">Enter your UPI ID. The prototype records the transaction after you confirm payment.</div>`;
  }else if(method==='Card'){
    box.innerHTML=`<div class="grid grid-2"><div class="field" style="grid-column:1/-1"><label>Card number</label><input id="paymentCard" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456"></div><div class="field"><label>Expiry</label><input id="paymentExpiry" placeholder="MM/YY"></div><div class="field"><label>CVV</label><input id="paymentCvv" type="password" inputmode="numeric" maxlength="4" placeholder="•••"></div></div>`;
  }else if(method==='Net Banking'){
    box.innerHTML=`<div class="field"><label>Select bank</label><select id="paymentBank"><option>HDFC Bank</option><option>ICICI Bank</option><option>State Bank of India</option><option>Axis Bank</option><option>Bank of Baroda</option></select></div>`;
  }else{
    box.innerHTML=`<div class="field"><label>Wallet</label><select id="paymentWallet"><option>PhonePe</option><option>Google Pay</option><option>Paytm</option></select></div>`;
  }
}

function selectPaymentMethod(method){
  document.querySelectorAll('.payment-method-card').forEach(x=>x.classList.toggle('active',x.dataset.method===method));
  const hidden=document.getElementById('paymentMethod');if(hidden)hidden.value=method;
  paymentMethodFields(method);
}

async function renderEnrollmentCheckout(el=document.getElementById('portalContent')){
  if(!el)return;
  try{
    const c=await getCheckoutCourse();
    if(!c){el.innerHTML=`<div class="empty"><h3>Course unavailable</h3><p>Select a course again to continue.</p><button class="btn btn-primary" onclick="openPage('browse')">Browse Courses</button></div>`;return}
    const my=await api('/api/student/my-courses');
    if((my.courses||[]).some(x=>Number(x.id)===Number(c.id))){
      el.innerHTML=`${pageTitle('Already Enrolled','This course is already active in your learning workspace.')}<div class="card checkout-already"><div class="metric-icon">${icon('certificate')}</div><h3>${esc(c.title)}</h3><p class="muted">No additional payment is required.</p><button class="btn btn-primary" onclick="state.selectedCourse=${c.id};openPage('courseplayer')">Continue Learning →</button></div>`;
      return;
    }
    const fee=Number(c.price||0);
    const total=fee;
    el.innerHTML=`
      <section class="checkout-shell">
        <div class="checkout-progress"><span class="done"><b>1</b>Course</span><i></i><span class="active"><b>2</b>Billing</span><i></i><span><b>3</b>Payment</span><i></i><span><b>4</b>Enrollment</span></div>
        <div class="checkout-layout">
          <div class="checkout-main">
            <div class="card checkout-card">
              <div class="checkout-card-head"><div><span class="eyebrow">Secure enrollment checkout</span><h2>Billing details</h2><p>Confirm your details before making the course payment.</p></div><span class="checkout-secure">${icon('shield')} Secure</span></div>
              <div class="grid grid-2"><div class="field"><label>Student name</label><input id="billingName" value="${esc(state.user.name||'')}"></div><div class="field"><label>Email</label><input id="billingEmail" value="${esc(state.user.email||'')}" disabled></div><div class="field"><label>Mobile</label><input id="billingMobile" value="${esc(state.user.mobile||'')}" placeholder="Mobile number"></div><div class="field"><label>Country</label><select id="billingCountry"><option>India</option><option>United States</option><option>United Arab Emirates</option><option>Other</option></select></div></div>
            </div>
            <div class="card checkout-card">
              <div class="checkout-card-head"><div><span class="eyebrow">Choose payment method</span><h2>Payment</h2></div></div>
              <input id="paymentMethod" type="hidden" value="UPI">
              <div class="payment-method-grid">
                ${[['UPI','payment','UPI'],['Card','payment','Debit / Credit Card'],['Net Banking','shield','Net Banking'],['Wallet','payment','Wallet']].map((x,i)=>`<button type="button" data-method="${x[0]}" class="payment-method-card ${i===0?'active':''}" onclick="selectPaymentMethod('${x[0]}')"><span>${icon(x[1])}</span><b>${x[2]}</b><small>${i===0?'Fast & convenient':'Secure payment option'}</small></button>`).join('')}
              </div>
              <div id="paymentMethodFields" class="payment-method-fields"></div>
              <label class="checkout-consent"><input id="paymentConsent" type="checkbox"> <span>I confirm the billing details and agree to the enrollment and payment terms.</span></label>
              <div class="checkout-pay-actions"><button class="btn btn-ghost" onclick="openPage('browse')">← Back to Courses</button><button id="checkoutPayBtn" class="btn btn-primary checkout-pay-btn" onclick="completeEnrollmentPayment(${c.id})">${icon('payment')} Pay ${money(total)} & Enroll</button></div>
              <p class="checkout-note">Enrollment is activated only after the payment step succeeds. The transaction then appears in Student → Payments.</p>
            </div>
          </div>
          <aside class="card checkout-summary">
            <img src="${courseImage(c,c.id)}" alt="${esc(c.title)}">
            <span class="pill green">Selected Course</span><h3>${esc(c.title)}</h3><p>${esc(c.code||'VANTRAS')} • ${esc(c.level||'Professional')} • ${esc(c.duration||'Self paced')}</p>
            <div class="checkout-summary-row"><span>Course fee</span><b>${money(fee)}</b></div><div class="checkout-summary-row"><span>Taxes</span><b>Included</b></div><div class="checkout-summary-row total"><span>Total payable</span><b>${money(total)}</b></div>
            <div class="checkout-benefits"><span>${icon('learn')} Full course access</span><span>${icon('assessment')} Assessments included</span><span>${icon('certificate')} Certificate on successful completion</span></div>
          </aside>
        </div>
      </section>`;
    paymentMethodFields('UPI');
  }catch(e){el.innerHTML=`<div class="danger-note note"><b>Unable to open payment page.</b><br>${esc(e.message)}</div>`}
}

async function completeEnrollmentPayment(id){
  const method=document.getElementById('paymentMethod')?.value||'UPI';
  const consent=document.getElementById('paymentConsent')?.checked;
  if(!consent)return toast('Please confirm the enrollment and payment terms','error');
  if(method==='UPI' && !(document.getElementById('paymentUpi')?.value||'').trim())return toast('Enter your UPI ID','error');
  if(method==='Card'){
    if((document.getElementById('paymentCard')?.value||'').replace(/\s/g,'').length<12)return toast('Enter a valid card number','error');
    if(!(document.getElementById('paymentExpiry')?.value||'').trim()||!(document.getElementById('paymentCvv')?.value||'').trim())return toast('Enter card expiry and CVV','error');
  }
  const btn=document.getElementById('checkoutPayBtn');if(btn){btn.disabled=true;btn.textContent='Processing payment…'}
  try{
    const billing_name=document.getElementById('billingName')?.value.trim()||state.user?.name||'';
    const billing_email=document.getElementById('billingEmail')?.value.trim()||state.user?.email||'';
    const billing_mobile=document.getElementById('billingMobile')?.value.trim()||'';
    const billing_country=document.getElementById('billingCountry')?.value||'India';
    const saved=await api('/api/student/checkout/'+id,{method:'POST',body:JSON.stringify({billing_name,billing_email,billing_mobile,billing_country,method})});
    const d=await api('/api/student/enroll/'+id,{method:'POST',body:JSON.stringify({method,checkout_id:saved.checkout_id})});
    if(!d.order_id){toast(d.message||'Already enrolled');state.checkoutCourse=null;openPage('mycourses');return}
    const c=await getCheckoutCourse();
    const el=document.getElementById('portalContent');
    el.innerHTML=`<section class="payment-success"><div class="payment-success-mark">✓</div><div class="eyebrow">Payment successful</div><h1>You’re enrolled!</h1><p>Your payment was verified and <b>${esc(c?.title||'the course')}</b> is now available in My Courses.</p><div class="payment-success-grid"><div><small>Order ID</small><b>${esc(d.order_id)}</b></div><div><small>Payment ID</small><b>${esc(d.payment_id)}</b></div><div><small>Method</small><b>${esc(method)}</b></div></div><div class="action-row"><button class="btn btn-ghost" onclick="openPage('payments')">View Payment</button><button class="btn btn-primary" onclick="state.selectedCourse=${Number(id)};state.checkoutCourse=null;openPage('courseplayer')">Start Learning →</button></div></section>`;
    state.enrolledCourseIds.add(Number(id));
    toast('Payment successful and enrollment activated');
  }catch(e){
    if(btn){btn.disabled=false;btn.innerHTML='Pay & Enroll'}
    toast(e.message,'error');
  }
}

async function advanceCourse(id,current){const next=Math.min(100,(Math.floor(Number(current||0)/10)+1)*10);try{const d=await api('/api/student/progress/'+id,{method:'POST',body:JSON.stringify({progress:next})});toast(next>=100?'Course complete — certificate eligibility checked':'Module complete — progress updated');openPage('courseplayer')}catch(e){toast(e.message,'error')}}
async function startAssessmentFlow(id){try{const d=await api('/api/student/assessment/'+id+'/questions');state.test={...d.assessment,questions:d.questions};state.testIndex=0;state.answers={};showTestInstructions()}catch(e){toast(e.message,'error')}}
function showTestInstructions(){const t=state.test;if(!t)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="test-instructions"><div><div class="eyebrow">Assessment Instructions</div><h2>${esc(t.title)}</h2><p class="muted">Read the instructions before beginning. Your answers are scored after submission.</p><div class="instruction-list"><div class="instruction-item"><b>01</b><span>${t.questions.length} questions in this assessment.</span></div><div class="instruction-item"><b>02</b><span>Recommended time: ${t.time_minutes} minutes.</span></div><div class="instruction-item"><b>03</b><span>Passing score: ${t.pass_percent}%.</span></div><div class="instruction-item"><b>04</b><span>Select one option for each question and submit when finished.</span></div><div class="instruction-item"><b>05</b><span>After submission, you will receive your score and answer analysis.</span></div></div><div class="action-row"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="openTestQuestion()">Start Test →</button></div></div><div class="card module-hero-card" style="--module-visual:url('assets/managed/custom/card-assessment.jpg')"><div class="eyebrow" style="color:#a9efd3">Vantras Assessment</div><h2>Focus. Apply. Improve.</h2><p>Use the assessment to identify both strengths and revision areas.</p><div class="stat-list"><div class="stat-row" style="border-color:#ffffff33"><b>Questions</b><span style="color:white">${t.questions.length}</span></div><div class="stat-row" style="border-color:#ffffff33"><b>Time</b><span style="color:white">${t.time_minutes} min</span></div><div class="stat-row" style="border-color:#ffffff33"><b>Pass</b><span style="color:white">${t.pass_percent}%</span></div></div></div></div>`,true)}
function openTestQuestion(){closeModal();renderTestQuestion()}
function renderTestQuestion(){const t=state.test,q=t?.questions[state.testIndex];if(!q)return;const opts=q.options||[];showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="test-shell"><div class="test-top"><div><div class="eyebrow">${esc(t.title)}</div><h3 style="margin:3px 0">Question ${state.testIndex+1} of ${t.questions.length}</h3></div><div class="pill blue">${t.time_minutes}:00 recommended</div></div><div class="question-box card"><span class="pill">${esc(q.difficulty||'Standard')}</span><h3>${esc(q.question)}</h3>${opts.map((o,i)=>`<div class="option ${String(state.answers[q.id])===String(i)?'selected':''}" onclick="selectAnswer(${q.id},${i})"><span class="option-key">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></div>`).join('')}</div><div class="test-nav"><button class="btn btn-ghost" ${state.testIndex===0?'disabled':''} onclick="testMove(-1)">← Previous</button><div class="question-palette">${t.questions.map((x,i)=>`<button class="qnum ${state.answers[x.id]!=null?'answered':''}" onclick="testGo(${i})">${i+1}</button>`).join('')}</div>${state.testIndex===t.questions.length-1?`<button class="btn btn-primary" onclick="submitAssessment()">Submit Test</button>`:`<button class="btn btn-primary" onclick="testMove(1)">Save & Next →</button>`}</div></div>`,true)}
function selectAnswer(qid,index){state.answers[qid]=index;renderTestQuestion()}
function testMove(delta){state.testIndex=Math.max(0,Math.min(state.test.questions.length-1,state.testIndex+delta));renderTestQuestion()}
function testGo(i){state.testIndex=i;renderTestQuestion()}
async function submitAssessment(){try{const d=await api('/api/student/assessment/'+state.test.id+'/submit',{method:'POST',body:JSON.stringify({answers:state.answers})});const passed=d.passed;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div style="text-align:center;padding:10px"><div class="certificate-seal" style="margin:0 auto 12px;width:64px;height:64px;font-size:30px">${passed?'✓':'!'}</div><div class="eyebrow">Assessment Result</div><h2>${passed?'Assessment Passed':'Keep Improving'}</h2><div style="font-size:52px;font-weight:900;color:${passed?'#0c9362':'#d87923'}">${d.score}%</div><p class="muted">${d.correct} correct out of ${d.total} questions</p><span class="status ${passed?'completed':'attention'}">${passed?'Passed':'Revision Recommended'}</span></div><div class="grid grid-2" style="margin-top:15px">${d.analysis.slice(0,6).map((a,i)=>`<div class="note ${a.correct?'':'danger-note'}"><b>Question ${i+1}: ${a.correct?'Correct':'Review'}</b><br>${esc(a.explanation||'Review the course material for this topic.')}</div>`).join('')}</div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal();openPage('results')">View Results</button><button class="btn btn-primary" onclick="closeModal();openPage('assessments')">Back to Assessments</button></div>`,true)}catch(e){toast(e.message,'error')}}
async function askAiPage(){const q=document.getElementById('aiPageQ')?.value.trim();if(!q)return toast('Enter a question','error');const el=document.getElementById('aiPageAnswer');el.textContent='Thinking…';try{const d=await api('/api/ai/tutor',{method:'POST',body:JSON.stringify({question:q})});el.textContent=d.answer}catch(e){el.textContent=e.message}}
function qr(seed='VANTRAS'){let h=0;for(const ch of seed)h=(h*31+ch.charCodeAt(0))>>>0;return `<div class="qr-box">${Array.from({length:49},(_,i)=>`<span class="${((h>>(i%24))&1) || i%6===0 || i<8?'':'off'}"></span>`).join('')}</div>`}
async function downloadCertificate(id){try{const d=await api('/api/student/certificates');const c=d.certificates.find(x=>Number(x.id)===Number(id));if(!c)return;downloadTextFile(`${c.certificate_no}.txt`,`VANTRAS EHS ACADEMY\nCERTIFICATE OF COMPLETION\n\nStudent: ${c.student}\nCourse: ${c.course}\nCertificate No: ${c.certificate_no}\nIssue Date: ${c.issue_date}\nStatus: ${c.status}\n\nVerify from the Vantras Certificate Verification page.`);toast('Certificate file downloaded')}catch(e){toast(e.message,'error')}}
async function shareCertificate(id){try{const d=await api('/api/student/certificates');const c=d.certificates.find(x=>Number(x.id)===Number(id));if(!c)return;const text=`Vantras EHS Academy certificate ${c.certificate_no} — ${c.course}`;if(navigator.share){await navigator.share({title:'Vantras Certificate',text})}else{await navigator.clipboard.writeText(text);toast('Certificate details copied')}}catch(e){toast('Certificate ready to share')}}
async function viewCertificate(id){const d=await api('/api/student/certificates');const c=d.certificates.find(x=>Number(x.id)===Number(id));if(!c)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="certificate-modal"><img src="assets/managed/logo.png" style="height:70px;margin:0 auto"><div class="eyebrow">Certificate of Completion</div><h1>Professional EHS Learning</h1><p>This is to certify that</p><div class="cert-name">${esc(c.student)}</div><p>has successfully completed</p><h2>${esc(c.course)}</h2><p class="muted">Certificate No. ${esc(c.certificate_no)} • Issue Date ${esc(c.issue_date)}</p>${qr(c.certificate_no)}<p class="small muted">Scan / verify using the Vantras public certificate verification page.</p></div>`,true)}
function richModulePage(title,desc,ico,items,stats=[['Active','12'],['This month','28'],['Completed','86%']],actions=''){const quick=['Review pending items','Open recent activity','Export current view'];return `${pageTitle(title,desc,actions)}<div class="metric-grid">${stats.map((s,i)=>metric(s[0],s[1],i===0?'Current workspace':i===1?'Recent activity':'Outcome',i===1?'blue':i===2?'green':'',ico)).join('')}</div><div class="module-shell"><div class="card recent-media-card"><div class="section-card-title"><h3>Recent Activity</h3><span class="pill green">Live workspace</span></div><div class="recent-media-list">${items.map((x,i)=>`<button class="recent-media-row" onclick="openActionPanel('${esc(x[0])}','${esc(x[1])}')"><img src="${workspaceThumb(i+1)}" alt=""><span class="recent-media-copy"><b>${x[0]}</b><small>${x[1]}</small></span><span class="recent-media-status">${x[2]||'Recent'} <strong>→</strong></span></button>`).join('')}</div></div><div><div class="card module-hero-card" ${moduleHeroStyle()}><div class="eyebrow" style="color:#a8edd2">${title}</div><h2>Stay organized and take action.</h2><p>${desc}</p><div class="module-actions"><button class="btn btn-primary" onclick="openActionPanel('New ${title} Action','Create or manage a new item in the ${title} workspace.')">${icon('plus')} New Action</button><button class="btn btn-glass" onclick="openActionPanel('${title} Report','Review and export the latest ${title.toLowerCase()} activity and outcomes.')">${icon('report')} View Report</button></div></div><div class="module-quick-grid">${quick.map((x,i)=>`<button class="module-quick-image" style="--quick-art:url('${workspaceThumb(i+2)}')" onclick="openActionPanel('${x}','Workspace action opened and ready to continue.')"><span class="module-quick-overlay"></span><span class="module-quick-icon">${icon(i===0?'shield':i===1?'results':'report')}</span><span><b>${x}</b><small>One-click workspace action</small></span><strong>↗</strong></button>`).join('')}</div></div></div>`}
async function supportPage(el){const d=await api('/api/support/tickets');el.innerHTML=pageTitle('Help & Support','Create support tickets and follow your open requests.')+`<div class="module-shell"><div class="card"><div class="eyebrow">New Support Request</div><h3>How can Vantras help?</h3><div class="field"><label>Subject</label><input id="supSubject" placeholder="Briefly describe your issue"></div><div class="grid grid-2"><div class="field"><label>Category</label><select id="supCat"><option>General</option><option>Course Access</option><option>Payment</option><option>Certificate</option><option>Technical</option></select></div><div class="field"><label>Priority</label><select id="supPriority"><option>Medium</option><option>Low</option><option>High</option></select></div></div><div class="field"><label>Message</label><textarea id="supMsg" rows="5" placeholder="Add useful details"></textarea></div><button class="btn btn-primary" onclick="createTicket()">Create Ticket</button></div><div><div class="card"><h3>My Tickets</h3>${d.tickets.length?d.tickets.map(t=>`<div class="activity"><span class="dot"></span><div><strong>${esc(t.ticket_no)} — ${esc(t.subject)}</strong><p>${esc(t.status)} • ${fmtDate(t.created_at)}</p></div></div>`).join(''):'<div class="empty">No tickets yet.</div>'}</div><div class="card" style="margin-top:11px"><h3>Need quick help?</h3><div class="note">For account access, course enrollment, payment or certificate questions, include the course or order reference in your ticket.</div></div></div></div>`}
async function createTicket(){try{const d=await api('/api/support/tickets',{method:'POST',body:JSON.stringify({subject:supSubject.value,category:supCat.value,priority:supPriority?.value||'Medium',message:supMsg.value})});toast('Ticket '+d.ticket_no+' created');openPage('support')}catch(e){toast(e.message,'error')}}
async function sendChat(){const q=document.getElementById('chatQ')?.value.trim();if(!q)return;const msgs=document.getElementById('chatMessages');msgs.insertAdjacentHTML('beforeend',`<div class="chat-msg user">${esc(q)}</div>`);chatQ.value='';try{const d=await api('/api/ai/tutor',{method:'POST',body:JSON.stringify({question:q})});msgs.insertAdjacentHTML('beforeend',`<div class="chat-msg bot">${esc(d.answer)}</div>`);msgs.scrollTop=msgs.scrollHeight}catch(e){msgs.insertAdjacentHTML('beforeend',`<div class="chat-msg bot">${esc(e.message)}</div>`)}}
async function trainerPage(p){const el=document.getElementById('portalContent');
if(p==='courses'){const d=await api('/api/courses');state.trainerCourses=d.courses;el.innerHTML=pageTitle('My Courses','Create, manage, publish and improve every EHS course from one workspace.',`<button class="btn btn-primary" onclick="openPage('create')">${icon('plus')} Create New Course</button>`)+`<div class="metric-grid">${metric('All Courses',d.courses.length,'Assigned courses','','courses')}${metric('Published',d.courses.filter(x=>x.status==='published').length,'Visible to learners','green','shield')}${metric('Draft',d.courses.filter(x=>x.status==='draft').length,'In development','blue','resource')}${metric('Archived',d.courses.filter(x=>x.status==='archived').length,'Inactive courses','orange','audit')}</div><div class="toolbar"><div class="search"><input id="tSearch" placeholder="Search your courses..." oninput="filterTrainerCourses()"></div><select id="tStatus" onchange="filterTrainerCourses()"><option value="">All Status</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select><select id="tLevel" onchange="filterTrainerCourses()"><option value="">All Levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><select><option>Sort: Last Updated</option><option>Title A–Z</option></select></div><div id="trainerCourseList" class="course-grid"></div>`;filterTrainerCourses();return}

if(p==='create'){el.innerHTML=pageTitle('Create Course','Build a professional EHS course through a clear five-step publishing workflow.',`<button class="btn btn-ghost" onclick="openPage('courses')">← My Courses</button>`)+`<div class="creator-shell"><div class="card creator-main"><div class="stepper">${['Basic Details','Curriculum','Media','Assessments','Publish'].map((x,i)=>`<div class="step ${i===0?'active':''}"><div class="step-circle">${i+1}</div>${x}</div>`).join('')}</div><div class="eyebrow">Step 1 of 5</div><h2>Course Basics</h2><p class="small muted">Give learners a clear, accurate understanding of the course.</p><div class="grid grid-2"><div class="field"><label>Course Title *</label><input id="ccTitle" placeholder="e.g. Industrial Safety Fundamentals"></div><div class="field"><label>Course Code *</label><input id="ccCode" placeholder="VEA-ISF-101"></div><div class="field"><label>Category</label><select id="ccCat"><option>Occupational Safety</option><option>Fire Safety</option><option>Risk Management</option><option>Environmental Management</option><option>Health & Hygiene</option><option>Compliance</option></select></div><div class="field"><label>Level</label><select id="ccLevel"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div class="field"><label>Duration</label><input id="ccDuration" value="6 hours"></div><div class="field"><label>Price (₹)</label><input id="ccPrice" type="number" value="1999"></div></div><div class="field"><label>Course Description</label><textarea id="ccDesc" rows="5" placeholder="Describe course objectives, target audience and learning outcomes..."></textarea></div><div class="media-drop"><div><div class="upload-ico">${icon('upload')}</div><b>Course thumbnail and intro media</b><p class="small muted">Add image or video later in the Media step.</p><button class="btn btn-ghost btn-sm" onclick="openMediaPicker()">Choose Media</button></div></div><div class="sticky-actions"><button class="btn btn-ghost" onclick="saveCourse('draft')">Save Draft</button><button class="btn btn-soft" onclick="toast('Saved. Curriculum step opened')">Save & Continue</button><button class="btn btn-primary" onclick="saveCourse('published')">Publish Course</button></div></div><div class="creator-side"><div class="card"><h3>Course Quality Checklist</h3>${['Clear course title & code','Defined target audience','Learning objectives','Structured curriculum','Relevant media','Assessment plan','Certificate rules'].map((x,i)=>`<div class="checklist-item"><span class="check-icon">${i<2?'✓':'·'}</span><span>${x}</span></div>`).join('')}</div><div class="card" style="margin-top:11px"><h3>Recent Update</h3><img src="assets/managed/courses/course-04.jpg" style="height:105px;width:100%;object-fit:cover;border-radius:8px"><p class="small muted">Use practical workplace visuals and concise learning outcomes to make the course more engaging.</p></div></div></div>`;return}

if(p==='learners'){const d=await api('/api/trainer/learners');const rows=d.learners;el.innerHTML=pageTitle('Learners','Manage, engage and support your learners’ growth and success.',`<button class="btn btn-ghost" onclick="downloadPortalReport('Trainer Learner Report')">${icon('report')} Export Learners</button>`)+`<div class="metric-grid five">${metric('Total Learners',Math.max(1248,rows.length),'Across all courses','','users','+6.2%')}${metric('Active',Math.max(986,rows.filter(x=>x.progress<100).length),'Currently learning','green','learn')}${metric('Certificates',756,'Issued credentials','blue','certificate')}${metric('Avg Score','84.6%','Assessment average','orange','assessment')}${metric('Completion','78%','Course completion','purple','results')}</div><div class="dash-two"><div class="card" style="padding:0"><div style="padding:14px">${sectionTitle('Learner Directory')}</div><div class="table-wrap" style="border:0;border-radius:0"><table class="table"><thead><tr><th>Learner</th><th>Course</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.name)}</strong><br><small>${esc(x.email)}</small></td><td>${esc(x.course)}</td><td style="min-width:150px">${progress(x.progress)}<small>${x.progress}%</small></td><td><span class="status ${x.progress>=100?'completed':'in_progress'}">${esc(x.status)}</span></td><td><button class="btn btn-ghost btn-sm" onclick="viewLearnerProfile('${esc(x.name)}','${esc(x.email)}','${esc(x.course)}',${x.progress},'${esc(x.status)}')">View</button></td></tr>`).join('')||`<tr><td colspan="5">No learner data yet.</td></tr>`}</tbody></table></div></div><div><div class="card"><h3>Top Performers</h3>${[['Aarav Sharma','94%','Risk Assessment'],['Meera Nair','92%','Fire Safety'],['Vivek Rao','90%','Occupational Safety']].map((x,i)=>`<div class="module-list-item"><span class="module-list-ico">${i+1}</span><div><b>${x[0]}</b><span>${x[2]}</span></div><div class="right"><b>${x[1]}</b></div></div>`).join('')}</div><div class="card" style="margin-top:11px"><h3>Learners Needing Attention</h3>${[['Rohan K.','24%','Inactive 8 days'],['Priya S.','36%','Assessment due'],['Aditya M.','42%','Low quiz score']].map(x=>`<div class="activity"><span class="dot" style="background:#e95d5d"></span><div><strong>${x[0]} — ${x[1]}</strong><p>${x[2]}</p></div></div>`).join('')}</div></div></div>`;return}

if(p==='sessions'){const d=await api('/api/trainer/live-sessions');const all=d.sessions||[];const upcoming=all.filter(x=>x.status==='upcoming');const live=all.filter(x=>x.status==='live');const done=all.filter(x=>x.status==='completed');const recordings=all.filter(x=>x.recording_status==='published');const att=done.length?Math.round(done.reduce((a,x)=>a+Number(x.attendance_percent||0),0)/done.length):0;el.innerHTML=pageTitle('Live Sessions','Schedule sessions, send reminders, open classrooms, track attendance and publish recordings.',`<button class="btn btn-primary" onclick="scheduleSessionModal()">${icon('plus')} Schedule Session</button>`)+`<div class="metric-grid">${metric('Upcoming',upcoming.length,'Scheduled classes','','live')}${metric('Live Now',live.length,'Active classroom','green','users')}${metric('Recordings',recordings.length,'Published replays','blue','courses')}${metric('Avg Attendance',att+'%','Completed sessions','orange','results')}</div><div class="live-session-board"><div class="card live-session-main"><div class="section-card-title"><h3>Upcoming & Live Sessions</h3><span class="pill green">Dynamic schedule</span></div>${[...live,...upcoming].length?[...live,...upcoming].map(x=>`<div class="live-session-row ${x.status}"><div class="live-date"><b>${new Date(x.session_date+'T00:00:00').getDate()}</b><span>${new Date(x.session_date+'T00:00:00').toLocaleDateString('en-IN',{month:'short'}).toUpperCase()}</span></div><div class="live-session-copy"><div class="live-title-line"><h4>${esc(x.title)}</h4><span class="session-status ${x.status}">${x.status==='live'?'● LIVE':'Upcoming'}</span></div><p>${esc(x.course_title)} • ${esc(x.batch_name)} • ${esc(x.session_time)} • ${esc(x.platform)}</p><div class="session-meta"><span>${icon('users')} ${x.learners} learners</span><span>${icon('bell')} ${x.reminder_count} reminders</span></div></div><div class="live-session-actions"><button class="btn btn-ghost btn-sm" onclick="trainerSessionAction(${x.id},'remind')">Remind</button>${x.status==='live'?`<button class="btn btn-primary btn-sm" onclick="openTrainerSession(${x.id})">Open Live Room</button><button class="btn btn-soft btn-sm" onclick="trainerSessionAction(${x.id},'complete')">Complete</button>`:`<button class="btn btn-primary btn-sm" onclick="openTrainerSession(${x.id})">Start Session</button>`}<button class="btn btn-ghost btn-sm" onclick="viewTrainerSession(${x.id})">View</button></div></div>`).join(''):`<div class="empty">No upcoming sessions. Schedule your next class.</div>`}</div><div class="card live-session-side attendance-card-v50"><div class="attendance-head-v50"><div><div class="eyebrow">Attendance Snapshot</div><h3>Class participation</h3></div><span class="pill green">Completed sessions</span></div><div class="attendance-main-v50"><div class="attendance-ring-v50" style="--attendance:${Math.max(0,Math.min(100,att||0))}"><div><b>${att||'—'}${att?'%':''}</b><span>Average</span></div></div><div class="attendance-copy-v50"><strong>${att>=90?'Strong attendance':att>=75?'Attendance needs monitoring':'Follow-up recommended'}</strong><p>Average attendance from completed sessions.</p><div class="attendance-mini-v50"><span><b>${done.length}</b> Completed</span><span><b>${recordings.length}</b> Recordings</span></div></div></div><div class="session-progress-legend attendance-legend-v50"><div class="${att>=90?'active':''}"><i class="status-green"></i><span><b>90%+</b> Strong attendance</span></div><div class="${att>=75&&att<90?'active':''}"><i class="status-blue"></i><span><b>75–89%</b> Monitor</span></div><div class="${att<75?'active':''}"><i class="status-amber"></i><span><b>Below 75%</b> Follow up</span></div></div><button class="btn btn-ghost attendance-action-v50" onclick="openActionPanel('Attendance Report','Attendance records from completed live sessions are available for trainer follow-up.')">${icon('results')} View Attendance Report</button></div></div><div class="card recording-workspace"><div class="section-card-title"><h3>Completed Sessions & Recordings</h3><span class="pill blue">Replay library</span></div><div class="course-grid">${done.length?done.map((x,i)=>`<div class="recommend-card recording-card"><img src="${courseImage(null,i+9)}" alt=""><div><span class="pill ${x.recording_status==='published'?'green':'blue'}">${x.recording_status==='published'?'Recording Published':'Recording Pending'}</span><h4>${esc(x.title)}</h4><span class="small muted">${esc(x.course_title)} • Attendance ${x.attendance_percent||0}%</span><div class="action-row"><button class="btn btn-ghost btn-sm" onclick="viewTrainerSession(${x.id})">View</button>${x.recording_status==='published'?`<button class="btn btn-primary btn-sm" onclick="viewSessionRecording(${x.id})">Watch Recording</button>`:`<button class="btn btn-soft btn-sm" onclick="trainerSessionAction(${x.id},'publish_recording')">Publish Recording</button>`}</div></div></div>`).join(''):`<div class="empty">Completed sessions will appear here.</div>`}</div></div>`;return}

if(p==='assessments'){el.innerHTML=pageTitle('Assessment Studio','Create, manage and improve knowledge checks across your courses.',`<button class="btn btn-primary" onclick="openActionPanel('Create Assessment','Assessment creator opened. Add title, questions, pass mark and timing before publishing.')">${icon('plus')} Create Assessment</button>`)+`<div class="metric-grid">${metric('Assessments','46','Across assigned courses','','assessment')}${metric('Active','31','Currently available','green','shield')}${metric('Attempts','2,846','Learner submissions','blue','exam')}${metric('Avg Score','84.6%','Across assessments','orange','results')}</div><div class="dash-two"><div class="card"><h3>Active & Recent Assessments</h3>${[['HIRA Practical Knowledge Check','Risk Assessment Essentials','128 attempts','86%'],['Fire Safety Final Assessment','Fire Safety Fundamentals','94 attempts','82%'],['LOTO Energy Isolation Test','Electrical & Process Safety','71 attempts','88%'],['Work at Height Scenario Test','Occupational Safety','63 attempts','79%']].map(x=>`<div class="module-list-item"><span class="module-list-ico">${icon('assessment')}</span><div><b>${x[0]}</b><span>${x[1]} • ${x[2]}</span></div><div class="right"><b>${x[3]}</b><span>Avg score</span></div><button class="btn btn-ghost btn-sm" onclick="openActionPanel('Assessment Management','Review attempts, learner performance, questions and publishing settings for this assessment.')">Manage</button></div>`).join('')}</div><div class="card"><h3>Question Bank</h3><div class="donut" style="background:conic-gradient(#2c81e6 0 26%,#0e9664 26% 70%,#f5a623 70%)"><div class="donut-label">486<span>Questions</span></div></div><div class="grid grid-3"><div class="note"><b>128</b><br>Easy</div><div class="note"><b>214</b><br>Medium</div><div class="note"><b>144</b><br>Hard</div></div><button class="btn btn-ghost" style="width:100%;margin-top:10px" onclick="openPage('questionbank')">Open Question Bank</button></div></div>`;return}

const trainerModules={questionbank:['Question Bank','Build reusable questions by course, module, topic and difficulty.','exam',[['HIRA scenario question','Risk Management • Medium','Edited today'],['Fire extinguisher selection','Fire Safety • Easy','Yesterday'],['LOTO zero-energy verification','Process Safety • Hard','2 days ago'],['Confined space gas test','Occupational Safety • Medium','3 days ago']],[['Questions','486'],['Easy / Medium','342'],['Hard','144']]],assignments:['Assignments','Review learner submissions, grades, comments and resubmissions.','upload',[['Permit-to-work case analysis','18 submissions • 4 pending','Today'],['Incident investigation report','26 submissions • 7 pending','Yesterday'],['HIRA workplace exercise','42 submissions • 3 pending','2 days ago']],[['Open','14'],['Graded','128'],['Resubmits','6']]],certificates:['Certificates','Review learner completion and certificate eligibility.','certificate',[['Risk Assessment Essentials','12 learners eligible','Today'],['Fire Safety Fundamentals','8 certificates issued','Yesterday'],['Work at Height Safety','5 learners pending final test','2 days ago']],[['Eligible','25'],['Issued','756'],['Pending','18']]],library:['Content Library','Organize course PDFs, videos, templates and images.','resource',[['HIRA Study Guide.pdf','PDF • 4.8 MB','Updated today'],['LOTO Demonstration.mp4','Video • 182 MB','Yesterday'],['Inspection Checklist.xlsx','Template • 86 KB','3 days ago'],['Fire Drill Planning.pptx','Presentation • 12 MB','1 week ago']],[['Files','248'],['Videos','64'],['Templates','92']]],feedback:['Feedback','Review learner ratings and improve course quality.','message',[['“Very practical HIRA examples.”','Risk Assessment Essentials • 5★','Today'],['“Add more site case studies.”','Work at Height • 4★','Yesterday'],['“Clear explanations and quiz feedback.”','Fire Safety • 5★','2 days ago']],[['Rating','4.8★'],['Responses','386'],['New','24']]],reports:['Reports','Track course reach, learner outcomes and assessment trends.','report',[['Course completion report','All assigned courses','Today'],['Assessment performance report','Last 30 days','Yesterday'],['Learner engagement report','Active cohorts','2 days ago']],[['Completion','78%'],['Avg Score','84.6%'],['Active','986']]],messages:['Messages','Communicate with learners, batches and support teams.','message',[['Batch HIRA-11','4 unread messages','10 min ago'],['Meera Nair','Question about assessment retry','1 hr ago'],['Admin Team','Course approval update','Yesterday']],[['Unread','7'],['Threads','42'],['Batches','9']]],calendar:['Calendar','Plan live sessions, assessments and course deadlines.','calendar',[['HIRA Live Clinic','10 Sep • 6:00 PM','Upcoming'],['Fire Safety Workshop','13 Sep • 11:30 AM','Upcoming'],['Course content review','16 Sep • 3:00 PM','Internal']],[['Events','12'],['This week','5'],['Deadlines','3']]],profile:['My Profile','Manage your trainer identity, expertise and teaching availability.','profile',[['Professional profile','EHS Trainer • 9 years experience','Current'],['Specializations','Risk, Fire, Occupational Safety','Current'],['Availability','Weekdays • 5 PM–8 PM','Current']],[['Courses','10'],['Learners','1,248'],['Rating','4.8★']]]};
if(p==='certificates'){el.innerHTML=trainerCertificatesPage();return}
if(p==='library'){el.innerHTML=trainerLibraryPage();return}
if(p==='reports'){el.innerHTML=trainerReportsPage();return}
if(p==='messages'){el.innerHTML=trainerMessagesPage();return}
if(p==='calendar'){el.innerHTML=trainerCalendarPage();return}
if(p==='profile'){el.innerHTML=trainerProfilePage();return}
if(trainerModules[p]){const x=trainerModules[p];el.innerHTML=richModulePage(x[0],x[1],x[2],x[3],x[4],p==='library'?`<button class="btn btn-primary" onclick="openContentUpload()">${icon('upload')} Upload Content</button>`:'');return}
if(p==='support')return supportPage(el)
}

function trainerCourseMenu(id){const c=(state.trainerCourses||[]).find(x=>Number(x.id)===Number(id));if(!c)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Course Actions</div><h2>${esc(c.title)}</h2><div class="course-action-menu"><button onclick="closeModal();openTrainerCourse(${c.id})">${icon('courses')} View course</button><button onclick="closeModal();openCourseEditor(${c.id})">${icon('settings')} Edit details</button><button onclick="closeModal();openPage('learners')">${icon('users')} View learners</button><button onclick="closeModal();openPage('assessments')">${icon('assessment')} Manage assessments</button>${c.status==='published'?`<button class="danger" onclick="closeModal();setCourseStatus(${c.id},'archived')">${icon('audit')} Archive course</button>`:`<button onclick="closeModal();setCourseStatus(${c.id},'published')">${icon('shield')} Publish course</button>`}</div>`)}
function openTrainerCourse(id){const c=(state.trainerCourses||[]).find(x=>Number(x.id)===Number(id));if(!c)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="course-preview-modal"><img src="${courseImage(c,Number(c.id)||0)}" alt=""><div><div class="eyebrow">${esc(c.code)} • ${esc(c.status)}</div><h2>${esc(c.title)}</h2><p class="muted">${esc(c.description||'Professional Vantras EHS course.')}</p><div class="grid grid-4"><div class="note"><b>${esc(c.level)}</b><br>Level</div><div class="note"><b>${esc(c.duration)}</b><br>Duration</div><div class="note"><b>${esc(c.category)}</b><br>Category</div><div class="note"><b>${money(c.price)}</b><br>Fee</div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal();openPage('learners')">Learners</button><button class="btn btn-primary" onclick="closeModal();openCourseEditor(${c.id})">Edit Course</button></div></div></div>`,true)}
function openCourseEditor(id){const c=(state.trainerCourses||[]).find(x=>Number(x.id)===Number(id));if(!c)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Edit Course</div><h2>${esc(c.title)}</h2><div class="field"><label>Course title</label><input id="editCourseTitle" value="${esc(c.title)}"></div><div class="field"><label>Description</label><textarea id="editCourseDesc" rows="4">${esc(c.description||'')}</textarea></div><div class="grid grid-3"><div class="field"><label>Level</label><select id="editCourseLevel">${['Beginner','Intermediate','Advanced'].map(x=>`<option ${x===c.level?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Duration</label><input id="editCourseDuration" value="${esc(c.duration)}"></div><div class="field"><label>Price</label><input id="editCoursePrice" type="number" value="${Number(c.price)||0}"></div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveCourseEdit(${c.id})">Save Changes</button></div>`)}
async function saveCourseEdit(id){try{await api('/api/trainer/course/'+id,{method:'PUT',body:JSON.stringify({title:editCourseTitle.value,description:editCourseDesc.value,level:editCourseLevel.value,duration:editCourseDuration.value,price:editCoursePrice.value})});closeModal();toast('Course updated');openPage('courses')}catch(e){toast(e.message,'error')}}
function filterTrainerCourses(){const s=(document.getElementById('tSearch')?.value||'').toLowerCase(),st=document.getElementById('tStatus')?.value||'',lvl=document.getElementById('tLevel')?.value||'';const rows=(state.trainerCourses||[]).filter(c=>(!s||(c.title+' '+c.code).toLowerCase().includes(s))&&(!st||c.status===st)&&(!lvl||c.level===lvl));const el=document.getElementById('trainerCourseList');if(!el)return;el.innerHTML=rows.length?rows.map((c,i)=>`<div class="card course-card trainer-course-card"><div class="course-cover"><img src="${courseImage(c,i)}"><span class="tag course-status-tag ${c.status}">${esc(c.status)}</span><button class="menu-dot" onclick="trainerCourseMenu(${c.id})">⋯</button></div><div class="course-body"><div class="kicker">${esc(c.code)}</div><h3>${esc(c.title)}</h3><div class="mini-meta"><span>${esc(c.category)}</span><span>•</span><span>${esc(c.level)}</span><span>•</span><span>${esc(c.duration)}</span></div><div class="course-status-purpose ${c.status}"><i></i><span>${c.status==='published'?'Visible to learners':c.status==='draft'?'In creation / review':'Hidden but retained'}</span></div><div class="action-row"><button class="btn btn-ghost btn-sm" onclick="openCourseEditor(${c.id})">Edit</button><button class="btn btn-soft btn-sm" onclick="openTrainerCourse(${c.id})">View</button>${c.status!=='published'?`<button class="btn btn-primary btn-sm" onclick="setCourseStatus(${c.id},'published')">Publish</button>`:''}${c.status==='published'?`<button class="btn btn-ghost btn-sm" onclick="setCourseStatus(${c.id},'archived')">Archive</button>`:c.status==='archived'?`<button class="btn btn-ghost btn-sm" onclick="setCourseStatus(${c.id},'draft')">Restore</button>`:''}</div></div></div>`).join(''):`<div class="empty">No courses match these filters.</div>`}
async function saveCourse(status){const body={title:ccTitle.value.trim(),code:ccCode.value.trim(),category:ccCat.value,level:ccLevel.value,duration:ccDuration.value,price:ccPrice.value,description:ccDesc.value,status};if(!body.title||!body.code)return toast('Course title and code are required','error');try{const d=await api('/api/trainer/courses',{method:'POST',body:JSON.stringify(body)});toast(status==='published'?'Course published successfully':d.message);openPage('courses')}catch(e){toast(e.message,'error')}}
async function setCourseStatus(id,status){try{await api('/api/trainer/course/'+id+'/status',{method:'POST',body:JSON.stringify({status})});toast('Course status updated');openPage('courses')}catch(e){toast(e.message,'error')}}
function scheduleSessionModal(){const today=new Date().toISOString().slice(0,10);showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Live Training</div><h2>Schedule Session</h2><p class="muted">Create the classroom, add the batch and notify learners from one form.</p><div class="field"><label>Session title</label><input id="ssTitle" placeholder="e.g. HIRA Case Study Clinic"></div><div class="grid grid-2"><div class="field"><label>Date</label><input id="ssDate" type="date" min="${today}" value="${today}"></div><div class="field"><label>Time</label><input id="ssTime" type="time" value="17:00"></div></div><div class="grid grid-2"><div class="field"><label>Course</label><input id="ssCourse" placeholder="Risk Assessment Essentials"></div><div class="field"><label>Batch</label><input id="ssBatch" placeholder="HIRA-11"></div></div><div class="grid grid-2"><div class="field"><label>Meeting Platform</label><select id="ssPlatform"><option>Google Meet</option><option>Zoom</option><option>Microsoft Teams</option></select></div><div class="field"><label>Expected learners</label><input id="ssLearners" type="number" min="0" value="30"></div></div><div class="field"><label>Meeting link (optional)</label><input id="ssLink" placeholder="Generated automatically when blank"></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveLiveSession()">Schedule & Notify</button></div>`)}
async function saveLiveSession(){try{const body={title:ssTitle.value.trim(),session_date:ssDate.value,session_time:ssTime.value,course_title:ssCourse.value.trim(),batch_name:ssBatch.value.trim(),platform:ssPlatform.value,learners:Number(ssLearners.value||0),meeting_link:ssLink.value.trim()};if(!body.title)return toast('Session title is required','error');await api('/api/trainer/live-sessions',{method:'POST',body:JSON.stringify(body)});closeModal();toast('Live session scheduled');openPage('sessions')}catch(e){toast(e.message,'error')}}
async function trainerSessionAction(id,action){try{const d=await api('/api/trainer/live-session/'+id+'/action',{method:'POST',body:JSON.stringify({action})});toast(d.message);openPage('sessions')}catch(e){toast(e.message,'error')}}
async function viewTrainerSession(id){try{const d=await api('/api/trainer/live-sessions');const x=d.sessions.find(s=>Number(s.id)===Number(id));if(!x)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">${esc(x.status)}</div><h2>${esc(x.title)}</h2><p class="muted">${esc(x.course_title)} • ${esc(x.batch_name)}</p><div class="grid grid-4"><div class="note"><b>${formatDue({due_date:x.session_date})}</b><br>Date</div><div class="note"><b>${esc(x.session_time)}</b><br>Time</div><div class="note"><b>${esc(x.platform)}</b><br>Platform</div><div class="note"><b>${x.learners}</b><br>Learners</div></div><div class="note"><b>Meeting room</b><br>${esc(x.meeting_link)}</div><div class="action-row right"><button class="btn btn-ghost" onclick="trainerSessionAction(${x.id},'remind')">Send Reminder</button>${x.status!=='completed'?`<button class="btn btn-primary" onclick="closeModal();openTrainerSession(${x.id})">${x.status==='live'?'Open Live Room':'Start Session'}</button>`:''}</div>`)}catch(e){toast(e.message,'error')}}
async function openTrainerSession(id){try{const d=await api('/api/trainer/live-sessions');const x=d.sessions.find(s=>Number(s.id)===Number(id));if(!x)return;if(x.status!=='live')await api('/api/trainer/live-session/'+id+'/action',{method:'POST',body:JSON.stringify({action:'start'})});showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="live-room-modal"><div class="live-room-icon">●</div><div class="eyebrow">Live Classroom</div><h2>${esc(x.title)}</h2><p>${esc(x.platform)} classroom is ready.</p><div class="note"><b>Meeting link</b><br>${esc(x.meeting_link)}</div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal();openPage('sessions')">Back to Sessions</button><button class="btn btn-primary" onclick="window.open('${esc(x.meeting_link)}','_blank')">Open Meeting Link ↗</button></div></div>`)}catch(e){toast(e.message,'error')}}
async function viewSessionRecording(id){try{const d=await api('/api/trainer/live-sessions');const x=d.sessions.find(s=>Number(s.id)===Number(id));if(!x)return;openActionPanel('Session Recording',`${x.title} recording is published in the trainer replay library. The recording opens inside the trainer replay workspace.`)}catch(e){toast(e.message,'error')}}
async function corporatePage(p){const el=document.getElementById('portalContent');
if(p==='programs'){const d=await api('/api/courses');state.courses=d.courses;el.innerHTML=pageTitle('Training Programs','Browse Vantras EHS programs available for workforce assignment.',`<button class="btn btn-primary" onclick="openPage('assignment')">${icon('plus')} Assign Training</button>`)+`<div class="toolbar"><div class="search"><input id="corpProgramSearch" placeholder="Search training programs..." oninput="filterCorporatePrograms()"></div><select id="corpProgramLevel" onchange="filterCorporatePrograms()"><option value="">All Levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div id="corpProgramGrid" class="course-grid"></div>`;filterCorporatePrograms();return}
if(p==='team'){const d=await api('/api/corporate/employees');state.employees=d.employees;el.innerHTML=pageTitle('My Team','Manage employees, departments and learning readiness.',`<button class="btn btn-ghost" onclick="openPage('bulk')">${icon('upload')} Bulk Upload</button><button class="btn btn-primary" onclick="addEmployeeModal()">${icon('plus')} Add Employee</button>`)+`<div class="metric-grid">${metric('Employees',d.employees.length,'Corporate directory','','users')}${metric('Departments',new Set(d.employees.map(x=>x.department)).size,'Team groups','blue','company')}${metric('Locations',new Set(d.employees.map(x=>x.location)).size,'Work locations','green','company')}${metric('Active Profiles',d.employees.length,'Ready for training','orange','shield')}</div><div class="table-wrap"><table class="table"><thead><tr><th>Employee ID</th><th>Employee</th><th>Department</th><th>Designation</th><th>Location</th><th>Action</th></tr></thead><tbody>${d.employees.map(x=>`<tr><td><strong>${esc(x.employee_code)}</strong></td><td><strong>${esc(x.name)}</strong><br><small>${esc(x.email)}</small></td><td>${esc(x.department)}</td><td>${esc(x.designation)}</td><td>${esc(x.location)}</td><td><button class="btn btn-ghost btn-sm" onclick="openActionPanel('Employee Profile','Employee training profile opened with assignment and progress controls.')">View</button></td></tr>`).join('')}</tbody></table></div>`;return}
if(p==='bulk'){el.innerHTML=pageTitle('Bulk Employee Upload','Import corporate learners quickly using CSV-formatted employee data.')+`<div class="module-shell"><div class="card"><div class="upload-drop"><div><div class="upload-ico">${icon('upload')}</div><h3>Paste or upload employee data</h3><p class="small muted">Employee ID, Name, Email, Department, Designation, Location</p></div></div><div class="field"><label>CSV rows</label><textarea id="bulkCsv" rows="10" placeholder="EMP001,Ravi Kumar,ravi@company.com,Safety,Safety Officer,Hyderabad"></textarea></div><button class="btn btn-primary" onclick="bulkEmployeeImport()">Import Employees</button><div id="bulkResult" class="note" style="margin-top:10px">No import run yet.</div></div><div><div class="card"><h3>Import Checklist</h3>${['Unique employee ID','Valid email address','Department name','Designation','Location / site'].map(x=>`<div class="checklist-item"><span class="check-icon">✓</span><span>${x}</span></div>`).join('')}</div><div class="card" style="margin-top:11px"><h3>After Import</h3><p class="small muted">Employees are added to your corporate directory. You can then assign courses individually or in bulk.</p><button class="btn btn-ghost" onclick="openPage('assignment')">Go to Course Assignment →</button></div></div></div>`;return}
if(p==='assignment'){const [e,c]=await Promise.all([api('/api/corporate/employees'),api('/api/courses')]);state.employees=e.employees;state.courses=c.courses;el.innerHTML=pageTitle('Course Assignment','Assign EHS learning to employees and teams.',`<button class="btn btn-primary" onclick="assignCourseModal()">${icon('plus')} Assign Course</button>`)+`<div class="dash-two"><div class="card"><div class="eyebrow">Quick Assignment</div><h3>Choose an employee and course</h3><div class="grid grid-2"><div class="field"><label>Employee</label><select id="quickEmp">${e.employees.map(x=>`<option value="${x.id}">${esc(x.employee_code)} — ${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label>Course</label><select id="quickCourse">${c.courses.map(x=>`<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select></div></div><button class="btn btn-primary" onclick="quickAssign()">Assign Selected Course</button></div><div class="card module-hero-card corp-learning-full-v51" style="--corp-learning-art:url('assets/managed/custom/corporate-hero-v18.jpg')"><div class="corp-learning-copy-v51"><div class="corp-learning-kicker-v51">${icon('company')}<span>Corporate Learning</span></div><h2>Right training. Right people.</h2><p>Use employee roles, departments and risk exposure to choose the most relevant EHS programs for every team.</p><div class="corp-learning-points-v51"><span>${icon('users')} Role aligned</span><span>${icon('shield')} Risk focused</span><span>${icon('results')} Progress tracked</span></div><div class="module-actions"><button class="btn btn-primary corp-learning-btn-v51" onclick="openPage('programs')">Browse Programs <b>→</b></button></div></div></div></div><div class="card" style="margin-top:11px"><h3>Recommended Corporate Programs</h3><div class="recommend-row">${c.courses.slice(0,4).map((x,i)=>`<div class="recommend-card"><img src="${courseImage(x,i)}"><div><h4>${esc(x.title)}</h4><span class="small muted">${esc(x.level)} • ${esc(x.duration)}</span><button class="public-link" onclick="openPage('assignment')">Select →</button></div></div>`).join('')}</div></div>`;return}
if(p==='enrollments'||p==='progress'){const d=await api('/api/corporate/enrollments');const rows=d.enrollments;el.innerHTML=pageTitle(p==='progress'?'Employee Progress':'Enrollments',p==='progress'?'Track course completion for every employee and assigned program.':'Manage employee-course assignments and training status.',`<button class="btn btn-primary" onclick="assignCourseModal()">${icon('plus')} Assign Course</button>`)+`<div class="metric-grid">${metric('Assignments',rows.length,'Total course assignments','','learn')}${metric('In Progress',rows.filter(x=>x.progress<100&&x.progress>0).length,'Active learning','blue','results')}${metric('Completed',rows.filter(x=>x.progress>=100).length,'Training complete','green','certificate')}${metric('Avg Progress',Math.round(rows.length?rows.reduce((a,x)=>a+Number(x.progress),0)/rows.length:0)+'%','Across assignments','orange','report')}</div><div class="table-wrap"><table class="table"><thead><tr><th>Employee</th><th>Department</th><th>Course</th><th>Progress</th><th>Status</th><th>Assigned</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.employee)}</strong><br><small>${esc(x.employee_code)}</small></td><td>${esc(x.department||'—')}</td><td>${esc(x.course)}</td><td style="min-width:170px">${progress(x.progress)}<small>${x.progress}%</small></td><td><span class="status ${x.progress>=100?'completed':'assigned'}">${esc(x.status)}</span></td><td>${fmtDate(x.assigned_at)}</td></tr>`).join('')||`<tr><td colspan="6">No course assignments yet.</td></tr>`}</tbody></table></div>`;return}
if(p==='reports'){const d=await api('/api/corporate/enrollments');const rows=d.enrollments;const avg=Math.round(rows.length?rows.reduce((a,x)=>a+Number(x.progress),0)/rows.length:0);el.innerHTML=pageTitle('Reports & Analytics','Review workforce learning coverage, completion and training outcomes.',`<button class="btn btn-ghost" onclick="downloadPortalReport('Corporate Training Report')">${icon('report')} Export Report</button>`)+`<div class="metric-grid">${metric('Training Coverage',Math.min(100,68+rows.length)+'%','Employees assigned','','users')}${metric('Completion Rate',Math.round(rows.length?rows.filter(x=>x.progress>=100).length*100/rows.length:0)+'%','Assignments completed','green','certificate')}${metric('Average Progress',avg+'%','Across learning','blue','results')}${metric('Compliance Due','6','Upcoming deadlines','orange','calendar')}</div><div class="dash-two"><div class="card"><h3>Completion Trend</h3>${lineChart([38,46,51,59,66,72,Math.max(75,avg)])}</div><div class="card"><h3>Training by Category</h3><div class="hbar-list">${[['Safety',88],['Risk',79],['Fire',72],['Environment',64],['Compliance',58]].map(x=>`<div class="hbar-row"><span>${x[0]}</span><div class="hbar-track"><span style="width:${x[1]}%"></span></div><b>${x[1]}%</b></div>`).join('')}</div></div></div><div class="card" style="margin-top:11px"><h3>Report Library</h3>${[['Employee Training Status','Current completion and overdue learning','CSV / PDF'],['Assessment Scores','Employee test and exam performance','Excel / PDF'],['Certificate Register','Issued certificates and validity','CSV / PDF'],['Training Matrix','Employee × course requirement matrix','Excel']].map(x=>`<div class="module-list-item"><span class="module-list-ico">${icon('report')}</span><div><b>${x[0]}</b><span>${x[1]}</span></div><div class="right"><span>${x[2]}</span></div><button class="btn btn-ghost btn-sm" onclick="downloadPortalReport('${x[0]}')">Export</button></div>`).join('')}</div>`;return}

const corpModules={assessments:['Assessments','Monitor employee assessment readiness and results.','assessment',[['HIRA Assessment','18 employees assigned • 14 completed','Due 12 Sep'],['Fire Safety Test','22 employees assigned • 19 completed','Due 16 Sep'],['LOTO Knowledge Check','9 employees assigned • 7 completed','Due 20 Sep']],[['Assigned','49'],['Completed','40'],['Avg Score','82%']]],certificates:['Certificates','Maintain workforce training evidence and certificate status.','certificate',[['Risk Assessment Essentials','14 employee certificates','Valid'],['Fire Safety Fundamentals','11 employee certificates','Valid'],['Work at Height Safety','8 employee certificates','Valid']],[['Valid','33'],['Expiring Soon','4'],['Courses','7']]],resources:['Resource Library','Share corporate EHS templates, checklists and reference material.','resource',[['Corporate HIRA Template','Risk Management • XLSX','Updated today'],['Daily Safety Checklist','Operations • PDF','Yesterday'],['Emergency Drill Record','Emergency Preparedness • DOCX','3 days ago']],[['Resources','48'],['Shared','31'],['Downloaded','226']]],requests:['Training Requests','Submit and track requests for custom or instructor-led programs.','message',[['Confined Space Refresher','Submitted for 28 employees','In Review'],['Supervisor Safety Leadership','Requested for October','Approved'],['Emergency Response Drill','On-site program request','Planning']],[['Open','3'],['Approved','5'],['Completed','12']]],notifications:['Notifications','View training reminders, completion alerts and corporate updates.','bell',[['Training deadline','6 employees have learning due this week.','Today'],['Certificate issued','4 new certificates became available.','Today'],['New program','Environmental Compliance Basics published.','Yesterday']],[['Unread','5'],['This week','12'],['Important','3']]],profile:['Profile','Manage corporate administrator and organization details.','profile',[['Organization',state.user.company||'Pioneer Industries Ltd','Current'],['Admin contact',state.user.name,'Current'],['Email',state.user.email,'Verified']],[['Employees','120'],['Programs','8'],['Sites','3']]],settings:['Settings','Configure corporate training preferences and notification rules.','settings',[['Enrollment notifications','Enabled for admins','Active'],['Certificate reminders','30 days before expiry','Active'],['Training reports','Monthly scheduled export','Active']],[['Alerts','On'],['Reports','Monthly'],['Access','RBAC']]]};
if(p==='assessments'){el.innerHTML=corporateAssessmentsPage();return}
if(p==='certificates'){el.innerHTML=corporateCertificatesPage();return}
if(p==='resources'){el.innerHTML=corporateResourcesPage();return}
if(p==='requests'){el.innerHTML=corporateRequestsPage();return}
if(p==='profile'){el.innerHTML=corporateProfilePage();return}
if(p==='settings'){el.innerHTML=corporateSettingsPage();return}
if(corpModules[p]){const x=corpModules[p];el.innerHTML=richModulePage(x[0],x[1],x[2],x[3],x[4]);return}
if(p==='support')return supportPage(el)
}

function filterCorporatePrograms(){const s=(document.getElementById('corpProgramSearch')?.value||'').toLowerCase(),lvl=document.getElementById('corpProgramLevel')?.value||'';const rows=state.courses.filter(c=>(!s||(c.title+' '+c.category).toLowerCase().includes(s))&&(!lvl||c.level===lvl));const el=document.getElementById('corpProgramGrid');if(el)el.innerHTML=rows.map((c,i)=>`<div class="card course-card"><div class="course-cover"><img src="${courseImage(c,i)}"><span class="tag">Corporate Ready</span></div><div class="course-body"><h3>${esc(c.title)}</h3><div class="mini-meta"><span>${esc(c.category)}</span><span>•</span><span>${esc(c.level)}</span></div><div class="action-row"><button class="btn btn-ghost btn-sm" onclick="courseDetail(${c.id})">Details</button><button class="btn btn-primary btn-sm" onclick="openPage('assignment')">Assign</button></div></div></div>`).join('')}
function addEmployeeModal(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Corporate Team</div><h2>Add Employee</h2><div class="grid grid-2">${[['employee_code','Employee ID'],['name','Full Name'],['email','Email'],['department','Department'],['designation','Designation'],['location','Location']].map(([id,l])=>`<div class="field"><label>${l}</label><input id="ae_${id}" placeholder="${l}"></div>`).join('')}</div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEmployee()">Add Employee</button></div>`)}
async function saveEmployee(){const b={employee_code:ae_employee_code.value,name:ae_name.value,email:ae_email.value,department:ae_department.value,designation:ae_designation.value,location:ae_location.value};try{await api('/api/corporate/employees',{method:'POST',body:JSON.stringify(b)});closeModal();toast('Employee added');openPage('team')}catch(e){toast(e.message,'error')}}
async function assignCourseModal(){const [e,c]=await Promise.all([api('/api/corporate/employees'),api('/api/courses')]);showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Course Assignment</div><h2>Assign Training</h2><div class="field"><label>Employee</label><select id="asEmp">${e.employees.map(x=>`<option value="${x.id}">${esc(x.employee_code)} — ${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label>Course</label><select id="asCourse">${c.courses.map(x=>`<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select></div><div class="note">The employee will see this program in their assigned corporate learning plan.</div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveAssignment()">Assign Course</button></div>`)}
async function saveAssignment(){try{await api('/api/corporate/assign',{method:'POST',body:JSON.stringify({employee_id:asEmp.value,course_id:asCourse.value})});closeModal();toast('Course assigned');openPage('enrollments')}catch(e){toast(e.message,'error')}}
async function quickAssign(){try{await api('/api/corporate/assign',{method:'POST',body:JSON.stringify({employee_id:quickEmp.value,course_id:quickCourse.value})});toast('Course assigned successfully');openPage('enrollments')}catch(e){toast(e.message,'error')}}
async function bulkEmployeeImport(){const rows=(document.getElementById('bulkCsv')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);let ok=0,fail=0;for(const row of rows){const p=row.split(',').map(x=>x.trim());if(p.length<6){fail++;continue}try{await api('/api/corporate/employees',{method:'POST',body:JSON.stringify({employee_code:p[0],name:p[1],email:p[2],department:p[3],designation:p[4],location:p[5]})});ok++}catch{fail++}}const el=document.getElementById('bulkResult');if(el)el.textContent=`Imported ${ok} employee(s). ${fail} row(s) skipped or duplicated.`;toast(`Imported ${ok} employee(s)`) }
async function adminPage(p){const el=document.getElementById('portalContent');
if(p==='users'){const d=await api('/api/admin/users');const roles=['student','trainer','corporate','admin'];el.innerHTML=pageTitle('User Management','Manage students, trainers, corporate administrators and platform administrators.',`<button class="btn btn-primary" onclick="openAdminAddUser()">${icon('plus')} Add User</button>`)+`<div class="metric-grid">${roles.map((r,i)=>metric(r==='corporate'?'Corporate Users':r.charAt(0).toUpperCase()+r.slice(1)+'s',d.users.filter(x=>x.role===r).length,'Registered accounts',i===1?'blue':i===2?'green':i===3?'orange':'','users')).join('')}</div><div class="toolbar"><div class="search"><input id="adminUserSearch" placeholder="Search name or email..." oninput="filterAdminUsers()"></div><select id="adminRole" onchange="filterAdminUsers()"><option value="">All Roles</option>${roles.map(x=>`<option value="${x}">${roleLabel(x)}</option>`).join('')}</select></div><div id="adminUserTable"></div>`;state.adminUsers=d.users;filterAdminUsers();return}
if(p==='courses'){const d=await api('/api/courses');state.courses=d.courses;el.innerHTML=pageTitle('Course Management','Review published learning, catalogue quality and course metadata.',`<button class="btn btn-primary" onclick="openAdminCourseCreator()">${icon('plus')} Add Course</button>`)+`<div class="metric-grid">${metric('Published',d.courses.length,'Visible courses','','courses')}${metric('Categories',new Set(d.courses.map(x=>x.category)).size,'Learning categories','blue','resource')}${metric('Beginner',d.courses.filter(x=>x.level==='Beginner').length,'Entry programs','green','learn')}${metric('Advanced',d.courses.filter(x=>x.level==='Advanced').length,'Advanced programs','orange','shield')}</div><div class="course-grid">${d.courses.map((c,i)=>`<div class="card course-card"><div class="course-cover"><img src="${courseImage(c,i)}"><span class="tag">Published</span></div><div class="course-body"><div class="kicker">${esc(c.code)}</div><h3>${esc(c.title)}</h3><div class="mini-meta"><span>${esc(c.category)}</span><span>•</span><span>${esc(c.level)}</span></div><div class="action-row"><button class="btn btn-ghost btn-sm" onclick="courseDetail(${c.id})">Review</button><button class="btn btn-soft btn-sm" onclick="openActionPanel('Course Editor','Admin course editing workspace opened for review and metadata updates.')">Edit</button></div></div></div>`).join('')}</div>`;return}
if(p==='payments'){const d=await api('/api/admin/payments');const rows=d.payments,total=rows.reduce((a,x)=>a+Number(x.amount||0),0);el.innerHTML=pageTitle('Payment Management','Monitor orders, verified payments and transaction records.',`<button class="btn btn-ghost" onclick="downloadPortalReport('Admin Finance Report')">${icon('report')} Export</button>`)+`<div class="metric-grid">${metric('Revenue',money(total),'Successful payments','','payment')}${metric('Orders',rows.length,'All transactions','blue','courses')}${metric('Successful',rows.filter(x=>x.status==='Successful').length,'Verified payments','green','shield')}${metric('Refunded',rows.filter(x=>String(x.status).includes('Refund')).length,'Refund records','orange','payment')}</div><div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Student</th><th>Course</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.order_id)}</strong><br><small>${esc(x.payment_id||'')}</small></td><td>${esc(x.student)}</td><td>${esc(x.course)}</td><td><b>${money(x.amount)}</b></td><td>${esc(x.method||'UPI')}</td><td><span class="status successful">${esc(x.status)}</span></td><td>${fmtDate(x.paid_at)}</td></tr>`).join('')}</tbody></table></div>`;return}
if(p==='certificates'){const d=await api('/api/admin/certificates');const rows=d.certificates;el.innerHTML=pageTitle('Certificate Management','Control issued credentials, status and public verification.',`<button class="btn btn-ghost" onclick="openPage('verification')">${icon('shield')} Verification</button>`)+`<div class="metric-grid">${metric('Issued',rows.length,'All certificates','','certificate')}${metric('Valid',rows.filter(x=>x.status==='Valid').length,'Verified credentials','green','shield')}${metric('Revoked',rows.filter(x=>x.status==='Revoked').length,'Revoked credentials','orange','audit')}${metric('Expired',rows.filter(x=>x.status==='Expired').length,'Expired credentials','blue','calendar')}</div>`+(rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Certificate</th><th>Student</th><th>Course</th><th>Status</th><th>Issue Date</th><th>Action</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.certificate_no)}</strong></td><td>${esc(x.student)}</td><td>${esc(x.course)}</td><td><span class="status ${x.status.toLowerCase()}">${esc(x.status)}</span></td><td>${esc(x.issue_date||'—')}</td><td><div class="table-actions"><button class="btn btn-danger btn-sm" onclick="certStatus(${x.id},'Revoked')">Revoke</button><button class="btn btn-ghost btn-sm" onclick="certStatus(${x.id},'Valid')">Restore</button></div></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">No certificates issued yet.</div>`);return}
if(p==='verification'){el.innerHTML=pageTitle('Certificate Verification','Test public certificate lookup and credential status.')+`<div class="module-shell"><div class="card"><div class="eyebrow">Verification Console</div><h3>Search by certificate number</h3><div class="verify-inline"><input id="adminCertSearch" placeholder="VEA-2026-..."><button class="btn btn-primary" onclick="verifyCertificate('adminCertSearch','adminCertResult')">Verify</button></div><div id="adminCertResult" style="margin-top:12px"></div></div><div class="card module-hero-card" ${moduleHeroStyle()}><div class="eyebrow" style="color:#a8edd2">Credential Trust</div><h2>Publicly verifiable certificates.</h2><p>Valid, revoked, expired and not-found states are surfaced through the public verification service.</p></div></div>`;return}
if(p==='reports'||p==='analytics'){const d=await api('/api/dashboard');const m=d.metrics;el.innerHTML=pageTitle(p==='reports'?'Reports':'Analytics',p==='reports'?'Export operational, learning and financial reports.':'Explore platform trends across learning, finance and engagement.',`<button class="btn btn-ghost" onclick="downloadPortalReport('${p==='reports'?'Admin Report':'Admin Analytics'}')">${icon('report')} Export</button>`)+`<div class="metric-grid">${metric('Registered Users',m.users,'All roles','','users')}${metric('Students',m.students,'Learners','blue','learn')}${metric('Revenue',money(m.revenue),'Successful payments','green','payment')}${metric('Certificates',m.certificates,'Valid credentials','orange','certificate')}</div><div class="dash-two"><div class="card"><h3>User & Learning Growth</h3>${lineChart([31,40,48,54,65,74,86])}</div><div class="card"><h3>Operational Mix — Training Purpose</h3><p class="muted small">Shows how the platform is being used: learner development, course delivery, assessment evidence and workforce compliance.</p><div class="donut"><div class="donut-label">${m.users}<span>Users</span></div></div><div class="mini-grid"><div class="note"><b>${m.students}</b><br>Students</div><div class="note"><b>${m.courses}</b><br>Courses</div></div></div></div><div class="card" style="margin-top:11px"><h3>Report Library</h3>${[['Student Report','Enrollment, progress, scores and certificates'],['Course Report','Enrollments, completion and average score'],['Trainer Report','Courses, classes and learner performance'],['Financial Report','Sales, discounts, taxes, refunds and net revenue'],['Corporate Report','Employee assignments, completion and certificates']].map(x=>`<div class="module-list-item"><span class="module-list-ico">${icon('report')}</span><div><b>${x[0]}</b><span>${x[1]}</span></div><button class="btn btn-ghost btn-sm" onclick="downloadPortalReport('${x[0]}')">Export</button></div>`).join('')}</div>`;return}

const adminModules={
categories:['Categories','Organize the course catalogue into clear EHS learning domains.','resource',[['Occupational Safety','6 published courses','Active'],['Risk Management','4 published courses','Active'],['Fire Safety','3 published courses','Active'],['Environmental Management','2 published courses','Active']],[['Categories','8'],['Published','18'],['With Courses','8']]],
approvals:['Course Approvals','Review trainer submissions before learner publication.','shield',[['Permit to Work Essentials','Trainer: R. Anand • Draft complete','Pending'],['Electrical Isolation Basics','Trainer: P. Kumar • Content review','Pending'],['Emergency Drill Planning','Trainer: S. Mehta • Assessment added','Ready']],[['Pending','3'],['Approved','21'],['Returned','2']]],
enrollments:['Enrollment Management','Review student enrollments and learning access across the academy.','learn',[['Risk Assessment Essentials','86 active enrollments','Today'],['Fire Safety Fundamentals','72 active enrollments','Today'],['Work at Height Safety','61 active enrollments','Yesterday']],[['Active','219'],['Completed','164'],['New','28']]],
assessments:['Assessment Management','Govern quizzes, assessments and result rules.','assessment',[['HIRA Knowledge Check','128 attempts • 86% average','Active'],['Fire Safety Final Assessment','94 attempts • 82% average','Active'],['LOTO Energy Isolation Test','71 attempts • 88% average','Active']],[['Assessments','46'],['Attempts','2,846'],['Avg Score','84.6%']]],
questionbank:['Question Bank','Manage centralized EHS questions, topics and difficulty levels.','exam',[['Risk Assessment','112 questions • mixed difficulty','Current'],['Fire Safety','86 questions • mixed difficulty','Current'],['Occupational Safety','148 questions • mixed difficulty','Current'],['Compliance','72 questions • mixed difficulty','Current']],[['Questions','486'],['Courses','18'],['Hard','144']]],
exams:['Exam Management','Schedule final examinations, attempts and pass rules.','exam',[['Final Exam — HIRA','Scheduled 15 Sep • 62 learners','Upcoming'],['Final Exam — Fire Safety','Scheduled 18 Sep • 48 learners','Upcoming'],['Final Exam — Work at Height','Scheduled 21 Sep • 39 learners','Upcoming']],[['Scheduled','6'],['Active','2'],['Completed','34']]],
refunds:['Refunds','Review and track approved, pending and completed refunds.','payment',[['Order VEA-24091','₹1,499 • Course access issue','Pending'],['Order VEA-23877','₹999 • Duplicate payment','Approved'],['Order VEA-23618','₹1,299 • Cancelled enrollment','Completed']],[['Pending','2'],['Approved','4'],['This Month','6']]],
coupons:['Coupons','Create and track course discounts, expiry and usage.','coupon',[['WELCOME10','10% off • First purchase','Active'],['SAFETY500','₹500 off selected programs','Active'],['CORP15','15% corporate campaign','Scheduled']],[['Active','5'],['Used','184'],['Expiring','2']]],
invoices:['Invoices','Manage GST-ready receipts and payment documentation.','resource',[['VEA-INV-2026-0098','₹1,999 • Student purchase','Generated'],['VEA-INV-2026-0097','₹1,499 • Student purchase','Generated'],['VEA-INV-2026-0096','₹22,500 • Corporate training','Generated']],[['Generated','98'],['This Month','21'],['Total','₹1.8L']]],
corporate:['Corporate Management','Manage corporate customers, training activity and account status.','company',[['Pioneer Industries Ltd','120 employees • 8 programs','Active'],['Apex Manufacturing','86 employees • 5 programs','Active'],['GreenBuild Projects','62 employees • 4 programs','Active']],[['Companies','12'],['Employees','1,428'],['Programs','26']]],
sessions:['Live Sessions','Oversee scheduled, live and recorded instructor-led training.','live',[['HIRA Workshop','10 Sep • 6:00 PM • 58 learners','Scheduled'],['Fire Safety Q&A','13 Sep • 11:30 AM • 42 learners','Scheduled'],['LOTO Demonstration','Recording uploaded','Published']],[['Upcoming','8'],['Live','1'],['Recordings','32']]],
resources:['Resources','Manage EHS templates, documents and downloadable learning material.','resource',[['HIRA Template.xlsx','Free • Risk Management','Published'],['Safety Inspection Checklist.pdf','Course-linked • Safety','Published'],['Incident Investigation Form.docx','Membership • Incidents','Published']],[['Resources','86'],['Free','38'],['Premium','24']]],
content:['CMS / Blog','Publish website articles, safety alerts and knowledge content.','message',[['Near Misses: Weak Signals','EHS Guidance • Published','Today'],['HIRA Register Best Practices','Risk • Published','Yesterday'],['Safety Leadership for Supervisors','Leadership • Draft','2 days ago']],[['Published','48'],['Draft','6'],['Authors','7']]],
notifications:['Notifications','Manage email, SMS and platform notification campaigns.','bell',[['Course reminder batch','846 recipients • Email','Sent'],['Live session reminder','58 recipients • Push','Scheduled'],['Certificate issued notice','26 recipients • Email','Sent']],[['Sent','2.4K'],['Scheduled','6'],['Templates','18']]],
support:['Support Tickets','Review and resolve learner, trainer and corporate support requests.','support',[['VEA-SUP-260909-1842','Course access • High priority','Open'],['VEA-SUP-260909-2731','Certificate query • Medium','Open'],['VEA-SUP-260908-8810','Payment confirmation • Medium','Resolved']],[['Open','8'],['High Priority','2'],['Resolved','146']]],
audit:['Audit Logs','Review critical administrative and security activities.','audit',[['Admin login','admin@vantras.demo','Today 09:42'],['Course status changed','VEA-FIRE-101 → Published','Today 09:18'],['Certificate status updated','VEA-2026-HIRA-000001','Yesterday'],['User registration','New learner account','Yesterday']],[['Events','1,846'],['Today','42'],['Critical','0']]],
security:['Security','Review authentication, access control and platform security posture.','shield',[['Authentication','Password hashing + server sessions','Healthy'],['Authorization','Role-based route checks','Healthy'],['Admin Controls','MFA required in production','Action'],['Rate Limiting','Production gateway policy','Planned']],[['Healthy','8'],['Actions','2'],['Critical','0']]],
roles:['Roles & Permissions','Configure role-based access boundaries and permissions.','users',[['Super Administrator','Full system access','Protected'],['Administrator','Operational administration','Active'],['Trainer','Assigned courses & learners','Active'],['Corporate Admin','Corporate employees & reports','Active'],['Student','Learning platform access','Active']],[['Roles','9'],['Permissions','48'],['Custom','3']]],
settings:['System Settings','Configure academy identity, integrations and platform defaults.','settings',[['Academy Profile','Brand, contact and certificate identity','Configured'],['Payment Gateway','Razorpay production integration','Demo Mode'],['Email / SMS','Notification providers','Demo Mode'],['Storage & Video','Object storage / secure streaming','Planned']],[['Configured','12'],['Integrations','7'],['Pending','4']]]};
if(adminModules[p]){const x=adminModules[p];el.innerHTML=richModulePage(x[0],x[1],x[2],x[3],x[4],p==='content'?`<button class="btn btn-primary" onclick="openArticleEditor()">${icon('plus')} New Article</button>`:'');return}
}

function filterAdminUsers(){const s=(document.getElementById('adminUserSearch')?.value||'').toLowerCase(),r=document.getElementById('adminRole')?.value||'';const rows=(state.adminUsers||[]).filter(x=>(!s||(x.name+' '+x.email).toLowerCase().includes(s))&&(!r||x.role===r));const el=document.getElementById('adminUserTable');if(!el)return;el.innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Company</th><th>Created</th><th>Action</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.email)}</td><td><span class="pill">${roleLabel(x.role)}</span></td><td>${esc(x.company||'—')}</td><td>${fmtDate(x.created_at)}</td><td><button class="btn btn-ghost btn-sm" onclick="openActionPanel('User Management','User account details opened with role and access controls.')">Manage</button></td></tr>`).join('')}</tbody></table></div>`}
async function certStatus(id,status){try{await api('/api/admin/certificate/'+id+'/status',{method:'PUT',body:JSON.stringify({status})});toast('Certificate '+status.toLowerCase());openPage('certificates')}catch(e){toast(e.message,'error')}}

async function boot(){try{const d=await api('/api/me');state.user=d.user;state.portalPage=state.user.role==='student'?'browse':'dashboard';renderPortal()}catch{renderPublic()}}


/* ====================== VANTRAS V7 AI CHAT WORKSPACE ====================== */
const AI_STORE_KEY='vantras_ai_threads_v1';
let aiThreads=[];
let aiActiveId=null;
function loadAiThreads(){try{aiThreads=JSON.parse(localStorage.getItem(AI_STORE_KEY)||'[]');if(!Array.isArray(aiThreads))aiThreads=[]}catch{aiThreads=[]}}
function saveAiThreads(){try{localStorage.setItem(AI_STORE_KEY,JSON.stringify(aiThreads.slice(0,30)))}catch{}}
function aiNow(){return new Date().toISOString()}
function createAiThread(){const id='ai-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);const t={id,title:'New conversation',pinned:false,createdAt:aiNow(),updatedAt:aiNow(),messages:[{role:'assistant',content:`Hi ${state.user?.name?.split(' ')[0]||'there'}! I’m the Vantras AI EHS Assistant. Ask me anything — EHS, coding, math, writing, study topics, general knowledge or everyday questions.`,meta:{used_provider:'Vantras AI'}}]};aiThreads.unshift(t);aiActiveId=id;saveAiThreads();return t}
function activeAiThread(){return aiThreads.find(t=>t.id===aiActiveId)||aiThreads[0]||createAiThread()}
function initAiWorkspace(){loadAiThreads();if(!aiThreads.length)createAiThread();if(!aiActiveId||!aiThreads.some(t=>t.id===aiActiveId))aiActiveId=aiThreads[0].id;renderAiThreads();renderAiConversation();const q=document.getElementById('aiPageQ');if(q){q.addEventListener('input',()=>{q.style.height='auto';q.style.height=Math.min(150,q.scrollHeight)+'px'})}}
function renderAiThreads(){const list=document.getElementById('aiThreadList');if(!list)return;const q=(document.getElementById('aiHistorySearch')?.value||'').toLowerCase();const rows=[...aiThreads].filter(t=>!q||(t.title||'').toLowerCase().includes(q)).sort((a,b)=>(b.pinned-a.pinned)||String(b.updatedAt).localeCompare(String(a.updatedAt)));list.innerHTML=rows.length?rows.map(t=>`<button class="ai-thread ${t.id===aiActiveId?'active':''}" onclick="selectAiThread('${t.id}')"><span class="ai-thread-icon">${t.archived?'▣':t.pinned?'★':'◌'}</span><span><b>${esc(t.title||'Conversation')}</b><small>${t.archived?'Archived • ':''}${relativeAiTime(t.updatedAt)}</small></span><span class="ai-thread-more" onclick="event.stopPropagation();aiThreadMenu('${t.id}')">⋯</span></button>`).join(''):`<div class="ai-history-empty">No matching chats</div>`}
function relativeAiTime(v){const d=(Date.now()-new Date(v).getTime())/1000;if(d<60)return'Just now';if(d<3600)return Math.floor(d/60)+' min';if(d<86400)return Math.floor(d/3600)+' hr';return new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
function selectAiThread(id){aiActiveId=id;renderAiThreads();renderAiConversation()}
function newAiChat(){createAiThread();renderAiThreads();renderAiConversation();document.getElementById('aiPageQ')?.focus()}
function clearAiHistory(){if(!confirm('Clear all AI conversation history on this browser?'))return;aiThreads=[];createAiThread();renderAiThreads();renderAiConversation()}
function aiThreadMenu(id){const t=aiThreads.find(x=>x.id===id);if(!t)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Conversation Actions</div><h2>${esc(t.title)}</h2><div class="ai-thread-menu-grid ai-thread-menu-v8"><button onclick="closeModal();selectAiThread('${id}')">◉ View</button><button onclick="renameAiThread('${id}')">✎ Edit Name</button><button onclick="togglePinAiThread('${id}')">${t.pinned?'☆ Unpin':'★ Pin'}</button><button onclick="archiveAiThread('${id}')">${t.archived?'↩ Restore':'▣ Archive'}</button><button onclick="shareAiThread('${id}')">↗ Share / Copy</button><button class="danger" onclick="deleteAiThread('${id}')">⌫ Delete</button></div>`)}
function renameAiThread(id){const t=aiThreads.find(x=>x.id===id);if(!t)return;const v=prompt('Rename conversation',t.title);if(v?.trim()){t.title=v.trim().slice(0,60);t.updatedAt=aiNow();saveAiThreads();closeModal();renderAiThreads()}}
function togglePinAiThread(id){const t=aiThreads.find(x=>x.id===id);if(!t)return;t.pinned=!t.pinned;t.updatedAt=aiNow();saveAiThreads();closeModal();renderAiThreads()}
function archiveAiThread(id){const t=aiThreads.find(x=>x.id===id);if(!t)return;t.archived=!t.archived;t.updatedAt=aiNow();saveAiThreads();closeModal();renderAiThreads();toast(t.archived?'Conversation archived':'Conversation restored')}
async function shareAiThread(id){const t=aiThreads.find(x=>x.id===id);if(!t)return;const text=t.messages.map(m=>(m.role==='user'?'You: ':'Vantras AI: ')+m.content).join('\n\n');try{await navigator.clipboard.writeText(text);toast('Conversation copied')}catch{toast('Copy unavailable','error')}closeModal()}
function deleteAiThread(id){aiThreads=aiThreads.filter(x=>x.id!==id);if(!aiThreads.length)createAiThread();aiActiveId=aiThreads[0].id;saveAiThreads();closeModal();renderAiThreads();renderAiConversation()}
function renderAiConversation(){const box=document.getElementById('aiPageMessages');if(!box)return;const t=activeAiThread();box.innerHTML=t.messages.map((m,i)=>aiMessageHtml(m,i)).join('');box.scrollTop=box.scrollHeight}
function aiMessageHtml(m,i){const isUser=m.role==='user';return `<div class="ai-message-row ${isUser?'user':'assistant'}"><span class="ai-bubble-avatar">${isUser?initials(state.user?.name||'U'):'🤖'}</span><div class="ai-message-wrap"><div class="ai-bubble">${esc(m.content).replace(/\n/g,'<br>')}</div></div></div>`}
function askAiSuggestion(q){const el=document.getElementById('aiPageQ');if(!el)return;el.value=q;sendAiWorkspace()}

function aiDisplayAnswer(d){return String(d?.answer||'').trim()}
async function sendAiWorkspace(){const input=document.getElementById('aiPageQ');const q=input?.value.trim();if(!q)return;const t=activeAiThread();const prior=t.messages.filter(x=>x.role==='user'||x.role==='assistant').slice(-10).map(x=>({role:x.role,content:x.content}));t.messages.push({role:'user',content:q});if(t.title==='New conversation')t.title=q.length>42?q.slice(0,42)+'…':q;t.updatedAt=aiNow();saveAiThreads();input.value='';input.style.height='auto';renderAiThreads();renderAiConversation();const box=document.getElementById('aiPageMessages');box.insertAdjacentHTML('beforeend',`<div id="aiThinking" class="ai-message-row assistant"><span class="ai-bubble-avatar analyzing-robo">🤖</span><div class="ai-message-wrap"><div class="ai-bubble ai-thinking"><i></i><i></i><i></i><span>Analyzing your question…</span></div><div class="ai-analysis-steps"><span class="active">Understand</span><span>Analyze</span><span>Explain</span></div></div></div>`);box.scrollTop=box.scrollHeight;try{const d=await api('/api/ai/tutor',{method:'POST',body:JSON.stringify({question:q,history:prior})});document.getElementById('aiThinking')?.remove();t.messages.push({role:'assistant',content:aiDisplayAnswer(d),meta:{latency_ms:d.latency_ms}});t.updatedAt=aiNow();saveAiThreads();renderAiConversation();renderAiThreads()}catch(e){document.getElementById('aiThinking')?.remove();t.messages.push({role:'assistant',content:'I could not reach the AI service: '+e.message,meta:{}});saveAiThreads();renderAiConversation()}}
async function askAiPage(){return sendAiWorkspace()}

/* Floating assistant: same provider pipeline, compact ChatGPT-style UI. */
function toggleChat(){let box=document.getElementById('chatbox');if(box){box.remove();return}document.body.insertAdjacentHTML('beforeend',`<div class="chatbox chatbox-v8" id="chatbox"><div class="chat-head chat-head-v7"><div><span class="chat-robot">🤖</span><span><b>Vantras AI EHS Assistant</b><small>Ask • Analyze • Answer</small></span></div><button class="iconbtn" onclick="toggleChat()">✕</button></div><div class="chat-messages" id="chatMessages"><div class="chat-msg bot">Hi ${esc(state.user?.name?.split(' ')[0]||'there')}! Ask me any question and I’ll analyze it step by step.</div></div><div class="chat-compose chat-compose-v7"><button onclick="startFloatingVoice()">🎙</button><input id="chatQ" placeholder="Ask Vantras AI..." onkeydown="if(event.key==='Enter')sendChat()"><button class="btn btn-primary btn-sm" onclick="sendChat()">Send</button></div></div>`)}
function quickFloatingAi(q){const el=document.getElementById('chatQ');if(el){el.value=q;sendChat()}}
function startFloatingVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast('Voice recognition unavailable','error');const r=new SR();r.lang='en-IN';r.onresult=e=>{chatQ.value=e.results[0][0].transcript};r.start()}
async function sendChat(){const input=document.getElementById('chatQ');const q=input?.value.trim();if(!q)return;const msgs=document.getElementById('chatMessages');msgs.insertAdjacentHTML('beforeend',`<div class="chat-msg user">${esc(q)}</div><div class="chat-msg bot thinking" id="floatThinking"><span class="analyzing-robo">🤖</span> Preparing a detailed answer…</div>`);input.value='';msgs.scrollTop=msgs.scrollHeight;try{const d=await api('/api/ai/tutor',{method:'POST',body:JSON.stringify({question:q})});document.getElementById('floatThinking')?.remove();msgs.insertAdjacentHTML('beforeend',`<div class="chat-msg bot">${esc(aiDisplayAnswer(d)).replace(/\n/g,'<br>')}</div>`)}catch(e){document.getElementById('floatThinking')?.remove();msgs.insertAdjacentHTML('beforeend',`<div class="chat-msg bot">The assistant is temporarily unavailable. Please try the question again.</div>`)}msgs.scrollTop=msgs.scrollHeight}

/* ====================== VANTRAS V9 FUNCTIONAL WORKSPACES ====================== */
let lessonSaveTimer=null;
function selectStudentModule(courseId,moduleNo,isAssessment,title){state.selectedCourse=courseId;state.activeModule=moduleNo;if(isAssessment){openAssessmentForCourse(courseId);return}openPage('courseplayer')}
async function trackLessonVideo(courseId,moduleNo,video){if(!video.duration)return;const pct=Math.min(99,Math.floor(video.currentTime/video.duration*100));clearTimeout(lessonSaveTimer);lessonSaveTimer=setTimeout(()=>api('/api/student/lesson-progress',{method:'POST',body:JSON.stringify({course_id:courseId,module_no:moduleNo,video_percent:pct,video_completed:false,module_completed:false})}).catch(()=>{}),450)}
async function completeLessonVideo(courseId,moduleNo){try{await api('/api/student/lesson-progress',{method:'POST',body:JSON.stringify({course_id:courseId,module_no:moduleNo,video_percent:100,video_completed:true,module_completed:false})});const b=document.getElementById('moduleCompleteBtn');if(b)b.disabled=false;toast('Training video completed. You can now mark the module complete.')}catch(e){toast(e.message,'error')}}
async function completeStudentModule(courseId,moduleNo){try{await api('/api/student/lesson-progress',{method:'POST',body:JSON.stringify({course_id:courseId,module_no:moduleNo,video_percent:100,video_completed:true,module_completed:true})});toast('Module completed and progress saved');openPage('courseplayer')}catch(e){toast(e.message,'error')}}
async function openAssessmentForCourse(courseId){try{const d=await api('/api/student/assessments');const a=(d.assessments||[]).find(x=>Number(x.course_id)===Number(courseId))||(d.assessments||[])[0];if(!a)return toast('No assessment available for this course','error');startAssessmentFlow(a.id)}catch(e){toast(e.message,'error')}}
function openLessonNotes(title,moduleNo){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="lesson-notes-modal"><div class="eyebrow">Lesson Notes • Module ${moduleNo}</div><h2>${esc(title)}</h2><div class="notes-callout">Use these notes with the training video. Site procedures and local legal requirements always take priority.</div><div class="notes-grid"><div><h4>Key ideas</h4><ul><li>Identify the hazard before work starts.</li><li>Select controls using the hierarchy of controls.</li><li>Confirm roles, responsibilities and communication.</li><li>Stop and reassess when conditions change.</li></ul></div><div><h4>Remember</h4><ul><li>Document critical checks.</li><li>Use approved permits where required.</li><li>Verify controls are actually effective.</li><li>Escalate unresolved risk.</li></ul></div></div><div class="note-writing"><label>Your private lesson note</label><textarea id="lessonPersonalNote" rows="5" placeholder="Write your learning notes here..."></textarea></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="localStorage.setItem('lesson-note-${moduleNo}',lessonPersonalNote.value);toast('Lesson note saved');closeModal()">Save Note</button></div></div>`,true);setTimeout(()=>{const x=document.getElementById('lessonPersonalNote');if(x)x.value=localStorage.getItem('lesson-note-'+moduleNo)||''},0)}
function openLessonResource(title,type,i){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="resource-preview-v9"><div class="resource-preview-icon">${i===0?'PDF':i===1?'✓':'i'}</div><div><div class="eyebrow">${esc(type)} Resource</div><h2>${esc(title)}</h2><p class="muted">Course-linked reference material for the current lesson.</p></div></div><div class="resource-paper"><h3>${esc(title)}</h3><p>Use this resource while completing the lesson and practical workplace activity.</p><div class="checklist-demo">${['Confirm the work scope','Identify hazards and affected people','Select and verify controls','Record findings and follow-up actions'].map(x=>`<label><input type="checkbox"> ${x}</label>`).join('')}</div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="toast('Resource saved to your library');closeModal()">Save to Library</button></div>`,true)}
async function openLiveClassroom(title='Live EHS Session',sessionId=0){try{if(sessionId)await api('/api/student/live-join',{method:'POST',body:JSON.stringify({session_id:sessionId,mic:true,camera:true})})}catch{}showModal(`<button class="modal-close" onclick="stopLivePreview();closeModal()">✕</button><div class="live-room-v9"><div class="live-room-head"><div><div class="eyebrow">LIVE CLASSROOM</div><h2>${esc(title)}</h2><p>Camera and microphone controls are available below.</p></div><span class="live-pill">● LIVE</span></div><div class="live-video-grid"><div class="self-video"><video id="livePreview" autoplay muted playsinline></video><div class="video-label">You</div></div><div class="trainer-stage"><div class="trainer-placeholder">👨‍🏫</div><h3>Vantras Trainer</h3><p>Instructor stage</p></div></div><div class="live-controls"><button id="micCtl" onclick="toggleLiveTrack('audio',this)">🎙 Mic On</button><button id="camCtl" onclick="toggleLiveTrack('video',this)">📹 Camera On</button><button onclick="toast('Hand raised')">✋ Raise Hand</button><button onclick="toast('Chat opened')">💬 Chat</button><button class="danger" onclick="stopLivePreview();closeModal()">Leave</button></div></div>`,true);startLivePreview()}
let liveStream=null;async function startLivePreview(){try{liveStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});const v=document.getElementById('livePreview');if(v)v.srcObject=liveStream}catch(e){const v=document.getElementById('livePreview');if(v)v.outerHTML='<div class="camera-permission">Camera/microphone permission is required to preview your classroom setup.</div>'}}
function toggleLiveTrack(kind,btn){if(!liveStream)return toast('Camera/microphone permission not available','error');const tracks=kind==='audio'?liveStream.getAudioTracks():liveStream.getVideoTracks();tracks.forEach(t=>t.enabled=!t.enabled);const on=tracks[0]?.enabled;btn.textContent=(kind==='audio'?(on?'🎙 Mic On':'🔇 Mic Off'):(on?'📹 Camera On':'🚫 Camera Off'))}
function stopLivePreview(){if(liveStream){liveStream.getTracks().forEach(t=>t.stop());liveStream=null}}

function certPreviewCard(name,course,no,status='Valid',date='09 Sep 2026'){return `<div class="cert-sheet-mini"><div class="cert-brand"><img src="assets/managed/logo.png"><span>Certificate of Completion</span></div><div class="cert-copy"><small>This certifies that</small><h3>${esc(name)}</h3><small>successfully completed</small><h4>${esc(course)}</h4><div class="cert-meta"><span>${esc(no)}</span><span>${esc(date)}</span></div></div><div class="cert-seal-v9">✓</div><span class="status ${status.toLowerCase()}">${esc(status)}</span></div>`}
function openTrainerCertificate(name,course,no='VEA-2026-HIRA-000128'){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="certificate-detail-v9">${certPreviewCard(name,course,no)}<div class="cert-detail-grid"><div><b>Learner</b><span>${esc(name)}</span></div><div><b>Course</b><span>${esc(course)}</span></div><div><b>Trainer</b><span>${esc(state.user?.name||'Vantras Trainer')}</span></div><div><b>Status</b><span>Valid</span></div></div><div class="action-row right"><button class="btn btn-ghost" onclick="toast('Certificate copied for sharing')">Share</button><button class="btn btn-primary" onclick="downloadTextFile('${no}.txt','Vantras EHS Academy Certificate\\n${name}\\n${course}\\n${no}')">Download</button></div></div>`,true)}
function trainerCertificatesPage(){const rows=[['Aarav Sharma','Hazard Identification & Risk Assessment','VEA-2026-HIRA-000128','Today'],['Meera Nair','Fire Safety & Emergency Response','VEA-2026-FIRE-000127','Yesterday'],['Rohan Patel','Work at Height Safety','VEA-2026-WAH-000126','2 days ago']];return pageTitle('Certificates','Review eligible learners, issued credentials and certificate details.',`<button class="btn btn-primary" onclick="openActionPanel('Certificate Rules','Eligibility requires required modules, assessments and completion rules.')">Certificate Rules</button>`)+`<div class="metric-grid">${metric('Eligible','25','Ready for credential','','certificate')}${metric('Issued','756','All trainer courses','green','shield')}${metric('Pending','18','Needs final requirement','orange','assessment')}${metric('Revoked','2','Admin controlled','blue','audit')}</div><div class="certificate-workbench"><div class="card"><div class="section-card-title"><h3>Recently Issued</h3><span class="pill green">Verified</span></div>${rows.map((x,i)=>`<button class="certificate-person-row" onclick="openTrainerCertificate('${x[0]}','${x[1]}','${x[2]}')"><span class="person-avatar">${x[0].split(' ').map(y=>y[0]).join('')}</span><span><b>${x[0]}</b><small>${x[1]} • ${x[2]}</small></span><span>${x[3]} →</span></button>`).join('')}</div><div>${certPreviewCard('Aarav Sharma','Hazard Identification & Risk Assessment','VEA-2026-HIRA-000128')}<button class="btn btn-primary full-btn" onclick="openTrainerCertificate('Aarav Sharma','Hazard Identification & Risk Assessment','VEA-2026-HIRA-000128')">Open Certificate Details</button></div></div>`}
function trainerLibraryPage(){const files=[['HIRA Study Guide','PDF','4.8 MB','Risk Assessment'],['LOTO Demonstration','VIDEO','182 MB','Occupational Safety'],['Inspection Checklist','XLSX','86 KB','Inspection'],['Fire Drill Planning','PPTX','12 MB','Fire Safety']];return pageTitle('Content Library','Organize reusable trainer content by format, course and access.',`<button class="btn btn-primary" onclick="openContentUpload()">${icon('upload')} Upload Content</button>`)+`<div class="metric-grid">${metric('Files','248','All resources','','resource')}${metric('Videos','64','Training media','blue','live')}${metric('Templates','92','Reusable tools','green','courses')}${metric('Storage','68%','Demo capacity','orange','report')}</div><div class="library-layout-v9"><div class="card library-filters"><h3>Library Filters</h3>${['All Content','Videos','PDF & Documents','Templates','Presentations'].map((x,i)=>`<button class="${i===0?'active':''}" onclick="toast('${x} filter applied')">${x}<span>→</span></button>`).join('')}</div><div class="library-grid-v9">${files.map((x,i)=>`<div class="card library-file-card"><div class="file-preview ${x[1].toLowerCase()}"><span>${x[1]}</span></div><h3>${x[0]}</h3><p>${x[3]} • ${x[2]}</p><div class="action-row"><button class="btn btn-ghost btn-sm" onclick="openLessonResource('${x[0]}','${x[1]}',${i%3})">Preview</button><button class="btn btn-primary btn-sm" onclick="toast('Attached to course')">Attach</button></div></div>`).join('')}</div></div>`}
function trainerReportsPage(){return pageTitle('Reports','Analyze learner progress, course reach and assessment quality.',`<button class="btn btn-primary" onclick="downloadPortalReport('Trainer Performance Report')">Export Report</button>`)+`<div class="metric-grid">${metric('Completion','78%','Assigned learners','','certificate')}${metric('Avg Score','84.6%','Assessments','green','results')}${metric('Active Learners','986','Last 30 days','blue','users')}${metric('Watch Time','1,842h','Training video','orange','live')}</div><div class="dash-two"><div class="card"><h3>Completion Trend</h3>${lineChart([52,58,63,66,71,75,78])}</div><div class="card"><h3>Assessment Quality</h3><div class="hbar-list">${[['Easy',92],['Medium',84],['Hard',71],['Scenario',79]].map(x=>`<div class="hbar-row"><span>${x[0]}</span><div class="hbar-track"><span style="width:${x[1]}%"></span></div><b>${x[1]}%</b></div>`).join('')}</div></div></div><div class="report-cards-v9">${[['Course Completion','Learner status by course'],['Assessment Performance','Attempts, scores and pass rate'],['Engagement','Video, resources and sessions'],['Certificate Eligibility','Who is ready to certify']].map(x=>`<button class="card report-download-card" onclick="downloadPortalReport('${x[0]}')"><span>${icon('report')}</span><b>${x[0]}</b><small>${x[1]}</small><strong>Export →</strong></button>`).join('')}</div>`}
function trainerMessagesPage(){const threads=[['Batch HIRA-11','4 unread','Can you explain residual risk again?'],['Meera Nair','1 unread','I submitted my retry assessment.'],['Admin Team','Updated','Your course approval is complete.']];return pageTitle('Messages','Communicate with learners, batches and academy teams.',`<button class="btn btn-primary" onclick="composeTrainerMessage()">+ New Message</button>`)+`<div class="messages-layout-v9"><div class="card thread-list"><input class="message-search" placeholder="Search conversations...">${threads.map((x,i)=>`<button onclick="openMessageThread('${x[0]}','${x[2]}')"><span class="person-avatar">${x[0].split(' ').map(y=>y[0]).join('').slice(0,2)}</span><span><b>${x[0]}</b><small>${x[2]}</small></span><em>${x[1]}</em></button>`).join('')}</div><div class="card empty-thread"><div class="big">💬</div><h3>Select a conversation</h3><p class="muted">Messages and batch discussions open here.</p></div></div>`}
function openMessageThread(name,last){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="message-thread-modal"><div class="message-thread-head"><span class="person-avatar">${name.slice(0,2).toUpperCase()}</span><div><h3>${esc(name)}</h3><small>Active conversation</small></div></div><div class="thread-messages"><div class="bubble them">${esc(last)}</div><div class="bubble me">Thanks. I’ll review this and get back to you.</div></div><div class="thread-compose"><input id="trainerMsg" placeholder="Type a message..."><button class="btn btn-primary" onclick="toast('Message sent');closeModal()">Send</button></div></div>`)}
function composeTrainerMessage(){openMessageThread('New Conversation','Choose a learner or batch and start your message.')}
function trainerCalendarPage(){const days=Array.from({length:30},(_,i)=>i+1);return pageTitle('Training Calendar','Coordinate sessions, assessments, content deadlines and learner milestones.',`<button class="btn btn-primary" onclick="scheduleSessionModal()">+ Add Event</button>`)+`<div class="calendar-layout-v9"><div class="card calendar-v9"><div class="calendar-head"><button>‹</button><h3>September 2026</h3><button>›</button></div><div class="calendar-week">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<b>${x}</b>`).join('')}</div><div class="calendar-days">${days.map(d=>`<button class="${[10,13,16,21].includes(d)?'has-event':''}" onclick="toast('${[10,13,16,21].includes(d)?'Training event selected':'No events on this day'}')"><span>${d}</span>${[10,13,16,21].includes(d)?'<i></i>':''}</button>`).join('')}</div></div><div class="card agenda-v9"><h3>Upcoming</h3>${[['10 Sep','HIRA Live Clinic','6:00 PM'],['13 Sep','Fire Safety Workshop','11:30 AM'],['16 Sep','Course Content Review','3:00 PM'],['21 Sep','Final Assessment Window','All day']].map(x=>`<button onclick="toast('${x[1]} opened')"><b>${x[0]}</b><span><strong>${x[1]}</strong><small>${x[2]}</small></span>→</button>`).join('')}</div></div>`}
function trainerProfilePage(){return pageTitle('My Profile','Manage trainer identity, expertise, availability and public course presence.',`<button class="btn btn-primary" onclick="toast('Profile saved')">Save Changes</button>`)+`<div class="profile-layout-v9"><div class="card profile-summary-v9"><div class="profile-photo">AR</div><h2>${esc(state.user?.name||'Trainer')}</h2><p>EHS Trainer • Vantras EHS Academy</p><div class="profile-score"><b>4.8★</b><span>Trainer rating</span></div></div><div class="card profile-form-v9"><div class="grid grid-2"><div class="field"><label>Professional title</label><input value="Senior EHS Trainer"></div><div class="field"><label>Experience</label><input value="9 years"></div><div class="field"><label>Specializations</label><input value="Risk, Fire, Occupational Safety"></div><div class="field"><label>Availability</label><input value="Weekdays • 5 PM–8 PM"></div></div><div class="field"><label>Professional bio</label><textarea rows="5">Industry-focused EHS trainer specializing in practical safety learning, risk assessment and workforce capability.</textarea></div></div></div>`}

function corporateAssessmentsPage(){const rows=[['HIRA Assessment',49,40,82,'12 Sep'],['Fire Safety Test',36,31,86,'16 Sep'],['LOTO Knowledge Check',24,19,79,'20 Sep'],['Work at Height Final',18,12,84,'24 Sep']];return pageTitle('Assessments','Monitor every workforce assessment, completion status and score.',`<button class="btn btn-primary" onclick="openPage('assignment')">Assign Training</button>`)+`<div class="metric-grid">${metric('Assessments',rows.length,'Active tests','','assessment')}${metric('Assigned','127','Employee attempts','blue','users')}${metric('Completed','102','Submitted','green','results')}${metric('Avg Score','83%','Across tests','orange','report')}</div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Assessment</th><th>Assigned</th><th>Completed</th><th>Avg Score</th><th>Due</th><th>Action</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${x[0]}</b></td><td>${x[1]}</td><td>${x[2]}</td><td><span class="score-chip">${x[3]}%</span></td><td>${x[4]}</td><td><button class="btn btn-ghost btn-sm" onclick="openActionPanel('${x[0]}','Employee completion, score distribution and attempts are available in this assessment workspace.')">View Details</button></td></tr>`).join('')}</tbody></table></div></div>`}
function corporateCertificatesPage(){const rows=[['Aarav Sharma','HIRA','VEA-2026-HIRA-000128','Valid'],['Meera Nair','Fire Safety','VEA-2026-FIRE-000127','Valid'],['Rohan Patel','Work at Height','VEA-2026-WAH-000126','Expiring']];return pageTitle('Certificates','Maintain workforce training evidence, validity and downloadable credentials.',`<button class="btn btn-primary" onclick="downloadPortalReport('Corporate Certificate Register')">Export Register</button>`)+`<div class="metric-grid">${metric('Valid','33','Employee credentials','','certificate')}${metric('Expiring Soon','4','Within 60 days','orange','calendar')}${metric('Courses','7','Certifying programs','blue','courses')}${metric('Coverage','86%','Required credentials','green','shield')}</div><div class="certificate-corp-grid">${rows.map(x=>`<div class="card corporate-cert-card">${certPreviewCard(x[0],x[1],x[2],x[3]==='Valid'?'Valid':'Expired')}<button class="btn btn-primary full-btn" onclick="openTrainerCertificate('${x[0]}','${x[1]}','${x[2]}')">Open Credential</button></div>`).join('')}</div>`}
function corporateResourcesPage(){const rows=[['Corporate HIRA Template','XLSX','Risk Management'],['Daily Safety Checklist','PDF','Operations'],['Emergency Drill Record','DOCX','Emergency'],['Training Matrix','XLSX','Compliance'],['Toolbox Talk Pack','PDF','Supervisors'],['Incident Investigation Kit','ZIP','Incidents']];return pageTitle('Resource Library','Share controlled EHS tools, templates and references across your organization.',`<button class="btn btn-primary" onclick="toast('Resource upload workspace opened')">+ Add Corporate Resource</button>`)+`<div class="resource-library-v9">${rows.map((x,i)=>`<div class="card corporate-resource-card"><div class="resource-type-big">${x[1]}</div><div><span class="kicker">${x[2]}</span><h3>${x[0]}</h3><p>Corporate-ready learning and compliance resource.</p></div><div class="action-row"><button class="btn btn-ghost btn-sm" onclick="openLessonResource('${x[0]}','${x[1]}',${i%3})">Preview</button><button class="btn btn-primary btn-sm" onclick="toast('Resource downloaded')">Download</button></div></div>`).join('')}</div>`}
function corporateRequestsPage(){const rows=[['Confined Space Refresher','28 employees','In Review','High'],['Supervisor Safety Leadership','October intake','Approved','Medium'],['Emergency Response Drill','On-site','Planning','High']];return pageTitle('Training Requests','Create and track custom, live and on-site corporate training requests.',`<button class="btn btn-primary" onclick="newTrainingRequest()">+ New Training Request</button>`)+`<div class="request-board-v9">${rows.map(x=>`<div class="card request-card-v9"><span class="request-priority">${x[3]} priority</span><h3>${x[0]}</h3><p>${x[1]}</p><div class="request-status"><i></i>${x[2]}</div><button class="btn btn-ghost full-btn" onclick="openActionPanel('${x[0]}','Request scope, Vantras response, schedule and next actions are shown here.')">Open Request</button></div>`).join('')}</div>`}
function newTrainingRequest(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Corporate Training</div><h2>New Training Request</h2><div class="field"><label>Program / requirement</label><input placeholder="e.g. Confined Space Refresher"></div><div class="grid grid-2"><div class="field"><label>Employees</label><input type="number" value="25"></div><div class="field"><label>Preferred mode</label><select><option>On-site</option><option>Live Online</option><option>Hybrid</option></select></div></div><div class="field"><label>Business need</label><textarea rows="4" placeholder="Describe the requirement..."></textarea></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="toast('Training request submitted');closeModal()">Submit Request</button></div>`)}
function corporateProfilePage(){return pageTitle('Corporate Profile','Manage organization identity, administrator details and training contacts.',`<button class="btn btn-primary" onclick="toast('Corporate profile saved')">Save Profile</button>`)+`<div class="profile-layout-v9"><div class="card profile-summary-v9 corporate"><div class="company-logo-demo">AM</div><h2>${esc(state.user?.company||'Apex Manufacturing Ltd')}</h2><p>Corporate Learning Account</p><div class="mini-grid"><div class="note"><b>120</b><br>Employees</div><div class="note"><b>8</b><br>Programs</div></div></div><div class="card profile-form-v9"><div class="grid grid-2"><div class="field"><label>Organization</label><input value="${esc(state.user?.company||'Apex Manufacturing Ltd')}"></div><div class="field"><label>Corporate Admin</label><input value="${esc(state.user?.name||'Corporate Admin')}"></div><div class="field"><label>Email</label><input value="${esc(state.user?.email||'')}"></div><div class="field"><label>Primary location</label><input value="Hyderabad, India"></div></div><div class="field"><label>Training objectives</label><textarea rows="5">Build consistent EHS capability across operational teams and maintain verifiable training records.</textarea></div></div></div>`}
function corporateSettingsPage(){const settings=[['Enrollment notifications','Notify admins when employees are assigned','on'],['Assessment reminders','Remind employees before due dates','on'],['Certificate expiry alerts','Notify 30/60 days before expiry','on'],['Monthly reports','Email scheduled management summary','on'],['Employee self-enrollment','Allow approved catalogue browsing','off']];return pageTitle('Settings','Configure corporate learning rules, notifications and reporting preferences.',`<button class="btn btn-primary" onclick="toast('Corporate settings saved')">Save Settings</button>`)+`<div class="settings-layout-v9"><div class="card"><h3>Learning & Notifications</h3>${settings.map(x=>`<label class="setting-row"><span><b>${x[0]}</b><small>${x[1]}</small></span><input type="checkbox" ${x[2]==='on'?'checked':''}><i></i></label>`).join('')}</div><div class="card"><h3>Reporting Schedule</h3><div class="field"><label>Frequency</label><select><option>Monthly</option><option>Weekly</option><option>Quarterly</option></select></div><div class="field"><label>Recipients</label><input value="admin@apex.demo, ehs@apex.demo"></div><div class="field"><label>Default export</label><select><option>PDF + Excel</option><option>PDF</option><option>Excel</option></select></div></div></div>`}


// V9 richer generic workspace used by remaining Trainer/Corporate/Admin modules.
richModulePage=function(title,desc,ico,items,stats=[['Active','12'],['This month','28'],['Completed','86%']],actions=''){return `${pageTitle(title,desc,actions)}<div class="metric-grid">${stats.map((x,i)=>metric(x[0],x[1],i===0?'Current workload':i===1?'Recent period':'Outcome',i===1?'blue':i===2?'green':'',ico)).join('')}</div><div class="feature-workspace-v9"><div class="card"><div class="section-card-title"><h3>${title} Overview</h3><span class="pill green">Live data</span></div><div class="feature-list-v9">${items.map((x,i)=>`<button onclick="openFeatureItem('${esc(title)}','${esc(x[0])}','${esc(x[1])}','${esc(x[2]||'Current')}')"><span class="feature-index">${String(i+1).padStart(2,'0')}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em>${x[2]||'Current'}</em><strong>→</strong></button>`).join('')}</div></div><div class="feature-side-v9"><div class="card feature-control-card"><div class="metric-icon">${icon(ico)}</div><h3>Workspace Controls</h3><p>${desc}</p><button class="btn btn-primary full-btn" onclick="openFeatureItem('${esc(title)}','New ${esc(title)} item','Create a new item with the required fields and workflow.','New')">+ New / Create</button><button class="btn btn-ghost full-btn" onclick="openFeatureItem('${esc(title)}','Manage ${esc(title)}','Review, update, archive and manage existing records.','Manage')">Manage Records</button><button class="btn btn-ghost full-btn" onclick="downloadPortalReport('${esc(title)} Report')">Export Report</button></div><div class="card feature-help-card"><h3>What this feature is for</h3><p>${desc}</p><ul><li>View current records and status</li><li>Open any row for complete details</li><li>Create or update allowed records</li><li>Export evidence when required</li></ul></div></div></div>`}
function openFeatureItem(section,title,desc,status){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="feature-detail-modal"><div class="eyebrow">${esc(section)}</div><div class="feature-detail-head"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><span class="pill green">${esc(status)}</span></div><div class="feature-detail-grid"><div><b>Status</b><span>${esc(status)}</span></div><div><b>Owner</b><span>${esc(state.user?.name||'Vantras')}</span></div><div><b>Last updated</b><span>${new Date().toLocaleString('en-IN')}</span></div></div><div class="field"><label>Notes / update</label><textarea rows="4" placeholder="Add an update, note or action..."></textarea></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-ghost" onclick="toast('Record archived');closeModal()">Archive</button><button class="btn btn-primary" onclick="toast('Changes saved');closeModal()">Save Changes</button></div></div>`)}


/* ====================== VANTRAS V10 UX + DATA DETAIL OVERRIDES ====================== */
const __publicContentV10Base = publicContent;
publicContent = function(p){
  if(p==='about') return `<main>
    <section class="public-page-hero about-v10">
      <div class="about-company-grid-v10">
        <div class="about-copy-v10">
          <div class="eyebrow">About Vantras EHS Academy</div>
          <h1>Professional EHS learning built for real workplaces.</h1>
          <p>Vantras EHS Academy helps learners, trainers, corporate teams and administrators manage training, assessments, live sessions and verifiable certificates from one connected platform.</p>
          <div class="about-mini-stats">
            <div><b>18</b><span>Published EHS courses</span></div>
            <div><b>4</b><span>Integrated portals</span></div>
            <div><b>100%</b><span>Certificate verification ready</span></div>
          </div>
        </div>
        <div class="about-photo-card">
          <img src="assets/managed/corporate/team.jpg" alt="Vantras EHS Academy company team">
          <div class="hero-floating-stat"><strong>Vantras Company Profile</strong><span>Digital learning • Assessments • Verified credentials</span></div>
        </div>
      </div>
    </section>
    <section class="section white">
      <div class="grid grid-3">
        ${[['shield','Why Vantras','Focused professional learning for safer decisions, stronger compliance and measurable skills.'],['learn','How it works','Training video → lesson notes → assessment → results → verified certificate.'],['users','Who it serves','Students, trainers, corporate learning teams and academy administrators.']].map(x=>`<div class="card purpose-card-v10"><div class="metric-icon">${icon(x[0])}</div><h3>${x[1]}</h3><p class="muted">${x[2]}</p></div>`).join('')}
      </div>
    </section>
    <section class="section alt">
      <div class="section-head"><div><div class="eyebrow">Company strengths</div><h2>Designed for delivery, tracking and proof.</h2><p>Every major learning workflow is represented inside the application.</p></div></div>
      <div class="grid grid-4 learning-model-grid">
        ${[['01','Video Learning','Play training videos and complete modules in sequence.','managed/courses/course-04.jpg'],['02','Assessment Flow','Open tests with instructions, questions and analysis.','managed/courses/course-07.jpg'],['03','Live Training','Join sessions with camera and microphone controls.','managed/courses/course-10.jpg'],['04','Credential Trust','Issue and verify certificate codes publicly.','managed/courses/course-18.jpg']].map(x=>`<div class="card learning-model-card v10"><span class="step-no">${x[0]}</span><img src="assets/${x[3]}" alt="${x[1]}"><h3>${x[1]}</h3><p class="muted">${x[2]}</p></div>`).join('')}
      </div>
    </section>
  </main>`;
  if(p==='corporate') return `<main>
    <section class="public-page-hero corporate-v10">
      <div class="about-company-grid-v10">
        <div class="about-copy-v10">
          <div class="eyebrow">Corporate Training</div>
          <h1>Centralize workforce EHS training with visibility.</h1>
          <p>Assign programs, track employee progress, monitor assessments, manage live sessions, store resources, handle requests and maintain corporate certificate records.</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" onclick="showAuth('login','corporate')">Open Corporate Portal</button>
            <button class="btn btn-ghost btn-lg" onclick="goPublic('contact')">Request Proposal</button>
          </div>
        </div>
        <div class="about-photo-card">
          <img src="assets/managed/corporate/training.jpg" alt="Corporate EHS training">
          <div class="hero-floating-stat"><strong>Corporate Learning Operations</strong><span>Assignments • assessments • reports • resources</span></div>
        </div>
      </div>
    </section>
    <section class="section white">
      <div class="grid grid-4">
        ${[['users','Employee Management','Create employees, map departments and keep training coverage visible.'],['courses','Program Assignment','Assign the right course to the right employees and teams.'],['results','Assessment Tracking','See assigned counts, completion, scores and due dates.'],['certificate','Proof & Reports','Maintain evidence, certificates and exportable reports.']].map(x=>`<div class="card purpose-card-v10"><div class="metric-icon">${icon(x[0])}</div><h3>${x[1]}</h3><p class="muted">${x[2]}</p><button class="public-link" onclick="showAuth('login','corporate')">Open workspace →</button></div>`).join('')}
      </div>
    </section>
    <section class="section alt">
      <div class="grid grid-3">
        ${[['Resource Library','Share templates, forms and practical corporate references.'],['Training Requests','Track custom on-site, online and hybrid programs.'],['Analytics & Certificates','Monitor team completion and proof of competence.']].map(x=>`<div class="card"><h3>${x[0]}</h3><p class="muted">${x[1]}</p></div>`).join('')}
      </div>
    </section>
  </main>`;
  return __publicContentV10Base(p);
};

loginUser=async function(){
  try{
    const identifier=document.getElementById('authIdentifier')?.value.trim()||'';
    const password=document.getElementById('authPassword')?.value||'';
    if(!identifier||!password) throw new Error('Enter your registered email/mobile and password');
    await api('/api/login',{method:'POST',body:JSON.stringify({identifier,password})});
    const me=await api('/api/me');
    state.user=me.user;
    if(state.pendingEnrollCourse && state.user.role==='student'){
      state.portalPage='checkout';
      state.checkoutCourse=Number(state.pendingEnrollCourse);
      state.pendingEnrollCourse=null;
      renderPortal();
      toast(`Welcome, ${state.user.name} — complete payment to enroll`);
    }else{
      if(state.pendingEnrollCourse && state.user.role!=='student'){
        state.pendingEnrollCourse=null;
        toast('Course enrollment requires a Student account','error');
      }
      state.portalPage=state.user.role==='student'?'browse':'dashboard';
      renderPortal();toast(`Welcome, ${state.user.name}`);
    }
  }catch(e){toast(e.message,'error')}
};

registerUser = async function(){
  try{
    const name=document.getElementById('authName')?.value.trim()||'';
    const email=document.getElementById('authEmail')?.value.trim()||'';
    const mobile=document.getElementById('authMobile')?.value.trim()||'';
    const password=document.getElementById('authPassword')?.value||'';
    const confirm=document.getElementById('authConfirmPassword')?.value||'';
    const role=document.getElementById('authRole')?.value||'student';
    const company=document.getElementById('authCompany')?.value?.trim()||'';
    const terms=document.getElementById('authTerms')?.checked;
    if(!name||!email||!password) throw new Error('Complete all required fields');
    if(password.length<6) throw new Error('Password must be at least 6 characters');
    if(password!==confirm) throw new Error('Passwords do not match');
    if(!terms) throw new Error('Please accept the Terms & Conditions');
    await api('/api/register',{method:'POST',body:JSON.stringify({name,email,password,role,company,mobile})});
    const me=await api('/api/me');
    state.user=me.user;
    if(state.pendingEnrollCourse && state.user.role==='student'){
      state.portalPage='checkout';
      state.checkoutCourse=Number(state.pendingEnrollCourse);
      state.pendingEnrollCourse=null;
      renderPortal();toast('Account created — complete payment to activate enrollment');
    }else{
      if(state.pendingEnrollCourse && state.user.role!=='student'){
        state.pendingEnrollCourse=null;
        toast('Course enrollment requires a Student account','error');
      }
      state.portalPage=state.user.role==='student'?'browse':'dashboard';
      renderPortal();toast(`${roleLabel(role)} account created and saved`);
    }
  }catch(e){toast(e.message,'error')}
};

function overviewDataset(title){
  const m = {
    'Enrollment Management': {summary:['Active enrollments, completion status, learner access, date joined'], columns:['Enrollment ID','Learner','Course','Progress','Status','Joined'], rows:[['ENR-2401','Student Learner','Hazard Identification & Risk Assessment','70%','In Progress','09 Sep 2026'],['ENR-2402','Student Learner','Fire Safety & Emergency Response','30%','In Progress','09 Sep 2026'],['ENR-2403','Aarav Sharma','Work at Height Safety','100%','Completed','06 Sep 2026'],['ENR-2404','Meera Nair','LOTO','82%','In Progress','04 Sep 2026']]},
    'Assessment Management': {summary:['Assessment title, difficulty, attempts, pass score, due date and status'], columns:['Assessment','Difficulty','Attempts','Avg Score','Pass %','Status'], rows:[['HIRA Knowledge Check','Mixed','128','86%','60%','Active'],['Fire Safety Final Assessment','Mixed','94','82%','60%','Active'],['LOTO Energy Isolation Test','Medium','71','88%','60%','Active'],['Construction Safety Review','Hard','53','79%','65%','Scheduled']]},
    'Question Bank': {summary:['Question distribution by subject, difficulty, usage and maintenance status'], columns:['Topic','Questions','Easy','Medium','Hard','Used In'], rows:[['Risk Assessment','112','24','58','30','9 assessments'],['Fire Safety','86','18','39','29','6 assessments'],['Occupational Safety','148','43','67','38','11 assessments'],['Compliance','72','19','31','22','5 assessments']]},
    'Exam Management': {summary:['Exam schedules, assigned learners, completion, pass rule and result status'], columns:['Exam','Schedule','Learners','Completed','Pass Rule','Status'], rows:[['Final Exam — HIRA','15 Sep 2026','62','0','60%','Upcoming'],['Final Exam — Fire Safety','18 Sep 2026','48','0','60%','Upcoming'],['Final Exam — Work at Height','21 Sep 2026','39','0','60%','Upcoming'],['Final Exam — Compliance','01 Sep 2026','44','40','65%','Completed']]},
    'Certificate Management': {summary:['Certificate code, learner, course, issue date, trainer and verification status'], columns:['Certificate Code','Learner','Course','Issue Date','Trainer','Status'], rows:[['VEA-2026-HIRA-000128','Student Learner','Hazard Identification & Risk Assessment','09 Sep 2026','Ananya Rao','Valid'],['VEA-2026-FIRE-000127','Meera Nair','Fire Safety & Emergency Response','08 Sep 2026','Ananya Rao','Valid'],['VEA-2026-WAH-000126','Aarav Sharma','Work at Height Safety','07 Sep 2026','Ananya Rao','Valid'],['VEA-2026-LOTO-000125','Rohan Patel','Lockout Tagout (LOTO)','05 Sep 2026','Ananya Rao','Revoked']]},
    'Coupons': {summary:['Discount code, offer type, expiry, usage count and campaign status'], columns:['Code','Offer','Applicable To','Expiry','Used','Status'], rows:[['WELCOME10','10% off','All first purchases','30 Sep 2026','84','Active'],['SAFETY500','₹500 off','Selected advanced programs','15 Oct 2026','42','Active'],['CORP15','15% off','Corporate campaign','31 Oct 2026','18','Scheduled'],['FIRE25','25% off','Fire Safety programs','12 Sep 2026','61','Ending Soon']]},
    'Invoices': {summary:['Invoice number, customer, order value, tax, payment state and generated date'], columns:['Invoice','Customer','Net Amount','GST','Status','Date'], rows:[['VEA-INV-2026-0098','Student Learner','₹1,999','₹360','Generated','09 Sep 2026'],['VEA-INV-2026-0097','Aarav Sharma','₹1,499','₹270','Generated','08 Sep 2026'],['VEA-INV-2026-0096','Apex Manufacturing','₹22,500','₹4,050','Generated','06 Sep 2026'],['VEA-INV-2026-0095','Sneha K.','₹2,499','₹450','Paid','05 Sep 2026']]},
    'Corporate Management': {summary:['Organization, employees, active programs, assigned learning and account status'], columns:['Corporate Account','Employees','Programs','Completion','Primary Contact','Status'], rows:[['Apex Manufacturing Ltd','120','8','86%','corporate@vantras.demo','Active'],['Pioneer Industries Ltd','96','6','74%','training@demoindustries.com','Active'],['GreenBuild Projects','62','4','68%','ehs@greenbuild.com','Active'],['Vertex Logistics','44','3','58%','ops@vertexlogistics.com','Onboarding']]},
    'Live Sessions': {summary:['Session date, trainer, platform, learner count, attendance and recording state'], columns:['Session','Date / Time','Trainer','Learners','Attendance','Recording'], rows:[['HIRA Workshop','10 Sep 2026 • 6:00 PM','Ananya Rao','58','Scheduled','Pending'],['Fire Safety Q&A','13 Sep 2026 • 11:30 AM','Ananya Rao','42','Scheduled','Pending'],['LOTO Demonstration','04 Sep 2026 • 6:30 PM','Ananya Rao','48','93%','Published'],['Confined Space Planning','07 Sep 2026 • 4:30 PM','Ananya Rao','34','90%','Published']]},
    'Resources': {summary:['Resource title, type, category, access and use across the platform'], columns:['Resource','Type','Category','Access','Used By','Status'], rows:[['HIRA Template','XLSX','Risk Management','Free','Students / Corporate','Published'],['Inspection Checklist','PDF','Occupational Safety','Course-linked','Students / Trainers','Published'],['Incident Investigation Form','DOCX','Compliance','Corporate','Corporate','Published'],['Chemical Storage Poster','PDF','Health & Hygiene','Public','Website / Students','Published']]},
    'CMS / Blog': {summary:['Article title, category, author, visibility, publish state and date'], columns:['Article','Category','Author','Visibility','Status','Date'], rows:[['Near Misses: Weak Signals','EHS Guidance','Vantras Team','Public','Published','09 Sep 2026'],['HIRA Register Best Practices','Risk','Vantras Team','Public','Published','08 Sep 2026'],['Safety Leadership for Supervisors','Leadership','Ananya Rao','Public','Draft','07 Sep 2026'],['Monthly Safety Bulletin','News','Vantras Team','Internal','Scheduled','12 Sep 2026']]}
  };
  return m[title] || null;
}

function overviewDetailsHtml(title){
  const data = overviewDataset(title);
  if(!data) return '';
  return `<div class="overview-details-grid">
    <div class="card overview-card-main">
      <div class="section-card-title"><h3>${title} Details</h3><span class="pill green">Full overview</span></div>
      <p class="muted">${data.summary[0]}</p>
      <div class="overview-scroll table-wrap"><table class="table"><thead><tr>${data.columns.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${data.rows.map(r=>`<tr>${r.map((c,i)=>`<td>${i===0?'<strong>'+c+'</strong>':c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </div>
    <div class="feature-side-v9">
      <div class="card feature-help-card">
        <h3>Overview shows</h3>
        <ul>${data.summary.map(x=>`<li>${x}</li>`).join('')}</ul>
      </div>
      <div class="card feature-help-card">
        <h3>Quick controls</h3>
        <button class="btn btn-primary full-btn" onclick="downloadPortalReport('${esc(title)} Detailed Overview')">Export Overview</button>
        <button class="btn btn-ghost full-btn" onclick="openFeatureItem('${esc(title)}','Review ${esc(title)}','Detailed overview opened for review and follow-up.','Review')">Open review</button>
      </div>
    </div>
  </div>`;
}

richModulePage = function(title,desc,ico,items,stats=[['Active','12'],['This month','28'],['Completed','86%']],actions=''){
  return `${pageTitle(title,desc,actions)}
    <div class="metric-grid">${stats.map((x,i)=>metric(x[0],x[1],i===0?'Current workload':i===1?'Recent period':'Outcome',i===1?'blue':i===2?'green':'',ico)).join('')}</div>
    <div class="feature-workspace-v9">
      <div class="card">
        <div class="section-card-title"><h3>${title} Overview</h3><span class="pill green">Live data</span></div>
        <div class="feature-list-v9">${items.map((x,i)=>`<button onclick="openFeatureItem('${esc(title)}','${esc(x[0])}','${esc(x[1])}','${esc(x[2]||'Current')}')"><span class="feature-index">${String(i+1).padStart(2,'0')}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em>${x[2]||'Current'}</em><strong>→</strong></button>`).join('')}</div>
      </div>
      <div class="feature-side-v9">
        <div class="card feature-control-card"><div class="metric-icon">${icon(ico)}</div><h3>Workspace Controls</h3><p>${desc}</p><button class="btn btn-primary full-btn" onclick="openFeatureItem('${esc(title)}','New ${esc(title)} item','Create a new item with the required fields and workflow.','New')">+ New / Create</button><button class="btn btn-ghost full-btn" onclick="openFeatureItem('${esc(title)}','Manage ${esc(title)}','Review, update, archive and manage existing records.','Manage')">Manage Records</button><button class="btn btn-ghost full-btn" onclick="downloadPortalReport('${esc(title)} Report')">Export Report</button></div>
        <div class="card feature-help-card"><h3>What this feature is for</h3><p>${desc}</p><ul><li>View current records and status</li><li>Open any row for complete details</li><li>Create or update allowed records</li><li>Export evidence when required</li></ul></div>
      </div>
    </div>
    ${overviewDetailsHtml(title)}`;
}

openFeatureItem = function(section,title,desc,status){
  showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="feature-detail-modal"><div class="eyebrow">${esc(section)}</div><div class="feature-detail-head"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><span class="pill green">${esc(status)}</span></div><div class="feature-detail-grid"><div><b>Status</b><span>${esc(status)}</span></div><div><b>Owner</b><span>${esc(state.user?.name||'Vantras')}</span></div><div><b>Last updated</b><span>${new Date().toLocaleString('en-IN')}</span></div></div><div class="notes-callout">This action panel shows the full feature details, controls and record context.</div><div class="field"><label>Notes / update</label><textarea rows="4" placeholder="Add an update, note or action..."></textarea></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-ghost" onclick="toast('Record archived');closeModal()">Archive</button><button class="btn btn-primary" onclick="toast('Changes saved');closeModal()">Save Changes</button></div></div>`,true)
}

/* ====================== VANTRAS V12 CONTENT-MATCHED VISUAL + INTERACTION OVERRIDES ====================== */
const V12_PAGE_ART = {
  student:{browse:'managed/story/workers.jpg',mycourses:'managed/courses/course-03.jpg',courseplayer:'managed/courses/course-04.jpg',learningpath:'managed/story/risk.jpg',assessments:'managed/story/inspection.jpg',exams:'managed/courses/course-12.jpg',results:'managed/courses/course-16.jpg',performance:'managed/courses/course-19.jpg',certificates:'managed/courses/course-18.jpg',payments:'managed/courses/course-06.jpg',resources:'managed/story/ppe.jpg',sessions:'managed/corporate/training.jpg',ai:'managed/courses/course-10.jpg',notifications:'managed/courses/course-01.jpg',support:'managed/custom/contact-hero.jpg',profile:'managed/story/workers.jpg'},
  trainer:{courses:'managed/courses/course-02.jpg',create:'managed/courses/course-07.jpg',learners:'managed/story/workers.jpg',sessions:'managed/corporate/training.jpg',assessments:'managed/story/inspection.jpg',questionbank:'managed/courses/course-11.jpg',assignments:'managed/courses/course-13.jpg',certificates:'managed/courses/course-18.jpg',library:'managed/story/ppe.jpg',feedback:'managed/courses/course-15.jpg',reports:'managed/courses/course-19.jpg',messages:'managed/courses/course-09.jpg',calendar:'managed/courses/course-17.jpg',profile:'managed/corporate/team.jpg',support:'managed/custom/contact-hero.jpg'},
  corporate:{programs:'managed/corporate/training.jpg',team:'managed/corporate/team.jpg',bulk:'managed/courses/course-08.jpg',assignment:'managed/story/workers.jpg',enrollments:'managed/courses/course-03.jpg',assessments:'managed/story/inspection.jpg',progress:'managed/courses/course-19.jpg',certificates:'managed/courses/course-18.jpg',reports:'managed/courses/course-16.jpg',resources:'managed/story/ppe.jpg',requests:'managed/story/risk.jpg',notifications:'managed/courses/course-01.jpg',profile:'managed/corporate/team.jpg',settings:'managed/courses/course-20.jpg',support:'managed/custom/contact-hero.jpg'},
  admin:{users:'managed/story/workers.jpg',courses:'managed/courses/course-02.jpg',categories:'managed/categories/category-04.jpg',approvals:'managed/story/inspection.jpg',enrollments:'managed/courses/course-03.jpg',assessments:'managed/courses/course-11.jpg',questionbank:'managed/story/risk.jpg',exams:'managed/courses/course-12.jpg',certificates:'managed/courses/course-18.jpg',verification:'managed/hero-admin.jpg',payments:'managed/courses/course-06.jpg',refunds:'managed/courses/course-05.jpg',coupons:'managed/courses/course-14.jpg',invoices:'managed/courses/course-16.jpg',corporate:'managed/corporate/team.jpg',sessions:'managed/corporate/training.jpg',resources:'managed/story/ppe.jpg',content:'managed/custom/blog-hero.jpg',reports:'managed/courses/course-19.jpg',analytics:'managed/courses/course-20.jpg',notifications:'managed/courses/course-01.jpg',support:'managed/custom/contact-hero.jpg',audit:'managed/story/inspection.jpg',security:'managed/story/fire.jpg',roles:'managed/story/workers.jpg',settings:'managed/courses/course-17.jpg'}
};
Object.entries(V12_PAGE_ART).forEach(([role,pages])=>Object.entries(pages).forEach(([page,img])=>{if(VISUALS[role]?.[page])VISUALS[role][page][0]=img;}));

function coursePurpose(c={}){
  const text=((c.category||'')+' '+(c.title||'')).toLowerCase();
  if(/fire|emergency/.test(text))return 'Purpose: emergency readiness & fire response';
  if(/risk|hira|hazard/.test(text))return 'Purpose: hazard identification & risk control';
  if(/environment/.test(text))return 'Purpose: environmental compliance & impact control';
  if(/height|ppe|occupational|construction/.test(text))return 'Purpose: safe work execution & injury prevention';
  if(/audit|compliance|legal/.test(text))return 'Purpose: compliance evidence & audit readiness';
  if(/incident/.test(text))return 'Purpose: incident prevention, investigation & learning';
  if(/leadership|supervisor/.test(text))return 'Purpose: safety leadership & workforce behavior';
  return 'Purpose: workforce EHS competence & practical application';
}
function v12VisualForLabel(label=''){
  const t=String(label).toLowerCase();
  if(/certificate|credential|valid/.test(t))return 'managed/courses/course-18.jpg';
  if(/assessment|attempt|exam|question/.test(t))return 'managed/story/inspection.jpg';
  if(/course|published|category/.test(t))return 'managed/courses/course-02.jpg';
  if(/employee|learner|student|user|team/.test(t))return 'managed/story/workers.jpg';
  if(/revenue|payment|invoice|refund/.test(t))return 'managed/courses/course-06.jpg';
  if(/resource|file|template/.test(t))return 'managed/story/ppe.jpg';
  if(/session|video|live|watch/.test(t))return 'managed/corporate/training.jpg';
  if(/progress|score|completion|analytics|report/.test(t))return 'managed/courses/course-19.jpg';
  if(/risk|hard|pending|approval/.test(t))return 'managed/story/risk.jpg';
  return workspaceImage(state.user?.role,state.portalPage,2);
}
metric = function(label,value,hint,kind='',ico='dashboard',trend=''){
  const art=v12VisualForLabel(label);
  return `<button class="card metric ${kind} metric-v12" style="--metric-art:url('assets/${art}')" onclick="openActionPanel('${esc(label)}','${esc(hint||'Open detailed workspace records and status information.')}')"><div class="metric-icon">${icon(ico)}</div><div class="metric-copy"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>${trend?`<span class="metric-trend">${trend}</span>`:''}<span class="metric-photo" aria-hidden="true"></span></button>`
};

dashboardVisualRibbon = function(role){
  const data={
    student:[['managed/courses/course-04.jpg','Continue Learning','courseplayer'],['managed/story/inspection.jpg','Assessment Practice','assessments'],['managed/story/ppe.jpg','EHS Resources','resources']],
    trainer:[['managed/courses/course-07.jpg','Build Courses','create'],['managed/courses/course-11.jpg','Assessment Studio','assessments'],['managed/story/ppe.jpg','Content Library','library']],
    corporate:[['managed/corporate/team.jpg','Manage Team','team'],['managed/story/workers.jpg','Assign Training','assignment'],['managed/courses/course-19.jpg','Reports & Analytics','reports']],
    admin:[['managed/story/workers.jpg','User Operations','users'],['managed/story/inspection.jpg','Course Governance','approvals'],['managed/courses/course-20.jpg','Platform Analytics','analytics']]
  };
  return `<div class="visual-ribbon visual-ribbon-v12">${(data[role]||[]).map((x,i)=>`<button class="visual-tile visual-tile-${i+1}" onclick="openPage('${x[2]}')"><img src="assets/${x[0]}" alt="${x[1]}"><span><b>${x[1]}</b><small>Open workspace <strong>→</strong></small></span></button>`).join('')}</div>`
};

const V12_NAV_ICONS={home:'dashboard',about:'company',courses:'courses',corporate:'users',resources:'resource',blog:'message',verify:'shield',contact:'support'};
publicHeader = function(active='home'){
  return `<header class="public-header public-header-v12"><button class="public-brand public-brand-v12" onclick="goPublic('home')" aria-label="Vantras EHS Academy home"><span class="public-brand-frame"><img class="brand-logo" src="assets/managed/logo.png" alt="Vantras EHS Academy"></span><span class="brand-copy"><b>Vantras</b><small>EHS Academy</small></span></button><nav class="topnav topnav-v12">${PUBLIC_NAV.map(([k,v])=>`<button class="${active===k?'active':''}" onclick="goPublic('${k}')"><span>${icon(V12_NAV_ICONS[k])}</span><em>${v}</em></button>`).join('')}</nav><div class="header-actions header-actions-v12"><button class="btn btn-ghost btn-sm header-login" onclick="showAuth('login')"><span class="header-action-icon">${icon('profile')}</span><span>Login</span></button><button class="btn btn-primary btn-sm header-register" onclick="showAuth('register')"><span class="header-action-icon">${icon('plus')}</span><span>Register</span></button></div></header>`
};

const __publicContentV12Base=publicContent;
publicContent=function(p){
  let out=__publicContentV12Base(p);
  if(p==='home'){
    const tools=`<div class="public-panel ehs-tools-panel"><div class="eyebrow">EHS Resources</div><h2>Ready-to-use tools</h2><div class="ehs-tool-list">${[
      ['risk','HIRA Template','Risk Management','Identify hazards, score risk and record controls.','managed/story/risk.jpg'],
      ['audit','Daily Safety Checklist','Operations','Run consistent pre-start and workplace checks.','managed/story/inspection.jpg'],
      ['message','Incident Investigation Form','Incident Management','Capture facts, causes, actions and evidence.','managed/story/fire.jpg']
    ].map(x=>`<button class="ehs-tool-row" onclick="goPublic('resources')"><img src="assets/${x[4]}" alt=""><span class="ehs-tool-icon">${icon(x[0])}</span><span><b>${x[1]}</b><small>${x[2]} • ${x[3]}</small></span><strong>→</strong></button>`).join('')}</div><button class="public-link" onclick="goPublic('resources')">Browse resource library →</button></div>`;
    out=out.replace(/<div class="public-panel"><div class="eyebrow">EHS Resources<\/div><h2>Ready-to-use tools<\/h2>[\s\S]*?<button class="public-link" onclick="goPublic\('resources'\)">Browse library →<\/button><\/div>/,tools);
  }
  return out;
};

const __courseCardV12Base=courseCard;
courseCard=function(c,i=0,student=false){
  const rating=(4.6+((Number(c.id||i)%4)*.1)).toFixed(1);
  return `<article class="card course-card course-card-v12 hover"><div class="course-cover"><img src="${courseImage(c,i)}" alt="${esc(c.title)}"><div class="course-cover-top"><span class="tag">${esc(c.category||'EHS')}</span><span class="rating-chip">★ ${rating}</span></div></div><div class="course-body"><div class="course-code-row"><span class="kicker">${esc(c.code||'VANTRAS')}</span><span class="course-level">${esc(c.level||'Professional')}</span></div><h3>${esc(c.title)}</h3><div class="course-purpose-tag">${icon('shield')}<span>${esc(coursePurpose(c))}</span></div><div class="course-facts"><span>${icon('calendar')} ${esc(c.duration||'Self paced')}</span><span>${icon('live')} ${esc(c.mode||'Online')}</span></div><div class="course-card-footer"><div><small>Course fee</small><div class="price">${money(c.price)}</div></div><div class="action-row"><button class="btn btn-ghost btn-sm icon-arrow-btn" onclick="courseDetail(${c.id})">Details <b>→</b></button>${student?`<button class="btn btn-primary btn-sm icon-arrow-btn" onclick="enroll(${c.id})">Enroll <b>→</b></button>`:''}</div></div></div></article>`
};

openLessonResource = function(title,type,i){
  const t=String(type||'').toUpperCase();
  if(t.includes('VIDEO')){
    return showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Video Resource</div><h2>${esc(title)}</h2><div class="media-preview-v12"><video controls preload="metadata" src="assets/managed/videos/training.mp4"></video></div><p class="muted">Play, pause, seek and use the native media controls. Course video completion remains tracked in the Course Player.</p><div class="action-row right"><button class="btn btn-primary" onclick="closeModal()">Close</button></div>`,true)
  }
  if(t.includes('AUDIO')){
    return showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Audio Resource</div><h2>${esc(title)}</h2><div class="audio-preview-v12"><span>${icon('live')}</span><div><b>EHS Audio Briefing</b><small>Playable course audio resource</small></div></div><audio class="audio-player-v12" controls preload="metadata" src="assets/managed/audio/training-briefing.mp3"></audio><div class="action-row right"><button class="btn btn-primary" onclick="closeModal()">Close</button></div>`,true)
  }
  showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="resource-preview-v9"><div class="resource-preview-icon">${t==='PDF'?'PDF':t==='CHECKLIST'?'✓':'i'}</div><div><div class="eyebrow">${esc(type)} Resource</div><h2>${esc(title)}</h2><p class="muted">Course-linked reference material for the current lesson.</p></div></div><div class="resource-paper"><h3>${esc(title)}</h3><p>Use this resource while completing the lesson and practical workplace activity.</p><div class="checklist-demo">${['Confirm the work scope','Identify hazards and affected people','Select and verify controls','Record findings and follow-up actions'].map(x=>`<label><input type="checkbox"> ${x}</label>`).join('')}</div></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="toast('Resource saved to your library');closeModal()">Save to Library</button></div>`,true)
};

function v12InitTrainerThreads(){
  if(state.trainerThreads)return;
  state.trainerThreads=[
    {name:'Batch HIRA-11',unread:4,messages:[{who:'them',text:'Can you explain residual risk again?'},{who:'me',text:'Yes. Residual risk is the risk remaining after controls are applied.'}]},
    {name:'Meera Nair',unread:1,messages:[{who:'them',text:'I submitted my retry assessment.'},{who:'me',text:'Thanks, I will review the updated attempt.'}]},
    {name:'Admin Team',unread:0,messages:[{who:'them',text:'Your course approval is complete.'},{who:'me',text:'Received. I will publish the learner announcement.'}]}
  ];
}
trainerMessagesPage=function(){
  v12InitTrainerThreads();
  return pageTitle('Messages & Batch Discussions','Open, reply to and edit learner, batch and academy conversations.',`<button class="btn btn-primary" onclick="composeTrainerMessage()">+ New Message</button>`)+`<div class="messages-layout-v12"><div class="card thread-list thread-list-v12"><div class="message-search-wrap">${icon('search')}<input class="message-search" placeholder="Search conversations..." oninput="filterTrainerThreads(this.value)"></div><div id="trainerThreadButtons">${trainerThreadButtonsHtml()}</div></div><div class="card thread-stage-v12" id="trainerThreadStage"><div class="empty-thread"><div class="big">💬</div><h3>Select a message or batch</h3><p class="muted">The full discussion opens here. You can reply and edit messages you sent.</p></div></div></div>`
};
function trainerThreadButtonsHtml(filter=''){
  v12InitTrainerThreads(); const q=filter.toLowerCase();
  return state.trainerThreads.map((t,i)=>({t,i})).filter(x=>!q||x.t.name.toLowerCase().includes(q)||x.t.messages.some(m=>m.text.toLowerCase().includes(q))).map(({t,i})=>`<button onclick="selectTrainerThread(${i})"><span class="person-avatar">${t.name.split(' ').map(y=>y[0]).join('').slice(0,2)}</span><span><b>${esc(t.name)}</b><small>${esc(t.messages.at(-1)?.text||'')}</small></span><em>${t.unread?`${t.unread} unread`:'Open'}</em></button>`).join('')||'<div class="empty small">No conversations found.</div>'
}
function filterTrainerThreads(q){const el=document.getElementById('trainerThreadButtons');if(el)el.innerHTML=trainerThreadButtonsHtml(q)}
function selectTrainerThread(i){v12InitTrainerThreads();state.activeTrainerThread=i;state.trainerThreads[i].unread=0;renderTrainerThreadStage();const list=document.getElementById('trainerThreadButtons');if(list)list.innerHTML=trainerThreadButtonsHtml()}
function renderTrainerThreadStage(){
  const el=document.getElementById('trainerThreadStage'),t=state.trainerThreads?.[state.activeTrainerThread]; if(!el||!t)return;
  el.innerHTML=`<div class="message-thread-head"><span class="person-avatar">${t.name.slice(0,2).toUpperCase()}</span><div><h3>${esc(t.name)}</h3><small>Editable active discussion</small></div></div><div class="thread-messages thread-messages-v12">${t.messages.map((m,mi)=>`<div class="bubble ${m.who}"><span>${esc(m.text)}</span>${m.who==='me'?`<button onclick="editTrainerMessage(${mi})">Edit</button>`:''}</div>`).join('')}</div><div class="thread-compose"><input id="trainerMsgInline" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendTrainerInlineMessage()"><button class="btn btn-primary" onclick="sendTrainerInlineMessage()">Send</button></div>`
}
function sendTrainerInlineMessage(){const input=document.getElementById('trainerMsgInline'),text=input?.value.trim();if(!text||state.activeTrainerThread==null)return;state.trainerThreads[state.activeTrainerThread].messages.push({who:'me',text});renderTrainerThreadStage();toast('Message sent')}
function editTrainerMessage(mi){const t=state.trainerThreads?.[state.activeTrainerThread],m=t?.messages?.[mi];if(!m)return;showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">Edit Message</div><h2>${esc(t.name)}</h2><div class="field"><label>Message</label><textarea id="editTrainerMsg" rows="5">${esc(m.text)}</textarea></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditedTrainerMessage(${mi})">Save Changes</button></div>`)}
function saveEditedTrainerMessage(mi){const t=state.trainerThreads?.[state.activeTrainerThread],v=document.getElementById('editTrainerMsg')?.value.trim();if(!t||!v)return;t.messages[mi].text=v;closeModal();renderTrainerThreadStage();toast('Message updated')}
composeTrainerMessage=function(){showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">New Discussion</div><h2>Start a message</h2><div class="field"><label>Learner / batch / team</label><input id="newThreadName" placeholder="e.g. Batch FIRE-08"></div><div class="field"><label>Message</label><textarea id="newThreadText" rows="5" placeholder="Write your message..."></textarea></div><div class="action-row right"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="createTrainerThread()">Create Discussion</button></div>`)};
function createTrainerThread(){const n=document.getElementById('newThreadName')?.value.trim(),t=document.getElementById('newThreadText')?.value.trim();if(!n||!t)return toast('Add a recipient and message','error');v12InitTrainerThreads();state.trainerThreads.unshift({name:n,unread:0,messages:[{who:'me',text:t}]});closeModal();openPage('messages');setTimeout(()=>selectTrainerThread(0),60);toast('Discussion created')}

function v12LoadCalendarEvents(){if(state.trainerCalendarEvents)return;try{state.trainerCalendarEvents=JSON.parse(localStorage.getItem('vantras_trainer_calendar_v12')||'null')}catch{};if(!Array.isArray(state.trainerCalendarEvents))state.trainerCalendarEvents=[{date:'2026-09-10',title:'HIRA Live Clinic',time:'18:00',type:'Live Session'},{date:'2026-09-13',title:'Fire Safety Workshop',time:'11:30',type:'Workshop'},{date:'2026-09-16',title:'Course Content Review',time:'15:00',type:'Content Review'},{date:'2026-09-21',title:'Final Assessment Window',time:'09:00',type:'Assessment'}]}
function v12SaveCalendar(){localStorage.setItem('vantras_trainer_calendar_v12',JSON.stringify(state.trainerCalendarEvents||[]))}
trainerCalendarPage=function(){
  v12LoadCalendarEvents(); const selected=state.calendarSelectedDate||'2026-09-10';
  return pageTitle('Training Calendar','Select any date, add an event, and edit existing sessions, assessments or content deadlines.',`<button class="btn btn-primary" onclick="openCalendarEventEditor()">+ Add Event</button>`)+`<div class="calendar-toolbar-v12 card"><div><label>Selected date</label><input id="calendarDatePicker" type="date" value="${selected}" onchange="selectCalendarDate(this.value)"></div><div class="calendar-legend-v12"><span><i class="live"></i>Live Session</span><span><i class="assessment"></i>Assessment</span><span><i class="content"></i>Content / Review</span></div></div><div class="calendar-layout-v12"><div class="card calendar-month-v12"><div class="section-card-title"><h3>September 2026</h3><span class="pill green">Editable</span></div><div class="calendar-week">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<b>${x}</b>`).join('')}</div><div class="calendar-days">${Array.from({length:30},(_,i)=>i+1).map(d=>{const ds=`2026-09-${String(d).padStart(2,'0')}`,ev=state.trainerCalendarEvents.filter(x=>x.date===ds);return `<button class="${ev.length?'has-event':''} ${selected===ds?'selected':''}" onclick="selectCalendarDate('${ds}')"><span>${d}</span>${ev.slice(0,2).map(e=>`<i title="${esc(e.title)}"></i>`).join('')}</button>`}).join('')}</div></div><div class="card agenda-v12" id="calendarAgendaV12">${calendarAgendaHtml(selected)}</div></div>`
};
function selectCalendarDate(date){state.calendarSelectedDate=date;const picker=document.getElementById('calendarDatePicker');if(picker)picker.value=date;const a=document.getElementById('calendarAgendaV12');if(a)a.innerHTML=calendarAgendaHtml(date);document.querySelectorAll('.calendar-days button').forEach(b=>b.classList.toggle('selected',b.textContent.trim()===String(Number(date.slice(-2))))) }
function calendarAgendaHtml(date){v12LoadCalendarEvents();const rows=state.trainerCalendarEvents.map((e,i)=>({e,i})).filter(x=>x.e.date===date);return `<div class="section-card-title"><h3>${new Date(date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</h3><button class="view-link" onclick="openCalendarEventEditor('', '${date}')">+ Add</button></div>${rows.length?rows.map(({e,i})=>`<button class="calendar-event-row" onclick="openCalendarEventEditor(${i})"><span class="calendar-event-time">${esc(e.time)}</span><span><b>${esc(e.title)}</b><small>${esc(e.type)} • Click to edit</small></span><strong>→</strong></button>`).join(''):`<div class="empty-thread"><h3>No events</h3><p class="muted">Choose Add to schedule training, assessment or review work.</p></div>`}`}
function openCalendarEventEditor(index='',date=''){
  v12LoadCalendarEvents(); const editing=index!==''&&index!==null, e=editing?state.trainerCalendarEvents[index]:{date:date||state.calendarSelectedDate||'2026-09-10',title:'',time:'09:00',type:'Live Session'};
  showModal(`<button class="modal-close" onclick="closeModal()">✕</button><div class="eyebrow">${editing?'Edit':'Add'} Calendar Event</div><h2>${editing?esc(e.title):'Schedule training activity'}</h2><div class="grid grid-2"><div class="field"><label>Date</label><input id="calEditDate" type="date" value="${e.date}"></div><div class="field"><label>Time</label><input id="calEditTime" type="time" value="${e.time}"></div></div><div class="field"><label>Title</label><input id="calEditTitle" value="${esc(e.title)}" placeholder="Event title"></div><div class="field"><label>Purpose / type</label><select id="calEditType">${['Live Session','Assessment','Workshop','Content Review','Learner Follow-up'].map(x=>`<option ${x===e.type?'selected':''}>${x}</option>`).join('')}</select></div><div class="action-row right">${editing?`<button class="btn btn-ghost" onclick="deleteCalendarEvent(${index})">Delete</button>`:''}<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveCalendarEvent(${editing?index:"''"})">Save Event</button></div>`)}
function saveCalendarEvent(index=''){const e={date:calEditDate.value,title:calEditTitle.value.trim(),time:calEditTime.value,type:calEditType.value};if(!e.title)return toast('Add an event title','error');if(index==='')state.trainerCalendarEvents.push(e);else state.trainerCalendarEvents[index]=e;v12SaveCalendar();state.calendarSelectedDate=e.date;closeModal();openPage('calendar');toast('Calendar event saved')}
function deleteCalendarEvent(index){state.trainerCalendarEvents.splice(index,1);v12SaveCalendar();closeModal();openPage('calendar');toast('Calendar event removed')}

const __trainerLibraryPageV12Base=trainerLibraryPage;
trainerLibraryPage=function(){
  const files=[['HIRA Study Guide','PDF','4.8 MB','Risk Assessment','managed/story/risk.jpg'],['LOTO Demonstration','VIDEO','Training media','Occupational Safety','managed/corporate/training.jpg'],['Incident Response Briefing','AUDIO','12 sec','Incident Management','managed/story/fire.jpg'],['Inspection Checklist','XLSX','86 KB','Inspection','managed/story/inspection.jpg'],['Fire Drill Planning','PPTX','12 MB','Fire Safety','managed/story/fire.jpg']];
  return pageTitle('Content Library','Organize reusable trainer content by format, course purpose and access.',`<button class="btn btn-primary" onclick="openContentUpload()">${icon('upload')} Upload Content</button>`)+`<div class="metric-grid">${metric('Files','248','All learning resources','','resource')}${metric('Videos','64','Playable training media','blue','live')}${metric('Audio','18','Playable briefings','green','live')}${metric('Templates','92','Reusable workplace tools','orange','courses')}</div><div class="library-grid-v12">${files.map((x,i)=>`<div class="card library-media-card-v12"><img src="assets/${x[4]}" alt="${x[0]}"><div class="library-media-type">${x[1]}</div><div class="library-media-body"><span class="kicker">${x[3]}</span><h3>${x[0]}</h3><p>${x[2]} • Purpose: practical EHS learning support</p><div class="action-row"><button class="btn btn-ghost btn-sm" onclick="openLessonResource('${x[0]}','${x[1]}',${i})">${x[1]==='VIDEO'||x[1]==='AUDIO'?'Play':'Preview'}</button><button class="btn btn-primary btn-sm" onclick="toast('Attached to course')">Attach</button></div></div></div>`).join('')}</div>`
};

/* ====================== VANTRAS V13 VISUAL REFRESH OVERRIDES ====================== */
const V13_PAGE_ART={
  student:{browse:'managed/hero-public.jpg',mycourses:'managed/custom/card-video.jpg',courseplayer:'managed/custom/card-video.jpg',learningpath:'managed/custom/card-team.jpg',assessments:'managed/custom/card-assessment.jpg',exams:'managed/custom/card-assessment.jpg',results:'managed/custom/card-analytics.jpg',performance:'managed/custom/card-analytics.jpg',certificates:'managed/custom/card-certificate.jpg',payments:'managed/custom/card-analytics.jpg',resources:'managed/custom/card-resources.jpg',sessions:'managed/custom/card-video.jpg',ai:'managed/hero-public.jpg',notifications:'managed/custom/card-support.jpg',support:'managed/custom/card-support.jpg',profile:'managed/hero-public.jpg'},
  trainer:{courses:'managed/hero-trainer.jpg',create:'managed/custom/card-video.jpg',learners:'managed/custom/card-team.jpg',sessions:'managed/custom/card-video.jpg',assessments:'managed/custom/card-assessment.jpg',questionbank:'managed/custom/card-assessment.jpg',assignments:'managed/custom/card-team.jpg',certificates:'managed/custom/card-certificate.jpg',library:'managed/custom/card-resources.jpg',feedback:'managed/custom/card-support.jpg',reports:'managed/custom/card-analytics.jpg',messages:'managed/custom/card-support.jpg',calendar:'managed/custom/card-video.jpg',profile:'managed/hero-trainer.jpg',support:'managed/custom/card-support.jpg'},
  corporate:{programs:'managed/hero-corporate.jpg',team:'managed/custom/card-team.jpg',bulk:'managed/custom/card-team.jpg',assignment:'managed/custom/card-video.jpg',enrollments:'managed/custom/card-team.jpg',assessments:'managed/custom/card-assessment.jpg',progress:'managed/custom/card-analytics.jpg',certificates:'managed/custom/card-certificate.jpg',reports:'managed/custom/card-analytics.jpg',resources:'managed/custom/card-resources.jpg',requests:'managed/custom/card-support.jpg',notifications:'managed/custom/card-support.jpg',profile:'managed/hero-corporate.jpg',settings:'managed/custom/card-analytics.jpg',support:'managed/custom/card-support.jpg'},
  admin:{users:'managed/hero-admin.jpg',courses:'managed/custom/card-video.jpg',categories:'managed/custom/card-resources.jpg',approvals:'managed/custom/card-assessment.jpg',enrollments:'managed/custom/card-team.jpg',assessments:'managed/custom/card-assessment.jpg',questionbank:'managed/custom/card-assessment.jpg',exams:'managed/custom/card-assessment.jpg',certificates:'managed/custom/card-certificate.jpg',verification:'managed/hero-admin.jpg',payments:'managed/custom/card-analytics.jpg',refunds:'managed/custom/card-analytics.jpg',coupons:'managed/custom/card-support.jpg',invoices:'managed/custom/card-analytics.jpg',corporate:'managed/custom/card-team.jpg',sessions:'managed/custom/card-video.jpg',resources:'managed/custom/card-resources.jpg',content:'managed/custom/blog-hero.jpg',reports:'managed/custom/card-analytics.jpg',analytics:'managed/custom/card-analytics.jpg',notifications:'managed/custom/card-support.jpg',support:'managed/custom/card-support.jpg',audit:'managed/custom/card-assessment.jpg',security:'managed/hero-admin.jpg',roles:'managed/custom/card-team.jpg',settings:'managed/hero-admin.jpg'}
};
Object.entries(V13_PAGE_ART).forEach(([role,pages])=>Object.entries(pages).forEach(([page,img])=>{if(VISUALS[role]?.[page])VISUALS[role][page][0]=img;}));
ROLE_HERO_ART.student='managed/hero-public.jpg';
ROLE_HERO_ART.trainer='managed/hero-trainer.jpg';
ROLE_HERO_ART.corporate='managed/hero-corporate.jpg';
ROLE_HERO_ART.admin='managed/hero-admin.jpg';

v12VisualForLabel=function(label=''){
  const t=String(label).toLowerCase();
  if(/certificate|credential|valid|verify/.test(t))return 'managed/custom/card-certificate.jpg';
  if(/assessment|attempt|exam|question|quiz|test/.test(t))return 'managed/custom/card-assessment.jpg';
  if(/course|published|category|lesson|module|learning/.test(t))return 'managed/custom/card-video.jpg';
  if(/employee|learner|student|user|team|batch/.test(t))return 'managed/custom/card-team.jpg';
  if(/revenue|payment|invoice|refund|order/.test(t))return 'managed/custom/card-analytics.jpg';
  if(/resource|file|template|library/.test(t))return 'managed/custom/card-resources.jpg';
  if(/session|video|live|calendar|watch/.test(t))return 'managed/custom/card-video.jpg';
  if(/progress|score|completion|analytics|report|performance|readiness/.test(t))return 'managed/custom/card-analytics.jpg';
  if(/support|message|request|contact|feedback|notification/.test(t))return 'managed/custom/card-support.jpg';
  return workspaceImage(state.user?.role,state.portalPage,2);
};
metric=function(label,value,hint,kind='',ico='dashboard',trend=''){
  const art=v12VisualForLabel(label);
  return `<button class="card metric ${kind} metric-v12" style="--metric-art:url('assets/${art}')" onclick="openActionPanel('${esc(label)}','${esc(hint||'Open detailed workspace records and status information.')}')"><div class="metric-icon">${icon(ico)}</div><div class="metric-copy"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>${trend?`<span class="metric-trend">${trend}</span>`:''}<span class="metric-photo" aria-hidden="true"></span></button>`
};

dashboardVisualRibbon=function(role){
  const data={
    student:[['managed/hero-public.jpg','Continue Learning','courseplayer'],['managed/custom/card-assessment.jpg','Assessment Practice','assessments'],['managed/custom/card-resources.jpg','EHS Resources','resources']],
    trainer:[['managed/hero-trainer.jpg','Course Delivery','courses'],['managed/custom/card-assessment.jpg','Assessment Studio','assessments'],['managed/custom/card-video.jpg','Live Sessions','sessions']],
    corporate:[['managed/hero-corporate.jpg','Manage Programs','programs'],['managed/custom/card-team.jpg','My Team','team'],['managed/custom/card-analytics.jpg','Reports & Analytics','reports']],
    admin:[['managed/hero-admin.jpg','Platform Governance','users'],['managed/custom/card-certificate.jpg','Verification','verification'],['managed/custom/card-analytics.jpg','Analytics','analytics']]
  };
  return `<div class="visual-ribbon visual-ribbon-v12">${(data[role]||[]).map((x,i)=>`<button class="visual-tile visual-tile-${i+1}" onclick="openPage('${x[2]}')"><img src="assets/${x[0]}" alt="${x[1]}"><span><b>${x[1]}</b><small>Open workspace <strong>→</strong></small></span></button>`).join('')}</div>`
};

const __publicContentV13Base=publicContent;
publicContent=function(p){
  let out=__publicContentV13Base(p);
  if(p==='home'){
    out=out.replace(/assets\/managed\/courses\/course-04\.jpg/g,'assets/managed/custom/card-video.jpg');
    out=out.replace(/assets\/managed\/courses\/course-07\.jpg/g,'assets/managed/custom/card-assessment.jpg');
    out=out.replace(/assets\/managed\/courses\/course-16\.jpg/g,'assets/managed/custom/card-resources.jpg');
    out=out.replace(/assets\/managed\/courses\/course-05\.jpg/g,'assets/managed/custom/card-team.jpg');
    out=out.replace(/assets\/managed\/courses\/course-11\.jpg/g,'assets/managed/custom/card-analytics.jpg');
    out=out.replace(/assets\/managed\/courses\/course-18\.jpg/g,'assets/managed/custom/card-certificate.jpg');
  }
  if(p==='about'){
    out=out.replace(/assets\/managed\/corporate\/team\.jpg/g,'assets/managed/custom/about-hero.jpg');
    out=out.replace(/assets\/managed\/courses\/course-04\.jpg/g,'assets/managed/custom/card-video.jpg');
    out=out.replace(/assets\/managed\/courses\/course-07\.jpg/g,'assets/managed/custom/card-assessment.jpg');
    out=out.replace(/assets\/managed\/courses\/course-10\.jpg/g,'assets/managed/custom/card-video.jpg');
    out=out.replace(/assets\/managed\/courses\/course-18\.jpg/g,'assets/managed/custom/card-certificate.jpg');
  }
  if(p==='corporate') out=out.replace(/assets\/managed\/corporate\/training\.jpg/g,'assets/managed/hero-corporate.jpg');
  if(p==='contact') out=out.replace(/assets\/managed\/public\/contact\.jpg/g,'assets/managed/custom/contact-hero.jpg');
  if(p==='verify') out=out.replace(/assets\/managed\/public\/verify\.jpg/g,'assets/managed/hero-admin.jpg');
  if(p==='resources') out=out.replace(/assets\/managed\/public\/resources\.jpg/g,'assets/managed/custom/resources-hero.jpg');
  if(p==='blog') out=out.replace(/assets\/managed\/public\/blog\.jpg/g,'assets/managed/custom/blog-hero.jpg');
  if(p==='courses') out=out.replace(/assets\/managed\/public\/courses\.jpg/g,'assets/managed/custom/courses-hero.jpg');
  return out;
};

let authPortalChoice='';
function selectLoginPortal(role){
  authPortalChoice=role||'';
  document.querySelectorAll('.auth-portal-card').forEach(b=>b.classList.toggle('selected',b.dataset.role===authPortalChoice));
  const hint=document.getElementById('authPortalHint');
  const input=document.getElementById('authIdentifier');
  if(hint) hint.textContent=authPortalChoice ? `${roleLabel(authPortalChoice)} selected — enter the email or mobile number you registered with.` : 'Choose a portal or sign in directly with your registered account.';
  if(input){input.placeholder=authPortalChoice?`Registered ${roleLabel(authPortalChoice)} email or mobile`:'Registered email or mobile';input.focus()}
}
/* Kept for backwards compatibility with old buttons; it no longer inserts demo credentials. */
fillDemo=function(role){selectLoginPortal(role)};

showAuth=function(mode='login',prefill=''){
  const isRegister=mode==='register';
  const roles=['student','trainer','corporate','admin'];
  const preferredRole=roles.includes(String(prefill||'').toLowerCase())?String(prefill).toLowerCase():'';
  authPortalChoice=preferredRole;
  const intro=`<div class="auth-art-message auth-art-message-v26"><span class="auth-eyebrow">Vantras EHS Academy</span><h1>Sign in to continue learning.</h1><p>Continue to your Student, Trainer, Corporate or Admin demo workspace with secure role-based access.</p></div><div class="auth-highlight-list auth-highlight-list-v26"><div><span class="auth-feature-icon">${icon('learn')}</span><span><b>Structured learning</b><small>Training videos, lesson notes and completion tracking</small></span></div><div><span class="auth-feature-icon">${icon('assessment')}</span><span><b>Assessments & exams</b><small>Open tests, results, question banks and exam workflows</small></span></div><div><span class="auth-feature-icon">${icon('certificate')}</span><span><b>Verified certificates</b><small>Use certificate codes to verify completion status publicly</small></span></div></div>`;
  app.innerHTML=`<div class="auth-wrap auth-wrap-v26"><div class="auth-card auth-card-${mode} auth-card-v26">
    <section class="auth-art auth-art-${mode} auth-art-v26" style="--auth-image:url('assets/managed/custom/auth-hero.jpg')"><div class="auth-art-overlay"></div><div class="auth-art-content"><button class="auth-brand-chip" onclick="goPublic('home')"><img src="assets/managed/logo.png" alt="Vantras EHS Academy"></button>${intro}<div class="auth-art-footer"><span>Secure role access</span><i></i><span>Database-backed accounts</span><i></i><span>Persistent portal data</span></div></div></section>
    <section class="auth-form auth-form-v10 auth-form-v26"><div class="auth-form-top"><button class="auth-back" onclick="goPublic('home')">← Website</button><span class="secure-badge">● Secure access</span></div><div class="auth-mobile-logo"><img src="assets/managed/logo.png" alt="Vantras EHS Academy"></div><div class="auth-tabs"><button class="${!isRegister?'active':''}" onclick="showAuth('login','${preferredRole}')">Login</button><button class="${isRegister?'active':''}" onclick="showAuth('register','${preferredRole}')">Register</button></div><div class="auth-heading"><span class="eyebrow">${isRegister?'Create account':'Welcome back'}</span><h2>${isRegister?'Create your portal account':'Sign in to your portal'}</h2><p>${isRegister?'Your account is stored in the database and opens the selected role workspace.':'Use the same email/mobile and password you registered with.'}</p></div>
      ${isRegister?`<div class="grid grid-2"><div class="field"><label>Full name</label><div class="input-shell"><input id="authName" autocomplete="name" placeholder="Your full name"></div></div><div class="field"><label>Portal role</label><div class="input-shell"><select id="authRole"><option value="student" ${preferredRole==='student'?'selected':''}>Student</option><option value="trainer" ${preferredRole==='trainer'?'selected':''}>Trainer</option><option value="corporate" ${preferredRole==='corporate'?'selected':''}>Corporate</option><option value="admin" ${preferredRole==='admin'?'selected':''}>Admin</option></select></div></div><div class="field"><label>Account email</label><div class="input-shell"><input id="authEmail" type="email" autocomplete="email" placeholder="name@example.com"></div></div><div class="field"><label>Mobile</label><div class="input-shell"><input id="authMobile" autocomplete="tel" placeholder="9876543210"></div></div><div class="field"><label>Company / Organization</label><div class="input-shell"><input id="authCompany" placeholder="Optional"></div></div><div class="field"><label>Password</label><div class="input-shell password-shell"><input id="authPassword" type="password" autocomplete="new-password" placeholder="Create a strong password"><button type="button" onclick="togglePassword('authPassword',this)">Show</button></div></div></div><div class="field"><label>Confirm password</label><div class="input-shell password-shell"><input id="authConfirmPassword" type="password" autocomplete="new-password" placeholder="Repeat your password"><button type="button" onclick="togglePassword('authConfirmPassword',this)">Show</button></div></div><label class="auth-consent"><input id="authTerms" type="checkbox"> <span>I agree to the Terms & Conditions and Privacy Policy.</span></label><button class="btn btn-primary auth-submit" onclick="registerUser()">Create Account <b>→</b></button><p class="auth-switch">Already registered? <button onclick="showAuth('login',document.getElementById('authRole')?.value||'')">Sign in</button></p>`:
      `<div class="field"><label>Email or mobile</label><div class="input-shell"><input id="authIdentifier" autocomplete="username" value="${preferredRole?'':esc(prefill)}" placeholder="Registered email or mobile"></div></div><div class="field"><label>Password</label><div class="input-shell password-shell"><input id="authPassword" type="password" autocomplete="current-password" placeholder="Enter your password"><button type="button" onclick="togglePassword('authPassword',this)">Show</button></div></div><div class="auth-row"><label><input id="authRemember" type="checkbox"> Remember me</label><button class="auth-link" onclick="openPasswordReset()">Forgot password?</button></div><button class="btn btn-primary auth-submit" onclick="loginUser()">Sign In <b>→</b></button><div class="auth-divider"><span>Choose your portal</span></div><div class="auth-portal-grid auth-portal-grid-v26">${[['Student','student','Courses • exams • certificates','learn'],['Trainer','trainer','Courses • learners • reports','courses'],['Corporate','corporate','Employees • programs • requests','company'],['Admin','admin','Users • finance • platform','shield']].map(x=>`<button type="button" data-role="${x[1]}" class="auth-portal-card ${preferredRole===x[1]?'selected':''}" onclick="selectLoginPortal('${x[1]}')"><span class="demo-icon">${icon(x[3])}</span><span class="demo-copy"><b>${x[0]}</b><small>Use your registered credentials</small><em>${x[2]}</em></span><strong>→</strong></button>`).join('')}</div><p id="authPortalHint" class="auth-portal-hint">${preferredRole?`${roleLabel(preferredRole)} selected — enter the email or mobile number you registered with.`:'Choose a portal or sign in directly with your registered account.'}</p><p class="auth-switch">Need an account? <button onclick="showAuth('register','${preferredRole}')">Create one</button></p>`}
    </section></div></div>`;
};

/* ====================== VANTRAS V15 UNIFIED HERO + FEATURE CARD UI ====================== */
portalHero = function(role){
  const h=HERO[role]||HERO.student;
  const quick={student:'browse',trainer:'create',corporate:'assignment',admin:'users'}[role]||'dashboard';
  const daily={student:'results',trainer:'reports',corporate:'reports',admin:'analytics'}[role]||'dashboard';
  const art=ROLE_HERO_ART[role]||'managed/hero-public.jpg';
  const title=role==='admin'?'Platform Control Center':h[0];
  const desc=role==='admin'?'Operate users, learning, assessments, credentials and platform governance with clear evidence.':h[1];
  const first=esc(state.user?.name?.split(' ')[0]||'User');
  return `<section class="portal-hero-v15">
    <div class="portal-hero-v15-copy">
      <div class="eyebrow">${roleLabel(role)} Portal</div>
      <h1>${title}, ${first}</h1>
      <p>${desc}</p>
      <div class="portal-hero-actions">
        <button class="btn btn-primary" onclick="openPage('${quick}')">${icon('plus')} Quick Start</button>
        <button class="btn btn-ghost" onclick="openPage('${daily}')">${icon('results')} Daily Overview</button>
      </div>
      <div class="portal-proof-v15">
        <span>${icon('shield')} Role-based access</span>
        <span>${icon('results')} Live workspace data</span>
        <span>${icon('certificate')} Verified outcomes</span>
      </div>
    </div>
    <div class="portal-hero-v15-media"><img src="assets/${art}" alt="${roleLabel(role)} workspace"></div>
  </section>`;
};

portalSectionVisual = function(role,p){
  if(p==='dashboard')return '';
  const v=VISUALS[role]?.[p];
  if(!v)return '';
  return `<section class="portal-feature-hero-v15">
    <div class="portal-feature-hero-copy-v15">
      <div class="visual-kicker"><span class="eyebrow">${roleLabel(role)} Workspace</span><span class="visual-live-dot">Live</span></div>
      <h2>${v[1]}</h2>
      <p>${v[2]}</p>
      <div class="visual-badges">
        <span>${icon('shield')} Role-based</span><span>${icon('results')} Live data</span><span>${icon('plus')} Action ready</span>
      </div>
      <div class="hero-mini-actions">
        <button onclick="openWorkspaceOverview()"><span>${icon('dashboard')}</span>Overview</button>
        <button onclick="openWorkspaceInsights()"><span>${icon('report')}</span>Insights</button>
      </div>
    </div>
    <div class="portal-feature-hero-media-v15"><img src="assets/${v[0]}" alt="${esc(v[1])}"></div>
  </section>`;
};

richModulePage = function(title,desc,ico,items,stats=[['Active','12'],['This month','28'],['Completed','86%']],actions=''){
  const featureCards=items.map((x,i)=>`<button class="feature-image-card-v15" onclick="openFeatureItem('${esc(title)}','${esc(x[0])}','${esc(x[1])}','${esc(x[2]||'Current')}')">
    <img src="${workspaceThumb(i+1)}" alt="${esc(x[0])}">
    <span class="feature-image-body-v15">
      <span class="feature-image-top-v15"><em>${String(i+1).padStart(2,'0')}</em><small>${esc(x[2]||'Current')}</small></span>
      <b>${esc(x[0])}</b><span>${esc(x[1])}</span><strong>Open details →</strong>
    </span>
  </button>`).join('');
  return `${pageTitle(title,desc,actions)}
    <div class="metric-grid">${stats.map((x,i)=>metric(x[0],x[1],i===0?'Current workload':i===1?'Recent activity':'Outcome',i===1?'blue':i===2?'green':'',ico)).join('')}</div>
    <section class="feature-section-v15">
      <div class="section-card-title"><div><span class="eyebrow">${roleLabel(state.user?.role||'student')} Workspace</span><h3>${title} features</h3></div><span class="pill green">Live data</span></div>
      <div class="feature-image-grid-v15">${featureCards}</div>
    </section>
    <section class="feature-action-band-v15">
      <div><span class="feature-action-icon-v15">${icon(ico)}</span><div><b>Manage ${esc(title)}</b><small>${esc(desc)}</small></div></div>
      <div class="feature-action-buttons-v15">
        <button class="btn btn-primary" onclick="openFeatureItem('${esc(title)}','New ${esc(title)} item','Create a new item with the required fields and workflow.','New')">${icon('plus')} New / Create</button>
        <button class="btn btn-ghost" onclick="openFeatureItem('${esc(title)}','Manage ${esc(title)}','Review, update, archive and manage existing records.','Manage')">Manage Records</button>
        <button class="btn btn-ghost" onclick="downloadPortalReport('${esc(title)} Report')">${icon('report')} Export Report</button>
      </div>
    </section>
    ${overviewDetailsHtml(title)}`;
};

/* ====================== VANTRAS V16 FULL-CARD HERO OVERRIDES ====================== */
portalHero = function(role){
  const h=HERO[role]||HERO.student;
  const quick={student:'browse',trainer:'create',corporate:'assignment',admin:'users'}[role]||'dashboard';
  const daily={student:'results',trainer:'reports',corporate:'reports',admin:'analytics'}[role]||'dashboard';
  const art=ROLE_HERO_ART[role]||'managed/hero-public.jpg';
  const title=role==='admin'?'Platform Control Center':h[0];
  const desc=role==='admin'?'Operate users, learning, assessments, credentials and platform governance with clear evidence.':h[1];
  const first=esc(state.user?.name?.split(' ')[0]||'User');
  return `<section class="portal-hero-v16" style="--hero:url('assets/${art}')">
    <div class="portal-hero-v16-copy">
      <div class="eyebrow">${roleLabel(role)} Portal</div>
      <h1>${title}, ${first}</h1>
      <p>${desc}</p>
      <div class="portal-hero-actions">
        <button class="btn btn-primary" onclick="openPage('${quick}')">${icon('plus')} Quick Start</button>
        <button class="btn btn-ghost" onclick="openPage('${daily}')">${icon('results')} Daily Overview</button>
      </div>
      <div class="portal-proof-v16">
        <span>${icon('shield')} Role-based access</span>
        <span>${icon('results')} Live workspace data</span>
        <span>${icon('certificate')} Verified outcomes</span>
      </div>
    </div>
  </section>`;
};

portalSectionVisual = function(role,p){
  if(p==='dashboard')return '';
  const v=VISUALS[role]?.[p];
  if(!v)return '';
  return `<section class="portal-feature-hero-v16" style="--hero:url('assets/${v[0]}')">
    <div class="portal-feature-hero-copy-v16">
      <div class="visual-kicker"><span class="eyebrow">${roleLabel(role)} Workspace</span><span class="visual-live-dot">Live</span></div>
      <h2>${v[1]}</h2>
      <p>${v[2]}</p>
      <div class="visual-badges">
        <span>${icon('shield')} Role-based</span><span>${icon('results')} Live data</span><span>${icon('plus')} Action ready</span>
      </div>
      <div class="hero-mini-actions">
        <button onclick="openWorkspaceOverview()"><span>${icon('dashboard')}</span>Overview</button>
        <button onclick="openWorkspaceInsights()"><span>${icon('report')}</span>Insights</button>
      </div>
    </div>
  </section>`;
};


/* ====================== VANTRAS V17 CONTENT-MATCHED HERO IMAGES ====================== */
/* Dashboard art remains untouched. Only non-dashboard feature pages use the mappings below. */
const V17_FEATURE_ART={
  student:{
    browse:['managed/story/workers.jpg','managed/categories/category-02.jpg','managed/categories/category-08.jpg'],
    mycourses:['managed/courses/course-01.jpg','managed/courses/course-06.jpg','managed/categories/category-06.jpg'],
    courseplayer:['managed/courses/course-01.jpg','managed/categories/category-08.jpg','managed/story/risk.jpg'],
    learningpath:['managed/categories/category-06.jpg','managed/categories/category-04.jpg','managed/courses/course-14.jpg'],
    assessments:['managed/courses/course-02.jpg','managed/courses/course-03.jpg','managed/courses/course-09.jpg'],
    exams:['managed/courses/course-11.jpg','managed/courses/course-17.jpg','managed/custom/card-assessment.jpg'],
    results:['managed/courses/course-12.jpg','managed/courses/course-18.jpg','managed/courses/course-15.jpg'],
    performance:['managed/courses/course-18.jpg','managed/courses/course-12.jpg','managed/courses/course-06.jpg'],
    certificates:['managed/hero-admin.jpg','managed/custom/card-certificate.jpg','managed/story/ppe.jpg'],
    payments:['managed/courses/course-18.jpg','managed/courses/course-12.jpg','managed/courses/course-15.jpg'],
    resources:['managed/categories/category-07.jpg','managed/courses/course-02.jpg','managed/story/inspection.jpg'],
    sessions:['managed/custom/card-video.jpg','managed/story/fire.jpg','managed/categories/category-02.jpg'],
    ai:['managed/courses/course-01.jpg','managed/story/risk.jpg','managed/courses/course-04.jpg'],
    notifications:['managed/custom/card-support.jpg','managed/courses/course-06.jpg','managed/courses/course-15.jpg'],
    support:['managed/custom/card-support.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg'],
    profile:['managed/categories/category-08.jpg','managed/courses/course-08.jpg','managed/corporate/team.jpg']
  },
  trainer:{
    courses:['managed/story/workers.jpg','managed/courses/course-01.jpg','managed/categories/category-02.jpg'],
    create:['managed/courses/course-01.jpg','managed/story/risk.jpg','managed/custom/card-video.jpg'],
    learners:['managed/courses/course-07.jpg','managed/categories/category-02.jpg','managed/corporate/training.jpg'],
    sessions:['managed/custom/card-video.jpg','managed/story/fire.jpg','managed/categories/category-05.jpg'],
    assessments:['managed/courses/course-02.jpg','managed/courses/course-09.jpg','managed/custom/card-assessment.jpg'],
    questionbank:['managed/courses/course-03.jpg','managed/courses/course-11.jpg','managed/categories/category-07.jpg'],
    assignments:['managed/categories/category-07.jpg','managed/courses/course-02.jpg','managed/courses/course-03.jpg'],
    certificates:['managed/hero-admin.jpg','managed/custom/card-certificate.jpg','managed/story/ppe.jpg'],
    library:['managed/story/risk.jpg','managed/categories/category-03.jpg','managed/categories/category-07.jpg'],
    feedback:['managed/custom/card-support.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg'],
    reports:['managed/courses/course-12.jpg','managed/courses/course-18.jpg','managed/courses/course-16.jpg'],
    messages:['managed/custom/card-support.jpg','managed/corporate/training.jpg','managed/courses/course-07.jpg'],
    calendar:['managed/custom/card-video.jpg','managed/story/fire.jpg','managed/categories/category-05.jpg'],
    profile:['managed/categories/category-08.jpg','managed/courses/course-08.jpg','managed/corporate/team.jpg'],
    support:['managed/custom/card-support.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg']
  },
  corporate:{
    programs:['managed/corporate/training.jpg','managed/story/workers.jpg','managed/categories/category-02.jpg'],
    team:['managed/courses/course-07.jpg','managed/corporate/team.jpg','managed/categories/category-02.jpg'],
    bulk:['managed/categories/category-02.jpg','managed/courses/course-07.jpg','managed/courses/course-06.jpg'],
    assignment:['managed/courses/course-02.jpg','managed/categories/category-07.jpg','managed/story/workers.jpg'],
    enrollments:['managed/courses/course-06.jpg','managed/courses/course-15.jpg','managed/categories/category-02.jpg'],
    assessments:['managed/courses/course-09.jpg','managed/courses/course-03.jpg','managed/custom/card-assessment.jpg'],
    progress:['managed/courses/course-12.jpg','managed/courses/course-18.jpg','managed/courses/course-06.jpg'],
    certificates:['managed/hero-admin.jpg','managed/custom/card-certificate.jpg','managed/story/ppe.jpg'],
    reports:['managed/courses/course-18.jpg','managed/courses/course-12.jpg','managed/courses/course-16.jpg'],
    resources:['managed/categories/category-07.jpg','managed/story/inspection.jpg','managed/courses/course-02.jpg'],
    requests:['managed/custom/card-support.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg'],
    notifications:['managed/custom/card-support.jpg','managed/courses/course-06.jpg','managed/courses/course-15.jpg'],
    profile:['managed/corporate/training.jpg','managed/corporate/team.jpg','managed/categories/category-08.jpg'],
    settings:['managed/courses/course-06.jpg','managed/courses/course-15.jpg','managed/courses/course-04.jpg'],
    support:['managed/custom/card-support.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg']
  },
  admin:{
    users:['managed/courses/course-06.jpg','managed/courses/course-15.jpg','managed/categories/category-02.jpg'],
    courses:['managed/story/workers.jpg','managed/courses/course-01.jpg','managed/categories/category-01.jpg'],
    categories:['managed/categories/category-01.jpg','managed/categories/category-03.jpg','managed/categories/category-05.jpg'],
    approvals:['managed/courses/course-02.jpg','managed/categories/category-07.jpg','managed/story/inspection.jpg'],
    enrollments:['managed/courses/course-15.jpg','managed/courses/course-06.jpg','managed/categories/category-02.jpg'],
    assessments:['managed/courses/course-09.jpg','managed/courses/course-03.jpg','managed/custom/card-assessment.jpg'],
    questionbank:['managed/courses/course-03.jpg','managed/courses/course-11.jpg','managed/categories/category-07.jpg'],
    exams:['managed/courses/course-11.jpg','managed/courses/course-17.jpg','managed/custom/card-assessment.jpg'],
    certificates:['managed/hero-admin.jpg','managed/custom/card-certificate.jpg','managed/story/ppe.jpg'],
    verification:['managed/hero-admin.jpg','managed/story/ppe.jpg','managed/custom/card-certificate.jpg'],
    payments:['managed/courses/course-18.jpg','managed/courses/course-12.jpg','managed/courses/course-15.jpg'],
    refunds:['managed/courses/course-12.jpg','managed/courses/course-18.jpg','managed/courses/course-15.jpg'],
    coupons:['managed/courses/course-04.jpg','managed/courses/course-10.jpg','managed/categories/category-03.jpg'],
    invoices:['managed/courses/course-18.jpg','managed/courses/course-15.jpg','managed/courses/course-12.jpg'],
    corporate:['managed/corporate/training.jpg','managed/courses/course-07.jpg','managed/corporate/team.jpg'],
    sessions:['managed/custom/card-video.jpg','managed/story/fire.jpg','managed/categories/category-05.jpg'],
    resources:['managed/categories/category-07.jpg','managed/story/inspection.jpg','managed/courses/course-02.jpg'],
    content:['managed/story/risk.jpg','managed/courses/course-01.jpg','managed/categories/category-03.jpg'],
    reports:['managed/courses/course-12.jpg','managed/courses/course-18.jpg','managed/courses/course-16.jpg'],
    analytics:['managed/courses/course-18.jpg','managed/courses/course-12.jpg','managed/courses/course-06.jpg'],
    notifications:['managed/custom/card-support.jpg','managed/courses/course-06.jpg','managed/courses/course-15.jpg'],
    support:['managed/custom/card-support.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg'],
    audit:['managed/story/inspection.jpg','managed/courses/course-02.jpg','managed/categories/category-07.jpg'],
    security:['managed/story/ppe.jpg','managed/hero-admin.jpg','managed/courses/course-04.jpg'],
    roles:['managed/courses/course-06.jpg','managed/categories/category-02.jpg','managed/corporate/team.jpg'],
    settings:['managed/courses/course-04.jpg','managed/courses/course-06.jpg','managed/courses/course-15.jpg']
  }
};

for(const [role,pages] of Object.entries(V17_FEATURE_ART)){
  for(const [page,arts] of Object.entries(pages)){
    if(VISUALS[role]?.[page]) VISUALS[role][page][0]=arts[0];
  }
}

workspaceImage=function(role=state.user?.role,page=state.portalPage,i=0){
  if(page==='dashboard')return ROLE_HERO_ART[role]||'managed/hero-public.jpg';
  const arts=V17_FEATURE_ART[role]?.[page];
  if(arts?.length)return arts[Math.max(0,i)%arts.length];
  const v=VISUALS[role]?.[page]?.[0];
  if(v)return v;
  return COURSE_ART[(Math.max(0,i)+(page?.length||0)+(role?.length||0))%COURSE_ART.length];
};
workspaceThumb=function(i=0){return `assets/${workspaceImage(state.user?.role,state.portalPage,i)}`};

/* Remove duplicate brand wording beside the logo: the logo artwork already includes the academy name. */
publicHeader=function(active='home'){
  return `<header class="public-header public-header-v12"><button class="public-brand public-brand-v12 brand-logo-only-v17" onclick="goPublic('home')" aria-label="Vantras EHS Academy home"><span class="public-brand-frame"><img class="brand-logo" src="assets/managed/logo.png" alt="Vantras EHS Academy"></span></button><nav class="topnav topnav-v12">${PUBLIC_NAV.map(([k,v])=>`<button class="${active===k?'active':''}" onclick="goPublic('${k}')"><span>${icon(V12_NAV_ICONS[k])}</span><em>${v}</em></button>`).join('')}</nav><div class="header-actions header-actions-v12"><button class="btn btn-ghost btn-sm header-login" onclick="showAuth('login')"><span class="header-action-icon">${icon('profile')}</span><span>Login</span></button><button class="btn btn-primary btn-sm header-register" onclick="showAuth('register')"><span class="header-action-icon">${icon('plus')}</span><span>Register</span></button></div></header>`;
};

/* ====================== VANTRAS V18 HERO + FEATURE ART REFINEMENT ====================== */
/* Reuse existing project art only. Public/page layout is styled in CSS below. */
ROLE_HERO_ART.student='managed/custom/feature-learning-v18.jpg';
ROLE_HERO_ART.admin='managed/custom/feature-support-v18.jpg';

const V18_ART_GROUPS={
  learning:['managed/custom/feature-learning-v18.jpg','managed/custom/feature-training-v18.jpg','managed/corporate/training.jpg'],
  learningPath:['managed/custom/learning-path-v18.jpg','managed/custom/feature-learning-v18.jpg','managed/custom/feature-training-v18.jpg'],
  assessment:['managed/custom/feature-learning-v18.jpg','managed/categories/category-07.jpg','managed/courses/course-09.jpg'],
  certificate:['managed/custom/feature-certificate-v18.jpg','managed/hero-admin.jpg','managed/story/ppe.jpg'],
  support:['managed/custom/feature-support-v18.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg'],
  analytics:['managed/courses/course-12.jpg','managed/courses/course-18.jpg','managed/categories/category-01.jpg'],
  resources:['managed/custom/resources-hero-v18.jpg','managed/categories/category-07.jpg','managed/story/inspection.jpg'],
  live:['managed/custom/feature-training-v18.jpg','managed/custom/feature-learning-v18.jpg','managed/story/fire.jpg'],
  people:['managed/custom/feature-support-v18.jpg','managed/corporate/training.jpg','managed/custom/feature-learning-v18.jpg'],
  governance:['managed/custom/feature-certificate-v18.jpg','managed/story/inspection.jpg','managed/courses/course-12.jpg']
};

function v18ArtGroup(role,page){
  const p=String(page||'').toLowerCase();
  if(p==='learningpath')return V18_ART_GROUPS.learningPath;
  if(/certificate|verification|security/.test(p))return V18_ART_GROUPS.certificate;
  if(/assessment|exam|questionbank|result/.test(p))return V18_ART_GROUPS.assessment;
  if(/report|analytics|progress|performance|payment|refund|invoice|coupon/.test(p))return V18_ART_GROUPS.analytics;
  if(/resource|library|content|categor/.test(p))return V18_ART_GROUPS.resources;
  if(/session|calendar/.test(p))return V18_ART_GROUPS.live;
  if(/support|message|feedback|notification|request/.test(p))return V18_ART_GROUPS.support;
  if(/user|learner|team|employee|bulk|corporate|role|profile/.test(p))return V18_ART_GROUPS.people;
  if(/audit|approval|setting/.test(p))return V18_ART_GROUPS.governance;
  return V18_ART_GROUPS.learning;
}

for(const [role,pages] of Object.entries(V17_FEATURE_ART)){
  for(const page of Object.keys(pages)){
    V17_FEATURE_ART[role][page]=[...v18ArtGroup(role,page)];
    if(VISUALS[role]?.[page])VISUALS[role][page][0]=V17_FEATURE_ART[role][page][0];
  }
}
/* Learning Path gets its own stronger visual treatment. */
V17_FEATURE_ART.student.learningpath=[...V18_ART_GROUPS.learningPath];
VISUALS.student.learningpath[0]=V18_ART_GROUPS.learningPath[0];

workspaceImage=function(role=state.user?.role,page=state.portalPage,i=0){
  if(page==='dashboard')return ROLE_HERO_ART[role]||'managed/hero-public.jpg';
  const arts=V17_FEATURE_ART[role]?.[page]||v18ArtGroup(role,page);
  return arts[Math.max(0,i)%arts.length];
};
workspaceThumb=function(i=0){return `assets/${workspaceImage(state.user?.role,state.portalPage,i)}`};

/* ====================== VANTRAS V19 FEATURE-SPECIFIC HERO ART ====================== */
/* Dashboard hero art is intentionally left unchanged. Every non-dashboard feature gets
   a content-matched existing project image, with two companion images for its feature cards. */
const V19_FEATURE_ART={
  student:{
    browse:['managed/story/workers.jpg','managed/categories/category-08.jpg','managed/categories/category-04.jpg'],
    mycourses:['managed/courses/course-01.jpg','managed/courses/course-06.jpg','managed/courses/course-16.jpg'],
    courseplayer:['managed/courses/course-04.jpg','managed/courses/course-19.jpg','managed/story/risk.jpg'],
    learningpath:['managed/custom/learning-path-v18.jpg','managed/categories/category-06.jpg','managed/story/environment.jpg'],
    assessments:['managed/courses/course-02.jpg','managed/courses/course-09.jpg','managed/custom/feature-learning-v18.jpg'],
    exams:['managed/courses/course-11.jpg','managed/courses/course-17.jpg','managed/custom/feature-learning-v18.jpg'],
    results:['managed/courses/course-12.jpg','managed/categories/category-01.jpg','managed/courses/course-18.jpg'],
    performance:['managed/courses/course-18.jpg','managed/courses/course-15.jpg','managed/categories/category-01.jpg'],
    certificates:['managed/custom/feature-certificate-v18.jpg','managed/hero-admin.jpg','managed/story/ppe.jpg'],
    payments:['managed/courses/course-12.jpg','managed/courses/course-18.jpg','managed/courses/course-15.jpg'],
    resources:['managed/categories/category-07.jpg','managed/story/inspection.jpg','managed/courses/course-02.jpg'],
    sessions:['managed/custom/feature-training-v18.jpg','managed/corporate/training.jpg','managed/story/fire.jpg'],
    ai:['managed/courses/course-10.jpg','managed/courses/course-19.jpg','managed/story/risk.jpg'],
    notifications:['managed/courses/course-16.jpg','managed/courses/course-06.jpg','managed/custom/feature-support-v18.jpg'],
    support:['managed/custom/feature-support-v18.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg'],
    profile:['managed/courses/course-08.jpg','managed/courses/course-14.jpg','managed/categories/category-08.jpg']
  },
  trainer:{
    courses:['managed/courses/course-05.jpg','managed/courses/course-13.jpg','managed/story/workers.jpg'],
    create:['managed/courses/course-04.jpg','managed/courses/course-10.jpg','managed/custom/feature-learning-v18.jpg'],
    learners:['managed/courses/course-07.jpg','managed/courses/course-13.jpg','managed/corporate/team.jpg'],
    sessions:['managed/custom/feature-training-v18.jpg','managed/corporate/training.jpg','managed/story/fire.jpg'],
    assessments:['managed/courses/course-09.jpg','managed/courses/course-02.jpg','managed/custom/feature-learning-v18.jpg'],
    questionbank:['managed/courses/course-03.jpg','managed/courses/course-11.jpg','managed/categories/category-07.jpg'],
    assignments:['managed/courses/course-02.jpg','managed/categories/category-07.jpg','managed/story/inspection.jpg'],
    certificates:['managed/custom/feature-certificate-v18.jpg','managed/hero-admin.jpg','managed/story/ppe.jpg'],
    library:['managed/courses/course-10.jpg','managed/categories/category-03.jpg','managed/story/risk.jpg'],
    feedback:['managed/courses/course-05.jpg','managed/corporate/team.jpg','managed/custom/feature-support-v18.jpg'],
    reports:['managed/courses/course-15.jpg','managed/courses/course-12.jpg','managed/courses/course-18.jpg'],
    messages:['managed/custom/feature-support-v18.jpg','managed/corporate/training.jpg','managed/courses/course-07.jpg'],
    calendar:['managed/courses/course-16.jpg','managed/custom/feature-training-v18.jpg','managed/story/fire.jpg'],
    profile:['managed/courses/course-08.jpg','managed/courses/course-14.jpg','managed/corporate/team.jpg'],
    support:['managed/custom/feature-support-v18.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg']
  },
  corporate:{
    programs:['managed/story/workers.jpg','managed/corporate/training.jpg','managed/categories/category-04.jpg'],
    team:['managed/courses/course-07.jpg','managed/courses/course-13.jpg','managed/corporate/team.jpg'],
    bulk:['managed/categories/category-02.jpg','managed/courses/course-06.jpg','managed/courses/course-16.jpg'],
    assignment:['managed/courses/course-02.jpg','managed/categories/category-07.jpg','managed/story/workers.jpg'],
    enrollments:['managed/courses/course-16.jpg','managed/courses/course-06.jpg','managed/categories/category-02.jpg'],
    assessments:['managed/courses/course-09.jpg','managed/courses/course-03.jpg','managed/custom/feature-learning-v18.jpg'],
    progress:['managed/courses/course-15.jpg','managed/courses/course-18.jpg','managed/categories/category-01.jpg'],
    certificates:['managed/custom/feature-certificate-v18.jpg','managed/hero-admin.jpg','managed/story/ppe.jpg'],
    reports:['managed/courses/course-18.jpg','managed/courses/course-12.jpg','managed/story/inspection.jpg'],
    resources:['managed/categories/category-07.jpg','managed/story/inspection.jpg','managed/courses/course-02.jpg'],
    requests:['managed/custom/feature-support-v18.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg'],
    notifications:['managed/courses/course-16.jpg','managed/courses/course-06.jpg','managed/custom/feature-support-v18.jpg'],
    profile:['managed/corporate/team.jpg','managed/courses/course-07.jpg','managed/categories/category-08.jpg'],
    settings:['managed/categories/category-03.jpg','managed/story/inspection.jpg','managed/courses/course-06.jpg'],
    support:['managed/custom/feature-support-v18.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg']
  },
  admin:{
    users:['managed/categories/category-02.jpg','managed/courses/course-06.jpg','managed/courses/course-16.jpg'],
    courses:['managed/courses/course-05.jpg','managed/courses/course-13.jpg','managed/story/workers.jpg'],
    categories:['managed/categories/category-03.jpg','managed/categories/category-05.jpg','managed/categories/category-04.jpg'],
    approvals:['managed/courses/course-02.jpg','managed/story/inspection.jpg','managed/categories/category-07.jpg'],
    enrollments:['managed/courses/course-16.jpg','managed/courses/course-06.jpg','managed/categories/category-02.jpg'],
    assessments:['managed/courses/course-09.jpg','managed/courses/course-03.jpg','managed/custom/feature-learning-v18.jpg'],
    questionbank:['managed/courses/course-03.jpg','managed/courses/course-11.jpg','managed/categories/category-07.jpg'],
    exams:['managed/courses/course-11.jpg','managed/courses/course-17.jpg','managed/custom/feature-learning-v18.jpg'],
    certificates:['managed/custom/feature-certificate-v18.jpg','managed/hero-admin.jpg','managed/story/ppe.jpg'],
    verification:['managed/hero-admin.jpg','managed/custom/feature-certificate-v18.jpg','managed/story/ppe.jpg'],
    payments:['managed/courses/course-18.jpg','managed/courses/course-12.jpg','managed/categories/category-01.jpg'],
    refunds:['managed/courses/course-12.jpg','managed/courses/course-18.jpg','managed/courses/course-15.jpg'],
    coupons:['managed/courses/course-04.jpg','managed/courses/course-10.jpg','managed/categories/category-03.jpg'],
    invoices:['managed/courses/course-15.jpg','managed/courses/course-18.jpg','managed/courses/course-12.jpg'],
    corporate:['managed/categories/category-02.jpg','managed/corporate/team.jpg','managed/courses/course-07.jpg'],
    sessions:['managed/custom/feature-training-v18.jpg','managed/corporate/training.jpg','managed/story/fire.jpg'],
    resources:['managed/categories/category-07.jpg','managed/story/inspection.jpg','managed/courses/course-02.jpg'],
    content:['managed/story/risk.jpg','managed/courses/course-10.jpg','managed/categories/category-03.jpg'],
    reports:['managed/courses/course-18.jpg','managed/courses/course-12.jpg','managed/story/inspection.jpg'],
    analytics:['managed/categories/category-01.jpg','managed/courses/course-18.jpg','managed/courses/course-15.jpg'],
    notifications:['managed/courses/course-16.jpg','managed/courses/course-06.jpg','managed/custom/feature-support-v18.jpg'],
    support:['managed/custom/feature-support-v18.jpg','managed/corporate/training.jpg','managed/courses/course-05.jpg'],
    audit:['managed/story/inspection.jpg','managed/courses/course-02.jpg','managed/categories/category-07.jpg'],
    security:['managed/story/ppe.jpg','managed/hero-admin.jpg','managed/categories/category-08.jpg'],
    roles:['managed/categories/category-02.jpg','managed/corporate/team.jpg','managed/courses/course-06.jpg'],
    settings:['managed/categories/category-03.jpg','managed/story/inspection.jpg','managed/courses/course-06.jpg']
  }
};

for(const [role,pages] of Object.entries(V19_FEATURE_ART)){
  for(const [page,arts] of Object.entries(pages)){
    if(VISUALS[role]?.[page])VISUALS[role][page][0]=arts[0];
  }
}

workspaceImage=function(role=state.user?.role,page=state.portalPage,i=0){
  if(page==='dashboard')return ROLE_HERO_ART[role]||'managed/hero-public.jpg';
  const arts=V19_FEATURE_ART[role]?.[page]||V17_FEATURE_ART[role]?.[page]||v18ArtGroup(role,page);
  return arts[Math.max(0,i)%arts.length];
};
workspaceThumb=function(i=0){return `assets/${workspaceImage(state.user?.role,state.portalPage,i)}`};

/* ====================== VANTRAS V20 PREMIUM PORTAL REDESIGN ====================== */
/* Student dashboard gets a new existing-project visual. Non-dashboard feature heroes
   retain their page-specific V19 artwork and are rendered in the integrated V20 card. */
ROLE_HERO_ART.student='managed/custom/feature-training-v18.jpg';

function v20HeroMeta(role,page){
  const p=String(page||'').toLowerCase();
  if(/assessment|exam|questionbank|result/.test(p))return [['assessment','Knowledge checks'],['results','Score insights'],['shield','Verified evidence']];
  if(/certificate|verification/.test(p))return [['certificate','Digital credential'],['shield','Secure verification'],['results','Completion proof']];
  if(/report|analytics|performance|progress/.test(p))return [['results','Live insights'],['report','Export ready'],['shield','Evidence based']];
  if(/resource|library|content/.test(p))return [['resource','Practical tools'],['learn','Curated learning'],['shield','Role relevant']];
  if(/session|calendar/.test(p))return [['live','Live delivery'],['calendar','Scheduled learning'],['users','Team ready']];
  if(/user|learner|team|employee|bulk|corporate/.test(p))return [['users','People management'],['results','Progress visible'],['shield','Role controlled']];
  if(/support|message|feedback|notification|request/.test(p))return [['support','Responsive support'],['bell','Smart updates'],['users','Connected teams']];
  if(/payment|refund|invoice|coupon/.test(p))return [['payment','Transaction view'],['report','Audit trail'],['shield','Controlled access']];
  if(/security|role|setting|audit|approval/.test(p))return [['shield','Governance'],['results','Operational control'],['report','Audit ready']];
  if(/course|browse|create|assignment|learningpath|profile/.test(p))return [['learn','Guided learning'],['courses','Structured content'],['results','Progress tracked']];
  return [['shield','Role-based'],['results','Live data'],['plus','Action ready']];
}

portalSectionVisual=function(role,p){
  if(p==='dashboard')return '';
  const v=VISUALS[role]?.[p];
  if(!v)return '';
  const meta=v20HeroMeta(role,p);
  return `<section class="portal-feature-hero-v20" style="--hero:url('assets/${v[0]}')">
    <div class="portal-feature-hero-copy-v20">
      <div class="v20-hero-top"><span class="eyebrow">${roleLabel(role)} Workspace</span><span class="visual-live-dot">Live</span></div>
      <h2>${v[1]}</h2>
      <p>${v[2]}</p>
      <div class="v20-hero-meta">${meta.map(x=>`<span><i>${icon(x[0])}</i><b>${x[1]}</b></span>`).join('')}</div>
      <div class="v20-hero-actions">
        <button class="btn btn-primary" onclick="openWorkspaceOverview()">${icon('dashboard')} Overview</button>
        <button class="btn btn-ghost" onclick="openWorkspaceInsights()">${icon('report')} Insights</button>
      </div>
    </div>
    <div class="v20-hero-art" aria-hidden="true"><img src="assets/${v[0]}" alt=""></div>
  </section>`;
};

const __portalHeroV20Base=portalHero;
portalHero=function(role){
  if(role!=='student')return __portalHeroV20Base(role);
  const h=HERO.student;
  const first=esc(state.user?.name?.split(' ')[0]||'Learner');
  const art=ROLE_HERO_ART.student;
  return `<section class="student-dashboard-hero-v20">
    <div class="student-dashboard-copy-v20">
      <div class="v20-hero-top"><span class="eyebrow">Student Learning Portal</span><span class="visual-live-dot">Active</span></div>
      <h1>${h[0]}, ${first}</h1>
      <p>${h[1]}</p>
      <div class="student-dashboard-pills-v20"><span>${icon('courses')} Continue your course</span><span>${icon('assessment')} Practice & assess</span><span>${icon('certificate')} Earn credentials</span></div>
      <div class="portal-hero-actions"><button class="btn btn-primary" onclick="openPage('mycourses')">${icon('learn')} Continue Learning</button><button class="btn btn-ghost" onclick="openPage('learningpath')">${icon('results')} Learning Path</button></div>
      <div class="student-dashboard-mini-v20"><div><b>52%</b><span>Overall progress</span></div><div><b>4</b><span>Active courses</span></div><div><b>84%</b><span>Recent score</span></div></div>
    </div>
    <div class="student-dashboard-art-v20"><img src="assets/${art}" alt="EHS learning dashboard"></div>
  </section>`;
};

/* Dashboard shortcut cards: unique images and richer text for each student action. */
const __dashboardVisualRibbonV20Base=dashboardVisualRibbon;
dashboardVisualRibbon=function(role){
  if(role!=='student')return __dashboardVisualRibbonV20Base(role);
  const data=[
    ['managed/custom/feature-learning-v18.jpg','Continue Learning','Resume your current modules','courseplayer'],
    ['managed/custom/feature-learning-v18.jpg','Assessment Practice','Check skills and improve weak areas','assessments'],
    ['managed/custom/resources-hero-v18.jpg','EHS Resources','Open practical templates and guides','resources']
  ];
  return `<div class="student-dashboard-ribbon-v20">${data.map((x,i)=>`<button onclick="openPage('${x[3]}')"><img src="assets/${x[0]}" alt=""><span><small>0${i+1}</small><b>${x[1]}</b><em>${x[2]}</em><strong>Open workspace →</strong></span></button>`).join('')}</div>`;
};

/* ====================== VANTRAS V23 CLEAN HERO + TEXT CARD SYSTEM ====================== */
ROLE_HERO_ART.student='managed/custom/feature-learning-v18.jpg';
ROLE_HERO_ART.admin='managed/custom/feature-support-v18.jpg';

function v23HeroPosition(scope,page='dashboard'){
  const p=String(page||'').toLowerCase();
  if(scope==='public'){
    return ({home:'center 42%',about:'center 38%',courses:'center 40%',corporate:'center 42%',resources:'center 46%',blog:'center 43%',verify:'center 47%',contact:'center 44%'})[p]||'center 42%';
  }
  if(/assessment|exam|question|result/.test(p))return 'center 44%';
  if(/certificate|verification|security/.test(p))return 'center 43%';
  if(/resource|library|content/.test(p))return 'center 47%';
  if(/session|calendar|live/.test(p))return 'center 45%';
  if(/report|analytics|performance|progress|payment|invoice|refund/.test(p))return 'center 40%';
  if(/support|message|feedback|notification|request/.test(p))return 'center 45%';
  if(/team|learner|employee|user|corporate|profile/.test(p))return 'center 43%';
  return 'center 42%';
}

function v23DashboardHero(role){
  const h=HERO[role]||HERO.student;
  const first=esc(state.user?.name?.split(' ')[0]||'User');
  const quick={student:'mycourses',trainer:'create',corporate:'assignment',admin:'users'}[role]||'dashboard';
  const insight={student:'learningpath',trainer:'reports',corporate:'reports',admin:'analytics'}[role]||'dashboard';
  const art=ROLE_HERO_ART[role]||'managed/hero-public.jpg';
  const title=role==='admin'?'Platform Control Center':h[0];
  const desc=role==='admin'?'Operate users, learning, assessments, credentials and platform governance with clear evidence.':h[1];
  return `<section class="portal-dashboard-hero-v23">
    <div class="portal-dashboard-copy-v23">
      <div class="v23-kicker"><span class="eyebrow">${roleLabel(role)} Portal</span><span class="v23-live">Active</span></div>
      <h1>${title}, ${first}</h1>
      <p>${desc}</p>
      <div class="v23-icon-points">
        <span>${icon('shield')} Secure workspace</span><span>${icon('results')} Live progress</span><span>${icon('certificate')} Verified outcomes</span>
      </div>
      <div class="v23-hero-actions"><button class="btn btn-primary" onclick="openPage('${quick}')">${icon('plus')} Quick Start</button><button class="btn btn-ghost" onclick="openPage('${insight}')">${icon('results')} View Insights</button></div>
    </div>
    <div class="portal-dashboard-media-v23"><img src="assets/${art}" style="object-position:${v23HeroPosition(role,'dashboard')}" alt="${roleLabel(role)} dashboard"></div>
  </section>`;
}
portalHero=v23DashboardHero;

portalSectionVisual=function(role,p){
  if(p==='dashboard')return '';
  const v=VISUALS[role]?.[p];
  if(!v)return '';
  const meta=v20HeroMeta(role,p);
  return `<section class="portal-feature-hero-v23">
    <div class="portal-feature-copy-v23">
      <div class="v23-kicker"><span class="eyebrow">${roleLabel(role)} Workspace</span><span class="v23-live">Live</span></div>
      <h2>${v[1]}</h2><p>${v[2]}</p>
      <div class="v23-icon-points">${meta.map(x=>`<span>${icon(x[0])} ${x[1]}</span>`).join('')}</div>
      <div class="v23-hero-actions"><button class="btn btn-primary" onclick="openWorkspaceOverview()">${icon('dashboard')} Overview</button><button class="btn btn-ghost" onclick="openWorkspaceInsights()">${icon('report')} Insights</button></div>
    </div>
    <div class="portal-feature-media-v23"><img src="assets/${v[0]}" style="object-position:${v23HeroPosition(role,p)}" alt="${esc(v[1])}"></div>
  </section>`;
};

const V23_PUBLIC_HERO={
  home:{eyebrow:'Professional EHS Learning',title:'Learn safety. Lead with confidence.',desc:'Industry-focused Environment, Health & Safety learning for professionals, students and corporate teams.',img:'managed/hero-public.jpg',actions:`<button class="btn btn-primary btn-lg" onclick="goPublic('courses')">Explore Courses →</button><button class="btn btn-ghost btn-lg" onclick="goPublic('corporate')">Corporate Training</button>`,points:[['learn','Structured learning'],['assessment','Practical assessments'],['certificate','Verified certificates']]},
  about:{eyebrow:'About Vantras EHS Academy',title:'Professional EHS learning built for real workplaces.',desc:'A connected academy for learning, assessments, live training and trusted credentials.',img:'managed/custom/about-hero-v18.jpg',actions:`<button class="btn btn-primary" onclick="goPublic('courses')">Explore Courses →</button>`,points:[['shield','Workplace focused'],['users','For individuals & teams'],['certificate','Credential ready']]},
  courses:{eyebrow:'Course Catalogue',title:'Build your next EHS capability.',desc:'Search professional courses by category, level and learning need.',img:'managed/custom/feature-training-v18.jpg',actions:`<button class="btn btn-primary" onclick="document.getElementById('pubSearch')?.focus()">Browse Catalogue →</button>`,points:[['courses','Industry relevant'],['learn','Flexible learning'],['certificate','Verifiable outcomes']]},
  corporate:{eyebrow:'Corporate Training',title:'Build a safer, stronger workforce.',desc:'Centralize workforce learning, assignments, assessments, progress and compliance evidence.',img:'managed/custom/corporate-hero-v18.jpg',actions:`<button class="btn btn-primary" onclick="showAuth('login','corporate')">Open Corporate Portal</button><button class="btn btn-ghost" onclick="goPublic('contact')">Request Proposal</button>`,points:[['users','Team management'],['results','Measurable progress'],['report','Audit-ready reports']]},
  resources:{eyebrow:'EHS Resource Library',title:'Practical tools for everyday safety work.',desc:'Templates, checklists, guides and reference resources for students and professionals.',img:'managed/custom/resources-hero-v18.jpg',actions:`<button class="btn btn-primary" onclick="document.getElementById('publicResources')?.scrollIntoView({behavior:'smooth'})">Browse Resources →</button>`,points:[['resource','Practical tools'],['shield','Trusted content'],['learn','Easy reference']]},
  blog:{eyebrow:'Knowledge Centre',title:'Insights for safer, healthier workplaces.',desc:'Practical articles on risk, audits, incidents, compliance and safety leadership.',img:'managed/custom/blog-hero-v18.jpg',actions:`<button class="btn btn-primary" onclick="document.querySelector('.section.white')?.scrollIntoView({behavior:'smooth'})">Read Articles →</button>`,points:[['resource','Practical insights'],['shield','EHS focused'],['users','For working professionals']]},
  verify:{eyebrow:'Certificate Verification',title:'Check a Vantras digital credential.',desc:'Confirm certificate authenticity using the credential number or verification workflow.',img:'managed/hero-admin.jpg',actions:`<button class="btn btn-primary" onclick="document.getElementById('certSearch')?.focus()">Verify Credential →</button>`,points:[['certificate','Official credential'],['shield','Secure verification'],['results','Instant status']]},
  contact:{eyebrow:'Contact Vantras',title:'Tell us how we can help.',desc:'Connect with our team for courses, corporate training, certificates, support or partnerships.',img:'managed/custom/feature-support-v18.jpg',actions:`<button class="btn btn-primary" onclick="document.querySelector('.section.white')?.scrollIntoView({behavior:'smooth'})">Send an Enquiry →</button>`,points:[['support','Responsive support'],['users','Corporate assistance'],['resource','Course guidance']]}
};
function publicHeroV23(page){
  const d=V23_PUBLIC_HERO[page]; if(!d)return '';
  return `<section class="public-hero-v23 public-hero-${page}-v23"><div class="public-hero-copy-v23"><div class="eyebrow">${d.eyebrow}</div><h1>${d.title}</h1><p>${d.desc}</p><div class="v23-icon-points">${d.points.map(x=>`<span>${icon(x[0])} ${x[1]}</span>`).join('')}</div><div class="v23-hero-actions">${d.actions}</div></div><div class="public-hero-media-v23"><img src="assets/${d.img}" style="object-position:${v23HeroPosition('public',page)}" alt="${d.eyebrow}"></div></section>`;
}
const __publicContentV23Base=publicContent;
publicContent=function(p){
  let out=__publicContentV23Base(p);
  if(!V23_PUBLIC_HERO[p])return out;
  if(p==='home')return out.replace(/<section class="public-hero">[\s\S]*?<\/section>/,publicHeroV23(p));
  return out.replace(/<section class="public-page-hero[^\"]*">[\s\S]*?<\/section>/,publicHeroV23(p));
};

/* ====================== STUDENT DASHBOARD AI COPILOT ====================== */
state.agenticHistory = state.agenticHistory || {};
state.agenticDockOpen = true;

function agenticPageLabel(){
  const role=state.user?.role||'student';
  return NAV?.[role]?.find(x=>x[0]===state.portalPage)?.[2] || String(state.portalPage||'Dashboard').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

function agenticActionsFor(){
  return [['summary','Summarize my dashboard'],['next','Recommend next step'],['plan','Build a learning plan'],['ask','Ask anything']];
}

function agenticPromptFor(action){
  const label=agenticPageLabel();
  const role=roleLabel(state.user?.role||'student');
  const prompts={
    explain:`Explain the ${label} workspace completely for a ${role}. Explain what the important sections mean, how to use them, and what to pay attention to.`,
    summary:`Summarize the most important information currently visible in ${label}. Highlight status, priorities, useful patterns and anything needing attention.`,
    next:`Based on the current ${label} workspace and my ${role} role, recommend the best next actions in priority order and explain why each action matters.`,
    plan:`Create a practical step-by-step plan based on the current ${label} workspace. Include priorities, sequence and measurable outcomes.`,
    draft:`Create a professional draft relevant to the current ${label} workspace using the visible context. Make it ready to edit and use.`,
    quality:`Review the visible ${label} content for quality, completeness, clarity and practical usability. Point out gaps and suggest improvements.`,
    insights:`Analyze the visible ${label} information and identify the most useful trends, risks, gaps and opportunities. Explain the reasoning clearly.`,
    ask:''
  };
  return prompts[action]||'';
}

function collectAgenticContext(){
  const root=document.getElementById('portalContent');
  if(!root)return '';
  const clone=root.cloneNode(true);
  clone.querySelectorAll('script,style,input,textarea,select,button').forEach(x=>{
    if(x.tagName==='BUTTON') x.replaceWith(document.createTextNode(' '+(x.innerText||'')+' '));
    else x.remove();
  });
  return String(clone.innerText||clone.textContent||'').replace(/\s+/g,' ').trim().slice(0,6500);
}

function agenticThreadKey(){return `${state.user?.role||'user'}:${state.portalPage||'dashboard'}`}
function agenticThread(){
  const key=agenticThreadKey();
  if(!state.agenticHistory[key]) state.agenticHistory[key]=[];
  return state.agenticHistory[key];
}

function agenticMessagesHtml(){
  const rows=agenticThread();
  if(!rows.length) return `<div class="agentic-empty"><span>${icon('ai')}</span><b>AI is ready for this workspace</b><p>Ask a question or use one of the context-aware actions below. The copilot automatically understands your current role and page.</p></div>`;
  return rows.map(m=>`<div class="agentic-msg ${m.role}"><span>${m.role==='user'?'You':'AI Copilot'}</span><div>${esc(m.content).replace(/\n/g,'<br>')}</div></div>`).join('');
}

function agenticDockHtml(){
  const role=state.user?.role||'student', page=state.portalPage||'dashboard';
  const actions=agenticActionsFor(role,page);
  return `<aside class="agentic-dock ${state.agenticDockOpen?'open':'collapsed'}" id="agenticAiDock">
    <div class="agentic-head"><div><span class="agentic-logo">${icon('ai')}</span><span><b>Vantras AI Copilot</b><small>${esc(agenticPageLabel())} • ${esc(roleLabel(role))}</small></span></div><button class="iconbtn" onclick="toggleAgenticPanel()" title="Toggle AI Copilot">${state.agenticDockOpen?'→':'✦'}</button></div>
    <div class="agentic-body">
      <div class="agentic-context-chip"><i></i><span>Context-aware for this page</span></div>
      <div class="agentic-actions">${actions.map(a=>`<button onclick="runAgenticAction('${a[0]}')">${icon(a[0]==='summary'?'report':a[0]==='next'?'results':a[0]==='draft'?'message':a[0]==='quality'?'shield':a[0]==='plan'?'learn':'ai')}<span>${esc(a[1])}</span></button>`).join('')}</div>
      <div class="agentic-messages" id="agenticMessages">${agenticMessagesHtml()}</div>
      <div class="agentic-compose"><textarea id="agenticInput" rows="2" placeholder="Ask AI about this workspace or anything else..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAgenticQuestion()}"></textarea><button class="btn btn-primary" onclick="sendAgenticQuestion()">${icon('ai')} Ask</button></div>
    </div>
  </aside>`;
}

function removeAgenticAiDock(){
  document.querySelectorAll('.agentic-hero-btn').forEach(x=>x.remove());
  const shell=document.querySelector('.agentic-workspace-shell');
  if(shell){
    const pc=shell.querySelector('#portalContent');
    if(pc && shell.parentNode){shell.parentNode.insertBefore(pc,shell);}
    shell.remove();
  }else{
    document.getElementById('agenticAiDock')?.remove();
  }
}

function ensureAgenticAiDock(){
  if(!state.user || state.user.role!=='student' || state.portalPage!=='dashboard'){
    removeAgenticAiDock();
    return;
  }
  const pc=document.getElementById('portalContent');
  if(!pc)return;
  let shell=pc.closest('.agentic-workspace-shell');
  if(!shell){
    shell=document.createElement('div');
    shell.className='agentic-workspace-shell dashboard-agentic-shell';
    pc.parentNode.insertBefore(shell,pc);
    shell.appendChild(pc);
  }else{
    shell.classList.add('dashboard-agentic-shell');
  }
  let dock=document.getElementById('agenticAiDock');
  if(!dock){shell.insertAdjacentHTML('beforeend',agenticDockHtml());dock=document.getElementById('agenticAiDock')}
  else dock.outerHTML=agenticDockHtml();
  shell.classList.toggle('agentic-collapsed',!state.agenticDockOpen);

  const heroActions=document.querySelector('.v23-hero-actions,.portal-hero-actions,.v20-hero-actions');
  if(heroActions && !heroActions.querySelector('.agentic-hero-btn')){
    heroActions.insertAdjacentHTML('beforeend',`<button class="btn btn-agentic agentic-hero-btn" onclick="toggleAgenticPanel(true)">${icon('ai')} AI Copilot</button>`);
  }
  requestAnimationFrame(()=>{const m=document.getElementById('agenticMessages');if(m)m.scrollTop=m.scrollHeight});
}

function toggleAgenticPanel(forceOpen=false){
  state.agenticDockOpen=forceOpen?true:!state.agenticDockOpen;
  const shell=document.querySelector('.agentic-workspace-shell');
  const dock=document.getElementById('agenticAiDock');
  if(!shell||!dock){ensureAgenticAiDock();return}
  shell.classList.toggle('agentic-collapsed',!state.agenticDockOpen);
  dock.classList.toggle('open',state.agenticDockOpen);
  dock.classList.toggle('collapsed',!state.agenticDockOpen);
  const body=dock.querySelector('.agentic-body'); if(body)body.style.display=state.agenticDockOpen?'flex':'none';
  const close=dock.querySelector('.agentic-head .iconbtn');if(close)close.textContent=state.agenticDockOpen?'→':'✦';
}

async function runAgenticAction(action){
  if(action==='ask'){document.getElementById('agenticInput')?.focus();return}
  const q=agenticPromptFor(action);
  await sendAgenticQuestion(q,action);
}

async function sendAgenticQuestion(preset='',action='ask'){
  const input=document.getElementById('agenticInput');
  const q=(preset||input?.value||'').trim();
  if(!q)return;
  const history=agenticThread();
  history.push({role:'user',content:q});
  if(input)input.value='';
  ensureAgenticAiDock();
  const box=document.getElementById('agenticMessages');
  const pendingId='agentic-pending-'+Date.now();
  box?.insertAdjacentHTML('beforeend',`<div class="agentic-msg assistant pending" id="${pendingId}"><span>AI Copilot</span><div>Analyzing this workspace…</div></div>`);
  if(box)box.scrollTop=box.scrollHeight;
  try{
    const prior=history.slice(-10,-1).map(x=>({role:x.role,content:x.content}));
    const d=await api('/api/ai/agent',{method:'POST',body:JSON.stringify({question:q,action,page:state.portalPage,page_label:agenticPageLabel(),visible_context:collectAgenticContext(),history:prior})});
    history.push({role:'assistant',content:d.answer||'No answer was returned.'});
    const pending=document.getElementById(pendingId);
    if(pending)pending.outerHTML=`<div class="agentic-msg assistant"><span>AI Copilot</span><div>${esc(d.answer||'No answer was returned.').replace(/\n/g,'<br>')}</div></div>`;
  }catch(e){
    const msg='The AI Copilot is temporarily unavailable. Please try again.';
    history.push({role:'assistant',content:msg});
    const pending=document.getElementById(pendingId);if(pending)pending.outerHTML=`<div class="agentic-msg assistant"><span>AI Copilot</span><div>${msg}</div></div>`;
  }
  const fresh=document.getElementById('agenticMessages');if(fresh)fresh.scrollTop=fresh.scrollHeight;
}

const __loadPortalPageAgenticBase=loadPortalPage;
loadPortalPage=async function(role,p){
  const out=await __loadPortalPageAgenticBase(role,p);
  requestAnimationFrame(ensureAgenticAiDock);
  setTimeout(ensureAgenticAiDock,80);
  return out;
};

const __toggleChatBeforeAgentic=toggleChat;
toggleChat=function(){
  if(state.user){if(state.user.role==='student'&&state.portalPage==='dashboard')toggleAgenticPanel();return}
  return __toggleChatBeforeAgentic();
};
