import base64
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import time
import unittest
import urllib.request
import urllib.error
import app

class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.original=app.DATA
        app.DATA=Path(cls.temp.name)
        cls.server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        cls.base=f'http://127.0.0.1:{cls.server.server_port}'
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        image=app.DATA/'sample.png'
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=0x536a82:s=320x480','-frames:v','1','-threads','1',str(image)],check=True)
        cls.image=base64.b64encode(image.read_bytes()).decode()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();app.DATA=cls.original;cls.temp.cleanup()

    def request(self,path,body=None):
        req=urllib.request.Request(self.base+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(req) as response: return json.load(response)

    def test_complete_video_workflow(self):
        p=self.request('/api/projects',{'title':'测试漫画'})
        route=f'/api/projects/{p["id"]}'
        p=self.request(route+'/upload',{'extension':'png','content':self.image})
        p['scenes'][0].update(text='一场奇妙的冒险，就此开始。',duration=0.5)
        p=self.request(route+'/save',dict(p,ratio='landscape'))
        audio=app.DATA/'voice.wav'
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=0.2',str(audio)],check=True)
        p=self.request(route+'/upload',{'extension':'wav','content':base64.b64encode(audio.read_bytes()).decode()})
        self.assertEqual(self.request(route+'/render',{})['status'],'rendering')
        for _ in range(200):
            p=next(item for item in self.request('/api/projects') if item['id']==p['id'])
            if p['status']!='rendering': break
            time.sleep(.1)
        self.assertEqual(p['status'],'done',p.get('error'))
        path=app.project_path(p['id'])
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path/'render.mp4')]))
        video=next(s for s in probe['streams'] if s['codec_type']=='video')
        self.assertEqual((video['width'],video['height']),(1280,720))
        self.assertTrue(any(s['codec_type']=='audio' for s in probe['streams']))
        self.assertAlmostEqual(float(probe['format']['duration']),.5,delta=.15)
        self.assertIn('奇妙的冒险',(path/'subtitles.srt').read_text())
        # A genuinely decodable video, not just an existing output path.
        subprocess.run(['ffmpeg','-v','error','-i',str(path/'render.mp4'),'-f','null','-'],check=True)
        self.request(route+'/save',dict(p,scenes=[]))
        with self.assertRaises(urllib.error.HTTPError): self.request(route+'/render',{})

    def test_invalid_media_and_path_rejected(self):
        p=self.request('/api/projects',{'title':'validation'})
        route=f'/api/projects/{p["id"]}'
        for payload in ({'extension':'png','content':base64.b64encode(b'not an image').decode()}, {'extension':'py','content':self.image}):
            with self.assertRaises(urllib.error.HTTPError): self.request(route+'/upload',payload)
        with self.assertRaises(urllib.error.HTTPError):
            self.request(route+'/save',dict(p,scenes=[{'image':'../../README.md','duration':4,'text':''}]))
        self.assertFalse(list(app.project_path(p['id']).glob('*.png')))

if __name__=='__main__': unittest.main()
