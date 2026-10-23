'use strict';
const $ = id => document.getElementById(id);
let words = [], selected = 0, recorder = null, stream = null, timer = null;
let chunks = [], blob = null, objectUrl = null, cancelled = false, generation = 0, busy = false;
const readSetting = (name, fallback) => {try {return localStorage.getItem(name) || fallback;} catch {return fallback;}};
const saveSetting = (name, value) => {try {localStorage.setItem(name,value);} catch {}};
function applySettings() {
  document.documentElement.style.fontSize = $('text-size').value + 'px';
  document.body.dataset.theme = $('theme').value;
}
$('text-size').value = ['18','20','22'].includes(readSetting('text-size','18')) ? readSetting('text-size','18') : '18';
$('theme').value = readSetting('theme','light') === 'dark' ? 'dark' : 'light';
applySettings();
for (const id of ['text-size','theme']) $(id).onchange = () => {saveSetting(id,$(id).value);applySettings();};
$('settings-open').onclick = () => $('settings').showModal();
$('settings-close').onclick = () => $('settings').close();
function lock(value) {
  busy = value;
  document.querySelectorAll('#words button, #listen, #slow, #evaluate, #discard').forEach(b => b.disabled = value);
}
function clearAudio() {
  $('playback').pause(); $('playback').removeAttribute('src'); $('playback').hidden = true;
  $('submit-area').hidden = true; blob = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
}
function stopTracks() { if (stream) stream.getTracks().forEach(t=>t.stop()); stream = null; }
function stopRecording(discard = false) {
  cancelled = discard; clearTimeout(timer);
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  stopTracks();
}
function render() {
  clearAudio(); $('result').textContent = ''; $('record-status').textContent = ''; $('listen-status').textContent = '';
  const w = words[selected];
  $('word').textContent = w.text; $('meaning').textContent = w.meaning;
  $('picture').textContent = w.image; $('picture').setAttribute('aria-label', w.meaning + ' 그림');
  $('sounds').textContent = w.sounds; $('hint').textContent = w.hint;
  $('position').textContent = `${selected+1} / ${words.length}`;
  [...$('words').children].forEach((b,i)=>b.setAttribute('aria-current',String(i===selected)));
}
function speak(slow) {
  if (!('speechSynthesis' in window)) {$('listen-status').textContent = '이 브라우저에서 음성 재생을 지원하지 않아요.';return;}
  $('playback').pause(); speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(words[selected].text);
  u.lang = 'en-US'; u.rate = slow ? .65 : .85;
  const voice = speechSynthesis.getVoices().find(v=>v.lang==='en-US'); if (voice) u.voice = voice;
  u.onerror = () => {$('listen-status').textContent = '음성을 재생하지 못했어요. 소리 설정을 확인해주세요.';};
  speechSynthesis.speak(u);
}
$('listen').onclick = () => speak(false); $('slow').onclick = () => speak(true);
$('record').onclick = async () => {
  if (recorder && recorder.state === 'recording') {stopRecording();return;}
  if (busy) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    $('record-status').textContent = '녹음을 지원하는 Safari의 보안 연결(HTTPS)에서 열어주세요.';return;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  clearAudio(); $('result').textContent = ''; lock(true);
  const currentGeneration = ++generation;
  $('record').disabled = true; $('record-status').textContent = '마이크 사용을 허용해주세요.';
  try {
    const acquired = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    if (generation !== currentGeneration || document.hidden) {acquired.getTracks().forEach(t=>t.stop());return;}
    stream = acquired; chunks = []; cancelled = false;
    const mime = ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
    recorder = mime ? new MediaRecorder(stream,{mimeType:mime}) : new MediaRecorder(stream);
    recorder.ondataavailable = e => {if(e.data.size) chunks.push(e.data);};
    recorder.onerror = () => {stopRecording(true); $('record-status').textContent = '녹음 중 문제가 생겼어요. 다시 시도해주세요.';};
    recorder.onstop = () => {
      clearTimeout(timer); stopTracks();
      $('record').textContent = '🎤 다시 녹음하기'; $('record').disabled = false; $('cancel').hidden = true; lock(false);
      if (cancelled || generation !== currentGeneration) {clearAudio();return;}
      blob = new Blob(chunks,{type:recorder.mimeType || mime || 'audio/mp4'});
      if (!blob.size) {$('record-status').textContent = '녹음이 비어 있어요. 다시 시도해주세요.';return;}
      objectUrl = URL.createObjectURL(blob); $('playback').src = objectUrl;
      $('playback').hidden = false; $('submit-area').hidden = false;
      $('record-status').textContent = '녹음 완료. 내 목소리를 듣고 평가를 요청해보세요.';
    };
    recorder.start(); $('record').disabled = false; $('record').textContent = '■ 녹음 완료'; $('cancel').hidden = false;
    $('record-status').textContent = '듣고 있어요. 단어를 읽은 뒤 녹음 완료를 눌러주세요.';
    timer = setTimeout(()=>stopRecording(),15000);
  } catch(e) {
    stopTracks(); lock(false); $('record').disabled = false;
    $('record-status').textContent = e.name==='NotAllowedError' ? '마이크 권한이 필요해요. Safari 또는 기기 설정에서 허용해주세요.' : '마이크를 사용할 수 없어요. 연결 상태를 확인해주세요.';
  } finally {if (!recorder || recorder.state !== 'recording') {lock(false);$('record').disabled=false;}}
};
$('cancel').onclick = () => {stopRecording(true);$('record-status').textContent='녹음을 취소했어요.';};
$('discard').onclick = () => {clearAudio();$('result').textContent='';$('record-status').textContent='녹음을 삭제했어요.';};
$('evaluate').onclick = async () => {
  if (!blob || busy) return;
  lock(true); $('record').disabled=true; $('result').textContent='발음을 확인하고 있어요…';
  const data = new FormData(); data.append('word_id',words[selected].id);data.append('audio',blob,'recording');
  const controller = new AbortController(); const timeout = setTimeout(()=>controller.abort(),45000);
  try {
    const response = await fetch('/api/pronunciation',{method:'POST',headers:{'X-CSRF-Token':document.querySelector('meta[name=csrf-token]').content},body:data,signal:controller.signal});
    const result = await response.json(); $('result').replaceChildren();
    const title = document.createElement('strong'); title.textContent = result.status==='pass' ? '✓ 연습 기준 통과' : result.status==='practice' ? '↻ 조금 더 연습해요' : '평가 안내';
    $('result').append(title);
    const message = document.createElement('p');message.textContent=result.message || '다시 시도해주세요.';$('result').append(message);
    if (typeof result.score === 'number') {const score=document.createElement('p');score.textContent=`발음 정확도 ${result.score} / 100`;$('result').append(score);}
    if (result.weak_sounds?.length) {const hint=document.createElement('p');hint.textContent='다시 들어볼 소리: '+result.weak_sounds.map(s=>s.sound).join(', ');$('result').append(hint);}
  } catch { $('result').textContent='연결이 원활하지 않아요. 녹음은 유지되니 잠시 후 다시 요청해주세요.'; }
  finally {clearTimeout(timeout);lock(false);$('record').disabled=false;}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){generation++;stopRecording(true);}});
window.addEventListener('pagehide',()=>{generation++;stopRecording(true);clearAudio();});
(async()=>{try {
  const response=await fetch('/api/lesson');if(!response.ok)throw Error();
  const data=await response.json();words=data.words;
  for(const [i,w] of words.entries()) {const b=document.createElement('button');b.textContent=w.text;const s=document.createElement('span');s.textContent=w.meaning;b.append(s);b.onclick=()=>{selected=i;render();};$('words').append(b);}
  render();if(!data.assessment_ready)$('result').textContent='발음 평가 서비스 연결 준비 중입니다. 지금은 듣기와 녹음·다시 듣기를 연습할 수 있어요.';
} catch {$('record').disabled=true;$('listen').disabled=true;$('slow').disabled=true;$('result').textContent='수업을 불러오지 못했어요. 화면을 새로 열어주세요.';}})();
