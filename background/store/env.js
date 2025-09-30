const isDev = process.env.NODE_ENV === 'development'
exports.indexPath = isDev ? 'http://localhost:8080' : 'dist/index.html'

