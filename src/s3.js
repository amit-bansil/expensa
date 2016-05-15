/**
 * upload a buffer to s3 and return a publicly accessible url
 * TODO spec this out
 */

var s3 = require('s3');
var fs = require('fs');

function S3Class(options){
  this.client = s3.createClient({
    s3Options: options
  });
  this.bucket = options.bucket;
}

S3Class.prototype.upload = function(filename, contentType, buffer, callback){
  var bucket = this.bucket;

  var tempFile = '/tmp/' + new Date().getTime();

  fs.writeFileSync(tempFile, buffer);

  function done(error){
    fs.unlinkSync(tempFile);
    var uploadUrl = 'http://' + bucket + '.s3.amazonaws.com/' + filename;
    callback(error, uploadUrl);
  }

  var uploader = this.client.uploadFile({
    localFile: tempFile,
    s3Params: {
      Bucket:      bucket,
      Key:         filename,
      ACL:         'public-read',
      ContentType: contentType,
    }
  });
  uploader.on('error', function(err) {
    done(err);
  });
  uploader.on('end', function() {
    done();
  });
}

module.exports = S3Class;
