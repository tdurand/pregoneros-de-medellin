define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'
        ],
function($, _, Backbone,LOGGER){

  var Still = Backbone.Model.extend({

    loaded: false,

    initialize: function() {
        var self = this;

        self.set({
            img:new Image(),
            imgHighRes: new Image()
        });

        
        
    },

    pull: function() {
        var self = this;
        //TODO OVERRIDE SYNC METHOD TO PUT THIS THERE TO GET THE BACKBONE EVENTS
        var img = self.get("img");
        img.onload = function() {
            LOGGER.debug("Img :" + img.src);
            self.trigger("imgloaded");
        };
        img.src =  self.get("srcLowRes");
    },

    //TODO SEE IF WE CLEAR THE HIGHRES AFTER LOADING TO DO NOT OVERLOAD THE RAM
    loadHighRes: function(callbackLoaded) {
        var self = this;
        var imgHighRes = this.get("imgHighRes");
        imgHighRes.src = this.get("srcHighRes");
        //If image already loaded
        if(imgHighRes.loaded) {
            callbackLoaded(imgHighRes.src);
        }
        imgHighRes.onload = function() {
            callbackLoaded(imgHighRes.src);
            imgHighRes.loaded = true;
        };

    },

    cancelHighResLoading: function() {
        this.get("imgHighRes").src = ":about";
    },

    clear: function() {
        self.set({
            img: null,
            imgHighRes: null
        });
    }

  });

  return Still;
  
});


