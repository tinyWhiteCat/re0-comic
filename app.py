"""Local comic narration workbench. Python 3.10+, FFmpeg with libass."""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import subprocess
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data'
LOCK = threading.Lock()

def project_path(pid):
    if not re.fullmatch(r'[a-f0-9]{32}', pid):
        raise ValueError('无效的项目编号')
    path = DATA / pid
    if not (path / 'project.json').exists():
        raise ValueError('项目不存在')
    return path

def read_project(path):
    return json.loads((path / 'project.json').read_text())

def save_project(path, project):
    tmp = path / 'project.tmp'
    tmp.write_text(json.dumps(project, ensure_ascii=False, indent=2))
    tmp.replace(path / 'project.json')

def timestamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

def validate_scenes(scenes, path, allow_empty=False):
    if not isinstance(scenes, list) or not (0 if allow_empty else 1) <= len(scenes) <= 100:
        raise ValueError('请添加 1–100 个分镜')
    clean = []
    for scene in scenes:
        image = str(scene.get('image', ''))
        if not re.fullmatch(r'[a-f0-9]{32}\.(png|jpg|webp)', image) or not (path / image).is_file():
            raise ValueError('分镜图片不存在')
        duration = float(scene.get('duration', 4))
        if not 0.5 <= duration <= 30:
            raise ValueError('每个分镜时长应为 0.5–30 秒')
        text = str(scene.get('text', '')).strip()
        if len(text) > 500:
            raise ValueError('每个分镜解说最多 500 字')
        clean.append(dict(image=image, duration=duration, text=text))
    return clean

def run(args, cwd):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=1800)
    if result.returncode:
        raise RuntimeError(result.stderr[-2500:])

def render(path):
    try:
        project = read_project(path)
        scenes = validate_scenes(project['scenes'], path)
        width, height = (720, 1280) if project['ratio'] == 'portrait' else (1280, 720)
        subtitles, cursor = [], 0
        for i, scene in enumerate(scenes):
            if scene['text']:
                # Strip subtitle markup and wrap long Chinese narration for readability.
                text = re.sub(r'<[^>]*>|\{[^}]*\}', '', scene['text']).replace('\\', '／')
                lines = '\n'.join(text[n:n+22] for n in range(0, len(text), 22))
                subtitles.append(f'{len(subtitles)+1}\n{timestamp(cursor)} --> {timestamp(cursor+scene["duration"])}\n{lines}\n')
            cursor += scene['duration']
            run(['ffmpeg','-y','-v','error','-threads','2','-loop','1','-i',scene['image'],
                 '-t',str(scene['duration']),'-vf',f'scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x12151c,setsar=1',
                 '-r','24','-c:v','libx264','-threads','2','-preset','fast','-pix_fmt','yuv420p',f'clip-{i}.mp4'],path)
        (path/'subtitles.srt').write_text('\n'.join(subtitles), encoding='utf-8')
        (path/'concat.txt').write_text(''.join(f"file 'clip-{i}.mp4'\n" for i in range(len(scenes))))
        args=['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i','concat.txt']
        if project.get('audio'):
            args += ['-i',project['audio'],'-map','0:v:0','-map','1:a:0','-af','apad','-c:a','aac']
        if subtitles:
            args += ['-vf',"subtitles=subtitles.srt:force_style='FontName=Noto Sans CJK SC,FontSize=22,Outline=2,MarginV=30'"]
        args += ['-t',str(cursor),'-c:v','libx264','-threads','2','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart','render.mp4']
        run(args,path)
        with LOCK:
            project=read_project(path)
            project.update(status='done', error=None)
            save_project(path,project)
    except Exception as exc:
        with LOCK:
            project=read_project(path)
            project.update(status='failed',error=str(exc))
            save_project(path,project)

