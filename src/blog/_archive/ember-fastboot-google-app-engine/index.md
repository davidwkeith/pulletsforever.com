---
title: "Ember FastBoot + Google App Engine"
date: 2017-07-13T11:01:00.968Z
tags: [javascript, web]
---
![Ember FastBoot + Google App Engine](fastboot-app-engine.png "With our powers combined!")

Last year, Google Cloud [announced](https://cloudplatform.googleblog.com/2016/03/Node.js-on-Google-App-Engine-goes-beta.html) the Node.js runtime for App Engine. Recently I decided to try to get EmberJS FastBoot to run on App Engine. It turns out a basic implementation is pretty simple.

First, if you don’t already have an engines directive in your package.json, you should add one now. Then then if you project is already compatible, add FastBoot as a dependency:

```bash
ember install ember-cli-fastboot
```

If your project is not compatible, or you would rather use a clean app to test with, follow Tom Dale's [FastBoot Quickstart](http://ember-fastboot.com/quickstart) and use the resulting project for the rest of this post.

Now that you have FastBoot working, simply add the fastboot-app-server module as a deployment dependency to the project.

```bash
npm install -save fastboot-app-server
```

You will also need to move any other modules expected to run on the server from devDependencies to dependencies in your package.json. For the FastBoot Quickstart that means moving ember-fetch. The Quickstart dependencies should look like:

```json
"dependencies": {
    "fastboot-app-server": "1.0.0-rc.5",
    "ember-fetch": "^3.2.8"
    }
```

Next, add a server/main.js file with the following boilerplate code:

```javascript
const FastBootAppServer = require('fastboot-app-server');

let server = new FastBootAppServer({
    distPath: 'dist',
    gzip: true // Optional - Enables gzip compression.
});

server.start();
```

Then update the ‘start’ script in your package.json to initialize the FastBoot server on port 8080:

```json
"start": "PORT=8080 node server/main.js"
```

The final bit of setup is an app.yaml file at the root of your Ember project for App Engine:

```yaml
runtime: nodejs
env: flex

skip_files:
- ^(?!dist|server)\/.*$

handlers:
- url: /assets/
    static_dir: dist/assets
```

Now install [Google Cloud SDK](https://cloud.google.com/sdk/downloads), and follow the directions from the [Quick Start guide](https://cloud.google.com/nodejs/getting-started/hello-world#deploy_and_run_hello_world_on_app_engine) to setup an App Engine project:

1. In the Cloud Platform Console, go to the [Projects page](https://console.cloud.google.com/project) and select or create a new project.

1. [Enable billing](https://support.google.com/cloud/answer/6293499#enable-billing) for your project. (The [Free Tier](https://cloud.google.com/free/) includes a $300 credit, so no worries to try this out for the first time.)

1. Note the Project ID, since it is used for deployment.

1. Initialize the Cloud SDK in your terminal:

```bash
gcloud init
```

Then, to build and deploy, simply run

```bash
ember build --environment production
gcloud app deploy --version 1 --project PROJCET_ID
```

To view your deployed app in the browser run gcloud app browse.

Despite a lack of documentation on getting them to work together, it is almost as if FastBoot and App Engine were built with each other in mind. The actual unique configuration between the two tools boils down to seven lines of config in app.yaml.

*The full source code for the [FastBoot Quickstart](http://ember-fastboot.com/quickstart) project that I converted to App Engine is in my [fastboot-app-engine-example](https://gitlab.com/davidwkeith/fastboot-app-engine-example) aGitLab repo. Feel free to submit PRs for improvements.*
