define(['jquery',
        'underscore',
        'backbone',
        'models/Stills',
        'models/Sounds',
        'utils/GeoUtils'
        ],
function($, _, Backbone,
                Stills,
                Sounds,
                GeoUtils){

  var Way = Backbone.Model.extend({

        //Stills
        nbStills:null,
        wayStills:null,

        //States indicators
        percentageLoaded:null,
        loadingFinished:false,

        //Coordinates of the line path
        wayPath:null,
        wayName:null,

        //Connections with other ways
        wayConnectionsStart:null,
        wayConnectionsEnd:null,

        //Sounds
        waySounds:null,

        initialize: function(params) {
            var self = this;

            /*
            Example of parameters

            params = {
                wayName : "way1"
                nbStills : 30
            }
             */

            self.nbStills = params.nbStills;
            self.wayName = params.wayName;
            params.wayPath = GeoUtils.prepareWayPathFromGeoJSONLine(params.wayPath,self.nbStills);
            self.wayPath = params.wayPath;
            self.wayConnectionsEnd = params.wayConnectionsEnd;
            self.wayConnectionsStart = params.wayConnectionsStart;
            self.characterPosition = params.characterPosition;
            self.characterDefinition = params.characterDefinition;

            //Sounds
            self.waySounds = new Sounds();
            self.waySounds.init(params.waySounds);
            self.waySounds.fetch();
            self.waySounds.on("soundsLoaded", function() {
                self.trigger('soundsLoaded');
            });

            //Create the stills collection for this way
            self.wayStills = new Stills();
            self.wayStills.init(params);

            //
            self.wayStills.on("updatePercentageLoaded", function() {
                self.percentageLoaded = self.wayStills.percentageLoaded;
                self.trigger("updatePercentageLoaded");
            });

            self.wayStills.on("loadingFinished", function() {
                self.loadingFinished = true;
                self.trigger("loadingFinished");
            });

            self.wayStills.on("loadingFinishedCompletely", function() {
                self.trigger('loadingFinishedCompletely');
            });
        },

        fetch: function() {
            var self = this;
            self.wayStills.fetch();
        },

        clear: function() {
            var self = this;
            self.wayStills.clear();
        }

  });

  return Way;
  
});