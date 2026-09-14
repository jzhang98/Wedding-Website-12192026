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
const rsvpContinue=document.querySelector('#rsvp-continue');
const rsvpBack=document.querySelector('#rsvp-back');
const rsvpPanels=[...document.querySelectorAll('[data-rsvp-step]')];
const rsvpProgress=[...document.querySelectorAll('[data-rsvp-progress]')];
const childCount=document.querySelector('#child-count');
const adultCount=document.querySelector('select[name="adultCount"]');
const guestMealList=document.querySelector('#guest-meal-list');
const guestNamesData=document.querySelector('#guest-names-data');
const childrenDetailsData=document.querySelector('#children-details-data');
const primaryMealData=document.querySelector('#primary-meal-data');
const mealSelectionsData=document.querySelector('#meal-selections-data');
const rsvpStorageKey='gr-wedding-rsvp';
const rsvpIdKey='gr-wedding-rsvp-id';

const rsvpStage=document.querySelector('#rsvp-stage');
const rsvpEnvelope=document.querySelector('#rsvp-envelope');

const openRsvp=()=>{
  if(rsvpStage) rsvpStage.classList.add('is-open');
  if(rsvpEnvelope) rsvpEnvelope.setAttribute('aria-expanded','true');
  if(rsvpForm) rsvpForm.hidden=false;
};

const closeRsvpEnvelope=()=>{
  if(rsvpStage) rsvpStage.classList.remove('is-open');
  if(rsvpEnvelope) rsvpEnvelope.setAttribute('aria-expanded','false');
  if(rsvpForm) rsvpForm.hidden=true;
};

rsvpEnvelope?.addEventListener('click',()=>{
  openRsvp();
  showRsvpStep(1);
  setAttendanceFields();
  requestAnimationFrame(()=>rsvpForm?.scrollIntoView({behavior:'smooth',block:'center'}));
});


