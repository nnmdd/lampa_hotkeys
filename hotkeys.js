Lampa.Platform.tv();
document.addEventListener("keydown", function(inEvent){
  function isElementVisible(element) {
            if (element.offsetWidth || 
               element.offsetHeight || 
               element.getClientRects().length)
                return true;
            else
                return false;
        }
  if (inEvent.keyCode === 48) {
    if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
      document.querySelector('.player-panel__subs.button.selector').click();
    } else {
      history.back();
    }
  }
  if (inEvent.keyCode === 53) {
    if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
      document.querySelector('.player-panel__playlist.button.selector').click();
    } else {
      history.back();
    }
  }
  if (inEvent.keyCode === 56) {
    if (isElementVisible(document.querySelector('.selectbox__layer')) === false) {
      document.querySelector('.player-panel__tracks.button.selector').click();
    } else {
      history.back();
    }
  }
});
