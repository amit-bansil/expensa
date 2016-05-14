var _ = require('lodash');
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

function handlePost(req, res, handler){
  var post = {};
  var busboy = new Busboy({headers: req.headers});

  busboy.on('field', function(fieldName, val) {
    post[fieldName] = val;
  });

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    var attachment = {
      
    }
    console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
    file.on('data', function(data) {
      console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
      console.log(data);
    });
    file.on('end', _.noop);
  });
  busboy.on('finish', function() {
    res.writeHead(200, {Connection: 'close'});
    res.end('got it.');
    handler(req.url, post);
  });
  req.pipe(busboy);
}

PostServer.prototype.listen = function(handler){
  var port = this.port;
  var server = http.createServer(function(req, res) {
    if (req.method === 'POST') {
      handlePost(req, res, hander);
    }
  });

  server.listen(port, function() {
    console.log('listening. port = ' + port);
  });
}

module.exports = PostServer;
