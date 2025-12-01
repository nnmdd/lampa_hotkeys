(function () {
    'use strict';

    var dcma_timer = setInterval(function(){
    if(window.lampa_settings.dcma || window.lampa_settings.fixdcma){
    clearInterval(dcma_timer)
    if (window.lampa_settings.dcma)
      window.lampa_settings.dcma = false;
    }
  },100);

})();
