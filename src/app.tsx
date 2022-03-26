import React from "react";
import "reflect-metadata";

import Plot from "react-plotly.js";
import { observer } from "mobx-react";
import * as mobx from "mobx";
import { RootStore, UiStore, AnnotationStore } from "./stores";

import LoadingOverlay from "react-loading-overlay";
import { DEFAULT_TEXT } from "./text";
import TextView from "./components/textView";
import ErrorBox from "./components/errorBox";
import SizeSelector from "./components/scoreSelector";
import ExplainerBox from "./components/explainerBox";
import Library from "./components/library";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";

mobx.configure({
    enforceActions: "always",
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    observableRequiresReaction: true,
    disableErrorBoundaries: true
})


interface AppProps {
    rootStore: RootStore,
};

@observer
export class App extends React.Component<AppProps, any> {
    render() {
        const {rootStore} = this.props
        let errorBox;
        if (rootStore.uiStore.showingError) {
            errorBox = <div className="errorBox"><p>{rootStore.uiStore.errorText}</p></div>
        } else {
            errorBox = <></>
        }
        let contentSources = <>
            <Tabs>
                <TabList>
                    <Tab>Precomputed Texts</Tab>
                </TabList>

                <TabPanel>
                    <Library books={this.props.rootStore.annotationStore.preannotatedIndex} uiStore={this.props.rootStore.uiStore} annotationStore={this.props.rootStore.annotationStore}/>
                </TabPanel>
            </Tabs>
        </>
        if (rootStore.annotationStore.predictionServerAvailable) {
            contentSources = <>
                <Tabs>
                    <TabList>
                        <Tab>Custom Text</Tab>
                        <Tab>Precomputed Texts</Tab>
                    </TabList>

                    <TabPanel>
                        <TextForm rootStore={rootStore} />
                    </TabPanel>
                    <TabPanel>
                        <Library books={this.props.rootStore.annotationStore.preannotatedIndex} uiStore={this.props.rootStore.uiStore} annotationStore={this.props.rootStore.annotationStore}/>
                    </TabPanel>
                </Tabs>
            </>
        } 
        return <>
                <ExplainerBox
                    visible={this.props.rootStore.uiStore.showingExplainerBox}
                    toggleCallback={() => mobx.runInAction(() => {
                        this.props.rootStore.uiStore.showingExplainerBox = !this.props.rootStore.uiStore.showingExplainerBox
                    })}
                />
                <LoadingOverlay
                    active={rootStore.uiStore.loading}
                    spinner
                    text="Running Model"
                >
                    <div className="column controlContainer">
                        <ErrorBox
                            text={this.props.rootStore.uiStore.errorText}
                            visible={this.props.rootStore.uiStore.showingError}
                            closeCallback={() => {this.props.rootStore.uiStore.showingError = false}}
                        />
                        {contentSources}
                        <hr></hr>
                        <EventGraph annotationStore={rootStore.annotationStore} uiStore={rootStore.uiStore} />
                        <SizeSelector annotationStore={this.props.rootStore.annotationStore} />
                    </div>
                    <div className="column textContainer">
                        <TextView annotationStore={rootStore.annotationStore} uiStore={rootStore.uiStore} />
                    </div>
                </LoadingOverlay>
            </>
    }
}

interface TextFormProps {
    rootStore: RootStore
}

@observer
class TextForm extends React.Component<TextFormProps, any> {
    handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        mobx.runInAction(() => {
            this.props.rootStore.uiStore.loading = true;
            this.props.rootStore.uiStore.currentText = event.currentTarget.inputText.value;
            this.props.rootStore.annotationStore.fetchEventAnnotations(this.props.rootStore.uiStore.currentText, this.props.rootStore.uiStore).then(() => {
                mobx.runInAction(() => {
                    this.props.rootStore.uiStore.loading = false;
                })
            });
        });
        event.preventDefault();
    }

    render() {
        return <div className="formContainer">
            <form onSubmit={this.handleSubmit} id="inputForm">
                <textarea name="inputText" defaultValue={DEFAULT_TEXT}/>
                <button type="submit">Submit</button>
            </form>
        </div>
    }
}

let smoothingSliderSteps = (): Partial<Plotly.SliderStep>[] => {
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
        if (event.slider.currentvalue.prefix?.startsWith("Window Size")) {
            mobx.runInAction(() => {
                this.props.annotationStore.smoothingConfig.windowSize = parseInt(event.step.label);
            });
        } else {

        }
    }

    onClick = (event: Plotly.PlotMouseEvent) => {
        mobx.runInAction(() => {
            this.props.uiStore.activeNarrativeEventId = this.props.annotationStore.annotations[event.points[0].pointNumber].getId()
            this.props.uiStore.shouldScrollToEvent = true;
        });
    }

    buildSliders(): Partial<Plotly.Slider>[] {
        let sliders: Partial<Plotly.Slider>[] = [{
            pad: {t: 80},
            currentvalue: {
                xanchor: "left",
                prefix: "Window Size: ",
                font: {
                    color: '#888',
                    size: 12
                }
            },
            steps: smoothingSliderSteps()
        }];
        return sliders;
    }

    render() {
        return <div className="plotContainer"><Plot
            layout={{
                title: "Narrativity Plot",
                autosize: false,
                xaxis: {
                    range: [0, this.props.annotationStore.annotations.length],
                    title: {
                        text: "Event Index"
                    }
                },
                yaxis: {
                    range: [0, Math.max(...this.props.annotationStore.eventTypes.map((et) => et.score))],
                    title: {
                        text: "Smoothed Narrativity Score"
                    }
                },
                width: 800,
                height: 400,
                sliders: this.buildSliders(),
                transition: {
                    easing: "linear",
                    duration: 300
                }
            }}
            config={{
                displaylogo: false
            }}
            onClick={this.onClick}
            data={[{
                x: this.props.annotationStore.xValues,
                y: this.props.annotationStore.smoothyValues,
                text: this.props.annotationStore.texts,
                type: 'scatter'
            }]}
            onSliderChange={this.sliderChange}
        /></div>
    }
}