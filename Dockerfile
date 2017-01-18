FROM debian:stable-slim

MAINTAINER Sascha Meiers meiers@embl.de

# Install Last (and clean up afterwards)
# Note: pthreads should be already pre-installed
RUN apt-get update \
    && apt-get install -y make g++ mercurial \
    && cd /opt \
    && hg clone http://last.cbrc.jp/last/ \
    && cd /opt/last \
    && make \
    && make install \
    && cd /opt/ \
    && rm -r /opt/last \
    && apt-get remove -y  make g++ mercurial \
    && apt-get autoremove -y


# Install Mummer3
RUN apt-get install -y mummer

# Install maze
RUN apt-get update \
    && apt-get install -y \
        python \
        python-pip \
        git \
    && cd /opt \
    && git clone https://github.com/meiers/svvis \
    && cd /opt/svvis \
    && rm -rf suave \
    && cat maze/requirements/python2.7.txt | xargs pip install \
    && apt-get remove -y  python-pip git \
    && apt-get autoremove -y


# default command
CMD ["python", "/opt/svvis/maze/maze_server.py", "--host=0.0.0.0"]
