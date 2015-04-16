/*
 * This is an example build file that demonstrates how to use the build system for
 * require.js.
 *
 * THIS BUILD FILE WILL NOT WORK. It is referencing paths that probably
 * do not exist on your machine. Just use it as a guide.
 *
 *
 */

({
    //The top level directory that contains your app. If this option is used
    //then it assumed your scripts are in a subdirectory under this path.
    //This option is not required. If it is not specified, then baseUrl
    //below is the anchor point for finding things. If this option is specified,
    //then all the files from the app directory will be copied to the dir:
    //output area, and baseUrl will assume to be a relative path under
    //this directory.
    appDir: "app/",

    //By default, all modules are located relative to this path. If baseUrl
    //is not explicitly set, then all modules are loaded relative to
    //the directory that holds the build file. If appDir is set, then
    //baseUrl should be specified as relative to the appDir.
    baseUrl: "./",

    //By default all the configuration for optimization happens from the command
    //line or by properties in the config file, and configuration that was
    //passed to requirejs as part of the app's runtime "main" JS file is *not*
    //considered. However, if you prefer the "main" JS file configuration
    //to be read for the build so that you do not have to duplicate the values
    //in a separate configuration, set this property to the location of that
    //main JS file. The first requirejs({}), require({}), requirejs.config({}),
    //or require.config({}) call found in that file will be used.
    mainConfigFile: 'app/main.js',

    paths: {
        // "jquery": "empty:"
    },

    //The directory path to save the output. If not specified, then
    //the path will default to be a directory called "build" as a sibling
    //to the build file. All relative paths are relative to the build file.
    dir: "app-build/",

    //How to optimize all the JS files in the build output directory.
    //Right now only the following values
    //are supported:
    //- "uglify": (default) uses UglifyJS to minify the code.
    //- "uglify2": in version 2.1.2+. Uses UglifyJS2.
    //- "closure": uses Google's Closure Compiler in simple optimization
    //mode to minify the code. Only available if running the optimizer using
    //Java.
    //- "closure.keepLines": Same as closure option, but keeps line returns
    //in the minified files.
    //- "none": no minification will be done.
    optimize: "uglify2",

    //If using UglifyJS for script optimization, these config options can be
    //used to pass configuration values to UglifyJS.
    //See https://github.com/mishoo/UglifyJS for the possible values.
    uglify: {
        toplevel: true,
        ascii_only: true,
        beautify: false,
        max_line_length: 1000,

        //How to pass uglifyjs defined symbols for AST symbol replacement,
        //see "defines" options for ast_mangle in the uglifys docs.
        defines: {
            DEBUG: ['name', 'false']
        },

        //Custom value supported by r.js but done differently
        //in uglifyjs directly:
        //Skip the processor.ast_mangle() part of the uglify call (r.js 2.0.5+)
        no_mangle: true
    },


    modules: [
        {
            name:"main",
            // Use the *shallow* exclude; otherwise, dependencies of
            // the FAQ module will also be excluded from this build
            // (including jQuery and text and util modules). In other
            // words, a deep-exclude would override our above include.
            excludeShallow: [
                //streetwalk stuff
                "views/streetwalk",
                "text!templates/streetwalk/menuCharactersViewTemplate.html",
                "text!templates/svg/svgMenuJaleTemplate.html",
                "text!templates/svg/svgMenuPajaritoTemplate.html",
                "text!templates/streetwalk/soundEditorViewTemplate.html",
                "text!templates/streetwalk/soundEditorSoundInfoViewTemplate.html",
                "text!templates/streetwalk/menu/menuStreetWalkViewTemplate.html",
                "text!templates/streetwalk/streetWalkViewTemplate.html",
                "text!templates/streetwalk/streetWalkLoadingViewTemplate.html",
                "text!templates/streetwalk/streetWalkChoosePathStartViewTemplate.html",
                "text!templates/streetwalk/streetWalkChoosePathEndViewTemplate.html",
                "text!templates/svg/svgSignTopProgressTemplate.html",
                "text!templates/svg/svgSignTopAreaTemplate.html",
                "text!templates/svg/svgFramePajaritoTemplate.html",
                "text!templates/svg/svgFrameJaleTemplate.html",
                "text!templates/svg/svgScrollToStartES.html",
                //libs
                "mapbox",
                "tweenmax"
            ],
            exclude: [
                "views/subview/menucharacters.js",
                "views/subview/soundeditor.js",
                "views/subview/menustreetwalk.js",
                "views/subview/tutorial.js",
                "views/subview/map.js"
            ]
        },
        {
            name:"views/streetwalk",
            exclude: [
                "views/usermanager.js",
                "text!templates/usermanager/askToCreateAccountViewTemplate.html",
                "text!templates/usermanager/createAccountViewTemplate.html",
                "text!templates/usermanager/signInViewTemplate.html",
                "text!templates/usermanager/successAccountCreationViewTemplate.html",
                "text!templates/usermanager/successSignInViewTemplate.html",
                "text!templates/usermanager/alertBeforeLogout.html",
                "text!templates/usermanager/askToShareViewTemplate.html",
                "libs/vendor/jquery-2.0.3.min.js",
                "libs/vendor/lodash-3.1.0.min.js",
                "libs/vendor/backbone-1.1.2.min.js",
                "libs/vendor/fastclick.min.js",
                "models/ProgressionModel.js",
                "models/Progression.js",
                "models/Sound.js",
                "models/Sounds.js",
                "models/Ways.js",
                "models/Way.js",
                "models/Stills.js",
                "utils/Logger.js",
                "utils/AppView.js",
                "utils/LocalParams.js",
                "utils/Localization.js",
                "utils/Constant.js",
                "models/Still.js",
                "utils/GeoUtils.js",
                "utils/Logger.js",
                "libs/vendor/howler-2.0-beta.min.js",
                "models/Way.js",
                "libs/vendor/text-2.0.10.js",
                "libs/vendor/json-0.3.1.js",
                "json!content/ways.json"
            ]
        }
    ],

    removeCombined: true,

    //Defines the loading time for modules. Depending on the complexity of the
    //dependencies and the size of the involved libraries, increasing the wait
    //interval may be required. Default is 7 seconds. Setting the value to 0
    //disables the waiting interval.
    waitSeconds: 7

})