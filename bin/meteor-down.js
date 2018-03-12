#!/usr/bin/env node

// set a high number for the maxSockets
// we don't need pooling here
require('http').globalAgent.maxSockets = 999999;

var vm = require('vm');
var _ = require('underscore');
var fs = require('fs');
var util = require('util');
var MeteorDown = require('../');
var coffee = require( "coffee-script" )

var filePath = process.argv[2];
if(!filePath) {
  showHelp();
  process.exit(1);
}

var meteorDown = new MeteorDown();

// run the script
var content = fs.readFileSync(filePath).toString();

if( filePath.substr(-6) == 'coffee' ) content = coffee.compile( content );

var context = {
  require: require,
  meteorDown: meteorDown
};

// important: getOwnPropertyNames can get both enumerables and non-enumerables
Object.getOwnPropertyNames(global).forEach(function (key) {
  context[key] = global[key];
});

vm.runInNewContext(content, context);

/* ------------------------------------------------------------------------- */

setInterval(function () {
  printStats(meteorDown.stats.get());
  meteorDown.stats.reset();
}, 1000*5);

/* ------------------------------------------------------------------------- */

function showHelp () {
  // TODO improve help and CLI interface
  console.log(
    'USAGE:\n'+
    '  meteor-down <path-to-script>\n'
  );
}

function printStats (stats) {
  var duration = stats.end - stats.start;
  console.log('\n--------------------------------------------------')
  console.log('Time   : %s', stats.end.toLocaleString());
  if(stats.data['method-response-time']) {
    var methodSummary = stats.data['method-response-time'].summary;
    var methodBreakdown = stats.data['method-response-time'].breakdown;
    console.log('\nMethod, requests per minute, ms');
    methodBreakdown.forEach(function (item) {
      console.log('%s, %d, %dms', 
        item.name,
        parseInt(item.count * 60000 / duration),
        parseInt(item.total / item.count));
    });
  }

  if(stats.data['pubsub-response-time']) {
    var pubsubSummary = stats.data['pubsub-response-time'].summary;
    var pubsubBreakdown = stats.data['pubsub-response-time'].breakdown;
    console.log('\nPubSub, requests per minute, ms');
    pubsubBreakdown.forEach(function (item) {
      console.log('%s, %d, %dms', item.name,
        parseInt( item.count * 60000 / duration),
        parseInt(item.total / item.count));
    });
  }

  if(stats.data['error']) {
    var errorSummary = stats.data['error'].summary;
    var errorBreakdown = stats.data['error'].breakdown;
    console.log('\nErrors, requests per minute, err');
    errorBreakdown.forEach(function (item) {
      console.log('%s, %d, %s', 
        item.name,
        parseInt(item.count * 60000 / duration),
        item.err
      );
    });
  }

  if(stats.data['socket-error']) {
    var socketerror = stats.data['socket-error'].summary;
    console.log('Socket-error: %d',
      parseInt(socketerror.count));
  }
}
