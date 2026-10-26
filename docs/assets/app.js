'use strict';
const $=id=>document.getElementById(id), L=window.Learning, levels=window.CURRICULUM;
const units=levels.flatMap(level=>[...level.units.map((unit,index)=>({...unit,level:level.id,kind:level.kind,role:'base',reading:window.READING_LESSONS[level.id].readings[index]})),...window.APPLICATIONS[level.id]]), ids=new Set(units.map(u=>u.id));
let lessonStep=0,selfIndex=0,checkIndex=0;
let state=L.defaults(), page='learn', current=levels[0].units[0].id, question=null, quizPool=[], previous=null, selectedImport=null;
let toastTimer;
function toast(text){$('toast').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',4500);}
function warn(text){$('storage-warning').hidden=false;$('storage-warning').textContent=text;}
function readState(){const raw=localStorage.getItem(L.KEY);return raw?L.validate(JSON.parse(raw),ids):L.defaults();}
try{state=readState();}catch{warn('저장 기록을 읽지 못했어요. 비공개 브라우징이나 저장 공간을 확인해주세요. 기존 기록은 덮어쓰지 않습니다.');}
let storageBlocked=false;
try{const key=L.KEY+'-check';localStorage.setItem(key,'ok');localStorage.removeItem(key);readState();}catch{storageBlocked=true;}
function change(fn){
 if(storageBlocked){toast('저장할 수 없어 변경하지 않았어요. 브라우저 저장 설정을 확인해주세요.');return false;}
 try{const next=readState();fn(next);next.revision++;const safe=L.validate(next,ids);localStorage.setItem(L.KEY,JSON.stringify(safe));state=safe;return true;}
 catch{warn('기록 저장에 실패했어요. 변경 사항은 반영되지 않았습니다. 백업을 확인해주세요.');return false;}
}
function progress(id){return state.items[id]||L.empty();}
function unit(id){return units.find(u=>u.id===id);}
function currentLevel(){return levels[state.settings.level-1];}
function stageUnits(level=currentLevel()){return units.filter(u=>u.level===level.id);}
function lessonState(level=state.settings.level){return state.lessons[level]||L.blankLesson();}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function btn(text,action,cls){const b=el('button',text,cls);b.type='button';b.onclick=action;return b;}
function confirmAction(title,description,callback){$('confirm-title').textContent=title;$('confirm-description').textContent=description;$('confirm-yes').onclick=()=>{$('confirm').close();callback();};$('confirm').showModal();}
$('confirm-no').onclick=()=>$('confirm').close();
function applySettings(){const s=state.settings;document.documentElement.style.fontSize=s.font+'px';document.body.dataset.theme=s.theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):s.theme;for(const [id,value] of [['font-size',s.font],['theme',s.theme],['speed',s.speed],['reminder-time',s.time]])$(id).value=String(value);$('reminder').checked=s.reminder;}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applySettings);
function showPage(name,autoQuiz=true){if(!['learn','quiz','words','stats','settings'].includes(name))return;if(page!==name)stopAudio();if('speechSynthesis'in window)speechSynthesis.cancel();page=name;if(name!=='quiz')closeQuizExplanation();document.body.dataset.page=name;document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!=='page-'+name);document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(name==='words')renderWords();if(name==='stats')renderStats();if(name==='settings')applySettings();if(name==='quiz'&&!question&&autoQuiz)startQuiz();window.scrollTo({top:0});}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$('refresh-page').onclick=()=>window.location.reload();
for(const level of levels){const option=el('option',`${level.id}단계 · ${level.title}`);option.value=level.id;$('level-select').append(option);}
$('level-select').onchange=()=>{if(change(s=>s.settings.level=Number($('level-select').value))){current=currentLevel().units[0].id;question=null;lessonStep=0;selfIndex=0;checkIndex=0;renderLesson();}else $('level-select').value=state.settings.level;};
function renderLesson(){const level=currentLevel();if(!stageUnits(level).some(u=>u.id===current))current=level.units[0].id;$('level-select').value=level.id;$('level-kind').textContent=level.kind==='word'?'단어 과정 · '+level.id+' / 50':'문장 과정 · '+level.id+'단계';$('level-title').textContent=level.title;$('level-rule').textContent=level.rule;$('level-progress').textContent='다섯 단어를 모두 익히면 다음 단계로 자동 이동해요.';renderGuide();}

