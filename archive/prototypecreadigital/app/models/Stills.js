define(['jquery',
        'underscore',
        'backbone',
        'models/Still'
        ],
function($, _, Backbone,
                Still){

  var Stills = Backbone.Collection.extend({

    model: Still,

    init:function(params) {
        var self = this;

        self.nbImages = params.nbStills;
        self.pathToStills = params.pathToStills;

        self.nbImgLoaded = 0;
        self.pourcentageLoaded = 0;
        self.loadingStopped = false;
        self.stillLoaded = [];
    },

    fetch: function() {
        var self = this;

        var accurate = 5;

        //TODO : better progressive loading, populate first frames first
        $.each([20,10,5,2,1], function(index, val) {

            for (var i = 0; i <= self.nbImages; i+=val) {

                if(self.loadingStopped) {
                    break;
                }

                //If still isn't yet loaded
                if(self.get(i) === undefined) {

                    var still = new Still({
                        id:i,
                        // srcLowRes:"http://tdurand.github.io/scrollingvideo/"+self.pathToStills+"way"+self.lpad(i, 3)+".jpg",
                        // srcHighRes:"http://tdurand.github.io/scrollingvideo/"+self.pathToStills+"way"+self.lpad(i, 3)+".jpg"
                        srcLowRes:self.pathToStills+"way"+self.lpad(i, 3)+".jpg",
                        srcHighRes:self.pathToStills+"/highres/way"+self.lpad(i, 3)+".jpg"
                    });

                    still.on("imgloaded", function() {
                        this.loaded = true;
                        self.stillLoaded.push(this.id);
                        self.nbImgLoaded++;
                        self.pourcentageLoaded = Math.floor(self.nbImgLoaded*accurate/(self.nbImages+1)*100);
                        self.trigger("updatePourcentageLoaded");

                        if(self.nbImgLoaded == parseInt(self.nbImages/accurate,10)) {
                            self.trigger("loadingFinished");
                        }
                    });

                    self.add(still);

                }
                
            }
             
        });
    },

    lpad: function(value, padding) {
        var zeroes = new Array(padding+1).join("0");
        return (zeroes + value).slice(-padding);
    },

    clear: function() {
        self = this;
        self.loadingStopped = true;
        window.stop();
        _.each(self.models,function(still) {
            self.remove(still);
            //still.clear();
        });

        self.stillLoaded = [];
    }

    

  });

  return Stills;
  
});


