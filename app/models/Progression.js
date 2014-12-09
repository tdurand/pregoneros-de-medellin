define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'
        ],
function($, _, Backbone, LOGGER){

  var Progression = Backbone.Model.extend({

    initialize: function() {
        var self = this;

        self.set({
            charactersProgression: {
                    jale: {
                        characterUnlocked:false,
                        video1Unlocked:false,
                        video2Unlocked:false,
                        video3Unlocked:false
                    }
            }
        });
    }

  });

  return new Progression();
  
});


