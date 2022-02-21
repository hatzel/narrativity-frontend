import { Expose, Type, Transform } from "class-transformer";

enum EventType {
    NON_EVENT = 0,
    CHANGE_OF_STATE = 1,
    PROCESS = 2,
    STATIVE_EVENT = 3,
}

class EventTypeUtil {
    static fromString(name: string) {
        if (name == "non_event") {
            return EventType.NON_EVENT;
        }
        if (name == "change_of_state") {
            return EventType.CHANGE_OF_STATE;
        }
        if (name == "process") {
            return EventType.PROCESS;
        }
        if (name == "stative_event") {
            return EventType.STATIVE_EVENT;
        }
        throw "Invalid Event variant" + name;
    }

    static toString(eventType: EventType) {
        if (eventType == EventType.NON_EVENT) {
            return "non_event";
        }
        if (eventType == EventType.CHANGE_OF_STATE) {
            return "change_of_state";
        }
        if (eventType == EventType.PROCESS) {
            return "process";
        }
        if (eventType == EventType.STATIVE_EVENT) {
            return "stative_event";
        }
    }
}

export class Event {
    @Expose() start: bigint
    @Expose() end: bigint
    @Expose() spans: Array<[bigint, bigint]>

    @Transform(({ value }) => EventTypeUtil.fromString(value), { toClassOnly: true })
    @Expose() predicted: EventType

    @Expose() predicted_score: bigint

    constructor(start: bigint, end: bigint, spans: Array<[bigint, bigint]>, predicted: EventType, predicted_score: bigint) {
        this.start = start;
        this.end = end;
        this.spans = spans;
        this.predicted = predicted;
        this.predicted_score = predicted_score;
    }
}

export class Response {
    @Expose() text: string
    @Expose() annotations: Array<Event>

    constructor(text: string, annotations: Array<Event>) {
        this.text = text
        this.annotations = annotations
    }
}
