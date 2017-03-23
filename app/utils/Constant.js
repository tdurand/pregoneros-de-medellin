define(["backbone"],function(Backbone) {

    var CONSTANT = Backbone.Model.extend({

        initialize: function() {

            var self = this;

            self.set({
                videoToPlay: {
                    jale: {
                        video1:"https://images.pregonerosdemedellin.com/video/jale-01.mp4",
                        video2:"https://images.pregonerosdemedellin.com/video/jale-02.mp4",
                        video3:"https://images.pregonerosdemedellin.com/video/jale-03.mp4"
                    },
                    pajarito: {
                        video1:"https://images.pregonerosdemedellin.com/video/pajarito-01.mp4",
                        video2:"https://images.pregonerosdemedellin.com/video/pajarito-02.mp4",
                        video3:"https://images.pregonerosdemedellin.com/video/pajarito-03.mp4",
                        videobonus:"https://images.pregonerosdemedellin.com/video/videobonus.mp4"
                    },
                    lider: {
                        video1:"https://images.pregonerosdemedellin.com/video/lider-01.mp4",
                        video2:"https://images.pregonerosdemedellin.com/video/lider-02.mp4",
                        video3:"https://images.pregonerosdemedellin.com/video/lider-03.mp4"
                    },
                    gaucho: {
                        video1:"https://images.pregonerosdemedellin.com/video/gaucho-01.mp4",
                        video2:"https://images.pregonerosdemedellin.com/video/gaucho-02.mp4",
                        video3:"https://images.pregonerosdemedellin.com/video/gaucho-03.mp4"
                    },
                    papavanegas: {
                        video1:"https://images.pregonerosdemedellin.com/video/papavanegas-01.mp4",
                        video2:"https://images.pregonerosdemedellin.com/video/papavanegas-02.mp4",
                        video3:"https://images.pregonerosdemedellin.com/video/papavanegas-03.mp4"
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