import { runInAction } from "mobx";
import ReactDOM from "react-dom";
import { App } from "./app"
import { makeLocalStorage } from "./local-storage";
import { AnnotationStore, RootStore } from "./stores"

let rootStore: RootStore = new RootStore();
runInAction(() => {makeLocalStorage(rootStore.annotationStore)});
const container: HTMLElement | null = document.getElementById("app");
ReactDOM.render(<App rootStore={rootStore} />, container)
