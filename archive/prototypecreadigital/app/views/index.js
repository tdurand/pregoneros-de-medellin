define(['jquery',
        'underscore',
        'backbone',
        'text!templates/index/indexViewTemplate.html',
        'popcorn'
        ],
function($, _, Backbone,
                    indexViewTemplate){

  var IndexView = Backbone.View.extend({

    el:"#index",

    events:{

    },

    prepare:function() {

        var self = this;
        
        this.render();

    },

    render:function() {

        var self = this;

        self.$el.html(_.template(indexViewTemplate)());

        //Add video
        // self.popcorn = Popcorn.vimeo( ".landingpage-video", "http://player.vimeo.com/video/80836903?loop=1" );

        // self.popcorn.play();
        
        // self.popcorn.on("play",function() {
        //     $(".landingpage-video-frame").css("z-index",-1);
            
        // });

        //EVENT AVAILABLE: https://github.com/mozilla/popcorn-js/blob/master/players/vimeo/popcorn.vimeo.unit.js

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


