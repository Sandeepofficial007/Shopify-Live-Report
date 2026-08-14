"use client";

import { useState } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Line, BarChart, Bar, Area, Cell,
} from "recharts";

var CL = { bg:"#0B0F1A", cd:"#131825", bd:"#1E2A42", gn:"#22C55E", rd:"#EF4444", am:"#F59E0B", tx:"#E2E8F0", mt:"#94A3B8", dm:"#64748B", gr:"#1E293B", cp:"#818CF8", nb:"#34D399", n4:"#F9A8D4", al:"#C4B5FD", cpp:"#C084FC", nbp:"#2DD4BF", n4p:"#FB7185" };

// ═══ HELPERS ═══
function f$(v){return "$"+Math.round(v).toLocaleString();}
function avg(a,s,e){var sl=a.slice(s,e);return sl.length?sl.reduce(function(x,y){return x+y;},0)/sl.length:0;}
function pct(a,b){return b===0?0:((a-b)/b)*100;}
function rng(a){var v=a.filter(function(x){return x>0;});return v.length?{lo:Math.min.apply(null,v),hi:Math.max.apply(null,v)}:{lo:0,hi:1};}
function yoy(c,p){return p>0?parseFloat(((c-p)/p*100).toFixed(1)):0;}

function hBg(val,lo,hi,inv){
  if(!val||lo===hi)return"transparent";var t=(val-lo)/(hi-lo);if(inv)t=1-t;t=Math.max(0,Math.min(1,t));
  var r,g,b;if(t<0.25){var p=t/0.25;r=153+67*p;g=27+23*p;b=27+3*p;}
  else if(t<0.5){var p2=(t-0.25)/0.25;r=220-3*p2;g=50+69*p2;b=30-24*p2;}
  else if(t<0.75){var p3=(t-0.5)/0.25;r=217-116*p3;g=119+44*p3;b=6+7*p3;}
  else{var p4=(t-0.75)/0.25;r=101-79*p4;g=163;b=13+61*p4;}
  return"rgba("+Math.round(r)+","+Math.round(g)+","+Math.round(b)+",0.38)";
}
function hTx(val,lo,hi,inv){
  if(!val||lo===hi)return CL.mt;var t=(val-lo)/(hi-lo);if(inv)t=1-t;t=Math.max(0,Math.min(1,t));
  if(t<0.2)return"#FCA5A5";if(t<0.4)return"#FDBA74";if(t<0.6)return"#FDE68A";if(t<0.8)return"#BEF264";return"#86EFAC";
}

