function plot_it()  {
    // to do:
    //  layout: seperate net G into rows, add axes to plots, add names and net to plot

    // imgPath use => sample_imgs/imgPath
    // global layout parameters
    var pad = 40;
    // var enlarged_scatter_width, enlarged_scatter_height = 520
    // small_scatter_height = 100;
    var svg_width = 2000, svg_height = 900;
    var mark_size_small = 3.5, mark_size_large = 7.0;

    // scatter grid layout scales
    var netG_bandScale = d3.scaleBand().domain(layerData.filter(layer => layer.net == 'G').map(layer => layer.key)).range([0, svg_width - pad]).paddingInner(0.1)
    var netD_bandScale = d3.scaleBand().domain(layerData.filter(layer => layer.net == 'D').map(layer => layer.key)).range([0, (svg_width - pad)*(4/9)]).paddingInner(0.1)

    // var network_bandScale = d3.scaleBand().domain(['G', 'D']).range([svg_height/2, 0])

    var netG_scatter_size = netG_bandScale.bandwidth()
    // var netD_scatter_size = netD_bandScale.bandwidth()
    layerScales = {}

    // scales for each scatterplot
    layerData.forEach(layer => {
        var tsne1_extremes = d3.extent(layer.values.map(d => d.tsne1))
        var tsne2_extremes = d3.extent(layer.values.map(d => d.tsne2))
        // x, y
        var tsne1_scale = d3.scaleLinear().domain(tsne1_extremes).range([0, netG_scatter_size]) 
        var tsne2_scale = d3.scaleLinear().domain(tsne2_extremes).range([netG_scatter_size, 0])
        layerScales[layer.key] = {'tsne1': tsne1_scale, 'tsne2': tsne2_scale}
    })

    d3.select('body').append('svg').attr('width', svg_width).attr('height', svg_height).attr('id', 'svg0');
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad)+','+(pad)+')').attr('id', 'generator')
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad)+','+(pad*2+netG_scatter_size)+')').attr('id', 'discriminator')

    // colormap
    plot0 = layerData.filter(d => d.key == 'netG_output')[0]
    var hue_scale = d3.scaleLinear().domain(layerScales[plot0.key].tsne1.domain()).range([0, 180])
    var chroma_scale = d3.scaleLinear().domain(layerScales[plot0.key].tsne2.domain()).range([20, 90])

    // generator 
    generator_select = d3.select('#generator').selectAll('layers').data(layerData.filter(layer => layer.net == 'G')).enter().append('g')
        .attr('transform', d => 'translate('+netG_bandScale(d.key)+',0)')
        .attr('class', 'plot')

    generator_select.append('rect') // background fill for plots
        .attr('x', 0).attr('y', 0)
        .attr('fill', 'gray').attr('opacity', 0.3) 
        .attr('width', netG_scatter_size).attr('height', netG_scatter_size)

    generator_select.selectAll('empty').data(layerData => {
        return layerData.values.map(sample => {
            sample.key = layerData.key // add key for accessing scale
            return sample
        })
    }).enter()
    .append('rect')
        .attr('x', d => layerScales[d.key].tsne1(d.tsne1))
        .attr('y', d => layerScales[d.key].tsne2(d.tsne2))
        .attr('fill', (d, i) =>  {
            return d3.hcl(hue_scale(plot0.values[i].tsne1), chroma_scale(plot0.values[i].tsne2), 60) // color scale based on the chosen layer
        }).attr('width', mark_size_small)
        .attr('height', mark_size_small) 

    // discriminator 
    generator_select = d3.select('#discriminator').selectAll('layers').data(layerData.filter(layer => layer.net == 'D')).enter().append('g')
        .attr('transform', d => 'translate('+netD_bandScale(d.key)+',0)')
        .attr('class', 'plot')

    generator_select.append('rect') // background fill for plots
        .attr('x', 0).attr('y', 0)
        .attr('fill', 'gray').attr('opacity', 0.3) 
        .attr('width', netG_scatter_size).attr('height', netG_scatter_size)

    generator_select.selectAll('empty').data(layerData => {
        return layerData.values.map(sample => {
            sample.key = layerData.key // add key for accessing scale
            return sample
        })
    }).enter()
    .append('rect')
        .attr('x', d => layerScales[d.key].tsne1(d.tsne1))
        .attr('y', d => layerScales[d.key].tsne2(d.tsne2))
        .attr('fill', (d, i) =>  {
            return d3.hcl(hue_scale(plot0.values[i].tsne1), chroma_scale(plot0.values[i].tsne2), 60) // color scale based on the chosen layer
        }).attr('width', mark_size_small)
        .attr('height', mark_size_small) 

    // discriminator
    // dscrm_select = d3.select('#discriminator').selectAll('layers').data(by_layer_data).enter().append('g')
    //     .attr('transform', d => 'translate('+layer_band_scale(d.key)+',0)')
    //     .attr('class', 'plot')

    // dscrm_select.append('rect') // background fill for plots
    //     .attr('x', 0).attr('y', 0)
    //     .attr('fill', 'gray').attr('opacity', 0.3) 
    //     .attr('width', layer_band_scale.bandwidth()).attr('height', layer_band_scale.bandwidth())

    // dscrm_select.selectAll('empty').data(layer_data => {
    //     return layer_data.values.map(sample => {
    //         sample.key = layer_data.key // add key for accessing scale
    //         return sample
    //     })
    // }).enter()
    // .append('rect')
    //     .attr('x', d => layer_scales[d.key].tsne1(d.tsne1))
    //     .attr('y', d => layer_scales[d.key].tsne2(d.tsne2))
    //     .attr('fill', (d, i) =>  {
    //         return d3.hcl(hue_scale(plot0[i].tsne1), chroma_scale(plot0[i].tsne2), 60)
    //     }).attr('width', mark_size_small)
    //     .attr('height', mark_size_small) // to do: add images and interactivity

    
    // encode x, y for first layer with hcl colorspace
    // change x based on hue, y ba
    // interactivty: 
    //  distance heatmap on select
    //  add simultaneous selection across different layers
    //  enlarge when hovered, highlight on click
    // add feature maps enlarge on select


    // to do: add images and interactivity
}