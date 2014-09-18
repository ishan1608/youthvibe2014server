var nodeStatic = require('node-static');
var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var util = require('util');
var request = require('request');
var mongo = require('mongodb');

var staticServer = new(nodeStatic.Server)();

var port = Number(process.env.PORT || 8080);
// MongoHQ Server Url 'mongodb://ishanatmuz:m7382in@kahana.mongohq.com:10045/youthVibe2014';
var mongoUri = process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017/youthVibe2014';
var registrationKeys = [];
var message = 'Default Message', title = 'Default Title', senderId = 'Default ID';

http.createServer(function (req, res) {
    // Testing for public folder for static hosting
    // console.log(req.url+'\n');
    var parts = url.parse(req.url, true, true);
    // console.log(parts);
    // console.log(parts.path);
    var folder = parts.path.substring(0,8);
    // console.log(folder);
    if(folder == '/public/') {
        // console.log('Inside public folder for static hosting.');
        staticServer.serve(req, res);
    } else {
        // res.end('not inside public folder for my implementation');
        // console.log(parts.path);
        
        switch (parts.path) {
            case '/form':
                // Read the file and send it to the user
                fs.readFile('form.html', function(error, data) {
                    if(error) {
                        console.log('Error reading file :\n' + error);
                    } else {
                        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                        res.end(data);
                    }
                });
            break;
            case '/send':
                // start of my GCM Experiment
                // console.log('inside send :\n');
                // This only works for the get methods
                // console.log(url.parse(req.url, true).query);
                // Parse a form
                var form = new formidable.IncomingForm();

                form.parse(req, function(err, fields, files) {
                    var formData = util.inspect({fields: fields, files: files});
                    res.writeHead(200, {'content-type': 'text/plain'});
                    
                    // TODO: Authorization testing based on userid and password
                    
                    // res.write('Received form:\n\n');
                    // res.write('Fields :\nusername : ' + fields.username + '\npassword : ' + fields.password);
                    // res.write('\n\nRaw Form Data : \n' + formData);
                    // console.log(fields);
                    if(fields.username === 'ishanatmuz' && fields.password === 'm7382in') {
                        senderId = fields.username;
                        title = fields.title;
                        message = fields.message;
                        
                        // MongoDB database connection here
                        var MongoClient = mongo.MongoClient;

                        // Connect to the db
                        MongoClient.connect(mongoUri, function(err, db) {
                          if(!err) {
                              console.log("Connected to database");
                              var collection = db.collection('userIds');
                              collection.find().toArray(function(err, items) {
                                  if(!err) {
                                      // res.write('List of users :\n\n');
                                      for(var i=0; i<items.length; i++) {
                                          // Creating an array of registration Ids
                                          registrationKeys[i] = items[i].id;
                                      }
                                      // Have to pass the title, message
                                      fireGCM();
                                      // res.end('\nThe database is hosted on ' + mongoUri);
                                      // db.close();
                                  } else {
                                      console.log('Error retreiving the data');
                                      res.end('Error retreiving the data');
                                  }
                              });
                              // Storing the sent Messages in the database the title, message and sender's id
                              var collection = db.collection('notifications');
                              collection.insert({'title': title, 'message': message, 'sender': senderId }, {safe: true}, function(err, rs) {
                                  if(!err) {
                                      // res.write("\nMessage stored successfully :\n" + rs);
                                      res.write('\n\tMessage sent successfully :\n\n\tTitle : ' + title + '\n\tMessage : ' + message + '\n\tSender : ' + senderId);
                                  } else {
                                      res.write('Error in updating the message in database. No History maintained.');
                                  }
                              });

                          } else {
                              console.log('Error connecting to database');
                              res.end('Error connecting to database\nPlease contact the adiministrators.');
                          }
                        });

                        var fireGCM = function() {
                            // Start of my GCM experiment
                            var data = {
                                "collapseKey": "applice",
                                "delayWhileIdle": true,
                                "timeToLive": 3,
                                "data":{
                                    "message": message,
                                    "title": title
                                },
                                "registration_ids": registrationKeys
                                };

                                var dataString =  JSON.stringify(data);
                                var headers = {
                                    'Authorization' : 'key=AIzaSyBlii4ipb-Xzdybvg1DhdNcZ8oaU9-JfIk',
                                    'Content-Type' : 'application/json',
                                    'Content-Length' : dataString.length
                                };

                                var options = {
                                    host: 'android.googleapis.com',
                                    // host: 'requestb.in',
                                    port: 80,
                                    path: '/gcm/send',
                                    // path: '/11qa0tm1',
                                    method: 'POST',
                                    headers: headers
                                };

                                //Setup the request 
                                var GCMreq = http.request(options, function(GCMres) {
                                    GCMres.setEncoding('utf-8');

                                    var responseString = '';

                                    GCMres.on('data', function(data) {
                                        // console.log('response data event');
                                        responseString += data;
                                    });

                                    GCMres.on('end', function() {
                                        // console.log('response end event');
                                        // var resultObject = JSON.parse(responseString);
                                        // print(responseString);
                                        console.log(util.inspect({response : responseString}));
                                        // console.log(resultObject);

                                        // Since we are writing to reponse from here. We have to end the response from here too
                                        res.write('\n\nGCM Data : \n' + util.inspect({response : responseString}));
                                        res.end();
                                    });
                                    console.log('STATUS: ' + GCMres.statusCode);
                                    console.log('HEADERS: ' + JSON.stringify(GCMres.headers));
                                });

                                GCMreq.on('error', function(e) {
                                    // TODO: handle error.
                                    console.log('error : ' + e.message + e.code);
                                });

                                GCMreq.write(dataString);
                                GCMreq.end();

                            // End of my GCM Experiment
                        }
                    } else {
                        res.end('\n\n\t\tYou are not authorized to send notifications.\nIf you think this is a mistake, or you want to request for permission; please contact the administrators.');
                    }
                });
            break;
            case '/register':
                var form = new formidable.IncomingForm();
                form.parse(req, function(err, fields, files) {
                    res.writeHead(200, {'content-type': 'text/plain'});
                    if(fields.RegistrationID === undefined) {
                        res.end('Oops Something went wrong. There was no registration ID detected for your device.\nPlease contact the administrators.');
                    } else {
                        // MongoDB server connection to store IDs
                        mongo.Db.connect(mongoUri, function (err, db) {
                            db.collection('userIds', function(err, collection) {
                              collection.insert({'id': fields.RegistrationID, 'facebookId': fields.FacebookID, 'name': fields.Name, 'email': fields.Email}, {safe: true}, function(err, rs) {
                                if(err) {
                                  res.end("\nUser Registration Failed.\n" + err);
                                } else if(rs) {
                                  res.end("\nUser Registered successfully :\nRegistration ID : " + fields.RegistrationID + "\n\nResult : \n" + rs);
                                }
                              });
                            });
                          });
                    }
                });
            break;
            case '/users':
                res.writeHead(200, {'content-type': 'text/plain'});
                // MongoDB server connection to store IDs
                // res.write('attempting connection\n');
                
                // Retrieve
                var MongoClient = mongo.MongoClient;

                // Connect to the db
                MongoClient.connect(mongoUri, function(err, db) {
                  if(!err) {
                      console.log("Connected to database");
                      var collection = db.collection('userIds');
                      collection.find().toArray(function(err, items) {
                          if(!err) {
                              res.write('List of users :\n\n');
                              for(var i=0; i<items.length; i++) {
                                  res.write('\n ' + i + ' :');
                                  res.write('\n     Name        : ' + items[i].name);
                                  res.write('\n     Email       : ' + items[i].email);
                                  res.write('\n     GCM ID      : ' + items[i].id);
                                  res.write('\n     Facebook ID : ' + items[i].facebookID);
                              }
                              res.end('\nThe database is hosted on https://www.compose.io');
                              db.close();
                          } else {
                              console.log('Error retreiving the data');
                              res.end('Error retreiving the data');
                          }
                      });
                      
                  } else {
                      console.log('Error connecting to database');
                      res.end('Error connecting to database\nPlease contact the adiministrators.');
                  }
                });
            break;
            // GCM tets cases
            case '/gcmform':
                // Read the file and send it to the user
                fs.readFile('gcmform.html', function(error, data) {
                    if(error) {
                        console.log('Error reading file :\n' + error);
                    } else {
                        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                        res.end(data);
                    }
                });
            break;
            case '/gcmsend':
                // start of my GCM Experiment
                // console.log('inside send :\n');
                // This only works for the get methods
                // console.log(url.parse(req.url, true).query);
                // Parse a form
                var form = new formidable.IncomingForm();

                form.parse(req, function(err, fields, files) {
                    var formData = util.inspect({fields: fields, files: files});
                    res.writeHead(200, {'content-type': 'text/plain'});
                    
                    // TODO: Authorization testing based on userid and password
                    
                    // res.write('Received form:\n\n');
                    // res.write('Fields :\nusername : ' + fields.username + '\npassword : ' + fields.password);
                    // res.write('\n\nRaw Form Data : \n' + formData);
                    // console.log(fields);
                    if(fields.username === 'ishanatmuz' && fields.password === 'm7382in') {
                        senderId = fields.username;
                        title = fields.title;
                        message = fields.message;
                        
                        // MongoDB database connection here
                        var MongoClient = mongo.MongoClient;

                        // Connect to the db
                        MongoClient.connect(mongoUri, function(err, db) {
                          if(!err) {
                              console.log("Connected to database");
                              var collection = db.collection('gcmIds');
                              collection.find().toArray(function(err, items) {
                                  if(!err) {
                                      // res.write('List of users :\n\n');
                                      for(var i=0; i<items.length; i++) {
                                          // Creating an array of registration Ids
                                          registrationKeys[i] = items[i].id;
                                      }
                                      // Have to pass the title, message
                                      fireGCM();
                                      // res.end('\nThe database is hosted on ' + mongoUri);
                                      // db.close();
                                  } else {
                                      console.log('Error retreiving the gcmIds');
                                      res.end('Error retreiving the gcmIds');
                                  }
                              });
                              // Storing the sent Messages in the database the title, message and sender's id
                              var collection = db.collection('gcmnotifications');
                              collection.insert({'title': title, 'message': message, 'sender': senderId }, {safe: true}, function(err, rs) {
                                  if(!err) {
                                      // res.write("\nMessage stored successfully :\n" + rs);
                                      res.write('\n\tMessage sent successfully :\n\n\tTitle : ' + title + '\n\tMessage : ' + message + '\n\tSender : ' + senderId);
                                  } else {
                                      res.write('Error in updating the message in database. No History maintained.');
                                  }
                              });

                          } else {
                              console.log('Error connecting to database');
                              res.end('Error connecting to database\nPlease contact the adiministrators.');
                          }
                        });

                        var fireGCM = function() {
                            // Start of my GCM experiment
                            var data = {
                                "collapseKey": "applice",
                                "delayWhileIdle": true,
                                "timeToLive": 3,
                                "data":{
                                    "message": message,
                                    "title": title
                                },
                                "registration_ids": registrationKeys
                                };

                                var dataString =  JSON.stringify(data);
                                var headers = {
                                    'Authorization' : 'key=AIzaSyBlii4ipb-Xzdybvg1DhdNcZ8oaU9-JfIk',
                                    'Content-Type' : 'application/json',
                                    'Content-Length' : dataString.length
                                };

                                var options = {
                                    host: 'android.googleapis.com',
                                    // host: 'requestb.in',
                                    port: 80,
                                    path: '/gcm/send',
                                    // path: '/11qa0tm1',
                                    method: 'POST',
                                    headers: headers
                                };

                                //Setup the request 
                                var GCMreq = http.request(options, function(GCMres) {
                                    GCMres.setEncoding('utf-8');

                                    var responseString = '';

                                    GCMres.on('data', function(data) {
                                        // console.log('response data event');
                                        responseString += data;
                                    });

                                    GCMres.on('end', function() {
                                        // console.log('response end event');
                                        // var resultObject = JSON.parse(responseString);
                                        // print(responseString);
                                        console.log(util.inspect({response : responseString}));
                                        // console.log(resultObject);

                                        // Since we are writing to reponse from here. We have to end the response from here too
                                        res.write('\n\nGCM Data : \n' + util.inspect({response : responseString}));
                                        res.end();
                                    });
                                    console.log('STATUS: ' + GCMres.statusCode);
                                    console.log('HEADERS: ' + JSON.stringify(GCMres.headers));
                                });

                                GCMreq.on('error', function(e) {
                                    // TODO: handle error.
                                    console.log('error : ' + e.message + e.code);
                                });

                                GCMreq.write(dataString);
                                GCMreq.end();

                            // End of my GCM Experiment
                        }
                    } else {
                        res.end('\n\n\t\tYou are not authorized to send notifications.\nIf you think this is a mistake, or you want to request for permission; please contact the administrators.');
                    }
                });
            break;
            case '/gcmregister':
                var form = new formidable.IncomingForm();
                form.parse(req, function(err, fields, files) {
                    res.writeHead(200, {'content-type': 'text/plain'});
                    if(fields.RegistrationID === undefined) {
                        res.end('Oops Something went wrong. There was no registration ID detected for your device.\nPlease contact the administrators.');
                    } else {
                        // MongoDB server connection to store IDs
                        mongo.Db.connect(mongoUri, function (err, db) {
                            db.collection('gcmIds', function(err, collection) {
                              collection.insert({'id': fields.RegistrationID}, {safe: true}, function(err, rs) {
                                if(err) {
                                  res.end("\nUser Registration Failed.\n" + err);
                                } else if(rs) {
                                  res.end("\nUser Registered successfully :\nRegistration ID : " + fields.RegistrationID + "\n\nResult : \n" + rs);
                                }
                              });
                            });
                          });
                    }
                });
            break;
            default:
                console.log("Sorry, we are out of " + parts.path + ".");
                res.writeHead(404, {'content-type': 'text/plain'});
                res.end("Sorry, we are out of " + parts.path + ".");
        }
    }
}).listen(port);

console.log("Started the server on port " + port);