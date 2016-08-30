
var _                = require('lodash');
var fs               = require('fs');
var moment           = require('moment');

var MailerClass      = require('./mailer');
var PostServerClass  = require('./postServer');
var SpreadsheetClass = require('./spreadsheet');
var S3Class          = require('./s3');

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

var s3 = new S3Class({
  accessKeyId:     env.S3_ACCESS_KEY,
  secretAccessKey: env.S3_SECRET_KEY,
  bucket:          env.S3_BUCKET,
});

//------------------------------------------------------------------------------
//main flow
function _messagePosted(url, message){
  //for security only accept posts to the secret endpoint
  if(url !== '/' + inboundMessageEndpoint){
    throw new Error('unexpected url:' + url);
  }

  var parsedMessage = parseMessage(message);

  uploadAttachments(parsedMessage, function(error, uploadedMessage){
    if(error){
      logError(parsedMessage.sender, error)
      return;
    }
    appendMessageToSpreadsheet(uploadedMessage);
    confirmReceipt(uploadedMessage);
  });
}

postServer.listen(logErrorsOver(messagePosted));

//------------------------------------------------------------------------------
function parseMessage(message){
  var category = message.recipient.replace('@' + mailgunDomain, '');

  var parsedSubject = parseSubject(message.subject);

  treatBodyAsAttachment(message);

  return {
    timestamp:   moment().format('D/M/YY h:mma'),
    sender:      message.sender,
    category:    category,
    amount:      parsedSubject.amount,
    description: parsedSubject.description,
    attachments: message.attachments,
  }
}
//split subject into (<amount>:) <description>
function parseSubject(subject){
  var subjectSplit = subject.indexOf(':');
  var description = subject;
  var amount = null;
  if(subjectSplit !== -1){
    amount = subject.slice(0, subjectSplit);
    description = subject.slice(subjectSplit + 1);
  }
  return {
    amount:amount,
    description: description,
  };
}
function treatBodyAsAttachment(message){
  var bodyAttachment;
  if(message['body-html']){
    bodyAttachment = {
      fileName: 'body.html',
      contentType: 'text/html',
      buffer: new Buffer(message['body-html']),
    }
  }else{
    bodyAttachment = {
      fileName: 'body.txt',
      contentType: 'text/plain',
      buffer: new Buffer(message['body-plain']),
    }
  }
  message.attachments.unshift(bodyAttachment);
}

//------------------------------------------------------------------------------
function appendMessageToSpreadsheet(message){
  var row = [
    message.timestamp,
    message.sender,
    message.category,
    message.amount,
    message.description
  ];

  _.each(message.attachments, function(attachmentLink, index){
    var cell = ['=HYPERLINK("', attachmentLink, '", "', index, '")'].join('');
    row.push(cell);
  });
    var errorHook = _.curry(logError)(message.sender);
  spreadsheet.append(row, errorHook);
}

//------------------------------------------------------------------------------
//Upload attachments to s3 and replace them with a link to the file
//note that this approach requires the entire attachment to be in RAM
//that should be fine since emails max out at 25mb and we have 512mb on the
//heroku server
function uploadAttachments(parsedMessage, callback){
  var attachmentCount = parsedMessage.attachments.length;
  var uploadedMessage = _.omit(parsedMessage, 'attachments');
  uploadedMessage.attachments = [];
  function done(error, url){
    if(error){
      callback(error);
      return;
    }
    uploadedMessage.attachments.push(url);
    //done with all uploads
    if(uploadedMessage.attachments.length == attachmentCount){
      callback(null, uploadedMessage);
    }
  }
  var timestamp = new Date().getTime() + '/';
  _.each(parsedMessage.attachments, function(attachment, index){
    var fileName = timestamp + index + '-' + attachment.fileName;
    s3.upload(fileName, attachment.contentType, attachment.buffer, done)
  });
}

//------------------------------------------------------------------------------
//email sender a confirmation of what was done
function confirmReceipt(message){
  var fields  = JSON.stringify(message, null, '    ');
  var receipt = 'The following message has been processed:\n' + fields + '\n';
  receipt    += '--Expensa Bot';
  mailer.send({
    to: message.sender,
    subject: 'Message Processed on ' + message.timestamp,
    text: receipt,
  });
}

//------------------------------------------------------------------------------
//notify user with email 'to' of exception/text 'error'
function logError(to, error){
  if(error.stack){
    error = error.stack;
  }
  console.log('Error:', to, error);
  mailer.send({
    to:      to,
    subject: 'Expensa encountered an unexpected error, try your request again.'
      + '(' + moment().format() + ')',
    text:    error + '',
  });
}

// Return a function that calls 'decorateMe' with the same arguments catching any
// exceptions and piping them to 'logError'
function logErrorsOver(decorateMe){
  return function(){
    try{
      _messagePosted.apply(null, arguments);
    }catch(error){
      logError(message.sender, error);
    }
  }
}
