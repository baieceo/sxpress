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
  this._routerInstance = new SxpressRouter(); // 存储路由实例对象
  this._middlewareList = []; // 存储中间件函数
  this._middlewareIndex = 0; // 存储中间件计数
  this._ended = false; // 是否返回数据
  this._async = false; // 是否异步处理
  this._responseCode = 200; // 响应体code
  this._responseHeaders = {}; // 响应体headers
  this._responseCookies = []; // 响应体cookies
}

// 初始化
Sxpress.prototype.init = function (req, res) {
  this._request = req;
  this._response = res;
  this._response.send = this.send;
  this._ended = false;
  this._async = false;
  this._middlewareIndex = 0;
  this._routerInstance.init(this._request, this._response);
  this._responseCode = 200;
  this._responseHeaders = {};
  this._responseCookies = [];
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

    // 运行中间件
    if (self._middlewareList.length) {
      self.next();
    }

    if (self._ended) {
      return false;
    }

    // 处理路由
    if (self._routerInstance._routerList.length) {
      var urlParse = url.parse(req.url);
      var pathname = urlParse.pathname;
      var router = null;

      // 查找路由
      for (var i = 0; i < self._routerInstance._routerList.length; i++) {
        if (
          self._routerInstance._routerList[i].method === req.method &&
          self._routerInstance._routerList[i].path === pathname
        ) {
          router = self._routerInstance._routerList[i];

          break;
        }
      }

      if (router) {
        // 查找到路由
        return router.handler(self._request, self._response);
      } else if (!router && !self._async) {
        // 未查找到路由, 且不是异步
        return res.send('Not Found 404');
      } else if (self._async) {
        // 异步不处理
        return false;
      } else {
        // 返回默认文本
        return res.send('sxpress');
      }
    } else {
      res.send('sxpress');
    }
  });
};

// 处理下一步
Sxpress.prototype.next = function () {
  var self = this;

  if (this._ended) return false;

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
  var sxpressInstance = global.sxpressInstance;
  var responseCookies = sxpressInstance._responseCookies;
  var code = sxpressInstance._responseCode;
  var headers = sxpressInstance._responseHeaders;
  var cookie;
  var cookies = []; // cookies数组
  var cookieItems = [];

  this._ended = true;

  // 处理cookie
  if (responseCookies.length) {
    for (var i = 0; i < responseCookies.length; i++) {
      cookie = responseCookies[i];
      cookieItems = [];

      cookieItems.push(cookie.key + '=' + cookie.value);

      for (var key in cookie.options) {
        if (cookie.options[key] !== false) {
          cookieItems.push(key + '=' + cookie.options[key]);
        }
      }

      cookies.push(cookieItems.join('; '));
    }

    headers['Set-Cookie'] = cookies;
  }

  // 文本
  if (typeof data === 'string') {
    headers['Content-Type'] = 'text/plain';

    this.writeHead(code, headers);

    return this.end(data);
  }

  // 对象
  if (typeof data === 'object') {
    headers['Content-Type'] = 'application/json';

    this.writeHead(code, headers);

    return this.end(JSON.stringify(data));
  }

  this.writeHead(code, headers);

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
