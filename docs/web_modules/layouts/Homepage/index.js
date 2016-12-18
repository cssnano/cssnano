import React, {Component, PropTypes} from "react";
import {Link} from 'react-router';
import uniqueId from 'mini-unique-id';
import SVG from 'react-svg-inline';
import users from '../../../users.json';
import postcss from '../../icons/postcss.svg';
import CssExample from '../../CssExample';
import {example} from '../../CssExample/index.css';
import CoverPage from "../CoverPage";
import {content} from '../Page/index.css';
import {install} from '../Usage/index.css';
import styles from './index.css';

const inputExample =
`/* normalize selectors */
h1::before, h1:before {
    /* reduce shorthand even further */
    margin: 10px 20px 10px 20px;
    /* reduce color values */
    color: #ff0000;
    /* drop outdated vendor prefixes */
    -webkit-border-radius: 16px;
    border-radius: 16px;
    /* remove duplicated properties */
    font-weight: normal;
    font-weight: normal;
    /* reduce position values */
    background-position: bottom right;
}
/* correct invalid placement */
@charset "utf-8";`;

const outputExample =
`@charset "utf-8";h1:before{margin:10px 20px;color:red;border-radius:16px;font-weight:normal;background-position:100% 100%}
`;

export default class Homepage extends Component {
    static contextTypes = {
        metadata: PropTypes.object.isRequired
    };

    render () {
        const {pkg, modules} = this.context.metadata;
        let clipboard = null;
        if (typeof window !== 'undefined') {
            const Clipboard = require('../Usage/clipboard').default;
            clipboard = (<Clipboard text={'npm install cssnano'}/>);
        }
        return (
            <div>
            <div className={styles.about}>
                <div className={content}>
                    <p>
                        cssnano compresses your&nbsp;css.
                    </p>
                    <p>
                        And, it plugs into your existing setup.
                    </p>
                </div>
            </div>
            <div className={content}>
                <h2>What it does</h2>
                <p>cssnano takes your nicely formatted CSS and runs it through
                many focused optimisations, to ensure that the final result is
                as small as possible for a production environment.</p>
                <div className={example}>
                    <CssExample>{inputExample}</CssExample>
                    <div>
                        <CssExample>{outputExample}</CssExample>
                        <p>The semantics of this CSS have been kept the same,
                        but the extraneous whitespace has been removed, the
                        identifiers compressed, and unnecessary definitions
                        purged from the stylesheet. This gives you a much
                        smaller CSS for production use.</p>
                        <p>But don’t just take our word for it; why not try out <a href="https://github.com/ben-eb/css-size">css-size</a>,
                        a module especially created to measure CSS size before
                        &amp; after minification.</p>
                        <table className={styles.table}>
                            <tbody>
                                <tr>
                                    <td>Original (gzip)</td>
                                    <td>275 B</td>
                                </tr>
                                <tr>
                                    <td>Minified (gzip)</td>
                                    <td>110 B</td>
                                </tr>
                                <tr>
                                    <td>Difference</td>
                                    <td>165 B</td>
                                </tr>
                                <tr>
                                    <td>Percent</td>
                                    <td>40%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className={content}>
                <p>Get started now! Our <Link to='/usage/'>usage guide</Link> covers a wide variety of environments.</p>
                <div className={install}>
                    <Link to='/usage/'>npm install cssnano</Link>
                    {clipboard}
                </div>
            </div>
            <div className={content}>
                <h2>Features</h2>
                <ul className={styles.features}>
                    {modules.map(({shortDescription, shortName}) => {
                        return (
                            <li key={uniqueId()}>
                                <Link to={`/optimisations/${shortName}`}>
                                    {shortDescription}
                                </Link>
                            </li>
                        );
                    })}
                    <li>&amp; more besides!</li>
                </ul>
            </div>
            <div className={content}>
                <h2>Technology</h2>
                <div className={styles.postcss}>
                    <p>cssnano is powered by <a href="https://github.com/postcss/postcss">PostCSS</a>,
                    a tool for transforming styles with JavaScript. Specifically,
                    its plugin architecture allows us to compose cssnano out of
                    small modules with limited responsibilities. It also allows you
                    to easily insert cssnano into your build step, along with other
                    processors that can lint your CSS for errors, or transpile
                    future&nbsp;syntax.</p>
                    <SVG svg={postcss} title="PostCSS" width="100px" />
                </div>
            </div>
            <div className={content}>
                <h2>Our users</h2>
                <div className={styles.users}>
                    {users.map(user => (
                        <a href={user.url} key={uniqueId()}>
                            <img
                                src={`/assets/${user.image}`}
                                height="100px"
                                title={user.name}
                            />
                        </a>
                    ))}
                </div>
                <p className={styles.addCompany}>Does your company use cssnano? <a href="https://github.com/ben-eb/cssnano/pulls">Send a pull request</a> to
                be included on this list!</p>
            </div>
            <div className={content}>
                <p>Why not try it out for your site today? If you have any questions,
                feel free to visit <a href={`https://gitter.im/${pkg.repository}`}>
                the support chat</a>.</p>
                <div className={install}>
                    <Link to='/usage/'>npm install cssnano</Link>
                    {clipboard}
                </div>
            </div>
            <CoverPage className={content} { ...this.props}>
            </CoverPage>
            </div>
        );
    }
}
