Lampa.App.listener.follow('ready', changeBackground('black'));

function changeBackground(color) {
   document.body.style.background = color;
}

window.addEventListener("load",function() { changeBackground('black') });
