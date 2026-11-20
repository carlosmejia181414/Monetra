exec(open('/tmp/t/ui.py').read().split('\nasync def m():')[0])
import re
ES=re.compile(r"[ñ¿¡]|ción\b|ciones\b|\b(movimientos?|gastos?|ingresos?|ahorro|categor[ií]as?|meses|promedio|sobre|según|mensual|anual|del|con|tu|tus|para|sin|más|menos|este|esta|estimad[oa]|proyecci[oó]n|sugerencias|alertas|datos|calidad|variaci[oó]n|compromisos|recurrentes|mayor|menor|cantidad|ticket)\b",re.I)
SKIP=re.compile(r"Carlos Mej|Supermercado|Renta|Sueldo|Gasolina|Compra semanal|Restaurantes|Transporte|Ocio|Cena|Cine|^\[(title|aria-label)\] (Español|Menú|Más)")
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for lang in ('en','fr'):
        c,pg=await mk(b,1360,900,lang=lang)
        found={}
        async def grab(tag):
            t=await pg.evaluate("""()=>{const out=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const e=n.parentElement;if(!e||['SCRIPT','STYLE','OPTION'].includes(e.tagName))continue;const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;const s=n.textContent.trim();if(s.length>2)out.add(s)}
              document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(e=>{['placeholder','title','aria-label'].forEach(a=>{const v=e.getAttribute(a);if(v&&v.length>2)out.add('['+a+'] '+v)})});return [...out]}""")
            for s in t:
                if ES.search(s) and not SKIP.search(s): found.setdefault(s[:90],set()).add(tag)
        for s in SECS:
            await go(pg,s);await grab(s[:6])
        await pg.evaluate("MonetraPlan.open()");await pg.wait_for_timeout(300);await grab('plan-modal');await pg.evaluate("document.querySelector('.modal-x').click()")
        await pg.evaluate("MonetraPlan.upsell('household')");await pg.wait_for_timeout(300);await grab('upsell');await pg.evaluate("document.querySelector('.modal-x').click()")
        await pg.goto('http://127.0.0.1:8132/index.html');await pg.wait_for_timeout(1200);await grab('landing')
        print(f'## {lang}: textos que parecen estar en español: {len(found)}')
        for k,v in list(found.items())[:60]: print('   ',repr(k),sorted(v))
        await c.close()
    await b.close()
asyncio.run(m())
