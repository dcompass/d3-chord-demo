import React, { Component } from 'react';
import * as d3 from 'd3';

import './App.css';
import { width, height, colorScheme, CLASS_INFO_FILE, CLASS_MATRIX_FILE } from './constants';

class App extends Component {

  componentDidMount() {
    this.initializeChord();
  }

  // Load the taxonomy information
  loadData = (infoFile, matrixFile) => {
    return new Promise((resolve, reject) => {
      let taxonIdToName = {},
          taxonArray = [],
          orderedTaxon = [],
          matrix = [],
          rowCount = 0;
      d3.csv(infoFile)
      .then(taxa => {
        //	Build dictionaries for the taxonomy
        taxa.forEach(taxon => {
          taxonIdToName[taxon.taxon_id] = taxon.organism_name;
          taxonArray.push(taxon.taxon_id);
        });
        return d3.csv(matrixFile);
      })
      .then(crossRactivityData => {
        // console.log('cross data: ', crossRactivityData);
        //  Determine the order of the keys (so it will remain constant)
        Object.keys( crossRactivityData[0] ).forEach(key => {
          orderedTaxon.push(key);
        })
        orderedTaxon.splice(orderedTaxon.indexOf('species_x'), 1);

        //  Retrieve the rows, and create matrix rows
        crossRactivityData.forEach((xrRow) => {
          let row = [];
          orderedTaxon.forEach(key => {
            if ( xrRow[key] !== undefined && xrRow[key] > 0 ) {
              row.push(+xrRow[key]);
            } else {
              row.push(0);
            }
          });
          matrix.push(row);
          rowCount = rowCount + 1;
        });

        const data = {
          taxonIdToName : taxonIdToName, 
          taxonArray:	taxonArray,
          orderedTaxon : orderedTaxon,
          matrix : matrix
        };
        resolve(data);
      })
      .catch(e => {
        reject(e);
      });
    });
  }

  initializeChord() {
    const outerRadius = Math.min(width, height) / 2 - 50;
    const innerRadius = outerRadius - 30;
    const svg = d3.select('svg.chord-diagram');
    const chord = d3.chord()
      .padAngle(0.01)
      .sortSubgroups(d3.descending)
      .sortChords(d3.ascending);
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
      .radius(innerRadius);

    this.loadData(CLASS_INFO_FILE, CLASS_MATRIX_FILE)                   // load data from file
    .then(data => {
      // set color scheme
      let color = d3.scaleOrdinal()
        .domain(d3.range(data.matrix.length))
        .range(colorScheme);

      // load matrix data
      let g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`)
        .datum(chord(data.matrix));

      // draw outer ring
      let groups = g.append('g')
        .attr('class', 'groups');
      let group = groups.selectAll('.group')
        .data(chords => chords.groups)
        .enter().append('g')
        .attr('class', 'group')
        .on('mouseover', (d, i) => {
          ribbons.classed('fade', p => p.source.index !== i && p.target.index !== i);
        })
        .on('mouseout', (d, i) => {
          ribbons.classed('fade', false);
        });
      let groupPath = group.append('path')
        .style('fill', d => color(d.index))
        .style('stroke', d => d3.rgb(color(d.index)).darker())
        .attr('d', arc)
        .attr('class', 'chord-path')
        .attr('id', (d, i) => `group${i}`);

      // draw text in the ring
      let groupText = group.append('text')
        .attr('x', 6)
        .attr('dy', 15)
        .attr('transform', d => d.angle > Math.PI ? 'rotate(180) translate(-16)' : null)
      groupText.append('textPath')
        .attr('xlink:href', (d, i) => `#group${i}`)
        .text((d, i) => { 
          // console.log( `taxonID ${data.orderedTaxon[i]} should be translated to ${data.taxonIdToName[data.orderedTaxon[i]]}`);
          return data.taxonIdToName[ data.orderedTaxon[i] ] ;
        });

      // draw relationship ribbons inside the ring
      const ribbonGroup = g.append('g')
        .attr('class', 'ribbons');
      const ribbons = ribbonGroup.selectAll('path')
        .data(chords => chords)
        .enter().append('path')
        .attr('d', ribbon)
        .style('fill', d => color(d.target.index))
        .style('stroke', d => d3.rgb(color(d.target.index)).darker());

      // Remove the labels that don't fit.
      groupText.filter(function (d, i) {
        return (groupPath._groups[0][i].getTotalLength() / 2) < this.getComputedTextLength();
      })
      .remove();
    });
  }

  render() {
    return (
      <div className="App">
        <h1>Cross Reactivity Viewer</h1>
        <svg className="chord-diagram" width={width} height={height}>
        </svg>
      </div>
    );
  }
}

export default App;
