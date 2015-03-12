define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'
        ],
function($, _, Backbone,
                LOGGER){

  var VideoManagerView = Backbone.View.extend({

    events:{
        "click .streetwalk-video-btnclose":"closeVideo"
    },

    videoShownOneTime: false,

    prepare : function(Progression) {
        var self = this;

        self.Progression = Progression;

        self.setElement(".streetwalk-video");
    },

    initVideo: function(characterName, wayName) {
        var self = this;

        var idVimeo = self.Progression.instance.nextVideoToPlay(characterName, wayName);
        // Add video
        self.popcorn = Popcorn.vimeo( ".streetwalk-video-container", "http://player.vimeo.com/video/"+idVimeo);
   },

   showVideo: function(characterName, wayName) {
        var self = this;

        //unlocknext item
        var someThingUnlocked = self.Progression.instance.unlockNextItem(characterName,wayName);
        self.Progression.save();

        if(!someThingUnlocked) {
            //todo open video with animation from the character
            TweenLite.fromTo(".streetwalk-video", 1,
                {scaleY:0,scaleX:0},
                {scaleY:1,scaleX:1,
                    display:"block",
                    transformOrigin:"bottom 80%",
                    ease: Power1.easeInOut
            });
        }

        if(_.isUndefined(self.popcorn)) {
            self.initVideo(characterName, wayName);
        }

        self.trigger("showVideo");

        setTimeout(function() {
            self.popcorn.play();
        },1000);

    },

    closeVideo: function() {
        var self = this;

        self.popcorn.pause();
        self.popcorn.currentTime(0);

        self.trigger("closeVideo");

        if(!self.videoShownOneTime) {
            //The menu character close the video for the tutorial
            self.videoShownOneTime = true;
        }
        else {
            //close video TODO FROM THE CHARACTER
            TweenLite.fromTo(".streetwalk-video", 0.7,
                {scaleY:1,scaleX:1},
                {scaleY:0,scaleX:0,
                    display:"none",
                    transformOrigin:"bottom 80%",
                    ease: Power1.easeInOut
            });
        }
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
      this.stopListening();
    }

  });

  return new VideoManagerView();
  
});


