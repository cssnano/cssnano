import * as React from 'react';
import Sticky from 'react-sticky-el';

import Container from '../../components/Container';
import DefaultHeadMeta from '../../components/DefaultHeadMeta';
import Content from '../../components/Content';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

import './index.css';
import './syntax.css';

class App extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            sticky: false,
        };
    }

    render () {
        const {children} = this.props;
        return (
            <Container>
                <DefaultHeadMeta />
                <Sticky disabled={!this.state.sticky}>
                    <Header />
                </Sticky>
                <Content>
                    {children}
                </Content>
                <Footer />
            </Container>
        );
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

export default App;