// ═══ UI COMPONENTS ═══
function Pill(p){return<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:5,fontSize:10,fontWeight:600,background:p.color+"18",color:p.color}}>{p.children}</span>;}
function CB(p){return<div style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:16,marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:CL.tx,marginBottom:9}}>{p.title}</div><ResponsiveContainer width="100%" height={p.h||280}>{p.children}</ResponsiveContainer></div>;}
function Ins(p){var cc=p.type==="positive"?{bg:CL.gn+"10",b:CL.gn+"25",c:CL.gn}:p.type==="negative"?{bg:CL.rd+"10",b:CL.rd+"25",c:CL.rd}:{bg:CL.am+"10",b:CL.am+"25",c:CL.am};return<div style={{background:cc.bg,border:"1px solid "+cc.b,borderRadius:8,padding:"8px 12px",fontSize:11,color:CL.tx,lineHeight:1.5,display:"flex",gap:7,marginBottom:7}}><span style={{color:cc.c,flexShrink:0}}>{p.type==="positive"?"\u2726":"\u26A0"}</span><span>{p.children}</span></div>;}
function TT(p){if(!p.active||!p.payload||!p.payload.length)return null;return<div style={{background:"#1A2035",border:"1px solid "+CL.bd,borderRadius:6,padding:"7px 11px",maxWidth:280}}><div style={{fontSize:10,fontWeight:600,color:CL.tx,marginBottom:3}}>{p.label}</div>{p.payload.filter(function(x){return x.value!==0;}).map(function(x,i){var d=typeof x.value==="number"?(x.value>=500?"$"+x.value.toLocaleString():x.value<20?x.value.toFixed(2)+"%":x.value.toLocaleString()):String(x.value);return<div key={i} style={{display:"flex",alignItems:"center",gap:4,marginBottom:1}}><span style={{width:6,height:6,borderRadius:"50%",background:x.color||x.stroke}}/><span style={{fontSize:9,color:CL.mt}}>{x.name}:</span><span style={{fontSize:9,fontWeight:600,color:CL.tx}}>{d}</span></div>;})}</div>;}
function Leg(){return<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:9,color:CL.dm}}>Low</span><div style={{height:8,flex:1,maxWidth:200,borderRadius:4,background:"linear-gradient(90deg, rgba(153,27,27,0.5), rgba(217,119,6,0.5), rgba(22,163,74,0.5))"}}/><span style={{fontSize:9,color:CL.dm}}>High</span></div>;}
var thS={padding:"6px",textAlign:"center",fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",borderBottom:"2px solid "+CL.bd,position:"sticky",top:0,background:CL.cd,zIndex:1};
function HC(p){var bg=p.val?hBg(p.val,p.lo,p.hi,p.inv):"transparent";var tc=p.val?hTx(p.val,p.lo,p.hi,p.inv):CL.mt;return<td style={{padding:"5px 8px",textAlign:"center",fontSize:10,fontWeight:p.bold?700:600,color:tc,background:bg,borderBottom:"1px solid "+CL.bd+"20",borderLeft:p.val?"3px solid "+tc:"3px solid transparent"}}>{p.v}</td>;}
function YC(p){if(p.val===undefined||p.val===null)return<td style={{padding:"5px 6px",textAlign:"center",fontSize:10,borderBottom:"1px solid "+CL.bd+"20"}}/>;var bg=p.val>=0?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)";return<td style={{padding:"5px 6px",textAlign:"center",fontSize:10,borderBottom:"1px solid "+CL.bd+"20",background:bg}}><Pill color={p.val>=0?CL.gn:CL.rd}>{p.val>=0?"+":""}{p.val}%</Pill></td>;}
function MonC(p){var inR1=p.i>=p.r1s&&p.i<=p.r1e;var inR2=p.i>=p.r2s&&p.i<=p.r2e;var bgc=inR2?CL.al+"10":inR1?CL.am+"10":"transparent";var tc=inR2?CL.al:inR1?CL.am:CL.tx;return<td style={{padding:"5px 6px",textAlign:"left",fontSize:10,fontWeight:600,color:tc,borderBottom:"1px solid "+CL.bd+"20",whiteSpace:"nowrap",background:bgc}}>{inR2?"\u25B8 ":inR1?"\u25C6 ":""}{p.m}</td>;}
function PlainTd(p){return<td style={{padding:"5px 6px",textAlign:"center",fontSize:10,color:CL.mt,borderBottom:"1px solid "+CL.bd+"20"}}>{p.children}</td>;}
function pLabel(MO,s,e){return(MO[s]||"?")+" - "+(MO[e]||"?");}
function MonthPicker(p){return<select style={{background:CL.bg,color:CL.tx,border:"1px solid "+CL.bd,borderRadius:5,padding:"4px 6px",fontSize:10,fontFamily:"inherit",cursor:"pointer",minWidth:70}} value={p.val} onChange={function(ev){p.onChange(parseInt(ev.target.value));}}>{p.months.map(function(m,i){return<option key={i} value={i} style={{background:CL.bg}}>{m}</option>;})}</select>;}

// ═══ STORE OVERVIEW ═══
function StoreOverview(p){
  var d=p.store,MO=p.months,ac=p.ac,nm=p.nm;
  var cd=MO.map(function(m,i){return{m:m,s:d.s[i]||0,sp:d.sp[i]||0,c:d.cv[i]||0};});
  var aS1=avg(d.s,p.r1s,p.r1e+1),aS2=avg(d.s,p.r2s,p.r2e+1);
  var aC1=avg(d.cv,p.r1s,p.r1e+1),aC2=avg(d.cv,p.r2s,p.r2e+1);
  var aA1=avg(d.av,p.r1s,p.r1e+1),aA2=avg(d.av,p.r2s,p.r2e+1);
  var aO1=avg(d.or,p.r1s,p.r1e+1),aO2=avg(d.or,p.r2s,p.r2e+1);
  var cards=[{l:"Sales/mo",v:f$(aS2),ch:pct(aS2,aS1)},{l:"Conv Rate",v:aC2.toFixed(2)+"%",ch:pct(aC2,aC1)},{l:"AOV",v:"$"+aA2.toFixed(2),ch:pct(aA2,aA1)},{l:"Orders/mo",v:Math.round(aO2).toString(),ch:pct(aO2,aO1)}];
  return<div>
    <div style={{marginBottom:12,marginTop:18}}><h2 style={{fontSize:15,fontWeight:700,color:CL.tx,margin:0}}>{nm} — Summary</h2><p style={{fontSize:11,color:CL.mt,margin:"2px 0 0"}}><span style={{color:CL.am}}>P1: {pLabel(MO,p.r1s,p.r1e)}</span> vs <span style={{color:ac}}>P2: {pLabel(MO,p.r2s,p.r2e)}</span></p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:9,marginBottom:14}}>
      {cards.map(function(s,i){return<div key={i} style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:13}}><div style={{fontSize:9,color:CL.mt,fontWeight:600,textTransform:"uppercase",marginBottom:3}}>{s.l}</div><div style={{fontSize:18,fontWeight:700,color:CL.tx}}>{s.v}</div><Pill color={s.ch>=0?CL.gn:CL.rd}>{s.ch>=0?"\u25B2":"\u25BC"}{Math.abs(s.ch).toFixed(1)}%</Pill></div>;})}
    </div>
    <CB title="Net Sales" h={250}><ComposedChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis dataKey="m" tick={{fontSize:9,fill:CL.dm}}/><YAxis tick={{fontSize:9,fill:CL.dm}} tickFormatter={function(v){return "$"+(v/1000).toFixed(0)+"k";}}/><Tooltip content={TT}/><Area type="monotone" dataKey="s" fill={ac+"15"} stroke="none"/><Line type="monotone" dataKey="s" stroke={ac} strokeWidth={2.5} dot={{r:3,fill:ac}} name="Current"/><Line type="monotone" dataKey="sp" stroke={CL.am} strokeWidth={2} strokeDasharray="5 5" dot={{r:2,fill:CL.am}} name="Prior Year"/></ComposedChart></CB>
    <CB title="Conversion Rate" h={220}><ComposedChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis dataKey="m" tick={{fontSize:9,fill:CL.dm}}/><YAxis tick={{fontSize:9,fill:CL.dm}} tickFormatter={function(v){return v+"%";}}/><Tooltip content={TT}/><Line type="monotone" dataKey="c" stroke={ac} strokeWidth={2.5} dot={{r:3,fill:ac}} name="Conv%"/></ComposedChart></CB>
  </div>;
}

