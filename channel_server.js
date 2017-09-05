var fs = require("fs");
var http = require("http");
var https = require("https");
var path = require("path");

var sessions = {};
var usersInSessionLimit = 10;

var port = process.env.PORT || 8081;
var httpsPort = process.env.HTTPS_PORT || 8443;
var httpsKeyPath = process.env.HTTPS_KEY || '';
var httpsCertPath = process.env.HTTPS_CERT || '';
var httpsCACertPath = process.env.HTTPS_CA_CERT || '';

if (process.argv.length >= 3) {
    port = process.argv[2];
}
if (process.argv.length >= 6) {
    httpsPort = process.argv[3];
    httpsKeyPath = process.argv[4];
    httpsCertPath = process.argv[5];
    if (process.argv.length >= 7) {
        httpsCACertPath = process.argv[6];
    }
}

var serverDir = path.dirname(__filename)//当前文件目录名
var clientDir = path.join(serverDir, "client/");//路径拼接

var contentTypeMap = {
    ".html": "text/html;charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css"
};

/*
app.get('/er', function(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.write("data: now Date :" + new Date()+"\r\n\r\n");
    res.end();
});
*/

function requestListener(request, response) {
    var headers = {
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
        "Expires": "0"
    };
    /*router.get(request.url, function(req, res) {
        res.setHeader("Content-Type", "text/event-stream");
        res.write("data: now Date :" + new Date()+"\r\n\r\n");
        res.end();
    });*/

    console.log('request.url -> ' + request.url);
    var parts = request.url.split("/");

    // handle "client to server" and "server to client"
    if (parts[1] == "ctos" || parts[1] == "stoc") {
        var sessionId = parts[2];
        var userId = parts[3];
        if (!sessionId || !userId) {
            response.writeHead(400);
            response.write("data: now Data:"+new Date()+"\r\n\r\n");
            response.end();
            return;
        }

        if (parts[1] == "stoc") {
            console.log('---- stoc ----1111111111111');
            console.log("@" + sessionId + " - " + userId + " joined.");

            headers["Content-Type"] = "text/event-stream";
            headers["Access-Control-Allow-Origin"]="app://webrtc-demo.gaiamobile.org";//"app://53075346-5bbf-4e83-a98b-5f8a887e18fb"
            headers["Access-Control-Allow-Credentials"]= "true";
            headers["Access-Control-Expose-Headers"]="event";
            response.writeHead(200, headers);

            function keepAlive(resp) {
                resp.write(":\n");
                resp.keepAliveTimer = setTimeout(arguments.callee, 20000, resp);
            }
            keepAlive(response);  // flush headers + keep-alive

            var session = sessions[sessionId];
            if (!session)
                session = sessions[sessionId] = {"users" : {}};

            if (Object.keys(session.users).length > usersInSessionLimit - 1) {
                console.log("user limit for session reached (" + usersInSessionLimit + ")");
                response.write("event:busy\ndata:" + sessionId + "\n\n");
                clearTimeout(response.keepAliveTimer);
                response.end();
                return;
            }

            var user = session.users[userId];
            if (!user) {
                console.log('user not exist! 0');
                user = session.users[userId] = {};
                for (var pname in session.users) {
                    var esResp = session.users[pname].esResponse;
                    if (esResp) {
                        console.log('user not exist 1！');
                        clearTimeout(esResp.keepAliveTimer);
                        keepAlive(esResp);
                        console.log('userId -> ' + userId + ' pname -> ' + pname);
                        esResp.write("event:join\ndata:" + userId + "\n\n");
                        response.write("event:join\ndata:" + pname + "\n\n");
                    }
                }
            }
            else if (user.esResponse) {
                console.log('user exist! 0');
                user.esResponse.end();
                clearTimeout(user.esResponse.keepAliveTimer);
                user.esResponse = null;
            }
            user.esResponse = response;

            request.on("close", function () {
                for (var pname in session.users) {
                    if (pname == userId)
                        continue;
                    var esResp = session.users[pname].esResponse;
                    esResp.write("event:leave\ndata:" + userId + "\n\n");
                }
                delete session.users[userId];
                clearTimeout(response.keepAliveTimer);
                console.log("@" + sessionId + " - " + userId + " left.");
                for(var pname in session.users){
                    if (pname != userId){
                        console.log("users in session " + sessionId + ": " + Object.keys(session.users).length+": "+session.users[pname]);
                    }
                }

            });

        } else { // parts[1] == "ctos"
            console.log('---- ctos ----222222222');
            var peerId = parts[4];
            var peer;
            var session = sessions[sessionId];
            if (!session || !(peer = session.users[peerId])) {
                response.writeHead(400, headers);
                response.end();
                return;
            }

            var body = "";
            request.on("data", function (data) { body += data; });
            request.on("end", function () {
                console.log("@" + sessionId + " - " + userId + " => " + peerId + " :");
                // console.log(body);
                var evtdata = "data:" + body.replace(/\n/g, "\ndata:") + "\n";
                peer.esResponse.write("event:user-" + userId + "\n" + evtdata + "\n");
            });

            // to avoid "no element found" warning in Firefox (bug 521301)
            headers["Content-Type"] = "text/plain";
            response.writeHead(204, headers);
            response.end();
        }

        return;
    }

    var url = request.url.split("?", 1)[0];
    var filePath = path.join(clientDir, url);
    if (filePath.indexOf(clientDir) != 0 || filePath == clientDir)
        filePath = path.join(clientDir, "/webrtc_example.html");

    fs.stat(filePath, function (err, stats) {
        if (err || !stats.isFile()) {
            response.writeHead(404);
            response.end("404 Not found");
            return;
        }

        var contentType = contentTypeMap[path.extname(filePath)] || "text/plain";
        response.writeHead(200, { "Content-Type": contentType });

        var readStream = fs.createReadStream(filePath);
        readStream.on("error", function () {
            response.writeHead(500);
            response.end("500 Server error");
        });
        readStream.pipe(response);
    });
};

console.log('The HTTP server is listening on port ' + port);
http.createServer(requestListener).listen(port);
//var server = http.createServer(app);
//server.listen(port);

if (httpsKeyPath && httpsCertPath) {
    var options = {
        key: fs.readFileSync(httpsKeyPath),
        cert: fs.readFileSync(httpsCertPath)
    };
    if (httpsCACertPath) {
        options.ca = fs.readFileSync(httpsCACertPath)
    }

    console.log('The HTTPS server is listening on port ' + httpsPort);
    https.createServer(options, requestListener).listen(httpsPort);
}
