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

            Progression.initialize();
            Progression.fetch();

            // self.listenTo(Localization,"STRSuccess",function() {
            //     self.navigate("#"+Localization.translationLoaded, {trigger:false,replace:true});
            // });

            // Localization.init(lang);
        },

        index: function() {
            var indexView = new IndexView();

            Progression.instance.viewedLandingPage = true;

            indexView = AppView.show(indexView);
            AppView.changePage(indexView);

        },

        streetwalk: function(wayName) {

            var self = this;

            // if(!Progression.instance.instanceviewedLandingPage) {
            //     self.navigate("#index",{trigger:true,replace:true});
            //     return;
            // }

            if(_.isNull(wayName)) {
                var currentStreet = Progression.instance.get("currentStreet");
                if(currentStreet !== "") {
                    wayName = currentStreet;
                }
                else {
                    wayName = "carabobo-cl53-cl52";
                }
                self.navigate("#streetwalk/" + wayName,{replace:true});
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