import React, {PropTypes} from "react";
import {StickyContainer, Sticky} from 'react-sticky';
import Helmet from "react-helmet";
import Header from "../Header";
import Footer from "../Footer";
import styles from "./index.css";

export default React.createClass({
    propTypes: {
        children: PropTypes.oneOfType([ PropTypes.array, PropTypes.object ]),
    },

    contextTypes: {
        metadata: PropTypes.object.isRequired,
    },

    render () {
        const {
            pkg,
        } = this.context.metadata;

        return (
            <div className={ styles.layout }>
                <Helmet
                    meta={[
                        {property: "og:site_name", content: pkg.name},
                        {name: "twitter:site", content: `@${ pkg.twitter }`},
                    ]}
                />
                <StickyContainer>
                    <Sticky isActive={this.state.sticky}>
                        <Header />
                    </Sticky>
                <div className={ styles.content }>
                    { this.props.children }
                </div>
                </StickyContainer>
                <Footer />
            </div>
        );
    },
    
    getInitialState () {
        return {sticky: false};
    },
    
    updateSticky () {
        this.setState({sticky: document.body.clientWidth > 599});
    },

    componentDidMount () {
        window.addEventListener('resize', this.updateSticky);
        this.updateSticky();
    },
    
    componentWillUnmount () {
        window.removeEventListener('resize', this.updateWidth);
    }
});
