const header=document.querySelector('.site-header');
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');
const reveals=document.querySelectorAll('.reveal');
const onScroll=()=>header.classList.toggle('scrolled',window.scrollY>40);
onScroll(); window.addEventListener('scroll',onScroll,{passive:true});
toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle?.setAttribute('aria-expanded','false');}));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.08});
reveals.forEach(el=>observer.observe(el));

// RSVP preview: stores locally until the production database is connected.
const rsvpForm=document.querySelector('#rsvp-form');
const attendingFields=document.querySelector('#attending-fields');
const rsvpSuccess=document.querySelector('#rsvp-success');
const editRsvp=document.querySelector('#rsvp-edit');
const setAttendanceFields=()=>{const v=rsvpForm?.querySelector('input[name="attending"]:checked')?.value;if(attendingFields) attendingFields.hidden=v==='no';};
rsvpForm?.querySelectorAll('input[name="attending"]').forEach(el=>el.addEventListener('change',setAttendanceFields));
try{const saved=JSON.parse(localStorage.getItem('gr-wedding-rsvp')||'null');if(saved&&rsvpForm){Object.entries(saved).forEach(([k,v])=>{const els=rsvpForm.elements[k];if(!els)return;if(els instanceof RadioNodeList){[...els].forEach(e=>e.checked=e.value===v);}else els.value=v;});setAttendanceFields();}}
catch(e){}
rsvpForm?.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(rsvpForm).entries());localStorage.setItem('gr-wedding-rsvp',JSON.stringify(data));rsvpForm.hidden=true;rsvpSuccess.hidden=false;rsvpSuccess.scrollIntoView({behavior:'smooth',block:'center'});});
editRsvp?.addEventListener('click',()=>{rsvpSuccess.hidden=true;rsvpForm.hidden=false;});


// Horizontal gallery controls. The gallery remains touch/swipe scrollable on mobile.
const galleryViewport=document.querySelector('.gallery-viewport');
const galleryPrev=document.querySelector('.gallery-prev');
const galleryNext=document.querySelector('.gallery-next');
const galleryStep=()=>Math.min(window.innerWidth*.72,680);
galleryPrev?.addEventListener('click',()=>galleryViewport?.scrollBy({left:-galleryStep(),behavior:'smooth'}));
galleryNext?.addEventListener('click',()=>galleryViewport?.scrollBy({left:galleryStep(),behavior:'smooth'}));
