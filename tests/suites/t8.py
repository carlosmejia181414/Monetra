import asyncio, http.server, threading, functools, sys, json
from playwright.async_api import async_playwright
W='/home/claude/mibalance/www'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8125),functools.partial(Q,directory=W)); threading.Thread(target=srv.serve_forever,daemon=True).start()
fake=open('/tmp/t/fake-data.js').read()+open('/tmp/t/fake8.js').read()
cfg='window.APP_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"sb_publishable_demo"};'
import string
RATES={"result":"success","rates":{"USD":1,"CAD":1.4,"EUR":0.9,"PEN":3.8,"MXN":18,"GBP":0.8,"JPY":150,"COP":4000,"CLP":950,"ARS":1000,"BRL":5,"CHF":0.9,"AUD":1.5,"NZD":1.6,"CNY":7,"INR":83,"KRW":1300,"SEK":10,"NOK":10,"DKK":6.8,"PLN":4,"CZK":23,"HUF":360,"TRY":30,"ZAR":18,"AED":3.67,"SAR":3.75,"ILS":3.7,"SGD":1.35,"HKD":7.8,"THB":35,"PHP":56,"IDR":15500,"MYR":4.7,"VND":24000,"EGP":48,"NGN":1500,"KES":130,"UAH":40,"RON":4.6}}
errs=[]
def ok(c,m):
    print(("PASS " if c else "FAIL ")+m)
    if not c: errs.append(m)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        async def new(pre='',lang='es',theme='dark',w=1360,h=900):
            ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
            await ctx.add_init_script(f"localStorage.setItem('monetra_theme','{theme}');localStorage.setItem('mb_lang','{lang}');"+pre)
            await ctx.route('**/data.js*',lambda r:r.fulfill(body=fake,content_type='application/javascript'))
            await ctx.route('**/config.js*',lambda r:r.fulfill(body=cfg,content_type='application/javascript'))
            await ctx.route('**/track.js*',lambda r:r.fulfill(body='window.MonetraTrack={event:function(n){(window.__ev=window.__ev||[]).push(n)}};',content_type='application/javascript'))
            await ctx.route('**/open.er-api.com/**',lambda r:r.fulfill(body=json.dumps(RATES),content_type='application/json'))
            await ctx.route('**/fonts.g*',lambda r:r.abort())
            pg=await ctx.new_page(); pg.on('pageerror',lambda e:(print('PAGEERROR',e),errs.append(str(e))))
            await pg.goto('http://127.0.0.1:8125/app.html'); await pg.wait_for_timeout(2200); return pg
        # ---------- PRO ----------
        pg=await new()
        ok(await pg.locator('#planCard.is-pro').count()==1,'plan card pro/trial visible')
        ok('10' in (await pg.inner_text('#planCard')) or '9' in (await pg.inner_text('#planCard')),'trial days shown: '+(await pg.inner_text('#planCard')).replace('\n',' | '))
        # explorer
        await pg.click('[data-section="chartsSection"]'); await pg.wait_for_timeout(500)
        ok(await pg.evaluate("!!explorerChart"),'explorer chart created')
        combos=[]
        for view in ['normal','pareto','rule','cumulative','heatmap']:
            for metric in ['expenses','income','savings','all']:
                for group in ['category','month','kind']:
                    for period in ['1','3','12','year']:
                        combos.append((view,metric,group,period))
        bad=0
        for (view,metric,group,period) in combos:
            await pg.evaluate("""([v,m,g,p])=>{exView.value=v;exMetric.value=m;exGroup.value=g;exPeriod.value=p;renderExplorer()}""",[view,metric,group,period])
            st=await pg.evaluate("({chart:!!explorerChart,rows:document.querySelectorAll('#exTable tr').length,view:exView.value,heat:!document.getElementById('exHeatView').hidden})")
            if view=='heatmap': good=st['heat']
            else: good=st['chart'] and st['rows']>=1
            if not good: bad+=1; print('  bad combo',view,metric,group,period,st)
        ok(bad==0,f'explorer combos ({len(combos)}) render without error')
        # specific values: category/expenses/month Nov
        await pg.evaluate("exView.value='normal';exMetric.value='expenses';exGroup.value='category';exPeriod.value='1';monthFilter.value=10;yearFilter.value=2026;renderExplorer()")
        rows=await pg.evaluate("[...document.querySelectorAll('#exTable tr')].map(r=>r.innerText.replace(/\\s+/g,' '))")
        print('  rows',rows[:3])
        ok(len(rows)>=3,'category table has rows')
        shapes=await pg.evaluate("""()=>{const out={};for(const s of ['bar','line','doughnut']){exShape.value=s;renderExplorer();out[s]=explorerChart.config.type}return out}""")
        print('  shapes',shapes)
        # inline category
        await pg.click('[data-section="transactionsSection"]'); await pg.wait_for_timeout(300)
        await pg.select_option('#type','variable'); await pg.click('#newCatBtn')
        ok(await pg.is_visible('#inlineCat'),'inline category panel opens')
        ok('Gasto variable' in await pg.inner_text('#inlineCatKind'),'kind note: '+await pg.inner_text('#inlineCatKind'))
        await pg.fill('#inlineCatName','Mascotas'); await pg.click('#inlineCatSave'); await pg.wait_for_timeout(500)
        calls=await pg.evaluate("__calls"); ok(any(c[0]=='createCategory' and c[1]['name']=='Mascotas' and c[1]['kind']=='variable' for c in calls),'createCategory called with kind variable')
        sel=await pg.evaluate("categorySelect.options[categorySelect.selectedIndex].text")
        ok(sel.replace('🐾 ','')=='Mascotas','new category selected: '+sel)
        ok(not await pg.is_visible('#inlineCat'),'inline panel closed')
        # submit with __new__ blocked
        # currency & create tx
        await pg.fill('#amount','25.5'); await pg.fill('#description','Croquetas')
        opts=await pg.evaluate("[...currencySelect.options].map(o=>o.value).length")
        ok(opts>20,'pro currency list has '+str(opts))
        await pg.select_option('#currencySelect','EUR')
        await pg.evaluate("window.alert=()=>{}")
        await pg.click('#submitBtn'); await pg.wait_for_timeout(400)
        calls=await pg.evaluate("__calls"); tx=[c for c in calls if c[0]=='createTransaction']
        ok(tx and tx[-1][1]['currency']=='EUR' and tx[-1][1]['amount']==25.5,'createTransaction has currency EUR/amount: '+str(tx[-1][1] if tx else None))
        # display currency change -> conversion
        before=await pg.inner_text('#totalIncome')
        await pg.click('[data-section="profileSection"]'); await pg.wait_for_timeout(300)
        await pg.select_option('#profCurrency','USD'); await pg.wait_for_timeout(500)
        after=await pg.inner_text('#totalIncome'); print('  income',before,'->',after)
        ok(before!=after and ('US' in after or '$' in after),'income converted to USD')
        calls=await pg.evaluate("__calls"); ok(any(c[0]=='saveProfile' and c[1].get('currency')=='USD' for c in calls),'saveProfile currency USD')
        # 4500 CAD -> USD = 4500/1.4=3214.29 (Nov income 4200+(11%3)*150=4500)
        ok('3214' in after.replace(' ','').replace(' ','').replace(',','.').replace('.','') or '3214' in after.replace(' ','').replace(' ',''),'value 3214.29 USD: '+after)
        note=await pg.inner_text('#fxNote'); ok('Rates By Exchange Rate API' in note,'fx attribution: '+note[:80])
        # upsell not shown to pro for household
        await pg.click('[data-section="householdSection"]'); await pg.wait_for_timeout(300)
        await pg.fill('#hhName','Casa'); await pg.click('#hhCreate'); await pg.wait_for_timeout(500)
        ok(await pg.is_visible('.modal-back:not(.hidden)'),'pro_required from server -> upsell'); await pg.click('.modal-back:not(.hidden) [data-close]'); await pg.wait_for_timeout(200)
        # scan (pro)
        await pg.click('[data-section="transactionsSection"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('.modal-back') && document.querySelector('.modal-back').classList.add('hidden')")
        import base64,io
        from PIL import Image
        im=Image.new('RGB',(2400,1800),(240,240,240)); buf=io.BytesIO(); im.save(buf,'JPEG'); open('/tmp/t/receipt.jpg','wb').write(buf.getvalue())
        await pg.set_input_files('#scanFile','/tmp/t/receipt.jpg'); await pg.wait_for_timeout(1500)
        v=await pg.evaluate("({date:date.value,type:type.value,amt:amount.value,desc:description.value,cat:categorySelect.value,inline:!document.getElementById('inlineCat').classList.contains('hidden'),name:inlineCatName.value,msg:scanMsg.textContent})")
        print('  scan prefill',v)
        ok(v['date']=='2026-11-12' and v['amt']=='12.35' and 'Tim Hortons' in v['desc'],'scan prefilled date/amount/merchant')
        ok(v['cat']=='__new__' and v['inline'] and v['name']=='Cafetería','unknown category -> inline create prefilled')
        calls=await pg.evaluate("__calls"); sc=[c for c in calls if c[0]=='scanReceipt']
        ok(sc and sc[-1][1]['len']>100 and 'Supermercado' in sc[-1][1]['cats'],'scan payload: len/cats ok')
        ok(sc[-1][1]['len']<400000,'image compressed (b64 len %d)'%sc[-1][1]['len'])
        # theme light + screenshot
        await pg.click('[data-section="chartsSection"]'); await pg.evaluate("exView.value='normal';exMetric.value='expenses';exGroup.value='category';exPeriod.value='3';exShape.value='auto';renderExplorer()")
        await pg.screenshot(path='/tmp/t/v8-charts-dark.png')
        await pg.evaluate("MonetraTheme.set('light')"); await pg.wait_for_timeout(500); await pg.screenshot(path='/tmp/t/v8-charts-light.png')
        await pg.click('[data-section="transactionsSection"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='/tmp/t/v8-form-light.png')
        # ---------- FREE ----------
        pg=await new("window.__plan={plan:'free',source:'trial',pro_until:null,trial_used:true,ai_month:1,scans_month:3,limits:{categories:12,ai_month:3,scans_month:3,history_months:3}};window.__catLimit=true;window.__cur='USD';",lang='en')
        txt=await pg.inner_text('#planCard'); ok('Free plan' in txt and '1/3' in txt and 'Upgrade to Pro' in txt,'free plan card: '+txt.replace('\n',' | '))
        await pg.click('[data-section="chartsSection"]'); await pg.wait_for_timeout(300)
        ok('🔒' in await pg.inner_text('#exPeriod'),'period options locked')
        await pg.select_option('#exPeriod','12'); await pg.wait_for_timeout(300)
        ok(await pg.is_visible('.modal-back:not(.hidden)'),'upsell modal on locked period')
        ok(await pg.evaluate("exPeriod.value")!='12','period reverted')
        mt=await pg.inner_text('.modal-back:not(.hidden) .modal'); ok('Full history' in mt,'upsell text (en): '+mt[:60].replace('\n',' '))
        await pg.click('.modal-back:not(.hidden) [data-close]')
        await pg.select_option('#exView','pareto'); await pg.wait_for_timeout(300); ok(await pg.is_visible('.modal-back:not(.hidden)'),'upsell on pareto'); await pg.click('.modal-back:not(.hidden) [data-close]')
        await pg.select_option('#exPeriod','3'); ok(await pg.evaluate("exPeriod.value")=='3','free can pick 3 months')
        # currency lock in form
        await pg.click('[data-section="transactionsSection"]')
        opts=await pg.evaluate("[...currencySelect.options].map(o=>o.value)"); ok(opts==['USD','__pro__'],'free currency options '+str(opts))
        await pg.select_option('#currencySelect','__pro__'); ok(await pg.is_visible('.modal-back:not(.hidden)'),'upsell on currency'); ok(await pg.evaluate("currencySelect.value")=='USD','currency reverted'); await pg.click('.modal-back:not(.hidden) [data-close]')
        # scan limit reached -> upsell, no call
        await pg.click('#scanBtn'); await pg.wait_for_timeout(300); ok(await pg.is_visible('.modal-back:not(.hidden)'),'scan limit upsell'); await pg.click('.modal-back:not(.hidden) [data-close]')
        # category limit
        await pg.select_option('#type','variable'); await pg.click('#newCatBtn'); await pg.fill('#inlineCatName','Otra'); await pg.click('#inlineCatSave'); await pg.wait_for_timeout(400)
        ok(await pg.is_visible('.modal-back:not(.hidden)'),'category limit -> upsell'); await pg.click('.modal-back:not(.hidden) [data-close]')
        # household create blocked client side
        await pg.click('[data-section="householdSection"]'); await pg.wait_for_timeout(300)
        ok('Pro feature' in await pg.inner_text('#householdBox'),'household note for free')
        await pg.click('#hhCreate'); ok(await pg.is_visible('.modal-back:not(.hidden)'),'household upsell'); await pg.click('.modal-back:not(.hidden) [data-close]')
        # plans modal
        await pg.click('#planCard [data-plans]'); await pg.wait_for_timeout(300); mt=await pg.inner_text('.modal-back:not(.hidden) .modal'); ok('Choose your plan' in mt and 'US$5' in mt and 'Receipt scanning' in mt,'plans modal en'); await pg.screenshot(path='/tmp/t/v8-plans.png')
        ok('upsell_history' in (await pg.evaluate("window.__ev||[]")),'tracking upsell events')
        # free + foreign currency scan conversion
        pg=await new("window.__plan={plan:'free',source:'trial',pro_until:null,trial_used:true,ai_month:0,scans_month:0,limits:{categories:12,ai_month:3,scans_month:3,history_months:3}};window.__scanRes={merchant:'Shop',date:'2026-11-10',total:14,currency:'EUR',category:'Supermercado'};")
        await pg.click('#scanBtn') if False else None
        await pg.set_input_files('#scanFile','/tmp/t/receipt.jpg'); await pg.wait_for_timeout(1500)
        v=await pg.evaluate("({amt:amount.value,desc:description.value,cur:currencySelect.value,cat:categorySelect.options[categorySelect.selectedIndex].text})")
        # 14 EUR -> CAD = 14/0.9*1.4 = 21.78
        print('  free foreign scan',v); ok(v['amt']=='21.78' and '(14.00 EUR)' in v['desc'] and v['cur']=='CAD' and v['cat'].split(' ',1)[-1]=='Supermercado','free plan converts foreign receipt')
        # scan error free_limit
        pg=await new("window.__scanErr='free_limit';")
        await pg.set_input_files('#scanFile','/tmp/t/receipt.jpg'); await pg.wait_for_timeout(1200); ok(await pg.is_visible('.modal-back:not(.hidden)'),'server free_limit -> upsell')
        # no plan system (plan.sql not installed)
        pg=await new("window.__noPlan=true;")
        ok(await pg.locator('#planCard').count()==0 or not await pg.is_visible('#planCard'),'no plan card when plan.sql missing')
        await pg.click('[data-section="chartsSection"]'); await pg.select_option('#exPeriod','12'); ok(await pg.evaluate("exPeriod.value")=='12','no limits without plan system')
        pg=await new("window.__cur='';")
        await pg.evaluate("promptCurrency()"); await pg.wait_for_timeout(400)
        ok(await pg.is_visible('.modal-back:not(.hidden)'),'currency prompt modal'); await pg.screenshot(path='/tmp/t/v8-prompt.png')
        # french strings
        pg=await new("window.__plan={plan:'free',source:'trial',pro_until:null,trial_used:true,ai_month:0,scans_month:0,limits:{categories:12,ai_month:3,scans_month:3,history_months:3}};",lang='fr')
        txt=await pg.inner_text('#planCard'); ok('Forfait Gratuit' in txt,'fr plan card: '+txt.replace('\n',' | '))
        await pg.click('[data-section="chartsSection"]'); await pg.wait_for_timeout(300)
        t=await pg.inner_text('#chartsSection'); ok('Graphique d' in t and 'Regrouper par' in t,'fr explorer labels')
        await b.close()
    print('\nFAILS:',errs)
asyncio.run(main())
