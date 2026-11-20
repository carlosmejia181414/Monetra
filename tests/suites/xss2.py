exec(open('/tmp/t/mb.py').read().split('async def run(b')[0])
import json,re
P=['<img src=x onerror="window.__xss=1">','"><svg onload="window.__xss=2">',"'><script>window.__xss=3</script>",'<a href="javascript:window.__xss=4">x</a>','</textarea><iframe srcdoc="<script>parent.__xss=5</script>">','<details open ontoggle="window.__xss=6">']
n=[0]
def pay():
    n[0]+=1;return P[n[0]%len(P)]
fk=re.sub(r'(const cats=\[.*?\];)',lambda m:re.sub(r'name:"[^"]+"',lambda _:'name:'+json.dumps(pay()),m.group(1)),fake,count=1,flags=re.S)
fk=re.sub(r'description:"[^"]+"',lambda _:'description:'+json.dumps(pay()),fk)
fk=fk.replace('name:"Carlos Mejía"','name:'+json.dumps(P[0]))
GO=[{"id":"g1","name":P[1],"icon":P[2],"target":1000,"targetDate":"2027-01-01","archived":False,"shared":False,"createdAt":"2026-01-01T00:00:00Z","contributions":[{"id":"c1","amount":10,"note":P[3],"date":"2026-11-01","mine":True}]}]
DE=[{"id":"d1","name":P[4],"kind":P[5],"startBalance":1000,"rate":10,"minPayment":50,"dueDay":5,"archived":False,"shared":False,"createdAt":"2026-01-01T00:00:00Z","payments":[{"id":"p1","amount":10,"note":P[0],"date":"2026-11-01","mine":True}]}]
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for sf in (True,False):
      c=await b.new_context(viewport={'width':1360,'height':900})
      await c.add_init_script(f"localStorage.setItem('monetra_theme','light');localStorage.setItem('mb_lang','es');sessionStorage.setItem('mb_splash','1');window.__goalsOverride={json.dumps(GO)};window.__debtsOverride={json.dumps(DE)};")
      await c.route('**/data.js*',lambda r:r.fulfill(body=fk,content_type='application/javascript'))
      await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
      await c.route('**/open.er-api.com/**',lambda r:r.fulfill(body='{"result":"success","rates":{"USD":1,"CAD":1.4}}',content_type='application/json'))
      await c.route('**/fonts.g*',lambda r:r.abort())
      if not sf: await c.route('**/safe.js*',lambda r:r.fulfill(body='/*desactivado para la prueba*/',content_type='application/javascript'))
      pg=await c.new_page();pg.on('pageerror',lambda e:None);pg.on('dialog',lambda d:(errs.append('dialog '+d.message),asyncio.ensure_future(d.dismiss())))
      await pg.goto('http://127.0.0.1:8132/app.html');await pg.wait_for_timeout(2300)
      await pg.evaluate("""()=>{Data.askGuide=async()=>({text:'<img src=x onerror="window.__xss=7"> **hola** <script>window.__xss=8</script>'});}""")
      for s in ['transactionsSection','categoriesSection','chartsSection','analyticsSection','advisorSection','goalsSection','debtsSection','householdSection','profileSection']:
        await pg.evaluate("s=>document.querySelector('.nav-btn[data-section=\"'+s+'\"]').click()",s);await pg.wait_for_timeout(450)
      # abrir modales de metas/deudas
      for sel in ['[data-add="g1"]','[data-pay="d1"]']:
        try:
            await pg.evaluate("s=>{const b=document.querySelector(s);if(b)b.click()}",sel);await pg.wait_for_timeout(250);await pg.keyboard.press('Escape')
        except Exception: pass
      await pg.evaluate("MonetraGuide.open()");await pg.wait_for_timeout(300)
      await pg.fill('#gdInput','hola') if await pg.locator('#gdInput').count() else None
      await pg.keyboard.press('Enter');await pg.wait_for_timeout(800)
      x=await pg.evaluate("window.__xss")
      inj=await pg.evaluate("document.querySelectorAll('img[src=x],svg[onload],iframe[srcdoc],a[href^=javascript],[ontoggle],[onerror]').length")
      ok(x is None,f'XSS no se ejecuta ({"con safe.js" if sf else "SOLO escape de la app, safe.js apagado"}) xss={x}')
      ok(inj==0,f'sin elementos inyectados en el DOM ({"con" if sf else "sin"} safe.js): {inj}')
      await c.close()
    await b.close()
  print('FALLAS',errs) if errs else print('XSS2 OK')
asyncio.run(m())