// ═══ STORE SALES HEATMAP ═══
function StoreSales(p){
  var d=p.store,MO=p.months,sR=rng(d.s);
  var cd=MO.map(function(m,i){return{m:m,s:d.s[i]||0,sp:d.sp[i]||0};});
  return<div>
    <CB title="Net Sales" h={280}><ComposedChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis dataKey="m" tick={{fontSize:9,fill:CL.dm}}/><YAxis tick={{fontSize:9,fill:CL.dm}} tickFormatter={function(v){return "$"+(v/1000).toFixed(0)+"k";}}/><Tooltip content={TT}/><Area type="monotone" dataKey="s" fill={p.ac+"15"} stroke="none"/><Line type="monotone" dataKey="s" stroke={p.ac} strokeWidth={2.5} dot={{r:3,fill:p.ac}} name="Current"/><Line type="monotone" dataKey="sp" stroke={CL.am} strokeWidth={2} strokeDasharray="5 5" dot={{r:2,fill:CL.am}} name="Prior Year"/></ComposedChart></CB>
    <div style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:14,marginBottom:12,overflowX:"auto"}}><div style={{fontSize:12,fontWeight:600,color:CL.tx,marginBottom:4}}>Monthly Heatmap</div><Leg/>
    <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={{...thS,textAlign:"left"}}>Month</th><th style={{...thS,color:p.ac}}>Net Sales</th><th style={thS}>Prior Year</th><th style={thS}>YoY%</th></tr></thead>
    <tbody>{MO.map(function(m,i){return<tr key={i}><MonC m={m} i={i} r1s={p.r1s} r1e={p.r1e} r2s={p.r2s} r2e={p.r2e}/><HC v={f$(d.s[i]||0)} val={d.s[i]} lo={sR.lo} hi={sR.hi}/><PlainTd>{f$(d.sp[i]||0)}</PlainTd><YC val={yoy(d.s[i]||0,d.sp[i]||0)}/></tr>;})}</tbody></table></div>
  </div>;
}

