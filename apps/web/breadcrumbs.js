/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
(function(){
  function build(){
    const nav = document.querySelector('.breadcrumbs');
    if(!nav) return;
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const segments = path === '/' ? ['/'] : path.split('/').filter(Boolean).map(s=>'/'+s);
    const crumbs = [];
    let accum = '';
    if(path === '/') { crumbs.push({ url:'/', label:'Home' }); }
    else {
      crumbs.push({ url:'/', label:'Home' });
      segments.forEach((seg,i)=>{
        accum = i===0 ? seg : accum + '/' + seg.replace(/^\//,'');
        crumbs.push({ url: accum, label: seg.replace(/^\//,'').replace(/-/g,' ') });
      });
    }
    nav.setAttribute('aria-label','Breadcrumb');
    crumbs.forEach((c,i)=>{
      if(i>0){ const sep=document.createElement('span'); sep.className='breadcrumbs-sep'; sep.textContent='›'; nav.appendChild(sep); }
      const link = document.createElement('a'); link.href=c.url; link.textContent=c.label.charAt(0).toUpperCase()+c.label.slice(1); nav.appendChild(link);
    });
  }
  if(document.readyState!=='loading') build(); else document.addEventListener('DOMContentLoaded', build);
})();