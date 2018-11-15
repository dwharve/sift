FROM ubuntu:16.04

ENV SUDO_USER root

RUN apt-get -qq update
RUN apt-get -yq install wget bash curl
RUN curl -o /usr/local/bin/sift -L "https://github.com/sans-dfir/sift-cli/releases/download/v1.7.1/sift-cli-linux"
RUN chmod +x /usr/local/bin/sift
RUN useradd -m sift
RUN bash -c "sift install --user=sift"
RUN mkdir /data
RUN pip install -U pyopenssl

RUN apt-get -yq install nodejs
RUN apt-get -yq install npm
RUN mkdir /opt/frontend
WORKDIR /opt/frontend
COPY package.json /opt/frontend/package.json
RUN npm install express elasticsearch base-64
COPY index.js /opt/frontend/index.js
COPY kit-sift /opt/frontend/kit-sift
COPY instructions.html /opt/frontend/instructions.html
CMD nodejs index.js
