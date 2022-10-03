Lampa.Platform.tv();
function log() {
        console.log.apply(console.log, arguments);
      }
//log('Hotkeys', 'Hotkeys loaded');
function listenDestroy() {
	document.removeEventListener("keydown", listenHotkeys);
	Lampa.Player.listener.remove('destroy', listenDestroy);	
	Lampa.Player.listener.remove('ready',startHotkeys);
};



function startHotkeys() {
	document.addEventListener("keydown", listenHotkeys);
	Lampa.Player.listener.follow('destroy', listenDestroy);
};


function listenHotkeys(e) {

var textContent1 = document.querySelector('.selectbox__title').innerText;
log('Hotkeys', textContent1);
log('Hotkeys', document.querySelector('.selectbox__title').innerText);
	
var selText = document.getElementById(''),
var textC  = selText.textContent || selText.innerText;
alert('1');
alert(textC);
log('Hotkeys', textC);

var selText2 = document.querySelector('.selectbox__title'),
let textC2  = selText2.textContent || selText2.innerText;
alert('2');
alert(textC2);
log('Hotkeys',textC2);

  function isElementVisible(element) {
            if (element.offsetWidth || 
               element.offsetHeight || 
               element.getClientRects().length)
                return true;
            else
                return false;
        }
  if (e.keyCode === 48) {
//    log('Hotkeys', '0 pressed');
    if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
      document.querySelector('.player-panel__subs.button.selector').click();
    } else {
      history.back();
    }
  }
  if (e.keyCode === 53) {
//    log('Hotkeys', '5 pressed');
    if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
      document.querySelector('.player-panel__playlist.button.selector').click();
    } else {
      history.back();
    }
  }
  if (e.keyCode === 56) {
//    log('Hotkeys', '8 pressed');
    if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
      document.querySelector('.player-panel__tracks.button.selector').click();
    } else {
      history.back();
    }
  }
};

Lampa.Player.listener.follow('ready',startHotkeys);