class Handler(BaseHTTPRequestHandler):
    def respond(self, value, status=200):
        body=json.dumps(value,ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        try:
            route=self.path.split('?')[0]
            if route == '/api/projects':
                self.respond(sorted([read_project(p.parent) for p in DATA.glob('*/project.json')],key=lambda p:p['id'],reverse=True)); return
            if route == '/api/health':
                self.respond({'status':'ok'}); return
            if route.startswith('/files/'):
                _,_,pid,name=route.split('/')
                path=project_path(pid)
                if not re.fullmatch(r'[a-f0-9]{32}\.(png|jpg|webp|mp3|wav|m4a)|render\.mp4|subtitles\.srt',name):
                    raise ValueError('文件不可访问')
                file=path/name
            else:
                file=ROOT/'web'/('index.html' if route=='/' else route.lstrip('/'))
                if not file.resolve().is_relative_to((ROOT/'web').resolve()):
                    raise ValueError('文件不可访问')
            if not file.is_file():
                self.respond({'error':'文件不存在'},404); return
            import mimetypes
            self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
            self.send_header('Content-Length',str(file.stat().st_size)); self.end_headers()
            with file.open('rb') as stream:
                import shutil
                shutil.copyfileobj(stream,self.wfile)
        except (ValueError, OSError):
            self.respond({'error':'请求无效'},400)

    def do_POST(self):
        try:
            # Local-only service; reject cross-origin browser writes.
            if self.headers.get('Origin') and self.headers['Origin'] != 'http://'+self.headers.get('Host',''):
                self.respond({'error':'不允许跨来源请求'},403); return
            length=int(self.headers.get('Content-Length',0))
            if not 0 < length <= 40*1024*1024:
                raise ValueError('请求不能为空，且最大为 40 MB')
            body=json.loads(self.rfile.read(length))
            with LOCK:
                if self.path=='/api/projects':
                    pid=uuid.uuid4().hex; path=DATA/pid; path.mkdir(parents=True)
                    project=dict(id=pid,title=str(body.get('title','未命名作品'))[:100],ratio='portrait',scenes=[],status='draft',audio=None)
                else:
                    _,_,_,pid,action=self.path.split('/')
                    path=project_path(pid); project=read_project(path)
                    if project['status']=='rendering':
                        raise ValueError('正在合成，请完成后再修改')
                    if action=='upload':
                        ext=str(body['extension']).lower().replace('jpeg','jpg')
                        if ext not in ('png','jpg','webp','mp3','wav','m4a'):
                            raise ValueError('不支持的文件格式')
                        content=base64.b64decode(body['content'],validate=True)
                        if len(content)>25*1024*1024:
                            raise ValueError('单文件最多 25 MB')
                        name=uuid.uuid4().hex+'.'+ext
                        (path/name).write_bytes(content)
                        try:
                            probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(path/name)],capture_output=True,text=True,timeout=20,check=True)
                            kinds=[s['codec_type'] for s in json.loads(probe.stdout)['streams']]
                            expected='video' if ext in ('png','jpg','webp') else 'audio'
                            if expected not in kinds: raise ValueError('文件内容与格式不符')
                            if expected == 'video':
                                subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(path/name),'-frames:v','1','-f','null','-'],capture_output=True,timeout=20,check=True)
                        except Exception:
                            (path/name).unlink(missing_ok=True)
                            raise ValueError('无法读取媒体文件')
                        project['status']='draft'
                        if expected=='video':
                            project['scenes'].append(dict(image=name,text='',duration=4))
                        else:
                            project['audio']=name
                    elif action=='save':
                        project['scenes']=validate_scenes(body['scenes'],path,allow_empty=True)
                        project['title']=str(body.get('title',project['title']))[:100]
                        if body.get('ratio') not in ('portrait','landscape'): raise ValueError('无效的画幅')
                        project['ratio']=body['ratio']
                        if body.get('removeAudio'): project['audio']=None
                        project['status']='draft'
                    elif action=='render':
                        validate_scenes(project['scenes'],path)
                        project.update(status='rendering',error=None)
                    else: raise ValueError('未知操作')
                save_project(path,project)
                if self.path.endswith('/render'):
                    threading.Thread(target=render,args=(path,),daemon=True).start()
            self.respond(project)
        except (ValueError,KeyError,TypeError,subprocess.SubprocessError) as exc:
            self.respond({'error':str(exc)},400)
        except Exception:
            self.respond({'error':'服务器处理失败'},500)

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=8000)
    args=parser.parse_args(); DATA.mkdir(exist_ok=True)
    for file in DATA.glob('*/project.json'):
        p=read_project(file.parent)
        if p['status']=='rendering':
            p.update(status='failed',error='服务已重启，请重新合成'); save_project(file.parent,p)
    print(f're0-comic listening on port {args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()

if __name__=='__main__': main()
