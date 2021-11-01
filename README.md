# CrowdLoop Server

This is a server for the [CrowdLoop](https://github.com/gzinck/crowdloop) application
which sends loops to phones connected to the server.

## Setup

Using node 16, run the following:

```
npm i
npm run prepare
```

You will also need to run a redis server locally. Install redis with the following on macOS:

```
brew install redis
```

## Usage

Start up redis in a new terminal with `redis-server` and run the following to
compile and run the server as you make changes:

```
npm run watch
```

To build and run without watching for changes:

```
npm run build
npm run start
```

The compiled code is in `dist/`.