const makeResponseId=()=>{
  if(window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'rsvp-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
};

const STEAK_DESCRIPTION='Full-flavored and tender steak, served with a Star Anise Pinot Noir Reduction.';
const FISH_DESCRIPTION='Fresh salmon fillet with jumbo lump crab meat cake, asparagus, and a Tarragon Tomato Béarnaise topping.';

let guestRosterState={};

const captureGuestRosterState=()=>{
  if(!guestMealList) return;
  guestMealList.querySelectorAll('[data-guest-key]').forEach(card=>{
    const key=card.dataset.guestKey;
    const name=card.querySelector('[data-guest-name]')?.value?.trim()||'';
    const age=card.querySelector('[data-guest-age]')?.value?.trim()||'';
    const meal=card.querySelector('input[type="radio"]:checked')?.value||'';
    guestRosterState[key]={name,age,meal};
  });
};

const mealOptionMarkup=(key,value,label,description,checked)=>`<label class="guest-meal-option"><input ${checked?'checked ':''}name="meal-${key}" type="radio" value="${value}"/><span><strong>${label}</strong><i aria-hidden="true">✓</i></span><em>${description}</em></label>`;

const renderGuestRoster=(savedSelections=null)=>{
  if(!guestMealList) return;
  captureGuestRosterState();
  if(Array.isArray(savedSelections)){
    savedSelections.forEach(item=>{
      if(item?.key) guestRosterState[item.key]={name:item.name||'',age:item.age||'',meal:item.meal||''};
    });
  }

  const attending=rsvpForm?.querySelector('input[name="attending"]:checked')?.value;
  if(attending!=='yes'){
    guestMealList.innerHTML='';
    syncGuestMealData();
    return;
  }

  const adults=Math.max(1,Number(adultCount?.value||1));
  const children=Math.max(0,Number(childCount?.value||0));
  const primaryName=[rsvpForm?.elements?.firstName?.value,rsvpForm?.elements?.lastName?.value].filter(Boolean).join(' ').trim()||'Primary guest';
  const cards=[];

  const primary=guestRosterState.primary||{};
  cards.push(`<article class="guest-meal-person" data-guest-key="primary" data-guest-type="adult"><div class="guest-meal-person-head"><div><span class="guest-number">Guest 1</span><h4>${escapeHtml(primaryName)}</h4><p>Primary guest</p></div></div><div class="guest-meal-buttons">${mealOptionMarkup('primary','Steak','Steak',STEAK_DESCRIPTION,primary.meal==='Steak')}${mealOptionMarkup('primary','Fish','Fish',FISH_DESCRIPTION,primary.meal==='Fish')}</div></article>`);

  for(let i=2;i<=adults;i++){
    const key=`adult${i}`;
    const state=guestRosterState[key]||{};
    cards.push(`<article class="guest-meal-person" data-guest-key="${key}" data-guest-type="adult"><div class="guest-meal-person-head guest-meal-person-input"><div><span class="guest-number">Adult guest ${i}</span><label><span>Guest name</span><input data-guest-name placeholder="Full name" required value="${escapeAttr(state.name||'')}"/></label></div></div><div class="guest-meal-buttons">${mealOptionMarkup(key,'Steak','Steak',STEAK_DESCRIPTION,state.meal==='Steak')}${mealOptionMarkup(key,'Fish','Fish',FISH_DESCRIPTION,state.meal==='Fish')}</div></article>`);
  }

  for(let i=1;i<=children;i++){
    const key=`child${i}`;
    const state=guestRosterState[key]||{};
    cards.push(`<article class="guest-meal-person" data-guest-key="${key}" data-guest-type="child"><div class="guest-meal-person-head guest-meal-person-input"><div><span class="guest-number">Child ${i}</span><div class="child-name-age"><label><span>Child's name</span><input data-guest-name placeholder="Name" required value="${escapeAttr(state.name||'')}"/></label><label><span>Age</span><input data-guest-age inputmode="numeric" min="0" max="17" placeholder="Age" required type="number" value="${escapeAttr(state.age||'')}"/></label></div></div></div><div class="guest-meal-buttons">${mealOptionMarkup(key,'Steak','Steak',STEAK_DESCRIPTION,state.meal==='Steak')}${mealOptionMarkup(key,'Fish','Fish',FISH_DESCRIPTION,state.meal==='Fish')}</div></article>`);
  }

  guestMealList.innerHTML=cards.join('');
  guestMealList.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('change',syncGuestMealData));
  guestMealList.querySelectorAll('[data-guest-name],[data-guest-age]').forEach(el=>el.addEventListener('input',syncGuestMealData));
  syncGuestMealData();
};

function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function escapeAttr(value){return escapeHtml(value);}

const getGuestMealSelections=()=>{
  if(!guestMealList) return [];
  const primaryName=[rsvpForm?.elements?.firstName?.value,rsvpForm?.elements?.lastName?.value].filter(Boolean).join(' ').trim()||'Primary guest';
  return [...guestMealList.querySelectorAll('[data-guest-key]')].map((card,index)=>{
    const type=card.dataset.guestType||'adult';
    const key=card.dataset.guestKey;
    const name=key==='primary'?primaryName:(card.querySelector('[data-guest-name]')?.value?.trim()||'');
    const age=type==='child'?(card.querySelector('[data-guest-age]')?.value?.trim()||''):'';
    const meal=card.querySelector('input[type="radio"]:checked')?.value||'';
    return {key,type,name,age,meal,index:index+1};
  });
};

function syncGuestMealData(){
  const selections=getGuestMealSelections();
  const adults=selections.filter(item=>item.type==='adult'&&item.key!=='primary');
  const children=selections.filter(item=>item.type==='child');
  if(guestNamesData) guestNamesData.value=adults.map(item=>item.name).filter(Boolean).join(', ');
  if(childrenDetailsData) childrenDetailsData.value=children.map(item=>item.name?`${item.name}${item.age?` — ${item.age}`:''}`:'').filter(Boolean).join(', ');
  if(primaryMealData) primaryMealData.value=selections.find(item=>item.key==='primary')?.meal||'';
  if(mealSelectionsData) mealSelectionsData.value=JSON.stringify(selections);
  captureGuestRosterState();
}

