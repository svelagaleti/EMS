var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nodemailer = require("nodemailer");

var routes = require('./routes/index');
var users = require('./routes/users');
var Cloudant = require('cloudant');
var me = 'sreenu';
var password = '34537970';
var cloudant = new Cloudant({
	account : me,
	password : password
});

var transporter = nodemailer
		.createTransport('smtps://user%40gmail.com:pass@smtp.gmail.com');

var app = express();

var db = cloudant.db.use('satya');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended : true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public'));
app.use('/', routes);
app.use('/users', users);

app.get('/index', function(req, res) {
	res.sendFile(__dirname + '/public/' + 'index.html');
});

var hasOwnProperty = Object.prototype.hasOwnProperty;

function isEmpty(obj) {

	// null and undefined are "empty"
	if (obj == null) {
		return true;
	}

	// Assume if it has a length property with a non-zero value
	// that that property is correct.
	if (obj.length > 0) {
		return false;
	}
	if (obj.length === 0) {
		return true;
	}

	// Otherwise, does it have any properties of its own?
	// Note that this doesn't handle
	// toString and valueOf enumeration bugs in IE < 9
	for ( var key in obj) {
		if (hasOwnProperty.call(obj, key)) {
			return false;
		}
	}

	return true;
}

function getRandomPassword() {
	var charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789";
	var rand;
	var retrunString = "";
	for (var i = 0; i < 8; i++) {
		returnString += charSet.charAt(Math.floor(Math.random()
				* (charSet.length - 0 + 1)) + 0);
	}
	return returnString;
}
// feedback process code how to send the feed back and update the feedback with
// ld feedback for the same user*/
app.post('/submitFeedback', function(req, res) {
	console.log("ASDFASDFASD");
	var fbkrName = req.body.fbkrName;
	var fbkrMail = req.body.fbkrMail;
	var fback = req.body.fback;

	db.get(fbkrMail, function(err, data) {
		console.log(err);
		if (!isEmpty(data)) {
			var feedbackJson = JSON.stringify(data);
			var feedbackStringJSON = JSON.parse(feedbackJson);
			feedbackStringJSON.feedback = fback;
			db.insert({
				_id : fbkrMail,
				_rev : feedbackStringJSON._rev,
				name : fbkrName,
				feedback : fback
			}, function(err, data) {
				console.log(err);
				res.send("<h1>feedback updated successfully</h1>");
			});
		} else {
			db.insert({
				_id : fbkrMail,
				name : fbkrName,
				feedback : fback
			}, function(err, data) {
				console.log(err);
				res.send("<h1>feedback submission done</h1>");
			});
		}
	});
});

app.post('/registration', function(req, res) {
	db.insert({
		_id : req.body.mailAddr,
		name : req.body.name,
		password : req.body.password,
		mobile : req.body.mobile
	}, function(err, data) {
		console.log(err);
		res.send("<h1>Registration done</h1>");
	});
});

app.post('/login', function(req, res) {
	var mailAddr = req.body.mailAddr;
	var password = req.body.password;
	db.get(mailAddr, function(err, data) {
		if (isEmpty(data)) {
			res.send("falseUserName");
		} else {
			var loginJson = JSON.stringify(data);
			var loginStringJSON = JSON.parse(loginJson);
			if (loginStringJSON.password !== password) {
				res.send("falsePassword");
			} else {
				res.send("login");
			}
		}
	});
});

app.post('/forgotPassword', function(req, res) {
	var mailAddr = req.body.mailAddr;
	db.get(mailAddr, function(err, data) {
		if (isEmpty(data)) {
			res.send("falseUserName");
		} else {
			// random password generation
			var randomPassword = getRandomPassword();

			// sending random password to mail here

			// updating random password in db
			db.insert({
				_id : mailAddr,
				password : randomPassword
			// all other fields too
			}, function(err, data) {
				console.log(err);
				res.send("<h1>feedback submission done</h1>");
			});
		}
	});
});

app.post('/checkRegistration', function(req, res) {
	db.get(req.body.mailAddr, function(err, data) {
		if (isEmpty(data)) {
			res.send("false");
		} else {
			res.send("true");
		}
	});
});

module.exports = app;

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();
// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
	// print a message when the server starts listening
	console.log("server starting on " + appEnv.url);
});
