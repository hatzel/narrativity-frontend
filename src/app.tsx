import React from "react";
import PropTypes from "prop-types";
import "reflect-metadata";

import Plot from "react-plotly.js";
import { observer } from "mobx-react";
import { observable } from "mobx";
import { plainToInstance } from "class-transformer";

import { Response, Event } from "./schemas/events";

export class RootStore {
    @observable uiStore = new UiStore();
    @observable annotationStore = new AnnotationStore();
}

class UiStore {
    @observable currentText: string = "";
}

class AnnotationStore {
    @observable submitText: string = "";
    @observable annotations: Array<Event> = [];

    async getEventAnnotations(text: string) {
        // let data = plainToInstance(Response, {
        //   "text": "Er sagte zu mir: \"Ich springe!\"",
        //   "annotations": [
        //     {
        //       "start": 0,
        //       "end": 31,
        //       "spans": [
        //         [
        //           0,
        //           15
        //         ],
        //         [
        //           17,
        //           29
        //         ],
        //         [
        //           30,
        //           31
        //         ]
        //       ],
        //       "predicted": "process",
        //       "predicted_score": 5,
        //     }
        //   ]
        // });
        // console.log(data);
        // // debugger;
        let promise = fetch("http://localhost:8080/predictions/ts_test", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({"text": text})
        }).then(resp => resp.json()).then(data => {
            console.log(data);
            return plainToInstance(Response, data)
        });
        let result: Response = (await promise) as unknown as Response;
        debugger;
        console.log(this.annotations)
        this.annotations = result.annotations;
        console.log(result.annotations);
    }
}

interface AppProps {
    rootStore: RootStore,
};

@observer
export class App extends React.Component<AppProps, any> {
    render() {
        const {rootStore} = this.props
        return <div>
            <TextForm rootStore={rootStore}/>
            <EventGraph/>
        </div>
    }
}

interface TextFormProps {
    rootStore: RootStore
}

class TextForm extends React.Component<TextFormProps, any> {
    handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        this.props.rootStore.uiStore.currentText = event.currentTarget.inputText.value;
        this.props.rootStore.annotationStore.getEventAnnotations(this.props.rootStore.uiStore.currentText);
        event.preventDefault();
        console.log(event);
    }

    render() {
        return <div>
            <form onSubmit={this.handleSubmit} id="inputForm">
                <textarea name="inputText" />
                <button type="submit">Submit</button>
            </form>
        </div>
    }
}

class EventGraph extends React.Component {
    render = () => {
        return (<Plot
            layout={{title: "Event Plot"}}
            data={[{
                x: [1, 2, 3],
                y: [2, 6, 4],
                type: 'scatter'
            }]} />
        );
    }
}
