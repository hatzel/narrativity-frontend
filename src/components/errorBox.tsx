import { observer } from "mobx-react";
import React from "react";


interface ErrorBoxProps {
    visible: boolean;
    text: string;
    closeCallback: React.MouseEventHandler<HTMLDivElement>;
}

@observer
export default class ErrorBox extends React.Component<ErrorBoxProps, any> {
    render() {
        if (this.props.visible) {
            return <div className="errorBox">
                <div>{this.props.text}</div>
                <div className="closeSymbol" onClick={this.props.closeCallback}>✕</div>
            </div>;
        } else {
            return <></>;
        }
    }
}
