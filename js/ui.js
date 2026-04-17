window.toggleSidebar = () => {
  const s = sidebar;
  const o = overlay;

  if(s.classList.contains("active")){
    s.classList.remove("active");
    o.style.display="none";
  } else {
    s.classList.add("active");
    o.style.display="block";
  }
};

window.changeView = (id,title)=>{
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  pageTitle.innerText = title;
  toggleSidebar();
};

window.toggleDarkMode = ()=>{
  document.body.classList.toggle("dark");
};

window.showToast = (msg)=>{
  const t = toast;
  t.innerText = msg;
  t.classList.add("show");

  setTimeout(()=>t.classList.remove("show"),3000);
};

// SWIPE
let startX=0;
document.addEventListener("touchstart",e=>startX=e.touches[0].clientX);
document.addEventListener("touchend",e=>{
  let endX=e.changedTouches[0].clientX;

  if(endX-startX>80) toggleSidebar();
  if(startX-endX>80) toggleSidebar();
});
