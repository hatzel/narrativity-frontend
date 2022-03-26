import React from "react";
import { AnnotationStore, UiStore } from "../stores";
import { NarrativeEvent, EventKindUtil } from "../schemas/events";
import { observer } from "mobx-react";
import * as mobx from "mobx";

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
export default class TextView extends React.Component<TextViewProps> {
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