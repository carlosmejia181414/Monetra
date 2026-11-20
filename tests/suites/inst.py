import asyncio,functools,http.server,threading
from playwright.async_api import async_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',8141),functools.partial(Q,directory='/tmp/inst/www')).serve_forever,daemon=True).start()
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch();bad=[];errs=[]
    for pg_ in ['index.html','app.html','admin.html','diagnostico.html','robots.txt','sitemap.xml']:
        pg=await b.new_page();pg.on('pageerror',lambda e:errs.append((pg_,str(e)[:90])))
        pg.on('response',lambda r:bad.append((r.url[-40:],r.status)) if r.status>=400 and 'supabase' not in r.url and 'fonts' not in r.url else None)
        r=await pg.goto('http://127.0.0.1:8141/'+pg_);await pg.wait_for_timeout(1500)
        print(pg_,r.status)
    print('recursos con error:',bad or 'ninguno');print('errores JS:',errs or 'ninguno')
asyncio.run(m())
