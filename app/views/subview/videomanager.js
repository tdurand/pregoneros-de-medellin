define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'utils/Localization',
        'utils/Constant',
        'text!templates/streetwalk/videoViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Localization,
                CONSTANT,
                videoViewTemplate){

  var VideoManagerView = Backbone.View.extend({

    events:{
        "click .streetwalk-video-btnclose":"closeVideo"
    },

    videoShownOneTime: false,
    videoCharacter:"",
    videoName:"",
    videoId: null,
    playerReady: false,
    currentWayVideoInitialized:false,
    currentWayVideo:undefined,


    prepare : function(Progression) {
        var self = this;

        self.Progression = Progression;

        self.setElement(".streetwalk-video");
    },

    initNextCharacterVideo: function(characterName, wayName) {
        var self = this;

        var video = self.Progression.instance.nextVideoToPlay(characterName, wayName);

        video.videoCharacter = characterName;

        self.initVideo(video);
        self.currentWayVideo = video;
        self.currentWayVideoInitialized = true;
   },

   initSpecificVideo: function(characterName, video) {
       var self = this;

       var id = CONSTANT.get("videoToPlay")[characterName][video];
       
       var videoToInit = {
            videoName : video,
            videoId : id,
            videoCharacter : characterName
       };

       self.initVideo(videoToInit);
       self.currentWayVideoInitialized = false;
   },

   initVideo: function(video) {
        var self = this;

        self.cleanPlayer();
        // Add video
        self.$el.find(".streetwalk-video-container").html(_.template(videoViewTemplate)({
                video: video,
                STR: Localization.STR,
                lang: Localization.translationLoaded
        }));

        videojs("video").ready(function(){
          self.$el.find(".streetwalk-video-btnclose").show();
          self.player = this;
          self.playerReady = true;
          self.trigger("playerReady");

            self.player.on("useractive", function() {
                self.$el.find(".streetwalk-video-btnclose").show();
            });

            self.player.on("userinactive", function() {
                self.$el.find(".streetwalk-video-btnclose").hide();
            });

            self.player.on("ended", function() {
                self.closeVideo();
            });
        });

        self.videoCharacter = video.videoCharacter;
        self.videoName = video.videoName;
        self.videoId = video.videoId;
   },

   showVideo: function(characterName, wayName) {
        var self = this;

        var someThingUnlocked = false;

        if(!_.isUndefined(characterName)) {
            //unlocknext item
            someThingUnlocked = self.Progression.instance.unlockNextItem(characterName,wayName);

            if(!self.currentWayVideoInitialized) {
                if(_.isUndefined(self.currentWayVideo)) {
                    self.currentWayVideo = self.Progression.instance.nextVideoToPlay(characterName, wayName);
                }
                self.initVideo(self.currentWayVideo);
                self.currentWayVideoInitialized = true;
            }
        }

        //if something unlocked, we open the menu and do the nice animation from the menucharacter.js view
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
        else {
            self.Progression.save();
        }

        self.trigger("showVideo");

        //close with escape key only if we are not in fullscreen
        if (!self.isFullScreen()) {
            $(document).one("keyup",function(e) {
                // escape key maps to keycode `27`
                if (e.keyCode == 27) {
                       self.closeVideo();
                }
            });
        }

        setTimeout(function() {
            if(self.playerReady) {
                self.player.play();
            }
        },2000);

    },

    isFullScreen: function() {
            if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement) {
                return true;
            }
            else {
                return false;
            }
    },

    closeVideo: function() {
        var self = this;
        
        self.player.pause();
        self.player.currentTime(0);

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

        //clean events
        $(document).off("keyup");
    },

    cleanPlayer: function() {
        var self = this;
        if(self.player) {
            self.player.dispose();
            self.playerReady = false;
            $(document).off("keyup");
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