// ═══ STORE FUNNEL ═══
function StoreFunnel(p){
  var d=p.store,MO=p.months,r1s=p.r1s,r1e=p.r1e,r2s=p.r2s,r2e=p.r2e;
  var bSe=avg(d.se,r1s,r1e+1),aSe=avg(d.se,r2s,r2e+1);
  var bCa=avg(d.ca,r1s,r1e+1),aCa=avg(d.ca,r2s,r2e+1);
  var bRc=avg(d.rc,r1s,r1e+1),aRc=avg(d.rc,r2s,r2e+1);
  var bCk=avg(d.ck,r1s,r1e+1),aCk=avg(d.ck,r2s,r2e+1);
  var stages=["Sessions","Add to Cart","Reached Checkout","Completed"];
  var fB=[bSe,bCa,bRc,bCk],fA=[aSe,aCa,aRc,aCk];
  var stgCol=[CL.dm,CL.am,"#3B82F6",CL.gn];
  return<div>
    <div style={{marginBottom:12,marginTop:18}}><h2 style={{fontSize:15,fontWeight:700,color:CL.tx,margin:0}}>Conversion Funnel</h2><p style={{fontSize:11,color:CL.mt,margin:"2px 0 0"}}><span style={{color:CL.am}}>P1: {pLabel(MO,r1s,r1e)}</span> vs <span style={{color:p.ac}}>P2: {pLabel(MO,r2s,r2e)}</span></p></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
      {[{label:"Period 1",data:fB,col:CL.am},{label:"Period 2",data:fA,col:p.ac}].map(function(per,pi){
        var top=per.data[0];
        return<div key={pi} style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:per.col,marginBottom:10}}>{per.label}</div>
          {stages.map(function(st,si){var val=Math.round(per.data[si]);var pctT=top>0?(val/top*100):0;var barW=Math.max(pctT,2);var dropP=si>0&&per.data[si-1]>0?((per.data[si-1]-val)/per.data[si-1]*100).toFixed(1):null;
            return<div key={si} style={{marginBottom:si<3?2:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><span style={{fontSize:9,color:CL.mt,fontWeight:600}}>{st}</span><span style={{fontSize:10,fontWeight:700,color:CL.tx}}>{val.toLocaleString()} <span style={{fontSize:8,color:CL.dm}}>({pctT.toFixed(1)}%)</span></span></div><div style={{height:18,background:CL.bg,borderRadius:4,overflow:"hidden",marginBottom:1}}><div style={{height:"100%",width:barW+"%",background:stgCol[si],borderRadius:4}}/></div>{dropP&&<div style={{textAlign:"center",fontSize:8,color:CL.rd,fontWeight:600,padding:"1px 0"}}>{"\u25BC"} {dropP}% drop</div>}</div>;})}
        </div>;})}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:9,marginBottom:14}}>
      {[{l:"Sess \u2192 Cart",b:bSe>0?bCa/bSe*100:0,a:aSe>0?aCa/aSe*100:0},{l:"Cart \u2192 Chk",b:bCa>0?bRc/bCa*100:0,a:aCa>0?aRc/aCa*100:0},{l:"Chk \u2192 Complete",b:bRc>0?bCk/bRc*100:0,a:aRc>0?aCk/aRc*100:0},{l:"Overall",b:bSe>0?bCk/bSe*100:0,a:aSe>0?aCk/aSe*100:0}].map(function(m,i){var ch=m.b>0?pct(m.a,m.b):0;return<div key={i} style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:13}}><div style={{fontSize:9,color:CL.mt,fontWeight:600,textTransform:"uppercase",marginBottom:3}}>{m.l}</div><div style={{fontSize:16,fontWeight:700,color:CL.tx}}>{m.a.toFixed(1)}%</div><div style={{fontSize:9,color:CL.dm}}>was {m.b.toFixed(1)}%</div>{m.b>0&&<Pill color={ch>=0?CL.gn:CL.rd}>{ch>=0?"\u25B2":"\u25BC"}{Math.abs(ch).toFixed(1)}%</Pill>}</div>;})}
    </div>
  </div>;
}

// ═══ STORE CONVERSION (single store) ═══
function StoreConversion(p){
  var d=p.store,MO=p.months,cvR=rng(d.cv);
  var cd=MO.map(function(m,i){return{m:m,c:d.cv[i]||0};});
  return<div>
    <CB title="Conversion Rate Over Time" h={280}><ComposedChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis dataKey="m" tick={{fontSize:9,fill:CL.dm}}/><YAxis tick={{fontSize:9,fill:CL.dm}} tickFormatter={function(v){return v+"%";}}/><Tooltip content={TT}/><Area type="monotone" dataKey="c" fill={p.ac+"15"} stroke="none"/><Line type="monotone" dataKey="c" stroke={p.ac} strokeWidth={2.5} dot={{r:3,fill:p.ac}} name="Conv%"/></ComposedChart></CB>
    <div style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:14,marginBottom:12,overflowX:"auto"}}><div style={{fontSize:12,fontWeight:600,color:CL.tx,marginBottom:4}}>Monthly Heatmap</div><Leg/>
    <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={{...thS,textAlign:"left"}}>Month</th><th style={{...thS,color:p.ac}}>Conv Rate</th></tr></thead>
    <tbody>{MO.map(function(m,i){return<tr key={i}><MonC m={m} i={i} r1s={p.r1s} r1e={p.r1e} r2s={p.r2s} r2e={p.r2e}/><HC v={(d.cv[i]||0).toFixed(2)+"%"} val={d.cv[i]} lo={cvR.lo} hi={cvR.hi}/></tr>;})}</tbody></table></div>
  </div>;
}

