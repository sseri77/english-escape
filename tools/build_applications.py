"""Two application items per lesson, followed by five-item mastery."""
from pathlib import Path
import json
ROWS=[
'mat|맷|매트|🧶;rat|랫|쥐|🐀','ten|텐|열|🔟;pet|펫|반려동물|🐾','six|식스|여섯|6️⃣;fin|핀|지느러미|🐟','mop|맙|대걸레|🧹;cot|캇|간이침대|🛏️','run|런|달리다|🏃;nut|넛|견과|🥜',
'fat|팻|뚱뚱한|🐻;pat|팻|가볍게 두드리다|✋','man|맨|남자|👨;lap|랩|무릎 위|🪑','wet|웻|젖은|💦;lip|립|입술|👄','fog|포그|안개|🌫️;hug|허그|껴안다|🫂','vet|벳|수의사|🧑‍⚕️;zip|집|지퍼를 잠그다|🤐',
'club|클럽|동호회|👥;clip|클립|집게|📎','plug|플러그|플러그|🔌;plot|플랏|작은 땅|🏡','brim|브림|모자 챙|👒;cram|크램|쑤셔 넣다|🧳','drag|드래그|끌다|🛷;trim|트림|다듬다|✂️','spin|스핀|돌다|🌀;step|스텝|발걸음|👣',
'pond|판드|연못|🏞️;plant|플랜트|식물|🪴','camp|캠프|야영하다|⛺;list|리스트|목록|📋','shed|셰드|작은 창고|🏚️;dish|디시|접시|🍽️','chat|챗|이야기하다|💬;chop|찹|썰다|🔪','moth|모스|나방|🦋;that|댓|저것|👉',
'name|네임|이름|🏷️;tape|테이프|테이프|📼','time|타임|시간|⏰;line|라인|선|➖','note|노우트|메모|📝;bone|보운|뼈|🦴','tune|튠|곡조|🎵;mule|뮬|노새|🐴','tail|테일|꼬리|🐈;play|플레이|놀다|⚽',
'seed|시드|씨앗|🌱;green|그린|초록색|🟢','meat|미트|고기|🥩;peach|피치|복숭아|🍑','soap|소우프|비누|🧼;grow|그로우|자라다|🌱','dry|드라이|마른|☀️;try|트라이|시도하다|🎯','smile|스마일|미소 짓다|😊;stone|스토운|돌|🪨',
'farm|팜|농장|🚜;shark|샤크|상어|🦈','storm|스톰|폭풍|⛈️;short|쇼트|짧은|📏','shirt|셔트|셔츠|👕;turn|턴|돌다|↩️','pool|풀|수영장|🏊;boot|부트|장화|🥾','cook|쿡|요리하다|🧑‍🍳;look|룩|보다|👀',
'loud|라우드|시끄러운|📢;brown|브라운|갈색|🟤','soil|소일|흙|🪴;boy|보이|소년|👦','draw|드로|그리다|🎨;claw|클로|발톱|🐾','knife|나이프|칼|🔪;wrap|랩|싸다|🎁','face|페이스|얼굴|🙂;giant|자이언트|거인|🧍',
'cups|컵스|컵들|☕;boxes|박시즈|상자들|📦','washed|워시트|씻었다|🧼;needed|니디드|필요했다|🙋','walking|워킹|걷는 중|🚶;reading|리딩|읽는 중|📖','lemon|레먼|레몬|🍋;melon|멜런|멜론|🍈','football|풋볼|축구|⚽;backpack|백팩|배낭|🎒',
'does|더즈|하다 (3인칭)|🛠️;have|해브|가지다|🤲','rice|라이스|쌀밥|🍚;egg|에그|달걀|🥚','hospital|하스피털|병원|🏥;station|스테이션|역|🚉','eat|이트|먹다|🍽️;drink|드링크|마시다|🥤','garden|가든|정원|🌷;summer|서머|여름|☀️',
'I am Tom.|아이 앰 탐|나는 톰이에요.|🙋;It is a dog.|잇 이즈 어 도그|그것은 개예요.|🐕',
'I have a pen.|아이 해브 어 펜|나는 펜이 있어요.|🖊️;I have a map.|아이 해브 어 맵|나는 지도가 있어요.|🗺️',
'I like dogs.|아이 라이크 도그즈|나는 개를 좋아해요.|🐕;I like books.|아이 라이크 북스|나는 책을 좋아해요.|📚',
'The cat is small.|더 캣 이즈 스몰|그 고양이는 작아요.|🐈;The cup is hot.|더 컵 이즈 핫|그 컵은 뜨거워요.|☕',
'I can run.|아이 캔 런|나는 달릴 수 있어요.|🏃;I can sing.|아이 캔 싱|나는 노래할 수 있어요.|🎤',
'The book is on the bed.|더 북 이즈 온 더 베드|책이 침대 위에 있어요.|📖;The toy is in the bag.|더 토이 이즈 인 더 배그|장난감이 가방 안에 있어요.|🧸',
'Is this a pen?|이즈 디스 어 펜|이것은 펜인가요?|🖊️;Can you read?|캔 유 리드|읽을 수 있나요?|📖',
'It is not red.|잇 이즈 낫 레드|그것은 빨간색이 아니에요.|🔵;I cannot swim.|아이 캐낫 스윔|나는 수영할 수 없어요.|🏊',
'I go to the park.|아이 고우 투 더 파크|나는 공원에 가요.|🏞️;I drink milk.|아이 드링크 밀크|나는 우유를 마셔요.|🥛',
'This is my book.|디스 이즈 마이 북|이것은 내 책이에요.|📖;I like my home.|아이 라이크 마이 홈|나는 내 집을 좋아해요.|🏠',
]
assert len(ROWS)==60
out={}
for n,row in enumerate(ROWS,1):
 out[n]=[]
 for i,item in enumerate(row.split(';'),4):
  text,reading,meaning,picture=item.split('|')
  out[n].append(dict(id=f'L{n:02}-{i}',text=text,reading=reading,meaning=meaning,picture=picture,level=n,kind='word' if n<=50 else 'sentence',role='application'))
 assert len(out[n])==2
Path('docs/assets/applications.js').write_text('window.APPLICATIONS='+json.dumps(out,ensure_ascii=False,indent=2)+';\n')
