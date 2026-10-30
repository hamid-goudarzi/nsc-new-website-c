
(() => {
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

/* video from embedded data */
const hv0=document.getElementById('heroVid');const _t=document.createElement('video'),_av1=!!_t.canPlayType('video/mp4; codecs="av01.0.08M.08"'),_hevc=!!_t.canPlayType('video/mp4; codecs="hvc1.1.6.L120.90"'),_small=innerWidth<=900||(navigator.connection&&navigator.connection.saveData);hv0.src=_small?(_av1?'media/film-1080-av1.mp4':'media/film-720.mp4'):(_av1?'media/film-1440-av1.mp4':(_hevc?'media/film-1440-hevc.mp4':'media/film-720.mp4'));const tv0=document.getElementById('typeVid');tv0.src=_av1?'media/dig-av1.mp4':'media/dig.mp4';if(!reduced){hv0.play().catch(()=>{});tv0.play().catch(()=>{})}

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
$$('[data-to]').forEach(el=>cio.observe(el));

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
  if(!reduced&&y<vh){hv.style.transform=`scale(1.04) translateY(${y*.25}px)`}
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
