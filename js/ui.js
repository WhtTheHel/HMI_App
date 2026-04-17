window.toggleSidebar = () => {
  sidebar.classList.toggle("active");
};

window.changeView = (id, title) => {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  pageTitle.innerText = title;
};

window.toggleDarkMode = () => {
  document.body.classList.toggle("dark");
};
