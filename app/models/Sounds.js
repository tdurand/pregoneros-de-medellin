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

    init:function(waySounds) {
        var self = this;
        self.waySounds = waySounds;
    },

    updateSounds: function(newUserPosition) {
        var self = this;

        if(self.models.length === 0) {
            return;
        }

        var twoClosestNode = self.getTwoClosestNode(newUserPosition);

        //set other node to 0 vol
        _.each(self.models, function(sound) {
            if(sound.cid != twoClosestNode.closestNode.sound.cid && sound.cid != twoClosestNode.secondClosestNode.sound.cid) {
                sound.sound.volume(0);
                LOGGER.debug("SET VOLUME 0 TO " + sound.path);
            }
        });

        twoClosestNode.closestNode.sound.updateSound(newUserPosition);
        twoClosestNode.secondClosestNode.sound.updateSound(newUserPosition);
    },

    updateLinearSounds: function(newUserPosition) {

    },

    getTwoClosestNode: function(position) {
        var self = this;

        var closestNode = {
            sound:null,
            distance:100000000000
        };

        var secondClosestNode = {
            sound:null,
            distance:100000000000
        };

        _.each(self.models,function(sound) {
            var soundDistanceToPosition = GeoUtils.distance(sound.position,position);
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
        });

        return {
            "closestNode":closestNode,
            "secondClosestNode":secondClosestNode
        };
    },

    fetch: function() {
            var self = this;

            if(_.isUndefined(self.waySounds)) {
                self.trigger('noSounds');
                return;
            }

            var nbSoundsToLoad = self.waySounds.length;
            
            _.each(self.waySounds, function(waySound) {

                var sound = new Sound({
                        position: waySound.position,
                        path: waySound.path,
                        db: waySound.db
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

        var length = self.length;

        //need to clean like this because for odd
        //reason backbone.each gives undefined on the last
        //model
        for (var i = 0; i < length; i++) {
            self.at(0).unload();
            self.remove(self.at(0));
        }

        self.waySounds = [];
    }


  });

  return Sounds;
  
});


