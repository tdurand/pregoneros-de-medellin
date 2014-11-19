define(['jquery',
        'underscore',
        'backbone',
        'models/Sound'
        ],
function($, _, Backbone,
                Sound){

  var Sounds = Backbone.Collection.extend({

    model: Sound,

    init:function(params) {
        
        var self = this;

        self.add([
          {position: [6.257865847806911,-75.61148554086685],
            name:"streetambient",
            db:40
           },
          {position: [6.257825854403986,-75.61136752367018],
            name:"pregonlimonpajarito",
            db:30
           }
        ]);
    },

    updateSounds: function(newUserPosition) {
        var self = this;
        _.each(self.models, function(sound) {
            sound.updateSound(newUserPosition);
        });
    },

    addMarkersToMap: function(map) {
        var self = this;
        _.each(self.models, function(sound) {
            L.marker(sound.position).addTo(map);
        });
    },

    mute: function() {
        Howler.mute();
    },

    unmute: function() {
        Howler.unmute();
    }


  });

  return Sounds;
  
});


