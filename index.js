var url = require('url');
var http = require('http');
var middlewareStatic = require('./middlewares/static.js');
var SxpressRouter = require('./router');

// 构造函数
function Sxpress() {
  this._port = 3000; // 存储服务端口
  this._static = ''; // 存储静态资源文件夹路径
  this._request = null; // 存储请求体
  this._response = null; // 存储响应体
  this._httpServer = null; // 存储http服务
  this._routerInstance = new SxpressRouter();  // 存储路由实例对象
  this._middlewareList = []; // 存储中间件函数
  this._middlewareIndex = 0;  // 存储中间件计数
}

// 初始化
Sxpress.prototype.init = function (req, res) {
  this._request = req;
  this._response = res;
  this._response.send = this.send;
};

// 创建http服务
Sxpress.prototype.createServer = function () {
  var self = this;

  this._httpServer = http.createServer((req, res) => {
    // 处理favicon.ico
    if (req.url === '/favicon.ico') {
      return res.end('');
    }

    // 初始化Sxpress
    self.init(req, res);
    self._routerInstance.init(self._request, self._response);

    // 重置中间件计数索引
    self._middlewareIndex = 0;

    // 运行中间件
    if (self._middlewareList.length) {
      self.next();
    }

    // 处理路由
    if (self._routerInstance && self._routerInstance._routerList.length) {
      var urlParse = url.parse(req.url);
      var pathname = urlParse.pathname;

      // 查找路由
      for (var i = 0; i < self._routerInstance._routerList.length; i++) {
        var router = self._routerInstance._routerList[i];

        if (router.method === req.method && router.path === pathname) {
          return router.handler(self._request, self._response);
        }
      }
    } else {
      res.end('sxpress');
    }
  });
};

// 处理下一步
Sxpress.prototype.next = function () {
  var self = this;

  if (this._response._ended) return false;

  var middleware = this._middlewareList[this._middlewareIndex++];

  if (middleware && typeof middleware === 'function') {
    middleware.call(this, this._request, this._response, function () {
      self.next.call(self);
    });
  }
};

// 静态资源
Sxpress.prototype.static = function (staticPath) {
  this._static = staticPath;

  // 静态资源中间件
  this.use(middlewareStatic);
};

// 监听端口
Sxpress.prototype.listen = function (port, callback) {
  this._port = port;

  this._httpServer.listen(this._port);

  callback && callback();
};

// 中间件
Sxpress.prototype.use = function (callback) {
  this._middlewareList.push(callback);
};

// 路由
Sxpress.prototype.Router = function () {
  // 返回路由实例
  return this._routerInstance;
};

// get请求
Sxpress.prototype.get = function (path, callback) {
  this.Router().get(path, callback);
};

// post请求
Sxpress.prototype.post = function (path, callback) {
  this.Router().post(path, callback);
};

// put请求
Sxpress.prototype.put = function (path, callback) {
  this.Router().put(path, callback);
};

// delete请求
Sxpress.prototype.delete = function (path, callback) {
  this.Router().delete(path, callback);
};

// 输出函数
Sxpress.prototype.send = function (data) {
  this._ended = true;

  // 文本
  if (typeof data === 'string') {
    return this.end(data);
  }

  // 对象
  if (typeof data === 'object') {
    this.writeHead(200, { 'content-type': 'application/json' });

    return this.end(JSON.stringify(data));
  }

  this.end(data);
};

// 创建实例
if (!global.sxpressInstance) {
  global.sxpressInstance = new Sxpress();
  
  // 创建http服务
  global.sxpressInstance.createServer();
}

module.exports = function () {
  return global.sxpressInstance;
};
