define(['jquery',
    'underscore',
    'backbone',
    'models/Sounds',
    'utils/Logger',
    'text!templates/streetwalk/soundEditorViewTemplate.html',
    'text!templates/streetwalk/soundEditorSoundInfoViewTemplate.html'
    ],
    function($, _, Backbone,
        Sounds,
        LOGGER,
        soundEditorViewTemplate,
        soundEditorSoundInfoViewTemplate){

      var SoundEditorView = Backbone.View.extend({

        el:"#streetwalk-soundeditor",

        events:{
            "click .streetwalk-soundeditor-btnclose":"closeEditor",
            "click .streetwalk-soundeditor-btnupdate":"updateSound"
        },

        initialize : function(way) {
            var self = this;

            self.way = way;

            L.mapbox.accessToken = "pk.eyJ1IjoidGR1cmFuZCIsImEiOiI0T1ZEWlRVIn0.1PEGeiEWz6RUBfZq9Bvy7Q";

            self.render();

            self.markerLibrary = {
                punctual : L.mapbox.marker.icon({
                        'marker-size': 'large',
                        'marker-symbol': 'marker-stroked',
                        'marker-color': '#6B60E6'
                }),
                punctualSelected : L.mapbox.marker.icon({
                        'marker-size': 'large',
                        'marker-symbol': 'marker-stroked',
                        'marker-color': '#fa0'
                }),
                ambient : L.mapbox.marker.icon({
                        'marker-size': 'large',
                        'marker-symbol': 'circle-stroked',
                        'marker-color': '#6B60E6'
                }),
                ambientSelected : L.mapbox.marker.icon({
                        'marker-size': 'large',
                        'marker-symbol': 'circle-stroked',
                        'marker-color': '#fa0'
                })
            };
        },

        initMapContent : function() {
            var self = this;

            //Add sounds markers
            _.each(Sounds.models,function(waySound) {
                var position = waySound.get("position");

                var marker = L.marker(new L.LatLng(position[0], position[1]), {
                    draggable: true,
                    icon:self.getMarkerIcon(waySound.get("type"))
                });

                marker.soundReference = waySound;

                marker.on("click",function(e) {
                    var soundReference = e.target.soundReference;

                    self.map.panTo(e.latlng);

                    //clear previousmaker
                    if(self.currentMarker) {
                        self.currentMarker.setIcon(self.getMarkerIcon(self.currentSoundEditing.get("type")));
                    }
                    
                    self.currentSoundEditing = soundReference;
                    self.currentMarker = e.target;

                    //set market selected
                    self.currentMarker.setIcon(self.getSelectedMarkerIcon(self.currentSoundEditing.get("type")));

                    self.renderSoundInfo();

                });

                marker.on("dragend", function(e) {
                    var soundReference = e.target.soundReference;
                    var newPosition = e.target.getLatLng();

                    soundReference.set("position",[newPosition.lat,newPosition.lng]);

                    Sounds.updateSounds(Sounds.currentUserPosition);

                });

                marker.addTo(self.map);
            });

            //ADD PATH OF WAY TO THE MAP
            var pathLine = [];

            $.each(self.way.originalWayPath, function(index, wayPathPoint) {
                pathLine.push(wayPathPoint.reverse());
            });

            self.firstPointOfPolyline = pathLine[0];

            var polyline_options = {
                color: '#000'
            };

            var polyline = L.polyline(pathLine, polyline_options).addTo(self.map);

            self.map.panTo(self.firstPointOfPolyline);

            //Add current user position
            self.markerUserPosition = L.marker(new L.LatLng(Sounds.currentUserPosition[0], Sounds.currentUserPosition[1]), {
                icon:L.mapbox.marker.icon({
                        'marker-size': 'large',
                        'marker-symbol': 'triangle-stroked',
                        'marker-color': '#88E87C'
                })
            });

            self.markerUserPosition.addTo(self.map);
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(soundEditorViewTemplate,{
            way : self.way
        }));

        self.map = L.mapbox.map('streetwalk-soundeditor-mapcontainer', 'tdurand.kojgk1k3',{
            accessToken: 'pk.eyJ1IjoidGR1cmFuZCIsImEiOiI0T1ZEWlRVIn0.1PEGeiEWz6RUBfZq9Bvy7Q'
        });

        self.map.on("load", function() {
            self.mapLoaded = true;
            self.closeEditor();
            self.initMapContent();
        });
    },

    renderSoundInfo: function() {
        var self = this;

        self.$el.find(".streetwalk-soundeditor-panel-soundinfo").html(_.template(soundEditorSoundInfoViewTemplate,{
            sound : self.currentSoundEditing
        }));
    },

    refreshEditorMapAfterMoving: function() {
        var self = this;

        self.markerUserPosition.setLatLng(new L.LatLng(Sounds.currentUserPosition[0], Sounds.currentUserPosition[1]));
    },

    closeEditor: function() {
        var self = this;
        self.$el.hide();
    },

    updateSound: function(e) {
        var self = this;
        e.preventDefault();

        var soundPath = self.$el.find(".sound-path").val();
        var soundDb = parseInt(self.$el.find(".sound-db").val(),10);
        var soundType = self.$el.find(".sound-type").val();

        if(self.currentSoundEditing.get("path") == soundPath) {
            //just update db and type
            self.currentSoundEditing.set("db",soundDb);
            self.currentSoundEditing.set("type",soundType);
        }
        else {
            //need to reload sound
        }


        Sounds.updateSounds(Sounds.currentUserPosition);
    },

    getSelectedMarkerIcon: function(type) {
        var self = this;
        var markerIcon = self.markerLibrary.punctualSelected;
        if(type == "ambient") {
            markerIcon = self.markerLibrary.ambientSelected;
        }
        return markerIcon;
    },

    getMarkerIcon: function(type) {
        var self = this;
        var markerIcon = self.markerLibrary.punctual;
        if(type == "ambient") {
            markerIcon = self.markerLibrary.ambient;
        }
        return markerIcon;
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
  }

});

return SoundEditorView;

});


