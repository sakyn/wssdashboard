let express = require('express');
let app = express();
let https = require('https');
let fs = require('fs');


let sio = require('socket.io');
let _ = require('lodash');


let server, pk, crt, ca;
let instances = [];

pk = fs.readFileSync('./certs/private.key').toString();
crt = fs.readFileSync('./certs/ct.crt').toString();
ca = fs.readFileSync('./certs/ca.crt').toString();


server = https.createServer({key:pk, cert:crt, ca:ca }, app);
server.listen(9003, '0.0.0.0');

app.use(express.static('public'));

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	next();
});


let io = sio.listen(server, {key: pk, cert: crt, ca: ca});
let props = { numSockets: '1', dataFrequency: 1000 };


/**
 * Errors XHR fallback
 */
app.post('/', function (req, res) {
	errors.unshift(req.body);
	console.log(req.body, "ERROR");
	res.send("ok");
});


/**
 * Backend
 */
app.get('/dashboard',function(req,res){
	res.sendFile(__dirname + '/index.html');
});


let frontend = io.of("backend");

let totalClients = 0;
let stats = [0];

/**
 * Snip number of clients
 */
setInterval(function(){
	stats.push(totalClients);
	stats.splice(10);
}, 6000);


/**
 * Update dashboard
 * {
		instanceId: instanceId,
		totalClients: io.engine.clientsCount,
		wsClients: _.filter(io.sockets.connected, function(socket){ return socket.conn.transport.name === "websocket"; }).length,
		errors: errors,
		eventsCount: eventCount
	}
 */

let update = function () {

	totalClients = 0;
	let errors = [];
	let wsClients = 0;
	let eventsCount = 0;

	_.map(instances, function(i){
		totalClients += i.totalClients;
		wsClients += i.wsClients;
		eventsCount += i.eventsCount;
		errors = _.merge(errors, i["errors"]);
	});

	let r = {
		totalClients: totalClients,
		wsClients: wsClients,
		eventsCount: eventsCount,
		errors: errors,
		instances: instances,
		stats: stats
	};

	io.emit("update", r)
};


setInterval(function(){
	update();
}, 1000);

/**
 * FRONTEND
 */
frontend.on('connection', function (socket) {

	socket.on('update', function(evt){

		let i = _.findIndex(instances, function(i) { return i.instanceId == evt.instanceId; });

		if (i > -1){
			instances[i] = evt;
		} else{
			instances.push(evt);
		}

		//update();
	});

	socket.emit("command:changeProps", props);

});




//Dashboard connection, send stats
io.on('connection', function (socket) {

	socket.emit("props", props);

	socket.on('command:changeProps', function (d) {
		props = d;
		frontend.emit("command:changeProps", d)
		console.log(d)
	});

	socket.on('command:killKenny', function () {
		console.log("command:killKenny");
		props = { numSockets: '1', dataFrequency: 1000 };
		frontend.emit("command:killKenny");
	});

});


console.log("Starting secure WSS server, listening on port 9444");
