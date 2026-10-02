(()=>{const d=document,r=d.documentElement,$=(s,e=d)=>[...e.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* theme */
const tb=$('[data-theme-toggle]'),paint=()=>tb.forEach(b=>b.textContent=r.dataset.theme==='dark'?'☾':'☀');
tb.forEach(b=>b.onclick=()=>{r.dataset.theme=r.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('pr-theme',r.dataset.theme)}catch(e){}paint()});paint();
$('[data-menu]').forEach(b=>b.onclick=()=>$('.nav-links').forEach(n=>n.classList.toggle('open')));
$('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());
/* reveal */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
$('.reveal').forEach((e,i)=>{e.style.transitionDelay=Math.min(i%3,2)*80+'ms';io.observe(e)});
/* scroll progress */
const bar=d.createElement('div');bar.id='progress';d.body.prepend(bar);
addEventListener('scroll',()=>bar.style.transform=`scaleX(${scrollY/(r.scrollHeight-innerHeight||1)})`,{passive:true});
/* cursor glow + card spotlight */
const g=d.getElementById('cursorGlow');
addEventListener('pointermove',e=>{if(g){g.style.opacity=1;g.style.transform=`translate(${e.clientX-210}px,${e.clientY-210}px)`}
const c=e.target.closest&&e.target.closest('.branch,.latest-card,.visual-card,.publication,.mini-project,.media-card');
if(c){const b=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-b.left+'px');c.style.setProperty('--my',e.clientY-b.top+'px')}});
/* quantum background: Bloch sphere, double-slit buildup, circuit, entangled pair, drifting kets */
const cv=d.createElement('canvas');cv.id='qnet';d.body.prepend(cv);const x=cv.getContext('2d');
let W,H,S,K=[],hits=[],C1,C2,C3,ct=0;const m={x:.5,y:.5};
const KS=['|0⟩','|1⟩','|+⟩','|−⟩','|ψ⟩','|Φ⁺⟩','ρ','Û','⟨φ|'];
const init=()=>{W=cv.width=innerWidth;H=cv.height=innerHeight;S=Math.max(.55,Math.min(1,W/1100));
K=Array.from({length:W<700?8:16},(_,i)=>({x:Math.random()*W,y:Math.random()*H,v:.12+Math.random()*.25,k:KS[i%KS.length],s:12+Math.random()*14,p:Math.random()*6}))};
init();addEventListener('resize',init);addEventListener('pointermove',e=>{m.x=e.clientX/W;m.y=e.clientY/H});
const V=n=>getComputedStyle(r).getPropertyValue(n).trim();
const ln=(a,b,c,e)=>{x.beginPath();x.moveTo(a,b);x.lineTo(c,e);x.stroke()};
const tx=(s,a,b,sz,al)=>{x.globalAlpha=al;x.font=sz+'px Georgia,serif';x.fillText(s,a,b)};
const bloch=(cx,cy,R,t)=>{const T=.42,P=(a,b,c)=>[cx+R*a,cy-R*(c*Math.cos(T)+b*Math.sin(T))];
x.strokeStyle=C1;x.fillStyle=C1;x.lineWidth=1;x.globalAlpha=.3;x.beginPath();x.arc(cx,cy,R,0,7);x.stroke();
for(const f of [a=>[Math.cos(a),Math.sin(a),0],a=>[Math.sin(a),0,Math.cos(a)]]){x.beginPath();for(let i=0;i<=64;i++){const p=P(...f(i/64*6.2832));i?x.lineTo(...p):x.moveTo(...p)}x.stroke()}
ln(...P(0,0,-1.15),...P(0,0,1.15));
const th=1.1+.7*Math.sin(t/2200)+(m.y-.5),ph=t/900+(m.x-.5)*4,q=h=>[Math.sin(th)*Math.cos(h),Math.sin(th)*Math.sin(h),Math.cos(th)];
for(let k=14;k>0;k--){const p=P(...q(ph-k*.07));x.globalAlpha=.4-k*.026;x.fillStyle=C2;x.beginPath();x.arc(p[0],p[1],2,0,7);x.fill()}
const tip=P(...q(ph));x.strokeStyle=C3;x.fillStyle=C3;x.lineWidth=2;x.globalAlpha=.8;ln(cx,cy,...tip);x.beginPath();x.arc(...tip,4,0,7);x.fill();
x.fillStyle=C1;x.textAlign='center';const a=P(0,0,1.28),b=P(0,0,-1.32);tx('|0⟩',a[0],a[1],13,.5);tx('|1⟩',b[0],b[1],13,.5);
tx('P(0) = '+(Math.cos(th/2)**2).toFixed(2),cx,cy+R*1.55,12,.45)};
const slit=(x0,y0,t)=>{const h=70*S,xs=x0+170*S;x.strokeStyle=C1;x.fillStyle=C1;x.lineWidth=2;x.globalAlpha=.4;
ln(x0,y0-h,x0,y0-17*S);ln(x0,y0-11*S,x0,y0+11*S);ln(x0,y0+17*S,x0,y0+h);x.lineWidth=1;ln(xs,y0-h,xs,y0+h);
for(const s of [-14,14])for(let k=0;k<4;k++){const rd=((t/40+k*35)%140)*S;x.globalAlpha=.3*(1-rd/(140*S));x.beginPath();x.arc(x0,y0+s*S,rd,-1.2,1.2);x.stroke()}
if(Math.random()<.5){const y=(Math.random()*2-1)*70;if(Math.random()<Math.cos(y*.2)**2*Math.exp(-((y/45)**2)))hits.push({y,dx:Math.random()*14,a:1})}
hits=hits.filter(p=>(p.a-=.004)>0);x.fillStyle=C2;for(const p of hits){x.globalAlpha=p.a*.7;x.beginPath();x.arc(xs+p.dx*S,y0+p.y*S,1.7,0,7);x.fill()}
x.fillStyle=C1;x.textAlign='left';tx('no which-path record → fringes build up',x0-10,y0+h+22,11,.4)};
const circ=(x0,y0,t)=>{const L=360*S,g=28*S,bx=(cx,cy)=>x.strokeRect(cx-10*S,cy-10*S,20*S,20*S);
x.strokeStyle=C1;x.fillStyle=C1;x.lineWidth=1;x.textAlign='center';
for(let i=0;i<3;i++){x.globalAlpha=.3;ln(x0,y0+i*g,x0+L,y0+i*g);tx('|0⟩',x0-18*S,y0+i*g+4,12,.45)}
x.globalAlpha=.5;bx(x0+60*S,y0);tx('H',x0+60*S,y0+4,12,.6);
const gx=x0+150*S;x.globalAlpha=.5;ln(gx,y0,gx,y0+g);x.beginPath();x.arc(gx,y0,3.5,0,7);x.fill();x.beginPath();x.arc(gx,y0+g,9*S,0,7);x.stroke();ln(gx-9*S,y0+g,gx+9*S,y0+g);ln(gx,y0+g-9*S,gx,y0+g+9*S);
bx(gx+50*S,y0+2*g);tx('T',gx+50*S,y0+2*g+4,12,.6);
for(let i=0;i<2;i++){const mx=x0+290*S;x.globalAlpha=.5;bx(mx,y0+i*g);x.beginPath();x.arc(mx,y0+i*g+3*S,6*S,3.14,6.28);x.stroke();ln(mx,y0+i*g+3*S,mx+4*S,y0+i*g-5*S)}
x.fillStyle=C3;for(let i=0;i<3;i++){x.globalAlpha=.8;x.beginPath();x.arc(x0+((t/6+i*120)%L),y0+i*g,3,0,7);x.fill()}
tx('qubits · gates · measurement',x0+L/2,y0+3*g+10,11,.4)};
const pair=(cx,cy,t)=>{const n=Math.floor(t/2800),ph=(t%2800)/2800,pr=Math.min(1,ph/.5),bit=Math.imul(n+7,2654435761)>>>31,d2=120*S;
x.strokeStyle=C1;x.fillStyle=C1;x.lineWidth=1;x.textAlign='center';x.setLineDash([4,6]);x.globalAlpha=.2;ln(cx-d2,cy,cx+d2,cy);x.setLineDash([]);
x.globalAlpha=.5;x.beginPath();x.arc(cx,cy,7,0,7);x.stroke();x.beginPath();x.arc(cx,cy,12+3*Math.sin(t/300),0,7);x.globalAlpha=.25;x.stroke();
for(const s of [-1,1]){x.globalAlpha=.45;x.beginPath();x.arc(cx+s*d2,cy,16*S,0,7);x.stroke();
x.fillStyle=C2;x.globalAlpha=.8*(1-pr*.6);x.beginPath();x.arc(cx+s*d2*pr,cy,3.5,0,7);x.fill();x.fillStyle=C3;
tx(pr<1?'?':String(bit),cx+s*d2,cy+5,16,pr<1?.3:.9);x.fillStyle=C1;tx(s<0?'Alice':'Bob',cx+s*d2,cy+34*S,11,.4)}
tx('|Φ⁺⟩ pair · outcomes perfectly correlated',cx,cy-34*S,11,.4)};
const draw=t=>{if(ct++%60===0){C1=V('--accent2')||'#2bd4e0';C2=V('--accent')||'#8b7bff';C3=V('--warm')||'#ffb86b'}
x.clearRect(0,0,W,H);x.setLineDash([]);
x.fillStyle=C1;x.textAlign='center';for(const k of K){k.y-=k.v;if(k.y<-30){k.y=H+30;k.x=Math.random()*W}tx(k.k,k.x,k.y,k.s,.1+.08*Math.sin(t/1500+k.p))}
bloch(W-140*S-20,170*S,80*S,t);pair(W-190*S,H-120*S,t);
if(W>=760){circ(40*S,130*S,t);slit(W*.05,H-130*S,t)}
x.globalAlpha=1;reduce||requestAnimationFrame(draw)};requestAnimationFrame(draw);
/* publications: live search */
const nav=d.querySelector('.pub-nav');
if(nav&&$('.publication').length){const s=d.createElement('input');s.id='pubSearch';s.type='search';s.placeholder='Filter papers by title, author, topic…';s.setAttribute('aria-label','Filter publications');nav.append(s);
s.oninput=()=>{const q=s.value.toLowerCase();$('.publication').forEach(p=>p.classList.toggle('hide',!p.textContent.toLowerCase().includes(q)))}}
/* hero headline: rotating research keywords */
const lead=d.querySelector('.hero .eyebrow');
if(lead&&!reduce){const w=['Quantum Information Theory · SNBNCBS','Foundations · Contextuality','Cryptography · DI-QKD','Open systems · Optomechanics'];let i=0;setInterval(()=>{lead.style.opacity=0;setTimeout(()=>{lead.textContent=w[i=++i%w.length];lead.style.opacity=1},300)},3600);lead.style.transition='opacity .3s'}
})();


/* V6 refinements */
(()=>{
  const d=document, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const all=s=>[...d.querySelectorAll(s)];
  if(!reduce){
    all('.btn.primary,.brand-mark').forEach(el=>{
      el.classList.add('magnetic');
      el.addEventListener('pointermove',e=>{const b=el.getBoundingClientRect(),x=(e.clientX-b.left-b.width/2)*.08,y=(e.clientY-b.top-b.height/2)*.08;el.style.transform=`translate(${x}px,${y}px)`});
      el.addEventListener('pointerleave',()=>el.style.transform='');
    });
  }
  requestAnimationFrame(()=>d.body.classList.add('ready'));
  all('[data-fullscreen]').forEach(b=>b.addEventListener('click',()=>{const shell=b.closest('.lab-shell');if(!shell)return;if(!d.fullscreenElement)shell.requestFullscreen?.();else d.exitFullscreen?.()}));
  all('.nav-links a').forEach(a=>a.addEventListener('click',()=>all('.nav-links').forEach(n=>n.classList.remove('open'))));
})();
