const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
    entry: {
        main: path.join(__dirname, './src/main.js'),
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js',
    },
    mode: 'development',
    optimization: {
        minimize: false,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: [
                    {
                        loader: 'thread-loader',
                        options: {
                          workers: 2,
                        },
                    },
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                            plugins: [['@babel/plugin-transform-react-jsx', {pragma: 'createElement'}]]
                        },
                    },
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            inject: true,
            filename: `index.html`,
            template: path.join(__dirname, `./src/index.html`),
            chunks: ['main'],
            minify: {
              html5: true,
              minifyJS: true,
              minifyCSS: true,
              removeComments: false,
              collapseWhitespace: true,
              preserveLineBreaks: false,
            },
        }),
        new HardSourceWebpackPlugin(),
    ]
};
