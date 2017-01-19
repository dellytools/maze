var maze = function () {
  var my = {};

  my.data = null;

  my.main = function (selector) {
    // remove focus after being clicked
    $('.button-header').focus(function () {
      this.blur();
    });
    // disable header buttons
    $('#control-btn-screenshot, #control-btn-breakpoints, #control-btn-download-seqs').prop('disabled', true);

    $('#match-info').click(function () {
      $('#matches-info').toggleClass('hide');
    });
    
    $('#checkbox-scale').click(function () {
      if ($('#checkbox-scale').prop('checked')) {
        $('#config-dim').prop('disabled', true);
      } else {
        $('#config-dim').prop('disabled', false);
      }
    });

    $('#drop-ref').on('dragenter', dropZoneEnter);
    $('#drop-ref').on('dragleave', dropZoneExit);
    $('#drop-ref').on('dragover', dropZoneOver);
    $('#drop-ref').on('drop', function (e) {
      $(this).removeClass('dropzone-hover');
      $('#ref-icon-chosen').removeClass('fa-times');
      $('#ref-icon-chosen').removeClass('fa-check');
      $('#ref-icon-chosen').addClass('fa-spinner').addClass('fa-pulse');
      getDroppedFasta(e, 'ref');
    });

    $('#drop-query').on('dragenter', dropZoneEnter);
    $('#drop-query').on('dragleave', dropZoneExit);
    $('#drop-query').on('dragover', dropZoneOver);
    $('#drop-query').on('drop', function (e) {
      $(this).removeClass('dropzone-hover');
      $('#query-icon-chosen').removeClass('fa-times');
      $('#query-icon-chosen').removeClass('fa-check');
      $('#query-icon-chosen').addClass('fa-spinner').addClass('fa-pulse');
      getDroppedFasta(e, 'query');
    });

    function dropZoneEnter(e) {
      e.stopPropagation();
      e.preventDefault();
      $(this).addClass('dropzone-hover');
    }

    function dropZoneExit(e) {
      e.stopPropagation();
      e.preventDefault();
      $(this).removeClass('dropzone-hover');
    }

    function dropZoneOver(e) {
      e.stopPropagation();
      e.preventDefault();
    } 

    function getDroppedFasta(e, type) {
      e.stopPropagation();
      e.preventDefault();

      var dt = e.dataTransfer || (e.originalEvent && e.originalEvent.dataTransfer);
      var files = e.target.files || (dt && dt.files);
      var f = files[0];

      readFasta(f, type, /\.gz$/.test(f.name));
    }

    function readFasta(f, type, isGzip) {
      var fReader = new FileReader();
      if (isGzip) {
        fReader.readAsArrayBuffer(f);
      } else {
        fReader.readAsText(f);
      }
      fReader.onload = function (e) {
        var fContent = e.target.result;
        if (isGzip) {
          fContent = pako.ungzip(fContent, {'to': 'string'});
        }

        var seqs = parseFastaString(fContent);

        if (seqs.length > 0) {
          my[type] = seqs;
          if (type === 'ref') {
            $('#ref-icon-chosen').removeClass('fa-spinner')
                                 .removeClass('fa-pulse')
                                 .addClass('fa-check');
            $('#ref-span-chosen').html(f.name);
          } else {
            $('#query-icon-chosen').removeClass('fa-spinner')
                                 .removeClass('fa-pulse')
                                 .addClass('fa-check');
            $('#query-span-chosen').html(f.name);
          }
        } else {
          if (type === 'ref') {
            $('#ref-icon-chosen').removeClass('fa-spinner')
                                 .removeClass('fa-pulse')
                                 .addClass('fa-times');
            $('#ref-span-chosen').empty();
          } else {
            $('#query-icon-chosen').removeClass('fa-spinner')
                                 .removeClass('fa-pulse')
                                 .addClass('fa-times');
            $('#query-span-chosen').empty();
          }
        }

        if (my.ref && my.query) {
          $('#visualize').prop('disabled', false);
        }
      }
    }

    // header button: download selected sequences
    $('#control-btn-download-seqs').off('click').click(function() {
      out_text = '';
      for (x=0; x<my.query.length; ++x) {
        q = my.query[x]
        if ('selected' in q && q.selected) {
          out_text += ">" + q.name + "\n";
          for (i=0; i< q.seq.length; i+=60) {
            out_text += q.seq.slice(i, Math.min(q.seq.length, i+60)) + "\n";
          }
        }
      }
      downloadAsFile('selection.fa', out_text);
    });

    $('#visualize').click(function () {
      $('#config-modal').modal('hide');
      $(selector).empty();
      $('#control-btn-left').addClass('hide');
      $('#control-btn-right').addClass('hide');
      $('#control-btn-select-seq').addClass('hide');
      $('.spinner').removeClass('hide');

      var matches = $('#config-matches label.active').text().trim();
      var length = $('#config-length').val();

      $.post('/matches', {
          'matches': matches,
          'length': length,
          'ref': JSON.stringify(my.ref),
          'query': JSON.stringify(my.query)
        }, function (res) {
          my.data = res;
          $('.spinner').addClass('hide');
          my.vis(selector, 0);
        }, 'json'
      );
      // use "visualize" button also to reset selected sequences
      // can be done independent of when matches arrive
      for (x in my.query) { if ('selected' in my.query[x]) {delete my.query[x].selected} }
      updateDownloadButton(my.query, $('#control-btn-download-seqs'));
    });
  };

  my.vis = function (selector, dataIdx) {
    var refIdx = my.ref.length == my.query.length ? dataIdx : 0;
    var data = my.data[dataIdx]
    var l1 = my.ref[refIdx].seq.length;
    var l2 = my.query[dataIdx].seq.length;

    $(selector).empty();

    // header button: breakpoints
    $('#control-btn-breakpoints').prop('disabled', false).off('click');
    $('#control-btn-breakpoints').click(function () {
        console.log('open new window for ' + dataIdx)
        var wnd = window.open("breakpoints");
        wnd.transferData = { data: data, query: my.query[dataIdx], ref: my.ref[refIdx]}; 
      });

    // header button: screenshot
    $('#control-btn-screenshot').prop('disabled', false).off('click').tooltip();
    $('#control-btn-screenshot').click(function () {
        // Extract the data as SVG text string
        var svg_elem =  document.getElementsByTagName("svg")[0];
        var svg_xml = (new XMLSerializer).serializeToString(svg_elem);
        var form = document.getElementById("form-save");
        form['content'].value = svg_xml;
        form.submit();

      });

    
    // tick button: select a sequence
    function seq_select() {
      $('#control-btn-select-seq').find('span').removeClass('glyphicon-ok-circle').addClass('glyphicon-ok-sign');
      $('#control-btn-select-seq').attr('title', "Sequence selected").tooltip('fixTitle');
      my.query[dataIdx].selected = true;
    }
    function seq_unselect() {
      $('#control-btn-select-seq').find('span').removeClass('glyphicon-ok-sign').addClass('glyphicon-ok-circle');
      $('#control-btn-select-seq').attr('title', "Select this query sequence").tooltip('fixTitle');
      my.query[dataIdx].selected = false;
    }
    function seq_toggle() { // on click or key event
      if ('selected' in my.query[dataIdx] && my.query[dataIdx].selected) {
        seq_unselect();
      } else {
        seq_select();
      }
      updateDownloadButton(my.query, $('#control-btn-download-seqs'));
      $('#control-btn-select-seq').tooltip('show');
    }
    // set current state of the button
    $('#control-btn-select-seq').tooltip('hide');
    if ('selected' in my.query[dataIdx] && my.query[dataIdx].selected) {
      seq_select();
    } else {
      seq_unselect();
    }
    // Add click handler
    $('#control-btn-select-seq').off('click').click(seq_toggle);
    // Add shortcut key
    Mousetrap.bind('up', seq_toggle);
    // eventually, show button
    $('#control-btn-select-seq').prop('disabled', false).removeClass('hide').tooltip();


    // control (left/right) buttons
    $('#control-btn-left').removeClass('hide');
    $('#control-btn-right').removeClass('hide');
    $('#control-btn-right').off('click');
    $('#control-btn-left').off('click');
    Mousetrap.unbind('left');
    Mousetrap.unbind('right');

    if (dataIdx > 0) {
      $('#control-btn-left').removeClass('disabled');
      function eventLeft() {my.vis(selector, dataIdx-1)};
      $('#control-btn-left:not(disabled)').click(eventLeft);
      Mousetrap.bind('left', eventLeft);
    } else {
      $('#control-btn-left').addClass('disabled');
    }
    if (dataIdx < my.data.length - 1) {
      $('#control-btn-right').removeClass('disabled');
      function eventRight() {my.vis(selector, dataIdx+1)};
      $('#control-btn-right:not(disabled)').click(eventRight);
      Mousetrap.bind('right', eventRight);
    } else {
      $('#control-btn-right').addClass('disabled');
    }


    if ($('#checkbox-scale').prop('checked')) {
      my.outerWidth = Math.min($(window).width(),
                               $(window).height()) * 0.8;
    } else {
      my.outerWidth = +$('#config-dim').val();
    }

    my.outerHeight = my.outerWidth;
    my.margin = { top: 25, bottom: 15, left: 50, right: 50 };
    var innerWidth = my.outerWidth - my.margin.left - my.margin.right;
    my.innerWidth = innerWidth;
    var innerHeight = my.outerHeight - my.margin.top - my.margin.bottom;
    my.innerHeight = innerHeight;

    var x = d3.scale.linear()
      .domain([1, l1])
      .range([0, my.innerWidth]);

    var y = d3.scale.linear()
      .domain([1, l2])
      .range([0, my.innerHeight]);

    var xAxisB = d3.svg.axis()
      .scale(x)
      .orient('bottom')
      .tickSize(-my.innerHeight);

    var xAxisT = d3.svg.axis()
      .scale(x)
      .orient('top')
      .tickSize(0);

    var yAxisR = d3.svg.axis()
      .scale(y)
      .orient('right')
      .tickSize(-my.innerWidth);

    var yAxisL = d3.svg.axis()
      .scale(y)
      .orient('left')
      .tickSize(-my.innerWidth);
  
    var zoom = d3.behavior.zoom()
      .x(x)
      .y(y)
      .scaleExtent([1, 100])
      .on('zoom', zoomed);

    var svg = d3.select(selector).append('svg')
      .attr('width', my.outerWidth)
      .attr('height', my.outerHeight);

    var g = svg.append('g')
      .attr('transform', 'translate(' + my.margin.left + ', ' + my.margin.top + ')');

    g.call(zoom);

    g.append('rect')
      .attr('class', 'overlay')
      .attr('width', my.innerWidth)
      .attr('height', my.innerHeight);

    g.append('g')
      .attr('class', 'x axis b')
      .attr('transform', 'translate(0, ' + my.innerHeight + ')')
      .call(xAxisB);

    g.append('g')
      .attr('class', 'x axis t')
      .call(xAxisT);

    g.append('g')
      .attr('class', 'y axis r')
      .attr('transform', 'translate(' + my.innerWidth + ', 0)')
      .call(yAxisR);

    g.append('g')
      .attr('class', 'y axis l')
      .call(yAxisL);

    g.append('defs')
      .append('svg:clipPath')
      .attr("id", "clipChartArea")
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', my.innerWidth)
      .attr('height', my.innerHeight);

    var chartArea = g.append('g')
      .attr('clip-path', 'url(#clipChartArea)');

    chartArea.selectAll('line.matches')
      .data(data.fwd.concat(data.rev))
      .enter()
      .append('line')
      .attr('class', 'geom matches')
      .attr('x1', function (d) { return x(d[0]); })
      .attr('x2', function (d) { return x(d[1]); })
      .attr('y1', function (d) { return y(d[2]); })
      .attr('y2', function (d) { return y(d[3]); })
      // TODO should do this via CSS classes:
      .style('stroke', function (d) {
        return d[2] < d[3] ? 'black' : 'red'
      });

      function zoomed() {
        chartArea.selectAll('.geom')
          .data(data.fwd.concat(data.rev))
          .attr('x1', function (d) { return x(d[0]); })
          .attr('x2', function (d) { return x(d[1]); })
          .attr('y1', function (d) { return y(d[2]); })
          .attr('y2', function (d) { return y(d[3]); });
        g.select(".x.axis.b").call(xAxisB);
        g.select(".x.axis.t").call(xAxisT);
        g.select(".y.axis.r").call(yAxisR);
        g.select(".y.axis.l").call(yAxisL);
      }
  };

  return my;
}();

