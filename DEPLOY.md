# Deployment guide for EC2

To deploy this on EC2, you will need to make sure:

1. You have an AL2 EC2 instance.
2. The instance has a security group associated that allows incoming ports
   80 and 443 (but not necessarily 2000). All outgoing ports should be allowed.
3. You have already deployed the host and client apps. We assume the URLs
   for these apps are perform.crowdloop.ca and crowdloop.ca, respectively.
4. You have pointed your domain to the server, assumed to be
   server.crowdloop.ca.

Now, ssh into your instance and start installing the dependencies!

## Dependencies

### NVM

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm i node
```

### ffmpeg

Note that the following instructions will be outdated by the time you use them.
Replace `ffmpeg-git-20211108-amd64-static` with the folder that is present in
the latest release.

```sh
sudo su -
cd /usr/local/bin
mkdir ffmpeg
cd ffmpeg
wget https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz
tar xvf ffmpeg-git-amd64-static.tar.xz
rm -f ffmpeg-git-amd64-static.tar.xz
mv ffmpeg-git-20211108-amd64-static/ffmpeg .
rm -rf ffmpeg-git-20211108-amd64-static
ln -s /usr/local/bin/ffmpeg/ffmpeg /usr/bin/ffmpeg
exit
```

### Redis

```sh
sudo su -
yum -y install gcc make
cd /usr/local/src/
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
rm -f redis-stable.tar.gz
cd redis-stable
yum groupinstall "Development Tools"
make distclean
make
yum install -y tcl
make test # optional
cp src/redis-server /usr/local/bin/
cp src/redis-cli /usr/local/bin/

# Configure redis
mkdir /etc/redis/
cp src/redis.conf /etc/redis/

echo 'alias redis-server="redis-server /home/ec2-user/redis/redis.conf"' >> ~/.bashrc
exit
```

Change `/etc/redis/redis.conf` with the following changes

```
supervised systemd
dir /var/lib/redis
```

Then change the systemd unit file `/etc/systemd/system/redis.service`:

```
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
User=redis
Group=redis
ExecStart=/usr/local/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/local/bin/redis-cli shutdown
Restart=always

[Install]
WantedBy=multi-user.target
```

Finally, create the redis user, group, directories

```
sudo groupadd redis
sudo useradd --system -g redis --no-create-home redis
sudo mkdir /var/lib/redis
sudo chown redis:redis /var/lib/redis
sudo chmod 770 /var/lib/redis
```

To start redis:

```sh
sudo systemctl start redis
```

To make it start on boot:

```sh
sudo systemctl enable redis
```

### git

```sh
sudo yum install git
git clone https://github.com/gzinck/crowdloop-server
```

### SSL/TLS

To get a certificate, use [this tutorial](https://dev.to/greenteabiscuit/using-let-s-encrypt-on-aws-ec2-instance-2aca).
You use an `httpd` server and Let's Encrypt to create credentials.

The certificate and private key are at:

```
/etc/letsencrypt/live/server.crowdloop.ca/fullchain.pem
/etc/letsencrypt/live/server.crowdloop.ca/privkey.pem
```

To use these in the server, edit `/etc/httpd/conf/httpd.conf` (requires root)
and add the following to the `<VirtualHost *:80>`

```
RewriteEngine On
RewriteCond %{HTTP:UPGRADE}    ^WebSocket$             [NC]
RewriteCond %{HTTP:CONNECTION} Upgrade$                [NC]
RewriteCond %{REQUEST_URI}     ^/socket.io             [NC]
RewriteCond %{QUERY_STRING}    transport=websocket     [NC]
RewriteRule /(.*)              ws://localhost:2000/$1  [P,L]

