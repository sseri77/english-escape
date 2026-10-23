# 왕초보 영어 탈출기 · 첫 발음 연습 개발본

## 이번 구현
- Python Flask 서버, 반응형 단어 학습 화면, cat/cap/map 3개 샘플.
- 기기 영어 음성으로 모범 발음/느린 듣기. 음성 품질은 기기 설정에 따름.
- 마이크 허용, 최대 15초 녹음, 취소, 다시 듣기, 삭제, 명시적 평가 전송.
- Safari MP4 및 WebM 녹음을 FFmpeg로 16 kHz mono PCM WAV 변환.
- Azure Speech REST 발음 평가 어댑터. 키는 서버 환경변수에만 저장.
- 서비스 미설정, 무음, 점수 누락, 서버 오류는 점수나 통과를 만들지 않음.
- 정확도와 종합 점수 모두 80 이상이고 단어 오류가 없으면 연습 기준 통과.
  이는 앱의 임시 기준이며 실사용 검증으로 조정해야 함. 영구적인 능력 판정 아님.
- 발음 결과는 단어 퀴즈와 분리. 녹음과 발음 결과는 영구 저장하지 않음.
- 밝은/어두운 화면, 18/20/22px 글자 선택. 화면 설정만 브라우저에 저장.
- 외부 폰트 요청 없이 시스템 글꼴 사용. Pretendard 파일은 아직 포함 안 됨.
- SVG 브랜드 아이콘 초안. iOS 홈 화면 PNG와 manifest는 후속 작업.

## 로컬 실행
Python 3.11 이상과 FFmpeg 설치 필요.

```sh
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

http://127.0.0.1:5000 열기.
`.env.example`은 변수 이름 참고용이며 자동 로드하지 않음.
평가 연결에는 서버 환경에 SECRET_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION 설정 필요.
키는 GitHub나 채팅에 올리지 말 것. Azure 리소스와 사용 한도/과금 확인 후 연결.
키 없이도 듣기와 녹음/재생 가능.

```sh
python -m unittest discover -s tests -v
node --check static/app.js
```

## 공개 서비스 전 남은 작업
현재 로컬 개발본이며 배포되지 않음. Google 로그인/계정별 접근 제어,
요청 횟수/비용 제한, HTTPS, 운영 WSGI 서버, 음성 처리 동시 실행 제한 추가 필요.
iPhone 마이크에는 HTTPS 또는 동일 기기의 localhost 필요.
평가 요청 시 Azure로 음성이 전송됨을 화면에 고지.
임시 파일은 요청 종료/실패 때 삭제. 외부 서비스의 음성 처리 정책은 연결 때 확인.
실제 API와 발음 정확도, 아이폰/이어폰 실기기 검증은 아직 미실시.

## 전체 요구사항 후속 순서
1. 사용자별 DB 저장 및 구글 로그인.
2. 단어별 10회 연속 정답, 해당 단어만 오답 초기화, 중복 제출 방지.
3. 단어 검색/통계/단어별 초기화와 기록 삭제/전체 초기화.
4. 1~50단계 파닉스 단어 교재, 51단계 이후 문장 중심 학습.
5. 간격 복습, 다양한 문제 유형, 학습 단계와 날짜 구분.
6. PWA 홈 화면 설치, 정식 PNG 아이콘, 예약 푸시.
7. 정식 그림/음소별 음성 자산과 교재 검수.

## 공식 API 참고
https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short
https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
