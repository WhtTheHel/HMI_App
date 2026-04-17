window.toggleSidebar = () => {
  sidebar.classList.toggle("active");
  overlay.style.display = sidebar.classList.contains("active") ? "block" : "none";
};

window.changeView = (id,title)=>{
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  pageTitle.innerText = title;
  toggleSidebar();
};

window.openAdmin = ()=>{
  changeView("adminView","DASHBOARD");
};

window.toggleDarkMode = ()=>{
  document.body.classList.toggle("dark");
};
