// COUNTDOWN
function uc(){var e=new Date('2026-09-30T23:59:59').getTime(),n=new Date().getTime(),t=e-n;if(t<=0){document.getElementById('cd').textContent='00 d : 00 h : 00 m : 00 s';return}var d=Math.floor(t/864e5),h=Math.floor(t%864e5/36e5),m=Math.floor(t%36e5/6e4),s=Math.floor(t%6e4/1e3);document.getElementById('cd').textContent=String(d).padStart(2,'0')+' d : '+String(h).padStart(2,'0')+' h : '+String(m).padStart(2,'0')+' m : '+String(s).padStart(2,'0')+' s'}
uc();setInterval(uc,1000);

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
fqs.forEach(function(q){q.addEventListener('click',function(){var p=this.parentElement;var o=p.classList.contains('o');document.querySelectorAll('.fi').forEach(function(i){i.classList.remove('o')});if(!o)p.classList.add('o')})});

// STICKY — shows after 500px scroll, hides while pricing is on screen (redundant there)
var sc=document.getElementById('scta');
var prc=document.getElementById('pricing');
var atPricing=false;
function us(){window.scrollY>500&&!atPricing?sc.classList.add('sh'):sc.classList.remove('sh')}
if('IntersectionObserver' in window&&prc){new IntersectionObserver(function(en){atPricing=en[0].isIntersecting;us()}).observe(prc)}
window.addEventListener('scroll',us);
