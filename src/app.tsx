import React from "react";
import "reflect-metadata";

import Plot from "react-plotly.js";
import { observer } from "mobx-react";
import * as mobx from "mobx";
import { RootStore, UiStore, AnnotationStore } from "./stores";
import ErrorBox from "./components/errorBox";

import { NarrativeEvent, EventKindUtil } from "./schemas/events";
import LoadingOverlay from "react-loading-overlay";
import { DEFAULT_TEXT } from "./text";
import SizeSelector from "./components/scoreSelector";
import ExplainerBox from "./components/explainerBox";

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
                        <TextForm rootStore={rootStore} />
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

interface TextViewProps {
    annotationStore: AnnotationStore;
    uiStore: UiStore;
}

type Span = {
    start: number,
    end: number,
    isLast: boolean,
    annoId: number,
};

@observer
class TextView extends React.Component<TextViewProps> {
    activeNarrativeEvent: React.RefObject<HTMLSpanElement> = React.createRef();

    scrollToActiveEvent = () => {
        if (this.activeNarrativeEvent.current) {
            this.activeNarrativeEvent.current.scrollIntoView({behavior: "smooth"});
        }
    }

    * getRelevantAnnotaitons(this: TextView, start: number, end: number) {
        for (let annotation of this.props.annotationStore.annotations) {
            if (annotation.start >= start && annotation.start <= end) {
                if (annotation.end > end) {
                    //console.warn("Annotation across paragraphs");
                    yield annotation;
                } else {
                    yield annotation;
                }
            }
        }
    }


    buildSpanList(annotations: NarrativeEvent[]) {
        let spans: Array<[Span, NarrativeEvent]> = [];
        for (let [i, anno] of annotations.entries()) {
            for (let span of anno.spans) {
                spans.push([{
                    start: span[0],
                    end: span[1],
                    isLast: false,
                    annoId: i,
                }, anno]);
            }
        }
        spans.sort((a: [Span, NarrativeEvent], b: [Span, NarrativeEvent]) => {
            if (a[0].start > b[0].start) {
                return 1;
            } else if (a[0].start == b[0].start) {
                return 0;
            } else {
                return -1; 
            }
        });
        let toDelete = [];
        // Sanity check, we don't want overlapping spans!
        for (let i = 0; i < (spans.length - 1); i++) {
            if (spans[i][0].end > spans[i + 1][0].start) {
                //console.warn("Overlapping spans, discarding a span!")
                toDelete.push(i + 1);
            }
        }
        for (let i = 0; i < spans.length; i++) {
            if (Math.abs(spans[i][0].end - spans[i][0].start) <= 2) {
                toDelete.push(i);
            }
        }
        let unqiueDeletions = [...new Set(toDelete)];
        unqiueDeletions.sort((a, b): number => b - a);
        for (let entry of unqiueDeletions) {
           spans.splice(entry, 1);
        }
        let seen: Set<number> = new Set();
        for (let pos = spans.length - 1; pos >= 0; pos--) {
            let currentId = spans[pos][0].annoId;
            if (!seen.has(currentId)) {
                spans[pos][0].isLast = true;
                seen.add(currentId)
            }
        }
        return spans
    }

    buildAnnotationsComponents(text: string, annotations: NarrativeEvent[], startIndex: number) {
        let spans = this.buildSpanList(annotations);
        let inner: any[] = [];
        let indexInParagraph = 0;
        for (let span of spans) {
            inner.push(text.slice(indexInParagraph, span[0].start - startIndex));
            let spanStart = span[0].start - startIndex;
            let spanEnd = Math.min(
                span[0].end - startIndex,
                startIndex + text.length
            );
            let props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> = {
                className: "verbPhrase",
                "id": span[1].getId(),
                onMouseEnter: () => {mobx.runInAction(() => {
                    this.props.uiStore.hoveredNarrativeEventId = span[1].getId();
                })},
                onMouseLeave: () => {mobx.runInAction(() => {
                    this.props.uiStore.hoveredNarrativeEventId = undefined;
                })},
                ref: null
            };
            if (span[1].getId() == this.props.uiStore.activeNarrativeEventId) {
                props.ref = this.activeNarrativeEvent;
                props.className += " activeScrolled"
            }
            if (span[1].getId() == this.props.uiStore.hoveredNarrativeEventId) {
                props.className += " activeHovered"
            }
            let eventKind = EventKindUtil.toString(span[1].predicted);
            let subscriptClass =  "eventKindAnno " + eventKind;
            let span_html: any[] = [text.slice(spanStart, spanEnd)];
            if (span[0].isLast) {
                span_html.push(<sub className={subscriptClass}>{eventKind}</sub>);
            }
            inner.push(
                React.createElement(
                    "span",
                    props,
                    span_html,
                )
            );
            indexInParagraph = spanEnd;
        }
        // Append the rest
        inner.push(text.slice(indexInParagraph, text.length))
        return inner;
    }

    render() {
        let paragraphs: React.DetailedReactHTMLElement<{}, HTMLElement>[] = [];
        let startIndex: number = 0;
        let n = 0;
        for (let paragraphText of this.props.annotationStore.submitText.split("\n\n")) {
            let annotationsIterator = this.getRelevantAnnotaitons(startIndex, startIndex + paragraphText.length)
            let annotations: NarrativeEvent[] = Array.from(annotationsIterator)
            let inner = this.buildAnnotationsComponents(paragraphText, annotations, startIndex);
            paragraphs.push(React.createElement("p", {key: "pargraph" + n.toString()}, inner));
            startIndex += paragraphText.length;
            startIndex += 2;
            n++;
        }
        return <div className="">
            {paragraphs}
        </div>
    }

    componentDidUpdate() {
        if (this.props.uiStore.shouldScrollToEvent) {
            this.scrollToActiveEvent()
            mobx.runInAction(() => {
                this.props.uiStore.shouldScrollToEvent = false;
            })
        } 
    }
}