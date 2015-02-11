define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Ways'
        ],
function($, _, Backbone, LOGGER, Ways){

  var Progression = Parse.Object.extend({

    className: "Progression",

    isFirstWay: true,
    isFirstVideo: true,

    initialize: function() {
        var self = this;

        self.set({
            charactersProgression: {
                    jale: {
                        characterUnlocked:false,
                        video1: {
                            locked: true,
                            wayName:""
                        },
                        video2: {
                            locked: true,
                            wayName:""
                        },
                        video3: {
                            locked: true,
                            wayName:""
                        }
                    },
                    pajarito: {
                        characterUnlocked:false,
                        video1: {
                            locked: true,
                            wayName:""
                        },
                        video2: {
                            locked: true,
                            wayName:""
                        },
                        video3: {
                            locked: true,
                            wayName:""
                        },
                        video4: {
                            locked: true,
                            wayName:""
                        }
                    }
            },
            nbItemUnlocked:0
        });

        self.set({
            videoToPlay: {
                jale: {
                    video1:"115325357",
                    video2:"115328393",
                    video3:"115328393"
                },
                pajarito: {
                    video1:"115328392",
                    video2:"115325355",
                    video3:"115325356",
                    video4:"115325356"
                }
            }
        });
    },

    nextVideoToPlay: function(character, wayName) {

        var self = this;
        var videoId;

        //Check if we have already unlocked a video in this street
        var videoAlreadyUnlockedInThisStreet = _.findKey(self.get("charactersProgression")[character],{wayName: wayName});
        if(_.isUndefined(videoAlreadyUnlockedInThisStreet)) {
            //or reverse street
            videoAlreadyUnlockedInThisStreet = _.findKey(self.get("charactersProgression")[character],{wayName: Ways.getReverseWayName(wayName)});
        }

        if(_.isUndefined(videoAlreadyUnlockedInThisStreet)) {
            console.log("No unlock in this street yet");
            var nextItemForThisCharacter = self.nextItemToUnlock(character);

            videoId = self.get("videoToPlay")[character][nextItemForThisCharacter];
        }
        else {
            console.log("Video already unlocked in this street, play same");
            videoId = self.get("videoToPlay")[character][videoAlreadyUnlockedInThisStreet];
        }

        return videoId;

    },

    nextItemToUnlock: function(character) {
        var self = this;

        var toUnLock = _.findKey(self.get("charactersProgression")[character],{locked: true});

        console.log("Next item to unlock" + toUnLock);

        return toUnLock;
    },

    unlockNextItem: function(character, wayName) {
        var self = this;

        var charactersProgression = _.cloneDeep(self.get("charactersProgression"));

        var toUnLock = self.nextItemToUnlock(character);

        //Always unlock character
        charactersProgression[character]["characterUnlocked"] = true;
        //Unlock next video
        charactersProgression[character][toUnLock] = {
            locked :false,
            wayName : wayName
        };

        var nbItemUnlocked = self.get("nbItemUnlocked");
        nbItemUnlocked++;

        self.set("nbItemUnlocked", nbItemUnlocked);

        self.set("charactersProgression",charactersProgression);

        console.log(charactersProgression);

        self.persistToParse();

    },

    persistToParse: function() {
        var self = this;
        self.set("belongTo", Parse.User.current());
        self.save(null,{
              success: function(gameScore) {
                // Execute any logic that should take place after the object is saved.
                alert('New object created with objectId: ' + gameScore.id);
              },
              error: function(gameScore, error) {
                // Execute any logic that should take place if the save fails.
                // error is a Parse.Error with an error code and message.
                alert('Failed to create new object, with error code: ' + error.message);
               }
        });
    },

    parse:function(response) {
        if(response.results) {
            return response.results[0];
        }
        else {
            return response;
        }
        
    },

    firstFetch: function() {
        var self = this;
        var query = new Parse.Query(Progression);

        query.equalTo("belongTo", Parse.User.current());
        query.first({
          success: function(object) {
            console.log(object);
            // self.trigger("change");
          },
          error: function(error) {
            alert("Error: " + error.code + " " + error.message);
          }
        });
    }

  });

  return new Progression();
  
});


