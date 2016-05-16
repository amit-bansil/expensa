/**
 * upload a buffer to s3 and return a publicly accessible url. Usage:
 * var S3Class = require('./s3');
 * var s3 = new S3Class({
 *   accessKeyId:     <iamAccessKey>,
 *   secretAccessKey: <iamSecretKey>,
 *   bucket:          <some.bucket>,
 * });
 * var link = s3.upload('fileName.txt', 'text/plain', buffer, function(url){
 *   console.log(url);
 * })
 *
 * Note that this code expects the bucket to be in the us standard region.
 */

var AWS = require('aws-sdk');

function S3Class(options){
  this.options = options;
}

S3Class.prototype.upload = function(filename, contentType, buffer, callback){
  var bucket = this.options.bucket;

  //thanks to some genius at amazon the access keys are global variables
  //so we need to clobber them which might break other clients with different ids
  AWS.config.update({
    accessKeyId: this.options.accessKeyId,
    secretAccessKey: this.options.secretAccessKey,
  });
  var s3 = new AWS.S3();

  function done(error){
    var uploadUrl = 'http://' + bucket + '.s3.amazonaws.com/' + filename;
    callback(error, uploadUrl);
  }

  var s3 = new AWS.S3({apiVersion: '2006-03-01'});
  s3.putObject({
    Bucket:      bucket,
    Key:         filename,
    Body:        buffer,
    ACL:         'public-read',
    ContentType: contentType,
  }, done);
}

module.exports = S3Class;
