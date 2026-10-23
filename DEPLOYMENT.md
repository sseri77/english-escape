# 현재 배포 방식: GitHub Pages

카페24나 별도 Python 서버는 사용하지 않습니다. 현재 웹앱은 `/docs`입니다.

Settings → Pages → Deploy from a branch → main /docs → Save.
GitHub 도구는 Pages 설정 변경 기능을 제공하지 않아 이 설정은 저장소 소유자가 해야 합니다.
Private 저장소의 Pages 사용 가능 여부는 GitHub 플랜에 따라 다릅니다.
공개 범위를 자동 변경하지 않습니다. 실제 배포 주소는 Pages 설정 화면에서 확인합니다.

접속/홈 화면 설치/백업 안내는 README.md를 참고하세요.
루트의 Gunicorn/Flask 파일은 이전 실험본이며 Pages 배포에 사용하지 않습니다.
