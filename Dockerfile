FROM debian:stable-slim

MAINTAINER Sascha Meiers meiers@embl.de

# Install Last (and clean up afterwards)
# Note: pthreads should be already pre-installed
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        make \
        g++ \
        mercurial \
    && cd /opt \
    && hg clone http://last.cbrc.jp/last/ \
    && cd /opt/last \
    && make \
    && make install \
    && cd /opt/ \
    && rm -r /opt/last \
    && apt-get remove -y  make g++ mercurial \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*


# Install Mummer3
RUN apt-get update \
    && apt-get install --no-install-recommends -y mummer \
    && rm -rf /var/lib/apt/lists/*

# Install maze
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        python \
        python-pip \
        git \
    && cd /opt \
    && git clone https://github.com/dellytools/maze.git \
    && cd /opt/maze \
    && cat requirements/python2.7.txt | xargs pip install \
    && apt-get remove -y  python-pip git \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*


# default command
CMD ["python", "/opt/maze/maze_server.py", "--host=0.0.0.0"]
