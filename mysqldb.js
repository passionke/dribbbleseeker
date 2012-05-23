var Client = require('mysql').Client,
	client = new Client(),
	
	dataBaseName = 'dribbbleimage',
	tableName = 'dribbble';
	
client.user = 'root';
client.password = 'sskirngke';

var insertLink = function(url, title, date){
	client.query('USE ' + tableName);
	client.query(
		 	'INSERT INTO '+ tableName +' ' +  
  			'SET title = ?, date = ?, url = ?',  
  			[title, date, url]);
  	client.close();
}
exports.insertLink = insertLink;
