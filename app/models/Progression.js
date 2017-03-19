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

        // DECLARE PARSE INSTANCE
        self.modelParseDAO = Parse.Object.extend("Progression");
        self.parseDAOInstance = new self.modelParseDAO();

    },

    save: function() {
        var self = this;

        if(!navigator.onLine || !window.parseInitialized) {
            return;
        }

        var user = Parse.User.current();

        //If user logged in
        if(!_.isNull(user)) {
        // copy attributes of INSTANCE TO PARSE INSTANCE
        // CALL SAVE WITH CUSTOM ATTRIBUTE CHARACTER PROGRESSION
            var attributes = _.clone(self.instance.attributes);
            var charactersProgression = attributes.charactersProgression;
            delete attributes.charactersProgression;
            self.parseDAOInstance.set(attributes);
            self.parseDAOInstance.set("charactersProgression",self.instance.get("charactersProgression").attributes);
            self.parseDAOInstance.set({id : self.instance.id});
            self.parseDAOInstance.set("belongTo",user);

            self.parseDAOInstance.save(null,{
                  success: function(progression) {
                    // Execute any logic that should take place after the object is saved.
                    // console.log('New object created with objectId: ' + progression.id);
                  },
                  error: function(progression, error) {
                    // Execute any logic that should take place if the save fails.
                    // error is a Parse.Error with an error code and message.
                    // console.log('Failed to create new object, with error code: ' + error.message);
                   }
                });
        }
    },

    fetch: function(callBack) {
        var self = this;

        if(!navigator.onLine || !window.parseInitialized) {
            return;
        }

        var query = new Parse.Query(self.modelParseDAO);

        query.equalTo("belongTo", Parse.User.current());
        query.first({
          success: function(data) {
                if(!_.isUndefined(data)) {
                    //reject characterProgression
                    var dataAttributes = _.omit(data.attributes, 'charactersProgression');
                    var charactersProgression = data.attributes.charactersProgression;
                    self.instance.get("charactersProgression").set(charactersProgression);
                    self.instance.set(dataAttributes);
                    self.instance.set({id : data.id});
                }
                
                if(callBack) {
                    callBack(data);
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

        if(!navigator.onLine || !window.parseInitialized) {
            return;
        }

        self.instance.initialize();
        self.instance.set("id",undefined);
    },
    
    setCurrentStreet: function(wayName) {
        var self = this;

        self.instance.setCurrentStreet(wayName);
        self.save();
    },

    getNbStreetLoaded: function() {
        var self = this;
        return self.instance.get("nbStreetLoaded");
    },

    isPageBeenShared: function() {
        var self = this;
        return self.instance.get("pageHaveBeenShared");
    }

  };

  //Give capability to use events
  _.extend(Progression, Backbone.Events);

  return Progression;
  
});


