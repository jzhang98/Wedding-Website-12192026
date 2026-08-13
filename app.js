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

// V17: keep the mobile menu robust after layout changes/resizes.
if (toggle && nav) {
  const syncMenuLabel = () => {
    const open = nav.classList.contains('open');
    toggle.textContent = open ? 'Close' : 'Menu';
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', syncMenuLabel);
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', syncMenuLabel));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1050) {
      nav.classList.remove('open');
      syncMenuLabel();
    }
  }, {passive:true});
}

// V17: slow automatic gallery advance. Pauses while the guest interacts with it.
if (galleryViewport) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let galleryTimer;
  let interactionTimer;
  let galleryPaused = false;
  const cardStep = () => {
    const card = galleryViewport.querySelector('.gallery-card');
    const track = galleryViewport.querySelector('.gallery-track');
    if (!card || !track) return Math.min(window.innerWidth * .72, 680);
    const gap = parseFloat(getComputedStyle(track).gap || '0');
    return card.getBoundingClientRect().width + gap;
  };
  const autoAdvanceGallery = () => {
    if (galleryPaused || document.hidden) return;
    const step = cardStep();
    const max = galleryViewport.scrollWidth - galleryViewport.clientWidth;
    const next = galleryViewport.scrollLeft + step;
    galleryViewport.scrollTo({left: next >= max - 8 ? 0 : next, behavior:'smooth'});
  };
  const startGallery = () => {
    if (prefersReducedMotion) return;
    clearInterval(galleryTimer);
    galleryTimer = setInterval(autoAdvanceGallery, 5200);
  };
  const pauseGalleryTemporarily = () => {
    galleryPaused = true;
    clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => { galleryPaused = false; }, 7000);
  };
  ['pointerdown','touchstart','wheel','keydown'].forEach(evt =>
    galleryViewport.addEventListener(evt, pauseGalleryTemporarily, {passive: evt !== 'keydown'})
  );
  galleryPrev?.addEventListener('click', pauseGalleryTemporarily);
  galleryNext?.addEventListener('click', pauseGalleryTemporarily);
  galleryViewport.addEventListener('mouseenter', () => { galleryPaused = true; });
  galleryViewport.addEventListener('mouseleave', () => { galleryPaused = false; });
  startGallery();
}
