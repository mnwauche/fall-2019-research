function plot_it()  { 
    // imgPath use => sample_imgs/imgPath
    //global layout parameters
    var pad = 40;
    // var enlarged_scatter_width, enlarged_scatter_height = 520;
    // small_scatter_height = 100;
    var svg_width = 900, svg_height = 900;
    var mark_size_small = 3.5, mark_size_large = 7.0;

    // format data => group data by network, layer
    // data format : layerData in netData in dataGroups => layerData in dataGroups
    var layers = ["format_layer", "scale0_0", "scale1", "upper_scales_0_0", "upper_scales_0_1", "x_toRGB", "blending"]
    var layer_band_scale = d3.scaleBand().domain(layers).range([pad, svg_width - pad]).paddingInner(0.25)
    scatter_width, scatter_height = layer_band_scale.bandwidth()

    //
    var dataGroups = [], layer_scales = {}


    layers.forEach(layer => {
        var layer_data = {}
        layer_data.key = layer
        layer_data.values = []
        g_sample_data.forEach(sample => {
            layer_data.values.push({'path': sample.path, 'tsne1': sample[layer]['tsne1'], 'tsne2': sample[layer]['tsne2']})
        })
        by_layer_data.push(layer_data)
        var tsne1_extremes = d3.extent(layer_data.values.map(d => d.tsne1))
        var tsne2_extremes = d3.extent(layer_data.values.map(d => d.tsne2))

        // x, y
        var tsne1_scale = d3.scaleLinear().domain(tsne1_extremes).range([0, layer_band_scale.bandwidth()])
        var tsne2_scale = d3.scaleLinear().domain(tsne2_extremes).range([layer_band_scale.bandwidth(), 0])

        layer_scales[layer] = {'tsne1': tsne1_scale,'tsne2': tsne2_scale}
    })

    d3.select('body').append('svg').attr('width', svg_width).attr('height', svg_height).attr('id', 'svg0');
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad)+','+(pad)+')').attr('id', 'generator')
    d3.select('#svg0').append('g').attr('transform', 'translate('+(pad)+','+(pad*2+scatter_height)+')').attr('id', 'discriminator')

    // colormap
    var plot0 = by_layer_data[0].values
    var hue_scale = d3.scaleLinear().domain(layer_scales['input'].tsne1.domain()).range([0, 180])
    var chroma_scale = d3.scaleLinear().domain(layer_scales['input'].tsne2.domain()).range([20, 90])

    // generator 
    generator_select = d3.select('#generator').selectAll('layers').data(by_layer_data).enter().append('g')
        .attr('transform', d => 'translate('+layer_band_scale(d.key)+',0)')
        .attr('class', 'plot')

    generator_select.append('rect') // background fill for plots
        .attr('x', 0).attr('y', 0)
        .attr('fill', 'gray').attr('opacity', 0.3) 
        .attr('width', layer_band_scale.bandwidth()).attr('height', layer_band_scale.bandwidth())

    generator_select.selectAll('empty').data(layer_data => {
        return layer_data.values.map(sample => {
            sample.key = layer_data.key // add key for accessing scale
            return sample
        })
    }).enter()
    .append('rect')
        .attr('x', d => layer_scales[d.key].tsne1(d.tsne1))
        .attr('y', d => layer_scales[d.key].tsne2(d.tsne2))
        .attr('fill', (d, i) =>  {
            return d3.hcl(hue_scale(plot0[i].tsne1), chroma_scale(plot0[i].tsne2), 60)
        }).attr('width', mark_size_small)
        .attr('height', mark_size_small) // to do: add images and interactivity

    // discriminator
    dscrm_select = d3.select('#discriminator').selectAll('layers').data(by_layer_data).enter().append('g')
        .attr('transform', d => 'translate('+layer_band_scale(d.key)+',0)')
        .attr('class', 'plot')

    dscrm_select.append('rect') // background fill for plots
        .attr('x', 0).attr('y', 0)
        .attr('fill', 'gray').attr('opacity', 0.3) 
        .attr('width', layer_band_scale.bandwidth()).attr('height', layer_band_scale.bandwidth())

    dscrm_select.selectAll('empty').data(layer_data => {
        return layer_data.values.map(sample => {
            sample.key = layer_data.key // add key for accessing scale
            return sample
        })
    }).enter()
    .append('rect')
        .attr('x', d => layer_scales[d.key].tsne1(d.tsne1))
        .attr('y', d => layer_scales[d.key].tsne2(d.tsne2))
        .attr('fill', (d, i) =>  {
            return d3.hcl(hue_scale(plot0[i].tsne1), chroma_scale(plot0[i].tsne2), 60)
        }).attr('width', mark_size_small)
        .attr('height', mark_size_small) // to do: add images and interactivity

    // encode x, y for first layer with hcl colorspace
    // change x based on hue, y ba
    // interactivty: 
    //  distance heatmap on select
    //  add simultaneous selection across different layers
    //  enlarge when hovered, highlight on click
    // add feature maps enlarge on select
}