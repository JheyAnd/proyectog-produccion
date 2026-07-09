// ==============================================
//  GLOBAL DATE CAP — trim everything to Dec 2027
// ==============================================
(function() {
  const CAP = '2027-12';

  // Trim summary dates + monthly values for every row
  const capIdx = D.summary.dates.findIndex(d => d > CAP);
  if (capIdx > 0) {
    D.summary.dates = D.summary.dates.slice(0, capIdx);
    D.summary.p = D.summary.p.map(p => ({
      ...p,
      m: p.m.slice(0, capIdx),
      t: p.m.slice(0, capIdx).reduce((a, b) => a + b, 0)
    }));
  }

  // Trim each project sheet
  Object.keys(D.projects).forEach(k => {
    const pd = D.projects[k];
    if (!pd || !pd.d) return;
    const pi = pd.d.findIndex(d => d > CAP);
    const end = pi > 0 ? pi : (pd.d[pd.d.length - 1] > CAP ? pd.d.length : -1);
    if (end > 0) {
      pd.d = pd.d.slice(0, end);
      pd.r = pd.r.map(r => ({
        ...r,
        m: r.m.slice(0, end),
        t: r.m.slice(0, end).reduce((a, b) => a + b, 0)
      }));
    }
  });
})();

// ==============================================
//  STATE
// ==============================================
const S = {
  view: 'dashboard', prev: null,
  proj: null, editMode: false, edits: {},
  aiOpen: false, alertsOpen: false,
  aiHist: [], tab: 'all', q: '',
  yr: 'all',
  corteMonth: null
};
let gChart=null, bChart=null, dChart=null;

