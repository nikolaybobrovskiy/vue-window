const { VueLoaderPlugin } = require('vue-loader')
const { DefinePlugin } = require('webpack')

module.exports = {
    entry: [
        './src/index.ts',
    ],
    output: {
        path: `${__dirname}/lib`,
        filename: 'index.js',
        libraryTarget: 'commonjs',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: { vue: require.resolve('vue') },
    },
    module: {
        rules: [
            { test: /\.vue$/, use: 'vue-loader' },
            { test: /\.scss/, use: ["style-loader", "css-loader", { loader: "sass-loader", options: { api: "modern" } },] },
            {
                test: /\.ts$/, loader: 'ts-loader', options: {
                    appendTsSuffixTo: [/\.vue$/],
                }
            }
        ],
    },
    externals: [
        // include only relative assets
        function ({ context, request }, callback) {
            if (!request.match(/(?:^|!)(?:\.|\.\.)?\//))
                return callback(null, `commonjs ${request}`)
            callback()
        }
    ],
    plugins: [
        new VueLoaderPlugin(),
        new DefinePlugin({
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false,
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
        }),
    ],
}