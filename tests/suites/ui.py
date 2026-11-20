exec(open('/tmp/t/mb.py').read().split('async def m():')[0])
import json,re
AX=open('/tmp/t/ax/node_modules/axe-core/axe.min.js').read()
async def mk(b,w,h,lang='es',theme='light',mobile=False,url='app.html'):
    c=await b.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile)
    await c.add_init_script(f"localStorage.setItem('monetra_theme','{theme}');localStorage.setItem('mb_lang','{lang}');sessionStorage.setItem('mb_splash','1')")
    await c.route('**/data.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
    await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
    await c.route('**/open.er-api.com/**',lambda r:r.fulfill(body='{"result":"success","rates":{"USD":1,"CAD":1.4}}',content_type='application/json'))
    await c.route('**/fonts.g*',lambda r:r.abort())
    pg=await c.new_page();pg.on('pageerror',lambda e:errs.append('pageerror:'+str(e)[:80]))
    await pg.goto('http://127.0.0.1:8132/'+url);await pg.wait_for_timeout(2200);return c,pg
SECS=['transactionsSection','categoriesSection','chartsSection','analyticsSection','goalsSection','debtsSection','advisorSection','householdSection','profileSection']
async def go(pg,s):
    await pg.evaluate("s=>document.querySelector('.nav-btn[data-section='+s+']').click()",s);await pg.wait_for_timeout(450)
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    print('## RESPONSIVE: desborde horizontal por tamaño de pantalla')
    bad=[]
    for (w,h,mob,name) in [(320,640,True,'móvil pequeño 320'),(375,667,True,'iPhone SE 375'),(390,844,True,'móvil 390'),(768,1024,True,'tablet 768'),(1024,768,False,'laptop 1024'),(1360,900,False,'escritorio 1360'),(1920,1080,False,'pantalla grande 1920')]:
        c,pg=await mk(b,w,h,mobile=mob)
        for s in SECS:
            await go(pg,s)
            ov=await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
            if ov>2: bad.append((name,s,ov))
        # landing
        await pg.goto('http://127.0.0.1:8132/index.html');await pg.wait_for_timeout(1200)
        ov=await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
        if ov>2: bad.append((name,'landing',ov))
        await c.close()
    ok(not bad,f'sin desborde horizontal en 7 tamaños × 8 pantallas {bad}')
    print('## ACCESIBILIDAD (axe-core, WCAG 2.1 A/AA)')
    for (url,w,nm) in [('index.html',1360,'landing'),('app.html',1360,'app escritorio'),('app.html',390,'app móvil')]:
        c,pg=await mk(b,w,900 if w>500 else 800,mobile=w<500,url=url)
        if url=='app.html':
            res={}
            for s in ['transactionsSection','analyticsSection','profileSection']:
                await go(pg,s)
                await pg.add_script_tag(content=AX) if s=='transactionsSection' else None
                r=await pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa'],resultTypes:['violations']}).then(r=>r.violations.map(v=>[v.id,v.impact,v.nodes.length]))")
                for v in r: res[v[0]]=(v[1],max(res.get(v[0],(0,0))[1],v[2]))
            print(' ',nm,res)
        else:
            await pg.add_script_tag(content=AX)
            r=await pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa'],resultTypes:['violations']}).then(r=>r.violations.map(v=>[v.id,v.impact,v.nodes.length]))")
            print(' ',nm,{v[0]:(v[1],v[2]) for v in r})
        await c.close()
    print('## TECLADO: navegar con Tab hasta el botón guardar')
    c,pg=await mk(b,1360,900)
    seen=[]
    for i in range(40):
        await pg.keyboard.press('Tab');seen.append(await pg.evaluate("document.activeElement.id||document.activeElement.tagName"))
        if seen[-1]=='submitBtn':break
    ok('submitBtn' in seen,f'se llega al botón Guardar solo con Tab ({len(seen)} pulsaciones)')
    vis=await pg.evaluate("(()=>{const e=document.activeElement;const s=getComputedStyle(e);return s.outlineStyle!='none'||s.boxShadow!='none'})()")
    print('  indicador de foco visible en el elemento activo:',vis)
    await pg.keyboard.press('Escape')
    await c.close()
    await b.close()
  print('FAILS',errs)
asyncio.run(m())
