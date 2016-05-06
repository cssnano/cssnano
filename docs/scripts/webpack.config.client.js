import path from "path";

// ! client side loader only \\
export default ({config}) => {
    const {webpackConfig} = config;
    return {
        ...webpackConfig,
        module: {
            ...webpackConfig.module,
            loaders: [
                ...webpackConfig.module.loaders, {
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
                },
            ],
        },

        entry: {
            "phenomic-client": path.join(__dirname, "index-client"),
        },
    };
};