// ==============================================
//  UTILS
// ==============================================
const M = n => {
  if(!n||n===0) return '—';
  const a=Math.abs(n), s=n<0?'-':'';
  if(a>=1e12) return s+'$'+(a/1e12).toFixed(2)+' B';
  if(a>=1e9)  return s+'$'+(a/1e9).toFixed(1)+' MM';
  if(a>=1e6)  return s+'$'+(a/1e6).toFixed(0)+' M';
  if(a>=1e3)  return s+'$'+(a/1e3).toFixed(0)+'K';
  return s+'$'+a;
};
const COP = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n||0);
const fd = d => { const p=d.split('-'); return p[0]+'-'+['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+p[1]-1]; };
const vc = n => n>0?'val-p':n<0?'val-n':'val-z';
const pct = (a,b) => b>0?((a/b)*100).toFixed(1)+'%':'N/A';

function getSheet(name) {
  const k = PROJ_MAP[name]||PROJ_MAP[(name||'').trim()];
  return k ? D.projects[k] : null;
}
// Trim project to real duration (last non-zero month across all rows)
function trimDates(pd) {
  if(!pd) return pd;
  let lastIdx = -1;
  pd.r.forEach(r => {
    if(!r.m) return;
    for(let i = r.m.length - 1; i >= 0; i--) {
      if(r.m[i] !== 0 && i > lastIdx) { lastIdx = i; break; }
    }
  });
  if(lastIdx < 0) return pd;
  const end = lastIdx + 1;
  return { d: pd.d.slice(0, end), r: pd.r.map(r => ({l:r.l, m:r.m.slice(0, end), t:r.t})) };
}

function getRow(pd, kw) {
  if(!pd) return null;
  const k=kw.toLowerCase();
  return pd.r.find(r=>r.l.toLowerCase().includes(k));
}
function isSubTotal(l) {
  const lw=l.toLowerCase().trim();
  return lw.includes('total ingresos')||lw.includes('total material')||lw.includes('total mano')||lw.includes('total admin')||lw.includes('total egresos')||lw.includes('saldo disponible');
}
function rowSec(l) {
  const lw=l.toLowerCase();
  if(lw.includes('anticipo')||lw.includes('cortes')||lw.includes(' aiu')||lw.includes('amort')||lw.includes('deducc')||lw.includes('retenci')||lw.includes('devoluci')||lw.includes('iva descon')||lw.includes('liquidac')||lw.includes('total ingresos')) return 'ingresos';
  if(lw.includes('accesorios')||lw.includes('aparato')||lw.includes('cable')||lw.includes('dotacion')||lw.includes('ducto')||lw.includes('herramienta')||lw.includes('luminaria')||lw.includes('papeleria')||lw.includes('redes')||lw.includes('seguridad industrial')||lw.includes('subestacion')||lw.includes('tablero')||lw.includes('tuberia')||lw.includes('voz y dato')||lw.includes('total material')||lw.includes('generico')||lw.includes(' dato')||lw.includes('servicio')||lw.includes('genérico')) return 'materiales';
  if(lw.includes('mano de obra')||lw.includes('horas extras')||lw.includes('coordinador')||lw.includes('no. admin')||lw.includes('no. ayud')||lw.includes('no. ofic')) return 'mano de obra';
  if(lw.includes('arrendamiento')||lw.includes('caja menor')||lw.includes('examen')||lw.includes('poliza')||lw.includes('publico')||lw.includes('tiquete')||lw.includes('transport')||lw.includes('viatico')||lw.includes('total admin')||lw.includes('otros pagos')) return 'administrativos';
  if(lw.includes('total egresos')||lw.includes('saldo disponible')) return 'resumen';
  return 'otros';
}
const SEC_LABEL = {ingresos:'💰 INGRESOS OPERACIONALES',materiales:'🔧 MATERIALES',  'mano de obra':'👷 MANO DE OBRA',administrativos:'📋 ADMINISTRATIVOS DIRECTIVOS',resumen:'📊 RESUMEN NETO',otros:'📌 OTROS'};

// Get filtered dates/values for current year filter
function filteredSummary() {
  const dates = D.summary.dates;
  const yr = S.yr;
  if(yr === 'all') return { dates, indices: dates.map((d,i)=>i) };
  const indices = dates.map((d,i)=>i).filter(i => dates[i].startsWith(yr));
  return { dates: indices.map(i=>dates[i]), indices };
}

function setYr(yr) {
  S.yr = yr;
  document.querySelectorAll('.yr-btn').forEach(b=>b.classList.toggle('active', b.dataset.yr===yr));
  if(S.view==='dashboard') renderDash();
  if(S.view==='summary') renderSummary();
}

function projSummaries() {
  return D.summary.p.filter(p=>p.n!=='TOTAL FLUJO DE CAJA RESUMEN').map(p=>{
    const pd=getSheet(p.n);
    const ing=(getRow(pd,'total ingresos')||{}).t||0;
    const egr=Math.abs((getRow(pd,'total egresos')||{}).t||0);
    const sal=(getRow(pd,'saldo disponible')||{}).t||p.t||0;
    const mat=Math.abs((getRow(pd,'total material')||{}).t||0);
    const mo=Math.abs((getRow(pd,'total mano de obra')||{}).t||0);
    const adm=Math.abs((getRow(pd,'total admin')||{}).t||0);
    return {name:p.n,code:p.c,ing,egr,sal,mat,mo,adm,mon:p.m,tot:p.t};
  });
}

// ==============================================
//  ALERTS
// ==============================================
function genAlerts() {
  const summs=projSummaries();
  const alerts=[];
  const dates=D.summary.dates;
  const nowIdx=dates.findIndex(d=>d>='2026-05');
  summs.forEach(p=>{
    if(p.sal<-200000000) alerts.push({lv:'crit',t:`🚨 Déficit crítico: ${p.name.substring(0,28)}`,b:`Saldo neto: ${M(p.sal)}. Riesgo alto de insolvencia operativa. Revisar urgente.`});
    else if(p.sal<-5000000) alerts.push({lv:'warn',t:`⚠️ Flujo negativo: ${p.name.substring(0,28)}`,b:`Saldo negativo de ${M(p.sal)}. Verificar calendario de ingresos.`});
    if(nowIdx>=0){
      const nt=(p.mon||[]).slice(nowIdx,nowIdx+3).reduce((a,b)=>a+b,0);
      if(nt<-300000000) alerts.push({lv:'warn',t:`⚠️ Alta salida próximos 3 meses`,b:`${p.name.substring(0,25)}: ${M(nt)} proyectado. Verificar liquidez.`});
    }
  });
  const tot=D.summary.p.find(p=>p.n==='TOTAL FLUJO DE CAJA RESUMEN');
  if(tot&&tot.t>0) alerts.push({lv:'ok',t:`✅ Portafolio total positivo`,b:`Flujo neto consolidado: ${M(tot.t)}. Salud financiera positiva.`});
  const posC=summs.filter(p=>p.sal>0).length, negC=summs.filter(p=>p.sal<0).length;
  if(negC>0) alerts.push({lv:'info',t:`ℹ️ ${negC} proyecto(s) con flujo negativo`,b:`${posC} positivos, ${negC} negativos de ${summs.length} proyectos activos.`});
  return alerts;
}

// ══════════════════════════════════════════════
//  CORTE A FECHA
// ══════════════════════════════════════════════
function initCorteSelector() {
  const sel = document.getElementById('corteMonthSel');
  if(!sel) return;
  const dates = D.summary.dates;
  sel.innerHTML = dates.map(d => {
    const [yr,mo] = d.split('-');
    const moN = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `<option value="${d}">${moN[+mo-1]} ${yr}</option>`;
  }).join('');
  // Default: last date
  const def = dates[dates.length-1];
  sel.value = def;
  S.corteMonth = def;
}

function renderCorte() {
  const cut = S.corteMonth || D.summary.dates[D.summary.dates.length-1];
  const allDates = D.summary.dates;
  const cutIdx = allDates.findIndex(d => d > cut); // first index AFTER cut
  const sliceEnd = cutIdx < 0 ? allDates.length : cutIdx;
  const mesesCortados = sliceEnd;

  // Subtitle
  const [cy,cm] = cut.split('-');
  const moN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const sub = document.getElementById('corteSubtitle');
  if(sub) sub.textContent = `${mesesCortados} meses acumulados desde ${allDates[0]}`;

  // Per-project accumulation
  const rows = D.summary.p
    .filter(p => p.n !== 'TOTAL FLUJO DE CAJA RESUMEN')
    .map(p => {
      const pd = getSheet(p.n);
      let ingAcum=0, egrAcum=0, salAcum=0;
      if(pd) {
        const iR = getRow(pd,'total ingresos');
        const eR = getRow(pd,'total egresos');
        const sR = getRow(pd,'saldo disponible');
        // Find the cutoff index in this project's own date array
        const pCutIdx = pd.d.findIndex(d => d > cut);
        const pEnd = pCutIdx < 0 ? pd.d.length : pCutIdx;
        if(iR) ingAcum = iR.m.slice(0,pEnd).reduce((a,b)=>a+b,0);
        if(eR) egrAcum = Math.abs(eR.m.slice(0,pEnd).reduce((a,b)=>a+b,0));
        // Saldo Acumulado[corte] = suma de todos los Saldo Neto Mensual hasta el corte
        // = Σ (Saldo Neto Mensual[t]) para t=0..pEnd-1
        if(sR) {
          let _cum=0;
          for(let _i=0; _i<pEnd; _i++) _cum += sR.m[_i];
          salAcum = _cum;
        }
      } else {
        // Fallback: use summary row
        ingAcum = p.m.slice(0,sliceEnd).reduce((a,b)=>a+b,0);
        salAcum = ingAcum;
      }
      // Total project (full duration) for advance %
      const fullIng = (getRow(pd,'total ingresos')||{t:0}).t || 0;
      const avance = fullIng > 0 ? Math.min(100,(ingAcum/fullIng*100)) : 0;
      const margin = ingAcum > 0 ? (salAcum/ingAcum*100) : 0;
      return { name:p.n, code:p.c, ing:ingAcum, egr:egrAcum, sal:salAcum, margin, avance };
    })
    .sort((a,b) => Math.abs(b.sal)-Math.abs(a.sal));

  // Portfolio KPIs
  const totIng  = rows.reduce((s,r)=>s+r.ing, 0);
  const totEgr  = rows.reduce((s,r)=>s+r.egr, 0);
  const totSal  = rows.reduce((s,r)=>s+r.sal, 0);
  const portMg  = totIng>0?(totSal/totIng*100):0;
  const active  = rows.filter(r=>r.ing>0||r.egr>0).length;
  const deficit = rows.filter(r=>r.sal<0).length;

  document.getElementById('corteKpis').innerHTML = `
    <div class="kpi"><div class="kpi-label">Ingresos Acumulados</div><div class="kpi-val positive">${M(totIng)}</div><div class="kpi-sub">al ${moN[+cm-1]} ${cy}</div></div>
    <div class="kpi"><div class="kpi-label">Egresos Acumulados</div><div class="kpi-val negative">${M(totEgr)}</div><div class="kpi-sub">costos operativos</div></div>
    <div class="kpi"><div class="kpi-label">Saldo Acumulado</div><div class="kpi-val ${totSal>=0?'positive':'negative'}">${M(totSal)}</div><div class="kpi-sub">margen ${portMg.toFixed(1)}%</div></div>
    <div class="kpi"><div class="kpi-label">Proyectos Activos</div><div class="kpi-val neutral">${active}</div><div class="kpi-sub">${deficit} en déficit</div></div>
  `;

  // Table rows
  document.getElementById('corteBody').innerHTML = rows.map(r => {
    const avBar = `<div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;height:5px;background:var(--bg4);border-radius:3px;overflow:hidden;min-width:60px">
        <div style="width:${r.avance.toFixed(0)}%;height:100%;background:${r.avance>80?'var(--green)':'var(--gold)'};border-radius:3px"></div>
      </div>
      <span style="font-size:10px;color:var(--text3);font-family:var(--font-m);white-space:nowrap">${r.avance.toFixed(0)}%</span>
    </div>`;
    const st = r.sal>0?'<span class="badge ok">OK</span>':r.sal<0?'<span class="badge crit">Déficit</span>':'<span class="badge info">Neutro</span>';
    const mg = r.ing>0 ? `<span style="color:${r.margin>=0?'var(--green2)':'var(--red2)'};font-family:var(--font-m)">${r.margin.toFixed(1)}%</span>` : '—';
    return `<tr class="row-link" onclick="openDetail('${r.name.replace(/'/g,"\'")}')">
      <td style="text-align:left">
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="width:5px;height:5px;border-radius:50%;background:${r.sal>=0?'var(--green2)':'var(--red2)'}"></span>
          ${r.name}
        </span>
      </td>
      <td style="text-align:left;color:var(--text3)">${r.code||'—'}</td>
      <td class="val-p">${r.ing?M(r.ing):'—'}</td>
      <td class="val-n">${r.egr?M(r.egr):'—'}</td>
      <td class="${vc(r.sal)}">${M(r.sal)}</td>
      <td style="text-align:center">${mg}</td>
      <td style="min-width:110px">${avBar}</td>
      <td style="text-align:center">${st}</td>
    </tr>`;
  }).join('');
}

function renderAlerts() {
  const alts=genAlerts();
  document.getElementById('alertsList').innerHTML=alts.map(a=>`
    <div class="a-item ${a.lv}">
      <div class="a-title" style="color:${a.lv==='crit'?'var(--red2)':a.lv==='warn'?'var(--orange)':a.lv==='ok'?'var(--green2)':'var(--blue2)'}">${a.t}</div>
      <div class="a-body">${a.b}</div>
    </div>`).join('');
  const critical=alts.filter(a=>a.lv==='crit'||a.lv==='warn').length;
  document.getElementById('alertDot').style.display=critical>0?'block':'none';
}
function toggleSidebar() {
  const sb = document.getElementById('app-sidebar');
  if(sb.classList.contains('w-64')) {
    sb.classList.remove('w-64');
    sb.classList.add('w-16');
    document.querySelectorAll('.sidebar-text').forEach(el => el.style.opacity = '0');
  } else {
    sb.classList.remove('w-16');
    sb.classList.add('w-64');
    setTimeout(() => {
      document.querySelectorAll('.sidebar-text').forEach(el => el.style.opacity = '1');
    }, 150);
  }
}

function toggleAlerts(){
  S.alertsOpen=!S.alertsOpen;
  document.getElementById('alertsPanel').classList.toggle('open',S.alertsOpen);
}

// ==============================================
//  NAVIGATION
// ==============================================
function nav(v) {
  S.view=v; S.prev=null;
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));
  document.getElementById('v-'+v).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const nb=document.getElementById('nav-'+v);
  if(nb) nb.classList.add('active');
  if(v==='dashboard') renderDash();
  if(v==='summary') renderSummary();
  if(v==='corte') { initCorteSelector(); renderCorte(); }
}
function goBack(){ nav(S.prev||'summary'); }
function openDetail(name){
  S.prev=S.view; S.proj=name; S.editMode=false; S.edits={}; S.tab='all';
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));
  document.getElementById('v-detail').classList.add('active');
  document.getElementById('backBtn').textContent='← Volver a '+(S.prev==='dashboard'?'Dashboard':'Resumen');
  renderDetail();
}

