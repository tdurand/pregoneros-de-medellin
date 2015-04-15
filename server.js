var express = require('express');
var bodyParser = require("body-parser");
var compression = require('compression');
var app = express();

var week = 604800000;

// compress all requests
app.use(compression());
app.use('/', express.static(__dirname,{maxAge:week}));
app.use(bodyParser.json({limit: '2mb'}));
app.use(bodyParser.urlencoded({limit: '2mb', extended: true}));
app.set('port', (process.env.PORT || 3000));
app.set('views', __dirname);

app.get('/', function(req, res) {
    var lang = "es_ES";
    console.log("x-facebook-locale set to: " + req.headers["x-facebook-locale"]);
    if(req.headers["x-facebook-locale"]) {
        lang = req.headers["x-facebook-locale"];
        // console.log("x-facebook-locale set to : " + lang);
    }
    if(req.query.fb_locale) {
        lang = req.query.fb_locale;
        // console.log("fb_locale set to : " + lang);
    }
    console.log("render lang:" + lang);
    res.render('index.ejs', {lang:lang});
});

app.post('/saveways', function (req, res) {
  var fs = require('fs');
    fs.writeFile("content/ways.json", req.body.file, function(err) {
        if(err) {
            console.log(err);
            res.sendStatus(500);
        } else {
            console.log("The file was saved!");
            res.sendStatus(200);

        }
    });
});

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'));
});