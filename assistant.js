/* ARIA — AIWS Concierge (client-side guided assistant) */
(function(){
  if(window.__ariaLoaded)return;window.__ariaLoaded=true;

  var TIERS={
    foundation:{name:'Foundation',price:'$27',count:47,per:'$0.57',pid:'pri_01kxb77mt63bhgfh0z7p8w7fjz',key:'foundation'},
    command:{name:'Command',price:'$67',count:85,per:'$0.79',pid:'pri_01kxb7h8h5e39dd1ahdxxx68vt',key:'command'},
    elite:{name:'Elite',price:'$147',count:153,per:'$0.96',pid:'pri_01kxb7qaj29g148xzmh105egc0',key:'elite'}
  };

  /* ---------- DOM ---------- */
  var root=document.createElement('div');root.id='aria-root';
  root.innerHTML=
    '<button id="aria-launch" aria-label="Chat with Aria"><span class="aria-pulse"></span><span class="aria-spark">✦</span><span id="aria-dot"></span></button>'+
    '<div id="aria-tip">Not sure which tier? Ask me.</div>'+
    '<div id="aria-panel" role="dialog" aria-label="AIWS concierge">'+
      '<div id="aria-head"><div class="aria-av">✦</div><div class="aria-ht"><div class="aria-name">Aria</div><div class="aria-sub"><span class="aria-on"></span>AIWS Concierge · online</div></div><button id="aria-close" aria-label="Close">×</button></div>'+
      '<div id="aria-msgs"></div>'+
      '<div id="aria-chips"></div>'+
      '<form id="aria-form"><input id="aria-in" type="text" placeholder="Ask me anything…" autocomplete="off"><button type="submit" id="aria-send" aria-label="Send">➤</button></form>'+
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
    if(tier&&TIERS[tier]&&window.openCheckout){window.openCheckout(TIERS[tier].pid,TIERS[tier].key)}
    else if(scr){var tgt=document.querySelector(scr);if(tgt)tgt.scrollIntoView({behavior:'smooth'})}
  });

  /* ---------- BRAIN ---------- */
  function tierLine(t){return '**'+t.name+' — '+t.price+'** · '+t.count+' specialists · '+t.per+'/specialist'}
  function greet(){
    botMsg("Hey, I'm **Aria** 👋 I help founders figure out whether AI Wealth Systems actually fits them — straight answers, no pitch. Where are you at right now?",function(){
      setChips(['🌱 Just starting out','📈 Growing, need leverage','🏆 Want the full arsenal','❓ I have a question']);
    });
  }

  function respond(raw){
    var t=raw.toLowerCase();
    function say(html,chipsArr){botMsg(html,function(){if(chipsArr)setChips(chipsArr)})}

    // --- guided flows ---
    if(/starting out|just start|new business|beginner|first business/.test(t)){
      return say("Great stage — everything's ahead of you. Honest take: you probably don't need all 153 specialists yet. **Foundation** covers the tactical core — setup, execution, the stuff that actually moves a new business.\n\n"+tierLine(TIERS.foundation)+"\n\nAnd if you outgrow it, your $27 counts toward upgrading later. Nothing wasted.",['Take me to Foundation 🚀','What exactly is inside?','Is there a guarantee?']);
    }
    if(/growing|leverage|scale|scaling/.test(t)){
      return say("Then you already know the real bottleneck: you're the strategy team *and* the execution team. Most owners at your stage land on **Command** — it adds the strategic layer: diagnostics, frameworks, scaling roadmaps, 90-day plans.\n\n"+tierLine(TIERS.command)+"\n\nThat's 85 specialists for less than a coffee each. It earns its keep fast.",['Show me Command 👑','Why not Elite?','Is there a guarantee?']);
    }
    if(/full arsenal|everything|all of it|complete/.test(t)){
      return say("Then don't piecemeal it. **Elite** is the complete bench — Foundation + Command + 68 institutional-grade specialists covering the full venture lifecycle.\n\n"+tierLine(TIERS.elite)+"\n\nBest math in the lineup, one-time payment, lifetime access. The complete C-suite.",['Take me to Elite 🏅','Compare the tiers','Is there a guarantee?']);
    }

    // --- tier picks from chips/buttons ---
    if(/take me to foundation|get foundation/.test(t))return say("Smart start. [Get Foundation — $27 ⚡|checkout:foundation]\n\nOne-time payment, instant Notion delivery. You could be running your first specialist in 10 minutes.");
    if(/show me command|get command/.test(t))return say("Good instinct. [Get Command — $67 👑|checkout:command]\n\n85 specialists, one-time, yours forever. Checkout takes about 60 seconds.");
    if(/take me to elite|get elite/.test(t))return say("Going all in — respect. [Get Elite — $147 🏅|checkout:elite]\n\nAll 153 specialists. One payment, lifetime access, 14-day refund if it's not for you.");
    if(/why not elite/.test(t))return say("Fair question. If budget allows, Elite is objectively the best value — $0.96/specialist for the full 153. But Command covers strategy + execution for most growing businesses, and your $67 counts toward Elite if you upgrade. There's no wrong door here.",['Take me to Elite 🏅','Show me Command 👑']);
    if(/compare|which tier|difference between|vs/.test(t))return say("Quick map:\n\n"+tierLine(TIERS.foundation)+" — tactical execution core\n"+tierLine(TIERS.command)+" — adds strategy, diagnostics, 90-day plans\n"+tierLine(TIERS.elite)+" — adds 68 institutional-grade specialists, full lifecycle\n\nRule of thumb: start where your business is, not where your ambition is. Upgrades always count what you already paid.",['🌱 Just starting out','📈 Growing, need leverage','🏆 Want the full arsenal']);
    if(/what.*inside|what exactly|what do i get|what's in it/.test(t))return say("Every specialist is a full reasoning architecture — defined persona, diagnostic questions, step-by-step methodology, and an enforced output format. You get structured deliverables, not chatbot rambling. They deploy into your Notion in one click and work with ChatGPT, Claude, or Gemini.",['🌱 Just starting out','📈 Growing, need leverage','🏆 Want the full arsenal']);

    // --- objections & facts ---
    if(/guarantee|refund|money back|risk|scam|legit|trust/.test(t))return say("Fair to ask. **14-day refund, no interrogation** — one email to jesseklein@aisystemswealth.com and it's handled. Which honestly makes trying it the low-risk move: worst case you're out two weeks of time, best case you've got a team that never sleeps.",['Compare the tiers','🌱 Just starting out']);
    if(/subscription|monthly|recurring|per month/.test(t))return say("No subscription — ever. **One payment, lifetime access.** Duplicate it into your Notion once and it's yours permanently. Refreshing, right?",['Compare the tiers']);
    if(/chatgpt|claude|gemini|which ai|what ai|model/.test(t))return say("Any of them. The specialists are model-agnostic frameworks — paste into **ChatGPT, Claude, or Gemini** and you get the same structured output. Use whichever you already have; no new subscriptions needed.");
    if(/notion|deliver|access|how do i get|download/.test(t))return say("Instant. After checkout you get a link, one click duplicates the whole system into your Notion workspace. Total setup is about 60 seconds — then every specialist is one paste away.");
    if(/price|cost|how much|pricing|expensive|cheap/.test(t))return say("Here's the whole pricing story:\n\n"+tierLine(TIERS.foundation)+"\n"+tierLine(TIERS.command)+"\n"+tierLine(TIERS.elite)+"\n\nAll one-time. For context, one hour with a decent consultant runs $150+. [See the pricing section|#pricing]");
    if(/free|sample|try before|test it/.test(t))return say("There are **5 free Foundation-tier prompts** on the site — drop your email in the “Not ready to buy yet?” section and they're yours. [Take me there|#pricing]\n\nScroll a touch past pricing and you'll see it. No spam, unsubscribe anytime.");
    if(/promptos|why pay|free prompt|just prompts|one-liner/.test(t))return say("Because these aren't prompts the way free lists are prompts. Every specialist passes **PROMPTOS** — a 10-dimension quality framework, minimum score 7/10, 81 rewrites behind the library. Free lists give you “act as a marketer.” These give you a deliverable. You're buying the engineering, not the words.");
    if(/course|voice|lecturer|coming soon|investing|masterclass|ideation|pivot/.test(t))return say("Good eye — there's a second wave in the lab: courses with a **personal AI voice lecturer** (included free), a Venture Ideation Pack, a Pivot Sprint, and investing tracks up to a full masterclass. Not for sale yet, but worth keeping an eye on. Today's move is the specialist workforce — the courses build on it.");
    if(/upgrade|switch tier|already bought/.test(t))return say("Easy: start anywhere, and what you paid counts toward the higher tier. Foundation → Command → Elite is a staircase, not a wall.");
    if(/contact|human|email|support|jesse/.test(t))return say("You can reach the founder directly: **jesseklein@aisystemswealth.com**. Real human, real inbox. And the 14-day refund goes through the same address.");
    if(/buy|checkout|get started|purchase/.test(t))return say("Love the energy. [See the tiers|#pricing] — or tell me your stage and I'll point you at the right one.",['🌱 Just starting out','📈 Growing, need leverage','🏆 Want the full arsenal']);
    if(/^(hi|hey|hello|yo|sup)\b/.test(t))return say("Hey! 👋 What can I help you figure out — picking a tier, how it works, or whether it's worth it?",['Compare the tiers','Is there a guarantee?','How does delivery work?']);
    if(/thank|thx|cheers/.test(t))return say("Anytime. If you take the leap, start with one specialist on a real problem this week — that's when it clicks. 💪");

    // --- fallback ---
    return say("Good question — here's where I'm most useful:",['Compare the tiers','What exactly is inside?','Is there a guarantee?','Talk to a human']);
  }
  // extra aliases
  var orig=respond;
  respond=function(raw){
    var t=raw.toLowerCase();
    if(/talk to a human/.test(t))return orig('contact');
    if(/how does delivery work/.test(t))return orig('notion delivery');
    return orig(raw);
  };

  /* ---------- WIRING ---------- */
  function openPanel(){panel.classList.add('open');tip.classList.remove('show');dot.classList.remove('show');opened=true;if(!greeted){greeted=true;greet()}setTimeout(function(){input.focus()},350)}
  launch.addEventListener('click',function(){panel.classList.contains('open')?panel.classList.remove('open'):openPanel()});
  root.querySelector('#aria-close').addEventListener('click',function(){panel.classList.remove('open')});
  form.addEventListener('submit',function(e){
    e.preventDefault();var v=input.value.trim();if(!v)return;
    input.value='';userMsg(v);chips.innerHTML='';respond(v);
  });
  setTimeout(function(){if(!opened){dot.classList.add('show');tip.classList.add('show');setTimeout(function(){tip.classList.remove('show')},8000)}},30000);
})();
