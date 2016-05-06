import path from "path";
import webpack from "webpack";
import ExtractTextPlugin from "extract-text-webpack-plugin";
import pkg from './package.json';
import renderer from './scripts/markdownRenderer.babel';

export const makeConfig = (config = {}) => ({
    ...config.dev && {
        devtool: "#cheap-module-eval-source-map",
    },

    phenomic: {
        contentLoader: {
            context: path.join(config.cwd, config.source),
            renderer,
            feedsOptions: {
                title: pkg.name,
                /* eslint-disable */
                site_url: pkg.homepage,
                /* eslint-enable */
            },
            feeds: {
                "feed.xml": {
                    collectionOptions: {
                        filter: {
                            layout: "Post"
                        },
                        sort: "date",
                        reverse: true,
                        limit: 20,
                    },
                },
            },
        }  
    },

    module: {
        loaders: [{
            test: /\.md$/,
            loader: "phenomic/lib/content-loader",
        }, {
            test: /\.json$/,
            loader: "json-loader",
        }, {
            test: /\.js$/,
            loaders: [
                `babel-loader${
                    config.dev ? "?presets[]=babel-preset-react-hmre" : ""
                }`,
                "eslint-loader",
            ],
            include: [
                path.resolve(config.cwd, "scripts"),
                path.resolve(config.cwd, "web_modules"),
            ],
        }, {
            test: /\.css$/,
            loader: ExtractTextPlugin.extract(
                "style-loader",
                "css-loader" + (
                    "?modules"+
                    "&localIdentName=" +
                    (
                        process.env.NODE_ENV === "production"
                        ? "[hash:base64:5]"
                        : "[path][name]--[local]--[hash:base64:5]"
                    ).toString()
                ) + "!" +
                "postcss-loader",
            ),
        }, {
            test: /\.(html|ico|jpe?g|png|gif)$/,
            loader: "file-loader" +
                "?name=[path][name].[ext]&context=" +
                path.join(config.cwd, config.source),
        }, {
            test: /\.svg$/,
            loader: "raw-loader",
        }],
    },

    postcss: () => [
        require("stylelint")(),
        require("postcss-cssnext")({browsers: "last 2 versions"}),
        require("postcss-browser-reporter")(),
        require("postcss-reporter")(),
    ],

    plugins: [
        new ExtractTextPlugin("[name].[hash].css", {disable: config.dev}),
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: JSON.stringify(
                    config.production ? "production" : process.env.NODE_ENV
                ),
                PHENOMIC_PATHNAME: JSON.stringify(process.env.PHENOMIC_PATHNAME),
            }
        }),
        ...config.production && [
            new webpack.optimize.DedupePlugin(),
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false,
                },
            }),
        ],
    ],

    output: {
        path: path.join(config.cwd, config.destination),
        publicPath: config.baseUrl.pathname,
        filename: "[name].[hash].js",
    },

    resolve: {
        extensions: [ ".js", ".json", "" ],
        root: [ path.join(config.cwd, "node_modules") ],
    },

    resolveLoader: {
        root: [path.join(config.cwd, "node_modules")]
    },
  
    node: {
        fs: 'empty',
    },
});
