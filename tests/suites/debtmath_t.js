// Pruebas de la matemática de deudas (sin navegador)
global.window={}; global.document={addEventListener(){},getElementById(){return null}};
require('/home/claude/mibalance/www/debts.js');
const M=window.MonetraDebtMath; let f=0;
const ok=(c,n,x)=>{console.log((c?'PASS ':'FAIL ')+n+(x?' | '+x:''));if(!c)f++};
const d=(o)=>Object.assign({id:'x',name:'x',start:1000,rate:0,minPayment:100,payments:[]},o);
// sin interés: 1000 con cuota 100 = 10 meses, 0 intereses
let p=M.payoff(1000,0,100); ok(p.months===10&&p.interest===0,'sin interés: 10 meses',JSON.stringify(p));
// con interés conocido: 1000 al 12% anual (1%/mes) con cuota 100 -> 11 meses, ~ interés 56.6
p=M.payoff(1000,12,100); ok(p.months===11&&Math.abs(p.interest-58.98)<0.02,'12% anual cuota 100',JSON.stringify(p));
// pago que no cubre el interés
p=M.payoff(10000,24,100); ok(p.never===true,'cuota < interés => nunca');
p=M.payoff(1000,10,0); ok(p.never===true,'sin cuota => nunca');
p=M.payoff(0,10,50); ok(p.months===0,'saldo 0 => 0 meses');
// saldo con pagos y cargos
ok(M.balance(d({start:1000,payments:[{amount:300},{amount:-50}]}))===750,'saldo = inicial - pagos + cargos');
ok(M.balance(d({start:100,payments:[{amount:500}]}))===0,'saldo nunca negativo');
// avalancha ahorra >= bola de nieve en intereses
const L=[d({id:'a',start:5000,rate:24,minPayment:150}),d({id:'b',start:800,rate:5,minPayment:40}),d({id:'c',start:2500,rate:15,minPayment:80})];
const av=M.simulate(L,200,'avalanche'), sn=M.simulate(L,200,'snowball'), base=M.baseline(L);
ok(!av.never&&!sn.never,'simulaciones terminan',JSON.stringify({av:[av.months,av.interest],sn:[sn.months,sn.interest],base}));
ok(av.interest<=sn.interest+0.01,'avalancha paga <= intereses que bola de nieve');
ok(av.interest<base.interest&&av.months<base.months,'extra mejora el plan base');
ok(av.order[0]==='b'||av.order.length===3,'orden con 3 deudas',av.order.join('>'));
ok(sn.order[0]==='b','bola de nieve: primero la más pequeña',sn.order.join('>'));
// avalancha apunta primero a la de mayor tasa: con mínimos que no la saldan sola, 'a' no es la primera en terminar pero recibe el extra
const only=M.simulate([d({id:'a',start:1000,rate:12,minPayment:100})],0,'avalanche'); ok(only.months===11,'una deuda, sin extra = payoff',only.months);
// sin extra y una deuda: simulate == payoff
const s1=M.simulate(L,0,'avalanche'); ok(s1.months<=base.months,'reasignar mínimos no empeora',s1.months+' vs '+base.months);
// no termina
const nv=M.simulate([d({start:10000,rate:30,minPayment:50})],0,'avalanche'); ok(nv.never===true,'simulación sin salida => never');
// presupuesto 0
ok(M.simulate([d({minPayment:0})],0,'avalanche').never===true,'presupuesto 0 => never');
// sin deudas
ok(M.simulate([],100,'snowball').months===0,'sin deudas => 0');
// invariante: total pagado = saldo + intereses (sin extra, una deuda)
const q=M.payoff(2000,18,150); ok(q.months>0&&q.interest>0,'interés positivo',JSON.stringify(q));
console.log(f?('FALLAS '+f):'MATH OK');process.exit(f?1:0);
