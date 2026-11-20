;(function(){
  window.__calls=[]; window.__plan=window.__plan||{plan:"pro",source:"trial",pro_until:new Date(Date.now()+10*864e5).toISOString(),trial_used:true,ai_month:1,scans_month:1,limits:{categories:null,ai_month:null,scans_month:100,history_months:null}};
  let prof={currency:""};
  const orig=window.Data;
  const g0=orig.getProfile;
  Object.assign(window.Data,{
    myPlan:async()=>window.__noPlan?null:window.__plan,
    adminPlans:async()=>[{email:"maria@ejemplo.com",plan:"pro",source:"admin",pro_until:null}],
    adminSetPlan:async(e,p,d)=>{window.__calls.push(["adminSetPlan",e,p,d]);return {}},
    getProfile:async()=>({id:"u1",email:"carlos@ejemplo.com",name:"Carlos Mejía",avatarUrl:"",provider:"google",ready:true,currency:window.__cur===undefined?"CAD":window.__cur}),
    saveProfile:async p=>{window.__calls.push(["saveProfile",p]);return {}},
    createTransaction:async t=>{window.__calls.push(["createTransaction",t]);return {}},
    createCategory:async c=>{window.__calls.push(["createCategory",c]); if(window.__catLimit){const e=new Error("limit");e.code="limit_categories";throw e;} return {id:99,name:c.name,kind:c.kind}},
    createHousehold:async()=>{const e=new Error("pro");e.code="pro_required";throw e},
    scanReceipt:async p=>{window.__calls.push(["scanReceipt",{lang:p.lang,cur:p.currency,cats:p.categories,len:p.image.length}]); if(window.__scanErr){const e=new Error("x");e.code=window.__scanErr;throw e;} return window.__scanRes||{merchant:"Tim Hortons",date:"2026-11-12",total:12.35,currency:"CAD",tax:1.2,category:"Cafetería"}}
  });

  // ---- metas (en memoria) ----
  (function(){
    const d=n=>{const x=new Date();x.setMonth(x.getMonth()+n);return x.toISOString().slice(0,10)};
    let id=10, G=window.__goals=window.__goals||[
      {id:"g1",name:"Casa",icon:"home",target:20000,targetDate:d(18),archived:false,shared:false,createdAt:d(-6)+"T00:00:00Z",contributions:[{id:"c1",amount:3000,note:"inicial",date:d(-5),mine:true},{id:"c2",amount:500,note:"",date:d(-1),mine:true}]},
      {id:"g2",name:"Viaje a Perú",icon:"plane",target:2000,targetDate:null,archived:false,shared:false,createdAt:d(-3)+"T00:00:00Z",contributions:[{id:"c3",amount:2000,note:"",date:d(0),mine:true}]}
    ];
    Object.assign(window.Data,{
      deleteAccount:async()=>{window.__calls.push(["deleteAccount"]); if(window.__delErr){throw new Error("No se pudo eliminar la cuenta")} return {}},
      askGuide:async p=>{window.__calls.push(["askGuide",p]); if(window.__guideErr){const e=new Error("x");e.code=window.__guideErr;throw e} return {text:"1. Ve a \"Metas de ahorro\".\n2. Pulsa \"+ Nueva meta\"."}},
      getGoals:async()=>JSON.parse(JSON.stringify(window.__goalsOverride||G)),
      createGoal:async g=>{ if(window.__goalLimit){const e=new Error("limit");e.code="limit_goals";throw e}
        window.__calls.push(["createGoal",g]); G.push({id:"g"+(++id),name:g.name,icon:g.icon,target:g.target,targetDate:g.targetDate,archived:false,shared:false,createdAt:new Date().toISOString(),contributions:[]});return {}},
      updateGoal:async(i,p)=>{window.__calls.push(["updateGoal",i,p]);const g=G.find(x=>x.id===i);if(p.name!==undefined)g.name=p.name;if(p.icon!==undefined)g.icon=p.icon;if(p.target!==undefined)g.target=p.target;if(p.targetDate!==undefined)g.targetDate=p.targetDate;if(p.archived!==undefined)g.archived=p.archived;return {}},
      deleteGoal:async i=>{window.__calls.push(["deleteGoal",i]);const k=G.findIndex(x=>x.id===i);G.splice(k,1);return {}},
      addGoalContribution:async(i,c)=>{window.__calls.push(["addGoalContribution",i,c]);G.find(x=>x.id===i).contributions.push({id:"c"+(++id),amount:c.amount,note:c.note,date:c.date,mine:true});return {}},
      deleteGoalContribution:async i=>{window.__calls.push(["delContrib",i]);G.forEach(g=>g.contributions=g.contributions.filter(c=>c.id!==i));return {}}
    });
  })();

  // ---- deudas (en memoria) ----
  (function(){
    let id=100;
    const G=window.__debts=window.__debts||[
      {id:"d1",name:"Visa",kind:"card",start:3000,rate:19.9,minPayment:120,dueDay:(new Date().getDate()+2>28?1:new Date().getDate()+2),archived:false,shared:false,createdAt:new Date().toISOString(),payments:[{id:"p1",amount:200,note:"",date:new Date().toISOString().slice(0,10),mine:true}]},
      {id:"d2",name:"Préstamo del carro",kind:"car",start:12000,rate:6.5,minPayment:350,dueDay:20,archived:false,shared:false,createdAt:new Date().toISOString(),payments:[]}
    ];
    Object.assign(window.Data,{
      getDebts:async()=>JSON.parse(JSON.stringify(window.__debtsOverride||G)),
      createDebt:async d=>{ if(window.__debtLimit){const e=new Error("limit");e.code="limit_debts";throw e}
        window.__calls.push(["createDebt",d]); G.push({id:"d"+(++id),name:d.name,kind:d.kind,start:d.start,rate:d.rate,minPayment:d.minPayment,dueDay:d.dueDay,archived:false,shared:false,createdAt:new Date().toISOString(),payments:[]});return {}},
      updateDebt:async(i,p)=>{window.__calls.push(["updateDebt",i,p]);const g=G.find(x=>x.id===i);Object.keys(p).forEach(k=>{if(p[k]!==undefined)g[k]=p[k]});return {}},
      deleteDebt:async i=>{window.__calls.push(["deleteDebt",i]);G.splice(G.findIndex(x=>x.id===i),1);return {}},
      addDebtPayment:async(i,c)=>{window.__calls.push(["addDebtPayment",i,c]);G.find(x=>x.id===i).payments.push({id:"p"+(++id),amount:c.amount,note:c.note,date:c.date,mine:true});return {}},
      deleteDebtPayment:async i=>{window.__calls.push(["delPay",i]);G.forEach(g=>g.payments=g.payments.filter(c=>c.id!==i));return {}}
    });
  })();
  // createCategory fake must make the category appear in getDB
  const gdb=window.Data.getDB; const extra=[];
  window.Data.getDB=async()=>{const d=await gdb(); return {categories:d.categories.concat(extra),transactions:d.transactions}};
  const cc=window.Data.createCategory; window.Data.createCategory=async c=>{const r=await cc(c); extra.push(r); return r};
})();
;(function(){
  let last=window.__last||null;
  Object.assign(window.Data,{
    getLastAdvice:async()=>last,
    saveLastAdvice:async(a,m,l)=>{last={advice:a,month:m,lang:l,created_at:new Date().toISOString()};return last.created_at},
    adminGeo:async()=>({visit_countries:[],signup_countries:[]}),
    setMyCountry:async()=>{}
  });
})();
