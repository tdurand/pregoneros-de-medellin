define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'text!templates/streetwalk/menuCharactersViewTemplate.html',
        'text!templates/svg/svgMenuJaleTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                streetWalkMenuCharactersViewTemplate,
                svgMenuJaleTemplate){

  var MenuCharactersView = Backbone.View.extend({

    el:"#streetwalk-menucharacters",

    events:{
        "click .character":"toggleMenu"
    },

    bindings:{
            ".streetwalk-menucharacter[data-character='jale'] .character-unlocked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function(charactersProgression) {
                    return charactersProgression.jale.characterUnlocked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .character-locked":{
                observe:"charactersProgression",
                visible: function(val) { return val === false; },
                onGet: function(charactersProgression) {
                    return charactersProgression.jale.characterUnlocked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .video1":{
                observe:"charactersProgression",
                visible: true,
                onGet: function(charactersProgression) {
                    return charactersProgression.jale.video1Unlocked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .video1locked":{
                observe:"charactersProgression",
                visible: function(val) { return val === false; },
                onGet: function(charactersProgression) {
                    return charactersProgression.jale.video1Unlocked;
                }
            }
    },

    initialize : function() {
        var self = this;

        self.render();
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(streetWalkMenuCharactersViewTemplate));
        
        self.$el.find(".streetwalk-menucharacter[data-character='jale']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='pajarito']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso3']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso4']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso5']").html(_.template(svgMenuJaleTemplate));

        self.stickit(Progression);
    },

    toggleMenu: function(e) {
        var self = this;
        var dataCharacter = $(e.currentTarget).parents(".streetwalk-menucharacter").attr("data-character");

        if(self.$el.find(".submenu[data-state='open']").parents("[data-character='"+dataCharacter+"']").length < 1) {
            self.openMenu(dataCharacter);
        }
        else {
            self.closeMenu();
        }
    },

    openMenu: function(character) {
        var self = this;
        self.closeMenu();
        self.$el.find(".streetwalk-menucharacter[data-character='" + character + "']").find(".submenu").attr("data-state","open");
    },

    closeMenu: function() {
        var self = this;
        self.$el.find(".submenu[data-state='open']").attr("data-state","closed");
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return MenuCharactersView;
  
});


