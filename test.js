var mysqldb = require('./mysqldb.js');
var async = require('async');
async.series([
    function(callback){
        // do some stuff ...
        b = 2;
        setTimeout(function(){
            callback(undefined, 'one' + b);
        }, 2300);        
    },
    function(callback){
        // do some more stuff ...
        callback(null, 'two');
    },
],
// optional callback
function(err, results){
    // results is now equal to ['one', 'two']
    console.log(results);
});
