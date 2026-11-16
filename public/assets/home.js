
(() => {
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

/* video from embedded data */
const hv0=document.getElementById('heroVid');const _t=document.createElement('video'),_av1=!!_t.canPlayType('video/mp4; codecs="av01.0.08M.08"'),_hevc=!!_t.canPlayType('video/mp4; codecs="hvc1.1.6.L120.90"'),_small=innerWidth<=900||(navigator.connection&&navigator.connection.saveData);const tv0=document.getElementById('typeVid');
// Videos start after the page has loaded, so the text and poster photo appear first; the GROUND clip loads only when it is near the screen.
const startHero=()=>{hv0.src=_small?(_av1?'media/film-1080-av1.mp4?v=20261104':'media/film-720.mp4?v=20261104'):(_av1?'media/film-1440-av1.mp4?v=20261104':(_hevc?'media/film-1440-hevc.mp4?v=20261104':'media/film-720.mp4?v=20261104'));if(!reduced)hv0.play().catch(()=>{})};
const hvo=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){hvo.disconnect();startHero()}},{rootMargin:'1200px 0px'});hvo.observe(hv0);
const tvo=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){tvo.disconnect();tv0.src=_av1?'media/dig-av1.mp4?v=20261104':'media/dig.mp4?v=20261104';if(!reduced)tv0.play().catch(()=>{})}},{rootMargin:'600px 0px'});tvo.observe(tv0);

/* smooth scroll */
let lenis=null;
if(window.Lenis&&!reduced){lenis=new Lenis({lerp:.1,smoothWheel:true});const raf=t=>{lenis.raf(t);requestAnimationFrame(raf)};requestAnimationFrame(raf)}
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');const el=id==='#top'?document.body:$(id);if(!el)return;e.preventDefault();closeMenu();if(lenis)lenis.scrollTo(el,{offset:0,duration:1.4});else el.scrollIntoView({behavior:reduced?'auto':'smooth'})}));

/* menu */
const menu=$('#menu'),burger=$('#burger');
function closeMenu(){menu.classList.remove('open');burger.setAttribute('aria-expanded','false');burger.textContent='Menu'}
burger.onclick=()=>{const o=!menu.classList.contains('open');menu.classList.toggle('open',o);burger.setAttribute('aria-expanded',o);burger.textContent=o?'Close':'Menu'};

/* split headings */
$$('[data-split]').forEach(h=>{
  const walk=n=>{[...n.childNodes].forEach(c=>{if(c.nodeType===3){const f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){f.appendChild(document.createTextNode(w));return}const o=document.createElement('span');o.className='wd';const i=document.createElement('span');i.textContent=w;o.appendChild(i);f.appendChild(o)});c.replaceWith(f)}else if(c.nodeType===1&&c.tagName!=='BR'){walk(c)}})};
  walk(h);$$('.wd>span',h).forEach((s,i)=>s.style.transitionDelay=(i*.06)+'s');
});

/* reveals */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
$$('.rv,[data-split]').forEach((el,i)=>io.observe(el));
$$('.bento .tile').forEach((t,i)=>t.style.transitionDelay=(i%3*.08)+'s');
if(reduced)$$('.rv,[data-split]').forEach(e=>e.classList.add('in'));

/* counters */

const cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;cio.unobserve(e.target);const el=e.target,to=+el.dataset.to,t1=performance.now();const st=n=>{const k=reduced?1:Math.min(1,(n-t1)/1800),v=Math.round(to*(1-Math.pow(1-k,4)));el.firstChild.textContent=v;if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)}),{threshold:.5});
$$('b[data-to]').forEach(el=>cio.observe(el));

/* statement words */
const stmt=$('#stmt');
stmt.innerHTML=stmt.textContent.split(/(\*[^*]+\*)/).map(p=>{const b=p.startsWith('*');const t=b?p.slice(1,-1):p;return t.split(/(\s+)/).map(w=>/^\s+$/.test(w)||!w?w:`<span class="w${b?' b':''}">${w}</span>`).join('')}).join('');
const ws=$$('.w',stmt);

