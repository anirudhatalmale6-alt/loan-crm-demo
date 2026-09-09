/* ==========================================================================
   Loan Team CRM — clickable demo
   Front-end only. Data lives in this browser (localStorage). No server calls.
   ========================================================================== */
'use strict';

/* ----------------------------- configuration ---------------------------- */
const STAGES = [
  { id:'new',            label:'New Lead',           color:'#4338ca' },
  { id:'contacted',      label:'Contacted',          color:'#1f6feb' },
  { id:'docs_pending',   label:'Documents Pending',  color:'#b45309' },
  { id:'docs_received',  label:'Documents Received', color:'#a16207' },
  { id:'under_review',   label:'Under Review',       color:'#7e22ce' },
  { id:'submitted',      label:'Submitted to Lender',color:'#0369a1' },
  { id:'approved',       label:'Approved',           color:'#0d9488' },
  { id:'disbursed',      label:'Disbursed',          color:'#15803d' },
  { id:'rejected',       label:'Rejected',           color:'#b91c1c' },
  { id:'lost',           label:'Lost',               color:'#64748b' }
];
const STAGE = Object.fromEntries(STAGES.map(s => [s.id, s]));
const WON = ['disbursed'], DEAD = ['rejected','lost'];

const PRODUCTS = {
  'Home Loan':              ['PAN Card','Aadhaar','Income Proof','Bank Statement (6 months)','Property Papers','Photograph','Employment Proof'],
  'Personal Loan':          ['PAN Card','Aadhaar','Salary Slips','Bank Statement (3 months)','Photograph'],
  'Business Loan':          ['PAN Card','Aadhaar','GST Returns','ITR (2 years)','Bank Statement (12 months)','Business Proof'],
  'Vehicle Loan':           ['PAN Card','Aadhaar','Income Proof','Bank Statement (3 months)','Driving Licence','Vehicle Quotation'],
  'Loan Against Property':  ['PAN Card','Aadhaar','Income Proof','ITR (2 years)','Property Papers','Bank Statement (6 months)']
};
const PRODUCT_NAMES = Object.keys(PRODUCTS);
const SOURCES = ['Website','Facebook','Google Ads','Referral','Walk-in','Cold Call','Partner / DSA'];
const CITIES  = ['Pune','Mumbai','Bengaluru','Hyderabad','Delhi','Ahmedabad','Chennai','Jaipur','Indore','Nagpur'];
const EMPLOY  = ['Salaried','Self-employed','Business Owner','Professional'];

const USERS = [
  { id:'u1', name:'Rahul Sharma', role:'admin',   title:'Admin / Owner',   color:'#0a1a33' },
  { id:'u2', name:'Priya Nair',   role:'manager', title:'Team Manager',    color:'#7e22ce' },
  { id:'u3', name:'Amit Verma',   role:'officer', title:'Loan Officer',    color:'#1f6feb' },
  { id:'u4', name:'Sneha Iyer',   role:'officer', title:'Loan Officer',    color:'#0d9488' },
  { id:'u5', name:'Vikram Singh', role:'officer', title:'Loan Officer',    color:'#d97706' }
];
const U = Object.fromEntries(USERS.map(u => [u.id, u]));
const OFFICERS = USERS.filter(u => u.role === 'officer');

const FIRST = ['Rajesh','Anita','Suresh','Kavita','Manoj','Deepa','Arjun','Meera','Sanjay','Pooja',
               'Nikhil','Rekha','Vishal','Anjali','Ramesh','Swati','Karan','Neha','Ajay','Divya',
               'Prakash','Shalini','Gaurav','Sunita','Rohit','Lakshmi'];
const LAST  = ['Patil','Deshmukh','Kulkarni','Joshi','Mehta','Shah','Reddy','Nair','Gupta','Agarwal',
               'Chauhan','Bhatt','Rao','Malhotra','Sinha','Kapoor','Pandey','Bose','Menon','Saxena'];

const KEY = 'loancrm_demo_v1';

/* ------------------------------ tiny helpers ---------------------------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = t => String(t == null ? '' : t)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

// deterministic RNG so every visitor sees the same demo data
let _seed = 20260909;
const rnd  = () => (_seed = (_seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];
const int  = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const money = n => '₹' + Number(n).toLocaleString('en-IN');
const initials = n => n.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
const DAY = 86400000;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };

function ago(ts){
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  const d = Math.floor(s/86400);
  if (d === 1) return 'yesterday';
  if (d < 30) return d + ' days ago';
  return new Date(ts).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}
function dateLabel(ts){
  const diff = Math.round((ts - today0()) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return Math.abs(diff) + ' days overdue';
  return 'in ' + diff + ' days';
}
function toast(msg){
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600);
}

/* ------------------------------- app state ------------------------------ */
let DB = null;      // { leads, notifications }
let ME = null;      // current user object
let route = 'dashboard';
let openLeadId = null;
let filters = { stage:'', owner:'', product:'', source:'', q:'' };

