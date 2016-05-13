var http = require('http');
var Busboy = require('busboy');
var _ = require('lodash');

//environment variables
var env = process.env;
var port = env.PORT || 5000;
var mailgunDomain = env.MAILGUN_DOMAIN;
var mailgun = require('mailgun-js')({
  apiKey: env.MAILGUN_API_KEY,
  domain: mailgunDomain,
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
  var recipient = message.recipient.replace('@' + mailgunDomain, '');

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

//Upload attachments to s3 and replace them with a link to the file
//note that this approach requires the entire attachment to be in RAM
//that should be fine since emails max out at 25mb and we have 512mb on the
//heroku server
//note that this message edits and returns the input parameter
function uploadAttachments(parsedMessage){
  var parsedMessageWithLinks = parsedMessage;
}

//append fields from message to google spreadsheet
function appendToGoogleSpreadsheet(message){
}

//email sender a confirmation of what was done
function confirmReceipt(message){

}

//notify user with email 'recipient' of error described by message
function error(recipient, message){
  console.log('Error:', recipient, message);
  var data = {
    from: 'Expensa Bot <expensa-bot@' + mailgunDomain + '>',
    to: recipient,
    subject: 'expenas encountered an unexpected error, try your request again.',
    text: message,
  };

  mailgun.messages().send(data, function (error, body) {
    if(error){
      console.log('error sending error to recipient', recipient, error);
    }
  });
}

mailgun.messages().send(message, function(error, data){
  if(error){
    console.log(error);
  }

});
//UTILITIES---------------------------------------------------------------------
