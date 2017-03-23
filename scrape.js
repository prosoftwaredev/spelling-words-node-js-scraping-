/******************************************************
 *
 * This is a node based webscraper that:
 * 1. Scrapes a web page and get a list of urls
 * 2. Traverses the URLs and scrapes each webpage
 * 3. Collects information from each URL and
 * 4. Outputs to STDOUT or to a file
 *
 ****************************************************/

var fs      = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');

const URL = 'http://myspellit.com/lang_arabic.html'; 		// The webpage to scrape
const SUBCATEGORY = "latin";
const AUDIOURL = "https://media.merriam-webster.com/audio/prons/en/us/mp3/";

var count = 1;
var json = {};
var tempjson = {};

request(URL, function(error, response, html){

	if (error || response.statusCode != 200) {
		console.log('Error:' );
		process.exit(0);
	}

	if(!error){
		var $ = cheerio.load(html);

		// find study words
		$('div#tab_pane_words_study ol.word.list.study').find('li').each(function(i, elm){
			var data = $(this).html().trim();
			var text = $(this).text().trim();
			$ = cheerio.load(data);
			var url = $('a').attr('href');

			if (url !== undefined){
				json[count] = {};
				json[count]['url'] = url;
				json[count]['text'] = text;
				json[count]['subcategory'] = SUBCATEGORY;

//				console.log("data is:", data);
//				console.log("i:", count, "url:", url, "text:", text);
				count++;
			}
		});

		$ = cheerio.load(html);
		// find study words
		$('div#tab_pane_challenge_words ol.word.list.study').find('li').each(function(i, elm){
			var data = $(this).html().trim();
			var text = $(this).text().trim();
			$ = cheerio.load(data);
			var url = $('a').attr('href');

			if (url !== undefined){
				json[count] = {};
				json[count]['url'] = url;
				json[count]['text'] = text;
				json[count]['subcategory'] = SUBCATEGORY;

//				console.log("data is:", data);
//				console.log("i:", count, "url:", url, "text:", text);
				count++;
			}
		});
	}

//	Object.keys(json).forEach(function(key) {
//		console.log("One: ", key, json[key].url, json[key].text, json[key].subcategory);
//	});

	var jsonlength = Object.keys(json).length;
	var output = {};
	var index = 1;
	var delta = 0;


	var download_dir = './download';
	if (!fs.existsSync(download_dir)){
	    fs.mkdirSync(download_dir);
	}

	async.forEach(json, function(value, key) {

		scrape_url(value, function (err ,result) {
			
			output[index] = {};

			if (result != undefined && !err) {
				output[index]['url'] = value.url;
				output[index]['text'] = value.text;
				output[index]['subcategory'] = value.subcategory;
				output[index]['name'] = result.name;
				output[index]['partsofspeech'] = result.partsofspeech;
				output[index]['pronunciation'] = result.pronunciation;
				output[index]['audiourl'] = result.audiourl;
				if (output[index]['name'] == '') {
					console.log(output[index]['text'] + 'word found, but no data');
					delete output[index];
					delta ++;
				} else {
					index ++;
				}

			}

			if (index == jsonlength - delta + 1) {
				fs.writeFile('output.json', JSON.stringify(output, null, 4), function(err){

					console.log('File successfully written! - Check your project directory for the output.json file');

				})

			}

		});

	}, function(err) {

		if (err) {

			console.log(err);
			
		}
		
	})

});


function scrape_url(json, cb){

	// console.log(json.url, json.text, json.subcategory);
	request(json.url, function (error, response, html) {

		if (error || response.statusCode != 200) {
			console.log('Error:' );
			cb(error);
		}

		const $ = cheerio.load(html);

		const name = $('div.word-and-pronunciation h1').text();
		const partsofspeech = $('div.word-attributes span.main-attr').first().text().trim();
		const pronunciation = $('div.word-attributes span.pr').first().text().trim();
		const audioclip = $('div.word-and-pronunciation a.play-pron').attr('data-file');
		const audiodir = $('div.word-and-pronunciation a.play-pron').attr('data-dir');
		const audiourl = AUDIOURL + audiodir + "/" + audioclip + ".mp3";

		
		var subdownload_dir = './download' + '/' + audiodir;

		if (!fs.existsSync(subdownload_dir) && audiodir != undefined){
		    fs.mkdirSync(subdownload_dir);
		}

		if (audiodir != undefined) {
			request
			  	.get(audiourl)
			  	.on('error', function(err) {
			    	// handle error
			  	})
		  		.pipe(fs.createWriteStream(subdownload_dir + '/' + audioclip + ".mp3"));
		}


		json['name'] = name;
		json['partsofspeech'] = partsofspeech;
		json['pronunciation'] = pronunciation;
		json['audiourl'] = audiourl;
		// console.log("name: ", name, "parts:", partsofspeech);
		// console.log("pronunciation: ", pronunciation, "audiourl:", audiourl);
 
		cb(null, json);
	});
}
