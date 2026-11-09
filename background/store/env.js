const isDev = process.env.NODE_ENV === 'development'
exports.indexPath = isDev ? 'http://localhost:8083' : 'dist/index.html'