// ==============================================
//  DASHBOARD
// ==============================================
function renderDash() {
  const summs=projSummaries();
  const tot=D.summary.p.find(p=>p.n==='TOTAL FLUJO DE CAJA RESUMEN');
  const grand=tot?tot.t:0;
  const pos=summs.filter(p=>p.sal>0).length, neg=summs.filter(p=>p.sal<0).length;
  const bestP=summs.reduce((b,p)=>p.sal>b.sal?p:b,summs[0]);
  const totalIng=summs.reduce((s,p)=>s+p.ing,0);

  document.getElementById('kpiCards').innerHTML=`
    <div class="kpi"><div class="kpi-label">Flujo Neto Total Portafolio</div><div class="kpi-val ${grand>=0?'positive':'negative'}">${M(grand)}</div><div class="kpi-sub">${D.summary.dates[0]} → ${D.summary.dates[D.summary.dates.length-1]}</div><div class="h-1 bg-steel-100 dark:bg-steel-700 rounded mt-3 overflow-hidden"><div class="h-full rounded transition-all duration-700" style="width:${Math.min(100,(grand/50000000000*100).toFixed(1))}%;background:var(${grand>=0?'--green':'--red'})"></div></div></div>
    <div class="kpi"><div class="kpi-label">Proyectos Activos</div><div class="kpi-val neutral">${summs.length}</div><div class="kpi-sub"><span style="color:var(--green2)">▲${pos} positivos</span> · <span style="color:var(--red2)">▼${neg} negativos</span></div></div>
    <div class="kpi"><div class="kpi-label">Ingresos Totales Presup.</div><div class="kpi-val positive">${M(totalIng)}</div><div class="kpi-sub">Suma presupuesto portafolio</div></div>
    <div class="kpi"><div class="kpi-label">Mejor Proyecto (Saldo)</div><div class="kpi-val positive">${M(bestP?bestP.sal:0)}</div><div class="kpi-sub">${bestP?bestP.name.substring(0,30):'—'}</div></div>
  `;

  // Apply year filter
  const {dates:fDates, indices:fIdx} = filteredSummary();
  const allVals=(tot||{m:[]}).m;
  const labels=fDates.map(fd);
  const vals=fIdx.map(i=>allVals[i]||0);
  // Cumulative from Jan 2026
  const allDates = D.summary.dates;
  const jan26 = allDates.findIndex(d=>d>='2026-01');
  let cs = 0;
  const cumVals = fIdx.map(gi => {
    if(jan26 < 0 || gi < jan26) return null;
    cs += allVals[gi]||0;
    return cs;
  });
  const hasCum = cumVals.some(v=>v!==null);

  if(gChart){gChart.destroy();gChart=null;}
  gChart=new Chart(document.getElementById('globalChart').getContext('2d'),{
    type:'bar',
    data:{labels, datasets:[
      {type:'bar', label:'Flujo Neto Mensual', data:vals,
       backgroundColor:vals.map(v=>v>=0?'rgba(16,185,129,0.65)':'rgba(239,68,68,0.65)'),
       borderColor:vals.map(v=>v>=0?'#059669':'#F87171'),
       borderWidth:1, borderRadius:3, yAxisID:'y'},
      ...(hasCum?[{type:'line', label:'Acumulado desde Ene 2026',
        data:cumVals, borderColor:'#059669', backgroundColor:'rgba(252,211,77,0.08)',
        borderWidth:2.5, pointRadius:1.5, tension:0.35, fill:false, spanGaps:true, yAxisID:'y2'
      }]:[])
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      onClick:(evt,els)=>{
        if(!els||!els.length) return;
        const li=els[0].index;
        const gi=fIdx[li];
        openMonthModal(D.summary.dates[gi], gi);
      },
      plugins:{
        legend:{display:hasCum,labels:{color:'#94A3B8',font:{size:10},boxWidth:10}},
        tooltip:{callbacks:{
          title:items=>{ const gi=fIdx[items[0].dataIndex]; return fd(D.summary.dates[gi])+' — Clic para ver detalle'; },
          label:ctx=>' '+ctx.dataset.label+': '+COP(ctx.raw)
        }}
      },
      scales:{
        x:{ticks:{color:'#64748B',font:{size:8},maxRotation:45,autoSkip:true,maxTicksLimit:S.yr==='all'?20:12},grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ticks:{color:'#64748B',font:{size:8},callback:v=>M(v)},grid:{color:'rgba(255,255,255,0.05)'},position:'left'},
        y2:{display:hasCum,ticks:{color:'#B45309',font:{size:8},callback:v=>M(v)},grid:{display:false},position:'right'}
      }
    }
  });

  const top12=[...summs].sort((a,b)=>b.sal-a.sal).slice(0,12);
  if(bChart){bChart.destroy();bChart=null;}
  bChart=new Chart(document.getElementById('projBar').getContext('2d'),{
    type:'bar',
    data:{
      labels:top12.map(p=>p.name.length>18?p.name.substring(0,16)+'…':p.name),
      datasets:[{label:'Saldo',data:top12.map(p=>p.sal),backgroundColor:top12.map(p=>p.sal>=0?'rgba(59,130,246,0.65)':'rgba(239,68,68,0.6)'),borderColor:top12.map(p=>p.sal>=0?'#60A5FA':'#F87171'),borderWidth:1,borderRadius:3}]
    },
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+COP(ctx.raw)}}},
      scales:{x:{ticks:{color:'#64748B',font:{size:8},callback:v=>M(v)},grid:{color:'rgba(255,255,255,0.04)'}},
               y:{ticks:{color:'#94A3B8',font:{size:9}},grid:{display:false}}}}
  });

  const sorted=[...summs].sort((a,b)=>b.sal-a.sal);
  document.getElementById('dashTableBody').innerHTML=sorted.map(p=>{
    const mg=p.ing>0?(p.sal/p.ing*100).toFixed(1):null;
    const st=p.sal>0?'🟢':p.sal===0?'⚪':'🔴';
    return `<tr class="row-link" onclick="openDetail('${p.name.replace(/'/g,"\\'")}')">
      <td><span style="display:inline-flex;align-items:center;gap:7px"><span style="width:5px;height:5px;border-radius:50%;background:${p.sal>=0?'var(--green2)':'var(--red2)'}"></span>${p.name}</span></td>
      <td style="text-align:left;font-family:var(--font-m);font-size:10px;color:var(--text3)">${p.code||'—'}</td>
      <td class="${vc(p.sal)}">${M(p.sal)}</td>
      <td class="val-p">${M(p.ing)}</td>
      <td class="val-n">${M(p.egr)}</td>
      <td style="color:${!mg?'var(--text3)':parseFloat(mg)>=0?'var(--green2)':'var(--red2)'};font-family:var(--font-m)">${mg!==null?mg+'%':'—'}</td>
      <td>${st}</td>
    </tr>`;
  }).join('');

  const yrLbl = S.yr==='all'?'Todo el portafolio':'Año '+S.yr;
  document.getElementById('chartPeriod').textContent=yrLbl+' · '+fDates.length+' meses';
}

