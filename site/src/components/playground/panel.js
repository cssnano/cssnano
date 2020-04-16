import React, { Component } from 'react';
import classnames from 'classnames';
import pluginsData from '../data/plugins.json';
import { AppContext } from '../../context/appContext';
import style from './panel.module.css';

const Item = ({ ...props }) => {
  return (
    <p>
      <input type="checkbox" /> {props.pluginName}
    </p>
  );
};

export default class Panel extends Component {
  // static contextType = AppContext;
  constructor() {
    super();
    console.log('pluginsData.plugins', this.context);
  }
  render() {
    return (
      <div className={style.wrapper}>
        <div className={style.controllerPanel}>
          <div>
            <h3 className={style.panelHeading}>Setting</h3>
          </div>
          <div>
            <div>
              <h3 className={style.panelSubHeading}>Preset</h3>
            </div>
            <div>
              <p>
                <input type="checkbox" /> default
              </p>
              <p>
                <input type="checkbox" /> advanced
              </p>
            </div>
          </div>
          <div>
            <div>
              <h3 className={style.panelSubHeading}>Plugins</h3>
            </div>
            <div>
              {pluginsData.plugins.map((plugins, i) => {
                return <Item pluginName={plugins.name} key={i} />;
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
