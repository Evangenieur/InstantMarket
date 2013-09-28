// Generated by CoffeeScript 1.6.3
/* Fastclick for responsive mobile click*/

var autoLink,
  __slice = [].slice;

window.addEventListener("load", (function() {
  return FastClick.attach(document.body);
}), false);

/* String HTTP Linker*/


autoLink = function() {
  var k, linkAttributes, option, options, pattern, scope, v, _i;
  options = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), scope = arguments[_i++];
  pattern = /(^|\s)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026@#\/%?=~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~_|])/gi;
  if (!(options.length > 0)) {
    return this.replace(pattern, "$1<a href='$2'>$2</a>");
  }
  option = options[0];
  linkAttributes = ((function() {
    var _results;
    _results = [];
    for (k in option) {
      v = option[k];
      if (k !== 'callback') {
        _results.push(" " + k + "='" + v + "'");
      }
    }
    return _results;
  })()).join('');
  return this.replace(pattern, function(match, space, url) {
    var embedlyCall, embedlyKey, link;
    embedlyKey = "ad06c0ad1988423bb73edd6763020a90";
    embedlyCall = "http://api.embed.ly/1/oembed?key=" + embedlyKey + "&url=" + url + "&maxwidth=500";
    $.ajax(embedlyCall).done(function(data) {
      if (data.type === "photo") {
        return scope.message.rich = "<img src='" + data.url + "'/>";
      }
    });
    link = (typeof option.callback === "function" ? option.callback(url) : void 0) || ("<a href='" + url + "'" + linkAttributes + ">" + url + "</a>");
    return "" + space + link;
  });
};

String.prototype.autoLink = autoLink;

/* Angular App*/


