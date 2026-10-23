import copy
import io
import os
import unittest
import wave
from unittest.mock import patch
from app import create_app
from pronunciation import normalize_result, assess, AssessmentError
SAMPLE={'RecognitionStatus':'Success','NBest':[{'Display':'Cat.','AccuracyScore':92,'PronScore':90,'Words':[{'Word':'cat','AccuracyScore':92,'ErrorType':'None','Phonemes':[{'Phoneme':'ae','AccuracyScore':65}]}]}]}
class Results(unittest.TestCase):
 def test_official_rest(self):
  r=normalize_result(SAMPLE);self.assertEqual(r['status'],'pass');self.assertEqual(r['weak_sounds'][0]['sound'],'ae')
 def test_transcript_not_score(self):self.assertEqual(normalize_result({'RecognitionStatus':'Success','NBest':[{'Display':'Cat.'}]})['status'],'retry')
 def test_silence(self):self.assertEqual(normalize_result({'RecognitionStatus':'InitialSilenceTimeout'})['status'],'retry')
 def test_wrong_word(self):
  for error in ['Omission','Insertion','Mispronunciation']:
   data=copy.deepcopy(SAMPLE);data['NBest'][0]['Words'][0]['ErrorType']=error;self.assertEqual(normalize_result(data)['status'],'practice')
 def test_low_score(self):
  data=copy.deepcopy(SAMPLE);data['NBest'][0]['AccuracyScore']=55;self.assertEqual(normalize_result(data)['status'],'practice')
 def test_bad_scores(self):
  for score in [None,True,'90',float('nan'),101,-1]:
   data=copy.deepcopy(SAMPLE);data['NBest'][0]['AccuracyScore']=score;self.assertEqual(normalize_result(data)['status'],'retry')
 @patch.dict(os.environ,{'AZURE_SPEECH_REGION':'example.com/evil'})
 def test_region_validation(self):
  with self.assertRaises(AssessmentError):assess(b'','cat')
class API(unittest.TestCase):
 def setUp(self):
  self.client=create_app({'TESTING':True,'SECRET_KEY':'test-only'}).test_client();self.client.get('/')
  with self.client.session_transaction() as s:self.token=s['csrf']
 def post(self,word='cat',audio=b'x'):
  return self.client.post('/api/pronunciation',headers={'X-CSRF-Token':self.token},data={'word_id':word,'audio':(io.BytesIO(audio),'voice.wav','audio/wav')})
 def test_csrf(self):self.assertEqual(self.client.post('/api/pronunciation').status_code,403)
 @patch.dict(os.environ,{},clear=True)
 def test_unconfigured_no_score(self):
  r=self.post();self.assertEqual(r.status_code,503);self.assertNotIn('score',r.json)
 def test_unknown_word(self):self.assertEqual(self.post('arbitrary text').status_code,400)
 @patch.dict(os.environ,{'AZURE_SPEECH_KEY':'test','AZURE_SPEECH_REGION':'eastus'})
 @patch('app.assess',return_value=SAMPLE)
 def test_wav_conversion(self,mock):
  audio=io.BytesIO()
  with wave.open(audio,'wb') as wav:
   wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(16000);wav.writeframes(b'\0\0'*16000)
  r=self.post(audio=audio.getvalue());self.assertEqual(r.status_code,200);self.assertEqual(r.json['status'],'pass')
  self.assertTrue(mock.call_args.args[0].startswith(b'RIFF'));self.assertEqual(mock.call_args.args[1],'cat')
 @patch.dict(os.environ,{'AZURE_SPEECH_KEY':'test','AZURE_SPEECH_REGION':'eastus'})
 @patch('app.assess')
 def test_invalid_audio(self,mock):self.assertEqual(self.post().status_code,422);mock.assert_not_called()
 def test_upload_limit(self):self.assertEqual(self.post(audio=b'x'*(4*1024*1024)).status_code,413)
if __name__=='__main__':unittest.main()
