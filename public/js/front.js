socket = io("http://127.0.0.1:9808");

socket.on("connect", function () {
	console.log(socket.id, "front connected");

	socket.on('disconnect', function () {
		console.log(socket, "front disconnected");
	});

});


window.onbeforeunload = function(e) {
	socket.disconnect();
};

$(function() {
	$( window ).click(function(e) {
		console.log(e);
		socket.emit("clientEvent", {type: "Click", value: "Souřadnice: X: " + e.pageX + ", Y: " + e.pageY});
	})

	$( window ).scroll(function(e) {
		console.log($(window).scrollTop(), $(window).height(), "scroll")
		socket.emit("clientEvent", {type: "Scroll", value: "Pozice: " + $(window).scrollTop() + "/" + $(window).height()});
	});
});


