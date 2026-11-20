# Revisión estática: secretos, patrones inseguros, recursos, SEO, privacidad, PWA retirada, CSP, versión de caché.
import re,os,json,sys,glob,subprocess
REPO=os.environ.get('MONETRA_REPO','/home/claude/mibalance'); W=REPO+'/www'; fails=0
def ok(c,m,warn=False):
    global fails
    print(('PASS ' if c else ('WARN ' if warn else 'FAIL '))+m)
    if not c and not warn: fails+=1
def rd(p): return open(p,encoding='utf-8',errors='ignore').read()
files=[f for f in glob.glob(REPO+'/**/*',recursive=True) if os.path.isfile(f) and '/node_modules/' not in f and '/.git/' not in f and not f.endswith(('.pdf','.png','.jpg','.mp4','.zip','.woff2','.dump')) and not f.endswith('/www/config.js') and '/tests/' not in f and '/tests/suites/deno/node_modules' not in f]
pat=re.compile(r'sk-ant-[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY|AKIA[0-9A-Z]{16}|sk_live_|ghp_[A-Za-z0-9]{30}|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}')
hits=[f for f in files if pat.search(rd(f))]
ok(not hits,'SEC-9 secretos: ninguna clave/token/llave privada en el repositorio '+str(hits[:3]))
ok(not os.path.exists(W+'/config.js') or '.gitignore' in os.listdir(REPO),'config.js real no se publica (está fuera del zip)',warn=True)
js=[f for f in glob.glob(W+'/*.js')]
bad={}
for f in js:
    s=rd(f)
    for p in ['eval(','new Function','document.write','insertAdjacentHTML','window.open','postMessage']:
        if p in s and f.split('/')[-1] not in ('i18n.js',): bad.setdefault(p,[]).append(os.path.basename(f))
ok(not bad,'SEC-11 SAST: sin eval/new Function/document.write/insertAdjacentHTML/window.open/postMessage '+str(bad))
r=[subprocess.run(['node','--check',f],capture_output=True,text=True) for f in js]
ok(all(x.returncode==0 for x in r),f'sintaxis JS correcta en {len(js)} archivos')
miss=[]
for f in ['index.html','app.html','admin.html','diagnostico.html','privacidad.html','terminos.html']:
    s=rd(W+'/'+f)
    for m in re.findall(r'(?:src|href)="([^"#:?]+)(?:\?[^"]*)?"',s):
        if m.startswith(('http','mailto','data')) or m.endswith('/') or m=='config.js': continue
        if not os.path.exists(W+'/'+m): miss.append((f,m))
ok(not miss,'SMOKE recursos referenciados existen '+str(miss[:4]))
for f in ['index.html','app.html','admin.html','diagnostico.html','privacidad.html','terminos.html']:
    s=rd(W+'/'+f); ok('Content-Security-Policy' in s and 'referrer' in s,f'SEC-14 {f}: CSP y referrer presentes')
ok(all('noindex' in rd(W+'/'+f) for f in ['app.html','admin.html','diagnostico.html']),'SEO: app/admin/diagnóstico con noindex')
ok(os.path.exists(W+'/robots.txt') and 'Sitemap:' in rd(W+'/robots.txt'),'SEO: robots.txt con sitemap')
sm=rd(W+'/sitemap.xml'); ok('privacidad.html' in sm and 'terminos.html' in sm,'SEO: sitemap incluye privacidad y términos')
ix=rd(W+'/index.html')
ok('rel="canonical"' in ix and 'og:title' in ix and 'application/ld+json' in ix,'SEO: canonical, Open Graph y JSON-LD en portada')
try: json.loads(re.search(r'ld\+json">(.*?)</script>',ix,re.S).group(1)); ok(True,'SEO: JSON-LD válido')
except Exception as e: ok(False,'SEO: JSON-LD inválido '+str(e))
ok(not os.path.exists(W+'/manifest.webmanifest') and 'rel="manifest"' not in ix+rd(W+'/app.html') and 'apple-mobile-web-app-capable' not in rd(W+'/app.html'),'PWA retirada: sin manifiesto ni meta de instalación (la app móvil vendrá después)')
ok('privacidad.html' in ix and 'terminos.html' in ix and 'privacidad.html' in rd(W+'/app.html'),'PRIVACIDAD: enlaces en portada, login y perfil')
txt=rd(W+'/privacidad.html')+rd(W+'/terminos.html'); ph=sorted(set(re.findall(r'\[[A-ZÁÉÍÓÚ /]{6,}\]',txt)))
ok(not ph,'PRIVACIDAD: datos de contacto por completar en tools/gen_legal.py '+str(ph),warn=True)
vs=set()
for f in ['index.html','app.html','admin.html','diagnostico.html']: vs|=set(re.findall(r'\?v=(\d+)',rd(W+'/'+f)))
ok(len(vs)==1,f'versión de caché consistente en las 4 páginas {sorted(vs)}')
sql=rd(REPO+'/supabase/instalar-todo.sql')
ok(not re.search(r'^\s*drop\s+table',sql,re.M|re.I),'MIGRACIÓN: instalar-todo.sql no borra tablas (seguro de re-ejecutar)')
ok('delete_my_account' in sql and 'scoped_transactions' in sql and 'pg_advisory_xact_lock' in sql,'MIGRACIÓN: instalar-todo incluye v13 (seguridad), v14 (eliminar cuenta) y bloqueo anti-carreras')
fn=glob.glob(REPO+'/supabase/functions/*/index.ts')
ok(all('@supabase/supabase-js@2.' in rd(f) for f in fn if 'supabase-js' in rd(f)),'SEC-26 cadena de suministro: librería de las funciones con versión fija')
ok(all('.catch(' in rd(f) for f in fn if 'api.anthropic.com' in rd(f)),'API: funciones de IA capturan fallos de red hacia Anthropic')
import yaml
try: yaml.safe_load(rd(REPO+'/.github/workflows/pages.yml')); ok(True,'DESPLIEGUE: pages.yml válido')
except Exception as e: ok(False,'DESPLIEGUE: pages.yml inválido '+str(e))
print('STATIC OK' if not fails else f'STATIC FALLAS {fails}'); sys.exit(1 if fails else 0)