/* logos loop */
const lg=$('#logos');lg.innerHTML+=lg.innerHTML;['#fr1'].forEach(s=>{const r=$(s);r.innerHTML+=r.innerHTML;$$('figure',r).slice(r.children.length/2).forEach(f=>{f.setAttribute('aria-hidden','true');$$('a',f).forEach(x=>x.tabIndex=-1)})});

const cards=$$('.scard');

/* team placeholders */
$$('.mate').forEach((m,i)=>{m.style.transitionDelay=(i%4*.07)+'s';io.observe(m)});

/* jobs -> form */
$$('.job').forEach(j=>j.addEventListener('click',()=>{$('#tJob').checked=true;$('#msg').value='Applying for: '+j.dataset.job}));
$('#form').addEventListener('submit',e=>{e.preventDefault();const f=e.target,n=$('#note');if(!f.name.value.trim()||!f.email.value||!f.email.validity.valid){n.textContent='Add your name and a valid email so we can reply.';n.classList.remove('ok');return}
  const to=f.dataset.to||'info@nscltd.ca',type=f.t.value,lines=[['Name',f.name.value],['Company',f.company.value],['Email',f.email.value],['Phone',f.phone.value],['Project location',f.city.value]].filter(x=>x[1].trim()).map(x=>x[0]+': '+x[1].trim());
  const body=lines.join('\n')+'\n\n'+f.msg.value.trim();
  location.href='mailto:'+to+'?subject='+encodeURIComponent(type+' request from '+f.name.value.trim())+'&body='+encodeURIComponent(body);
  n.textContent='Your email app should open with the request filled in. If it does not, email '+to+'.';n.classList.add('ok')});

/* scroll-driven effects */
const nav=$('#nav'),hero=$('#top'),hv=$('#heroVid'),zoom=$('#zoom'),zm=$('#zoomMedia'),zi=$('#zoomImg');
const links=$$('.nav .lk'),secs=links.map(a=>{const h=a.getAttribute('href');return h.startsWith('#')?$(h):null});
let lastY=0;
function frame(){
  const y=scrollY,vh=innerHeight;
  nav.classList.toggle('hide',y>lastY&&y>vh*.8&&!menu.classList.contains('open'));lastY=y;
  const hr=hero.getBoundingClientRect();if(!reduced&&hr.bottom>0&&hr.top<vh){hv.style.transform=`scale(1.04) translateY(${Math.max(0,-hr.top)*.25}px)`}
  // statement
  const r=stmt.getBoundingClientRect(),k=Math.min(1,Math.max(0,(vh*.85-r.top)/(r.height+vh*.4)));const lit=Math.round(k*ws.length);ws.forEach((w,i)=>w.classList.toggle('lit',reduced||i<lit));
  // zoom
  const zr=zoom.getBoundingClientRect(),zk=Math.min(1,Math.max(0,-zr.top/(zoom.offsetHeight-vh)));const e=1-Math.pow(1-Math.min(1,zk*1.6),3);
  const ix=(1-e)*Math.min(innerWidth*.28,360),iy=(1-e)*vh*.22,rad=(1-e)*40;
  zm.style.clipPath=`inset(${iy}px ${ix}px round ${rad}px)`;zi.style.transform=`translate(-50%,-50%) scale(${1.25-e*.25})`;const zt2=document.getElementById('zoomTxt'),sp=document.getElementById('spots');if(zt2){zt2.classList.toggle('out',zk>.66)}if(sp){sp.classList.toggle('on',zk>.7)}const zc=document.getElementById('zcta');if(zc){zc.classList.toggle('on',zk>.7)}
  // stack
  cards.forEach((c,i)=>{const nx=cards[i+1];if(!nx){c.style.transform='';c.style.filter='';return}const a=c.getBoundingClientRect(),b=nx.getBoundingClientRect();const over=Math.min(1,Math.max(0,1-(b.top-a.top)/a.height));c.style.transform=`scale(${1-over*.06})`;c.style.filter=`brightness(${1-over*.45})`});
  // active link
  let cur=-1;secs.forEach((s,i)=>{if(s&&s.getBoundingClientRect().top<vh*.4)cur=i});links.forEach((a,i)=>a.classList.toggle('on',i===cur));
}
let ticking=false;addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{frame();ticking=false})}},{passive:true});
addEventListener('resize',frame);frame();
})();