const validateGuestRoster=()=>{
  const attending=rsvpForm?.querySelector('input[name="attending"]:checked')?.value;
  if(attending!=='yes') return true;
  const selections=getGuestMealSelections();
  for(const item of selections){
    const card=guestMealList?.querySelector(`[data-guest-key="${item.key}"]`);
    if(item.key!=='primary'&&!item.name){
      const input=card?.querySelector('[data-guest-name]');
      input?.reportValidity(); input?.focus({preventScroll:true}); return false;
    }
    if(item.type==='child'&&!item.age){
      const input=card?.querySelector('[data-guest-age]');
      input?.reportValidity(); input?.focus({preventScroll:true}); return false;
    }
    if(!['Steak','Fish'].includes(item.meal)){
      const first=card?.querySelector('input[type="radio"]');
      first?.setCustomValidity('Please choose Steak or Fish for this guest.');
      first?.reportValidity();
      setTimeout(()=>first?.setCustomValidity(''),0);
      card?.scrollIntoView({behavior:'smooth',block:'center'});
      return false;
    }
  }
  syncGuestMealData();
  return true;
};

const setAttendanceFields=()=>{
  const value=rsvpForm?.querySelector('input[name="attending"]:checked')?.value;
  const attendingYes=value==='yes';
  if(attendingFields) attendingFields.hidden=!attendingYes;
  renderGuestRoster();
};

const showRsvpStep=step=>{
  rsvpPanels.forEach(panel=>{panel.hidden=Number(panel.dataset.rsvpStep)!==step;});
  rsvpProgress.forEach(marker=>{
    const markerStep=Number(marker.dataset.rsvpProgress);
    marker.classList.toggle('active',markerStep===step);
    marker.classList.toggle('complete',markerStep<step);
  });
};

const validateRsvpStepOne=()=>{
  const firstPanel=rsvpPanels.find(panel=>Number(panel.dataset.rsvpStep)===1);
  if(!firstPanel) return true;
  const controls=[...firstPanel.querySelectorAll('input,select,textarea')];
  const invalid=controls.find(control=>!control.checkValidity());
  if(invalid){invalid.reportValidity();invalid.focus({preventScroll:true});return false;}
  return true;
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
adultCount?.addEventListener('change',()=>renderGuestRoster());
childCount?.addEventListener('change',()=>renderGuestRoster());
rsvpForm?.elements?.firstName?.addEventListener('input',()=>renderGuestRoster());
rsvpForm?.elements?.lastName?.addEventListener('input',()=>renderGuestRoster());

rsvpContinue?.addEventListener('click',()=>{
  if(!validateRsvpStepOne()) return;
  setAttendanceFields();
  showRsvpStep(2);
  rsvpForm?.scrollIntoView({behavior:'smooth',block:'center'});
});

rsvpBack?.addEventListener('click',()=>{
  showRsvpStep(1);
  rsvpForm?.scrollIntoView({behavior:'smooth',block:'center'});
});

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
    openRsvp();
    setAttendanceFields();
    let savedSelections=[];
    try{savedSelections=JSON.parse(saved.mealSelections||'[]');}catch(e){}
    if(Array.isArray(savedSelections)&&savedSelections.length) renderGuestRoster(savedSelections);
    rsvpForm.querySelectorAll('.auto-grow').forEach(resizeTextarea);
  }
}catch(error){
  console.warn('Unable to restore saved RSVP form data.',error);
}

showRsvpStep(1);
setAttendanceFields();
if(rsvpForm) rsvpForm.hidden = !rsvpStage?.classList.contains('is-open');

rsvpForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  const secondPanel=rsvpPanels.find(panel=>Number(panel.dataset.rsvpStep)===2);
  if(secondPanel?.hidden){
    if(validateRsvpStepOne()){setAttendanceFields();showRsvpStep(2);}
    return;
  }
  if(rsvpError){ rsvpError.hidden=true; rsvpError.textContent=''; }
  if(!validateGuestRoster()) return;
  syncGuestMealData();

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
    openRsvp();
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
  openRsvp();
  if(rsvpSuccess) rsvpSuccess.hidden=true;
  if(rsvpForm) rsvpForm.hidden=false;
  showRsvpStep(1);
  setAttendanceFields();
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
