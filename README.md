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

Finally, to support all browsers, we need to be able to convert webm to mp4 with ffmpeg.

```
brew install ffmpeg
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

## Distribution

To deploy, do the following:

1. Install ffmpeg, redis, nvm, node.
2. Point DNS to server.
3. Get an HTTPS certificate via Let's Encrypt.
4. Configure the following four environment variables before running:
```
CERT='/etc/letsencrypt/live/server.crowdloop.ca/fullchain.pem'
KEY='/etc/letsencrypt/live/server.crowdloop.ca/privkey.pem'
HOST1='https://crowdloop.ca'
HOST2='https://perform.crowdloop.ca'
```


