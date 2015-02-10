define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'views/usermanager',
        'text!templates/streetwalk/menu/menuStreetWalkViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                UserManagerView,
                menuStreetWalkViewTemplate){

  var MenuStreetWalkView = Backbone.View.extend({

    menuOpen: false,

    events:{
        "click .streetwalk-menubottom-btnlogin":"displayLogin",
        "click .streetwalk-menubottom-btnlogout":"logout"
    },

    prepare : function() {
        var self = this;

        //refresh el, element inserted after in the DOM
        self.setElement(".streetwalk-menubottom");

        self.render();

        //init events (outside menu $el), btn to open menu
        $(".streetwalk-btnmenu").on("click", function() {
            self.toggleMenu();
        });

        //render again menu on login status change
        self.listenTo(UserManagerView,"loginStatusChanged",function() {
            self.render();
        });
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(menuStreetWalkViewTemplate,{
            loginStatus: UserManagerView.status
        }));
    },

    toggleMenu: function() {
        var self = this;

        var elem = $(".streetwalk-bottombar");

        if(self.menuOpen) {
            self.menuOpen = false;
            TweenLite.to(elem, 0.5, { bottom:0 });
        }
        else {
            self.menuOpen = true;
            TweenLite.fromTo(elem, 0.5, { bottom:0 },{bottom:"5%"});
        }

        
    },

    displayLogin: function() {
        var self = this;

        UserManagerView.displayLogin();
    },

    logout: function() {
        UserManagerView.logout();
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new MenuStreetWalkView();
  
});