/* ------------------------------ seed the data --------------------------- */
function buildSeed(){
  const leads = [];
  const now = Date.now();
  const dist = ['new','new','new','contacted','contacted','contacted','docs_pending','docs_pending',
                'docs_pending','docs_received','docs_received','under_review','under_review',
                'submitted','submitted','approved','approved','disbursed','disbursed','disbursed',
                'rejected','lost','contacted','docs_pending','under_review','new'];

  dist.forEach((stage, i) => {
    const name    = pick(FIRST) + ' ' + pick(LAST);
    const product = pick(PRODUCT_NAMES);
    const owner   = pick(OFFICERS).id;
    const created = now - int(1, 55) * DAY - int(0, 20) * 3600000;
    const amount  = [300000,500000,750000,1000000,1500000,2500000,4000000,6000000][int(0,7)];
    const checklist = PRODUCTS[product];

    // how many documents are in, based on how far the lead has travelled
    const idx = STAGES.findIndex(s => s.id === stage);
    let got = 0;
    if (stage === 'docs_pending') got = int(1, Math.max(1, checklist.length - 2));
    else if (idx >= 3 && !DEAD.includes(stage)) got = checklist.length;
    else if (stage === 'contacted') got = int(0, 1);
    else if (DEAD.includes(stage)) got = int(1, checklist.length);
    const docs = checklist.slice(0, got);

    // follow-up: some due today, some overdue, some upcoming
    let follow = null;
    if (!DEAD.includes(stage) && stage !== 'disbursed') {
      const roll = int(1, 10);
      if (roll <= 2)      follow = today0() - int(1,4) * DAY;   // overdue
      else if (roll <= 5) follow = today0();                     // due today
      else                follow = today0() + int(1,9) * DAY;    // upcoming
    }

    const lead = {
      id: 'LD' + String(1041 + i),
      name, phone: '+91 9' + int(100000000, 999999999),
      email: name.toLowerCase().replace(/ /g,'.') + '@example.com',
      city: pick(CITIES), product, amount,
      tenure: [5,7,10,15,20][int(0,4)],
      income: [35000,50000,65000,80000,120000,180000][int(0,5)],
      employment: pick(EMPLOY),
      source: pick(SOURCES),
      stage, owner, createdAt: created,
      updatedAt: created + int(1, 20) * 3600000,
      followUp: follow,
      checklist, docs,
      priority: ['high','med','med','low'][int(0,3)],
      notes: [], activity: []
    };

    // build a plausible history
    lead.activity.push({ t:'created', text:'Lead created from ' + lead.source, by:'System', at:created });
    const path = STAGES.slice(0, idx + 1).map(s => s.id);
    let stamp = created;
    path.slice(1).forEach(st => {
      stamp += int(6, 60) * 3600000;
      if (stamp > now) stamp = now - int(1,6) * 3600000;
      lead.activity.push({ t:'stage', text:'Stage moved to ' + STAGE[st].label, by:U[owner].name, at:stamp });
    });
    if (got) {
      lead.activity.push({ t:'doc', text:got + ' document' + (got>1?'s':'') + ' uploaded', by:U[owner].name, at:stamp + 3600000 });
    }
    if (idx >= 1) {
      const calls = ['Called — customer interested, sending details','Called — asked to ring back after 6pm',
                     'Spoke to customer, explained the rate and EMI','Follow-up call done, documents promised this week'];
      lead.activity.push({ t:'note', text:pick(calls), by:U[owner].name, at:stamp + 5400000 });
      lead.notes.push({ text:pick(calls), by:U[owner].name, at:stamp + 5400000 });
    }
    lead.activity.sort((a,b) => b.at - a.at);
    leads.push(lead);
  });

  // notifications derived from the freshest leads
  const notes = [];
  const recent = leads.slice().sort((a,b) => b.updatedAt - a.updatedAt);
  const mk = (type, icon, text, lead, at, to) =>
    notes.push({ id:'n'+notes.length, type, icon, text, leadId:lead.id, at, read:false, to });

  recent.slice(0,3).forEach((l,i) =>
    mk('stage','↗', '<b>'+esc(l.name)+'</b> moved to <b>'+STAGE[l.stage].label+'</b>', l, Date.now()-(i+1)*2400000, l.owner));
  leads.filter(l => l.followUp !== null && l.followUp <= today0()).slice(0,3).forEach((l,i) =>
    mk('due','⏰', 'Follow-up due for <b>'+esc(l.name)+'</b>', l, Date.now()-(i+1)*5400000, l.owner));
  leads.filter(l => l.stage === 'docs_pending').slice(0,2).forEach((l,i) =>
    mk('doc','📄', 'Documents still pending from <b>'+esc(l.name)+'</b>', l, Date.now()-(i+2)*9000000, l.owner));
  const stale = leads.filter(l => !DEAD.includes(l.stage) && (Date.now()-l.updatedAt) > 12*DAY).slice(0,2);
  stale.forEach((l,i) =>
    mk('sla','⚠️', '<b>'+esc(l.name)+'</b> has had no activity for '+Math.floor((Date.now()-l.updatedAt)/DAY)+' days', l, Date.now()-(i+3)*11000000, l.owner));
  leads.slice(0,2).forEach((l,i) =>
    mk('assign','👤', 'New lead <b>'+esc(l.name)+'</b> assigned to you', l, Date.now()-(i+4)*13000000, l.owner));

  notes.sort((a,b) => b.at - a.at);
  return { leads, notifications: notes };
}

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { DB = JSON.parse(raw); return; }
  } catch(e){ /* fall through to a fresh seed */ }
  DB = buildSeed();
  save();
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch(e){ /* private mode — demo still works in memory */ }
}
function resetDemo(){
  try { localStorage.removeItem(KEY); } catch(e){}
  _seed = 20260909;
  DB = buildSeed(); save();
  toast('Demo data reset');
  render();
}

/* --------------------------- role-aware queries ------------------------- */
// An officer sees only their own leads; admin and manager see everything.
const visibleLeads = () =>
  ME.role === 'officer' ? DB.leads.filter(l => l.owner === ME.id) : DB.leads.slice();

const myNotifications = () =>
  DB.notifications.filter(n => ME.role === 'officer' ? n.to === ME.id : true);

