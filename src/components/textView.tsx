import React, { useImperativeHandle } from "react";
import { AnnotationStore, UiStore } from "../stores";
import { NarrativeEvent, EventKindUtil } from "../schemas/events";
import { observer } from "mobx-react";
import * as mobx from "mobx";
import { useVirtual } from "react-virtual";

interface TextViewProps {
    annotations: NarrativeEvent[];
    annotationsByStart: { [key: number]: NarrativeEvent[] }
    paragraphs: string[];
    uiStore: UiStore;
    idToParagraph: { [key: string]: number };
}

export function buildAnnoIdToParagraphIndex(annotations: NarrativeEvent[], paragraphs: string[]): { [key: string]: number }{
    let out: { [key: string]: number } = {};
    let currentParagraph = 0;
    let currentOffset = paragraphs[currentParagraph].length;
    for (let anno of annotations) {
        if (anno.start > currentOffset) {
            currentParagraph += 1;
            if (currentParagraph < paragraphs.length) {
                currentOffset += paragraphs[currentParagraph].length;
            } else {
                break;
            }
        }
        out[anno.getId()] = currentParagraph;
    }
    return out;
}

export function buildAnnotationsByStart(annotations: NarrativeEvent[]) {
    let starts: { [key: number]: NarrativeEvent[] } = {}
    for (let annotation of annotations) {
        let current = starts[annotation.start];
        if (current !== undefined) {
            starts[annotation.start].push(annotation)
        } else {
            starts[annotation.start] = [annotation]
        }
    }
    return starts
}

type Span = {
    start: number,
    end: number,
    isLast: boolean,
    annoId: number,
};

function getParagraphExtents(paragraphTexts: string[]) {
    let startIndex = 0;
    let extents: [number, number][] =  [];
    for (let paragraphText of paragraphTexts) {
        extents.push([startIndex, startIndex + paragraphText.length]);
        startIndex += paragraphText.length;
        startIndex += 2;
    }
    return extents;
}

function * getRelevantAnnotaitons(annotationsByStart: { [key: number]: NarrativeEvent[] }, start: number, end: number) {
    for (let i = start; i <= end; i++) {
        for (let anno of (annotationsByStart[i] || [])) {
            yield anno
        }
    }
}


interface ScrollableRef {
  scrollToIndex: (index: number, options?: any) => void
}

interface ScrollableProps {
    virtual: ScrollableRef;
    idToParagraph: { [key: string]: number };
}

export class Scroller extends React.Component<ScrollableProps> {
    scrollToId(id: string) {
        let index: number = this.props.idToParagraph[id];
        this.props.virtual.scrollToIndex(index);
    }

    render() {
        return <></>
    }
}

export const TextView = React.forwardRef<any, TextViewProps>((props, innerRef) => {
    let paragraphTexts = props.paragraphs;
    const parentRef = React.useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtual({
        parentRef: parentRef,
        size: paragraphTexts.length
    });


    let paragraphs: React.DetailedReactHTMLElement<{}, HTMLElement>[] = [];
    let startIndex: number = 0;
    let n = 0;
    let extents = getParagraphExtents(paragraphTexts);
    return <div className="" ref={parentRef} style={{
        height: '100%',
        width: '100%',
        overflow: 'auto',
    }}>
        <Scroller ref={innerRef} virtual={rowVirtualizer} idToParagraph={props.idToParagraph}></Scroller>
        <div
          style={{
            height: rowVirtualizer.totalSize,
            width: '100%',
            position: 'relative',
          }}
        >
        {rowVirtualizer.virtualItems.map((virtualRow: any) => {
            let extent = extents[virtualRow.index];
            let annotationsIterator = getRelevantAnnotaitons(props.annotationsByStart, extent[0], extent[1]);
            let annotations: NarrativeEvent[] = Array.from(annotationsIterator)
            let inner = <Annotation text={paragraphTexts[virtualRow.index]} annotations={annotations} startIndex={extent[0]} uiStore={props.uiStore}/>;
            return <div
                key={virtualRow.index}
                ref={virtualRow.measureRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    padding: '7px 40px',
                    width: "calc(100% - 80px)",
                    transform: `translateY(${virtualRow.start}px)`
                }}
            >
                <div style={{height: paragraphTexts[virtualRow.index]}}>
                    {inner}
                </div>
            </div>
        })}
        </div>
    </div>
})

interface AnnotationProps {
    text: string,
    annotations: NarrativeEvent[],
    startIndex: number,
    uiStore: UiStore,
}

@observer
class Annotation extends React.Component<AnnotationProps> {
    render() {
        let text = this.props.text;
        let startIndex = this.props.startIndex;
        let spans = this.buildSpanList(this.props.annotations);
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
}
