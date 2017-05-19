import React from "react"
import PropTypes from "prop-types"
import {StickyContainer, Sticky} from 'react-sticky';

import "./index.global.css"
import "./syntax.global.css"

import Container from "./components/Container"
import DefaultHeadMeta from "./components/DefaultHeadMeta"
import Header from "./components/Header"
import Content from "./components/Content"
import Footer from "./components/Footer"

export default class AppContainer extends React.Component {
    propTypes: {
        children: PropTypes.node,
    };

    constructor(props) {
      super(props);
      this.state = {
          sticky: false,
      };
    }

    render () {
        const {props} = this;
        return (
            <Container>
              <DefaultHeadMeta />
              <StickyContainer>
                <Sticky
                    isActive={this.state.sticky}
                    stickyStyle={{zIndex: 2}}
                >
                  <Header />
                </Sticky>
                <Content>
                  { props.children }
                </Content>
                <Footer />
              </StickyContainer>
            </Container>
        )
    }

    updateSticky () {
        this.setState({sticky: document.body.clientWidth > 599});
    }

    componentDidMount () {
        window.addEventListener('resize', this.updateSticky.bind(this));
        this.updateSticky();
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.updateSticky.bind(this));
    }
}
