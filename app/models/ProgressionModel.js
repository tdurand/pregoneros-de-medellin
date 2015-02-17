define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Ways'
        ],
function($, _, Backbone, LOGGER, Ways){

  var ProgressionModel = Parse.Object.extend({

    className: "Progression",

    isFirstWay: true,
    isFirstVideo: true,

    initialize: function(data) {
        var self = this;

        if(_.isUndefined(data)) {
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

            //Reinitialize id to undefined (for parse sync)
            self.id = undefined;
        }
        else {
            self.set({
                id:data.id
            });
        }
        
    },

    nextVideoToPlay: function(character, wayName) {

        var self = this;
        var videoId;

        //Check if we have already unlocked a video in this street
        var videoAlreadyUnlockedInThisStreet = self.itemAlreadyUnlockedInThisStreet(character, wayName);

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

    itemAlreadyUnlockedInThisStreet: function(character, wayName) {
        var self = this;

        var videoAlreadyUnlockedInThisStreet;

        //Check if we have already unlocked a video in this street
        videoAlreadyUnlockedInThisStreet = _.findKey(self.get("charactersProgression")[character],{wayName: wayName});
        if(_.isUndefined(videoAlreadyUnlockedInThisStreet)) {
            //or reverse street
            videoAlreadyUnlockedInThisStreet = _.findKey(self.get("charactersProgression")[character],{wayName: Ways.getReverseWayName(wayName)});
        }

        return videoAlreadyUnlockedInThisStreet;
    },

    unlockNextItem: function(character, wayName) {
        var self = this;

        if(!_.isUndefined(self.itemAlreadyUnlockedInThisStreet(character, wayName))) {
            //already unlocked in this street
            return;
        }

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
        var user = Parse.User.current();

        //If user logged in
        if(!_.isNull(user)) {

            self.set("belongTo", Parse.User.current());
            self.save(null,{
              success: function(gameScore) {
                // Execute any logic that should take place after the object is saved.
                console.log('New object created with objectId: ' + gameScore.id);
              },
              error: function(gameScore, error) {
                // Execute any logic that should take place if the save fails.
                // error is a Parse.Error with an error code and message.
                console.log('Failed to create new object, with error code: ' + error.message);
               }
            });
        }

        
    }


  });

  return ProgressionModel;
  
});


