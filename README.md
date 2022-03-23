# Narrativity Graph Webinterface

This is a web frontend to use the models created in our paper ["Automated Event Annotation in Literary Texts"](https://www.inf.uni-hamburg.de/en/inst/ab/lt/publications/2021-vauth-hatzel-chr.pdf).

![Screenshot](/img/screenshot.png)

Currently the models are not publicly available but they will be added here once they are.

## Development Setup
Make sure yarn is installed and run:
* `yarn install`
* `yarn start`

This will start the frontend including a proxy to models on localhost:8080, enabling relative paths to work for the model url.


## Deployment
* `yarn build-docker`
* `cd docker`
* `docker build -t narrativity-frontend`

When running the resulting docker container, supply the model server base URL and the path to precomputed JSON files like this:
`docker run -e INFERENCE_URL="http://localhost:8080/" -v /host/path/to/json/files:/predictions -it narrativity-frontend`