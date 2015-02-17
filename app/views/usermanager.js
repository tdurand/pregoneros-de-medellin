define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'text!templates/usermanager/askToCreateAccountViewTemplate.html',
        'text!templates/usermanager/createAccountViewTemplate.html',
        'text!templates/usermanager/signInViewTemplate.html',
        'text!templates/usermanager/successAccountCreationViewTemplate.html',
        'text!templates/usermanager/successSignInViewTemplate.html',
        'text!templates/usermanager/alertBeforeLogout.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                AskToCreateAccountView,
                CreateAccountView,
                SignInView,
                SuccessAccountCreationView,
                SuccessSignInView,
                AlertBeforeLogoutView){

  var UserManagerView = Backbone.View.extend({

    el:".usermanager-content",

    status: {
        logged : false,
        name: null
    },

    events:{
        "click .streetwalk-usermanager-btn-createaccount":"renderCreateAccountView",
        "click .signup-facebook":"signUpOrsignInWithFacebook",
        "click .login-facebook":"signUpOrsignInWithFacebook",
        "submit form.login-form": "logIn",
        "submit form.signup-form": "signUp",
        "click .streetwalk-login-btnclose": "closeView",
        "click .streetwalk-login-btnlogout": "logOut",
        "click .btn-createaccount":"renderCreateAccountView"
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

        self.updateLoginStatus();
    },

    renderAskToCreateAccountView: function() {
         var self = this;

         self.$el.html(_.template(AskToCreateAccountView));
    },

    renderCreateAccountView: function(e) {
        var self = this;

        e.preventDefault();
        self.$el.html(_.template(CreateAccountView));
    },

    renderSuccessAccountCreationView: function() {
        var self = this;

         self.$el.html(_.template(SuccessAccountCreationView));
    },

    renderSignInView: function() {
        var self = this;

        self.$el.html(_.template(SignInView));
    },

    renderSuccessSignInView: function() {
        var self = this;

         self.$el.html(_.template(SuccessSignInView));
    },

    renderAlertBeforeLogout: function() {
        var self = this;

        self.$el.html(_.template(AlertBeforeLogoutView));
    },

    logIn: function(e) {
      var self = this;
      var email = self.$el.find(".login-email").val();
      var password = self.$el.find(".login-password").val();
      
      Parse.User.logIn(email, password, {
        success: function(user) {
          console.log("SuccessFullLogin" + user);
          self.updateLoginStatus();

          self.renderSuccessSignInView();

          self.afterLogin();
        },

        error: function(user, error) {
          self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
          self.$(".login-form button").removeAttr("disabled");
        }
      });

      this.$(".login-form button").attr("disabled", "disabled");

      return false;
    },

    logInWithFacebook: function(e) {
        var self = this;
        e.preventDefault();

        self.signUpWithFacebook();
    },

    signUp: function(e) {
      var self = this;

      var name = self.$el.find(".signup-name").val();
      var email = self.$el.find(".signup-email").val();
      var password = self.$el.find(".signup-password").val();
      
      Parse.User.signUp(email, password, { ACL: new Parse.ACL(), name:name, email:email }, {
        success: function(user) {
            self.renderSuccessAccountCreationView();
            self.updateLoginStatus();
            Progression.instance.persistToParse();
        },

        error: function(user, error) {
          self.$(".signup-form .error").html(_.escape(error.message)).show();
          self.$(".signup-form button").removeAttr("disabled");
        }
      });

      self.$el.find(".signup-form button").attr("disabled", "disabled");

      return false;
      
    },

    signUpOrsignInWithFacebook: function(e) {
        var self = this;

        e.preventDefault();

        Parse.FacebookUtils.logIn(null, {
          success: function(user) {
            if (!user.existed()) {

              console.log("User signed up and logged in through Facebook!");

              FB.api('/me', function(response) {
                    var user = Parse.User.current();
                    user.set("name",response.name);
                    console.log("Set facebook name!" + response.Name);

                    user.save(null, {
                      success: function(user) {
                        // This succeeds, since the user was authenticated on the device
                        console.log(user);
                        self.renderSuccessAccountCreationView();
                        self.updateLoginStatus();

                        Progression.instance.persistToParse();
                        
                      }
                    });
                });

                

            } else {

              console.log("User logged in through Facebook!");

              self.afterLogin();

              self.updateLoginStatus();
              self.renderSuccessSignInView();
            }

          },
          error: function(user, error) {
            alert("User cancelled the Facebook login or did not fully authorize.");
          }
        });

    },

    updateLoginStatus: function() {
        var self = this;

        if(!_.isNull(Parse.User.current())) {
            self.status.logged = true;
            self.status.name = Parse.User.current().get("name");
        }
        else {
            self.status.logged = false;
        }

        self.trigger("loginStatusChanged");
    },

    alertBeforeLogout: function() {
        var self = this;
        self.renderAlertBeforeLogout();
        self.showView();
    },

    logOut: function() {
        var self = this;
        Parse.User.logOut();
        Progression.logOut();
        self.updateLoginStatus();

        self.trigger("logOut");

        self.closeView();
    },

    afterLogin: function() {
        var self = this;

        Progression.fetch(function(data) {
          if(!_.isUndefined(data)) {
            //Go to last street
            self.trigger("progressFetched");
          }
          else {
            //save current progress
            Progression.instance.persistToParse();
          }
       });

    },

    closeView: function() {
        $("#usermanager").addClass("hidden");
    },

    showView: function() {
        $("#usermanager").removeClass("hidden");
    },

    displayLogin: function() {
        var self = this;

        self.renderSignInView();

        self.showView();
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new UserManagerView();
  
});


