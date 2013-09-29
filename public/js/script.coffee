cuid = require "cuid"
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
        console.log "select pane", pane.title, pane
        angular.forEach panes, (pane) ->
          pane.selected = false
        pane.selected = true
        $scope.paneChanged selectedPane: pane

      @addPane = (pane) ->
        $scope.select(pane) if panes.length is 0
        unless _(panes).find((p) -> p.title is pane.title)
          panes.push(pane)
      
      @selectPane = (pane) ->
        $scope.select(pane)

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
    scope: 
      title: '@'
      display: '='
    link: (scope, element, attrs, tabsCtrl) ->
      tabsCtrl.addPane(scope)
      scope.$watch 'display', ->
        console.log "ACTIVE CHANGED", arguments,  scope.display
        if scope.display
          console.log "Selecting Pane"
          tabsCtrl.selectPane(scope)
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
  directive('photoInput', ($parse) ->
    console.log "in photoinput"
    restrict: 'EA'
    template: "<input type='file' accept='image/*' capture='camera' />"
    replace: true
    link: ($scope, element, attrs) ->
      console.log "link in photoinput"
      modelGet = $parse(attrs.fileInput)
      modelSet = modelGet.assign
      onChange = $parse(attrs.onChange)
 
      updateModel = ->
        scope.$apply ->
          modelSet(scope, element[0].files[0])
          onChange(scope)
      
      element.bind('change', updateModel)

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
  ).
  factory('fileReader', ($q, $log) ->
    onLoad = (reader, deferred, scope) ->
      ->
        scope.$apply ->
          deferred.resolve reader.result

    onError = (reader, deferred, scope) ->
      ->
        scope.$apply ->
          deferred.reject  reader.result

    onProgress = (reader, scope) ->
      (event) ->
        scope.$broadcast "fileProgress",
          total: event.total,
          loaded: event.loaded

    getReader = (deferred, scope) ->
        reader = new FileReader();
        reader.onload = onLoad(reader, deferred, scope)
        reader.onerror = onError(reader, deferred, scope)
        reader.onprogress = onProgress(reader, scope)
        reader

    readAsDataURL = (file, scope) ->
        deferred = $q.defer()
         
        reader = getReader(deferred, scope)
        reader.readAsDataURL(file)
         
        deferred.promise

    readAsDataUrl: readAsDataURL  
  ).
  controller('AppCtrl', ($scope, $filter, $http, socket, hashchange, $timeout, localStorageService, sharedDoc, fileReader) ->
    window.scope = $scope

    first_connection = true

    $scope.panelAddShow = false
    $scope.channels = []
    $scope.current_channels = []
    $scope.messages = []
    $scope.message =
      content: ""
      price: ""
    $scope.notifs = []

  
    $scope.clickBuy = ->
      console.log "clickBuy", $scope.panelAddShow
      if $scope.panelAddShow
        $scope.order.direction = "buy"
        $scope.sendMessage()
      else
        $scope.toggleChannel "buy"

    $scope.clickSell = ->
      if $scope.panelAddShow
        $scope.order.direction = "sell"
        $scope.sendMessage()
      else
        $scope.toggleChannel "sell"

    $scope.me = JSON.parse(localStorageService.get("me")) ?
      id: cuid()
      username: ""
      avatar: ""
      userAgent: navigator.userAgent
      stream: null
      cam_enabled: null
      audio: null
      order: 
        place_name: ""
        position_type: "mine"
        coord: []
        mine: []
    
    $scope.my_orders = null 


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
    ###
    $timeout ->
      $scope.$apply ->
        mq = window.matchMedia("(min-width: 1000px)")
        console.log "mq", mq
        if (mq.matches)
          console.log "MQ Wide Matching"
          $scope.isMapVisible true
    , 1000
    ###

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

      if selectedPane.title is "Map"
        $scope.isMapVisible true
      else
        $scope.isMapVisible false

      if selectedPane.title isnt "Chat" and $scope.chat.show is true
        $scope.unset_chat()
        
    $scope.order = 
      set: (prop, value) ->
        @[prop] = value
      type: "product"
      direction: "sell"
    $scope.poiResults = []
    $scope.poiMessage =
      name: ""
      coord: []
    $scope.chat = 
      show: false
      order: null

    $scope.set_chat = (order) ->
      console.log "chat order", order
      console.log "pre notifs", $scope.notifs.length
      console.log "post notifs", $scope.notifs.length
      $scope.chat.show = true
      $scope.chat.order = order

      if order.author.id is $scope.me.id
        doc = $scope.MarketOrders.get(order.id)
        doc.set "online", true

        metadata = _($scope.me.order.mine).find( (o) -> o.id is order.id )
        console.log "metadata", metadata
        metadata.update_date = order.update_date

        $scope.notifs = _($scope.notifs).reject (n) -> 
          console.log "notif", n, "order", order, n.id is order.id
          n.id is order.id

    $scope.unset_chat = ->
        console.log "unChat", $scope.my_orders
        $scope.my_orders.each (order) ->
          order.set? "online", false
          console.log "order, offline", order
        $scope.chat.show = false
        $scope.chat.order = null



    $scope.refreshMarkers = ->
      $scope.markers = []

      _($filter('matchCurrentChannels') $scope.orders, $scope.current_channels)
      .each (order) ->
        if order.poi and order.poi.coord?.length
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
      $scope.me.order.place_name = name
      $scope.me.order.coord = [lat, lng]
      $("#local_search").val("")
      $scope.me.order.position_type = "company"
      $scope.togglePoiShow()

    $scope.togglePoiShow = ->
      $scope.poiShow = !$scope.poiShow
      if $scope.poiShow
        $("#local_search").focus()

    $scope.toggleChannel = (channel, event) ->
      console.log "toggleChannel", 
      chan = _($scope.channels).find (chan) -> chan.name is channel
      chan.joined = !chan.joined 
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

    $scope.readFile = ->

      console.log "fileReader", $scope, @
      fileReader.readAsDataUrl($scope.file, $scope).then (result) ->
        $scope.message.photo = result

    $scope.completeTransaction = (order) ->
      doc = $scope.MarketOrders.get(order.id)
      doc.set "completed", $scope.me.id
      doc.set "update_date", (new Date()).toISOString()


    $scope.sendMessage = ->
      console.log "Sending.Message", $scope.message.content
      return unless $scope.message.content
      if not $scope.me.username
        setTimeout ->
          $("#pseudoprompt").focus()
        return $scope.usernamePrompt = true
      $scope.usernamePrompt = false

      hashtags = extractHashtags($scope.message.content).concat [$scope.order.direction, $scope.order.type]
      for hashtag in hashtags
        console.log "hashtag", hashtag
        doc = $scope.Hashtags.get(hashtag)
        console.log "doc", doc
        unless doc.get "name"
          doc.set "name", hashtag
        unless stats = doc.get "stats"
          stats = 
            users: 0
            pois: 0
        stats.users++
        console.log "setting stats for #{hashtag}", stats
        doc.set "stats", stats

      doc = $scope.MarketOrders.add
        id: cuid()
        author: 
          id: $scope.me.id
          username: $scope.me.username
        type: $scope.order.type
        direction: $scope.order.direction
        content: $scope.message.content
        photo: $scope.message.photo
        price: $scope.message.price
        hashtags: hashtags
        poi: 
          name: $scope.me.order.place_name or $scope.me.username + "'s place"
          coord: if $scope.me.order.position_type is "mine"
              $scope.me.coord
            else
              $scope.me.order.coord
        post_date: now = (new Date()).toISOString()
        update_date: now
        chats: []
        online: false

      $scope.message.content = ""
      $scope.poiMessage =
        name: ""
        coord: []
        photo: null

      $scope.panelAddShow = false
      $scope.chatShow = false

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
      socket.emit "identity", id: $scope.me.id

      sharedDocs.forEach (doc_name) ->
        $scope[doc_name] = sharedDoc doc_name
        switch doc_name
          when "Hashtags"
            $scope[doc_name].on "add", ->
              $scope.channels = (row.state for id, row of $scope[doc_name].rows)
            $scope[doc_name].on "remove", ->
              $scope.channels = (row.state for id, row of $scope[doc_name].rows)
            $scope[doc_name].on "row_update", ->
              $scope.channels = (row.state for id, row of $scope[doc_name].rows)
          when "MarketOrders"
            $scope[doc_name].on "add", ->
              $scope.orders = (row.state for id, row of $scope[doc_name].rows when not row.state.completed)
              $scope.transactions = (row.state for id, row of $scope[doc_name].rows when row.state.completed is $scope.me.id)
              #$scope.refreshMarkers()
            $scope[doc_name].on "remove", ->
              $scope.orders = (row.state for id, row of $scope[doc_name].rows when not row.state.completed)
              $scope.transactions = (row.state for id, row of $scope[doc_name].rows when row.state.completed is $scope.me.id)
              #$scope.refreshMarkers()
            $scope[doc_name].on "row_update", ->
              $scope.orders = (row.state for id, row of $scope[doc_name].rows when not row.state.completed)
              $scope.transactions = (row.state for id, row of $scope[doc_name].rows when row.state.completed is $scope.me.id)
              #$scope.refreshMarkers()
  
      $scope.my_orders = $scope.MarketOrders.createSet (state) ->
        state?.author?.id is $scope.me.id
      
      ###
      $scope.my_orders.on "add", (order) ->
        known_order_changes order
        
      $scope.my_orders.on "remove", (order) ->
      ###
      $scope.my_orders.on "changes", (order) ->
        console.log "my set order change", arguments
        $scope.me.order.mine or= []
        unless metadata = _($scope.me.order.mine).find( (o) -> o.id is order.id )
          console.log "no metadata"
          $scope.me.order.mine.push metadata = 
            id: order.id
            update_date: order.state.update_date

        console.log "metadata", metadata, 
          order.state.update_date, metadata.update_date,
          (new Date(order.state.update_date)).getTime(),
          (new Date(metadata.update_date)).getTime(),
          ((new Date(order.state.update_date)).getTime() > (new Date(metadata.update_date)).getTime()), 
          (not $scope.chat.show or $scope.chat.order?.id isnt order.id)

        if ((new Date(order.state.update_date)).getTime() > (new Date(metadata.update_date)).getTime()) and 
          (not $scope.chat.show or $scope.chat.order?.id isnt order.id)
            $scope.notifs.push order.state unless _($scope.notifs).find((o) -> o.id is order.id)






      hashchange.on current_channel = (hash) ->
        cur_hash_chans = (hash ? window.location.hash).split(/\#/)[1..-1]
        unless _($scope.current_channels).isEqual cur_hash_chans
          $scope.current_channels = (hash ? window.location.hash).split(/\#/)[1..-1]

      current_channel()


      # Reconnect on deco
      #unless first_connection
      #  window.location.reload()
      #first_connection = false


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
    $scope.zoom = 12
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
              console.log attrs.enterSubmit, scope
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
        if attrs.timeago
          time = scope.$eval(attrs.timeago)
          elem.text(jQuery.timeago(time))
          #$timeout(updateTime, 15000)
      scope.$watch(attrs.timeago, updateTime);
  ).
  controller('ChatCtrl', ($scope, $filter, socket, webrtc) ->
    console.log "ChatCtrl", window.scope2 = $scope
    
    $scope.text = ""
    
    order_id = $scope.chat.order.id
    order = $scope.MarketOrders.get order_id
    console.log "chat order", order
    order.on "change", (order) ->
      console.log "change on order ", order


    $scope.sendTxt = ->
      return if $scope.text is ""
      doc = $scope.MarketOrders.get($scope.chat.order.id)
      console.log "sendTxt", doc
      chats = doc.get "chats"
      console.log "chats", chats
      chats.push 
        author:
          username: $scope.me.username
          id: $scope.me.id
        text: $scope.text
        post_date: now = (new Date()).toISOString()
      doc.set "chats", JSON.parse(angular.toJson(chats))
      doc.set "update_date", now
      $scope.text = ""

    $scope.visio_call = ->
      console.log "visio_call"
      doc = $scope.MarketOrders.get($scope.chat.order.id)
      doc.set "update_date", (new Date()).toISOString()
      $scope.users.push $scope.chat.order.author
      webrtc.users_to_call.push $scope.chat.order.author.id
      $scope.toggleCam()

    $scope.users = [
      $scope.me
    ]
    ### WEBRTC ###
    $scope.cam =
      available: false
      activated: false
      enabled: false

    $scope.mic =
      enabled: false 
      activated: false

    if not webrtc.not_supported

      $scope.cam.available = true 
      $scope.$watch "users", (neww, old, scope) ->
          new_ids = _(neww).pluck "id"
          old_ids = _(old).pluck "id"
          diff_ids = _(new_ids).difference(old_ids)

          console.log "users changed", diff_ids

          _(diff_ids).each (user_id) ->
            if user_id isnt $scope.me.id
              if new_ids.indexOf(user_id) isnt -1
                console.log "new peer", user_id
                webrtc.join user_id
              else if old_ids.indexOf(user_id) isnt -1
                console.log "old peer", user_id
                webrtc.removePeers user_id
              else 
                console.log "WTF", user_id

      , true

      webrtc.on_my_camera = (my_video) ->
        console.log "ON_MY_CAM o/"
        me_in_list = _($scope.users).find (user) -> user.id is $scope.me.id
        me_in_list.stream = my_video
        me_in_list.audio = false
        $scope.cam.activated = true
        $scope.cam.enabled = true
        $scope.mic.activated = true
        $scope.mic.enabled = true
        #$scope.mic.enabled = webrtc.toggleMic()

      webrtc.on_remote_camera = (peer) ->
        console.log "\\o/ REMOTE CAM", arguments
        remote_in_list = _($scope.users).find (user) -> user.id is peer.id
        remote_in_list.stream = peer.stream
        $timeout ->
            remote_in_list.audio = true
          , 1000

      webrtc.out_message = (msg) ->
        #console.log "WEBRTC.OUT", msg.type
        socket.emit "message", msg
      

      socket.on "message", (msg) ->
        #console.log "WEBRTC.IN", msg.type, msg
        unless _($scope.users).find( (user) -> msg.from is user.id )
          $scope.users.push 
            id: msg.from
        webrtc.in_message msg

      $scope.toggleCam = ->
        if webrtc.started
          $scope.cam.enabled = webrtc.toggleCam()
          me_in_list = _($scope.users).find (user) -> user.id is $scope.me.id
          if $scope.cam.enabled
            me_in_list.cam_enabled = true
          else
            me_in_list.cam_enabled = false
        else
          webrtc.init "small"

      $scope.toggleMic = ->
        console.log "toggleMic"
        
        if $scope.mic.enabled = webrtc.toggleMic()
          $scope.previous_volume = player.getVolume()
          console.log "getting previous_volume", $scope.previous_volume
          player.setVolume(low_volume)
        else
          console.log "setting previous_volume", $scope.previous_volume
          player.setVolume( $scope.previous_volume )

      if $scope.chat.order.author.id is $scope.me.id
        $scope.toggleCam()
 
    ### /WEBRTC ###
  )
  .directive 'camera', ->
    restrict: "E"
    replace: true
    template: "<video></video>"
    transclude: true
    scope: 
      stream: "="
      audio: "="
      show: "="
    link: (scope, element, attrs) ->
      
      scope.$watch "show", (neww, old, scope) ->
        video = element[0]
        console.log "on show change", neww, old
        video.style.display = if neww then "" else "none"

      scope.$watch "audio", (neww, old, scope) ->
        video = element[0]
        video.muted = !neww
      
      scope.$watch "stream", (neww, old, scope) ->
        video = element[0]
        #return unless neww
        console.log "watch stream", arguments
        unless neww
          $(video).css "display", "none"
          return              

        $(video).css "display", ""

        try 
          if URL and URL.createObjectURL
            video.src = URL.createObjectURL(neww)
          else if element.srcObject
            video.srcObject = neww
          else if element.mozSrcObject
            video.mozSrcObject = neww
        catch e
          console.log "Error", e

        video.muted = true

  .factory 'webrtc', ($rootScope) ->
    peerConnectionConfig = 
      iceServers: [
        { url: "stun:stun.l.google.com:19302"}
      ]

    parser = new UAParser()
    ua = parser.getResult()
    
    if ua.browser.name.match(/Chrom(e|ium)/)
      peerConnectionConfig.iceServers.push 
        url: "turn:test@watsh.tv:3478"
        credential: "test"
    else if ua.browser.name.match(/Firefox/)
      if parseFloat(ua.browser.version) >= 24.00
        peerConnectionConfig.iceServers.push 
          url: "turn:watsh.tv:3478"
          credential: "test"
          username: "test"
      else
        return not_supported: true

    try 
      window.webrtc = new WebRTC
        peerConnectionConfig: peerConnectionConfig
        url: window.location.host
        debug: true
    catch e
      return not_supported: true

    webrtc.on "message", (msg) ->
      events.out_message? msg

    webrtc.on "peerStreamAdded", (peer) ->
      peer.stream.onended = ->
        console.log "Stream ended"
      peer.stream.onremovetrack = ->
        console.log "Track ended"
      $rootScope.$apply ->
        events.on_remote_camera? peer

    webrtc.on "peerStreamRemoved", (args...) ->
      console.log "peerStreamRemoved", arguments

    window.webrtc_a = events = 
      started: false
      users: []
      waiting_msgs: []
      users_to_call: []

      on_my_camera: null
      on_remote_camera: null
      out_message: null
      
      init: (cam_resolution = "small") ->
        webrtc.startLocalMedia {
            video: 
              mandatory: 
                switch cam_resolution
                  when "small"
                    maxWidth: 320
                    maxHeight: 240
                  when "medium"
                    maxWidth: 640
                    maxHeight: 480
            audio: true

          }, (err, stream) ->
            #myVideo = attachMediaStream stream
            console.log "CAM INIT"
            if err 
              console.log err
              return 

            $rootScope.$apply ->
              events.on_my_camera?.call events, stream #myVideo
              events.ready()

      in_message: (msg) ->
        #console.log "in_message, @started?", @started
        unless @started
          @waiting_msgs.push msg
          return

        peers = webrtc.getPeers msg.from
        #console.log "on message", msg.type, peers.length
        unless peers.length
          @add_peer msg.from
          peers = webrtc.getPeers msg.from

        ###
        if msg.type is "offer"
          peer = webrtc.createPeer 
            id: msg.from
          peer.handleMessage msg
        else
        ###
        _(peers).each (peer) ->
          peer.handleMessage msg

      on: (args...) ->
        webrtc.on args...
      join: (user_id) ->            
        if webrtc.localStream
          @add_peer user_id
        else
          @users.push user_id
      
      ready: ->
        console.log "READY", "waiting msgs", @waiting_msgs.length
        @started = true

        while user_id = @users.pop()
          @add_peer user_id

        while user_id = @users_to_call.pop()
          console.log "Calling", user_id
          @call_peer user_id

        while msg = @waiting_msgs.shift()
          @in_message msg

      add_peer: (user_id) ->
        unless  webrtc.getPeers(user_id)?.length
          webrtc.createPeer
            id: user_id

      call_peer: (user_id) ->
        console.log "Calling #{user_id}"
        peers = webrtc.getPeers user_id
        console.log "peers", peers
        _(peers).each (peer) ->
          console.log ">Calling #{user_id}"
          peer.start()    
      
      stop: ->
        @started = false
        peers = webrtc.getPeers()
        _(peers).each (peer) ->
          peer.end()              

      toggleCam: ->
        video = webrtc.localStream.getVideoTracks()[0]
        video.enabled = not video.enabled

      toggleMic: ->
        audio = webrtc.localStream.getAudioTracks()[0]
        audio.enabled = not audio.enabled

      start: (users) ->
        if webrtc.localStream
          @on_my_camera? webrtc.localStream
          @users = @users.concat users
          @users_to_call = @users_to_call.concat users
          @ready()
        else 
          # TODO 
          @start_cam()