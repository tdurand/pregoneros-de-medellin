define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'text!templates/streetwalk/menuCharactersViewTemplate.html',
        'text!templates/svg/svgMenuJaleTemplate.html',
        'text!templates/svg/svgMenuPajaritoTemplate.html',
        'text!templates/svg/svgMenuLiderTemplate.html',
        'text!templates/svg/svgMenuGauchoTemplate.html',
        'text!templates/svg/svgMenuPapavanegasTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                streetWalkMenuCharactersViewTemplate,
                svgMenuJaleTemplate,
                svgMenuPajaritoTemplate,
                svgMenuLiderTemplate,
                svgMenuGauchoTemplate,
                svgMenuPapavanegasTemplate){

  var MenuCharactersView = Backbone.View.extend({

    events:{
        "click .character":"toggleMenu",
        "click .btn-close":"toggleMenu",
        "click .video":"clickOnMenu"
    },

    firstRender: true,

    prepare : function(VideoManagerView) {
        var self = this;

        self.setElement(".streetwalk-menucharacters");

        self.VideoManagerView = VideoManagerView;

        self.render();

        if(self.firstRender) {
            self.initListeners();
            self.firstRender = false;
        }
    },

    initListeners: function() {
        var self = this;

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:pajarito.video1.locked', function(model, newValue){
                var character = "pajarito";
                var video = "video1";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:pajarito.video2.locked', function(model, newValue){
                var character = "pajarito";
                var video = "video2";
                self.unlock(character,video);
        });
        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:pajarito.video3.locked', function(model, newValue){
                this.unbind();
                var character = "pajarito";
                var video = "video3";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:jale.video1.locked', function(model, newValue){
                var character = "jale";
                var video = "video1";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:jale.video2.locked', function(model, newValue){
                var character = "jale";
                var video = "video2";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:jale.video3.locked', function(model, newValue){
                var character = "jale";
                var video = "video3";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:lider.video1.locked', function(model, newValue){
                var character = "lider";
                var video = "video1";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:lider.video2.locked', function(model, newValue){
                var character = "lider";
                var video = "video2";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:lider.video3.locked', function(model, newValue){
                var character = "lider";
                var video = "video3";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:gaucho.video1.locked', function(model, newValue){
                var character = "gaucho";
                var video = "video1";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:gaucho.video2.locked', function(model, newValue){
                var character = "gaucho";
                var video = "video2";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:gaucho.video3.locked', function(model, newValue){
                var character = "gaucho";
                var video = "video3";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:papavanegas.video1.locked', function(model, newValue){
                var character = "papavanegas";
                var video = "video1";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:papavanegas.video2.locked', function(model, newValue){
                var character = "papavanegas";
                var video = "video2";
                self.unlock(character,video);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:papavanegas.video3.locked', function(model, newValue){
                var character = "papavanegas";
                var video = "video3";
                self.unlock(character,video);
        });
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(streetWalkMenuCharactersViewTemplate));
        
        self.$el.find(".streetwalk-menucharacter[data-character='jale']").html(_.template(svgMenuJaleTemplate)({
            state : Progression.instance.get("charactersProgression").get("jale")
        }));
        self.$el.find(".streetwalk-menucharacter[data-character='pajarito']").html(_.template(svgMenuPajaritoTemplate)({
            state : Progression.instance.get("charactersProgression").get("pajarito")
        }));
        self.$el.find(".streetwalk-menucharacter[data-character='lider']").html(_.template(svgMenuLiderTemplate)({
            state : Progression.instance.get("charactersProgression").get("gaucho")
        }));
        self.$el.find(".streetwalk-menucharacter[data-character='gaucho']").html(_.template(svgMenuGauchoTemplate)({
            state : Progression.instance.get("charactersProgression").get("lider")
        }));
        self.$el.find(".streetwalk-menucharacter[data-character='papavanegas']").html(_.template(svgMenuPapavanegasTemplate)({
            state : Progression.instance.get("charactersProgression").get("papavanegas")
        }));

        self.updateMenuCharactersStates();
    },

    unlock: function(character,video) {
        var self = this;

        //if character not unlocked, unlock it
        if(Progression.instance.get("charactersProgression").get(character+".character.locked")) {
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

    },

    updateMenuCharactersStates: function() {
        var self = this;

        _.each(Progression.instance.get("charactersProgression").attributes, function(characterData, characterName) {

            var domElement = $(".streetwalk-menucharacter[data-character='" + characterName + "']");

            _.each(characterData,function(menuElement,menuElementName) {

                if(!menuElement.locked) {
                    domElement.find("." + menuElementName + "-locked").hide();
                }

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
              .to(".streetwalk-menucharacter[data-character="+ character +"] ." + video + "-locked", 1, {scaleX:5,scaleY:5,opacity:0,transformOrigin:"center center",display:"none",ease:Power2.easeIn})
              .fromTo(".streetwalk-menucharacter[data-character="+ character +"] ." + video, 1, {scaleX:0.8,scaleY:0.8,display:"block"},{scaleX:1,scaleY:1,transformOrigin:"center center",ease:Back.easeOut.config(3)},"-=0.5")
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
        tl.to(".streetwalk-menucharacter[data-character='" + character+ "'] .character-locked", 1, {scaleX:5,scaleY:5,opacity:0,transformOrigin:"center center",display:"none",ease:Power2.easeIn})
          .to(".streetwalk-menucharacter[data-character='" + character+ "'] .character-unlocked", 0.5,{scaleX:1,scaleY:1,transformOrigin:"center center",ease:Power2.easeIn},"-=0.5");
        //Change state
        $(".streetwalk-menucharacter[data-character='" + character + "'] .character-unlocked").attr("data-state","unlocked");


    },

    toggleMenu: function(e) {
        var self = this;

        console.log("toggle menu");
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
        var menu = self.$el.find(".streetwalk-menucharacter[data-character='" + character + "']");
        var submenu = self.$el.find(".streetwalk-menucharacter[data-character='" + character + "']").find(".submenu");
        menu.attr("data-state","open");
        submenu.attr("data-state","open");
        TweenLite.fromTo(submenu, 0.5, {scaleY:0,scaleX:0,transformOrigin:"right bottom",ease: Back.easeOut},{scaleY:1,scaleX:1,transformOrigin:"right bottom",ease: Back.easeOut,onComplete:function() {
            self.isOpening = false;
            if(callBackMenuOpen) { callBackMenuOpen(); }
        }});
    },

    closeMenu: function(skipAnimation) {
        var self = this;

        var submenu = self.$el.find(".submenu[data-state='open']");
        var menu = self.$el.find(".streetwalk-menucharacter[data-state='open']");

        if(skipAnimation) {
            submenu.attr("data-state","closed");
            menu.attr("data-state","closed");
            return;
        }

        if(self.isClosing) {
            return;
        }

        self.isClosing = true;

        TweenLite.fromTo(submenu, 0.5, {scaleY:1,scaleX:1,transformOrigin:"right bottom"},{scaleY:0,scaleX:0,transformOrigin:"right bottom",onComplete: function() {
            submenu.attr("data-state","closed");
            menu.attr("data-state","closed");
            self.isClosing = false;
        }});
    },

    clickOnMenu: function(e) {
        var self = this;

        var type = $(e.currentTarget).attr("data-type");
        var content = $(e.currentTarget).attr("data-content");
        var character = $(e.currentTarget).attr("data-character");

        if(type == "video") {
            //open video
            self.VideoManagerView.initSpecificVideo(character, content);
            self.VideoManagerView.showVideo();
        }
        else {
            //locker
            //show tooltip to go to other street
            var calloutMgr = hopscotch.getCalloutManager();
            calloutMgr.createCallout({
                  id: 'unlock-video',
                  target: ".menucharacter-" + character + " ." + content +"-locked",
                  placement: 'top',
                  title: 'Bloqueado',
                  content: 'Para desbloquear, encontra a '+ character +' las otras calles, o si quieres, te podemos llevar hasta allá !'
                            +'<p><button class="btn-gotostreet btn-secondary hopscotch-cta">Llevame</button> <button class="hopscotch-close hopscotch-nav-button hopscotch-cta">Prefiero buscar</button></p>',
                  onShow: function() {
                     $(".streetwalk-tutorial-overlay").show();
                  },
                  onCTA: function() {
                    //in case we are in the tutorial
                    $(".streetwalk-tutorial-overlay").hide();
                  },
                  onClose: function() {
                    $(".streetwalk-tutorial-overlay").hide();
                  }

            });

            $(".btn-gotostreet").one("click",function() {
                $("body").css("overflow", "visible");
                var street = Progression.instance.getStreetWhereCharacterNotDiscovered(character);
                window.location.href = "#streetwalk/"+ street;
            });
        }
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
      this.stopListening();
    }

  });

  return new MenuCharactersView();
  
});


