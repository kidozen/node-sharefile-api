/*
* Module's dependencies
*/
var request     = require("request");
var Cache       = require("mem-cache");
var uuid        = require("node-uuid");


/**
 * ShareFile class
 * Handles invocations to ShareFiles's methods.
 * @param settings {object} required
 *  -   timeout:    {number} optional session timeout. default 15 minutes in milleseconds  
 *  -   domain:     {string} optional property to define the domain. Default: "sharefile.com"
 *  -   subdomain:  {string} required property 
 *  -   authid:     {string} optional authid that will be used for all subsequent API calls. Default: null 
 * @returns {ShareFile}
 * @api public
 */
var ShareFile = function(settings) {

    settings = settings || {};
    if (typeof(settings)!=="object") throw new Error("'settings' argument must be an object instance.");
    if (settings.timeout!==undefined && typeof(settings.timeout)!=="number")     throw new Error("'settings.timeout' property must be a number.");
    if (settings.refresh!==undefined && typeof(settings.refresh)!=="number")     throw new Error("'settings.refresh' property must be a number.");
    if (settings.domain!==undefined  && typeof(settings.domain)!=="string")      throw new Error("'settings.domain' property must be an string.");
    if (!(settings.subdomain) || typeof(settings.subdomain)!=="string")   throw new Error("'settings.subdomain' property is missing or invalid.");

    /*
    * Settings used by the instance.
    */
    this.settings = settings;
    this.settings.domain  = settings.domain  || "sharefile.com";    // default domain
    this.settings.timeout = settings.timeout || 15 * 60 * 1000;     // default sessions timeout of 15 minutes in ms   
    this.settings.refresh = settings.refresh || 15 * 60 * 60 * 1000 // default 15hs

    var self        = this;  // keeps a self reference
    var cacheAuth   = new Cache(this.settings.timeout);   // Cache by auth tokens 
    var cacheUser   = new Cache(this.settings.timeout);   // Cache by auth tokens 

    /*
    * Authenticates an user and returns the 'auth' token.
    * @param options {object} optional, 'options' could have two properties:
    *   - username:  {string}  
    *   - password:  {string}
    * @param cb {function} required callback function
    * @api public
    */
    this.authenticate = function(options, cb) {
        cb = cb || defaultCb;
        options = options || {};
        if (typeof options !== 'object') return cb(new Error("'options' argument is missing or invalid."));

        // Validates username and password 
        options.username = options.username || self.settings.username;
        options.password = options.password || self.settings.password;

        if (!(options.username)) return cb( new Error("'options.username' property is required."));
        if (!(options.password)) return cb( new Error("'options.password' property is required."));

        var now = new Date().getTime();
        var auth = cacheUser.get(options.username);
        if (auth) {
            var item = cacheAuth.get(auth);
            if (item && item.password === options.password && item.expiresOn > now) return cb(null, auth);
        }

        options.op = "login";

        send("getAuthID", options, function (err, result) {

            if (err) {
                // cleans caches
                if (auth) {
                    cacheAuth.remove(auth);
                    cacheUser.remove(options.username)
                }
                return cb(err);
            }
            
            // reuse auth by username
            auth = auth || uuid.v4();

            // creates cache item
            var item = {
                user        : result,
                expiresOn   : new Date().getTime() + self.settings.refresh,
                username    : options.username,
                password    : options.password
            };

            // Updates cache
            cacheAuth.set(auth, item);
            cacheUser.set(options.username, auth);
            
            // returns token
            cb(null, auth);
        });
    };

    // back compatibility
    this.getAuthID = function(options, cb) {
        self.authenticate(options, cb)
    };

    /*
    * Executes methods on a folder entity.
    * @param options {object} required:
    *   - op    : {string} optional parameter to tell what operation to perform. Default: "list"
    *   - auth  : {string} is requered if no username and password were specified on constructor 
    *   You must also add to 'options' parameter, all properties required by the specified operation.
    *   A list of valid operations and their parameters can be found at: http://api.sharefile.com/https.aspx#folder
    * @param cb {function} required callback function
    * @api public
    *
    * @sample: To retrieve the content of folder /foo you should do:
    * 
    * folder({ op:"list", path:"/foo"}, function(err, result){
    *   ...
    * });
    */
    this.folder = function(options, cb) {
        cb = cb || defaultCb;
        if (!options || typeof options !== 'object')    return cb(new Error("'options' argument is missing or invalid."));
        if (!(options.id || options.path))              return cb(new Error("'options.id' or 'options.path' properties are required."));

        options.op = options.op || "list";

        authSend("folder", options, cb);
    };


    /*
    * Executes methods on a file entity.
    * @param options {object} required:
    *   - op    : {string} required parameter to tell what operation to perform.
    *   - auth  : {string} is requered if no username and password were specified on constructor 
    *   You must also add to 'options' parameter, all properties required by the specified operation.
    *   A list of valid operations and their parameters can be found at: http://api.sharefile.com/https.aspx#file
    * @param cb {function} required callback function
    * @api public
    *
    * @sample: To generate an URL to which a file can be uploaded, you should do:
    * 
    * file({ op: "upload", filename: "/foo.bar"}, function(err, result){
    *   ...
    * });
    */
    this.file = function(options, cb) {
        cb = cb || defaultCb;
        if (!options || typeof options !== 'object')            return cb(new Error("'options' argument is missing or invalid."));
        if (!(options.op) || typeof(options.op) !== 'string')   return cb(new Error("'options.op' property is missing or invalid."));

        authSend("file", options, cb);
    };


    /*
    * Executes methods on a user entity.
    * @param options {object} required:
    *   - op    : {string} required parameter to tell what operation to perform.
    *   - auth  : {string} is requered if no username and password were specified on constructor 
    *   You must also add to 'options' parameter, all properties required by the specified operation.
    *   A list of valid operations and their parameters can be found at: http://api.sharefile.com/https.aspx#users
    * @param cb {function} required callback function
    * @api public
    *
    * @sample: To return an address book for the current user, you should do:
    * 
    * users({ op: "getaddressbook" function(err, result){
    *   ...
    * });
    */
    this.users = function(options, cb) {
        cb = cb || defaultCb;
        if (!options || typeof options !== 'object')            return cb(new Error("'options' argument is missing or invalid."));
        if (!(options.op) || typeof(options.op) !== 'string')   return cb(new Error("'options.op' property is missing or invalid."));

        authSend("users", options, cb);
    };


    /*
    * Executes methods on a user group.
    * @param options {object} required:
    *   - op    : {string} required parameter to tell what operation to perform.
    *   - auth  : {string} is requered if no username and password were specified on constructor 
    *   You must also add to 'options' parameter, all properties required by the specified operation.
    *   A list of valid operations and their parameters can be found at: http://api.sharefile.com/https.aspx#group
    * @param cb {function} required callback function
    * @api public
    *
    * @sample: To get a list of all distribution groups, you should do:
    * 
    * group({ op: "list" }, function(err, result){
    *   ...
    * });
    */
    this.group = function(options, cb) {
        cb = cb || defaultCb;
        if (!options || typeof options !== 'object')            return cb(new Error("'options' argument is missing or invalid."));
        if (!(options.op) || typeof(options.op) !== 'string')   return cb(new Error("'options.op' property is missing or invalid."));

        authSend("group", options, cb);
    };


    /*
    * Executes methods on a user group.
    * @param options {object} required:
    *   - query : {string} required parameter.
    *   - auth  : {string} is requered if no username and password were specified on constructor 
    * @param cb {function} required callback function
    * @api public
    *
    * @sample: To execute a query, you should do:
    * 
    * search({ query: "*" }, function(err, result){
    *   ...
    * });
    */
    this.search = function(options, cb) {
        cb = cb || defaultCb;
        if (!options || typeof options !== 'object') return cb(new Error("'options' argument is missing or invalid."));

        options.op = "search";

        authSend("search", options, cb);
    };


    /*
    * Default callback function, it only throws an exception if an error was received.
    */
    var defaultCb = function(err) {
        if(err) throw err;
    };


    /*
    * Does an HTTP request agains sharefile servers.
    * @param method {string} required. Name of the method to be executed. http://api.sharefile.com/https.aspx#methods
    * @param options {object} required. Method parameters. http://api.sharefile.com/https.aspx#req 
    * @param cb {function} required callback function
    * @api private
    */
    var send = function(method, options, cb) {

        options.fmt = "json";

        var reqOptions = {
            method  : "GET",
            url     : "https://" + self.settings.subdomain + "." + self.settings.domain + "/rest/" + method + ".aspx",
            qs      : options
        };

        request(reqOptions, function (err, response) {

            if (err) return cb(err);

            var body = JSON.parse(response.body);
            if (body.error) {
                err = new Error(body.errorMessage);
                err.code = body.errorCode;
                return cb (err);
            }

            cb (null, body.value);
        });
    };


    var authSend = function(method, options, cb) {

        // If not 'auth' property, then tries to authenticate the user
        options.auth = options.auth || options.authid; // back compatibility

        if (!options.auth) {

            self.authenticate({ username: options.username, password: options.password }, function (err, auth) {
                if (err) return cb(err);

                // tries again
                options.auth = auth;
                authSend(method, options, cb);
            });

        } else {

            // gets cached authorization data
            var item = cacheAuth.get(options.auth);
            if (!item) return cb (new Error("Invalid 'auth' property."));

            // is the authId expired
            if (new Date().getTime() > item.expiresOn) {
            
                // renews authId
                self.authenticate({ username: item.username, password: item.password }, function (err, auth) {
                    if (err) return cb(err);
                    if (options.auth !== auth) return cb(new Error("Could't refresh the authId."));

                    // tries again
                    authSend(method, options, cb);
                });

            } else {

                var sendOptions = {
                    authid: item.user.authid
                };

                Object.keys(options)
                    .filter(function (p) { return [ "auth", "authid", "username", "password" ].indexOf(p) === -1; })
                    .map(function (p) { sendOptions[p] = options[p]; });

                // Invokes podio's method
                send(method, sendOptions, cb);                
            } 
        }
    };

};

// Exports ShareFile class 
module.exports = ShareFile;
