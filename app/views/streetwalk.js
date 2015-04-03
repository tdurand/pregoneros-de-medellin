define(['jquery',
    'underscore',
    'backbone',
    'models/Ways',
    'models/Sounds',
    'models/Progression',
    'utils/GeoUtils',
    'utils/LocalParams',
    'utils/Logger',
    'utils/Localization',
    'utils/MessagingManager',
    'views/subview/menucharacters',
    'views/subview/soundeditor',
    'views/subview/menustreetwalk',
    'views/subview/tutorial',
    'views/subview/map',
    'views/subview/videomanager',
    'views/usermanager',
    'text!templates/streetwalk/streetWalkViewTemplate.html',
    'text!templates/streetwalk/streetWalkLoadingViewTemplate.html',
    'text!templates/streetwalk/streetWalkLoadingSimpleViewTemplate.html',
    'text!templates/streetwalk/streetWalkChoosePathViewTemplate.html',
    'text!templates/svg/svgSignTopProgressTemplate.html',
    'text!templates/svg/svgSignTopAreaTemplate.html',
    'text!templates/svg/svgFramePajaritoTemplate.html',
    'text!templates/svg/svgFrameJaleTemplate.html',
    'text!templates/svg/svgFrameLiderTemplate.html',
    'text!templates/svg/svgFrameGauchoTemplate.html',
    'text!templates/svg/svgFramePapavanegasTemplate.html',
    'text!templates/svg/svgScrollToStart.html',
    'text!templates/svg/svgScrollOtherWay.html',
    'tweenmax',
    'mapbox'
    ],
    function($, _, Backbone,
        Ways,
        Sounds,
        Progression,
        GeoUtils,
        LocalParams,
        LOGGER,
        Localization,
        MessagingManager,
        MenuCharactersView,
        SoundEditorView,
        MenuStreetWalkView,
        TutorialView,
        MapView,
        VideoManagerView,
        UserManagerView,
        streetWalkViewTemplate,
        streetWalkLoadingViewTemplate,
        streetWalkLoadingSimpleViewTemplate,
        streetWalkChoosePathViewTemplate,
        svgSignTopProgressTemplate,
        svgSignTopAreaTemplate,
        svgFramePajaritoTemplate,
        svgFrameJaleTemplate,
        svgFrameLiderTemplate,
        svgFrameGauchoTemplate,
        svgFramePapavanegasTemplate,
        svgScrollToStart,
        svgScrollOtherSide){

      var StreetWalkView = Backbone.View.extend({

        el:"#streetwalk",
        elImg:"#streetwalk .streetwalkImg",

        currentPosition:0,
        bodyHeight:7000,
        fullscreen:false,

        tutorialDone: false,

        events:{
            "click .toggle-sounds ":"toggleSounds",
            "click .character-sign":"clickOnCharacter",
            "click .streetwalk-soundeditor-btnshow":"showSoundEditor"
        },
        
        initialize : function(params) {
            var self = this;

            self.wayName = params.wayName;
        },

        prepare:function() {

            var self = this;

            //Localization
            if(_.isUndefined(Localization.STR)) {

                self.listenToOnce(Localization,"STRLoaded", function() {
                    self.firstScroll = true;
                    self.loadPath();
                    self.renderLoading();
                    self.initArrowKeyBinding();
                    TutorialView.initialize();
                });
            }
            else {
                self.firstScroll = true;
                self.loadPath();
                self.renderLoading();
                self.initArrowKeyBinding();
                TutorialView.initialize();
            }

            //EVENTING
            
            //TUTORIAL
            self.listenTo(TutorialView,"pauseAnimating",function() {
                self.animating = false;
            });

            self.listenTo(TutorialView,"startAnimating",function() {
                self.animating = true;
                self.computeAnimation();
            });

            //Refresh helper STR
            self.listenTo(Localization,"STRChanged",function() {
                TutorialView.initialize();
            });


            self.listenToOnce(VideoManagerView,"closeVideo", function() {
                TutorialView.trigger("closeVideo");
                MenuCharactersView.trigger("closeVideo");
            });

            self.listenTo(self,"clickOnCharacter", function() {
                TutorialView.trigger("clickOnCharacter");
            });

            //MAP
            self.listenToOnce(MapView,"loaded", function() {
                MapView.update(self.way.wayPath[0]);
            });

            //USER MANAGER
            self.listenTo(UserManagerView,"progressFetched",function() {
                var lastStreet = Progression.instance.get("currentStreet");
                self.goToStreetName(lastStreet);
                MenuCharactersView.initListeners();
            });

            self.listenTo(UserManagerView,"beforeFetchProgress", function() {
                //Disable menucharacter events
                MenuCharactersView.stopListening();
            });

            self.listenTo(UserManagerView,"logOut",function() {
                self.goToStreetName("plazabotero-start-carabobo");
            });

            //PROGRESSION
            self.listenTo(Progression.instance,"change:nbItemUnlocked", function() {
                self.listenToOnce(VideoManagerView,"closeVideo",function() {
                    self.$el.find(".streetwalk-progress .nbStoriesUnlocked").text(Progression.instance.get("nbItemUnlocked"));
                });
            });

            //VIDEO MANAGER
            self.listenTo(VideoManagerView,"showVideo",function() {
                self.muteSounds();
            });

            self.listenTo(VideoManagerView,"closeVideo",function() {
                self.unmuteSounds();
            });

            //SOUNDS
            self.listenTo(Sounds,"mute",function() {
                self.$el.find(".toggle-sounds").attr("data-state","muted");
            });

            self.listenTo(Sounds,"unmute",function() {
                self.$el.find(".toggle-sounds").attr("data-state","normal");
            });

            //CHANGE LANGUAGE
            self.listenTo(Localization,"STRChanged", function() {
                self.renderUI();
            });

        },

        initArrowKeyBinding: function() {
            $(document).keydown(function(e) {
                switch(e.which) {
                    case 38: // up
                    window.scrollBy(0, 50);
                    break;

                    case 40: // down
                    window.scrollBy(0, -50);
                    break;

                    default: return; // exit this handler for other keys
                }
                e.preventDefault(); // prevent the default action (scroll / move caret)
            });
        },

        initScrollEventHandlers: function() {
            var self = this;

            window.scrollTo(0,5);

            var lastScrollTop = $(this).scrollTop();

            $(window).scroll(function(event){
               var st = $(this).scrollTop();
               if (st > lastScrollTop){
                   // downscroll code
                   if(lastScrollTop === 0) {
                        self.$el.find(".streetwalk-tutorial-scrollotherside-tooltip").hide();
                    }
               } else {
                  // upscroll code
                  if(st === 0) {
                     //display tooltip
                     self.$el.find(".streetwalk-tutorial-scrollotherside-tooltip").show();
                  }
               }
               lastScrollTop = st;
            });
        },

        renderUI: function() {
            var self = this;
            //reset map
            MapView.onClose();
            //Usefull when changing language
            self.pause();
            self.render();
            self.play();
        },

        renderLoading: function() {
            var self = this;

            self.$el.find(".streetwalk-chooseway-end-wrapper").hide();
            self.$el.find(".streetwalk-chooseway-start-wrapper").hide();
            
            if(Progression.instance.isFirstLoad) {

                Progression.instance.isFirstLoad = false;

                self.$el.html(_.template(streetWalkLoadingViewTemplate)({
                    STR: Localization.STR,
                    lang: Localization.translationLoaded
                }));
                self.$el.find(".streetwalk-loading").show();

                TweenLite.set(".loading-animation",{y:"+25%"});
                TweenLite.set("#carito",{opacity:0});

                //init svg element path
                self.pathLoading = $("#loadingLine");
                self.pathLoadingLength = self.pathLoading[0].getTotalLength();
                self.pathLoading.attr({
                    // Draw Path
                    "stroke-dasharray": self.pathLoadingLength + " " + self.pathLoadingLength,
                    "stroke-dashoffset": self.pathLoadingLength
                });


                self.carito = $("#carito");

                var tl = new TimelineMax({
                repeat:-1
                });
                tl.to("#waveright",0.5,{scaleX:1.2,scaleY:1.2,transformOrigin:"center center"});
                tl.to("#waveright",0.5,{scaleX:1,scaleY:1,transformOrigin:"center center"});
                tl.to("#waveleft",0.5,{scaleX:1.2,scaleY:1.2,transformOrigin:"center center"},0);
                tl.to("#waveleft",0.5,{scaleX:1,scaleY:1,transformOrigin:"center center"},0.5);

                var tl2 = new TimelineMax({
                });

                tl2.to(".headset",1,{opacity:0,transformOrigin:"center center"},5);
                tl2.to(".loading-animation",1,{y:"0%"},5);
                tl2.to("#carito",1,{opacity:1},5);


            }
            else {
                self.$el.find(".streetwalk-tutorial").hide();
                self.$el.find(".streetwalk-loading").html(_.template(streetWalkLoadingSimpleViewTemplate)({
                    STR: Localization.STR
                }));
                self.$el.find(".streetwalk-loading").show();

                console.log(self.$el.find(".streetwalk-loading"));

                self.pathLoading = $(".streetwalk-loading .loading-line");
                self.pathLoadingLength = self.pathLoading[0].getTotalLength();
                self.pathLoading.attr({
                    // Draw Path
                    "stroke-dasharray": self.pathLoadingLength + " " + self.pathLoadingLength,
                    "stroke-dashoffset": self.pathLoadingLength
                });

                MessagingManager.showEventualNextMessage();

                if(UserManagerView.isLogged()) {
                    self.showSyncingProgressMsg();
                }
            }

            window.scrollTo(0,5);

        },

    updateLoadingIndicator: function(pourcentage) {
        var self = this;

        //update svg animation
        var currentLoadingLength = pourcentage * self.pathLoadingLength / 100;

        if(pourcentage <= 100) {
            self.$el.find(".loadingIndicator").text(pourcentage);
            self.pathLoading.attr("stroke-dashoffset", self.pathLoadingLength-currentLoadingLength);
            
            if(self.carito) {
                self.carito.css("transform","translateX(" + currentLoadingLength + "px)");
            }
        }
    },

    render:function() {

        var self = this;

        //render first still
        self.currentStill = self.way.wayStills.first();
        var pathFirstStill = self.currentStill.get("srcLowRes");
        var soundsMuted = Sounds.isMuted();

        self.$el.html(_.template(streetWalkViewTemplate)({
            pathFirstStill:pathFirstStill,
            STR:Localization.STR,
            lang:Localization.translationLoaded,
            soundsMuted:soundsMuted
        }));

        if(Progression.instance.isFirstWay) {
            Progression.instance.isFirstWay = false;
            //Render tutorial
            self.$el.find(".streetwalk-tutorial").html(_.template(svgScrollToStart)({
                lang: Localization.translationLoaded
            }));
            self.$el.find(".streetwalk-tutorial-scrollotherside-tooltip").html(_.template(svgScrollOtherSide)({
                lang: Localization.translationLoaded
            }));
        }

        //Render top signs
        self.$el.find(".streetwalk-progress").html(_.template(svgSignTopProgressTemplate)({
            nbItemUnlocked: Progression.instance.get("nbItemUnlocked"),
            STR : Localization.STR
        }));
        self.$el.find(".streetwalk-area").html(_.template(svgSignTopAreaTemplate)({
            area:self.way.wayArea,
            STR : Localization.STR
        }));

        self.renderImgHighRes();

        //prefech stuff
        //Prefetch image loading
        $.preloadImages = function() {
          for (var i = 0; i < arguments.length; i++) {
            $("<img />").attr("src", arguments[i]);
        }
        };

        $.preloadImages("images/loading/background.png");

        //set right src for frame character
        if(!_.isUndefined(self.way.characterDefinition)) {
            self.$el.find(".img-container").html(_.template(self.getFrameTemplate(self.way.characterDefinition.name)));
        }

        MenuCharactersView.prepare(VideoManagerView);
        MenuStreetWalkView.prepare(UserManagerView);
        MapView.prepare(self.way.wayPath[self.currentStill.id],Ways);
        VideoManagerView.prepare(Progression);

        Progression.setCurrentStreet(self.way.wayName);

        self.adjustSizes();

        self.$el.find(".streetwalk-chooseway-end-wrapper").hide();
        self.$el.find(".streetwalk-chooseway-start-wrapper").hide();
    },

    getFrameTemplate : function(character) {
        var self = this;
        var template = "";

        if(character == "pajarito") {
            template = svgFramePajaritoTemplate;
        }
        else if(character == "jale"){
            template = svgFrameJaleTemplate;
        }
        else if(character == "gaucho"){
            template = svgFrameGauchoTemplate;
        }
        else if(character == "lider"){
            template = svgFrameLiderTemplate;
        }
        else {
            template = svgFramePapavanegasTemplate;
        }

        return template;
    },

    adjustSizes: function() {
        var self = this;

        MapView.adjustMapSizes();

        //Todo add handler on resize to execute this function
        var height = $(".streetwalk-menucharacters").height();
        $(".streetwalk-menucharacters").width(height*6);

        $(".streetwalk-menucharacters").width(height*6);
    },

    loadPath: function() {
        var self = this;

        self.way = Ways.where({ wayName : self.wayName})[0];

        self.way.fetch();

        self.listenTo(self.way,"updatePercentageLoaded", function() {
            self.updateLoadingIndicator(self.way.percentageLoaded);
        });

        self.listenToOnce(self.way,"loadingFinished", function() {
            self.animating = true;
            self.currentStill = self.way.wayStills.first();
            self.$el.css("height",self.computeBodyHeigh(self.way.wayLength)+"px");
            self.$el.find("#scrollToStartLoaded").show();
            self.$el.find("#scrollToStartLoading").hide();
            self.render();
            self.$el.find(".streetwalk-loading").hide();
            //TODO Sounds can be loaded after render....
            Sounds.fadeOutSoundHome();
            Sounds.updateSounds(self.way.wayPath[0]);

            //SPECIFIC SOUND EDITOR STUFF
            setTimeout(function() {
                self.soundEditorView = new SoundEditorView(self.way);
            },5000);
            // END SPECIFIC SOUND EDITOR STUFF

            self.computeAnimation(true);
            self.initScrollEventHandlers();

            self.scrollToStartAnimation();
        });

        self.listenToOnce(self.way,"loadingFinishedCompletely", function() {
            //if there is a character in this street
            if(self.way.isThereACharacter()) {
                VideoManagerView.initNextCharacterVideo(self.way.characterDefinition.name, self.way.wayName);
            }
        });
        
    },

    scrollToStartAnimation: function() {
        var tl = new TimelineMax({
            repeat:-1
        });
        tl.add( TweenLite.fromTo($(".frame1"), 0.2, {display:"block"},{display:"none"}));
        tl.add( TweenLite.fromTo($(".frame2"), 0.2, {display:"none"},{display:"block"}));
        tl.add( TweenLite.fromTo($(".frame2"), 0.2, {display:"block"},{display:"none"}));
        tl.add( TweenLite.fromTo($(".frame3"), 0.2, {display:"none"},{display:"block"}));
        tl.add( TweenLite.fromTo($(".frame3"), 0.2, {display:"block"},{display:"none"}));
        tl.add( TweenLite.fromTo($(".frame1"), 0.2, {display:"none"},{display:"block"}));

        tl.play();
    },

    renderImg: function(imgNb) {
        var self = this;

        LOGGER.debug("RENDER IMGNB" + imgNb);

        if(self.currentStill && self.currentStill.id == imgNb) {
            //no need to render again same still
            return;
        }

        self.currentStill = self.way.wayStills.get(imgNb);

        if(!self.currentStill.loaded) {
            LOGGER.debug("IMG NB NOT LOADED :" +imgNb);

            function sortNumber(a,b) {
              return a - b;
            }

            //Get closest still loaded : TODO FIND THE BEST ALGORITHM, this one is not so optimized and insert the still in the array
            self.currentStill = self.way.wayStills.get(self.way.wayStills.stillLoaded.push( imgNb ) && self.way.wayStills.stillLoaded.sort(sortNumber)[ self.way.wayStills.stillLoaded.indexOf( imgNb ) - 1 ]);


            LOGGER.debug("Load IMG NB instead:" +self.currentStill.id);
        }

        $(self.elImg).attr("src", self.currentStill.get("srcLowRes"));

    },

    renderImgHighRes: function() {
        var self = this;

        LOGGER.debug("HIGH RES RENDER");

        self.currentStill.loadHighRes(function() {
            $(self.elImg).attr("src", self.currentStill.get("srcHighRes"));
        });

    },

    renderElements: function(imgNb) {

        var self = this;

        if(self.firstScroll && imgNb > 1) {
            self.firstScroll = false;
        }

        if(!_.isUndefined(self.way.characterDefinition)) {

            if(imgNb >= self.way.characterDefinition.startFrame && imgNb <= self.way.characterDefinition.endFrame) {

                //===== TODO ONE TIME INTRUCTION, do not execute for each loop
                //show frame container
                self.$el.find(".streetwalk-textcharacter").show();
                //set offset for the imgFrame, to position the "real" center
                TweenLite.set(self.$el.find(".streetwalk-textcharacter .character-sign"),{x:"-50%",y:-100+self.way.characterDefinition.offsetTopCenter+"%"});

                //==== COMPUTE AND SET WIDTH OF THE CHARACTER FRAMER ======
                var fullRange = self.way.characterDefinition.endFrame - self.way.characterDefinition.startFrame;
                var imgNbRange =  self.way.characterDefinition.endFrame - imgNb;
                var imgPropRange = fullRange - imgNbRange;

                var width = imgPropRange * (self.way.characterDefinition.framefullWidth - self.way.characterDefinition.framestartWidth) / fullRange + self.way.characterDefinition.framestartWidth;
                //TODO IF RESIZE WINDOW , need to actualize that
                var widthPx = width * window.innerHeight / 100;
                self.$el.find(".streetwalk-textcharacter .img-container").css("width",widthPx+"px");

                //===== SET POSITION
                var leftPosition = self.way.characterPosition[imgNb].left;
                self.$el.find(".streetwalk-textcharacter").css("left",leftPosition+"%");

                var topPosition = self.way.characterPosition[imgNb].top;
                self.$el.find(".streetwalk-textcharacter").css("top",topPosition+"%");

                //=== ANIMATE
                // TODO SEE WHY IT'S LAGGUY
                // if(!self.animationCharacterSign) {
                //     self.animationCharacterSign = true;
                //     self.animationCharacterSign = new TimelineMax({onComplete:function() {
                //         TweenLite.to(".img-container",0.5,{y:"-100%"});
                //     }});
                //     self.animationCharacterSign.add(TweenLite.to(".img-container",0.5,{y:"-105%",ease: Power0.easeNone}));
                //     self.animationCharacterSign.add(TweenLite.to(".img-container",0.5,{y:"-100%",ease: Power0.easeNone}));
                //     self.animationCharacterSign.repeat(-1);
                // }
            }
            else {
                self.$el.find(".streetwalk-textcharacter").hide();
            }
        }


        //==========   CHOOSE WAY HANDLING ==============
        if(imgNb >= self.way.wayStills.nbImages-1) {
            self.$el.find(".streetwalk-chooseway-start-wrapper").hide();

            self.$el.find(".streetwalk-chooseway-end-wrapper").html(_.template(streetWalkChoosePathViewTemplate)({
                wayConnections:self.way.wayConnectionsEnd,
                lang : Localization.translationLoaded
            }));

            TweenLite.set(".streetwalk-chooseway",{scale:0});
            self.$el.find(".streetwalk-chooseway-end-wrapper").show();
            TweenLite.fromTo(".streetwalk-chooseway",0.5,{scale:0},{scale:1,ease: Back.easeOut,onComplete:function() {
                self.chooseWayEndDisplayed = true;
            }});

            MenuCharactersView.closeMenu();

            //CHOOSEWAY HIGHLIGHT
            $(".btn-chooseway").hover(function() {
                 var pathToHighlight = this.href.baseVal.split("/")[1];
                 var reversePathToHighlight = Ways.getReverseWayName(pathToHighlight);
                 var element = ".path-" + pathToHighlight + ",.path-" + reversePathToHighlight;
                 var currentClass = $(element).attr("class");
                 var newClass = currentClass + " highlight";
                 $(element).attr("class", newClass);
                 LOGGER.debug("Add class highlight");
            },function() {
                 var pathToHighlight = this.href.baseVal.split("/")[1];
                 var reversePathToHighlight = Ways.getReverseWayName(pathToHighlight);
                 var element = ".path-" + pathToHighlight + ",.path-" + reversePathToHighlight;
                 var currentClass = $(element).attr("class");
                 var newClass = currentClass.replace("highlight","");
                 $(element).attr("class", newClass);
                 LOGGER.debug("Add class highlight");
            });
        }
        else if(imgNb === 0) {
            self.$el.find(".streetwalk-chooseway-end-wrapper").hide();

            self.$el.find(".streetwalk-chooseway-start-wrapper").show();
            self.$el.find(".streetwalk-chooseway-start-wrapper").html(_.template(streetWalkChoosePathViewTemplate)({
                wayConnections:self.way.wayConnectionsStart,
                lang : Localization.translationLoaded
            }));

            TweenLite.set(".streetwalk-chooseway",{scale:0});
            self.$el.find(".streetwalk-chooseway-start-wrapper").show();
            TweenLite.fromTo(".streetwalk-chooseway",0.5,{scale:0},{scale:1,ease: Back.easeOut,onComplete:function() {
                self.chooseWayStartDisplayed = true;
            }});

            MenuCharactersView.closeMenu();

            //CHOOSEWAY HIGHLIGHT
            $(".btn-chooseway").hover(function() {
                 var pathToHighlight = this.href.baseVal.split("/")[1];
                 var reversePathToHighlight = Ways.getReverseWayName(pathToHighlight);
                 var element = ".path-" + pathToHighlight + ",.path-" + reversePathToHighlight;
                 var currentClass = $(element).attr("class");
                 var newClass = currentClass + " highlight";
                 $(element).attr("class", newClass);
                 LOGGER.debug("Add class highlight");
            },function() {
                 var pathToHighlight = this.href.baseVal.split("/")[1];
                 var reversePathToHighlight = Ways.getReverseWayName(pathToHighlight);
                 var element = ".path-" + pathToHighlight + ",.path-" + reversePathToHighlight;
                 var currentClass = $(element).attr("class");
                 var newClass = currentClass.replace("highlight","");
                 $(element).attr("class", newClass);
                 LOGGER.debug("Add class highlight");
            });
        }
        else {
            if(self.chooseWayEndDisplayed && !self.maskingChooseWay) {
                self.maskingChooseWay = true;
                TweenLite.fromTo(".streetwalk-chooseway",0.3,{scale:1},{scale:0,ease: Power0.easeIn,onComplete:function() {
                    self.chooseWayEndDisplayed = false;
                    self.maskingChooseWay = false;
                    self.$el.find(".streetwalk-chooseway-end-wrapper").hide();
                }});
            }

            if(self.chooseWayStartDisplayed && !self.maskingChooseWay) {
                self.maskingChooseWay = true;
                TweenLite.fromTo(".streetwalk-chooseway",0.3,{scale:1},{scale:0,ease: Power0.easeIn,onComplete:function() {
                    self.chooseWayStartDisplayed = false;
                    self.maskingChooseWay = false;
                    self.$el.find(".streetwalk-chooseway-start-wrapper").hide();
                }});
            }
        }

    },

    computeBodyHeigh: function(wayLength) {
        var self = this;
        self.bodyHeight =  wayLength * 100;
        return self.bodyHeight;
    },

    getCurrentPosition : function() {
        var supportPageOffset = window.pageXOffset !== undefined;
        var isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");
        return supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop;
    },

    computeAnimation: function(firstStill) {
        var self = this;

            if(self.animating) {

            //LOGGER.debug("Compute animation");
            self.targetPosition  = self.getCurrentPosition();

            if( Math.floor(self.targetPosition) != Math.floor(self.currentPosition) || firstStill) {
                //LOGGER.debug("Compute We have moved : scroll position " + self.currentPosition);
                var deaccelerate = Math.max( Math.min( Math.abs(self.targetPosition - self.currentPosition) * 5000 , 10 ) , 2 );
                self.currentPosition += (self.targetPosition - self.currentPosition) / deaccelerate;

                if(self.targetPosition > self.currentPosition) {
                    self.currentPosition = Math.ceil(self.currentPosition);
                }
                else{
                    self.currentPosition = Math.floor(self.currentPosition);
                }

                //Change image
                var availableHeigth = (self.bodyHeight - window.innerHeight);

                var imgNb = Math.floor( self.currentPosition / availableHeigth * self.way.wayStills.length);

                //Update tutorial if in tutorial mode
                TutorialView.update(self.wayName, imgNb);

                //Do not render same img (we can have changed position a bit but do not have image for this position)
                if(imgNb == self.currentStill.id) {
                    LOGGER.debug("DO NOT RENDER SAME STILL " + imgNb);
                }
                else {

                    //Update map diplay current user position
                    if(MapView.mapLoaded) {
                        var currentTime = new Date().getTime();
                        if(_.isUndefined(self.lastMapCurrentUserDisplayTimeStamp)) {
                            self.lastMapCurrentUserDisplayTimeStamp = currentTime;
                        }
                        //Only update each 500ms
                        if((currentTime - self.lastMapCurrentUserDisplayTimeStamp) > 500) {
                            MapView.map.panTo(self.way.wayPath[self.currentStill.id]);
                            self.lastMapCurrentUserDisplayTimeStamp = currentTime;
                        }
                    }

                    //Make sure imgNb is in bounds (on chrome macosx we can scroll more than height (rebound))
                    if(imgNb < 0) { imgNb = 0; }
                    if(imgNb >= self.way.wayStills.length) { imgNb = self.way.wayStills.length-1; }

                    //Render image
                    self.renderImg(imgNb);
                    
                    //Render elements at this position:
                    self.renderElements(imgNb);
                    $("body").removeClass('not-moving');
                    MapView.moving = true;

                    //close menu
                    MenuCharactersView.closeMenu(true);

                    //Update map
                    MapView.update(self.way.wayPath[self.currentStill.id]);

                    //Render highres after 100ms
                    clearTimeout(self.highResLoadingInterval);
                    self.highResLoadingInterval = setTimeout(function() {
                        currentTime = new Date().getTime();
                        //If time since last call < 1 sec, cancel last highres
                        if(currentTime - self.lastCallRenderHighResTime < 1000) {
                            console.log("Cancel highres loading");
                            self.lastCallRenderHighResStill.cancelHighResLoading();
                            //cancel timeout not moving
                            clearTimeout(self.timeOutNotMoving);
                        }

                        self.renderImgHighRes();
                        self.lastCallRenderHighResTime = new Date().getTime();
                        self.lastCallRenderHighResStill = self.currentStill;

                        self.timeOutNotMoving = setTimeout(function() {
                            MapView.moving = false;
                            $("body").addClass('not-moving');
                        },1000);
                    },100);

                    // Update sounds volume
                    if(Sounds.length) {
                        var currentGeoPosition = self.way.wayPath[imgNb];

                        if(_.isUndefined(self.distanceSinceLastSoundUpdate)) {
                            self.distanceSinceLastSoundUpdate = 0;
                            self.lastSoundUpdateStill = 0;
                            self.lastSoundUpdatePosition = currentGeoPosition;

                        }
                        else {
                            self.distanceSinceLastSoundUpdate = GeoUtils.distance(self.lastSoundUpdatePosition,currentGeoPosition);

                            //update each 2 meter
                            if(self.distanceSinceLastSoundUpdate > 2) {
                                var movingForward = true;
                                if(imgNb < self.lastSoundUpdateStill) {
                                    movingForward = false;
                                }
                                Sounds.updateSounds(currentGeoPosition, movingForward);
                                self.distanceSinceLastSoundUpdate = 0;
                                self.lastSoundUpdatePosition = currentGeoPosition;
                                self.lastSoundUpdateStill = imgNb;
                            }
                        }
                        
                    }

                    //update editor
                    Sounds.currentUserPosition = self.way.wayPath[imgNb];
                    if(self.soundEditorView) {
                        self.soundEditorView.refreshEditorMapAfterMoving();
                    }
                    
                }
            }



            window.requestAnimationFrame(function() {
                self.computeAnimation();
            });

        }
    },

    toggleSounds: function(e) {
        var self = this;

        var state = $(e.currentTarget).attr("data-state");

        if(state == "normal") {
            $(e.currentTarget).attr("data-state","muted");
            Sounds.userMuted = true;
            Sounds.mute();
        }
        else {
            $(e.currentTarget).attr("data-state","normal");
            Sounds.userMuted = false;
            Sounds.unmute();
        }
    },

    muteSounds: function() {
        var self = this;

        self.$el.find(".toggle-sounds").attr("data-state","muted");
        Sounds.mute();
    },

    unmuteSounds: function() {
        var self = this;

        if(!Sounds.userMuted) {
            self.$el.find(".toggle-sounds").attr("data-state","normal");
            Sounds.unmute();
        }
    },

   clickOnCharacter: function(e) {
        var self = this;

        self.trigger("clickOnCharacter");

        VideoManagerView.showVideo(self.way.characterDefinition.name, self.way.wayName);
    },

    showSoundEditor: function() {
        var self = this;
        if(self.soundEditorView) {
            self.soundEditorView.showEditor();
        }
    },

    showSyncingProgressMsg: function() {
        var self = this;

        self.$el.find(".streetwalk-syncing").addClass("syncinginprogress");

        setTimeout(function() {
            self.$el.find(".streetwalk-syncing").removeClass("syncinginprogress");
        },2000);
    },

    goToStreetName: function(wayName) {
        window.location.href = "#streetwalk/" + wayName;
    },

    pause: function() {
        var self = this;
        self.paused = true;
        self.animating = false;
        self.positionOnPause = self.getCurrentPosition();
        $("body").css("overflow", "hidden");
    },

    play: function() {
        var self = this;
        $("body").css("overflow", "visible");
        window.scrollTo(0,self.positionOnPause);
        self.paused = false;
        self.animating = true;
        self.computeAnimation(true);
    },

    onClose: function(){
      var self = this;
      //Clean
      self.undelegateEvents();
      self.stopListening();
      self.way.clear();
      self.animating = false;
      MapView.onClose();
  }

});

return StreetWalkView;

});


