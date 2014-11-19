define(['jquery',
        'underscore',
        'backbone'
        ],
function($, _, Backbone){

  var Still = Backbone.Model.extend({

    loaded: false,

    initialize: function() {
        var self = this;

        self.set({
            img:new Image(),
            imgHighRes: new Image()
        });

        //TODO OVERRIDE SYNC METHOD TO PUT THIS THERE TO GET THE BACKBONE EVENTS
        var img = self.get("img");
        img.src =  self.get("srcLowRes");
        img.onload = function() {
            console.log("Img :" + img.src);
            self.trigger("imgloaded");
        };
    },

    //TODO SEE IF WE CLEAR THE HIGHRES AFTER LOADING TO DO NOT OVERLOAD THE RAM
    loadHighRes: function(callbackLoaded) {

        var imgHighRes = this.get("imgHighRes");
        imgHighRes.src = this.get("srcHighRes");
        //If image already loaded
        if(imgHighRes.loaded) {
            callbackLoaded();
        }
        imgHighRes.onload = function() {
            callbackLoaded();
            imgHighRes.loaded = true;
        };

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


