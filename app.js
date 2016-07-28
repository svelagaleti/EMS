var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport")
var google = require("googleapis");
var routes = require('./routes/index');
var users = require('./routes/users');
var Cloudant = require('cloudant');
var me = 'sreenu';
var password = '34537970';
var cloudant = new Cloudant({
	account : me,
	password : password
});

var smtpTransport = nodemailer.createTransport(smtpTransport({
	host : "smtp.gmail.com",
	secureConnection : false,
	port : 587,
	auth : {
		user : "apple.sandeep.v@gmail.com",
		pass : "sandeep1991"
	}
}));

var app = express();

var db = cloudant.db.use('ems_users');
var dbFb = cloudant.db.use('ems_feedback');
var dbo = cloudant.db.use('ems_orgnisers');
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

function getRandomCode() {
	var str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789";
	var rand;
	var charec = '';
	for (var i = 0; i < 8; i++) {
		rand = Math.floor(Math.random() * str.length);
		charec += str.charAt(rand);
	}
	console.log(charec);
	return charec;
}
// feedback process code how to send the feed back and update the feedback with
// ld feedback for the same user*/
app.post('/submitFeedback', function(req, res) {
	console.log("ASDFASDFASD");
	var fbkrName = req.body.fbkrName;
	var fbkrMail = req.body.fbkrMail;
	var fback = req.body.fback;

	dbFb.get(fbkrMail, function(err, data) {
		console.log(err);
		if (!isEmpty(data)) {
			var feedbackJson = JSON.stringify(data);
			var feedbackStringJSON = JSON.parse(feedbackJson);
			feedbackStringJSON.feedback = fback;
			dbFb.insert({
				_id : fbkrMail,
				_rev : feedbackStringJSON._rev,
				name : fbkrName,
				feedback : fback
			}, function(err, data) {
				console.log(err);
				res.send("<h1>feedback updated successfully</h1>");
			});
		} else {
			dbFb.insert({
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
		res.send("registered");
	});
});

app.post('/login', function(req, res) {
	var mailAddr = req.body.mailAddr;
	var password = req.body.password;
	db.get(mailAddr, function(err, data) {
		var loginJson = JSON.stringify(data);
		var loginStringJSON = JSON.parse(loginJson);
		if (loginStringJSON.password !== password) {
			res.send("falsePassword");
		} else {
			res.send(loginStringJSON.name.split(" ")[0]);
		}
	});
});

app.post('/forgotPassword', function(req, res) {
	var mailAddr = req.body.mailAddr;
	var randomPassword = getRandomCode();
	db.get(mailAddr, function(err, data) {
		var loginJson = JSON.stringify(data);
		var loginStringJSON = JSON.parse(loginJson);

		// sending random password to mail here
		var mailOptions = {
			from : "apple.sandeep.v@gmail.com",
			to : mailAddr,
			subject : "Re: Password Forgotten Request from Evento",
			text : "Your new Password is : " + randomPassword
		};
		console.log(mailOptions);
		smtpTransport.sendMail(mailOptions, function(error, response) {
			if (error) {
				console.log(error);
				res.end("error");
			} else {
				res.end("sent");
			}
		});
		console.log(err);

		db.insert({
			_id : mailAddr,
			_rev : loginStringJSON._rev,
			name : loginStringJSON.name,
			password : randomPassword,
			mobile : loginStringJSON.mobile
		}, function(err, data) {
			console.log(err);
		});

		res.send("<p>New Password has been sent to your mail!</p>");
	});
});

app.post('/changePassword', function(req, res) {
	var mailAddr = req.body.mailAddr;
	var newPassword = req.body.newPassword;
	db.get(mailAddr, function(err, data) {
		var loginJson = JSON.stringify(data);
		var loginStringJSON = JSON.parse(loginJson);

		db.insert({
			_id : mailAddr,
			_rev : loginStringJSON._rev,
			name : loginStringJSON.name,
			password : loginStringJSON.password,
			mobile : loginStringJSON.mobile
		}, function(err, data) {
			console.log(err);
			res.send("true");
		});
	});
});

app.post('/checkRegistration', function(req, res) {
	console.log(req.body.mailAddr);
	db.get(req.body.mailAddr, function(err, data) {
		if (isEmpty(data)) {
			console.log("false");
			res.send("false");
		} else {
			console.log("true");
			res.send("true");
		}
	});
});

module.exports = app;

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();
// start server on the specified port and binding host
var server = app.listen(appEnv.port, '0.0.0.0', function() {
	// print a message when the server starts listening
	console.log("server starting on " + appEnv.url);
});

var OAuth2 = google.auth.OAuth2;

var oauth2Client = new OAuth2(
		"683149608284-7hd5dhf0lelvfvbojqojqkprllruvc37.apps.googleusercontent.com",
		"bG1Bs6kXJOCmE_bLYNyYcxRB", "http://localhost:6001/index.html");

var scopes = [ 'https://www.googleapis.com/auth/gmail.modify' ];

var url = oauth2Client.generateAuthUrl({
	access_type : 'offline',
	scope : scopes
});
app.get("/url", function(req, res) {
	res.send(url);
});

app.get("/tokens", function(req, res) {
	var code = req.query.code;
	console.log(code);
	oauth2Client.getToken(code, function(err, tokens) {
		if (err) {
			console.log(err);
			res.send(err);
			return;
		}
		console.log("allright!!!!");
		console.log(err);
		console.log(tokens);
		oauth2Client.setCredentials(tokens);

		res.send(tokens);

	});
});
