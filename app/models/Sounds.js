define(['jquery',
        'underscore',
        'backbone',
        'models/Sound',
        'utils/GeoUtils',
        'utils/Logger'
        ],
function($, _, Backbone,
                Sound,
                GeoUtils,
                LOGGER){

  var Sounds = Backbone.Collection.extend({

    model: Sound,

    soundHomeFaded: false,
    userMuted: false,
    percentageLoaded:0,

    playSoundHome: function() {
        var self = this;

        if(self.soundHome) {
            return;
        }

        self.soundHome = new Howl({
          src: ['content/music/intro.mp3'],
          loop:true,
          html5:true,
          volume:0.7,
          onload: function() {
            self.soundHome.play();
          }
        });
    },

    fadeOutSoundHome: function() {
        var self = this;

        if(self.soundHome) {
            if(!self.soundHomeFaded) {
                self.soundHome.fade(1,0,3000);
                self.soundHomeFaded = true;
            }
        }
    },

    updateSounds: function(newUserPosition, movingForward) {
        var self = this;

        // self.mute();

        self.currentUserPosition = newUserPosition;

        if(self.models.length === 0) {
            return;
        }

        var twoClosestNode = self.getTwoClosestNode(newUserPosition);

        //set other node to 0 vol
        _.each(self.models, function(sound) {
            sound.updateSound(newUserPosition, movingForward);
            // if(sound.get("type") == "punctual") {
            //     sound.updateSound(newUserPosition, movingForward);
            // }
            // else if(sound.cid != twoClosestNode.closestNode.sound.cid && sound.cid != twoClosestNode.secondClosestNode.sound.cid) {
            //     sound.sound.volume(0);
            //     sound.vol = 0;
            //     LOGGER.debug("SET VOLUME 0 TO " + sound.get("path"));
            // }
        });

        // if(!_.isUndefined(twoClosestNode.closestNode.sound)) {
        //     twoClosestNode.closestNode.sound.updateSound(newUserPosition, movingForward);
        // }

        // if(!_.isUndefined(twoClosestNode.secondClosestNode.sound)) {
        //     twoClosestNode.secondClosestNode.sound.updateSound(newUserPosition, movingForward);
        // }
    },

    getTwoClosestNode: function(position) {
        var self = this;

        var closestNode = {
            sound:undefined,
            distance:100000000000
        };

        var secondClosestNode = {
            sound:undefined,
            distance:100000000000
        };

        _.each(self.models,function(sound) {
            if(sound.get("type") == "ambient") {
                var soundDistanceToPosition = GeoUtils.distance(sound.get("position"),position);
                if(soundDistanceToPosition < closestNode.distance) {
                    //new closest node
                    secondClosestNode = closestNode;
                    closestNode = {
                        sound:sound,
                        distance:soundDistanceToPosition
                    };
                }
                else if(soundDistanceToPosition < secondClosestNode.distance) {
                    //new second closest node
                    secondClosestNode = {
                        sound:sound,
                        distance:soundDistanceToPosition
                    };
                }
            }
        });

        return {
            "closestNode":closestNode,
            "secondClosestNode":secondClosestNode
        };
    },

    findClosestAmbientSound: function(currentPosition,sounds) {
        var self = this;

        var closestNode = {
            sound:undefined,
            distance:undefined
        };

        _.each(sounds,function(sound) {
            if(sound.type == "ambient") {
                var soundDistanceToPosition = GeoUtils.distance(sound.position,currentPosition);
                if(soundDistanceToPosition < closestNode.distance || _.isUndefined(closestNode.distance)) {
                    //new closest node
                    closestNode = {
                        sound:sound,
                        distance:soundDistanceToPosition
                    };
                }
            }
        });

        return closestNode.sound;

    },

    updateSoundsCollection:function(waySounds,wayName) {
        var self = this;

        self.wayName = wayName;

        self.previousWaySounds = [];

        if(self.models.length > 0) {
            _.each(self.models,function(sound) {
                self.previousWaySounds.push(sound.attributes);
            });
        }
        
        self.waySounds = waySounds;

        self.waySoundsIds = _.pluck(self.waySounds,"path");
        self.previousWaySoundsIds = _.pluck(self.previousWaySounds,"path");

        //intersection
        self.soundsToKeepIds = _.intersection(self.previousWaySoundsIds,self.waySoundsIds);
        self.soundsToRemoveIds = _.difference(self.previousWaySoundsIds,self.soundsToKeepIds);
        self.soundsToAddIds = _.difference(self.waySoundsIds,self.soundsToKeepIds);

        self.soundsToAdd = [];

        //sound to fadein
        self.soundToFadeInId = "";

        _.each(self.soundsToAddIds,function(soundToAddId) {
            self.soundsToAdd.push(_.findWhere(self.waySounds, {path: soundToAddId}));
        });

        if(self.soundsToKeepIds.length === 0 && !_.isUndefined(self.currentUserPosition)) {
            //Fadein closest ambient to add
            var closestAmbientToFadeIn = self.findClosestAmbientSound(self.currentUserPosition,self.soundsToAdd);
            if(closestAmbientToFadeIn) {
                self.soundToFadeInId = closestAmbientToFadeIn.path;
            }
        }

    },

    addSound: function(waySound) {
        var self = this;

        self.previousWaySounds.push(waySound);

        if(_.isUndefined(waySound.maxvol)) {
            waySound.maxvol = 100;
        }

        var sound = new Sound({
                        position: waySound.position,
                        path: waySound.path,
                        db: waySound.db,
                        maxvol: waySound.maxvol,
                        type: waySound.type,
                        way: self.wayName
                        });

        sound = self.add(sound);

        console.log(self.models);

        return sound;
    },

    removeSound: function(waySound) {
        var self = this;

        console.log(self.previousWaySounds);

        self.previousWaySounds = _.reject(self.previousWaySounds,function(sound) {
            return (sound.path == waySound.path);
        });

        console.log(self.previousWaySounds);

        self.remove(waySound).unload();

        console.log(self.models);
    },

    fetch: function() {
            var self = this;

            if(_.isUndefined(self.soundsToAdd)) {
                self.trigger('noSounds');
                return;
            }

            var nbSoundsToLoad = self.soundsToAdd.length;
            var nbSoundsPunctualToLoad = _.size(_.where(self.soundsToAdd,{type:"punctual"}));
            var nbSoundsTotal = nbSoundsToLoad;
            var nbSoundsPunctualTotal = nbSoundsPunctualToLoad;

            //TODO REMOVE OR AVOID DUPLICATE CODE
            if(nbSoundsPunctualToLoad === 0) {
                self.percentageSoundsLoaded = 100;
                self.trigger('loadingSoundsFinished');
                LOGGER.debug("ALL SOUNDS LOADED");
                console.log(self.models);

                //Remove old sounds
                _.each(self.soundsToRemoveIds, function(soundToRemove) {
                    var sound = self.get(soundToRemove);
                    self.listenToOnce(sound,"faded",function() {
                        self.remove(sound).unload();
                    });
                    sound.fadeOut();
                });
            }
            
            _.each(self.soundsToAdd, function(waySound) {

                if(_.isUndefined(waySound.maxvol)) {
                    waySound.maxvol = 100;
                }

                var sound = new Sound({
                        position: waySound.position,
                        path: waySound.path,
                        db: waySound.db,
                        maxvol: waySound.maxvol,
                        type: waySound.type,
                        way: self.wayName
                        });



                self.add(sound);

                self.listenTo(sound,"soundLoaded",function() {
                    nbSoundsPunctualToLoad--;

                    self.percentageLoaded = Math.floor((nbSoundsPunctualTotal-nbSoundsPunctualToLoad)*100/nbSoundsPunctualTotal);
                    self.trigger('updateSoundsPercentageLoaded');

                    if(nbSoundsPunctualToLoad === 0) {
                        self.percentageLoaded = 100;
                        self.trigger('loadingSoundsFinished');
                        LOGGER.debug("ALL SOUNDS LOADED");
                        console.log(self.models);

                        //Find eventual sound to fadein
                        if(self.soundToFadeInId !== "") {
                            var soundToFadeIn = _.find(self.models,{id:self.soundToFadeInId});

                            if(soundToFadeIn && soundToFadeIn.sound.volume() === 0) {
                                console.log("FADEIN");
                                soundToFadeIn.fadeIn();
                            }
                            else {
                                console.log("SOUND TO FADEIN ALREADY VOLUME UP");
                            }
                        }

                        //Remove old sounds
                        _.each(self.soundsToRemoveIds, function(soundToRemove) {
                            var sound = self.get(soundToRemove);
                            self.listenToOnce(sound,"faded",function() {
                                self.remove(sound).unload();
                            });
                            sound.fadeOut();
                        });
                    }
                });

            });
    },

    mute: function() {
        var self = this;
        Howler.mute(true);
        self.trigger("mute");
    },

    unmute: function() {
        var self = this;
        Howler.mute(false);
        self.trigger("unmute");
    },

    isMuted: function() {
        return Howler._muted;
    },

    solo: function(soundToSolo) {
        var self = this;
        
        self.unmuteAll();

        if(self.models.length > 0) {
            _.each(self.models,function(sound) {
                if(soundToSolo.cid != sound.cid) {
                    sound.mute();
                }
            });
        }
    },

    unmuteAll: function() {
        var self = this;
        if(self.models.length > 0) {
            _.each(self.models,function(sound) {
                sound.unmute();
            });
        }
    },

    clear: function() {
        var self = this;
    }


  });

  return new Sounds();
  
});


