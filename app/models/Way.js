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
        loadingFinishedCompletely:false,

        //Coordinates of the line path
        wayPath:null,
        wayName:null,

        //Connections with other ways
        wayConnectionsStart:null,
        wayConnectionsEnd:null,

        //Sounds
        waySoundsData:null,

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
            self.wayArea = params.wayArea;
            self.originalWayPath = params.wayPath;
            params.wayPath = GeoUtils.prepareWayPathFromGeoJSONLine(params.wayPath,self.nbStills,params.wayPathSyncPoints);
            self.wayPath = params.wayPath;
            self.wayConnectionsEnd = params.wayConnectionsEnd;
            self.wayConnectionsStart = params.wayConnectionsStart;
            self.characterPosition = params.characterPosition;
            self.characterDefinition = params.characterDefinition;
            self.waySoundsData = params.waySounds;

            //Compute length of way
            var lastPoint = null;
            var current = null;
            self.wayLength = 0;

            var pathLength = GeoUtils.invertArrayLongLatToLatLong(self.originalWayPath);

            _.each(pathLength, function(point) {
                if(lastPoint !== null) {
                    self.wayLength += GeoUtils.distance(lastPoint,point);
                }
                lastPoint = point;
            });

            console.log("WAY "+ self.wayName + ":");
            console.log("LENGTH :" + self.wayLength + "m");
            console.log("NBSTILLS :" + self.nbStills);
            console.log("RATIO STILL/m :" + self.nbStills/self.wayLength);

            //Create the stills collection for this way
            self.wayStills = new Stills();
            self.wayStills.init(params);

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
                self.loadingFinishedCompletely = true;
            });

        },

        fetch: function() {
            var self = this;
            self.wayStills.fetch();

            //Sounds
            Sounds.on("soundsLoaded", function() {
                self.trigger('soundsLoaded');
            });
            Sounds.updateSoundsCollection(self.waySoundsData,self.wayName);
            Sounds.fetch();
            
        },

        clear: function() {
            var self = this;
            self.wayStills.clear();
        }

  });

  return Way;
  
});