// ==============================================
//  SUMMARY TABLE
// ==============================================
function renderSummary() {
  const {dates:sDates, indices:sIdx} = filteredSummary();
  const q=(S.q||'').toLowerCase();
  const rows=D.summary.p.filter(p=>!q||p.n.toLowerCase().includes(q));

  document.getElementById('summaryPeriod').textContent=
    (S.yr==='all'?'Portafolio completo':'A\u00f1o '+S.yr)+
    ' \u00b7 '+sDates[0]+' \u2192 '+sDates[sDates.length-1];
  const hdr=document.getElementById('summaryHdr');
  hdr.innerHTML=`<th class="sticky1">Proyecto</th><th class="sticky2">C\u00f3digo</th>`+
    sDates.map(d=>`<th>${fd(d)}</th>`).join('')+
    `<th class="sticky-r">TOTAL${S.yr!=='all'?' '+S.yr:''}</th>`;

  document.getElementById('summaryBody').innerHTML=rows.map(p=>{
    const isT=p.n==='TOTAL FLUJO DE CAJA RESUMEN';
    const fVals = sIdx.map(i=>p.m[i]||0);
    const fTot = fVals.reduce((a,b)=>a+b,0);
    const displayTot = S.yr==='all' ? p.t : fTot;
    const cells=fVals.map(v=>`<td class="${v===0?'val-z':vc(v)}">${v===0?'\u2014':M(v)}</td>`).join('');
    return `<tr class="${isT?'total-row':'row-link'}" ${!isT?`onclick="openDetail('${p.n.replace(/'/g,"\\'")}')"`:''}">
      <td class="sticky1"><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:5px;height:5px;border-radius:50%;background:${isT?'var(--gold)':displayTot>=0?'var(--green2)':'var(--red2)'}"></span>${p.n}</span></td>
      <td class="sticky2">${p.c||'\u2014'}</td>
      ${cells}
      <td class="sticky-r ${vc(displayTot)}">${M(displayTot)}</td>
    </tr>`;
  }).join('');
}
document.addEventListener('DOMContentLoaded',()=>{
  const si=document.getElementById('searchQ');
  if(si) si.addEventListener('input',e=>{S.q=e.target.value;if(S.view==='summary')renderSummary();});
});

// ==============================================
//  PROJECT DETAIL
// ==============================================
function renderDetail() {
  const name=S.proj;
  const sp=D.summary.p.find(p=>p.n===name||(p.n||'').trim()===name);
  const pd=getSheet(name);

  // Trim project to real duration (remove trailing zero months)
  const tpd = trimDates(pd);
  const realStart = tpd?tpd.d[0]:(pd?pd.d[0]:D.summary.dates[0]);
  const realEnd   = tpd?tpd.d[tpd.d.length-1]:(pd?pd.d[pd.d.length-1]:D.summary.dates[D.summary.dates.length-1]);
  const realMos   = tpd?tpd.d.length:(pd?pd.d.length:0);

  // Header
  document.getElementById('detailHdr').innerHTML=`
    <div class="detail-title">${name}</div>
    <div class="detail-meta">
      ${sp&&sp.c?`<span class="detail-badge">📋 ${sp.c}</span>`:''}
      <span class="detail-badge">📅 ${realStart} → ${realEnd}</span>
      ${realMos>0?`<span class="detail-badge">📆 ${realMos} meses reales</span>`:''}
    </div>`;

  // KPIs
  const sal=(getRow(pd,'saldo disponible')||{}).t||sp?.t||0;
  const ing=(getRow(pd,'total ingresos')||{}).t||0;
  const egr=Math.abs((getRow(pd,'total egresos')||{}).t||0);
  const mat=Math.abs((getRow(pd,'total material')||{}).t||0);
  const mo=Math.abs((getRow(pd,'total mano de obra')||{}).t||0);
  const adm=Math.abs((getRow(pd,'total admin')||{}).t||0);
  document.getElementById('detailKPIs').innerHTML=`
    <div class="kpi"><div class="kpi-label">Saldo Disponible Neto</div><div class="kpi-val ${sal>=0?'positive':'negative'}">${M(sal)}</div><div class="kpi-sub">Flujo neto total presupuesto</div></div>
    <div class="kpi"><div class="kpi-label">Total Ingresos</div><div class="kpi-val positive">${M(ing)}</div><div class="kpi-sub">Anticipo + Cortes + AIU + otros</div></div>
    <div class="kpi"><div class="kpi-label">Total Egresos</div><div class="kpi-val negative">${M(egr)}</div><div class="kpi-sub">Mat + MO + Admin</div></div>
    <div class="kpi"><div class="kpi-label">Margen Neto</div><div class="kpi-val ${sal>=0?'positive':'negative'}">${pct(sal,ing)}</div><div class="kpi-sub">Saldo / Ingresos</div></div>
    <div class="kpi"><div class="kpi-label">Materiales</div><div class="kpi-val neutral">${M(mat)}</div><div class="kpi-sub">${pct(mat,ing)} de ingresos</div></div>
    <div class="kpi"><div class="kpi-label">Mano de Obra</div><div class="kpi-val neutral">${M(mo)}</div><div class="kpi-sub">${pct(mo,ing)} de ingresos</div></div>
  `;

  // Chart — use trimmed data
  if(dChart){dChart.destroy();dChart=null;}
  const chartData=tpd||pd||{d:D.summary.dates,r:[{l:'SALDO DISPONIBLE',m:sp?sp.m:[],t:sp?sp.t:0}]};
  const cl=chartData.d.map(fd);
  const ds=[];
  const iR=getRow(chartData,'total ingresos');
  const eR=getRow(chartData,'total egresos');
  const sR=getRow(chartData,'saldo disponible');

  // Barra 1 – Ingresos (verde)
  if(iR) ds.push({
    type:'bar', label:'Ingresos',
    data:iR.m,
    backgroundColor:'#3b82f6',
    borderColor:'#059669', borderWidth:1, borderRadius:2
  });
  // Barra 2 – Egresos (rojo, valores absolutos)
  if(eR) ds.push({
    type:'bar', label:'Egresos',
    data:eR.m.map(v=>-Math.abs(v)),
    backgroundColor:'#ef4444',
    borderColor:'#F87171', borderWidth:1, borderRadius:2
  });
  // Línea 3 – Saldo Neto Mensual (dorado)
  if(sR) {
    ds.push({
      type:'line', label:'Saldo Neto Mensual',
      data:sR.m,
      borderColor:'#059669', backgroundColor:'rgba(252,211,77,0.0)',
      fill:false, tension:0.3, pointRadius:3, pointHoverRadius:5,
      borderWidth:2.5, order:0
    });
    // Línea 4 – Saldo Acumulado[t] = Saldo Acumulado[t-1] + Saldo Neto Mensual[t]
    const cumData=[];
    let cumAcum=0;
    for(let i=0;i<sR.m.length;i++){ cumAcum+=sR.m[i]; cumData.push(cumAcum); }
    ds.push({
      type:'line', label:'Saldo Acumulado',
      data:cumData,
      borderColor:'#7c3aed', backgroundColor:'rgba(167,139,250,0.0)',
      fill:false, tension:0.35, pointRadius:2, pointHoverRadius:5,
      borderWidth:2, order:0
    });
  }

  // Store chartData reference for click handler
  dChart && (dChart._cd=null);
  dChart=new Chart(document.getElementById('detailChart').getContext('2d'),{
    type:'bar',
    data:{labels:cl, datasets:ds.length>0?ds:[{
      type:'bar', label:'Flujo', data:sp?sp.m:[],
      backgroundColor:'#3b82f6', borderColor:'#059669', borderWidth:1
    }]},
    options:{responsive:true,maintainAspectRatio:false,
      onClick:(evt,els)=>{
        if(!els||!els.length) return;
        const {datasetIndex,index}=els[0];
        openCompModal(chartData, index, ds[datasetIndex].label, cl[index]);
      },
      plugins:{
        legend:{labels:{color:'#94A3B8',font:{size:10},boxWidth:10}},
        tooltip:{callbacks:{
          title:items=>cl[items[0].dataIndex]+' — clic para ver componentes',
          label:ctx=>' '+ctx.dataset.label+': '+COP(ctx.raw)
        }}
      },
      scales:{
        x:{ticks:{color:'#64748B',font:{size:8},maxRotation:45,autoSkip:true,maxTicksLimit:16},
           grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ticks:{color:'#64748B',font:{size:8},callback:v=>M(v)},
           grid:{color:'rgba(255,255,255,0.05)'},
           title:{display:false}}
      }
    }
  });
  dChart._cd=chartData;

    // Tabs & table — use trimmed data
  renderTabs(tpd||pd);
  renderDTable(tpd||pd,S.tab);
}

function renderTabs(pd) {
  const tabs=[['all','Todos'],['ingresos','💰 Ingresos'],['materiales','🔧 Materiales'],['mano de obra','👷 Mano de Obra'],['administrativos','📋 Administrativos']];
  document.getElementById('detailTabs').innerHTML=tabs.map(([k,l])=>`
    <button class="tab ${S.tab===k?'active':''}" onclick="switchTab('${k}')">${l}</button>`).join('');
}

function switchTab(t){ S.tab=t; const pd=getSheet(S.proj); renderTabs(pd); renderDTable(pd,t); }

function renderDTable(pd,filter) {
  if(!pd){
    document.getElementById('detailHdrRow').innerHTML='<th>Descripción</th><th>TOTAL</th>';
    document.getElementById('detailBody').innerHTML='<tr><td colspan="2" class="no-data">Sin datos detallados disponibles para este proyecto.</td></tr>';
    return;
  }
  const MAX=16;
  const showD=pd.d.slice(0,MAX);
  const more=pd.d.length>MAX;
  document.getElementById('detailHdrRow').innerHTML=
    `<th class="sticky1" style="min-width:200px">Descripción</th>`+
    showD.map(d=>`<th>${fd(d)}</th>`).join('')+
    (more?`<th style="color:var(--text3)">+${pd.d.length-MAX}…</th>`:'')+
    `<th class="sticky-r">TOTAL</th>`;

  let rows=pd.r;
  if(filter!=='all'){
    rows=rows.filter(r=>{
      const s=rowSec(r.l);
      if(filter==='ingresos') return s==='ingresos';
      if(filter==='materiales') return s==='materiales';
      if(filter==='mano de obra') return s==='mano de obra';
      if(filter==='administrativos') return s==='administrativos';
      return true;
    });
  }

  let curSec=null, html='';
  rows.forEach(r=>{
    const sec=rowSec(r.l);
    const isST=isSubTotal(r.l);
    if(filter==='all'&&sec!==curSec){
      curSec=sec;
      html+=`<tr class="section-sep"><td colspan="${showD.length+(more?1:0)+2}">${SEC_LABEL[sec]||sec}</td></tr>`;
    }
    const cells=r.m.slice(0,MAX).map((v,i)=>{
      if(S.editMode&&!isST){
        const ek=`${r.l}|${i}`;
        const ev=S.edits[ek]!==undefined?S.edits[ek]:v;
        const catStr = r.l.replace(/'/g,"\\'");
        const dStr = (showD[i]||'').replace(/'/g,"\\'");
        return `<td class="relative group"><input class="cell-inp pr-7" style="padding-right: 24px;" type="number" value="${ev}" onchange="S.edits['${catStr}|${i}']=parseFloat(this.value)||0"><button onclick="openCellModal('${S.proj}', '${catStr}', ${i}, '${dStr}')" class="absolute right-2 top-1/2 -translate-y-1/2 text-steel-400 hover:text-primary-500 transition-colors p-1" title="Desglosar Detalle"><i data-lucide="settings-2" class="w-3.5 h-3.5"></i></button></td>`;
      }
      return `<td class="${v===0?'val-z':vc(v)}">${v===0?'—':M(v)}</td>`;
    }).join('');
    html+=`<tr class="${isST?'sub-total-row':''}">
      <td class="sticky1" style="${isST?'font-weight:700;color:var(--gold)':'font-family:var(--font-b)'}">${r.l}</td>
      ${cells}
      ${more?`<td class="val-z">…</td>`:''}
      <td class="sticky-r ${vc(r.t)}">${M(r.t)}</td>
    </tr>`;
  });
  document.getElementById('detailBody').innerHTML=html||'<tr><td colspan="30" class="no-data">Sin datos para esta categoría.</td></tr>';
  lucide.createIcons();
}

function toggleEdit(){
  S.editMode=!S.editMode;
  const t=document.getElementById('editToggle');
  const s=document.getElementById('saveBtn');
  t.textContent=S.editMode?'🔒 Salir':'✏️ Editar';
  t.classList.toggle('on',S.editMode);
  s.style.display=S.editMode?'inline-block':'none';
  const pd=getSheet(S.proj);
  renderDTable(pd,S.tab);
}

function saveChanges(){
  const k=PROJ_MAP[S.proj]||PROJ_MAP[(S.proj||'').trim()];
  if(k&&D.projects[k]){
    Object.entries(S.edits).forEach(([ek,val])=>{
      const [lbl,idx]=ek.split('|');
      const row=D.projects[k].r.find(r=>r.l===lbl);
      if(row) row.m[+idx]=val;
    });
  }
  S.edits={}; S.editMode=false;
  document.getElementById('editToggle').textContent='✏️ Editar';
  document.getElementById('editToggle').classList.remove('on');
  document.getElementById('saveBtn').style.display='none';
  renderDetail();
  renderAlerts();
  alert('✅ Cambios guardados correctamente.');
}

// ==============================================
//  AI ASSISTANT
// ==============================================
// ──────────────────────────────────
//  MONTH DETAIL MODAL
// ──────────────────────────────────
// ══════════════════════════════════════════════════════════
//  COMPONENT DETAIL MODAL — click on any bar/line in detail chart
// ══════════════════════════════════════════════════════════
function openCompModal(chartData, monthIdx, datasetLabel, monthLabel) {
  if(!chartData) return;
  const ov=document.getElementById('monthOverlay');
  const mm=document.getElementById('monthModal');

  // ── helpers ──
  const moNames=['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const getVal=(row,i)=>row&&row.m&&row.m[i]!=null?row.m[i]:0;

  // Section classifier
  const lw=l=>l.toLowerCase();
  function getSection(label) {
    const l=lw(label);
    if(l.includes('anticipo')||l.includes('corte')||l.includes('aiu')||
       l.includes('deduccion')||l.includes('amort')||l.includes('retencion')||
       l.includes('devolucion')||l.includes('iva descontable')||l==='ingreso') return 'ing';
    if(l.includes('accesorios')||l.includes('aparatos')||l.includes('cables')||
       l.includes('dotacion')||l.includes('ductos')||l.includes('generico')||
       l.includes('herramienta')||l.includes('luminarias')||l.includes('papeleria')||
       l.includes('redes')||l.includes('seguridad')||l.includes('servicios')||
       l.includes('subestacion')||l.includes('tableros')||l.includes('tuberia')||
       l.includes('voz y datos')||l.includes('material')) return 'mat';
    if(l.includes('administrativos mensual')||l.includes('ayudantes')||
       l.includes('oficiales')||l.includes('mano de obra operativa')||
       l.includes('horas extras')||l.includes('mano de admin')||
       l.includes('coordinadores')||l.includes('no. ')) return 'mo';
    if(l.includes('arrend')||l.includes('cajas menores')||l.includes('examen')||
       l.includes('poliza')||l.includes('servicio'+'s publi')||l.includes('tiquete')||
       l.includes('transporte')||l.includes('viatico')||l.includes('ica')) return 'adm';
    return null;
  }

  // ── build component rows ──
  function compRows(rows, secFilter, monthIdx) {
    return rows
      .filter(r=>{
        const s=getSection(r.l);
        return s===secFilter && !lw(r.l).startsWith('total') &&
               !lw(r.l).startsWith('materiales') && !lw(r.l).startsWith('mano de obra') &&
               !lw(r.l).startsWith('administrativos directivos') && !lw(r.l).startsWith('ingreso');
      })
      .map(r=>({label:r.l, val:getVal(r,monthIdx)}))
      .filter(r=>r.val!==0);
  }

  function renderRows(items, color) {
    if(!items.length) return '<div style="color:var(--text3);font-size:11px;padding:4px 0">Sin movimiento</div>';
    const maxAbs=Math.max(...items.map(r=>Math.abs(r.val)));
    return items.map(r=>{
      const pct=maxAbs>0?(Math.abs(r.val)/maxAbs*100).toFixed(0):0;
      const absV=Math.abs(r.val);
      const sign=r.val<0?'-':'+';
      const col=r.val<0?'var(--red2)':'var(--green2)';
      return `<div class="mm-proj-row">
        <div class="mm-proj-name">${r.label}</div>
        <div class="mm-proj-val" style="color:${col}">${sign}${M(absV)}</div>
        <div class="mm-bar-wrap"><div class="mm-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
    }).join('');
  }

  function sectionBlock(title, icon, rows, sec, color, totalRow) {
    const items=compRows(rows, sec, monthIdx);
    if(!items.length) return '';
    const total=totalRow?getVal(totalRow,monthIdx):items.reduce((s,r)=>s+r.val,0);
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0 3px;border-bottom:1px solid var(--border2);margin-bottom:4px">
        <span style="font-size:11px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.06em">${icon} ${title}</span>
        <span style="font-family:var(--font-m);font-size:12px;font-weight:700;color:${total>=0?'var(--green2)':'var(--red2)'}">${total>=0?'+':''}${M(total)}</span>
      </div>
      ${renderRows(items, color)}
    </div>`;
  }

  const rows=chartData.r||[];
  const totIng=rows.find(r=>lw(r.l).includes('total ingresos'));
  const totMat=rows.find(r=>lw(r.l).includes('total material'));
  const totMO =rows.find(r=>lw(r.l).includes('total mano'));
  const totAdm=rows.find(r=>lw(r.l).includes('total admin'));
  const totEgr=rows.find(r=>lw(r.l).includes('total egresos'));
  const salRow=rows.find(r=>lw(r.l).includes('saldo disponible'));

  let title='', subtitle='', body='';
  const totIngVal=totIng?getVal(totIng,monthIdx):0;
  const totEgrVal=totEgr?Math.abs(getVal(totEgr,monthIdx)):0;
  const salVal=salRow?getVal(salRow,monthIdx):0;

  if(datasetLabel==='Ingresos') {
    title='Componentes de Ingresos';
    subtitle=`Total: ${totIngVal>=0?'+':''}${M(totIngVal)}`;
    body=sectionBlock('Ingresos Operacionales','💰',rows,'ing','rgba(52,211,153,0.7)',totIng);
  }
  else if(datasetLabel==='Egresos') {
    title='Componentes de Egresos';
    subtitle=`Total: -${M(totEgrVal)}`;
    body=sectionBlock('Materiales','🔧',rows,'mat','rgba(248,113,113,0.7)',totMat);
    body+=sectionBlock('Mano de Obra','👷',rows,'mo','rgba(251,146,60,0.7)',totMO);
    body+=sectionBlock('Administrativos','📋',rows,'adm','rgba(167,139,250,0.7)',totAdm);
    // totals footer
    const matV=totMat?Math.abs(getVal(totMat,monthIdx)):0;
    const moV =totMO ?Math.abs(getVal(totMO ,monthIdx)):0;
    const admV=totAdm?Math.abs(getVal(totAdm,monthIdx)):0;
    if(matV||moV||admV) body+=`<div style="padding-top:10px;border-top:1px solid var(--border2);display:flex;gap:20px;font-size:11px;font-family:var(--font-m)">
      <div><span style="color:var(--text3)">Mat: </span><span style="color:var(--red2)">-${M(matV)}</span></div>
      <div><span style="color:var(--text3)">MO: </span><span style="color:var(--red2)">-${M(moV)}</span></div>
      <div><span style="color:var(--text3)">Adm: </span><span style="color:var(--red2)">-${M(admV)}</span></div>
    </div>`;
  }
  else if(datasetLabel==='Saldo Neto Mensual') {
    title='Saldo Neto del Mes';
    subtitle=`${salVal>=0?'+':''}${M(salVal)}`;
    // Show Ingresos vs Egresos side by side
    body=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">💰 Ingresos</div>
        <div style="font-family:var(--font-m);font-size:14px;font-weight:700;color:var(--green2)">+${M(totIngVal)}</div>
      </div>
      <div style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">📤 Egresos</div>
        <div style="font-family:var(--font-m);font-size:14px;font-weight:700;color:var(--red2)">-${M(totEgrVal)}</div>
      </div>
    </div>`;
    body+=sectionBlock('Ingresos Operacionales','💰',rows,'ing','rgba(52,211,153,0.7)',totIng);
    body+=sectionBlock('Materiales','🔧',rows,'mat','rgba(248,113,113,0.7)',totMat);
    body+=sectionBlock('Mano de Obra','👷',rows,'mo','rgba(251,146,60,0.7)',totMO);
    body+=sectionBlock('Administrativos','📋',rows,'adm','rgba(167,139,250,0.7)',totAdm);
  }
  else if(datasetLabel==='Saldo Acumulado') {
    // Compute cumulative up to this month
    let cumArr=[]; let _c=0;
    const sRrow=rows.find(r=>lw(r.l).includes('saldo disponible'));
    if(sRrow) for(let i=0;i<=monthIdx;i++){_c+=sRrow.m[i]||0; cumArr.push({d:chartData.d[i],v:_c});}
    const prevCum=monthIdx>0?cumArr[monthIdx-1].v:0;
    title='Saldo Acumulado';
    subtitle=`Acumulado total: ${_c>=0?'+':''}${M(_c)}`;
    body=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em">Acum. anterior</div>
        <div style="font-family:var(--font-m);font-size:13px;font-weight:700;color:${prevCum>=0?'var(--green2)':'var(--red2)'};margin-top:3px">${prevCum>=0?'+':''}${M(prevCum)}</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em">Neto del mes</div>
        <div style="font-family:var(--font-m);font-size:13px;font-weight:700;color:${salVal>=0?'var(--green2)':'var(--red2)'};margin-top:3px">${salVal>=0?'+':''}${M(salVal)}</div>
      </div>
      <div style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.25);border-radius:8px;padding:10px 12px">
        <div style="font-size:9px;color:#A78BFA;text-transform:uppercase;letter-spacing:.07em">Acumulado</div>
        <div style="font-family:var(--font-m);font-size:13px;font-weight:700;color:${_c>=0?'var(--green2)':'var(--red2)'};margin-top:3px">${_c>=0?'+':''}${M(_c)}</div>
      </div>
    </div>`;
    // Mini evolution table (last 6 months up to current)
    const showFrom=Math.max(0,monthIdx-5);
    body+=`<div class="mm-section-lbl">Evolución acumulada</div>`;
    body+=cumArr.slice(showFrom).map((item,j)=>{
      const iAbs=showFrom+j;
      const monthly=sRrow?(sRrow.m[iAbs]||0):0;
      const isThis=iAbs===monthIdx;
      const [yr,mo]=item.d.split('-');
      const moN=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const lbl=moN[+mo-1]+' '+yr;
      return `<div class="mm-proj-row" style="${isThis?'background:rgba(167,139,250,0.1);border-radius:4px;':''}">
        <div class="mm-proj-name" style="${isThis?'color:var(--text);font-weight:600':'color:var(--text2)'}">${isThis?'▶ ':''}${lbl}</div>
        <div class="mm-proj-val" style="color:${monthly>=0?'var(--green2)':'var(--red2)'}">Neto: ${monthly>=0?'+':''}${M(monthly)}</div>
        <div class="mm-proj-val" style="color:${item.v>=0?'var(--text)':'var(--red2)'}">Acum: ${item.v>=0?'+':''}${M(item.v)}</div>
      </div>`;
    }).join('');
  }

  document.getElementById('mmTitle').innerHTML=`${title} &nbsp;<span style="font-size:12px;color:var(--text3);font-weight:400">${monthLabel}</span>`;
  document.getElementById('mmSub').textContent=subtitle;
  document.getElementById('mmBody').innerHTML=body||'<div style="color:var(--text3);padding:20px 0;text-align:center">Sin datos para este mes.</div>';
  ov.classList.add('open'); mm.classList.add('open');
}

function openMonthModal(dateStr, globalIdx) {
  const ov=document.getElementById('monthOverlay');
  const mm=document.getElementById('monthModal');
  const tots=D.summary.p.find(p=>p.n==='TOTAL FLUJO DE CAJA RESUMEN');
  const monthTotal=tots?(tots.m[globalIdx]||0):0;
  const [yr,mo]=dateStr.split('-');
  const moNames=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('mmTitle').textContent=moNames[+mo-1]+' '+yr+' — Flujo de Caja Neto';
  document.getElementById('mmSub').textContent='Total portafolio: '+(monthTotal>=0?'+':'')+M(monthTotal)+'  |  '+COP(monthTotal);
  const rows=D.summary.p
    .filter(p=>p.n!=='TOTAL FLUJO DE CAJA RESUMEN')
    .map(p=>({name:p.n,code:p.c,val:p.m[globalIdx]||0}))
    .filter(r=>r.val!==0)
    .sort((a,b)=>Math.abs(b.val)-Math.abs(a.val));
  const pos=rows.filter(r=>r.val>0);
  const neg=rows.filter(r=>r.val<0);
  const maxAbs=rows.length?Math.max(...rows.map(r=>Math.abs(r.val))):1;
  function mkRows(arr,lbl,col){
    if(!arr.length) return '';
    const h=arr.map(r=>{
      const pct=(Math.abs(r.val)/maxAbs*100).toFixed(1);
      const nm=r.name.length>38?r.name.substring(0,36)+'…':r.name;
      return `<div class="mm-proj-row">
        <div class="mm-proj-name" title="${r.name}">${nm}</div>
        <div class="mm-proj-val" style="color:${r.val>=0?'var(--green2)':'var(--red2)'}">${r.val>=0?'+':''}${M(r.val)}</div>
        <div class="mm-bar-wrap"><div class="mm-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      </div>`;
    }).join('');
    return `<div class="mm-section-lbl">${lbl} (${arr.length})</div>${h}`;
  }
  let html='';
  if(!rows.length){
    html='<div style="text-align:center;color:var(--text3);padding:30px 0">Sin movimientos este mes.</div>';
  } else {
    html+=mkRows(pos,'▲ Flujos positivos','var(--green)');
    html+=mkRows(neg,'▼ Flujos negativos','var(--red)');
    const posSum=pos.reduce((s,r)=>s+r.val,0);
    const negSum=neg.reduce((s,r)=>s+r.val,0);
    html+=`<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border2);display:flex;gap:24px;font-size:11px;font-family:var(--font-m)">
      <div><span style="color:var(--text3)">Entradas: </span><span style="color:var(--green2)">+${M(posSum)}</span></div>
      <div><span style="color:var(--text3)">Salidas: </span><span style="color:var(--red2)">${M(negSum)}</span></div>
      <div><span style="color:var(--text3)">Proyectos activos: </span><span style="color:var(--text)">${rows.length}</span></div>
    </div>`;
  }
  document.getElementById('mmBody').innerHTML=html;
  ov.classList.add('open'); mm.classList.add('open');
}
function closeMonthModal(){
  document.getElementById('monthOverlay').classList.remove('open');
  document.getElementById('monthModal').classList.remove('open');
}

