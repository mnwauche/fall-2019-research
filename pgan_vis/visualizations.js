// 2D brushing
// brush on, off
// on brush, class as 'selected'
function populate_imageGrid(selected_samples, col_scale, row_scale){
    var imgCols = col_scale.domain().length
    d3.selectAll('#imgGrid').selectAll('.img').remove()
    // update selection with new images
    d3.select('#imgGrid').selectAll('g').data(selected_samples, function(d) {return d;}).enter()
        .append('image')
        .attr('xlink:href', sample => {
            // console.log(new URL('sample_imgs/'+sample.path, window.location.href))
            return new URL('sample_imgs/'+sample.path, window.location.href)
        })
        .attr('width', col_scale.bandwidth())
        .attr('height', row_scale.bandwidth())
        .attr('preserveAspectRatio', 'none')
        .attr('class', 'img')
        .attr('transform', (d, i) => 'translate(' +(col_scale(i % imgCols))+', ' +row_scale(Math.floor(i / imgCols))+')')
}

// identify brushed samples from the heatmap
function reorder_matrix(selected, noiseInput, hmCellScales){
    var hm_select = d3.select('#hm')
    var xScale = hmCellScales.hm_x_scale, yScale = hmCellScales.hm_y_scale
    var selected_paths = selected.map(s => s.path)
    var lastSelectedPath = selected_paths[selected_paths.length - 1]
    var og_ordering = false
    var reordered_paths = selected_paths.concat(noiseInput.map(n => n.path).filter(n => !selected_paths.includes(n)))

    hmCellScales.hm_x_scale.domain(reordered_paths)
    hmCellScales.hm_y_scale.domain(reordered_paths)

    og_ordering = reordered_paths == noiseInput.map(n => n.path)

    d3.selectAll('.cell').transition().duration(1300)
        .attr('transform', d => 'translate('+hmCellScales.hm_x_scale(d.key1)+', '+hmCellScales.hm_y_scale(d.key0)+')')

    d3.selectAll('.boundary-line').transition().duration(1100)
        .each(function(d) {
            // h: (0, y_scale(last_path)) => (x_scale(last_path), y_scale(last_path))
            // v: (x_scale(last_path),  0) => (x_scale(last_path), y_scale(last_path))
            var horizontal = 0
            var x1 = d == horizontal ? 0 : xScale(lastSelectedPath) + x_scale.bandwidth()
            var x2 = xScale(lastSelectedPath)
            var y1 = d == horizontal ? yScale(lastSelectedPath) : 0
            var y2 = yScale(lastSelectedPath)
            var stroke = og_ordering ? 'none' : 'gray'
            console.log([x1, y1, x2, y2])
            console.log(stroke)
            d3.select(this).attr('x1', x1).attr('x2', x2).attr('y1', y1).attr('y2', y2).attr('stroke', stroke)
                .attr('stroke-width', 3)
        })

    //console.log(samples)
    //console.log(samples.map(s => parseInt(s.path.replace('sample', '').replace('.png', ''))))
    //var transition = d3.transition().duration()
}

function mouse_brush(allSamples, layerScales, scatterColorScale, column_scale, row_scale, hmCellScales, noiseInput) {
    var scatter_size = layerScales[scatterColorScale.plot0].tsne1.range()[1]
    var brush = d3.brush().extent([[0, 0], [scatter_size, scatter_size]])

    brush.on('start', function(d, i) {
    })

    brush.on('brush', function(d, i) {
        var rect_select = d3.event.selection;
        var t1_scale = layerScales[d].tsne1, t2_scale = layerScales[d].tsne2;
        var min_data_x = t1_scale.invert(rect_select[0][0]), min_data_y = t2_scale.invert(rect_select[1][1]);
        var max_data_x  = t1_scale.invert(rect_select[1][0]), max_data_y = t2_scale.invert(rect_select[0][1]);
        var selected_samples = allSamples.filter(val => {
            return val[d].tsne1 >= min_data_x && val[d].tsne1 <= max_data_x && val[d].tsne2 >= min_data_y && val[d].tsne2 <= max_data_y;
        });
        // console.log(selected_samples.length)

        // return exit selection (surplus nonselected samples) and change to original color scale layer
        d3.selectAll('.plot').selectAll('.selected').data(selected_samples, d => d.path).exit().classed('selected', false)
            .attr('fill',  function(d) {return d3.hcl(scatterColorScale.hue_scale(d[scatterColorScale.plot0].tsne1), scatterColorScale.chroma_scale(d[scatterColorScale.plot0].tsne2), 60)}) // color scale based on the chosen layer
        // reclass selected samples and higlight
        d3.selectAll('.plot').selectAll('.mark').data(selected_samples, d => d.path).classed('selected', true)
            .attr('fill', d3.hcl(81, 99, 92)) // bright yellow highligt color
        
        // populate with first 20 selected samples
        var grid_size = d3.select('#imgGrid').selectAll('g').data().length
        populate_imageGrid(selected_samples.slice(0, grid_size), column_scale, row_scale)

        reorder_matrix(selected_samples, noiseInput, hmCellScales)
    });

    d3.selectAll('.plot').call(brush)
}


