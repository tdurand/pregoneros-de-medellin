define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'
        ],
function($, _, Backbone,
                LOGGER){

  var MapView = Backbone.View.extend({

    prepare: function(positionInit) {
        var self = this;

        self.setElement(".streetwalk-map");

        self.initMap(positionInit);
    },

    initMap: function(positionInit) {
        var self = this;

        self.map = L.mapbox.map('streetwalk-mapcontainer', 'tdurand.l4njnee1',{
            accessToken: 'pk.eyJ1IjoidGR1cmFuZCIsImEiOiI0T1ZEWlRVIn0.1PEGeiEWz6RUBfZq9Bvy7Q',
            zoomControl: false,
            attributionControl: false
        });

        self.listenTo(self.map,"load", function() {
            self.trigger("loaded");
            self.mapLoaded = true;

            self.map.panTo(positionInit);
            self.updateMarkerPosition(positionInit);
            // Disable drag and zoom handlers.
            // self.map.dragging.disable();
            self.map.touchZoom.disable();
            self.map.doubleClickZoom.disable();
            self.map.scrollWheelZoom.disable();
            // Disable tap handler, if present.
            if (self.map.tap) map.tap.disable();

            self.$el.find("#streetwalk-mapcontainer").hover(function() {
                self.enlargeMap();
            },function() {
                self.reduceMap();
            });
        });
    },

    adjustMapSizes: function() {
        var self = this;


        self.$el.one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.map.invalidateSize(true);
        });

        self.$el.width(self.$el.height());

        //Special btn menu case
        self.$el.find(".streetwalk-btnmenu-wrapper").css("left",self.$el.find(".streetwalk-map").height()+150+"px");
        
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

        if(self.markerMap) {
            self.markerMap.setLatLng(position);
        }
        else {
            if(self.map) {
                self.markerMap = L.marker(position).addTo(self.map);
            }
            
        }
        
    },

    enlargeMap: function() {
        var self = this;

        //TODO CONVERT CODE TO GSAP
        //
        console.log("DisplayBigMap");
        // self.$el.find(".streetwalk-map").one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
        //     self.adjustMapSizes();
        // });

        self.$el.one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.map.invalidateSize(true);
        });

        var height = self.$el.find(".streetwalk-map").height();
        self.$el.find(".streetwalk-map").height(height*2);
        self.$el.find(".streetwalk-map").width(height*2);
    },

    reduceMap: function() {
        var self = this;

        //TODO CONVERT CODE TO GSAP
        //
        console.log("ReduceMap");

        self.$el.one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.map.invalidateSize(true);
        });

        var height = self.$el.height();
        self.$el.height(height/2);
        self.$el.width(height/2);
        
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new MapView();
  
});


