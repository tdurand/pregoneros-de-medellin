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
            "click .streetwalk-soundeditor-btnupdate":"updateSound",
            "click .streetwalk-soundeditor-addsound":"addSound",
            "click .streetwalk-soundeditor-deletesound":"deleteSound",
            "click .streetwalk-soundeditor-export":"exportJSON"
        },

        newSoundId:0,

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
                    var marker = e.target;
                    self.selectMarker(marker);
                });

                marker.on("dragend", function(e) {
                    self.updateSoundPositionOnDragEnd(e);
                });

                // marker.addTo(self.map);
                self.map.addLayer(marker);
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

    addNewMarker: function(position,soundReference) {
        var self = this;

        var marker = L.marker(new L.LatLng(position[0], position[1]), {
            draggable: true,
            icon:self.getMarkerIcon("ambient")
        });

        marker.soundReference = soundReference;

        // marker.addTo(self.map);
        self.map.addLayer(marker);

        marker.on("click",function(e) {
            var marker = e.target;
            self.selectMarker(marker);
        });

        marker.on("dragend", function(e) {
            self.updateSoundPositionOnDragEnd(e);
        });

        return marker;
    },

    removeMarker : function(marker) {
        var self = this;
        self.map.removeLayer(marker);
    },

    selectMarker: function(marker) {
        var self = this;

        var soundReference = marker.soundReference;

        self.map.panTo(marker.getLatLng());

        //clear previousmaker
        if(self.currentMarker) {
            self.currentMarker.setIcon(self.getMarkerIcon(self.currentSoundEditing.get("type")));
        }
        
        self.currentSoundEditing = soundReference;
        self.currentMarker = marker;

        //set market selected
        self.currentMarker.setIcon(self.getSelectedMarkerIcon(self.currentSoundEditing.get("type")));

        self.renderSoundInfo();
    },

    updateSoundPositionOnDragEnd: function(e) {
        var soundReference = e.target.soundReference;
        var newPosition = e.target.getLatLng();

        soundReference.set("position",[newPosition.lat,newPosition.lng]);

        Sounds.updateSounds(Sounds.currentUserPosition);
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

    clearSoundInfo: function() {
        var self = this;

        self.$el.find(".streetwalk-soundeditor-panel-soundinfo").html("");
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

        self.currentSoundEditing.set("db",soundDb);
        self.currentSoundEditing.set("type",soundType);

        if(self.currentSoundEditing.get("path") != soundPath) {
            //verify that soundpath doesn't exist yet
            if(Sounds.get(soundPath)) {
                console.error("Sound already exist");
                return;
            }
            //need to reload sound
            self.currentSoundEditing.set("path",soundPath);
            self.currentSoundEditing.unload();
            self.currentSoundEditing.loadSound();
        }

        Sounds.updateSounds(Sounds.currentUserPosition);
    },

    addSound: function(e) {
        var self = this;

        e.preventDefault();

        //default values
        var waySound = {
            db: 10,
            type: "ambient",
            path: self.newSoundId,
            position: Sounds.currentUserPosition
        };

        self.newSoundId++;

        //create sound
        var sound = Sounds.addSound(waySound);

        //create marker
        var marker = self.addNewMarker(waySound.position,sound);

        //select marker
        self.selectMarker(marker);

        //renderSound
        Sounds.updateSounds(Sounds.currentUserPosition);
    },

    deleteSound: function(e) {
        var self = this;

        e.preventDefault();

        Sounds.removeSound(self.currentSoundEditing);

        self.removeMarker(self.currentMarker);

        self.clearSoundInfo();
    },

    exportJSON: function(e) {
        var self = this;
        e.preventDefault();
        console.log(JSON.stringify(Sounds.toJSON()));
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


