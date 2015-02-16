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

        console.log(self.instance);
    },

    fetch: function() {
        var self = this;
        var query = new Parse.Query(ProgressionModel);

        query.equalTo("belongTo", Parse.User.current());
        query.first({
          success: function(data) {
            if(!_.isUndefined(data)) {
                self.instance = new ProgressionModel(data);
                console.log(self.instance);
            }
           
          },
          error: function(error) {
            alert("Error: " + error.code + " " + error.message);
          }
        });
    }

  };

  return Progression;
  
});


