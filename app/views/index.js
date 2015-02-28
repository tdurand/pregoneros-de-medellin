define(['jquery',
        'underscore',
        'backbone',
        'utils/Localization',
        'models/Sounds',
        'views/usermanager',
        'text!templates/index/indexViewTemplate.html',
        'text!templates/index/indexMenuViewTemplate.html',
        'text!templates/index/indexBtnEnterViewTemplate.html',
        'popcorn'
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

        Sounds.playSoundHome();

        //EVENT
        self.listenTo(UserManagerView,"loginStatusChanged", function() {
            self.renderMenu();
            self.renderStartButton();
        });

    },

    render:function() {

        var self = this;

        self.$el.html(_.template(indexViewTemplate)({
            STR: Localization.STR
        }));

        //Add video
        self.popcorn = Popcorn.vimeo( ".landingpage-video", "http://player.vimeo.com/video/114688319?loop=1" );
        self.popcorn.volume(0);
        self.popcorn.play();
        
        self.listenTo(self.popcorn,"play",function() {
            self.resizeBackgroundVideo();
            $(".landingpage-video-frame").css("z-index",-3);
            
        });

        //EVENT AVAILABLE: https://github.com/mozilla/popcorn-js/blob/master/players/vimeo/popcorn.vimeo.unit.js


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
            lang: Localization.translationLoaded
        }));
    },

    renderStartButton: function() {
        var self = this;

        self.$el.find(".description-btnenter").html(_.template(indexBtnEnterViewTemplate)({
            loginStatus: UserManagerView.status
        }));
    },

    //See this hack: http://jsfiddle.net/6qBUK/4/
    resizeBackgroundVideo : function() {

        var self = this;

        var mainContainer = self.$el.find(".main");
        var videoContainer = self.$el.find(".landingpage-video");
        var videoIframe = self.$el.find(".landingpage-video iframe");

        var ratio = 9/16;

        var width = mainContainer.width();
        var height = (width * ratio);

        $(videoIframe).width(width+"px");
        $(videoIframe).height(height+"px");
        $(videoIframe).css("marginTop","-3.278%");

        $(videoContainer).height(window.innerHeight);//0.88 was the magic number that you needed to shrink the height of the outer container with.

    },

    displayLogin: function() {
        UserManagerView.displayLogin();
    },

    logout: function() {
        UserManagerView.alertBeforeLogout();
    },

    changeLanguage: function() {
        var self = this;

        var lang = self.$el.find(".language-selection").val();

        Localization.init(lang);
    },

    onClose: function(){
      var self = this;
      //Clean
      self.undelegateEvents();
      self.popcorn.pause();
    }

  });

  return IndexView;
  
});


