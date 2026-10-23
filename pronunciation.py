"""Azure scripted assessment. Never infer pronunciation from transcript alone."""
import base64
import json
import math
import os
import re
import urllib.error
import urllib.request

class AssessmentError(Exception):
    pass

def assess(wav, reference):
    region = os.environ.get('AZURE_SPEECH_REGION', '')
    if not re.fullmatch(r'[a-z][a-z0-9-]{1,40}', region):
        raise AssessmentError('Invalid region')
    parameters = {'ReferenceText': reference, 'GradingSystem': 'HundredMark',
                  'Dimension': 'Comprehensive', 'Granularity': 'Phoneme', 'EnableMiscue': True}
    endpoint = f'https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed'
    req = urllib.request.Request(endpoint, data=wav, method='POST', headers={
        'Ocp-Apim-Subscription-Key': os.environ['AZURE_SPEECH_KEY'],
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Accept': 'application/json',
        'Pronunciation-Assessment': base64.b64encode(json.dumps(parameters).encode()).decode(),
    })
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        raise AssessmentError('Speech service unavailable') from exc

def valid_score(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and 0 <= value <= 100

def normalize_result(payload):
    retry = {'status': 'retry', 'message': '소리를 충분히 확인하지 못했어요. 조용한 곳에서 다시 읽어주세요.'}
    if not isinstance(payload, dict) or payload.get('RecognitionStatus') != 'Success':
        return retry
    hypotheses = payload.get('NBest') or []
    if not hypotheses or not isinstance(hypotheses[0], dict):
        return retry
    best = hypotheses[0]
    scores = best.get('PronunciationAssessment') or best
    accuracy = scores.get('AccuracyScore')
    overall = scores.get('PronScore')
    words = best.get('Words') or []
    if not valid_score(accuracy) or not valid_score(overall) or not words:
        return retry
    # A mismatch or omission must never pass based on a high aggregate score.
    miscue = any((w.get('PronunciationAssessment') or w).get('ErrorType') in ('Omission', 'Insertion', 'Mispronunciation') for w in words)
    passed = accuracy >= 80 and overall >= 80 and not miscue
    details = []
    for word in words:
        for phoneme in word.get('Phonemes') or []:
            score = (phoneme.get('PronunciationAssessment') or phoneme).get('AccuracyScore')
            if valid_score(score) and score < 70:
                details.append({'sound': str(phoneme.get('Phoneme', '')), 'score': round(score)})
    return {'status': 'pass' if passed else 'practice', 'score': round(accuracy),
            'recognized': best.get('Display', ''), 'weak_sounds': details,
            'message': '잘 읽었어요! 연습 기준을 통과했어요.' if passed else '모범 발음을 다시 듣고 천천히 따라 해보세요.',
            'note': '자동 평가 참고 결과입니다. 발음 연습은 퀴즈 연속 정답 기록에 영향을 주지 않아요.'}
