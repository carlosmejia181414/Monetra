exec(open('/tmp/t/mb.py').read().split('async def run(b')[0])
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch();viol=[]
    for page in ['index.html','app.html','admin.html','diagnostico.html']:
      c=await b.new_context(viewport={'width':1280,'height':900})
      await c.add_init_script("localStorage.setItem('mb_lang','es');sessionStorage.setItem('mb_splash','1')")
      await c.route('**/data.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
      await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
      await c.route('**/open.er-api.com/**',lambda r:r.fulfill(body='{"result":"success","rates":{"USD":1,"CAD":1.4}}',content_type='application/json'))
      await c.route('**/fonts.g*',lambda r:r.abort()); await c.route('**/*.supabase.co/**',lambda r:r.fulfill(status=200,body='{}',content_type='application/json'))
      pg=await c.new_page();pg.on('console',lambda m:viol.append((page,m.text[:140])) if 'Content Security Policy' in m.text or 'Refused to' in m.text else None)
      await pg.goto('http://127.0.0.1:8132/'+page);await pg.wait_for_timeout(2000)
      if page=='app.html':
        for s in ['transactionsSection','chartsSection','goalsSection','debtsSection','advisorSection','profileSection']:
          await pg.evaluate("s=>{const b=document.querySelector('.nav-btn[data-section=\"'+s+'\"]');b&&b.click()}",s);await pg.wait_for_timeout(300)
        await pg.evaluate("MonetraGuide.open()");await pg.wait_for_timeout(300)
      await c.close()
    ok(not viol,'CSP: sin violaciones en 4 páginas '+str(viol[:3]))
    await b.close()
  print('FALLAS',errs) if errs else print('CSP OK')
asyncio.run(m())
