module.exports = {
    devServer: {
        https: false,
        port: 8081,
        proxy: {
            '/api': {
                target: 'http://10.1.4.179:1317',
                changeOrigin: true,
                pathRewrite: {
                    '^/api': ''
                }
            }
        }
    }
}
