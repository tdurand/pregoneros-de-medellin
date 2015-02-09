define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'text!templates/streetwalk/usermanager/askToCreateAccountViewTemplate.html',
        'text!templates/streetwalk/usermanager/createAccountViewTemplate.html',
        'text!templates/streetwalk/usermanager/signInViewTemplate.html',
        'text!templates/streetwalk/usermanager/successAccountCreationViewTemplate.html',
        'text!templates/streetwalk/usermanager/successSignInViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                AskToCreateAccountView,
                CreateAccountView,
                SignInView,
                SuccessAccountCreationView,
                SuccessSignInView){

  var UserManagerView = Backbone.View.extend({

    el:".streetwalk-usermanager",

    events:{
        "click .streetwalk-usermanager-btn-createaccount":"renderCreateAccountView",
        "click .signup-facebook":"signUpWithFacebook",
        "submit form.login-form": "logIn",
        "submit form.signup-form": "signUp",
        "click .streetwalk-login-btnclose": "closeView"
    },

    initialize : function() {
        var self = this;

        Parse.initialize("9uInSCaUNce345LbJrkqIsKQZfS7TJSdQNzQeFXT",
                   "XmjFAZhIjwkRKzir12xZO6w9kz8V5t1zwYmuT0Qt");

        window.fbAsyncInit = function() {
            Parse.FacebookUtils.init({ // this line replaces FB.init({
              appId      : '584965638293572', // Facebook App ID
              status     : true,  // check Facebook Login status
              cookie     : true,  // enable cookies to allow Parse to access the session
              xfbml      : true,  // initialize Facebook social plugins on the page
              version    : 'v2.2' // point to the latest Facebook Graph API version
            });
         
            // Run code after the Facebook SDK is loaded.
          };

        fbAsyncInit();

        self.renderAskToCreateAccountView();
    },

    render: function() {
        var self = this;

        // self.$el.html(_.template(LogInViewTemplate));
    },

    renderAskToCreateAccountView: function() {
         var self = this;

         self.$el.html(_.template(AskToCreateAccountView));
    },

    renderCreateAccountView: function() {
        var self = this;

         self.$el.html(_.template(CreateAccountView));
    },

    renderSuccessAccountCreationView: function() {
        var self = this;

         self.$el.html(_.template(SuccessAccountCreationView));
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

      var email = self.$el.find(".signup-email").val();
      var password = self.$el.find(".signup-password").val();
      
      Parse.User.signUp(email, password, { ACL: new Parse.ACL() }, {
        success: function(user) {
            self.renderSuccessAccountCreationView();
        },

        error: function(user, error) {
          self.$(".signup-form .error").html(_.escape(error.message)).show();
          self.$(".signup-form button").removeAttr("disabled");
        }
      });

      self.$el.find(".signup-form button").attr("disabled", "disabled");

      return false;
      
    },

    signUpWithFacebook: function(e) {
        var self = this;

        e.preventDefault();

        Parse.FacebookUtils.logIn(null, {
          success: function(user) {
            if (!user.existed()) {
              alert("User signed up and logged in through Facebook!");
            } else {
              alert("User logged in through Facebook!");
            }
          },
          error: function(user, error) {
            alert("User cancelled the Facebook login or did not fully authorize.");
          }
        });

    },

    closeView: function() {
        $("#streetwalk-usermanager-wrapper").hide();
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return UserManagerView;
  
});


