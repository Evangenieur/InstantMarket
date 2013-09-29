// Generated by CoffeeScript 1.6.3
var autoLink, cuid,
  __slice = [].slice;

cuid = require("cuid");

/* Fastclick for responsive mobile click*/


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
        console.log("select pane", pane.title, pane);
        angular.forEach(panes, function(pane) {
          return pane.selected = false;
        });
        pane.selected = true;
        return $scope.paneChanged({
          selectedPane: pane
        });
      };
      this.addPane = function(pane) {
        if (panes.length === 0) {
          $scope.select(pane);
        }
        if (!_(panes).find(function(p) {
          return p.title === pane.title;
        })) {
          return panes.push(pane);
        }
      };
      return this.selectPane = function(pane) {
        return $scope.select(pane);
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
      title: '@',
      display: '='
    },
    link: function(scope, element, attrs, tabsCtrl) {
      tabsCtrl.addPane(scope);
      return scope.$watch('display', function() {
        console.log("ACTIVE CHANGED", arguments, scope.display);
        if (scope.display) {
          console.log("Selecting Pane");
          return tabsCtrl.selectPane(scope);
        }
      });
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
}).directive('photoInput', function($parse) {
  console.log("in photoinput");
  return {
    restrict: 'EA',
    template: "<input type='file' accept='image/*' capture='camera' />",
    replace: true,
    link: function($scope, element, attrs) {
      var modelGet, modelSet, onChange, updateModel;
      console.log("link in photoinput");
      modelGet = $parse(attrs.fileInput);
      modelSet = modelGet.assign;
      onChange = $parse(attrs.onChange);
      updateModel = function() {
        return scope.$apply(function() {
          modelSet(scope, element[0].files[0]);
          return onChange(scope);
        });
      };
      return element.bind('change', updateModel);
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
}).factory('fileReader', function($q, $log) {
  var getReader, onError, onLoad, onProgress, readAsDataURL;
  onLoad = function(reader, deferred, scope) {
    return function() {
      return scope.$apply(function() {
        return deferred.resolve(reader.result);
      });
    };
  };
  onError = function(reader, deferred, scope) {
    return function() {
      return scope.$apply(function() {
        return deferred.reject(reader.result);
      });
    };
  };
  onProgress = function(reader, scope) {
    return function(event) {
      return scope.$broadcast("fileProgress", {
        total: event.total,
        loaded: event.loaded
      });
    };
  };
  getReader = function(deferred, scope) {
    var reader;
    reader = new FileReader();
    reader.onload = onLoad(reader, deferred, scope);
    reader.onerror = onError(reader, deferred, scope);
    reader.onprogress = onProgress(reader, scope);
    return reader;
  };
  readAsDataURL = function(file, scope) {
    var deferred, reader;
    deferred = $q.defer();
    reader = getReader(deferred, scope);
    reader.readAsDataURL(file);
    return deferred.promise;
  };
  return {
    readAsDataUrl: readAsDataURL
  };
}).controller('AppCtrl', function($scope, $filter, $http, socket, hashchange, $timeout, localStorageService, sharedDoc, fileReader) {
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
  $scope.notifs = [];
  $scope.clickBuy = function() {
    console.log("clickBuy", $scope.panelAddShow);
    if ($scope.panelAddShow) {
      $scope.order.direction = "buy";
      return $scope.sendMessage();
    } else {
      return $scope.toggleChannel("buy");
    }
  };
  $scope.clickSell = function() {
    if ($scope.panelAddShow) {
      $scope.order.direction = "sell";
      return $scope.sendMessage();
    } else {
      return $scope.toggleChannel("sell");
    }
  };
  $scope.me = (_ref = JSON.parse(localStorageService.get("me"))) != null ? _ref : {
    id: cuid(),
    username: "",
    avatar: "",
    userAgent: navigator.userAgent,
    stream: null,
    cam_enabled: null,
    audio: null,
    order: {
      place_name: "",
      position_type: "mine",
      coord: [],
      mine: []
    }
  };
  $scope.my_orders = null;
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

  /*
  $timeout ->
    $scope.$apply ->
      mq = window.matchMedia("(min-width: 1000px)")
      console.log "mq", mq
      if (mq.matches)
        console.log "MQ Wide Matching"
        $scope.isMapVisible true
  , 1000
  */

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
    if (selectedPane.title === "Map") {
      $scope.isMapVisible(true);
    } else {
      $scope.isMapVisible(false);
    }
    if (selectedPane.title !== "Chat" && $scope.chat.show === true) {
      return $scope.unset_chat();
    }
  };
  $scope.order = {
    set: function(prop, value) {
      return this[prop] = value;
    },
    type: "product",
    direction: "sell"
  };
  $scope.poiResults = [];
  $scope.poiMessage = {
    name: "",
    coord: []
  };
  $scope.chat = {
    show: false,
    order: null
  };
  $scope.set_chat = function(order) {
    var doc, metadata;
    console.log("chat order", order);
    console.log("pre notifs", $scope.notifs.length);
    console.log("post notifs", $scope.notifs.length);
    $scope.chat.show = true;
    $scope.chat.order = order;
    if (order.author.id === $scope.me.id) {
      doc = $scope.MarketOrders.get(order.id);
      doc.set("online", true);
      metadata = _($scope.me.order.mine).find(function(o) {
        return o.id === order.id;
      });
      console.log("metadata", metadata);
      metadata.update_date = order.update_date;
      return $scope.notifs = _($scope.notifs).reject(function(n) {
        console.log("notif", n, "order", order, n.id === order.id);
        return n.id === order.id;
      });
    }
  };
  $scope.unset_chat = function() {
    console.log("unChat", $scope.my_orders);
    $scope.my_orders.each(function(order) {
      if (typeof order.set === "function") {
        order.set("online", false);
      }
      return console.log("order, offline", order);
    });
    $scope.chat.show = false;
    return $scope.chat.order = null;
  };
  $scope.refreshMarkers = function() {
    $scope.markers = [];
    return _($filter('matchCurrentChannels')($scope.orders, $scope.current_channels)).each(function(order) {
      var _ref1;
      if (order.poi && ((_ref1 = order.poi.coord) != null ? _ref1.length : void 0)) {
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
    $scope.me.order.place_name = name;
    $scope.me.order.coord = [lat, lng];
    $("#local_search").val("");
    $scope.me.order.position_type = "company";
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
    console.log("toggleChannel", chan = _($scope.channels).find(function(chan) {
      return chan.name === channel;
    }));
    chan.joined = !chan.joined;
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
  $scope.readFile = function() {
    console.log("fileReader", $scope, this);
    return fileReader.readAsDataUrl($scope.file, $scope).then(function(result) {
      return $scope.message.photo = result;
    });
  };
  $scope.completeTransaction = function(order) {
    var doc;
    doc = $scope.MarketOrders.get(order.id);
    doc.set("completed", $scope.me.id);
    return doc.set("update_date", (new Date()).toISOString());
  };
  $scope.sendMessage = function() {
    var doc, hashtag, hashtags, now, stats, _i, _len;
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
    hashtags = extractHashtags($scope.message.content).concat([$scope.order.direction, $scope.order.type]);
    for (_i = 0, _len = hashtags.length; _i < _len; _i++) {
      hashtag = hashtags[_i];
      console.log("hashtag", hashtag);
      doc = $scope.Hashtags.get(hashtag);
      console.log("doc", doc);
      if (!doc.get("name")) {
        doc.set("name", hashtag);
      }
      if (!(stats = doc.get("stats"))) {
        stats = {
          users: 0,
          pois: 0
        };
      }
      stats.users++;
      console.log("setting stats for " + hashtag, stats);
      doc.set("stats", stats);
    }
    doc = $scope.MarketOrders.add({
      id: cuid(),
      author: {
        id: $scope.me.id,
        username: $scope.me.username
      },
      type: $scope.order.type,
      direction: $scope.order.direction,
      content: $scope.message.content,
      photo: $scope.message.photo,
      price: $scope.message.price,
      hashtags: hashtags,
      poi: {
        name: $scope.me.order.place_name || $scope.me.username + "'s place",
        coord: $scope.me.order.position_type === "mine" ? $scope.me.coord : $scope.me.order.coord
      },
      post_date: now = (new Date()).toISOString(),
      update_date: now,
      chats: [],
      online: false
    });
    $scope.message.content = "";
    $scope.poiMessage = {
      name: "",
      coord: [],
      photo: null
    };
    $scope.panelAddShow = false;
    return $scope.chatShow = false;
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
    socket.emit("identity", {
      id: $scope.me.id
    });
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
          $scope[doc_name].on("remove", function() {
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
          return $scope[doc_name].on("row_update", function() {
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
            $scope.orders = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                if (!row.state.completed) {
                  _results.push(row.state);
                }
              }
              return _results;
            })();
            return $scope.transactions = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                if (row.state.completed === $scope.me.id) {
                  _results.push(row.state);
                }
              }
              return _results;
            })();
          });
          $scope[doc_name].on("remove", function() {
            var id, row;
            $scope.orders = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                if (!row.state.completed) {
                  _results.push(row.state);
                }
              }
              return _results;
            })();
            return $scope.transactions = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                if (row.state.completed === $scope.me.id) {
                  _results.push(row.state);
                }
              }
              return _results;
            })();
          });
          return $scope[doc_name].on("row_update", function() {
            var id, row;
            $scope.orders = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                if (!row.state.completed) {
                  _results.push(row.state);
                }
              }
              return _results;
            })();
            return $scope.transactions = (function() {
              var _ref1, _results;
              _ref1 = $scope[doc_name].rows;
              _results = [];
              for (id in _ref1) {
                row = _ref1[id];
                if (row.state.completed === $scope.me.id) {
                  _results.push(row.state);
                }
              }
              return _results;
            })();
          });
      }
    });
    $scope.my_orders = $scope.MarketOrders.createSet(function(state) {
      var _ref1;
      return (state != null ? (_ref1 = state.author) != null ? _ref1.id : void 0 : void 0) === $scope.me.id;
    });
    /*
    $scope.my_orders.on "add", (order) ->
      known_order_changes order
      
    $scope.my_orders.on "remove", (order) ->
    */

    $scope.my_orders.on("changes", function(order) {
      var metadata, _base, _ref1, _ref2;
      console.log("my set order change", arguments);
      (_base = $scope.me.order).mine || (_base.mine = []);
      if (!(metadata = _($scope.me.order.mine).find(function(o) {
        return o.id === order.id;
      }))) {
        console.log("no metadata");
        $scope.me.order.mine.push(metadata = {
          id: order.id,
          update_date: order.state.update_date
        });
      }
      console.log("metadata", metadata, order.state.update_date, metadata.update_date, (new Date(order.state.update_date)).getTime(), (new Date(metadata.update_date)).getTime(), (new Date(order.state.update_date)).getTime() > (new Date(metadata.update_date)).getTime(), !$scope.chat.show || ((_ref1 = $scope.chat.order) != null ? _ref1.id : void 0) !== order.id);
      if (((new Date(order.state.update_date)).getTime() > (new Date(metadata.update_date)).getTime()) && (!$scope.chat.show || ((_ref2 = $scope.chat.order) != null ? _ref2.id : void 0) !== order.id)) {
        if (!_($scope.notifs).find(function(o) {
          return o.id === order.id;
        })) {
          return $scope.notifs.push(order.state);
        }
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
  $scope.zoom = 12;
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
            console.log(attrs.enterSubmit, scope);
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
        if (attrs.timeago) {
          time = scope.$eval(attrs.timeago);
          return elem.text(jQuery.timeago(time));
        }
      };
      return scope.$watch(attrs.timeago, updateTime);
    }
  };
}).controller('ChatCtrl', function($scope, $filter, socket, webrtc) {
  var order, order_id;
  console.log("ChatCtrl", window.scope2 = $scope);
  $scope.text = "";
  order_id = $scope.chat.order.id;
  order = $scope.MarketOrders.get(order_id);
  console.log("chat order", order);
  order.on("change", function(order) {
    return console.log("change on order ", order);
  });
  $scope.sendTxt = function() {
    var chats, doc, now;
    if ($scope.text === "") {
      return;
    }
    doc = $scope.MarketOrders.get($scope.chat.order.id);
    console.log("sendTxt", doc);
    chats = doc.get("chats");
    console.log("chats", chats);
    chats.push({
      author: {
        username: $scope.me.username,
        id: $scope.me.id
      },
      text: $scope.text,
      post_date: now = (new Date()).toISOString()
    });
    doc.set("chats", JSON.parse(angular.toJson(chats)));
    doc.set("update_date", now);
    return $scope.text = "";
  };
  $scope.visio_call = function() {
    var doc;
    console.log("visio_call");
    doc = $scope.MarketOrders.get($scope.chat.order.id);
    doc.set("update_date", (new Date()).toISOString());
    $scope.users.push($scope.chat.order.author);
    webrtc.users_to_call.push($scope.chat.order.author.id);
    return $scope.toggleCam();
  };
  $scope.users = [$scope.me];
  /* WEBRTC*/

  $scope.cam = {
    available: false,
    activated: false,
    enabled: false
  };
  $scope.mic = {
    enabled: false,
    activated: false
  };
  if (!webrtc.not_supported) {
    $scope.cam.available = true;
    $scope.$watch("users", function(neww, old, scope) {
      var diff_ids, new_ids, old_ids;
      new_ids = _(neww).pluck("id");
      old_ids = _(old).pluck("id");
      diff_ids = _(new_ids).difference(old_ids);
      console.log("users changed", diff_ids);
      return _(diff_ids).each(function(user_id) {
        if (user_id !== $scope.me.id) {
          if (new_ids.indexOf(user_id) !== -1) {
            console.log("new peer", user_id);
            return webrtc.join(user_id);
          } else if (old_ids.indexOf(user_id) !== -1) {
            console.log("old peer", user_id);
            return webrtc.removePeers(user_id);
          } else {
            return console.log("WTF", user_id);
          }
        }
      });
    }, true);
    webrtc.on_my_camera = function(my_video) {
      var me_in_list;
      console.log("ON_MY_CAM o/");
      me_in_list = _($scope.users).find(function(user) {
        return user.id === $scope.me.id;
      });
      me_in_list.stream = my_video;
      me_in_list.audio = false;
      $scope.cam.activated = true;
      $scope.cam.enabled = true;
      $scope.mic.activated = true;
      return $scope.mic.enabled = true;
    };
    webrtc.on_remote_camera = function(peer) {
      var remote_in_list;
      console.log("\\o/ REMOTE CAM", arguments);
      remote_in_list = _($scope.users).find(function(user) {
        return user.id === peer.id;
      });
      remote_in_list.stream = peer.stream;
      return $timeout(function() {
        return remote_in_list.audio = true;
      }, 1000);
    };
    webrtc.out_message = function(msg) {
      return socket.emit("message", msg);
    };
    socket.on("message", function(msg) {
      if (!_($scope.users).find(function(user) {
        return msg.from === user.id;
      })) {
        $scope.users.push({
          id: msg.from
        });
      }
      return webrtc.in_message(msg);
    });
    $scope.toggleCam = function() {
      var me_in_list;
      if (webrtc.started) {
        $scope.cam.enabled = webrtc.toggleCam();
        me_in_list = _($scope.users).find(function(user) {
          return user.id === $scope.me.id;
        });
        if ($scope.cam.enabled) {
          return me_in_list.cam_enabled = true;
        } else {
          return me_in_list.cam_enabled = false;
        }
      } else {
        return webrtc.init("small");
      }
    };
    $scope.toggleMic = function() {
      console.log("toggleMic");
      if ($scope.mic.enabled = webrtc.toggleMic()) {
        $scope.previous_volume = player.getVolume();
        console.log("getting previous_volume", $scope.previous_volume);
        return player.setVolume(low_volume);
      } else {
        console.log("setting previous_volume", $scope.previous_volume);
        return player.setVolume($scope.previous_volume);
      }
    };
    if ($scope.chat.order.author.id === $scope.me.id) {
      return $scope.toggleCam();
    }
  }
  /* /WEBRTC*/

}).directive('camera', function() {
  return {
    restrict: "E",
    replace: true,
    template: "<video></video>",
    transclude: true,
    scope: {
      stream: "=",
      audio: "=",
      show: "="
    },
    link: function(scope, element, attrs) {
      scope.$watch("show", function(neww, old, scope) {
        var video;
        video = element[0];
        console.log("on show change", neww, old);
        return video.style.display = neww ? "" : "none";
      });
      scope.$watch("audio", function(neww, old, scope) {
        var video;
        video = element[0];
        return video.muted = !neww;
      });
      return scope.$watch("stream", function(neww, old, scope) {
        var e, video;
        video = element[0];
        console.log("watch stream", arguments);
        if (!neww) {
          $(video).css("display", "none");
          return;
        }
        $(video).css("display", "");
        try {
          if (URL && URL.createObjectURL) {
            video.src = URL.createObjectURL(neww);
          } else if (element.srcObject) {
            video.srcObject = neww;
          } else if (element.mozSrcObject) {
            video.mozSrcObject = neww;
          }
        } catch (_error) {
          e = _error;
          console.log("Error", e);
        }
        return video.muted = true;
      });
    }
  };
}).factory('webrtc', function($rootScope) {
  var e, events, parser, peerConnectionConfig, ua;
  peerConnectionConfig = {
    iceServers: [
      {
        url: "stun:stun.l.google.com:19302"
      }
    ]
  };
  parser = new UAParser();
  ua = parser.getResult();
  if (ua.browser.name.match(/Chrom(e|ium)/)) {
    peerConnectionConfig.iceServers.push({
      url: "turn:test@watsh.tv:3478",
      credential: "test"
    });
  } else if (ua.browser.name.match(/Firefox/)) {
    if (parseFloat(ua.browser.version) >= 24.00) {
      peerConnectionConfig.iceServers.push({
        url: "turn:watsh.tv:3478",
        credential: "test",
        username: "test"
      });
    } else {
      return {
        not_supported: true
      };
    }
  }
  try {
    window.webrtc = new WebRTC({
      peerConnectionConfig: peerConnectionConfig,
      url: window.location.host,
      debug: true
    });
  } catch (_error) {
    e = _error;
    return {
      not_supported: true
    };
  }
  webrtc.on("message", function(msg) {
    return typeof events.out_message === "function" ? events.out_message(msg) : void 0;
  });
  webrtc.on("peerStreamAdded", function(peer) {
    peer.stream.onended = function() {
      return console.log("Stream ended");
    };
    peer.stream.onremovetrack = function() {
      return console.log("Track ended");
    };
    return $rootScope.$apply(function() {
      return typeof events.on_remote_camera === "function" ? events.on_remote_camera(peer) : void 0;
    });
  });
  webrtc.on("peerStreamRemoved", function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return console.log("peerStreamRemoved", arguments);
  });
  return window.webrtc_a = events = {
    started: false,
    users: [],
    waiting_msgs: [],
    users_to_call: [],
    on_my_camera: null,
    on_remote_camera: null,
    out_message: null,
    init: function(cam_resolution) {
      if (cam_resolution == null) {
        cam_resolution = "small";
      }
      return webrtc.startLocalMedia({
        video: {
          mandatory: (function() {
            switch (cam_resolution) {
              case "small":
                return {
                  maxWidth: 320,
                  maxHeight: 240
                };
              case "medium":
                return {
                  maxWidth: 640,
                  maxHeight: 480
                };
            }
          })()
        },
        audio: true
      }, function(err, stream) {
        console.log("CAM INIT");
        if (err) {
          console.log(err);
          return;
        }
        return $rootScope.$apply(function() {
          var _ref;
          if ((_ref = events.on_my_camera) != null) {
            _ref.call(events, stream);
          }
          return events.ready();
        });
      });
    },
    in_message: function(msg) {
      var peers;
      if (!this.started) {
        this.waiting_msgs.push(msg);
        return;
      }
      peers = webrtc.getPeers(msg.from);
      if (!peers.length) {
        this.add_peer(msg.from);
        peers = webrtc.getPeers(msg.from);
      }
      /*
      if msg.type is "offer"
        peer = webrtc.createPeer 
          id: msg.from
        peer.handleMessage msg
      else
      */

      return _(peers).each(function(peer) {
        return peer.handleMessage(msg);
      });
    },
    on: function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return webrtc.on.apply(webrtc, args);
    },
    join: function(user_id) {
      if (webrtc.localStream) {
        return this.add_peer(user_id);
      } else {
        return this.users.push(user_id);
      }
    },
    ready: function() {
      var msg, user_id, _results;
      console.log("READY", "waiting msgs", this.waiting_msgs.length);
      this.started = true;
      while (user_id = this.users.pop()) {
        this.add_peer(user_id);
      }
      while (user_id = this.users_to_call.pop()) {
        console.log("Calling", user_id);
        this.call_peer(user_id);
      }
      _results = [];
      while (msg = this.waiting_msgs.shift()) {
        _results.push(this.in_message(msg));
      }
      return _results;
    },
    add_peer: function(user_id) {
      var _ref;
      if (!((_ref = webrtc.getPeers(user_id)) != null ? _ref.length : void 0)) {
        return webrtc.createPeer({
          id: user_id
        });
      }
    },
    call_peer: function(user_id) {
      var peers;
      console.log("Calling " + user_id);
      peers = webrtc.getPeers(user_id);
      console.log("peers", peers);
      return _(peers).each(function(peer) {
        console.log(">Calling " + user_id);
        return peer.start();
      });
    },
    stop: function() {
      var peers;
      this.started = false;
      peers = webrtc.getPeers();
      return _(peers).each(function(peer) {
        return peer.end();
      });
    },
    toggleCam: function() {
      var video;
      video = webrtc.localStream.getVideoTracks()[0];
      return video.enabled = !video.enabled;
    },
    toggleMic: function() {
      var audio;
      audio = webrtc.localStream.getAudioTracks()[0];
      return audio.enabled = !audio.enabled;
    },
    start: function(users) {
      if (webrtc.localStream) {
        if (typeof this.on_my_camera === "function") {
          this.on_my_camera(webrtc.localStream);
        }
        this.users = this.users.concat(users);
        this.users_to_call = this.users_to_call.concat(users);
        return this.ready();
      } else {
        return this.start_cam();
      }
    }
  };
});
