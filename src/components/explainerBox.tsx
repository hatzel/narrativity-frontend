import { observer } from "mobx-react";
import React from "react";

let citation = `
@inproceedings{vauthAutomatedEventAnnotation2021,
    title = {Automated {{Event Annotation}} in {{Literary Texts}}},
    booktitle = {Proc. {{CHR}}},
    author = {Vauth, Michael and Hatzel, Hans Ole and Gius, Evelyn and Biemann, Chris},
    year = {2021},
    month = nov,
    volume = {2989},
    pages = {333--345},
    publisher = {{CEUR}},
    address = {{Amsterdam, the Netherlands}},
    issn = {1613-0073},
    url = {http://ceur-ws.org/Vol-2989/#short_paper18},
}
`

interface ExplainerBoxProps {
    visible: boolean;
    toggleCallback: React.MouseEventHandler<HTMLDivElement>;
}

@observer
export default class ExplainerBox extends React.Component<ExplainerBoxProps, any> {
    static HEADLINE: string = "What's going on?";

    render() {
        let content = <></>
        let icon = "+"
        if (this.props.visible) {
            icon = "-"
            content = <div className="explainerContent">
                <div>
                    <p>
                        This is a demo for our paper "Automated Event Annotation in Literary Texts". We attempt to model narrativity in literary documents.
                        In general terms, we classify each verb phrase into one of four event categories, the graphs you see are an indication of where in the text you find categories that are considered to be more narrative.
                        Check out <a href="https://www.inf.uni-hamburg.de/en/inst/ab/lt/publications/2021-vauth-hatzel-chr.pdf">our paper</a> for details on the methodology.
                    </p>

                    <p><b>As a first step:</b> we recommend you play around with the provided example text. Press "Submit" to predict the narrativity progression throught the short provided text segment.</p>
                    <ul>
                        <li>Press "Submit"</li>
                        <li>Wait for the computation to finish</li>
                        <li>Change <i>Window Size</i> and the scores for individual event categories as desired</li>
                        <li>Click on the graph in a section of interest</li>
                        <li>Use the text view on the right to explore the section in detail</li>
                    </ul>

                    <p>You may hide this information by pressing the '-' button next to the headline.</p>
                </div>
                <div>
                    Please cite us as follows if you use this for your work:
                    <pre>{citation}</pre>
                </div>
            </div>
        }
        return <div className="explainerBox">
            <div className="explainerHeading">
                <h3>{ExplainerBox.HEADLINE}</h3>
                <div className="clickable" onClick={(e) => this.props.toggleCallback(e)}><b>{icon}</b></div>
            </div>
            {content}
        </div>

    }
}