(function(){var K='otom_follow_collapsed',b=document.getElementById('sbar'),t=document.getElementById('sbar-tab');
if(!b||!t)return;
try{localStorage.removeItem('otom_follow_closed')}catch(e){}
function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function g(){try{return localStorage.getItem(K)}catch(e){return null}}
function s(v){try{v?localStorage.setItem(K,v):localStorage.removeItem(K)}catch(e){}}
function open(){t.hidden=true;b.hidden=false;requestAnimationFrame(function(){requestAnimationFrame(function(){b.classList.add('show')})})}
function tab(){b.classList.remove('show');b.hidden=true;t.hidden=false}
function collapse(){s(today());tab();t.focus()}
document.getElementById('sbar-min').onclick=collapse;
document.getElementById('sbar-x').onclick=collapse;
t.onclick=function(){s(null);open();document.getElementById('sbar-min').focus()};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!b.hidden)collapse()});
function ready(){if(!matchMedia('(max-width:860px)').matches)return true;var c=document.querySelector('.phero .hero-cta');return !c||c.getBoundingClientRect().bottom<innerHeight-170}
if(g()===today()){tab();return}
s(null);
setTimeout(function(){if(ready())open();else{var f=function(){if(ready()){removeEventListener('scroll',f);open()}};addEventListener('scroll',f,{passive:true})}},1500);})();
