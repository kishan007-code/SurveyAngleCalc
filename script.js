/* ---------- Helpers: DMS <-> decimal and normalization ---------- */
function dmsToDecimal(d,m,s){
  if(d===''||m===''||s==='') return null;
  const D = Number(d), M = Number(m), S = Number(s);
  if(Number.isNaN(D) || Number.isNaN(M) || Number.isNaN(S)) return null;
  const sign = D < 0 ? -1 : 1;
  return sign * (Math.abs(D) + Math.abs(M)/60 + Math.abs(S)/3600);
}
function decimalToDms(dec){
  if(dec==null || Number.isNaN(dec)) return '';
  const sign = dec < 0 ? -1 : 1;
  dec = Math.abs(dec);
  const d = Math.floor(dec);
  const m = Math.floor((dec - d) * 60);
  const s = ((dec - d) * 3600 - m * 60).toFixed(2);
  return (sign<0?'-':'') + d + '° ' + m + `' ` + s + '"';
}
function normalizeOne(d,m,s){
  let D = Number(d)||0, M = Number(m)||0, S = Number(s)||0;
  if(Math.abs(S) >= 60){
    const add = Math.trunc(S/60);
    M += add;
    S = S - add*60;
  }
  if(Math.abs(M) >= 60){
    const add = Math.trunc(M/60);
    D += add;
    M = M - add*60;
  }
  if(S < 0){ M -= 1; S += 60; }
  if(M < 0){ D -= 1; M += 60; }
  return {d: Math.trunc(D), m: Math.trunc(M), s: Number(S.toFixed(2))};
}

/* ---------- Data model & generation ---------- */
let stationIdCounter = 0;
const tbody = document.getElementById('tbody');
const showDecimalBox = document.getElementById('showDecimal');
const autoNormBox = document.getElementById('autoNormalize');

function newStation(name){
  const id = 'st' + (stationIdCounter++);
  const station = {
    id,
    name: name || String.fromCharCode(65 + ((stationIdCounter-1) % 26)),
    set1: { FL1:{d:'',m:'',s:''}, FL2:{d:'',m:'',s:''}, FR1:{d:'',m:'',s:''}, FR2:{d:'',m:'',s:''}, FLmean:null, FRmean:null, HA:null },
    set2: { FL1:{d:'',m:'',s:''}, FL2:{d:'',m:'',s:''}, FR1:{d:'',m:'',s:''}, FR2:{d:'',m:'',s:''}, FLmean:null, FRmean:null, HA:null },
    finalMean: null
  };
  return station;
}

let stations = [];

