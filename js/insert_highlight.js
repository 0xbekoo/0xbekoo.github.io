(()=>{(()=>{let r=`
  <div class="code-figcaption">
    <div class="code-left-wrap">
      <div class="code-decoration"></div>
      <div class="code-lang"></div>
    </div>
    <div class="code-right-wrap">
      <div class="code-copy icon-copy"></div>
      <div class="icon-chevron-down code-expand"></div>
    </div>
  </div>`;if(_$$("div.highlight").forEach(e=>{e.querySelector(".code-figcaption")||e.insertAdjacentHTML("afterbegin",r)}),_$$(".code-expand").forEach(e=>{e.off("click").on("click",function(){let o=e.closest("div.highlight");o.classList.contains("code-closed")?o.classList.remove("code-closed"):o.classList.add("code-closed")})}),_$$("div.highlight").forEach(e=>{let o;if(e.querySelector("table")?o=e.querySelector("tr td:last-of-type code"):o=e.querySelector("code"),!o)return;let i=o.dataset.lang;if(!i)return;let c=i.replace("line-numbers","").trim().replace("language-","").trim().toUpperCase(),t=o.closest(".highlight");if(t){let s=t.querySelector(".code-lang");s&&(s.innerText=c)}}),!window.ClipboardJS)return;let n=new ClipboardJS(".code-copy",{text:e=>{let o=window.getSelection(),i=document.createRange(),c=e.parentNode.parentNode.parentNode.querySelector("tr td:last-of-type");c||(c=e.parentNode.parentNode.parentNode.querySelector("code")),i.selectNodeContents(c),o.removeAllRanges(),o.addRange(i);let t=o.toString();return window.siteConfig.clipboard.copyright?.enable&&t.length>=window.siteConfig.clipboard.copyright?.count&&(t=t+`

`+window.siteConfig.clipboard.copyright?.content||""),t}});n.on("success",function(e){e.trigger.classList.add("icon-check"),e.trigger.classList.remove("icon-copy"),_$("#copy-tooltip").innerText=window.siteConfig.clipboard.success,_$("#copy-tooltip").style.opacity="1",setTimeout(()=>{_$("#copy-tooltip").style.opacity="0",e.trigger.classList.add("icon-copy"),e.trigger.classList.remove("icon-check")},1e3),e.clearSelection()}),n.on("error",function(e){e.trigger.classList.add("icon-times"),e.trigger.classList.remove("icon-copy"),_$("#copy-tooltip").innerText=window.siteConfig.clipboard.fail,_$("#copy-tooltip").style.opacity="1",setTimeout(()=>{_$("#copy-tooltip").style.opacity="0",e.trigger.classList.add("icon-copy"),e.trigger.classList.remove("icon-times")},1e3)}),window.Pjax&&window.addEventListener("pjax:send",()=>{n.destroy()},{once:!0})})();})();
