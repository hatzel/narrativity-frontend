import { plainToInstance } from "class-transformer";
import { gaussianAverage } from "./smoothing";
import { observable, computed } from "mobx";
import * as mobx from "mobx";

import { Response, NarrativeEvent, EventKind, EventKindUtil } from "./schemas/events";


export class RootStore {
    @observable uiStore = new UiStore();
    @observable annotationStore = new AnnotationStore();

    constructor() {
        mobx.makeObservable(this)
    }
}

export class UiStore {
    @observable currentText: string = "";
    @observable activeNarrativeEventId: string | undefined = undefined;
    @observable hoveredNarrativeEventId: string | undefined = undefined;
    shouldScrollToEvent: boolean = false;
    @observable loading = false;
    @observable showingError = false;
    @observable errorText = "";

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

export class EventKindConfig {
    @observable name: string
    @observable eventKind: EventKind
    @observable score: number

    constructor(name: string, eventKind: EventKind, score: number) {
        this.name = name;
        this.eventKind = eventKind;
        this.score = score;
        mobx.makeObservable(this)
    }

    static all(): EventKindConfig[] {
        let out = [];
        let defaultScores = [7, 5, 2, 0];
        for(let i = 0; i < 4; i++) {
            out.push(
                new EventKindConfig(
                    EventKindUtil.toString(i),
                    i,
                    defaultScores[i],
                )
            )
        }
        return out;
    }
}

export class AnnotationStore {
    @observable submitText: string = "";
    @observable annotations: NarrativeEvent[] = [];
    @observable smoothingConfig: SmoothingConfig = new SmoothingConfig();
    @observable eventTypes: EventKindConfig[] = EventKindConfig.all();

    constructor() {
        mobx.makeObservable(this)
    }

    fetchEventAnnotations(text: string, uiStore: UiStore) {
        let promise = fetch("/predictions/ts_test", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({"text": text})
        }).then(response => {
            if (response.ok) {
                response.json().then((data) => {
                    let response = plainToInstance(Response, data as object, { excludeExtraneousValues: true });
                    mobx.runInAction(() => {
                        this.annotations = response.annotations;
                        this.submitText = text;
                    });
                })
            } else {
                mobx.runInAction(() => {
                    uiStore.errorText = "Error response from model server " + response.statusText + " " + response.status.toString();
                    uiStore.showingError = true;
                })
            }
        }).catch((error) => {
            mobx.runInAction(() => {
                uiStore.errorText = "Connection to model server failed!"
                uiStore.showingError = true;
            });
        });
        return promise;
    }

    @computed
    get smoothyValues(): number[] {
        let values = this.yValues.map((el): object => { return {value: el} });
        let smoothed: number[] = [];
        for (let i = 0; i < this.yValues.length; i++) {
            let offset = Math.floor(this.smoothingConfig.windowSize / 2);
            let window = this.yValues.slice(Math.max(0, i - offset), Math.min(this.yValues.length, i + offset))
            smoothed.push(gaussianAverage(window, 5));
        }
        return smoothed;
    }

    @computed
    get yValues(): number[] {
        let eventScores: { [key: string]: number; } = {};
        for (let eventType of this.eventTypes) {
            eventScores[eventType.name] = eventType.score
        }
        return this.annotations.map((anno) => {
            return eventScores[EventKindUtil.toString(anno.predicted)];
        });
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