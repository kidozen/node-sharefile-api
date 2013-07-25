# ShareFile client for Nodejs
This node module provides a set of methods to interact against ShareFile.com's REST services.
The module was created as part of [KidoZen](http://www.kidozen.com) project, as a connector for its Enterprise API feature.

## Installation

Use npm to install the module:

```
> npm install sharefile-api
```

## Runing tests

Use npm to run the set of tests

```
> npm test
```

## API

Due to the asynchronous nature of Nodejs, this module uses callbacks in requests. All callbacks have 2 arguments: `err` and `data`.

```
function callback (err, data) {
	// err contains an Error class instance, if any
	// data contains the resulting data
} 
``` 

### Constructor

The module exports a class and its constructor requires a configuration object with following properties
* `subdomain`: Required string.
* `domain`: Optional string. Default value is 'sharefile.com'
* `refresh`: Optional integer. ShareFile's authid timeout in milliseconds. Default 15 hours.
* `timeout` : Optional integer. Session timeout in milleseconds. Default 15 minutes.  
* `username`: Optional string. ShareFile's user name
* `password`: Optional string. User's password

```
var ShareFile = require("sharefile-api");
var sharefile = new ShareFile({ subdomain: "..." });
```

### Authentication
To invoke methods that require authentication, the developer can invoke them passing the user credentials (username & password) or the authentication token returned by the authenticate method.

#### authenticate(options, callback)
This method should be used to authenticate a user. A successed authentication will return an object instance containing the `auth` property. The value of this property is the authentication token that will be required by other methods.

**Parameters:**
* `options`: A required object instance containing authentication's parameters:
	* `username`: Required string.
	* `password`: Required string.
* `callback`: A required function for callback.

```
sharefile.authenticate({ username:"foo", password: "bar" }, function(err, result) {
	if (err) return console.error (err);
	console.log (result.auth);
});
```

### Methods
All public methods has the same signature, their have two arguments: `options` and `callback`.
* `options` must be an object instance containig all parameters for the method.
* `callback` must be a function.

This module has one method for each ShareFile's object types (folder, file, users, group and search). These methods require authentication, so the `options` argument should include the `auth` property or the properties `username` and `password`. Also, the property `op` is required in order to specify what action you want to perform on the object.

The methods could have a set of required and optional parameters, depending on the operation you want to perform. All required (except authid) and desired optional parameters should be passed to the methods as properties of the `object` argument.

#### folder(options, callback)
You can use this method to operate folder objects.

**Parameters:**
* `options`: A required object instance containing folder's parameters:
	* `auth`: Optional string.
	* `username`: Optional string.
	* `password`: Optional string.
	* `op`: Optional string. Default value 'list'.

	More required and optional parameters can be found [here](http://api.sharefile.com/https.aspx#folder).
	
* `callback`: A required function for callback.

```
// gets folder at root (default operation is 'list')
var options = {
	auth: "...",
	path: "/"
};

sharefile.folder(options, function (err, result) {
	if (err) return console.error(err);
	console.log(result);
});

// updates folder name
var options = {
	auth: "...",
	op: "edit",
	id: "foo",
	name: "new folder name"
};

sharefile.folder(options, function (err, result) {
	if (err) return console.error(err);
	console.log(result);
});
```


#### file(options, callback)
You can use this method to operate file objects.

**Parameters:**
* `options`: A required object instance containing file's parameters:
	* `auth`: Optional string.
	* `username`: Optional string.
	* `password`: Optional string.
	* `op`: Required string.

	More required and optional parameters can be found [here](http://api.sharefile.com/https.aspx#file).
	
* `callback`: A required function for callback.

```
// gets file's metadata
var options = {
	auth: "...",
	op: "get",
	id: "foo"
};

sharefile.file(options, function (err, result) {
	if (err) return console.error(err);
	console.log(result);
});

```


#### users(options, callback)
You can use this method to operate file objects.

**Parameters:**
* `options`: A required object instance containing user's parameters:
	* `auth`: Optional string.
	* `username`: Optional string.
	* `password`: Optional string.
	* `op`: Required string.

	More required and optional parameters can be found [here](http://api.sharefile.com/https.aspx#users).
	
* `callback`: A required function for callback.

```
// gets user's information
var options = {
	auth: "...",
	op: "get",
	id: "foo"
};

sharefile.users(options, function (err, result) {
	if (err) return console.error(err);
	console.log(result);
});

```


#### group(options, callback)
You can use this method to operate file objects.

**Parameters:**
* `options`: A required object instance containing group's parameters:
	* `auth`: Optional string.
	* `username`: Optional string.
	* `password`: Optional string.
	* `op`: Required string.

	More required and optional parameters can be found [here](http://api.sharefile.com/https.aspx#group).
	
* `callback`: A required function for callback.

```
// returns a list off all distribution groups
var options = {
	auth: "...",
	op: "list"
};

sharefile.group(options, function (err, result) {
	if (err) return console.error(err);
	console.log(result);
});

```

#### search(options, callback)
You can use this method to get a set of files and folders that match a criteria

**Parameters:**
* `options`: A required object instance containing group's parameters:
	* `auth`: Optional string.
	* `username`: Optional string.
	* `password`: Optional string.
	* `query`: Required string. Selection criteria.
	* `showpartial`: Optional boolean.

* `callback`: A required function for callback.

```
// returns a list off all ".txt" files at "foo" folder 
var options = {
	auth: "...",
	query: "/foo/*.txt"
};

sharefile.search(options, function (err, result) {
	if (err) return console.error(err);
	console.log(result);
});

```
