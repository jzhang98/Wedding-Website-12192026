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

// RSVP: sends responses through the Vercel API route to Google Sheets.
const rsvpForm=document.querySelector('#rsvp-form');
const attendingFields=document.querySelector('#attending-fields');
const rsvpSuccess=document.querySelector('#rsvp-success');
const editRsvp=document.querySelector('#rsvp-edit');
const rsvpError=document.querySelector('#rsvp-error');
const rsvpSubmit=document.querySelector('.rsvp-submit');
const rsvpStorageKey='gr-wedding-rsvp';
const rsvpIdKey='gr-wedding-rsvp-id';

const makeResponseId=()=>{
  if(window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'rsvp-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
};

const setAttendanceFields=()=>{
  const value=rsvpForm?.querySelector('input[name="attending"]:checked')?.value;
  if(attendingFields) attendingFields.hidden=value==='no';
};

const resizeTextarea=el=>{
  if(!el) return;
  el.style.height='auto';
  el.style.height=`${Math.max(el.scrollHeight,42)}px`;
};

document.querySelectorAll('.auto-grow').forEach(el=>{
  resizeTextarea(el);
  el.addEventListener('input',()=>resizeTextarea(el));
});

rsvpForm?.querySelectorAll('input[name="attending"]').forEach(el=>el.addEventListener('change',setAttendanceFields));

try{
  const saved=JSON.parse(localStorage.getItem(rsvpStorageKey)||'null');
  if(saved&&rsvpForm){
    Object.entries(saved).forEach(([key,value])=>{
      if(key==='responseId') return;
      const fields=rsvpForm.elements[key];
      if(!fields) return;
      if(fields instanceof RadioNodeList){
        [...fields].forEach(field=>field.checked=field.value===value);
      }else{
        fields.value=value;
      }
    });
    setAttendanceFields();
    rsvpForm.querySelectorAll('.auto-grow').forEach(resizeTextarea);
  }
}catch(error){
  console.warn('Unable to restore saved RSVP form data.',error);
}

rsvpForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(rsvpError){ rsvpError.hidden=true; rsvpError.textContent=''; }

  const formData=Object.fromEntries(new FormData(rsvpForm).entries());
  const responseId=localStorage.getItem(rsvpIdKey)||makeResponseId();
  const payload={...formData,responseId};

  if(rsvpSubmit){
    rsvpSubmit.disabled=true;
    rsvpSubmit.textContent='Sending…';
  }

  try{
    const response=await fetch('/api/rsvp',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.success===false){
      throw new Error(result.error||'We couldn’t save your RSVP. Please try again.');
    }

    const confirmedId=result.responseId||responseId;
    localStorage.setItem(rsvpIdKey,confirmedId);
    localStorage.setItem(rsvpStorageKey,JSON.stringify({...formData,responseId:confirmedId}));
    rsvpForm.hidden=true;
    if(rsvpSuccess){
      rsvpSuccess.hidden=false;
      rsvpSuccess.scrollIntoView({behavior:'smooth',block:'center'});
    }
  }catch(error){
    if(rsvpError){
      rsvpError.textContent=error.message||'We couldn’t save your RSVP. Please try again.';
      rsvpError.hidden=false;
    }
  }finally{
    if(rsvpSubmit){
      rsvpSubmit.disabled=false;
      rsvpSubmit.textContent='Submit RSVP';
    }
  }
});

editRsvp?.addEventListener('click',()=>{
  if(rsvpSuccess) rsvpSuccess.hidden=true;
  if(rsvpForm) rsvpForm.hidden=false;
  rsvpForm?.querySelectorAll('.auto-grow').forEach(resizeTextarea);
});

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
