import React, {Component, PropTypes} from "react";
import Helmet from "react-helmet";
import invariant from "invariant";
import getMetadata from '../../utils/getMetadata';
import styles from './index.css';

class Page extends Component {
    render () {
        const {props, context} = this;
        const {pkg, favicons} = context.metadata;

        const {
            __filename,
            __url,
            head,
            body,
            header,
            footer,
            className,
        } = props;

        invariant(
            typeof head.title === "string",
            `Your page '${ __filename }' needs a title`
        );

        const metaTitle = head.metaTitle ? head.metaTitle : head.title;
        
        const meta = getMetadata({
            title: metaTitle,
            url: __url,
            description: head.description,
            twitter: pkg.twitter
        });

        return (
            <div className={className}>
                <Helmet
                    title={`${metaTitle} - cssnano`}
                    meta={meta}
                    link={favicons}
                />
                {
                    head.title &&
                    <h1 className={styles.title}>{head.title}</h1>
                }
                {header}
                {
                    body &&
                    <div
                        dangerouslySetInnerHTML={ {__html: body} }
                    />
                }
                {props.children}
                {footer}
            </div>
        );
    }
}

Page.propTypes = {
    children: PropTypes.oneOfType([ PropTypes.array, PropTypes.object ]),
    __filename: PropTypes.string.isRequired,
    __url: PropTypes.string.isRequired,
    head: PropTypes.object.isRequired,
    body: PropTypes.string.isRequired,
    header: PropTypes.element,
    footer: PropTypes.element,
};

Page.contextTypes = {
    metadata: PropTypes.object.isRequired,
};

export default Page;
