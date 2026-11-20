exec(open('/tmp/t/mb.py').read().split('async def m():')[0])
P1='<img src=x onerror="window.__xss=1">'
P2='"><svg onload="window.__xss=2">'
P3="'+(window.__xss=3)+'"
fk=fake.replace('name:"Supermercado"','name:'+repr(P1).replace("'",'"') if False else 'name:%s'%__import__('json').dumps(P1)).replace('description:"Compra semanal"','description:%s'%__import__('json').dumps(P2)).replace('name:"Carlos Mejía"','name:%s'%__import__('json').dumps('<img src=x onerror="window.__xss=3">')).replace('full_name:"Carlos Mejía"','full_name:%s'%__import__('json').dumps('<img src=x onerror="window.__xss=3">')).replace('name:"Ocio"','name:%s'%__import__('json').dumps('<script>window.__xss=4</script>'))
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for vp,mob in (({'width':1360,'height':900},False),({'width':390,'height':800},True)):
        c=await b.new_context(viewport=vp,is_mobile=mob,has_touch=mob)
        await c.add_init_script("localStorage.setItem('monetra_theme','light');sessionStorage.setItem('mb_splash','1')")
        await c.route('**/data.js*',lambda r:r.fulfill(body=fk,content_type='application/javascript'))
        await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
        await c.route('**/open.er-api.com/**',lambda r:r.fulfill(body='{"result":"success","rates":{"USD":1,"CAD":1.4}}',content_type='application/json'))
        await c.route('**/fonts.g*',lambda r:r.abort())
        pg=await c.new_page();pg.on('pageerror',lambda e:print('ERR',str(e)[:120]))
        await pg.goto('http://127.0.0.1:8132/app.html');await pg.wait_for_timeout(2300)
        for sec in ['transactionsSection','categoriesSection','chartsSection','analyticsSection','advisorSection','householdSection','profileSection']:
            await pg.evaluate("s=>document.querySelector('.nav-btn[data-section='+s+']').click()",sec);await pg.wait_for_timeout(500)
        await pg.evaluate("MonetraPlan.open()");await pg.wait_for_timeout(300)
        x=await pg.evaluate("window.__xss")
        ok(x is None,f'XSS payloads not executed ({"mobile" if mob else "desktop"}) xss={x}')
        # payload text must be visible as text (escaped), not swallowed
        t=await pg.evaluate("document.body.innerText.includes('onerror')")
        print('  payload shown as text:',t)
        await c.close()
    await b.close()
  print('FAILS',errs)
asyncio.run(m())
