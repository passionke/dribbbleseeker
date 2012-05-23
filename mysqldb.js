var Client = require('mysql').Client,
	client = new Client(),
	
	dataBaseName = 'dribbbleimage',
	tableName = 'dribbblelink';
	
client.user = 'root';
client.password = 'sskirngke';

var insertLink = function(url, title, date, tags, color){
	client.query('USE ' + dataBaseName);
	client.query(
		 	'INSERT INTO '+ tableName +' ' +  
  			'SET title = ?, date = ?, url = ?, tags = ?, color = ?',  
  			[title, date, url, tags, color]);
	console.log('insert data ' + url + ' ' + title + ' ' + date + ' ' + tags + ' ' + color);
  	client.end();
}
exports.insertLink = insertLink;
