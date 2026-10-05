const { VueLoaderPlugin } = require('vue-loader')
const { DefinePlugin } = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: [
        "./src/index.ts",
    ],
    output: {
        path: `${__dirname}/dist`,
        filename: 'vue-window-standalone.js',
        library: { name: 'VueWindow', type: 'window' },
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: { vue: require.resolve('vue') },
    },
    module: {
        rules: [
            { test: /\.vue$/, use: 'vue-loader' },
            { test: /\.scss/, use: ["style-loader", "css-loader", { loader: "sass-loader", options: { api: "modern" } },] },
            { test: /\.ts$/, loader: 'ts-loader', options: { appendTsSuffixTo: [/\.vue$/] } }
        ],
    },
    externals: {
        vue: 'Vue'
    },
    plugins: [
        new CopyPlugin({ patterns: [{ from: 'src/example.html', to: 'example.html' }] }),
        new VueLoaderPlugin(),
        new DefinePlugin({
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false,
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
        }),
    ],
}