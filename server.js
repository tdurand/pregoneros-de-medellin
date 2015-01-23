var express = require('express');
var bodyParser = require("body-parser");
var app = express();

app.use('/', express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(3000, function() { console.log('listening');});

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