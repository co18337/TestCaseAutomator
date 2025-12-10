const fileInput = document.getElementById('fileInput');
const dragArea = document.getElementById('dragArea');
const previewWrapper = document.getElementById('previewWrapper');
const generateBtn = document.getElementById('generateBtn');
const uploadStatus = document.getElementById('uploadStatus');
const descriptionEl = document.getElementById('description');
const releaseVersionEl = document.getElementById('release_version');
const testerEl = document.getElementById('tester_name');
const runDatesEl = document.getElementById('run_dates');
const expectedCountEl = document.getElementById('expected_count');
const modelOverrideEl = document.getElementById('model_override');
const reviewPanel = document.getElementById('reviewPanel');
const sessionInfo = document.getElementById('sessionInfo');
const exportBtn = document.getElementById('exportBtn');
const backBtn = document.getElementById('backBtn');
const cardTs = document.getElementById('cardTs');
const cardTitle = document.getElementById('cardTitle');
const cardTc = document.getElementById('cardTc');
const cardSteps = document.getElementById('cardSteps');
const cardExpected = document.getElementById('cardExpected');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const skipBtn = document.getElementById('skipBtn');
const saveBtn = document.getElementById('saveBtn');
const actualResult = document.getElementById('actualResult');
const statusSelect = document.getElementById('statusSelect');
const bugId = document.getElementById('bugId');
const commitId = document.getElementById('commitId');
const runSelect = document.getElementById('runSelect');
const activeRunIndex = document.getElementById('activeRunIndex');
const saveStatus = document.getElementById('saveStatus');

let session = { id:null, test_cases:[], run_dates:[] };
let currentIndex = 0;
let activeRun = 0;

function showPreview(url){
  previewWrapper.innerHTML = '';
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '100%';
  img.style.borderRadius = '8px';
  previewWrapper.appendChild(img);
}

['dragenter','dragover'].forEach(ev=>{
  dragArea.addEventListener(ev, e=>{ e.preventDefault(); dragArea.classList.add('dragover'); });
});
['dragleave','drop'].forEach(ev=>{
  dragArea.addEventListener(ev, e=>{ e.preventDefault(); dragArea.classList.remove('dragover'); });
});
dragArea.addEventListener('drop', e=>{
  const f = e.dataTransfer.files[0];
  if(!f) return;
  fileInput.files = e.dataTransfer.files;
  showPreview(URL.createObjectURL(f));
});
dragArea.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', e=>{
  const f = e.target.files[0];
  if(!f) return;
  showPreview(URL.createObjectURL(f));
});

generateBtn.addEventListener('click', async ()=>{
  const file = fileInput.files[0];
  const description = descriptionEl.value.trim();
  const release_version = releaseVersionEl.value.trim();
  const tester_name = testerEl.value.trim();
  const run_dates = runDatesEl.value.trim();
  const expected_count = expectedCountEl.value;
  const model_override = modelOverrideEl.value || '';

  if(!file || !description){
    uploadStatus.innerText = 'Please provide a screenshot and description.';
    return;
  }
  generateBtn.disabled = true;
  uploadStatus.innerText = 'Generating — please wait...';

  const form = new FormData();
  form.append('screenshot', file);
  form.append('description', description);
  form.append('release_version', release_version);
  form.append('tester_name', tester_name);
  form.append('run_dates', run_dates);
  form.append('expected_count', expected_count);
  if(model_override) form.append('model_override', model_override);

  try{
    const res = await fetch('/generate-tests', { method:'POST', body: form });
    const j = await res.json();
    if(!j.success){
      uploadStatus.innerText = 'Failed: ' + (j.error || 'Unknown');
      generateBtn.disabled = false;
      return;
    }
    session.id = j.session_id;
    session.test_cases = j.test_cases;
    session.run_dates = (run_dates ? run_dates.split(',').map(s=>s.trim()).filter(Boolean) : (j.test_cases[0]?.runs?.map(r=>r.test_date) || []));
    sessionInfo.innerText = 'Session: ' + session.id + (j.used_fallback_model ? '  (fallback model used)' : '');
    populateRunSelect();
    currentIndex = 0;
    activeRun = 0;
    renderCard();
    reviewPanel.classList.remove('hidden');
    uploadStatus.innerText = '';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }catch(err){
    uploadStatus.innerText = 'Error: ' + (err.message || err);
  }finally{
    generateBtn.disabled = false;
  }
});

