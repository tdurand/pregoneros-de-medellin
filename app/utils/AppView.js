define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger'],
        function($, _,
                Backbone,
                LOGGER) {

    //Utility to manage views/page change and transition
    var AppView = {

        init: function() {
            var self = this;

        },

        show: function(view) {
            if (this.currentView){
              this.currentView.onClose();
              this.lastView = this.currentView;
            }
         
            this.currentView = view;
            this.currentView.prepare();

            return view;
        },

        showModalPage: function(view) {
            if(this.currentView) {
                this.lastView = this.currentView;

                if(this.lastView.el.id == "streetwalk") {
                    //pause streetwalk
                    this.lastView.pause();
                }
            }

            this.currentView = view;
        },

        closeModalPage: function() {
            this.currentView = this.lastView;

            if(this.lastView.el.id == "streetwalk") {
                //play streetwalk
                this.lastView.play();
            }
        },

        changePage: function(view) {
            if(this.lastView) {
                this.lastView.$el.hide();
            }
            view.$el.show();
        }


    };

    _.extend(AppView, Backbone.Events);
    
    return AppView;
});