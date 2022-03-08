import { runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { AnnotationStore, EventKindConfig } from "../stores";


interface ScoreSelectorProps {
    annotationStore: AnnotationStore
}

@observer
export default class ScoreSelector extends React.Component<ScoreSelectorProps, any> {
    sliderChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        runInAction(() => {
            let eventConfig = this.props.annotationStore.eventTypes.find((el) => el.name == event.target.name);
            if (eventConfig !== undefined) {
                eventConfig.score = parseInt(event.target.value);
            }
        });
    }

    render() {
        return <div className="scoreSelector">
            {this.props.annotationStore.eventTypes.map((config: EventKindConfig) => {
                return <div>
                    <label htmlFor={config.name}>{config.name}</label>
                    <input name={config.name} type="number" max="20" min="0" value={config.score} onChange={this.sliderChanged}></input>
                    <input name={config.name} type="range" min="0" max="20" value={config.score} onChange={this.sliderChanged}></input>
                </div>
            })}
        </div>
    }
}