// ═══ STORE AOV & ORDERS ═══
function StoreAOV(p){
  var d=p.store,MO=p.months,avR=rng(d.av),orR=rng(d.or);
  var cd=MO.map(function(m,i){return{m:m,a:d.av[i]||0,ap:d.ap[i]||0,o:d.or[i]||0};});
  return<div>
    <CB title="Average Order Value" h={280}><ComposedChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis dataKey="m" tick={{fontSize:9,fill:CL.dm}}/><YAxis tick={{fontSize:9,fill:CL.dm}} tickFormatter={function(v){return "$"+v;}}/><Tooltip content={TT}/><Area type="monotone" dataKey="a" fill={p.ac+"15"} stroke="none"/><Line type="monotone" dataKey="a" stroke={p.ac} strokeWidth={2.5} dot={{r:3,fill:p.ac}} name="AOV"/><Line type="monotone" dataKey="ap" stroke={CL.am} strokeWidth={2} strokeDasharray="5 5" dot={{r:2,fill:CL.am}} name="Prior Year"/></ComposedChart></CB>
    <CB title="Orders Over Time" h={250}><BarChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis dataKey="m" tick={{fontSize:9,fill:CL.dm}}/><YAxis tick={{fontSize:9,fill:CL.dm}}/><Tooltip content={TT}/><Bar dataKey="o" fill={p.ac} radius={[4,4,0,0]} name="Orders"/></BarChart></CB>
    <div style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:14,marginBottom:12,overflowX:"auto"}}><div style={{fontSize:12,fontWeight:600,color:CL.tx,marginBottom:4}}>Monthly Heatmap</div><Leg/>
    <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={{...thS,textAlign:"left"}}>Month</th><th style={{...thS,color:p.ac}}>AOV</th><th style={thS}>Prior Year</th><th style={thS}>YoY%</th><th style={{...thS,color:p.ac}}>Orders</th></tr></thead>
    <tbody>{MO.map(function(m,i){return<tr key={i}><MonC m={m} i={i} r1s={p.r1s} r1e={p.r1e} r2s={p.r2s} r2e={p.r2e}/><HC v={"$"+(d.av[i]||0).toFixed(2)} val={d.av[i]} lo={avR.lo} hi={avR.hi}/><PlainTd>{"$"+(d.ap[i]||0).toFixed(2)}</PlainTd><YC val={yoy(d.av[i]||0,d.ap[i]||0)}/><HC v={Math.round(d.or[i]||0).toString()} val={d.or[i]} lo={orR.lo} hi={orR.hi}/></tr>;})}</tbody></table></div>
  </div>;
}

