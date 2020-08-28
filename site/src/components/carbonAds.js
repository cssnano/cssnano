import React, { Component } from 'react';

const async = true;
const CARBON_URL =
  '//cdn.carbonads.com/carbon.js?serve=CEBI62JN&placement=cssnanoco';
const wrapperClassname = 'carbon_ads_wrapper';

class carbonAds extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const carbonWrapper = document.querySelector(`.${wrapperClassname}`);
    const script = document.createElement('script');
    script.src = CARBON_URL;
    script.async = async;
    script.id = '_carbonads_js';
    carbonWrapper.appendChild(script);
  }

  render() {
    return (
      <div
        className={`${wrapperClassname} ${this.props.customClass || ''}`}
      ></div>
    );
  }
}

export default carbonAds;