function populateRunSelect(){
  runSelect.innerHTML = '';
  const dates = session.run_dates.length ? session.run_dates : ['Run1'];
  dates.forEach((d,i)=>{
    const o = document.createElement('option');
    o.value = i;
    o.text = `${i+1} — ${d}`;
    runSelect.appendChild(o);
  });
  runSelect.value = activeRun;
  activeRunIndex.innerText = activeRun + 1;
}

function renderCard(){
  const tc = session.test_cases[currentIndex];
  if(!tc) return;
  cardTs.innerText = tc.ts_id || '';
  cardTitle.innerText = tc.scenario || '';
  cardTc.innerText = tc.tc_id || '';
  cardSteps.innerText = tc.steps || '';
  cardExpected.innerText = tc.expected_result || '';
  const run = (tc.runs && tc.runs[activeRun]) ? tc.runs[activeRun] : { actual_result:'', status:'Not Started', bug_id:'', commit_id:'' };
  actualResult.value = run.actual_result || '';
  statusSelect.value = run.status || 'Not Started';
  bugId.value = run.bug_id || '';
  commitId.value = run.commit_id || '';
  populateRunSelect();
}

nextBtn.addEventListener('click', ()=>{ if(currentIndex < session.test_cases.length -1){ currentIndex++; renderCard(); }});
prevBtn.addEventListener('click', ()=>{ if(currentIndex > 0){ currentIndex--; renderCard(); }});
runSelect.addEventListener('change', e=>{ activeRun = Number(e.target.value); renderCard(); });
skipBtn.addEventListener('click', async ()=>{
  statusSelect.value = 'NA';
  actualResult.value = 'Skipped';
  await saveCurrent();
  if(currentIndex < session.test_cases.length -1){ currentIndex++; renderCard(); }
});
backBtn.addEventListener('click', ()=>{ reviewPanel.classList.add('hidden'); window.scrollTo({ top:0, behavior:'smooth' }); });

async function saveCurrent(){
  const tc = session.test_cases[currentIndex];
  if(!tc) return;
  const payload = {
    session_id: session.id,
    results: [{
      tc_id: tc.tc_id,
      run_index: activeRun,
      status: statusSelect.value,
      actual_result: actualResult.value,
      bug_id: bugId.value,
      commit_id: commitId.value
    }]
  };
  tc.runs[activeRun] = tc.runs[activeRun] || {};
  tc.runs[activeRun].status = payload.results[0].status;
  tc.runs[activeRun].actual_result = payload.results[0].actual_result;
  tc.runs[activeRun].bug_id = payload.results[0].bug_id;
  tc.runs[activeRun].commit_id = payload.results[0].commit_id;
  saveStatus.innerText = 'Saving...';
  try{
    const r = await fetch('/log-results', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const jr = await r.json();
    saveStatus.innerText = jr.success ? 'Saved' : 'Save failed';
  }catch(e){
    saveStatus.innerText = 'Save error';
  }finally{
    setTimeout(()=> saveStatus.innerText = '', 1400);
  }
}

saveBtn.addEventListener('click', saveCurrent);
exportBtn.addEventListener('click', ()=>{ if(!session.id){ alert('No session'); return; } window.open(`/export-excel/${session.id}`, '_blank'); });
document.addEventListener('keydown', e=>{ if(e.key==='j' || e.key==='J'){ if(currentIndex < session.test_cases.length -1){ currentIndex++; renderCard(); }} if(e.key==='k' || e.key==='K'){ if(currentIndex > 0){ currentIndex--; renderCard(); }}});
