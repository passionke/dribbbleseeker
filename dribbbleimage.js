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
	links:(function(maxuse){
		var links = [];
		var baseUrl = 'http://dribbble.com/shots/popular/';
		links.push(baseUrl);
		for (var i = 2; i<maxuse; i++){
			links.push(baseUrl + '?page=' + i);
		}
		return links;
	})(10),
	method:'serial',
	selector:"$(\".extras img[alt=\'Attachments\']\").closest(\'.dribbble\').find(\'a.dribbble-over\')",
	target:'href',
	nextRule:{
		selector:'$(\'.attachments ul li a\')',
		target:'href',
		method:'serial',
		nextRule:{
			selector:'$(\'#viewer-img img\')',
			target:'src',
			method:'parallel'
		}
	}
}
var dribbbleFilter = function(url, rule, callback){
	if (url == undefined) return;
	var htmlfilter = function(url, rule){
		var jsdom = require('jsdom');
		console.log('fetching data at ' + url);
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
			var result = [];
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
				result.push(link);			
			}
			console.log(result);
			callback(result);
		  });
		});	
	}
	htmlfilter(url, rule);
}
var dribbbleEngine = function(dribbbleRule){
	if (dribbbleRule == undefined) return;	
	var caller = dribbbleEngine.caller;
	var urls = dribbbleRule.links;
	var rule = {};
	rule.selector = dribbbleRule.selector;
	rule.target = dribbbleRule.target;
	var parallelMode = function(){
		for (var i = 0; i < urls.length; i ++ ){
			if (dribbbleRule.inspector != undefined){
				dribbbleRule.inspector.sendout.push(urls[i]);
			}
			new dribbbleFilter(urls[i], rule, (
				function(link){
					return function(links){
						if (dribbbleRule.nextRule != undefined){
							var currentRule = dribbbleRule.nextRule.Clone();
							currentRule.links = links;
							currentRule.inspector = dribbbleRule.inspector.Clone();
							new dribbbleEngine(currentRule);
						}
						dribbbleRule.inspector.emit('done', link);
					}
				})(urls[i]));	
		}
		return;
	}
	var serialMode = function(){
		new dribbbleFilter(urls.pop(), rule, function(links){
			if (dribbbleRule.nextRule != undefined){
				var currentRule = dribbbleRule.nextRule.Clone();
				currentRule.links = links;
				currentRule.inspector = inspector;
				new dribbbleEngine(currentRule);
			}
		});
		var inspector = new events.EventEmitter();
		inspector.sendout = [];
		inspector.addListener('done', function(link){
			inspector.sendout.pop();
			if (inspector.sendout.length == 0){
				new serialMode();
			}
		});		
	}	
	if (dribbbleRule.method == 'parallel'){
		parallelMode();
	}else{
		new serialMode();
	}	
}
new dribbbleEngine(dribbbleRule);
