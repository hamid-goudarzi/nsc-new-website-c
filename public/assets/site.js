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
