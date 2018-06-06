import React from "react";
import {Link} from "phenomic";
import SVG from 'react-svg-inline';
import postcss from '../../components/icons/postcss.svg';
import ContentBlock from '../../components/ContentBlock';
import CoverPage from "../CoverPage";
import Button from "../../components/Button";
import CssExample from '../../components/CssExample';
import {example} from '../../components/CssExample/index.css';
import Hero from '../../components/Hero';
import Clipboard from '../../components/Clipboard';
import styles from './index.css';

const inputExample =
`/* normalize selectors */
h1::before, h1:before {
    /* reduce shorthand even further */
    margin: 10px 20px 10px 20px;
    /* reduce color values */
    color: #ff0000;
    /* remove duplicated properties */
    font-weight: 400;
    font-weight: 400;
    /* reduce position values */
    background-position: bottom right;
    /* normalize wrapping quotes */
    quotes: '«' "»";
    /* reduce gradient parameters */
    background: linear-gradient(to bottom, #ffe500 0%, #ffe500 50%, #121 50%, #121 100%);
    /* replace initial values */
    min-width: initial;
}
/* correct invalid placement */
@charset "utf-8";`;

const outputExample =
`@charset "utf-8";h1:before{margin:10px 20px;color:red;font-weight:400;background-position:100% 100%;quotes:"«" "»";background:linear-gradient(180deg,#ffe500,#ffe500 50%,#121 0,#121);min-width:0}
`;

const Homepage = (props) => {
  return (
    <div>
        <Hero>
            <p>Deliver your website's styles, faster.</p>
            <p>Plug in cssnano into your build step for modern CSS compression.</p>
            <Button
                to={`/guides/getting-started/`}
                className={styles.cta}
                dark
                big
            >
                Get Started
            </Button>
        </Hero>
        <CoverPage { ...props }>
            <p><strong>This documentation is for the upcoming version 4 release,
            which can be installed with <code>npm install cssnano@next</code>.
            Please test it out and report any bugs that you may find!</strong></p>
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
                    <p>But don’t just take our word for it; why not try out <a href={"https://npmjs.com/package/css-size"}>css-size</a>,
                    a module especially created to measure CSS size before
                    &amp; after minification.</p>
                    <table className={styles.table}>
                        <tbody>
                            <tr>
                                <td>Original (gzip)</td>
                                <td>325 B</td>
                            </tr>
                            <tr>
                                <td>Minified (gzip)</td>
                                <td>177 B</td>
                            </tr>
                            <tr>
                                <td>Difference</td>
                                <td>148 B</td>
                            </tr>
                            <tr>
                                <td>Percent</td>
                                <td>54.46%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <p>By default, cssnano performs safe optimisations on your CSS file,
            but we also offer an advanced preset with techniques that you can
            use to maximise compression. For more details, see <Link to={`/guides/optimisations`}>our optimisations guide</Link>.</p>
            <div className={styles.install}>
                <a href={"https://npmjs.com/package/cssnano"}>npm install cssnano</a>
                <Clipboard>npm install cssnano</Clipboard>
            </div>
        </CoverPage>
        <ContentBlock className={styles.technology}>
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
        </ContentBlock>
    </div>
  )
}

export default Homepage
