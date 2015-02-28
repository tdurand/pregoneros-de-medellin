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
                'index/:lang':                          'index',
                'streetwalk':                           'streetwalk',
                'streetwalk/:wayName':                  'streetwalk',
                'streetwalk/:wayName/:lang':            'streetwalk',
                ':lang':                                'index'
             },

        initialize: function() {
            var self = this;

            Progression.initialize();
            Progression.fetch();
        },

        initLocalization: function(lang) {

            var self = this;

            self.listenToOnce(Localization,"STRSuccess",function() {
                if(AppView.currentView.el.id == "index") {
                    self.navigate("#"+Localization.translationLoaded, {trigger:false,replace:true});
                }
            });

            self.listenToOnce(Localization,"STRChanged",function() {
                if(AppView.currentView.el.id == "index") {
                    self.index(Localization.translationLoaded);
                }
            });

            Localization.init(lang);
        },

        index: function(lang) {

            var self = this;

            self.initLocalization(lang);

            var indexView = new IndexView();

            Progression.instance.viewedLandingPage = true;

            indexView = AppView.show(indexView);
            AppView.changePage(indexView);

        },

        streetwalk: function(wayName, lang) {

            var self = this;

            // if(!Progression.instance.instanceviewedLandingPage) {
            //     self.navigate("#index",{trigger:true,replace:true});
            //     return;
            // }

            self.initLocalization(lang);

            if(_.isUndefined(wayName) || _.isNull(wayName)) {
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