ProxyPass        /socket.io http://localhost:2000/socket.io
ProxyPassReverse /socket.io http://localhost:2000/socket.io
```

If you also want the server to be accessible over HTTPS, edit `/etc/httpd/conf.d/ssl.conf` (requires root)
and add the following to the `<VirtualHost *:443>` (you need to rename the `_default_:443` to `*:443`).

```
RewriteEngine On
RewriteCond %{HTTP:UPGRADE}    ^WebSocket$             [NC]
RewriteCond %{HTTP:CONNECTION} Upgrade$                [NC]
RewriteCond %{REQUEST_URI}     ^/socket.io             [NC]
RewriteCond %{QUERY_STRING}    transport=websocket     [NC]
RewriteRule /(.*)              ws://localhost:2000/$1  [P,L]
SSLProxyEngine On
ProxyRequests Off
ProxyPreserveHost On
ProxyVia Full
ProxyPass        /socket.io http://localhost:2000/socket.io
ProxyPassReverse /socket.io http://localhost:2000/socket.io
```

In this file, you might also need to point the certificate and key files for SSH,
which have already been configured.

```
#   Server Certificate:
# Point SSLCertificateFile at a PEM encoded certificate.  If
# the certificate is encrypted, then you will be prompted for a
# pass phrase.  Note that a kill -HUP will prompt again.  A new
# certificate can be generated using the genkey(1) command.
SSLCertificateFile /etc/letsencrypt/live/server.crowdloop.ca/fullchain.pem
#   Server Private Key:
#   If the key is not combined with the certificate, use this
#   directive to point at the key file.  Keep in mind that if
#   you've both a RSA and a DSA private key you can configure
#   both in parallel (to also allow the use of DSA ciphers, etc.)
SSLCertificateKeyFile /etc/letsencrypt/live/server.crowdloop.ca/privkey.pem
```

Restart the Apache server with `sudo systemctl restart httpd`.

You won't need to configure certificates in node because Apache handles it all! Just make sure Apache is always running.

## Running CrowdLoop Server

### Running node in foreground

Add the following to the environment to make sure CORS is used properly.
(This assumes these are the correct domains for the client and host.)

```
export HOST1='https://crowdloop.ca'
export HOST2='https://perform.crowdloop.ca'
```

Then run `npm run build && npm run start`.

### Running node in background

Create a `/etc/systemd/system/crowdloop.service` file as follows.
(This assumes these are the correct domains for the client and host.)

```
[Unit]
Description=CrowdLoop Server

[Service]
ExecStart=/home/ec2-user/git/crowdloop-server/bin
Restart=always
# User=nobody
# Note Debian/Ubuntu uses 'nogroup', RHEL/Fedora uses 'nobody'
# Group=nogroup
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
Environment=HOST1=https://crowdloop.ca
Environment=HOST2=https://perform.crowdloop.ca
WorkingDirectory=/home/ec2-user/git/crowdloop-server

[Install]
WantedBy=multi-user.target
```

Then, run the following:

```sh
sudo systemctl start crowdloop # start
sudo systemctl enable crowdloop # enable on boot
journalctl -u crowdloop # see logs if there was a problem
```

## Setting up the host and client

For the CrowdLoop host and CrowdLoop client, add the following to a `.env` file in the root directory:

```
REACT_APP_SERVER_URL=https://server.crowdloop.ca
```

This makes the client/host point to the server on port 443 (Apache httpd).
This is then forwarded to the server on port 2000 (which is not secure).

## Useful debugging notes

- To see all ports in use, use `sudo lsof -i -P -n | grep LISTEN`
- To find a process on a port, use `fuser {{PORT}}/tcp`. To kill it, use `fuser -k {{PORT}}/tcp`.

Consider setting up auto-renewal by scrolling down [in these instructions from aws](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/SSL-on-amazon-linux-2.html).

References:

- [Redis config](https://www.digitalocean.com/community/tutorials/how-to-install-and-configure-redis-on-ubuntu-16-04)
- [Node.js in the background](https://stackoverflow.com/questions/4018154/how-do-i-run-a-node-js-app-as-a-background-service)
