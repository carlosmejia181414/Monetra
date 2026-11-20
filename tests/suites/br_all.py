exec(open('/tmp/t/mb.py').read().split('async def run(b')[0])
import json,re
SECS=['transactionsSection','categoriesSection','analyticsSection','chartsSection','advisorSection','goalsSection','debtsSection','householdSection','profileSection']
async def ctx(b,w,h,lang='es',theme='dark',mobile=False,offline=False,fakedata=True):
    c=await b.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile)
    await c.add_init_script(f"localStorage.setItem('monetra_theme','{theme}');localStorage.setItem('mb_lang','{lang}');sessionStorage.setItem('mb_splash','1')")
    if fakedata: await c.route('**/data.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
    await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
    await c.route('**/open.er-api.com/**',lambda r:r.abort() if offline else r.fulfill(body='{"result":"success","rates":{"USD":1,"CAD":1.4}}',content_type='application/json'))
    await c.route('**/fonts.g*',lambda r:r.abort())
    return c
async def goto(c):
    pg=await c.new_page();pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)));await pg.goto('http://127.0.0.1:8132/app.html');await pg.wait_for_timeout(2000);return pg
async def go(pg,s,mobile):
    await pg.evaluate("s=>{const b=document.querySelector('.nav-btn[data-section=\"'+s+'\"]');if(b)b.click()}",s);await pg.wait_for_timeout(350)
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    print('## 17 RESPONSIVE')
    for w,h,mob in [(320,640,True),(360,740,True),(390,800,True),(768,1024,True),(1024,768,False),(1440,900,False),(1920,1080,False)]:
        c=await ctx(b,w,h,mobile=mob);pg=await goto(c);bad=[]
        for s in SECS:
            await go(pg,s,mob)
            r=await pg.evaluate("""()=>{const W=document.documentElement.clientWidth;const o=document.documentElement.scrollWidth-W;
              const off=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width||!e.offsetParent)return false;if(e.closest('.sidebar,#mobileBar,[hidden],.hidden,.modal-backdrop,#gdBox,.table-wrap,.scroll-x,pre,svg'))return false;return r.right>W+2&&getComputedStyle(e).position!=='fixed'}).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,25));return {o,off}}""")
            if r['o']>2 or [x for x in r['off'] if not x.startswith(('TABLE','THEAD','TR','TD','TH'))]: bad.append((s,r))
        ok(not bad,f'ancho {w}px: sin desbordes en 9 secciones'+(' '+json.dumps(bad)[:300] if bad else ''))
        await c.close()
    print('## 18 TECLADO / ACCESIBILIDAD')
    c=await ctx(b,1280,900);pg=await goto(c)
    seen=set()
    for i in range(40):
        await pg.keyboard.press('Tab');seen.add(await pg.evaluate("document.activeElement&&(document.activeElement.id||document.activeElement.tagName+':'+(document.activeElement.textContent||'').trim().slice(0,12))"))
    ok(len(seen)>=15,f'Tab recorre {len(seen)} controles distintos')
    vis=await pg.evaluate("(()=>{const e=document.activeElement;if(!e)return false;const s=getComputedStyle(e);return s.outlineStyle!=='none'||s.boxShadow!=='none'})()")
    ok(vis,'el control con foco muestra indicador visible')
    un=await pg.evaluate("[...document.querySelectorAll('button,a[href],input,select,textarea')].filter(e=>e.offsetParent&&!(e.getAttribute('aria-label')||e.textContent.trim()||e.labels&&e.labels.length||e.title||e.placeholder||e.getAttribute('aria-labelledby'))).map(e=>e.outerHTML.slice(0,60)).slice(0,5)")
    ok(not un,'todos los controles visibles tienen nombre accesible '+json.dumps(un,ensure_ascii=False))
    ok(await pg.evaluate("document.documentElement.lang.length>=2"),'html lang definido')
    await go(pg,'goalsSection',False);await pg.click('#goalNewBtn');await pg.wait_for_timeout(300)
    ok(await pg.is_visible('#goalForm'),'modal abre');await pg.keyboard.press('Escape');await pg.wait_for_timeout(300)
    ok(not await pg.is_visible('#goalForm'),'Escape cierra el modal')
    await pg.click('#goalNewBtn');await pg.wait_for_timeout(300)
    inside=[]
    for i in range(14):
        await pg.keyboard.press('Tab');inside.append(await pg.evaluate("!!document.activeElement.closest('.modal')"))
    ok(all(inside),'el foco no escapa del modal con Tab (trampa de foco)')
    await c.close()
    print('## 29 OFFLINE / RED')
    c=await ctx(b,1280,900);pg=await goto(c)
    await c.set_offline(True);await pg.wait_for_timeout(300)
    await go(pg,'goalsSection',False);await pg.click('#goalNewBtn');await pg.fill('#gName','Offline');await pg.fill('#gTarget','100');await pg.click('#goalForm button[type=submit]');await pg.wait_for_timeout(800)
    ok(await pg.is_visible('body'),'sin red: la app no se rompe')
    ok(len([e for e in errs if 'pageerror' in e])==0,'sin red: sin errores JS no capturados '+str([e for e in errs if 'pageerror' in e][:2]))
    await c.set_offline(False);await c.close()
    c=await ctx(b,1280,900,offline=True);pg=await goto(c)
    ok(await pg.is_visible('.sidebar'),'tipo de cambio caído: la app carga igual')
    await c.close()
    print('## 24 SOAK')
    c=await ctx(b,1280,900);pg=await goto(c);cd=await c.new_cdp_session(pg);await cd.send('HeapProfiler.enable')
    async def heap():
        await cd.send('HeapProfiler.collectGarbage');r=await cd.send('Runtime.getHeapUsage');return r['usedSize']/1e6
    h0=await heap();N=0
    for k in range(60):
        for s in SECS: await go(pg,s,False);N+=1
        if k in(19,39): print(f'  vuelta {k}: heap {await heap():.1f} MB')
    h1=await heap();nodes=await pg.evaluate("document.querySelectorAll('*').length")
    print(f'  heap inicial {h0:.1f} MB, final {h1:.1f} MB tras {N} cambios de sección, nodos DOM {nodes}')
    ok(h1-h0<15,f'sin fuga de memoria significativa (+{h1-h0:.1f} MB)')
    await c.close()
    await b.close()
  print('FALLAS',errs) if errs else print('BROWSER OK')
asyncio.run(m())
