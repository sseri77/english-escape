# 서비스 배포 준비

## 현재 상태
GitHub 소스 저장 완료. 아직 호스팅에 배포되지 않았으며 접속 URL은 없음.
카페24 공간 조회에서 cashbook과 mysseri가 각 공간을 사용 중이며 빈 공간 0개.
새 영어앱은 별도 빈 공간이 필요. 기존 프로젝트를 삭제/덮어쓰지 않음.

## 첫 배포 범위
단어 3개 학습, 기기 음성 듣기, 마이크 녹음/재생, 화면 설정을 확인하는 개발 미리보기.
로그인/학습 DB/전체 단계/알림은 아직 구현 전.
운영 entry point에서는 유료 음성 평가 API를 비활성화함.
계정별 접근 제어와 사용량 제한이 준비된 뒤 별도 연결/검증.
현재는 개인정보·진도·녹음의 서버 영구 저장 없음.

## Python 호스팅 설정
- Python 3.11 이상.
- 설치: `python -m pip install -r requirements.txt`
- 실행: `gunicorn --config gunicorn.conf.py wsgi:app`
- PORT는 호스팅에서 제공하는 내부 포트 사용. 기본 8000.
- 상태 확인: GET `/healthz`, 정상 응답 `{"status":"ok"}`.
- SECRET_KEY: 서버 비밀 환경변수에 32자 이상 난수 설정.
  예: 안전한 로컬 환경에서 Python secrets.token_hex(32)로 생성 후 호스팅 비밀값으로 등록.
  실제 값은 GitHub/커밋/문서에 저장하지 않음.
- HTTPS 종료는 호스팅에서 담당. Secure 세션 쿠키 때문에 실제 접속은 HTTPS 필수.
- FFmpeg는 발음 평가 활성화 때 필요. 녹음/재생만 제공하는 첫 미리보기에는 불필요.
- Dockerfile/docker-compose는 생성하지 않음.

## 카페24 배포 전 확인
1. 빈 공간 1개 확보.
2. 카페24의 GitHub 연결에서 sseri77/english-escape 접근 허용 확인.
3. Python 실행 명령과 포트 규약을 실제 호스팅 가이드에 맞춰 확인.
4. 비밀 환경변수 설정, 새 공간에 배포.
5. HTTPS 주소와 healthz 확인, iPhone에서 듣기/마이크 권한/녹음 실기기 테스트.

현재 파일은 범용 Gunicorn 실행 준비이며, 카페24의 실제 런타임 설정과 배포 검증은 남아 있음.
