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

    playSoundHome: function() {
        var self = this;

        self.soundHome = new Howl({
          src: ['content/music/intro.mp3'],
          loop:true,
          html5:true,
          volume:1,
          onload: function() {
            self.soundHome.play();
          }
        });
    },

    fadeOutSoundHome: function() {
        var self = this;

        if(self.soundHome) {
            self.soundHome.fade(1,0,3000);
        }
    },

    updateSounds: function(newUserPosition) {
        var self = this;

        self.currentUserPosition = newUserPosition;

        if(self.models.length === 0) {
            return;
        }

        var twoClosestNode = self.getTwoClosestNode(newUserPosition);

        //set other node to 0 vol
        _.each(self.models, function(sound) {
            if(sound.get("type") == "punctual") {
                sound.updateSound(newUserPosition);
            }
            else if(sound.cid != twoClosestNode.closestNode.sound.cid && sound.cid != twoClosestNode.secondClosestNode.sound.cid) {
                sound.sound.volume(0);
                LOGGER.debug("SET VOLUME 0 TO " + sound.get("path"));
            }
        });

        if(!_.isUndefined(twoClosestNode.closestNode.sound)) {
            twoClosestNode.closestNode.sound.updateSound(newUserPosition);
        }

        if(!_.isUndefined(twoClosestNode.secondClosestNode.sound)) {
            twoClosestNode.secondClosestNode.sound.updateSound(newUserPosition);
        }
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

    updateSoundsCollection:function(waySounds,wayName) {
        var self = this;

        self.wayName = wayName;

        if(_.isUndefined(self.waySounds)) {
            self.previousWaySounds = [];
        }
        else {
            self.previousWaySounds = self.waySounds;
        }
        
        self.waySounds = waySounds;

        self.waySoundsIds = _.pluck(self.waySounds,"path");
        self.previousWaySoundsIds = _.pluck(self.previousWaySounds,"path");

        //intersection
        self.soundsToKeepIds = _.intersection(self.previousWaySoundsIds,self.waySoundsIds);
        self.soundsToRemoveIds = _.difference(self.previousWaySoundsIds,self.soundsToKeepIds);
        self.soundsToAddIds = _.difference(self.waySoundsIds,self.soundsToKeepIds);

        self.soundsToAdd = [];

        _.each(self.soundsToAddIds,function(soundToAddId) {
            self.soundsToAdd.push(_.findWhere(self.waySounds, {path: soundToAddId}));
        });

    },

    addSound: function(waySound) {
        var self = this;

        self.previousWaySounds.push(waySound);

        var sound = new Sound({
                        position: waySound.position,
                        path: waySound.path,
                        db: waySound.db,
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

            //Remove old sounds
            _.each(self.soundsToRemoveIds, function(soundToRemove) {
                self.remove(soundToRemove).unload();
            });

            var nbSoundsToLoad = self.soundsToAdd.length;
            
            _.each(self.soundsToAdd, function(waySound) {

                var sound = new Sound({
                        position: waySound.position,
                        path: waySound.path,
                        db: waySound.db,
                        type: waySound.type,
                        way: self.wayName
                        });

                self.add(sound);

                sound.on("soundLoaded",function() {
                    nbSoundsToLoad--;

                    if(nbSoundsToLoad === 0) {
                        self.trigger('soundsLoaded');
                        LOGGER.debug("ALL SOUNDS LOADED");
                    }
                });

            });
    },

    mute: function() {
        Howler.mute();
    },

    unmute: function() {
        Howler.unmute();
    },

    clear: function() {
        var self = this;
    }


  });

  return new Sounds();
  
});


