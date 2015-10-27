define(["backbone"],function(Backbone) {

    var Inactivity = {

        timer: 10000,
        timeout: null,
        isCounting: false,

        init: function() {
            var self = this;
            $(document).off("mousemove touchstart touchmove click");
            $(document).on("mousemove touchstart touchmove click", function() {
                console.log("==== RESET COUNTING ... ===")
                self.resetCounting();
            });
        },

        startCounting: function() {
            console.log("==== RECORDING INACTIVITY ... ===");
            var self = this;
            self.isCounting = true;
            self.timeout = setTimeout(function() {
                self.inactivity();
            }, self.timer);
        },

        stopCounting: function() {
            console.log("==== STOP RECORDING INACTIVITY ===");
            var self = this;
            self.isCounting = false;
            window.clearTimeout(self.timeout);
        },

        resetCounting: function() {
            if(this.isCounting) {
                this.stopCounting();
                this.startCounting();
            }
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