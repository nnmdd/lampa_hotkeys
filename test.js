Lampa.App.listener.follow('ready', changeBackground('black'));
<script type="text/javascript">
function changeBackground(color) {
   document.body.style.background = color;
}

window.addEventListener("load",function() { changeBackground('black') });
</script>
