define(['jquery',
        'underscore',
        'backbone',
        "models/Progression",
        'utils/Logger',
        'utils/Constant',
        "utils/Localization"
        ],
function($, _, Backbone,
                Progression,
                LOGGER,
                CONSTANT,
                Localization){

  var TutorialView = Backbone.View.extend({

    helperMapShown: false,

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
                $(".hopscotch-bubble-close").hide();
                $(".streetwalk-tutorial-overlay").show();
                self.characterSignAnimation = TweenMax.fromTo(".character-sign",0.5,{scale:0.9},{scale:1.1,repeat:-1,yoyo:true});

                self.listenToOnce(self,"clickOnCharacter",function() {
                    $(".streetwalk-tutorial-overlay").addClass("step2");
                    $(".hopscotch-bubble:not(.hopscotch-callout)").addClass("hide");
                    self.characterSignAnimation.pause();
                });

                self.listenToOnce(self,"closeVideo",function() {
                    //Wait end of the animation
                    setTimeout(function() {
                        if(hopscotch.getState()) {
                            $(".hopscotch-bubble:not(.hopscotch-callout)").removeClass("hide");
                            hopscotch.nextStep();
                        }
                        else {
                            $(".hopscotch-bubble:not(.hopscotch-callout)").removeClass("hide");
                            hopscotch.startTour(self.tutorial,1);
                        }
                    },500);
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
                    $("body").css("overflow","hidden");

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

                    //Animate locked characters doesn't work on firefox
                    if(!CONSTANT.isFirefox) {
                        self.animationLockedCharacters = new TimelineMax({onComplete:function() {
                            TweenLite.to(".character-locked",0.5,{scaleX:1,scaleY:1});
                            TweenLite.to(".character-locked",0.5,{scaleX:1,scaleY:1});
                        }});
                        self.animationLockedCharacters.add(TweenLite.fromTo(".character-locked", 0.5, { scaleX:0.95,scaleY:0.95 },{scaleX:1.05,scaleY:1.05, transformOrigin:"center center",ease: Power0.easeNone}));
                        self.animationLockedCharacters.add(TweenLite.fromTo(".character-locked", 0.5, { scaleX:1.05,scaleY:1.05 },{scaleX:0.95,scaleY:0.95, transformOrigin:"center center",ease: Power0.easeNone}));
                        self.animationLockedCharacters.repeat(-1);
                    }
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

        if(wayName == "plazabotero-start-carabobo" && frameNb >= 110 && frameNb <= 120 && !Progression.instance.get("tutorialDone")) {
                self.trigger("pauseAnimating");
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

    showHelperLocker: function(character,video) {
            var self = this;
            //hide potential tooltip
            $(".hopscotch-bubble:not(.hopscotch-callout)").addClass("hide");

            //show tooltip to go to other street
            var calloutMgr = hopscotch.getCalloutManager();
            calloutMgr.createCallout({
                  id: 'unlock-video',
                  target: ".menucharacter-" + character + " ." + video +"-locked",
                  placement: 'top',
                  title: Localization.STR.tutorialDirectUnlockTitle,
                  content: Localization.STR.tutorialDirectUnlockDescription + '<p><button class="btn-gotostreet btn-secondary hopscotch-cta">'+ Localization.STR.tutorialDirectUnlockBtnGoDirectly + '</button> <button class="hopscotch-close hopscotch-nav-button hopscotch-cta">' + Localization.STR.tutorialDirectUnlockBtnPreferSearch +'</button></p>',
                  onShow: function() {
                     $(".streetwalk-tutorial-overlay").show();
                  },
                  onCTA: function() {
                    //in case we are in the tutorial
                    $(".streetwalk-tutorial-overlay").hide();
                    if(!Progression.instance.get("tutorialDone")) {
                        $(".hopscotch-bubble:not(.hopscotch-callout)").removeClass("hide");
                        if(hopscotch.getState()) {
                            hopscotch.nextStep();
                        }
                    }
                  },
                  onClose: function() {
                    $(".streetwalk-tutorial-overlay").hide();
                    if(!Progression.instance.get("tutorialDone")) {
                        $(".hopscotch-bubble:not(.hopscotch-callout)").removeClass("hide");
                        if(hopscotch.getState()) {
                            hopscotch.nextStep();
                        }
                    }

                  }

            });

            $(".btn-gotostreet").one("click",function() {
                $("body").css("overflow", "visible");
                var street = Progression.instance.getStreetWhereCharacterNotDiscovered(character);
                window.location.href = "#streetwalk/"+ street;
            });
    },

    showHelperMap: function() {
        var self = this;

        //hide potential tooltip
        $(".hopscotch-bubble:not(.hopscotch-callout)").addClass("hide");

        if(self.helperMapShown) {
            return;
        }

        //show tooltip to go to other street
        self.calloutMgr = hopscotch.getCalloutManager();
        self.calloutMgr.createCallout({
              id: 'enlarge-map',
              target: ".streetwalk-map-btnfullscreen",
              placement: 'top',
              xOffset:"-20",
              yOffset:"-20",
              title: Localization.STR.tutorialHelperMapTitle,
              content: Localization.STR.tutorialHelperMapDescription,
              onShow: function() {
                 $(".streetwalk-map-btnfullscreen").on("click", function() {
                    self.calloutMgr.removeCallout("enlarge-map");
                    self.helperMapShown = true;
                 });

                 $(document).on("scroll",function() {
                    $(document).off("scroll");
                    self.closeHelperMap();
                 });
              },
              onClose: function() {
                self.helperMapShown = true;
              }

        });

    },

    closeHelperMap: function() {
        var self = this;
        if(!self.helperMapShown) {
            self.helperMapShown = true;
            self.calloutMgr.removeCallout("enlarge-map");
        }
    },

    endTutorial: function() {
        var self = this;

        Progression.instance.set("tutorialDone",true);
        self.stopListening();
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


