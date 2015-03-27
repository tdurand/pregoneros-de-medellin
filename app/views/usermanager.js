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
        'text!templates/usermanager/alertBeforeLogout.html',
        'text!templates/usermanager/askToShareViewTemplate.html'
        ],
function($, _, Backbone,
                LOGGER,
                Progression,
                AskToCreateAccountView,
                CreateAccountView,
                SignInView,
                SuccessAccountCreationView,
                SuccessSignInView,
                AlertBeforeLogoutView,
                AskToShareView){

  var UserManagerView = Backbone.View.extend({

    el:".usermanager-content",

    status: {
        logged : false,
        name: null
    },

    events:{
        "click .signup-facebook":"signUpOrsignInWithFacebook",
        "click .login-facebook":"signUpOrsignInWithFacebook",
        "submit form.login-form": "logIn",
        "submit form.signup-form": "signUp",
        "click .usermanager-btnclose": "closeView",
        "click .btn-createaccountlater": "closeView",
        "click .btn-logout": "logOut",
        "click .btn-createaccount":"renderCreateAccountView",
        "click .btn-login":"renderSignInView",
        "click .btn-close":"closeView",
        "click .btn-shareontwitter":"shareOnTwitter",
        "click .btn-shareonfacebook":"shareOnFacebook",
        "click .btn-sharewithemail":"shareByEmail"
    },

    initialize : function() {
        var self = this;

        window.fbAsyncInit = function() {

            Parse.initialize("9uInSCaUNce345LbJrkqIsKQZfS7TJSdQNzQeFXT",
                   "XmjFAZhIjwkRKzir12xZO6w9kz8V5t1zwYmuT0Qt");

            Parse.FacebookUtils.init({ // this line replaces FB.init({
              appId      : '584965638293572', // Facebook App ID
              status     : true,  // check Facebook Login status
              cookie     : true,  // enable cookies to allow Parse to access the session
              xfbml      : true,  // initialize Facebook social plugins on the page
              version    : 'v2.2' // point to the latest Facebook Graph API version
            });
         
            // Run code after the Facebook SDK is loaded.
            self.renderAskToCreateAccountView();

            self.updateLoginStatus();
          };

        fbAsyncInit();

        
    },

    //Account renders
    renderAskToCreateAccountView: function() {
         var self = this;

         self.$el.html(_.template(AskToCreateAccountView));
    },

    renderCreateAccountView: function(e) {
        var self = this;

        if(e) {
            e.preventDefault();
        }

        self.$el.html(_.template(CreateAccountView));
    },

    renderSuccessAccountCreationView: function() {
        var self = this;

         self.$el.html(_.template(SuccessAccountCreationView));
    },

    renderSignInView: function(e) {
        var self = this;

        if(e) {
            e.preventDefault();
        }

        self.$el.html(_.template(SignInView));
    },

    renderSuccessSignInView: function() {
        var self = this;

         self.$el.html(_.template(SuccessSignInView)({
            username: self.status.name
         }));
    },

    renderAlertBeforeLogout: function() {
        var self = this;

        self.$el.html(_.template(AlertBeforeLogoutView));
    },

    //Ask to share
    renderAskToSharePageView: function() {
        var self = this;

        self.$el.html(_.template(AskToShareView));
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
      var passwordConfirm = self.$el.find(".signup-password-confirm").val();

      if(password != passwordConfirm) {
         self.$(".signup-form .form-error-msg").text("Password mismatch");
         self.$(".signup-form .form-error-msgcontainer").show();
         return false;
      }

      self.$el.find(".signup-form button").attr("disabled", "disabled");
      
      Parse.User.signUp(email, password, { ACL: new Parse.ACL(), name:name, email:email }, {
        success: function(user) {
            self.renderSuccessAccountCreationView();
            self.updateLoginStatus();
            Progression.save();
        },

        error: function(user, error) {
          self.$(".signup-form .form-error-msg").html(_.escape(error.message));
          self.$(".signup-form .form-error-msgcontainer").show();
          self.$(".signup-form button").removeAttr("disabled");
        }
      });

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

                        Progression.save();
                        
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
            self.status.name = self.status.name.split(" ")[0];
            if(self.status.name.length > 10) {
                self.status.name = self.status.name.slice(0, 10);
            }
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
            Progression.save();
          }
       });

    },

    closeView: function() {
        // TweenLite.fromTo("#usermanager",0.5,{scale:1},{scale:0,ease: Back.easeOut,onComplete:function() {
        $("#usermanager").addClass("hidden");
        // }});
    },

    showView: function() {
        // TweenLite.fromTo("#usermanager",1,{scale:0},{scale:1,ease: Back.easeOut});
        $("#usermanager").removeClass("hidden");
    },

    displayLogin: function() {
        var self = this;

        self.renderSignInView();

        self.showView();
    },

    isLogged: function() {
        var self = this;
        return self.status.logged;
    },

    shareOnFacebook: function(e) {
        var self = this;

        e.preventDefault();

        Progression.instance.set('pageHaveBeenShared', true);

        self.closeView();

        popUp=window.open(
        'http://www.facebook.com/sharer.php?u=http://www.pregonerosdemedellin.com',
        'popupwindow',
        'scrollbars=yes,width=800,height=400');
        popUp.focus();

        return false;
    },

    shareOnTwitter: function(e) {
        var self = this;

        e.preventDefault();

        Progression.instance.set('pageHaveBeenShared', true);

        self.closeView();

        var popUp=window.open(
        'http://twitter.com/intent/tweet?text=Pregoneros de Medellín - http://www.pregonerosdemedellin.com',
        'popupwindow',
        'scrollbars=yes,width=800,height=400');

        popUp.focus();
        return false;
    },

    shareByEmail: function(e) {
        var self = this;
        
        e.preventDefault();

        Progression.instance.set('pageHaveBeenShared', true);

        self.closeView();

        var popUp=window.open(
        'mailto:?subject=[Page Title] via [Site Name]&amp;body=I\'ve just read \'[Page Title]\' at [url]',
        'popupwindow',
        'scrollbars=yes,width=800,height=400');

        popUp.focus();
        return false;
    },

    onClose: function(){
      //Clean
      this.undelegateEvents();
    }

  });

  return new UserManagerView();
  
});


