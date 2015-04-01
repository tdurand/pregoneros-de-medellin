define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'text!templates/page/transmediaViewTemplate.html',
        'text!templates/page/musicViewTemplate.html',
        'text!templates/page/teamViewTemplate.html',
        'text!templates/page/makingOfViewTemplate.html',
        'text!templates/page/pressKitViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                TransmediaView,
                MusicView,
                TeamView,
                MakingOfView,
                PressKitView){

  var PageView = Backbone.View.extend({

    el:"#page",

    events:{
        "click .page-btnclose":"closeView"
    },

    initialize : function() {
        var self = this;
        
    },

    //Account renders
    renderTransmediaViewTemplate: function() {
         var self = this;

         self.$el.html(_.template(TransmediaView));
    },

    renderMusicViewTemplate: function(e) {
        var self = this;

        self.$el.html(_.template(MusicView));
    },

    renderTeamView: function() {
        var self = this;

         self.$el.html(_.template(TeamView));
    },

    renderMakingOfView: function(e) {
        var self = this;

        self.$el.html(_.template(MakingOfView));
    },

    renderPressKitView: function() {
        var self = this;

         self.$el.html(_.template(PressKitView));
    },

    closeView: function() {
        var self = this;

        TweenLite.fromTo("#page",0.7,{y:"0%"},{y:"-100%",ease:Power1.easeInOut,onComplete:function() {
            $("#page").addClass("hidden");
            self.trigger("closePage");
        }});

    },

    showView: function() {
        $("#page").removeClass("hidden");
        TweenLite.fromTo("#page",0.7,{y:"-100%"},{y:"0%",ease:Power1.easeInOut});
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new PageView();
  
});


