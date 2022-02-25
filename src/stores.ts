import { plainToInstance } from "class-transformer";
import * as tidy from "@tidyjs/tidy";
import { observable, computed } from "mobx";
import * as mobx from "mobx";

import { Response, NarrativeEvent } from "./schemas/events";


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

export class AnnotationStore {
    @observable submitText: string = "";
    @observable annotations: NarrativeEvent[] = [];
    @observable smoothingConfig: SmoothingConfig = new SmoothingConfig();

    constructor() {
        mobx.makeObservable(this)
    }

    fetchEventAnnotations(text: string, uiStore: UiStore) {
        let promise = fetch("http://localhost:8080/predictions/ts_test", {
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