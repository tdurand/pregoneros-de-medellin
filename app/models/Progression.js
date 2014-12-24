define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'
        ],
function($, _, Backbone, LOGGER){

  var Progression = Backbone.Model.extend({

    isFirstWay: true,
    isFirstVideo: true,

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

        self.set({
            videoToPlay: {
                jale: {
                    "video1Unlocked":"115325357",
                    "video2Unlocked":"115328393",
                    "video3Unlocked":"115328393"
                },
                pajarito: {
                    "bonus1":"115328392",
                    "video1Unlocked":"115325355",
                    "video2Unlocked":"115325356",
                    "video3Unlocked":"115325356"
                }
            }
        });
    },

    nextVideoToPlay: function(character) {

        var self = this;

        var nextItemForThisCharacter = self.nextItemToUnlock(character);

        var videoId = self.get("videoToPlay")[character][nextItemForThisCharacter];

        return videoId;

    },

    nextItemToUnlock: function(character) {
        var self = this;

        var charactersProgression = _.cloneDeep(self.get("charactersProgression"));

        var toUnLock = _.keys(charactersProgression[character])[_.values(charactersProgression[character]).indexOf(false)];
        
        if(_.isUndefined(toUnLock)) {
            //everthing unlocked
            return;
        }

        if(toUnLock == "characterUnlocked") {
            toUnLock = "video1Unlocked";
        }

        return toUnLock;

    },

    unlockNextItem: function(character, doNotUnlockVideo) {
        var self = this;
        var doNotUnlockVideoLocal = doNotUnlockVideo;

        var charactersProgression = _.cloneDeep(self.get("charactersProgression"));

        if(_.isUndefined(doNotUnlockVideo)) {
            doNotUnlockVideoLocal = false;
        }

        var toUnLock = self.nextItemToUnlock(character);

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