angular.module('mymarket', ["google-maps", "LocalStorageModule"]).directive('tabs', function() {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      paneChanged: '&'
    },
    controller: function($scope, $element) {
      var panes;
      panes = $scope.panes = [];
      $scope.select = function(pane) {
        angular.forEach(panes, function(pane) {
          return pane.selected = false;
        });
        pane.selected = true;
        return $scope.paneChanged({
          selectedPane: pane
        });
      };
      return this.addPane = function(pane) {
        if (panes.length === 0) {
          $scope.select(pane);
        }
        return panes.push(pane);
      };
    },
    template: '<div class="tabs">\n  <ul class="tab-bar">\n    <li ng-repeat="pane in panes" class="tab-bar__tab">\n      <a href="" class="tab-bar__link" ng-class="{\'is-active\':pane.selected}" ng-click="select(pane)">{{pane.title}}</a>\n    </li>\n  </ul>\n  <div class="tab-content" ng-transclude></div>\n</div>',
    replace: true
  };
}).directive('pane', function() {
  return {
    require: '^tabs',
    restrict: 'E',
    transclude: true,
    scope: {
      title: '@'
    },
    link: function(scope, element, attrs, tabsCtrl) {
      return tabsCtrl.addPane(scope);
    },
    template: '<div class="tab-pane" ng-class="{\'is-active\': selected}" ng-transclude>\n</div>',
    replace: true
  };
}).directive('onFocus', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      console.log("focus on", element);
      return element.bind('focus', function() {
        return scope.$eval(attrs.onFocus);
      });
    }
  };
}).factory("hashchange", function($rootScope) {
  var last_hash;
  last_hash = window.location.hash;
  return {
    on: function(cb) {
      console.log("on hashchange");
      return setInterval(function() {
        if (last_hash !== window.location.hash) {
          console.log("onHashChange", window.location.hash);
          last_hash = window.location.hash;
          return $rootScope.$apply(function() {
            return typeof cb === "function" ? cb(last_hash) : void 0;
          });
        }
      }, 100);
    }
  };
}).factory("socket", function($rootScope) {
  var socket;
  socket = io.connect();
  console.log("connected?");
  return {
    on: function(event, cb) {
      return socket.on(event, function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return $rootScope.$apply(function() {
          return cb.apply(socket, args);
        });
      });
    },
    emit: function(event, data, ack) {
      if (typeof data === "function") {
        ack = data;
        data = "";
      }
      return socket.emit(event, data, function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return $rootScope.$apply(function() {
          return ack != null ? ack.apply(socket, args) : void 0;
        });
      });
    }
  };
}).filter("matchCurrentChannels", function() {
  return function(orders, current_channels) {
    console.log("Filtering", orders, current_channels, arguments);
    if (current_channels != null ? current_channels.length : void 0) {
      return _(orders).filter(function(msg) {
        return _(msg.hashtags).intersection(current_channels).length;
      });
    } else {
      return orders;
    }
  };
}).factory('sharedDoc', function(socket, $rootScope) {
  var shared;
  shared = {};
  return function(doc_name) {
    var apply_scope, doc, doc_stream, off_cnx, sio_chan, sio_streams;
    doc = new crdt.Doc();
    console.log("new sharedDoc", doc_name, doc.rows);
    apply_scope = function() {
      var id, row, _ref, _results;
      _ref = doc.rows;
      _results = [];
      for (id in _ref) {
        row = _ref[id];
        _results.push(row._json = JSON.stringify(row));
      }
      return _results;
    };
    doc.on("remove", apply_scope);
    doc.on("add", apply_scope);
    doc.on("row_update", apply_scope);
    /* Socket.io Pipe to channel {doc_name}*/

    doc_stream = doc.createStream();
    sio_streams = new SocketIOStreams(socket);
    sio_chan = sio_streams.createStreamOnChannel(doc_name);
    doc_stream.pipe(sio_chan).pipe(doc_stream);
    socket.on("disconnect", off_cnx = function() {
      console.log("disconnected");
      doc_stream.end();
      return doc.removeAllListeners();
    });
    return doc;
  };
}).controller('AppCtrl', function($scope, $filter, $http, socket, hashchange, $timeout, localStorageService, sharedDoc) {
  var add_or_update_channel, colorMarker, extractHashtags, first_connection, update_channel_state, _ref;
  window.scope = $scope;
  first_connection = true;
  $scope.panelAddShow = false;
  $scope.channels = [];
  $scope.current_channels = [];
  $scope.messages = [];
  $scope.message = {
    content: "",
    price: ""
  };
  /*
  i = 1
  setInterval ->
    console.log "Interval ding dong"
    $scope.messages.push 
      id: i
      author: "test"
      content: "test #{i++}" 
      hashtags: []
      poi: null
      post_date: (new Date()).getTime()
    $scope.$digest()
  
  , 1500
  */

  $scope.me = (_ref = JSON.parse(localStorageService.get("me"))) != null ? _ref : {
    username: "",
    avatar: "",
    userAgent: navigator.userAgent
  };
  $scope.$watch("me", function(n, o) {
    var _this = this;
    if (!_(n).isEqual(o)) {
      socket.emit("me", $scope.me, function() {
        return console.log("Sending me", $scope.me);
      });
      return localStorageService.add("me", JSON.stringify($scope.me));
    }
  }, true);
  $scope.$watch("channels", function(n, o) {
    return console.log("channels, n", n, "o", o);
  }, true);
  $scope.poiShow = false;
  $scope.isMapVisible = function(change_state) {
    if (!$scope._isMapVisible && change_state) {
      $scope.refreshMarkers();
    }
    return $scope._isMapVisible = change_state != null ? change_state : $scope._isMapVisible;
  };
  $scope.isMapVisible(false);
  /* Media queries*/

  $timeout(function() {
    return $scope.$apply(function() {
      var mq;
      mq = window.matchMedia("(min-width: 1000px)");
      if (mq.matches) {
        console.log("MQ Wide Matching");
        return $scope.isMapVisible(true);
      }
    });
  }, 1000);
  colorMarker = function(chan) {
    var pos;
    console.log("colorMarker", $scope.channels);
    pos = _($scope.channels).map(function(channel) {
      return channel.name;
    }).indexOf(chan);
    if (pos !== -1) {
      return Math.round((19 / $scope.channels.length) * pos + 1);
    } else {
      return 20;
    }
  };
  $scope.paneChanged = function(selectedPane) {
    if (selectedPane.title === "Maps") {
      return $scope.isMapVisible(true);
    } else {
      return $scope.isMapVisible(false);
    }
  };
  $scope.order = {
    set: function(prop, value) {
      return this[prop] = value;
    },
    type: "Service",
    direction: "Sell"
  };
  $scope.poiResults = [];
  $scope.poiMessage = {
    name: "",
    coord: []
  };
  $scope.refreshMarkers = function() {
    $scope.markers = [];
    return _($filter('matchCurrentChannels')($scope.orders, $scope.current_channels)).each(function(order) {
      if (order.poi) {
        return $scope.markers.push({
          latitude: order.poi.coord[0],
          longitude: order.poi.coord[1],
          infoWindow: order.poi.name,
          icon: "/img/pins/pin-" + (colorMarker(order.hashtags[0])) + ".png"
        });
      }
    });
  };
  $scope.typeahead = function(search) {
    if (search.length > 2) {
      return $http({
        url: "/_suggest_poi",
        method: "GET",
        params: {
          ll: $scope.center.latitude + ',' + $scope.center.longitude,
          search: search
        }
      }).success(function(data) {
        return $scope.poiResults = data.response.venues;
      });
    }
  };
  $scope.addPoi = function(name, lat, lng) {
    console.log("addPoi", lat, lng);
    $scope.poiMessage.name = name;
    $scope.poiMessage.coord = [lat, lng];
    $("#local_search").val("");
    return $scope.togglePoiShow();
  };
  $scope.togglePoiShow = function() {
    $scope.poiShow = !$scope.poiShow;
    if ($scope.poiShow) {
      return $("#local_search").focus();
    }
  };
  $scope.toggleChannel = function(channel, event) {
    var chan, removed;
    console.log("toggleChannel", chan = $scope.Hashtags.get(channel));
    console.log("chan for " + channel, chan, chan.get != null, chan.set != null);
    chan.set("joined", !chan.get("joined"));
    removed = false;
    $scope.current_channels = _($scope.current_channels).reject(function(chan) {
      return chan === channel && (removed = true);
    });
    if (!removed) {
      $scope.current_channels.push(channel);
    }
    if ($scope.isMapVisible()) {
      $scope.refreshMarkers();
    }
    console.log("toggleChannel", arguments, event);
    return event.preventDefault();
  };
  $scope.toggleAddOrder = function() {
    console.log($scope.panelAddShow);
    $scope.panelAddShow = !$scope.panelAddShow;
    return console.log($scope.panelAddShow);
  };
  $scope.inputFocus = function() {
    return $scope.$apply(function() {
      return $scope.message.content = _($scope.current_channels).map(function(chan) {
        return "#" + chan;
      }).join(" ") + " ";
    });
  };
  extractHashtags = function(text) {
    return _(text.match(/#([\w-_]+)/g)).map(function(ht) {
      return ht.slice(1);
    });
  };
  $scope.sendMessage = function() {
    var doc, id;
    console.log("Sending.Message", $scope.message.content);
    if (!$scope.message.content) {
      return;
    }
    if (!$scope.me.username) {
      setTimeout(function() {
        return $("#pseudoprompt").focus();
      });
      return $scope.usernamePrompt = true;
    }
    $scope.usernamePrompt = false;
    id = Math.round(Math.random() * 100000000).toString();
    doc = $scope.MarketOrders.add({
      id: id,
      author: {
        username: $scope.me.username
      },
      type: $scope.order.type,
      direction: $scope.order.direction,
      content: $scope.message.content,
      hashtags: extractHashtags($scope.message.content).concat([$scope.order.direction, $scope.order.type]),
      poi: $scope.poiMessage.name ? $scope.poiMessage : null,
      post_date: (new Date()).toString()
    });
    $scope.message.content = "";
    return $scope.poiMessage = {
      name: "",
      coord: []
    };
  };
  add_or_update_channel = function(room) {
    if (!update_channel_state(room.name, room)) {
      return $scope.channels.push(room);
    }
  };
  update_channel_state = function(name, state) {
    var chan, k, v, _results;
    if (chan = _($scope.channels).find(function(chan) {
      return chan.name === name;
    })) {
      console.log("Found channel " + name);
      _results = [];
      for (k in state) {
        v = state[k];
        console.log("Updating channel " + name + "." + k + " = " + v);
        _results.push(chan[k] = v);
      }
      return _results;
    } else {
      return console.log("Not found channel " + name);
    }
  };
  socket.on("connect", function() {
    var current_channel;
    sharedDocs.forEach(function(doc_name) {
      $scope[doc_name] = sharedDoc(doc_name);
      switch (doc_name) {
        case "Hashtags":
          $scope[doc_name].on("add", function() {
            var id, row;
            return $scope.channels = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                _results.push(row.state);
              }
              return _results;
            })();
          });
          return $scope[doc_name].on("remove", function() {
            var id, row;
            return $scope.channels = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                _results.push(row.state);
              }
              return _results;
            })();
          });
        case "MarketOrders":
          $scope[doc_name].on("add", function() {
            var id, row;
            return $scope.orders = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                _results.push(row.state);
              }
              return _results;
            })();
          });
          return $scope[doc_name].on("remove", function() {
            var id, row;
            return $scope.orders = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                _results.push(row.state);
              }
              return _results;
            })();
          });
      }
    });
    hashchange.on(current_channel = function(hash) {
      var cur_hash_chans;
      cur_hash_chans = (hash != null ? hash : window.location.hash).split(/\#/).slice(1);
      if (!_($scope.current_channels).isEqual(cur_hash_chans)) {
        return $scope.current_channels = (hash != null ? hash : window.location.hash).split(/\#/).slice(1);
      }
    });
    current_channel();
    if (!first_connection) {
      window.location.reload();
    }
    first_connection = false;
    return socket.emit("list_rooms", function(rooms) {
      var room, _i, _len, _results;
      console.log("list_rooms", rooms);
      _results = [];
      for (_i = 0, _len = rooms.length; _i < _len; _i++) {
        room = rooms[_i];
        if (room.name) {
          _results.push(add_or_update_channel(room));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    });
  });
  socket.on("total_connected", function(total_connected) {
    $scope.total_connected = total_connected;
    return console.log("TOTAL CONNECTED", $scope.total_connected = total_connected);
  });
  socket.on("room_update", function(room) {
    console.log("room_update", room);
    return add_or_update_channel(room);
  });
  $scope.zoom = 13;
  $scope.center = {
    latitude: mymarket.geo.location.latitude,
    longitude: mymarket.geo.location.longitude
  };
  $scope.selected = _($scope.center).clone();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      return $scope.$apply(function() {
        console.log(position);
        return $scope.me.location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        /*
          $scope.center = {
            latitude: position.coords.latitude
            longitude: position.coords.longitude
          }
        */

      });
    });
  }
  $scope.markers = [];
  return socket.on("post", function(post) {
    console.log("post", post);
    if ((_(post.hashtags).intersection($scope.current_channels).length > 0) || ($scope.current_channels.length === 0)) {
      return add_or_not_message(post);
    }
  });
}).directive('enterSubmit', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var submit;
      submit = false;
      return $(element).on({
        keydown: function(e) {
          submit = false;
          if (e.which === 13 && !e.shiftKey) {
            submit = true;
            return e.preventDefault();
          }
        },
        keyup: function() {
          if (submit) {
            scope.$eval(attrs.enterSubmit);
            return scope.$digest();
          }
        }
      });
    }
  };
}).directive('timeago', function($timeout) {
  return {
    restrict: 'A',
    link: function(scope, elem, attrs) {
      var updateTime;
      updateTime = function() {
        var time;
        console.log("updateTime", attrs, attrs.timeago);
        if (attrs.timeago) {
          time = scope.$eval(attrs.timeago);
          elem.text(jQuery.timeago(time));
          return $timeout(updateTime, 15000);
        }
      };
      return scope.$watch(attrs.timeago, updateTime);
    }
  };
});
