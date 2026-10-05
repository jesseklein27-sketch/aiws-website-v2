/* ARIA — AIWS Concierge (client-side guided assistant) */
(function(){
  if(window.__ariaLoaded)return;window.__ariaLoaded=true;

  var TIERS={
    foundation:{name:'Foundation',price:'$19',count:47,key:'foundation'},
    command:{name:'Command',price:'$39',count:85,key:'command'},
    elite:{name:'Elite',price:'$85',count:154,key:'elite'}
  };

  /* ---------- DOM ---------- */
  var root=document.createElement('div');root.id='aria-root';
  root.innerHTML=
    '<button id="aria-launch" aria-label="Chat with Aria" aria-controls="aria-panel" aria-expanded="false"><span class="aria-pulse"></span><span class="aria-spark">✦</span><span id="aria-dot"></span></button>'+
    '<div id="aria-tip">Not sure which tier? Ask me.</div>'+
    '<div id="aria-panel" inert role="dialog" aria-label="AIWS concierge">'+
      '<div id="aria-head"><div class="aria-av">✦</div><div class="aria-ht"><div class="aria-name">Aria</div><div class="aria-sub"><span class="aria-on"></span>Guided product assistant</div></div><button id="aria-close" aria-label="Close">×</button></div>'+
      '<div id="aria-msgs"></div>'+
      '<div id="aria-chips"></div>'+
      '<form id="aria-form"><input id="aria-in" aria-label="Your question for Aria" type="text" placeholder="Ask me anything…" autocomplete="off"><button type="submit" id="aria-send" aria-label="Send">➤</button></form>'+
    '</div>';
  document.body.appendChild(root);

  var panel=root.querySelector('#aria-panel'),msgs=root.querySelector('#aria-msgs'),
      chips=root.querySelector('#aria-chips'),form=root.querySelector('#aria-form'),
      input=root.querySelector('#aria-in'),launch=root.querySelector('#aria-launch'),
      tip=root.querySelector('#aria-tip'),dot=root.querySelector('#aria-dot');
  var opened=false,greeted=false;

  function scrollBottom(){msgs.scrollTop=msgs.scrollHeight}
  function fmt(t){
    return t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
            .replace(/\[(.+?)\|(#\w+|checkout:\w+)\]/g,function(m,label,target){
              if(target.indexOf('checkout:')===0){return '<button class="aria-cta" data-tier="'+target.split(':')[1]+'">'+label+'</button>'}
              return '<button class="aria-cta aria-cta-link" data-scroll="'+target+'">'+label+'</button>';
            });
  }
  function botMsg(html,after){
    var t=document.createElement('div');t.className='aria-m aria-b aria-typing';t.innerHTML='<span></span><span></span><span></span>';
    msgs.appendChild(t);scrollBottom();
    var wait=550+Math.min(html.length*6,1100);
    setTimeout(function(){
      t.classList.remove('aria-typing');t.innerHTML=fmt(html);scrollBottom();
      if(after)after();
    },wait);
  }
  function userMsg(text){
    var m=document.createElement('div');m.className='aria-m aria-u';m.textContent=text;
    msgs.appendChild(m);scrollBottom();
  }
  function setChips(list){
    chips.innerHTML='';
    list.forEach(function(c){
      var b=document.createElement('button');b.type='button';b.className='aria-chip';b.textContent=c;
      b.addEventListener('click',function(){userMsg(c);chips.innerHTML='';respond(c)});
      chips.appendChild(b);
    });
  }

  /* ---------- ACTIONS ---------- */
  msgs.addEventListener('click',function(e){
    var el=e.target.closest('.aria-cta');if(!el)return;
    var tier=el.getAttribute('data-tier'),scr=el.getAttribute('data-scroll');
    if(tier&&TIERS[tier]&&window.openCheckout){window.openCheckout(TIERS[tier].key)}
    else if(scr){var tgt=document.querySelector(scr);if(tgt)tgt.scrollIntoView({behavior:'smooth'})}
  });

  /* ---------- GUIDED PRODUCT INFORMATION ---------- */
  function tierLine(t){return '**'+t.name+' — '+t.price+' one-time** · '+t.count+' specialist systems total'}
  function greet(){
    botMsg("Hey, I'm **Aria**, a guided product assistant. AI Wealth Systems is a Notion-delivered AI specialist workforce. You run its structured systems through ChatGPT, Claude, Gemini or a similar model and review the output.",function(){
      setChips(['Compare the tiers','How does delivery work?','Is there a refund policy?']);
    });
  }
  function respond(raw){
    var t=raw.toLowerCase();
    function say(html,list){botMsg(html,function(){if(list)setChips(list)})}
    if(/guarantee|refund|risk|trust/.test(t))return say('There is a **14-day refund policy**. Email **jesseklein@aisystemswealth.com** with your purchase details. Paddle processes refunds as merchant of record. AI output and business results are not guaranteed.');
    if(/notion|deliver|access|download/.test(t))return say('After checkout, the server checks the Paddle transaction and provides access only to the purchased tier once payment is completed. Duplicate the tier into Notion, then use its specialists through your AI model. If verification is pending or your browser session is unavailable, contact **jesseklein@aisystemswealth.com** with your receipt.');
    if(/promptos|certif|score|why pay|just prompts/.test(t))return say('**PROMPTOS** is an internal quality-review framework, not external certification. Foundation review and wider library validation are still being refined. We do not claim every specialist has passed a threshold. The product provides defined roles, diagnostic questions, methodologies and output formats.');
    if(/ideation|pivot|expansion|course|coming soon/.test(t))return say('**Ideation Pack** and **Pivot Pack** are planned standalone expansion products. They are not included in the **47 / 85 / 154** core counts. No release date or bundled entitlement is promised.');
    if(/subscription|monthly|recurring/.test(t))return say('**One-time payment, lifetime access.** No recurring product subscription. Your AI model or Notion account may have its own terms and costs.');
    if(/chatgpt|claude|gemini|model|autonom|employee/.test(t))return say('Use the structured specialist systems through **ChatGPT, Claude, Gemini or a similar model**. They are not autonomous employees or SaaS agents. Results vary with your context and model; you review and apply the output.');
    if(/free|sample|try before/.test(t))return say('Request **3 free Foundation-tier samples** using the email form. The form records your request; contact us if you need help receiving them. [Request samples|#free-vault]');
    if(/contact|human|email|support|jesse/.test(t))return say('For purchase or access support, email **jesseklein@aisystemswealth.com**.');
    if(/upgrade|switch|already bought/.test(t))return say('Each tier is a separate one-time purchase. Contact **jesseklein@aisystemswealth.com** about moving to another tier; automatic upgrade credit is not promised.');
    if(/get foundation|take me to foundation/.test(t))return say('[Get Foundation — $19|checkout:foundation] 47 structured specialist systems. One-time payment, lifetime access, 14-day refund policy.');
    if(/get command|show me command/.test(t))return say('[Get Command — $39|checkout:command] 85 systems total, including Foundation. One-time payment, lifetime access, 14-day refund policy.');
    if(/get elite|take me to elite/.test(t))return say('[Get Elite — $85|checkout:elite] 154 systems total, including Foundation and Command. One-time payment, lifetime access, 14-day refund policy.');
    if(/compare|tier|price|cost|buy|purchase|starting|growing|full arsenal/.test(t))return say(tierLine(TIERS.foundation)+' — core specialist systems. '+tierLine(TIERS.command)+' — includes Foundation plus 38 systems. '+tierLine(TIERS.elite)+' — includes Command plus 69 systems. All include lifetime access and a 14-day refund policy.', ['Get Foundation','Get Command','Get Elite']);
    if(/inside|what.*get|how.*work/.test(t))return say('A Notion-delivered library of structured specialist systems. Defined roles, diagnostic questions, methodologies and output formats guide business tasks. **AI is the mechanism. Business capability is the product.** You provide context and review the result.');
    return say('I can explain the tiers, delivery, quality review and refund policy.', ['Compare the tiers','How does delivery work?','Talk to a human']);
  }

  /* ---------- WIRING ---------- */
  function closePanel(){panel.classList.remove('open');panel.inert=true;launch.setAttribute('aria-expanded','false');launch.focus()}
  function openPanel(){panel.inert=false;launch.setAttribute('aria-expanded','true');panel.classList.add('open');tip.classList.remove('show');dot.classList.remove('show');opened=true;if(!greeted){greeted=true;greet()}setTimeout(function(){input.focus()},350)}
  launch.addEventListener('click',function(){panel.classList.contains('open')?closePanel():openPanel()});
  root.querySelector('#aria-close').addEventListener('click',closePanel);
  panel.addEventListener('keydown',function(e){if(e.key==='Escape')closePanel()});
  form.addEventListener('submit',function(e){
    e.preventDefault();var v=input.value.trim();if(!v)return;
    input.value='';userMsg(v);chips.innerHTML='';respond(v);
  });
  setTimeout(function(){if(!opened){dot.classList.add('show');tip.classList.add('show');setTimeout(function(){tip.classList.remove('show')},8000)}},30000);
})();