function filtered(){
  const q = filters.q.trim().toLowerCase();
  return visibleLeads().filter(l =>
    (!filters.stage   || l.stage   === filters.stage) &&
    (!filters.owner   || l.owner   === filters.owner) &&
    (!filters.product || l.product === filters.product) &&
    (!filters.source  || l.source  === filters.source) &&
    (!q || (l.name+' '+l.phone+' '+l.email+' '+l.id).toLowerCase().includes(q))
  ).sort((a,b) => b.updatedAt - a.updatedAt);
}

/* -------------------------------- actions ------------------------------- */
function logActivity(lead, type, text){
  lead.activity.unshift({ t:type, text, by:ME.name, at:Date.now() });
  lead.updatedAt = Date.now();
}
function notify(type, icon, text, lead){
  DB.notifications.unshift({
    id:'n'+Date.now(), type, icon, text, leadId:lead.id, at:Date.now(), read:false, to:lead.owner
  });
}

function moveStage(id, stageId){
  const l = DB.leads.find(x => x.id === id);
  if (!l || l.stage === stageId) return;
  const from = STAGE[l.stage].label, to = STAGE[stageId].label;
  l.stage = stageId;
  if (DEAD.includes(stageId) || stageId === 'disbursed') l.followUp = null;
  logActivity(l, 'stage', 'Stage moved from ' + from + ' to ' + to);
  notify('stage','↗','<b>'+esc(l.name)+'</b> moved to <b>'+to+'</b>', l);
  save(); render();
  toast(l.name + ' → ' + to + '  ·  notification sent');
}
function addNote(id, text){
  const l = DB.leads.find(x => x.id === id);
  if (!l || !text.trim()) return;
  l.notes.unshift({ text:text.trim(), by:ME.name, at:Date.now() });
  logActivity(l, 'note', text.trim());
  save(); render();
  toast('Note added to the lead timeline');
}
function toggleDoc(id, doc){
  const l = DB.leads.find(x => x.id === id);
  if (!l) return;
  const i = l.docs.indexOf(doc);
  if (i >= 0) { l.docs.splice(i,1); logActivity(l,'doc', doc + ' removed'); }
  else {
    l.docs.push(doc);
    logActivity(l,'doc', doc + ' uploaded');
    if (l.docs.length === l.checklist.length){
      notify('doc','📄','Document checklist complete for <b>'+esc(l.name)+'</b>', l);
      toast('All documents received — notification sent');
    } else toast(doc + ' marked as received');
  }
  save(); render();
}
function createLead(d){
  const checklist = PRODUCTS[d.product];
  const lead = {
    id: 'LD' + (1041 + DB.leads.length),
    name:d.name, phone:d.phone, email:d.email, city:d.city,
    product:d.product, amount:Number(d.amount)||0, tenure:Number(d.tenure)||10,
    income:Number(d.income)||0, employment:d.employment, source:d.source,
    stage:'new', owner:d.owner, createdAt:Date.now(), updatedAt:Date.now(),
    followUp: today0() + DAY, checklist, docs:[], priority:d.priority,
    notes:[], activity:[{ t:'created', text:'Lead created manually from ' + d.source, by:ME.name, at:Date.now() }]
  };
  DB.leads.unshift(lead);
  notify('assign','👤','New lead <b>'+esc(lead.name)+'</b> assigned to you', lead);
  save();
  toast('Lead created and assigned to ' + U[d.owner].name);
  go('lead', lead.id);
}

/* -------------------------------- routing -------------------------------- */
const NAV = [
  { id:'dashboard',     label:'Dashboard',     icon:'M3 12h5l2 6 4-14 2 8h5' },
  { id:'leads',         label:'All Leads',     icon:'M3 5h18M3 12h18M3 19h18' },
  { id:'pipeline',      label:'Pipeline',      icon:'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v6h-4z' },
  { id:'notifications', label:'Notifications', icon:'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' },
  { id:'reports',       label:'Reports',       icon:'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { id:'settings',      label:'Settings',      icon:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 007 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H1a2 2 0 110-4h.1A1.6 1.6 0 002.6 9a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H7a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z' }
];

function go(r, id){
  route = r; openLeadId = id || null;
  if (r === 'notifications') { myNotifications().forEach(n => n.read = true); save(); }
  closeSidebar();
  render();
  window.scrollTo(0,0);
}

/* -------------------------------- rendering ------------------------------ */
function renderNav(){
  const unread = myNotifications().filter(n => !n.read).length;
  $('#sbNav').innerHTML =
    '<div class="sb-sec">Workspace</div>' +
    NAV.map(n => {
      const cnt = n.id === 'notifications' && unread
        ? '<span class="cnt">' + unread + '</span>' : '';
      return '<div class="sb-link ' + (route === n.id ? 'on' : '') + '" data-go="' + n.id + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + n.icon + '"/></svg>' +
        '<span>' + n.label + '</span>' + cnt + '</div>';
    }).join('');

  $('#meAv').textContent = initials(ME.name);
  $('#meAv').style.background = ME.color;
  $('#meNm').innerHTML = esc(ME.name) + '<small>' + esc(ME.title) + '</small>';
  const dot = $('#bellDot');
  dot.textContent = unread;
  dot.classList.toggle('hide', unread === 0);
}

function avatar(userId, cls){
  const u = U[userId];
  return '<div class="av-sm ' + (cls||'') + '" style="background:' + u.color + '" title="' + esc(u.name) + '">' + initials(u.name) + '</div>';
}
// borrower initials, tinted with the owning officer's colour
function leadAv(l){
  return '<div class="av-sm" style="background:' + U[l.owner].color + '" title="Owned by ' +
    esc(U[l.owner].name) + '">' + initials(l.name) + '</div>';
}
const stagePill = s => '<span class="pill s-' + s + '">' + STAGE[s].label + '</span>';

