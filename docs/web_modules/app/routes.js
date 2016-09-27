import React, {Component, PropTypes} from "react";
import {Route} from "react-router";
import {PageContainer as PhenomicPageContainer} from 'phenomic';
import LayoutContainer from "../LayoutContainer";
import OptimisationContainer from "../layouts/Optimisations/show";
import * as layouts from '../layouts';

class PageContainer extends Component {
    static propTypes = {
        params: PropTypes.object.isRequired,
    };

    render () {
        const {props} = this;
        return (
            <PhenomicPageContainer
                {...props}
                layouts={layouts}
            />
        );
    }

    componentWillReceiveProps (props) {
        if (props.params.splat !== this.props.params.splat && !window.location.hash) {
            window.scrollTo(0, 0);
        }
    }
}

export default (
  <Route component={LayoutContainer}>
    <Route
        path="/optimisations/:optimisation"
        component={OptimisationContainer}
    />
    <Route
        path="*"
        component={PageContainer}
    />
  </Route>
);
