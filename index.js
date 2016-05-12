var http = require('http');
var Busboy = require('busboy');
var _ = require('lodash');

//environment variables
var env = process.env;
var port = env.PORT || 5000;
var mailgun = require('mailgun-js')({
  apiKey: env.MAILGUN_API_KEY,
  domain: env.MAILGUN_DOMAIN,
});
var inboundMessageEndpoint = env.ENDPOINT_SECRET;

//main flow
function messagePosted(message){
  var parsedMessage = parseMessage(message);
  var parsedMessageWithLinks = uploadAttachments(parsedMessage);
  appendToGoogleSpreadsheet(parsedMessageWithLinks);
  confirmReceipt(parsedMessageWithLinks);
}

//setup an http server to parse posts to inboundMessageEndpoint
//and foroward them to messagePosted function above
var server = http.createServer(function(req, res) {
  message = {};
  if (req.method === 'POST' && req.url === '/' + inboundMessageEndpoint) {
    var busboy = new Busboy({headers: req.headers});
    busboy.on('field', function(fieldName, val) {
      message[fieldName] = val;
    });
    busboy.on('finish', function() {
      res.writeHead(200, {Connection: 'close'});
      res.end('got it.');
      messagePosted(message);
    });
    req.pipe(busboy);
  }
});

server.listen(port, function() {
  console.log('listening. port = ' + port);
});

//parse the posted message into the fields the rest of the app works with
function messagePosted(message){
  var sender = message.sender;
  var recipient = message.recipient.replace('@' + env.MAILGUN_DOMAIN, '');

  var subject = message.subject;
  //split subject into (<amount>:) <description>
  var subjectSplit = message.indexOf(':');
  var description = subject;
  var amount = null;
  if(subjectSplit !== -1){
    amount = subject.slice(0, subjectSplit);
    description = subject.slice(subjectSplit);
  }

  return {
    sender:      sender,
    recipient:   recipient,
    description: description,
    amount:      amount,
  }
}

mailgun.messages().send(message, function(error, data){
  if(error){
    console.log(error);
  }

});
//UTILITIES---------------------------------------------------------------------
