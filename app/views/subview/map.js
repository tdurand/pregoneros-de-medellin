define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'utils/Localization',
        'utils/GeoUtils',
        'models/Progression'
        ],
function($, _, Backbone,
                LOGGER,
                Localization,
                GeoUtils,
                Progression){

  var MapView = Backbone.View.extend({

    enlarged:false,
    isChangingSize:false,
    moving:undefined,

    prepare: function(positionInit, Ways) {
        var self = this;

        self.setElement(".streetwalk-map");

        self.initMap(positionInit);
        self.Ways = Ways;

        self.characterPositions = [];

        //init characterPositions
        _.each(self.Ways.models,function(way) {
            if(way.characterDefinition) {
                //just add one position for the street reverse
                if(_.isUndefined(_.find(self.characterPositions,{way:Ways.getReverseWayName(way.wayName)}))) {

                    self.characterPositions.push({
                        name : way.characterDefinition.name,
                        position: way.wayPath[way.characterDefinition.endFrame],
                        way: way.wayName
                    });

                }
            }
        });

    },

    initMap: function(positionInit) {
        var self = this;

        L.mapbox.accessToken = 'pk.eyJ1IjoicHJlZ29uZXJvc2RlbWVkZWxsaW4iLCJhIjoicGVRNFo2VSJ9.NeabLQml7j9uBGBUIZLIuA';
            
        self.map = L.mapbox.map('streetwalk-mapcontainer', 'pregonerosdemedellin.lnni2dn4',{
            zoomControl: false,
            attributionControl: false,
            minZoom: 16,
            maxZoom: 17,
            maxBounds:[[6.24327071884627,-75.57523012161253],[6.254767683129394,-75.56199073791504]]
        });

        self.listenTo(self.map,"load", function() {
            self.trigger("loaded");
            self.mapLoaded = true;
            self.enlarged = false;

            self.map.panTo(positionInit);
            self.updateMarkerPosition(positionInit);
            self.map.touchZoom.disable();
            self.map.doubleClickZoom.disable();
            self.map.scrollWheelZoom.disable();
            // Disable tap handler, if present.
            if (self.map.tap) self.map.tap.disable();

            self.addAllCharacterToMap();
            self.addWaysToMap();
            self.addDiscoveredPathToMap();
            self.addStartingMarker();

            self.$el.find(".streetwalk-map-btnfullscreen").on("click",function() {
                self.toggleBigMap();
            });

            self.initListeners();
        });
    },

    initListeners: function() {

        var self = this;

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:pajarito.video1.locked', function(model, newValue){
                var character = "pajarito";
                var video = "video1";
                var way = Progression.instance.get("charactersProgression").get("pajarito.video1.wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:pajarito.video2.locked', function(model, newValue){
                var character = "pajarito";
                var video = "video2";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });
        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:pajarito.video3.locked', function(model, newValue){
                this.unbind();
                var character = "pajarito";
                var video = "video3";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:jale.video1.locked', function(model, newValue){
                var character = "jale";
                var video = "video1";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:jale.video2.locked', function(model, newValue){
                var character = "jale";
                var video = "video2";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:jale.video3.locked', function(model, newValue){
                var character = "jale";
                var video = "video3";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:lider.video1.locked', function(model, newValue){
                var character = "lider";
                var video = "video1";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:lider.video2.locked', function(model, newValue){
                var character = "lider";
                var video = "video2";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:lider.video3.locked', function(model, newValue){
                var character = "lider";
                var video = "video3";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:gaucho.video1.locked', function(model, newValue){
                var character = "gaucho";
                var video = "video1";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:gaucho.video2.locked', function(model, newValue){
                var character = "gaucho";
                var video = "video2";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:gaucho.video3.locked', function(model, newValue){
                var character = "gaucho";
                var video = "video3";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:papavanegas.video1.locked', function(model, newValue){
                var character = "papavanegas";
                var video = "video1";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:papavanegas.video2.locked', function(model, newValue){
                var character = "papavanegas";
                var video = "video2";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenToOnce(Progression.instance.get("charactersProgression"),'change:papavanegas.video3.locked', function(model, newValue){
                var character = "papavanegas";
                var video = "video3";
                var way = Progression.instance.get("charactersProgression").get(character+"."+video+".wayName");
                self.unlockIconMap(way,character);
        });

        self.listenTo(Progression.instance,'pathDiscoveredUpdated',function() {
            var newProgressionPath = Progression.instance.get("pathDiscovered")[Progression.instance.get("currentStreet")];
            self.updateDiscoveredPathToMap(newProgressionPath);
        });
    },

    addStartingMarker: function() {
        var self = this;

        self.markerStart = L.marker([6.252000116022819,-75.56807398796082]).addTo(self.map);
        self.markerStart.setIcon(L.mapbox.marker.icon({
                'marker-size': 'large',
                'marker-symbol': 'triangle-stroked',
                'marker-color': '#a3e46b'
        }));
        self.markerStart.feature = { properties: { way: "plazabotero-start-carabobo" } };

        self.markerStart.on("click", function(e) {
            self.showHelpGoToStreet(e);
        });
    },

    addAllCharacterToMap: function() {
        var self = this;

        var geoJson = [];

        self.layerCharacters = L.mapbox.featureLayer(geoJson).addTo(self.map);

        _.each(self.characterPositions,function(characterPosition) {
            if(characterPosition.way == "plazabotero-cr51-carabobo" || characterPosition.way == "plazabotero-carabobo-cr51") {
                return;
            }

            geoJson.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [characterPosition.position[1],characterPosition.position[0]]
                },
                "properties": {
                    "way":characterPosition.way,
                    "wayReverse": Ways.getReverseWayName(characterPosition.way),
                    "icon": {
                        "iconUrl": self.getIconPath(characterPosition.name,characterPosition.way),
                        "iconSize": [40, 40], // size of the icon
                        "iconAnchor": [20, 20], // point of the icon which will correspond to marker's location
                        "popupAnchor": [0, -20], // point from which the popup should open relative to the iconAnchor
                        "className": "character-icon " + characterPosition.name + " " + characterPosition.way + " " + Ways.getReverseWayName(characterPosition.way)
                    }
                }
            });
        });

        // Set a custom icon on each marker based on feature properties.
        self.layerCharacters.on('layeradd', function(e) {
            var marker = e.layer,
                feature = marker.feature;

            marker.setIcon(L.icon(feature.properties.icon));
            marker.on("click", function(e) {
                self.showHelpGoToStreet(e);
            });
        });

        self.layerCharacters.setGeoJSON(geoJson);
    },

    addWaysToMap: function() {
        var self = this;

        var geoJson = [];

        self.layerWays = L.mapbox.featureLayer(geoJson).addTo(self.map);

        _.each(Ways.models,function(way) {
            //If we didn't draw the reverse street
            if(_.isUndefined(_.find(geoJson,{properties: {id: Ways.getReverseWayName(way.wayName)}}))) {
                geoJson.push({
                    "type": "Feature",
                    "geometry": {
                        "coordinates": GeoUtils.invertArrayLongLatToLatLong(way.wayPath),
                        "type": "LineString"
                    },
                    "properties": {
                        "id": way.wayName,
                        "title": way.wayName,
                        "stroke": "#6c6c6c",
                        "stroke-opacity": 1,
                        "stroke-width": 3
                    },
                    "className": {
                        "baseVal": way.wayName
                    }
                });
            }
        });

        // Dash array
        self.layerWays.on('layeradd', function(e) {
            var currentClass = $(e.layer._path).attr("class");
            var className = currentClass + " map-path-way" + " path-" + e.layer.feature.properties.id + " path-" + Ways.getReverseWayName(e.layer.feature.properties.id);
            $(e.layer._path).attr("class",className);
            e.layer.setStyle({
                dashArray: "8,6"
            });
        });

        self.layerWays.setGeoJSON(geoJson);
    },

    addDiscoveredPathToMap: function() {
        var self = this;

        var geoJson = [];

        self.layerDiscoveredPath = L.mapbox.featureLayer(geoJson).addTo(self.map);

        _.each(Progression.instance.get("pathDiscovered"),function(path,wayName) {

            if(path === true) {
                path = Ways.findWhere({wayName:wayName}).wayPath;
            }
            //If we didn't draw the reverse street
            geoJson.push({
                    "type": "Feature",
                    "geometry": {
                        "coordinates": GeoUtils.invertArrayLongLatToLatLong(path),
                        "type": "LineString"
                    },
                    "properties": {
                        "id":wayName,
                        "stroke": "#1087bf",
                        "stroke-opacity": 1,
                        "stroke-width": 3
                    }
                });
        });

        // Add class with path name
        self.layerDiscoveredPath.on('layeradd', function(e) {
            var currentClass = $(e.layer._path).attr("class");
            var className = currentClass + " map-path-way" + " path-" + e.layer.feature.properties.id + " path-" + Ways.getReverseWayName(e.layer.feature.properties.id);
            $(e.layer._path).attr("class",className);
        });

        self.layerDiscoveredPath.setGeoJSON(geoJson);
    },

    updateDiscoveredPathToMap: function(newProgressionPath) {
        var self = this;

        self.layerDiscoveredPath.clearLayers();

        var geoJson = [];

        _.each(Progression.instance.get("pathDiscovered"),function(path,wayName) {

            if(path === true) {
                path = Ways.findWhere({wayName:wayName}).wayPath;
            }
            //If we didn't draw the reverse street
            geoJson.push({
                    "type": "Feature",
                    "geometry": {
                        "coordinates": GeoUtils.invertArrayLongLatToLatLong(path),
                        "type": "LineString"
                    },
                    "properties": {
                        "id":wayName,
                        "stroke": "#1087bf",
                        "stroke-opacity": 1,
                        "stroke-width": 3
                    }
                });
        });

        self.layerDiscoveredPath.setGeoJSON(geoJson);
    },

    unlockIconMap: function(wayName, character) {
        $(".streetwalk-mapcontainer ."+ wayName).attr("src","images/map/"+ character +".png");
    },

    getIconPath: function(characterName,wayName) {

        var path = "images/map/" + characterName;

        if(Progression.instance.isThisCharacterInThisStreetLocked(wayName,characterName)) {
            path += "-locked.png";
        }
        else {
            path += ".png";
        }

        return path;
    },

    adjustMapSizes: function() {
        var self = this;


        self.$el.one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.map.invalidateSize(true);
        });

        self.$el.width(self.$el.height());
        
    },

    update: function(currentPosition) {
        var self = this;
        self.updateMarkerPosition(currentPosition);

        self.updateProgressionPathDiscovered(currentPosition);
    },

    updateProgressionPathDiscovered: function(currentPosition) {
        var self = this;

        var currentStreet = Progression.instance.get("currentStreet");

        var currentWay = Ways.findWhere({wayName:currentStreet});

        var currentPositionInStreet = _.values(currentWay.wayPath).indexOf(currentPosition);

        //if we are at the last position of the street, set the pathDiscovered[way] to true to avoid storing
        //all the intermediate coordinates
        if(currentPositionInStreet >= _.values(currentWay.wayPath).length-1) {
            Progression.instance.get("pathDiscovered")[currentWay.wayName] = true;
            return;
        }

        //already discovered
        if(Progression.instance.get("pathDiscovered")[currentWay.wayName] === true) {
            return;
        }

        //if we are in a street we already have discovered or doing going back
        if(!_.isUndefined(Progression.instance.get("pathDiscovered")[currentWay.wayName]) && Progression.instance.get("pathDiscovered")[currentWay.wayName].length > currentPositionInStreet) {
            return;
        }

        var currentProgressionInStreet = _.slice(_.values(currentWay.wayPath),0,currentPositionInStreet);

        Progression.instance.get("pathDiscovered")[currentWay.wayName] = currentProgressionInStreet;
        Progression.instance.trigger("pathDiscoveredUpdated");
    },

    updateMarkerPosition: function(position) {
        var self = this;

        if(!self.mapLoaded) {
            return;
        }

        self.currentPosition = position;

        if(self.markerMap) {
            self.markerMap.setLatLng(position);
        }
        else {
            if(self.map) {
                self.markerMap = L.marker(position).addTo(self.map);
                self.markerMap.setIcon(L.mapbox.marker.icon({
                        'marker-size': 'large',
                        'marker-symbol': 'pitch',
                        'marker-color': '#1087bf'
                }));
            }
            
        }
        
    },

    centerMarker: function() {
        var self = this;
        self.map.panTo(self.currentPosition);
    },

    toggleBigMap: function() {
        var self = this;

        if(self.enlarged) {
            self.reduceMap();
        }
        else {
            self.enlargeMap();
        }
    },

    enlargeMap: function() {
        var self = this;

        if(self.enlarged || self.isChangingSize) {
            return;
        }

        self.isChangingSize = true;

        //CAN'T USE GSAP BECAUSE OF WIDTH SET, doesn't work with Gsap, it set outerwidth
        self.$el.one("webkitTransitionEnd oTransitionEnd MSTransitionEnd transitionend", function() {
            self.$el.addClass("enlarged");
            self.map.setZoom(16);
            self.map.invalidateSize(true);
            self.enlarged = true;
            self.isChangingSize = false;
            self.trigger("centerMarker");
        });

        var height = self.$el.height();
        self.$el.height(height*2.5);
        self.$el.width(height*2.5);
    },

    reduceMap: function() {
        var self = this;

        if(!self.enlarged || self.isChangingSize) {
            return;
        }

        self.isChangingSize = true;

        self.$el.one("webkitTransitionEnd oTransitionEnd MSTransitionEnd transitionend", function() {
            self.$el.removeClass("enlarged");
            self.map.setZoom(17);
            self.map.invalidateSize(true);
            self.enlarged = false;
            self.isChangingSize = false;
            self.trigger("centerMarker");
        });

        var height = self.$el.height();
        self.$el.height(height/2.5);
        self.$el.width(height/2.5);
        
    },

    showHelpGoToStreet: function(e) {
        var calloutMgr = hopscotch.getCalloutManager();
        calloutMgr.createCallout({
              id: 'goto-marker',
              target: e.target._icon,
              placement: 'top',
              title: Localization.STR.tutorialShortCutMapTitle,
              content: Localization.STR.tutorialShortCutMapDescription + '<p><button class="btn-gotostreet btn-secondary hopscotch-cta btn">'+ Localization.STR.tutorialDirectUnlockBtnGoDirectly + '</button> <button class="hopscotch-close hopscotch-nav-button hopscotch-cta btn">' + Localization.STR.tutorialDirectUnlockBtnPreferSearch +'</button></p>',
              onShow: function() {
                 $(".streetwalk-tutorial-overlay").show();
              },
              onCTA: function() {
                //in case we are in the tutorial
                $(".streetwalk-tutorial-overlay").hide();
              },
              onClose: function() {
                $(".streetwalk-tutorial-overlay").hide();
              }
        });

        $(".btn-gotostreet").one("click",function() {
            window.location.href = "#streetwalk/"+ e.target.feature.properties.way;
        });
    },

    onClose: function(){
      var self = this;
      //Clean
      self.undelegateEvents();
      self.mapLoaded = false;
      self.markerMap =  undefined;
      self.stopListening();
    }

  });

  return new MapView();
  
});