// ═══ STORE TRAFFIC (single store with session metrics) ═══
function StoreTraffic(p){
  var d=p.store,MO=p.months,ac=p.ac;
  var hasTM=d.se&&d.se.length>0;

  // Session metrics charts data
  var cd=hasTM?MO.map(function(m,i){return{
    m:m, se:d.se[i]||0, sep:d.sep?d.sep[i]||0:0,
    cv:d.cv[i]||0, cvp:d.cvp?d.cvp[i]||0:0,
    acr:d.acr?d.acr[i]||0:0, acrp:d.acrp?d.acrp[i]||0:0,
    ccr:d.ccr?d.ccr[i]||0:0, ccrp:d.ccrp?d.ccrp[i]||0:0,
    c2c:d.c2c?d.c2c[i]||0:0, c2cp:d.c2cp?d.c2cp[i]||0:0,
    ca:d.ca[i]||0, rc:d.rc[i]||0, ck:d.ck[i]||0
  };}):[];

  function MetricChart(title,dk,dkp,h,fmt){
    return<CB title={title} h={h||220}><ComposedChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis dataKey="m" tick={{fontSize:9,fill:CL.dm}}/><YAxis tick={{fontSize:9,fill:CL.dm}} tickFormatter={fmt||function(v){return v;}}/><Tooltip content={TT}/><Area type="monotone" dataKey={dk} fill={ac+"15"} stroke="none"/><Line type="monotone" dataKey={dk} stroke={ac} strokeWidth={2.5} dot={{r:3,fill:ac}} name="Current"/>{dkp&&<Line type="monotone" dataKey={dkp} stroke={CL.am} strokeWidth={2} strokeDasharray="5 5" dot={{r:2,fill:CL.am}} name="Prior Period"/>}</ComposedChart></CB>;
  }

  return<div>
    {hasTM&&<div>
      <div style={{marginBottom:12,marginTop:18}}><h2 style={{fontSize:15,fontWeight:700,color:CL.tx,margin:0}}>Traffic & Session Metrics</h2></div>
      {MetricChart("Sessions","se","sep",250,function(v){return v>=1000?(v/1000).toFixed(0)+"k":v;})}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {MetricChart("Conversion Rate","cv","cvp",200,function(v){return v+"%";})}
        {MetricChart("Add to Cart Rate","acr","acrp",200,function(v){return v+"%";})}
        {MetricChart("Reached Checkout Rate","ccr","ccrp",200,function(v){return v+"%";})}
        {MetricChart("Cart \u2192 Checkout Rate","c2c","c2cp",200,function(v){return v+"%";})}
      </div>
      {/* Funnel numbers stacked bar */}
      <CB title="Funnel Stages" h={250}><BarChart data={cd}><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis dataKey="m" tick={{fontSize:9,fill:CL.dm}}/><YAxis tick={{fontSize:9,fill:CL.dm}} tickFormatter={function(v){return v>=1000?(v/1000).toFixed(0)+"k":v;}}/><Tooltip content={TT}/><Bar dataKey="ck" stackId="f" fill={CL.gn} name="Completed"/><Bar dataKey="rc" stackId="f" fill="#3B82F6" name="Reached Checkout"/><Bar dataKey="ca" stackId="f" fill={CL.am} name="Cart Adds"/><Bar dataKey="se" fill={CL.dm+"60"} name="Sessions"/></BarChart></CB>
    </div>}
    {/* Referrer Table */}
    {(d.rf||[]).length>0&&<div style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:14,marginBottom:12,marginTop:12,overflowX:"auto"}}><div style={{fontSize:12,fontWeight:600,color:CL.tx,marginBottom:4}}>Traffic Sources (Referrers)</div><Leg/><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={{...thS,textAlign:"left"}}>Source</th><th style={thS}>Sessions</th><th style={{...thS,color:ac}}>Conv%</th></tr></thead><tbody>{(d.rf||[]).map(function(r,i){return<tr key={i}><td style={{padding:"5px 6px",textAlign:"left",fontSize:10,fontWeight:600,color:CL.tx,borderBottom:"1px solid "+CL.bd+"20"}}>{r.n}</td><PlainTd>{r.s.toLocaleString()}</PlainTd><HC v={r.r>0?r.r+"%":"0%"} val={r.r} lo={0} hi={16}/></tr>;})}</tbody></table></div>}
  </div>;
}

