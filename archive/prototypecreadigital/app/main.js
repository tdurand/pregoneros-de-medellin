require.config({
    baseUrl: 'app',
    paths: {
        jquery:       'libs/vendor/jquery-2.0.3.min',
        underscore:   'libs/vendor/lodash-2.2.1.min',
        backbone:     'libs/vendor/backbone-1.1.0.min',
        popcorn:      'libs/vendor/popcorn-complete-1.3',
        howl:         'libs/vendor/howler-1.1.14',
        text:         'libs/vendor/text-2.0.10',
        fastclick:    'libs/vendor/fastclick.min',
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
        'routers/router',
        'fastclick',
        'utils/Logger'], function($, _,
                            Backbone,
                            Router,
                            FastClick,
                            LOGGER) {

    $(document).ready(function() {

         //Fast click
        FastClick.attach(document.body);

        //Instantiate Router
        var router = new Router();

        //Start app Router
        Backbone.history.start();
        
    });

});