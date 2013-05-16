var config = require("../config/" + (process.env.NODE_ENV || "development") + ".json"),
    passport = require("passport"),
    auth = require("./auth"),
    util = require("util");

// Main router function
module.exports = function(app){
    app.get("/", getFrontPage);

    app.get("/reset-link", getResetLink);
    app.post("/reset-link", postResetLink);

    app.get("/reset-password", getResetPassword);
    app.post("/reset-password", postResetPassword);

    app.get("/join", getJoin);
    app.post("/join", postJoin);

    app.get("/profile", getProfile);
    app.post("/profile", postProfile);

    app.get("/login", getLogin);
    app.post("/login", passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
        failureFlash: true,
        successFlash: util.format("Oled edukalt sisse logitud!")
    }));

    app.get("/logout", getLogout);
};

/**
 * Serves frontpage (/) of the website
 *
 * @param {Object} req HTTP Request object
 * @param {Object} req HTTP Response object
 */
function getFrontPage(req, res){
    renderResponse(req, res, {page: "/"});
}

function getResetLink(req, res){
    renderResponse(req, res, {page: "/reset-link", values: {
        email: req.query.email || ""
    }});
}

function getResetPassword(req, res){
    renderResponse(req, res, {page: "/reset-password", values: {
        email: req.query.email || "",
        resetToken: req.query.resetToken || ""
    }});
}

/**
 * Serves login page (/login) of the website
 *
 * @param {Object} req HTTP Request object
 * @param {Object} req HTTP Response object
 */
function getLogin(req, res){
    renderResponse(req, res, {page: "/login", values: {
        email: req.query.email || ""
    }});
}

/**
 * Serves logout page (/logout) of the website
 *
 * @param {Object} req HTTP Request object
 * @param {Object} req HTTP Response object
 */
function getLogout(req, res){
    req.flash("info", util.format("Oled nüüd välja logitud"));
    req.logout();
    res.redirect("/");
}

function getJoin(req, res){
    renderResponse(req, res, {page: "/join", values: {
        name: req.query.name || "",
        email: req.query.email || "",
        validation: {}
    }});
}

function getProfile(req, res){
    if(!req.user || !req.user.id){
        return res.redirect("/login");
    }
    renderResponse(req, res, {page: "/profile", values: {
        name: req.query.name || req.user.name || "",
        email: req.user.id || "",
        validation: {}
    }});
}

function postJoin(req, res){

    var validationErrors = {}, error = false;

    req.body.name = (req.body.name || "").toString().trim();

    if(!req.body.name){
        error = true;
        validationErrors.name = util.format("Nime väli on täitmata");
    }

    if(!req.body.email){
        error = true;
        validationErrors.email = util.format("Kasutajanime väli on täitmata");
    }

    if(!req.body.password){
        error = true;
        validationErrors.password = util.format("Parooli väli on täitmata");
    }

    if(req.body.password && !req.body.password2){
        error = true;
        validationErrors.password2 = util.format("Parooli kinnituse väli on täitmata");
    }

    if(req.body.password && req.body.password2 && req.body.password != req.body.password2){
        error = true;
        validationErrors.password2 = util.format("Paroolid ei kattu");
    }

    if(error){
        renderResponse(req, res, {page: "/join", values: {
            name: req.body.name || "",
            email: req.body.email || "",
            validation: validationErrors}});
        return;
    }

    auth.addUser(req.body.email, req.body.password, {name: req.body.name}, function(err, user, options){
        if(err){
            req.flash("error", util.format("Süsteemi viga: %s", err.message));
            renderResponse(req, res, {page: "/join", values: {
                name: req.body.name || "",
                email: req.body.email || "",
                validation: validationErrors}});
            return;
        }
        if(!user){
            validationErrors.email = options.message || util.format("Kasutaja loomine ebaõnnestus");
            renderResponse(req, res, {page: "/join", values: {
                name: req.body.name || "",
                email: req.body.email || "",
                validation: validationErrors}});
            return;
        }

        req.login(user, function(err) {
              if(err){
                  return next(err);
              }
              req.flash("success", util.format("Konto on loodud"));
              return res.redirect("/");
        });
    });
}

