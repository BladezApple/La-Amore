fetch("/pages/header.html")
.then(res => res.text())
.then(data => {
document.getElementById("header").innerHTML = data;
    
initializeHeader();
});

fetch("/pages/navigation.html")
.then(res => res.text())
.then(data => document.getElementById("navigation").innerHTML = data);

fetch("/pages/footer.html")
.then(res => res.text())
.then(data => document.getElementById("footer").innerHTML = data);

function initializeHeader() {
let clickCount = 0;

window.toggleMenu = function() {
clickCount++;
        
console.log('toggleMenu called!', clickCount);
        
const sidebar = document.getElementById("sidebar");
console.log('Sidebar element:', sidebar);
        
if (sidebar) {
sidebar.classList.toggle("active");
console.log('Sidebar classes after toggle:', sidebar.className);
console.log('Sidebar has active class:', sidebar.classList.contains('active'));
} else {
console.error('Sidebar element not found!');
}
};

window.toggleDropdown = function(dropdownId) {
const dropdown = document.getElementById(dropdownId);
const toggle = dropdown.previousElementSibling;
        
dropdown.classList.toggle('active');
toggle.classList.toggle('active');
};

const sidebar = document.getElementById("sidebar");
const button = document.getElementById("menubutton");
    
console.log('Header initialized. Sidebar:', sidebar, 'Button:', button);

document.addEventListener('click', function (e) {
const menu = document.getElementById("sidebar");
const button = document.getElementById("menubutton");

if (menu && button && !menu.contains(e.target) && !button.contains(e.target)) {
menu.classList.remove("active");
console.log('Clicked outside - closing sidebar');
}
});
}

function toggleDropdown(dropdownId) {
const dropdown = document.getElementById(dropdownId);
const allDropdowns = document.querySelectorAll('.dropdown-content2');
  
if (dropdown.style.display === 'block') {
dropdown.style.display = 'none';
} else {
dropdown.style.display = 'block';
}
}

document.addEventListener('DOMContentLoaded', function() {
const allDropdowns = document.querySelectorAll('.dropdown-content2');
allDropdowns.forEach(dropdown => {
dropdown.style.display = 'none';
});
});