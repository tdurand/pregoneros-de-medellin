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
            attributionControl: false,
            minZoom: 16,
            maxZoom: 19,
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

            self.$el.find(".streetwalk-mapcontainer").hover(function() {
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

        if(self.enlarged || self.isChangingSize || self.moving) {
            return;
        }

        self.isChangingSize = true;

        //CAN'T USE GSAP BECAUSE OF WIDTH SET, doesn't work with Gsap, it set outerwidth
        self.$el.one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function() {
            self.map.setZoom(17);
            self.map.invalidateSize(true);
            self.enlarged = true;
            self.isChangingSize = false;
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
            self.map.setZoom(19);
            self.map.invalidateSize(true);
            self.enlarged = false;
            self.isChangingSize = false;
            self.map.boxZoom.disable();
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


