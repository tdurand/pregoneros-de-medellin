define([
        'jquery',
        'underscore',
        'backbone',
        'utils/AppView',
        'views/index',
        'views/streetwalk'
        ],
    function($, _, Backbone,
                    AppView,
                    IndexView,
                    StreetWalkView) {

        var Router = Backbone.Router.extend({
            routes: {
                '':                                     'streetwalk',
                'index':                                'index',
                'streetwalk':                           'streetwalk',
                'streetwalk/:way/:nbImages':            'streetwalk'
             },

        initialize: function() {
            var self = this;

        },

        index: function() {
            var indexView = new IndexView();

            indexView = AppView.show(indexView);
            AppView.changePage(indexView);

        },

        streetwalk: function(way,nbImages) {
            var streetWalkView = new StreetWalkView({
                way : way,
                nbImages : nbImages
            });

            streetWalkView = AppView.show(streetWalkView);
            AppView.changePage(streetWalkView);
        }

    });

    return Router;

});