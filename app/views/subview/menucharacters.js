define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'text!templates/streetwalk/menuCharactersViewTemplate.html',
        'text!templates/svg/svgMenuJaleTemplate.html',
        'text!templates/svg/svgMenuPajaritoTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                streetWalkMenuCharactersViewTemplate,
                svgMenuJaleTemplate,
                svgMenuPajaritoTemplate){

  var MenuCharactersView = Backbone.View.extend({

    events:{
        "click .character":"toggleMenu"
    },

    prepare : function() {
        var self = this;

        self.setElement(".streetwalk-menucharacters");

        self.render();
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(streetWalkMenuCharactersViewTemplate));
        
        self.$el.find(".streetwalk-menucharacter[data-character='jale']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='pajarito']").html(_.template(svgMenuPajaritoTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso3']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso4']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso5']").html(_.template(svgMenuJaleTemplate));

        TweenLite.set(".streetwalk-menucharacter[data-character='pajarito'] .character-unlocked", {scaleX:0.8,scaleY:0.8,transformOrigin:"center center"});


        // self.stickit(Progression.instance);
        Progression.instance.on("change", function() {
            console.log(_.keys(Progression.instance.changedAttributes()));
        });

        Progression.instance.get("charactersProgression").bind('change:pajarito.video1.locked', function(model, newValue){
                console.log("UNLOCKED PAJARITO");
                var character = "pajarito";
                var video = "video1";

                //if character not unlocked, unlock it
                if(!Progression.instance.get("charactersProgression").get("pajarito").characterUnlocked) {
                    Progression.instance.unlockCharacter(character);

                    //Launch animation unlockCharacter
                    self.unlockCharacter(character,function() {
                        self.unlockVideoAndOpen(character,video);
                    });
                }
                else {
                    //Launch animation unlockvideo
                    self.unlockVideoAndOpen(character,video);
                }

                self.listenToOnce(self,"closeVideo",function() {
                    self.closeVideo(character,video);
                });

        });
    },

    unlockVideoAndOpen: function(character, video) {
        var self = this;
        var tl = new TimelineLite();

        var elem = $(".streetwalk-menucharacter[data-character='" + character + "'] ." + video);
        var elemProperties = $(elem)[0].getBoundingClientRect();

        var Xposition = elemProperties.left + elemProperties.width/2;
        var Yposition = elemProperties.top + elemProperties.height/2;

        //Open menu
        tl.call(self.openMenu,[character],self)
              //Unlock video
              .to(".streetwalk-menucharacter[data-character="+ character +"] ." + video + "locked", 1, {scaleX:5,scaleY:5,opacity:0,transformOrigin:"center center",ease:Power2.easeIn})
              .fromTo(".streetwalk-menucharacter[data-character="+ character +"] ." + video, 1, {scaleX:0.8,scaleY:0.8},{scaleX:1,scaleY:1,transformOrigin:"center center",ease:Back.easeOut.config(3)},"-=0.5")
              //open video
              .fromTo(".streetwalk-video", 1,
                {scaleY:0,scaleX:0,display:"block"},
                {scaleY:1,scaleX:1,
                    transformOrigin:Xposition+"px "+Yposition+"px",
                    ease: Power1.easeInOut
               },"-=0.5");

    },

    closeVideo: function(character, video) {

        var elem = $(".streetwalk-menucharacter[data-character='" + character + "'] ." + video);
        var elemProperties = $(elem)[0].getBoundingClientRect();

        var Xposition = elemProperties.left + elemProperties.width/2;
        var Yposition = elemProperties.top + elemProperties.height/2;

        TweenLite.fromTo(".streetwalk-video", 1,
                {scaleY:1,scaleX:1,display:"block"},
                {scaleY:0,scaleX:0,
                    transformOrigin:Xposition+"px "+Yposition+"px",
                    ease: Power1.easeInOut
               });

    },

    unlockCharacter: function(character,callBackEnd) {
        var tl = new TimelineLite({onComplete:callBackEnd});
        //Discover character
        tl.to(".streetwalk-menucharacter[data-character='" + character+ "'] .character-locked", 1, {scaleX:5,scaleY:5,opacity:0,transformOrigin:"center center",ease:Power2.easeIn,
            onComplete: function() {
                $(".streetwalk-menucharacter[data-character='" + character+ "'] .character-locked").hide();
            }
          })
          .to(".streetwalk-menucharacter[data-character='" + character+ "'] .character-unlocked", 0.5,{scaleX:1,scaleY:1,transformOrigin:"center center",ease:Power2.easeIn},"-=0.5");
 
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

    openMenu: function(character,callBackMenuOpen) {
        var self = this;

        if(self.isOpening) {
            return;
        }

        self.isOpening = true;

        self.closeMenu();
        var submenu = self.$el.find(".streetwalk-menucharacter[data-character='" + character + "']").find(".submenu");
        submenu.attr("data-state","open");
        TweenLite.fromTo(submenu, 0.5, {scaleY:0,scaleX:0,transformOrigin:"right bottom",ease: Back.easeOut},{scaleY:1,scaleX:1,transformOrigin:"right bottom",ease: Back.easeOut,onComplete:function() {
            self.isOpening = false;
            if(callBackMenuOpen) { callBackMenuOpen(); }
        }});
    },

    closeMenu: function(skipAnimation) {
        var self = this;

        var submenu = self.$el.find(".submenu[data-state='open']");

        if(skipAnimation) {
            submenu.attr("data-state","closed");
            return;
        }

        if(self.isClosing) {
            return;
        }

        self.isClosing = true;

        TweenLite.fromTo(submenu, 0.5, {scaleY:1,scaleX:1,transformOrigin:"right bottom"},{scaleY:0,scaleX:0,transformOrigin:"right bottom",onComplete: function() {
            submenu.attr("data-state","closed");
            self.isClosing = false;
        }});
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new MenuCharactersView();
  
});


