var request = require('request'),
    imagehost = 'http://dribbble.com',
    mysqldb = require('./mysqldb.js'),
    events = require('events');
/**
 * 时间对象的格式化;
 */
Date.prototype.format = function(format) {
    /*
     * eg:format="YYYY-MM-dd hh:mm:ss";
     */
    var o = {
    	"Y+" :this.getFullYear(),
        "M+" :this.getMonth() + 1, // month
        "d+" :this.getDate(), // day
        "h+" :this.getHours(), // hour
        "m+" :this.getMinutes(), // minute
        "s+" :this.getSeconds(), // second
        "q+" :Math.floor((this.getMonth() + 3) / 3), // quarter
        "S" :this.getMilliseconds()
    // millisecond
    }
    if (format === undefined){
    	format = "YYYY-MM-dd hh:mm:ss";
    }
    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "")
                .substr(4 - RegExp.$1.length));
    }

    for ( var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k]
                    : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}

Array.prototype.unique2 = function () {
    return this.sort().join(",,").replace(/(,|^)([^,]+)(,,\2)+(,|$)/g,"$1$2$4").replace(/,,+/g,",").replace(/,$/,"").split(",");
}

Object.prototype.Clone = function(){
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
	var item = {
			'title':'notitle',
			'tags':'',
			'date':new Date().format(),
			'color':''
	};	
	for (var i = 0; i < infopage.length; i++){		
		if (infopage[i].links.indexOf(prelink) != -1){
			var info = infopage[i].info;
			item['title'] = info[0].title;
			item['tags'] = info[1].tags;
			item['date'] = info[3].date.format();
			item['color'] = info[2]['color'];
			break;
		}
	}
	return item;
}
var saveDataToDataBase = function(data){
	var infopage = data[1];
	var imgurls = data[2];
	mysqldb.use();
	for (var i = 0; i < imgurls.length; i++){
		var prelink = imgurls[i].prelink;
		var item = getInfoBylinks(infopage, prelink);
		item['imgurl'] = imgurls[i].links.join(',');
		mysqldb.insertLink(item['imgurl'], item['title'], item['date'], item['tags'], item['color']);
	}
	mysqldb.close();
}
var dribbbleRule = {
	stopRule:'$(\'.next_page\').length == 0',
	links:(function(maxuse){
		var links = [];
		var baseUrl = 'http://dribbble.com/shots/popular/';
		links.push(baseUrl);
		for (var i = 2; i<maxuse; i++){
			links.push(baseUrl + '?page=' + i);
		}
		return links;
	})(100),
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
		request({ uri:url }, function (error, response, body) {
		  if (error) {
			console.log('Error when connect to ' + url);
			return;
		  }
		  console.log('Get response at ' + url);	  
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
			callb(url, links, info, eval(rule.stopRule));
			console.log(eval(rule.stopRule));
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
	rule.stopRule = dribbbleRule.stopRule;

	var automtask = function(url, rule){
		var that = {};
		that.url = url;
		that.rule = rule.Clone();
		return function(callback){
			//console.log(that);
			new dribbbleFilter(that.url, that.rule, function(url, links, info, go){
				(function(url, links, info, go){
					setTimeout(function(){
						callback(go, {prelink:url, links:links, info:info});
					}, Math.random()*500 + 500);
				})(url,links, info, go);				
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
