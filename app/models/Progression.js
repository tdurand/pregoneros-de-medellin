define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'
        ],
function($, _, Backbone, LOGGER){

  var Progression = Backbone.Model.extend({

    isFirstWay: true,

    initialize: function() {
        var self = this;

        self.set({
            charactersProgression: {
                    jale: {
                        characterUnlocked:false,
                        video1Unlocked:false,
                        video2Unlocked:false,
                        video3Unlocked:false
                    },
                    pajarito: {
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