/* ---- dashboard ---- */
function viewDashboard(){
  const ls = visibleLeads();
  const open = ls.filter(l => !DEAD.includes(l.stage) && l.stage !== 'disbursed');
  const disbursed = ls.filter(l => l.stage === 'disbursed');
  const value = disbursed.reduce((s,l) => s + l.amount, 0);
  const conv = ls.length ? Math.round(disbursed.length / ls.length * 100) : 0;
  const dueList = ls.filter(l => l.followUp !== null && l.followUp <= today0())
                    .sort((a,b) => a.followUp - b.followUp);
  const stale = ls.filter(l => !DEAD.includes(l.stage) && l.stage !== 'disbursed'
                    && (Date.now() - l.updatedAt) > 12*DAY)
                  .sort((a,b) => a.updatedAt - b.updatedAt);

  const row = l =>
    '<tr data-lead="' + l.id + '">' +
      '<td><div class="nm-cell">' + leadAv(l) +
        '<div class="n">' + esc(l.name) + '<small>' + l.id + ' · ' + esc(l.product) + '</small></div></div></td>' +
      '<td>' + money(l.amount) + '</td>' +
      '<td>' + stagePill(l.stage) + '</td>' +
      '<td style="color:var(--muted)">' + ago(l.updatedAt) + '</td>' +
    '</tr>';

  return '' +
  '<div class="grid stats">' +
    '<div class="stat b"><div class="lb">Open Leads</div><div class="vl">' + open.length + '</div>' +
      '<div class="sc">out of ' + ls.length + ' total</div></div>' +
    '<div class="stat w"><div class="lb">Follow-ups Due</div><div class="vl">' + dueList.length + '</div>' +
      '<div class="sc">' + (dueList.length ? 'needs attention today' : 'all caught up') + '</div></div>' +
    '<div class="stat g"><div class="lb">Disbursed</div><div class="vl">' + disbursed.length + '</div>' +
      '<div class="sc"><b>' + conv + '%</b> conversion</div></div>' +
    '<div class="stat t"><div class="lb">Disbursed Value</div><div class="vl">' + money(value) + '</div>' +
      '<div class="sc">closed business</div></div>' +
  '</div>' +

  '<div class="two-col">' +
    '<div class="card">' +
      '<div class="card-h"><h3>Recently updated</h3>' +
        '<button class="btn sm ghost" data-go="leads">View all</button></div>' +
      '<div class="tbl-wrap"><table><thead><tr><th>Lead</th><th>Amount</th><th>Stage</th><th>Updated</th></tr></thead>' +
      '<tbody>' + ls.slice().sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,7).map(row).join('') + '</tbody></table></div>' +
    '</div>' +

    '<div>' +
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="card-h"><h3>Follow-ups due</h3></div>' +
        '<div class="card-b" style="padding:6px 16px 12px">' +
          (dueList.length ? dueList.slice(0,5).map(l =>
            '<div class="lb-row" data-lead="' + l.id + '" style="cursor:pointer">' +
              leadAv(l) +
              '<div><b style="font-size:13px">' + esc(l.name) + '</b>' +
              '<div style="font-size:11.5px;color:var(--muted)">' + esc(l.product) + '</div></div>' +
              '<div class="mt"><b style="color:' + (l.followUp < today0() ? 'var(--bad)' : 'var(--warn)') + ';font-size:12px">' +
                dateLabel(l.followUp) + '</b></div>' +
            '</div>').join('')
            : '<div class="empty" style="padding:22px"><h4>Nothing due</h4>You are all caught up.</div>') +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-h"><h3>Needs attention</h3></div>' +
        '<div class="card-b" style="padding:6px 16px 12px">' +
          (stale.length ? stale.slice(0,4).map(l =>
            '<div class="lb-row" data-lead="' + l.id + '" style="cursor:pointer">' +
              '<div class="rk" style="background:#fee2e2;color:#b91c1c">!</div>' +
              '<div><b style="font-size:13px">' + esc(l.name) + '</b>' +
              '<div style="font-size:11.5px;color:var(--muted)">' + STAGE[l.stage].label + '</div></div>' +
              '<div class="mt"><b style="font-size:12px;color:var(--bad)">' +
                Math.floor((Date.now()-l.updatedAt)/DAY) + 'd idle</b></div>' +
            '</div>').join('')
            : '<div class="empty" style="padding:22px"><h4>All healthy</h4>No stale leads.</div>') +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ---- leads list ---- */
