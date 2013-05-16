var config = require("../config/" + (process.env.NODE_ENV || "development") + ".json"),
    passport = require("passport"),
    auth = require("./auth"),
    util = require("util"),
    LocalStrategy = require("passport-local").Strategy,
    crypto = require("crypto"),
    mail = require("./mail"),
    db = require("./db");

module.exports.addUser = addUser;
module.exports.updateUser = updateUser;
module.exports.loadUserData = loadUserData;
module.exports.initializeResetPassword = initializeResetPassword;
module.exports.resetPassword = resetPassword;

passport.use(new LocalStrategy({
        usernameField: "email"
    },
    function(email, password, done) {
        var validationError;

        password = (password || "").toString();
        email = (email || "").toString().toLowerCase().trim();

        if((validationError = validateCredential("E-posti aadress", email, true))){
            return done(null, false, {message: validationError});
        }

        if((validationError = validateCredential("Parool", password))){
            return done(null, false, {message: validationError});
        }

        if(!email || !password){
            return done(null, false, {message: util.format("Vigane e-posti aadress või parooli väli")});
        }

        generateKey(email, password, function(err, key){
            loadUserData(email, function(err, user){
                if(err){
                    return done(err);
                }

                if(!user || user.pass != key){
                    return done(null, false, {message: util.format("Vale e-posti aadress või parool")});
                }

                return done(null, user);
            });
        });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
      loadUserData(id, function(err, user){
          if(err){
              return done(err);
          }
          if(user){
              delete user.pass;
          }
          return done(null, user);
      });
});

function loadUserData(email, callback){
    db.findOne("user", {id: email}, callback);
}

function addUser(email, password, data, callback){

    if(!callback && typeof data == "function"){
        callback = data;
        data = undefined;
    }

    password = (password || "").toString();
    email = (email || "").toString().toLowerCase().trim();
    data = data || {};

    if(!email || !password){
        return callback(null, false, {message: util.format("Vigane e-posti aadress või parooli väli")});
    }

    loadUserData(email, function(err, user){
        if(err){
            return callback(err);
        }

        if(user){
            return callback(null, false, {message: util.format("Valitud e-posti aadress on juba kasutuses")});
        }

        generateKey(email, password, function(err, key){
            if(err){
                return callback(err);
            }

            var user = {
                id: email,
                pass: key,
                joined: new Date(),
                trial: true,
                trialEnds: new Date(Date.now() + config.trialDays * 24 * 3600 * 1000),
                validated: false,
                reset: false
            };

            Object.keys(data).forEach(function(key){
                user[key] = data[key];
            });

            db.save("user", user, function(err, status){
                if(err){
                    return callback(err);
                }
                mail.sendRegistration(user);
                loadUserData(email, callback);
            });

        });
    });
}

function updateUser(email, password, data, callback){

    if(!callback && typeof data == "function"){
        callback = data;
        data = undefined;
    }

    password = (password || "").toString();
    email = (email || "").toString().toLowerCase().trim();
    data = data || {};

    loadUserData(email, function(err, user){
        if(err){
            return callback(err);
        }

        if(!user){
            return callback(null, false, {message: util.format("Vigane kasutaja")});
        }

        generateKey(email, password, function(err, key){
            if(err){
                return callback(err);
            }

            if(password){
                user.pass = key;
            }

            Object.keys(data).forEach(function(key){
                user[key] = data[key];
            });

            db.save("user", user, function(err, status){
                if(err){
                    return callback(err);
                }
                return callback(null, user);
            });
        });
    });
}

function initializeResetPassword(email, callback){
    email = (email || "").toString().toLowerCase().trim();

    if(!email){
        return callback(null, false, {message: util.format("Vigane e-posti aadress")});
    }

    loadUserData(email, function(err, user){
        if(err){
            return callback(err);
        }

        if(!user){
            return callback(null, true);
        }

        user.resetToken = crypto.randomBytes(20).toString("hex");
        user.resetExpires = new Date(Date.now() + 3600 * 1000 * 24);

        db.save("user", user, function(err, status){
            if(err){
                return callback(err);
            }

            mail.sendResetLink(user, user.resetToken);

            return callback(null, true);
        });

    });
}

function resetPassword(email, resetToken, callback){
    email = (email || "").toString().toLowerCase().trim();
    resetToken = (resetToken || "").toString().trim();

    if(!email){
        return callback(null, false, {message: util.format("Vigane e-posti aadress")});
    }

    loadUserData(email, function(err, user){
        if(err){
            return callback(err);
        }

        if(!user){
            return callback(null, false, {message: util.format("Vigane e-posti aadress")});
        }

        if(!user.resetToken || resetToken != user.resetToken){
            return callback(null, false, {message: util.format("Vigane parooli genereerimise kood")});
        }

        if(!user.resetExpires || user.resetExpires < new Date()){
            return callback(null, false, {message: util.format("Parooli genereerimise kood on aegunud, alusta protsessi uuesti")});
        }

        var password = crypto.randomBytes(4).toString("hex");

        generateKey(email, password, function(err, key){
            if(err){
                return callback(err);
            }

            user.pass = key;
            user.resetToken = false;
            user.resetExpires = false;

            db.save("user", user, function(err, status){
                if(err){
                    return callback(err);
                }

                mail.sendPassword(user, password);

                return callback(null, true);
            });

        });
    });
}

function generateKey(email, password, callback){
    crypto.pbkdf2(password, email, 40000, 24, function(err, key){
        if(err){
            return done(err);
        }

        key = new Buffer((key || "").toString("binary"), "binary").toString("hex");
        return callback(null, key);
    });
}

function validateCredential(type, credential, email){
    if(!credential){
        return util.format("%s on määramata", type);
    }

    if(typeof credential != "string"){
        return util.format("%s vigane andmetüüp", type);
    }

    if(credential.length > 64){
        return util.format("%s väärtus on pikem kui 64 sümbolit", type);
    }

    if(email && !validateEmail(credential)){
        return util.format("Vigane e-posti aadress", type);;
    }
    return false;
}

function validateEmail(email){
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
