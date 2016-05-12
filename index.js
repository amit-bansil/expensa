var express = require('express');
var bodyParser = require('body-parser');
var app = express();

//environment variables
var env = process.env;
var port = env.PORT || 5000;
var mailgun = require('mailgun-js')({
  apiKey: env.MAILGUN_API_KEY,
  domain: env.MAILGUN_DOMAIN,
});
var inboundMessageEndpoint = env.ENDPOINT_SECRET;

//messagePosted
function messagePosted(message){
  console.log(message);
}

//setup express to forward posts to inboundMessageEndpoint to messagePosted
app.set('port', port);
app.use(bodyParser.json());

app.post('/' + inboundMessageEndpoint, function(request, response) {
  messagePosted(request.body);
  response.send('got it.');
});

app.listen(app.get('port'), function() {
  console.log('Running; port = ', app.get('port'));
});

//UTILITIES---------------------------------------------------------------------