function toggleAI(){
  S.aiOpen=!S.aiOpen;
  document.getElementById('aiPanel').classList.toggle('open',S.aiOpen);
  if(S.aiOpen) document.getElementById('aiInp').focus();
}
function qAsk(q){ document.getElementById('aiInp').value=q; sendAI(); }

function buildCtx(){
  const summs=projSummaries();
  const tot=D.summary.p.find(p=>p.n==='TOTAL FLUJO DE CAJA RESUMEN');
  const allDates=D.summary.dates;
  const now=new Date().toISOString().slice(0,7);

  let ctx='═══════════════════════════════════\n';
  ctx+=`PORTAFOLIO PC MEJÍA — DATOS COMPLETOS FLUXO\n`;
  ctx+=`Análisis: ${now} | Período: ${allDates[0]} → ${allDates[allDates.length-1]} (${allDates.length} meses)\n`;
  ctx+=`Flujo neto total: ${M(tot?tot.t:0)} COP\n`;
  ctx+='═══════════════════════════════════\n\n';

  // 1. Flujo mensual consolidado
  ctx+='FLUJO MENSUAL CONSOLIDADO:\n';
  if(tot) allDates.forEach((d,i)=>{ const v=tot.m[i]||0; if(v!==0) ctx+=`  ${fd(d)}: ${v>=0?'+':''}${M(v)}\n`; });
  ctx+='\n';

  // 2. Resumen ejecutivo proyectos
  ctx+='RESUMEN EJECUTIVO — '+summs.length+' PROYECTOS:\n';
  summs.forEach(p=>{
    const pd=getSheet(p.name); const tpd=trimDates(pd);
    const data=tpd||pd;
    const inicio=data?data.d[0]:'?'; const fin=data?data.d[data.d.length-1]:'?';
    const meses=data?data.d.length:0;
    const mg=p.ing>0?((p.sal/p.ing)*100).toFixed(1)+'%':'N/A';
    const matPct=p.ing>0?(p.mat/p.ing*100).toFixed(0)+'%':'—';
    const moPct=p.ing>0?(p.mo/p.ing*100).toFixed(0)+'%':'—';
    ctx+=`▸ ${p.name} (${p.code||'—'}) | ${inicio}→${fin} (${meses}m) | Saldo:${M(p.sal)} Margen:${mg}\n`;
    ctx+=`  Ing:${M(p.ing)} | Egr:${M(p.egr)} | Mat:${M(p.mat)}(${matPct}) | MO:${M(p.mo)}(${moPct}) | Adm:${M(p.adm)}\n`;
  });
  ctx+='\n';

  // 3. Detalle completo por proyecto
  ctx+='DETALLE COMPLETO POR PROYECTO:\n\n';
  summs.forEach(p=>{
    const pd=getSheet(p.name); const tpd=trimDates(pd);
    if(!tpd&&!pd) return;
    const data=tpd||pd;
    ctx+=`━ ${p.name}${p.code?' ('+p.code+')':''}: ${data.d[0]}→${data.d[data.d.length-1]} (${data.d.length}m)\n`;
    data.r.filter(r=>r.t!==0||isSubTotal(r.l)).forEach(r=>{
      ctx+=`  ${isSubTotal(r.l)?'▶ ':''} ${r.l}: ${M(r.t)}`;
      if(isSubTotal(r.l)||r.l.toLowerCase().includes('saldo')){
        data.d.forEach((d,i)=>{ const v=r.m[i]||0; if(v!==0) ctx+=` | ${fd(d)}:${v>=0?'+':''}${M(v)}`; });
      }
      ctx+='\n';
    });
    ctx+='\n';
  });

  // 4. Proyecto activo — detalle máximo
  if(S.proj&&S.proj!=='TOTAL FLUJO DE CAJA RESUMEN'){
    const pd=getSheet(S.proj); const tpd=trimDates(pd); const data=tpd||pd;
    ctx+=`\n═══ PROYECTO ACTIVO: ${S.proj} ═══\n`;
    if(data) data.r.forEach(r=>{
      ctx+=`  ${r.l}: Total=${M(r.t)}`;
      data.d.forEach((d,i)=>{ const v=r.m[i]||0; if(v!==0) ctx+=` | ${fd(d)}:${M(v)}`; });
      ctx+='\n';
    });
  }
  return ctx;
}

