exec(open('/tmp/t/ui.py').read().split('\nasync def m():')[0])
import gzip
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for url in ('index.html','app.html'):
        c=await b.new_context(viewport={'width':390,'height':800},is_mobile=True,has_touch=True)
        await c.add_init_script("localStorage.setItem('mb_lang','es');sessionStorage.setItem('mb_splash','1')")
        await c.route('**/data.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
        await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
        await c.route('**/fonts.g*',lambda r:r.abort()); await c.route('**/open.er-api.com/**',lambda r:r.fulfill(body='{"result":"success","rates":{"USD":1}}',content_type='application/json'))
        pg=await c.new_page();sizes=[]
        async def rs(r):
            try:
                body=await r.body();sizes.append((r.url.split('/')[-1].split('?')[0] or 'index',len(body),len(gzip.compress(body,6))))
            except: pass
        pg.on('response',lambda r:asyncio.ensure_future(rs(r)))
        cdp=await c.new_cdp_session(pg)
        await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':150,'downloadThroughput':1.6*1024*1024/8,'uploadThroughput':750*1024/8})  # 'Fast 3G / 4G lento'
        await cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
        await pg.goto('http://127.0.0.1:8132/'+url,wait_until='load');await pg.wait_for_timeout(1500)
        t=await pg.evaluate("(()=>{const n=performance.getEntriesByType('navigation')[0];const f=performance.getEntriesByType('paint');return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd),fcp:Math.round((f.find(x=>x.name==='first-contentful-paint')||{}).startTime||0)}})()")
        tot=sum(x[1] for x in sizes);gz=sum(x[2] for x in sizes)
        print(f'## {url} (móvil, red 4G lenta + CPU 4x más lento): FCP {t["fcp"]} ms · DOM listo {t["dcl"]} ms · carga completa {t["load"]} ms · {len(sizes)} archivos · {tot/1024:.0f} KB sin comprimir (~{gz/1024:.0f} KB con gzip)')
        for n,s,g in sorted(sizes,key=lambda x:-x[1])[:6]: print(f'     {n:28s} {s/1024:7.0f} KB')
        await c.close()
    await b.close()
asyncio.run(m())
