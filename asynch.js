var request = require('request'),
    imagehost = 'http://dribbble.com',
    mysqldb = require('./mysqldb.js');


var dribbbleRule = {
	stopcase:function(counter){
		if (counter > maxuse)
			return true;
		else
			return false;
	},
	links:(function(maxuse){
		var links = [];
		var baseUrl = 'http://dribbble.com/shots/popular/';
		links.push(baseUrl);
		for (var i = 2; i<maxuse; i++){
			links.push(baseUrl + '?page=' + i);
		}
		return links;
	})(10)
	,
	info:[
	{
		key:'title',
		keyselector:''
	}
	],	
	method:'serial',
	selector:"$(\".extras img[alt=\'Attachments\']\").closest(\'.dribbble\').find(\'a.dribbble-over\')",
	target:'href',
	nextRule:{
		selector:'$(\'.attachments ul li a\')',
		target:'href',
		method:'serial',
		info:[
			{
				key:'title',
				keyselector:'$(\'#screenshot-title\').text()'
			},
			{
				key:'tags',
				keyselector:'$(\'#tags li strong\').text(function(i,c){return c+\',\'}).text().replace(\',,\',\',\')'
			},{
				key:'color',
				keyselector:'$(\'.color-chips li a\').text(function(i,c){return c+\',\'}).text().replace(\',,\',\',\')'
			}
		],
		nextRule:{
			selector:'$(\'#viewer-img img\')',
			target:'src',
			info:[
			{
				key:'imagelink',
				keyselector:'$(\'#viewer-img img\').attr(\'src\')'
			}			
			],
			method:'parallel',
			save:true
		}
	}
}
var dribbbleEngine = function(urls, rule){
	
}