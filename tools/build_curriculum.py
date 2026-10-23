"""Build the reviewed seed curriculum; no external service or account required."""
import json
from pathlib import Path
# Title, concise rule, three practice items (English|Korean|picture).
ROWS = [
('짧은 a 소리','a는 cat에서 /æ/ 소리가 나요. 입을 넓혀 모범 발음을 듣고 따라 해보세요.','cat|고양이|🐈;cap|모자|🧢;map|지도|🗺️'),
('짧은 e 소리','e는 pen에서 /ɛ/ 소리가 나요. 알파벳 이름과 단어 속 소리를 구분해요.','pen|펜|🖊️;net|그물|🥅;hen|암탉|🐔'),
('짧은 i 소리','i는 pig에서 /ɪ/ 소리가 나요. 길게 이라고 늘이지 말고 짧게 들어보세요.','pig|돼지|🐖;pin|핀|📍;sit|앉다|🪑'),
('짧은 o 소리','미국식 영어에서 hot의 o는 /ɑ/ 소리예요. 기기 음성의 모음 소리를 비교해보세요.','hot|뜨거운|♨️;pot|냄비|🍲;top|맨 위|🔝'),
('짧은 u 소리','u는 sun에서 /ʌ/ 소리가 나요. 한글은 힌트일 뿐 실제 소리를 먼저 들어요.','sun|태양|☀️;cup|컵|☕;bus|버스|🚌'),
('-at 단어 가족','앞 자음은 바뀌어도 at 부분은 같은 소리예요. 각 글자를 보고 소리를 합쳐요.','bat|박쥐|🦇;hat|모자|👒;rat|쥐|🐀'),
('-an과 -ap','같은 끝소리를 묶어 연습해요. n과 p의 마지막 소리를 구분해요.','fan|선풍기|🌀;pan|프라이팬|🍳;tap|수도꼭지|🚰'),
('e와 i 구별','모양이 비슷한 단어도 가운데 모음이 바뀌면 소리와 뜻이 달라져요.','bed|침대|🛏️;red|빨간색|🔴;kid|아이|🧒'),
('끝 자음 듣기','단어 끝에 별도의 으 소리를 더하지 않도록 모범 발음을 들어보세요.','dog|개|🐕;log|통나무|🪵;bug|벌레|🐛'),
('짧은 모음 누적 복습','a, e, i, o, u를 구분하며 새 단어에 적용해요. 정답을 보기 전에 읽어보세요.','bag|가방|👜;leg|다리|🦵;mud|진흙|🟤'),
('처음의 bl·cl','자음 두 개의 소리를 순서대로 이어 읽어요. 사이에 불필요한 모음을 넣지 않아요.','black|검은색|⚫;clap|박수 치다|👏;clock|시계|🕰️'),
('처음의 fl·pl','f 또는 p 다음에 l을 이어 읽어요. 각 단어의 처음과 끝을 모두 들어요.','flag|깃발|🚩;flat|평평한|➖;plan|계획|📝'),
('처음의 br·cr','r 앞 자음을 짧게 시작하고 다음 소리로 이어가요.','brick|벽돌|🧱;crab|게|🦀;crib|아기 침대|🛏️'),
('처음의 dr·tr','dr과 tr을 모범 발음으로 듣고 단어 전체로 연결해요.','drum|북|🥁;drop|물방울|💧;trip|여행|🧳'),
('처음의 st·sp·sw','s와 다음 자음의 소리를 이어 읽어요.','stop|멈추다|🛑;spot|점|🔵;swim|수영하다|🏊'),
('끝의 -nd·-nt','끝 자음 두 개를 순서대로 읽어요. 마지막 소리도 놓치지 않아요.','hand|손|✋;sand|모래|🏖️;tent|텐트|⛺'),
('끝의 -mp·-st','자음이 겹쳐도 각 소리가 이어져요. 단어 끝을 모범 음성과 비교해요.','lamp|전등|💡;jump|뛰다|🤸;nest|둥지|🪺'),
('두 글자 SH','sh 두 글자가 합쳐 /ʃ/ 한 소리를 내요.','ship|배|🚢;shop|가게|🏪;fish|물고기|🐟'),
('두 글자 CH','ch는 이 단어들에서 /tʃ/ 소리예요. sh와 비교해 들어요.','chip|감자칩|🥔;chin|턱|🙂;chest|상자|🧰'),
('TH의 두 소리','thin의 th는 /θ/, this의 th는 /ð/예요. 혀끝을 치아 사이에 가볍게 대요.','thin|얇은|📏;this|이것|👇;bath|목욕|🛁'),
('Magic E · a','cap과 cape처럼 자음 하나 뒤의 끝 e가 앞 a를 /eɪ/로 바꾸는 경우를 배워요.','cake|케이크|🎂;lake|호수|🏞️;gate|대문|🚪'),
('Magic E · i','이 단어들의 끝 e는 읽지 않고 앞 i가 /aɪ/ 소리를 내요.','bike|자전거|🚲;kite|연|🪁;five|다섯|5️⃣'),
('Magic E · o','끝 e가 있는 이 단어들은 o가 /oʊ/ 소리를 내요.','home|집|🏠;nose|코|👃;rope|밧줄|🪢'),
('Magic E · u','u는 cube에서 /juː/, flute에서 /uː/예요. 끝 e 규칙에도 차이가 있어요.','cube|정육면체|🧊;tube|관|🧪;flute|플루트|🎵'),
('모음 조합 ai·ay','이 단어들의 ai와 ay는 /eɪ/ 소리를 내요.','rain|비|🌧️;train|기차|🚆;day|날|📅'),
('모음 조합 ee','ee 두 글자가 /iː/ 소리를 내요.','tree|나무|🌳;bee|벌|🐝;feet|발들|🦶'),
('모음 조합 ea','ea는 tea에서 /iː/예요. bread처럼 다른 소리가 나는 예외도 있어요.','tea|차|🍵;sea|바다|🌊;leaf|잎|🍃'),
('모음 조합 oa·ow','이 단어들의 oa와 ow는 /oʊ/예요. ow는 다른 단어에서 소리가 바뀔 수 있어요.','boat|보트|🛶;coat|외투|🧥;snow|눈|❄️'),
('끝의 y','짧은 한 음절 단어의 끝 y가 /aɪ/ 소리를 내는 경우예요.','sky|하늘|🌌;fly|날다|🪽;cry|울다|😢'),
('긴 모음 누적 복습','철자 조합을 먼저 찾고 단어 전체를 읽어요.','name|이름|🏷️;nine|아홉|9️⃣;road|도로|🛣️'),
('모음과 r · ar','ar는 미국식 영어에서 /ɑr/로 이어져요.','car|자동차|🚗;star|별|⭐;park|공원|🏞️'),
('모음과 r · or','or는 이 단어들에서 /ɔr/ 소리예요.','corn|옥수수|🌽;fork|포크|🍴;horse|말|🐎'),
('er·ir·ur','이 단어들의 모음과 r은 비슷한 /ɝ/ 소리로 들려요.','bird|새|🐦;girl|소녀|👧;nurse|간호사|🧑‍⚕️'),
('oo의 긴 소리','moon의 oo는 /uː/예요. 입술 모양과 소리를 함께 익혀요.','moon|달|🌙;food|음식|🍱;spoon|숟가락|🥄'),
('oo의 짧은 소리','book의 oo는 /ʊ/예요. moon의 oo와 비교해요.','book|책|📖;foot|발|🦶;wood|나무 재료|🪵'),
('ou·ow','이 단어들의 ou와 ow는 /aʊ/ 소리예요.','house|집|🏡;mouse|생쥐|🐁;cow|소|🐄'),
('oi·oy','oi와 oy는 /ɔɪ/ 소리예요.','coin|동전|🪙;oil|기름|🛢️;toy|장난감|🧸'),
('au·aw','이 단어들의 모음 조합은 비슷한 소리예요. 미국 영어의 지역에 따라 소리가 달라져요.','sauce|소스|🥫;saw|톱|🪚;paw|동물의 발|🐾'),
('소리 없는 글자','kn의 k, wr의 w, lamb의 b처럼 소리가 나지 않는 글자가 있어요.','knee|무릎|🦵;write|쓰다|✍️;lamb|어린 양|🐑'),
('c와 g의 다른 소리','c와 g는 뒤 글자에 따라 소리가 바뀌기도 해요. 예외도 함께 익혀요.','city|도시|🏙️;ice|얼음|🧊;gem|보석|💎'),
('복수형 끝소리','cats의 s는 /s/, dogs는 /z/, buses의 es는 /ɪz/예요.','cats|고양이들|🐈;dogs|개들|🐕;buses|버스들|🚌'),
('과거형 -ed','-ed는 jumped에서 /t/, played에서 /d/, wanted에서 /ɪd/예요.','jumped|뛰었다|🤸;played|놀았다|⚽;wanted|원했다|🙋'),
('-ing 읽기','-ing를 덩어리로 읽어요. running에서는 n이 겹치고 making에서는 끝 e가 빠져요.','running|달리는 중|🏃;making|만드는 중|🛠️;singing|노래하는 중|🎤'),
('두 음절 단어','음절별로 나눈 뒤 강세가 있는 부분을 더 또렷하게 읽어요.','rabbit|토끼|🐇;sunset|해 질 녘|🌇;picnic|소풍|🧺'),
('합성어','아는 단어 두 개를 붙여 긴 단어를 읽어요.','raincoat|비옷|🧥;bedroom|침실|🛏️;toothbrush|칫솔|🪥'),
('자주 쓰는 불규칙 단어','one과 two의 철자와 소리는 기본 규칙만으로 예측하기 어려워요. 단어별로 익혀요.','one|하나|1️⃣;two|둘|2️⃣;said|말했다|💬'),
('생활 단어 · 음식','소리와 뜻을 함께 연결해요. apple은 두 음절이에요.','apple|사과|🍎;milk|우유|🥛;bread|빵|🍞'),
('생활 단어 · 장소','자주 만나는 장소 이름을 읽어요. school의 ch는 /k/예요.','school|학교|🏫;bank|은행|🏦;market|시장|🛒'),
('생활 단어 · 움직임','동작을 떠올리며 소리를 익혀요. walk의 l은 읽지 않아요.','walk|걷다|🚶;read|읽다 (현재형)|📚;sleep|자다|😴'),
('단어 과정 마무리','앞서 배운 규칙을 긴 생활 단어에 적용해요. 어렵다면 듣고 나눠 읽어요.','morning|아침|🌅;window|창문|🪟;basket|바구니|🧺'),
]
SENTENCES = [
('처음 읽는 문장','문장 첫 글자는 대문자예요. 낱말을 읽은 뒤 한 문장으로 이어 읽어요.','I am Sam.|나는 샘이에요.|🙋;It is a cat.|그것은 고양이예요.|🐈;This is a pen.|이것은 펜이에요.|🖊️'),
('내가 가진 것','I have는 내가 무엇을 가지고 있다는 뜻이에요.','I have a book.|나는 책이 있어요.|📖;I have a bag.|나는 가방이 있어요.|👜;I have a bike.|나는 자전거가 있어요.|🚲'),
('좋아하는 것','I like 다음에 좋아하는 대상을 말해요.','I like milk.|나는 우유를 좋아해요.|🥛;I like cats.|나는 고양이를 좋아해요.|🐈;I like tea.|나는 차를 좋아해요.|🍵'),
('상태 말하기','주어와 be동사 다음에 상태를 나타내는 말을 붙여요.','The sun is hot.|태양은 뜨거워요.|☀️;The bag is red.|가방은 빨간색이에요.|👜;The dog is big.|그 개는 커요.|🐕'),
('할 수 있어요','can 다음에는 동사의 기본형을 써요.','I can swim.|나는 수영할 수 있어요.|🏊;I can read.|나는 읽을 수 있어요.|📖;I can jump.|나는 뛸 수 있어요.|🤸'),
('위치 말하기','in은 안에, on은 위에라는 뜻으로 쓰일 수 있어요.','The cat is on the bed.|고양이가 침대 위에 있어요.|🛏️;The pen is in the bag.|펜이 가방 안에 있어요.|👜;The toy is on the map.|장난감이 지도 위에 있어요.|🗺️'),
('묻고 답하기','물음표가 있는 문장을 듣고 질문하는 억양을 따라 해요.','Is this a book?|이것은 책인가요?|📖;Can you swim?|수영할 수 있나요?|🏊;Do you like milk?|우유를 좋아하나요?|🥛'),
('부정문 읽기','not은 부정의 뜻을 더해요. 문장의 뜻이 어떻게 바뀌는지 봐요.','It is not hot.|그것은 뜨겁지 않아요.|❄️;I do not like rain.|나는 비를 좋아하지 않아요.|🌧️;I cannot fly.|나는 날 수 없어요.|🪽'),
('일상 문장','자주 쓰는 짧은 문장을 덩어리로 읽어요.','I go to school.|나는 학교에 가요.|🏫;I read a book.|나는 책을 읽어요.|📚;I walk in the park.|나는 공원에서 걸어요.|🚶'),
('문장 복습','뜻을 떠올린 뒤 문장 전체를 읽어요. 단어 사이를 자연스럽게 이어보세요.','Good morning.|좋은 아침이에요.|🌅;This is my home.|이곳은 내 집이에요.|🏠;I like this book.|나는 이 책이 좋아요.|📖'),
]
levels=[]
for n,(title,rule,items) in enumerate(ROWS+SENTENCES,1):
 units=[]
 for i,item in enumerate(items.split(';')):
  text,meaning,picture=item.split('|');units.append({'id':f'L{n:02}-{i+1}','text':text,'meaning':meaning,'picture':picture})
 levels.append({'id':n,'title':title,'rule':rule,'kind':'word' if n<=50 else 'sentence','units':units})
assert len(ROWS)==50 and len(levels)==60
Path('docs/assets/curriculum.js').write_text('/* Seed curriculum v1. Original examples. */\nwindow.CURRICULUM = '+json.dumps(levels,ensure_ascii=False,indent=2)+';\n')
