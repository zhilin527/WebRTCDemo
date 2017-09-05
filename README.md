## 开启服务
项目采用node.js，开启服务方式：
开启服务之前要npm install安装依赖包

```
node channel_server.js
```
服务器默认监听端口是 8080. 
The port to use can be changed by setting the environment variable PORT or giving the port as an argument to the node command. If both the environment variable and the argument are given then the argument is used.

更改端口：
```
PORT=9080 node channel_server.js
node channel_server.js 10080
```

## 本地测试
The simple WebRTC app is now running at [http://localhost:8080/](http://localhost:8080/)

##根据索爱公司的EricssonResearch项目的源码进行改编的WebRTC应用

![Demo app](https://github.com/EricssonResearch/openwebrtc-browser-extensions/blob/master/imgs/demoapp.png)

## Live testing
We are keeping an up-to-date version of this app available at [http://demo.openwebrtc.org](http://demo.openwebrtc.org)
