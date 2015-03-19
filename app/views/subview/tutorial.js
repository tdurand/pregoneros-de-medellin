define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        "utils/Localization"
        ],
function($, _, Backbone,
                LOGGER,
                Localization){

  var TutorialView = Backbone.View.extend({

    tutorialDone : false,

    initialize : function() {
        var self = this;

        if(_.isUndefined(Localization.STR)) {
            return;
        }

        self.tutorial = {
          id: 'tutorial-firststreet',
          steps: [
            {
              id: 'tooltip-clickoncharacter',
              target: '.img-container',
              placement: 'left',
              title: Localization.STR.tutorialFirstStreetHelper1Title,
              content: Localization.STR.tutorialFirstStreetHelper1Description,
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
                target: '.menucharacter-jale .video3-locked',
                placement: 'left',
                title: Localization.STR.tutorialFirstStreetHelper2Title,
                content: Localization.STR.tutorialFirstStreetHelper2Description,
                showCTAButton:true,
                showNextButton:false,
                ctaLabel:Localization.STR.tutorialOkBtn,
                onShow:function() {
                    self.trigger("pauseAnimating");
                    document.body.style.overflowY = "hidden";

                    $(".streetwalk-textcharacter").css("z-index","-1");
                    $(".streetwalk-tutorial-overlay").show();

                    //Animate ? sign
                    self.animationInterrogativeSign = new TimelineMax({onComplete:function() {
                        TweenLite.to(".video3-locked .locker",0.5,{scaleX:1,scaleY:1});
                        TweenLite.to(".video2-locked .locker",0.5,{scaleX:1,scaleY:1});
                    }});
                    self.animationInterrogativeSign.add(TweenLite.fromTo(".video3-locked .locker", 0.5, { scaleX:0.7,scaleY:0.7 },{scaleX:1.3,scaleY:1.3, transformOrigin:"center center",ease: Power0.easeNone}));
                    self.animationInterrogativeSign.add(TweenLite.fromTo(".video3-locked .locker", 0.5, { scaleX:1.3,scaleY:1.3 },{scaleX:0.7,scaleY:0.7, transformOrigin:"center center",ease: Power0.easeNone}));
                    self.animationInterrogativeSign.add(TweenLite.fromTo(".video2-locked .locker", 0.5, { scaleX:0.7,scaleY:0.7 },{scaleX:1.3,scaleY:1.3, transformOrigin:"center center",ease: Power0.easeNone}),0);
                    self.animationInterrogativeSign.add(TweenLite.fromTo(".video2-locked .locker", 0.5, { scaleX:1.3,scaleY:1.3 },{scaleX:0.7,scaleY:0.7, transformOrigin:"center center",ease: Power0.easeNone}),0.5);
                    self.animationInterrogativeSign.repeat(-1);
                },
                onCTA: function() {
                    hopscotch.nextStep();
                    self.animationInterrogativeSign.repeat(1);
                }
            },
            {
                id: 'tooltip-characterfound',
                target: '.streetwalk-menucharacter[data-character="pajarito"] .character',
                placement: 'top',
                title: Localization.STR.tutorialFirstStreetHelper3Title,
                content: Localization.STR.tutorialFirstStreetHelper3Description,
                showCTAButton:true,
                showNextButton:false,
                ctaLabel:Localization.STR.tutorialOkBtn,
                onShow: function() {
                    $(".streetwalk-tutorial-overlay").removeClass("step2");
                    $(".streetwalk-tutorial-overlay").addClass("step3");

                    //Animate locked characters
                    self.animationLockedCharacters = new TimelineMax({onComplete:function() {
                        TweenLite.to(".character-locked",0.5,{scaleX:1,scaleY:1});
                        TweenLite.to(".character-locked",0.5,{scaleX:1,scaleY:1});
                    }});
                    self.animationLockedCharacters.add(TweenLite.fromTo(".character-locked", 0.5, { scaleX:0.95,scaleY:0.95 },{scaleX:1.05,scaleY:1.05, transformOrigin:"center center",ease: Power0.easeNone}));
                    self.animationLockedCharacters.add(TweenLite.fromTo(".character-locked", 0.5, { scaleX:1.05,scaleY:1.05 },{scaleX:0.95,scaleY:0.95, transformOrigin:"center center",ease: Power0.easeNone}));
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

        if(wayName == "plazabotero-start-carabobo" && frameNb >= 110 && frameNb <= 120 && !self.tutorialDone) {
                self.trigger("pauseAnimating");
                // document.body.style.overflowY = "hidden";
                $("body").css("overflow", "hidden");
                setTimeout(function() {
                    hopscotch.startTour(self.tutorial,0);
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
        $("body").css("overflow", "visible");
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


