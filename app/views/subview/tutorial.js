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
              title: 'Tutorial : Descubrir personaje',
              content: 'Clica en el botton alrededor del personaje para ver un video',
              showNextButton:false,
              zindex:29,
              onShow:function() {
                self.listenToOnce(self,"closeVideo",function() {
                    hopscotch.nextStep();
                });
              }
            },
            {
                id: 'tooltip-characterfound',
                target: '.menucharacter-pajarito .video2locked',
                placement: 'left',
                title: 'Tutorial : Sigues recoriendo',
                content: 'Descubriste limon pajarito, puedes seguir recoriendo, y encontrar a Limon Pajarito en otras calles !',
                showCTAButton:true,
                showNextButton:false,
                ctaLabel:"OK",
                onCTA: function() {
                    hopscotch.nextStep();
                }
            },
            {
                id: 'tooltip-characterfound',
                target: '.streetwalk-menucharacter[data-character="perso3"] .character',
                placement: 'top',
                title: 'Tutorial : Otros personajes',
                content: 'Te dejamos explorar, hay varios otros personajes por encontrar !',
                showCTAButton:true,
                showNextButton:false,
                ctaLabel:"OK",
                onCTA: function() {
                    self.tutorialDone = true;
                    self.trigger("startAnimating");
                    document.body.style.overflowY = "visible";
                    hopscotch.nextStep();
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
                    hopscotch.startTour(self.tutorial,0);
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