function plot_it()  {
    // to do:
    //  layout: add axes to plots

    // imgPath usage => sample_imgs/imgPath
    // scatter layout
    var pad = 40;
    var svg_width = 5000, svg_height = 5000;
    var scatterGridWidth = 700, scatterGridHeight = 700;
    var mark_size_small = 3.5, mark_size_large = 7.0;

    // 4 x 5 imgGrid layout
    var imgCols = 4, imgRows = 5;
    var img_size = 120, img_pad = 10;
    var imgGridPadding = 0.2;
    var imgGridWidth = 600, imgGridHeight = imgGridWidth * (imgRows/imgCols); //inner and outer padding
    var trainPlotWidth = 500, trainPlotHeight = 200;
    svg_width = pad + imgGridWidth + trainPlotWidth * (lossData.length + 1) + pad*6
    svg_height = pad + imgGridHeight + pad + 6000

    // scatter grid layout scales
    var netG_bandScale = d3.scaleBand().domain(layerData.filter(layer => layer.net == 'G').map(layer => layer.key)).range([0, scatterGridWidth]).paddingInner(0.1)
    var netD_bandScale = d3.scaleBand().domain(layerData.filter(layer => layer.net == 'D').map(layer => layer.key)).range([0, scatterGridWidth]).paddingInner(0.1)

    var netG_scatter_size = netG_bandScale.bandwidth()
    var netD_scatter_size = netD_bandScale.bandwidth()

    // create scatter scales
    layerScales = {}
    layerData.forEach(layer => {
        var tsne1_extremes = d3.extent(layer.values.map(d => d.tsne1))
        var tsne2_extremes = d3.extent(layer.values.map(d => d.tsne2))
        // x, y
        var tsne1_scale = d3.scaleLinear().domain(tsne1_extremes).range([0, netG_scatter_size]) 
        var tsne2_scale = d3.scaleLinear().domain(tsne2_extremes).range([netG_scatter_size, 0])
        layerScales[layer.key] = {'tsne1': tsne1_scale, 'tsne2': tsne2_scale}
    })
    // console.log('layerScales')
    // console.log(layerScales)


    // format data
    allSamples = []
    layerData[0].values.forEach(function (val, ind){
        sample = {'path': val.path}
        layerData.forEach(function(layer) {
            sample[layer.key] = {'tsne1': layer.values[ind].tsne1, 'tsne2': layer.values[ind].tsne2}
        })
        allSamples.push(sample)
    })


    d3.select('body').append('svg').attr('width', svg_width).attr('height', svg_height).attr('id', 'svg0');

    gKeys = layerData.filter(d => {return d.net == 'G'}).map(d => {return d.key})
    // scatter plots color scale
    var scatterColorScale = {}
    // CHANGE COLORMAP LAYER HERE
    scatterColorScale.plot0 = gKeys[gKeys.length - 1]
    console.log('layer data:')
    console.log(layerData)
    scatterColorScale.hue_scale = d3.scaleLinear().domain(layerScales[scatterColorScale.plot0].tsne1.domain()).range([0, 180])
    scatterColorScale.chroma_scale = d3.scaleLinear().domain(layerScales[scatterColorScale.plot0].tsne2.domain()).range([20, 90])

    // imgGrid
    //  rows => image < imgRows * (rowIdx + 1)
    //  row = floor(image / imgCols)
    //  col = image % imgCols
    var imgGrid = d3.select('#svg0').append('g').attr('transform', 'translate('+(pad)+','+(pad)+')').attr('id', 'imgGrid')
    var imgColDomain = [], imgRowDomain = [], images = [];
    for (i = 0; i < imgCols * imgRows; i++){
        images.push(i)
    }
    for (i = 0; i < imgCols; i++){
        imgColDomain.push(i)
    }
    for (i = 0; i < imgRows; i++){
        imgRowDomain.push(i)
    }
    var imgColBandScale = d3.scaleBand().domain(imgColDomain).range([0, imgGridWidth]).paddingInner(0.1).paddingOuter(0.1);
    var imgRowBandScale = d3.scaleBand().domain(imgRowDomain).range([(imgRows/imgCols) * imgGridWidth, 0]).paddingInner(0.1).paddingOuter(0.1);

    imgGrid.selectAll('none').data(images)
    .enter().append('g')
        .attr('transform', (d, i) => 'translate(' +(imgColBandScale(i % imgCols))+', ' +imgRowBandScale(Math.floor(i / imgCols))+')')
    .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', d => imgColBandScale.bandwidth()).attr('height',d => imgRowBandScale.bandwidth())
        .attr('fill', d => d3.hcl(60, 0, 83)) // background fill for imgs
    
    // generator 
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad + imgGridWidth)+','+(pad)+')').attr('id', 'generator')
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad + imgGridWidth)+','+(pad*2+netG_scatter_size)+')').attr('id', 'discriminator')

    generator_select = d3.select('#generator').selectAll('layers').data(layerData.filter(layer => layer.net == 'G').map(d => d.key))
        .enter().append('g')
        .attr('transform', d => 'translate('+netG_bandScale(d)+',0)')
        .attr('class', 'plot')

    generator_select.append('rect') // background fill for plots
        .attr('x', 0).attr('y', 0)
        .attr('fill', 'gray').attr('opacity', 0.3) 
        .attr('width', netG_scatter_size).attr('height', netG_scatter_size)

    generator_select.selectAll('empty').data(allSamples, d => d.path).enter()
        .append('rect')
        //.attr('x', d => layerScales[d.key].tsne1(d.tsne1))
        //.attr('y', d => layerScales[d.key].tsne2(d.tsne2))
        //.attr('fill', (d, i) =>  {
        //    return d3.hcl(hue_scale(plot0.values[i].tsne1), chroma_scale(plot0.values[i].tsne2), 60) // color scale based on the chosen layer
        //})
        .attr('width', mark_size_small)
        .attr('height', mark_size_small)
        .attr('class', 'mark') 

    // discriminator 
    discrim_select = d3.select('#discriminator').selectAll('layers').data(layerData.filter(layer => layer.net == 'D').map(d => d.key))
        .enter().append('g')
        .attr('transform', d => 'translate('+netD_bandScale(d)+',0)')
        .attr('class', 'plot')

    discrim_select.append('rect') // background fill for plots
        .attr('x', 0).attr('y', 0)
        .attr('fill', 'gray').attr('opacity', 0.3) 
        .attr('width', netD_scatter_size).attr('height', netD_scatter_size)

    discrim_select.selectAll('empty').data(allSamples, d => d.path).enter()
        .append('rect')
        //.attr('x', d => layerScales[d.key].tsne1(d.tsne1))
        //.attr('y', d => layerScales[d.key].tsne2(d.tsne2))
        //.attr('fill', (d, i) =>  {
        //    return d3.hcl(hue_scale(plot0.values[i].tsne1), chroma_scale(plot0.values[i].tsne2), 60) // color scale based on the chosen layer
        //})
        .attr('width', mark_size_small)
        .attr('height', mark_size_small) 
        .attr('class', 'mark')

    d3.selectAll('.plot').each(function(layer)  {
        var scale_x = layerScales[layer].tsne1, scale_y = layerScales[layer].tsne2;
        d3.select(this).selectAll('.mark')
            .attr('x', d => scale_x(d[layer].tsne1)).attr('y', d => scale_y(d[layer].tsne2))
            .attr('fill', (d, i) =>  {
                return d3.hcl(scatterColorScale.hue_scale(d[scatterColorScale.plot0].tsne1), scatterColorScale.chroma_scale(d[scatterColorScale.plot0].tsne2), 60) // color scale based on the chosen layer
            })
        //d3.select(this).append('g').attr('transform', 'translate(0,0)').call(d3.axisLeft(scale_y).ticks(4))
        //d3.select(this).append('g').attr('transform', 'translate(0,'+plot_height+')').call(d3.axisBottom(scale_x).ticks(4))

    })

    d3.selectAll('.plot').append('text').attr('x', 0).attr('y', 0).text(function(d) {return d}).attr('fill', 'black')
        
    // heatmap distance matrix 
    // latent vector samples on bivariate color map
    var hmWidth = 1000, hmHeight = 500
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad + imgGridWidth)+', '+(pad*3 + netG_scatter_size+netD_scatter_size)+')')
        .attr('id', 'hm')
    var hm_data = []
    var noiseInput = layerData.filter(layer => layer.key == 'input')[0].values
    noiseInput.forEach(noise0 => {
        noiseInput.forEach(noise1 => {
            // euclidean distance is the square root of the sum of the squared differences 
            var squared_differences = noise0.noise.map((noiseVar, noiseVarInd) => Math.pow((noiseVar - noise1.noise[noiseVarInd]), 2))
            //console.log('sum of squared diffrences extents:')
            //console.log(Math.pow(d3.sum(squared_differences), 0.5))
            hm_data.push({'key0': noise0.path, 'key1': noise1.path, 'distance': Math.pow(d3.sum(squared_differences), 0.5)})
        })
    })
    console.log('nonzero extents')
    console.log()
    var nonzero_hm_exteremes = d3.extent(hm_data.map(d => d.distance).filter(d => d !== 0.0))
    // hm_extremes = d3.extent(hm_data.map(datum => datum.distance))
    // heatmap scales

    // bivariate ordinal color scale
    // var hm_hue_scale = d3.scaleLinear().domain(hm_extremes).range([-1, 1]) // 0 or 260
    // var hues = [0, 260]
    // var hm_chroma_scale = d3.scaleLinear().domain(hm_extremes).range([-80, 80]) // 0 => 80 both colors
	// var hm_lum_scale = d3.scaleLinear().domain(hm_extremes).range([-60, 60]) // 30 => 90 both colors

    // function hm_color_scale (d) {
	// 	hue = hm_hue_scale(d.distance)
	// 	hue = hue >= 0 ? hues[1] : hues[0]
	// 	chroma = hm_chroma_scale(d.distance)
	// 	chroma = chroma >= 0 ? chroma : chroma * -1
	// 	lum = hm_lum_scale(d.distance)
	// 	lum = lum <= 0 ? lum + 90 : (lum * -1) + 90 //
	// 	return d3.hcl(hue, chroma, lum)
    // }

    // ordinal color scale (change in lum)
    // var hm_hue_scale = d3.scaleLinear().domain(hm_extremes).range([-1, 1]) // 0 or 260
    var hue = 30
    var chroma = 100
    // var hm_chroma_scale = d3.scaleLinear().domain(hm_extremes).range([-80, 80]) // 0 => 80 both colors
	var hm_lum_scale = d3.scaleLinear().domain(nonzero_hm_exteremes).range([20, 70]) // 30 => 70 
    
    function hm_color_scale(distance){
        return d3.hcl(hue, chroma, hm_lum_scale(distance))
    }

    // cell position
    var hmCellScales = {}
    hmCellScales.hm_x_scale = d3.scaleBand().domain(noiseInput.map(n => n.path)).range([0, hmWidth]).paddingInner(.025)
    hmCellScales.hm_y_scale = d3.scaleBand().domain(noiseInput.map(n => n.path)).range([0, hmHeight]).paddingInner(.025)
    
    
    
    var hm_select = d3.select('#hm').selectAll('cell').data(hm_data).enter()
        .append('g').attr('transform', d => 'translate('+hmCellScales.hm_x_scale(d.key1)+', '+hmCellScales.hm_y_scale(d.key0)+')')
        .attr('class', 'cell')

    // heatmap selection
	hm_select.append('rect')
		.attr('x', 0)
		.attr('y', 0)
		.attr('width', hmCellScales.hm_x_scale.bandwidth())
		.attr('height', hmCellScales.hm_y_scale.bandwidth())
		.attr('fill', d => hm_color_scale(d.distance))

    hm_select.append('text').attr('x', 0).attr('y', 0).text(d => d3.format('.2f')(d.distance)) // fixed-point notation
        .style("font-size","7.5px")
        .attr('transform', 'translate(0, 10)')

    // heatmap scales
    d3.select('#hm').append('g').call(d3.axisLeft(hmCellScales.hm_y_scale))
    d3.select('#hm').append('g').call(d3.axisTop(hmCellScales.hm_x_scale)).attr('id', 'axis-top')
    d3.select("#axis-top").selectAll("text")
        .attr("transform"," translate(-30, -10) rotate(30)") // To rotate the texts on x axis. Translate y position a little bit to prevent overlapping on axis line.
        .style("font-size","10px") //To change the font size of texts

    // bondary lines
    d3.select('#hm').selectAll('boundary-line').data([0, 1]).enter().append('line').attr('stroke', 'none').attr('class', 'bondary-line')

    // to do: add heatmap reordering based on selected
    // .on("")

    // TO DO: add heat map color legend
        
    console.log(d3.sum(hm_data.map(d => d.distance)) / hm_data.length) // average distance
    // console.log(noiseInput)
    // console.log(hm_data)

    // scatter plot brush interaction
    mouse_brush(allSamples, layerScales, scatterColorScale, imgColBandScale, imgRowBandScale, hmCellScales, noiseInput) // FIX: scatter sizes should be identical for both networks

    

    // training plot
    var trainPlotWidth = 600, trainPlotHeight = 200;
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad + imgGridWidth)+','+(pad*4+ netG_scatter_size+netD_scatter_size+hmHeight)+')')
        .attr('id', 'training')

    var trainPlotBandScale = d3.scaleBand().domain(lossData.map(d => d.scale)).range([0, trainPlotWidth * lossData.length])
        .paddingInner(0)


    var showLines = ['lossD', 'lossG']
    scale_y_extents = []
    // one line per attribute over all scales in lossData.lines in order of showLines

    lossData.lines = []
    showLines.forEach(lossAttr => {
        var lineVals = []
        lossData.forEach(lossScale => {
            scale_y_extents = scale_y_extents.concat(d3.extent(lossScale[lossAttr]))        
            lineVals = lineVals.concat(lossScale[lossAttr].map((d, i) => {
                var scale = lossScale.scale
                var x_buff = 0
                if(scale !== 0){
                    lossData.filter(loss => loss.scale <  lossScale.scale).forEach(loss => {
                        x_buff = x_buff + loss.iter.length
                    })
                }
                return scale == 0 ?  {'x': (i+1)*100, 'y':  d} : {'x': (i+1 + x_buff) * 100, 'y': d}
            }))
        })
        lossData.lines.push({'key': lossAttr, 'values': lineVals})
    })

    var loss_scale_x = d3.scaleLinear().domain(d3.extent(lossData.lines[0].values.map(d => d.x))).range([0, trainPlotWidth*lossData.length])
    var loss_scale_y = d3.scaleLinear().domain(d3.extent(scale_y_extents)).range([trainPlotHeight, 0])

    var line = d3.line()
        .x(val => loss_scale_x(val.x))
        .y(val => loss_scale_y(val.y))

    var trainPlotSelect = d3.select('#training').selectAll('none').data([lossData]).enter().append('g')
        //.attr('transform',d => 'translate(' +(trainPlotBandScale(d.scale))+', 0)')

    // background fill 
    trainPlotSelect.append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', trainPlotWidth * lossData.length).attr('height', trainPlotHeight)
            .attr('fill', 'gray').attr('opacity', .3)

    // axes
    trainPlotSelect.append('g').attr('class', 'yAxis').call(d3.axisLeft(loss_scale_y))

    trainPlotSelect.append('g').attr('class', 'xAxis').call(d3.axisBottom(loss_scale_x)).attr('transform', 'translate(0, '+(trainPlotHeight)+')')
    
    
    //.call(d => d3.axisLeft(d.scale_y)).attr('transform', 'translate('+(-10)+', 0)')
    // lines
    trainPlotSelect.selectAll('none').data(lossDataArray => {
            return lossDataArray.lines
        }).enter()
        .append('path')
            .attr('fill', 'None')
            .attr('stroke', 'red')
            .attr('stroke-width', 2).attr('stroke-opacity', .12)  
            .attr('d', line_datum => line(line_datum.values))
            //.attr('transform',lineDatum => 'translate(0, ' +(trainPlotBandScale(lineDatum.scale)+')'))


    // continue
        
    // interactivty: 
    //  distance heatmap on select
    //  add simultaneous selection across different layers
    //  enlarge when hovered, highlight on click
    // add feature maps enlarge on select
}