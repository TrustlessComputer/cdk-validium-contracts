FROM node:18.17.1-bullseye

ADD . /cdk-validium-contracts

RUN /bin/sh -c set -eux; apt-get update; apt-get install -y --no-install-recommends ca-certificates curl gnupg netbase wget git mercurial openssh-client subversion procps; rm -rf /var/lib/apt/lists/*

RUN /bin/sh -c set -ex; apt-get update; apt-get install -y --no-install-recommends 	autoconf automake bzip2 dpkg-dev file g++ gcc imagemagick libbz2-dev libc6-dev libcurl4-openssl-dev libdb-dev libevent-dev libffi-dev libgdbm-dev libglib2.0-dev libgmp-dev libjpeg-dev libkrb5-dev liblzma-dev libmagickcore-dev libmagickwand-dev libmaxminddb-dev libncurses5-dev libncursesw5-dev libpng-dev libpq-dev libreadline-dev libsqlite3-dev libssl-dev libtool libwebp-dev libxml2-dev libxslt-dev libyaml-dev make patch unzip xz-utils zlib1g-dev 		$( 	if apt-cache show 'default-libmysqlclient-dev' 2>/dev/null | grep -q '^Version:'; then 		echo 'default-libmysqlclient-dev'; else echo 'libmysqlclient-dev'; 	fi ) ; rm -rf /var/lib/apt/lists/*

ENV NODE_VERSION=18.17.1

ENV YARN_VERSION=1.22.19

WORKDIR /cdk-validium-contracts

RUN npm install

CMD ["/bin/sh"]