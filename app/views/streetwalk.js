define(['jquery',
    'underscore',
    'backbone',
    'snap',
    'models/Ways',
    'models/Sounds',
    'models/Progression',
    'utils/GeoUtils',
    'utils/LocalParams',
    'utils/Logger',
    'utils/Localization',
    'views/subview/menucharacters',
    'views/subview/soundeditor',
    'views/subview/login',
    'text!templates/streetwalk/streetWalkViewTemplate.html',
    'text!templates/streetwalk/streetWalkLoadingViewTemplate.html',
    'text!templates/streetwalk/streetWalkChoosePathStartViewTemplate.html',
    'text!templates/streetwalk/streetWalkChoosePathEndViewTemplate.html',
    'text!templates/svg/svgSignTopProgressTemplate.html',
    'text!templates/svg/svgSignTopAreaTemplate.html',
    'text!templates/svg/svgFramePajaritoTemplate.html',
    'text!templates/svg/svgFrameJaleTemplate.html',
    'text!templates/svg/svgScrollToStartES.html',
    'popcorn'
    ],
    function($, _, Backbone,
        Snap,
        Ways,
        Sounds,
        Progression,
        GeoUtils,
        LocalParams,
        LOGGER,
        Localization,
        MenuCharactersView,
        SoundEditorView,
        LogInView,
        streetWalkViewTemplate,
        streetWalkLoadingViewTemplate,
        streetWalkChoosePathStartViewTemplate,
        streetWalkChoosePathEndViewTemplate,
        svgSignTopProgressTemplate,
        svgSignTopAreaTemplate,
        svgFramePajaritoTemplate,
        svgFrameJaleTemplate,
        svgScrollToStart){

      var StreetWalkView = Backbone.View.extend({

        el:"#streetwalk",
        elImg:"#streetwalk .streetwalkImg",

        currentPosition:0,
        bodyHeight:7000,
        fullscreen:false,

        scrollToEndEventSended:false,

        videoShowOneTime:false,

        events:{
            "click .toggle-sounds ":"toggleSounds",
            "click .frame-character":"showVideo",
            "click .streetwalk-video-btnclose":"closeVideo",
            "click .streetwalk-soundeditor-btnshow":"showSoundEditor"
        },

        bindings:{
            ".streetwalk-progress .nbStoriesUnlocked":{
                observe:"nbItemUnlocked"
            }
        },

        initialize : function(params) {
            var self = this;

            self.wayName = params.wayName;
        },

        initMap: function() {
            var self = this;

            self.map = L.mapbox.map('streetwalk-mapcontainer', 'tdurand.jn29943n',{
                accessToken: 'pk.eyJ1IjoidGR1cmFuZCIsImEiOiI0T1ZEWlRVIn0.1PEGeiEWz6RUBfZq9Bvy7Q',
                zoomControl: false,
                attributionControl: false
            });


            self.map.on("load", function() {
                self.mapLoaded = true;
                self.updateMarkerPosition(self.currentStill.id);

                // Disable drag and zoom handlers.
                self.map.dragging.disable();
                self.map.touchZoom.disable();
                self.map.doubleClickZoom.disable();
                self.map.scrollWheelZoom.disable();
                // Disable tap handler, if present.
                if (self.map.tap) map.tap.disable();

                self.$el.find("#streetwalk-mapcontainer").hover(function() {
                    self.displayBigMap();
                },function() {
                    self.reduceMap();
                });

                //Center map every 500ms
                //TODO ONLY IF POSITION CHANGED
                setInterval(function() {
                    self.map.panTo(self.way.wayPath[self.currentStill.id]);
                },500);
        });
        },

        initSounds: function() {
            var self = this;


        },

        initArrowKeyBinding: function() {
            $(document).keydown(function(e) {
            switch(e.which) {
                case 37: // left
                break;

                case 38: // up
                window.scrollBy(0, 50);
                break;

                case 39: // right
                break;

                case 40: // down
                window.scrollBy(0, -50);
                break;

                default: return; // exit this handler for other keys
            }
            e.preventDefault(); // prevent the default action (scroll / move caret)
        });
        },

        prepare:function() {

            var self = this;

        // if(_.isUndefined(Localization.STR)) {

        //     self.listenToOnce(Localization,"STRLoaded", function() {
        //         self.render();
        //     });
        // }
        // else {
        //     self.render();
        // }

        self.firstScroll = true;

        self.loadPath();

        self.renderLoading();

        self.initArrowKeyBinding();

        window.scrollTo(0,0);

    },

    renderLoading: function() {
        var self = this;
        
        if(Progression.isFirstWay) {
            self.$el.find(".streetwalk-loading-main").html(_.template(streetWalkLoadingViewTemplate));
        }
        else {
            self.$el.find(".streetwalk-tutorial").hide();
            self.$el.find(".streetwalk-loading").html(_.template(streetWalkLoadingViewTemplate));
        }

        self.$el.find(".streetwalk-loading").show();

        //init svg element path
        self.pathLoading = Snap("#loadingLine");
        self.pathLoadingLength = self.pathLoading.getTotalLength();
        self.pathLoading.attr({
            // Draw Path
            "stroke-dasharray": self.pathLoadingLength + " " + self.pathLoadingLength,
            "stroke-dashoffset": self.pathLoadingLength
        });

        self.carito = Snap("#carito");

        self.$el.find(".streetwalk-chooseway-end-wrapper").hide();
        self.$el.find(".streetwalk-chooseway-start-wrapper").hide();
        

    },

    updateLoadingIndicator: function(pourcentage) {
        var self = this;
        self.$el.find(".loadingIndicator").text(pourcentage);

        //update svg animation
        var currentLoadingLength = pourcentage * self.pathLoadingLength / 100;

        if(pourcentage <= 100) {
            self.pathLoading.attr("stroke-dashoffset", self.pathLoadingLength-currentLoadingLength);
            self.caritoMatrix = new Snap.Matrix();
            self.caritoMatrix.translate(currentLoadingLength,0);
            self.carito.transform(self.caritoMatrix);
        }
    },

    updateMarkerPosition: function(stillId) {
        var self = this;

        if(!self.mapLoaded) {
            return;
        }

        if(self.markerMap) {
            self.markerMap.setLatLng(self.way.wayPath[stillId]);
        }
        else {
            if(self.map && self.way.wayPath) {
                self.markerMap = L.marker(self.way.wayPath[stillId]).addTo(self.map);
                if(stillId <= 1) {
                    self.map.panTo(self.way.wayPath[stillId]);
                }
            }
            
        }
        
    },

    render:function() {

        var self = this;

        //render first still
        self.currentStill = self.way.wayStills.first();
        var pathFirstStill = self.way.wayStills.first().get("srcLowRes");

        self.$el.html(_.template(streetWalkViewTemplate,{
            pathFirstStill:pathFirstStill,
            STR:Localization.STR,
            lang:Localization.translationLoaded
        }));

        self.menuCharactersView = new MenuCharactersView();
        self.logInView = new LogInView();

        if(Progression.isFirstWay) {
            Progression.isFirstWay = false;
            //Render tutorial
            self.$el.find(".streetwalk-tutorial").html(_.template(svgScrollToStart));
        }

        //Render top signs
        self.$el.find(".streetwalk-progress").html(_.template(svgSignTopProgressTemplate));
        self.$el.find(".streetwalk-area").html(_.template(svgSignTopAreaTemplate,{
            area:self.way.wayArea
        }));

        //attach stickit
        self.stickit(Progression);

        self.initMap();

        self.adjustSizes();

        self.renderImgHighRes();

        //prefech stuff
        //Prefetch image loading
        $.preloadImages = function() {
          for (var i = 0; i < arguments.length; i++) {
            $("<img />").attr("src", arguments[i]);
        }
    };

        //set right src for frame character
        if(!_.isUndefined(self.way.characterDefinition)) {
            self.$el.find(".img-container").html(_.template(self.getFrameTemplate(self.way.characterDefinition.name)));
        }
        
    },

    getFrameTemplate : function(character) {
        var self = this;
        var template = "";

        if(character == "pajarito") {
            template = svgFramePajaritoTemplate;
        }
        else {
            template = svgFrameJaleTemplate;
        }

        return template;
    },

    adjustSizes: function() {
        var self = this;

        self.adjustMapSizes();

        //Todo add handler on resize to execute this function
        var height = $(".streetwalk-menucharacters").height();
        $(".streetwalk-menucharacters").width(height*6);

        $(".streetwalk-menucharacters").width(height*6);
    },

    adjustMapSizes: function() {
        var self = this;

        self.$el.find(".streetwalk-map").one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.map.invalidateSize(true);
        });

        self.$el.find(".streetwalk-map").width(self.$el.find(".streetwalk-map").height());
        
    },

    loadPath: function() {
        var self = this;

        self.way = Ways.where({ wayName : self.wayName})[0];

        self.way.fetch();

        self.way.on("updatePercentageLoaded", function() {
            self.updateLoadingIndicator(self.way.percentageLoaded);
        });

        self.way.on("loadingFinished", function() {
            self.animating = true;
            self.currentStill = self.way.wayStills.first();
            self.$el.css("height",self.computeBodyHeigh(self.way.wayLength)+"px");
            self.$el.find("#scrollToStartLoaded").show();
            self.$el.find("#scrollToStartLoading").hide();
            self.render();
            self.$el.find(".streetwalk-loading").hide();
            //TODO Sounds can be loaded after render....
            Sounds.updateSounds(self.way.wayPath[0]);
            Sounds.fadeOutSoundHome();

            self.soundEditorView = new SoundEditorView(self.way);

            self.computeAnimation(true);
        });

        self.way.on("loadingFinishedCompletely", function() {
            self.initVideo();
        });
        
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

        self.updateMarkerPosition(self.currentStill.id);

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

        var imgStartText = 266;
        var imgEndText = 286;
        var fullWidth = 37.66;
        var startWidth = 13.42;
        //range


        if(!_.isUndefined(self.way.characterDefinition)) {

            if(imgNb >= self.way.characterDefinition.startFrame && imgNb <= self.way.characterDefinition.endFrame) {

                //===== TODO ONE TIME INTRUCTION, do not execute for each loop
                //show frame container
                self.$el.find(".streetwalk-textcharacter").show();
                //set offset for the imgFrame, to position the "real" center
                self.$el.find(".streetwalk-textcharacter .frame-character").css("margin-top",self.way.characterDefinition.offsetTopCenter+"%");

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

            }
            else {
                self.$el.find(".streetwalk-textcharacter .img-container").css("width","0px");
            }
        }


        //==========   CHOOSE WAY HANDLING ==============
        if(imgNb >= self.way.wayStills.nbImages-1) {
            self.$el.find(".streetwalk-chooseway-start-wrapper").hide();

            self.$el.find(".streetwalk-chooseway-end-wrapper").show();
            self.$el.find(".streetwalk-chooseway-end-wrapper").html(_.template(streetWalkChoosePathEndViewTemplate,{
                wayConnectionsEnd:self.way.wayConnectionsEnd
            }));

            self.menuCharactersView.closeMenu();
        }
        else if(imgNb === 0) {
            self.$el.find(".streetwalk-chooseway-end-wrapper").hide();

            self.$el.find(".streetwalk-chooseway-start-wrapper").show();
            self.$el.find(".streetwalk-chooseway-start-wrapper").html(_.template(streetWalkChoosePathStartViewTemplate,{
                wayConnectionsStart:self.way.wayConnectionsStart
            }));

            self.menuCharactersView.closeMenu();
        }
        else {
            self.$el.find(".streetwalk-chooseway-end-wrapper").hide();
            self.$el.find(".streetwalk-chooseway-start-wrapper").hide();
        }

    },

    computeBodyHeigh: function(wayLength) {
        var self = this;
        self.bodyHeight =  wayLength * 100;
        return self.bodyHeight;
    },

    computeAnimation: function(firstStill) {
        var self = this;

        if(self.animating) {

        //LOGGER.debug("Compute animation");

        var supportPageOffset = window.pageXOffset !== undefined;
        var isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");
        self.targetPosition  = supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop;

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

            //Do not render same img (we can have changed position a bit but do not have image for this position)
            if(imgNb == self.currentStill.id) {
                LOGGER.debug("DO NOT RENDER SAME STILL " + imgNb);
            }
            else {

                //Make sure imgNb is in bounds (on chrome macosx we can scroll more than height (rebound))
                if(imgNb < 0) { imgNb = 0; }
                if(imgNb >= self.way.wayStills.length) { imgNb = self.way.wayStills.length-1; }

                //Render image
                self.renderImg(imgNb);
                
                //Render elements at this position:
                self.renderElements(imgNb);
                $("body").removeClass('not-moving');

                //close menu
                self.menuCharactersView.closeMenu();

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
                        $("body").addClass('not-moving');
                    },500);
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
                self.soundEditorView.refreshEditorMapAfterMoving();
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
        Sounds.mute();
    }
    else {
        $(e.currentTarget).attr("data-state","normal");
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

    self.$el.find(".toggle-sounds").attr("data-state","normal");
    Sounds.unmute();
},

initVideo: function() {
    var self = this;

    if(self.way.characterDefinition) {

        var idVimeo = Progression.nextVideoToPlay(self.way.characterDefinition.name);

        if(Progression.isFirstVideo) {
            Progression.isFirstVideo = false;
            idVimeo = 115328392;
        }



           // Add video
           self.popcorn = Popcorn.vimeo( ".streetwalk-video-container", "http://player.vimeo.com/video/"+idVimeo);
       }
   },

   showVideo: function() {
    var self = this;

    self.$el.find(".streetwalk-video").show();

    if(_.isUndefined(self.popcorn)) {
        self.initVideo();
    }

    self.muteSounds();

    setTimeout(function() {
        self.popcorn.play();
    },1000);

},

closeVideo: function() {
    var self = this;

    self.$el.find(".streetwalk-video").hide();

    self.popcorn.pause();
    self.popcorn.currentTime(0);

    self.unmuteSounds();

        //current character
        var characterName = self.way.characterDefinition.name;
        var doNotUnlock = self.way.characterDefinition.doNotUnlock;
        
        if(!self.videoShowOneTime) {
            //unlocknext item
            Progression.unlockNextItem(characterName,doNotUnlock);
        }

        self.videoShowOneTime = true;

        //open menu
        self.menuCharactersView.openMenu(characterName);
    },

    showSoundEditor: function() {
        var self = this;
        self.$el.find("#streetwalk-soundeditor").show();
    },

    displayBigMap: function() {
        var self = this;
        console.log("DisplayBigMap");
        // self.$el.find(".streetwalk-map").one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
        //     self.adjustMapSizes();
        // });

        self.$el.find(".streetwalk-map").one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.map.invalidateSize(true);
        });

        var height = self.$el.find(".streetwalk-map").height();
        self.$el.find(".streetwalk-map").height(height*2);
        self.$el.find(".streetwalk-map").width(height*2);
    },

    reduceMap: function() {
        var self = this;
        console.log("ReduceMap");

        self.$el.find(".streetwalk-map").one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.map.invalidateSize(true);
        });

        var height = self.$el.find(".streetwalk-map").height();
        self.$el.find(".streetwalk-map").height(height/2);
        self.$el.find(".streetwalk-map").width(height/2);
        
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
      this.way.clear();
      this.animating = false;
  }

});

return StreetWalkView;

});


