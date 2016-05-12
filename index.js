var express = require('express');
var app = express();

//environment variables
var env = proccess.env;
var port = env.PORT || 5000;
var mailgun = require('mailgun-js')({
  apiKey: env.MAILGUN_API_KEY,
  domain: env.MAILGUN_DOMAIN,
});
var inboundMessageEndpoint = env.ENDPOINT_SECRET;

//setup express
app.set('port', port);

app.post(inboundMessageEndpoint, function(request, response) {
  console.log(request.body);
  console.log(request.query);
});

app.listen(app.get('port'), function() {
  console.log('Running; port = ', app.get('port'));
});

//UTILITIES---------------------------------------------------------------------