async function sendAI(){
  const inp=document.getElementById('aiInp');
  const q=inp.value.trim(); if(!q) return;
  inp.value='';
  const msgsEl=document.getElementById('aiMsgs');
  msgsEl.innerHTML+=`<div class="msg u">${q}</div>`;
  const lid='l_'+Date.now();
  msgsEl.innerHTML+=`<div class="msg b loading" id="${lid}"><span class="blink">●</span> Analizando...</div>`;
  msgsEl.scrollTop=msgsEl.scrollHeight;
  S.aiHist.push({role:'user',content:q});
  const sys=`Eres Fluxo, el agente financiero experto de PC Mejía. Dominas: flujos de caja de proyectos de construcción, VPN, TIR, WACC, período de recuperación, análisis de liquidez y riesgo financiero en Colombia.\n\n${buildCtx()}\n\nINSTRUCCIONES:\n- Responde en español ejecutivo y directo\n- Usa cifras reales: $X MM (miles de millones), $X M (millones)\n- Cita proyectos y meses específicos\n- Identifica riesgos con magnitud y fecha exacta\n- Aplica conceptos financieros donde agreguen valor\n- Sé accionable: gerentes que toman decisiones`;  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1500,system:sys,messages:S.aiHist.slice(-8)})});
    const data=await r.json();
    const ans=data.content?.[0]?.text||'Error al procesar.';
    S.aiHist.push({role:'assistant',content:ans});
    document.getElementById(lid).outerHTML=`<div class="msg b">${ans.replace(/\n/g,'<br>')}</div>`;
  } catch(e){
    document.getElementById(lid).outerHTML=`<div class="msg b" style="color:var(--red2)">Error de conexión. Verifica la red.</div>`;
  }
  msgsEl.scrollTop=msgsEl.scrollHeight;
}