function speak(text,rate=state.settings.speed,status=$('speech-status')){if(!('speechSynthesis'in window)){if(status)status.textContent='이 브라우저는 음성 듣기를 지원하지 않아요.';return false;}speechSynthesis.cancel();const voices=speechSynthesis.getVoices();const voice=voices.find(v=>v.lang==='en-US')||voices.find(v=>v.lang.startsWith('en'));const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=rate;if(voice)utterance.voice=voice;utterance.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled'&&status)status.textContent='영어 음성을 재생하지 못했어요. 기기의 영어 음성과 소리 설정을 확인해주세요.';};if(status)status.textContent='기기의 영어 음성으로 재생합니다.';speechSynthesis.speak(utterance);return true;}
function stopAudio(){if('speechSynthesis'in window)speechSynthesis.cancel();}
window.addEventListener('pagehide',stopAudio);
// Quiz: one answer submission per question. Revision prevents stale answers after another tab resets data.
function shuffle(a){return L.shuffle(a);}
let quizLevel=1,roundQueue=[];
function startQuiz(){
 if(lessonState().phase<4){lessonStep=lessonState().phase;showPage('learn',false);renderLesson();toast('기본 3개 학습과 응용 2문제를 먼저 마쳐주세요.');return;}
 try{state=readState();}catch{storageBlocked=true;}
 closeQuizExplanation();quizLevel=state.settings.level;quizPool=stageUnits().map(u=>u.id);roundQueue=[];previous=null;question=null;
 $('quiz-mode').textContent=quizLevel+'단계 · 기본 3개 + 응용 2개';showPage('quiz',false);nextQuestion();
}
$('start-mastery').onclick=startQuiz;
function finishStage(level){
 question=null;roundQueue=[];stopAudio();lessonStep=lessonState().phase;current=currentLevel().units[0].id;
 showPage('learn',false);renderLesson();
 if(level<levels.length)toast(`${level}단계 5개 모두 통과! ${level+1}단계를 시작합니다.`);
 else{toast('60단계를 모두 마쳤어요. 단어장에서 배운 내용을 확인할 수 있어요.');$('course-message').hidden=false;$('course-message').textContent='현재 마지막 단계까지 마쳤어요. 단어장에서 읽는 법과 뜻을 다시 확인해보세요.';}
}
function nextQuestion(){
 try{state=readState();}catch{storageBlocked=true;}
 $('quiz-feedback').textContent='';$('quiz-next').hidden=true;$('quiz-hear').hidden=true;$('typing-answer').hidden=true;$('typing-label').hidden=true;$('typing-submit').hidden=true;$('quiz-content').replaceChildren();
 const pool=quizPool.map(unit).filter(Boolean);
 // Keep the entire group in every round until all its words are mastered.
 const groupComplete=pool.every(u=>progress(u.id).streak>=L.MASTERY);
 const remaining=groupComplete?[]:pool;
 if(!remaining.length){
  if(quizPool.length===5){let advanced=false;if(change(s=>advanced=L.advanceIfMastered(s,quizLevel,quizPool,levels.length))&&advanced){finishStage(quizLevel);return;}}
  question=null;showPage('learn',false);renderLesson();return;
 }
 const remainingIds=remaining.map(u=>u.id);
 roundQueue=roundQueue.filter(id=>remainingIds.includes(id)||unit(id).level<quizLevel);
 if(!roundQueue.length){
  const reviewIds=units.filter(u=>u.level<quizLevel&&progress(u.id).total>0).map(u=>u.id);
  roundQueue=L.mixedRound(remainingIds,reviewIds);
  if(roundQueue[0]===previous&&roundQueue.length>1)[roundQueue[0],roundQueue[1]]=[roundQueue[1],roundQueue[0]];
 }
 const target=unit(roundQueue.shift()),p=progress(target.id),review=target.level<quizLevel;
 const types='speechSynthesis'in window?['reading','meaning','listen','english']:['reading','meaning','english'];const type=types[p.total%types.length];
 question={id:target.id,type,review,answered:false,revision:state.revision};previous=target.id;
 $('quiz-mode').textContent=review?`${target.level}단계 · 이전 단어 확인`:`${quizLevel}단계 · ${target.role==='application'?'응용':'기본'} 연습`;
 $('quiz-count').textContent='단계 완료까지 반복 중';$('quiz-progress').value=p.streak;
 $('quiz-content').append(el('p',{reading:'이 영어는 어떻게 읽을까요? (한글 보조 힌트)',meaning:'단어를 읽고 뜻을 고르세요.',english:'읽는 법과 뜻에 맞는 영어를 고르세요.',listen:'소리를 듣고 영어를 고르세요.'}[type],'question-label'));
 if(type==='listen')$('quiz-content').append(btn('🔊 문제 듣기',()=>speak(target.text,state.settings.speed,$('quiz-feedback')),'primary wide'));
 else $('quiz-content').append(el('h2',type==='reading'||type==='meaning'?target.text:target.reading+' · '+target.meaning,'question-word'+(target.kind==='sentence'?' sentence':'')));
 const list=el('div',undefined,'choices');
 if(type==='reading')for(const hint of readingOptions(target)){const id=hint===target.reading?target.id:'wrong-'+hint;const b=btn(hint,()=>submitAnswer(id));b.dataset.id=id;list.append(b);}
 else{const key=type==='meaning'?'meaning':'text',options=[target],seen=new Set([target[key]]);for(const candidate of shuffle(units.filter(u=>u.level<=target.level&&u.kind===target.kind))){if(seen.has(candidate[key]))continue;seen.add(candidate[key]);options.push(candidate);if(options.length===3)break;}for(const option of shuffle(options)){const b=btn(option[key],()=>submitAnswer(option.id));b.dataset.id=option.id;list.append(b);}}
 $('quiz-content').append(list);
}
function submitAnswer(value){
 if(!question||question.answered)return;const q=question,u=unit(q.id);let latest;
 try{latest=readState();}catch{toast('저장 기록을 읽지 못해 채점하지 않았어요.');return;}
 if(latest.revision!==q.revision){state=latest;toast('다른 화면에서 기록이 바뀌었어요. 새 문제를 보여드릴게요.');nextQuestion();return;}
 const correct=value===u.id;let advanced=false;
 if(!change(s=>{s.items[u.id]=L.answer(s.items[u.id],correct);advanced=L.advanceIfMastered(s,quizLevel,quizPool,levels.length);}))return;
 q.answered=true;if('speechSynthesis'in window)speechSynthesis.cancel();
 if(advanced){finishStage(quizLevel);return;}
 document.querySelectorAll('#quiz-content .choices button').forEach(b=>{b.disabled=true;if(b.dataset.id===u.id)b.classList.add('correct');else if(b.dataset.id===value)b.classList.add('wrong');});
 const p=progress(u.id),details=el('details');details.append(el('summary','읽는 규칙 보기'),el('p',window.READING_LESSONS[u.level].explain||levels[u.level-1].rule,'small'));$('quiz-feedback').replaceChildren(el('strong',correct?'✓ 정답이에요!':'↻ 다시 연습해요.'),el('p',`${u.text} → ${u.reading} · 뜻: ${u.meaning}`),el('p',correct?'단계를 마칠 때까지 계속 연습해요.':'이 단어를 다시 연습해요.'),details);
 $('quiz-count').textContent='단계 완료까지 반복 중';$('quiz-progress').value=p.streak;$('quiz-next').hidden=false;$('quiz-hear').hidden=false;renderLesson();
}
function closeQuizExplanation(){
 $('quiz-explanation').hidden=true;document.querySelector('#page-quiz .quiz-card').hidden=false;
}
function openQuizExplanation(){
 if(!question)return;
 const u=unit(question.id),info=window.READING_LESSONS[u.level],host=$('quiz-explanation-content');
 host.replaceChildren(el('p',`${u.level}단계 · ${levels[u.level-1].title}`,'eyebrow'),el('h2','이렇게 읽어요'));
 const word=el('div',undefined,'explanation-word'),picture=el('span',u.picture,'explanation-picture'),body=el('div');
 const heading=el('h3',u.text);heading.lang='en';body.append(heading,el('p',`읽는 법: ${u.reading}`,'reading-hint'),el('p',`뜻: ${u.meaning}`),pronunciationButton(u));word.append(picture,body);host.append(word,wordReadingGuide(u));
 host.append(el('h3','읽는 규칙'),el('p',info.explain||levels[u.level-1].rule,'rule'));
 const pair=info.pairs.find(parts=>parts[0]?.toLowerCase()===u.text.toLowerCase()||parts[3]?.toLowerCase()===u.text.toLowerCase())||info.pairs[0];
 if(pair){const compare=el('div',undefined,'explanation-compare');compare.append(el('h3','비슷한 단어 비교'));for(const i of [0,3]){const row=el('div',undefined,'explanation-example');row.append(el('strong',pair[i]),el('span',`${pair[i+1]} · ${pair[i+2]}`),btn('🔊',()=>speak(pair[i])));compare.append(row);}host.append(compare);}
 host.append(el('p','한글 읽기 표기는 보조 힌트예요. 소리를 듣고 다시 읽어보세요.','small muted'));
 document.querySelector('#page-quiz .quiz-card').hidden=true;$('quiz-explanation').hidden=false;$('quiz-explanation').scrollTop=0;
}
$('quiz-explain').onclick=openQuizExplanation;
$('quiz-return').onclick=closeQuizExplanation;
$('quiz-form').onsubmit=e=>e.preventDefault();$('quiz-next').onclick=nextQuestion;$('quiz-hear').onclick=()=>{if(question?.answered)speak(unit(question.id).text,state.settings.speed,$('quiz-feedback'));};
function resetOne(u,erase){confirmAction(erase?'이 항목의 기록을 삭제할까요?':'이 항목을 다시 시작할까요?',`${u.text}: ${erase?'진도와 풀이 통계를 삭제합니다.':'연속 정답과 복습 상태를 초기화하고 풀이 통계는 남깁니다.'} 다른 항목은 유지됩니다.`,()=>{if(change(s=>{if(erase)delete s.items[u.id];else if(s.items[u.id])s.items[u.id]=L.reset(s.items[u.id]);})){question=null;renderWords();renderLesson();toast('반영했어요.');}});}
let visibleWords=30;
function renderWords(){const query=$('search').value.trim().toLowerCase(),filter=$('word-filter').value;const results=units.filter(u=>{const p=progress(u.id);return (u.text.toLowerCase().includes(query)||u.meaning.includes(query))&&(filter==='all'||filter==='learned'&&p.total>0||filter==='mastered'&&p.streak===L.MASTERY||filter==='weak'&&p.wrong>0||filter==='due'&&p.total>0&&(p.streak<L.MASTERY||p.due<=Date.now()));});$('search-count').textContent=`${Math.min(visibleWords,results.length)} / ${results.length}개 항목`;$('word-results').replaceChildren();for(const u of results.slice(0,visibleWords)){const p=progress(u.id),row=el('article',undefined,'card word-row');row.append(el('p',`${u.level}단계 · ${u.kind==='word'?'단어':'문장'}`,'small muted'),el('h2',u.text),el('p','읽는 법: '+u.reading),el('p',u.meaning),el('p',`${p.streak===L.MASTERY?'통과':'연습 중'} · 출제 ${p.total} · 오답 ${p.wrong}`,'small muted'));if(p.last)row.append(el('p','마지막 학습 '+new Date(p.last).toLocaleDateString('ko-KR'),'small muted'));const actions=el('div',undefined,'actions');actions.append(pronunciationButton(u),btn('다시 시작',()=>resetOne(u,false)),btn('기록 삭제',()=>resetOne(u,true),'danger'));row.append(actions,wordReadingGuide(u));$('word-results').append(row);}if(!results.length)$('word-results').append(el('p','해당하는 항목이 없어요.'));$('words-more').hidden=results.length<=visibleWords;}
$('search').oninput=()=>{visibleWords=30;renderWords();};$('word-filter').onchange=()=>{visibleWords=30;renderWords();};$('words-more').onclick=()=>{visibleWords+=30;renderWords();};
function renderStats(){const all=Object.values(state.items),total=all.reduce((sum,p)=>sum+p.total,0),wrong=all.reduce((sum,p)=>sum+p.wrong,0);$('stat-cards').replaceChildren();for(const [label,value] of [['학습한 항목',all.filter(p=>p.total>0).length],['숙달 완료',all.filter(p=>p.streak===L.MASTERY).length],['총 풀이',total],['정답률',total?Math.round((total-wrong)/total*100)+'%':'—']]){const card=el('div',undefined,'card stat');card.append(el('strong',String(value)),el('span',label));$('stat-cards').append(card);}$('weak-list').replaceChildren();const weak=units.filter(u=>progress(u.id).wrong>0).sort((a,b)=>progress(b.id).wrong-progress(a.id).wrong).slice(0,10);for(const u of weak){const row=el('div',undefined,'weak-row');row.append(el('span',`${u.text} · 오답 ${progress(u.id).wrong}회`),btn('다시 보기',()=>{if(change(s=>s.settings.level=u.level)){current=u.id;renderLesson();showPage('learn');}}));$('weak-list').append(row);}if(!weak.length)$('weak-list').append(el('p','아직 오답 기록이 없어요. 퀴즈를 풀면 여기에 모아드려요.','muted'));}
for(const [id,key,convert] of [['font-size','font',Number],['theme','theme',String],['speed','speed',Number],['reminder-time','time',String]])$(id).onchange=()=>{change(s=>s.settings[key]=convert($(id).value));applySettings();};$('reminder').onchange=()=>{change(s=>s.settings.reminder=$('reminder').checked);applySettings();};
function download(name,contents,type){const url=URL.createObjectURL(new Blob([contents],{type})),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('export').onclick=()=>download('english-escape-backup-'+localDate()+'.json',JSON.stringify(state,null,2),'application/json');
$('import').onchange=async()=>{const file=$('import').files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('백업 파일이 너무 커요.');selectedImport=L.validate(JSON.parse(await file.text()),ids);confirmAction('백업으로 기록을 교체할까요?','현재 기기의 학습 기록과 설정을 선택한 백업으로 바꿉니다. 기존 기록을 먼저 내보내두세요.',()=>{try{selectedImport.revision=Date.now();localStorage.setItem(L.KEY,JSON.stringify(selectedImport));state=selectedImport;lessonStep=lessonState().phase;storageBlocked=false;$('storage-warning').hidden=true;stopAudio();question=null;current=currentLevel().units[0].id;applySettings();renderLesson();toast('백업을 불러왔어요.');}catch{warn('백업을 저장하지 못했어요. 기존 기록은 변경하지 않았습니다.');}selectedImport=null;});}catch(e){toast(e.message||'백업을 읽지 못했어요.');}finally{$('import').value='';}};
$('reset-progress').onclick=()=>confirmAction('전체 진도를 초기화할까요?','모든 연속 정답·복습 상태를 0으로 바꿉니다. 출제·오답 통계와 설정은 유지합니다.',()=>{if(change(s=>{for(const id of Object.keys(s.items))s.items[id]=L.reset(s.items[id]);s.settings.level=1;s.lessons={};})){question=null;current=currentLevel().units[0].id;renderLesson();toast('전체 진도를 초기화했어요.');}});
$('delete-all').onclick=()=>confirmAction('전체 학습 기록을 삭제할까요?','모든 진도와 풀이 통계를 삭제합니다. 먼저 백업을 권합니다. 화면·알림 설정은 유지됩니다.',()=>{if(change(s=>{s.items={};s.settings.level=1;s.lessons={};})){question=null;current=currentLevel().units[0].id;renderLesson();toast('학습 기록을 삭제했어요.');}});
function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
$('calendar').onclick=()=>{const date=new Date(),[h,m]=state.settings.time.split(':').map(Number);date.setHours(h,m,0,0);if(date<=new Date())date.setDate(date.getDate()+1);const stamp=localDate(date).replaceAll('-','')+'T'+String(h).padStart(2,'0')+String(m).padStart(2,'0')+'00';download('english-study.ics',['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MYSSERI//English Escape//KO','BEGIN:VEVENT','UID:english-study-'+Date.now()+'@mysseri','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp,'DURATION:PT15M','RRULE:FREQ=DAILY','SUMMARY:왕초보 영어 탈출기 · 15분 학습','BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:영어 학습 시간이에요','END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n'),'text/calendar;charset=utf-8');};
function checkReminder(){const s=state.settings;if(!s.reminder||document.hidden||recordBusy||$('confirm').open||$('reminder-dialog').open)return;const now=new Date(),time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');if(time>=s.time&&s.lastReminder!==localDate(now)){if(change(next=>next.settings.lastReminder=localDate(now)))$('reminder-dialog').showModal();}}
$('reminder-close').onclick=()=>$('reminder-dialog').close();setInterval(checkReminder,30000);
window.addEventListener('storage',e=>{if(e.key===L.KEY){try{state=readState();question=null;applySettings();renderLesson();if(page==='words')renderWords();if(page==='stats')renderStats();if(page==='quiz')startQuiz();toast('다른 화면에서 바뀐 기록을 반영했어요.');}catch{warn('다른 화면의 기록을 읽지 못했어요.');}}});
applySettings();lessonStep=lessonState().phase;current=currentLevel().units[0].id;renderLesson();setTimeout(checkReminder,1000);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(()=>$('offline-status').textContent='홈 화면에 추가해 사용하세요. 최초 온라인 방문 후 학습 화면을 오프라인에서도 열 수 있어요. 음성은 기기 환경에 따라 인터넷이 필요합니다.').catch(()=>$('offline-status').textContent='오프라인 저장을 사용할 수 없어요. 온라인에서 계속 학습할 수 있습니다.');

// A lesson teaches first. Revealed examples and self-reading do not add mastery points.
function readingOptions(u){const fixed=window.READING_CHOICES[u.text];if(fixed)return shuffle(fixed);const others=shuffle(units.filter(x=>x.kind===u.kind&&x.level<=u.level&&x.reading!==u.reading));const hints=[u.reading];for(const x of others){if(!hints.includes(x.reading))hints.push(x.reading);if(hints.length===3)break;}return shuffle(hints);}

function setLessonPhase(phase){
 if(change(s=>{s.lessons[s.settings.level]||=L.blankLesson();s.lessons[s.settings.level].phase=Math.max(s.lessons[s.settings.level].phase,phase);})){lessonStep=phase;stopAudio();renderLesson();}
}
function renderGuide(){
 const level=currentLevel(),info=window.READING_LESSONS[level.id],saved=lessonState();
 lessonStep=lessonStep===1?0:Math.min(lessonStep,saved.phase);
 const steps=[0,2,3,4],titles=['기본 3개 배우기','기본 문제','응용 2개','5개 숙달'];
 $('lesson-steps').replaceChildren();steps.forEach((phase,i)=>{const b=btn((i+1)+'. '+titles[i],()=>{stopAudio();lessonStep=phase;renderGuide();});b.disabled=phase>saved.phase;if(phase===lessonStep)b.setAttribute('aria-current','step');$('lesson-steps').append(b);});
 document.querySelectorAll('[data-lesson-step]').forEach(p=>p.hidden=Number(p.dataset.lessonStep)!==lessonStep);
 $('lesson-location').textContent=`수업 ${steps.indexOf(lessonStep)+1} / 4 · ${titles[steps.indexOf(lessonStep)]}`;
 $('base-word-overview').replaceChildren();
 for(const u of stageUnits().filter(u=>u.role==='base'))$('base-word-overview').append(teachingCard(u));
 $('sound-card').replaceChildren();if(info.letter){const card=el('div',undefined,'sound-card');card.append(el('div',info.letter,'sound-title'));const columns=el('div',undefined,'sound-columns');for(const [label,value]of[['알파벳 이름',info.name],['단어 속 소리',info.sound]]){const cell=el('div');cell.append(el('p',label),el('strong',value));columns.append(cell);}card.append(columns);$('sound-card').append(card);}
 $('teacher-explain').textContent=info.explain||level.rule;
 $('reading-comparisons').replaceChildren();for(const pair of info.pairs){const row=el('div',undefined,'comparison'),grid=el('div',undefined,'comparison-grid');for(let j=0;j<2;j++){if(j)grid.append(el('span','→'));const k=j*3,cell=el('div');cell.append(el('strong',pair[k]),el('p',pair[k+1],'reading-hint'),el('p',pair[k+2]),btn('🔊 듣기',()=>speak(pair[k])));grid.append(cell);}row.append(grid);$('reading-comparisons').append(row);}
 $('lesson-back').parentElement.hidden=lessonStep===0;
 renderGateCheck('base');renderGateCheck('application');
 $('mastery-list').replaceChildren();for(const u of stageUnits()){const p=progress(u.id),row=el('div',undefined,'mastery-row');row.append(el('span',`${u.text} · ${u.reading} (${u.role==='base'?'기본':'응용'})`),el('strong',p.streak===L.MASTERY?'통과 ✓':'연습 중'));$('mastery-list').append(row);}
}
function wordReadingGuide(u){
 const guide=window.WORD_GUIDES[u.id],box=el('div',undefined,'word-reading-guide');
 if(!guide)return box;
 box.append(el('strong',u.kind==='sentence'?'문장 읽는 순서':'이 단어 읽는 법'),el('p',(u.kind==='sentence'?'단어 연결: ':'소리 나누기: ')+guide.segments,'sound-breakdown'),el('p',guide.tip));
 if(guide.attention)box.append(el('p',guide.attention,'reading-attention'));
 return box;
}
function pronunciationButton(u){const button=btn('🔊 발음 듣기',()=>speak(u.text));button.setAttribute('aria-label',u.text+' 발음 듣기');return button;}
function teachingCard(u){
 const row=el('article',undefined,'teaching-word');row.dataset.unit=u.id;
 const picture=el('div',u.picture,'teaching-picture');picture.setAttribute('role','img');picture.setAttribute('aria-label',u.meaning);
 const body=el('div');body.append(el('h3',u.text),el('p',u.reading,'reading-hint'),el('p','뜻: '+u.meaning),pronunciationButton(u),btn('천천히 듣기',()=>speak(u.text,.65)),wordReadingGuide(u));
 row.append(picture,body);return row;
}
$('start-basic-check').onclick=()=>{
 if(!change(s=>{const lesson=s.lessons[s.settings.level]||L.blankLesson();lesson.seen=stageUnits().filter(u=>u.role==='base').map(u=>u.id);lesson.phase=Math.max(lesson.phase,2);s.lessons[s.settings.level]=lesson;}))return;
 const saved=lessonState();stopAudio();
 if(saved.basic.length===3&&saved.application.length===2){setLessonPhase(4);startQuiz();}
 else if(saved.basic.length===3)setLessonPhase(3);
 else{lessonStep=2;renderLesson();}
 window.scrollTo({top:0});
};
function continueLessonCheck(role){
 const category=role==='base'?'basic':'application',total=role==='base'?3:2;
 if(lessonState()[category].length<total){renderGateCheck(role);return;}
 setLessonPhase(role==='base'?3:4);
 if(role==='application')startQuiz();
}
function renderGateCheck(role){
 const list=stageUnits().filter(u=>u.role===role),category=role==='base'?'basic':'application',saved=lessonState();
 const target=list.find(u=>!saved[category].includes(u.id)),host=$(role==='base'?'lesson-basic-check':'lesson-application-check');host.replaceChildren();
 if(!target){host.append(el('p',role==='base'?'기본 세 단어를 모두 확인했어요.':'응용 두 문제를 모두 확인했어요.'),btn(role==='base'?'응용 두 문제로 →':'다섯 단어 숙달 훈련으로 →',()=>continueLessonCheck(role),'primary'));return;}
 const card=el('div',undefined,'lesson-check'),choices=el('div',undefined,'choices'),feedback=el('div');let answered=false;
 card.append(el('p',`${role==='base'?'기본':'응용'} 문제 ${saved[category].length+1} / ${list.length}`,'small muted'),el('h4',target.text),el('p','이 영어는 어떻게 읽을까요?'));
 for(const hint of readingOptions(target)){
  const b=btn(hint,()=>{
   if(answered)return;answered=true;for(const button of choices.children)button.disabled=true;
   const correct=hint===target.reading;
   if(correct&&!change(s=>{const lesson=s.lessons[target.level]||L.blankLesson();if(!lesson[category].includes(target.id))lesson[category].push(target.id);s.lessons[target.level]=lesson;})){answered=false;for(const button of choices.children)button.disabled=false;return;}
   feedback.className='check-feedback';feedback.append(el('strong',correct?'✓ 정답이에요!':'↻ 읽는 원리를 다시 확인해요.'),el('p',`${target.text} → ${target.reading} · 뜻: ${target.meaning}`),wordReadingGuide(target),btn('🔊 정답 듣기',()=>speak(target.text)),btn(correct?'계속하기 →':'다시 풀기',()=>correct?continueLessonCheck(role):renderGateCheck(role),'primary'));
  });b.dataset.answer=hint===target.reading?'correct':'wrong';choices.append(b);
 }
 card.append(choices,feedback);host.append(card);
}
$('lesson-back').onclick=()=>{stopAudio();lessonStep=lessonStep===2?0:Math.max(0,lessonStep-1);renderGuide();};

