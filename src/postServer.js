var http = require('http');
var Busboy = require('busboy');

/*
 * A simple http server that accepts multipart form post requests. Usage:
 *
 * var PostServerClass = require('./postServer');
 * var postServer = new PostServerClass(port);
 * postServer.listen(function(endopintPath, post){
 *   ...
 * });
 *
 * endpointPath is the path the post request was made to.
 * post is an object with TODO spec this out.
 */

function PostServer(port){
  this.port = port;
}

PostServer.prototype.listen = function(handler){
  var server = http.createServer(function(req, res) {
    post = {};
    if (req.method === 'POST') {
      var busboy = new Busboy({headers: req.headers});
      busboy.on('field', function(fieldName, val) {
        post[fieldName] = val;
      });
      busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
        file.on('data', function(data) {
          console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
          console.log(data);
        });
        file.on('end', function() {
          console.log('File [' + fieldname + '] Finished');
        });
      });
      busboy.on('finish', function() {
        res.writeHead(200, {Connection: 'close'});
        res.end('got it.');
        handler(req.url, post);
      });
      req.pipe(busboy);
    }
  });

  server.listen(this.port, function() {
    console.log('listening. port = ' + port);
  });
}

module.exports = PostServer;
