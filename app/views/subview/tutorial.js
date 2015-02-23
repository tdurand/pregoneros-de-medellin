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
              title: 'TUTORIAL: PERSONAJE',
              content: 'Haz click en el botton alrededor del personaje para ver un video',
              showNextButton:false,
              onShow:function() {
                $(".streetwalk-tutorial-overlay").addClass("step1");
                $(".streetwalk-tutorial-overlay").show();
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
                target: '.menucharacter-pajarito .video3locked',
                placement: 'left',
                title: 'TUTORIAL: DESCUBRE MÁS',
                content: 'Puedes conocer mas sobre Pajarito, buscalo en otras calles !',
                showCTAButton:true,
                showNextButton:false,
                ctaLabel:"OK ▸",
                onClose: function() {
                  $(".streetwalk-tutorial-overlay").hide();
                  $(".streetwalk-textcharacter").css("z-index","5");
                },
                onShow:function() {
                    self.trigger("pauseAnimating");
                    document.body.style.overflowY = "hidden";

                    $(".streetwalk-textcharacter").css("z-index","-1");
                    $(".streetwalk-tutorial-overlay").show();
                    $(".streetwalk-tutorial-overlay").removeClass("step1");
                    $(".streetwalk-tutorial-overlay").addClass("step2");
                },
                onCTA: function() {
                    hopscotch.nextStep();
                }
            },
            {
                id: 'tooltip-characterfound',
                target: '.streetwalk-menucharacter[data-character="perso3"] .character',
                placement: 'top',
                title: 'TUTORIAL: OTROS PERSONAJES',
                content: 'Te dejamos explorar, hay varios otros personajes por encontrar !',
                showCTAButton:true,
                showNextButton:false,
                ctaLabel:"OK ▸",
                onShow: function() {
                    $(".streetwalk-tutorial-overlay").removeClass("step2");
                    $(".streetwalk-tutorial-overlay").addClass("step3");
                },
                onCTA: function() {
                    self.tutorialDone = true;
                    self.trigger("startAnimating");
                    document.body.style.overflowY = "visible";
                    hopscotch.nextStep();
                    $(".streetwalk-tutorial-overlay").hide();
                    $(".streetwalk-tutorial-overlay").removeClass("step3");
                    $(".streetwalk-textcharacter").css("z-index","5");
                },
                onClose: function() {

                }
            }
          ]
        };
    },

    update: function(wayName, frameNb) {
        var self = this;

        if(wayName == "carabobo-cl53-cl52" && frameNb >= 186 && frameNb <= 213 && !self.tutorialDone) {
                self.trigger("pauseAnimating");
                document.body.style.overflowY = "hidden";
                setTimeout(function() {
                    // hopscotch.startTour(self.tutorial,0);
                    hopscotch.listen("close",function() {
                        self.tutorialDone = true;
                        self.trigger("startAnimating");
                        document.body.style.overflowY = "visible";
                        $(".streetwalk-tutorial-overlay").hide();
                        $(".streetwalk-tutorial-overlay").removeClass("step2");
                        $(".streetwalk-tutorial-overlay").removeClass("step3");
                        $(".streetwalk-textcharacter").css("z-index","5");
                    });
                },200);
        }
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new TutorialView();
  
});


