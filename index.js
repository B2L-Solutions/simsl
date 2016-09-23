#!/usr/bin/env node
var readline = require('readline'),
	fs = require('fs'),
	md5 = require('md5'),
	jsonwebtoken = require('jsonwebtoken'),
	request = require('request'),
	chokidar = require('chokidar'),
	randomWords = require('random-words'),
	http = require('http');

//default options
var options = {
	'webhook': 'http://localhost:4000/submit',
	'tags': [],
	'form_count': 1,
	'echo': true,
	'server_host': 'localhost',
	'server_port': '4989',
};

//load an option file
var optionsFile = process.argv[2] || 'simsl.json';
if (!optionsFile.match(/\.json$/)) optionsFile += '.json';

try{
	fs.accessSync(optionsFile, fs.F_OK);
	console.log('Using configuration file ' + optionsFile);
}
catch(e){
	console.log('creating default configuration file ' + optionsFile);
	fs.writeFileSync(optionsFile, JSON.stringify(options, null, 4));
}

try{
	fs.accessSync(optionsFile, fs.R_OK & fs.w_OK);
}
catch(e){
	//if we can't read or write to the file, we notify now
	console.log('Unable to secure rw access to the configuration file ' + optionsFile);
	console.log(e);
	process.exit(1);
}

function readConfigFromDisk(){
	try{
		return JSON.parse(fs.readFileSync(optionsFile, 'utf-8'));
	}
	catch (e){
		console.log('Unable to read ' + optionsFile + '. (' + e + ')');
		return options;
	}
}

function loadOptions(){
	options = Object.assign(options, readConfigFromDisk());
	
	if (Array.isArray(options['tags'])){
		//if the tags array is a flat array, inflate it into an object
		var tagsObject = {};
		options['tags'].forEach(function(tag){
			tagsObject[tag] = 'string';
		});
		
		options['tags'] = tagsObject;
	}
}

//ok cool, now we know the option file and we can read & write to it
//now let's watch it
var watcher = chokidar.watch(optionsFile);
watcher.on('change', function(){
	console.log('Change detected in configuration...');
	loadOptions();
	console.log(' updated.\n');
});

loadOptions();



//send requests locally

//preload the cert file for signing requests
var cert = fs.readFileSync('simsl.key');

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', function(input){
	if (input == '') emulateSLRequest();
	else if (['exit', 'e', 'stop'].indexOf(input) >= 0){
		rl.close();
		process.exit();
	}
	else{
		console.log('Sorry, I don\'t understand this command. Press Enter to emulate a request or type "exit" to terminate.');
		rl.prompt();
	}
});

console.log('Press Enter to emulate a request\n');
console.log('To terminate, type "exit" or press ctrl+c\n');
rl.prompt();

//emuate a request SL -> service
function emulateSLRequest(){
	console.log('Emulating StreamLive request\n');
	
	var data = [];
	
	//create as many fake forms as requested
	for (var i = 0, l = parseInt(options.form_count); i < l; i++){
		var form = {};
		
		//create a bunch of fake tags
		for (var tag in options['tags']){
			form[tag] = generateTagValue(options['tags'][tag]);
		}
		
		//add a fake id and token
		form['_id'] = md5(new Date().getTime());
		form['_token'] = jsonwebtoken.sign({}, cert, {algorithm: 'RS256'});
		
		data.push(form);
	}
	
	console.log('Sending the following data:');
	console.log(data);
	
	request.post(options.webhook, {form: data}, function(err, response, body){
		if (err) console.log('Error sending request to ' + options['webhook']  + ' : ' + err.code);
		
		rl.prompt();
	});
}

function generateTagValue(type){
	if (Array.isArray(type)){
		//we need to generate an array of values
		var values = [];
		
		type.forEach(function(type){
			values.push(generateTagValue(type));
		});
		
		return values;
	}
	else{
		var value = null;
		
		switch(type){
			case 'int':
			case 'integer':
			case 'number':
				value = Math.round(Math.random() * 1000);
				break;
			case 'float':
				value = Math.random();
				break;
			case 'bool':
			case 'boolean':
				value = Math.random() > .5;
				break;
			case 'date':
				value = (new Date()).toISOString();
				break;
			case 'file':
				value = {
					name: randomWords(),
					thumbnail: 'http://placehold.it/400x400',
					urls: ['http://placehold.it/400x400']
				};
				break;
			case 'string':
				value = randomWords({ min: 3, max: 10, join: ' ' });
				break;
			default:
				value = type;
				break;
		}
		
		return value;
	}
}


//act as a simple echo server
if (options['echo']){
	var server = http.createServer(function(req, resp){
		console.log('Received ' + req.method + ' request ' + ' on ' + req.url);
		resp.statusCode = 200;
		resp.end();
		rl.prompt();
	});

	server.listen(options['server_port'], options['server_host'], function(){
		console.log('Echo server running on http://' + options['server_host'] + ':' + options['server_port']);
		rl.prompt();
	});
}