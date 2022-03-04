import { instanceToPlain, plainToInstance } from 'class-transformer';
import { autorun, runInAction, toJS } from 'mobx';
import { NarrativeEvent } from './schemas/events';
import { AnnotationStore } from './stores';
import { DEFAULT_TEXT } from './text';

export function makeLocalStorage(store: AnnotationStore): void {
    store.submitText = JSON.parse(localStorage.getItem("submitText") || JSON.stringify(DEFAULT_TEXT));
    store.annotations.length = 0;
    for (let item of JSON.parse(localStorage.getItem("annotations") || "[]")) {
        delete item["getId"]
        store.annotations.push(plainToInstance(NarrativeEvent, item))
    }
    
    autorun(() => {
        let data = instanceToPlain(store.annotations);
        localStorage.setItem("annotations", JSON.stringify(data));
        for (const key of ["submitText"]) {
            localStorage.setItem(key, JSON.stringify((store as any)[key]));
        }
    });
}