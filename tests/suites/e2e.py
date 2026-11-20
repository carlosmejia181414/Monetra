exec(open('/tmp/t/mb.py').read().split('async def m():')[0])
import json
async def ctx(b,w=1360,h=900,tz='America/Toronto',fixed=None,lang='es'):
    c=await b.new_context(viewport={'width':w,'height':h},timezone_id=tz)
    await c.add_init_script(f"localStorage.setItem('monetra_theme','light');localStorage.setItem('mb_lang','{lang}');sessionStorage.setItem('mb_splash','1')")
    await c.route('**/data.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
    await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
    await c.route('**/open.er-api.com/**',lambda r:r.fulfill(body='{"result":"success","rates":{"USD":1,"CAD":1.4}}',content_type='application/json'))
    await c.route('**/fonts.g*',lambda r:r.abort())
    pg=await c.new_page()
    if fixed: await pg.clock.set_fixed_time(fixed)
    pg.on('pageerror',lambda e:(print('PAGEERR',str(e)[:140]),errs.append('pageerror:'+str(e)[:80])))
    await pg.goto('http://127.0.0.1:8132/app.html');await pg.wait_for_timeout(2300)
    return c,pg
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    # ---- Fechas / zona horaria
    c,pg=await ctx(b,fixed='2026-11-16T00:30:00Z')   # 19:30 del 15-nov en Toronto
    v=await pg.input_value('#date');ok(v=='2026-11-15',f'fecha por defecto = día LOCAL (Toronto 19:30) -> {v}')
    await c.close()
    c,pg=await ctx(b,tz='Pacific/Auckland',fixed='2026-11-15T12:30:00Z')  # ya es 16-nov 01:30 allí
    v=await pg.input_value('#date');ok(v=='2026-11-16',f'fecha local en Auckland -> {v}')
    await c.close()
    c,pg=await ctx(b)
    r=await pg.evaluate("""[buildMonthlyDate('2026-01-31',2026,1),buildMonthlyDate('2028-01-31',2028,1),buildMonthlyDate('2026-03-31',2026,3),buildMonthlyDate('2026-12-31',2027,0),getLastDayOfMonth(2100,1),getLastDayOfMonth(2000,1),getLastDayOfMonth(2024,1),getLastDayOfMonth(2026,1)]""")
    ok(r==['2026-02-28','2028-02-29','2026-04-30','2027-01-31',28,29,29,28],f'fechas límite (fin de mes, bisiestos) {r}')
    # ---- Positivo: guardar un gasto
    await pg.select_option('#type','variable');await pg.wait_for_timeout(200)
    await pg.fill('#amount','45.50');await pg.fill('#description','Café QA')
    await pg.evaluate("window.__calls.length=0")
    await pg.click('#submitBtn');await pg.wait_for_timeout(500)
    calls=await pg.evaluate("window.__calls.filter(c=>c[0]=='createTransaction')")
    ok(len(calls)==1 and calls[0][1]['amount']==45.5 and calls[0][1]['type']=='variable','POSITIVA: gasto válido se guarda una vez con monto/tipo correctos')
    # ---- Negativas / validación de formulario
    chk=lambda: pg.evaluate("document.getElementById('transactionForm').checkValidity()")
    await pg.fill('#amount','');ok(not await chk(),'NEGATIVA: monto vacío bloqueado')
    await pg.fill('#amount','-5');ok(not await chk(),'NEGATIVA: monto negativo (-5) bloqueado')
    await pg.fill('#amount','');await pg.click('#amount');await pg.keyboard.type('abc');v=await pg.input_value('#amount');ok(v=='','NEGATIVA: texto en monto no se acepta')
    await pg.fill('#amount','0.001');print('  monto 0.001 válido?',await chk())
    await pg.fill('#amount','0');print('  monto 0 válido (política: permitido)?',await chk())
    await pg.fill('#amount','99999999999999');print('  monto 1e14 válido en el navegador?',await chk(),'(la base de datos lo rechaza: numeric overflow)')
    await pg.fill('#date','');ok(not await chk(),'NEGATIVA: fecha vacía bloqueada')
    # ---- Valores límite (99/100/101 ~ 39/40/41 y 299/300/301)
    await pg.click('#newCatBtn');await pg.wait_for_timeout(200)
    L=[]
    for n in (39,40,41):
        await pg.fill('#inlineCatName','x'*n);L.append(len(await pg.input_value('#inlineCatName')))
    ok(L==[39,40,40],f'LÍMITE: nombre de categoría 39/40/41 -> {L} (corta en 40)')
    L=[]
    for n in (299,300,301):
        await pg.fill('#description','d'*n);L.append(len(await pg.input_value('#description')))
    ok(L==[299,300,300],f'LÍMITE: descripción 299/300/301 -> {L} (corta en 300)')
    # ---- Idempotencia: doble clic rápido
    await pg.fill('#date','2026-11-10');await pg.fill('#amount','10');await pg.fill('#description','doble');await pg.evaluate("window.__calls.length=0")
    await pg.evaluate("(()=>{const b=document.getElementById('submitBtn');b.click();b.click();b.click();})()");await pg.wait_for_timeout(700)
    n=await pg.evaluate("window.__calls.filter(c=>c[0]=='createTransaction').length")
    print('  doble/triple clic => llamadas a guardar:',n); ok(n==1,'IDEMPOTENCIA: 3 clics seguidos guardan 1 sola vez')
    # ---- Manejo de errores: red caída
    await pg.evaluate("()=>{Data.createTransaction=async()=>{throw new Error('Failed to fetch')}}")
    msgs=[];pg.on('dialog',lambda d:(msgs.append(d.message),asyncio.ensure_future(d.accept())))
    await pg.fill('#date','2026-11-11');await pg.fill('#amount','12');await pg.fill('#description','sinred');await pg.click('#submitBtn');await pg.wait_for_timeout(700)
    ok(any('fetch' in m.lower() or 'error' in m.lower() or 'No se pudo' in m for m in msgs) and await pg.is_visible('#submitBtn'),f'ERRORES: red caída muestra aviso y la app sigue viva {msgs[:1]}')
    # ---- Importar archivo inválido
    msgs.clear()
    open('/tmp/t/malo.json','w').write('{esto no es json');await pg.set_input_files('#importFile','/tmp/t/malo.json');await pg.wait_for_timeout(600)
    ok(any('No se pudo importar' in m for m in msgs),f'NEGATIVA: respaldo corrupto se rechaza con mensaje {msgs[:1]}')
    msgs.clear();open('/tmp/t/vacio.json','w').write('{"transactions":"x","categories":5}');await pg.set_input_files('#importFile','/tmp/t/vacio.json');await pg.wait_for_timeout(600)
    print('  respaldo con estructura rara ->',msgs[:1])
    await c.close()
    # ---- Fallas simuladas: escaneo, plan sin instalar, sin config
    c,pg=await ctx(b)
    await pg.evaluate("window.__noPlan=true;MonetraPlan.load()");await pg.wait_for_timeout(500)
    ok(await pg.evaluate("MonetraPlan.isPro()"),'FALLA: si plan.sql no está instalado, la app no se bloquea (modo sin límites)')
    await c.close()
    await b.close()
  print('FAILS',errs)
asyncio.run(m())
