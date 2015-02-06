define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'text!templates/streetwalk/logInViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                LogInViewTemplate){

  var LogInView = Backbone.View.extend({

    el:".streetwalk-login",

    events:{
        "submit form.login-form": "logIn",
        "submit form.signup-form": "signUp",
        "click .streetwalk-login-btnclose": "closeView"
    },

    initialize : function() {
        var self = this;

        Parse.initialize("9uInSCaUNce345LbJrkqIsKQZfS7TJSdQNzQeFXT",
                   "XmjFAZhIjwkRKzir12xZO6w9kz8V5t1zwYmuT0Qt");

        self.render();
    },

    render: function() {
        var self = this;

        self.$el.html(_.template(LogInViewTemplate));
    },

    logIn: function(e) {
      var self = this;
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();
      
      Parse.User.logIn(username, password, {
        success: function(user) {
          console.log("SuccessFullLogin" + user);
        },

        error: function(user, error) {
          self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
          self.$(".login-form button").removeAttr("disabled");
        }
      });

      this.$(".login-form button").attr("disabled", "disabled");

      return false;
    },

    signUp: function(e) {
      var self = this;
      var username = this.$("#signup-username").val();
      var password = this.$("#signup-password").val();
      
      Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
        success: function(user) {
          console.log("SuccessFullSignup" + user);
        },

        error: function(user, error) {
          self.$(".signup-form .error").html(_.escape(error.message)).show();
          self.$(".signup-form button").removeAttr("disabled");
        }
      });

      this.$(".signup-form button").attr("disabled", "disabled");

      return false;
      
    },

    closeView: function() {
        $("#streetwalk-login-wrapper").hide();
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return LogInView;
  
});


