var express = require('express');
var bodyParser = require("body-parser");
var app = express();

app.use('/', express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('port', (process.env.PORT || 3000));
app.set('views', __dirname);

app.get('/', function(req, res) {
    var lang = "en";
    if(req.query.fb_locale) {
        lang = req.query.fb_locale;
    }
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