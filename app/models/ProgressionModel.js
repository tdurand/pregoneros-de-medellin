define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'utils/Constant',
        'models/Ways'
        ],
function($, _, Backbone, LOGGER, CONSTANT, Ways){

  var ProgressionModel = Backbone.Model.extend({

    className: "Progression",

    isFirstWay: true,
    isFirstLoad: true,

    initialize: function(data) {
        var self = this;

        if(_.isUndefined(data)) {

            self.set("charactersProgression", new Backbone.NestedModel({
                        jale: {
                            character:{
                                locked:true
                            },
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
                            character:{
                                locked:true
                            },
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
                        },
                        lider: {
                            character:{
                                locked:true
                            },
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
                        },
                        gaucho: {
                            character:{
                                locked:true
                            },
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
                        },
                        papavanegas: {
                            character:{
                                locked:true
                            },
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
            }));


            self.set({
                nbItemUnlocked:0,
                currentStreet:"",
                nbStreetLoaded:0,
                pageHaveBeenShared: false
            });

            self.set("pathDiscovered",{});

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
        var videoName = "";

        //Check if we have already unlocked a video in this street
        var videoAlreadyUnlockedInThisStreet = self.itemAlreadyUnlockedInThisStreet(character, wayName);

        if(_.isUndefined(videoAlreadyUnlockedInThisStreet)) {
            console.log("No unlock in this street yet");
            var nextItemForThisCharacter = self.nextItemToUnlock(character);
            videoName = nextItemForThisCharacter;
            videoId = CONSTANT.get("videoToPlay")[character][nextItemForThisCharacter];
        }
        else {
            console.log("Video already unlocked in this street, play same");
            videoId = CONSTANT.get("videoToPlay")[character][videoAlreadyUnlockedInThisStreet];
            videoName = videoAlreadyUnlockedInThisStreet;
        }

        return { "videoId":videoId, "videoName":videoName };

    },

    nextItemToUnlock: function(character) {
        var self = this;

        var toUnLock = _.findKey(self.get("charactersProgression").get(character),function(key,keyName) {
                if(keyName !== "character" && key.locked === true) {
                    return key;
                }
        });

        console.log("Next item to unlock" + toUnLock);

        return toUnLock;
    },

    itemAlreadyUnlockedInThisStreet: function(character, wayName) {
        var self = this;

        var videoAlreadyUnlockedInThisStreet;

        //Check if we have already unlocked a video in this street
        videoAlreadyUnlockedInThisStreet = _.findKey(self.get("charactersProgression").get(character),{wayName: wayName});
        if(_.isUndefined(videoAlreadyUnlockedInThisStreet)) {
            //or reverse street
            videoAlreadyUnlockedInThisStreet = _.findKey(self.get("charactersProgression").get(character),{wayName: Ways.getReverseWayName(wayName)});
        }

        return videoAlreadyUnlockedInThisStreet;
    },

    unlockNextItem: function(character, wayName) {
        var self = this;

        if(!_.isUndefined(self.itemAlreadyUnlockedInThisStreet(character, wayName))) {
            //already unlocked in this street
            return false;
        }

        var charactersProgression = self.get("charactersProgression");

        var toUnLock = self.nextItemToUnlock(character);

        //Unlock next video
        charactersProgression.set(character+"."+toUnLock, {
            locked :false,
            wayName : wayName
        });

        var nbItemUnlocked = self.get("nbItemUnlocked");
        nbItemUnlocked++;

        self.set("nbItemUnlocked", nbItemUnlocked);

        console.log("nbItemUnlocked: " + nbItemUnlocked);

        return true;

    },

    unlockCharacter: function(character) {
        var self = this;

        //Always unlock character
        self.get("charactersProgression").set(character+".character.locked", false);
    },

    setCurrentStreet: function(wayName) {
        var self = this;
        self.set("currentStreet", wayName);
        //Increment nb street loaded
        var nbStreetLoaded = self.get("nbStreetLoaded");
        nbStreetLoaded++;
        self.set("nbStreetLoaded", nbStreetLoaded);
    },

    getStreetWhereCharacterNotDiscovered: function(character) {
        var self = this;

        var streetsWhereCharacter = _.pluck(_.where(Ways.WAYS,{"characterDefinition":{name:character}}),"wayName");
        var streetsAlreadyUnlockedTemp = _.pluck(_.where(self.get("charactersProgression").get(character),{locked:false},"wayName"),"wayName");
        var streetsAlreadyUnlocked = [];
        _.each(streetsAlreadyUnlockedTemp, function(way) {
            if(!_.isUndefined(way)) {
                var wayReverse = Ways.getReverseWayName(way);
                streetsAlreadyUnlocked.push(way);
                streetsAlreadyUnlocked.push(wayReverse);
            }
        });

        var streetsToGo = _.difference(streetsWhereCharacter, streetsAlreadyUnlocked);

        return streetsToGo[0];
    },

    isThisCharacterInThisStreetLocked: function(wayName, character) {
        var self = this;

        var locked = true;
        if(!_.isUndefined(_.find(self.get("charactersProgression").get(character),{wayName:wayName}))) {
            locked = false;
        }

        if(!_.isUndefined(_.find(self.get("charactersProgression").get(character),{wayName:Ways.getReverseWayName(wayName)}))) {
            locked = false;
        }
        return locked;
    }


  });

  return ProgressionModel;
  
});


