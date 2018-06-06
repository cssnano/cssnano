import React, {Component} from "react";
import PropTypes from "prop-types";
import analytics from "react-google-analytics";

const {Initializer} = analytics;
const isProduction = process.env.NODE_ENV === "production";
const isClient = typeof window !== "undefined";

export default class Analytics extends Component {
    static propTypes = {
        children: PropTypes.oneOfType([ PropTypes.array, PropTypes.object ]),
        params: PropTypes.object.isRequired,
    };

    static contextTypes = {
        metadata: PropTypes.object.isRequired
    };

    componentWillMount () {
        if (!isClient || !isProduction) {
            return;
        }
        const {pkg} = this.context.metadata;
        const id = pkg.googleAnalyticsUA;
        analytics("create", id, "auto");
        this.logPageview();
    }

    componentWillReceiveProps (props) {
        if (props.params.splat !== this.props.params.splat) {
            this.logPageview();
        }
    }

    logPageview () {
        if (!isClient || !isProduction) {
            return;
        }
        analytics("set", "page", window.location.pathname);
        analytics("send", "pageview");
    }

    render () {
      return (
          <div>
              { this.props.children }
              <Initializer />
          </div>
      );
    }
}
