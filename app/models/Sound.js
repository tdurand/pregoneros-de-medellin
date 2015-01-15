define(['jquery',
        'underscore',
        'backbone',
        'utils/GeoUtils',
        'utils/Logger',
        'howl'
        ],
function($, _, Backbone, GeoUtils, LOGGER){

  var Sound = Backbone.Model.extend({

    // position: undefined,
    // vol: undefined,
    // path: undefined,
    // type: undefined,
    // db: undefined,

    idAttribute: "path",

    initialize: function() {
        var self = this;

        self.loadSound();
    },

    updateVolume: function(newUserPosition) {
            var self = this;

            // Calculate distance between user and sound
            var distance = GeoUtils.distance(self.get("position"), newUserPosition);
            
            // Calculate new volume based on distance
            self.vol = self.calculateVolume(distance);

            // Set new volume
            self.sound.volume(self.vol);

            LOGGER.debug(self.get("path") + "PLAYING WITH VOL: " + self.vol);
    },

    updatePan : function(newUserPosition){

        var self = this;

        var xDiff = self.get("position")[0] - newUserPosition[0],
            yDiff = self.get("position")[1] - newUserPosition[1],
            angle = Math.atan2(yDiff, xDiff) * (180/Math.PI);

        // Add POV heading offset
        // angle -= GeoUtils.getBearing(newUserPosition,self.get("position"));


        // LOGGER.debug("Bearing " + GeoUtils.getBearing(newUserPosition,self.get("position")));

        // Convert angle to range between -180 and +180
        if (angle < -180)       angle += 360;
        else if (angle > 180)   angle -= 360;

        LOGGER.debug("ANGLE: " + angle);

        // Calculate panPosition, as a range between -1 and +1
        var panPosition = (angle/90);
        if (Math.abs(panPosition) > 1) {
            var x = Math.abs(panPosition) - 1;
            panPosition = (panPosition > 0) ? 1 - x : -1 + x;
        }

        //see why we need to invert angle
        panPosition = -panPosition;

        LOGGER.debug("PANPOSITION " + panPosition);

        // Set the new pan poition
        self.sound.pos(panPosition, 1, 1);

        // Apply lowpass filter *if* the sound is behind us (11,000hz = filter fully open)
        // var freq = 11000;
        // if (Math.abs(angle) > 90) {
        //     // User's back is to the sound - progressively apply filter
        //     freq -= (Math.abs(angle) - 90) * 55;
        // }
        // self.sound.filter(freq);
    },

    updateSound: function(newUserPosition) {
        var self = this;
        //spatialized only for punctual sounds
        if(self.get("type") == "punctual") {
            self.updatePan(newUserPosition);
        }
        self.updateVolume(newUserPosition);
    },

    calculateVolume: function(distance){
        var self = this;

        var vol = 0;

        if(self.get("type") == "ambient") {
            vol = 1 / (distance);
        }
        else if(self.get("type") == "punctual") {
            vol = 1 / (distance * distance);
        }
        
        // Multiply distance volume by amplitude of sound (apply ceiling max of 1)
        vol = Math.min((vol * self.get("db")), 1);
        return vol;
    },

    unload: function() {
        var self = this;
        self.sound.unload();
    },

    loadSound:function() {

        var self = this;
        self.sound = new Howl({
          src: ['data/sounds/' + self.get("path") + '.mp3'],
          loop:true,
          volume:0,
          onload: function() {
            self.trigger("soundLoaded");
          }
        });

        self.sound.play();
    }

  });

  return Sound;
  
});