$(maze.main.bind(null, '#vis'));

function LineReader(str) {
  this.str = str;
  this.i = 0;
  this.next = nextLine;
}

function nextLine() {
  var l = '';
  for (; this.i < this.str.length; this.i += 1) {
    if (this.str[this.i] === '\n') {
      this.i += 1;
      break;
    }
    l += this.str[this.i];
  }
  return l;
}

function parseFastaString(s) {
  var seqs = [];
  var name = null;
  var seq = null;
  var lr;
  var l;

  lr = new LineReader(s);
  while (l = lr.next()) {
    if (l[0] === '>') {
      if (name) {
        seqs.push({'name': name, 'seq': seq});
      }
      seq = '';
      name = />(\w+)/.exec(l)[1];
    } else {
      seq += l;
    }
  }

  if (name) {
    seqs.push({'name': name, 'seq': seq});
  }

  return seqs;
}

function updateDownloadButton(queries, showNumber_selector) {
  var count = 0;
  for (x=0; x<queries.length; ++x) {
    if ('selected' in queries[x] && queries[x].selected) count++;
  }
  showNumber_selector.find('span').first().html(count);
  if(count>0) {
    showNumber_selector.prop('disabled', false).tooltip();
  } else {
    showNumber_selector.prop('disabled', true);
  }
}


// Credit: http://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file
function downloadAsFile(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}
