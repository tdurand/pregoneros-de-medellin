define([
        'jquery',
        'underscore',
        'backbone',
        'utils/AppView',
        'utils/Localization',
        'views/index',
        'views/streetwalk'
        ],
    function($, _, Backbone,
                    AppView,
                    Localization,
                    IndexView,
                    StreetWalkView) {

        var Router = Backbone.Router.extend({
            routes: {
                '':                                     'index',
                'index':                                'index',
                'streetwalk':                           'streetwalk',
                'streetwalk/:wayName':                  'streetwalk'
             },

        initialize: function() {
            var self = this;

            // Localization.on("STRSuccess",function() {
            //     self.navigate("#"+Localization.translationLoaded, {trigger:false,replace:true});
            // });

            // Localization.init(lang);
        },

        index: function() {
            var indexView = new IndexView();

            indexView = AppView.show(indexView);
            AppView.changePage(indexView);

        },

        streetwalk: function(wayName) {

            var self = this;

            if(_.isUndefined(wayName)) {
                wayName = "carabobo-cl53-cl52";
                self.navigate("#streetwalk/carabobo-cl53-cl52",{replace:true});
            }

            var streetWalkView = new StreetWalkView({
                wayName : wayName
            });

            streetWalkView = AppView.show(streetWalkView);
            AppView.changePage(streetWalkView);
        }

    });

    return Router;

});