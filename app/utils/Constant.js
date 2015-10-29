define(["backbone"],function(Backbone) {

    var CONSTANT = Backbone.Model.extend({

        initialize: function() {

            var self = this;

            self.set({
                videoToPlay: {
                    jale: {
                        video1:"videos/jale-01-1080.mp4",
                        video2:"videos/jale-01-1080.mp4",
                        video3:"videos/jale-01-1080.mp4"
                    },
                    pajarito: {
                        video1:"videos/pajarito-01-1080.mp4",
                        video2:"videos/pajarito-02.mp4",
                        video3:"videos/pajarito-03.mp4",
                        videobonus:"videos/videobonus.mp4"
                    },
                    lider: {
                        video1:"videos/lider-01-1080.mp4",
                        video2:"videos/lider-02.mp4",
                        video3:"videos/lider-03.mp4"
                    },
                    gaucho: {
                        video1:"videos/gaucho-01-1080.mp4",
                        video2:"videos/gaucho-02.mp4",
                        video3:"videos/gaucho-03.mp4"
                    },
                    papavanegas: {
                        video1:"videos/papavanegas-01-1080.mp4",
                        video2:"videos/papavanegas-02.mp4",
                        video3:"videos/papavanegas-03.mp4"
                    }
                }
            });


            //BROWSER
            self.isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
                // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
            self.isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
            self.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
                // At least Safari 3+: "[object HTMLElementConstructor]"
            self.isChrome = !!window.chrome && !self.isOpera;              // Chrome 1+
            self.isIE = /*@cc_on!@*/false || !!document.documentMode; // At least IE6


        }

    });

    return new CONSTANT();

});