#! /usr/bin/env python

from __future__ import print_function, division
import click
from flask import Flask, render_template, request, make_response
from tempfile import NamedTemporaryFile
import os
import gzip
import json
from readfq import readfq
import maze
import maze_breakpoints
import re
import inspect

app = Flask(__name__)
cfg = {}
absPath = os.path.dirname(os.path.abspath(inspect.stack()[0][1]))


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/matches', methods=['POST'])
def data():
    args = request.form
    length = int(args['length'])
    match_type = args['matches']
    refs = json.loads(args['ref'])
    queries = json.loads(args['query'])

    m = []
    # pairwise mode:
    if len(queries) == len(refs):
        for ref, query in zip(refs, queries):
            with NamedTemporaryFile(delete=False) as f_ref, \
                 NamedTemporaryFile(delete=False) as f_query:
                fn_ref = f_ref.name
                print('>{}'.format(ref['name']), file=f_ref)
                print(ref['seq'], file=f_ref)
                fn_query = f_query.name
                print('>{}'.format(query['name']), file=f_query)
                print(query['seq'], file=f_query)        
            # close file. Otherwise an error occurs from time to time
            matches = maze.mummer_matches(fn_ref,
                                          fn_query,
                                          length,
                                          match_type,
                                          cfg['debug'])
            m.append(matches)
            os.remove(fn_query)    
            os.remove(fn_ref)

    # classical mode
    else:
        with NamedTemporaryFile(delete=False) as f_ref:
            fn_ref = f_ref.name
            print('>{}'.format(refs[0]['name']), file=f_ref)
            print(refs[0]['seq'], file=f_ref)
        for query in queries:
            with NamedTemporaryFile(delete=False) as f_query:
                fn_query = f_query.name
                print('>{}'.format(query['name']), file=f_query)
                print(query['seq'], file=f_query)
            matches = maze.mummer_matches(fn_ref,
                                          fn_query,
                                          length,
                                          match_type,
                                          cfg['debug'])
            m.append(matches)
            os.remove(fn_query)
        os.remove(fn_ref)
    return json.dumps(m)


@app.route('/breakpoints')
def breakpoints():
    return maze_breakpoints.index()

@app.route('/compute_breakpoints', methods=['POST'])
def compute_breakpoints():
    args = request.form
    # Todo(meiers): Get LAST parameters, too
    ref = json.loads(args['ref'])
    query = json.loads(args['query'])
    return maze_breakpoints.breakpoints(ref, query)


@app.route('/save', methods=['POST'])
def save_svg():
    svg_xml = request.form['content']
    # include CSS into SVG
    embed_css = '<defs><style type="text/css"><![CDATA[ '
    with open(os.path.join(absPath, 'static/maze.css')) as f_css:
        for line in f_css:
            embed_css += line.strip() + ' '
    embed_css += ']]></style></defs>'
    beg,end = tuple(re.split(r'>\s*<', svg_xml, 1))
    response = make_response(beg + '>' + embed_css + '<' + end)
    response.headers["Content-Disposition"] = "attachment; filename=maze.svg"
    response.headers['Content-Description'] = 'File Transfer'
    response.headers['Content-Type'] = 'image/svg+xml' # response.headers['Cache-Control'] = 'no-cache' # ?
    return response


@click.command()
@click.option('-h', '--host', default='127.0.0.1', help='host IP')
@click.option('-p', '--port', default=5000, help='port number')
@click.option('--debug/--no-debug', default=False,
              help='run server in debug mode')
# Todo(meiers): revisit the --coords option
# @click.option('-c', '--coords', help='reference coordinates BED file')
def cli(host, port, debug):
    global cfg
    cfg = {
        'debug': debug
    }
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    cli()
