require "colors"
util = require "util"
browserify = require 'browserify-middleware'
global._ = require "underscore"
request = require "request"

argv = require('optimist').argv
PORT = argv.port or 3800
global.me = null
console.log argv

require("zappajs") PORT, ->


  ### Config ###
  mymarket = @conf = require "./config/service.coffee"

  console.log util.inspect mymarket, colors: true

  @app.set "views", __dirname + "/views/"
  @set "view engine": "jade"
  @use "static"
  @io.set "log level", 0

  @server.on "listening", =>
    console.log "InstantMarket listening on port #{PORT.toString().yellow}".green

  @get "/js/bundle.js": browserify ["crdt", "duplex", "cuid"]

  @shared "/js/shared.js": ->
 
    root = if window? then window else global
    
    root.crdt = require "crdt"
    duplex = require "duplex" 

    root.sharedDocs = [
      "Hashtags"
      "MarketOrders"
    ]
    root.sharedDoc = {}

    for sdoc in sharedDocs
      root.sharedDoc[sdoc] = new crdt.Doc()
 
    class SocketIOStreams
      constructor: (@socket) ->
        @channels = {}
 
      createStreamOnChannel: (channel) ->
        @socket.on channel, send_to_channel = (data) =>
          @channels[ channel ].emit "data", data
 
        @channels[ channel ] = duplex(
          _write = (data) =>
            @socket.emit channel, data
          _end = =>
            console.log "Ending stream #{channel}"
            @socket?.removeListener? channel, send_to_channel
        )

    root.SocketIOStreams = SocketIOStreams
 
    root.init_crdt_streams_over_socket_io = (socket) ->
      for doc_name, doc of sharedDoc
        ds = doc.createStream()
        sio_streams = new SocketIOStreams(socket)
        sio_chan = sio_streams.createStreamOnChannel(doc_name)
        ds.pipe(sio_chan).pipe(ds)


  # Extend with config and loading parameters
  view_extend = _(
    scripts: [
      "/js/conf.js"
      "/socket.io/socket.io.js"
      "/js/jquery.min.js"
      "/js/underscore-min.js"
      "/js/angular.min.js"
      "/js/ui-bootstrap-tpls-0.5.0.min.js"

      "https://maps.googleapis.com/maps/api/js?sensor=false"
      "/js/angular-google-maps.js"

      "/zappa/Zappa-simple.js"
      "/js/jquery.timeago.min.js"
      "/js/localStorageModule.js"
      "/js/fastclick.js"
      "/js/bundle.js"
      "/js/shared.js"
      "/js/script.js"
    ]    
  ).defaults mymarket

  ### ROUTES ###
  @get "/": ->
    @render index: view_extend

  @get "/js/conf.js": ->
    @send """
      window.mymarket = #{JSON.stringify do -> 
        ret = _(mymarket).clone()
        delete ret["foursquare"]
        ret 
      };
    """

  @get "/_suggest_poi": ->
    request("https://api.foursquare.com/v2/venues/search?" +
      "ll=#{@query.ll}&query=#{encodeURIComponent @query.search}&client_id=#{mymarket.foursquare.client_id}&" +
      "client_secret=#{mymarket.foursquare.client_secret}&v=20130615&limit=4")
    .pipe @res

  @get "/_address2geo": ->
    request("http://maps.googleapis.com/maps/api/geocode/json?address=#{@query.address}&sensor=false")
    .pipe @res

  sharedDoc.Hashtags.add
    id: "sell"
    name: "sell"
    stats: 
      users: 1
      pois: 0
  sharedDoc.Hashtags.add
    id: "buy"
    name: "buy"
    stats: 
      users: 0
      pois: 0
  sharedDoc.Hashtags.add
    id: "product"
    name: "product"
    stats: 
      users: 0
      pois: 0
  sharedDoc.Hashtags.add
    id: "service"
    name: "service"
    stats: 
      users: 1
      pois: 0
  sharedDoc.MarketOrders.add
    id: "test-1"
    author:
      id: "test"
      link: "link"
      username: "Sniper"
    type: "service"
    direction: "sell"
    content: "killing joyn with webrtc"
    price: "15€"
    hashtags: ["sell", "service"]
    post_date: new Date()
    poi: 
      name: "Chez oam"
      coord: [48.85445704683003, 2.4362782219366443]
    chats: [
     
    ]

  ### RT COMM ###
  @on connection: ->
    console.log "connected"
    init_crdt_streams_over_socket_io(@socket)
