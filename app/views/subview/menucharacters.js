define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'text!templates/streetwalk/menuCharactersViewTemplate.html',
        'text!templates/svg/svgMenuJaleTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                streetWalkMenuCharactersViewTemplate,
                svgMenuJaleTemplate){

  var MenuCharactersView = Backbone.View.extend({

    el:"#streetwalk-menucharacters",

    events:{
        "click .character":"characterClick"
    },

    initialize : function() {
        var self = this;

        self.render();
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(streetWalkMenuCharactersViewTemplate));
        
        self.$el.find(".streetwalk-menujale1").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menujale2").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menujale3").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menujale4").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menujale5").html(_.template(svgMenuJaleTemplate));
    },

    characterClick: function(e) {
        var dataCharacter = $(e.currentTarget).parents(".streetwalk-menucharacter").attr("data-character");

        $(".streetwalk-menucharacter streetwalk-"+dataCharacter).find(".submenu").addClass("open");
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return MenuCharactersView;
  
});


