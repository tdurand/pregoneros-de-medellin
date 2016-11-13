define(["backbone"],function(Backbone) {

    var CONSTANT = Backbone.Model.extend({

        initialize: function() {

            var self = this;

            self.set({
                videoToPlay: {
                    jale: {
                        video1:"https://player.vimeo.com/external/120590814.hd.mp4?s=dd914947e8fd3da5c8c85af6b2355a0f",
                        video2:"https://player.vimeo.com/external/120593060.hd.mp4?s=3337a52da878a7351ce701df94c3185b",
                        video3:"https://player.vimeo.com/external/120593061.hd.mp4?s=ade30b49360d46ceda33a05aa56ca56c"
                    },
                    pajarito: {
                        video1:"https://player.vimeo.com/external/121791163.hd.mp4?s=8da2ded0216bfa4a4e63c7565891cacb",
                        video2:"https://player.vimeo.com/external/121791164.hd.mp4?s=76694a41705ccd17c0c6191ecfc6d5fb",
                        video3:"https://player.vimeo.com/external/121791165.hd.mp4?s=aa2096a17085ddfdab4f81e7d0028ace",
                        videobonus:"https://player.vimeo.com/external/124885146.hd.mp4?s=cad07c1c46d5d50bb6477a7a4c9c25a4"
                    },
                    lider: {
                        video1:"https://player.vimeo.com/external/120198776.hd.mp4?s=43749e12765f9f1f60405c6728a25186",
                        video2:"https://player.vimeo.com/external/120198778.hd.mp4?s=63b50c5599a92752bdc4adcfb240d9be",
                        video3:"https://player.vimeo.com/external/120198779.hd.mp4?s=18838bd30821001809902718bac9571e"
                    },
                    gaucho: {
                        video1:"https://player.vimeo.com/external/122376488.hd.mp4?s=b2ef65f871f03847712716e0793e61c2",
                        video2:"https://player.vimeo.com/external/122378449.hd.mp4?s=6e0b40c7edc780b802c84613d5c24fee",
                        video3:"https://player.vimeo.com/external/122591730.hd.mp4?s=00d978024fa2d9dc743035e99f30f7ed"
                    },
                    papavanegas: {
                        video1:"https://player.vimeo.com/external/123199088.hd.mp4?s=bb11d30ed71e9e21811230e2f0e6cee8",
                        video2:"https://player.vimeo.com/external/124050297.hd.mp4?s=6ba8eec486c00b0fc51ce2a6b7559e94",
                        video3:"https://player.vimeo.com/external/124050298.hd.mp4?s=e02d24d469cd6cef9a4cb9786ff62fd1"
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