// ==============================================
//  CELL DETAIL MODAL LOGIC
// ==============================================
S.cellDetails = {}; // Global state for details
S.cdCurrent = { proj: '', cat: '', monthIdx: -1, dateStr: '' };

function openCellModal(proj, cat, mIdx, dateStr) {
  S.cdCurrent = { proj, cat, monthIdx: mIdx, dateStr };
  const key = `${proj}_${cat}_${mIdx}`;
  
  if(!S.cellDetails[key]) {
    // Check if there's already an edited value to populate a default row
    const ek=`${cat}|${mIdx}`;
    let baseVal = S.edits[ek] !== undefined ? S.edits[ek] : 0;
    if (baseVal === 0) {
      const pData = getSheet(proj);
      const row = pData && pData.r.find(r => r.l === cat);
      if (row && row.m) baseVal = row.m[mIdx] || 0;
    }
    
    if (baseVal !== 0) {
      S.cellDetails[key] = [{ oc:'', prov:'', valor: baseVal, fecha:'', factura:'', nota:'Valor original' }];
    } else {
      S.cellDetails[key] = [];
    }
  }
  
  document.getElementById('cdModalTitle').textContent = 'Detalle: ' + cat;
  document.getElementById('cdModalDate').textContent = dateStr;
  renderCellModalRows();
  
  const modal = document.getElementById('cellDetailModal');
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.remove('opacity-0'), 10);
  lucide.createIcons();
}

