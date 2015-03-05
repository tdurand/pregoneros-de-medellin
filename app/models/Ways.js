define(['jquery',
        'underscore',
        'backbone',
        'models/Way',
        'json!content/ways.json'
        ],
function($, _, Backbone,
                Way,
                WAYS){

  var Ways = Backbone.Collection.extend({

    model: Way,

    initialize:function(params) {
        
        var self = this;

        //TODO REMOVE WHEN REMOVE SOUND EDITOR
        window.WAYSClone = _.cloneDeep(WAYS);

        _.each(WAYS,function(wayParams) {
            self.add(new Way(wayParams));
        });
    },

    getReverseWayName : function(wayName) {
        var self = this;

        wayNameArray = wayName.split("-");

        if(wayNameArray.length == 2) {
            reverseWayName = wayNameArray[1] + "-" + wayNameArray[0];
        }
        else {
            reverseWayName = wayNameArray[0] + "-" + wayNameArray[2] + "-" + wayNameArray[1];
        }

        return reverseWayName;
    }

  });

  return new Ways();
  
});


