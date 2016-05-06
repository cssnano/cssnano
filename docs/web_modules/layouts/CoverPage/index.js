import React, {Component, PropTypes} from "react";
import Helmet from "react-helmet";
import invariant from "invariant";
import getMetadata from '../../utils/getMetadata';

class CoverPage extends Component {
    render () {
        const {props, context} = this;
        const {pkg} = context.metadata;

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
                    title={ metaTitle }
                    meta={ meta }
                />
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

CoverPage.propTypes = {
    children: PropTypes.oneOfType([ PropTypes.array, PropTypes.object ]),
    __filename: PropTypes.string.isRequired,
    __url: PropTypes.string.isRequired,
    head: PropTypes.object.isRequired,
    body: PropTypes.string.isRequired,
    header: PropTypes.element,
    footer: PropTypes.element,
};

CoverPage.contextTypes = {
    metadata: PropTypes.object.isRequired,
};

export default CoverPage;