// ═══ STORE CAMPAIGN (single store - full metrics) ═══
function StoreCampaign(p){
  var d=p.store,ac=p.ac;
  var camps=d.ut||[];
  var chans=d.uc||[];
  var revR=rng(camps.map(function(u){return u.sa;}));
  var seR=rng(camps.map(function(u){return u.se;}));
  var aovR=rng(camps.filter(function(u){return u.av>0;}).map(function(u){return u.av;}));

  // Summary cards
  var totSe=0,totSa=0,totOr=0;
  camps.forEach(function(c){totSe+=c.se;totSa+=c.sa;totOr+=c.or;});
  var totCv=totSe>0?parseFloat((totOr/totSe*100).toFixed(1)):0;
  var totAov=totOr>0?totSa/totOr:0;

  // Bar chart data from channels
  var barData=chans.map(function(ch){return{n:ch.ch,se:ch.se,sa:ch.sa,or:ch.or};});

  return<div>
    <div style={{marginBottom:12,marginTop:18}}><h2 style={{fontSize:15,fontWeight:700,color:CL.tx,margin:0}}>Campaign Performance</h2></div>

    {/* Summary cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:9,marginBottom:14}}>
      {[{l:"Total Sessions",v:totSe.toLocaleString()},{l:"Total Revenue",v:f$(totSa)},{l:"Total Orders",v:totOr.toLocaleString()},{l:"Conv Rate",v:totCv+"%"},{l:"Avg AOV",v:"$"+totAov.toFixed(2)}].map(function(c,i){return<div key={i} style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:13}}><div style={{fontSize:9,color:CL.mt,fontWeight:600,textTransform:"uppercase",marginBottom:3}}>{c.l}</div><div style={{fontSize:16,fontWeight:700,color:CL.tx}}>{c.v}</div></div>;})}
    </div>

    {/* Channel summary bar chart */}
    {barData.length>0&&<CB title="Revenue by Channel" h={250}><BarChart data={barData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={CL.gr}/><XAxis type="number" tick={{fontSize:9,fill:CL.dm}} tickFormatter={function(v){return"$"+(v/1000).toFixed(0)+"k";}}/><YAxis type="category" dataKey="n" tick={{fontSize:9,fill:CL.dm}} width={100}/><Tooltip content={TT}/><Bar dataKey="sa" fill={ac} radius={[0,4,4,0]} name="Revenue"/></BarChart></CB>}

    {/* Channel Summary Table */}
    {chans.length>0&&<div style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:14,marginBottom:12,overflowX:"auto"}}>
      <div style={{fontSize:12,fontWeight:600,color:CL.tx,marginBottom:4}}>Channel Summary</div><Leg/>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><th style={{...thS,textAlign:"left"}}>Channel</th><th style={thS}>Campaigns</th><th style={thS}>Sessions</th><th style={{...thS,color:ac}}>Revenue</th><th style={thS}>Orders</th><th style={thS}>Conv%</th><th style={thS}>AOV</th></tr></thead>
        <tbody>{chans.map(function(ch,i){return<tr key={i}>
          <td style={{padding:"5px 6px",textAlign:"left",fontSize:10,fontWeight:600,color:CL.tx,borderBottom:"1px solid "+CL.bd+"20"}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:ch.cl,marginRight:5}}/>{ch.ch}</td>
          <PlainTd>{ch.campaigns}</PlainTd>
          <PlainTd>{ch.se.toLocaleString()}</PlainTd>
          <HC v={f$(ch.sa)} val={ch.sa} lo={0} hi={revR.hi}/>
          <PlainTd>{ch.or}</PlainTd>
          <HC v={ch.cv+"%"} val={ch.cv} lo={0} hi={20}/>
          <PlainTd>{"$"+ch.av.toFixed(2)}</PlainTd>
        </tr>;})}</tbody>
      </table>
    </div>}

    {/* Full Campaign Detail Table */}
    {camps.length>0&&<div style={{background:CL.cd,border:"1px solid "+CL.bd,borderRadius:11,padding:14,marginBottom:12,overflowX:"auto"}}>
      <div style={{fontSize:12,fontWeight:600,color:CL.tx,marginBottom:4}}>Campaign Detail</div><Leg/>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><th style={{...thS,textAlign:"left",minWidth:150}}>Campaign</th><th style={{...thS,textAlign:"left"}}>Channel</th><th style={thS}>Sessions</th><th style={{...thS,color:ac}}>Revenue</th><th style={thS}>Orders</th><th style={thS}>Conv%</th><th style={thS}>AOV</th></tr></thead>
        <tbody>{camps.slice(0,30).map(function(u,i){return<tr key={i}>
          <td style={{padding:"5px 6px",textAlign:"left",fontSize:10,fontWeight:600,color:CL.tx,borderBottom:"1px solid "+CL.bd+"20",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={u.nm}>{u.nm}</td>
          <td style={{padding:"5px 6px",textAlign:"left",fontSize:9,color:CL.mt,borderBottom:"1px solid "+CL.bd+"20"}}><span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:u.cl,marginRight:4}}/>{u.ch}</td>
          <HC v={u.se.toLocaleString()} val={u.se} lo={seR.lo} hi={seR.hi}/>
          <HC v={f$(u.sa)} val={u.sa} lo={0} hi={revR.hi}/>
          <PlainTd>{u.or}</PlainTd>
          <HC v={u.cv+"%"} val={u.cv} lo={0} hi={20}/>
          <HC v={"$"+u.av.toFixed(2)} val={u.av} lo={aovR.lo} hi={aovR.hi}/>
        </tr>;})}</tbody>
      </table>
      {camps.length>30&&<div style={{fontSize:9,color:CL.dm,padding:"6px 0",textAlign:"center"}}>Showing top 30 of {camps.length} campaigns</div>}
    </div>}
  </div>;
}

