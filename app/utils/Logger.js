define(function() {

    var Logger = {

        modeDebug : true,

        debug : function(text) {
            if (this.modeDebug) {
                console.log(text);
            }
        },
        error : function(text) {
            console.error(text);
        },
        exception : function(text) {
            console.error(text);
        }

    };

    return Logger;

});