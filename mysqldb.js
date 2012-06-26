var Client = require('mysql').Client,
	client = new Client(),
	
	dataBaseName = 'dribbbleimage',
	tableName = 'dribbblelink';
	
client.user = 'root';
client.password = 'sskirngke';

var use = function(){
	client.query('USE ' + dataBaseName);
}
var insertLink = function(url, title, date, tags, color){
	
	client.query(
		 	'REPLACE INTO '+ tableName +' ' +  
  			'SET title = ?, date = ?, url = ?, tags = ?, color = ?',  
  			[title, date, url, tags, color]);
	console.log('insert data ' + url + ' ' + title + ' ' + date + ' ' + tags + ' ' + color);
}
var close = function(){
	client.end();
}
exports.insertLink = insertLink;
exports.use = use;
exports.close = close;
