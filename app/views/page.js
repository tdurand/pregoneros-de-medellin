define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Sounds',
        'utils/Localization',
        'models/Progression',
        'text!templates/page/transmediaViewTemplate.html',
        'text!templates/page/musicViewTemplate.html',
        'text!templates/page/teamViewTemplate.html',
        'text!templates/page/makingOfViewTemplate.html',
        'text!templates/page/pressKitViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Sounds,
                Localization,
                Progression,
                TransmediaView,
                MusicView,
                TeamView,
                MakingOfView,
                PressKitView){

  var PageView = Backbone.View.extend({

    el:"#page",

    events:{
        "click .page-btnclose":"closeView",
        "click .toggle-sounds":"toggleSounds"
    },

    initialize : function() {
        var self = this;
        
    },

    render: function(pageName) {
        var self = this;

        if(pageName == "transmedia") {
            self.renderTransmediaView();
        }
        else if(pageName == "music") {
            self.renderMusicView();
        }
        else if(pageName == "team") {
            self.renderTeamView();
        }
        else if(pageName == "makingof") {
            self.renderMakingOfView();
        }
        else if(pageName == "presskit") {
            self.renderPressKitView();
        }
    },

    //Account renders
    renderTransmediaView: function() {
         var self = this;

         self.$el.html(_.template(TransmediaView)({
            STR : Localization.STR,
            lang: Localization.translationLoaded,
            soundsMuted: Sounds.isMuted()
         }));
    },

    renderMusicView: function(e) {
        var self = this;

        self.$el.html(_.template(MusicView)({
            STR : Localization.STR,
            lang: Localization.translationLoaded,
            soundsMuted: Sounds.isMuted()
         }));
    },

    renderTeamView: function() {
        var self = this;

         self.$el.html(_.template(TeamView)({
            STR : Localization.STR,
            lang: Localization.translationLoaded,
            soundsMuted: Sounds.isMuted()
         }));
    },

    renderMakingOfView: function(e) {
        var self = this;

        self.$el.html(_.template(MakingOfView)({
            STR : Localization.STR,
            lang: Localization.translationLoaded,
            soundsMuted: Sounds.isMuted()
         }));
    },

    renderPressKitView: function() {
        var self = this;

         self.$el.html(_.template(PressKitView)({
            STR : Localization.STR,
            lang: Localization.translationLoaded,
            soundsMuted: Sounds.isMuted()
         }));
    },

    closeView: function() {
        var self = this;

        self.$el.scrollTop(0);

        TweenLite.fromTo("#page",0.7,{y:"0%"},{y:"100%",ease:Power1.easeInOut,onComplete:function() {
            $("#page").addClass("hidden");
            self.trigger("closePage");
        }});

    },

    showView: function() {
        $("#page").removeClass("hidden");
        TweenLite.fromTo("#page",0.7,{y:"100%"},{y:"0%",ease:Power1.easeInOut,onComplete:function() {
            //FIX BUG CHROME FIXED POSITIONNING AND TRANSFORM:
            //http://stackoverflow.com/questions/19059662/css3-transform-reverts-position-fixed
            $("#page").css("transform","none");
        }});

    },

    toggleSounds: function(e) {
        var self = this;

        var state = $(e.currentTarget).attr("data-state");

        if(state == "normal") {
            $(e.currentTarget).attr("data-state","muted");
            Sounds.userMuted = true;
            Sounds.mute();
        }
        else {
            $(e.currentTarget).attr("data-state","normal");
            Sounds.userMuted = false;
            Sounds.unmute();
        }
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new PageView();
  
});


