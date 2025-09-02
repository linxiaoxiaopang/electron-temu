// common.js
const HTTP_STATUS_CODES = {
  // 请求成功，服务器已成功处理请求
  SUCCESS: 200,
  // 请求成功且已创建新资源，通常在 POST 请求后使用
  CREATED: 201,
  // 请求成功，但没有返回内容，例如 DELETE 请求成功删除资源后
  NO_CONTENT: 204,
  // 资源已永久移动到新位置，响应头中会包含新的 URL
  MOVED_PERMANENTLY: 301,
  // 资源临时移动，客户端应使用 GET 方法请求新的 URL
  FOUND: 302,
  // 资源未修改，客户端可以使用缓存的内容
  NOT_MODIFIED: 304,
  // 客户端请求有错误，例如请求参数错误或格式错误
  BAD_REQUEST: 400,
  // 客户端未授权，需要提供认证信息，例如缺少登录信息
  UNAUTHORIZED: 401,
  // 客户端请求被服务器拒绝，通常是权限不足
  FORBIDDEN: 403,
  // 请求的资源未找到
  NOT_FOUND: 404,
  // 请求方法不允许，例如使用了不允许的 HTTP 方法
  METHOD_NOT_ALLOWED: 405,
  // 服务器内部错误，通常是服务器端代码出现问题
  INTERNAL_SERVER_ERROR: 500,
  // 作为网关或代理服务器时，从上游服务器收到无效响应
  BAD_GATEWAY: 502,
  // 服务器暂时无法处理请求，可能是过载或维护
  SERVICE_UNAVAILABLE: 503
}

module.exports = HTTP_STATUS_CODES
