exec(open('/tmp/t/ui.py').read().split('\nasync def m():')[0])
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for theme in ('light','dark'):
      for lang in ('es','en','fr'):
        c,pg=await mk(b,1360,900,lang=lang,theme=theme)
        await pg.add_script_tag(content=AX)
        agg={}
        for s in SECS:
            await go(pg,s)
            r=await pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa'],resultTypes:['violations']}).then(r=>r.violations.map(v=>[v.id,v.nodes.map(n=>n.target.join(' ').slice(0,70))]))")
            for v in r:
                for t in v[1]: agg.setdefault((v[0],t),set()).add(s[:6])
        print(theme,lang,len(agg),'problemas únicos'); 
        if lang=='es':
            for k,v in list(agg.items())[:8]: print('    ',k,sorted(v))
        await c.close()
    await b.close()
asyncio.run(m())