(() => {
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ex=document.getElementById('exc'); document.documentElement.classList.add('exc-on');
  const S=68/68; let mx=-100,my=-100,x=-100,y=-100,lastX=0,flip=false,seen=false,moveT=0;
  const HX=4,HY=4; // bucket teeth = hotspot
  addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse')return;
    mx=e.clientX;my=e.clientY;
    if(!seen){x=mx;y=my;seen=true;ex.classList.add('show')}
    const dx=mx-lastX; if(Math.abs(dx)>3){const f=dx>0; if(f!==flip){flip=f;ex.classList.toggle('flip',flip)}} lastX=mx;
    ex.classList.add('move');clearTimeout(moveT);moveT=setTimeout(()=>ex.classList.remove('move'),140);
    const t=e.target;
    const field=t.closest&&t.closest('input:not([type=radio]),textarea');
    ex.classList.toggle('off',!!field);
    ex.classList.toggle('hov',!field&&!!(t.closest&&t.closest('a,button,.tile,.scard,label')));
  },{passive:true});
  document.addEventListener('pointerleave',()=>ex.classList.remove('show'));
  document.addEventListener('pointerenter',()=>{if(seen)ex.classList.add('show')});
  addEventListener('blur',()=>ex.classList.remove('show'));
  function loop(){
    const k=reduced?1:.35; x+=(mx-x)*k; y+=(my-y)*k;
    ex.style.transform=`translate3d(${x-HX}px,${y-HY}px,0)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse'||ex.classList.contains('off'))return;
    ex.classList.remove('dig');void ex.offsetWidth;ex.classList.add('dig');
    if(reduced)return;
    for(let i=0;i<9;i++){
      const d=document.createElement('i');d.className='dirt d'+(1+i%3);document.body.appendChild(d);
      const a=(flip?-1:1)*(Math.random()*1.1+.2)+(flip?0:Math.PI)*0, sp=40+Math.random()*60;
      const vx=(flip?1:-1)*(10+Math.random()*50), vy=-(30+Math.random()*60);
      const sz=3+Math.random()*4;d.style.width=d.style.height=sz+'px';
      d.animate([{transform:`translate(${e.clientX}px,${e.clientY}px) rotate(0)`,opacity:1},
                 {transform:`translate(${e.clientX+vx}px,${e.clientY+vy*.6}px) rotate(120deg)`,opacity:1,offset:.45},
                 {transform:`translate(${e.clientX+vx*1.4}px,${e.clientY+40+Math.random()*30}px) rotate(260deg)`,opacity:0}],
                {duration:700+Math.random()*300,easing:'cubic-bezier(.3,.6,.5,1)'}).onfinish=()=>d.remove();
    }
  });
})();

/* Shine on real NSC logos inside photos (same as site.js). */
(()=>{
const ss=[...document.querySelectorAll('.logo-shine')];if(!ss.length)return;
const place=()=>ss.forEach(s=>{let im=s.previousElementSibling;if(im&&im.tagName==='PICTURE')im=im.querySelector('img');if(!im||!im.clientWidth)return;
  const cw=im.clientWidth,ch=im.clientHeight,ar=+s.dataset.ar;let W=cw,H=cw/ar;if(H<ch){H=ch;W=ch*ar}
  const d=W*s.dataset.ls/100,x=im.offsetLeft+(cw-W)/2+W*s.dataset.lx/100,y=im.offsetTop+(ch-H)/2+H*s.dataset.ly/100;
  s.style.cssText=`left:${x-d}px;top:${y-d}px;width:${d*2}px;height:${d*2}px`;s.classList.add('on')});
place();addEventListener('resize',place,{passive:true});addEventListener('load',place);
})();

/* "Built below" scroll x-ray: elements with data-t/data-a animate against scroll progress through the section. */
(()=>{
const sc=document.querySelector('.xray');if(!sc)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduced){sc.classList.add('static');return}
const cl=(v,a,b)=>Math.min(1,Math.max(0,(v-a)/(b-a))),ez=p=>1-Math.pow(1-p,3);
const els=[...sc.querySelectorAll('[data-t]')].map(el=>{const n=el.dataset.a.split(',').map(Number),t=el.dataset.t,o={el,n,t,v:+el.dataset.v||0,last:-9};
  if(t==='draw'){o.len=el.getTotalLength();el.style.strokeDasharray=el.classList.contains('xr-trench')?'':o.len+' '+o.len;if(el.classList.contains('xr-trench')){o.t='wipe'}}
  return o});
let live=false;
function set(k){sc.style.setProperty('--k',k.toFixed(4));
  els.forEach(o=>{const n=o.n;let p=o.t==='lift'?ez(cl(k,n[0],n[1]))-ez(cl(k,n[2],n[3])):o.t==='step'?+(k>=n[0]&&k<n[1]):ez(cl(k,n[0],n[1]));
    if(Math.abs(p-o.last)<.002)return;o.last=p;const s=o.el.style;
    if(o.t==='draw')s.strokeDashoffset=o.len*(1-p);
    else if(o.t==='wipe'||o.t==='fade')s.opacity=p;
    else if(o.t==='dim')s.opacity=1-p*o.v;
    else if(o.t==='rise'){s.opacity=Math.min(1,p*1.6);s.transform=`translateY(${(1-p)*o.v}px)`}
    else if(o.t==='lift'){s.transform=`translateY(${p*o.v}px)`;s.opacity=1-p*.45}
    else if(o.t==='count')o.el.textContent=Math.round(o.v*p);
    else if(o.t==='step')o.el.classList.toggle('on',!!p)});
}
function frame(){const r=sc.getBoundingClientRect(),vh=innerHeight,k=cl(-r.top,0,sc.offsetHeight-vh);
  const on=r.top<vh&&r.bottom>0;if(on!==live){live=on;sc.classList.toggle('live',on)}
  if(on||k===0||k===1)set(k)}
let tick=false;addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(()=>{frame();tick=false})}},{passive:true});
addEventListener('resize',frame);frame();
})();

/* ---- Motion pack (same block in home.js and site.js): tilt, magnetic buttons, scroll pipe, velocity skew, contour canvas, hero parallax, cutaway draw-in ---- */
(()=>{
const D=document,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,save=navigator.connection&&navigator.connection.saveData;
if(reduced||save)return;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches,$$=(s,r=D)=>[...r.querySelectorAll(s)];
D.documentElement.classList.add('fx');
if(fine){
  // 3D tilt with a moving glare
  $$('.tile,.pcard,.person.has-ph,.aud').forEach(el=>{const g=D.createElement('span');g.className='fx-glare';g.setAttribute('aria-hidden','true');el.appendChild(g);
    el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      el.style.transform='perspective(1000px) rotateX('+((.5-y)*6)+'deg) rotateY('+((x-.5)*7)+'deg) translateZ(0)';el.style.transition='transform .12s linear';g.style.setProperty('--gx',x*100+'%');g.style.setProperty('--gy',y*100+'%');g.style.opacity=1});
    el.addEventListener('pointerleave',()=>{el.style.transition='transform .7s cubic-bezier(.16,1,.3,1)';el.style.transform='';g.style.opacity=0})});
  // magnetic primary buttons
  $$('.btn-blue').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.28)+'px,'+((e.clientY-r.top-r.height/2)*.4)+'px)'});
    b.addEventListener('pointerleave',()=>{b.style.transform=''})});
}
// scroll pipe (home, wide screens): a pipe that fills as you scroll, one manhole per section
const secs=[['top','Top'],['built-below','Built below'],['services','Services'],['projects','Projects'],['region','Where we work'],['story','Our story'],['safety','Safety'],['leadership','Team'],['contact','Contact']].map(a=>[D.getElementById(a[0]),a[1],a[0]]).filter(x=>x[0]);
let pipe=null,dots=[];
if(D.querySelector('.hero')&&secs.length>4){pipe=D.createElement('nav');pipe.className='fx-pipe';pipe.setAttribute('aria-label','Page sections');
  pipe.innerHTML='<i></i>'+secs.map((s,i)=>'<a href="#'+s[2]+'" style="top:'+(i/(secs.length-1)*100)+'%"><span>'+s[1]+'</span></a>').join('');D.body.appendChild(pipe);dots=$$('a',pipe);
  dots.forEach((a,i)=>a.addEventListener('click',e=>{e.preventDefault();secs[i][0].scrollIntoView({behavior:'smooth'})}))}
// contour-line canvases behind dark sections (home)
const topo=$$('.statement,.contact').map(sec=>{const c=D.createElement('canvas');c.className='fx-topo';c.setAttribute('aria-hidden','true');sec.classList.add('fx-host');sec.prepend(c);return {c,sec,on:false,ctx:c.getContext('2d')}});
const tio=new IntersectionObserver(es=>es.forEach(e=>{const t=topo.find(x=>x.sec===e.target);if(t)t.on=e.isIntersecting}));topo.forEach(t=>tio.observe(t.sec));
function drawTopo(t,time){const c=t.c,w=c.clientWidth,h=c.clientHeight;if(!w)return;const dpr=Math.min(1.5,devicePixelRatio||1);if(c.width!==Math.round(w*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  const x=t.ctx;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);x.lineWidth=1;const n=w<700?9:15,T=time/5200;
  for(let i=0;i<n;i++){const by=h*(i+.5)/n;x.beginPath();for(let px=0;px<=w;px+=18){const u=px/w*6.283;const y=by+Math.sin(u*1.3+T+i*.55)*26+Math.sin(u*2.9-T*1.4+i*1.3)*11+Math.cos(u*.6+T*.6+i*.2)*30;if(px)x.lineTo(px,y);else x.moveTo(px,y)}
    x.strokeStyle='rgba(122,166,255,'+(i%4===0?.16:.07)+')';x.stroke()}}
// cutaway illustrations draw themselves in
$$('.cut-art').forEach(a=>{const svg=a.querySelector('svg');if(!svg)return;let ns=[...svg.children].filter(n=>!/^(defs|style|title|desc)$/.test(n.tagName));
  ns=ns.flatMap(n=>n.tagName==='g'&&n.children.length>12?[...n.children]:[n]);const step=Math.min(45,1900/ns.length);ns.forEach((n,i)=>{n.classList.add('fx-d');n.style.transitionDelay=Math.round(i*step)+'ms'});
  new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){a.classList.add('in');o.disconnect()}}),{threshold:.25}).observe(a)});
const heroBg=D.querySelector('.phero .bg'),skewEls=$$('.field,.logos');
let ly=scrollY,vel=0,last=0;
function loop(time){const y=scrollY,vh=innerHeight;vel+=((y-ly)-vel)*.18;ly=y;
  const sk=Math.max(-7,Math.min(7,vel*.22));skewEls.forEach(el=>el.style.setProperty('--sk',sk.toFixed(2)));
  if(heroBg&&y<vh*1.2)heroBg.style.transform='translate3d(0,'+(y*.22).toFixed(1)+'px,0)';
  if(pipe){const max=D.documentElement.scrollHeight-vh,k=max>0?y/max:0;pipe.style.setProperty('--k',k.toFixed(4));let cur=0;secs.forEach((s,i)=>{if(s[0].getBoundingClientRect().top<vh*.5)cur=i});
    dots.forEach((a,i)=>{a.classList.toggle('on',i===cur);a.classList.toggle('done',i<cur)});pipe.classList.toggle('show',y>vh*.6)}
  if(time-last>42){last=time;topo.forEach(t=>t.on&&drawTopo(t,time))}
  requestAnimationFrame(loop)}
requestAnimationFrame(loop);
})();
