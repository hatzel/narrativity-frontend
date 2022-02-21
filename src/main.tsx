import ReactDOM from "react-dom";
import { App, RootStore } from "./app"

let rootStore: RootStore = new RootStore();
const container: HTMLElement | null = document.getElementById("app");
ReactDOM.render(<App rootStore={rootStore}/>, container)
