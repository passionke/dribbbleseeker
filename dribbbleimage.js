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
     objClone.toString = this.toString;
     objClone.valueOf = this.valueOf;
    return objClone;
}

var dribbbleRule = {
	stopcase:function(counter){
		if (counter > maxuse)
			return true;
		else
			return false;
	},
	results:{	
		link:(function(maxuse){
			var links = [];
			var baseUrl = 'http://dribbble.com/shots/popular/';
			links.push(baseUrl);
			for (var i = 2; i<maxuse; i++){
				links.push(baseUrl + '?page=' + i);
			}
			return links;
		})(3)
	},
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
				keyselector:'$(\'#screenshot-title\')'
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
var dribbbleFilter = function(url, rule, callback){
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
			if (rule.results == undefined){
				rule.results = {};			
				rule.results.info = [];				
			}
			rule.results.link = [];
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
				if (link.indexOf(parase['host']) < 0){
					link = parase['schema'] + '://' + parase['host'] + link;
				}
				rule.results.link.push(link);			
			}
			if (rule.info != undefined){
				for (i = 0; i < rule.info.length; i++){
					var temp = {}
					temp[rule.info[i].key] = eval(rule.info[i].keyselector);
					rule.results.info.push(temp);
				}
			}
			callback(rule.results.Clone());
		  });
		});	
	}
	htmlfilter(url, rule);
}
var dribbbleEngine = function(dribbbleRule){
	if (dribbbleRule == undefined) return;	
	var caller = dribbbleEngine.caller;
	var urls = dribbbleRule.results.link || dribbbleRule.links;
	var async = require('async');
	var rule = {};
	rule.selector = dribbbleRule.selector;
	rule.target = dribbbleRule.target;
	rule.info = dribbbleRule.info;	
	var automtask = function(url, rule){
		var that = {};
		that.url = url;
		that.rule = rule;
		return function(callback){
			//console.log(that);
			new dribbbleFilter(that.url, that.rule, function(results){
				if (dribbbleRule.nextRule != undefined){
					var currentRule = dribbbleRule.nextRule.Clone();
					currentRule.results = results;
					new dribbbleEngine(currentRule);					
				}
				callback(null, results);
			});
			
		};
	};
	
	var tasklist = [];
	for (var i = 0; i < urls.length; i ++ ){			
		tasklist.push(new automtask(urls[i], rule));
	}
	if (dribbbleRule.method == 'parallel'){
		async.parallel(tasklist, function(err, results){
			//console.log(results);
		});
	}else{
		async.series(tasklist, function(err, results){
			console.log(JSON.stringify(results));
		});
	}	
}
dribbbleEngine(dribbbleRule);
