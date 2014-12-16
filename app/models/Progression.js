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
            },
            nbItemUnlocked:0
        });
    },

    unlockNextItem: function(character, doNotUnlockVideo) {
        var self = this;
        var doNotUnlockVideoLocal = doNotUnlockVideo;

        if(_.isUndefined(doNotUnlockVideo)) {
            doNotUnlockVideoLocal = false;
        }

        var charactersProgression = _.cloneDeep(self.get("charactersProgression"));

        var toUnLock = _.keys(charactersProgression[character])[_.values(charactersProgression[character]).indexOf(false)];
        
        if(_.isUndefined(toUnLock)) {
            //everthing unlocked
            return;
        }

        if(toUnLock == "characterUnlocked") {
            toUnLock = "video1Unlocked";
        }

        //Always unlock character
        charactersProgression[character]["characterUnlocked"] = true;
        //Unlock next video
        if(!doNotUnlockVideoLocal) {
            charactersProgression[character][toUnLock] = true;
        }

        var nbItemUnlocked = self.get("nbItemUnlocked");
        nbItemUnlocked++;

        self.set("nbItemUnlocked", nbItemUnlocked);

        self.set("charactersProgression",charactersProgression);
    }

  });

  window.Progression = new Progression();

  return window.Progression;
  
});