function viewLeads(){
  const rows = filtered();
  const opt = (v,l,sel) => '<option value="' + v + '"' + (sel===v?' selected':'') + '>' + l + '</option>';

  const bar =
    '<div class="filters">' +
      '<select data-f="stage">' + opt('','All stages',filters.stage) +
        STAGES.map(s => opt(s.id, s.label, filters.stage)).join('') + '</select>' +
      (ME.role !== 'officer'
        ? '<select data-f="owner">' + opt('','All officers',filters.owner) +
          OFFICERS.map(u => opt(u.id, u.name, filters.owner)).join('') + '</select>' : '') +
      '<select data-f="product">' + opt('','All loan types',filters.product) +
        PRODUCT_NAMES.map(p => opt(p, p, filters.product)).join('') + '</select>' +
      '<select data-f="source">' + opt('','All sources',filters.source) +
        SOURCES.map(s => opt(s, s, filters.source)).join('') + '</select>' +
      (Object.values(filters).some(Boolean)
        ? '<button class="btn sm ghost" id="clearF">Clear</button>' : '') +
      '<span class="count-note">' + rows.length + ' lead' + (rows.length===1?'':'s') + '</span>' +
    '</div>';

  if (!rows.length) return bar +
    '<div class="card"><div class="empty"><h4>No leads match</h4>Try clearing the filters.</div></div>';

  return bar + '<div class="card"><div class="tbl-wrap"><table>' +
    '<thead><tr><th>Lead</th><th>Loan</th><th>Amount</th><th>Stage</th><th>Documents</th>' +
    '<th>Owner</th><th>Follow-up</th><th>Updated</th></tr></thead><tbody>' +
    rows.map(l => {
      const pct = Math.round(l.docs.length / l.checklist.length * 100);
      const fu = l.followUp === null ? '<span style="color:var(--muted)">—</span>'
        : '<b style="color:' + (l.followUp < today0() ? 'var(--bad)' : l.followUp === today0() ? 'var(--warn)' : 'var(--slate)') + '">' +
          dateLabel(l.followUp) + '</b>';
      return '<tr data-lead="' + l.id + '">' +
        '<td><div class="nm-cell">' + leadAv(l) +
          '<div class="n">' + esc(l.name) + '<small>' + l.id + ' · ' + esc(l.city) + '</small></div></div></td>' +
        '<td>' + esc(l.product) + '<div style="font-size:11.5px;color:var(--muted)">' + esc(l.source) + '</div></td>' +
        '<td><b>' + money(l.amount) + '</b></td>' +
        '<td>' + stagePill(l.stage) + '</td>' +
        '<td style="min-width:96px"><div style="font-size:11.5px;color:var(--muted);font-weight:600">' +
          l.docs.length + ' of ' + l.checklist.length + '</div>' +
          '<div class="bar" style="margin:5px 0 0"><i style="width:' + pct + '%"></i></div></td>' +
        '<td style="font-size:12.5px">' + esc(U[l.owner].name) + '</td>' +
        '<td style="font-size:12.5px">' + fu + '</td>' +
        '<td style="color:var(--muted);font-size:12.5px">' + ago(l.updatedAt) + '</td>' +
      '</tr>';
    }).join('') + '</tbody></table></div></div>';
}

/* ---- pipeline ---- */
function viewPipeline(){
  const rows = filtered();
  return '<p style="color:var(--slate);margin:0 0 13px;font-size:13px">' +
    'Drag a card into another column to move that lead — the timeline and the notification both happen automatically.</p>' +
    '<div class="kb">' + STAGES.map(s => {
      const items = rows.filter(l => l.stage === s.id);
      return '<div class="kb-col" data-stage="' + s.id + '">' +
        '<div class="kb-h"><span class="dt" style="background:' + s.color + '"></span>' +
          '<span class="tt">' + s.label + '</span><span class="ct">' + items.length + '</span></div>' +
        '<div class="kb-b">' + items.map(l =>
          '<div class="kb-card" draggable="true" data-lead="' + l.id + '">' +
            '<div class="t">' + esc(l.name) + '</div>' +
            '<div class="m">' + esc(l.product) + ' · ' + esc(l.city) + '</div>' +
            '<div class="f"><span class="amt">' + money(l.amount) + '</span>' + avatar(l.owner) + '</div>' +
          '</div>').join('') + '</div></div>';
    }).join('') + '</div>';
}

