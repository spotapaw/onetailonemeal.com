(function(){var K='otom_follow_closed',W=7*864e5,b=document.getElementById('sbar'),t=document.getElementById('sbar-tab');
function g(){try{return localStorage.getItem(K)}catch(e){return null}}
function s(v){try{v?localStorage.setItem(K,v):localStorage.removeItem(K)}catch(e){}}
function closedNow(){var v=+g();return v&&Date.now()-v<W}
function open(){t.hidden=true;b.hidden=false;requestAnimationFrame(function(){requestAnimationFrame(function(){b.classList.add('show')})})}
function collapse(){b.classList.remove('show');b.hidden=true;t.hidden=false;t.focus()}
function close(){s(String(Date.now()));b.classList.remove('show');b.hidden=true;t.hidden=true}
document.getElementById('sbar-min').onclick=collapse;
document.getElementById('sbar-x').onclick=close;
t.onclick=function(){open();document.getElementById('sbar-min').focus()};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!b.hidden)close()});
function ready(){if(!matchMedia('(max-width:860px)').matches)return true;var c=document.querySelector('.phero .hero-cta');return !c||c.getBoundingClientRect().bottom<innerHeight-170}
if(!closedNow())setTimeout(function(){if(ready())open();else{var f=function(){if(ready()){removeEventListener('scroll',f);open()}};addEventListener('scroll',f,{passive:true})}},1500);})();
