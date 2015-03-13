define(function() {

    var CONSTANT = Backbone.Model.extend({

        initialize: function() {

            var self = this;

            self.set({
                videoToPlay: {
                    jale: {
                        video1:"120590814",
                        video2:"120593060",
                        video3:"120593061"
                    },
                    pajarito: {
                        video1:"121791163",
                        video2:"121791164",
                        video3:"121791165"
                    },
                    lider: {
                        video1:"120198776",
                        video2:"120198778",
                        video3:"120198779"
                    },
                    gaucho: {
                        video1:"115328392",
                        video2:"115325355",
                        video3:"115325356"
                    },
                    papavanegas: {
                        video1:"115328392",
                        video2:"115325355",
                        video3:"115325356"
                    }
                }
            });
        }

    });

    return new CONSTANT();

});