/* ---- lead detail ---- */
function viewLead(){
  const l = DB.leads.find(x => x.id === openLeadId);
  if (!l) return '<div class="card"><div class="empty"><h4>Lead not found</h4></div></div>';
  const pct = Math.round(l.docs.length / l.checklist.length * 100);

  return '<button class="back" data-go="leads">← Back to leads</button>' +
  '<div class="ld-top">' +
    '<div class="ld-id">' +
      '<div class="av" style="background:' + U[l.owner].color + '">' + initials(l.name) + '</div>' +
      '<div><h2>' + esc(l.name) + '</h2>' +
        '<div class="meta">' + l.id + ' · ' + esc(l.phone) + ' · ' + esc(l.city) + '</div></div>' +
    '</div>' +
    '<div class="ld-act">' +
      '<select id="stageSel" style="padding:8px 11px;border:1px solid var(--line);border-radius:9px;font-weight:600">' +
        STAGES.map(s => '<option value="' + s.id + '"' + (s.id===l.stage?' selected':'') + '>' + s.label + '</option>').join('') +
      '</select>' +
      '<button class="btn sm teal" id="callBtn">Log a call</button>' +
    '</div>' +
  '</div>' +

  '<div class="two-col">' +
    '<div>' +
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="card-h"><h3>Loan &amp; borrower details</h3>' + stagePill(l.stage) + '</div>' +
        '<div class="card-b"><dl class="kv">' +
          '<dt>Loan type</dt><dd>' + esc(l.product) + '</dd>' +
          '<dt>Amount required</dt><dd>' + money(l.amount) + '</dd>' +
          '<dt>Tenure</dt><dd>' + l.tenure + ' years</dd>' +
          '<dt>Monthly income</dt><dd>' + money(l.income) + '</dd>' +
          '<dt>Employment</dt><dd>' + esc(l.employment) + '</dd>' +
          '<dt>Email</dt><dd style="font-weight:500">' + esc(l.email) + '</dd>' +
          '<dt>Source</dt><dd>' + esc(l.source) + '</dd>' +
          '<dt>Assigned to</dt><dd>' + esc(U[l.owner].name) + '</dd>' +
          '<dt>Follow-up</dt><dd>' + (l.followUp === null ? '—' :
            '<span style="color:' + (l.followUp <= today0() ? 'var(--bad)' : 'var(--slate)') + '">' +
            new Date(l.followUp).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) +
            ' (' + dateLabel(l.followUp) + ')</span>') + '</dd>' +
        '</dl></div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-h"><h3>Activity timeline</h3></div>' +
        '<div class="card-b">' +
          '<div class="note-box" style="margin:0 0 16px">' +
            '<textarea id="noteIn" placeholder="Add a note or call outcome…"></textarea>' +
            '<button class="btn" id="noteBtn" style="align-self:flex-start">Add</button>' +
          '</div>' +
          '<div class="tl">' + l.activity.slice(0,14).map(a =>
            '<div class="tl-i ' + (a.t==='stage'?'stage':a.t==='doc'?'doc':'') + '">' +
              '<div class="tx">' + esc(a.text) + '</div>' +
              '<div class="tm">' + esc(a.by) + ' · ' + ago(a.at) + '</div>' +
            '</div>').join('') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div>' +
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="card-h"><h3>Documents</h3>' +
          '<span style="margin-left:auto;font-weight:800;color:' + (pct===100?'var(--ok)':'var(--warn)') + '">' +
          l.docs.length + ' / ' + l.checklist.length + '</span></div>' +
        '<div class="card-b">' +
          '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
          '<div style="font-size:11.8px;color:var(--muted);margin-bottom:11px">' +
            (pct===100 ? 'Checklist complete' : 'Checklist for ' + esc(l.product)) + '</div>' +
          l.checklist.map(d => {
            const has = l.docs.includes(d);
            return '<div class="doc-row"><span class="ic ' + (has?'y':'n') + '">' + (has?'✓':'·') + '</span>' +
              '<span>' + esc(d) + '</span>' +
              '<button class="st btn sm ghost" data-doc="' + esc(d) + '">' + (has?'Remove':'Mark received') + '</button></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-h"><h3>Notes</h3></div>' +
        '<div class="card-b" style="padding-top:8px">' +
          (l.notes.length ? l.notes.slice(0,6).map(n =>
            '<div style="padding:9px 0;border-bottom:1px solid var(--line)">' +
              '<div style="font-size:13px">' + esc(n.text) + '</div>' +
              '<div style="font-size:11.5px;color:var(--muted);margin-top:3px">' + esc(n.by) + ' · ' + ago(n.at) + '</div>' +
            '</div>').join('')
            : '<div style="color:var(--muted);font-size:13px;padding:6px 0 10px">No notes yet.</div>') +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ---- notifications ---- */
function viewNotifications(){
  const ns = myNotifications();
  if (!ns.length) return '<div class="card"><div class="empty"><h4>No notifications</h4>You are all caught up.</div></div>';
  return '<div class="card">' +
    '<div class="card-h"><h3>Notifications</h3>' +
      '<span style="margin-left:auto;color:var(--muted);font-size:12.5px">' + ns.length + ' total</span></div>' +
    ns.map(n =>
      '<div class="nt" data-lead="' + n.leadId + '">' +
        '<div class="ic ' + n.type + '">' + n.icon + '</div>' +
        '<div><div class="tx">' + n.text + '</div>' +
        '<div class="tm">' + ago(n.at) + ' · ' + esc(n.leadId) + '</div></div>' +
      '</div>').join('') +
  '</div>' +
  '<p style="color:var(--muted);font-size:12.5px;margin-top:12px">' +
  'In the real build these also go out by email, with a daily digest each morning and alerts when a lead goes stale.</p>';
}

/* ---- reports ---- */
function viewReports(){
  const ls = visibleLeads();
  const max = Math.max(1, ...STAGES.map(s => ls.filter(l => l.stage === s.id).length));

  const funnel = STAGES.map(s => {
    const n = ls.filter(l => l.stage === s.id).length;
    return '<div class="funnel-row"><span class="lb">' + s.label + '</span>' +
      '<span class="track"><i style="width:' + (n/max*100) + '%"></i></span>' +
      '<span class="vv">' + n + '</span></div>';
  }).join('');

  const board = OFFICERS.map(u => {
    const own = ls.filter(l => l.owner === u.id);
    const win = own.filter(l => l.stage === 'disbursed');
    return { u, total:own.length, win:win.length,
             val:win.reduce((s,l)=>s+l.amount,0),
             rate: own.length ? Math.round(win.length/own.length*100) : 0 };
  }).sort((a,b) => b.val - a.val);

  const src = SOURCES.map(s => {
    const own = ls.filter(l => l.source === s);
    const win = own.filter(l => l.stage === 'disbursed').length;
    return { s, total:own.length, win, rate: own.length ? Math.round(win/own.length*100) : 0 };
  }).filter(x => x.total).sort((a,b) => b.rate - a.rate);

  const aged = ls.filter(l => !DEAD.includes(l.stage) && l.stage !== 'disbursed')
    .map(l => ({ l, d: Math.floor((Date.now()-l.updatedAt)/DAY) }))
    .sort((a,b) => b.d - a.d).slice(0,6);

  return '<div class="two-col">' +
    '<div>' +
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="card-h"><h3>Pipeline funnel</h3></div>' +
        '<div class="card-b">' + funnel + '</div></div>' +
      '<div class="card">' +
        '<div class="card-h"><h3>Lead source performance</h3></div>' +
        '<div class="card-b"><div class="tbl-wrap"><table>' +
          '<thead><tr><th>Source</th><th>Leads</th><th>Disbursed</th><th>Conversion</th></tr></thead><tbody>' +
          src.map(x => '<tr style="cursor:default"><td><b>' + esc(x.s) + '</b></td><td>' + x.total + '</td><td>' + x.win + '</td>' +
            '<td><b style="color:' + (x.rate>=20?'var(--ok)':x.rate>0?'var(--warn)':'var(--muted)') + '">' + x.rate + '%</b></td></tr>').join('') +
        '</tbody></table></div></div></div>' +
    '</div>' +
    '<div>' +
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="card-h"><h3>Team leaderboard</h3></div>' +
        '<div class="card-b" style="padding-top:6px">' + board.map((b,i) =>
          '<div class="lb-row"><div class="rk ' + (i===0?'top':'') + '">' + (i+1) + '</div>' +
            '<div><b style="font-size:13px">' + esc(b.u.name) + '</b>' +
            '<div style="font-size:11.5px;color:var(--muted)">' + b.total + ' leads · ' + b.rate + '% converted</div></div>' +
            '<div class="mt"><b>' + money(b.val) + '</b><small>' + b.win + ' disbursed</small></div>' +
          '</div>').join('') + '</div></div>' +
      '<div class="card">' +
        '<div class="card-h"><h3>Ageing — longest untouched</h3></div>' +
        '<div class="card-b" style="padding-top:6px">' +
          (aged.length ? aged.map(x =>
            '<div class="lb-row" data-lead="' + x.l.id + '" style="cursor:pointer">' +
              leadAv(x.l) +
              '<div><b style="font-size:13px">' + esc(x.l.name) + '</b>' +
              '<div style="font-size:11.5px;color:var(--muted)">' + STAGE[x.l.stage].label + '</div></div>' +
              '<div class="mt"><b style="color:' + (x.d>14?'var(--bad)':'var(--warn)') + '">' + x.d + ' days</b>' +
              '<small>no activity</small></div></div>').join('')
            : '<div class="empty" style="padding:20px">Nothing ageing.</div>') +
        '</div></div>' +
    '</div>' +
  '</div>';
}

/* ---- settings ---- */
function viewSettings(){
  return '<div class="two-col"><div>' +
    '<div class="card" style="margin-bottom:14px">' +
      '<div class="card-h"><h3>Loan products &amp; document checklists</h3></div>' +
      '<div class="card-b">' + PRODUCT_NAMES.map(p =>
        '<div style="padding:11px 0;border-bottom:1px solid var(--line)">' +
          '<b style="font-size:13.5px">' + esc(p) + '</b>' +
          '<div style="font-size:12.3px;color:var(--slate);margin-top:4px">' +
            PRODUCTS[p].map(d => '<span class="pill" style="background:#f1f5f9;color:#475569;margin:2px 4px 2px 0">' + esc(d) + '</span>').join('') +
          '</div></div>').join('') +
      '</div></div>' +
    '<div class="card">' +
      '<div class="card-h"><h3>Pipeline stages</h3></div>' +
      '<div class="card-b">' + STAGES.map((s,i) =>
        '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)">' +
          '<span style="color:var(--muted);font-weight:700;width:20px">' + (i+1) + '</span>' +
          '<span class="dt" style="width:10px;height:10px;border-radius:50%;background:' + s.color + '"></span>' +
          '<b style="font-size:13px">' + s.label + '</b></div>').join('') +
      '</div></div>' +
  '</div><div>' +
    '<div class="card" style="margin-bottom:14px">' +
      '<div class="card-h"><h3>Team</h3></div>' +
      '<div class="card-b" style="padding-top:6px">' + USERS.map(u =>
        '<div class="lb-row">' + avatar(u.id) +
          '<div><b style="font-size:13px">' + esc(u.name) + '</b>' +
          '<div style="font-size:11.5px;color:var(--muted)">' + esc(u.title) + '</div></div></div>').join('') +
      '</div></div>' +
    '<div class="card">' +
      '<div class="card-h"><h3>Demo controls</h3></div>' +
      '<div class="card-b">' +
        '<p style="margin:0 0 12px;color:var(--slate);font-size:13px">' +
        'Anything you change is stored only in this browser. Reset to put the sample data back.</p>' +
        '<button class="btn ghost" id="resetBtn">Reset demo data</button>' +
      '</div></div>' +
  '</div></div>';
}

/* ------------------------------- main render ----------------------------- */
const TITLES = { dashboard:'Dashboard', leads:'All Leads', pipeline:'Pipeline',
                 notifications:'Notifications', reports:'Reports', settings:'Settings', lead:'Lead Details' };

function render(){
  if (!ME) return;
  renderNav();
  $('#pageTitle').textContent = TITLES[route] || 'Dashboard';
  const v = $('#view');
  if (route === 'leads')             v.innerHTML = viewLeads();
  else if (route === 'pipeline')     v.innerHTML = viewPipeline();
  else if (route === 'lead')         v.innerHTML = viewLead();
  else if (route === 'notifications')v.innerHTML = viewNotifications();
  else if (route === 'reports')      v.innerHTML = viewReports();
  else if (route === 'settings')     v.innerHTML = viewSettings();
  else                               v.innerHTML = viewDashboard();
  wireView();
}

/* --------------------------- per-render wiring --------------------------- */
function wireView(){
  // open a lead
  $$('[data-lead]').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('[data-doc]') || e.target.closest('select')) return;
    go('lead', el.getAttribute('data-lead'));
  }));

  // filters
  $$('[data-f]').forEach(sel => sel.addEventListener('change', () => {
    filters[sel.getAttribute('data-f')] = sel.value; render();
  }));
  const cf = $('#clearF');
  if (cf) cf.addEventListener('click', () => { filters = { stage:'',owner:'',product:'',source:'',q:'' };
    $('#globalSearch').value = ''; render(); });

  // lead detail controls
  const ss = $('#stageSel');
  if (ss) ss.addEventListener('change', () => moveStage(openLeadId, ss.value));
  const nb = $('#noteBtn');
  if (nb) nb.addEventListener('click', () => {
    const ta = $('#noteIn');
    if (!ta.value.trim()) { toast('Type a note first'); return; }
    addNote(openLeadId, ta.value);
  });
  const cb = $('#callBtn');
  if (cb) cb.addEventListener('click', () => {
    addNote(openLeadId, 'Call logged — spoke to the customer.');
  });
  $$('[data-doc]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); toggleDoc(openLeadId, b.getAttribute('data-doc'));
  }));
  const rb = $('#resetBtn');
  if (rb) rb.addEventListener('click', resetDemo);

  if (route === 'pipeline') wireDrag();
}

