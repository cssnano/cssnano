import React, {Component, PropTypes} from "react";
import styles from "./index.css";

export default class PageError extends Component {

    static propTypes = {
        error: PropTypes.oneOfType([ PropTypes.number, PropTypes.string ]),
        errorText: PropTypes.string,
    };

    static defaultProps = {
        error: 404,
        errorText: "Page not found",
    };

    render () {
        const {
      error,
      errorText,
    } = this.props;

        return (
      <div className={ styles.container }>
        <div className={ styles.oops }>{ "😱 Oooops!" }</div>
        <div className={ styles.text }>
          <p className={ styles.title }>
            <strong>{ error }</strong>
            { " " }
            { errorText }
          </p>
          {
            error === 404 &&
            <div>
              { "It seems you find a broken link. " }
              { "Sorry about that. " }
              <br />
              { "Do not hesitate to report us this page 😁." }
            </div>
          }
        </div>
      </div>
    );
    }
}
