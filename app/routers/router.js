define([
        'jquery',
        'underscore',
        'backbone',
        'utils/AppView',
        'utils/Localization',
        'models/Progression',
        'views/index',
        'views/page'
        // 'views/streetwalk'
        ],
    function($, _, Backbone,
                    AppView,
                    Localization,
                    Progression,
                    IndexView,
                    PageView
                    // StreetWalkView
                    ) {

        var Router = Backbone.Router.extend({
            routes: {
                '':                                     'index',
                'index/:lang':                          'index',
                'streetwalk':                           'streetwalk',
                'streetwalk/:wayName':                  'streetwalk',
                'streetwalk/:wayName/:lang':            'streetwalk',
                'page':                                 'page',
                ':lang':                                'index'
             },

        streetWalkLoaded:false,

        initialize: function() {
            var self = this;

            self.history =  [];

            Progression.initialize();
            Progression.fetch();

            self.StreetWalkView = undefined;

            require([ "views/streetwalk" ], function(streetwalk) {
                self.streetWalkLoaded = true;
                self.StreetWalkView = streetwalk;
            });
        },

        initLocalization: function(lang) {

            var self = this;

            self.listenToOnce(Localization,"STRSuccess",function() {
                if(AppView.currentView.el.id == "index") {
                    self.changeAndStoreFragment("#"+Localization.translationLoaded);
                }
            });

            self.listenToOnce(Localization,"STRChanged",function() {
                if(AppView.currentView.el.id == "index") {
                    self.index(Localization.translationLoaded);
                }

                if(AppView.currentView.el.id == "streetwalk") {
                    //display popup
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

            //IN PRODUCTION DO NOT ALLOW TO GO TO A SPECIFIC WAY
            // if(!Progression.instance.instanceviewedLandingPage) {
            //     self.navigate("#index",{trigger:true,replace:true});
            //     return;
            // }

            if(!self.streetWalkLoaded) {
                require([ "views/streetwalk" ], function(streetwalk) {
                    self.streetWalkLoaded = true;
                    self.StreetWalkView = streetwalk;
                    self.streetwalkRoute(wayName, lang);
                });
            }
            else {
                self.streetwalkRoute(wayName,lang);
            }

        },

        streetwalkRoute: function(wayName, lang) {
            var self  = this;
            

            self.initLocalization(lang);

            if(_.isUndefined(wayName) || _.isNull(wayName)) {
                var currentStreet = Progression.instance.get("currentStreet");
                if(currentStreet !== "") {
                    wayName = currentStreet;
                }
                else {
                    wayName = "plazabotero-start-carabobo";
                }
                self.navigate("#streetwalk/" + wayName,{replace:true});
            }

            var streetWalkView = new self.StreetWalkView({
                wayName : wayName
            });

            streetWalkView = AppView.show(streetWalkView);
            AppView.changePage(streetWalkView);
        },

        page: function(pageName, lang) {
            var self = this;

            self.initLocalization(lang);

            PageView.on("closePage", function() {
                //update URL without triggering
                self.previous();
                PageView.off("closePage");
            });

            PageView.renderTransmediaViewTemplate();
            PageView.showView();
        },

        storeRoute : function() {
            var self = this;
            return self.history.push(Backbone.history.fragment);
        },

        previous : function() {
            var self = this;
            if (self.history.length > 1) {
              return self.changeAndStoreFragment(self.history[self.history.length - 2]);
            }
        },

        changeAndStoreFragment: function(fragment) {
            var self = this;
            self.navigate(fragment);
            self.storeRoute();
        },

        before: function(){
            var self = this;
            self.storeRoute();
        },

        after: function() {

        },

        route : function(route, name, callback) {
              if (!_.isRegExp(route)) route = this._routeToRegExp(route);

              if (_.isFunction(name)) {
                callback = name;
                name = '';
              }

              if (!callback) callback = this[name];

              var router = this;

              Backbone.history.route(route, function(fragment) {
                var args = router._extractParameters(route, fragment);

                if (_.isFunction(router.before)) {
                    router.before();
                }

                router.execute(callback, args);

                if (_.isFunction(router.after)) {
                    router.after();
                }

                router.trigger.apply(router, ['route:' + name].concat(args));
                router.trigger('route', name, args);
                Backbone.history.trigger('route', router, name, args);
              });

              return this;
        }

    });

    return Router;

});