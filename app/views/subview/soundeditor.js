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

    initialize : function() {
        var self = this;

        self.render();
        
        self.map = L.mapbox.map('streetwalk-soundeditor-mapcontainer', 'tdurand.kojgk1k3',{
            accessToken: 'pk.eyJ1IjoidGR1cmFuZCIsImEiOiI0T1ZEWlRVIn0.1PEGeiEWz6RUBfZq9Bvy7Q'
        });

        self.map.on("load", function() {
            self.mapLoaded = true;
            self.closeEditor();
        });
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(soundEditorViewTemplate));
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


