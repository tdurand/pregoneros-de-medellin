define(['jquery',
        'underscore',
        'backbone',
        'utils/Logger',
        'models/Progression',
        'views/usermanager'],
        function($, _,
                Backbone,
                LOGGER,
                Progression,
                UserManagerView) {

    var MessagingManager = {

        messageAskToCreateAccount: {
            conditionStreetsLoaded:[2,10,30]
        },

        messageShareWithFriends: {
            conditionStreetsLoaded: [4,20]
        },

        init: function() {
            var self = this;

            //UserManagerView.isLogged()
            //Progression.getNbStreetLoaded()
            //Progression.isPageBeenShared()

            //List of messages:
            // -> Ask to Create Account : condition : 2 cuadras, 6 cuadras, 15 cuadras, 30 cuadras and not logged
            // -> Share with friends : 3 cuadras , 8 cuadras, 18 cuadras and not yet shared
        },

        showEventualNextMessage: function() {
            var self = this;

            var nbStreetsLoaded = Progression.getNbStreetLoaded();

            //Message to create account
            if(!UserManagerView.isLogged() && _.contains(self.messageAskToCreateAccount.conditionStreetsLoaded,nbStreetsLoaded)) {
                self.showMessageAskToCreateAccount();
            }

            //Message to ask to share
            if(!Progression.isPageBeenShared() && _.contains(self.messageShareWithFriends.conditionStreetsLoaded,nbStreetsLoaded)) {
                self.showMessageAskToShare();
                //TODO IMPLEMENT IN USERMANAGER TO SET SHARED=TRUE WHEN SHARED
            }

        },

        showMessageAskToCreateAccount: function() {
            UserManagerView.renderAskToCreateAccountView();
            UserManagerView.showView();
        },

        showMessageAskToShare: function() {
            UserManagerView.renderAskToSharePageView();
            UserManagerView.showView();
        }



    };

    _.extend(MessagingManager, Backbone.Events);
    
    return MessagingManager;
});