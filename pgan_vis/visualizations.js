// 2D brushing
// brush on, off
// on brush, class as 'selected'
function populate_imageGrid(selected_samples, imgGrid, imgCols, imgColBandScale, imgRowBandScale){
    d3.selectAll('#imgGrid').selectAll('.img').remove()
    // update selection with new images
    d3.select('#imgGrid').selectAll('g').data(selected_samples, function(d) {return d;}).enter()
        .append('image')
        .attr('xlink:href', sample => {
            // console.log(new URL('sample_imgs/'+sample.path, window.location.href))
            return new URL('sample_imgs/'+sample.path, window.location.href)
        })
        .attr('width', imgColBandScale.bandwidth())
        .attr('height', imgRowBandScale.bandwidth())
        .attr('preserveAspectRatio', 'none')
        .attr('class', 'img')
        .attr('transform', (d, i) => 'translate(' +(imgColBandScale(i % imgCols))+', ' +imgRowBandScale(Math.floor(i / imgCols))+')')
}

function mouse_brush(plots_select, plot0, allSamples, layerScales, hue_scale, chroma_scale, scatter_size, imgGrid, imgCols, rowBandScale, colBandScale) {
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

        d3.selectAll('.plot').selectAll('.selected').data(selected_samples, d => d.path).exit().classed('selected', false).attr('fill',  function(d) {return d3.hcl(hue_scale(d[plot0].tsne1), chroma_scale(d[plot0].tsne2), 60)}) // color scale based on the chosen layer )
        d3.selectAll('.plot').selectAll('.mark').data(selected_samples, d => d.path).classed('selected', true)
            .attr('fill', d3.hcl(81, 99, 92))
        // var all_marks = plots_select.selectAll('.mark')
        // all_marks.attr('fill', (d, i) =>  { // default fill all marks
        //     return d3.hcl(hue_scale(plot0.values[i].tsne1), chroma_scale(plot0.values[i].tsne2), 60) // color scale based on the chosen layer
        // })
        // all_marks
        //     .filter(function() {
        //         var visual_width = +d3.select(this).attr('width'), visual_height = +d3.select(this).attr('height');
        //         var visual_x = +d3.select(this).attr('x'), visual_y = +d3.select(this).attr('y');
        //         return (visual_x + visual_width) >= rect_select[0][0] && (visual_x) <= rect_select[1][0] &&
        //             (visual_y + visual_height) >= rect_select[0][1] && (visual_y) <= rect_select[1][1]
        //     })
        //     .attr('fill', d3.hcl(81, 99, 92)) // selected class color (yellow)
        // populate with first 20 selected samples
        var grid_size = imgGrid.selectAll('g').data().length
        populate_imageGrid(selected_samples.slice(0, grid_size), imgGrid, imgCols, rowBandScale, colBandScale)
    });

    plots_select.call(brush)
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

    // CHANGE COLORMAP LAYER HERE
    gKeys = layerData.filter(d => {return d.net == 'G'}).map(d => {return d.key})
    plot0 = gKeys[gKeys.length - 1]
    var hue_scale = d3.scaleLinear().domain(layerScales[plot0].tsne1.domain()).range([0, 180])
    var chroma_scale = d3.scaleLinear().domain(layerScales[plot0].tsne2.domain()).range([20, 90])

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
                    return d3.hcl(hue_scale(d[plot0].tsne1), chroma_scale(d[plot0].tsne2), 60) // color scale based on the chosen layer
                })
            //d3.select(this).append('g').attr('transform', 'translate(0,0)').call(d3.axisLeft(scale_y).ticks(4))
            //d3.select(this).append('g').attr('transform', 'translate(0,'+plot_height+')').call(d3.axisBottom(scale_x).ticks(4))
        })
        
        
        var plots_select = d3.selectAll('.plot'); // plot group, including fill, axes, marks
        d3.selectAll('.plot').append('text').text(d => {return d}).attr('fill', 'black')
        mouse_brush(plots_select, plot0, allSamples, layerScales, hue_scale, chroma_scale, netG_scatter_size, imgGrid, imgCols, imgColBandScale, imgRowBandScale) // FIX: scatter sizes should be identical for both networks

    // training plot
    var trainPlotWidth = 600, trainPlotHeight = 200;
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad + imgGridWidth)+','+(pad*3+ netG_scatter_size+netD_scatter_size)+')')
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

    // lossData.forEach(lossPerScale => {
    //     var scale_x = d3.scaleLinear().domain(d3.extent(lossPerScale.iter[lossPerScale])).range([0, trainPlotWidth])
    //     showLines.forEach(key => {
    //         scale_y_extents = scale_y_extents.concat(d3.extent(lossPerScale[key]))
    //     })
    //     var filteredKeys = Object.keys(lossPerScale).filter(key => showLines.includes(key))
    //     lossPerScale.lineData = filteredKeys.map(key => {
    //         var line_datum = {};
    //         line_datum.scale_x = scale_x
    //         line_datum.values = lossPerScale[key].map((d, i) => {return {'x': i*100, 'y': d}})
    //         line_datum.key = key
    //         line_datum.scale = lossPerScale.scale
    //         return line_datum
    //     })
    //     lossPerScale.scale_x = scale_x
    // })
    
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