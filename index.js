var http = require('http');
var Busboy = require('busboy');

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

//setup an http server to parse & forward posts to inboundMessageEndpoint to messagePosted
var server = http.createServer(function(req, res) {
  if (req.method === 'POST' && req.url === '/' + inboundMessageEndpoint) {
    var busboy = new Busboy({headers: req.headers});
    busboy.on('field', function(fieldname, val) {
      console.log(fieldname, '=', val);
    });
    busboy.on('finish', function() {
      res.writeHead(200, { Connection: 'close' });
      res.end('got it.');
    });
    req.pipe(busboy);
  }
})

server.listen(port, function() {
  console.log('listening. port = ' + port);
});

//UTILITIES---------------------------------------------------------------------
