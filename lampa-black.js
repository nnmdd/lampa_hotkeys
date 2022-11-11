function makeNoise() {
  $(document.body).css( "background", "black" );
  
  $(".selectbox__content").css( "background", "black" );
  $(".selectbox-item.focus").css( "background-color", "white" );
  $(".selectbox-item.focus").css( "color", "black" );
  
  $(".settings__content").css( "background", "black" );
  $(".settings-param.focus").css( "background-color", "white" );
  $(".settings-param.focus").css( "color", "black" );
  
  $("li.menu__item.selector").css( "-webkit-border-radius", "0" );
  $("li.menu__item.selector").css( "-moz-border-radius", "0" );
  $("li.menu__item.selector").css( "border-radius", "0" );

};
Lampa.Listener.follow('app', makeNoise);