function postProfile(req, res){
    if(!req.user || !req.user.id){
        return res.redirect("/login");
    }

    var validationErrors = {}, error = false;

    req.body.name = (req.body.name || "").toString().trim();

    if(!req.body.name){
        error = true;
        validationErrors.name = util.format("Nime väli on täitmata");
    }

    if(req.body.password && !req.body.password2){
        error = true;
        validationErrors.password2 = util.format("Parooli väli on täitmata");
    }

    if(req.body.password && req.body.password2 && req.body.password != req.body.password2){
        error = true;
        validationErrors.password2 = util.format("Paroolid ei kattu");
    }

    if(error){
        renderResponse(req, res, {page: "/profile", values: {
            name: req.body.name || "",
            email: req.body.email || "",
            validation: validationErrors}});
        return;
    }

    auth.updateUser(req.user.id, req.body.password, {name: req.body.name}, function(err, user, options){
        if(err){
            req.flash("error", util.format("Süsteemi viga: %s", err.message));
            renderResponse(req, res, {page: "/profile", values: {
                name: req.body.name || "",
                email: req.body.email || "",
                validation: validationErrors}});
            return;
        }
        if(!user){
            validationErrors.email = options.message || util.format("Kasutaja andmete uuendamine ebaõnnestus");
            renderResponse(req, res, {page: "/profile", values: {
                name: req.body.name || "",
                email: req.body.email || "",
                validation: validationErrors}});
            return;
        }

        req.flash("success", util.format("Kasutaja andmed on uuendatud"));
        return res.redirect("/profile");
    });
}

function postResetLink(req, res){
    var validationErrors = {}, error = false;

    if(!req.body.email){
        error = true;
        validationErrors.email = util.format("Kasutajanime väli on täitmata");
    }

    if(error){
        renderResponse(req, res, {page: "/reset-link", values: {
            email: req.body.email || "",
            validation: validationErrors}});
        return;
    }

    auth.initializeResetPassword(req.body.email, function(err, status){
        if(err){
            req.flash("error", util.format("Süsteemi viga: %s", err.message));
            renderResponse(req, res, {page: "/reset-link", values: {
                name: req.body.name || "",
                email: req.body.email || "",
                validation: validationErrors}});
            return;
        }

        req.flash("info", util.format("Uue parooli genereerimise link saadeti sinu e-posti aadressile"));
        return res.redirect("/login");
    });
}

function postResetPassword(req, res){
    var validationErrors = {}, error = false;

    auth.resetPassword(req.body.email, req.body.resetToken, function(err, status, options){
        if(err){
            req.flash("error", util.format("Süsteemi viga: %s", err.message));
            return res.redirect("/login");
        }

        if(!status){
            req.flash("error", options && options.message || util.format("Parooli uuendamine ebaõnnestus"));
            return res.redirect("/login");
        }

        req.flash("info", util.format("Uus parool saadeti sinu e-posti aadressile"));
        return res.redirect("/login");
    });
}

function renderResponse(req, res, options){
    if(typeof options == "string"){
        options = {page: options};
    }

    options = options || {};
    options.status = options.status || 200;
    options.contentType = options.contentType || "text/html";
    options.page = options.page || "/";
    options.title = options.title || false;

    var defaultValues = {
            title: config.title,
            hostname: config.hostname,
            messages: {
                success: req.flash("success"),
                error: req.flash("error"),
                info: req.flash("info")
            },
            pageTitle: options.title,
            page: options.page,
            user: req.user
        },
        localValues = options.values || {};

    Object.keys(defaultValues).forEach(function(key){
        if(!(key in localValues)){
            localValues[key] = defaultValues[key];
        }
    });

    res.status(options.status);
    res.setHeader("Content-Type", options.contentType);
    res.render("index", localValues);
}
