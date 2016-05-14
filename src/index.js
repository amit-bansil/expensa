
var _                = require('lodash');
var fs               = require('fs');

var MailerClass      = require('./mailer');
var PostServerClass  = require('./postServer');
var SpreadsheetClass = require('./spreadsheet');

//------------------------------------------------------------------------------
//environment variables
var env = process.env;

var mailgunDomain = env.MAILGUN_DOMAIN;

var inboundMessageEndpoint = env.ENDPOINT_SECRET;

var postServer = new PostServerClass(env.PORT || 5000);

var mailer = new MailerClass({
  apiKey: env.MAILGUN_API_KEY,
  domain: mailgunDomain,
  from: 'Expensa Bot <expensa@' + mailgunDomain + '>',
});

var spreadsheet = new SpreadsheetClass({
  email:  env.GDRIVE_EMAIL,
  fileId: env.GDRIVE_FILEID,
  //fallback to a local file when we are running locally
  key:    env.GDRIVE_KEY || fs.readFileSync(env.GDRIVE_KEYFILE),
});

//------------------------------------------------------------------------------
//main flow
function _messagePosted(url, message){
  //for security only accept posts to the secret endpoint
  if(url !== '/' + inboundMessageEndpoint){
    throw new Error('unexpected url:' + url);
  }

  var parsedMessage = parseMessage(message);

  parsedMessage = uploadAttachments(parsedMessage);

  appendMessageToSpreadsheet(parsedMessage);

  confirmReceipt(parsedMessageWithLinks);
}
function messagePosted(url, message){
  try{
    _messagePosted.apply(null, arguments);
  }catch(error){
    logError(message.sender, message);
    console.log(error.stack);
  }
}

postServer.listen(messagePosted);

//------------------------------------------------------------------------------
function parseMessage(message){
  var sender = message.sender;
  var category = message.recipient.replace('@' + mailgunDomain, '');

  var subject = message.subject;
  //split subject into (<amount>:) <description>
  var subjectSplit = subject.indexOf(':');
  var description = subject;
  var amount = null;
  if(subjectSplit !== -1){
    amount = subject.slice(0, subjectSplit);
    description = subject.slice(subjectSplit);
  }

  return {
    timestamp:   moment().format('DD/MM/YY hh:mm a'),
    sender:      sender,
    category:    category,
    description: description,
    amount:      amount,
  }
}

//------------------------------------------------------------------------------
function appendMessageToSpreadsheet(message){
  var errorHook = _.curry(logError)(message.sender);
  spreadsheet.append([
    message.timestamp,
    message.sender,
    message.category,
    message.amount,
    message.description,
  ], errorHook);
}

//------------------------------------------------------------------------------
//Upload attachments to s3 and replace them with a link to the file
//note that this approach requires the entire attachment to be in RAM
//that should be fine since emails max out at 25mb and we have 512mb on the
//heroku server
//note that this method edits and returns the input parameter
function uploadAttachments(parsedMessage){
  return parsedMessage;
}

//------------------------------------------------------------------------------
//email sender a confirmation of what was done
function confirmReceipt(message){
  var fields  = JSON.stringify(message, null, '    ');
  var receipt = 'The following message has been processed:\n' + fields + '\n';
  receipt    += '--Expensa Bot';
  mailer.send({
    to: message.sender,
    subject: 'Message Processed on ' + fields.timestamp,
    text: receipt,
  });
}

//------------------------------------------------------------------------------
//notify user with email 'to' of error described by message
function logError(to, message){
  console.log('Error:', to, message);
  mailer.send({
    to: to,
    subject: 'Expensa encountered an unexpected error, try your request again.',
    text: JSON.stringify(message),
  });
}
