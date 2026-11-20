exec(open('/tmp/t/mb.py').read().split('async def run(b')[0])
import re
async def mk(b,lang='es',w=1280,h=900):
    c=await b.new_context(viewport={'width':w,'height':h})
    await c.add_init_script(f"localStorage.setItem('monetra_theme','light');localStorage.setItem('mb_lang','{lang}');sessionStorage.setItem('mb_splash','1')")
    await c.route('**/data.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
    await c.route('**/config.js*',lambda r:r.fulfill(body='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"};',content_type='application/javascript'))
    await c.route('**/open.er-api.com/**',lambda r:r.fulfill(body='{"result":"success","rates":{"USD":1,"CAD":1.4}}',content_type='application/json'))
    await c.route('**/fonts.g*',lambda r:r.abort())
    return c
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    print('## Páginas legales')
    for lang,h1p,h1t in (('es','Política de privacidad','Términos de uso'),('en','Privacy policy','Terms of use'),('fr','Politique de confidentialité',"Conditions d'utilisation")):
        c=await mk(b,lang);pg=await c.new_page();cons=[];pg.on('console',lambda m:cons.append(m.text) if m.type=='error' or 'Content Security' in m.text else None)
        for f,h in (('privacidad.html',h1p),('terminos.html',h1t)):
            await pg.goto('http://127.0.0.1:8132/'+f);await pg.wait_for_timeout(300)
            vis=await pg.evaluate("[...document.querySelectorAll('main')].filter(m=>!m.hidden).map(m=>m.getAttribute('data-l'))")
            t=await pg.inner_text('main:not([hidden]) h1')
            ok(vis==[lang] and t==h,f'{f} [{lang}]: solo se muestra el idioma {lang} y el título es "{h}"')
            n=await pg.evaluate("document.querySelectorAll('main:not([hidden]) h2').length")
            ok(n>=9,f'{f} [{lang}]: {n} secciones')
        ok(not cons,'páginas legales sin errores de consola/CSP '+str(cons[:2]))
        await c.close()
    c=await mk(b,'es');pg=await c.new_page()
    await pg.goto('http://127.0.0.1:8132/privacidad.html');await pg.click('[data-set=en]');await pg.wait_for_timeout(200)
    ok((await pg.inner_text('main:not([hidden]) h1'))=='Privacy policy','selector de idioma EN funciona')
    txt=await pg.evaluate("document.body.innerText")
    ok(('No usamos' in txt)==False,'no queda texto en español al elegir inglés')
    ph=re.findall(r'\[[A-ZÁÉÍÓÚ /]+\]',open('/home/claude/mibalance/www/privacidad.html').read()+open('/home/claude/mibalance/www/terminos.html').read())
    print('  AVISO datos por completar:',sorted(set(ph)) if ph else 'ninguno')
    await c.close()
    print('## Enlaces')
    c=await mk(b,'es');pg=await c.new_page();await pg.goto('http://127.0.0.1:8132/index.html');await pg.wait_for_timeout(500)
    ok(await pg.locator('footer a[href="privacidad.html"]').count()==1 and await pg.locator('footer a[href="terminos.html"]').count()==1,'portada: enlaces a privacidad y términos en el pie')
    await c.close()
    print('## Eliminar cuenta (app)')
    for lang in ('es','en','fr'):
        c=await mk(b,lang);pg=await c.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('http://127.0.0.1:8132/app.html');await pg.wait_for_timeout(2200)
        ok(await pg.locator('.legal-note a').count()==2 if await pg.locator('.legal-note').count() else True,f'[{lang}] aviso legal en el login')
        await pg.evaluate("document.querySelector('.nav-btn[data-section=\"profileSection\"]').click()");await pg.wait_for_timeout(400)
        ok(await pg.is_visible('#privacyCard'),f'[{lang}] tarjeta Privacidad y datos visible')
        bt=await pg.inner_text('#profDelete')
        exp={'es':'Eliminar mi cuenta y mis datos','en':'Delete my account and data','fr':'Supprimer mon compte et mes données'}[lang]
        ok(bt.strip()==exp,f'[{lang}] botón traducido: {bt.strip()}')
        if lang!='es': continue
        await pg.click('#profExport') if False else None
        await pg.click('#profDelete');await pg.wait_for_timeout(300)
        ok(await pg.is_visible('#delConfirm') and await pg.is_disabled('#delGo'),'modal abre con "Eliminar" deshabilitado')
        await pg.fill('#delConfirm','otro@correo.com');ok(await pg.is_disabled('#delGo'),'correo equivocado: sigue deshabilitado')
        await pg.keyboard.press('Escape');await pg.wait_for_timeout(250)
        ok(not await pg.is_visible('#delConfirm'),'Escape cierra el modal sin borrar nada')
        ok(len([x for x in await pg.evaluate("window.__calls")if x[0]=='deleteAccount'])==0,'cancelar no llama a deleteAccount')
        # error
        await pg.evaluate("window.__delErr=true");await pg.click('#profDelete');await pg.fill('#delConfirm','CARLOS@ejemplo.com');await pg.wait_for_timeout(100)
        ok(await pg.is_enabled('#delGo'),'correo correcto (sin distinguir mayúsculas): se habilita')
        await pg.click('#delGo');await pg.wait_for_timeout(400)
        ok('No se pudo' in await pg.inner_text('#delErr') and await pg.is_enabled('#delGo'),'si falla: muestra el error y permite reintentar')
        # éxito
        await pg.evaluate("window.__delErr=false")
        async with pg.expect_navigation(timeout=5000):
            await pg.click('#delGo')
        ok('cuenta=eliminada' in pg.url,'éxito: redirige a la portada con aviso '+pg.url[-40:])
        await c.close()
    await b.close()
  print('FALLAS',errs) if errs else print('PRIV OK')
asyncio.run(m())
