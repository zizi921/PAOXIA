"""WXML/WXSS browser approximation for layout inspection, not a WeChat runtime."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
source = root / 'miniprogram'
out = root / 'output/ui-preview'
out.mkdir(parents=True, exist_ok=True)
for name in ['home', 'run', 'recap']:
    stem = source / 'pages' / name / name
    markup = stem.with_suffix('.wxml').read_text().replace('{{safeTop}}', '96')
    markup = re.sub(r'<(/?)view\b', r'<\1div', markup)
    markup = re.sub(r'<(/?)text\b', r'<\1span', markup)
    markup = markup.replace('<image ', '<img ').replace('src="/assets/', 'src="/miniprogram/assets/')
    markup = markup.replace("{{paused ? 'Take a breath.' : 'Out there.'}}", 'Out there.').replace("{{paused ? 'Resume' : 'Pause'}}", 'Pause')
    markup = markup.replace('{{elapsedText}}', '00:00:00').replace('{{durationText}}', '9 sec')
    markup = re.sub(r'\{\{[^}]+\}\}', '', markup)
    markup = re.sub(r'aria-label="\{\{.*?\}\}"', 'aria-label="暂停跑步演示"', markup)
    css = (source / 'styles/handwriting.wxss').read_text() + (source / 'styles/typography.wxss').read_text() + (source / 'app.wxss').read_text() + stem.with_suffix('.wxss').read_text()
    css = re.sub(r'@import[^;]+;', '', css).replace('page {', 'body {')
    css = re.sub(r'(-?[\d.]+)rpx', lambda m: f'calc({float(m[1])/7.5} * 1vw)', css)
    js = "document.querySelector('[bindtap=go]')?.addEventListener('click',()=>location.href='run.html');let paused=false,seconds=0;const timer=document.querySelector('.timer');if(timer)setInterval(()=>{if(!paused){seconds++;const h=String(Math.floor(seconds/3600)).padStart(2,'0'),m=String(Math.floor(seconds%3600/60)).padStart(2,'0'),s=String(seconds%60).padStart(2,'0');timer.textContent=`${h}:${m}:${s}`}},1000);document.querySelector('[bindtap=togglePause]')?.addEventListener('click',e=>{paused=!paused;e.target.textContent=paused?'Resume':'Pause';document.querySelector('.headline').textContent=paused?'Take a breath.':'Out there.'});document.querySelector('[bindtap=finish]')?.addEventListener('click',()=>location.href='recap.html');document.querySelector('[bindtap=save]')?.addEventListener('click',()=>location.href='home.html');document.querySelectorAll('.choice').forEach(el=>el.addEventListener('click',()=>{el.parentElement.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}));"
    html = f'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PAOXIA — UI approximation</title><style>body{{margin:0}}button{{cursor:pointer;position:relative;font:inherit}}img{{object-fit:contain}}{css}</style></head><body>{markup}<script>{js}</script></body></html>'
    (out / f'{name}.html').write_text(html)
print('Preview generated from WXML/WXSS. Serve repository root; open /output/ui-preview/home.html.')
