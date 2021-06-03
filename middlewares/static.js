var fs = require('fs');
var url = require('url');
var path = require('path');

// 扩展类型定义
var MIME_TYPES = {
  '.js': 'application/x-javascript',
  '.jpg': 'image/jpeg',
  '.css': 'text/css',
  '.html': 'text/html',
};

module.exports = function (req, res, next) {
  var self = this;

  // 获取请求文件名
  var extname = path.extname(url.parse(req.url).pathname);

  // 处理静态资源，配置过静态资源目录，请求路径为文件类型，在MIME_TYPES有命中
  if (self._static && extname && MIME_TYPES[extname]) {
    // 解析文件路径
    var pathParseUrl = path.parse(req.url);
    // 拼接文件路径
    var filePath = path.join(
      self._static,
      pathParseUrl.dir,
      pathParseUrl.name + extname
    );

    fs.access(filePath, function (error) {
      // 文件不存在返回404
      if (error && error.code === 'ENOENT') {
        return self._response.end('Not Found 404');
      }

      // 创建读取流
      const rs = fs.createReadStream(filePath);

      // 设置输出content-type
      self._response.writeHead(200, { 'content-type': MIME_TYPES[extname] });

      res._ended = true;

      // 通过管道输出流
      rs.pipe(res);
    });
  } else {
    next();
  }
};
