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
        "click .streetwalk-menubottom-loginbtn":"showLogin"
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
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(menuStreetWalkViewTemplate));
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

    showLogin: function() {
        var self = this;

        UserManagerView.showView();
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new MenuStreetWalkView();
  
});


