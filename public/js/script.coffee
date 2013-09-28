### Fastclick for responsive mobile click ###
window.addEventListener "load", (->
  FastClick.attach document.body
), false

### String HTTP Linker ###

autoLink = (options..., scope) ->
  pattern = ///
    (^|\s) # Capture the beginning of string or leading whitespace
    (
      (?:https?|ftp):// # Look for a valid URL protocol (non-captured)
      [\-A-Z0-9+\u0026@#/%?=~_|!:,.;]* # Valid URL characters (any number of times)
      [\-A-Z0-9+\u0026@#/%=~_|] # String must end in a valid URL character
    )
  ///gi

  return @replace(pattern, "$1<a href='$2'>$2</a>") unless options.length > 0

  option = options[0]
  linkAttributes = (
    " #{k}='#{v}'" for k, v of option when k isnt 'callback'
  ).join('')

  @replace pattern, (match, space, url) ->
    # First check if the url is not a video/image with embedly
    embedlyKey = "ad06c0ad1988423bb73edd6763020a90"

    embedlyCall = "http://api.embed.ly/1/oembed?key=#{embedlyKey}&url=#{url}&maxwidth=500"

    $.ajax(embedlyCall).
      done((data) ->
        if data.type is "photo"
          scope.message.rich = "<img src='#{data.url}'/>"
      )

    link = option.callback?(url) or
      "<a href='#{url}'#{linkAttributes}>#{url}</a>"

    "#{space}#{link}"

String::autoLink = autoLink


### Angular App ###

angular.module('mymarket', ["google-maps", "LocalStorageModule"]).
  directive('tabs', ->
    restrict: 'E'
    transclude: true
    scope: {paneChanged: '&'}
    controller: ($scope, $element) ->
      panes = $scope.panes = []

      $scope.select = (pane) ->
        angular.forEach panes, (pane) ->
          pane.selected = false
        pane.selected = true
        $scope.paneChanged selectedPane: pane

      @addPane = (pane) ->
        $scope.select(pane) if panes.length is 0
        panes.push(pane)
    template:'''
      <div class="tabs">
        <ul class="tab-bar">
          <li ng-repeat="pane in panes" class="tab-bar__tab">
            <a href="" class="tab-bar__link" ng-class="{'is-active':pane.selected}" ng-click="select(pane)">{{pane.title}}</a>
          </li>
        </ul>
        <div class="tab-content" ng-transclude></div>
      </div>
    '''
    replace: true
  ).
  directive('pane', ->
    require: '^tabs'
    restrict: 'E'
    transclude: true
    scope: { title: '@' }
    link: (scope, element, attrs, tabsCtrl) ->
      tabsCtrl.addPane(scope)
    template: '''
      <div class="tab-pane" ng-class="{'is-active': selected}" ng-transclude>
      </div>
    '''
    replace: true
  ).
  directive('onFocus', ->
    #console.log "FOCUS?"
    restrict: 'A'
    link: (scope, element, attrs) ->
        console.log "focus on", element
        element.bind 'focus', ->
          scope.$eval(attrs.onFocus)
  ).
  factory("hashchange", ($rootScope) ->
    last_hash = window.location.hash
    on: (cb) ->
      console.log "on hashchange"
      setInterval ->
        if last_hash isnt window.location.hash
          console.log "onHashChange", window.location.hash
          last_hash = window.location.hash
          $rootScope.$apply ->
            cb?(last_hash)
      , 100
  ).
  factory("socket", ($rootScope) ->
    socket = io.connect()
    console.log "connected?"
    on: (event, cb) ->
      socket.on event, (args...) ->
        $rootScope.$apply ->
          cb.apply socket, args
    emit: (event, data, ack) ->
      if typeof data is "function"
        ack = data
        data = ""

      socket.emit event, data, (args...) ->
        $rootScope.$apply ->
          ack?.apply socket, args
  ).
  filter("matchCurrentChannels", ->
    (orders, current_channels) ->
      console.log "Filtering", orders, current_channels, arguments
      if current_channels?.length
        _(orders).filter (msg) ->
          _(msg.hashtags).intersection(current_channels).length
      else
        orders
  ).
  factory('sharedDoc', (socket, $rootScope) ->
    shared = {}
    (doc_name) ->
      doc = new crdt.Doc()
      console.log "new sharedDoc", doc_name, doc.rows

      apply_scope = ->
        for id, row of doc.rows
          row._json = JSON.stringify row

      doc.on "remove", apply_scope
      doc.on "add", apply_scope
      doc.on "row_update", apply_scope

      ### Socket.io Pipe to channel {doc_name} ###
      doc_stream = doc.createStream()
      sio_streams = new SocketIOStreams(socket)
      sio_chan = sio_streams.createStreamOnChannel(doc_name)
      doc_stream.pipe(sio_chan).pipe(doc_stream)

      socket.on "disconnect", off_cnx = ->
        console.log "disconnected"
        doc_stream.end()
        doc.removeAllListeners()
        #socket.removeListener "disconnect", off_cnx

      doc  
    ).controller('AppCtrl', ($scope, $filter, $http, socket, hashchange, $timeout, localStorageService, sharedDoc) ->
    window.scope = $scope

    first_connection = true

    $scope.panelAddShow = false
    $scope.channels = []
    $scope.current_channels = []
    $scope.messages = []
    $scope.message =
      content: ""
      price: ""

    ###
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
    ###

    $scope.me = JSON.parse(localStorageService.get("me")) ?
      username: ""
      avatar: ""
      userAgent: navigator.userAgent

    $scope.$watch "me", (n,o) ->
      unless _(n).isEqual o
        socket.emit "me", $scope.me, =>
          console.log "Sending me", $scope.me
        localStorageService.add "me", JSON.stringify($scope.me)

    , true

    $scope.$watch "channels", (n,o) ->
      console.log "channels, n", n, "o", o
    , true

    $scope.poiShow = false

    # Map Refresh

    $scope.isMapVisible = (change_state) ->
      if not $scope._isMapVisible and change_state
        $scope.refreshMarkers()      
      $scope._isMapVisible = change_state ? $scope._isMapVisible

    $scope.isMapVisible false

    ### Media queries ###
    $timeout ->
      $scope.$apply ->
        mq = window.matchMedia("(min-width: 1000px)")
        if (mq.matches)
          console.log "MQ Wide Matching"
          $scope.isMapVisible true
    , 1000

    colorMarker = (chan) ->
      console.log "colorMarker", $scope.channels
      pos = _($scope.channels).map((channel) ->
          channel.name
        ).indexOf chan
      if pos isnt -1
        Math.round((19 / $scope.channels.length) * pos + 1)
      else
        20

    $scope.paneChanged = (selectedPane) ->

      if selectedPane.title is "Maps"
        $scope.isMapVisible true
      else
        $scope.isMapVisible false


    $scope.order = 
      set: (prop, value) ->
        @[prop] = value
      type: "Service"
      direction: "Sell"
    $scope.poiResults = []
    $scope.poiMessage =
      name: ""
      coord: []

    $scope.refreshMarkers = ->
      $scope.markers = []

      _($filter('matchCurrentChannels') $scope.orders, $scope.current_channels)
      .each (order) ->
        if order.poi
          $scope.markers.push(
            latitude: order.poi.coord[0]
            longitude: order.poi.coord[1]
            infoWindow: order.poi.name
            icon: "/img/pins/pin-#{colorMarker order.hashtags[0]}.png"
          )      

    $scope.typeahead = (search)->
      if search.length > 2
        $http({
          url: "/_suggest_poi"
          method: "GET"
          params: {ll: $scope.center.latitude + ',' + $scope.center.longitude, search: search}
        }).success( (data) ->
          $scope.poiResults = data.response.venues
        )

    $scope.addPoi = (name, lat, lng)->
      console.log "addPoi", lat, lng
      $scope.poiMessage.name = name
      $scope.poiMessage.coord = [lat, lng]
      $("#local_search").val("")
      $scope.togglePoiShow()

    $scope.togglePoiShow = ->
      $scope.poiShow = !$scope.poiShow
      if $scope.poiShow
        $("#local_search").focus()

    $scope.toggleChannel = (channel, event) ->
      console.log "toggleChannel", 
      chan = $scope.Hashtags.get(channel)
      console.log "chan for #{channel}", chan, chan.get?, chan.set?
      chan.set "joined", not chan.get "joined"
      removed = false
      $scope.current_channels = _($scope.current_channels)
        .reject (chan) ->
          chan is channel &&
            removed = true
      unless removed
        $scope.current_channels.push channel

      if $scope.isMapVisible()
        $scope.refreshMarkers()

      console.log "toggleChannel", arguments, event
      event.preventDefault()

    $scope.toggleAddOrder = ->
      console.log $scope.panelAddShow
      $scope.panelAddShow = not $scope.panelAddShow
      console.log $scope.panelAddShow

    $scope.inputFocus = ->
      $scope.$apply ->
        $scope.message.content = _($scope.current_channels).map((chan) ->
          "#" + chan
        ).join(" ") + " "

    extractHashtags = (text) ->
      _(text.match(/#([\w-_]+)/g)).map (ht) -> ht.slice(1)

    $scope.sendMessage = ->
      console.log "Sending.Message", $scope.message.content
      return unless $scope.message.content
      if not $scope.me.username
        setTimeout ->
          $("#pseudoprompt").focus()
        return $scope.usernamePrompt = true
      $scope.usernamePrompt = false

      id = Math.round(Math.random() * 100000000).toString()

      doc = $scope.MarketOrders.add
        id: id
        author: username: $scope.me.username
        type: $scope.order.type
        direction: $scope.order.direction
        content: $scope.message.content
        hashtags: extractHashtags($scope.message.content).concat [$scope.order.direction, $scope.order.type]
        poi: if $scope.poiMessage.name then $scope.poiMessage else null
        post_date: (new Date()).toString()

      $scope.message.content = ""
      $scope.poiMessage =
        name: ""
        coord: []


    add_or_update_channel = (room) ->
      unless update_channel_state room.name, room
        $scope.channels.push room

    update_channel_state = (name, state) ->
      if chan = _($scope.channels).find((chan) -> chan.name is name)
        console.log "Found channel #{name}"
        for k, v of state
          console.log "Updating channel #{name}.#{k} = #{v}"
          chan[k] = v
      else
        console.log "Not found channel #{name}"


    socket.on "connect", ->

      sharedDocs.forEach (doc_name) ->
        $scope[doc_name] = sharedDoc doc_name
        switch doc_name
          when "Hashtags"
            $scope[doc_name].on "add", ->
              $scope.channels = (row.state for id, row of $scope[doc_name].rows)
            $scope[doc_name].on "remove", ->
              $scope.channels = (row.state for id, row of $scope[doc_name].rows)
          when "MarketOrders"
            $scope[doc_name].on "add", ->
              $scope.orders = (row.state for id, row of $scope[doc_name].rows)
              #$scope.refreshMarkers()
            $scope[doc_name].on "remove", ->
              $scope.orders = (row.state for id, row of $scope[doc_name].rows)
              #$scope.refreshMarkers()



      hashchange.on current_channel = (hash) ->
        cur_hash_chans = (hash ? window.location.hash).split(/\#/)[1..-1]
        unless _($scope.current_channels).isEqual cur_hash_chans
          $scope.current_channels = (hash ? window.location.hash).split(/\#/)[1..-1]

      current_channel()


      # Reconnect on deco
      unless first_connection
        window.location.reload()
      first_connection = false


      # List Rooms
      socket.emit "list_rooms", (rooms) ->

        console.log "list_rooms", rooms
        for room in rooms
          add_or_update_channel room if room.name

    
    socket.on "total_connected", (total_connected) ->
      $scope.total_connected = total_connected
      console.log "TOTAL CONNECTED", $scope.total_connected = total_connected


    socket.on "room_update", (room) ->
      console.log "room_update", room
      add_or_update_channel room

    # Google Maps
    $scope.zoom = 13
    $scope.center = 
      latitude: mymarket.geo.location.latitude
      longitude: mymarket.geo.location.longitude
    $scope.selected = _($scope.center).clone()


    if navigator.geolocation
      navigator.geolocation.getCurrentPosition((position) ->
        $scope.$apply ->
          console.log position
          # Updating Me
          $scope.me.location = 
            lat: position.coords.latitude
            lng: position.coords.longitude
          ###
            $scope.center = {
              latitude: position.coords.latitude
              longitude: position.coords.longitude
            }
          ###
      )

    $scope.markers = []

    socket.on "post", (post) ->
      console.log "post", post
      if (_(post.hashtags).intersection($scope.current_channels).length > 0) or
        ($scope.current_channels.length is 0)
          add_or_not_message post
  ).
  directive('enterSubmit', ->
    {
      restrict: 'A'
      link: (scope, element, attrs) ->
        submit = false

        $(element).on({
          keydown: (e) ->
            submit = false

            if (e.which is 13 && !e.shiftKey)
              submit = true
              e.preventDefault()

          keyup: () ->
            if submit
              scope.$eval( attrs.enterSubmit )

              # flush model changes manually
              scope.$digest()
        })
    }
  ).
  directive('timeago', ($timeout) ->
    restrict: 'A'
    link: (scope, elem, attrs) ->
      updateTime = ->
        console.log "updateTime", attrs, attrs.timeago
        if attrs.timeago
          time = scope.$eval(attrs.timeago)
          elem.text(jQuery.timeago(time))
          $timeout(updateTime, 15000)
      scope.$watch(attrs.timeago, updateTime);
  )