function closeCellModal() {
  const modal = document.getElementById('cellDetailModal');
  modal.classList.add('opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 300);
}

function renderCellModalRows() {
  const key = `${S.cdCurrent.proj}_${S.cdCurrent.cat}_${S.cdCurrent.monthIdx}`;
  const details = S.cellDetails[key] || [];
  const tbody = document.getElementById('cdTableBody');
  let html = '';
  let total = 0;
  details.forEach((d, i) => {
    total += (parseFloat(d.valor) || 0);
    html += `
      <tr class="hover:bg-steel-50 dark:hover:bg-steel-800/50 transition-colors group">
        <td class="px-2 py-2"><button onclick="simUpload(this)" class="flex items-center gap-1 text-[11px] text-steel-500 border border-steel-200 bg-white rounded px-2 py-1 shadow-sm hover:bg-steel-50 dark:bg-steel-800 dark:border-steel-600"><i data-lucide="paperclip" class="w-3 h-3"></i> Subir</button></td>
        <td class="px-2 py-2"><input type="text" class="w-full bg-white dark:bg-steel-800 border border-steel-300 dark:border-steel-600 rounded px-2 py-1.5 text-xs text-steel-900 dark:text-white" value="${d.oc||''}" onchange="updateCD(${i}, 'oc', this.value)"></td>
        <td class="px-2 py-2"><input type="text" class="w-full bg-white dark:bg-steel-800 border border-steel-300 dark:border-steel-600 rounded px-2 py-1.5 text-xs text-steel-900 dark:text-white" value="${d.prov||''}" onchange="updateCD(${i}, 'prov', this.value)"></td>
        <td class="px-2 py-2"><input type="number" class="w-full bg-white dark:bg-steel-800 border border-steel-300 dark:border-steel-600 rounded px-2 py-1.5 text-xs text-right font-mono text-steel-900 dark:text-white font-bold" value="${d.valor||''}" onchange="updateCD(${i}, 'valor', this.value); recalcCDTotal()"></td>
        <td class="px-2 py-2"><input type="date" class="w-full bg-white dark:bg-steel-800 border border-steel-300 dark:border-steel-600 rounded px-2 py-1.5 text-xs text-steel-900 dark:text-white" value="${d.fecha||''}" onchange="updateCD(${i}, 'fecha', this.value)"></td>
        <td class="px-2 py-2"><input type="text" class="w-full bg-white dark:bg-steel-800 border border-steel-300 dark:border-steel-600 rounded px-2 py-1.5 text-xs text-steel-900 dark:text-white" value="${d.factura||''}" onchange="updateCD(${i}, 'factura', this.value)"></td>
        <td class="px-2 py-2"><button onclick="simUpload(this)" class="flex items-center gap-1 text-[11px] text-steel-500 border border-steel-200 bg-white rounded px-2 py-1 shadow-sm hover:bg-steel-50 dark:bg-steel-800 dark:border-steel-600"><i data-lucide="paperclip" class="w-3 h-3"></i> Subir</button></td>
        <td class="px-2 py-2"><input type="text" class="w-full bg-white dark:bg-steel-800 border border-steel-300 dark:border-steel-600 rounded px-2 py-1.5 text-xs text-steel-900 dark:text-white" value="${d.nota||''}" onchange="updateCD(${i}, 'nota', this.value)"></td>
        <td class="px-2 py-2 text-center"><button onclick="removeCD(${i})" class="text-danger-400 hover:text-danger-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar fila"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td>
      </tr>
    `;
  });
  if(details.length===0){
    html = '<tr><td colspan="9" class="px-2 py-8 text-center text-sm text-steel-400">No hay detalles aún. Haz clic en "Agregar detalle".</td></tr>';
  }
  tbody.innerHTML = html;
  document.getElementById('cdModalTotal').textContent = M(total);
  document.getElementById('cdTableTotal').textContent = M(total);
  document.getElementById('cdModalCount').textContent = details.length;
  lucide.createIcons();
}

function addCellDetailRow() {
  const key = `${S.cdCurrent.proj}_${S.cdCurrent.cat}_${S.cdCurrent.monthIdx}`;
  S.cellDetails[key].push({ oc:'', prov:'', valor:'', fecha:'', factura:'', nota:'' });
  renderCellModalRows();
}

function updateCD(idx, field, val) {
  const key = `${S.cdCurrent.proj}_${S.cdCurrent.cat}_${S.cdCurrent.monthIdx}`;
  S.cellDetails[key][idx][field] = val;
}

function recalcCDTotal() {
  const key = `${S.cdCurrent.proj}_${S.cdCurrent.cat}_${S.cdCurrent.monthIdx}`;
  let total = 0;
  S.cellDetails[key].forEach(d => total += (parseFloat(d.valor) || 0));
  document.getElementById('cdModalTotal').textContent = M(total);
  document.getElementById('cdTableTotal').textContent = M(total);
}

function removeCD(idx) {
  if(!confirm('¿Eliminar esta fila de detalle?')) return;
  const key = `${S.cdCurrent.proj}_${S.cdCurrent.cat}_${S.cdCurrent.monthIdx}`;
  S.cellDetails[key].splice(idx, 1);
  renderCellModalRows();
}

function saveCellDetails() {
  const key = `${S.cdCurrent.proj}_${S.cdCurrent.cat}_${S.cdCurrent.monthIdx}`;
  let total = 0;
  S.cellDetails[key].forEach(d => total += (parseFloat(d.valor) || 0));
  
  // Set the total in S.edits so it updates the table preview instantly
  const ek = `${S.cdCurrent.cat}|${S.cdCurrent.monthIdx}`;
  S.edits[ek] = total;
  
  closeCellModal();
  // Rerender table so new total shows
  const pd = getSheet(S.proj);
  renderDTable(pd, S.tab);
}

function simUpload(btn) {
  btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-success-500"></i> Listo`;
  btn.classList.add('border-success-200','bg-success-50');
  lucide.createIcons();
}

// ==============================================
//  INIT
// ==============================================
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('dateBadge').textContent=new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
  renderAlerts();
  renderDash();
  renderSummary();
  initCorteSelector();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ if(S.alertsOpen)toggleAlerts(); if(S.aiOpen)toggleAI(); closeMonthModal(); }
});
document.addEventListener('click',e=>{
  if(S.alertsOpen&&!e.target.closest('#alertsPanel')&&!e.target.closest('#alertBtn'))toggleAlerts();
});