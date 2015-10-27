define(["backbone"],function(Backbone) {

    var Inactivity = {

        timer: 10000,
        timeout: null,

        startCounting: function() {
            console.log("==== RECORDING INACTIVITY ... ===");
            var self = this;
            self.timeout = setTimeout(function() {
                self.inactivity();
            }, self.timer);
        },

        stopCounting: function() {
            console.log("==== STOP RECORDING INACTIVITY ===");
            var self = this;
            window.clearTimeout(self.timeout)
        },

        inactivity: function() {
            var self = this;
            console.log("==== INACTIVITY of " + self.timer + "ms detected ... ===");
            self.trigger("inactivity");
        }

    };

    //Give capability to use events
    _.extend(Inactivity, Backbone.Events);

    return Inactivity;

});