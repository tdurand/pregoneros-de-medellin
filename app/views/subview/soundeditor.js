define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'text!templates/streetwalk/soundEditorViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                soundEditorViewTemplate){

  var SoundEditorView = Backbone.View.extend({

    el:"#streetwalk-soundeditor",

    events:{
        "click .streetwalk-soundeditor-btnclose":"closeEditor"
    },

    initialize : function(way) {
        var self = this;

        self.way = way;

        self.render();
    },

    initMapContent : function() {
        var self = this;
        $.each(self.way.waySoundsData, function(index, waySound) {
            var marker = L.marker(new L.LatLng(waySound.position[0], waySound.position[1]), {
                draggable: true
            });

            marker.addTo(self.map);
        });
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

    closeEditor: function() {
        var self = this;
        self.$el.hide();
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return SoundEditorView;
  
});


