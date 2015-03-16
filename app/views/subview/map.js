define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'
        ],
function($, _, Backbone,
                LOGGER){

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

        L.mapbox.accessToken = 'pk.eyJ1IjoidGR1cmFuZCIsImEiOiI0T1ZEWlRVIn0.1PEGeiEWz6RUBfZq9Bvy7Q';
            
        self.map = L.mapbox.map('streetwalk-mapcontainer', 'tdurand.l4njnee1',{
            zoomControl: false,
            attributionControl: false,
            minZoom: 16,
            maxZoom: 17,
            maxBounds:[[6.24327071884627,-75.57523012161253],[6.254767683129394,-75.56199073791504]]
        });

        self.listenTo(self.map,"load", function() {
            self.trigger("loaded");
            self.mapLoaded = true;

            self.map.panTo(positionInit);
            self.updateMarkerPosition(positionInit);
            self.map.touchZoom.disable();
            self.map.doubleClickZoom.disable();
            self.map.scrollWheelZoom.disable();
            // Disable tap handler, if present.
            if (self.map.tap) map.tap.disable();
            self.addAllCharacterToMap();

            self.$el.find(".streetwalk-mapcontainer").hover(function() {
                self.enlargeMap();
            },function() {
                self.reduceMap();
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
    },

    addAllCharacterToMap: function() {
        var self = this;

        var geoJson = [];

        var layerCharacters = L.mapbox.featureLayer(geoJson).addTo(self.map);

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
                "title": characterPosition.name,
                "way":characterPosition.way,
                "wayReverse": Ways.getReverseWayName(characterPosition.way),
                "icon": {
                    "iconUrl": self.getIconPath(characterPosition.name,characterPosition.way),
                    "iconSize": [40, 40], // size of the icon
                    "iconAnchor": [20, 20], // point of the icon which will correspond to marker's location
                    "popupAnchor": [0, -20], // point from which the popup should open relative to the iconAnchor
                    "className": characterPosition.name + " " + characterPosition.way + " " + Ways.getReverseWayName(characterPosition.way)
                }
                }
            });
        });

        // Set a custom icon on each marker based on feature properties.
        layerCharacters.on('layeradd', function(e) {
            var marker = e.layer,
                feature = marker.feature;

            marker.setIcon(L.icon(feature.properties.icon));
        });

        layerCharacters.setGeoJSON(geoJson);
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

    update: function(position) {
        var self = this;
        self.updateMarkerPosition(position);
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
            }
            
        }
        
    },

    centerMarker: function() {
        var self = this;
        self.map.panTo(self.currentPosition);
    },

    enlargeMap: function() {
        var self = this;

        if(self.enlarged || self.isChangingSize || self.moving) {
            return;
        }

        self.isChangingSize = true;

        //CAN'T USE GSAP BECAUSE OF WIDTH SET, doesn't work with Gsap, it set outerwidth
        self.$el.one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.$el.addClass("enlarged");
            self.map.setZoom(16);
            self.map.invalidateSize(true);
            self.enlarged = true;
            self.isChangingSize = false;
            self.trigger("centerMarker");
            //TODO see why doesn't work
            self.centerMarker();
        });

        var height = self.$el.height();
        self.$el.height(height*2.5);
        self.$el.width(height*2.5);
    },

    reduceMap: function() {
        var self = this;

        if(!self.enlarged || self.isChangingSize || self.moving) {
            return;
        }

        self.isChangingSize = true;

        self.$el.one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.$el.removeClass("enlarged");
            self.map.setZoom(17);
            self.map.invalidateSize(true);
            self.enlarged = false;
            self.isChangingSize = false;
            self.trigger("centerMarker");
            //TODO see why doesn't work
            self.centerMarker();
        });

        var height = self.$el.height();
        self.$el.height(height/2.5);
        self.$el.width(height/2.5);
        
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
      this.markerMap =  undefined;
    }

  });

  return new MapView();
  
});


