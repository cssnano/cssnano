import React, {PropTypes, Component} from 'react';
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
                            to="/usage/"
                        >
                            Usage
                        </Link>
                        <Link
                            className={ styles.link }
                            to="/optimisations/"
                        >
                            Optimisations
                        </Link>
                        <Link
                            className={ styles.link }
                            to="/options/"
                        >
                            Options
                        </Link>
                    </div>
                    <div className={ styles.navPart2 }>
                        <a
                            href="https://www.stickermule.com/uk/marketplace/11086-cssnano"
                            className={styles.link}
                        >
                            {'Buy stickers!'}
                        </a>
                        <a
                            href={`https://gitter.im/${pkg.repository}`}
                            className={styles.link}
                        >
                            {'Chat'}
                        </a>
                        <Link
                            className={ styles.link }
                            to="/blog/"
                        >
                            {'Blog'}
                        </Link>
                        <a
                            href={`https://twitter.com/${pkg.twitter}`}
                            className={ styles.link }
                        >
                            {'Twitter'}
                        </a>
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
