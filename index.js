var http = require('http');
var Busboy = require('busboy');
var _ = require('lodash');
var Spreadsheet = require('edit-google-spreadsheet');

//environment variables
var env = process.env;
var port = env.PORT || 5000;

var mailgunDomain = env.MAILGUN_DOMAIN;
var mailgun = require('mailgun-js')({
  apiKey: env.MAILGUN_API_KEY,
  domain: mailgunDomain,
});

var inboundMessageEndpoint = env.ENDPOINT_SECRET;

var gDriveEmail = env.GDRIVE_EMAIL;
var gDriveFileId = env.GDRIVE_FILEID;
var gDriveKey = env.GDRIVE_KEY;

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
  var category = message.recipient.replace('@' + mailgunDomain, '');

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
    timestamp:   moment().format('DD/MM/YY hh:mm a')
    sender:      sender,
    category:    category,
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
  function onSpreadsheetLogin(spreadsheet){
    spreadsheet.receive(withErr('receive',
      _.curry(onSpreadsheetReceive)(_, spreadsheet))
    );
  }
  function onSpreadsheetReceive(spreadsheet, rows, info){
    appendRowToSpreadsheet(spreadsheet, info.nextRow);
  }
  function appendRowToSpreadsheet(spreadsheet, rowNum){
    var row = {};
    row[rowNum] = {
      1:message.timestamp,
      2:message.sender,
      3:message.category,
      4:message.amount,
      5:message.description,
    };
    spreadsheet.add(row);
    spreadsheet.send(withErr('send', _.noop));
  }
  Spreadsheet.load({
    debug:true,
    spreadsheetId: gDriveFileId,
    worksheetName: 'Sheet1',
    oauth:{
      email: gDriveEmail,
      key: gDriveKey,
    },
  }, withErr('login', onSpreadsheetLogin));

  //wrap a function in another function that logs errors passed in the first
  //argument
  function withErr(opname, fn){
    return function(){
      args = _.toArray(arguments);

      var error = args.pop();
      if(error){
        logError(message.sender, opname + ' failed: ' + error);
        throw error;
      }

      fn.apply(null, args);
    }
  }
}

//email sender a confirmation of what was done
function confirmReceipt(message){
  var fields = JSON.stringify(message, null, '    ');
  var receipt = 'The following message has been processed:\n' + fields + '\n';
  reciept    += '--Expensa Bot';
  sendmail({
    to: message.sender,
    subject: 'Message Processed on ' + fields.timestamp,
    text: receipt,
  });
}

//notify user with email 'to' of error described by message
function logError(to, message){
  console.log('Error:', to, message);
  sendMail({
    to: to,
    subject: 'expensa encountered an unexpected error, try your request again.',
    text: message,
  });
}
//UTILITIES---------------------------------------------------------------------
function sendMail(email){
  email.from = 'Expensa Bot <expensa-bot@' + mailgunDomain + '>';
  mailgun.messages().send(email, function (error, body) {
    if(error){
      console.log('error sending mail:',email.to, error);
    }
  });
}
