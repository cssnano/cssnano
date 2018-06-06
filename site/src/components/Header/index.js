import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Link} from "react-router";
import SVG from 'react-svg-inline';
import logo from './logo-alt.svg';
import styles from "./index.css";

export default class Header extends Component {
    static contextTypes = {
        metadata: PropTypes.object.isRequired
    };

    render () {
        const {pkg} = this.context.metadata;
        return (
            <header className={ styles.header }>
                <nav className={ styles.nav }>
                    <div className={ styles.navPart1 }>
                        <Link
                            className={[styles.link, styles.logo].join(' ')}
                            to="/"
                        >
                            <SVG svg={logo} title="cssnano" />
                        </Link>
                        <Link
                            className={ styles.link }
                            to="/guides/"
                        >
                            Guides
                        </Link>
                        <Link
                            className={ styles.link }
                            to="/community/"
                        >
                            Community
                        </Link>
                        <Link
                            className={styles.link}
                            to="/support-us/"
                        >
                            Support Us
                        </Link>
                        <Link
                            className={ styles.link }
                            to="/blog/"
                        >
                            Blog
                        </Link>
                        <a
                            href={`https://github.com/${pkg.repository}`}
                            className={ styles.link }
                        >
                            {'GitHub'}
                        </a>
                    </div>
                </nav>
            </header>
        );
    }
}
