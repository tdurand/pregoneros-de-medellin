define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'utils/Localization',
        'models/Progression',
        'text!templates/streetwalk/menu/menuStreetWalkViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Localization,
                Progression,
                menuStreetWalkViewTemplate){

  var MenuStreetWalkView = Backbone.View.extend({

    menuOpen: false,

    events:{
        "click .streetwalk-menubottom-btnlogin":"displayLogin",
        "click .streetwalk-menubottom-btnlogout":"logout",
        "change .language-selection":"changeLanguage",
        "click .streetwalk-menubottom-linkhome":"goToHome"
    },

    prepare : function(UserManagerView) {
        var self = this;

        self.UserManagerView = UserManagerView;

        //refresh el, element inserted after in the DOM
        self.setElement(".streetwalk-menubottom");

        self.render();

        //init events (outside menu $el), btn to open menu
        $(".streetwalk-btnmenu").on("click", function() {
            self.toggleMenu();
        });

        //render again menu on login status change
        self.listenTo(self.UserManagerView,"loginStatusChanged",function() {
            self.render();
        });
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(menuStreetWalkViewTemplate)({
            loginStatus: self.UserManagerView.status,
            lang: Localization.translationLoaded,
            STR: Localization.STR
        }));
    },

    toggleMenu: function() {
        var self = this;

        var elem = $(".streetwalk-bottombar");

        if(self.menuOpen) {
            self.$el.removeClass("open");
            TweenLite.to(elem, 0.5, { bottom:0 , onComplete: function() {
                self.menuOpen = false;
            }});
        }
        else {
            TweenLite.fromTo(elem, 0.5, { bottom:0 },{bottom:"5%",onComplete:function() {
                self.menuOpen = true;
                self.$el.addClass("open");
            }});
        }

        
    },

    displayLogin: function(e) {
        var self = this;
        e.preventDefault();
        self.UserManagerView.displayLogin();
    },

    logout: function(e) {
         var self = this;
         e.preventDefault();
         self.UserManagerView.alertBeforeLogout();
    },

    changeLanguage: function() {
        var self = this;

        self.trigger("changeLanguage");

        var lang = self.$el.find(".language-selection").val();

        Localization.init(lang);
    },

    goToHome: function() {
        var self = this;
        Progression.instance.isFirstLoad = true;
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new MenuStreetWalkView();
  
});