function wireDrag(){
  let dragId = null;
  $$('.kb-card').forEach(c => {
    c.addEventListener('dragstart', e => {
      dragId = c.getAttribute('data-lead');
      c.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch(err){}
    });
    c.addEventListener('dragend', () => { c.classList.remove('drag'); dragId = null; });
  });
  $$('.kb-col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', e => {
      e.preventDefault(); col.classList.remove('over');
      const id = dragId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
      if (id) moveStage(id, col.getAttribute('data-stage'));
    });
  });
}

/* -------------------------------- new lead ------------------------------- */
function newLeadModal(){
  const sel = (id, arr) => '<select id="' + id + '">' + arr.map(v => '<option>' + v + '</option>').join('') + '</select>';
  $('#modalHost').innerHTML =
  '<div class="modal" id="mdl"><div class="modal-c">' +
    '<div class="modal-h"><h3>New Lead</h3><button id="mdlX">&times;</button></div>' +
    '<div class="modal-b">' +
      '<div class="row2">' +
        '<div class="field"><label>Borrower name</label><input id="fName" placeholder="Full name"></div>' +
        '<div class="field"><label>Phone</label><input id="fPhone" placeholder="+91 …"></div>' +
      '</div>' +
      '<div class="field"><label>Email</label><input id="fEmail" placeholder="name@example.com"></div>' +
      '<div class="row2">' +
        '<div class="field"><label>Loan type</label>' + sel('fProduct', PRODUCT_NAMES) + '</div>' +
        '<div class="field"><label>City</label>' + sel('fCity', CITIES) + '</div>' +
      '</div>' +
      '<div class="row2">' +
        '<div class="field"><label>Amount required (₹)</label><input id="fAmt" type="number" value="1000000"></div>' +
        '<div class="field"><label>Tenure (years)</label><input id="fTen" type="number" value="10"></div>' +
      '</div>' +
      '<div class="row2">' +
        '<div class="field"><label>Monthly income (₹)</label><input id="fInc" type="number" value="60000"></div>' +
        '<div class="field"><label>Employment</label>' + sel('fEmp', EMPLOY) + '</div>' +
      '</div>' +
      '<div class="row2">' +
        '<div class="field"><label>Source</label>' + sel('fSrc', SOURCES) + '</div>' +
        '<div class="field"><label>Assign to</label><select id="fOwn">' +
          OFFICERS.map(u => '<option value="' + u.id + '">' + u.name + '</option>').join('') + '</select></div>' +
      '</div>' +
      '<div class="field"><label>Priority</label>' +
        '<select id="fPri"><option value="high">High</option><option value="med" selected>Medium</option>' +
        '<option value="low">Low</option></select></div>' +
    '</div>' +
    '<div class="modal-f"><button class="btn ghost" id="mdlC">Cancel</button>' +
      '<button class="btn" id="mdlS">Create lead</button></div>' +
  '</div></div>';

  const close = () => $('#modalHost').innerHTML = '';
  $('#mdlX').onclick = close; $('#mdlC').onclick = close;
  $('#mdl').onclick = e => { if (e.target.id === 'mdl') close(); };
  $('#mdlS').onclick = () => {
    const name = $('#fName').value.trim();
    if (!name) { toast('Please enter the borrower name'); $('#fName').focus(); return; }
    createLead({
      name, phone: $('#fPhone').value.trim() || '+91 9000000000',
      email: $('#fEmail').value.trim() || name.toLowerCase().replace(/ /g,'.') + '@example.com',
      product: $('#fProduct').value, city: $('#fCity').value,
      amount: $('#fAmt').value, tenure: $('#fTen').value, income: $('#fInc').value,
      employment: $('#fEmp').value, source: $('#fSrc').value,
      owner: $('#fOwn').value, priority: $('#fPri').value
    });
    close();
  };
  $('#fName').focus();
}

