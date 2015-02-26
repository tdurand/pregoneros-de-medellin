define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'
        ],
function($, _, Backbone,
                LOGGER){

  var TutorialView = Backbone.View.extend({

    tutorialDone : false,

    initialize : function() {
        var self = this;

        self.tutorial = {
          id: 'tutorial-firststreet',
          steps: [
            {
              id: 'tooltip-clickoncharacter',
              target: '.img-container',
              placement: 'left',
              title: 'AYUDA: PERSONAJE',
              content: 'Haz click en el botton alrededor del personaje para ver un video',
              showNextButton:false,
              onShow:function() {
                $(".streetwalk-textcharacter").css("z-index","51");
                $(".streetwalk-tutorial-overlay").addClass("step1");
                $(".streetwalk-tutorial-overlay").show();

                self.listenToOnce(self,"clickOnCharacter",function() {
                    $(".streetwalk-tutorial-overlay").addClass("step2");
                });

                self.listenToOnce(self,"closeVideo",function() {
                    if(hopscotch.getState()) {
                        hopscotch.nextStep();
                    }
                    else {
                        hopscotch.startTour(self.tutorial,1);
                    }
                });
              }
            },
            {
                id: 'tooltip-characterfound',
                target: '.menucharacter-pajarito .video3-locked',
                placement: 'left',
                title: 'AYUDA: DESCUBRE MÁS',
                content: 'Puedes conocer mas sobre Pajarito, buscalo en otras calles !',
                showCTAButton:true,
                showNextButton:false,
                ctaLabel:"OK ▸",
                onShow:function() {
                    self.trigger("pauseAnimating");
                    document.body.style.overflowY = "hidden";

                    $(".streetwalk-textcharacter").css("z-index","-1");
                    $(".streetwalk-tutorial-overlay").show();

                    //Animate ? sign
                    self.animationInterrogativeSign = new TimelineMax({onComplete:function() {
                        TweenLite.to(".video3-locked .st6",0.5,{scaleX:1,scaleY:1});
                        TweenLite.to(".video2-locked .st6",0.5,{scaleX:1,scaleY:1});
                    }});
                    self.animationInterrogativeSign.add(TweenLite.fromTo(".video3-locked .st6", 0.5, { scaleX:0.7,scaleY:0.7 },{scaleX:1.3,scaleY:1.3, transformOrigin:"center center",ease: Power0.easeNone}));
                    self.animationInterrogativeSign.add(TweenLite.fromTo(".video3-locked .st6", 0.5, { scaleX:1.3,scaleY:1.3 },{scaleX:0.7,scaleY:0.7, transformOrigin:"center center",ease: Power0.easeNone}));
                    self.animationInterrogativeSign.add(TweenLite.fromTo(".video2-locked .st6", 0.5, { scaleX:0.7,scaleY:0.7 },{scaleX:1.3,scaleY:1.3, transformOrigin:"center center",ease: Power0.easeNone}),0);
                    self.animationInterrogativeSign.add(TweenLite.fromTo(".video2-locked .st6", 0.5, { scaleX:1.3,scaleY:1.3 },{scaleX:0.7,scaleY:0.7, transformOrigin:"center center",ease: Power0.easeNone}),0.5);
                    self.animationInterrogativeSign.repeat(-1);
                },
                onCTA: function() {
                    hopscotch.nextStep();
                    self.animationInterrogativeSign.repeat(1);
                }
            },
            {
                id: 'tooltip-characterfound',
                target: '.streetwalk-menucharacter[data-character="perso3"] .character',
                placement: 'top',
                title: 'AYUDA: OTROS PERSONAJES',
                content: 'Te dejamos explorar, hay varios otros personajes por encontrar !',
                showCTAButton:true,
                showNextButton:false,
                ctaLabel:"OK ▸",
                onShow: function() {
                    $(".streetwalk-tutorial-overlay").removeClass("step2");
                    $(".streetwalk-tutorial-overlay").addClass("step3");

                    //Animate locked characters
                    self.animationLockedCharacters = new TimelineMax({onComplete:function() {
                        TweenLite.to(".character-locked .st18",0.5,{scaleX:1,scaleY:1});
                        TweenLite.to(".character-locked .st18",0.5,{scaleX:1,scaleY:1});
                    }});
                    self.animationLockedCharacters.add(TweenLite.fromTo(".character-locked .st18", 0.5, { scaleX:0.95,scaleY:0.95 },{scaleX:1.05,scaleY:1.05, transformOrigin:"center center",ease: Power0.easeNone}));
                    self.animationLockedCharacters.add(TweenLite.fromTo(".character-locked .st18", 0.5, { scaleX:1.05,scaleY:1.05 },{scaleX:0.95,scaleY:0.95, transformOrigin:"center center",ease: Power0.easeNone}));
                    self.animationLockedCharacters.repeat(-1);
                },
                onCTA: function() {
                    hopscotch.endTour();
                }
            }
          ]
        };
    },

    update: function(wayName, frameNb) {
        var self = this;

        if(wayName == "carabobo-cl53-cl52" && frameNb >= 186 && frameNb <= 213 && !self.tutorialDone) {
                // self.trigger("pauseAnimating");
                // document.body.style.overflowY = "hidden";
                setTimeout(function() {
                    // hopscotch.startTour(self.tutorial,0);
                    hopscotch.listen("close",function() {
                        self.endTutorial();
                    });
                    hopscotch.listen("end",function() {
                        self.endTutorial();
                    });
                },200);
        }
    },

    endTutorial: function() {
        var self = this;

        self.tutorialDone = true;
        self.trigger("startAnimating");
        document.body.style.overflowY = "visible";
        $(".streetwalk-tutorial-overlay").hide();
        $(".streetwalk-tutorial-overlay").removeClass("step2");
        $(".streetwalk-tutorial-overlay").removeClass("step3");
        $(".streetwalk-textcharacter").css("z-index","14");
        
        if(self.animationLockedCharacters) {
            self.animationLockedCharacters.repeat(1);
        }

        if(self.animationInterrogativeSign) {
            self.animationInterrogativeSign.repeat(1);
        }
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new TutorialView();
  
});


