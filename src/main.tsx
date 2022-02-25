import ReactDOM from "react-dom";
import { App } from "./app"
import { RootStore } from "./stores"

let rootStore: RootStore = new RootStore();
const container: HTMLElement | null = document.getElementById("app");
ReactDOM.render(<App rootStore={rootStore}/>, container)
