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
  var post = {
    attachments: [],
  };
  var busboy = new Busboy({headers: req.headers});

  busboy.on('field', function(fieldName, val) {
    post[fieldName] = val;
  });

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    var attachment = {
      fileName: filename,
      contentType: mimetype,
      buffer: null,
    }
    file.on('data', function(data) {
      if(!attachment.buffer) {
        attachment.buffer = data;
      } else {
        attachment.buffer = Buffer.concat(attachment.buffer, data);
      }
    });
    file.on('end', function(){
      post.attachments.push(attachment);
    });
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
      handlePost(req, res, handler);
    }
  });

  server.listen(port, function() {
    console.log('listening. port = ' + port);
  });
}

module.exports = PostServer;