// ═══════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════
export default function Dashboard({ data, onRefresh, isRefreshing }) {
  var stT=useState("overview"),tab=stT[0],setTab=stT[1];
  var ST = data.store || {};
  var MO = data.months || [];
  var maxIdx = MO.length - 1;

  var stR1s=useState(0),r1s=stR1s[0],setR1s=stR1s[1];
  var stR1e=useState(Math.min(8,maxIdx)),r1e=stR1e[0],setR1e=stR1e[1];
  var stR2s=useState(Math.min(9,maxIdx)),r2s=stR2s[0],setR2s=stR2s[1];
  var stR2e=useState(maxIdx),r2e=stR2e[0],setR2e=stR2e[1];
  var stDP=useState(false),showDP=stDP[0],setShowDP=stDP[1];

  var ac = CL.al;
  var tabs=[{id:"overview",label:"Overview"},{id:"sales",label:"Net Sales"},{id:"conversion",label:"Conversion"},{id:"aov",label:"AOV & Orders"},{id:"funnel",label:"Funnel"},{id:"traffic",label:"Traffic"},{id:"campaigns",label:"Campaigns"}];
  var sp={store:ST,ac:ac,nm:data.shopName||"Store",months:MO,r1s:r1s,r1e:r1e,r2s:r2s,r2e:r2e};

  function renderTab(){
    if(tab==="overview")return<StoreOverview {...sp}/>;
    if(tab==="sales")return<StoreSales {...sp}/>;
    if(tab==="conversion")return<StoreConversion {...sp}/>;
    if(tab==="aov")return<StoreAOV {...sp}/>;
    if(tab==="funnel")return<StoreFunnel {...sp}/>;
    if(tab==="traffic")return<StoreTraffic store={ST} ac={ac} months={MO}/>;
    if(tab==="campaigns")return<StoreCampaign store={ST} ac={ac}/>;
    return null;
  }

  var lblS={fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4};

  return(
    <div style={{minHeight:"100vh",background:CL.bg,color:CL.tx,fontFamily:"system-ui, sans-serif"}}>
      <div style={{background:CL.cd,borderBottom:"1px solid "+CL.bd,padding:"12px 16px 10px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <h1 style={{fontSize:16,fontWeight:700,margin:0}}>{data.shopName||"Store"} — Analytics</h1>
            <p style={{fontSize:9,color:CL.mt,margin:"1px 0 0"}}>{MO[0]} - {MO[MO.length-1]} {data.lastUpdated ? " · Updated: "+new Date(data.lastUpdated).toLocaleString() : ""}</p>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={function(){setShowDP(!showDP);}} style={{display:"flex",alignItems:"center",gap:5,background:showDP?CL.al+"20":CL.bg,border:"1px solid "+(showDP?CL.al:CL.bd),borderRadius:6,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",color:showDP?CL.al:CL.mt,fontSize:10,fontWeight:600}}>📅 Compare</button>
            <button onClick={onRefresh} disabled={isRefreshing} style={{display:"flex",alignItems:"center",gap:4,background:CL.bg,border:"1px solid "+CL.bd,borderRadius:6,padding:"5px 10px",cursor:isRefreshing?"default":"pointer",fontFamily:"inherit",color:CL.mt,fontSize:10,fontWeight:600,opacity:isRefreshing?0.6:1}}>🔄 {isRefreshing?"Refreshing...":"Refresh Data"}</button>
          </div>
        </div>
        {showDP&&<div style={{background:CL.bg,border:"1px solid "+CL.bd,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:1,minWidth:180}}><div style={{...lblS,color:CL.am}}>◆ Period 1</div><div style={{display:"flex",gap:6,alignItems:"center"}}><MonthPicker val={r1s} months={MO} onChange={function(v){setR1s(v);if(v>r1e)setR1e(v);}}/><span style={{fontSize:9,color:CL.dm}}>to</span><MonthPicker val={r1e} months={MO} onChange={function(v){setR1e(v);if(v<r1s)setR1s(v);}}/></div></div>
            <div style={{flex:1,minWidth:180}}><div style={{...lblS,color:CL.al}}>▸ Period 2</div><div style={{display:"flex",gap:6,alignItems:"center"}}><MonthPicker val={r2s} months={MO} onChange={function(v){setR2s(v);if(v>r2e)setR2e(v);}}/><span style={{fontSize:9,color:CL.dm}}>to</span><MonthPicker val={r2e} months={MO} onChange={function(v){setR2e(v);if(v<r2s)setR2s(v);}}/></div></div>
          </div>
          <div style={{display:"flex",gap:16,marginTop:8,fontSize:9}}><span style={{color:CL.am}}>◆ P1: {pLabel(MO,r1s,r1e)}</span><span style={{color:CL.al}}>▸ P2: {pLabel(MO,r2s,r2e)}</span></div>
        </div>}
      </div>
      <div style={{display:"flex",gap:2,padding:"6px 16px",borderBottom:"1px solid "+CL.bd,background:CL.cd,overflowX:"auto",position:"sticky",top:showDP?195:85,zIndex:19}}>
        {tabs.map(function(t){return<button key={t.id} onClick={function(){setTab(t.id);}} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",background:tab===t.id?ac:"transparent",color:tab===t.id?"#fff":CL.mt,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{t.label}</button>;})}
      </div>
      <div style={{padding:"10px 16px 40px",maxWidth:1200,margin:"0 auto"}}>{renderTab()}</div>
    </div>
  );
}
