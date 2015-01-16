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

        window.WAYSClone = _.cloneDeep(WAYS);

        _.each(WAYS,function(wayParams) {
            self.add(new Way(wayParams));
        });
    }

  });

  return new Ways();
  
});


