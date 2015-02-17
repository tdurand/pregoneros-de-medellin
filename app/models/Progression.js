define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/ProgressionModel'
        ],
function($, _, Backbone, LOGGER, ProgressionModel){

  var Progression = {

    initialize: function() {
        var self = this;

        self.instance = new ProgressionModel();
    },

    fetch: function(callBack) {
        var self = this;
        var query = new Parse.Query(ProgressionModel);

        query.equalTo("belongTo", Parse.User.current());
        query.first({
          success: function(data) {
                if(!_.isUndefined(data)) {
                    self.instance.set(data.attributes);
                    self.instance.set({id : data.id});
                }
                
                if(callBack) {
                    callBack();
                }
          },
          error: function(error) {
                if(callBack) {
                    callBack();
                }
                alert("Error: " + error.code + " " + error.message);
          }
        });
    },

    logOut: function() {
        var self = this;

        self.instance.initialize();
        self.instance.set("id",undefined);

        console.log(ProgressionModel);
    }

  };

  return Progression;
  
});


