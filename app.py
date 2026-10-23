"""Local development app. Add account authentication before public deployment."""
import os
import secrets
import shutil
import subprocess
import tempfile
from pathlib import Path
from flask import Flask, jsonify, render_template, request, session
from pronunciation import assess, normalize_result, AssessmentError

WORDS = {
    'cat': {'text': 'cat', 'meaning': '고양이', 'image': '🐈', 'sounds': 'c · a · t', 'hint': '세 소리를 끊어 연습한 뒤 한 단어로 이어 읽어보세요.'},
    'cap': {'text': 'cap', 'meaning': '모자', 'image': '🧢', 'sounds': 'c · a · p', 'hint': '마지막 p 뒤에 별도의 모음을 붙이지 않도록 들어보세요.'},
    'map': {'text': 'map', 'meaning': '지도', 'image': '🗺️', 'sounds': 'm · a · p', 'hint': '처음 m은 입술을 붙여 시작해요. 모범 발음과 비교해보세요.'},
}

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(SECRET_KEY=os.getenv('SECRET_KEY') or secrets.token_hex(32),
                      MAX_CONTENT_LENGTH=3 * 1024 * 1024,
                      SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Strict',
                      ENABLE_PRONUNCIATION=True)
    if test_config:
        app.config.update(test_config)

    @app.get('/')
    def home():
        session.setdefault('csrf', secrets.token_urlsafe(32))
        return render_template('index.html', csrf=session['csrf'])

    @app.get('/healthz')
    def health():
        return jsonify(status='ok')

    @app.get('/api/lesson')
    def lesson():
        return jsonify(words=[dict(id=k, **v) for k, v in WORDS.items()],
                       assessment_ready=bool(app.config['ENABLE_PRONUNCIATION'] and os.getenv('AZURE_SPEECH_KEY') and os.getenv('AZURE_SPEECH_REGION') and shutil.which('ffmpeg')))

    @app.post('/api/pronunciation')
    def pronunciation():
        if not session.get('csrf') or not secrets.compare_digest(request.headers.get('X-CSRF-Token', ''), session['csrf']):
            return jsonify(message='화면을 새로 열고 다시 시도해주세요.'), 403
        word_id = request.form.get('word_id')
        if word_id not in WORDS:
            return jsonify(message='학습 단어를 다시 선택해주세요.'), 400
        if not app.config['ENABLE_PRONUNCIATION'] or not os.getenv('AZURE_SPEECH_KEY') or not os.getenv('AZURE_SPEECH_REGION'):
            return jsonify(status='unavailable', message='발음 평가 서비스 연결 준비 중입니다. 모범 발음과 내 녹음을 비교하며 연습할 수 있어요.'), 503
        recording = request.files.get('audio')
        if not recording or not recording.mimetype.startswith('audio/'):
            return jsonify(message='녹음된 음성을 보내주세요.'), 400
        if not shutil.which('ffmpeg'):
            return jsonify(message='음성 처리 서비스 준비 중입니다.'), 503
        # TemporaryDirectory removes both input and converted recordings, including on failures.
        try:
            with tempfile.TemporaryDirectory(prefix='english-speech-') as folder:
                source, target = Path(folder) / 'input', Path(folder) / 'output.wav'
                recording.save(source)
                if source.stat().st_size == 0:
                    return jsonify(message='녹음이 비어 있어요. 다시 녹음해주세요.'), 400
                subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe',
                                '-i', str(source), '-t', '20', '-ac', '1', '-ar', '16000',
                                '-c:a', 'pcm_s16le', '-y', str(target)],
                               check=True, capture_output=True, timeout=15)
                result = normalize_result(assess(target.read_bytes(), WORDS[word_id]['text']))
                return jsonify(result)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            return jsonify(status='retry', message='녹음을 처리하지 못했어요. 다시 녹음해주세요.'), 422
        except AssessmentError:
            return jsonify(status='unavailable', message='지금은 평가 결과를 받을 수 없어요. 잠시 후 다시 시도해주세요.'), 502

    @app.errorhandler(413)
    def too_large(error):
        return jsonify(message='녹음이 너무 커요. 15초 이내로 다시 녹음해주세요.'), 413

    @app.after_request
    def privacy(response):
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        response.headers['Permissions-Policy'] = 'microphone=(self)'
        return response
    return app

if __name__ == '__main__':
    create_app().run(host='127.0.0.1', port=5000, debug=False)
