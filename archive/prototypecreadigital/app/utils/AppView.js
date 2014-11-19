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