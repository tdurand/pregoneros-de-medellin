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
        percentageLoaded:0,
        percentageStillsLoaded:0,
        percentageSoundsLoaded:0,
        loadingStillsFinished:false,
        loadingStillsFinishedCompletely:false,
        loadingSoundsFinished:false,
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
            self.waySoundsMaster = params.waySoundsMaster;

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

            // console.log("WAY "+ self.wayName + ":");
            // console.log("LENGTH :" + self.wayLength + "m");
            // console.log("NBSTILLS :" + self.nbStills);
            // console.log("RATIO STILL/m :" + self.nbStills/self.wayLength);

            //Create the stills collection for this way
            self.wayStills = new Stills();
            self.wayStills.init(params);

            self.listenTo(self.wayStills,"updateStillsPercentageLoaded", function() {
                self.percentageStillsLoaded = self.wayStills.percentageLoaded;
                self.percentageLoaded = Math.floor(self.percentageSoundsLoaded*10/100) + Math.floor(self.percentageStillsLoaded*90/100);
                self.trigger("updatePercentageLoaded");
            });

            self.listenTo(Sounds,"updateSoundsPercentageLoaded", function() {
                self.percentageSoundsLoaded = Sounds.percentageLoaded;
                self.percentageLoaded = Math.floor(self.percentageSoundsLoaded*10/100) + Math.floor(self.percentageStillsLoaded*90/100);
                self.trigger("updatePercentageLoaded");
            });

            //Sounds
            self.listenTo(Sounds,"loadingSoundsFinished", function() {
                self.loadingSoundsFinished = true;
                if(self.loadingStillsFinished) {
                    self.loadingFinished = true;
                    self.trigger("loadingFinished");
                }
                else {
                    self.listenToOnce(self.wayStills,"loadingStillsFinished", function() {
                        self.loadingFinished = true;
                        self.loadingStillsFinished = true;
                        self.trigger("loadingFinished");
                    });
                }
            });

            self.listenTo(self.wayStills,"loadingStillsFinished", function() {
                self.loadingStillsFinished = true;
                if(self.loadingSoundsFinished) {
                    self.loadingFinished = true;
                    self.trigger("loadingFinished");
                }
                else {
                    self.listenToOnce(Sounds,"loadingSoundsFinished", function() {
                        self.loadingFinished = true;
                        self.loadingSoundsFinished = true;
                        self.trigger("loadingFinished");
                    });
                }
            });

            self.listenTo(self.wayStills,"loadingStillsFinishedCompletely", function() {
                self.trigger('loadingFinishedCompletely');
                self.loadingFinishedCompletely = true;
            });

        },

        fetch: function() {
            var self = this;
            self.wayStills.fetch();

            Sounds.percentageLoaded = 0;
            Sounds.updateSoundsCollection(self.waySoundsData,self.wayName);
            Sounds.fetch();
            
        },

        isThereACharacter: function() {
            var self = this;
            if(self.characterDefinition) {
                return true;
            }
            else {
                return false;
            }
        },

        clear: function() {
            var self = this;
            self.wayStills.clear();
        }

  });

  return Way;
  
});
