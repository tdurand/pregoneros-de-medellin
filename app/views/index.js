define(['jquery',
        'underscore',
        'backbone',
        'utils/Localization',
        'models/Sounds',
        'views/usermanager',
        'text!templates/index/indexViewTemplate.html',
        'text!templates/index/indexMenuViewTemplate.html',
        'text!templates/index/indexBtnEnterViewTemplate.html'
        ],
function($, _, Backbone,
                    Localization,
                    Sounds,
                    UserManagerView,
                    indexViewTemplate,
                    indexMenuViewTemplate,
                    indexBtnEnterViewTemplate){

  var IndexView = Backbone.View.extend({

    el:"#index",

    events:{
        "click .menu-btnlogin":"displayLogin",
        "click .menu-btnlogout":"logout",
        "click .toggle-sounds":"toggleSounds",
        "change .language-selection":"changeLanguage"
    },

    prepare:function() {

        var self = this;

        if(_.isUndefined(Localization.STR)) {

            self.listenToOnce(Localization,"STRLoaded", function() {
                self.render();
            });
        }
        else {
            self.render();
        }

        if(!Sounds.userMuted) {
            Sounds.playSoundHome();
        }

        //EVENT
        self.listenTo(UserManagerView,"loginStatusChanged", function() {
            self.renderMenu();
            self.renderStartButton();
        });

        //SOUNDS
        self.listenTo(Sounds,"mute",function() {
            self.$el.find(".toggle-sounds").attr("data-state","muted");
        });

        self.listenTo(Sounds,"unmute",function() {
            self.$el.find(".toggle-sounds").attr("data-state","normal");
        });

    },

    render:function() {

        var self = this;

        self.$el.html(_.template(indexViewTemplate)({
            STR: Localization.STR
        }));

        videojs("video-landing").ready(function(){
          self.player = this;

          self.player.on("loadeddata",function() {
              self.player.off("loadeddata");
              self.resizeBackgroundVideo();
              self.player.play();
              $(".landingpage-video-frame").css("z-index",-6);
          });
        });

        //Prefetch image loading
        $.preloadImages = function() {
          for (var i = 0; i < arguments.length; i++) {
            $("<img />").attr("src", arguments[i]);
          }
        };

        $.preloadImages("images/loadingbackground.jpg");

        self.renderMenu();
        self.renderStartButton();

    },

    renderMenu: function() {
        var self = this;

        self.$el.find(".menu").html(_.template(indexMenuViewTemplate)({
            loginStatus: UserManagerView.status,
            lang: Localization.translationLoaded,
            STR: Localization.STR
        }));
    },

    renderStartButton: function() {
        var self = this;

        self.$el.find(".description-btnenter").html(_.template(indexBtnEnterViewTemplate)({
            loginStatus: UserManagerView.status,
            translationLoaded: Localization.translationLoaded,
            STR: Localization.STR
        }));
    },

    //See this hack: http://jsfiddle.net/6qBUK/4/
    resizeBackgroundVideo : function() {

        var self = this;

        var mainContainer = self.$el.find(".main");
        var videoContainer = self.$el.find(".landingpage-video");
        var videoIframe = self.$el.find(".landingpage-video .video-js");

        var ratio = 9/16;

        var width = mainContainer.width();
        var height = (width * ratio);

        $(videoIframe).width(width+"px");
        $(videoIframe).height(height+"px");
        $(videoIframe).css("marginTop","-3.278%");

        $(videoContainer).height(window.innerHeight);//0.88 was the magic number that you needed to shrink the height of the outer container with.

    },

    displayLogin: function(e) {
        e.preventDefault();
        UserManagerView.displayLogin();
    },

    logout: function(e) {
        e.preventDefault();
        UserManagerView.alertBeforeLogout();
    },

    changeLanguage: function() {
        var self = this;

        var lang = self.$el.find(".language-selection").val();

        Localization.init(lang);
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
      var self = this;
      //Clean
      self.undelegateEvents();
      self.player.dispose();
    }

  });

  return IndexView;
  
});


