var assert  = require("assert");
var API     = require("../index.js");
var nock    = require("nock");

describe("sharefile API", function () {

    beforeEach( function (done) {
        nock.cleanAll();
        done();
    });

    it("should throw when invalid settings", function ( done ) {
        try {
            new API("foo");
            done(new Error('should have thrown'));
        } catch(e) {
            assert.ok(e);
            assert.ok(e.message.indexOf("'settings'") > -1);
            done();
        }
    });

    it("should throw when no subdomain", function ( done ) {
        try {
            new API();
            done(new Error('should have thrown'));
        } catch(e) {
            assert.ok(e);
            assert.ok(e.message.indexOf("settings.subdomain") > -1);
            done();
        }
    });

    it("should throw when invalid timeout", function ( done ) {
        try {
            new API({timeout: "foo"});
            done(new Error('should have thrown'));
        } catch(e) {
            assert.ok(e);
            assert.ok(e.message.indexOf("settings.timeout") > -1);
            done();
        }
    });

    it("should throw when invalid timeout", function ( done ) {
        try {
            new API({refresh: "foo"});
            done(new Error('should have thrown'));
        } catch(e) {
            assert.ok(e);
            assert.ok(e.message.indexOf("settings.refresh") > -1);
            done();
        }
    });

    it("should throw when invalid domain", function ( done ) {
        try {
            new API({domain: 0});
            done(new Error('should have thrown'));
        } catch(e) {
            assert.ok(e);
            assert.ok(e.message.indexOf("settings.domain") > -1);
            done();
        }
    });

    it("should be able to create an instance", function ( done ) {
        var api = new API({ subdomain:"foo", domain:"bar", timeout: 1234, refresh: 5678 });
        assert.ok(api);
        assert.equal("bar", api.settings.domain);
        assert.equal("foo", api.settings.subdomain);
        assert.equal(1234, api.settings.timeout);
        assert.equal(5678, api.settings.refresh);
        done();
    });

    it("should be able to create an instance and set defaults", function ( done ) {
        var api = new API({ subdomain:"kidozen" });
        assert.ok(api);
        assert.equal("sharefile.com", api.settings.domain);
        assert.equal("kidozen", api.settings.subdomain);
        assert.equal(15*60*1000, api.settings.timeout);
        assert.equal(15*60*60*1000, api.settings.refresh);
        done();
    });

    describe ("authenticate", function () {

        it("should use credentials from initialization", function ( done ) {
            nock("https://foo.sharefile.com")
                .get("/rest/getAuthID.aspx?username=bar&password=baz&op=login&fmt=json")
                .reply(200, { error: false, value: "xyz" });

            var api = new API({ 
                subdomain   : "foo",
                username    : "bar",
                password    : "baz"
             });

            api.authenticate({}, function(err, result){
                assert.ok(!err);
                assert.equal('string', typeof result);
                assert.equal(36, result.length);
                done();
            });
        });

        it("should authenticate an user", function ( done ) {
            nock("https://foo.sharefile.com")
                .get("/rest/getAuthID.aspx?username=bar&password=baz&op=login&fmt=json")
                .reply(200, { error: false, value: "xyz" });

            var api = new API({ subdomain:"foo" });
            var options = {
                username    : "bar",
                password    : "baz"
            };

            api.authenticate(options, function(err, result){
                assert.ok(!err);
                assert.equal('string', typeof result);
                assert.equal(36, result.length);
                done();
            });
        });


        it("should authenticate an user using cache", function ( done ) {
            nock("https://foo.sharefile.com")
                .get("/rest/getAuthID.aspx?username=bar&password=baz&op=login&fmt=json")
                .reply(200, { error: false, value: "xyz" });

            var api = new API({ subdomain:"foo" });
            var options = {
                username    : "bar",
                password    : "baz"
            };

            api.authenticate(options, function(err, auth){
                assert.ok(!err);
                assert.equal('string', typeof auth);
                assert.equal(36, auth.length);

                // authenticating again with the same user/password will not send a request
                nock.cleanAll()

                api.authenticate(options, function(err, auth2){
                    assert.ok(!err);
                    assert.equal(auth, auth2);
                    done();
                });
            });
        });


        it("should refresh authid token", function ( done ) {
            var refreshTimespan = 100;

            // authentication request
            nock("https://foo.sharefile.com")
                .get("/rest/getAuthID.aspx?username=bar&password=baz&op=login&fmt=json")
                .reply(200, { error: false, value: "xyz" });

            // first request before token was refreshed
            nock("https://foo.sharefile.com")
                .get("/rest/folder.aspx?authid=xyz&path=%2Falfa&op=list&fmt=json")
                .reply(200, { error: false, value: "ok" });

            // refreshs token
            nock("https://foo.sharefile.com")
                .get("/rest/getAuthID.aspx?username=bar&password=baz&op=login&fmt=json")
                .reply(200, { error: false, value: "pqr" });

            // second request after token was refreshed
            nock("https://foo.sharefile.com")
                .get("/rest/folder.aspx?authid=pqr&path=%2Fbeta&op=list&fmt=json")
                .reply(200, { error: false, value: "ok" });

            var api = new API({ subdomain:"foo", refresh: 100 });
            var options = {
                username    : "bar",
                password    : "baz"
            };

            api.authenticate(options, function(err, auth){
                assert.ok(!err);
                assert.equal('string', typeof auth);
                assert.equal(36, auth.length);

                api.folder({ auth: auth , path: "/alfa" }, function (err, result) {
                    assert.ok(!err);
                    assert.equal("ok", result);
                });

                // second request afer token got expired
                setTimeout( function() {
                    api.folder({ auth: auth , path: "/beta" }, function (err, result) {
                        assert.ok(!err);
                        assert.equal("ok", result);
                        done();
                    })
                }, refreshTimespan);
            });
        });
    });

    describe("operations that requires authentication:", function() {

        var api, auth;

        before(function ( done ) {

            nock("https://foo.sharefile.com")
                .get("/rest/getAuthID.aspx?username=bar&password=baz&op=login&fmt=json")
                .reply(200, { error: false, value: "xyz" });

            api = new API({ subdomain:"foo" });

            var options = {
                username: "bar",
                password: "baz"
            };
            
            api.authenticate(options, function (err, result) {
                assert.ok(!err);
                assert.equal('string', typeof result);
                assert.equal(36, result.length);
                auth = result;
                done();
            });
        });

        it("folder", function ( done ){
            nock("https://foo.sharefile.com")
                .get("/rest/folder.aspx?authid=xyz&path=%2F&op=list&fmt=json")
                .reply(200, { error: false, value: "ok" });

            api.folder({ auth: auth , path: "/" }, function (err, result) {
                assert.ok(!err);
                assert.equal("ok", result);
                done();
            });
        });

        it("file", function ( done ){
            nock("https://foo.sharefile.com")
                .get("/rest/file.aspx?authid=xyz&op=upload&filename=%2Falfa&fmt=json")
                .reply(200, { error: false, value: "ok" });

            api.file({ auth: auth , op: "upload", filename: "/alfa" }, function (err, result) {
                assert.ok(!err);
                assert.equal("ok", result);
                done();
            });
        });

        it("users", function ( done ){
            nock("https://foo.sharefile.com")
                .get("/rest/users.aspx?authid=xyz&op=getaddressbook&fmt=json")
                .reply(200, { error: false, value: "ok" });

            api.users({ auth: auth , op: "getaddressbook" }, function (err, result) {
                assert.ok(!err);
                assert.equal("ok", result);
                done();
            });
        });

        it("group", function ( done ){
            nock("https://foo.sharefile.com")
                .get("/rest/group.aspx?authid=xyz&op=list&fmt=json")
                .reply(200, { error: false, value: "ok" });

            api.group({ auth: auth , op: "list" }, function (err, result) {
                assert.ok(!err);
                assert.equal("ok", result);
                done();
            });
        });

        it("search", function ( done ){
            nock("https://foo.sharefile.com")
                .get("/rest/search.aspx?authid=xyz&query=*&op=search&fmt=json")
                .reply(200, { error: false, value: "ok" });

            api.search({ auth: auth , query: "*" }, function (err, result) {
                assert.ok(!err);
                assert.equal("ok", result);
                done();
            });
        });

        it("should fail if no credentials or auth prop were provided", function ( done ){
            api.folder({ op: "list", path: "/" }, function (err, result) {
                assert.ok(err);
                done();
            });
        });

        it("should use credentials if auth property wasn't provided", function ( done ){
            nock("https://foo.sharefile.com")
                .get("/rest/getAuthID.aspx?username=alfa&password=beta&op=login&fmt=json")
                .reply(200, { error: false, value: "pqr" });

            nock("https://foo.sharefile.com")
                .get("/rest/folder.aspx?authid=pqr&op=list&path=%2F&fmt=json")
                .reply(200, { error: false, value: "ok" });

            api.folder({ username: "alfa", password:"beta", op: "list", path: "/" }, function (err, result) {
                assert.ok(!err);
                assert.equal("ok", result);
                done();
            });
        });

    });
});
