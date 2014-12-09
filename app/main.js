require.config({
    baseUrl: 'app',
    paths: {
        jquery:       'libs/vendor/jquery-2.0.3.min',
        rAF:          'libs/vendor/rAF',
        json:         'libs/vendor/json-0.3.1',
        underscore:   'libs/vendor/lodash-2.2.1.min',
        backbone:     'libs/vendor/backbone-1.1.0.min',
        stickit:      'libs/vendor/backbone.stickit-0.8.min',
        popcorn:      'libs/vendor/popcorn-1.5.6.min',
        howl:         'libs/vendor/howler-1.1.14',
        text:         'libs/vendor/text-2.0.10',
        fastclick:    'libs/vendor/fastclick.min',
        snap:         'libs/vendor/snap.svg-min',
        mapbox:       'libs/vendor/mapbox-2.1.2.min',
        models:       'models',
        views:        'views',
        utils:        'utils',
        templates:    '../templates',
        data:         '../data'
    },
    shim: {
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone',
            init: function() {
                Backbone.$ = window.$;
            }
        },
        'underscore': {
            exports: '_'
        }
    },
    waitSeconds: 0
});


define(['jquery',
        'underscore',
        'backbone',
        'fastclick',
        'utils/Logger',
        'routers/router',
        'rAF',
        'mapbox',
        'stickit'], function($, _,
                            Backbone,
                            FastClick,
                            LOGGER,
                            Router) {

    $(document).ready(function() {

         //Fast click
        FastClick.attach(document.body);

        //Instantiate Router
        var router = new Router();

        //Start app Router
        Backbone.history.start();
        
    });

});