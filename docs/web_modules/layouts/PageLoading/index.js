import React, {Component} from "react";
import TopBarProgressIndicator from "react-topbar-progress-indicator";

import styles from "./index.css";

TopBarProgressIndicator.config({
    barColors: {
        0: "#40b97b",
        "1.0": "#40b97b",
    },
    shadowBlur: 0,
});

export default class PageLoading extends Component {
    render () {
        return (
            <div>
                <TopBarProgressIndicator />
                <div className={ styles.loader }>
                    <div className={ styles.spinner }></div>
                </div>
            </div>
        );
    }
}
