var fs = require('fs');
var path = require('path');
var gpx2geojson = require('@mapbox/togeojson').gpx;
var d3 = require('d3');
var coordist = require('coordist');
var DOMParser = require('xmldom').DOMParser;

var GPX_PATH = './gpx/'
var globalDist = 0.0,
	globalHMa = 0.0,
	globalHMd = 0.0,
	globalCount = 0;

function parseGPX(file) {
	var dom = new DOMParser().parseFromString(fs.readFileSync(file, 'utf8'));
	var geojson = gpx2geojson(dom);

	try {
		var props = geojson.features[0].properties,
			coords = geojson.features[0].geometry.coordinates;

		var dist = 0.0,
			hM_a = 0.0,
			hM_d = 0.0,
			last = {lng:coords[0][0], lat:coords[0][1], alt:coords[0][2]};

		props.distance = [0.0];
		props.speed = [0.0];
		for(var i = 1; i < coords.length; i++) {
			var curr = {lng:coords[i][0], lat:coords[i][1], alt:coords[i][2]};
			var hm = curr.alt - last.alt;
			if (hm > 0) {
				hM_a += hm;
			} else {
				hM_d += hm;
			}
			var d = coordist.distance(last, curr, false);
			var dt = new Date(props.coordTimes[i]) - new Date(props.coordTimes[i-1]);
			var tmp_speed = dt != 0 ? 3600 * d / dt : null;
			props.speed[i] = tmp_speed;
			props.distance[i] = d;
			dist += d;
			last = curr;
		}

		globalHMa += hM_a;
		globalHMd += hM_d;
		globalDist += dist;
		globalCount++;
	} catch(ex) {
		console.log('FATAL: ' + file + ' - ' + ex.message);
	}
};

function extension(element) {
	var extName = path.extname(element);
	return extName === '.gpx';
};

fs.readdir(GPX_PATH, function(err, items) {
	if (err) {
		console.log(err.message);
		process.exit(err.errno);
	}
	items.filter(extension).forEach(function(name) {
		parseGPX(GPX_PATH + name);
	});
	console.log('Distance: ' + globalDist.toLocaleString() + 'm');
	console.log('EL gain: ' + globalHMa.toLocaleString() + 'm');
	console.log('EL loss: ' + Math.abs(globalHMd).toLocaleString() + 'm');
	console.log('Tracks: ' + globalCount.toLocaleString());
});
