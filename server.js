var config = require("./config/" + (process.env.NODE_ENV || "development") + ".json"),
    pathlib = require("path"),
    express = require("express"),
    app = express(),
    flash = require("connect-flash"),
    RedisStore = require("connect-redis")(express),
    routes = require("./lib/routes"),
    passport = require("passport"),
    fs = require("fs"),
    https = require("https"),
    querystring = require("querystring"),
    db = require("./lib/db"),
    server;

config.web.ssl.key = fs.readFileSync(__dirname + "/" + config.web.ssl.key, "utf-8");
config.web.ssl.cert = fs.readFileSync(__dirname + "/" + config.web.ssl.cert, "utf-8");

config.web.ssl.ca = ([].concat(config.web.ssl.ca || [])).map(function(ca){
    return fs.readFileSync(__dirname + "/" + ca, "utf-8");
});

// Express.js configuration
app.configure(function(){
    // HTTP port to listen
    app.set("port", config.web.port);

    // Define path to EJS templates
    app.set("views", pathlib.join(__dirname, "www", "views"));

    // Use EJS template engine
    app.set("view engine", "ejs");

    // Use gzip compression
    app.use(express.compress());

    // Parse cookies
    app.use(express.cookieParser(config.session.secret));

    // Parse POST requests
    app.use(express.bodyParser());

    app.use(express.session({
        store: new RedisStore(config.redis),
        secret: config.session.secret
    }));

    app.use(passport.initialize());

    app.use(passport.session());

    app.use(flash());

    // Use default Espress.js favicon
    app.use(express.favicon());

    // Log requests to console
    app.use(express.logger(config.loggerInterface));

    app.use(app.router);

    // Define static content path
    app.use(express["static"](pathlib.join(__dirname, "www", "static")));

    //Show error traces
    app.use(express.errorHandler());
});

// Use routes from routes.js
routes(app);

var server = https.createServer(config.web.ssl, app);

db.init(function(err){
    if(err){
        console.log("Failed opening database")
        console.log(err);
    }else{
        console.log("Database opened")
        server.listen(app.get("port"), function(err){
            if(err){
                console.log("Failed starting HTTPS server")
                console.log(err);
            }else{
                console.log("HTTPS server running on port " + app.get("port"));
            }
        });
    }
});

