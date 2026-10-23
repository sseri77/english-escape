/* Pure learning rules, shared by the browser and Node tests. */
(function(root){
'use strict';
const KEY='english-escape-v2';
const MASTERY=5;
const defaults=()=>({version:2,revision:0,settings:{level:1,font:18,theme:'light',speed:.85,reminder:false,time:'19:00',lastReminder:''},items:{},lessons:{}});
const empty=()=>({streak:0,total:0,wrong:0,last:0,due:0,interval:0});
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
function validate(input,ids){
 if(!input||input.version!==2||!input.settings||!input.items||typeof input.items!=='object'||Array.isArray(input.items))throw Error('지원하지 않는 백업 형식입니다.');
 const out=defaults(),s=input.settings;
 if(Number.isInteger(s.level)&&s.level>=1&&s.level<=60)out.settings.level=s.level;
 if([18,20,22].includes(s.font))out.settings.font=s.font;
 if(['light','dark','system'].includes(s.theme))out.settings.theme=s.theme;
 if([.65,.85,1].includes(s.speed))out.settings.speed=s.speed;
 out.settings.reminder=s.reminder===true;
 if(/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time))out.settings.time=s.time;
 if(typeof s.lastReminder==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.lastReminder))out.settings.lastReminder=s.lastReminder;
 for(const [id,p] of Object.entries(input.items)){
  if(!ids.has(id))continue;
  if(!p||!integer(p.streak,10)||!integer(p.total,10000000)||!integer(p.wrong,p.total)||!integer(p.last,8640000000000000)||!integer(p.due,8640000000000000)||!integer(p.interval,5)||p.streak>p.total-p.wrong)throw Error('학습 기록 값이 올바르지 않습니다.');
  // Saved progress from the original ten-answer course counts toward the new goal.
  out.items[id]={streak:Math.min(MASTERY,p.streak),total:p.total,wrong:p.wrong,last:p.last,due:p.streak>=MASTERY&&p.due===0?p.last+86400000:p.due,interval:p.streak>=MASTERY&&p.interval===0?1:p.interval};
 }
 if(input.lessons!==undefined){
  if(!input.lessons||typeof input.lessons!=='object'||Array.isArray(input.lessons))throw Error('수업 기록이 올바르지 않습니다.');
  for(const [key,value]of Object.entries(input.lessons)){
   if(!/^(?:[1-9]|[1-5][0-9]|60)$/.test(key))continue;
   if(!value||!integer(value.phase,4))throw Error('수업 순서가 올바르지 않습니다.');
   const clean=blankLesson();clean.phase=value.phase;clean.complete=value.complete===true;
   for(const category of ['seen','basic','application']){
    if(!Array.isArray(value[category]))throw Error('수업 풀이 기록이 올바르지 않습니다.');
    clean[category]=[...new Set(value[category].filter(id=>ids.has(id)&&id.startsWith('L'+key.padStart(2,'0')+'-')))];
   }
   out.lessons[key]=clean;
  }
 }
 out.revision=integer(input.revision,Number.MAX_SAFE_INTEGER)?input.revision:0;
 return out;
}
function answer(progress,correct,now=Date.now()){
 const p={...empty(),...progress};p.total++;p.last=now;
 if(correct){p.streak=Math.min(MASTERY,p.streak+1);if(p.streak===MASTERY&&(!progress||progress.streak<MASTERY||now>=p.due)){const days=[1,3,7,14,30];p.due=now+days[Math.min(p.interval,4)]*86400000;p.interval=Math.min(5,p.interval+1);}}
 else{p.streak=0;p.wrong++;p.due=0;p.interval=0;}
 return p;
}
function reset(progress){return {...empty(),...progress,streak:0,due:0,interval:0};}
function normalize(text){return text.normalize('NFKC').toLowerCase().replace(/[.!?,]/g,'').replace(/\s+/g,' ').trim();}
function blankLesson(){return {phase:0,seen:[],basic:[],application:[],complete:false};}
function shuffle(list,rng=Math.random){const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function mixedRound(targetIds,reviewIds,rng=Math.random){const reviews=shuffle([...new Set(reviewIds)],rng).slice(0,1+Math.floor(rng()*2));return shuffle([...targetIds,...reviews],rng);}
function advanceIfMastered(state,level,targetIds,lastLevel=60){
 if(targetIds.length!==5||targetIds.some(id=>!state.items[id]||state.items[id].streak<MASTERY))return false;
 const lesson=state.lessons[level]||blankLesson();if(lesson.phase!==4)return false;
 lesson.complete=true;state.lessons[level]=lesson;
 if(level<lastLevel){state.settings.level=level+1;state.lessons[level+1]||=blankLesson();}
 return true;
}
const api={KEY,MASTERY,defaults,empty,validate,answer,reset,normalize,blankLesson,shuffle,mixedRound,advanceIfMastered};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Learning=api;
})(typeof window!=='undefined'?window:globalThis);
