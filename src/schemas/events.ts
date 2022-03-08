import { Expose, Type, Transform } from "class-transformer";

export enum EventKind {
    CHANGE_OF_STATE = 0,
    PROCESS = 1,
    STATIVE_EVENT = 2,
    NON_EVENT = 3,
}

export class EventKindUtil {
    static fromString(name: string) {
        if (name == "non_event") {
            return EventKind.NON_EVENT;
        }
        if (name == "change_of_state") {
            return EventKind.CHANGE_OF_STATE;
        }
        if (name == "process") {
            return EventKind.PROCESS;
        }
        if (name == "stative_event") {
            return EventKind.STATIVE_EVENT;
        }
        throw "Invalid Event variant" + name;
    }

    static toString(eventType: EventKind): string {
        if (eventType == EventKind.NON_EVENT) {
            return "non_event";
        }
        if (eventType == EventKind.CHANGE_OF_STATE) {
            return "change_of_state";
        }
        if (eventType == EventKind.PROCESS) {
            return "process";
        }
        if (eventType == EventKind.STATIVE_EVENT) {
            return "stative_event";
        }
        throw "Illeagal variant"
    }
}

export class NarrativeEvent {
    @Expose()
    start: number
    @Expose()
    end: number
    @Expose()
    spans: Array<[number, number]>

    @Expose()
    @Transform(({ value }) => EventKindUtil.fromString(value), { toClassOnly: true })
    @Transform(({ value }) => EventKindUtil.toString(value), { toPlainOnly: true })
    predicted: EventKind

    @Expose({name: "predicted_score"}) predictedScore: number

    getId = (): string => {
        return "span" + this.start.toString() + "_" + this.end.toString();
    }

    constructor(start: number, end: number, spans: Array<[number, number]>, predicted: EventKind, predictedScore: number) {
        this.start = start;
        this.end = end;
        this.spans = spans;
        this.predicted = predicted;
        this.predictedScore = predictedScore;
    }
}

export class Response {
    text: string
    @Expose()
    @Type(() => NarrativeEvent)
    annotations: NarrativeEvent[];

    constructor(text: string, annotations: NarrativeEvent[]) {
        this.text = text
        this.annotations = annotations
    }
}
