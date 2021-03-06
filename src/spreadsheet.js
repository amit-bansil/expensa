/*
 * A simple wrapper around google spreadsheets that allows you to append rows
 * to a spreadsheet. Usage:
 * var SpreadsheetClass = require('./spreadsheet');
 * // parameters are from https://www.npmjs.com/package/google-spreadsheet-append
 * var spreadsheet = new SpreadsheetClass({
 *   email:<service account email>,
 *   filedId:<spreadsheet file id>,
 *   key:<RAW contents of pem file>,
 * });
 * spreadsheet.append([1,2,3], function(error){});
 */

var editSpreadsheet = require('edit-google-spreadsheet');
var _ = require('lodash');

function SpreadsheetClass(options){
  this.options = options;
}

SpreadsheetClass.prototype.append = function(row, callback){
  function onSpreadsheetLogin(spreadsheet){
    spreadsheet.receive(withErr('receive',
      _.curry(onSpreadsheetReceive)(spreadsheet)
    ));
  }
  function onSpreadsheetReceive(spreadsheet, rows, info){
    appendRowToSpreadsheet(spreadsheet, info.nextRow);
  }
  function appendRowToSpreadsheet(spreadsheet, rowNum){
    //build cells we are going to insert by creating a 1 indexed sparse map
    var cells = {};
    cells[rowNum] = {};
    _.each(row, function(value, index){
      cells[rowNum][index + 1] = value;
    });

    spreadsheet.add(cells);
    spreadsheet.send(withErr('send', _.noop));
  }
  editSpreadsheet.load({
    debug:false,
    spreadsheetId: this.options.fileId,
    worksheetName: 'Sheet1',
    oauth:{
      email: this.options.email,
      key: this.options.key,
    },
  }, withErr('login', onSpreadsheetLogin));
  //wrap a function in another function that logs errors passed in the first
  //argument
  function withErr(opname, fn){
    return function(){
      args = _.toArray(arguments);
      var error = args.shift();
      if(error){
        callback(opname + ' failed: ' + JSON.stringify(error));
        console.log(error, error.stack);
      }

      fn.apply(null, args);
    }
  }
}

module.exports = SpreadsheetClass;
