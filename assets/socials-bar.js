(function(){var K='otom_follow_collapsed',b=document.getElementById('sbar'),t=document.getElementById('sbar-tab');
if(!b||!t)return;
try{localStorage.removeItem('otom_follow_closed')}catch(e){}
var mq=matchMedia('(max-width:860px)'),docked=false;
function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function g(){try{return localStorage.getItem(K)}catch(e){return null}}
function s(v){try{v?localStorage.setItem(K,v):localStorage.removeItem(K)}catch(e){}}
function clear(){if(!mq.matches)return true;var c=document.querySelector('.phero .hero-cta');var vv=window.visualViewport,vh=vv?vv.height+vv.offsetTop:innerHeight;return !c||c.getBoundingClientRect().bottom<vh-170}
function headerTop(){var h=document.querySelector('header.nav');var v=h?Math.max(0,Math.round(h.getBoundingClientRect().bottom)):56;document.documentElement.style.setProperty('--sbar-top',(v||56)+'px')}
function place(top){b.classList.toggle('at-top',top);t.classList.toggle('at-top',top)}
function open(){t.hidden=true;b.hidden=false;requestAnimationFrame(function(){requestAnimationFrame(function(){b.classList.add('show')})})}
function tab(){b.classList.remove('show');b.hidden=true;t.hidden=false}
function collapse(){s(today());tab();t.focus()}
function onScroll(){if(docked||!clear())return;docked=true;removeEventListener('scroll',onScroll);if(window.visualViewport){visualViewport.removeEventListener('resize',onScroll);visualViewport.removeEventListener('scroll',onScroll)}
 if(!b.hidden&&b.classList.contains('show')){b.classList.remove('show');setTimeout(function(){place(false);requestAnimationFrame(function(){requestAnimationFrame(function(){if(!b.hidden)b.classList.add('show')})})},300)}else place(false)}
document.getElementById('sbar-min').onclick=collapse;
document.getElementById('sbar-x').onclick=collapse;
t.onclick=function(){s(null);open();document.getElementById('sbar-min').focus()};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!b.hidden)collapse()});
headerTop();
if(clear())docked=true;else{place(true);addEventListener('scroll',onScroll,{passive:true});if(window.visualViewport){visualViewport.addEventListener('resize',onScroll);visualViewport.addEventListener('scroll',onScroll)}}
addEventListener('resize',headerTop,{passive:true});
if(g()===today()){tab();return}
s(null);
setTimeout(function(){headerTop();open()},1500);})();
