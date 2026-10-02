
(() => {
  const frame=document.querySelector('.lab-frame'); if(!frame) return;
  const lightVars={'--bg':'#f5f7fb','--panel':'#ffffff','--panel-2':'#eef2f7','--border':'#d7deea','--text':'#101521','--muted':'#667085'};
  const darkVars={'--bg':'#0B0E14','--panel':'#121826','--panel-2':'#0F1420','--border':'#212A3B','--text':'#E7E9EE','--muted':'#7C8699'};
  function sync(){try{const d=frame.contentDocument;if(!d)return;const vars=document.documentElement.dataset.theme==='light'?lightVars:darkVars;Object.entries(vars).forEach(([k,v])=>d.documentElement.style.setProperty(k,v));d.documentElement.style.colorScheme=document.documentElement.dataset.theme==='light'?'light':'dark';}catch(e){}}
  function size(){try{const d=frame.contentDocument;if(!d)return;const h=Math.max(d.body?.scrollHeight||0,d.documentElement?.scrollHeight||0);if(h>500)frame.style.height=(h+12)+'px';}catch(e){}}
  frame.addEventListener('load',()=>{sync();size();try{new ResizeObserver(size).observe(frame.contentDocument.documentElement)}catch(e){};setTimeout(size,500);setTimeout(size,1500)});
  window.addEventListener('pr-theme-change',()=>setTimeout(sync,0));
  document.querySelector('[data-fullscreen]')?.addEventListener('click',()=>{const shell=document.querySelector('.lab-shell'); if(shell?.requestFullscreen) shell.requestFullscreen();});
})();