/* --------------------------------- chrome -------------------------------- */
function closeSidebar(){
  $('#sidebar').classList.remove('open');
  $('#scrim').classList.remove('on');
}

function boot(){
  // login screen user picker
  $('#loginUser').innerHTML = USERS.map(u =>
    '<option value="' + u.id + '">' + u.name + ' — ' + u.title + '</option>').join('');
  $('#loginUser').value = 'u2';

  $('#loginBtn').addEventListener('click', () => {
    ME = U[$('#loginUser').value];
    $('#login').classList.add('hide');
    $('#app').classList.remove('hide');
    route = 'dashboard';
    render();
    toast('Signed in as ' + ME.name + ' (' + ME.title + ')');
  });
  $('#loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') $('#loginBtn').click(); });

  $('#logoutBtn').addEventListener('click', () => {
    ME = null;
    $('#app').classList.add('hide');
    $('#login').classList.remove('hide');
  });

  // nav (delegated — the sidebar is re-rendered constantly)
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) { go(g.getAttribute('data-go')); }
  });

  $('#bellBtn').addEventListener('click', () => go('notifications'));
  $('#newLeadBtn').addEventListener('click', newLeadModal);
  $('#burger').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
    $('#scrim').classList.toggle('on');
  });
  $('#scrim').addEventListener('click', closeSidebar);

  $('#globalSearch').addEventListener('input', e => {
    filters.q = e.target.value;
    if (route !== 'leads') route = 'leads';
    render();
  });

  load();
}
document.addEventListener('DOMContentLoaded', boot);
