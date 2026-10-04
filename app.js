// ANIMATED ROSTER
var roster=[
  {n:'Meta Ads Specialist',d:'Marketing Department'},
  {n:'SEO Content Writer',d:'Marketing Department'},
  {n:'Pricing Analyst',d:'Strategy Department'},
  {n:'Podcast Scriptwriter',d:'Creative Department'},
  {n:'Cold Email Copywriter',d:'Sales Department'},
  {n:'Customer Support Lead',d:'Operations Department'},
  {n:'Product Launch Planner',d:'Marketing Department'},
  {n:'Hiring & Talent Scout',d:'Operations Department'},
  {n:'Brand Identity Lead',d:'Creative Department'},
  {n:'Market Research Analyst',d:'Strategy Department'},
  {n:'YouTube Scriptwriter',d:'Creative Department'},
  {n:'Client Acquisition Designer',d:'Sales Department'},
  {n:'Ghostwriter (Books)',d:'Creative Department'},
  {n:'Email Marketing Lead',d:'Marketing Department'},
  {n:'Business Entity Setup Guide',d:'Operations Department'}
];
var ri=0;
var rn=document.getElementById('rn');
var rd=document.getElementById('rd');
var rdots=document.getElementById('rdots');
roster.forEach(function(_,i){var s=document.createElement('span');if(i===0)s.className='active';rdots.appendChild(s)});
function rc(){rn.style.opacity=0;rd.style.opacity=0;setTimeout(function(){ri=(ri+1)%roster.length;rn.textContent=roster[ri].n;rd.textContent=roster[ri].d;var dots=rdots.querySelectorAll('span');dots.forEach(function(d,i){d.className=i===ri?'active':''});rn.style.opacity=1;rd.style.opacity=1},300)}
setInterval(rc,2600);

// FAQ
var fqs=document.querySelectorAll('.fq3');
fqs.forEach(function(q){q.addEventListener('click',function(){var p=this.parentElement;var o=p.classList.contains('o');document.querySelectorAll('.fi').forEach(function(i){i.classList.remove('o');i.querySelector('.fq3').setAttribute('aria-expanded','false');i.querySelector('.fa').inert=true});if(!o){p.classList.add('o');p.querySelector('.fa').inert=false;this.setAttribute('aria-expanded','true')}})});

// STICKY — shows after 500px scroll, hides while pricing is on screen (redundant there)
var sc=document.getElementById('scta');
var prc=document.getElementById('pricing');
var atPricing=false;
function us(){window.scrollY>500&&!atPricing?sc.classList.add('sh'):sc.classList.remove('sh')}
if('IntersectionObserver' in window&&prc){new IntersectionObserver(function(en){atPricing=en[0].isIntersecting;us()}).observe(prc)}
window.addEventListener('scroll',us);

// Contact link
var cl=document.querySelector('a[href="#contact"]');
if(cl){cl.addEventListener('click',function(e){e.preventDefault();window.location.href='mailto:'+'jesseklein'+'@'+'aisystemswealth.com'})}
