var request = require('request'),
    imagehost = 'http://dribbble.com',
    mysqldb = require('./mysqldb.js'),
    events = require('events');

Object.prototype.Clone = function()
{
    var objClone;
    if ( this.constructor == Object ) objClone = new this.constructor();
    else objClone = new this.constructor(this.valueOf());
    for ( var key in this )
     {
        if ( objClone[key] != this[key] )
         {
            if ( typeof(this[key]) == 'object' )
             {
                 objClone[key] = this[key].Clone();
             }
            else
             {
                 objClone[key] = this[key];
             }
         }
     }
     //objClone.toString = this.toString;
     //objClone.valueOf = this.valueOf;
    return objClone;
}
var getInfoBylinks = function(infopage, prelink){	
	for (var i = 0; i < infopage.length; i++){
		var item = {};
		if (infopage[i].links[0] == prelink){
			var info = infopage[i].info;
			item['title'] = info[0].title;
			item['tags'] = info[1].tags;
			item['date'] = info[3].date.toDateString();
			item['color'] = info[2]['color'];
			return item;
		}else{
			item['title'] = 'notitle';
			item['tags'] = '';
			item['date'] = new Date().toDateString();
			item['color'] = '';
		}
	}
	return item;
}
var saveDataToDataBase = function(data){
	var infopage = data[1];
	var imgurls = data[2];
	for (var i = 0; i < imgurls.length; i++){
		var prelink = imgurls[i].prelink;
		var item = getInfoBylinks(infopage, prelink);
		item['imgurl'] = imgurls[i].links.join(',');
		mysqldb.insertLink(item['imgurl'], item['title'], item['date'], item['tags'], item['color']);
	}
}
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
			},{
				key:'date',
				keyselector:'new Date($(\'span.screenshot-dash\').text())'
			}
		],
		nextRule:{
			selector:'$(\'#viewer-img img\')',
			target:'src',
			method:'parallel',
			save:true
		}
	}
}
var dribbbleFilter = function(url, rule, callb){
	if (url == undefined) return;
	var htmlfilter = function(url, rule){
		var jsdom = require('jsdom');
		//console.log('fetching data at ' + url);
		request({ uri:url }, function (error, response, body) {
		  if (error) {
			console.log('Error when connect to ' + url);
		  }	  
		  jsdom.env({
			html: body,
			scripts: [
			  'jquery.js'
			]
		  }, function (err, window) {
		  	if (err){
		  		console.log(err);
		  	}
			var $ = window.jQuery;
			var queue = eval(rule.selector);
			var info = [];
			var links = [];
			for (var i = 0; i< queue.length; i ++){
				var link = $(queue[i]).attr(rule.target);
				var args = url.match(/^(([a-z]+):\/\/)?([^\/\?#]+)\/*([^\?#]*)\??([^#]*)#?(\w*)$/i);  
				var parase = {  
					'schema': args[2],  
					'host': args[3],  
					'path': args[4],  
					'query': args[5],  
					'anchor': args[6]  
				};
				if (link.indexOf('http://') < 0){
					link = parase['schema'] + '://' + parase['host'] + link;
				}
				links.push(link);			
			}
			if (rule.info != undefined){
				for (i = 0; i < rule.info.length; i++){
					var item = rule.info[i];
					var temp = {}
					if (temp['key'] == undefined){
						temp[item['key']] = eval(item.keyselector);
					}
					info.push(temp);							
				}	
			}
			info.push({links:links});	
			callb(url, links, info);
		  });
		});	
	}
	htmlfilter(url, rule);
}
var data = [];
var dribbbleEngine = function(dribbbleRule){
	if (dribbbleRule == undefined) return;	
	var urls = dribbbleRule.links;
	var async = require('async');
	var rule = {};
	rule.selector = dribbbleRule.selector;
	rule.target = dribbbleRule.target;
	rule.info = dribbbleRule.info;
	//console.log(rule.info);	
	var automtask = function(url, rule){
		var that = {};
		that.url = url;
		that.rule = rule.Clone();
		return function(callback){
			//console.log(that);
			new dribbbleFilter(that.url, that.rule, function(url, links, info){
				callback(null, {prelink:url, links:links, info:info});
			});
		};
	};
	
	var tasklist = [];
	for (var i = 0; i < urls.length; i ++ ){
		if (typeof(urls[i]) == 'string'){
			tasklist.push(new automtask(urls[i], rule));	
		}			
	}
	
	async.series(tasklist, function(err, results){
		console.log(JSON.stringify(results));
		data.push(results);
		var links = [];
		for (var i = 0; i < results.length; i++){
			links = links.concat(results[i].links);
		}
		if (dribbbleRule.nextRule != undefined){
			var nextRule = dribbbleRule.nextRule.Clone();
			nextRule.links = links;
			new dribbbleEngine(nextRule);
		}else{
			saveDataToDataBase(data);
		}
	});
}
dribbbleEngine(dribbbleRule);
