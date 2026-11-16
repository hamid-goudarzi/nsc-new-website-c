(()=>{
// mobile menu
const b=document.querySelector('.pburger'),m=document.getElementById('pmenu');
if(b&&m){
  b.addEventListener('click',()=>{const o=m.classList.toggle('open');b.setAttribute('aria-expanded',o);b.textContent=o?'Close':'Menu'});
  m.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{m.classList.remove('open');b.setAttribute('aria-expanded','false');b.textContent='Menu'}));
}
// reveal on scroll
const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));
// photo viewer for galleries
const lb=document.getElementById('lb');
if(lb){
  const li=lb.querySelector('img'),bs=[...document.querySelectorAll('.gal button')];let k=0;
  const show=i=>{k=(i+bs.length)%bs.length;li.src=bs[k].dataset.full;li.alt=bs[k].querySelector('img').alt;lb.classList.add('on');lb.querySelector('.x').focus()};
  bs.forEach((x,i)=>x.addEventListener('click',()=>show(i)));
  lb.querySelector('.x').onclick=()=>{lb.classList.remove('on');bs[k]&&bs[k].focus()};
  lb.querySelector('.nx').onclick=()=>show(k+1);lb.querySelector('.pv').onclick=()=>show(k-1);
  lb.addEventListener('click',ev=>{if(ev.target===lb)lb.querySelector('.x').click()});
  addEventListener('keydown',ev=>{if(!lb.classList.contains('on'))return;if(ev.key==='Escape')lb.querySelector('.x').click();if(ev.key==='ArrowRight')show(k+1);if(ev.key==='ArrowLeft')show(k-1)});
}
// highlight the current group in sticky chip bars
const cs=[...document.querySelectorAll('.pchips a')];
if(cs.length){
  const gs=cs.map(a=>document.querySelector(a.getAttribute('href')));
  const on=()=>{let k=-1;gs.forEach((g,i)=>{if(g&&g.getBoundingClientRect().top<innerHeight*.35)k=i});cs.forEach((a,i)=>a.classList.toggle('on',i===k))};
  addEventListener('scroll',on,{passive:true});on();
}
})();

/* Shine on real NSC logos inside photos: place each .logo-shine over its logo, matching the photo's object-fit:cover crop. */
(()=>{
const ss=[...document.querySelectorAll('.logo-shine')];if(!ss.length)return;
const place=()=>ss.forEach(s=>{let im=s.previousElementSibling;if(im&&im.tagName==='PICTURE')im=im.querySelector('img');if(!im||!im.clientWidth)return;
  const cw=im.clientWidth,ch=im.clientHeight,ar=+s.dataset.ar;let W=cw,H=cw/ar;if(H<ch){H=ch;W=ch*ar}
  const d=W*s.dataset.ls/100,x=im.offsetLeft+(cw-W)/2+W*s.dataset.lx/100,y=im.offsetTop+(ch-H)/2+H*s.dataset.ly/100;
  s.style.cssText=`left:${x-d}px;top:${y-d}px;width:${d*2}px;height:${d*2}px`;s.classList.add('on')});
place();addEventListener('resize',place,{passive:true});addEventListener('load',place);
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
