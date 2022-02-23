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
    @observable activeNarrativeEventId: string | undefined = undefined;

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
    @observable submitText: string = "";
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
                movingAvg: tidy.roll(this.smoothingConfig.windowSize, tidy.mean("value"), {partial: true}),
            }),
        );
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
            <EventGraph annotationStore={rootStore.annotationStore} uiStore={rootStore.uiStore}/>
            <TextView annotationStore={rootStore.annotationStore} uiStore={rootStore.uiStore}/>
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
    annotationStore: AnnotationStore;
    uiStore: UiStore;
}

@observer
class EventGraph extends React.Component<EventGraphProps, any> {
    handleWindowsizeChange = (event: React.FormEvent<HTMLInputElement>) => {
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

    onClick = (event: Plotly.PlotMouseEvent) => {
        mobx.runInAction(() => {
            this.props.uiStore.activeNarrativeEventId = this.props.annotationStore.annotations[event.points[0].pointNumber].getId()
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
            }},
            onClick={this.onClick}
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

interface TextViewProps {
    annotationStore: AnnotationStore;
    uiStore: UiStore;
}

@observer
class TextView extends React.Component<TextViewProps> {
    * getRelevantAnnotaitons(this: TextView, start: number, end: number) {
        for (let annotation of this.props.annotationStore.annotations) {
            if (annotation.start >= start && annotation.start <= end) {
                if (annotation.end > end) {
                    console.warn("Annotation across paragraphs");
                    yield annotation;
                } else {
                    yield annotation;
                }
            }
        }
    }

    render() {
        let paragraphs: React.DetailedReactHTMLElement<{}, HTMLElement>[] = [];
        let startIndex: number = 0;
        let n = 0;
        for (let paragraphText of this.props.annotationStore.submitText.split("\n\n")) {
            let annotations = this.getRelevantAnnotaitons(startIndex, startIndex + paragraphText.length)
            let inner: any[] = []
            let paragraphIndex = 0;
            // TODO: this is currently broken annotations in other annotations
            for (let anno of annotations) {
                inner.push(paragraphText.slice(paragraphIndex, anno.start - startIndex));
                let spanStart = anno.start - startIndex;
                let spanEnd = Math.min(
                    anno.end - startIndex,
                    startIndex + paragraphText.length
                );
                let props = {className: "verbPhrase", "id": anno.getId()}
                if (anno.getId() == this.props.uiStore.activeNarrativeEventId) {
                    props.className += " active"
                }
                inner.push(
                    React.createElement(
                        "span",
                        props,
                        paragraphText.slice(spanStart, spanEnd)
                    )
                );
                paragraphIndex = spanEnd;
            }
            inner.push(paragraphText.slice(paragraphIndex, paragraphText.length))
            paragraphs.push(React.createElement("p", {key: "pargraph" + n.toString()}, inner));
            startIndex += paragraphText.length;
            startIndex += 2;
            n++;
        }
        return <div className="textContainer">
            {paragraphs}
        </div>
    }
}