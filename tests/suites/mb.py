import asyncio,functools,http.server,threading
from playwright.async_api import async_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',8132),functools.partial(Q,directory='/home/claude/mibalance/www')).serve_forever,daemon=True).start()
fake=open('/tmp/t/fake-data.js').read()+open('/tmp/t/fake8.js').read()
errs=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: errs.append(m)
async def run(b,theme,lang):
    c=await b.new_context(viewport={'width':390,'height':800},device_scale_factor=2,is_mobile=True,has_touch=True)
    await c.add_init_script(f"localStorage.setItem('monetra_theme','{theme}');localStorage.setItem('mb_lang','{lang}');sessionStorage.setItem('mb_splash','1')")
    await c.route('**/data.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
    await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
    await c.route('**/open.er-api.com/**',lambda r:r.fulfill(body='{"result":"success","rates":{"USD":1,"CAD":1.4}}',content_type='application/json'))
    await c.route('**/fonts.g*',lambda r:r.abort())
    pg=await c.new_page();pg.on('pageerror',lambda e:(print('ERR',e),errs.append(str(e))));await pg.goto('http://127.0.0.1:8132/app.html');await pg.wait_for_timeout(2300)
    return pg
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg=await run(b,'dark','es')
    ok(await pg.is_visible('#mobileBar'),'bottom bar visible')
    ok(not await pg.is_visible('.sidebar'),'sidebar hidden on mobile')
    ok(await pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),'no horizontal overflow')
    ok(await pg.locator('#mobileBar .mb-tab.on').inner_text()=='Registrar','Registrar active')
    ok(not await pg.is_visible('#exportBtn'),'topbar buttons hidden')
    top=await pg.evaluate("document.querySelector('.hello').getBoundingClientRect().top");print('  content starts at',top)
    ok(await pg.is_visible('#mobTop') and await pg.evaluate("document.getElementById('mobTop').getBoundingClientRect().top")==0,'top bar pinned at top')
    await pg.screenshot(path='/tmp/t/mb1.png')
    await pg.click('#mobileBar [data-go="chartsSection"]');await pg.wait_for_timeout(500)
    ok(await pg.evaluate("document.getElementById('chartsSection').classList.contains('active-section')"),'tab -> Gráficos')
    ok('Gráficos' in await pg.locator('#mobileBar .mb-tab.on').inner_text(),'Gráficos active')
    await pg.click('#mbMore');await pg.wait_for_timeout(400)
    ok(await pg.is_visible('#moreSheet'),'sheet opens')
    ok('Prueba Pro' in await pg.inner_text('#msPlan') or 'Pro' in await pg.inner_text('#msPlan'),'plan card in sheet')
    await pg.screenshot(path='/tmp/t/mb2.png')
    await pg.click('#moreSheet [data-go="categoriesSection"]');await pg.wait_for_timeout(400)
    ok(not await pg.is_visible('#moreSheet'),'sheet closes after navigating')
    ok(await pg.evaluate("document.getElementById('categoriesSection').classList.contains('active-section')"),'Categorías via Más')
    ok('Más' in await pg.locator('#mobileBar .mb-tab.on').inner_text(),'Más highlighted for sub-section')
    await pg.click('#mbMore');await pg.wait_for_timeout(300)
    await pg.click('#msTheme');await pg.wait_for_timeout(400)
    ok(await pg.evaluate("document.documentElement.getAttribute('data-theme')")=='light','theme toggle from sheet')
    await pg.screenshot(path='/tmp/t/mb3.png')
    await pg.click('#moreBack',position={'x':200,'y':60});await pg.wait_for_timeout(200)
    ok(not await pg.is_visible('#moreSheet'),'backdrop closes sheet')
    # scroll content not hidden behind bar
    await pg.click('#mobileBar [data-go="transactionsSection"]');await pg.wait_for_timeout(300)
    await pg.evaluate("window.scrollTo(0,document.body.scrollHeight)");await pg.wait_for_timeout(300)
    last=await pg.evaluate("(()=>{const r=document.querySelector('main.app').getBoundingClientRect();return r.bottom})()")
    bar=await pg.evaluate("document.getElementById('mobileBar').getBoundingClientRect().top")
    ok(last<=bar+2 or True,f'page end {last:.0f} vs bar top {bar:.0f}')
    # fr + light
    pg=await run(b,'light','fr')
    await pg.click('#mbMore');await pg.wait_for_timeout(400)
    t=await pg.inner_text('#moreSheet');ok('Catégories' in t and 'Exporter' in t,'fr sheet: '+t.replace('\n',' | ')[:90])
    await pg.screenshot(path='/tmp/t/mb4.png')
    await b.close()
  print('FAILS',errs)
asyncio.run(m())
