define(['jquery',
        'underscore',
        'backbone',
        'models/Sounds',
        'text!templates/index/indexViewTemplate.html',
        'popcorn'
        ],
function($, _, Backbone,
                    Sounds,
                    indexViewTemplate){

  var IndexView = Backbone.View.extend({

    el:"#index",

    events:{

    },

    prepare:function() {

        var self = this;
        
        this.render();

        Sounds.playSoundHome();

    },

    render:function() {

        var self = this;

        self.$el.html(_.template(indexViewTemplate)());

        //Add video
        self.popcorn = Popcorn.vimeo( ".landingpage-video", "http://player.vimeo.com/video/108518900?loop=1" );
        self.popcorn.volume(0);
        self.popcorn.play();
        
        self.popcorn.on("play",function() {
            self.resizeBackgroundVideo();
            $(".landingpage-video-frame").css("z-index",-3);
            
        });

        //EVENT AVAILABLE: https://github.com/mozilla/popcorn-js/blob/master/players/vimeo/popcorn.vimeo.unit.js


        //Prefetch image loading
        $.preloadImages = function() {
          for (var i = 0; i < arguments.length; i++) {
            $("<img />").attr("src", arguments[i]);
          }
        };

        $.preloadImages("images/loadingbackground.jpg");

    },

    //See this hack: http://jsfiddle.net/6qBUK/4/
    resizeBackgroundVideo : function() {

        var self = this;

        var mainContainer = self.$el.find(".main");
        var videoContainer = self.$el.find(".landingpage-video");
        var videoIframe = self.$el.find(".landingpage-video iframe");

        var ratio = 9/16;

        var width = mainContainer.width();
        var height = (width * ratio);

        $(videoIframe).width(width+"px");
        $(videoIframe).height(height+"px");
        $(videoIframe).css("marginTop","-3.278%");

        $(videoContainer).height(height * 0.88);//0.88 was the magic number that you needed to shrink the height of the outer container with.

    },

    onClose: function(){
      var self = this;
      //Clean
      self.undelegateEvents();
      self.popcorn.pause();
    }

  });

  return IndexView;
  
});


