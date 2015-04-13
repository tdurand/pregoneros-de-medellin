define(['jquery',
        'underscore',
        'backbone',
        'utils/Localization',
        'models/Sounds',
        'text!templates/mobile/mobileViewTemplate.html'
        ],
function($, _, Backbone,
                    Localization,
                    Sounds,
                    mobileViewTemplate){

  var MobileView = Backbone.View.extend({

    el:"#mobile",

    events:{

    },

    prepare:function() {

        var self = this;

        if(_.isUndefined(Localization.STR)) {

            self.listenToOnce(Localization,"STRLoaded", function() {
                self.render();
            });
        }
        else {
            self.render();
        }

        if(Sounds) {
            Sounds.mute();
        }
    },

    render:function() {

        var self = this;

        self.$el.html(_.template(mobileViewTemplate)({
            STR: Localization.STR
        }));

        videojs("video-mobile").ready(function(){
          self.player = this;

          self.player.on("loadeddata",function() {
              self.player.off("loadeddata");
          });
        });

    },

    onClose: function(){
      var self = this;
      //Clean
      self.undelegateEvents();
      self.player.dispose();
      $(window).off("resize");
    }

  });

  return MobileView;
  
});


