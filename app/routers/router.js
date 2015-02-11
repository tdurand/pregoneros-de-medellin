define([
        'jquery',
        'underscore',
        'backbone',
        'utils/AppView',
        'utils/Localization',
        'models/Progression',
        'views/index',
        'views/streetwalk'
        ],
    function($, _, Backbone,
                    AppView,
                    Localization,
                    Progression,
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

            // self.listenTo(Localization,"STRSuccess",function() {
            //     self.navigate("#"+Localization.translationLoaded, {trigger:false,replace:true});
            // });

            // Localization.init(lang);
        },

        index: function() {
            var indexView = new IndexView();

            Progression.viewedLandingPage = true;

            indexView = AppView.show(indexView);
            AppView.changePage(indexView);

        },

        streetwalk: function(wayName) {

            var self = this;

            // if(!Progression.viewedLandingPage) {
            //     self.navigate("#index",{trigger:true,replace:true});
            //     return;
            // }

            if(_.isNull(wayName)) {
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