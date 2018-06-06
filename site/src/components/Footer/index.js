import React, {Component} from "react";
import {Link} from "react-router";

import pkg from '../../metadata';
import styles from "./index.css";

export default class Footer extends Component {
    render () {
        return (
            <footer className={ styles.footer }>
                <p>
                    Latest release v{pkg.pkg.version} &middot;
                    <Link
                        to="/changelog/"
                    >
                        {' Changelog '}
                    </Link>
                    &middot; Distributed under the MIT License.
                </p>
            </footer>
        );
    }
}
