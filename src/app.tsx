import React from "react";
import PropTypes from "prop-types";
import "reflect-metadata";

import Plot from "react-plotly.js";
import { observer } from "mobx-react";
import { observable, computed, action } from "mobx";
import * as mobx from "mobx";
import { plainToInstance } from "class-transformer";
import * as tidy from "@tidyjs/tidy";

import { Response, NarrativeEvent } from "./schemas/events";

mobx.configure({
    enforceActions: "always",
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    observableRequiresReaction: true,
    disableErrorBoundaries: true
})


export class RootStore {
    @observable uiStore = new UiStore();
    @observable annotationStore = new AnnotationStore();

    constructor() {
        mobx.makeObservable(this)
    }
}

class UiStore {
    @observable currentText: string = "";

    constructor() {
        mobx.makeObservable(this)
    }
}

class SmoothingConfig {
    @observable windowSize: number = 10

    constructor() {
        mobx.makeObservable(this)
    }
}

class AnnotationStore {
    @observable submitText: string = "lol";
    @observable annotations: NarrativeEvent[] = [];
    @observable smoothingConfig: SmoothingConfig = new SmoothingConfig();

    constructor() {
        mobx.makeObservable(this)
    }

    fetchEventAnnotations(text: string) {
        let promise = fetch("http://localhost:8080/predictions/ts_test", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({"text": text})
        }).then(resp => resp.json()).then(data => {
            let response = plainToInstance(Response, data as object, { excludeExtraneousValues: true });
            mobx.runInAction(() => {
                this.annotations = response.annotations;
                this.submitText = text;
            });
        });
    }

    @computed
    get smoothyValues(): number[] {
        let values = this.yValues.map((el): object => { return {value: el} });
        let out = tidy.tidy(
            this.annotations,
            tidy.map((el) => {return {value: el.predictedScore}}),
            tidy.mutateWithSummary({
                movingAvg: tidy.roll(this.smoothingConfig.windowSize, tidy.mean('value')),
            }),
        );
        console.log(out);
        return out.map((el) => el["movingAvg"])
    }

    @computed
    get yValues(): number[] {
        return this.annotations.map((anno) => anno.predictedScore);
    }

    @computed
    get texts(): string[] {
        return this.annotations.map((anno) => this.submitText.slice(anno.start, anno.end))
    }

    @computed
    get xValues(): number[] {
        return Array.from(this.annotations.entries()).map(([index, anno]): number => index);
    }
}

interface AppProps {
    rootStore: RootStore,
};

@observer
export class App extends React.Component<AppProps, any> {
    render() {
        const {rootStore} = this.props
        return <div>
            <TextForm rootStore={rootStore}/>
            <EventGraph annotationStore={rootStore.annotationStore}/>
        </div>
    }
}

interface TextFormProps {
    rootStore: RootStore
}

@observer
class TextForm extends React.Component<TextFormProps, any> {
    handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        mobx.runInAction(() => {
            this.props.rootStore.uiStore.currentText = event.currentTarget.inputText.value;
            this.props.rootStore.annotationStore.fetchEventAnnotations(this.props.rootStore.uiStore.currentText);
        });
        event.preventDefault();
    }

    render() {
        return <div>
            <form onSubmit={this.handleSubmit} id="inputForm">
                <textarea name="inputText" defaultValue="Ich teste das narrativiäts Modell!"/>
                <button type="submit">Submit</button>
            </form>
        </div>
    }
}

let sliderSteps = (): Partial<Plotly.SliderStep>[] => {
    let out: Partial<Plotly.SliderStep>[] = [];
    for (let i = 10; i<=100; i += 10) {
        out.push({
            label: i.toString(),
            method: "update",
            args: [],
        })
    }
    return out
}

interface EventGraphProps {
    annotationStore: AnnotationStore,
}

@observer
class EventGraph extends React.Component<EventGraphProps, any> {
    handleWindowsizeChange = (event: React.FormEvent<HTMLInputElement>) => {
        console.log(event)
        mobx.runInAction(() => {
            this.props.annotationStore.smoothingConfig.windowSize = parseInt(event.currentTarget.value);
        });
        event.preventDefault();
    }

    sliderEnd = (event: Plotly.SliderEndEvent) => {
        mobx.runInAction(() => {
            this.props.annotationStore.smoothingConfig.windowSize = parseInt(event.step.label);
        });
    }

    sliderChange = (event: Plotly.SliderChangeEvent) => {
        mobx.runInAction(() => {
            this.props.annotationStore.smoothingConfig.windowSize = parseInt(event.step.label);
        });
    }

    render() {
        return <Plot
            layout={{
                title: "Narrativity Plot",
                autosize: false,
                yaxis: {
                    range: [0, 5]
                },
                sliders: [{
                    pad: {t: 30},
                    currentvalue: {
                        xanchor: "left",
                        prefix: "Window Size: ",
                        font: {
                            color: '#888',
                            size: 20
                        }
                    },
                    steps: sliderSteps()
                }],
                transition: {
                    easing: "linear",
                    duration: 300
                }
            }}
            data={[{
                x: this.props.annotationStore.xValues,
                y: this.props.annotationStore.smoothyValues,
                text: this.props.annotationStore.texts,
                type: 'scatter'
            }]}
            onSliderChange={this.sliderChange}
            />
        );
    }
}
