define(['underscore','utils/Logger'],function(_,LOGGER) {

    // Converts from degrees to radians.
            Math.toRadians = function(degrees) {
              return degrees * Math.PI / 180;
            };
             
            // Converts from radians to degrees.
            Math.toDegrees = function(radians) {
              return radians * 180 / Math.PI;
            };

    var GeoUtils = {

        // init: function() {
        //     // Converts from degrees to radians.
        //     Math.toRadians = function(degrees) {
        //       return degrees * Math.PI / 180;
        //     };
             
        //     // Converts from radians to degrees.
        //     Math.toDegrees = function(radians) {
        //       return radians * 180 / Math.PI;
        //     };
        // },

        distance: function(point1,point2) {

            // Earths mean radius in meter
            var R = 6378137;
            var dLat = Math.toRadians(point2[0] - point1[0]);
            var dLong = Math.toRadians(point2[1] - point1[1]);
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Math.toRadians(point1[0])) * Math.cos(Math.toRadians(point2[0])) * Math.sin(dLong / 2) * Math.sin(dLong / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = R * c;      // d = the distance in meter
        
            return d;
        },

        getBearing: function(point1,point2){

          startLat = Math.toRadians(point1[0]);
          startLong = Math.toRadians(point1[1]);
          endLat = Math.toRadians(point2[0]);
          endLong = Math.toRadians(point2[1]);

          var dLong = endLong - startLong;

          var dPhi = Math.log(Math.tan(endLat/2.0+Math.PI/4.0)/Math.tan(startLat/2.0+Math.PI/4.0));
          if (Math.abs(dLong) > Math.PI){
            if (dLong > 0.0)
               dLong = -(2.0 * Math.PI - dLong);
            else
               dLong = (2.0 * Math.PI + dLong);
          }

          return (Math.toDegrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
        },

        _midpointcoordinates: function(point1,point2) {

            var lat1 = point1[0];
            var lon1 = point1[1];
            var lat2 = point2[0];
            var lon2 = point2[1];
                
            var dLon = Math.toRadians(lon2 - lon1);

            //convert to radians
            lat1 = Math.toRadians(lat1);
            lat2 = Math.toRadians(lat2);
            lon1 = Math.toRadians(lon1);

            var Bx = Math.cos(lat2) * Math.cos(dLon);
            var By = Math.cos(lat2) * Math.sin(dLon);
            var lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By));
            var lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

            return [Math.toDegrees(lat3),Math.toDegrees(lon3)];
        },

        generateIntermediateSegments: function(arraySegments,arrayPoints,nbTotalPoints) {

            var self = this;

            var newArraySegments = [];

            $.each(arraySegments, function(index,segment) {
                 var midPointCoordinates = self._midpointcoordinates(segment[0].coordinates,segment[1].coordinates);

                 var segmentFirstPoint = segment[0];
                 var segmentLastPoint = segment[1];

                 var positionMidPoint = Math.round((segmentLastPoint.position-segmentFirstPoint.position)/2 + segmentFirstPoint.position);
                 //if it already exist
                 if(arrayPoints[positionMidPoint]) {
                    //try nearby
                    if(arrayPoints[positionMidPoint+1]) {
                        //exist
                        if(arrayPoints[positionMidPoint-1]) {
                            //Can pass here
                            LOGGER.debug("UNABLE TO FIND A SLOT FOR "+ midPointCoordinates + " position : " + positionMidPoint);
                        }
                        else {
                            positionMidPoint = positionMidPoint - 1;
                        }
                    }
                    else {
                        positionMidPoint = positionMidPoint + 1;
                    }
                 }

                 var midPoint = { coordinates: midPointCoordinates, position: positionMidPoint };

                 newArraySegments.push([segmentFirstPoint,midPoint]);

                 arrayPoints[positionMidPoint] = midPoint.coordinates;

                 newArraySegments.push([midPoint,segmentLastPoint]);
            });

            if(newArraySegments.length+1 >= nbTotalPoints) {
                //Hack to avoid having nbPoint + 1
                if(_.size(arrayPoints) > nbTotalPoints) {
                    arrayPoints = _.reject(arrayPoints,function(point,index) {
                        return parseInt(index, 10) >= nbTotalPoints;
                    });
                }
                return arrayPoints;
            }
            else {
                return self.generateIntermediateSegments(newArraySegments,arrayPoints,nbTotalPoints);
            }

        },

        generateIntermediatePoints: function(pointA,pointB,nbTotalPoints) {

            //pointA
            // [lat,long]

            var self = this;

            if(nbTotalPoints == 2) {
                return {0:pointA,1:pointB};
            }

            var objectPointA = {
                        coordinates: pointA,
                        position: 0
                };

            var objectPointB = {
                        coordinates: pointB,
                        position: nbTotalPoints-1
                };

            var arraySegments = [[objectPointA,objectPointB]];

            var collectionPoints = {};

            collectionPoints[objectPointA.position] = objectPointA.coordinates;
            collectionPoints[objectPointB.position] = objectPointB.coordinates;

            var allIntermediatesPoints = self.generateIntermediateSegments(arraySegments,collectionPoints,nbTotalPoints);

            return allIntermediatesPoints;

        },

        generateIntermediatePointsOfArray: function(arrayPoints,nbTotalPoints,arraySyncPoint) {

            var self = this;

            if(_.isUndefined(nbTotalPoints)) {
                LOGGER.debug("ERROR nbTotalPoints undefined");
                return;
            }

            var allIntermediatesPoints = {};
            var collectionOfSingleSegments = [];

            var individualSegment = {};
            var nbPointsOnThisSegment = 0;

            var distanceTotal = 0;
            var nbTotalPointsGenerated = 0;

            if(arrayPoints.length < 3 ) {
                allIntermediatesPoints = self.generateIntermediatePoints(arrayPoints[0],arrayPoints[1],nbTotalPoints);
            }
            else {
                //Generate distance of all individual segments and compute total distance
                for (var i = 0; i < arrayPoints.length -1; i++) {
                    individualSegment = {};
                    individualSegment.pointStart = arrayPoints[i];
                    individualSegment.pointEnd = arrayPoints[i+1];

                    if(arraySyncPoint) {
                        individualSegment.pointEndFrameNb = arraySyncPoint[i+1];
                    }
                    else {
                        individualSegment.pointEndFrameNb = "auto";
                    }
                    
                    individualSegment.distance = self.distance(individualSegment.pointStart,individualSegment.pointEnd);
                    distanceTotal += individualSegment.distance;
                    collectionOfSingleSegments.push(individualSegment);
                }

                var currentFrameNb = 0;

                //then generate intermediate points for all individual segments
                for (var j = 0; j < collectionOfSingleSegments.length; j++) {

                    individualSegment = collectionOfSingleSegments[j];

                    if(individualSegment.pointEndFrameNb !== "auto") {
                        nbPointsOnThisSegment = individualSegment.pointEndFrameNb - nbTotalPointsGenerated;
                    }
                    else {
                        nbPointsOnThisSegment = Math.round(individualSegment.distance * nbTotalPoints / distanceTotal);
                    }

                    //if last segment, generate exact number of points
                    if(j == collectionOfSingleSegments.length - 1) {
                        nbPointsOnThisSegment = nbTotalPoints - nbTotalPointsGenerated;
                    }

                    individualSegment.intermediatePoints = self.generateIntermediatePoints(individualSegment.pointStart,individualSegment.pointEnd,nbPointsOnThisSegment);

                    $.each(individualSegment.intermediatePoints,function(index,intermediatePoint,index2) {
                        allIntermediatesPoints[nbTotalPointsGenerated + parseInt(index,10)] = intermediatePoint;
                    });

                    nbTotalPointsGenerated += nbPointsOnThisSegment;

                }

            }

            return allIntermediatesPoints;

        },

        invertArrayLongLatToLatLong: function(lonLatArray) {

            var latLonArray = [];

            $.each(lonLatArray,function(lonLatIndex,lonLat) {
                latLonArray.push([lonLat[1],lonLat[0]]);
            });

            return latLonArray;
        },

        prepareWayPathFromGeoJSONLine : function(geoJsonLinePath,nbPoints,syncroPathPoints) {
            var self = this;
            //Invert long-lat to lat-long
            geoJsonLinePath = self.invertArrayLongLatToLatLong(geoJsonLinePath);

            var path = self.generateIntermediatePointsOfArray(geoJsonLinePath,nbPoints,syncroPathPoints);

            return path;
        }

    };

    window.GeoUtils = GeoUtils;

    return GeoUtils;

});