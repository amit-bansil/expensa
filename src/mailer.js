/**
 * Send an email using Mailgun. Usage:
 * var MailerClass = require('./mailer');
 * var mailer = new MailerClass({
 *   domain: 'domain.mailgun.com',
 *   apiKey: 'xxx',
 *   from: 'Some Bot <bot@some.com>'
 * });
 * mailer.send({
 *  to: 'Some Body <some.body@domain.com>',
 *  subject: 'Hello World',
 *  text: 'Hey!\nHow's it going?'
 * });
 */
var Mailgun = require('mailgun-js');

function Mail(options){
  this.options = options;
}

Mail.prototype.send = function(email){
  email.from = this.options.from;
  Mailgun(options).messages().send(email, function (error, body) {
    if(error){
      console.log('error sending mail:',email, error);
    }
  });
}

module.exports = Mail;
