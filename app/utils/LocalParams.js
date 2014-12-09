define(function() {

    //UTILITY TO MANAGE LOCAL PARAMS (not synced, inherent to device)
    var LocalParams = {

        init: function() {
            var self = this;
            //Default parameters
            if (_.isNull(self.isFirstLaunch())) {
                self.setFirstLaunch("true");
            }
        },

        /* GLOBAL LOCALSTORAGE TOOLS */

        setParam: function(name, value) {
            if (localStorage) {
                localStorage.setItem(name, value);
            }
        },

        getParam: function(name) {
            var param = localStorage.getItem(name);
            //String to boolean
            if (param == "true") {
                param = true;
            }
            else if (param == "false") {
                param = false;
            }
            else if (param == "null") {
                param = null;
            }

            return param;
        },

        //NON SYNCED PARAMS

        /* LEARNING STACK OPTIONS */
        /* FIRST USE */
        setFirstLaunch: function(firstLaunch) {
            return this.setParam("PREGO.firstLaunch", firstLaunch);
        },

        isFirstLaunch: function() {
            return this.getParam("PREGO.firstLaunch");
        },

        /* TRANSLATION DISPLAY */
        setUserTranslationLang: function(lang) {
            this.setParam("PREGO.translation", lang);
        },

        getUserTranslationLang: function() {
            return this.getParam("PREGO.translation");
        },

        /* SET SUBSCRIPTION DONE */
        setBonusUnlocked: function() {
            this.setParam("PREGO.bonusUnlocked", "true");
        },

        getBonusUnlocked: function() {
            return this.getParam("PREGO.bonusUnlocked");
        }

        /* UNLOCKED */
        
    };

    return LocalParams;

});