html ->
  head ->
    script src:"/zappa/Zappa-simple.js"
    script src:"//cdnjs.cloudflare.com/ajax/libs/jquery/2.0.2/jquery.min.js"
    script src:"/index.js"
  body ->
    h1 "Test #{if @home then "La Home" else "Pas la home"}"
    div "#room", ""
    input "#txt", type:"text"