/* ---------- Render ---------- */
function renderAll(){
  tbody.innerHTML = '';
  stations.forEach(st => {
    const obsKeys = ['FL1','FL2','FR1','FR2'];
    for(let r=0; r<4; r++){
      const tr = document.createElement('tr');

      if(r===0){
        const tdStation = document.createElement('td');
        tdStation.className = 'station';
        tdStation.rowSpan = 4;
        tdStation.contentEditable = true;
        tdStation.textContent = st.name;
        tdStation.oninput = (e)=>{ st.name = e.target.textContent.trim(); };
        tr.appendChild(tdStation);
      }

      const tdS1Face = document.createElement('td');
      tdS1Face.appendChild(makeDmsInputs(st.id, 'set1', obsKeys[r]));
      tr.appendChild(tdS1Face);

      if(obsKeys[r] === 'FL2'){
        const td = document.createElement('td');
        td.className = 'result';
        td.id = st.id + '-s1-flmean';
        tr.appendChild(td);
      } else if(obsKeys[r] === 'FR2'){
        const td = document.createElement('td');
        td.className = 'result';
        td.id = st.id + '-s1-frmean';
        tr.appendChild(td);
      } else {
        tr.appendChild(document.createElement('td'));
      }

      if(r===0){
        const td = document.createElement('td');
        td.className = 'result';
        td.rowSpan = 4;
        td.style.verticalAlign = 'middle';
        td.id = st.id + '-s1-ha';
        tr.appendChild(td);
      }

      const tdS2Face = document.createElement('td');
      tdS2Face.appendChild(makeDmsInputs(st.id, 'set2', obsKeys[r]));
      tr.appendChild(tdS2Face);

      if(obsKeys[r] === 'FL2'){
        const td = document.createElement('td');
        td.className = 'result';
        td.id = st.id + '-s2-flmean';
        tr.appendChild(td);
      } else if(obsKeys[r] === 'FR2'){
        const td = document.createElement('td');
        td.className = 'result';
        td.id = st.id + '-s2-frmean';
        tr.appendChild(td);
      } else {
        tr.appendChild(document.createElement('td'));
      }

      if(r===0){
        const td = document.createElement('td');
        td.className = 'result';
        td.rowSpan = 4;
        td.style.verticalAlign = 'middle';
        td.id = st.id + '-s2-ha';
        tr.appendChild(td);
      }

      if(r===0){
        const td = document.createElement('td');
        td.className = 'result';
        td.rowSpan = 4;
        td.style.verticalAlign = 'middle';
        td.id = st.id + '-final';
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }
  });

  attachInputs();
  computeAll();
}

/* ---------- DMS Inputs ---------- */
function makeDmsInputs(stId, setName, obsKey){
  const wrap = document.createElement('div');
  wrap.className = 'dms';
  const units = ['d','m','s'];
  units.forEach(u=>{
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.placeholder = u;
    inp.dataset.st = stId;
    inp.dataset.set = setName;
    inp.dataset.obs = obsKey;
    inp.dataset.unit = u;
    inp.addEventListener('input', onDmsChange);
    wrap.appendChild(inp);
  });
  return wrap;
}

function attachInputs(){
  document.querySelectorAll('#tbody input').forEach(inp=>{
    const st = stations.find(s=>s.id === inp.dataset.st);
    if(!st) return;
    const setName = inp.dataset.set;
    const obs = inp.dataset.obs;
    const unit = inp.dataset.unit;
    const val = st[setName][obs][unit];
    inp.value = (val !== undefined && val !== null) ? val : '';
  });
}

/* ---------- Input change ---------- */
function onDmsChange(e){
  const inp = e.target;
  const stId = inp.dataset.st;
  const setName = inp.dataset.set;
  const obs = inp.dataset.obs;
  const unit = inp.dataset.unit;
  const st = stations.find(x=>x.id===stId);
  if(!st) return;
  st[setName][obs][unit] = inp.value;
  if(autoNormBox.checked){
    const o = st[setName][obs];
    const n = normalizeOne(o.d||0, o.m||0, o.s||0);
    st[setName][obs].d = n.d; st[setName][obs].m = n.m; st[setName][obs].s = n.s;
    const inputs = document.querySelectorAll(`#tbody input[data-st='${stId}'][data-set='${setName}'][data-obs='${obs}']`);
    inputs.forEach(i=>{ if(i.dataset.unit==='d') i.value = n.d; if(i.dataset.unit==='m') i.value = n.m; if(i.dataset.unit==='s') i.value = n.s; });
  }
  computeAll();
}

/* ---------- Compute ---------- */
function computeAll(){
  stations.forEach(st=>{
    const s1 = st.set1;
    const fl1_s1 = dmsToDecimal(s1.FL1.d, s1.FL1.m, s1.FL1.s);
    const fl2_s1 = dmsToDecimal(s1.FL2.d, s1.FL2.m, s1.FL2.s);
    const fr1_s1 = dmsToDecimal(s1.FR1.d, s1.FR1.m, s1.FR1.s);
    const fr2_s1 = dmsToDecimal(s1.FR2.d, s1.FR2.m, s1.FR2.s);
    s1.FLmean = (fl1_s1!=null && fl2_s1!=null) ? (fl1_s1 + fl2_s1)/2 : null;
    s1.FRmean = (fr1_s1!=null && fr2_s1!=null) ? (fr1_s1 + fr2_s1)/2 : null;
    s1.HA = (s1.FLmean!=null && s1.FRmean!=null) ? (s1.FLmean + s1.FRmean)/2 : null;

    const s2 = st.set2;
    const fl1_s2 = dmsToDecimal(s2.FL1.d, s2.FL1.m, s2.FL1.s);
    const fl2_s2 = dmsToDecimal(s2.FL2.d, s2.FL2.m, s2.FL2.s);
    const fr1_s2 = dmsToDecimal(s2.FR1.d, s2.FR1.m, s2.FR1.s);
    const fr2_s2 = dmsToDecimal(s2.FR2.d, s2.FR2.m, s2.FR2.s);
    s2.FLmean = (fl1_s2!=null && fl2_s2!=null) ? (fl1_s2 + fl2_s2)/2 : null;
    s2.FRmean = (fr1_s2!=null && fr2_s2!=null) ? (fr1_s2 + fr2_s2)/2 : null;
    s2.HA = (s2.FLmean!=null && s2.FRmean!=null) ? (s2.FLmean + s2.FRmean)/2 : null;

    st.finalMean = (s1.HA!=null && s2.HA!=null) ? (s1.HA + s2.HA)/2 : null;
  });

  updateResultCells();
}

/* ---------- Update result cells ---------- */
function updateResultCells(){
  stations.forEach(st=>{
    const elS1FL = document.getElementById(st.id + '-s1-flmean');
    const elS1FR = document.getElementById(st.id + '-s1-frmean');
    const elS1HA = document.getElementById(st.id + '-s1-ha');
    const elS2FL = document.getElementById(st.id + '-s2-flmean');
    const elS2FR = document.getElementById(st.id + '-s2-frmean');
    const elS2HA = document.getElementById(st.id + '-s2-ha');
    const elFinal = document.getElementById(st.id + '-final');

    const showDec = showDecimalBox.checked;

    elS1FL.textContent = st.set1.FLmean!=null ? decimalToDms(st.set1.FLmean) : '';
    elS1FR.textContent = st.set1.FRmean!=null ? decimalToDms(st.set1.FRmean) : '';
    elS1HA.textContent = st.set1.HA!=null ? decimalToDms(st.set1.HA) : '';
    elS2FL.textContent = st.set2.FLmean!=null ? decimalToDms(st.set2.FLmean) : '';
    elS2FR.textContent = st.set2.FRmean!=null ? decimalToDms(st.set2.FRmean) : '';
    elS2HA.textContent = st.set2.HA!=null ? decimalToDms(st.set2.HA) : '';
    elFinal.textContent = st.finalMean!=null ? decimalToDms(st.finalMean) : '';

    if(showDec){
      if(st.set1.FLmean!=null){ elS1FL.textContent += "\n(" + st.set1.FLmean.toFixed(6) + "°)"; }
      if(st.set1.FRmean!=null){ elS1FR.textContent += "\n(" + st.set1.FRmean.toFixed(6) + "°)"; }
      if(st.set1.HA!=null){ elS1HA.textContent += "\n(" + st.set1.HA.toFixed(6) + "°)"; }
      if(st.set2.FLmean!=null){ elS2FL.textContent += "\n(" + st.set2.FLmean.toFixed(6) + "°)"; }
      if(st.set2.FRmean!=null){ elS2FR.textContent += "\n(" + st.set2.FRmean.toFixed(6) + "°)"; }
      if(st.set2.HA!=null){ elS2HA.textContent += "\n(" + st.set2.HA.toFixed(6) + "°)"; }
      if(st.finalMean!=null){ elFinal.textContent += "\n(" + st.finalMean.toFixed(6) + "°)"; }
    }
  });
}

/* ---------- Normalize all ---------- */
function normalizeAll(){
  stations.forEach(st=>{
    ['set1','set2'].forEach(setName=>{
      ['FL1','FL2','FR1','FR2'].forEach(obs=>{
        const o = st[setName][obs];
        const n = normalizeOne(o.d||0, o.m||0, o.s||0);
        st[setName][obs].d = n.d; st[setName][obs].m = n.m; st[setName][obs].s = n.s;
      });
    });
  });
  renderAll();
}

/* ---------- CSV ---------- */
function exportCSV(){
  const rows = [];
  rows.push(['Station','Set','Obs','deg','min','sec','decimal','FLmean_dec','FRmean_dec','HA_dec','FinalMean_dec'].join(','));
  stations.forEach(st=>{
    ['set1','set2'].forEach(setName=>{
      ['FL1','FL2','FR1','FR2'].forEach(obs=>{
        const o = st[setName][obs];
        const dec = dmsToDecimal(o.d, o.m, o.s);
        const s = st[setName];
        const flmean = s.FLmean; const frmean = s.FRmean; const ha = s.HA;
        const finalMean = st.finalMean;
        rows.push([
          st.name,
          setName === 'set1' ? 'Set1' : 'Set2',
          obs,
          o.d, o.m, o.s,
          dec!=null ? dec.toFixed(6) : '',
          flmean!=null ? flmean.toFixed(6) : '',
          frmean!=null ? frmean.toFixed(6) : '',
          ha!=null ? ha.toFixed(6) : '',
          finalMean!=null ? finalMean.toFixed(6) : ''
        ].join(','));
      });
    });
  });

  const csv = rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'survey_angles.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Init ---------- */
document.getElementById('addStation').addEventListener('click', ()=>{ stations.push(newStation()); renderAll(); });
document.getElementById('normalizeAll').addEventListener('click', ()=>{ normalizeAll(); });
document.getElementById('exportCsv').addEventListener('click', ()=>{ exportCSV(); });
showDecimalBox.addEventListener('change', ()=>{ computeAll(); });

for(let i=0;i<5;i++) stations.push(newStation());
renderAll();
