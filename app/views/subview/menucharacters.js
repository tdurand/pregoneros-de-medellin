define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'text!templates/streetwalk/menuCharactersViewTemplate.html',
        'text!templates/svg/svgMenuJaleTemplate.html',
        'text!templates/svg/svgMenuPajaritoTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                streetWalkMenuCharactersViewTemplate,
                svgMenuJaleTemplate,
                svgMenuPajaritoTemplate){

  var MenuCharactersView = Backbone.View.extend({

    events:{
        "click .character":"toggleMenu"
    },

    bindings:{
            ".streetwalk-menucharacter[data-character='jale'] .character-unlocked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return Progression.instance.get("charactersProgression").jale.characterUnlocked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .character-locked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return !Progression.instance.get("charactersProgression").jale.characterUnlocked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .video1":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return !Progression.instance.get("charactersProgression").jale.video1.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .video1locked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return Progression.instance.get("charactersProgression").jale.video1.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .video2":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return !Progression.instance.get("charactersProgression").jale.video2.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .video2locked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return Progression.instance.get("charactersProgression").jale.video2.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .video3":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return !Progression.instance.get("charactersProgression").jale.video3.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='jale'] .video3locked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return Progression.instance.get("charactersProgression").jale.video3.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='pajarito'] .character-unlocked":{
                observe:"charactersProgression",
                // visible: true,
                onGet: function() {
                    var characterUnlocked = Progression.instance.get("charactersProgression").pajarito.characterUnlocked;
                    if(characterUnlocked) {
                        TweenLite.to(".front", 1.2, {rotationZ:180,transformOrigin:"top right",ease:Power2.easeOut,onComplete: function() { $(".front").hide(); } });
                    }
                    // return Progression.instance.get("charactersProgression").pajarito.characterUnlocked;
                }
            },
            ".streetwalk-menucharacter[data-character='pajarito'] .character-locked":{
                observe:"charactersProgression",
                // visible: true,
                onGet: function() {
                    return !Progression.instance.get("charactersProgression").pajarito.characterUnlocked;
                }
            },
            ".streetwalk-menucharacter[data-character='pajarito'] .video1":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return !Progression.instance.get("charactersProgression").pajarito.video1.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='pajarito'] .video1locked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return Progression.instance.get("charactersProgression").pajarito.video1.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='pajarito'] .video2":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return !Progression.instance.get("charactersProgression").pajarito.video2.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='pajarito'] .video2locked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return Progression.instance.get("charactersProgression").pajarito.video2.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='pajarito'] .video3":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return !Progression.instance.get("charactersProgression").pajarito.video3.locked;
                }
            },
            ".streetwalk-menucharacter[data-character='pajarito'] .video3locked":{
                observe:"charactersProgression",
                visible: true,
                onGet: function() {
                    return Progression.instance.get("charactersProgression").pajarito.video3.locked;
                }
            }
    },

    prepare : function() {
        var self = this;

        self.setElement(".streetwalk-menucharacters");

        self.render();
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(streetWalkMenuCharactersViewTemplate));
        
        self.$el.find(".streetwalk-menucharacter[data-character='jale']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='pajarito']").html(_.template(svgMenuPajaritoTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso3']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso4']").html(_.template(svgMenuJaleTemplate));
        self.$el.find(".streetwalk-menucharacter[data-character='perso5']").html(_.template(svgMenuJaleTemplate));

        TweenLite.set(".back", {scaleX:0.8,scaleY:0.8,transformOrigin:"center center"});


        // self.stickit(Progression.instance);
        Progression.instance.on("change", function() {
            console.log(_.keys(Progression.instance.changedAttributes()));
        });

        Progression.instance.get("charactersProgression").bind('change:pajarito.characterUnlocked', function(model, newValue){
            console.log("UNLOCKED PAJARITO");

                var tl = new TimelineLite();

                TweenLite.to(".back", 0.5,{scaleX:1,scaleY:1,transformOrigin:"center center",ease:Power2.easeIn});
            // setTimeout(function() {
                TweenLite.to(".front", 1, {rotationZ:150,transformOrigin:"top right",ease:Power2.easeIn,
                    onComplete: function() {
                        $(".front").hide();

                        
                    }
                });

                //start showing video 0.5s after (before other transition end) TODO use timeline to do that well
                setTimeout(function(){
                    $(".streetwalk-video").show();

                    var elem = $(".streetwalk-menucharacter[data-character='pajarito'] .character-unlocked");
                    var elemProperties = $(elem)[0].getBoundingClientRect();

                    var Xposition = elemProperties.left + elemProperties.width/2;
                    var Yposition = elemProperties.bottom + elemProperties.height/2;

                    TweenLite.fromTo(".streetwalk-video", 1,
                            {scaleY:0,scaleX:0},
                            {scaleY:1,scaleX:1,
                                transformOrigin:Xposition+"px "+Yposition+"px",
                                ease: Power2.easeIn,
                                onComplete:function() {
                                    console.log("end");

                                }
                        });
                },500);

                // self.openMenu("pajarito", function() {

                //             TweenLite.to(".streetwalk-menucharacter[data-character=pajarito] .video1locked", 1.2, {rotationY:100,transformOrigin:"right",ease:Power2.easeOut, onComplete:function() {
                //                 $(".streetwalk-menucharacter[data-character=pajarito] .video1locked").hide();
                //             }});

                //         });


            // },500);

            Progression.instance.get("charactersProgression").bind('change:pajarito.video1.locked', function(model, newValue){

                var elem = $(".streetwalk-menucharacter[data-character='pajarito'] .submenu .video1");
                var elemProperties = $(elem)[0].getBoundingClientRect();

                var Xposition = elemProperties.left + elemProperties.width/2;
                var Yposition = elemProperties.bottom + elemProperties.height/2;
                        var submenu = self.$el.find(".streetwalk-menucharacter[data-character='pajarito']").find(".submenu");
                        submenu.attr("data-state","open");

                        $(".streetwalk-video").css("z-index","15");

                        TweenLite.fromTo(".streetwalk-video", 1,
                            {scaleY:1,scaleX:1},
                            {scaleY:0.0,scaleX:0.0,
                                transformOrigin:Xposition+"px "+Yposition+"px",
                                ease: Power2.easeOut,
                                onComplete:function() {
                                    console.log("end");
                                    // self.openMenu("pajarito", function() {

                                        // TweenLite.to(".streetwalk-menucharacter[data-character=pajarito] .video1locked", 1, {rotationY:100,transformOrigin:"right",ease:Power2.easeOut, onComplete:function() {
                                        //     $(".streetwalk-menucharacter[data-character=pajarito] .video1locked").hide();
                                        // }});

                                    // });
                                }
                        });

                        TweenLite.to(".streetwalk-menucharacter[data-character=pajarito] .video1locked", 1, {rotationY:100,transformOrigin:"right",ease:Power2.easeIn, onComplete:function() {
                                $(".streetwalk-menucharacter[data-character=pajarito] .video1locked").hide();
                        }});

                        TweenLite.to(".streetwalk-menucharacter[data-character=pajarito] .video1locked .st6", 1, {scaleX:5,scaleY:5,opacity:0,transformOrigin:"center center",ease:Power2.easeIn});

            });
            
            console.log(newValue);
        });
    },

    toggleMenu: function(e) {
        var self = this;
        var dataCharacter = $(e.currentTarget).parents(".streetwalk-menucharacter").attr("data-character");

        if(self.$el.find(".submenu[data-state='open']").parents("[data-character='"+dataCharacter+"']").length < 1) {
            self.openMenu(dataCharacter);
        }
        else {
            self.closeMenu();
        }
    },

    openMenu: function(character,callBackMenuOpen) {
        var self = this;

        if(self.isOpening) {
            return;
        }

        self.isOpening = true;

        self.closeMenu();
        var submenu = self.$el.find(".streetwalk-menucharacter[data-character='" + character + "']").find(".submenu");
        submenu.attr("data-state","open");
        TweenLite.fromTo(submenu, 0.5, {scaleY:0,scaleX:0,transformOrigin:"right bottom",ease: Back.easeOut},{scaleY:1,scaleX:1,transformOrigin:"right bottom",ease: Back.easeOut,onComplete:function() {
            self.isOpening = false;
            callBackMenuOpen();
        }});
    },

    closeMenu: function(skipAnimation) {
        var self = this;

        var submenu = self.$el.find(".submenu[data-state='open']");

        if(skipAnimation) {
            submenu.attr("data-state","closed");
            return;
        }

        if(self.isClosing) {
            return;
        }

        self.isClosing = true;

        TweenLite.fromTo(submenu, 0.5, {scaleY:1,scaleX:1,transformOrigin:"right bottom"},{scaleY:0,scaleX:0,transformOrigin:"right bottom",onComplete: function() {
            submenu.attr("data-state","closed");
            self.isClosing = false;
        }});
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new MenuCharactersView();
  
});


