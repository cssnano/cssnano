import configurator from "phenomic/lib/configurator";
import pkg from "../package.json";
import webpackConfig from "./webpack.config.babel.js";
import webpackConfigClient from "./webpack.config.client.js";

const config = configurator(pkg);
config.webpackConfig = webpackConfig({config, pkg});
config.webpackConfigClient = webpackConfigClient({config, pkg});

export default config;
